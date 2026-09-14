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

### 1.3 Colors

`colors[i]` is `[r, g, b]`, each a number from `0` to `1` inclusive. A reader MUST clamp values outside that range and MUST treat a non-finite value as `0`.

There is one color per vertex and no other color anywhere in the format. A face is painted by interpolating its three vertices; a line is painted by interpolating along its length; a point is its own color. A flat-colored triangle is expressed by giving its three vertices the same color, which costs three vertices out of the budget rather than one material.

Publishers SHOULD round color channels to at most three decimal places. The difference is invisible and the saving is real: `0.7333333333333333` is eighteen bytes and `0.733` is five, repeated three times per vertex.

### 1.4 Faces

`faces[i]` is `[a, b, c]`, three integers indexing `vertices`. Every index MUST be at least `0` and less than the vertex count, and the three MUST be distinct. A reader MUST reject a payload containing any face that fails either test, because a face pointing at a vertex that does not exist is a crash in most renderers, far from anything that could explain it.

Winding order is not normative. An object may be drawn with backface culling off, or its faces wound consistently outward by the renderer.

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
| `MAX_VERTICES` | 512 | an object must fit in an event beside everything else the event carries |
| `MAX_FACES` | 1024 | the same |
| `extent` | 1 to 64 model units | a hint at the lattice size, so a reader can size a grid before it reads the data |
| `unit` | 0 to 84 | the Cyberspace address space is `2^85` gibsons on a side |
| `name` | 64 characters | truncated, not rejected |

A reader MUST reject a payload whose vertex or face count exceeds these limits.

`extent` is **advisory and self-repairing**, which is the one place this format is deliberately forgiving. A reader MUST substitute the default of `8` for an `extent` that is absent, not an integer, or outside `1..64`, and MUST then grow it until it contains every vertex. An object is therefore never rejected for disagreeing with its own extent; the data wins and the hint is corrected. This is what lets a modeling tool write geometry first and a bounding hint second without the two ever contradicting.

The position bound is stated as an obligation on publishers rather than readers: a publisher MUST NOT write a vertex further than `64` model units (`7680` ticks) from the origin on any axis. A reader MAY reject such a payload and MAY instead repair it by growing the extent. ONOSENDAI currently repairs. §8 records the consequence.

These numbers are deliberately small. 512 vertices is roughly the budget of Blender's Suzanne, and a filled cube is eight. An object that does not fit is not an SNO.

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

`kind 3330` is a regular kind: an event is one object, immutable, and publishing a changed object publishes a new event. This is the right default for an object that may have been hidden inside a bag, referenced by others, or handed around; an object that wants to be edited in place belongs in an addressable kind, which §8 leaves open.

A client that receives a `kind 3330` event whose content fails §1.9 MUST NOT render it and SHOULD say why rather than failing silently.

### 3.2 Inside a bag

An object hidden at a place is an item inside a `kind 33330` bag, exactly as `CYBERSPACE_V2.md` §7 describes items. Nothing in this DECK changes that container. The item is a `kind 3330` event, signed or unsigned, and it MAY carry a `C` tag, which then MUST lie inside the bag's region.

### 3.3 As an avatar

An avatar event (`kind 33331`, `CYBERSPACE_V2.md` §8.10) carries an SNO payload in its `content`, or empty content for the default avatar. The work an avatar owes is computed from `unit`, `vertices`, `ticks` and `faces` as that section specifies. Nothing in this DECK changes that computation; this document only defines the fields it reads.

---

## 4. Rendering (normative where it says MUST)

A client MUST NOT render an object that fails §1.9.

A client SHOULD render all three modes; a client that renders only `points` still shows every object, which is why the vertex list is the one required part of the format.

A client MAY apply its own lighting, or none. SNO carries no normals and no material, so a solid object is either flat-shaded from face normals the renderer computes, or drawn unlit at its vertex colors. Both are correct readings of the format, and an object author should expect either.

A client MUST NOT invent geometry: no subdivision, no smoothing that moves a vertex, no hole filling. The lattice is exact and a renderer that moves a vertex has broken the one guarantee the format makes.

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

**The precision budget, stated plainly.** A grid is at most 64 units half-width and each unit is 120 ticks, so the full grid is 15,360 ticks across: about 13.9 bits of resolution per axis, and only for an object that fills the grid. On the default extent of 8 it is about 10.9 bits. For comparison, glTF's quantization extension normally uses 16 bits per axis, and float32 carries 24 bits of mantissa. SNO buys exactness, which is that two objects authored to share an edge share it forever on every implementation, at the cost of dynamic range. That is the trade, and it suits blocky and low-poly work while showing plainly on a scanned or sculpted surface.

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
| **Emission** | The one thing a glowing object needs, and Cyberspace is made of glowing objects | an optional material block with an emissive and an unlit flag | one small object |
| **Roughness, metalness, alpha** | The sliders every modeler reaches for after base color | three numbers in the same block | included above |
| **Double-sided** | An open shell shows its inside or does not, and the author has no say | one boolean | one field |

Of these, smooth shading and per-face color are the two that change what is possible rather than what is pretty, and per-face color is the only one that makes the budget go further rather than less far.

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
6. **There is no hard bound on how far a vertex may lie from the origin.** §1.8 puts the 64-unit bound on publishers and lets readers repair instead of reject, which is what ONOSENDAI does today: it grows the extent to fit, without a ceiling. That is safe for a client rendering its own author's work and unsafe as a general rule, since a payload of 512 vertices at 2^50 units is valid under this text and will produce a grid no renderer wants. Making the bound a reader obligation is a one-line change and would make the current client non-conformant until it is updated, which is why it is a question rather than a rule.

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

_This section is completed in the companion analysis; see the pull request discussion._
