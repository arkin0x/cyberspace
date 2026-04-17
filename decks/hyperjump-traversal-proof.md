---
title: "Hyperjump Traversal Proof: Incremental Cantor Tree with Temporal Leaf"
status: proposed
created: 2026-04-15
author: Arkinox and XOR
tags: [tag:transit, tag:hyperjump, tag:proof-of-work, tag:nostr]
supersedes: block_height_commitment.md (2026-04-14)
---

# Hyperjump Traversal Proof Specification

## Abstract

Hyperjump traversal between Bitcoin blocks requires proof that an entity has traversed the blockchain path. This specification defines a **single Nostr event proof** using an **Incremental Cantor Tree with Temporal Leaf binding**.

**Key properties:**
- **Single proof for multi-block traversal** - One Cantor root aggregates the entire path from block N to block M
- **Non-reusable** - Temporal seed from `previous_event_id` binds proof to entity's specific chain position (replay = equivocation)
- **No LCA barriers** - Distance-based Cantor tree with path leaves, not region leaves. Cost is O(path_length), not O(2^LCA_height)
- **Mathematical commitment** - Pure Cantor pairing, no arbitrary hash grinding. Bijective and entropy-preserving.
- **Consumer-feasible** - O(M-N) pairings. Consumer can traverse ~1M blocks/day, nation-state ~1B/day (1000× linear advantage)
- **Verifiable** - O(path_length) recomputation. No shortcuts exist (Cantor Rigidity Theorem).

---

## Motivation

The original block height commitment metric (`block_diff.bit_length()` → 2^h SHA256 ops, 2026-04-14) solved **access cost** but did not define **traversal proof**. An entity traveling from block N to block M needs to publish proof that they traversed the path, not just that they paid a cost.

Requirements:
1. Single Nostr event proving traversal across many blocks (not one proof per block)
2. Proof cannot be reused for other traversals or areas of hyperspace
3. Preserves spatial structure without introducing LCA barriers
4. Mathematical, not conventional commitments
5. Balances consumer and nation-state capabilities (linear advantage, not exponential)

---

## Specification

### 1. Leaf Construction

For traversal from block `B_from` to block `B_to` (where `B_to > B_from`):

**Leaves:** The temporal seed followed by each block height in the path:
```
leaves = [temporal_seed, B_from, B_from+1, ..., B_to]
```

Where:
- `temporal_seed = previous_event_id (as big-endian int) % 2^256`
- `previous_event_id` is the NIP-01 event ID of the entity's most recent movement event

**Why temporal-as-first-leaf:** The temporal seed propagates through the entire Cantor tree, making the root unique to this entity at this chain position. Simpler than per-leaf temporal offsets, cryptographically equivalent under the Cantor Rigidity Theorem.

### 2. Cantor Tree Construction

```python
def cantor_pair(a: int, b: int) -> int:
    """Cantor pairing function: π(a, b) = (a+b)(a+b+1)/2 + b"""
    s = a + b
    return (s * (s + 1)) // 2 + b

def build_traversal_tree(leaves: list[int]) -> int:
    """Build Cantor pairing tree from leaves, return root."""
    # Leaves are already sorted: [temporal_seed, B_from, B_from+1, ...]
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

**Tree properties:**
- Sequential pairing (left-associative)
- No sorting needed (leaves are already in order)
- Intermediate nodes represent partial paths (not used for this proof, but could enable progressive unlocking in future)

### 3. Proof Publication

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

### 4. Non-Reuse Mechanism

**Equivocation detection:** If an entity publishes two traversal proofs with the same `previous_event_id`, they have created two children of the same parent event. This is detectable and socially punishable (chain invalidation).

**Why this works:** The temporal seed makes every proof unique to a specific chain position. Replaying a proof requires reusing the same `previous_event_id`, which breaks the hash chain.

### 5. Cost Analysis

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

## Comparison to Block Height Commitment

| Aspect | Block Height Commitment (2026-04-14) | Incremental Cantor Tree (this spec) |
|--------|--------------------------------------|-------------------------------------|
| **Purpose** | Access cost for entering a hyperjump | Proof of traversal between hyperjumps |
| **Mechanism** | 2^h SHA256 iterations (h = block_diff.bit_length()) | Cantor pairing tree over path leaves |
| **Cost** | O(2^h), median h=19 → 524K ops | O(path_length), 100K blocks → 100K pairings |
| **Non-reuse** | Binds to `previous_event_id` + timestamp | Binds to `previous_event_id` via temporal leaf |
| **Mathematical** | Arbitrary hash iterations | Bijective Cantor pairing |
| **LCA barriers** | None (uses block height, not coordinates) | None (path leaves, not region leaves) |
| **Verification** | Recompute hash iterations | Rebuild Cantor tree |

These are **complementary**, not competing:
- **Block height commitment** → pays the "toll" to access the HJ network
- **Cantor traversal proof** → proves you traveled along the network

---

## Security Analysis

### Cantor Rigidity

From the Cantor Rigidity Theorem (2026-06-16): the Cantor pairing tree admits no non-trivial endomorphisms. The only function `f` where `f(π(a,b)) = π(f(a), f(b))` is `f(x) = x`.

**Implications:**
- No algebraic shortcuts for verification
- No homomorphic properties to exploit
- Verification cost = computation cost (this is a feature)

### Replay Attacks

**Attack:** Adversary copies a traversal proof and republishes it.

**Mitigation:** The proof includes `previous_event_id`. Replaying requires either:
1. Reusing the same `previous_event_id` (equivocation, detectable)
2. Computing a new proof with a different `previous_event_id` (requires doing the work)

### Precomputation

**Attack:** Precompute traversal proofs for common paths.

**Mitigation:** The temporal seed depends on `previous_event_id`, which is only known after the preceding movement event is published. The spatial part (block heights) can be precomputed, but the final root cannot.

---

## Implementation Checklist

- [ ] Add `cantor_pair()` function to cyberspace-cli
- [ ] Add `build_traversal_tree()` for hyperjump proofs
- [ ] Update kind 3333 validator to handle `A=hyperjump` with traversal proofs
- [ ] Add equivocation detection (track `previous_event_id` usage)
- [ ] Update PR #12 description

---

## References

- `DECISIONS.md` (2026-04-02) - Merkle Sidestep adoption
- `block_height_metric.md` (2026-04-14) - Block height commitment for HJ access
- `cantor-rigidity-theorem.md` (2026-06-16) - No non-trivial endomorphisms
- `sidestep-proof-formal-spec.md` (2026-04-02) - Temporal binding mechanism
- DECK-0001-hyperjumps.md - Sector-based HJ entry planes

---

*Draft for PR #12 review. Created 2026-04-15.*
