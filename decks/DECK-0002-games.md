# DECK-0002: Games

DECK: 0002
Title: Games
Status: Draft
Mandatory: no
Created: 2026-11-10
Last updated: 2026-11-10
Requires: `CYBERSPACE_V2.md` §2.2 (coordinates), §7.2 (region keys), §7.6 (the bag) and §8.11 (virtual brackets); DECK-0003 (SNO) for the objects a world is built from; NIP-01

## Abstract

A **game** in cyberspace is played inside a virtual bracket (`CYBERSPACE_V2.md` §8.11). The player publishes an `enter-virtual` action, which holds their position in cyberspace; everything they do until their `exit-virtual` action belongs to the game; and the exit puts them back exactly where they stood. The base protocol defines the bracket and treats everything inside it as opaque. It says nothing about how a client finds a game's world, how it draws the game, or what a game's actions look like.

This DECK says those things, and as little else as it can. It defines:

- how a client enters a game and leaves it (§2, §7), which is the base protocol's bracket and nothing new, with the client's duties written down;
- how a game writes a position inside the game, when it has positions (§3);
- two recommended game actions, `teleport` and `move`, so that any client can draw a player's path through any game that uses them without knowing that game (§4);
- where a game's world is and how a client reads it: the bags the game's pubkey seals to the game's region (§5);
- that play between two chain actions may stay on the player's device (§6).

It defines no new event kind and no new tag. A game is its pubkey (`CYBERSPACE_V2.md` §8.11.1, arkinox's ruling of 2026-10-02): there is no game event, and no registry of games. Everything else a game does, its rules, its mechanics, its scoring, its controls, is the game's own, and §8 records each part this DECK leaves to games and why.

The first game shaped to this DECK is the tutorial dungeon of ONOSENDAI's first-arrival tutorial (§9): a newcomer enters a game, is teleported through the game into a small dungeon built for it, meets a mechanic cyberspace does not have, and leaves to stand exactly where they entered.

## Terms

- **Game:** a pubkey, named by the `p` tag marked `game` on an `enter-virtual` action (`CYBERSPACE_V2.md` §8.11.1). A game that signs anything signs it with the secret key of that pubkey, the **game key**.
- **Region:** the aligned cube named by the `region` tag of the `enter-virtual` action (`CYBERSPACE_V2.md` §8.11.1).
- **Bracket:** the stretch of the player's chain from their `enter-virtual` action to the `exit-virtual` action that closes it (`CYBERSPACE_V2.md` §8.11).
- **Base position:** where the player stands in cyberspace for the whole bracket: the `c` of their `enter-virtual` action, which its `C` repeats (`CYBERSPACE_V2.md` §8.11.4, rule 1).
- **Game position:** where the player is inside the game, for a game that has positions (§3). It is never a position in cyberspace.
- **Game action:** a virtual action (`CYBERSPACE_V2.md` §8.11.2): any event inside a bracket.
- **World:** what a game draws for its players: the items of the bags its game key seals to its region (§5).
- **In-game mode:** a client's state while its own player is inside a bracket of a game the client implements: it draws the game, and its controls make game actions (§2.3).
- **Implements a game:** knows that game's rules. A client that implements a game can play it; a client that does not can still read every bracket and draw a player held at their base position (`CYBERSPACE_V2.md` §8.11.7).

## 1. Overview (non-normative)

| Step | What the player's client does | Published on the player's chain | Defined in |
|---|---|---|---|
| Enter | Publishes `enter-virtual` naming the game and its region, from where the player stands | `enter-virtual` | `CYBERSPACE_V2.md` §8.11.1; this DECK §2 |
| Arrive | Puts the player at their first game position, as the game's rules say | `teleport` (§4.1), when the game has positions | §3, §4 |
| Draw | Reads the world from the game's bags in the region, and draws it in place of cyberspace | nothing | §5 |
| Play | Moves the player by the game's own rules | the game actions the game wants on the record; the rest stays on the device | §4, §6 |
| Leave | Publishes `exit-virtual`, and returns the player to the view they had when they entered | `exit-virtual` | `CYBERSPACE_V2.md` §8.11.3; this DECK §7 |

Nothing in this DECK changes which chains are valid. A bracket is checked by the base protocol exactly as `CYBERSPACE_V2.md` §8.11.5 says, whether or not anyone implements this DECK or the game.

## 2. Entering a game (normative for clients)

### 2.1 The entry

A client enters a game by publishing an `enter-virtual` action on its player's chain, exactly as `CYBERSPACE_V2.md` §8.11.1 defines it. This DECK adds no tag to it and changes nothing about it. In particular:

- its `c` and `C` are both the player's current position: the `C` of the nearest recognized action before it, taken from the chain itself, plane bit included;
- its `p` tag marked `game` names the game's pubkey, and its relay hint SHOULD name a relay where the game's bags (§5) can be found, or be the empty string;
- its `region` tag names the game's region. A client entering a game it implements uses the region that game's rules give. Two entries into the same game SHOULD name the same region, since the region is where the world is read (§5).

A client MUST confirm that it holds the live head of its player's chain before it signs the entry, as before any action (`CYBERSPACE_V2.md` §8.7.3).

A client MUST NOT enter a game while a bracket is open on its player's chain. An `enter-virtual` action inside a bracket is invalid and makes the chain invalid from it (`CYBERSPACE_V2.md` §8.11.4, rule 3), so brackets never nest, and a second game is entered only after the first is left.

A client SHOULD NOT enter a game from a chain it knows to be invalid, or from an identity that has no chain yet. On an invalid chain the entry counts for nothing; an identity with no chain has no position to hold, and spawns first (`CYBERSPACE_V2.md` §3.2).

### 2.2 Where the player starts inside the game

The `enter-virtual` action does not move the player, and its `C` is the base position, not a place in the game (`CYBERSPACE_V2.md` §8.11.1). A game that has positions puts its player at their first game position with its first game action, a `teleport` (§4.1), signed right after the entry. The game's rules say which position that is.

**Why a `teleport` action and not a tag on the entry (non-normative):** The base protocol allows a game to say where its player starts in a tag of its own on the `enter-virtual` action. This DECK uses an action instead, for three reasons. The entry stays exactly the base event, read by every verifier, with nothing on it that only a game reads. The arrival is the same primitive a game uses for every later jump (a pad, a portal, a restart), so one shape covers all of them. And the arrival has an event id of its own, which a game can name when it needs to say "from the moment this player arrived".

### 2.3 In-game mode

While its player is inside a bracket of a game it implements, a client is in **in-game mode**:

- It SHOULD draw the game's world (§5) and SHOULD hide or dim everything else of cyberspace, so the player sees the game and not the place where they stand.
- It MUST NOT sign any action of the base protocol or of a mandatory DECK: inside a bracket each of them is invalid and makes the chain invalid from it (`CYBERSPACE_V2.md` §8.11.4, rule 3). At this revision these are `hop`, `sidestep`, `enter-hyperspace`, `hyperjump` and `enter-virtual`. Every way the player moves inside the game is a game action (§4) or play kept on the device (§6).
- It SHOULD keep a way to leave on screen at all times (§7).

A client that does not implement the game whose bracket is open on its player's chain (the player entered from another client, for example) is not in in-game mode. It draws the player held at the base position, and it MUST NOT sign base actions either, for the same reason.

## 3. Game positions (normative for games that have positions)

A game position is written as a coordinate in the form of `CYBERSPACE_V2.md` §2.2: 32-byte lowercase hex, the same encoding as any `C` tag. A game that has positions:

- SHOULD keep every game position inside its region. Its world is read from its region (§5) and drawn there, so positions inside the region are in the same frame as the world, at true scale, one gibson to a gibson.
- writes a game position in the `C` tag of a game action, and where the action says where the player came from, in its `c` tag (§4).

A game position is never a position in cyberspace. The base protocol holds the player at the base position for the whole bracket whatever coordinates the game's actions carry (`CYBERSPACE_V2.md` §8.11.4, rules 1 and 4). A client that draws game positions outside in-game mode, for example when it shows another player's chain, SHOULD draw them differently from positions in cyberspace, so a viewer never mistakes play inside a game for travel (`CYBERSPACE_V2.md` §8.11.7).

A game that has no positions, a card game for example, writes none, and §4 does not apply to it.

**Why coordinates and not a game's own frame (non-normative):** A game could number its positions any way it likes, and the base protocol would not mind. Using cyberspace coordinates inside the region costs nothing, needs no conversion, and puts the player where the world's items are: an item's `C` and a player's `C` are the same kind of number, so a client tells whether the player stands on a pad by comparing them.

## 4. Two recommended game actions

A game names its own actions (`CYBERSPACE_V2.md` §8.11.2). This DECK recommends two names and their shapes for games that have positions, so that a client that knows this DECK can draw a player's path through any game that uses them, without implementing that game. A game that uses one of these names SHOULD use it with the meaning and shape below. Both are game actions: they carry no base proof, cost no base work, and the base protocol reads only their `A` tag and their links (`CYBERSPACE_V2.md` §8.11.4, rule 4).

A game MUST NOT name an action `hop`, `sidestep`, `enter-hyperspace`, `hyperjump` or `enter-virtual`: those names are reserved inside a bracket (`CYBERSPACE_V2.md` §8.11.4, rule 3), and so are the action names of any mandatory DECK a later chain rules revision adds. A `spawn` is never inside a bracket, and an `exit-virtual` closes it.

### 4.1 `teleport`

The game put the player at a game position, with no path between where they were and where they are.

| Tag | Value |
|---|---|
| `["A", "teleport"]` | exactly one |
| `["e", "<spawn id>", "", "genesis"]` | exactly one, as for any game action |
| `["e", "<previous id>", "", "previous"]` | exactly one, as for any game action |
| `["C", "<coord hex>"]` | exactly one: the game position the player is now at |
| `["c", "<coord hex>"]` | optional: the game position the player left. Absent on the arrival right after the entry (§2.2), where the player came from no game position |

Whether a teleport is allowed is the game's to decide: a pad the player stood on, a portal, the arrival, a restart. A game that checks its players checks its own teleports.

### 4.2 `move`

The player went from one game position to another by the game's own movement.

| Tag | Value |
|---|---|
| `["A", "move"]` | exactly one |
| `["e", "<spawn id>", "", "genesis"]` | exactly one |
| `["e", "<previous id>", "", "previous"]` | exactly one |
| `["c", "<coord hex>"]` | exactly one: where the move started |
| `["C", "<coord hex>"]` | exactly one: where it ended |

How far a move may go, what it may pass through and what it costs are the game's rules. A game MAY publish a `move` for every step, for a stretch of steps, at checkpoints only, or never (§6).

### 4.3 Reading them

A client that draws another player's bracket reads the game positions of its `teleport` and `move` actions as a path inside the game, a teleport as a jump with nothing drawn between its ends. It reads every other game action as nothing it can draw. A game ignores an action whose name it does not use (`CYBERSPACE_V2.md` §8.11.4, rule 5), so a game that does not use these names is not affected by them.

**Why these two and no others (non-normative):** They are the two ways anything with positions changes position: with a path and without one. Every other action a game might want (pick up, open, attack, score) means something only inside that game, and is that game's to name and define. Two names are enough to draw any game's travel; more would be guesses at games nobody has written yet.

## 5. The world (normative for clients that draw a game)

### 5.1 Where the world is

A game's **world** is the items of the bags (`CYBERSPACE_V2.md` §7.6, `kind 33330`) that the game key signs and seals with the region key of the game's region: the key of the aligned cube named by the `region` tag of the entry (`CYBERSPACE_V2.md` §7.2). The bag's `d` is that cube's `lookup_id`, so one query finds the whole world:

```json
{ "kinds": [33330], "authors": ["<game pubkey>"], "#d": ["<lookup_id of the game's region>"] }
```

asked of the relay named in the entry's relay hint and of the client's usual relays. A client opens each bag with the region key and reads its entries by the rules of `CYBERSPACE_V2.md` §7.6, sealed entries and references included. Every item's `C` lies inside the region, as every item's `C` lies inside its bag's region (`CYBERSPACE_V2.md` §7.6).

The world is the game key's bags only. Bags of any other author in the same region are not part of the game, whoever placed them, and a client in in-game mode does not draw them as part of the world.

A game's world is whatever its bags hold: SNO shards (DECK-0003) for walls, floors and objects, and any other item a bag can hold. What an item means in the game (a pad, a goal, a key that opens a door in the game) is the game's rule (§8). A client draws the shards of the world at true scale, as it draws any shard (DECK-0003).

### 5.2 Computing the key

The region key of the game's region costs the work of a region key at the region's height (`CYBERSPACE_V2.md` §7.2, §7.3): trivial for the heights a dungeon or a course fills, and out of reach for very large heights. A game that wants every player to be able to draw its world keeps its region small enough for a phone to compute its key in a moment. A height of 8 or less (a cube 256 gibsons on a side) is a few thousand Cantor steps per axis.

### 5.3 Why the region key, and what follows (non-normative)

The world is sealed exactly as any hidden thing is, to the place it is in. This needs nothing new: no new kind, no new key, no new cipher. A client that can read bags can read a game's world, and the `region` tag that every entry carries in the clear is exactly what it needs to find it.

One consequence follows, and it is deliberate. A game's world is in cyberspace at its region, and anyone who stands in the region and computes its key sees the world's bags there, as they see any bag, whether or not they ever enter the game. They see its walls and its objects. What they do not get by walking in is the game: its teleports, its rules and its mechanics exist only in in-game mode. A game that wants its world unseen from cyberspace puts its region where nobody stands.

## 6. Play kept on the device (permitted)

A client MAY move its player inside a game without publishing every step. Between two game actions on the chain, where the player is inside the game is the client's and the game's business: it is never a position in cyberspace, it never reaches any chain, and no verifier reads it. The chain holds the game actions the game wants on the record: the arrival, the teleports, a checkpoint, a result.

This is the base protocol's permission for live play off the chain (`CYBERSPACE_V2.md` §8.11.7) applied to a single player. Play kept on the device is not verified by anyone, so a modified client can walk through a game's walls. For a casual game played alone that spoils only the cheater's own game. A game whose outcomes matter checks the actions that are on the chain, or runs a live arbiter (§8).

This DECK does not specify play shared between players in real time: ephemeral events carrying moves to other players, a key that signs those moves on the player's behalf, or a relay that carries them. They wait for a game that needs them (§11).

## 7. Leaving a game (normative for clients)

A client leaves a game by publishing an `exit-virtual` action on its player's chain, exactly as `CYBERSPACE_V2.md` §8.11.3 defines it: its `e` entry tag names the open `enter-virtual` action, and its `C` is that action's `c`, the base position restored.

- The client MAY write the player's last game position in the exit's `c` tag. The base protocol never reads it (`CYBERSPACE_V2.md` §8.11.3).
- The client SHOULD return its player to the view they had when they entered: the same place, the same zoom, the same direction of look, and the same mode of movement. The protocol restores the position (`CYBERSPACE_V2.md` §8.11.4, rule 2); the view is the client's to restore, and a player who comes back to a different view does not feel they came back to where they were.
- A client MAY leave a game at any moment, the middle of play included: an `exit-virtual` action is always valid (`CYBERSPACE_V2.md` §8.11.6). What leaving means inside the game, for a game with stakes, is the game's rule (`CYBERSPACE_V2.md` §8.11.7).

**Coming back to an open bracket.** A chain whose head is inside a bracket says, by itself, which game holds the player and where they entered from (`CYBERSPACE_V2.md` §8.11.4, rule 7). A client that reloads, or that opens on such a chain, and implements the game SHOULD offer both to go back into the game and to leave it. It builds the exit from the chain alone: the open `enter-virtual` action gives the entry id and the base position. A client that does not implement the game says that a game holds the player and signs no base action (§2.3).

**Who may publish the exit.** The base protocol lets the identity's own client publish an exit at any time. A client SHOULD publish an exit only for a game it implements, or when its player asks to leave a game it does not implement and has been told that the game may count leaving this way against them.

## 8. What this DECK leaves to games (non-normative)

The owner's direction for this DECK (2026-11-07) is to keep it minimal: most of what a game does is game logic, its own custom rules and actions, outside the DECK. Each part of a game that came up while this DECK was written was sorted into the DECK or into game logic. This table is the record of that sorting.

| Part of a game | Where it lives | Why |
|---|---|---|
| Entering and leaving | DECK (§2, §7), which is the base bracket | Every game needs it, and every client must do it the same way for chains to stay valid. The DECK adds only the client's duties: confirm the head, never nest, restore the view. |
| What a game is | Base protocol: a pubkey | Ruled 2026-10-02: there is no game event. The DECK adds nothing. |
| Advertising a game, a list of games | Neither (outside the protocol) | The base protocol already says a game SHOULD advertise its region by no fixed mechanism (§8.11.7). A link, a door, a tutorial or a web page is enough to start one. |
| Where the player starts | Game logic, through a DECK action shape (§2.2, §4.1) | Which position is the game's choice; how it is written (a `teleport` right after the entry) is shared, so every client can draw the arrival. |
| How positions are written | DECK (§3) | One encoding, cyberspace coordinates inside the region, lets any client draw any game's path and its world in one frame. |
| `teleport` and `move` | DECK, as recommended shapes (§4) | The two ways anything changes position. Every client can draw them without knowing the game. |
| Every other action (pick up, open, attack, score, win) | Game logic | It means something only inside one game. A game names it, and the base protocol already accepts any name that is not reserved. |
| Where the world is | DECK (§5) | Every client that draws a game needs to find its world the same way. It reuses bags and region keys, so it costs no new kind and no new key. |
| What an item of the world means (a pad, a goal, a door) | Game logic | A teleport pad in one game is a trap in another. The world carries shapes; the rules say what they do. |
| Physics: gravity, speed, jump height, collision | Game logic | The racer, the dungeon and a card game want different physics, or none. A game may borrow a client's movement, and a client may hold a player at the faces of world shards whose `constrain` is not `off` (DECK-0003 §1.12), but that is the game's choice, not a rule of this DECK. |
| Controls: keys, onscreen buttons, pads | Game logic, and each client's own | The base protocol reserved control definitions for this DECK (§8.11.7). They are left out until two games need the same controls: a client draws controls for the games it implements, and nothing on the wire needs them. |
| Proximity: having to stand near the region to enter | Game logic | Already the game's in the base protocol (§8.11.1). A game that wants it checks the entry's base position against its region before honoring the entry. |
| Play kept on the device | DECK permits it (§6) | One sentence of permission, so clients know that not every step must be on the chain. |
| Live play shared between players: ephemeral moves, a key that signs moves on the player's behalf, a game relay | Not yet decided (§11) | Needed only by real-time multiplayer games. No game this DECK serves needs them yet. |
| Liveness, scores, winners, what an exit means | Game logic | Already the game's in the base protocol (§8.11.7, `decks/README.md`, Game mechanics). |
| Competitive play | Game logic: a supervised game with a live arbiter | Owner's ruling 2026-11-10: casual, block-paced play is not competitive; competition needs an arbiter that checks moves as they happen. |

## 9. Example: the tutorial dungeon (non-normative)

A newcomer to ONOSENDAI finishes the first-arrival tutorial and chooses the dungeon. The tutorial game's pubkey is `G`; its region is a cube of height 6 (64 gibsons on a side) whose base is `R`; the newcomer stands at `P`, where their last hop left them.

1. Their client confirms the head and signs the entry: `A` `enter-virtual`, `c` and `C` both `P`, `region` `R` with height `6`, and `p` `G` marked `game`.
2. It signs the arrival: `A` `teleport`, `C` the dungeon's start, a game position inside the region. The dungeon is far from `P`; the newcomer got there through the game, not across cyberspace.
3. It reads the world: the bags signed by `G` with `d` equal to the `lookup_id` of the region, opened with the region key. It draws their shards, a sealed stone chamber and a teleport pad, in place of cyberspace.
4. The newcomer walks the chamber. The steps stay on their device (§6). The walls hold them, because the game's rules say they do.
5. They step onto the pad. The game's rule is that the pad sends them to a second chamber nothing connects to the first, and their client signs `A` `teleport`, with `c` the pad and `C` the second chamber.
6. They choose EXIT GAME. Their client signs `A` `exit-virtual`, `e` entry naming step 1, `C` `P`, and an optional `c` with their last game position. The view comes back to exactly what it was before step 1.

On the relays, their chain now reads: a hop to `P`, then `enter-virtual`, `teleport`, `teleport`, `exit-virtual`, all at base position `P`. Every verifier finds it valid; a client that knows this DECK can draw the two teleports inside the dungeon; a client that knows nothing of games draws the newcomer standing at `P` the whole time.

The entry, in full:

```json
{
  "kind": 3333,
  "pubkey": "<newcomer>",
  "created_at": 1794300000,
  "tags": [
    ["A", "enter-virtual"],
    ["e", "<spawn id>", "", "genesis"],
    ["e", "<previous id>", "", "previous"],
    ["c", "<P>"],
    ["C", "<P>"],
    ["region", "<R>", "6"],
    ["p", "<G>", "wss://relay.onosendai.tech", "game"],
    ["X", "<sector x of P>"],
    ["Y", "<sector y of P>"],
    ["Z", "<sector z of P>"],
    ["S", "<sector of P>"]
  ],
  "content": ""
}
```

The arrival:

```json
{
  "kind": 3333,
  "pubkey": "<newcomer>",
  "created_at": 1794300001,
  "tags": [
    ["A", "teleport"],
    ["e", "<spawn id>", "", "genesis"],
    ["e", "<id of the entry>", "", "previous"],
    ["C", "<the dungeon's start, inside R>"]
  ],
  "content": ""
}
```

## 10. Security considerations

- **Play kept on the device is not verified** (§6). A modified client walks through walls and teleports anywhere. Only the actions on the chain can be checked, and only by a game that checks them.
- **The game key owns the world.** Whoever holds the game key can rewrite the world, add to it or empty it, since the world is that key's bags (§5). A game keeps its key as carefully as an identity.
- **The world is visible from cyberspace** to anyone in the region who computes its key (§5.3).
- **Playing is public.** Every entry names the game in the clear, and relays index it, so anyone can list who entered which game and when (`CYBERSPACE_V2.md` §8.11.1). Every game action stays on the player's chain for good.
- **Game actions are other people's text.** A client that reads another player's game actions reads their tags as data. A game action names no command for any reader.

## 11. Open questions (non-normative)

1. **Shared real-time play.** A multiplayer game needs moves to reach other players faster than chain events do. The design notes so far: ephemeral events (kinds 20000 to 29999) carrying moves; a short-lived key that the `enter-virtual` action names and that signs those moves, since a remote signer cannot sign ten moves a second; and a relay named for the game's traffic. Each needs its own ruling, and the first needs a game that wants it.
2. **A world unseen from cyberspace.** The world is visible to anyone standing in the region (§5.3). If a game must hide it, its bags could be sealed with a key derived from both the region key and the game's pubkey. That is a new derivation, left out until a game asks for it.
3. **Controls on the wire.** Whether a game should publish its controls (keys, buttons) so that a client that does not implement it can still offer them. Left out until two games share controls.
4. **Collision as a shared default.** Whether in-game mode should hold a player at the faces of world shards by default (DECK-0003 §1.12), so that a game with walls needs no rule of its own for them.
