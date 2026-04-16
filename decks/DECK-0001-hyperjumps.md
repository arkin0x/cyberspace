# DECK-0001: Hyperjumps (Bitcoin Block Merkle-Root Teleports)

**DECK:** 0001  
**Title:** Hyperjumps (Bitcoin Block Merkle-Root Teleports)  
**Status:** Draft v2 (supersedes 2026-02-28 draft)  
**Created:** 2026-02-28  
**Last updated:** 2026-04-16  
**Requires:** `CYBERSPACE_V2.md` v2.x  

---

## Abstract

This DECK defines **hyperjumps**: a zero-movement-proof teleport mechanism between special coordinates derived from Bitcoin blocks.

A Bitcoin block's Merkle root is treated as a thermodynamically "paid for" random coordinate in Cyberspace. By publishing these blocks as Nostr events (block anchor events), avatars can visit a growing network of unpredictable but far-reaching transit points.

**This v2 revision adds:**
- **Sector-based entry planes** to solve the bootstrap problem (consumer-feasible entry at h≈33, ~15 minutes)
- **Enter action** (`kind=3333`, `A=enter`) as the 4th movement primitive for boarding the hyperjump network
- **Cantor traversal proof** for inter-hyperjump travel (Incremental Cantor Tree with Temporal Leaf binding)

---

## Terms

- **Hyperjump**: a protocol-defined teleport action between two hyperjump coordinates that reuses Bitcoin proof-of-work rather than requiring a Cyberspace v2 movement proof.
- **Hyperjump coordinate**: a coord256 derived deterministically from a Bitcoin block's Merkle root.
- **Block anchor event**: a Nostr event that binds Bitcoin block identifiers to the corresponding hyperjump coordinate so clients can discover nearby hyperjumps via Nostr queries.
- **Sector entry plane**: a 2D plane (1 sector thick, 2³⁰ Gibsons) where avatars can enter the hyperjump network by matching the high 55 bits of one axis.
- **Enter action**: movement primitive for entering a hyperjump plane (`kind=3333`, `A=enter`).
- **Traversal proof**: Cantor tree proving an entity traveled from one hyperjump to another.

---

## Part I: Core Hyperjump Specification

### 1. Hyperjump Coordinate Derivation (Normative)

Given a Bitcoin block's Merkle root (`merkle_root`):
- Let `coord_hex = merkle_root` (32 bytes, lowercase hex, no `0x` prefix).
- Let `coord256 = int(coord_hex, 16)`.
- The hyperjump coordinate is `coord256`, interpreted as a Cyberspace coordinate per `CYBERSPACE_V2.md` §2.

**Notes:**
- This uses the Merkle root as presented in standard big-endian hex form (as commonly shown in block explorers). Implementations MUST agree on this endianness.
- The plane bit is the least significant bit of `coord256` (per `CYBERSPACE_V2.md` §2.1). Therefore hyperjumps may exist in either plane.

### 2. Block Anchor Events (Hyperjump Publishing)

Hyperjump coordinates are discoverable via Nostr by querying **block anchor events** (kind 321) that bind Bitcoin block identifiers to their Merkle-root-derived coordinate.

**Event kind:** `kind = 321`

#### Required Tags (Normative)

Block anchor events MUST include:
- `C` tag: `["C", "<coord_hex>"]` where `<coord_hex>` is the Merkle-root-derived hyperjump coordinate
- Sector tags: `X`, `Y`, `Z`, `S` (per `CYBERSPACE_V2.md` §3), computed from the hyperjump coordinate
- `B` tag: `["B", "<height>"]` where `<height>` is the Bitcoin block height (base-10 string)
- `H` tag: `["H", "<block_hash_hex>"]` (32-byte lowercase hex string)
- `P` tag: `["P", "<prev_block_hash_hex>"]` (32-byte lowercase hex string)

#### Optional Tags

Block anchor events SHOULD/MAY include:
- `net` tag: `["net", "<bitcoin_network>"]` where `<bitcoin_network>` is one of `mainnet`, `testnet`, `signet`, `regtest`. If omitted, implementations SHOULD assume `mainnet`.
- `N` tag: `["N", "<next_block_hash_hex>"]` once the next block is known

#### Validation of Anchor Events (Normative)

To verify a block anchor event as valid for hyperjumping, an implementation MUST verify that:
1. Its `C` tag matches the Merkle root of the block at height `B` on the Bitcoin network the client is using (or the network specified by the anchor event's `net` tag, if present).
2. Its `H` tag is the corresponding block hash.
3. Its `P` tag is the corresponding previous block hash.

How an implementation performs this validation is out of scope (full node, headers-only/SPV, trusted checkpoints, etc.), but the resulting `(height, block_hash, merkle_root)` bindings MUST match Bitcoin consensus for the selected network.

### 3. Hyperjump Movement Events

A hyperjump action is represented as a movement event (`kind=3333`) in the avatar's movement chain (`CYBERSPACE_V2.md` §6) with action tag `["A", "hyperjump"]`.

#### Hyperjump Movement Event (Normative)

**Required tags:**
- `A` tag: `["A", "hyperjump"]`
- `e` genesis: `["e", "<spawn_event_id>", "", "genesis"]`
- `e` previous: `["e", "<previous_event_id>", "", "previous"]`
- `c` tag: `["c", "<prev_coord_hex>"]`
- `C` tag: `["C", "<coord_hex>"]` (the destination hyperjump coordinate)
- `B` tag: `["B", "<to_height>"]` where `<to_height>` is the destination Bitcoin block height (base-10 string)
- Sector tags: `X`, `Y`, `Z`, `S` (per `CYBERSPACE_V2.md` §3), computed from the destination coordinate

**Optional tags:**
- `net` tag: `["net", "<bitcoin_network>"]` where `<bitcoin_network>` is one of `mainnet`, `testnet`, `signet`, `regtest`. If omitted, implementations SHOULD assume `mainnet`.
- `e` hyperjump-to: `["e", "<to_anchor_event_id>", "", "hyperjump_to"]` (a `kind=321` anchor event for the destination block)
- `e` hyperjump-from: `["e", "<from_anchor_event_id>", "", "hyperjump_from"]` (a `kind=321` anchor event for the origin block)

**Prohibited tags:**
- Hyperjump events MUST NOT include a `proof` tag. (They are not validated using `CYBERSPACE_V2.md` §5 / §6.5.)

**Behavioral constraints:**
- `prev_coord_hex` MUST be a valid hyperjump coordinate (i.e., it MUST correspond to the `C` tag of at least one valid block anchor event).
- `<coord_hex>` MUST equal the hyperjump coordinate for block height `<to_height>` on the selected Bitcoin network.

#### Hyperjump Verification Summary (Normative)

To verify a hyperjump event:
1. Verify it is `kind=3333` and includes `["A","hyperjump"]`.
2. Verify its chain structure (`e` genesis + `e` previous) as in `CYBERSPACE_V2.md` §6.
3. Verify that the previous movement event's `C` tag equals this event's `c` tag.
4. Verify that `c` is a valid hyperjump coordinate by resolving at least one valid block anchor event with `C=c`.
5. Resolve the destination block height from the event's `B` tag and derive the expected destination coordinate using the Bitcoin network implied by the event's `net` tag (or `mainnet` if omitted).
6. Accept iff the expected destination coordinate equals the event's `C`.

**Optional shortcut (non-normative):** If `hyperjump_to` is present, the verifier may instead validate that referenced anchor event and compare its `C` directly.

---

## Part II: Sector-Based Entry Planes (v2 Addition)

### 4. The Bootstrap Problem

The original hyperjump design requires avatars to hop to the **exact** hyperjump coordinate (a 3D point). At typical distances from a random spawn point, this requires reaching an LCA of h≈84, which costs 2⁸⁴ operations—approximately 10¹¹ years of computation, categorically infeasible.

**This is the bootstrap problem:** How can a newly spawned avatar reach the hyperjump network with consumer-feasible computation?

### 5. Sector-Based Entry Planes (Normative)

#### Definition

For a hyperjump at coordinate **H = (Hx, Hy, Hz, Hp)**, three entry planes are defined:

- **X-plane**: All coordinates where **sector(X) = sector(Hx)** (covers all (X, *, *, *) matching the sector)
- **Y-plane**: All coordinates where **sector(Y) = sector(Hy)** (covers all (*, Y, *, *) matching the sector)
- **Z-plane**: All coordinates where **sector(Z) = sector(Hz)** (covers all (*, *, Z, *) matching the sector)

Each plane is **1 sector thick** (2³⁰ Gibsons). The plane bit **Hp** is inherited from the hyperjump coordinate (plane 0 = dataspace, plane 1 = ideaspace).

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

**Complexity:** De-interleaving is O(85) bit operations — negligible compared to sidestep computation.

#### Entry Validation

To enter a hyperjump via a plane, an avatar MUST publish an **enter action** (kind 3333, `A=enter`) proving they have reached a coordinate whose **sector** matches the hyperjump's sector on the chosen axis.

**The enter action includes:**
- Destination coordinate **D** where `sector(chosen_axis) = sector(HJ_axis)`
- Standard Cantor proof for the path to **D** (same as hop proof)
- Reference to the target HJ being entered

**Example (entering via Y-plane):**
```json
{
  "kind": 3333,
  "tags": [
    ["A", "enter"],
    ["C", "<coord_on_Y_plane>"],  // sector(Y) matches HJ's sector(Y)
    ["HJ", "<hyperjump_coord_hex>"],
    ["axis", "Y"],
    ["proof", "<cantor_proof_hex>"]
  ]
}
```

**Why `enter` instead of `sidestep`:**
- **Sidestep** uses Merkle proofs for storage-infeasible LCA heights (h>35-40)
- **Enter** uses Cantor proofs for sector-level precision (h≈33, consumer-feasible)
- The enter action is specifically for hyperjump plane entry, with HJ reference and validation

After publishing the enter action, the avatar is now "on" the hyperjump network and can publish hyperjump traversal proofs to move between HJs.

#### Exit Behavior

When exiting a hyperjump (after a `A=hyperjump` action), the avatar **always** arrives at the exact merkle-root coordinate **(Hx, Hy, Hz, Hp)**. The sector-plane advantage applies only to *entering*, not exiting.

This ensures:
- Spatial meaning is preserved (you can't "teleport around" distance)
- Navigation FROM the exit point to a final destination still costs work
- The plane mechanism doesn't collapse locality

### 6. Coverage and Accessibility Analysis

#### Assumptions

- Bitcoin block production: 52,560 blocks/year (~10 min average)
- Current blocks (2026): ~940,000
- Planes per HJ: 3 (X, Y, Z)
- Effective plane HJs: blocks × 3 planes = **2.8M** by 2026
- Average 1D LCA gap formula for sector matching: `LCA ≈ log₂(2⁵⁵ / effective_HJs)`
  - **55-bit sector space** = 2⁵⁵ sectors per axis (plane is 1 sector = 2³⁰ Gibsons thick)
  - With 2.8M plane HJs: LCA ≈ log₂(2⁵⁵ / 2.8×10⁶) ≈ **log₂(1.3×10¹⁰) ≈ 33.6**

#### Spawn-to-HJ LCA Projection (1D sector match, best-of-3 axes)

| Year | Blocks | Effective Plane HJs | Avg LCA | Consumer Time | Cloud Cost ($0.15/hr GPU) |
|------|--------|---------------------|---------|---------------|---------------------------|
| 2026 | 940K | 2.8M | 33.0 | ~15 minutes | ~$0.09 |
| 2031 | 1.2M | 3.6M | 32.8 | ~13 minutes | ~$0.07 |
| 2036 | 1.5M | 4.5M | 32.7 | ~12 minutes | ~$0.06 |
| 2046 | 2.0M | 6.0M | 32.5 | ~10 minutes | ~$0.05 |
| 2056 | 2.5M | 7.5M | 32.4 | ~9 minutes | ~$0.04 |

**With Moore's Law (compute doubles every 2.5 years):**

| Year | Compute Multiplier | Time to First HJ | Cloud Cost |
|------|-------------------|------------------|------------|
| 2026 | 1× | ~15 minutes | ~$0.09 |
| 2031 | 4× | ~4 minutes | ~$0.02 |
| 2036 | 16× | ~1 minute | ~$0.005 |

**Comparison:**

| Configuration | Median LCA | Consumer Time | Cloud Cost |
|--------------|------------|---------------|------------|
| **Sector planes** (this proposal) | h=33 | ~15 minutes | ~$0.09 |
| Original HJ design (point entry) | h=84 | ~10¹¹ years | ~$50,000+ |
| **Improvement** | **51 bits easier** | **10¹⁴× faster** | **500,000× cheaper** |

This demonstrates that the geometric insight (sector matching vs point matching) is what solves the bootstrap problem.

---

## Part III: Inter-Hyperjump Traversal (v2 Addition)

### 7. The Need for Traversal Proof

Hyperjump travel between Bitcoin blocks requires:
1. **Access commitment** - paying the "toll" to use the HJ network
2. **Traversal proof** - demonstrating that an entity actually traveled the path, not just paid a cost

The original block height commitment metric (`block_diff.bit_length()` → 2^h SHA256 ops) solved access cost but did not define traversal proof. An entity traveling from block N to block M must publish proof that they traversed the path.

### 8. Incremental Cantor Tree with Temporal Leaf

#### Leaf Construction

For traversal from block `B_from` to block `B_to` (where `B_to > B_from`):

**Leaves:** The temporal seed followed by each block height in the path:
```
leaves = [temporal_seed, B_from, B_from+1, ..., B_to]
```

Where:
- `temporal_seed = previous_event_id (as big-endian int) % 2^256`
- `previous_event_id` is the NIP-01 event ID of the entity's most recent movement event

**Why temporal-as-first-leaf:** The temporal seed propagates through the entire Cantor tree, making the root unique to this entity at this chain position. Simpler than per-leaf temporal offsets, cryptographically equivalent under the Cantor Rigidity Theorem.

#### Cantor Tree Construction

```python
def cantor_pair(a: int, b: int) -> int:
    """Cantor pairing function: π(a, b) = (a+b)(a+b+1)/2 + b"""
    s = a + b
    return (s * (s + 1)) // 2 + b

def build_traversal_tree(leaves: list[int]) -> int:
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

#### Proof Publication

**Event kind:** 3333 (standard movement action)

**Tags:**
```json
{
  "kind": 3333,
  "tags": [
    ["A", "hyperjump"],
    ["from_height", "<B_from>"],
    ["to_height", "<B_to>"],
    ["from_hj", "<merkle_root_B_from_hex>"],
    ["to_hj", "<merkle_root_B_to_hex>"],
    ["prev", "<previous_event_id>"],
    ["proof", "<traversal_root_hex>"]
  ],
  "content": ""
}
```

**Verification:**
1. Extract `previous_event_id` from `prev` tag
2. Recompute `temporal_seed = int.from_bytes(previous_event_id, "big") % 2^256`
3. Reconstruct leaves: `[temporal_seed, B_from, B_from+1, ..., B_to]`
4. Rebuild Cantor tree
5. Verify root matches `proof` tag

#### Non-Reuse Mechanism

**Equivocation detection:** If an entity publishes two traversal proofs with the same `previous_event_id`, they have created two children of the same parent event. This is detectable and socially punishable (chain invalidation).

**Why this works:** The temporal seed makes every proof unique to a specific chain position. Replaying a proof requires reusing the same `previous_event_id`, which breaks the hash chain.

#### Cost Analysis

| Path Length | Pairings | Consumer Time (10⁹ pairs/sec) | Nation-State Time (10¹² pairs/sec) |
|-------------|----------|-------------------------------|-------------------------------------|
| 100 blocks | 100 | 0.1 μs | 0.1 ns |
| 1,000 blocks | 1,000 | 1 μs | 1 ns |
| 10,000 blocks | 10,000 | 10 μs | 10 ns |
| 100,000 blocks | 100,000 | 0.1 ms | 0.1 μs |
| 1,000,000 blocks | 1,000,000 | 1 ms | 1 μs |

**Consumer throughput:** ~1M blocks/day (continuous traversal)  
**Nation-state throughput:** ~1B blocks/day (1000× advantage, linear scaling)

**Key insight:** The advantage is linear (compute-bound), not exponential (storage-bound). Nation-states can traverse further, but consumers can still traverse meaningful distances.

---

## Part IV: Complete Examples

### Example 1: Block Anchor Event

Example block anchor event for Bitcoin block height `1606`:
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

### Example 2: Hop onto Hyperjump (Standard Movement)

Movement hop onto that hyperjump coordinate (requires standard hop validation with proof):
```json
{
  "kind": 3333,
  "content": "",
  "tags": [
    ["A", "hop"],
    ["e", "<spawn_event_id>", "", "genesis"],
    ["e", "<previous_event_id>", "", "previous"],
    ["c", "<prev_coord_hex>"],
    ["C", "744193479b55674c02dec4ed73581eafbd7e2db03442360c9c34f9394031ee8f"],
    ["proof", "<proof_hash_hex>"],
    ["X", "11846810334975873"],
    ["Y", "19088986011188665"],
    ["Z", "27231467915017080"],
    ["S", "11846810334975873-19088986011188665-27231467915017080"]
  ]
}
```

### Example 3: Enter Hyperjump via Sector Plane (NEW)

Enter action to board the hyperjump network via Y-plane:
```json
{
  "kind": 3333,
  "content": "",
  "tags": [
    ["A", "enter"],
    ["e", "<spawn_event_id>", "", "genesis"],
    ["e", "<previous_event_id>", "", "previous"],
    ["c", "<prev_coord_hex>"],
    ["C", "<coord_on_Y_plane_hex>"],  // sector(Y) matches HJ's sector(Y)
    ["HJ", "744193479b55674c02dec4ed73581eafbd7e2db03442360c9c34f9394031ee8f"],
    ["axis", "Y"],
    ["proof", "<cantor_proof_hex>"],
    ["X", "<sector_X_value>"],
    ["Y", "<sector_Y_value>"],  // matches HJ's sector(Y)
    ["Z", "<sector_Z_value>"],
    ["S", "<sector_S_value>"]
  ]
}
```

### Example 4: Hyperjump Between Blocks (No Proof Required)

Hyperjump from height `1606` to height `1602` (no `proof` tag):
```json
{
  "kind": 3333,
  "content": "",
  "tags": [
    ["A", "hyperjump"],
    ["e", "<spawn_event_id>", "", "genesis"],
    ["e", "<previous_event_id>", "", "previous"],
    ["c", "744193479b55674c02dec4ed73581eafbd7e2db03442360c9c34f9394031ee8f"],
    ["C", "42adcf1bc1976b02f66d5a33ab41946e7152f9b7ec08046a51625d443092e8cb"],
    ["B", "1602"],
    ["e", "<anchor_event_id_for_1606>", "", "hyperjump_from"],
    ["e", "<anchor_event_id_for_1602>", "", "hyperjump_to"],
    ["X", "6397583792183907"],
    ["Y", "22152908496923134"],
    ["Z", "5507206459976287"],
    ["S", "6397583792183907-22152908496923134-5507206459976287"]
  ]
}
```

### Example 5: Hyperjump with Traversal Proof (NEW)

Long-distance hyperjump with Cantor traversal proof:
```json
{
  "kind": 3333,
  "content": "",
  "tags": [
    ["A", "hyperjump"],
    ["e", "<spawn_event_id>", "", "genesis"],
    ["e", "<prev_hyperjump_event_id>", "", "previous"],
    ["c", "744193479b55674c02dec4ed73581eafbd7e2db03442360c9c34f9394031ee8f"],
    ["C", "85bd9d664474ff652dfe84aff926d22700626e70..."],  // merkle root of block 850100
    ["from_height", "850000"],
    ["to_height", "850100"],
    ["from_hj", "744193479b55674c02dec4ed73581eafbd7e2db03442360c9c34f9394031ee8f"],
    ["to_hj", "85bd9d664474ff652dfe84aff926d22700626e70..."],
    ["prev", "<prev_hyperjump_event_id>"],
    ["proof", "<cantor_traversal_root_hex>"],
    ["X", "<X_sector>"],
    ["Y", "<Y_sector>"],
    ["Z", "<Z_sector>"],
    ["S", "<S_value>"]
  ]
}
```

---

## Part V: Security Considerations

### Sector Entry Does Not Reveal More Information

Knowing an avatar is "on the X-plane of HJ H" reveals only that their X sector equals H's X sector. Their Y and Z sectors (and all Gibson-level precision) remain hidden. This is strictly less information than revealing the full 3D point.

### Traversal Proof Prevents Free Teleportation

By requiring a Cantor traversal proof bound to `previous_event_id`, the protocol prevents:
- **Reuse:** Proof is single-use (temporal seed binding)
- **Amortization:** Can't precompute proofs for future use
- **Cheating:** Proof cost is O(path_length), linear with distance traveled

### Backward Compatibility

- Existing hyperjump coordinates (merkle roots) are unchanged
- Existing `kind=321` block anchor events remain valid
- Existing `kind=3333` hyperjump events (without sector entry) remain valid
- Old clients that don't support sector entry can still use **point entry** via standard hop—it just costs vastly more (h≈84)
- Sector entry and traversal proofs are opt-in and detected by validators

---

## Part VI: Implementation Checklist

- [ ] Community review and feedback on this v2 draft
- [ ] Add sector-based HJ queries to cyberspace-cli (filter by sector, not exact coordinate)
- [ ] Implement `enter` action handler (kind 3333, A=enter)
- [ ] Add Cantor traversal proof builder for inter-HJ movement
- [ ] Update kind 3333 validator to handle `A=hyperjump` with traversal proofs
- [ ] Add equivocation detection (track `previous_event_id` usage)
- [ ] Update tests for enter action validation (Cantor proof + sector match)
- [ ] Write migration guide for existing clients

---

## Appendix: Mathematical Derivation

### Expected LCA for Sector Matching

Given:
- Sector space: S = 2⁵⁵ sectors per axis
- N target sectors (from HJs): N = blocks × 3 = 2.8M
- Random spawn position

**Probability that at least one target shares ≥k high-order bits with spawn:**

P(match) = 1 - P(all N targets have < k matching)
         = 1 - (1 - 2^(-k))^N

For median case (P = 0.5):
```
0.5 = 1 - (1 - 2^(-k))^N
(1 - 2^(-k))^N = 0.5
1 - 2^(-k) = 0.5^(1/N)
2^(-k) = 1 - 0.5^(1/N)
```

For large N, using Taylor approximation:
```
2^(-k) ≈ ln(2) / N
k ≈ log₂(N) - log₂(ln(2))
k ≈ log₂(N) + 0.53
```

With N = 2.8M:
```
k ≈ log₂(2.8×10⁶) + 0.53
k ≈ 21.4 + 0.53
k ≈ 22 bits matching (median, one axis)
```

**For best-of-3 axes:**
```
P(best LCA ≤ h) = 1 - P(all 3 axes have LCA > h)
                = 1 - (1 - P(one axis has LCA ≤ h))³
```

Solving for median (CDF = 0.5):
**Median LCA ≈ 33 bits**

This matches our empirical calculations.

---

*This DECK v2 draft is for community review. Comments welcome via GitHub issues or Nostr DM to @arkin0x.*

**References:**
- `CYBERSPACE_V2.md` - Core protocol specification
- `sidestep-proof-formal-spec.md` (2026-04-02) - Merkle sidestep mechanism
- `hyperjump-traversal-proof.md` (2026-04-15) - Cantor traversal proof specification
- `DECISIONS.md` (2026-04-15) - Kind 3333 locked pattern for all actions
