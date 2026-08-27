#!/usr/bin/env python3
"""CYBERSPACE_V2 section 6: reference sidestep v2 construction (stdlib only).

The v2 sidestep is a *toll*: its Merkle tree is seeded by the mover's chain
position, so no traveller's published proof reduces the cost for any other.
This file is the executable statement of sections 6.4, 6.5, 6.10 and 6.11, and
running it checks the properties those sections claim:

  1. two movers crossing the same boundary produce different roots
  2. a copied root and openings fail under the copier's own seed (no roads)
  3. an honest proof passes Level 1
  4. the axis byte separates identical subtrees on different axes
  5. a fabricated tree passes a destination-only check, as v1's did
  6. the same fabricated tree fails sampled openings, which is why 6.10 exists
  7. a trivial axis root is the single seeded leaf
  8. seed_prefix is exactly one SHA-256 block, so seeding costs no extra
     compression per leaf (section 6.5)

Golden vectors at the bottom lock the construction for other implementations.
"""
import hashlib

SIDESTEP_DOMAIN = b"CYBERSPACE_SIDESTEP_V2"        # 22 bytes
SEED_PAD = b"\x00" * 9                             # to a 64-byte block
SIDESTEP_SAMPLE_DOMAIN = b"CYBERSPACE_SIDESTEP_SAMPLE_V1"
SIDESTEP_SAMPLES = 8
AXIS_X, AXIS_Y, AXIS_Z = 0x00, 0x01, 0x02


def sha256(b: bytes) -> bytes:
    return hashlib.sha256(b).digest()


def int_to_bytes_be_min(n: int) -> bytes:
    return n.to_bytes(max(1, (n.bit_length() + 7) // 8), "big")


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


def sample_indices(root: bytes, axis_byte: int, height: int) -> list:
    """Section 6.10. Indices are positions within the aligned subtree."""
    return [
        int.from_bytes(
            sha256(SIDESTEP_SAMPLE_DOMAIN + root + bytes([axis_byte]) + i.to_bytes(4, "big")),
            "big",
        ) % (1 << height)
        for i in range(SIDESTEP_SAMPLES)
    ]


def prove_axis(previous_event_id: bytes, axis_byte: int, v1: int, v2: int):
    """Full per-axis sidestep proof. Returns (root, openings, base, height)."""
    height = (v1 ^ v2).bit_length()
    base = (v1 >> height) << height
    prefix = seed_prefix(previous_event_id, axis_byte)
    root = merkle_root_streaming(prefix, base, height)
    if height == 0:
        return root, [], base, height
    openings = [inclusion_path(prefix, base, height, v2 - base)]
    openings += [inclusion_path(prefix, base, height, i)
                 for i in sample_indices(root, axis_byte, height)]
    return root, openings, base, height


def verify_axis(previous_event_id, axis_byte, v1, v2, root, openings) -> bool:
    """Level 1 (section 6.11): destination path plus sampled openings."""
    height = (v1 ^ v2).bit_length()
    base = (v1 >> height) << height
    prefix = seed_prefix(previous_event_id, axis_byte)
    if height == 0:
        return root == leaf_hash(prefix, v1) and not openings
    if len(openings) != SIDESTEP_SAMPLES + 1:
        return False
    if any(len(p) != height for p in openings):
        return False
    if not verify_path(leaf_hash(prefix, v2), v2 - base, openings[0], root):
        return False
    for path, idx in zip(openings[1:], sample_indices(root, axis_byte, height)):
        if not verify_path(leaf_hash(prefix, base + idx), idx, path, root):
            return False
    return True


if __name__ == "__main__":
    import os

    H, AXIS = 12, AXIS_Z
    base = (0x1234567 >> H) << H
    v1, v2 = base, base + (1 << H)      # destination per section 6.3
    alice, bob = bytes(range(32)), bytes(range(32, 64))

    root_a, open_a, _, _ = prove_axis(alice, AXIS, v1, v2)
    root_b, _, _, _ = prove_axis(bob, AXIS, v1, v2)
    pa = seed_prefix(alice, AXIS)

    checks = [
        ("roots differ across movers at one boundary", root_a != root_b),
        ("copied proof fails under the copier's seed",
         not verify_axis(bob, AXIS, v1, v2, root_a, open_a)),
        ("honest Level 1 verifies", verify_axis(alice, AXIS, v1, v2, root_a, open_a)),
        ("axis byte separates identical subtrees",
         prove_axis(alice, AXIS_X, v1, v2)[0] != root_a),
    ]

    # v1's destination-only check accepted a tree that was never built.
    fake_sibs = [sha256(b"forge" + bytes([i])) for i in range(H)]
    cur, i = leaf_hash(pa, v2), v2 - base
    for s in fake_sibs:
        cur = sha256(cur + s) if i % 2 == 0 else sha256(s + cur)
        i //= 2
    fake_root = cur
    checks += [
        ("fabricated root passes a destination-only check",
         verify_path(leaf_hash(pa, v2), v2 - base, fake_sibs, fake_root)),
        ("fabricated root fails sampled openings",
         not verify_axis(alice, AXIS, v1, v2, fake_root,
                         [fake_sibs] * (SIDESTEP_SAMPLES + 1))),
        ("trivial axis root is the single seeded leaf",
         prove_axis(alice, AXIS, 999, 999)[0] == leaf_hash(pa, 999)),
        ("seed_prefix is exactly one SHA-256 block", len(pa) == 64),
        ("an 85-bit axis value fits the second block",
         len(int_to_bytes_be_min((1 << 85) - 1)) + 9 <= 64),
    ]

    # Golden vectors (consensus locks for other implementations).
    zero = bytes(32)
    golden = [
        (zero, AXIS_X, 0, 0),
        (zero, AXIS_Z, base, base + (1 << 4)),
        (bytes(range(32)), AXIS_Y, 1 << 40, (1 << 40) + (1 << 8)),
    ]
    print("golden vectors (previous_event_id, axis, v1, v2) -> root")
    for prev, axis, a, b in golden:
        r, _, _, h = prove_axis(prev, axis, a, b)
        print(f"  {prev.hex()[:16]}… axis={axis} h={h:2d} -> {r.hex()}")
    print()

    width = max(len(n) for n, _ in checks)
    for name, ok in checks:
        print(f"  {name.ljust(width)}  {'ok' if ok else 'FAIL'}")
    if not all(ok for _, ok in checks):
        raise SystemExit(1)
    print("\nall checks passed")
