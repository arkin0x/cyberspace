# DECK-0001: Hyperjumps (Bitcoin block Merkle-root teleports)

DECK: 0001
Title: Hyperjumps (Bitcoin block Merkle-root teleports)
Status: Draft
Created: 2026-02-28
Last updated: 2026-03-22
Requires: `CYBERSPACE_V2.md`

## Abstract
This DECK defines **hyperjumps**: a zero-movement-proof teleport mechanism between special coordinates derived from Bitcoin blocks.

A Bitcoin block's Merkle root is treated as a thermodynamically "paid for" random coordinate in Cyberspace. By publishing these blocks as Nostr events (block anchor events), avatars can visit a growing network of unpredictable but far-reaching transit points. Each hyperjump coordinate emits three axis-aligned lines through its position; an avatar may enter the hyperjump network by hopping onto any point on any such line, reducing the entry cost from a three-axis proximity problem to two axes.

## Terms
- Hyperjump: a protocol-defined teleport action between two hyperjump coordinates that reuses Bitcoin proof-of-work rather than requiring a Cyberspace v2 movement proof.
- Hyperjump coordinate: a coord256 derived deterministically from a Bitcoin block's Merkle root.
- Block anchor event: a Nostr event that binds Bitcoin block identifiers to the corresponding hyperjump coordinate so clients can discover nearby hyperjumps via Nostr queries.
- Hyperjump axis line: one of the three axis-aligned lines passing through a hyperjump coordinate. Each hyperjump emits one line per spatial axis (X, Y, Z). A point lies on a hyperjump's axis line if it shares the hyperjump coordinate's values on the two non-free axes exactly. Axis lines define the catchment area of a hyperjump: an avatar may enter the hyperjump network by hopping onto any point on any of its three axis lines.

## Specification

### Hyperjump coordinate derivation (normative)
Given a Bitcoin block's Merkle root (`merkle_root`):
- Let `coord_hex = merkle_root` (32 bytes, lowercase hex, no `0x` prefix).
- Let `coord256 = int(coord_hex, 16)`.
- The hyperjump coordinate is `coord256`, interpreted as a Cyberspace coordinate per `CYBERSPACE_V2.md` §2.

Notes:
- This uses the Merkle root as presented in standard big-endian hex form (as commonly shown in block explorers). Implementations MUST agree on this endianness.
- The plane bit is the least significant bit of `coord256` (per `CYBERSPACE_V2.md` §2.1). Therefore hyperjumps may exist in either plane.

### Hyperjump axis lines (normative)

Each hyperjump coordinate `C` with decoded axis values `(Cx, Cy, Cz)` (per `CYBERSPACE_V2.md` §2) defines three axis-aligned lines through `C`:

- **X-line:** the set of all coordinates `(x, Cy, Cz)` for any `x` in `[0, 2^85)`.
- **Y-line:** the set of all coordinates `(Cx, y, Cz)` for any `y` in `[0, 2^85)`.
- **Z-line:** the set of all coordinates `(Cx, Cy, z)` for any `z` in `[0, 2^85)`.

A coordinate lies on an axis line if and only if its two non-free axis values are **exactly equal** to the corresponding values of the hyperjump coordinate. No approximation or tolerance is defined; membership is exact.

These three lines form the **catchment area** of a hyperjump: an avatar may enter the hyperjump at `C` by first performing a standard hop (with a full hop proof) landing on any point of any of its three axis lines.

Non-normative note: Because the free axis contributes zero work to the hop proof (see `CYBERSPACE_V2.md` §5.3), hopping onto an axis line entry point costs work proportional to the two non-free axis LCA heights only. This reduces the entry problem from three simultaneous axis constraints to two, lowering the minimum achievable hop cost by approximately 4 bits of LCA relative to hopping directly to `C`.

### Block anchor events (hyperjump publishing)
Hyperjump coordinates are discoverable conveniently via Nostr by querying **block anchor events** (kind 321) that bind Bitcoin block identifiers to their Merkle-root-derived coordinate. The accuracy of block anchor events on nostr is not guaranteed, so you may want to publish your own or derive block anchors from your own bitcoin node.

#### Event kind
- Block anchor events: `kind = 321`

#### Required tags (normative)
Block anchor events MUST include:
- `C` tag: `["C", "<coord_hex>"]` where `<coord_hex>` is the Merkle-root-derived hyperjump coordinate
- sector tags: `X`, `Y`, `Z`, `S` (per `CYBERSPACE_V2.md` §3), computed from the hyperjump coordinate
- `B` tag: `["B", "<height>"]` where `<height>` is the Bitcoin block height (base-10 string)
- `H` tag: `["H", "<block_hash_hex>"]` (32-byte lowercase hex string)
- `P` tag: `["P", "<prev_block_hash_hex>"]` (32-byte lowercase hex string)

Block anchor events SHOULD include:
- `net` tag: `["net", "<bitcoin_network>"]` where `<bitcoin_network>` is one of `mainnet`, `testnet`, `signet`, `regtest`.
  - If omitted, implementations SHOULD assume `mainnet`.
- `N` tag: `["N", "<next_block_hash_hex>"]` once the next block is known

#### Validation of anchor events (normative)
To verify a block anchor event as valid for hyperjumping, an implementation MUST verify that:
1. Its `C` tag matches the Merkle root of the block at height `B` on the Bitcoin network the client is using (or the network specified by the anchor event's `net` tag, if present).
2. Its `H` tag is the corresponding block hash.
3. Its `P` tag is the corresponding previous block hash.

How an implementation performs this validation is out of scope (full node, headers-only/SPV, trusted checkpoints, etc.), but the resulting `(height, block_hash, merkle_root)` bindings MUST match Bitcoin consensus for the selected network.

### Hyperjump movement events
A hyperjump action is represented as a movement event (`kind=3333`) in the avatar's movement chain (`CYBERSPACE_V2.md` §6) with action tag `["A", "hyperjump"]`.

#### Hyperjump movement event (normative)
Required tags:
- `A` tag: `["A", "hyperjump"]`
- `e` genesis: `["e", "<spawn_event_id>", "", "genesis"]`
- `e` previous: `["e", "<previous_event_id>", "", "previous"]`
- `c` tag: `["c", "<prev_coord_hex>"]`
- `C` tag: `["C", "<coord_hex>"]` (the destination hyperjump coordinate)
- `B` tag: `["B", "<to_height>"]` where `<to_height>` is the destination Bitcoin block height (base-10 string)
- sector tags: `X`, `Y`, `Z`, `S` (per `CYBERSPACE_V2.md` §3), computed from the destination coordinate

Optional tags:
- `net` tag: `["net", "<bitcoin_network>"]` where `<bitcoin_network>` is one of `mainnet`, `testnet`, `signet`, `regtest`.
  - If omitted, implementations SHOULD assume `mainnet`.
- `e` hyperjump-to: `["e", "<to_anchor_event_id>", "", "hyperjump_to"]` (a `kind=321` anchor event for the destination block)
- `e` hyperjump-from: `["e", "<from_anchor_event_id>", "", "hyperjump_from"]` (a `kind=321` anchor event for the origin block)

Prohibited tags:
- Hyperjump events MUST NOT include a `proof` tag. (They are not validated using `CYBERSPACE_V2.md` §5 / §6.5.)

Behavioral constraints:
- `prev_coord_hex` MUST be either (a) a valid hyperjump coordinate (i.e., it corresponds to the `C` tag of at least one valid block anchor event), or (b) a point lying on one of the three axis lines of a valid hyperjump (i.e., its decoded axis values share exactly two of the three axis values of some valid hyperjump coordinate, with the third axis value varying freely).
- `<coord_hex>` MUST equal the hyperjump coordinate for block height `<to_height>` on the selected Bitcoin network. (Destination is always a hyperjump coordinate `C`, never an intermediate axis-line point.)

Non-normative note:
- An avatar enters the hyperjump network by performing a standard hop (`CYBERSPACE_V2.md` §6.4) whose destination lies on any of a hyperjump's three axis lines (see §Hyperjump axis lines). Landing on an axis line is sufficient to issue a hyperjump action; no additional hop to `C` is required. Alternatively, an avatar may hop directly to `C` itself to enter; both paths are valid.
- An avatar exits the hyperjump network by performing a standard hop from the destination hyperjump coordinate `C`. Exit always originates at `C`, regardless of which axis line (or `C` directly) was used for entry at the origin hyperjump.

#### Hyperjump verification summary (normative)
To verify a hyperjump event:
1. Verify it is `kind=3333` and includes `["A","hyperjump"]`.
2. Verify its chain structure (`e` genesis + `e` previous) as in `CYBERSPACE_V2.md` §6.
3. Verify that the previous movement event's `C` tag equals this event's `c` tag.
4. Verify that `c` is a valid hyperjump entry point: either (a) `c` is a valid hyperjump coordinate (matches the `C` tag of at least one valid block anchor event), or (b) the decoded axis values of `c` lie on one of the three axis lines of a valid hyperjump coordinate — i.e., there exists a valid block anchor event whose hyperjump coordinate shares exactly two of the three per-axis values with `c`.
5. Resolve the destination block height from the event's `B` tag and derive the expected destination coordinate using the Bitcoin network implied by the event's `net` tag (or `mainnet` if omitted).
6. Accept iff the expected destination coordinate equals the event's `C`.

Optional shortcut (non-normative):
- If `hyperjump_to` is present, the verifier may instead validate that referenced anchor event and compare its `C` directly.

## Example (non-normative)
This example shows:
1. A published block anchor event (`kind=321`) that makes a hyperjump coordinate discoverable.
2a. A normal hop (`A=hop`) that moves directly onto a hyperjump coordinate `C` (requires a `proof` tag).
2b. Alternatively: a normal hop onto a point on the hyperjump's X-axis line, using only Y and Z proximity work.
3. A hyperjump (`A=hyperjump`) from a line entry point (or `C`) to another hyperjump's `C` (no `proof` tag).
4. A normal hop (`A=hop`) exiting from the destination hyperjump coordinate `C` into surrounding space.

Example block anchor event for Bitcoin block height `1606` (abridged fields; tags shown in full).
The hyperjump coordinate `C` = `744193...` decodes to axis values X=`11846810334975873`, Y=`19088986011188665`, Z=`27231467915017080`.
Its three axis lines are:
- X-line: all coordinates with Y=`19088986011188665` and Z=`27231467915017080`, any X
- Y-line: all coordinates with X=`11846810334975873` and Z=`27231467915017080`, any Y
- Z-line: all coordinates with X=`11846810334975873` and Y=`19088986011188665`, any Z

```json
{
  "kind": 321,
  "content": "Block 1606",
  "tags": [
    ["C", "744193479b55674c02dec4ed73581eafbd7e2db03442360c9c34f9394031ee8f"],
    ["X", "11846810334975873"],
    ["Y", "19088986011188665"],
    ["Z", "27231467915017080"],
    ["S", "11846810334975873-19088986011188665-27231467915017080"],
    ["H", "000000005d388d74f4b9da705c4a977b5aa53f88746f6286988f9f139dba2a99"],
    ["P", "00000000ba96f7cee624d66be83099df295a1daac50dd99e4315328aa7d43e77"],
    ["N", "00000000fc33b76de0621880e0cad2f6bd24e48250c461258dc8c6a6a3253c7a"],
    ["B", "1606"]
  ]
}
```

Example 2a — movement hop directly onto the hyperjump coordinate (three-axis proof):
```json
{
  "kind": 3333,
  "content": "",
  "tags": [
    ["A", "hop"],
    ["e", "<spawn_event_id>", "", "genesis"],
    ["e", "<previous_event_id>", "", "previous"],
    ["c", "<prev_coord_hex>"],
    ["C", "744193479b55674c02dec4ed73581eafbd7e2db03442360c9c34f9394031ee8f"],
    ["proof", "<proof_hash_hex>"],
    ["X", "11846810334975873"],
    ["Y", "19088986011188665"],
    ["Z", "27231467915017080"],
    ["S", "11846810334975873-19088986011188665-27231467915017080"]
  ]
}
```

Example 2b — movement hop onto a point on the X-axis line (two-axis proof; avatar's own X coordinate used, Y and Z match the hyperjump):
Here `<x_line_entry_coord_hex>` is the encoding of (avatarX, 19088986011188665, 27231467915017080) — a point on the X-line.
The proof covers only the Y and Z axis distances; the X axis root contributes zero work (LCA_x = 0).
```json
{
  "kind": 3333,
  "content": "",
  "tags": [
    ["A", "hop"],
    ["e", "<spawn_event_id>", "", "genesis"],
    ["e", "<previous_event_id>", "", "previous"],
    ["c", "<prev_coord_hex>"],
    ["C", "<x_line_entry_coord_hex>"],
    ["proof", "<proof_hash_hex>"],
    ["X", "<avatarX_sector>"],
    ["Y", "19088986011188665"],
    ["Z", "27231467915017080"],
    ["S", "<avatarX_sector>-19088986011188665-27231467915017080"]
  ]
}
```

Example 3 — hyperjump from the X-line entry point (or from `C` directly) to height `1602` (no `proof` tag):
```json
{
  "kind": 3333,
  "content": "",
  "tags": [
    ["A", "hyperjump"],
    ["e", "<spawn_event_id>", "", "genesis"],
    ["e", "<previous_event_id>", "", "previous"],
    ["c", "<x_line_entry_coord_hex>"],
    ["C", "42adcf1bc1976b02f66d5a33ab41946e7152f9b7ec08046a51625d443092e8cb"],
    ["B", "1602"],
    ["e", "<anchor_event_id_for_1606>", "", "hyperjump_from"],
    ["e", "<anchor_event_id_for_1602>", "", "hyperjump_to"],
    ["X", "6397583792183907"],
    ["Y", "22152908496923134"],
    ["Z", "5507206459976287"],
    ["S", "6397583792183907-22152908496923134-5507206459976287"]
  ]
}
```

Example 4 — hop exiting the hyperjump system from the destination `C` into surrounding space (standard hop, three-axis proof):
```json
{
  "kind": 3333,
  "content": "",
  "tags": [
    ["A", "hop"],
    ["e", "<spawn_event_id>", "", "genesis"],
    ["e", "<previous_event_id>", "", "previous"],
    ["c", "42adcf1bc1976b02f66d5a33ab41946e7152f9b7ec08046a51625d443092e8cb"],
    ["C", "<destination_coord_hex>"],
    ["proof", "<proof_hash_hex>"],
    ["X", "<dest_X_sector>"],
    ["Y", "<dest_Y_sector>"],
    ["Z", "<dest_Z_sector>"],
    ["S", "<dest_X_sector>-<dest_Y_sector>-<dest_Z_sector>"]
  ]
}
```
