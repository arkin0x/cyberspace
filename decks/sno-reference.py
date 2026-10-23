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

# DECK-0003 §1.8. There is no ceiling on vertices or faces (removed 2026-09-24):
# the event's size is the relay's concern, as it is for every other kind.
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


#: §1.9 rule 1a. Whitespace is the characters Unicode gives the White_Space
#: property, written out rather than left to str.strip(), which also strips
#: four ASCII separators (U+001C to U+001F) that are not whitespace and that
#: JavaScript's trim() keeps. A name made only of these is empty.
_BLANK = re.compile("[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]*")


def _blank(text: str) -> bool:
    return _BLANK.fullmatch(text) is not None


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


# §1.10: the reference shapes, and the position bound of §1.8 in ticks.
_HEX64 = re.compile(r"[0-9a-f]{64}")
_ADDRESS = re.compile(r"33331:[0-9a-f]{64}:")
PART_REACH = 64 * 120


def validate(payload: Any, fetched_palette: Any = None) -> dict:
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
    # object already published. That holds for a null `type` too.

    # 1a. name: required, a string, and not empty once whitespace is set aside.
    # A reader still truncates it to 64 characters for display (§1.8); a long
    # name is never a rejection.
    name = payload.get("name")
    if not isinstance(name, str):
        raise SnoError("rule 1a: name is missing or is not a string")
    if _blank(name):
        raise SnoError("rule 1a: name is empty or only whitespace")

    # 2. the three arrays, and vertices parallel to colors
    for key in ("vertices", "colors", "faces"):
        if not isinstance(payload.get(key), list):
            raise SnoError(f"rule 2: {key} is not an array")
    vertices, colors, faces = payload["vertices"], payload["colors"], payload["faces"]
    if len(vertices) != len(colors):
        raise SnoError(f"rule 2: {len(vertices)} vertices but {len(colors)} colors")

    # 3. no bound on the counts (§1.8, 2026-09-24); the number is kept so the rules below keep their names.

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

    # 7. ticks. Null is not absence (§1.1): an optional field written as null
    # fails the rule that checks it, here and at 8a, 8c, 10, 11 and 12.
    if "ticks" in payload and payload["ticks"] is None:
        raise SnoError("rule 7: ticks is null; a publisher omits a field rather than writing null")
    ticks = expand_ticks(payload.get("ticks"), len(vertices))

    # 8a. the palette, and 8b the colours read against it
    if "palette" in payload and payload["palette"] is None:
        raise SnoError("rule 8a: palette is null; a publisher omits a field rather than writing null")
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
        if payload["facecolors"] is None:
            raise SnoError("rule 8c: facecolors is null; a publisher omits a field rather than writing null")
        expand_face_colors(payload["facecolors"], len(faces), len(palette))

    # 9. extent is repaired, never validated (§1.8). Out of range becomes the
    # default, then it grows until it contains the data, so an object is never
    # rejected for disagreeing with its own bounding hint. Null is malformed
    # like any other value that is not an integer, so it too becomes 8: the
    # one optional field where null is not a rejection.
    payload = dict(payload)
    payload["extent"] = repaired_extent(payload.get("extent"), vertices, ticks)

    # 10. standing on Earth. `up` is a boolean and false means absent; `spin`
    # is checked whenever it is present, because a nonsense bearing is
    # malformed even where the bearing goes unused. Null is neither a boolean
    # nor an integer, so it fails both, as it does for refs and parts below.
    if "up" in payload and not isinstance(payload["up"], bool):
        raise SnoError("rule 10: up, when present, must be a boolean")
    if "spin" in payload:
        spin = payload["spin"]
        if not _is_int(spin) or not 0 <= spin <= 359:
            raise SnoError("rule 10: spin must be an integer in 0..359")

    # 11. refs: each ["e", <64 hex>] or ["a", "33331:<64 hex>:<d>"], and at
    # most one relay URL after it.
    refs = payload.get("refs", [])
    if not isinstance(refs, list):
        raise SnoError("rule 11: refs is not an array")
    for r in refs:
        if not isinstance(r, list) or not 2 <= len(r) <= 3 or not all(isinstance(x, str) for x in r):
            raise SnoError("rule 11: a refs entry is not a tag of two or three strings")
        if not ((r[0] == "e" and _HEX64.fullmatch(r[1])) or (r[0] == "a" and _ADDRESS.match(r[1]))):
            raise SnoError("rule 11: a refs entry is neither an e nor an a reference")

    # 12. parts: eight integers each, a refs index in range, ticks within the
    # 64-unit bound, whole degrees. The scale bound names the placed object's
    # unit, which is known only once it is fetched; a reader draws an
    # out-of-range one as a placeholder (§1.10), so here it is only an integer.
    parts = payload.get("parts", [])
    if not isinstance(parts, list):
        raise SnoError("rule 12: parts is not an array")
    for p in parts:
        if not isinstance(p, list) or len(p) != 8 or not all(_is_int(x) for x in p):
            raise SnoError("rule 12: a placement is not eight integers")
        if not 0 <= p[0] < len(refs):
            raise SnoError("rule 12: a placement names no refs entry")
        if not all(-PART_REACH <= x <= PART_REACH for x in p[1:4]):
            raise SnoError("rule 12: a placement stands past the 64-unit bound")
        if not all(0 <= x <= 359 for x in p[4:7]):
            raise SnoError("rule 12: a turn is not whole degrees 0..359")

    # 13. Nothing to check: an object may be only the arrangement of others.
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


#: §1.3b. A colour as the `c` tag convention writes one.
HEX = re.compile(r"#[0-9a-fA-F]{6}")

#: §1.3a. A palette carried by an event rather than by the object. `nevent`
#: names one immutable event, which is what pins an object's colours; `naddr`
#: is accepted for a palette somebody publishes as an addressable event.
PALETTE_REF = re.compile(r"(nevent1|naddr1)[023456789acdefghjklmnpqrstuvwxyz]{20,}")


def parse_palette_content(text: str) -> list[list[int]] | None:
    """§1.3b step 2: the legacy palette in an event's `content`, or None.

    Entries are [r, g, b] integers or "#rrggbb". This form is read and never
    written: an earlier draft of §1.3b described it, so somebody may have
    implemented it, and five lines of generosity costs nothing. The tags are
    the encoding.
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


def parse_palette_event(event: Any) -> list[list[int]] | None:
    """§1.3b: the palette an event carries, or None when it carries none.

    The `c` tags are the encoding and their order is the index. They are read
    first because a single-letter tag is indexed by relays, so `{"#c": [...]}`
    finds every palette containing a colour, which is a capability that exists
    only while the colours are tags. `content` is read after them and only
    because an earlier draft of this section described that form.

    `event` is the event as a dict, or its `content` alone as a string for a
    caller that has nothing else.
    """
    if isinstance(event, str):
        return parse_palette_content(event)
    if not isinstance(event, dict):
        return None

    tags = event.get("tags")
    marked = [t for t in tags if isinstance(t, list) and t and t[0] == "c"] if isinstance(tags, list) else []
    if 2 <= len(marked) <= 256:
        out: list[list[int]] = []
        for tag in marked:
            # One malformed value fails the whole tag path rather than being
            # skipped: a palette with a hole in it is not the palette the
            # author published, and every index after the hole would shift.
            if len(tag) < 2 or not isinstance(tag[1], str) or not HEX.fullmatch(tag[1]):
                out = []
                break
            out.append([int(tag[1][i:i + 2], 16) for i in (1, 3, 5)])
        if out:
            return out

    content = event.get("content")
    return parse_palette_content(content) if isinstance(content, str) else None


def resolve_palette(field: Any, fetched: Any = None) -> list[list[int]]:
    """§1.3a and §1.3b: the colours an object's indices name.

    Absent means the built-in. A registered name means the built-in. An nevent
    or an naddr means a palette published as its own event, and `fetched` is
    that event if the caller managed to get it: a reference is never
    load-bearing, so an unresolved one is the built-in and never a rejection.
    An array is a palette the object carries itself, 2 to 256 entries.

    A reader resolves the reference to the event it names and stops there. It
    MUST NOT follow an edit chain forward to a newer palette, which is what
    keeps an object looking the way its author published it.
    """
    if field is None:
        return _load_built_in()
    if isinstance(field, str):
        if field in BUILT_IN_PALETTES:
            return _load_built_in()
        if PALETTE_REF.fullmatch(field):
            if fetched is None:
                return _load_built_in()
            return parse_palette_event(fetched) or _load_built_in()
        raise SnoError(f"rule 8a: unknown palette {field!r}")
    if not isinstance(field, list):
        raise SnoError("rule 8a: palette is neither a name, a reference, nor an array")
    if not 2 <= len(field) <= 256:
        raise SnoError(f"rule 8a: a palette carries 2 to 256 colours, not {len(field)}")
    out: list[list[int]] = []
    for entry in field:
        if not (isinstance(entry, list) and len(entry) == 3 and all(_is_int(c) and 0 <= c <= 255 for c in entry)):
            raise SnoError("rule 8a: a palette entry is not three integers in 0..255")
        out.append([int(c) for c in entry])
    return out


# --------------------------------------------------------------------------
# What a reader draws, once a payload validates. Each of these assumes
# validate() has already accepted the payload, and adds no rule of its own.
# They exist so that the conformance vectors (sno-vectors.json) can state an
# expected result for colors and fronts that this file produced, rather than
# one somebody worked out by hand.
# --------------------------------------------------------------------------

def vertex_colors(payload: dict, fetched_palette: Any = None) -> list[list]:
    """§1.3: the color each vertex is drawn in, one per vertex.

    In a v2 payload an index names an entry of whichever palette applies
    (§1.3a, §1.3b), and the result is that entry, three integers 0..255. In a
    v1 payload the color is the literal triple, clamped to 0..1 on read and
    otherwise taken exactly as written, never snapped to a palette entry.
    """
    if payload["v"] == 1:
        return [[min(1, max(0, x)) for x in c] for c in payload["colors"]]
    palette = resolve_palette(payload.get("palette"), fetched_palette)
    return [list(palette[i]) for i in payload["colors"]]


def face_colors(payload: dict, fetched_palette: Any = None) -> list[list[int]] | None:
    """§1.4a: the color that fills each face, or None when every face
    interpolates its corners. None and an empty list are different answers:
    the second is an object that carries face colors and has no faces."""
    if payload.get("facecolors") is None:
        return None
    palette = resolve_palette(payload.get("palette"), fetched_palette)
    indices = expand_face_colors(payload["facecolors"], len(payload["faces"]), len(palette))
    return [list(palette[i]) for i in indices]


def fronts(payload: dict) -> list[tuple[int, int, int]]:
    """§1.4: the side each face looks toward, as the normal (b - a) × (c - a).

    Computed on exact positions in ticks, in the frame of §2, which for a v1
    payload is after its Z is negated. The result is therefore three integers,
    in square ticks, and only its direction carries meaning: the front is the
    side it points to, and seen from there the corners run counter-clockwise.
    A face whose three corners are collinear or coincide has the zero vector
    and no front. It is still valid, because §1.9 rule 8 asks only for three
    distinct indices.
    """
    ticks = expand_ticks(payload.get("ticks"), len(payload["vertices"]))
    flip = -1 if payload["v"] == 1 else 1
    pts = [
        (v[0] * TICKS_PER_UNIT + t[0], v[1] * TICKS_PER_UNIT + t[1], (v[2] * TICKS_PER_UNIT + t[2]) * flip)
        for v, t in zip(payload["vertices"], ticks)
    ]
    out: list[tuple[int, int, int]] = []
    for a, b, c in payload["faces"]:
        u = [pts[b][i] - pts[a][i] for i in range(3)]
        w = [pts[c][i] - pts[a][i] for i in range(3)]
        out.append((u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]))
    return out


#: §3. The kinds whose events carry a payload in `content`.
OBJECT_KIND = 33331  # §3.1, a standalone object
ITEM_KIND = 3330     # §3.2, an item inside a bag, signed or unsigned
AVATAR_KIND = 11333  # §3.3, an avatar


def _refuse_constant(name: str) -> None:
    raise ValueError(f"{name} is not a JSON value")


def parse_content(text: Any) -> Any:
    """An event's `content` read as JSON, or a rule 1 rejection.

    JSON as RFC 8259 defines it. Python's json module also reads NaN,
    Infinity and -Infinity, which are not JSON and which no browser's
    JSON.parse accepts, so they are refused here: otherwise a v1 color of
    NaN would pass this file and fail every JavaScript reader.
    """
    if not isinstance(text, str):
        raise SnoError("rule 1: content is not a string")
    try:
        return json.loads(text, parse_constant=_refuse_constant)
    except ValueError:
        raise SnoError("rule 1: content is not JSON") from None


def read_event(event: Any, fetched_palette: Any = None) -> dict:
    """§3: what a reader makes of an event that carries an object.

    Returns one of:

    - {"status": "object", "payload": <the payload, validated>}
    - {"status": "hidden"}: a kind 33331 with an `encrypted` tag is an object
      sealed to a place (§3.4). Its content is a preview for people, not a
      payload, and is not parsed.
    - {"status": "default-avatar"}: a kind 11333 with empty content (§3.3).

    Raises SnoError when the content fails §1.9, which includes content that
    is not JSON at all (§3.1: a client MUST NOT render it).

    Raises SnoError, too, for a kind 33331 with no `d` tag or an empty one
    (§3.1), hidden or not: NIP-01 addresses it by kind, pubkey and `d`, and a
    relay that reads a missing `d` as the empty string files every such event
    from one author under one address, each replacing the last.

    Not checked here: the event's id and signature, which are NIP-01's
    business and which a kind 3330 item may lack (§6).
    """
    if not isinstance(event, dict):
        raise SnoError("§3: an event is a JSON object")
    kind = event.get("kind")
    if kind not in (OBJECT_KIND, ITEM_KIND, AVATAR_KIND) or isinstance(kind, bool):
        raise SnoError(f"§3: kind {kind!r} does not carry an object")
    tags = event.get("tags") if isinstance(event.get("tags"), list) else []
    content = event.get("content")
    if kind == OBJECT_KIND:
        # §3.1: the `d` tag is the first tag named "d", as NIP-01 reads it.
        d = next((t for t in tags if isinstance(t, list) and t[:1] == ["d"]), None)
        if d is None or len(d) < 2 or not isinstance(d[1], str) or d[1] == "":
            raise SnoError("§3.1: a kind 33331 has no d tag, or an empty one")
    if kind == OBJECT_KIND and any(isinstance(t, list) and t[:1] == ["encrypted"] for t in tags):
        return {"status": "hidden"}
    if kind == AVATAR_KIND and content == "":
        return {"status": "default-avatar"}
    return {"status": "object", "payload": validate(parse_content(content), fetched_palette)}


# --------------------------------------------------------------------------
# Self-test
# --------------------------------------------------------------------------

APPENDIX_A = {
    "v": 2,
    "name": "tetra",
    "unit": 0,
    "mode": "solid",
    "vertices": [[0, 0, 0], [2, 0, 0], [1, 0, 2], [1, 2, 1]],
    # 238 pure red, 235 pure green, 239 pure blue, 225 white, in the built-in.
    "colors": [238, 235, 239, 225],
    # Wound outward: every front looks out of the solid (§1.4).
    "faces": [[0, 1, 2], [0, 3, 1], [1, 3, 2], [0, 2, 3]],
}


def _rejections() -> list[tuple[str, dict]]:
    """One rejection per numbered rule, so a port can check the same table."""
    def variant(**over: Any) -> dict:
        out = dict(APPENDIX_A)
        out.update(over)
        return out

    nameless = {k: v for k, v in APPENDIX_A.items() if k != "name"}

    return [
        ("rule 1", variant(v=3)),
        ("rule 1", variant(v=0)),
        ("rule 1a", nameless),
        ("rule 1a", variant(name=7)),
        ("rule 1a", variant(name=None)),
        ("rule 1a", variant(name="")),
        ("rule 1a", variant(name=" \t\u3000")),
        ("rule 2", variant(colors=[238])),
        ("rule 4", variant(mode="wireframe")),
        ("rule 5", variant(unit=85)),
        ("rule 5", variant(unit=1.5)),
        ("rule 6", variant(vertices=[[0, 0, 0], [2, 0, 0], [1, 0, 2], [1, 2, 1.5]])),
        ("rule 7", variant(ticks=[-3])),
        ("rule 7", variant(ticks=[[0, 0, 120], -3])),
        ("rule 7", variant(ticks=[4])),
        ("rule 7", variant(ticks=None)),                           # null is not absence
        ("rule 8", variant(faces=[[0, 1, 9]])),
        ("rule 8", variant(faces=[[0, 1, 1]])),
        ("rule 8a", variant(palette=[[255, 0, 0]])),               # a palette of one
        ("rule 8a", variant(palette=[[255, 0, 0, 0], [0, 0, 0]])), # an entry of four
        ("rule 8a", variant(palette=None)),
        ("rule 8b", variant(colors=[0, 1, 2, 256])),               # past the built-in
        ("rule 8b", variant(colors=[0, 1, 2, -1])),                # negative
        ("rule 8b", variant(colors=[0, 1, 2, 1.5])),               # fractional
        ("rule 8c", variant(facecolors=[238])),                    # too few for four faces
        ("rule 8c", variant(facecolors=[238, -4])),                # too many
        ("rule 8c", variant(facecolors=[-4])),                     # a run with nothing before it
        ("rule 8c", variant(facecolors=[238, 256, -2])),           # past the palette
        ("rule 8c", variant(facecolors=None)),
        ("rule 8c", variant(vertices=[], colors=[], faces=[], facecolors=None)),  # null even with no faces to color
        ("rule 10", variant(up="yes")),
        ("rule 10", variant(up=True, spin=360)),
        ("rule 10", variant(spin=360)),
        ("rule 10", variant(up=None)),
        ("rule 10", variant(spin=None)),
        ("rule 11", variant(refs="x")),
        ("rule 11", variant(refs=None)),
        ("rule 11", variant(refs=[["a", "33331:" + "AB" * 32 + ":d"]])),  # uppercase hex
        ("rule 11", variant(refs=[["a", "30023:" + "ab" * 32 + ":d"]])),  # not an object's kind
        ("rule 11", variant(refs=[["e", "cd" * 31]])),                     # short id
        ("rule 11", variant(refs=[["p", "ab" * 32]])),
        ("rule 11", variant(refs=[["e", "cd" * 32, "wss://x", "extra"]])),
        ("rule 12", variant(parts=[[0, 0, 0, 0, 0, 0, 0, 0]])),            # parts without refs
        ("rule 12", variant(parts=None)),
        ("rule 12", variant(refs=[["e", "cd" * 32]], parts=[[1, 0, 0, 0, 0, 0, 0, 0]])),
        ("rule 12", variant(refs=[["e", "cd" * 32]], parts=[[0, 7681, 0, 0, 0, 0, 0, 0]])),
        ("rule 12", variant(refs=[["e", "cd" * 32]], parts=[[0, 0, 0, 0, 360, 0, 0, 0]])),
        ("rule 12", variant(refs=[["e", "cd" * 32]], parts=[[0, 0, 0, 0, 0, 0, 0]])),
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
    assert validate({**APPENDIX_A, "type": None})["v"] == 2  # null too: the null rule of §1.1 does not reach it
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
    NEVENT = "nevent1qqsfktxwwrls0r3e465nl47z7x3p9zsj8gqye7w5lhpakewwzw9r44cpp4mhxue69uhkummn9ekx7mqwz8u63"
    NADDR = "naddr1qqxnzdenxvmnxdfhxg6rwwfjqy88wumn8ghj7mn0wvhxcmmv"
    for ref in (NEVENT, NADDR):
        assert resolve_palette(ref) == built_in
        assert validate({**APPENDIX_A, "palette": ref})["v"] == 2
        assert resolve_palette(ref, '["#ff0000","#00ff00"]') == [[255, 0, 0], [0, 255, 0]]
        assert resolve_palette(ref, "[[255,0,0],[0,255,0]]") == [[255, 0, 0], [0, 255, 0]]

    # A real kind 3367 event, published by espy.you and recorded by the survey
    # of 2026-09-16. Its colours are in `c` tags, which is where all 205 events
    # the survey found keep them, and its content is an emoji. The rule this
    # section carried before today read content only and would have refused it.
    ESPY = {
        "kind": 3367,
        "id": "9b2cce70ff078e39aea93fd7c2f1a2128a123a004cf9d4fdc3db65ce138a3ad7",
        "pubkey": "765c2fe92035657774080c87426f8dd8b4c8bbbadca702c93247efccf69d8618",
        "created_at": 1789310239,
        "tags": [
            ["c", "#B4B4AF"], ["c", "#FC4755"], ["c", "#D1242B"],
            ["c", "#694F34"], ["c", "#A1785D"], ["c", "#01AE85"],
            ["layout", "horizontal"],
            ["alt", "Color moment: #B4B4AF, #FC4755, #D1242B, #694F34, #A1785D, #01AE85"],
            ["client", "3cbg51pm00nms2dp8rm9xiswj8i6n4sfp0mlc8obmum6dd31hjespy.nsite.localhost"],
        ],
        "content": "\N{EUROPEAN CASTLE}",
    }
    assert parse_palette_event(ESPY) == [
        [180, 180, 175], [252, 71, 85], [209, 36, 43],
        [105, 79, 52], [161, 120, 93], [1, 174, 133],
    ]
    assert resolve_palette(NEVENT, ESPY) == parse_palette_event(ESPY)
    # Order is document order, and the order is the index: not sorted, not
    # deduplicated, and not reordered by anything else in the event.
    assert parse_palette_event({"content": "", "tags": [["c", "#00ff00"], ["c", "#ff0000"]]}) == [[0, 255, 0], [255, 0, 0]]
    # The tags win over a content that also parses, because they are the
    # encoding and the content form is only read for the draft that described it.
    both = {**ESPY, "content": json.dumps(["#000000", "#111111", "#222222"])}
    assert parse_palette_event(both) == parse_palette_event(ESPY)
    # The legacy content form, read on an event whose tags carry no palette.
    legacy = {"content": json.dumps(["#000000", "#111111", "#222222"]), "tags": [["name", "three greys"]]}
    assert parse_palette_event(legacy) == [[n, n, n] for n in (0, 17, 34)]
    # Tags that do not parse fall through to the content rather than failing
    # the event: the reader takes the first rule that succeeds, in order.
    assert parse_palette_event({**legacy, "tags": [["c", "not a colour"]]}) == [[n, n, n] for n in (0, 17, 34)]
    # An event with neither is a failed fetch, not an error.
    for empty in (
        {"content": "\N{ARTIST PALETTE}", "tags": []},
        {"content": "", "tags": [["c", "#ff0000"]]},                    # one colour is not a palette
        {"content": "", "tags": [["c", "#ff0000"], ["c", "ff0000"]]},   # one malformed fails the path
        {"content": "", "tags": [["c", "#ff0000"], ["c"]]},             # a c tag with no value
        {"content": "", "tags": [["c", "#ff0000"]] * 257},
        {"content": "not json", "tags": "not tags"},
        {},
        [],
        None,
    ):
        assert parse_palette_event(empty) is None, empty
        assert resolve_palette(NEVENT, empty) == built_in if empty is not None else True
    # A fetch that returns something that is not a palette is a failed fetch.
    for junk in ("not json", "{}", "[]", '["#ff00"]', "[[300,0,0],[0,0,0]]", json.dumps([[0, 0, 0]] * 257)):
        assert resolve_palette(NEVENT, junk) == built_in, junk
    # An index valid against the built-in but past a shorter fetched palette is
    # still a rejection: whichever palette applies is the one that bounds it.
    try:
        validate({**APPENDIX_A, "palette": NEVENT}, '["#ff0000","#00ff00"]')
        raise AssertionError("an index past a fetched palette should be rejected")
    except SnoError as e:
        assert str(e).startswith("rule 8b"), e
    print("palette: 256 built in, 2 to 256 carried, a reference falls back and never rejects")
    print("palette event: c tags are the palette and their order is the index; a live kind 3367 reads as its six colours")

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

    # §1.10 and rule 13: an object may be nothing but the arrangement of
    # others, and a relay hint is optional.
    floor = {**APPENDIX_A, "vertices": [], "colors": [], "faces": [], "ticks": [],
             "refs": [["a", "33331:" + "ab" * 32 + ":tile", "wss://relay.example"]],
             "parts": [[0, x * 120, 0, 0, 0, 90, 0, 0] for x in range(-64, 65)]}
    assert len(validate(floor)["parts"]) == 129
    print("an object of 129 placements and no vertices of its own validates")

    # §1.8: the extent is a hint, corrected against the data rather than enforced.
    grown = validate(variant_extent := {**APPENDIX_A, "vertices": [[0, 0, 0], [2, 0, 0], [1, 0, 2], [9, 2, 1]]})
    assert grown["extent"] == 9, grown["extent"]
    assert validate({**APPENDIX_A, "extent": 0})["extent"] == 8
    # Null is malformed, so it is repaired like any other bad extent: the one
    # optional field where null is not a rejection (§1.1).
    assert validate({**APPENDIX_A, "extent": None})["extent"] == 8
    assert validate({**APPENDIX_A, "up": False})["up"] is False
    print("extent repairs: a vertex at 9 units grows the hint from 8 to 9, and extent 0 or null becomes 8")

    # §1.1, rule 1a: a name is required and must say something, but a long one
    # is truncated for display rather than refused.
    assert validate({**APPENDIX_A, "name": "n" * 100})["name"] == "n" * 100
    assert validate({**APPENDIX_A, "name": " x "})["name"] == " x "
    print("name: required, not blank, and never refused for its length")

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

    # §1.3: what each vertex is drawn in. An index is a palette entry; a v1
    # literal is clamped and otherwise left exactly as written.
    assert vertex_colors(ok) == [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 255]]
    assert vertex_colors(validate(four)) == four["palette"]
    assert vertex_colors(validate({**AS_V1, "colors": [[1.5, -0.25, 0.5], [0, 1, 0], [0, 0, 1], [1, 1, 1]]}))[0] == [1, 0, 0.5]
    assert face_colors(ok) is None
    assert face_colors(solid) == [[255, 0, 0]] * 4
    print("colors: an index reads as its palette entry, a v1 literal is clamped and never snapped")

    # §1.4: every face of Appendix A looks out of the solid, so its normal
    # points away from the middle of the tetrahedron.
    middle = [sum(v[a] for v in APPENDIX_A["vertices"]) * TICKS_PER_UNIT / 4 for a in range(3)]
    for face, n in zip(APPENDIX_A["faces"], fronts(ok)):
        center = [sum(APPENDIX_A["vertices"][i][a] for i in face) * TICKS_PER_UNIT / 3 for a in range(3)]
        assert sum(n[a] * (center[a] - middle[a]) for a in range(3)) > 0, (face, n)
    # The v1 negation is a mirror, and a mirror turns every front round: the
    # same indices on the mirrored corners give (-x, -y, z) where v2 gives
    # (x, y, z). That is why §1.4 reads the front after the negation.
    assert fronts(v1) == [(-x, -y, z) for x, y, z in fronts(ok)]
    sheet = {**APPENDIX_A, "vertices": [[0, 0, 0], [1, 0, 0], [0, 0, 1]], "colors": [0, 0, 0], "faces": [[0, 1, 2]]}
    assert fronts(validate(sheet)) == [(0, -14400, 0)]
    assert fronts(validate({**sheet, "v": 1, "colors": [[0, 0, 0]] * 3})) == [(0, 14400, 0)]
    print("fronts: Appendix A looks outward on every face, and the v1 negation turns a front round")

    # §3: the event around a payload.
    tetra = json.dumps(APPENDIX_A)
    assert read_event({"kind": 33331, "tags": [["d", "t"]], "content": tetra})["payload"]["name"] == "tetra"
    assert read_event({"kind": 3330, "tags": [], "content": tetra})["status"] == "object"
    assert read_event({"kind": 11333, "tags": [], "content": ""}) == {"status": "default-avatar"}
    assert read_event({"kind": 33331, "tags": [["d", "x"], ["encrypted", "aes-256-gcm", "AAAA", "cyberspace:region"]],
                       "content": "This object is hidden at a place in cyberspace."}) == {"status": "hidden"}
    # §3.1: a kind 33331 with no d, or an empty one, is refused, hidden or not.
    # The other kinds have no address and need none.
    hidden_tag = ["encrypted", "aes-256-gcm", "AAAA", "cyberspace:region"]
    for tags in ([], [["d", ""]], [["d"]], [["name", "tetra"]], [hidden_tag], [["d", ""], ["d", "late"]]):
        try:
            read_event({"kind": 33331, "tags": tags, "content": tetra})
            raise AssertionError(f"accepted a kind 33331 with tags {tags!r}")
        except SnoError as e:
            assert str(e).startswith("§3.1"), e
    assert read_event({"kind": 33331, "tags": [["d", "t"], ["d", ""]], "content": tetra})["status"] == "object"
    for content in ("{", "", "not json", '{"v": NaN}'):
        try:
            read_event({"kind": 33331, "tags": [["d", "t"]], "content": content})
            raise AssertionError(f"accepted content {content!r}")
        except SnoError as e:
            assert str(e).startswith("rule 1"), e
    print("events: 33331, 3330 and 11333 read the same payload; hidden and default avatars are not errors; NaN is not JSON; a 33331 needs a d")

    if failures:
        raise SystemExit(1)
    print("OK")


if __name__ == "__main__":
    _self_test()
