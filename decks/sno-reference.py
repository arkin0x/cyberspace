"""Reference implementation of DECK-0003: SNO (Simple Nostr Objects).

This is the normative validation of DECK-0003 §1.9 written out as code, plus
the position expansion of §1.2, with no dependencies beyond the standard
library. It is meant to be read, ported, and used as a conformance oracle: a
client that disagrees with this file about whether a payload is valid has a
bug, or this file does.

Run it directly to execute the self-test:

    python3 sno-reference.py

The self-test carries the worked example from Appendix A, and a rejection case
for every numbered rule in §1.9 that rejects, so a port can be checked against
the same table. Rules 9 (`extent`), 14 (`opacity`) and 15 (`constrain`)
repair rather than reject, so they carry repair cases instead: a value in, the
value a reader draws or walks with out. Rule 16 (`objects`) never rejects the
payload that carries it. `objects` is the objects table: a JSON object whose
keys are addresses such as "33331:<pubkey hex>:<d>" and whose values are the
payloads of the objects those addresses name (§1.10). Rule 16 therefore
carries cases of where each placement's object comes from instead: from the
table, as a placeholder, or fetched from relays. Rule 17 (`anim`) never
rejects either: it carries read cases, and the vector table of §1.14, the
pose of each motion at a given Unix time.
"""

from __future__ import annotations

import json
import math
import os
import re
from fractions import Fraction
from typing import Any, Iterator

# DECK-0003 §1.8. There is no ceiling on vertices or faces (removed 2026-09-24):
# the event's size is the relay's concern, as it is for every other kind.
MIN_EXTENT = 1
#: The position bound of §1.8 in model units: 4,096 since 2026-11-23 (it was 64).
MAX_EXTENT = 4096
DEFAULT_EXTENT = 8
MAX_UNIT = 84
MAX_NAME = 64

#: §1.2. One model unit is this many ticks. 120 is the smallest number
#: divisible by every integer from 1 to 6, so halves, thirds, quarters,
#: fifths and sixths of a unit all land exactly on the lattice.
TICKS_PER_UNIT = 120

MODES = ("solid", "points", "lines")

#: §1.11. Opacity is a whole percent from 0 to 100. Absent or malformed means
#: fully opaque. There is no floor (since 2026-11-15): at 0 an object draws
#: nothing of its own, and its glow (§1.16) still shows.
OPACITY_OPAQUE = 100

#: §1.15 and §1.16. The largest point size and the farthest a glow's radius
#: reaches, in ticks: the 4,096-unit position bound of §1.8, 4096 x 120.
TICK_REACH = MAX_EXTENT * 120
#: §1.16: the two glow words, lowercase and exact.
GLOW_WORDS = ("light", "fog")


#: §1.12. The two words a walker is stopped by; anything else, absent
#: included, stops nothing, and is reported here as "none".
WALK_CONSTRAINTS = ("all", "opaque")
#: §1.12: the three words an author can choose; "off" is a choice of nothing.
AUTHORED_CONSTRAINTS = ("all", "opaque", "off")
#: §1.12: what an authoring tool writes for an object whose setting nobody chose.
AUTHORING_DEFAULT = "opaque"


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


# §1.10: the reference shapes, and the position bound of §1.8 in ticks.
_HEX64 = re.compile(r"[0-9a-f]{64}")
_ADDRESS = re.compile(r"33331:[0-9a-f]{64}:")
PART_REACH = TICK_REACH


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
    # object already published.

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
    # 4,096-unit bound, whole degrees. The scale bound names the placed object's
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
            raise SnoError("rule 12: a placement stands past the 4,096-unit bound")
        if not all(0 <= x <= 359 for x in p[4:7]):
            raise SnoError("rule 12: a turn is not whole degrees 0..359")

    # 13. Nothing to check: an object may be only the arrangement of others.

    # 14. opacity is repaired, never validated (§1.11): whatever the field
    # holds, the payload is accepted, and drawn_opacity() says what a reader
    # draws it at. There is deliberately no rejection here and no rejection
    # case in the self-test: a reader that knows the field must never draw
    # less than one that ignores it.

    # 15. constrain is repaired, never validated (§1.12), for the same reason:
    # walk_constraint() says what a walker meets, and nothing here rejects.

    # 16. objects is read, never validated with this payload (§1.10). Each
    # entry in the table is checked on its own, when a placement draws from
    # it (see draw_carried). An entry that fails is a placeholder for that
    # placement. There is therefore nothing to check here, and nothing in
    # the field can reject this payload.

    # 17. anim is read, never validated (§1.14): motions_of() says what moves.

    # 18 and 19. pointsize and glow are read, never validated (§1.15, §1.16):
    # drawn_pointsize() and drawn_glow() say what a reader draws, and nothing
    # here rejects.
    return payload


def repaired_extent(declared: Any, vertices: list, ticks: list[list[int]]) -> int:
    """§1.8: the bounding hint, corrected against the data.

    A declared extent that is absent, not an integer, or outside 1..4096 becomes
    the default of 8. The result then grows until every vertex is inside it.
    There is deliberately no ceiling on the grown value: §8 question 3 records
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


def drawn_opacity(payload: dict) -> int:
    """§1.11: the percent a reader draws the object's own faces, edges and points at.

    Absent means 100. A value that is not an integer in 0..100 (above 100,
    negative, fractional, a string, a boolean, null, an array, anything) is
    malformed and also means 100: repaired to opaque, exactly as if absent,
    never a rejection. There is no floor: 0 draws nothing of the object's
    own. It never reaches the object's glow (drawn_glow).

    This is what an object asks for. A reader that cannot draw translucency
    MAY draw any object opaque, and an avatar (§3.3) is always drawn opaque
    whatever this says; both are the reader's to apply, not the payload's.
    """
    # Strict on int: a JSON 50.0 arrives here as a float and is repaired to
    # 100. A reader whose parser cannot tell 50.0 from 50 may draw it at 50
    # (§1.11); the difference is in how see-through it is drawn, never in
    # whether it is accepted.
    value = payload.get("opacity", OPACITY_OPAQUE)
    if not _is_int(value) or not 0 <= value <= OPACITY_OPAQUE:
        return OPACITY_OPAQUE
    return value


def drawn_pointsize(payload: dict) -> int | None:
    """§1.15: how wide each point is drawn, in ticks of the object's lattice.

    None means the reader's own size: the field is absent, malformed (not an
    integer in 0..491520, null included), or the object is not in points mode,
    where the field is kept and not drawn. 0 means no points. Never a
    rejection. An avatar ignores it (§3.3); that is the reader's to apply.
    """
    if payload.get("mode") != "points":
        return None
    value = payload.get("pointsize")
    return value if _is_int(value) and 0 <= value <= TICK_REACH else None


def drawn_glow(payload: dict) -> tuple[str, int, int] | None:
    """§1.16: (word, radius in ticks, glow strength in percent), or None for no glow.

    A glow is exactly three elements: "light" or "fog", lowercase and exact;
    an integer radius in 1..491520; an integer glow strength in 1..100.
    Anything else, null included, is no glow, and so is any glow on an
    object not in points mode, where the field is kept and not drawn.
    Never a rejection. The object's opacity does not multiply the strength.
    An avatar ignores it (§3.3); that is the reader's to apply.
    """
    if payload.get("mode") != "points":
        return None
    g = payload.get("glow")
    if not isinstance(g, list) or len(g) != 3:
        return None
    word, radius, strength = g
    if not (isinstance(word, str) and word in GLOW_WORDS):
        return None
    if not (_is_int(radius) and 1 <= radius <= TICK_REACH):
        return None
    if not (_is_int(strength) and 1 <= strength <= 100):
        return None
    return (word, radius, strength)


def walk_constraint(payload: dict) -> str:
    """§1.12: "all", "opaque", or "none" for an object that stops no walker.

    This is the reader's side. Only the two lowercase words that stop a
    walker count. "off", absent, null, "ALL", a number, a boolean, an array,
    an object, anything else: the object stops nothing, and the payload is
    never rejected for it. "off" is a word the field has, written by an
    author who chose nothing; a reader treats it exactly as absent.
    """
    value = payload.get("constrain")
    return value if isinstance(value, str) and value in WALK_CONSTRAINTS else "none"


def authored_constraint(payload: dict) -> str:
    """§1.12: the value an authoring tool shows, and writes when it publishes.

    This is the editor's side, and it differs from walk_constraint() on
    purpose. "all", "opaque" and "off" are a choice and come back exactly as
    found. Absent is treated as not chosen, and a malformed value is not a
    choice either: both come back as "opaque", the authoring default, so a
    tool publishes what it showed its user. A tool writes the
    value this returns, and so never writes an absent field for an object it
    publishes (an avatar, which every reader ignores here, may omit it).
    """
    value = payload.get("constrain")
    if isinstance(value, str) and value in AUTHORED_CONSTRAINTS:
        return value
    return AUTHORING_DEFAULT


def stops_walker(payload: dict) -> bool:
    """§1.12: whether this object's own faces stop a walker.

    "all" stops one in every mode and at every opacity, 0 included, where
    the object draws nothing of its own (ruled 2026-11-15). "opaque" stops one
    only while the object is opaque, read from the payload and never from how
    a reader draws it: mode "solid" and an opacity of 100 after §1.11's repair.
    A placed object answers for itself (§1.10), and an avatar never stops a
    walker (§3.3); both are the reader's to apply, not this function's. An
    object with no faces has nothing to cross whatever this says.
    """
    c = walk_constraint(payload)
    if c == "all":
        # Ruled 2026-11-15 (§1.12): at an opacity of 0 too, an invisible wall.
        return True
    if c == "opaque":
        return payload.get("mode") == "solid" and drawn_opacity(payload) == OPACITY_OPAQUE
    return False


#: §1.10: a key of the `objects` table. A key is an address, written exactly
#: as an `a` ref writes it: "33331:", 64 lowercase hex characters of pubkey,
#: ":", and then the `d`, which is any string, line breaks included. The pubkey
#: is captured, because a reader ignores a key under any pubkey other than the
#: pubkey of the event the table travels in.
_KEY = re.compile(r"33331:([0-9a-f]{64}):(.*)", re.S)


def carried_table(payload: dict, author: str | None) -> dict:
    """§1.10 and §1.9 rule 16: the entries of a payload's objects table.

    The table is the payload's `objects` field. Each key is an address, such
    as "33331:<pubkey hex>:<d>", and each value is the payload of the object
    at that address. This function returns the entries a reader honors, as a
    dict from address to payload.

    Nothing in the field is a reason to reject the payload:
    - An `objects` that is not a JSON object, null included, is no table, and
      the result is empty.
    - A key that is not an address is ignored.
    - A key under any pubkey other than `author` is ignored. `author` is the
      pubkey of the event the table travels in. For an unsigned item in a
      bag, it is the bag's signer.
    - An `author` of None means the reader does not know that pubkey. The
      reader then honors no key at all. It never honors every key instead.

    The values come back unchecked. Each one is checked on its own, when a
    placement draws from it (see draw_carried), and never together with the
    payload that carries it.
    """
    table = payload.get("objects")
    if author is None or not isinstance(table, dict):
        return {}
    out = {}
    for key, entry in table.items():
        m = _KEY.fullmatch(key) if isinstance(key, str) else None
        if not m or m.group(1) != author:
            continue
        out[key] = entry
    return out


def draw_carried(entry: Any) -> dict:
    """§1.10: one carried object from a table, checked by §1.9 on its own.

    If the entry has an `objects` field of its own, that field is ignored. A
    writer flattens every carried object into the root's table, so an object
    in a table carries no table of its own, and a reader does not look for
    one.

    Raises SnoError for an entry that fails §1.9. A failed entry is drawn as
    a placeholder at each placement that names it. It is never a reason to
    reject the payload that carries it.
    """
    if isinstance(entry, dict) and "objects" in entry:
        entry = {k: v for k, v in entry.items() if k != "objects"}
    return validate(entry)


def place_from(address: str, root_table: dict, own_table: dict | None = None) -> tuple[str, Any]:
    """§1.10: where the object that a placement names comes from.

    `root_table` is the table of the root, the object being rendered.
    `own_table` is the table of the event that the placing object travels
    in, when that is a different event: an object the reader fetched as an
    event of its own. Both are dicts from address to payload, as
    carried_table returns them.

    The root's table is looked in first, and then the other table. Only an
    address that neither table holds is fetched. An address that a table
    holds is never fetched, even when its entry fails §1.9: the failed entry
    is drawn as a placeholder instead.

    Returns ("table", payload), ("placeholder", why) or ("fetch", None).
    """
    for table in (root_table, own_table or {}):
        if address in table:
            try:
                return ("table", draw_carried(table[address]))
            except SnoError as e:
                return ("placeholder", str(e))
    return ("fetch", None)


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


def read_eye(value: Any) -> tuple[int, int, int] | None:
    """§1.17: a written eye, three integers of ticks each in -491520..491520, or None.

    None means the automatic eye: absent, null, two or four elements, a
    fraction, a number out of range, a string, a boolean, an object. Never a
    rejection.
    """
    if not isinstance(value, list) or len(value) != 3:
        return None
    if not all(_is_int(c) and -TICK_REACH <= c <= TICK_REACH for c in value):
        return None
    return (value[0], value[1], value[2])


def auto_eye(payload: dict) -> tuple[int, int, int]:
    """§1.17: the automatic eye, in ticks. Validate first.

    One eighth of the avatar's height below its top, in integers:
    top - floor((top - bottom) / 8), over the Y of its own vertices, and 0 on
    X and on Z. At the origin for an avatar with no vertices of its own.
    """
    ticks = expand_ticks(payload.get("ticks"), len(payload["vertices"]))
    ys = [v[1] * TICKS_PER_UNIT + t[1] for v, t in zip(payload["vertices"], ticks)]
    if not ys:
        return (0, 0, 0)
    top, bottom = max(ys), min(ys)
    return (0, top - (top - bottom) // 8, 0)


def drawn_eye(payload: dict) -> tuple[int, int, int]:
    """§1.17: where a viewer wearing this object looks from, in ticks, frame of §2.

    The written eye when it is well formed, else the automatic eye. A written
    eye is in the payload's own frame, as its positions are, so a v1 eye has
    its Z negated with them (positions). It is not held to the avatar's
    shape. Validate first. Never a rejection.
    """
    eye = read_eye(payload.get("eye"))
    if eye is None:
        return auto_eye(payload)
    flip = -1 if payload.get("v") == 1 else 1
    return (eye[0], eye[1], eye[2] * flip)



FACE_MODES = ("path", "upright")


def drawn_face(payload: dict) -> str:
    """§1.18: how a worn avatar turns as it moves: "path" or "upright".

    Exactly one of the two names, lowercase, else "path": absent, null, an
    unknown name (a later revision may add one), another case, a number, a
    boolean, an array or an object. Never a rejection.
    """
    face = payload.get("face")
    return face if isinstance(face, str) and face in FACE_MODES else "path"



# §1.14: motion. A motion's phase is a pure function of the time t in Unix
# seconds, as the reader's clock reads it, so readers whose clocks agree draw
# the same pose at the same moment. Nothing is fetched to animate.

#: §1.14: the motion words' axes, and the bounds every motion keeps.
MOTION_AXES = ("x", "y", "z")
MAX_MOTIONS = 4
MAX_RATE = 2  # cycles per second
MAX_SECONDS = 31_536_000  # b, a year of 365 days
REACH = TICK_REACH  # the position bound of §1.8, in ticks
MAX_LEG_WEIGHT = 1_000


def _rate_ok(c: Any, b: Any) -> bool:
    return (_is_int(c) and _is_int(b) and c != 0 and 1 <= b <= MAX_SECONDS
            and abs(c) <= MAX_RATE * b)


def _motion(m: Any) -> tuple | None:
    """One motion, read; None for one a reader ignores (malformed, unknown, too fast)."""
    if not isinstance(m, list) or not m or not isinstance(m[0], str):
        return None
    word, args = m[0], m[1:]
    ints = lambda xs: all(_is_int(x) for x in xs)
    if word in ("turn", "swing", "slide", "orbit", "lift"):
        size = {"turn": 4, "swing": 5, "slide": 5, "orbit": 5, "lift": 6}[word]
        if len(args) != size or args[0] not in MOTION_AXES or not isinstance(args[0], str):
            return None
        if not ints(args[1:]):
            return None
        c, b, phi = args[-3:]
        if not _rate_ok(c, b) or not 0 <= phi <= 359:
            return None
        if word == "swing" and not 1 <= args[1] <= 180:
            return None
        if word in ("slide", "orbit") and not 1 <= args[1] <= REACH:
            return None
        if word == "lift" and (args[1] == 0 or not -REACH <= args[1] <= REACH or not 0 <= args[2] <= 49):
            return None
        return (word, *args)
    if word == "path":
        if not 5 <= len(args) <= 35 or not ints(args[:3]):
            return None
        c, b, phi = args[:3]
        if not _rate_ok(c, b) or not 0 <= phi <= 359:
            return None
        points = args[3:]
        for p in points:
            if not isinstance(p, list) or len(p) != 4 or not ints(p):
                return None
            if not all(-REACH <= p[a] <= REACH for a in range(3)) or not 1 <= p[3] <= MAX_LEG_WEIGHT:
                return None
        return (word, c, b, phi, *[tuple(p) for p in points])
    return None


def motions_of(payload: dict) -> list[tuple]:
    """§1.14: the motions a reader applies, in order, innermost first.

    Read, never validated: an `anim` that is not a list means none; only its
    first four entries are read; an entry that is malformed, has an unknown
    word, or is faster than two cycles a second is ignored and the
    rest still apply. The payload is never rejected for it.
    """
    value = payload.get("anim")
    if not isinstance(value, list):
        return []
    return [m for m in (_motion(e) for e in value[:MAX_MOTIONS]) if m is not None]


def motion_phase(c: int, b: int, phi: int, t: int | Fraction) -> Fraction:
    """§1.14: u = frac(c × t / b + φ / 360), exactly, in [0, 1).

    t is Unix seconds. Since c is a whole number, reducing t modulo b first
    gives the same phase with smaller numbers.
    """
    t = Fraction(t)
    x = Fraction(c) * (t % b) / b + Fraction(phi, 360)
    return x - (x.numerator // x.denominator)


def _turned(axis: str, degrees: float, p: tuple) -> tuple:
    """p turned about the axis through the origin, right-handed (§2)."""
    r = math.radians(degrees)
    co, si = math.cos(r), math.sin(r)
    x, y, z = p
    if axis == "x":
        return (x, y * co - z * si, y * si + z * co)
    if axis == "y":
        return (x * co + z * si, y, -x * si + z * co)
    return (x * co - y * si, x * si + y * co, z)


def _along(axis: str, d: float) -> tuple:
    return tuple(d if a == axis else 0.0 for a in MOTION_AXES)


def _plus(p: tuple, q: tuple) -> tuple:
    return tuple(p[i] + q[i] for i in range(3))


def lift_share(u: Fraction, dwell: int) -> Fraction:
    """§1.14: how far along its travel a lift is at phase u, from 0 to 1."""
    d = Fraction(dwell, 100)
    ease = lambda x: 3 * x * x - 2 * x * x * x
    if u < d:
        return Fraction(0)
    if u < Fraction(1, 2):
        return ease((u - d) / (Fraction(1, 2) - d))
    if u < Fraction(1, 2) + d:
        return Fraction(1)
    return 1 - ease((u - Fraction(1, 2) - d) / (Fraction(1, 2) - d))


def path_offset(points: tuple, u: Fraction) -> tuple:
    """§1.14: where a path's origin is at phase u, in ticks, exactly.

    Leg i runs from the waypoint before it (for leg 0, the last waypoint) to
    waypoint i, and takes the share w_i / Σw of the cycle.
    """
    total = sum(p[3] for p in points)
    at = u * total
    start = Fraction(0)
    for i, p in enumerate(points):
        if at < start + p[3] or i == len(points) - 1:
            q = points[i - 1]
            f = (at - start) / p[3]
            return tuple(q[a] + (p[a] - q[a]) * f for a in range(3))
        start += p[3]
    raise AssertionError("unreachable")


def move_point(motion: tuple, t: Fraction, p: tuple) -> tuple:
    """§1.14: one motion applied to the point p (ticks, in the object's model frame)."""
    word = motion[0]
    if word == "path":
        _, c, b, phi, *points = motion
        return _plus(p, tuple(float(v) for v in path_offset(tuple(points), motion_phase(c, b, phi, t))))
    c, b, phi = motion[-3:]
    u = motion_phase(c, b, phi, t)
    axis = motion[1]
    wave = math.sin(2 * math.pi * float(u))
    if word == "turn":
        return _turned(axis, 360 * float(u), p)
    if word == "swing":
        return _turned(axis, motion[2] * wave, p)
    if word == "slide":
        return _plus(p, _along(axis, motion[2] * wave))
    if word == "orbit":
        start = _along(MOTION_AXES[(MOTION_AXES.index(axis) + 1) % 3], float(motion[2]))
        return _plus(p, _turned(axis, 360 * float(u), start))
    if word == "lift":
        return _plus(p, _along(axis, motion[2] * float(lift_share(u, motion[3]))))
    raise AssertionError(word)


def animated_point(payload: dict, t: Fraction, p: tuple) -> tuple:
    """§1.14: p moved by every motion of the payload, the first innermost.

    p is a point of the object, or of anything it places, in the object's own
    model frame (§2), in ticks. The result is in the same frame, before the
    object's own placement or pose. A reader honoring reduced motion skips
    this and uses p as written.
    """
    for m in motions_of(payload):
        p = move_point(m, t, p)
    return p



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

#: Appendix A: the tetrahedron as glass, carried in the objects table of a
#: parent that places it twice. Neither object was published. The pubkey is
#: that of the secret key 1, a well-known test key.
TEST_PUBKEY = "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
#: The glass object's address. Its `d` is random hex, which says nothing about
#: the object (§1.10). A reader that predates the objects table asks public
#: relays for every carried address, so the `d` is what those relays see.
GLASS = "33331:" + TEST_PUBKEY + ":5e0a3c91d27f4b68"
APPENDIX_A_CARRIED = {
    "v": 2,
    "name": "two glass tetras",
    "unit": 0,
    "mode": "solid",
    "vertices": [],
    "colors": [],
    "faces": [],
    "refs": [["a", GLASS]],
    "parts": [[0, 0, 0, 0, 0, 0, 0, 0], [0, 360, 0, 0, 0, 90, 0, 0]],
    "objects": {GLASS: {**APPENDIX_A, "name": "glass tetra", "opacity": 40, "constrain": "off"}},
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
        ("rule 11", variant(refs="x")),
        ("rule 11", variant(refs=[["a", "33331:" + "AB" * 32 + ":d"]])),  # uppercase hex
        ("rule 11", variant(refs=[["a", "30023:" + "ab" * 32 + ":d"]])),  # not an object's kind
        ("rule 11", variant(refs=[["e", "cd" * 31]])),                     # short id
        ("rule 11", variant(refs=[["p", "ab" * 32]])),
        ("rule 11", variant(refs=[["e", "cd" * 32, "wss://x", "extra"]])),
        ("rule 12", variant(parts=[[0, 0, 0, 0, 0, 0, 0, 0]])),            # parts without refs
        ("rule 12", variant(refs=[["e", "cd" * 32]], parts=[[1, 0, 0, 0, 0, 0, 0, 0]])),
        ("rule 12", variant(refs=[["e", "cd" * 32]], parts=[[0, 491521, 0, 0, 0, 0, 0, 0]])),  # past the bound
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
    assert validate({**APPENDIX_A, "up": False})["up"] is False
    print("extent repairs: a vertex at 9 units grows the hint from 8 to 9, and extent 0 becomes 8")

    # §1.8: the position bound is 4,096 units (491520 ticks), not 64.
    assert validate({**APPENDIX_A, "extent": 4096})["extent"] == 4096
    assert validate({**APPENDIX_A, "extent": 65})["extent"] == 65
    assert validate({**APPENDIX_A, "extent": 4097})["extent"] == 8
    far = {**APPENDIX_A, "vertices": [[0, 0, 0], [2, 0, 0], [1, 0, 2], [4095, -4096, 0]],
           "ticks": [-3, [119, 0, 0]]}
    assert validate(far)["extent"] == 4096
    reach = {**APPENDIX_A, "refs": [["e", "cd" * 32]]}
    for at in (7681, TICK_REACH, -TICK_REACH):
        assert validate({**reach, "parts": [[0, at, -at, 0, 0, 0, 0, 0]]})["parts"][0][1] == at
    print("the 4,096-unit bound: extent 4096 is kept and 4097 becomes 8; a placement at 491520 ticks validates")

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

    # §1.11 and rule 14: opacity is repaired, never a rejection. Each case is a
    # value in and the percent a reader draws with out; every payload must
    # also validate, because nothing about opacity rejects.
    absent = object()
    repairs = [
        (absent, 100, "absent is fully opaque"),
        (100, 100, "100 is fully opaque (and a publisher omits it)"),
        (50, 50, "a value in range is drawn as given"),
        (10, 10, "ten is drawn as given"),
        (9, 9, "no floor: below ten is drawn as given"),
        (1, 1, "the faintest visible value is drawn as given"),
        (0, 0, "zero is valid: nothing of the object's own is drawn"),
        (101, 100, "above 100 is out of range: opaque"),
        (-5, 100, "negative: opaque"),
        (-1, 100, "minus one: opaque"),
        (50.5, 100, "fractional: opaque"),
        (0.0, 100, "a float zero is not an integer: opaque"),
        ("50", 100, "a string: opaque"),
        (True, 100, "a boolean is not an integer: opaque"),
        (None, 100, "null: opaque, the way a null extent means 8"),
        ([50], 100, "an array: opaque"),
        (False, 100, "false is a boolean, not an integer: opaque"),
        ({}, 100, "an object: opaque"),
        (10 ** 100, 100, "a huge integer is out of range: opaque"),
    ]
    for given, drawn, why in repairs:
        payload = dict(APPENDIX_A) if given is absent else {**APPENDIX_A, "opacity": given}
        accepted = validate(payload)  # raises, and so fails the test, if anything rejected it
        got = drawn_opacity(accepted)
        if got != drawn:
            print(f"  OPACITY: {given!r} drew at {got}, expected {drawn} ({why})")
            failures += 1
    print(f"{len(repairs)} opacity repair cases (rule 14 never rejects), every payload accepted")

    # Why opacity is a field of the object and not a fourth palette channel:
    # a palette entry of four numbers is refused by every reader (rule 8a).
    try:
        validate({**APPENDIX_A, "palette": [[255, 0, 0, 128], [0, 0, 0, 255]]})
        raise AssertionError("a palette entry carrying alpha should be rejected")
    except SnoError as e:
        assert str(e).startswith("rule 8a"), e
    print("alpha in a palette entry is still a rule 8a rejection, which is why opacity is its own field")

    # §1.12 and rule 15: constrain is repaired, never a rejection. Each case is
    # a value in, the constraint a walker meets, and whether this object's
    # faces stop one, for the solid opaque Appendix A object; every payload
    # must also validate, because nothing about the field rejects.
    walls = [
        (absent, "none", False, "absent stops nothing"),
        ("all", "all", True, "all"),
        ("opaque", "opaque", True, "opaque, on a solid opaque object"),
        ("off", "none", False, "off is the author's choice of nothing: a reader reads it as absent"),
        ("OFF", "none", False, "the words are lowercase and exact, off included"),
        ("none", "none", False, "none is not a word the field has"),
        ("ALL", "none", False, "the words are lowercase and exact"),
        ("Opaque", "none", False, "the words are lowercase and exact"),
        (" all", "none", False, "no trimming"),
        ("", "none", False, "the empty string"),
        (1, "none", False, "a number"),
        (True, "none", False, "a boolean"),
        (None, "none", False, "null"),
        (["all"], "none", False, "an array"),
        ({"all": True}, "none", False, "an object"),
    ]
    for given, met, stops, why in walls:
        payload = dict(APPENDIX_A) if given is absent else {**APPENDIX_A, "constrain": given}
        accepted = validate(payload)  # raises, and so fails the test, if anything rejected it
        got = (walk_constraint(accepted), stops_walker(accepted))
        if got != (met, stops):
            print(f"  CONSTRAIN: {given!r} gave {got}, expected {(met, stops)} ({why})")
            failures += 1
    # "opaque" stops a walker only while the object is opaque: see-through
    # objects let one through, judged from the payload alone (§1.12).
    seen_through = [
        ({"opacity": 99}, False, "translucent: through"),
        ({"opacity": 5}, False, "faint: through"),
        ({"opacity": 0}, False, "nothing drawn: through, and \"all\" still holds it (an invisible wall)"),
        ({"mode": "points", "pointsize": 0}, False, "no points drawn: through, and \"all\" still holds it"),
        ({"opacity": 100}, True, "100 is opaque (and a publisher omits it)"),
        ({"opacity": 250}, True, "a malformed opacity is opaque (§1.11), so it holds"),
        ({"mode": "lines"}, False, "lines can be seen through"),
        ({"mode": "points"}, False, "points can be seen through"),
    ]
    for extra, stops, why in seen_through:
        for constraint, want in (("opaque", stops), ("all", True)):
            payload = validate({**APPENDIX_A, **extra, "constrain": constraint})
            if stops_walker(payload) != want:
                print(f"  CONSTRAIN {constraint} with {extra!r}: expected stops={want} ({why})")
                failures += 1
    # §1.12, the authoring side: what a tool shows and publishes. An author's
    # word comes back as found; absent and malformed are not choices, and
    # come back as the default, "opaque". A reader still reads "off" as
    # absent, which the reader cases above check.
    authored = [
        (absent, "opaque", "absent: the author has not chosen, so the default"),
        ("off", "off", "an explicit off survives, so it is never written as absent"),
        ("all", "all", "kept as found"),
        ("opaque", "opaque", "kept as found"),
        ("ALL", "opaque", "malformed is not a choice"),
        ("OFF", "opaque", "malformed is not a choice, even when it looks like off"),
        ("Opaque", "opaque", "malformed is not a choice"),
        (" all", "opaque", "no trimming"),
        ("", "opaque", "the empty string is not a choice"),
        ("none", "opaque", "none is not a word the field has"),
        (1, "opaque", "a number is not a choice"),
        (True, "opaque", "a boolean is not a choice"),
        (False, "opaque", "false is not off"),
        (None, "opaque", "null is not a choice"),
        (["off"], "opaque", "an array is not a choice"),
        ({"off": True}, "opaque", "an object is not a choice"),
    ]
    for given, want, why in authored:
        payload = dict(APPENDIX_A) if given is absent else {**APPENDIX_A, "constrain": given}
        got = authored_constraint(validate(payload))
        if got != want:
            print(f"  AUTHORED CONSTRAIN: {given!r} gave {got!r}, expected {want!r} ({why})")
            failures += 1
        # Whatever a tool writes, a reader must read as the tool showed it:
        # "off" stops nothing, the other two are what they say.
        written = validate({**APPENDIX_A, "constrain": got})
        if walk_constraint(written) != ("none" if got == "off" else got):
            print(f"  AUTHORED CONSTRAIN: {got!r} written is read as {walk_constraint(written)!r}")
            failures += 1
    print(f"{len(walls) + 2 * len(seen_through)} constrain cases (rule 15 never rejects), every payload accepted")
    print(f"{len(authored)} authoring cases (absent and malformed publish as opaque, off survives)")

    # §1.10 and rule 16: the objects a payload carries in its objects table.
    # The field never rejects the payload that carries it. Each entry is
    # checked on its own, when a placement draws from it. An address that the
    # table holds is never fetched.
    carried = validate(dict(APPENDIX_A_CARRIED))
    compact = json.dumps(APPENDIX_A_CARRIED, separators=(",", ":"))
    print(f"Appendix A, carried: validates, {len(compact.encode())} bytes compact")
    table = carried_table(carried, TEST_PUBKEY)
    where, glass = place_from(GLASS, table)
    assert where == "table" and drawn_opacity(glass) == 40 and not stops_walker(glass), (where, glass)
    OTHER = "33331:" + "cd" * 32 + ":tile"
    places = [
        # (what the parent carries, the address placed, the author, where it comes from, why)
        ({GLASS: dict(APPENDIX_A)}, GLASS, TEST_PUBKEY, "table", "an entry the table holds is drawn from it"),
        ({}, GLASS, TEST_PUBKEY, "fetch", "an empty table holds nothing, and is omitted by a publisher"),
        ({GLASS: {**APPENDIX_A, "v": 3}}, GLASS, TEST_PUBKEY, "placeholder", "a bad entry is a placeholder, and still not fetched"),
        ({GLASS: "not an object"}, GLASS, TEST_PUBKEY, "placeholder", "an entry that is not a payload fails rule 1"),
        ({GLASS: {**APPENDIX_A, "objects": {OTHER: dict(APPENDIX_A)}}}, GLASS, TEST_PUBKEY, "table", "an entry's own objects are ignored"),
        ({OTHER: dict(APPENDIX_A)}, OTHER, TEST_PUBKEY, "fetch", "a key under another pubkey is ignored, and the address fetched"),
        ({GLASS: dict(APPENDIX_A)}, GLASS, None, "fetch", "a reader that does not know the author honors no key, never every key"),
        ({"33331:" + "AB" * 32 + ":x": dict(APPENDIX_A)}, "33331:" + "AB" * 32 + ":x", TEST_PUBKEY, "fetch", "a key that is not an address is ignored"),
        ({"glass-tetra": dict(APPENDIX_A)}, "glass-tetra", TEST_PUBKEY, "fetch", "a bare d is not an address"),
        ({"33331:" + TEST_PUBKEY + ":line\nbreak": dict(APPENDIX_A)}, "33331:" + TEST_PUBKEY + ":line\nbreak", TEST_PUBKEY, "table", "a d is any string, line breaks included"),
    ]
    for objects, address, author, want, why in places:
        payload = {**APPENDIX_A_CARRIED, "objects": objects}
        validate(payload)  # raises, and so fails the test, if anything rejected it
        got = place_from(address, carried_table(payload, author))[0]
        if got != want:
            print(f"  CARRIED: {why}: got {got}, expected {want}")
            failures += 1
    assert "objects" not in place_from(GLASS, {GLASS: {**APPENDIX_A, "objects": {}}})[1]
    # A field that is not a table is read as absent, never a rejection.
    for junk in ([], "objects", 7, True, None, [[GLASS, APPENDIX_A]]):
        if carried_table(validate({**APPENDIX_A_CARRIED, "objects": junk}), TEST_PUBKEY) != {}:
            print(f"  CARRIED: objects {junk!r} should read as absent")
            failures += 1
    # The root's table is looked in first. The table of the event that the
    # placing object travels in is looked in second. Only an address that
    # neither table holds is fetched.
    root = {GLASS: {**APPENDIX_A, "name": "root's"}}
    own = {GLASS: {**APPENDIX_A, "name": "own"}, OTHER: dict(APPENDIX_A)}
    assert place_from(GLASS, root, own)[1]["name"] == "root's"
    assert place_from(OTHER, root, own)[0] == "table"
    assert place_from("33331:" + "ef" * 32 + ":x", root, own)[0] == "fetch"
    print(f"{len(places) + 6} carried object cases (rule 16 never rejects the payload that carries it), every payload accepted")

    # §1.14 and rule 17: motion, timed by Unix seconds. T0 is midnight UTC,
    # so every cycle whose b divides 86,400 starts there.
    T0 = 1_795_132_800
    shuttle = ["path", 1, 60, 0, [0, 0, 0, 2], [1920, 0, 0, 2], [1920, 0, 0, 1], [0, 0, 0, 2]]
    poses = [
        # (motions, t, point in ticks, where it is drawn in ticks)
        ([["turn", "y", 1, 6, 0]], T0 + Fraction(3, 2), (120, 0, 0), (0, 0, -120)),
        ([["turn", "y", -1, 6, 0]], T0 + Fraction(3, 2), (120, 0, 0), (0, 0, 120)),
        ([["turn", "y", 2, 1, 0]], T0 + Fraction(1, 8), (120, 0, 0), (0, 0, -120)),
        ([["turn", "y", 1, 31_536_000, 0]], T0, (120, 0, 0), (106.328475, 0, 55.626033)),
        ([["turn", "y", 7, 90, 30]], Fraction("1795171234.567"), (120, 0, 0), (-111.164515, 0, -45.19348)),
        ([["swing", "x", 60, 1, 2, 0]], T0 + Fraction(1, 2), (0, 120, 0), (0, 60, 103.923048)),
        ([["slide", "y", 240, 1, 4, 90]], T0 + Fraction(1, 2), (0, 0, 0), (0, 169.705627, 0)),
        ([["orbit", "y", 480, 1, 8, 0]], T0 + 2, (120, 0, 0), (600, 0, 0)),
        ([["orbit", "z", 480, 1, 8, 0]], T0 + 1, (0, 0, 0), (339.411255, 339.411255, 0)),
        ([["lift", "y", 1440, 25, 1, 20, 0]], T0 + 2, (0, 0, 0), (0, 0, 0)),
        ([["lift", "y", 1440, 25, 1, 20, 0]], T0 + Fraction(15, 2), (0, 0, 0), (0, 720, 0)),
        ([["lift", "y", 1440, 25, 1, 20, 0]], T0 + 12, (0, 0, 0), (0, 1440, 0)),
        ([["lift", "y", 1440, 25, 1, 20, 0]], T0 + 16, (0, 0, 0), (0, 1290.24, 0)),
        ([["lift", "y", -480, 0, 1, 8, 0]], T0 + 1, (0, 0, 0), (0, -75, 0)),
        ([shuttle], T0 + 6, (0, 0, 0), (0, 0, 0)),
        ([shuttle], T0 + 30, (0, 0, 0), (1440, 0, 0)),
        ([shuttle], T0 + 54, (0, 0, 0), (672, 0, 0)),
        ([["turn", "z", 1, 8, 0], ["slide", "x", 120, 1, 2, 0]], T0 + Fraction(5, 2), (120, 0, 0), (74.077988, 110.865544, 0)),
        ([["slide", "x", 120, 1, 2, 0], ["turn", "z", 1, 8, 0]], T0 + Fraction(5, 2), (120, 0, 0), (-91.844024, 221.731088, 0)),
    ]
    for anim, t, p, want in poses:
        got = animated_point(validate({**APPENDIX_A, "anim": anim}), Fraction(t), p)
        if any(abs(got[i] - want[i]) > 5e-7 for i in range(3)):
            print(f"  POSE {anim} at {t}: {got}, expected {want}")
            failures += 1
    # Read, never rejected: what a reader keeps of each `anim`.
    turn = ["turn", "y", 1, 1, 0]
    reads = [
        (absent, 0, "absent: still"),
        ([], 0, "empty: still, and a publisher omits it"),
        (None, 0, "null: still"),
        ("turn", 0, "not a list: still"),
        ({"turn": 1}, 0, "an object: still"),
        ([turn], 1, "one motion"),
        ([turn] * 5, 4, "only the first four entries are read"),
        ([["spin", "y", 1, 1, 0], turn], 1, "an unknown word is ignored, the rest apply"),
        ([["bob", "y", 12, 1, 1, 0]], 0, "bob is not a motion word: a bob is a slide on y"),
        ([["turn", "Y", 1, 1, 0]], 0, "axis letters are lowercase"),
        ([["turn", "w", 1, 1, 0]], 0, "no such axis"),
        ([["turn", "y", 1, 1]], 0, "every integer is written, no default omitted"),
        ([["turn", "y", 1, 1, 0, 0]], 0, "one integer too many"),
        ([["turn", "y", 1.0, 1, 0]], 0, "a float is not an integer"),
        ([["turn", "y", True, 1, 0]], 0, "a boolean is not an integer"),
        ([["turn", "y", 0, 1, 0]], 0, "no cycles is malformed"),
        ([["turn", "y", 1, 0, 0]], 0, "no seconds is malformed"),
        ([["turn", "y", 1, 1, 360]], 0, "a phase past 359"),
        ([["turn", "y", 2, 1, 0]], 1, "two cycles a second is the fastest allowed"),
        ([["turn", "y", 3, 1, 0]], 0, "faster is held still"),
        ([["turn", "y", 21, 10, 0]], 0, "2.1 cycles a second is held still"),
        ([["turn", "y", -20, 10, 0]], 1, "negative cycles turn backward, at the same limit"),
        ([["turn", "y", 1, 31_536_000, 0]], 1, "once a year is the slowest allowed"),
        ([["turn", "y", 1, 31_536_001, 0]], 0, "seconds past a year"),
        ([["swing", "x", 0, 1, 1, 0]], 0, "a swing of no reach"),
        ([["swing", "x", 181, 1, 1, 0]], 0, "a swing past 180 degrees"),
        ([["slide", "y", -12, 1, 1, 0]], 0, "a slide's reach is positive"),
        ([["orbit", "y", 491521, 1, 1, 0]], 0, "an orbit past the position bound"),
        ([["orbit", "y", 7681, 1, 1, 0]], 1, "an orbit past the former 64-unit bound"),
        ([["lift", "y", 0, 25, 1, 1, 0]], 0, "a lift that goes nowhere"),
        ([["lift", "y", -491520, 49, 1, 1, 0]], 1, "a lift down the whole bound, the longest dwell"),
        ([["lift", "y", 120, 50, 1, 1, 0]], 0, "a dwell of half the cycle at each stop leaves no travel"),
        ([["path", 1, 1, 0, [0, 0, 0, 1]]], 0, "a path of one waypoint"),
        ([["path", 1, 1, 0] + [[0, 0, 0, 1]] * 32], 1, "32 waypoints"),
        ([["path", 1, 1, 0] + [[0, 0, 0, 1]] * 33], 0, "33 waypoints"),
        ([["path", 1, 1, 0, [0, 0, 0, 1], [120, 0, 0, 0]]], 0, "a leg of no weight"),
        ([["path", 1, 1, 0, [0, 0, 0, 1], [120, 0, 0]]], 0, "a waypoint without its weight"),
        ([shuttle, "junk", turn], 2, "a malformed entry is ignored, the rest apply"),
    ]
    for given, want, why in reads:
        payload = dict(APPENDIX_A) if given is absent else {**APPENDIX_A, "anim": given}
        got = len(motions_of(validate(payload)))
        if got != want:
            print(f"  ANIM {given!r}: read {got} motions, expected {want} ({why})")
            failures += 1
    print(f"{len(poses)} pose cases, {len(reads)} anim read cases (rule 17 never rejects)")

    # §1.15, §1.16 and rules 18 and 19: pointsize and glow are read, never a
    # rejection. Each case is a value in and what a reader draws out, for the
    # Appendix A object in points mode; every payload must also validate.
    points = {**APPENDIX_A, "mode": "points"}
    sizes = [
        (absent, None, "absent is the reader's own size"),
        (48, 48, "a size in range"),
        (1, 1, "the smallest point"),
        (TICK_REACH, TICK_REACH, "the 4,096-unit bound"),
        (7681, 7681, "past the former 64-unit bound"),
        (0, 0, "zero is valid: no points"),
        (-1, None, "negative: the reader's own size"),
        (TICK_REACH + 1, None, "past the bound: the reader's own size"),
        (48.5, None, "fractional"),
        (48.0, None, "a float is not an integer"),
        ("48", None, "a string"),
        (True, None, "a boolean"),
        (None, None, "null"),
        ([48], None, "an array"),
        ({}, None, "an object"),
    ]
    for given, want, why in sizes:
        payload = dict(points) if given is absent else {**points, "pointsize": given}
        got = drawn_pointsize(validate(payload))
        if got != want:
            print(f"  POINTSIZE: {given!r} drew {got}, expected {want} ({why})")
            failures += 1
    glows = [
        (absent, None, "absent is no glow"),
        (["fog", 240, 35], ("fog", 240, 35), "a fog"),
        (["light", 1, 1], ("light", 1, 1), "the smallest light"),
        (["light", TICK_REACH, 100], ("light", TICK_REACH, 100), "the largest light"),
        (["Light", 240, 35], None, "the words are lowercase and exact"),
        (["FOG", 240, 35], None, "the words are lowercase and exact"),
        (["smog", 240, 35], None, "smog is not a word the field has"),
        (["haze", 240, 35], None, "haze is not a word the field has"),
        ([1, 240, 35], None, "a word that is not a string"),
        ([None, 240, 35], None, "a word that is null"),
        (["fog", 0, 35], None, "a radius of nothing"),
        (["fog", -240, 35], None, "a negative radius"),
        (["fog", True, 35], None, "a boolean radius"),
        (["fog", TICK_REACH + 1, 35], None, "a radius past the bound"),
        (["fog", 240.5, 35], None, "a fractional radius"),
        (["fog", "240", 35], None, "a radius as a string"),
        (["fog", 240, 0], None, "a glow strength of nothing"),
        (["fog", 240, 101], None, "a glow strength past 100"),
        (["fog", 240, 35.0], None, "a float glow strength"),
        (["fog", 240, True], None, "a boolean glow strength"),
        (["fog", 240], None, "two elements"),
        (["fog", 240, 35, 0], None, "four elements"),
        ([], None, "empty"),
        ({"style": "fog", "radius": 240, "strength": 35}, None, "an object, not an array"),
        ("fog", None, "a string"),
        (None, None, "null"),
    ]
    for given, want, why in glows:
        payload = dict(points) if given is absent else {**points, "glow": given}
        got = drawn_glow(validate(payload))
        if got != want:
            print(f"  GLOW: {given!r} drew {got}, expected {want} ({why})")
            failures += 1
    # Kept, not drawn, outside points mode; and opacity never reaches a glow.
    both = {**APPENDIX_A, "pointsize": 48, "glow": ["light", 240, 60]}
    for mode in ("solid", "lines"):
        kept = validate({**both, "mode": mode})
        if drawn_pointsize(kept) is not None or drawn_glow(kept) is not None:
            print(f"  POINTSIZE/GLOW drawn in {mode} mode")
            failures += 1
    faint = validate({**both, "mode": "points", "opacity": 40, "glow": ["fog", 240, 50]})
    if drawn_opacity(faint) != 40 or drawn_glow(faint) != ("fog", 240, 50):
        print("  GLOW: opacity reached the glow strength")
        failures += 1
    unseen = validate({**both, "mode": "points", "opacity": 0})
    if drawn_opacity(unseen) != 0 or drawn_glow(unseen) != ("light", 240, 60):
        print("  GLOW: an object at opacity 0 lost its glow")
        failures += 1
    print(f"{len(sizes)} pointsize and {len(glows)} glow read cases (rules 18 and 19 never reject)")

    # §1.17 and rule 20: eye is read, never a rejection. The Appendix A
    # tetrahedron stands 0 to 2 units tall, so its automatic eye is
    # 240 - floor(240 / 8) = 210 ticks up; every payload must also validate.
    eyes = [
        (absent, (0, 210, 0), "absent is the automatic eye"),
        ([0, 159, 0], (0, 159, 0), "a written eye"),
        ([0, 0, 0], (0, 0, 0), "the origin is a choice, not absent"),
        ([0, 600, 0], (0, 600, 0), "above the shape: not held to it"),
        ([-12, 30, -480], (-12, 30, -480), "behind and to one side: not held to it"),
        ([TICK_REACH, -TICK_REACH, 0], (TICK_REACH, -TICK_REACH, 0), "the 4,096-unit bound"),
        ([0, TICK_REACH + 1, 0], (0, 210, 0), "past the bound"),
        ([0, -TICK_REACH - 1, 0], (0, 210, 0), "past the bound below"),
        ([[0], 159, 0], (0, 210, 0), "a nested element"),
        ([0, 159.5, 0], (0, 210, 0), "fractional"),
        ([0, 159.0, 0], (0, 210, 0), "a float is not an integer"),
        ([0, "159", 0], (0, 210, 0), "a string"),
        ([0, True, 0], (0, 210, 0), "a boolean"),
        ([0, None, 0], (0, 210, 0), "null inside"),
        ([0, 159], (0, 210, 0), "two elements"),
        ([0, 159, 0, 0], (0, 210, 0), "four elements"),
        ([], (0, 210, 0), "empty"),
        ({"x": 0, "y": 159, "z": 0}, (0, 210, 0), "an object, not an array"),
        ("0,159,0", (0, 210, 0), "a string"),
        (None, (0, 210, 0), "null"),
    ]
    for given, want, why in eyes:
        payload = dict(APPENDIX_A) if given is absent else {**APPENDIX_A, "eye": given}
        got = drawn_eye(validate(payload))
        if got != want:
            print(f"  EYE: {given!r} read {got}, expected {want} ({why})")
            failures += 1
    autos = [
        ([[0, 0, 0], [0, 2, 0], [1, 0, 0]], None, (0, 210, 0), "built from its origin up to two units"),
        ([[0, 0, 0], [0, 1, 0], [1, 1, 0]], [[0, 96, 0], [0, 48, 0], [0, 0, 0]], (0, 159, 0), "a ship 0.8 to 1.4 units up"),
        ([[0, -1, 0], [0, 1, 0], [1, 0, 0]], None, (0, 90, 0), "centered, one unit each way"),
        ([[0, 0, 0], [0, 0, 0], [1, 0, 0]], [[0, 0, 0], [0, 10, 0], [0, 0, 0]], (0, 9, 0), "ten ticks tall: the eighth rounds down"),
        ([[0, -2, 0], [0, -1, 0], [1, -2, 0]], None, (0, -135, 0), "wholly below its origin"),
    ]
    for verts, ticks, want, why in autos:
        payload = {**APPENDIX_A, "vertices": verts, "colors": [238, 235, 239], "faces": [[0, 1, 2]]}
        if ticks is not None:
            payload["ticks"] = ticks
        got = drawn_eye(validate(payload))
        if got != want:
            print(f"  EYE AUTO: {why}: {got}, expected {want}")
            failures += 1
    parts_only = validate({**APPENDIX_A, "vertices": [], "colors": [], "faces": [], "refs": [["a", GLASS]], "parts": [[0, 0, 0, 0, 0, 0, 0, 0]]})
    if drawn_eye(parts_only) != (0, 0, 0):
        print("  EYE AUTO: an avatar with no vertices of its own is not at its origin")
        failures += 1
    v1 = {**APPENDIX_A, "v": 1, "colors": [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1]], "eye": [0, 30, 120]}
    if drawn_eye(validate(v1)) != (0, 30, -120):
        print("  EYE: a v1 eye is not negated in Z with its positions")
        failures += 1
    v1_auto = {**APPENDIX_A, "v": 1, "colors": [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1]]}
    if drawn_eye(validate(v1_auto)) != (0, 210, 0):
        print("  EYE AUTO: a v1 avatar's automatic eye is not on its origin's line")
        failures += 1
    print(f"{len(eyes)} eye read cases and {len(autos) + 3} automatic or frame cases (rule 20 never rejects)")

    # §1.18 and rule 21: face is read, never a rejection. Only the two names,
    # exact and lowercase, are read as written; everything else is "path".
    faces = [
        (absent, "path", "absent turns along its path"),
        ("path", "path", "path written"),
        ("upright", "upright", "upright"),
        ("Upright", "path", "another case"),
        ("UPRIGHT", "path", "upper case"),
        (" upright", "path", "a space"),
        ("", "path", "empty"),
        ("level", "path", "a name a later revision may add"),
        (1, "path", "a number"),
        (True, "path", "a boolean"),
        (["upright"], "path", "an array"),
        ({"face": "upright"}, "path", "an object"),
        (None, "path", "null"),
    ]
    for given, want, why in faces:
        payload = dict(APPENDIX_A) if given is absent else {**APPENDIX_A, "face": given}
        got = drawn_face(validate(payload))
        if got != want:
            print(f"  FACE: {given!r} read {got!r}, expected {want!r} ({why})")
            failures += 1
    print(f"{len(faces)} face read cases (rule 21 never rejects)")

    if failures:
        raise SystemExit(1)
    print("OK")


if __name__ == "__main__":
    _self_test()
