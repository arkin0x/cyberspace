// Generates blueprints-vectors.json for DECK-0010 (Blueprints) from blueprints-reference.mjs.
// Deterministic: every key is SHA-256("cyberspace vectors: <label>"), every AES-GCM nonce is the first
// 12 bytes of SHA-256("cyberspace vectors nonce: <label>"), every created_at is fixed, and every
// BIP-340 signature uses 32 zero bytes of auxiliary randomness. A reader MUST accept any valid signature.
// Run from a directory where nostr-tools (2.x) and @noble/curves are installed:
//   node blueprints-vectors.mjs > blueprints-vectors.json
// Like the other vectors in this repository, the output is not normative: where it disagrees with
// DECK-0010-blueprints.md, the DECK is right and the file is a bug.
import { createHash } from 'node:crypto'
import { getPublicKey, getEventHash, verifyEvent } from 'nostr-tools/pure'
import { schnorr } from '@noble/curves/secp256k1.js'
import * as B from './blueprints-reference.mjs'

const sha = (s) => createHash('sha256').update(s).digest()
const hex = (b) => Buffer.from(b).toString('hex')
const skOf = (label) => new Uint8Array(sha(`cyberspace vectors: ${label}`))
const nonceOf = (label) => new Uint8Array(sha(`cyberspace vectors nonce: ${label}`)).slice(0, 12)
const AUX = new Uint8Array(32)
const sign = (unsigned, sk) => {
  const ev = { ...unsigned, pubkey: getPublicKey(sk) }
  const id = getEventHash(ev)
  const out = { ...ev, id, sig: hex(schnorr.sign(Buffer.from(id, 'hex'), sk, AUX)) }
  if (!verifyEvent({ ...out })) throw new Error('signature does not verify')
  return out
}
const check = (cond, what) => { if (!cond) throw new Error(`vector check failed: ${what}`) }
const k3 = (x, y, z) => `${x},${y},${z}`

const T0 = 1795000000

// ---------- arrangements ----------
function arrVector(name, note, cells, regionKey = null) {
  if (regionKey && !(regionKey instanceof Uint8Array)) regionKey = null
  const arr = B.arrangementFrom(cells)
  const e = B.encodeArrangement(arr, regionKey)
  const key = B.arrangementKey(e)
  const v = { name, note, size: arr.size, cells: arr.cells, encoding_length: e.length }
  if (e.length <= 256) v.encoding = hex(e)
  else v.encoding_sha256 = hex(B.sha256(e))
  v.key = hex(key); v.lookup = B.lookupOf(key)
  return v
}
const G = 1, FERRO = 40, GLOW = 42
const RUST = 5
const compilerUpsideDown = [[0, 0, 0, RUST], [1, 0, 0, GLOW], [2, 0, 0, RUST], [1, 1, 0, FERRO], [1, 2, 0, FERRO]]
const compilerTurned = [[0, 0, 1, FERRO], [0, 1, 1, FERRO], [0, 2, 0, RUST], [0, 2, 1, GLOW], [0, 2, 2, RUST]]   // a quarter turn about Y: the head runs along Z
const L = [[0, 0, 0, FERRO], [1, 0, 0, FERRO], [2, 0, 0, FERRO], [2, 0, 1, FERRO]]
const Lturned = [[0, 0, 2, FERRO], [0, 0, 1, FERRO], [0, 0, 0, FERRO], [1, 0, 0, FERRO]]   // a quarter turn about Y
const Lmirror = [[2, 0, 0, FERRO], [1, 0, 0, FERRO], [0, 0, 0, FERRO], [0, 0, 1, FERRO]]   // mirrored across X
const hollow = [], solid = []
for (let y = 0; y < 3; y++) for (let z = 0; z < 3; z++) for (let x = 0; x < 3; x++) {
  solid.push([x, y, z, G]); if (!(x === 1 && y === 1 && z === 1)) hollow.push([x, y, z, G])
}
const diagonal = []
for (let i = 0; i < 16; i++) diagonal.push([i, i, i, i % 2 ? GLOW : G])

const arrangements = [
  arrVector('compiler', 'The Compiler\'s recipe (§8.3): an upright T hammer, two Ferrovein for the handle, Rustband, Glowcore, Rustband for the head. Box 3 (X) by 3 (Y) by 1 (Z).', B.COMPILER_RECIPE),
  arrVector('compiler-upside-down', 'The same blocks with the head at the bottom: a different arrangement.', compilerUpsideDown),
  arrVector('compiler-turned', 'The same T turned a quarter turn about Y, its head along Z: a different arrangement, box 1 by 3 by 3.', compilerTurned),
  arrVector('quarry-charge', 'The Quarry Charge\'s recipe (§8.5): a cross of seven, Umberslate below and above a Ferrovein, Rustband on -X, -Z and +Z, Cinderrock on +X. Box 3 by 3 by 3.', B.QUARRY_CHARGE_RECIPE),
  arrVector('quarry-charge-mirrored-x', 'The Quarry Charge mirrored across X: the Cinderrock on -X and a Rustband on +X. A different arrangement; it compiles nothing.', B.QUARRY_CHARGE_RECIPE.map(([x, y, z, id]) => [2 - x, y, z, id])),
  arrVector('quarry-charge-mirrored-z', 'The Quarry Charge mirrored across Z: it swaps two Rustband, so it is the same arrangement as the recipe.', B.QUARRY_CHARGE_RECIPE.map(([x, y, z, id]) => [x, y, 2 - z, id]), { dup: true }),
  arrVector('one-gridstone', 'A single Gridstone: the shortest encoding, 28 bytes.', [[0, 0, 0, G]]),
  arrVector('L', 'Four Ferrovein in an L in the XZ plane: three along X, one more along Z at the +X end.', L),
  arrVector('L-turned', 'The L turned a quarter turn about Y: a different key (§3.1).', Lturned),
  arrVector('L-mirrored', 'The L mirrored across X: a different key.', Lmirror),
  arrVector('hollow', 'A hollow 3 by 3 by 3 cube of Gridstone, its centre empty.', hollow),
  arrVector('solid', 'The solid 3 by 3 by 3 cube: differs from the hollow cube only in the centre cell.', solid),
  arrVector('corner-pair', 'Two Gridstone joined only at a corner: (0,0,0) and (1,1,1).', [[0, 0, 0, G], [1, 1, 1, G]]),
  arrVector('special-and-extension', 'A Genesis shard (197) on an extension id (300): ids are written as they are, in two bytes.', [[0, 0, 0, 300], [0, 1, 0, 197]]),
  arrVector('diagonal-16', 'A diagonal of 16 blocks through a 16 by 16 by 16 box, Gridstone and Glowcore alternating, each touching the next only at a corner: the longest encoding without a lock, 8,218 bytes.', diagonal),
]
const byName = Object.fromEntries(arrangements.map((a) => [a.name, a]))
const qc = arrangements.find((a) => a.name === 'quarry-charge')
check(arrangements.find((a) => a.name === 'quarry-charge-mirrored-x').lookup !== qc.lookup, 'the Quarry Charge mirrored across X differs')
check(arrangements.find((a) => a.name === 'quarry-charge-mirrored-z').lookup === qc.lookup, 'the Quarry Charge mirrored across Z is the same')
check(new Set(arrangements.filter((a) => a.name !== 'quarry-charge-mirrored-z').map((a) => a.lookup)).size === arrangements.length - 1, 'every other lookup differs')
check(B.readPrize(B.GAME_RECIPES[1].prize, true)?.count === 7 && B.readPrize(B.GAME_RECIPES[1].prize, false) === null, 'a tool prize only from a game recipe')
check(byName.compiler.lookup === '84b131f9c9fd4fe30f118e8c115e7dfd86c7debd3d2f7cef26ddddae053f8564', 'compiler lookup')

// ---------- location ----------
const reg5 = B.regionOf(0n, 0n, 0n, 5)
check(reg5.lookupId === '3c5d8c498f57d6d61527c53b824efe9edd768c2efd4d05acad6ea2775727c649', 'origin chunk lookup id (DECK-0009 §11)')
const reg6 = B.regionOf(0n, 0n, 0n, 6)
const atOrigin = B.COMPILER_RECIPE.map(([x, y, z, id]) => [x + 10, y + 4, z + 20, id])   // the box stands at (10..12, 4..6, 20)
const locBox = { lo: { x: 10n, y: 4n, z: 20n }, hi: { x: 12n, y: 6n, z: 20n } }
check(B.regionHoldingBox(locBox.lo, locBox.hi, 5)?.lookupId === reg5.lookupId, 'box inside the origin chunk')
const straddle = { lo: { x: 30n, y: 4n, z: 20n }, hi: { x: 32n, y: 5n, z: 22n } }
check(B.regionHoldingBox(straddle.lo, straddle.hi, 5) === null, 'straddling box has no h5 region')
check(B.regionHoldingBox(straddle.lo, straddle.hi, 6) !== null, 'straddling box fits h6')
const regInfo = (r) => ({ base: { x: r.base.X.toString(), y: r.base.Y.toString(), z: r.base.Z.toString() }, height: r.h, region_n: r.regionN.toString(), region_key: hex(r.key), lookup_id: r.lookupId })
const locVector = (r, note) => {
  const a = arrVector(`compiler-location-h${r.h}`, note, atOrigin, r.key)
  check(a.lookup !== byName.compiler.lookup, 'location lookup differs from standard')
  return { region: regInfo(r), ...a }
}
const location = {
  note: 'The Compiler\'s recipe built with its box at (10..12, 4..6, 20) in dataspace. The location encoding is the standard encoding followed by the region key (§3.5).',
  box: { lo: { x: 10, y: 4, z: 20 }, hi: { x: 12, y: 6, z: 20 } },
  h5: locVector(reg5, 'Location lock at height 5: the origin chunk (DECK-0009\'s origin, lookup id 3c5d8c49...c649).'),
  h6: locVector(reg6, 'Location lock at height 6: a different region key, so a different key and lookup.'),
  straddle: {
    note: 'A box at (30..32, 4..5, 20..22) crosses the border x = 32 of the height 5 regions, so it has no location encoding at height 5. At height 6 it stands in the region at the origin.',
    lo: { x: 30, y: 4, z: 20 }, hi: { x: 32, y: 5, z: 22 }, region_h5: null,
    region_h6: regInfo(B.regionHoldingBox(straddle.lo, straddle.hi, 6)),
  },
}
location.h5.encoding_length === 76 || (() => { throw new Error('location encoding length') })()

// ---------- gather ----------
function world(cells) { const m = new Map(); for (const [x, y, z, id] of cells) m.set(k3(x, y, z), id); return m }
function gatherVector(name, note, cells, hit, expect) {
  const r = B.gather(world(cells), hit, !!expect.bare)
  const v = { name, note, world: cells, hit, bare: !!expect.bare, reach: r.reach, group: r.group, extent: r.extent, isolated: r.isolated, intruders: r.intruders, arrangement: !!r.arrangement }
  if (r.arrangement) {
    const key = B.arrangementKey(B.encodeArrangement(r.arrangement))
    v.box = r.arrangement.size; v.lookup = B.lookupOf(key)
  }
  check(r.isolated === expect.isolated, `${name}: isolated`)
  check(!!r.arrangement === expect.arrangement, `${name}: arrangement`)
  check(r.group.length === expect.group, `${name}: group count ${r.group.length}`)
  if (expect.lookup) check(v.lookup === expect.lookup, `${name}: lookup`)
  return v
}
const placed = (cells, dx, dy, dz) => cells.map(([x, y, z, id]) => [x + dx, y + dy, z + dz, id])
const comp = placed(B.COMPILER_RECIPE, 100, 50, 200)
const row = (n, x0) => Array.from({ length: n }, (_, i) => [x0 + i, 10, 10, G])
const Lnotch = [[0, 0, 0, G], [1, 0, 0, G], [2, 0, 0, G], [2, 0, 1, G], [2, 0, 2, G]]
const gatherCases = [
  gatherVector('T-compiler-lower-ferrovein', 'The Compiler\'s recipe in open air (handle (101, 50..51, 200), head (100..102, 52, 200)), struck with the Compiler (reach 16, window 31 cells) on its lower Ferrovein: the whole T, isolated, the recipe\'s lookup.', comp, [101, 50, 200], { isolated: true, arrangement: true, group: 5, lookup: byName.compiler.lookup }),
  gatherVector('T-compiler-upper-ferrovein', 'The Compiler\'s recipe in open air (handle (101, 50..51, 200), head (100..102, 52, 200)), struck with the Compiler (reach 16, window 31 cells) on its upper Ferrovein: the whole T, isolated, the recipe\'s lookup.', comp, [101, 51, 200], { isolated: true, arrangement: true, group: 5, lookup: byName.compiler.lookup }),
  gatherVector('T-compiler-left-rustband', 'The Compiler\'s recipe in open air (handle (101, 50..51, 200), head (100..102, 52, 200)), struck with the Compiler (reach 16, window 31 cells) on its left Rustband: the whole T, isolated, the recipe\'s lookup.', comp, [100, 52, 200], { isolated: true, arrangement: true, group: 5, lookup: byName.compiler.lookup }),
  gatherVector('T-compiler-glowcore', 'The Compiler\'s recipe in open air (handle (101, 50..51, 200), head (100..102, 52, 200)), struck with the Compiler (reach 16, window 31 cells) on its Glowcore: the whole T, isolated, the recipe\'s lookup.', comp, [101, 52, 200], { isolated: true, arrangement: true, group: 5, lookup: byName.compiler.lookup }),
  gatherVector('T-compiler-right-rustband', 'The Compiler\'s recipe in open air (handle (101, 50..51, 200), head (100..102, 52, 200)), struck with the Compiler (reach 16, window 31 cells) on its right Rustband: the whole T, isolated, the recipe\'s lookup.', comp, [102, 52, 200], { isolated: true, arrangement: true, group: 5, lookup: byName.compiler.lookup }),
  gatherVector('T-bare-lower-ferrovein', 'The Compiler\'s recipe in open air (handle (101, 50..51, 200), head (100..102, 52, 200)), struck bare-handed (reach 3, window 5 cells) on its lower Ferrovein: the whole T, isolated, the recipe\'s lookup.', comp, [101, 50, 200], { bare: true, isolated: true, arrangement: true, group: 5, lookup: byName.compiler.lookup }),
  gatherVector('T-bare-upper-ferrovein', 'The Compiler\'s recipe in open air (handle (101, 50..51, 200), head (100..102, 52, 200)), struck bare-handed (reach 3, window 5 cells) on its upper Ferrovein: the whole T, isolated, the recipe\'s lookup.', comp, [101, 51, 200], { bare: true, isolated: true, arrangement: true, group: 5, lookup: byName.compiler.lookup }),
  gatherVector('T-bare-left-rustband', 'The Compiler\'s recipe in open air (handle (101, 50..51, 200), head (100..102, 52, 200)), struck bare-handed (reach 3, window 5 cells) on its left Rustband: the whole T, isolated, the recipe\'s lookup.', comp, [100, 52, 200], { bare: true, isolated: true, arrangement: true, group: 5, lookup: byName.compiler.lookup }),
  gatherVector('T-bare-glowcore', 'The Compiler\'s recipe in open air (handle (101, 50..51, 200), head (100..102, 52, 200)), struck bare-handed (reach 3, window 5 cells) on its Glowcore: the whole T, isolated, the recipe\'s lookup.', comp, [101, 52, 200], { bare: true, isolated: true, arrangement: true, group: 5, lookup: byName.compiler.lookup }),
  gatherVector('T-bare-right-rustband', 'The Compiler\'s recipe in open air (handle (101, 50..51, 200), head (100..102, 52, 200)), struck bare-handed (reach 3, window 5 cells) on its right Rustband: the whole T, isolated, the recipe\'s lookup.', comp, [102, 52, 200], { bare: true, isolated: true, arrangement: true, group: 5, lookup: byName.compiler.lookup }),
  gatherVector('compiler-corner-stray', 'A Driftsilt (3) at (102, 49, 201), touching the T only at a corner of the lower Ferrovein: in the group, isolated, an arrangement with a different lookup.', [...comp, [102, 49, 201, 3]], [101, 50, 200], { isolated: true, arrangement: true, group: 6 }),
  gatherVector('compiler-clear-above', 'A Gridstone at (101, 54, 200), two cells above the Glowcore: outside the grown box, not in the group; still the recipe.', [...comp, [101, 54, 200, G]], [101, 50, 200], { isolated: true, arrangement: true, group: 5, lookup: byName.compiler.lookup }),
  gatherVector('compiler-in-grown-box', 'A Gridstone at (103, 50, 201): inside the grown box (x 99..103, y 49..53, z 199..201) but touching nothing: not isolated, no arrangement.', [...comp, [103, 50, 201, G]], [101, 50, 200], { isolated: false, arrangement: false, group: 5 }),
  gatherVector('L-notch', 'An L of five Gridstone with a block in its notch at (0, 0, 2), touching nothing: not isolated, no arrangement (§4.2).', [...Lnotch, [0, 0, 2, G]], [2, 0, 0], { isolated: false, arrangement: false, group: 5 }),
  gatherVector('row-16-minus-end', 'A row of 16 Gridstone, x 0..15, struck at x 0, its minus end: the window is x -15..15, the whole row, isolated, 16 cells long: an arrangement.', row(16, 0), [0, 10, 10], { isolated: true, arrangement: true, group: 16 }),
  gatherVector('row-16-plus-end', 'The same row struck at x 15, its plus end: the same arrangement and lookup.', row(16, 0), [15, 10, 10], { isolated: true, arrangement: true, group: 16 }),
  gatherVector('row-17-middle', 'A row of 17, x 0..16, struck at x 8: the whole row is in the window and isolated, but 17 cells long, more than the reach: no arrangement.', row(17, 0), [8, 10, 10], { isolated: true, arrangement: false, group: 17 }),
  gatherVector('row-40-middle', 'A row of 40, x 0..39, struck at x 20: the window is x 5..35, so the group is 31 cells, and x 4 and x 36 touch it from outside the window: not isolated, and too long: no arrangement.', row(40, 0), [20, 10, 10], { isolated: false, arrangement: false, group: 31 }),
  gatherVector('bare-row-3-end', 'A row of 3, x 0..2, struck bare-handed at x 0: the window is x -2..2, the whole row, isolated, 3 long: an arrangement.', row(3, 0), [0, 10, 10], { bare: true, isolated: true, arrangement: true, group: 3 }),
  gatherVector('bare-row-4-end', 'A row of 4, x 0..3, struck bare-handed at x 0: the window is x -2..2, so the group is 3 cells and x 3 touches it from outside: not isolated, no arrangement.', row(4, 0), [0, 10, 10], { bare: true, isolated: false, arrangement: false, group: 3 }),
  gatherVector('joined-outside-window', 'Two Gridstone columns, y 0..40 at x 0 and at x 2, joined only by a bridge at (1, 40, 0), outside the window of a hit at (0, 10, 0) (y -5..25): the group is the struck column\'s 26 cells in the window; the other column is not in it; not isolated and too tall.', [
    ...Array.from({ length: 41 }, (_, i) => [0, i, 0, G]), [1, 40, 0, G], ...Array.from({ length: 41 }, (_, i) => [2, i, 0, G]),
  ], [0, 10, 0], { isolated: false, arrangement: false, group: 26 }),
]
const lk = (n) => gatherCases.find((g) => g.name === n).lookup
check(lk('row-16-minus-end') && lk('row-16-minus-end') === lk('row-16-plus-end'), 'a 16-long row compiles the same from either end')

// ---------- sheets ----------
const compArr = B.arrangementFrom(B.COMPILER_RECIPE)
const sheetVec = (name, revealed) => {
  const s = B.makeSheetShape(compArr, revealed)
  return { name, size: s.size, pal: s.pal, cells: s.cells, expanded: B.readSheetShape(s) }
}
const sheets = {
  accept: [
    sheetVec('compiler-all-revealed', B.revealAll(compArr)),
    sheetVec('compiler-glowcore-revealed', new Set([k3(1, 2, 0)])),
    sheetVec('compiler-nothing-revealed', new Set()),
  ],
  reject: [],
}
const okSheet = sheets.accept[1]
const rejectSheet = (name, reason, mod) => {
  const s = mod(JSON.parse(JSON.stringify({ size: okSheet.size, pal: okSheet.pal, cells: okSheet.cells })))
  let err = null
  try { B.readSheetShape(s) } catch (e) { err = e.message }
  check(err, `sheet ${name} must be rejected`)
  sheets.reject.push({ name, reason, sheet: s })
}
rejectSheet('runs-short', 'the runs expand to one cell fewer than the box holds', (s) => { const n = s.size.x * s.size.y * s.size.z; s.cells = B.toRuns(B.expandRuns(s.cells, n, s.pal.length).slice(0, n - 1)); return s })
rejectSheet('runs-start-repeat', 'the runs start with a repeat', (s) => { s.cells = [-1, ...s.cells]; return s })
rejectSheet('unused-palette-id', 'the palette names Gridstone (1), which no cell uses: it would leak a hidden kind', (s) => { s.pal = [...s.pal, 1]; return s })
rejectSheet('not-tight', 'the box is one cell wider along X than its cells: no cell is occupied at x = 3', (s) => {
  const { x: sx, y: sy, z: sz } = s.size
  const vals = B.expandRuns(s.cells, sx * sy * sz, s.pal.length); const out = []
  for (let y = 0; y < sy; y++) for (let z = 0; z < sz; z++) { for (let x = 0; x < sx; x++) out.push(vals[x + sx * (z + sz * y)]); out.push(0) }
  s.size = { x: sx + 1, y: sy, z: sz }; s.cells = B.toRuns(out); return s
})
rejectSheet('not-connected', 'two occupied cells with a gap between them, (0,0,0) and (2,0,0)', (s) => { s.size = { x: 3, y: 1, z: 1 }; s.pal = [0, null]; s.cells = [1, 0, 1]; return s })
rejectSheet('side-17', 'a side of 17 cells', (s) => { s.size = { x: 17, y: 1, z: 1 }; s.pal = [null]; s.cells = [0, -16]; return s })

// ---------- record, card ----------
const creatorSk = skOf('blueprint creator'), finderSk = skOf('blueprint finder')
const followSk = skOf('blueprint follow'), strangerSk = skOf('blueprint stranger'), stranger2Sk = skOf('blueprint stranger 2'), mutedSk = skOf('blueprint muted')
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
const prizeSno = {
  type: 'sno',
  payload: { v: 2, name: 'Little prism', unit: 0, mode: 'solid', vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]], colors: [8, 8, 8, 8], faces: [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]] },
}
const compKey = unhexKey(byName.compiler.key)
function unhexKey(h) { return new Uint8Array(Buffer.from(h, 'hex')) }
function recordOf(label, sk, lookup, key, sheet, prize, createdAt, title, extraTags = []) {
  const nonce = nonceOf(label)
  const payload = B.sealPrize(key, prize, nonce)
  return {
    nonce: hex(nonce), payload,
    event: sign({ kind: B.RECORD_KIND, created_at: createdAt, content: JSON.stringify(sheet), tags: [
      ['d', lookup], ['version', '1'], ['encrypted', 'aes-256-gcm', payload, B.PRIZE_MARK], ['title', title],
      ['alt', 'A Cyberspace blueprint. Build it to find out what it makes: https://onosendai.tech'], ...extraTags,
    ] }, sk),
  }
}
const sheetGlow = { size: okSheet.size, pal: okSheet.pal, cells: okSheet.cells, lock: 'standard', prize: { reveal: 'description', text: 'A small prism that catches the light.' } }
const rec = recordOf('record', creatorSk, byName.compiler.lookup, compKey, sheetGlow, prizeSno, T0, 'First prism')
check(B.checkRecord(rec.event) === null, 'record valid')
check(JSON.stringify(B.openPrize(compKey, rec.payload)) === JSON.stringify(prizeSno), 'prize opens')
check(B.openPrize(unhexKey(byName['compiler-upside-down'].key), rec.payload) === null, 'prize does not open with another key')
check(B.arrangementFitsSheet(compArr, sheetGlow), 'arrangement fits sheet')

const locKey = unhexKey(location.h5.key)
const sheetLoc = { ...sheetGlow, lock: 'location', height: 5, prize: { reveal: 'silhouette', name: 'Little prism', views: { iso: PNG, y: PNG } } }
const recLoc = recordOf('record location', creatorSk, location.h5.lookup, locKey, sheetLoc, prizeSno, T0 + 60, 'Prism of the origin')
check(B.checkRecord(recLoc.event) === null, 'location record valid')
check(Object.values(sheetLoc.prize.views).every(B.viewOk), 'location record views are well formed')
check(JSON.stringify(B.openPrize(locKey, recLoc.payload)) === JSON.stringify(prizeSno), 'location prize opens')
check(B.openPrize(compKey, recLoc.payload) === null, 'location prize does not open with the standard key')

const rejects = []
const rejectRecord = (name, reason, mod) => {
  const base = JSON.parse(JSON.stringify(rec.event)); delete base.id; delete base.sig; delete base.pubkey
  const ev = sign(mod(base), creatorSk)
  const why = B.checkRecord(ev)
  check(why, `record ${name} must be dropped`)
  rejects.push(B.serializedLength(ev) > 20000
    ? { name, reason, check_failed: why, serialized_length: B.serializedLength(ev), event_sha256: hex(sha(JSON.stringify(ev))), note: 'too long to print; build it by adding a 99,000-character field to the standard record\'s prize object' }
    : { name, reason, check_failed: why, event: ev })
}
const setTag = (ev, name, tag) => { ev.tags = ev.tags.filter((t) => t[0] !== name); if (tag) ev.tags.push(tag); return ev }
rejectRecord('no-version', 'no version tag (§5.4 check 3)', (e) => setTag(e, 'version'))
rejectRecord('version-2', 'a version this reader does not know', (e) => setTag(e, 'version', ['version', '2']))
rejectRecord('C-tag', 'a C tag: a record says nothing about where it may be built', (e) => { e.tags.push(['C', '00'.repeat(32)]); return e })
rejectRecord('wrong-mark', 'the encrypted tag names a key service instead of cyberspace:blueprint', (e) => { e.tags = e.tags.map((t) => t[0] === 'encrypted' ? [t[0], t[1], t[2], 'https://example.com/key'] : t); return e })
rejectRecord('hidden-with-text', 'prize reveal hidden, but text is present', (e) => { const s = JSON.parse(e.content); s.prize = { reveal: 'hidden', text: 'x' }; e.content = JSON.stringify(s); return e })
rejectRecord('prize-name-too-long', 'a prize name of 65 characters', (e) => { const s = JSON.parse(e.content); s.prize.name = 'x'.repeat(65); e.content = JSON.stringify(s); return e })
rejectRecord('location-without-height', 'lock location with no height', (e) => { const s = JSON.parse(e.content); s.lock = 'location'; e.content = JSON.stringify(s); return e })
rejectRecord('unused-palette-id', 'the palette names an id no cell uses', (e) => { const s = JSON.parse(e.content); s.pal = [...s.pal, 1]; e.content = JSON.stringify(s); return e })
rejectRecord('client-tag', 'a client tag: a record carries no tag but those of §5.1', (e) => { e.tags.push(['client', 'somewhere']); return e })
rejectRecord('title-extra-element', 'a title tag with a third element', (e) => setTag(e, 'title', ['title', 'First prism', 'en']))
rejectRecord('unknown-sheet-field', 'a sheet field §5.3 does not list', (e) => { const s = JSON.parse(e.content); s.note = 'hello'; e.content = JSON.stringify(s); return e })
rejectRecord('unknown-prize-field', 'a prize field §5.3 does not list', (e) => { const s = JSON.parse(e.content); s.prize.colour = 'red'; e.content = JSON.stringify(s); return e })
rejectRecord('needless-escape', 'content writes "standard" as "\\u0073tandard": it parses the same but is not written plainly (§5.3)', (e) => { e.content = e.content.replace('"standard"', '"\\u0073tandard"'); return e })
rejectRecord('whitespace', 'content has a space after a colon: not written plainly', (e) => { e.content = e.content.replace('"lock":', '"lock": '); return e })
rejectRecord('control-character', 'a tab in the title (free text holds no control characters)', (e) => setTag(e, 'title', ['title', 'First\tprism']))
rejectRecord('empty-prize-name', 'a prize name that is empty after trimming: fails, it is not ignored', (e) => { const s = JSON.parse(e.content); s.prize.name = '   '; e.content = JSON.stringify(s); return e })
rejectRecord('too-large', 'over 98,304 bytes serialized (§5.2)', (e) => { const s = JSON.parse(e.content); s.prize.pad = 'x'.repeat(99000); e.content = JSON.stringify(s); return e })

const cardOf = (sk, record, coord) => sign({ kind: B.CARD_KIND, created_at: T0 + 3600, content: B.canonicalRecord(record), tags: [['C', coord], ['-']] }, sk)
const coordA = '0'.repeat(63) + '0', coordB = '0'.repeat(62) + '10'
const card = cardOf(creatorSk, rec.event, coordA)
const copy = cardOf(finderSk, rec.event, coordB)
check(JSON.parse(copy.content).sig === rec.event.sig, 'copy keeps the record unchanged')
const altered = JSON.parse(JSON.stringify(rec.event)); altered.tags = altered.tags.map((t) => t[0] === 'title' ? ['title', 'Mine now'] : t)
const badCard = cardOf(finderSk, altered, coordB)
check(!verifyEvent(JSON.parse(badCard.content)), 'altered record does not verify')
check(B.readCard(card).record && B.readCard(copy).record, 'cards read')
const loose = JSON.stringify(rec.event)   // the fields in the order the signer built them, not the canonical order
check(loose !== B.canonicalRecord(rec.event), 'loose order differs')
const looseCard = sign({ kind: B.CARD_KIND, created_at: T0 + 3600, content: loose, tags: [['C', coordB], ['-']] }, finderSk)
check(B.readCard(looseCard).error === 'content not canonical', 'non-canonical card dropped')

// ---------- size bounds (§5.2, §10) ----------
function sizeBounds() {
  const ser = B.canonicalRecord
  const Q = (n) => '"'.repeat(n), F = (n) => 'f'.repeat(n)
  const view = 'data:image/png;base64,' + 'A'.repeat(B.VIEW_MAX_CHARS - 22)
  const pal = [0, null]; for (let i = 1; pal.length < 256; i++) pal.push(i)
  const sheet = { size: { x: 16, y: 16, z: 16 }, pal, cells: [0, -4095], lock: 'location', height: 85,
    prize: { reveal: 'render', text: Q(280), name: Q(64), views: { x: view, y: view, z: view, iso: view } } }
  const recAt = (n, quotes) => ({ id: F(64), pubkey: F(64), created_at: 9999999999, kind: B.RECORD_KIND,
    tags: [['d', F(64)], ['version', '1'], ['encrypted', 'aes-256-gcm', 'A'.repeat(n), B.PRIZE_MARK], ['title', quotes ? Q(64) : 'a'.repeat(64)], ['alt', quotes ? Q(280) : 'a'.repeat(280)], ['no-broadcast']],
    content: JSON.stringify(quotes ? sheet : { ...sheet, prize: { ...sheet.prize, text: 'a'.repeat(280), name: 'a'.repeat(64) } }), sig: F(128) })
  let lo = 0, hi = 200000
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (Buffer.byteLength(ser(recAt(m, true))) <= B.RECORD_MAX_BYTES) lo = m; else hi = m - 1 }
  const R = ser(recAt(lo, true))
  const esc = (str) => [...str].filter((c) => c === '"' || c === '\\').length
  const structural = esc(ser(recAt(lo, false)))
  const cardEv = { id: F(64), pubkey: F(64), created_at: 9999999999, kind: B.CARD_KIND, tags: [['C', F(64)], ['-'], ['d', F(64)]], content: R, sig: F(128) }
  const C = Buffer.byteLength(JSON.stringify(cardEv))
  const sealedB64 = 4 * Math.ceil((12 + C + 16) / 3)
  const preview = 'This is hidden at a place in cyberspace. Find it with ONOSENDAI: https://onosendai.tech'
  const se = { id: F(64), pubkey: F(64), created_at: 9999999999, kind: 33335, tags: [['d', F(32)], ['encrypted', 'aes-256-gcm', 'A'.repeat(sealedB64), 'cyberspace:region'], ['alt', preview]], content: preview, sig: F(128) }
  const out = {
    note: 'The worst case of §5.2 and §10: every tag and field present, a full palette, four views of 16,384 characters, all free text made of quotation marks, and the prize payload padded until the record is exactly at the cap. Placeholder values stand in for ids, keys and signatures, which have fixed lengths.',
    record_bytes: Buffer.byteLength(R), structural_escapes: structural, escapes: esc(R), card_bytes: C, card_own_fields: C - Buffer.byteLength(R) - esc(R),
    chest_room_left: 131072 - Buffer.byteLength(JSON.stringify([cardEv])), sealed_entry_bytes: Buffer.byteLength(JSON.stringify(se)),
    relay_worst_bytes: Buffer.byteLength(R) + 8 * (64 + 280 + 280 + 64),
  }
  check(out.record_bytes === 98304 && out.structural_escapes === 148 && out.escapes === 2212 && out.card_own_fields === 496 && out.card_bytes === 101012 && out.chest_room_left === 30058, 'size bounds as §5.2 says')
  check(out.sealed_entry_bytes === 135342 && out.sealed_entry_bytes <= 240000 && out.relay_worst_bytes === 103808, 'sealed entry and relay bounds as §5.2 and §10 say')
  return out
}
const sizeBoundsOut = sizeBounds()

// ---------- rank ----------
const reader = { pubkey: getPublicKey(followSk) }
const P = (sk) => getPublicKey(sk)
const viewer = { pubkey: P(skOf('blueprint reader')), follows: new Set([P(followSk)]), mutes: new Set([P(mutedSk)]) }
const mk = (label, sk, t) => recordOf(label, sk, byName.compiler.lookup, compKey, sheetGlow, prizeSno, t, label).event
const readerOwn = mk('rank reader', skOf('blueprint reader'), T0 + 1)
const pool = [
  mk('rank stranger old', strangerSk, T0 + 10), mk('rank stranger new', stranger2Sk, T0 + 30),
  mk('rank follow', followSk, T0 + 5), mk('rank muted', mutedSk, T0 + 99), readerOwn,
  mk('rank stranger newer version', strangerSk, T0 + 40),
]
const ranked = B.rankRecords(pool, viewer)
check(ranked.length === 4, 'rank keeps 4 after mute and dedupe')
check(ranked[0].id === readerOwn.id, 'reader first')
void reader

const out = {
  note: 'Deterministic vectors for DECK-0010. Keys are SHA-256("cyberspace vectors: <label>"); AES-GCM nonces are the first 12 bytes of SHA-256("cyberspace vectors nonce: <label>"); BIP-340 aux randomness is 32 zero bytes. Readers MUST accept any valid signature. Cells are [x, y, z, id]. Not normative: where this file and the DECK disagree, the DECK is right.',
  constants: {
    domain: B.DOMAIN, domain_hex: hex(B.DOMAIN_BYTES), salt_hex: hex(B.DOMAIN_BYTES), rounds: B.ITERATIONS, key_bytes: B.KEY_BYTES,
    reach_compiler: B.REACH_COMPILER, reach_bare: B.REACH_BARE, max_side: B.MAX_SIDE, record_max_bytes: B.RECORD_MAX_BYTES,
    record_kind: B.RECORD_KIND, card_kind: B.CARD_KIND, prize_mark: B.PRIZE_MARK,
  },
  arrangements,
  location,
  gather: gatherCases,
  sheets,
  record: {
    keys: { creator: P(creatorSk), finder: P(finderSk) },
    standard: { sheet: sheetGlow, prize: prizeSno, key: byName.compiler.key, nonce: rec.nonce, serialized_length: B.serializedLength(rec.event), event: rec.event, opens_with_key: true, opens_with_compiler_upside_down_key: false },
    location: { sheet: sheetLoc, key: location.h5.key, nonce: recLoc.nonce, event: recLoc.event, opens_with_standard_key: false },
    reject: rejects,
  },
  card: {
    by_creator: { note: 'A card left by the creator: shown "by" the creator, with no "left here by".', event: card },
    copy_by_finder: { note: 'A copy left by the finder (§7.5): a new card signed by the finder, carrying the same record (same id and sig). Shown "by" the creator, "left here by" the finder when the container carries the finder\'s signature.', event: copy },
    reject_altered: { note: 'A card whose record had its title changed: the record no longer verifies, and a reader drops the card.', event: badCard },
    reject_not_canonical: { note: 'A card whose content is the right record, signature and all, but serialized with its fields in another order: not the canonical serialization (§5.2), so a reader drops the card (§7.2 step 2).', event: looseCard },
  },
  size_bounds: sizeBoundsOut,
  rank: {
    reader: viewer.pubkey, follows: [...viewer.follows], mutes: [...viewer.mutes],
    records: pool.map((r) => ({ id: r.id, pubkey: r.pubkey, created_at: r.created_at, title: r.tags.find((t) => t[0] === 'title')[1] })),
    order: ranked.map((r) => r.id),
    note: 'The reader\'s own record, then the follow, then strangers newest first; the stranger\'s older version and the muted creator are gone. Every remaining record is kept (§6.1).',
  },
}
process.stdout.write(JSON.stringify(out, null, 2) + '\n')
