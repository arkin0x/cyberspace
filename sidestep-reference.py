#!/usr/bin/env python3
"""CYBERSPACE_V2 section 6: reference sidestep construction, version 3 (stdlib only).

The sidestep is a *toll*: its Merkle tree is seeded by the mover's chain
position, so no traveller's published proof reduces the cost for any other.
Version 3 adds the re-roll price of section 6.10: the sample positions come
from a hash that costs, on average, one eighth of the tree to find, so a
prover who computes only part of the tree cannot cheaply try again and again
until the samples miss the part it skipped (section 6.11).

This file is the executable statement of sections 6.4, 6.5, 6.10 and 6.11.
Running it checks the properties those sections claim:

  1. two movers crossing the same boundary produce different roots
  2. a copied root and openings fail under the copier's own seed (no roads)
  3. an honest proof passes Level 1
  4. the axis byte separates identical subtrees on different axes
  5. a fabricated tree passes a destination-only check, as v1's did
  6. the same fabricated tree fails sampled openings
  7. a trivial axis root is the single seeded leaf
  8. seed_prefix is exactly one SHA-256 block, so seeding costs no extra
     compression per leaf (section 6.5)
  9. an 85-bit axis value fits the second block
 10. one re-roll attempt costs exactly three compressions, one leaf's share of
     the tree, because the nonce sits in the first of three blocks
 11. a nonce that misses the price is rejected, and so is a version 2 proof
 12. the subtree-fabrication attack of section 6.11 still passes Level 1, but
     only after paying for its re-rolls, and it costs more than the honest crossing

Golden vectors at the bottom lock the construction for other implementations.
The Merkle roots are unchanged from version 2; only the sample positions and the
nonce are new.
"""
import hashlib

SIDESTEP_DOMAIN = b"CYBERSPACE_SIDESTEP_V2"        # 22 bytes
SEED_PAD = b"\x00" * 9                             # to a 64-byte block
SIDESTEP_SAMPLE_DOMAIN = b"CYBERSPACE_SIDESTEP_SAMPLE_V2"
SIDESTEP_GRIND_DOMAIN = b"CYBERSPACE_SIDESTEP_GRIND_V1"   # 28 bytes
SIDESTEP_SAMPLES = 8
AXIS_X, AXIS_Y, AXIS_Z = 0x00, 0x01, 0x02
AXES = (AXIS_X, AXIS_Y, AXIS_Z)


def sha256(b: bytes) -> bytes:
    return hashlib.sha256(b).digest()


def compressions(n_bytes: int) -> int:
    """SHA-256 compression-function calls for a message of n_bytes."""
    return (n_bytes + 9 + 63) // 64


def int_to_bytes_be_min(n: int) -> bytes:
    return n.to_bytes(max(1, (n.bit_length() + 7) // 8), "big")


# ------------------------------------------------------------- the tree (unchanged from v2)
def seed_prefix(previous_event_id: bytes, axis_byte: int) -> bytes:
    """Section 6.4. Exactly 64 bytes: one SHA-256 block."""
    if len(previous_event_id) != 32:
        raise ValueError("previous_event_id must be 32 raw bytes")
    prefix = SIDESTEP_DOMAIN + previous_event_id + bytes([axis_byte]) + SEED_PAD
    assert len(prefix) == 64
    return prefix


def leaf_hash(prefix: bytes, value: int) -> bytes:
    return sha256(prefix + int_to_bytes_be_min(value))


def merkle_root_streaming(prefix: bytes, base: int, height: int) -> bytes:
    """Section 6.5, in O(h) memory."""
    if height == 0:
        return leaf_hash(prefix, base)
    stack = []  # (hash, level)
    for i in range(1 << height):
        current, level = leaf_hash(prefix, base + i), 0
        while stack and stack[-1][1] == level:
            current = sha256(stack.pop()[0] + current)
            level += 1
        stack.append((current, level))
    return stack[0][0]


def _levels(prefix: bytes, base: int, height: int):
    level = [leaf_hash(prefix, base + i) for i in range(1 << height)]
    out = [level]
    while len(level) > 1:
        level = [sha256(level[j] + level[j + 1]) for j in range(0, len(level), 2)]
        out.append(level)
    return out


def inclusion_path(prefix: bytes, base: int, height: int, idx: int) -> list:
    """Sibling hashes from leaf to root (section 6.10)."""
    levels, out, i = _levels(prefix, base, height), [], idx
    for depth in range(height):
        out.append(levels[depth][i ^ 1])
        i //= 2
    return out


def verify_path(leaf: bytes, idx: int, siblings: list, root: bytes) -> bool:
    cur, i = leaf, idx
    for sib in siblings:
        cur = sha256(cur + sib) if i % 2 == 0 else sha256(sib + cur)
        i //= 2
    return cur == root


def axis_geometry(v1: int, v2: int):
    height = (v1 ^ v2).bit_length()
    return (v1 >> height) << height, height


# ------------------------------------------------------------- the re-roll price (new in v3)
def reroll_attempts(heights) -> int:
    """Section 6.10. Expected attempts A = ceil(L / SIDESTEP_SAMPLES), L the leaves
    of every non-trivial axis. Each attempt costs one leaf's share of the tree,
    so the price is one eighth of the crossing."""
    leaves = sum(1 << h for h in heights if h > 0)
    return max(1, -(-leaves // SIDESTEP_SAMPLES))


def grind_hash(previous_event_id: bytes, roots, nonce: int) -> bytes:
    """G. 164 bytes, three blocks, nonce in the first: no midstate survives a new nonce."""
    return sha256(SIDESTEP_GRIND_DOMAIN + nonce.to_bytes(8, "big")
                  + previous_event_id + roots[0] + roots[1] + roots[2])


def meets_price(G: bytes, attempts: int) -> bool:
    """G read as a 256-bit integer must be below 2^256 / A: probability 1/A per try."""
    return int.from_bytes(G, "big") * attempts < (1 << 256)


def find_nonce(previous_event_id: bytes, roots, attempts: int, start: int = 0):
    nonce = start
    while True:
        G = grind_hash(previous_event_id, roots, nonce)
        if meets_price(G, attempts):
            return nonce, G
        nonce += 1


def sample_indices(G: bytes, axis_byte: int, height: int) -> list:
    """Section 6.10. Indices are positions within the aligned subtree."""
    return [
        int.from_bytes(
            sha256(SIDESTEP_SAMPLE_DOMAIN + G + bytes([axis_byte]) + i.to_bytes(4, "big")),
            "big",
        ) % (1 << height)
        for i in range(SIDESTEP_SAMPLES)
    ]


# ------------------------------------------------------------- prove and verify a crossing
def prove_sidestep(previous_event_id: bytes, src, dst):
    """Full sidestep proof. src, dst are (x, y, z). Returns (roots, nonce, openings)."""
    geo = [axis_geometry(a, b) for a, b in zip(src, dst)]
    prefixes = [seed_prefix(previous_event_id, ax) for ax in AXES]
    roots = [merkle_root_streaming(p, base, h) for p, (base, h) in zip(prefixes, geo)]
    nonce, G = find_nonce(previous_event_id, roots, reroll_attempts(h for _, h in geo))
    openings = []
    for ax, p, (base, h), v2 in zip(AXES, prefixes, geo, dst):
        if h == 0:
            openings.append([])
            continue
        paths = [inclusion_path(p, base, h, v2 - base)]
        paths += [inclusion_path(p, base, h, i) for i in sample_indices(G, ax, h)]
        openings.append(paths)
    return roots, nonce, openings


def verify_sidestep(previous_event_id: bytes, src, dst, roots, nonce, openings) -> bool:
    """Level 1 (section 6.11): the price, the destination paths, the sampled paths."""
    geo = [axis_geometry(a, b) for a, b in zip(src, dst)]
    G = grind_hash(previous_event_id, roots, nonce)
    if not meets_price(G, reroll_attempts(h for _, h in geo)):
        return False
    for ax, (base, h), v1, v2, root, paths in zip(AXES, geo, src, dst, roots, openings):
        prefix = seed_prefix(previous_event_id, ax)
        if h == 0:
            if root != leaf_hash(prefix, v1) or paths:
                return False
            continue
        if len(paths) != SIDESTEP_SAMPLES + 1 or any(len(p) != h for p in paths):
            return False
        if not verify_path(leaf_hash(prefix, v2), v2 - base, paths[0], root):
            return False
        for path, idx in zip(paths[1:], sample_indices(G, ax, h)):
            if not verify_path(leaf_hash(prefix, base + idx), idx, path, root):
                return False
    return True


# ------------------------------------------------------------- the attack of section 6.11
def fabricate_and_reroll(previous_event_id: bytes, src, dst, axis: int, fake_seed: bytes):
    """Honestly build only the half-subtree holding the destination on one axis, replace
    the other half by 32 fabricated bytes, then keep finding nonces until every sample
    lands in the honest half. Returns (roots, nonce, openings, cost_in_compressions)."""
    geo = [axis_geometry(a, b) for a, b in zip(src, dst)]
    base, h = geo[axis]
    prefix = seed_prefix(previous_event_id, AXES[axis])
    dest = dst[axis] - base
    half = h - 1
    lo = (dest >> half) << half
    levels = [[leaf_hash(prefix, base + lo + i) for i in range(1 << half)]]
    while len(levels[-1]) > 1:
        lv = levels[-1]
        levels.append([sha256(lv[j] + lv[j + 1]) for j in range(0, len(lv), 2)])
    cost = (1 << half) * 1 + ((1 << half) - 1) * 2            # leaves + internal nodes
    fake = sha256(fake_seed)
    root = sha256(fake + levels[-1][0]) if dest >> half else sha256(levels[-1][0] + fake)
    cost += 2
    roots = [merkle_root_streaming(seed_prefix(previous_event_id, ax), b, hh)
             for ax, (b, hh) in zip(AXES, geo)]
    roots[axis] = root
    A = reroll_attempts(hh for _, hh in geo)
    nonce = 0
    while True:
        G = grind_hash(previous_event_id, roots, nonce)
        cost += compressions(164)
        if meets_price(G, A):
            cost += SIDESTEP_SAMPLES                           # derive the sample indices
            idx = sample_indices(G, AXES[axis], h)
            if all((i >> half) == (dest >> half) for i in idx):
                break
        nonce += 1

    def path(i):
        out, j = [], i - lo
        for d in range(half):
            out.append(levels[d][j ^ 1])
            j //= 2
        return out + [fake]

    openings = [[] for _ in AXES]
    openings[axis] = [path(dest)] + [path(i) for i in idx]
    return roots, nonce, openings, cost


def honest_cost(src, dst) -> int:
    geo = [axis_geometry(a, b) for a, b in zip(src, dst)]
    tree = sum((1 << h) + 2 * ((1 << h) - 1) for _, h in geo if h > 0)
    return tree + reroll_attempts(h for _, h in geo) * compressions(164)


if __name__ == "__main__":
    H = 12
    base = (0x1234567 >> H) << H
    src = (5, 7, base + (1 << (H - 1)) - 1)             # section 6.3: touch the wall...
    dst = (5, 7, base + (1 << (H - 1)))                  # ...and land 1 Gibson past it
    alice, bob = bytes(range(32)), bytes(range(32, 64))

    roots_a, nonce_a, open_a = prove_sidestep(alice, src, dst)
    roots_b, _, _ = prove_sidestep(bob, src, dst)
    pa = seed_prefix(alice, AXIS_Z)

    checks = [
        ("roots differ across movers at one boundary", roots_a[2] != roots_b[2]),
        ("copied proof fails under the copier's seed",
         not verify_sidestep(bob, src, dst, roots_a, nonce_a, open_a)),
        ("honest Level 1 verifies", verify_sidestep(alice, src, dst, roots_a, nonce_a, open_a)),
        ("axis byte separates identical subtrees",
         merkle_root_streaming(seed_prefix(alice, AXIS_X), base, H)
         != merkle_root_streaming(pa, base, H)),
    ]

    # v1's destination-only check accepted a tree that was never built.
    v2z, bz = dst[2], base
    fake_sibs = [sha256(b"forge" + bytes([i])) for i in range(H)]
    cur, i = leaf_hash(pa, v2z), v2z - bz
    for s in fake_sibs:
        cur = sha256(cur + s) if i % 2 == 0 else sha256(s + cur)
        i //= 2
    fake_roots = [roots_a[0], roots_a[1], cur]
    fake_nonce, _ = find_nonce(alice, fake_roots, reroll_attempts([0, 0, H]))
    checks += [
        ("fabricated root passes a destination-only check",
         verify_path(leaf_hash(pa, v2z), v2z - bz, fake_sibs, cur)),
        ("fabricated root fails sampled openings",
         not verify_sidestep(alice, src, dst, fake_roots, fake_nonce,
                             [[], [], [fake_sibs] * (SIDESTEP_SAMPLES + 1)])),
        ("trivial axis root is the single seeded leaf", roots_a[0] == leaf_hash(seed_prefix(alice, AXIS_X), 5)),
        ("seed_prefix is exactly one SHA-256 block", len(pa) == 64),
        ("an 85-bit axis value fits the second block",
         len(int_to_bytes_be_min((1 << 85) - 1)) + 9 <= 64),
        ("one attempt is three compressions, nonce in the first block",
         compressions(164) == 3 and len(SIDESTEP_GRIND_DOMAIN) + 8 <= 64),
    ]

    # 11: a nonce that misses the price, and a version 2 proof (samples from M_axis)
    A = reroll_attempts([0, 0, H])
    bad_nonce = next(n for n in range(10 ** 6) if not meets_price(grind_hash(alice, roots_a, n), A))
    v2_idx = [int.from_bytes(sha256(b"CYBERSPACE_SIDESTEP_SAMPLE_V1" + roots_a[2] + bytes([AXIS_Z])
                                    + k.to_bytes(4, "big")), "big") % (1 << H) for k in range(SIDESTEP_SAMPLES)]
    v2_open = [[], [], [inclusion_path(pa, base, H, v2z - base)] + [inclusion_path(pa, base, H, k) for k in v2_idx]]
    checks += [
        ("a nonce that misses the price is rejected",
         not verify_sidestep(alice, src, dst, roots_a, bad_nonce, open_a)),
        ("a version 2 proof (samples from M_axis) is rejected",
         not verify_sidestep(alice, src, dst, roots_a, 0, v2_open)),
    ]

    # 12: the attack still passes Level 1, but only after paying for its re-rolls
    f_roots, f_nonce, f_open, f_cost = fabricate_and_reroll(alice, src, dst, 2, b"cyberspace")
    h_cost = honest_cost(src, dst)
    checks += [
        (f"half-tree forgery passes Level 1 only by paying: {f_cost / h_cost:.1f}x the honest cost",
         verify_sidestep(alice, src, dst, f_roots, f_nonce, f_open) and f_cost > h_cost),
    ]

    # Golden vectors (consensus locks for other implementations).
    zero = bytes(32)
    golden_roots = [
        (zero, AXIS_X, 0, 0),
        (zero, AXIS_Z, base, base + (1 << 4)),
        (bytes(range(32)), AXIS_Y, 1 << 40, (1 << 40) + (1 << 8)),
    ]
    print("golden vectors: axis roots, unchanged from version 2 (previous_event_id, axis, v1, v2) -> root")
    for prev, axis, a, b in golden_roots:
        bb, hh = axis_geometry(a, b)
        r = merkle_root_streaming(seed_prefix(prev, axis), bb, hh)
        print(f"  {prev.hex()[:16]}... axis={axis} h={hh:2d} -> {r.hex()}")
    g_roots, g_nonce, _ = prove_sidestep(zero, src, dst)
    g_G = grind_hash(zero, g_roots, g_nonce)
    print("golden vector: the crossing above with previous_event_id = 32 zero bytes")
    print(f"  attempts A = {reroll_attempts([0, 0, H])}, nonce = {g_nonce}, G = {g_G.hex()}")
    print(f"  first sample index on z = {sample_indices(g_G, AXIS_Z, H)[0]}")
    print()

    width = max(len(n) for n, _ in checks)
    for name, ok in checks:
        print(f"  {name.ljust(width)}  {'ok' if ok else 'FAIL'}")
    if not all(ok for _, ok in checks):
        raise SystemExit(1)
    print("\nall checks passed")
