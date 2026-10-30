#!/usr/bin/env python3
"""Writes hop-residue-vectors.json, the machine-readable golden vectors of residue openings,
version 2 of the hop proof (CYBERSPACE_V2 sections 5.9 to 5.13, 8.4, 8.7.1, 8.8) (stdlib only).

hop-residue-reference.py is the executable statement of those sections and prints its golden
vectors for a person to read. This script imports that file by path and writes the same
construction as one JSON file, so that every port, in any language, tests itself against the
same values without running Python: each port copies hop-residue-vectors.json unchanged into its
fixtures and records the spec commit and the file's SHA-256 in its test.

The file is not normative. It is written from the reference, and where it disagrees with the
text of CYBERSPACE_V2.md, the text is right and the file is a bug.

The file holds these groups:

  * single: the single values the reference prints (hop primes, one root modulo p_0, one leaf,
    one attempt), and a hop prime at an index above 2^32 beside the one it would wrap to
  * prover: seven hops, each with every intermediate value a prover computes (geometry, primes,
    each root and hop_n modulo p_0, residues, the seal, the attempt that meets the price with
    its seed, g_base and r_g, the draw) and its final proof, mn and mp tag values
  * checks: the 16 Level 1 checks of the section 5.7 hop, one at a time, so that a port can
    test each check on its own and name the one that failed
  * verifier: the section 5.7 hop's tags changed one way at a time, every one with the verdict
    section 5.11 gives it, two accepted controls among them
  * grandfathered_v1: version 1 hops judged against a grandfathered list that each vector
    carries itself
  * prices and sizes: B(h) for h from 0 to 60, A for sample height sets, and m, depth and the
    mp length for h_max from 0 to 47
  * provenance: the spec commit, the reference's SHA-256, this generator's name

Every value comes from the reference's own functions. The one shortcut is how the prover's
residue list is computed: rather than build hop_n and divide it by every prime, which takes
about eight minutes at h16 in pure Python, this script reduces each exact root modulo the
primes and combines the four roots with pairing modulo p, which section 5.9 states is the same
value. It checks that shortcut against the reference: for every hop but the h16 one, its tags
must equal the reference's prove() exactly, and for the h16 hop a sample of residues must equal
hop_n mod p computed from the exact hop_n. Every prover vector must pass the reference's Level 1
verify_hop, every hop but the h16 one its Level 2 audit_hop, and every verifier vector that
carries all three tags must reach its verdict under the reference's verify_hop.

The script refuses to run when the reference's SHA-256 is not the one it records, so the
provenance in the file is never stale. The output is deterministic: running this script again
writes a byte-identical file.

Usage:
  python3 -I hop-residue-vectors.py            writes hop-residue-vectors.json next to this file
  python3 -I hop-residue-vectors.py --out F    writes F instead
  python3 -I hop-residue-vectors.py --check    exits 1 unless the file on disk is what it would write
"""
import argparse
import hashlib
import importlib.util
import json
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REFERENCE_NAME = "hop-residue-reference.py"
GENERATOR_NAME = "hop-residue-vectors.py"
OUTPUT_NAME = "hop-residue-vectors.json"
# The spec commit whose reference these vectors were generated from, and that reference's
# SHA-256. If the reference changes, this script refuses to run until both are updated, so the
# provenance in the file is never stale.
SPEC_COMMIT = "8b45430af330f6e93ee763716d33868706cc2879"
REFERENCE_SHA256 = "cb42f244b998762adbae4007ea86106eea7685d88cfe847a28adcc92b504a86d"
CHAIN_RULES_REVISION = "2026-10-08-residue-openings"
JSON_SAFE = 1 << 53            # integers at or above this are written as decimal strings
PRIME_GROUP = 256              # primes reduced together through their product (same values)


def load_reference():
    path = os.path.join(HERE, REFERENCE_NAME)
    with open(path, "rb") as f:
        digest = hashlib.sha256(f.read()).hexdigest()
    if digest != REFERENCE_SHA256:
        sys.exit(f"{REFERENCE_NAME} has SHA-256 {digest}, not {REFERENCE_SHA256}: update "
                 "SPEC_COMMIT and REFERENCE_SHA256 in this script, then regenerate")
    spec = importlib.util.spec_from_file_location("hop_residue_reference", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


ref = load_reference()
sha256 = ref.sha256
be64 = ref.be64
B = ref.RESIDUE_BLOCK
E = 1 << 84                    # Earth's center on every axis


def dec(n: int) -> str:
    return str(n)


def num(n: int) -> int:
    assert 0 <= n < JSON_SAFE, n
    return n


def label_id(label: str) -> bytes:
    """A previous_event_id for a vector: SHA-256 of an ASCII label, so anybody can rebuild it."""
    return sha256(label.encode("ascii"))


def coord_hex(coord: int) -> str:
    return coord.to_bytes(32, "big").hex()


# ------------------------------------------------------------- a destination whose terrain K is 0
def nibble(bits: int, x: int, y: int, z: int, plane: int) -> int:
    cell = ref.xyz_to_coord((x >> bits) << bits, (y >> bits) << bits, (z >> bits) << bits, plane)
    return sha256(ref.TERRAIN_DOMAIN_V2 + bytes([bits]) + cell.to_bytes(32, "big"))[0] & 0x0F


def find_k_zero(x0: int, y0: int, z0: int, plane: int):
    """The first point, in a fixed search order from (x0, y0, z0), at which all four terrain
    nibbles of section 5.2 are 0, so K = 0. Each coarser cell is fixed before the finer ones are
    searched inside it, so the search takes thousands of hashes rather than 65,536 tries."""
    levels = sorted(ref.TERRAIN_CELL_BITS, reverse=True)       # 11, 9, 7, 3

    def search(depth, x, y, z):
        bits = levels[depth]
        span = 1 << ((levels[depth - 1] if depth else bits + 4) - bits)
        for a in range(span):
            for b in range(span):
                for c in range(span):
                    px, py, pz = x + (a << bits), y + (b << bits), z + (c << bits)
                    if nibble(bits, px, py, pz, plane):
                        continue
                    if depth == len(levels) - 1:
                        return px, py, pz
                    found = search(depth + 1, px, py, pz)
                    if found:
                        return found
        return None

    point = search(0, x0, y0, z0)
    assert point is not None and ref.terrain_k(*point, plane) == 0
    return point


# ------------------------------------------------------------- the hops
def hop_cases():
    zero, alice = bytes(32), bytes(range(32))
    kx, ky, kz = find_k_zero(E, E, E, 0)
    pz = next(z for z in range(E + 7100, E + 8192, 8)
              if ref.terrain_k(E + 5003, E + 6000, z, 1) != ref.terrain_k(E + 5003, E + 6000, z, 0))
    k1, k0 = ref.terrain_k(E + 5003, E + 6000, pz, 1), ref.terrain_k(E + 5003, E + 6000, pz, 0)
    return [
        ("golden-5.7",
         "The movement of section 5.7, (0, 0, 0) -> (4104, 0, 0) on plane 0, with "
         "previous_event_id equal to 32 zero bytes: the golden vector of section 5.10.",
         zero, (0, 0, 0, 0), (4104, 0, 0, 0)),
        ("multi-axis-earth",
         "A hop near Earth's center that moves on all three axes (x at h11, y at h8, z at h9) "
         "with a nonzero previous_event_id (the bytes 0x00 to 0x1f): the second hop the "
         "reference prints.",
         alice, (E + 1021, E + 77, E + 5, 0), (E + 1024, E + 128, E + 260, 0)),
        ("plane-only-k-positive",
         "A hop that changes only the plane, from 0 to 1, so every axis is at h0 and h_max is "
         "K, which is above 0 here. previous_event_id is SHA-256 of the ASCII label "
         "'hop-residue-vectors plane-only'.",
         label_id("hop-residue-vectors plane-only"),
         (E + 1000, E + 2000, E + 3000, 0), (E + 1000, E + 2000, E + 3000, 1)),
        ("k-zero-axis-h6",
         "A hop with K = 0 and one axis at h6, the first height with a nonzero re-roll "
         "budget: A = B(6) = 1. The destination is the first point near Earth's center whose "
         "four terrain nibbles are all 0. previous_event_id is SHA-256 of the ASCII label "
         "'hop-residue-vectors k-zero h6'.",
         label_id("hop-residue-vectors k-zero h6"),
         (kx ^ 32, ky, kz, 0), (kx, ky, kz, 0)),
        ("h0-k-zero",
         "A hop with every axis at h0 and K = 0, a change of plane from 1 to 0 onto the same "
         "K = 0 point: m = 8, one leaf, depth 0, A = 1, so the seal is leaf_0 and each opening "
         "carries no siblings. previous_event_id is SHA-256 of the ASCII label "
         "'hop-residue-vectors h0 k-zero'.",
         label_id("hop-residue-vectors h0 k-zero"),
         (kx, ky, kz, 1), (kx, ky, kz, 0)),
        ("into-plane-1",
         "A hop that moves on x and z and crosses from plane 0 into plane 1, so K is derived "
         f"with the plane bit set: K is {k1} here, and the same point on plane 0 has K = {k0}, "
         "so a port that drops the plane bit gets a different K. The destination's z is the "
         "first, counting up from Earth's center + 7100 in steps of 8, at which the two planes "
         "give different K. previous_event_id is SHA-256 of the ASCII label "
         "'hop-residue-vectors into plane 1'.",
         label_id("hop-residue-vectors into plane 1"),
         (E + 5000, E + 6000, E + 7000, 0), (E + 5003, E + 6000, pz, 1)),
        ("h16-one-axis",
         "A hop at h16 on x alone, near Earth's center, large enough that every level of a "
         "port's residue engine above the trivial ones is exercised. previous_event_id is "
         "SHA-256 of the ASCII label 'hop-residue-vectors h16'.",
         label_id("hop-residue-vectors h16"),
         (E + 32767, E, E, 0), (E + 32768, E, E, 0)),
    ]


def residues_of(prev: bytes, axes, temporal, m: int):
    """r_j = hop_n mod p_j for every j, as section 5.9 states it: each exact root modulo p_j,
    then the three combining pairings modulo p_j. Primes are reduced in groups through their
    product first, which gives the same remainders and is several times faster."""
    roots = [ref.compute_subtree_cantor(base, h) for base, h in axes]
    roots.append(ref.compute_subtree_cantor(*temporal))
    out = []
    for g in range(0, m, PRIME_GROUP):
        primes = [ref.hop_prime(prev, j) for j in range(g, min(m, g + PRIME_GROUP))]
        reduced = [r % math.prod(primes) for r in roots]
        for p in primes:
            cx, cy, cz, ct = (r % p for r in reduced)
            out.append(ref.pair_mod(ref.pair_mod(ref.pair_mod(cx, cy, p), cz, p), ct, p))
    return out


def attempt_parts(prev: bytes, seal: bytes, nonce: int):
    """The reference's attempt() with its intermediate values: seed, g_base, r_g and G."""
    seed = sha256(ref.HOP_RESIDUE_GRIND_DOMAIN + prev + seal + be64(nonce))
    g_base = ((int.from_bytes(seed, "big") % (1 << ref.AXIS_BITS)) >> ref.HOP_GRIND_HEIGHT) << ref.HOP_GRIND_HEIGHT
    p0 = ref.hop_prime(prev, 0)
    r_g = ref.residue_engine(g_base, ref.HOP_GRIND_HEIGHT, p0)
    assert r_g == ref.compute_subtree_cantor(g_base, ref.HOP_GRIND_HEIGHT) % p0
    G = sha256(ref.HOP_RESIDUE_GRIND_DOMAIN + seed + be64(r_g))
    assert G == ref.attempt(prev, seal, nonce)
    return {"nonce": num(nonce), "seed": seed.hex(), "g_base": dec(g_base), "r_g": dec(r_g), "G": G.hex()}


def roots_mod_p0(prev: bytes, axes, temporal, r0: int):
    """Each root modulo p_0, by the reference's residue tree, and the three pairings to hop_n mod p_0."""
    p0 = ref.hop_prime(prev, 0)
    cx, cy, cz = (ref.residue_tree(base, h, p0) for base, h in axes)
    ct = ref.residue_tree(temporal[0], temporal[1], p0)
    hop = ref.pair_mod(ref.pair_mod(ref.pair_mod(cx, cy, p0), cz, p0), ct, p0)
    assert hop == r0 == ref.hop_residue(axes, temporal, p0)
    return {"x": dec(cx), "y": dec(cy), "z": dec(cz), "t": dec(ct), "hop_n": dec(hop)}


def build_hop(name, description, prev, src_xyzp, dst_xyzp):
    src, dst = ref.xyz_to_coord(*src_xyzp), ref.xyz_to_coord(*dst_xyzp)
    axes, temporal, m, depth, A = ref.hop_geometry(prev, src, dst)
    residues = residues_of(prev, axes, temporal, m)
    primes = [ref.hop_prime(prev, j) for j in range(m)]
    seal, levels = ref.commit(prev, residues)
    nonce, G = ref.find_nonce(prev, seal, A)
    indices = ref.sample_indices(G, m)
    openings = [ref.open_block(levels, residues, i // B) for i in indices]
    proof, mn, mp = ref.encode_tags(seal, nonce, openings)

    small = max(h for _, h in axes) < 16
    if small:
        # The shortcut against the reference's own prover and its Level 2 audit.
        assert (proof, mn, mp) == ref.prove(prev, src, dst), name
        assert ref.audit_hop(prev, src, dst, proof, mn, mp), name
    else:
        # A sample of residues against hop_n mod p from the exact hop_n.
        X = ref.hop_n_exact(axes, temporal)
        sample = sorted(set(range(8)) | {m - 1} | set(indices)
                        | set(random.Random(name).sample(range(m), 32)))
        assert all(residues[j] == X % primes[j] for j in sample), name
    assert ref.verify_hop(prev, src, dst, proof, mn, mp), name
    assert len(mp) == ref.HOP_SAMPLES * ref.opening_width(depth)

    heights = [h for _, h in axes] + [temporal[1]]
    vector = {
        "name": name,
        "description": description,
        "previous_event_id": prev.hex(),
        "c": coord_hex(src),
        "C": coord_hex(dst),
        "from": dict(zip(("x", "y", "z"), map(dec, src_xyzp[:3])), plane=src_xyzp[3]),
        "to": dict(zip(("x", "y", "z"), map(dec, dst_xyzp[:3])), plane=dst_xyzp[3]),
        "axes": [{"axis": a, "base": dec(base), "height": h} for a, (base, h) in zip("xyz", axes)],
        "K": temporal[1],
        "t_base": dec(temporal[0]),
        "h_max": max(heights),
        "m": num(m),
        "blocks": num(m // B),
        "depth": depth,
        "A": dec(A),
        "primes_first_8": [dec(p) for p in primes[:8]],
        "prime_last": dec(primes[-1]),
        "primes_sha256": sha256(b"".join(be64(p) for p in primes)).hex(),
        "residues_first_8": [dec(r) for r in residues[:8]],
        "residues_sha256": sha256(b"".join(be64(r) for r in residues)).hex(),
        "roots_mod_p0": roots_mod_p0(prev, axes, temporal, residues[0]),
        "leaf_0": levels[0][0].hex(),
        "seal": seal.hex(),
        "nonce": num(nonce),
        "G": G.hex(),
        "attempt": attempt_parts(prev, seal, nonce),
        "attempt_nonce_0": ref.attempt(prev, seal, 0).hex(),
        "indices": [num(i) for i in indices],
        "tags": {"proof": proof, "mn": mn, "mp": mp},
        "mp_length": len(mp),
        "mp_sha256": sha256(mp.encode("ascii")).hex(),
    }
    state = {"prev": prev, "src": src, "dst": dst, "axes": axes, "temporal": temporal, "m": m,
             "depth": depth, "A": A, "residues": residues, "levels": levels, "seal": seal,
             "nonce": nonce, "G": G, "indices": indices, "openings": openings,
             "proof": proof, "mn": mn, "mp": mp}
    return vector, state


# ------------------------------------------------------------- the 16 checks, one at a time
def checks_of(name, s):
    width = ref.opening_width(s["depth"])
    samples = []
    for i, (idx, (block, path)) in enumerate(zip(s["indices"], s["openings"])):
        p = ref.hop_prime(s["prev"], idx)
        expected = ref.hop_residue(s["axes"], s["temporal"], p)
        b = idx // B
        leaf = ref.leaf_hash(s["prev"], b, block)
        assert expected == block[idx % B] == s["residues"][idx]
        assert ref.verify_path(leaf, b, path, s["seal"])
        samples.append({
            "i": i,
            "index": idx,
            "block": b,
            "position": idx % B,
            "prime": dec(p),
            "residue": dec(expected),
            "block_residues": [dec(r) for r in block],
            "leaf": leaf.hex(),
            "siblings": [x.hex() for x in path],
            "mp_offset": i * width,
        })
    return {"hop": name, "samples": samples}


# ------------------------------------------------------------- Level 1 with the failing step named
def first_failure(prev, src, dst, proof, mn, mp):
    """The reference's verify_hop, step by step in the order of section 5.11, returning the first
    check that fails, or None. The generator asserts it agrees with verify_hop on every vector."""
    axes, temporal, m, depth, A = ref.hop_geometry(prev, src, dst)
    decoded = ref.decode_tags(proof, mn, mp, depth)
    if decoded is None:
        return {"step": "form"}
    seal, nonce, openings = decoded
    G = ref.attempt(prev, seal, nonce)
    if not ref.meets_price(G, A):
        return {"step": "price"}
    for i, (idx, (block, path)) in enumerate(zip(ref.sample_indices(G, m), openings)):
        if block[idx % B] != ref.hop_residue(axes, temporal, ref.hop_prime(prev, idx)):
            return {"step": "residue", "sample": i}
        b = idx // B
        if not ref.verify_path(ref.leaf_hash(prev, b, block), b, path, seal):
            return {"step": "path", "sample": i}
    return None


def mp_with_first(s, block):
    """The hop's mp with opening 0's block replaced."""
    return ref.encode_tags(s["seal"], s["nonce"], [(block, s["openings"][0][1])] + s["openings"][1:])[2]


def verifier_vectors(s):
    prev, src, dst, A = s["prev"], s["src"], s["dst"], s["A"]
    proof, mn, mp, seal = s["proof"], s["mn"], s["mp"], s["seal"]
    width = ref.opening_width(s["depth"])
    idx0 = s["indices"][0]
    block0 = s["openings"][0][0]
    pos0 = idx0 % B
    cases = []

    def case(name, description, tags, expected, prev_id=prev):
        cases.append((name, description, prev_id, tags, expected))

    case("golden-accepted", "The section 5.7 hop's tags unchanged.",
         {"proof": proof, "mn": mn, "mp": mp}, "accept")

    # Another nonce that meets the price, with a hex letter in its mn, and its own openings.
    alt = next(n for n in range(s["nonce"] + 1, 1 << 20)
               if ref.meets_price(ref.attempt(prev, seal, n), A) and any(ch in "abcdef" for ch in be64(n).hex()))
    alt_G = ref.attempt(prev, seal, alt)
    alt_openings = [ref.open_block(s["levels"], s["residues"], i // B) for i in ref.sample_indices(alt_G, s["m"])]
    alt_proof, alt_mn, alt_mp = ref.encode_tags(seal, alt, alt_openings)
    case("other-nonce-accepted",
         f"The same seal with nonce {alt}, the first nonce above {s['nonce']} that meets the "
         "price and whose mn contains a hex letter, and the openings drawn under its own G. Any "
         "nonce that meets the price is valid (section 5.10), so this is accepted. The vectors "
         "mn-uppercase and openings-under-another-G are built from it.",
         {"proof": alt_proof, "mn": alt_mn, "mp": alt_mp}, "accept")

    flipped = list(block0)
    flipped[pos0] ^= 1
    case("sampled-residue-flipped",
         f"In opening 0, the sampled residue (position {pos0} of block {idx0 // B}) has its "
         "lowest bit flipped.",
         {"proof": proof, "mn": mn, "mp": mp_with_first(s, flipped)}, "reject")

    other = (pos0 + 1) % B
    flipped_other = list(block0)
    flipped_other[other] ^= 1
    case("unsampled-residue-flipped",
         f"In opening 0, a residue the sample does not name (position {other} of block "
         f"{idx0 // B}) has its lowest bit flipped, so the residue check passes and the leaf "
         "no longer climbs to the seal.",
         {"proof": proof, "mn": mn, "mp": mp_with_first(s, flipped_other)}, "reject")

    unreduced = list(block0)
    unreduced[pos0] += ref.hop_prime(prev, idx0)
    case("residue-unreduced",
         "In opening 0, the sampled residue is written as r + p, the same value modulo p but "
         "not reduced. It still fits in 16 hex characters.",
         {"proof": proof, "mn": mn, "mp": mp_with_first(s, unreduced)}, "reject")

    case("mp-one-sibling-short",
         "Opening 0 loses its last sibling (64 characters), so mp is 64 characters short.",
         {"proof": proof, "mn": mn, "mp": mp[:width - 64] + mp[width:]}, "reject")
    case("mp-one-character-long", "mp with one extra '0' at the end.",
         {"proof": proof, "mn": mn, "mp": mp + "0"}, "reject")
    case("mn-one-character-short", "mn with its first character removed (15 characters).",
         {"proof": proof, "mn": mn[1:], "mp": mp}, "reject")
    case("proof-uppercase", "proof written in uppercase hex; the same value otherwise.",
         {"proof": proof.upper(), "mn": mn, "mp": mp}, "reject")
    case("mn-uppercase",
         "The accepted other-nonce vector with its mn written in uppercase hex; the same value "
         "otherwise.",
         {"proof": alt_proof, "mn": alt_mn.upper(), "mp": alt_mp}, "reject")
    case("mp-uppercase", "mp written in uppercase hex; the same values otherwise.",
         {"proof": proof, "mn": mn, "mp": mp.upper()}, "reject")

    miss = next(n for n in range(1 << 20) if not ref.meets_price(ref.attempt(prev, seal, n), A))
    case("nonce-misses-price",
         f"mn is nonce {miss}, the first nonce counting up from 0 whose G does not satisfy "
         "G x A < 2^256.",
         {"proof": proof, "mn": be64(miss).hex(), "mp": mp}, "reject")
    case("openings-under-another-G",
         f"mn is nonce {alt}, which meets the price, but mp holds the openings drawn under the "
         f"G of nonce {s['nonce']}.",
         {"proof": proof, "mn": alt_mn, "mp": mp}, "reject")

    # Lax hex: each mn below is 16 characters that Python's int(s, 16) reads as the golden nonce,
    # which meets the price, so only the form check of section 8.4 rejects them.
    for name, bad_mn, what in (("mn-0x-prefix", "0x" + mn[2:], "a '0x' prefix"),
                               ("mn-plus-sign", "+" + mn[1:], "a leading '+'"),
                               ("mn-underscore", mn[:4] + "_" + mn[5:], "an '_' between digits")):
        assert len(bad_mn) == 16 and int(bad_mn, 16) == s["nonce"]
        case(name, f"mn is 16 characters with {what}, which a lenient hex parser reads as nonce "
             f"{s['nonce']}, the golden nonce; it is not 16 lowercase hex digits.",
             {"proof": proof, "mn": bad_mn, "mp": mp}, "reject")
    case("mp-letter-g", "mp with its last character replaced by 'g'; the same length otherwise.",
         {"proof": proof, "mn": mn, "mp": mp[:-1] + "g"}, "reject")
    case("proof-with-space", "proof with its first character replaced by a space; still 64 characters.",
         {"proof": " " + proof[1:], "mn": mn, "mp": mp}, "reject")
    case("mn-missing", "The golden proof and mp, and no mn tag.", {"proof": proof, "mp": mp}, "reject")
    case("mp-missing", "The golden proof and mn, and no mp tag.", {"proof": proof, "mn": mn}, "reject")

    # Failures past sample 0.
    last = ref.HOP_SAMPLES - 1
    flipped_last = list(s["openings"][last][0])
    flipped_last[s["indices"][last] % B] ^= 1
    openings = list(s["openings"])
    openings[last] = (flipped_last, openings[last][1])
    case("last-sampled-residue-flipped",
         f"In opening {last}, the last one, the sampled residue has its lowest bit flipped; "
         f"openings 0 to {last - 1} are untouched and pass.",
         {"proof": proof, "mn": mn, "mp": ref.encode_tags(seal, s["nonce"], openings)[2]}, "reject")

    mid, level = 7, s["depth"] // 2
    path = list(s["openings"][mid][1])
    path[level] = path[level][:-1] + bytes([path[level][-1] ^ 1])
    openings = list(s["openings"])
    openings[mid] = (openings[mid][0], path)
    case("middle-sibling-flipped",
         f"In opening {mid}, sibling {level} (counting from 0 at the leaf level) has the lowest "
         "bit of its last byte flipped, so its residue check passes and its path misses the seal.",
         {"proof": proof, "mn": mn, "mp": ref.encode_tags(seal, s["nonce"], openings)[2]}, "reject")

    a, b = 3, 4
    assert s["indices"][a] // B != s["indices"][b] // B
    openings = list(s["openings"])
    openings[a], openings[b] = openings[b], openings[a]
    case("two-openings-swapped",
         f"Openings {a} and {b}, of different blocks, change places; each is a true opening, "
         "in the wrong slot.",
         {"proof": proof, "mn": mn, "mp": ref.encode_tags(seal, s["nonce"], openings)[2]}, "reject")

    other_prev = bytes(range(32))
    case("copied-to-another-previous-event-id-misses-price",
         "The section 5.7 hop's tags unchanged, on a hop with the same c and C whose "
         "previous_event_id is the bytes 0x00 to 0x1f; under that previous_event_id the golden "
         "nonce misses the price.",
         {"proof": proof, "mn": mn, "mp": mp}, "reject", other_prev)
    regrind = next(n for n in range(1 << 20) if ref.meets_price(ref.attempt(other_prev, seal, n), A))
    case("copied-to-another-previous-event-id-reground",
         "The section 5.7 hop's seal and mp, on a hop with the same c and C whose "
         f"previous_event_id is the bytes 0x00 to 0x1f, with mn re-ground to nonce {regrind}, the "
         "first that meets the price under that previous_event_id: it passes the price and fails "
         "at the openings, because the primes, leaves and draw all change with the "
         "previous_event_id.",
         {"proof": proof, "mn": be64(regrind).hex(), "mp": mp}, "reject", other_prev)

    rng = random.Random("hop-residue-vectors fabricated")
    junk = [rng.getrandbits(61) for _ in range(s["m"])]
    jseal, jlevels = ref.commit(prev, junk)
    jnonce, jG = ref.find_nonce(prev, jseal, A)
    jtags = ref.encode_tags(jseal, jnonce, [ref.open_block(jlevels, junk, i // B)
                                            for i in ref.sample_indices(jG, s["m"])])
    case("fabricated-commitment",
         f"A list of {s['m']} random 61-bit values (Python random.Random seeded with the string "
         "'hop-residue-vectors fabricated') sealed, ground to the first nonce that meets the "
         "price and opened honestly: it passes the price and fails the first residue check.",
         dict(zip(("proof", "mn", "mp"), jtags)), "reject")

    out = []
    for name, description, prev_id, tags, expected in cases:
        if all(k in tags for k in ("proof", "mn", "mp")):
            verdict = ref.verify_hop(prev_id, src, dst, tags["proof"], tags["mn"], tags["mp"])
            failure = first_failure(prev_id, src, dst, tags["proof"], tags["mn"], tags["mp"])
        else:
            verdict, failure = False, {"step": "form"}      # a hop with mn or mp missing (8.7.1 step 7)
        assert verdict == (expected == "accept") == (failure is None), name
        out.append({"name": name, "description": description, "previous_event_id": prev_id.hex(),
                    "c": coord_hex(src), "C": coord_hex(dst), "tags": tags,
                    "expected": expected, "first_failure": failure})
    failures = {v["name"]: v["first_failure"] for v in out}
    assert failures["fabricated-commitment"] == {"step": "residue", "sample": 0}
    assert failures["last-sampled-residue-flipped"] == {"step": "residue", "sample": last}
    assert failures["middle-sibling-flipped"] == {"step": "path", "sample": mid}
    assert failures["two-openings-swapped"]["sample"] == a
    assert failures["copied-to-another-previous-event-id-misses-price"] == {"step": "price"}
    assert failures["copied-to-another-previous-event-id-reground"]["step"] in ("residue", "path")
    return out


# ------------------------------------------------------------- version 1 hops and the grandfathered list
V1_STAND_IN_ID = sha256(b"hop-residue-vectors stand-in id of a version 1 hop").hex()
V1_OTHER_ID = sha256(b"hop-residue-vectors another listed id").hex()


def parse_grandfathered(text: str):
    """Section 5.13: each non-empty line that does not begin with '#' starts with a 64-character
    lowercase hex event id; anything after the id on that line is commentary."""
    ids = set()
    for line in text.split("\n"):
        if not line or line.startswith("#"):
            continue
        assert ref.is_lower_hex(line[:64], 64), line
        ids.add(line[:64])
    return ids


def v1_verdict(event_id: str, tags, listed: str, depth: int) -> str:
    """Section 8.7.1 step 7 for a hop without both mn and mp: its proof is accepted without
    recomputation when its id is listed, the proof is 32-byte lowercase hex and any mn or mp it
    carries is well formed (section 8.8); an unlisted hop missing mn or mp is rejected."""
    assert not ("mn" in tags and "mp" in tags)
    if event_id not in parse_grandfathered(listed) or not ref.is_lower_hex(tags["proof"], 64):
        return "reject"
    if "mn" in tags and not ref.is_lower_hex(tags["mn"], 16):
        return "reject"
    if "mp" in tags and not ref.is_lower_hex(tags["mp"], ref.HOP_SAMPLES * ref.opening_width(depth)):
        return "reject"
    return "accept"


def v1_vectors(s):
    v1 = ref.proof_hash_v1(s["prev"], s["src"], s["dst"])
    assert v1 == "ed9d09ca697b2da29c9d042207ac8ef7aab40f6dde550e6467452aa0e2e8cac6"
    header = "# grandfathered-v1-hops.txt, injected for this vector only\n"
    lists = [
        ("version-1-listed",
         "A version 1 hop (the section 5.7 movement, its section 5.6 proof_hash in proof, no "
         "mn and no mp) whose id is on the list, with commentary after the id: its proof is "
         "accepted without recomputation, and everything else about the hop is checked as for "
         "any other hop.",
         header + f"{V1_OTHER_ID}\n{V1_STAND_IN_ID} the section 5.7 movement, version 1\n", "accept"),
        ("version-1-unlisted",
         "The same version 1 hop with a list that does not contain its id; the list carries "
         "the id only on a comment line, which names nothing. A version 1 hop that is not "
         "listed is rejected (section 5.13).",
         header + f"{V1_OTHER_ID}\n# {V1_STAND_IN_ID}\n", "reject"),
        ("version-1-listed-with-mn",
         "The listed version 1 hop, also carrying one well-formed mn tag (the golden mn) and no "
         "mp. A listed hop MAY lack mn and mp, and a tag it may lack appears exactly once when "
         "it is carried (section 8.8); its proof is still accepted without steps 8 to 11 of "
         "section 8.7.1, so the mn is never checked against it.",
         header + f"{V1_OTHER_ID}\n{V1_STAND_IN_ID} the section 5.7 movement, version 1\n", "accept"),
        ("version-1-listed-with-mp",
         "The listed version 1 hop, also carrying one well-formed mp tag (the golden mp, of the "
         "width section 8.4 gives this hop) and no mn; accepted for the same reason.",
         header + f"{V1_OTHER_ID}\n{V1_STAND_IN_ID} the section 5.7 movement, version 1\n", "accept"),
    ]
    extra = {"version-1-listed-with-mn": {"mn": s["mn"]}, "version-1-listed-with-mp": {"mp": s["mp"]}}
    out = []
    for name, description, listed, expected in lists:
        tags = {"proof": v1, **extra.get(name, {})}
        assert v1_verdict(V1_STAND_IN_ID, tags, listed, s["depth"]) == expected, name
        out.append({"name": name, "description": description, "event_id": V1_STAND_IN_ID,
                    "previous_event_id": s["prev"].hex(), "c": coord_hex(s["src"]),
                    "C": coord_hex(s["dst"]), "tags": tags, "grandfathered_v1_hops": listed,
                    "expected": expected})
    return out


# ------------------------------------------------------------- prices and sizes
def prices():
    budgets = [{"h": h, "B": dec(ref.reroll_budget(h))} for h in range(61)]
    printed = [{"h": h, "B": dec(ref.reroll_budget(h))} for h in (23, 30, 34, 40)]
    sets = [(0, 0, 0, 0), (13, 0, 0, 11), (6, 0, 0, 0), (11, 8, 9, 0), (20, 0, 0, 8),
            (23, 0, 0, 0), (30, 0, 0, 0), (34, 0, 0, 0), (40, 0, 0, 0), (30, 30, 30, 16),
            (60, 60, 60, 16)]
    attempts = [{"heights": list(hs), "A": dec(ref.reroll_attempts(hs))} for hs in sets]
    assert ref.reroll_attempts((13, 0, 0, 11)) == 179 and ref.reroll_budget(22) == 223681
    return {"budgets": budgets, "reference_printed_budgets": printed, "attempts": attempts}


def sizes():
    out = []
    for h in range(48):
        m = ref.residue_count(h)
        d = ref.merkle_depth(m)
        out.append({"h_max": h, "m": num(m), "depth": d,
                    "mp_length": ref.HOP_SAMPLES * ref.opening_width(d)})
    assert out[20] == {"h_max": 20, "m": 365288, "depth": 16, "mp_length": 18432}
    assert out[47] == {"h_max": 47, "m": 49027403730344, "depth": 43, "mp_length": 46080}
    return out


# ------------------------------------------------------------- the file
def single():
    """The single values the reference prints under 'golden vectors', asserted against the
    values it prints, and p_j at j = 2^32 + 1 beside p_1, which a port that truncates j to 32
    bits computes in its place."""
    zero, alice = bytes(32), bytes(range(32))
    p0 = ref.hop_prime(zero, 0)
    printed = [
        ("hop_prime", {"previous_event_id": zero.hex(), "j": 0}, ref.hop_prime(zero, 0),
         2501841973170584791),
        ("hop_prime", {"previous_event_id": zero.hex(), "j": 1}, ref.hop_prime(zero, 1),
         2618389119072288907),
        ("hop_prime", {"previous_event_id": alice.hex(), "j": (1 << 32) + 7},
         ref.hop_prime(alice, (1 << 32) + 7), 2312994185035543211),
        ("compute_subtree_cantor mod p_0", {"base": "0", "height": 13, "previous_event_id": zero.hex()},
         ref.residue_engine(0, 13, p0), 1029284475922672212),
    ]
    out = []
    for function, args, value, want in printed:
        assert value == want, (function, args)
        out.append({"function": function, "arguments": args, "value": dec(value)})
    assert ref.compute_subtree_cantor(0, 13) % p0 == 1029284475922672212
    leaf = ref.leaf_hash(zero, 0, range(8)).hex()
    assert leaf == "00c942b65989da9b328046529a5a562f5b84c8ea7e8efede74327049ef56980c"
    out.append({"function": "leaf_hash", "arguments": {"previous_event_id": zero.hex(), "block": 0,
                                                        "residues": [dec(r) for r in range(8)]},
                "value": leaf})
    G = ref.attempt(zero, zero, 0).hex()
    assert G == "1439c95b252433fb12119e3c1cf65b6c15e951cb29e45b072bdece84d9695ea0"
    out.append({"function": "attempt", "arguments": {"previous_event_id": zero.hex(),
                                                      "seal": zero.hex(), "nonce": 0}, "value": G})
    wide, narrow = ref.hop_prime(alice, (1 << 32) + 1), ref.hop_prime(alice, 1)
    assert wide != narrow
    out.append({"function": "hop_prime", "arguments": {"previous_event_id": alice.hex(), "j": (1 << 32) + 1},
                "value": dec(wide),
                "note": "differs from hop_prime at j = 1 (" + dec(narrow) + "), the prime a port "
                        "computes if it truncates j to 32 bits; be64(j) carries all 64 bits"})
    return out


def constants():
    return {
        "HOP_RESIDUE_PRIME_DOMAIN": ref.HOP_RESIDUE_PRIME_DOMAIN.decode("ascii"),
        "HOP_RESIDUE_LEAF_DOMAIN": ref.HOP_RESIDUE_LEAF_DOMAIN.decode("ascii"),
        "HOP_RESIDUE_GRIND_DOMAIN": ref.HOP_RESIDUE_GRIND_DOMAIN.decode("ascii"),
        "HOP_RESIDUE_SAMPLE_DOMAIN": ref.HOP_RESIDUE_SAMPLE_DOMAIN.decode("ascii"),
        "HOP_SAMPLES": ref.HOP_SAMPLES,
        "RESIDUE_BLOCK": ref.RESIDUE_BLOCK,
        "PRIME_BITS": ref.PRIME_BITS,
        "WIDTH_DIVISOR": ref.WIDTH_DIVISOR,
        "HOP_GRIND_HEIGHT": ref.HOP_GRIND_HEIGHT,
        "SMALL_ODD_PRIMES": list(ref.SMALL_ODD_PRIMES),
        "HOP_REROLL_BUDGET": [dec(b) for b in ref.HOP_REROLL_BUDGET],
        "PAD_LEAF": ref.PAD_LEAF.hex(),
    }


FORMAT = [
    "Every hex string is lowercase, except inside the verifier vectors that test uppercase.",
    "c and C are the hop's coordinates as their tags carry them, 64 hex characters; from and "
    "to give the same coordinates as x, y, z and plane.",
    "Bases, t_base, coordinates on an axis, primes, residues, budgets B and prices A are "
    "decimal strings, whatever their size, because many exceed 2^53 and a JSON parser may not "
    "read such a number exactly. Heights, K, h_max, m, blocks, depth, nonce, indices, offsets "
    "and lengths are JSON numbers, and every one of them is below 2^53.",
    "primes_sha256 is SHA-256 over be64(p_0) || ... || be64(p_(m-1)); residues_sha256 is "
    "SHA-256 over be64(r_0) || ... || be64(r_(m-1)); mp_sha256 is SHA-256 over the mp tag "
    "value as ASCII.",
    "attempt_nonce_0 is G for nonce 0 under the hop's seal, whether or not it meets the price.",
    "In checks, mp_offset is where opening i starts in the mp tag value, in characters, and "
    "siblings run from the leaf level upward.",
    "In verifier, a tag missing from tags is missing from the event. first_failure names the "
    "first check that fails when the steps of section 5.11 run in order (form, price, then for "
    "each sample in ascending i its residue and then its path); a port that orders its checks "
    "differently reaches the same expected verdict, and may fail at a different step. A "
    "vector with mn or mp missing fails at form (section 8.7.1 step 7).",
    "In grandfathered_v1, event_id is a stand-in, SHA-256 of an ASCII label rather than the "
    "NIP-01 hash of a signed event, because the vector tests only the list lookup of section "
    "8.7.1 step 7, and grandfathered_v1_hops is the text of a list in the format of "
    "grandfathered-v1-hops.txt that the vector injects in place of the real one. expected is "
    "the verdict on the hop's proof; the rest of the hop is checked as for any other hop.",
    "In prover, roots_mod_p0 gives each axis root and the temporal root modulo p_0, and hop_n "
    "modulo p_0, which is r_0; attempt gives the seed, g_base, r_g and G of the attempt whose "
    "nonce meets the price.",
    "In single, each entry names the reference function and its arguments, as the reference "
    "prints them, with ids written as hex.",
]


def build():
    hops, states = [], {}
    for case in hop_cases():
        vector, state = build_hop(*case)
        hops.append(vector)
        states[vector["name"]] = state
    golden = states["golden-5.7"]
    # The golden values section 5.10 states.
    assert golden["proof"] == "c5524980e1b021dc49fb64d14a521456a48693d0711a886516c1f4ab733db5cb"
    assert golden["mn"] == "0000000000000057"
    assert golden["G"].hex() == "003e95fef5d92b12ea28d8d2ac538c91712219afaab153f2ee1a94f6a6d64e40"
    assert golden["indices"][0] == 2092 and golden["residues"][2092] == 2707389969566835098
    assert (golden["m"], golden["depth"], golden["A"]) == (2856, 9, 179)
    assert [ref.hop_prime(bytes(32), j) for j in (0, 1)] == [2501841973170584791, 2618389119072288907]
    assert sha256(golden["mp"].encode("ascii")).hex() == \
        "3d5d88eba8a384d134bba7ba00ea48b7188802c482f011fbef3b8100ccbc4e93"
    multi = states["multi-axis-earth"]
    assert [h for _, h in multi["axes"]] == [11, 8, 9]
    with open(os.path.join(HERE, REFERENCE_NAME), "rb") as f:
        reference_sha = hashlib.sha256(f.read()).hexdigest()
    return {
        "description": "Golden vectors of residue openings, version 2 of the hop proof "
                       "(CYBERSPACE_V2 sections 5.9 to 5.13, 8.4, 8.7.1, 8.8), written by "
                       f"{GENERATOR_NAME} from {REFERENCE_NAME}. This file is not normative: "
                       "it is written from the reference, and where it disagrees with the text "
                       "of CYBERSPACE_V2.md, the text is right and the file is a bug. A port "
                       "copies it unchanged into its fixtures and tests that it reproduces every "
                       "value.",
        "provenance": {
            "spec_commit": SPEC_COMMIT,
            "reference": REFERENCE_NAME,
            "reference_sha256": reference_sha,
            "generator": GENERATOR_NAME,
            "chain_rules_revision": CHAIN_RULES_REVISION,
        },
        "format": FORMAT,
        "constants": constants(),
        "single": single(),
        "prover": hops,
        "checks": checks_of("golden-5.7", golden),
        "verifier": verifier_vectors(golden),
        "grandfathered_v1": v1_vectors(golden),
        "prices": prices(),
        "sizes": sizes(),
    }


def render(data) -> bytes:
    return (json.dumps(data, indent=1, ensure_ascii=True) + "\n").encode("ascii")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--out", default=os.path.join(HERE, OUTPUT_NAME))
    parser.add_argument("--check", action="store_true",
                        help="compare with the file on disk instead of writing it")
    args = parser.parse_args()
    data = render(build())
    if args.check:
        with open(args.out, "rb") as f:
            same = f.read() == data
        print(f"{args.out}: {'up to date' if same else 'DIFFERS from what this script writes'}")
        sys.exit(0 if same else 1)
    with open(args.out, "wb") as f:
        f.write(data)
    print(f"wrote {args.out}: {len(data)} bytes, sha256 {hashlib.sha256(data).hexdigest()}")


if __name__ == "__main__":
    main()
