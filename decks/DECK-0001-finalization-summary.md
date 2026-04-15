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
