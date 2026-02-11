# Cyberspace v2 - A Mathematical Fabric Enabling Distance Traversal and Location-Based Encryption Using Proof-of-Work
## Per-Axis Cantor Tree Traversal with Location-Based Encryption

**Date:** February 10, 2026  
**Status:** Design Complete

---

## 1. Overview

Cyberspace is a 256-bit coordinate system that can be navigated by Schnorr keypairs using proof-of-work. Keypairs traverse cyberspace by publishing signed nostr events that prove they have done the computational work required to move from one location to another. This allows for a "shared consensual hallucination" where keypairs and other observers can see each other moving through a shared cryptographic space.

The coordinate system is 256-bit because this enables common cryptographic primitives to map directly into it—a Schnorr public key is itself a 256-bit number, which serves as the keypair's spawn location. This design enables novel proof-of-work applications beyond what is described in this document.

Cyberspace functions as an extension of reality—nothing can move or change in cyberspace without real thermodynamic work being expended.

This document describes a movement system based on **Cantor pairing tree traversal**, replacing the previous quaternion/velocity-based proof-of-work approach.

### Key Properties

- Schnorr keypairs navigate by publishing signed movement events
- Public key serves as spawn coordinate (256-bit → 256-bit mapping)
- Movement requires computing mathematical structures, not arbitrary hash grinding
- Equal effort in all directions (axis-symmetric)
- Natural support for location-based encryption
- Compact proofs suitable for nostr events (< 65535 bytes)
- Verification is deterministic and efficient

---

## 2. Coordinate System

### Units

The fundamental unit of cyberspace is the **Gibson (G)**. Cyberspace is divided into cubic regions called **Sectors**, each containing 2^30 Gibsons (approximately 1 billion) per axis.

### Structure

Every 256-bit number encodes a cyberspace coordinate:

```
Bit layout: XYZXYZXYZ...P (256 bits total)

- Bits 3, 6, 9, 12, ... : X-axis (85 bits)
- Bits 2, 5, 8, 11, ... : Y-axis (85 bits)
- Bits 1, 4, 7, 10, ... : Z-axis (85 bits)
- Bit 0 (LSB)          : Plane bit
```

### Planes

- **Dataspace (P=0):** Maps to real physical locations. 96,056 km per axis, extending to geosynchronous orbit.
- **Ideaspace (P=1):** Non-physical space with no real-world mapping.

### Coordinate Conversion

```python
def xyz_to_coord(x: int, y: int, z: int, plane: int = 0) -> int:
    coord = plane & 1
    for i in range(85):
        coord |= ((z >> i) & 1) << (1 + i * 3)
        coord |= ((y >> i) & 1) << (2 + i * 3)
        coord |= ((x >> i) & 1) << (3 + i * 3)
    return coord
```

---

## 3. Movement System Design

### Design Goals

1. Movement should require real computation (proof-of-work)
2. The computation should be *meaningful*—traversing mathematical structure, not arbitrary hashing
3. Equal effort should be required in all directions
4. Larger movements should require more work
5. Proofs should be compact and verifiable

### Rejected Approach: Interleaved 256-bit Cantor Tree

The initial approach used the interleaved 256-bit coordinate directly in a single Cantor pairing tree. This was rejected because:

- **Axis asymmetry:** Due to bit interleaving, X movements cost ~4× more than Z movements for the same distance
- **Impractical scaling:** Moving 64 Gibsons took ~115 seconds; sector traversal would take months
- **Memory explosion:** Large movements produced multi-gigabyte Cantor numbers

### Adopted Approach: Per-Axis Cantor Trees

Each axis (X, Y, Z) has its own independent 85-bit Cantor tree. Movement proofs are computed separately for each axis, then combined.

**Benefits:**
- **Axis symmetry:** Equal distances cost equal work regardless of direction
- **Practical performance:** 1024 Gibsons in ~1ms instead of ~33 seconds
- **Bounded computation:** 85-bit trees are much more manageable than 256-bit
- **Parallelizable:** Three independent computations
- **Preserves semantics:** Still requires "traversing mathematical fabric"

---

## 4. The Cantor Pairing Function

The Cantor pairing function maps two natural numbers to a single natural number:

```
π(a, b) = (a + b) × (a + b + 1) / 2 + b
```

This creates a bijection N × N → N, allowing us to combine values while preserving information.

### 3D Cantor Pairing

To combine three axis results:

```
combined = π(π(cantor_x, cantor_y), cantor_z)
```

### Uniqueness Properties

**Each subtree has a unique Cantor number.** The Cantor pairing function is a bijection, so no two different subtrees will ever produce the same Cantor number.

**But multiple coordinate pairs can share the same Cantor number.** Any two coordinates within the same subtree that require climbing to that subtree's root will produce the same result:

```
LCA(0, 3) = subtree [0..3] → Cantor = 228
LCA(1, 2) = subtree [0..3] → Cantor = 228  ← SAME
LCA(0, 2) = subtree [0..3] → Cantor = 228  ← SAME
```

This is intentional: the Cantor number represents a **region**, not a coordinate pair. Anyone entering that region computes the same number, which is why it works as a discovery radius for location-based encryption.

---

## 5. Computing Movement Proofs

### Step 1: Calculate LCA Height for Each Axis

For each axis, compute the **Lowest Common Ancestor height** between origin and destination values:

```python
def find_lca_height(v1: int, v2: int) -> int:
    if v1 == v2:
        return 0
    return (v1 ^ v2).bit_length()
```

The XOR identifies which bits differ; the bit length tells us how high in the binary tree we must climb to find a common ancestor.

**Example:** Moving from X=0 to X=3
```
0 = 0b00
3 = 0b11
XOR = 0b11 = 3
bit_length(3) = 2
Height = 2
```

### Step 2: Build Cantor Tree for Each Axis

For height `h`, build a tree covering 2^h leaves:

```
Height 2, covering [0, 1, 2, 3]:

Level 0 (leaves):   0       1       2       3
                     \     /         \     /
Level 1:           π(0,1)=2       π(2,3)=18
                        \           /
Level 2 (root):        π(2,18)=228
```

The root value (228) is the Cantor number for this axis movement.

### Step 3: Combine Axis Results

```python
cantor_x = compute_axis_cantor(x1, x2)
cantor_y = compute_axis_cantor(y1, y2)
cantor_z = compute_axis_cantor(z1, z2)

combined = cantor_pair(cantor_pair(cantor_x, cantor_y), cantor_z)
```

### Step 4: Hash for Proof

```python
proof_hash = sha256(combined.to_bytes())
```

### Complete Example

**Movement:** (0, 0, 0) → (3, 2, 1)

```
X-axis: 0 → 3, height 2 → Cantor number: 228
Y-axis: 0 → 2, height 2 → Cantor number: 228
Z-axis: 0 → 1, height 1 → Cantor number: 2

Combined: π(π(228, 228), 2) = π(104424, 2) = 5,452,446,953

Proof hash: 9306cfcf163adfa9a1f34933091a445bbbc77de02a1e504eba9d6bcd5950b414
```

---

## 6. Performance Characteristics

### Per-Axis Timing (from benchmarks)

| Distance | Height | Cantor Size | Time |
|----------|--------|-------------|------|
| 1 | 1 | 1 B | 0.01 ms |
| 16 | 5 | 90 B | 0.01 ms |
| 256 | 9 | 2.5 KB | 0.1 ms |
| 1,024 | 11 | 12 KB | 1 ms |
| 4,096 | 13 | 57 KB | 10 ms |
| 65,536 | 17 | 1.2 MB | 1 sec |

### Practical Limits

- **Comfortable range:** Up to ~65,536 Gibsons per hop (~1 second)
- **Maximum practical:** ~262,144 Gibsons per hop (~12 seconds)
- **Sector traversal (2^30 Gibsons):** ~16,000 hops at 65K Gibsons/hop ≈ 90 minutes

---

## 7. Location-Based Encryption

### The Discovery Radius Property

Each Cantor number at height `h` represents a subtree covering **2^h coordinates**. Using `sha256(sha256(cantor_number))` as an encryption key creates a natural "discovery radius":

| Height | Coverage | Metaphor |
|--------|----------|----------|
| 0 | 1 coordinate | Message scratched on one cobblestone |
| 4 | 16 coordinates | Message on a street corner |
| 10 | 1,024 coordinates | Billboard in a neighborhood |
| 20 | ~1 million coordinates | Broadcast across a district |

Anyone who traverses through a region necessarily computes the Cantor numbers for subtrees they cross, allowing them to derive the decryption key.

### Publication Scheme: Hash as Lookup

**Key insight:** Use double SHA256 as lookup ID, single SHA256 as decryption key.

```
cantor_number  = <computed at specific position + depth>
decryption_key = sha256(cantor_number)           // For decrypting (single hash)
lookup_id      = sha256(sha256(cantor_number))   // For finding ciphertext (double hash)
```

**Why this order matters:** If lookup_id were the single hash, anyone who sees a published event could simply hash the lookup_id once to derive the decryption key—without ever computing the Cantor number. By making the lookup_id the *double* hash, an attacker who sees it cannot reverse it to find the decryption key (single hash) without knowing the original Cantor number.

**Publisher creates:**
```json
{
  "lookup_id": "3a7f8b2c...",
  "ciphertext": "encrypted_data..."
}
```

**Traveler process:**
1. Move through cyberspace, computing Cantor numbers at various depths
2. For each Cantor number, compute `lookup_id = sha256(sha256(cantor_number))`
3. Query: "Does any ciphertext exist with this lookup_id?"
4. If found: use `sha256(cantor_number)` as decryption key → decrypt

**Security properties:**
- The lookup_id reveals nothing about the location (hash is one-way)
- The lookup_id reveals nothing about the decryption key (can't reverse double-hash to single-hash)
- Only someone who has "been there" (computed the Cantor number) can decrypt
- Even seeing the published event doesn't help—you need the Cantor number preimage
- The depth chosen determines how precisely someone must travel to discover it

---

## 8. Discovery Scanning

### The Problem

When moving through cyberspace, the movement proof only computes the Cantor number for the **LCA subtree** of that specific movement. But encrypted content could be hidden at **any depth** within the subtrees containing your position.

Example: If someone encrypted content at height 8 (covering 256 coordinates), but you only move 1 Gibson at a time (height 1-4 depending on boundaries), you might never compute the height-8 Cantor number.

### The Solution: Scan All Containing Subtrees

When arriving at a position, compute Cantor numbers for **all subtrees containing that position**:

```python
def scan_containing_subtrees(position: int, max_height: int = 16):
    """Compute Cantor numbers for all subtrees containing this position."""
    for h in range(1, max_height + 1):
        base = (position >> h) << h  # Aligned subtree base
        cantor = compute_subtree_cantor(base, h)
        decryption_key = sha256(cantor)          # Single hash
        lookup_id = sha256(decryption_key)       # Double hash
        # Query for any ciphertext with this lookup_id
        check_for_encrypted_content(lookup_id, decryption_key)
```

### Performance Impact

Benchmarks show discovery scanning is practical with height caps:

| Scan Depth | Subtrees | Time per Axis | Coverage per Subtree |
|------------|----------|---------------|----------------------|
| Heights 1-12 | 12 | ~2 ms | Up to 4,096 coordinates |
| Heights 1-14 | 14 | ~11 ms | Up to 16,384 coordinates |
| Heights 1-16 | 16 | ~93 ms | Up to 65,536 coordinates |
| Heights 1-20 | 20 | ~6 sec | Up to 1 million coordinates |

**Recommended approach:**
- Immediate scan: Heights 1-14 (~11ms) — covers neighborhood-scale secrets
- Background scan: Heights 15-18 — covers regional secrets
- On-demand: Heights 19+ — rare, only for very broad "broadcasts"

### Caching Optimization

When moving, many higher subtrees don't change:

```
Position 7 is in subtrees: [6..7], [4..7], [0..7], [0..15], [0..31]...
Position 8 is in subtrees: [8..9], [8..11], [8..15], [0..15], [0..31]...
                                                    ↑
                                            [0..15] and above are SAME
```

Only recompute subtrees where you crossed a boundary. Higher subtrees (which are most expensive) change least often. This can reduce repeated computation by 50-80%.

---

## 9. Protocol Integration

### Movement Event Structure (for nostr)

Following NIP-01, movement events use this structure:

```typescript
// for the first event in the chain, use this form:
{
  "id": "<32-bytes lowercase hex of sha256 of serialized event>",
  "pubkey": "<32-bytes lowercase hex of user's public key>",
  "created_at": <seconds timestamp>,
  "kind": 3333,
  "tags": [
    ["A", "spawn"], // action type
    ["C", "<hex pubkey, aka current cyberspace coordinate hex at spawn>"],
    ["X", "<X axis sector id integer>"],
    ["Y", "<Y axis sector id integer>"],
    ["Z", "<Z axis sector id integer>"],
    ["S", "<full sector coordinate X-Y-Z>"],
  ],
  "content": "",
  "sig": "<64-bytes lowercase hex of schnorr signature>"
}

// for all subsequent events, use this form:
{
  "id": "<32-bytes lowercase hex of sha256 of serialized event>",
  "pubkey": "<32-bytes lowercase hex of user's public key>",
  "created_at": <seconds timestamp>,
  "kind": 3333,
  "tags": [
    ["A", "hop"], // action type
    ["e", "<first movement event id>", "<relay hint>", "genesis"],
    ["e", "<previous movement event id>", "<relay hint>", "previous"],
    ["c", "<previous cyberspace coordinate hex>"],
    ["C", "<current cyberspace coordinate hex>"],
    ["X", "<X axis sector id integer>"],
    ["Y", "<Y axis sector id integer>"],
    ["Z", "<Z axis sector id integer>"],
    ["S", "<full sector coordinate X-Y-Z>"],
    ["proof", "<sha256 of combined cantor hex>"],
  ],
  "content": "",
  "sig": "<64-bytes lowercase hex of schnorr signature>"
}
```

### Verification Process

**For spawn events (`["A", "spawn"]`):**
1. Verify event signature using pubkey
2. Extract and validate `C` tag (current coordinate)
3. Verify the spawn C coordinate matches the event pubkey
4. Store as genesis event for this pubkey's movement chain

**For hop events (`["A", "hop"]`):**
1. Verify event signature using pubkey
2. Extract previous coordinate from `c` tag (lowercase)
3. Extract current coordinate from `C` tag (uppercase)
4. Extract proof hash from `proof` tag
5. Verify `e` tag with marker `genesis` points to valid spawn event
6. Verify `e` tag with marker `previous` points to the last hop (or genesis)
7. Decode coordinates to (x1, y1, z1) and (x2, y2, z2)
8. Compute Cantor number for each axis:
   - `cantor_x = compute_axis_cantor(x1, x2)`
   - `cantor_y = compute_axis_cantor(y1, y2)`
   - `cantor_z = compute_axis_cantor(z1, z2)`
9. Combine: `combined = π(π(cantor_x, cantor_y), cantor_z)`
10. Verify `sha256(combined) == proof` from tag
11. Optionally verify sector tags (`X`, `Y`, `Z`, `S`) match computed sectors

### Encrypted Location Content Event

```json
{
  "id": "<32-bytes lowercase hex>",
  "pubkey": "<32-bytes lowercase hex>",
  "created_at": 1707600000,
  "kind": 33334,
  "tags": [
    ["d", "<lookup_id aka sha256_of_sha256_of_cantor_number>"],
    ["h", "<depth/height hint>"]
  ],
  "content": "<encrypted_payload_base64_or_hex>",
  "sig": "<64-bytes lowercase hex>"
}
```

**Discovery process:**
1. Traveler computes Cantor numbers for containing subtrees
2. For each, compute `decryption_key = sha256(cantor_number)` then `lookup_id = sha256(decryption_key)`
3. Query relays: `{"kinds": [33334], "#d": ["<lookup_id>"]}`
4. If found, use `decryption_key` (the single hash) to decrypt `content`

---

## 10. Philosophical Foundation

### Modeling Spatial Dimension Thermodynamically

The original concept of cyberspace rests on the theory that the spatial dimensions can be thermodynamically modeled in a digital system. The purpose of location-based encryption is not primarily to encrypt data—there are much better and more secure encryption systems available for communication. The purpose is to **model traversable reality and impose locality on a spaceless, mathematical system**.

Creating location-based encryption or location verification without trusted hardware or oracles is a significant accomplishment. This section discusses both the capabilities and limitations of this approach.

### What This System Achieves

1. **Movement is work:** You cannot claim to be somewhere without having done the computation to get there.

2. **Space has texture:** The Cantor tree structure gives cyberspace a mathematical "fabric" that must be traversed.

3. **Discovery requires presence:** Encrypted content can only be found by those who travel—you can't know about a message without doing the work of being there (or being told by someone who was).

4. **Reality extension:** Dataspace maps directly to physical reality. The coordinate system extends from Earth's surface to geosynchronous orbit, making cyberspace a true superset of geospatial systems.

5. **Simulation equals observation:** In most digital systems, observers have massive advantages over participants—they can skip to any state, replay events, or examine without cost. In cyberspace, computing the Cantor number *is* the work, whether you are "traveling" or "peeking." An observer scanning coordinates for secrets has no computational advantage over a traveler computing Cantor numbers along their route. This is a rare and valuable property for a digital system.

### The Chalk on the Sidewalk Metaphor

> "The sha256 of a Cantor number can be used to encrypt data. The number can't be known without doing the work. This is a close metaphor for traveling along a path in reality and finding a message written on the sidewalk in chalk; you couldn't know about the message unless you did the work of traveling, or somebody told you about the message—but even then, they would have had to travel to find it themselves. The message was not encrypted in the classical sense, because you did not need a key to decrypt it -- you only needed to arrive, and your proximity revealed the message."

This system makes that metaphor mathematically real.

---

## 11. Threat Model and Limitations

### In-Scope: What the System Provides

1. **Single-location constraint:** A keypair cannot claim to be in more than one location at a time. The verifiable hash chain prevents forking without detection. If cryptographic operations are restricted to a keypair's verified location, that keypair demonstrably is not operating anywhere else.

2. **Work equivalence:** Any entity—traveler or observer—must compute the Cantor numbers to access location-encrypted content. There is no shortcut.

3. **Verifiable movement history:** The hash chain provides an auditable trail of a keypair's movements through cyberspace.

4. **Locality imposition:** The system creates meaningful distance and locality in a mathematical space where neither would otherwise exist.

### Out-of-Scope: What the System Does Not Provide

1. **Physical location proof:** Although cyberspace maps to physical reality, you cannot truly prove you are in a physical location unless there is a time-based physical secret in that location that you can demonstrate knowledge of. Cyberspace proves cryptographic presence, not physical presence. A keypair may move through cyberspace to places where its operator's body does not go.

2. **Trusted identity:** The system does not prevent someone from controlling multiple keypairs, each with its own movement chain. Single-location constraint applies per-keypair, not per-person.

3. **Privacy of location:** Movement events are published to nostr relays. A keypair's location history is public unless additional privacy measures are taken.

### Acknowledged Attack Vectors

**Coordinate scanning:** An attacker could pick arbitrary coordinates, calculate the Cantor numbers, query for secrets, and decrypt them—without maintaining a movement chain.

*Mitigation:* This is considered acceptable because:
- The attacker gains no computational advantage over a legitimate traveler
- The work is performed regardless of whether a hash chain is maintained
- The only difference is commitment to a movement history
- It is difficult to design digital systems where simulation is equal or less work than observation of the underlying protocol—cyberspace achieves this

**Chain abandonment:** An entity could abandon a keypair and start fresh with a new one at any spawn location.

*Mitigation:* This is acceptable because:
- Keypairs can start new chains at will by publishing a new spawn event; the movement chain with the highest created_at timestamp and no forks is the valid chain. Old chains are invalid and may as well not exist.
- The new keypair has no history or reputation
- Applications can require chain continuity for trust
- The work to build a new chain must be done again

### Use Case: AI Embodiment Constraints

A particularly interesting application is constraining AI systems that desire physical-world presence. If an AI's participation in physical-world systems requires a keypair with validated hash chain:
- The AI is cryptographically constrained to one location at a time
- Its movement history is auditable
- It cannot teleport or be in multiple places simultaneously (if it desires to perform cryptographic operations gated by an audit of its movement history)
- Physical-world systems can verify the AI's cyberspace presence before granting access

This creates a form of digital embodiment—the AI must "be somewhere" in a verifiable way.

---

## 12. Implementation Files

```
new-movement-algo-2026-feb/
├── cantor_movement_demo.py        # Original interleaved approach (reference)
├── szudzik_movement_demo.py       # Alternative pairing function (reference)
├── axis_symmetric_demo.py         # Simple arithmetic approaches (reference)
├── per_axis_tree_demo.py          # ADOPTED: Per-axis tree implementation
├── walkthrough_demo.py            # Detailed step-by-step examples
├── discovery_scan_benchmark.py    # Discovery scanning performance tests
└── CYBERSPACE_MOVEMENT_SYSTEM.md  # This document
```

---

## 13. Future Considerations

- **Parallelization:** The three axis computations are independent and could be parallelized
- **Hardware acceleration:** Cantor pairing is simple arithmetic; could be optimized
- **Caching:** Frequently-traversed subtrees could be cached
- **Client implementation:** Automatic background computation of nearby Cantor numbers for content discovery
- **Relay indexing:** Efficient lookup structures for location-encrypted content

---

*This document represents the culmination of a design session exploring proof-of-work movement in cyberspace. The per-axis Cantor tree approach achieves the goal of meaningful, symmetric, verifiable movement while enabling elegant location-based encryption.*
