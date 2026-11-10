# Cyberspace glossary

**Status:** Reference, 2026-11-10
**Decided by:** arkinox. Names of 2026-11-10 for locks and keys, and the Seeds vocabulary of the same day.
**Applies to:** `CYBERSPACE_V2.md`, DECK-0001 and DECK-0003 to DECK-0007 (merged), DECK-0008 Seeds (draft, PR #91)

This is the one place to look up a Cyberspace term. It is for the protocol's author, for builders and for agents.

In his words, "naming things is important", and, about a term, "ill probably forget what it means eventually".

Nothing here changes the protocol. Where this page and the spec disagree, the spec is right and this page is a bug.

---

## How to read an entry

Each term starts with its status, then one plain sentence. At most two more lines follow: where it comes from or how you get it, and the section that defines it.

| Badge | Meaning |
|---|---|
| `spec` | Merged on master: in `CYBERSPACE_V2.md` or in a merged DECK. A merged DECK's own header may still say "Status: Draft"; that is the DECK's maturity, not whether its text is merged. |
| `DECK draft` | In a DECK that is still an open pull request. The name may change and the wire format is not settled. |
| `ruled design` | A name arkinox has ruled that is not in the spec yet. It is not wire format. Do not write it into events. |

**Wire:** marks the exact word used in events or in spec text, where it differs from the word players and clients use.

## Wire names and player names

| Players and clients say | The wire or the spec says | Note |
|---|---|---|
| region key | `location_decryption_key` (spec §7.2), "location key" (DECK-0004) | Not "place key", which was considered and dropped on 2026-11-10. |
| key item | `kind 3340`; "item" in DECK-0004's Terms | The spec's §7.6 already says "key item". Everywhere else "item" means any event carried in a bag. |
| door | `kind 3341` with a `["door", "<height>"]` tag | A door is a chest with one more tag. |
| bag | `kind 33330`, "encrypted content event" (§8.6) | |
| shard | `kind 3330` inline, or a hidden `kind 33331` by reference | SNO itself says "object". |
| room (behind a door) | DECK-0004 §3.7 | DECK-0005 also says "room" for any chat region. See [Chat room](#chat-room). |
| keyring | ONOSENDAI's REGION KEYS panel (ruled to become KEYRING) | The spec's §7.8 calls holding "a keyring". See [Keyring](#keyring). |
| height tag | `H` (was `h` before 2026-10-21) | |
| board, ride | `enter-hyperspace`, `hyperjump` | |
| derezz | a respawn | No event, action or tag performs one. |
| lock | DECK-0004's `lock` tag holds one public key | The ruled meaning is wider. See [Lock](#lock). |
| derived from a place | `cyberspace:region`, the fourth element of an `encrypted` tag | It covers region keys and room keys. There is no `cyberspace:room` and no `cyberspace:item`. See [`cyberspace:region`](#cyberspaceregion). |

## Contents

- [Places and movement](#places-and-movement)
- [Keys, locks and rooms](#keys-locks-and-rooms)
- [Bags and what's in them](#bags-and-whats-in-them)
- [Objects (SNO, shards)](#objects-sno-shards)
- [Seeds](#seeds)
- [Chat, comments, audio](#chat-comments-audio)
- [Hyperspace and Bitcoin](#hyperspace-and-bitcoin)
- [Relays and kinds](#relays-and-kinds)

---

## Places and movement

#### Cyberspace

`spec` A 256-bit space that you move through by doing math, where your nostr key is the place you start.

Movement costs work that grows with distance, and no administrator can move or delete anyone. [What This Document Is](../CYBERSPACE_V2.md#what-this-document-is)

#### Gibson

`spec` The smallest distance in cyberspace: one step along one axis.

Written G. In dataspace a height-34 cube is about 2 meters, so a gibson is about the size of an atom. [§2.1](../CYBERSPACE_V2.md#21-a-256-bit-universe), [§7.3](../CYBERSPACE_V2.md#73-discovery-radius-non-normative)

#### Coordinate

`spec` A 256-bit number that names one point: an X, a Y and a Z of 85 bits each, plus a plane bit.

The axis bits are interleaved. It is written as 64 lowercase hex characters, and events carry it in the `C` tag. [§2.1](../CYBERSPACE_V2.md#21-a-256-bit-universe), [§2.2](../CYBERSPACE_V2.md#22-bit-layout-normative)

#### Plane

`spec` The lowest bit of a coordinate, which says whether it is in dataspace (0) or ideaspace (1).

[§2.4](../CYBERSPACE_V2.md#24-two-planes-dataspace-and-ideaspace)

#### Dataspace

`spec` The plane that maps onto the real Earth through GPS.

[§2.4](../CYBERSPACE_V2.md#24-two-planes-dataspace-and-ideaspace), [§9.2](../CYBERSPACE_V2.md#92-dataspace-cube-size-cantor-height-34-scale)

#### Ideaspace

`spec` The plane with no physical meaning.

Hyperspace ports sit here. [§2.4](../CYBERSPACE_V2.md#24-two-planes-dataspace-and-ideaspace)

#### Region

`spec` A cube 2^h gibsons on each side, in one plane, whose lowest corner sits on a multiple of 2^h.

Everyone computes the same regions without talking to each other, and every key belongs to one region. **Wire:** on one axis the spec calls it an "aligned subtree". [§4.5](../CYBERSPACE_V2.md#45-aligned-subtrees), [§4.7](../CYBERSPACE_V2.md#47-combining-into-3d-region_n)

#### Height

`spec` The power of two that sets a region's size: a region of height h is 2^h gibsons on a side.

A bag, a door and a chat room each name one height. A bag's height is at least 1. [§4.4](../CYBERSPACE_V2.md#44-lowest-common-ancestor-lca-height), [§7.6](../CYBERSPACE_V2.md#76-the-bag-normative)

#### Prefix region

`spec` Every coordinate whose hex starts with a given string.

It has no key and is not a region. Shorter than 64 characters, it leaves the plane open. [§2.5](../CYBERSPACE_V2.md#25-hex-prefixes-normative)

#### Sector

`spec` A cube 2^30 gibsons on each side, about 12.5 cm in dataspace, used to ask relays what is where.

**Wire:** the `X`, `Y`, `Z` and `S` tags. [§10](../CYBERSPACE_V2.md#10-sectors-and-spatial-querying)

#### Spawn

`spec` The first event of your movement chain, which puts you at the coordinate equal to your public key.

**Wire:** `["A", "spawn"]` on a `kind 3333` event. [§3.2](../CYBERSPACE_V2.md#32-the-spawn-event), [§8.3](../CYBERSPACE_V2.md#83-spawn-event-first-event)

#### Movement chain

`spec` The line of signed movement events you publish, each naming the one before it; its newest valid event is where you are.

**Wire:** `kind 3333`, linked by `e` tags marked `genesis` and `previous`. [§8](../CYBERSPACE_V2.md#8-nostr-integration-the-movement-chain), [§8.7.3](../CYBERSPACE_V2.md#873-resolving-a-chain-normative)

#### Hop

`spec` A move paid for by computing Cantor trees over the boundary you cross.

Its proof has been residue openings since chain rules revision `2026-10-08-residue-openings`. [§4](../CYBERSPACE_V2.md#4-movement-cantor-pairing-trees), [§8.4](../CYBERSPACE_V2.md#84-hop-event)

#### Sidestep

`spec` A move of one gibson across a large boundary, paid for with a hash tree instead of a Cantor tree.

Above about h16 it is faster than a hop, and it is how walls are crossed. [§6.2](../CYBERSPACE_V2.md#62-how-the-sidestep-action-works), [§8.5](../CYBERSPACE_V2.md#85-sidestep-event)

#### Toll

`spec` The rule that a sidestep's work is tied to the mover's own chain, so nobody can reuse it or sell it.

A hop is not a toll: its root can be shared. [§6.2](../CYBERSPACE_V2.md#62-how-the-sidestep-action-works), [§6.12](../CYBERSPACE_V2.md#612-entering--claiming-non-normative)

#### LCA height

`spec` The height of the smallest region that holds both ends of a move along one axis, which sets what the move costs.

A one-gibson step across a big power-of-two boundary has a large one. [§4.4](../CYBERSPACE_V2.md#44-lowest-common-ancestor-lca-height)

#### Cantor pairing

`spec` A way to turn two whole numbers into one without losing either.

Pairing a region's positions up a tree is the work of a hop. [§4.2](../CYBERSPACE_V2.md#42-the-cantor-pairing-function)

#### Root

`spec` The single number at the top of a region's Cantor tree on one axis, which names that region at its height.

**Wire:** "axis root", "Cantor root". A root prefix proves nothing about possession. [§4.6](../CYBERSPACE_V2.md#46-computing-the-axis-root), [§4.9](../CYBERSPACE_V2.md#49-five-properties-unique-to-this-design-non-normative)

#### Region integer

`spec` The one number made by pairing a region's three axis roots; hashing it gives the region key.

**Wire:** `region_n`. [§4.7](../CYBERSPACE_V2.md#47-combining-into-3d-region_n)

#### Decomposition invariance

`spec` Breaking a move into small steps never makes it cheaper.

At least one step always crosses the same boundary the whole move does. [§4.8](../CYBERSPACE_V2.md#48-why-you-cant-cheat-distance-decomposition-invariance)

#### Wall

`spec` A boundary so high that the Cantor tree to cross it will not fit in any storage.

Nobody designed walls. A sidestep or hyperspace gets past them. [§6.1](../CYBERSPACE_V2.md#61-the-storage-bottleneck-non-normative)

#### Continents

`spec` The parts of space a given machine can cross, bounded by the walls it cannot.

They are different for every machine and every budget. [§6.13](../CYBERSPACE_V2.md#613-natural-continents-non-normative)

#### Temporal axis

`spec` An extra Cantor tree on every hop, seeded by your previous event, so the work of a hop can never be reused.

It is not part of any key. [§5.1](../CYBERSPACE_V2.md#51-the-problem-cacheable-spatial-roots), [§5.3](../CYBERSPACE_V2.md#53-temporal-axis-seed-and-root-normative)

#### Terrain

`spec` A number from 0 to 16 for every place, which makes some places harder to hop into than others.

**Wire:** `K`, the height of the temporal tree. It comes from hashing the destination at four cell sizes, and averages 8. [§5.2](../CYBERSPACE_V2.md#52-terrain-derived-temporal-height-k-normative)

#### Residue openings

`spec` The hop's proof: the mover seals a long list of remainders of its work, and shows 16 of them that a verifier checks quickly.

Version 2 of the hop proof. [§5.9](../CYBERSPACE_V2.md#59-residue-openings-normative), [§5.10](../CYBERSPACE_V2.md#510-the-seal-the-re-roll-price-and-the-openings-normative)

#### Respawn

`spec` Publishing a new spawn, which ends your old chain and puts you back at your spawn coordinate.

The newest spawn always starts the active chain, valid or not. [§3.2](../CYBERSPACE_V2.md#32-the-spawn-event)

#### Derezz

`spec` The common name for having respawned.

It names a state, not a mechanism. No event, action or tag performs one, and nothing anyone else publishes can cause one. [§3.2](../CYBERSPACE_V2.md#32-the-spawn-event)

#### Frozen chain

`spec` A chain with an invalid event, where you stand at your last valid position until you respawn.

Nothing published later on that chain can move you. [§3.2](../CYBERSPACE_V2.md#32-the-spawn-event)

#### Dead chain

`spec` A chain whose newest spawn is invalid, or that has forked, where you stand at your spawn coordinate until you respawn.

A fork is two different events that both name the same event as previous. [§3.2](../CYBERSPACE_V2.md#32-the-spawn-event), [§8.7.3](../CYBERSPACE_V2.md#873-resolving-a-chain-normative)

#### Virtual bracket

`spec` A pair of events that holds your place in cyberspace while you play a game.

**Wire:** `enter-virtual` and `exit-virtual`. What happens between them belongs to the game, which is named by a pubkey. [§8.11](../CYBERSPACE_V2.md#811-virtual-brackets-normative)

#### Validity and liveness

`spec` The protocol decides whether a chain is valid; a game decides whether a player is alive; neither asks the other.

A game may read Bitcoin block headers as its clock, never `created_at`. [decks/README.md, Game mechanics](../decks/README.md#game-mechanics)

---

## Keys, locks and rooms

```
  key item (kind 3340)                     region key
  you took it from a bag                   you computed the place (spec §7.2)
        |                                        |
        | its secret opens                       |
        v                                        |
  door (kind 3341 + "door" tag)                  |
  a chest locked to the key item,                |
  standing in a bag                              |
        |                                        |
        | its one entry                          |
        v                                        v
  door secret (32 random bytes) -------> room key = SHA-256("cyberspace:door"
                                                     || region key || door secret)
                                                 |
                                                 | opens
                                                 v
                                         room bag (kind 33330, d = SHA-256(room key))
                                         what the room holds appears where it was hidden
```

A secret room (`ruled design`) is the right half of this picture with a key you already carry in place of the door secret, so it needs no door.

#### Key

`ruled design` Anything you hold that a lock can ask for.

There are three kinds: region key, room key and key item. Ruled 2026-11-10, to be written into DECK-0004 §3.8 and §3.9.

#### Region key

`spec` The key you get by computing a place, which opens every ordinary bag hidden there.

**Wire:** `location_decryption_key` in the spec, "location key" in DECK-0004. It is the same for everyone who does the work, whether they walked there or computed it from anywhere. [§7.2](../CYBERSPACE_V2.md#72-key-derivation-normative)

#### Lookup id

`spec` The public hash of a region key, which a bag carries so people with the key can find it.

**Wire:** the bag's `d` tag. Seeing it does not give you the key. [§7.2](../CYBERSPACE_V2.md#72-key-derivation-normative)

#### Discovery scanning

`spec` Computing the region keys around where you stand, one height at a time, to find what is hidden there.

ONOSENDAI's passive scan reaches h12; consumer hardware reaches about h16 for a sub-second scan. [§7.4](../CYBERSPACE_V2.md#74-discovery-scanning-recommended)

#### Discovery radius

`spec` How far away a bag can be found from, which its height sets.

In dataspace a bag at h34 is found within about 2 meters, and one at h50 from anywhere in a city. [§7.3](../CYBERSPACE_V2.md#73-discovery-radius-non-normative)

#### Holding

`spec` Keeping a region's whole Cantor trees on disk, so every key inside it is quick to make.

It buys speed, about 4.9 times, and nothing exclusive. The spec calls it "a keyring, not a claim". [§7.8](../CYBERSPACE_V2.md#78-holding-a-region-non-normative)

#### Key item

`spec` A keypair hidden at a place: whoever reads its secret holds it, and it opens chests and doors locked to its public key.

**Wire:** `kind 3340`, the secret in a `secret` tag. DECK-0004's Terms call it "item". [DECK-0004 §2](../decks/DECK-0004-items-and-chests.md#2-the-item-kind-3340-normative)

#### Item listing

`spec` A public event that shows a key item's name, picture and public key, never its secret, so others can lock things to it.

**Wire:** `kind 33340`, with a proof signed by the item's own key. ONOSENDAI shows them in the ITEM FEED. [DECK-0004 §4](../decks/DECK-0004-items-and-chests.md#4-the-item-listing-kind-33340-normative)

#### Taking

`spec` Keeping something you found in your own records.

Taking removes nothing, and a client may ask you to take a key item before it opens anything for you. [DECK-0004 §2.2](../decks/DECK-0004-items-and-chests.md#22-reading-an-item), [§3.4](../decks/DECK-0004-items-and-chests.md#34-contents)

#### Lock

`ruled design` What a chest, a door or a room asks for: the place, plus zero, one or two more keys.

**Wire:** today DECK-0004's `lock` tag holds one public key, an item's or a person's; that narrower meaning is the spec's. A region key becoming a lock is ruled as the first slice. Ruled 2026-11-10.

#### Locked and open

`ruled design` The two states of anything behind a lock.

OPEN is already the button. Ruled 2026-11-10.

#### Chest

`spec` A sealed list of things that opens for whoever holds its lock, and whose contents you take.

**Wire:** `kind 3341`, sealed with NIP-44 to the lock. A chest sealed to a person's key is a gift. [DECK-0004 §3](../decks/DECK-0004-items-and-chests.md#3-the-chest-kind-3341-normative)

#### Door

`spec` A chest that locks a room instead of holding things to take.

**Wire:** `kind 3341` with `["door", "<height>"]`. It always stays inline in its bag, never in a chest or a sealed entry. [DECK-0004 §3.7](../decks/DECK-0004-items-and-chests.md#37-doors)

#### Room

`spec` The region a door locks: the region of the door's height that holds the door.

A door locks one height only. Not the chat "room" of DECK-0005. [DECK-0004 §3.7.1](../decks/DECK-0004-items-and-chests.md#371-shape)

#### Door secret

`spec` The 32 random bytes sealed inside a door, as its one entry.

**Wire:** `["room", "<64 lowercase hex>"]`. A room has one door secret, shared by all of its doors. [DECK-0004 §3.7.1](../decks/DECK-0004-items-and-chests.md#371-shape), [§3.7.5](../decks/DECK-0004-items-and-chests.md#375-more-than-one-door-to-a-room)

#### Room key

`spec` The key of a room bag, made from the region key and the door secret together, which you get when you open a door.

**Wire:** `SHA-256("cyberspace:door" || location key || door secret)`. The string `cyberspace:door` is a hash prefix, not a tag value. [DECK-0004 §3.7.2](../decks/DECK-0004-items-and-chests.md#372-the-room-key-and-the-room-bag)

#### Room bag

`spec` The bag that holds what is hidden in a room, which only the room key opens.

**Wire:** an ordinary `kind 33330` with no height, hint, sector or contents tag, signed by the door's signer. [DECK-0004 §3.7.2](../decks/DECK-0004-items-and-chests.md#372-the-room-key-and-the-room-bag)

#### Changing the lock

`spec` Giving a room a new door secret, so people who opened it before are shut out of what comes next.

It does not take back what they already read. [DECK-0004 §3.7.7](../decks/DECK-0004-items-and-chests.md#377-changing-the-lock)

#### Secret room

`ruled design` A room with no door, which opens for anyone who arrives carrying the right keys.

It uses the room key formula with a key you carry in place of the door secret, so its builder must hold every key it names. A door with the look NONE builds one. Ruled 2026-11-10.

#### Keyring

`ruled design` All the keys you carry: region keys, room keys and key items.

ONOSENDAI's REGION KEYS panel becomes KEYRING. The spec's §7.8 already says "keyring" for holding, which is the same idea for region keys only. Ruled 2026-11-10.

#### Carry

`ruled design` To have a key on your keyring, so it goes wherever you go.

A key carried from one place can open a secret room at another. Ruled 2026-11-10.

#### Reveal

`ruled design` The moment a secret room appears because of a key you carried.

It was "bloom" in the design draft; Seeds owns that word. Ruled 2026-11-10.

---

## Bags and what's in them

#### Bag

`spec` Everything one author hides in one region at one height, in one encrypted event.

**Wire:** `kind 33330`, addressable by its lookup id, AES-256-GCM under the region key. The author changes it by publishing a newer one. [§7.6](../CYBERSPACE_V2.md#76-the-bag-normative), [§8.6](../CYBERSPACE_V2.md#86-encrypted-content-event-bag)

#### Entry

`spec` One thing in a bag's list: either an item carried inline or a reference to an event published elsewhere.

**Wire:** a bag's plaintext is a JSON array, the "list of entries". Anything else is opaque. [§7.6, Plaintext](../CYBERSPACE_V2.md#76-the-bag-normative)

#### Item

`spec` A nostr event carried inside a bag or a chest.

It may be signed or a rumor. DECK-0004 also uses "item" for the key item. [§7.6, Items](../CYBERSPACE_V2.md#76-the-bag-normative)

#### Rumor

`spec` An item with an id and no signature, which counts as written by the bag's or chest's author when its pubkey matches.

The word is NIP-59's. Messages, chat lines and hidden audio are rumors, so nobody can lift one out and show it as a signed note. [§7.6, Rumors](../CYBERSPACE_V2.md#76-the-bag-normative)

#### Protected item

`spec` An item marked so that relays refuse a copy published by anyone but its author.

**Wire:** NIP-70's `["-"]`. Never on a bag or on a referenced event. [§7.6, Protected items](../CYBERSPACE_V2.md#76-the-bag-normative)

#### Reference

`spec` An entry that names an event published on its own, so the bag stays small.

**Wire:** an `a` or `e` tag, with the entry's exact coordinate as a fourth element. [§7.6, References](../CYBERSPACE_V2.md#76-the-bag-normative)

#### Partially encrypted event

`spec` A published event with a public preview in its `content` and its real content in an `encrypted` tag.

The shape is Fanfares' NIP FF-1. Hidden objects, sealed entries, sealed comments and tends use it. [§7.6, References](../CYBERSPACE_V2.md#76-the-bag-normative)

#### Sealed entry

`spec` One bag entry moved out into an event of its own, sealed with the bag's key, so a full bag has room.

**Wire:** `kind 33335`, a fresh random `d` each time. A door is never a sealed entry. [§7.6, Sealed entries](../CYBERSPACE_V2.md#76-the-bag-normative)

#### Missing entry

`spec` A reference that cannot be fetched or opened.

A reader says something was found and could not be retrieved, not that nothing was found. [§7.6, References](../CYBERSPACE_V2.md#76-the-bag-normative)

#### Hint

`spec` An optional public box that says roughly where a bag is, with one height per axis.

**Wire:** `["hint", "<coord_hex>", "<Hx>", "<Hy>", "<Hz>"]`. The hider sizes the box to set how hard the search is. [§7.7](../CYBERSPACE_V2.md#77-hints-optional)

#### Contents

`spec` An optional public statement of what kinds of things a bag holds, and how many.

**Wire:** `contents` tags with the kinds `shard`, `message`, `key`, `chest`, `cashu`, `nft`, `audio` and `door`; the Seeds draft adds `seed` and `dna`. It is a claim. [§7.7](../CYBERSPACE_V2.md#77-hints-optional)

#### Riddle

`spec` Plain text in a bag's public `content` for anyone to read.

The protocol does not interpret it. [§7.7](../CYBERSPACE_V2.md#77-hints-optional), [§8.6](../CYBERSPACE_V2.md#86-encrypted-content-event-bag)

#### Height tag

`spec` The optional public tag that says a bag's height.

**Wire:** `H`. It was `h` until 2026-10-21, when NIP-29's use of `h` broke it; readers still fall back to `h`. [§8.6](../CYBERSPACE_V2.md#86-encrypted-content-event-bag)

#### Lineage

`spec` The id of an item's first version, which a moved item carries so comments and tends stay with it.

**Wire:** a `d` tag on the moved item. [DECK-0006 §2.2](../decks/DECK-0006-sealed-comments.md#22-a-moved-item)

#### Seal

`spec` A word the spec uses for five different things, so check which one is meant.

The hop proof's Merkle root (§5.10); sealing a chest (DECK-0004 §3.2); a sealed entry; a sealed comment (DECK-0006); NIP-59's seal, `kind 13`. Ruled 2026-11-10 to stay a verb in the interface and never name a lock. [§5.10](../CYBERSPACE_V2.md#510-the-seal-the-re-roll-price-and-the-openings-normative)

---

## Objects (SNO, shards)

#### SNO

`spec` Simple Nostr Objects: the small JSON format for a 3D object that fits inside one nostr event.

Vertices on a lattice, one color each, optional triangles. No textures and no file to fetch. [DECK-0003](../decks/DECK-0003-sno.md#abstract)

#### Object

`spec` One SNO payload: its vertices, colors and faces, and the other objects it places, if any.

[DECK-0003 §1](../decks/DECK-0003-sno.md#1-the-object-normative)

#### Shard

`spec` Cyberspace's name for an object hidden at a place.

**Wire:** a `kind 3330` item inline, or a hidden `kind 33331` by reference. SNO dropped the old `type: "shard"` field. [DECK-0003 §3.2](../decks/DECK-0003-sno.md#32-inside-a-bag)

#### Standalone object

`spec` An object published in the open, which its author can keep editing.

**Wire:** `kind 33331`, addressable by its `d`. [DECK-0003 §3.1](../decks/DECK-0003-sno.md#31-a-standalone-object-kind-33331)

#### Hidden object

`spec` An object published as its own event with its payload encrypted to a place, and named from a bag by reference.

**Wire:** `kind 33331` with an `encrypted` tag. It carries nothing that says where it is. [DECK-0003 §3.4](../decks/DECK-0003-sno.md#34-a-hidden-object-as-its-own-event)

#### Public shard

`spec` A shard placed in the open instead of hidden.

**Wire:** `kind 33332`, reserved and not yet specified. [decks/README.md, Reserved kinds](../decks/README.md#reserved-kinds)

#### Model unit

`spec` The lattice spacing an object is built on: 2^unit gibsons in cyberspace.

**Wire:** the payload's `unit`, 0 to 84, always written. A `unit` of 33 is roughly meters. [DECK-0003 §1.6](../decks/DECK-0003-sno.md#16-scale)

#### Default scale

`ruled design` Built things default to 2^0, where one model unit is one gibson.

This is a default for tools. On the wire SNO always writes `unit`; the Seeds draft's `scale` tag defaults to 0.

#### Tick

`spec` One 120th of a model unit, the fine part of a vertex's position.

[DECK-0003 §1.2](../decks/DECK-0003-sno.md#12-positions-the-lattice-and-the-ticks)

#### Placement

`spec` One entry in an object's `parts` list: which object it places, where, turned how, and at what scale.

The spec's §7.6 also says "placement" for putting an event in a bag. [DECK-0003 §1.10](../decks/DECK-0003-sno.md#110-parts-one-object-placing-others)

#### Ref

`spec` One entry in an object's `refs` list, naming another object that it places.

**Wire:** `["a", "33331:<pubkey>:<d>"]` or `["e", "<id>"]`. [DECK-0003 §1.10](../decks/DECK-0003-sno.md#110-parts-one-object-placing-others)

#### Carried object

`spec` An object that travels inside another object's payload, so a reader does not have to fetch it.

**Wire:** an entry in the `objects` table. [DECK-0003 §1.10](../decks/DECK-0003-sno.md#110-parts-one-object-placing-others)

#### Avatar

`spec` The shape you are drawn as, paid for with proof of work by its size and detail.

**Wire:** `kind 11333`, one per identity. A client draws no avatar that has not paid. [§8.10](../CYBERSPACE_V2.md#810-avatar-event), [DECK-0003 §3.3](../decks/DECK-0003-sno.md#33-as-an-avatar)

#### Look

`spec` The object a chest or a door is drawn as: one while it is closed, and one once it is open.

**Wire:** `["look", "<payload>"]` and `["look", "<payload>", "open"]`. [DECK-0004 §3.6](../decks/DECK-0004-items-and-chests.md#36-the-look)

#### Credit

`spec` A copy of someone's object names the original in a quote tag.

**Wire:** NIP-18 `q` with the original's address; a public remix also carries a `p`. [DECK-0003 §3.5](../decks/DECK-0003-sno.md#35-crediting-a-copy)

#### Walker

`spec` A viewer that moves through a scene one step at a time, as a person walks.

An object's `constrain` field says whether its faces stop a walker. Avatars never do. [DECK-0003 §1.12](../decks/DECK-0003-sno.md#112-constraint)

#### Palette

`spec` The 256 built-in colors that object colors are chosen from.

**Wire:** `cyberspace-neon-256`. [DECK-0003 §1.3a](../decks/DECK-0003-sno.md#13a-the-palette), [Appendix C](../decks/DECK-0003-sno.md#appendix-c-the-built-in-palette-cyberspace-neon-256-normative)

---

## Seeds

Seeds is DECK-0008, still a draft in [PR #91](https://github.com/arkin0x/cyberspace/pull/91). The links in this group point at `decks/DECK-0008-seeds.md` and work once that PR is merged. The vocabulary and the pricing were ruled on 2026-11-10, and the draft follows them as of `3c5387e`.

```
  DNA (kind 3350)                    another DNA of the same species
  the definition, written in SEEDO
  publishing it is free
     |        \                      /
     |         +-------- mix -------+     a commitment with a fixed 20-bit floor;
     |                    |               a block mined later picks the genes
     |                    v
     |              child DNA (a DNA like any other)
     |
     | plant it at a coordinate, a block and a scale
     v
  seed (kind 3351, an item in a bag)
  carries the proof of work, priced by its DNA's caps, paid once
     |
     | every client grows it from:
     |   the DNA + the place (terroir) + the blocks since planting (weather)
     v
  bloom (drawn as a SNO object, never published)
     ^
     | tend (kind 3352): communal work given to the bloom
     |
  anyone who found the seed
```

#### Seeds

`DECK draft` Programs that grow in cyberspace from a place and the Bitcoin blocks mined since they were planted.

[DECK-0008](../decks/DECK-0008-seeds.md#abstract)

#### SEEDO

`DECK draft` The language a DNA is written in.

A working name: a trademark check is owed, and the name is kept out of every domain string. [DECK-0008 §3](../decks/DECK-0008-seeds.md#3-seedo-the-language-normative)

#### DNA

`DECK draft` The definition of a growing thing: its genes, its growth rules and its caps.

**Wire:** `kind 3350`; its id is its identity. A written DNA has SEEDO text in `content` and is free to publish; a mixed DNA is computed from its parents and pays the mix floor. [DECK-0008 §8.1](../decks/DECK-0008-seeds.md#81-the-dna-kind-3350)

#### Seed

`DECK draft` One planting of a DNA at a coordinate, a block and a scale, hidden in a bag.

**Wire:** `kind 3351`, an item. It carries NIP-13 work at its DNA's price, paid once per planting; a moved or changed seed is a new planting. [DECK-0008 §8.2](../decks/DECK-0008-seeds.md#82-the-seed-kind-3351)

#### Bloom

`DECK draft` What grows from a seed, which every client computes and nobody publishes.

It is drawn as a SNO object whose unit is the seed's scale. Not ONOSENDAI's renderer glow pass, and not the reveal of a secret room. [DECK-0008 §5](../decks/DECK-0008-seeds.md#5-drawing-the-bloom-normative)

#### Mix

`DECK draft` Combining two DNAs into a child DNA.

**Wire:** a mixed DNA with `mother`, `father` and `block` tags and NIP-13 work at a fixed floor of 20 bits, whatever the child's caps. A block mined 36 blocks later picks the child's genes. [DECK-0008 §6](../decks/DECK-0008-seeds.md#6-mixing-normative)

#### Tend

`DECK draft` Communal work that anyone who found a seed can give to its bloom.

**Wire:** `kind 3352`, sealed with the bag's key. The draft words it as work given to the seed, which it names only inside the seal; what the work does is still open. [DECK-0008 §8.3](../decks/DECK-0008-seeds.md#83-the-tend-kind-3352), [§9](../decks/DECK-0008-seeds.md#9-tending-provisional)

#### Sunlight

`DECK draft` The amount of work in a tend, counted in attempts.

Never in leading zero bits. [DECK-0008 §9](../decks/DECK-0008-seeds.md#9-tending-provisional)

#### Attempt

`spec` One unit of residue work: one aligned height-12 Cantor tree, reduced modulo a 61-bit prime.

It is the unit of the hop's re-roll price, and Seeds counts sunlight in it. [§5.10](../CYBERSPACE_V2.md#510-the-seal-the-re-roll-price-and-the-openings-normative)

#### Terroir

`DECK draft` The soil of a bloom: the terrain of the seed's place, measured at the seed's scale.

At scale 0 it is exactly the terrain `K` a hop to that coordinate pays. [DECK-0008 §4.4](../decks/DECK-0008-seeds.md#44-terroir)

#### Weather

`DECK draft` The block hashes that drive each generation of a bloom.

The planted block's own hash is never read. [DECK-0008 §4.3](../decks/DECK-0008-seeds.md#43-weather)

#### Clock height

`DECK draft` The height of the Bitcoin tip minus 6, which every reader grows blooms up to.

Reading 6 blocks back keeps a bloom from changing when the newest blocks are replaced. [DECK-0008 §4.1](../decks/DECK-0008-seeds.md#41-the-clock-the-age-and-the-generation)

#### Generation

`DECK draft` One rewrite of a bloom, one for every 144 blocks, about a day.

The DNA's generation cap sets how many there can be. [DECK-0008 §4.1](../decks/DECK-0008-seeds.md#41-the-clock-the-age-and-the-generation)

#### Planted height

`DECK draft` The block height a seed names as its day 0.

**Wire:** the `planted` tag. Readers clamp it against the seed's `created_at`. [DECK-0008 §4.2](../decks/DECK-0008-seeds.md#42-the-planted-height-and-the-clamp)

#### Scale

`DECK draft` How big a bloom is drawn: one model unit of the bloom is 2^u gibsons.

**Wire:** the `scale` tag, 0 to 84; absent means 0, one gibson. [DECK-0008 §8.2](../decks/DECK-0008-seeds.md#82-the-seed-kind-3351)

#### Gene

`DECK draft` A named number with two alleles, one from each parent in a mix.

An allele marked `!` is dominant; otherwise the two blend. [DECK-0008 §3.3](../decks/DECK-0008-seeds.md#33-the-genome)

#### Standard genes

`DECK draft` The three genes every DNA has, declared or not: `size`, `hue` and `tone`.

`size` scales in percent, `hue` turns every palette color, `tone` makes it lighter or darker. [DECK-0008 §3.3](../decks/DECK-0008-seeds.md#33-the-genome), [§5.4](../decks/DECK-0008-seeds.md#54-colors-and-the-standard-genes)

#### Caps

`DECK draft` The three limits a DNA declares, on vertices, symbols and generations, which bound what it costs to grow.

Each seed pays its DNA's price: 16 bits at the base caps, plus one bit per doubling of a cap, at most 27. The numbers are provisional. [DECK-0008 §7](../decks/DECK-0008-seeds.md#7-caps-and-their-price-normative-the-numbers-are-provisional)

#### Species

`DECK draft` DNAs with the same rule alphabet and the same gene names, which can be mixed.

[DECK-0008 §3.9](../decks/DECK-0008-seeds.md#39-species)

#### Sterile hybrid

`DECK draft` The child of two species, which cannot be a parent.

It is made only when the mix asks for it, with a `hybrid` tag. [DECK-0008 §6.5](../decks/DECK-0008-seeds.md#65-species-and-sterile-hybrids)

---

## Chat, comments, audio

#### Message

`spec` Plain text hidden at a place.

**Wire:** a `kind 1` item, always written as a rumor. [§7.6, Rumors](../CYBERSPACE_V2.md#76-the-bag-normative)

#### Local chat

`spec` Talk that carries only as far as a place.

A line is sealed to the region its speaker stands in, so only people there read it. [DECK-0005](../decks/DECK-0005-local-chat.md#abstract)

#### Chat envelope

`spec` The event that carries one chat line, which relays pass on and do not keep.

**Wire:** `kind 23330`, ephemeral, a bag in every respect but its kind. [DECK-0005 §2](../decks/DECK-0005-local-chat.md#2-the-envelope-kind-23330-normative)

#### Chat line

`spec` The words inside a chat envelope.

**Wire:** `kind 23333`, a rumor whose pubkey must be the envelope's signer. [DECK-0005 §3](../decks/DECK-0005-local-chat.md#3-the-line-kind-23333-normative)

#### Chat room

`spec` The region a chat line is sealed to.

**Wire:** DECK-0005 calls it "room": any region at the chat height, named by its lookup id. It is not a door's room. [DECK-0005 Terms](../decks/DECK-0005-local-chat.md#terms)

#### Chat height

`spec` The height of the rooms clients speak into: 12 today, a cube about 4,096 gibsons on a side.

Readers also listen to the 26 rooms around their own. [DECK-0005 §4](../decks/DECK-0005-local-chat.md#4-which-room-a-speaker-speaks-into-normative-for-writers)

#### Sealed comment

`spec` A comment on a hidden thing whose words only people who reached the place can read.

**Wire:** a NIP-22 `kind 1111` sealed with the bag's key, or the room key for a room bag. [DECK-0006 §1](../decks/DECK-0006-sealed-comments.md#1-shape-normative)

#### Hidden audio

`spec` A sound file hidden at a place.

**Wire:** a `kind 1063` rumor that names an encrypted file on Blossom and carries its key. [DECK-0007 §2](../decks/DECK-0007-hidden-audio.md#2-the-item-kind-1063-normative)

#### Source

`spec` The point a hidden sound is heard from: the center of the gibson its `C` tag names.

[DECK-0007 §4.1](../decks/DECK-0007-hidden-audio.md#41-the-source-the-region-and-the-sphere)

#### Sphere

`spec` The space around a source where the sound plays at full volume.

Outside it the sound fades to silence at the walls of its region. **Wire:** the `fade` tag is the radius. [DECK-0007 §4.1](../decks/DECK-0007-hidden-audio.md#41-the-source-the-region-and-the-sphere)

#### One-shot

`spec` A hidden sound that plays once, started when the listener walks into its sphere.

**Wire:** `autoplay` without `loop`; `retrigger` says whether it plays again. [DECK-0007 §5.2](../decks/DECK-0007-hidden-audio.md#52-a-one-shot)

#### Listener

`spec` The point a client hears from.

ONOSENDAI hears from the camera; an agent hears from its avatar's coordinate. [DECK-0007 §4.3](../decks/DECK-0007-hidden-audio.md#43-the-listener)

---

## Hyperspace and Bitcoin

#### Hyperspace

`spec` A transit line through cyberspace made of Bitcoin blocks.

Every block is a stop, and nobody can predict where the next one lands. [DECK-0001](../decks/DECK-0001-hyperspace.md#abstract)

#### Line

`spec` The Bitcoin blocks in height order; hyperspace is the line.

[DECK-0001 Terms](../decks/DECK-0001-hyperspace.md#terms)

#### Stop

`spec` One Bitcoin block, as a place on the line.

Its block's merkle root decides whether it is a port or a landfall. [DECK-0001 §1](../decks/DECK-0001-hyperspace.md#1-stop-coordinates-normative)

#### Port

`spec` A stop in ideaspace, standing at the block's merkle root itself.

A block whose merkle root has plane bit 1 is a port. [DECK-0001 §1](../decks/DECK-0001-hyperspace.md#1-stop-coordinates-normative)

#### Landfall

`spec` A stop on the surface of the Earth, at a point the block hash picks.

A block whose merkle root has plane bit 0 is a landfall. [DECK-0001 §1](../decks/DECK-0001-hyperspace.md#1-stop-coordinates-normative)

#### Station

`spec` The stop you appear at when you board: the one nearest to you.

[DECK-0001 §4](../decks/DECK-0001-hyperspace.md#4-the-station-normative)

#### Board

`spec` Getting on hyperspace at your station.

**Wire:** the `enter-hyperspace` action. Boarding does not move you. [DECK-0001 §3](../decks/DECK-0001-hyperspace.md#3-enter-hyperspace-action)

#### Ride

`spec` Travel along the line from one stop to another, paid for block by block.

**Wire:** the `hyperjump` action. Its work is seeded, so it cannot be cached. [DECK-0001 §5](../decks/DECK-0001-hyperspace.md#5-hyperjump-action-the-ride)

#### Exit

`spec` Leaving hyperspace with an ordinary hop or sidestep from a stop.

No new action is needed. [DECK-0001 §6](../decks/DECK-0001-hyperspace.md#6-exit)

#### Block anchor

`spec` An event that ties one Bitcoin block to its stop coordinate.

**Wire:** `kind 321`. [DECK-0001 §2](../decks/DECK-0001-hyperspace.md#2-block-anchor-events-kind-321)

#### Hyperspace toll

`spec` A price on boarding that is reserved and not yet set.

[DECK-0001 §7](../decks/DECK-0001-hyperspace.md#7-toll-reserved)

---

## Relays and kinds

#### Nostr

`spec` The network of signed events and relays that cyberspace is carried on.

Cyberspace needs no servers of its own. [§8](../CYBERSPACE_V2.md#8-nostr-integration-the-movement-chain)

#### Relay

`spec` A server that stores nostr events and passes them on.

Relays index only single-letter tags, which is why sector tags are one letter. [§10](../CYBERSPACE_V2.md#10-sectors-and-spatial-querying)

#### Event kind

`spec` The number on a nostr event that says what it is.

NIP-01 ranges: regular 1000 to 9999 (kept), replaceable 10000 to 19999 (newest per author), ephemeral 20000 to 29999 (not kept), addressable 30000 to 39999 (newest per author and `d`). [decks/README.md, Kinds defined by the base spec](../decks/README.md#kinds-defined-by-the-base-spec)

#### DECK

`spec` A document that adds to the protocol on top of the base spec.

Short for Design Extension and Compatibility Kit. [decks/README.md](../decks/README.md)

#### Mandatory DECK

`spec` A DECK every verifier must implement, because it can change where someone is.

DECK-0001 Hyperspace is the only one today. [§8.9](../CYBERSPACE_V2.md#89-protocol-extensions-decks)

#### Chain rules revision

`spec` The named version of the rules a chain is checked under.

Today it is `2026-10-08-residue-openings`. [§8.12](../CYBERSPACE_V2.md#812-chain-rules-revision-normative)

#### `A` tag

`spec` The tag that names what a movement event does.

`spawn`, `hop`, `sidestep`, `enter-hyperspace`, `hyperjump`, `enter-virtual`, `exit-virtual`, or a game's own action inside a bracket. [§8.8](../CYBERSPACE_V2.md#88-core-action-types-summary)

#### `C` and `c` tags

`spec` Where an event says you are now (`C`), and where you were just before (`c`).

On a hidden item, `C` is its exact coordinate inside the bag's region. [§8.4](../CYBERSPACE_V2.md#84-hop-event), [§7.6](../CYBERSPACE_V2.md#76-the-bag-normative)

#### Sector tags

`spec` The `X`, `Y`, `Z` and `S` tags, which let a relay answer what is in a sector or along a slice.

Required on movement events, and on a bag with a hint. [§10](../CYBERSPACE_V2.md#10-sectors-and-spatial-querying)

#### `encrypted` tag

`spec` The tag that carries ciphertext: the cipher, the payload, and on a published hidden thing a fourth element that says where the key comes from.

A bag's own `encrypted` tag has three elements. [§7.6, References](../CYBERSPACE_V2.md#76-the-bag-normative), [§8.6](../CYBERSPACE_V2.md#86-encrypted-content-event-bag)

#### `cyberspace:region`

`spec` The fourth element of an `encrypted` tag, meaning the key is derived from a place (a region key or a room key), so a reader never asks a server for it.

It is used behind doors too, on purpose, so a sealed thing does not say whether it is behind a door. There is no `cyberspace:room` and no `cyberspace:item`. [§7.6, References](../CYBERSPACE_V2.md#76-the-bag-normative), [DECK-0004 §3.7.2](../decks/DECK-0004-items-and-chests.md#372-the-room-key-and-the-room-bag)

### Kinds at a glance

An index, not more terms. Each kind's term is linked.

| Kind | What it is | Class | Status |
|---|---|---|---|
| `1` | [message](#message), in a bag or chest | rumor, inside only | `spec` |
| `321` | [block anchor](#block-anchor) | regular | `spec` |
| `1063` | [hidden audio](#hidden-audio) | rumor, inside only | `spec` |
| `1111` | [sealed comment](#sealed-comment) | regular | `spec` |
| `3330` | [shard](#shard), inline | regular, inside only | `spec` |
| `3333` | [movement event](#movement-chain) | regular | `spec` |
| `3340` | [key item](#key-item) | regular, inside only | `spec` |
| `3341` | [chest](#chest), or a [door](#door) with a `door` tag | regular, inside only | `spec` |
| `3350` | [DNA](#dna) | regular | `DECK draft` |
| `3351` | [seed](#seed) | regular, inside only | `DECK draft` |
| `3352` | [tend](#tend) | regular | `DECK draft` |
| `11333` | [avatar](#avatar) | replaceable | `spec` |
| `23330` | [chat envelope](#chat-envelope) | ephemeral | `spec` |
| `23333` | [chat line](#chat-line) | rumor, inside only | `spec` |
| `33330` | [bag](#bag), or a [room bag](#room-bag) | addressable | `spec` |
| `33331` | [standalone object](#standalone-object) or [hidden object](#hidden-object) | addressable | `spec` |
| `33332` | [public shard](#public-shard) | addressable | `spec` (reserved) |
| `33335` | [sealed entry](#sealed-entry) | addressable | `spec` |
| `33340` | [item listing](#item-listing) | addressable | `spec` |

"Inside only" means the event lives in a bag, a chest or an envelope and is never published on its own.

---

When a name is ruled or a DECK merges, change its badge here in the same pull request.
