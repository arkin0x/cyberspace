// Reference implementation of DECK-0010 (Blueprints): gathering the arrangement a smash takes, the
// isolation check, the encoding, the key and the lookup, the location lock, the public sheet of a
// record, and the sealed prize.
//
// Node 18 or later, no dependencies beyond node:crypto. Signing and verifying events (the record,
// kind 33343, and the card, kind 3343) need BIP-340, which node:crypto does not have; the vectors
// generator, blueprints-vectors.mjs, uses nostr-tools to sign them. Where this file and the DECK disagree,
// the DECK is right and this file is a bug.
import { createHash, pbkdf2Sync, createCipheriv, createDecipheriv } from 'node:crypto'

const enc = new TextEncoder()

// ---------- constants (DECK-0010 §3, §4, §5, §6) ----------
export const DOMAIN = 'CYBERSPACE_BLUEPRINT_V1'   // the domain label and version, 23 ASCII bytes
export const DOMAIN_BYTES = enc.encode(DOMAIN)
export const ITERATIONS = 500000                   // PBKDF2 rounds, fixed by the version
export const KEY_BYTES = 32
export const MAX_SIDE = 16                         // the most cells a box has on one axis
export const REACH_COMPILER = 16                   // the reach N of a smash with the Compiler (§4.1)
export const REACH_BARE = 3                        // and with a bare hand (§8.2)
export const RECORD_KIND = 33343
export const CARD_KIND = 3343
export const RECORD_MAX_BYTES = 98304
export const TITLE_MAX = 64
export const TEXT_MAX = 280
export const VIEW_MAX_CHARS = 16384
export const VIEWS = ['x', 'y', 'z', 'iso']
export const REVEALS = ['hidden', 'description', 'silhouette', 'render']
export const PRIZE_MARK = 'cyberspace:blueprint'
export const TOOLS = ['compiler', 'quarry-charge']
export const AXIS_BITS = 85n
export const AXIS_MASK = (1n << AXIS_BITS) - 1n

// The Compiler's recipe (DECK-0010 §8.3, owner 2026-11-27): an upright T hammer in a box 3 (X) by 3 (Y)
// by 1 (Z). Two Ferrovein (40) are the handle; Rustband (5), Glowcore (42), Rustband (5) are the head.
// Cells are [x, y, z, id] relative to the box's lowest corner.
export const COMPILER_RECIPE = [
  [1, 0, 0, 40], [1, 1, 0, 40],
  [0, 2, 0, 5], [1, 2, 0, 42], [2, 2, 0, 5],
]

// The Quarry Charge's recipe (DECK-0010 §8.5, owner 2026-11-27): a cross of seven in a 3 by 3 by 3 box.
// Umberslate (2) below and above a Ferrovein (40); Rustband (5) on -X, -Z and +Z; Cinderrock (7) on +X.
export const QUARRY_CHARGE_RECIPE = [
  [1, 0, 1, 2],
  [1, 1, 0, 5], [0, 1, 1, 5], [1, 1, 1, 40], [2, 1, 1, 7], [1, 1, 2, 5],
  [1, 2, 1, 2],
]
// The game recipes (§8.4): the only blueprints whose prize may be a tool.
export const GAME_RECIPES = [
  { name: 'compiler', cells: COMPILER_RECIPE, prize: { type: 'tool', tool: 'compiler' } },
  { name: 'quarry-charge', cells: QUARRY_CHARGE_RECIPE, prize: { type: 'tool', tool: 'quarry-charge', count: 7 } },
]

// ---------- primitives ----------
export function sha256(...parts) {
  const h = createHash('sha256')
  for (const p of parts) h.update(p)
  return new Uint8Array(h.digest())
}
export const hex = (b) => Buffer.from(b).toString('hex')
export const unhex = (s) => new Uint8Array(Buffer.from(s, 'hex'))
const k3 = (x, y, z) => `${x},${y},${z}`

// ---------- the arrangement (DECK-0010 §3.1 to §3.3) ----------
// An arrangement is { size: {x, y, z}, cells: [[x, y, z, id], ...] } with every cell inside the box,
// every id from 1 to 65535, and no cell given twice. Cells of the box that it does not list are empty.
export function arrangementFrom(cells) {
  let mx = Infinity, my = Infinity, mz = Infinity, Mx = -Infinity, My = -Infinity, Mz = -Infinity
  for (const [x, y, z] of cells) {
    mx = Math.min(mx, x); my = Math.min(my, y); mz = Math.min(mz, z)
    Mx = Math.max(Mx, x); My = Math.max(My, y); Mz = Math.max(Mz, z)
  }
  const size = { x: Mx - mx + 1, y: My - my + 1, z: Mz - mz + 1 }
  const rel = cells.map(([x, y, z, id]) => [x - mx, y - my, z - mz, id])
  return { size, cells: rel, origin: { x: mx, y: my, z: mz } }
}

// Scan order: Y outermost, then Z, then X fastest. index = x + sx * (z + sz * y).
export const scanIndex = (size, x, y, z) => x + size.x * (z + size.z * y)

export function scanIds(arr) {
  const { size } = arr
  const n = size.x * size.y * size.z
  const ids = new Array(n).fill(0)
  for (const [x, y, z, id] of arr.cells) ids[scanIndex(size, x, y, z)] = id
  return ids
}

// The encoding (§3.3): DOMAIN || sx || sz || sy || two bytes per cell, big-endian, in scan order,
// then, for a location lock only, the 32-byte region key.
export function encodeArrangement(arr, regionKey = null) {
  const { size } = arr
  for (const a of ['x', 'y', 'z']) {
    if (!Number.isInteger(size[a]) || size[a] < 1 || size[a] > MAX_SIDE) throw new Error(`box side ${a} out of range`)
  }
  if (regionKey && regionKey.length !== 32) throw new Error('region key must be 32 bytes')
  const ids = scanIds(arr)
  const out = new Uint8Array(DOMAIN_BYTES.length + 3 + 2 * ids.length + (regionKey ? 32 : 0))
  let o = 0
  out.set(DOMAIN_BYTES, o); o += DOMAIN_BYTES.length
  out[o++] = size.x; out[o++] = size.z; out[o++] = size.y
  for (const id of ids) {
    if (!Number.isInteger(id) || id < 0 || id > 65535) throw new Error('block id out of range')
    out[o++] = id >> 8; out[o++] = id & 0xff
  }
  if (regionKey) out.set(regionKey, o)
  return out
}

// The key and the lookup (§3.4).
export const arrangementKey = (encoding) => new Uint8Array(pbkdf2Sync(encoding, DOMAIN_BYTES, ITERATIONS, KEY_BYTES, 'sha256'))
export const lookupOf = (key) => hex(sha256(key))

// ---------- gathering (§4) ----------
// world: a Map from "x,y,z" to a nonzero block id: every occupied cell the smasher's client resolves
// near the hit, in one plane (DECK-0009 §7, plus unpublished changes). Coordinates are plain integers
// here; a client works modulo 2^85 on each axis.
// Gathering (§4.1, §4.2). bare = true is a bare-hand smash. N is the reach; the window is the hit's
// minus (N - 1) to plus (N - 1) on each axis, (2N - 1) cells, the hit at its centre. The group is the
// arrangement when it is isolated (no other block touches it) and at most N cells on every axis,
// whichever of its cells was struck.
export function gather(world, hit, bare = false) {
  const [hx, hy, hz] = hit
  if (!world.get(k3(hx, hy, hz))) throw new Error('the hit cell is empty')
  const N = bare ? REACH_BARE : REACH_COMPILER, r = N - 1
  const inWindow = (x, y, z) =>
    x >= hx - r && x <= hx + r && y >= hy - r && y <= hy + r && z >= hz - r && z <= hz + r
  const seen = new Set([k3(hx, hy, hz)])
  const queue = [[hx, hy, hz]]
  const group = []
  while (queue.length) {
    const [x, y, z] = queue.shift()
    group.push([x, y, z, world.get(k3(x, y, z))])
    for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy && !dz) continue
      const nx = x + dx, ny = y + dy, nz = z + dz, key = k3(nx, ny, nz)
      if (seen.has(key) || !inWindow(nx, ny, nz) || !world.get(key)) continue
      seen.add(key); queue.push([nx, ny, nz])
    }
  }
  group.sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[0] - b[0])
  let mx = Infinity, my = Infinity, mz = Infinity, Mx = -Infinity, My = -Infinity, Mz = -Infinity
  for (const [x, y, z] of group) {
    mx = Math.min(mx, x); my = Math.min(my, y); mz = Math.min(mz, z); Mx = Math.max(Mx, x); My = Math.max(My, y); Mz = Math.max(Mz, z)
  }
  const extent = { x: Mx - mx + 1, y: My - my + 1, z: Mz - mz + 1 }
  // Isolation (§4.2): no block outside the group touches a block of the group through a face, an edge or a
  // corner. Inside the window the group already holds every block that touches it, so an intruder is always
  // just outside the window. A block near the group that touches none of its blocks does not matter.
  const members = new Set(group.map(([x, y, z]) => k3(x, y, z)))
  const seenI = new Set(), intruders = []
  for (const [x, y, z] of group) {
    for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy, nz = z + dz, key = k3(nx, ny, nz)
      if (members.has(key) || seenI.has(key) || !world.get(key)) continue
      seenI.add(key); intruders.push([nx, ny, nz])
    }
  }
  intruders.sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[0] - b[0])
  const isolated = intruders.length === 0
  const fits = extent.x <= N && extent.y <= N && extent.z <= N
  return { reach: N, group, extent, isolated, intruders, fits, arrangement: isolated && fits ? arrangementFrom(group) : null }
}

// ---------- regions, for the location lock (CYBERSPACE_V2.md §4.6, §4.7, §7.2) ----------
const cantorPair = (a, b) => { const s = a + b; return (s * (s + 1n)) / 2n + b }
export function subtreeCantor(base, h) {
  let v = []
  for (let i = 0n; i < (1n << BigInt(h)); i++) v.push(base + i)
  for (let l = 0; l < h; l++) { const n = []; for (let i = 0; i < v.length; i += 2) n.push(cantorPair(v[i], v[i + 1])); v = n }
  return v[0]
}
function intToBytesBeMin(n) {
  if (n === 0n) return new Uint8Array([0])
  let s = n.toString(16); if (s.length % 2) s = '0' + s
  return unhex(s)
}
// The aligned region of height h holding the cell (x, y, z) (BigInts); its key is plane-free.
export function regionOf(x, y, z, h) {
  const H = BigInt(h)
  const X = (x >> H) << H, Y = (y >> H) << H, Z = (z >> H) << H
  const regionN = cantorPair(cantorPair(subtreeCantor(X, h), subtreeCantor(Y, h)), subtreeCantor(Z, h))
  const key = sha256(intToBytesBeMin(regionN))
  return { base: { X, Y, Z }, h, regionN, key, lookupId: hex(sha256(key)) }
}
// The region of height h that holds the whole box, or null when the box straddles a region border
// (§3.5). lo and hi are the box's lowest and highest cells, as BigInts.
export function regionHoldingBox(lo, hi, h) {
  const a = regionOf(lo.x, lo.y, lo.z, h), b = regionOf(hi.x, hi.y, hi.z, h)
  return a.base.X === b.base.X && a.base.Y === b.base.Y && a.base.Z === b.base.Z ? a : null
}

// ---------- the public sheet (§5.3) ----------
// Runs arrays (DECK-0003 §1.4a): a non-negative entry is a value, -N means N more copies of the
// value before it.
export function toRuns(values) {
  const out = []
  for (let i = 0; i < values.length;) {
    let j = i + 1
    while (j < values.length && values[j] === values[i]) j++
    out.push(values[i]); if (j - i > 1) out.push(-(j - i - 1))
    i = j
  }
  return out
}
export function expandRuns(runs, length, palLength) {
  if (!Array.isArray(runs) || !runs.length) throw new Error('runs: empty')
  const out = []
  for (const e of runs) {
    if (!Number.isInteger(e) || Object.is(e, -0)) throw new Error('runs: not an integer')
    if (e >= 0) {
      if (e >= palLength) throw new Error('runs: index past the palette')
      if (out.length + 1 > length) throw new Error('runs: too long')
      out.push(e)
    } else {
      if (!out.length) throw new Error('runs: starts with a repeat')
      if (out.length - e > length) throw new Error('runs: too long')
      const v = out[out.length - 1]
      for (let i = 0; i < -e; i++) out.push(v)
    }
  }
  if (out.length !== length) throw new Error('runs: too short')
  return out
}

// The recipe reveal: `revealed` is a Set of "x,y,z" (box-relative) cells whose ids the sheet shows.
// Palette order: 0 (if any cell is empty), null (if any cell is hidden), then revealed ids ascending.
export function makeSheetShape(arr, revealed) {
  const ids = scanIds(arr)
  const { size } = arr
  const vals = []
  for (let y = 0; y < size.y; y++) for (let z = 0; z < size.z; z++) for (let x = 0; x < size.x; x++) {
    const id = ids[scanIndex(size, x, y, z)]
    vals.push(id === 0 ? 0 : revealed.has(k3(x, y, z)) ? id : null)
  }
  const shown = [...new Set(vals.filter((v) => v !== null && v !== 0))].sort((a, b) => a - b)
  const pal = [...(vals.includes(0) ? [0] : []), ...(vals.includes(null) ? [null] : []), ...shown]
  const idx = new Map(pal.map((v, i) => [v, i]))
  return { size: { ...size }, pal, cells: toRuns(vals.map((v) => idx.get(v))) }
}
export const revealAll = (arr) => new Set(arr.cells.map(([x, y, z]) => k3(x, y, z)))

// Reads a sheet's shape back: per scan cell, 0 empty, null hidden, or the revealed id. Throws on a
// malformed shape (§5.4, checks 6 to 9).
export function readSheetShape(sheet) {
  const { size, pal, cells } = sheet
  for (const a of ['x', 'y', 'z']) if (!Number.isInteger(size?.[a]) || size[a] < 1 || size[a] > MAX_SIDE) throw new Error('size')
  if (!Array.isArray(pal) || pal.length < 1 || pal.length > 256) throw new Error('pal')
  for (const v of pal) if (v !== null && !(Number.isInteger(v) && v >= 0 && v <= 65535)) throw new Error('pal entry')
  if (new Set(pal.map(String)).size !== pal.length) throw new Error('pal repeats an entry')
  const n = size.x * size.y * size.z
  const vals = expandRuns(cells, n, pal.length).map((i) => pal[i])
  const used = new Set(vals.map(String))
  for (const v of pal) if (!used.has(String(v))) throw new Error('pal names a value no cell uses')
  const occ = []
  for (let y = 0; y < size.y; y++) for (let z = 0; z < size.z; z++) for (let x = 0; x < size.x; x++) {
    if (vals[scanIndex(size, x, y, z)] !== 0) occ.push([x, y, z])
  }
  if (!occ.length) throw new Error('no occupied cell')
  // Tight: every face of the box holds an occupied cell.
  const tight = ['x', 'y', 'z'].every((a, i) => occ.some((c) => c[i] === 0) && occ.some((c) => c[i] === size[a] - 1))
  if (!tight) throw new Error('box not tight')
  // Connected through faces, edges and corners.
  const set = new Set(occ.map((c) => k3(...c)))
  const seen = new Set([k3(...occ[0])]); const q = [occ[0]]
  while (q.length) {
    const [x, y, z] = q.shift()
    for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const key = k3(x + dx, y + dy, z + dz)
      if (set.has(key) && !seen.has(key)) { seen.add(key); q.push([x + dx, y + dy, z + dz]) }
    }
  }
  if (seen.size !== occ.length) throw new Error('shape not connected')
  return vals
}

// Does an arrangement agree with a sheet? (Every occupied cell where the sheet has one, every revealed
// id equal.) A client that has unsealed a prize MAY use this to tell its user the hints were true.
export function arrangementFitsSheet(arr, sheet) {
  const vals = readSheetShape(sheet)
  if (arr.size.x !== sheet.size.x || arr.size.y !== sheet.size.y || arr.size.z !== sheet.size.z) return false
  const ids = scanIds(arr)
  return ids.every((id, i) => (id === 0 ? vals[i] === 0 : vals[i] === null || vals[i] === id))
}

// ---------- the prize (§5.5) ----------
// AES-256-GCM under the arrangement's key: nonce(12) || ciphertext || tag(16), standard base64.
export function sealPrize(key, prize, nonce) {
  const c = createCipheriv('aes-256-gcm', key, nonce)
  const ct = Buffer.concat([c.update(Buffer.from(JSON.stringify(prize), 'utf8')), c.final()])
  return Buffer.concat([Buffer.from(nonce), ct, c.getAuthTag()]).toString('base64')
}
export function openPrize(key, payload) {
  const b = Buffer.from(payload, 'base64')
  if (b.length < 28) return null
  try {
    const d = createDecipheriv('aes-256-gcm', key, b.subarray(0, 12))
    d.setAuthTag(b.subarray(b.length - 16))
    const pt = Buffer.concat([d.update(b.subarray(12, b.length - 16)), d.final()])
    return JSON.parse(pt.toString('utf8'))
  } catch { return null }
}

// ---------- the record's own checks (§5.4), apart from id and signature ----------
const HEX64 = /^[0-9a-f]{64}$/
const DATA_URI = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/
export function serializedLength(ev) {
  return Buffer.byteLength(JSON.stringify({ id: ev.id, pubkey: ev.pubkey, created_at: ev.created_at, kind: ev.kind, tags: ev.tags, content: ev.content, sig: ev.sig }), 'utf8')
}
export const RECORD_TAGS = { d: 2, version: 2, encrypted: 4, title: 2, alt: 2, 'no-broadcast': 1 }
const SHEET_FIELDS = ['size', 'pal', 'cells', 'lock', 'height', 'prize']
const SIZE_FIELDS = ['x', 'y', 'z']
const PRIZE_FIELDS = ['reveal', 'text', 'name', 'views']
// Free text holds no control character (U+0000..U+001F, U+007F) and no lone surrogate (§5.3).
const BAD_TEXT = /[\u0000-\u001f\u007f]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/
export const freeTextOk = (s) => typeof s === 'string' && !BAD_TEXT.test(s)
// The canonical serialization (§5.2): what a card's content must be, byte for byte.
export const canonicalRecord = (ev) => JSON.stringify({ id: ev.id, pubkey: ev.pubkey, created_at: ev.created_at, kind: ev.kind, tags: ev.tags, content: ev.content, sig: ev.sig })
export function checkRecord(ev) {
  if (ev.kind !== RECORD_KIND) return 'kind'
  if (serializedLength(ev) > RECORD_MAX_BYTES) return 'too large'
  const seen = new Set()
  for (const t of ev.tags) {
    if (!Array.isArray(t) || !(t[0] in RECORD_TAGS)) return `unknown tag ${Array.isArray(t) ? t[0] : ''}`
    if (seen.has(t[0])) return `tag ${t[0]} twice`
    if (t.length !== RECORD_TAGS[t[0]] || t.some((x) => typeof x !== 'string')) return `tag ${t[0]} elements`
    seen.add(t[0])
  }
  const tag = (n) => ev.tags.find((t) => t[0] === n)
  const d = tag('d'), v = tag('version'), e = tag('encrypted'), ti = tag('title'), alt = tag('alt')
  if (!d || !HEX64.test(d[1])) return 'd'
  if (!v || v[1] !== '1') return 'version'
  if (!e || e[1] !== 'aes-256-gcm' || e[3] !== PRIZE_MARK) return 'encrypted'
  if (ti && [...ti[1]].length > TITLE_MAX) return 'title'
  if (alt && Buffer.byteLength(alt[1], 'utf8') > TEXT_MAX) return 'alt'
  let sheet
  try { sheet = JSON.parse(ev.content) } catch { return 'content' }
  if (!sheet || typeof sheet !== 'object' || Array.isArray(sheet)) return 'content'
  if (Object.keys(sheet).some((k) => !SHEET_FIELDS.includes(k))) return 'unknown sheet field'
  if (sheet.size && typeof sheet.size === 'object' && Object.keys(sheet.size).some((k) => !SIZE_FIELDS.includes(k))) return 'unknown size field'
  if (sheet.prize && typeof sheet.prize === 'object' && Object.keys(sheet.prize).some((k) => !PRIZE_FIELDS.includes(k))) return 'unknown prize field'
  // Written plainly: compact, fields in their order, no escape but \" and \\.
  if (JSON.stringify(sheet) !== ev.content) return 'content not written plainly'
  for (const s of [ti?.[1], alt?.[1], sheet.prize?.text, sheet.prize?.name]) if (s !== undefined && !freeTextOk(s)) return 'free text'
  try { readSheetShape(sheet) } catch (err) { return `shape: ${err.message}` }
  if (sheet.lock === 'location') {
    if (!Number.isInteger(sheet.height) || sheet.height < 1 || sheet.height > 85) return 'height'
  } else if (sheet.lock !== 'standard' || 'height' in sheet) return 'lock'
  const p = sheet.prize
  if (!p || !REVEALS.includes(p.reveal)) return 'prize reveal'
  if ('text' in p && (typeof p.text !== 'string' || [...p.text].length > TEXT_MAX)) return 'prize text'
  if ('name' in p && (typeof p.name !== 'string' || [...p.name].length > TITLE_MAX || !p.name.trim())) return 'prize name'
  if (p.reveal === 'hidden' && ('text' in p || 'views' in p)) return 'hidden prize shows something'
  if (p.reveal === 'description' && (typeof p.text !== 'string' || !p.text.trim() || 'views' in p)) return 'description'
  if (p.reveal === 'silhouette' || p.reveal === 'render') {
    if (!p.views || typeof p.views !== 'object' || Array.isArray(p.views)) return 'views'
    const keys = Object.keys(p.views)
    if (!keys.length || keys.some((k) => !VIEWS.includes(k))) return 'views'
  } else if ('views' in p) return 'views'
  return null
}
// A card's own check (§7.2 step 2), apart from its signature and its record's: its content is a valid
// record's canonical serialization, byte for byte. Returns the record or a reason.
export function readCard(card) {
  let rec
  try { rec = JSON.parse(card.content) } catch { return { error: 'content' } }
  if (!rec || typeof rec !== 'object' || canonicalRecord(rec) !== card.content) return { error: 'content not canonical' }
  const why = checkRecord(rec)
  return why ? { error: why } : { record: rec }
}
// A view that breaks the picture rules is drawn as absent; it does not fail the record (§5.4 check 11).
export const viewOk = (v) => typeof v === 'string' && v.length <= VIEW_MAX_CHARS && DATA_URI.test(v)

// Reading a prize once opened (§5.5). fromGameRecipe: whether it came from the client's own copy of a
// game recipe (§8.4); a tool prize from any record a relay or a card gave is not honoured. Returns a
// short description, or null for one this reader cannot read (it still keeps it).
export function readPrize(prize, fromGameRecipe = false) {
  if (!prize || typeof prize !== 'object') return null
  if (prize.type === 'tool' && !fromGameRecipe) return null
  if (prize.type === 'sno' && prize.payload && typeof prize.payload === 'object') return { type: 'sno', name: prize.payload.name ?? null }
  if (prize.type === 'tool' && TOOLS.includes(prize.tool)) {
    const count = prize.count === undefined ? 1 : prize.count
    if (!Number.isInteger(count) || count < 1) return null
    return { type: 'tool', tool: prize.tool, count }
  }
  return null
}

// ---------- ordering several records under one lookup (§6.1, §6.2) ----------
// records: verified, valid records; reader: { pubkey, follows: Set, mutes: Set }. Every record is
// kept, in order; a client shows every prize that opens (DECK-0010 §6.1).
export function rankRecords(records, reader) {
  const rank = (r) => (r.pubkey === reader.pubkey ? 1 : reader.follows.has(r.pubkey) ? 2 : 3)
  const newest = new Map()
  for (const r of records) {
    const o = newest.get(r.pubkey)
    if (!o || r.created_at > o.created_at || (r.created_at === o.created_at && r.id < o.id)) newest.set(r.pubkey, r)
  }
  return [...newest.values()]
    .filter((r) => !reader.mutes.has(r.pubkey))
    .sort((a, b) => rank(a) - rank(b) || b.created_at - a.created_at || (a.pubkey < b.pubkey ? -1 : a.pubkey > b.pubkey ? 1 : 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}
