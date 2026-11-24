// Generates blocks-vectors.json for DECK-0009 (Blocks) from blocks-reference.mjs.
// Node 18 or later, no dependencies. Run: node blocks-vectors.mjs > blocks-vectors.json
//
// Like the other vectors in this repository, the output is not normative: where it disagrees with
// DECK-0009-blocks.md, the DECK is right and the file is a bug.

import * as R from './blocks-reference.mjs'

const S = (v) => v.toString()
const SAMPLE_CELLS = [
  [0, 0, 0], [31, 0, 0], [0, 31, 0], [0, 0, 31], [31, 31, 31], [7, 8, 9], [8, 8, 8], [16, 16, 16],
  [3, 30, 17], [29, 2, 11], [12, 31, 5], [20, 13, 27], [1, 17, 30], [25, 25, 4], [10, 5, 22], [31, 16, 0],
]

function chunkVector(name, note, X, Y, Z, P, extraCells = []) {
  const g = R.generateChunk(X, Y, Z, P, true)
  const reg = R.chunkRegion(X, Y, Z)
  const cubeK = []
  for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) cubeK.push(g.L.A.K[i + 5 * (k + 5 * j)])
  const counts = {}
  for (const id of g.blocks) counts[id] = (counts[id] || 0) + 1
  const above = R.fineStream(X, R.wrap(Y + 32n), Z, P)
  const samples = [...SAMPLE_CELLS, ...extraCells].map(([x, y, z]) => {
    const o = R.cellIndex(x, y, z)
    const f = R.cellFields(g.L, x, y, z, g.fine[o])
    return {
      x, y, z, index: o, id: g.blocks[o], name: R.REGISTRY[g.blocks[o]][0],
      cube_K: g.L.A.K[(x >> 3) + 5 * ((z >> 3) + 5 * (y >> 3))],
      fine: g.fine[o], cave8: f.cave8, cave4: f.cave4, tun8: f.tun8, big: f.big, kS: f.kS, D: f.D, thr: f.thr,
      tunnel: f.tunnel, solid: f.solid,
      ore: 11 * R.tri(g.L.A.ore, 8, x, y, z) + 9 * R.tri(g.L.B.oreD, 4, x, y, z),
      oreT: R.tri(g.L.A.oreT, 8, x, y, z), warp: R.tri128(g.L.G.warp, g.L.G, x, y, z),
      solid_above: !!g.solid[x + 32 * z + 1024 * (y + 1)],
    }
  })
  return {
    name, note, X: S(X), Y: S(Y), Z: S(Z), plane: P,
    region_n: S(reg.regionN), lookup_id: R.hex(reg.lookupId),
    survey_seed: R.hex(R.surveySeed(X, Y, Z, P)),
    stream_head: R.hex(g.fine.slice(0, 32)),
    stream_above_head: R.hex(above.slice(0, 32)),
    family: g.family, strata_thickness: g.T, band_offset: g.bandOff,
    d9_head: R.hex(g.L.d9.slice(0, 4)), d11_head: R.hex(g.L.d11.slice(0, 2)),
    cube_K: cubeK,
    ground_sha256: R.hex(R.sha256(g.blocks)),
    counts,
    samples,
  }
}

const AUTHOR_A = 'a'.repeat(64).replace(/^a/, '0') // a test author pubkey (not a real key)
const AUTHOR_B = 'b'.repeat(64).replace(/^b/, '1')
const BUILDER_A1 = 'c'.repeat(64).replace(/^c/, '2')

// Chunks
const top = R.AXIS_MASK - 31n
const homeCoord = R.hex(R.sha256(new TextEncoder().encode('DECK-0009 home vector')))
const hc = R.coordToXyz(BigInt('0x' + homeCoord))
const home = R.chunkOf(hc.x, hc.y, hc.z, hc.plane)
const chunks = [
  chunkVector('origin', 'The chunk at (0, 0, 0) in dataspace.', 0n, 0n, 0n, 0),
  chunkVector('origin-twin', 'The same chunk in ideaspace: the same region integer and lookup id, a different seed (the plane byte) and different terrain digests.', 0n, 0n, 0n, 1),
  chunkVector('home', `The chunk containing the coordinate ${homeCoord}, the spawn of a pubkey with that hex.`, home.X, home.Y, home.Z, home.P),
  chunkVector('rich', 'A chunk with cubes of K 14, holding emerald and diamond ore.', 21142550437263633644624128n, 18008474041514091364130176n, 31278913397089107452766848n, 0),
  chunkVector('relic', 'A chunk with a cube of K 15, holding emerald ore and relic crystal.', 14591091882848999946563104n, 20133477431573457222824352n, 32881118804322767692111104n, 0),
  chunkVector('top-edge', 'The last chunk on every axis: lattice corners and the chunk above wrap to 0 (modulo 2^85).', top, top, top, 0),
]
for (const c of chunks) {
  // Show a cell of every rare id the chunk holds, so that a port can check ore selection directly.
  const g = R.generateChunk(BigInt(c.X), BigInt(c.Y), BigInt(c.Z), c.plane)
  const extra = []
  for (const want of [45, 46, 47, 48, 49, 192]) {
    const o = g.indexOf(want)
    if (o >= 0) extra.push([o & 31, o >> 10, (o >> 5) & 31])
  }
  if (extra.length) {
    const v = chunkVector(c.name, c.note, BigInt(c.X), BigInt(c.Y), BigInt(c.Z), c.plane, extra)
    c.samples = v.samples
  }
}
const ground0 = R.generateChunk(0n, 0n, 0n, 0)
chunks[0].ground_runs = R.encodeRuns(Array.from(ground0))

// Settles
const LOOKUP0 = chunks[0].lookup_id
const BLOCK_A = '00000000000000000001a7d1f3a2d3c4b5a69788796a5b4c3d2e1f0a1b2c3d4e' // a stand-in hash (not a real block)
const BLOCK_B = '0000000000000000000233f1c0de5eed5eed5eed5eed5eed5eed5eed5eed5eed'
function mine(author, lookup, height, hash, bits, claims) {
  for (let n = 0n; ; n++) {
    const nonce = n.toString(16).padStart(16, '0')
    const id = R.settleId(author, lookup, height, hash, nonce, claims)
    if (R.leadingZeroBits(id) >= bits) return { author, lookup_id: lookup, height, block_hash: hash, nonce, claims, claims_digest: R.hex(R.claimsDigest(claims)), id: R.hex(id), work: R.leadingZeroBits(id) }
  }
}
const NO_CLAIMS = R.claimsOf({})

// Runs
const runs = {
  accepted: [
    { runs: [7, -11], length: 12, limit: 8, expanded: Array(12).fill(7) },
    { runs: [0, -2, 1, 0, -1], length: 6, limit: 2, expanded: [0, 0, 0, 1, 0, 0] },
  ],
  rejected: [
    { runs: [-3, 1], length: 4, limit: 2, reason: 'a repeat with nothing before it' },
    { runs: [1, -2], length: 4, limit: 2, reason: 'expands to 3, not 4' },
    { runs: [1, -4], length: 4, limit: 2, reason: 'expands to 5, not 4' },
    { runs: [2, -3], length: 4, limit: 2, reason: 'index 2 is outside a palette of 2' },
    { runs: [1.5, -3], length: 4, limit: 2, reason: 'not an integer' },
  ],
}
for (const r of runs.accepted) {
  const got = Array.from(R.expandRuns(r.runs, r.length, r.limit))
  if (JSON.stringify(got) !== JSON.stringify(r.expanded)) throw new Error('runs vector')
}
for (const r of runs.rejected) {
  let threw = false
  try { R.expandRuns(r.runs, r.length, r.limit) } catch { threw = true }
  if (!threw) throw new Error('runs vector should be rejected: ' + JSON.stringify(r))
}

// A layer: author A in the origin chunk. Settle 0: dig out a column and place marble; settle 1: place gibsonite and an extension id.
const values = Int32Array.from(ground0)
const t0 = new Map(), t1 = new Map()
const edit = (x, y, z, v, s) => {
  const o = R.cellIndex(x, y, z)
  values[o] = v
  if (!t0.has(o)) t0.set(o, s)
  t1.set(o, s)
}
for (let y = 0; y < 32; y++) edit(5, y, 5, 0, 0) // a shaft: every cell of column (5, *, 5) empty
for (let x = 10; x < 16; x++) edit(x, 20, 10, 15, 0) // a marble beam
edit(12, 20, 10, 49, 1) // one beam cell becomes gibsonite in settle 1 (first placed at settle 0)
edit(0, 0, 0, 300, 1) // an extension id, which a reader draws as an unknown block
const plane0 = R.encodePlane(0, true, values, ground0, t0, t1)
const decoded = R.decodePlane(plane0, ground0, 2)
// Each settle claims exactly the cells first placed at it (t0), in this version.
const claimSets = [0, 1].map((si) => R.claimsOf({ 0: new Set(decoded.placements.filter((o, i) => decoded.t0[i] === si)) }))
const settles = [
  mine(AUTHOR_A, LOOKUP0, 925010, BLOCK_A, 0, claimSets[0]),
  mine(AUTHOR_A, LOOKUP0, 925040, BLOCK_B, 12, claimSets[1]),
  mine(AUTHOR_B, LOOKUP0, 925010, BLOCK_A, 0, NO_CLAIMS),
]
// Check the claims rule of §6.1: every placement's t0 settle claims its cell.
{
  const bm = settles.slice(0, 2).map((st) => R.claimsBitmaps(st.claims)[0])
  decoded.placements.forEach((o, i) => { if (!(bm[decoded.t0[i]][o >> 3] & (1 << (o & 7)))) throw new Error('claims vector') })
}
const layerPayload = {
  settles: [settles[0], settles[1]].map((s) => [s.height, s.block_hash, s.nonce, s.claims]),
  builders: [AUTHOR_B],
  planes: [plane0],
}
const layer = {
  note: 'Author A in the origin chunk, surveyed. A shaft down column (5, *, 5), a marble beam at y 20, one beam cell turned to gibsonite in a later settle, and the cell (0, 0, 0) set to the extension id 300. Cells equal to the ground are not placements, so the shaft counts only where the ground was solid.',
  author: AUTHOR_A, builder: BUILDER_A1,
  plaintext: JSON.stringify(layerPayload),
  plaintext_bytes: Buffer.byteLength(JSON.stringify(layerPayload)),
  form: plane0.form,
  placements: decoded.placements.length,
  placement_cells: decoded.placements.map((o, i) => ({ x: o & 31, y: o >> 10, z: (o >> 5) & 31, value: decoded.values[o], ground: ground0[o], t0: decoded.t0[i], t1: decoded.t1[i] })),
  tags: [
    ['d', LOOKUP0],
    ['p', AUTHOR_A],
    ['e', '<id of a kind 3333 event of author A whose C lies within reach of the chunk, in plane 0>', '', 'reach'],
    ['settle', settles[0].id],
    ['settle', settles[1].id],
    ['encrypted', 'aes-256-gcm', '<base64 of nonce || AES-256-GCM(region key, plaintext) || tag>'],
    ['version', '1'],
  ],
}
const surveyOnlySettle = mine(AUTHOR_A, LOOKUP0, 925010, BLOCK_A, 0, NO_CLAIMS)
const untouched = { settles: [[surveyOnlySettle.height, surveyOnlySettle.block_hash, surveyOnlySettle.nonce, NO_CLAIMS]], builders: [], planes: [R.encodePlane(0, true, Int32Array.from(ground0), ground0, new Map(), new Map())] }
layer.survey_only_plaintext = JSON.stringify(untouched)
layer.survey_only_bytes = layer.survey_only_plaintext.length
layer.survey_only_settle_id = surveyOnlySettle.id

// Reach
const reach = [
  ['inside', [0n, 0n, 0n], [0n, 0n, 0n, 0]],
  ['16 past the far corner on every axis', [0n, 0n, 0n], [47n, 47n, 47n, 0]],
  ['17 past the far face on X', [0n, 0n, 0n], [48n, 0n, 0n, 0]],
  ['16 below the near face on Y', [0n, 32n, 0n], [0n, 16n, 0n, 0]],
  ['17 below the near face on Y', [0n, 32n, 0n], [0n, 15n, 0n, 0]],
  ['the other plane', [0n, 0n, 0n], [0n, 0n, 0n, 1]],
].map(([name, [X, Y, Z], [x, y, z, p]]) => {
  const coord = R.hex(R.be(R.xyzToCoord(x, y, z, p), 32))
  const d = R.reachDistance(coord, X, Y, Z, 0)
  return { name, chunk: [S(X), S(Y), S(Z), 0], coord, distance: d === Infinity ? null : d, within_reach: d <= R.REACH }
})

// The Cell Rule
const P = (author, builder, value, fh, fw, fk, lh, lw, lk) => ({ author, builder, value, first: { height: fh, witness: fw, work: fk }, last: { height: lh, witness: lw, work: lk } })
const A = AUTHOR_A, B = AUTHOR_B, C = 'd'.repeat(64)
const cases = [
  { name: 'first placer owns', placements: [P(A, 'a1', 15, 925010, 925010, 0, 925010, 925010, 0), P(C, 'c1', 1, 925011, 925011, 0, 925011, 925011, 0)], builders: {}, home: null },
  { name: 'late publisher loses: committed early, witnessed late', placements: [P(A, 'a1', 15, 925010, 925012, 0, 925010, 925012, 0), P(C, 'c1', 1, 925000, 925050, 0, 925000, 925050, 0)], builders: {}, home: null },
  { name: 'listed builder changes the owner\'s cell later', placements: [P(A, 'a1', 15, 925010, 925010, 0, 925010, 925010, 0), P(B, 'b1', 1, 925011, 925011, 0, 925020, 925020, 0)], builders: { [A]: [B] }, home: null },
  { name: 'unlisted later change is not drawn', placements: [P(A, 'a1', 15, 925010, 925010, 0, 925010, 925010, 0), P(B, 'b1', 1, 925011, 925011, 0, 925020, 925020, 0)], builders: {}, home: null },
  { name: 'same block: more work wins', placements: [P(A, 'a1', 15, 925010, 925010, 3, 925010, 925010, 3), P(C, 'c1', 1, 925010, 925010, 9, 925010, 925010, 9)], builders: {}, home: null },
  { name: 'same block, same work: lower author pubkey wins', placements: [P(C, 'c1', 1, 925010, 925010, 0, 925010, 925010, 0), P(A, 'a1', 15, 925010, 925010, 0, 925010, 925010, 0)], builders: {}, home: null },
  { name: 'unwitnessed placement comes after every witnessed one', placements: [P(C, 'c1', 1, 925000, null, 0, 925000, null, 0), P(A, 'a1', 15, 925010, 925010, 0, 925010, 925010, 0)], builders: {}, home: null },
  { name: 'home chunk: the home owner counts even when later', placements: [P(C, 'c1', 1, 925000, 925000, 0, 925000, 925000, 0), P(A, 'a1', 15, 925030, 925030, 0, 925030, 925030, 0)], builders: {}, home: A },
  { name: 'home chunk: nobody but the owner and listed builders', placements: [P(C, 'c1', 1, 925000, 925000, 0, 925000, 925000, 0)], builders: {}, home: A },
].map((c) => {
  const bm = new Map(Object.entries(c.builders).map(([k, v]) => [k, new Set(v)]))
  const r = R.resolveCell(c.placements, bm, c.home)
  return { ...c, expected: r ? { value: r.value, owner: r.owner, from: r.from } : null }
})

const out = {
  description: 'Test vectors for DECK-0009 (Blocks). Generated by blocks-vectors.mjs from blocks-reference.mjs. Not normative: where this file disagrees with the DECK, the DECK is right.',
  constants: {
    survey_domain: 'CYBERSPACE_BLOCKS_SURVEY_V1', settle_domain: 'CYBERSPACE_BLOCKS_SETTLE_V1', terrain_domain: 'CYBERSPACE_TERRAIN_K_V2',
    W8: R.W8, W128_samples: Object.fromEntries([0, 1, 32, 64, 96, 127, 128].map((f) => [f, R.W128(f)])),
    EMPTY_THR: R.EMPTY_THR, ORE_THR: R.ORE_THR, RELIC_THR: R.RELIC_THR, RELIC_MIN_K: R.RELIC_MIN_K,
    FAMILIES: R.FAMILIES, ORES: R.ORES, REACH: R.REACH,
  },
  chacha20_check: { key: chunks[0].survey_seed, nonce: '000000000000000000000000', counter: 0, keystream_head: chunks[0].stream_head },
  chunks, settles, runs, layer, reach, cell_rule: cases,
}
process.stdout.write(JSON.stringify(out, null, 1) + '\n')
