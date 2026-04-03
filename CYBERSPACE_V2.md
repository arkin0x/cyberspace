# Cyberspace v2: Protocol Specification

**Date:** February 10, 2026
**Last updated:** April 2, 2026
**Status:** Design complete (spec); reference implementation in progress

---

## What This Document Is

This is the canonical specification for the Cyberspace Protocol, version 2.

Cyberspace is a 256-bit coordinate system navigated by cryptographic keypairs using structured mathematical computation. It is not a game, not a platform, and not a virtual reality experience. It is a **protocol**: a specification for how to encode, prove, and verify spatial relationships using irreversible computational work.

The goal is simple: impose **locality**, the fundamental property of physical space, on a digital system. In physical space, crossing distance costs energy, and no one is exempt from that cost. Cyberspace does the same thing, but with computation instead of physics. Movement requires mathematical work. The work scales with distance. There are no shortcuts, no teleportation, no administrator who can move you or delete you. The math is the same for everyone.

This document specifies:
- A 256-bit coordinate system with three spatial axes and a plane bit
- How cryptographic identity maps directly into the coordinate fabric (your public key is your location)
- Three movement primitives: **spawn** (identity placement), **hop** (Cantor pairing tree proof), and **sidestep** (Merkle hash tree proof for storage-infeasible boundaries)
- A temporal work axis that prevents proof caching and replay
- Location-based encryption and discovery derived from stable spatial regions
- Integration with Nostr as the transmission layer
- A deterministic mapping from GPS coordinates into the coordinate system

Normative sections use RFC-style language (MUST/SHOULD/MAY). Explanatory material is labeled **non-normative**.

Reference implementation: https://github.com/arkin0x/cyberspace-cli

For extended design rationale and philosophical discussion, see [`RATIONALE.md`](https://github.com/arkin0x/cyberspace/blob/master/RATIONALE.md) (non-normative).

---

## Table of Contents

- [1. Overview: Why This Exists](#1-overview--why-this-exists)
  - [1.1 The problem](#11-the-problem)
  - [1.2 The approach](#12-the-approach)
  - [1.3 Key properties](#13-key-properties)
- [2. The Coordinate System](#2-the-coordinate-system)
  - [2.1 A 256-bit universe](#21-a-256-bit-universe)
  - [2.2 Bit layout (normative)](#22-bit-layout-normative)
  - [2.3 Reference pseudocode](#23-reference-pseudocode)
  - [2.4 Two planes: dataspace and ideaspace](#24-two-planes-dataspace-and-ideaspace)
- [3. Identity Is Location](#3-identity-is-location)
  - [3.1 Your key is your coordinate](#31-your-key-is-your-coordinate)
  - [3.2 The spawn event](#32-the-spawn-event)
- [4. Movement: Cantor Pairing Trees](#4-movement--cantor-pairing-trees)
  - [4.1 Why structured work, not hash grinding](#41-why-structured-work-not-hash-grinding)
  - [4.2 The Cantor pairing function](#42-the-cantor-pairing-function)
  - [4.3 Per-axis trees](#43-per-axis-trees)
  - [4.4 Lowest common ancestor (LCA) height](#44-lowest-common-ancestor-lca-height)
  - [4.5 Aligned subtrees](#45-aligned-subtrees)
  - [4.6 Computing the axis root](#46-computing-the-axis-root)
  - [4.7 Combining into 3D (region_n)](#47-combining-into-3d-region_n)
  - [4.8 Why you can't cheat distance (decomposition invariance)](#48-why-you-cant-cheat-distance-decomposition-invariance)
  - [4.9 Five properties unique to this design (non-normative)](#49-five-properties-unique-to-this-design-non-normative)
- [5. The Temporal Axis: Every Hop Costs Fresh Work](#5-the-temporal-axis--every-hop-costs-fresh-work)
  - [5.1 The problem: cacheable spatial roots](#51-the-problem-cacheable-spatial-roots)
  - [5.2 Terrain-derived temporal height K (normative)](#52-terrain-derived-temporal-height-k-normative)
  - [5.3 Temporal axis seed and root (normative)](#53-temporal-axis-seed-and-root-normative)
  - [5.4 The 4D hop preimage](#54-the-4d-hop-preimage)
  - [5.5 Integer→bytes encoding (normative)](#55-integerbytes-encoding-normative)
  - [5.6 Movement proof hash (normative)](#56-movement-proof-hash-normative)
  - [5.7 Worked example (non-normative)](#57-worked-example-non-normative)
  - [5.8 Performance expectations (non-normative)](#58-performance-expectations-non-normative)
- [6. The Wall and the Sidestep](#6-the-wall-and-the-sidestep)
  - [6.1 The storage bottleneck (non-normative)](#61-the-storage-bottleneck-non-normative)
  - [6.2 How the sidestep works](#62-how-the-sidestep-works)
  - [6.3 Sidestep geometry (normative)](#63-sidestep-geometry-normative)
  - [6.4 Per-axis Merkle root (normative)](#64-per-axis-merkle-root-normative)
  - [6.5 Streaming computation (normative)](#65-streaming-computation-normative)
  - [6.6 Spatial region integer (region_m)](#66-spatial-region-integer-region_m)
  - [6.7 Temporal binding](#67-temporal-binding)
  - [6.8 Sidestep proof hash (normative)](#68-sidestep-proof-hash-normative)
  - [6.9 Multi-axis sidestep](#69-multi-axis-sidestep)
  - [6.10 Merkle inclusion proof](#610-merkle-inclusion-proof)
  - [6.11 Verification levels](#611-verification-levels)
  - [6.12 Entering ≠ claiming (non-normative)](#612-entering--claiming-non-normative)
  - [6.13 Natural continents (non-normative)](#613-natural-continents-non-normative)
  - [6.14 Performance expectations (non-normative)](#614-performance-expectations-non-normative)
- [7. Location-Based Encryption and Discovery](#7-location-based-encryption-and-discovery)
  - [7.1 The purpose: chalk on the sidewalk (non-normative)](#71-the-purpose-chalk-on-the-sidewalk-non-normative)
  - [7.2 Key derivation (normative)](#72-key-derivation-normative)
  - [7.3 Discovery radius (non-normative)](#73-discovery-radius-non-normative)
  - [7.4 Discovery scanning (recommended)](#74-discovery-scanning-recommended)
  - [7.5 Caching optimization (non-normative)](#75-caching-optimization-non-normative)
- [8. Nostr Integration: The Movement Chain](#8-nostr-integration--the-movement-chain)
  - [8.1 Event kind](#81-event-kind)
  - [8.2 Canonical event id (NIP-01)](#82-canonical-event-id-nip-01)
  - [8.3 Spawn event (first event)](#83-spawn-event-first-event)
  - [8.4 Hop event](#84-hop-event)
  - [8.5 Sidestep event](#85-sidestep-event)
  - [8.6 Encrypted content event](#86-encrypted-content-event)
  - [8.7 Verification summary](#87-verification-summary)
  - [8.8 Core action types summary](#88-core-action-types-summary)
  - [8.9 Protocol extensions (DECKs)](#89-protocol-extensions-decks)
- [9. Mapping to Physical Reality: GPS and Dataspace](#9-mapping-to-physical-reality--gps-and-dataspace)
  - [9.1 Why a physical mapping exists](#91-why-a-physical-mapping-exists)
  - [9.2 Dataspace cube size (Cantor Height 34 scale)](#92-dataspace-cube-size-cantor-height-34-scale)
  - [9.3 Scale rationale (non-normative)](#93-scale-rationale-non-normative)
  - [9.4 Axis naming convention (ECEF → Cyberspace)](#94-axis-naming-convention-ecef--cyberspace)
  - [9.5 Canonical spec version and deterministic arithmetic](#95-canonical-spec-version-and-deterministic-arithmetic)
  - [9.6 Altitude handling (normative)](#96-altitude-handling-normative)
  - [9.7 Canonical mapping algorithm (normative)](#97-canonical-mapping-algorithm-normative)
  - [9.8 Golden vectors (consensus locks)](#98-golden-vectors-consensus-locks)
  - [9.9 Consumer benchmarks (non-normative)](#99-consumer-benchmarks-non-normative)
  - [9.10 Nation-state limits (non-normative)](#910-nation-state-limits-non-normative)
  - [9.11 Storage as the primary constraint (non-normative)](#911-storage-as-the-primary-constraint-non-normative)
- [10. Sectors and Spatial Querying](#10-sectors-and-spatial-querying)
- [11. Visualization Conventions](#11-visualization-conventions)
  - [11.1 Handedness and axis semantics](#111-handedness-and-axis-semantics)
  - [11.2 Black sun reference marker](#112-black-sun-reference-marker)
  - [11.3 Camera convention ("facing the black sun")](#113-camera-convention-facing-the-black-sun)
  - [11.4 Engine adaptation](#114-engine-adaptation)
- [12. Limitations and Threat Model (non-normative)](#12-limitations-and-threat-model-non-normative)
- [13. Structured Proof-of-Work (non-normative)](#13-structured-proof-of-work-non-normative)
- [14. Reference Implementation](#14-reference-implementation)

---

## 1. Overview: Why This Exists

### 1.1 The problem

Every digital system that calls itself a "space" (virtual worlds, social platforms, VR environments, cloud services) shares a fundamental limitation: they are owned. Every one of them has an administrator who can move you, delete you, change the rules, or shut the whole thing down. Your "presence" in any of these systems exists only because someone permits it.

This isn't a flaw in specific products. It's a consequence of how they're built. They are **permissioned** systems. And permissioned systems are not space. They are services.

Physical space works differently. It imposes costs that nobody can cheat. Not governments, not corporations, not anyone. The cost is thermodynamic: paid in energy, irreversibly, to the universe itself. This is the deepest kind of fairness: not fairness by agreement (which can be broken), but fairness by physics (which cannot).

### 1.2 The approach

Cyberspace imposes the same constraint, irreversible computational work, on a 256-bit coordinate system. Movement requires computing mathematical structures called Cantor pairing trees, whose cost scales with the distance crossed. The work is not arbitrary hash grinding; it is the computation of the actual mathematical fabric between coordinates. The proof of your movement *is* the mathematics of the region you crossed.

Keypairs traverse Cyberspace by publishing signed Nostr events that commit to their movement history. Each event includes a proof derived from the Cantor tree computation, creating an auditable chain of verified movement.

### 1.3 Key properties

- **Public key = spawn coordinate:** your cryptographic identity maps directly into the coordinate fabric. Where you start is determined by who you are.
- **Three movement primitives:** spawn (identity placement), hop (Cantor pairing tree proof), and sidestep (Merkle hash tree proof for storage-infeasible boundaries).
- **Hash chain continuity:** each movement event references the previous one by its cryptographic hash, forming a linear chain of signed proofs. This chain is the keypair's verifiable movement history and ensures every hop costs fresh work that cannot be cached or replayed.
- **Axis symmetry:** equal distances cost equal work regardless of direction.
- **Location-based encryption:** keys derive from stable spatial region preimages, enabling content that can only be decrypted by those who do the work to be "there."
- **Compact and deterministic:** proofs fit in Nostr events and verify efficiently.

This v2 design replaces earlier drift/quaternion/velocity approaches (deprecated).

---

## 2. The Coordinate System

### 2.1 A 256-bit universe

Cyberspace exists in a 256-bit integer space. This number was not chosen arbitrarily. 256-bit numbers are the standard unit of work in cryptographic systems like SHA-256, Nostr, and Bitcoin. Working in 256 bits means the coordinate system is natively compatible with the tools that power the rest of the protocol.

Those 256 bits are divided into:
- **Three spatial axes:** X, Y, and Z, each **85 bits** wide (an unsigned integer from 0 to 2^85 - 1)
- **One plane bit:** the least significant bit, which selects between dataspace (0) and ideaspace (1)

That accounts for 85 × 3 + 1 = 256 bits exactly.

**Core terms:**
- **Coordinate (coord256):** A 256-bit integer encoding X/Y/Z plus the plane bit.
- **Axes (u85):** X, Y, Z are 85-bit unsigned integers.
- **Plane:** 1 bit. `0 = dataspace` (physical mapping), `1 = ideaspace` (non-physical).
- **Gibson (G):** The fundamental unit of distance, equal to one axis step in u85 space.

### 2.2 Bit layout (normative)

The three axes are **interleaved** into the 256-bit integer, not packed sequentially. This means the bits alternate: an X bit, then a Y bit, then a Z bit, repeating 85 times.

Specifically:
- Bit `0` (LSB): plane bit `P`
- Bits `3, 6, 9, ...` (every 3rd bit starting at 3): X bits (85 bits)
- Bits `2, 5, 8, ...` (every 3rd bit starting at 2): Y bits (85 bits)
- Bits `1, 4, 7, ...` (every 3rd bit starting at 1): Z bits (85 bits)

The result looks like: `XYZXYZXYZ...P`

The interleaving has an important consequence: coordinates that are spatially close share similar bit prefixes. This is what makes the Cantor pairing tree work efficiently, because nearby coordinates fall into the same aligned subtrees.

### 2.3 Reference pseudocode

```python
AXIS_BITS = 85

def xyz_to_coord(x: int, y: int, z: int, plane: int = 0) -> int:
    coord = plane & 1
    for i in range(AXIS_BITS):
        coord |= ((z >> i) & 1) << (1 + i * 3)
        coord |= ((y >> i) & 1) << (2 + i * 3)
        coord |= ((x >> i) & 1) << (3 + i * 3)
    return coord

def coord_to_xyz(coord: int) -> tuple[int,int,int,int]:
    plane = coord & 1
    x = y = z = 0
    for i in range(AXIS_BITS):
        z |= ((coord >> (1 + i * 3)) & 1) << i
        y |= ((coord >> (2 + i * 3)) & 1) << i
        x |= ((coord >> (3 + i * 3)) & 1) << i
    return (x, y, z, plane)
```

### 2.4 Two planes: dataspace and ideaspace

The plane bit creates two overlapping coordinate spaces:

- **Dataspace (plane = 0):** Maps to physical reality via GPS coordinates (see §9). The same X/Y/Z values in dataspace correspond to specific physical locations on and around Earth.
- **Ideaspace (plane = 1):** Has no physical mapping. The same X/Y/Z values are purely abstract positions. Ideaspace is where things exist that have no physical counterpart.

Both planes share the same mathematical properties. Movement costs, encryption, and discovery all work identically. They differ only in whether the coordinates have a physical-world interpretation.

---

## 3. Identity Is Location

### 3.1 Your key is your coordinate

One of the most distinctive properties of Cyberspace is that your cryptographic identity determines your spawn location. Your Nostr public key, the 256-bit number that *is* your identity, is also your coordinate. When you first enter Cyberspace, you appear at the point defined by your key.

You don't choose where to spawn. Your identity chooses for you.

This means identity and location are the same thing. Not metaphorically, but mathematically. Your key encodes a specific X, Y, Z position. If someone knows your public key, they know where you spawn. If you want a different spawn point, you need a different identity.

**Implication:** In every other digital system, identity and location are separate concerns managed by separate authorities. In Cyberspace, the mapping from identity to space is deterministic, public, and permanent. No authority assigns locations. No registry tracks who is where. The math does it.

### 3.2 The spawn event

A spawn event is a signed Nostr event that declares "I exist at this coordinate." It is the first event in a keypair's movement chain. The coordinate in a spawn event MUST equal the event's public key (see §8.3 for the full event format).

After spawning, a keypair can begin moving through Cyberspace by publishing hop or sidestep events that extend the chain.

A keypair may also **respawn** at any time by simply publishing a new spawn event. Because the new spawn event has a newer timestamp, it invalidates all prior movement events in the old chain. The keypair returns to its original spawn coordinate and starts fresh. Prior movement history remains on relays but is no longer part of the active chain.

---

## 4. Movement: Cantor Pairing Trees

This is the heart of the protocol. Everything else (encryption, discovery, territory, transit) builds on top of the movement system. So it's worth understanding not just *how* it works, but *why* it works this way.

### 4.1 Why structured work, not hash grinding

Standard proof-of-work (like Bitcoin mining) works by grinding random numbers until you find a hash that meets a difficulty target. The work is real. You burn energy. But the work is **arbitrary**. You're searching a hash space, not traversing a space. Finding nonce #4,821,337 doesn't tell you anything about where you are or where you went.

Cyberspace needs work that is **structural**: work where the computation itself encodes spatial information. The proof of movement should not be "I burned energy" but "I computed the mathematical fabric between these two coordinates."

Cantor pairing trees achieve this. They create actual mathematical structure: each root uniquely represents a specific region of coordinate space. Computing it means building a tree from leaves to root. The number you produce is mathematically meaningful, not arbitrary. This is the difference between "digging a hole" and "following a path." Both cost energy, but only one has spatial semantics.

### 4.2 The Cantor pairing function

The Cantor pairing function takes two natural numbers and produces exactly one:

`π(a, b) = (a + b) × (a + b + 1) / 2 + b`

This function is a **bijection**: every pair of numbers maps to exactly one output, and every output maps back to exactly one pair. This is not an approximation or a hash. It is a lossless mathematical encoding. Crucially, the function can be reversed. Given any Cantor number, you can unpair it to recover the two numbers that produced it. Applied recursively, this means a single Cantor root encodes an entire tree and that tree can be fully reconstructed from the root alone.

When applied recursively (pairing leaves into parents, parents into grandparents, all the way up) it builds a binary tree whose root is a single number that uniquely encodes every leaf in the tree.

### 4.3 Per-axis trees

An earlier version of Cyberspace used the full interleaved 256-bit coordinate in a single Cantor tree. This was elegant in theory but failed in practice:

- **Axis asymmetry:** Due to bit interleaving, X movements cost ~4× more than Z movements for the same distance. The protocol would privilege certain directions.
- **Impractical scaling:** Moving 64 Gibsons took ~115 seconds. Sector traversal would take months.
- **Memory explosion:** Large movements produced multi-gigabyte Cantor numbers.

The v2 solution: each axis (X, Y, Z) gets its own independent 85-bit Cantor tree. Movement proofs are computed separately per axis, then combined. This gives:

- **Axis symmetry:** Equal distances cost equal work regardless of direction.
- **Practical performance:** 1,024 Gibsons in ~1ms instead of ~33 seconds.
- **Bounded computation:** 85-bit trees are manageable.
- **Parallelizable:** Three independent computations can run in parallel.

### 4.4 Lowest common ancestor (LCA) height

When you move from one position to another along a single axis, the cost of that movement depends on which **binary boundary** you cross. The Lowest Common Ancestor (LCA) height captures this: it is the level in a binary tree where the paths from the two positions first diverge.

For a 1D axis movement between `v1` and `v2`:

```python
def find_lca_height(v1: int, v2: int) -> int:
    if v1 == v2:
        return 0
    return (v1 ^ v2).bit_length()
```

The LCA height determines how much work is required: the Cantor tree you need to compute has `2^h` leaves, where `h` is the LCA height.

An important subtlety: the LCA height is not simply a measure of distance in Gibsons. It depends on *which boundary you cross*, not just how far you move. A move of 1,024 Gibsons within a single aligned region might have the same LCA height as a move of 1 Gibson that happens to cross a large power-of-two boundary.

Consider two single-Gibson moves that have very different costs:

- Moving from position 4 to position 5: `4 ^ 5 = 1`, bit_length = 1, so `h = 1`. This is cheap. You are staying within a small aligned block.
- Moving from position 7 to position 8: `7 ^ 8 = 15`, bit_length = 4, so `h = 4`. This costs 16 times as many Cantor pairs, even though you only moved 1 Gibson. The reason is that position 8 sits on the boundary of a height-4 aligned subtree, and crossing that boundary requires computing the entire subtree.

At the extreme: moving from position `2^34 - 1` to position `2^34` is a single-Gibson step, but the LCA height is 34. That one step requires computing a Cantor tree with over 17 billion leaves, because you are crossing the largest binary boundary in that region of the axis.

This is not a quirk. It is the core mechanism by which Cyberspace imposes locality. Boundaries in the binary structure of the coordinate space act as natural walls, and crossing them costs real work regardless of how small the step is. This property is formalized as decomposition invariance in §4.8.

### 4.5 Aligned subtrees

Before defining aligned subtrees formally, it is worth understanding why they exist and what problem they solve.

When two coordinates are paired into a Cantor tree, the tree must cover a specific range of leaf values. If we allowed the tree to start at any arbitrary position, then two different movements through the same neighborhood could produce different trees with different roots. There would be no stable "regions." Every pair of coordinates would generate its own unique tree, and no two people would agree on what a region looks like or what its identifier is.

Alignment solves this by snapping tree boundaries to power-of-two positions in the coordinate space. An aligned subtree of height `h` always starts at a position that is a multiple of `2^h` and always covers exactly `2^h` consecutive leaves. This means the boundaries are fixed and universal. Everyone agrees on where the blocks are, because the blocks are determined by the math, not by anyone's specific movement. Two people standing in the same neighborhood will compute the same Cantor root without ever communicating, because they are both computing the root of the same aligned subtree.

This property is what makes location-based encryption work (§7). It is what makes spatial consensus happen automatically. Without alignment, there is no consensus about what a region is, and the entire discovery and encryption system falls apart.

**Formal definition:** An **aligned subtree** of height `h` is a binary subtree whose base is a multiple of `2^h`. Think of it like a base address: the subtree "owns" a block of `2^h` leaves, and the base tells you where that block starts.

For any value `v` and height `h`:
- `base = (v >> h) << h` (the aligned base)
- The subtree spans `2^h` consecutive leaves: `[base, base+1, ..., base + 2^h - 1]`

For movement between `v1` and `v2`, the **covering aligned subtree** is the smallest aligned subtree that contains both endpoints:
- `h = find_lca_height(v1, v2)`
- `base = (v1 >> h) << h` (equivalently `(v2 >> h) << h`)

**Example:** Moving from 0 to 5:
- `h = find_lca_height(0, 5) = 3` (because `0 ^ 5 = 5`, bit_length = 3)
- `base = (0 >> 3) << 3 = 0`
- Aligned subtree covers leaves `[0, 1, 2, 3, 4, 5, 6, 7]` (8 leaves = `2^3`)

**Example:** Moving from 4 to 7:
- `h = find_lca_height(4, 7) = 2` (because `4 ^ 7 = 3`, bit_length = 2)
- `base = (4 >> 2) << 2 = 4`
- Aligned subtree covers leaves `[4, 5, 6, 7]` (4 leaves = `2^2`)

The alignment property is what make

... [OUTPUT TRUNCATED - 178 chars omitted out of 50178 total] ...

Merkle tree from scratch. This costs the same order of work as the original proof.

**Security model:** The protocol does NOT require every verifier to perform Level 2. Security relies on **deterministic fraud detectability**: the Merkle root for any aligned subtree is deterministic, so a fraudulent root is permanently and objectively detectable by any party willing to do the work. Since sidestep proofs are published on Nostr (public, persistent), fraud can be detected at any time.

In practice, Level 1 is for routine validation. Level 2 is for auditors, competitors, or automated fraud-detection services.

### 6.12 Entering ≠ claiming (non-normative)

The sidestep Merkle tree is built over SHA-256 hashes of leaf coordinates. The Cantor pairing tree over those same leaves produces a completely different value. Computing the Merkle root reveals **nothing** about the Cantor root.

This preserves a critical separation: **sidestepping into a region does not grant domain authority.** Domain authority still requires full Cantor root computation. A visitor who sidesteps through a wall has proven they spent the computational time to cross it, but they haven't gained any authority over the space. You can walk into a building without having the keys.

This is desirable: it creates a natural asymmetry between residents (who have invested in Cantor computation) and visitors (who have done the minimum work to cross the boundary).

### 6.13 Natural continents (non-normative)

The combination of Cantor hops and Merkle sidesteps creates emergent geography in the coordinate space:

- **h ≤ ~35:** Crossable by hop on consumer hardware (seconds to minutes)
- **h35–50:** Crossable by sidestep on consumer hardware (hours to months)
- **h50–58:** Crossable by sidestep with cloud compute investment ($200–$1,000)
- **h60+:** Not crossable by any direct computation. Requires hyperjump transit

Nobody designed these continents. They emerge from the interaction between the Cantor pairing function, SHA-256, and the physical limits of computation and storage. Different agents experience different continental boundaries depending on their hardware and patience. There is no single universal map of "passable" and "impassable" walls.

No arbitrary ceiling is designed. The boundary emerges from thermodynamics.

### 6.14 Performance expectations (non-normative)

Sidestep cost is dominated by SHA-256 leaf hashing. At every height where both hop and sidestep are feasible, the hop is approximately 100× faster:

| LCA Height | Hop Time (Cantor) | Sidestep Time (Merkle) | Preferred |
|---:|---:|---:|---|
| h20 | ~2 ms | ~210 ms | Hop |
| h30 | ~1 sec | ~22 sec | Hop |
| h34 | ~17 sec | ~6 min | Hop (170 GB storage needed) |
| h40 | ~18 min | ~6 hr | **Sidestep** (Cantor needs 11 TB) |
| h45 | ~10 hr | ~8 days | **Sidestep** (Cantor needs 340 TB) |
| h50 | ~2 weeks | ~37 weeks | **Sidestep** (Cantor needs 11 PB) |
| h55 | ~1 year | ~23 years | **Sidestep** (Cantor needs 340 PB) |
| h60 | IMPOSSIBLE | ~731 years | Hyperjump needed |

(Merkle times assume SHA-256 with SHA-NI at ~10⁸ hashes/sec. Cantor times assume ~10⁹ pairings/sec at low heights; upper heights are storage-limited. Ratio narrows at higher heights because Cantor per-operation cost increases with intermediate value size while SHA-256 stays fixed.)

The practical sidestep ceiling is ~h45–50 on consumer hardware (days to months). Cloud compute ($200–$1,000 budget) can extend this by 5–15 heights. Beyond ~h60, even sidesteps take centuries. Hyperjumps are required.

---

## 7. Location-Based Encryption and Discovery

### 7.1 The purpose: chalk on the sidewalk (non-normative)

The purpose of location-based encryption is not primarily secrecy. There are better cryptographic systems for secure communication. The purpose is to **model traversable reality**.

Consider a message written in chalk on a sidewalk:
- It is not "encrypted" in any technical sense
- Anyone who walks by can read it
- But you cannot read it without walking there
- Even if someone tells you about it, they had to walk there to know

This is location-gated access that requires no keys, no permissions, no infrastructure. Only presence.

Cyberspace implements this using region-derived keys. A ciphertext can be published publicly on Nostr, but deriving the decryption key requires computing the region preimage, which is the Cantor root for that spatial region. The work required is the same whether you traveled there via a movement chain or computed the region directly for an arbitrary coordinate. There is no free surveillance. Looking and walking cost the same.

### 7.2 Key derivation (normative)

Given a spatial region integer `region_n` (the 3D region identifier from §4.7 for some aligned region):

- `region_bytes = int_to_bytes_be_min(region_n)`
- `location_decryption_key = sha256(region_bytes)`
- `lookup_id = sha256(location_decryption_key)`

**Why two layers:** Seeing `lookup_id` (which is published to help people find the content) does not allow deriving `location_decryption_key` without the region preimage. The lookup ID is safe to publish; the decryption key requires work.

Note (non-normative): the temporal axis used for hop proofs (§5) is intentionally *not* included here. Location-based identifiers and keys remain a stable function of spatial regions. They do not change when someone moves through.

Outputs are 32-byte digests. When used in Nostr tags, they MUST be lowercase hex.

### 7.3 Discovery radius (non-normative)

Cantor subtree roots represent **aligned regions**. Choosing a subtree height implicitly chooses a discovery radius: how large an area the encrypted content is visible from.

At the Cantor Height 34 scale (2 meters per height-34 subtree), approximate physical scales are:

| Height | Leaves (per axis) | Physical scale | Metaphor |
|---:|---:|---|---|
| 0 | 1 | ~10⁻¹⁰ m | Atomic precision |
| 10 | 1,024 | ~0.1 μm | Microscopic |
| 20 | ~10⁶ | ~0.1 mm | Grain of sand |
| 30 | ~10⁹ | ~0.1 m | Hand-span |
| 34 | ~1.7×10¹⁰ | 2 m | Human height (canonical) |
| 40 | ~10¹² | 128 m | City block |
| 50 | ~10¹⁵ | 131 km | City region |

A local secret at height 34 is discoverable within ~2 meters. At height 50, from anywhere in a city.

**Important caveat:** Discovery requires *equivalent computation* to secret creation. Typical scanning range is between height 0 and 16 for sub-second continuous scanning on average consumer hardware. Secrets at larger regions may be unattainable without some hint to help users scan up to their height. As hardware improves, passive scanning range will grow and larger secret regions will become attainable.

The discovery radius grows exponentially with height, enabling a natural hierarchy of public, neighborhood, and intimate spatial messages.

### 7.4 Discovery scanning (recommended)

At a coordinate `(x,y,z)` you may scan nearby region keys by selecting heights `h = 1..H` and computing the aligned subtree base per axis:
- `bx = (x >> h) << h`
- `by = (y >> h) << h`
- `bz = (z >> h) << h`

For each `h`, compute per-axis subtree Cantor roots:
- `rx = compute_subtree_cantor(bx, h)`
- `ry = compute_subtree_cantor(by, h)`
- `rz = compute_subtree_cantor(bz, h)`

Combine to a 3D region integer:
- `region_n = π(π(rx, ry), rz)`

Then derive `lookup_id` per §7.2.

Implementations SHOULD cap `H` for interactive use and may cache values; higher subtrees change less frequently.

### 7.5 Caching optimization (non-normative)

When moving, many higher subtrees do not change between positions. This provides a significant optimization for applications that scan multiple discovery radii.

**Boundary crossing principle:** An aligned subtree of height `h` changes only if you cross a boundary at that height.

**Example (1D):** Moving from position 7 to position 8:
```
Height  Base (at pos 7)  Base (at pos 8)  Changed?
-------  ----------------  ----------------  --------
   0           7                 8           YES (boundary at 8)
   1           6                 8           YES (boundary at 8)
   2           4                 8           YES (boundary at 8)
   3           0                 8           YES (boundary at 8)
   4           0                 0           NO  (same [0..15])
   5           0                 0           NO  (same [0..31])
   ...         ...               ...         NO
```

Heights 4 and above are unchanged. Position 7 and 8 share the same `base` for h≥4.

**Boundary detection:**
```python
def subtree_changes(v1: int, v2: int, h: int) -> bool:
    return (v1 >> h) != (v2 >> h)
```

When `(v1 >> h) == (v2 >> h)`, both positions lie in the same aligned subtree, so the cached region key remains valid.

**Implementation strategy:**
```python
region_cache = {}  # height -> (base, region_key)

def get_region_key(x, y, z, h):
    bx = (x >> h) << h
    by = (y >> h) << h
    bz = (z >> h) << h

    if h in region_cache:
        cached_base, cached_key = region_cache[h]
        if (bx, by, bz) == cached_base:
            return cached_key  # Cache hit

    # Cache miss: compute and store
    region_key = compute_region_key(bx, by, bz, h)
    region_cache[h] = ((bx, by, bz), region_key)
    return region_key
```

**Performance implications:**
- Small moves: most heights remain cached; only recompute low heights
- Large moves: more heights change, but high heights often remain the same
- Continuous scanning: avoid recomputing all 50+ region keys on every position update

Note: this caching optimization applies to spatial region computations for discovery. Hop proofs still require computing the temporal axis root per §5 on every hop.

---

## 8. Nostr Integration: The Movement Chain

Cyberspace uses **Nostr** as its transmission layer. Movement is represented as a per-pubkey, linear hash chain of signed Nostr events. This means Cyberspace does not require new network infrastructure. It composes on top of existing relays.

The state of Cyberspace is the sum of all cyberspace-related Nostr events. Because Nostr is decentralized and permissionless, knowledge of global state is not possible, just as in physical reality.

### 8.1 Event kind

- Movement events: `kind = 3333`

### 8.2 Canonical event id (NIP-01)

The event `id` MUST be computed as NIP-01 canonical serialization:

- Serialize: `[0, pubkey, created_at, kind, tags, content]`
- Encode as UTF-8 JSON with no whitespace (equivalent to Python `json.dumps(..., separators=(",", ":"), ensure_ascii=False)`)
- Hash: `sha256(serialized_bytes)`

**Signature (`sig`):** For published events, `sig` MUST be a valid Schnorr signature over the event `id` as required by NIP-01.

Note: some prototypes may leave `sig` blank for local-only chains and sign at publish-time; that is not a wire-format requirement.

### 8.3 Spawn event (first event)

The spawn event declares "I exist at this coordinate." It is the first event in a keypair's movement chain.

Required tags:
- `A` tag: `["A", "spawn"]`
- `C` tag: `["C", "<coord_hex>"]`
  - `coord_hex` MUST be a 32-byte lowercase hex string (64 hex chars, no `0x` prefix)
  - For spawn events, `coord_hex` MUST equal the event `pubkey` (spawn coordinate)
- Sector tags: `X`, `Y`, `Z`, `S` (per §10)

### 8.4 Hop event

A hop event extends the movement chain by one Cantor pairing tree proof.

Required tags:
- `A` tag: `["A", "hop"]`
- `e` genesis: `["e", "<spawn_event_id>", "", "genesis"]`
- `e` previous: `["e", "<previous_event_id>", "", "previous"]`
- `c` tag: `["c", "<prev_coord_hex>"]` (32-byte lowercase hex string)
- `C` tag: `["C", "<coord_hex>"]` (32-byte lowercase hex string)
- `proof` tag: `["proof", "<proof_hash_hex>"]` (32-byte lowercase hex string)
- Sector tags: `X`, `Y`, `Z`, `S` (per §10)

### 8.5 Sidestep event

A sidestep event extends the movement chain by one Merkle hash tree boundary crossing.

Required tags:
- `A` tag: `["A", "sidestep"]`
- `e` genesis: `["e", "<spawn_event_id>", "", "genesis"]`
- `e` previous: `["e", "<previous_event_id>", "", "previous"]`
- `c` tag: `["c", "<prev_coord_hex>"]` (32-byte lowercase hex string)
- `C` tag: `["C", "<coord_hex>"]` (32-byte lowercase hex string)
- `proof` tag: `["proof", "<proof_hash_hex>"]` (32-byte lowercase hex string)
- `mr` tag: `["mr", "<M_x_hex>:<M_y_hex>:<M_z_hex>"]` (per-axis Merkle roots, colon-separated, each 64 hex chars)
- `mp` tag: `["mp", "<proof_x_hex>:<proof_y_hex>:<proof_z_hex>"]` (per-axis Merkle inclusion proofs, colon-separated)
- `hx` tag: `["hx", "<lca_height_x>"]` (LCA height on X axis, decimal string)
- `hy` tag: `["hy", "<lca_height_y>"]` (LCA height on Y axis, decimal string)
- `hz` tag: `["hz", "<lca_height_z>"]` (LCA height on Z axis, decimal string)
- Sector tags: `X`, `Y`, `Z`, `S` (per §10)

**Merkle inclusion proof encoding:** Each per-axis proof in the `mp` tag is a concatenation of sibling hashes from leaf to root, hex-encoded (`64 × h` hex characters per axis for an axis with LCA height `h`). For trivial axes (`h = 0`), the proof segment is an empty string between colons.

**Height tags:** The `hx`, `hy`, `hz` tags enable verifiers to determine expected proof lengths without re-deriving LCA heights from coordinates.

### 8.6 Encrypted content event

- Encrypted content events: `kind = 33330`

Required tags:
- `d` tag: `["d", "<lookup_id_hex>"]` (32-byte lowercase hex string)

Optional tags:
- `h` tag: `["h", "<height_hint>"]` (string integer)

The encryption algorithm and ciphertext encoding (base64 vs hex) are out of scope for this spec; only lookup and key derivation are specified.

### 8.7 Verification summary

#### 8.7.1 Hop verification

To verify a hop:
1. Parse previous and current coords; decode to `(x1,y1,z1,plane)` and `(x2,y2,z2,plane)`.
2. Plane changes are valid in v2; verifiers MUST support hops where `plane1 != plane2`.
3. Compute the stable spatial region integer `region_n` per §4.7.
4. Derive the terrain-based temporal height `K` from the destination coordinate `(x2,y2,z2,plane2)` per §5.2 (including the destination plane bit).
5. Compute the temporal axis root `cantor_t` from the hop event's `previous_event_id` (`e` tag with marker `previous`) and `K` per §5.3.
6. Compute `hop_n = π(region_n, cantor_t)` per §5.4.
7. Compute `proof_hash` per §5.6.
8. Accept iff it matches the event's `proof` tag.

#### 8.7.2 Sidestep verification (Level 1: inclusion path)

To verify a sidestep (Level 1, inclusion path check):
1. Parse previous and current coords; decode to `(x1,y1,z1,plane)` and `(x2,y2,z2,plane)`.
2. Validate crossing geometry: for each axis, confirm the destination is exactly 1 Gibson past the LCA boundary (§6.3). Verify the `hx`, `hy`, `hz` tags match the computed LCA heights.
3. Parse per-axis Merkle roots from the `mr` tag.
4. For each axis where movement occurs:
   a. Compute the destination leaf hash: `H_dest = SHA256(SIDESTEP_DOMAIN || int_to_bytes_be_min(v_dest))`
   b. Parse the axis inclusion proof from the `mp` tag.
   c. Verify the Merkle path from `H_dest` to the claimed root `M_axis`.
5. Compute `region_m = π(π(mx, my), mz)` from the claimed Merkle roots (§6.6).
6. Derive `K` and `cantor_t` from destination coordinate and `previous_event_id` (§6.7, same as hop).
7. Compute `sidestep_n = π(region_m, cantor_t)` and `proof_hash` per §6.8.
8. Accept iff it matches the event's `proof` tag.

Level 2 (full root) verification is described in §6.11.

### 8.8 Core action types summary

The base Cyberspace v2 protocol defines three movement action types:

| `A` tag value | Description | Proof type | Defined in |
|---|---|---|---|
| `spawn` | Identity placement at pubkey-derived coordinate | None (identity proof) | §8.3 |
| `hop` | Movement via Cantor pairing tree | Cantor root (§4.6) | §8.4 |
| `sidestep` | Boundary crossing via Merkle hash tree | Merkle root (§6.4) | §8.5 |

All three use event `kind = 3333`.

### 8.9 Protocol extensions (DECKs)

This specification defines the base Cyberspace v2 protocol.

Optional extensions MAY introduce new event kinds, new movement action types (`A` tag values), and/or additional validation rules that are only applied when an extension is in use.

Extensions are specified as **Design Extension and Compatibility Kits (DECKs)** in the `decks/` directory.
- Hyperjumps extension: `decks/DECK-0001-hyperjumps.md`

---

## 9. Mapping to Physical Reality: GPS and Dataspace

### 9.1 Why a physical mapping exists

Dataspace (`plane=0`) maps WGS84 GPS coordinates (latitude/longitude/altitude) into the u85 axis space. This creates a cryptographic overlay on the physical world where Cyberspace coordinates correspond to actual locations on and around Earth.

This mapping is **consensus-critical**: if multiple clients are expected to agree on the same coord256 for a given GPS point, they must all use the exact same deterministic algorithm.

The mapping applies only to dataspace. Ideaspace (`plane=1`) has no GPS mapping.

### 9.2 Dataspace cube size (Cantor Height 34 scale)

The Cantor Height 34 scale defines the relationship between dataspace coordinates and physical distances:

- **Full axis length:** ~4.5 trillion kilometers (~0.48 light-years)
- **Half axis length:** ~2.25 trillion kilometers
- **Gibson size:** ~1.16×10⁻¹⁰ meters (approximately the diameter of a hydrogen atom)
- **Cantor Height 34 = 2 meters** (the canonical scale parameter)

This scale provides "atomic" granularity in dataspace while maintaining axis extents that vastly exceed the geosynchronous orbit requirement. The universe starts small and extends far.

### 9.3 Scale rationale (non-normative)

The Cantor Height 34 scale was chosen through rigorous testing to balance several concerns:

**For consumers:** At this scale, consumer hardware can traverse human-centric distances and derive useful location-based secrets with significant but achievable effort. Moderate cloud compute expenditure ($200–$1,000) extends range substantially.

**Against nation-states:** Even with unlimited resources, a nation-state cannot derive the Cantor root for a whole national territory, continent, Earth, or geosynchronous orbit for the foreseeable future (~100 years). The best a nation-state can do is capture a whole city or part of a metropolis. The primary bottleneck is data storage, which rapidly approaches all storage on Earth long before any sizable territory could be calculated.

**Aesthetics:**
- 2 meters is a metaphor for the human scale of the universe
- Cantor Height 34 / 85-bit axis = 34/85 = 0.4 = 2/5, a rational and memorable relationship
- Cantor Height 33 = 1 meter
- 1 Gibson is roughly the size of a hydrogen atom, the first atomic element

**No difficulty adjustment.** Unlike Bitcoin, Cyberspace has no difficulty adjustment mechanism. The scale is fixed by mathematical definition. A coordinate's Cantor tree is deterministic. It cannot be made "harder" without changing the coordinate itself. As technology advances, all parties gain greater computation and storage, gradually increasing the scale of territorial claims over time. The base protocol remains stable; difficulty migrates upward through extension mechanisms (DECKs) over decades.

### 9.4 Axis naming convention (ECEF → Cyberspace)

Starting from standard Earth-Centered Earth-Fixed (ECEF):
- `+X_ecef`: (lat=0°, lon=0°)
- `+Y_ecef`: (lat=0°, lon=+90°)
- `+Z_ecef`: north pole

Cyberspace dataspace axis naming is:
- `X_cs = X_ecef`
- `Y_cs = Z_ecef`
- `Z_cs = Y_ecef`

### 9.5 Canonical spec version and deterministic arithmetic

**Spec version string (required):**
- `CANONICAL_GPS_TO_DATASPACE_SPEC_VERSION = "2026-03-16-h34-corrected"`

Canonical requirements:
- Use decimal arithmetic end-to-end (no platform `libm` for trig).
- Decimal context:
  - precision: `96`
  - rounding: `ROUND_HALF_EVEN`
- π constant: use this exact truncated decimal string:
  - `PI_STR = "3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679"`
- Deterministic trig:
  - Termination epsilon: `TRIG_EPS = 1e-88`
  - Max iterations: `TRIG_MAX_ITER = 256`

### 9.6 Altitude handling (normative)

The canonical mapping is defined for latitude/longitude plus an optional altitude in meters.

- If altitude is omitted, implementations MUST treat `altitude_m = 0`.
- Implementations MUST support "clamp to surface" behavior that forces `altitude_m = 0` (this is what the golden vectors cover).
- If non-zero altitude is supported, `altitude_m` MUST be interpreted as meters above the WGS84 ellipsoid and processed using the same canonical decimal parsing rules.

### 9.7 Canonical mapping algorithm (normative)

1. Parse inputs as decimals.
2. Clamp latitude to `[-90, 90]`.
3. Wrap longitude to `[-180, 180)`.
4. Convert degrees→radians using `PI_STR`.
5. Compute deterministic `sin/cos` using range reduction + Taylor series, terminating when `abs(term) < TRIG_EPS`.
6. Convert WGS84 geodetic to ECEF (meters) using decimals (using `altitude_m` after clamping, if applicable).
7. Convert meters→kilometers.
8. Permute ECEF axes into Cyberspace axes per §9.4.
9. Convert kilometers-from-center into u85 axis values:
   - `units_per_km = 1000 * 2^33` (derived from Cantor Height 34 = 2 meters)
   - `u = km * units_per_km + 2^84`
   - round using `ROUND_HALF_EVEN`
   - clamp to `[0, 2^85 - 1]`

   Derivation: At Cantor Height 34 scale, `2^34` Gibsons = 2 meters. Therefore 1 Gibson = `2^-33` meters, and 1 km = `1000 * 2^33` Gibsons. This formula maps GPS coordinates into a region centered at u85 value `2^84` (the half-axis point).
10. Produce coord256 with `plane=0` using the interleaving in §2.

### 9.8 Golden vectors (consensus locks)

Implementations SHOULD include golden-vector tests to detect accidental mapping drift.

These are required vectors for spec version `2026-03-16-h34-corrected` (hex is 32 bytes, no `0x` prefix).

Golden vectors assume `altitude_m = 0` with clamp-to-surface behavior enabled:
- `origin_equator_prime` lat=0 lon=0
  - `e000000000000000000001200041040208048040000000000000000000000000`
- `equator_east_90` lat=0 lon=90
  - `e000000000000000000000480010410082012010000000000000000000000000`
- `equator_west_90` lat=0 lon=-90
  - `c492492492492492492492012482082410480490000000000000000000000000`
- `north_pole` lat=90 lon=0
  - `e000000000000000000000900004924920020000820000920100824920800020`
- `london` lat=51.5074 lon=-0.1278
  - `c492492492492492492492edf5bee7267451c787d95ba4d7840c76d1e33c9940`
- `nyc` lat=40.7128 lon=-74.0060
  - `c4924924924924924924921f79235dae293ada913e78294253a235239a332854`

### 9.9 Consumer benchmarks (non-normative)

The following benchmarks assume disk-based computation (streaming intermediate values to storage rather than holding in RAM). Storage is the primary limiting factor in Cantor tree traversal at these heights.

| Root Volume | Time (Consumer) | Disk Space Required |
|--------------|-----------------|---------------------|
| 1 m³ | ~1.2 days | 0.5 TB |
| 5 m³ | ~6.2 days | 2.5 TB |
| 50 m³ | ~62 days | 25 TB |
| 150 m³ | ~186 days | 75 TB |

**Notes:**
- "Consumer" assumes a modern desktop or small server with 1-2 TB available storage for smaller claims, or external storage arrays for larger claims.
- Computation is parallelizable; cloud spot instances can reduce wall-clock time at additional cost.
- Contiguous claims are significantly more efficient than discrete parcels due to Cantor subtree structure sharing.

### 9.10 Nation-state limits (non-normative)

At Cantor Height 34, even a nation-state-level actor with substantial computational resources faces hard limits:

| Root Size | Approximate Feasibility | Storage Required |
|------------|------------------------|------------------|
| Single city (~50 km²) | Feasible with significant investment | ~25 TB |
| ~28 cities (~1,400 km² total) | Upper bound for sustained effort | ~700 TB |
| Country-scale (e.g., Netherlands, ~41,000 km²) | Not feasible | ~20 PB |
| Continental-scale | Not feasible | Exabyte-scale |
| Earth surface | Not feasible | Zettabyte-scale |
| GEO sphere | Not feasible | Beyond current technology |

The limiting factor is **data storage and I/O bandwidth**, not raw compute. The protocol's work equivalence property ensures that storing and processing this data cannot be optimized away. There is no "ASIC advantage" because the bottleneck is data movement, not hash rate.

### 9.11 Storage as the primary constraint (non-normative)

Cantor tree computation is memory-bound. At Cantor Height 34, a single subtree contains 2³⁴ ≈ 17 billion leaf nodes. The intermediate values cannot fit in RAM and must be streamed to disk.

**This is intentional.** Storage is the equalizer:
- Consumer SSDs provide enough I/O for small roots
- Nation-states have faster storage, but exponential growth limits scaling
- There is no "ASIC advantage" because the bottleneck is data movement, not hash rate

The storage constraint ensures that territorial roots remain bounded by physical infrastructure, not just financial resources.

---

## 10. Sectors and Spatial Querying

A **sector** is a cube of `2^30` Gibsons per axis. Sectors exist to divide Cyberspace into manageable pieces that fit into u32 systems and, critically, to allow proximal querying of public Cyberspace objects on Nostr relays.

Because Nostr cannot query "prefix ranges" on tag values, per-axis sector tags make it possible to query slices along a single axis.

Given `x_u85, y_u85, z_u85`:
- `sx = x_u85 >> 30`
- `sy = y_u85 >> 30`
- `sz = z_u85 >> 30`

All events that claim a coordinate **MUST** include:
- `X` tag: `["X", "<sx>"]`
- `Y` tag: `["Y", "<sy>"]`
- `Z` tag: `["Z", "<sz>"]`
- `S` tag: `["S", "<sx>-<sy>-<sz>"]`

Tag formatting rules (normative):
- `sx`, `sy`, `sz` MUST be encoded as base-10 integers (strings), with no leading `+` and no leading zeros (except `"0"`).
- `S` MUST be exactly `"<sx>-<sy>-<sz>"`.

---

## 11. Visualization Conventions

This section defines canonical conventions for rendering Cyberspace coordinates in 3D visualizers. The goal is to ensure that different viewers agree on orientation (left/right, up/down, ahead/behind).

These conventions are about visualization only. They do not change coordinate encoding (§2) or movement proof verification (§4–§8).

### 11.1 Handedness and axis semantics

Implementations that render Cyberspace in 3D MUST preserve the Cyberspace axis semantics defined in §9.4 exactly.

Graphics-engine handedness and camera defaults are implementation details and MUST NOT change Cyberspace semantics.

When the viewer is oriented per §11.3:
- `+X_cs` is screen-right.
- `+Y_cs` is up.
- `+Z_cs` is forward (toward the black sun / east reference marker).

### 11.2 Black sun reference marker

The "black sun" is a reference to the hacker haven in Neal Stephenson's *Snow Crash*, one of the foundational works that inspired the Cyberspace Protocol. In Cyberspace, the black sun serves a simple practical purpose: it is a subtle guidepost so you know which direction you are facing. It is rendered as a purple circle marking the `+Z_cs` boundary of the coordinate space.

If a visualizer renders the black sun, it MUST place it on the `+Z_cs` boundary of the Cyberspace cube.

At u85 position `2^84` (the half-axis extent):
- `black_sun_u85 = (x=0, y=0, z=2^84)` in u85 coordinates
- In physical units: `black_sun = (x_km=0, y_km=0, z_km=+2.25×10^12 km)` (approximately 0.24 light-years from origin)

The black sun is a directional guidepost for east (`+Z_cs`). Marker color SHOULD be purple. Marker shape (point/sphere/circle/disk) is implementation-defined.

The black sun marker MUST be visible in both planes. (The plane bit does not affect XYZ decoding; it only labels the plane.)

### 11.3 Camera convention ("facing the black sun")

A visualizer MUST provide (either as its default view or as an explicit preset) a camera/view mode equivalent to:
- View direction: looking toward `+Z_cs`.
- Up direction: `+Y_cs`.
- Screen-right direction: `+X_cs`.

This is the canonical interpretation used when describing a coordinate as "left/right", "above/below", or "ahead/behind" relative to the origin.

### 11.4 Engine adaptation

Different graphics engines have different defaults for camera forward direction and orbit-control behavior.

Implementations MUST use camera placement/orientation and/or a render-space transform so that the semantic rules in §11.1–§11.3 remain true, without mirroring or re-labeling Cyberspace axes.

For quick regression tests and cross-implementation debugging, see `visualization_vectors.json` in this spec repository.

---

## 12. Limitations and Threat Model (non-normative)

### 12.1 What the protocol provides

- **Single-location constraint (per keypair):** A valid, linear movement chain makes forking detectable.
- **Hop freshness:** Every hop includes non-cacheable temporal work derived from chain context.
- **Work equivalence (for discovery):** An entity must compute region preimages to derive discovery keys; there is no shortcut.
- **Auditable movement history:** The chain provides an ordered trail of hops.
- **Locality imposition:** Distance and regions become meaningful in a 256-bit address space.

### 12.2 What the protocol does NOT provide

- **Physical location proof:** Dataspace mapping is deterministic, but it does not prove a body is physically at that GPS point.
- **Trusted identity / sybil resistance:** One operator can control many keypairs.
- **Privacy by default:** Movement events are public if published.
- **Traversal necessity for decryption:** Region preimages can be computed directly without maintaining a movement chain.

### 12.3 Acknowledged attack vectors

- **Coordinate scanning:** An observer can compute region preimages for arbitrary coordinates and query for content. This is considered acceptable because the work required is the same as for a traveler.
- **Chain abandonment:** An entity may abandon a keypair and start fresh, or publish a new spawn event to restart their chain. Applications can require continuity/reputation at higher layers.

---

## 13. Structured Proof-of-Work (non-normative)

This section describes how the computational work in Cyberspace relates to physical reality and how it differs from traditional proof-of-work systems like Bitcoin.

### 13.1 A new class of proof-of-work

Bitcoin's proof-of-work operates by grinding random nonces through SHA-256 until the output falls below a difficulty target. The work is real (it consumes electricity and generates heat) but the output is arbitrary. A valid Bitcoin hash proves that energy was spent. It does not encode any spatial or structural information. The hash is discarded after use.

Cantor pairing tree computation is a fundamentally different kind of work. The output is not arbitrary. When you compute a Cantor tree over a set of coordinates, the root you produce uniquely identifies that spatial region. It is a bijection. The root can be unpaired to reconstruct the entire tree. The proof of your movement is the mathematical fabric of the space itself.

Every Cantor root you compute becomes a stable region identifier that persists as useful infrastructure. It can be used for encrypting localized secrets, discovering nearby content, and establishing spatial authority. The work product is meaningful, not disposable.

### 13.2 Storage-bound, not compute-bound

Bitcoin's proof-of-work is compute-bound. Faster chips produce more hashes per second, and specialized hardware (ASICs) can be built to optimize SHA-256 throughput. The bottleneck is hash rate.

Cantor work is storage-bound. The Cantor pairing function produces intermediate values that grow exponentially in bit size. At height 34, the intermediates require approximately 170 GB of storage. At height 40, approximately 11 TB. At height 50, approximately 11 PB. These intermediates must physically exist on disk during computation because parent nodes require both children during bottom-up tree construction.

This means the limiting resource is not how fast you can compute, but how much data you can store and move. Disk I/O bandwidth, drive capacity, and storage infrastructure become the binding constraints. You cannot build an ASIC that optimizes around the need to store terabytes of intermediate values.

### 13.3 Fixed difficulty

Bitcoin adjusts its difficulty every 2,016 blocks to maintain a 10-minute target block time. This adjustment requires protocol-level governance and creates a competitive arms race between miners.

Cantor tree difficulty is fixed by the mathematics. The cost of computing a region is a deterministic function of the coordinates involved. There is no adjustment mechanism, no governance, and no parameters to tune. As hardware improves over time, all parties gain access to greater computation and storage. The boundaries of what is computable expand gradually for everyone. The protocol requires no ongoing calibration.

### 13.4 Where the energy goes

The thermodynamic cost of Cantor work is real but mediated differently than in Bitcoin. In Bitcoin, the cost pipeline is direct: electricity flows into ASIC chips, which run SHA-256 repeatedly, generating heat. The conversion from watts to proofs is immediate and measurable.

In Cantor work, the energy costs arise from several sources. CPU cycles perform the pairing arithmetic, which generates heat but is relatively minor at scale. The dominant cost is disk I/O: writing and reading terabytes of intermediate values to and from storage generates heat and consumes significant electricity. The storage media itself must be physically allocated and occupied for the duration of the computation, representing both an energy cost and an opportunity cost.

There is also an interesting connection to Landauer's principle, which states that erasing one bit of information costs a minimum of kT × ln(2) joules (where k is Boltzmann's constant and T is temperature). When Cantor intermediates reach petabytes in size, the theoretical minimum energy cost of erasing them after computation may become non-trivial.

### 13.5 The sidestep as traditional proof-of-work

The sidestep (§6), which uses SHA-256 Merkle hash trees instead of Cantor pairing, has a more direct thermodynamic profile. SHA-256 hashing is pure compute with fixed-size inputs and outputs. The cost is straightforward: hash operations multiplied by time equals watts. The sidestep is, in this sense, closer to traditional proof-of-work than the Cantor hop.

This creates an interesting layering: Cantor hops are storage-bound structured work (fast but limited by storage), while Merkle sidesteps are compute-bound hash work (slow but unlimited by storage). The protocol naturally routes movement through whichever regime is feasible for the boundary being crossed.

---

## 14. Reference Implementation

The reference implementation for this spec is:
- https://github.com/arkin0x/cyberspace-cli

Implementers should treat that repo as the reference for:
- Integer→bytes canonicalization for hashing
- Movement proof computation
- Canonical GPS→dataspace mapping (`CANONICAL_GPS_TO_DATASPACE_SPEC_VERSION` and golden vectors)