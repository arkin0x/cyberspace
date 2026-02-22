# Cyberspace Specification

This repository contains the canonical Cyberspace protocol specifications intended to be implemented by independent clients.

## Philosophy (non-normative)
Cyberspace is an attempt to impose **locality** and **distance** on a shared cryptographic space by making movement require meaningful computation.

Key ideas:
- **Movement is work:** you shouldn’t be able to cheaply claim you are “somewhere else”.
- **Regions are first-class:** Cantor-tree roots intentionally represent *regions* (discovery radii), not unique coordinate pairs.
- **Discovery requires presence:** location-based content can be addressed so that only entities who compute the region preimage (i.e., who have “been there” computationally) can derive the decryption key.
- **Simulation ≈ observation:** scanning for nearby content should cost comparable work to traveling through those regions.

A useful metaphor is “chalk on the sidewalk”: you can only read a message by arriving close enough to it; the "key" is derived from the region you occupy.

For a longer discussion, see the appendix in `CYBERSPACE_V2.md`.

## Protocol Versions

### Cyberspace v2 (current)
- Canonical spec: `CYBERSPACE_V2.md`
- Reference implementation: https://github.com/arkin0x/cyberspace-cli

Cyberspace v2 specifies:
- The 256-bit coordinate system (X/Y/Z u85 + plane bit)
- Canonical (deterministic) GPS→dataspace mapping (plane=0)
- Per-axis Cantor-tree movement proofs and movement-chain events
- Location-based encryption/discovery primitives derived from Cantor region numbers

### Cyberspace v1 (DEPRECATED)
Cyberspace v1 drafts are deprecated and archived. They are not a valid basis for new implementations.

- Archived snapshot: `archive/v1/readme.md`

## Scope
Only v2 is in scope for the active spec.

Older v1-era material (including constructs/shards notes and drift/combat mechanics) has been moved to `archive/v1/` and should be treated as historical context only.

## License
See `LICENSE`.
