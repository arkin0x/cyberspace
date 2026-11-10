// Golden vectors for DECK-0008 (Seeds). Run from this directory with Node 18 or later
// and no dependencies:
//   node seeds-vectors.mjs > seeds-vectors.json
// It takes about a minute and a half, most of it mining the NIP-13 work of the DNA events.
// Every value comes from seeds-reference.mjs. The block hashes and header times below
// are real Bitcoin blocks, read from mempool.space (read-only GETs) on 2026-11-09 and
// 2026-11-10. The DNA events are unsigned: a vector needs their ids, which carry the
// proof of work, and not their signatures. A real DNA event is signed. The file is not
// normative: where it disagrees with DECK-0008, the DECK is right and the file is a bug.
import * as S from './seeds-reference.mjs'

const BLOCKS = {
  hashes: {
    970400: '000000000000000000016242c942ba251f2dbfb6d2faa1e29c6ec58967aee578',
    970500: '00000000000000000001190ed1dcc169460315b60f7271ffc8d85dd41b63f363',
    970501: '000000000000000000007f286f5dc58017d7d1767647f5973c614953d26fabc7',
    970502: '0000000000000000000212f76085176143488791dd07a554654de604ea574a0b',
    970503: '000000000000000000021932cdf703e64226aa9fb7ee2c9b6d88d17c654a66d6',
    970536: '00000000000000000000cf1f1ad5ef2dae2431b986211e4e9660b143cf4f60a6',
    970537: '00000000000000000001bdff73c2b07c3b12002d3c9bbb512bf3e423b5c9e389',
    970538: '000000000000000000011f1c75aab663f15bbbcdeb7f3b28cef9f1b8b889a84f',
    970539: '000000000000000000014c2951a2220b1c07ce90e814266d6d4e31ac14afc39f',
    970540: '00000000000000000000a6153701a8e47ef24844b627d8bc14defd461fc1186a',
    970544: '000000000000000000018e2630954cf08dd01574789ddf0a802fc034e1b6ba74',
    970576: '00000000000000000001bc401b09150a6f092579644cc5616a828949f48bbd1d',
    970600: '000000000000000000014c6d37fb203ddf57c1601b46e2be5a2388bcb4ad2981',
    970688: '000000000000000000011996e35e408229def9e5c1c8b3ace2998507c2a0f129',
    970744: '000000000000000000000cc7724b59be86fd2a49ee8598924c39f8467ebb7cde',
    970832: '00000000000000000001c8607e15f23b286a549607192ebd54cb1e1b8f7f6f66',
    970888: '00000000000000000000136528f9f59831bdb452bc57e25ec8f83f0a9305ade4',
    970976: '00000000000000000001f9117fe518b3b4cae6a0f275c1842a417d0f07db827a',
    971032: '00000000000000000000c98b4626d302cb212c96f18b0d66739a043cefcfe28e',
    971120: '00000000000000000001705c21d33c707d45df65a26b19cb3f0931b969f317a4',
    971176: '00000000000000000001414fff370f6bef098baa8ea0021bda2f289800e6b09b',
    971264: '00000000000000000001c6f59c79b830ade2a952a058e5c15ad5a49e38804236',
    971320: '0000000000000000000070509ded08b767e49e2bfa8851c88a01e1b1a620b655',
    971408: '00000000000000000001e4390b5536c30a61b4b1759b4ea09b11574f007ab213',
    971464: '00000000000000000001b3b671f44a12bb0233f55f3676a98d899cf6873fdeb1',
    971552: '00000000000000000001692f29ffab4d081c1438fcf35a548ee7c5d007c55dfe',
    971608: '000000000000000000006fcd2c67152f8a26a43b49208e915f8041a064782700',
    971696: '00000000000000000000752931c0eb2eb43c07730c4659b4b29d369fb7b22e99',
    971752: '0000000000000000000069ace7af0bc84a9022ee5f82c0962b659efc97f79d80',
    971840: '00000000000000000000ec6e50a077c79b293675f52698de93a15ffbd43e4e89',
    971896: '0000000000000000000142a5ac84bd7c3f866ac84b97d56b1ec23a2267258cf5',
    971984: '000000000000000000018afcad81ac70dc8cb1c38a05fd22abca5fcb8941d319',
    972040: '000000000000000000008eb978d67bca206d727b77e7a1440b956fe83c2ad343',
    972128: '000000000000000000009bf62d7120c0f69a9b112e7ae8b65e2d8a5f60c37410',
    972184: '000000000000000000011485dc6e6ec5eb21950868b87ac39fa1f52777020d24',
    972272: '000000000000000000010c435f8763301b9e662e131d4aa4093a7b59ccc02c9f',
    972328: '0000000000000000000003e6d9fa967200efdb4da84e81e85123e6e2bf7426ef',
    972416: '00000000000000000001e646e9605c6af863e751ae800a5b494df8304f100fac',
    972472: '00000000000000000000f1c532c0594e2139e32950d9fc64d4cb1b8230961848',
    972560: '0000000000000000000016adeaf6112e0416afe8413e2caba65e07e0527a3b14',
    972616: '0000000000000000000114c547383243d1937bff8fc284397acba8ab0f2dafac',
    972704: '00000000000000000000fd58864cd9d611eed1ce1c5027daaef961f3783c9831',
    972760: '00000000000000000001b08986370db57c9af8bba30c510db7226385f3b8e907',
    972848: '0000000000000000000101d1391dc93035b1281d1babf259ef1462714103f0b1',
    972904: '000000000000000000014c7e7110050d7ac715de8f94be8e786c3873f9bfb0c3',
    972992: '0000000000000000000173d4d1172337846ea5262eff3d42c452aeb20f9180fc',
    973048: '000000000000000000012236d75e33ea3f5db9925982344d441407b64e4fb3af',
    973136: '000000000000000000015ab02558bd9ea5310b2fa35edece07c44b950633ba34',
    973192: '000000000000000000006f3b85b105fb04c0599cb8709105dbfade4fc7cd476f',
    973280: '00000000000000000000ce546d8d46c2e825a4af84a1157e694363778c3d7820',
    973336: '00000000000000000000e0661d3b4923a0a6dcef4cb866cc454635b417aad1db',
    973424: '00000000000000000000d4779868c57d3717057b20bab656b842af7e00353d12',
    973480: '0000000000000000000106e7a3632e0d82361c2230309233a4317f6553420b5f',
    973568: '000000000000000000004c82189ad337042b9279beb5a556358f05c353b9c80c',
    973624: '000000000000000000009d18904d1d1e8acc13b9d0bf240f3bf9832fabdeee88',
    973712: '0000000000000000000114f397b44d25a9e25791cb79dd699f082b4d5fdaafa2',
    973768: '00000000000000000000292e49822b3e76c22172af472f36448432fcd97789c5',
    973856: '0000000000000000000091a7df8656962fc4c1284624941137601d015e783f90',
    973912: '00000000000000000001764e4e4db4349e9fcd42bbcff891ebbbfe59dace9035',
    974000: '00000000000000000000d7d13f5ac024052cad9613d9a6608f76df081d74e865',
    974056: '000000000000000000019fe290d781a33400da7abf44caacd4d5cbaaef9316b4',
    974144: '0000000000000000000118d55195da9cd650524d042e3674737c4d2898f788b1',
    974200: '000000000000000000002f7cd19f8dd960110556e47abd1ec11136a3816b4049',
    974288: '000000000000000000009e5ed0cd3db0a4cf9cc2f138ef86f81ed207c9f72d09',
    974344: '00000000000000000001d71004ce8d25c34b955a8aaca412eb69d31d65d0ac31',
    974432: '00000000000000000001c581a0dca0e99e1d177a4c6f666f291c6cd96649edf2',
    974488: '00000000000000000000a071d5c5878177a86f060b87b3597b8ad8e46243bacc',
    974576: '000000000000000000010ba901e36269fe10de6592e0dd62c6b71ed4b7e1e2f6',
    974632: '0000000000000000000046518776aa8fe95162b03ae82ce1438b456c17e23764',
    974720: '000000000000000000010429271ef7911711ee4cd9f8e5cbc84b600071e7a843',
    974776: '000000000000000000003337adfd556e1f0728b88297a5d1c2f05ab65142d9c6',
    974920: '00000000000000000000ff31f19e2574b1dbf62f7630f549d9742605da60c307',
  },
  times: {
    970400: 1791412279,
    970401: 1791412998,
    970402: 1791413245,
    970403: 1791413684,
    970404: 1791415047,
    970405: 1791416108,
    970406: 1791416719,
    970407: 1791416796,
    970408: 1791416821,
    970409: 1791417162,
    970410: 1791418083,
    970411: 1791418849,
    970412: 1791419382,
    970413: 1791419782,
    970414: 1791420674,
    970415: 1791421475,
    970416: 1791422833,
    970417: 1791423157,
    970418: 1791423302,
    970419: 1791423744,
    970420: 1791423811,
    970421: 1791423908,
    970422: 1791424029,
    970423: 1791424803,
    970424: 1791424998,
    970425: 1791425197,
    970426: 1791427055,
    970427: 1791427923,
    970428: 1791428009,
    970429: 1791428747,
    970430: 1791429136,
    970431: 1791430642,
    970432: 1791430822,
    970433: 1791431031,
    970434: 1791431708,
    970435: 1791432610,
    970436: 1791432679,
    970437: 1791433477,
    970438: 1791434151,
    970439: 1791434193,
    970440: 1791434509,
    970441: 1791434848,
    970442: 1791434904,
    970443: 1791435100,
    970444: 1791436847,
    970445: 1791436660,
    970446: 1791436763,
    970447: 1791438048,
    970448: 1791438701,
    970449: 1791438953,
    970450: 1791439352,
    970451: 1791440614,
    970452: 1791442913,
    970453: 1791443004,
    970454: 1791443250,
    970455: 1791443378,
    970456: 1791443921,
    970457: 1791443951,
    970458: 1791444309,
    970459: 1791444451,
    970500: 1791470870,
    970501: 1791470956,
    970502: 1791471100,
    970503: 1791471520,
    970504: 1791472129,
    970505: 1791472494,
    970506: 1791473014,
    970507: 1791473088,
    970508: 1791473305,
    970509: 1791474494,
    970510: 1791475222,
    970511: 1791477174,
    970512: 1791478192,
    970513: 1791479216,
    970514: 1791479935,
    970515: 1791481249,
    970516: 1791481921,
    970517: 1791483228,
    970518: 1791485590,
    970519: 1791485732,
    970520: 1791486390,
    970521: 1791487674,
    970522: 1791488739,
    970523: 1791489395,
    970524: 1791489767,
    970525: 1791490396,
    970526: 1791491665,
    970527: 1791491967,
    970528: 1791492049,
    970529: 1791492455,
    970530: 1791492688,
    970531: 1791492912,
    970532: 1791493204,
    970533: 1791493625,
    970534: 1791494186,
    970535: 1791496107,
    970536: 1791496129,
    970537: 1791496855,
    970538: 1791496749,
    970539: 1791496843,
    970540: 1791497148,
    970541: 1791500023,
    970542: 1791500054,
    970543: 1791500378,
    970544: 1791502802,
    970545: 1791502866,
    970546: 1791503213,
    970547: 1791503437,
    970548: 1791503648,
    970549: 1791504483,
    970550: 1791505072,
    970551: 1791505101,
    970552: 1791505208,
    970553: 1791505231,
    970554: 1791505545,
    970555: 1791505575,
    970556: 1791505828,
    970557: 1791505914,
    970558: 1791507322,
    970559: 1791507435,
  },
}
const blockHash = (h) => BLOCKS.hashes[h] || null
const label = (s) => S.sha256hex(Buffer.from('cyberspace vectors: ' + s, 'utf8'))
const PUBKEY = label('seeds author')   // a stand-in pubkey: the vectors are unsigned
const coordA = '3a7f1c9e5b2d4806f1e3c5a79b0d2f4618e3a5c7b9d1f3e5a7c9b1d3f5e7a9c1'
const coordB = 'c4e2a0f8d6b4927085e3c1a9f7d5b3917fe5c3a1b9d7f5e3c1a9b7d5f3e1c9a0'
const CAPS = { vertices: 8000, symbols: 6000, generations: 40 }
const capsTag = (c) => ['caps', String(c.vertices), String(c.symbols), String(c.generations)]

// ---------- the six example DNAs of the Seed Garden prototype ----------
const FERN_RULES = `# growth rules
angle 8
# terroir: K is the terrain (0..16), n0..n3 its nibbles, finest to coarsest
let lean  = curl + n0 % 7          # fine texture adds a little coil
let reach = span + K / 4 - 2       # richer terrain, longer pinnae
let fan   = 55 + n1 * 2            # pinna angle
axiom '(203) O(2) !(2) A(0)

# the tip adds one node a day, with a pair of pinnae
A(k) if k < 27 -> '(171) F(gap) [ +(fan) P(reach - k/3) ] [ -(fan) P(reach - k/3) ] ^(lean) A(k+1)
# every coil relaxes a little each day, so the frond unfurls behind its tip
^(a) if a > 0 -> ^(a - 2)
# each pinna adds a leaflet pair a day; weather sometimes stops it early
P(n) if n > 0 chance 92 -> '(173) F(2) [ +(55) '(174) L(leaf) ] [ -(55) '(174) L(leaf) ] &(3) P(n-1)
P(n) -> '(175) L(leaf+1)`
const TREE_RULES = `# growth rules
angle 25
# terroir: K is the terrain (0..16), n0..n3 its nibbles, finest to coarsest
let forks = fork + K - 8           # richer terrain, more forks
let open  = spread + n2 - 7        # middle-scale soil opens or closes the crown
axiom '(203) O(3) !(2, 10) S(trunk)

# the trunk rises first, then becomes a crown
S(n) if n > 0 -> '(122) F(6) /(137) S(n-1)
S(n) -> A(4)
# a tip grows one internode a day; some days it forks in two
A(v) if v > 0 chance forks -> '(122) F(4) [ &(open) !(1, v*2) A(v-1) ] /(137) [ &(open) !(1, v*2) A(v-1) ]
A(v) -> '(122) F(3) T(droop) [ ^(40) '(173) L(leaf) ] /(137) A(v)
# wood thickens a little each day, up to its limit
!(t, m) if t < m -> !(t+1, m)`
const DNAS = {
  fiddlehead: `dna     fiddlehead
species fern
mutate  4

# genome: two alleles each, ! marks dominant
# standard genes (every DNA has them; the turtle applies them)
gene size    180  170  in 50..200  # giant, recessive
gene hue     0!   0!   in 0..23    # keeps the green
# species genes
gene curl    22   20   in 2..30    # how tightly a new node coils (recessive)
gene span    7!   5    in 3..12    # how long a pinna gets
gene leaf    3    3    in 1..6     # leaflet size
gene gap     4    3!   in 2..7     # space between nodes

` + FERN_RULES,
  'sword fern': `dna     sword fern
species fern
mutate  4

# genome: two alleles each, ! marks dominant
# standard genes (every DNA has them; the turtle applies them)
gene size    70!  75!  in 50..200  # small, dominant
gene hue     6    6    in 0..23    # green turned blue, recessive
# species genes
gene curl    6!   5!   in 2..30    # how tightly a new node coils (loose is dominant)
gene span    10   9!   in 3..12    # how long a pinna gets
gene leaf    2!   4    in 1..6     # leaflet size
gene gap     5!   5    in 2..7     # space between nodes

` + FERN_RULES,
  oak: `dna     oak
species tree
mutate  3

# genome: two alleles each, ! marks dominant
# standard genes (every DNA has them; the turtle applies them)
gene tone    1!   1    in -4..4    # a shade lighter
gene hue     0!   0!   in 0..23    # leaves stay green
# species genes
gene spread  38!  30   in 10..60   # branch angle
gene droop   -4!  -4!  in -8..8    # bend down (+) or reach up (-)
gene fork    22   30!  in 5..50    # chance a tip forks today
gene leaf    5!   3    in 2..8     # leaf size
gene trunk   4!   3    in 1..9     # days of bare trunk before the crown

` + TREE_RULES,
  willow: `dna     willow
species tree
mutate  3

# genome: two alleles each, ! marks dominant
# standard genes (every DNA has them; the turtle applies them)
gene tone    -2   -3   in -4..4    # darker
gene hue     23   23   in 0..23    # one family toward yellow, recessive
# species genes
gene spread  32   28   in 10..60   # branch angle
gene droop   8    7    in -8..8    # bend down (+) or reach up (-)
gene fork    26   24   in 5..50    # chance a tip forks today
gene leaf    4    4    in 2..8     # leaf size
gene trunk   7    6    in 1..9     # days of bare trunk before the crown

` + TREE_RULES,
  coral: `dna     coral
species coral
mutate  5

# standard genes (every DNA has them; the turtle applies them)
gene hue     0!   12   in 0..23    # magenta, hiding a green; mix coral with coral to find it
# species genes
gene split   22!  15   in 5..50    # chance a tip splits today
gene twist   40   70!  in 0..120   # roll between segments
gene life    18!  14   in 8..26    # growing days before a tip closes

angle 30
let lean = n1 * 3                  # terroir: the current leans with the soil
let rest = 20 + K + n0             # poor terrain, more resting days
axiom '(250) O(4) !(3) C(0)

# a polyp tip grows on most days, sometimes splits, sometimes rests; old tips close with a bead
C(k) if k < life chance split -> '(75+k/5) F(2) [ +(20+w/3) &(lean/3) C(k+1) ] /(twist) [ -(20+w/4) C(k+1) ]
C(k) if k < life chance 100 - rest -> '(75+k/5) F(2) /(twist) ^(w/8) C(k+1)
C(k) if k >= life -> '(79) O(2)`,
  crystal: `dna     crystal
species crystal
mutate  2

# standard genes (every DNA has them; the turtle applies them)
gene hue     0!   5    in 0..23    # cyan, hiding a violet
# species genes
gene arm     5!   4    in 3..8     # cell size
gene bud     35   50!  in 0..90    # chance, per day, that every arm buds

angle 90
let step  = arm + n0 % 3           # terroir: fine texture sets the cell size
let calm  = 45 + K * 2 + n3        # days are calm enough to grow when W < calm
let reach = 2 + n2 % 3             # side arm length
axiom '(15) O(3) !(4) X

# six arms on a cubic lattice. W is one roll per day for the whole crystal, so it stays symmetric
X -> [ Y(0) ] [ +(90) Y(0) ] [ -(90) Y(0) ] [ ^(90) Y(0) ] [ &(90) Y(0) ] [ |(0) Y(0) ]
Y(k) if k < 16 and W < bud * calm / 100 -> '(12) F(step) O(1) [ +(90) Z(reach) ] [ -(90) Z(reach) ] [ ^(90) Z(reach-1) ] Y(k+1)
Y(k) if k < 16 and W < calm -> '(12) F(step) O(1) Y(k+1)
Z(n) if n > 0 and W < calm -> '(14) F(step/2) O(1) Z(n-1)`,
}
const P = Object.fromEntries(Object.entries(DNAS).map(([k, t]) => [k, S.parseDNA(t)]))

// ---------- DNA events, mined to their price (NIP-13) ----------
function mine(base) {
  const bits = S.price(base.caps)
  const tags0 = [...base.tags, capsTag(base.caps)]
  for (let n = 0; ; n++) {
    const ev = { pubkey: PUBKEY, created_at: base.created_at, kind: 3350, tags: [...tags0, ['nonce', String(n), String(bits)]], content: base.content }
    const id = S.eventId(ev)
    if (S.leadingZeroBits(id) >= bits) return { ...ev, id }
  }
}
const written = (name, created_at) => mine({ created_at, caps: CAPS, tags: [], content: DNAS[name] })

const out = {
  note: 'Golden vectors for DECK-0008 (Seeds), produced by seeds-vectors.mjs from seeds-reference.mjs. Not normative: where this file disagrees with DECK-0008, the DECK is right. Block hashes are written as block explorers display them. DNA events are unsigned stand-ins whose ids carry their NIP-13 work; a real DNA event is signed. SNO hashes are SHA-256 of the compact JSON of the bloom payload (DECK-0008 §5.4), keys in the order v, name, unit, extent, mode, vertices, ticks, colors, faces.',
  constants: { TICK: S.TICK, STEP: S.STEP, ONE: S.ONE, N: S.N, CLOCK_DEPTH: S.CLOCK_DEPTH, MIX_DELAY: S.MIX_DELAY, MIX_DEPTH_MAX: S.MIX_DEPTH_MAX, CLAMP_MARGIN: S.CLAMP_MARGIN, limits: S.LIMITS, TERRAIN_DOMAIN_V2: S.TERRAIN_DOMAIN_V2, TERROIR_DOMAIN: S.TERROIR_DOMAIN, MIX_DOMAIN: S.MIX_DOMAIN, price: S.PRICE },
}

// ---------- primitives ----------
{
  const h = blockHash(970544)
  const w = S.word32(h)
  out.primitives = {
    sin_table_sha256: S.sha256hex(Buffer.from(JSON.stringify(S.SIN))),
    isin: Object.fromEntries([0, 1, 45, 90, 91, 135, 180, 181, 270, 300, 359, 360, -30, 725].map((d) => [d, S.isin(d)])),
    icos: Object.fromEntries([0, 30, 90, 180, -90].map((d) => [d, S.icos(d)])),
    isqrt: Object.fromEntries([0, 1, 2, 3, 4, 15, 16, 17, 268435455, 268435456, 805306368].map((n) => [n, S.isqrt(n)])),
    mix32: Object.fromEntries([0, 1, 0x811c9dc5, 0xffffffff].map((n) => [n, S.mix32(n)])),
    word: { block_height: 970544, block_hash: h, word: w, W: S.mix32(w ^ 0x5bd1e995) % 100, w_first_8: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => S.mix32(w ^ Math.imul(i + 1, 0x9E3779B1 | 0)) % 100) },
  }
}

// ---------- terroir ----------
{
  const pts = [
    ['spec §5.7 destination (4104, 0, 0), plane 0', S.xyzToCoord(4104n, 0n, 0n, 0), 0],
    ['(4096, 0, 0), plane 0', S.xyzToCoord(4096n, 0n, 0n, 0), 0],
    ['(4103, 0, 0): the same 8-gibson cell as 4096', S.xyzToCoord(4103n, 0n, 0n, 0), 0],
    ['(4104, 0, 0), plane 1', S.xyzToCoord(4104n, 0n, 0n, 1), 0],
    ['(4104, 0, 0) at scale 4', S.xyzToCoord(4104n, 0n, 0n, 0), 4],
    ['coordA', coordA, 0], ['coordA', coordA, 4], ['coordA', coordA, 8], ['coordA', coordA, 12], ['coordA', coordA, 30], ['coordA', coordA, 84],
    ['coordB', coordB, 0],
  ]
  out.terroir = pts.map(([what, coord, u]) => ({ what, coord, scale: u, ...S.terroir(coord, u) }))
}

// ---------- expressions ----------
{
  const text = `dna exprs
let a = -7 / 2
let b = -7 % 3
let c = 7 % -3
let d = 5 / 0
let e = 5 % 0
let f = 1000 * 1000 * 3
let h = 0 - 999999 - 5
let i = 2 + 3 * 4 < 15 and not 0
let j = (2 + 3) * 4
let k = 9999999
let m = - - 3
let o = 7 / -2
let q = 1 or 0 and 0
let r = not 2 == 2
let s = size + hue + tone
let t = K * 100 + n0 + n1 + n2 + n3 + pl
axiom F`
  const env = S.makeEnv(S.parseDNA(text), coordA, 0)
  out.expressions = { dna: text, coord: coordA, scale: 0, values: Object.fromEntries('a b c d e f h i j k m o q r s t'.split(' ').map((n) => [n, env[n]])) }
  const bad = {
    'a parameter that shadows a gene': 'dna x\ngene curl 1 1 in 0..9\naxiom A(1)\nA(curl) -> A(curl)',
    'a parameter that shadows a builtin': 'dna x\naxiom A(1)\nA(K) -> A(K)',
    'two axioms': 'dna x\naxiom F\naxiom F',
    'a gene range that runs high to low': 'dna x\ngene leaf 3 3 in 6..1\naxiom F',
    'a gene value past 1,000,000': 'dna x\ngene leaf 3 2000000 in 1..6\naxiom F',
    'an unknown name': 'dna x\nlet a = zz + 1\naxiom F',
    'a let that reads g': 'dna x\nlet a = g + 1\naxiom F',
    'two comparisons in a row': 'dna x\nlet a = 1 < 2 < 3\naxiom F',
    'a space before an argument list': 'dna x\naxiom F (2)',
    'an empty argument': 'dna x\naxiom F(1,,2)',
    'five arguments': 'dna x\naxiom A(1,2,3,4,5)',
    'two arrows': 'dna x\naxiom A\nA -> B -> C',
    'no axiom': 'dna x\nangle 9',
    'a keyword as a name': 'dna x\nlet chance = 1\naxiom F',
    'a non-ASCII letter outside a comment': 'dna x\nlet é = 1\naxiom F',
    'a number that is not whole': 'dna x\nangle 2.5\naxiom F',
    'an unknown line': 'dna x\nbloom 3\naxiom F',
    'a rule that starts with a digit': 'dna x\naxiom F\n3 -> F',
    'a condition without "if"': 'dna x\naxiom A(1)\nA(n) n > 0 -> A(n)',
    'more than 40 rules': 'dna x\naxiom A\n' + Array.from({ length: 41 }, () => 'A -> A').join('\n'),
  }
  out.rejected = Object.entries(bad).map(([why, dna]) => { let err = null; try { S.parseDNA(dna) } catch (e) { err = e.message } if (!err) throw new Error('accepted: ' + why); return { why, dna, error_in_reference: err } })
  const ok = {
    'a turtle symbol as a rule head, two parameters': 'dna x\naxiom !(1, 4)\n!(t, m) if t < m -> !(t+1, m)',
    'an empty argument list': 'dna x\naxiom F()',
    'a "seed" line in place of "dna"': 'seed old name\naxiom F',
    'planting lines, which a reader ignores in a DNA event': 'dna x\nplanted 970400\nscale 0\naxiom F',
    'a declared standard gene outside its standard range is clamped to it': 'dna x\ngene size 500 20 in 1..900\naxiom F',
    'a hash inside a name starts a comment': 'dna my#1 fern\naxiom F',
  }
  out.accepted = Object.entries(ok).map(([why, dna]) => { const p = S.parseDNA(dna); return { why, dna, name: p.name, genes: p.genes.map((g) => [g.name, S.express(g), g.lo, g.hi]) } })
}

// ---------- growth ----------
{
  const P0 = 970400
  const cases = []
  const add = (what, name, prog, coord, planted, scale, caps, clock, full) => {
    const r = S.grow({ prog, coord, planted, scale, caps, clock, blockHash })
    const c = { what, dna: name, coord, planted, scale, caps, clock, age: r.age, generation: r.g, symbols: r.symbols, vertices: r.sno.vertices.length, faces: r.sno.faces.length, sno_bytes: r.json.length, sno_sha256: S.sha256hex(Buffer.from(r.json, 'utf8')), weather_blocks: r.used }
    if (full) c.sno = r.sno
    cases.push(c)
  }
  for (const name of Object.keys(DNAS)) {
    add('day 0, the planted block itself', name, P[name], coordA, P0, 0, CAPS, P0, true)
    add('halfway through day 1: generation 1, its new symbols half grown', name, P[name], coordA, P0, 0, CAPS, P0 + 144 + 72, false)
    add('day 10', name, P[name], coordA, P0, 0, CAPS, P0 + 10 * 144, false)
    add('day 30 and 6 blocks', name, P[name], coordA, P0, 0, CAPS, P0 + 30 * 144 + 6, false)
  }
  add('a planted height the clock has not reached', 'fiddlehead', P.fiddlehead, coordA, P0 + 100, 0, CAPS, P0, false)
  add('day 1 exactly: generation 1 appears with its new symbols at length 0', 'fiddlehead', P.fiddlehead, coordA, P0, 0, CAPS, P0 + 144, true)
  add('another place: only terroir differs', 'fiddlehead', P.fiddlehead, coordB, P0, 0, CAPS, P0 + 30 * 144 + 6, false)
  add('scale 4: SNO unit 4 and terroir on cells 16 times wider', 'fiddlehead', P.fiddlehead, coordA, P0, 4, CAPS, P0 + 30 * 144 + 6, false)
  add('the base caps, at the base price', 'crystal', P.crystal, coordA, P0, 0, S.BASE_CAPS, P0 + 30 * 144 + 6, false)
  add('small caps: 512 vertices, 300 symbols, 8 generations', 'sword fern', P['sword fern'], coordA, P0, 0, { vertices: 512, symbols: 300, generations: 8 }, P0 + 30 * 144 + 6, false)
  out.growth = { blocks_per_generation: S.N, dnas: DNAS, cases }
}

// ---------- the planted-height clamp ----------
{
  const T = BLOCKS.times
  const at = (h, s) => T[h] + s
  const cases = [
    ['an honest planting: the clock block when the seed was signed', 970524, at(970530, 30)],
    ['a planting backdated 120 blocks, with an honest created_at', 970410, at(970530, 30)],
    ['a planted height in the future', 970600, at(970530, 30)],
    ['a planting exactly at the floor', null, at(970530, 30)],
  ].map(([what, stated, created_at]) => {
    const E = S.clampFloor(created_at, T)
    const s = stated === null ? E : stated
    return { what, stated: s, created_at, floor: E, effective: Math.max(s, E) }
  })
  out.clamp = { margin_seconds: S.CLAMP_MARGIN, header_times: T, cases }
}

// ---------- mixing ----------
{
  const C0 = BLOCKS.times[970500] + 60
  const ev = { fiddlehead: written('fiddlehead', C0 - 86400), 'sword fern': written('sword fern', C0 - 86400), oak: written('oak', C0 - 86400), coral: written('coral', C0 - 86400) }
  const commit = (mother, father, anchor, created_at, extra = []) => mine({ created_at, caps: CAPS, content: '', tags: [['e', mother.id, '', 'mother'], ['e', father.id, '', 'father'], ['block', String(anchor), blockHash(anchor)], ...extra] })
  const mixes = []
  const run = (what, Aname, A, Bname, B, mEv, fEv, anchor, created_at, extra = []) => {
    const c = commit(mEv, fEv, anchor, created_at, extra)
    const commitHeight = Math.max(anchor, S.clampFloor(created_at, BLOCKS.times))
    const outcome = commitHeight + S.MIX_DELAY
    const s0 = S.mixWord(blockHash(outcome), c.id)
    const hybrid = extra.some((t) => t[0] === 'hybrid')
    const nameTag = extra.find((t) => t[0] === 'name')
    const r = S.mixDNA(A, B, s0, { hybrid, name: nameTag && nameTag[1] })
    const v = { what, mother: Aname, father: Bname, event: c, commit_height: commitHeight, outcome_height: outcome, outcome_hash: blockHash(outcome), readable_at_clock: outcome, mix_hash: S.sha256hex(Buffer.concat([Buffer.from(S.MIX_DOMAIN), Buffer.from(blockHash(outcome), 'hex'), Buffer.from(c.id, 'hex')])), mix_word: s0 }
    if (r.refused) v.refused = r.refused
    else { v.genes = r.log.map((l) => ({ name: l.name, word: l.s, alleles_from: l.from, a: S.geneLine(l.child).split(' ')[2], b: S.geneLine(l.child).split(' ')[3], lo: l.child.lo, hi: l.child.hi, expressed: l.expressed, mutated: l.mutated })); v.child_text = r.text; v.child_sterile = r.prog.sterile }
    mixes.push(v)
    return { ev: c, prog: r.prog }
  }
  const f1a = run('fiddlehead x sword fern', 'fiddlehead', P.fiddlehead, 'sword fern', P['sword fern'], ev.fiddlehead, ev['sword fern'], 970500, C0)
  const f1b = run('the same parents, one block later', 'fiddlehead', P.fiddlehead, 'sword fern', P['sword fern'], ev.fiddlehead, ev['sword fern'], 970501, BLOCKS.times[970501] + 60)
  run('the two children mixed (F2), with a name tag', 'F1 at 970500', f1a.prog, 'F1 at 970501', f1b.prog, f1a.ev, f1b.ev, 970540, BLOCKS.times[970540] + 60, [['name', 'blue giant hope']])
  run('coral with itself', 'coral', P.coral, 'coral', P.coral, ev.coral, ev.coral, 970502, BLOCKS.times[970502] + 60)
  run('fern with coral, refused: different species', 'fiddlehead', P.fiddlehead, 'coral', P.coral, ev.fiddlehead, ev.coral, 970503, BLOCKS.times[970503] + 60)
  const mule = run('oak with coral as a sterile hybrid', 'oak', P.oak, 'coral', P.coral, ev.oak, ev.coral, 970503, BLOCKS.times[970503] + 60, [['hybrid']])
  run('the hybrid mixed again, refused: sterile', 'oak x coral', mule.prog, 'oak', P.oak, mule.ev, ev.oak, 970503, BLOCKS.times[970503] + 90)
  // a seed of the first child, grown
  const child = f1a.prog
  const g = S.grow({ prog: child, coord: coordA, planted: 970600, scale: 0, caps: CAPS, clock: 970600 + 30 * 144 + 6, blockHash })
  out.mixing = {
    parents: Object.fromEntries(Object.entries(ev).map(([k, e]) => [k, e])),
    mixes,
    child_growth: { what: 'a seed of fiddlehead x sword fern (the first mix) planted at 970600 at coordA, day 30 and 6 blocks', planted: 970600, clock: 970600 + 30 * 144 + 6, caps: CAPS, generation: g.g, vertices: g.sno.vertices.length, sno_sha256: S.sha256hex(Buffer.from(g.json, 'utf8')) },
  }
}

// ---------- the price of caps ----------
{
  const rows = [
    S.BASE_CAPS, CAPS, { vertices: 2049, symbols: 2048, generations: 32 }, { vertices: 4096, symbols: 4096, generations: 64 },
    { vertices: 65536, symbols: 65536, generations: 1024 }, { vertices: 1, symbols: 1, generations: 1 },
    { vertices: 65537, symbols: 2048, generations: 32 }, { vertices: 0, symbols: 2048, generations: 32 },
  ].map((c) => ({ caps: c, bits: S.price(c) }))
  const e = mine({ created_at: 1790000000, caps: S.BASE_CAPS, tags: [], content: DNAS.crystal })
  out.price = { rows, mined_at_base_price: { event: e, leading_zero_bits: S.leadingZeroBits(e.id) } }
}

process.stdout.write(JSON.stringify(out, null, 1) + '\n')
