/**
 * The citizen silhouette, defined once.
 *
 * `PixelCitizen` (DOM avatar: HUD, roster, identity card) and the canvas
 * renderers (city street avatar, interior floor-plan avatar) all draw from
 * `citizenPixels`, so the look you pick in PROFILE is the look that walks the
 * city. Colours come from the profile; `built` picks the silhouette
 * (0 = lithe, 1 = broad, 2 = tall).
 */

export const CITIZEN_SIZE = 16

export type CitizenFacing = 'left' | 'right' | 'up' | 'down'

export interface CitizenPixel {
  x: number
  y: number
  w: number
  h: number
  color: string
  alpha?: number
  /** Leg index (0 left, 1 right) so canvas can animate a walk cycle. */
  leg?: 0 | 1
}

export interface CitizenLook {
  body: string
  visor: string
  built?: number
}

const OUTLINE = '#05060f'

export function citizenPixels(look: CitizenLook): CitizenPixel[] {
  const body = look.body
  const visor = look.visor
  const built = Math.min(2, Math.max(0, Math.round(look.built ?? 0)))
  const torsoW = built === 1 ? 8 : 6
  const torsoX = (CITIZEN_SIZE - torsoW) / 2
  const legY = built === 2 ? 10 : 11
  const legW = Math.max(2, Math.round(torsoW / 3))
  const legH = CITIZEN_SIZE - legY - 1
  const pixels: CitizenPixel[] = [
    // legs
    { x: torsoX, y: legY, w: legW, h: legH, color: body, leg: 0 },
    { x: torsoX + torsoW - legW, y: legY, w: legW, h: legH, color: body, leg: 1 },
    // boots
    { x: torsoX, y: 15, w: torsoW, h: 1, color: OUTLINE },
    // torso
    { x: torsoX, y: 6, w: torsoW, h: legY - 6, color: body },
    // belt line
    { x: torsoX, y: legY - 2, w: torsoW, h: 1, color: OUTLINE, alpha: 0.45 },
    // head
    { x: 5, y: 2, w: 6, h: 4, color: body },
    // visor band
    { x: 5, y: 3, w: 6, h: 2, color: visor },
    { x: 6, y: 3, w: 1, h: 1, color: '#ffffff', alpha: 0.8 },
    // shoulders signal
    { x: 4, y: 6, w: 1, h: 2, color: visor },
    { x: 11, y: 6, w: 1, h: 2, color: visor },
  ]
  return pixels
}

/** True when the renderer should mirror the front-facing sprite. */
export function citizenMirrored(facing?: CitizenFacing) {
  return facing === 'left'
}

/**
 * Paint the citizen with its feet at (`x`, `groundY`). `scale` 1 draws a
 * 16 px sprite. `time` drives a four-frame walk cycle when `walking`.
 */
export function drawCitizen(
  ctx: CanvasRenderingContext2D,
  look: CitizenLook,
  x: number,
  groundY: number,
  scale: number,
  opts: {
    facing?: CitizenFacing
    walking?: boolean
    /** Seconds; only the walk cycle uses it. */
    time?: number
    /** Ground shadow under the boots. */
    shadow?: boolean
  } = {},
) {
  const s = Math.max(0.25, scale)
  const walking = !!opts.walking
  const time = opts.time ?? 0
  const frame = walking ? Math.floor(time * 7) % 4 : 0
  const bob = walking && (frame === 1 || frame === 3) ? -1 : 0
  const pixels = citizenPixels(look)

  if (opts.shadow !== false) {
    const w = Math.round(11 * s)
    const h = Math.max(1, Math.round(2 * s))
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(Math.round(x - w / 2), Math.round(groundY), w, h)
  }

  const originX = x - (CITIZEN_SIZE / 2) * s
  const originY = groundY - CITIZEN_SIZE * s + bob
  const mirror = citizenMirrored(opts.facing)
  const back = opts.facing === 'up'

  ctx.save()
  for (const p of pixels) {
    // Walking away: no visor highlight, so the helmet reads as a back plate.
    if (back && p.color === '#ffffff') continue
    const px = mirror ? CITIZEN_SIZE - p.x - p.w : p.x
    let py = p.y
    if (walking && p.leg !== undefined) {
      if (p.leg === 0 ? frame === 1 : frame === 3) py += 1
    }
    const left = Math.round(originX + px * s)
    const right = Math.round(originX + (px + p.w) * s)
    const top = Math.round(originY + py * s)
    const bottom = Math.round(originY + (py + p.h) * s)
    ctx.globalAlpha = back && p.color === look.visor ? 0.55 : p.alpha ?? 1
    ctx.fillStyle = p.color
    ctx.fillRect(left, top, Math.max(1, right - left), Math.max(1, bottom - top))
  }
  ctx.globalAlpha = 1

  // Facing pip at the boots: a visor-coloured step in the direction of travel.
  if (opts.facing === 'left' || opts.facing === 'right') {
    const size = Math.max(1, Math.round(2 * s))
    const footX = originX + (opts.facing === 'right' ? 13 : 3) * s
    ctx.fillStyle = look.visor
    ctx.fillRect(Math.round(footX), Math.round(originY + 13 * s), size, size)
  }
  ctx.restore()
}
