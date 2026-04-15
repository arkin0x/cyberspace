# PR #12 Updated Description

**Copy-paste this into the PR description on GitHub**

---

## Summary

This revision extends DECK-0001 to solve the **bootstrap problem**: how can a newly spawned avatar reach the hyperjump network with consumer-feasible computation?

The original design required avatars to hop to the **exact** hyperjump coordinate (a 3D point), which at typical distances (LCA h≈84) requires ~10¹¹ years of computation—categorically infeasible.

This proposal introduces **sector-based entry planes**:

Each hyperjump defines three 2D entry planes (one per axis), each **1 sector thick** (2³⁰ Gibsons). Avatars can enter by matching the **sector** (high 55 bits) on any one axis, reducing the entry LCA from h≈84 (full Gibson match) to **h≈33** (sector match).

**Result:** With ~940K Bitcoin block HJs, entry cost drops from ~$50,000 cloud compute to **~$0.09**, enabling consumer access within **~15 minutes**.

## Design Evolution: Shadow HJs Removed

An earlier draft of this proposal included **shadow hyperjumps** (iterative SHA256 derivation, 60x density multiplier) as an optimization layer. After analysis, shadow HJs were **removed** from the design:

- **Sector planes alone are sufficient** - they already achieve h≈33 entry LCA, which is consumer-feasible
- Shadow HJs added unnecessary complexity without solving a remaining problem
- The 61× optimization (h≈33 → h≈27, 15min → 14sec) is nice-to-have, not required
- Keep the protocol minimal; shadows can be layered later if needed

This design principle—**solve the bootstrap problem with the simplest mechanism**—aligns with Cyberspace's ethos.

## Inter-HJ Travel Cost: Block Height Metric

To prevent free teleportation from collapsing spatial locality, hyperjump travel between HJs requires a **directional Cantor commitment**.

**BREAKTHROUGH:** The commitment height uses **Bitcoin block height difference**, NOT coordinate XOR distance.

**Why coordinate XOR failed:** Merkle roots are random 256-bit values. XOR of two random values has popcount ≈64, costing 2^64 ≈ 10^19 ops (5.8 million years). This made the HJ network unusable.

**Why block height works:** Block numbers are ordered and linear. With ~940K blocks:
- Median hop: Δ=271K blocks → h=19 → 524K ops → **~5ms**
- **100% of hops are h≤20** (maximum possible with current Bitcoin history)
- Cost scales naturally: adjacent blocks trivial, distant blocks cost more

```
block_diff = |B_to - B_from|
commitment_height = block_diff.bit_length()
cost = 2^commitment_height SHA256 operations
```

| Block Height Difference | Commitment Height | Ops | Time (consumer) |
|------------------------|-------------------|-----|-----------------|
| Δ = 1 (adjacent) | h = 1 | 2 | < 1 μs |
| Δ = 100 (~1 day) | h = 7 | 128 | < 1 μs |
| Δ = 10,000 (~2 months) | h = 14 | 16K | ~0.2 ms |
| Δ = 100,000 (~2 years) | h = 17 | 131K | ~1 ms |
| Δ = 500,000 (across chain) | h = 19 | 524K | ~5 ms |
| **Maximum (940K blocks)** | **h = 20** | **1M** | **~10 ms** |

**Triangle inequality holds:** Multi-hop routing costs the same as direct hop. Strategic routing is a skill, not an exploit.

Full spec and mathematical derivation in `decks/DECK-0001-hyperjumps.md` and `decks/hyperjump-commitment-analysis.md`.

## Coverage Projections

With ~940K Bitcoin blocks (2026) and 3 planes per HJ = **2.8M effective entry targets**:

| Year | Blocks | Effective Plane HJs | Median Entry LCA | Consumer Time | Cloud Cost |
|------|--------|---------------------|------------------|---------------|------------|
| 2026 | 940K | 2.8M | **h≈33** | ~15 minutes | ~$0.09 |
| 2031 | 1.2M | 3.6M | h≈32.8 | ~13 minutes | ~$0.07 |
| 2036 | 1.5M | 4.5M | h≈32.7 | ~12 minutes | ~$0.06 |

**With Moore's Law** (compute doubles every 2.5 years):
- 2026: ~15 minutes / $0.09
- 2031: ~4 minutes / $0.02
- 2036: ~1 minute / $0.005

## Three-Layer Analysis

**Mathematical:**
- Exploits dimensionality reduction (sector matching: 55 bits vs Gibson: 85 bits)
- Doesn't violate LCA decomposition invariant (changes target precision, not path)
- Sector matching is geometrically valid: matching 1-in-2³⁰ vs 1-in-2⁸⁵

**Protocol:**
- Entry via standard **sidestep** movement event (A=sidestep)
- New **hyperjump_entry** announcement (kind 33340) to signal network entry
- Exit always at exact merkle-root coordinate (preserves spatial meaning)
- Directional commitment (block height based) prevents free teleport, preserves locality
- Backward compatible: old clients can still use point entry (expensive)

**Social:**
- Democratizes access: 15 minutes vs nation-state resources
- Aligns with "infrastructure for everyone, owned by no one"
- Multi-hop routing emerges as skill (like physical transit planning)

## Open Questions (Resolved and Remaining)

### Resolved ✅
1. **Commitment height formula?** → **Block height bit_length** (see analysis)
2. **Maximum commitment height?** → **No cap needed**, naturally bounded (h≤20 in 2026, h≤24 by 2100)

### Remaining
3. **Welcome HJ for new spawns?** A predictable genesis-derived entry point? Or keep it decentralized?
4. **Route discovery:** Built-in graph routing in clients, or third-party tools?
5. **Bitcoin reorg handling:** Track finality depth (e.g., 6 confirmations) before accepting new HJs?

See `decks/DECK-0001-finalization-summary.md` for detailed analysis and recommendations.

## Implementation Checklist

- [x] Community review and feedback
- [x] Finalize directional commitment formula → Block height bit_length
- [ ] Merge DECK-0001 v2 to main branch
- [ ] Add sector-based HJ queries to cyberspace-cli
- [ ] Add commitment computation to hyperjump validation
- [ ] Create kind=33340 event handler (hyperjump_entry announcement)
- [ ] Update tests for new validation rules
- [ ] Write migration guide for existing clients

---

**This is a draft for community review.** Comments welcome via GitHub issues or Nostr DM to @arkin0x.

**Files in this PR:**
- `decks/DECK-0001-hyperjumps.md` - Complete spec (sector entry + block height commitment)
- `decks/hyperjump-commitment-analysis.md` - Mathematical analysis of commitment metric
- `decks/DECK-0001-finalization-summary.md` - Status report and recommendations
