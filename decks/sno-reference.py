"""Reference implementation of DECK-0004: SNO (Simple Nostr Objects).

This is the normative validation of DECK-0004 §1.9 written out as code, plus
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
from fractions import Fraction
from typing import Any, Iterator

# DECK-0004 §1.8. These are the whole of the size policy.
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
    """A payload that DECK-0004 §1.9 rejects. The message names the rule."""


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


def validate(payload: Any) -> dict:
    """§1.9, in order. Returns the payload on success, raises SnoError on failure.

    A payload is accepted whole or not at all: a face index past the end of the
    vertex list is undefined behaviour inside most graphics libraries, so there
    is no partial render to degrade to.
    """
    if not isinstance(payload, dict):
        raise SnoError("rule 1: payload is not a JSON object")

    # 1. version and type
    if payload.get("v") != 1 or isinstance(payload.get("v"), bool):
        raise SnoError("rule 1: v must be 1")
    if payload.get("type") != "shard":
        raise SnoError('rule 1: type must be "shard"')

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
    for c in colors:
        if not (isinstance(c, list) and len(c) == 3 and all(_is_num(x) for x in c)):
            raise SnoError("rule 6: a color is not three numbers")

    # 7. ticks
    ticks = expand_ticks(payload.get("ticks"), len(vertices))

    # 8. faces
    n = len(vertices)
    for f in faces:
        if not (isinstance(f, list) and len(f) == 3 and all(_is_int(i) for i in f)):
            raise SnoError("rule 8: a face is not three integers")
        if not all(0 <= i < n for i in f):
            raise SnoError(f"rule 8: a face indexes a vertex outside 0..{n - 1}")
        if len(set(f)) != 3:
            raise SnoError("rule 8: a face repeats a vertex")

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
    """Exact positions in model units, as Fractions. Validate first.

    Exact rather than float: the whole point of the lattice is that two objects
    authored to meet actually meet, so the reference implementation refuses to
    introduce rounding that a renderer would then have to live with.
    """
    ticks = expand_ticks(payload.get("ticks"), len(payload["vertices"]))
    for v, t in zip(payload["vertices"], ticks):
        yield tuple(  # type: ignore[misc]
            Fraction(v[a] * TICKS_PER_UNIT + t[a], TICKS_PER_UNIT) for a in range(3)
        )


def clamp_color(c: list) -> list[float]:
    """§1.3: channels clamp to 0..1, and a non-finite value is 0."""
    out = []
    for x in c:
        f = float(x)
        out.append(0.0 if f != f or f in (float("inf"), float("-inf")) else min(1.0, max(0.0, f)))
    return out


# --------------------------------------------------------------------------
# Self-test
# --------------------------------------------------------------------------

APPENDIX_A = {
    "v": 1,
    "type": "shard",
    "name": "tetra",
    "unit": 0,
    "extent": 8,
    "mode": "solid",
    "vertices": [[0, 0, 0], [2, 0, 0], [1, 0, 2], [1, 2, 1]],
    "ticks": [-4],
    "colors": [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1]],
    "faces": [[0, 1, 2], [0, 1, 3], [1, 2, 3], [0, 2, 3]],
}


def _rejections() -> list[tuple[str, dict]]:
    """One rejection per numbered rule, so a port can check the same table."""
    def variant(**over: Any) -> dict:
        out = dict(APPENDIX_A)
        out.update(over)
        return out

    return [
        ("rule 1", variant(v=2)),
        ("rule 1", variant(type="model")),
        ("rule 2", variant(colors=[[1, 0, 0]])),
        ("rule 3", variant(vertices=[[0, 0, 0]] * 513, colors=[[0, 0, 0]] * 513, ticks=[-513], faces=[])),
        ("rule 4", variant(mode="wireframe")),
        ("rule 5", variant(unit=85)),
        ("rule 5", variant(unit=1.5)),
        ("rule 6", variant(vertices=[[0, 0, 0], [2, 0, 0], [1, 0, 2], [1, 2, 1.5]])),
        ("rule 7", variant(ticks=[-3])),
        ("rule 7", variant(ticks=[[0, 0, 120], -3])),
        ("rule 7", variant(ticks=[4])),
        ("rule 8", variant(faces=[[0, 1, 9]])),
        ("rule 8", variant(faces=[[0, 1, 1]])),
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

    assert clamp_color([2.0, -1.0, float("nan")]) == [1.0, 0.0, 0.0]
    print("colors clamp to 0..1 and a non-finite channel is 0")

    if failures:
        raise SystemExit(1)
    print("OK")


if __name__ == "__main__":
    _self_test()
