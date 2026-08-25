# DECK-0001: Hyperspace (Bitcoin block transit)

DECK: 0001
Title: Hyperspace (Bitcoin block transit)
Status: Draft v3 (supersedes the v2 draft of 2026-04-16 and the v1 draft of 2026-02-28)
Created: 2026-02-28
Last updated: 2026-08-24
Requires: `CYBERSPACE_V2.md` (spec version `2026-03-16-h34-corrected`)

## Abstract

Hyperspace is a one-dimensional transit line threaded through Cyberspace by Bitcoin's proof of work. Every Bitcoin block is a **stop** on the line, numbered by block height. The merkle root of a block decides what kind of stop it is: a root whose plane bit is 1 is a **port** in ideaspace, sitting exactly at the root's coordinate; a root whose plane bit is 0 has fallen to Earth as a **landfall**, sitting on the WGS84 surface at a point chosen by the block hash. Nobody can predict where the next stop will be, and every stop was paid for by the mining network.

An identity boards the line from wherever it is standing, by publishing an `enter-hyperspace` action. It does not choose where on the line it appears: it appears at its **station**, the stop nearest to it in the protocol's own metric. From the station it **rides** the line to any other stop by publishing a `hyperjump` action whose proof carries seeded, non-cacheable work for every block passed. It **exits** by publishing an ordinary hop or sidestep from the stop's coordinate.

This design keeps locality where the base protocol puts it: at destinations. Leaving is easy, arrival is pinned to a stop, and the last mile from the stop to anywhere else is ordinary movement. Landfalls make Earth's surface reachable from anywhere for the price of a toll, a ride, and a short walk; the interior of the 2^85 cube stays wild.

**Actions defined (all `kind 3333`, per the locked action-kind pattern):**

| `A` tag | Purpose | Proof |
|---|---|---|
| `enter-hyperspace` | board the line at the station | temporal-axis proof at the current coordinate (toll reserved, see §7) |
| `hyperjump` | ride from one stop to another | Merkle root over per-block seeded Cantor work, with sampled openings |

Exit uses the base protocol's `hop` or `sidestep`; no new action is needed.

**Block anchor events** (`kind 321`) remain the discovery convenience; §2 revises their format.

---

## Terms

- **Line:** the sequence of Bitcoin blocks ordered by height. Hyperspace is the line.
- **Stop:** one Bitcoin block, as a location. Every stop has a height `B`, a block hash `H`, a merkle root `M`, and a stop coordinate `C`.
- **Port:** a stop whose merkle root has plane bit 1. Its coordinate is the merkle root itself, interpreted as a coord256 (ideaspace).
- **Landfall:** a stop whose merkle root has plane bit 0. Its coordinate is a point on the WGS84 ellipsoid surface derived from the block hash (dataspace).
- **Station:** the stop an identity appears at when it boards: the stop nearest its current coordinate (§4).
- **Ride:** a `hyperjump` action from one stop to another. Its length is the number of blocks passed.
- **Exit:** a `hop` or `sidestep` whose origin is a stop coordinate.
- **Block anchor event:** a `kind 321` Nostr event binding a block's identifiers to its stop coordinate.

---

## 1. Stop coordinates (normative)

### 1.1 Plane selection

Let `merkle_root_int` be the block's merkle root interpreted as a 256-bit big-endian integer from its standard hex display form (the same convention block explorers use). Implementations MUST agree on this byte order.

```
plane = merkle_root_int & 1
```

- `plane = 1`: the stop is a **port**. `C = merkle_root_int` (unchanged from earlier drafts).
- `plane = 0`: the stop is a **landfall**. `C` is derived from the block hash per §1.2.

The merkle root decides the plane in both cases. For a landfall the root's X/Y/Z bits are not used as a position; the block hash supplies the position. Because a block hash cannot be steered by its miner except by discarding valid blocks, landfall positions cannot be chosen (§9.4).

### 1.2 Landfall derivation

**Constant:** `LANDFALL_DOMAIN = b"CYBERSPACE_LANDFALL_V1"` (ASCII bytes). If any part of this derivation changes, the domain string MUST be bumped.

**Inputs:** the 32-byte block hash `H` in its standard big-endian display byte order.

**Arithmetic:** every step below is performed in the decimal context of `CYBERSPACE_V2.md` §9.5 (precision 96, `ROUND_HALF_EVEN`, the exact `PI_STR`, the deterministic Taylor `sin`/`cos` with `TRIG_EPS` and `TRIG_MAX_ITER`). Square roots are the context's correctly rounded square root. Operations MUST be performed in the order written, each rounded to the context, so that independent implementations agree bit for bit.

1. `seed = sha256(LANDFALL_DOMAIN || H)` (32 bytes).
2. `u1 = int(seed[0:16]) / 2^128` and `u2 = int(seed[16:32]) / 2^128`, both as exact decimals (`int()` big-endian).
3. `lon = (2 * u1 - 1) * PI` (radians, in `[-PI, PI)`).
4. `z = 2 * u2 - 1` (the z component of a unit direction, in `[-1, 1)`).
5. `rxy = sqrt(1 - z * z)`.
6. `(sin_lon, cos_lon) = sincos(lon)` per §9.5.
7. `dx = rxy * cos_lon`, `dy = rxy * sin_lon`, `dz = z`. This is a unit direction in ECEF, uniformly distributed on the sphere.
8. With `a = 6378137` (metres) and `b = a * (1 - f)`, `f = 1 / 298.257223563`:
   `inv = sqrt((dx*dx + dy*dy) / (a*a) + (dz*dz) / (b*b))` and `r = 1 / inv` (metres). `r * d` is the point where the direction `d` meets the WGS84 ellipsoid surface.
9. `x_km = r * dx / 1000`, `y_km = r * dy / 1000`, `z_km = r * dz / 1000` (ECEF kilometres).
10. Permute into Cyberspace axes per §9.4 (`X_cs = X_ecef`, `Y_cs = Z_ecef`, `Z_cs = Y_ecef`) and convert kilometres to u85 per §9.7 step 9 (`u = km * units_per_km + 2^84`, `ROUND_HALF_EVEN`, clamp).
11. `C = xyz_to_coord(x, y, z, plane = 0)`.

The result lies on the ellipsoid (geodetic altitude 0). The distribution is uniform in geocentric solid angle, which is uniform in surface area to within the WGS84 flattening (0.3%).

**Golden vectors (consensus locks).** Block hashes are mainnet. `landfall` is the coord256 as 64 lowercase hex characters. The approximate latitude/longitude columns are informational only.

| Height | Block hash | Landfall coord256 | ~lat, lon |
|---:|---|---|---|
| 398 | `000000002f7d702a27ccd65158740198f79d4ba1ddea8ab14b56b63a6289fe89` | `56db6db6db6db6db6db6db3e27c436f9d3b79fb5fc6457798936b3e749e38f56` | 31.63, -98.85 |
| 100399 | `000000000003cb256436f213199e7047e187ab99e6d3176262bfb9be49d2a31a` | `3b6db6db6db6db6db6db6d1eb09e85e5f572906af5a025a39ae284dd83278b72` | -54.83, 129.06 |
| 300399 | `0000000000000000212f189879294318528669d239d5fbd30e6ffcc6015ced21` | `c492492492492492492492c7807ba8ecefd0a48a7b41dfbb50da5947b489ed8c` | 57.04, -60.77 |
| 363199 | `000000000000000001e65a8804c7d97ee1fd52394632bdebdaf402935dcddeec` | `a9249249249249249249258087f30451bd8dd013357959fe2b07fa052488980c` | -39.03, 5.70 |
| 500399 | `000000000000000000521f92387f9f43258f62465e9f88b19ecad2c30e44d7ff` | `3b6db6db6db6db6db6db6d312f699ee9f35318557d9ee813b46f229215524a30` | -65.92, 134.98 |
| 700398 | `00000000000000000005608e4c1ff53901186e766df5eaa87c636857ed814fa9` | `56db6db6db6db6db6db6dbfdb284c1592e0d02ffd65f9d6c12d48a2b483d7da0` | 86.47, -109.22 |
| 900399 | `00000000000000000001e412795ed39b18e56338e9b3c20d91edf59d20e020c9` | `c4924924924924924924920c53c81e9d260623340e5c3a75b6de6e4715cd1724` | 6.07, -75.88 |
| 950399 | `00000000000000000001f081b994866dc3beb2c3ecd5976e9bda474e54e027c1` | `e000000000000000000000618f9c2d172da11fc0701996d4a89df1f60aecf732` | 3.86, 63.90 |

Reference implementation: `decks/landfall-reference.py` in this repository (stdlib Python; executing it checks all eight vectors). The ONOSENDAI client's `landfall` module (decimal.js) and the NTH publisher reproduce them byte for byte.

### 1.3 Sector tags

Sector tags `X`, `Y`, `Z`, `S` for any event that carries a stop coordinate are computed from `C` per `CYBERSPACE_V2.md` §10, not from the merkle root.

---

## 2. Block anchor events (kind 321)

Stops are discoverable on Nostr through **block anchor events**. Anchors are a convenience: an implementation with its own block source MAY derive every stop itself, and anchors on relays are not guaranteed accurate.

### 2.1 Required tags (normative)

- `C`: `["C", "<stop_coord_hex>"]`, the stop coordinate per §1 (a port's merkle root, or a landfall coordinate).
- `M`: `["M", "<merkle_root_hex>"]`, the block's merkle root (32-byte lowercase hex). For a port `M == C`.
- `B`: `["B", "<height>"]`, the block height (base-10 string).
- `H`: `["H", "<block_hash_hex>"]`.
- `P`: `["P", "<prev_block_hash_hex>"]`.
- Sector tags `X`, `Y`, `Z`, `S` computed from `C`.

Anchors SHOULD include `net` (`mainnet` assumed if absent) and `N` (next block hash) once known.

### 2.2 Legacy anchors (normative)

Anchors published before this revision carry `C = merkle_root` for every block and no `M` tag. An implementation encountering a `kind 321` event without an `M` tag MUST treat its `C` as the merkle root, derive the plane per §1.1, and for plane-0 blocks derive the landfall coordinate itself from `H` per §1.2. Such events MUST NOT be used as a source of landfall coordinates directly.

### 2.3 Validation (normative)

An anchor is valid for a given stop iff `M` and `H` match the block at height `B` on the selected network, `P` matches its previous block hash, and `C` equals the derivation of §1 from `M` and `H`. How an implementation obtains block data is out of scope (full node, headers-only, trusted checkpoints).

### 2.4 Bulk distribution (non-normative)

Fetching the whole line as anchor events does not scale: the ~964k stops of
2026 are roughly 570 MB of signed events, and per-event signature checks
alone dominate a session. The reference stack instead distributes the line
as **header blobs**: statically served files of 48-byte records (version,
merkle root, time, bits, nonce; the previous-block hash is omitted and
reconstructed), from which a client rebuilds each 80-byte wire header,
verifies SPV rules end to end (hash linkage, proof of work against `bits`,
the 2016-block difficulty windows), and derives every stop coordinate per
§1 locally. Nothing about the blobs is trusted: they prove their own work,
a manifest carries the final block hash of each blob, and the client pins
its own embedded checkpoint hashes so a compromised manifest host cannot
substitute a chain. Measured in the reference web client, the full line
verifies and derives from ~46 MB of static files in about 30 seconds,
with anchors remaining the live tail and the fallback. The format is
specified in `docs/HEADER-BLOBS.md` of the `nth` repository.

---

## 3. Enter-hyperspace action

An identity boards the line by publishing an `enter-hyperspace` action from wherever it is standing. The action does not move the identity. It marks the chain position from which the first ride departs.

### 3.1 Event (normative)

Required tags:

- `A`: `["A", "enter-hyperspace"]`
- `e` genesis: `["e", "<spawn_event_id>", "", "genesis"]`
- `e` previous: `["e", "<previous_event_id>", "", "previous"]`
- `c`: `["c", "<current_coord_hex>"]`
- `C`: `["C", "<current_coord_hex>"]` (MUST equal `c`; the identity does not move)
- `proof`: `["proof", "<proof_hash_hex>"]` per §3.2
- Sector tags from `C`

Optional: `net`.

### 3.2 Entry proof (normative)

The entry proof is the base protocol's temporal axis at the current coordinate, with no spatial component:

1. `K = terrain K` at `C` per `CYBERSPACE_V2.md` §5.2 (including the plane bit).
2. `t`, `t_base`, `cantor_t` from `previous_event_id` and `K` per §5.3.
3. `enter_n = π(0, cantor_t)`.
4. `proof_hash = sha256(sha256(int_to_bytes_be_min(enter_n)))`, lowercase hex.

This binds the boarding to the identity's chain position and cannot be precomputed before the previous event exists. It is not a fare; see §7.

### 3.3 Position semantics (normative)

- After `enter-hyperspace`, the identity's location is still `C`.
- The identity's location changes only when a `hyperjump` action is published (§5). After the first ride, its location is the destination stop's coordinate.
- A `hop` or `sidestep` published immediately after `enter-hyperspace` moves from `C` as usual and cancels the boarding.
- Publishing `enter-hyperspace` while already located at a stop is valid; the station is then that stop (LCA 0).

---

## 4. The station (normative)

The station is the stop at which an identity appears on the line. It is a deterministic function of the identity's coordinate and the set of stops, computed identically by the traveler and every verifier.

### 4.1 Distance

For two coordinates `p` and `q` with axis values `(px, py, pz)` and `(qx, qy, qz)` (plane bits ignored):

```
d(p, q) = max(find_lca_height(px, qx), find_lca_height(py, qy), find_lca_height(pz, qz))
```

`d` is the height of the smallest aligned cube containing both points, which is exactly the boundary a direct hop or sidestep between them would have to cross.

### 4.2 Definition

Let `C_e` be the coordinate of the identity's `enter-hyperspace` event, and let `A` be the **station set bound**: a block height declared in the `as_of` tag of the identity's first `hyperjump` event (§5.2). `A` MUST be a height that exists on the selected network and MUST be `≥ B_to`, the ride's destination height. Let `Stops(A)` be the set of all stops with height `≤ A`.

```
station(C_e, A) = the stop s in Stops(A) minimising d(C_e, C_s),
                  ties broken by the lowest height
```

Travelers SHOULD declare the highest height they have synced (the tip) so the station is their genuine nearest stop. The declared bound replaces a clock the protocol does not have: `A` is pinned inside the signed event, so the station is a fixed, verifiable fact for the trip.

**Why not bind to the destination height (non-normative).** An earlier draft used `Stops(B_to)`. Riding toward an old block then excluded every newer stop, so a traveler whose nearest stop was recent would be assigned an ancient station and a ride hundreds of thousands of blocks long. Letting the traveler declare `A` restores the genuine nearest. The freedom this concedes is bounded: for a fixed position, the nearest stop as a function of the bound changes only at record points, roughly fourteen candidates over the whole chain history, so a traveler chooses among those and nothing else; no choice of `A` reaches an arbitrary stop.

### 4.3 Chain rule

- The first `hyperjump` after an `enter-hyperspace` MUST carry an `as_of` tag and have `from_height = station(C_e, as_of)`.
- Every subsequent `hyperjump` not separated from the previous one by a `hop` or `sidestep` MUST have `from_height` equal to the previous `hyperjump`'s `B`.
- A `hyperjump` whose previous event is neither `enter-hyperspace` nor `hyperjump` is invalid.

### 4.4 Computation (non-normative)

Because the coordinate interleaves the axes (`x84 y84 z84 x83 ...`), sharing an `L`-bit prefix of the interleaved coordinate means sharing `floor(L/3)` leading bits on every axis, so `d = 85 - floor(L/3)` and the station is the stop whose interleaved coordinate shares the longest common prefix with `C_e`. Sorting stop coordinates once turns the lookup into one binary search plus a scan of the (usually tiny) run of stops sharing the winning prefix; the height bound is applied by widening the run when the nearest stop is newer than `B_to`. No implementation needs to compare against every stop.

On Earth the station is a landfall a few tens of kilometres away (mean spacing 33 km at 476k landfalls; `d` is typically 47 to 49). In the void it is the single port inside the identity's h78 or h79 cube, shared by that whole region and changing roughly once per two million blocks. The only ways to change a station are to move to a different landfall cell (which yields a station just as random in chain terms), to cross an h78 boundary (infeasible), or to pick a different destination; none of them shortens the ride to the place the traveler wanted.

---

## 5. Hyperjump action (the ride)

A `hyperjump` moves an identity from one stop to another along the line, in either direction, in a single event. Its proof carries fresh work for every block passed.

### 5.1 Constants (normative)

```
K_LINE                    = 6
SAMPLES                   = 32
HYPERSPACE_TERRAIN_DOMAIN = b"CYBERSPACE_HYPERSPACE_TERRAIN_V1"
HYPERSPACE_SEED_DOMAIN    = b"CYBERSPACE_HYPERSPACE_SEED_V1"
HYPERSPACE_LEAF_DOMAIN    = b"CYBERSPACE_HYPERSPACE_LEAF_V1"
HYPERSPACE_SAMPLE_DOMAIN  = b"CYBERSPACE_HYPERSPACE_SAMPLE_V1"
PAD_LEAF                  = 32 zero bytes
```

Any change to a preimage format MUST bump the corresponding domain string.

### 5.2 Event (normative)

Required tags:

- `A`: `["A", "hyperjump"]`
- `e` genesis, `e` previous (as for all movement events)
- `c`: `["c", "<origin_coord_hex>"]`: the identity's current coordinate (for the first ride after boarding, the `enter-hyperspace` coordinate; otherwise the previous stop's coordinate)
- `C`: `["C", "<destination_stop_coord_hex>"]`
- `from_height`: `["from_height", "<B_from>"]` (base-10)
- `B`: `["B", "<B_to>"]` (destination height, base-10; `B_to != B_from` unless §5.6 applies)
- `as_of`: `["as_of", "<A>"]` (the station set bound, base-10; REQUIRED on the first ride after boarding, per §4.2; `A ≥ B_to`)
- `proof`: `["proof", "<merkle_root_hex>"]` per §5.4
- `mp`: `["mp", "<openings>"]` per §5.5
- Sector tags from `C`

Optional: `net`; `e` tags with markers `hyperjump_from` / `hyperjump_to` referencing anchor events.

### 5.3 Per-block work (normative)

Let `lo = min(B_from, B_to)` and `hi = max(B_from, B_to)`. The ride passes the blocks `b = lo + 1, ..., hi`, and `n = hi - lo` is its length. For each such `b`, with `H_b` its block hash (32 bytes, display order) and `previous_event_id` the 32-byte id referenced by this event's `e previous` tag:

1. **Line terrain.** `digest = sha256(HYPERSPACE_TERRAIN_DOMAIN || H_b)`; `word16 = (digest[0] << 8) | digest[1]`; `K_b = popcount(word16)` (an integer in `[0, 16]`, binomial with mean 8).
2. **Height.** `h_b = K_b + K_LINE` (an integer in `[6, 22]`).
3. **Seed.** `t_b = int(sha256(HYPERSPACE_SEED_DOMAIN || previous_event_id || be64(b))) mod 2^85`, where `be64(b)` is the height as 8 big-endian bytes.
4. **Work.** `t_base_b = (t_b >> h_b) << h_b`; `cantor_t_b = compute_subtree_cantor(t_base_b, h_b)` per `CYBERSPACE_V2.md` §4.6.
5. **Leaf.** `leaf_b = sha256(HYPERSPACE_LEAF_DOMAIN || be64(b) || int_to_bytes_be_min(cantor_t_b))`.

The seed depends on the previous event id, so no leaf can be computed before the preceding event exists, and no leaf can be reused across identities or chain positions. The height depends on the block, so the line has hills: some stretches cost more to pass than others.

### 5.4 Merkle root (normative)

Order the leaves by ascending `b`. Append `PAD_LEAF` until the count is a power of two (a single leaf needs no padding). Build the tree bottom-up with `parent = sha256(left || right)`, exactly as `CYBERSPACE_V2.md` §6.4 step 5, streaming per §6.5 if desired. The `proof` tag is the root, lowercase hex.

### 5.5 Openings and verification levels (normative)

Let `n_pad` be the padded leaf count and `depth = log2(n_pad)`.

**Sample indices.** For `i` in `0 .. SAMPLES - 1`:

```
idx_i = int(sha256(HYPERSPACE_SAMPLE_DOMAIN || root || be32(i))) mod n
```

(`be32(i)` is four big-endian bytes; indices are positions among the `n` real leaves, `0` meaning block `lo + 1`.) If `n < SAMPLES`, indices repeat; implementations MAY deduplicate.

**Openings.** The `mp` tag value is the `SAMPLES` inclusion paths joined by `:`; each path is the `depth` sibling hashes from the leaf level to the root, concatenated as lowercase hex (`64 * depth` characters). The verifier determines left/right at each level from the index.

**Level 1 verification (routine):**

1. Check chain structure, `c`, and the §4.3 chain rule (recomputing the station from the declared `as_of` bound when the previous event is an `enter-hyperspace`; the bound MUST reference an existing height and be `≥ B_to`).
2. Check `C` equals the stop coordinate for height `B` per §1 on the selected network.
3. Recompute the sample indices from `root`.
4. For each sampled index, recompute `leaf_b` from scratch per §5.3 (this requires the block hash of `b` and repeats the block's Cantor work), and verify its inclusion path to `root`.
5. Accept iff every path verifies.

**Level 2 verification (audit):** recompute every leaf and the root. As with sidesteps, security rests on deterministic fraud detectability: a root that does not correspond to the full work is permanently and objectively detectable by anyone willing to redo the ride, and a detected fraud invalidates the chain from that event forward.

**Why sampling (non-normative).** Level 1 costs `SAMPLES` blocks of work instead of `n`. A prover who skips a fraction of the leaves and grinds fake leaf values to steer the sample indices away from the gaps passes with probability `f^SAMPLES` per attempt, where `f` is the fraction actually done; with `SAMPLES = 32` a prover willing to spend about 2^40 cheap attempts can skip at most roughly half the line, and Level 2 exposes the fraud permanently. The openings are about 40 KB for a full-length ride, within common relay event-size limits.

### 5.6 Zero-length ride

If `station(C_e, B_to) == B_to` (the identity's nearest stop is its destination), the ride has `n = 0`. The event carries `from_height == B`, `proof` of 64 zero characters, and an empty `mp` value. This relocates the identity from `C_e` to the stop and is the intended meaning of boarding at one's station.

### 5.7 Cost expectations (non-normative)

Per block the expected work is about `2^6 * (3/2)^16 ≈ 42,000` Cantor pairs, with a worst block of 2^22 pairs (a 45 MB root, seconds). A ride between two random stops today averages about 320,000 blocks. Measured in the reference implementations: pure Python at small heights h14 12 ms, h16 100 ms, h18 720 ms, h20 6.6 s; the web client's worker pool averages roughly 190 ms per block in single-threaded JavaScript, which prices a full random ride in hours divided by the pool width, and a compiled bignum library brings it to the order of ten minutes. Implementations SHOULD run rides in a background worker with progress, and SHOULD persist completed leaves keyed by `(previous_event_id, b)` so an interrupted ride resumes instead of restarting; §5.3's seeding makes this safe, because a cached leaf is only ever valid for the boarding it was computed under. The line grows by about 26,000 stops of each kind per year, so the same trip lengthens slowly over time. Level 1 verification is `SAMPLES` blocks of work, seconds.

---

## 6. Exit

An identity leaves the line by publishing a `hop` or `sidestep` whose `c` tag is the stop coordinate it is located at. No new rule applies: the exit is validated by the base protocol. A landfall exit begins in dataspace on the ellipsoid surface; a port exit begins in ideaspace at the merkle root. The stop coordinate is the bridge between the line and the space.

Because exits are pinned to stops, hyperspace cannot be used to arrive at an arbitrary coordinate. The last mile from a stop is ordinary movement, and any region root (a discovery key or a domain) still costs its full Cantor computation. Entering is not claiming.

---

## 7. Toll (reserved)

A boarding toll, fixed work paid by `enter-hyperspace` beyond the temporal-axis proof of §3.2, is reserved for a future revision of this DECK. Its purpose would be to price departure independently of the ride. The domain string `CYBERSPACE_ENTER_HYPERSPACE_V1` is reserved for it. Until it is specified, §3.2 is the whole entry cost, and the ride (§5) is the whole price of hyperspace.

---

## 8. Equivocation and chain integrity (normative)

- Two movement events with the same `previous_event_id` are a fork; both branches are invalid from that point.
- `enter-hyperspace` MAY follow any movement action.
- `hyperjump` MUST follow `enter-hyperspace` or `hyperjump` (§4.3).
- A stop's coordinate MUST be verified against Bitcoin consensus for the selected network; implementations SHOULD treat stops with fewer than six confirmations as provisional and avoid them as destinations.

---

## 9. Geography of hyperspace (non-normative)

### 9.1 Why exits stay pinned

The 2^85-per-axis cube is an ultrametric space: the cost of a move is set by the highest bit at which the endpoints differ, so targets become reachable by becoming numerous, never by becoming larger. About a million ports are a million random points in the cube; the nearest one to a random position is h78 away, and the interior between them is permanently wild. Hyperspace connects the neighbourhoods of stops. It does not, and cannot, connect arbitrary points.

### 9.2 Why Earth needed landfall

Earth's radius is 2^55.6 Gibsons, so the cube that contains one Earth octant is h57 and Earth occupies 2^-85 of the volume. The expected number of ports inside it is 5 × 10^-20 at any block count. No rescaling helps: a random point lands within consumer reach `r` of Earth's surface only if `2 hE + r ≥ 232` (`hE` the radius in bits, `r` the reach in bits), and `hE ≤ 84`, `r ≈ 55`. Shrinking the Gibson puts stops inside Earth but makes Earth untraversable. The only geometric escape is a projection, a many-to-one map from the block to a point on the surface, which is what a landfall is.

### 9.3 Density, stations, and the three oceans

Every plane-0 block lands, about half of all blocks: 476,604 landfalls at the time of writing, 33 km mean spacing, a new one every twenty minutes on average. From any point on land the nearest landfall is usually within 16 km, an h47 to h48 last mile on two axes (about three GPU-hours). Seventy-one percent of landfalls are at sea, which changes nothing about the last mile from land.

The base mapping centers Earth at exactly 2^84, so the equatorial plane and the meridian planes at 0°/180° and ±90° are h85 boundaries. They behave like oceans: uncrossable on foot, crossed routinely by riding to a landfall on the far shore. Only points within one last mile of a plane, about 0.75% of the surface at current density, ever notice them. Greenwich puts one down the middle of London; others pass through Quito, Pontianak, Macapá, Memphis, New Orleans, and Fiji.

Every landfall cell of Earth and every region of the void has a fixed station. Chain distance from that station is a personal map: for an identity whose station is a 2010 block, the newest landfalls are 800,000 stops away; for one whose station is a 2025 block, they are next door. New stops only ever appear at the far end of the line, so the frontier drifts away from everyone slowly, and the neighbourhoods of recent landfalls are the cheapest places from which to reach whatever Bitcoin opens next.

### 9.4 Miner steering

A miner controls the merkle root almost for free (a new coinbase extranonce is a new root for about a dozen hashes), which is why a landfall position is taken from the block hash: steering a block hash costs one full block's expected mining work per bit, because the only way to choose it is to discard valid blocks. Ports remain merkle-root positioned; the same grinding buys a port placement at about h72 resolution, a cube 5.5 × 10^8 km wide, which threatens nothing. A miner can flip the root's plane bit and so choose whether a block lands or ports, but not where.

### 9.5 Exit concentration

Every traveler through a stop disgorges at one exact coordinate. Stop neighbourhoods are the most trafficked and most observable places in cyberspace; arrival is the moment of least privacy. Content that wants to be found sits near a stop; content that wants to be left alone sits h60 or more inland.

---

## Appendix A: Why entry planes and axis lines cannot work (non-normative)

Earlier drafts tried to make boarding cheap by enlarging the target: hop to a point on one of a port's three axis lines (two axes must match) or into a one-sector-thick plane through it (one axis must match, at sector resolution). Both fail for the same reason.

- With `M` random ports, the expected nearest-target height is `85 - log2(M)/3` for points, `85 - log2(M)/2` for lines, and `85 - log2(M)` for planes. With `M ≈ 2^20` these are h78, h75, and h65.
- Sector resolution does not help: sector bit `b` is Gibson bit `b + 30`, so a claimed h33 sector match is an h63 to h64 Gibson move, and plane thickness cancels out of the formula entirely (`(85 - T) - log2(M) + T = 85 - log2(M)`).
- Consumer reach is about h55 per axis for a thousand dollars of hash work, and Bitcoin supplies about 2^20 targets, so points are 23 bits short, lines 20, and planes 10. The gap closes by about a bit every two to three years of hardware, not by any geometry.

In an ultrametric space, targets become reachable by becoming numerous, never by becoming larger. Boarding therefore cannot be a place you travel to; it is a place you are assigned (§4).

## Appendix B: Relationship to earlier drafts

- v1 (2026-02-28): exit at the merkle root; enter by hopping to it. Correct exits, unboardable entry.
- v2 (2026-04-16): sector-plane entry (units error, see Appendix A); Cantor path tree over block heights as the ride proof (free in practice).
- v3 (this document): plane-bit rule with landfalls; boarding from anywhere at a deterministic station; seeded per-block ride work with sampled verification; toll reserved.

## Appendix C: Reference implementations (non-normative)

- **ONOSENDAI v2** (`arkin0x/ONOSENDAI`, merged 2026-08-25): full web
  client. Anchor and header-blob sync with embedded checkpoints, the §4.4
  station lookup over the sorted line, boarding and rides with a persistent
  resumable worker pool, Level 1 verification, and a decimal landfall
  module reproducing the §1.2 golden vectors byte for byte.
- **NTH** (`arkin0x/nth`): the anchor publisher (kind 321, §2.1 tags) and
  the header-blob packer with manifest and checkpoint emission.
- **`decks/landfall-reference.py`** (this repository): stdlib Python §1.2
  derivation; executing it checks all eight golden vectors.

## Example (non-normative)

Anchor for a landfall (block 398):

```json
{
  "kind": 321,
  "content": "Block 398",
  "tags": [
    ["C", "56db6db6db6db6db6db6db3e27c436f9d3b79fb5fc6457798936b3e749e38f56"],
    ["M", "c056d48ae983586d78b51352c7d689db7c33acd286958301a5ec59e3a09ae016"],
    ["B", "398"],
    ["H", "000000002f7d702a27ccd65158740198f79d4ba1ddea8ab14b56b63a6289fe89"],
    ["P", "<prev_block_hash>"],
    ["X", "<sx>"], ["Y", "<sy>"], ["Z", "<sz>"], ["S", "<sx>-<sy>-<sz>"]
  ]
}
```

Boarding, then riding from the station to block 398, then exiting:

```json
{"kind": 3333, "tags": [["A", "enter-hyperspace"], ["e", "<spawn_id>", "", "genesis"], ["e", "<prev_id>", "", "previous"], ["c", "<here>"], ["C", "<here>"], ["proof", "<enter_proof_hash>"], ["X", "..."], ["Y", "..."], ["Z", "..."], ["S", "..."]]}
{"kind": 3333, "tags": [["A", "hyperjump"], ["e", "<spawn_id>", "", "genesis"], ["e", "<enter_id>", "", "previous"], ["c", "<here>"], ["C", "56db6db6db6db6db6db6db3e27c436f9d3b79fb5fc6457798936b3e749e38f56"], ["from_height", "<station_height>"], ["B", "398"], ["as_of", "<station_set_bound_height>"], ["proof", "<merkle_root>"], ["mp", "<32 inclusion paths>"], ["X", "..."], ["Y", "..."], ["Z", "..."], ["S", "..."]]}
{"kind": 3333, "tags": [["A", "hop"], ["e", "<spawn_id>", "", "genesis"], ["e", "<hyperjump_id>", "", "previous"], ["c", "56db6db6db6db6db6db6db3e27c436f9d3b79fb5fc6457798936b3e749e38f56"], ["C", "<somewhere in Texas>"], ["proof", "<hop_proof_hash>"], ["X", "..."], ["Y", "..."], ["Z", "..."], ["S", "..."]]}
```
