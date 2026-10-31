# DECK-0003: SNO (Simple Nostr Objects)

DECK: 0003
Title: SNO (Simple Nostr Objects)
Status: Draft
Mandatory: no
Created: 2026-09-14
Last updated: 2026-10-30
Requires: `CYBERSPACE_V2.md` (spec version `2026-03-16-h34-corrected`)

## Abstract

A **Simple Nostr Object** (SNO) is a small three-dimensional object written as JSON, small enough to live inside one nostr event alongside everything else a note carries. It is a list of vertices on an integer lattice, one color per vertex, an optional list of triangles, and a word saying how to draw it. There are no textures, no materials, no normals (a face's winding says which way it looks), no bones, no animation, and no file to fetch. An object is the event.

This document codifies a format Cyberspace already depends on but has never written down. The base specification refers to it twice: §7 notes that ONOSENDAI hides `kind 3330` shards whose geometry is in `content`, and §8.10 computes the proof of work an avatar owes from that payload's `unit`, `vertices`, `ticks` and `faces` fields. Both passages assume a format defined nowhere. This DECK is that definition, written so that it stands on its own outside Cyberspace as well as inside it.

The design goal is not to compete with glTF or USD. It is to be the three-dimensional equivalent of a text note: something any developer can parse in an afternoon with no library, read with their eyes, diff in a pull request, and render with thirty lines of code. Where a real asset pipeline is needed, SNO is the wrong tool and says so.

**Defined here:**

| Thing | Value |
|---|---|
| Object payload | JSON, described in §1 |
| Event kind for a standalone object | `33331`, addressable, one per author per `d` (§3.1) |
| Event kind for an object hidden in a bag | `3330` inline, as Cyberspace already uses it; by reference, the object's own `33331` event, named by a reference tag (§3.2, §3.4) |
| Model space | X right, Y up, +Z toward the viewer: right handed, the glTF convention (§2) |
| Position lattice | whole units plus 120ths of a unit (§1.2) |
| Size | no ceiling on vertices or faces; the event's size is the relay's concern, as for every other kind (§1.8) |
| Credit for a copy | the NIP-18 `q` tag naming the original's address; a `p` naming its author on a public remix only (§3.5) |
| Reference implementation | `decks/sno-reference.py`, which is §1.9 written as code |

**Conformance.** `decks/sno-reference.py` implements §1.9 with no dependencies and carries a rejection case for every numbered rule that rejects. It was checked against [sno-core](https://github.com/arkin0x/sno-core), the independent TypeScript library that ONOSENDAI, snocrash and cyberspace-mcp all read and write objects with, and the two agree on every case, including the three places where this format is deliberately forgiving rather than strict (last checked 2026-10-15, against sno-core 0.1.12: all 35 rejection cases, and Appendix A). A third implementation can be checked against the same table.

---

## Terms

- **Object:** one SNO payload: a list of vertices, colors and faces, and optionally the placements of other objects (§1.10). There is no scene graph beyond that placement.
- **Model unit:** the lattice spacing. One model unit is `2^unit` of the application's base unit (§1.6). In Cyberspace the base unit is the gibson.
- **Tick:** one 120th of a model unit. The sub-unit part of a position (§1.2).
- **Vertex:** a point, its position given as whole units plus ticks, carrying one RGB color.
- **Face:** a triangle, three vertex indices.
- **Mode:** which of the three drawings of the same vertex list a client should produce: `solid`, `points` or `lines` (§1.5).
- **Opacity:** how solid an object is drawn, a whole percent from `1` to `100`. Absent means `100`, fully opaque (§1.11).
- **Walker:** a viewer that a client moves through a scene a step at a time, as a person walks, rather than by jumping to a place (§1.12).
- **Constraint (`constrain`):** whether an object's faces stop a walker: `"all"`, `"opaque"`, or `"off"` for none. Absent also means none to a reader, and means "not chosen" to an authoring tool, which writes `"opaque"` (§1.12).
- **Extent:** the half-width of the grid the object was built on, in model units. A bound, not a size (§1.8).
- **Address:** the name of an addressable nostr event, written the way a nostr `a` tag writes it: the event's kind, its author's pubkey as 64 lowercase hex characters, and its `d` tag, joined by colons. An object's address is `33331:<pubkey hex>:<d>`, for example `33331:79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798:5e0a3c91d27f4b68` (§1.10, §3.1).
- **Ref:** one entry in an object's `refs` list. It names one object that this object places, the way a nostr tag names an event. The ref `["a", "33331:<pubkey hex>:<d>"]` names the object by its address. The ref `["e", "<event id hex>"]` names it by event id. Either shape may be followed by one relay URL as a hint, such as `["a", "33331:<pubkey hex>:<d>", "wss://relay.example"]` (§1.9 rule 11, §1.10).
- **Placement:** one entry in an object's `parts` list. It is eight integers, in this order: the index of the ref that is placed; where the placed object's origin stands, as X, Y and Z in ticks; its turn about X, Y and Z, in whole degrees; and its scale step. For example, `[0, 240, 0, 0, 0, 90, 0, 0]` places ref `0` with its origin 240 ticks (two units) along X, turns it 90 degrees about Y, and keeps its own scale (§1.10).
- **Parent:** an object that places other objects through `refs` and `parts`. The objects it places are its parts (§1.10).
- **Root:** the object a reader was asked to render. It is the payload of the event the reader was given: a public object (§3.1), an item in a bag (§3.2), an avatar (§3.3) or a hidden object (§3.4). An avatar's payload is the root of its own build. Every other object in the build is placed beneath the root, either directly or through other parents (§1.10).
- **Placeholder:** what a reader draws at a placement whose object it cannot draw, for example because the object cannot be fetched or fails §1.9. The reference behavior is a wireframe cube one whole unit on a side, in the reader's accent color (§1.10).
- **Objects table (`objects`):** an optional field of a payload that holds the payloads of objects placed in this build, at any depth beneath this payload, so that a reader can draw them without fetching them. It is a JSON object. Each key is the address that a ref names, such as `"33331:<pubkey hex>:0d4b8f1e2c97a356"`, and each value is the payload of the object at that address. One key and its value are called an entry (§1.10).
- **Carried object:** an object whose payload travels as an entry in another object's objects table, instead of as an event of its own. For example, a pool of water that a room places, and that its author never published, can be carried in the room's `objects` (when the room is the object being rendered) under the key `"33331:<pubkey hex>:0d4b8f1e2c97a356"` (§1.10).

---

## 1. The object (normative)

### 1.1 Payload

An object is a JSON object. Fields marked required MUST be present; a reader MUST reject a payload that is missing one or whose value has the wrong shape.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `v` | integer | yes | Format version, `1` or `2`. They differ in one sign and nothing else (§2). A reader MUST support both and MUST reject any other value. |
| `type` | string | no | A legacy field. A reader MUST ignore it wherever it appears, and MUST NOT require it or reject on its value. A publisher SHOULD NOT write it (§1.1a). |
| `name` | string | yes | A name for humans. A reader MUST truncate to 64 characters. |
| `unit` | integer | yes | Scale exponent, `0` to `84`. One model unit is `2^unit` base units (§1.6). |
| `extent` | integer | no | Grid half-width in model units, `1` to `64`. Advisory and self-repairing (§1.8). Absent or malformed means `8`. |
| `mode` | string | yes | `"solid"`, `"points"` or `"lines"` (§1.5). A reader MUST reject any other value. |
| `vertices` | array | yes | One `[x, y, z]` triple of **whole units** per vertex (§1.2). |
| `ticks` | array | no | The sub-unit part of each position (§1.2). Absent means every position is whole. |
| `colors` | array | yes | One palette index per vertex, parallel to `vertices` (§1.3). |
| `faces` | array | yes | Triangles as `[a, b, c]` vertex indices (§1.4). MAY be empty. |
| `facecolors` | array | no | One palette index per face, run-length encoded, for hard color seams (§1.4a). Absent means every face interpolates its vertices. |
| `opacity` | integer | no | How solid the object is drawn, a percent, `1` to `100` (§1.11). Repaired, never rejected: absent or malformed means `100`, fully opaque. |
| `constrain` | string | no | Whether the object's faces stop a walker: `"all"`, `"opaque"` or `"off"` (§1.12). `"off"` and absent mean they stop nothing; a malformed value is repaired to mean the same, never rejected. An authoring tool writes `"opaque"`, and never omits it, unless its author chooses otherwise. |
| `palette` | string or array | no | Which 256 colors the indices name (§1.3a). Absent means the built-in. |
| `up` | boolean | no | `true` means the object stands on the Earth's surface where it is placed (§1.7). `false` means the same as absent. |
| `spin` | integer | no | With `up`: the compass bearing the object's `+Z` faces, `0` to `359` (§1.7). |
| `refs` | array | no | Other objects this one places, each named the way a nostr tag names an event (§1.10). Absent means the object places nothing. |
| `parts` | array | no | Where each placed object stands, turns and scales, one entry per placement (§1.10). Absent means the same. |
| `objects` | object | no | The objects table: the payloads of objects placed in this build, at any depth beneath this payload, carried inside this payload instead of as events of their own (§1.10). It is a JSON object. Each key is the address that an `a` entry in `refs` names, such as `"33331:<pubkey hex>:<d>"`, and each value is the payload of the object at that address. A reader never rejects a payload because of this field. A malformed value is read as absent, and each entry is checked on its own. Absent means that every placed object is fetched. |

`vertices` and `colors` MUST have the same length. Any field not listed here MUST be ignored by a reader, not rejected (§5).

### 1.1a Why there is no `type`

Payloads written before this document carry `type: "shard"`. This format has no such field, and that is worth a paragraph, because dropping a field that existing writers emit looks like carelessness and is the opposite.

The field never said anything the container did not already say. A standalone object is `kind 33331` and an object in a bag is a `kind 3330` item; either way the kind is what a reader dispatches on, and Cyberspace's own client derives "this is a shape, not a message" from the kind and has only ever used `type` as a sanity check on a blob it had already decided was a payload.

What the field did do was carry a parochial word into a format meant for anyone. "Shard" is Cyberspace's name for an object hidden at a place. It is a good word there and it means nothing in a format called Simple Nostr Objects, and a field whose only legal value is another project's vocabulary is exactly what makes a format look like somebody's internal file that escaped.

So there is no `type` in either version, no reader may require one, and no reader may reject on its value. A publisher should not write it. Nothing rejects a payload that carries one, because the field is noise and rejecting on noise would break every object already published.

### 1.2 Positions: the lattice and the ticks

A position is an exact rational, never a float. It is carried in two parts.

`vertices[i]` is the **whole units** part: three integers, the floor of the position on each axis.

`ticks[i]` is the **remainder**: three integers `0` to `119`, the position's fractional part in 120ths of a unit. The position on an axis is therefore `vertices[i][a] + ticks[i][a] / 120` model units, exactly.

`ticks` is run-length encoded, because most objects are built on whole units and a long list of `[0, 0, 0]` is waste. Each entry is either a triple, standing for one vertex, or a **negative integer** `-N`, standing for `N` consecutive vertices whose remainder is `[0, 0, 0]`. The entries, expanded, MUST produce exactly one remainder per vertex; a reader MUST reject a `ticks` array that expands to any other length. `0` and positive integers are not valid entries.

**Why 120.** It is the smallest number divisible by every integer from 1 to 6, and it also divides by 8, 10, 12, 15, 20, 24, 30, 40 and 60. Halves, thirds, quarters, fifths, sixths, eighths and tenths of a unit all land exactly on the lattice, so a modeler snapping to any ordinary fraction never accumulates error, in the same way that 360 degrees was chosen for a circle. A power of two would have made thirds and fifths impossible.

**Why integers at all.** A vertex is at a coordinate, not near one. Two objects built to meet at a shared edge meet exactly, on every implementation, forever, with no dependence on floating point rounding or on the order the file was written in.

**The float hazard (normative).** One 120th is not exactly representable in binary floating point. Two readers that compute `whole + remainder / 120.0`, one in 32-bit and one in 64-bit, will disagree in the last bits. Therefore any operation that depends on exact coincidence, which is at least welding, deduplication, equality, sorting and hashing, MUST be performed on the integer pair before any conversion to a float. A reader that welds on derived floats has given away the one guarantee the lattice makes.

**Canonical form (normative).** There is exactly one way to write a given object. The reason is that a format that allows three spellings of the same thing gets three incompatible readers. A publisher:

- MUST omit `ticks` entirely when every remainder is zero;
- MUST write a run of two or more zero remainders as a single negative integer, rather than as repeated triples;
- MUST omit `extent` when it is `8`;
- MUST omit `opacity` when it is `100` (§1.11);
- MUST omit `objects` when the table holds no entries, and MUST write the table's keys in ascending order of their Unicode code points (§1.10). For example, the key `"33331:<pubkey hex>:0d4b8f1e2c97a356"` is written before `"33331:<pubkey hex>:a7c2e9f04b1d3e68"`, because `0` (U+0030) comes before `a` (U+0061);
- MUST NOT write `constrain` with any value but `"all"`, `"opaque"` or `"off"` (§1.12).

An absent `constrain` and `"off"` are not two spellings of one object. A reader treats them alike, but an authoring tool does not, so each is canonical for what it says (§1.12). The value that authoring tools write by default, `"opaque"`, is not what an absent `constrain` means, so it is written and never omitted. This differs from `extent` `8` and `opacity` `100`, which are what an absent `extent` and an absent `opacity` mean, and so are omitted.

A reader MUST still accept every equivalent spelling. For example, a payload whose four vertices all stand at whole positions may carry `"ticks": [-4]`. A publisher omits that field, but a reader MUST accept it. Not every publisher writes the canonical form, and an object written in another equivalent spelling is still the same object.

### 1.3 Colors

`colors[i]` is a single integer: an index into the object's palette (§1.3a). There is one per vertex, parallel to `vertices`. A reader MUST reject an index that is not an integer, is negative, or is not less than the palette's length.

**In a `v: 1` payload `colors[i]` is a literal `[r, g, b]` triple of numbers from `0` to `1`,** clamped on read, with no palette involved. Version 1 predates the palette and every object written before this document is one of them, so this is not a compatibility shim but what version 1 has always meant, alongside the Z flip of §2. A reader MUST take a `v: 1` color exactly as written rather than snapping it to the nearest palette entry: snapping on read would change objects nobody asked to change. It snaps when it is next published, which is when it becomes a `v: 2` payload. A publisher MUST NOT write triples.

There is one color per vertex and, apart from `facecolors` (§1.4a), no other color anywhere in the format. A face with no color of its own is painted by interpolating its three vertices; a line is painted by interpolating along its length; a point is its own color. **Interpolation happens after the lookup**, between the two resolved colors, so indexing costs nothing in smoothness: a gradient across a triangle is as continuous as it ever was, and the index is only how its endpoints are named.

**Why an index and not three numbers.** Color was the largest cost in this format by a wide margin and it was buying nothing. Three numbers at four decimal places is 21 bytes of the 52 a worst-case vertex costs; an index is 4. Measured over a whole serialized event at the format's ceiling, with a color on every face, that is 62.6 KB against 33.5 KB, on a wire whose tightest common limit is 65,536 bytes (§1.8). Face colors were unaffordable and are now nearly free.

Nothing is lost visually. A palette entry is eight-bit-per-channel color, which is what a screen shows and what PLY, PNG and every common exchange format store. What is given up is an object using more than 256 distinct colors at once, and an object that needs more than 256 distinct colors is not the kind of object this format is for.

| | bytes per vertex | 512 vertices, 1024 faces | with a color on every face |
|---|---|---|---|
| three numbers at full precision | 87 | 57.1 KB | 115.1 KB, over every relay |
| three numbers at four decimals | 52 | 39.6 KB | 62.6 KB |
| **a palette index** | **32** | **29.9 KB** | **33.5 KB** |

At 32 bytes a vertex only about 4 are the color, so this is the last large saving available in color. Anything further would have to change how positions are encoded.

### 1.3a The palette

`palette` says which 256 colors an object's indices refer to.

| `palette` | Meaning |
|---|---|
| absent | the built-in, `cyberspace-neon-256` (Appendix C) |
| a registered name | `"cyberspace-neon-256"` is the only one, and is the default |
| an `nevent1…` or `naddr1…` | a palette published as its own nostr event, fetched if it can be, with the built-in standing in until it is (§1.3b) |
| an array | a palette carried in the object itself: 2 to 256 entries, each `[r, g, b]` of three integers `0` to `255` |

A reader MUST reject a `palette` that is an array of fewer than 2 or more than 256 entries, or any entry that is not three integers in `0..255`, or a string that is neither a name it knows nor a well-formed `nevent` or `naddr`.

**Why a custom palette may be short.** An object with four colors pays for four, not for 256. Two entries cost 40 bytes, sixteen cost 222, and a full 256 costs 3.3 KB, so the cost lands where it is affordable: 3.3 KB is four times the size of a cube and a sixth of an object at the ceiling, and it is large objects that want a palette of their own.

### 1.3b A palette published as its own event

A `palette` of `nevent1…` or `naddr1…` names a nostr event that carries a palette. This is how a group of objects share one set of colors, and how this format meets the palettes that already exist on nostr rather than insisting everyone reuse its own.

**The rule that makes this safe is that a reference is never load-bearing.**

1. A reader MUST render the object without waiting for anything. Until the referenced event is in hand, the indices name the built-in.
2. A reader MAY fetch the event, and SHOULD if it can do so without blocking the first frame. When it arrives and it parses, the reader re-renders with it.
3. A reader that cannot fetch, or fetches an event that is not a palette, MUST keep drawing with the built-in and MUST NOT reject the object.

So the worst case is an object drawn in the wrong colors, never an object that cannot be drawn. That is a real cost and it is stated here rather than buried: a viewer has no way to tell that the colors it sees are the fallback rather than the author's. A publisher who cannot accept that carries the palette inline, which is what the array form is for, and which is what a small palette should do anyway.

**A palette event carries its colors in `c` tags, one tag per color, and the order of the tags is the index.** A publisher MUST write the colors that way and MUST NOT write a second machine-readable copy of them anywhere else in the event. `c` tag `n`, counting from zero in the order the tags appear in `tags`, is the color that index `n` names. A value is `#rrggbb`. Two to 256 of them.

Everything else in the event is for people. `name` is what the author calls the palette, `alt` is NIP-31's line for a client that cannot render it, `client` says what published it, and `content` may hold whatever a color-moment client would want there, an emoji or a sentence, or nothing at all. None of it is read for colors.

**What counts as a palette event (normative).** Given an event it has fetched, a reader MUST take the first of these that succeeds.

1. **The `c` tags**, in the order they appear in `tags`, if there are 2 to 256 of them and every value is a well-formed `#rrggbb`. Their order is the palette's order.
2. Otherwise, **`content`**, if it parses as a JSON array of 2 to 256 entries where every entry is either `[r, g, b]` of three integers `0..255` or a `"#rrggbb"` string. This is a legacy form and a reader accepts it only because an earlier draft of this section described it; nothing SHOULD write it now.
3. Otherwise the event is not a palette event, which counts as a failed fetch, which means the built-in.

The kind is deliberately not constrained. This format does not define a palette kind and does not want one: palettes on nostr are somebody else's problem and partly solved already, and a reader that accepts the shape above will read whatever convention wins without this document being revised. `kind 3367`, the color-moment convention, is what carries them today.

**Why the tags are the encoding and not `content`.** Three reasons, in the order they should be weighed.

1. **A single-letter tag is indexed by relays and `content` is not.** With the colors in `c` tags, `{"#c": ["#FF0000"]}` is a filter that finds every palette containing pure red, on any relay, with no new index and no new kind. A palette in `content` is opaque to every relay that stores it and can only be found by fetching it first. Nothing else in this section buys a capability that did not exist before; this does.
2. **One spelling.** The canonical form rule of §1.2 exists because a format that allows two spellings of one thing gets two incompatible readers, and colors in both the tags and the content would have been exactly that: the same information twice, with a rule needed to say which copy wins when they disagree.
3. **It is what the network already publishes,** which means an SNO palette is a color moment and a color moment is an SNO palette, with no translation and no second audience to write for.

Size does not decide this and should not be read as if it did. A 256-color palette is 4,618 bytes as tags with an empty content, against 3,691 for the dual form that was considered and rejected here, six tags as a preview with a JSON copy of the whole palette in the content, and no relay surveyed advertises a tag limit anywhere near 260 tags: of nos.lol, relay.damus.io, relay.primal.net, relay.nostr.band, ditto.pub and cyberspace.nostr1.com, only cyberspace.nostr1.com advertises `max_event_tags` at all, at 10,000.

**What the survey found, and what this section used to say.** Until 2026-09-16 this section said that a palette event's colors were a JSON array in `content`, and that the reference was an `naddr`. Both were guesses, made before anyone had looked at a real one, and both were wrong. A survey of five relays for `kind 3367` returned 205 unique events from 51 pubkeys, and every one of them carries its colors as `c` tags, one tag per color, in document order, with an emoji or a short note in `content`. All 661 `c` values are well-formed `#rrggbb` and none is malformed. Alongside them are `layout`, `alt` and `client` on all 205, `name` on 152 and `g` on 33. The palettes are small: 178 carry three colors, 14 carry four, 7 carry five, 6 carry six. So the content-only rule would have rejected every palette on the network, which is the opposite of meeting palettes that already exist. Kind 3367 is also in NIP-01's regular range of 1000 to 9999, which is stored and immutable and has no address, so the `naddr` this section asked for could not have named one of these events even in principle.

**Editing a palette publishes a new event.** A regular event cannot be replaced, so a corrected palette is a second event rather than a new version of the first, and the link back is carried in `e` tags. A publisher correcting a palette MUST write `["e", "<previous event id>", "<relay hint>", "previous"]`, and where it knows the first version of the palette SHOULD also write `["e", "<first version id>", "", "genesis"]`. Those two marker words are the ones Cyberspace's own action chain uses, so an implementer who has read anything else in this repository already knows what they mean. Together they make a history a reader MAY walk backward: `previous` gets the step before, `genesis` gets the start without walking at all.

**A reference is pinned to the event it names.** A reader MUST NOT follow the `e` chain forward to a newer version, and MUST render the object with the event the object names. This is the part that is better than the addressable form this section proposed before, and it is worth saying why rather than leaving it as a consequence of the kind. An immutable event means an object renders the same forever, and an author who corrects a palette cannot silently repaint every object that ever named it, including objects belonging to people they have never met. The cost is that an object does not pick up a correction on its own: it picks one up when its own author republishes it pointing at the new event, which is a deliberate act by the one person entitled to change how that object looks.

**Why an event id rather than an address.** An `nevent` carries the id and relay hints, so a reader has somewhere to look, and it names one immutable event, which is what the pinning rule above needs. An `naddr` is still accepted, for a palette somebody publishes as an addressable event of their own; once the event is fetched the shape rules above apply to either, and the pinning rule applies to whatever the reader has in hand. What an `naddr` cannot do is name a `kind 3367`, which is where the palettes are.

**The built-in is not a compromise default.** It is 24 hues of 8 steps, then 32 steels, then 32 signature colors, laid out so that index arithmetic is legible: `hue * 8 + step` for the first 192. The ramps are generated in OKLCH, which spaces them by how different they look rather than by their numbers, and clipped into sRGB by lowering chroma rather than clamping channels, which is what keeps the bright end from turning to mud. Appendix C carries the whole list.

### 1.4 Faces

`faces[i]` is `[a, b, c]`, three integers indexing `vertices`. Every index MUST be at least `0` and less than the vertex count, and the three MUST be distinct. A reader MUST reject a payload containing any face that fails either test, because a face pointing at a vertex that does not exist is a crash in most renderers, far from anything that could explain it.

**Winding order is a face's front.** For a face `[a, b, c]` the front is the side that the normal `(b - a) × (c - a)` points to, computed on the positions in the frame of §2 (after the version 1 negation, for a version 1 object). Seen from the front, the corners run counter-clockwise, which is the glTF, three.js, OpenGL and Blender convention, so an exporter from any of them writes its faces in the order it already holds them. This is how an object says which way each face looks, at a cost of zero bytes: the order of three indices is on the wire whatever it means.

A reader MUST take a face's front from its winding and MUST NOT infer it: not from the object's shape, not from where the origin sits, not from the side the viewer is on. Inference cannot be right for an open sheet, which has no inside to point away from, and two readers that infer differently show one object as two.

A reader MUST still draw both sides of every triangle and MUST NOT cull a face on the basis of its winding. It MAY draw a back darker than a front, and a reader that lights an object SHOULD, so that an author can see a face that looks the wrong way. Culling is refused because an object is often an open shell, and culling would make it vanish from behind.

This section was, until 2026-09-24, the opposite rule: winding carried no meaning and a face had no front. That was chosen so that no author would ever have to think about winding. It was reversed because readers that light objects had to guess each face's front, and a guess that is wrong for a flat plate turned half of a published object dark on one reader and not on another. Authoring tools carry the burden instead: they SHOULD wind new faces outward by default and SHOULD give the author a way to turn a face round. (Non-normative: sno-core's `orient.ts` is one such default. It splits the faces into solids, the faces reachable from each other across shared edges, and winds each solid outward on its own, so two solids pushed through each other never decide each other's winding. That is an authoring heuristic; a reader still takes the front from the winding as written.)

This is stated because leaving it unsaid is the most common way a small format fails. STL left color unspecified and two vendors filled the hole incompatibly; PLY never registered its property names and cost the ecosystem years of colors that did not import; Niantic's SPZ shipped in 2024 without saying which axis is up and someone had to file an issue to ask.

`faces` MAY be empty. An object with no faces is a point cloud or a polyline, depending on `mode`.

### 1.4a Face colors, and hard seams

A face with no color of its own takes one by interpolating its three vertices, which is a gradient across the triangle. That is the right default for a lit, rounded object and the wrong one for the blocky work this format suits best, and until now the only way to get a flat triangle was to give all three of its vertices the same color. Two flat triangles meeting at an edge then need six vertices where the geometry needs four, and a flat-shaded 500-triangle object spends 1,500 vertices to express 500 colors: three times over the budget of §1.8. The format made its own best style its most expensive.

`facecolors` is one entry per face, in the order `faces` gives them.

**When a face has a color, that color fills the whole triangle** and its vertices contribute nothing to the fill. Vertex colors are untouched and still color the points and the lines (§1.5), so an object may carry both without contradiction and `points` and `lines` mode behave exactly as they always did.

**Run-length, as `ticks` does it (§1.2), because the common case is a run.** A stamped block is twelve triangles of one color. An entry is either a **palette index**, a non-negative integer read exactly as §1.3 reads one, or a **negative integer** `-N` standing for N further faces of the index before it. A solid cube whose color is index 7 is therefore `[7, -11]`. The first entry MUST be an index, since a run has nothing to repeat before one. The entries, expanded, MUST produce exactly one color per face; a reader MUST reject a `facecolors` array that expands to any other length.

The sign is what separates the two kinds of entry, and it works because an index is never negative. This is the same trick `ticks` uses and it is why color had to become a single number before face colors could be affordable: a list of triples interleaved with run markers cost more than it saved.

The canonical form of §1.2 extends unchanged: a publisher MUST write a run of two or more as the shorthand, so there is still exactly one way to write a given object.

**What this does not do, deliberately.** It gives a hard seam between faces, not a gradient inside a face with a hard edge along one of its sides. That would need a color per face corner, three per face, which triples the color data to buy a case this format's audience does not have. Lines keep interpolating along their length; per-edge color would be a third mechanism and is not worth one.

### 1.5 Mode

`mode` says which drawing of the vertex list is the intended one. All three are drawings of the same data, so mode is a property of the object and not of the viewer.

| Mode | Drawing |
|---|---|
| `solid` | the triangles in `faces`, colors interpolated across each face |
| `points` | the vertices, each at its own color |
| `lines` | the edges of the faces, each drawn once, colors interpolated along each edge; with no faces, one polyline through the vertices in order |

A client SHOULD also draw the vertices as points in every mode, so that an object remains visible when it is smaller on screen than a triangle.

### 1.6 Scale

`unit` is an exponent, not a size. One model unit is `2^unit` base units, and the application decides what a base unit is. In Cyberspace a base unit is one gibson, the smallest addressable length, so a `unit` of `0` builds on a lattice one gibson wide and a `unit` of `33` builds on a lattice of meters.

This is why the same geometry serves a trinket and a monument: an object is written once and scaled by changing one integer, with no re-quantization and no loss.

An application outside Cyberspace that has no natural base unit MAY treat `unit` as a relative scale only, and SHOULD render an object at a size that suits its context rather than refusing it.

### 1.7 Standing on Earth

`up`, when present, MUST be a boolean; a reader MUST reject any other type. `true` means the object is oriented against the surface of the Earth at the point where it is placed: the object's `+Y` axis points along the geodetic normal (local up), its `+X` points local east, and its `+Z` points local north. Absent, an object's axes are the application's axes.

`spin` is a whole number from `0` to `359`: the compass bearing the object's `+Z` faces, measured clockwise from north as seen from above. `0` faces north, `90` east, `180` south, `270` west. Absent with `up` true means `0`.

A reader MUST reject a `spin` that is present and is not an integer in range, whether or not `up` is present, because a payload carrying a nonsense bearing is malformed even where the bearing is unused. A reader MUST ignore the value of `spin` when `up` is not `true`.

The frame is right-handed in Cyberspace's axes. This is not obvious and is worth stating: the canonical GPS mapping (`CYBERSPACE_V2.md` §9.4) swaps the ECEF Y and Z axes, which mirrors the frame, so (east, up, north) comes out right-handed in Cyberspace where it would be left-handed in ECEF.

A reader that does not implement `up` draws the object in the application's axes and is not wrong, only unoriented.

### 1.8 Limits

| Limit | Value | Why |
|---|---|---|
| vertices, faces, refs, parts | **none** | the size of an event is the relay's concern, as it is for every other kind of event; see below |
| nesting depth | 4 | how far a reader follows placements (§1.10). A bound on the reader's work, not on the object |
| `extent` | 1 to 64 model units | a hint at the lattice size, so a reader can size a grid before it reads the data |
| `unit` | 0 to 84 | the Cyberspace address space is `2^85` gibsons on a side |
| `name` | 64 characters | truncated, not rejected |

**There is no ceiling on vertices or faces.** A reader MUST NOT reject a payload for its vertex or face count. Until 2026-09-24 this format set 512 vertices and 1,024 faces, sized so that the worst object it permitted fit a stock relay. It was removed because no other event kind bounds its own content: a long-form article, a file header, a wiki page are as large as their author makes them, and the relay that stores an event decides what it will take. That is a different class of problem from the one a format solves, and a format that solves it anyway puts a number between the author and the thing they were making. The number did that: a 129-square floor pasted square by square reached 516 vertices, deployed, and was opened as nothing by every reader (arkinox, 2026-09-24), and a figure or a vehicle at ordinary low-polygon detail needs 600 to 1,000 and was impossible however well it was built.

What replaces the ceiling is a publisher who knows what things cost and a container that stops multiplying: an object of any size can have an event of its own (§3.1, §3.4), so a bag, which is one event shared by everything hidden at a place, need never grow with the objects it names. The rest of this section is the arithmetic, so a publisher can plan against the relays it uses; none of it is a rule.

`extent` is **advisory and self-repairing**, which is one of the places this format is deliberately forgiving rather than strict; `opacity` (§1.11) and `constrain` (§1.12) are others, for the same reason. A reader MUST substitute the default of `8` for an `extent` that is absent, not an integer, or outside `1..64`, and MUST then grow it until it contains every vertex. An object is therefore never rejected for disagreeing with its own extent; the data wins and the hint is corrected. This is what lets a modeling tool write geometry first and a bounding hint second without the two ever contradicting.

The position bound is stated as an obligation on publishers rather than readers: a publisher MUST NOT write a vertex further than `64` model units (`7680` ticks) from the origin on any axis. A reader MAY reject such a payload and MAY instead repair it by growing the extent. ONOSENDAI currently repairs. §8 records the consequence.

**What things cost (non-normative).** strfry's stock `events.maxEventSize` is 65,536 bytes, and strfry is the most deployed relay software in the network; a relay's operator may raise it, and the ones this world runs on have (below). What a full serialized event costs at 512 vertices and 1,024 faces, the format's former ceiling and still a useful yardstick, worst case throughout, with coordinates at the extent bound and every field at its most expensive:

| At 512 vertices and 1024 faces | No `facecolors` | With `facecolors` |
|---|---|---|
| **palette indices, the built-in (§1.3)** | **29.9 KB** | **33.5 KB** |
| plus a full 256-entry custom palette | 33.1 KB | 36.7 KB |

Both fit with room to spare, and face colors now cost 3.6 KB rather than doubling the object. Two earlier drafts of this section did not: three numbers per color at four decimal places reached 62.6 KB with face colors, and at full double precision 115.1 KB, which is over every relay in the network. §1.3 carries that comparison, because it is the whole reason color is an index.

The cost is now dominated by geometry rather than color. Worst case, a vertex costs 32 bytes, of which about 4 are its color; a face costs 13, and a face that carries its own color 17. A publisher that wants the largest possible object spends its budget on vertices.

A real object is far below that, because the worst case above assumes every position needs its sub-unit part written out and every face carries a color of its own. An object built on whole units, which is what the lattice is for, compresses its `ticks` to a single number and its `facecolors` to one run:

| A typical object, whole units, the built-in palette | Full event, serialized |
|---|---|
| a coloured cube, 8 vertices | about 730 bytes |
| 64 vertices, 128 faces | 2.5 KB |
| 256 vertices, 512 faces | 9.4 KB |
| **512 vertices and 1024 faces** | **18.9 KB** |

One color per face adds almost nothing to these, because a run of identical faces is two numbers whatever its length.

These numbers are the whole argument for the change in §1.3: the same object that cost 29.4 KB with three numbers per color costs 18.9 KB with an index, and the ceiling that fits a 56 KB budget with a color on every face moved from 448 vertices to 832.

Two facts make this margin more comfortable than it looks. Escaping the payload into a JSON string costs about 12 bytes, under 0.05%, because the content is almost entirely integers, so the fear that nesting JSON inside JSON is wasteful does not apply here. And the geometry belongs in `content` rather than tags: strfry caps a tag value at 1,024 bytes and the tag count at 2,000, while content is roomy everywhere.

**The relays in use, measured 2026-09-24** (NIP-11 `max_message_length`): cyberspace.nostr1.com **262,200** bytes; nos.lol 131,072; relay.primal.net and relay.damus.io 1,000,000. Worst case a vertex costs 32 bytes and a face 13, or 17 with a color of its own; a typical whole-unit object costs about a third of that. So the world's own relay takes a worst-case object of about 3,500 vertices, or a typical one of about 10,000, standing alone; a stock relay takes about 800 worst case. A publisher who knows its relays can size to them; one who does not should publish and read the refusal, which names the reason.

**A bag is the one place size still multiplies.** Everything hidden at one place by one author travels in one event, encrypted and base64'd, so three large objects inline are three times the size and the bag fails before any object would alone. §3.2 and §3.4 give every object the option of an event of its own; a publisher SHOULD take it for anything large, and the bag then stays small however much stands at the place.

One trap worth knowing, since it cannot be discovered at runtime: strfry populates NIP-11's advertised `max_message_length` from its WebSocket frame cap, not from `events.maxEventSize`, and never advertises the latter. A relay advertising a one megabyte limit may still reject a 70 KB event. Do not design against advertised numbers; stay under the ceiling and handle the rejection message.

### 1.9 Validation

A reader MUST perform all of the following before rendering, and MUST reject the whole payload if any fails. A partially valid object is not rendered partially: a face index pointing past the end of the vertex list is not a defect that degrades gracefully.

**The one exception is `objects` (rule 16).** A payload's `objects` field holds the payloads of objects placed in this build, at any depth beneath it (§1.10). A reader does not check those payloads together with the payload that carries them. Instead, it checks each one on its own, by these same rules, at the time a placement draws from it. A carried payload that fails is drawn as a placeholder at each placement that names it. This is exactly what happens to an object that is fetched and fails. A failing entry is never a reason to reject the payload that carries it. That payload is unaffected.

1. `v` is `1` or `2`. A `type` field, if present, is ignored and never rejected on (§1.1a).
2. `vertices`, `colors` and `faces` are arrays, and `vertices.length === colors.length`.
3. There is no bound on `vertices.length` or `faces.length` (§1.8). The number is kept so the rules below keep their names; until 2026-09-24 it read `512` and `1024`.
4. `mode` is one of the three words.
5. `unit` is an integer in `0..84`.
6. Every vertex triple is three integers.
7. `ticks`, if present, expands to exactly one remainder per vertex, and every remainder component is an integer in `0..119`.
8. Every face is three distinct integers in `0..vertices.length - 1`.
8a. `palette`, if present, is the name of a known built-in, a well-formed `nevent` or `naddr`, or an array of 2 to 256 entries of three integers `0..255`. A reference that has not been resolved counts as the built-in for the rules below, and is never a reason to reject (§1.3b).
8b. in a `v: 2` payload, every entry of `colors` is an integer from `0` to one less than the palette's length; in a `v: 1` payload, every entry is three numbers (§1.3).
8c. `facecolors`, if present, expands to exactly one index per face, its first entry is an index, every run entry is a negative integer, and every index is in range.
9. `extent`, if present, is repaired rather than validated (§1.8): out of range becomes `8`, then it grows to contain the data.
10. `up`, if present, is a boolean; `spin`, if present, is an integer in `0..359`.
11. `refs`, if present, is an array whose entries are each `["e", <64 lowercase hex>]` or `["a", "33331:<64 lowercase hex>:<d>"]`, optionally followed by one relay URL (§1.10).
12. `parts`, if present, is an array whose entries are each eight integers: a `refs` index in range, three tick offsets each in `-7680..7680`, three whole degrees each in `0..359`, and a scale step such that the placed object's unit stays in `0..84` (§1.10). `parts` without `refs`, or a `refs` index past the end, is a reason to reject.
13. A payload with `parts` and no `vertices` of its own is valid: an object may be nothing but the arrangement of others (§1.10).
14. `opacity`, if present, is repaired rather than validated (§1.11): a value that is not an integer in `1..100`, null included, means `100`, and an integer from `1` to `9` is drawn at `10`. It is never a reason to reject.
15. `constrain`, if present, is read rather than validated (§1.12). `"off"` is a valid word, and means the object stops nothing. A value that is not exactly the string `"all"`, `"opaque"` or `"off"`, null included, is repaired to mean the same. It is never a reason to reject.
16. `objects`, if present, is read rather than validated (§1.10). It is never a reason to reject this payload. A value that is not a JSON object, null included, is read as absent. A key that is not an address of the form `33331:<64 lowercase hex>:<d>` is ignored. For example, the key `"glass-tetra"` is ignored, and so is a key whose pubkey is written in uppercase hex. Each value is a payload. It is checked by rules 1 to 15, on its own, when a placement draws from it, and any `objects` field inside it is ignored. A value that fails is a placeholder for each placement that names it.

---

### 1.10 Parts: one object placing others

**An object MAY place other objects.** `refs` names them; `parts` says where each stands. A reader that supports this section draws the parent's own geometry and then each placed object at its placement; a reader that does not, or that cannot fetch a placed object, draws the parent's own geometry and a placeholder where each part would stand, and MUST NOT reject the parent for it.

**`refs` is a list of nostr references, written the way a tag writes them.**

```json
"refs": [
  ["a", "33331:<pubkey hex>:<d>", "wss://relay.example"],
  ["e", "<event id hex>"]
]
```

An `a` reference names an addressable object (§3.1) and follows its author's newest version: fix the tile and every floor built from it changes. An `e` reference names one event, as a palette reference does (§1.3b), but an object is addressable, and NIP-01 lets a relay discard every version but the newest; most do. An `e` to a version its author has since replaced may therefore find nothing and be drawn as a placeholder. A publisher SHOULD write `a`. An author who wants a build no one else can change copies the object, publishes the copy under their own key, and places that. A reader MUST still read both shapes. The relay URL is a hint, as in NIP-01, and MAY be omitted. `refs` names each object once; a reader MUST reject a payload whose `refs` entry is not one of the two shapes above.

**`parts` is a list of placements, eight integers each.**

```json
"parts": [
  [0,  0, 0, 0,   0, 0, 0,   0],
  [0,  240, 0, 0, 0, 90, 0,  0],
  [1,  120, 0, 120, 0, 0, 0, -1]
]
```

| Position | Meaning |
|---|---|
| 0 | index into `refs`: which object |
| 1, 2, 3 | where its origin stands, in the parent's **ticks** (§1.2), so `120` is one whole unit; each in `-7680..7680`, the 64-unit position bound of §1.8 |
| 4, 5, 6 | its turn about its own origin, whole degrees `0..359` about the parent's X, then Y, then Z axes, in that order, in the right-handed frame of §2 |
| 7 | scale step: the placed object is drawn at `2^(its unit + step)` base units per model unit. `0` keeps its own size; `1` doubles it; `-1` halves it. The result MUST stay in `0..84` |

Positions are ticks and turns are whole degrees because everything else in this format is an integer and the canonical form of §1.2 depends on it. Multiples of `90` keep a placed object on the lattice exactly; other angles are permitted and are drawn as the renderer's floating point allows, which is what §4 already says of ticks. The scale is a power of two because `unit` is (§1.6): a step is exact, a free multiplier is not.

**Why the placements are in the payload and not in the event's tags.** A copy of the payload is the whole object, on the clipboard, in a bag, in another client; placements carried as tags would fall off it. Inside a bag the tags are encrypted with everything else, so nothing would be gained there. A publisher of a public `kind 33331` SHOULD also write each `refs` entry as an `e` or `a` tag on the event, unchanged, so a relay can answer "what places this object" (`#a`, `#e`); a reader MUST take the placements from the payload and MUST NOT read them from tags. A hidden object (§3.4) is also a `kind 33331`, but it MUST NOT carry these tags, because its tags are not encrypted (§3.4).

**What a placed object keeps and what it loses.** A placed object keeps its own `palette`, `mode`, `opacity`, `constrain`, `facecolors` and geometry. It is drawn as its author drew it, and the parent's `opacity` and `constrain` do not reach it (§1.11, §1.12). It loses `up` and `spin`. The reason is that the parent's placement decides where it stands and which way it faces, and a parent standing on the Earth (§1.7) carries its parts with it. Its `extent` is ignored. Instead, the parent's extent is repaired to contain the placed objects' bounds, in the same way that it is repaired to contain the parent's own vertices (§1.8). A reader can only do this once it has each placed object, either fetched or read from an objects table (below). A parent's advertised extent may therefore be smaller than what is finally drawn.

**Depth and cycles.** A placed object may itself have parts. A reader MUST follow placements no deeper than `4` levels from the object it is rendering. It MUST draw a placeholder in place of anything deeper. A reader MUST also treat a reference to any object already in the chain of parents as missing. For example, if object A places object B, and B places A again, that placement of A inside B is missing, and it is drawn as a placeholder. A reader can enforce both of these bounds by itself, without trusting the author of the object. This section states only bounds of that kind, because a bound that relies on the author's good behavior does not protect a reader from an author who ignores it.

A reader MAY also bound how many placements it draws for one object, counting every depth together, and draw the rest as placeholders. The reason is that placements multiply from one level to the next. Four levels of a few dozen placements each multiply into hundreds of thousands of drawn objects. An objects table (below) of 3.4 KB was measured placing 838,000 objects. (Non-normative: sno-core draws at most 20,000 placements for one object by default, and draws the rest as placeholders.)

A reader MAY also bound how many distinct objects it reads for one object, counting objects it fetches and objects it reads from an objects table (below) together. An object past that bound is drawn as a placeholder at each of its placements. An object already read is still drawn wherever it is placed. The reason is that a reader's memory grows with the number of different objects it holds, not with how often each one is placed. A floor of 129 placements of one tile is one object, while a build may name hundreds of different objects with one placement each. (Non-normative: sno-core reads at most 1,000 distinct objects by default, counting fetches and table entries together.)

**A missing part is a placeholder, never a rejection.** A reference that cannot be fetched, has been deleted, fails §1.9, or is deeper than the bound is drawn as a placeholder at its placement: a wireframe cube one whole unit on a side in the reader's accent is the reference behavior, and a reader MAY do better. The parent is unaffected. This is the same stance §1.3b takes for a palette that cannot be resolved, and for the same reason: another author's event is not this object's to guarantee.

**An object MAY carry the objects it places (`objects`).** A placed object is normally fetched. The reader reads its ref, asks relays for the event that the ref names, and draws the payload in that event. An object MAY instead carry a copy of a placed object inside its own payload, in a field named `objects`. A reader then draws the placed object from that copy, and does not fetch it. An author carries an object in this way in two cases:

- the object was never published, so there is no event to fetch;
- the object was published, and its author wants this build to keep the object exactly as it was when it was placed.

Whether a placement is carried, or is a reference that follows the object's own event, is the author's choice. The author makes that choice for each placement.

**The objects table.** The value of `objects` is called the objects table, or the table, in this section. It is a JSON object:

- Each key is an address, `33331:<pubkey hex>:<d>`. It is written exactly as the second element of the `a` entry in `refs` that names the object. For example, the key `"33331:<pubkey hex>:0d4b8f1e2c97a356"` belongs to the ref `["a", "33331:<pubkey hex>:0d4b8f1e2c97a356"]`.
- Each value is the payload (§1.1) of the object that the address names.
- One key and its value are called an entry.

The `<d>` part of an address is any string, as NIP-01 allows for a `d` tag. It may contain spaces, colons or line breaks. A reader therefore compares the whole key with the whole address, character for character, line breaks included.

The `refs` entry and the placements are written exactly as they would be without the table. The table only tells a reader where to find the object, so that the reader does not need to fetch it.

**An example.** A flooded room is built as two objects: a stone floor that holds a walker, and the water above it, which lets a walker wade in (§1.12). Both are carried, so neither needs an event of its own:

```json
{
  "v": 2, "name": "Flooded cistern", "unit": 0, "mode": "solid",
  "vertices": [], "colors": [], "faces": [],
  "refs": [
    ["a", "33331:79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798:a7c2e9f04b1d3e68"],
    ["a", "33331:79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798:0d4b8f1e2c97a356"]
  ],
  "parts": [[0, 0, 0, 0, 0, 0, 0, 0], [1, 0, 60, 0, 0, 0, 0, 0]],
  "objects": {
    "33331:79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798:0d4b8f1e2c97a356": {
      "v": 2, "name": "Water", "unit": 0, "mode": "solid",
      "vertices": [[0, 0, 0], [2, 0, 0], [2, 0, 2], [0, 0, 2]],
      "colors": [239, 239, 239, 239],
      "faces": [[0, 2, 1], [0, 3, 2]],
      "opacity": 40, "constrain": "off"
    },
    "33331:79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798:a7c2e9f04b1d3e68": {
      "v": 2, "name": "Cistern floor", "unit": 0, "mode": "solid",
      "vertices": [[0, 0, 0], [2, 0, 0], [2, 0, 2], [0, 0, 2]],
      "colors": [207, 207, 207, 207],
      "faces": [[0, 2, 1], [0, 3, 2]],
      "constrain": "all"
    }
  }
}
```

In this example:

- The whole payload, named `"Flooded cistern"`, is the parent. It has no geometry of its own (§1.9 rule 13). It is also the root, because it is the object the reader was asked to render.
- `refs` holds two refs. Each names an object by its address. The pubkey in both addresses is that of the secret key `1`, a well-known test key. Each `d` is 16 random hex characters.
- `parts` holds two placements. The first places ref `0`, the floor, at the parent's origin. The second places ref `1`, the water, 60 ticks (half a unit) above the origin.
- `objects` is the objects table. It holds two entries. Each entry's key is the address that one ref names, and its value is the whole payload of that object. These two payloads are the carried objects.
- Each carried object keeps its own fields. The water is drawn at 40 percent opacity, in blue (built-in color `239`), and lets a walker in (`"constrain": "off"`). The floor is drawn opaque, in steel gray (built-in color `207`), and holds a walker (`"constrain": "all"`).
- The keys are written in ascending code point order (§1.2), so the key ending in `0d4b8f1e2c97a356` comes before the key ending in `a7c2e9f04b1d3e68`. The order of `refs` does not need to match.
- Each key uses a `d` that says nothing about the object it names (see **What an older reader asks relays for**, below).

The whole payload is 880 bytes compact. Appendix A carries a second example, in which one carried object is placed twice.

The rules follow. They are listed in the order a reader comes to them when it resolves a placement.

- **One table, at the root.** The table a reader looks in first is the root's table: the `objects` of the object the reader is rendering. That object is the payload of the event the reader was given, whether that event is a public object (§3.1), an item in a bag (§3.2), an avatar (§3.3) or a hidden object (§3.4). A reader looks up every placement's address in the root's table first. This holds at any depth: for the root's own placements, and for the placements of every object placed beneath it. For example, if the root places a wall and the wall places a window, the reader looks for the window's address in the root's table too. Only a placement whose ref is an `a` ref is looked up. The reason is that each key is an address, while an `e` ref names an event id. An object placed by `e` is therefore always fetched.
- **A table entry is never fetched.** When a table holds an address, a reader draws that object from the table, and it MUST NOT fetch that address. This holds whether or not an event exists under that address. It holds for the root's table, and for the table of an object fetched as its own event (two rules below). The reasons are given under **Why a table entry is never fetched**, below.
- **A writer flattens the table into the root.** Every object that a build carries is in the root's table, however deeply it is placed. An object in the table carries no `objects` of its own. A publisher MUST NOT write an `objects` field inside an entry, and a reader MUST ignore one that it finds there. An entry may still place other objects through its own `refs` and `parts`, and those placements are looked up in the root's table like any other. In the example of the wall and the window, both are entries in the root's table, and the wall's entry has no `objects` field. As a result, an object that is placed many times, or at several depths, travels once.
- **An object fetched as its own event keeps its own table.** A placed object that a reader fetches, by `a` or by `e`, is an event of its own, and it is not in the root's table. When that fetched object has an `objects` field, the field is the table of the fetched event. A reader resolving a placement looks up the address in two tables, in this order:
  1. the root's table;
  2. the table of the event that the placing object travels in, if that is a different event from the root's.

  The reader fetches only an address that neither table holds. For example, suppose the root places a published statue by `a`, and the root's table does not hold the statue. The statue's own event carries a table that holds its pedestal. The reader fetches the statue, and then draws the pedestal from the statue's table. If the root's table also held the pedestal's address, the reader would draw the root's entry instead, because the root's table is looked in first.
- **Keys are under the author's own pubkey.** Each table has one pubkey that counts: the pubkey that the reader can verify as the author of the event that the table travels in. It depends on how the event is carried:
  - a public object (§3.1) or a hidden object (§3.4): the event's signer;
  - an avatar (§3.3): its signer;
  - an item in a bag (§3.2) that is signed: the item's signer;
  - an item in a bag that is not signed: the bag's signer, never the pubkey the item claims (§6, "Objects are not attribution");
  - a placed object fetched by `a`: the pubkey its address names, which is its event's signer;
  - a placed object fetched by `e`: the signer of the event fetched.

  A publisher MUST write only keys under the pubkey that counts, as this list gives it. In most cases that is the event's author. For an item in a bag that is not signed, it is the bag's signer. A publisher writes the table before the event is signed or published, so it uses the pubkey that will count once the event is published. A reader MUST ignore any other key, and fetch that address as though the table did not hold it. For example, in a table carried by a public object signed by `<pubkey A>`, a reader honors the key `"33331:<pubkey A>:<d>"`, and ignores the key `"33331:<pubkey B>:<d>"`. The writer and the reader use the same list, so the keys a publisher writes are the keys a reader honors.

  A reader that does not know the pubkey honors no key in the table. It never honors every key instead.

  **Why:** a reader draws an entry in place of the object that the entry's address names. If a key under another author's pubkey were honored, anyone could draw a shape of their own as that author's object, inside a build that author never saw. A copy of another author's object, carried this way, is therefore the copier's object. It is keyed under the copier's own pubkey and a `d` of the copier's choosing. How such a copy credits the original (§3.5) is an open question (§8, question 7).
- **A copy or a link, chosen by the author.** A carried object is a copy. An object placed by an `a` ref whose address is not in the table is a link, which follows its author's newest version (see `refs`, above). A publisher MAY carry an object that also has an event of its own. The table entry is then drawn in this build, and the event is not fetched. (Non-normative: ONOSENDAI decides by where its author took the object from. A piece from the author's own workshop is carried. An object picked from the feed, or by its address, stays a reference, and this includes the author's own published objects.)
- **A key that no placement names is ignored.** A reader draws only what a placement names. A publisher SHOULD NOT write a key that no placement in the build names. Such an entry is carried to every reader and drawn by none. When the table holds no entries at all, the publisher omits the `objects` field, as §1.2 requires.
- **Each entry is checked on its own** (§1.9 rule 16). A reader validates an entry when a placement draws from it, separately from the payload that carries it. An entry that fails §1.9 is drawn as a placeholder at each placement that names it, in the same way as a fetched object that fails (above). A reader MUST NOT fetch that address instead. A table entry is never fetched, even when it fails, for the reasons given under **Why a table entry is never fetched**, below. The parent is unaffected. For example, an entry with `"v": 3` fails rule 1 and is drawn as a placeholder, and the reader still does not ask relays for its address.
- **The field is never a reason to reject.** An `objects` value that is not a JSON object, such as `null`, an array or a string, is read as absent. A key that is not an address of the form above is ignored. A reader MUST NOT reject a payload for anything in `objects`.
- **Depth, cycles and each object's own fields are unchanged.** A placement drawn from the table counts toward the depth bound of `4`, and toward the chain of parents, exactly as a fetched placement does. When an entry places its own address, or the address of any object above it, that placement is therefore missing. An object in the table keeps its own `palette`, `mode`, `opacity`, `constrain` and `facecolors`, as every placed object does (above). In the example, the water stays translucent and lets a walker in, and the floor stays opaque and holds one. Nothing is merged into the parent.
- **A reader that does not support the field** ignores it, as §1.1 requires of every field that a reader does not recognize. It fetches each address as usual and draws what it finds. Where nothing was published under the address, it draws a placeholder. Where something was published, it draws the object's newest published version, which need not be the same as the copy the table carries. It MUST NOT reject the parent because of the field.
- **What an older reader asks relays for.** A reader that predates this field fetches every carried address, so it asks public relays for each one. A publisher SHOULD therefore key a carried object that has no event of its own under a `d` that says nothing about the object, such as random hex. This means it SHOULD NOT key the object under its name, or under the path of a kit that the object came from. For example, `33331:<pubkey hex>:5e0a3c91d27f4b68` says nothing about the object, while `33331:<pubkey hex>:dungeon-kit/secret-door` names the piece to every relay that an older reader asks. The reason is that the `d` is sent to public relays by every reader that predates this field, while the name inside the payload stays sealed with the bag.
- **A table taken from a bag stays out of the clear.** A tool that publishes in the clear a payload taken from a bag MUST NOT include that payload's objects table unless its user chose to. An event published in the clear is, for example, a public object (§3.1) or an avatar (§3.3). Anyone can read such an event, so the carried objects would be published with it. For example, a tool that copies an item out of a bag and publishes it as a public object leaves out the item's `objects` field, unless its user chose to keep it. Inside a bag, the table is encrypted with everything else. An item (§3.2) is sealed with the bag, and a hidden object (§3.4) is encrypted with the bag's region key. Keeping unpublished objects private in this way is what this field is for.

**Size.** The table is part of the payload, so it counts toward the size of the event that carries it (§1.8). The parent travels as any object does: inline in the bag as an item, or, when it is large, as a hidden object of its own (§3.2, §3.4). The space a hidden object has works out as follows:

- A hidden object's payload is encrypted and then written as base64 inside its event. Base64 makes data about 4/3 of its size.
- A relay such as nos.lol accepts events of up to 131,072 bytes (§1.8). Exactly 98,304 bytes of data become 131,072 bytes of base64.
- The cipher's nonce (12 bytes) and authentication tag (16 bytes), and the rest of the event, take some hundreds of those bytes. In an event with the preview that §3.4 gives as an example and a `d` of 16 hex digits, they take 415 bytes.
- A parent and everything it carries therefore have a little under 98,304 bytes between them on such a relay: 97,889 bytes in that event.
- A stock strfry relay accepts 65,536 bytes, which leaves about half as much: 48,737 bytes in the same event.

These sizes were measured on the Maze Kit, a kit of 277 dungeon pieces of which 16 place other pieces, by carrying every piece a build places in its objects table under an address with a `d` of 16 random hex digits, and counting the UTF-8 bytes of compact JSON (no spaces, table keys in code point order).

| Build | Carried payloads alone | The objects table | The whole parent | The parent as a hidden object's event |
|---|---|---|---|---|
| A flooded room (`cistern-atrium-flooded-low`), which places 2 pieces | 17,519 bytes | 17,702 bytes | 18,079 bytes | 24,659 bytes |
| The largest build, a join (`join-across-kits`) that places 16 pieces in 19 placements | 82,996 bytes | 84,453 bytes | 86,621 bytes | 116,047 bytes |

The objects table is larger than the payloads alone by its keys and its own punctuation. The whole parent adds the parent's own fields, such as its `refs` and `parts`. The last column is the whole parent encrypted, written as base64, and wrapped in a `kind 33331` event (§3.4). These are the kit's own pieces, which carry far more geometry than the two flat squares in the example above. The largest build fits in a hidden object on a relay that accepts 131,072 bytes. It does not fit on a stock strfry relay. A build too large to carry its objects is hidden in several pieces, or its objects are given events of their own. §8 (question 8) records the alternatives.

**Why a table entry is never fetched.** There are two reasons, and the first is the more important.

- **Privacy.** A reader that fetches a placed object asks relays for its address. Suppose the address names an object that nobody published, and it is written in a payload sealed in a bag. Then only that bag's finders know the address. Asking public relays for it tells those relays which addresses from inside bags a reader has seen, and when. A reader that draws from the table asks nobody.
- **Every finder sees what was hidden.** A reader that fetched first would draw whatever the address named at that moment, if anything. Two readers of one bag could then draw two different builds. A reader that draws from the table draws exactly what was hidden.

**Why a field, and not a new kind of reference or a payload inside a placement.** Two other designs were possible, and both would break older readers:

- A ref of another shape, such as `["a", <address>, <relay>, {payload}]`, is a `refs` entry that §1.9 rule 11 rejects. Every reader written before this section would then refuse the whole parent, instead of drawing a placeholder.
- A payload inside a `parts` entry fails rule 12 in the same way.

A new field is ignored by those readers (§5). The `a` ref stays an ordinary ref. A reader that fetches it and finds nothing draws a placeholder, and a placeholder is the one failure this section allows.

**Why one table at the root, and not a table on each object.** One table carries an object once, even when the object is placed in many places and at several depths. One lookup in that table answers for every depth. A reader therefore never has to decide which of two copies of one address to draw inside one build. Only an object fetched as its own event brings a table of its own. The reason for that exception is that its table travelled in a different event, signed or sealed by that event's own author.

**A copy, not a link.** An object in the table is a copy of the object as its author had it when the parent was written. It does not follow later edits, as an `a` ref to a published object does (see `refs`, above). A finder draws what was written, until the parent's author writes the parent again. (Non-normative: the address of a carried object need not name any event. A client MAY key a copy under a `d` of its own, such as random hex. A copy that has since been changed is then never mistaken for the object it was copied from, either by a reader that fetches the address or by the tools of the author who made the copy.)

**What this buys, in bytes.** An `a` reference is about 110 bytes and an `e` reference about 78; a placement is 28 at most. Twelve palm trees as twelve inline copies cost 396 vertices; as one tree and twelve placements they cost 33 vertices and about 450 bytes. The 129-square floor that motivated this cost 516 vertices pasted and 291 welded; as one tile and 129 placements it is about 3.7 KB and 4 vertices of its own, and the tile's author can repaint every floor built from it in one edit.

**Groups are objects (non-normative).** A modeling tool wants to select, move and edit a group of vertices as one thing, and every such tool grows a grouping mechanism. This format has none, on purpose: a group is an object, placed. A client is expected to show an object's parts as things a person can pick (a tray of what is on the bench), isolate one, and edit it. A part that belongs to the person editing is edited in place, and because it is addressable every parent that places it follows; a part that belongs to someone else is cloned under the editor's own key and the placement repointed, which is what "editing someone else's tile" honestly is. A part carried in the parent's `objects` table (above) is the parent's own copy. Editing it changes that parent and no other. It also changes every placement of that part in the parent together, because all of those placements name the same entry. None of that is protocol, and none of it needs to be.

**Versioning.** `refs`, `parts` and `objects` are fields whose absence has a meaning, so adding them does not bump `v` (§5). A reader older than all three ignores them and draws the parent alone. A reader that places objects but predates `objects` fetches each carried address. It draws a placeholder where the carried object has no event of its own, and the published version where it has one.

### 1.11 Opacity

`opacity` says how solid an object is drawn. It is a whole number of percent from `1` to `100`, and absent means `100`: fully opaque, which is how every object was drawn before this field existed and how every object without it is drawn still.

| `opacity` | Drawn at |
|---|---|
| absent | `100`, fully opaque |
| `10` to `100` | that percent |
| `1` to `9` | `10`, the floor (below) |
| anything else: `0`, above `100`, negative, fractional, a string, a boolean, an array, an object, null | `100`, fully opaque, exactly as if it were absent |

**It applies to everything the object draws.** The faces of `solid`, the edges of `lines`, the points of `points`, and the vertices a client draws as points in every mode (§1.5) all take the one opacity. There is no opacity per vertex, per face or per palette entry, and the end of this section says why.

**It is repaired, never a reason to reject.** A reader MUST draw an object whose `opacity` is malformed as fully opaque, and MUST NOT reject the payload for it (§1.9 rule 14). Opacity is a matter of how an object looks, never of what shape it is, and an object drawn opaque is still that object, drawn the way every reader that predates this field draws it anyway. A strict rule would make a reader that knows the field draw less than one that does not: the older reader ignores the field and draws the object, while a strict newer reader would draw nothing. For this field, knowing more must never mean drawing less, so a malformed value means the default, and the default is the value every reader already uses. That is what sets `opacity` apart from fields such as `facecolors` and `spin`, whose malformed values are rejections (§1.9 rules 8c and 10). Those were strict from the day they were added, and a guess at what a broken one meant could draw the object wrongly. `opacity`'s default is exactly the opaque drawing every existing reader already makes, and the field was ruled forgiving from the day it was added. This is the same stance `extent` takes (§1.8), and for the same reason. A publisher MUST NOT write a malformed value; the repair exists for readers.

**The floor.** A value from `1` to `9` is valid and is drawn at `10`. An object drawn at one percent is invisible in practice, and an invisible object in a shared space is not an object so much as a trap: something a camera can be put inside, a selection can land on by accident, or a person can be watched from, with nothing on the screen to say it is there. §1.5 already asks a client to keep every object visible however small it is on screen; the floor makes the same promise however faint the author asked for it to be. Ten percent is faint enough for haze and clear glass and still plainly something. The values below it are not errors, so an author who asked for "as faint as possible" gets the faintest the format allows rather than an opaque object. They record what the author asked for and are not other spellings of `10`, so canonical form leaves them as written; a publisher SHOULD still write `10` or more, so that what is written is what is drawn.

**Canonical form.** A publisher MUST omit `opacity` when it is `100`, as it omits `extent` when it is `8` (§1.2), so an opaque object is written exactly as it was before this field existed and there is still one way to write it.

**A reader that cannot draw translucency MAY draw any object opaque.** That is always a correct drawing of the object, and it is what every reader written before this section does, because a reader ignores a field it does not recognize (§5). §4 says how a reader that can draw it should, and §6 says what translucency does not do: it does not hide anything.

**Placed objects and avatars.** A placed object keeps its own opacity, and its parent's does not reach it (§1.10). A parent at `40` placing a tile drawn opaque draws the tile opaque; an author who wants the tile faint places a faint tile. This is the rule `mode` and `palette` already follow, and it means every object on the screen is drawn at an opacity its own author chose, never at the product of a chain of other people's choices. An avatar ignores `opacity` altogether (§3.3).

**Why it exists.** Water, glass, ice, haze, the ghost of a thing that was there. Until now an object could only be solid, a set of points, or a set of lines. A flooded room built from SNO could have opaque water, which hides the floor of the pool and everything on it, or a lattice of lines in `lines` mode, which shows the floor but reads as a grid laid over water rather than as water. Neither is what the author meant.

**Why one number for the whole object, and not alpha in the colors.** Three other places were considered, and each fails.

1. **A fourth channel in each palette entry**, `[r, g, b, a]`. Every reader written to this document rejects a palette entry that is not three integers (§1.9 rule 8a), so the first object to carry one would be refused by every reader in the world, including readers outside Cyberspace that have never heard of this change. A field the older readers ignore is the only way to add something they can live with, and that is what this is.
2. **`#rrggbbaa` in a palette event's `c` tags** (§1.3b). A reader that finds a value that is not a well-formed `#rrggbb` treats the event as not a palette, so every object naming it would fall back to the built-in colors: wrong colors, silently, which is the worst failure §1.3b allows.
3. **Alpha per vertex or per face**, as a parallel array in the manner of `facecolors`. It works on the wire, but it asks every reader that draws it to sort the triangles of one object against each other every frame: two translucent triangles blend correctly only when drawn back to front, and which is in front changes as the viewer moves. Opacity per object needs only the ordering a renderer already does for whole objects (§4). And the case the field exists for, a sheet of water or a pane of glass, is one object at one opacity. Where an author wants two opacities in one build, they make two objects and place them (§1.10), which is already how one build combines two modes.

**Written as a JSON integer.** A publisher MUST write `opacity` as a JSON integer: digits only, with no fraction and no exponent, so `50` and never `50.0` or `5e1`. A reader whose JSON parser cannot tell `50.0` from `50` (many cannot) MAY read such a value as `50`; a reader whose parser can tell them apart repairs it to `100` like any other malformed value. The two then draw the object differently, but only in how see-through it is and, for an object whose `constrain` is `"opaque"` (§1.12), in whether it holds a walker: no reader rejects it, and nothing about its shape changes.

**Why a percent.** Every number a publisher writes is an integer (§1.2), and this one is read by eye in a payload: `"opacity": 40` says what it means, where a byte `102` or a fraction `0.4` would not, and the fraction would be the only float a publisher writes. One percent is a finer step than anyone can tell apart in a blended surface.

**What it costs.** Thirteen bytes for a two-digit value, `,"opacity":40`, and nothing for an opaque object, which omits it. Appendix A carries an example.

**Versioning.** `opacity` is a field whose absence has a meaning, so its addition does not bump `v` (§5). An older reader ignores it and draws the object opaque.

(Non-normative: `decks/sno-reference.py` implements the table above as `drawn_opacity`, and its self-test carries a repair case for each kind of value in it; there is no rejection case, because nothing in this section rejects. A reader that edits objects should keep fields it does not recognize when it writes an object back, or the first person to open a translucent object in an older editor and publish it again would make it opaque for everyone after them.)

### 1.12 Constraint

`constrain` says whether an object's faces stop a walker. It is one of three words. Two of them, `"all"` and `"opaque"`, name faces that stop a walker; the third, `"off"`, says that the author chose to have none. Absent means none to a reader as well: the object stops nothing, which is how every object behaved before this field existed and how every object without it is read still. What absent means to an authoring tool is different, and is set out under **Absent and `"off"`** below.

| `constrain` | Which of the object's faces stop a walker |
|---|---|
| absent | none |
| `"off"` | none: the author chose no constraint |
| `"all"` | every face, in every mode, at every opacity |
| `"opaque"` | every face while the object is opaque, which is `mode` `solid` with an opacity of `100` (§1.11); none while it can be seen through |
| anything else: `"none"`, `"OFF"`, `"ALL"`, `"Opaque"`, a number, a boolean, an array, an object, null | none, exactly as if it were absent |

**What a walker is.** Some clients move a viewer through a scene a step at a time, the way a person walks: ONOSENDAI's WALK is one, where every press moves the viewer's avatar one step along one axis. A client that walks its viewer SHOULD refuse a step whose straight path would cross a face that stops a walker, or shorten the step so that it ends before the face. A client that never walks a viewer ignores the field. Movement that is not walking is never constrained: a jump to a coordinate, a planned route, or a camera that looks around without moving the avatar all go where they go, which is also what lets a walker that finds itself shut in get out (§6).

**A courtesy, not a rule of the space.** In Cyberspace a move is proved and signed by the one who makes it (`CYBERSPACE_V2.md` §4, §8), and nothing in a chain records what objects stood in the way. A step through a constrained object is a valid step. A reader MUST NOT reject, hide or mark another avatar's movement for passing through one, on the strength of this field alone, and MUST NOT apply the field to anyone's movement but its own viewer's. The field asks a client to hold its own walker the way a wall would; it cannot hold anyone whose client does not, and this document does not try. Walls that hold everyone need every mover to be checked by someone other than the mover, and that is outside this format.

**What crossing means.**

- A walker is a point at the center of its gibson, which is where a client draws its avatar; the avatar's own shape and size are not considered. An object hidden at a coordinate is drawn with its origin at the center of that coordinate's gibson in the same way, so a walker's offset from an object's origin is a whole number of gibsons. An object hidden without a coordinate is drawn at a gibson the reader chooses, and the same holds there.
- In Cyberspace, only objects in the walker's own plane are tested (`CYBERSPACE_V2.md` §2.4): dataspace and ideaspace are not in each other's way.
- A face the step's segment lies in, in the face's own plane, is never crossed, whatever the rules below say: a walker moves along a wall or a floor freely, and a step along a floor that ends on the floor is not held by it.
- Otherwise, a step crosses a face when the straight segment from where the step starts to where it would end meets the triangle. Edges and corners count, so two triangles that share an edge leave no seam to slip through, and a walker cannot squeeze past a wall along its rim.
- A face the walker already stands on, at the very start of the segment, does not hold it, so a walker can always step off a surface it is touching. A step that would end exactly on a face does cross it: a walker never lands on a wall.
- The faces are tested where the object is drawn: after `up` and `spin` (§1.7), through every placement (§1.10), and, where a reader draws only the part of a hidden object that lies inside its bag's region (`CYBERSPACE_V2.md` §7), only that part, so that a walker is held only where the object is drawn.

`mode` does not change which triangles exist. An object in `lines` or `points` mode still has its faces, and `"all"` makes them walls although the reader draws them as edges or dots. That is deliberate: `"all"` is the author saying the object is solid to a walker however it is drawn, and every such object still shows, since its edges or its points are drawn (§1.5). An author who wants a walker held only by what looks solid writes `"opaque"`. An object with no faces has nothing to cross, whatever it says.

**Exact where the lattice is exact.** Positions here are exact rationals (§1.2), and a walker's offset from an object is a whole number of gibsons. A reader SHOULD subtract the object's position from the walker's in integers before anything becomes a float, and SHOULD first set aside, still in integers, every object whose bounds the step's segment misses, so that nothing far away is ever measured in floats. It SHOULD then test what remains in the object's own frame. For an object at a small `unit`, placed with quarter turns and steps of scale, every number in that test is a whole number of ticks or a power of two of modest size, and double precision decides it exactly, touching cases included. At a large `unit` a gibson is a tiny fraction of a tick, and a turn of any other whole degree, or a pose on the Earth (§1.7), brings in irrational values; there a reader decides a touching case with a small tolerance toward crossing, since a wall that leaks is a worse failure than one a hair thicker than drawn.

**It is repaired, never a reason to reject.** A reader MUST read a malformed `constrain` as absent and MUST NOT reject the payload for it (§1.9 rule 15). The field says how a client moves its own viewer, never what shape the object is, and reading a malformed value as absent is the one reading that agrees with every reader written before this section, which ignores the field. It was ruled forgiving from the day it was added, as `opacity` was (§1.11). A publisher MUST NOT write a malformed value. `"off"` is not malformed: it is the one word for nothing, and a publisher MUST NOT write any other word for nothing, such as `"none"` or `"false"`. An object set to `"opaque"` while it is see-through, or to `"all"` while it has no faces, keeps the field: it stops nothing now, and its setting still says what it does once it is opaque or has faces. The three words are lowercase and exact, as `mode`'s are.

**Absent and `"off"`.** A reader treats the two alike, and an authoring tool does not.

- **A reader** MUST read an absent `constrain`, and `"off"`, as stopping nothing. Every object keeps the meaning it was published with, and every reader written to this section before `"off"` was named on 2026-10-23 already reads `"off"` as nothing, because it was a malformed value then. Nothing a reader does changes.
- **An authoring tool**, for this section, is a client that writes an object's payload: one that makes an object, or opens one and writes its payload again, whether it signs the result or writes it unsigned, and whether as a public object (§3.1), an item in a bag, signed or unsigned (§3.2), a sealed object (§3.4) or a copy (§3.5). A modeling workshop is one; so is a builder that edits or moves a placed object, which writes that placement's payload again (an inline item as a new item, a sealed object encrypted again), an importer, a kit that publishes its pieces, and an agent or a script that publishes objects. Such a tool treats an absent field as not chosen. An authoring tool SHOULD write `"opaque"` for every object whose setting has not been chosen, and SHOULD show `"opaque"` as the object's setting before it writes the payload, so that what its user sees is what is published, and its user can choose otherwise. A tool with no screen, such as an agent's or a batch publisher's, meets this by reporting the setting it will write, or has written, wherever it reports what it publishes. This covers:
  - a new object;
  - an object published without the field, opened and written again, including one that is moved;
  - an object made from a payload without the field, such as a kit piece, an imported file, or a copy of another author's object placed inline (§3.5), whose new payload is the copier's to set;
  - an object that the tool writes into another object's `objects` table (§1.10). The payload in the table is one that the tool writes, so the default applies to it.
- **What is carried, not written.** The default never reaches a payload the tool does not write. An item, signed or unsigned, carried exactly as it was found, such as an item kept as it was hidden (§3.2), keeps its payload exactly as found, field or no field, so that its id keeps meaning what it meant. When a bag's author writes the bag again to add or remove an item, every item it keeps is carried as found, not written: the default reaches only the items that bag write makes new. The same holds for an object in an `objects` table (§1.10) that the tool writes back exactly as it found it, because nobody changed it. That object is carried, not written. An object placed by reference (§1.10) is drawn from its author's own event, and only that author can sign it again, so a tool that writes the reference writes nothing of the object's, and the default does not reach it.
- **A malformed value** is not a choice either. An authoring tool SHOULD treat it as not chosen, and so show and write `"opaque"` in its place.
- **A choice is one of the three words, and it is kept.** An authoring tool MUST write the word its user chose, MUST NOT write any value but `"all"`, `"opaque"` or `"off"` whatever its user typed, and MUST keep one of those three words exactly as it found it when its user has not changed the setting. It MUST NOT write `"off"` for an object whose setting nobody chose, since `"off"` is the record of that choice. A user who wants no constraint therefore gets `"off"`, never an absent field, because the next tool to open an absent field would write `"opaque"` in its place.
- **Avatars.** Every reader ignores the field in an avatar's payload (§3.3), so none of the bullets above applies there: a tool that writes an avatar need not write the field, MAY keep or drop one of the three words it finds, and drops any other value, since a publisher writes no malformed value anywhere.

**Objects published without the field.** Before `"off"` was named, absent was the one way to write "no constraint": the first version of this section told an author who wanted none to omit the field, and clients that supported the field while it was in use omitted it for none. An object published in that window without the field may therefore be a deliberate none, and nothing in it says which. A tool cannot tell the two apart, and that is why it shows `"opaque"` before it writes the payload rather than writing it unseen: whoever writes the object again sees the setting and decides.

**Why `"opaque"`.** A wall a walker can see through is a strange thing to be stopped by. An author building a flooded room wants the stone to hold a walker and the water in the pool to let one wade in, and wants a pane they later make translucent to open with the same edit. `"opaque"` is a wall exactly while the object looks like one. Whether an object can be seen through is read from the payload and never from how a particular reader draws it: an object with an opacity below `100`, or in `lines` or `points` mode, can be seen through for this test even in a reader that draws translucency opaque (§1.11), so every reader that reads opacity the same way (§1.11) holds a walker at the same objects. It is the same line §6 draws for enclosure, for the same reason.

**Why the default is `"opaque"`.** Most objects are built to be solid: walls, floors, furniture, a house. A walker held only by what looks solid meets the world the way it looks, and a see-through object, a pane, a pool of water, a wireframe, still lets it through, as the paragraph above sets out. So a new object holds a walker unless whoever writes it says otherwise. The default could not be made by changing what absent means to a reader: every object already published says nothing, and would grow walls overnight, in places that nobody chose. So the default lives in the authoring tools, where it applies only to what is written from now on, and only by someone who sees the setting and could choose otherwise; and `"off"` exists so that a choice of no walls survives being opened again. Walls by default also make it likelier that a walker is shut in, which is why a client that constrains its walker keeps it a way out (§6).

**Placed objects and avatars.** A placed object keeps its own `constrain`, and its parent's does not reach it (§1.10). A room set to `"all"` that places a pool of water set to `"off"` lets a walker into the water; a parent set to `"off"` that places walls set to `"all"` holds a walker at those walls; an object published without the field and placed in a room set to `"opaque"` stops nothing, because the room's setting does not reach it; and an object that is nothing but placements (§1.9 rule 13) has no faces of its own, so its own setting stops nothing. A placeholder drawn for a part that is missing (§1.10) stops nothing either: it stands for an object the reader does not have. This is the rule `mode` and `opacity` already follow, and it means every face that holds a walker holds it by its own author's choice. An avatar ignores `constrain` altogether (§3.3).

**Why it belongs to the object.** The author knows what an object is for: a wall, a floor, a curtain, a column, a cloud. A setting kept by each viewer would leave every visitor to a maze to find and switch on its walls one by one, and a setting kept by whoever places an object would have to travel beside the reference rather than in it. Someone who places another author's object by reference takes its setting with it, as they take its mode; someone who wants it otherwise places a copy (§3.5).

**One placement, one setting.** Where an object is placed decides whose setting a walker meets, and the format needs nothing more for that. An object hidden inline (§3.2) carries its own payload: the payload in the bag is that placement's own, so a client that changes one placement's setting writes it into that payload, and every other placement, and the object it was taken from, stays as it was. An object hidden as its own sealed event (§3.4) is tied to the region it stands in, and ONOSENDAI and cyberspace-mcp write a fresh one for every placement (§3.4), so in practice it too belongs to one placement; this is a convention, not a rule, and a publisher that references one sealed event from two placements in a region shares its setting between them, exactly as a reference to a public object does. Only a reference, to a public object or to one sealed event placed twice, shares its setting with another placement; an author who wants one placement to differ places a copy there instead.

**Why one setting for the whole object, and not one per face.** A doorway is an opening in a wall, not a face that lets walkers through, so a room needs no passable faces to have a way in. Where an author wants a passable surface inside a solid build, a curtain or a waterfall, they make it its own object and place it (§1.10), which is already how one build combines two modes or two opacities. A per-face list would also be at the mercy of every older editor: one that does not know the list keeps it as written while it adds, removes or reorders faces (the note that closes §1.11), and the list would then name the wrong faces.

**What it costs.** Eighteen bytes for `,"constrain":"all"` or `,"constrain":"off"`, twenty-one for `,"constrain":"opaque"`, and nothing for an object without the field, such as one published before authoring tools wrote the default. Since an authoring tool writes `"opaque"` by default, a new object costs twenty-one bytes more than it did before this section. Appendix A carries an example.

**Versioning.** `constrain` is a field whose absence has a meaning, so its addition does not bump `v` (§5). An older reader ignores it, and its walkers, if it has any, walk through. Naming `"off"` does not bump `v` either: a reader that predates it reads it as nothing, which is what it means.

(Non-normative: `decks/sno-reference.py` implements the table above as `walk_constraint` and `stops_walker`, and the authoring rule as `authored_constraint`, and its self-test carries a repair case for each kind of value in the table and an authoring case for each; there is no rejection case, because nothing in this section rejects. As with `opacity`, a reader that edits objects should keep fields it does not recognize when it writes an object back, or the first person to open a walled room in an older editor and publish it again would take its walls down for everyone after them.)

## 2. Model space (normative)

An object is built in a right-handed frame with Y up, which is the glTF and three.js convention:

| Axis | Direction |
|---|---|
| `+X` | right |
| `+Y` | up |
| `+Z` | toward the viewer |

This is stated first and in normative language because being silent about it is the most common way a small format fails. STL never specified color and two vendors filled the hole incompatibly. PLY never registered its property names. glTF left "forward" undefined for years while being an ISO standard. Niantic's SPZ shipped in 2024 without saying which axis is up, and someone had to open an issue to ask.

**Version 1 and version 2 differ by one sign and one color encoding, and by nothing else.**

| `v` | Z points | A reader |
|---|---|---|
| `1` | away from the viewer | MUST negate every Z on read, which renders the object exactly as its author built it. Its colors are literal triples (§1.3) |
| `2` | toward the viewer | reads the positions as written. Its colors are palette indices (§1.3) |

Version 1 is the convention this format had while it lived only inside Cyberspace, where `+Z` is the direction of the black sun. Every object published before this document exists under it, and negating Z on read is what keeps those objects looking as they always have. A publisher MUST write `v: 2`; `v: 1` is for reading what already exists.

The flip was made deliberately and once. Carrying Cyberspace's own axis convention into a format meant for anyone would have charged every exporter and importer, forever, for a mirroring that only Cyberspace needs. Cyberspace applies it where it belongs, in the one renderer that places an object into its world, rather than in every tool that ever writes one.

A mirror turns every front into a back (§1.4). A reader or tool that carries an object through one, whether converting into a left-handed frame or placing an object into a world drawn with an axis negated, MUST reverse the order of every face in the same step, or read the front in the frame of §2 before mirroring. A rotation keeps every front a front. The version 1 negation needs no reversal: §1.4 reads the front after it, and version 1 winding was never authored.

A Blender exporter therefore maps Blender `(x, y, z)` to SNO `(x, z, -y)`: Blender is Z-up and right-handed, SNO is Y-up and right-handed, and the negation is what keeps the frame right-handed rather than mirroring it. §7 returns to this.

---

## 3. Carrying an object in a nostr event (normative)

### 3.1 A standalone object: `kind 33331`

An object stands alone as a `kind 33331` event whose `content` is the payload of §1, serialized as JSON.

| Tag | Required | Meaning |
|---|---|---|
| `d` | yes | the object's identifier, chosen by its author and stable across edits. The workshop's own id for the object serves |
| `name` | no | `["name", "<name>"]`, duplicating the payload's name so a relay query can filter on it without parsing the content |
| `alt` | no | a description for clients that cannot render an object (NIP-31) |

`33331` falls in `30000..39999`, which NIP-01 defines as **addressable**: relays keep the newest event per `(pubkey, kind, d)`, so an author edits an object in place by republishing it under the same `d`. That is the right class for a thing someone iterates on in a modeling tool, which is what an object is.

It costs something, and the cost is worth stating plainly rather than discovering later. Reactions (NIP-25), zaps (NIP-57) and comments (NIP-22) reference an event id, and an address resolves to whatever its author last published, so a payment made against an object can end up pointing at content that changed after it. An application that needs an object to be immutable, because it was paid for or because it was hidden somewhere and must stay as it was found, uses the bag item of §3.2, whose kind is regular.

**Exactly one kind, never two.** NIP-71 shipped both a regular and an addressable video kind and it is widely regarded as a mistake. There is no regular twin of `33331` and there should never be one.

A client that receives a `kind 33331` event whose content fails §1.9 MUST NOT render it and SHOULD say why rather than failing silently.

### 3.2 Inside a bag

An object hidden at a place is an entry in a `kind 33330` bag, exactly as `CYBERSPACE_V2.md` §7.6 describes entries. It is carried in one of two ways:

- **Inline:** an item, a `kind 3330` event, signed or unsigned, with the payload of §1 in its `content`. It MAY carry a `C` tag, which then MUST lie inside the bag's region. This is how every object was carried before 2026-09-24 and it stays the right way for small ones. Its payload MAY carry the objects it places, in its `objects` table (§1.10). Those carried objects are then sealed with the bag, together with the rest of the item.
- **By reference:** a reference entry (`CYBERSPACE_V2.md` §7.6) naming the object's own `kind 33331` event (§3.4): `["a", "33331:<pubkey>:<d>", "<relay hint>", "<coord_hex>"]`, which follows the object as its author edits it. `33331` is addressable, so an `e` reference to it would stop resolving as soon as its author replaced it (`CYBERSPACE_V2.md` §7.6); a reference to an object uses `a`. No `kind 3330` event is involved. A `pubkey` in the address that differs from the bag's author is not a reason to reject: placing another author's object is a placement. A reader MUST fetch the referenced event and read the object from it as §3.4 says; a reference that cannot be fetched is a missing entry, dropped like an item that fails to verify, and a client SHOULD say so rather than say nothing was found.

A publisher SHOULD carry a large object by reference: a bag is one event shared by everything hidden at a place, and by reference it stays small whatever the object costs. What counts as large is the publisher's judgment against the relays it publishes to (§1.8); the format draws no line. A publisher MAY carry a small object by reference too, when it wants the object to have an event of its own. (Non-normative: ONOSENDAI and cyberspace-mcp carry an object by reference when its serialized payload is over 16,384 bytes, roughly a few hundred vertices, and inline otherwise.)

`3330` is regular, and deliberately so. An item in a bag is a thing someone hid at a place and someone else found there; it must be exactly what it was when it was found, and its id must keep meaning what it meant. The same payload therefore travels under two kinds according to what is being done with it: `33331` for an object its author is still working on, `3330` for one that has been put somewhere. That is two containers for one format, not two ways of writing the format. A reference follows a `kind 33331` object as its author edits it; an object that must stay exactly as it was found is carried inline as a `3330` item, the one form no later edit can reach.

### 3.3 As an avatar

An avatar event (`kind 11333`, `CYBERSPACE_V2.md` §8.10) carries an SNO payload in its `content`, or empty content for the default avatar. The work an avatar owes is computed from `unit`, `vertices`, `ticks` and `faces` as that section specifies. Nothing in this DECK changes that computation; this document only defines the fields it reads.

**An avatar is drawn opaque.** A reader MUST ignore `opacity` (§1.11) in an avatar's payload, and in every object the avatar places (§1.10), and draw the avatar fully opaque. The work an avatar owes prices its size and its detail, not its visibility, so a translucent avatar would buy a way to move unseen through a shared space for nothing, and an avatar is how one person knows another is present. `opacity` is not one of the fields the work is computed from, so the work an avatar owes is unchanged by it.

**An avatar never stops a walker.** A reader MUST ignore `constrain` (§1.12) in an avatar's payload, and in every object the avatar places (§1.10). An avatar is a person, not a wall: one standing in a doorway would shut it for every walker whose client honors the field, and one that moves would carry a wall about with it, through which nobody could follow. `constrain` is not one of the fields the work is computed from, so the work an avatar owes is unchanged by it.

### 3.4 A hidden object as its own event

**A hidden object carried by reference is a `kind 33331` event whose payload is encrypted to the place.** It is the standalone container of §3.1 with two differences, and it follows the convention for partially encrypted events that Fanfares' NIP FF-1 sets out, so any client that understands that convention understands this event without knowing what Cyberspace is.

| Field | Content |
|---|---|
| `content` | a **preview** for clients that cannot open it. It SHOULD say that the object is encrypted to a location in cyberspace and name a client that can find it, for example: `This object is hidden at a place in cyberspace. Find it with ONOSENDAI: https://onosendai.tech` |
| `["encrypted", "aes-256-gcm", "<ciphertext>", "cyberspace:region"]` | exactly one. The ciphertext is the payload of §1, serialized as JSON, encrypted with the bag's region key (`CYBERSPACE_V2.md` §7.2) under the bag's own cipher and byte layout (`CYBERSPACE_V2.md` §7.6: AES-256-GCM, 12-byte nonce, 16-byte tag, `nonce || ciphertext || tag`, base64). The fourth element stands where FF-1 puts a key service URL: `cyberspace:region` is FF-1's registered key derivation for a key computed from a place rather than served, and a reader MUST NOT make a network request for it |
| `d` | the object's identifier, chosen by its author and stable across edits, as in §3.1. It MUST NOT be derived from the location. (Non-normative: ONOSENDAI and cyberspace-mcp write a fresh random `d` for every placement, so two places holding the same object are two unrelated events and cannot be linked by their tags.) |
| `name`, `alt` | MAY be present, as in §3.1, and MUST NOT reveal the location |

**The event MUST carry nothing that says where the object is.** No `C`, no height tag (`H`, or the `h` of `CYBERSPACE_V2.md` §8.6), no hint and no sector tag: those belong to the bag, which is what the region key protects. The event is a locked box in plain view; the bag is the note that says where the box stands and is readable only there.

**One key opens the place and everything referenced from it.** The object is encrypted with the same region key that opens the bag, so a reader that has opened the bag opens every object it references with the key in hand, and a reader that has not can open neither. The cost is that the object is tied to the region: moving it to another place means re-encrypting it. A per-object key carried inside the bag would lift that and let one event be referenced from several places; §8 records it as open.

**It may carry what it places.** The payload MAY carry the objects it places, in its `objects` table (§1.10). The carried objects are encrypted together with the payload, under the same region key. The table counts toward the size of this event, not toward the size of the bag.

**No ref tags in the clear.** A hidden object MUST NOT carry `a` or `e` tags that name the objects it places or carries, such as `["a", "33331:<pubkey hex>:<d>"]`. The event's tags are not encrypted. Such tags would reveal the addresses that its encrypted payload and its objects table keep private. A reader takes the placements from the decrypted payload in any case (§1.10).

**Validation is the same.** A reader that decrypts a referenced object and finds it fails §1.9 drops the entry, exactly as it drops an inline item that fails, and SHOULD say that the object was found and refused rather than that nothing was found.

**Why a partially encrypted `kind 33331` and not a wrapper kind.** The object keeps its kind, so a query for `kind 33331` returns hidden objects too, as previews; a client that knows nothing of this DECK shows the preview, which is the sentence above pointing at a client that can find the object; and the shape is already implemented in clients that follow FF-1. A wrapper kind (an application-specific event carrying the ciphertext) would hide the object from every one of those.


### 3.5 Crediting a copy

**A copy of someone else's object names the object it was copied from.** Two things make a copy. A placement that carries another author's payload inline (§3.2) instead of referencing it, so that what was built stays exactly as built (the shape stays as built; its `constrain` is the copier's to set, §1.12). And a remix: a copy taken into a workshop, edited, and published under the editor's own key as a new `kind 33331` with a `d` of its own. Either way the original's author made the shape, and the copy says so.

**Every copy and every remix carries the quote tag of NIP-18 naming the original's address, except as below:**

```
["q", "33331:<original author pubkey>:<original d>", "<relay hint>"]
```

The relay hint is a relay the original was seen on, and MAY be empty. A copy carries exactly one `q` tag for the object it was copied from; a copy of a copy names the object it was copied from, not the first one in the line, because that is the one its author saw.

**A public remix also carries a `p` tag naming the original's author.**

```
["p", "<original author pubkey>"]
```

That is what makes the author's clients tell them their object was remixed. "Public" means published as its own `kind 33331` for anyone to read (§3.1). A copy sealed inside a bag (§3.2), an inline item or anything else only the region key opens, MUST NOT carry the `p`: a notification would point the author at a hidden placement, and a hidden placement is only for whoever finds it. The `q` inside the seal is as private as the item it credits.

**A reader MAY show the credit and SHOULD NOT treat it as anything else.** A `q` tag says where a shape came from. It places nothing, it is not fetched to draw the object, and an object whose `q` names something that no longer exists is drawn exactly the same.

**Why `q` and not `a` or `e`.** On a `kind 33331`, an `a` or `e` tag already means "this object places that one" (§1.10): a publisher writes each placement there so a relay can answer "what places this object". A credit written the same way would read as a placement, and a query for everything that places a tile would return everything copied from it. `q` is the standard tag for "this is based on that", relays index it like any single-letter tag, so "what copies my object" is one query (`#q`), and it means nothing else on this kind.

**Why the address and not the event id.** The credit is for the object, which its author may go on editing, not for the version that happened to be copied. The copy's own payload already holds that version.

**A large copy carried as its own hidden event carries no credit in plain view.** A copy too large to carry inline goes out as a hidden object of its own (§3.4), and every tag on that event is public. A `q` there would tell anyone which object is hidden somewhere, which is as much a spoiler as a hint, so it is left off. A rule for carrying the credit inside the seal is open (§8).

---

## 4. Rendering (normative where it says MUST)

A client MUST NOT render an object that fails §1.9.

A client SHOULD render all three modes; a client that renders only `points` still shows every object, which is why the vertex list is the one required part of the format.

**Shading is decided here rather than left to taste**, because per-vertex color forces the question and implementers who are not told will answer it differently, which makes the same object look like two objects.

The default reading of an SNO is **unlit**: a face takes its color by interpolating its three vertices, and no light in the scene changes it. This is not an absence of a material, it is a named one: it is what glTF ratified as `KHR_materials_unlit` with a `COLOR_0` attribute, for exactly this kind of content.

A face that carries its own color (§1.4a) is filled with it flatly, and there is nothing to interpolate or average: the seam between two such faces is exact, which is the whole purpose of the field.

A client MAY light an object instead, and many will, because a lit object sits better in a lit scene. A client that lights an object MUST derive its normals per face, flat, from the triangle's own vertices, pointing out of the face's front as its winding gives it (§1.4); the back is lit as the other side of the same face. A client MUST NOT synthesize smooth normals by averaging across shared vertices: an object with no normals is faceted, an author who wanted a smooth surface has no way to say so today (§7.2), and a reader that smooths one anyway is deciding for them.

A client MUST NOT invent geometry: no subdivision, no smoothing that moves a vertex, no hole filling. The lattice is exact and a renderer that moves a vertex has broken the one guarantee the format makes.

**Translucency** (§1.11). A client SHOULD draw an object whose opacity is below `100` blended over what is behind it at that opacity; a client that cannot draw translucency MAY draw it opaque (§1.11). The default reading stays unlit: opacity changes how much of a face is drawn, not what color it is, and a client that lights objects lights a translucent face exactly as it lights an opaque one.

What follows is advice rather than requirement. It is how renderers in common use draw translucency correctly, and it is written down so an implementer does not have to find each failure on their own.

- A translucent object does not write depth, so what lies behind it and is drawn after it still shows through.
- It is drawn after every opaque object, so nothing opaque behind it is painted over it. Translucent objects are ordered back to front by their distance from the viewer. The triangles inside one object need no sorting: an object has one opacity, and layers of one color at one opacity blend to the same result in any order. An object whose colors vary and which overlaps itself may show its layers in a different order as the viewer moves; that is accepted as the price of not sorting triangles.
- Both sides of every face are still drawn (§1.4), and one draw of both sides together is enough. (Some engines draw a translucent two-sided surface as two passes by default, the backs and then the fronts. For this content the second pass buys almost nothing, and in at least one engine it cost an allocation for every object on every frame, which a scene of a few hundred objects turned into gigabytes a minute.)
- A client that runs a post-processing pass keyed on what was drawn (a glow, an outline) should check that a translucent surface does not change how the things behind it are treated, only how they look.

A client MUST perform welding, deduplication and any equality test on the integer lattice rather than on floats derived from it (§1.2).

---

## 5. Versioning and extension (normative)

`v` is `1` or `2`, and a reader MUST support both and reject anything else. A version bump means the meaning of an existing field has changed, which is exactly what happened between the two: `v: 2` reads its Z as written and `v: 1` has it negated (§2). Nothing else differs, and nothing else should ever differ by so little: two versions are a cost, and this one buys a format that every other tool can read without a special case.

A reader MUST ignore fields it does not recognize rather than rejecting them. This is what allows an optional field to be added without a version bump, and it is how `extent`, `ticks`, `up`, `spin`, `palette`, `facecolors`, `refs`, `parts`, `opacity`, `constrain` and `objects` were each added to a format already in use: an older reader sees an object with whole-unit positions on a grid of 8, unoriented, in the built-in colors, every face interpolating its corners, placing nothing, fully opaque, stopping no walker, carrying no other objects, and draws something correct rather than nothing.

An extension that changes how an existing field is interpreted MUST bump `v`. An extension that adds a field whose absence has a well-defined meaning MUST NOT.

**`colors` changed meaning inside `v: 2`, once, and that will not happen again.** On 2026-09-16 `colors` went from three numbers per vertex to one palette index (§1.3), which by the rule above should have made a `v: 3`. It did not, and the reason is stated here rather than hidden. Three objects carrying this format existed in the world at that moment, counted by querying five relays for `kind 33331`, and all three were published by the authors of this document. An addressable event is replaced in place by its author, so all three can be reissued by the people who wrote them. The rule protects readers, and there were none but us. A third encoding would have cost every implementer forever to spare two people an afternoon.

The rule applies from that date without exception, because from that date the format has readers who are not its authors.

Anyone implementing this deck should treat `v: 2` as meaning the palette-indexed form. A `v: 2` payload whose `colors` are triples predates this. A reader MAY reject one, and a reader that would rather be generous MAY read the triples literally the way §1.3 reads a `v: 1` payload's; neither is required, because the three that exist belong to the authors and a bag's encrypted shards are readable only by the identity that hid them, whose client is updated in the same release.

**The palette is the extension point that should keep `v` at 2 from now on.** A new set of colors is a new name in the `palette` field, or an `nevent` to one published as its own event (§1.3a, §1.3b), and neither needs a version bump. An older reader meeting a name it does not know rejects rather than drawing wrongly; one meeting a reference it cannot resolve draws in the built-in, which §1.3b makes explicit. That is the shape every future color change should take, and it is why the color space is a field rather than a version.

---

## 6. Security considerations

**Resource exhaustion.** Since 2026-09-24 the format sets no ceiling on vertices or faces (§1.8). The defense has three parts. The relay's event size limit bounds every payload before a reader sees it. The nesting bound of §1.10 bounds how much a reader fetches. The bounds that a reader MAY set on how many placements it draws and how many distinct objects it reads (§1.10) bound how much it draws and holds. A reader MUST size its buffers by counting the arrays it was actually given, never by trusting a length field, and this format has no length fields for exactly that reason. A reader that draws objects from strangers MAY refuse to draw one larger than it can hold, as it would refuse an image too large to decode; that is a client's limit, not a rejection under §1.9.

**Crashes from bad indices.** §1.4 and §1.9 exist because a face index past the end of the vertex list is undefined behavior inside most graphics libraries, surfacing far from the event that caused it. Validate before rendering, always.

**Objects are not attribution.** A `kind 3330` event inside a bag may be unsigned (`CYBERSPACE_V2.md` §7), in which case its `pubkey` is a claim and a client MUST NOT present it as verified authorship.

**Screen real estate is a resource.** An object drawn in a shared space is seen by people who did not ask for it. Cyberspace's answer for avatars is to price size and detail in proof of work (`CYBERSPACE_V2.md` §8.10). Any application that renders objects from strangers without a cost or a filter should expect to be flooded, and the format cannot solve that for it.

**Translucency does not hide** (non-normative). An object with an opacity below `100` does not occlude what is behind it, at any opacity: in a test render at `70`, an object hidden beneath translucent water showed as plainly as if the water were not there, only tinted. The floor of §1.11 does not change that, and no opacity short of `100` hides anything. The same is true of an object drawn in `points` or `lines` mode, which never hid what was behind it. An application that relies on enclosure to keep something out of sight, such as a maze whose rooms are sealed so that what is in one cannot be seen from another, or a vault, has to treat every such object as enclosing nothing, whether or not that application's own reader draws translucency, since other readers will, and should check its enclosure against the opaque `solid` objects alone. Each placed object is judged by its own opacity and its own mode, not its parent's (§1.10): a translucent pane placed inside an opaque frame encloses nothing, and an opaque wall placed by a translucent parent still does.

**A constraint is not a wall** (non-normative). A walker held by `constrain` (§1.12) is held by its own client and by nothing else. A visitor whose client ignores the field, or who simply jumps, is through it, so a constrained object protects nothing: a vault whose walls are set to `"all"` is exactly as open to a determined visitor as one without, and what keeps its contents out of sight is enclosure, above, and what keeps them unread is encryption (§3.4). The field is a way to make a space feel built, not a way to keep anyone out.

**A walker can be shut in.** An object can be hidden around a place where someone stands, and an object's setting can change while a walker is inside it. A walker inside a closed constrained object can then walk nowhere, since every way out crosses a face. A client that constrains its walker SHOULD therefore always leave it a way out that is not walking: a jump, a planned route, or a way to stop honoring the field for itself. ONOSENDAI's way out is HOP, its jump to a chosen coordinate, which no constraint touches. Because anyone may hide an object anywhere, a client MAY also let its viewer choose whose objects it honors the field on, as it would choose whose objects it draws.

**No code, no fetches.** An SNO payload is data. It names no URL, embeds no script, and requires no network access to render. A reader that keeps it that way inherits none of the attack surface that formats with external references carry.

---

## 7. What SNO leaves out, and why (non-normative)

Every omission here is deliberate, and each one has a reader who will miss it. This section exists so that a person deciding whether to implement SNO knows what they are not getting, and so that a future extension has somewhere to start.

### 7.1 The conversions an exporter must perform

A tool that writes SNO from a modeling package performs four conversions, and each loses something. An exporter author should know all four before starting.

| Conversion | What is lost |
|---|---|
| **Triangulation.** SNO has only triangles; modeling packages work in quads and n-gons. | The authored topology. A round trip returns triangles, so the model is no longer editable the way it was built. |
| **Axis change.** Blender is Z-up and right-handed; SNO is Y-up and right-handed. The map is Blender `(x, y, z)` to SNO `(x, z, -y)`. | Nothing, if the negation is not forgotten. Dropping it turns the map into a reflection and publishes every object mirrored, which is invisible on a symmetric object and obvious on everything else, and turns every face inside out (§1.4), which is obvious on everything. Both frames are right-handed, so no mirroring is required or wanted (§2). |
| **Quantization to the lattice.** Float positions become integers on a 1/120 lattice. | Real precision. See below. |
| **Decimation, if the exporter chooses it.** | The format sets no ceiling (§1.8); an exporter decimates to what its relays take and its readers draw well. When it does, this is the one loss that changes the art rather than the numbers. |

**The precision budget, stated plainly, and it is better than it looks.** One unit is 120 ticks, which is log2(120) = 6.91 bits. A grid at the maximum extent of 64 is 15,360 ticks across, about 13.9 bits of resolution per axis; at the default extent of 8 it is about 10.9 bits.

The instinct is to call that low precision. It is not. Draco's encoder defaults to 11 bits for positions and 14 is the common production setting; gltfpack also defaults to 14. SNO's 13.9 bits sits directly on top of the number the rest of the industry ships. SNO is not a low-precision format. It is a **fixed-window** format at industry-standard precision, and what it gives up is dynamic range rather than accuracy, which is exactly what the `unit` exponent exists to recover.

The lattice also buys something the float formats cannot have at any bit depth: exactness. Two objects authored to share an edge share it forever, on every implementation, and welding, deduplication and hashing are integer tuple comparisons rather than an epsilon that is always wrong somewhere.

**What things cost, for a sense of scale.** The budget is the relay's (§1.8), and it is not abstract:

| Object | Vertices | Triangles | Event, roughly |
|---|---|---|---|
| a cube | 8 | 12 | under 1 KB |
| a UV sphere at 32 by 16 segments | 482 | 960 | about 18 KB |
| one subdivision more | thousands | thousands | about 100 KB: the world's relay takes it, a stock relay does not |
| a scanned or sculpted asset | 10^4 to 10^7 | | megabytes; no relay in use takes it |

A few hundred vertices is one recognizable object at low poly; a few thousand is a detailed one. An exporter should show a live estimate of the event's size while modeling rather than let a relay discover it at publish.

### 7.2 What is genuinely absent, and what each would cost

None of these needs a version bump, because each is an optional field whose absence already has a defined meaning (§5).

| Missing | Why it hurts | Cheapest fix | Cost |
|---|---|---|---|
| **Smooth shading** | With no normals every surface is faceted, so a sphere reads as a golf ball | one object-wide boolean telling the renderer to average face normals at shared vertices | one field, no per-vertex data |
| ~~Per-face color~~ | **Added in §1.4a**, and made affordable by §1.3's palette index, which took a color from 21 bytes to 4. It was the one absence that made the format's own best style its most expensive | | |
| **Emission** | The one thing a glowing object needs, and Cyberspace is made of glowing objects | an optional material block with an emissive flag and a strength | one small object |
| **Roughness, metalness** | The sliders every modeler reaches for after base color | two numbers in the same block | included above |
| ~~Alpha~~ | **Added in §1.11** as one opacity for the whole object, a percent, which every older reader ignores and draws opaque. Alpha inside the palette was the obvious place and the one place every existing reader would have rejected | | |

Of these, smooth shading and per-face color are the two that change what is possible rather than what is pretty, and per-face color is the only one that makes the budget go further rather than less far.

One apparent gap is not one. SNO has per-vertex color and no material, which is precisely the shading model glTF ratified as `KHR_materials_unlit` used with a `COLOR_0` attribute: do not light this, take the color from the vertices. That model exists for mobile, photogrammetry and stylized art, and it is named, specified and widely implemented. **SNO is `KHR_materials_unlit` with `COLOR_0`** is the one-sentence bridge to anyone who thinks in glTF.

### 7.3 What is out of scope

| Missing | Why it does not belong |
|---|---|
| **UVs and textures** | A texture is kilobytes to megabytes, so it must live outside the event as a URL or a hash. That ends the property that an SNO renders with no network access and no external attack surface, which is most of what makes it simple. |
| **Hierarchy and transforms** | Since 2026-09-24 these are `refs` and `parts` (§1.10): an object places others, and a scene is an object whose own geometry may be empty. What stays out is a scene graph richer than placement: constraints, parenting by name, per-instance overrides. |
| **Animation, armatures, shape keys** | Each needs a time model and per-frame or per-bone data that dwarfs the geometry. |
| **Level of detail** | Instancing is §1.10. Level of detail is not: one object is one mesh, and a reader that needs less draws less. |

### 7.4 What SNO has that the large formats do not

1. **Exact positions.** Integer lattice coordinates mean two objects authored to meet actually meet, on every implementation, forever. Float formats only approximately do, and the error depends on the order the exporter wrote the file in.
2. **It is the event.** No file to fetch, no hash to resolve, no second protocol, no host to go down. A relay that has the note has the object.
3. **No parser dependency.** `JSON.parse` and thirty lines of rendering, against a specification of a few pages.
4. **Readable and diffable.** An object can be reviewed in a pull request, hand-edited, and generated by a shell script.
5. **Per-vertex color is first class.** With per-face color it is the only coloring mechanism, so every reader supports both, where in the large formats vertex color is an option that half the pipeline ignores. Indexing it through a palette is what PLY does with `uchar` channels and what every indexed image format has always done, and it is why a color here costs four bytes rather than twenty-one.

---

## 8. Open questions

1. **A base unit outside Cyberspace.** `unit` is an exponent over a base the application defines, which is meaningless to a client with no such base. An optional field giving meters per model unit would make an object's real size portable, at the cost of a field that Cyberspace itself would never write.
2. **Whether a reader's limit is a relay bound or a client bound.** *Settled 2026-09-24: neither. The format sets no limit (§1.8); the relay bounds the event as it does every kind, and a client that cannot draw an object is a client's problem to solve as it solves it for a long article or a large image. Kept for the record; the earlier text follows.* This was once the question of whether 512 and 1024 were derived from anything; §1.8 now measures what fits, and at 32 bytes a vertex about 832 vertices with a color on every face would still clear a 56 KB budget. So the numbers are a deliberate reserve rather than a ceiling the event size forces, and the paragraph there says why the headroom was spent on face colors instead. What is not settled is which bound should set them. The size a relay will accept and the size a client can hold and draw are different limits that happen to be the same number today, and only the first is measured.
3. **There is no hard bound on how far a vertex may lie from the origin.** §1.8 puts the 64-unit bound on publishers and lets readers repair instead of reject, which is what ONOSENDAI does today: it grows the extent to fit, without a ceiling. That is safe for a client rendering its own author's work and unsafe as a general rule, since a payload of 512 vertices at 2^50 units is valid under this text and will produce a grid no renderer wants. Making the bound a reader obligation is a one-line change and would make the current client non-conformant until it is updated, which is why it is a question rather than a rule.
4. **A per-object key for a hidden object carried by reference.** §3.4 encrypts the object with the region key, which ties it to the place. A key of its own, carried inside the bag beside the reference, would let one large object be referenced from several places and moved without re-encryption, at the cost of a second key to lose.
5. **Whether `parts` should also allow a mirror.** Eight integers place and turn and scale; a negative scale step halves, it does not mirror. A left glove from a right glove needs one more flag or a second object. Left out until someone needs it.
6. **The rotation order.** §1.10 fixes X then Y then Z about the parent's axes. It is a convention, not a derivation; if a modeling tool in common use disagrees, the cost of matching it is one sentence now and every published object later.
7. **Crediting a large copy privately.** §3.5 leaves the credit off a copy carried as its own hidden event (§3.4), because that event's tags are public. Carrying it inside the seal would need either a field in the payload, which every reader would then have to ignore, or a second encrypted tag on the event. Neither is decided. A copy of another author's object carried in an `objects` table (§1.10) has the same problem in a different place. The copy has no event of its own that could carry a `q` tag. The event that carries the table is the parent's event, and its tags are public whenever the parent is public.
8. **A build too large to carry its objects.** An `objects` table counts toward the size of the parent's event (§1.10). A build whose carried objects together exceed what a relay accepts therefore cannot carry them. Two alternatives were weighed against the table and kept for later:
   - Seal each object as a hidden object of its own (§3.4), with the bag's region key and under a fresh `d`, and have the parent's `refs` name those events. This removes the size ceiling. Its cost is that it publishes one event per object per placement, and the number and timing of those events tie them to the bag.
   - Give each object a key of its own (question 4). This would let finders follow the object's author's edits without a new seal. Its cost is a key that, once handed out, cannot be taken back.

## Appendix A: a worked example (non-normative)

A four-vertex tetrahedron, one color per corner, drawn solid, built on a lattice of gibsons.

```json
{
  "v": 2,
  "name": "tetra",
  "unit": 0,
  "mode": "solid",
  "vertices": [[0, 0, 0], [2, 0, 0], [1, 0, 2], [1, 2, 1]],
  "colors": [238, 235, 239, 225],
  "faces": [[0, 1, 2], [0, 3, 1], [1, 3, 2], [0, 2, 3]]
}
```

This is the canonical form (§1.2). There is no `palette`, so the indices name the built-in (Appendix C): 238 is pure red, 235 pure green, 239 pure blue and 225 white. There is no `ticks`, because every position is whole; `"ticks": [-4]`, four whole remainders run-length encoded, means the same thing and a reader MUST accept it, but a publisher omits it. There is no `extent`, because absent means `8`. There is no `constrain`, so a reader lets a walker through it; an authoring tool publishing it today would add `"constrain": "opaque"` (§1.12), for 21 more bytes (181 compact). Every face is wound so that its front looks out of the solid (§1.4): seen from outside, its corners run counter-clockwise.

The same object with a palette of its own, which for four colors costs less than writing them out did:

```json
{
  "v": 2, "name": "tetra", "unit": 0, "mode": "solid",
  "vertices": [[0, 0, 0], [2, 0, 0], [1, 0, 2], [1, 2, 1]],
  "palette": [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 255]],
  "colors": [0, 1, 2, 3],
  "faces": [[0, 1, 2], [0, 3, 1], [1, 3, 2], [0, 2, 3]]
}
```

And the same object again with all four faces one color, which is what `facecolors` is for: adding `"facecolors": [238, -3]` gives four flat red triangles with hard edges between them, for 22 more bytes (160 bytes compact without it, 182 with).

The same object as tinted glass is the first document with `"opacity": 40` added, for 13 more bytes (173 compact). A reader draws it at forty percent, or opaque if it cannot draw translucency (§1.11); a reader written before §1.11 ignores the field and draws it opaque.

The same object as a solid that a walker whose client honors the field cannot pass through is the first document with `"constrain": "all"` added, for 18 more bytes (178 compact). A client that walks its viewer stops the walker at its faces (§1.12); every other reader, and every reader written before §1.12, ignores the field and draws the object exactly as before.

The same object as glass, placed twice by an object that carries it in its `objects` table (§1.10). Neither the parent nor the glass object is published. The pubkey in the address is that of the secret key `1`, a well-known test key:

```json
{
  "v": 2, "name": "two glass tetras", "unit": 0, "mode": "solid",
  "vertices": [], "colors": [], "faces": [],
  "refs": [["a", "33331:79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798:5e0a3c91d27f4b68"]],
  "parts": [[0, 0, 0, 0, 0, 0, 0, 0], [0, 360, 0, 0, 0, 90, 0, 0]],
  "objects": {
    "33331:79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798:5e0a3c91d27f4b68": {
      "v": 2, "name": "glass tetra", "unit": 0, "mode": "solid",
      "vertices": [[0, 0, 0], [2, 0, 0], [1, 0, 2], [1, 2, 1]],
      "colors": [238, 235, 239, 225],
      "faces": [[0, 1, 2], [0, 3, 1], [1, 3, 2], [0, 2, 3]],
      "opacity": 40, "constrain": "off"
    }
  }
}
```

The parent has no geometry of its own (§1.9 rule 13). It has one ref and two placements of that ref. The first placement puts the tetrahedron at the parent's origin. The second puts it three units along X (360 ticks) and turns it a quarter turn (90 degrees) about Y. Both placements name the one entry in `objects`, so the glass tetrahedron travels once.

A reader that supports `objects` draws both placements from that entry, at forty percent opacity. It lets a walker through both (§1.12), and it asks no relay for the address. A reader that predates `objects` fetches the address and finds nothing, since nobody published it, so it draws a placeholder at each placement. The address's `d` is random hex, so that fetch says nothing about the object (§1.10). The whole payload is 548 bytes compact.

Hidden in a bag, as an item (§3.2) or as a hidden object (§3.4), the table is encrypted with the rest of the payload. Written into a public event, the table would publish the glass tetrahedron in the clear. That is why §1.10 forbids a tool to publish a table taken from a bag in the clear, unless its user chose to.

The same object one meter across rather than two gibsons is the same document with `"unit": 32`: it spans two model units, and at `unit` 32 two model units are 2^33 gibsons, one meter (`CYBERSPACE_V2.md` puts height 34 at two meters).

---

## Appendix B: relationship to existing formats (non-normative)

The question any reviewer asks first is why this is not glTF. The honest answer has three parts: at this size the measurement favors text, the data model SNO wants already exists elsewhere and is called PLY, and the formats that succeed at this scale are the ones emitted by software rather than the ones specified well.

### B.1 What SNO is, in one line each

| To someone who thinks in | SNO is |
|---|---|
| glTF | `KHR_materials_unlit` with a `COLOR_0` attribute, quantized, with the scene graph and the buffers removed |
| PLY | an ASCII PLY with vertex colors, with the grammar replaced by fixed field names and the positions moved onto an integer lattice |
| MagicaVoxel | the same idea one level up: triangles rather than voxels, and RGB per vertex rather than a 255-color palette |
| nostr | NIP-64 for geometry: a small domain payload in `content`, clients SHOULD render it, relays MAY validate it |

### B.2 The size argument, measured rather than asserted

A colored cube of 8 vertices and 12 triangles, and a 162-vertex sphere, in the formats that can carry per-vertex color:

| Format | Cube, raw | Cube, gzip | Sphere, raw | Sphere, gzip |
|---|---|---|---|---|
| SNO-shaped JSON | 341 | 189 | 8,280 | 2,657 |
| PLY ASCII | 434 | 226 | 10,381 | 2,755 |
| PLY binary | 506 | 249 | 6,823 | 2,602 |
| GLB | 1,044 | 508 | 5,292 | 2,429 |
| glTF with a base64 buffer | 1,129 | 541 | 6,813 | 3,222 |

Raw, the binary formats win at the larger size, as they should. The number that decides the question is what happens inside a nostr event, where a binary payload has to be base64 encoded:

| Inside an event envelope | Raw | gzip |
|---|---|---|
| SNO as `content` | 8,955 | **2,778** |
| a base64 GLB as `content` | 7,393 | 3,495 |

Base64 costs 33% and produces high-entropy output that compresses badly, while decimal JSON compresses well. Once the transport is counted, and relays commonly negotiate WebSocket deflate, the text format is about 20% smaller than the binary one **and** is readable in a terminal. This is the single measurement worth keeping: nobody should be talked into base64 on a raw byte count without measuring after compression.

There is a second, blunter reason to stay out of base64. Khatru's `ApplySaneDefaults` installs a policy that rejects any event whose content contains `data:image/` or `data:video/`. A base64 asset embedded in content trips it; an integer JSON payload does not even come close.

The corollary is that SNO must never acquire a compression extension. Draco's WASM decoder is roughly 100 KB gzipped, against a payload of two to ten kilobytes. Any scheme needing a dedicated decoder is a net loss here by an order of magnitude, and deflate is already in the socket for free.

### B.3 What the neighbors got wrong, and the rule each one teaches

| Format | What happened | Rule for SNO |
|---|---|---|
| **PLY** | Its data model is SNO's, but property names were never registered, so `red`, `green`, `blue` are conventions. Years of colors that silently failed to import across MeshLab, Blender and VTK | Freeze the field names. SNO has fixed keys and no grammar |
| **STL** | Color was left unspecified, so VisCAM packed 15-bit RGB into the attribute bytes and Materialise put `COLOR=` in the header. Mutually incompatible, both widely ignored | A hole in a popular format gets filled by vendors, incompatibly. This is why §1.4 decides winding and §4 decides shading rather than leaving either open |
| **SPZ** (Niantic, 2024) | Shipped MIT, roughly ten times smaller than PLY splats, real adoption, and **without stating its up axis or handedness**. Someone had to open an issue to ask | A brand-new format in 2024 still made the oldest mistake. §2 states the axes in normative language |
| **glTF** | Left "forward" undefined for years while Maya, 3ds Max and Blender each assumed differently, and is an ISO standard | Being a standard does not save you from silence |
| **USD** | `metersPerUnit` falls back to 0.01, and the fallback up axis is configurable per installation, so the same file can read differently on two machines | Conventions belong in the file, never in the environment |
| **COLLADA** | Aimed at full interchange, underspecified, many ways to say one thing, divergent implementations, and **removed from Blender entirely in 5.0** | "No more than one way of doing the same thing", which is also the NIPs repository's fourth acceptance criterion. §1.2 states a canonical form for that reason |
| **OpenCTM** | Technically excellent, one release in January 2010, nothing since | A format is an ecosystem, not a document |
| **Draco on small meshes** | A decoder larger than the data | Measure the decoder, not just the payload |

There is a useful taxonomy from the USD side that classifies glTF and FBX as entirely "last mile" formats, which impose an opinion and conform the data to it, against interchange formats that try to preserve everything and fail. SNO is unapologetically last mile, and that is the side of the split that succeeds.

### B.4 How small formats actually win

Every small format in the survey that succeeded had exactly one thing in common, and it was not a good specification. MagicaVoxel's `.vox` won because MagicaVoxel is a beloved free editor. Litematica's format won because it is what the mod builders use. PGN won because every chess program reads it. SPZ won because Niantic shipped an MIT library with real data in it.

The lesson for SNO is that the deliverable is not this document. It is software that emits the format: the shard workshop that already exists, and an exporter from a tool modelers already use. The specification is what makes the second implementation possible, not what makes the first one matter.

One practical consequence: the first converter worth writing is **to and from PLY with vertex colors**, not glTF. PLY is the format whose data model already matches this one, and it is what Blender, MeshLab and every scanner already speak.

---

## Appendix C: the built-in palette, `cyberspace-neon-256` (normative)

The 256 colors an index names when an object carries no `palette` of its own (§1.3a). Each is sRGB, eight bits a channel.

**The layout is arithmetic, not a list to memorise.**

| Index | What |
|---|---|
| `0` to `191` | 24 hues of 8 steps. Hue `h` step `s` is index `h * 8 + s`. Step 0 is the darkest, step 7 the brightest |
| `192` to `223` | 32 steels, black to white, faintly cyan so they belong to the same world rather than looking dead |
| `224` to `255` | 32 signatures: the client's own instrument colors exactly, the six sRGB gamut corners that evenly spaced ramps cannot reach, six neon staples, and six deep grounds for a scene that is mostly dark |

The ramps are generated in OKLCH rather than HSV, so a step looks like one step rather than measuring as one, and clipped into sRGB by lowering chroma rather than clamping channels, which is what stops the bright end of a saturated hue turning to mud. Shadows drift a little toward the blue that lights this world and highlights drift a little warm, which is what makes a ramp read as lit rather than as a tint. Lightness runs from 0.30 to 0.85 and chroma stays near the gamut edge throughout: an earlier draft ran 0.20 to 0.94 and spent about seventy of its entries on near-blacks and pastels nobody would pick.

The generator is `decks/sno-palette.mjs` and the values are also carried as `decks/sno-palette.json` for implementers who would rather not retype them. The sheet below is `decks/sno-palette.png`.

![The cyberspace-neon-256 palette](sno-palette.png)

| From | +0 | +1 | +2 | +3 | +4 | +5 | +6 | +7 |
|---|---|---|---|---|---|---|---|---|
|   0 | #003632 | #004d49 | #006562 | #007e7d | #009799 | #00b2b8 | #00cdd7 | #00e8f9 |
|   8 | #003538 | #004c51 | #00636d | #007c8a | #0095a9 | #00afca | #00c9ed | #6fdfff |
|  16 | #00343f | #004a5a | #006178 | #007998 | #0092ba | #00abdf | #34c4ff | #93d8ff |
|  24 | #003346 | #004865 | #005e86 | #0075ab | #008dd2 | #00a4fd | #6ebcff | #a7d3ff |
|  32 | #003052 | #004476 | #00589e | #006ccc | #017fff | #5a9bff | #8bb5ff | #b5ceff |
|  40 | #00266d | #002cac | #1902ff | #374fff | #5a73ff | #7e92ff | #a1aeff | #c3c9ff |
|  48 | #220088 | #3700b7 | #5000e7 | #6837ff | #8064ff | #9b86ff | #b6a5ff | #d0c4ff |
|  56 | #350079 | #4f00a3 | #6b00cd | #8b00f8 | #a24bff | #b875ff | #cd9aff | #e1bcff |
|  64 | #420069 | #5f008d | #7f00b1 | #a200d5 | #c600f8 | #dd53ff | #ed84ff | #f9afff |
|  72 | #4b0058 | #6b0076 | #8e0094 | #b200b1 | #d900cd | #ff1ae7 | #ff7de2 | #ffb1e6 |
|  80 | #520046 | #74005f | #980077 | #be008e | #e600a4 | #ff45b4 | #ff87c0 | #ffb5d2 |
|  88 | #570035 | #7a0048 | #9f005a | #c6006b | #ee007b | #ff538d | #ff8ca6 | #ffb7c2 |
|  96 | #5a0024 | #7e0031 | #a3003d | #cb0047 | #f4004e | #ff5b6a | #ff908e | #ffb9b4 |
| 104 | #5c0010 | #800014 | #a60013 | #ce0006 | #f22400 | #ff613e | #ff9375 | #ffbba5 |
| 112 | #561200 | #752200 | #943300 | #b44600 | #d45a00 | #f47000 | #ff9652 | #ffbd93 |
| 120 | #4b1f00 | #683100 | #854300 | #a25700 | #c06d00 | #de8300 | #fc9b00 | #ffc077 |
| 128 | #442600 | #5e3800 | #794c00 | #946100 | #b07800 | #cc8f00 | #e7a800 | #ffc333 |
| 136 | #3e2a00 | #563d00 | #6e5300 | #876900 | #a08100 | #b99900 | #d2b300 | #ebce00 |
| 144 | #372d00 | #4d4200 | #635800 | #797000 | #8f8800 | #a5a300 | #b9be00 | #cdda00 |
| 152 | #2f3000 | #424600 | #555e00 | #677700 | #779100 | #87ad00 | #94ca00 | #9fe800 |
| 160 | #243400 | #314b00 | #3d6400 | #457f00 | #499b00 | #45b900 | #2cd900 | #00f837 |
| 168 | #073900 | #005108 | #006a1f | #008436 | #009f4e | #00ba67 | #00d682 | #00f39e |
| 176 | #00381e | #005030 | #006844 | #00825b | #009c73 | #00b78d | #00d3a9 | #00efc6 |
| 184 | #00372a | #004e3f | #006656 | #00806e | #009a89 | #00b4a5 | #00d0c2 | #00ece1 |
| 192 | #010101 | #020203 | #050606 | #090b0c | #0f1213 | #15191a | #1b2021 | #222728 |
| 200 | #282e30 | #2f3638 | #373e40 | #3e4648 | #454e50 | #4d5658 | #555e60 | #5d6769 |
| 208 | #666f71 | #6e787a | #778083 | #80898c | #899294 | #939b9d | #9ca4a6 | #a6adaf |
| 216 | #b0b6b8 | #babfc1 | #c4c9ca | #ced2d3 | #d8dcdc | #e3e5e6 | #eeefef | #f8f8f8 |
| 224 | #000000 | #ffffff | #00e5ff | #ff3b6b | #f7931a | #52e39f | #c8f5ff | #6f8ea0 |
| 232 | #1d3547 | #05070d | #ff00ff | #00ff00 | #00ffff | #ffff00 | #ff0000 | #0000ff |
| 240 | #39ff14 | #ff6ec7 | #7df9ff | #b026ff | #fffb00 | #ff3300 | #00ff9f | #ff007f |
| 248 | #4d4dff | #ffd300 | #0a0f1a | #12182a | #1a0f24 | #0f1f1c | #241016 | #1c1c0f |
