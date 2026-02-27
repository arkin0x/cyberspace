# Cyberspace Protocol
A 256-bit coordinate system enabling distance traversal and trustless location-based encryption through proof-of-work.

## Protocol Versions
### Cyberspace v2 (current)
- Spec: `CYBERSPACE_V2.md` https://github.com/arkin0x/cyberspace/blob/master/CYBERSPACE_V2.md
- Design rationale (non-normative): `RATIONALE.md` https://github.com/arkin0x/cyberspace/blob/master/RATIONALE.md
- Reference implementation: https://github.com/arkin0x/cyberspace-cli

### Cyberspace v1 (DEPRECATED)
Cyberspace v1 drafts are deprecated and archived. They are not a valid basis for new implementations.
- Archived snapshot: `archive/v1/readme.md`

## What Is Cyberspace?
Cyberspace is a **thermodynamic spatial protocol** that imposes locality on a digital system. The coordinate system maps to reality providing a substrate for single-presence AI embodiment and location-based access controls.

Unlike proof-of-location systems that rely on trusted witnesses, hardware attestation, or centralized infrastructure, Cyberspace derives spatial presence from pure computational work via Cantor pairing tree traversal.

Key properties:
- **Schnorr keypairs navigate** by publishing signed movement events (Nostr events).
- **Public key = spawn coordinate:** your identity is where you begin in cyberspace.
- **Verifiable presence:** hash chains of movement events prove where you’ve been in the coordinate system and force a single keypair to commit to a single location.
- **Every hop costs work:** hop proofs include a temporal Cantor traversal derived from the previous movement event id (`TEMPORAL_HEIGHT = 13`), preventing cached/replayed hop proofs.
- **Movement requires work:** computing Cantor numbers that represent the mathematical structure between coordinates is the fundamental movement operation.
- **Location-based encryption:** keys derive from stable spatial Cantor region numbers, not trust.

## What Can You Build?
Examples (non-normative):
- **Location-gated content:** "chalk on the sidewalk" secrets discoverable only by entities who compute a region preimage.
- **Verifiable presence:** require a valid movement chain before granting capabilities.
- **Territory claims:** demonstrate sustained engagement with a region over time (auditable history).
- **AI embodiment constraints:** constrain an agent to one verifiable location at a time (per keypair).
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
- `RATIONALE.md` — design decisions, limitations, and philosophical foundation (non-normative).
- https://github.com/arkin0x/cyberspace-cli — reference implementation and CLI docs.

## Protocol Integration (Nostr)
Cyberspace uses **Nostr** as its transmission layer:
- Movement events are standard Nostr events (`kind: 3333`).
- Location-encrypted content uses `kind: 33334`.
- Events are NIP-01 serialized and Schnorr-signed.

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
Contributions are welcome: protocol critique, alternative implementations, test vectors, and clarity improvements.

## License
See `LICENSE` (CC BY-SA 4.0).
