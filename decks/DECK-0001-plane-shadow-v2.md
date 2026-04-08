# DECK-0001 (Draft v2): Plane-Based Hyperjump Access with Shadow Derivation

**DECK:** 0001  
**Version:** 2.1 (corrected for sector-wide planes)  
**Title:** Plane-Based Hyperjump Access with Shadow Derivation  
**Status:** Proposal (supersedes 2026-02-28 draft)  
**Created:** 2026-04-08  
**Author:** Arkinox  
**Requires:** `CYBERSPACE_V2.md` v2.x  

---

## Abstract

This revision extends DECK-0001 to solve the **bootstrap problem**: how can a newly spawned avatar reach the hyperjump network with consumer-feasible computation?

The original design required avatars to hop to the **exact** hyperjump coordinate (a 3D point), which at typical distances (LCA h≈84) requires ~10¹¹ years of computation—categorically infeasible.

This proposal introduces two mechanisms (with sector-wide entry planes):

1. **Plane-based entry**: Each hyperjump defines three 2D entry planes (one per axis). Avatars can enter by reaching *any* point on one plane, reducing the sidestep from 3D (h≈84) to 1D (h≈57-63).

2. **Shadow hyperjump derivation**: Each base hyperjump coordinate can be iteratively hashed to derive "shadow" hyperjumps at exponentially increasing entry cost. This multiplies effective HJ density by ~60x, further reducing entry LCA to h≈50-57.

**Result:** With ~940K Bitcoin block HJs + 60x shadow derivation = **56M effective plane HJs**, the entry cost drops from ~$50,000 cloud compute to **~$800**, enabling consumer access within a 1-year budget.

---

## Layer Analysis (Math / Protocol / Social)

### Mathematical Layer

The Cantor pairing tree's **decomposition invariant** (Property 5) proves that *every* path between two points contains at least one hop with LCA ≥ the bit position where they differ. This is absolute for movement within the Cantor metric.

**However**, plane-based entry does NOT violate this theorem. It changes the *target*: instead of reaching a 3D point (Hx, Hy, Hz), you reach a 2D plane where *one* coordinate matches. The LCA is computed on a **single axis**, not all three.

- **3D point entry:** LCA = max(LCA_x, LCA_y, LCA_z) ≈ 84 (full 85-bit Gibson space)
- **1D sector-plane entry:** LCA ≈ log₂(2⁵⁵ / HJs) ≈ 29-35 (55-bit sector space)
- **With 60x shadow:** LCA ≈ log₂(2⁵⁵ / 56M) ≈ 29 (consumer: ~3 hours, cloud: ~$0.05)

This is not a cheat—it's exploiting the geometric fact that a plane has lower dimensionality than a point in 3D space. The theorem still holds *within* each dimension; we're simply choosing the cheapest dimension.

Shadow derivation uses SHA256 as a deterministic expansion function. Each iteration produces a new pseudo-random coordinate. The entry cost doubles per iteration (2^N), creating a natural economic tier system.

### Protocol Layer

The protocol must define:
- How plane entry is validated (prove you're on the plane)
- How shadow HJs are derived and verified
- How inter-hyperjump travel cost is computed (the **hyperjump-cost problem**)

Critically, **exit** from a hyperjump always occurs at the exact merkle-root coordinate. This preserves spatial meaning and prevents planes from being "free teleportation."

### Social Layer

Plane-based entry democratizes access. Without it, only entities with nation-state resources could reach *any* hyperjump. With it, consumers spending ~$1,000 on cloud compute can reach their first HJ within a year of parallel computation.

This aligns with Cyberspace's ethos: **infrastructure for everyone, owned by no one**. The thermodynamic cost remains—it's just amortized over a larger set of entry points.

---

## Specification

### 1. Plane-Based Entry (Normative)

#### Definition

For a hyperjump at coordinate **H = (Hx, Hy, Hz, Hp)**, three entry planes are defined:

- **X-plane**: All coordinates where **X = Hx** (covers (Hx, *, *, *))
- **Y-plane**: All coordinates where **Y = Hy** (covers (*, Hy, *, *))
- **Z-plane**: All coordinates where **Z = Hz** (covers (*, *, Hz, *))

The plane bit **Hp** is inherited from the hyperjump coordinate (plane 0 = dataspace, plane 1 = ideaspace).

#### Entry Validation

To enter a hyperjump via a plane, an avatar MUST prove they have reached a coordinate on that plane. This is done via a standard **sidestep movement event** (`A=sidestep`) with:

- Destination coordinate **D** where the chosen axis matches the hyperjump's axis value
- Standard sidestep Merkle proof for all three axes

Example (entering via Y-plane):
```json
{
  "kind": 3333,
  "tags": [
    ["A", "sidestep"],
    ["C", "<coord_on_Y_plane>"],  // Y value matches HJ's Y
    ["proof", "<merkle_proof>"],
    ["Y_matches_HJ", "true"]  // Optional hint for validators
  ]
}
```

After reaching the plane, the avatar publishes a **hyperjump entry event** (new event kind, see below) to signal they are now "on" the hyperjump network.

#### Exit Behavior

When exiting a hyperjump (after a `A=hyperjump` action), the avatar **always** arrives at the exact merkle-root coordinate **(Hx, Hy, Hz, Hp)**. The plane entry advantage applies only to *entering*, not exiting.

This ensures:
- Spatial meaning is preserved (you can't "teleport around" distance)
- Navigation FROM the exit point to a final destination still costs work
- The plane mechanism doesn't collapse locality

---

### 2. Shadow Hyperjump Derivation (Normative)

#### Derivation Function

Given a base hyperjump coordinate **H₀** (from Bitcoin block merkle root), shadow coordinates are derived iteratively:

```
H₀ = merkle_root_as_coord256
H₁ = SHA256(H₀)  // reinterpret 32-byte hash as coord256
H₂ = SHA256(H₁)
...
Hₙ = SHA256(Hₙ₋₁)
```

Each **Hₙ** is a valid **shadow hyperjump** at **iteration depth N**.

#### Entry Cost

Entering a shadow hyperjump at depth **N** costs **2^N** times the base sidestep cost. This is enforced by requiring the avatar to include the **iteration count N** in their entry proof, and validators recompute the expected LCA penalty.

Practical limits:
- **N ≤ 20**: Consumer-feasible (2²⁰ ≈ 1M multiplier, adds ~20 to LCA)
- **N ≤ 40**: Cloud-feasible (~$100-500)
- **N ≤ 60**: Nation-state feasible (~$10,000+)
- **N > 60**: Prohibitively expensive

Implementations SHOULD reject shadow entries with N > 60.

#### Validation

Block anchor events MUST include an optional **shadow depth tag**:
- `shadow` tag: `["shadow", "<depth>"]` where `<depth>` is a base-10 integer (0 for base HJ, 1+ for shadows)

If omitted, depth is assumed to be 0.

To validate a shadow hyperjump entry:
1. Derive Hₙ from base H₀ using N iterations
2. Verify the avatar's destination coordinate matches Hₙ (or is on Hₙ's plane)
3. Apply entry cost multiplier 2^N to the sidestep proof validation

---

### 3. Hyperjump-Cost Problem (Proposed Specification)

#### The Problem

The current DECK-0001 defines hyperjump as **free teleportation** between any two hyperjumps. This creates a graph where all nodes are equidistant (cost=0), which:
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

| Distance (hamming XOR) | Commitment Height | Compute Time (consumer) | Cloud Cost |
|------------------------|-------------------|-------------------------|------------|
| < 64 bits (nearby) | 8-16 | < 1 second | <$0.01 |
| 64-96 bits (same sector band) | 16-24 | 1 min - 1 hour | $0.01-1 |
| 96-128 bits (cross-sector) | 24-32 | 1 hour - 1 day | $1-10 |
| 128-160 bits (far) | 32-40 | 1 day - 1 week | $10-100 |
| 160-192 bits (very far) | 40-48 | 1 week - 1 month | $100-1000 |
| 192-224 bits (across space) | 48-56 | 1 month - 1 year | $1000-10k |
| > 224 bits (opposite corners) | 56-64 | 1-10 years | $10k-100k |

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

4. **Should there be a maximum commitment height?** Suggest N=64 (same as shadow limit). Beyond that, the hop is effectively impossible for consumers.

---

## Coverage and Accessibility Analysis

### Assumptions

- Bitcoin block production: 52,560 blocks/year (~10 min average)
- Current blocks (2026): ~940,000
- Shadow multiplier: 60x (N ≤ 60 practical limit)
- Effective plane HJs: blocks × 3 planes × 60 shadows = **169M** by 2026
- Average 1D LCA gap formula for sector matching: `LCA ≈ log₂(2⁵⁵ / effective_HJs)`
  - **55-bit sector space** = 2⁵⁵ sectors per axis (plane is 1 sector = 2³⁰ Gibsons thick)
  - With 169M plane HJs: LCA ≈ log₂(2⁵⁵ / 1.69×10⁸) ≈ **log₂(2.1×10⁸) ≈ 27.7**

### Spawn-to-HJ LCA Projection (1D, best-of-3 axes)

| Year | Blocks | Effective Plane HJs | Avg LCA | Consumer Time | Cloud Cost ($0.15/hr GPU) |
|------|--------|---------------------|---------|---------------|---------------------------|
| 2026 | 940K | 169M | 27.7 | ~3 hours | ~$0.05 |
| 2031 | 1.2M | 216M | 27.4 | ~2 hours | ~$0.03 |
| 2036 | 1.5M | 270M | 27.2 | ~1.5 hours | ~$0.02 |
| 2046 | 2.0M | 360M | 26.9 | ~1 hour | ~$0.01 |
| 2056 | 2.5M | 450M | 26.7 | ~45 minutes | < $0.01 |

**With Moore's Law (compute doubles every 2.5 years) — already trivial in 2026:**

| Year | Compute Multiplier | Time to First HJ | Cloud Cost |
|------|-------------------|------------------|------------|
| 2026 | 1× | ~3 hours | ~$0.05 |
| 2031 | 4× | ~45 minutes | ~$0.01 |
| 2036 | 16× | ~10 minutes | <$0.01 |

### Total Cyberspace Coverage

| Metric | Value |
|--------|-------|
| Total coord256 space | 2²⁵⁶ ≈ 1.16×10⁷⁷ points |
| Total sector space (85-bit axes) | 2²⁵⁵ ≈ 5.8×10⁷⁶ sectors |
| HJ coverage (2026) | 169M / 5.8×10⁷⁶ = **2.9×10⁻⁶⁹** (negligible) |
| Interpretation | HJs are **vanishingly sparse**—they don't "cover" space, they provide strategic waypoints |

**Key insight:** Cyberspace doesn't "collapse" as HJ density increases. It transitions from **impossible** → **nation-state only** → **cloud-feasible** → **consumer-accessible**. The spatial structure remains; only accessibility changes.

---

## Events Specification

### New Event Kind: Hyperjump Entry Announcement

**Kind:** 33340 (CSEP-33340)  
**Purpose:** Signal that an avatar has reached a hyperjump plane and is now on the HJ network

**Required tags:**
- `A`: `["A", "hyperjump_entry"]`
- `e`: `["e", "<previous_movement_event_id>", "", "previous"]`
- `c`: `["c", "<plane_coord_hex>"]` (coordinate on the entry plane)
- `HJ`: `["HJ", "<hyperjump coord hex>"]` (the target HJ being entered)
- `axis`: `["axis", "X"|"Y"|"Z"]` (which plane was used)

**Optional tags:**
- `shadow`: `["shadow", "<depth>"]` (if entering a shadow HJ)

**Validation:**
1. Verify previous event was a valid sidestep to a plane coordinate
2. Verify the plane coordinate matches the target HJ on the specified axis
3. If shadow depth > 0, verify entry cost multiplier is applied

---

## Backward Compatibility

- Existing hyperjump coordinates (merkle roots) are unchanged
- Existing `kind=321` block anchor events remain valid
- Old clients that don't support plane entry can still use **point entry** (3D hop)—it just costs more
- Shadow HJs are opt-in: validators that don't recognize shadow depth=0 only

---

## Security Considerations

### Plane Entry Does Not Reveal Information

Knowing an avatar is "on the X-plane of HJ H" reveals only that their X coordinate equals Hx. Their Y and Z coordinates remain hidden. This is strictly less information than revealing the full 3D point.

### Shadow Derivation Is Trustless

Anyone can derive shadow HJs from public Bitcoin data. No trusted setup or coordination required. The 2^N cost scaling is mathematical, not policy-based.

### Directional Commitment Prevents Free Teleportation

By binding the commitment cost to the XOR distance between specific (from, to) pairs, the protocol prevents:
- **Reuse:** Commitment is single-use
- **Amortization:** Can't "build up" credit for long hops
- **Distance cheating:** Far hops cost more, always

---

## Open Questions for Discussion

1. **What should the commitment height formula be?** Current proposal uses popcount of high 128 bits. Alternatives:
   - Full Hamming distance / 4
   - LCA height of (from, to) coordinates
   - Precomputed distance tier table

2. **Should there be a "welcome HJ" for new spawns?** A predictable low-cost entry point (e.g., derived from genesis block) could help onboard users. But this introduces a "central" point, which may violate decentralization ethos.

3. **How should clients discover optimal multi-hop routes?** This is a graph routing problem. Should it be built into the CLI, or left to third-party tools?

4. **What happens if Bitcoin forks or has a deep reorg?** HJs derived from reorged blocks become invalid. Should implementations track Bitcoin finality depth before accepting HJs?

---

## Implementation Checklist

- [ ] Update DECK-0001 with plane entry spec
- [ ] Add shadow derivation function to cyberspace-cli
- [ ] Implement plane-based HJ queries (filter cache by single axis)
- [ ] Add directional commitment computation to hyperjump validation
- [ ] Create `kind=33340` event handler
- [ ] Update tests for new validation rules
- [ ] Write migration guide for existing clients

---

*This DECK draft is for community review. Comments welcome via GitHub issues or Nostr DM to @arkin0x.*
