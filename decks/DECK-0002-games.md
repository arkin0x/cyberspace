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
- a game's **entry point**, where a player appears in the game by virtue of entering it, with no action published for the arrival (§2.2);
- how a game writes a position inside the game, when it has positions (§3);
- two recommended game actions, `teleport` and `move`, so that any client can draw a player's path through any game that uses them without knowing that game (§4);
- where a game's world is and how a client reads it: the bags the game's pubkey seals to the game's region (§5);
- that inside the bracket the game defines every action, and leaving is the one thing a player can always do (§2.3);
- how a game's rapid actions go as ephemeral events, anchored now and then to a chain event so they can be checked later (§6).

It defines no new event kind, and two tags: `entry`, which a game puts on one item of its own world, and `anchor`, which a player's chain event carries to commit to the game's ephemeral actions. A game is its pubkey (`CYBERSPACE_V2.md` §8.11.1, arkinox's ruling of 2026-10-02): there is no game event, and no registry of games. Everything else a game does, its rules, its mechanics, its scoring, its controls, is the game's own, and §8 records each part this DECK leaves to games and why.

The first game shaped to this DECK is the tutorial dungeon of ONOSENDAI's first-arrival tutorial (§9): a newcomer enters a game, appears in a small dungeon built for it, far from where they stand, meets a mechanic cyberspace does not have, and leaves to stand exactly where they entered.

## Terms

- **Game:** a pubkey, named by the `p` tag marked `game` on an `enter-virtual` action (`CYBERSPACE_V2.md` §8.11.1). A game that signs anything signs it with the secret key of that pubkey, the **game key**.
- **Region:** the aligned cube named by the `region` tag of the `enter-virtual` action (`CYBERSPACE_V2.md` §8.11.1).
- **Bracket:** the stretch of the player's chain from their `enter-virtual` action to the `exit-virtual` action that closes it (`CYBERSPACE_V2.md` §8.11).
- **Base position:** where the player stands in cyberspace for the whole bracket: the `c` of their `enter-virtual` action, which its `C` repeats (`CYBERSPACE_V2.md` §8.11.4, rule 1).
- **Game position:** where the player is inside the game, for a game that has positions (§3). It is never a position in cyberspace.
- **Entry point:** where a player appears in the game by virtue of entering it (§2.2). It is a game position, and it is not the game's spawn or respawn point in play.
- **Game action:** a virtual action (`CYBERSPACE_V2.md` §8.11.2): any event inside a bracket.
- **World:** what a game draws for its players: the items of the bags its game key seals to its region (§5).
- **In-game mode:** a client's state while its own player is inside a bracket of a game the client implements: it draws the game, and its controls make game actions (§2.3).
- **Ephemeral action:** a game's action carried in an ephemeral event (NIP-01 kinds 20000 to 29999), which relays pass to current subscribers and do not keep (§6). It is never on any chain.
- **Anchor:** a chain event inside the bracket that carries an `anchor` tag, committing to the ephemeral actions made since the event before it (§6).
- **Implements a game:** knows that game's rules. A client that implements a game can play it; a client that does not can still read every bracket and draw a player held at their base position (`CYBERSPACE_V2.md` §8.11.7).

## 1. Overview (non-normative)

| Step | What the player's client does | Published on the player's chain | Defined in |
|---|---|---|---|
| Enter | Publishes `enter-virtual` naming the game and its region, from where the player stands | `enter-virtual` | `CYBERSPACE_V2.md` §8.11.1; this DECK §2 |
| Draw | Reads the world from the game's bags in the region, and draws it in place of cyberspace | nothing | §5 |
| Arrive | Shows the player at the game's entry point, by virtue of having entered | nothing | §2.2 |
| Play | Does whatever the game's rules allow, and nothing else | whatever the game puts on the record: chain game actions, and rapid actions as ephemeral events anchored to the chain now and then | §2.3, §4, §6 |
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

### 2.2 The entry point (normative for games that have positions)

A game's **entry point** is where a player appears in the game by virtue of entering it. Entering is the whole arrival:

- **No action is published for the arrival.** The `enter-virtual` action is the only event the player signs to enter. A client that has read the game's world (§5) shows the player at the entry point from that moment, and the player's game position is the entry point until a game action moves them (§4).
- **Nothing changes in the base protocol.** The `enter-virtual` action does not move the player, and its `C` is the base position, not a place in the game (`CYBERSPACE_V2.md` §8.11.1). The player's position in cyberspace stays exactly where they entered from, held by the bracket until the `exit-virtual` action restores it (`CYBERSPACE_V2.md` §8.11.4, rules 1 and 2). Appearing at the entry point only shows where the player is in the game.
- **No base action is allowed inside the bracket**, for the arrival or for anything after it: a `hop`, `sidestep`, `enter-hyperspace`, `hyperjump` or `enter-virtual` signed inside a bracket is invalid, and the chain is invalid from it (`CYBERSPACE_V2.md` §8.11.4, rule 3). Getting a player to the entry point never needs one.

**Where the entry point is written.** The entry point is the `C` of the item of the game's world (§5.1) that carries an `entry` tag:

| Tag | Value |
|---|---|
| `["entry"]` | on one item stored inline in the world's bag, of any kind: a shard drawn at the place of arrival, for example, or an item no client draws. Its `C` is the entry point. The tag has no value; any further elements are ignored. |

A reader finds the entry point in the list of the game's newest world bag (§5.1), in order, before it reads any item for drawing:

- It counts an entry only when it is stored inline in the bag (not a reference, and not a sealed entry), it is authentic as an item of that bag (`CYBERSPACE_V2.md` §7.6: signed by the game key, or a rumor the bag vouches for), and its `C` is well formed and lies inside the region, in the region's plane. An entry that fails any of these is skipped, and the next one counts.
- A reader counts an entry whatever its kind, including a kind it cannot read or draw.
- A game's world SHOULD carry exactly one item with the `entry` tag. When more than one counts, the entry point is the `C` of the first of them in the bag's list, the same order that decides which of two copies of an item counts (`CYBERSPACE_V2.md` §7.6).
- When none counts, the entry point is the centre of the region: on each axis, its base plus `2^(H - 1)`, where `H` is the region's height (for `H` = 0, the base itself).

**Why inline only (non-normative):** A reference names an object, possibly by another author, and that object's own tags are its author's: if a reference could carry the entry point, the author of an object a game placed could move the game's entry point by editing their object. An inline entry is the game key's own, read from the bag with no fetch. And because the entry point is only a `C` and a tag, it needs nothing a reader has to understand: a game may mark it with an item no client draws.

**The entry point is not a spawn point in play.** Where a game starts a round, restarts a player who fell, or revives one who lost, is the game's own rule, and none of those needs to be the entry point. The entry point says only where a player appears when they enter.

**Why a tag on an item of the world (non-normative):** A game is its pubkey, and there is no game event (arkinox, 2026-10-02), so the entry point needs a home that already exists. The world is the one place every client already reads, with the key it already has, and a game moves its entry point by republishing its bag, as it changes anything else in its world. A tag on an item costs one tag, sealed with everything else, and readers that know nothing of games ignore it, as they ignore any tag they do not read. A tag on the `enter-virtual` action, which the base protocol allows, would have let every player write their own arrival; the entry point is the game's to set.

### 2.3 In-game mode

While its player is inside a bracket of a game it implements, a client is in **in-game mode**:

- It SHOULD draw the game's world (§5) and SHOULD hide or dim everything else of cyberspace, so the player sees the game and not the place where they stand.
- It MUST NOT sign any action of the base protocol or of a mandatory DECK: inside a bracket each of them is invalid and makes the chain invalid from it (`CYBERSPACE_V2.md` §8.11.4, rule 3). At this revision these are `hop`, `sidestep`, `enter-hyperspace`, `hyperjump` and `enter-virtual`.
- **The game defines every action.** Inside the bracket, what a player can do, and whether they can move at all, is entirely the game's rule. This DECK assumes no walking, no steps and no positions: a game may have none of them.
- **Leaving is the one override.** Whatever the game's rules say, the player can always leave with `exit-virtual` (§7, `CYBERSPACE_V2.md` §8.11.6). A client MUST offer it at every moment of play.

A client that does not implement the game whose bracket is open on its player's chain (the player entered from another client, for example) is not in in-game mode. It draws the player held at the base position, and it MUST NOT sign base actions either, for the same reason.

## 3. Game positions (normative for games that have positions)

A game position is written as a coordinate in the form of `CYBERSPACE_V2.md` §2.2: 32-byte lowercase hex, the same encoding as any `C` tag. A game that has positions:

- SHOULD keep every game position inside its region. Its world is read from its region (§5) and drawn there, so positions inside the region are in the same frame as the world, at true scale, one gibson to a gibson.
- writes a game position in the `C` tag of a game action, and where the action says where the player came from, in its `c` tag (§4);
- has an entry point (§2.2), the player's game position from the moment they enter until a game action moves them.

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
| `["c", "<coord hex>"]` | optional: the game position the player left |

Whether a teleport is allowed is the game's to decide: a pad the player stood on, a portal, a restart. Entering the game is never one: the player appears at the entry point with no action (§2.2). A game that checks its players checks its own teleports.

### 4.2 `move`

The player went from one game position to another by the game's own movement.

| Tag | Value |
|---|---|
| `["A", "move"]` | exactly one |
| `["e", "<spawn id>", "", "genesis"]` | exactly one |
| `["e", "<previous id>", "", "previous"]` | exactly one |
| `["c", "<coord hex>"]` | exactly one: where the move started |
| `["C", "<coord hex>"]` | exactly one: where it ended |

How far a move may go, what it may pass through and what it costs are the game's rules. A game that moves rapidly carries its moves as ephemeral actions and puts a `move` on the chain only where it wants one, or never (§6).

### 4.3 Reading them

A client that draws another player's bracket reads the game positions of its `teleport` and `move` actions as a path inside the game, a teleport as a jump with nothing drawn between its ends. It reads every other game action as nothing it can draw. A game ignores an action whose name it does not use (`CYBERSPACE_V2.md` §8.11.4, rule 5), so a game that does not use these names is not affected by them.

**Why these two and no others (non-normative):** They are the two ways anything with positions changes position: with a path and without one. Every other action a game might want (pick up, open, attack, score) means something only inside that game, and is that game's to name and define. Two names are enough to draw any game's travel; more would be guesses at games nobody has written yet. Both are recommendations, never requirements: a game uses them, its own names, or no names that draw at all, and games add whatever names they need (owner, 2026-11-10).

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

## 6. Rapid actions: ephemeral, and anchored to the chain

A chain event costs a signature and a stored event on every relay, and a game played at the speed of a hand makes many actions a second. A game's **rapid actions** therefore SHOULD be ephemeral events (NIP-01 kinds 20000 to 29999), which relays pass to the game's current subscribers and do not keep, and the game SHOULD **anchor** them now and then to a real chain event, so that a game, an arbiter or a later reader holding them can check them against the player's chain (`CYBERSPACE_V2.md` §8.11.7, live play off the chain). Ephemeral actions are never chain events: the base protocol never reads them, and they can never move a player in cyberspace or make a chain invalid.

What an ephemeral action's kind, tags and content are, who may sign it, which relay carries it, how often a game anchors, and what a game does with an anchor whose run it cannot reproduce, are the game's rules. This DECK defines only the anchor, because an anchor is on the player's chain, where every game and every reader must read it the same way.

### 6.1 The anchor (normative for games that anchor)

An anchor is any event inside the bracket on the player's chain, a game action (§4) or the `exit-virtual` action that closes the bracket (§7), that carries one `anchor` tag:

| Tag | Value |
|---|---|
| `["anchor", "<run hex>", "<count>"]` | at most one on an event. `run`: 32-byte lowercase hex, the run hash below. `count`: how many ephemeral actions the run covers, a decimal string with no sign and no leading zeros except `"0"`. |

The run an anchor covers is the ephemeral actions the player made since the event its `e` previous tag names, in the order the player made them, and its run hash is chained over their event ids:

```
h_0 = the id of the event named by the anchor's e previous tag   (32 bytes)
h_i = sha256(h_(i-1) || id_i)                                  (id_i: the i-th ephemeral action's event id, 32 bytes)
run = h_count
```

An anchor with a count of `0` commits to an empty run, and its run is `h_0`. A game reproduces an anchor by hashing the ephemeral actions it holds in the same order and comparing both values.

The base protocol never reads the `anchor` tag: it is one of the tags a game puts on its actions (`CYBERSPACE_V2.md` §8.8), and on an `exit-virtual` action it is a tag the chain rules do not read, so an anchor, well formed or not, never makes a chain invalid. A reader that does not know this DECK ignores it.

**Why a chained hash seeded by the previous event (non-normative):** The seed ties the run to one place on one chain: the same ephemeral actions anchored after another event hash differently, so a run cannot be lifted from one bracket, or one moment, to another. Chaining the ids one at a time needs no list and no tree, lets a client keep a single running value as the actions happen, and lets a checker stop at the first action that differs. The count says how many actions to expect before any hashing starts. The ephemeral events need no tag of their own for it, so a game is free to shape them however it likes.

### 6.2 What is left to games

A game whose actions are not rapid needs no ephemeral actions and no anchors at all. A game that keeps its play on the player's device without publishing it, as a casual single-player game may, publishes nothing between its chain actions and has nothing to anchor; that is the game's choice and this DECK neither requires it nor forbids it. Play that is not on the chain and not anchored is checked by nobody, so a modified client can do anything in it; for a casual game played alone that spoils only the cheater's own game, and a game whose outcomes matter anchors, or runs a live arbiter (§8).

## 7. Leaving a game (normative for clients)

A client leaves a game by publishing an `exit-virtual` action on its player's chain, exactly as `CYBERSPACE_V2.md` §8.11.3 defines it: its `e` entry tag names the open `enter-virtual` action, and its `C` is that action's `c`, the base position restored.

- The client MAY write the player's last game position in the exit's `c` tag, and MAY carry an anchor for the actions since the last chain event (§6.1). The base protocol reads neither (`CYBERSPACE_V2.md` §8.11.3).
- The client SHOULD return its player to the view they had when they entered: the same place, the same zoom, the same direction of look, and the same mode of movement. The protocol restores the position (`CYBERSPACE_V2.md` §8.11.4, rule 2); the view is the client's to restore, and a player who comes back to a different view does not feel they came back to where they were.
- A client MAY leave a game at any moment, the middle of play included: an `exit-virtual` action is always valid (`CYBERSPACE_V2.md` §8.11.6). What leaving means inside the game, for a game with stakes, is the game's rule (`CYBERSPACE_V2.md` §8.11.7).

**Coming back to an open bracket.** A chain whose head is inside a bracket says, by itself, which game holds the player and where they entered from (`CYBERSPACE_V2.md` §8.11.4, rule 7). A client that reloads, or that opens on such a chain, and implements the game SHOULD offer both to go back into the game and to leave it. It builds the exit from the chain alone: the open `enter-virtual` action gives the entry id and the base position. Going back in, it shows the player at the game position of the last `teleport` or `move` in the bracket, or at the entry point when there is none. A client that does not implement the game says that a game holds the player and signs no base action (§2.3).

**Who may publish the exit.** The base protocol lets the identity's own client publish an exit at any time. A client SHOULD publish an exit only for a game it implements, or when its player asks to leave a game it does not implement and has been told that the game may count leaving this way against them.

## 8. What this DECK leaves to games (non-normative)

The owner's direction for this DECK (2026-11-07) is to keep it minimal: most of what a game does is game logic, its own custom rules and actions, outside the DECK. Each part of a game that came up while this DECK was written was sorted into the DECK or into game logic. This table is the record of that sorting.

| Part of a game | Where it lives | Why |
|---|---|---|
| Entering and leaving | DECK (§2, §7), which is the base bracket | Every game needs it, and every client must do it the same way for chains to stay valid. The DECK adds only the client's duties: confirm the head, never nest, restore the view. |
| What a game is | Base protocol: a pubkey | Ruled 2026-10-02: there is no game event. The DECK adds nothing. |
| Advertising a game, a list of games | Neither (outside the protocol) | The base protocol already says a game SHOULD advertise its region by no fixed mechanism (§8.11.7). A link, a door, a tutorial or a web page is enough to start one. |
| Where the player appears on entering | DECK: the entry point, an `entry` tag on an item of the world (§2.2) | Owner's ruling 2026-11-10: entering shows the player at the game's entry point by virtue of entering, with no action published and nothing changed in the base protocol. Every client must find it the same way. |
| Where the player starts, restarts or revives in play | Game logic | Distinct from the entry point (owner, 2026-11-10). |
| How positions are written | DECK (§3) | One encoding, cyberspace coordinates inside the region, lets any client draw any game's path and its world in one frame. |
| `teleport` and `move` | DECK, as recommended shapes (§4); games add their own names | The two ways anything changes position inside a game, a pad's jump for example. Every client can draw them without knowing the game (owner, 2026-11-10). |
| Every other action (pick up, open, attack, score, win) | Game logic | It means something only inside one game. A game names it, and the base protocol already accepts any name that is not reserved. |
| Where the world is | DECK (§5) | Every client that draws a game needs to find its world the same way. It reuses bags and region keys, so it costs no new kind and no new key. Its being visible from the region in cyberspace is accepted for now (owner, 2026-11-10). |
| What an item of the world means (a pad, a goal, a door) | Game logic | A teleport pad in one game is a trap in another. The world carries shapes; the rules say what they do. |
| Physics: gravity, speed, jump height, collision | Game logic | The racer, the dungeon and a card game want different physics, or none. A game may borrow a client's movement, and a client may hold a player at the faces of world shards whose `constrain` is not `off` (DECK-0003 §1.12), but that is the game's choice, not a rule of this DECK. |
| Controls: keys, onscreen buttons, pads | Game logic, and each client's own | The base protocol reserved control definitions for this DECK (§8.11.7). They are left out until two games need the same controls: a client draws controls for the games it implements, and nothing on the wire needs them. |
| Proximity: having to stand near the region to enter | Game logic | Already the game's in the base protocol (§8.11.1). A game that wants it checks the entry's base position against its region before honoring the entry. |
| What a player can do inside the bracket, whether they move at all | Game logic | Owner, 2026-11-10: once you are in a game, the game fully controls what you can and cannot do. The DECK assumes no walking, steps or positions. |
| Leaving | DECK (§2.3, §7) | The one thing a player can always do, whatever the game's rules (owner, 2026-11-10). |
| Rapid actions as ephemeral events | DECK recommends it (§6) | Owner, 2026-11-10, as decided in the design notes of 2026-10-07: rapid actions use ephemeral events and anchor periodically to a chain event. |
| The anchor: tag, run hash, count | DECK (§6.1) | It sits on the player's chain, so every game and reader must read it the same way. |
| Ephemeral actions' kind, tags, signer, relay, cadence of anchors, what a failed check means | Game logic (§6) | Each game's needs differ; none of it is read by the base protocol or by another game. |
| Keeping play on the device, unpublished | Game logic (§6.2) | Neither required nor forbidden: a game's own choice. |
| A key that signs ephemeral actions for the player, a game relay | Not yet decided (§11) | Needed only by real-time multiplayer games. No game this DECK serves needs them yet. |
| Liveness, scores, winners, what an exit means | Game logic | Already the game's in the base protocol (§8.11.7, `decks/README.md`, Game mechanics). |
| Competitive play | Game logic: a supervised game with a live arbiter | Owner's ruling 2026-11-10: casual, block-paced play is not competitive; competition needs an arbiter that checks moves as they happen. |

## 9. Example: the tutorial dungeon (non-normative)

A newcomer to ONOSENDAI finishes the first-arrival tutorial and chooses the dungeon. The tutorial game's pubkey is `G`; its region is a cube of height 6 (64 gibsons on a side) whose base is `R`; the newcomer stands at `P`, where their last hop left them.

1. Their client confirms the head and signs the entry: `A` `enter-virtual`, `c` and `C` both `P`, `region` `R` with height `6`, and `p` `G` marked `game`.
2. It reads the world: the bags signed by `G` with `d` equal to the `lookup_id` of the region, opened with the region key. It draws their shards, a sealed stone chamber and a teleport pad, in place of cyberspace.
3. It shows the newcomer at the entry point: the `C` of the world's item with the `entry` tag, a small marker on the chamber's floor. Nothing is signed for it. The dungeon is far from `P`; the newcomer appears there through the game, not across cyberspace, and on the chain they still stand at `P`.
4. The tutorial game lets them move a gibson a press, on their device, publishing nothing, and holds them at its walls: that is this game's own choice (§6.2), not a rule of this DECK.
5. They step onto the pad. The game's rule is that the pad sends them to a second chamber nothing connects to the first, and their client signs `A` `teleport`, with `c` the pad and `C` the second chamber.
6. They choose EXIT GAME. Their client signs `A` `exit-virtual`, `e` entry naming step 1, `C` `P`, and an optional `c` with their last game position. The view comes back to exactly what it was before step 1.

On the relays, their chain now reads: a hop to `P`, then `enter-virtual`, `teleport`, `exit-virtual`, all at base position `P`. Every verifier finds it valid; a client that knows this DECK can draw the newcomer at the entry point and the pad's teleport inside the dungeon; a client that knows nothing of games draws the newcomer standing at `P` the whole time.

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

The entry point, an item inside the world's bag (a shard item, `kind 3330`, signed by `G`), with the `entry` tag:

```json
{
  "kind": 3330,
  "pubkey": "<G>",
  "created_at": 1794300006,
  "tags": [
    ["C", "<the entry point, inside R>"],
    ["entry"]
  ],
  "content": "<the marker's SNO payload>"
}
```

The pad's teleport:

```json
{
  "kind": 3333,
  "pubkey": "<newcomer>",
  "created_at": 1794300042,
  "tags": [
    ["A", "teleport"],
    ["e", "<spawn id>", "", "genesis"],
    ["e", "<id of the entry>", "", "previous"],
    ["c", "<the pad, inside R>"],
    ["C", "<the second chamber, inside R>"]
  ],
  "content": ""
}
```

## 10. Security considerations

- **Unanchored play is not verified** (§6). A modified client does anything in play that is neither on the chain nor anchored. Only chain actions and anchored runs can be checked, and only by a game that holds the run and checks it.
- **An anchor commits, it does not reveal.** A run hash proves nothing until someone produces the ephemeral actions it covers, and relays do not keep them. A game that wants to check later keeps them itself, or has the player keep them.
- **The game key owns the world.** Whoever holds the game key can rewrite the world, add to it or empty it, since the world is that key's bags (§5). A game keeps its key as carefully as an identity.
- **The world is visible from cyberspace** to anyone in the region who computes its key (§5.3).
- **Playing is public.** Every entry names the game in the clear, and relays index it, so anyone can list who entered which game and when (`CYBERSPACE_V2.md` §8.11.1). Every game action stays on the player's chain for good.
- **Game actions are other people's text.** A client that reads another player's game actions reads their tags as data. A game action names no command for any reader.

## 11. Open questions (non-normative)

1. **A signing key for ephemeral actions.** A remote signer cannot sign ten actions a second. The design notes propose a short-lived key that the `enter-virtual` action names and that signs the player's ephemeral actions; that needs a tag on the entry, read only by games. Left for a game that needs it.
2. **A relay for a game's traffic.** Ephemeral actions from many players are heavy for a general relay. A game could name one; left for a game that needs it.
3. **A world unseen from cyberspace.** The world is visible to anyone standing in the region (§5.3). If a game must hide it, its bags could be sealed with a key derived from both the region key and the game's pubkey. That is a new derivation, left out until a game asks for it.
4. **Controls on the wire.** Whether a game should publish its controls (keys, buttons) so that a client that does not implement it can still offer them. Left out until two games share controls.
5. **Collision as a shared default.** Whether in-game mode should hold a player at the faces of world shards by default (DECK-0003 §1.12), so that a game with walls needs no rule of its own for them.
