# Cyberspace Protocol

## What Is Cyberspace?

Cyberspace is a **thermodynamic spatial protocol**: a specification for imposing locality on a digital system using irreversible computational work.

Every digital system that calls itself a "space" today is owned by someone. Every virtual world, social platform, and VR environment has an administrator who can move you, delete you, change the rules, or shut the whole thing down. Your "presence" exists only because someone permits it.

Physical space doesn't work that way. It imposes costs, thermodynamic costs paid in energy, that nobody can cheat. Not governments, not corporations, not anyone. That fairness comes from physics, not from agreement.

Cyberspace brings that same constraint into a digital coordinate system. Movement requires computing mathematical structures called **Cantor pairing trees**, whose cost scales with the distance crossed. The work isn't arbitrary hash grinding. It's the computation of the actual mathematical fabric between coordinates. The proof of your movement IS the mathematics of the region you crossed.

The result is digital space with the structural integrity of physical space, enforced by mathematics rather than by any authority.

**What can you build on it?**

- Constrain a digital entity to one verifiable location at a time (AI embodiment, single-presence restriction)
- Hide information so that only those who do the work to be "there" can find it (trustless location-gated data access)
- Build a cryptographic overlay on the physical world, owned by nobody (open, interoperable augmented reality layers)
- Whatever else you imagine. Cyberspace is infrastructure, not an application.

## A Protocol, Not a Platform

Cyberspace is not an app, not a game, not a company, and not a virtual reality experience. It is a **protocol**. Like TCP/IP defines how computers talk, and Bitcoin defines how digital scarcity works, Cyberspace defines how digital space works.

Platforms have owners. Protocols have participants. Nobody can alter mathematics to suit their agenda. Nobody can shut down the number line.

Cyberspace is built on **Nostr**, which is itself a permissionless protocol for publishing and relaying signed events using cryptographic keypairs. If you have a keypair, you can participate. No signup, no approval, no terms of service. The state of Cyberspace is the sum of all cyberspace-related Nostr events published to relays. It requires no new network infrastructure.

## How It Works (In Brief)

**Your identity is your location.** Your Nostr public key, the 256-bit number that IS your identity, is also your spawn coordinate. When you first enter Cyberspace, you appear at the point defined by your key.

**Movement costs structured work.** Moving from one coordinate to another requires computing a Cantor pairing tree whose size scales with the distance. Small moves are cheap (milliseconds). Large moves are expensive (minutes, hours, or more). The work is mathematical, not arbitrary.

**A hash chain provides temporal continuity.** Each movement event references the previous one by its cryptographic hash, forming a linear chain of signed proofs. This chain is your verifiable movement history, and it ensures every hop costs fresh work that can't be cached or replayed.

**Natural barriers emerge.** The Cantor tree's intermediate values grow exponentially in storage requirements, creating walls that can't be crossed by direct computation. A second movement primitive, the **sidestep**, uses Merkle hash trees to cross these walls at roughly 100 times the cost, trading storage for time. Together, hops and sidesteps create natural "continents" in the coordinate space.

**Location-based encryption.** Region keys derive from Cantor roots, enabling content that can only be decrypted by someone who does the work to compute the region. Like chalk on a sidewalk: you can only read it by being there. Observers and travelers pay the same cost.

## Key Properties

Five properties that no other digital spatial system provides:

**1. Locality without trusted parties.** Strong location guarantees can be obtained without trusted hardware, trusted witnesses, or trusted authorities of any kind. The cost of computation scales with distance. This is locality, the fundamental property of space, and it emerges from the math without any authority enforcing it. Nobody decides how much it costs to move. The mathematics decides.

**2. Hierarchical spatial encryption.** You can encrypt something *by a location*, meaning that it can only be found and decrypted by entities who do the computational work to be "in" that region of the coordinate system. The purpose is not secure message transmission between known parties. The purpose is to create locality itself: binding data to a place and to proof-of-work, so that presence is the key. This is the digital equivalent of writing a message in chalk on a sidewalk.

**3. Work equivalence.** In most digital systems, protocol-level observers gain an inherent advantage over those using the protocol through its intended interface. An analogy: in a first-person shooter, someone reading raw network traffic can calculate every player's exact trajectory from the wire data, while everyone else has to aim through the game's visualization. The raw data gives an unfair edge. In Cyberspace, this advantage does not exist. To discover what's in a region, you must compute the region's Cantor root, which is the same work a traveler would do to cross it. Observing the protocol's raw data grants no shortcut. Looking costs the same as walking.

**4. Deterministic regions.** Any two people computing the Cantor root of the same aligned subtree will get the same answer. Regions don't need to be assigned, registered, or coordinated. They exist as mathematical facts. Two entities standing in the same neighborhood will derive the same region identifier without ever communicating. Spatial consensus happens automatically.

**5. Decomposition invariance.** You can't reduce the work of a large movement by dividing it into smaller steps or aggregating it differently. There are no computational shortcuts. Any path between two coordinates will encounter at least one step that costs exactly as much as the direct movement would have. This is the digital equivalent of the triangle inequality: you can't cheat geometry.

## What Cyberspace Does NOT Provide

**Physical location proof.** Computing a Cantor root proves cryptographic presence at a coordinate, but it does not prove that your body is physically at that GPS location. The dataspace plane maps to physical coordinates, but you can "be" there computationally while physically elsewhere. This is inherent to any software-only system.

**Privacy by default.** Movement events are public if published to Nostr relays. Anyone can see where a keypair has been. Privacy requires additional mechanisms layered on top of the base protocol.

**Sybil resistance.** One person can control multiple keypairs, each with its own independent location and movement chain. The single-location constraint applies per-keypair, not per-person. Nostr-based web-of-trust mechanisms can make a keypair's reputation a factor at the application layer.

**Traversal necessity for decryption.** Region preimages can be computed directly without maintaining a movement chain. You don't have to "walk there" to decrypt a location-gated secret. However, the work required is identical either way. What traversal provides is *verifiable* movement history: a chain proving you were on a specific path, at specific times, in a specific order.

## Protocol Versions

### Cyberspace v2 (current)
- **Specification:** [`CYBERSPACE_V2.md`](https://github.com/arkin0x/cyberspace/blob/master/CYBERSPACE_V2.md)
- **Design rationale (non-normative):** [`RATIONALE.md`](https://github.com/arkin0x/cyberspace/blob/master/RATIONALE.md)
- **Reference implementation:** [cyberspace-cli](https://github.com/arkin0x/cyberspace-cli) (Python)

### Cyberspace v1 (DEPRECATED)
Cyberspace v1 drafts are deprecated and archived. They are not a valid basis for new implementations.
- Archived snapshot: `archive/v1/readme.md`

## Documentation

- `CYBERSPACE_V2.md` is the protocol specification (normative).
- `decks/` contains protocol extensions: Design Extension and Compatibility Kits (DECKs).
- `RATIONALE.md` covers design decisions, limitations, and philosophical foundation (non-normative).
- [cyberspace-cli](https://github.com/arkin0x/cyberspace-cli) is the reference implementation with CLI docs.

## Nostr Integration

Cyberspace events conform to NIP-01:
- **Action events** (spawn, hop, sidestep): `kind: 3333`
- **Location-encrypted content events**: `kind: 33330`
- **DECKs** define additional event kinds and structures

Being built on a decentralized, permissionless system, knowledge of global state is not possible. Just as in physical reality.

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
