# DECK-0001: Hyperjumps (Bitcoin block Merkle-root teleports)

DECK: 0001
Title: Hyperjumps (Bitcoin block Merkle-root teleports)
Status: Draft
Created: 2026-02-28
Last updated: 2026-02-28
Requires: `CYBERSPACE_V2.md`

## Abstract
This DECK defines **hyperjumps**: a zero-movement-proof teleport mechanism between special coordinates derived from Bitcoin blocks.

A Bitcoin block’s Merkle root is treated as a thermodynamically “paid for” random coordinate in Cyberspace. By publishing these blocks as Nostr events (block anchor events), clients can discover a growing network of unpredictable transit points.

## Terms
- Hyperjump: a protocol-defined teleport between two hyperjump coordinates that reuses Bitcoin proof-of-work rather than requiring a Cyberspace v2 movement proof.
- Hyperjump coordinate: a coord256 derived deterministically from a Bitcoin block’s Merkle root.
- Block anchor event: a Nostr event that binds Bitcoin block identifiers to the corresponding hyperjump coordinate so clients can discover hyperjumps via Nostr queries.

## Specification

### Hyperjump coordinate derivation (normative)
Given a Bitcoin block’s Merkle root (`merkle_root`):
- Let `coord_hex = merkle_root` (32 bytes, lowercase hex, no `0x` prefix).
- Let `coord256 = int(coord_hex, 16)`.
- The hyperjump coordinate is `coord256`, interpreted as a Cyberspace coordinate per `CYBERSPACE_V2.md` §2.

Notes:
- This uses the Merkle root as presented in standard big-endian hex form (as commonly shown in block explorers). Implementations MUST agree on this endianness.
- The plane bit is the least significant bit of `coord256` (per `CYBERSPACE_V2.md` §2.1). Therefore hyperjumps may exist in either plane.

### Block anchor events (hyperjump publishing)
Hyperjump coordinates are discoverable via Nostr by publishing **block anchor events** that bind Bitcoin block identifiers to their Merkle-root-derived coordinate.

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
To accept a block anchor event as valid for hyperjumping, an implementation MUST verify that:
1. Its `C` tag matches the Merkle root of the block at height `B` on the Bitcoin network the client is using (or the network specified by the anchor event’s `net` tag, if present).
2. Its `H` tag is the corresponding block hash.
3. Its `P` tag is the corresponding previous block hash.

How an implementation performs this validation is out of scope (full node, headers-only/SPV, trusted checkpoints, etc.), but the resulting `(height, block_hash, merkle_root)` bindings MUST match Bitcoin consensus for the selected network.

### Hyperjump movement events
A hyperjump is represented as a movement event (`kind=3333`) in the avatar’s movement chain (`CYBERSPACE_V2.md` §6) with action tag `A=hyperjump`.

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
- `prev_coord_hex` MUST be a valid hyperjump coordinate (i.e., it MUST correspond to the `C` tag of at least one valid block anchor event).
- `<coord_hex>` MUST equal the hyperjump coordinate for block height `<to_height>` on the selected Bitcoin network.

Non-normative note:
- This design intentionally requires a normal hop (`CYBERSPACE_V2.md` §6.4) to enter the hyperjump network (i.e., to move onto a hyperjump coordinate in the first place).

#### Hyperjump verification summary (normative)
To verify a hyperjump event:
1. Verify it is `kind=3333` and includes `["A","hyperjump"]`.
2. Verify its chain structure (`e` genesis + `e` previous) as in `CYBERSPACE_V2.md` §6.
3. Verify that the previous movement event’s `C` tag equals this event’s `c` tag.
4. Verify that `c` is a valid hyperjump coordinate by resolving at least one valid block anchor event with `C=c`.
5. Resolve the destination block height from the event’s `B` tag and derive the expected destination coordinate using the Bitcoin network implied by the event’s `net` tag (or `mainnet` if omitted).
6. Accept iff the expected destination coordinate equals the event’s `C`.

Optional shortcut (non-normative):
- If `hyperjump_to` is present, the verifier may instead validate that referenced anchor event and compare its `C` directly.

## Example (non-normative)
This example shows:
1. A published block anchor event (`kind=321`) that makes a hyperjump coordinate discoverable.
2. A normal hop (`A=hop`) that moves onto a hyperjump coordinate (requires a `proof` tag).
3. A hyperjump (`A=hyperjump`) that moves from one hyperjump coordinate to another by choosing a destination block height (no `proof` tag).

Example block anchor event for Bitcoin block height `1606` (abridged fields; tags shown in full):
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

Example movement hop onto that hyperjump coordinate (requires standard hop validation):
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

Example hyperjump from height `1606` to height `1602` (no `proof` tag):
```json
{
  "kind": 3333,
  "content": "",
  "tags": [
    ["A", "hyperjump"],
    ["e", "<spawn_event_id>", "", "genesis"],
    ["e", "<previous_event_id>", "", "previous"],
    ["c", "744193479b55674c02dec4ed73581eafbd7e2db03442360c9c34f9394031ee8f"],
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
