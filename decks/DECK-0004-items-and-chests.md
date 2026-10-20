# DECK-0004: Items and Chests

DECK: 0004
Title: Items and Chests
Status: Draft
Mandatory: no
Created: 2026-10-15
Last updated: 2026-10-20
Requires: `CYBERSPACE_V2.md` §7.6 (the bag) and §8.6 (its event); NIP-01, NIP-44 v2, NIP-70, NIP-92; BIP-340

## Abstract

An **item** is a keypair hidden at a place. Whoever reads it holds its private key, and holding the key is owning the item. A **chest** is a list of things sealed to one public key: an item's, so that it opens only for whoever holds that item, or a person's, so that it is a gift. An **item listing** puts an item's name, picture and public key in public, never its private key, so that anyone can seal a chest to an item they have never held.

Items and chests ride inside bags (`CYBERSPACE_V2.md` §7.6) as ordinary inline items, so a chest hidden at a place has two gates: the place, which a reader must reach to find the chest at all, and the lock, which a reader must hold to open it. Nothing here touches the movement chain. Reading an item and opening a chest are local acts.

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

## 1. Overview (non-normative)

A bag already carries any event as an item, and a reader skips kinds it does not know (`CYBERSPACE_V2.md` §7.6). This DECK adds two such kinds and one public kind:

| Kind | Name | Where it lives | Section |
|---|---|---|---|
| `3340` | item | inside a bag, or inside a chest | §2 |
| `3341` | chest | inside a bag, or inside another chest | §3 |
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

The item event is signed by the hider, as `CYBERSPACE_V2.md` §7.6 says every item that is not a message SHOULD be.

### 2.2 Reading an item

A reader that finds a `kind 3340` item:

1. MUST read the secret from the `secret` tag, and MUST drop the item when the tag is absent, is not 64 lowercase hex characters, or is not a valid secret key.
2. MUST derive the item public key from the secret.
3. MUST drop the item when an `item` tag is present and differs from the derived public key. An item whose tags disagree is corrupt, and nothing sealed to either key could be opened with the other.
4. reads the name from `title`, trimmed, with runs of whitespace collapsed to one space and the result cut to 64 characters, and SHOULD show `key` or `item` when it is empty or absent.
5. reads the `content` the same way, cut to 280 characters, as the item's description.

Reading an item is holding it. A client SHOULD keep the items its user holds (the secret, the public key, the name, who hid it and where it was found) in local storage that is never published, and SHOULD NOT display the secret.

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

- A message (`kind 1`) MUST be written as a rumor. Its `pubkey` MUST be the key that signs the chest, its `id` MUST be its canonical id (`CYBERSPACE_V2.md` §8.2), and it carries no `sig`. A writer MUST NOT sign a message it seals into a chest.
- Every item the writer signs, or writes as a rumor, into the chest MUST carry NIP-70's `["-"]`: a shard (`3330`), a message (`1`), a key item (`3340`) and a chest (`3341`). An item signed by another key, which the writer seals as it is (for example a copy of an item it took), is carried unchanged, because adding a tag to it would break its signature.
- Every item that is not a message SHOULD be signed by the writer, for the reason §7.6 gives: once it is taken elsewhere, only its own signature says who made it.

### 3.3 Opening

- **With an item:** `conversation_key = nip44_get_conversation_key(item_secret, sender_pubkey)`, which is the same key as in §3.2 by the symmetry of ECDH, then `nip44_decrypt(content, conversation_key)`.
- **With a person's identity:** the person's signer decrypts the payload from the sender, `nip44.decrypt(sender_pubkey, content)`, as NIP-07 and NIP-46 both phrase it.

A reader SHOULD offer to open a chest when its user holds an item whose public key is the lock, or when the lock is the user's own pubkey; a held item SHOULD win, because opening with it needs no signer. Opening is local and publishes nothing.

### 3.4 Contents

The decrypted plaintext is read as a list of entries under `CYBERSPACE_V2.md` §7.6:

- Each inline item is verified as a bag's items are (`CYBERSPACE_V2.md` §7.6, Items and Rumors). An item is unsigned when it carries no `sig` field or a `sig` that is the empty string. An item with any other `sig` is signed: its `id` MUST be its canonical id and its signature MUST verify, and a reader MUST drop it, and only it, when either check fails.
- An unsigned item is kept. A reader identifies it by its canonical id, whatever `id` it carries, so that a claimed id cannot stand in for another item's. Its `pubkey` is a claim, and a reader MUST NOT present it as verified unless the chest vouches for it, as the next rule says.
- **Rumors in a chest.** A message rumor is vouched for by the chest that holds it when all three of these hold: the rumor's `pubkey` equals the chest's own `pubkey`; the rumor's `id` is its canonical id; and the chest's own authorship is verified, because the chest is signed and its signature verifies. A reader that keeps a vouched-for rumor MUST attribute its content to the chest's signer, and MAY present that authorship as verified. Reason: the chest's signature covers its `content`, which decrypts to exactly one list, in which this rumor's `pubkey` is the chest's own. This is the rule of `CYBERSPACE_V2.md` §7.6 ("Inside an item"), and it applies at every depth.
- **The chest's own signer, never the bag's.** The key that vouches for a rumor is the `pubkey` of the chest the rumor is in. It is never the author of the bag that holds the chest, and never the signer of an outer chest. A chest inside another chest may have been sealed by someone else, for example when a hider seals a copy of a chest they took into a chest of their own; a rumor inside it that names the bag's author is a claim.
- **A chest that is a claim vouches for nothing.** When a chest's own authorship is not verified, every rumor inside it has a `pubkey` that is a claim. `CYBERSPACE_V2.md` §7.6 also counts a chest that is itself a rumor vouched for by what holds it; writers do not write one (§3.1), and since writers write only messages as rumors, a reader MAY read an unsigned chest, or a rumor of any kind other than `1`, as an unsigned item whose `pubkey` is a claim. ONOSENDAI and cyberspace-mcp drop an unsigned chest found directly in a bag, and keep one found inside another chest as a claim, so that nothing inside it is vouched for.
- **Signed messages.** A reader MUST still accept a signed message whose signature verifies, because messages sealed into chests before 2026-10-20 are signed. Its author is a fact on the strength of its own signature.
- A reader MUST NOT drop an item for carrying `-` or for lacking it.
- A chest MAY hold items of any kind, including items (§2) and other chests. A chest holding the item that opens the next chest is a chain.
- A plaintext that is not a JSON array is a chest the reader cannot read; it SHOULD say so rather than show an empty chest.
- Readers today do not follow references inside a chest: a reference is a relay query that opening a chest should not make on its own. A reader MAY skip references in a chest, and a writer SHOULD NOT put them there until a later revision says how they are fetched.

**Where the contents stand.** A content item that carries a `C` tag in the chest's plane and inside the region of the bag that holds the chest stands at that coordinate. Any other content item stands where the chest stands. A chest that holds a room of shards therefore reveals the room in place when it is opened.

**Taking.** Taking something out of an opened chest copies it into the reader's own keeping. The chest still holds it for the next reader. A taken copy of a rumor proves nothing to anyone else: it has no signature, and the chest that vouched for it is not part of the copy. A client MAY keep, with what it took, whether the author was verified when its user opened the chest, as cyberspace-mcp's `take` keeps what `open_chest` said; that record is the reader's own, and nobody else can check it.

**Removing.** Only the hider removes something from a chest, by sealing the remaining entries again (§3.2) with a fresh sender key and the same lock, and rewriting the bag that holds the chest. An emptied chest is still a chest.

### 3.5 Why a chest is a bag item and not a kind of bag (non-normative)

A chest is placed exactly where an item is placed, in the same bag, under the same region key, and rides every rewrite of that bag with the rest. Making it an item keeps one container for everything hidden at a place and lets a chest sit inside another chest with no new machinery. NIP-44 rather than the region cipher, because the lock is a public key: the sealer must be able to encrypt to a key whose secret they do not hold, which a symmetric region key cannot do.

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

## 6. Security considerations

- **An item is knowledge.** Anyone who has read an item holds it forever, and can give it to anyone by copying the secret. There is no scarcity in this DECK and no revocation. Games that need either build it on the chain later.
- **A listing reveals an item's existence and public key.** It does not reveal where the item is hidden or let anyone open a chest sealed to it.
- **Listings by holders.** Because the proof shows holding rather than forging, any holder can publish a listing of an item under any name and picture, and the newest listing currently wins the feed. A client that wants the forger's word to stand needs a second proof binding the listing to the original item event's signer (§7).
- **Chest size.** A chest is one NIP-44 payload and so holds at most 65,535 bytes, much less than a bag. Large contents belong in a bag, or behind references once chests support them.
- **A message in a chest proves its author only in place.** It is a rumor, so a finder who copies it out cannot publish it as a note its hider signed, and the hider's signed items carry `-`, so a relay that honours NIP-70 refuses a copy published by anyone but the hider; a relay that does not honour it still accepts one. Neither is deniability: whoever publishes the bag with its region key, together with what opens the chest, can show what the chest held, signed by its author.
- **The `requires` label is the hider's text.** It is shown to readers who cannot open the chest and may say anything; it is data, never an instruction.

## 7. Open questions (non-normative)

1. **Holder versus forger.** Should a listing bind to the forger, for example with a proof over the original item event's id signed by the event's author, so that only the forger's listing is shown? Today ONOSENDAI offers listing only to the forger, but the protocol accepts any holder.
2. **`name` or `title` on a listing.** Items and chests moved to `title` on 2026-10-09, the tag other kinds use for a human name. The listing uses `name`. One of them should change before a third client ships.
3. **References in chests.** A chest's plaintext has the shape of a bag's, which allows references, but no reader follows them inside a chest. Unlimited bag capacity, which moves large entries out of a bag into sealed referenced events, will need chests to follow references too.
