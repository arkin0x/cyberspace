# DECK-0009: Blocks

DECK: 0009
Title: Blocks
Status: Draft
Mandatory: no
Created: 2026-11-24
Last updated: 2026-11-25
Requires: `CYBERSPACE_V2.md` §2 (coordinates), §3.1 (the spawn coordinate), §4.6 and §4.7 (Cantor roots and region integers), §5.2 (terrain `K`), §5.5 (integer encoding), §7.2 (region keys and lookup ids), §7.6 (the bag cipher), §8.2 (event ids), §8.8 (the tags the chain rules read) and §8.13 (a tag the chain rules never read, as precedent); NIP-01, NIP-02 (`kind 3` follows), NIP-31, NIP-51 (`kind 10000` mutes); RFC 8439 (ChaCha20)

## Abstract

**Blocks** are cubes of material that people mine and place in cyberspace, one block per gibson. The world under them is the **generated ground**: rock, caves, pools, trees, veins and rare finds that every client computes from the place itself, the same for everyone, and that costs nothing to store. A place has no ground until someone **surveys** it, and what people change is written down as the difference from that ground.

Space is cut into **chunks**, the aligned regions of height 5, 32 gibsons on a side. Each device that builds holds a **builder key** of its own. The player names it once, with a tag on a movement action they sign anyway, so building never asks the player's identity for a signature. A builder key writes one **block layer** per chunk: an addressable event whose content is sealed with the chunk's region key, exactly as a bag is, and which says what that builder changed there.

Blocks are built the way shards are placed: anyone may build anywhere, and nothing in the protocol regulates contested space. Where layers disagree about a cell, every reader decides what it shows by one rule, the **Stack**: the owner of a **home** (the 27 chunks around their spawn) first inside it, then the reader's own blocks, then the people the reader follows, then everyone else, the newest first; mutes hide an author entirely. A builder can list **co-builders**, whose changes count at the builder's rank in the cells the builder placed. Blocks are worth what a build is worth to the people who see it; nothing here makes a block scarce or provable, and an inventory is the client's (§9).

This DECK defines the block ids and their first registry (§2), the generated ground completely enough for two implementations to agree on every cell (§3), builder keys (§4), `kind 33339`, the block layer (§5), what makes a layer valid (§6), the Stack (§7), co-builders (§8) and what relays do (§10). It writes down arkinox's rulings of 2026-11-21 (no compression), 2026-11-24 (block size, chunk size, builder keys) and 2026-11-25 (kind 33339; a right-sized design: the Stack, the home cube, retirement without heights, co-builders, no presence requirement and no witness). The ground is revision 2, the one ONOSENDAI's TERRAIN mode draws (ONOSENDAI #916). Its tables are tunable: a change to any of them is a new revision, which layers name (§3.10).

**Defined here:**

| Thing | Value |
|---|---|
| A block | one gibson: one cell of the grid that the coordinates already are (§2.1) |
| A chunk | an aligned region of height 5, 32 by 32 by 32 cells, in one plane (§2.2) |
| A block id | a 16-bit global id. 0 empty; 1 to 63 natural; 64 to 191 made; 192 to 254 special; 255 reserved for extension; 256 to 65535 the extension space (§2.3) |
| The generated ground | a pure function of the chunk: terrain digests of `CYBERSPACE_V2.md` §5.2, smooth integer noise, and a ChaCha20 stream seeded by `CYBERSPACE_BLOCKS_SURVEY_V1` and the chunk's Cantor root; rock from weighted strata, then features drawn from the same stream in a fixed order. Revision 2 (§3) |
| A builder key | a device-local keypair, named by `["builder", "<hex>"]` on a `kind 3333` event and retired, with every layer it signed, by `["builder-retire", "<hex>"]` (§4) |
| A block layer | `kind 33339`, addressable, signed by a builder key, `d` = the chunk's lookup id, `p` = the author, content sealed with the chunk's region key; plain JSON runs, as a diff from the ground or as the whole chunk, the shorter of the forms that can express its changes (§5) |
| The home | the 3 by 3 by 3 chunks centred on the chunk that holds an identity's spawn coordinate, in its plane (§7.2) |
| The Stack | per cell, the highest-ranked counted layer that changed it: the home owner inside their home, then the reader, then follows, then everyone else, newest first; mutes removed first (§7) |
| Co-builders | identities a layer lists; in cells the author changed, their layers count at the author's rank (§8) |

## Terms

- **Cell:** one gibson of a chunk, named by its local coordinates `(x, y, z)`, each 0 to 31.
- **Chunk:** an aligned region of height 5 in one plane, named by its base `(X, Y, Z)`, each a multiple of 32, and its plane `P` (§2.2).
- **Ground:** the generated ground of a chunk, 32,768 global ids (§3).
- **Survey:** the act of starting a chunk's ground. A chunk is empty until a counted layer surveys it (§3.1, §7.5).
- **Author:** the identity a layer builds for: the layer's `p`, whose movement events name the builder key.
- **Builder key:** a keypair a device generates and keeps, which signs block layers for an author (§4).
- **Layer:** a `kind 33339` event (§5), and what it says about one chunk and its twin.
- **Changed cell:** a cell whose value in a layer's plane differs from that plane's base (§5.4). A layer speaks only for the cells it changed.
- **Reader:** the client that draws a chunk, and the identity it is signed in as.
- **Home:** the 27 chunks around an identity's spawn chunk (§7.2). Its **home owner** is that identity.

## 1. Overview (non-normative)

| Kind or tag | Name | Published? | Signed by |
|---|---|---|---|
| `33339` | block layer | yes, addressable, one per builder key per chunk | the builder key |
| `["builder", "<hex>"]` on `kind 3333` | names a builder key | on any movement action | the player |
| `["builder-retire", "<hex>"]` and `["R", "<hex>"]` on `kind 3333` | retires a key, and every layer it signed | on any movement action | the player |

The life of a block change, in the client this DECK was written for: a player in TERRAIN mode mines a block; the change goes into a log on the device at once, and the world redraws. A few seconds later, or when the player leaves the chunk, the device folds the log into its layer for that chunk and publishes a new version of the layer, signed by its builder key. No prompt appears, whatever signer the player uses for their identity, because the identity signed only once: the movement action that named this builder key.

A reader gathers every layer whose `d` is a chunk's lookup id, opens them with the chunk's region key, drops the ones that are not valid (§6), and resolves every cell by the Stack (§7). The ground is computed, never fetched.

This is the shard model applied to blocks. Anyone may hide a shard anywhere, and a reader decides what to show; anyone may build anywhere, and the Stack decides, per reader, whose block shows in a cell. Nothing is owned, claimed, witnessed or timed, and nothing needs to be: a block has no value the protocol protects. The home is the one place where one identity's blocks come first for everyone, and it needs no infrastructure, because a spawn coordinate is the identity itself.

Nothing here changes the movement chain's validity. The builder tags ride on actions the player signs anyway, and the chain rules never read them (§4.5). A client that does not implement this DECK sees nothing: it skips `kind 33339` like any kind it does not know.

## 2. Blocks and chunks (normative)

### 2.1 One block per gibson

A block is exactly one gibson (`CYBERSPACE_V2.md` §2.1): the cell at integer coordinates `(x, y, z)` in one plane. Blocks are aligned to the coordinate grid. There are no half blocks and no blocks between gibsons. How fast a builder walks and how high it jumps is the client's (arkinox's ruling, 2026-11-24).

### 2.2 Chunks

A **chunk** is an aligned region of height 5 (`CYBERSPACE_V2.md` §4.5): the 32 by 32 by 32 cells whose coordinates share every bit above the lowest five on each axis, in one plane. Its base is `X = (x >> 5) << 5`, and likewise `Y` and `Z`, for any cell `(x, y, z)` in it. Its region integer is `region_n = π(π(cx, cy), cz)` with `cx = compute_subtree_cantor(X, 5)` and likewise `cy` and `cz` (§4.6, §4.7). Its region key and its lookup id are those of §7.2 for that `region_n`.

A chunk and its twin, the chunk with the same base in the other plane, share one `region_n`, one key and one lookup id (`CYBERSPACE_V2.md` §2.4, §7.2). They are two chunks with two grounds (§3), and one layer carries both (§5.4).

**Cell index (normative):** the cells of a chunk are ordered with `x` fastest, then `z`, then `y`: `index = x + 32 z + 1024 y`. Every list of cells in this DECK (the ground, the runs of §5.3, the changed cells of §5.4) is in this order.

**Why h5 (non-normative):** a layer must fit one event. At height 5 the worst layer that can be written in one plane, every cell a different block from a palette of 256, is about 131,000 bytes of JSON, which seals to under 180,000 bytes and fits the 240,000 byte guard ONOSENDAI applies to bags. At height 6 the same worst case is eight times larger. The live room, where builders see each other's changes as they happen, is height 12, the chat height (DECK-0005); it is out of scope here (§13).

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

**Placing (non-normative):** the protocol does not check what a player owns. Any id may be placed. An inventory, and a rule such as "placed is at most mined plus received", belong to a game or to the client (§9).

### 2.4 Palettes

A layer stores a chunk as one palette index per cell, and a **palette** per plane that maps indices to global ids (§5.4). A palette has at most 256 entries, so a cell costs one index whatever the global id it names, and the world is not limited to 256 kinds of block.

## 3. The generated ground (normative)

The ground of a chunk is a pure function of its base and its plane: 32,768 global ids, every one of them natural (1 to 63), special (192 to 197) or empty (0). Every value that decides a cell is an integer. Every division is a floor division of non-negative integers, and the only shifts of signed values are the soft border warps of §3.9, which round toward negative infinity. Every per-cell value is below `2^53`; the region integer of §3.2 is an arbitrary precision integer, and the strata hash of §3.9 is a multiplication modulo `2^32`, which an implementation computes exactly (in JavaScript with `Math.imul`, never as a float product, which loses bits above `2^53`). Two implementations that follow this section produce identical grounds; the vectors of §9 check it.

### 3.1 Empty until surveyed

The ground of a chunk is not drawn, and does not exist for the Stack, until a layer that a reader counts **surveys** the chunk's plane (§5.4, `survey`; §7.5). Until then the chunk is empty. Surveying is publishing a layer whose plane says so. It costs a writer what a layer costs: one signature by its builder key, and the h5 Cantor root, which §3.2 needs anyway.

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

A **revision** of the ground is a whole definition of §3.2 to §3.9, named by an integer. A layer names the revision it was written against in each plane's `ground` (§5.4). This section is **revision 2**.

- Revision 2 keeps revision 1's seed, its stream, its lattices and its open space, so its domain string is still `CYBERSPACE_BLOCKS_SURVEY_V1`: the domain names the seed's construction, and a revision that changes the seed changes it too. Revision 2 changes what fills the rock and adds the features.
- Revision 1 was a draft of 2026-11-24 that no published layer used. It is withdrawn, and a reader treats `ground: 1` as a revision it does not implement.
- A reader MUST compute a plane's base by the revision it names. A plane whose `survey` is false has an empty base whatever revision it names, so a reader decodes it under any revision. A surveyed plane in `diff` form that names a revision the reader does not implement is set aside, unread, and the layer's other plane goes on (§6, check 6), because its `null` cells and its changed cells are defined against a ground the reader cannot compute. The reader SHOULD say that something is built here that a newer client can show.
- A surveyed plane in `whole` form names every cell's value, so a reader can **load it under any revision**: it MAY show those values to the layer's author, in the author's own client. Until the reader implements the plane's revision, the plane takes no part in the Stack: it is never a candidate (§7.4) and its survey does not count (§7.5). The layer's other plane, and its `cobuilders`, still count.
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

Note (non-normative): ONOSENDAI keeps each builder key in IndexedDB under the author's npub, as it keeps all local data (arkinox's rule of 2026-11-19: a switch of identity never deletes). A device that loses its builder key makes a new one and names it.

### 4.2 Naming a builder key

An author names a builder key with a tag on a movement action (`kind 3333`, `CYBERSPACE_V2.md` §8.1) that the author signs:

```
["builder", "<builder pubkey, 64 lowercase hex characters>"]
```

- A writer MAY add one or more `builder` tags to any movement action: a spawn, a hop, a sidestep, a hyperspace action of DECK-0001, a bracket action or an action inside a bracket (`CYBERSPACE_V2.md` §8.11). It SHOULD add the tag to the next action its user signs anyway, so that naming a key costs no signature of its own. A writer MAY also sign a movement action only to name a key, when its user wants to build before moving.
- A tag whose second element is not exactly 64 lowercase hex characters names nothing, and a reader ignores it. It does not make the event invalid (§4.5).
- A device whose key is not yet named holds its layers on the device and publishes them after the action that names its key.

### 4.3 Retiring a builder key

An author retires a builder key with a tag on a movement action, and every layer that key ever signed is void with it (arkinox's ruling, 2026-11-25):

```
["builder-retire", "<builder pubkey, 64 lowercase hex>"]
["builder-retire", "all"]
```

- **One key:** `["builder-retire", k]` voids `k` for good. Every layer `k` signed, before or after the retirement, is void (§4.4), and naming `k` again does not revive it. There are no heights and no "from here on": a retired key is simply no longer the author's.
- **All:** `["builder-retire", "all"]` voids every key the author named before it: every key whose newest naming has a `created_at` no later than the retirement's. A key named later, by an action with a greater `created_at`, is valid. This is for an author who lost track of their devices, or suspects a copy of one. A writer that writes `all` dates it after every naming it knows of, so that a naming it dated ahead by mistake does not outlive the retirement.
- **Finding retirements (normative for writers):** relays index only single-letter tags (NIP-01), so beside every `builder-retire` tag a writer MUST add `["R", "<the same second element>"]`: `["R", k]` or `["R", "all"]`. A reader then finds an author's retirements of `k` with one filter, `{"kinds": [3333], "authors": [A], "#R": [k, "all"]}`, and reads the `builder-retire` tags of what comes back. An `R` tag by itself retires nothing.
- A `builder-retire` tag whose second element is neither 64 lowercase hex characters nor `all` retires nothing.
- **What a writer does (normative for writers):** a writer that retires a key it used publishes again, under its current key, the layers that key held, so that its blocks stand under a valid key (§5.6).

### 4.4 When a key is valid

A builder key `k` is **valid** for an author `A` when, among the authentic `kind 3333` events of `A` (on any chain, valid or not, including chains a respawn has ended):

1. some event carries `["builder", k]`;
2. no event carries `["builder-retire", k]`;
3. no event that carries `["builder-retire", "all"]` has a `created_at` at or after the newest `created_at` among the events that carry `["builder", k]`.

A layer is signed by a valid key, or it is void (§6). Validity depends only on the author's own signed events, never on where they stood or when a layer was made, so every reader holding the same events agrees. A reader that has not fetched the author's movement events cannot establish rule 1 and does not count the layer until it has.

**Why created_at is enough here (non-normative):** only the author can sign a `kind 3333` event, so only the author orders their namings and their `all` retirements. A thief with a builder key cannot sign one, and so cannot name a key, retire one, or move a naming past a retirement.

### 4.5 The chain rules never read these tags (normative)

`builder`, `builder-retire` and `R` are not tags the chain rules read (`CYBERSPACE_V2.md` §8.8). They never affect whether an event or a chain is valid, where an identity stands, how a chain is resolved (§8.7.3), how a fork is found, or what any proof commits to. A verifier MUST treat an action that carries them exactly as the same action without them, and MUST NOT reject an action for a malformed one. This is the rule of §8.13 for the no-broadcast tag, applied to these three.

**The hop math is unchanged (non-normative):** a hop proof commits to the two coordinates, the terrain and the previous event's id (`CYBERSPACE_V2.md` §5.3 to §5.10), never to the event's own tags. Adding a builder tag changes only the event's own id, as any tag would, and the next action reads that id as its previous id exactly as it always does.

## 5. The block layer: `kind 33339` (normative)

### 5.1 The event

| Field or tag | Value |
|---|---|
| `kind` | `33339`. NIP-01 addressable: a relay keeps the newest event per `(pubkey, kind, d)`, so one builder key has one layer per chunk, and each version replaces the one before |
| `pubkey` | the builder key |
| `content` | empty |
| `["d", "<lookup id>"]` | exactly one. The chunk's lookup id (`CYBERSPACE_V2.md` §7.2), 64 lowercase hex |
| `["p", "<author pubkey>"]` | exactly one. The author, 64 lowercase hex |
| `["encrypted", "aes-256-gcm", "<payload base64>"]` | exactly one. The plaintext of §5.4, sealed with the chunk's region key under the cipher of `CYBERSPACE_V2.md` §7.6: AES-256-GCM, a fresh 12-byte nonce for every encryption, a 16-byte tag, `nonce || ciphertext || tag`, standard base64 with padding |
| `["version", "1"]` | exactly one. The rules of this section. A reader MUST ignore a layer whose version it does not know |
| `["alt", "<text>"]` | OPTIONAL, at most one. A NIP-31 description, the same sentence on every layer a writer publishes, saying nothing about the place or what is built there, at most 280 bytes of UTF-8 (§5.5) |

A writer MUST NOT add a `C`, a height tag (`H` or `h`), a `hint`, sector tags, `contents`, NIP-70's `-`, or a `client` tag. A layer is a bag in its cipher and its key, and like a bag it carries nothing public that says where it is. A reader ignores any other tag.

### 5.2 The key

The layer is sealed with the region key of its chunk, the key whose lookup id is its `d`. A reader that has derived that key for a cell of the chunk, or of its twin, opens it. A failed decryption means only that the reader does not hold this chunk's key (`CYBERSPACE_V2.md` §7.6).

### 5.3 Runs

A **runs array** is a JSON array of integers that spells a list of values, the encoding DECK-0003 §1.4a uses for `facecolors`: a non-negative entry is a value, and a negative entry `-N` stands for N more copies of the value before it.

- The first entry MUST be non-negative, because a repeat has nothing before it.
- Every non-negative entry MUST be below the palette's length.
- Expanded, the array MUST produce exactly 32,768 values.
- Every entry MUST be a JSON number written as an optional `-` and decimal digits with no leading zero, no fraction, no exponent, and not `-0`, from -32768 to 65535. A reader that parses `1.0` and `1` alike MUST check the text, or reject what its parser cannot tell apart.
- A reader MUST check the length while it expands, and stop at the first entry that would pass it, so that an array such as `[0, -1000000000]` costs nothing.

A runs array that breaks any of these is malformed. A writer SHOULD write runs in the shortest form, a value then `-N` for its repeats, but a reader MUST accept any well-formed array.

This is encoding, not compression: plain JSON integers, readable by eye. The standing ruling of 2026-11-21 forbids compressing sealed payloads, and nothing in this DECK compresses.

### 5.4 The plaintext

The plaintext is a JSON object, UTF-8, with these fields; a reader ignores any other:

| Field | Value |
|---|---|
| `planes` | an array of 1 or 2 plane objects, at most one per plane |
| `cobuilders` | OPTIONAL. An array of 0 to 64 author pubkeys, 64 lowercase hex each (§8). The author's own pubkey in it is ignored |

A **plane object**:

| Field | Value |
|---|---|
| `plane` | 0 or 1 |
| `survey` | `true` if this author has surveyed this plane of the chunk, `false` if not |
| `ground` | the revision of the ground the plane was written against, an integer: 2 for this DECK (§3.10) |
| `form` | `"diff"` or `"whole"` |
| `pal` | the palette: an array of 1 to 256 entries. In `diff`, entry 0 MUST be `null`, which means "the base value of this cell", and every other entry is a global id. In `whole`, every entry is a global id. A global id is an integer from 0 to 65535 |
| `cells` | a runs array (§5.3) of 32,768 palette indices, one per cell in index order (§2.2) |

**Base and values.** The plane's **base** is the ground of §3 at the revision `ground` names if `survey` is `true`, and all empty if `survey` is `false`. The value of a cell is `pal[index]`, or the base value of the cell where that entry is `null`.

**Changed cells.** In `diff` form, a cell is **changed** by this layer exactly when its palette entry is not `null`, even when the global id it names equals the cell's base value. In `whole` form, a cell is changed exactly when its value differs from its base value. Mining a block of the ground is changing it to 0; placing a block in an empty cell is changing it to that block's id; and setting a cell, in a `diff`, to the value its base already has is a change too, which is how a layer removes a block that another layer placed in empty space, or refills a hole another layer mined, for the readers who rank it first. A layer speaks for its changed cells and for nothing else (§7.4).

**Writing changes (normative for writers):** a writer writes a cell as changed when its user changed it, and leaves it `null` otherwise, even when its user changed it back to the base value only by removing their own block (that is no change). A writer that wants to say "this cell is the base value, whoever placed something here" writes it explicitly in a `diff`. `whole` cannot say that, so such a plane is written as a `diff`.

**A layer that only surveys** has a `diff` plane whose palette is `[null]` and whose cells are `[0, -32767]`: about 100 bytes of plaintext.

**Choosing the form (normative for writers):** a writer SHOULD write each plane in the shorter of the forms that can express its changes: `whole` cannot mark a cell explicitly at its base value, so a plane with such a cell is a `diff`. The benchmark of 2026-11-24 measured a house dug into the ground at 2,700 bytes as a diff, and a castle that replaces the ground at 17,653 bytes whole against 30,026 as a diff.

Note (non-normative): earlier drafts of this DECK put `settles`, `builders`, `t0` and `t1` in the plaintext, and a reader ignores them as unknown fields. A plane from those drafts that has no `ground` names no revision this DECK implements: if its `survey` is false it reads normally, and otherwise it is set aside or values-only as §3.10 says. Its writer publishes it again with `ground: 2`.

### 5.5 Limits (normative)

- A writer MUST NOT sign a layer whose serialized event is longer than 240,000 bytes. The serialized event is the event object as compact JSON in UTF-8, with exactly the keys `id`, `pubkey`, `created_at`, `kind`, `tags`, `content` and `sig`, in that order, no whitespace, and strings escaped as NIP-01 escapes them for the id. This is the bag guard of `CYBERSPACE_V2.md` §7.6 (Size). A reader MUST drop a longer one, so that every reader decides on the same layers.
- `planes` at most 2, `pal` at most 256, `cobuilders` at most 64.
- **Free text.** A writer writes `content` empty; a reader MUST drop a layer whose `content` is longer than 280 bytes. The `alt` value is at most 280 bytes. Every other tag value is fixed in form: hex, digits, a fixed word (`aes-256-gcm`) or the standard base64 of the payload.
- **What fits.** A plane of ordinary building fits with room to spare: the benchmark's house is 2.7 KB, a castle that replaces the ground 17.7 KB, a chunk with half its cells changed at random about 62 KB. The worst a writer can make, every cell of both planes a different index into a palette of 256, is about 262,000 bytes of `cells` and does not fit. A writer that cannot fit a change MUST refuse it and tell its user, rather than drop anything already written.
- **Why the free text is bounded (non-normative).** Relays measure an event in their own serialization, and some escape characters that NIP-01's does not. The canonical relay's software writes each `<`, `>` and `&` as a six-byte `\u` escape, and others escape non-ASCII the same way, so a character can cost up to six bytes there. Only free text can hold such characters. With `content` at most 280 bytes and `alt` at most 280, the free text can grow by at most 5 × 560 = 2,800 bytes under any such escaping, so a layer within 240,000 bytes is always within 242,800 bytes as any relay counts it, inside the 262,144-byte cap the canonical relay applies to block layers.

### 5.6 Writing, replacing and removing

A writer publishes a new version of its layer to change it, carrying everything it does not change, including the plane it is not writing in, exactly as a bag carries the other plane (`CYBERSPACE_V2.md` §7.6, Planes). A writer removes its blocks from a chunk by publishing a version that changes no cell: a layer that only surveys, or a `diff` plane with `survey` false and every cell `null`. A newer version replaces the old one on every relay, which a deletion request (NIP-09) does not guarantee.

**A new builder key at a chunk (normative for writers).** When a device writes with a builder key at a chunk where another key of the same author has a layer (the device replaced a lost key, retired one, or the author moved to a new device):

1. it MUST read the newest layer of each of the author's other valid keys there, found with `{"kinds": [33339], "#d": [<lookup id>], "#p": [<author>]}`, before it publishes, and holds its own layer until it has;
2. it MUST start its own layer from theirs, every plane, the twin included, with every changed cell's value, and only then apply its own changes; where two old layers change the same cell, it takes the value of the newer layer;
3. it SHOULD then publish, with each old key it still holds and is not retiring, a version of that key's layer that changes no cell, keeping each plane's `survey` and `ground`, so that a cell the new layer released does not stand on in the old one. A retired key's layers are void already (§4.3).

A writer that cannot read an old key's layer keeps holding and SHOULD tell its user why.

**When to publish (non-normative):** ONOSENDAI keeps changes in a log on the device and publishes a chunk's layer when its user leaves it by more than 4 blocks, after 15 seconds without a change alone or 3 seconds with someone near, at 200 waiting changes alone or 50 with someone near, and when its user closes TERRAIN mode or switches identity. LOCAL never publishes: while its user is LOCAL, changes stay on the device, and they are published on the next switch to LIVE. A building session of an hour in two chunks is a few dozen layer versions, each signed by the builder key with no prompt.

## 6. Validity for readers (normative)

A reader that holds a `kind 33339` event checks it in this order, and drops it if any of checks 1 to 6 fails:

1. it is authentic: its `id` and `sig` are valid (`CYBERSPACE_V2.md` §8.2);
2. its tags are as §5.1 requires: exactly one `d` and one `p`, each 64 lowercase hex, exactly one `encrypted` and exactly one `version` of `1`, and at most one `alt`;
3. it is within the limits of §5.5: at most 240,000 bytes serialized, `content` and `alt` at most 280 bytes each;
4. it is signed by a builder key that is valid for its `p` (§4.4);
5. it decrypts with the chunk's key (otherwise the reader simply cannot read it);
6. its plaintext is the object of §5.4, every field well formed and every runs array well formed (§5.3), except that a plane object in `diff` form that names a revision of the ground the reader does not implement is set aside, unread, while the layer's other plane goes on, and a plane in `whole` form under such a revision is read for its values only and takes no part in the Stack (§3.10).

A layer that fails is dropped alone: one malformed or forged layer says nothing about the others in the chunk, as a bag drops one corrupt item (`CYBERSPACE_V2.md` §7.6). A reader SHOULD say that a layer was found and could not be read, rather than draw a guess.

There is no presence requirement. A layer need not be near its author's movements, exactly as a hidden shard need not be: the region key is what it takes to read a layer, and the builder key named on the author's chain is what it takes to write one.

## 7. Who wins a cell: the Stack (normative)

Every author writes only their own layers, so layers can disagree about a cell. Every reader resolves each cell of a chunk by the Stack, from the layers it counts. Two readers holding the same layers, the same follow list, the same mute list and the same identity, with clocks that agree to within the slack of §7.1, implementing the same revisions and not reaching the cap, draw the same chunk. Readers with different identities, follows or mutes draw different chunks where layers disagree, and that is the design: contested space is settled by whom each reader trusts, not by the protocol.

### 7.1 Which layers count

A reader **counts** the valid layers of a chunk (§6), minus, in this order:

1. **Mutes:** every layer whose author is in the reader's mute list (`kind 10000`, a `p` entry) is removed before anything else is computed, its `cobuilders` with it (§8). The chunk then resolves as if that author had never built in it.
2. **The future:** a layer whose `created_at` is more than 600 seconds after the reader's clock is not counted until it no longer is, so that nobody stays on top by dating a layer ahead.
3. **A cap:** a reader SHOULD count at most 64 authors in one chunk. When more are present, it orders the authors by their own rank (§7.3), then by the `created_at` of each author's newest layer there, newest first, then by the lower author pubkey, with no co-builder lifts, keeps the first 64 and leaves out every layer of the rest. A lister left out by the cap lifts nobody (§8). A swarm of new identities can fill the strangers' places, which is why a reader's own blocks, its follows and the home owner come first, and why mutes exist.

### 7.2 The home

An identity's **home** is the 27 chunks of a 3 by 3 by 3 cube of chunks centred on its **spawn chunk**, the chunk that contains its spawn coordinate (its pubkey read as a coordinate, `CYBERSPACE_V2.md` §3.1), in the plane that coordinate's lowest bit names. A chunk with base `(X, Y, Z)` in plane `P` is in the home when `P` is that plane and, on each axis, its base minus the spawn chunk's base, modulo `2^85`, is 0, 32 or `2^85 − 32`. The home wraps at the ends of an axis like everything else (§3.4). It never reaches the twin plane.

Inside its home, an identity is the **home owner**, and its layers rank first for every reader (§7.3). A reader knows whose home a chunk is by checking the author of each layer it counts there: a pubkey cannot be computed from a chunk, and only an author's layers can rank anyway.

**Collision odds (non-normative):** one plane holds `2^240` chunks, so a given identity's home covers a given chunk with a chance of 27 in `2^240`, and two identities' homes overlap with a chance of about 125 in `2^240` per pair. Among a billion identities that is about one in `2^180`. Nobody can grind a key into someone else's home: that is a search of the same size. If two home owners ever share a chunk, both rank first and the order of §7.3 decides between them.

**The home is public (non-normative):** anyone who knows a pubkey can compute its home and visit. It is the front porch: the one place where an identity's blocks show for everyone, needing no witness, no claim and no race.

### 7.3 Ranks and order

Each counted layer has an **own rank** in a chunk:

1. its author is a home owner of the chunk (§7.2);
2. otherwise, its author is the reader's own identity;
3. otherwise, its author is in the reader's follow list (`kind 3`, a `p` entry);
4. otherwise, everyone else.

A layer's **rank** in a cell is its own rank, lifted by co-builders as §8 says. Layers are put in **Stack order**: by rank, 1 first; within one rank, the newer `created_at` first; then the lower author pubkey; then the lower builder pubkey (the event's `pubkey`); then the lower event id, each compared as lowercase hex. The last three break exact ties only, and the order is total.

### 7.4 The rule

For each cell of a chunk's plane:

1. the **candidates** are the counted layers whose plane object for this plane takes part in the Stack (§6, check 6) and **changed** this cell (§5.4);
2. if there is a candidate, the cell takes the value of the first candidate in Stack order;
3. otherwise the cell shows the reader's base for the plane (§7.5).

A layer speaks only for the cells it changed. A layer that changed one cell of a chunk competes for that cell alone, and every other cell is decided without it.

### 7.5 Survey and base

A chunk's plane is **surveyed** for a reader when at least one counted layer's plane object for it has `survey` true. Inside a home, only a home owner's surveys count, so that nobody can fill an owner's open build with rock by surveying around it. The reader's base for the plane is the ground of §3, at the newest revision it implements among the counted surveys, when the plane is surveyed, and all empty otherwise. A plane that takes no part in the Stack (§3.10) does not survey. Each layer's own changed cells are still decoded against that layer's own base (§5.4).

### 7.6 What is drawn where

How a client draws the ground and blocks is its own. ONOSENDAI draws surveyed chunks and placed blocks in every mode, lit and fogged like shards, and walkers stand on them. A client that does not implement this DECK draws nothing.

## 8. Co-builders (normative)

A layer may list **co-builders** in its plaintext's `cobuilders` (§5.4): identities its author builds with (arkinox's ruling, 2026-11-25).

**The lift.** In a cell, let the **placers** be the authors of the candidates (§7.4), the authors whose counted layers changed that cell. An author `A`'s **list** in a chunk is the `cobuilders` of `A`'s newest counted layer there (by `created_at`, then the lower builder pubkey, then the lower event id), leaving out `A` itself. A list belongs to the layer, so it speaks for both of the layer's planes. A layer of `A`'s that lists nobody, or has no `cobuilders` field, gives `A` an empty list when it is the newest. A candidate whose author `B` is on the list of some placer `A` other than `B` has, for that cell, the better of its own rank and `A`'s own rank, taking the best over every such `A`. Every other candidate keeps its own rank. Then the cell is decided by §7.4 as usual. So, in a cell `A` changed, the layers of the people `A` lists count at `A`'s rank, and among `A` and them the newest wins.

**No transitivity.** A lift uses the placer's **own** rank, never a lifted one. If `A` lists `B` and `B` lists `C`, then `C` is lifted to `B`'s own rank in cells `B` changed, and never to `A`'s rank through `B`.

**Only where the lister built.** A co-builder is lifted only in cells its lister changed. A co-builder's change in a cell its lister never touched competes at its own rank.

**Consequences (non-normative):**
- Inside a home, the owner's co-builders rank first in the cells the owner changed, so friends can rework the owner's build for everyone, and their new cells elsewhere in the home still rank by their own rank.
- Removing someone from the list, in a new version of the author's newest layer, drops their changes back to their own rank at once, whatever older layers of other devices still say.
- A muted lister's list is gone with its layers (§7.1), and a muted co-builder is gone. Mutual listing makes no loop, because a lift uses only own ranks.
- A list costs about 67 bytes per co-builder in the plaintext.

## 9. Inventory (non-normative)

What a player carries, what mining yields and what placing costs are not part of this DECK. A client keeps an inventory on the device, per identity, on the honor system: mining a block adds it, placing removes it, and nothing checks it. The protocol lets any layer place any id (§2.3). Blocks are not valuable in themselves; a build is worth what it is worth to the people who see it.

If materials ever need to be provable, so that a block placed is a block someone mined or bought, that belongs to a future redemption DECK, with its own rules, its own events and probably a game (DECK-0002) or a mint behind it. Nothing here prepares for it or depends on it.

## 10. Relays (normative for relays that accept `kind 33339`)

- `kind 33339` is addressable, and a relay keeps the newest event per `(pubkey, kind, d)` as NIP-01 says.
- A relay MAY refuse a layer longer than 240,000 bytes, or one whose `content` or `alt` is longer than 280 bytes. Within those bounds a layer is at most 242,800 bytes under any escaping (§5.5), so a relay whose cap for this kind is 262,144 bytes, as the canonical relay's is, accepts every valid layer.
- A relay MAY refuse a layer whose builder key is not named, or is retired, by a `kind 3333` event of its `p` that the relay holds (§4.4). It MUST NOT refuse one only because it cannot see a naming yet.
- A relay treats a deletion request (NIP-09) for a layer as for any event. Removing blocks is done by publishing a newer version (§5.6).

## 11. Test vectors

`blocks-vectors.json`, beside this DECK, is produced by `blocks-vectors.mjs` (Node 18 or later, no dependencies) from `blocks-reference.mjs`. Like the other vectors in this repository it is not normative: where it disagrees with this text, the text is right and the file is a bug.

| Section | What it holds |
|---|---|
| `constants` | the domain strings, `W8` and samples of `W128`, the threshold, family, feature and rare tables, and the 600-second future slack of §7.1 |
| `chacha20_check` | the keystream head for the first chunk's seed (zero nonce, counter 0) |
| `chunks` | twelve chunks: `origin` (0, 0, 0) in dataspace, whose revision 2 ground is pinned; `origin-twin`, the same in ideaspace (one lookup id, two seeds, two grounds); `home`, the chunk of a spawn coordinate; `rich` and `high-k`, whose costliest cubes are K 14; `trees`, with Lumenwood and Canopy glass; `magma`, with a Magmaflow pocket, Basaltine and Glowcore; `pools`, with a Tidewater pool and all four veins; `pool-retry`, whose Tidewater comes after a try with no floor and a try that is undone; `forest`, where a tree is skipped because an earlier tree stands on its site; `trunk-over-canopy`, where crowns overlap and a later trunk replaces an earlier crown (no vector reaches Tidewater's 200-cell stop, which a search of several thousand random chunks never met); `top-edge`, the last chunk on every axis, whose lattice and chunk above wrap. For each: region integer, lookup id, survey seed, the heads of its fine stream, of its feature stream and of the stream above, for information only the family, band thickness and band offset (`d9[3]`) of the chunk's own unwarped 2^9 and 2^11 cells, its 64 cube K values (in the order `i + 4 (k + 4 j)`), its `maxK`, costliest cube, `sumK` and tree sites, the features it placed in order (informational labels: a count after a colon is the number drawn, of veins or trees, or the Tidewater cells placed), the feature branches it took (also informational), and how many feature bytes it read, the SHA-256 of its rock alone (before features) and of its ground, each as 32,768 bytes, one global id per byte (every id revision 2 generates is below 256), the count of every id, and 16 sample cells, plus one of every feature and rare id present, with every intermediate value of §3.7 and §3.9: the soft border warps `w9` and `w11`, the family the cell's strata digests name, and the cell's rock before features. The `origin` chunk also carries its whole ground as a runs array of global ids |
| `runs` | runs arrays a reader MUST accept, with their expansions, and five it MUST reject |
| `layer` | a worked layer in the origin chunk: a shaft dug down one column, a Rustband beam with one cell of Gibsonite, a cell set to extension id 300, a cell written explicitly at its base value (0 over empty ground, a change), and one co-builder; its plaintext, its 36 changed cells with their values and ground values, and its tags. Also the plaintext of a layer that only surveys |
| `builder_keys` | eight sets of an author's movement-event tags with the verdict of §4.4 for one key: named, never named, retired, retired and named again, retired by `all`, named after `all`, named in the same second as `all`, and a malformed naming |
| `home` | six chunks tested against a home (§7.2): the spawn chunk, a corner and a face of the cube, two chunks out, the twin plane, and a home that wraps below 0 |
| `stack` | eighteen cases of the Stack and co-builders, with one reader, its follows and its clock: strangers newest first, an exact tie, follows over strangers, the reader over follows, the home owner over the reader in the spawn chunk and a corner chunk, the home owner as a stranger outside the cube and in the twin plane, mutes of a stranger and of a home owner, the future slack at 600 and 601 seconds, one author with two builder keys, co-builders lifted to their lister's rank, co-builders not transitive, the home owner's co-builders at rank 1, a co-builder whose own rank is better, a co-builder undoing the builder with an explicit change at the base value, a list taken from the author's newest layer only, and the cap (set to 2 authors for the vector). Each cell gives its value, the winning layer and its rank, or null for the base |

Some single values, for a quick check:

- `origin`, (0, 0, 0) in plane 0, the pinned chunk: survey seed `d7b3e3627fdb33b93e75cece7f38da5b2bbee55fd8607fbc202307fd36ef8489`, lookup id `3c5d8c498f57d6d61527c53b824efe9edd768c2efd4d05acad6ea2775727c649`, 9,592 empty cells, rock SHA-256 `91e5149516a2b13a4d77fda0c9eefffdc376c356c16c9cd779309ad936359e7e`, **revision 2 ground SHA-256 `e5ff10f286cb54015644230673f999ace28fb000cb268aacce577323efe96f16`**, the value ONOSENDAI's TERRAIN tests pin. Its costliest cube is cube 1, of K 12, `sumK` 643; its features are four Ferrovein veins, a Prismite vein and a Voidpearl at (12, 6, 4), after 106 feature bytes. The chunk sits at a corner of a 2^11 cell, so its soft borders read digests across the wrap at 0: cell (31, 0, 0) is Gridstone (1), with `D` 1659 against `thr` 1196, `kS` 160, warps `w9` (13, 9, −16) and `w11` (−49, 42, 32), and the crystal family.
- `origin-twin`, (0, 0, 0) in plane 1: the same lookup id, survey seed `ec182af4594517efa3bd2ad5ae315db14f9e53da557a65c91a8c61d5667248ab`, ground SHA-256 `ff0f2b0c209425412b8ccd72d5da20000062b2cf2fdcbdf3ad3e2d48247c064d`.
- `magma`: a volcanic chunk of K 12 whose features are Magmaflow, two Ferrovein veins and Glowcore; ground SHA-256 `dc1f0d0a512f2215e233216dd887d86fa4a7980e9fefb8c701edad8157bd6a75`.

The Python listing of §3.11 reproduces every ground in the file, and ONOSENDAI's TERRAIN generator (`src/lib/terrain/generate.ts` at 2429f16c), run on the same twelve chunks, reproduces every one; its own tests pin the origin chunk.

## 12. Security and privacy considerations

- **Anyone can build anywhere.** Like a shard, a layer can be published by anyone, about any chunk, without being there. That is deliberate: blocks are not valuable, and the protocol does not regulate contested space. Each reader's Stack decides what it shows (§7).
- **Griefing.** A stranger's blocks rank below the reader's own, below everyone the reader follows, and below the home owner inside a home. A griefer who builds junk is seen first only by readers who follow nobody who built there, and a reader mutes them to remove them entirely (§7.1). A layer speaks only for the cells it changed, so mining someone's build in your own layer changes only how those cells look to readers who rank you first. Because a `diff` can mark cells explicitly at their base value (§5.4), a stranger can also blank a chunk, every cell set to empty or to its ground, removing other strangers' builds and even the surveyed ground for every reader who ranks them all as strangers. That is the same power as building junk, and the same remedies answer it: the reader's own blocks, follows and the home owner rank above it, and a mute removes it.
- **Dating ahead.** Within a rank the newest layer wins, and `created_at` is the author's to write. A layer dated more than 600 seconds ahead is not counted until then (§7.1), so the most a writer gains by dating ahead is ten minutes on top, after which a newer layer beats it. A writer that dates a layer ahead also locks itself out: relays keep the newest `created_at` per address, so its next honest version is refused until its clock passes the false date. Writers date layers by the clock.
- **Forged builder keys.** A layer counts only under a key that the author's own signed movement events name (§4.4). Nobody can build in someone else's name without their identity's signature on a naming tag.
- **Stolen builder keys.** A device's key can be lost with the device, and a thief who holds it writes as the author. Retiring the key voids every layer it signed, honest or forged, with no heights to argue about (§4.3); the author's other key publishes the honest blocks again. A thief can also replace the honest layer at the key's address with an empty version until the key is retired.
- **Oversized and malformed layers** are dropped by every reader (§5.5, §6), alone.
- **Too many layers.** A reader counts at most 64 authors in a chunk (§7.1).
- **Privacy.** A layer's `p` names its author in public, its `d` names its chunk's lookup id, and the `builder` tags on movement actions link builder keys to identities. Anyone who can guess a place, the author's home or somewhere near their movements, can compute its lookup id at height 5 in a fraction of a millisecond and see whether the author built there, then open the layer with the same key. The region key keeps a layer from relays and from readers who never look at that place, as it does for every bag; it does not hide a build from someone who goes looking near a known author. Builder tags also show how many devices an author builds from. An author who wants a build kept secret hides it as objects in a bag at a height that is expensive to derive.
- **Determinism.** Every value of the ground is an integer computed exactly as §3 says. A reader MUST NOT replace any step with floating point, a different noise, or a different order of interpolation: one floor in a different place changes the ground, and two readers then disagree about which cells a layer changed.

## 13. Out of scope (non-normative)

- **The live room.** Builders near one another see each other's changes within a fraction of a second, before they are published: an ephemeral event sealed to the h12 room key, as chat is (DECK-0005), signed by a session key that the builder key authorizes. It needs its own kind in the ephemeral range and its own rate and authorization rules, and it changes nothing a layer says. A later revision of this DECK, or a DECK of its own.
- **The survival game and provable materials.** What a block is worth, what mining yields, tools, recipes, an inventory that strangers can check, and scarcity across players are rules of play, for a game under DECK-0002 or a future redemption DECK (§9).
- **The voxel field for imports.** The importer (ONOSENDAI's `/import`, "Import a build") writes builds exported from other block-building tools as SNO meshes in sealed pieces, which needs no spec change. A voxel field, an optional DECK-0003 field that carries blocks as cells inside an object, is a later DECK-0003 revision, and with it a build could become blocks in this DECK's sense.
- **Wall seams and Bitcoin veins.** The protocol's walls as seams of special material, and veins that ripen with each Bitcoin block, are possible later layers of the ground. Each is a revision of §3.

## 14. Open questions (non-normative)

Resolved on 2026-11-25 by arkinox, and recorded for the history of the draft: the kind is `33339` (`33336` and `33337` are used by other apps, by a relay census of 2026-11-24); co-builders are in (§8); the design is right-sized, with no settles, claims, work, witness, reach or ownership, and retirement without heights. The Assay, drawing the rare band from a later Bitcoin block, moved to the materials ideation as moot unless blocks gain value.

Open, each made by Claude on delegation and the owner's to change:

1. **The `R` tag** (§4.3), the single-letter companion of `builder-retire` that lets readers find retirements with one filter.
2. **`all` ordered by `created_at`** (§4.3, §4.4): a key named after an `all` retirement is valid, so an author can retire every device and start again.
3. **The 600-second future slack** (§7.1).
4. **Surveys inside a home** count only for a home owner (§7.5), so that surveying around an owner's open build cannot fill it with rock.
5. **The order within a rank** (§7.3): newest first everywhere, with author, builder key and event id breaking exact ties. The ruling named newest-first for follows and everyone else; this draft uses it within ranks 1 and 2 too, which only matters when one author has several builder keys or two home owners share a chunk.
6. **The ground's tables** (§3.8, §3.9) are revision 2, as ONOSENDAI's TERRAIN mode draws it (#916), calibrated by its `scripts/terrain-calibrate.mjs`. Recommendation: tune after people walk it, as revision 3.
7. **The block set** (§2.3) is TERRAIN's 24 invented names. A later revision adds blocks with new invented names, never names borrowed from another game.
8. **Explicit changes at the base value** (§5.4): in a `diff`, a non-`null` entry is a change even when it equals the base, so a layer can remove another's block or refill another's hole, for the readers who rank it first. Added after review, because without it a co-builder could not undo the builder's work.
9. **A co-builder list from the newest layer only** (§8), so that removing someone takes effect at once.

## 15. Implementations (non-normative)

- `blocks-reference.mjs` (this directory): the ground, runs, layer planes, builder key validity, the home, the Stack and co-builders, in JavaScript with no dependencies beyond `node:crypto`.
- The Python listing of §3.11, which reproduces the ground vectors independently of the JavaScript.
- An implementation written by an independent reviewer from the prose of §3 alone, without the listing or the JavaScript, which reproduced every ground and every intermediate value in the vectors, revision 2 included, on its first run (2026-11-24).
- The TERRAIN previews (2026-11-24, not published): a viewer of revision 1 in floating point, the source of the first block set, the families and the soft borders.
- ONOSENDAI's TERRAIN mode, #916 at 2429f16c (`src/lib/terrain/generate.ts`): WALK with block tools, survey, mine and place, its op log folded into §5.4 plane layers with `ground: 2`. Its generator is revision 2 and the source of §3's text; its tests pin the origin chunk's ground. Its calibration, `scripts/terrain-calibrate.mjs`, measured the tables of §3.9. ONOSENDAI #927 publishes layers; it was built against an earlier draft and follows this one in its next revision.
- The benchmark of 2026-11-24 (not published): generation methods, storage encodings and event growth per chunk, which chose ChaCha20, the 8 and 4 lattices from terrain digests, palette runs without compression, and the smaller of a diff and a whole chunk.
