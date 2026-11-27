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
  { name: 'surveyed read from a plane: absent, or later than created_at, reads as created_at', surveys: [], surveyed_examples: [[{}, 500], [{ surveyed: 400 }, 500], [{ surveyed: 900 }, 500]].map(([pl, ca]) => ({ plane: pl, created_at: ca, surveyed: R.surveyedAt(pl, ca) })) },
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
}
process.stdout.write(JSON.stringify(out, null, 1) + '\n')
