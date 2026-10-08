#!/usr/bin/env python3
"""CYBERSPACE_V2 sections 5.9 to 5.11: residue openings, version 2 of the hop proof (stdlib only).

Version 1 of the hop proof is SHA256(SHA256(hop_n)) (section 5.6). A hash can be checked only by
someone holding every byte it hashed, so verifying a version 1 hop means rebuilding every tree
and the full-width combine: today's verification costs today's production. Version 2 keeps the
Cantor work exactly as it was and changes only the commitment at the end:

  * a Cantor root reduced modulo an odd m is the same tree carried in Z/mZ, with halving
    replaced by multiplication by (m + 1) / 2, so anyone can compute hop_n mod p for a 61-bit
    prime p in word-sized arithmetic, without building hop_n (section 5.9);
  * the prover seals, in one Merkle tree, hop_n mod p_j for m primes, each drawn on its own
    from (previous_event_id, j), whose product Q spans a quarter of the widest root;
  * a re-roll price paid in residue work fixes which 16 residues are opened, and the verifier
    recomputes exactly those 16 (sections 5.10, 5.11).

The residues pin down hop_n mod Q, never hop_n itself: Q spans a quarter of the widest axis root
and hop_n is about eight times that root. They are evidence of the work because holding most of
them costs at least the Cantor trees, while any single one is cheap for everyone.

This file is the executable statement of sections 5.9 to 5.11 and of the hop tags of 8.4.
Running it checks the properties those sections claim:

  1. terrain K, the version 1 proof_hash and the lookup_id of the section 5.7 movement match
     the golden values printed there, so every quantity is derived from the event as the spec
     derives it
  2. a root modulo p equals the same tree carried modulo p, for axis roots and for hop_n
  3. the difference engine equals the residue tree at every level k
  4. every hop prime is odd, at least 2^61 and below 2^62, and an index past 2^32 does not wrap
  5. an honest proof verifies from its tags, at Level 1 and at Level 2
  6. a proof copied to another previous_event_id fails
  7. two chain positions share no primes
  8. one wrong residue in an opened block is caught
  9. a residue left unreduced (r + p, the same value modulo p) is rejected
 10. an mp tag one sibling short, an mn tag of the wrong length, and uppercase hex are rejected
 11. a nonce that misses the re-roll price is rejected
 12. a multi-axis hop pays the sum of its per-height budgets
 13. a fabricated commitment is rejected
 14. a prover holding each true residue with probability f passes Level 1 exactly when all 16
     sampled residues are held, trial by trial, and Level 2 rejects every mixed list that passed
 15. the residue count, Merkle depth and mp width at h20 and h30 are those section 5.12 states

Golden vectors at the bottom lock the construction for other implementations.
"""
import functools
import hashlib
import random

AXIS_BITS = 85
TERRAIN_DOMAIN_V2 = b"CYBERSPACE_TERRAIN_K_V2"
TERRAIN_CELL_BITS = (3, 7, 9, 11)

HOP_RESIDUE_PRIME_DOMAIN = b"CYBERSPACE_HOP_RESIDUE_PRIME_V1"     # 31 bytes
HOP_RESIDUE_LEAF_DOMAIN = b"CYBERSPACE_HOP_RESIDUE_LEAF_V1"       # 30 bytes
HOP_RESIDUE_GRIND_DOMAIN = b"CYBERSPACE_HOP_RESIDUE_GRIND_V1"     # 31 bytes
HOP_RESIDUE_SAMPLE_DOMAIN = b"CYBERSPACE_HOP_RESIDUE_SAMPLE_V1"   # 32 bytes
HOP_SAMPLES = 16              # residues the verifier recomputes
RESIDUE_BLOCK = 8             # residues per Merkle leaf
PRIME_BITS = 61               # every prime is at least 2^61, so each adds at least 61 bits to Q
WIDTH_DIVISOR = 4             # Q spans at least a quarter of the widest root
HOP_GRIND_HEIGHT = 12         # one re-roll attempt is one aligned height-12 tree modulo p_0
# Re-roll budget per height, in attempts: one sixteenth of an honest hop at that height,
# calibrated on one core of a Ryzen 7 6800H (section 5.10). Above h22 each height costs 9/4 of
# the one below, in exact integer arithmetic.
HOP_REROLL_BUDGET = (0, 0, 0, 0, 0, 0, 1, 2, 4, 7, 14, 30, 65, 149, 355, 782, 1753, 4016,
                     8959, 20028, 44826, 99974, 223681)
SMALL_ODD_PRIMES = (3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
                    73, 79, 83, 89, 97)
PAD_LEAF = bytes(32)
LOWER_HEX = frozenset("0123456789abcdef")


def sha256(b: bytes) -> bytes:
    return hashlib.sha256(b).digest()


def be32(n: int) -> bytes:
    return n.to_bytes(4, "big")


def be64(n: int) -> bytes:
    return n.to_bytes(8, "big")


def int_to_bytes_be_min(n: int) -> bytes:
    return n.to_bytes(max(1, (n.bit_length() + 7) // 8), "big")


# ------------------------------------------------------------- coordinates and terrain (2.3, 5.2, 5.3)
def xyz_to_coord(x: int, y: int, z: int, plane: int = 0) -> int:
    coord = plane & 1
    for i in range(AXIS_BITS):
        coord |= ((z >> i) & 1) << (1 + i * 3)
        coord |= ((y >> i) & 1) << (2 + i * 3)
        coord |= ((x >> i) & 1) << (3 + i * 3)
    return coord


def coord_to_xyz(coord: int):
    x = y = z = 0
    for i in range(AXIS_BITS):
        z |= ((coord >> (1 + i * 3)) & 1) << i
        y |= ((coord >> (2 + i * 3)) & 1) << i
        x |= ((coord >> (3 + i * 3)) & 1) << i
    return x, y, z, coord & 1


def terrain_k(x2: int, y2: int, z2: int, plane: int) -> int:
    word = 0
    for bits in TERRAIN_CELL_BITS:
        cell = xyz_to_coord((x2 >> bits) << bits, (y2 >> bits) << bits, (z2 >> bits) << bits, plane)
        digest = sha256(TERRAIN_DOMAIN_V2 + bytes([bits]) + cell.to_bytes(32, "big"))
        word = (word << 4) | (digest[0] & 0x0F)
    return bin(word).count("1")


def temporal_base(previous_event_id: bytes, K: int) -> int:
    t = int.from_bytes(previous_event_id, "big") % (1 << AXIS_BITS)
    return (t >> K) << K


def find_lca_height(v1: int, v2: int) -> int:
    return (v1 ^ v2).bit_length()


# ------------------------------------------------------------- Cantor, exact (4.6) and modulo p (5.9)
def cantor_pair(a: int, b: int) -> int:
    s = a + b
    return (s * (s + 1)) // 2 + b


def compute_subtree_cantor(base: int, height: int) -> int:
    values = list(range(base, base + (1 << height)))
    for _ in range(height):
        values = [cantor_pair(values[i], values[i + 1]) for i in range(0, len(values), 2)]
    return values[0]


def pair_mod(a: int, b: int, p: int) -> int:
    """pi(a, b) mod p for odd p: (p + 1) / 2 is the inverse of 2, so halving is a multiplication."""
    s = (a + b) % p
    return (s * (s + 1) * ((p + 1) // 2) + b) % p


def residue_tree(base: int, height: int, p: int) -> int:
    """compute_subtree_cantor(base, height) mod p, by the same tree carried modulo p."""
    stack = []
    for i in range(1 << height):
        cur, level = (base + i) % p, 0
        while stack and stack[-1][1] == level:
            cur = pair_mod(stack.pop()[0], cur, p)
            level += 1
        stack.append((cur, level))
    return stack[0][0]


def residue_engine(base: int, height: int, p: int, k: int = None) -> int:
    """The same value by Babbage's method of differences at level k. The level-k nodes of an
    aligned tree are values of one polynomial of degree 2^k at evenly spaced points, so after
    tabulating its differences each further node costs 2^k additions modulo p."""
    if k is None:
        k = max(0, min(height, (height - 2) // 2))
    d, nodes = 1 << k, 1 << (height - k)
    n0 = min(nodes, d + 1)
    D = [residue_tree(base + (j << k), k, p) for j in range(n0)] + [0] * (d + 1 - n0)
    for i in range(1, n0):
        for j in range(n0 - 1, i - 1, -1):
            D[j] = (D[j] - D[j - 1]) % p
    stack = []
    for _ in range(nodes):
        cur, level = D[0], 0
        while stack and stack[-1][1] == level:
            cur = pair_mod(stack.pop()[0], cur, p)
            level += 1
        stack.append((cur, level))
        for i in range(d):
            D[i] = (D[i] + D[i + 1]) % p
    return stack[0][0]


# ------------------------------------------------------------- the hop primes, one index at a time (5.9)
def is_sprp2(n: int) -> bool:
    """Base-2 strong probable prime test for odd n > 2."""
    d, r = n - 1, 0
    while d % 2 == 0:
        d, r = d // 2, r + 1
    x = pow(2, d, n)
    if x in (1, n - 1):
        return True
    for _ in range(r - 1):
        x = x * x % n
        if x == n - 1:
            return True
    return False


@functools.lru_cache(maxsize=None)
def hop_prime(previous_event_id: bytes, j: int) -> int:
    """p_j: the smallest odd n >= 2^61 + (the top 60 bits of the first 8 bytes of
    SHA256(domain || previous_event_id || be64(j))) with no factor in SMALL_ODD_PRIMES that is a
    base-2 strong probable prime. Canonical and cheap; nothing needs a primality proof."""
    x = int.from_bytes(sha256(HOP_RESIDUE_PRIME_DOMAIN + previous_event_id + be64(j))[:8], "big") >> 4
    n = ((1 << PRIME_BITS) + x) | 1
    while any(n % q == 0 for q in SMALL_ODD_PRIMES) or not is_sprp2(n):
        n += 2
    return n


def residue_count(h_max: int) -> int:
    """m: enough 61-bit primes for Q to span a quarter of an 85 * 2^h_max bit root, rounded up
    to whole blocks of 8."""
    m = -(-(AXIS_BITS << h_max) // (WIDTH_DIVISOR * PRIME_BITS))
    return max(RESIDUE_BLOCK, -(-m // RESIDUE_BLOCK) * RESIDUE_BLOCK)


def merkle_depth(m: int) -> int:
    blocks, depth = m // RESIDUE_BLOCK, 0
    while (1 << depth) < blocks:
        depth += 1
    return depth


# ------------------------------------------------------------- the re-roll price (5.10)
def reroll_budget(h: int) -> int:
    if h < len(HOP_REROLL_BUDGET):
        return HOP_REROLL_BUDGET[h]
    n = h - (len(HOP_REROLL_BUDGET) - 1)
    return HOP_REROLL_BUDGET[-1] * 9 ** n // 4 ** n


def reroll_attempts(heights) -> int:
    """A: the summed budgets of the three axis heights and K, at least 1."""
    return max(1, sum(reroll_budget(h) for h in heights))


# ------------------------------------------------------------- everything the verifier derives from the event
def hop_geometry(previous_event_id: bytes, src_coord: int, dst_coord: int):
    """Per-axis (base, h), temporal (t_base, K), the residue count m, the Merkle depth and A."""
    x1, y1, z1, _ = coord_to_xyz(src_coord)
    x2, y2, z2, plane2 = coord_to_xyz(dst_coord)
    axes = []
    for a, b in ((x1, x2), (y1, y2), (z1, z2)):
        h = find_lca_height(a, b)
        axes.append(((a >> h) << h, h))
    K = terrain_k(x2, y2, z2, plane2)
    temporal = (temporal_base(previous_event_id, K), K)
    heights = [h for _, h in axes] + [K]
    m = residue_count(max(heights))
    return axes, temporal, m, merkle_depth(m), reroll_attempts(heights)


def hop_residue(axes, temporal, p: int, engine: bool = True) -> int:
    """hop_n mod p without hop_n: every root modulo p, then the three combining pairings modulo p."""
    f = residue_engine if engine else residue_tree
    cx, cy, cz = (f(base, h, p) for base, h in axes)
    ct = f(temporal[0], temporal[1], p)
    return pair_mod(pair_mod(pair_mod(cx, cy, p), cz, p), ct, p)


def hop_n_exact(axes, temporal) -> int:
    cx, cy, cz = (compute_subtree_cantor(base, h) for base, h in axes)
    region_n = cantor_pair(cantor_pair(cx, cy), cz)
    return cantor_pair(region_n, compute_subtree_cantor(*temporal))


# ------------------------------------------------------------- the seal (5.10)
def leaf_hash(previous_event_id: bytes, block: int, residues) -> bytes:
    return sha256(HOP_RESIDUE_LEAF_DOMAIN + previous_event_id + be64(block)
                  + b"".join(be64(r) for r in residues))


def commit(previous_event_id: bytes, residues):
    """The seal and every level of its tree. Leaves padded with PAD_LEAF to a power of two."""
    B = RESIDUE_BLOCK
    level = [leaf_hash(previous_event_id, b, residues[b * B:(b + 1) * B])
             for b in range(len(residues) // B)]
    level += [PAD_LEAF] * ((1 << merkle_depth(len(residues))) - len(level))
    levels = [level]
    while len(level) > 1:
        level = [sha256(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        levels.append(level)
    return levels[-1][0], levels


def open_block(levels, residues, block: int):
    path, i = [], block
    for level in levels[:-1]:
        path.append(level[i ^ 1])
        i //= 2
    return residues[block * RESIDUE_BLOCK:(block + 1) * RESIDUE_BLOCK], path


def verify_path(leaf: bytes, position: int, siblings, root: bytes) -> bool:
    cur, i = leaf, position
    for sib in siblings:
        cur = sha256(cur + sib) if i % 2 == 0 else sha256(sib + cur)
        i //= 2
    return cur == root


# ------------------------------------------------------------- the draw (5.10)
def attempt(previous_event_id: bytes, seal: bytes, nonce: int) -> bytes:
    """One re-roll attempt: G. Its cost is one aligned height-12 tree modulo p_0, at a base the
    seed chooses, so hash-mining hardware cannot make it cheaper."""
    seed = sha256(HOP_RESIDUE_GRIND_DOMAIN + previous_event_id + seal + be64(nonce))
    g_base = ((int.from_bytes(seed, "big") % (1 << AXIS_BITS)) >> HOP_GRIND_HEIGHT) << HOP_GRIND_HEIGHT
    r = residue_engine(g_base, HOP_GRIND_HEIGHT, hop_prime(previous_event_id, 0))
    return sha256(HOP_RESIDUE_GRIND_DOMAIN + seed + be64(r))


def meets_price(G: bytes, attempts: int) -> bool:
    """G read as a 256-bit integer must be below 2^256 / A: probability 1/A per attempt."""
    return int.from_bytes(G, "big") * attempts < (1 << 256)


def find_nonce(previous_event_id: bytes, seal: bytes, attempts: int, start: int = 0):
    nonce = start
    while True:
        G = attempt(previous_event_id, seal, nonce)
        if meets_price(G, attempts):
            return nonce, G
        nonce += 1


def sample_indices(G: bytes, m: int):
    return [int.from_bytes(sha256(HOP_RESIDUE_SAMPLE_DOMAIN + G + be32(i)), "big") % m
            for i in range(HOP_SAMPLES)]


# ------------------------------------------------------------- prove, encode, verify (5.10, 5.11, 8.4)
def prove(previous_event_id: bytes, src_coord: int, dst_coord: int):
    """Honest prover, returning the hop's proof, mn and mp tag values. This one builds hop_n and
    divides it by every prime, which is simplest to read; a fast prover reduces each root with a
    remainder tree and combines in residue space, and never builds hop_n. Same output."""
    axes, temporal, m, _, A = hop_geometry(previous_event_id, src_coord, dst_coord)
    X = hop_n_exact(axes, temporal)
    residues = [X % hop_prime(previous_event_id, j) for j in range(m)]
    seal, levels = commit(previous_event_id, residues)
    nonce, G = find_nonce(previous_event_id, seal, A)
    openings = [open_block(levels, residues, i // RESIDUE_BLOCK) for i in sample_indices(G, m)]
    return encode_tags(seal, nonce, openings)


def encode_tags(seal: bytes, nonce: int, openings):
    """proof: the seal. mn: the nonce, 16 hex. mp: the 16 openings in draw order, each its 8
    residues (16 hex each) then its siblings from the leaf level up (64 hex each)."""
    mp = "".join("".join(be64(r).hex() for r in block) + "".join(s.hex() for s in path)
                 for block, path in openings)
    return seal.hex(), be64(nonce).hex(), mp


def opening_width(depth: int) -> int:
    return 16 * RESIDUE_BLOCK + 64 * depth


def is_lower_hex(s: str, length: int) -> bool:
    return len(s) == length and all(c in LOWER_HEX for c in s)


def decode_tags(proof: str, mn: str, mp: str, depth: int):
    width = opening_width(depth)
    if not (is_lower_hex(proof, 64) and is_lower_hex(mn, 16) and is_lower_hex(mp, HOP_SAMPLES * width)):
        return None
    openings = []
    for k in range(HOP_SAMPLES):
        o = mp[k * width:(k + 1) * width]
        block = [int(o[16 * i:16 * (i + 1)], 16) for i in range(RESIDUE_BLOCK)]
        off = 16 * RESIDUE_BLOCK
        path = [bytes.fromhex(o[off + 64 * d:off + 64 * (d + 1)]) for d in range(depth)]
        openings.append((block, path))
    return bytes.fromhex(proof), int(mn, 16), openings


def verify_hop(previous_event_id: bytes, src_coord: int, dst_coord: int, proof: str, mn: str, mp: str) -> bool:
    """Level 1 (section 5.11): the tags' form, the price, then 16 residues and 16 paths."""
    axes, temporal, m, depth, A = hop_geometry(previous_event_id, src_coord, dst_coord)
    decoded = decode_tags(proof, mn, mp, depth)
    if decoded is None:
        return False
    seal, nonce, openings = decoded
    G = attempt(previous_event_id, seal, nonce)
    if not meets_price(G, A):
        return False
    for i, (block, path) in zip(sample_indices(G, m), openings):
        if block[i % RESIDUE_BLOCK] != hop_residue(axes, temporal, hop_prime(previous_event_id, i)):
            return False
        b = i // RESIDUE_BLOCK
        if not verify_path(leaf_hash(previous_event_id, b, block), b, path, seal):
            return False
    return True


def audit_hop(previous_event_id: bytes, src_coord: int, dst_coord: int, proof: str, mn: str, mp: str) -> bool:
    """Level 2 (section 5.11): Level 1, then every residue recomputed and the seal rebuilt."""
    if not verify_hop(previous_event_id, src_coord, dst_coord, proof, mn, mp):
        return False
    axes, temporal, m, _, _ = hop_geometry(previous_event_id, src_coord, dst_coord)
    X = hop_n_exact(axes, temporal)
    seal, _ = commit(previous_event_id, [X % hop_prime(previous_event_id, j) for j in range(m)])
    return seal.hex() == proof


# ------------------------------------------------------------- version 1, for the section 5.7 cross-check
def proof_hash_v1(previous_event_id: bytes, src_coord: int, dst_coord: int) -> str:
    axes, temporal, _, _, _ = hop_geometry(previous_event_id, src_coord, dst_coord)
    return sha256(sha256(int_to_bytes_be_min(hop_n_exact(axes, temporal)))).hex()


def lookup_id(src_coord: int, dst_coord: int) -> str:
    axes, _, _, _, _ = hop_geometry(bytes(32), src_coord, dst_coord)
    cx, cy, cz = (compute_subtree_cantor(base, h) for base, h in axes)
    return sha256(sha256(int_to_bytes_be_min(cantor_pair(cantor_pair(cx, cy), cz)))).hex()


if __name__ == "__main__":
    rng = random.Random(3333)
    zero, alice, bob = bytes(32), bytes(range(32)), bytes(range(32, 64))
    E = 1 << 84                                                    # Earth's center on every axis
    src = xyz_to_coord(E + 1021, E + 77, E + 5)
    dst = xyz_to_coord(E + 1024, E + 77, E + 5)                    # crosses an h11 boundary on x
    ex_src, ex_dst = xyz_to_coord(0, 0, 0), xyz_to_coord(4104, 0, 0)   # the section 5.7 movement
    checks = []

    # 1: the section 5.7 golden values, derived from the event
    checks.append(("section 5.7: K, version 1 proof_hash and lookup_id match",
                   terrain_k(4104, 0, 0, 0) == 11
                   and proof_hash_v1(zero, ex_src, ex_dst)
                   == "ed9d09ca697b2da29c9d042207ac8ef7aab40f6dde550e6467452aa0e2e8cac6"
                   and lookup_id(ex_src, ex_dst)
                   == "8d2463eb22301d97a1f7e33b90e473ba2eec69079f418a72609c3e4d2981669b"))

    # 2: a root modulo p is the same tree carried modulo p
    ok = True
    for _ in range(30):
        h = rng.randrange(0, 10)
        b = (rng.getrandbits(AXIS_BITS) >> h) << h
        p = hop_prime(alice, rng.randrange(1000))
        ok &= residue_tree(b, h, p) == compute_subtree_cantor(b, h) % p
    axes, temporal, m, depth, A = hop_geometry(alice, src, dst)
    X = hop_n_exact(axes, temporal)
    for j in (0, 1, 99):
        ok &= hop_residue(axes, temporal, hop_prime(alice, j)) == X % hop_prime(alice, j)
    checks.append(("root mod p == the tree carried mod p (axes and hop_n)", ok))

    # 3: the difference engine
    ok = all(residue_engine(b, h, p, k) == residue_tree(b, h, p)
             for h in (4, 7, 10) for k in range(0, h + 1)
             for b, p in [((rng.getrandbits(AXIS_BITS) >> h) << h, hop_prime(bob, rng.randrange(50)))])
    checks.append(("difference engine == residue tree, every k", ok))

    # 4: the primes
    primes = [hop_prime(alice, j) for j in range(m)]
    checks.append(("every prime odd, in [2^61, 2^62), index 2^32 + 1 does not wrap to 1",
                   all(p % 2 == 1 and (1 << 61) <= p < (1 << 62) for p in primes)
                   and hop_prime(alice, (1 << 32) + 1) != hop_prime(alice, 1)))

    # 5 to 7: honest, copied, shared primes
    proof, mn, mp = prove(alice, src, dst)
    checks.append(("honest proof verifies at Level 1 and Level 2",
                   verify_hop(alice, src, dst, proof, mn, mp) and audit_hop(alice, src, dst, proof, mn, mp)))
    checks.append(("copied proof fails under another previous_event_id", not verify_hop(bob, src, dst, proof, mn, mp)))
    shared = len(set(primes) & {hop_prime(bob, j) for j in range(m)})
    checks.append((f"two chain positions share {shared} of {m} primes", shared == 0))

    # 8 to 10: tampered openings and malformed tags
    seal, nonce, openings = decode_tags(proof, mn, mp, depth)
    i0 = sample_indices(attempt(alice, seal, nonce), m)[0]
    block0, path0 = openings[0]

    def with_first(block):
        return encode_tags(seal, nonce, [(block, path0)] + openings[1:])[2]

    bad = list(block0)
    bad[i0 % RESIDUE_BLOCK] ^= 1
    checks.append(("one wrong residue in an opened block is caught", not verify_hop(alice, src, dst, proof, mn, with_first(bad))))
    unreduced = list(block0)
    unreduced[i0 % RESIDUE_BLOCK] += hop_prime(alice, i0)
    checks.append(("a residue left unreduced (r + p) is rejected",
                   not verify_hop(alice, src, dst, proof, mn, with_first(unreduced))))
    short = mp[:opening_width(depth) - 64] + mp[opening_width(depth):]
    checks.append(("an mp one sibling short, a short mn, uppercase hex: all rejected",
                   not verify_hop(alice, src, dst, proof, mn, short)
                   and not verify_hop(alice, src, dst, proof, mn[1:], mp)
                   and not verify_hop(alice, src, dst, proof.upper(), mn, mp)))

    # 11, 12: the price
    bad_nonce = next(n for n in range(10 ** 6) if not meets_price(attempt(alice, seal, n), A))
    checks.append(("a nonce that misses the re-roll price is rejected",
                   A > 1 and not verify_hop(alice, src, dst, proof, be64(bad_nonce).hex(), mp)))
    multi_src = xyz_to_coord(E + 1021, E + 77, E + 5)
    multi_dst = xyz_to_coord(E + 1024, E + 128, E + 260)           # x at h11, y at h8, z at h9
    m_axes, m_temporal, _, _, m_A = hop_geometry(alice, multi_src, multi_dst)
    checks.append((f"a multi-axis hop pays the sum of its budgets (A = {m_A})",
                   m_A == sum(reroll_budget(h) for h in [h for _, h in m_axes] + [m_temporal[1]])))

    # 13: a commitment to junk
    junk = [rng.getrandbits(61) for _ in range(m)]
    jseal, jlevels = commit(alice, junk)
    jnonce, jG = find_nonce(alice, jseal, A)
    jtags = encode_tags(jseal, jnonce, [open_block(jlevels, junk, i // RESIDUE_BLOCK) for i in sample_indices(jG, m)])
    checks.append(("fabricated commitment is rejected", not verify_hop(alice, src, dst, *jtags)))

    # 14: a prover holding each true residue with probability f passes exactly when every
    # sampled residue is held, so its pass rate is f^16; Level 2 catches every one that passes
    true_res = [X % p for p in primes]
    f, trials, passes, agree, caught = 0.9, 120, 0, True, True
    for _ in range(trials):
        held = [rng.random() < f for _ in range(m)]
        mixed = [r if hd else r + 1 for r, hd in zip(true_res, held)]
        mseal, mlevels = commit(alice, mixed)
        mnonce, mG = find_nonce(alice, mseal, A)
        idx = sample_indices(mG, m)
        mtags = encode_tags(mseal, mnonce, [open_block(mlevels, mixed, i // RESIDUE_BLOCK) for i in idx])
        v = verify_hop(alice, src, dst, *mtags)
        agree &= v == all(held[i] for i in idx)
        if v:
            caught &= all(held) or not audit_hop(alice, src, dst, *mtags)
        passes += v
    checks.append((f"partial holder: Level 1 == 'all samples held' every trial, Level 2 catches "
                   f"(rate {passes / trials:.3f}, f^16 = {f ** HOP_SAMPLES:.3f})", agree and caught))

    # 15: sizes stated in section 5.12
    sizes = {h: (residue_count(h), merkle_depth(residue_count(h)),
                 HOP_SAMPLES * opening_width(merkle_depth(residue_count(h)))) for h in (20, 30)}
    checks.append((f"h20 and h30: m, depth, mp characters = {sizes[20]}, {sizes[30]}",
                   sizes[20] == (365288, 16, 18432) and sizes[30] == (374049408, 26, 28672)))

    # Golden vectors (consensus locks for other implementations).
    print("golden vectors: hop primes (previous_event_id, j) -> p_j")
    for prev, j in ((zero, 0), (zero, 1), (alice, (1 << 32) + 7)):
        print(f"  {prev.hex()[:16]}... j={j} -> {hop_prime(prev, j)}")
    p0 = hop_prime(zero, 0)
    print(f"golden vector: compute_subtree_cantor(0, 13) mod p_0(zero) = {residue_engine(0, 13, p0)}")
    print(f"golden vector: leaf_hash(zero, 0, [0..7]) = {leaf_hash(zero, 0, range(8)).hex()}")
    print(f"golden vector: attempt(zero, seal = zero, nonce = 0) = G {attempt(zero, zero, 0).hex()}")
    print("golden vector: re-roll budgets B(h) for h = 23, 30, 34, 40 -> "
          + ", ".join(str(reroll_budget(h)) for h in (23, 30, 34, 40)))
    for name, prev, s, d in (("the section 5.7 movement (0,0,0) -> (4104,0,0)", zero, ex_src, ex_dst),
                             ("a multi-axis hop near Earth's center (x h11, y h8, z h9)", alice, multi_src, multi_dst)):
        g_axes, g_temporal, g_m, g_depth, g_A = hop_geometry(prev, s, d)
        g_proof, g_mn, g_mp = prove(prev, s, d)
        g_seal, g_nonce, g_open = decode_tags(g_proof, g_mn, g_mp, g_depth)
        g_G = attempt(prev, g_seal, g_nonce)
        g_i0 = sample_indices(g_G, g_m)[0]
        print(f"golden vector: {name}, previous_event_id = {prev.hex()[:16]}...")
        print(f"  axis heights {[h for _, h in g_axes]}, K = {g_temporal[1]}, m = {g_m}, depth = {g_depth}, A = {g_A}")
        print(f"  proof (seal) = {g_proof}")
        print(f"  mn = {g_mn}, G = {g_G.hex()}")
        print(f"  first sample index = {g_i0}, residue = {g_open[0][0][g_i0 % RESIDUE_BLOCK]}")
        print(f"  mp: {len(g_mp)} characters, sha256 = {sha256(g_mp.encode()).hex()}")
    print()

    width = max(len(n) for n, _ in checks)
    for name, good in checks:
        print(f"  {name.ljust(width)}  {'ok' if good else 'FAIL'}")
    if not all(good for _, good in checks):
        raise SystemExit(1)
    print("\nall checks passed")
