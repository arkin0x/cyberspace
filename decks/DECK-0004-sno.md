# DECK-0004: SNO (Simple Nostr Objects)

DECK: 0004
Title: SNO (Simple Nostr Objects)
Status: Draft
Created: 2026-09-14
Last updated: 2026-09-14
Requires: `CYBERSPACE_V2.md` (spec version `2026-03-16-h34-corrected`)

## Abstract

A **Simple Nostr Object** (SNO) is a small three-dimensional object written as JSON, small enough to live inside one nostr event alongside everything else a note carries. It is a list of vertices on an integer lattice, one color per vertex, an optional list of triangles, and a word saying how to draw it. There are no textures, no materials, no normals, no bones, no animation, and no file to fetch. An object is the event.

This document codifies a format Cyberspace already depends on but has never written down. The base specification refers to it twice: §7 notes that ONOSENDAI hides `kind 3330` shards whose geometry is in `content`, and §8.10 computes the proof of work an avatar owes from that payload's `unit`, `vertices`, `ticks` and `faces` fields. Both passages assume a format defined nowhere. This DECK is that definition, written so that it stands on its own outside Cyberspace as well as inside it.

The design goal is not to compete with glTF or USD. It is to be the three-dimensional equivalent of a text note: something any developer can parse in an afternoon with no library, read with their eyes, diff in a pull request, and render with thirty lines of code. Where a real asset pipeline is needed, SNO is the wrong tool and says so.

**Defined here:**

| Thing | Value |
|---|---|
| Object payload | JSON, described in §1 |
| Event kind for a standalone object | `3330` (already in use for shards, §3.1) |
| Model space | X right, Y up, +Z away from the canonical viewer (§2) |
| Position lattice | whole units plus 120ths of a unit (§1.2) |
| Hard limits | 512 vertices, 1024 faces (§1.8) |
| Reference implementation | `decks/sno-reference.py`, which is §1.9 written as code |

**Conformance.** `decks/sno-reference.py` implements §1.9 with no dependencies and carries a rejection case for every numbered rule. It was checked against ONOSENDAI's independent TypeScript reader, and the two agree on all twenty cases, including the three places where this format is deliberately forgiving rather than strict. A third implementation can be checked against the same table.

---

## Terms

- **Object:** one SNO payload. A single connected budget of vertices, colors and faces; not a scene and not a hierarchy.
- **Model unit:** the lattice spacing. One model unit is `2^unit` of the application's base unit (§1.6). In Cyberspace the base unit is the gibson.
- **Tick:** one 120th of a model unit. The sub-unit part of a position (§1.2).
- **Vertex:** a point, its position given as whole units plus ticks, carrying one RGB color.
- **Face:** a triangle, three vertex indices.
- **Mode:** which of the three drawings of the same vertex list a client should produce: `solid`, `points` or `lines` (§1.5).
- **Extent:** the half-width of the grid the object was built on, in model units. A bound, not a size (§1.8).

---

## 1. The object (normative)

### 1.1 Payload

An object is a JSON object. Fields marked required MUST be present; a reader MUST reject a payload that is missing one or whose value has the wrong shape.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `v` | integer | yes | Format version. `1` for this document. A reader MUST reject any other value. |
| `type` | string | yes | `"shard"`. A reader MUST reject any other value. |
| `name` | string | yes | A name for humans. A reader MUST truncate to 64 characters. |
| `unit` | integer | yes | Scale exponent, `0` to `84`. One model unit is `2^unit` base units (§1.6). |
| `extent` | integer | no | Grid half-width in model units, `1` to `64`. Advisory and self-repairing (§1.8). Absent or malformed means `8`. |
| `mode` | string | yes | `"solid"`, `"points"` or `"lines"` (§1.5). A reader MUST reject any other value. |
| `vertices` | array | yes | One `[x, y, z]` triple of **whole units** per vertex (§1.2). |
| `ticks` | array | no | The sub-unit part of each position (§1.2). Absent means every position is whole. |
| `colors` | array | yes | One `[r, g, b]` triple per vertex, parallel to `vertices` (§1.3). |
| `faces` | array | yes | Triangles as `[a, b, c]` vertex indices (§1.4). MAY be empty. |
| `up` | boolean | no | `true` means the object stands on the Earth's surface where it is placed (§1.7). `false` means the same as absent. |
| `spin` | integer | no | With `up`: the compass bearing the object's `+Z` faces, `0` to `359` (§1.7). |

`vertices` and `colors` MUST have the same length. Any field not listed here MUST be ignored by a reader, not rejected (§5).

### 1.2 Positions: the lattice and the ticks

A position is an exact rational, never a float. It is carried in two parts.

`vertices[i]` is the **whole units** part: three integers, the floor of the position on each axis.

`ticks[i]` is the **remainder**: three integers `0` to `119`, the position's fractional part in 120ths of a unit. The position on an axis is therefore `vertices[i][a] + ticks[i][a] / 120` model units, exactly.

`ticks` is run-length encoded, because most objects are built on whole units and a long list of `[0, 0, 0]` is waste. Each entry is either a triple, standing for one vertex, or a **negative integer** `-N`, standing for `N` consecutive vertices whose remainder is `[0, 0, 0]`. The entries, expanded, MUST produce exactly one remainder per vertex; a reader MUST reject a `ticks` array that expands to any other length. `0` and positive integers are not valid entries.

**Why 120.** It is the smallest number divisible by every integer from 1 to 6, and it also divides by 8, 10, 12, 15, 20, 24, 30, 40 and 60. Halves, thirds, quarters, fifths, sixths, eighths and tenths of a unit all land exactly on the lattice, so a modeler snapping to any ordinary fraction never accumulates error, in the same way that 360 degrees was chosen for a circle. A power of two would have made thirds and fifths impossible.

**Why integers at all.** A vertex is at a coordinate, not near one. Two objects built to meet at a shared edge meet exactly, on every implementation, forever, with no dependence on floating point rounding or on the order the file was written in.

**The float hazard (normative).** One 120th is not exactly representable in binary floating point. Two readers that compute `whole + remainder / 120.0`, one in 32-bit and one in 64-bit, will disagree in the last bits. Therefore any operation that depends on exact coincidence, which is at least welding, deduplication, equality, sorting and hashing, MUST be performed on the integer pair before any conversion to a float. A reader that welds on derived floats has given away the one guarantee the lattice makes.

**Canonical form (normative).** There is exactly one way to write a given object, because a format that allows three spellings of the same thing gets three incompatible readers. A publisher MUST omit `ticks` entirely when every remainder is zero, MUST write a run of two or more zero remainders as a single negative integer rather than as repeated triples, and MUST omit `extent` when it is `8`. A reader MUST accept all equivalent spellings anyway, because it will meet them.

### 1.3 Colors

`colors[i]` is `[r, g, b]`, each a number from `0` to `1` inclusive. A reader MUST clamp values outside that range and MUST treat a non-finite value as `0`.

There is one color per vertex and no other color anywhere in the format. A face is painted by interpolating its three vertices; a line is painted by interpolating along its length; a point is its own color. A flat-colored triangle is expressed by giving its three vertices the same color, which costs three vertices out of the budget rather than one material.

Publishers SHOULD round color channels to at most three decimal places. The difference is invisible and the saving is real: `0.7333333333333333` is eighteen bytes and `0.733` is five, repeated three times per vertex.

### 1.4 Faces

`faces[i]` is `[a, b, c]`, three integers indexing `vertices`. Every index MUST be at least `0` and less than the vertex count, and the three MUST be distinct. A reader MUST reject a payload containing any face that fails either test, because a face pointing at a vertex that does not exist is a crash in most renderers, far from anything that could explain it.

**Winding order carries no meaning, and this is a decision rather than an omission.** A face has no front and no back: a reader MUST draw both sides of every triangle, and MUST NOT cull a face on the basis of its winding. An author therefore never has to think about winding, and an exporter never has to fix it.

This is stated because leaving it unsaid is the most common way a small format fails. STL left color unspecified and two vendors filled the hole incompatibly; PLY never registered its property names and cost the ecosystem years of colors that did not import; Niantic's SPZ shipped in 2024 without saying which axis is up and someone had to file an issue to ask. A reader that wants single-sided rendering is free to want it, but it is not this format.

`faces` MAY be empty. An object with no faces is a point cloud or a polyline, depending on `mode`.

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
| `MAX_VERTICES` | 512 | keeps the worst case inside every relay's limits without the author having to think about it. See below |
| `MAX_FACES` | 1024 | the same |
| `extent` | 1 to 64 model units | a hint at the lattice size, so a reader can size a grid before it reads the data |
| `unit` | 0 to 84 | the Cyberspace address space is `2^85` gibsons on a side |
| `name` | 64 characters | truncated, not rejected |

A reader MUST reject a payload whose vertex or face count exceeds these limits.

`extent` is **advisory and self-repairing**, which is the one place this format is deliberately forgiving. A reader MUST substitute the default of `8` for an `extent` that is absent, not an integer, or outside `1..64`, and MUST then grow it until it contains every vertex. An object is therefore never rejected for disagreeing with its own extent; the data wins and the hint is corrected. This is what lets a modeling tool write geometry first and a bounding hint second without the two ever contradicting.

The position bound is stated as an obligation on publishers rather than readers: a publisher MUST NOT write a vertex further than `64` model units (`7680` ticks) from the origin on any axis. A reader MAY reject such a payload and MAY instead repair it by growing the extent. ONOSENDAI currently repairs. §8 records the consequence.

These numbers are deliberately small, and the vertex ceiling earns its place by keeping the format inside the band that every relay accepts.

| Object | Full event, serialized |
|---|---|
| a colored cube, 8 vertices | about 600 bytes |
| 64 vertices | about 3.2 KB |
| 256 vertices | about 13 KB |
| **512 vertices, the ceiling** | **about 26.7 KB** |

For comparison, strfry's stock `events.maxEventSize` is 65,536 bytes, and strfry is the most deployed relay software in the network. The worst case an SNO can produce is therefore about 2.4 times under the tightest common cap, and smaller than the median long-form article. A publisher never has to think about relay limits, which is the point of having a ceiling at all.

Two facts make this margin more comfortable than it looks. Escaping the payload into a JSON string costs 12 bytes, under 0.05%, because the content is almost entirely integers, so the fear that nesting JSON inside JSON is wasteful does not apply here. And the geometry belongs in `content` rather than tags: strfry caps a tag value at 1,024 bytes and the tag count at 2,000, while content is roomy everywhere.

One trap worth knowing, since it cannot be discovered at runtime: strfry populates NIP-11's advertised `max_message_length` from its WebSocket frame cap, not from `events.maxEventSize`, and never advertises the latter. A relay advertising a one megabyte limit may still reject a 70 KB event. Do not design against advertised numbers; stay under the ceiling and handle the rejection message.

### 1.9 Validation

A reader MUST perform all of the following before rendering, and MUST reject the whole payload if any fails. A partially valid object is not rendered partially: a face index pointing past the end of the vertex list is not a defect that degrades gracefully.

1. `v` is `1` and `type` is `"shard"`.
2. `vertices`, `colors` and `faces` are arrays, and `vertices.length === colors.length`.
3. `vertices.length <= 512` and `faces.length <= 1024`.
4. `mode` is one of the three words.
5. `unit` is an integer in `0..84`.
6. Every vertex triple is three integers; every color triple is three numbers.
7. `ticks`, if present, expands to exactly one remainder per vertex, and every remainder component is an integer in `0..119`.
8. Every face is three distinct integers in `0..vertices.length - 1`.
9. `extent`, if present, is repaired rather than validated (§1.8): out of range becomes `8`, then it grows to contain the data.
10. `up`, if present, is a boolean; `spin`, if present, is an integer in `0..359`.

---

## 2. Model space (normative)

An object is built in a right-handed-looking but viewer-flipped frame, and the exact convention matters more than its elegance, because getting it wrong mirrors every object ever published.

| Axis | Direction |
|---|---|
| `+X` | right |
| `+Y` | up |
| `+Z` | away from the canonical viewer, into the screen |

This is the mirror of the glTF and three.js convention, where `+Z` points toward the viewer. A renderer built on three.js negates Z when it loads an object, and an exporter that writes SNO from a right-handed Y-up tool MUST negate Z on the way out. Cyberspace's own canonical orientation (`CYBERSPACE_V2.md` §11.3) faces the black sun, which lies along `+Z`, which is why the convention is this way round.

Blender is Z-up and right-handed, so a Blender exporter maps Blender `(x, y, z)` to SNO `(x, z, y)`, which handles both the up-axis change and the handedness flip in one step. §7 returns to this.

---

## 3. Carrying an object in a nostr event (normative)

### 3.1 A standalone object: `kind 3330`

An object stands alone as a `kind 3330` event whose `content` is the payload of §1, serialized as JSON.

| Tag | Required | Meaning |
|---|---|---|
| `C` | no | `["C", "<coord_hex>"]`, the object's exact coordinate (`CYBERSPACE_V2.md` §2). Present when the object has a place. |
| `name` | no | `["name", "<name>"]`, duplicating the payload's `name` so a relay query can filter on it without parsing the content |

`3330` falls in `1000..9999`, which NIP-01 defines as **regular**: relays store every event and none replaces another. That is the right class here, and the reasons are worth stating because the alternative looks attractive until it does not.

| Why regular rather than addressable | |
|---|---|
| The object is its id | A regular event's id is the hash of its content, so an object can be embedded by `nevent`, cached forever, verified by anyone, and never changes under a viewer. An addressable coordinate resolves to whatever its author last published. |
| Payments and reactions bind to ids | Zaps (NIP-57), reactions (NIP-25) and comments (NIP-22) reference an `e` tag. If someone pays for an object and the author then edits it, an addressable design leaves the payment pointing at content that silently changed. |
| It matches every comparable kind | The "post an object" kinds are regular: picture 20, video 21, code snippet 1337, chess 64. The addressable kinds are documents: long-form 30023, wiki 30818. An object is a post. |
| One way to do one thing | NIP-71 shipped both regular and addressable video and it is widely regarded as a mistake. An editable companion, if it is ever wanted, is a separate proposal rather than a second spelling of this one. |

An author who wants to retract or supersede an object publishes a new one and a NIP-09 deletion request for the old, which is how `kind 20` pictures already work.

`3330` is also unclaimed outside Cyberspace: it appears in neither the NIPs repository, nor the registry of kinds, nor any open proposal. Cyberspace's other kinds (321, 331, 333, 3333, 10085, 10087, 20333, 33330 to 33332) are equally unregistered, which is a separate piece of housekeeping.

A client that receives a `kind 3330` event whose content fails §1.9 MUST NOT render it and SHOULD say why rather than failing silently.

### 3.2 Inside a bag

An object hidden at a place is an item inside a `kind 33330` bag, exactly as `CYBERSPACE_V2.md` §7 describes items. Nothing in this DECK changes that container. The item is a `kind 3330` event, signed or unsigned, and it MAY carry a `C` tag, which then MUST lie inside the bag's region.

### 3.3 As an avatar

An avatar event (`kind 33331`, `CYBERSPACE_V2.md` §8.10) carries an SNO payload in its `content`, or empty content for the default avatar. The work an avatar owes is computed from `unit`, `vertices`, `ticks` and `faces` as that section specifies. Nothing in this DECK changes that computation; this document only defines the fields it reads.

---

## 4. Rendering (normative where it says MUST)

A client MUST NOT render an object that fails §1.9.

A client SHOULD render all three modes; a client that renders only `points` still shows every object, which is why the vertex list is the one required part of the format.

**Shading is decided here rather than left to taste**, because per-vertex color forces the question and implementers who are not told will answer it differently, which makes the same object look like two objects.

The default reading of an SNO is **unlit**: a face takes its color by interpolating its three vertices, and no light in the scene changes it. This is not an absence of a material, it is a named one: it is what glTF ratified as `KHR_materials_unlit` with a `COLOR_0` attribute, for exactly this kind of content.

A client MAY light an object instead, and many will, because a lit object sits better in a lit scene. A client that lights an object MUST derive its normals per face, flat, from the triangle's own vertices. A client MUST NOT synthesize smooth normals by averaging across shared vertices: an object with no normals is faceted, an author who wanted a smooth surface has no way to say so today (§7.2), and a reader that smooths one anyway is deciding for them.

A client MUST NOT invent geometry: no subdivision, no smoothing that moves a vertex, no hole filling. The lattice is exact and a renderer that moves a vertex has broken the one guarantee the format makes.

A client MUST perform welding, deduplication and any equality test on the integer lattice rather than on floats derived from it (§1.2).

---

## 5. Versioning and extension (normative)

`v` is `1`. A reader MUST reject a payload whose `v` it does not know, because a version bump means the meaning of an existing field has changed.

A reader MUST ignore fields it does not recognize rather than rejecting them. This is what allows an optional field to be added without a version bump, and it is how `extent`, `ticks`, `up` and `spin` were each added to a format already in use: an older reader sees an object with whole-unit positions on a grid of 8, unoriented, and draws something correct rather than nothing.

An extension that changes how an existing field is interpreted MUST bump `v`. An extension that adds a field whose absence has a well-defined meaning MUST NOT.

---

## 6. Security considerations

**Resource exhaustion.** The limits in §1.8 are the defense. A reader MUST enforce them before allocating buffers sized from the payload, not after. A payload claiming 2^31 vertices must be rejected by counting the array, never by trusting a length field, and this format has no length fields for exactly that reason.

**Crashes from bad indices.** §1.4 and §1.9 exist because a face index past the end of the vertex list is undefined behavior inside most graphics libraries, surfacing far from the event that caused it. Validate before rendering, always.

**Objects are not attribution.** A `kind 3330` event inside a bag may be unsigned (`CYBERSPACE_V2.md` §7), in which case its `pubkey` is a claim and a client MUST NOT present it as verified authorship.

**Screen real estate is a resource.** An object drawn in a shared space is seen by people who did not ask for it. Cyberspace's answer for avatars is to price size and detail in proof of work (§8.10). Any application that renders objects from strangers without a cost or a filter should expect to be flooded, and the format cannot solve that for it.

**No code, no fetches.** An SNO payload is data. It names no URL, embeds no script, and requires no network access to render. A reader that keeps it that way inherits none of the attack surface that formats with external references carry.

---

## 7. What SNO leaves out, and why (non-normative)

Every omission here is deliberate, and each one has a reader who will miss it. This section exists so that a person deciding whether to implement SNO knows what they are not getting, and so that a future extension has somewhere to start.

### 7.1 The conversions an exporter must perform

A tool that writes SNO from a modeling package performs four conversions, and each loses something. An exporter author should know all four before starting.

| Conversion | What is lost |
|---|---|
| **Triangulation.** SNO has only triangles; modeling packages work in quads and n-gons. | The authored topology. A round trip returns triangles, so the model is no longer editable the way it was built. |
| **Axis change.** Blender is Z-up and right-handed (X right, Y into the screen, Z up); SNO is Y-up with `+Z` into the screen. The map is Blender `(x, y, z)` to SNO `(x, z, y)`. | Nothing numerically, but it is a reflection: swapping two axes flips handedness, which is why SNO is left-handed (§2). An exporter that forgets publishes every object mirrored, and the mistake is invisible on a symmetric object. |
| **Quantization to the lattice.** Float positions become integers on a 1/120 lattice. | Real precision. See below. |
| **Decimation to 512 vertices.** | The largest loss, and the only one that changes the art rather than the numbers. |

**The precision budget, stated plainly, and it is better than it looks.** One unit is 120 ticks, which is log2(120) = 6.91 bits. A grid at the maximum extent of 64 is 15,360 ticks across, about 13.9 bits of resolution per axis; at the default extent of 8 it is about 10.9 bits.

The instinct is to call that low precision. It is not. Draco's encoder defaults to 11 bits for positions and 14 is the common production setting; gltfpack also defaults to 14. SNO's 13.9 bits sits directly on top of the number the rest of the industry ships. SNO is not a low-precision format. It is a **fixed-window** format at industry-standard precision, and what it gives up is dynamic range rather than accuracy, which is exactly what the `unit` exponent exists to recover.

The lattice also buys something the float formats cannot have at any bit depth: exactness. Two objects authored to share an edge share it forever, on every implementation, and welding, deduplication and hashing are integer tuple comparisons rather than an epsilon that is always wrong somewhere.

**Where the vertex ceiling sits.** The budget is not abstract:

| Object | Vertices | Triangles | Fits |
|---|---|---|---|
| a cube | 8 | 12 | easily |
| a UV sphere at 32 by 16 segments | 482 | 960 | barely |
| one subdivision more | thousands | thousands | no |
| a scanned or sculpted asset | 10^4 to 10^7 | | no |

512 vertices is one recognizable object at low poly, not a scene. An exporter should show a live vertex count while modeling rather than let the budget be discovered at export.

### 7.2 What is genuinely absent, and what each would cost

None of these needs a version bump, because each is an optional field whose absence already has a defined meaning (§5).

| Missing | Why it hurts | Cheapest fix | Cost |
|---|---|---|---|
| **Smooth shading** | With no normals every surface is faceted, so a sphere reads as a golf ball | one object-wide boolean telling the renderer to average face normals at shared vertices | one field, no per-vertex data |
| **Per-face color** | A flat-colored triangle must give its three vertices the same color, so a flat-shaded 500-triangle object spends 1,500 vertices to express 500 colors, three times over budget | an optional array of colors indexed by face, with vertex colors as the fallback | one array, and it *saves* space on exactly the style SNO suits best |
| **Emission** | The one thing a glowing object needs, and Cyberspace is made of glowing objects | an optional material block with an emissive flag and a strength | one small object |
| **Roughness, metalness, alpha** | The sliders every modeler reaches for after base color | three numbers in the same block | included above |
| **Double-sided** | An open shell shows its inside or does not, and the author has no say | one boolean | one field |

Of these, smooth shading and per-face color are the two that change what is possible rather than what is pretty, and per-face color is the only one that makes the budget go further rather than less far.

One apparent gap is not one. SNO has per-vertex color and no material, which is precisely the shading model glTF ratified as `KHR_materials_unlit` used with a `COLOR_0` attribute: do not light this, take the color from the vertices. That model exists for mobile, photogrammetry and stylized art, and it is named, specified and widely implemented. **SNO is `KHR_materials_unlit` with `COLOR_0`** is the one-sentence bridge to anyone who thinks in glTF.

### 7.3 What is out of scope

| Missing | Why it does not belong |
|---|---|
| **UVs and textures** | A texture is kilobytes to megabytes, so it must live outside the event as a URL or a hash. That ends the property that an SNO renders with no network access and no external attack surface, which is most of what makes it simple. |
| **Multiple objects, hierarchy, transforms** | SNO is one object by definition. A scene is a list of objects with placements, which is a different document and probably a different kind. |
| **Animation, armatures, shape keys** | Each needs a time model and per-frame or per-bone data that dwarfs the geometry. |
| **Instancing and level of detail** | Real needs at scene scale, meaningless for one 512-vertex object. |

### 7.4 What SNO has that the large formats do not

1. **Exact positions.** Integer lattice coordinates mean two objects authored to meet actually meet, on every implementation, forever. Float formats only approximately do, and the error depends on the order the exporter wrote the file in.
2. **It is the event.** No file to fetch, no hash to resolve, no second protocol, no host to go down. A relay that has the note has the object.
3. **No parser dependency.** `JSON.parse` and thirty lines of rendering, against a specification of a few pages.
4. **Readable and diffable.** An object can be reviewed in a pull request, hand-edited, and generated by a shell script.
5. **Per-vertex color is first class.** It is the only coloring mechanism, so every reader supports it, where in the large formats vertex color is an option that half the pipeline ignores.

---

## 8. Open questions

1. **Handedness.** SNO's `+Z` points away from the viewer, the mirror of glTF and three.js. It is the right convention inside Cyberspace, where `+Z` is the black sun. It is a wart everywhere else, and every exporter and importer pays for it once. Changing it is free today and impossible after the first objects are published outside ONOSENDAI.
2. **A base unit outside Cyberspace.** `unit` is an exponent over a base the application defines, which is meaningless to a client with no such base. An optional field giving meters per model unit would make an object's real size portable, at the cost of a field that Cyberspace itself would never write.
3. **An addressable kind for editable objects.** `kind 3330` is immutable by design. An object a person iterates on in a modeling tool wants replacement semantics and a `d` tag. Whether that is a second kind or a convention is unsettled.
4. **Per-face color.** Flat-shaded objects currently pay three vertices per triangle, which spends the 512-vertex budget quickly on exactly the low-poly style the format suits best.
5. **Whether the limits are the right numbers.** 512 and 1024 were chosen to fit an event. They are not derived from anything.
6. **Whether a general nostr audience should get `3330` or a fresh kind.** This document claims the kind ONOSENDAI already publishes, which has the considerable advantage that a working implementation exists on it today, and `3330` is unclaimed everywhere outside Cyberspace. The argument the other way is that `3330` sits inside the block one protocol uses for everything else, which reads as borrowing rather than registering; `4242` and `3434` are both verified unclaimed in the same regular range. The two considerations pull in opposite directions and the choice is a publication decision rather than a technical one, so it is recorded here rather than settled.
7. **There is no hard bound on how far a vertex may lie from the origin.** §1.8 puts the 64-unit bound on publishers and lets readers repair instead of reject, which is what ONOSENDAI does today: it grows the extent to fit, without a ceiling. That is safe for a client rendering its own author's work and unsafe as a general rule, since a payload of 512 vertices at 2^50 units is valid under this text and will produce a grid no renderer wants. Making the bound a reader obligation is a one-line change and would make the current client non-conformant until it is updated, which is why it is a question rather than a rule.

---

## Appendix A: a worked example (non-normative)

A four-vertex tetrahedron, one color per corner, drawn solid, built on a lattice of gibsons.

```json
{
  "v": 1,
  "type": "shard",
  "name": "tetra",
  "unit": 0,
  "extent": 8,
  "mode": "solid",
  "vertices": [[0, 0, 0], [2, 0, 0], [1, 0, 2], [1, 2, 1]],
  "ticks": [-4],
  "colors": [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1]],
  "faces": [[0, 1, 2], [0, 1, 3], [1, 2, 3], [0, 2, 3]]
}
```

The whole object is 215 bytes of JSON with the whitespace removed, and 289 as printed above. `"ticks": [-4]` is the run-length encoding of four whole-unit vertices; omitting `ticks` entirely would mean the same thing.

The same object one meter across rather than four gibsons is the same document with `"unit": 32`.

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
