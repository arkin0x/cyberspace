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

## Inter-HJ Travel: Commitment + Traversal Proof

To prevent free teleportation from collapsing spatial locality, hyperjump travel now has **two components**:

### 1. Access Commitment (Block Height Metric)

Pays the "toll" to use the HJ network. Uses **Bitcoin block height difference**:

```
block_diff = |B_to - B_from|
commitment_height = block_diff.bit_length()
cost = 2^commitment_height SHA256 operations
```

**Why coordinate XOR failed:** Merkle roots are random 256-bit values. XOR of two random values has popcount ≈64, costing 2^64 ≈ 10^19 ops (5.8 million years).

**Why block height works:** Block numbers are ordered and linear. With ~940K blocks:
- Median hop: Δ=271K blocks → h=19 → 524K ops → **~5ms**
- **100% of hops are h≤20** (maximum possible with current Bitcoin history)

### 2. Traversal Proof (Incremental Cantor Tree)

Proves the entity **actually traveled** the path, not just paid the toll.

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

**Properties:**
- **Single proof for multi-block traversal** - One Cantor root aggregates entire path
- **Non-reusable** - Temporal seed binds to chain position (replay = equivocation)
- **No LCA barriers** - Path leaves, not region leaves. Cost is O(path_length)
- **Mathematical** - Bijective Cantor pairing, no hash grinding
- **Consumer-feasible** - ~1M blocks/day (1000× less than nation-state, linear advantage)

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

**See:** `decks/hyperjump-traversal-proof.md` for full specification.

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
- Cantor traversal proof is bijective, entropy-preserving, no shortcuts (Rigidity Theorem)

**Protocol:**
- Entry via dedicated **enter** action (kind 3333, A=enter) with Cantor proof
- Enter is 4th movement primitive (spawn, hop, sidestep, enter) - NOT sidestep
- Enter uses Cantor (h≈33 feasible), sidestep uses Merkle (h>35-40 infeasible)
- Exit always at exact merkle-root coordinate (preserves spatial meaning)
- Traversal proof via kind 3333 (A=hyperjump) with Cantor root
- Backward compatible: old clients can still use point entry (expensive)

**Social:**
- Democratizes access: 15 minutes vs nation-state resources
- Aligns with "infrastructure for everyone, owned by no one"
- Multi-hop routing emerges as skill (like physical transit planning)
- Traversal proofs create verifiable movement history without revealing exact path

## Open Questions (Resolved and Remaining)

### Resolved ✅
1. **Commitment height formula?** → **Block height bit_length** (see analysis)
2. **Maximum commitment height?** → **No cap needed**, naturally bounded (h≤20 in 2026, h≤24 by 2100)
3. **Traversal proof mechanism?** → **Incremental Cantor Tree with Temporal Leaf** (this PR)

### Remaining
4. **Welcome HJ for new spawns?** A predictable genesis-derived entry point? Or keep it decentralized?
5. **Route discovery:** Built-in graph routing in clients, or third-party tools?
6. **Bitcoin reorg handling:** Track finality depth (e.g., 6 confirmations) before accepting new HJs?

See `decks/DECK-0001-finalization-summary.md` for detailed analysis and recommendations.

## Implementation Checklist

- [x] Community review and feedback
- [x] Finalize directional commitment formula → Block height bit_length
- [x] Finalize traversal proof mechanism → Incremental Cantor Tree
- [ ] Merge DECK-0001 v2 to main branch
- [ ] Add sector-based HJ queries to cyberspace-cli
- [ ] Add commitment computation to hyperjump validation
- [ ] Add Cantor tree builder for traversal proofs
- [ ] Implement **enter** action handler (kind 33340, A=enter)
- [ ] Update tests for enter action validation (Cantor proof + sector match)
- [ ] Write migration guide for existing clients

---

**Files in this PR:**
- `decks/DECK-0001-hyperjumps.md` - Complete spec (sector entry + block height commitment + traversal proof)
- `decks/hyperjump-traversal-proof.md` - Full traversal proof specification
- `decks/hyperjump-commitment-analysis.md` - Mathematical analysis of commitment metric
- `decks/DECK-0001-finalization-summary.md` - Status report and recommendations

---

**This is a draft for community review.** Comments welcome via GitHub issues or Nostr DM to @arkin0x.
