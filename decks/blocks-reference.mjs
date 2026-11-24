// DECK-0009 (Blocks) reference implementation. Node 18 or later, no dependencies beyond node:crypto.
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

// §3.8 Thresholds, revision 1 (CYBERSPACE_BLOCKS_SURVEY_V1). Tunable only with a domain bump.
export const EMPTY_THR = [1337, 1323, 1308, 1294, 1280, 1266, 1253, 1239, 1225, 1211, 1196, 1182, 1168, 1153, 1138, 1123, 1108]
export const ORE_THR = [3884, 3854, 3827, 3802, 3779, 3757, 3736, 3717, 3698, 3681, 3664, 3648, 3633, 3618, 3603, 3590, 3576]
export const RELIC_THR = 4508

// §3.9 Families: strata (bottom of the list is not "deeper"; bands are chosen by a hash), top, speckle.
export const FAMILIES = [
  { name: 'temperate', strata: [1, 1, 17, 14, 1, 16, 2, 22], top: 20, speckle: 4 },
  { name: 'desert', strata: [6, 7, 6, 8, 5, 16, 1], top: 5, speckle: 8 },
  { name: 'frozen', strata: [11, 12, 1, 11, 17, 14], top: 13, speckle: 12 },
  { name: 'volcanic', strata: [9, 10, 22, 9, 21, 9, 23], top: 22, speckle: 23 },
  { name: 'crystal', strata: [18, 15, 19, 18, 14], top: 18, speckle: 19 },
  { name: 'karst', strata: [16, 15, 16, 8, 1], top: 20, speckle: 8 },
]
// §3.9 Ores: [global id, weight, lowest cube K], in this order.
export const ORES = [[40, 60, 0], [41, 50, 0], [42, 40, 3], [43, 20, 5], [44, 12, 8], [46, 6, 9], [45, 8, 10], [47, 3, 12], [48, 2, 13], [49, 1, 15]]
export const RELIC = 192
export const RELIC_MIN_K = 13

// §1.3 The initial registry: global id -> [name, suggested colour (non-normative)].
export const REGISTRY = {
  0: ['empty', null],
  1: ['stone', '#8a8a8a'], 2: ['deepstone', '#555a60'], 3: ['dirt', '#7a5636'], 4: ['gravel', '#9c948a'],
  5: ['sand', '#e0cf92'], 6: ['sandstone', '#d2b56f'], 7: ['red sandstone', '#c0663a'], 8: ['clay', '#a3a8b8'],
  9: ['basalt', '#4a4a50'], 10: ['blackstone', '#2c2830'], 11: ['ice', '#9fd0f0'], 12: ['packed snow', '#dfe8ee'],
  13: ['snow', '#ffffff'], 14: ['granite', '#a87565'], 15: ['marble', '#efeae0'], 16: ['limestone', '#cfc6a8'],
  17: ['slate', '#5b6470'], 18: ['quartzite', '#e6dce8'], 19: ['amethyst rock', '#8e6cc0'], 20: ['moss', '#5f8f3a'],
  21: ['obsidian', '#1a1028'], 22: ['tuff', '#6f6c5c'], 23: ['magma rock', '#d4521c'],
  40: ['coal ore', '#202020'], 41: ['copper ore', '#d07a3a'], 42: ['iron ore', '#d8b090'], 43: ['tin ore', '#b8c4c8'],
  44: ['silver ore', '#e8f0f8'], 45: ['gold ore', '#ffd200'], 46: ['lapis ore', '#2650d0'], 47: ['emerald ore', '#10d060'],
  48: ['diamond ore', '#40f0f0'], 49: ['gibsonite', '#ff2bd6'],
  192: ['relic crystal', '#ff0050'],
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
  const A = { K16: new Array(125), cave: new Array(125), tun: new Array(125), ore: new Array(125), oreT: new Array(125), d3: new Array(125), K: new Array(125) }
  for (let j = 0; j < 5; j++) for (let k = 0; k < 5; k++) for (let i = 0; i < 5; i++) {
    const cx = wrap(X + BigInt(8 * i)), cy = wrap(Y + BigInt(8 * j)), cz = wrap(Z + BigInt(8 * k))
    const d3 = terrainDigest(3, cx, cy, cz, P)
    const K = terrainK(cx, cy, cz, P)
    const a = i + 5 * (k + 5 * j)
    A.d3[a] = d3; A.K[a] = K; A.K16[a] = 16 * K
    A.cave[a] = d3[1]; A.tun[a] = d3[2]; A.ore[a] = d3[3]; A.oreT[a] = d3[4]
  }
  const B = { oreD: new Array(729), caveD: new Array(729) }
  for (let j = 0; j < 9; j++) for (let k = 0; k < 9; k++) for (let i = 0; i < 9; i++) {
    const d3 = A.d3[(i >> 1) + 5 * ((k >> 1) + 5 * (j >> 1))]
    const sub = (i & 1) | ((j & 1) << 1) | ((k & 1) << 2)
    const b = i + 9 * (k + 9 * j)
    B.oreD[b] = d3[5 + sub]; B.caveD[b] = d3[13 + sub]
  }
  const Ox = (X >> 7n) << 7n, Oy = (Y >> 7n) << 7n, Oz = (Z >> 7n) << 7n
  const G = { big: new Array(8), warp: new Array(8), ox: Number(X - Ox), oy: Number(Y - Oy), oz: Number(Z - Oz) }
  for (let c = 0; c < 8; c++) {
    const d7 = terrainDigest(7, wrap(Ox + BigInt(128 * (c & 1))), wrap(Oy + BigInt(128 * ((c >> 1) & 1))), wrap(Oz + BigInt(128 * ((c >> 2) & 1))), P)
    G.big[c] = d7[1]; G.warp[c] = d7[2]
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

/** §3 The generated ground of one chunk: a Uint8Array of 32,768 global ids (every generated id is below 256). */
export function generateChunk(X, Y, Z, P, detail = false) {
  const L = lattices(X, Y, Z, P)
  const fine = fineStream(X, Y, Z, P)
  const fineAbove = fineStream(X, wrap(Y + 32n), Z, P)
  const solid = new Uint8Array(32 * 33 * 32)
  const sIdx = (x, y, z) => x + 32 * z + 1024 * y
  for (let y = 0; y <= 32; y++) for (let z = 0; z < 32; z++) for (let x = 0; x < 32; x++) {
    const f = y < 32 ? fine[cellIndex(x, y, z)] : fineAbove[cellIndex(x, 0, z)]
    solid[sIdx(x, y, z)] = cellFields(L, x, y, z, f).solid ? 1 : 0
  }
  const fam = FAMILIES[L.d11[1] % FAMILIES.length]
  const T = 3 + (L.d9[2] % 8)
  const bandOff = L.d9[3]
  const yBase = Number(Y & 0xffffffn)
  const out = new Uint8Array(CELLS)
  for (let y = 0; y < 32; y++) for (let z = 0; z < 32; z++) for (let x = 0; x < 32; x++) {
    const o = cellIndex(x, y, z)
    if (!solid[sIdx(x, y, z)]) continue
    const kc = L.A.K[(x >> 3) + 5 * ((z >> 3) + 5 * (y >> 3))]
    const ore = 11 * tri(L.A.ore, 8, x, y, z) + 9 * tri(L.B.oreD, 4, x, y, z)
    const oreT = tri(L.A.oreT, 8, x, y, z)
    let id
    if (kc >= RELIC_MIN_K && ore >= RELIC_THR) id = RELIC
    else if (ore >= ORE_THR[kc]) {
      let total = 0
      for (const [, w, mk] of ORES) if (kc >= mk) total += w
      let r = Math.floor((oreT * total) / 256)
      for (const [oid, w, mk] of ORES) { if (kc < mk) continue; if (r < w) { id = oid; break } r -= w }
    } else {
      const warp = tri128(L.G.warp, L.G, x, y, z)
      const cave4 = tri(L.B.caveD, 4, x, y, z)
      const warpOff = Math.floor((warp * 18) / 256) + Math.floor((oreT * 8) / 256) + Math.floor((cave4 * 4) / 256)
      const band = Math.floor((yBase + y + warpOff) / T)
      const h = Math.imul(band ^ (bandOff << 8), 0x9e3779b1) >>> 0
      id = fam.strata[(h >>> 16) % fam.strata.length]
      if (fine[o] < 6) id = fam.speckle
      if (!solid[sIdx(x, y + 1, z)]) id = fam.top
    }
    out[o] = id
  }
  if (!detail) return out
  return { blocks: out, L, fine, family: fam.name, T, bandOff, solid }
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
  if (pl.ground !== undefined && !Number.isInteger(pl.ground)) throw new Error('plane: bad ground revision')
  // §3.10 A revision this reader does not implement (only 1 here) reads as not surveyed.
  const base = pl.survey && (pl.ground === undefined || pl.ground === 1) ? ground : new Uint8Array(CELLS)
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
    return { plane, survey, form, pal, cells: encodeRuns(idx), t0, t1 }
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
