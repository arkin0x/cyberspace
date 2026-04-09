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

Sector extraction: `sector(coord) = coord >> 30` (high 55 bits)

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

### 2. Hyperjump-Cost Problem (Normative)

#### The Problem

The original DECK-0001 defines hyperjump as **free teleportation** between any two hyperjumps. This creates a graph where all nodes are equidistant (cost=0), which:
- Collapses spatial meaning
- Makes "distance" irrelevant once on the network
- Violates Property 1 (locality) at the protocol layer

We need a cost function that:
1. Scales with spatial distance (preserves locality)
2. Costs meaningful work (not arbitrary fees)
3. Cannot be reused (no amortization)
4. Is consumer-feasible for reasonable distances

#### Proposed Solution: Directional Cantor Commitment

When making a hyperjump from **H_from** to **H_to**, the avatar must compute a **directional Cantor commitment**:

```
direction_vector = H_to XOR H_from  // 256-bit directional signature
commitment_height = popcount(direction_vector >> 128)  // 0-128, based on high bits
commitment = compute_cantor_prefix(direction_vector, commitment_height)
```

The **commitment** is a partial Cantor tree computation (not a full hop proof) that:
- Costs 2^commitment_height operations
- Is unique to this specific (from, to) pair
- Cannot be reused for a different destination
- Expires after use (single-use commitment)

#### Cost Scaling

| Distance (hamming XOR on high 128 bits) | Commitment Height | Compute Time (consumer) | Cloud Cost |
|----------------------------------------|-------------------|-------------------------|------------|
| < 32 bits (nearby) | 8-16 | < 1 second | <$0.01 |
| 32-48 bits (same sector band) | 16-24 | 1 min - 1 hour | $0.01-1 |
| 48-64 bits (cross-sector) | 24-32 | 1 hour - 1 day | $1-10 |
| 64-80 bits (far) | 32-40 | 1 day - 1 week | $10-100 |
| 80-96 bits (very far) | 40-48 | 1 week - 1 month | $100-1000 |
| 96-112 bits (across space) | 48-56 | 1 month - 1 year | $1000-10k |
| > 112 bits (opposite corners) | 56-64 | 1-10 years | $10k-100k |

This preserves the **graph structure** of the hyperjump network while maintaining spatial locality. Nearby HJs are cheap to reach; distant ones cost more.

#### Non-Reuse Mechanism

The commitment includes:
- Previous movement event ID (binds to specific position in chain)
- Timestamp of hyperjump event
- Destination coordinate

This ensures the commitment is **single-use** and **non-transferable**. Validators reject any hyperjump event where the commitment doesn't match the specific (from, to, timestamp) tuple.

#### Open Questions

1. **Should commitment height be continuous or tiered?** Continuous is more precise; tiered is simpler to implement.

2. **Can commitments be precomputed?** Yes, but they're still single-use. Precomputation is an optimization, not an amortization.

3. **What prevents farming cheap short hops to "build up" to a long hop?** Nothing—this is intended! Strategic multi-hop routing is a valid use case and mirrors physical transit networks.

4. **Should there be a maximum commitment height?** Suggest N=64 (reasonable upper bound). Beyond that, the hop is effectively impossible for consumers.

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

