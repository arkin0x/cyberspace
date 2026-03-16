# Cyberspace v2 — Per-Axis Cantor Tree Traversal with Location-Based Encryption

**Date:** February 10, 2026  
**Last updated:** March 14, 2026  
**Status:** Design complete (spec); reference implementation in progress

This document is the canonical specification for Cyberspace v2.

Normative sections are written using RFC-style language (MUST/SHOULD/MAY). Explanatory material is explicitly labeled **non-normative**.

This spec defines:
- The 256-bit coordinate system (X/Y/Z u85 + plane bit)
- A deterministic, consensus-oriented GPS→dataspace mapping (plane=0)
- A movement proof system based on **per-axis Cantor pairing trees**
- A per-hop **temporal work axis** derived from the Nostr movement chain (prevents cached/replayed hop proofs)
- Location-based encryption and discovery primitives derived from **region** Cantor numbers

Reference implementation: https://github.com/arkin0x/cyberspace-cli

For design rationale and extended discussion, see `RATIONALE.md` https://github.com/arkin0x/cyberspace/blob/master/RATIONALE.md (non-normative).

---

## Overview
Cyberspace is a 256-bit coordinate system navigated by Schnorr keypairs using proof-of-work-like computation.

Keypairs traverse Cyberspace by publishing signed Nostr events that commit to their movement history. Movement costs are derived from computing Cantor tree roots that represent the aligned spatial regions implied by a hop, plus a temporal work component derived from chain context so that every hop costs work.

Key properties:
- **Schnorr keypairs prove traversal** by publishing signed movement events.
- **Public key = spawn coordinate:** identity maps directly into the coordinate fabric.
- **Every hop costs work:** movement proofs include a temporal Cantor traversal derived from the previous event id.
- **Movement requires work:** computing mathematical structure (Cantor roots of coordinate pairs), not arbitrary nonce grinding.
- **Axis symmetry:** equal distances cost equal work regardless of direction.
- **Cantor Height 34 scale:** the canonical scale for dataspace (plane=0) mapping to physical reality, defining 1 Gibson ≈ 1.16×10⁻¹⁰ meters. This scale applies only to the GPS→dataspace mapping.
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
- `CANONICAL_GPS_TO_DATASPACE_SPEC_VERSION = "2026-03-14-decimal-v2-h34"`

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
   - `units_per_km = 2^84 / 48028` (maps GEO diameter to centered region)
   - `u = km * units_per_km + 2^84`
   - round using `ROUND_HALF_EVEN`
   - clamp to `[0, 2^85 - 1]`
   
   Note: This formula maps GPS coordinates into a GEO-centered region of dataspace. At Cantor Height 34 scale, this region is a tiny fraction (~0.000000002%) of the full axis extent (~4.5 trillion km).
10. Produce coord256 with `plane=0` using the interleaving in §2.

### 4.5 Golden vectors (consensus locks)
Implementations SHOULD include golden-vector tests to detect accidental mapping drift.

These are required vectors for spec version `2026-03-14-decimal-v2-h34` (hex is 32 bytes, no `0x` prefix).

Golden vectors assume `altitude_m = 0` with clamp-to-surface behavior enabled:
- `origin_equator_prime` lat=0 lon=0
  - `e040009249248048201201000049208000201009201200000040049201048240`
- `equator_east_90` lat=0 lon=90
  - `e010002492492012080480400012482000080402480480000010012480412090`
- `equator_west_90` lat=0 lon=-90
  - `c482490000000480412012092480010492412090012012492482480012080410`
- `north_pole` lat=90 lon=0
  - `e020004920020000120820120124900900100024124904920904124120100124`
- `london` lat=51.5074 lon=-0.1278
  - `c49eeba5feb124bd3ec0f3a132977c8c33edbb111fdfd02cb35cea53075b9846`
- `nyc` lat=40.7128 lon=-74.0060
  - `c4943fa01bb22b95946ec1605717047a3b79bd717d5d84e35a12cb56df76134a`

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

### 5.3 Axis subtree root (definition)
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

### 5.4 3D combination
Compute axis roots independently:
- `cantor_x = axis_root(x1, x2)`
- `cantor_y = axis_root(y1, y2)`
- `cantor_z = axis_root(z1, z2)`

Then combine:
- `region_n = π(π(cantor_x, cantor_y), cantor_z)`

### 5.4.1 Region uniqueness (non-normative)
- Each aligned subtree root corresponds to a unique region (Cantor pairing is a bijection).
- Many coordinate pairs inside the same aligned subtree share the same root.

Example (1D):
```
LCA(0, 3) => subtree [0..3] => root = 228
LCA(1, 2) => subtree [0..3] => root = 228
LCA(0, 2) => subtree [0..3] => root = 228
```

This is intentional: the Cantor root `region_n` is a **region identifier**, not a unique coordinate-pair identifier.

### 5.4.2 Temporal axis root (hop freshness)
To prevent proof reuse and guarantee fresh work per hop, hop proofs include an additional Cantor-tree root derived from Nostr chain context.

This temporal axis has two inputs:
- a hop-specific **height** `K` derived from the destination coordinate (a deterministic "terrain" function), and
- a hop-specific **seed** `t` derived from the `previous_event_id`.

#### 5.4.2.1 Terrain-derived temporal height K (normative)
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

#### 5.4.2.2 Temporal axis seed and root (normative)
For hop events, let `previous_event_id` be the 32-byte NIP-01 event id referenced by the `e` tag with marker `previous` (§6.4).

1. Parse `previous_event_id` from lowercase hex into 32 bytes.
2. Interpret it as a big-endian integer and reduce it into the u85 axis (the least-significant 85 bits):
   - `prev_id_int = int.from_bytes(previous_event_id_bytes, "big")`
   - `t = prev_id_int % (1 << 85)`
3. Compute an aligned temporal subtree and its Cantor root (at the terrain-derived height `K`):
   - `t_base = (t >> K) << K`
   - `cantor_t = compute_subtree_cantor(t_base, K)`

Note (non-normative): the temporal axis is derived from chain context and destination coordinates, not wall-clock time. There is no continuous "alive" cost; you pay this work only when you publish a hop.

### 5.4.3 4D hop preimage (space + time)
Define the hop preimage integer:
- `hop_n = π(region_n, cantor_t)`

### 5.5 Integer→bytes encoding (normative)
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

### 5.6 Movement proof hash
The movement proof hash is derived from the 4D hop preimage `hop_n` (space + time). This intentionally differs from the stable spatial region identifiers used for location-based encryption and discovery (§7).

- `hop_bytes = int_to_bytes_be_min(hop_n)`
- `movement_proof_key = sha256(hop_bytes)` (32 bytes)
- `proof_hash = sha256(movement_proof_key)` (32 bytes)

When used in Nostr tags, `proof_hash` MUST be encoded as lowercase hex in the `proof` tag.

### 5.6.1 Worked example (non-normative)
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
- `K = 11`

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

### 5.7 Performance expectations (non-normative)
Reference implementations typically observe that cost grows with the per-axis LCA height (because the aligned subtree contains `2^h` leaves).

In addition, hop proofs include a temporal axis traversal at a terrain-derived height `K` (§5.4.2.1), imposing a non-cacheable work component per hop even when the spatial `region_n` is reused. Because `K` depends on the destination coordinate, some regions of cyberspace are intrinsically easier or harder to traverse.

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

### 6.5 Verification summary
To verify a hop:
1. Parse previous and current coords; decode to `(x1,y1,z1,plane)` and `(x2,y2,z2,plane)`.
2. Plane changes are valid in v2; verifiers MUST support hops where `plane1 != plane2`.
3. Compute the stable spatial region integer `region_n` per §5.4.
4. Derive the terrain-based temporal height `K` from the destination coordinate `(x2,y2,z2,plane2)` per §5.4.2.1 (including the destination plane bit).
5. Compute the temporal axis root `cantor_t` from the hop event’s `previous_event_id` (`e` tag with marker `previous`) and `K` per §5.4.2.2.
6. Compute `hop_n = π(region_n, cantor_t)` per §5.4.3.
7. Compute `proof_hash` per §5.6.
8. Accept iff it matches the event’s `proof` tag.

### 6.6 Protocol extensions
This specification defines the base Cyberspace v2 protocol.

Optional extensions MAY introduce new event kinds, new movement action types (`A` tag values), and/or additional validation rules that are only applied when an extension is in use.

Extensions are specified as **Design Extension and Compatibility Kits (DECKs)** in the `decks/` directory.
- Hyperjumps extension: `decks/DECK-0001-hyperjumps.md`
- Hyperjumps extension: `extensions/DECK-0001-hyperjumps.md`

---

## 7. Location-Based Encryption and Discovery
This section defines key derivation from region Cantor numbers.

### 7.1 Key derivation
Given a spatial region integer `region_n` (the 3D region identifier from §5.4 for some aligned region):
- `region_bytes = int_to_bytes_be_min(region_n)`
- `location_decryption_key = sha256(region_bytes)`
- `lookup_id = sha256(location_decryption_key)`

Note (non-normative): the temporal axis used for hop proofs (§5.4.2) is intentionally not included here. Location-based identifiers and keys remain a stable function of spatial regions.

Outputs are 32-byte digests. When used in Nostr tags, they MUST be lowercase hex.

### 7.1.1 Discovery radius property (non-normative)
Cantor subtree roots represent **aligned regions**. Choosing a subtree height implicitly chooses a discovery radius.

Illustrative metaphor:

| Height | Coverage (per axis) | Metaphor |
|---:|---:|---|
| 0 | 1 coordinate | Message scratched on one cobblestone |
| 4 | 16 coordinates | Message on a street corner |
| 10 | 1,024 coordinates | Billboard in a neighborhood |
| 20 | ~1,000,000 coordinates | Broadcast across a district |

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
When moving, many higher subtrees do not change.

Example (1D):
```
position 7 is in:  [6..7], [4..7], [0..7], [0..15], [0..31], ...
position 8 is in:  [8..9], [8..11], [8..15], [0..15], [0..31], ...
                           ^
                     [0..15] and above are unchanged
```

Only recompute subtrees when you cross a boundary for that height.

Note: this caching optimization applies to spatial region computations. Hop proofs still require computing the temporal axis root per §5.4.2 on every hop.

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

In dataspace-kilometers-from-center units (as used by §4.4 step 9), this is:
- `black_sun = (x_km=0, y_km=0, z_km=+DATASPACE_HALF_AXIS_KM)`

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

### B.1 Primary Design Constraint: Territorial Balance

The Cantor Height 34 scale is tuned to create a fundamental asymmetry between individual consumers and nation-state actors:

**Consumers** can mine small territorial claims (a room, a building, a small property) with consumer-grade hardware and reasonable time investment.

**Nation-states** cannot claim regions larger than a modest number of cities, and are computationally prevented from claiming the entire Earth or geosynchronous orbit sphere.

This balance is the primary focus of the scale parameter. The goal is not to make territory claims impossible for powerful actors, but to ensure that meaningful territorial presence requires proportional investment, and that no single actor can monopolize cyberspace.

### B.2 No Difficulty Adjustment

Unlike Bitcoin, Cyberspace has no difficulty adjustment mechanism. The Cantor Height 34 scale is fixed by mathematical definition.

**Rationale:** Difficulty adjustment would overcomplicate the protocol. Coordinates are mathematical objects, not competitive resources. A coordinate's Cantor tree is deterministic — it cannot be made "harder" without changing the coordinate itself.

**Implication:** As technology advances (Moore's Law, storage density improvements, specialized hardware), all parties will gain access to greater computation and data storage. This will gradually increase the size and intensity of territorial claims over time.

**Mitigation:** Future DECKs may define new "layers" with higher heights for applications requiring stronger territorial guarantees. The base protocol remains stable; difficulty migrates upward through extension mechanisms over decades.

### B.3 The Cantor Height 34 / Axis Ratio

Cantor Height 34 was chosen in part for its mathematical elegance:

```
Cantor Height 34 / Axis 85 = 0.4 = 2/5
```

This simple 2:5 ratio between the territorial height and the full axis width is easy to remember and communicate. Combined with the atomic-scale Gibson (≈ hydrogen atom diameter), Cantor Height 34 gives cyberspace a coherent physical metaphor.

### B.4 Consumer Benchmarks (Cantor Height 34, 2-meter scale)

The following benchmarks assume disk-based computation (streaming intermediate values to storage rather than holding in RAM). Storage is the primary limiting factor in Cantor tree traversal at these heights.

| Claim Volume | Time (Consumer) | Disk Space Required |
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

| Claim Type | Approximate Feasibility | Storage Required |
|------------|------------------------|------------------|
| Single city (~50 km²) | Feasible with significant investment | ~25 TB |
| ~28 cities (~1,400 km² total) | Upper bound for sustained effort | ~700 TB |
| Country-scale (e.g., Netherlands, ~41,000 km²) | Not feasible | ~20 PB |
| Continental-scale | Not feasible | Exabyte-scale |
| Earth surface | Not feasible | Zettabyte-scale |
| GEO sphere | Not feasible | Beyond current technology |

**Derivation of the ~28 cities limit:**

A "city" is approximated as a 50 km² area (roughly a 7×7 km square). At Cantor Height 34/2m scale:
- 1 m³ claim requires ~0.5 TB storage
- 50 km² claim (at ~10m height) requires ~25 TB storage
- A nation-state with 1 PB storage capacity can claim approximately 40 such regions

However, practical constraints (I/O bandwidth, computation time, infrastructure costs) reduce this to approximately 28-35 cities as a realistic upper bound for sustained effort.

**Why countries are infeasible:**

The Netherlands covers approximately 41,000 km². At Cantor Height 34/2m:
- Surface area alone (ignoring height) would require ~20 PB storage
- I/O bandwidth to process this data would require months or years even with nation-state infrastructure
- The storage requirement exceeds what even well-funded national data centers typically maintain for single workloads

The limiting factor is **data storage and I/O bandwidth**, not raw compute. A Cantor Height 34 Cantor tree traversal produces massive intermediate data. There is no shortcut — the protocol's work equivalence property ensures that storing and processing this data cannot be optimized away.

### B.6 Storage as the Primary Constraint

Cantor tree computation is memory-bound. At Cantor Height 34, a single subtree contains 2³⁴ ≈ 17 billion leaf nodes. The intermediate values cannot fit in RAM and must be streamed to disk.

**This is intentional.** Storage is the equalizer:
- Consumer SSDs provide enough I/O for small claims
- Nation-states have faster storage, but the exponential growth of tree size limits scaling
- There is no "ASIC advantage" — the bottleneck is data movement, not hash rate

The storage constraint ensures that territorial claims remain bounded by physical infrastructure, not just financial resources.

### B.7 Territorial Cohesion (Emergent Property)

An emergent property of the Cantor tree structure: **computing a contiguous region is dramatically cheaper than computing equivalent volume as discrete parcels.**

For Cantor Height 34 claims, contiguous computation is approximately **22,500× more efficient** than discrete parcel computation for the same total volume.

**Implications:**
- Land speculation (claiming many small parcels) is computationally expensive
- Meaningful presence (contiguous activity) is rewarded
- Governance structures emerge naturally from mathematical efficiency

This property was not explicitly designed — it emerges from the structure of Cantor pairing and subtree sharing.

This appendix is explanatory only; it does not add or modify any normative requirements.
