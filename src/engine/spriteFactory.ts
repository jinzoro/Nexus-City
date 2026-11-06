import type { Pedestrian } from '../types'

/**
 * Cached pixel-art pedestrian sprites.
 *
 * Every NPC used to be two rectangles. Now each one resolves to a small
 * hand-built sprite with a role, a walk cycle and a readable silhouette.
 * Sprites are generated once per (variant, frame, scale) and reused for the
 * whole session, so 7,200 pedestrians cost almost nothing to draw.
 */

export type PedVariant = 'hood' | 'coat' | 'suit' | 'worker' | 'punk' | 'kid'
export type PedDir = 'left' | 'right'
export type PedScale = 1 | 2

interface PedStyle {
  variant: PedVariant
  jacket: string
  jacketDark: string
  pants: string
  shoes: string
  skin: string
  hair: string
  accent: string
  trim: string
}

const VARIANTS: PedVariant[] = ['hood', 'coat', 'suit', 'worker', 'punk', 'kid']

const SKIN = ['#e5bd97', '#c9956b', '#9a6544', '#f0cba8', '#b07a51']
const HAIR = ['#15121e', '#2a1b15', '#57301e', '#c9c9d6', '#24404a', '#6c2a44']

const JACKETS: Record<PedVariant, string[]> = {
  hood: ['#1f3b4d', '#26334a', '#3a2f44', '#204040'],
  coat: ['#7a3b32', '#4a3a2e', '#2f3d3a', '#5a3448'],
  suit: ['#22283d', '#2d3145', '#191e2e', '#30364a'],
  worker: ['#c8752a', '#d99a2b', '#b8651f'],
  punk: ['#a5215c', '#3a2a5e', '#1f6b6b', '#7a2140'],
  kid: ['#4e7bd9', '#d94e7b', '#e0a72e', '#42a58c'],
}

const PANTS: Record<PedVariant, string[]> = {
  hood: ['#151a26', '#22293a', '#1d2230'],
  coat: ['#22242c', '#2e3138', '#1b1d24'],
  suit: ['#161a26', '#232838', '#10141e'],
  worker: ['#2a2f3a', '#3c3226', '#242a33'],
  punk: ['#1a1622', '#2a2440', '#30222e'],
  kid: ['#2a3450', '#3a2a44', '#263a44'],
}

function hashString(id: string) {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

export function pedVariant(id: string): PedVariant {
  return VARIANTS[Math.floor(hashString(id) * VARIANTS.length) % VARIANTS.length]
}

function shade(hex: string, factor: number) {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * factor)))
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * factor)))
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * factor)))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function styleFor(variant: PedVariant, seed: number, tint: string): PedStyle {
  const jackets = JACKETS[variant]
  const pants = PANTS[variant]
  const jacket = jackets[Math.floor(seed * jackets.length) % jackets.length]
  const skin = SKIN[Math.floor(seed * 97 * SKIN.length) % SKIN.length]
  const hair = HAIR[Math.floor(seed * 53 * HAIR.length) % HAIR.length]
  return {
    variant,
    jacket,
    jacketDark: shade(jacket, 0.66),
    pants: pants[Math.floor(seed * 31 * pants.length) % pants.length],
    shoes: variant === 'worker' ? '#1b1b1f' : variant === 'suit' ? '#07090f' : '#121218',
    skin,
    hair: variant === 'hood' ? shade(jacket, 0.8) : hair,
    accent: tint,
    trim: variant === 'worker' ? '#ffe066' : variant === 'punk' ? '#ff4fa3' : shade(jacket, 1.4),
  }
}

const cache = new Map<string, HTMLCanvasElement>()

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  g.imageSmoothingEnabled = false
  return { c, g }
}

function px(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  g.fillStyle = color
  g.fillRect(x, y, w, h)
}

/** 5×8 sprite: readable at street zoom without stealing the scene. */
function drawSmall(g: CanvasRenderingContext2D, s: PedStyle, frame: number) {
  const { jacket, jacketDark, pants, shoes, skin, hair, accent, trim, variant } = s
  // head
  px(g, 1, 0, 3, 1, hair)
  px(g, 1, 1, 3, 1, skin)
  px(g, 1, 2, 3, 1, skin)
  if (variant === 'suit') px(g, 1, 2, 1, 1, shade(hair, 0.9))
  if (variant === 'punk') px(g, 1, 0, 3, 1, accent)
  if (variant === 'worker') {
    px(g, 1, 0, 3, 1, '#ffd34d')
    px(g, 1, 2, 3, 1, '#ffd34d')
  }
  // torso + shoulders
  px(g, 0, 2, 1, 2, jacketDark)
  px(g, 4, 2, 1, 2, jacketDark)
  px(g, 1, 2, 3, 3, jacket)
  px(g, 1, 2, 3, 1, shade(jacket, 1.18))
  if (variant === 'worker') px(g, 1, 3, 3, 1, trim)
  if (variant === 'suit') px(g, 2, 2, 1, 2, '#eef4ff')
  if (variant === 'hood') {
    px(g, 1, 0, 3, 1, jacketDark)
    px(g, 0, 1, 1, 2, jacketDark)
    px(g, 4, 1, 1, 2, jacketDark)
  }
  if (variant === 'punk') px(g, 2, 3, 1, 1, accent)
  // legs — alternate short/long for the walk cycle
  const stride = frame === 1 ? 1 : frame === 3 ? -1 : 0
  const leftLen = 2 + (stride > 0 ? 0 : stride < 0 ? -1 : 0)
  const rightLen = 2 + (stride < 0 ? 0 : stride > 0 ? -1 : 0)
  px(g, 1, 5, 1, leftLen, pants)
  px(g, 3, 5, 1, rightLen, pants)
  px(g, 1, 5 + leftLen, 1, 1, shoes)
  px(g, 3, 5 + rightLen, 1, 1, shoes)
  if (variant === 'coat' && frame % 2 === 0) px(g, 1, 5, 3, 1, shade(jacket, 0.9))
}

/** 9×14 sprite for close-in street zoom: face, bags, hi-vis, accessories. */
function drawLarge(g: CanvasRenderingContext2D, s: PedStyle, frame: number) {
  const { jacket, jacketDark, pants, shoes, skin, hair, accent, trim, variant } = s
  const bob = frame === 1 || frame === 3 ? 0 : 1
  const y0 = bob
  // hair / headwear
  px(g, 3, y0 + 0, 3, 1, variant === 'hood' ? jacketDark : hair)
  if (variant === 'worker') px(g, 2, y0, 5, 1, '#ffd34d')
  if (variant === 'punk') {
    px(g, 3, y0, 3, 1, accent)
    px(g, 4, y0 - 1, 1, 1, accent)
  }
  if (variant === 'kid') px(g, 3, y0, 3, 1, accent)
  // face
  px(g, 3, y0 + 1, 3, 3, skin)
  px(g, 5, y0 + 2, 1, 1, '#1a1420')
  if (variant === 'suit') px(g, 3, y0 + 1, 1, 1, shade(hair, 0.85))
  if (variant === 'hood') {
    px(g, 2, y0 + 1, 1, 3, jacketDark)
    px(g, 6, y0 + 1, 1, 3, jacketDark)
    px(g, 3, y0 + 3, 3, 1, jacketDark)
  }
  // neck + torso
  px(g, 4, y0 + 4, 1, 1, shade(skin, 0.82))
  px(g, 2, y0 + 5, 5, 4, jacket)
  px(g, 2, y0 + 5, 5, 1, shade(jacket, 1.2))
  px(g, 2, y0 + 8, 5, 1, jacketDark)
  // arms (swing with stride)
  const arm = frame === 1 ? 1 : frame === 3 ? -1 : 0
  px(g, 1, y0 + 5 + Math.max(0, arm), 1, 3, jacketDark)
  px(g, 7, y0 + 5 + Math.max(0, -arm), 1, 3, jacketDark)
  px(g, 1, y0 + 8 + Math.max(0, arm), 1, 1, skin)
  px(g, 7, y0 + 8 + Math.max(0, -arm), 1, 1, skin)
  // details
  if (variant === 'worker') {
    px(g, 2, y0 + 6, 5, 1, trim)
    px(g, 2, y0 + 7, 1, 1, trim)
  }
  if (variant === 'suit') {
    px(g, 4, y0 + 5, 1, 3, '#eef4ff')
    px(g, 4, y0 + 5, 1, 1, shade(hair, 0.85))
  }
  if (variant === 'punk') {
    px(g, 4, y0 + 6, 1, 1, accent)
    px(g, 6, y0 + 7, 1, 1, '#ffe066')
  }
  if (variant === 'coat') {
    px(g, 2, y0 + 8, 5, 2, jacket)
    px(g, 2, y0 + 9, 1, 1, jacketDark)
    px(g, 6, y0 + 9, 1, 1, jacketDark)
  }
  if (variant === 'hood') px(g, 2, y0 + 7, 5, 1, accent)
  if (variant === 'kid') {
    px(g, 2, y0 + 6, 5, 2, shade(jacket, 1.1))
  }
  // legs
  const stride = frame === 1 ? 1 : frame === 3 ? -1 : 0
  px(g, 3, y0 + 9, 1, 3 - Math.max(0, stride), pants)
  px(g, 5, y0 + 9, 1, 3 - Math.max(0, -stride), pants)
  px(g, 2, y0 + 9, 1, 2, pants)
  px(g, 6, y0 + 9, 1, 2, pants)
  px(g, 2, y0 + 11, 1, 1, shoes)
  px(g, 6, y0 + 11, 1, 1, shoes)
  px(g, 3, y0 + 12, 1, 1, shoes)
  px(g, 5, y0 + 12, 1, 1, shoes)
  // accessory
  if (variant === 'coat') {
    // shoulder bag
    px(g, 6, y0 + 6, 1, 2, '#3a2a22')
    px(g, 6, y0 + 6, 1, 1, '#6b4a32')
  }
  if (variant === 'worker' || variant === 'punk') {
    px(g, 2, y0 + 5, 1, 1, accent)
  }
}

function build(variant: PedVariant, frame: number, scale: PedScale, seed: number, tint: string) {
  const { c, g } = scale === 2 ? makeCanvas(9, 14) : makeCanvas(5, 8)
  const style = styleFor(variant, seed, tint)
  if (scale === 2) drawLarge(g, style, frame)
  else drawSmall(g, style, frame)
  return c
}

export function pedSprite(
  variant: PedVariant,
  frame: number,
  scale: PedScale,
  seed: number,
  tint: string,
): HTMLCanvasElement {
  const f = ((frame % 4) + 4) % 4
  const key = `${variant}|${f}|${scale}|${Math.floor(seed * 997) % 13}|${tint}`
  let sprite = cache.get(key)
  if (!sprite) {
    sprite = build(variant, f, scale, seed, tint)
    cache.set(key, sprite)
  }
  return sprite
}

/** Direction the NPC reads as moving on screen, from its world axis. */
export function pedFacing(n: Pedestrian): PedDir {
  const screenDx = n.axis === 'x' ? n.dir : -n.dir
  return screenDx >= 0 ? 'right' : 'left'
}

const metaCache = new WeakMap<Pedestrian, { variant: PedVariant; seed: number }>()

export function pedMeta(n: Pedestrian) {
  let meta = metaCache.get(n)
  if (!meta) {
    meta = { variant: pedVariant(n.id), seed: hashString(n.id) }
    metaCache.set(n, meta)
  }
  return meta
}
