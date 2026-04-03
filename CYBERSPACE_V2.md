# Cyberspace v2 - Per-Axis Cantor Tree Traversal with Location-Based Encryption

**Date:** February 10, 2026
**Last updated:** April 2, 2026
**Status:** Design complete (spec); reference implementation in progress

This document is the canonical specification for Cyberspace v2.

Normative sections are written using RFC-style language (MUST/SHOULD/MAY). Explanatory material is explicitly labeled **non-normative**.

This spec defines:
- The 256-bit coordinate system (X/Y/Z u85 + plane bit)
- A deterministic, consensus-oriented GPS→dataspace mapping (plane=0)
- A movement proof system based on **per-axis Cantor pairing trees** (hop) and **per-axis Merkle hash trees** (sidestep)
- A per-hop **temporal work axis** derived from the Nostr movement chain (prevents cached/replayed proofs)
- Location-based encryption and discovery primitives derived from **region** Cantor numbers

Reference implementation: https://github.com/arkin0x/cyberspace-cli

For design rationale and extended discussion, see `RATIONALE.md` https://github.com/arkin0x/cyberspace/blob/master/RATIONALE.md (non-normative).

---

## Table of Contents

- [Overview](#overview)
- [1. Terms](#1-terms)
- [2. 256-bit Coordinate Encoding](#2-256-bit-coordinate-encoding)
  - [2.1 Bit layout](#21-bit-layout)
  - [2.2 Reference pseudocode](#22-reference-pseudocode)
- [3. Sectors and Required Sector Tags](#3-sectors-and-required-sector-tags)
- [4. Canonical GPS→Dataspace Mapping (Plane=0)](#4-canonical-gpsdataspace-mapping-plane0)
  - [4.1 Dataspace cube size (Cantor Height 34 scale)](#41-dataspace-cube-size-cantor-height-34-scale)
  - [4.2 Axis naming convention (ECEF→Cyberspace)](#42-axis-naming-convention-ecefcyberspace)
  - [4.3 Canonical spec version and deterministic arithmetic](#43-canonical-spec-version-and-deterministic-arithmetic)
  - [4.4 Canonical mapping algorithm (normative)](#44-canonical-mapping-algorithm-normative)
  - [4.5 Golden vectors (consensus locks)](#45-golden-vectors-consensus-locks)
- [5. Movement Proofs (Per-Axis Cantor Pairing Trees + Temporal Axis)](#5-movement-proofs-per-axis-cantor-pairing-trees--temporal-axis)
  - [5.1 Cantor pairing function](#51-cantor-pairing-function)
  - [5.2 Lowest common ancestor (LCA) height](#52-lowest-common-ancestor-lca-height)
  - [5.3 Aligned subtree (definition)](#53-aligned-subtree-definition)
  - [5.4 Axis subtree root (definition)](#54-axis-subtree-root-definition)
  - [5.5 3D combination](#55-3d-combination)
  - [5.6 Integer→bytes encoding (normative)](#56-integerbytes-encoding-normative)
  - [5.7 Movement proof hash](#57-movement-proof-hash)
  - [5.8 Performance expectations (non-normative)](#58-performance-expectations-non-normative)
  - [5.9 Sidestep proofs (Merkle hash tree boundary crossing)](#59-sidestep-proofs-merkle-hash-tree-boundary-crossing)
- [6. Nostr Protocol Integration (Movement Chain)](#6-nostr-protocol-integration-movement-chain)
  - [6.1 Event kind](#61-event-kind)
  - [6.2 Canonical event id (NIP-01)](#62-canonical-event-id-nip-01)
  - [6.3 Spawn event (first event)](#63-spawn-event-first-event)
  - [6.4 Hop event (subsequent events)](#64-hop-event-subsequent-events)
  - [6.5 Sidestep event](#65-sidestep-event)
  - [6.6 Verification summary](#66-verification-summary)
  - [6.7 Core action types summary](#67-core-action-types-summary)
  - [6.8 Protocol extensions](#68-protocol-extensions)
- [7. Location-Based Encryption and Discovery](#7-location-based-encryption-and-discovery)
  - [7.1 Key derivation](#71-key-derivation)
  - [7.2 Encrypted content event (Nostr)](#72-encrypted-content-event-nostr)
  - [7.3 Discovery scanning (recommended)](#73-discovery-scanning-recommended)
- [8. Reference Implementation](#8-reference-implementation)
- [9. Limitations and threat model (non-normative)](#9-limitations-and-threat-model-non-normative)
- [10. Visualization conventions (normative)](#10-visualization-conventions-normative)
- [Appendix A. Philosophical foundation (non-normative)](#appendix-a-philosophical-foundation-non-normative)
- [Appendix B. Scale Parameter Rationale (non-normative)](#appendix-b-scale-parameter-rationale-non-normative)
- [Appendix C. Sidestep Rationale (non-normative)](#appendix-c-sidestep-rationale--storage-bottleneck-and-the-merkle-alternative-non-normative)

---

## Overview
Cyberspace is a 256-bit coordinate system navigated by Schnorr keypairs using proof-of-work-like computation.

Keypairs traverse Cyberspace by publishing signed Nostr events that commit to their movement history. Movement costs are derived from computing Cantor tree roots that represent the aligned spatial regions implied by a hop, plus a temporal work component derived from chain context so that every hop costs work.

Key properties:
- **Schnorr keypairs prove traversal** by publishing signed movement events.
- **Public key = spawn coordinate:** identity maps directly into the coordinate fabric.
- **Three movement primitives:** spawn (identity placement), hop (Cantor pairing proof), and sidestep (Merkle hash tree proof for storage-infeasible boundaries).
- **Every hop costs work:** movement proofs include a temporal Cantor traversal derived from the previous event id.
- **Movement requires work:** computing mathematical structure (Cantor roots of coordinate pairs, or Merkle trees of coordinate hashes), not arbitrary nonce grinding.
- **Axis symmetry:** equal distances cost equal work regardless of direction.
- **Location-based encryption:** keys derive from stable spatial region preimages.
- **Compact and deterministic:** proofs fit in Nostr events and verify efficiently.

This v2 design replaces earlier drift/quaternion/velocity approaches (deprecated).

---

## 1. Terms
- **Coordinate (coord256):** A 256-bit integer encoding X/Y/Z plus a plane bit.
- **Axes (u85):** X, Y, Z are 85-bit unsigned integers.
- **Plane:** 1 bit. `0 = dataspace` (physical mapping), `1 = ideaspace` (non-physical).
- **Gibson (G):** The fundamental unit (one axis step in u85 space).
- **Sector:** A cube of `2^30` Gibsons per axis.
- **Cantor Height 34 scale:** The canonical scale for dataspace (plane=0) mapping to physical reality, where Cantor Height 34 = 2 meters. At this scale, one Gibson ≈ 1.16×10⁻¹⁰ meters (approximately the diameter of a hydrogen atom), and the full axis extent is ~4.5 trillion kilometers (~0.48 light-years). This scale applies only to the GPS→dataspace mapping; ideaspace (plane=1) has no physical mapping.
- **Temporal axis (u85):** A per-hop work axis derived from chain context (the previous movement event id) used only for hop proof freshness; it does not affect stable spatial region identifiers. The temporal height `K` is in `[0, 16]`.
- **Sidestep:** A movement action that crosses an LCA boundary via a Merkle hash tree proof instead of a Cantor pairing tree proof. Used when Cantor computation is storage-infeasible. A sidestep crosses exactly 1 Gibson past the boundary.
- **Merkle root (sidestep):** The root hash of a binary Merkle tree built over SHA256 hashes of every leaf coordinate in an aligned subtree. Domain-separated from other protocol hashes.
- **SIDESTEP_DOMAIN:** `b"CYBERSPACE_SIDESTEP_V1"` — the domain separation prefix used for all sidestep leaf hashes.

---

## 2. 256-bit Coordinate Encoding

### 2.1 Bit layout
A 256-bit integer stores interleaved axis bits plus a plane bit:

- Bit `0` (LSB): plane bit `P`
- Bits `3, 6, 9, ...` (every 3rd bit starting at 3): X bits (85 bits)
- Bits `2, 5, 8, ...` (every 3rd bit starting at 2): Y bits (85 bits)
- Bits `1, 4, 7, ...` (every 3rd bit starting at 1): Z bits (85 bits)

0x`XYZXYZXYZ...P`

0x prefix is optional and typically not used.

### 2.2 Reference pseudocode
```python
AXIS_BITS = 85

def xyz_to_coord(x: int, y: int, z: int, plane: int = 0) -> int:
    coord = plane & 1
    for i in range(AXIS_BITS):
        coord |= ((z >> i) & 1) << (1 + i * 3)
        coord |= ((y >> i) & 1) << (2 + i * 3)
        coord |= ((x >> i) & 1) << (3 + i * 3)
    return coord

def coord_to_xyz(coord: int) -> tuple[int,int,int,int]:
    plane = coord & 1
    x = y = z = 0
    for i in range(AXIS_BITS):
        z |= ((coord >> (1 + i * 3)) & 1) << i
        y |= ((coord >> (2 + i * 3)) & 1) << i
        x |= ((coord >> (3 + i * 3)) & 1) << i
    return (x, y, z, plane)
```

---

## 3. Sectors and Required Sector Tags
A **sector** is `2^30` Gibsons per axis. Sectors exist to divide cyberspace into manageable pieces that fit into u32 systems. It also allows for proximal querying of public cyberspace objects.

Given `x_u85, y_u85, z_u85`:
- `sx = x_u85 >> 30`
- `sy = y_u85 >> 30`
- `sz = z_u85 >> 30`

All events that claim a coordinate **MUST** include:
- `X` tag: `["X", "<sx>"]`
- `Y` tag: `["Y", "<sy>"]`
- `Z` tag: `["Z", "<sz>"]`
- `S` tag: `["S", "<sx>-<sy>-<sz>"]`

Tag formatting rules (normative):
- `sx`, `sy`, `sz` MUST be encoded as base-10 integers (strings), with no leading `+` and no leading zeros (except `"0"`).
- `S` MUST be exactly `"<sx>-<sy>-<sz>"`.

Rationale:
- Nostr cannot query "prefix ranges" on tag values; having per-axis sector tags makes it possible to query slices along a single axis.
- `S` is the canonical "full sector id".

---

## 4. Canonical GPS→Dataspace Mapping (Plane=0)
Dataspace (`plane=0`) maps WGS84 GPS coordinates (lat/lon[/alt]) into the u85 axis space.

This mapping is **consensus-critical** if multiple clients are expected to agree on the same coord256 for a given GPS point.

### 4.1 Dataspace cube size (Cantor Height 34 scale)

The Cantor Height 34 scale defines the mapping between dataspace (plane=0) and physical reality. It does not apply to ideaspace (plane=1), which has no GPS mapping.

- Full axis length: **~4.5 trillion kilometers** (~0.48 light-years)
- Half axis length: **~2.25 trillion kilometers**
- Gibson size: **~1.16×10⁻¹⁰ meters** (approximately 1 hydrogen atom diameter)
- Cantor Height 34 = 2 meters (the canonical scale parameter)

This scale provides "atomic" granularity in dataspace while maintaining axis extents that vastly exceed the geosynchronous orbit requirement.

### 4.2 Axis naming convention (ECEF→Cyberspace)
Starting from standard Earth-Centered Earth-Fixed (ECEF):
- `+X_ecef`: (lat=0°, lon=0°)
- `+Y_ecef`: (lat=0°, lon=+90°)
- `+Z_ecef`: north pole

Cyberspace dataspace axis naming is:
- `X_cs = X_ecef`
- `Y_cs = Z_ecef`
- `Z_cs = Y_ecef`

### 4.3 Canonical spec version and deterministic arithmetic
**Spec version string (required):**
- `CANONICAL_GPS_TO_DATASPACE_SPEC_VERSION = "2026-03-16-h34-corrected"`

Canonical requirements:
- Use decimal arithmetic end-to-end (no platform `libm` for trig).
- Decimal context:
  - precision: `96`
  - rounding: `ROUND_HALF_EVEN`
- π constant: use this exact truncated decimal string:
  - `PI_STR = "3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679"`
- Deterministic trig:
  - Termination epsilon: `TRIG_EPS = 1e-88`
  - Max iterations: `TRIG_MAX_ITER = 256`

### 4.3.1 Altitude handling (normative)
The canonical mapping is defined for latitude/longitude plus an optional altitude in meters.

- If altitude is omitted, implementations MUST treat `altitude_m = 0`.
- Implementations MUST support "clamp to surface" behavior that forces `altitude_m = 0` (this is what the golden vectors cover).
- If non-zero altitude is supported, `altitude_m` MUST be interpreted as meters above the WGS84 ellipsoid and processed using the same canonical decimal parsing rules.

### 4.4 Canonical mapping algorithm (normative)
1. Parse inputs as decimals.
2. Clamp latitude to `[-90, 90]`.
3. Wrap longitude to `[-180, 180)`.
4. Convert degrees→radians using `PI_STR`.
5. Compute deterministic `sin/cos` using range reduction + Taylor series, terminating when `abs(term) < TRIG_EPS`.
6. Convert WGS84 geodetic to ECEF (meters) using decimals (using `altitude_m` after clamping, if applicable).
7. Convert meters→kilometers.
8. Permute ECEF axes into Cyberspace axes per §4.2.
9. Convert kilometers-from-center into u85 axis values:
   - `units_per_km = 1000 * 2^33` (derived from Cantor Height 34 = 2 meters)
   - `u = km * units_per_km + 2^84`
   - round using `ROUND_HALF_EVEN`
   - clamp to `[0, 2^85 - 1]`

   Derivation: At Cantor Height 34 scale, `2^34` Gibsons = 2 meters. Therefore 1 Gibson = `2^-33` meters, and 1 km = `1000 * 2^33` Gibsons. This formula maps GPS coordinates into a region centered at u85 value `2^84` (the half-axis point).
10. Produce coord256 with `plane=0` using the interleaving in §2.

### 4.5 Golden vectors (consensus locks)
Implementations SHOULD include golden-vector tests to detect accidental mapping drift.

These are required vectors for spec version `2026-03-16-h34-corrected` (hex is 32 bytes, no `0x` prefix).

Golden vectors assume `altitude_m = 0` with clamp-to-surface behavior enabled:
- `origin_equator_prime` lat=0 lon=0
  - `e000000000000000000001200041040208048040000000000000000000000000`
- `equator_east_90` lat=0 lon=90
  - `e000000000000000000000480010410082012010000000000000000000000000`
- `equator_west_90` lat=0 lon=-90
  - `c492492492492492492492012482082410480490000000000000000000000000`
- `north_pole` lat=90 lon=0
  - `e000000000000000000000900004924920020000820000920100824920800020`
- `london` lat=51.5074 lon=-0.1278
  - `c492492492492492492492edf5bee7267451c787d95ba4d7840c76d1e33c9940`
- `nyc` lat=40.7128 lon=-74.0060
  - `c4924924924924924924921f79235dae293ada913e78294253a235239a332854`

---

## 5. Movement Proofs (Per-Axis Cantor Pairing Trees + Temporal Axis)

Movement proofs are computed per hop. They include:
- a **stable 3D spatial region integer** (`region_n`) derived only from coordinates (used for location-based encryption/discovery in §7), and
- a **temporal work component** (`cantor_t`) derived from the previous movement event id (forces fresh work per hop).

### 5.1 Cantor pairing function
The Cantor pairing function maps two natural numbers to one:

`π(a, b) = (a + b) * (a + b + 1) / 2 + b`

### 5.2 Lowest common ancestor (LCA) height
For a 1D axis movement between `v1` and `v2`:

```python
def find_lca_height(v1: int, v2: int) -> int:
    if v1 == v2:
        return 0
    return (v1 ^ v2).bit_length()
```

### 5.3 Aligned subtree (definition)
An **aligned subtree** of height `h` is a binary subtree whose base is a multiple of `2^h`:

- `base = (v >> h) << h` (the aligned base for any value `v`)
- The subtree spans `2^h` consecutive leaves: `[base, base+1, ..., base + 2^h - 1]`
- The base is always a multiple of `2^h` (aligned to a power-of-2 boundary)

For movement between `v1` and `v2`, the **covering aligned subtree** is the minimal aligned subtree that contains both endpoints:
- `h = find_lca_height(v1, v2)` (the LCA height)
- `base = (v1 >> h) << h` (equivalently `(v2 >> h) << h`)

**Example:** For movement `0 → 5`:
- `h = find_lca_height(0, 5) = 3` (because `0 ^ 5 = 5`, bit_length = 3)
- `base = (0 >> 3) << 3 = 0`
- Aligned subtree covers leaves `[0, 1, 2, 3, 4, 5, 6, 7]` (8 leaves = `2^3`)

**Example:** For movement `4 → 7`:
- `h = find_lca_height(4, 7) = 2` (because `4 ^ 7 = 3`, bit_length = 2)
- `base = (4 >> 2) << 2 = 4`
- Aligned subtree covers leaves `[4, 5, 6, 7]` (4 leaves = `2^2`)

The alignment property ensures that coordinates within the same subtree share the same root, enabling region-based discovery and location-based encryption.

### 5.4 Axis subtree root (definition)
Let `h = find_lca_height(v1, v2)` and `base = (v1 >> h) << h`.

The axis movement "region" is the aligned subtree covering the leaf range:
- `leaves = [base, base+1, ..., base + 2^h - 1]`

Define `compute_subtree_cantor(base, h)` as the value obtained by repeatedly pairing adjacent nodes bottom-up (left-to-right) until one value remains:

```python
def cantor_pair(a: int, b: int) -> int:
    s = a + b
    return (s * (s + 1)) // 2 + b

def compute_subtree_cantor(base: int, height: int) -> int:
    if height < 0:
        raise ValueError("height must be >= 0")
    if height == 0:
        return base

    values = list(range(base, base + (1 << height)))
    for _ in range(height):
        values = [cantor_pair(values[i], values[i + 1]) for i in range(0, len(values), 2)]
    return values[0]
```

The **axis Cantor root** for movement `(v1 → v2)` is:
- `h = find_lca_height(v1, v2)`
- `base = (v1 >> h) << h`
- `axis_root(v1, v2) = compute_subtree_cantor(base, h)`

(Implementations MAY compute this with any equivalent algorithm; the result MUST match this definition.)

## 5.4.1 Sequential Decomposition Height Invariant

**Theorem** (follows from the alignment properties of complete binary trees and the 2-adic valuation)**:** For any two leaf positions `v1` and `v2` with `v1 < v2`:

```
find_lca_height(v1, v2) == max(find_lca_height(i, i+1) for i in range(v1, v2))
```

The LCA height of the direct pair is always equal to the maximum LCA height among all unit-step pairs in the sequence.

**Implication:** Decomposing a movement `(v1 → v2)` into sequential adjacent steps `(v1 → v1+1), (v1+1 → v1+2), ..., (v2-1 → v2)` does not reduce the worst-case computational height. At least one adjacent pair in the sequence will require the same covering subtree height as the direct movement.

**Proof sketch:** The LCA height `h` of `(v1, v2)` is determined by the highest bit position at which `v1` and `v2` differ. Any sequential walk from `v1` to `v2` must cross the largest power-of-2 boundary between them — the step at which this crossing occurs necessarily produces an XOR with a bit set at the same highest position, yielding an identical height `h`. Conversely, no adjacent pair `(i, i+1)` in the walk can produce a height exceeding `h`, since both `i` and `i+1` remain within the aligned subtree of height `h` rooted at `base(v1, h)`.

**Consequence for axis root computation:** The most expensive `compute_subtree_cantor` evaluation encountered during a step-by-step traversal is exactly as expensive as computing the axis root for the direct movement. Sequential decomposition therefore offers no reduction in the maximum subtree size that must be evaluated, preserving the computational cost bound of 2^h leaves for the dominant step.

In simple terms, the computational cost of movement in cyberspace is the same whether you take small steps or large steps. You can't avoid, sidestep, or decompose the computational burden of power-of-two boundaries along each axis.

### 5.5 3D combination
Compute axis roots independently:
- `cantor_x = axis_root(x1, x2)`
- `cantor_y = axis_root(y1, y2)`
- `cantor_z = axis_root(z1, z2)`

Then combine:
- `region_n = π(π(cantor_x, cantor_y), cantor_z)`

### 5.5.1 Region uniqueness (non-normative)
- Each aligned subtree root corresponds to a unique region (Cantor pairing is a bijection).
- Many coordinate pairs inside the same aligned subtree share the same root.

Example (1D):
```
LCA(0, 3) => subtree [0..3] => root = 228
LCA(1, 2) => subtree [0..3] => root = 228
LCA(0, 2) => subtree [0..3] => root = 228
```

This is intentional: the Cantor root `region_n` is a **region identifier**, not a unique coordinate-pair identifier.

### 5.5.2 Temporal axis root (hop freshness)
To prevent proof reuse and guarantee fresh work per hop, hop proofs include an additional Cantor-tree root derived from Nostr chain context.

This temporal axis has two inputs:
- a hop-specific **height** `K` derived from the destination coordinate (a deterministic "terrain" function), and
- a hop-specific **seed** `t` derived from the `previous_event_id`.

#### 5.5.2.1 Terrain-derived temporal height K (normative)
Define constants:
- `TERRAIN_DOMAIN_V2 = b"CYBERSPACE_TERRAIN_K_V2"` (ASCII bytes)
- `TERRAIN_CELL_BITS = [3, 7, 9, 11]` (exactly four integers)

If any part of this terrain function changes (constants, hashing preimage format, byte selection, etc.), the domain string MUST be bumped to a new value to avoid ambiguity.

Given the hop destination coordinate `(x2, y2, z2, plane)`:

1. For each `bits` in `TERRAIN_CELL_BITS` (in order):
   1. Align the destination to the cell of width `2^bits` along each axis:
      - `bx = (x2 >> bits) << bits`
      - `by = (y2 >> bits) << bits`
      - `bz = (z2 >> bits) << bits`
   2. Compute `cell_coord = xyz_to_coord(bx, by, bz, plane)`.
   3. Encode `cell_coord` as exactly 32 big-endian bytes: `cell_coord_bytes`.
   4. Compute `digest = sha256(TERRAIN_DOMAIN_V2 || byte(bits) || cell_coord_bytes)`.
      - `byte(bits)` is a single unsigned byte with value `bits`.
   5. Record `nibble_i = digest[0] & 0x0F` (the low 4 bits of the first byte of the digest).

2. Concatenate the four nibbles into a 16-bit word:
   - `word16 = (nibble_0 << 12) | (nibble_1 << 8) | (nibble_2 << 4) | nibble_3`

3. Define `K` as the popcount of `word16` (the number of 1 bits in its 16-bit binary representation).
   - Therefore `K` MUST be an integer in `[0, 16]`.

Note (non-normative): Because `K` is the popcount of 16 pseudorandom bits, it is distributed approximately as a binomial distribution with mean 8. The worst-case temporal computation is `2^16 = 65,536` Cantor pairs (~100 ms). The aligned cells introduce spatial correlation ("hills").

#### 5.5.2.2 Temporal axis seed and root (normative)
For hop events, let `previous_event_id` be the 32-byte NIP-01 event id referenced by the `e` tag with marker `previous` (§6.4).

1. Parse `previous_event_id` from lowercase hex into 32 bytes.
2. Interpret it as a big-endian integer and reduce it into the u85 axis (the least-significant 85 bits):
   - `prev_id_int = int.from_bytes(previous_event_id_bytes, "big")`
   - `t = prev_id_int % (1 << 85)`
3. Compute an aligned temporal subtree and its Cantor root (at the terrain-derived height `K`):
   - `t_base = (t >> K) << K`
   - `cantor_t = compute_subtree_cantor(t_base, K)`

Note (non-normative): the temporal axis is derived from chain context and destination coordinates, not wall-clock time. There is no continuous "alive" cost; you pay this work only when you publish a hop.

### 5.5.3 4D hop preimage (space + time)
Define the hop preimage integer:
- `hop_n = π(region_n, cantor_t)`

### 5.6 Integer→bytes encoding (normative)
Many operations hash large integers. This spec defines the canonical encoding used for hashing integers.

```python
def int_to_bytes_be_min(n: int) -> bytes:
    if n < 0:
        raise ValueError("expected non-negative")
    if n == 0:
        return b"\x00"
    # minimal big-endian bytes
    return n.to_bytes((n.bit_length() + 7) // 8, "big")
```

### 5.7 Movement proof hash
The movement proof hash is derived from the 4D hop preimage `hop_n` (space + time). This intentionally differs from the stable spatial region identifiers used for location-based encryption and discovery (§7).

- `hop_bytes = int_to_bytes_be_min(hop_n)`
- `movement_proof_key = sha256(hop_bytes)` (32 bytes)
- `proof_hash = sha256(movement_proof_key)` (32 bytes)

When used in Nostr tags, `proof_hash` MUST be encoded as lowercase hex in the `proof` tag.

### 5.7.1 Worked example (non-normative)
Movement: `(0, 0, 0) → (4104, 0, 0)`

Per-axis roots:
- X: `0 → 4104` => height 13 => root = `compute_subtree_cantor(0, 13)`
- Y: `0 → 0` => height 0 => root `0`
- Z: `0 → 0` => height 0 => root `0`

3D combine (stable spatial region integer):
- `region_n = π(π(cantor_x, 0), 0)`

Stable lookup id (used for location-based encryption/discovery, §7.1):
- `lookup_id = sha256(sha256(int_to_bytes_be_min(region_n)))`
- `8d2463eb22301d97a1f7e33b90e473ba2eec69079f418a72609c3e4d2981669b`

Terrain-derived temporal height at destination `(x2=4104, y2=0, z2=0, plane=0)` using `TERRAIN_CELL_BITS = [3, 7, 9, 11]`:

For each cell size, align the destination coordinate and extract a nibble from the terrain hash:
- `bits=3`: cell = `(4104, 0, 0)` → nibble = `0b0000` (0 ones)
- `bits=7`: cell = `(4096, 0, 0)` → nibble = `0b1111` (4 ones)
- `bits=9`: cell = `(4096, 0, 0)` → nibble = `0b1111` (4 ones)
- `bits=11`: cell = `(4096, 0, 0)` → nibble = `0b1101` (3 ones)

Combine into 16-bit word and compute popcount:
- `word16 = (0 << 12) | (15 << 8) | (15 << 4) | 13 = 0b0000111111111101`
- `K = popcount(word16) = 0 + 4 + 4 + 3 = 11`

Temporal axis example using `previous_event_id` = 64 hex zeros:
- `previous_event_id = "0000000000000000000000000000000000000000000000000000000000000000"`
- `t = 0`
- `t_base = 0`
- `cantor_t = compute_subtree_cantor(0, 11)`

4D hop preimage and movement proof hash (what is placed in the hop event's `proof` tag):
- `hop_n = π(region_n, cantor_t)`
- `proof_hash = sha256(sha256(int_to_bytes_be_min(hop_n)))`
- `ed9d09ca697b2da29c9d042207ac8ef7aab40f6dde550e6467452aa0e2e8cac6`

Different `previous_event_id` values produce different `proof_hash` values, even for identical spatial moves.

### 5.8 Performance expectations (non-normative)
Reference implementations typically observe that cost grows with the per-axis LCA height (because the aligned subtree contains `2^h` leaves).

In addition, hop proofs include a temporal axis traversal at a terrain-derived height `K` (§5.5.2.1), imposing a non-cacheable work component per hop even when the spatial `region_n` is reused. Because `K` depends on the destination coordinate, some regions of cyberspace are intrinsically easier or harder to traverse.

Approximate per-axis expectations from early benchmarks (illustrative only):

| Distance | Height | Cantor size | Time (approx) |
|---|---:|---:|---:|
| 1 G | 1 | 1 B | < 0.01 ms |
| 16 G | 5 | 90 B | < 0.01 ms |
| 256 G | 9 | 2.5 KB | ~ 0.1 ms |
| 1,024 G | 11 | 12 KB | ~ 1 ms |
| 4,096 G | 13 | 57 KB | ~ 10 ms |
| 65,536 G | 17 | 1.2 MB | ~ 1 sec |

Implementations should cap per-hop distance for UX and may rely on multiple hops for long travel.

### 5.9 Sidestep proofs (Merkle hash tree boundary crossing)

A **sidestep** is the third movement primitive. It enables crossing an LCA boundary when Cantor computation is **storage-infeasible** — that is, when the intermediate values of the Cantor pairing tree exceed available memory or disk.

Cantor computation produces intermediate values that grow exponentially in bit size. At LCA height 40, storing intermediates requires ~11 TB; at height 50, ~11 PB; at height 60, ~11 EB (exceeding all storage on earth). The sidestep replaces the Cantor pairing tree with a Merkle hash tree over SHA256 hashes of leaf coordinates. SHA256 operations are fixed-size (256 bits in, 256 bits out), so the sidestep's cost is purely **time**, never storage.

A sidestep is always more expensive in wall-clock time than an equivalent hop (~100× slower at heights where both are feasible). No rational agent would sidestep when they could hop. The sidestep exists only to fill the gap between a machine's Cantor storage capacity and the absolute hash-time ceiling.

#### 5.9.1 Sidestep geometry (normative)

A sidestep crosses exactly **1 Gibson** past an LCA boundary. Given source axis value `v1` and destination axis value `v2`:

- The LCA height `h = find_lca_height(v1, v2)` identifies the boundary.
- The destination MUST be the coordinate that differs from the source only at bit position `h - 1` (the bit that distinguishes the two children of the LCA), with all lower bits on the destination side set to zero. That is: the destination is the first leaf of the adjacent aligned subtree.
- Non-crossing axes MUST have `v1 == v2` (a sidestep moves on exactly one axis per action) OR the sidestep crosses multiple axes simultaneously (see §5.9.7).

#### 5.9.2 Per-axis Merkle root (normative)

For each axis where movement occurs (`v1 ≠ v2`):

1. Compute `h = find_lca_height(v1, v2)`.
2. Compute the aligned subtree base: `base = (v1 >> h) << h`.
3. The aligned subtree contains `2^h` leaves: `[base, base+1, ..., base + 2^h - 1]`.
4. For each leaf value `L_i` (where `i` ranges from `0` to `2^h - 1`):
   - Encode as big-endian minimal bytes: `leaf_bytes = int_to_bytes_be_min(base + i)`
   - Compute leaf hash: `H_i = SHA256(SIDESTEP_DOMAIN || leaf_bytes)`
5. Build the Merkle tree bottom-up:
   - For each pair `(H_{2j}, H_{2j+1})`: `parent = SHA256(H_{2j} || H_{2j+1})`
   - Continue until a single root `M_axis` remains.
6. The per-axis Merkle root is `M_axis` (32 bytes).

**Domain separation constant (normative):**
```
SIDESTEP_DOMAIN = b"CYBERSPACE_SIDESTEP_V1"
```

If any aspect of sidestep leaf hash computation changes in a future version (preimage format, domain string, encoding), the domain string MUST be bumped to a new value to avoid cross-version collisions.

**Trivial axes (`h = 0`):** When `v1 == v2` on an axis, the Merkle root is the single leaf hash: `M_axis = SHA256(SIDESTEP_DOMAIN || int_to_bytes_be_min(v1))`. No tree construction is needed.

#### 5.9.3 Streaming computation (normative)

The Merkle tree MUST be computable in streaming fashion without storing all leaf hashes simultaneously:

1. Process leaves in ascending order (deterministic enumeration from `base` to `base + 2^h - 1`).
2. Maintain a stack of pending intermediate hashes, maximum depth `h`.
3. Working memory: `h × 32` bytes (under 3 KB even at h85).
4. Total hash operations: `2^(h+1) - 1` (`2^h` leaf hashes + `2^h - 1` internal hashes).

```python
def compute_merkle_root_streaming(base: int, height: int) -> bytes:
    """Compute Merkle root over aligned subtree in O(h) memory."""
    if height == 0:
        return sha256(SIDESTEP_DOMAIN + int_to_bytes_be_min(base))

    stack = []  # (hash_value, level)
    for i in range(1 << height):
        leaf_bytes = int_to_bytes_be_min(base + i)
        current = sha256(SIDESTEP_DOMAIN + leaf_bytes)
        level = 0
        while stack and stack[-1][1] == level:
            left = stack.pop()[0]
            current = sha256(left + current)
            level += 1
        stack.append((current, level))
    return stack[0][0]
```

(Implementations MAY use any equivalent algorithm; the result MUST match this definition.)

#### 5.9.4 Spatial region integer (region_m)

Combine per-axis Merkle roots into a single spatial proof integer:

```python
mx = int.from_bytes(M_x, "big")   # X-axis Merkle root as integer
my = int.from_bytes(M_y, "big")   # Y-axis Merkle root as integer
mz = int.from_bytes(M_z, "big")   # Z-axis Merkle root as integer
region_m = cantor_pair(cantor_pair(mx, my), mz)
```

This mirrors the hop proof's `region_n = π(π(cantor_x, cantor_y), cantor_z)` but uses Merkle roots instead of Cantor roots.

**All three axes always use Merkle roots in a sidestep.** There is no mixed mode — the proof type (Cantor or Merkle) is determined by the action type (`hop` or `sidestep`), not per-axis.

#### 5.9.5 Temporal binding

The temporal binding mechanism for sidesteps is **identical** to hop proofs (§5.5.2):

1. Compute terrain height `K` at the destination coordinate per §5.5.2.1.
2. Derive temporal seed `t` from `previous_event_id` per §5.5.2.2.
3. Compute `cantor_t = compute_subtree_cantor(t_base, K)`.

This is always feasible because `K ≤ 16` (maximum 65,536 Cantor pairs, ~100 ms).

**Why temporal binding is required:** Without it, the spatial Merkle root is deterministic and replayable — anyone who computes it once could claim repeated crossings without new work. The temporal axis, seeded by `previous_event_id`, binds each proof to a unique chain position.

**Precomputation note (non-normative):** An entity MAY precompute the spatial Merkle root as preparation for a planned crossing. The temporal component must still be computed fresh at crossing time (since `previous_event_id` is only known after the preceding event is published). This is acceptable — the spatial component is where all the real work is.

#### 5.9.6 Sidestep proof hash (normative)

Combine spatial and temporal components:

```python
sidestep_n = cantor_pair(region_m, cantor_t)
```

Apply double SHA256 (consistent with hop proofs, §5.7):

```python
sidestep_bytes = int_to_bytes_be_min(sidestep_n)
proof_key = sha256(sidestep_bytes)
proof_hash = sha256(proof_key)  # 32 bytes
```

When used in Nostr tags, `proof_hash` MUST be encoded as lowercase hex.

#### 5.9.7 Multi-axis sidestep

A single sidestep event MAY cross boundaries on multiple axes simultaneously (if source and destination differ on more than one axis). The proof is constructed independently per axis:

- Each axis computes its own Merkle root (or trivial single-leaf hash for axes where `h = 0`).
- The three roots are combined into `region_m` via Cantor pairing (§5.9.4).
- Temporal binding applies once to the combined proof, not per-axis.
- The total work is the sum of per-axis work.

#### 5.9.8 Merkle inclusion proof

In addition to the Merkle root, the prover MUST publish a Merkle inclusion proof for the destination leaf on each axis where movement occurs. This enables efficient verification (§6.5).

Each per-axis inclusion proof is a sequence of sibling hashes from leaf to root:

```
axis_proof = H_sibling_0 || H_sibling_1 || ... || H_sibling_{h-1}
```

Where `H_sibling_i` is the 32-byte sibling hash at depth `i` (leaf = depth 0). The verifier determines left/right ordering at each level from the destination leaf's position in the subtree (deterministic from the leaf value).

For trivial axes (`h = 0`), the inclusion proof is empty — the Merkle root IS the single leaf hash.

#### 5.9.9 Verification levels

**Level 1: Inclusion path verification — O(h) per axis**

A verifier checks that the claimed destination leaf is consistent with the claimed Merkle root:

1. Validate coordinates: source and destination are valid 256-bit Cyberspace coordinates.
2. Validate crossing geometry: LCA height matches; destination is exactly 1 Gibson past boundary.
3. Recompute destination leaf hash: `H_dest = SHA256(SIDESTEP_DOMAIN || int_to_bytes_be_min(v_dest))`
4. Verify Merkle path from `H_dest` to claimed root `M_axis` using inclusion proof.
5. Recompute `region_m`, temporal axis, and `proof_hash`. Compare against claimed value.

**Level 2: Full root verification — O(2^h) per axis**

To fully verify that the claimed Merkle root was computed over the correct aligned subtree, a verifier recomputes the entire Merkle tree from scratch. This costs the same order of work as the original proof.

**Security model:** The protocol does NOT require every verifier to perform Level 2 on every proof. Security relies on **deterministic fraud detectability**: the Merkle root for any aligned subtree is deterministic, so a fraudulent root is permanently and objectively detectable by any party willing to do the work. Since sidestep proofs are published on Nostr (public, persistent), fraud can be detected at any time.

In practice, Level 1 verification is expected for routine validation. Level 2 is performed by auditors, competitors, or automated fraud-detection services.

#### 5.9.10 Non-revelation of Cantor root

The sidestep Merkle tree is built over SHA256 hashes of leaf coordinates. The Cantor pairing tree over those same leaves produces a completely different value. Computing the Merkle root reveals **nothing** about the Cantor root.

This preserves the **entering ≠ claiming** separation: sidestepping into a region does not grant domain authority. Domain authority still requires full Cantor root computation.

#### 5.9.11 Performance expectations (non-normative)

Sidestep cost is dominated by SHA256 leaf hashing. At every height where both hop and sidestep are feasible, the hop is approximately 100× faster:

| LCA Height | Hop Time (Cantor) | Sidestep Time (Merkle) | Preferred |
|---:|---:|---:|---|
| h20 | ~2 ms | ~210 ms | Hop |
| h30 | ~1 sec | ~22 sec | Hop |
| h34 | ~17 sec | ~6 min | Hop (170 GB storage needed) |
| h40 | ~18 min | ~6 hr | **Sidestep** (Cantor needs 11 TB) |
| h45 | ~10 hr | ~8 days | **Sidestep** (Cantor needs 340 TB) |
| h50 | ~2 weeks | ~37 weeks | **Sidestep** (Cantor needs 11 PB) |
| h55 | ~1 year | ~23 years | **Sidestep** (Cantor needs 340 PB) |
| h60 | IMPOSSIBLE | ~731 years | Hyperjump needed |

(Merkle times assume SHA256 with SHA-NI at ~10⁸ hashes/sec. Cantor times assume ~10⁹ pairings/sec at low heights; upper heights are storage-limited. Ratio narrows at higher heights because Cantor per-operation cost increases with intermediate value size while SHA256 stays fixed.)

The practical sidestep ceiling is ~h45–50 on consumer hardware (days to months). Cloud compute ($200–$1,000 budget) can extend this by 5–15 heights. Beyond ~h60, even sidesteps take centuries — hyperjumps are required.

This creates natural "continents" in the space: regions reachable by hops + sidesteps (walls ≤ ~h50) and regions separated by impassable boundaries requiring hyperjump transit (walls > ~h50). No arbitrary ceiling is designed; the boundary emerges from thermodynamics.

---

## 6. Nostr Protocol Integration (Movement Chain)
Cyberspace v2 movement is represented as a per-pubkey, linear hash chain of Nostr-style events.

### 6.1 Event kind
- Movement events: `kind = 3333`

### 6.2 Canonical event id (NIP-01)
The event `id` MUST be computed as NIP-01 canonical serialization:

- Serialize: `[0, pubkey, created_at, kind, tags, content]`
- Encode as UTF-8 JSON with no whitespace (equivalent to Python `json.dumps(..., separators=(",", ":"), ensure_ascii=False)`)
- Hash: `sha256(serialized_bytes)`

### 6.2.1 Signature (`sig`)
For published events, `sig` MUST be a valid Schnorr signature over the event `id` as required by NIP-01.

Note: some prototypes may leave `sig` blank for local-only chains and sign at publish-time; that is not a wire-format requirement.

### 6.3 Spawn event (first event)
Required:
- `A` tag: `["A", "spawn"]`
- `C` tag: `["C", "<coord_hex>"]`
  - `coord_hex` MUST be a 32-byte lowercase hex string (64 hex chars, no `0x` prefix)
  - for spawn events, `coord_hex` MUST equal the event `pubkey` (spawn coordinate)
- sector tags: `X`, `Y`, `Z`, `S` (per §3)

### 6.4 Hop event (subsequent events)
Required:
- `A` tag: `["A", "hop"]`
- `e` genesis: `["e", "<spawn_event_id>", "", "genesis"]`
- `e` previous: `["e", "<previous_event_id>", "", "previous"]`
- `c` tag: `["c", "<prev_coord_hex>"]` (32-byte lowercase hex string)
- `C` tag: `["C", "<coord_hex>"]` (32-byte lowercase hex string)
- `proof` tag: `["proof", "<proof_hash_hex>"]` (32-byte lowercase hex string)
- sector tags: `X`, `Y`, `Z`, `S` (per §3)

### 6.5 Sidestep event
Required:
- `A` tag: `["A", "sidestep"]`
- `e` genesis: `["e", "<spawn_event_id>", "", "genesis"]`
- `e` previous: `["e", "<previous_event_id>", "", "previous"]`
- `c` tag: `["c", "<prev_coord_hex>"]` (32-byte lowercase hex string)
- `C` tag: `["C", "<coord_hex>"]` (32-byte lowercase hex string)
- `proof` tag: `["proof", "<proof_hash_hex>"]` (32-byte lowercase hex string)
- `mr` tag: `["mr", "<M_x_hex>:<M_y_hex>:<M_z_hex>"]` — per-axis Merkle roots, colon-separated (each 64 hex chars)
- `mp` tag: `["mp", "<proof_x_hex>:<proof_y_hex>:<proof_z_hex>"]` — per-axis Merkle inclusion proofs, colon-separated
- `hx` tag: `["hx", "<lca_height_x>"]` — LCA height on X axis (decimal string)
- `hy` tag: `["hy", "<lca_height_y>"]` — LCA height on Y axis (decimal string)
- `hz` tag: `["hz", "<lca_height_z>"]` — LCA height on Z axis (decimal string)
- sector tags: `X`, `Y`, `Z`, `S` (per §3)

**Merkle inclusion proof encoding:** Each per-axis proof in the `mp` tag is a concatenation of sibling hashes from leaf to root, hex-encoded (`64 × h` hex characters per axis for an axis with LCA height `h`). For trivial axes (`h = 0`), the proof segment is an empty string between colons.

**Height tags:** The `hx`, `hy`, `hz` tags enable verifiers to determine expected proof lengths without re-deriving LCA heights from coordinates.

### 6.6 Verification summary

#### 6.6.1 Hop verification
To verify a hop:
1. Parse previous and current coords; decode to `(x1,y1,z1,plane)` and `(x2,y2,z2,plane)`.
2. Plane changes are valid in v2; verifiers MUST support hops where `plane1 != plane2`.
3. Compute the stable spatial region integer `region_n` per §5.5.
4. Derive the terrain-based temporal height `K` from the destination coordinate `(x2,y2,z2,plane2)` per §5.5.2.1 (including the destination plane bit).
5. Compute the temporal axis root `cantor_t` from the hop event's `previous_event_id` (`e` tag with marker `previous`) and `K` per §5.5.2.2.
6. Compute `hop_n = π(region_n, cantor_t)` per §5.5.3.
7. Compute `proof_hash` per §5.7.
8. Accept iff it matches the event's `proof` tag.

#### 6.6.2 Sidestep verification (Level 1: inclusion path)
To verify a sidestep (Level 1 — inclusion path check):
1. Parse previous and current coords; decode to `(x1,y1,z1,plane)` and `(x2,y2,z2,plane)`.
2. Validate crossing geometry: for each axis, confirm the destination is exactly 1 Gibson past the LCA boundary (§5.9.1). Verify the `hx`, `hy`, `hz` tags match the computed LCA heights.
3. Parse per-axis Merkle roots from the `mr` tag.
4. For each axis where movement occurs:
   a. Compute the destination leaf hash: `H_dest = SHA256(SIDESTEP_DOMAIN || int_to_bytes_be_min(v_dest))`
   b. Parse the axis inclusion proof from the `mp` tag.
   c. Verify the Merkle path from `H_dest` to the claimed root `M_axis`.
5. Compute `region_m = π(π(mx, my), mz)` from the claimed Merkle roots (§5.9.4).
6. Derive `K` and `cantor_t` from destination coordinate and `previous_event_id` (§5.9.5, same as hop).
7. Compute `sidestep_n = π(region_m, cantor_t)` and `proof_hash` per §5.9.6.
8. Accept iff it matches the event's `proof` tag.

Level 2 (full root) verification is described in §5.9.9.

### 6.7 Core action types summary

The base Cyberspace v2 protocol defines three movement action types:

| `A` tag value | Description | Proof type | Defined in |
|---|---|---|---|
| `spawn` | Identity placement at pubkey-derived coordinate | None (identity proof) | §6.3 |
| `hop` | Movement via Cantor pairing tree | Cantor root (§5.4) | §6.4 |
| `sidestep` | Boundary crossing via Merkle hash tree | Merkle root (§5.9) | §6.5 |

All three use event `kind = 3333`.

### 6.8 Protocol extensions
This specification defines the base Cyberspace v2 protocol.

Optional extensions MAY introduce new event kinds, new movement action types (`A` tag values), and/or additional validation rules that are only applied when an extension is in use.

Extensions are specified as **Design Extension and Compatibility Kits (DECKs)** in the `decks/` directory.
- Hyperjumps extension: `decks/DECK-0001-hyperjumps.md`

---

## 7. Location-Based Encryption and Discovery
Secrets may be encrypted with the hash of a Cantor number, binding the decryption of that secret to the public computation of the specific coordinate region's Cantor number at a specific height. This is referred to as a __local secret__ when it is published as a nostr event. A local secret may be decrypted by anyone who does the work to calculate the Cantor number that yields the decryption key. However, the local secret does not (by default) reveal any information about where it is located in the coordinate system. Therefore, the only likely way for it to be discovered is if:
- the local secret is encrypted by a Cantor root where someone else is likely to travel
- a user who travels near the local secret is scanning for secrets along their path
- the user is scanninig in the height range where the local secret is encrypted (typically 0 to 16)

The local secret may include a hint as to where it is located, but that is up to the publisher of it.

This section defines key derivation from region Cantor numbers and how to compose local secrets.

### 7.1 Key derivation
Given a spatial region integer `region_n` (the 3D region identifier from §5.5 for some aligned region):
- `region_bytes = int_to_bytes_be_min(region_n)`
- `location_decryption_key = sha256(region_bytes)`
- `lookup_id = sha256(location_decryption_key)`

Note (non-normative): the temporal axis used for hop proofs (§5.5.2) is intentionally not included here. Location-based identifiers and keys remain a stable function of spatial regions.

Outputs are 32-byte digests. When used in Nostr tags, they MUST be lowercase hex.

### 7.1.1 Discovery radius property (non-normative)
Cantor subtree roots represent **aligned regions**. Choosing a subtree height implicitly chooses a discovery radius.

At the Cantor Height 34 scale (2 meters per height-34 subtree), approximate physical scales are:

| Height | Leaves (per axis) | Physical scale | Metaphor |
|---:|---:|---|---|
| 0 | 1 | ~10⁻¹⁰ m | Atomic precision |
| 10 | 1,024 | ~0.1 μm | Microscopic |
| 20 | ~10⁶ | ~0.1 mm | Grain of sand |
| 30 | ~10⁹ | ~0.1 m | Hand-span |
| 34 | ~1.7×10¹⁰ | 2 m | Human height (canonical) |
| 40 | ~10¹² | 128 m | City block |
| 50 | ~10¹⁵ | 131 km | City region |

A local secret (message encrypted by the double-sha256 of the Cantor root) at height 34 is discoverable within ~2 meters. A message at height 50 is discoverable from anywhere in a city.

However, it's important to note that discovery requires *equivalent computation* to secret creation, and typical scanning range is between 0 and 16 for sub-second continuous scanning on average consumer hardware. There is a direct relationship between the radius and the difficulty, so secrets may be unattainable if they occupy too large a region and don't provide some hint for users to scan up to their height. As hardware improves, passive scanning will also improve and larger secret regions will be passively attainable.

The discovery radius grows exponentially with height, enabling a natural hierarchy of public, neighborhood, and intimate spatial messages.

### 7.1.2 Lookup vs decryption key
To prevent a published lookup identifier from trivially implying the decryption key, this spec uses:
- `location_decryption_key = sha256(int_to_bytes_be_min(region_n))`
- `lookup_id = sha256(location_decryption_key)`

Seeing `lookup_id` does not allow deriving `location_decryption_key` without the region preimage.

### 7.2 Encrypted content event (Nostr)
- Encrypted content events: `kind = 33330`

Required tags:
- `d` tag: `["d", "<lookup_id_hex>"]` (32-byte lowercase hex string)

Optional tags:
- `h` tag: `["h", "<height_hint>"]` (string integer)

The encryption algorithm and ciphertext encoding (base64 vs hex) are out of scope for this spec; only lookup and key derivation are specified.

### 7.3 Discovery scanning (recommended)
At a coordinate `(x,y,z)` you may scan nearby region keys by selecting heights `h = 1..H` and computing the aligned subtree base per axis:
- `bx = (x >> h) << h`
- `by = (y >> h) << h`
- `bz = (z >> h) << h`

For each `h`, compute per-axis subtree Cantor roots (per §5.3):
- `rx = compute_subtree_cantor(bx, h)`
- `ry = compute_subtree_cantor(by, h)`
- `rz = compute_subtree_cantor(bz, h)`

Then combine to a 3D region integer:
- `region_n = π(π(rx, ry), rz)`

Then derive `lookup_id` per §7.1.

Implementations SHOULD cap `H` for interactive use and may cache values; higher subtrees change less frequently.

### 7.3.1 Caching optimization (non-normative)
When moving, many higher subtrees do not change. This provides a significant optimization for applications that scan multiple discovery radii.

#### Boundary crossing principle
An aligned subtree of height `h` has a base that's a multiple of `2^h`. When you move from one coordinate to another, the subtree changes only if you cross a boundary at that height.

**Example (1D):** Moving from position 7 to position 8:
```
Height  Base (at pos 7)  Base (at pos 8)  Changed?
-------  ----------------  ----------------  --------
   0           7                 8           YES (boundary at 8)
   1           6                 8           YES (boundary at 8)
   2           4                 8           YES (boundary at 8)
   3           0                 8           YES (boundary at 8)
   4           0                 0           NO  (same [0..15])
   5           0                 0           NO  (same [0..31])
   ...         ...               ...         NO
```

**Observation:** Heights 4 and above are unchanged. Position 7 and 8 share the same `base` for h≥4.

#### Boundary detection
For a movement from `v1` to `v2`, the subtree at height `h` changes if and only if:
```python
def subtree_changes(v1: int, v2: int, h: int) -> bool:
    return (v1 >> h) != (v2 >> h)
```

When `(v1 >> h) == (v2 >> h)`, both positions lie in the same aligned subtree — the cached region key remains valid.

#### Implementation strategy
```python
# Pre-compute region keys at startup for all heights up to H
region_cache = {}  # height -> (base, region_key)

def get_region_key(x, y, z, h):
    bx = (x >> h) << h
    by = (y >> h) << h
    bz = (z >> h) << h

    if h in region_cache:
        cached_base, cached_key = region_cache[h]
        if (bx, by, bz) == cached_base:
            return cached_key  # Cache hit

    # Cache miss: compute and store
    region_key = compute_region_key(bx, by, bz, h)
    region_cache[h] = ((bx, by, bz), region_key)
    return region_key
```

#### Performance implications
- **Small moves:** Most heights remain cached; only recompute low heights
- **Large moves:** More heights change, but high heights often remain the same
- **Continuous scanning:** Avoid recomputing all 50+ region keys on every position update

Note: this caching optimization applies to spatial region computations for discovery. Hop proofs still require computing the temporal axis root per §5.5.2 on every hop.

---

## 8. Reference Implementation
The most relevant implementation for this spec is:
- https://github.com/arkin0x/cyberspace-cli

Implementers should treat that repo as the reference for:
- integer→bytes canonicalization for hashing
- movement proof computation
- canonical GPS→dataspace mapping (`CANONICAL_GPS_TO_DATASPACE_SPEC_VERSION` and golden vectors)

---

## 9. Limitations and threat model (non-normative)

### 9.1 What the protocol provides
- **Single-location constraint (per keypair):** a valid, linear movement chain makes forking detectable.
- **Hop freshness:** every hop includes non-cacheable temporal work derived from chain context.
- **Work equivalence (for discovery):** an entity must compute region preimages to derive discovery keys; there is no shortcut.
- **Auditable movement history:** the chain provides an ordered trail of hops.
- **Locality imposition:** distance and regions become meaningful in a 256-bit address space.

### 9.2 What the protocol does not provide
- **Physical location proof:** dataspace mapping is deterministic, but it does not prove a body is physically at that GPS point.
- **Trusted identity / sybil resistance:** one operator can control many keypairs.
- **Privacy by default:** movement events are public if published.
- **Traversal necessity for decryption:** region preimages can be computed directly without maintaining a movement chain.

### 9.3 Acknowledged attack vectors
- **Coordinate scanning:** an observer can compute region preimages for arbitrary coordinates and query for content. This is considered acceptable because the work required is the same as for a traveler.
- **Chain abandonment:** an entity may abandon a keypair and start fresh, or they may pubish a new spawn event to start their chain over. This is acceptable. Applications can require continuity/reputation at higher layers.

---

## 10. Visualization conventions (normative)
This section defines canonical conventions for rendering Cyberspace coordinates in 3D visualizers.
These conventions are intended to ensure different viewers agree on orientation (left/right, up/down, ahead/behind).

Note: these conventions are about visualization only. They do not change coordinate encoding (§2) or movement proof verification (§5-§6).

### 10.1 Handedness and axis semantics
Implementations that render Cyberspace in 3D MUST preserve the Cyberspace axis semantics defined in §4.2 exactly.

Graphics-engine handedness and camera defaults are implementation details and MUST NOT change Cyberspace semantics.

When the viewer is oriented per §10.3:
- `+X_cs` is screen-right.
- `+Y_cs` is up.
- `+Z_cs` is forward (toward the black sun / east reference marker).

### 10.2 Black sun reference marker
If a visualizer renders the "black sun" guidepost, it MUST place it on the `+Z_cs` boundary of the Cyberspace cube.

At u85 position `2^84` (the maximum u85 value, representing the half-axis extent):
- `black_sun_u85 = (x=0, y=0, z=2^84)` in u85 coordinates
- In physical units: `black_sun = (x_km=0, y_km=0, z_km=+2.25×10^12 km)` (approximately 0.24 light-years from origin)

The black sun is a directional guidepost for east (`+Z_cs`). Marker shape (point/sphere/circle/disk) is implementation-defined.

The black sun marker MUST be visible in both planes. (The plane bit does not affect XYZ decoding; it only labels the plane.)

### 10.3 "Facing the black sun" (camera convention)
A visualizer MUST provide (either as its default view or as an explicit preset) a camera/view mode equivalent to:
- View direction: looking toward `+Z_cs`.
- Up direction: `+Y_cs`.
- Screen-right direction: `+X_cs`.

This is the canonical interpretation used when describing a coordinate as "left/right", "above/below", or "ahead/behind" relative to the origin.

### 10.4 Engine adaptation requirements
Different graphics engines have different defaults for camera forward direction and orbit-control behavior.
Implementations MUST use camera placement/orientation and/or a render-space transform so that the semantic rules in §10.1-§10.3 remain true, without mirroring or re-labeling Cyberspace axes.

### 10.5 Visualization sanity vectors (non-normative)
For quick regression tests and cross-implementation debugging, see `visualization_vectors.json` in this spec repository.

---

## Appendix A. Philosophical foundation (non-normative)
Cyberspace v2 is designed around a simple constraint: if a protocol wants "space", then **distance must have a cost**.

### A.1 Modeling spatial dimension thermodynamically
The purpose of location-based encryption in this system is not primarily secrecy (there are better tools for that). The goal is to **model traversable reality** and impose locality on a spaceless mathematical substrate.

### A.2 What this system achieves
1. **Movement is work:** you cannot claim to be somewhere else without performing verifiable computation.
2. **Space has texture:** Cantor trees provide a mathematical "fabric" that must be traversed.
3. **Discovery requires presence:** content can be addressed so that only those who compute region preimages can derive discovery/decryption keys.
4. **Reality extension:** dataspace provides a deterministic mapping from WGS84 GPS points into the coordinate fabric.
5. **Simulation ≈ observation:** learning what is "nearby" requires essentially the same region-preimage work whether you arrived via a chain or computed it directly.

### A.3 The chalk on the sidewalk metaphor
A message written in chalk on a sidewalk is not "encrypted", but it is still locality-gated: you can only read it by being there.

Cyberspace uses region-derived keys to implement an analogue: ciphertext may be globally publishable, but deriving the key requires computing the region preimage.

### A.4 Work equivalence between travelers and observers
A key property of this design is that **observation does not provide a computational shortcut**.

In many digital systems, observers can cheaply inspect state. In Cyberspace, to discover location-gated content you must compute region preimages (Cantor roots and hashes) whether you:
- traveled along a published movement chain, or
- computed the region directly for an arbitrary coordinate.

This appendix is explanatory only; it does not add or modify any normative requirements.

---

## Appendix B. Scale Parameter Rationale (non-normative)

This appendix explains the design rationale for the Cantor Height 34 scale parameter.

### B.1 The Scale of Cyberspace in Reality

The prior scale of cyberspace was set to fit the entire coordinate system within 96056km diameter on Earth's center point. This scale was not appropriate for the V2 spec as it made reasonable distances impossibly difficult to compute with consumer-level hardware. It could be argued that the V1 spec was also unreasonably difficult to traverse due to its unreasonably fine scale.

The new scale of cyberspace is vastly increased (0.48 light-years along each axis) in order that consumer level hardware can traverse human-centric distances.

The new mapping is this: a 3D Cantor axis root at height 34 represents 2 meters cubed in dataspace (ideaspace has no physical mapping).

This mapping is the product of rigorous testing to determine what physical scales could be computed on consumer hardware (2026) versus nation-state resources.

At this scale, consumers can travel reasonable distances and derive useful human-scale location-based secrets with significant effort, or, they can pay moderate amounts of money for cloud compute in order to travel large distances and derive larger location-based secrets with ease.

Additionally, at this scale, it still remains impossible for nation states to derive the Cantor roots for large areas of land. By design, nation-states with unlimited resources should not be able to derive the Cantor root for a whole national territory, continent, Earth, nor geosynchronous orbit for the next ~100 years. The best a nation-state will be able to do is capture a whole city or part of a metropolis. 

The primary bottleneck is the amount of data storage need to hold the Cantor pairs, which rapdily approaches all of the data storage on Earth long before any sizable territory could be calculated. See §B.6.

Aesthetics of the height 34 mapping:
- 2 meters is a metaphor for the human scale of the universe
- Cantor Height 34 / 85 bit axis = 34 / 85 = 0.4 = 2/5. A rational and easy to remember relationship, 2:5
- Cantor Height 33 = 1 meter
- 1 Gibson at this scale is roughly the size of a hydrogen atom, the first atomic element.

### B.2 No Difficulty Adjustment

Unlike Bitcoin, Cyberspace has no difficulty adjustment mechanism. The Cantor Height 34 scale is fixed by mathematical definition.

**Rationale:** Difficulty adjustment would overcomplicate the protocol. Coordinates are mathematical objects, not competitive resources. A coordinate's Cantor tree is deterministic - it cannot be made "harder" without changing the coordinate itself.

**Implication:** As technology advances (Moore's Law, storage density improvements, specialized hardware), all parties will gain access to greater computation and data storage. This will gradually increase the size and intensity of territorial claims over time.

**Mitigation:** Future DECKs may define new "layers" with higher heights for applications requiring stronger territorial guarantees. The base protocol remains stable; difficulty migrates upward through extension mechanisms over decades.

### B.4 Consumer Benchmarks (Cantor Height 34, 2-meter scale)

The following benchmarks assume disk-based computation (streaming intermediate values to storage rather than holding in RAM). Storage is the primary limiting factor in Cantor tree traversal at these heights.

| Root Volume | Time (Consumer) | Disk Space Required |
|--------------|-----------------|---------------------|
| 1 m³ | ~1.2 days | 0.5 TB |
| 5 m³ | ~6.2 days | 2.5 TB |
| 50 m³ | ~62 days | 25 TB |
| 150 m³ | ~186 days | 75 TB |

**Notes:**
- "Consumer" assumes a modern desktop or small server with 1-2 TB available storage for smaller claims, or external storage arrays for larger claims.
- Computation is parallelizable; cloud spot instances can reduce wall-clock time at additional cost economics.
- Contiguous claims are significantly more efficient than discrete parcels due to Cantor subtree structure sharing (see §B.6).

### B.5 Nation-State Limits (Cantor Height 34, 2-meter scale)

At Cantor Height 34, even a nation-state-level actor with substantial computational resources faces hard limits:

| Root Size | Approximate Feasibility | Storage Required |
|------------|------------------------|------------------|
| Single city (~50 km²) | Feasible with significant investment | ~25 TB |
| ~28 cities (~1,400 km² total) | Upper bound for sustained effort | ~700 TB |
| Country-scale (e.g., Netherlands, ~41,000 km²) | Not feasible | ~20 PB |
| Continental-scale | Not feasible | Exabyte-scale |
| Earth surface | Not feasible | Zettabyte-scale |
| GEO sphere | Not feasible | Beyond current technology |

**Derivation of the ~28 cities limit:**

A "city" is approximated as a 50 km² area (roughly a 7×7 km square). At Cantor Height 34/2m scale:
- 1 m³ root requires ~0.5 TB storage
- 50 km² root (at ~10m height) requires ~25 TB storage
- A nation-state with 1 PB storage capacity can root approximately 40 such regions

However, practical constraints (I/O bandwidth, computation time, infrastructure costs) reduce this to approximately 28-35 cities as a realistic upper bound for sustained effort.

**Why countries are infeasible:**

The Netherlands covers approximately 41,000 km². At Cantor Height 34/2m:
- Surface area alone (ignoring height) would require ~20 PB storage
- I/O bandwidth to process this data would require months or years even with nation-state infrastructure
- The storage requirement exceeds what even well-funded national data centers typically maintain for single workloads

The limiting factor is **data storage and I/O bandwidth**, not raw compute. A Cantor Height 34 Cantor tree traversal produces massive intermediate data. There is no shortcut - the protocol's work equivalence property ensures that storing and processing this data cannot be optimized away.

### B.6 Storage as the Primary Constraint

Cantor tree computation is memory-bound. At Cantor Height 34, a single subtree contains 2³⁴ ≈ 17 billion leaf nodes. The intermediate values cannot fit in RAM and must be streamed to disk.

**This is intentional.** Storage is the equalizer:
- Consumer SSDs provide enough I/O for small roots
- Nation-states have faster storage, but the exponential growth of tree size limits scaling
- There is no "ASIC advantage" - the bottleneck is data movement, not hash rate

The storage constraint ensures that territorial roots remain bounded by physical infrastructure, not just financial resources.

---

## Appendix C. Sidestep Rationale — Storage Bottleneck and the Merkle Alternative (non-normative)

### C.1 Why the sidestep exists

The sidestep was introduced to solve a specific problem: Cantor pairing trees become **storage-infeasible** well before they become compute-infeasible.

At LCA height `h`, a Cantor pairing tree produces `2^h` leaves, but the **intermediate values** grow exponentially in bit size. The Cantor pairing function `π(a, b) = (a + b)(a + b + 1)/2 + b` produces outputs roughly quadratic in the size of its inputs. After `h` levels of binary pairing, intermediate values can be millions or billions of bits long. These intermediates must be stored during tree construction because the tree is built bottom-up and parent nodes require both children.

| LCA Height | Cantor Intermediate Storage | Merkle Working Memory |
|---:|---:|---:|
| h20 | ~11 MB | 640 bytes |
| h30 | ~11 GB | 960 bytes |
| h34 | ~170 GB | 1,088 bytes |
| h40 | ~11 TB | 1,280 bytes |
| h50 | ~11 PB | 1,600 bytes |
| h60 | ~11 EB (exceeds all storage on earth) | 1,920 bytes |

The fundamental insight: SHA256 operations are **fixed-size** (256 bits in, 256 bits out) regardless of tree height. A Merkle tree over the same leaf set requires the same number of operations as a Cantor tree but with O(h × 32 bytes) working memory instead of O(2^h × variable) storage.

### C.2 Why not replace Cantor entirely?

The Cantor pairing tree has properties that the Merkle tree does not:

1. **Bijective spatial encoding:** Each Cantor root uniquely identifies a region and is a mathematical function of its coordinates. Merkle roots are SHA256 digests — opaque identifiers with no algebraic relationship to the coordinate space.
2. **Location-based encryption:** The double-SHA256 key derivation in §7 relies on Cantor roots as the region preimage. Merkle roots cannot substitute here because they don't share the hierarchical algebraic structure that makes Cantor roots meaningful as encryption anchors.
3. **Decomposition invariance (§5.4.1):** The proof that sequential decomposition doesn't reduce cost is a property of the Cantor pairing, not of Merkle hashing.

The sidestep is therefore a **complement** to the hop, not a replacement. Each serves a different regime:

| Regime | Action | Why |
|---|---|---|
| LCA ≤ machine storage capacity | **Hop** (Cantor) | Faster (~100×), produces meaningful spatial root |
| LCA > storage capacity, ≤ hash-time ceiling | **Sidestep** (Merkle) | Storage-efficient, trades time for memory |
| LCA > hash-time ceiling | **Hyperjump** (DECK-0001) | Neither Cantor nor Merkle is feasible |

### C.3 The entering ≠ claiming separation

A critical consequence of using Merkle trees instead of Cantor trees for sidesteps: the sidestep proof reveals **nothing** about the Cantor root of the region.

This means sidestepping into a claimed domain does not grant domain authority. The domain owner computed the full Cantor root (a far more expensive operation). A visitor who sidesteps in only proved they hashed the leaf coordinates — a fundamentally different computation.

This separation is desirable: it creates a natural asymmetry between residents (who have invested in Cantor computation) and visitors (who have done the minimum work to cross the boundary).

### C.4 Natural continents

The sidestep ceiling creates emergent geography in the coordinate space. Boundaries at different LCA heights have different crossing costs:

- **h ≤ ~35:** Crossable by hop on consumer hardware (seconds to minutes)
- **h35–50:** Crossable by sidestep on consumer hardware (hours to months)
- **h50–58:** Crossable by sidestep with cloud compute investment ($200–$1,000)
- **h60+:** Not crossable by any direct computation — requires hyperjump transit

This layered accessibility means that "continents" (regions bounded by high LCA walls) emerge naturally from the mathematics, not from protocol parameters. Different agents experience different continental boundaries based on their hardware and patience — there is no single universal map of "passable" and "impassable" walls.

