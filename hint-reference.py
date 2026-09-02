#!/usr/bin/env python3
"""CYBERSPACE_V2 section 7.7: reference hint construction (stdlib only).

A hint is the hider's optional, coarse statement of where an encrypted content
event (kind 33330, section 8.6) can be found: an aligned box, one height per
axis, on one plane. This file is the executable statement of section 7.7 and
the sector rule it adds to section 10. Running it checks the properties those
sections claim:

  1. the hint coordinate is the aligned base of the box, so every point in
     the box yields the same hint (canonical form)
  2. the bag's own region (height h) lies inside the box exactly when every
     hint height is at least h and the bases agree above H (containment)
  3. sector tags appear for exactly the axes whose hint height is 30 or less,
     and S appears only when all three do (section 10)
  4. the seeker's work is 2^((Hx-h)+(Hy-h)+(Hz-h)) region-key derivations
     at height h, and does not depend on where the seeker stands
  5. malformed hints (bad hex, non-aligned base, a height below h or above
     85, a non-integer) are treated as absent, never as a reason to reject
     the bag
  6. the plane bit survives the round trip, so a hint names one plane

Golden vectors at the bottom lock the construction for other implementations.
"""
import json

AXIS_BITS = 85
AXIS_MAX = (1 << AXIS_BITS) - 1
SECTOR_SHIFT = 30                       # section 10: a sector is 2^30 Gibsons per axis
HINT_TAG = "hint"


# --- section 2.3, verbatim semantics -------------------------------------------

def xyz_to_coord(x: int, y: int, z: int, plane: int = 0) -> int:
    coord = plane & 1
    for i in range(AXIS_BITS):
        coord |= ((z >> i) & 1) << (1 + i * 3)
        coord |= ((y >> i) & 1) << (2 + i * 3)
        coord |= ((x >> i) & 1) << (3 + i * 3)
    return coord


def coord_to_xyz(coord: int) -> tuple:
    plane = coord & 1
    x = y = z = 0
    for i in range(AXIS_BITS):
        z |= ((coord >> (1 + i * 3)) & 1) << i
        y |= ((coord >> (2 + i * 3)) & 1) << i
        x |= ((coord >> (3 + i * 3)) & 1) << i
    return (x, y, z, plane)


def coord_hex(coord: int) -> str:
    return format(coord, "064x")


# --- section 7.7: building a hint -----------------------------------------------

def aligned_base(v: int, height: int) -> int:
    """The base of the aligned region of side 2^height containing v (sections 4.5, 7.4)."""
    return (v >> height) << height


def hint_tags(x: int, y: int, z: int, plane: int, heights: tuple) -> list:
    """The tags a hider adds to a bag: the hint itself plus the section 10 sector
    tags for every axis whose hint height fixes the sector. Any point in the box
    may be passed; the hint carries the aligned base."""
    hx, hy, hz = heights
    bx, by, bz = aligned_base(x, hx), aligned_base(y, hy), aligned_base(z, hz)
    tags = [[HINT_TAG, coord_hex(xyz_to_coord(bx, by, bz, plane)), str(hx), str(hy), str(hz)]]
    known = {}
    for name, base, h in (("X", bx, hx), ("Y", by, hy), ("Z", bz, hz)):
        if h <= SECTOR_SHIFT:
            known[name] = str(base >> SECTOR_SHIFT)
            tags.append([name, known[name]])
    if len(known) == 3:
        tags.append(["S", f"{known['X']}-{known['Y']}-{known['Z']}"])
    return tags


def candidates(bag_height: int, heights: tuple) -> int:
    """Region-key derivations at bag_height needed to sweep the box (section 7.7)."""
    return 1 << sum(h - bag_height for h in heights)


# --- section 7.7: reading a hint ------------------------------------------------

def parse_hint(tags: list, bag_height: int):
    """The hinted box as (bx, by, bz, plane, (Hx, Hy, Hz)), or None when the bag
    carries no well-formed hint. A malformed hint is absent, not an error: the
    bag itself stays valid (section 7.7)."""
    hint = next((t for t in tags if t and t[0] == HINT_TAG), None)
    if hint is None or len(hint) != 5:
        return None
    try:
        if len(hint[1]) != 64:
            return None
        coord = int(hint[1], 16)
        heights = tuple(int(h) for h in hint[2:5])
    except ValueError:
        return None
    if any(str(h) != s for h, s in zip(heights, hint[2:5])):
        return None                      # "07", "+5", " 5": not canonical base-10
    if any(h < bag_height or h > AXIS_BITS for h in heights):
        return None
    if coord >> 256:
        return None
    x, y, z, plane = coord_to_xyz(coord)
    for v, h in zip((x, y, z), heights):
        if h < AXIS_BITS and v & ((1 << h) - 1):
            return None                  # not the aligned base
        if h == AXIS_BITS and v:
            return None                  # a whole-axis hint has base 0
    return (x, y, z, plane, heights)


def contains(hint, x: int, y: int, z: int, plane: int, bag_height: int) -> bool:
    """Does the bag's region at bag_height lie inside the hinted box?"""
    bx, by, bz, hplane, (hx, hy, hz) = hint
    if plane != hplane:
        return False
    return (aligned_base(x, hx) == bx and aligned_base(y, hy) == by
            and aligned_base(z, hz) == bz and min(hx, hy, hz) >= bag_height)


# --- checks ---------------------------------------------------------------------

LONDON = "c492492492492492492492edf5bee7267451c787d95ba4d7840c76d1e33c9940"   # section 9.8


def check() -> None:
    lx, ly, lz, lplane = coord_to_xyz(int(LONDON, 16))
    assert lplane == 0 and coord_hex(xyz_to_coord(lx, ly, lz, 0)) == LONDON

    # 1. canonical form: any point in the box gives the same hint
    h, heights = 5, (11, 11, 11)
    a = hint_tags(lx, ly, lz, 0, heights)
    b = hint_tags(lx ^ 0x3FF, ly | 0x7FF, lz & ~0x7FF, 0, heights)
    assert a == b

    # 2. containment
    hint = parse_hint(a, h)
    assert hint is not None
    assert contains(hint, lx, ly, lz, 0, h)
    assert not contains(hint, lx + (1 << 11), ly, lz, 0, h)      # next box along X
    assert not contains(hint, lx, ly, lz, 1, h)                  # other plane
    assert not contains(hint, lx, ly, lz, 0, 12)                 # region larger than the box

    # 3. sector tags: exactly the axes with H <= 30, S only when all three
    names = [t[0] for t in a]
    assert names == [HINT_TAG, "X", "Y", "Z", "S"]
    partial = hint_tags(lx, ly, lz, 0, (12, 40, 12))
    assert [t[0] for t in partial] == [HINT_TAG, "X", "Z"]
    whole = hint_tags(lx, ly, lz, 0, (85, 85, 85))
    assert [t[0] for t in whole] == [HINT_TAG]
    assert whole[0][1] == coord_hex(0)

    # 4. the seeker's work
    assert candidates(5, (11, 11, 11)) == 1 << 18
    assert candidates(5, (5, 14, 14)) == 1 << 18                 # a 2D hunt: X exact
    assert candidates(5, (5, 5, 5)) == 1                         # exact: a destination
    assert candidates(8, (12, 40, 12)) == 1 << 40                # a hopeless hint

    # 5. malformed hints are absent, not fatal
    assert parse_hint([[HINT_TAG, a[0][1], "4", "11", "11"]], 5) is None      # H below h
    assert parse_hint([[HINT_TAG, a[0][1], "11", "11", "86"]], 5) is None     # above 85
    assert parse_hint([[HINT_TAG, a[0][1], "11", "11"]], 5) is None           # missing height
    assert parse_hint([[HINT_TAG, a[0][1], "11", "11", "011"]], 5) is None    # not canonical
    assert parse_hint([[HINT_TAG, "zz" * 32, "11", "11", "11"]], 5) is None   # bad hex
    assert parse_hint([[HINT_TAG, LONDON, "11", "11", "11"]], 5) is None      # not aligned
    assert parse_hint([["d", "00" * 32]], 5) is None                          # no hint at all
    assert parse_hint(a, 11) is not None and parse_hint(a, 12) is None

    # 6. the plane survives
    idea = hint_tags(lx, ly, lz, 1, heights)
    assert coord_to_xyz(int(idea[0][1], 16))[3] == 1
    assert idea[1:] == a[1:]                                     # same sectors, other plane


def vectors() -> dict:
    lx, ly, lz, _ = coord_to_xyz(int(LONDON, 16))
    ix, iy, iz = (1 << 84) + 12345, 3 * (1 << 80) + 777, AXIS_MAX - 4242
    return {
        "london_h5_box11": {"point": LONDON, "plane": 0, "bag_height": 5, "heights": [11, 11, 11],
                            "tags": hint_tags(lx, ly, lz, 0, (11, 11, 11)), "candidates_log2": 18},
        "london_h5_x_exact": {"point": LONDON, "plane": 0, "bag_height": 5, "heights": [5, 14, 14],
                              "tags": hint_tags(lx, ly, lz, 0, (5, 14, 14)), "candidates_log2": 18},
        "ideaspace_h8_y_open": {"point": coord_hex(xyz_to_coord(ix, iy, iz, 1)), "plane": 1, "bag_height": 8,
                                "heights": [12, 40, 12], "tags": hint_tags(ix, iy, iz, 1, (12, 40, 12)),
                                "candidates_log2": 40},
    }


GOLDEN = {
    "london_h5_box11": {
        "point": "c492492492492492492492edf5bee7267451c787d95ba4d7840c76d1e33c9940",
        "plane": 0,
        "bag_height": 5,
        "heights": [
            11,
            11,
            11
        ],
        "tags": [
            [
                "hint",
                "c492492492492492492492edf5bee7267451c787d95ba4d7840c76d000000000",
                "11",
                "11",
                "11"
            ],
            [
                "X",
                "18014398541305938"
            ],
            [
                "Y",
                "18014398549232983"
            ],
            [
                "Z",
                "18014398509410999"
            ],
            [
                "S",
                "18014398541305938-18014398549232983-18014398509410999"
            ]
        ],
        "candidates_log2": 18
    },
    "london_h5_x_exact": {
        "point": "c492492492492492492492edf5bee7267451c787d95ba4d7840c76d1e33c9940",
        "plane": 0,
        "bag_height": 5,
        "heights": [
            5,
            14,
            14
        ],
        "tags": [
            [
                "hint",
                "c492492492492492492492edf5bee7267451c787d95ba4d7840c749041240000",
                "5",
                "14",
                "14"
            ],
            [
                "X",
                "18014398541305938"
            ],
            [
                "Y",
                "18014398549232983"
            ],
            [
                "Z",
                "18014398509410999"
            ],
            [
                "S",
                "18014398541305938-18014398549232983-18014398509410999"
            ]
        ],
        "candidates_log2": 18
    },
    "ideaspace_h8_y_open": {
        "point": "a4b64924924924924924924924924924924924924924924924924d84b60d9c8f",
        "plane": 1,
        "bag_height": 8,
        "heights": [
            12,
            40,
            12
        ],
        "tags": [
            [
                "hint",
                "a4b64924924924924924924924924924924924924924924924924d8000000001",
                "12",
                "40",
                "12"
            ],
            [
                "X",
                "18014398509481984"
            ],
            [
                "Z",
                "36028797018963967"
            ]
        ],
        "candidates_log2": 40
    }
}


if __name__ == "__main__":
    check()
    out = vectors()
    if GOLDEN is not None:
        assert out == GOLDEN, "golden vectors drifted"
    print(json.dumps(out, indent=1))
    print("hint-reference: all checks passed")
