# DECKs (Design Extension and Compatibility Kits)
This directory contains protocol extensions for Cyberspace.

The base Cyberspace v2 protocol is specified in `../CYBERSPACE_V2.md`.

Extensions are specified as **Design Extension and Compatibility Kits (DECKs)**. A DECK is a self-contained document that defines additional, optional behavior layered on top of the base spec.

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
- Change consensus-critical rules of the base protocol unless it explicitly defines a new base-protocol version.

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
- `Created:` YYYY-MM-DD
- `Last updated:` YYYY-MM-DD
- `Requires:` base spec and (optionally) minimum versions

## Game mechanics
Some DECKs are game rules rather than protocol extensions: they define what a game's clients do with chains, not what the base protocol says about them. The base protocol has exactly one verdict on a chain, **validity**. A game owns a second, **liveness**. The two never consult each other.

| | Game-alive | Game-dead |
|---|---|---|
| **Protocol-valid** | ordinary play | a derezzed avatar: chain valid, the game says respawn |
| **Protocol-invalid** | a virtual spawn: chain invalid, the game recognises it | an ordinary invalid chain (fork, bad proof) |

A game-mechanic DECK MUST, in addition to the rules above:
- never alter the validity of any `kind 3333` chain under the base spec, and never require anything of clients that do not run the game;
- be verifiable from a bounded set of events plus, if it needs a clock, Bitcoin block headers; `created_at` MUST NOT decide any game verdict;
- if it resolves conflict, resolve it by work, with the unit of work stated and the cost of verification bounded;
- specify its effects as a fixed point over the reference graph where events can void one another, and state how verdicts behave under partial views.

The design record for this category, and for why the base protocol defines holding (`CYBERSPACE_V2.md` §7.6) but not domains, is `../docs/territory-conflict-game-layer.md`.

## Registry
- `DECK-0001-hyperspace.md`: Hyperspace, Bitcoin block transit (ports, landfalls, stations, rides)
- `DECK-0002`: reserved for Virtual Spawn (game mechanic; draft in PR #15)
- `DECK-0003`: reserved for the derezz attack (game mechanic; the draft in PR #8 is superseded by the design record and awaits a test-first rewrite)
