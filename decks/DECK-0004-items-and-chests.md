# DECK-0004: Items, Chests and Doors

DECK: 0004
Title: Items, Chests and Doors
Status: Draft
Mandatory: no
Created: 2026-10-15
Last updated: 2026-10-31
Requires: `CYBERSPACE_V2.md` §7.2 (keys), §7.6 (the bag) and §8.6 (its event); DECK-0003 (SNO objects, for looks, and its objects table, §1.10, for carried parts); NIP-01, NIP-09, NIP-44 v2, NIP-70, NIP-92; BIP-340

## Abstract

An **item** is a keypair hidden at a place. Whoever reads it holds its private key, and holding the key is owning the item. A **chest** is a list of things sealed to one public key: an item's, so that it opens only for whoever holds that item, or a person's, so that it is a gift. An **item listing** puts an item's name, picture and public key in public, never its private key, so that anyone can seal a chest to an item they have never held.

Items and chests ride inside bags (`CYBERSPACE_V2.md` §7.6) as ordinary inline items, so a chest hidden at a place has two gates: the place, which a reader must reach to find the chest at all, and the lock, which a reader must hold to open it. Nothing here touches the movement chain. Reading an item and opening a chest are local acts.

A **door** is a chest that locks part of the world, instead of holding things to take. The part of the world a door locks is its **room**: the region of the door's height that holds the door. What the door's author hides in the room, at that height, goes into a bag of its own, the **room bag**. The room bag's key needs both the place and a secret sealed inside the door. Whoever opens the door sees the room's contents where they were hidden. A chest or a door may also wear a SNO object (DECK-0003) as its **look**: one object drawn while it is closed, and another once it is open.

This DECK writes down what ONOSENDAI (from its Keys and Chests slice of 2026-10-09, PRs #252, #275 and #331) and cyberspace-mcp already do, so that a third client can read and write the same things.

Doors and looks (§3.6, §3.7) are written down ahead of the clients. As of ONOSENDAI `7a3ceec`, ONOSENDAI reads the `door` tag and draws chests and doors in built-in looks. No client yet writes a door, a room bag or a look of its own.

## Terms

- **Item:** an inline bag item of `kind 3340` whose `secret` tag holds a secp256k1 private key (§2).
- **Item public key:** the BIP-340 x-only public key of an item's secret. It is the item's identity and the lock a chest names.
- **Holding an item:** knowing its secret. There is no other kind of ownership.
- **Chest:** an inline bag item of `kind 3341` whose content is a NIP-44 v2 payload sealed to a lock (§3).
- **Lock:** the public key a chest is sealed to, an item's or a person's.
- **Item listing:** a public `kind 33340` event that names an item by its public key (§4).
- **Rumor:** an item that carries an `id` and no signature (`CYBERSPACE_V2.md` §7.6, Rumors). A message sealed in a chest is written as one (§3.2).
- **Forger:** whoever generated an item's keypair. In this DECK the forger is also the item event's signer, the hider.
- **Region:** an aligned region (`CYBERSPACE_V2.md` §4): a cube 2^h gibsons on each side, in one plane, whose lowest coordinate on each axis is a multiple of 2^h. The number h is the region's **height**. For example, a region of height 4 is 16 by 16 by 16 gibsons.
- **Location key:** the `location_decryption_key` of `CYBERSPACE_V2.md` §7.2. It is 32 bytes: the SHA-256 of the region's integer, `region_n`, written as big-endian bytes with no leading zero bytes. Every ordinary bag of a region is encrypted with that region's location key, so whoever computes the key can read those bags.
- **Door:** a chest that carries a `door` tag, such as `["door", "4"]`. The number in the tag is the door's height (§3.7).
- **Room:** the region of a door's height that contains the door's coordinate. A door with `["door", "4"]` has a room 16 gibsons on each side (§3.7.1).
- **Door secret:** 32 random bytes sealed inside a door, in its one plaintext entry, `["room", "<64 lowercase hex>"]`. A room has one door secret, shared by every door of the room (§3.7.1, §3.7.5).
- **Room key:** the key of a room bag, `SHA-256(UTF-8("cyberspace:door") || location key || door secret)`. It needs both the place and the door (§3.7.2).
- **Room bag:** a `kind 33330` bag that holds what is hidden in a room at the room's height. It is encrypted with the room key, and it carries no public tag that says where it is, at what height, or what it holds (§3.7.2).
- **SNO object payload:** the JSON object that DECK-0003 §1.1 defines for one 3D object: its vertices, colors and faces, and some optional fields. A `kind 3330` shard carries one in its `content`. A small payload looks like `{"v":2,"name":"Panel","unit":0,"mode":"solid","vertices":[...],"colors":[...],"faces":[...]}`.
- **Look:** a SNO object payload carried in a chest's `look` tag, which a reader draws where the chest stands. The **closed look**, `["look", "<payload>"]`, is drawn until the chest or door is opened. The **open look**, `["look", "<payload>", "open"]`, is drawn after that (§3.6).
- **Address, ref and placement:** as DECK-0003 defines them. An **address** names an addressable event the way a nostr `a` tag does, and an object's address is `33331:<pubkey hex>:<d>`. A **ref** is one entry of an object's `refs` list, such as `["a", "33331:<pubkey hex>:<d>"]`, and names one object that the object places. A **placement** is one entry in an object's `parts` list. It is eight integers, in this order: the index of the ref that is placed; where the placed object's origin stands, as X, Y and Z in ticks, where one tick is one 120th of a model unit (DECK-0003 §1.2); its turn about X, Y and Z, in whole degrees; and its scale step. For example, `[0, 240, 0, 0, 0, 90, 0, 0]` places ref `0` with its origin 240 ticks (two units) along X, turns it 90 degrees about Y, and keeps its own scale (DECK-0003 §1.10).
- **Objects table (`objects`):** an optional field of a SNO object payload (DECK-0003 §1.10). It is a JSON object. Each key is the address that an `a` ref names, such as `"33331:<pubkey hex>:0d4b8f1e2c97a356"`, and each value is the payload of the object at that address. A reader draws a placed object from the table instead of fetching it. An object whose payload travels this way is a **carried object**. A reader honors only the keys under one pubkey, the **pubkey that counts** for the table: the pubkey that the reader can verify as the author of the event the table travels in (DECK-0003 §1.10 gives it for each kind of event).
- **Walker:** a viewer that a reader moves through the world a step at a time, as a person walks. A payload's `constrain` field, `"all"`, `"opaque"` or `"off"`, says whether its faces stop a walker (DECK-0003 §1.12).

Note (non-normative): the objects table and carried objects are added to DECK-0003 §1.10 by cyberspace PR #81, which was under review when doors and looks were written down. This DECK uses that PR's words for them. The rules in this DECK that mention the objects table (§3.4, §3.6) apply to no payload until that revision of DECK-0003 is merged.

## 1. Overview (non-normative)

A bag already carries any event as an item, and a reader skips kinds it does not know (`CYBERSPACE_V2.md` §7.6). This DECK adds two such kinds and one public kind:

| Kind | Name | Where it lives | Section |
|---|---|---|---|
| `3340` | item | inside a bag, or inside a chest | §2 |
| `3341` | chest | inside a bag, a room bag, or another chest | §3 |
| `3341` with a `door` tag | door | inside a bag, or a room bag | §3.7 |
| `33330` | room bag | published on its own, encrypted with a room key | §3.7.2 |
| `33340` | item listing | published on its own, in public | §4 |

The mechanic they prove is the one most games built on Cyberspace lean on: a thing found in one place opens a sealed thing in another, with no server. An item hidden in one region can open a chest hidden a thousand kilometres away, sealed by someone who never held the item, as long as they knew its public key. The listing is how they come to know it.

A door is not a new kind: it is a chest with one more tag. A room bag is not a new kind either: it is an ordinary `kind 33330` bag (`CYBERSPACE_V2.md` §8.6) whose key comes from a place and a door together.

## 2. The item: `kind 3340` (normative)

### 2.1 Shape

An item is a nostr event carried inline in a bag's list of entries (`CYBERSPACE_V2.md` §7.6) or in a chest's (§3). It MUST NOT be published on its own: its `secret` tag is the item, and an item published to a relay is an item given to everyone who reads the relay.

| Field | Value |
|---|---|
| `kind` | `3340` |
| `content` | the forger's sentence about the item, or empty. It MUST NOT be the secret. |
| `["secret", "<64 lowercase hex>"]` | exactly one. The item's private key: 32 bytes, a valid secp256k1 secret key (nonzero and below the curve order). |
| `["item", "<64 lowercase hex>"]` | the item's public key, derived from `secret`. SHOULD be present. |
| `["title", "<name>"]` | the item's name, at most 64 characters. SHOULD be present. |
| `["-"]` | the NIP-70 protected marker. MUST be present. |
| `["C", "<coord_hex>"]` | the item's exact coordinate, under the rules of `CYBERSPACE_V2.md` §7.6. |
| `["imeta", "url <data URI>", "m <mime>", "dim <w>x<h>"]` | OPTIONAL. The item's picture (§2.4). |
| `["d", "<64 lowercase hex>"]` | present only on an item that has been moved: the event id of the item's first version, its lineage, which comments on the item name (DECK-0006 §2.2). |
| `["model", "33331:<pubkey>:<d>", "<relay>"]` | OPTIONAL. The SNO object the item wears where it stands in space (§2.5). |
| `["animate", "<motion>", ...]` | OPTIONAL. How that object moves: any of `bob`, `spin-y`, `spin-x` (§2.5). |

The item event is signed by the hider, as `CYBERSPACE_V2.md` §7.6 says every item that is not a message SHOULD be.

### 2.2 Reading an item

A reader that finds a `kind 3340` item:

1. MUST read the secret from the `secret` tag, and MUST drop the item when the tag is absent, is not 64 lowercase hex characters, or is not a valid secret key.
2. MUST derive the item public key from the secret.
3. MUST drop the item when an `item` tag is present and differs from the derived public key. An item whose tags disagree is corrupt, and nothing sealed to either key could be opened with the other.
4. reads the name from `title`, trimmed, with runs of whitespace collapsed to one space and the result cut to 64 characters, and SHOULD show `key` or `item` when it is empty or absent.
5. reads the `content` the same way, cut to 280 characters, as the item's description.

Reading an item is holding it. A client SHOULD keep the items its user holds (the secret, the public key, the name, who hid it and where it was found) in local storage that is never published, and SHOULD NOT display the secret.

**Taking an item (non-normative):** Holding an item is a fact of knowledge, not of a client's records. Whoever has decrypted an item holds it, whatever their client does next. A client may still ask its user to take an item before the client counts it among the items its user holds. Only an item counted that way opens chests and doors for that user (§3.3). ONOSENDAI has done this since 2026-10-26: an item found in a bag, a room or a chest is kept only once its user takes it, so a key opens things only once it has been taken.

**Legacy form (readers MAY accept):** Items forged on 2026-10-09, before this shape settled, carry the secret as the `content`, the name in a `name` tag and the description in an `about` tag. A reader MAY accept that form when no `secret` tag is present, reading the secret from `content`. A writer MUST NOT produce it: a client that knows nothing of this kind shows an item's content as text, and the content of a legacy item is the secret.

### 2.3 Why the secret is in a tag, and why `-`

**The content is what other clients show:** A client that does not know `kind 3340` renders the content of an item as a note. If the secret were the content, every such client would print it. A tag is invisible to them.

**`-` keeps the hider's signature at home:** The item event is signed by the hider and carries the secret. A finder who decrypts the bag holds that signed event, and could publish it to a relay, which would give the item to everyone who reads that relay under the hider's name. NIP-70 tells a relay to accept a protected event only from its author, so a compliant relay refuses that publication. It does not stop a finder from re-signing the same secret as themselves; nothing can, because a finder holds the secret. What it stops is the forgery of attribution. The key item carried `-` from the day it was introduced; since 2026-10-20 every item hidden in a bag or sealed in a chest carries it (`CYBERSPACE_V2.md` §7.6, Protected items).

### 2.4 The picture

An item MAY carry a picture in a NIP-92 `imeta` tag whose `url` is a base64 data URI:

```
["imeta", "url data:image/png;base64,iVBORw0...", "m image/png", "dim 32x32"]
```

A reader MUST accept the picture only when all of these hold, and otherwise MUST read the item as one without a picture:

- the URI is `data:image/<png|jpeg|gif|webp>;base64,<base64>`, and at most 8,192 characters long;
- `dim` gives a width and a height that are integers from 1 to 32.

**Why a data URI and never an address (non-normative):** An `https` picture would make every reader's client fetch the hider's server when it lists the item, telling that server the reader's address and the moment they found the item. A data URI travels inside the seal and fetches nothing.

### 2.5 The model and its motion

An item MAY name a SNO object (DECK-0003) to be drawn as, where it stands in space, in place of whatever mark the reader draws for an item, and MAY say how that object moves. Both are tags of the item, so they travel with it wherever the item goes: into a bag, into a chest, into a copy a reader takes, and into the new version a move writes.

```
["model", "33331:<64 lowercase hex pubkey>:<d>", "<relay>"]
["animate", "bob", "spin-y", "spin-x"]
```

**`model`:** The second element is the address of a public `kind 33331` object (DECK-0003 §3.1), written `kind:pubkey:d` as an `a` tag writes it and as a placement's reference names an object (DECK-0003 §1.10). It names the object by address and not by event id on purpose: when the object's author publishes a new version, every item that wears it is drawn as the new version. The third element is OPTIONAL: a relay that holds the object, a `ws://` or `wss://` URL. A reader:

1. MUST accept the tag only when its second element is `33331`, a colon, 64 lowercase hex characters, a colon, and a `d` of 1 to 128 printable ASCII characters with no spaces; otherwise it MUST read the item as one without a model.
2. MUST ignore a third element that is not a `ws://` or `wss://` URL, and read the tag as one without a relay.
3. takes the first `model` tag it accepts, and ignores any other.
4. fetches the newest event at that address from the relay named, if any, and from the relays it already reads. An object it cannot fetch, a sealed object (one with an `encrypted` tag, DECK-0003 §3.4), and an object whose payload fails DECK-0003 §1.9 are read as no model, and the reader draws the item as it draws an item without one.

**`animate`:** Each element after the first is one motion. A reader MUST ignore a name it does not know, MUST read a name given twice as given once, and MUST read the motions only when the item carries a `model` it accepted. A reader reads the motions of every `animate` tag the item carries, so motions split across two tags are read as one list. A writer MUST write each motion at most once, in the order `bob`, `spin-y`, `spin-x`, in one tag, and MUST NOT write the tag without a `model` or with no motions. The motions stack:

| Motion | What it is |
|---|---|
| `bob` | The object rises and falls along the item's Y axis on a sine wave, gently: a period of a few seconds, and a reach each way that is a small fraction of the object's size. |
| `spin-y` | The object turns at a steady rate about the Y axis through its own centre. |
| `spin-x` | The object turns at a steady rate about the X axis through its own centre. |

When both turns are present, the turn about X is inside the turn about Y (a point of the object is first turned about X, then the result about Y), and the turn about Y SHOULD be the slower of the two, by a ratio that is not a ratio of small whole numbers, so that the object tumbles without visibly repeating. ONOSENDAI turns X at 0.5 radians a second and Y at 0.5 divided by the golden ratio. The object's centre is the middle of its bounds, with every object it places (DECK-0003 §1.10). The axes are the axes the object was built on (DECK-0003 §1.2), turned with the view as the reader turns a hidden shard. A reader SHOULD hold the object still when its user has asked for reduced motion.

**Where it stands and how large it is:** The object's centre stands exactly where the reader would draw the item's own mark: the item's coordinate (`CYBERSPACE_V2.md` §7.6), at the middle of its gibson. It is drawn at its own scale: one model unit is 2^`unit` gibsons (DECK-0003 §1.6), as a hidden shard is. A reader MAY draw it larger when it would otherwise be too small to see, as long as everything about it (the object, its box below, its cut below) is scaled together.

**The box:** A reader that draws an outline around an item drawn as its model SHOULD draw a box of whole gibsons that holds the object through the whole of its motion:

1. Start from the object's half extents about its centre on each axis.
2. For `spin-y`, X and Z reach the largest distance of any point of the object from the Y axis through the centre. For `spin-x`, Y and Z reach the largest distance from the X axis. For both, X and Z reach the largest distance from the centre, and Y the largest distance from the X axis. A placed object's points MAY be taken as the corners of its bounds.
3. For `bob`, add the bob's reach to Y on both sides.
4. Convert to gibsons and round each axis up to a whole number, never less than 1. An object that fits in 2 by 1 by 1 gibsons and does not turn gets a box of 2 by 1 by 1.

The box is centred on the item's place. Nothing about the box or the object is limited except by the region: both are cut at the walls of the region of the bag that holds the item, exactly as a hidden shard is cut at them (`CYBERSPACE_V2.md` §7.6). Because the object moves inside walls that do not, the cut is made where the object is at each moment, not once where it starts.

**Why by address, and what a fetch reveals (non-normative):** An address follows the author's edits, which is what someone dressing an item in their own object wants. The fetch is a query to relays for one public object, the same query any client makes to draw a placed object; it names the object, never the item, the bag, or where either is. A relay that sees it learns that someone asked for that object, which is already true of every placement of it.

## 3. The chest: `kind 3341` (normative)

### 3.1 Shape

A chest is a nostr event carried inline in a bag or in another chest. Like an item, it is never published on its own.

| Field | Value |
|---|---|
| `kind` | `3341` |
| `content` | a NIP-44 v2 payload, base64, as NIP-44 defines it |
| `["lock", "<lock pubkey hex>", "<sender pubkey hex>"]` | exactly one. The public key the chest is sealed to, then the public key of the one-time sender (§3.2). Both 64 lowercase hex characters. |
| `["title", "<name>"]` | the chest's name, at most 64 characters. SHOULD be present. |
| `["requires", "<label>"]` | the hider's description of what opens the chest, at most 64 characters, shown to a reader who cannot open it. MAY be empty. |
| `["-"]` | the NIP-70 protected marker. A writer MUST add it (`CYBERSPACE_V2.md` §7.6, Protected items). |
| `["C", "<coord_hex>"]` | the chest's exact coordinate, under the rules of `CYBERSPACE_V2.md` §7.6. |
| `["look", "<SNO object payload>"]` | OPTIONAL. The object the chest is drawn as while it is closed (§3.6). |
| `["look", "<SNO object payload>", "open"]` | OPTIONAL. The object the chest is drawn as once its user has opened it (§3.6). |
| `["door", "<height>"]` | present only on a door. It marks the chest as a door and gives the door's height (§3.7). |

The chest event is signed by the hider, as `CYBERSPACE_V2.md` §7.6 says every item that is not a message SHOULD be. Its signature is what vouches for the messages sealed inside it (§3.4). A chest written without one vouches for nothing, and a reader MAY drop it (`CYBERSPACE_V2.md` §7.6, Every other kind).

A reader MUST drop a chest whose `lock` tag is missing or malformed, or whose `content` is empty. A reader MUST NOT drop a chest for carrying `-` or for lacking it: chests sealed before 2026-10-20 lack it.

### 3.2 Sealing

The seal follows the gift-wrap pattern of NIP-59, applied to a list of entries:

1. The sealer serializes the chest's contents as JSON: a **list of entries** in exactly the shape of a bag's plaintext (`CYBERSPACE_V2.md` §7.6).
2. The UTF-8 bytes of that JSON MUST NOT exceed 65,535, the most NIP-44 v2 encrypts. A writer MUST refuse a larger chest and say so; it MUST NOT split one silently.
3. The sealer generates a fresh secp256k1 keypair, the **sender**.
4. `conversation_key = nip44_get_conversation_key(sender_secret, lock_pubkey)`.
5. `content = nip44_encrypt(plaintext, conversation_key)`.
6. The sender's public key goes into the `lock` tag beside the lock, and the sender's secret is discarded. It is used once and MUST NOT be kept.

A chest can therefore be sealed to a key whose secret the sealer does not hold, and once it is sealed nobody, the sealer included, can open it without the lock's secret.

**What goes in:** The entries of a chest follow the rules for the items of a bag (`CYBERSPACE_V2.md` §7.6), with the chest in the place of the bag and the chest's signer in the place of the bag's:

- A message (`kind 1`) MUST be written as a rumor. Its `pubkey` MUST be the key that signs the chest, its `id` MUST be its canonical id (`CYBERSPACE_V2.md` §8.2), and it carries no `sig`. A writer MUST NOT sign a message it seals into a chest. Hidden audio (`kind 1063`, DECK-0007 §3) is written the same way.
- Every item the writer signs, or writes as a rumor, into the chest MUST carry NIP-70's `["-"]`: a shard (`3330`), a message (`1`), a key item (`3340`), a chest (`3341`) and hidden audio (`1063`). An item signed by another key, which the writer seals as it is (for example a copy of an item it took), is carried unchanged, because adding a tag to it would break its signature.
- Every item that is not a message or hidden audio SHOULD be signed by the writer, for the reason §7.6 gives: once it is taken elsewhere, only its own signature says who made it.

### 3.3 Opening

- **With an item:** `conversation_key = nip44_get_conversation_key(item_secret, sender_pubkey)`, which is the same key as in §3.2 by the symmetry of ECDH, then `nip44_decrypt(content, conversation_key)`.
- **With a person's identity:** the person's signer decrypts the payload from the sender, `nip44.decrypt(sender_pubkey, content)`, as NIP-07 and NIP-46 both phrase it.

A reader SHOULD offer to open a chest when its user holds an item whose public key is the lock, or when the lock is the user's own pubkey; a held item SHOULD win, because opening with it needs no signer. Opening is local and publishes nothing.

### 3.4 Contents

The decrypted plaintext is read as a list of entries under `CYBERSPACE_V2.md` §7.6:

- Each inline item is verified as a bag's items are (`CYBERSPACE_V2.md` §7.6, Items and Rumors). An item is unsigned when it carries no `sig` field or a `sig` that is the empty string. An item with any other `sig` is signed: its `id` MUST be its canonical id and its signature MUST verify, and a reader MUST drop it, and only it, when either check fails.
- An unsigned item is kept. A reader identifies it by its canonical id, whatever `id` it carries, so that a claimed id cannot stand in for another item's. Its `pubkey` is a claim, and a reader MUST NOT present it as verified unless the chest vouches for it, as the next rule says.
- **Rumors in a chest:** A message rumor, or a hidden audio rumor, is vouched for by the chest that holds it when all three of these hold: the rumor's `pubkey` equals the chest's own `pubkey`; the rumor's `id` is its canonical id; and the chest's own authorship is verified, because the chest is signed and its signature verifies. A reader that keeps a vouched-for rumor MUST attribute its content to the chest's signer, and MAY present that authorship as verified. Reason: the chest's signature covers its `content`, which decrypts to exactly one list, in which this rumor's `pubkey` is the chest's own. This is the rule of `CYBERSPACE_V2.md` §7.6 ("Inside an item"), and it applies at every depth.
- **The chest's own signer, never the bag's:** The key that vouches for a rumor is the `pubkey` of the chest the rumor is in. It is never the author of the bag that holds the chest, and never the signer of an outer chest. A chest inside another chest may have been sealed by someone else, for example when a hider seals a copy of a chest they took into a chest of their own; a rumor inside it that names the bag's author is a claim.
- **A chest that is a claim vouches for nothing:** When a chest's own authorship is not verified, every rumor inside it has a `pubkey` that is a claim. `CYBERSPACE_V2.md` §7.6 also counts a chest that is itself a rumor: such a chest is vouched for by what holds it. Writers do not write such a chest (§3.1). Writers write only messages and hidden audio as rumors. A reader therefore MAY read an unsigned chest, or a rumor of any kind other than `1` and `1063`, as an unsigned item whose `pubkey` is a claim. ONOSENDAI and cyberspace-mcp drop an unsigned chest found directly in a bag. They keep an unsigned chest found inside another chest, as a claim, so that nothing inside it is vouched for.
- **Signed messages:** A reader MUST still accept a signed message whose signature verifies, because messages sealed into chests before 2026-10-20 are signed. Its author is a fact on the strength of its own signature.
- A reader MUST NOT drop an item for carrying `-` or for lacking it.
- A chest MAY hold items of any kind, including items (§2) and other chests. The one exception is a door, which is never sealed into a chest (§3.7.1). A chest holding the item that opens the next chest is a chain.
- A plaintext that is not a JSON array is a chest the reader cannot read; it SHOULD say so rather than show an empty chest.
- Readers today do not follow references inside a chest: a reference is a relay query that opening a chest should not make on its own. A reader MAY skip references in a chest, and a writer SHOULD NOT put them there until a later revision says how they are fetched.

**A chest's contents are taken, not placed:** A reader lists what an opened chest holds, so that its user can take each thing (below). A reader SHOULD NOT draw a chest's contents in the world. A hider who wants things to appear where they stand when a lock opens uses a door instead (§3.7). Every content item still carries a `C` tag, as every item does.

Note (non-normative): readers before 2026-10-26 drew a chest's contents in the world. A content item whose `C` lay in the chest's plane, and inside the region of the bag that holds the chest, was drawn at its `C`. Any other content item was drawn where the chest stands.

**Taking:** Taking something out of an opened chest copies it into the reader's own keeping. A reader MAY offer to take one thing at a time, and to take everything at once. Taking removes nothing: the chest still holds what was taken, for the next reader. A taken copy of a rumor proves nothing to anyone else. It has no signature, and the chest that vouched for it is not part of the copy. A client MAY keep, with what it took, whether the author was verified when its user opened the chest. cyberspace-mcp's `take` does this: it keeps what `open_chest` said. That record is the reader's own, and nobody else can check it.

**Taking an object that carries its parts:** This rule applies wherever DECK-0003 lets an object payload carry the objects it places, in an objects table (`objects`, DECK-0003 §1.10). A reader honors a table entry only when its key is under the pubkey that counts for that table, the verifiable author of the event the table travels in (DECK-0003 §1.10). That pubkey is not the taker's, unless the taker is that author. Suppose a taker copies such an object out of a chest, and later hides the copy under their own key. Every key in the copy's table would still be under the original author's pubkey, so a reader would ignore every entry, and the copy would lose every carried part. A reader that copies such an object into its user's keeping SHOULD therefore re-key the table under its user's pubkey:

- each carried object gets an address of its own, `33331:<user pubkey hex>:<d>`, with a fresh `d`, such as 16 random hex characters;
- the table's key for that object becomes the new address;
- every `refs` entry that named the old address is rewritten to name the new one;
- the table's keys are then written again in code point order (DECK-0003 §1.2).

For example, a taker re-keys the ref `["a", "33331:<hider pubkey hex>:0d4b8f1e2c97a356"]`, and the table key `"33331:<hider pubkey hex>:0d4b8f1e2c97a356"`, to `["a", "33331:<taker pubkey hex>:5e0a3c91d27f4b68"]` and `"33331:<taker pubkey hex>:5e0a3c91d27f4b68"`. An object placed by an address that is not in the table is a link, which follows its author's edits, and is left as it is.

**Removing:** Only the hider removes something from a chest, by sealing the remaining entries again (§3.2) with a fresh sender key and the same lock, and rewriting the bag that holds the chest. An emptied chest is still a chest.

### 3.5 Why a chest is a bag item and not a kind of bag (non-normative)

A chest is placed exactly where an item is placed, in the same bag, under the same region key, and rides every rewrite of that bag with the rest. Making it an item keeps one container for everything hidden at a place and lets a chest sit inside another chest with no new machinery. NIP-44 rather than the region cipher, because the lock is a public key: the sealer must be able to encrypt to a key whose secret they do not hold, which a symmetric region key cannot do.

### 3.6 The look

A chest or a door MAY carry a **look**. A look is a SNO object (DECK-0003) that a reader draws in the world, at the chest's place, in place of whatever mark it would otherwise draw for a chest. A chest MAY carry two looks. The **closed look** is drawn until the reader's user opens the chest. The **open look** is drawn after that. Each look is one tag on the chest event:

```
["look", "<SNO object payload, as a JSON string>"]
["look", "<SNO object payload, as a JSON string>", "open"]
```

A `look` tag with two elements is the closed look. A `look` tag whose third element is `open` is the open look. For example, this tag gives a door a closed look: a flat panel 2 gibsons wide and 3 gibsons tall, in steel gray (built-in color `207`), that stops a walker (`"constrain": "all"`):

```
["look", "{\"v\":2,\"name\":\"Panel\",\"unit\":0,\"mode\":\"solid\",\"vertices\":[[-1,0,0],[1,0,0],[1,3,0],[-1,3,0]],\"colors\":[207,207,207,207],\"faces\":[[0,1,2],[0,2,3]],\"constrain\":\"all\"}"]
```

**The payload:** The second element of a `look` tag is a SNO object payload, exactly as DECK-0003 §1.1 defines it. It is the same JSON that a `kind 3330` shard carries in its `content`, written into the tag as a string. A look is never a reason to drop a chest. The reason is that a look only says how a chest is drawn, and a chest whose look is broken still holds what it holds.

**Which tags count:** A reader picks the closed look and the open look by the shape of the tags alone, before it reads any payload:

- A `look` tag is **well-formed** when its second element is a string, and it has either exactly two elements, or exactly three elements with the string `open` as the third.
- A well-formed `look` tag with exactly two elements is a closed look. A well-formed `look` tag with exactly three elements, the third being `open`, is an open look.
- The first well-formed closed look is the one that counts, and so is the first well-formed open look. A reader ignores every other `look` tag.

A `look` tag whose third element is a word the reader does not know, such as `["look", "<payload>", "ajar"]`, is neither a closed look nor an open look, so it never counts.

Only then does the reader check the payload of each look that counts, under DECK-0003 §1.9. When that payload fails the check, the reader MUST read the chest as one without that look. It MUST NOT fall back to a later `look` tag. For example, when the first closed look fails §1.9, the chest is drawn as one with no closed look, which is whatever the reader draws for a chest (see **Drawing it**, below). That holds even if a second closed look would pass.

**Why the first tag by shape:** Readers may validate payloads slightly differently. Choosing the tag by its shape alone means that every reader picks the same tag, whatever its validator says. It also means that a look which fails validation cannot be used to slip a second look in behind it, for one set of readers to draw and another to ignore.

**Where it stands:** A look is placed the way a hidden shard is placed.

- The origin of the payload, the point `[0, 0, 0]`, stands at the chest's coordinate (its `C` tag), at the middle of that gibson.
- One model unit is 2^`unit` gibsons (DECK-0003 §1.6). In the example above, `"unit": 0` builds the panel on a lattice one gibson wide, so its vertex `[1, 3, 0]` stands 1 gibson along X and 3 gibsons along Y from the chest's place. The panel's origin is the middle of its bottom edge.
- The look is posed by its own payload, through its `up` and `spin` fields (DECK-0003 §1.7).
- The look is cut at the walls of the region of the bag that holds the chest, or of the room bag (§3.7) that holds it. No part of the look is drawn outside that region.

**Why the origin, and not the centre:** An item's `model` (§2.5) is placed differently: its centre floats on the item's point. A look is placed by its origin, so the look's author decides where the look stands relative to the chest's place. For example, a treasure chest built with its origin at the middle of its base sits on the floor it is placed on. A door panel built with its origin at the middle of its bottom edge stands in the doorway it is placed in.

**A copy, with live parts where its author wants them:** A look is a payload inside the chest event. It is fixed as the hider sealed it, and it changes only when the hider writes the chest again. A look MAY still place public objects by an `a` ref (DECK-0003 §1.10), such as `["a", "33331:<pubkey hex>:<d>"]`. A placed public object follows its author's edits, as every `a` ref does.

A writer that wants a public object turned, scaled or moved writes a look whose only content is one placement of that object. Such a look has no geometry of its own. Its `refs` names the public object, and its one `parts` entry says where the object stands, how it turns and how it scales. For example, this look places one public object, turned 90 degrees about Y and drawn at twice its own size:

```json
{
  "v": 2, "name": "Statue door", "unit": 0, "mode": "solid",
  "vertices": [], "colors": [], "faces": [],
  "refs": [["a", "33331:<pubkey hex>:<d>"]],
  "parts": [[0, 0, 0, 0, 0, 90, 0, 1]]
}
```

A look MAY also carry objects that its author never published, in an objects table (`objects`, DECK-0003 §1.10), wherever DECK-0003 allows a payload to carry one. DECK-0003 §1.10 gives every table one pubkey that counts: the pubkey that the reader can verify as the author of the event that the table travels in. A look travels in the chest event, so for a look's table that pubkey is the chest's signer. A door is a chest, so for a door's look it is the door's signer. A chest whose signature does not verify has no pubkey that counts, so a reader honors no key in its look's table. It never uses the signer of an outer chest. The carried objects are then copies, drawn as they were when the hider sealed the chest.

Note (non-normative): whether a look is a copy or a live placement follows where its author took the object from, as DECK-0003 §1.10 describes for parts. An object taken from the author's own workshop becomes a look that is the object itself, with any parts its author never published carried in its objects table. An object picked from the feed becomes a look whose only content is one placement of the public object. That look can be turned and scaled, and it still follows its author's edits.

**Drawing it:** A reader draws the closed look until its user has opened the chest or door. After that, the reader draws the open look, if there is one. When there is no open look, an opened door is not drawn at all, and an opened chest keeps its closed look. When there is no closed look, a reader draws whatever it draws for a chest.

**Walkers:** A walker is a viewer that a reader moves through the world a step at a time, as a person walks (DECK-0003 §1.12). Some readers stop a walker at the faces of objects, as each object's `constrain` field says. A reader that does this SHOULD stop walkers at a look's faces by the look's own `constrain`, exactly as it does at a hidden shard's faces. This applies to:

- a chest's look, at all times;
- a door's closed look, until its user has opened the door;
- a door's open look, after its user has opened the door.

A closed door therefore stops a walker who has not opened it, as far as its closed look's `constrain` says. §6 explains why this is a courtesy and not a lock.

**Size:** A look rides inside the bag with everything else the bag holds. Every rewrite of the bag therefore carries the look again. A writer SHOULD keep looks small. (Non-normative: ONOSENDAI's design refuses a look over 16,384 bytes. That is the size above which it hides a shard by reference instead of inline, DECK-0003 §3.2.)

**Older readers:** A reader that does not know `look` draws the chest as it always has.

**Built-in looks (non-normative):** ONOSENDAI offers looks of its own. When it writes one of them, it will write an ordinary look, with the whole payload in the `look` tag, like any other look. As of ONOSENDAI `7a3ceec` it has two, each with an open version:

- for a chest, a treasure chest about one gibson across, with its origin at the middle of its base, drawn closed and drawn with its lid up;
- for a door, a slab half a gibson thick that fills the Maze Kit's standard door opening, 2 by 3 gibsons.

Slabs of the same kind are planned for the Maze Kit's other two standard openings: CRAWL, 2 by 2 gibsons, and HALL, 4 by 6 gibsons, each with an open version.

### 3.7 Doors

A **door** is a chest that locks part of the world instead of holding things to take. A chest's contents are listed for its opener to take (§3.4). A door's contents stay in the world, where they were hidden, and they appear only once the door is opened.

What a door locks is its **room**: the region of the door's own height that holds the door. Whatever the door's author hides in the room, at the room's height, goes into a **room bag**. A room bag is an ordinary bag (`CYBERSPACE_V2.md` §7.6) with a different key. Its key needs two things together. The first is the place, which gives the location key of the room's region. The second is the **door secret**, which is sealed inside the door.

Opening the door gives the reader the door secret. The door secret and the place together give the room key. With the room key, the reader opens the room bag, and the room's contents then stand where they were hidden (§3.7.3).

Note (non-normative): an example. A Maze Kit tile placed on the grid is 16 gibsons on a side, which is exactly one aligned region of height 4 (2^4 = 16). A door hidden in that tile with height 4 locks the tile at height 4. A statue that the door's author then hides in the tile at height 4 goes into the room bag, and appears only to someone who opens the door. A statue hidden in the same tile at height 6 goes into the ordinary bag of height 6, and anyone who computes that bag's key finds it.

#### 3.7.1 Shape

A door is a `kind 3341` chest. It carries everything §3.1 lists for a chest: the `lock`, `title`, `requires`, `-` and `C` tags, and the sealed `content`. It also carries one more tag:

| Field | Value |
|---|---|
| `["door", "<height>"]` | exactly one. Marks the chest as a door, and gives the door's **height**. The height is a decimal string with no sign and no leading zeros, at least 1, written the way a bag's height is written (`CYBERSPACE_V2.md` §8.6). For example, `["door", "4"]`. |

**The room:** A door's room is the aligned region of the door's height that contains the door's coordinate, the coordinate in its `C` tag (`CYBERSPACE_V2.md` §4.7). An aligned region of height h is a cube 2^h gibsons on each side, whose lowest coordinate on each axis is a multiple of 2^h. The room is in the door's plane: a door in dataspace locks a room in dataspace, and a door in ideaspace locks a room in ideaspace (`CYBERSPACE_V2.md` §2.4). For example, a door with `["door", "4"]` locks the cube of 16 by 16 by 16 gibsons that contains its `C`.

**The height rules:**

- A door's height MUST NOT exceed the height of the bag that holds it. A higher door would lock a room larger than the region of the bag it was found in.
- A door inside a room (§3.7.6) MUST have a height lower than that room's. Its own room is then a smaller region inside the room that holds it.
- A reader MUST drop a door whose `door` tag lacks a well-formed height, or that breaks either rule above.

**Where a door may be:** A door lives in a bag or in a room bag. It never lives in a chest. A writer MUST NOT seal a door into a chest. A reader that finds a door inside a chest MUST NOT open its room. The reason is that a chest's contents are taken, not placed (§3.4), while a door locks a place in the world.

**The plaintext:** A door's sealed plaintext (§3.2) is a list of entries that holds exactly one entry, the **room entry**:

```
["room", "<door secret, 64 lowercase hex>"]
```

The whole plaintext is therefore one JSON array holding that one entry, for example `[["room","<64 lowercase hex>"]]`.

The **door secret** is 32 bytes from a cryptographically secure random source, written in the room entry as 64 lowercase hex characters. A writer makes one door secret for each room (§3.7.5), not one for each door. A writer MUST NOT put anything else in a door's plaintext. A reader takes the first well-formed room entry, and ignores every other entry.

**What an older reader sees:** A reader that does not know doors opens a door as a chest. It skips the room entry as an element it cannot read (`CYBERSPACE_V2.md` §7.6). It therefore sees a chest that holds nothing it can read.

#### 3.7.2 The room key and the room bag

```
room_key       = SHA-256( UTF-8("cyberspace:door") || location_decryption_key || door_secret )
room_lookup_id = SHA-256( room_key )
```

- `||` is byte concatenation.
- `UTF-8("cyberspace:door")` is the 15 bytes of that ASCII string. It is a domain prefix. It keeps a room key apart from any other hash that might be taken of the same two keys.
- `location_decryption_key` is the 32-byte location key of the room's region, computed as `CYBERSPACE_V2.md` §7.2 computes it for any aligned region. It is the same key that encrypts every ordinary bag of that region.
- `door_secret` is the door secret's 32 bytes, not its 64 hex characters.
- The input to the first hash is therefore 79 bytes long, and both outputs are 32 bytes. Written in a tag, `room_lookup_id` is 64 lowercase hex characters, as every bag's `d` is (`CYBERSPACE_V2.md` §7.2).

This is the two-factor key of `CYBERSPACE_V2.md` §7.8. The location key stands for presence: only someone who has computed the place's key has it. The door secret stands for the lock: only someone who has opened the door has it. A room key needs both.

`room_lookup_id` plays the part of a bag's `lookup_id` (`CYBERSPACE_V2.md` §7.2). It is published as the room bag's `d` tag, so that whoever holds the room key can find the room bag. Seeing it does not reveal the room key.

**The room bag:** The room bag is a `kind 33330` bag. It follows `CYBERSPACE_V2.md` §7.6 and §8.6 in every respect except these three:

1. Its key is `room_key`. The room key is used wherever §7.6 uses the location key. Its `d` tag is `["d", "<room_lookup_id, 64 lowercase hex>"]`.
2. It MUST NOT carry a height tag (`H` or `h`), a `hint` tag, a sector tag (`X`, `Y`, `Z` or `S`), or a `contents` tag. Its `content` SHOULD be empty. The reason is that nothing public may say where a room bag is, at what height, or what it holds.
3. It is signed by the door's signer, which is the key that signed the door event. A reader MUST fetch the room bag by its `d`, with the door's `pubkey` as the author. A reader MUST ignore a room bag signed by any other key. The reason is that everyone who has opened the door knows the room lookup id, and any of them could publish a bag of their own under it. Only the bag signed by the door's author is the room.

A room bag as published therefore has only the required tags of `CYBERSPACE_V2.md` §8.6:

```json
{
  "kind": 33330,
  "pubkey": "<the door's signer, 64 lowercase hex>",
  "content": "",
  "tags": [
    ["d", "<room_lookup_id, 64 lowercase hex>"],
    ["encrypted", "aes-256-gcm", "<payload base64>"],
    ["version", "2"]
  ]
}
```

**Everything else is a bag's:** A room bag holds items, rumors, protected items and references exactly as any bag does, and it follows a bag's lifecycle (`CYBERSPACE_V2.md` §7.6). A rumor in a room bag is vouched for by the room bag's signer, as a rumor in any bag is vouched for by that bag's signer.

**References:** A reference in a room bag names an event sealed with the room key. The room key is what `CYBERSPACE_V2.md` §7.6 (References) calls "this bag's key" when the bag is a room bag. The referenced event's `encrypted` tag still says `cyberspace:region`, as every hidden object's does. The reason is that a sealed object should not say whether it is behind a door. `cyberspace:region` still means what it always means: the key is derived, and is never fetched.

**Coordinates:** Every entry's `C` lies inside the room's region, just as every entry of any bag lies inside that bag's region.

**Comments:** A sealed comment (DECK-0006) on something in a room is encrypted with the room key. When the bag is a room bag, the room key is what DECK-0006 calls the "bag's region key". The reason is that a reader who has reached the place, but has not opened the door, must not be able to read comments on what the door hides.

#### 3.7.3 Opening a door

1. Open the door as a chest (§3.3), and read the door secret from its room entry.
2. Get the location key of the room's region (`CYBERSPACE_V2.md` §7.2), and derive the room key and the room lookup id from it (§3.7.2). For a door found in a bag of the door's own height, the reader already holds that location key, because it opened that bag with it.
3. Fetch the room bag, by its `d` and the door's author, and open it as a bag.
4. Draw the room bag's entries where they stand, as a bag's entries are drawn.

Opening a door publishes nothing. Until its user opens a door, a reader SHOULD draw the door in its closed look (§3.6), and SHOULD show nothing of the room.

A door whose room bag cannot be fetched opens onto an empty room. A reader SHOULD then say that the room could not be retrieved, rather than that the room is empty. The reason is that a room bag that cannot be fetched may only be missing from the relays the reader asked.

#### 3.7.4 Hiding in a room

A writer that hides something in a room, at the room's height, writes it into the room bag. It does not write it into the ordinary bag of that region and height. What the room bag holds is what the door locks.

A writer that hides something in the same place at any other height writes it into that height's own bag, like anything hidden anywhere. A door locks one height only. For example, beside a door of height 4, a shard hidden in the room at height 4 goes into the room bag. A shard hidden at the same coordinate at height 6 goes into the ordinary bag of height 6.

A room bag may hold any entry that a bag may hold, including chests and doors.

Note (non-normative): in ONOSENDAI's design for writing doors, which is being built, the room bag receives whatever the user places inside the room of one of their own doors, at that door's height. The user can leave any one placement out. ONOSENDAI also offers to move into the room what the user had already hidden there, at that height, before the door existed. Moving an entry rewrites both bags.

**Editing from another device (non-normative):** The door secret is sealed only to the door's lock. The device that sealed the door keeps the secret in its own storage. Any other device learns the secret the way a finder does: it finds the door, holds what opens the door, and opens it. Once a client knows the secret, and sees that the door was signed by its own user, it can offer to edit the room. Nothing in the door says that it is editable, and nothing needs to. The door's signature says who sealed it, and the secret says who can open it.

#### 3.7.5 More than one door to a room

A room has one door secret and one room bag. A writer MAY seal the same door secret into more than one door of the same room, each door with its own lock and its own look. A room with several doorways can then have a door in each. For example, a tile with a doorway in its north wall and another in its east wall can have a door in each: one locked to a silver key item and one locked to a gold key item. Either key opens the room.

A writer MUST NOT give two doors different door secrets when the two doors have the same height, stand in the same region, and are signed by the same key. The reason is that the room bag's address comes from the door secret. Two doors of one room with different secrets would name two different room bags, and the place would have two rooms at one height.

A reader therefore treats every door with the same signer, the same height and the same region as a door to one room. Opening any of them opens all of them. In the example above, a finder who opens the north door with the silver key finds the east door open too.

#### 3.7.6 Doors inside rooms

A room bag MAY hold a door. The inner door's height MUST be lower than the room's (§3.7.1), so the inner door's room is a smaller region inside the outer room. A reader finds the inner door only by opening the outer door, because the inner door is an entry of the outer room bag. It then opens the inner room like any other (§3.7.3), with the location key of the inner door's height. Nesting is limited only by height.

A door locks only its own height (§3.7.4). Doors at different heights therefore never compete for a placement. A placement at the inner door's height, inside the inner room, goes into the inner room bag. A placement at the outer door's height goes into the outer room bag. Two doors of the same height in the same region are one room (§3.7.5), never one room inside another.

Note (non-normative): an example. A door of height 6 locks a room 64 gibsons on a side. Inside that room, at height 6, its author hides a second door, of height 4, which locks one 16-gibson cube of the larger room. The second door is an entry of the outer room bag. A shard placed in the small cube at height 4 goes into the inner room bag. A shard placed in the small cube at height 6 goes into the outer room bag. A finder opens the outer door, then sees the inner door, still closed, and opens it in turn.

A reader MAY show how deep a door is, as the number of rooms it was found inside. (Non-normative: ONOSENDAI's design shows a door's author the door's room as an outline, with one line for each level. A door at the top level gets one line, a door inside another door's room gets two, and so on.)

#### 3.7.7 Changing the lock

Only a writer that knows the door secret can seal a door of the room to a different lock. The reason is that the new seal carries the same plaintext, the room entry, so the writer must know the secret it holds. A writer that does this SHOULD rotate the room:

1. Make a new door secret. That gives a new room key and a new room lookup id.
2. Publish the room bag again under the new key and the new lookup id. Seal every event it references again, with the new room key.
3. Seal the new door secret into every door of the room (§3.7.5), each to its own lock.
4. Request deletion (NIP-09) of the old room bag, and of the events it referenced.

**Why rotate (non-normative):** Whoever opened the door before the change kept its secret. A door secret is knowledge, as an item is (§6). Rotation is the only way that a new lock keeps those earlier openers out of what the room holds from then on. Rotation does not take back what they already read. It also does not reach copies that relays keep despite a deletion request.

#### 3.7.8 Removing a door

**One of several doors:** When a room has more than one door (§3.7.5), removing one of them removes only that door event, from the bag that holds it. The room's entries stay in the room bag, and the room bag stays published, as long as any other door still opens the room. The reason is that moving the entries out would show them to everyone at the place, and removing them would take them from the holders of the other doors' keys, although those doors still stand.

Note (non-normative): removing a door does not shut out anyone who already opened it, because they keep the door secret. A writer that removes a door to shut those people out should also rotate the room (§3.7.7).

**The last door:** A writer that removes the last door of a room first deals with the room's entries, in one of two ways:

- it moves them into the ordinary bag of the room's region at the room's height, so that they stand where they stood and anyone who reaches the place can find them; or
- it removes them.

It then removes the door from the bag that holds the door, and requests deletion (NIP-09) of the room bag.

**What each step needs:** Moving or removing the room's entries needs the door secret. So does finding the room bag in order to delete it. Removing the door itself needs only the door's signing key and the key of the bag that holds the door.

A writer that knows the door secret MUST NOT leave behind a room bag that no door names. Such a room bag could no longer be found through any door, yet it would stay readable to everyone who had opened the door before. A writer that does not know the door secret can still remove the door. The room bag then stays on relays, readable only by whoever kept its secret.

#### 3.7.9 Why a door has a bag of its own (non-normative)

- **Size:** A chest is one NIP-44 payload, and holds at most 65,535 bytes. A room built from the Maze Kit holds pieces of 7 to 93 KB each. A room bag is a bag, so its large entries go by reference, as any bag's do.
- **Hiding in a room is a bag write:** Hiding one more thing in a room rewrites the room bag, exactly as hiding something anywhere rewrites a bag. The door itself is untouched. A writer that knows the door secret needs nothing else to add to the room.
- **The region key alone opens nothing behind a door:** Suppose a room's contents were events sealed with the region key, and named only from inside the door. Anyone at the place could then try the region key on every recent sealed event, and open the room's contents without the lock. With the room key, they need the door.
- **Nothing public points at the room:** A room bag's `d` is a hash of a key that only openers hold. The room bag states no height and no contents. What a relay sees is that one author published two bags close together in time, which it sees of anyone who hides things twice.
- **Why the height is in the tag:** A door at the top level could take its height from the bag that holds it. A door inside a room cannot, because its room is smaller than the room that holds it. Every door therefore states its own height.

## 4. The item listing: `kind 33340` (normative)

### 4.1 Purpose

A chest can be sealed to any item whose public key the sealer knows (§3.2). An **item listing** is how an item's public key, name and picture become known, without giving the item away. It is the one event in this DECK that is published in public.

### 4.2 Shape

`kind 33340` is addressable: relays keep the newest event per `(pubkey, kind, d)`, so a lister corrects a listing in place by publishing it again.

| Field | Value |
|---|---|
| `kind` | `33340` |
| `content` | the item's description, or empty |
| `["d", "<item pubkey hex>"]` | exactly one. The item's public key, 64 lowercase hex. |
| `["name", "<name>"]` | the item's name, at most 64 characters |
| `["proof", "<128 lowercase hex>"]` | exactly one. A BIP-340 signature by the item's secret (§4.3). |
| `["imeta", ...]` | OPTIONAL. The item's picture, under the rules of §2.4. |

A listing MUST NOT contain the item's secret, in any tag or in the content. A writer SHOULD check its own output for the secret before signing, because a listing that carries it gives the item to every reader of every relay it reaches.

### 4.3 The proof

```
m     = SHA-256( UTF-8( "cyberspace:item-listing:" || lister || ":" || item ) )
proof = BIP-340 signature of m by the item's secret key
```

`lister` is the listing event's `pubkey` and `item` is the item public key, each as 64 lowercase hex characters. `m` is the 32-byte message BIP-340 signs.

A reader MUST verify the listing event's own signature and MUST verify `proof` against `m` with the `d` value as the public key, and MUST NOT show a listing that fails either.

**What the proof proves:** Only someone who holds the item can produce it, so nobody can list a public key they made up, or an item they do not hold. It names the lister inside `m`, so a proof cannot be lifted from one listing onto another account.

**What it does not prove:** It shows that the lister holds the item, not that the lister forged it. Every holder of an item can produce a valid proof for themselves (§6).

### 4.4 Who lists

Listing is a choice the item's holder makes, and it cannot be undone in practice: a NIP-09 deletion can be requested, but copies of a public event outlive it. A client SHOULD offer to list only the items its user forged, and SHOULD ask for confirmation with a warning that the listing is permanent and that the item itself stays secret.

### 4.5 The feed

A client that shows listings (ONOSENDAI's ITEM FEED):

- SHOULD query `kind 33340` from the relays it reads;
- MUST verify each listing as §4.3 says;
- SHOULD show each item once, keyed by its public key: today the newest verified listing of that item wins, whoever listed it;
- SHOULD let its user seal a chest to a chosen listing's public key, with the listing's name as the chest's `requires` label.

## 5. Test vectors

`kinds-vectors.json`, beside this DECK, holds one of each event this DECK defines, built from fixed keys and fixed nonces by `kinds-vectors.mjs`: a key item; a chest sealed to that item, with its plaintext, NIP-44 nonce and conversation key; and a listing of the item with its proof message. The key item and the chest both carry `-`. The chest holds one message, written as a rumor by the chest's signer: it carries `-`, its `id` is its canonical id, and it has no `sig`.

ONOSENDAI's readers (`keyItemOf`, `chestItemOf`, `openWithSecret`, `listingOf`, `unbag` of a bag holding the item and the chest, and `readContents` with the sealer `sealerOf` gives for the chest found in that bag) and cyberspace-mcp's (`keyItemOf`, `chestItemOf`, `openWithSecret`, `unbag`, and `readContents` with the sealer `sealerOfSeen` gives) accept every vector, as of ONOSENDAI `834df05` and cyberspace-mcp `d784289`. Both mark the message as verified when given the chest's signer as the sealer, and as a claim when given no sealer or any other key.

The signatures in the vectors use 32 zero bytes of BIP-340 auxiliary randomness so that the file is reproducible. A reader MUST accept any valid signature, not only these.

`kinds-vectors.json` does not yet hold vectors for a door, a room key, a room bag, or a chest with a look. They will be added with the first implementation that writes them.

## 6. Security considerations

- **An item is knowledge:** Anyone who has read an item holds it forever, and can give it to anyone by copying the secret. There is no scarcity in this DECK and no revocation. Games that need either build it on the chain later.
- **A listing reveals an item's existence and public key:** It does not reveal where the item is hidden or let anyone open a chest sealed to it.
- **Listings by holders:** Because the proof shows holding rather than forging, any holder can publish a listing of an item under any name and picture, and the newest listing currently wins the feed. A client that wants the forger's word to stand needs a second proof binding the listing to the original item event's signer (§7).
- **Chest size:** A chest is one NIP-44 payload, so it holds at most 65,535 bytes, much less than a bag. Large contents belong in a bag, in a room (§3.7), or behind references once chests support them.
- **A door stops walkers by courtesy, and the seal is the lock:** Stopping a walker at a closed door (§3.6) is something a reader chooses to do. Another reader may let its walker pass through the door. That walker finds nothing behind it, because what the room holds is sealed with the room key.
- **A door secret is knowledge:** Whoever has opened a door can give its secret to anyone. Whoever receives the secret can open the room from anywhere, as long as they can compute the place's location key. Rotation (§3.7.7) protects only what the room holds after the rotation.
- **Two bags in time:** Nothing in a room bag's content or tags links it to its place. A relay does see when the room bag was published. A room bag published moments after the bag that holds its door ties the two bags to one author and one moment. A writer that wants to hide even that link may publish the two bags at different times.
- **The door secret is the only way to edit a room:** A door's secret is sealed to its lock and nowhere else. Only a device that sealed the door, or that has opened it, can therefore hide more in its room, rotate the room, or find its room bag. An author who loses that device, and holds no copy of the item that opens the door, can still remove the door. That author cannot edit the room or delete its room bag (§3.7.8). An author who wants to keep editing keeps a copy of each key item.
- **A look is public to its finders, and its live parts belong to their authors:** A look's live parts (§3.6) name public objects, and their authors can replace or delete them. A door or a chest can therefore change its appearance after it was hidden. A look carries no secret: whoever can see the chest can read its look.
- **A message in a chest proves its author only in place:** It is a rumor, so a finder who copies it out cannot publish it as a note its hider signed, and the hider's signed items carry `-`, so a relay that honours NIP-70 refuses a copy published by anyone but the hider; a relay that does not honour it still accepts one. Neither is deniability: whoever publishes the bag with its region key, together with what opens the chest, can show what the chest held, signed by its author.
- **A model is someone else's object:** An item's `model` names a public object that its author can replace at any time (§2.5), so what an item looks like can change after it was hidden, and an author who deletes the object leaves every item that wears it drawn without a model. A forger who wants the look fixed names an object they authored.
- **The `requires` label is the hider's text:** It is shown to readers who cannot open the chest and may say anything; it is data, never an instruction.

## 7. Open questions (non-normative)

1. **Holder versus forger:** Should a listing bind to the forger, for example with a proof over the original item event's id signed by the event's author, so that only the forger's listing is shown? Today ONOSENDAI offers listing only to the forger, but the protocol accepts any holder.
2. **`name` or `title` on a listing:** Items and chests moved to `title` on 2026-10-09, the tag other kinds use for a human name. The listing uses `name`. One of them should change before a third client ships.
3. **References in chests:** A chest's plaintext has the shape of a bag's plaintext, and a bag's plaintext allows references. No reader follows a reference inside a chest. A room bag (§3.7.2) is a bag, so a reader follows its references as it follows any bag's. Large contents can therefore be locked behind a door today. A chest that must itself hold more than 65,535 bytes still needs a rule. Two candidates are references sealed with a key carried inside the chest, and a room bag of the chest's own.
