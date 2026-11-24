# DECK-0009: Blocks

DECK: 0009
Title: Blocks
Status: Draft
Mandatory: no
Created: 2026-11-24
Last updated: 2026-11-24 (ground revision 2)
Requires: `CYBERSPACE_V2.md` §2 (coordinates), §3.1 (the spawn coordinate), §4.6 and §4.7 (Cantor roots and region integers), §5.2 (terrain `K`), §5.5 (integer encoding), §7.2 (region keys and lookup ids), §7.6 (the bag cipher), §8.2 (event ids), §8.7.3 (resolving a chain), §8.8 (the tags the chain rules read) and §8.13 (a tag the chain rules never read, as precedent); NIP-01, NIP-09, NIP-13 (as the unit of work), NIP-51 (`kind 10000` mutes), RFC 8439 (ChaCha20); Bitcoin block headers

## Abstract

**Blocks** are cubes of material that people mine and place in cyberspace, one block per gibson. The world under them is the **generated ground**: rock, caves, pools, trees, veins and rare finds that every client computes from the place itself, the same for everyone, and that costs nothing to store. A place has no ground until someone **surveys** it, and what people change is written down as the difference from that ground.

Space is cut into **chunks**, the aligned regions of height 5, 32 gibsons on a side. Each device that builds holds a **builder key** of its own. The player names it once, with a tag on a movement action they sign anyway, so building never asks for a signature from the player's identity. A builder key writes one **block layer** per chunk: an addressable event whose content is sealed with the chunk's region key, exactly as a bag is, and which says what that builder changed there. Every reader merges the layers of a chunk by one rule, the **Cell Rule**: the first person to place in a cell owns it, and only they, and the builders they list, can change it.

This DECK defines the block ids and their first registry (§2), the generated ground completely enough for two implementations to agree on every cell (§3), the builder key tags (§4), `kind 33339`, the block layer (§5), what makes a layer valid for a reader (§6), the Cell Rule (§7), and what relays do (§8). It writes down arkinox's rulings of 2026-11-21 (no compression) and 2026-11-24 (block size, chunk size, the builder key and its retirement), and the decisions he delegated the same day, which are marked as his to change (§12). The ground is revision 2, the one ONOSENDAI's TERRAIN mode draws (ONOSENDAI #916). Its tables are tunable: a change to any of them is a new revision, which layers name (§3.10).

**Defined here:**

| Thing | Value |
|---|---|
| A block | one gibson: one cell of the grid that the coordinates already are (§2.1) |
| A chunk | an aligned region of height 5, 32 by 32 by 32 cells, in one plane (§2.2) |
| A block id | a 16-bit global id. 0 empty; 1 to 63 natural; 64 to 191 made; 192 to 254 special; 255 reserved for extension; 256 to 65535 the extension space (§2.3) |
| The generated ground | a pure function of the chunk: terrain digests of `CYBERSPACE_V2.md` §5.2, smooth integer noise, and a ChaCha20 stream seeded by `CYBERSPACE_BLOCKS_SURVEY_V1` and the chunk's Cantor root; rock from weighted strata, then features drawn from the same stream in a fixed order. Revision 2 (§3) |
| A builder key | a device-local keypair, named by `["builder", "<hex>"]` on a `kind 3333` event and retired by `["builder-retire", "<hex>"]` (§4) |
| A block layer | `kind 33339`, addressable, signed by a builder key, `d` = the chunk's lookup id, content sealed with the chunk's region key; plain JSON runs, as a diff from the ground or as the whole chunk, whichever is smaller (§5) |
| Reach | 16 gibsons from the chunk's box, Chebyshev, to a movement action of the author's (§6.2; the number is open, §12) |
| The Cell Rule | first placement owns the cell, ordered by the later of its committed Bitcoin block and the witness's first-seen block, then work, then pubkey; the owner and listed builders change it, the latest change winning; a home chunk is its spawner's; mutes hide an author (§7) |

## Terms

- **Cell:** one gibson of a chunk, named by its local coordinates `(x, y, z)`, each 0 to 31.
- **Chunk:** an aligned region of height 5 in one plane, named by its base `(X, Y, Z)`, each a multiple of 32, and its plane `P` (§2.2).
- **Ground:** the generated ground of a chunk, 32,768 global ids (§3).
- **Survey:** the act of starting a chunk's ground. A chunk is empty until a counted layer surveys it (§3.1, §7.5).
- **Author:** the identity a layer builds for: the pubkey whose movement chain names the builder key.
- **Builder key:** a keypair a device generates and keeps, which signs block layers for an author (§4).
- **Layer:** a `kind 33339` event (§5), and what it says about one chunk.
- **Placement:** a cell whose value in a layer differs from that layer's base (§5.5).
- **Settle:** one moment at which a writer committed its changes, with a Bitcoin block and a nonce (§5.3).
- **Witness:** the canonical relay, `wss://relay.onosendai.tech`, as the party that states when it first saw a settle (§7.4).
- **Reach event:** a movement action of the author's that a layer names to show the author was near the chunk (§6.2).
- **Home chunk:** the chunk that contains an identity's spawn coordinate (§7.3).

## 1. Overview (non-normative)

| Kind or tag | Name | Published? | Signed by |
|---|---|---|---|
| `33339` | block layer | yes, addressable, one per builder key per chunk | the builder key |
| `["builder", "<hex>"]` on `kind 3333` | names a builder key | on any movement action | the player |
| `["builder-retire", "<hex>"]` on `kind 3333` | retires one | on any later movement action | the player |

The life of a block change, in the client this DECK was written for: a player in TERRAIN mode mines a block; the change goes into a log on the device at once, and the world redraws. A few seconds later, or when the player leaves the chunk, the device folds the log into its layer for that chunk and publishes a new version of the layer, signed by its builder key. No prompt appears, whatever signer the player uses for their identity, because the identity signed only once: the movement action that named this builder key.

A reader gathers every layer whose `d` is a chunk's lookup id, opens them with the chunk's region key, drops the ones that are not valid (§6), and resolves every cell by the Cell Rule (§7). The ground is computed, never fetched.

Nothing here changes the movement chain's validity. The two builder tags ride on actions the player signs anyway, and the chain rules never read them (§4.5). A client that does not implement this DECK sees nothing: it skips `kind 33339` like any kind it does not know.

## 2. Blocks and chunks (normative)

### 2.1 One block per gibson

A block is exactly one gibson (`CYBERSPACE_V2.md` §2.1): the cell at integer coordinates `(x, y, z)` in one plane. Blocks are aligned to the coordinate grid. There are no half blocks and no blocks between gibsons. How fast a builder walks and how high it jumps is the client's (arkinox's ruling, 2026-11-24).

### 2.2 Chunks

A **chunk** is an aligned region of height 5 (`CYBERSPACE_V2.md` §4.5): the 32 by 32 by 32 cells whose coordinates share every bit above the lowest five on each axis, in one plane. Its base is `X = (x >> 5) << 5`, and likewise `Y` and `Z`, for any cell `(x, y, z)` in it. Its region integer is `region_n = π(π(cx, cy), cz)` with `cx = compute_subtree_cantor(X, 5)` and likewise `cy` and `cz` (§4.6, §4.7). Its region key and its lookup id are those of §7.2 for that `region_n`.

A chunk and its twin, the chunk with the same base in the other plane, share one `region_n`, one key and one lookup id (`CYBERSPACE_V2.md` §2.4, §7.2). They are two chunks with two grounds (§3), and one layer carries both (§5.5).

**Cell index (normative):** the cells of a chunk are ordered with `x` fastest, then `z`, then `y`: `index = x + 32 z + 1024 y`. Every list of cells in this DECK (the ground, the runs of §5.4, the placements of §5.5) is in this order.

**Why h5 (non-normative):** a layer must fit one event. At height 5 the worst layer that can be written in one plane, every cell a different block from a palette of 256, is about 131,000 bytes of JSON, which seals to under 180,000 bytes and fits the 240,000 byte guard ONOSENDAI applies to bags. At height 6 the same worst case is eight times larger. The live room, where builders see each other's changes as they happen, is height 12, the chat height (DECK-0005); it is out of scope here (§11).

### 2.3 Block ids

A **global id** is an integer from 0 to 65535. Its ranges:

| Range | Meaning |
|---|---|
| 0 | empty: no block |
| 1 to 63 | **natural**: blocks the ground is made of (§3) |
| 64 to 191 | **made**: blocks that players make and place, allocated by later revisions of this DECK |
| 192 to 254 | **special**: rare blocks with a meaning of their own |
| 255 | reserved, the extension marker. A writer MUST NOT place it |
| 256 to 65535 | the extension space, allocated by later revisions of this DECK |

**The initial registry (normative for ids; the names are invented for Cyberspace, the colours are suggestions):**

| Id | Name | Role | Suggested base | Suggested accent |
|---|---|---|---|---|
| 0 | empty | no block | none | none |
| 1 | Gridstone | common bulk rock | `#555e60` | `#80898c` |
| 2 | Umberslate | darker rock | `#1d3547` | `#6f8ea0` |
| 3 | Driftsilt | soft fill, dune top | `#946100` | `#cc8f00` |
| 4 | Mossveil | surface skin | `#00ba67` | `#00f39e` |
| 5 | Rustband | banded rock | `#943300` | `#f47000` |
| 6 | Frostshale | pale rock | `#c8f5ff` | `#5d6769` |
| 7 | Cinderrock | volcanic rock | `#1a0f24` | `#ff3300` |
| 8 | Prismite | crystalline vein and fleck, glows | `#a24bff` | `#e1bcff` |
| 9 | Basaltine | dark rock, round Magmaflow | `#22232b` | `#5b6070` |
| 10 | Rimeglass | clear frozen rock | `#a9e8ff` | `#e6fbff` |
| 11 | Tidewater | liquid, clear, walked through | `#1d5fd6` | `#6fb4ff` |
| 12 | Magmaflow | liquid, glows, walked through | `#ff5a00` | `#ffd040` |
| 13 | Lumenwood | tree trunk, glows | `#4a3020` | `#7dffcf` |
| 14 | Canopy glass | tree crown, clear | `#1fa860` | `#9dffc8` |
| 40 | Ferrovein | common metallic vein | `#555e60` | `#e7a800` |
| 41 | Cobaltine | uncommon vein | `#1d3547` | `#5a9bff` |
| 42 | Glowcore | rare vein, glows | `#15191a` | `#00e5ff` |
| 43 | Gibsonite | very rare single block, glows | `#4b0058` | `#ff00ff` |
| 192 | Relic shard | very rare single block, glows | `#5c0010` | `#ff3b6b` |
| 193 | Voidpearl | rare single block, glows | `#0a0614` | `#b48cff` |
| 194 | Auroric | rare single block, glows | `#103040` | `#6dffd8` |
| 195 | Chronite | rare single block, glows | `#202836` | `#ffe08a` |
| 196 | Singularity core | very rare single block, glows | `#000000` | `#ffffff` |
| 197 | Genesis shard | the rarest single block, glows | `#fff4d6` | `#ffc23a` |

Whether a block glows, is clear or is walked through is a hint for drawing and walking, written in the role, not a rule of this DECK: Tidewater and Magmaflow are liquids that a walker passes through, and the glowing blocks bloom where a client draws bloom.

Ids 15 to 39 and 44 to 63 are unallocated natural ids, and 198 to 254 unallocated special ids, for later revisions of the ground. The names and the look are Cyberspace's own: a later revision adds blocks with invented names, never names borrowed from another game. The two colours are a base and an accent, as TERRAIN draws them; how a client textures a block is its own.

**Unknown ids (normative):** a reader MUST accept any global id from 0 to 65535 in a layer. It draws an id it does not know as a solid block of a neutral look that says the block is unknown, and it treats 255 the same way. It MUST NOT drop a layer for holding an id it does not know, because a later revision may allocate it.

**Placing (non-normative):** the protocol does not check what a player owns. Any id may be placed. An inventory, and a rule such as "placed is at most mined plus received", belong to a game (§11).

### 2.4 Palettes

A layer stores a chunk as one palette index per cell, and a **palette** per plane that maps indices to global ids (§5.5). A palette has at most 256 entries, so a cell costs one index whatever the global id it names, and the world is not limited to 256 kinds of block.

## 3. The generated ground (normative)

The ground of a chunk is a pure function of its base and its plane: 32,768 global ids, every one of them natural (1 to 63), special (192 to 197) or empty (0). Every value that decides a cell is an integer. Every division is a floor division of non-negative integers, and the only shifts of signed values are the soft border warps of §3.9, which round toward negative infinity. Every per-cell value is below `2^53`; the region integer of §3.2 is an arbitrary precision integer, and the strata hash of §3.9 is a multiplication modulo `2^32`, which an implementation computes exactly (in JavaScript with `Math.imul`, never as a float product, which loses bits above `2^53`). Two implementations that follow this section produce identical grounds; the vectors of §9 check it.

### 3.1 Empty until surveyed

The ground of a chunk is not drawn, and does not exist for the Cell Rule, until a layer that a reader counts **surveys** the chunk's plane (§5.5, `survey`; §7.5). Until then the chunk is empty. Surveying is publishing a layer whose plane says so. It costs a writer what a layer costs: one signature by its builder key, and the h5 Cantor root, which §3.2 needs anyway.

A writer MAY compute and show the ground of a chunk its user has not surveyed, for example as a preview, and MUST NOT present it as surveyed until a layer says so.

### 3.2 The survey seed

**Constants:**
- `SURVEY_DOMAIN = b"CYBERSPACE_BLOCKS_SURVEY_V1"` (27 ASCII bytes)

The survey seed of the chunk with base `(X, Y, Z)` in plane `P` is:

```
survey_seed = sha256(SURVEY_DOMAIN || byte(P) || int_to_bytes_be_min(region_n))
```

where `byte(P)` is one byte of value 0 or 1, `region_n` is the chunk's region integer (§2.2), and `int_to_bytes_be_min` is `CYBERSPACE_V2.md` §5.5.

The seed MUST NOT be `sha256(int_to_bytes_be_min(region_n))`: that value is the chunk's region key (`CYBERSPACE_V2.md` §7.2), which seals every bag and every layer in the chunk. A seed equal to the key would put the key in every implementation's debug output, and the domain string keeps the two apart for good.

### 3.3 The fine stream

The **fine stream** of a chunk is the first 32,768 bytes of the ChaCha20 keystream (RFC 8439 §2.4) with:
- key: `survey_seed` (32 bytes);
- nonce: 12 zero bytes;
- initial block counter: 0.

That is, the RFC's block function applied to counters 0 to 511, each block's 64 bytes in order. Byte `i` of the stream is `fine[i]`, the fine byte of the cell whose index (§2.2) is `i`.

The **feature stream** of a chunk is the next 8,192 bytes of the same keystream, bytes 32,768 to 40,959 (counters 512 to 639). §3.9 reads it in a fixed order, one draw after another: `u8` is the next byte, and a read past the 8,192th byte gives 0 (a chunk never reads that far: the vectors' chunks read at most a few hundred); `u32` is four `u8` in order, read as a big-endian unsigned integer; `chance(t)` reads one `u32` and is true when it is below `t`. The **stream of the chunk above** is the fine stream of the chunk with base `(X, (Y + 32) mod 2^85, Z)` in the same plane; §3.7 reads its first layer.

**Why ChaCha20 (non-normative):** the benchmark of 2026-11-24 measured one SHA-256 per gibson at about 50 ms a chunk in a browser worker, about 200 ms on a phone. ChaCha20 gives the same 32,768 bytes in 0.2 ms, against 1.1 ms for SHA-256 in counter mode. Every platform has it (noble-ciphers in browsers, libsodium, the Python `cryptography` package, Go's `x/crypto`), and its block function is about twenty lines (`blocks-reference.mjs`).

### 3.4 The coarse lattice

The ground is shaped by values at the corners of three lattices, so that it changes smoothly and lines up across chunk borders. Every corner value comes from a **terrain digest**: the SHA-256 of `CYBERSPACE_V2.md` §5.2 step 1.4 for an aligned cell,

```
digest(bits, x, y, z, P) = sha256(TERRAIN_DOMAIN_V2 || byte(bits) || bytes32(xyz_to_coord(bx, by, bz, P)))
```

with `bx = (x >> bits) << bits` and likewise `by`, `bz`, and `bytes32` the coordinate as exactly 32 bytes, big-endian. §5.2 uses only the low nibble of byte 0 of each digest. This DECK reads other bytes of the same digests, so a client that already computes terrain `K` has computed most of them.

**Wrapping (normative):** wherever this section adds an offset to an axis value, the sum is taken modulo `2^85` as the non-negative remainder, 0 to `2^85 − 1`, so a sum below 0 wraps to the top of the axis (in JavaScript, `& (2^85 − 1)` on a BigInt, never `%`, which keeps the sign). The last chunk on an axis therefore reads its far corners from the first.

**The 8 lattice** `A` has 5 by 5 by 5 corners, numbered `a = i + 5 (k + 5 j)` for `i, j, k` from 0 to 4. Corner `a` stands at `(X + 8i, Y + 8j, Z + 8k)`, which is the base of an aligned cube of 8 (the corners with an index of 4 are the bases of cubes in the neighbouring chunks). For each corner, with `d3 = digest(3, corner)`:

| Value | Definition |
|---|---|
| `K[a]` | terrain `K` at the corner (`CYBERSPACE_V2.md` §5.2), 0 to 16 |
| `K16[a]` | `16 × K[a]` |
| `cave[a]` | `d3[1]` |
| `tun[a]` | `d3[2]` |
| `veinT[a]` | `d3[4]` |

The cube K of a cell is `K[(x >> 3) + 5 ((z >> 3) + 5 (y >> 3))]`, the K of the 8 cube that holds it: exactly the `K` a hop into that cell pays.

### 3.5 The fine lattice, the large lattice and the strata digests

**The 4 lattice** `B` has 9 by 9 by 9 corners, numbered `b = i + 9 (k + 9 j)` for `i, j, k` from 0 to 8. Corner `b` takes its values from the 8 lattice corner `a = (i >> 1) + 5 ((k >> 1) + 5 (j >> 1))`, whose `d3` it reads, at sub-corner `sub = (i & 1) | ((j & 1) << 1) | ((k & 1) << 2)`:

| Value | Definition |
|---|---|
| `caveD[b]` | `d3[13 + sub]` |

**The 128 lattice** `G` has the 8 corners of the aligned cube of 128 that holds the chunk. With `Ox = (X >> 7) << 7`, and likewise `Oy`, `Oz`, corner `c` from 0 to 7 stands at `(Ox + 128 (c & 1), Oy + 128 ((c >> 1) & 1), Oz + 128 ((c >> 2) & 1))`. With `d7 = digest(7, corner)`: `big[c] = d7[1]`, `warp[c] = d7[2]`, and the border warp fields `gx[c] = d7[3]`, `gy[c] = d7[4]`, `gz[c] = d7[5]`. The chunk's offsets in that cube are `ox = X - Ox`, `oy = Y - Oy`, `oz = Z - Oz`, each 0, 32, 64 or 96.

**The strata digests** of a cell are the 2^9 and 2^11 digests at a **warped** position near it (§3.9, Soft borders), so that the borders between strata and between families are ragged contacts rather than flat cuts. Away from those borders the warped position stays inside the chunk's own cell of 512 and of 2048, and the digests are the chunk's own, `digest(9, X, Y, Z, P)` and `digest(11, X, Y, Z, P)`.

**Byte budget (non-normative).** Of each 2^3 digest, byte 0 (low nibble `K`, high nibble spare), bytes 1, 2, 4 and 13 to 20 are read here, and bytes 3, 5 to 12 and 21 to 31 are spare (revision 1 read bytes 3 and 5 to 12 for a vein field that revision 2 replaced with features). Of each 2^7 digest, bytes 1 to 5; of each 2^9 digest, bytes 2 and 3; of each 2^11 digest, byte 1. A later revision that needs more fields takes them from the spare bytes.

### 3.6 Interpolation

**Weights.** Smoothstep weights, `3t² − 2t³`, as integers:
- `W8 = [0, 22, 80, 162, 256, 350, 432, 490, 512]`, in 512ths, for a fraction `f` of 0 to 8 eighths: `W8[f] = 24 f² − 2 f³`.
- For the 4 lattice, the weight of a fraction `f` of 0 to 4 quarters is `W8[2f]`, also in 512ths.
- `W128(f) = 384 f² − 2 f³`, in `2^21`ths, for a fraction `f` of 0 to 128.

**Lerp.** `lerp(a, b, w, sh) = floor((a × (2^sh − w) + b × w) / 2^sh)`. Every argument is a non-negative integer, so the floor is exact in integer arithmetic.

**Lattice position.** For a local coordinate `u` from 0 to 32 on a lattice of spacing `s` (8 or 4): `j = min(floor(u / s), 32/s − 1)` and `f = u − s j`, so `u = 32` is the far corner with a weight of 512 and never reads past the lattice.

**Trilinear value** `tri(V, s, x, y, z)` of a lattice `V` of side `m = 32/s + 1`, at local `(x, y, z)`, each 0 to 32: with `(i, wx)`, `(j, wy)`, `(k, wz)` the positions of `x`, `y`, `z`, and `c(di, dj, dk) = V[(i + di) + m ((k + dk) + m (j + dj))]`, in this order:

```
a0 = lerp(c(0,0,0), c(1,0,0), wx, 9)    a1 = lerp(c(0,0,1), c(1,0,1), wx, 9)
a2 = lerp(c(0,1,0), c(1,1,0), wx, 9)    a3 = lerp(c(0,1,1), c(1,1,1), wx, 9)
b0 = lerp(a0, a1, wz, 9)                b1 = lerp(a2, a3, wz, 9)
tri = lerp(b0, b1, wy, 9)
```

that is, along X first, then Z, then Y. The order matters, because each lerp floors.

**The large value** `tri128(V, x, y, z)` of the 128 lattice is the same three passes with `wx = W128(ox + x)`, `wy = W128(oy + y)`, `wz = W128(oz + z)`, a shift of 21, and corner `c(dx, dy, dz) = V[dx | (dy << 1) | (dz << 2)]`.

### 3.7 Solid or empty

For a cell `(x, y, z)`, with `y` from 0 to 32, and its fine byte `f`, which is `fine[x + 32z + 1024y]` for `y` from 0 to 31 and `above[x + 32z]` for `y = 32`, the first layer of the stream of the chunk above (§3.3):

```
cave8 = tri(cave, 8, x, y, z)      cave4 = tri(caveD, 4, x, y, z)
tun8  = tri(tun, 8, x, y, z)       bigv  = tri128(big, x, y, z)
kS    = tri(K16, 8, x, y, z)                                  # smoothed K, in 16ths, 0 to 256
D     = 5 cave8 + 2 cave4 + 2 bigv + f                         # 0 to 2550
k0    = min(15, kS >> 4)        t = kS − 16 k0                # t is 0 to 16
thr   = (EMPTY_THR[k0] (16 − t) + EMPTY_THR[k0 + 1] t) >> 4
tunnel = |tun8 − 128| < 9 and |cave4 − 128| < 16
solid  = D ≥ thr and not tunnel
```

A cell that is not solid is empty, global id 0. Row `y = 32` is computed only to decide the top layer of material (§3.9); it belongs to the chunk above.

### 3.8 Thresholds

| `k` | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `EMPTY_THR[k]` | 1337 | 1323 | 1308 | 1294 | 1280 | 1266 | 1253 | 1239 | 1225 | 1211 | 1196 | 1182 | 1168 | 1153 | 1138 | 1123 | 1108 |

`EMPTY_THR[k]` was set so that, over 600 chunks drawn at random, a share of `0.60 − 0.30 k/16` of cells falls under it: 60% empty where the smoothed K is 0, 30% where it is 16. The calibration is not part of the rule: the integers are. Revision 2 keeps them, so the open space, the caves and the tunnels of revision 1 are unchanged.

### 3.9 Materials (revision 2, tunable)

The materials are made in two passes. **Rock** fills every solid cell from its family's strata. **Features** then change some cells, each placed by draws from the feature stream (§3.3) in a fixed order: Magmaflow, Tidewater, trees, veins, and last the rare band.

**Families.** Each solid cell takes its family from its warped 2^11 digest `d11` (Soft borders, below): `FAMILIES[d11[1] mod 6]`. A family's strata are `[id, weight]` pairs, in this order:

| Index | Family | Strata `[id, weight]` | Top | Speckle |
|---|---|---|---|---|
| 0 | temperate | `[1, 25]`, `[2, 18]`, `[5, 9]` | 4 | 2 |
| 1 | dune | `[1, 47]`, `[2, 34]`, `[5, 17]`, `[3, 3]` | 3 | 5 |
| 2 | frozen | `[1, 40]`, `[2, 29]`, `[5, 15]`, `[6, 8]`, `[10, 8]` | 6 | 2 |
| 3 | volcanic | `[1, 37]`, `[2, 27]`, `[5, 13]`, `[7, 13]`, `[9, 9]` | 7 | 5 |
| 4 | crystal | `[1, 43]`, `[2, 31]`, `[5, 16]`, `[6, 10]` | 6 | 8 |
| 5 | karst | `[1, 25]`, `[2, 18]`, `[5, 9]`, `[3, 11]` | 4 | 3 |

The **chunk's family** is the family of its own unwarped 2^11 digest, `FAMILIES[digest(11, X, Y, Z, P)[1] mod 6]`. It decides which features a chunk may have (Magmaflow, trees).

**Soft borders.** For a cell `(x, y, z)` with fine byte `f` (§3.3), let `sx = tri128(gx, x, y, z) − 128`, `sy = tri128(gy, x, y, z) − 128` and `sz = tri128(gz, x, y, z) − 128` (the corner values of §3.5), `sc = cave4 − 128` with `cave4` of §3.7, and `sf = f − 128`. Its warps, each `>> 8` an arithmetic shift that rounds toward negative infinity (Python's `>>`, JavaScript's `>>` on these small values):

```
w9  = ((sx × 44 + sc × 8 + sf × 5) >> 8,   (sy × 44 − sc × 8 + sf × 5) >> 8,    (sz × 44 + sc × 8 − sf × 5) >> 8)
w11 = ((sz × 120 + sc × 16 + sf × 5) >> 8,  (sx × 120 + sc × 8 + sf × 5) >> 8,   (sy × 120 − sc × 16 − sf × 5) >> 8)
d9  = digest(9,  X + x + w9[0],  Y + y + w9[1],  Z + z + w9[2],  P)      # each axis modulo 2^85 (§3.4)
d11 = digest(11, X + x + w11[0], Y + y + w11[1], Z + z + w11[2], P)
```

The 2^9 warp reaches about 30 cells and the 2^11 warp about 70, so a cell within that distance of a border can read the neighbouring cell's digest, and a family or a band thickness changes along a ragged, dithered contact instead of a plane.

**Rock.** For each solid cell, in index order:

```
d9, d11 = the strata digests of this cell (Soft borders)
strata, top, speckle = FAMILIES[d11[1] mod 6]
T       = 3 + (d9[2] mod 8)                                        # band thickness, 3 to 10
warpOff = ((tri128(warp, x, y, z) × 18) >> 8) + ((tri(veinT, 8, x, y, z) × 8) >> 8) + ((cave4 × 4) >> 8)
band    = floor(((Y mod 2^24) + y + warpOff) / T)
h       = ((band XOR (d9[3] << 8)) × 0x9E3779B1) mod 2^32           # exact: a wrapping 32-bit multiply
r       = (h >> 16) mod (the sum of the strata's weights)
id      = the first stratum whose weight w satisfies r < w, subtracting w from r for each one passed
if f < 6:                                    id = speckle          # about 2.3%
if the cell (x, y + 1, z) is not solid:      id = top              # y + 1 may be 32 (§3.7)
```

A cell that is not solid stays 0. The strata bands run along Y, and the `mod 2^24` makes a seam in them on every 2^24 wall of Y, which is where the walls of cyberspace grow tall anyway.

**What features read.** After rock:
- the 64 cube K values (§3.4) in the order `cx + 4 (cz + 4 cy)`, for `cy`, `cz`, `cx` from 0 to 3; `sumK` is their sum, `maxK` their largest, and the **costliest cube** `mc` the first cube in that order whose K is `maxK`. Its base is `(8 (mc & 3), 8 (mc >> 4), 8 ((mc >> 2) & 3))` in `(x, y, z)`.
- `kOf(x, y, z)`, the cube K of a cell.
- **rock cells**: a cell is rock when its id is not 0, not Tidewater (11), Magmaflow (12), Lumenwood (13) or Canopy glass (14), and not one of the rare band's ids (193, 194, 195, 43, 196, 192, 197). Veins and Basaltine are rock, so a later feature may replace them.
- `rockInCostliest()`: read two bytes, the first read being the high byte, `start = ((first << 8) | second) & 511`; then for `i` from 0 to 511, cell `c = (start + i) & 511` of the costliest cube, at offset `(c & 7, c >> 6, (c >> 3) & 7)` in `(x, y, z)` from its base; the first rock cell found is the answer, and none gives −1.

**Features**, in this order. Each test is made only when the conditions before `chance` hold, so a draw is read only then (the conditions are evaluated left to right and stop at the first false one). A byte once read is spent: a skipped tree, a failed vein start or a Tidewater try without a floor never gives its bytes back, and each such try counts against its limit.

1. **Magmaflow.** If the chunk's family is volcanic, `maxK ≥ 11` and `chance(536870912)`: `at = rockInCostliest()`. If `at ≥ 0`, with `(cx, cy, cz)` its cell, read `rx = 1 + u8 mod 3`, `ry = 1 + u8 mod 2`, `rz = 1 + u8 mod 3`. For `dy` from `−ry − 2` to `ry + 2`, then `dz` from `−rz − 2` to `rz + 2`, then `dx` from `−rx − 2` to `rx + 2` (outermost first), the cell `(cx + dx, cy + dy, cz + dz)`, if it is inside the chunk and is rock, becomes Magmaflow (12) when `inside(rx, ry, rz)` holds and its cube K is at least 11, Basaltine (9) when `inside(rx, ry, rz)` holds and its cube K is lower, and Basaltine when only `inside(rx + 2, ry + 2, rz + 2)` holds; where `inside(ax, ay, az)` is `dx² ay² az² + dy² ax² az² + dz² ax² ay² ≤ ax² ay² az²`.
2. **Tidewater.** If `chance(min(2576980377, max(214748364, (768 − sumK) × 4194304)))`, make up to 8 tries. A try reads `px = u8 & 31`, `pz = u8 & 31`, `r = 2 + u8 mod 5`. Its floor is the first `y` from 31 down to 1 at which `(px, y, pz)` is 0 and `(px, y − 1, pz)` is not; with no floor the try ends. Then, for each `y` from the floor down to `max(1, floor − 2)`, and in it `dz` from `−r` to `r`, then `dx` from `−r` to `r`: a cell `(px + dx, y, pz + dz)` with `dx² + dz² ≤ r²`, inside the chunk, which is 0 and stands on a cell that is neither 0 nor Lumenwood, becomes Tidewater (11). The try stops placing at its 200th cell, counting only its own cells. (The Lumenwood test cannot fire in revision 2, because trees come later; it is part of the rule as written.) If the try placed 20 or more, Tidewater is done; otherwise every cell it placed goes back to 0 and the next try begins.
3. **Trees.** Only when the chunk's family is temperate or karst, collect the **sites**: for `tz` from 2 to 29, then `tx` from 2 to 29, the highest `y` from 23 down to 0 at which `(tx, y, tz)` is Mossveil (4) and the 8 cells above it are all 0, at most one site per column, in that order. If there is a site and `chance(1460288880)`: read `n = 1 + u8 mod 4`, then `n` times: `site = sites[u32 mod (number of sites)]`, `h = 4 + u8 mod 3`. With `(tx, g, tz)` the site, if the cell above it is not 0 (an earlier tree stands there), skip this tree; its `u32` and `h` are spent. Otherwise the cells from `g + 1` to `g + h` above it become Lumenwood (13), whatever they held, an earlier tree's Canopy glass included. Then for `dy` from `h − 1` to `h + 2`, with `rr = 2` for `dy ≤ h`, 1 for `dy = h + 1` and 0 for `dy = h + 2`, each cell `(tx + dx, g + dy, tz + dz)` for `dz` and then `dx` from `−rr` to `rr`, leaving out the four corners when `rr = 2` (the ring of `rr = 1` keeps its corners), becomes Canopy glass (14) if it is 0.
4. **Veins.** `vein(id, size, minK, cube)` makes up to 8 tries for a start: without a cube it reads `x = u8 & 31`, `y = u8 & 31`, `z = u8 & 31`; in the costliest cube it reads `x = 8 (mc & 3) + (u8 & 7)`, then `z = 8 ((mc >> 2) & 3) + (u8 & 7)`, then `y = 8 (mc >> 4) + (u8 & 7)`. A start that is not rock, or whose cube K is below `minK`, is a failed try. From a good start it walks `size` steps, and every step, the last included, reads one byte: the current cell, if it is rock and its cube K is at least `minK`, becomes `id`; then it reads `d = u8 mod 6` and moves one cell along X if `d >> 1` is 0, Y if 1, Z if 2, toward + if `d` is odd and − if even, held between 0 and 31. Then the vein is done. In order:
   - Ferrovein: if `chance(3865470566)`, read `n = 2 + u8 mod 4`, then `n` times `vein(40, 4 + u8 mod 9, 0, none)`;
   - Cobaltine: if `maxK ≥ 6` and `chance(2233382993)`, read `n = 1 + u8 mod 2`, then `n` times `vein(41, 3 + u8 mod 6, 6, none)`;
   - Prismite: if `maxK ≥ 9` and `chance(1395864371)`, `vein(8, 4 + u8 mod 7, 9, none)`;
   - Glowcore: if `maxK ≥ 10` and `chance(429496729)`, `vein(42, 2 + u8 mod 7, 10, costliest cube)`.

   The size is read before the vein's first start.
5. **The rare band.** For each row of the table below, in order: if `maxK` is at least its least K and `chance(threshold)`, then `o = rockInCostliest()`, and if `o ≥ 0` that cell becomes the row's block. One block, never a vein.

| Block | Id | Least K of the costliest cube | Threshold | Target per surveyed chunk |
|---|---|---|---|---|
| Voidpearl | 193 | 11 | 22375156 | 1 in 500 |
| Auroric | 194 | 11 | 11187578 | 1 in 1,000 |
| Chronite | 195 | 12 | 11179861 | 1 in 2,000 |
| Gibsonite | 43 | 12 | 7453240 | 1 in 3,000 |
| Singularity core | 196 | 13 | 11799360 | 1 in 5,000 |
| Relic shard | 192 | 13 | 7866240 | 1 in 7,500 |
| Genesis shard | 197 | 14 | 22053747 | 1 in 10,000 |

Each threshold is `floor(2^32 × target ÷ share)`, where the share is the measured share of chunks whose costliest cube reaches that K (over 200,000 random chunks: 0.383905 for K 11, 0.192085 for 12, 0.0728 for 13, 0.019475 for 14), so that the chance per surveyed chunk is the target. The integers are the rule; the derivation is how they were chosen.

**What it makes (non-normative)**, measured by ONOSENDAI's calibration over 12,000 random chunks (and 200,000 for the rare band): open space 46.8%, as in revision 1. Rock in each family keeps the owner's ratios (Gridstone about 25, Umberslate 18, Rustband 9, Driftsilt 11, Frostshale 15, Cinderrock 20, Basaltine 6, Rimeglass 5): temperate is Gridstone 47%, Umberslate 36%, Rustband 17%. Mossveil tops 99.9% of temperate and karst chunks. Lumenwood trees stand in 35% of the chunks that have a tree site, Tidewater pools in 24% of all chunks (36% at a mean K under 7, 13% at 9 and up), Magmaflow in 12% of volcanic chunks of K 11 and up. Ferrovein is in 90% of chunks, Cobaltine in half of those of K 6 and up, Prismite veins in a quarter of those of K 9 and up, Glowcore in a tenth of those of K 10 and up. The rare band hits its targets, from Voidpearl in 1 chunk of 500 to Genesis shard in 1 of 10,000. The rarest blocks sit where every hop costs the most temporal work: the good rock is where the going is hard.

### 3.10 Revisions (normative)

A **revision** of the ground is a whole definition of §3.2 to §3.9, named by an integer. A layer names the revision it was written against in each plane's `ground` (§5.5). This section is **revision 2**.

- Revision 2 keeps revision 1's seed, its stream, its lattices and its open space, so its domain string is still `CYBERSPACE_BLOCKS_SURVEY_V1`: the domain names the seed's construction, and a revision that changes the seed changes it too. Revision 2 changes what fills the rock and adds the features.
- Revision 1 was a draft of 2026-11-24 that no published layer used. It is withdrawn, and a reader treats `ground: 1` as a revision it does not implement.
- A reader MUST compute a plane's base by the revision it names. A plane in `diff` form that names a revision the reader does not implement is set aside, unread, and the layer's other plane goes on (§6.1, check 5), because its `null` cells and its placements are defined against a ground the reader cannot compute. The reader SHOULD say that something is built here that a newer client can show.
- A plane in `whole` form names every cell's value, so a reader **loads it under any revision**: it draws those values. It decodes the plane's placements, `t0`, `t1` and claims, and counts the layer in the Cell Rule, only when it implements the plane's revision; until then it draws the layer for its author alone, as it draws placements the Cell Rule excludes (§7.3).
- A writer writes the newest revision it implements when it first surveys a plane, and MUST carry forward the revision a plane already names, until its user surveys the plane again.

While this DECK is a Draft, revision 2 may still change. It is fixed when the DECK leaves Draft, and every change after that is a new revision. The tables of §3.8 and §3.9 are tunable, and tuning them is a revision.

### 3.11 Reference code (normative where it agrees with the text)

The Python below is revision 2, the rule of §3.2 to §3.9, in one place. It was run against `blocks-vectors.json` and reproduces every chunk in it, features included. Its digest cache is an optimisation only. Where it and the prose disagree, the prose is right.

```python
import functools
import hashlib

AXIS_MASK = (1 << 85) - 1
TERRAIN_DOMAIN_V2 = b"CYBERSPACE_TERRAIN_K_V2"
SURVEY_DOMAIN = b"CYBERSPACE_BLOCKS_SURVEY_V1"

EMPTY_THR = [1337, 1323, 1308, 1294, 1280, 1266, 1253, 1239, 1225, 1211, 1196, 1182, 1168, 1153, 1138, 1123, 1108]
W8 = [0, 22, 80, 162, 256, 350, 432, 490, 512]
FEATURE_BYTES = 8192
MOSSVEIL, BASALTINE, TIDEWATER, MAGMAFLOW, LUMENWOOD, CANOPY = 4, 9, 11, 12, 13, 14
FERROVEIN, COBALTINE, PRISMITE, GLOWCORE = 40, 41, 8, 42
FAMILIES = [  # (name, strata as (id, weight), top, speckle)
    ("temperate", [(1, 25), (2, 18), (5, 9)], 4, 2),
    ("dune", [(1, 47), (2, 34), (5, 17), (3, 3)], 3, 5),
    ("frozen", [(1, 40), (2, 29), (5, 15), (6, 8), (10, 8)], 6, 2),
    ("volcanic", [(1, 37), (2, 27), (5, 13), (7, 13), (9, 9)], 7, 5),
    ("crystal", [(1, 43), (2, 31), (5, 16), (6, 10)], 6, 8),
    ("karst", [(1, 25), (2, 18), (5, 9), (3, 11)], 4, 3),
]
T_MAGMA, T_TREES, T_FERROVEIN, T_COBALTINE, T_PRISMITE, T_GLOWCORE = 536870912, 1460288880, 3865470566, 2233382993, 1395864371, 429496729
RARE = [(193, 11, 22375156), (194, 11, 11187578), (195, 12, 11179861), (43, 12, 7453240),
        (196, 13, 11799360), (192, 13, 7866240), (197, 14, 22053747)]
RARE_IDS = {r[0] for r in RARE}


def sha256(b):
    return hashlib.sha256(b).digest()


def xyz_to_coord(x, y, z, plane):                       # CYBERSPACE_V2.md §2.3
    c = plane & 1
    for i in range(85):
        c |= ((z >> i) & 1) << (1 + 3 * i)
        c |= ((y >> i) & 1) << (2 + 3 * i)
        c |= ((x >> i) & 1) << (3 + 3 * i)
    return c


def int_to_bytes_be_min(n):                             # CYBERSPACE_V2.md §5.5
    return b"\x00" if n == 0 else n.to_bytes((n.bit_length() + 7) // 8, "big")


def cantor_pair(a, b):
    s = a + b
    return s * (s + 1) // 2 + b


def subtree_cantor(base, h):                            # CYBERSPACE_V2.md §4.6
    v = list(range(base, base + (1 << h)))
    for _ in range(h):
        v = [cantor_pair(v[i], v[i + 1]) for i in range(0, len(v), 2)]
    return v[0]


@functools.lru_cache(maxsize=65536)
def cell_digest(bits, bx, by, bz, plane):
    return sha256(TERRAIN_DOMAIN_V2 + bytes([bits]) + xyz_to_coord(bx, by, bz, plane).to_bytes(32, "big"))


def terrain_digest(bits, x, y, z, plane):               # CYBERSPACE_V2.md §5.2, step 1 (cached by cell)
    return cell_digest(bits, (x >> bits) << bits, (y >> bits) << bits, (z >> bits) << bits, plane)


def terrain_k(x, y, z, plane):                          # CYBERSPACE_V2.md §5.2
    return sum(bin(terrain_digest(b, x, y, z, plane)[0] & 15).count("1") for b in (3, 7, 9, 11))


def survey_seed(X, Y, Z, P):                            # §3.2
    n = cantor_pair(cantor_pair(subtree_cantor(X, 5), subtree_cantor(Y, 5)), subtree_cantor(Z, 5))
    return sha256(SURVEY_DOMAIN + bytes([P & 1]) + int_to_bytes_be_min(n))


def chacha20_keystream(key, length):                    # §3.3: RFC 8439, nonce 0, counter from 0
    def rotl(v, c):
        return ((v << c) | (v >> (32 - c))) & 0xFFFFFFFF
    k = [int.from_bytes(key[4 * i:4 * i + 4], "little") for i in range(8)]
    out = bytearray()
    block = 0
    while len(out) < length:
        st = [0x61707865, 0x3320646E, 0x79622D32, 0x6B206574] + k + [block, 0, 0, 0]
        x = st[:]
        for _ in range(10):
            for a, b, c, d in ((0, 4, 8, 12), (1, 5, 9, 13), (2, 6, 10, 14), (3, 7, 11, 15),
                               (0, 5, 10, 15), (1, 6, 11, 12), (2, 7, 8, 13), (3, 4, 9, 14)):
                x[a] = (x[a] + x[b]) & 0xFFFFFFFF; x[d] = rotl(x[d] ^ x[a], 16)
                x[c] = (x[c] + x[d]) & 0xFFFFFFFF; x[b] = rotl(x[b] ^ x[c], 12)
                x[a] = (x[a] + x[b]) & 0xFFFFFFFF; x[d] = rotl(x[d] ^ x[a], 8)
                x[c] = (x[c] + x[d]) & 0xFFFFFFFF; x[b] = rotl(x[b] ^ x[c], 7)
        for i in range(16):
            out += ((x[i] + st[i]) & 0xFFFFFFFF).to_bytes(4, "little")
        block += 1
    return bytes(out[:length])


def cell_index(x, y, z):                                # §2.2
    return x + 32 * z + 1024 * y


def lerp(a, b, w, sh):                                  # §3.6
    return (a * ((1 << sh) - w) + b * w) >> sh


def w128(f):                                            # §3.6
    return 384 * f * f - 2 * f * f * f


def lat(u, s):                                          # §3.6: lattice index and weight, u in 0..32
    j = min(u // s, 32 // s - 1)
    f = u - s * j
    return j, (W8[f] if s == 8 else W8[2 * f])


def tri(arr, s, x, y, z):                               # §3.6: x, then z, then y
    m = 32 // s + 1
    (i, wx), (j, wy), (k, wz) = lat(x, s), lat(y, s), lat(z, s)
    c = lambda di, dj, dk: arr[(i + di) + m * ((k + dk) + m * (j + dj))]
    a0, a1 = lerp(c(0, 0, 0), c(1, 0, 0), wx, 9), lerp(c(0, 0, 1), c(1, 0, 1), wx, 9)
    a2, a3 = lerp(c(0, 1, 0), c(1, 1, 0), wx, 9), lerp(c(0, 1, 1), c(1, 1, 1), wx, 9)
    return lerp(lerp(a0, a1, wz, 9), lerp(a2, a3, wz, 9), wy, 9)


def tri128(v, off, x, y, z):                            # §3.6: corners c = dx | dy << 1 | dz << 2
    wx, wy, wz = w128(off[0] + x), w128(off[1] + y), w128(off[2] + z)
    a0, a1 = lerp(v[0], v[1], wx, 21), lerp(v[4], v[5], wx, 21)
    a2, a3 = lerp(v[2], v[3], wx, 21), lerp(v[6], v[7], wx, 21)
    return lerp(lerp(a0, a1, wz, 21), lerp(a2, a3, wz, 21), wy, 21)


def pick_stratum(strata, h):                            # §3.10
    r = (h >> 16) % sum(w for _, w in strata)
    for gid, w in strata:
        if r < w:
            return gid
        r -= w


def generate_chunk(X, Y, Z, P):
    d3, K = [None] * 125, [0] * 125                     # §3.4, corner i + 5 (k + 5 j)
    for j in range(5):
        for k in range(5):
            for i in range(5):
                cx, cy, cz = (X + 8 * i) & AXIS_MASK, (Y + 8 * j) & AXIS_MASK, (Z + 8 * k) & AXIS_MASK
                d3[i + 5 * (k + 5 * j)] = terrain_digest(3, cx, cy, cz, P)
                K[i + 5 * (k + 5 * j)] = terrain_k(cx, cy, cz, P)
    K16 = [16 * v for v in K]
    cave, tun, veinT = ([d[n] for d in d3] for n in (1, 2, 4))
    caveD = [0] * 729                                   # §3.5, corner i + 9 (k + 9 j)
    for j in range(9):
        for k in range(9):
            for i in range(9):
                sub = (i & 1) | ((j & 1) << 1) | ((k & 1) << 2)
                caveD[i + 9 * (k + 9 * j)] = d3[(i >> 1) + 5 * ((k >> 1) + 5 * (j >> 1))][13 + sub]
    O = ((X >> 7) << 7, (Y >> 7) << 7, (Z >> 7) << 7)   # §3.5, the 128 lattice
    off = (X - O[0], Y - O[1], Z - O[2])
    big, warp, gx8, gy8, gz8 = [0] * 8, [0] * 8, [0] * 8, [0] * 8, [0] * 8
    for c in range(8):
        d = terrain_digest(7, (O[0] + 128 * (c & 1)) & AXIS_MASK, (O[1] + 128 * ((c >> 1) & 1)) & AXIS_MASK,
                           (O[2] + 128 * ((c >> 2) & 1)) & AXIS_MASK, P)
        big[c], warp[c], gx8[c], gy8[c], gz8[c] = d[1], d[2], d[3], d[4], d[5]
    stream = chacha20_keystream(survey_seed(X, Y, Z, P), 32768 + FEATURE_BYTES)   # §3.3
    fine, feat = stream[:32768], stream[32768:]
    above = chacha20_keystream(survey_seed(X, (Y + 32) & AXIS_MASK, Z, P), 32768)

    def solid_at(x, y, z):                              # §3.7, y in 0..32
        f = fine[cell_index(x, y, z)] if y < 32 else above[cell_index(x, 0, z)]
        cave4 = tri(caveD, 4, x, y, z)
        D = 5 * tri(cave, 8, x, y, z) + 2 * cave4 + 2 * tri128(big, off, x, y, z) + f
        kS = tri(K16, 8, x, y, z)
        k0 = min(15, kS >> 4)
        t = kS - 16 * k0
        thr = (EMPTY_THR[k0] * (16 - t) + EMPTY_THR[k0 + 1] * t) >> 4
        tunnel = abs(tri(tun, 8, x, y, z) - 128) < 9 and abs(cave4 - 128) < 16
        return D >= thr and not tunnel

    solid = {(x, y, z): solid_at(x, y, z) for y in range(33) for z in range(32) for x in range(32)}
    y_base = Y & 0xFFFFFF
    out = bytearray(32768)
    for y in range(32):                                 # §3.10 Rock
        for z in range(32):
            for x in range(32):
                if not solid[(x, y, z)]:
                    continue
                f = fine[cell_index(x, y, z)]
                c4 = tri(caveD, 4, x, y, z)
                sx, sy, sz = (tri128(v, off, x, y, z) - 128 for v in (gx8, gy8, gz8))
                sc, sf = c4 - 128, f - 128
                w9 = ((sx * 44 + sc * 8 + sf * 5) >> 8, (sy * 44 - sc * 8 + sf * 5) >> 8, (sz * 44 + sc * 8 - sf * 5) >> 8)
                w11 = ((sz * 120 + sc * 16 + sf * 5) >> 8, (sx * 120 + sc * 8 + sf * 5) >> 8, (sy * 120 - sc * 16 - sf * 5) >> 8)
                d9 = terrain_digest(9, (X + x + w9[0]) & AXIS_MASK, (Y + y + w9[1]) & AXIS_MASK, (Z + z + w9[2]) & AXIS_MASK, P)
                d11 = terrain_digest(11, (X + x + w11[0]) & AXIS_MASK, (Y + y + w11[1]) & AXIS_MASK, (Z + z + w11[2]) & AXIS_MASK, P)
                _, strata, top, speckle = FAMILIES[d11[1] % 6]
                warp_off = ((tri128(warp, off, x, y, z) * 18) >> 8) + ((tri(veinT, 8, x, y, z) * 8) >> 8) + ((c4 * 4) >> 8)
                band = (y_base + y + warp_off) // (3 + d9[2] % 8)
                g = pick_stratum(strata, ((band ^ (d9[3] << 8)) * 0x9E3779B1) & 0xFFFFFFFF)
                if f < 6:
                    g = speckle
                if not solid[(x, y + 1, z)]:
                    g = top
                out[cell_index(x, y, z)] = g

    # §3.11 Features, from the feature stream, in a fixed order.
    pos = [0]
    def u8():
        b = feat[pos[0]] if pos[0] < len(feat) else 0
        pos[0] += 1
        return b
    def u32():
        return (u8() << 24) | (u8() << 16) | (u8() << 8) | u8()
    def chance(t):
        return u32() < t
    family = FAMILIES[terrain_digest(11, X, Y, Z, P)[1] % 6][0]
    cubes = [K[cx + 5 * (cz + 5 * cy)] for cy in range(4) for cz in range(4) for cx in range(4)]
    max_k, sum_k = max(cubes), sum(cubes)
    max_cube = cubes.index(max_k)                       # the first costliest cube, index cx + 4 (cz + 4 cy)
    k_of = lambda x, y, z: K[(x >> 3) + 5 * ((z >> 3) + 5 * (y >> 3))]
    def is_rock(o):
        g = out[o]
        return g != 0 and g not in (TIDEWATER, MAGMAFLOW, LUMENWOOD, CANOPY) and g not in RARE_IDS
    def rock_in_costliest():
        cx, cz, cy = 8 * (max_cube & 3), 8 * ((max_cube >> 2) & 3), 8 * (max_cube >> 4)
        start = ((u8() << 8) | u8()) & 511
        for i in range(512):
            c = (start + i) & 511
            o = cell_index(cx + (c & 7), cy + (c >> 6), cz + ((c >> 3) & 7))
            if is_rock(o):
                return o
        return -1

    # 1. Magmaflow, with Basaltine round it.
    if family == "volcanic" and max_k >= 11 and chance(T_MAGMA):
        at = rock_in_costliest()
        if at >= 0:
            cx, cz, cy = at & 31, (at >> 5) & 31, at >> 10
            rx, ry, rz = 1 + u8() % 3, 1 + u8() % 2, 1 + u8() % 3
            def inside(dx, dy, dz, ax, ay, az):
                return dx * dx * ay * ay * az * az + dy * dy * ax * ax * az * az + dz * dz * ax * ax * ay * ay <= ax * ax * ay * ay * az * az
            for dy in range(-ry - 2, ry + 3):
                for dz in range(-rz - 2, rz + 3):
                    for dx in range(-rx - 2, rx + 3):
                        x, y, z = cx + dx, cy + dy, cz + dz
                        if not (0 <= x <= 31 and 0 <= y <= 31 and 0 <= z <= 31) or not is_rock(cell_index(x, y, z)):
                            continue
                        if inside(dx, dy, dz, rx, ry, rz):
                            out[cell_index(x, y, z)] = MAGMAFLOW if k_of(x, y, z) >= 11 else BASALTINE
                        elif inside(dx, dy, dz, rx + 2, ry + 2, rz + 2):
                            out[cell_index(x, y, z)] = BASALTINE
    # 2. Tidewater.
    if chance(min(2576980377, max(214748364, (768 - sum_k) * 4194304))):
        for _ in range(8):
            px, pz, r = u8() & 31, u8() & 31, 2 + u8() % 5
            floor = next((y for y in range(31, 0, -1) if out[cell_index(px, y, pz)] == 0 and out[cell_index(px, y - 1, pz)] != 0), -1)
            if floor < 0:
                continue
            placed = []
            y = floor
            while y >= max(1, floor - 2) and len(placed) < 200:
                for dz in range(-r, r + 1):
                    for dx in range(-r, r + 1):
                        if dx * dx + dz * dz > r * r or len(placed) >= 200:
                            continue
                        x, z = px + dx, pz + dz
                        if not (0 <= x <= 31 and 0 <= z <= 31):
                            continue
                        o, below = cell_index(x, y, z), out[cell_index(x, y - 1, z)]
                        if out[o] == 0 and below != 0 and below != LUMENWOOD:
                            out[o] = TIDEWATER
                            placed.append(o)
                y -= 1
            if len(placed) >= 20:
                break
            for o in placed:
                out[o] = 0
    # 3. Lumenwood trees crowned with Canopy glass.
    sites = []
    if family in ("temperate", "karst"):
        for tz in range(2, 30):
            for tx in range(2, 30):
                for y in range(23, -1, -1):
                    if out[cell_index(tx, y, tz)] == MOSSVEIL and all(out[cell_index(tx, y + a, tz)] == 0 for a in range(1, 9)):
                        sites.append(cell_index(tx, y, tz))
                        break
    if sites and chance(T_TREES):
        for _ in range(1 + u8() % 4):
            site = sites[u32() % len(sites)]
            h = 4 + u8() % 3
            tx, tz, ground = site & 31, (site >> 5) & 31, site >> 10
            if out[cell_index(tx, ground + 1, tz)] != 0:
                continue
            for y in range(ground + 1, ground + h + 1):
                out[cell_index(tx, y, tz)] = LUMENWOOD
            for dy in range(h - 1, h + 3):
                rr = 2 if dy <= h else 1 if dy == h + 1 else 0
                for dz in range(-rr, rr + 1):
                    for dx in range(-rr, rr + 1):
                        if rr == 2 and abs(dx) == 2 and abs(dz) == 2:
                            continue
                        o = cell_index(tx + dx, ground + dy, tz + dz)
                        if out[o] == 0:
                            out[o] = CANOPY
    # 4. Veins: a walk of `size` steps from a start in rock.
    def vein(gid, size, min_k, in_cube):
        for _ in range(8):
            if in_cube is None:
                x, y, z = u8() & 31, u8() & 31, u8() & 31
            else:
                x = 8 * (in_cube & 3) + (u8() & 7)
                z = 8 * ((in_cube >> 2) & 3) + (u8() & 7)
                y = 8 * (in_cube >> 4) + (u8() & 7)
            if not is_rock(cell_index(x, y, z)) or k_of(x, y, z) < min_k:
                continue
            for _ in range(size):
                o = cell_index(x, y, z)
                if is_rock(o) and k_of(x, y, z) >= min_k:
                    out[o] = gid
                d = u8() % 6
                step = 1 if d & 1 else -1
                if d >> 1 == 0:
                    x = min(31, max(0, x + step))
                elif d >> 1 == 1:
                    y = min(31, max(0, y + step))
                else:
                    z = min(31, max(0, z + step))
            return
    if chance(T_FERROVEIN):
        for _ in range(2 + u8() % 4):
            vein(FERROVEIN, 4 + u8() % 9, 0, None)
    if max_k >= 6 and chance(T_COBALTINE):
        for _ in range(1 + u8() % 2):
            vein(COBALTINE, 3 + u8() % 6, 6, None)
    if max_k >= 9 and chance(T_PRISMITE):
        vein(PRISMITE, 4 + u8() % 7, 9, None)
    if max_k >= 10 and chance(T_GLOWCORE):
        vein(GLOWCORE, 2 + u8() % 7, 10, max_cube)
    # 5. The rare band: one block each, in the costliest cube.
    for gid, min_k, t in RARE:
        if max_k < min_k or not chance(t):
            continue
        o = rock_in_costliest()
        if o >= 0:
            out[o] = gid
    return bytes(out)
```

### 3.12 Cost (non-normative)

The ground of one chunk needs 125 terrain digests at the 8 lattice (each with its `K`, whose 2^7, 2^9 and 2^11 digests are shared by nearly every corner), 8 at the 128 lattice, at most 8 strata digests of each of 2^9 and 2^11 for the soft borders (a warp of under 32 and 70 cells crosses at most one border per axis), two Cantor roots of height 5, and 40 KB and 32 KB of ChaCha20. The features read a few hundred bytes of their stream and touch a few hundred cells. ONOSENDAI's TERRAIN mode computes a chunk in a worker; its test suite holds a chunk within a phone's budget. `blocks-reference.mjs`, written for clarity with a bigint coordinate loop and a digest lookup per cell, takes about 90 ms a chunk in Node; the work it repeats is caching, not arithmetic.

## 4. Builder keys (normative)

### 4.1 The builder key

A **builder key** is a secp256k1 keypair that a device generates for one author and keeps. It signs that device's block layers (§5) and nothing else. Its secret never leaves the device and is never published.

Note (non-normative): ONOSENDAI keeps each builder key in IndexedDB under the author's npub, as it keeps all local data (arkinox's rule of 2026-11-19: a switch of identity never deletes). A device that loses its builder key makes a new one and names it; the old one stays valid until it is retired (§4.3).

### 4.2 Naming a builder key

An author names a builder key with a tag on a movement action (`kind 3333`, `CYBERSPACE_V2.md` §8.1) that the author signs:

```
["builder", "<builder pubkey, 64 lowercase hex characters>"]
```

- A writer MAY add one or more `builder` tags to any movement action: a spawn, a hop, a sidestep, a hyperspace action of DECK-0001, a bracket action or an action inside a bracket (`CYBERSPACE_V2.md` §8.11). It SHOULD add the tag to the next action its user signs anyway, so that naming a key costs no signature of its own.
- A tag whose second element is not exactly 64 lowercase hex characters names nothing, and a reader ignores it. It does not make the event invalid (§4.5).
- Naming a key that is already named again is harmless.

A device whose key is not yet named holds its layers locally and publishes them after the action that names its key. A writer MAY also sign a movement action for the sole purpose of naming a key, when its user wants to build before moving.

### 4.3 Retiring a builder key

Every named builder key stays valid until it is retired (arkinox's ruling, 2026-11-24). An author retires a key with a tag on a later movement action:

```
["builder-retire", "<builder pubkey, 64 lowercase hex>"]
["builder-retire", "<builder pubkey, 64 lowercase hex>", "all"]
```

- **From here on** (two elements): the key is no longer valid for any layer whose reach event (§6.2) is this action or comes after it on the same chain (§4.4). Layers whose reach event comes before it stay valid.
- **All** (a third element `all`): the key is no longer valid for any layer at all, whenever it was written. This is for a key that was stolen at an unknown time: its honest layers are lost with its forged ones, and the author's other keys can write them again (§5.3, carrying settles).
- **Which to use (non-normative):** retirement from here on is for a key nobody else holds, a device given away or wiped. It does not stop a thief: a thief can name a reach event from before the retirement, and only the witness check of §4.4 rule 4 catches that. A key that may have been copied is retired with `all`.
- A third element other than `all`, or any further elements, is ignored: the tag is read as the two element form. A malformed key value names nothing.
- A retirement in the two element form counts only on the chain that carries it, as naming does (§4.4). A retirement with `all` counts from any authentic movement action of the author, on any chain, including a chain that a respawn has ended and including a spawn, because a chain that has ended cannot be extended to retire the keys it named.

### 4.4 When a key is valid for a layer

The **ancestry** of a movement action `E` is `E` itself, the action its `e` previous tag names, the action that one's `e` previous names, and so on, back to and including the spawn that `E`'s `e` genesis tag names (`CYBERSPACE_V2.md` §8.4, §8.7.3). It follows previous links only, so it is one line even on a chain that has forked.

A builder key `k` is **valid** for a layer whose author is `A` and whose reach event is `E` when all of these hold:

1. some action in the ancestry of `E` carries `["builder", k]`;
2. no action in the ancestry of `E` carries `["builder-retire", k]`, in either form;
3. no authentic movement action of `A`, on any chain, carries `["builder-retire", k, "all"]`;
4. when the reader can learn witness times (§7.4): the witness did not first see the layer's current version (its event id) at a block height later than the height at which it first saw a movement action of `A` that carries `["builder-retire", k]` in either form.

Rule 4 closes most of the gap that rule 2 leaves: a thief with a retired key can name an old reach event, from before the retirement, but the witness saw the retirement before it saw the forged layer.

A reader that cannot walk the whole ancestry (an action it cannot fetch) cannot establish rule 1 and treats the key as not valid for that layer, for now.

### 4.5 The chain rules never read these tags (normative)

`builder` and `builder-retire` are not tags the chain rules read (`CYBERSPACE_V2.md` §8.8). They never affect whether an event or a chain is valid, where an identity stands, how a chain is resolved (§8.7.3), how a fork is found, or what any proof commits to. A verifier MUST treat an action that carries them exactly as the same action without them, and MUST NOT reject an action for a malformed one. This is the rule of §8.13 for the no-broadcast tag, applied to these two.

**The hop math is unchanged (non-normative):** a hop proof commits to the two coordinates, the terrain and the previous event's id (`CYBERSPACE_V2.md` §5.3 to §5.10), never to the event's own tags. Adding a builder tag changes only the event's own id, as any tag would, and the next action reads that id as its previous id exactly as it always does.

**Why the tag rides on movement (non-normative):** the player signs movement actions anyway, so a tag on one costs no prompt, and the chain is the one record of an identity that every reader already resolves. A key named on the chain is named at a place in the chain's order, which is what lets retirement mean "from here on" (§4.3) and what lets a layer's reach event and its key's naming be checked on one line of events (§4.4). A separate event that named a key would need its own signature, its own ordering and its own revocation.

## 5. The block layer: `kind 33339` (normative)

### 5.1 The event

| Field or tag | Value |
|---|---|
| `kind` | `33339`. NIP-01 addressable: a relay keeps the newest event per `(pubkey, kind, d)`, so one builder key has one layer per chunk, and each version replaces the one before |
| `pubkey` | the builder key |
| `content` | empty, or the same fixed sentence on every layer a writer publishes, for clients that cannot read it. It MUST NOT say anything about the place or what is built there |
| `["d", "<lookup id>"]` | exactly one. The chunk's lookup id (`CYBERSPACE_V2.md` §7.2), 64 lowercase hex |
| `["p", "<author pubkey>"]` | exactly one. The author, 64 lowercase hex |
| `["e", "<event id>", "<relay hint>", "reach"]` | one or two, at most one per plane. The reach event of §6.2: a movement action of the author's near this chunk. The relay hint MAY be empty |
| `["settle", "<settle id>"]` | one per entry of the plaintext's `settles`, in the same order, at most 32 (§5.3) |
| `["encrypted", "aes-256-gcm", "<payload base64>"]` | exactly one. The plaintext of §5.5, sealed with the chunk's region key under the cipher of `CYBERSPACE_V2.md` §7.6: AES-256-GCM, a fresh 12-byte nonce for every encryption, a 16-byte tag, `nonce || ciphertext || tag`, standard base64 with padding |
| `["version", "1"]` | exactly one. The rules of this section. A reader MUST ignore a layer whose version it does not know |
| `["alt", "<text>"]` | OPTIONAL. A NIP-31 description, following the rule for `content` |

A writer MUST NOT add a `C`, a height tag (`H` or `h`), a `hint`, sector tags, `contents`, NIP-70's `-`, or a `client` tag. A layer is a bag in its cipher and its key, and like a bag it carries nothing public that says where it is beyond what this table requires. A reader ignores any other tag.

The `p`, `e` and `settle` tags are public on purpose. `p` and `e` let a relay check a layer's builder key and reach without the region key (§8.2), and `settle` lets the witness record when it first saw each settle (§7.4). What they reveal is in §10.

### 5.2 The key

The layer is sealed with the region key of its chunk, the key whose lookup id is its `d`. A reader that has derived that key for a cell of the chunk, or of its twin, opens it. A failed decryption means only that the reader does not hold this chunk's key (`CYBERSPACE_V2.md` §7.6).

### 5.3 Settles

A **settle** is an entry of the plaintext's `settles` array: `[height, "<block hash>", "<nonce>", claims]`, where:

- `height` is a Bitcoin block height, a non-negative integer below `2^32`;
- `<block hash>` is the hash of the block at that height, 64 lowercase hex characters, in the order block explorers display it;
- `<nonce>` is 16 lowercase hex characters, any value;
- `claims` is an array of exactly two runs arrays (§5.4), for plane 0 and plane 1, each of 32,768 values that are 0 or 1, one per cell in index order (§2.2). A 1 marks a cell this settle **claims**: a cell the author first placed in at this settle. A plane with no claims is `[0, -32767]`.

Its **settle id** is

```
settle_id = sha256(SETTLE_DOMAIN || author || lookup_id || be32(height) || block_hash || nonce || claims_digest)
```

with `SETTLE_DOMAIN = b"CYBERSPACE_BLOCKS_SETTLE_V1"` (27 ASCII bytes), `author` the 32 bytes of the `p` tag's pubkey, `lookup_id` the 32 bytes of the `d` tag, `be32(height)` four bytes big-endian, `block_hash` the 32 bytes the hex spells in the order it is written, `nonce` the 8 bytes its hex spells, and `claims_digest = sha256(bitmap0 || bitmap1)`, where `bitmapP` is the claims of plane `P` as 4,096 bytes: the value of the cell with index `i` is bit `i mod 8` (bit 0 the least significant) of byte `floor(i / 8)`. The settle's **work** is the number of leading zero bits of its settle id (NIP-13's measure). A writer MAY try nonces to raise it; work breaks ties in the Cell Rule (§7.2).

**Committing (normative for writers):** a writer that settles takes a block at least 6 below the tip of the best chain it knows, and writes its height and hash, so that a reorganization of the usual depth does not change it. A block hash proves only that the settle was made after that block was mined.

**Claiming (normative for writers):** when a settle first appears in a layer, its claims MUST be exactly the cells, in each plane, that are placements of that version whose `t0` names it. In every later version, a placement's `t0` MAY name a settle only if that cell was a placement with that same `t0` in the previous version: a cell the author released (returned to its base) and placed in again takes a new settle. The claims are bound into the settle id, so a settle can never claim later a cell it did not claim when it first appeared. A reader checks only that every placement's `t0` settle claims its cell (§6.1, check 8); the witness checks the rest before it records anything (§7.4).

**Carrying settles (normative for writers):** a writer that publishes a new version of a layer MUST carry every settle that a cell of the new version still names, unchanged, claims included, so that the cell keeps its place in the order of §7.2. A carried settle keeps claiming cells that are no longer placements; those claims are dead, and the rule of Claiming above keeps them from being revived. The settle id binds the author and the chunk, not the builder key, so another builder key of the same author MAY carry a settle too, for example to write again what a retired key had written (§4.3).

**Merging settles:** a layer holds at most 32 settles. A writer that would need more MUST merge settles. Because a settle's claims are bound into its id, a merge cannot add cells to a settle that exists: it makes a **new** settle, committed to a current block, claiming every cell it takes over, and moves those cells' `t0` and `t1` to it. Moving a cell to a newer settle only weakens its claim, and any placement someone else made in the meantime then comes first, so a writer SHOULD merge its newest settles, whose cells lose the least, and keep its oldest. A writer MUST NOT move a cell's `t0` to any settle other than a new one made this way, and never to an earlier one. (A merged settle that keeps the latest witness height of the settles it replaces is open, §12.)

### 5.4 Runs

A **runs array** is a JSON array of integers that spells a list of values, the encoding DECK-0003 §1.4a uses for `facecolors`: a non-negative entry is a value, and a negative entry `-N` stands for N more copies of the value before it.

- The first entry MUST be non-negative, because a repeat has nothing before it.
- Every non-negative entry MUST be below a limit that the context gives (the palette's length, or the number of settles).
- Expanded, the array MUST produce exactly the length the context gives.
- Every entry MUST be a JSON number written as an optional `-` and decimal digits with no leading zero, no fraction, no exponent, and not `-0`, from -32768 to 65535. A reader that parses `1.0` and `1` alike MUST check the text, or reject what its parser cannot tell apart.
- A reader MUST check the length while it expands, and stop at the first entry that would pass it, so that an array such as `[0, -1000000000]` costs nothing.

A runs array that breaks any of these is malformed. A writer SHOULD write runs in the shortest form, a value then `-N` for its repeats, but a reader MUST accept any well-formed array.

This is encoding, not compression: plain JSON integers, readable by eye. The standing ruling of 2026-11-21 forbids compressing sealed payloads, and nothing in this DECK compresses.

### 5.5 The plaintext

The plaintext is a JSON object, UTF-8, with exactly these fields; a reader ignores any other:

| Field | Value |
|---|---|
| `settles` | an array of 1 to 32 settles (§5.3) |
| `builders` | an array of 0 to 64 author pubkeys (64 lowercase hex) that this author lets change the cells it owns in this chunk (§7.3). The author's own pubkey in it is ignored |
| `planes` | an array of 1 or 2 plane objects, at most one per plane |

A **plane object**:

| Field | Value |
|---|---|
| `plane` | 0 or 1 |
| `survey` | `true` if this author has surveyed this plane of the chunk, `false` if not |
| `ground` | the revision of the ground the plane was written against, an integer: 2 for this DECK (§3.10). A plane without it names no revision this DECK implements |
| `form` | `"diff"` or `"whole"` |
| `pal` | the palette: an array of 1 to 256 entries. In `diff`, entry 0 MUST be `null`, which means "the base value of this cell", and every other entry is a global id. In `whole`, every entry is a global id. A global id is an integer from 0 to 65535 |
| `cells` | a runs array of 32,768 palette indices, one per cell in index order (§2.2), each below the palette's length |
| `t0` | a runs array, one settle index per placement, in index order: the settle at which the author first placed in that cell and has held it since |
| `t1` | the same, the settle of the author's latest change to that cell |

**Base and values.** The plane's **base** is the ground of §3 (at the revision `ground` names) if `survey` is `true`, and all empty if `survey` is `false`. The value of a cell is `pal[index]`, or the base value of the cell where that entry is `null`.

**Placements.** A cell is a **placement** of this layer exactly when its value differs from its base value. A cell whose value equals its base is not a placement, whichever form wrote it. So `diff` and `whole` are two spellings of one meaning: a writer chooses whichever is smaller, and a reader decodes either to the same values and the same placements. Mining a block of the ground is a placement of 0; placing a block in an empty cell of the ground is a placement of that block's id.

`t0` and `t1` each expand to exactly as many entries as the plane has placements, and every entry is an index into `settles`. A writer MUST make the `t0` settle of each placement no later than its `t1` settle (its height is not greater). A reader does not check this, because the order of §7.2 compares first settles with first and last with last.

**A layer that only surveys** has a `diff` plane whose palette is `[null]` and whose cells are `[0, -32767]`, with empty `t0` and `t1`: about 256 bytes of plaintext with one settle that claims nothing (the vector of §9).

**Choosing the form (normative for writers):** a writer SHOULD write each plane in the form whose compact JSON is shorter. The benchmark of 2026-11-24 measured a house dug into the ground at 2,700 bytes as a diff, and a castle that replaces the ground at 17,653 bytes whole against 30,026 as a diff; the smaller of the two covered every case it measured.

### 5.6 Limits (normative)

- A writer MUST NOT sign a layer whose serialized event is longer than 240,000 bytes. The serialized event is the event object as compact JSON in UTF-8, with exactly the keys `id`, `pubkey`, `created_at`, `kind`, `tags`, `content` and `sig`, in that order, no whitespace, and strings escaped as NIP-01 escapes them for the id. This is the bag guard of `CYBERSPACE_V2.md` §7.6 (Size). A reader MUST drop a longer one, so that every reader decides on the same layers.
- **What fits.** A plane of ordinary building fits with room to spare: the benchmark's house is 2.7 KB, a castle that replaces the ground 17.7 KB, a chunk with half its cells changed at random about 62 KB. The worst plane a writer can make does not fit: every cell a different index into a palette of 256 is about 131,000 bytes of `cells` alone, and `t0` and `t1` that change settle at every cell add as much again each. A writer keeps a plane small by settling in batches, so that neighbouring cells share settles, and by merging settles when it must (§5.3). A writer that cannot fit a change MUST refuse it and tell its user, rather than drop anything already written.
- `settles` at most 32, `builders` at most 64, `pal` at most 256, `planes` at most 2.

### 5.7 Writing, replacing and removing

A writer publishes a new version of its layer to change it, carrying everything it does not change, including the plane it is not writing in, exactly as a bag carries the other plane (`CYBERSPACE_V2.md` §7.6, Planes). A writer removes its blocks from a chunk by publishing a version whose placements are gone, which is a layer that only surveys, or a `diff` plane with `survey` false and every cell `null`. It MUST NOT request the deletion of a layer (NIP-09, `kind 5`), and relays refuse one (§8.1).

**When to publish (non-normative):** ONOSENDAI keeps changes in a log on the device and settles a chunk when its user leaves it by more than 4 blocks, after 15 seconds without a change alone or 3 seconds with someone near, at 200 waiting changes alone or 50 with someone near, and when its user closes TERRAIN mode, switches identity or goes LOCAL. A building session of an hour in two chunks is a few dozen layer versions, each signed by the builder key with no prompt.

## 6. Validity for readers (normative)

### 6.1 The checks

A reader that holds a `kind 33339` event checks it in this order, and drops it if any of checks 1 to 9 fails:

1. it is authentic: its `id` and `sig` are valid (`CYBERSPACE_V2.md` §8.2);
2. its tags are as §5.1 requires: exactly one `d`, one `p`, one `encrypted` and one `version` of `1`, one or two `e` tags marked `reach`, and 1 to 32 `settle` tags;
3. it is no longer than 240,000 bytes (§5.6);
4. it decrypts with the chunk's key (otherwise the reader simply cannot read it);
5. its plaintext is the object of §5.5 with every field well formed and every runs array well formed (§5.4), except that a plane object in `diff` form that names a revision of the ground the reader does not implement (§3.10) is set aside here, unread, and dropped, while the layer's other plane goes on; a plane in `whole` form under such a revision is read for its values only, and skips checks 7 and 8 and the Cell Rule (§3.10);
6. its settles hash, in order, to its `settle` tags (§5.3), with the author of `p` and the lookup id of `d`, and the claims of each settle are two well formed runs arrays of 0 and 1;
7. in every remaining plane, `cells`, `t0` and `t1` expand as §5.5 requires against that plane's base;
8. every placement's `t0` names a settle whose claims, in the placement's plane, mark the placement's cell (§5.3, Claiming);
9. its builder key is valid for the layer (§4.4), for at least one of its reach events;

then, for each remaining plane object:

10. some one of its reach events is all three of: in this plane, within reach of this chunk (§6.2), and one for which the builder key is valid (§4.4). A plane without such a reach event is dropped, and the layer's other plane stands.

A settle's block hash is checked against the reader's own Bitcoin headers, after check 6:

- if the reader holds the header at the settle's height and that header is at least 6 below the reader's tip, the hash MUST equal that block's hash, or the layer is dropped (writers commit 6 deep, §5.3, so an honest layer fails this only after a reorganization deeper than that);
- if the settle's height is within 6 of the reader's tip, or above it, the layer is **pending**: the reader does not count it (§7.1) until the height is 6 deep in its chain, and then applies the first case. A settle at a height that never arrives, such as `2^32 − 1`, therefore never counts.

A layer that fails any of checks 1 to 9, other than the part of check 5 that drops one plane, is dropped alone: one malformed or forged layer says nothing about the others in the chunk, as a bag drops one corrupt item (`CYBERSPACE_V2.md` §7.6). A reader SHOULD say that a layer was found and could not be read, rather than draw a guess.

### 6.2 Reach

A layer's **reach event** is the event named by one of its `e` tags marked `reach`. It MUST be an authentic `kind 3333` event whose `pubkey` is the layer's author (the `p` tag), and all of these MUST hold:

- **A real position.** It is a spawn, a hop, a sidestep, an action of a mandatory DECK that changes position (today the hyperspace actions of DECK-0001), or an `exit-virtual`. It is not an `enter-virtual`, not an action inside a virtual bracket, and not a skipped action (`CYBERSPACE_V2.md` §8.9, §8.11). The chain rules never check the `C` of a virtual or skipped action against any work (§8.11.2), so such a `C` can name any place in cyberspace.
- **Valid.** The line of its ancestry (§4.4), read from its spawn forward as if the reach event were the head of the active chain, is valid under the chain rules (`CYBERSPACE_V2.md` §8.7.3, §8.12) up to and including the reach event. Its position is then the one the chain rules give the identity at that event, which for these actions is its `C`. Reading the line as if the reach event were the head ignores forks after it and respawns, on purpose: an action that was valid where it stood proved its position with work, and a later fork or respawn does not undo that.

A reader that does not verify chains cannot establish validity and MUST NOT count a layer as valid on reach alone; it MAY show it as unverified to its own user.

**Constant:** `REACH = 16` gibsons.

The reach event is **within reach** of a chunk when its `C` is in the chunk's plane and its distance to the chunk's box is at most `REACH`. The distance is Chebyshev: for each axis, 0 if the coordinate lies between the chunk's base and its base plus 31, else the gap to the nearer of the two, and the distance is the largest of the three.

Reach proves that the author's chain stood near the chunk at least once: building is a thing done in person (decision D7: a builder's body walks freely without signing, and placing counts only within reach of the chain). It does not prove that the author stood there when they built, and a layer stays valid when its author moves on, because its validity must not change with movements made after it. The reach event can be on a chain that a respawn has since ended; the key it names must then have been named on that chain (§4.4).

**Why 16 (non-normative):** half a chunk. A player standing anywhere in a chunk can build in it and in its neighbours, and a player who hops to the middle of a region of 2^8 cannot build anywhere in it without moving closer. The number is open (§12): TERRAIN mode's own reach for the block cursor is about 5 blocks, and the protocol's reach is deliberately larger, so that walking around a build without signing does not strand it.

## 7. Who wins a cell: the Cell Rule (normative)

Every author writes only their own layers, so layers can disagree about a cell. Every reader resolves each cell of a chunk the same way from the same set of layers, whatever order they arrived in.

### 7.1 Which layers count

A reader **counts** the valid layers of a chunk (§6), minus:

- **Mutes:** every layer whose author is in the reader's mute list (`kind 10000`, a `p` entry) is removed before anything else is computed. The chunk then resolves as if that author had never built in it: cells the muted author owned are owned, for this reader, by whoever placed next.
- **A cap:** a reader SHOULD count at most 64 authors in one chunk. When more are present, it SHOULD count, in this order, its own identity, the identities it follows (`kind 3`), the home chunk's owner (§7.3), and then the rest by their earliest settle in the order of §7.2.

Mutes and the cap make what one reader draws differ from what another draws, and that is their purpose. Two conforming readers holding the same layers can also differ, until they converge, by what they know: which witness heights they could learn (§7.4), which Bitcoin headers they hold (§6.1), and which revisions of the ground they implement (§3.10). Readers that can reach the same witness, hold the same headers and implement the same revisions converge as they learn; a reader that distrusts the witness, or an old client that never learns a new revision, keeps its own view.

### 7.2 The order of placements

Each placement of a counted layer has a **first** settle (from `t0`) and a **last** settle (from `t1`). A settle's place in time is decided by:

- `h`, its committed block height (§5.3);
- `W`, the **witness height**: the height of the best chain's tip, as the witness knew it, when the witness first saw a layer of this author at this chunk carrying this settle id (§7.4). A settle the witness has not recorded for the layer's current version (§7.4) is **unwitnessed**;
- its time `T = max(h, W)` when witnessed.

An unwitnessed settle comes after every witnessed one, in both directions of the order. Among the owner and their builders (rule 4 of §7.3) that means a change published only to relays other than the witness wins over witnessed changes until the witness sees it. This is bounded: only people the owner trusts are affected.

A placement `p` is **earlier** than a placement `q`, comparing the same settle of each (first with first, or last with last), when the first of these that differs says so:

1. a witnessed settle is earlier than an unwitnessed one;
2. the smaller `T` (for two unwitnessed settles, the smaller `h`) is earlier;
3. the settle with more work (§5.3) is earlier;
4. the lower author pubkey, compared as lowercase hex, is earlier;
5. the lower builder pubkey is earlier.

Two placements that agree on all five are the same author's same layer, which has one value per cell, so the order is total.

The **later** of two placements is the one that rule 1 or rule 2, read the other way, makes later (unwitnessed after witnessed, then the greater `T`); when both agree, it is the one that rules 3 to 5 make earlier. Ties go the same way whichever direction is asked.

### 7.3 The rule

For each cell of a chunk's plane:

1. **The placements.** Gather the cell's placements from every counted layer's plane.
2. **The owner.** If the chunk is the **home chunk** of an author `H`, the chunk that contains `H`'s spawn coordinate (the pubkey read as a coordinate, `CYBERSPACE_V2.md` §3.1), in the plane its lowest bit names, the owner of every cell in it is `H`. Otherwise the owner of the cell is the author of its earliest placement, comparing first settles (§7.2). The first person to place in a cell owns it.
3. **Who may change it.** Only the owner's placements and those of authors that the owner lists in `builders` count. The owner's list in a chunk is the union of the `builders` of every counted layer of the owner's there, leaving out every layer signed by a builder key that any authentic movement action of the owner's retires, in either form and on any chain. This is deliberately stricter than §4.3, where a retirement from here on counts only on its own chain: a retired key, which may be a stolen one, cannot add builders anywhere.
4. **The value.** The cell takes the value of the latest of the placements that count, comparing last settles (§7.2).
5. **Otherwise** the cell shows its base (§7.5).

Placements that rule 3 excludes are not drawn for anyone but their author, and a client SHOULD draw an author's own excluded placements for that author marked as theirs alone, and say whose cell it is.

Rule 2 makes a cell that someone mined first theirs too: a hole is a placement of 0. A cell whose last placement returns it to its base value stops being a placement in that layer, and the author's claim on it ends with it.

**The home chunk (non-normative):** every identity's spawn coordinate is its pubkey (§3.1), and two identities share an h5 chunk with a chance of about one in 2^240 per pair, so nobody can grind a key into someone else's home chunk. The home chunk is single occupancy that needs no witness and no race. It is also public: anyone who knows a pubkey can compute its home chunk and visit. It is the front porch.

### 7.4 The witness

The **witness** is the canonical relay, `wss://relay.onosendai.tech` (`CYBERSPACE_V2.md` §7.6, Size). It derives the chunk's key from the layer's reach event, as any reader can (§10), and checks each `kind 33339` event it accepts before it records anything for it:

- the layer is valid (§6.1);
- each settle that it has not recorded before for this author and chunk claims exactly the placements whose `t0` names it (§5.3, Claiming);
- each settle it has recorded before is named by a placement's `t0` only for cells that were placements with that `t0` in the last version it recorded of a layer of this author's at this chunk that carries that settle, whichever builder key signed it.

For a layer that passes, it records the event id, and for each settle id not yet recorded for that author and chunk, the height of the best chain's tip as it knows it at that moment. That height is the settle's `W`. It records `W` once and never changes it, even when a later version replaces the event that first carried the settle. It records the same height for every movement action it accepts that carries `builder-retire`, for rule 4 of §4.4. It SHOULD keep the versions of layers that newer versions replace, so that what it recorded can be audited.

A reader counts a settle as witnessed only when the witness has recorded **the layer's current version** (its event id) and the settle's `W`. A version that the witness refused, or never saw, has only unwitnessed settles, whatever earlier versions carried. So a writer that breaks the rule of Claiming, or publishes only elsewhere, loses its place.

How a reader asks the witness for `W` is not fixed by this draft (§12). A reader that cannot learn `W` treats every settle as unwitnessed: placements are then ordered by committed block alone, which is honest for cells nobody contests and open to backdating for cells somebody does.

**Why a witness (non-normative):** a Bitcoin block hash proves that a settle came after the block, never that it did not come much later. Every past block hash is public, so a stranger can commit today to a block of last week, and an author can build in secret and publish after others have built, taking their cells. The witness's first-seen height closes both: a settle counts from the later of its block and the moment the witness saw it, so committing to an old block buys nothing, and holding a layer back costs the holder their place.

**What the witness can do wrong, stated:** it is weaker trust than mathematics. The canonical relay can refuse to record a settle, record it late, or answer different readers differently. Today it is one relay run by the project. The defences are future work: receipts, the relay's signed statements of what it saw at which height, published as a chain in which each receipt names the one before, so that a receipt inserted into the past is a visible fork that anyone can audit, and a second witness that readers can list. Until receipts exist, a reader that distrusts the witness can treat every settle as unwitnessed, and the home chunk remains the part of the world that needs nobody.

### 7.5 Survey and base

A chunk's plane is **surveyed** for a reader when at least one counted layer's plane object for it has `survey` true. In a home chunk only the layers of the owner and of the builders the owner lists count for this. Its base is then the ground at the newest revision among those surveys, else all empty. Each layer's own placements are still decoded against the ground of the revision it names (§5.5). A cell that no placement decides (§7.3, rule 5) shows that base.

Placements of layers whose `survey` is false count over the reader's base like any others. A layer that has not surveyed cannot express mining a block of ground it never saw, and it does not need to.

### 7.6 What is drawn where

A client draws the ground, and the holes mined in it, only in a mode that builds with blocks (TERRAIN, in ONOSENDAI), and for a user who turns on a lens that shows it. Everywhere else it draws only the cells whose value came from a placement and is not empty: the blocks people placed, like any object someone made (decision D8). A client that does not implement this DECK draws nothing (decision D16).

## 8. Relays (normative for relays that accept `kind 33339`)

### 8.1 No deletions

A relay MUST refuse a NIP-09 deletion request (`kind 5`) that names a `kind 33339` event, by an `e` tag naming one or by an `a` tag of the form `33339:<pubkey>:<d>`, and SHOULD refuse any `kind 5` that carries `["k", "33339"]`.

**Why (non-normative):** a layer is changed by publishing a newer version, which replaces it at its address. A deletion adds nothing honest to that, and it adds two harms. A stolen builder key could erase, in one request, everything that key ever built, beyond what the author can restore. And a deletion by address makes a relay that honours it refuse every version at that address older than the deletion, so an author who restores a layer from a device whose copy is older cannot publish it. Relays that do not implement this DECK still honour deletions (and NIP-62 requests to vanish) from a builder key, and a newer, emptied version acts as a deletion everywhere; the witness keeping replaced versions (§7.4) is what leaves a record.

### 8.2 Checks a relay MAY make

A relay MAY refuse a `kind 33339` event:

- whose builder key is not named on a movement action of the author's that the relay holds (§4.2), or is retired with `all` (§4.3);
- none of whose reach events is a movement action of the author's, of an action §6.2 allows, within reach of the chunk. A relay can check this without the region key: it computes the lookup ids of the chunks within `REACH` of the reach event's `C` (at most two per axis, eight in all) and compares them with the layer's `d`;
- that is longer than 240,000 bytes.

A relay that makes these checks MUST NOT refuse a layer only because it cannot fetch the reach event or the naming action yet; it MAY hold it and check again.

### 8.3 The witness

The canonical relay records first-seen heights as §7.4 says.

## 9. Test vectors

`blocks-vectors.json`, beside this DECK, is produced by `blocks-vectors.mjs` (Node 18 or later, no dependencies) from `blocks-reference.mjs`. The Python listing of §3.11 reproduces every ground in it, and ONOSENDAI's TERRAIN generator (`src/lib/terrain/generate.ts` at 2429f16c), run on the same twelve chunks, reproduces every ground in it; its own tests pin the origin chunk. Like the other vectors in this repository it is not normative: where it disagrees with this text, the text is right and the file is a bug.

| Section | What it holds |
|---|---|
| `constants` | the domain strings, `W8` and samples of `W128`, the threshold, family and vein tables, `REACH` |
| `chacha20_check` | the keystream head for the first chunk's seed (zero nonce, counter 0) |
| `chunks` | twelve chunks: `origin` (0, 0, 0) in dataspace, whose revision 2 ground is pinned; `origin-twin`, the same in ideaspace (one lookup id, two seeds, two grounds); `home`, the chunk of a spawn coordinate; `rich` and `high-k`, whose costliest cubes are K 14; `trees`, with Lumenwood and Canopy glass; `magma`, with a Magmaflow pocket, Basaltine and Glowcore; `pools`, with a Tidewater pool and all four veins; `pool-retry`, whose Tidewater comes after a try with no floor and a try that is undone; `forest`, where a tree is skipped because an earlier tree stands on its site; `trunk-over-canopy`, where crowns overlap and a later trunk replaces an earlier crown (no vector reaches Tidewater's 200-cell stop, which a search of several thousand random chunks never met); `top-edge`, the last chunk on every axis, whose lattice and chunk above wrap. For each: region integer, lookup id, survey seed, the heads of its fine stream, of its feature stream and of the stream above, for information only the family, band thickness and band offset (`d9[3]`) of the chunk's own unwarped 2^9 and 2^11 cells, its 64 cube K values (in the order `i + 4 (k + 4 j)`), its `maxK`, costliest cube, `sumK` and tree sites, the features it placed in order (informational labels: a count after a colon is the number drawn, of veins or trees, or the Tidewater cells placed), the feature branches it took (also informational), and how many feature bytes it read, the SHA-256 of its rock alone (before features) and of its ground, each as 32,768 bytes, one global id per byte (every id revision 2 generates is below 256), the count of every id, and 16 sample cells, plus one of every feature and rare id present, with every intermediate value of §3.7 and §3.9: the soft border warps `w9` and `w11`, the family the cell's strata digests name, and the cell's rock before features. The `origin` chunk also carries its whole ground as a runs array of global ids |
| `settles` | three settles with their claims, claims digests, ids and work: the two of the worked layer (one mined to 13 bits) and one that claims nothing |
| `runs` | runs arrays a reader MUST accept, with their expansions, and five it MUST reject |
| `layer` | a worked layer in the origin chunk: a shaft dug down one column, a Rustband beam, one beam cell changed to Gibsonite at a later settle (its `t0` 0 and its `t1` 1), and a cell set to extension id 300; its plaintext, its 35 placements with their values, ground values and settles, and its tags. Also the plaintext of a layer that only surveys |
| `reach` | six coordinates against a chunk, at distances 0, 16 and 17, and one in the other plane |
| `cell_rule` | nine cells resolved by §7.3: the first placer owns, a late publisher loses, a listed builder changes a cell later, an unlisted one does not, work and then pubkey break ties, an unwitnessed placement comes last, and two home chunk cases |

Some single values, for a quick check:

- `origin`, (0, 0, 0) in plane 0, the pinned chunk: survey seed `d7b3e3627fdb33b93e75cece7f38da5b2bbee55fd8607fbc202307fd36ef8489`, lookup id `3c5d8c498f57d6d61527c53b824efe9edd768c2efd4d05acad6ea2775727c649`, 9,592 empty cells, rock SHA-256 `91e5149516a2b13a4d77fda0c9eefffdc376c356c16c9cd779309ad936359e7e`, **revision 2 ground SHA-256 `e5ff10f286cb54015644230673f999ace28fb000cb268aacce577323efe96f16`**, the value ONOSENDAI's TERRAIN tests pin. Its costliest cube is cube 1, of K 12, `sumK` 643; its features are four Ferrovein veins, a Prismite vein and a Voidpearl at (12, 6, 4), after 106 feature bytes. The chunk sits at a corner of a 2^11 cell, so its soft borders read digests across the wrap at 0: cell (31, 0, 0) is Gridstone (1), with `D` 1659 against `thr` 1196, `kS` 160, warps `w9` (13, 9, −16) and `w11` (−49, 42, 32), and the crystal family.
- `origin-twin`, (0, 0, 0) in plane 1: the same lookup id, survey seed `ec182af4594517efa3bd2ad5ae315db14f9e53da557a65c91a8c61d5667248ab`, ground SHA-256 `ff0f2b0c209425412b8ccd72d5da20000062b2cf2fdcbdf3ad3e2d48247c064d`.
- `magma`: a volcanic chunk of K 12 whose features are Magmaflow, two Ferrovein veins and Glowcore; ground SHA-256 `dc1f0d0a512f2215e233216dd887d86fa4a7980e9fefb8c701edad8157bd6a75`.

## 10. Security considerations

- **Forged builder keys.** A layer is valid only for a key that the author's own signed chain names (§4.4), so nobody can build in someone else's name without their identity's signature on a naming tag. A relay or reader that skips the check draws forgeries; the check is a walk back along previous links, which readers already hold for presence.
- **Stolen builder keys.** A device's key can be lost with the device, and a thief who holds it writes as the author. Retirement "from here on" stops new layers that name later reach events, and rule 4 of §4.4 stops, where the witness is used, forged layers that name old ones; without the witness it does not, so a key that may have been copied is retired with `all` (§4.3). A retired key cannot add builders (§7.3). Retirement with `all` voids everything the key wrote; the author's other keys can write it again and carry its settles, so cells keep their places (§5.3). A thief can also replace the honest layer at the key's address with an empty version, and the cells it held lose their owner until the author writes them again from another key.
- **Reach bypass.** A layer must name a movement action of its author's within 16 gibsons of the chunk, in the same plane, whose position the chain rules prove: a spawn, a hop, a sidestep, a hyperspace action or an exit, valid on its line (§6.2). A virtual or skipped action, whose `C` nobody checks, is never a reach event. Faking presence therefore means making the hops that reach the place. Naming an old reach event is allowed; presence once is the proof, by design.
- **Overwriting someone's cells.** A stranger's placement in a cell someone else placed first is not drawn for anyone else (§7.3, rule 3). Mining someone's build is a placement of 0 in their cells, and is excluded the same way. In a home chunk nothing but the owner's and their builders' placements count.
- **Backdating and withholding.** A committed block proves only "not before". The witness's first-seen height makes a settle count from when the witness saw it (§7.2, §7.4), so committing to an old block and publishing late both lose. A settle's claims are bound into its id, and the witness checks, before recording, that a new settle claims exactly its placements and that an old settle is named only by cells it has held since (§5.3, §7.4). A reader honours witness heights only for a version the witness recorded, so an author cannot point a new placement at an old witnessed settle, and cannot claim cells in advance without placing in them. Placing junk in many cells early is still allowed; that is squatting (below). Without the witness, backdating wins, and a reader that cannot reach the witness orders contested cells by committed block alone (§7.4).
- **Surveying someone's build.** Anyone within reach can survey a chunk outside a home chunk. A build made in empty space without a survey then shows the ground in the cells it left empty, for every reader. Its builder can survey too and mine those cells, and owns the holes as their first placer; a reader can mute the surveyor. Whether a survey should count only for cells nobody has built around is open (§12).
- **Reorganizations and fake blocks.** A settle commits to a block at least 6 deep (§5.3). A reader drops a layer whose settle names the wrong hash at a height 6 or more below its tip, and does not count a layer whose settle names a height it cannot yet confirm, so a made-up height or hash never wins (§6.1). A reorganization deeper than 6 blocks drops layers that committed inside it until their writers settle again.
- **The witness itself.** It is one relay, and trusting it is weaker than trusting mathematics. It could refuse, delay or lie. Receipts and a second witness are future work (§7.4, §12).
- **Squatting.** Anyone can place one block in many chunks to own a cell in each. Owning a cell is owning that cell, not the chunk around it, so a squatter takes cells, not places. Each settle can carry work, which breaks ties and could later price claims. Mutes remove a squatter for whoever mutes them.
- **Grinding work.** Work only breaks ties between settles witnessed at the same height (§7.2, rule 3). It cannot buy an earlier time.
- **Oversized layers.** A layer longer than 240,000 bytes is dropped by every reader (§5.6), so a griefer cannot make readers disagree with one, and the worst layer of one plane fits.
- **Too many layers.** A reader counts at most 64 authors in a chunk (§7.1).
- **Malformed layers** are dropped alone (§6.1).
- **Privacy.** The `builder` tag on a movement action links a builder key to its author in public, and a layer's `p` names its author. A layer's reach event is a public movement action within 16 gibsons of the chunk, so anyone can compute which chunk a layer is in from its tags, and then its key, which at height 5 costs a fraction of a millisecond. **Block layers are not private.** The region key keeps their contents from relays and casual readers, as it does for every bag, but not from anyone who looks. This follows from reach: a layer must be near its author's chain, and the chain is public, so even a reach reference inside the seal would leave the chunk computable from the author's movements. A builder who wants a build kept secret builds where their chain does not go, which this DECK does not allow, or hides it as objects in a bag at a height that is expensive to derive. Public settle ids also link an author's versions and keys over time (a carried settle shows that two keys belong to one author at one place), and `builder` tags show how many devices an author builds from.
- **Determinism.** Every value of the ground is an integer computed exactly as §3 says. A reader MUST NOT replace any step with floating point, a different noise, or a different order of interpolation: one floor in a different place changes the ground, and two readers then disagree about which cells are placements.

## 11. Out of scope (non-normative)

- **The live room.** Builders near one another see each other's changes within a fraction of a second, before they settle: an ephemeral event sealed to the h12 room key, as chat is (DECK-0005), signed by a session key that the builder key authorizes. It needs its own kind in the ephemeral range and its own rules for rate and authorization, and it changes nothing a layer says. Settled layers are the truth, and the live room is a preview of them. A later revision of this DECK, or a DECK of its own.
- **The survival game.** What a block is worth, what mining yields, tools, recipes, an inventory that strangers can check ("placed is at most mined plus received"), and scarcity across players are rules of play. They belong to a game under DECK-0002, which names this DECK as its world and adds its rules in its fold (arkinox's ruling D15, 2026-11-24: a Blocks DECK for building, plus an optional survival game on top).
- **The voxel field for imports.** The importer (ONOSENDAI's `/import`, "Import a build") writes builds exported from other block-building tools as SNO meshes in sealed pieces, which needs no spec change. A voxel field, an optional DECK-0003 field that carries blocks as cells inside an object, is a later DECK-0003 revision, and with it a build could become blocks in this DECK's sense.
- **Wall seams and Bitcoin veins.** The protocol's walls as seams of special material, and veins that ripen with each Bitcoin block, are the next layers of the ground after terrain K (decision D9). Each is a revision of §3.

## 12. Open questions (non-normative)

Decisions marked delegated were made by Claude on arkinox's delegation of 2026-11-24 and are his to change.

1. **Reach.** 16 gibsons, Chebyshev, from the chunk's box (§6.2). TERRAIN mode's cursor reaches about 5 blocks. Is 16 right, or should it be 8? Recommendation: 16, so that walking around a build without signing never strands it.
2. **How readers ask the witness** for a settle's `W` (§7.4). Recommendation: a NIP-11 extension or a small HTTP endpoint on relay.onosendai.tech that answers settle ids with heights, signed by the relay's key, as the first step toward receipts.
3. **Retirement with `all` across chains** (§4.3): the ruling says a retirement is in a later event of the same chain. Allowing `all` from any chain of the author, including after a respawn, is delegated; without it, a key named on a chain that a respawn has ended could never be retired.
4. **Rule 4 of §4.4,** which uses the witness to stop a retired key's layers that name old reach events. Delegated.
5. **Settles carried across builder keys** (§5.3): the settle id binds the author, not the key, so another of the author's keys can rewrite a retired key's work without losing its place. Delegated.
6. **Two times per cell** (`t0` and `t1`): ownership by the first placement, changes among the owner and builders by the latest. Delegated, to make "the first placer owns the cell; only they and builders they list can change it" work when the owner changes their own cell later.
7. **The reach reference in public** (§5.1, §10). It lets relays check reach without the key, and hiding it inside the seal would not make layers private (§10). Delegated.
8. **The ground's tables** (§3.8, §3.9) are revision 2, as ONOSENDAI's TERRAIN mode draws it (#916): the owner's rarity table, calibrated by its `scripts/terrain-calibrate.mjs`. Recommendation: tune after people walk it, as revision 3.
9. **Names of blocks** (§2.3) are invented for Cyberspace and provisional (question 16).
10. **The kind number.** `33336`, the number first chosen, is taken: a census of 2026-11-24 across relay.damus.io, nos.lol, relay.primal.net, relay.nostr.band, relay.snort.social, offchain.pub, nostr.mom, relay.nostr.net, relay.onosendai.tech and cyberspace.nostr1.com found 53 `kind 33336` events from three pubkeys (an app's `defan-proj-v1` parts, 2026-11-02 to 2026-11-24). `33337` is taken too (a peer list and creature events). `33339`, `33341` to `33346` and `33350` returned nothing on any of those relays, and none is in the NIPs. This draft uses **`33339`**, beside the other addressable cyberspace kinds (33330, 33331, 33335, 33338, 33340). The owner's to confirm; nothing has published either number for blocks.
11. **Claims in every settle, checked by the witness** (§5.3, §7.4), added after review to stop a writer from pointing new placements at an old witnessed settle or claiming cells in advance. They cost a runs array per plane per settle, a few dozen bytes for clustered building, and they make the witness decrypt and check each layer it records. Delegated.
14. **Merging without losing time** (§5.3). A merged settle could name the settles it replaces and keep the latest of their witness heights, which the witness can check. Recommendation: add it if long builds hit the cap of 32 settles in practice.
15. **The chunk skin.** Revision 2 draws no skin on faces bordering unsurveyed chunks. The drawn-only skin of the previews was removed in TERRAIN #916, so this DECK says nothing about one: a client draws a chunk's cells as they are.
16. **The block set** (§2.3) is TERRAIN's: 24 blocks with invented names. A later revision adds blocks with new invented names, never names borrowed from another game.
17. **The Assay** (pending the owner's decision, which must come before this DECK leaves Draft). The materials ideation (`craft-design/materials/`) suggests drawing the rare band at survey time from a Bitcoin block mined after the survey is committed, instead of from the chunk alone. Today anyone can compute every chunk's rare blocks offline, map them, and walk straight to them; an Assay would make a rare find unknowable until someone surveys the chunk and a later block is mined. It would make the ground depend on a block hash, so the survey would have to name its block in the layer, and two surveys of one chunk at different blocks would disagree about the rare band, which the Cell Rule would then have to settle. It changes the ground, so it is a revision, and it should be decided before revision 2 is fixed.
12. **Surveys over someone else's build** (§10). Options: as written (any survey counts outside home chunks), or a survey counts only for cells no placement encloses. Recommendation: as written for the first release, with mutes, and revisit when people build in the same places.
13. **Which actions can be reach events** (§6.2): spawn, hop, sidestep, hyperspace actions and exit-virtual, never virtual or skipped actions. Delegated, after review.

## 13. Implementations (non-normative)

- `blocks-reference.mjs` (this directory): the ground, runs, layer planes, settles, reach and the Cell Rule, in JavaScript with no dependencies beyond `node:crypto`.
- The Python listing of §3.11, which reproduces `blocks-vectors.json` independently of the JavaScript.
- An implementation written by an independent reviewer from the prose and tables of §3.1 to §3.10 alone, without the listing or the JavaScript, which reproduced every ground and every intermediate value in the vectors on its first run (2026-11-24).
- The TERRAIN previews (2026-11-24, not published): a viewer of revision 1 in floating point, the source of the first block set, the families and the soft borders.
- ONOSENDAI's TERRAIN mode, #916 at 2429f16c (`src/lib/terrain/generate.ts`): WALK with block tools, single player, survey, mine and place, its op log folded into §5.5 plane layers with `ground: 2`; it does not publish layers yet. Its generator is revision 2 and the source of this section's text; its tests pin the origin chunk's ground. Its calibration, `scripts/terrain-calibrate.mjs`, measured the tables of §3.9.
- The benchmark of 2026-11-24 (not published): generation methods, storage encodings and event growth per chunk, which chose ChaCha20, the 8 and 4 lattices from terrain digests, palette runs without compression, and the smaller of a diff and a whole chunk.
