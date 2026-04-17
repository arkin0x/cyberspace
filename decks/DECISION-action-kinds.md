# Cyberspace Protocol Decisions - Action Kind Numbers

## CRITICAL RULE: All Actions Are Kind 3333

**Decision Date:** 2026-04-02 (sidestep spec)
**Authority:** sidestep-proof-formal-spec.md §8.1
**Status:** LOCKED - Do not violate

### The Rule

**ALL Cyberspace movement actions use kind 3333, differentiated by the `A` tag.**

Never invent new kind numbers for action types. This is not optional. This is the foundational pattern established in the sidestep specification.

### Established Action Types

| A Tag | Purpose | Proof Type | Spec |
|-------|---------|------------|------|
| `spawn` | Initial entry to cyberspace | Fixed claim | CYBERSPACE_V2.md |
| `hop` | Local movement (within sector) | Cantor pairing tree | CYBERSPACE_V2.md |
| `sidestep` | LCA boundary crossing (storage-infeasible) | Merkle hash tree | sidestep-proof-formal-spec.md |
| `enter` | Hyperjump plane entry | Cantor proof (h≈33) | DECK-0001-hyperjumps.md |
| `hyperjump` | Inter-hyperjump traversal | Cantor tree over path | hyperjump-traversal-proof.md |

### Why This Pattern Exists

1. **Consistency** - All movement is the same event type, validated by the same relays
2. **Simplicity** - One kind number, action type in tags
3. **Extensibility** - New actions don't require new kind numbers or NIPs
4. **Established precedent** - Sidestep (kind 3333, A=sidestep) set this pattern

### Anti-Pattern: What NOT to Do

❌ **DON'T create kind 33340 for hyperjump_entry**
❌ **DON'T create kind 33334 for enter**
❌ **DON'T create any new kind number for actions**

✅ **DO use kind 3333 with appropriate A tag**

### Historical Context

The sidestep specification (2026-04-02) established this pattern:
```json
{
  "kind": 3333,
  "tags": [["A", "sidestep"], ...]
}
```

All subsequent action types MUST follow this pattern. Any spec that violates this is incorrect and must be fixed.

### Enforcement

If you see any of the following in specs or code:
- `kind: 33340`
- `kind=33334`
- Any kind number other than 3333 for Cyberspace actions

**Flag it as an error.** This is a protocol violation.

---

*This decision is locked. Do not revisit without explicit Arkinox approval.*

*Created: 2026-04-15*
*Authority: sidestep-proof-formal-spec.md §8.1, DECK-0001-hyperjumps.md*
