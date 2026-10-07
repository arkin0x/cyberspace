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
- DECK-0002: reserved for the **Games DECK**, not yet written. It will define recommended primitive game actions and their shapes, control definitions (onscreen controls, key bindings), and all other game matters for games played inside a virtual bracket (`../CYBERSPACE_V2.md` §8.11), which the base protocol treats as opaque. It will repeat, for game designers, the action names that rule 3 of `../CYBERSPACE_V2.md` §8.11.4 reserves. Reserved on 2026-10-07. The number previously held the Virtual Spawn draft, which was removed on 2026-10-02 before it was ratified: games are played inside a virtual bracket, which is base protocol, and a game is identified by its pubkey rather than by an event.
- `DECK-0003-sno.md`: SNO (Simple Nostr Objects), the small 3D object format. Defines `kind 33331`, a standalone editable object; `kind 3330` bag items and `kind 11333` avatars carry the same payload. Beside it: `sno-reference.py`, a conformance implementation that runs its own rejection table; `sno-palette.json` and `sno-palette.mjs`, the built-in 256-colour palette and the generator that produces it; `sno-palette.png`, the sheet

## Reserved kinds
- `kind 33332`: public shards, shards published in the open rather than hidden in a bag. Reserved, not yet specified. (The archived v1 spec used 33332 for v1 shards; those events carry v1 tags and are not this.)
