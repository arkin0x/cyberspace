# DECK-0002: Games

DECK: 0002
Title: Games
Status: Draft
Mandatory: no
Created: 2026-11-10
Last updated: 2026-11-14
Requires: `CYBERSPACE_V2.md` §2.2 (coordinates), §7.2 (region keys), §7.6 (the bag) and §8.11 (virtual brackets); DECK-0003 (SNO) for the objects a world is built from; DECK-0004 (items and doors) for the things a game's action button acts on (§9.4); NIP-01

## Abstract

A **game** in cyberspace is played inside a virtual bracket (`CYBERSPACE_V2.md` §8.11). The player publishes an `enter-virtual` action, which holds their position in cyberspace; everything they do until their `exit-virtual` action belongs to the game; and the exit puts them back exactly where they stood. The base protocol defines the bracket and treats everything inside it as opaque. It says nothing about how a client finds a game's world, how it draws the game, or what a game's actions look like.

This DECK says those things, and as little else as it can. It defines:

- how a client enters a game and leaves it (§2, §7), which is the base protocol's bracket and nothing new, with the client's duties written down;
- a game's **entry point**, where a player appears in the game by virtue of entering it, with no action published for the arrival (§2.2);
- how a game writes a position inside the game, when it has positions (§3);
- two recommended game actions, `teleport` and `move`, so that any client can draw a player's path through any game that uses them without knowing that game (§4);
- where a game's world is and how a client reads it: the bags the game's pubkey seals to the game's region (§5);
- that inside the bracket the game defines every action, and leaving is the one thing a player can always do (§2.3);
- how a game's rapid actions go as ephemeral events, anchored now and then to a chain event so they can be checked later (§6);
- an optional **rules** section that a game declares in its own world, so that any client that supports it can play the game without carrying the game's code: a short list of Cyberspace settings a game may change (its movement modes, gravity, view), and a short list of game-building primitives a game may opt into (controls, an action button, teleport pads, a finish and a clock) (§9).

It defines no new event kind, and four tags: `entry`, which a game puts on one item of its own world; `rule` and `optional-rule`, which a game puts on items of its own world to declare its rules; and `anchor`, which a player's chain event carries to commit to the game's ephemeral actions. A game is its pubkey (`CYBERSPACE_V2.md` §8.11.1, arkinox's ruling of 2026-10-02): there is no game event, and no registry of games. Everything else a game does, its mechanics, its scoring, any rule the rules section does not name, is the game's own, and §8 records each part this DECK leaves to games and why.

The first game shaped to this DECK is the tutorial dungeon of ONOSENDAI's first-arrival tutorial (§10): a newcomer enters a game, appears in a small dungeon built for it, far from where they stand, meets a mechanic cyberspace does not have, and leaves to stand exactly where they entered.

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
- **Implements a game:** knows that game's rules, from code of its own for that game or from the rules the game declares in its world (§9). A client that implements a game can play it; a client that does not can still read every bracket and draw a player held at their base position (`CYBERSPACE_V2.md` §8.11.7).
- **Declared rules:** the `rule` and `optional-rule` tags a game puts on items of its newest world bag (§9.2). A game that has none declares no rules.

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
| What an item of the world means (a pad, a goal, a door) | Game logic, or the game's declared rules (§9.4) | A teleport pad in one game is a trap in another. The world carries shapes; the rules say what they do. A game that uses the standard pads and finish declares them as boxes of game positions, and a key and a door are DECK-0004's own items and doors. |
| Physics: gravity, speed, jump height, collision | Game logic, or the game's declared rules (§9.3) | The racer, the dungeon and a card game want different physics, or none. A game that wants the common physics declares it: the `walk` and `fly` modes, held at faces or not (DECK-0003 §1.12), and gravity with its one set of numbers (§9.3). Any other physics is the game's own code (owner, 2026-11-13: Cyberspace is the default substrate, and a game's rules select and lock its settings). |
| Controls: keys, onscreen buttons, pads | The game's declared rules, for the standard controls (§9.4); otherwise game logic, and each client's own | The base protocol reserved control definitions for this DECK (§8.11.7). Owner, 2026-11-13: a game opts into standard controls (a d-pad, a joystick to move, a joystick to turn the camera, a jump button, an action button) that this DECK defines once. A game that needs other controls carries them in its own code. |
| Proximity: having to stand near the region to enter | Game logic | Already the game's in the base protocol (§8.11.1). A game that wants it checks the entry's base position against its region before honoring the entry. |
| What a player can do inside the bracket, whether they move at all | Game logic | Owner, 2026-11-10: once you are in a game, the game fully controls what you can and cannot do. The DECK assumes no walking, steps or positions. |
| Leaving | DECK (§2.3, §7) | The one thing a player can always do, whatever the game's rules (owner, 2026-11-10). |
| Rapid actions as ephemeral events | DECK recommends it (§6) | Owner, 2026-11-10, as decided in the design notes of 2026-10-07: rapid actions use ephemeral events and anchor periodically to a chain event. |
| The anchor: tag, run hash, count | DECK (§6.1) | It sits on the player's chain, so every game and reader must read it the same way. |
| Ephemeral actions' kind, tags, signer, relay, cadence of anchors, what a failed check means | Game logic (§6) | Each game's needs differ; none of it is read by the base protocol or by another game. |
| Keeping play on the device, unpublished | Game logic (§6.2) | Neither required nor forbidden: a game's own choice. |
| A key that signs ephemeral actions for the player, a game relay | Not yet decided (§12) | Needed only by real-time multiplayer games. No game this DECK serves needs them yet. |
| Liveness, scores, winners, what an exit means | Game logic | Already the game's in the base protocol (§8.11.7, `decks/README.md`, Game mechanics). |
| Competitive play | Game logic: a supervised game with a live arbiter | Owner's ruling 2026-11-10: casual, block-paced play is not competitive; competition needs an arbiter that checks moves as they happen. |

## 9. Rules (optional)

By default a game's rules are the game's own code: a client that implements a game carries them (§2.3, §8). This section lets a game declare its rules in its own world instead, so that a client that has never seen the game's code can play it, and two clients play it alike. It is optional for games and for clients. A game that declares no rules is played as before, by clients that carry code for it. A client that does not support this section implements only the games it carries code for.

### 9.1 Layers (non-normative)

The rules are built in layers (owner, 2026-11-13):

| Layer | What it is | Where |
|---|---|---|
| 1 | Cyberspace itself, the default substrate. Every setting a game does not declare keeps its plain Cyberspace value. | §9.3 |
| 2 | **Settings.** A game selects or locks Cyberspace settings that already exist: the movement modes its player may use, gravity, the view, the way the player first faces, and the heights at which being somewhere in the game finds the game's hidden things. | §9.3 |
| 3 | **Primitives.** A game opts into standard game-building parts that this DECK defines once: a d-pad, a joystick to move, a joystick to turn the camera, a jump button, an action button, teleport pads, a finish and a clock. | §9.4 |
| 4 | **Custom features.** Anything Cyberspace does not have, such as flying a craft, driving, or a new kind of view. Not defined at this revision. | §9.6 |

Keys and locks are not rules. They are Cyberspace primitives (owner, 2026-11-13): a game that wants a key and a door places a key item and a door in its world (DECK-0004 §2, §3.7), as anyone places them in Cyberspace, and the action button (§9.4) is only how a player in the game takes the one and opens the other.

### 9.2 Where rules live (normative for games that declare rules, and for clients that support this section)

A game declares its rules with tags on items of its world (§5.1):

| Tag | Value |
|---|---|
| `["rule", "<name>", "<parameter>", ...]` | a rule the game requires. A client that cannot follow it does not start the game (§9.5). |
| `["optional-rule", "<name>", "<parameter>", ...]` | a rule the game can be played without. A client that cannot follow it plays the game without it (§9.5). |

`name` is a string of 1 to 64 characters, each one of `a` to `z`, `0` to `9` and `-`. It is one of the names this section defines (§9.3, §9.4), or a name it does not define (§9.5). The parameters are strings, and each rule sets out how many it takes and what form each has. The two tags are read the same way in everything but what a client does when it cannot follow the rule. Below, a **rule tag** is either of them.

A reader finds the rules in the list of the game's newest world bag (§5.1), the same bag in which it finds the entry point (§2.2). A bag whose plaintext is opaque, not a list (`CYBERSPACE_V2.md` §7.6), carries no rules.

- It counts a rule tag only when the item that carries it is stored inline in the bag (not a reference, and not a sealed entry) and is signed by the game key with a signature that verifies (`CYBERSPACE_V2.md` §7.6), and only when its name is in the form above. A rumor does not count, because §7.6 lets a reader drop a rumor of most kinds, and two readers must never disagree on what a game's rules are. Otherwise the item's kind and its `C` play no part: a reader counts the rule tags of an item of a kind it cannot read or draw. The item that carries the `entry` tag may carry them, and so may any other item. A game MAY spread its rules over several items, and SHOULD put them all on one, so that they are read and changed together.
- It reads the counted tags in order: the items in the order of the bag's list, and each item's tags in their order.
- A counted tag whose name this section defines is **well formed** when it has every parameter that rule requires, in the form that rule gives. Elements after the ones a rule sets out are ignored, so that a later revision can add parameters. A tag that is not well formed is skipped, exactly as if it were absent. A reader does not repair it: it does not trim a value, change its case, or supply a parameter that is missing.
- Every coordinate a rule names is a game position (§3): 64 lowercase hex characters, the form of a `C` tag, that lie inside the game's region and in the region's plane. A coordinate in any other form, or outside the region, makes its tag not well formed.
- A decimal parameter is a string of the digits `0` to `9`, with no sign and no leading zeros except `"0"`, in the range its rule gives.
- A rule this section calls **single** counts once: the first well-formed tag with its name counts, and every later tag with that name is ignored. A rule it calls **repeatable** counts every well-formed tag with its name, in reading order. A `rule` tag and an `optional-rule` tag with the same name are tags with the same name, and the one that counts says whether it is required.

A game **declares rules** when at least one rule tag counts. A game that declares rules is played by them: every setting it does not declare keeps its default (§9.3), and every primitive it does not declare is off (§9.4).

**Which world, and when.** The rules are read from the world in the region the client enters with (§2.1, §5.1). A client reads them from the newest world bag it holds when its player enters the game, or goes back into an open bracket (§7), and plays by those rules until the player leaves or the client reloads. A newer bag that reaches it during play changes the rules from the next entry or return, never in the middle of play. A client that cannot fetch the world bag does not know the game's rules, and does not start the game by them.

**Before publishing.** A client that plays a game by its declared rules SHOULD read the newest world bag, and check that it can follow every `rule` tag (§9.5), before it signs the entry. It SHOULD NOT publish an entry into a game it cannot play.

**Declared rules and a client's own code.** A client that carries code of its own for a game that declares rules SHOULD play the game by the declared rules wherever they speak, and by its own code only for what they leave unsaid. The declared rules are the game key's, published with its world, and a client's code is one client's reading of them.

**What rules do not do.** The declared rules tell a client how to play. They are applied on the player's device, like every part of play that is not published (§6.2). They change nothing about which chains are valid, and the base protocol never reads them.

### 9.3 Settings (layer 2)

Each setting changes one thing about how a player moves through the game's world, or how they see it. A setting a game does not declare keeps its default, which is plain Cyberspace's. Every setting is single.

| Rule | Parameters | Default |
|---|---|---|
| `mode` | one or more of `walk` and `fly`, each at most once | `fly`, then `walk` |
| `gravity` | `on` or `off` | `off` |
| `view` | `first-person` or `third-person` | the client's own |
| `facing` | one of `+x`, `-x`, `+z` and `-z` | `+z` |
| `find` | one or more heights, each a decimal from `0` to one less than the region's height, each at most once | none |

A `mode` or `find` tag that names the same value twice, or a value it does not take, is not well formed.

**`mode`: the movement modes.** The listed modes are the only ways the player moves by their own presses in the game. The first is the mode play starts in. When more than one is listed, the client offers a way to switch between them; when one is listed, the player stays in it. Each mode moves the player by **presses**: a press, from a control (§9.4), moves the player's game position one gibson along one axis. No press ever leaves the region: a press that would is not taken.

- `walk`: the player is a walker (DECK-0003 §1.12). A press whose step would cross a face that stops a walker is not taken, crossing measured exactly as DECK-0003 §1.12 measures it. The faces are those of everything the client draws as the game's world: its shards, the looks of its doors and chests (DECK-0004 §3.6), the models of its items (DECK-0004 §2.5), and what opened doors reveal (§9.4). With gravity off, a walker's presses go along all three axes. With gravity on, they go along X and Z only, and the player goes up only by jumping (below).
- `fly`: presses go along all three axes, and nothing stops them but the region's edge. No face holds a flyer, and gravity never applies to `fly`.

The two modes are Cyberspace's two ways of moving: step by step as a walker, and freely through anything, as a hop goes. Neither is a base action. Inside a bracket every base action is invalid (§2.3), so a `hop`, a `sidestep` or a hyperjump is never a mode of a game, and no setting turns one on. `fly` is not a hop: nothing is proved, paid or signed for it.

**`gravity`.** With `on`, a walker falls, lands and jumps by the numbers and the steps below, and the player cannot switch gravity off. With `off`, nothing falls. Gravity applies only to `walk`.

- **Down is -Y**, always, whatever the camera does.
- **The numbers.** Gravity, `g`, is 200/3 gibsons per second per second, about 66.7: a rise of 3 gibsons and the fall back take 0.6 seconds. A jump rises 5 gibsons: it leaves the floor upward at `sqrt(2 * g * 5)`, about 25.8 gibsons per second, and lands where it left after about 0.775 seconds. A double jump rises 3 gibsons from where it is pressed: it sets the upward speed to the larger of the upward speed the player has and `sqrt(2 * g * 3)`, which is exactly 20 gibsons per second. These are the numbers of ONOSENDAI's WALK in Cyberspace (play test of 2026-11-10). The base protocol defines no gravity, so this DECK defines them here.
- **Standing.** The player stands when a face that stops a walker lies under them, so that a step of one gibson down would cross it, or when the gibson under them is outside the region. The region's lowest layer is therefore a floor.
- **The arc.** A jump, a double jump, and a fall that starts from rest (upward speed 0) each follow `h(t) = h0 + v0 * t - g * t^2 / 2`, the height above the whole Y at which the arc began, `t` seconds after it began. The player is always at a whole gibson. While the arc rises, the player is at the highest whole gibson not above it. Once it has passed its top, the player is at the lowest whole gibson not below it, and never above the highest whole gibson the arc reaches. The player moves to each whole gibson in turn. When a face that stops a walker is in the way of the next gibson up, the rise ends there, and the player falls from rest. When the player comes down to a gibson where they stand, they land, and the arc ends.
- **JUMP.** Standing, with the gibson above free, a press of JUMP starts a jump. In the air, the first press of JUMP since the player left the floor is the double jump, from the height the arc is at. Later presses in the same time in the air do nothing. Landing gives the double jump back.
- **A level press**, along X or Z. In the air, it moves the player one gibson if that step is free, and the arc goes on from there. Standing, when the step is free, the player takes it and then **settles**: if they stand there, they stay; otherwise they go down one gibson, and then a second, stopping at the first where they stand; and if they stand at neither, they fall from rest at the gibson they stepped to. When the step is not free, the press climbs a riser: it lifts the player one gibson, if the gibson above is free, and tries the step from there, then a second gibson in the same way, and takes the first step that is free and settles. If neither lift gives a free step, the press is not taken.
- **Standing on nothing.** A player who stands on nothing, because a door opened under them for example, starts to fall from rest.

**`view`.** With `first-person`, the camera is at the player's game position, and the client does not draw the player. With `third-person`, the camera looks at the player's game position from a distance the client chooses, from the direction the player turns it to, and the client draws the player there. The player can turn the camera in either view (§9.4, Turning the camera). The default leaves the view to the client, as plain Cyberspace does.

**`facing`.** The horizontal direction the camera faces when the player appears at the entry point: along +X, -X, +Z or -Z. The default, `+z`, is the canonical view of `CYBERSPACE_V2.md` §11.3, facing the black sun. A teleport does not turn the camera.

**`find`.** Hidden things are found in a game as in Cyberspace: by being there. For each listed height, while the player's game position lies in the region of that height that holds it (an aligned cube inside the game's region, `CYBERSPACE_V2.md` §7.2), the client reads the game key's bags sealed to that region, by its `lookup_id` and with its region key, exactly as it reads the world (§5.1), and draws their items as part of the world. It reads a region's bags when the player comes into the region, and again only after the player has left it and come back. A game hides a key item this way (DECK-0004 §2), so that the player must reach its place to find it. The game's own height is not listed, since the bags at that height are the world itself (§5.1), and the default finds nothing else. A region key at a small height costs a moment (§5.2).

### 9.4 Primitives (layer 3)

A primitive is a standard part a game opts into by declaring it. None is on by default.

| Rule | Parameters | Single or repeatable |
|---|---|---|
| `dpad` | none | single |
| `joystick-move` | none | single |
| `joystick-orbit` | none | single |
| `jump` | none | single |
| `action` | optional: the take reach and the open reach, each a decimal from `0` to `64` | single |
| `pad` | `lo`, `hi` and `to`, game positions; optional: `beacon`, a decimal from `1` to `65536` | repeatable |
| `finish` | `lo` and `hi`, game positions | repeatable |
| `clock` | none | single |

`lo` and `hi` are the low and the high corner of a **box** of game positions, both corners included. Each coordinate of `lo` is at most the same coordinate of `hi`; a tag in which one is not is not well formed. The box is where the player's game position must be, not where a shard stands: a pad drawn on a floor at height `y` is stood on at `y + 1`.

#### Controls

A game that declares no control lets its player do nothing in the game but turn the camera and leave (§2.3). Each control is defined by the presses it makes, not by how it looks: a client draws it in its own way, and a client with no screen, an agent's for example, offers the same presses in its own way.

- **Direction presses.** A direction press is forward, back, left or right, relative to the camera. Forward is whichever of +X, -X, +Z and -Z is nearest the horizontal direction the camera faces; back is the reverse of forward; left and right are forward turned a quarter turn. In a mode that moves along Y (`fly`, or `walk` with gravity off), the controls that make direction presses also make UP (+Y) and DOWN (-Y). A held direction presses once at once, and then again every 110 milliseconds while it is held (the hold of ONOSENDAI's WALK), whatever the keyboard's own repeat does.
- **`dpad`:** four onscreen buttons for forward, back, left and right, and buttons for UP and DOWN in a mode that moves along Y. A client with a keyboard SHOULD also take W, A, S and D and the arrow keys for the four directions, and Space for UP and Shift for DOWN where they apply.
- **`joystick-move`:** an onscreen stick. Held away from its centre beyond a dead zone of the client's choosing, it makes the direction press nearest the way it is held, on the same hold of 110 milliseconds. In a mode that moves along Y it comes with buttons for UP and DOWN.
- **`joystick-orbit`:** an onscreen stick that turns the camera: left and right turn it about the Y axis, and up and down tilt it, at a rate of the client's choosing. It moves nothing.
- **Turning the camera.** Turning the camera by dragging on the game's view is the client's own, and always allowed, with or without `joystick-orbit`. Turning never moves the player.
- **`jump`:** a JUMP button, and the Space key on a keyboard. Each press is one JUMP (§9.3), and holding it does not repeat. A client shows it only while gravity applies to the player's mode; in a game whose gravity is off, a `jump` rule has no effect.
- **`action`:** one action button, which a client shows only while a tap can do something where the player stands, labelled with what it would do. It acts on the Cyberspace primitives of DECK-0004 in the game's world, and on nothing else:
  - **TAKE**, when an item (DECK-0004 §2) that the player does not hold lies within the take reach. A tap takes the items that lie within it, as DECK-0004 §2.2 describes taking: the client counts them among the items its user holds, and publishes nothing. The client then stops drawing them in the game.
  - **OPEN**, when a door or a chest (DECK-0004 §3) that is not open lies within the open reach, and the player holds an item whose public key is its lock (DECK-0004 §3.3). A tap opens it, as DECK-0004 says. A door's open look replaces its closed look (DECK-0004 §3.6), and its room's contents appear where they were hidden (DECK-0004 §3.7.3), drawn as part of the world and holding a walker as the world does. An opened chest's contents are listed for the player to take (DECK-0004 §3.4).
  - **LOCKED**, shown but not a button, when a door or a chest that is not open lies within the open reach and the player holds nothing that opens it.
  - When TAKE and another could both be shown, TAKE is shown. Nothing is taken or opened without a tap: walking into an item or a door does nothing.
  - **Reach.** A thing lies within a reach `r` when, on each of the three axes, the player's game position differs by at most `r` gibsons from the gibson just above the thing's `C`. The take reach is the first parameter and the open reach the second; without them, they are 2 and 3.
  - **What stays open.** What the player opens in a game stays open for the rest of that bracket, a reload or a return (§7) included. Every new entry starts with every door and chest of the game shut. A client does not carry what is opened in a game into Cyberspace, or what is opened in Cyberspace into a game. An item that was taken is held after the player leaves, as any item is (DECK-0004 §2.2), so a player who enters again already holds it.

#### Teleport pads: `pad`

A pad sends a player who stands in its box to its `to`.

- **When it sends.** After each press that moves the player, and after each landing (§9.3), the client checks whether the player's game position lies in the box of a pad. When it lies in the boxes of more than one, the first in reading order (§9.2) counts. The player is then sent: their game position becomes `to`, at rest (a jump or a fall ends, and the double jump is back), and the client signs a `teleport` (§4.1) whose `c` is where the player stood in the box and whose `C` is `to`. The player is sent whether or not the `teleport` is signed; a client that cannot sign it tells its player that the record failed.
- **What does not send.** Arriving at a pad's `to`, appearing at the entry point, and passing through a box in a jump or a fall without landing in it send nobody. A pad is checked only after a press or a landing, so one pad never sends the player straight on to another.
- **Drawing.** A client SHOULD draw a mark at every pad, so that a pad is found even where the world has no shard for it. For a pad with a `beacon`, it SHOULD also draw a column of light that many gibsons tall rising from the box, so that the pad is seen from afar.

A pad whose box lies on the region's lowest layer catches a walker who falls out of the built world under gravity, since that layer is a floor (§9.3). This is how a game gives a fallen player a way back without a rule of its own.

#### Finish: `finish`

The player **clears** the game the first time their game position lies in the box of a finish, checked after every change of position: a press, a step of a jump or a fall, and a teleport. Clearing ends play. The clock stops (below), and the client shows that the game is cleared, with the clear time when the game has a clock, and offers to leave. It takes no more presses and shows no action button, and it does not leave by itself. A clear is kept on the player's device for the bracket and is not published. It is not a verdict of anyone's but the player's own client, and nothing on the chain says it happened (`CYBERSPACE_V2.md` §8.11.7). A game whose clears must be checked publishes and anchors its play (§6), or runs an arbiter (§8).

#### Clock: `clock`

The client shows a clock that counts up from the moment the player appears at the entry point, and stops when the player clears the game. It shows minutes, seconds and tenths of a second as `M:SS.t`, the tenths cut, not rounded. The client keeps the time on its device for the bracket, so that a reload or a return keeps it. A client that did not see the entry counts from the entry's `created_at`. The clock is something to show, never a verdict: a game decides no verdict by `created_at` (`CYBERSPACE_V2.md` §8.11.7). In a game with no finish, the clock runs until the player leaves.

### 9.5 A rule a client cannot follow (normative for clients that support this section)

A client that supports this section follows every rule it defines, the controls in the client's own form (§9.4). A rule it cannot follow is therefore one whose name this section does not define: a name from a later revision of this DECK, or a custom feature (§9.6).

- **A `rule` tag with such a name** makes the game one the client cannot play. The client MUST NOT start the game by its declared rules: it does not enter in-game mode for it (§2.3). It SHOULD tell its player that the game needs something this client cannot do, and name the rule, and when the bracket is already open it SHOULD offer to leave (§7). It SHOULD find this out before it signs the entry, and not enter (§9.2, Before publishing). A client that carries code of its own for the game MAY play it by that code instead.
- **An `optional-rule` tag with such a name** is skipped. The client plays the game without it, and MAY tell its player what it left out.
- **A tag that is not well formed** is skipped, whether it is a `rule` or an `optional-rule` tag (§9.2), and the game is played without it.

**Why a required rule stops the game (non-normative).** A game played without a rule it relies on is a different game, and the player cannot tell from inside it: a dungeon without its gravity is flown over in a minute, and a course without its finish never ends. Saying so, before the entry where possible, costs the player nothing, while playing wrong without a word costs the game its meaning. The chain is safe either way, since an exit is always valid (§7). Most rules are required, so the required tag has the short name, and a game marks as `optional-rule` only what it can be played without, so that it still reaches clients that lack those rules.

### 9.6 Custom features (layer 4, not defined at this revision)

Kinds of play that Cyberspace does not have, such as flying a craft, driving, or a new kind of view, are left out of this revision. The extension point is the rule name. A later revision of this DECK may define new names, and their parameters, beside those of §9.3 and §9.4, and nothing else in this section changes for it. A client written before a name existed reads it as §9.5 says: it does not start a game that requires it, and it plays a game that marks it optional without it. A new feature therefore never makes an older client play a game wrong. Every name that this DECK has not defined is reserved for later revisions of it; whether a game may coin a name of its own without waiting for a revision, and how, is left open (§12).

### 9.7 Why the rules look like this (non-normative)

- **Why tags on items of the world.** The rules are the game's, so they live where its entry point lives, for the same reasons (§2.2): there is no game event (arkinox, 2026-10-02), the world is the one place every client already reads with a key it already has, and a game changes its rules by republishing its bag, as it changes anything else in its world. They are as visible as the world is, to anyone who computes the region's key (§5.3). A tag on the `enter-virtual` action would have let every player write their own rules.
- **Why only signed items.** Every client that plays a game must read the same rules from the same bag, or two players play two games. A rumor can be dropped by one reader and kept by another (`CYBERSPACE_V2.md` §7.6), and a signature cannot.
- **Why short closed lists.** The owner's direction is a small set of settings and primitives, defined once, that games opt into (2026-11-13). Every name in the lists is one that two clients must perform the same way, and every one has been played, in the tutorial dungeon (§9.8). A name nobody has played yet would be a guess at a game nobody has written.
- **Why a gibson a press.** Game positions are whole gibsons (§3), and a gibson is the step of every walker (DECK-0003 §1.12). Finer or smoother movement is a custom feature.
- **Why the action button acts only on DECK-0004.** Keys and locks are Cyberspace primitives (owner, 2026-11-13). A game gets them by placing a key item and a door in its world, and they then behave in the game as they do in Cyberspace. The button is only the tap that takes or opens them.

### 9.8 Example: the tutorial dungeon's rules (non-normative)

The tutorial dungeon of §10 is played today by ONOSENDAI's own code. These are its rules, declared. A client that supports this section plays the same dungeon from them, with no code of its own for it.

Its region has height 6, a cube 64 gibsons on a side, with base `R`, in ideaspace. Below, `<R+(x, y, z)>` stands for the 64 hex characters of the game position `x`, `y` and `z` gibsons from `R`'s base along X, Y and Z, in `R`'s plane.

| Rule | What it says |
|---|---|
| `["rule", "mode", "walk"]` | The player walks, and only walks. The world's walls hold them. |
| `["rule", "gravity", "on"]` | Gravity, the jump of 5 and the double jump of 3. A fall ends on a floor, or on the region's lowest layer. |
| `["rule", "view", "third-person"]` | The camera follows behind the player. |
| `["rule", "facing", "-z"]` | The player first faces down the arrival hall, toward the shrine and its pad. |
| `["rule", "find", "3"]` | The key item lies in a bag of the game key's sealed to the region of height 3 around the top platform (offsets 32 to 39, 24 to 31 and 40 to 47). The client reads it when the player reaches that region. |
| `["rule", "dpad"]` | Forward, back, left and right. With gravity on there is no UP or DOWN. |
| `["rule", "jump"]` | JUMP, and the double jump. |
| `["rule", "action"]` | TAKE the key item within 2, OPEN the gate within 3. The gate is a DECK-0004 door in the world bag, sealed to the key item, and its room holds the finish tile. |
| `["rule", "pad", "<R+(7, 18, 23)>", "<R+(9, 18, 25)>", "<R+(40, 17, 45)>"]` | The pad by the arrival shrine (its shard at (8, 17, 24)) sends the player to the climb, which nothing else joins to the arrival. |
| `["rule", "pad", "<R+(39, 0, 39)>", "<R+(41, 0, 41)>", "<R+(8, 17, 45)>", "15"]` | The way back for a player who climbed out through the rotunda's open oculus and fell: a pad on the region's lowest layer, under the oculus, with a column of light 15 gibsons tall, that sends them to the entry point. The world has no shard for it. |
| `["rule", "finish", "<R+(38, 17, 6)>", "<R+(42, 19, 10)>"]` | Standing on the checkered tile in the exit shrine clears the dungeon. The box starts one gibson below where a player stands on the tile, so that a player whose client could not read the gate's room, and who has no tile to stand on, still clears from the shrine's floor. |
| `["rule", "clock"]` | The clear time, from the entry to the finish. |

All of them on one item, the entry marker, signed by the game key `G`:

```json
{
  "kind": 3330,
  "pubkey": "<G>",
  "created_at": 1794500000,
  "tags": [
    ["C", "<R+(8, 17, 45)>"],
    ["entry"],
    ["rule", "mode", "walk"],
    ["rule", "gravity", "on"],
    ["rule", "view", "third-person"],
    ["rule", "facing", "-z"],
    ["rule", "find", "3"],
    ["rule", "dpad"],
    ["rule", "jump"],
    ["rule", "action"],
    ["rule", "pad", "<R+(7, 18, 23)>", "<R+(9, 18, 25)>", "<R+(40, 17, 45)>"],
    ["rule", "pad", "<R+(39, 0, 39)>", "<R+(41, 0, 41)>", "<R+(8, 17, 45)>", "15"],
    ["rule", "finish", "<R+(38, 17, 6)>", "<R+(42, 19, 10)>"],
    ["rule", "clock"],
    ["-"]
  ],
  "content": "<the entry marker's SNO payload>"
}
```

A run, read from these rules: the player appears on the entry star facing -Z, with the clock running; walks the hall and steps onto the shrine's pad, which signs the dungeon's one `teleport`; jumps up four platforms; reaching the top platform's region reads the key bag, and TAKE takes the key item; walks to the gate, where OPEN opens the door and its room shows the finish tile; walks onto the tile, which clears the dungeon and stops the clock; and leaves with EXIT GAME. A player who falls out through the oculus lands on the region's lowest layer, finds the pad under the column of light, and is sent back to the entry point with a second `teleport`.

The dungeon's world as published on 2026-11-14 carries its entry marker as a rumor of the game key. That counts for the entry point (§2.2), but not for rules (§9.2). Declaring these rules means publishing the world bag again with the marker signed, as above, and nothing else in the world changes. What the dungeon draws besides, such as the gold ring that marks the key from below and the words it shows when the key bag cannot be read, is ONOSENDAI's own presentation, and needs no rule.

## 10. Example: the tutorial dungeon (non-normative)

A newcomer to ONOSENDAI finishes the first-arrival tutorial and chooses the dungeon. The tutorial game's pubkey is `G`; its region is a cube of height 6 (64 gibsons on a side) whose base is `R`; the newcomer stands at `P`, where their last hop left them.

1. Their client confirms the head and signs the entry: `A` `enter-virtual`, `c` and `C` both `P`, `region` `R` with height `6`, and `p` `G` marked `game`.
2. It reads the world: the bags signed by `G` with `d` equal to the `lookup_id` of the region, opened with the region key. It draws their shards, a sealed stone chamber and a teleport pad, in place of cyberspace.
3. It shows the newcomer at the entry point: the `C` of the world's item with the `entry` tag, a small marker on the chamber's floor. Nothing is signed for it. The dungeon is far from `P`; the newcomer appears there through the game, not across cyberspace, and on the chain they still stand at `P`.
4. The tutorial game lets them move a gibson a press, on their device, publishing nothing, and holds them at its walls: that is this game's own choice (§6.2), which it can declare in its world as rules (§9.8).
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

## 11. Security considerations

- **Unanchored play is not verified** (§6). A modified client does anything in play that is neither on the chain nor anchored. Only chain actions and anchored runs can be checked, and only by a game that holds the run and checks it.
- **An anchor commits, it does not reveal.** A run hash proves nothing until someone produces the ephemeral actions it covers, and relays do not keep them. A game that wants to check later keeps them itself, or has the player keep them.
- **The game key owns the world.** Whoever holds the game key can rewrite the world, add to it or empty it, since the world is that key's bags (§5). A game keeps its key as carefully as an identity.
- **The world is visible from cyberspace** to anyone in the region who computes its key (§5.3).
- **Playing is public.** Every entry names the game in the clear, and relays index it, so anyone can list who entered which game and when (`CYBERSPACE_V2.md` §8.11.1). Every game action stays on the player's chain for good.
- **Game actions are other people's text.** A client that reads another player's game actions reads their tags as data. A game action names no command for any reader.
- **Declared rules are applied by the player's own client** (§9.2). Nothing checks that a client followed them: a modified client can ignore gravity, walk through walls or stop the clock early, as it can do anything in play that is not on the chain or anchored (§6.2).
- **A malformed rule fails open** (§9.2, §9.5). A tag that is not well formed is skipped, and the game is played without it, even when it is a `rule` tag. A game checks its rule tags before it publishes its bag.
- **Declared rules are the game key's text.** A client reads rule tags as data: words from the lists of §9.3 and §9.4, decimals and coordinates. It shows an unknown rule's name only as text (§9.5).

## 12. Open questions (non-normative)

1. **A signing key for ephemeral actions.** A remote signer cannot sign ten actions a second. The design notes propose a short-lived key that the `enter-virtual` action names and that signs the player's ephemeral actions; that needs a tag on the entry, read only by games. Left for a game that needs it.
2. **A relay for a game's traffic.** Ephemeral actions from many players are heavy for a general relay. A game could name one; left for a game that needs it.
3. **A world unseen from cyberspace.** The world is visible to anyone standing in the region (§5.3). If a game must hide it, its bags could be sealed with a key derived from both the region key and the game's pubkey. That is a new derivation, left out until a game asks for it.
4. **Controls on the wire.** Answered for the standard controls by the rules section (§9.4): a game declares them in its world. Controls outside that list remain each game's own until two games share them.
5. **Collision as a shared default.** Answered for games that declare rules: the `walk` mode holds the player at faces, and the `fly` mode does not (§9.3). A game that declares no rules still decides for itself.
6. **Rule names of a game's own.** Every rule name this DECK has not defined is reserved for its later revisions (§9.6). A game that wants a custom feature before a revision defines it could coin a name under a prefix of its own, which every client written before it would read as a rule it cannot follow (§9.5). Left out until the first custom feature is wanted.
