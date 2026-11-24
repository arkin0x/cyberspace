// DECK-0009 (Blocks) reference implementation, ground revision 2 (the generator of ONOSENDAI #916, src/lib/terrain/generate.ts at 2429f16c). Node 18 or later, no dependencies beyond node:crypto.
//
// Not normative: where this file disagrees with DECK-0009-blocks.md, the DECK is right and this file is a bug.
// Every value that decides a block is an integer, and every intermediate value is below 2^53, so JavaScript
// numbers are exact here. A port uses 64-bit integers (or Python ints) and floor division on non-negative values.

import { createHash } from 'node:crypto'

const enc = new TextEncoder()

// ---------------------------------------------------------------------------------------------------------------
// Constants (DECK-0009 §1, §3)

export const AXIS_BITS = 85n
export const AXIS_MASK = (1n << AXIS_BITS) - 1n
export const CHUNK_HEIGHT = 5
export const N = 32
export const CELLS = 32768
export const TERRAIN_DOMAIN_V2 = enc.encode('CYBERSPACE_TERRAIN_K_V2')
export const SURVEY_DOMAIN = enc.encode('CYBERSPACE_BLOCKS_SURVEY_V1')
export const SETTLE_DOMAIN = enc.encode('CYBERSPACE_BLOCKS_SETTLE_V1')
export const REACH = 16
export const LAYER_MAX_BYTES = 240000
export const SETTLES_MAX = 32
export const BUILDERS_MAX = 64
export const PALETTE_MAX = 256

// §3.6 Smoothstep weights in 512ths, for a lattice spacing of 8 at fractions 0..8.
export const W8 = [0, 22, 80, 162, 256, 350, 432, 490, 512]
// §3.6 Smoothstep weights in 2^21ths, for the 128 lattice at fractions 0..128.
export const W128 = (f) => 384 * f * f - 2 * f * f * f

// §3.8 Open space thresholds (unchanged since revision 1).
export const EMPTY_THR = [1337, 1323, 1308, 1294, 1280, 1266, 1253, 1239, 1225, 1211, 1196, 1182, 1168, 1153, 1138, 1123, 1108]

/** §3.10 The ground revision this file computes; layers name it as `ground: 2`. */
export const GROUND_REVISION = 2

// §2.3 Block ids.
export const ID = {
  GRIDSTONE: 1, UMBERSLATE: 2, DRIFTSILT: 3, MOSSVEIL: 4, RUSTBAND: 5, FROSTSHALE: 6, CINDERROCK: 7, PRISMITE: 8,
  BASALTINE: 9, RIMEGLASS: 10, TIDEWATER: 11, MAGMAFLOW: 12, LUMENWOOD: 13, CANOPY: 14,
  FERROVEIN: 40, COBALTINE: 41, GLOWCORE: 42, GIBSONITE: 43,
  RELIC: 192, VOIDPEARL: 193, AURORIC: 194, CHRONITE: 195, SINGULARITY: 196, GENESIS: 197,
}

// §3.9 Families, revision 2: strata as [id, weight], top (over open air), speckle (the fleck).
export const FAMILIES = [
  { name: 'temperate', strata: [[1, 25], [2, 18], [5, 9]], top: 4, speckle: 2 },
  { name: 'dune', strata: [[1, 47], [2, 34], [5, 17], [3, 3]], top: 3, speckle: 5 },
  { name: 'frozen', strata: [[1, 40], [2, 29], [5, 15], [6, 8], [10, 8]], top: 6, speckle: 2 },
  { name: 'volcanic', strata: [[1, 37], [2, 27], [5, 13], [7, 13], [9, 9]], top: 7, speckle: 5 },
  { name: 'crystal', strata: [[1, 43], [2, 31], [5, 16], [6, 10]], top: 6, speckle: 8 },
  { name: 'karst', strata: [[1, 25], [2, 18], [5, 9], [3, 11]], top: 4, speckle: 3 },
]

// §3.9 Feature thresholds: a 32-bit draw below t places the feature; minK is the least K of the costliest cube.
export const FEATURES = {
  magma: { t: 536870912, minK: 11 },
  trees: { t: 1460288880, minK: 0 },
  ferrovein: { t: 3865470566, minK: 0 },
  cobaltine: { t: 2233382993, minK: 6 },
  prismite: { t: 1395864371, minK: 9 },
  glowcore: { t: 429496729, minK: 10 },
}
/** §3.9 Tidewater's threshold from the sum of the 64 cube K. */
export const poolThreshold = (sumK) => Math.min(2576980377, Math.max(214748364, (768 - sumK) * 4194304))
/** §3.9 The rare band, in order: [id, least K of the costliest cube, threshold]. */
export const RARE = [[193, 11, 22375156], [194, 11, 11187578], [195, 12, 11179861], [43, 12, 7453240], [196, 13, 11799360], [192, 13, 7866240], [197, 14, 22053747]]
/** §3.9 How the rare thresholds were set (non-normative): the target per surveyed chunk, and the measured share of chunks whose costliest cube reaches each K. */
export const RARE_TARGET = { 193: 1 / 500, 194: 1 / 1000, 195: 1 / 2000, 43: 1 / 3000, 196: 1 / 5000, 192: 1 / 7500, 197: 1 / 10000 }
export const MAXK_AT_LEAST = [1, 1, 1, 1, 0.999995, 0.999705, 0.996205, 0.979775, 0.92474, 0.802875, 0.607995, 0.383905, 0.192085, 0.0728, 0.019475, 0.003215, 0.000215]
/** §3.3 Bytes of the feature stream after the fine stream. */
export const FEATURE_BYTES = 8192

// §2.3 The initial registry: global id -> [name, role, suggested base colour, suggested accent colour] (colours non-normative).
export const REGISTRY = {
  0: ['empty', 'no block', null, null],
  1: ['Gridstone', 'common bulk rock', '#555e60', '#80898c'],
  2: ['Umberslate', 'darker rock', '#1d3547', '#6f8ea0'],
  3: ['Driftsilt', 'soft fill', '#946100', '#cc8f00'],
  4: ['Mossveil', 'surface skin', '#00ba67', '#00f39e'],
  5: ['Rustband', 'banded rock', '#943300', '#f47000'],
  6: ['Frostshale', 'pale rock', '#c8f5ff', '#5d6769'],
  7: ['Cinderrock', 'volcanic rock', '#1a0f24', '#ff3300'],
  8: ['Prismite', 'crystalline vein, glows', '#a24bff', '#e1bcff'],
  9: ['Basaltine', 'dark rock round Magmaflow', '#22232b', '#5b6070'],
  10: ['Rimeglass', 'clear frozen rock', '#a9e8ff', '#e6fbff'],
  11: ['Tidewater', 'liquid, clear, walked through', '#1d5fd6', '#6fb4ff'],
  12: ['Magmaflow', 'liquid, glows, walked through', '#ff5a00', '#ffd040'],
  13: ['Lumenwood', 'tree trunk, glows', '#4a3020', '#7dffcf'],
  14: ['Canopy glass', 'tree crown, clear', '#1fa860', '#9dffc8'],
  40: ['Ferrovein', 'common metallic vein', '#555e60', '#e7a800'],
  41: ['Cobaltine', 'uncommon vein', '#1d3547', '#5a9bff'],
  42: ['Glowcore', 'rare vein, glows', '#15191a', '#00e5ff'],
  43: ['Gibsonite', 'very rare single block, glows', '#4b0058', '#ff00ff'],
  192: ['Relic shard', 'very rare single block, glows', '#5c0010', '#ff3b6b'],
  193: ['Voidpearl', 'rare single block, glows', '#0a0614', '#b48cff'],
  194: ['Auroric', 'rare single block, glows', '#103040', '#6dffd8'],
  195: ['Chronite', 'rare single block, glows', '#202836', '#ffe08a'],
  196: ['Singularity core', 'very rare single block, glows', '#000000', '#ffffff'],
  197: ['Genesis shard', 'rarest single block, glows', '#fff4d6', '#ffc23a'],
}

// ---------------------------------------------------------------------------------------------------------------
// Primitives (CYBERSPACE_V2.md §2.3, §4.6, §5.2, §5.5)

export function sha256(...parts) {
  const h = createHash('sha256')
  for (const p of parts) h.update(p)
  return new Uint8Array(h.digest())
}
export const hex = (b) => Buffer.from(b).toString('hex')
export const unhex = (s) => new Uint8Array(Buffer.from(s, 'hex'))

export function xyzToCoord(x, y, z, plane = 0) {
  let c = BigInt(plane & 1)
  for (let i = 0n; i < AXIS_BITS; i++) {
    c |= ((z >> i) & 1n) << (1n + i * 3n)
    c |= ((y >> i) & 1n) << (2n + i * 3n)
    c |= ((x >> i) & 1n) << (3n + i * 3n)
  }
  return c
}
export function coordToXyz(c) {
  const plane = Number(c & 1n)
  let x = 0n, y = 0n, z = 0n
  for (let i = 0n; i < AXIS_BITS; i++) {
    z |= ((c >> (1n + i * 3n)) & 1n) << i
    y |= ((c >> (2n + i * 3n)) & 1n) << i
    x |= ((c >> (3n + i * 3n)) & 1n) << i
  }
  return { x, y, z, plane }
}
export function be(n, len) {
  const b = new Uint8Array(len)
  let v = BigInt(n)
  for (let i = len - 1; i >= 0; i--) { b[i] = Number(v & 0xffn); v >>= 8n }
  return b
}
export function intToBytesBeMin(n) {
  if (n === 0n) return new Uint8Array([0])
  const len = Math.ceil(n.toString(2).length / 8)
  return be(n, len)
}
export const cantorPair = (a, b) => { const s = a + b; return (s * (s + 1n)) / 2n + b }
export function subtreeCantor(base, h) {
  let v = []
  for (let i = 0n; i < (1n << BigInt(h)); i++) v.push(base + i)
  for (let l = 0; l < h; l++) { const n = []; for (let i = 0; i < v.length; i += 2) n.push(cantorPair(v[i], v[i + 1])); v = n }
  return v[0]
}
const popcount4 = (n) => (n & 1) + ((n >> 1) & 1) + ((n >> 2) & 1) + ((n >> 3) & 1)

// The terrain digest of the aligned 2^bits cell containing (x, y, z) on plane (CYBERSPACE_V2.md §5.2 step 1).
const tdCache = new Map()
export function terrainDigest(bits, x, y, z, plane) {
  const s = BigInt(bits)
  const bx = (x >> s) << s, by = (y >> s) << s, bz = (z >> s) << s
  const key = `${bits}:${bx}:${by}:${bz}:${plane}`
  let d = tdCache.get(key)
  if (!d) {
    d = sha256(TERRAIN_DOMAIN_V2, new Uint8Array([bits]), be(xyzToCoord(bx, by, bz, plane), 32))
    if (tdCache.size > 100000) tdCache.clear()
    tdCache.set(key, d)
  }
  return d
}
export function terrainK(x, y, z, plane) {
  let k = 0
  for (const b of [3, 7, 9, 11]) k += popcount4(terrainDigest(b, x, y, z, plane)[0] & 15)
  return k
}

// ---------------------------------------------------------------------------------------------------------------
// ChaCha20 (RFC 8439 §2.3, §2.4): the keystream for a 32-byte key, a 12-byte zero nonce and an initial counter of 0.

function rotl(v, c) { return ((v << c) | (v >>> (32 - c))) >>> 0 }
export function chacha20Keystream(key, length) {
  const k = new Uint32Array(8)
  for (let i = 0; i < 8; i++) k[i] = key[4 * i] | (key[4 * i + 1] << 8) | (key[4 * i + 2] << 16) | (key[4 * i + 3] << 24)
  const out = new Uint8Array(length)
  const st = new Uint32Array(16), x = new Uint32Array(16)
  const qr = (a, b, c, d) => {
    x[a] = (x[a] + x[b]) >>> 0; x[d] = rotl(x[d] ^ x[a], 16)
    x[c] = (x[c] + x[d]) >>> 0; x[b] = rotl(x[b] ^ x[c], 12)
    x[a] = (x[a] + x[b]) >>> 0; x[d] = rotl(x[d] ^ x[a], 8)
    x[c] = (x[c] + x[d]) >>> 0; x[b] = rotl(x[b] ^ x[c], 7)
  }
  for (let block = 0; block * 64 < length; block++) {
    st[0] = 0x61707865; st[1] = 0x3320646e; st[2] = 0x79622d32; st[3] = 0x6b206574
    for (let i = 0; i < 8; i++) st[4 + i] = k[i]
    st[12] = block; st[13] = 0; st[14] = 0; st[15] = 0
    x.set(st)
    for (let r = 0; r < 10; r++) {
      qr(0, 4, 8, 12); qr(1, 5, 9, 13); qr(2, 6, 10, 14); qr(3, 7, 11, 15)
      qr(0, 5, 10, 15); qr(1, 6, 11, 12); qr(2, 7, 8, 13); qr(3, 4, 9, 14)
    }
    for (let i = 0; i < 16; i++) {
      const v = (x[i] + st[i]) >>> 0
      for (let b = 0; b < 4; b++) { const o = block * 64 + 4 * i + b; if (o < length) out[o] = (v >>> (8 * b)) & 0xff }
    }
  }
  return out
}

// ---------------------------------------------------------------------------------------------------------------
// Chunks (§1.2)

/** Cell index: x fastest, then z, then y. */
export const cellIndex = (x, y, z) => x + 32 * z + 1024 * y
export const wrap = (v) => v & AXIS_MASK

/** The h5 chunk containing a coordinate, and its region integer, key and lookup id (CYBERSPACE_V2.md §4.7, §7.2). */
export function chunkOf(x, y, z, plane) {
  return { X: (x >> 5n) << 5n, Y: (y >> 5n) << 5n, Z: (z >> 5n) << 5n, P: plane }
}
export function chunkRegion(X, Y, Z) {
  const n = cantorPair(cantorPair(subtreeCantor(X, 5), subtreeCantor(Y, 5)), subtreeCantor(Z, 5))
  const key = sha256(intToBytesBeMin(n))
  return { regionN: n, key, lookupId: sha256(key) }
}

// ---------------------------------------------------------------------------------------------------------------
// The generated ground (§3)

/** §3.2 The survey seed. Never sha256(root) alone, which is the region key. */
export function surveySeed(X, Y, Z, P) {
  const { regionN } = chunkRegion(X, Y, Z)
  return sha256(SURVEY_DOMAIN, new Uint8Array([P & 1]), intToBytesBeMin(regionN))
}
/** §3.3 The fine stream: 32,768 bytes, one per cell. */
export function fineStream(X, Y, Z, P) { return chacha20Keystream(surveySeed(X, Y, Z, P), CELLS) }

/** §3.4 and §3.5 The lattices. */
export function lattices(X, Y, Z, P) {
  const A = { K16: new Array(125), cave: new Array(125), tun: new Array(125), vein: new Array(125), veinT: new Array(125), d3: new Array(125), K: new Array(125) }
  for (let j = 0; j < 5; j++) for (let k = 0; k < 5; k++) for (let i = 0; i < 5; i++) {
    const cx = wrap(X + BigInt(8 * i)), cy = wrap(Y + BigInt(8 * j)), cz = wrap(Z + BigInt(8 * k))
    const d3 = terrainDigest(3, cx, cy, cz, P)
    const K = terrainK(cx, cy, cz, P)
    const a = i + 5 * (k + 5 * j)
    A.d3[a] = d3; A.K[a] = K; A.K16[a] = 16 * K
    A.cave[a] = d3[1]; A.tun[a] = d3[2]; A.vein[a] = d3[3]; A.veinT[a] = d3[4]
  }
  const B = { veinD: new Array(729), caveD: new Array(729) }
  for (let j = 0; j < 9; j++) for (let k = 0; k < 9; k++) for (let i = 0; i < 9; i++) {
    const d3 = A.d3[(i >> 1) + 5 * ((k >> 1) + 5 * (j >> 1))]
    const sub = (i & 1) | ((j & 1) << 1) | ((k & 1) << 2)
    const b = i + 9 * (k + 9 * j)
    B.veinD[b] = d3[5 + sub]; B.caveD[b] = d3[13 + sub]
  }
  const Ox = (X >> 7n) << 7n, Oy = (Y >> 7n) << 7n, Oz = (Z >> 7n) << 7n
  const G = { big: new Array(8), warp: new Array(8), gx: new Array(8), gy: new Array(8), gz: new Array(8), ox: Number(X - Ox), oy: Number(Y - Oy), oz: Number(Z - Oz) }
  for (let c = 0; c < 8; c++) {
    const d7 = terrainDigest(7, wrap(Ox + BigInt(128 * (c & 1))), wrap(Oy + BigInt(128 * ((c >> 1) & 1))), wrap(Oz + BigInt(128 * ((c >> 2) & 1))), P)
    G.big[c] = d7[1]; G.warp[c] = d7[2]; G.gx[c] = d7[3]; G.gy[c] = d7[4]; G.gz[c] = d7[5]
  }
  return { A, B, G, d9: terrainDigest(9, X, Y, Z, P), d11: terrainDigest(11, X, Y, Z, P) }
}

/** §3.6 lerp: floor((a * (2^sh - w) + b * w) / 2^sh), every value non-negative. */
export const lerp = (a, b, w, sh) => Math.floor((a * (2 ** sh - w) + b * w) / 2 ** sh)

function latt(u, s) {
  const n = 32 / s
  let j = Math.floor(u / s); if (j > n - 1) j = n - 1
  const f = u - s * j
  return [j, s === 8 ? W8[f] : W8[2 * f]]
}
/** §3.6 Trilinear value at local (x, y, z), each 0..32, on a lattice of side m and spacing s. Order: x, then z, then y. */
export function tri(arr, s, x, y, z) {
  const m = 32 / s + 1
  const [i, wx] = latt(x, s), [j, wy] = latt(y, s), [k, wz] = latt(z, s)
  const c = (di, dj, dk) => arr[(i + di) + m * ((k + dk) + m * (j + dj))]
  const a0 = lerp(c(0, 0, 0), c(1, 0, 0), wx, 9), a1 = lerp(c(0, 0, 1), c(1, 0, 1), wx, 9)
  const a2 = lerp(c(0, 1, 0), c(1, 1, 0), wx, 9), a3 = lerp(c(0, 1, 1), c(1, 1, 1), wx, 9)
  const b0 = lerp(a0, a1, wz, 9), b1 = lerp(a2, a3, wz, 9)
  return lerp(b0, b1, wy, 9)
}
/** §3.6 The 128 lattice: corners c = dx | dy << 1 | dz << 2, fractions ox + x etc. in 0..128. */
export function tri128(v, G, x, y, z) {
  const wx = W128(G.ox + x), wy = W128(G.oy + y), wz = W128(G.oz + z)
  const a0 = lerp(v[0], v[1], wx, 21), a1 = lerp(v[4], v[5], wx, 21)
  const a2 = lerp(v[2], v[3], wx, 21), a3 = lerp(v[6], v[7], wx, 21)
  const b0 = lerp(a0, a1, wz, 21), b1 = lerp(a2, a3, wz, 21)
  return lerp(b0, b1, wy, 21)
}

/** §3.7 The fields of one cell, y in 0..32. */
export function cellFields(L, x, y, z, fine) {
  const cave8 = tri(L.A.cave, 8, x, y, z), cave4 = tri(L.B.caveD, 4, x, y, z), tun8 = tri(L.A.tun, 8, x, y, z)
  const big = tri128(L.G.big, L.G, x, y, z)
  const kS = tri(L.A.K16, 8, x, y, z)
  const D = 5 * cave8 + 2 * cave4 + 2 * big + fine
  const k0 = Math.min(15, kS >> 4), t = kS - 16 * k0
  const thr = Math.floor((EMPTY_THR[k0] * (16 - t) + EMPTY_THR[k0 + 1] * t) / 16)
  const tunnel = Math.abs(tun8 - 128) < 9 && Math.abs(cave4 - 128) < 16
  return { cave8, cave4, tun8, big, kS, D, thr, tunnel, solid: D >= thr && !tunnel }
}

/** §3.9 Soft strata borders: the warped cells whose 2^9 and 2^11 digests decide a cell's band and family. */
export function strataWarp(L, x, y, z, fineByte) {
  const gx = tri128(L.G.gx, L.G, x, y, z) - 128, gy = tri128(L.G.gy, L.G, x, y, z) - 128, gz = tri128(L.G.gz, L.G, x, y, z) - 128
  const c = tri(L.B.caveD, 4, x, y, z) - 128, f = fineByte - 128
  return {
    w9: [(gx * 44 + c * 8 + f * 5) >> 8, (gy * 44 - c * 8 + f * 5) >> 8, (gz * 44 + c * 8 - f * 5) >> 8],
    w11: [(gz * 120 + c * 16 + f * 5) >> 8, (gx * 120 + c * 8 + f * 5) >> 8, (gy * 120 - c * 16 - f * 5) >> 8],
  }
}
export function strataAt(L, X, Y, Z, P, x, y, z, fineByte) {
  const { w9, w11 } = strataWarp(L, x, y, z, fineByte)
  const at = (w) => [wrap(X + BigInt(x + w[0])), wrap(Y + BigInt(y + w[1])), wrap(Z + BigInt(z + w[2]))]
  const [a, b, c] = at(w9), [d, e, f] = at(w11)
  return { d9: terrainDigest(9, a, b, c, P), d11: terrainDigest(11, d, e, f, P), w9, w11 }
}

/** §3.9 A band's kind: the hash's high half over the family's total weight. */
export function pickStratum(strata, h) {
  let total = 0
  for (const [, w] of strata) total += w
  let r = (h >>> 16) % total
  for (const [id, w] of strata) { if (r < w) return id; r -= w }
  return strata[0][0]
}

/** §3.3 The feature stream: draws read in a fixed order; a byte past the end reads 0. */
class Draws {
  constructor(b) { this.b = b; this.i = 0; this.log = [] }
  u8() { return this.i < this.b.length ? this.b[this.i++] : 0 }
  u32() { return ((this.u8() << 24) | (this.u8() << 16) | (this.u8() << 8) | this.u8()) >>> 0 }
  chance(t) { return this.u32() < t }
}

const RARE_IDS = new Set([192, 193, 194, 195, 43, 196, 197])

/** §3 The generated ground of one chunk, revision 2: a Uint8Array of 32,768 global ids (every generated id is below 256). */
export function generateChunk(X, Y, Z, P, detail = false) {
  const L = lattices(X, Y, Z, P)
  const stream = chacha20Keystream(surveySeed(X, Y, Z, P), CELLS + FEATURE_BYTES)
  const fine = stream.subarray(0, CELLS)
  const draws = new Draws(stream.subarray(CELLS))
  const fineAbove = fineStream(X, wrap(Y + 32n), Z, P)
  const solid = new Uint8Array(32 * 33 * 32)
  const sIdx = (x, y, z) => x + 32 * z + 1024 * y
  for (let y = 0; y <= 32; y++) for (let z = 0; z < 32; z++) for (let x = 0; x < 32; x++) {
    const f = y < 32 ? fine[cellIndex(x, y, z)] : fineAbove[cellIndex(x, 0, z)]
    solid[sIdx(x, y, z)] = cellFields(L, x, y, z, f).solid ? 1 : 0
  }
  const yBase = Number(Y & 0xffffffn)
  const out = new Uint8Array(CELLS)
  // §3.9 Rock.
  for (let y = 0; y < 32; y++) for (let z = 0; z < 32; z++) for (let x = 0; x < 32; x++) {
    const o = cellIndex(x, y, z)
    if (!solid[sIdx(x, y, z)]) continue
    const st = strataAt(L, X, Y, Z, P, x, y, z, fine[o])
    const fam = FAMILIES[st.d11[1] % FAMILIES.length]
    const T = 3 + (st.d9[2] % 8)
    const warp = tri128(L.G.warp, L.G, x, y, z)
    const cave4 = tri(L.B.caveD, 4, x, y, z)
    const veinT = tri(L.A.veinT, 8, x, y, z)
    const warpOff = Math.floor((warp * 18) / 256) + Math.floor((veinT * 8) / 256) + Math.floor((cave4 * 4) / 256)
    const band = Math.floor((yBase + y + warpOff) / T)
    const h = Math.imul(band ^ (st.d9[3] << 8), 0x9e3779b1) >>> 0
    let id = pickStratum(fam.strata, h)
    if (fine[o] < 6) id = fam.speckle
    if (!solid[sIdx(x, y + 1, z)]) id = fam.top
    out[o] = id
  }
  const rock = out.slice() // the rock alone, before features (for the vectors)
  const fam0 = FAMILIES[L.d11[1] % FAMILIES.length]
  // §3.9 Features: the costliest cube.
  let maxK = -1, maxCube = 0, sumK = 0
  for (let cy = 0; cy < 4; cy++) for (let cz = 0; cz < 4; cz++) for (let cx = 0; cx < 4; cx++) {
    const k = L.A.K[cx + 5 * (cz + 5 * cy)]
    sumK += k
    if (k > maxK) { maxK = k; maxCube = cx + 4 * (cz + 4 * cy) }
  }
  const kOf = (x, y, z) => L.A.K[(x >> 3) + 5 * ((z >> 3) + 5 * (y >> 3))]
  const isRock = (o) => { const id = out[o]; return id !== 0 && id !== ID.TIDEWATER && id !== ID.MAGMAFLOW && id !== ID.LUMENWOOD && id !== ID.CANOPY && !RARE_IDS.has(id) }
  const rockInCostliest = () => {
    const cx = 8 * (maxCube & 3), cz = 8 * ((maxCube >> 2) & 3), cy = 8 * (maxCube >> 4)
    const start = ((draws.u8() << 8) | draws.u8()) & 511
    for (let i = 0; i < 512; i++) {
      const c = (start + i) & 511
      const o = cellIndex(cx + (c & 7), cy + (c >> 6), cz + ((c >> 3) & 7))
      if (isRock(o)) return o
    }
    return -1
  }
  const fired = []
  const branches = []
  const F = FEATURES
  // 1. Magmaflow.
  if (fam0.name === 'volcanic' && maxK >= F.magma.minK && draws.chance(F.magma.t)) {
    const at = rockInCostliest()
    if (at >= 0) {
      fired.push('magma')
      const cx = at & 31, cz = (at >> 5) & 31, cy = at >> 10
      const rx = 1 + (draws.u8() % 3), ry = 1 + (draws.u8() % 2), rz = 1 + (draws.u8() % 3)
      const inside = (dx, dy, dz, ax, ay, az) => dx * dx * ay * ay * az * az + dy * dy * ax * ax * az * az + dz * dz * ax * ax * ay * ay <= ax * ax * ay * ay * az * az
      for (let dy = -ry - 2; dy <= ry + 2; dy++) for (let dz = -rz - 2; dz <= rz + 2; dz++) for (let dx = -rx - 2; dx <= rx + 2; dx++) {
        const x = cx + dx, y = cy + dy, z = cz + dz
        if (x < 0 || y < 0 || z < 0 || x > 31 || y > 31 || z > 31) continue
        const o = cellIndex(x, y, z)
        if (!isRock(o)) continue
        if (inside(dx, dy, dz, rx, ry, rz)) out[o] = kOf(x, y, z) >= F.magma.minK ? ID.MAGMAFLOW : ID.BASALTINE
        else if (inside(dx, dy, dz, rx + 2, ry + 2, rz + 2)) out[o] = ID.BASALTINE
      }
    }
  }
  // 2. Tidewater.
  if (draws.chance(poolThreshold(sumK))) {
    for (let t = 0; t < 8; t++) {
      const px = draws.u8() & 31, pz = draws.u8() & 31, r = 2 + (draws.u8() % 5)
      let floor = -1
      for (let y = 31; y > 0; y--) if (out[cellIndex(px, y, pz)] === 0 && out[cellIndex(px, y - 1, pz)] !== 0) { floor = y; break }
      if (floor < 0) { branches.push('tidewater:no-floor'); continue }
      const placed = []
      for (let y = floor; y >= Math.max(1, floor - 2) && placed.length < 200; y--) {
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dz * dz > r * r || placed.length >= 200) continue
          const x = px + dx, z = pz + dz
          if (x < 0 || z < 0 || x > 31 || z > 31) continue
          const o = cellIndex(x, y, z)
          if (out[o] === 0 && out[cellIndex(x, y - 1, z)] !== 0 && out[cellIndex(x, y - 1, z)] !== ID.LUMENWOOD) { out[o] = ID.TIDEWATER; placed.push(o) }
        }
      }
      if (placed.length >= 200) branches.push('tidewater:cap')
      if (placed.length >= 20) { fired.push('tidewater:' + placed.length); break }
      branches.push('tidewater:undone')
      for (const o of placed) out[o] = 0
    }
  }
  // 3. Lumenwood trees.
  const sites = []
  if (fam0.name === 'temperate' || fam0.name === 'karst') {
    for (let tz = 2; tz < 30; tz++) for (let tx = 2; tx < 30; tx++) {
      for (let y = 23; y >= 0; y--) {
        if (out[cellIndex(tx, y, tz)] !== ID.MOSSVEIL) continue
        let air = true
        for (let a = 1; a <= 8 && air; a++) if (out[cellIndex(tx, y + a, tz)] !== 0) air = false
        if (air) { sites.push(cellIndex(tx, y, tz)); break }
      }
    }
  }
  if (sites.length > 0 && draws.chance(F.trees.t)) {
    const n = 1 + (draws.u8() % 4)
    fired.push('trees:' + n)
    for (let t = 0; t < n; t++) {
      const site = sites[draws.u32() % sites.length], h = 4 + (draws.u8() % 3)
      const tx = site & 31, tz = (site >> 5) & 31, ground = site >> 10
      if (out[cellIndex(tx, ground + 1, tz)] !== 0) { branches.push('tree:skipped'); continue }
      for (let y = ground + 1; y <= ground + h; y++) { if (out[cellIndex(tx, y, tz)] === ID.CANOPY) branches.push('tree:trunk-over-canopy'); out[cellIndex(tx, y, tz)] = ID.LUMENWOOD }
      for (let dy = h - 1; dy <= h + 2; dy++) {
        const rr = dy <= h ? 2 : dy === h + 1 ? 1 : 0
        for (let dz = -rr; dz <= rr; dz++) for (let dx = -rr; dx <= rr; dx++) {
          if (rr === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue
          const o = cellIndex(tx + dx, ground + dy, tz + dz)
          if (out[o] === 0) out[o] = ID.CANOPY
          // Informational only: a crown cell already held by an earlier tree (its own trunk sits at dx = dz = 0).
          else if (out[o] === ID.CANOPY || (out[o] === ID.LUMENWOOD && (dx !== 0 || dz !== 0))) branches.push('tree:overlap')
        }
      }
    }
  }
  // 4. Veins.
  const vein = (id, size, minK, inCube) => {
    for (let t = 0; t < 8; t++) {
      let x, y, z
      if (inCube === null) { x = draws.u8() & 31; y = draws.u8() & 31; z = draws.u8() & 31 }
      else { x = 8 * (inCube & 3) + (draws.u8() & 7); z = 8 * ((inCube >> 2) & 3) + (draws.u8() & 7); y = 8 * (inCube >> 4) + (draws.u8() & 7) }
      if (!isRock(cellIndex(x, y, z)) || kOf(x, y, z) < minK) continue
      for (let i = 0; i < size; i++) {
        const o = cellIndex(x, y, z)
        if (isRock(o) && kOf(x, y, z) >= minK) out[o] = id
        const d = draws.u8() % 6
        const a = d >> 1, sgn = d & 1 ? 1 : -1
        if (a === 0) x = Math.min(31, Math.max(0, x + sgn))
        else if (a === 1) y = Math.min(31, Math.max(0, y + sgn))
        else z = Math.min(31, Math.max(0, z + sgn))
      }
      return
    }
  }
  if (draws.chance(F.ferrovein.t)) { const n = 2 + (draws.u8() % 4); fired.push('ferrovein:' + n); for (let i = 0; i < n; i++) vein(ID.FERROVEIN, 4 + (draws.u8() % 9), 0, null) }
  if (maxK >= F.cobaltine.minK && draws.chance(F.cobaltine.t)) { const n = 1 + (draws.u8() % 2); fired.push('cobaltine:' + n); for (let i = 0; i < n; i++) vein(ID.COBALTINE, 3 + (draws.u8() % 6), F.cobaltine.minK, null) }
  if (maxK >= F.prismite.minK && draws.chance(F.prismite.t)) { fired.push('prismite'); vein(ID.PRISMITE, 4 + (draws.u8() % 7), F.prismite.minK, null) }
  if (maxK >= F.glowcore.minK && draws.chance(F.glowcore.t)) { fired.push('glowcore'); vein(ID.GLOWCORE, 2 + (draws.u8() % 7), F.glowcore.minK, maxCube) }
  // 5. The rare band.
  for (const [id, minK, t] of RARE) {
    if (maxK < minK || !draws.chance(t)) continue
    const o = rockInCostliest()
    if (o >= 0) { out[o] = id; fired.push('rare:' + id) }
  }
  if (!detail) return out
  return { blocks: out, rock, L, fine, family: fam0.name, T: 3 + (L.d9[2] % 8), bandOff: L.d9[3], solid, maxK, maxCube, sumK, sites: sites.length, fired, branches: [...new Set(branches)], drawBytes: draws.i }
}

// ---------------------------------------------------------------------------------------------------------------
// Layers (§5)

/** §5.4 Expand runs: a non-negative entry is a palette index, -N repeats the entry before it N more times. */
export function expandRuns(runs, length, limit) {
  if (!Array.isArray(runs)) throw new Error('runs: not an array')
  const out = new Int32Array(length)
  let n = 0, last = -1
  for (const e of runs) {
    if (!Number.isInteger(e) || Object.is(e, -0) || e < -CELLS) throw new Error('runs: not an integer in range')
    if (e >= 0) {
      if (e >= limit) throw new Error('runs: index out of range')
      if (n >= length) throw new Error('runs: too long')
      out[n++] = e; last = e
    } else {
      if (last < 0) throw new Error('runs: a repeat with nothing before it')
      if (n - e > length) throw new Error('runs: too long')
      for (let i = 0; i < -e; i++) out[n++] = last
    }
  }
  if (n !== length) throw new Error('runs: wrong length')
  return out
}
/** Encode values as runs (the shortest form: one index, then -N for N more). */
export function encodeRuns(values) {
  const out = []
  let i = 0
  while (i < values.length) {
    let j = i + 1
    while (j < values.length && values[j] === values[i]) j++
    out.push(values[i]); if (j - i > 1) out.push(-(j - i - 1))
    i = j
  }
  return out
}

/** §5.5 Decode one plane of a layer to { values, placements (cell indices), t0, t1 } against the generated ground. */
export function decodePlane(pl, ground, settleCount) {
  if (!pl || typeof pl !== 'object') throw new Error('plane: not an object')
  if (pl.plane !== 0 && pl.plane !== 1) throw new Error('plane: bad plane')
  if (typeof pl.survey !== 'boolean') throw new Error('plane: bad survey')
  if (pl.form !== 'diff' && pl.form !== 'whole') throw new Error('plane: bad form')
  const pal = pl.pal
  if (!Array.isArray(pal) || pal.length < 1 || pal.length > PALETTE_MAX) throw new Error('plane: bad palette')
  pal.forEach((g, i) => {
    if (pl.form === 'diff' && i === 0) { if (g !== null) throw new Error('plane: a diff palette starts with null'); return }
    if (!Number.isInteger(g) || g < 0 || g > 65535) throw new Error('plane: bad global id')
  })
  // §3.10 A revision this reader does not implement (anything but 2): a diff plane is set aside; a whole plane is read
  // for its values only, with no placements, and takes no part in the Cell Rule.
  if (pl.ground !== GROUND_REVISION) {
    if (pl.form === 'diff') throw new Error('plane: a diff against a ground revision this reader does not implement')
    const idx = expandRuns(pl.cells, CELLS, pal.length)
    return { plane: pl.plane, survey: pl.survey, values: Int32Array.from(idx, (i) => pal[i]), placements: null, t0: null, t1: null, valuesOnly: true }
  }
  const base = pl.survey ? ground : new Uint8Array(CELLS)
  const idx = expandRuns(pl.cells, CELLS, pal.length)
  const values = new Int32Array(CELLS)
  const placements = []
  for (let o = 0; o < CELLS; o++) {
    const g = pal[idx[o]]
    values[o] = g === null ? base[o] : g
    if (values[o] !== base[o]) placements.push(o)
  }
  const t0 = expandRuns(pl.t0, placements.length, settleCount)
  const t1 = expandRuns(pl.t1, placements.length, settleCount)
  return { plane: pl.plane, survey: pl.survey, values, placements, t0, t1 }
}

/** Encode one plane, choosing whichever form is shorter as compact JSON (§5.5, the writer's rule). */
export function encodePlane(plane, survey, values, ground, t0ByCell, t1ByCell) {
  const base = survey ? ground : new Uint8Array(CELLS)
  const placements = []
  for (let o = 0; o < CELLS; o++) if (values[o] !== base[o]) placements.push(o)
  const t0 = encodeRuns(placements.map((o) => t0ByCell.get(o)))
  const t1 = encodeRuns(placements.map((o) => t1ByCell.get(o)))
  const mk = (form) => {
    const pal = form === 'diff' ? [null] : []
    const pos = new Map()
    const idx = new Array(CELLS)
    for (let o = 0; o < CELLS; o++) {
      const keep = form === 'diff' && values[o] === base[o]
      const key = keep ? 'keep' : values[o]
      if (!pos.has(key)) { pos.set(key, keep ? 0 : pal.length); if (!keep) pal.push(values[o]) }
      idx[o] = pos.get(key)
    }
    return { plane, survey, ground: GROUND_REVISION, form, pal, cells: encodeRuns(idx), t0, t1 }
  }
  const d = mk('diff'), w = mk('whole')
  return JSON.stringify(d).length <= JSON.stringify(w).length ? d : w
}

/** §5.3 A settle's claims: two runs arrays of 0 and 1 (planes 0 and 1), as two bitmaps of 4,096 bytes, hashed. */
export function claimsBitmaps(claims) {
  if (!Array.isArray(claims) || claims.length !== 2) throw new Error('claims: not two runs arrays')
  return claims.map((runs) => {
    const bits = expandRuns(runs, CELLS, 2)
    const b = new Uint8Array(CELLS / 8)
    for (let i = 0; i < CELLS; i++) if (bits[i]) b[i >> 3] |= 1 << (i & 7)
    return b
  })
}
export function claimsDigest(claims) { const [b0, b1] = claimsBitmaps(claims); return sha256(b0, b1) }
/** Claims runs for a set of cell indices per plane: { 0: Set, 1: Set }. */
export function claimsOf(sets) {
  return [0, 1].map((p) => encodeRuns(Array.from({ length: CELLS }, (_, i) => (sets[p] && sets[p].has(i) ? 1 : 0))))
}
/** §5.3 A settle's id and its work (leading zero bits). */
export function settleId(authorHex, lookupIdHex, height, blockHashHex, nonceHex, claims) {
  return sha256(SETTLE_DOMAIN, unhex(authorHex), unhex(lookupIdHex), be(height, 4), unhex(blockHashHex), unhex(nonceHex), claimsDigest(claims))
}
export function leadingZeroBits(b) {
  let n = 0
  for (const v of b) { if (v === 0) { n += 8; continue } return n + Math.clz32(v) - 24 }
  return n
}

/** §6.2 Chebyshev distance in gibsons from a coordinate to the box of a chunk; Infinity across planes. */
export function reachDistance(coordHex, X, Y, Z, P) {
  const c = coordToXyz(BigInt('0x' + coordHex))
  if (c.plane !== P) return Infinity
  const d = (v, b) => (v < b ? b - v : v > b + 31n ? v - (b + 31n) : 0n)
  const m = [d(c.x, X), d(c.y, Y), d(c.z, Z)].reduce((a, b) => (a > b ? a : b))
  return m > BigInt(Number.MAX_SAFE_INTEGER) ? Infinity : Number(m)
}

// ---------------------------------------------------------------------------------------------------------------
// The Cell Rule (§7)

/**
 * A placement's order key (§7.2). witness is the witness height W of its settle, or null when unwitnessed.
 * Returns an array compared lexicographically: smaller is earlier.
 */
export function orderKey(p) {
  const witnessed = p.witness !== null && p.witness !== undefined
  const T = witnessed ? Math.max(p.height, p.witness) : p.height
  return [witnessed ? 0 : 1, T]
}
function tieBreak(a, b) {
  if (a.work !== b.work) return b.work - a.work // more work first
  if (a.author !== b.author) return a.author < b.author ? -1 : 1
  if (a.builder !== b.builder) return a.builder < b.builder ? -1 : 1
  return 0
}
/** -1 when a is earlier than b. */
export function earlier(a, b) {
  const ka = orderKey(a), kb = orderKey(b)
  if (ka[0] !== kb[0]) return ka[0] - kb[0]
  if (ka[1] !== kb[1]) return ka[1] - kb[1]
  return tieBreak(a, b)
}
/** -1 when a is the later change (wins among the owner and listed builders). */
export function later(a, b) {
  const ka = orderKey(a), kb = orderKey(b)
  if (ka[0] !== kb[0]) return kb[0] - ka[0]
  if (ka[1] !== kb[1]) return kb[1] - ka[1]
  return tieBreak(a, b)
}

/**
 * §7.3 One cell. placements: [{ author, builder, value, first: {height, witness, work}, last: {...} }].
 * builders: Map author -> Set of authors that author lists in this chunk. homeOwner: author or null.
 * Returns { value, owner, from } or null when no placement counts (the cell shows its base).
 */
export function resolveCell(placements, builders, homeOwner = null) {
  if (placements.length === 0) return null
  const firstOf = (p) => ({ ...p.first, author: p.author, builder: p.builder })
  const lastOf = (p) => ({ ...p.last, author: p.author, builder: p.builder })
  let owner
  if (homeOwner) owner = homeOwner
  else owner = placements.slice().sort((a, b) => earlier(firstOf(a), firstOf(b)))[0].author
  const listed = builders.get(owner) || new Set()
  const allowed = placements.filter((p) => p.author === owner || listed.has(p.author))
  if (allowed.length === 0) return null
  const win = allowed.slice().sort((a, b) => later(lastOf(a), lastOf(b)))[0]
  return { value: win.value, owner, from: win.author }
}
