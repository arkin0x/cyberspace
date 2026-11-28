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

function chunkVector(name, note, X, Y, Z, P, extraCells = [], revision = 2) {
  const g = R.generateChunk(X, Y, Z, P, true, revision)
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
      veinT: R.tri(g.L.A.veinT, 8, x, y, z), rock: g.rock[o],
      warp: R.tri128(g.L.G.warp, g.L.G, x, y, z),
      w9: R.strataWarp(g.L, x, y, z, g.fine[o]).w9, w11: R.strataWarp(g.L, x, y, z, g.fine[o]).w11,
      family_here: R.FAMILIES[R.strataAt(g.L, X, Y, Z, P, x, y, z, g.fine[o]).d11[1] % 6].name,
      solid_above: !!g.solid[x + 32 * z + 1024 * (y + 1)],
    }
  })
  return {
    name, note, ...(revision === 2 ? {} : { revision }), X: S(X), Y: S(Y), Z: S(Z), plane: P,
    region_n: S(reg.regionN), lookup_id: R.hex(reg.lookupId),
    survey_seed: R.hex(R.surveySeed(X, Y, Z, P)),
    stream_head: R.hex(g.fine.slice(0, 32)),
    stream_above_head: R.hex(above.slice(0, 32)),
    family: g.family, strata_thickness: g.T, band_offset: g.bandOff,
    d9_head: R.hex(g.L.d9.slice(0, 4)), d11_head: R.hex(g.L.d11.slice(0, 2)),
    cube_K: cubeK,
    max_K: g.maxK, costliest_cube: g.maxCube, sum_K: g.sumK, tree_sites: g.sites,
    features: g.fired, feature_branches: g.branches, feature_bytes_read: g.drawBytes,
    feature_stream_head: R.hex(R.chacha20Keystream(R.surveySeed(X, Y, Z, P), R.CELLS + 32).slice(R.CELLS)),
    rock_sha256: R.hex(R.sha256(g.rock)),
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
  chunkVector('rich', 'A chunk whose costliest cube is K 14: eligible for the whole rare band but Genesis shard is gated at 14 too.', 15453524316923662618071296n, 10464798389691687205038208n, 36976378080119877154989536n, 0),
  chunkVector('high-k', 'Another chunk whose costliest cube is K 14.', 36430266008631153131322464n, 34667457459222566158038592n, 26358497905024653652117376n, 0),
  chunkVector('trees', 'A temperate or karst chunk with Lumenwood trees.', 1565108530968902207826144n, 9208092355485173920476160n, 16928974102260582047626816n, 0),
  chunkVector('magma', 'A volcanic chunk of K 11 and up with a Magmaflow pocket and Basaltine, and a Glowcore vein.', 22325383872792900814531744n, 22131386245388876978033024n, 35011241709963610162731104n, 0),
  chunkVector('pools', 'A chunk with a Tidewater pool and every vein: Ferrovein, Cobaltine, Prismite and Glowcore.', 30332262474415856249900160n, 34207092734754452336590560n, 4153259675813629090509088n, 0),
  chunkVector('pool-retry', 'Tidewater after a try with no floor and a try of fewer than 20 cells that is undone.', 13566687585405747633797088n, 35538527997925668899492832n, 28246629170138773046499232n, 0),
  chunkVector('forest', 'Four trees drawn, one skipped because an earlier tree stands on its site; and Tidewater after a no-floor try and an undone try.', 6651442216856358714468256n, 2615290123112726810297856n, 30301635334439985999876960n, 0),
  chunkVector('trunk-over-canopy', 'Four trees: crowns that overlap, and a later trunk that replaces an earlier tree\'s Canopy glass.', 13034938241636885258281088n, 36862814456594778079748096n, 7136560745072575983621824n, 0),
  chunkVector('top-edge', 'The last chunk on every axis: lattice corners and the chunk above wrap to 0 (modulo 2^85).', top, top, top, 0),
]
for (const c of chunks) {
  // Show a cell of every rare id the chunk holds, so that a port can check vein selection directly.
  const g = R.generateChunk(BigInt(c.X), BigInt(c.Y), BigInt(c.Z), c.plane)
  const extra = []
  for (const want of [9, 10, 11, 12, 13, 14, 40, 41, 42, 43, 192, 193, 194, 195, 196, 197]) {
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

const LOOKUP0 = chunks[0].lookup_id

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

// A layer: author A in the origin chunk: a shaft dug down one column, a Rustband beam, one beam cell turned to Gibsonite, and an extension id.
const values = Int32Array.from(ground0)
const edit = (x, y, z, v) => { values[R.cellIndex(x, y, z)] = v }
for (let y = 0; y < 32; y++) edit(5, y, 5, 0) // a shaft: every cell of column (5, *, 5) empty
for (let x = 10; x < 16; x++) edit(x, 20, 10, 5) // a Rustband beam
edit(12, 20, 10, 43) // one beam cell is Gibsonite
edit(0, 0, 0, 300) // an extension id, which a reader draws as an unknown block
const explicit = new Set([R.cellIndex(0, 31, 0)]) // empty in the ground, written explicitly as 0: a change at the base value
const plane0 = R.encodePlane(0, true, values, ground0, explicit)
const decoded = R.decodePlane(plane0, ground0)
const layerPayload = { cobuilders: [AUTHOR_B], planes: [plane0] }
const layer = {
  note: 'Author A in the origin chunk, surveyed, with B listed as a co-builder. A shaft down column (5, *, 5), a Rustband beam at y 20 with one cell of Gibsonite, the cell (0, 0, 0) set to the extension id 300, and the cell (0, 31, 0), empty in the ground, written explicitly as 0: a change at the base value, which removes, for readers who rank A first, any block another layer placed there. The shaft\'s cells are written only where the ground was solid; elsewhere they are null, no change.',
  author: AUTHOR_A, builder: BUILDER_A1,
  plaintext: JSON.stringify(layerPayload),
  plaintext_bytes: Buffer.byteLength(JSON.stringify(layerPayload)),
  form: plane0.form,
  changed: decoded.changed.length,
  changed_cells: decoded.changed.map((o) => ({ x: o & 31, y: o >> 10, z: (o >> 5) & 31, value: decoded.values[o], ground: ground0[o] })),
  tags: [
    ['d', LOOKUP0],
    ['p', AUTHOR_A],
    ['encrypted', 'aes-256-gcm', '<base64 of nonce || AES-256-GCM(region key, plaintext) || tag>'],
    ['version', '1'],
  ],
}
const untouched = { planes: [R.encodePlane(0, true, Int32Array.from(ground0), ground0)] }
layer.survey_only_plaintext = JSON.stringify(untouched)
layer.survey_only_bytes = layer.survey_only_plaintext.length

// Builder keys (§4.4)
const K1 = '1'.repeat(64), K2 = '2'.repeat(64)
const keyCases = [
  { name: 'named once', key: K1, events: [{ created_at: 100, tags: [['builder', K1]] }] },
  { name: 'never named', key: K2, events: [{ created_at: 100, tags: [['builder', K1]] }] },
  { name: 'retired: every layer of the key is void, whenever written', key: K1, events: [{ created_at: 100, tags: [['builder', K1]] }, { created_at: 200, tags: [['builder-retire', K1], ['R', K1]] }] },
  { name: 'retired, then named again: still void (a retirement is permanent)', key: K1, events: [{ created_at: 100, tags: [['builder', K1]] }, { created_at: 200, tags: [['builder-retire', K1], ['R', K1]] }, { created_at: 300, tags: [['builder', K1]] }] },
  { name: 'all retires every key named before it', key: K1, events: [{ created_at: 100, tags: [['builder', K1]] }, { created_at: 200, tags: [['builder-retire', 'all'], ['R', 'all']] }] },
  { name: 'a key named after all is valid', key: K2, events: [{ created_at: 100, tags: [['builder', K1]] }, { created_at: 200, tags: [['builder-retire', 'all'], ['R', 'all']] }, { created_at: 300, tags: [['builder', K2]] }] },
  { name: 'named in the same second as all: void (the naming must be later)', key: K2, events: [{ created_at: 200, tags: [['builder-retire', 'all'], ['R', 'all'], ['builder', K2]] }] },
  { name: 'a malformed builder tag names nothing', key: K1, events: [{ created_at: 100, tags: [['builder', K1.replace(/1/g, 'A')]] }] },
].map((c) => ({ ...c, valid: R.builderKeyValid(c.key, c.events) }))

// Home (§7.2)
const H = homeCoord // an identity whose pubkey hex is the home vector's coordinate
const hb = R.spawnChunk(H)
const at = (dx, dy, dz, P = hb.P) => ({ X: R.wrap(hb.X + BigInt(32 * dx)), Y: R.wrap(hb.Y + BigInt(32 * dy)), Z: R.wrap(hb.Z + BigInt(32 * dz)), P })
const homeCases = [
  ['the spawn chunk', at(0, 0, 0)], ['a corner of the cube', at(1, -1, 1)], ['a face neighbour', at(-1, 0, 0)],
  ['two chunks out on X', at(2, 0, 0)], ['the twin of the spawn chunk', at(0, 0, 0, 1 - hb.P)],
  ['wrapping below 0 on an axis (an identity whose spawn chunk is the origin)', null],
].map(([name, c]) => {
  if (c === null) { const z = '0'.repeat(64); return { name, identity: z, chunk: [S(R.AXIS_MASK - 31n), '0', '0', 0], in_home: R.inHome(z, R.AXIS_MASK - 31n, 0n, 0n, 0) } }
  return { name, identity: H, chunk: [S(c.X), S(c.Y), S(c.Z), c.P], in_home: R.inHome(H, c.X, c.Y, c.Z, c.P) }
})

// The Stack (§7) and co-builders (§8)
const ID = (n) => n.toString(16).padStart(2, '0').repeat(32)
const READER = ID(0x52), F1 = ID(0xf1), F2 = ID(0xf2), S1 = ID(0x51), S2 = ID(0x50), M = ID(0x4d), A = ID(0xa0), B = ID(0xb0), C = ID(0xc0)
const L = (id, author, created_at, cells, opts = {}) => ({ id: ID(id), author, builder: opts.builder || ID(0xbb), created_at, cobuilders: opts.cobuilders || [], changed: cells })
const NOW = 1800000000
function stackCase(name, chunk, layers, cells, extra = {}) {
  const ctx = { reader: READER, follows: new Set([F1, F2, A]), mutes: new Set(extra.mutes || []), now: NOW, chunk }
  const counted = R.countedLayers(layers, ctx, extra.cap ?? 64).map((l) => ({ ...l, changed: new Map(Object.entries(l.changed).map(([k, v]) => [Number(k), v])) }))
  const results = cells.map((cell) => { const r = R.resolveCell(cell, counted, ctx); return { cell, value: r ? r.value : null, from: r ? r.from : null, rank: r ? r.rank : null } })
  return { name, chunk: [S(chunk.X), S(chunk.Y), S(chunk.Z), chunk.P], mutes: extra.mutes || [], cap: extra.cap ?? 64, layers, cells: results }
}
const away = at(5, 0, 0) // a chunk in nobody's home
const stack = {
  note: 'Each case gives the chunk, the mutes and the layers, as {id, author, builder, created_at, cobuilders, changed: {cell index: value}}, the changed cells being already decoded (§5.4); the reader, its follows and its clock are the same for every case. For each cell: the value, the id of the winning layer and its rank, or null when no counted layer changed the cell, which then shows its base.',
  reader: READER, follows: [F1, F2, A], now: NOW, home_owner: H, home_owner_spawn_chunk: [S(hb.X), S(hb.Y), S(hb.Z), hb.P],
  cases: [
    stackCase('strangers: the newest layer wins; a layer speaks only for the cells it changed', away, [L(1, S1, 1000, { 0: 1, 1: 2 }), L(2, S2, 2000, { 0: 3 })], [0, 1, 2]),
    stackCase('strangers with the same created_at: the lower author pubkey wins', away, [L(1, S1, 1000, { 0: 1 }), L(2, S2, 1000, { 0: 3 })], [0]),
    stackCase('a followed identity beats a newer stranger; among follows the newest wins', away, [L(1, S1, 9000, { 0: 1, 1: 1 }), L(2, F1, 1000, { 0: 2, 1: 2 }), L(3, F2, 1500, { 1: 3 })], [0, 1]),
    stackCase('the reader beats everyone outside a home', away, [L(1, F1, 9000, { 0: 2 }), L(2, READER, 10, { 0: 7 })], [0]),
    stackCase('inside the home cube the home owner beats the reader (spawn chunk)', at(0, 0, 0), [L(1, READER, 9000, { 0: 7, 1: 7 }), L(2, H, 10, { 0: 9 })], [0, 1]),
    stackCase('inside the home cube the home owner beats the reader (corner chunk)', at(1, -1, 1), [L(1, READER, 9000, { 0: 7 }), L(2, H, 10, { 0: 9 })], [0]),
    stackCase('outside the home cube the home owner is an ordinary identity', at(2, 0, 0), [L(1, READER, 9000, { 0: 7 }), L(2, H, 10, { 0: 9 })], [0]),
    stackCase('the home does not reach the twin plane', at(0, 0, 0, 1 - hb.P), [L(1, READER, 9000, { 0: 7 }), L(2, H, 10, { 0: 9 })], [0]),
    stackCase('mutes come first: a muted stranger and a muted home owner are gone', at(0, 0, 0), [L(1, M, 9000, { 0: 4 }), L(2, S1, 100, { 0: 1, 1: 1 }), L(3, H, 50, { 1: 9 })], [0, 1], { mutes: [M, H] }),
    stackCase('a layer dated more than 600 s past the reader\'s clock is not counted yet', away, [L(1, S1, NOW + 601, { 0: 1 }), L(2, S2, NOW + 600, { 1: 2 }), L(3, ID(0x40), 100, { 0: 3, 1: 3 })], [0, 1]),
    stackCase('one author, two builder keys: newest first, then the lower builder key', away, [L(1, S1, 500, { 0: 1, 1: 1 }, { builder: ID(0x22) }), L(2, S1, 600, { 0: 2 }, { builder: ID(0x33) }), L(3, S1, 500, { 1: 3 }, { builder: ID(0x11) })], [0, 1]),
    stackCase('co-builders: where A placed, the layers A lists count at A\'s rank, and the newest among them wins', away, [L(1, A, 100, { 5: 1, 9: 1 }, { cobuilders: [B] }), L(2, B, 200, { 5: 2, 6: 2 }), L(3, F2, 150, { 5: 3 }), L(4, S1, 900, { 5: 4, 6: 4 })], [5, 6, 9]),
    stackCase('co-builders are not transitive', away, [L(1, A, 100, { 7: 1 }, { cobuilders: [B] }), L(2, B, 100, { 8: 2 }, { cobuilders: [C] }), L(3, C, 300, { 7: 3, 8: 3 }), L(4, S1, 200, { 7: 4, 8: 4 })], [7, 8]),
    stackCase('the home owner\'s co-builders share rank 1 in the owner\'s cells inside the home', at(0, 0, 0), [L(1, H, 10, { 9: 1, 10: 1 }, { cobuilders: [B] }), L(2, B, 20, { 9: 2, 11: 2 }), L(3, READER, 9000, { 9: 7, 11: 7 })], [9, 10, 11]),
    stackCase('a listed co-builder whose own rank is better keeps it', away, [L(1, S1, 500, { 10: 1 }, { cobuilders: [READER] }), L(2, READER, 10, { 10: 7 })], [10]),
    stackCase('a co-builder undoes the builder: an explicit change at the base value (0 over empty ground) wins in the builder\'s cell', away, [L(1, A, 100, { 12: 5 }, { cobuilders: [B] }), L(2, B, 200, { 12: 0 })], [12]),
    stackCase('the list comes from the author\'s newest layer only: an older device\'s layer still listing B no longer lifts B', away, [L(1, A, 100, { 13: 1 }, { builder: ID(0x0a), cobuilders: [B] }), L(2, A, 300, { 14: 1 }, { builder: ID(0x0b), cobuilders: [] }), L(3, B, 200, { 13: 2 }), L(4, S1, 250, { 13: 4 })], [13]),
    stackCase('the cap (here 2 authors): authors by own rank, then newest layer, with no lifts; a lister left out lifts nobody', away, [L(1, S1, 100, { 15: 1, 16: 1 }, { cobuilders: [S2] }), L(2, S2, 900, { 15: 2 }), L(3, F1, 50, { 16: 3, 17: 3 })], [15, 16, 17], { cap: 2 }),
  ],
}

// Revision 3 (§3.9, §3.10): the same chunks where it matters, and one that shows a cinder vent and Glowcore at K 9.
function r3Vector(name, note, X, Y, Z, P) {
  const v = chunkVector(name, note, X, Y, Z, P, [], 3)
  const g = R.generateChunk(X, Y, Z, P, false, 3)
  const extra = []
  for (const want of [7, 42]) { const o = g.indexOf(want); if (o >= 0) extra.push([o & 31, o >> 10, (o >> 5) & 31]) }
  if (extra.length) return chunkVector(name, note, X, Y, Z, P, extra, 3)
  return v
}
const chunksR3 = [
  r3Vector('origin', 'The pinned chunk under revision 3. It is volcanic, so no cinder vent is drawn, and its Glowcore draw fails under both revisions: its ground is the revision 2 ground, byte for byte.', 0n, 0n, 0n, 0),
  r3Vector('home', 'The home vector chunk (frozen) under revision 3.', home.X, home.Y, home.Z, home.P),
  r3Vector('pools', 'The pools chunk (dune, K 12) under revision 3: its cinder vent draw, just before Ferrovein, fails, but it reads four bytes, which shifts every draw after it.', 30332262474415856249900160n, 34207092734754452336590560n, 4153259675813629090509088n, 0),
  r3Vector('vent-5', 'A frozen chunk with no Cinderrock under revision 2, and a cinder vent of five Cinderrock cells under revision 3.', 26211978090631955041468480n, 18239898428969693621184352n, 37516079155004959921455200n, 0),
  r3Vector('vent-glowcore-k9', 'A karst chunk whose costliest cube is K 9: a cinder vent, and a Glowcore vein that revision 2 could not place (it needed K 10).', 37727701688262624033138944n, 35731174093016409277930144n, 15860157954469236067618080n, 0),
]
for (const c of chunksR3) {
  const r2 = R.generateChunk(BigInt(c.X), BigInt(c.Y), BigInt(c.Z), c.plane, true, 2)
  c.revision_2_ground_sha256 = R.hex(R.sha256(r2.blocks))
  c.rock_same_as_revision_2 = R.hex(R.sha256(r2.rock)) === c.rock_sha256
}

// §7.5: the base revision of a chunk plane is the revision of its earliest counted survey.
const SV = (revision, rank, surveyed, author, id) => ({ revision, rank, surveyed, author: ID(author), builder: ID(0xbb), id: ID(id) })
const baseRevisionCases = [
  { name: 'one survey at revision 2', surveys: [SV(2, 4, 100, 0xa0, 1)] },
  { name: 'a revision 2 survey, then a newer client surveys at revision 3: the chunk keeps revision 2', surveys: [SV(2, 4, 100, 0xa0, 1), SV(3, 4, 200, 0xb0, 2)] },
  { name: 'surveyed is the first survey, carried forward: a revision 3 survey of 200 republished later still comes before a revision 2 survey of 300', surveys: [SV(2, 4, 300, 0xa0, 1), SV(3, 4, 200, 0xb0, 2)] },
  { name: 'rank first: a stranger who dates a survey 0 does not decide for a reader who follows an earlier-ranked surveyor', surveys: [SV(3, 4, 0, 0xa0, 1), SV(2, 3, 500, 0xf1, 2)] },
  { name: 'the same rank and the same surveyed second: the lower author pubkey decides', surveys: [SV(3, 4, 100, 0xb0, 2), SV(2, 4, 100, 0xa0, 1)] },
  { name: 'no counted survey: the base is empty', surveys: [] },
  { name: 'surveyed read from a plane: anything but a non-negative integer no later than created_at reads as created_at', surveys: [], surveyed_examples: [[{}, 500], [{ surveyed: 400 }, 500], [{ surveyed: 900 }, 500], [{ surveyed: -1 }, 500], [{ surveyed: '400' }, 500], [{ surveyed: 400.5 }, 500]].map(([pl, ca]) => ({ plane: pl, created_at: ca, surveyed: R.surveyedAt(pl, ca) })) },
].map((c) => ({ ...c, base_revision: R.baseRevision(c.surveys) }))
// A layer written against revision 3 over a chunk whose base is revision 2: its changed cells are decoded against the
// revision 3 ground, and every cell it did not change shows the revision 2 ground.
const ventChunk = chunksR3.find((c) => c.name === 'vent-glowcore-k9')
const vX = BigInt(ventChunk.X), vY = BigInt(ventChunk.Y), vZ = BigInt(ventChunk.Z)
const g2 = R.generateChunk(vX, vY, vZ, 0, false, 2), g3 = R.generateChunk(vX, vY, vZ, 0, false, 3)
const differ = []
for (let o = 0; o < R.CELLS; o++) if (g2[o] !== g3[o]) differ.push(o)
const vals3 = Int32Array.from(g3)
const target = differ[0]
vals3[target] = 0 // the revision 3 writer mines one cell that revision 3 changed
const plane3 = R.encodePlane(0, true, vals3, g3, new Set(), 3)
const dec3 = R.decodePlane(plane3, (rev) => (rev === 2 ? g2 : rev === 3 ? g3 : null))
const mixed = {
  note: 'In the vent-glowcore-k9 chunk, revision 2 and revision 3 grounds differ in the cells the cinder vent and the Glowcore vein (and the draws after them) touch. A revision 2 layer surveyed first, so the base is revision 2; a revision 3 layer mines one cell. That cell shows 0; every other cell shows the revision 2 ground, including cells where revision 3 would differ.',
  chunk: [ventChunk.X, ventChunk.Y, ventChunk.Z, 0],
  cells_where_revisions_differ: differ.length,
  first_differing_cell: { x: target & 31, y: target >> 10, z: (target >> 5) & 31, revision_2: g2[target], revision_3: g3[target] },
  revision_3_plane: plane3,
  revision_3_changed: dec3.changed.map((o) => ({ x: o & 31, y: o >> 10, z: (o >> 5) & 31, value: dec3.values[o] })),
  base_revision: 2,
  shown_at_first_differing_cell: 0,
  shown_at_second_differing_cell: differ.length > 1 ? { x: differ[1] & 31, y: differ[1] >> 10, z: (differ[1] >> 5) & 31, value: g2[differ[1]] } : null,
}

// §3.10a Open ground and DEVELOP: a developed plane names `ground: 0`, and a develop is a first claim resolved by §7.5
// exactly as a survey is. Each view decodes real plane objects against the reader's grounds, so an older reader (one
// that reads only revisions 2 and 3) sets a developed diff aside.
const groundCache = new Map()
function groundOf(c, value, implemented = R.GROUND_VALUES) {
  if (!implemented.includes(value)) return null
  if (value === R.OPEN_GROUND) return R.openGround()
  const k = `${c.X}|${c.Y}|${c.Z}|${c.P}|${value}`
  if (!groundCache.has(k)) groundCache.set(k, R.generateChunk(c.X, c.Y, c.Z, c.P, false, value))
  return groundCache.get(k)
}
const xyz = (o) => ({ x: o & 31, y: o >> 10, z: (o >> 5) & 31 })
// A plane object as a writer writes it: `values` over the base of `ground` (0 open ground, or a revision), with `surveyed`.
function claimPlane(c, P, ground, surveyed, edits) {
  const base = groundOf({ ...c, P }, ground)
  const values = Int32Array.from(base)
  for (const [o, v] of edits) values[o] = v
  const pl = R.encodePlane(P, true, values, base, new Set(), ground)
  return { plane: pl.plane, survey: true, surveyed, ground: pl.ground, form: pl.form, pal: pl.pal, cells: pl.cells }
}
const DL = (id, author, created_at, planes, opts = {}) => ({ id: ID(id), author, builder: opts.builder || ID(0xbb), created_at, cobuilders: opts.cobuilders || [], planes })
// One reader's view of one plane: which surveys count, the base, and the cells shown.
function developView(chunk, layers, reader, follows, cells, implemented = R.GROUND_VALUES, P = chunk.P) {
  const c = { ...chunk, P }
  const ctx = { reader, follows: new Set(follows), mutes: new Set(), now: NOW, chunk: c }
  const counted = R.countedLayers(layers, ctx)
  const decoded = counted.map((l) => {
    const pl = l.planes.find((q) => q.plane === P) || null
    let d = null, setAside = false
    if (pl) {
      try { d = R.decodePlane(pl, (v) => groundOf(c, v, implemented)) } catch (e) { setAside = true }
      if (d && d.valuesOnly) { d = null; setAside = true }
    }
    return { id: l.id, author: l.author, builder: l.builder, created_at: l.created_at, cobuilders: l.cobuilders, plane: pl, takesPart: !!d, setAside, changed: new Map(d ? d.changed.map((o) => [o, d.values[o]]) : []) }
  })
  const surveys = R.countedSurveys(decoded, ctx)
  const base = R.baseRevision(surveys)
  const baseGround = base === null ? R.openGround() : groundOf(c, base, implemented)
  const shown = (o) => { const r = R.resolveCell(o, decoded.filter((l) => l.takesPart), ctx); return r ? { value: r.value, from: r.from, rank: r.rank } : { value: baseGround[o], from: null, rank: null } }
  return {
    reader, follows, reads_ground_values: implemented, plane: P,
    set_aside: decoded.filter((l) => l.setAside).map((l) => l.id),
    counted_surveys: surveys.map((e) => ({ id: e.id, ground: e.revision, rank: e.rank, surveyed: e.surveyed })),
    base: base === null ? 'unsurveyed: empty' : base === R.OPEN_GROUND ? 'open ground (0): empty' : `revision ${base}`,
    base_ground: base,
    cells: cells.map(([label, o]) => ({ label, cell: o, ...xyz(o), ground_r3: groundOf(c, 3)[o], ...shown(o) })),
    _shown: shown,
  }
}
const strip = (v) => { const { _shown, ...rest } = v; return rest }
// Cells of a chunk, picked from its revision 3 ground: rock (not empty) and empty cells, scanning from a start.
function pick(c, wantRock, from, skip = new Set()) {
  const g = groundOf(c, 3)
  for (let i = 0; i < R.CELLS; i++) { const o = (from + i) % R.CELLS; if (!skip.has(o) && (g[o] !== 0) === wantRock) return o }
  throw new Error('no cell')
}
const DEV = ID(0xd0), FR = ID(0xe1), TH = ID(0x7a), OW = H
const awayC = { ...away }
const used = new Set()
const take = (o) => { used.add(o); return o }
const rockCell = take(pick(awayC, true, R.cellIndex(16, 16, 16)))
const airCell = take(pick(awayC, false, R.cellIndex(16, 20, 16), used))
const plotAir = take(pick(awayC, false, R.cellIndex(4, 24, 4), used))
const plotRock = take(pick(awayC, true, R.cellIndex(4, 8, 4), used))
if (groundOf(awayC, 3)[plotRock] === 10) throw new Error('pick another plot cell')
const frMined = take(pick(awayC, true, R.cellIndex(24, 8, 24), used))
const frPlaced = take(pick(awayC, false, R.cellIndex(24, 26, 24), used))
const awayCells = [['rock in the ground, nobody changed it', rockCell], ['empty in the ground, nobody changed it', airCell],
  ['D placed Glowcore (42) in a cell the ground leaves empty', plotAir], ['D placed Rimeglass (10) in a cell that is rock in the ground', plotRock],
  ['F mined a cell of rock', frMined], ['F placed Prismite (8) in an empty cell', frPlaced]]
const twinP = 1 - awayC.P
const twinCell = pick({ ...awayC, P: twinP }, false, R.cellIndex(8, 28, 8))
// D develops plane P of the away chunk (surveyed 200) and surveys its twin at revision 3; F surveys plane P (surveyed 300, or 100).
const dLayer = DL(0x01, DEV, 1000, [
  claimPlane(awayC, awayC.P, R.OPEN_GROUND, 200, [[plotAir, 42], [plotRock, 10]]),
  claimPlane(awayC, twinP, 3, 200, [[twinCell, 41]]),
].sort((a, b) => a.plane - b.plane))
const fLayer = (surveyed) => DL(0x02, FR, 1100, [claimPlane(awayC, awayC.P, 3, surveyed, [[frMined, 0], [frPlaced, 8]])])
const layoutA = [dLayer, fLayer(300)] // D claimed first
const layoutB = [dLayer, fLayer(100)] // F claimed first (two claims made before either saw the other)
const viewD = developView(awayC, layoutA, DEV, [FR], awayCells)
let placedNonEmpty = 0, shownNonEmpty = 0
for (let o = 0; o < R.CELLS; o++) { if (viewD._shown(o).value !== 0) shownNonEmpty++; if (viewD._shown(o).from !== null && viewD._shown(o).value !== 0) placedNonEmpty++ }

// The home: H's develop decides for every reader in H's 27 chunks.
const homeC = { ...hb }
const hUsed = new Set()
const hTake = (o) => { hUsed.add(o); return o }
const hRock = hTake(pick(homeC, true, R.cellIndex(16, 16, 16)))
const hPlot = hTake(pick(homeC, false, R.cellIndex(4, 24, 4), hUsed))
const hReaderMined = hTake(pick(homeC, true, R.cellIndex(24, 8, 24), hUsed))
const hReaderPlaced = hTake(pick(homeC, false, R.cellIndex(24, 26, 24), hUsed))
const homeCells = [['rock in the ground, nobody changed it', hRock], ['H placed Glowcore (42)', hPlot], ['the reader mined a cell of rock', hReaderMined], ['the reader placed Prismite (8)', hReaderPlaced]]
const homeLayers = [
  DL(0x11, OW, 1500, [claimPlane(homeC, homeC.P, R.OPEN_GROUND, 500, [[hPlot, 42]])]),
  DL(0x12, READER, 1200, [claimPlane(homeC, homeC.P, 3, 100, [[hReaderMined, 0], [hReaderPlaced, 8]])]),
  DL(0x13, S1, 900, [claimPlane(homeC, homeC.P, 3, 50, [])]),
]
// A face neighbour in H's home, developed by D, who is not its home owner.
const faceC = at(1, 0, 0)
const fRock = pick(faceC, true, R.cellIndex(16, 16, 16))
const fPlot = pick(faceC, false, R.cellIndex(4, 24, 4))
const faceCells = [['rock in the ground, nobody changed it', fRock], ['D placed Glowcore (42)', fPlot]]
const faceD = DL(0x21, DEV, 1000, [claimPlane(faceC, faceC.P, R.OPEN_GROUND, 200, [[fPlot, 42]])])
const faceH = DL(0x22, OW, 1300, [claimPlane(faceC, faceC.P, 3, 600, [])])

// A developed plane in whole form: an older reader reads it for its values only, and it takes no part in the Stack.
const wholePlot = (() => {
  const values = new Int32Array(R.CELLS)
  values[plotAir] = 42; values[plotRock] = 10
  const pal = [0, 42, 10]
  const idx = Array.from(values, (v) => pal.indexOf(v))
  return { plane: awayC.P, survey: true, surveyed: 200, ground: R.OPEN_GROUND, form: 'whole', pal, cells: R.encodeRuns(idx) }
})()
const wholeNew = R.decodePlane(wholePlot, (v) => groundOf(awayC, v))
const wholeOld = R.decodePlane(wholePlot, (v) => groundOf(awayC, v, [2, 3]))

const developOnly = { planes: [{ plane: 0, survey: true, surveyed: 1800000000, ground: R.OPEN_GROUND, form: 'diff', pal: [null], cells: [0, -32767] }] }
const SVB = (revision, rank, surveyed, author, id, builder = 0xbb) => ({ revision, rank, surveyed, author: ID(author), builder: ID(builder), id: ID(id) })
const developTies = [
  { name: 'a develop and a survey of one rank in the same second: the lower author pubkey decides (the developer, d0, is lower than e1)', surveys: [SVB(3, 3, 200, 0xe1, 2), SVB(0, 3, 200, 0xd0, 1)] },
  { name: 'the same, with the surveyor lower (0e): the survey decides', surveys: [SVB(0, 3, 200, 0xd0, 1), SVB(3, 3, 200, 0x0e, 2)] },
  { name: 'one author, two builder keys that claimed the plane in the same second, one developing and one surveying: the lower builder pubkey decides', surveys: [SVB(3, 2, 200, 0xd0, 2, 0x22), SVB(0, 2, 200, 0xd0, 1, 0x11)] },
  { name: 'one author, one builder key, two layers held in the same second (a reader that kept two versions): the lower event id decides', surveys: [SVB(3, 2, 200, 0xd0, 2, 0x11), SVB(0, 2, 200, 0xd0, 1, 0x11)] },
  { name: 'rank first: a stranger who dates a develop 0 does not decide for a reader who follows a later surveyor', surveys: [SVB(0, 4, 0, 0x51, 1), SVB(3, 3, 500, 0xe1, 2)] },
  { name: 'rank first the other way: a stranger who dates a survey 0 does not put rock under a followed developer\'s plot', surveys: [SVB(3, 4, 0, 0x51, 1), SVB(0, 3, 500, 0xd0, 2)] },
].map((c) => ({ ...c, base_ground: R.baseRevision(c.surveys) }))
const sv = (id, author, ground, rank, surveyed) => ({ id: ID(id), author, revision: ground, rank, surveyed, builder: ID(0xbb) })
const writerChecks = [
  { name: 'D in a chunk nobody it counts has claimed: may develop', view: [], author_claims: [], choice: 'develop' },
  { name: 'D chooses SURVEY there instead: the newest revision', view: [], author_claims: [], choice: 'survey' },
  { name: 'F, who follows D and has not claimed the plane, after D developed it: may not develop, and building there names open ground, so F develops too', view: [sv(1, DEV, 0, 3, 200)], author_claims: [], choice: 'survey' },
  { name: 'T, after a stranger surveyed the plane at revision 3: may not develop; building there surveys at revision 3', view: [sv(2, S1, 3, 4, 300)], author_claims: [], choice: 'develop' },
  { name: 'D, whose own layer developed the plane: may not develop it again or survey it (its claim never changes); its writer carries ground 0 forward', view: [sv(1, DEV, 0, 2, 200)], author_claims: [{ ground: 0, surveyed: 200 }], choice: 'survey' },
  { name: 'D\'s twin plane, unclaimed while plane P is developed: may develop (each plane is its own claim)', view: [], author_claims: [], choice: 'develop' },
  { name: 'a reader who muted the only surveyor: its view has no counted survey, so it may develop', view: [], author_claims: [], choice: 'develop', muted: [S1] },
  { name: 'an author whose own layer holds a plane its writer cannot read (a ground it does not implement): may not develop or survey there', view: [], author_claims: [{ ground: 7, surveyed: 150 }], choice: 'develop' },
].map((c) => ({ ...c, may_develop: R.mayDevelop(c.view, c.author_claims), first_claim_ground: c.author_claims.length ? null : R.firstClaimGround(c.view, c.choice) }))

const develop = {
  note: 'Open ground (§3.10a): a plane object with survey true and ground 0 develops the plane: its base is every cell empty, and it is a first claim resolved by §7.5 exactly as a survey is, by own rank, then the earliest surveyed, then the lower author pubkey, builder pubkey and event id. Each view below decodes real plane objects against the reader\'s grounds and resolves the cells by §7.4. A cell gives what it shows, the id of the winning layer and its rank, or null when no counted layer changed it and it shows the base; ground_r3 is the cell in the revision 3 ground, for reference.',
  open_ground: R.OPEN_GROUND,
  develop_only_plaintext: JSON.stringify(developOnly),
  develop_only_bytes: JSON.stringify(developOnly).length,
  authors: { D: DEV, F: FR, T: TH, H: OW, reader: READER, stranger: S1 },
  outside_the_home: {
    chunk: [S(awayC.X), S(awayC.Y), S(awayC.Z), awayC.P],
    note: 'A chunk in nobody\'s home. D develops plane P (surveyed 200) and places Glowcore and Rimeglass, and surveys the twin plane at revision 3. In layout A, F surveys plane P at revision 3 with surveyed 300, after D; in layout B with surveyed 100, before D (two claims made before either saw the other). F mines a rock cell and places Prismite.',
    layers_a: layoutA, layers_b: layoutB,
    views: [
      { name: 'D, the developer (follows F): its own develop is rank 2 and decides; every cell nobody changed is empty, rock included', layout: 'a', ...strip(viewD) },
      { name: 'F, the friend who surveyed (follows D): its own survey is rank 2 and decides; it sees the ground, can mine it, and sees D\'s blocks in the cells D changed', layout: 'a', ...strip(developView(awayC, layoutA, FR, [DEV], awayCells)) },
      { name: 'T follows D and F (both rank 3): the earlier claim decides, D\'s develop at 200', layout: 'a', ...strip(developView(awayC, layoutA, TH, [DEV, FR], awayCells)) },
      { name: 'T follows D and F, and F claimed first (100): F\'s survey decides, and D\'s plot is drawn over rock', layout: 'b', ...strip(developView(awayC, layoutB, TH, [DEV, FR], awayCells)) },
      { name: 'T follows only D: D\'s develop (rank 3) beats F\'s earlier survey (rank 4)', layout: 'b', ...strip(developView(awayC, layoutB, TH, [DEV], awayCells)) },
      { name: 'T follows nobody: both are strangers, and F\'s earlier survey decides', layout: 'b', ...strip(developView(awayC, layoutB, TH, [], awayCells)) },
      { name: 'D\'s twin plane, viewed by T who follows D: a plane of its own, surveyed at revision 3 by D', layout: 'a', ...strip(developView(awayC, layoutA, TH, [DEV, FR], [['D placed Cobaltine (41) on the twin', twinCell]], R.GROUND_VALUES, twinP)) },
    ],
    mining_in_d_view: { note: 'Every cell of plane P that D\'s view shows as not empty is a block a counted layer placed: none comes from the ground, so mining in D\'s plot yields only placed blocks.', non_empty_cells_shown: shownNonEmpty, of_them_placed_by_a_layer: placedNonEmpty },
  },
  in_the_home: {
    chunk: [S(homeC.X), S(homeC.Y), S(homeC.Z), homeC.P],
    note: 'H\'s spawn chunk. H develops (surveyed 500) and places Glowcore. The reader, who is not H, surveyed earlier at revision 3 (surveyed 100), mined a rock cell and placed Prismite; a stranger surveyed at 50. Inside a home only a home owner\'s surveys count, so H\'s develop decides for every reader.',
    layers: homeLayers,
    views: [
      { name: 'the reader (not H, follows S1): only H\'s develop counts; the base is open ground, and the reader\'s own blocks still show', ...strip(developView(homeC, homeLayers, READER, [S1], homeCells)) },
      { name: 'H itself', ...strip(developView(homeC, homeLayers, OW, [], homeCells)) },
    ],
    face: {
      chunk: [S(faceC.X), S(faceC.Y), S(faceC.Z), faceC.P],
      note: 'A face neighbour in H\'s home, developed by D, who is not H.',
      views: [
        { name: 'H has surveyed it at revision 3 (surveyed 600, later than D): only H\'s survey counts, so D sees the ground there too', ...strip(developView(faceC, [faceD, faceH], DEV, [], faceCells)) },
        { name: 'H has no layer there: nothing says whose home it is, and D\'s develop counts', ...strip(developView(faceC, [faceD], DEV, [], faceCells)) },
      ],
    },
  },
  older_reader: {
    note: 'A reader that implements revisions 2 and 3 but not open ground, reading layout A while following D and F. D\'s developed plane is a diff under a ground it does not implement, so it is set aside: it does not count as a survey, and none of its cells is drawn. F\'s survey decides, and D\'s plot is not drawn at all, never drawn over rock. D\'s layer is not dropped: its twin plane still counts. Beside it, the same reader once it implements open ground.',
    views: [
      { name: 'older reader, plane P', ...strip(developView(awayC, layoutA, TH, [DEV, FR], awayCells, [2, 3])) },
      { name: 'older reader, the twin plane: D\'s layer still counts there', ...strip(developView(awayC, layoutA, TH, [DEV, FR], [['D placed Cobaltine (41) on the twin', twinCell]], [2, 3], twinP)) },
      { name: 'the same reader implementing open ground, plane P', ...strip(developView(awayC, layoutA, TH, [DEV, FR], awayCells)) },
    ],
    whole_form: {
      note: 'D\'s developed plane written whole. A reader that implements open ground decodes it against an empty base: its changed cells are the cells not empty. An older reader reads it for its values only (§3.10): it may show them to D, and the plane takes no part in the Stack.',
      plane: wholePlot,
      implementing_reader_changed: wholeNew.changed.map((o) => ({ ...xyz(o), value: wholeNew.values[o] })),
      older_reader_values_only: !!wholeOld.valuesOnly,
    },
  },
  ties: developTies,
  writer_checks: { note: 'mayDevelop (§3.10a): the writer\'s own view has no counted survey or develop of the plane, and its author\'s own layers claim nothing there. first_claim_ground: what a first claim names (§3.10): the base of the writer\'s view when a counted layer claims the plane, otherwise the newest revision to survey or 0 to develop; null where the author already claims the plane.', cases: writerChecks },
}

const out = {
  description: 'Test vectors for DECK-0009 (Blocks). Generated by blocks-vectors.mjs from blocks-reference.mjs. Not normative: where this file disagrees with the DECK, the DECK is right.',
  constants: {
    survey_domain: 'CYBERSPACE_BLOCKS_SURVEY_V1', terrain_domain: 'CYBERSPACE_TERRAIN_K_V2',
    W8: R.W8, W128_samples: Object.fromEntries([0, 1, 32, 64, 96, 127, 128].map((f) => [f, R.W128(f)])),
    ground_revision: R.GROUND_REVISION, EMPTY_THR: R.EMPTY_THR, FEATURES: R.FEATURES, FEATURE_BYTES: R.FEATURE_BYTES, pool_threshold_examples: Object.fromEntries([0, 300, 512, 600, 768].map((k) => [k, R.poolThreshold(k)])), RARE: R.RARE,
    FAMILIES: R.FAMILIES, FUTURE_SLACK_SECONDS: R.FUTURE_SLACK_SECONDS,
  },
  chacha20_check: { key: chunks[0].survey_seed, nonce: '000000000000000000000000', counter: 0, keystream_head: chunks[0].stream_head },
  chunks, runs, layer, builder_keys: keyCases, home: homeCases, stack,
  revision_3: { features: R.FEATURES_R3, chunks: chunksR3 },
  base_revision: { cases: baseRevisionCases, mixed },
  develop,
}
process.stdout.write(JSON.stringify(out, null, 1) + '\n')
