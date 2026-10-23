"""Conformance vectors for DECK-0003 (SNO), checked against the reference.

sno-vectors.json holds events that carry SNO objects, each with the result
sno-reference.py gives for it. This script recomputes every result from the
reference and compares, so it fails when the reference and the vectors part
ways, whichever of the two moved.

    python3 sno-vectors.py           check every vector; exit 1 on any mismatch
    python3 sno-vectors.py --write   recompute every `expected` from the reference

To add a vector, write its `id`, `description`, `sections`, `strict` and
`event` (and `palette_event` if it needs one) into sno-vectors.json, run with
--write, and read the diff before committing it: the point of a vector is
that a person agreed with what the reference said.

Standard library only, like sno-reference.py.
"""

from __future__ import annotations

import importlib.util
import json
import os
import sys
from fractions import Fraction
from typing import Any

HERE = os.path.dirname(os.path.abspath(__file__))
VECTORS = os.path.join(HERE, "sno-vectors.json")

# The reference's file name has a hyphen in it, so it is loaded by path.
_spec = importlib.util.spec_from_file_location("sno_reference", os.path.join(HERE, "sno-reference.py"))
ref = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ref)  # type: ignore[union-attr]


def expected_for(vector: dict) -> dict:
    """The result sno-reference.py gives for one vector's event."""
    palette_event = vector.get("palette_event")
    try:
        read = ref.read_event(vector["event"], palette_event)
    except ref.SnoError as e:
        message = str(e)
        return {"valid": False, "rule": message.split(":", 1)[0], "error": message}

    if read["status"] != "object":
        return {"valid": True, "status": read["status"]}

    p = read["payload"]
    out: dict[str, Any] = {
        "valid": True,
        "status": "object",
        "v": p["v"],
        "mode": p["mode"],
        "unit": p["unit"],
        "extent": p["extent"],
        "vertex_count": len(p["vertices"]),
        "face_count": len(p["faces"]),
        "palette_length": len(ref.resolve_palette(p.get("palette"), palette_event)),
        "color_form": "literal" if p["v"] == 1 else "palette",
    }
    if vector.get("detail") == "summary":
        return out

    remainders = ref.expand_ticks(p.get("ticks"), len(p["vertices"]))
    positions = list(ref.positions(p))
    out["remainders"] = remainders
    out["positions_ticks"] = [[int(c * ref.TICKS_PER_UNIT) for c in pt] for pt in positions]
    out["positions"] = [[str(Fraction(c)) for c in pt] for pt in positions]
    out["faces"] = [list(f) for f in p["faces"]]
    out["colors"] = ref.vertex_colors(p, palette_event)
    out["face_colors"] = ref.face_colors(p, palette_event)
    out["fronts"] = [list(n) for n in ref.fronts(p)]
    out["refs"] = p.get("refs", [])
    out["parts"] = p.get("parts", [])
    return out


def _normal(x: Any) -> Any:
    """What a value looks like after a trip through JSON, for comparison."""
    return json.loads(json.dumps(x))


def _dump(x: Any, depth: int = 0) -> str:
    """JSON with one key per line and every list of plain values on one line,
    so a vertex reads as [1, 2, 1] and a diff shows which vector changed."""
    pad, inner = " " * depth, " " * (depth + 1)
    if isinstance(x, dict):
        if not x:
            return "{}"
        rows = [f"{inner}{json.dumps(k, ensure_ascii=False)}: {_dump(v, depth + 1)}" for k, v in x.items()]
        return "{\n" + ",\n".join(rows) + "\n" + pad + "}"
    if isinstance(x, list):
        if all(not isinstance(e, (dict, list)) for e in x):
            return json.dumps(x, ensure_ascii=False)
        if all(isinstance(e, list) and all(not isinstance(f, (dict, list)) for f in e) for e in x):
            return "[" + ", ".join(json.dumps(e, ensure_ascii=False) for e in x) + "]"
        return "[\n" + ",\n".join(inner + _dump(e, depth + 1) for e in x) + "\n" + pad + "]"
    return json.dumps(x, ensure_ascii=False)


def _check_shape(doc: dict) -> list[str]:
    problems = []
    if not isinstance(doc.get("version"), int):
        problems.append("the file has no integer `version`")
    seen = set()
    for i, v in enumerate(doc.get("vectors", [])):
        where = v.get("id", f"#{i}")
        if where in seen:
            problems.append(f"{where}: duplicate id")
        seen.add(where)
        for key in ("id", "description", "sections", "strict", "event"):
            if key not in v:
                problems.append(f"{where}: missing `{key}`")
        if not isinstance(v.get("strict"), bool):
            problems.append(f"{where}: `strict` is not a boolean")
        if v.get("strict") is False and not v.get("note"):
            problems.append(f"{where}: a vector that is not strict needs a `note` saying what latitude the spec gives")
        if not isinstance(v.get("event", {}).get("content"), str):
            problems.append(f"{where}: the event's content is not a string")
    return problems


def main(argv: list[str]) -> int:
    with open(VECTORS, encoding="utf-8") as fh:
        doc = json.load(fh)

    problems = _check_shape(doc)
    if problems:
        for p in problems:
            print(f"  SHAPE: {p}")
        return 1

    if "--write" in argv:
        for v in doc["vectors"]:
            v["expected"] = expected_for(v)
        with open(VECTORS, "w", encoding="utf-8") as fh:
            fh.write(_dump(doc) + "\n")
        print(f"wrote {len(doc['vectors'])} vectors")
        return 0

    failures = 0
    for v in doc["vectors"]:
        got = _normal(expected_for(v))
        if got != v.get("expected"):
            failures += 1
            want = v.get("expected", {})
            keys = sorted(k for k in set(got) | set(want) if got.get(k) != want.get(k))
            print(f"  MISMATCH {v['id']}: {', '.join(keys) or 'expected is missing'}")
    valid = sum(1 for v in doc["vectors"] if v.get("expected", {}).get("valid"))
    strict = sum(1 for v in doc["vectors"] if v["strict"])
    total = len(doc["vectors"])
    print(f"{total} vectors ({valid} valid, {total - valid} invalid; {strict} strict), {failures} wrong")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
