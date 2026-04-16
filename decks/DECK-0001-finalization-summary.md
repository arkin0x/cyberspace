# DECK-0001 v2 — Finalization Summary

**Date:** April 15, 2026  
**Status:** Ready for review → merge to main

---

## What Was Done

### 1. ✅ Sector-Based Entry Planes

**PR #12** (`deck-0001-plane-shadow-hyperjumps`):
- **3 sector planes per HJ** (X, Y, Z axes), 1 sector thick (2³⁰ Gibsons)
- Match 55-bit sector instead of 85-bit Gibson coordinate
- Entry LCA: h≈84 → h≈33
- Consumer cost: ~15 minutes, ~$0.09 cloud
- **Removed** shadow HJs (unnecessary complexity)

### 2. ✅ Enter Action (4th Movement Primitive)

**New action type:** `enter` (kind 3333, A=enter)
- Proves arrival at hyperjump plane via Cantor proof (h≈33 feasible)
- Distinct from `sidestep` (which uses Merkle for h>35-40)
- Tags: `["A", "enter"]`, `["HJ", "<target>"]`, `["axis", "X|Y|Z"]`, `["proof", "<cantor_root>"]`

### 3. ✅ Hyperjump Traversal Proof

**New mechanism:** Incremental Cantor Tree with Temporal Leaf
- Single Nostr event proves multi-block traversal
- Leaves: `[temporal_seed, B_from, B_from+1, ..., B_to]`
- Temporal seed from `previous_event_id` prevents replay (replay = equivocation)
- Cost: O(path_length) Cantor pairings (~1M blocks/day consumer)
- **Supersedes** block height commitment (which was only access cost, not traversal proof)

---

## Current Spec Status

| Mechanism | Status | Spec |
|-----------|--------|------|
| Sector entry planes | ✅ Solved | DECK-0001-hyperjumps.md |
| Enter action (kind 3333, A=enter) | ✅ Solved | DECK-0001-hyperjumps.md |
| Traversal proof (Cantor tree) | ✅ Solved | hyperjump-traversal-proof.md |
| Exit at exact coordinate | ✅ Solved | DECK-0001-hyperjumps.md |

---

## Remaining Open Questions

### 1. Welcome HJ for New Spawns

**Question:** Should there be a predictable, low-cost entry point for newly spawned avatars?

**Options:**
- **A. Genesis-derived HJ** (e.g., block 0 merkle root)
- **B. No special handling** (use sector planes)
- **C. First N blocks as "beginner zone"**

**Recommendation:** Option B. Sector planes already make entry consumer-feasible.

---

### 2. Route Discovery

**Question:** Should clients have built-in graph routing for multi-hop journeys?

**Recommendation:** Hybrid approach - core provides `nearest HJ` query, routing left to third parties.

---

### 3. Bitcoin Reorg Handling

**Question:** Should implementations track Bitcoin finality depth before accepting HJs?

**Recommendation:** Accept all HJs immediately, tag <6 confirmations as "unconfirmed", default to avoiding them.

---

## Implementation Checklist

- [x] Community review and feedback
- [x] Finalize traversal proof mechanism → Incremental Cantor Tree
- [x] Finalize entry action → kind 3333, A=enter
- [ ] Merge DECK-0001 v2 to main branch
- [ ] Add sector-based HJ queries to cyberspace-cli
- [ ] Implement enter action handler (kind 3333, A=enter)
- [ ] Implement hyperjump traversal proof builder
- [ ] Update tests for enter + hyperjump validation
- [ ] Write migration guide for existing clients

---

## Next Steps

1. **Review this summary** and updated specs
2. **Decide on remaining open questions**
3. **Merge PR #12** to main branch
4. **Begin implementation** in cyberspace-cli

---

## Files Modified

- `decks/DECK-0001-hyperjumps.md` (sector entry + enter action)
- `decks/hyperjump-traversal-proof.md` (new - Cantor tree traversal proof)
- `decks/DECISION-action-kinds.md` (new - locked kind 3333 pattern)
- PR #12 description updated

**Branch:** `deck-0001-plane-shadow-hyperjumps`  
**Status:** Pushed to origin, ready for merge

---

## Key Insight

**Entry** and **traversal** are separate concerns:
- **Entry** pays the "toll" to board the HJ network (sector-plane, h≈33 Cantor proof)
- **Traversal** proves the path was actually traveled (Cantor tree over block heights)

The old "block height commitment" was an access toll, not a traversal proof. The new Cantor tree mechanism provides actual path verification with non-reuse guarantees.

---

*This summary prepared by XOR on April 15, 2026.*
