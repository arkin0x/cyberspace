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
- `docs/agents.md` is the guide for AI agents that get a body in cyberspace through [cyberspace-mcp](https://github.com/arkin0x/cyberspace-mcp): the rules with no undo, one key one mover, how an agent meets a human, and the profile convention (non-normative).
- [cyberspace-cli](https://github.com/arkin0x/cyberspace-cli) is the reference implementation with CLI docs.

## Test vectors

The vector files sit at the root of this repository, and `CYBERSPACE_V2.md` §14 lists them all. The golden vectors of the chain rules, `chain-rules-<revision>.json`, are normative (§8.12); their format is described in `vectors/README.md` of cyberspace-cli.

### Real chains: `chain-rules-2026-10-08-residue-openings-real.json`

**What it is.** Twelve real movement chains (439 events), read from `wss://cyberspace.nostr1.com` on 2026-11-04, each with its verdict under chain rules revision `2026-10-08-residue-openings`: 9 valid, and 3 invalid at index 2 with reason `sidestep-proof` (a version 1 sidestep on no list, §6.15). Every event is a complete NIP-01 event, exactly as its author signed and published it, never re-signed or altered. The file has the format of `chain-rules-2026-10-08-residue-openings.json`, except that each vector names its own `identity`, and there is no `line` and no test list.

**How it was built.** A read-only fetcher took every kind 3333 event of the twelve identities from the relay; it answers NIP-42 AUTH with a throwaway key that signs nothing else. Each vector keeps every spawn of its identity and every event whose `e genesis` names the newest spawn, which are all the events resolution reads (§8.7.3). A chain that rides is cut before its first ride, because a ride cannot be checked without Bitcoin mainnet's block line. Five vectors are cut this way, and their names end in `-before-first-ride`. The later events are left out, and no event is changed.

**Where the verdicts come from.** The reference implementation, cyberspace-cli at `5103c62` (`cyberspace_core.chain.verify_chain`), run with the real exemption lists of this repository at `9210d6d` (`grandfathered-v1-hops.txt`, `grandfathered-v2-sidesteps.txt`, `decks/grandfathered-v1-hyperjumps.txt`) and no block line.

**How to run it.** Unlike the normative file, a verifier runs these vectors with the real exemption lists and no block line, and resolves each chain for the vector's `identity`. No Bitcoin data is needed.

**Every implementation agrees on every entry.** cyberspace-relay, ONOSENDAI, cyberspace-cli and cyberspace-mcp all test against this one file. Each runs every vector in full and reaches every vector's `expected`. A disagreement is a bug, in the implementation or in the reference. It gets reported and fixed, never skipped. The file is not normative: where a verdict disagrees with `CYBERSPACE_V2.md`, the text is right, and the file is regenerated.

**How to regenerate it.** The tools are in [cyberspace-relay](https://github.com/arkin0x/cyberspace-relay), in `server/regiongate/testdata/tools/`. A new read is a new snapshot, since the relay may hold newer events. Before you run it, update the read date and the reference commit that `build-real-vectors.py` writes into each vector's `source` and into the file's `description`.

```bash
# read only: every kind 3333 event of each identity in the file (needs nostr-tools)
node fetch-chains.mjs wss://cyberspace.nostr1.com chains.jsonl <identity>...
# the reference at the commit the file names (needs coincurve)
mkdir cli && git -C cyberspace-cli archive 5103c62 src | tar -x -C cli
python -I build-real-vectors.py cli/src chains.jsonl chain-rules-2026-10-08-residue-openings-real.json
# check that the reference reaches every verdict
python -I reference-verdicts.py cli/src chain-rules-2026-10-08-residue-openings-real.json --real-lists
```

Copy the result here unchanged, and into every implementation's tests unchanged.

### Region strings: `region-prefix-vectors.json`

**What it is.** 64 region strings, as a link or a relay path carries them: `www.onosendai.tech/C/<hex>` in ONOSENDAI and `relay.onosendai.tech/<hex>` for a speakeasy, which name exactly the same region (speakeasy ruling D7, 2026-11-04). 43 are valid, and each of those has its region and points inside and outside it; 21 are invalid. The file's own `format` field describes every entry.

**What a region string is.** After one percent-decode, trimming whitespace, dropping trailing slashes and one leading `0x`, and lowercasing, it is 1 to 64 hex characters. n characters fix the top 4n bits of a coordinate, so under the bit layout of §2.2 (x84 y84 z84 x83 ... z0, then the plane bit) the region is every coordinate whose 64-hex form starts with them. That is an aligned box in the hint form of §7.7, one height per axis, and a cube only when n is a multiple of 3. A prefix of 1 to 63 characters never fixes the plane bit, the lowest, so its box is the same in both planes; 64 characters name one gibson in its own plane. `CYBERSPACE_V2.md` defines the bit layout and the hint box, but not the string, so this file follows ONOSENDAI's route.

**How it was built.** From ONOSENDAI's own route code, `src/lib/coordRoute.ts` at origin/v2 `366e9df` (`parseCoordRoute`, `prefixRegion`, `coordPlace`, `placeHex`, over cyberspace-core `5587818`), by `onosendai-region-vectors.ts` in [cyberspace-relay](https://github.com/arkin0x/cyberspace-relay) `server/regiongate/testdata/tools/`. Each box was also checked against the §2.3 pseudocode alone: its min and max per axis are `coord_to_xyz` of the hex padded with `0` and with `f`.

**Every implementation agrees on every entry.** ONOSENDAI and cyberspace-relay test against this one file, byte for byte. Like the other vectors here it is not normative: where it disagrees with `CYBERSPACE_V2.md`, the text is right and the file is regenerated. To regenerate it, follow the comment at the top of the tool, then copy the result here unchanged, and into every implementation's tests unchanged.

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

**Interactive movement visualization:**
```bash
cyberspace move viz
```
Launch a terminal TUI for planning movements. Navigate with arrow keys or `a`/`d`, switch axes with `x`/`y`/`z`, use `:` to jump to an offset, and press Enter to execute. The visualization shows adjacent coordinates, LCA heights, terrain difficulty (K), and estimated compute time.

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
