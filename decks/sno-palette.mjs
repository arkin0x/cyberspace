// A 256-colour palette built for shading low-poly neon objects, not for pixel
// art. Generated in OKLCH so the steps are perceptually even, then clipped
// into sRGB by dropping chroma rather than clamping channels, which is what
// stops the bright end turning to mud.

const f = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055)
function oklabToRgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3
  return [
    f(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    f(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    f(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  ]
}
const inGamut = (rgb) => rgb.every((c) => c >= -0.0005 && c <= 1.0005)
/** The most saturated version of this colour that sRGB can actually show. */
function lch(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180
  let lo = 0, hi = C
  if (inGamut(oklabToRgb(L, C * Math.cos(h), C * Math.sin(h)))) lo = C
  else for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2
    if (inGamut(oklabToRgb(L, mid * Math.cos(h), mid * Math.sin(h)))) lo = mid; else hi = mid
  }
  const rgb = oklabToRgb(L, lo * Math.cos(h), lo * Math.sin(h))
  return rgb.map((c) => Math.max(0, Math.min(255, Math.round(c * 255))))
}
const hexOf = ([r, g, b]) => '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')

const HUES = 24, STEPS = 8
const palette = []
const names = []
for (let h = 0; h < HUES; h++) {
  // Start at cyan, the colour the whole world is lit by, and go round.
  const baseHue = 195 + (h * 360) / HUES
  for (let s = 0; s < STEPS; s++) {
    const t = s / (STEPS - 1)
    const L = 0.30 + t * 0.55
    // Chroma peaks in the middle: sRGB cannot hold much at either end, and
    // forcing it there is what makes a generated palette look cheap.
    const C = 0.33 * (0.72 + 0.28 * Math.sin(Math.PI * (0.20 + t * 0.62)))
    // Shadows drift toward the blue the world is lit by; highlights drift warm.
    const hue = baseHue + (t - 0.5) * 18
    palette.push(lch(L, C, hue))
    names.push(`hue ${h} step ${s}`)
  }
}
// 24 steels, faintly cyan so they belong to the same world rather than looking dead.
for (let i = 0; i < 32; i++) {
  const t = i / 31
  palette.push(lch(0.06 + t * 0.92, 0.012 * Math.sin(Math.PI * t), 215))
  names.push(`steel ${i}`)
}
// The signatures: the client's own colours, exact, so an object can match the
// instruments around it, plus true black and true white.
const SIGNATURE = [
  // The client's own instruments, exact, so an object can match them.
  '#000000', '#ffffff', '#00e5ff', '#ff3b6b', '#f7931a', '#52e39f', '#c8f5ff', '#6f8ea0',
  '#1d3547', '#05070d',
  // The neons that sRGB can hit and the even ramps above cannot, because they
  // sit right on the gamut corners.
  '#ff00ff', '#00ff00', '#00ffff', '#ffff00', '#ff0000', '#0000ff',
  '#39ff14', '#ff6ec7', '#7df9ff', '#b026ff', '#fffb00', '#ff3300',
  '#00ff9f', '#ff007f', '#4d4dff', '#ffd300',
  // Deep grounds for a scene that is mostly dark.
  '#0a0f1a', '#12182a', '#1a0f24', '#0f1f1c', '#241016', '#1c1c0f',
]
for (const s of SIGNATURE) {
  palette.push([1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)))
  names.push(`signature ${s}`)
}
if (palette.length !== 256) throw new Error(`built ${palette.length} entries, not 256`)
const hexes = palette.map(hexOf)
process.stdout.write(JSON.stringify({
  name: 'cyberspace-neon-256',
  layout: { ramps: { from: 0, to: 191, hues: HUES, steps: STEPS }, steels: { from: 192, to: 223 }, signatures: { from: 224, to: 255 } },
  colors: hexes,
}, null, 0) + '\n')
