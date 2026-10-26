# DECK-0004: Items, Chests and Doors

DECK: 0004
Title: Items, Chests and Doors
Status: Draft
Mandatory: no
Created: 2026-10-15
Last updated: 2026-10-26
Requires: `CYBERSPACE_V2.md` §7.2 (keys), §7.6 (the bag) and §8.6 (its event); DECK-0003 (SNO objects, for looks); NIP-01, NIP-09, NIP-44 v2, NIP-70, NIP-92; BIP-340

## Abstract

An **item** is a keypair hidden at a place. Whoever reads it holds its private key, and holding the key is owning the item. A **chest** is a list of things sealed to one public key: an item's, so that it opens only for whoever holds that item, or a person's, so that it is a gift. An **item listing** puts an item's name, picture and public key in public, never its private key, so that anyone can seal a chest to an item they have never held.

Items and chests ride inside bags (`CYBERSPACE_V2.md` §7.6) as ordinary inline items, so a chest hidden at a place has two gates: the place, which a reader must reach to find the chest at all, and the lock, which a reader must hold to open it. Nothing here touches the movement chain. Reading an item and opening a chest are local acts.

A **door** is a chest that locks part of the world instead of holding things to take. Its author hides things in the door's **room**, a region at the door's height, and they go into a bag of their own whose key needs both the place and the secret behind the door. Whoever opens the door sees the room's contents where they stand. A chest or a door may wear a SNO object as its **look**, closed and open.

This DECK writes down what ONOSENDAI (from its Keys and Chests slice of 2026-10-09, PRs #252, #275 and #331) and cyberspace-mcp already do, so that a third client can read and write the same things.

## Terms

- **Item:** an inline bag item of `kind 3340` whose `secret` tag holds a secp256k1 private key (§2).
- **Item public key:** the BIP-340 x-only public key of an item's secret. It is the item's identity and the lock a chest names.
- **Holding an item:** knowing its secret. There is no other kind of ownership.
- **Chest:** an inline bag item of `kind 3341` whose content is a NIP-44 v2 payload sealed to a lock (§3).
- **Lock:** the public key a chest is sealed to, an item's or a person's.
- **Item listing:** a public `kind 33340` event that names an item by its public key (§4).
- **Rumor:** an item that carries an `id` and no signature (`CYBERSPACE_V2.md` §7.6, Rumors). A message sealed in a chest is written as one (§3.2).
- **Forger:** whoever generated an item's keypair. In this DECK the forger is also the item event's signer, the hider.
- **Door:** a chest that carries a `door` tag (§3.7).
- **Room:** the aligned region of a door's height that holds the door (§3.7.1).
- **Door secret:** 32 random bytes sealed inside a door, one per room (§3.7.1).
- **Room bag:** a `kind 33330` bag that holds what is hidden in a room, encrypted with a key derived from the place and the door secret (§3.7.2).
- **Look:** a SNO object that a chest or a door is drawn as, where it stands (§3.6).

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

**Taking an item (non-normative).** Holding is a fact of knowledge, not of a client's records: whoever has decrypted an item holds it, whatever their client does next. A client may still ask its user to take an item before counting it among the items the user holds and opens chests and doors with (§3.3). ONOSENDAI does since 2026-10-26: an item found in a bag, a room or a chest is kept only once its user takes it, so a key opens things only once taken.

**Legacy form (readers MAY accept).** Items forged on 2026-10-09, before this shape settled, carry the secret as the `content`, the name in a `name` tag and the description in an `about` tag. A reader MAY accept that form when no `secret` tag is present, reading the secret from `content`. A writer MUST NOT produce it: a client that knows nothing of this kind shows an item's content as text, and the content of a legacy item is the secret.

### 2.3 Why the secret is in a tag, and why `-`

**The content is what other clients show.** A client that does not know `kind 3340` renders the content of an item as a note. If the secret were the content, every such client would print it. A tag is invisible to them.

**`-` keeps the hider's signature at home.** The item event is signed by the hider and carries the secret. A finder who decrypts the bag holds that signed event, and could publish it to a relay, which would give the item to everyone who reads that relay under the hider's name. NIP-70 tells a relay to accept a protected event only from its author, so a compliant relay refuses that publication. It does not stop a finder from re-signing the same secret as themselves; nothing can, because a finder holds the secret. What it stops is the forgery of attribution. The key item carried `-` from the day it was introduced; since 2026-10-20 every item hidden in a bag or sealed in a chest carries it (`CYBERSPACE_V2.md` §7.6, Protected items).

### 2.4 The picture

An item MAY carry a picture in a NIP-92 `imeta` tag whose `url` is a base64 data URI:

```
["imeta", "url data:image/png;base64,iVBORw0...", "m image/png", "dim 32x32"]
```

A reader MUST accept the picture only when all of these hold, and otherwise MUST read the item as one without a picture:

- the URI is `data:image/<png|jpeg|gif|webp>;base64,<base64>`, and at most 8,192 characters long;
- `dim` gives a width and a height that are integers from 1 to 32.

**Why a data URI and never an address (non-normative).** An `https` picture would make every reader's client fetch the hider's server when it lists the item, telling that server the reader's address and the moment they found the item. A data URI travels inside the seal and fetches nothing.

### 2.5 The model and its motion

An item MAY name a SNO object (DECK-0003) to be drawn as, where it stands in space, in place of whatever mark the reader draws for an item, and MAY say how that object moves. Both are tags of the item, so they travel with it wherever the item goes: into a bag, into a chest, into a copy a reader takes, and into the new version a move writes.

```
["model", "33331:<64 lowercase hex pubkey>:<d>", "<relay>"]
["animate", "bob", "spin-y", "spin-x"]
```

**`model`.** The second element is the address of a public `kind 33331` object (DECK-0003 §3.1), written `kind:pubkey:d` as an `a` tag writes it and as a placement's reference names an object (DECK-0003 §1.10). It names the object by address and not by event id on purpose: when the object's author publishes a new version, every item that wears it is drawn as the new version. The third element is OPTIONAL: a relay that holds the object, a `ws://` or `wss://` URL. A reader:

1. MUST accept the tag only when its second element is `33331`, a colon, 64 lowercase hex characters, a colon, and a `d` of 1 to 128 printable ASCII characters with no spaces; otherwise it MUST read the item as one without a model.
2. MUST ignore a third element that is not a `ws://` or `wss://` URL, and read the tag as one without a relay.
3. takes the first `model` tag it accepts, and ignores any other.
4. fetches the newest event at that address from the relay named, if any, and from the relays it already reads. An object it cannot fetch, a sealed object (one with an `encrypted` tag, DECK-0003 §3.4), and an object whose payload fails DECK-0003 §1.9 are read as no model, and the reader draws the item as it draws an item without one.

**`animate`.** Each element after the first is one motion. A reader MUST ignore a name it does not know, MUST read a name given twice as given once, and MUST read the motions only when the item carries a `model` it accepted. A reader reads the motions of every `animate` tag the item carries, so motions split across two tags are read as one list. A writer MUST write each motion at most once, in the order `bob`, `spin-y`, `spin-x`, in one tag, and MUST NOT write the tag without a `model` or with no motions. The motions stack:

| Motion | What it is |
|---|---|
| `bob` | The object rises and falls along the item's Y axis on a sine wave, gently: a period of a few seconds, and a reach each way that is a small fraction of the object's size. |
| `spin-y` | The object turns at a steady rate about the Y axis through its own centre. |
| `spin-x` | The object turns at a steady rate about the X axis through its own centre. |

When both turns are present, the turn about X is inside the turn about Y (a point of the object is first turned about X, then the result about Y), and the turn about Y SHOULD be the slower of the two, by a ratio that is not a ratio of small whole numbers, so that the object tumbles without visibly repeating. ONOSENDAI turns X at 0.5 radians a second and Y at 0.5 divided by the golden ratio. The object's centre is the middle of its bounds, with every object it places (DECK-0003 §1.10). The axes are the axes the object was built on (DECK-0003 §1.2), turned with the view as the reader turns a hidden shard. A reader SHOULD hold the object still when its user has asked for reduced motion.

**Where it stands and how large it is.** The object's centre stands exactly where the reader would draw the item's own mark: the item's coordinate (`CYBERSPACE_V2.md` §7.6), at the middle of its gibson. It is drawn at its own scale: one model unit is 2^`unit` gibsons (DECK-0003 §1.6), as a hidden shard is. A reader MAY draw it larger when it would otherwise be too small to see, as long as everything about it (the object, its box below, its cut below) is scaled together.

**The box.** A reader that draws an outline around an item drawn as its model SHOULD draw a box of whole gibsons that holds the object through the whole of its motion:

1. Start from the object's half extents about its centre on each axis.
2. For `spin-y`, X and Z reach the largest distance of any point of the object from the Y axis through the centre. For `spin-x`, Y and Z reach the largest distance from the X axis. For both, X and Z reach the largest distance from the centre, and Y the largest distance from the X axis. A placed object's points MAY be taken as the corners of its bounds.
3. For `bob`, add the bob's reach to Y on both sides.
4. Convert to gibsons and round each axis up to a whole number, never less than 1. An object that fits in 2 by 1 by 1 gibsons and does not turn gets a box of 2 by 1 by 1.

The box is centred on the item's place. Nothing about the box or the object is limited except by the region: both are cut at the walls of the region of the bag that holds the item, exactly as a hidden shard is cut at them (`CYBERSPACE_V2.md` §7.6). Because the object moves inside walls that do not, the cut is made where the object is at each moment, not once where it starts.

**Why by address, and what a fetch reveals (non-normative).** An address follows the author's edits, which is what someone dressing an item in their own object wants. The fetch is a query to relays for one public object, the same query any client makes to draw a placed object; it names the object, never the item, the bag, or where either is. A relay that sees it learns that someone asked for that object, which is already true of every placement of it.

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
| `["look", "<SNO object payload>"]` | OPTIONAL. The object the chest is drawn as, closed (§3.6). |
| `["look", "<SNO object payload>", "open"]` | OPTIONAL. The object it is drawn as once opened (§3.6). |
| `["door", "<height>"]` | present only on a door, which §3.7 defines. |

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

**What goes in.** The entries of a chest follow the rules for the items of a bag (`CYBERSPACE_V2.md` §7.6), with the chest in the place of the bag and the chest's signer in the place of the bag's:

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
- **Rumors in a chest.** A message rumor, or a hidden audio rumor, is vouched for by the chest that holds it when all three of these hold: the rumor's `pubkey` equals the chest's own `pubkey`; the rumor's `id` is its canonical id; and the chest's own authorship is verified, because the chest is signed and its signature verifies. A reader that keeps a vouched-for rumor MUST attribute its content to the chest's signer, and MAY present that authorship as verified. Reason: the chest's signature covers its `content`, which decrypts to exactly one list, in which this rumor's `pubkey` is the chest's own. This is the rule of `CYBERSPACE_V2.md` §7.6 ("Inside an item"), and it applies at every depth.
- **The chest's own signer, never the bag's.** The key that vouches for a rumor is the `pubkey` of the chest the rumor is in. It is never the author of the bag that holds the chest, and never the signer of an outer chest. A chest inside another chest may have been sealed by someone else, for example when a hider seals a copy of a chest they took into a chest of their own; a rumor inside it that names the bag's author is a claim.
- **A chest that is a claim vouches for nothing.** When a chest's own authorship is not verified, every rumor inside it has a `pubkey` that is a claim. `CYBERSPACE_V2.md` §7.6 also counts a chest that is itself a rumor vouched for by what holds it; writers do not write one (§3.1), and since writers write only messages and hidden audio as rumors, a reader MAY read an unsigned chest, or a rumor of any kind other than `1` and `1063`, as an unsigned item whose `pubkey` is a claim. ONOSENDAI and cyberspace-mcp drop an unsigned chest found directly in a bag, and keep one found inside another chest as a claim, so that nothing inside it is vouched for.
- **Signed messages.** A reader MUST still accept a signed message whose signature verifies, because messages sealed into chests before 2026-10-20 are signed. Its author is a fact on the strength of its own signature.
- A reader MUST NOT drop an item for carrying `-` or for lacking it.
- A chest MAY hold items of any kind, including items (§2) and other chests. A chest holding the item that opens the next chest is a chain.
- A plaintext that is not a JSON array is a chest the reader cannot read; it SHOULD say so rather than show an empty chest.
- Readers today do not follow references inside a chest: a reference is a relay query that opening a chest should not make on its own. A reader MAY skip references in a chest, and a writer SHOULD NOT put them there until a later revision says how they are fetched.

**A chest's contents are taken, not placed.** A reader lists what an opened chest holds, for its user to take (below), and SHOULD NOT draw it in the world. Readers before 2026-10-26 drew each content at its `C` when that lay in the chest's plane and inside the region of the bag holding the chest, and otherwise where the chest stands; a hider who wants things to appear where they stand when a lock opens uses a door (§3.7). A content item still carries a `C` tag, as every item does.

**Taking.** Taking something out of an opened chest copies it into the reader's own keeping. A reader MAY offer to take one thing at a time and everything at once. The chest still holds it for the next reader. A taken copy of a rumor proves nothing to anyone else: it has no signature, and the chest that vouched for it is not part of the copy. A client MAY keep, with what it took, whether the author was verified when its user opened the chest, as cyberspace-mcp's `take` keeps what `open_chest` said; that record is the reader's own, and nobody else can check it.

**Taking an object that carries its parts.** Where DECK-0003 lets an object payload carry the objects it places in a table (`objects`, DECK-0003 §1.10), a reader keeps only table entries keyed under the pubkey of the event the table travels in. A copy taken out of a chest and later hidden under the taker's own key would therefore lose every carried part. A reader that copies such an object into its user's keeping SHOULD key the table under its user's pubkey: each carried object gets an address `33331:<user pubkey>:<d>` of its own, with a fresh `d`, and every `refs` entry naming it is rewritten to match. Objects placed by an address that is not in the table are links and are left as they are.

**Removing.** Only the hider removes something from a chest, by sealing the remaining entries again (§3.2) with a fresh sender key and the same lock, and rewriting the bag that holds the chest. An emptied chest is still a chest.

### 3.5 Why a chest is a bag item and not a kind of bag (non-normative)

A chest is placed exactly where an item is placed, in the same bag, under the same region key, and rides every rewrite of that bag with the rest. Making it an item keeps one container for everything hidden at a place and lets a chest sit inside another chest with no new machinery. NIP-44 rather than the region cipher, because the lock is a public key: the sealer must be able to encrypt to a key whose secret they do not hold, which a symmetric region key cannot do.

### 3.6 The look

A chest or a door MAY name a SNO object (DECK-0003) to be drawn as, where it stands, closed and open:

```
["look", "<SNO object payload, as a JSON string>"]
["look", "<SNO object payload, as a JSON string>", "open"]
```

- **The payload.** The second element is an object payload exactly as DECK-0003 §1.1 defines it: the JSON a `kind 3330` shard carries in its `content`. A reader MUST check it under DECK-0003 §1.9 and, when it fails, MUST read the chest as one without that look. A look is never a reason to drop a chest.
- **Closed and open.** A tag with no third element is the **closed look**, and one whose third element is `open` is the **open look**. A reader takes the first well-formed tag of each, and ignores any other `look` tag, including one whose third element it does not know.
- **Where it stands.** A look is placed as a hidden shard is placed: the origin of its payload stands at the chest's coordinate (`C`), at the middle of that gibson; one model unit is 2^`unit` gibsons (DECK-0003 §1.6); it is posed by its own payload (DECK-0003 §1.7); and it is cut at the walls of the region of the bag or room bag (§3.7) that holds the chest. This is unlike an item's `model` (§2.5), which centres a floating object on the item's point: a look's author decides where its origin falls, so a chest sits on a floor and a door fills a doorway.
- **A copy, with live parts if its author wants them.** A look is a payload, so it is fixed as the hider sealed it. It MAY place public objects by `a` reference (DECK-0003 §1.10), and those follow their authors' edits. A writer that wants a public object turned, scaled or moved writes a look whose only content is one part placing it. A look MAY carry the objects it places, where DECK-0003 allows a payload to (`objects`, §1.10), for objects its author never published.
- **Drawing it.** A reader draws the closed look until its user has opened the chest or door, and the open look after, when there is one. With no open look, an opened door is not drawn at all, and an opened chest keeps its closed look. With no closed look, a reader draws whatever it draws for a chest.
- **Walkers.** A reader that holds walkers at objects' faces (DECK-0003 §1.12) SHOULD hold them at a look's faces by the look's own `constrain`, as at a hidden shard's: a chest's look always, a door's closed look until its user has opened the door, and a door's open look after.
- **Size.** A look rides inside the bag with everything else, so every rewrite of the bag carries it again. A writer SHOULD keep looks small; ONOSENDAI refuses one over 16,384 bytes, the size past which it hides a shard by reference instead of inline.
- A reader that does not know `look` draws the chest as it always has.

**Built-in looks (non-normative).** ONOSENDAI offers looks of its own, which are ordinary looks on the wire. For a door: slabs half a gibson thick, sized to the Maze Kit's standard openings (CRAWL 2 by 2, DOOR 2 by 3, HALL 4 by 6 gibsons), each with an open version. For a chest: a treasure chest a gibson across with its origin on its base, closed and with its lid up.

### 3.7 Doors

A **door** is a chest that locks part of the world instead of holding things to take. What it locks is its **room**, a region of the door's own height. Whatever its author hides there at that height goes into a **room bag**, encrypted with a key that needs both the place and the door's secret. Opening the door gives the secret; the secret and the place give the room key; the room's contents then stand where they were hidden.

#### 3.7.1 Shape

A door is a `kind 3341` chest with everything §3.1 lists, and:

| Field | Value |
|---|---|
| `["door", "<height>"]` | exactly one. Marks the chest as a door and gives its **height**: a decimal string with no sign and no leading zeros, at least 1, written as a bag's height is (`CYBERSPACE_V2.md` §8.6). |

The **room** is the aligned region of the door's height whose base holds the door's `C` (`CYBERSPACE_V2.md` §4.7), in the door's plane. A door's height MUST NOT exceed the height of the bag that holds it. A door inside a room (§3.7.6) MUST have a height lower than that room's. A reader MUST drop a door whose `door` tag is missing a well-formed height or breaks either rule. A door lives in a bag or a room bag, never in a chest, whose contents are taken rather than placed: a writer MUST NOT seal a door into a chest, and a reader that finds one there MUST NOT open its room.

A door's plaintext (§3.2) is a list of entries holding one **room entry**:

```
["room", "<door secret, 64 lowercase hex>"]
```

The **door secret** is 32 bytes from a cryptographically secure random source, made once for each room (§3.7.5). A writer MUST NOT put anything else in a door's plaintext. A reader takes the first well-formed room entry and ignores every other entry. A reader that does not know doors skips the room entry as an element it cannot read (`CYBERSPACE_V2.md` §7.6), so it sees a chest that holds nothing it reads.

#### 3.7.2 The room key and the room bag

```
room_key       = SHA-256( UTF-8("cyberspace:door") || location_decryption_key || door_secret )
room_lookup_id = SHA-256( room_key )
```

`location_decryption_key` is the key of the room's region (`CYBERSPACE_V2.md` §7.2). This is the two-factor key of `CYBERSPACE_V2.md` §7.8: presence and a secret together.

The room bag is a `kind 33330` bag under `CYBERSPACE_V2.md` §7.6 and §8.6 in every respect but these:

- Its key is `room_key`, used wherever §7.6 uses the location key, and its `d` is `room_lookup_id`.
- It MUST NOT carry a height tag (`H` or `h`), a `hint`, a sector tag or a `contents` tag, and its `content` SHOULD be empty. Nothing public may say where it is, at what height, or what it holds.
- It is signed by the door's signer. A reader MUST fetch it by `d` with the door's `pubkey` as the author, and MUST ignore a room bag signed by any other key.

Everything else is a bag's: items, rumors vouched for by the room bag's signer, protected items, references, and the lifecycle. A reference in a room bag names an event sealed with the room key, which is "this bag's key" in `CYBERSPACE_V2.md` §7.6 (References). Its `encrypted` tag says `cyberspace:region`, as every hidden object's does, so that a sealed object does not say whether it is behind a door. Every entry's `C` lies inside the room's region, as in any bag. A sealed comment (DECK-0006) on something in a room is encrypted with the room key, which is the "bag's region key" DECK-0006 names when the bag is a room bag, so that a reader at the place who has not opened the door cannot read it.

#### 3.7.3 Opening a door

1. Open the door as a chest (§3.3) and read the door secret.
2. Take the room's location key (`CYBERSPACE_V2.md` §7.2), and derive the room key and lookup id (§3.7.2). For a door found in a bag of its own height, the location key is already in hand.
3. Fetch the room bag and open it as a bag.
4. Draw its entries where they stand, as a bag's are drawn.

Opening publishes nothing. A reader SHOULD draw a door that its user has not opened with its closed look (§3.6), and SHOULD show nothing of the room until then. A door whose room bag cannot be fetched opens onto an empty room, and a reader SHOULD say that the room could not be retrieved rather than that it is empty.

#### 3.7.4 Hiding in a room

A writer that hides something in a room at the room's height writes it into the room bag, not into the bag of that region: that is what the door locks. Something hidden at any other height, in the same place, goes into that height's own bag like anything hidden anywhere: a door locks one height. A room bag may hold any entry a bag may hold, chests and doors included.

Note (non-normative): ONOSENDAI writes into a room bag whatever its user places inside the region of one of their doors at that door's height, and lets them leave a placement out. It also offers to move into the room what they had already hidden there before the door existed; moving an entry rewrites both bags.

**Editing from another device (non-normative).** The door secret is sealed only to the lock. The device that sealed the door keeps the secret; any other device learns it the way a finder does, by finding the door, holding what opens it, and opening it. Once it knows the secret, a client that sees the door was signed by its own user can offer to edit the room. Nothing in the door says it is editable, and nothing needs to: the signature says who sealed it, and the secret says who can open it.

#### 3.7.5 More than one door to a room

A room has one door secret and one room bag. A writer MAY seal the same door secret into more than one door of the same room, each with its own lock and look, so that a room with several doorways has a door in each. A writer MUST NOT give two doors of the same height in the same region, signed by the same key, different door secrets. A reader therefore treats every door of one signer, height and region as a door to one room: opening any of them opens all of them.

#### 3.7.6 Doors inside rooms

A room bag MAY hold a door. The inner door's height MUST be lower than the room's (§3.7.1), so its own room is a smaller region inside the outer one. A reader finds the inner door only by opening the outer door, and opens the inner room like any other (§3.7.3), with the location key of the inner door's height. Nesting is limited only by height.

Because a door locks only its own height (§3.7.4), doors at different heights never compete for a placement: a placement at the inner door's height inside the inner room goes into the inner room bag, and one at the outer door's height into the outer. Two doors of one height in one region are one room (§3.7.5).

A reader MAY show how deep a door is: the number of rooms it was found inside. ONOSENDAI shows its author a door's room as an outline with one line for each level.

#### 3.7.7 Changing the lock

Only a writer that knows the door secret can seal a door of the room to a different lock, because the new seal carries the same plaintext. One that does SHOULD rotate the room:

1. make a new door secret, and so a new room key and lookup id;
2. publish the room bag again under them, sealing every event it references again with the new room key;
3. seal the new secret into every door of the room (§3.7.5), each to its own lock;
4. request deletion (NIP-09) of the old room bag and of the events it referenced.

**Why (non-normative).** Whoever opened the door before kept its secret, and a door secret is knowledge, as an item is (§6). Rotation is the only way a new lock keeps them out of what the room holds from then on. It cannot unsee what they read, or reach copies that relays keep despite a deletion.

#### 3.7.8 Removing a door

A writer that removes a door either moves the room's entries into the bag of the room's region at the room's height, so that they stand where they stood and anyone at the place can find them, or removes them. It then removes the door from the bag that holds it, and requests deletion (NIP-09) of the room bag. Moving or removing the room's entries, and finding the room bag to delete it, need the door secret; removing the door itself needs only the signer and the key of the bag that holds it. A writer that knows the secret MUST NOT leave a room bag that no door names. A writer that does not can still remove the door, and the room bag then stays on relays, readable only by whoever kept its secret.

#### 3.7.9 Why a door has a bag of its own (non-normative)

- **Size.** A chest is one NIP-44 payload of at most 65,535 bytes, and a room built from the Maze Kit holds pieces of 7 to 93 KB. A room bag is a bag: its large entries go by reference.
- **Hiding in a room is a bag write.** One more thing in a room rewrites the room bag, exactly as hiding it anywhere rewrites a bag. The door is untouched, and a writer that knows the secret needs nothing else to add to the room.
- **The region key alone opens nothing behind a door.** If a room's contents were events sealed with the region key and named only from inside the door, anyone at the place could try the region key on every recent sealed event and open the room without the lock. With the room key, they need the door.
- **Nothing public points at the room.** Its `d` is a hash of a key that only openers hold, and it states no height and no contents. What a relay sees is that one author published two bags close together in time, as it sees of anyone who hides twice.
- **Why the height is in the tag.** A door could take its height from the bag that holds it, but a door inside a room cannot: its room is smaller than the room that holds it.

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

**What the proof proves.** Only someone who holds the item can produce it, so nobody can list a public key they made up, or an item they do not hold. It names the lister inside `m`, so a proof cannot be lifted from one listing onto another account.

**What it does not prove.** It shows that the lister holds the item, not that the lister forged it. Every holder of an item can produce a valid proof for themselves (§6).

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

Vectors for a door, its room key and its room bag, and for a chest with a look, are not in `kinds-vectors.json` yet. They follow with the first implementation.

## 6. Security considerations

- **An item is knowledge.** Anyone who has read an item holds it forever, and can give it to anyone by copying the secret. There is no scarcity in this DECK and no revocation. Games that need either build it on the chain later.
- **A listing reveals an item's existence and public key.** It does not reveal where the item is hidden or let anyone open a chest sealed to it.
- **Listings by holders.** Because the proof shows holding rather than forging, any holder can publish a listing of an item under any name and picture, and the newest listing currently wins the feed. A client that wants the forger's word to stand needs a second proof binding the listing to the original item event's signer (§7).
- **Chest size.** A chest is one NIP-44 payload and so holds at most 65,535 bytes, much less than a bag. Large contents belong in a bag, a room (§3.7), or behind references once chests support them.
- **A door holds walkers by courtesy; the seal is the lock.** Holding walkers at a closed door (§3.6) is something a reader chooses to do. Another reader walks through, and finds nothing, because what the room holds is sealed with the room key.
- **A door secret is knowledge.** Whoever opened a door can give its secret to anyone, who can then open the room from anywhere they can compute the place's key. Rotation (§3.7.7) protects only what the room holds after it.
- **Two bags in time.** A room bag is unlinkable to its place by its content and tags, but a relay sees when it was published. One published moments after the bag that holds its door ties the two to one author and one moment. A writer that wants to hide even that may publish them apart.
- **The door secret is the only way to edit a room.** A door's secret is sealed to its lock and nowhere else, so only a device that sealed the door, or has opened it, can hide more in its room, rotate it, or find its room bag. An author who loses that device and holds no copy of the item that opens the door can still remove the door, but not edit its room or delete its room bag (§3.7.8). An author who wants to keep editing keeps a copy of each key item.
- **A look is the hider's object.** A look's live parts (§3.6) name public objects that their authors can replace or delete, so a door or chest can change its appearance after it was hidden. A look carries no secret: whoever can see the chest can read it.
- **A message in a chest proves its author only in place.** It is a rumor, so a finder who copies it out cannot publish it as a note its hider signed, and the hider's signed items carry `-`, so a relay that honours NIP-70 refuses a copy published by anyone but the hider; a relay that does not honour it still accepts one. Neither is deniability: whoever publishes the bag with its region key, together with what opens the chest, can show what the chest held, signed by its author.
- **A model is someone else's object.** An item's `model` names a public object that its author can replace at any time (§2.5), so what an item looks like can change after it was hidden, and an author who deletes the object leaves every item that wears it drawn without a model. A forger who wants the look fixed names an object they authored.
- **The `requires` label is the hider's text.** It is shown to readers who cannot open the chest and may say anything; it is data, never an instruction.

## 7. Open questions (non-normative)

1. **Holder versus forger.** Should a listing bind to the forger, for example with a proof over the original item event's id signed by the event's author, so that only the forger's listing is shown? Today ONOSENDAI offers listing only to the forger, but the protocol accepts any holder.
2. **`name` or `title` on a listing.** Items and chests moved to `title` on 2026-10-09, the tag other kinds use for a human name. The listing uses `name`. One of them should change before a third client ships.
3. **References in chests.** A chest's plaintext has the shape of a bag's, which allows references, but no reader follows them inside a chest. A room bag (§3.7.2) follows them as any bag does, so large contents can be locked behind a door today. A chest that must hold more than 65,535 bytes still needs a rule: references sealed with a key carried inside the chest, or a room bag of its own.
