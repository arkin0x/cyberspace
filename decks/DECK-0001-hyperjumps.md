# DECK-0001 (Draft v2): Sector-Based Hyperjump Entry

**DECK:** 0001  
**Title:** Sector-Based Hyperjump Entry  
**Status:** Proposal (supersedes 2026-02-28 draft)  
**Created:** 2026-04-08  
**Author:** Arkinox  
**Requires:** `CYBERSPACE_V2.md` v2.x  

---

## Abstract

This revision extends DECK-0001 to solve the **bootstrap problem**: how can a newly spawned avatar reach the hyperjump network with consumer-feasible computation?

The original design required avatars to hop to the **exact** hyperjump coordinate (a 3D point), which at typical distances (LCA h≈84) requires ~10¹¹ years of computation—categorically infeasible.

This proposal introduces **sector-based entry planes**:

Each hyperjump defines three 2D entry planes (one per axis), each **1 sector thick** (2³⁰ Gibsons). Avatars can enter by matching the **sector** (high 55 bits) on any one axis, reducing the entry LCA from h≈84 (full Gibson match) to **h≈33** (sector match).

**Result:** With ~940K Bitcoin block HJs, entry cost drops from ~$50,000 cloud compute to **~$0.09**, enabling consumer access within **~15 minutes**.

---

## Layer Analysis (Math / Protocol / Social)

### Mathematical Layer

The Cantor pairing tree's **decomposition invariant** (Property 5) proves that *every* path between two points contains at least one hop with LCA ≥ the bit position where they differ. This is absolute for movement within the Cantor metric.

**However**, sector-plane entry changes the *target*: instead of reaching a 3D point (Hx, Hy, Hz), you reach a 2D sector-slab where *one* axis sector matches. The LCA is computed on the **sector bits** (55 bits), not the full Gibson value (85 bits).

- **3D point entry:** LCA = max(LCA_x, LCA_y, LCA_z) ≈ 84 (full 85-bit Gibson space)
- **1D sector-plane entry:** LCA ≈ log₂(2⁵⁵ / HJs) ≈ 33 (55-bit sector space)
- **Improvement:** 51 bits easier → 2⁵¹ ≈ 2×10¹⁵ times cheaper

This is not a cheat—it's exploiting the geometric fact that matching a sector (1 in 2³⁰ Gibsons) is vastly cheaper than matching an exact Gibson coordinate. The theorem still holds *within* each dimension; we're simply lowering the precision requirement for entry.

### Protocol Layer

The protocol defines:
- How sector planes are specified (1 sector thick per axis)
- How plane entry is validated (prove sector match, not Gibson match)
- How inter-hyperjump travel cost is computed (directional Cantor commitment)

Critically, **exit** from a hyperjump always occurs at the exact merkle-root coordinate. This preserves spatial meaning and prevents planes from being "free teleportation."

### Social Layer

Sector-plane entry democratizes access. Without it, only entities with nation-state resources could reach *any* hyperjump. With it, consumers spending ~15 minutes of computation (~$0.09 cloud) can reach their first HJ.

This aligns with Cyberspace's ethos: **infrastructure for everyone, owned by no one**. The thermodynamic cost remains—it's just amortized over a larger set of entry points.

---

## Specification

### 1. Sector-Based Entry Planes (Normative)

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

Reference implementation:
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

To enter a hyperjump via a plane, an avatar MUST prove they have reached a coordinate whose **sector** matches the hyperjump's sector on the chosen axis.

This is done via a standard **sidestep movement event** (`A=sidestep`) with:

- Destination coordinate **D** where `sector(chosen_axis) = sector(HJ_axis)`
- Standard sidestep Merkle proof for all three axes

Example (entering via Y-plane):
```json
{
  "kind": 3333,
  "tags": [
    ["A", "sidestep"],
    ["C", "<coord_on_Y_plane>"],  // sector(Y) matches HJ's sector(Y)
    ["proof", "<merkle_proof>"]
  ]
}
```

After reaching the plane, the avatar publishes a **hyperjump entry announcement** (kind 33340, see below) to signal they are now "on" the hyperjump network.

#### Exit Behavior

When exiting a hyperjump (after a `A=hyperjump` action), the avatar **always** arrives at the exact merkle-root coordinate **(Hx, Hy, Hz, Hp)**. The sector-plane advantage applies only to *entering*, not exiting.

This ensures:
- Spatial meaning is preserved (you can't "teleport around" distance)
- Navigation FROM the exit point to a final destination still costs work
- The plane mechanism doesn't collapse locality

---

### 2. Directional Cantor Commitment (Normative)

#### The Problem

The original DECK-0001 defines hyperjump as **free teleportation** between any two hyperjumps. This creates a graph where all nodes are equidistant (cost=0), which:
- Collapses spatial meaning
- Makes "distance" irrelevant once on the network
- Violates Property 1 (locality) at the protocol layer

We need a cost function that:
1. Scales with distance (preserves locality)
2. Costs meaningful work (not arbitrary fees)
3. Cannot be reused (no amortization)
4. Is consumer-feasible for all practical distances

**Additionally:** We need a **traversal proof** mechanism - an entity traveling from block N to block M must publish proof that they traversed the path, not just that they paid a cost.

#### Problem with Coordinate-Based Distance

An initial approach used XOR distance of full 256-bit merkle-root coordinates:

```
direction_vector = H_to XOR H_from  (256-bit merkle roots)
commitment_height = popcount(high 128 bits)
```

**Result:** For random 256-bit merkle roots, median commitment height is **h=64**, costing 2^64 ≈ 1.8×10^19 operations (~5.8 million years). This makes the HJ network unusable.

**Root cause:** Bitcoin merkle roots are uniformly random. Any two random 256-bit values have XOR distance ≈256 bits and popcount ≈64. The formula accidentally makes every HJ pair maximally distant.

#### Solution: Bitcoin Block Height Difference

The **access commitment** is derived from **Bitcoin block height difference**, not spatial coordinate distance:

```
block_diff = |B_to - B_from|  (absolute difference in block heights)
commitment_height = block_diff.bit_length()  # log2(block_diff), or 0 if block_diff = 0
commitment_cost = 2^commitment_height SHA256 operations
```

**Why this works:**
- Block height is the only meaningful "distance" in the HJ system (merkle coordinates are random, block numbers are ordered)
- Nearby blocks (in height) represent "nearby" HJs conceptually
- With ~940K blocks, random block pairs have median Δ=271K → h=19 → 524K ops (~5ms)
- **100% of hops are h≤20** (maximum possible with current Bitcoin history)
- Cost scales naturally: adjacent blocks are trivial, distant blocks cost more

#### Traversal Proof: Incremental Cantor Tree

Access commitment pays the "toll" to use the HJ network. **Traversal proof** demonstrates that an entity actually traveled the path.

**Mechanism:** Incremental Cantor Tree with Temporal Leaf binding.

**Leaves:** `[temporal_seed, B_from, B_from+1, ..., B_to]`
- `temporal_seed = previous_event_id (as big-endian int) % 2^256`
- Binds proof to entity's specific chain position

**Tree construction:** Sequential Cantor pairing of all leaves:
```python
def cantor_pair(a: int, b: int) -> int:
    """π(a, b) = (a+b)(a+b+1)/2 + b"""
    s = a + b
    return (s * (s + 1)) // 2 + b

# Build tree from leaves
root = leaves[0]
for leaf in leaves[1:]:
    root = cantor_pair(root, leaf)
```

**Publication:** Kind 3333 event with `A=hyperjump` tag:
```json
{
  "kind": 3333,
  "tags": [
    ["A", "hyperjump"],
    ["from_height", "850000"],
    ["to_height", "850100"],
    ["from_hj", "<merkle_root_850000>"],
    ["to_hj", "<merkle_root_850100>"],
    ["prev", "<previous_event_id>"],
    ["proof", "<cantor_root_hex>"]
  ]
}
```

**Verification:** Recompute tree from leaves, verify root matches. O(path_length) operations.

**Non-reuse:** Temporal seed binds proof to chain position. Replay = equivocation (detectable).

**See:** `decks/hyperjump-traversal-proof.md` for full specification.

#### Cost Scaling

| Block Height Difference | Commitment Height | SHA256 Operations | Time (consumer GPU) | Cloud Cost |
|------------------------|-------------------|-------------------|---------------------|------------|
| Δ = 1 (adjacent) | h = 1 | 2 ops | < 1 μs | $0 |
| Δ = 10 (nearby) | h = 4 | 16 ops | < 1 μs | $0 |
| Δ = 100 (~1 day) | h = 7 | 128 ops | < 1 μs | $0 |
| Δ = 1,000 (~1 week) | h = 10 | 1K ops | ~1 μs | $0 |
| Δ = 10,000 (~2 months) | h = 14 | 16K ops | ~0.2 ms | $0 |
| Δ = 100,000 (~2 years) | h = 17 | 131K ops | ~1 ms | $0 |
| Δ = 500,000 (across chain) | h = 19 | 524K ops | ~5 ms | $0.0001 |
| **Median (random pair)** | **h = 19** | **524K ops** | **~5 ms** | **$0.0001** |
| **Maximum (940K blocks)** | **h = 20** | **1M ops** | **~10 ms** | **$0.0002** |

**Note:** Maximum possible block difference is ~940K (in 2026), so **h never exceeds 20**. As Bitcoin grows, h increases by ~1 every 10 years (when block count doubles). At year 2100 with 10M blocks, max h=24 (16M ops, ~160ms) — still consumer-feasible.

#### Non-Reuse Mechanism

The commitment MUST be single-use and bound to the specific movement:

```python
commitment_preimage = (
    previous_movement_event_id +  # binds to chain position
    hyperjump_event_timestamp +   # prevents precomputation attacks
    destination_coordinate +      # binds to specific target
    block_diff                    # the distance metric
)
commitment_hash = SHA256(commitment_preimage)
```

Validators MUST verify:
1. `block_diff` matches the actual height difference from anchor events
2. Commitment hash is valid
3. Commitment has not been reused (track by `previous_movement_event_id`)
4. Reject if any check fails

#### Triangle Invariance (No Cheating)

Strategic multi-hop routing is **valid and encouraged**:

- Direct hop Δ=500K: h=19, 524K ops
- Two hops Δ=250K + Δ=250K: 2 × (h=18, 262K ops) = 524K ops total

**Total cost is identical.** The triangle inequality holds. No cheating.

This mirrors physical transit: taking 3 bus stops costs the same as one long route covering the same distance. Multi-hop routing is a skill, not an exploit.

#### Open Questions (Resolved)

1. **Commitment height formula?** → **Block height bit_length** (see above)
2. **Maximum commitment height?** → **No cap needed**, naturally bounded by Bitcoin growth (h≤20 in 2026, h≤24 by 2100)
3. **Can commitments be precomputed?** → Yes, but still single-use. Optimization, not amortization.
4. **What prevents farming cheap hops?** → Nothing! Multi-hop routing is valid. Triangle inequality ensures total cost equals direct hop cost.

---

## Coverage and Accessibility Analysis

### Assumptions

- Bitcoin block production: 52,560 blocks/year (~10 min average)
- Current blocks (2026): ~940,000
- Planes per HJ: 3 (X, Y, Z)
- Effective plane HJs: blocks × 3 planes = **2.8M** by 2026
- Average 1D LCA gap formula for sector matching: `LCA ≈ log₂(2⁵⁵ / effective_HJs)`
  - **55-bit sector space** = 2⁵⁵ sectors per axis (plane is 1 sector = 2³⁰ Gibsons thick)
  - With 2.8M plane HJs: LCA ≈ log₂(2⁵⁵ / 2.8×10⁶) ≈ **log₂(1.3×10¹⁰) ≈ 33.6**

### Spawn-to-HJ LCA Projection (1D sector match, best-of-3 axes)

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

### Blocks-Only Analysis

**Sector-wide planes alone solve the bootstrap problem.**

| Configuration | Median LCA | Consumer Time | Cloud Cost |
|--------------|------------|---------------|------------|
| **Sector planes** (this proposal) | h=33 | ~15 minutes | ~$0.09 |
| Original HJ design (point entry) | h=84 | ~10¹¹ years | ~$50,000+ |
| **Improvement** | **51 bits easier** | **10¹⁴× faster** | **500,000× cheaper** |

This demonstrates that the geometric insight (sector matching vs point matching) is what solves the bootstrap problem. Future work can layer additional optimizations on top.

### Total Cyberspace Coverage

| Metric | Value |
|--------|-------|
| Total coord256 space | 2²⁵⁶ ≈ 1.16×10⁷⁷ points |
| Total sector space (85-bit axes) | 2²⁵⁵ ≈ 5.8×10⁷⁶ sectors |
| HJ coverage (2026) | 2.8M / 5.8×10⁷⁶ = **4.8×10⁻⁷¹** (vanishingly sparse) |
| Interpretation | HJs are **vanishingly sparse**—they don't "cover" space, they provide strategic waypoints |

**Key insight:** Cyberspace doesn't "collapse" as HJ density increases. It transitions from **impossible** → **nation-state only** → **cloud-feasible** → **consumer-accessible**. The spatial structure remains; only accessibility changes.

---

## Events Specification

### Block Anchor Events (Existing, Unchanged)

**Kind:** 321 (CSEP-321)

Existing block anchor events remain valid. No changes required.

### Hyperjump Entry Announcement (New)

**Kind:** 33340 (CSEP-33340)  
**Purpose:** Signal that an avatar has reached a hyperjump sector-plane and is now on the HJ network

**Required tags:**
- `A`: `["A", "hyperjump_entry"]`
- `e`: `["e", "<previous_movement_event_id>", "", "previous"]`
- `c`: `["c", "<plane_coord_hex>"]` (coordinate on the entry plane)
- `HJ`: `["HJ", "<hyperjump coord hex>"]` (the target HJ being entered)
- `axis`: `["axis", "X"|"Y"|"Z"]` (which plane was used)

**Validation:**
1. Verify previous event was a valid sidestep to a plane coordinate
2. Verify the plane coordinate matches the target HJ on the specified axis: `sector(plane_coord_axis) == sector(HJ_axis)`
3. If sector doesn't match, reject

---

## Security Considerations

### Sector Entry Does Not Reveal More Information

Knowing an avatar is "on the X-plane of HJ H" reveals only that their X sector equals H's X sector. Their Y and Z sectors (and all Gibson-level precision) remain hidden. This is strictly less information than revealing the full 3D point.

### Directional Commitment Prevents Free Teleportation

By binding the commitment cost to the XOR distance between specific (from, to) pairs, the protocol prevents:
- **Reuse:** Commitment is single-use
- **Amortization:** Can't "build up" credit for long hops
- **Distance cheating:** Far hops cost more, always

### Backward Compatibility

- Existing hyperjump coordinates (merkle roots) are unchanged
- Existing `kind=321` block anchor events remain valid
- Old clients that don't support sector entry can still use **point entry** (3D hop)—it just costs vastly more
- Sector entry is opt-in and detected by validators

---

## Open Questions for Discussion

1. **Commitment height formula:** Current proposal uses popcount of high 128 bits of XOR difference. Alternatives?
   - Full Hamming distance / 4
   - LCA height of (from, to) coordinates (but this requires knowing both points upfront, which is circular)
   - Precomputed distance tier table

2. **"Welcome HJ" for new spawns?** A predictable low-cost entry point (e.g., derived from genesis block) could help onboard users. But this introduces a "central" point, which may violate decentralization ethos.

3. **Route discovery:** Should clients have built-in graph routing for multi-hop journeys, or should this be left to third-party tools?

4. **Bitcoin reorg handling:** Should implementations track Bitcoin finality depth (e.g., 6 confirmations) before accepting HJs from new blocks?

---

## Implementation Checklist

- [ ] Community review and feedback on this draft
- [ ] Finalize directional commitment formula (open question #1)
- [ ] Update DECK-0001 with approved changes
- [ ] Add sector-based HJ queries to cyberspace-cli (filter by sector, not exact coordinate)
- [ ] Add commitment computation to hyperjump validation
- [ ] Create `kind=33340` event handler
- [ ] Update tests for new validation rules
- [ ] Write migration guide for existing clients

---

*This DECK draft is for community review. Comments welcome via GitHub issues or Nostr DM to @arkin0x.*

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
0.5 = 1 - (1 - 2^(-k))^N
(1 - 2^(-k))^N = 0.5
1 - 2^(-k) = 0.5^(1/N)
2^(-k) = 1 - 0.5^(1/N)

For large N, using Taylor approximation:
2^(-k) ≈ ln(2) / N
k ≈ log₂(N) - log₂(ln(2))
k ≈ log₂(N) + 0.53

With N = 2.8M:
k ≈ log₂(2.8×10⁶) + 0.53
k ≈ 21.4 + 0.53
k ≈ 22 bits matching (median, one axis)

**For best-of-3 axes:**
P(best LCA ≤ h) = 1 - P(all 3 axes have LCA > h)
                = 1 - (1 - P(one axis has LCA ≤ h))³

Solving for median (CDF = 0.5):
Median LCA ≈ 33 bits

This matches our empirical calculations.


---

## PR Description (for reference)

**Title:** DECK-0001 v2: Sector-based hyperjump entry planes

**Summary:**
Each HJ has 3 sector-wide entry planes (1 sector thick). Match ONE axis sector (55 bits) instead of exact Gibson coordinate (85 bits). Entry cost: h≈84 → h≈33, enabling consumer access in ~15 minutes ($0.09 cloud).

**Open Questions:**
1. Commitment height formula? (popcount vs alternatives)
2. Welcome HJ for spawns?
3. Route discovery method?
4. Bitcoin reorg handling?

