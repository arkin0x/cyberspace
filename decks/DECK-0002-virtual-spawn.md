# DECK-0002: Virtual Spawn

DECK: 0002
Title: Virtual Spawn: games played inside a virtual bracket
Status: Draft
Created: 2026-04-21
Last updated: 2026-09-28
Requires: `CYBERSPACE_V2.md`, chain rules revision `2026-09-28-virtual-brackets` (§8.11, §8.12)

This DECK is a game mechanic (`decks/README.md`, Game mechanics). It never changes whether a movement chain is valid under the base protocol, and it requires nothing of clients that do not run a game.

## Abstract

A **game** is a set of rules for play inside one region of cyberspace, published by its author as a **game event** (`kind 33332`). The game event says where the game is played, which actions its players may publish, and where a player may appear when entering. An identity plays a game by opening a **virtual bracket** on its own movement chain (`CYBERSPACE_V2.md` §8.11): an `enter-virtual` action naming the game, the game's own actions, and an `exit-virtual` action that puts the identity back where it entered. The bracket is base protocol; this DECK defines the game event, what the entry commits to, and what a game client checks.

## 1. What changed from the first draft (non-normative)

The first draft of this DECK (PR #15, April 2026) made a virtual spawn a new genesis event whose `C` tag was not the identity's pubkey. The chain was invalid under the base protocol from that event, so the identity had to respawn and start over to come back from a game, losing the travel it had done. It is replaced. An identity has one chain and one position, and a game is now played inside a bracket on that chain, which is protocol-valid, keeps every hop and ride the identity made, and ends with the identity back at the position it entered from.

The bracket actions are named `enter-virtual` and `exit-virtual`, without the word "spawn". Clients find the start of an identity's chain by its newest `spawn` action (`CYBERSPACE_V2.md` §3.2, §8.7.3), and an entry action named after a spawn would invite a client to restart the chain there and lose the history before it.

## 2. The game event (normative)

- Game events: `kind = 33332`
- `kind 33332` is addressable: relays keep the newest event per `(pubkey, kind, d)`

Required tags:
- `d` tag: `["d", "<lookup_id_hex>"]`: the `lookup_id` (`CYBERSPACE_V2.md` §7.2) of the region the game is played in, the region named by the `region` tag
- `region` tag: `["region", "<coord_hex>", "<H>"]`: the aligned cube the game is played in, in the form of `CYBERSPACE_V2.md` §8.11.1
- `name` tag: `["name", "<name>"]`: what players call the game
- `action` tags: `["action", "<action_name>", "<description>"]`: one tag for each action a player may publish inside the game's bracket, at least one
  - `action_name` MUST NOT be a base or DECK-0001 action name: `spawn`, `hop`, `sidestep`, `enter-hyperspace`, `hyperjump`, `enter-virtual` or `exit-virtual`
  - `action_name` MUST be lowercase letters, digits and `-`, at most 32 characters, so it is safe in an `A` tag and readable in any client
  - `description` is plain text for players; it MAY be empty

Optional tags:
- `spawn` tags: `["spawn", "<coord_hex>"]`: the points where a player may appear when entering the game (its **spawn policy**). Each MUST lie inside the region. When a game carries no `spawn` tag, a player may enter at any point inside the region.

Content: the game's rules for players, as plain text or Markdown. It MAY be empty. The protocol does not interpret it.

**Why the address is the region's lookup id:** The game event's address, `33332:<author>:<lookup_id>`, names where the game is, so a client scanning a region (`CYBERSPACE_V2.md` §7.4) finds the games in it with the same lookup it uses for bags. It also means each author can publish exactly one game per region, and that publishing a game costs the author the region-key work of that region: computing a `lookup_id` requires the region's Cantor root. Games are therefore placed in regions whose key their author can compute.

**Checking the address (normative):** A reader that can compute the region's key SHOULD check that the `d` tag is that region's `lookup_id`, and MUST treat a game event whose `d` tag does not match as not a game. A reader that cannot compute the key MAY trust the `region` tag without checking it.

**Games inside a bag (optional):** A game MAY also be published as an item inside a bag (`CYBERSPACE_V2.md` §7.6) hidden in the game's region. An open game is an invitation that anyone can read. A bagged game is readable only by someone who has done the region-key work, which backs the game with that work and keeps it for players who found it. Players of a bagged game still enter it by address, so the bag is a way to find the game, not a requirement to play it.

## 3. Entering a game (normative)

An identity enters a game with an `enter-virtual` action (`CYBERSPACE_V2.md` §8.11.1) whose tags commit to one version of the game:
- the `game` tag names the game event's address, `33332:<author>:<d>`, and the id of the version the identity agrees to play;
- the `region` tag MUST equal the game event's `region` tag;
- the `C` tag MUST be one of the game's `spawn` points when it has any, and otherwise any point inside the region.

**Why the version is pinned:** An addressable event can be replaced by its author at any time. Without the event id in the `game` tag, an author could change the rules after players had committed to them, and every chain that played the game would read differently than it did when it was written. With the event id, the chain says exactly which rules the identity agreed to, and a later edit of the game is visibly a different version. The address is kept alongside the id so clients can find the game, and its newest version, from the entry alone.

A game client that cannot fetch the pinned version MUST NOT score the bracket; it MAY draw it (§6).

## 4. Playing (normative for game clients)

A game client reads the virtual actions between an `enter-virtual` action naming its game and the `exit-virtual` action that closes it:
- A virtual action whose name the pinned version declares is a move in the game. What it means is the game's business, and a game MAY require tags of its own on it.
- A virtual action whose name the pinned version does not declare is ignored: it has no effect in the game, and it does not end the chain or make it invalid (`CYBERSPACE_V2.md` §8.11.4, rule 5).
- Whether a player is still in play, what they hold and whether they have won is the game's **liveness**, which the game owns and the base protocol never consults (`decks/README.md`, Game mechanics). A game MUST NOT decide any verdict by `created_at`.

## 5. Leaving (normative)

An `exit-virtual` action is always valid under the base protocol, so a player can leave a game at any moment, including in the middle of losing it. The protocol will not hold anyone in a game. A game whose outcomes carry stakes MUST say in its rules what an exit means, for example that an exit while contested counts as a loss.

## 6. Drawing a bracket (recommended)

- Clients SHOULD draw an identity's positions inside a bracket differently from its positions in cyberspace, so a viewer never mistakes play inside a game for travel.
- Clients SHOULD draw the bracket's region while the identity is inside it.
- Clients SHOULD label a bracket with the game's `name` when they have fetched the pinned version, and MAY draw a bracket they cannot fetch as an unnamed box.

## 7. Example (non-normative)

A game event. The `d` tag is the region's `lookup_id`, and the region is a cube of height 20 on the dataspace plane:

```json
{
  "kind": 33332,
  "content": "Tag. Whoever is IT tags another player by moving onto their position.",
  "tags": [
    ["d", "<lookup_id_of_the_region>"],
    ["region", "<aligned_base_coord_hex>", "20"],
    ["name", "Tag"],
    ["action", "move", "Move one step on any axis."],
    ["action", "tag", "Tag the player at your position; you are no longer IT."]
  ],
  "pubkey": "<game_author_pubkey>"
}
```

An identity enters it from the position it holds in cyberspace:

```json
{
  "kind": 3333,
  "content": "",
  "tags": [
    ["A", "enter-virtual"],
    ["e", "<spawn_event_id>", "", "genesis"],
    ["e", "<previous_event_id>", "", "previous"],
    ["c", "<base_position_coord_hex>"],
    ["C", "<entry_point_inside_the_region>"],
    ["region", "<aligned_base_coord_hex>", "20"],
    ["game", "33332:<game_author_pubkey>:<lookup_id_of_the_region>", "<game_event_id>", "wss://cyberspace.nostr1.com"],
    ["X", "..."], ["Y", "..."], ["Z", "..."], ["S", "..."]
  ]
}
```

It plays with virtual actions named after the game's actions (`["A", "move"]`, `["A", "tag"]`), each with the `e`, `c`, `C` and sector tags of `CYBERSPACE_V2.md` §8.11.2. It leaves with an `exit-virtual` action whose `e` entry tag names the entry, and whose `C` is `<base_position_coord_hex>` again.

## 8. Open questions

1. **A cost to claim a region for a game.** Omitted for now (arkinox, 2026-09-28). The address already costs the author the region-key work, and a bagged game (§2) is backed by it for players too.
2. **Meetings inside a game.** Whether a game can use the encounter primitive (`docs/territory-conflict-game-layer.md`) between players inside one bracket, or declares its own meeting actions.
