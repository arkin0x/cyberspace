// Reference implementation of DECK-0008 (Seeds): SEEDO parsing, growth, emission
// to SNO, terroir, mixing, the planted-height clamp and the price of a DNA's caps.
//
// It is the Seed Garden prototype's core (2026-11-09, revised 2026-11-10) with the
// changes DECK-0008 makes, each marked "DECK-0008:" below. Node 18 or later, no
// dependencies. Integers only in everything that decides geometry: no Math.random,
// no Math.sin, and no float that reaches a vertex. Where this file and the DECK
// disagree, the DECK is right and this file is a bug.
import { createHash } from 'node:crypto'

// ---------- constants (DECK-0008 §3, §4, §5, §6) ----------
export const TICK = 120          // SNO ticks per model unit (DECK-0003 §1.2)
export const STEP = 12           // one SEEDO length step: a tenth of a unit
export const ONE = 16384         // fixed point 1.0 for turtle directions
export const N = 144             // blocks per generation
export const CLOCK_DEPTH = 6     // the clock reads the block 6 below the tip
export const MIX_DELAY = 36      // a mix's outcome block is its commit height + 36
export const MIX_DEPTH_MAX = 8   // a mixed DNA is at most 8 mixes from written DNA
export const CLAMP_MARGIN = 7200 // seconds: the planted-height clamp's margin
export const LIMITS = { rules: 40, params: 4, value: 1000000, stack: 64, region: 64 }
export const TERRAIN_DOMAIN_V2 = 'CYBERSPACE_TERRAIN_K_V2'
export const TERROIR_DOMAIN = 'CYBERSPACE_SEED_TERROIR_V1'  // DECK-0008: the prototype used SEEDO_TERROIR_V1
export const MIX_DOMAIN = 'CYBERSPACE_SEED_MIX_V1'          // DECK-0008: new
export const TERRAIN_CELL_BITS = [3, 7, 9, 11]

// The price of a DNA's caps (DECK-0008 §7). Provisional numbers.
export const PRICE = {
  base: 16,
  caps: {
    vertices: { free: 2048, max: 65536 },
    symbols: { free: 2048, max: 65536 },
    generations: { free: 32, max: 1024 },
  },
}
export const BASE_CAPS = { vertices: 2048, symbols: 2048, generations: 32 }

// sin(d) * 16384 for whole degrees 0..90, rounded. Part of the language, not computed.
export const SIN = [0,286,572,857,1143,1428,1713,1997,2280,2563,2845,3126,3406,3686,3964,4240,4516,4790,5063,5334,5604,5872,6138,6402,6664,6924,7182,7438,7692,7943,8192,8438,8682,8923,9162,9397,9630,9860,10087,10311,10531,10749,10963,11174,11381,11585,11786,11982,12176,12365,12551,12733,12911,13085,13255,13421,13583,13741,13894,14044,14189,14330,14466,14598,14726,14849,14968,15082,15191,15296,15396,15491,15582,15668,15749,15826,15897,15964,16026,16083,16135,16182,16225,16262,16294,16322,16344,16362,16374,16382,16384]
export function isin(d) { d = ((d % 360) + 360) % 360; if (d <= 90) return SIN[d]; if (d <= 180) return SIN[180 - d]; if (d <= 270) return -SIN[d - 180]; return -SIN[360 - d] }
export function icos(d) { return isin(d + 90) }
export function isqrt(n) { if (n <= 0) return 0; let r = Math.floor(Math.sqrt(n)); while (r * r > n) r--; while ((r + 1) * (r + 1) <= n) r++; return r }
const fdiv = (a, b) => Math.floor(a / b)    // floor division, toward minus infinity
const clampV = (v) => v > LIMITS.value ? LIMITS.value : v < -LIMITS.value ? -LIMITS.value : v

// lowbias32 (Chris Wellons): a 32-bit integer finalizer. Unsigned in, unsigned out.
export function mix32(a) {
  a = a | 0
  a ^= a >>> 16; a = Math.imul(a, 0x7feb352d)
  a ^= a >>> 15; a = Math.imul(a, 0x846ca68b | 0)
  a ^= a >>> 16; return a >>> 0
}
// Fold 64 hex characters (a block hash as displayed, or a SHA-256) into one 32-bit word.
export function word32(hex) {
  let s = 0x811c9dc5 | 0
  for (let i = 0; i < 64; i += 8) s = mix32(s ^ parseInt(hex.slice(i, i + 8), 16))
  return s
}
export const sha256hex = (buf) => createHash('sha256').update(buf).digest('hex')

// ---------- coordinates (CYBERSPACE_V2 §2.2) and terroir (DECK-0008 §4.4) ----------
const AXIS_BITS = 85
export function coordToXYZ(hex) {
  const c = BigInt('0x' + hex); let x = 0n, y = 0n, z = 0n
  for (let i = 0; i < AXIS_BITS; i++) {
    const b = BigInt(i)
    z |= ((c >> BigInt(1 + i * 3)) & 1n) << b
    y |= ((c >> BigInt(2 + i * 3)) & 1n) << b
    x |= ((c >> BigInt(3 + i * 3)) & 1n) << b
  }
  return { x, y, z, plane: Number(c & 1n) }
}
export function xyzToCoord(x, y, z, plane) {
  let c = BigInt(plane & 1)
  for (let i = 0; i < AXIS_BITS; i++) {
    const b = BigInt(i)
    c |= ((z >> b) & 1n) << BigInt(1 + i * 3)
    c |= ((y >> b) & 1n) << BigInt(2 + i * 3)
    c |= ((x >> b) & 1n) << BigInt(3 + i * 3)
  }
  return c.toString(16).padStart(64, '0')
}
export function terroir(hex, u = 0) {
  const p = coordToXYZ(hex)
  const dom = Buffer.from(u === 0 ? TERRAIN_DOMAIN_V2 : TERROIR_DOMAIN, 'ascii')
  const nib = TERRAIN_CELL_BITS.map((b0) => {
    const bits = b0 + u, B = BigInt(bits)
    const cell = xyzToCoord((p.x >> B) << B, (p.y >> B) << B, (p.z >> B) << B, p.plane)
    const d = sha256hex(Buffer.concat([dom, Buffer.from([bits]), Buffer.from(cell, 'hex')]))
    return parseInt(d.slice(0, 2), 16) & 0x0f
  })
  const word16 = (nib[0] << 12) | (nib[1] << 8) | (nib[2] << 4) | nib[3]
  let K = 0; for (let v = word16; v; v >>= 1) K += v & 1
  return { K, n0: nib[0], n1: nib[1], n2: nib[2], n3: nib[3], pl: p.plane }
}

// ---------- expressions (DECK-0008 §3.4) ----------
export const BUILTINS = ['w', 'W', 'g', 'K', 'n0', 'n1', 'n2', 'n3', 'pl']
export const STD = [
  { name: 'size', def: 100, lo: 50, hi: 200, min: 10, max: 400 },
  { name: 'hue', def: 0, lo: 0, hi: 23, min: 0, max: 23 },
  { name: 'tone', def: 0, lo: -4, hi: 4, min: -7, max: 7 },
]
export const STD_NAMES = STD.map((g) => g.name)
export const KEYWORDS = ['and', 'or', 'not', 'if', 'chance', 'in']
const NAME_RE = /^[A-Za-z_][A-Za-z_0-9]*$/
const WS = '[\\t\\n\\v\\f\\r ]'
const trimWS = (s) => s.replace(new RegExp('^' + WS + '+|' + WS + '+$', 'g'), '')

function compileExpr(src, known, where) {
  const toks = []; const re = new RegExp(WS + '*(\\d+|[A-Za-z_][A-Za-z_0-9]*|==|!=|<=|>=|[-+*/%<>()])', 'y')
  const s = trimWS(src)
  while (re.lastIndex < s.length) { const at = re.lastIndex; const m = re.exec(s); if (!m) throw new Error(where + ': cannot read "' + s.slice(at) + '"'); toks.push(m[1]) }
  let i = 0; const peek = () => toks[i], next = () => toks[i++]
  function or() { let a = and(); while (peek() === 'or') { next(); const l = a, r = and(); a = (e) => (l(e) || r(e)) ? 1 : 0 } return a }
  function and() { let a = not(); while (peek() === 'and') { next(); const l = a, r = not(); a = (e) => (l(e) && r(e)) ? 1 : 0 } return a }
  function not() { if (peek() === 'not') { next(); const a = not(); return (e) => a(e) ? 0 : 1 } return cmp() }
  function cmp() {
    const a = add(); const op = peek()
    if (['==', '!=', '<', '<=', '>', '>='].includes(op)) {
      next(); const b = add()
      switch (op) {
        case '==': return (e) => a(e) === b(e) ? 1 : 0
        case '!=': return (e) => a(e) !== b(e) ? 1 : 0
        case '<': return (e) => a(e) < b(e) ? 1 : 0
        case '<=': return (e) => a(e) <= b(e) ? 1 : 0
        case '>': return (e) => a(e) > b(e) ? 1 : 0
        default: return (e) => a(e) >= b(e) ? 1 : 0
      }
    }
    return a
  }
  function add() { let a = mul(); while (peek() === '+' || peek() === '-') { const op = next(), l = a, r = mul(); a = op === '+' ? (e) => clampV(l(e) + r(e)) : (e) => clampV(l(e) - r(e)) } return a }
  function mul() {
    let a = un()
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = next(), l = a, r = un()
      if (op === '*') a = (e) => clampV(l(e) * r(e))
      else if (op === '/') a = (e) => { const d = r(e); return d === 0 ? 0 : Math.trunc(l(e) / d) }
      else a = (e) => { const d = r(e); if (d === 0) return 0; const v = l(e) % d; return v < 0 ? v + Math.abs(d) : v }
    }
    return a
  }
  function un() { if (peek() === '-') { next(); const a = un(); return (e) => -a(e) } return atom() }
  function atom() {
    const t = next()
    if (t === undefined) throw new Error(where + ': expression ends early')
    if (t === '(') { const a = or(); if (next() !== ')') throw new Error(where + ': missing )'); return a }
    if (/^\d+$/.test(t)) { const v = clampV(parseInt(t, 10)); return () => v }
    if (KEYWORDS.includes(t)) throw new Error(where + ': unexpected "' + t + '"')
    if (/^[A-Za-z_]/.test(t)) { if (!known.has(t)) throw new Error(where + ': unknown name "' + t + '"'); return (e) => e[t] }
    throw new Error(where + ': unexpected "' + t + '"')
  }
  const f = or()
  if (i < toks.length) throw new Error(where + ': unexpected "' + toks[i] + '"')
  return f
}

// ---------- DNA text (DECK-0008 §3) ----------
const TURTLE = "+-&^\\/|[]!'"
const isLetter = (ch) => /^[A-Za-z]$/.test(ch)
const isSym = (ch) => isLetter(ch) || TURTLE.includes(ch)
function splitTop(s) { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur); cur = '' } else cur += ch } out.push(cur); return out }
function parseString(src, known, where) {
  const out = []; let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (/[\t\v\f\r ]/.test(ch)) { i++; continue }
    if (!isSym(ch)) throw new Error(where + ': "' + ch + '" is not a symbol')
    i++; let args = []
    if (src[i] === '(') {
      let d = 0, j = i
      for (; j < src.length; j++) { if (src[j] === '(') d++; if (src[j] === ')') { d--; if (d === 0) break } }
      if (j >= src.length) throw new Error(where + ': missing )')
      const inner = src.slice(i + 1, j)
      // DECK-0008: an empty argument list "()" is no arguments; any empty argument is an error.
      args = trimWS(inner) === '' ? [] : splitTop(inner).map((a) => compileExpr(a, known, where))
      if (args.length > LIMITS.params) throw new Error(where + ': more than ' + LIMITS.params + ' parameters')
      i = j + 1
    }
    out.push({ c: ch, args })
  }
  return out
}
const intLine = (rest, where, kw) => {
  // DECK-0008: header numbers are strict decimal integers within +-1,000,000 (the prototype used parseInt(...) || 0)
  if (!/^-?\d+$/.test(rest)) throw new Error(where + ': ' + kw + ' is a whole number')
  const v = parseInt(rest, 10); if (Math.abs(v) > LIMITS.value) throw new Error(where + ': ' + kw + ' is out of range'); return v
}

export function parseDNA(text) {
  const prog = { text, name: 'dna', species: '', planted: null, scale: null, mutate: 0, sterile: false, genes: [], angle: 30, width: 2, color: 7, lets: [], axiom: null, rules: [], letters: {} }
  const lines = text.split('\n')
  const names = new Set([...BUILTINS, ...STD_NAMES]); const declared = new Set()
  let axiomSrc = null, axiomLine = 0; const ruleSrc = []; const seen = new Set()
  lines.forEach((raw, n) => {
    const where = 'line ' + (n + 1)
    const line = trimWS(raw.replace(/#.*$/, ''))
    if (!line) return
    const kw0 = line.split(new RegExp(WS + '+'))[0]
    if (!['dna', 'seed', 'species'].includes(kw0) && !/^[\x20-\x7e\t]*$/.test(line)) throw new Error(where + ': only printable ASCII outside comments and names')
    if (line.includes('->')) {
      if (line.split('->').length !== 2) throw new Error(where + ': a rule has exactly one "->"')
      ruleSrc.push([line, where]); return
    }
    const kw = kw0, rest = trimWS(line.slice(kw.length))
    const once = (k) => { if (seen.has(k)) throw new Error(where + ': a second "' + k + '" line'); seen.add(k) }
    if (kw === 'seed' || kw === 'dna') { once('dna'); prog.name = [...rest].slice(0, 64).join('') }
    else if (kw === 'species') { once('species'); prog.species = [...rest].slice(0, 64).join('') }
    else if (kw === 'sterile') { prog.sterile = true }
    else if (kw === 'scale') { once('scale'); if (!/^\d+$/.test(rest) || +rest > 84) throw new Error(where + ': scale is 0 to 84'); prog.scale = +rest }
    else if (kw === 'planted') { once('planted'); if (!/^\d+$/.test(rest)) throw new Error(where + ': planted is a block height'); prog.planted = parseInt(rest, 10) }
    else if (kw === 'mutate') { once('mutate'); prog.mutate = Math.max(0, Math.min(100, intLine(rest, where, kw))) }
    else if (kw === 'angle' || kw === 'width' || kw === 'color') { once(kw); prog[kw] = intLine(rest, where, kw) }
    else if (kw === 'gene') {
      const m = /^([A-Za-z_][A-Za-z_0-9]*)[\t ]+(-?\d+)(!?)[\t ]+(-?\d+)(!?)[\t ]+in[\t ]+(-?\d+)\.\.(-?\d+)$/.exec(rest)
      if (!m) throw new Error(where + ': gene is "gene name 4! 7 in 1..12"')
      const std = STD.find((x) => x.name === m[1])
      if ((names.has(m[1]) && !(std && !declared.has(m[1]))) || KEYWORDS.includes(m[1])) throw new Error(where + ': name "' + m[1] + '" is taken')
      const nums = [m[2], m[4], m[6], m[7]].map(Number)
      if (nums.some((v) => Math.abs(v) > LIMITS.value)) throw new Error(where + ': gene values are within 1,000,000')
      let lo = nums[2], hi = nums[3]
      if (lo > hi) throw new Error(where + ': a gene range runs low to high')   // DECK-0008: the prototype accepted lo > hi
      declared.add(m[1])
      if (std) { lo = Math.max(std.min, lo); hi = Math.min(std.max, hi); if (lo > hi) throw new Error(where + ': ' + m[1] + ' range is outside ' + std.min + '..' + std.max) }
      const cl = (v) => Math.max(lo, Math.min(hi, v))
      prog.genes.push({ name: m[1], a: { v: cl(nums[0]), d: m[3] === '!' }, b: { v: cl(nums[1]), d: m[5] === '!' }, lo, hi, std: !!std })
      names.add(m[1])
    }
    else if (kw === 'let') {
      const m = new RegExp('^([A-Za-z_][A-Za-z_0-9]*)' + WS + '*=' + WS + '*(.+)$').exec(rest)
      if (!m) throw new Error(where + ': let is "let name = expression"')
      if (names.has(m[1]) || KEYWORDS.includes(m[1])) throw new Error(where + ': name "' + m[1] + '" is taken')
      prog.lets.push({ name: m[1], fn: compileExpr(m[2], new Set([...names].filter((x) => !['w', 'W', 'g'].includes(x))), where) })
      names.add(m[1])
    }
    else if (kw === 'axiom') { once('axiom'); axiomSrc = rest; axiomLine = where }   // DECK-0008: exactly one axiom
    else throw new Error(where + ': unknown line "' + kw + '"')
  })
  if (axiomSrc === null) throw new Error('no axiom')
  const stdGenes = STD.map((x) => prog.genes.find((g) => g.name === x.name) ||
    { name: x.name, a: { v: x.def, d: false }, b: { v: x.def, d: false }, lo: x.lo, hi: x.hi, std: true, implicit: true })
  prog.genes = stdGenes.concat(prog.genes.filter((g) => !g.std))
  prog.axiom = parseString(axiomSrc, names, axiomLine)
  if (ruleSrc.length > LIMITS.rules) throw new Error('more than ' + LIMITS.rules + ' rules')
  for (const [line, where] of ruleSrc) {
    const [left, right] = line.split('->')
    const m = new RegExp('^' + WS + '*(\\S)(?:\\(([^)]*)\\))?' + WS + '*(.*)$').exec(left)
    if (!m || !isSym(m[1])) throw new Error(where + ': a rule starts with a symbol')
    const params = m[2] ? m[2].split(',').map(trimWS).filter(Boolean) : []
    // DECK-0008: parameters are distinct names that shadow nothing (the prototype allowed shadowing, which leaks values between symbols)
    for (const p of params) if (!NAME_RE.test(p) || names.has(p) || KEYWORDS.includes(p)) throw new Error(where + ': parameter "' + p + '" is not a free name')
    if (new Set(params).size !== params.length) throw new Error(where + ': parameter names repeat')
    if (params.length > LIMITS.params) throw new Error(where + ': more than ' + LIMITS.params + ' parameters')
    const known = new Set([...names, ...params])
    let rest = trimWS(m[3]), cond = null, chance = null
    const ci = rest.search(/\bchance\b/)
    if (ci >= 0) { chance = compileExpr(rest.slice(ci + 6), known, where); rest = trimWS(rest.slice(0, ci)) }
    if (/^if[\t ]/.test(rest)) cond = compileExpr(rest.slice(3), known, where)
    else if (rest) throw new Error(where + ': expected "if" or "chance"')
    const rule = { c: m[1], params, cond, chance, succ: parseString(right, known, where) }
    prog.rules.push(rule)
    ;(prog.letters[rule.c] = prog.letters[rule.c] || []).push(rule)
  }
  // species: the rule alphabet (symbol and arity) plus the gene names
  const alpha = new Set()
  const addS = (s) => { if (isLetter(s.c)) alpha.add(s.c + '/' + s.args.length) }
  prog.axiom.forEach(addS)
  for (const r of prog.rules) { alpha.add(r.c + '/' + r.params.length); r.succ.forEach(addS) }
  prog.speciesKey = [...alpha].sort().join(' ') + ' | ' + prog.genes.map((g) => g.name).sort().join(' ')
  return prog
}

export function express(g) {
  if (g.a.d && !g.b.d) return g.a.v
  if (g.b.d && !g.a.d) return g.b.v
  return Math.floor((g.a.v + g.b.v) / 2)
}
export function makeEnv(prog, coordHex, u) {
  const t = terroir(coordHex, u)
  const env = { w: 0, W: 0, g: 0, K: t.K, n0: t.n0, n1: t.n1, n2: t.n2, n3: t.n3, pl: t.pl }
  for (const g of prog.genes) env[g.name] = express(g)
  for (const l of prog.lets) env[l.name] = l.fn(env)
  return env
}

// ---------- growth (DECK-0008 §4) ----------
function rewrite(prog, env, str, gen, word, symbolCap) {
  const out = []; let capped = false
  const e = Object.create(env); e.W = mix32(word ^ 0x5bd1e995) % 100; e.g = gen
  for (let i = 0; i < str.length; i++) {
    const s = str[i]
    const rules = capped ? null : prog.letters[s.c]
    if (!rules) { out.push(s); continue }
    e.w = mix32(word ^ Math.imul(i + 1, 0x9E3779B1 | 0)) % 100
    let hit = null
    for (const r of rules) {
      if (r.params.length !== s.p.length) continue
      for (let k = 0; k < r.params.length; k++) e[r.params[k]] = s.p[k]
      if (r.cond && !r.cond(e)) continue
      if (r.chance && !(e.w < r.chance(e))) continue
      hit = r; break
    }
    if (!hit) { out.push(s); continue }
    if (out.length + hit.succ.length + (str.length - i - 1) > symbolCap) { capped = true; out.push(s); continue }
    let inherited = false
    for (const t of hit.succ) {
      const p = t.args.map((f) => f(e))
      let b = gen
      if (!inherited && t.c === s.c) { b = s.b; inherited = true }
      out.push({ c: t.c, p, b })
    }
  }
  return out
}

function interpret(prog, str, age, env, vertexCap) {
  const SIZE = Math.max(10, Math.min(400, env.size))
  const HUE = ((env.hue % 24) + 24) % 24, TONE = env.tone
  const paint = (c) => { c = Math.max(0, Math.min(255, c)); if (c >= 192) return c; const sh = Math.max(0, Math.min(7, (c & 7) + TONE)); return (((c >> 3) + HUE) % 24) * 8 + sh }
  const V = [], C = [], F = []
  let px = 0, py = 0, pz = 0
  let H = [0, ONE, 0], L = [-ONE, 0, 0], U = [0, 0, ONE]
  let width = prog.width, color = prog.color
  const stack = []; const R = LIMITS.region * TICK
  const fx = (a) => fdiv(a + 8192, ONE)
  const norm = (v) => { const l = isqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1; return [fdiv(v[0] * ONE, l), fdiv(v[1] * ONE, l), fdiv(v[2] * ONE, l)] }
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const crossV = (a, b) => [fdiv(a[1] * b[2] - a[2] * b[1], ONE), fdiv(a[2] * b[0] - a[0] * b[2], ONE), fdiv(a[0] * b[1] - a[1] * b[0], ONE)]
  function ortho() {
    H = norm(H)
    const d = dot(L, H)
    L = norm([L[0] - fdiv(d * H[0], ONE * ONE), L[1] - fdiv(d * H[1], ONE * ONE), L[2] - fdiv(d * H[2], ONE * ONE)])
    U = crossV(H, L)
  }
  function rot(a, b, deg) {
    const c = icos(deg), s = isin(deg)
    return [[fx(a[0] * c + b[0] * s), fx(a[1] * c + b[1] * s), fx(a[2] * c + b[2] * s)], [fx(b[0] * c - a[0] * s), fx(b[1] * c - a[1] * s), fx(b[2] * c - a[2] * s)]]
  }
  const cl = (v) => Math.max(-R, Math.min(R, v))
  function vert(x, y, z) { V.push(cl(x), cl(y), cl(z)); C.push(paint(color)); return V.length / 3 - 1 }
  const room = (k) => V.length / 3 + k <= vertexCap
  const RING = [[0, ONE], [-14189, -8192], [14189, -8192]]
  function ring(x, y, z, w) {
    return RING.map(([cx, cy]) => vert(x + fdiv((L[0] * cx + U[0] * cy) * w, ONE * ONE), y + fdiv((L[1] * cx + U[1] * cy) * w, ONE * ONE), z + fdiv((L[2] * cx + U[2] * cy) * w, ONE * ONE)))
  }
  // DECK-0008: growing between generations is normative, so there is no "smooth off" mode
  const grown = (b) => { const f = b === 0 ? N : age - b * N; return f < 0 ? 0 : f > N ? N : f }
  for (const s of str) {
    const a0 = s.p.length ? s.p[0] : null
    switch (s.c) {
      case 'F': case 'f': {
        const len = fdiv(Math.max(0, Math.min(100, a0 === null ? 10 : a0)) * STEP * grown(s.b) * SIZE, N * 100)
        if (len === 0) break
        const nx = px + fx(H[0] * len), ny = py + fx(H[1] * len), nz = pz + fx(H[2] * len)
        const w = fdiv(Math.max(0, Math.min(50, width)) * STEP * SIZE, 200)
        if (s.c === 'F' && w > 0 && room(6)) {
          const r0 = ring(px, py, pz, w), r1 = ring(nx, ny, nz, w)
          for (let j = 0; j < 3; j++) { const k = (j + 1) % 3; F.push([r0[j], r0[k], r1[k]], [r0[j], r1[k], r1[j]]) }
        }
        px = cl(nx); py = cl(ny); pz = cl(nz); break
      }
      case '+': case '-': { const d = (a0 === null ? prog.angle : a0) * (s.c === '+' ? 1 : -1); [H, L] = rot(H, L, d); ortho(); break }
      case '&': case '^': { const d = (a0 === null ? prog.angle : a0) * (s.c === '&' ? 1 : -1); [H, U] = rot(H, U, -d); ortho(); break }
      case '\\': case '/': { const d = (a0 === null ? prog.angle : a0) * (s.c === '/' ? 1 : -1); [L, U] = rot(L, U, d); ortho(); break }
      case '|': [H, L] = rot(H, L, 180); ortho(); break
      case 'T': {
        const deg = a0 === null ? 5 : a0; const D = deg >= 0 ? [0, -ONE, 0] : [0, ONE, 0]; const dd = Math.abs(deg) % 360
        const k = dot(D, H)
        const P = [D[0] - fdiv(k * H[0], ONE * ONE), D[1] - fdiv(k * H[1], ONE * ONE), D[2] - fdiv(k * H[2], ONE * ONE)]
        if (P[0] * P[0] + P[1] * P[1] + P[2] * P[2] < 400 * 400) break
        const Pn = norm(P), c = icos(dd), sn = isin(dd)
        H = [fx(H[0] * c + Pn[0] * sn), fx(H[1] * c + Pn[1] * sn), fx(H[2] * c + Pn[2] * sn)]
        ortho(); break
      }
      case '[': if (stack.length < LIMITS.stack) stack.push([px, py, pz, H, L, U, width, color]); break
      case ']': if (stack.length) [px, py, pz, H, L, U, width, color] = stack.pop(); break
      case '!': width = a0 === null ? prog.width : a0; break
      case "'": color = a0 === null ? prog.color : a0; break
      case 'L': {
        const sz = fdiv(Math.max(0, Math.min(50, a0 === null ? 3 : a0)) * STEP * grown(s.b) * SIZE, N * 100)
        if (sz === 0 || !room(4)) break
        const h2 = fdiv(sz, 2), q = fdiv(sz, 3)
        const a = vert(px, py, pz)
        const b = vert(px + fx(H[0] * h2 + L[0] * q), py + fx(H[1] * h2 + L[1] * q), pz + fx(H[2] * h2 + L[2] * q))
        const c = vert(px + fx(H[0] * sz), py + fx(H[1] * sz), pz + fx(H[2] * sz))
        const d = vert(px + fx(H[0] * h2 - L[0] * q), py + fx(H[1] * h2 - L[1] * q), pz + fx(H[2] * h2 - L[2] * q))
        F.push([a, b, c], [a, c, d]); break
      }
      case 'O': {
        const r = fdiv(Math.max(0, Math.min(50, a0 === null ? 2 : a0)) * STEP * grown(s.b) * SIZE, N * 100)
        if (r === 0 || !room(6)) break
        const o = [vert(px + r, py, pz), vert(px - r, py, pz), vert(px, py + r, pz), vert(px, py - r, pz), vert(px, py, pz + r), vert(px, py, pz - r)]
        const [xp, xn, yp, yn, zp, zn] = o
        F.push([xp, yp, zp], [yp, xn, zp], [xn, yn, zp], [yn, xp, zp], [yp, xp, zn], [xn, yp, zn], [yn, xn, zn], [xp, yn, zn]); break
      }
      default: break
    }
  }
  return { V, C, F }
}

export function toSNO(name, geo, unit) {
  const n = geo.V.length / 3, vertices = [], ticks = []; let ext = 1, zr = 0
  for (let i = 0; i < n; i++) {
    const t = [geo.V[3 * i], geo.V[3 * i + 1], geo.V[3 * i + 2]]
    const w = t.map((v) => Math.floor(v / TICK)), r = t.map((v, k) => v - w[k] * TICK)
    vertices.push(w)
    for (let k = 0; k < 3; k++) ext = Math.max(ext, Math.abs(w[k]), w[k] + (r[k] ? 1 : 0))
    if (r[0] === 0 && r[1] === 0 && r[2] === 0) zr++
    else { if (zr === 1) ticks.push([0, 0, 0]); else if (zr > 1) ticks.push(-zr); zr = 0; ticks.push(r) }
  }
  const allZero = ticks.length === 0
  if (!allZero) { if (zr === 1) ticks.push([0, 0, 0]); else if (zr > 1) ticks.push(-zr) }
  const sno = { v: 2, name: [...name].slice(0, 64).join(''), unit }
  const e = Math.min(64, ext); if (e !== 8) sno.extent = e
  sno.mode = 'solid'; sno.vertices = vertices
  if (!allZero) sno.ticks = ticks
  sno.colors = geo.C.slice(); sno.faces = geo.F
  return sno
}

// Grow one seed. `planted` is the effective planted height (after the clamp of §4.2),
// `clock` the clock height (tip minus 6), `blockHash(h)` the block's hash as displayed.
export function grow({ prog, coord, planted, scale = 0, caps = BASE_CAPS, clock, blockHash }) {
  const env = makeEnv(prog, coord, scale)
  const age = clock - planted
  const g = age < 0 ? 0 : Math.min(Math.floor(age / N), caps.generations)
  let str = prog.axiom.map((t) => ({ c: t.c, p: t.args.map((f) => f(env)), b: 0 }))
  const used = []
  for (let k = 1; k <= g; k++) {
    const h = planted + k * N, hash = blockHash(h)
    if (!hash) throw new Error('no hash for block ' + h)
    used.push(h)
    str = rewrite(prog, env, str, k, word32(hash), caps.symbols)
  }
  const geo = interpret(prog, str, Math.max(0, age), env, caps.vertices)
  const sno = toSNO(prog.name, geo, scale)
  return { age, g, symbols: str.length, used, sno, json: JSON.stringify(sno) }
}

// ---------- the planted-height clamp (DECK-0008 §4.2) ----------
// times[h] is block h's header time. E is the highest height whose header time is
// at most created_at - 7200; the effective height is max(stated, E).
export function clampFloor(createdAt, times) {
  let E = -1
  for (const [h, t] of Object.entries(times)) if (t <= createdAt - CLAMP_MARGIN && +h > E) E = +h
  return E
}
export const effectiveHeight = (stated, createdAt, times) => Math.max(stated, clampFloor(createdAt, times))

// ---------- mixing (DECK-0008 §6) ----------
export function mixWord(blockHashHex, commitIdHex) {
  return word32(sha256hex(Buffer.concat([Buffer.from(MIX_DOMAIN, 'ascii'), Buffer.from(blockHashHex, 'hex'), Buffer.from(commitIdHex, 'hex')])))
}
const alleleStr = (a) => a.v + (a.d ? '!' : '')
export const geneLine = (g) => 'gene ' + g.name + ' ' + alleleStr(g.a) + ' ' + alleleStr(g.b) + ' in ' + g.lo + '..' + g.hi

// s0 is the mix word. Returns { refused } or { text, prog, log }.
export function mixDNA(A, B, s0, { name, hybrid = false } = {}) {
  if (A.sterile || B.sterile) return { refused: 'sterile' }
  const same = A.speciesKey === B.speciesKey
  if (!same && !hybrid) return { refused: 'different species' }
  const rate = Math.floor((A.mutate + B.mutate) / 2)
  const log = [], genes = []
  A.genes.forEach((ga, i) => {
    const s = mix32(s0 ^ Math.imul(i + 1, 0x9E3779B1 | 0))
    const gb = B.genes.find((x) => x.name === ga.name)
    const ia = s & 1, ib = (s >>> 1) & 1
    const a = { ...(ia ? ga.b : ga.a) }
    const b = gb ? { ...(ib ? gb.b : gb.a) } : { ...(ia ? ga.a : ga.b) }
    const lo = gb ? Math.min(ga.lo, gb.lo) : ga.lo, hi = gb ? Math.max(ga.hi, gb.hi) : ga.hi
    let mutated = null
    if (((s >>> 8) % 100) < rate) {
      const which = (s >>> 2) & 1, span = hi - lo
      const step = 1 + ((s >>> 16) % Math.max(1, Math.ceil(span / 6)))
      const sign = (s >>> 4) & 1 ? 1 : -1
      const tgt = which ? b : a, before = tgt.v
      tgt.v = Math.max(lo, Math.min(hi, tgt.v + sign * step))
      if (tgt.v !== before) mutated = { allele: which + 1, from: before, to: tgt.v }
    }
    const g = { name: ga.name, a, b, lo, hi }
    genes.push(g)
    log.push({ name: ga.name, s, from: ['A' + (ia + 1), gb ? 'B' + (ib + 1) : 'A' + (2 - ia)], child: g, expressed: express(g), mutated })
  })
  // DECK-0008 §6.5: the child's text, line by line from the mother's text
  const childName = [...(name || (A.name + ' x ' + B.name))].slice(0, 64).join('')
  const byName = Object.fromEntries(genes.map((g) => [g.name, g]))
  const head = ['dna ' + childName]
  if (!same) head.push('sterile')
  for (const s of STD) if (!A.genes.find((g) => g.name === s.name && !g.implicit)) head.push(geneLine(byName[s.name]))
  const out = []; let wroteHead = false
  for (const raw of A.text.split('\n')) {
    const t = trimWS(raw.replace(/#.*$/, ''))
    const kw = t.split(new RegExp(WS + '+'))[0]
    if (!t.includes('->') && (kw === 'dna' || kw === 'seed')) { out.push(...head); wroteHead = true; continue }
    if (!t.includes('->') && ['sterile', 'planted', 'scale'].includes(kw)) continue
    if (!t.includes('->') && kw === 'gene') { out.push(geneLine(byName[t.split(new RegExp(WS + '+'))[1]])); continue }
    out.push(raw)
  }
  if (!wroteHead) out.unshift(...head)
  const text = out.join('\n')
  return { text, prog: parseDNA(text), log, same }
}

// ---------- the price of caps (DECK-0008 §7) ----------
export function capBits(value, { free, max }) {
  if (!Number.isInteger(value) || value < 1 || value > max) return null
  let k = 0; while (free * 2 ** k < value) k++
  return k
}
export function price(caps) {
  let bits = PRICE.base
  for (const k of ['vertices', 'symbols', 'generations']) { const b = capBits(caps[k], PRICE.caps[k]); if (b === null) return null; bits += b }
  return bits
}
// NIP-01 event id and NIP-13 difficulty
export const eventId = (ev) => sha256hex(Buffer.from(JSON.stringify([0, ev.pubkey, ev.created_at, ev.kind, ev.tags, ev.content]), 'utf8'))
export function leadingZeroBits(hex) { let n = 0; for (const ch of hex) { const v = parseInt(ch, 16); if (v === 0) { n += 4; continue } n += Math.clz32(v) - 28; break } return n }
