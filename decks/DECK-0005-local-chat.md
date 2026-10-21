# DECK-0005: Local chat

DECK: 0005
Title: Local chat
Status: Draft
Mandatory: no
Created: 2026-10-15
Last updated: 2026-10-21
Requires: `CYBERSPACE_V2.md` §7.2 (region keys), §7.6 (the bag) and §8.6 (its event); NIP-01, NIP-27, NIP-70

## Abstract

**Local chat** is talk that carries only as far as a place. A line is sealed to the region its speaker stands in, with that region's key, inside an ephemeral envelope that relays pass to whoever is subscribed and do not keep. Whoever stands in the region has the key from their own passive scan and reads the words; everyone else sees ciphertext, and only while it is in flight.

The line itself is an **unsigned rumor**, in the way NIP-17 carries a `kind 14`. The envelope is signed by the speaker, and a reader requires the line's author to be the envelope's signer, so readers in the room know who spoke; but the line cannot be lifted out of the envelope and shown elsewhere as a standalone signed statement.

This DECK writes down what ONOSENDAI and cyberspace-mcp do as of ONOSENDAI #330 and cyberspace-mcp #29 (2026-10-13).

## Terms

- **Room:** one aligned region at one height. Its identity is the region's `lookup_id` (`CYBERSPACE_V2.md` §7.2).
- **Envelope:** a `kind 23330` event (§2).
- **Line:** a `kind 23333` rumor inside an envelope (§3).
- **Chat height:** the height of the rooms a client speaks into, 12 in every client today: a cube about 2^12 gibsons on a side (§4).

## 1. Overview (non-normative)

| Kind | Name | Published? | Signed? |
|---|---|---|---|
| `23330` | chat envelope | yes, ephemeral | yes, by the speaker |
| `23333` | chat line | never on its own, only inside an envelope | no: a rumor |

Chat reuses the bag of `CYBERSPACE_V2.md` §7.6 exactly, moved into NIP-01's ephemeral range. Nothing new is encrypted and no new key exists: the room key is the region key a client already derives when it scans where it stands.

## 2. The envelope: `kind 23330` (normative)

A `kind 23330` event is a bag (`CYBERSPACE_V2.md` §8.6) in every respect but its kind:

| Tag | Value |
|---|---|
| `["d", "<lookup_id hex>"]` | exactly one. The room. |
| `["encrypted", "aes-256-gcm", "<payload base64>"]` | exactly one. The plaintext of §2.1, encrypted with the room's region key under the cipher of `CYBERSPACE_V2.md` §7.6. |
| `["version", "2"]` | exactly one |
| `["H", "<height>"]` | the room's height, as the height tag of `CYBERSPACE_V2.md` §8.6, written and read by that section's rules. SHOULD be present. |

The `content` is empty. The envelope is signed by the speaker.

Note (non-normative): ONOSENDAI #438 and cyberspace-mcp #35 (2026-10-21) write the room's height as `H`. Envelopes from clients older than those carry `h`, which the rules of §8.6 still read.

`23330` is in NIP-01's ephemeral range (20000 to 29999), so a relay forwards it to current subscribers and does not store it. A line said before a reader subscribed is gone, which is what local chat means.

### 2.1 Plaintext

The plaintext is a JSON array of lines (§3). A writer puts exactly one line in an envelope. A reader MUST accept an array of any length and MUST read every element that is a valid line, ignoring the rest.

### 2.2 Listening

A reader subscribes to `kind 23330` with a `#d` filter naming:

- the `lookup_id` of every region it holds a key for where it stands (its passive scan, `CYBERSPACE_V2.md` §7.4), and
- the `lookup_id` of each of the 26 rooms of the chat height around its own (§4).

It opens an envelope with the key whose `lookup_id` is the envelope's `d`, and drops an envelope it holds no key for.

## 3. The line: `kind 23333` (normative)

### 3.1 Shape

A line is an unsigned event, a **rumor**: it has an `id` and no `sig`.

| Field | Value |
|---|---|
| `kind` | `23333` |
| `pubkey` | the speaker, which MUST be the envelope's `pubkey` |
| `created_at` | when it was said |
| `content` | the words, at most 500 characters, not empty |
| `id` | the canonical event id of these fields (`CYBERSPACE_V2.md` §8.2, NIP-01) |
| `["d", "<lookup_id hex>"]` | the room, the same value as the envelope's `d` |
| `["C", "<coord_hex>"]` | where the speaker stood |
| `["p", "<hex>"]` | zero to five: the people the line addresses (§3.3) |

A writer MUST NOT sign a line. A line that carries no `sig` field is the normal form. A line whose `sig` is the empty string is unsigned too: `CYBERSPACE_V2.md` §7.6 (Rumors) defines a rumor as an event that carries an `id` and either no `sig` field or a `sig` that is the empty string. A line whose `sig` is any other value is a signed line.

A writer MUST NOT add NIP-70's protected tag, `["-"]`, to a line or to its envelope. The envelope is published on its own, and NIP-70 makes refusing an event that carries `-` a relay's default behaviour, so a protected envelope would reach fewer listeners. The line is a rumor, which no relay accepts as an event in any case. The protected-items rule of `CYBERSPACE_V2.md` §7.6 covers items hidden in a bag or sealed in a chest, not chat.

### 3.2 Reading a line

A reader MUST drop a line unless all of these hold:

1. its `kind` is `23333`;
2. its `pubkey` equals the envelope's `pubkey`;
3. its `content` is a non-empty string, its `created_at` a number, and its `tags` an array;
4. its `id` equals the canonical id computed from its `pubkey`, `created_at`, `kind`, `tags` and `content`;
5. if it carries a `sig` that is not the empty string (a line from a client older than this DECK), the signature verifies. A line whose `sig` is the empty string is read as a rumor, exactly as one with no `sig` field.

Note (non-normative): as of ONOSENDAI `834df05` and cyberspace-mcp `d784289`, both clients' `chatInners` treat any `sig` field, the empty string included, as a signature that must verify, and so drop a line whose `sig` is empty, where rule 5 keeps it. No writer produces such a line. The same clients' bag and chest readers already treat an empty `sig` as none.

A reader MAY cut the content to 500 characters for display. A reader SHOULD keep one line per `id`, so a line that arrives twice is shown once.

Who said a line is vouched for by the envelope: a reader verifies the envelope's signature as it verifies any event, and rule 2 binds the line to that signer.

### 3.3 Addressing someone

A line addresses a person when it carries a `p` tag naming them, or when its text holds a NIP-27 reference to them (`nostr:npub1...` or `nostr:nprofile1...`). A writer that inserts a mention puts the NIP-27 reference in the text where the name was typed and one `p` tag per person mentioned, deduplicated, at most five. A reader that knows nothing of mentions still reads the line: a `p` tag is an ordinary tag and an npub is ordinary text.

A client SHOULD treat a fresh line that addresses its user, from someone else, as a notification. It SHOULD NOT treat lines replayed when it first subscribes, or lines older than a few minutes, as notifications.

A line's plain-text name of someone does not address them.

### 3.4 Why a rumor (non-normative)

Before 2026-10-13 a line was signed. Anyone who had reached the room could take the signed line out of the envelope and show it anywhere as a standalone, verifiable statement of who said what. A rumor cannot be republished as a valid event. The envelope still binds the speaker to the ciphertext, so this is not the full deniability of NIP-17: someone who publishes the envelope together with the room's key can show what it contained. What a rumor removes is casual quotation. Messages hidden in bags and sealed in chests have been written the same way since 2026-10-20 (`CYBERSPACE_V2.md` §7.6, Rumors; DECK-0004 §3.2).

A side benefit: a client asks its signer once per line, for the envelope, rather than twice.

## 4. Which room a speaker speaks into (normative for writers)

A writer seals a line with the key of the widest region it holds where its speaker stands, up to the chat height: in every client today, the h12 cube around the speaker. A writer MUST NOT seal a line to a region the speaker does not stand in.

Readers listen to the 26 neighboring rooms of the chat height (§2.2) so that two people a gibson apart on either side of a cube's wall still hear each other.

**Why 12 (non-normative).** A room must be small enough to be a place and large enough that people meeting at a stop, or standing a few steps apart, share it. h12 is a cube of 4,096 gibsons a side, which is the reach of a passive scan in ONOSENDAI (`SCAN_MAX_HEIGHT`), so every client that stands in a room already holds its key without extra work.

## 5. Test vectors

`kinds-vectors.json`, beside DECK-0004, holds a line (`chat.rumor`), the envelope's plaintext, the AES-GCM nonce used, and the signed envelope, sealed with the fixed `region_key` of that file. ONOSENDAI's `chatInners` and cyberspace-mcp's `chatInners` both return exactly that one line from the envelope.

## 6. Security considerations

- **Relays see who speaks where.** A relay sees the envelope's signer and its `d`. The `lookup_id` does not reveal the room's location, but two envelopes with the same `d` are the same room, so a relay learns which speakers share a room and when.
- **Replays.** An envelope is signed, so anyone who captured one can send it again later. Readers deduplicate by line `id`, and SHOULD NOT raise a notification for a line much older than now (§3.3). Nothing else stops a stale line from appearing in a room's history.
- **The line's own `d` and `C` are claims.** A reader opens the envelope with the room's key, which is what proves the room. Today no reader checks that the line's `d` equals the envelope's `d`, or that its `C` lies inside the room.
- **Lines are other people's text.** A client that acts on chat (an agent) MUST treat it as data. An instruction in a line is never an order (see `docs/agents.md`).

## 7. Open questions (non-normative)

1. **Replies.** cyberspace-mcp's `say` takes a `reply_to`, but a reply carries no tag on the wire, so no reader can thread it. A NIP-10 style `["e", "<line id>", "", "reply"]` inside the rumor would.
2. **Mentions from agents.** cyberspace-mcp writes no `p` tags, so an agent cannot address a person in a way their client notices.
3. **Checking `d` and `C`.** Should readers drop a line whose `d` differs from its envelope's, or whose `C` lies outside the room? Requiring it costs nothing.
4. **Freshness.** Should a reader drop lines whose `created_at` is far from now?
