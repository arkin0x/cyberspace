# DECKs (Design Extension and Compatibility Kits)
This directory contains protocol extensions for Cyberspace.

The base Cyberspace v2 protocol is specified in `../CYBERSPACE_V2.md`.

Extensions are specified as **Design Extension and Compatibility Kits (DECKs)**. A DECK is a self-contained document that defines additional behavior layered on top of the base spec. Most DECKs are optional. A DECK that defines an action which can change an identity's position is **mandatory**: every verifier implements it, because movement is universal (`../CYBERSPACE_V2.md` §8.9).

## Goals
- Keep `CYBERSPACE_V2.md` focused on the base protocol.
- Allow optional features to be specified, implemented, and discussed independently.
- Provide a stable place to allocate additional Nostr event kinds / tags without bloating the base spec.

## Scope
A DECK MAY:
- Define new Nostr event kinds.
- Define new `A` tag values for movement events (`kind=3333`).
- Define additional validation rules that apply only when the extension is being used.
- Define discovery/indexing conventions for the extension.

A DECK MUST NOT:
- Change consensus-critical rules of the base protocol unless it explicitly defines a new base-protocol version. A mandatory DECK enters the chain rules through a chain rules revision (`../CYBERSPACE_V2.md` §8.12).

## Naming and numbering
DECKs are named:
- `DECK-XXXX-<slug>.md`

Where:
- `XXXX` is a zero-padded decimal integer.
- `<slug>` is a short, lowercase, dash-separated identifier.

## Required header fields
Each DECK MUST include:
- `DECK:` number
- `Title:`
- `Status:` Draft | Proposed | Active | Deprecated
- `Mandatory:` yes | no (yes when any of its actions can change an identity's position)
- `Created:` YYYY-MM-DD
- `Last updated:` YYYY-MM-DD
- `Requires:` base spec and (optionally) minimum versions

## Game mechanics
Some DECKs are game rules rather than protocol extensions: they define what a game's clients do with chains, not what the base protocol says about them. The base protocol has exactly one verdict on a chain, **validity**. A game owns a second, **liveness**. The two never consult each other.

| | Game-alive | Game-dead |
|---|---|---|
| **Protocol-valid** | ordinary play, including play inside a virtual bracket (`../CYBERSPACE_V2.md` §8.11) | a chain the game has ruled out of play, while the protocol still counts it valid |
| **Protocol-invalid** | a chain the protocol rejects that a game still honors; nothing outside that game sees it | an ordinary invalid chain (a bad proof, a base action inside a bracket) |

A game-mechanic DECK MUST, in addition to the rules above:
- never alter the validity of any `kind 3333` chain under the base spec, and never require anything of clients that do not run the game;
- be verifiable from a bounded set of events plus, if it needs a clock, Bitcoin block headers; `created_at` MUST NOT decide any game verdict;
- if it resolves conflict, resolve it by work, with the unit of work stated and the cost of verification bounded;
- specify its effects as a fixed point over the reference graph where events can void one another, and state how verdicts behave under partial views.

The design record for this category, and for why the base protocol defines holding (`CYBERSPACE_V2.md` §7.6) but not domains, is `../docs/territory-conflict-game-layer.md`.

## Registry
- `DECK-0001-hyperspace.md`: Hyperspace, Bitcoin block transit (ports, landfalls, stations, rides). **Mandatory.**
- `DECK-0002-games.md`: Games, **Draft**. How a client enters a game and leaves it (the virtual bracket of `../CYBERSPACE_V2.md` §8.11, with the client's duties), a game's entry point (where a player appears by virtue of entering, marked by an `entry` tag on one item of its world, with no action published for the arrival), how a game writes positions inside the game, two recommended game actions (`teleport` and `move`), where a game's world is (the bags its pubkey seals to its region), that inside the bracket the game defines every action and leaving is the one thing a player can always do, and how rapid game actions go as ephemeral events anchored to the chain (the `anchor` tag, a hash chained over the run). No new kind; two tags, `entry` and `anchor`; a game is its pubkey. It records which parts of a game it leaves to game logic, and why. It repeats, for game designers, the action names that rule 3 of `../CYBERSPACE_V2.md` §8.11.4 reserves. The number was reserved for it on 2026-10-07; it previously held the Virtual Spawn draft, removed on 2026-10-02 before it was ratified.
- `DECK-0003-sno.md`: SNO (Simple Nostr Objects), the small 3D object format. Defines `kind 33331`, a standalone editable object; `kind 3330` bag items and `kind 11333` avatars carry the same payload. Beside it: `sno-reference.py`, a conformance implementation that runs its own rejection table; `sno-palette.json` and `sno-palette.mjs`, the built-in 256-colour palette and the generator that produces it; `sno-palette.png`, the sheet

- `DECK-0004-items-and-chests.md`: Items, Chests and Doors. It defines `kind 3340`, an item: a keypair hidden in a bag, where holding its secret is holding the item. It defines `kind 3341`, a chest: a list of entries sealed with NIP-44 v2 to an item's or a person's public key. It defines a door: a chest with a `door` tag, which locks a room. What a door's author hides in its room goes into a room bag, whose key needs both the place and the door's secret. It defines locks that ask for a region key or a room key, through a public key derived from the key. It defines the look, a SNO object that a chest or a door is drawn as. It defines `kind 33340`, an item listing: an item's name, picture and public key in public, with a proof made by the item's own key, never its secret.
- `DECK-0005-local-chat.md`: Local chat. Defines `kind 23330`, the ephemeral chat envelope (a bag in the ephemeral range, sealed to the speaker's room), and `kind 23333`, the chat line inside it, an unsigned rumor bound to the envelope's signer.
- `DECK-0006-sealed-comments.md`: Sealed comments. NIP-22 `kind 1111` comments on hidden things, with the words encrypted to the bag's region key as an FF-1 derived-key event.
- `DECK-0007-hidden-audio.md`: Hidden audio. Defines `kind 1063` as a bag item, a NIP-94 file event naming an encrypted file on Blossom and carrying its key, written as an unsigned rumor; and how it is heard in space: full inside a sphere about its source, fading to silence at the walls of its region, looping or played once on entering the sphere.
- `DECK-0008-seeds.md`: Seeds, programs that grow in cyberspace. Defines SEEDO, a language of genes and growth rules; `kind 3350`, a DNA, written or mixed from two parents by a later block, which pays NIP-13 work for its declared caps; `kind 3351`, a seed, one planting of a DNA hidden in a bag; and `kind 3352`, a tend, work given to a seed and counted as sunlight in attempts. Every client grows the same bloom from the DNA, the place's terrain and the blocks mined since planting, and draws it as SNO. Beside it: `seeds-reference.mjs`, the reference implementation, and `seeds-vectors.json` with `seeds-vectors.mjs`, its golden vectors and their generator (Node, no dependencies).
- `kinds-vectors.json` and `kinds-vectors.mjs`: deterministic test vectors for DECK-0004, DECK-0005, DECK-0006 and DECK-0007, and for the sealed entries of `../CYBERSPACE_V2.md` §7.6, and the script that produces them (needs `nostr-tools` 2.x).

## Kinds defined by the base spec
These kinds are defined in `../CYBERSPACE_V2.md`, not in a DECK. They are listed here so that no DECK allocates them.
- `kind 3333`: a movement action (§8.1).
- `kind 33330`: a bag (§7.6, §8.6).
- `kind 33335`: a sealed entry, one bag entry carried by reference as its own event, sealed with the bag's key (§7.6, Sealed entries).
- `kind 11333`: an avatar (§8.10).

## Reserved kinds
- `kind 33332`: public shards, shards published in the open rather than hidden in a bag. Reserved, not yet specified. (The archived v1 spec used 33332 for v1 shards; those events carry v1 tags and are not this.)
