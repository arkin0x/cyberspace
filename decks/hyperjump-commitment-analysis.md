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
