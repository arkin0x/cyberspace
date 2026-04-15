# DECK-0001 v2 — Finalization Summary

**Date:** April 14, 2026  
**Status:** Ready for review → merge to main

---

## What Was Done

### 1. ✅ Replaced PR with Sector-Only Design

**PR #12** (`deck-0001-plane-shadow-hyperjumps`) updated to reflect sector-plane-only design:
- **Removed** shadow HJs (60x iterative SHA256 derivation)
- **Rationale:** Sector planes alone solve bootstrap problem (h≈33, ~15 min, $0.09)
- **Philosophy:** Keep protocol minimal; shadows unnecessary complexity

### 2. ✅ Updated DECK-0001 Specification

File: `decks/DECK-0001-hyperjumps.md`

**Major changes:**
- Sector-based entry planes (1 sector thick per axis)
- Entry via standard sidestep movement event (A=sidestep)
- Exit always at exact 3D merkle-root coordinate
- Removed shadow HJ derivation section

### 3. ✅ Solved Inter-HJ Travel Cost Problem

**BREAKTHROUGH:** Block height difference is the right metric (not coordinate XOR).

**Problem discovered:**
- Original formula: `popcount(coordinate_XOR >> 128)`
- Random 256-bit merkle roots → h=64 median → 2^64 ops → 5.8 million years
- Made HJ network **completely unusable**

**Solution:**
- New formula: `block_diff.bit_length()` where `block_diff = |B_to - B_from|`
- Median Δ=271K blocks → h=19 → 524K ops → **~5 milliseconds**
- **100% of hops are h≤20** (max with current Bitcoin history)
- Preserves locality: adjacent blocks trivial, distant blocks cost more
- Triangle inequality holds: multi-hop routing is valid skill

### 4. ✅ Created Analysis Document

File: `decks/hyperjump-commitment-analysis.md`

Full mathematical analysis of:
- Why coordinate XOR fails
- Why block height works
- Cost distribution projections
- Future Bitcoin growth impact

---

## Current Spec Status

### Entry Mechanism (SOLVED)
- **3 sector planes per HJ** (X, Y, Z axes)
- **1 sector thick** (2^30 Gibsons)
- **Match 55-bit sector** (not 85-bit Gibson coordinate)
- **Entry LCA: h≈84 → h≈33**
- **Consumer cost:** ~15 minutes, ~$0.09 cloud

### Exit Mechanism (SOLVED)
- **Always at exact 3D coordinate** (Hx, Hy, Hz)
- Preserves spatial meaning
- Prevents "free teleportation around" distance

### Inter-HJ Travel Cost (SOLVED)
- **Metric:** Bitcoin block height difference
- **Formula:** `commitment_height = |B_to - B_from|.bit_length()`
- **Median cost:** h=19, 524K ops, ~5ms, $0.0001
- **Maximum (2026):** h=20, 1M ops, ~10ms, $0.0002
- **Future growth:** h≤24 by year 2100 (still feasible)

### Non-Reuse Mechanism (SOLVED)
- Commitment bound to: `previous_event_id + timestamp + destination + block_diff`
- Single-use, non-transferable
- Validators check all components

---

## Remaining Open Questions

### 1. Welcome HJ for New Spawns

**Question:** Should there be a predictable, low-cost entry point for newly spawned avatars?

**Options:**
- **A. Genesis-derived HJ** (e.g., block 0 merkle root as canonical entry)
  - Pro: Consistent onboarding experience
  - Con: Introduces "central" point, may violate decentralization ethos
  
- **B. No special handling** (use sector planes, same as everyone)
  - Pro: Purely decentralized, no privileged HJ
  - Con: New users might find it confusing

- **C. First N blocks as "beginner zone"** (e.g., blocks 0-1000 are cheap entry points)
  - Pro: Natural onboarding gradient
  - Con: Requires client-side logic

**Recommendation:** Option B (no special handling). Sector planes already make entry consumer-feasible. Adding a "welcome HJ" adds complexity without solving a real problem.

---

### 2. Route Discovery

**Question:** Should clients have built-in graph routing for multi-hop journeys?

**Options:**
- **A. Built-in Dijkstra/A* routing** in cyberspace-cli
  - Pro: First-class UX, users don't need third-party tools
  - Con: Adds complexity to core client, opinionated design
  
- **B. Third-party tools only** (protocol provides primitives, community builds routing)
  - Pro: Minimal core protocol, encourages ecosystem
  - Con:Fragmented UX, users might not discover optimal routes

- **C. Hybrid** (core provides "nearest HJ" query, routing left to third parties)
  - Pro: Balance of utility and minimalism
  - Con: Still some complexity in core

**Recommendation:** Option C. Core CLI provides:
- `cyberspace hyperjump nearest --to <coord>` (find closest HJ to arbitrary coordinate)
- `cyberspace hyperjump route --from <HJ1> --to <HJ2>` (suggest multi-hop path, but doesn't execute)

Full journey planning left to third-party tools and services.

---

### 3. Bitcoin Reorg Handling

**Question:** Should implementations track Bitcoin finality depth before accepting HJs?

**Current state:** Block anchor events (kind 321) are published as soon as blocks are found. But Bitcoin blocks can reorg (though probability decreases exponentially with depth).

**Options:**
- **A. Require N confirmations** (e.g., only trust HJs with 6+ confirmations)
  - Pro: Protects against reorgs
  - Con: Adds ~1 hour delay for new HJs to become "available"
  
- **B. Allow unconfirmed, mark as "risky"** (client decides tolerance)
  - Pro: Immediate availability
  - Con: Client must handle reorg logic, potential for invalid HJs

- **C. Ignore reorgs** (assume they're vanishingly rare for deep blocks)
  - Pro: Simplest
  - Con: Technically incorrect, could cause issues with tip-of-chain HJs

**Recommendation:** Option B with sensible default. Core CLI:
- Accepts all HJs immediately
- Tags HJs <6 confirmations as "unconfirmed"
- Defaults to avoiding unconfirmed HJs for routing
- Allows `--allow-unconfirmed` flag for advanced users

**Rationale:** Reorg probability for blocks >6 deep is <0.1%. For blocks >100 deep, effectively zero. But keeping the logic enables power users to "front-run" new HJs if they want.

---

## Implementation Checklist

- [x] Community review and feedback
- [x] Finalize directional commitment formula → **Block height bit_length**
- [ ] Merge DECK-0001 v2 to main branch
- [ ] Update DECK-0001 spec with approved changes
- [ ] Add sector-based HJ queries to cyberspace-cli
- [ ] Add commitment computation to hyperjump validation
- [ ] Create kind=33340 event handler (hyperjump_entry announcement)
- [ ] Update tests for new validation rules
- [ ] Write migration guide for existing clients

---

## Next Steps

1. **Review this summary** and the updated spec
2. **Decide on remaining open questions** (Welcome HJ, Route Discovery, Reorg Handling)
3. **Merge PR #12** to main branch
4. **Begin implementation** in cyberspace-cli

---

## Files Modified

- `decks/DECK-0001-hyperjumps.md` (main spec, now sector-only + block height commitment)
- `decks/hyperjump-commitment-analysis.md` (new analysis doc)
- PR #12 description updated with sector-only narrative

**Branch:** `deck-0001-plane-shadow-hyperjumps`  
**Status:** Pushed to origin, ready for merge

---

## Key Insight

The inter-HJ travel cost problem was solved by **recognizing that Bitcoin block height is the only meaningful topology in the HJ system**. Spatial coordinates (merkle roots) are random and provide no useful distance metric. Block numbers are ordered, linear, and already part of HJ metadata.

This is analogous to subway systems: stations have geographic coordinates (random in the city), but the "distance" that matters is **number of stops** (ordered, linear). You plan trips by stop count, not GPS distance.

Similarly, HJ travel should use "block count" (height difference), not coordinate distance.

---

*This summary prepared by XOR on April 14, 2026. All analysis in `hyperjump-commitment-analysis.md`.*
# Directional Cantor Commitment — Block Height Metric Analysis

**Date:** April 14, 2026  
**Status:** Proposed solution for inter-HJ travel cost

## Problem

The original directional Cantor commitment formula used XOR distance of full 256-bit HJ coordinates:

```
direction_vector = H_to XOR H_from  (256-bit merkle roots)
commitment_height = popcount(high 128 bits)
cost = 2^commitment_height
```

**Result:** For random 256-bit merkle roots, median commitment height is **h=64**, costing 2^64 ≈ 1.8×10^19 operations (~5.8 million years on consumer hardware).

This makes the HJ network **completely unusable** — worse than the original bootstrap problem.

## Root Cause

Bitcoin block merkle roots are uniformly random 256-bit values. Any two random 256-bit values will have:
- XOR distance ≈ 256 bits (nearly all bits differ)
- Popcount of 128-bit segment ≈ 64 (half the bits are 1)
- Cost: 2^64 operations (infeasible)

The formula accidentally makes **every HJ pair maximally distant**.

## Solution: Bitcoin Block Height Difference

Instead of using spatial coordinate distance, use the **inherent topology of Bitcoin**:

```
block_diff = |block_height_to - block_height_from|
commitment_height = block_diff.bit_length()  # log2(block_diff)
cost = 2^commitment_height SHA256 operations
```

### Why This Works

1. **Block height is the only meaningful "distance" in the HJ system** — merkle root coordinates are random, but block numbers are ordered and linear.

2. **Natural clustering:** Nearby blocks (in height) represent "nearby" HJs conceptually, even if their merkle-root coordinates are spatially distant.

3. **Consumer-feasible distribution:** With ~940K blocks, random block pairs have:
   - Median Δ = 271K blocks → h=19 → 524K ops (~5ms)
   - 90th percentile Δ = ~450K → h=20 → 1M ops (~10ms)
   - **100% of hops are h≤20** (because max block diff < 2^20)

4. **Preserves locality:** Jumping to adjacent blocks is trivial; jumping across Bitcoin history costs more.

### Cost Table

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

**Note:** Maximum possible block difference is ~940K, so **h never exceeds 20** with current Bitcoin history. As Bitcoin continues, h will grow by ~1 every 2.5 years.

### Non-Reuse Mechanism

The commitment must still be single-use and bound to the specific movement:

```python
commitment_preimage = (
    previous_movement_event_id +  # binds to chain position
    hyperjump_event_timestamp +   # prevents precomputation attacks
    destination_coordinate +      # binds to specific target
    block_diff                    # the distance metric
)
commitment = SHA256(commitment_preimage)
```

Validator checks:
1. Verify `block_diff` matches the actual height difference
2. Verify commitment hash matches preimage
3. Reject if same commitment was used before (track by event ID)

### Multi-Hop Routing

Strategic multi-hop routing is **valid and encouraged**:

- Direct hop Δ=500K: h=19, 524K ops
- Two hops Δ=250K + Δ=250K: 2 × h=18 = 2 × 262K = 524K ops

**Total cost is identical** (triangle inequality preserved). No cheating.

This mirrors physical transit: taking 3 bus stops costs the same as one long route covering the same distance.

## Projection: Future Bitcoin Growth

| Year | Blocks | Max Block Δ | Max h | Median h | Median Cost |
|------|--------|-------------|-------|----------|-------------|
| 2026 | 940K | 940K | 20 | 19 | 524K ops |
| 2031 | 1.2M | 1.2M | 21 | 19 | 524K ops |
| 2036 | 1.5M | 1.5M | 21 | 20 | 1M ops |
| 2041 | 1.8M | 1.8M | 21 | 20 | 1M ops |
| 2046 | 2.1M | 2.1M | 21 | 20 | 1M ops |

**Growth is slow:** h increases by 1 every time block count doubles (~10 years at current rate).

**Consumer-feasible forever:** Even at year 2100 with 10M blocks, max h=24 (16M ops, ~160ms).

## Comparison: Coordinate XOR vs Block Height

| Metric | Coordinate XOR (original) | Block Height (proposed) |
|--------|--------------------------|-------------------------|
| Median h | 64 | 19 |
| Median ops | 2^64 ≈ 10^19 | 2^19 ≈ 5×10^5 |
| Median time | 5.8 million years | 5 milliseconds |
| Feasible (%) | 0% | 100% |
| Max h | ~84 | 20 (in 2026) |
| Preserves locality? | Yes, but infeasible | Yes, and practical |
| Intuitive? | No (random coords) | Yes (block sequence) |

## Recommendation

**Adopt block height difference as the commitment height metric.**

Normative spec text:

> **Directional Cantor Commitment (Normative)**
>
> When making a hyperjump from hyperjump H_from at block height B_from to hyperjump H_to at block height B_to:
>
> 1. Compute block height difference: `ΔB = |B_to - B_from|`
> 2. Compute commitment height: `h = ΔB.bit_length()` (0 if ΔB = 0)
> 3. Compute commitment cost: `2^h` SHA256 operations
> 4. Compute commitment preimage: `SHA256(previous_event_id || timestamp || destination_coord || ΔB)`
> 5. Publish commitment hash in hyperjump event
>
> Validators MUST verify:
> - ΔB matches actual block height difference from anchor events
> - Commitment hash is valid
> - Commitment has not been reused (unique by previous_event_id)

## Open Questions (Resolved)

~~1. Commitment height formula?~~ → **Block height bit_length**
~~2. Should there be a maximum commitment height?~~ → **No cap needed, naturally bounded by Bitcoin growth**
3. Welcome HJ for spawns? → Still open
4. Route discovery? → Still open
5. Bitcoin reorg handling? → Still open (suggest finality depth tracking)
