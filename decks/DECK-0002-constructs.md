# DECK-0002: Constructs (Territory Claims)

DECK: 0002
Title: Constructs (Territory Claims)
Status: Draft
Created: 2026-03-07
Last updated: 2026-03-07
Requires: `CYBERSPACE_V2.md`

## Abstract
This DECK defines **constructs**: territory claims in cyberspace established by mining a Cantor number. Constructs identify cubic regions where persistent structures can exist.

## Terms
- **Construct:** A territory claim in cyberspace, identified by a Cantor subtree root.
- **Construct region:** A cubic region of `2^d × 2^d × 2^d` coordinates.
- **Construct depth (d):** The height of the Cantor subtree defining the region size.
- **Base coordinate:** The aligned corner coordinate of the construct's cube.
- **Mining proof:** Proof that work was expended to mine the construct.

## Discovery

Constructs MUST be discoverable via Nostr queries (NIP-01).

### Query Methods

Users can query for constructs by:
1. **Sector tags:** `X`, `Y`, `Z`, or `S` tags (per `CYBERSPACE_V2.md` §3)
2. **Coordinate prefix:** `H` tag (hex prefix of base coordinate)
3. **Exact coordinate:** `C` tag (full coord256 hex)
4. **Kind:** `kind = 331` (construct events)

### H Tag (Hex Prefix)

The `H` tag enables prefix-based discovery of nearby constructs.

**Definition:** The `H` tag contains the first `n` hexadecimal characters of the construct's base coordinate.

**Format:** `["H", "<hex_prefix>"]`

**Non-normative note:** The optimal prefix length `n` depends on the construct depth and desired query granularity. Deeper constructs have shorter meaningful prefixes.

**Discovery query example:**
```json
{
  "kinds": [331],
  "#H": ["a", "ab", "abc", "abcd"]
}
```

This query finds constructs whose base coordinate starts with any of the specified prefixes.

**Implementation note:** A full 64-character prefix query would have 64 elements totaling ~2080 characters. Clients should limit prefix depth based on bandwidth constraints.

## Region Definition

### Cubic Region

A construct at depth `d` covers a cubic region:

```
base_x = (x >> d) << d
base_y = (y >> d) << d
base_z = (z >> d) << d
```

All coordinates where:
```
base_x <= x < base_x + 2^d
base_y <= y < base_y + 2^d
base_z <= z < base_z + 2^d
```

**This is a cube in coordinate space.**

### Bounds Tags

Constructs MUST include bounds tags defining the cube boundaries:

**Format:**
```
["bounds",
  "x- <base_x>",
  "x+ <base_x + 2^d - 1>",
  "y- <base_y>",
  "y+ <base_y + 2^d - 1>",
  "z- <base_z>",
  "z+ <base_z + 2^d - 1>"
]
```

Each bound represents a plane perpendicular to the axis at the specified coordinate.

**Example (depth 8):**
```
["bounds",
  "x- 12345",
  "x+ 12592",
  "y- 34567",
  "y+ 34814",
  "z- 56789",
  "z+ 57036"
]
```

**Note:** All values are base-10 integers. The cube has side length `2^d`.

## Construct Event (Normative)

**Event kind:** `kind = 331`

**Required tags:**
- `C` tag: `["C", "<coord_hex>"]` - base coordinate (32-byte hex, aligned)
- `d` tag: `["d", "<depth>"]` - construct depth (base-10 string)
- `H` tag: `["H", "<hex_prefix>"]` - hex prefix for discovery
- `bounds` tag: `["bounds", ...]` - cube boundaries (6 planes)
- `sector` tags: `X`, `Y`, `Z`, `S` (per `CYBERSPACE_V2.md` §3)
- `proof` tag: `["proof", "<mining_proof>"]` - mining proof (format TBD)

**Optional tags:**
- `content` tag: `["content", "<content_ref>"]` - reference to construct content
- `owner` tag: `["owner", "<pubkey>"]` - owner pubkey (defaults to event author)

## Cantor Number

The construct's Cantor number is the region's subtree root:

```
region_root = compute_subtree_cantor(base_x, base_y, base_z, d)
```

This is the same computation as movement proofs (`CYBERSPACE_V2.md` §5.4).

## Mining Proof (TBD)

To establish a construct, the claimant must prove they did work.

**Open questions:**
1. What form should the mining proof take?
2. How much work should be required?
3. Can verification be asymmetric (cheap to verify, expensive to produce)?

## Asymmetric Verification (Open Problem)

**Goal:** Verify construct legitimacy without computing the full Cantor tree.

**Challenge:** Cyberspace protocol is symmetric thus far - verification requires the same work as production.

**Possible approaches:**
1. Merkle proofs for the tree path
2. Partial proofs with spot-checking
3. Trust-on-discovery with challenge system
4. Different proof structure supporting asymmetric verification

**This is undefined and needs iteration.**

## Overlap Resolution (Normative)

If two constructs overlap:

1. **Same region (same base, same depth):** Earlier `created_at` wins.
2. **Overlapping regions, different depths:** Deeper construct wins for its region.

## Expiration (Undefined)

**Open questions:**
1. Should constructs expire?
2. If so, what mechanism? (block height, maintenance, challenge)
3. What happens to content on expiration?

## Example (Non-Normative)

```json
{
  "kind": 331,
  "content": "",
  "tags": [
    ["C", "1234567890abcdef..."],
    ["d", "8"],
    ["H", "1234"],
    ["bounds",
      "x- 10000",
      "x+ 10255",
      "y- 20000",
      "y+ 20255",
      "z- 30000",
      "z+ 30255"
    ],
    ["X", "123"],
    ["Y", "456"],
    ["Z", "789"],
    ["S", "123-456-789"],
    ["proof", "..."]
  ],
  "pubkey": "<owner_pubkey>",
  "created_at": 1703232000
}
```

## Open Questions

1. **Mining proof format:** What work is required?
2. **Asymmetric verification:** How to verify without full computation?
3. **Expiration:** Should constructs expire? How?
4. **Content:** What can constructs contain?
5. **H tag optimization:** What prefix length is optimal?

---

**XOR 👾**