# DECK-0007: Hidden audio

DECK: 0007
Title: Hidden audio
Status: Draft
Mandatory: no
Created: 2026-10-23
Last updated: 2026-10-23
Requires: `CYBERSPACE_V2.md` §2 (coordinates), §7.2 (region keys), §7.6 (the bag) and §7.7 (contents); DECK-0004 §3 (chests); NIP-01, NIP-70, NIP-94; Blossom BUD-01 and BUD-02

## Abstract

**Hidden audio** is a sound file hidden at a place. Its item is a NIP-94 file event, `kind 1063`, sealed in a bag or a chest like any other item. The file itself lives on a Blossom server, encrypted with a key that exists only inside the item, so the file is noise to everyone who has not reached the place, the server included. Whoever opens the bag can play the file and save it.

The item says how the sound is heard where it is hidden: whether it plays by itself, whether it loops or plays once, how far from its source it stays at full volume, and whether it is heard only in first person. A client that places it in space plays it at full volume inside a sphere about its source and fades it smoothly to silence at the walls of the region it is hidden in, so nothing is heard outside that region. A one-shot, a sound that does not loop, starts when the listener walks into its sphere.

The item is written as an unsigned **rumor** (`CYBERSPACE_V2.md` §7.6), the way a message is: a signed copy lifted out of the bag would be a valid file post by the hider, with the key that plays it and the coordinate it was hidden at (§3).

This DECK writes down the item format of ONOSENDAI's hidden audio, the first of its three steps, and the hearing rules its next two steps implement (arkinox's rulings of 2026-10-23).

## Terms

- **Source:** the point a hidden audio item is heard from, the centre of the gibson its `C` tag names (§4.1).
- **Region:** the aligned region of the bag that holds the item, at that bag's height (`CYBERSPACE_V2.md` §7.2). For an item inside a chest, the region of the bag that holds the chest.
- **Listener:** the point a client hears from (§4.3).
- **Sphere:** the sphere about the source inside which the sound is at full volume. Its radius is the item's `fade`, never past the region's nearest wall (§4.1).
- **One-shot:** an item without the `loop` tag. It plays once through each time it is started.
- **Trigger:** what starts a one-shot by itself: the listener entering the sphere (§5.2).

## 1. Overview (non-normative)

| What | Where it lives | Who can read it |
|---|---|---|
| the item, `kind 1063` | inside a bag (`kind 33330`) or a chest (`kind 3341`), as a rumor | whoever opens the bag, or the chest |
| the file, encrypted | on a Blossom server, by the hash of its ciphertext | anyone can fetch the bytes; only a holder of the item's key can decrypt them |

A hider picks a file, and their client encrypts it with a fresh AES-256-GCM key and nonce, uploads the ciphertext to a Blossom server, and seals an item naming the ciphertext's URL and hash, together with the key and the nonce, into the bag at the place. A finder opens the bag, fetches the ciphertext, checks it against the hash, decrypts it, and plays it where it stands, or saves it.

Everything in Cyberspace v2 is encrypted to a bag unless there is a reason otherwise. There is no unencrypted form of hidden audio: ambience that everyone in an area hears is a bag hidden at a low height where people go, since being there is what yields the key.

## 2. The item: `kind 1063` (normative)

### 2.1 Shape

The item is a NIP-94 file metadata event carried inline in a bag's list of entries (`CYBERSPACE_V2.md` §7.6) or a chest's (DECK-0004 §3). Its file tags are NIP-94's. Its encryption tags are the ones NIP-17 gives an encrypted file message (`kind 15`), so a client that knows either NIP reads most of it.

| Field | Value |
|---|---|
| `kind` | `1063` |
| `content` | the hider's caption, at most 280 characters, or empty |
| `["C", "<coord_hex>"]` | exactly one. The source's coordinate, under the rules of `CYBERSPACE_V2.md` §7.6. |
| `["title", "<name>"]` | the sound's name, at most 64 characters. SHOULD be present. |
| `["url", "<https URL>"]` | exactly one. Where the encrypted file is: a Blossom URL whose last path segment is the `x` hash, optionally followed by `.` and an extension (BUD-01). |
| `["m", "<MIME type>"]` | exactly one. The type of the file once decrypted. It MUST begin with `audio/`. |
| `["x", "<64 lowercase hex>"]` | exactly one. The SHA-256 of the bytes at `url`: the ciphertext, which is what Blossom names the blob by. |
| `["ox", "<64 lowercase hex>"]` | the SHA-256 of the decrypted file. SHOULD be present. |
| `["size", "<bytes>"]` | the length of the bytes at `url`, a decimal integer. SHOULD be present. |
| `["encryption-algorithm", "aes-gcm"]` | exactly one. |
| `["decryption-key", "<64 lowercase hex>"]` | exactly one. The 32-byte AES-256 key. |
| `["decryption-nonce", "<24 lowercase hex>"]` | exactly one. The 12-byte nonce. |
| `["autoplay"]` | OPTIONAL. The sound plays by itself where it is heard (§5). |
| `["loop"]` | OPTIONAL. The sound plays over and over. Without it the item is a one-shot. |
| `["retrigger", "once" \| "auto"]` | OPTIONAL, and only on a one-shot. `once`, the default, plays it the first time the listener enters its sphere; `auto` plays it every time (§5.2). |
| `["fade", "<gibsons>"]` | OPTIONAL. The sphere's radius in gibsons, a decimal integer (§4.1). |
| `["walk"]` | OPTIONAL. The sound is heard only in first person (§4.5). |
| `["-"]` | the NIP-70 protected marker. MUST be present (`CYBERSPACE_V2.md` §7.6, Protected items). |
| `["d", "<64 lowercase hex>"]` | present only on an item that has been moved: the event id of its first version (DECK-0006 §2.2). |

Decimal integers here follow `CYBERSPACE_V2.md` §10: no sign, no leading zeros. Hex is written in lowercase; a reader MAY accept uppercase. The flag tags carry no value; a reader looks only at the tag's name. Where the table says "exactly one" and an item carries more, a reader uses the first.

A writer writes `retrigger` only on a one-shot. A writer MAY leave out `fade`; the sphere's radius is then half the distance to the region's nearest wall (§4.1). The item MUST NOT be published on its own: its `decryption-key` tag is the file, and an item published to a relay is the file given to everyone who reads the relay.

### 2.2 The file

- The file MUST be encrypted before it is uploaded: AES-256-GCM, with a key of 32 bytes and a nonce of 12 bytes, both fresh and random for every file, a 16-byte tag, and no additional authenticated data.
- The bytes uploaded, and the bytes at `url`, are the ciphertext with the tag appended, exactly as WebCrypto's `encrypt` returns them. The nonce is not prefixed: it travels in `decryption-nonce`.
- The key and the nonce are written into the item and nowhere else. A writer MUST NOT upload the file unencrypted, and MUST NOT reuse a key or a nonce across files.
- A writer MUST NOT reuse a key, a nonce or a ciphertext across placements. The same sound placed twice is encrypted twice and uploaded twice, so no two placements share an `x`: a shared `x` would tell a finder of one place that another bag holds the same sound, and one leaked key would open both. (ONOSENDAI's PLACE AGAIN opens the first copy with its key and seals a fresh one.)
- A writer SHOULD upload the ciphertext with the type `application/octet-stream`, so that the server is not told it holds audio.
- The upload is an ordinary Blossom upload (BUD-02): a `kind 24242` authorization signed by the uploader, naming the ciphertext's hash. The hider chooses the server.
- The item's `url` MUST satisfy rule 2 of §2.3. A server may answer an upload with a URL that does not (an `http` address behind a proxy, a path of its own); the writer then writes the server's own address followed by `/` and the `x` hash, where BUD-01 serves the blob.

### 2.3 Reading the item

A reader MUST skip, as an item it cannot read (`CYBERSPACE_V2.md` §7.6), a `kind 1063` whose:

1. `m` does not begin with `audio/`, or is absent;
2. `url` is absent, is not an `https` URL, or has a last path segment other than the `x` hash, optionally followed by `.` and an extension of one to eight letters or digits. So a found item can only ever make a reader fetch a blob by its hash, never another endpoint on the server or on the reader's own network. A reader MAY accept `http` to its own machine while it is being developed, and MUST NOT otherwise;
3. `x` is not 64 hex characters;
4. `encryption-algorithm` is absent or is not `aes-gcm`;
5. `decryption-key` is not 64 hex characters, or `decryption-nonce` is not 24.

A `kind 1063` without the encryption tags is not hidden audio. This DECK defines no unencrypted form, and a reader that knows only this DECK skips one.

A reader reads a `fade` that is not a decimal integer as absent, a `retrigger` of any value but `auto` as `once`, and a `retrigger` on an item that loops as nothing. A missing `title` reads as "audio".

### 2.4 Fetching the file

1. Fetch the bytes at `url`. A reader MAY instead ask another Blossom server for the blob by its `x` hash (BUD-01 `GET /<sha256>`), since the next step checks the bytes whatever server sent them.
2. The SHA-256 of the bytes MUST equal `x`. Bytes that do not match are not the file, and a reader MUST NOT decrypt or play them.
3. Decrypt with the item's key and nonce. A failure of the GCM tag means the bytes are not this item's file; a reader MUST NOT play anything.
4. When the item carries `ox`, the SHA-256 of the decrypted file MUST equal it.

A reader SHOULD set a limit on how many bytes it takes from a server (ONOSENDAI takes at most 25 MiB and 16 bytes, the largest file it hides, sealed), and SHOULD refuse more than the item's `size` when it gives one, reading no further than that, so that a found item cannot make a reader download without end.

A reader MAY keep the decrypted file in memory while it is heard, and SHOULD fetch a file only once while it is kept. A file kept in memory belongs to its `x` together with its key and nonce: a second item that names the same `x` with another key opens only with its own.

A client that shows an item's raw event (ONOSENDAI's event data on the item's card) SHOULD hide `decryption-key` and `decryption-nonce`, since the key is the file and a picture of the card would hand it to anyone.

## 3. Written as a rumor (normative)

A writer MUST write hidden audio as a rumor (`CYBERSPACE_V2.md` §7.6, Rumors): its `pubkey` is the key that signs the bag, or the chest, that holds it, its `id` is its canonical id, and it carries no `sig`. A writer MUST NOT sign hidden audio it hides, in a bag or in a chest.

A reader accepts the rumor as `CYBERSPACE_V2.md` §7.6 says for a message: vouched for by the bag when its `pubkey` is the bag's and its `id` is canonical, and inside a chest vouched for by the chest under the rule of that section ("Inside an item") and DECK-0004 §3.4. A reader MUST still accept a signed `kind 1063` whose signature verifies, from a writer that signs one.

**Why a rumor (non-normative).** The question is what a finder can do with a copy. A finder holds every item of an opened bag as JSON, the audio item's key among them, and can always share the key, whatever the item's form: that is the price of being found. What the form decides is whether a copy carries the hider's name with it.

- `kind 1063` is a kind other clients show. Feed clients render file events as posts, with a player. A signed item lifted out of the bag is a valid file post by the hider. Published anywhere, it shows the hider's name beside a sound that plays for anyone (the key is in the event), with the exact coordinate of the hiding place in its `C` tag. The hider never posted it, and the place it marks is the secret the bag was guarding.
- NIP-70's `-` makes a relay that honours it refuse such a copy from anyone but the hider. A relay that does not honour it accepts the copy anyway.
- A rumor is not a valid event. No relay or client accepts a copy of it as the hider's post, while the bag, which the hider does sign, still tells everyone who reached the place who hid the sound.

That is the same reasoning that made messages rumors on 2026-10-20 (`CYBERSPACE_V2.md` §7.6, "Why messages are rumors and items are protected"), and it applies more strongly here, because the copy plays. A shard, a key item or a chest stays signed because its own signature is the only proof of who made it once it is taken elsewhere. Hidden audio needs no such proof: the file is the hider's to share, and a finder who wants to re-hide it seals a copy of their own. A side benefit: the hider's signer is asked once, for the bag, rather than once more for the item.

## 4. Hearing it in space (normative for a client that plays it in space)

### 4.1 The source, the region and the sphere

- The source is the centre of the gibson the item's `C` tag names: half a gibson past its coordinate on each axis.
- Distances in this section are in gibsons. A reader measures them in the region's own frame: the region's aligned base (`CYBERSPACE_V2.md` §7.2) is the origin, so every number is at most the region's side, `2^H` for a region of height `H`, however far out in cyberspace the region is.
- The sphere's radius `r` is the item's `fade`, but never more than the distance from the source to the region's nearest wall: `r = min(fade, w)`, where `w` is that distance. Without `fade`, `r = w / 2`: half the way to the nearest wall, so the sound still fades toward that wall as it does in every other direction (a sphere that reaches the wall would be full up to it, then silent).
- A writer SHOULD NOT write a `fade` larger than `w` for the place it hides the item. A reader clamps one that is.

### 4.2 Loudness

The loudness `g` at the listener, from 0 (silent) to 1 (as recorded), is:

1. `g = 0` when the listener is outside the region. Nothing is heard outside the region, at any distance.
2. `g = 1` when the listener's distance `d` from the source is at most `r`.
3. Otherwise let `e` be the distance from the source to the region's wall along the line from the source through the listener (the ray's exit from the region's cube). With `t = (d - r) / (e - r)`, clamped to `[0, 1]`, a reader SHOULD use `g = 1 - t² (3 - 2t)` (smoothstep). Any other curve a reader uses MUST be 1 at `d = r`, 0 at `d = e`, and never rise between.

So the sound is full inside the sphere, falls smoothly from the sphere to the wall, and reaches silence exactly at the edge of the region in every direction, whatever the region's shape as seen from the source.

### 4.3 The listener

The listener is the point a client hears from. It is the client's choice, and a client SHOULD say what it uses:

- ONOSENDAI hears from the camera: in first person (WALK mode) that is the avatar's eyes, and in an orbiting view it is the camera itself, so zooming out takes the ear away from what it hears.
- A client with no camera, such as an agent, hears from its avatar's coordinate.

A client that draws the world at a scale, such as one scene unit to `2^k` gibsons, converts its scene distances to gibsons, so that the sphere and the fade stay the same size in gibsons at every scale.

### 4.4 Direction

A client SHOULD place the sound by its direction from the listener (stereo panning or a 3D panner). It MUST NOT add a distance attenuation of its own on top of §4.2: the loudness of §4.2 is the only effect distance has.

### 4.5 First person only

An item with the `walk` tag is heard in space only while the client is in first person (ONOSENDAI's WALK mode). Outside first person its loudness is 0, and its trigger does not fire (§5.2). A client with no first-person mode never plays such an item in space. The `walk` tag says nothing about playing the file by hand (§5.4).

## 5. When it plays (normative for a client that plays it in space)

### 5.1 A loop

An item with `autoplay` and `loop` plays over and over while it is heard, at the loudness of §4.2.

### 5.2 A one-shot

An item with `autoplay` and without `loop` is a one-shot, and its sphere (§4.1) is its trigger zone. The listener is **in the zone** when it is inside the region, within distance `r` of the source, and, for an item with `walk`, in first person. The trigger fires on an **entry**: the first moment the listener is in the zone after a moment it was not. The first moment a client knows of the item counts as an entry when the listener is in the zone then, so finding the bag while standing in the sphere plays the sound.

- With `retrigger` `once`, or without `retrigger`, the trigger fires the first time only. Later entries do not fire it.
- With `retrigger` `auto`, the trigger fires on every entry: leaving the zone and entering it again plays the sound again.
- An entry while the sound is still playing does not start it over.
- Once started, the sound plays through to its end at the loudness of §4.2 as the listener moves, from the sphere to silence at the region's walls.
- Whether a `once` trigger has fired is the reader's own record, kept on the device and never published. A client SHOULD let its user reset it (ONOSENDAI: RESET TRIGGER on the item's card), so that the next entry plays the sound once more. A reset while the listener is in the zone waits for the listener to leave and enter again.

### 5.3 Without autoplay

An item without `autoplay` never plays by itself, loop or not, and has no trigger. It plays only by hand (§5.4).

### 5.4 By hand

A reader SHOULD offer to play the file and to save it, whatever the item's tags say. Playing by hand plays the file as it is, not placed in space. Saving saves the decrypted file, named by its `title` and the extension its `m` type has.

Note (non-normative): browsers hold sound back until the page has been touched. A client that would start a sound by itself before then can say so and start it on the first tap (ONOSENDAI shows a tap-to-hear chip).

## 6. Contents (normative)

A bag that publishes its contents (`CYBERSPACE_V2.md` §7.7) counts hidden audio under the kind `audio`: `["contents", "audio", "<count>"]`, one per hidden audio item in the bag's plaintext, written after the kinds §7.7 listed before it. A reader that does not know the kind ignores it, as §7.7 requires.

## 7. Privacy (non-normative)

- The Blossom server sees a blob of a given size, uploaded by a given key at a given time, and nothing else: not that it is audio (§2.2), not what it says, not where it is hidden.
- Many Blossom servers list the blobs a key has uploaded. A hider who does not want their uploads counted can upload from another key or use a server that does not list them; the item does not need the uploader to be the hider.
- A finder can share the key. Hiding a sound is giving it to whoever finds it. The rumor (§3) keeps a copy from carrying the hider's name; it does not keep the sound from spreading.
- Fetching the file tells its server that someone is opening it, from the reader's network address, at that moment. A reader that fetches only once the listener is inside the item's region (ONOSENDAI's third step) tells it no more than that someone reached the place.

## 8. Vectors

`kinds-vectors.json`, beside this DECK, holds under `audio` a generated test tone (a 40-sample sine, never a recording), the key and nonce it is sealed with, the ciphertext as it would sit on a server, and the item that names it, written as a rumor by the vectors' hider with `autoplay`, `retrigger` `once`, `fade` `6`, `walk` and `-`. Under `audio.gain` it gives the loudness of §4.2 at eight listeners about a source at `[10.5, 16.5, 16.5]` in a height-5 region (32 gibsons a side), whose sphere is clamped to radius 6. `kinds-vectors.mjs` produces both.

## 9. Implementations (non-normative)

- ONOSENDAI, step 1 (2026-10-23): the item, PLACE AUDIO (the file encrypted and uploaded through the Blossom server picker the profile uses), audio inside chests, the world mark (a music note in the note's blue box) with a legend entry, and the item's card with PLAY, DOWNLOAD and RESET TRIGGER. Step 2 plays sources in space (§4, §5); step 3 adds the fade sphere on the placement ghost and a limit on how many sources sound at once.
- cyberspace-mcp drops a `kind 1063` rumor today, as `CYBERSPACE_V2.md` §7.6 allowed before this DECK. A reader that only lists what a bag holds needs §2.3 and §3.
