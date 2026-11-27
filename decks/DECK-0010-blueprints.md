# DECK-0010: Blueprints

DECK: 0010
Title: Blueprints
Status: Draft
Mandatory: no
Created: 2026-11-27
Last updated: 2026-11-27
Requires: `CYBERSPACE_V2.md` §2 (coordinates and planes), §4.6 and §4.7 (Cantor roots and region integers), §7.2 (region keys), §7.6 (the bag, its items, rumors, protected items and sealed entries), §7.7 (contents), §8.2 (event ids) and §8.13 (the no-broadcast tag); DECK-0003 (SNO object payloads, §1.1, §1.4a runs, §1.9 validation, §1.10 the objects table); DECK-0004 §3 (chests and doors, taking); DECK-0009 (blocks: block ids, §2.3; the block layer, §5; the Stack, §7; inventory, §9); NIP-01, NIP-31, NIP-70; RFC 8018 (PBKDF2), FIPS 180-4 (SHA-256), NIST SP 800-38D (AES-GCM)

## Abstract

A **blueprint** is a recipe that anyone can make: an arrangement of specific blocks, standing on its own in cyberspace, that yields a specific thing. Its creator seals a **prize**, usually a SNO shard (DECK-0003), with a key that only the finished arrangement can produce. **The arrangement is the key.** Whoever builds the arrangement exactly, in the world's own axes, with nothing touching it, and smashes it with the **Compiler**, makes that key, finds the creator's record by a hash of it, and unseals the prize.

There is one blueprint and one data model. Each blueprint has three settings: how much of the recipe is revealed (the shape always, and anywhere from none to all of its blocks), how much of the prize is revealed (nothing, a description, or flat pictures of it), and what locks it (the blocks alone, or the blocks inside one region, whose region key then becomes part of the key).

The **blueprint record**, `kind 33343`, is public and signed by its creator. It carries the lookup, the revealed parts of the recipe and the prize, and the prize sealed with the key. It never carries a hidden block. A **card**, `kind 3343`, is a copy of a record that someone left at a place or sealed into a chest or behind a door, so that people find it as they find key items. Taking a card removes nothing, and anyone who holds one may leave a copy somewhere else. The copy keeps the creator's signed record, so the creator keeps the credit.

A smash always deletes the blocks it takes, whether or not they made a blueprint. It is an edit in the smasher's own block layer (DECK-0009), so it changes the world only for the smasher and for readers who rank the smasher first. What a player carries stays on the player's device, on the honor system (DECK-0009 §9).

This DECK writes down arkinox's rulings of 2026-11-26 and 2026-11-27: the arrangement as the key, PBKDF2-SHA256 at 500,000 rounds with a fixed versioned salt, fixed world axes, touching through faces, edges and corners, the Compiler's 16 by 16 by 16 box and its silence before a smash, one data model with three settings, cards found like key items, re-hiding by finders with the creator's credit kept, and the Compiler's own recipe.

**Defined here:**

| Thing | Value |
|---|---|
| The arrangement | the blocks a smash takes: the group of occupied cells connected to the block hit, through faces, edges and corners, within the 16 by 16 by 16 window around it (§4.1). It counts only when nothing else occupies the box grown by one cell (§4.2) |
| The encoding | `CYBERSPACE_BLUEPRINT_V1`, the box's size along X, Z and Y (one byte each), then two bytes per cell of the box in scan order (Y outermost, then Z, then X fastest), 0 for empty; a location lock appends the 32-byte region key (§3) |
| The key | PBKDF2-HMAC-SHA256 of the encoding, salt `CYBERSPACE_BLUEPRINT_V1`, 500,000 rounds, 32 bytes (§3.4) |
| The lookup | SHA-256 of the key, 64 lowercase hex (§3.4) |
| The record | `kind 33343`, addressable, `d` = the lookup, signed by the creator; `content` the public sheet (shape, revealed blocks, settings, prize hints); the prize sealed with the key in an `encrypted` tag (§5) |
| The card | `kind 3343`, a bag item or chest entry, signed by whoever placed it, whose `content` is the creator's signed record (§7) |
| The Compiler | a held tool, kept on the device; its own recipe is the one recipe a bare hand can smash (§8) |
| A starter recipe | a blueprint whose record reveals every block, so that its arrangement is public (§8.4) |

## Terms

- **Cell, block id:** as DECK-0009 §2.1 and §2.3 define them. A cell is one gibson. A block id is a global id from 0 to 65535, and 0 is empty.
- **Occupied:** a cell whose block id, as the smasher's client resolves it, is not 0. That is the cell's value under the Stack (DECK-0009 §7), with the smasher's own changes that are not yet published applied on top. Every nonzero id is occupied, liquids and unknown ids included. A cell of an unsurveyed chunk with no placed block is empty.
- **Touching:** two cells touch when they differ by at most 1 on each axis and are not the same cell: through a face, an edge or a corner. Each cell touches 26 others.
- **Hit cell:** the occupied cell the Compiler is aimed at when a smash strikes.
- **Window:** the 16 by 16 by 16 cells around the hit cell (§4.1).
- **Group:** the occupied cells connected to the hit cell through touching occupied cells inside the window (§4.1). A smash takes the group.
- **Box:** the smallest axis-aligned box of cells that holds the group, or that holds an arrangement. At most 16 cells on each axis.
- **Grown box:** the box grown by one cell on every side.
- **Isolated:** a group is isolated when every cell of its grown box that is not in the group is empty (§4.2).
- **Arrangement:** a box and the block id of every cell in it, 0 for the cells it leaves empty. A smash of an isolated group produces one; a creator composes one in BUILD mode.
- **Scan order:** the order in which the cells of a box are read: Y outermost, from the lowest layer to the highest; within each layer Z from minus to plus; within each row X from minus to plus (§3.2).
- **Encoding, key, lookup:** the bytes, the 32-byte secret and the public 32-byte hash of §3.
- **Lock:** a blueprint's third setting, `standard` or `location` (§3.5).
- **Record:** a `kind 33343` event (§5).
- **Sheet:** the public JSON object in a record's `content`: the shape, the revealed blocks and the settings (§5.3).
- **Prize:** the thing a record seals with the key: a SNO object, or a tool (§5.5).
- **Creator:** the identity whose signature a record carries.
- **Card:** a `kind 3343` item that carries a record (§7).
- **Placer:** whoever placed a card: the signer of the bag, room bag or chest that holds it (§7.2). A client shows the placer as "left here by" when the placer is not the creator.
- **Smasher:** the identity whose client performs a smash.

## 1. Overview (non-normative)

| Kind | Name | Published? | Signed by |
|---|---|---|---|
| `33343` | blueprint record | yes, in public, addressable by `(creator, 33343, lookup)` | the creator |
| `3343` | card | never on its own: inline in a bag, a room bag or a chest, or in a sealed entry (`kind 33335`) | the placer |

The life of a blueprint, in the client this DECK was written for:

1. **Make.** A creator opens the BLUEPRINT tool in BUILD mode. They compose an arrangement in a 16 by 16 by 16 cage marked with the world's axes, or capture a stand-alone build from TERRAIN. They pick a prize, usually a shard from the workshop. They set the three settings. The client makes the key and the lookup, seals the prize with the key, and publishes the record. Nothing about the hidden blocks leaves the device.
2. **Place.** Creating and placing are separate steps. The creator leaves cards for the blueprint wherever they like: at a place, like a message, sealed to that region as all v2 content is; inside a chest; or behind a door. A blueprint may have no card at all, and then people learn of it only from a feed (§5.7) or by building its shape.
3. **Find.** Someone walks up to a card, or opens the chest or the door, and takes a copy. The card stays for the next person. It shows the shape as smoke, the blocks the creator revealed, the prize as far as the creator revealed it, and the lock.
4. **Build.** The finder gathers the blocks and builds the arrangement in open air, facing the way it must face, with nothing touching it.
5. **Smash.** The finder smashes it with the Compiler. The blocks always shatter. The client gathers what it smashed, checks that it stood alone, makes the key and the lookup, and asks relays for records with that lookup. Every prize that opens appears where the build stood, as a floating toy to collect, the way a chest's contents appear. If none does, the blocks are spent.
6. **Again.** The key never changes, so anyone can build the same arrangement again, as many times as they like, and each time it yields again.

Nothing here changes the movement chain, and nothing is checked by a server. A record proves that its creator knew the arrangement, because only the arrangement's key can seal a prize that opens with it. A client that does not implement this DECK skips both kinds.

## 2. One blueprint, three settings (normative)

There is one blueprint data model. Blueprints have no categories and no types: every record has the same fields (§5) and is found, built and unsealed the same way. A blueprint differs from another only in its arrangement, its prize and its three settings:

| Setting | Choices | Where it is written |
|---|---|---|
| **1. Recipe reveal** | The shape is always shown: every occupied cell of the box, as smoke. The creator reveals anywhere from none to all of the blocks, each block on its own. | the sheet's `pal` and `cells` (§5.3) |
| **2. Prize reveal** | `hidden`: nothing beyond the blueprint's title. `description`: a line or two of text. `silhouette`: flat outlines of the prize. `render`: flat pictures of the prize. Silhouettes and renders are drawn at publish time, along X, along Y, along Z, or isometric, in any of those views the creator picks. | the sheet's `prize` (§5.3) |
| **3. Lock** | `standard`: the blocks are the lock. `location`: the blocks must be built inside one region of a stated height, and that region's key is part of the key. | the sheet's `lock` and `height` (§5.3), and the encoding (§3.5) |

A client MAY offer its user any way of choosing which blocks to reveal. ONOSENDAI's BLUEPRINT tool offers an eye toggle per block type, a tap per block, and a "reveal about N% at random" shortcut, with everything revealed at the start (arkinox, 2026-11-27). Whatever the controls, what is written is one choice per occupied cell: revealed or hidden.

Paid blueprints, locks shared with a crew, and a turnable model of the prize are not part of this revision (§13).

## 3. The arrangement is the key (normative)

### 3.1 World axes

An arrangement is read in cyberspace's absolute axes, X, Y and Z of `CYBERSPACE_V2.md` §2, with no search over turns or mirror images. The same shape turned a quarter turn about any axis, or mirrored, is a different arrangement with a different key. Position never matters: every cell is taken relative to the box (§3.2), so a standard blueprint can be built anywhere in either plane.

The black sun lies along +Z. A player's frame of gravity, such as walking up a wall, never changes the world axes. A client that shows a blueprint SHOULD show the XYZ compass, with the black sun past +Z, on every view of it: the card, the sheet, the stencil, the build cage and the HUD while a blueprint or the Compiler is in hand. The puzzle is which blocks go where, never which way the build faces (arkinox, 2026-11-26).

### 3.2 The box and the scan

The **box** of an arrangement is the smallest axis-aligned box of cells that holds every occupied cell. Its size is `sx`, `sy` and `sz` cells along X, Y and Z, each from 1 to 16. A cell of the box is named by its offsets `(x, y, z)` from the box's lowest corner, each from 0 to its side minus 1. Every face of the box holds at least one occupied cell, because the box is the smallest one.

The cells of the box are read in **scan order**: Y outermost, then Z, then X fastest.

```
for y in 0 .. sy - 1:
  for z in 0 .. sz - 1:
    for x in 0 .. sx - 1:
      read cell (x, y, z)
```

The cell `(x, y, z)` is therefore the `x + sx * (z + sz * y)`-th cell read, counting from 0. This is the order DECK-0009 §2.2 uses for the cells of a chunk, with the box's sides in place of 32. **Every cell of the box is read, the empty ones included**, as 0, so that a hollow arrangement and a solid one differ.

### 3.3 The encoding

The **encoding** of an arrangement is these bytes, in this order:

| Bytes | Value |
|---|---|
| 23 | the domain label and version: the ASCII bytes of `CYBERSPACE_BLUEPRINT_V1` |
| 1 | `sx`, the box's size along X, 1 to 16 |
| 1 | `sz`, the box's size along Z, 1 to 16 |
| 1 | `sy`, the box's size along Y, 1 to 16 |
| 2 per cell | the block id of every cell of the box in scan order (§3.2), as an unsigned 16-bit big-endian integer; 0 for an empty cell |
| 32 | a location lock only (§3.5): the region key |

The sizes are written in the order X, Z, Y, from the fastest axis of the scan to the slowest. A standard encoding is `26 + 2 × sx × sy × sz` bytes long and a location encoding 32 bytes longer, so the two can never be equal. The shortest encoding, one block, is 28 bytes; the longest, a full 16 by 16 by 16 box with a location lock, is 8,250 bytes.

Every block id is written as it is, natural, made, special or unknown (DECK-0009 §2.3). An implementation MUST NOT map an id it does not know to another id.

For example, the Compiler's recipe (§8.3) has a box of 3 by 2 by 3 (`sx` 3, `sy` 2, `sz` 3) and encodes to 62 bytes:

```
435942455253504143455f424c55455052494e545f5631   CYBERSPACE_BLUEPRINT_V1
03 03 02                                         sx, sz, sy
0000 0001 0000   0001 0028 0001   0000 0001 0000 y = 0: z = 0, 1, 2 (X fastest)
0000 0000 0000   0000 002a 0000   0000 0000 0000 y = 1: z = 0, 1, 2
```

### 3.4 The key and the lookup

```
key    = PBKDF2-HMAC-SHA256(password = encoding,
                            salt     = ASCII("CYBERSPACE_BLUEPRINT_V1"),
                            rounds   = 500000,
                            length   = 32 bytes)
lookup = SHA-256(key)
```

- PBKDF2 is the function of RFC 8018 §5.2 with HMAC-SHA256 as its pseudorandom function. The encoding is its password and the 23 bytes of the domain label are its salt. WebCrypto's `deriveBits` with `{name: "PBKDF2", hash: "SHA-256", salt, iterations: 500000}` and a length of 256 bits computes it, and so does `hashlib.pbkdf2_hmac("sha256", encoding, salt, 500000, 32)`.
- There is no per-blueprint salt. The salt is the domain label and version, the same for every blueprint of this version, because the arrangement alone must find the blueprint.
- The round count is fixed by the version. A different count, a different salt or a different encoding is a new version, with a new domain label, and the two versions' keys never meet.
- The lookup is the SHA-256 of the 32 key bytes, written as 64 lowercase hex characters wherever a tag carries it.
- The key is a secret. It is the AES-256-GCM key of the prize (§5.5) and nothing else in this DECK. A client MUST NOT publish it.

This is the shape of `CYBERSPACE_V2.md` §7.2: a key that takes work to compute from its preimage, and a lookup that is safe to publish because it does not give the key back.

For the Compiler's recipe: key `65d408f994300326544e75e15077f54b9fd4540eb80434d15962263ed0dbb50a`, lookup `f61bb6171413d8ed06390bb83f000af859f12cedd3fbde80aa7b249c6642058d`.

### 3.5 The location lock

A blueprint with a **location lock** must be built inside one aligned region (`CYBERSPACE_V2.md` §4) of a height `h` that its record states (§5.3), from 1 to 85: the cube of `2^h` cells on each axis, the same height on all three axes, as a bag's region is (`CYBERSPACE_V2.md` §7.6). Its encoding is the standard encoding followed by the 32 bytes of that region's key, the `location_decryption_key` of `CYBERSPACE_V2.md` §7.2. The key and the lookup are then made from that longer encoding exactly as §3.4 says. The region key is the same in a region and its twin, so a location-locked blueprint can be built in either plane of its region.

- **Where the box must stand.** The region is the region of height `h` that holds every cell of the box, in world coordinates. For a smashed group, a cell at window offset `o` on an axis has the world coordinate `(hit − 8 + o) mod 2^85` on that axis (§4.1). A box that crosses a border of the regions of height `h` stands in no single region of that height, and has no location encoding at that height. A box that wraps past the end of an axis crosses a border at every height below 85.
- **Making one.** A creator's client takes the region of height `h` that holds the box where the creator composed or captured it, or one the creator names, and makes the key from the standard encoding and that region's key.
- **Smashing.** A smasher's client computes the standard key of every isolated group it smashes. It SHOULD also compute a location key at every height `h` named by a location-locked record its user holds a card for, when the box stands in one region of that height, and MAY compute one at other heights. Each costs one more PBKDF2 (§3.6), and the region key itself costs work that grows with the height (`CYBERSPACE_V2.md` §7.1). A client MAY bound how many heights it tries for one smash, and MAY decline a height whose region key it cannot compute in reasonable time; a card that names such a height is still read and shown. A creator SHOULD choose a height that builders' clients can compute.
- **What the record says.** The record states the height and never the region. A creator who wants finders to know where to build says so in the prize's description, or leaves the card near the place.

A location lock asks whether the builder knows the region's key and built there. Like every region key, the key costs the same to compute from anywhere (`CYBERSPACE_V2.md` §7.1), so a location lock proves knowledge, not travel (§12).

### 3.6 Why these choices (non-normative)

- **Slow on purpose.** The lookup is public, so anyone can test a guess at home: guess an arrangement, make its key and its lookup, and ask a relay. The only brake on guessing is the time a key takes. PBKDF2-SHA256 at 500,000 rounds is built into every browser (WebCrypto), so it needs no dependency. Measured on 2026-11-26: 110 to 130 milliseconds per key in headless Chrome on an AMD Ryzen 7 6800H, and about 90 milliseconds in Node 22 on the same machine; a phone should take roughly 0.3 to 0.8 seconds. An honest builder pays that once per smash, under the shatter. A guesser pays it for every guess.
- **Not memory-hard.** A graphics card runs PBKDF2 far faster than a phone. Public password-cracking benchmarks scaled to 500,000 rounds put one high-end GPU at roughly 15,000 to 20,000 keys a second, and a rented rig of eight at roughly 140,000. §12 has what that means for how much a creator hides.
- **No per-blueprint salt.** Nothing but the arrangement can go into the key, or the build could not find its blueprint. So two creators who publish the same arrangement share a key and a lookup, and a smasher unseals both (§6.2). And someone may compute the keys of small, common shapes once and keep a table. Both are accepted (arkinox, 2026-11-26: "allow all").
- **World axes, no turns.** Searching all 24 turns and keeping the first encoding would make orientation a guess for the creator and cost 24 times the work for every smash. One fixed frame keeps one simple rule, and the compass on every surface keeps it fair.
- **Empty cells are read.** Without them, a hollow cube and a solid one with the same outer cells would share a key.
- **Two bytes per id.** Block ids run to 65535 (DECK-0009 §2.3), so one byte could not carry the extension space.

## 4. The smash (normative)

A **smash** is the Compiler striking a block (§8). It always deletes what it takes, and it unseals a prize only when what it took was an isolated arrangement whose lookup finds a record.

### 4.1 The window and the group

1. The **hit cell** `(hx, hy, hz)`, in plane `P`, is the occupied cell the Compiler strikes.
2. The **window** is every cell of plane `P` whose coordinate on each axis is from the hit's minus 8 to the hit's plus 7: `hx − 8` to `hx + 7`, and likewise for Y and Z. That is 16 cells on each axis, with the hit cell at offset 8. Coordinates are taken modulo 2^85 on each axis, so a window may cross the end of an axis, as the ground does (DECK-0009 §3.4). An implementation works in **window offsets**, `(coordinate − (hit − 8)) mod 2^85`, which run from 0 to 15 inside the window.
3. The **group** is the set of occupied cells that can be reached from the hit cell by steps from a cell to a touching occupied cell (through a face, an edge or a corner), every step staying inside the window. The hit cell is in the group. Natural blocks of the ground and placed blocks count alike, whoever placed them (arkinox, 2026-11-26).
4. The smash takes the group, all of it, and nothing else. An occupied cell outside the window is never taken, even when it touches the group. An occupied cell inside the window that is connected to the group only through cells outside the window is not taken either.

The group's box (§3.2) is computed in window offsets, so it is at most 16 cells on each axis.

A build 16 cells long on an axis is taken whole only when it is struck in the cell at offset 8 along that axis, which is its ninth cell from the minus end. A build of `n` cells along an axis is taken whole only when it is struck in one of its cells from the `(n − 7)`-th to the ninth, counting from 1 at the minus end; a build of 8 cells or fewer on every axis is taken whole wherever it is struck.

### 4.2 Isolation

The group is **isolated** when every cell of its grown box, the box grown by one cell on every side, that is not in the group is empty. The grown box may reach one cell outside the window, and those cells are read too.

Only an isolated group is an arrangement. A group that is not isolated is still smashed (§4.3), but it has no encoding, no key and no lookup, and nothing is unsealed. This covers every way a build can fail to stand alone:

- **Something touches it.** A block that touches the build through a face, an edge or a corner is in the group whenever it is inside the window. It is smashed with the build and written into the arrangement, which is then a different arrangement, and its key will not match. A build that rests on the ground takes some ground with it in the same way.
- **Something sits close.** A block inside the grown box that does not touch the build, such as one in a notch of the build or one a cell outside a face of it, is not in the group, and its presence leaves the group not isolated (arkinox, 2026-11-26: the box grown by one cell must be empty).
- **The window cut it.** A build that runs past the window leaves an occupied cell just outside the window touching the group, inside the grown box, so the group is not isolated.

Blueprints are therefore built in open air: above surveyed ground, inside a chunk nobody has surveyed, or on a scaffold mined away before the smash. TERRAIN keeps placed blocks where they are without support, so a floating build stays put.

A smasher's client decides occupancy from what it resolves (Terms, Occupied). Two smashers whose Stacks differ can see different blocks around the same build, and one of them may find it isolated while the other does not. Each smash is decided by its own smasher's view.

### 4.3 What a smash writes

1. **The blocks go.** Every cell of the group becomes empty for the smasher, written in the smasher's own block layer under the writing rules of DECK-0009 §5.4. A cell that the smasher's own change decides, and that would resolve to empty without that change, goes back to no change (`null`); when the smasher's block there was never published, its placing and the smash fold together and nothing about the cell is published at all. Every other cell of the group becomes a change to 0: a cell of the ground, a block someone else placed, or the smasher's block over something else. A group that spans several chunks changes the smasher's layer in each of them. Nothing changes anyone else's layer (DECK-0009 §7): the blocks disappear for the smasher and for readers who rank the smasher above whoever placed them.
2. **The prize, if any, is the smasher's.** What a smash yields is kept on the smasher's device (§6.3, §9). A smash publishes nothing beyond the layer change.
3. **Always.** The blocks are deleted whether or not the group was isolated and whether or not a record was found. A client MUST NOT restore them because nothing compiled.

A client SHOULD let its user cancel before the strike (letting go of the hold) with nothing spent, and MUST NOT offer to undo a smash after the strike.

### 4.4 Nothing before the smash

A client MUST NOT tell its user, before a smash strikes, anything about what the smash would take or yield: not whether the group is isolated, not whether its arrangement matches a record or a card, not a count of missing or wrong blocks, not an outline of the group (arkinox, 2026-11-26). The user commits the blocks before learning.

A client MAY show, at any time, the build cage and stencil of a card its user holds (§7.4), which draw only what the card already reveals.

### 4.5 Finding the record

After the strike, for an isolated group, the smasher's client:

1. makes the encoding (§3.3), the key and the lookup (§3.4), and any location keys and lookups it tries (§3.5);
2. looks for each lookup among the records of the cards its user holds and among the starter recipes it knows (§8.4);
3. asks the relays it reads for `{"kinds": [33343], "#d": ["<lookup>", ...]}`;
4. unseals what it finds, as §6 says.

The key takes a fraction of a second to make. ONOSENDAI makes it during the shatter animation, and shows COMPILING if the answer has not come by the end of it.

**Offline.** When no relay can be reached, the blocks are still gone. The client SHOULD keep the lookup, the key and the place in a log on the device, never published, ask again when a relay answers, and say so to its user. It MAY drop the log entry once a relay has answered with no record.

## 5. The blueprint record: `kind 33343` (normative)

### 5.1 The event

| Field or tag | Value |
|---|---|
| `kind` | `33343`. NIP-01 addressable: a relay keeps the newest event per `(pubkey, kind, d)`, so one creator has at most one record per lookup, and publishing again revises it |
| `pubkey` | the creator |
| `content` | the sheet (§5.3), serialized as JSON |
| `["d", "<lookup>"]` | exactly one. The lookup of §3.4, 64 lowercase hex |
| `["version", "1"]` | exactly one. The encoding, key and record rules of this revision. A reader MUST ignore a record whose version it does not know |
| `["encrypted", "aes-256-gcm", "<payload>", "cyberspace:blueprint"]` | exactly one. The prize, sealed with the key (§5.5). The fourth element says that the key is made by building, and a reader MUST NOT make a network request for it |
| `["title", "<name>"]` | OPTIONAL, at most one. The blueprint's name, at most 64 characters. A reader shows `blueprint` when it is absent or empty |
| `["alt", "<text>"]` | OPTIONAL, at most one. A NIP-31 description for clients that do not know the kind, at most 280 bytes, such as `A Cyberspace blueprint. Build it to find out what it makes: https://onosendai.tech` |
| `["no-broadcast"]` | OPTIONAL. The creator asks feeds not to list the record (`CYBERSPACE_V2.md` §8.13, and §5.7 below) |

A writer MUST NOT add a `C`, a height tag (`H` or `h`), a `hint`, sector tags, `contents` or NIP-70's `-`. A record is public and says nothing about where it may be built or where its cards are. A reader ignores any other tag.

The record is signed by the creator's identity. Records are made rarely, and the signature is the creator's credit wherever the record travels, so a builder key (DECK-0009 §4) does not sign one.

### 5.2 Size

A writer MUST NOT sign a record whose serialized event is longer than 98,304 bytes, in the serialization of DECK-0009 §5.5 (the event object as compact JSON, UTF-8, with exactly the keys `id`, `pubkey`, `created_at`, `kind`, `tags`, `content` and `sig` in that order). A reader MUST drop a longer one. The cap leaves a card that carries the record (§7) room in a chest, whose contents may be 131,072 bytes (DECK-0004 §3.2), and keeps a card's sealed entry under the 240,000-byte guard (`CYBERSPACE_V2.md` §7.6). A writer that cannot fit a record MUST refuse it and say why, for example that the prize or its pictures are too large.

### 5.3 The sheet

The sheet is a JSON object, UTF-8. A reader ignores any field not listed here.

| Field | Value |
|---|---|
| `size` | an object `{"x": sx, "y": sy, "z": sz}`: the box's size along each axis, each an integer from 1 to 16 |
| `pal` | the palette: an array of 1 to 256 distinct entries. `0` is an empty cell. `null` is an occupied cell whose block is hidden, drawn as smoke. Any other entry is a revealed block id, an integer from 1 to 65535 |
| `cells` | a runs array (below) of `sx × sy × sz` palette indices, one per cell of the box in scan order (§3.2) |
| `lock` | `"standard"` or `"location"` |
| `height` | present exactly when `lock` is `"location"`: the region height of §3.5, an integer from 1 to 85 |
| `prize` | the prize reveal: an object with the fields below |

**Integers.** Every integer in the sheet (in `size`, `pal`, `cells` and `height`) MUST be a JSON number written as an optional `-` and decimal digits, with no leading zero, no fraction, no exponent and not `-0`. A reader whose parser reads `1.0` and `1` alike MUST check the text, or reject what its parser cannot tell apart. Inside `size` and `prize`, as at the sheet's top level, a reader ignores any field not listed here.

**Runs.** `cells` is a runs array in the encoding DECK-0003 §1.4a uses for `facecolors`: a non-negative entry is a value, and a negative entry `−N` stands for N more copies of the value expanded just before it, so two negative entries in a row repeat the same value. The first entry MUST be non-negative; every non-negative entry MUST be below the length of `pal`; and the array MUST expand to exactly `sx × sy × sz` values. A reader MUST check the length while it expands and MUST reject the sheet at the first entry that would pass it, so that an array such as `[0, -1000000000]` costs nothing. A writer MUST write the shortest form, as DECK-0003 §1.4a requires: every run of two or more equal values as the value followed by one negative entry, never a value written twice in a row and never two negative entries in a row, so that a sheet has one spelling. A reader MUST accept any well-formed array.

**The recipe reveal.** Each cell of the box reads as `pal[index]`: empty, hidden or revealed. The occupied cells (hidden or revealed) are the shape, which is always public. A writer:

- MUST write every cell that the arrangement leaves empty as `0`, and every occupied cell as either `null` or its own block id. The shape is therefore exactly the arrangement's occupied cells.
- MUST NOT put in `pal` an id that no cell uses, and MUST NOT write a hidden cell's id anywhere in the record. A palette entry for an unused id would tell finders that a hidden block is of that kind.
- SHOULD order `pal` as `0` (if any cell is empty), then `null` (if any cell is hidden), then the revealed ids in ascending order, so that the palette's order says nothing about where the hidden cells are.

A fully revealed sheet has no `null`, and its cells are the whole arrangement (§8.4).

**The prize reveal.** The `prize` object:

| Field | Value |
|---|---|
| `reveal` | `"hidden"`, `"description"`, `"silhouette"` or `"render"` |
| `text` | the creator's words about the prize, at most 280 characters. Required for `description`, OPTIONAL for `silhouette` and `render`, absent for `hidden` |
| `views` | required for `silhouette` and `render`, absent otherwise: an object with one to four of the keys `"x"`, `"y"`, `"z"` and `"iso"`, each a picture of the prize as a data URI |

The views are drawn by the creator's client at publish time, and each is a picture of the prize in its own axes, at the orientation it will have when collected:

| Key | View |
|---|---|
| `x` | from +X, looking along −X |
| `y` | from above, from +Y looking along −Y |
| `z` | from the sun, from +Z looking along −Z |
| `iso` | isometric, from the (+X, +Y, +Z) octant, looking toward the origin |

A `silhouette` is a flat outline in one colour on a clear background. A `render` is a shaded picture. Each view MUST be `data:image/<png|jpeg|webp>;base64,<base64>` and at most 16,384 characters. A reader MUST NOT fetch anything a view names, and draws a view that breaks these rules as absent. A data URI travels inside the record and fetches nothing, as DECK-0004 §2.4 says of item pictures. ONOSENDAI draws 256-pixel views, a few kilobytes each.

### 5.4 Validity for readers

A reader that holds a `kind 33343` event checks it in this order, and drops it if any check fails:

1. it is authentic: its `id` and `sig` are valid (`CYBERSPACE_V2.md` §8.2);
2. it is within 98,304 bytes serialized (§5.2);
3. its tags are as §5.1 requires: exactly one `d` of 64 lowercase hex, exactly one `version` of `1`, exactly one `encrypted` whose second element is `aes-256-gcm` and whose fourth is `cyberspace:blueprint`, at most one `title` of at most 64 characters, and none of the tags §5.1 forbids;
4. its `content` parses as a JSON object;
5. `size`, `pal` and `cells` are well formed (§5.3), and the runs expand to the box;
6. no entry of `pal` goes unused;
7. at least one cell is occupied, and the occupied cells touch every face of the box (the box is the smallest);
8. the occupied cells are connected through faces, edges and corners;
9. `lock` and `height` are as §5.3 says;
10. `prize` is as §5.3 says: `reveal` is one of the four; `text` is present, OPTIONAL or absent as `reveal` requires, and at most 280 characters; `views` is present exactly for `silhouette` and `render`, as an object with one to four keys, each one of `x`, `y`, `z` and `iso`. A view whose value breaks the picture rules of §5.3 is drawn as absent and does not fail the record.

A record that fails is dropped alone. A reader SHOULD say that a blueprint was found and could not be read, rather than show a guess.

Checks 7 and 8 hold for every arrangement a smash can produce (§4.1, §4.2), so a record that fails them could never be built. Nothing else about a record can be checked without the key: whether its shape and its revealed blocks are true, and what its prize is, are known only to someone who has built it (§12).

### 5.5 The prize

The prize is a JSON object, UTF-8, sealed with the key under the cipher of `CYBERSPACE_V2.md` §7.6: AES-256-GCM with the 32-byte key of §3.4, a fresh 12-byte nonce for every encryption, a 16-byte tag, no additional authenticated data, and `nonce || ciphertext || tag` in standard base64 with padding, as the third element of the `encrypted` tag.

| `type` | Fields | The prize |
|---|---|---|
| `"sno"` | `payload`: a SNO object payload (DECK-0003 §1.1) | the object. A reader validates the payload as DECK-0003 §1.9 says. The pubkey that counts for its objects table (DECK-0003 §1.10) is the record's creator |
| `"tool"` | `tool`: `"compiler"` | the Compiler (§8). This revision defines no other tool |

A reader MUST keep a prize whose `type` or `tool` it does not know, and say that it holds a prize it cannot show, because a later revision may define it. Made blocks as prizes, and other tools, are for later revisions (§13).

A writer MUST seal a fresh nonce every time it publishes a record, a revision included. Writers seal prizes only with the key of the record's own arrangement. A prize that does not open with the key of the lookup in `d` is not this blueprint's prize, and a reader ignores the record when unsealing (§6.1).

### 5.6 Revising and removing

A creator revises a record by publishing a newer one at the same address: the same `d`, so the same arrangement and lock. A revision may change the title, the recipe reveal, the prize reveal and the prize. A different arrangement, or a different lock, is a different blueprint with a different lookup. Cards that carry an older version keep it, and a reader MAY show the newer version it can fetch from relays at the same address, signed by the same creator (§7.2).

A creator removes a record from relays by publishing a NIP-09 deletion request with `["a", "33343:<creator>:<lookup>"]` and `["k", "33343"]`. Cards carry the record with them, so a deletion does not remove the copies people hold, and anyone who builds the arrangement and holds a card still unseals it (§6.1). Every copy of a public event outlives a deletion request.

### 5.7 Listing (non-normative for writers, normative for feeds)

A record is public: anyone can ask a relay for `kind 33343` and read every record's title, shape, revealed blocks and prize hints. Hidden blocks are never in a record, so this gives away exactly what the creator chose to reveal, and nothing more.

The FEED of a client that lists blueprints is a broadcaster in the sense of `CYBERSPACE_V2.md` §8.13. It SHOULD NOT list a record that carries `["no-broadcast"]`. A creator who wants a blueprint found only through its cards, or by building it, adds the tag. That is a courtesy, not privacy: the record is still on relays, and the smasher's lookup still finds it.

## 6. Unsealing (normative)

### 6.1 Which records

For each lookup it computed, the smasher's client gathers the candidate records: the records of the cards its user holds whose `d` is that lookup, the records the relays returned for it, and any record a starter recipe of its own carries (§8.4). Then it:

1. keeps only valid records (§5.4) whose `d` is the lookup;
2. keeps, per creator, the newest record by `created_at` (then the lower event id);
3. drops every record whose creator is in the smasher's mute list (`kind 10000`);
4. orders the rest (§6.2);
5. opens each record's prize with the key (§5.5), and drops a record whose prize does not open.

Every prize that opens is the smasher's. A client SHOULD show all of them, in the order of §6.2 (arkinox, 2026-11-27: several prizes from one smash should feel abundant). It MAY present them in a picker when there are more than 8. It MAY bound how many records it fetches for one lookup, to bound the work of one smash, and SHOULD then say that there are more.

The lookup of the Compiler's recipe is the one exception. A smash whose lookup is that recipe's yields the Compiler from the client's own copy of the recipe (§8.3), and the client SHOULD ignore records from relays under that lookup, so that nobody can attach a stranger's prize to every newcomer's first smash.

### 6.2 Order

Records are ordered by the smasher's relationship to the creator: the smasher's own records first, then those of people the smasher follows (`kind 3`), then everyone else. Within one of those, the newer `created_at` first, then the lower creator pubkey, then the lower event id, compared as lowercase hex. This is the order of the Stack (DECK-0009 §7.3) without the home, which has no meaning for a record.

Two creators publish the same lookup only when they made the same arrangement (or, for a location lock, the same arrangement in the same region). Each prize is the work of a creator who knew the arrangement, so the smasher collects each one.

### 6.3 The yield

Each unsealed prize appears to the smasher where the arrangement stood, exactly as something taken from a chest appears: a small floating toy at the centre of the box (or at eye height above that spot, when the box was taller than the smasher), turning slowly, with its name. A client SHOULD keep an uncollected toy on the device, where only its user sees it, until it is collected.

**Collecting (non-normative).** The owner's rule for ONOSENDAI (2026-11-27): the smasher walks into a prize to take it, or taps it and presses TAKE, or presses COLLECT ALL to take every prize of the smash at once. Several prizes appear together, each with its creator's name, and more than 8 may open in a picker with the same three ways to take them.

A collected prize is kept on the smasher's device with the record it came from, its creator, the time and the place (§9). Nothing about it is published. A shard collected this way keeps its creator as its author, as a copied shard does. A client that later hides it, or places it, under its user's key re-keys its objects table as DECK-0004 §3.4 (Taking an object that carries its parts) says.

**Repeatable.** A blueprint yields every time its arrangement is built and smashed, by anyone, as often as they like. "One of one" is not offered, because the key never changes and the record cannot know who has built it.

## 7. The card: `kind 3343` (normative)

### 7.1 Shape

A card is a nostr event carried inline in a bag's list of entries (`CYBERSPACE_V2.md` §7.6), in a room bag (DECK-0004 §3.7.2), or in a chest (DECK-0004 §3.2), or carried in a sealed entry (`kind 33335`) of a bag or room bag. It MUST NOT be published on its own, because its `C` says where it stands, and that belongs inside the key of its place.

| Field | Value |
|---|---|
| `kind` | `3343` |
| `pubkey` | the key whose signature the card carries: its placer, the signer of the bag, room bag or chest the writer puts it in |
| `content` | the record (§5), the whole signed event with its `id` and `sig`, serialized as JSON |
| `["C", "<coord_hex>"]` | the card's exact coordinate, under the rules of `CYBERSPACE_V2.md` §7.6 |
| `["-"]` | the NIP-70 protected marker. A writer MUST add it (`CYBERSPACE_V2.md` §7.6, Protected items) |
| `["d", "<64 lowercase hex>"]` | present only on a card that has been moved: the event id of its first version, its lineage (DECK-0006 §2.2) |

The card is signed by its placer, as `CYBERSPACE_V2.md` §7.6 says every item that is not a message SHOULD be. The record inside keeps the creator's own signature, so the card carries two facts that anyone can check: who made the blueprint (the record's signer) and who left this copy (the card's signer and its container's).

### 7.2 Reading a card

A reader that finds a `kind 3343` item:

1. verifies it as an item of the bag or chest it is in (`CYBERSPACE_V2.md` §7.6; DECK-0004 §3.4);
2. parses its `content` as one JSON object, and MUST drop the card when that object is not a record that passes every check of §5.4, its signature included;
3. reads the **creator** from the record's `pubkey`, and the **placer** from the bag, room bag or chest that holds the card: placement is attributed to the container's signer (`CYBERSPACE_V2.md` §7.6, Items; DECK-0004 §3.4);
4. shows the card with its title, the creator ("by"), the placer ("left here by") when the placer is not the creator, the shape as smoke with the revealed blocks, the prize as far as the record reveals it, and the lock;
5. MAY fetch the newest record at the address `33343:<creator>:<lookup>` from the relays it reads, and show it in place of the card's when it is newer and passes §5.4. The card itself is never changed by this.

A card whose record is newer or older than another card's for the same address is still the same blueprint. A reader identifies a blueprint by its address, `33343:<creator>:<lookup>`, and SHOULD show a user who holds several cards of one blueprint one blueprint.

### 7.3 Where cards are found

Like a key item, a card must be found (arkinox, 2026-11-27). There are three places, all of them already defined:

- **Left at a place.** A card in a bag (`kind 33330`), sealed with the region key like everything hidden at a place. ONOSENDAI draws it in the world as a holo-schematic: a small wireframe cube of cyan lines with the XYZ compass beside it, a smoke model of the shape inside, holding still so that its axes stay true. It lists it in DISCOVERED NEARBY under BLUEPRINTS.
- **In a chest.** A card among a chest's entries, sealed to the chest's lock (DECK-0004 §3). Whoever opens the chest sees a blueprint row.
- **Behind a door.** A card in a door's room bag (DECK-0004 §3.7.4). Whoever opens the door finds it in the room, at its `C`.

A blueprint is found, not handed over, so a client SHOULD NOT send a card in a direct message. A chest sealed to a person's public key (DECK-0004 §3) is still a chest that its person finds at its place, and MAY hold a card. A client MAY show a record it learned of from a feed (§5.7), and its user can build it from there, but the user holds a card only once they have found one.

### 7.4 Taking

Taking a card copies its record into the taker's own keeping, on the device, with where it was found and who left it (§9). It removes nothing: the card stays where it is, for the next finder, however many people take it, exactly as taking from a chest removes nothing (DECK-0004 §3.4). Many people can take the same card from the same spot.

What a held card gives its holder is the record: its shape and revealed blocks for the build cage and stencil, its prize hints, and a lookup the client checks first after a smash (§4.5). A client keeps held cards apart from other loot. ONOSENDAI keeps them in ITEMS under BLUEPRINTS.

### 7.5 Leaving a copy

Anyone who holds a card MAY leave a copy of it: at a place, in a chest, or behind a door, under §7.3 (arkinox, 2026-11-27). The copy:

1. is a new `kind 3343` item written and signed by the person leaving it, with its own `C` and `-`, under the rules for the items a writer puts its own signature on (`CYBERSPACE_V2.md` §7.6);
2. carries in its `content` the creator's record unchanged: the same event, with the same `id` and `sig`, as the writer holds it or as the newest version at its address the writer has fetched. A writer MUST NOT alter the record, and cannot re-sign it, so the creator keeps the credit;
3. shows its writer as "left here by", because the container it is placed in carries its writer's signature (§7.2).

A copy is the same blueprint as the card it came from: the same address, the same lookup, the same prize. Leaving a copy publishes nothing new about the blueprint, only the container it is placed in.

A card that someone took and wants to place unchanged, with its original signer's signature, MAY also be carried as it is (`CYBERSPACE_V2.md` §7.6, Items: an item signed by another key is carried unchanged). Its `C` must still lie inside the new container's region, so in practice a card moved to a new place is a new copy.

### 7.6 Contents

A bag that publishes its contents (`CYBERSPACE_V2.md` §7.7) counts a card as `blueprint`, wherever it stands in the bag: inline, in a sealed entry, or inside a chest the bag holds. `blueprint` is written after `dna`. This DECK adds `blueprint` to the list of §7.7.

## 8. The Compiler and starter recipes

### 8.1 The Compiler (normative for clients that implement smashing)

The **Compiler** is a held tool: a techy hammer whose head is a small lattice cage (arkinox, 2026-11-26). It is kept on the device, like every item of the inventory (§9), kept forever and never used up. A smash is the Compiler striking a block (§4). A client:

- MUST give the Compiler only as the prize of a smash of the Compiler's recipe (§8.3). There is no other way to obtain one: no gift, no tutorial grant, no purchase (arkinox, 2026-11-26).
- SHOULD ask its user to hold for 3 seconds with the Compiler in hand before a smash strikes, and SHOULD cancel with nothing spent when the user lets go first.

ONOSENDAI keeps the Compiler in hotbar slot 1 once its user has one (arkinox, 2026-11-27). How the Compiler looks, sounds and animates is the client's (§13).

### 8.2 The bare hand (normative for clients that implement smashing)

The Compiler's recipe is the only recipe a bare hand can compile (arkinox, 2026-11-26). A **bare-hand smash** is a smash made with no Compiler in hand:

- A client SHOULD ask for a hold of 20 seconds before a bare-hand smash strikes.
- A bare-hand smash takes the group and deletes it exactly as any smash does (§4.1 to §4.3), and makes the standard key and lookup of an isolated group.
- It unseals only the Compiler's recipe (§8.3). A client MUST NOT unseal any other record from a bare-hand smash, and tells its user only that nothing compiled. It MUST NOT tell its user that some other blueprint would have compiled with the Compiler, which would be the pre-check that §4.4 forbids, after the fact.

The long hold is on purpose: it makes the Compiler feel like an upgrade the moment a player has one.

### 8.3 The Compiler's recipe (normative)

Four Gridstone (id 1) in a plus around a Ferrovein (id 40), with a Glowcore (id 42) on top. In box offsets `(x, y, z)`, the box being 3 cells along X, 2 along Y and 3 along Z:

| Cell | Block |
|---|---|
| `(1, 0, 0)`, `(0, 0, 1)`, `(2, 0, 1)`, `(1, 0, 2)` | Gridstone, 1 |
| `(1, 0, 1)` | Ferrovein, 40 |
| `(1, 1, 1)` | Glowcore, 42 |

Every other cell of the box is empty. The recipe is standard (no location lock). Its encoding, key and lookup are given in §3.3 and §3.4. Its prize is `{"type": "tool", "tool": "compiler"}`.

The recipe is symmetric under a half turn about Y, and under the mirror images across X and across Z, so a builder cannot get those wrong. A builder who puts the Glowcore under the plus instead of over it builds a different arrangement.

A client knows this recipe without any relay: it carries the arrangement, computes or stores its lookup, and yields the Compiler from it (§6.1). Gridstone and Ferrovein are everywhere in the ground. Glowcore appears in about one chunk in ten (DECK-0009 §3.9), so finding a first Glowcore is a newcomer's first goal.

### 8.4 Starter recipes (normative)

A **starter recipe** is a blueprint whose arrangement is public: its record reveals every block, so its sheet has no `null` in `pal`, and its sheet is the whole arrangement. Nothing else distinguishes it. It has the same encoding, key, lookup, record, prize and smash as every blueprint. It is not a category: it is a blueprint with the first setting at 100%.

- A client MAY ship starter recipes built in: each one's record, or its arrangement and its prize, kept with the client's code, so that they work with no relay. A built-in starter recipe whose prize is a SNO object is sealed and unsealed like any other.
- A client MAY show the starter recipes it knows in a recipe book, whether or not its user holds a card for them.
- A record of a starter recipe MAY be published and carried on cards like any record, for example the Compiler's recipe on a card in a tutorial chest. Its prize under the Compiler's lookup is still the built-in Compiler (§6.1).

This revision defines one starter recipe, the Compiler's. Further starter recipes need prizes this revision does not define (made blocks, other tools), and come with the revisions that define them (§13).

## 9. Inventory (non-normative)

What a player carries is not part of this DECK, exactly as DECK-0009 §9 says of blocks, and as ADR-0001 of the ONOSENDAI project records (arkinox, 2026-11-25). A client keeps, on the device and per identity, on the honor system:

- the blocks its user has mined, which placing spends and a smash does not return;
- the Compiler, once made;
- held cards, each with where it was found and who left it;
- collected prizes, each with its record, creator, time and place;
- uncollected toys, and the smash log of §4.5.

Nothing checks any of it. A modified client can give itself every block, every card and the Compiler, and that is fine: the same is true of the workshop today. A smash's cost is a game cost that makes play feel earned, not security.

## 10. Relays (normative for relays that accept `kind 33343`)

- `kind 33343` is addressable, and a relay keeps the newest event per `(pubkey, kind, d)`, as NIP-01 says.
- A relay MAY refuse a record longer than 98,304 bytes in its own serialization. A relay whose serialization escapes characters that NIP-01's does not (such as `<`, `>` and `&` as six-byte escapes) can count a valid record as somewhat longer, because the title, the alt and the prize text are free text: at most 64 characters, 280 bytes and 280 characters. A relay SHOULD therefore cap the kind no lower than 106,496 bytes.
- A relay SHOULD NOT require NIP-42 authentication to read the kind, because a smasher asks for a lookup at the moment of the smash.
- `kind 3343` is never published on its own (§7.1). A relay MAY refuse it.

The canonical relay, `wss://relay.onosendai.tech`, accepts a kind only once it is on its whitelist. Adding `33343` there is a deployment change for its operator (§14).

## 11. Test vectors

`blueprints-vectors.json`, beside this DECK, is produced by `blueprints-vectors.mjs` (Node 18 or later, with `nostr-tools` 2.x for the signed events only) from `blueprints-reference.mjs`. Like the other vectors in this repository it is not normative: where it disagrees with this text, the text is right and the file is a bug.

| Section | What it holds |
|---|---|
| `constants` | the domain label as text and hex, the rounds, the key length, the window's reach below and above the hit, the largest side, the record cap and the two kinds |
| `arrangements` | arrangements given by their box and cells, each with its encoding (in full, or its length and SHA-256 when it is too long to print), its key and its lookup: the Compiler's recipe; the same recipe with its Glowcore below the plus instead of above it; one Gridstone; an L of 4 Ferrovein, the same L turned a quarter turn about Y, and the same L mirrored across X (three different keys); a hollow 3 by 3 by 3 cube of Gridstone and the solid cube (a hollow and a solid differ); two blocks joined only at a corner; an arrangement with a special id (197) and an extension id (300); and a diagonal of 16 blocks through a 16 by 16 by 16 box, each touching the next only at a corner, the longest encoding without a lock |
| `location` | the Compiler's recipe built inside the chunk at (0, 0, 0), the region of height 5 at the origin (DECK-0009's origin chunk, whose lookup id is `3c5d8c49...c649`): the region's base, `region_n`, key and lookup id, the location encoding's length and SHA-256, its key and its lookup. Also the same recipe at height 6, which differs, and a box that straddles a border of height 5 regions and so has no location encoding there |
| `gather` | worlds of occupied cells, each with a hit cell and what a smash does there: the cells it takes, whether the group is isolated, the occupied cells that spoil isolation (`intruders`: the occupied cells of the grown box outside the group, including any just outside the window), and, when isolated, the box and the lookup. The cases: the Compiler's recipe alone, struck on its Ferrovein and on its Glowcore (the same group); the recipe with a stray block touching it only at a corner (taken with it, isolated, a different lookup); the recipe with a block two cells above it, outside the grown box (left alone, still isolated); the recipe with a block inside its grown box that touches nothing (left alone, not isolated); an L with a block in its notch, touching nothing (left alone, not isolated); a row of 20 Gridstone struck in the middle (16 taken, not isolated: the window cut it); a 16-cell row struck in its ninth cell (all taken, isolated) and in its eighth cell (15 taken, not isolated); two columns joined only by a bridge above the window (one column's 16 cells in the window taken, not isolated) |
| `sheets` | the Compiler's recipe with every block revealed, with only the Glowcore revealed, and with nothing revealed: each sheet's `pal` and `cells`, and its expansion. Also sheets a reader MUST reject, each with the check it fails |
| `record` | a record of the Compiler-shaped arrangement with a `sno` prize, signed with a test key, with only the Glowcore revealed and the prize as a description; its sheet, its prize plaintext, the AES-GCM nonce, the prize payload, its serialized length, and that the prize opens with the key and not with the key of the recipe with its Glowcore below. Also a location-locked record of the same arrangement at height 5, with silhouette views, whose prize does not open with the standard key; and records a reader MUST drop, each with the check it fails (the one over the size cap given by its length and hash) |
| `card` | a card carrying that record, signed by the creator; a copy left by another key (§7.5), carrying the same record unchanged; and a card whose record was altered, which a reader drops |
| `rank` | records from the reader, a follow, two strangers and a muted stranger under one lookup, with two versions from one creator, and the order of §6.2 |

Some single values, for a quick check:

- The Compiler's recipe: encoding `435942455253504143455f424c55455052494e545f5631030302000000010000000100280001000000010000000000000000000000002a0000000000000000` (62 bytes), key `65d408f994300326544e75e15077f54b9fd4540eb80434d15962263ed0dbb50a`, lookup `f61bb6171413d8ed06390bb83f000af859f12cedd3fbde80aa7b249c6642058d`.
- One Gridstone: encoding `435942455253504143455f424c55455052494e545f56310101010001` (28 bytes), lookup `31ad75408241a3fd7a5300c2196b0b0956e7edcdfa6f87e15e1948c012074e30`.
- The Compiler's recipe with a location lock at height 5, built in the origin chunk: encoding of 94 bytes, lookup `57da11b2d46119789acbc3b917dc75e2eaf344bf015e0257d528042668e2612a`.

## 12. Security and privacy considerations

- **Guessing.** The lookup is public, so anyone can test guesses offline; each guess costs one PBKDF2 of 500,000 rounds (§3.6). How hard a blueprint is to guess depends on how many blocks it hides and of how many kinds. For reference, at about half a second a guess on a phone, and about 140,000 guesses a second on a rented rig of eight GPUs: 2 hidden blocks of known kinds, 2 possibilities, a second on a phone; 8 hidden blocks of 4 known kinds, 2 of each, 2,520 possibilities, about 20 minutes on a phone; 16 hidden blocks of 4 known kinds, 4 of each, about 63 million possibilities, about 8 minutes on the rig; 24 hidden blocks of 6 known kinds, 4 of each, about 3.2 quadrillion possibilities, about 700 years on the rig. A large build that hides one or two rare blocks is hardly a secret, and does not need to be: its challenge is gathering the blocks. A small build that hides everything is a puzzle whose misses are cheap. This revision shows creators no strength meter and no warning (arkinox, 2026-11-26: "allow all").
- **Tables.** With no per-blueprint salt (§3.6), anyone can compute the keys of small or common shapes once and keep them. Whoever holds such a table opens any blueprint on it without building. That is accepted.
- **Shared keys.** Two creators who publish the same arrangement share a key, so each can open the other's prize. A creator who wants a prize opened only by builders of their arrangement makes an arrangement nobody else is likely to make.
- **A record's hints are its creator's claims.** Nothing checks, before a build, that a record's shape and revealed blocks are those of the arrangement its prize was sealed with (§5.4). A creator can publish a misleading sheet, and builders spend their blocks on it. The mute list removes such a creator (§6.1). A client that has unsealed a prize MAY check the sheet against the arrangement that opened it, and tell its user whether the hints were true.
- **A record proves its creator knew the arrangement.** A prize that opens with the key was sealed by someone who held the key, which takes the arrangement (or a table, above). Nobody can attach a prize to someone else's lookup without knowing the arrangement, except under the Compiler's recipe and other public arrangements, and the Compiler's lookup is handled apart (§6.1).
- **Solutions in layers.** A smash deletes the blocks in the smasher's layer, but if the build was already published in that layer before the smash, anyone who holds the chunk's region key can read the build's cells from the older version, and with them the solution. A builder who wants a solution private smashes within the session in which they placed the blocks, before the layer publishes (§4.3); ONOSENDAI then publishes nothing at all for those cells.
- **What a lookup query reveals.** A smasher's query names the lookup, so a relay learns that someone, from some network address, just built that blueprint, or tried a guess. A smash of a non-matching group asks for a lookup that names nothing, which also tells the relay that a smash happened. A client SHOULD ask only relays it already reads.
- **Location locks prove knowledge, not travel.** A region key costs the same from anywhere (`CYBERSPACE_V2.md` §7.1). A location lock asks that the builder know the key of a region of the stated height, which takes the region's work, and that the box stand in that region as the smasher's client sees it. A modified client can claim any position. The height is public, and narrows nothing by itself.
- **Pre-checking.** A modified client can make the key and ask the relay before smashing, which skips the gamble (§4.4). That costs the same time as any guess, and is the honor system's usual trade.
- **Cards and credit.** A card's record keeps its creator's signature wherever it is copied (§7.5), so nobody can present a copy as their own blueprint. A copy shows who left it, from the container's signature. A finder who knows the arrangement can still publish a record of their own for it, with their own prize, as any creator can; that is a second blueprint with the same lookup, under that finder's name.
- **Cards are not secret.** The record a card carries is public (§5.7). Finding a card is how blueprints reach people in play, not a lock on the record.
- **Oversized and malformed records** are dropped by every reader (§5.2, §5.4), alone, and the cards that carry them with them.
- **Pictures fetch nothing.** Views are data URIs (§5.3), so drawing a record's prize hints tells no server who looked.

## 13. Out of scope (non-normative)

- **Paid blueprints.** A purchase secret, delivered by Fanfares, mixed into the key as a third kind of lock, so that a non-buyer who guesses the shape cannot find or open it. It needs a Fanfares team ruling and its content policy (no adult content).
- **Crew-only locks**, a secret shared with a crew and mixed into the key.
- **The turntable**, a low-detail grey model of the prize that the finder can turn.
- **Made blocks and other tools as prizes**, with the starter recipes that yield them (Lumen brick, Glassteel, the wide pick and the rest of the design page), once made block ids (DECK-0009 §2.3, ids 64 to 191) and tool names are allocated.
- **Wake recipes**, structures that are tapped to start working rather than smashed (a kiln, a cabinet, a beacon). They delete nothing, so they are not blueprints in this DECK's sense.
- **"Built it" notes**, public proof that someone built a blueprint (a hash of the key and the builder's pubkey), for build counts and, later, ratings. Ratings are parked (arkinox, 2026-11-26).
- **More hints**: block counts, a palette, riddles, blocks revealed at a Bitcoin block height, and partial checks that smash part of a build alone. Whatever is added, an automatic "you are getting closer" signal stays out, because it would be an answer key that guessers could climb one cell at a time.
- **The smash animation**, the Compiler's look and sound, the EXAMINE sheet, the recipe book, the build cage and the stencil. These are the client's. The ONOSENDAI design page for blueprints describes the ones it builds.

## 14. Open questions (non-normative)

Each of these was decided by Claude on delegation while writing this draft, and is the owner's to change.

1. **The window's placement.** "The 16 by 16 by 16 box around the block hit" is the hit's minus 8 to plus 7 on each axis (§4.1). A 16-cell build is then taken whole only when struck in its ninth cell along that axis. The alternative, a window of minus 7 to plus 8, is the same rule mirrored.
2. **Strict isolation.** Every cell of the grown box outside the group must be empty, including a cell in a notch of the build that touches nothing (§4.2). The design page once said such a block would be left out of the scan and ignored; this draft follows the ruling that the box grown by one cell must be empty.
3. **The size bytes in the order X, Z, Y** (§3.3), as the design page wrote them, which is the scan's order from fastest to slowest.
4. **The location encoding appends the region key** after the cells (§3.5), so that its length always differs from a standard encoding's, and the record states the height but never the region.
5. **Kinds 33343 and 3343.** A census on 2026-11-27 of `relay.damus.io`, `nos.lol`, `relay.primal.net`, `relay.snort.social`, `offchain.pub`, `nostr.mom`, `relay.nostr.net` and `relay.onosendai.tech` found no event of kinds 3343 to 3349 or 33341 to 33348, except 3342 (a `bcp-size-test` app on damus and primal, from at least six pubkeys). `relay.nostr.band` and `nostr.net` refused connections. The NIP registry (nostr-protocol/nips at `bec0fc8`, 2026-11-16) lists none of them. The pair mirrors DECK-0004's 3340 and 33340: an item inline, a public event beside it.
6. **A card embeds the whole record** (§7.1) rather than naming it by address, so that a card reads with no relay query (readers do not follow references in a chest, DECK-0004 §3.4), and the creator's signature travels with every copy. The cost is size, which is why the record is capped at 98,304 bytes (§5.2).
7. **The record cap of 98,304 bytes** (§5.2), which bounds a prize shard to roughly 70 KB with small pictures.
8. **The order of prizes** is the Stack's without the home (§6.2), and records under the Compiler's lookup are ignored (§6.1). Every prize that opens is shown (arkinox, 2026-11-27).
9. **Unlisted records use `no-broadcast`** (§5.7) rather than a new tag.
10. **Records are signed by the creator's identity**, not a builder key (§5.1).
11. **The relay whitelist.** Adding `33343` to `relay.onosendai.tech` needs the owner's go (§10).

## 15. Implementations (non-normative)

- `blueprints-reference.mjs` (this directory): the encoding, key and lookup, gathering and isolation, regions for the location lock, the sheet and its runs, the prize seal, the record's own checks and the order of §6.2, in JavaScript with no dependencies beyond `node:crypto`.
- An implementation in Python written by an independent reviewer from the prose of §3, §4 and §5.3 alone, before seeing the reference code, the generator or the vectors, which reproduced every encoding, key and lookup in `arrangements` and `location`, every case in `gather`, and every accepted and rejected sheet in `sheets`: 35 cases, no mismatch (2026-11-27). Its notes on the prose were folded into this draft: the window's coverage (§4.1), one height on all axes and the cost of high heights (§3.5), world coordinates of a smashed box (§3.5), and the spelling of integers and runs (§5.3).
- ONOSENDAI: in progress, in parallel with this draft.
