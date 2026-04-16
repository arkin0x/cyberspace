# DECK-0001: Hyperspace (Bitcoin Block Merkle-Root Teleports)

**DECK:** 0001  
**Title:** Hyperspace (Bitcoin Block Merkle-Root Teleports)  
**Status:** Draft v2 (supersedes 2026-02-28 draft)  
**Created:** 2026-02-28  
**Last updated:** 2026-04-16  
**Requires:** `CYBERSPACE_V2.md` v2.x  

---

## Abstract

This DECK defines **Hyperspace**: a PoW-backed teleport mechanism for identities between special coordinates derived from Bitcoin blocks.

A Bitcoin block's Merkle root is treated as a thermodynamically "paid for" coordinate in Cyberspace (with a random distribution across all blocks). The network of all Bitcoin blocks forms a 1-dimensional path (by block height) called **Hyperspace**, which is an alternative transit medium for identities to navigate Cyberspace.

Each valid Bitcoin block exists in Cyberspace as a **Hyperjump**, and identities can navigate to a Hyperjump's Sector entry plane to enter the Hyperspace system. Once in the system, identities can navigate between hyperjumps at a nominal cost relative to the Cyberspace distances they are traversing.

**Two actions are defined:**
1. **enter-hyperspace** (`kind=3333`, `A=enter-hyperspace`) - Boards the Hyperspace network from Cyberspace via sector-plane entry
2. **hyperjump** (`kind=3333`, `A=hyperjump`) - Traverses between hyperjumps within Hyperspace, with optional Cantor proof for multi-block paths

As a convenience, **block anchor events** (kind 321) may be published to Nostr containing hyperjump information so the Bitcoin chain does not have to be consulted directly, but this is not required to publish a valid action chain including Hyperspace traversal.

As nobody can predict the next Bitcoin block's Merkle root, nobody can predict where Hyperspace will connect to next, but every ~10 minutes it punches a new hole in the vastness of Cyberspace, opening new territory and enabling new opportunities.

---

## Terms

- **Hyperspace**: The 1-dimensional path through Cyberspace where each point is a Bitcoin block Merkle root in block height order. Hyperspace is the transit *network*.
- **Hyperjump** (noun): A Cyberspace object (coordinate) defined by a valid Bitcoin block Merkle root. A Hyperjump is a *location* in both Cyberspace and Hyperspace.
- **hyperjump** (verb): The `kind=3333` action type to move between one or more Hyperjumps within Hyperspace.
- **Hyperjump coordinate**: A Bitcoin block's Merkle root interpreted without modification as a coord256 in Cyberspace.
- **Block anchor event**: A Nostr event (kind 321) that represents a Bitcoin block for discovery convenience.
- **Sector entry plane**: A volume of Cyberspace occupying every Gibson sharing the same sector along a single axis as a hyperjump (1 sector = 2³⁰ Gibsons). Identities use the `enter-hyperspace` action when inside this volume.
- **Hyperspace proof**: A Hyperspace-specific Cantor tree PoW proving an identity traveled from one hyperjump to another through the block-height path.

---

## Part I: Enter-Hyperspace Action (Cyberspace → Hyperspace)

### 1. The Bootstrap Problem

To use the Hyperspace transit network, an identity must first reach a Hyperjump coordinate. The original design required identities to hop to the **exact** Hyperjump coordinate (a 3D point in Cyberspace). At typical distances from a random spawn point, this requires reaching an LCA of h≈84, which costs 2⁸⁴ operations—approximately 10¹¹ years of computation, categorically infeasible.

**This is the bootstrap problem:** How can a newly spawned identity reach the Hyperspace network with consumer-feasible computation?

**Solution:** Sector-based entry planes reduce the entry cost from h≈84 to h≈33 (~15 minutes, ~$0.09 cloud).

### 2. Sector-Based Entry Planes (Normative)

#### Definition

For a Hyperjump at coordinate **H = (Hx, Hy, Hz, Hp)**, three entry planes are defined:

- **X-plane**: All coordinates where **sector(X) = sector(Hx)** (covers all (X, *, *, *) matching the sector)
- **Y-plane**: All coordinates where **sector(Y) = sector(Hy)** (covers all (*, Y, *, *) matching the sector)
- **Z-plane**: All coordinates where **sector(Z) = sector(Hz)** (covers all (*, *, Z, *) matching the sector)

Each plane is **1 sector thick** (2³⁰ Gibsons). The plane bit **Hp** is inherited from the Hyperjump coordinate (plane 0 = dataspace, plane 1 = ideaspace).

#### Sector Extraction (Normative)

Coordinates are **interleaved** per `CYBERSPACE_V2.md` §2.2 (bit pattern: `XYZXYZXYZ...P`). To extract a sector:

1. **De-interleave** the coord256 to extract the 85-bit axis value (X, Y, or Z)
2. **Extract high 55 bits**: `sector_value = axis_value >> 30`

**Reference implementation:**
```python
def extract_axis(coord256: int, axis: str) -> int:
    """De-interleave coord256 to get 85-bit axis value."""
    if axis == 'X':
        shift = 3  # X bits at positions 3, 6, 9, ...
    elif axis == 'Y':
        shift = 2  # Y bits at positions 2, 5, 8, ...
    elif axis == 'Z':
        shift = 1  # Z bits at positions 1, 4, 7, ...
    
    result = 0
    for i in range(85):
        bit_pos = shift + (3 * i)
        if coord256 & (1 << bit_pos):
            result |= (1 << i)
    return result

def sector(coord256: int, axis: str) -> int:
    """Extract 55-bit sector value from an axis."""
    axis_value = extract_axis(coord256, axis)
    return axis_value >> 30  # High 55 bits of 85-bit axis
```

**Complexity:** De-interleaving is O(85) bit operations — negligible compared to Proof-of-Work computation.

### 3. Enter-Hyperspace Action Event (Normative)

To enter Hyperspace via a sector plane, an identity MUST publish an **enter-hyperspace action** (`kind=3333`, `A=enter-hyperspace`) proving they have reached a coordinate whose **sector** matches a Hyperjump's sector on the chosen axis.

**Required tags:**
- `A` tag: `["A", "enter-hyperspace"]`
- `e` genesis: `["e", "<spawn_event_id>", "", "genesis"]`
- `e` previous: `["e", "<previous_event_id>", "", "previous"]`
- `c` tag: `["c", "<prev_coord_hex>"]`
- `C` tag: `["C", "<coord_hex>"]` (the entered coordinate on the sector plane)
- `H` tag: `["H", "<hyperjump_merkle_root_hex>"]` (the Merkle root of the Hyperjump being entered; enables Nostr queries)
- `B` tag: `["B", "<block_height>"]` (the Bitcoin block height of the Hyperjump)
- `axis` tag: `["axis", "X"|"Y"|"Z"]` (which plane was used)
- `proof` tag: `["proof", "<cantor_proof_hex>"]` (standard Cantor proof for reaching the coordinate)
- Sector tags: `X`, `Y`, `Z`, `S` (per `CYBERSPACE_V2.md` §3), computed from the entered coordinate

**Optional tag:**
- `e` hyperjump-anchor: `["e", "<block_anchor_event_id>", "", "hyperjump-anchor"]` (references the kind 321 block anchor event for the Hyperjump being entered)

**Example (entering via Y-plane):**
```json
{
  "kind": 3333,
  "content": "",
  "tags": [
    ["A", "enter-hyperspace"],
    ["e", "<spawn_event_id>", "", "genesis"],
    ["e", "<previous_event_id>", "", "previous"],
    ["c", "<prev_coord_hex>"],
    ["C", "<coord_on_Y_plane_hex>"],
    ["H", "744193479b55674c02dec4ed73581eafbd7e2db03442360c9c34f9394031ee8f"],
    ["B", "1606"],
    ["axis", "Y"],
    ["proof", "<cantor_proof_hex>"],
    ["X", "<sector_X_value>"],
    ["Y", "<sector_Y_value>"],
    ["Z", "<sector_Z_value>"],
    ["S", "<sector_S_value>"]
  ]
}
```

**Validation:**
1. Verify it is `kind=3333` and includes `["A", "enter-hyperspace"]`
2. Verify the Cantor proof is valid for the path to the entered coordinate
3. Verify sector match: `sector(entered_coord_axis) == sector(HJ_axis)` on the specified axis (where HJ_axis is extracted from the Merkle root in the `H` tag)
4. Verify the `B` tag matches the block height of the Hyperjump identified by the `H` tag
5. Verify chain structure (`e` genesis + `e` previous) per `CYBERSPACE_V2.md` §6
6. If `hyperjump-anchor` is present, verify it references a valid kind 321 block anchor event with matching `H` and `B` values

**Why `enter-hyperspace` instead of `sidestep`:**
- **Sidestep** uses Merkle proofs for storage-infeasible LCA heights (h>35-40)
- **Enter-hyperspace** uses Cantor proofs for sector-level precision (h≈33, consumer-feasible)
- The enter-hyperspace action is specifically for boarding the Hyperspace network, with Hyperjump reference and sector validation

**After publishing the enter-hyperspace action**, the identity is now "on" the Hyperspace network and can publish hyperjump actions to traverse between Hyperjumps.

### 4. Exit Behavior (Hyperspace → Cyberspace)

To exit Hyperspace and return to Cyberspace, an identity publishes a normal **hop** or **sidestep** action (per `CYBERSPACE_V2.md` §6) starting from the Hyperjump's Merkle-root coordinate.

**The exit process:**
1. The identity is at a Hyperjump with Merkle root `M` (which is also a coord256 in Cyberspace)
2. The identity publishes a hop or sidestep with:
   - `c` tag: `["c", "<M_hex>"]` (the Hyperjump's Merkle root)
   - `C` tag: `["C", "<destination_coord_hex>"]` (the target Cyberspace coordinate)
   - `proof` tag: Standard Cantor or Merkle proof for the movement
3. This movement is validated like any other Cyberspace hop/sidestep

**Key insight:** The Merkle root `M` serves as both:
- The Hyperjump's identifier in Hyperspace
- A valid coord256 in Cyberspace (the exit point)

The `c` tag of the exit hop/sidestep equals the `C` tag of the block anchor event for the Hyperjump, which equals the Merkle root of the Bitcoin block. This makes the Merkle root the **bridge coordinate** between Hyperspace and Cyberspace.

**Spatial integrity:** Because the identity exits at the exact Merkle-root coordinate and then performs a standard Cyberspace movement to their final destination, they cannot "teleport around" distance. The sector-plane advantage applies only to *entering* Hyperspace, not exiting.

### 5. Coverage and Accessibility

#### Assumptions
- Bitcoin block production: 52,560 blocks/year (~10 min average)
- Current blocks (2026): ~940,000
- Planes per Hyperjump: 3 (X, Y, Z)
- Effective plane Hyperjumps: blocks × 3 planes = **2.8M** by 2026
- Average 1D LCA gap formula: `LCA ≈ log₂(2⁵⁵ / effective_HJs)`
  - **55-bit sector space** = 2⁵⁵ sectors per axis
  - With 2.8M plane Hyperjumps: LCA ≈ log₂(2⁵⁵ / 2.8×10⁶) ≈ **33.6**

#### Spawn-to-Hyperjump Entry Cost

| Year | Blocks | Effective Plane HJs | Median LCA | Consumer Time | Cloud Cost |
|------|--------|---------------------|------------|---------------|------------|
| 2026 | 940K | 2.8M | h≈33 | ~15 minutes | ~$0.09 |
| 2031 | 1.2M | 3.6M | h≈32.8 | ~13 minutes | ~$0.07 |
| 2036 | 1.5M | 4.5M | h≈32.7 | ~12 minutes | ~$0.06 |

**With Moore's Law (compute doubles every 2.5 years):**
- 2026: ~15 minutes / $0.09
- 2031: ~4 minutes / $0.02
- 2036: ~1 minute / $0.005

**Comparison:**

| Configuration | Median LCA | Consumer Time | Improvement |
|--------------|------------|---------------|-------------|
| **Sector planes** (enter-hyperspace) | h≈33 | ~15 minutes | **Baseline** |
| Original design (exact point entry) | h≈84 | ~10¹¹ years | **10¹⁴× slower** |

The geometric insight (sector matching vs exact coordinate matching) solves the bootstrap problem.

---

## Part II: Hyperjump Action (Hyperspace Traversal)

### 6. Hyperjump Coordinate and Block Anchors

#### Hyperjump Coordinate Derivation (Normative)

Given a Bitcoin block's Merkle root (`merkle_root`):
- Let `coord_hex = merkle_root` (32 bytes, lowercase hex, no `0x` prefix)
- Let `coord256 = int(coord_hex, 16)`
- The Hyperjump coordinate is `coord256`, interpreted as a Cyberspace coordinate per `CYBERSPACE_V2.md` §2

**Notes:**
- This uses the Merkle root as presented in standard big-endian hex form. Implementations MUST agree on this endianness.
- The plane bit is the least significant bit of `coord256` (per `CYBERSPACE_V2.md` §2.1). Therefore Hyperjumps may exist in either plane.

#### Block Anchor Events (Kind 321)

Hyperjump coordinates are discoverable via Nostr by querying **block anchor events** (kind 321) that bind Bitcoin block identifiers to their Merkle-root-derived coordinate.

**Required tags:**
- `C` tag: `["C", "<coord_hex>"]` (the Merkle-root-derived Hyperjump coordinate)
- Sector tags: `X`, `Y`, `Z`, `S` (per `CYBERSPACE_V2.md` §3)
- `B` tag: `["B", "<height>"]` (Bitcoin block height, base-10 string)
- `H` tag: `["H", "<block_hash_hex>"]` (32-byte lowercase hex)
- `P` tag: `["P", "<prev_block_hash_hex>"]` (32-byte lowercase hex)

**Optional tags:**
- `net` tag: `["net", "mainnet"|"testnet"|"signnet"|"regtest"]` (default: mainnet)
- `N` tag: `["N", "<next_block_hash_hex>"]` (once the next block is known)

**Validation:** Implementations MUST verify that the `C`, `H`, `P`, and `B` tags match Bitcoin consensus for the selected network.

### 7. Hyperjump Action Event (Normative)

A **hyperjump** action (`kind=3333`, `A=hyperjump`) moves an identity between Hyperjumps within Hyperspace.

#### Required tags:
- `A` tag: `["A", "hyperjump"]`
- `e` genesis: `["e", "<spawn_event_id>", "", "genesis"]`
- `e` previous: `["e", "<previous_event_id>", "", "previous"]`
- `c` tag: `["c", "<prev_coord_hex>"]` (the origin Hyperjump coordinate)
- `C` tag: `["C", "<coord_hex>"]` (the destination Hyperjump coordinate)
- `B` tag: `["B", "<to_height>"]` (destination Bitcoin block height, base-10 string)
- Sector tags: `X`, `Y`, `Z`, `S` (computed from the destination coordinate)

#### Optional tags:
- `net` tag: `["net", "<bitcoin_network>"]` (default: mainnet)
- `e` hyperjump-to: `["e", "<to_anchor_event_id>", "", "hyperjump_to"]` (kind 321 anchor for destination)
- `e` hyperjump-from: `["e", "<from_anchor_event_id>", "", "hyperjump_from"]` (kind 321 anchor for origin)
- `from_height` tag: `["from_height", "<B_from>"]` (origin block height, required when using hyperspace proof)
- `from_hj` tag: `["from_hj", "<from_hyperjump_hex>"]` (origin Hyperjump coordinate, required with proof)
- `prev` tag: `["prev", "<previous_movement_event_id>"]` (required with hyperspace proof)
- `proof` tag: `["proof", "<hyperspace_proof_hex>"]` (Cantor traversal proof for multi-block paths)

#### Prohibited:
- Hyperjump events MUST NOT include a `proof` tag for single-block jumps (block_diff = 1). Proof is only required for multi-block traversal.

#### Behavioral constraints:
- `prev_coord_hex` MUST be a valid Hyperjump coordinate (corresponds to a valid block anchor event)
- `<coord_hex>` MUST equal the Hyperjump coordinate for block height `<to_height>` on the selected Bitcoin network
- If `proof` is present, it MUST be a valid hyperspace proof from `B_from` to `B_to`

### 8. Hyperspace Proof: Incremental Cantor Tree (Multi-Block Traversal)

#### When is a Hyperspace Proof Required?

- **Single-block hyperjump** (B_to - B_from = 1): No proof required. The block height difference itself is the commitment.
- **Multi-block hyperjump** (B_to - B_from > 1): Hyperspace proof REQUIRED to demonstrate the identity traversed the entire block-height path.

#### Why Hyperspace Proof is Required

Movement through Hyperspace requires:
1. **Access commitment** - paying the "toll" via block-height difference
2. **Hyperspace proof** - demonstrating the identity actually traveled the path, not just paid the cost

The original block height commitment metric (`block_diff.bit_length()` → 2^h SHA256 ops) solved access cost but did not define traversal proof. An identity traveling from block N to block M must publish proof that they traversed the Hyperspace path.

#### Leaf Construction

For traversal from block `B_from` to block `B_to` (where `B_to > B_from`):

**Leaves:** The temporal seed followed by each block height in the path:
```
leaves = [temporal_seed, B_from, B_from+1, ..., B_to]
```

Where:
- `temporal_seed = previous_event_id (as big-endian int) % 2^256`
- `previous_event_id` is the NIP-01 event ID of the identity's most recent movement event

**Why temporal-as-first-leaf:** The temporal seed propagates through the entire Cantor tree, making the root unique to this identity at this chain position. Simpler than per-leaf temporal offsets, cryptographically equivalent under the Cantor Rigidity Theorem.

#### Cantor Tree Construction

```python
def cantor_pair(a: int, b: int) -> int:
    """Cantor pairing function: π(a, b) = (a+b)(a+b+1)/2 + b"""
    s = a + b
    return (s * (s + 1)) // 2 + b

def build_hyperspace_proof(leaves: list[int]) -> int:
    """Build Cantor pairing tree from leaves, return root."""
    current_level = leaves
    
    while len(current_level) > 1:
        next_level = []
        # Pair adjacent elements
        for i in range(0, len(current_level) - 1, 2):
            parent = cantor_pair(current_level[i], current_level[i+1])
            next_level.append(parent)
        # Carry forward unpaired leaf
        if len(current_level) % 2 == 1:
            next_level.append(current_level[-1])
        current_level = next_level
    
    return current_level[0]  # Root
```

#### Proof Publication Example

```json
{
  "kind": 3333,
  "content": "",
  "tags": [
    ["A", "hyperjump"],
    ["e", "<spawn_event_id>", "", "genesis"],
    ["e", "<prev_event_id>", "", "previous"],
    ["c", "<from_hyperjump_hex>"],
    ["C", "<to_hyperjump_hex>"],
    ["from_height", "850000"],
    ["to_height", "850100"],
    ["from_hj", "<merkle_root_850000_hex>"],
    ["to_hj", "<merkle_root_850100_hex>"],
    ["prev", "<previous_movement_event_id>"],
    ["proof", "<cantor_traversal_root_hex>"],
    ["X", "<X_sector>"],
    ["Y", "<Y_sector>"],
    ["Z", "<Z_sector>"],
    ["S", "<S_value>"]
  ]
}
```

**Verification:**
1. Extract `previous_event_id` from `prev` tag
2. Recompute `temporal_seed = int.from_bytes(previous_event_id, "big") % 2^256`
3. Reconstruct leaves: `[temporal_seed, B_from, B_from+1, ..., B_to]`
4. Rebuild Cantor tree
5. Verify root matches `proof` tag

#### Non-Reuse Mechanism

**Equivocation detection:** If an identity publishes two hyperspace proofs with the same `previous_event_id`, they have created two children of the same parent event. This is detectable and socially punishable (chain invalidation).

**Why this works:** The temporal seed makes every proof unique to a specific chain position. Replaying a proof requires reusing the same `previous_event_id`, which breaks the hash chain.

#### Cost Analysis

| Path Length | Pairings | Consumer Time | Nation-State Time |
|-------------|----------|---------------|-------------------|
| 100 blocks | 100 | 0.1 μs | 0.1 ns |
| 1,000 blocks | 1,000 | 1 μs | 1 ns |
| 10,000 blocks | 10,000 | 10 μs | 10 ns |
| 100,000 blocks | 100,000 | 0.1 ms | 0.1 μs |
| 1,000,000 blocks | 1,000,000 | 1 ms | 1 μs |

**Consumer throughput:** ~1M blocks/day  
**Nation-state throughput:** ~1B blocks/day (1000× linear advantage)

**Key insight:** The advantage is linear (compute-bound), not exponential (storage-bound).

---

## Part III: Complete Examples

### Example 1: Block Anchor Event (Kind 321)

```json
{
  "kind": 321,
  "content": "Block 1606",
  "tags": [
    ["C", "744193479b55674c02dec4ed73581eafbd7e2db03442360c9c34f9394031ee8f"],
    ["X", "11846810334975873"],
    ["Y", "19088986011188665"],
    ["Z", "27231467915017080"],
    ["S", "11846810334975873-19088986011188665-27231467915017080"],
    ["H", "000000005d388d74f4b9da705c4a977b5aa53f88746f6286988f9f139dba2a99"],
    ["P", "00000000ba96f7cee624d66be83099df295a1daac50dd99e4315328aa7d43e77"],
    ["N", "00000000fc33b76de0621880e0cad2f6bd24e48250c461258dc8c6a6a3253c7a"],
    ["B", "1606"]
  ]
}
```

### Example 2: Enter-Hyperspace via Sector Plane

```json
{
  "kind": 3333,
  "content": "",
  "tags": [
    ["A", "enter-hyperspace"],
    ["e", "<spawn_id>", "", "genesis"],
    ["e", "<prev_id>", "", "previous"],
    ["c", "<prev_coord>"],
    ["C", "<coord_on_Y_plane>"],
    ["HJ", "744193479b55674c02dec4ed73581eafbd7e2db03442360c9c34f9394031ee8f"],
    ["axis", "Y"],
    ["proof", "<cantor_proof>"],
    ["X", "<sector_X>"],
    ["Y", "<sector_Y_matching_HJ>"],
    ["Z", "<sector_Z>"],
    ["S", "<S_value>"]
  ]
}
```

### Example 3: Hyperjump (Single Block, No Proof)

```json
{
  "kind": 3333,
  "content": "",
  "tags": [
    ["A", "hyperjump"],
    ["e", "<spawn_id>", "", "genesis"],
    ["e", "<prev_id>", "", "previous"],
    ["c", "744193479b55674c02dec4ed73581eafbd7e2db03442360c9c34f9394031ee8f"],
    ["C", "42adcf1bc1976b02f66d5a33ab41946e7152f9b7ec08046a51625d443092e8cb"],
    ["B", "1602"],
    ["e", "<anchor_1606_id>", "", "hyperjump_from"],
    ["e", "<anchor_1602_id>", "", "hyperjump_to"],
    ["X", "6397583792183907"],
    ["Y", "22152908496923134"],
    ["Z", "5507206459976287"],
    ["S", "6397583792183907-22152908496923134-5507206459976287"]
  ]
}
```

### Example 4: Hyperjump (Multiple Blocks, with Hyperspace Proof)

```json
{
  "kind": 3333,
  "content": "",
  "tags": [
    ["A", "hyperjump"],
    ["e", "<spawn_id>", "", "genesis"],
    ["e", "<prev_id>", "", "previous"],
    ["c", "744193479b55674c02dec4ed73581eafbd7e2db03442360c9c34f9394031ee8f"],
    ["C", "85bd9d664474ff652dfe84aff926d22700626e70..."],
    ["from_height", "850000"],
    ["to_height", "850100"],
    ["from_hj", "744193479b55674c02dec4ed73581eafbd7e2db03442360c9c34f9394031ee8f"],
    ["to_hj", "85bd9d6644
