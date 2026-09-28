#!/usr/bin/env python3
"""DECK-0001 §5.3 to §5.5: reference ride openings with the re-roll price (stdlib only).

A ride's proof is a Merkle root over one seeded Cantor leaf per block passed,
plus SAMPLES openings. Version 2 of the openings (§5.8) draws the sample indices
from G, which costs about one thirty-second of the ride to find, so a prover that
skips blocks cannot cheaply retry until the samples avoid its gaps.

Real block hashes come from Bitcoin; here they are synthetic, chosen so every
block has a small height and the file runs in seconds. Running it checks:

  1. an honest ride passes Level 1
  2. a proof is bound to its chain position (previous_event_id)
  3. a nonce that misses the price is rejected
  4. a version 1 proof (samples from the root, no nonce) is rejected
  5. a zero-length ride carries an all-zero nonce and nothing to sample
  6. a ride with a fabricated leaf passes only once a priced nonce steers every
     sample away from it, and in expectation that costs more than the leaf saved
Golden vectors at the bottom.
"""
import hashlib
import math

K_LINE = 6
SAMPLES = 32
GRIND_HEIGHT = 16
HYPERSPACE_TERRAIN_DOMAIN = b"CYBERSPACE_HYPERSPACE_TERRAIN_V1"
HYPERSPACE_SEED_DOMAIN = b"CYBERSPACE_HYPERSPACE_SEED_V1"
HYPERSPACE_LEAF_DOMAIN = b"CYBERSPACE_HYPERSPACE_LEAF_V1"
HYPERSPACE_GRIND_DOMAIN = b"CYBERSPACE_HYPERSPACE_GRIND_V1"
HYPERSPACE_SAMPLE_DOMAIN = b"CYBERSPACE_HYPERSPACE_SAMPLE_V2"
PAD_LEAF = bytes(32)


def sha256(b: bytes) -> bytes:
    return hashlib.sha256(b).digest()


def be64(n: int) -> bytes:
    return n.to_bytes(8, "big")


def be32(n: int) -> bytes:
    return n.to_bytes(4, "big")


def int_to_bytes_be_min(n: int) -> bytes:
    return n.to_bytes(max(1, (n.bit_length() + 7) // 8), "big")


def compute_subtree_cantor(base: int, height: int) -> int:
    """CYBERSPACE_V2.md §4.6, streaming."""
    stack = []
    for i in range(1 << height):
        cur, lvl = base + i, 0
        while stack and stack[-1][1] == lvl:
            a = stack.pop()[0]
            s = a + cur
            cur = s * (s + 1) // 2 + cur
            lvl += 1
        stack.append((cur, lvl))
    return stack[0][0]


# ------------------------------------------------------------------ §5.3 leaves, §5.4 root
def line_terrain_k(block_hash: bytes) -> int:
    d = sha256(HYPERSPACE_TERRAIN_DOMAIN + block_hash)
    return bin((d[0] << 8) | d[1]).count("1")


def ride_leaf(prev: bytes, b: int, block_hash: bytes) -> bytes:
    h = line_terrain_k(block_hash) + K_LINE
    t = int.from_bytes(sha256(HYPERSPACE_SEED_DOMAIN + prev + be64(b)), "big") % (1 << 85)
    c = compute_subtree_cantor((t >> h) << h, h)
    return sha256(HYPERSPACE_LEAF_DOMAIN + be64(b) + int_to_bytes_be_min(c))


def merkle_levels(leaves):
    width = 1
    while width < len(leaves):
        width *= 2
    level = list(leaves) + [PAD_LEAF] * (width - len(leaves))
    out = [level]
    while len(level) > 1:
        level = [sha256(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        out.append(level)
    return out


def path_of(levels, idx):
    out, i = [], idx
    for lvl in levels[:-1]:
        out.append(lvl[i ^ 1])
        i //= 2
    return out


def verify_path(leaf, idx, path, root):
    cur, i = leaf, idx
    for s in path:
        cur = sha256(cur + s) if i % 2 == 0 else sha256(s + cur)
        i //= 2
    return cur == root


# ------------------------------------------------------------------ §5.5 the re-roll price
def attempts_required(n: int) -> int:
    return max(1, -(-n // SAMPLES))


def grind_attempt(prev: bytes, root: bytes, nonce: int) -> bytes:
    """One attempt: one Cantor tree at GRIND_HEIGHT. Returns G."""
    seed = sha256(HYPERSPACE_GRIND_DOMAIN + prev + root + be64(nonce))
    g_base = ((int.from_bytes(seed, "big") % (1 << 85)) >> GRIND_HEIGHT) << GRIND_HEIGHT
    c = compute_subtree_cantor(g_base, GRIND_HEIGHT)
    return sha256(HYPERSPACE_GRIND_DOMAIN + seed + int_to_bytes_be_min(c))


def meets_price(G: bytes, A: int) -> bool:
    return int.from_bytes(G, "big") * A < (1 << 256)


def sample_indices(G: bytes, n: int):
    return [int.from_bytes(sha256(HYPERSPACE_SAMPLE_DOMAIN + G + be32(i)), "big") % n for i in range(SAMPLES)]


def find_nonce(prev, root, n, start=0, accept=lambda G: True):
    """First nonce >= start that meets the price and whose G satisfies `accept`.
    Returns (nonce, G, attempts spent)."""
    A, nonce, spent = attempts_required(n), start, 0
    while True:
        G = grind_attempt(prev, root, nonce)
        spent += 1
        if meets_price(G, A) and accept(G):
            return nonce, G, spent
        nonce += 1


def prove_ride(prev: bytes, lo: int, hi: int, block_hash):
    """Blocks lo+1 .. hi. Returns (root, nonce, openings)."""
    n = hi - lo
    if n == 0:
        return PAD_LEAF, 0, []
    leaves = [ride_leaf(prev, b, block_hash(b)) for b in range(lo + 1, hi + 1)]
    levels = merkle_levels(leaves)
    root = levels[-1][0]
    nonce, G, _ = find_nonce(prev, root, n)
    return root, nonce, [path_of(levels, i) for i in sample_indices(G, n)]


def verify_ride(prev: bytes, lo: int, hi: int, block_hash, root, nonce, openings) -> bool:
    """Level 1 (§5.5): the price, then every sampled leaf recomputed and its path checked."""
    n = hi - lo
    if n == 0:
        return root == PAD_LEAF and nonce == 0 and not openings
    G = grind_attempt(prev, root, nonce)
    if not meets_price(G, attempts_required(n)) or len(openings) != SAMPLES:
        return False
    depth = (len(merkle_levels([PAD_LEAF] * n)) - 1)
    for idx, path in zip(sample_indices(G, n), openings):
        if len(path) != depth:
            return False
        if not verify_path(ride_leaf(prev, lo + 1 + idx, block_hash(lo + 1 + idx)), idx, path, root):
            return False
    return True


# ------------------------------------------------------------------ synthetic line
_hash_cache = {}


def synthetic_block_hash(b: int) -> bytes:
    """Deterministic stand-in for a block hash, picked so the block's height is at most 10."""
    if b not in _hash_cache:
        j = 0
        while True:
            h = sha256(b"CYBERSPACE_TEST_BLOCK" + be64(b) + be32(j))
            if line_terrain_k(h) + K_LINE <= 10:
                _hash_cache[b] = h
                break
            j += 1
    return _hash_cache[b]


if __name__ == "__main__":
    prev_a, prev_b = bytes(range(32)), bytes(range(32, 64))
    lo, hi = 900000, 900040
    n = hi - lo
    checks = []

    root, nonce, openings = prove_ride(prev_a, lo, hi, synthetic_block_hash)
    checks.append(("honest ride passes Level 1", verify_ride(prev_a, lo, hi, synthetic_block_hash, root, nonce, openings)))
    checks.append(("copied proof fails under another previous_event_id",
                   not verify_ride(prev_b, lo, hi, synthetic_block_hash, root, nonce, openings)))

    A = attempts_required(n)
    bad = next(k for k in range(10 ** 6) if not meets_price(grind_attempt(prev_a, root, k), A))
    checks.append(("a nonce that misses the price is rejected",
                   not verify_ride(prev_a, lo, hi, synthetic_block_hash, root, bad, openings)))

    levels = merkle_levels([ride_leaf(prev_a, b, synthetic_block_hash(b)) for b in range(lo + 1, hi + 1)])
    v1_idx = [int.from_bytes(sha256(b"CYBERSPACE_HYPERSPACE_SAMPLE_V1" + root + be32(i)), "big") % n for i in range(SAMPLES)]
    v1_open = [path_of(levels, i) for i in v1_idx]
    checks.append(("a version 1 proof (samples from the root) is rejected",
                   not any(verify_ride(prev_a, lo, hi, synthetic_block_hash, root, k, v1_open) for k in range(3))))

    z_root, z_nonce, z_open = prove_ride(prev_a, lo, lo, synthetic_block_hash)
    checks.append(("zero-length ride: zero root, zero nonce, nothing sampled",
                   z_root == PAD_LEAF and z_nonce == 0 and z_open == []
                   and verify_ride(prev_a, lo, lo, synthetic_block_hash, z_root, z_nonce, z_open)))

    # 6: skip one block (fabricate its leaf), then find a priced nonce whose samples avoid it.
    skip = 17
    leaves = [ride_leaf(prev_a, b, synthetic_block_hash(b)) for b in range(lo + 1, hi + 1)]
    leaves[skip] = sha256(b"fabricated")
    f_levels = merkle_levels(leaves)
    f_root = f_levels[-1][0]
    f_nonce, f_G, spent = find_nonce(prev_a, f_root, n, accept=lambda G: skip not in sample_indices(G, n))
    f_open = [path_of(f_levels, i) for i in sample_indices(f_G, n)]
    passes = verify_ride(prev_a, lo, hi, synthetic_block_hash, f_root, f_nonce, f_open)
    # Expected cost in block-equivalents (one attempt costs about one block, §5.5), honest n + A:
    S, W = SAMPLES, n

    def expected(f):
        return f * W + f ** -S * (W / S)

    worst = min(expected(k / 1000) - (W + W / S) for k in range(1, 1001))
    checks.append((f"fabricated leaf passes after {spent} priced attempts; expected cost never below honest",
                   passes and worst >= -1e-9))

    print("golden vectors (synthetic line, previous_event_id, blocks lo+1..hi)")
    zero = bytes(32)
    for prev, a, b in [(zero, 900000, 900040), (bytes(range(32)), 900000, 900001)]:
        r, nn, _ = prove_ride(prev, a, b, synthetic_block_hash)
        G = grind_attempt(prev, r, nn)
        print(f"  prev={prev.hex()[:16]}... blocks {a + 1}..{b}: root {r.hex()}")
        print(f"      nonce {nn:016x}  G {G.hex()}  first sample {sample_indices(G, b - a)[0]}")
    print(f"  one leaf: ride_leaf(zero, 900001, synthetic_block_hash(900001)) = "
          f"{ride_leaf(zero, 900001, synthetic_block_hash(900001)).hex()}")
    print(f"  one attempt: grind_attempt(zero, zero_root, 0) = {grind_attempt(zero, zero, 0).hex()}\n")

    width = max(len(nm) for nm, _ in checks)
    for nm, ok in checks:
        print(f"  {nm.ljust(width)}  {'ok' if ok else 'FAIL'}")
    raise SystemExit(0 if all(ok for _, ok in checks) else 1)
