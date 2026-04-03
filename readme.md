# Cyberspace Protocol

## What Is Cyberspace?

Cyberspace is a **thermodynamic spatial protocol** — a specification for imposing locality on a digital system using irreversible computational work.

Every digital system that calls itself a "space" today is owned by someone. Every virtual world, social platform, and VR environment has an administrator who can move you, delete you, change the rules, or shut the whole thing down. Your "presence" exists only because someone permits it.

Physical space doesn't work that way. It imposes costs — thermodynamic costs, paid in energy — that nobody can cheat. Not governments, not corporations, not anyone. That fairness comes from physics, not from agreement.

Cyberspace brings that same constraint into a digital coordinate system. Movement requires computing mathematical structures called **Cantor pairing trees**, whose cost scales with the distance crossed. The work isn't arbitrary hash grinding — it's the computation of the actual mathematical fabric between coordinates. The proof of your movement IS the mathematics of the region you crossed.

The result is digital space with the structural integrity of physical space, enforced by mathematics rather than by any authority. It can be used for:

- **AI embodiment and single-presence restriction** — constrain a digital entity to one verifiable location at a time
- **Trustlessly restricting data access by location** — hide information so that only those who do the work to be "there" can find it
- **Open and interoperable augmented reality layers** — a cryptographic overlay on the physical world, owned by nobody
- **And whatever else you imagine** — Cyberspace is infrastructure, not an application

## A Protocol, Not a Platform

Cyberspace is not an app, not a game, not a company, and not a virtual reality experience. It is a **protocol** — like TCP/IP defines how computers talk, and Bitcoin defines how digital scarcity works, Cyberspace defines how digital space works.

Platforms have owners. Protocols have participants. Nobody can alter mathematics to suit their agenda. Nobody can shut down the number line.

Cyberspace is built on **Nostr**, which is itself a permissionless protocol for publishing and relaying signed events using cryptographic keypairs. If you have a keypair, you can participate. No signup, no approval, no terms of service. The state of Cyberspace is the sum of all cyberspace-related Nostr events published to relays. It requires no new network infrastructure.

## How It Works (In Brief)

**Your identity is your location.** Your Nostr public key — the 256-bit number that IS your identity — is also your spawn coordinate. When you first enter Cyberspace, you appear at the point defined by your key.

**Movement costs structured work.** Moving from one coordinate to another requires computing a Cantor pairing tree whose size scales with the distance. Small moves are cheap (milliseconds). Large moves are expensive (minutes, hours, or more). The work is mathematical, not arbitrary.

**Every hop costs fresh work.** A temporal axis derived from chain context prevents cached or replayed proofs. You can't teleport over ground you've walked before without paying again.

**Natural barriers emerge.** The Cantor tree's intermediate values grow exponentially in storage requirements, creating walls that can't be crossed by direct computation. A second movement primitive — the **sidestep** — uses Merkle hash trees to cross these walls at ~100× the cost, trading storage for time. Together, hops and sidesteps create natural "continents" in the coordinate space.

**Location-based encryption.** Region keys derive from Cantor roots, enabling content that can only be decrypted by someone who does the work to compute the region. Like chalk on a sidewalk — you can only read it by being there. Observers and travelers pay the same cost.

## Key Properties

Five properties that no other digital spatial system provides:

1. **Locality without trusted parties** — distance costs computation, enforced by math, not authority
2. **Hierarchical spatial encryption** — region keys derive from the mathematical fabric itself
3. **Work equivalence** — observing and traveling cost the same; no free surveillance
4. **Deterministic regions** — the same region always produces the same identifier, no coordination needed
5. **Decomposition invariance** — you can't cheat distance by taking small steps; at least one step costs as much as the direct move

## What Cyberspace Does NOT Provide

Honest limitations:

- **Physical location proof:** Cryptographic presence does not prove a body is at a GPS coordinate.
- **Privacy by default:** Movement events are public unless you layer privacy mechanisms.
- **Sybil resistance:** One person can control multiple keypairs. Nostr-based web-of-trust can make reputation a factor.
- **Traversal necessity for decryption:** Region preimages can be computed directly without a movement chain; traversal provides **verifiable** movement history, not exclusive access.

## Protocol Versions

### Cyberspace v2 (current)
- **Specification:** [`CYBERSPACE_V2.md`](https://github.com/arkin0x/cyberspace/blob/master/CYBERSPACE_V2.md)
- **Design rationale (non-normative):** [`RATIONALE.md`](https://github.com/arkin0x/cyberspace/blob/master/RATIONALE.md)
- **Reference implementation:** [cyberspace-cli](https://github.com/arkin0x/cyberspace-cli) (Python)

### Cyberspace v1 (DEPRECATED)
Cyberspace v1 drafts are deprecated and archived. They are not a valid basis for new implementations.
- Archived snapshot: `archive/v1/readme.md`

## Documentation

- `CYBERSPACE_V2.md` — protocol specification (normative)
- `decks/` — protocol extensions: Design Extension and Compatibility Kits (DECKs)
- `RATIONALE.md` — design decisions, limitations, and philosophical foundation (non-normative)
- [cyberspace-cli](https://github.com/arkin0x/cyberspace-cli) — reference implementation and CLI docs

## Nostr Integration

Cyberspace events conform to NIP-01:
- **Action events** (spawn, hop, sidestep): `kind: 3333`
- **Location-encrypted content events**: `kind: 33330`
- **DECKs** define additional event kinds and structures

Being built on a decentralized, permissionless system, knowledge of global state is not possible — just as in physical reality.

## Getting Started

The reference CLI is evolving; follow its repo for installation and usage:
- https://github.com/arkin0x/cyberspace-cli

A minimal local-only flow (example):
```bash
cyberspace spawn
cyberspace whereami
cyberspace move --by 100,0,0
cyberspace history
cyberspace chain status
```

Other useful utilities:
```bash
cyberspace sector
cyberspace gps 37.7749,-122.4194
cyberspace cantor --from-xyz 0,0,0 --to-xyz 3,2,1
```

## Status

The v2 spec is intended to be implementable. Implementations are in progress.

## Contributing

Contributions are welcome: protocol critique, alternative implementations, test vectors, DECKs, and clarity improvements.

## License

See `LICENSE` (CC BY-SA 4.0).
