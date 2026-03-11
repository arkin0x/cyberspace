# Cyberspace Protocol
Cyberspace is a permissionless, thermodynamic spatial protocol that uses math to impose locality on a spaceless digital system. It can be used for:

- AI embodiment and single-presence restriction
- trustlessly restricting data access by location
- open and interoperable augmented reality layers
- and whatever else you imagine!

## Protocol Versions
### Cyberspace v2 (current)
- Spec: (https://github.com/arkin0x/cyberspace/blob/master/CYBERSPACE_V2.md)[CYBERSPACE_V2.md]
- Design rationale (non-normative): `RATIONALE.md` (https://github.com/arkin0x/cyberspace/blob/master/RATIONALE.md)[RATIONALE.md]
- Reference implementation: (https://github.com/arkin0x/cyberspace-cli)[https://github.com/arkin0x/cyberspace-cli]

### Cyberspace v1 (DEPRECATED)
Cyberspace v1 drafts are deprecated and archived. They are not a valid basis for new implementations.
- Archived snapshot: `archive/v1/readme.md`

## What Is Cyberspace?
Cyberspace is a **thermodynamic spatial protocol** that imposes locality on a digital system. The coordinate system maps to reality providing a substrate for single-presence AI embodiment and location-based access controls.

Unlike proof-of-location systems that rely on trusted witnesses, hardware attestation, or centralized infrastructure, Cyberspace derives spatial presence from pure computational work via Cantor pairing tree traversal.

Key properties:
- **Space as a mathematical fabric, movement as computation:** computing Cantor numbers that represent the mathematical structure between coordinates is the fundamental movement operation.
- **Schnorr keypairs prove navigation through space** by publishing signed movement events (Nostr events) containing computation proofs.
- **Public key = spawn coordinate:** your identity is where you begin in cyberspace.
- **Verifiable traversal:** hash chains of movement events prove where you’ve been in the coordinate system and force a single keypair to commit to a single location.
- **Location-based encryption:** keys derive from stable spatial Cantor region numbers, not trust.

## What Can You Build?
Examples (non-normative):
- **Location-gated content:** "chalk on the sidewalk" secrets discoverable only by entities who compute a region preimage.
- **AI embodiment constraints:** constrain an agent to one verifiable location at a time (per keypair).
- **Open Augmented Reality layers:** pull and publish location-based 3D content in realtime for permissionless public consumption, optionally encrypted for a specific audience
- **Ephemeral regional communication:** messages that are local in scope and time.

## What Cyberspace Does NOT Provide
Non-normative limitations:
- **Physical location proof:** cryptographic presence is not proof that a body is at a GPS coordinate.
- **Privacy by default:** movement events are public unless you layer privacy mechanisms.
- **Sybil resistance:** one person can control multiple keypairs. However, nostr-based web-of-trust mechanisms can make a keypair's reputation a factor.
- **Traversal necessity for decryption:** region preimages can be computed directly without maintaining a movement chain; traversal is required for **verifiable** movement history, not for decryption.

See `CYBERSPACE_V2.md` (Threat model section) and `RATIONALE.md`.

## Documentation
- `CYBERSPACE_V2.md` — protocol specification (normative).
- `decks/` — protocol extensions - Design Extension and Compatibility Kits (DECKs).
- `RATIONALE.md` — design decisions, limitations, and philosophical foundation (non-normative).
- https://github.com/arkin0x/cyberspace-cli — reference implementation and CLI docs.

## Protocol Integration (Nostr)
Cyberspace uses **Nostr** as its transmission layer. The state of cyberspace is the sum of cyberspace-related nostr events. Being based on a decentralized permissionless system, knowledge of global state is not possible (just as in reality). Cyberspace events conform to NIP-01.
- Action events (spawn and movement) are `kind: 3333`
- Location-encrypted content events are `kind: 33330`
- DECKs define other event kinds and structures.

This means Cyberspace does not require new network infrastructure; it composes on top of existing relays.

## Getting Started (reference implementation)
The reference CLI is still evolving; follow its repo for installation and usage:
- https://github.com/arkin0x/cyberspace-cli

A minimal local-only flow (example):
```bash
cyberspace spawn
cyberspace whereami
cyberspace move --by 100,0,0
cyberspace history
cyberspace chain status
```

Other useful utilities in the reference CLI:
```bash
cyberspace sector
cyberspace gps 37.7749,-122.4194
cyberspace cantor --from-xyz 0,0,0 --to-xyz 3,2,1
```

Note: additional commands sometimes discussed in design notes (e.g., scanning for encrypted content, publishing helpers, encrypt/decrypt helpers) are **not** part of this spec and may or may not exist in a given implementation.

## Status
The v2 spec is intended to be implementable. Implementations are in progress.

## Contributing
Contributions are welcome: protocol critique, alternative implementations, test vectors, DECKs, and clarity improvements.

## License
See `LICENSE` (CC BY-SA 4.0).
