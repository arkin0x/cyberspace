"""Root identity across heights: the check behind CYBERSPACE_V2.md section 4.6.

Claim: for aligned regions of heights 1 and above, no two distinct (base, height) pairs
share a Cantor root. At height 0 the root is the position itself, and it can equal the
root of a small region at a positive height (pi(2, 3) = 18 = position 18).

Method: the pairing function is a bijection, so a root can be unpaired downward as if
it were a tree of any height; it is a collision only if the leaves come out as a
consecutive block starting at a multiple of 2^height. Unpairing is exact (integer
square root), so the check runs on 85-bit coordinates, not just on small numbers.

Dependency free. Run: python3 docs/analysis/root-identity-check.py
"""
import math
import random

AXIS = 1 << 85
random.seed(20260922)


def cantor_pair(a: int, b: int) -> int:
    s = a + b
    return (s * (s + 1)) // 2 + b


def cantor_unpair(z: int) -> tuple[int, int]:
    w = (math.isqrt(8 * z + 1) - 1) // 2
    t = w * (w + 1) // 2
    b = z - t
    return w - b, b


def compute_subtree_cantor(base: int, height: int) -> int:
    if height == 0:
        return base
    values = list(range(base, base + (1 << height)))
    for _ in range(height):
        values = [cantor_pair(values[i], values[i + 1]) for i in range(0, len(values), 2)]
    return values[0]


def invert_as_height(root: int, height: int):
    """The base of the aligned height-`height` region with this root, or None."""
    values = [root]
    for _ in range(height):
        nxt = []
        for v in values:
            nxt.extend(cantor_unpair(v))
        values = nxt
    base = values[0]
    if base % (1 << height) != 0:
        return None
    for i, v in enumerate(values):
        if v != base + i:
            return None
    return base


def find_lca_height(v1: int, v2: int) -> int:
    return (v1 ^ v2).bit_length()


def main() -> None:
    # The worked numbers in section 4.6 and 4.7.
    assert cantor_pair(2, 3) == 18
    assert compute_subtree_cantor(2, 1) == 18 == compute_subtree_cantor(18, 0)
    assert compute_subtree_cantor(0, 2) == 228
    assert invert_as_height(18, 1) == 2 and invert_as_height(18, 0) == 18 and invert_as_height(18, 2) is None
    assert compute_subtree_cantor(2, 1) - compute_subtree_cantor(0, 1) == 16

    # Every aligned region with a small base, heights 0..5: the only cross-height matches involve height 0.
    seen: dict[int, list[tuple[int, int]]] = {}
    for h in range(0, 6):
        for base in range(0, 1 << 12, 1 << h):
            seen.setdefault(compute_subtree_cantor(base, h), []).append((h, base))
    cross = [v for v in seen.values() if len({h for h, _ in v}) > 1]
    assert cross and all(any(h == 0 for h, _ in v) for v in cross), "a collision without height 0 would refute section 4.6"
    print(f"small bases: {len(cross)} cross-height matches, every one involving height 0")

    # Random regions across the whole 85-bit axis, heights 1..6, inverted as every other height 0..10.
    earth = 1 << 84
    trials = 0
    for _ in range(400):
        h1 = random.randint(1, 6)
        base = random.choice([random.randrange(0, AXIS), earth + random.randrange(-(1 << 60), 1 << 60), random.randrange(0, 1 << 50)])
        base = (base >> h1) << h1
        root = compute_subtree_cantor(base, h1)
        assert invert_as_height(root, h1) == base
        for h2 in range(0, 11):
            if h2 == h1:
                continue
            trials += 1
            got = invert_as_height(root, h2)
            if h2 == 0:
                assert got == root  # a number is always its own height-0 root
                assert root >= AXIS or base < (1 << 43), "a height-0 match inside the axis needs a small base"
            else:
                assert got is None, f"collision: base {base} h{h1} vs h{h2} base {got}"
    print(f"85-bit axis: {trials} cross-height inversions, none at heights 1 and above")

    # The height-0 exception at Earth-range magnitude: position 2 m^2 (m odd) equals the root of [m-1, m] at height 1.
    m = (1 << 41) + 1
    y = 2 * m * m
    assert y < AXIS and compute_subtree_cantor(m - 1, 1) == y
    assert compute_subtree_cantor(earth, 1).bit_length() == 170
    print(f"height-0 exception: position {y} ({y.bit_length()} bits) is the root of [{m - 1}, {m}] at height 1; an Earth-range height-1 root is 170 bits and equals no position")

    # Section 4.4: the example step.
    assert find_lca_height((1 << 34) - 1, 1 << 34) == 35
    assert find_lca_height((1 << 33) - 1, 1 << 33) == 34
    assert find_lca_height(7, 8) == 4
    print("section 4.4: lca(2^34 - 1, 2^34) = 35, lca(2^33 - 1, 2^33) = 34")
    print("OK")


if __name__ == "__main__":
    main()
