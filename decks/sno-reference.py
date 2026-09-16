"""Reference implementation of DECK-0003: SNO (Simple Nostr Objects).

This is the normative validation of DECK-0003 §1.9 written out as code, plus
the position expansion of §1.2, with no dependencies beyond the standard
library. It is meant to be read, ported, and used as a conformance oracle: a
client that disagrees with this file about whether a payload is valid has a
bug, or this file does.

Run it directly to execute the self-test:

    python3 sno-reference.py

The self-test carries the worked example from Appendix A, and a rejection case
for every numbered rule in §1.9, so a port can be checked against the same
table.
"""

from __future__ import annotations

import json
import os
import re
from fractions import Fraction
from typing import Any, Iterator

# DECK-0003 §1.8. These are the whole of the size policy.
MAX_VERTICES = 512
MAX_FACES = 1024
MIN_EXTENT = 1
MAX_EXTENT = 64
DEFAULT_EXTENT = 8
MAX_UNIT = 84
MAX_NAME = 64

#: §1.2. One model unit is this many ticks. 120 is the smallest number
#: divisible by every integer from 1 to 6, so halves, thirds, quarters,
#: fifths and sixths of a unit all land exactly on the lattice.
TICKS_PER_UNIT = 120

MODES = ("solid", "points", "lines")


class SnoError(ValueError):
    """A payload that DECK-0003 §1.9 rejects. The message names the rule."""


def _is_int(x: Any) -> bool:
    # bool is a subclass of int in Python and is never a coordinate.
    return isinstance(x, int) and not isinstance(x, bool)


def _is_num(x: Any) -> bool:
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def expand_ticks(ticks: Any, count: int) -> list[list[int]]:
    """§1.2: the run-length encoded remainders, one triple per vertex.

    Each entry is either a triple of integers in 0..119, standing for one
    vertex, or a negative integer -N, standing for N consecutive vertices whose
    remainder is [0, 0, 0]. Absent ticks mean every position is whole.
    """
    if ticks is None:
        return [[0, 0, 0] for _ in range(count)]
    if not isinstance(ticks, list):
        raise SnoError("rule 7: ticks is not an array")
    out: list[list[int]] = []
    for entry in ticks:
        if _is_int(entry):
            if entry >= 0:
                raise SnoError("rule 7: a run-length entry must be negative")
            out.extend([0, 0, 0] for _ in range(-entry))
        elif isinstance(entry, list) and len(entry) == 3:
            if not all(_is_int(c) and 0 <= c <= TICKS_PER_UNIT - 1 for c in entry):
                raise SnoError("rule 7: a tick component is not an integer in 0..119")
            out.append(list(entry))
        else:
            raise SnoError("rule 7: a ticks entry is neither a triple nor a negative integer")
    if len(out) != count:
        raise SnoError(f"rule 7: ticks expand to {len(out)} remainders for {count} vertices")
    return out


def expand_face_colors(entries: Any, count: int, palette_len: int) -> list[int]:
    """§1.4a: the run-length encoded face colours, one palette index per face.

    An entry is either a palette index, a non-negative integer, or a negative
    integer -N standing for N further faces of the index before it, so a cube
    coloured with index 7 is [7, -11]. The sign separates the two kinds, which
    works because an index is never negative, and is the same trick ticks uses.
    The first entry must be an index: a run has nothing to repeat before one.

    Absent face colours mean every face interpolates its vertices, which is a
    different thing from every face being colour 0, so the caller distinguishes
    None from a list.
    """
    if entries is None:
        return []
    if not isinstance(entries, list):
        raise SnoError("rule 8c: facecolors is not an array")
    out: list[int] = []
    for entry in entries:
        if not _is_int(entry):
            raise SnoError("rule 8c: a facecolors entry is not an integer")
        if entry < 0:
            if not out:
                raise SnoError("rule 8c: the first entry must be an index, not a run")
            out.extend(out[-1] for _ in range(-entry))
        else:
            if entry >= palette_len:
                raise SnoError(f"rule 8c: face colour {entry} is outside the palette of {palette_len}")
            out.append(entry)
        if len(out) > count:
            break
    if len(out) != count:
        raise SnoError(f"rule 8c: facecolors expand to {len(out)} colours for {count} faces")
    return out


def validate(payload: Any, fetched_palette: str | None = None) -> dict:
    """§1.9, in order. Returns the payload on success, raises SnoError on failure.

    A payload is accepted whole or not at all: a face index past the end of the
    vertex list is undefined behaviour inside most graphics libraries, so there
    is no partial render to degrade to.
    """
    if not isinstance(payload, dict):
        raise SnoError("rule 1: payload is not a JSON object")

    # 1. version
    if payload.get("v") not in (1, 2) or isinstance(payload.get("v"), bool):
        raise SnoError("rule 1: v must be 1 or 2")
    # §1.1a: there is no `type` field in either version. Payloads written before
    # this document carry type "shard"; it is ignored here and never rejected
    # on, because the field is noise and rejecting on noise would break every
    # object already published.

    # 2. the three arrays, and vertices parallel to colors
    for key in ("vertices", "colors", "faces"):
        if not isinstance(payload.get(key), list):
            raise SnoError(f"rule 2: {key} is not an array")
    vertices, colors, faces = payload["vertices"], payload["colors"], payload["faces"]
    if len(vertices) != len(colors):
        raise SnoError(f"rule 2: {len(vertices)} vertices but {len(colors)} colors")

    # 3. limits
    if len(vertices) > MAX_VERTICES:
        raise SnoError(f"rule 3: {len(vertices)} vertices exceeds {MAX_VERTICES}")
    if len(faces) > MAX_FACES:
        raise SnoError(f"rule 3: {len(faces)} faces exceeds {MAX_FACES}")

    # 4. mode
    if payload.get("mode") not in MODES:
        raise SnoError(f"rule 4: mode must be one of {MODES}")

    # 5. unit
    unit = payload.get("unit")
    if not _is_int(unit) or not 0 <= unit <= MAX_UNIT:
        raise SnoError(f"rule 5: unit must be an integer in 0..{MAX_UNIT}")

    # 6. the triples themselves
    for v in vertices:
        if not (isinstance(v, list) and len(v) == 3 and all(_is_int(c) for c in v)):
            raise SnoError("rule 6: a vertex is not three integers")

    # 7. ticks
    ticks = expand_ticks(payload.get("ticks"), len(vertices))

    # 8a. the palette, and 8b the colours read against it
    palette = resolve_palette(payload.get("palette"), fetched_palette)
    if payload["v"] == 1:
        # §1.3: version 1 predates the palette and carries literal triples.
        # Taken as written, never snapped: snapping on read would change
        # objects nobody asked to change. They snap when next published.
        for c in colors:
            if not (isinstance(c, list) and len(c) == 3 and all(_is_num(x) for x in c)):
                raise SnoError("rule 8b: a v1 colour is not three numbers")
    else:
        for c in colors:
            if not _is_int(c) or c < 0 or c >= len(palette):
                raise SnoError(f"rule 8b: a colour index is not an integer in 0..{len(palette) - 1}")

    # 8. faces
    n = len(vertices)
    for f in faces:
        if not (isinstance(f, list) and len(f) == 3 and all(_is_int(i) for i in f)):
            raise SnoError("rule 8: a face is not three integers")
        if not all(0 <= i < n for i in f):
            raise SnoError(f"rule 8: a face indexes a vertex outside 0..{n - 1}")
        if len(set(f)) != 3:
            raise SnoError("rule 8: a face repeats a vertex")

    # 8a. face colours, when the object carries any
    if "facecolors" in payload:
        expand_face_colors(payload["facecolors"], len(faces), len(palette))

    # 9. extent is repaired, never validated (§1.8). Out of range becomes the
    # default, then it grows until it contains the data, so an object is never
    # rejected for disagreeing with its own bounding hint.
    payload = dict(payload)
    payload["extent"] = repaired_extent(payload.get("extent"), vertices, ticks)

    # 10. standing on Earth. `up` is a boolean and false means absent; `spin`
    # is checked whenever it is present, because a nonsense bearing is
    # malformed even where the bearing goes unused.
    if "up" in payload and not isinstance(payload["up"], bool):
        raise SnoError("rule 10: up, when present, must be a boolean")
    if "spin" in payload:
        spin = payload["spin"]
        if not _is_int(spin) or not 0 <= spin <= 359:
            raise SnoError("rule 10: spin must be an integer in 0..359")

    return payload


def repaired_extent(declared: Any, vertices: list, ticks: list[list[int]]) -> int:
    """§1.8: the bounding hint, corrected against the data.

    A declared extent that is absent, not an integer, or outside 1..64 becomes
    the default of 8. The result then grows until every vertex is inside it.
    There is deliberately no ceiling on the grown value: §8 question 6 records
    that this leaves a payload free to place a vertex arbitrarily far out, and
    why the bound sits on publishers rather than readers for now.
    """
    extent = declared if _is_int(declared) and MIN_EXTENT <= declared <= MAX_EXTENT else DEFAULT_EXTENT
    for v, t in zip(vertices, ticks):
        for axis in range(3):
            total = abs(v[axis] * TICKS_PER_UNIT + t[axis])
            need = -(-total // TICKS_PER_UNIT)  # ceiling division
            if need > extent:
                extent = need
    return extent


def positions(payload: dict) -> Iterator[tuple[Fraction, Fraction, Fraction]]:
    """Exact positions in model units, as Fractions, with the version applied.

    A v1 object was written when +Z pointed away from the viewer, so its Z is
    negated here and it renders exactly as its author built it (DECK-0003 §2).
    A v2 object is read as written. This is the whole of the difference between
    the two versions.

    Validate first.

    Exact rather than float: the whole point of the lattice is that two objects
    authored to meet actually meet, so the reference implementation refuses to
    introduce rounding that a renderer would then have to live with.
    """
    ticks = expand_ticks(payload.get("ticks"), len(payload["vertices"]))
    flip = -1 if payload.get("v") == 1 else 1
    for v, t in zip(payload["vertices"], ticks):
        x, y, z = (Fraction(v[a] * TICKS_PER_UNIT + t[a], TICKS_PER_UNIT) for a in range(3))
        yield (x, y, z * flip)



BUILT_IN_PALETTES = {"cyberspace-neon-256"}


def _load_built_in() -> list[list[int]]:
    """The 256 colours of `cyberspace-neon-256` (§1.3a, Appendix C).

    Read from sno-palette.json beside this file, which sno-palette.mjs
    generates, so there is one copy of the numbers and no chance of the deck
    and the code disagreeing about a hex value.
    """
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "sno-palette.json"), encoding="utf-8") as fh:
        hexes = json.load(fh)["colors"]
    return [[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in hexes]


def parse_palette_content(text: str) -> list[list[int]] | None:
    """§1.3b: a palette event's content, or None when it is not one.

    Deliberately generous about shape and silent about kind. Palettes on nostr
    are somebody else's problem and partly solved already; a reader that
    accepts the obvious form will read whatever convention wins without this
    document being revised. Entries are [r, g, b] integers or "#rrggbb".
    """
    try:
        raw = json.loads(text)
    except Exception:
        return None
    if not isinstance(raw, list) or not 2 <= len(raw) <= 256:
        return None
    out: list[list[int]] = []
    for entry in raw:
        if isinstance(entry, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", entry):
            out.append([int(entry[i:i + 2], 16) for i in (1, 3, 5)])
        elif isinstance(entry, list) and len(entry) == 3 and all(_is_int(c) and 0 <= c <= 255 for c in entry):
            out.append([int(c) for c in entry])
        else:
            return None
    return out


def resolve_palette(field: Any, fetched: str | None = None) -> list[list[int]]:
    """§1.3a and §1.3b: the colours an object's indices name.

    Absent means the built-in. A registered name means the built-in. An naddr
    means a palette published as its own event, and `fetched` is that event's
    content if the caller managed to get it: a reference is never load-bearing,
    so an unresolved one is the built-in and never a rejection. An array is a
    palette the object carries itself, 2 to 256 entries.
    """
    if field is None:
        return _load_built_in()
    if isinstance(field, str):
        if field in BUILT_IN_PALETTES:
            return _load_built_in()
        if field.startswith("naddr1") and len(field) > 12:
            if fetched is None:
                return _load_built_in()
            return parse_palette_content(fetched) or _load_built_in()
        raise SnoError(f"rule 8a: unknown palette {field!r}")
    if not isinstance(field, list):
        raise SnoError("rule 8a: palette is neither a name, an naddr, nor an array")
    if not 2 <= len(field) <= 256:
        raise SnoError(f"rule 8a: a palette carries 2 to 256 colours, not {len(field)}")
    out: list[list[int]] = []
    for entry in field:
        if not (isinstance(entry, list) and len(entry) == 3 and all(_is_int(c) and 0 <= c <= 255 for c in entry)):
            raise SnoError("rule 8a: a palette entry is not three integers in 0..255")
        out.append([int(c) for c in entry])
    return out




# --------------------------------------------------------------------------
# Self-test
# --------------------------------------------------------------------------

APPENDIX_A = {
    "v": 2,
    "name": "tetra",
    "unit": 0,
    "extent": 8,
    "mode": "solid",
    "vertices": [[0, 0, 0], [2, 0, 0], [1, 0, 2], [1, 2, 1]],
    "ticks": [-4],
    # 238 pure red, 235 pure green, 239 pure blue, 225 white, in the built-in.
    "colors": [238, 235, 239, 225],
    "faces": [[0, 1, 2], [0, 1, 3], [1, 2, 3], [0, 2, 3]],
}


def _rejections() -> list[tuple[str, dict]]:
    """One rejection per numbered rule, so a port can check the same table."""
    def variant(**over: Any) -> dict:
        out = dict(APPENDIX_A)
        out.update(over)
        return out

    return [
        ("rule 1", variant(v=3)),
        ("rule 1", variant(v=0)),
        ("rule 2", variant(colors=[238])),
        ("rule 3", variant(vertices=[[0, 0, 0]] * 513, colors=[0] * 513, ticks=[-513], faces=[])),
        ("rule 4", variant(mode="wireframe")),
        ("rule 5", variant(unit=85)),
        ("rule 5", variant(unit=1.5)),
        ("rule 6", variant(vertices=[[0, 0, 0], [2, 0, 0], [1, 0, 2], [1, 2, 1.5]])),
        ("rule 7", variant(ticks=[-3])),
        ("rule 7", variant(ticks=[[0, 0, 120], -3])),
        ("rule 7", variant(ticks=[4])),
        ("rule 8", variant(faces=[[0, 1, 9]])),
        ("rule 8", variant(faces=[[0, 1, 1]])),
        ("rule 8a", variant(palette=[[255, 0, 0]])),               # a palette of one
        ("rule 8a", variant(palette=[[255, 0, 0, 0], [0, 0, 0]])), # an entry of four
        ("rule 8b", variant(colors=[0, 1, 2, 256])),               # past the built-in
        ("rule 8b", variant(colors=[0, 1, 2, -1])),                # negative
        ("rule 8b", variant(colors=[0, 1, 2, 1.5])),               # fractional
        ("rule 8c", variant(facecolors=[238])),                    # too few for four faces
        ("rule 8c", variant(facecolors=[238, -4])),                # too many
        ("rule 8c", variant(facecolors=[-4])),                     # a run with nothing before it
        ("rule 8c", variant(facecolors=[238, 256, -2])),           # past the palette
        ("rule 10", variant(up="yes")),
        ("rule 10", variant(up=True, spin=360)),
        ("rule 10", variant(spin=360)),
    ]


def _self_test() -> None:
    ok = validate(dict(APPENDIX_A))
    compact = json.dumps(ok, separators=(",", ":"))
    print(f"Appendix A validates, {len(compact.encode())} bytes compact")

    pts = list(positions(ok))
    assert pts[3] == (Fraction(1), Fraction(2), Fraction(1)), pts[3]

    # The version is one sign. A v1 object with the same numbers reads mirrored
    # in Z, which is what keeps everything published before v2 looking right.
    # A genuine v1 payload: the version predates the palette, so its colours
    # are literal triples, which is what every object written before this
    # document actually looks like.
    AS_V1 = {**APPENDIX_A, "v": 1, "colors": [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1]]}
    v1 = validate({**AS_V1, "type": "shard"})  # the legacy field is ignored, not required
    assert [p[2] for p in positions(v1)] == [-p[2] for p in positions(ok)]
    assert [p[:2] for p in positions(v1)] == [p[:2] for p in positions(ok)]
    print("v1 and v2 differ in Z and in how a colour is written, and in nothing else")

    # §1.1a: there is no `type` in either version. A payload from before this
    # document carries one; it is read, never required, never rejected on.
    assert validate(AS_V1)["v"] == 1
    assert validate({**AS_V1, "type": "shard"})["v"] == 1
    assert validate({**APPENDIX_A, "type": "shard"})["v"] == 2
    assert validate({**APPENDIX_A, "type": "anything at all"})["v"] == 2
    assert validate({**APPENDIX_A, "type": 17})["v"] == 2
    print("type: no such field, ignored wherever one appears, never required")

    # §1.3: a v1 colour is taken as written, and a v1 payload with indices is
    # not a v1 payload.
    assert validate(AS_V1)["colors"][0] == [1, 0, 0]
    try:
        validate({**AS_V1, "colors": [238, 235, 239, 225]})
        raise AssertionError("a v1 payload with indices should be rejected")
    except SnoError as e:
        assert str(e).startswith("rule 8b"), e
    print("v1: literal colours, taken as written, never snapped on read")

    # §1.3a: the palette an index names.
    built_in = resolve_palette(None)
    assert len(built_in) == 256
    assert resolve_palette("cyberspace-neon-256") == built_in
    assert built_in[238] == [255, 0, 0] and built_in[225] == [255, 255, 255]
    # The layout is arithmetic: hue h step s is h * 8 + s, and step 7 is the
    # brightest, so it is lighter than step 0 of the same hue.
    assert sum(built_in[7]) > sum(built_in[0])
    # A palette the object carries, which may be short: four colours cost four.
    four = {**APPENDIX_A, "palette": [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 255]], "colors": [0, 1, 2, 3]}
    assert len(resolve_palette(validate(four)["palette"])) == 4
    # An index past the end of a short palette is a defect, not a clamp.
    for bad_field, rule in (
        ({**four, "colors": [0, 1, 2, 4]}, "rule 8b"),
        ({**APPENDIX_A, "palette": [[255, 0, 0]]}, "rule 8a"),
        ({**APPENDIX_A, "palette": [[255, 0, 0]] * 257}, "rule 8a"),
        ({**APPENDIX_A, "palette": "no-such-palette"}, "rule 8a"),
        ({**APPENDIX_A, "palette": [[255, 0, 300], [0, 0, 0]]}, "rule 8a"),
    ):
        try:
            validate(bad_field)
            raise AssertionError(f"{rule} accepted {bad_field.get('palette')!r}")
        except SnoError as e:
            assert str(e).startswith(rule), e
    # §1.3b: a reference is never load-bearing. Unresolved is the built-in,
    # never a rejection, so the worst case is wrong colours and never no object.
    NADDR = "naddr1qqxnzdenxvmnxdfhxg6rwwfjqy88wumn8ghj7mn0wvhxcmmv"
    assert resolve_palette(NADDR) == built_in
    assert validate({**APPENDIX_A, "palette": NADDR})["v"] == 2
    assert resolve_palette(NADDR, '["#ff0000","#00ff00"]') == [[255, 0, 0], [0, 255, 0]]
    assert resolve_palette(NADDR, "[[255,0,0],[0,255,0]]") == [[255, 0, 0], [0, 255, 0]]
    # A fetch that returns something that is not a palette is a failed fetch.
    for junk in ("not json", "{}", "[]", '["#ff00"]', "[[300,0,0],[0,0,0]]", json.dumps([[0, 0, 0]] * 257)):
        assert resolve_palette(NADDR, junk) == built_in, junk
    # An index valid against the built-in but past a shorter fetched palette is
    # still a rejection: whichever palette applies is the one that bounds it.
    try:
        validate({**APPENDIX_A, "palette": NADDR}, '["#ff0000","#00ff00"]')
        raise AssertionError("an index past a fetched palette should be rejected")
    except SnoError as e:
        assert str(e).startswith("rule 8b"), e
    print("palette: 256 built in, 2 to 256 carried, a reference falls back and never rejects")

    # A sub-unit position is exact, not approximate: a third of a unit is 40
    # ticks and comes back as exactly one third.
    third = dict(APPENDIX_A)
    third["ticks"] = [[40, 0, 0], -3]
    assert list(positions(validate(third)))[0][0] == Fraction(1, 3)
    print("positions are exact: 40 ticks is exactly one third of a unit")

    failures = 0
    for rule, bad in _rejections():
        try:
            validate(bad)
        except SnoError as e:
            if not str(e).startswith(rule):
                print(f"  MISMATCH: expected {rule}, got: {e}")
                failures += 1
            continue
        print(f"  MISSED: {rule} accepted a payload it should reject: {bad}")
        failures += 1
    print(f"{len(_rejections())} rejection cases, {failures} wrong")

    # §1.8: the extent is a hint, corrected against the data rather than enforced.
    grown = validate(variant_extent := {**APPENDIX_A, "vertices": [[0, 0, 0], [2, 0, 0], [1, 0, 2], [9, 2, 1]]})
    assert grown["extent"] == 9, grown["extent"]
    assert validate({**APPENDIX_A, "extent": 0})["extent"] == 8
    assert validate({**APPENDIX_A, "up": False})["up"] is False
    print("extent repairs: a vertex at 9 units grows the hint from 8 to 9, and extent 0 becomes 8")

    # An object with no ticks at all is whole-unit everywhere.
    whole = {k: v for k, v in APPENDIX_A.items() if k != "ticks"}
    assert [tuple(map(int, p)) for p in positions(validate(whole))] == [
        (0, 0, 0), (2, 0, 0), (1, 0, 2), (1, 2, 1)
    ]
    print("absent ticks means every position is whole")

    # A palette entry is an integer 0..255 and is checked on read, so there is
    # nothing left to clamp: an out-of-range channel is a rejection, not a fix.
    assert resolve_palette([[0, 0, 0], [255, 255, 255]]) == [[0, 0, 0], [255, 255, 255]]
    print("palette entries are checked, not clamped")

    # §1.4a: a solid cube is one colour and a run, not twelve copies.
    solid = validate({**APPENDIX_A, "facecolors": [238, -3]})
    assert expand_face_colors(solid["facecolors"], 4, 256) == [238] * 4
    mixed = validate({**APPENDIX_A, "facecolors": [238, 235, -1, 239]})
    assert expand_face_colors(mixed["facecolors"], 4, 256) == [238, 235, 235, 239]
    assert expand_face_colors(None, 4, 256) == []
    # The sign is what separates an index from a run, which is why colour had
    # to become one number before face colours were affordable.
    for bad_fc, why in (([-1, 238], "a run before there is anything to repeat"),
                        ([238, -9], "expanding past the face count"),
                        ([238], "expanding short"),
                        ([238, 1.5], "a fractional entry"),
                        ([256, -3], "an index past the palette")):
        try:
            validate({**APPENDIX_A, "facecolors": bad_fc})
            raise AssertionError(f"accepted {why}: {bad_fc}")
        except SnoError as e:
            assert str(e).startswith("rule 8c"), (why, e)
    print("face colours: an index or a run, a run repeats the index before it, absent is not colour 0")

    if failures:
        raise SystemExit(1)
    print("OK")


if __name__ == "__main__":
    _self_test()
