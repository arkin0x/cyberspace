# DECK-0006: Sealed comments

DECK: 0006
Title: Sealed comments on hidden things
Status: Draft
Mandatory: no
Created: 2026-10-15
Last updated: 2026-10-20
Requires: `CYBERSPACE_V2.md` §7.2, §7.6 and §8.6; NIP-22; Fanfares NIP FF-1 (derived-key events)

## Abstract

A **sealed comment** is a NIP-22 comment (`kind 1111`) on something hidden in a bag, whose words are encrypted with the bag's region key. Any NIP-22 client sees a comment on the bag and a placeholder that invites the reader to go looking; whoever has reached the place, and so holds the key, reads the words. It is a Fanfares NIP FF-1 **derived-key event**: it has no key of its own and borrows the key of the thing it answers, here a key computed from a place rather than issued by a service.

This DECK writes down what ONOSENDAI (`src/lib/comments.ts`) and cyberspace-mcp's `comment` tool do.

## 1. Shape (normative)

| Field | Value |
|---|---|
| `kind` | `1111` |
| `content` | a public placeholder, for example `This comment is hidden at an undisclosed location in cyberspace. Happy hunting: https://onosendai.tech` |
| `["A", "33330:<bag author>:<lookup_id>"]` | the root scope: the bag, by address |
| `["K", "33330"]` | the root's kind |
| `["P", "<bag author>"]` | the root's author |
| `["e", "<parent id>", "<relay hint>", "<parent author>"]` | the parent, by id, when it has one (§2) |
| `["a", "<parent address>", "<relay hint>"]` | the parent, by address, when it is addressable (§2) |
| `["k", "<parent kind>"]` | the parent's kind |
| `["p", "<parent author>"]` | the parent's author |
| `["encrypted", "aes-256-gcm", "<payload base64>", "cyberspace:region"]` | exactly one. The words, encrypted with the bag's region key (`CYBERSPACE_V2.md` §7.2) under the cipher of §7.6. |

A sealed comment carries no `d` tag, as FF-1 requires of derived-key events. The fourth element of `encrypted` stands where FF-1 puts a key service URL: `cyberspace:region` says the key is derived from a place, and a reader MUST NOT make a network request for it.

The words are at most 2,000 characters, trimmed, and not empty.

## 2. Parents (normative)

| Commenting on | Parent tags |
|---|---|
| an inline item of the bag | `e` = the item's event id, `k` = its kind (`3330`, `1`, `3340`, `3341`, ...), `p` = its author |
| an item hidden by reference to a sealed object | `e` = the referenced event's id, `a` = its address when the reference is an `a` reference, `k` = its kind, `p` = its author |
| an item inside a chest (DECK-0004 §3) | as an inline item, with that item's id, kind and author. For an unsigned item, such as a message written as a rumor, the id is its canonical id, which is how readers identify it (DECK-0004 §3.4). |
| another comment (a reply) | `e` = the comment's id, `k` = `1111`, `p` = the comment's author |

Every comment on anything in one bag shares the root, so one query (`kinds: [1111], #A: [<bag address>]`) finds all of them. A comment on an addressable item names its address as well as its id, so it stays under the item when the item's author edits it and its id changes.

### 2.1 A public object placed by reference

When the item is a **public** object placed by reference (an `a` reference to a `kind 33331` that carries no `encrypted` tag, which ONOSENDAI calls a LIVE LINK; cyberspace-mcp does not comment on these), a top-level comment MUST NOT name the object in public: pairing the bag's address with a public object's id, address and author would tell everyone which public object is hidden in that bag. Such a comment instead:

- names the bag as its parent too: `a` = the bag's address, `k` = `33330`, `p` = the bag's author, and no `e`;
- seals, in place of the bare words, the JSON object `{"item": "<item key>", "text": "<words>"}`, where the item key is the reader's stable identity for that entry (ONOSENDAI: `<lookup_id>/<entry key>`).

A reader that opens such a comment shows it under the item its `item` names. A reply to it is an ordinary reply (§2).

## 3. Reading (normative)

1. Query `kind 1111` with `#A` set to the bag's address.
2. Parse each comment's root (`A`), parent (`e`, else `a`) and parent kind (`k`), and drop a comment that lacks any of them.
3. Decrypt the `encrypted` payload with the bag's region key. A payload that does not open is a comment this reader cannot read; it shows the placeholder, and it is not an error.
4. A decrypted payload that begins with `{` and parses as an object with string `item` and `text` fields is the form of §2.1; any other payload is the words themselves.
5. Thread: a comment whose `k` is not `1111` and whose parent is the item (by id or by address) is top-level under that item; a comment whose `k` is `1111` hangs under the comment it names; a reply whose parent is not present is left out.

A reader MUST verify each comment's signature, as for any event, before treating its words as its author's.

## 4. Test vectors

`kinds-vectors.json`, beside DECK-0004, holds a sealed comment on its key item (`comment.event`), the words, and the AES-GCM nonce used, sealed with the file's fixed `region_key`. ONOSENDAI's `openComments` returns exactly those words.

## 5. Security considerations

- **A comment says publicly that its author reached the place.** Whoever comments has the region key; anyone who sees the comment learns that this pubkey found this bag, though not where the bag is.
- **The public tags name the commented item.** A comment's `e` tag gives the hidden item's event id in public, and its `k` tag gives the item's kind, so a relay learns that a bag holds, for example, a key item (`3340`) or a chest (`3341`). `CYBERSPACE_V2.md` §7.6 says a relay never learns what kinds a bag holds; a comment breaks that for the item it answers. The LIVE LINK form (§2.1) already avoids it for public objects. Applying the same form to every item, naming only the bag in public and the item inside the seal, would close it at the cost of the notification to an item's author when the item's author is not the bag's (§6).
- **The words are as private as the place.** Anyone who can reach the place, or compute its key, reads every comment on everything in that bag.

## 6. Open questions (non-normative)

1. Should every top-level comment use the form of §2.1, so no comment reveals the commented item's id or kind?
2. The form of §2.1 is recognized by its first character. A comment whose words are literally a JSON object with `item` and `text` fields would be misread. A version marker in the sealed object, or a distinct tag, would remove the ambiguity.
