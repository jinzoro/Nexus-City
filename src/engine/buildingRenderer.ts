import type { Building, Prop, RailLine } from '../types'
import { TILE_H, TILE_W, getDistrict } from '../data/city'
import { drawPixelText } from './pixelFont'
import {
  type Pt,
  type View,
  clamp,
  districtDim,
  getBuildingBounds,
  hash2,
  isBoundsVisible,
  line,
  pRaw,
  polygon,
  project,
  rgba,
  shade,
} from './renderUtils'

function facePoints(view: View, x: number, y: number, w: number, d: number, z0: number, z1: number) {
  const A0 = project(view, x, y, z0)
  const B0 = project(view, x + w, y, z0)
  const C0 = project(view, x + w, y + d, z0)
  const D0 = project(view, x, y + d, z0)
  const A1 = project(view, x, y, z1)
  const B1 = project(view, x + w, y, z1)
  const C1 = project(view, x + w, y + d, z1)
  const D1 = project(view, x, y + d, z1)
  return { A0, B0, C0, D0, A1, B1, C1, D1 }
}

interface PrismOptions {
  outline?: string
  alpha?: number
  accent?: string
  accentAlpha?: number
  roofAccent?: string
}

function drawPrism(
  ctx: CanvasRenderingContext2D,
  view: View,
  x: number,
  y: number,
  w: number,
  d: number,
  z0: number,
  z1: number,
  body: [string, string, string],
  roof: string,
  options: PrismOptions = {},
) {
  const pts = facePoints(view, x, y, w, d, z0, z1)
  const dim = options.alpha ?? 1
  ctx.save()
  ctx.globalAlpha = dim
  polygon(ctx, [pts.D0, pts.C0, pts.C1, pts.D1], shade(body[1], 0.78))
  polygon(ctx, [pts.B0, pts.C0, pts.C1, pts.B1], body[0])
  polygon(ctx, [pts.A1, pts.B1, pts.C1, pts.D1], roof)
  const outline = options.outline ?? 'rgba(2,4,10,0.8)'
  polygon(ctx, [pts.D0, pts.C0, pts.C1, pts.D1], undefined, outline)
  polygon(ctx, [pts.B0, pts.C0, pts.C1, pts.B1], undefined, outline)
  polygon(ctx, [pts.A1, pts.B1, pts.C1, pts.D1], undefined, outline)
  if (options.accent) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    line(ctx, pts.A1, pts.B1, rgba(options.accent, options.accentAlpha ?? 0.55), 1)
    line(ctx, pts.B1, pts.C1, rgba(options.accent, (options.accentAlpha ?? 0.55) * 0.55), 1)
    ctx.restore()
  }
  ctx.restore()
  return pts
}

function drawWindows(
  ctx: CanvasRenderingContext2D,
  view: View,
  b: Building,
  bottomA: Pt,
  bottomB: Pt,
  topA: Pt,
  topB: Pt,
  cols: number,
  rows: number,
  lod: number,
  dim: number,
  side = 0,
) {
  if (cols < 1 || rows < 1) return
  const seed = b.seed
  const faceW = Math.hypot(bottomB[0] - bottomA[0], bottomB[1] - bottomA[1])
  const faceH = Math.hypot(topA[0] - bottomA[0], topA[1] - bottomA[1])
  if (faceW < 3 || faceH < 4) return

  const pattern = b.facade
  const cellW = faceW / cols
  const cellH = faceH / rows
  const point = (t: number, v: number): Pt => [
    bottomA[0] + (bottomB[0] - bottomA[0]) * t + (topA[0] - bottomA[0]) * v,
    bottomA[1] + (bottomB[1] - bottomA[1]) * t + (topA[1] - bottomA[1]) * v,
  ]

  // Floors have moods: a few are dark, a few are having a party.
  const moodFor = (row: number) => hash2(seed + side * 131, row * 17 + 3)
  const bandMode = pattern === 'ribbon' || pattern === 'glass'

  if (bandMode) {
    const thickness = Math.max(1, Math.round(cellH * (pattern === 'ribbon' ? 0.5 : 0.62)))
    for (let row = 0; row < rows; row++) {
      const mood = moodFor(row)
      if (mood < 0.16 && lod < 3) continue
      const v0 = (row + 0.16) / rows
      const v1 = (row + 0.54) / rows
      const quad = [point(0.03, v0), point(0.97, v0), point(0.97, v1), point(0.03, v1)]
      const color = mood > 0.86 ? '#ffd9a0' : mood > 0.7 ? b.neon : b.window
      ctx.globalAlpha = dim * (0.16 + mood * 0.42)
      polygon(ctx, quad, color)
      if (lod >= 3) {
        // desk lights / ceiling strips inside the band
        const lights = Math.max(2, Math.floor(cols * 0.8))
        for (let i = 0; i < lights; i++) {
          const r = hash2(seed + row * 29, i * 7 + side)
          if (r < 0.42) continue
          const t = (i + 0.4 + r * 0.4) / lights
          const p = point(t, v0 + (v1 - v0) * 0.55)
          ctx.globalAlpha = dim * (0.5 + r * 0.4)
          ctx.fillStyle = r > 0.84 ? '#fff2c8' : color
          ctx.fillRect(Math.round(p[0]), Math.round(p[1]), Math.max(1, Math.round(thickness * 0.55)), 1)
        }
      }
      if (pattern === 'glass' && lod >= 2) {
        ctx.globalAlpha = dim * 0.13
        ctx.strokeStyle = b.window
        ctx.lineWidth = 1
        ctx.beginPath()
        const mullions = Math.min(9, Math.max(2, Math.round(faceW / (4 * (view.camera.zoom + 0.4)))))
        for (let m = 1; m < mullions; m++) {
          const t = m / mullions
          const a = point(t, row / rows)
          const c = point(t, (row + 1) / rows)
          ctx.moveTo(Math.round(a[0]) + 0.5, Math.round(a[1]) + 0.5)
          ctx.lineTo(Math.round(c[0]) + 0.5, Math.round(c[1]) + 0.5)
        }
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1
    return
  }

  const litThreshold = pattern === 'diagrid' ? 0.66 : pattern === 'capsule' ? 0.44 : lod === 1 ? 0.38 : 0.46
  const winW = Math.max(1, Math.round(cellW * (lod >= 3 ? 0.5 : 0.4)))
  const winH = Math.max(1, Math.round(cellH * (lod >= 3 ? 0.42 : 0.3)))
  const checkerOffset = seed % 2

  for (let row = 0; row < rows; row++) {
    const mood = moodFor(row)
    if (mood < 0.1 && lod < 3) continue
    const clustered = mood > 0.74
    for (let col = 0; col < cols; col++) {
      const r = hash2(seed + col * 37 + row * 131, col * 11 + row * 7 + side * 3)
      let lit = r > litThreshold
      if (pattern === 'checker') lit = (col + row + checkerOffset) % 2 === 0 ? r > 0.18 : r > 0.9
      if (pattern === 'mosaic') lit = r > 0.3
      if (clustered) lit = r > 0.08
      if (!lit) {
        if (lod < 3) continue
        const c = point((col + 0.5) / cols, (row + 0.5) / rows)
        ctx.globalAlpha = dim * 0.55
        ctx.fillStyle = 'rgba(5,7,15,0.9)'
        ctx.fillRect(Math.round(c[0] - winW / 2), Math.round(c[1] - winH / 2), winW, winH)
        continue
      }
      const tone = hash2(seed + row * 53, col * 7 + side)
      const color = tone > 0.88 ? '#ffd9a0' : tone > 0.72 ? b.neon : b.window
      const c = point((col + 0.5) / cols, (row + 0.5) / rows)
      const px = Math.round(c[0] - winW / 2)
      const py = Math.round(c[1] - winH / 2)
      ctx.globalAlpha = Math.min(1, dim * (0.22 + mood * 0.45 + r * 0.3))
      ctx.fillStyle = color
      if (pattern === 'louver') {
        ctx.fillRect(px, py + 1, Math.max(1, winW), 1)
      } else if (pattern === 'fins') {
        ctx.fillRect(px + Math.floor(winW / 2), py - 1, 1, Math.max(2, winH + 1))
      } else if (pattern === 'capsule') {
        ctx.fillRect(px, py, Math.max(1, winW), Math.max(1, winH))
        ctx.globalAlpha *= 0.5
        ctx.fillRect(px, py - 1, Math.max(1, winW), 1)
      } else {
        ctx.fillRect(px, py, Math.max(1, winW), Math.max(1, winH))
      }
      if (lod === 3 && r > 0.9) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = 0.14
        ctx.fillStyle = color
        ctx.fillRect(px - 1, py - 1, Math.max(2, winW + 2), Math.max(2, winH + 2))
        ctx.restore()
      }
    }
  }
  ctx.globalAlpha = 1
}

function drawFacadeDetails(ctx: CanvasRenderingContext2D, view: View, b: Building, pts: ReturnType<typeof facePoints>, lod: number, dim: number) {
  if (lod < 2) return
  const zoom = view.camera.zoom
  ctx.save()
  ctx.globalAlpha = dim

  const front = (t: number, v: number): Pt => [
    pts.B0[0] + (pts.C0[0] - pts.B0[0]) * t + (pts.B1[0] - pts.B0[0]) * v,
    pts.B0[1] + (pts.C0[1] - pts.B0[1]) * t + (pts.B1[1] - pts.B0[1]) * v,
  ]
  const flank = (t: number, v: number): Pt => [
    pts.D0[0] + (pts.C0[0] - pts.D0[0]) * t + (pts.D1[0] - pts.D0[0]) * v,
    pts.D0[1] + (pts.C0[1] - pts.D0[1]) * t + (pts.D1[1] - pts.D0[1]) * v,
  ]

  if (['central', 'corporate', 'tech', 'entertainment', 'market'].includes(b.district)) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    line(ctx, pts.C0, pts.C1, rgba(b.neon, b.landmark ? 0.6 : 0.32), 1)
    line(ctx, pts.D0, pts.D1, rgba(b.accent, 0.12), 1)
    ctx.restore()
  }

  if (b.facade === 'balcony') {
    const rows = Math.min(16, Math.max(3, Math.floor(b.h / 11)))
    for (let i = 1; i < rows; i++) {
      const v = i / rows
      line(ctx, front(0.08, v), front(0.92, v), rgba(b.accent, 0.22), 1)
      if (lod >= 3 && zoom > 1.1) {
        const posts = Math.min(8, Math.max(3, Math.round(zoom * 3)))
        for (let k = 1; k < posts; k++) {
          const p = front(0.08 + (0.84 * k) / posts, v)
          ctx.fillStyle = rgba(b.accent, 0.16)
          ctx.fillRect(Math.round(p[0]), Math.round(p[1] - 2), 1, 2)
        }
        if (hash2(b.seed, i) > 0.62) {
          const p = front(0.2 + hash2(b.seed, i * 3) * 0.6, v - 1 / rows)
          ctx.fillStyle = 'rgba(99,255,155,0.75)'
          ctx.fillRect(Math.round(p[0]), Math.round(p[1]), 1, 1)
        }
      }
    }
  } else if (b.facade === 'fins') {
    const count = Math.min(12, Math.max(3, Math.round(zoom * 5)))
    for (let i = 1; i < count; i++) {
      const t = i / count
      line(ctx, front(t, 0.04), front(t, 0.96), rgba(b.accent, 0.1), 1)
      if (lod >= 3) {
        const a = front(t, 0.04)
        ctx.fillStyle = rgba(b.neon, 0.45)
        ctx.fillRect(Math.round(a[0]), Math.round(a[1]), 1, 2)
      }
    }
  } else if (b.facade === 'diagrid') {
    line(ctx, front(0.02, 0.05), front(0.98, 0.95), rgba(b.accent, 0.14), 1)
    line(ctx, front(0.98, 0.05), front(0.02, 0.95), rgba(b.accent, 0.14), 1)
    const braces = 3
    for (let i = 0; i < braces; i++) {
      const t = (i + 0.5) / braces
      line(ctx, front(t - 0.12, 0.5), front(t + 0.12, 0.86), rgba(b.neon, 0.18), 1)
    }
  } else if (b.facade === 'louver') {
    const rows = Math.min(14, Math.max(3, Math.floor(b.h / 13)))
    for (let i = 1; i < rows; i++) {
      const v = i / rows
      line(ctx, front(0.05, v), front(0.95, v), rgba(b.accent, 0.07), 1)
    }
  }

  if (b.district === 'market') {
    for (const h of [0.2, 0.55]) {
      const a = front(0.12, h)
      const c = front(0.88, h)
      polygon(
        ctx,
        [a, c, [c[0], c[1] + 2], [a[0], a[1] + 2]],
        rgba(b.accent, 0.5),
      )
      const marks = 5
      for (let i = 0; i < marks; i++) {
        const t = 0.12 + (0.76 * i) / marks
        const p = front(t, h)
        ctx.fillStyle = i % 2 ? rgba(b.neon, 0.55) : rgba(b.accent, 0.7)
        ctx.fillRect(Math.round(p[0]), Math.round(p[1]), 1, 2)
      }
    }
  }

  if (b.district === 'industrial') {
    for (let i = 0; i < 3; i++) {
      const t = 0.18 + i * 0.3
      line(ctx, flank(t, 0.05), flank(t, 0.7), 'rgba(70,62,54,0.55)', 2)
      const joint = flank(t, 0.3 + hash2(b.seed, i) * 0.3)
      ctx.fillStyle = 'rgba(255,150,70,0.5)'
      ctx.fillRect(Math.round(joint[0]), Math.round(joint[1]), 2, 1)
    }
    const warn = flank(0.72, 0.03)
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? '#ffb347' : '#211a16'
      ctx.fillRect(Math.round(warn[0] + i * 2), Math.round(warn[1]), 2, 2)
    }
  }

  if (b.hasGarden) {
    for (let i = 0; i < 6; i++) {
      const p = front(0.15 + hash2(b.seed, i + 40) * 0.7, 0.15 + hash2(b.seed, i + 70) * 0.7)
      ctx.fillStyle = i % 2 ? 'rgba(99,255,155,0.65)' : 'rgba(42,138,85,0.7)'
      ctx.fillRect(Math.round(p[0]), Math.round(p[1]), 1, 1)
    }
  }

  if (b.age > 0.52 && lod >= 3) {
    for (let i = 0; i < 3; i++) {
      const t = 0.1 + hash2(b.seed, i + 11) * 0.8
      const p = front(t, 0.02)
      ctx.fillStyle = `rgba(4,6,12,${0.1 + b.age * 0.16})`
      ctx.fillRect(Math.round(p[0]), Math.round(p[1] - 4 - hash2(b.seed, i) * 6), 1, 4 + hash2(b.seed, i + 2) * 8)
    }
  }

  if (hash2(b.seed, 9) > 0.7 && zoom > 0.9) {
    const t = 0.82
    line(ctx, flank(t, 0.02), flank(t, 0.85), rgba(b.accent, 0.2), 2)
    if (lod >= 3) {
      const cab = flank(t, 0.25 + (b.seed % 20) / 40)
      ctx.fillStyle = rgba(b.window, 0.65)
      ctx.fillRect(Math.round(cab[0]) - 1, Math.round(cab[1]), 2, 3)
    }
  }

  ctx.restore()
}

function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

/**
 * Street-level frontage. Two or three bespoke units per visible face:
 * lit interiors, awnings, shutters, doors, crates and the occasional
 * late-night glow. Only drawn at street LOD so the overview stays cheap.
 */
function drawStorefront(ctx: CanvasRenderingContext2D, view: View, b: Building, pts: ReturnType<typeof facePoints>, lod: number, dim: number) {
  if (lod < 2 || b.street === 'none') return
  const zoom = view.camera.zoom
  const faces: Array<{ a: Pt; c: Pt; strength: number }> = [
    { a: pts.B0, c: pts.C0, strength: 1 },
    { a: pts.D0, c: pts.C0, strength: 0.6 },
  ]
  ctx.save()
  for (const face of faces) {
    const width = Math.hypot(face.c[0] - face.a[0], face.c[1] - face.a[1])
    if (width < 6) continue
    const wide = b.street === 'garage' || b.street === 'dock'
    const units = Math.max(1, Math.min(4, Math.round(width / (wide ? 18 : 12))))
    const height = Math.min(9, Math.max(3, 5 * zoom))
    for (let i = 0; i < units; i++) {
      const t0 = i / units + 0.015
      const t1 = (i + 1) / units - 0.015
      const p0 = lerpPt(face.a, face.c, t0)
      const p1 = lerpPt(face.a, face.c, t1)
      if (Math.abs(p1[0] - p0[0]) < 2) continue
      const top0: Pt = [p0[0], p0[1] - height]
      const top1: Pt = [p1[0], p1[1] - height]
      ctx.globalAlpha = dim * face.strength
      const seed = hash2(b.seed, i * 13 + (face.strength === 1 ? 0 : 77))
      const style = b.street

      // recessed frame
      polygon(ctx, [p0, p1, top1, top0], '#070a14', rgba(b.accent, 0.16))

      const inner0 = lerpPt(face.a, face.c, t0 + 0.012)
      const inner1 = lerpPt(face.a, face.c, t1 - 0.012)
      const innerBot: Pt = [inner0[0], inner0[1] - 1]
      const innerBot2: Pt = [inner1[0], inner1[1] - 1]
      const innerTop: Pt = [inner0[0], inner0[1] - height + 1]
      const innerTop2: Pt = [inner1[0], inner1[1] - height + 1]

      let glow = b.window
      let glowAlpha = 0.45 + seed * 0.16
      if (style === 'cafe') {
        glow = '#ffc27a'
        glowAlpha = 0.62
      } else if (style === 'arcade') {
        glow = seed > 0.5 ? '#ff4fa3' : '#22e6ff'
        glowAlpha = 0.5
      } else if (style === 'lobby') {
        glow = '#c7ecff'
        glowAlpha = 0.5
      } else if (style === 'garage' || style === 'dock' || style === 'alley') {
        glow = '#0b0f17'
        glowAlpha = 0.95
      } else if (style === 'shop' && seed > 0.66) {
        glow = '#ffd9a0'
      }
      polygon(ctx, [innerBot, innerBot2, innerTop2, innerTop], rgba(glow, glowAlpha))

      if (style === 'shop') {
        // awning stripes + door
        const awning: Pt[] = [
          [inner0[0], innerTop[1] - 1],
          [inner1[0], innerTop2[1] - 1],
          [inner1[0], innerTop2[1] + 1],
          [inner0[0], innerTop[1] + 1],
        ]
        polygon(ctx, awning, rgba(seed > 0.5 ? b.accent : b.neon, 0.55))
        const doorT = 0.68 + seed * 0.16
        const d0 = lerpPt(face.a, face.c, t0 + (t1 - t0) * doorT)
        const d1 = lerpPt(face.a, face.c, t0 + (t1 - t0) * Math.min(0.96, doorT + 0.16))
        polygon(ctx, [[d0[0], d0[1] - 1], [d1[0], d1[1] - 1], [d1[0], d1[1] - height + 2], [d0[0], d0[1] - height + 2]], '#0a0e18')
        ctx.fillStyle = rgba(b.accent, 0.6)
        ctx.fillRect(Math.round(d1[0]) - 1, Math.round(d1[1] - height + 2), 1, Math.max(1, Math.round(height - 3)))
      } else if (style === 'cafe') {
        // striped canopy + counter lights
        for (let s = 0; s < 3; s++) {
          const a = lerpPt(inner0, inner1, s / 3)
          const c = lerpPt(inner0, inner1, (s + 1) / 3)
          polygon(ctx, [[a[0], a[1] - height + 1], [c[0], c[1] - height + 1], [c[0], c[1] - height + 2], [a[0], a[1] - height + 2]], rgba(s % 2 ? b.neon : b.accent, 0.55))
        }
        ctx.fillStyle = 'rgba(255,240,200,0.85)'
        ctx.fillRect(Math.round((inner0[0] + inner1[0]) / 2), Math.round(innerBot[1] - 2), 1, 1)
        ctx.fillStyle = 'rgba(255,255,255,0.28)'
        ctx.fillRect(Math.round((inner0[0] + inner1[0]) / 2) - 1, Math.round(innerBot[1] - height - 1), 1, 1)
      } else if (style === 'arcade') {
        for (let s = 0; s < 3; s++) {
          const x = inner0[0] + ((inner1[0] - inner0[0]) * (s + 0.5)) / 3
          const y = innerBot[1] - height + 2 + (s % 2)
          ctx.fillStyle = s === 1 ? '#ffd45c' : s === 0 ? '#ff4fa3' : '#22e6ff'
          const w = Math.max(1, Math.round(2 * zoom))
          const h = Math.max(1, Math.round(2 * zoom))
          ctx.fillRect(Math.round(x), Math.round(y), w, h)
        }
      } else if (style === 'garage') {
        for (let s = 1; s <= 3; s++) {
          const y = innerBot[1] - (height * s) / 4
          line(ctx, [inner0[0], y], [inner1[0], y], 'rgba(90,100,120,0.45)', 1)
        }
        for (let s = 0; s < 4; s++) {
          ctx.fillStyle = s % 2 ? '#ffb347' : '#181410'
          const x = inner0[0] + ((inner1[0] - inner0[0]) * s) / 4
          ctx.fillRect(Math.round(x), Math.round(innerBot[1] - 1), Math.max(1, Math.round(Math.abs(inner1[0] - inner0[0]) / 4)), 1)
        }
      } else if (style === 'lobby') {
        const mid = (inner0[0] + inner1[0]) / 2
        line(ctx, [mid, innerBot[1] - 1], [mid, innerTop[1] + 2], rgba(b.accent, 0.4), 1)
        ctx.fillStyle = 'rgba(210,240,255,0.5)'
        ctx.fillRect(Math.round(mid) - 1, Math.round(innerTop[1] + 2), Math.max(1, Math.round(2 * zoom)), 1)
        const canopyY = innerTop[1] - 1
        line(ctx, [inner0[0] - 1, canopyY], [inner1[0] + 1, canopyY], rgba(b.neon, 0.55), 1)
      } else if (style === 'dock') {
        for (let s = 1; s <= 2; s++) {
          const y = innerBot[1] - (height * s) / 3
          line(ctx, [inner0[0], y], [inner1[0], y], 'rgba(80,90,110,0.4)', 1)
        }
        ctx.fillStyle = '#ff8a2a'
        ctx.fillRect(Math.round(inner1[0]) - 2, Math.round(innerTop[1] + 1), 1, 1)
        const crateSize = Math.max(1, Math.round(2 * zoom))
        ctx.fillStyle = '#2a2119'
        ctx.fillRect(Math.round(inner0[0]), Math.round(innerBot[1] - crateSize), crateSize, crateSize)
        ctx.fillStyle = 'rgba(255,180,92,0.4)'
        ctx.fillRect(Math.round(inner0[0]), Math.round(innerBot[1] - crateSize), crateSize, 1)
      } else if (style === 'alley') {
        ctx.fillStyle = '#132019'
        const s = Math.max(2, Math.round(3 * zoom))
        ctx.fillRect(Math.round(inner0[0]), Math.round(innerBot[1] - s), s, s)
        ctx.fillStyle = 'rgba(99,255,155,0.25)'
        ctx.fillRect(Math.round(inner0[0]), Math.round(innerBot[1] - s), 1, 1)
        ctx.fillStyle = rgba(b.window, 0.35)
        ctx.fillRect(Math.round(inner1[0]) - 1, Math.round(innerBot[1] - height + 2), 1, 1)
      }

      if (lod >= 3) {
        // address strip + open sign
        const signW = Math.max(1, Math.round((inner1[0] - inner0[0]) * 0.4))
        ctx.fillStyle = rgba(b.neon, 0.5)
        ctx.fillRect(Math.round(inner0[0]), Math.round(innerTop[1]), signW, 1)
        if (seed > 0.55) {
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          ctx.fillStyle = rgba(b.accent, 0.8)
          ctx.fillRect(Math.round(inner1[0]) - 2, Math.round(innerBot[1] + 1), 1, 1)
          ctx.restore()
        }
      }
    }
  }
  ctx.restore()
}


function drawRoofDetails(
  ctx: CanvasRenderingContext2D,
  view: View,
  b: Building,
  topZ: number,
  lod: number,
  dim: number,
) {
  if (lod < 1) return
  const zoom = view.camera.zoom
  const cx = b.x + b.w / 2
  const cy = b.y + b.d / 2
  const top = project(view, cx, cy, topZ)
  const R = (dx: number, dy: number, dz: number): Pt => project(view, cx + dx, cy + dy, topZ + dz)
  ctx.save()
  ctx.globalAlpha = dim

  if (b.landmark) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const r = Math.max(4, 18 * zoom)
    ctx.strokeStyle = rgba(b.neon, 0.4)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.ellipse(top[0], top[1] - 3 * zoom, r, r * 0.45, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  // Lived-in clutter: not every roof is a showpiece.
  if (lod >= 2 && (b.crown === 'none' || b.crown === 'antenna' || b.crown === 'sign' || b.crown === 'dishes')) {
    for (let i = 0; i < 3; i++) {
      if (hash2(b.seed, i) < 0.42) continue
      const ox = (hash2(b.seed + i, 5) - 0.5) * b.w * 0.52
      const oy = (hash2(b.seed + i, 6) - 0.5) * b.d * 0.52
      const p = project(view, cx + ox, cy + oy, topZ + 2)
      const s = Math.max(1, Math.round(2 * zoom))
      ctx.fillStyle = '#22223a'
      ctx.fillRect(p[0], p[1] - s, s * 2, s)
      ctx.fillStyle = rgba(b.neon, 0.35)
      ctx.fillRect(p[0], p[1] - s, s * 2, 1)
    }
  }

  switch (b.crown) {
    case 'antenna': {
      const base = R(0, 0, 0)
      const mast = R(0, 0, 20)
      line(ctx, base, mast, 'rgba(150,175,210,0.72)', 1)
      for (const h of [9, 14]) {
        const l = R(-1.8, 0, h)
        const r = R(1.8, 0, h)
        line(ctx, l, r, 'rgba(150,175,210,0.5)', 1)
      }
      if (lod >= 2) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = '#ff4f6d'
        ctx.fillRect(mast[0], mast[1] - 1, 1, 1)
        ctx.restore()
      }
      break
    }
    case 'dishes': {
      for (let i = 0; i < 2; i++) {
        const ox = (i === 0 ? -0.16 : 0.18) * b.w
        const oy = (i === 0 ? -0.12 : 0.1) * b.d
        const base = R(ox, oy, 0)
        const dish = R(ox, oy, 8 + i * 3)
        line(ctx, base, dish, 'rgba(130,150,180,0.55)', 1)
        ctx.strokeStyle = rgba(b.accent, 0.55)
        ctx.beginPath()
        ctx.ellipse(dish[0], dish[1], Math.max(2, 3 * zoom), Math.max(1, 1.5 * zoom), i === 0 ? -0.5 : 0.4, 0, Math.PI * 2)
        ctx.stroke()
        if (lod >= 2) {
          ctx.fillStyle = rgba(b.window, 0.7)
          ctx.fillRect(Math.round(dish[0] + Math.cos(i === 0 ? -0.5 : 0.4) * -2), Math.round(dish[1] + Math.sin(i === 0 ? -0.5 : 0.4) * -1), 1, 1)
        }
      }
      break
    }
    case 'tank': {
      const w = Math.max(4, Math.round(6 * zoom))
      const h = Math.max(2, Math.round(4 * zoom))
      const x = top[0] - Math.floor(w / 2)
      const y = top[1] - h - Math.round(3 * zoom)
      ctx.strokeStyle = 'rgba(120,126,150,0.7)'
      ctx.lineWidth = 1
      for (let i = 0; i < 2; i++) {
        const lx = x + 1 + i * (w - 2)
        ctx.beginPath()
        ctx.moveTo(lx, y + h)
        ctx.lineTo(lx, y + h + Math.max(1, 2 * zoom))
        ctx.stroke()
      }
      ctx.fillStyle = shade(b.roof, 0.92)
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = shade(b.roof, 1.16)
      ctx.fillRect(x, y, w, 1)
      ctx.fillStyle = rgba(b.accent, 0.45)
      ctx.fillRect(x + w - 2, y + 1, 1, h - 2)
      break
    }
    case 'garden': {
      const w = Math.max(4, Math.round(b.w * 2.2 * zoom))
      const y = top[1] - 1
      ctx.fillStyle = 'rgba(30,70,46,0.9)'
      ctx.fillRect(top[0] - w / 2, y - 1, w, 2)
      for (let i = 0; i < 7; i++) {
        const gx = top[0] - w / 2 + 1 + hash2(b.seed, i + 20) * (w - 2)
        const gy = y - 1 - hash2(b.seed, i + 30) * Math.max(2, 4 * zoom)
        ctx.fillStyle = i % 2 ? '#63ff9b' : '#2f8e5c'
        ctx.fillRect(Math.round(gx), Math.round(gy), Math.max(1, Math.round(zoom)), Math.max(1, Math.round(2 * zoom)))
      }
      ctx.strokeStyle = rgba(b.accent, 0.35)
      ctx.beginPath()
      ctx.moveTo(top[0] - w / 2, y - 4 * zoom)
      ctx.lineTo(top[0] + w / 2, y - 4 * zoom)
      ctx.stroke()
      break
    }
    case 'sign': {
      const text = (b.sign?.text ?? b.name.split(' ')[0]).slice(0, 7)
      const w = Math.min(30, Math.max(8, text.length * 4 * zoom + 4))
      const h = Math.max(4, Math.round(7 * zoom))
      const s = Math.max(1, Math.round(3 * zoom))
      const x = Math.round(top[0] - w / 2)
      const y = Math.round(top[1] - h - s)
      ctx.fillStyle = 'rgba(5,7,14,0.95)'
      ctx.fillRect(x - 1, y - 1, w + 2, h + 2)
      ctx.strokeStyle = rgba(b.neon, 0.8)
      ctx.lineWidth = 1
      ctx.strokeRect(x - 1, y - 1, w + 2, h + 2)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = rgba(b.neon, 0.14)
      ctx.fillRect(x, y, w, h)
      ctx.restore()
      if (lod >= 2 && w >= 12) {
        drawPixelText(ctx, text, top[0], y + Math.round((h - 7) / 2), 1, rgba(b.accent, 0.95), 'center', 'rgba(0,0,0,0.8)')
      } else {
        ctx.fillStyle = rgba(b.accent, 0.8)
        ctx.fillRect(x + 1, y + Math.floor(h / 2), w - 2, 1)
      }
      ctx.strokeStyle = 'rgba(120,130,160,0.6)'
      ctx.beginPath()
      ctx.moveTo(x + 2, y + h + 1)
      ctx.lineTo(x + 2, y + h + s)
      ctx.moveTo(x + w - 2, y + h + 1)
      ctx.lineTo(x + w - 2, y + h + s)
      ctx.stroke()
      break
    }
    case 'vents': {
      for (let i = 0; i < 3; i++) {
        const ox = (i - 1) * 0.22 * b.w
        const p = R(ox, (hash2(b.seed, i + 4) - 0.5) * b.d * 0.4, 2)
        const w = Math.max(2, Math.round(3 * zoom))
        ctx.fillStyle = '#1b2030'
        ctx.fillRect(p[0], p[1] - w, w, w)
        ctx.fillStyle = rgba(b.window, 0.5)
        ctx.fillRect(p[0], p[1] - 1, w, 1)
        if (lod >= 2) {
          ctx.fillStyle = 'rgba(120,130,155,0.5)'
          ctx.fillRect(p[0], p[1] - w, w, 1)
        }
      }
      break
    }
    case 'helipad': {
      const rx = Math.max(3, b.w * 1.6 * zoom)
      const ry = Math.max(1.5, b.d * 1.1 * zoom)
      ctx.strokeStyle = rgba(b.accent, 0.5)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(top[0], top[1], rx, ry, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(top[0], top[1], rx * 0.62, ry * 0.62, 0, 0, Math.PI * 2)
      ctx.stroke()
      if (lod >= 2) {
        drawPixelText(ctx, 'H', top[0], top[1] - 3, 1, rgba(b.window, 0.95), 'center', 'rgba(0,0,0,0.7)')
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2
          ctx.fillStyle = rgba(b.neon, 0.8)
          ctx.fillRect(Math.round(top[0] + Math.cos(a) * rx * 0.86), Math.round(top[1] + Math.sin(a) * ry * 0.86), 1, 1)
        }
      }
      break
    }
    case 'solar': {
      for (let i = 0; i < 2; i++) {
        const ox = (i === 0 ? -0.2 : 0.2) * b.w
        const p = R(ox, 0, 2)
        const w = Math.max(4, Math.round(6 * zoom))
        const h = Math.max(2, Math.round(3 * zoom))
        polygon(
          ctx,
          [
            [p[0] - w / 2, p[1] - h],
            [p[0] + w / 2, p[1] - h - 1],
            [p[0] + w / 2, p[1]],
            [p[0] - w / 2, p[1] + 1],
          ],
          '#123a52',
          rgba(b.neon, 0.5),
        )
        ctx.strokeStyle = rgba(b.neon, 0.22)
        ctx.beginPath()
        ctx.moveTo(p[0] - w / 2 + 1, p[1] - h + 1)
        ctx.lineTo(p[0] + w / 2 - 1, p[1] - h)
        ctx.stroke()
      }
      break
    }
    case 'beacon': {
      const mast = R(0, 0, 22)
      line(ctx, R(0, 0, 2), mast, 'rgba(160,185,220,0.6)', 1)
      const r = Math.max(2, 4 * zoom)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + view.time * 0.3
        ctx.fillStyle = rgba(i % 2 ? b.neon : b.accent, 0.85)
        ctx.fillRect(Math.round(top[0] + Math.cos(a) * r), Math.round(top[1] - 2 + Math.sin(a) * r * 0.5), 1, 1)
      }
      ctx.fillStyle = rgba(b.neon, 0.9)
      ctx.fillRect(mast[0], mast[1], 1, 1)
      ctx.strokeStyle = rgba(b.neon, 0.28)
      ctx.beginPath()
      ctx.ellipse(top[0], top[1] - 2, r * 1.3, r * 0.7, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
      break
    }
    default:
      break
  }

  if (b.h > 95 && b.crown !== 'antenna' && b.crown !== 'beacon') {
    const p = project(view, cx, cy, topZ + 10)
    ctx.strokeStyle = 'rgba(165,190,230,0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(top[0], top[1])
    ctx.lineTo(p[0], p[1])
    ctx.stroke()
    ctx.fillStyle = '#ff4f6d'
    ctx.fillRect(p[0], p[1] - 1, 1, 1)
  }

  ctx.restore()
}

function drawTower(
  ctx: CanvasRenderingContext2D,
  view: View,
  b: Building,
  lod: number,
  dim: number,
) {
  // Towers get 2–3 setbacks whose proportions vary per building, so even
  // two neighbours of the same height read as different architecture.
  const tiers = b.h > 130 ? 3 : b.h > 70 && hash2(b.seed, 7) > 0.45 ? 3 : 2
  const firstCut = 0.58 + hash2(b.seed, 2) * 0.12
  const secondCut = 0.82 + hash2(b.seed, 5) * 0.08
  const mainH = b.h * (tiers === 3 ? firstCut : 0.7 + hash2(b.seed, 2) * 0.1)
  const pts = drawPrism(ctx, view, b.x, b.y, b.w, b.d, 0, mainH, b.body, b.roof, {
    alpha: dim,
    accent: b.neon,
    accentAlpha: b.landmark ? 0.85 : 0.55,
  })
  const colsX = lod === 0 ? 2 : lod === 1 ? 3 : Math.min(9, Math.max(3, Math.floor(b.w * 1.6)))
  const colsY = lod === 0 ? 2 : lod === 1 ? 3 : Math.min(9, Math.max(3, Math.floor(b.d * 1.6)))
  const rows = lod === 0 ? 4 : Math.min(20, Math.max(4, Math.floor(mainH / 11)))
  drawWindows(ctx, view, b, pts.D0, pts.C0, pts.D1, pts.C1, colsX, rows, lod, dim)
  drawWindows(ctx, view, b, pts.B0, pts.C0, pts.B1, pts.C1, colsY, rows, lod, dim, 1)
  drawFacadeDetails(ctx, view, b, pts, lod, dim)

  const inset1X = b.w * (0.12 + hash2(b.seed, 11) * 0.08)
  const inset1Y = b.d * (0.12 + hash2(b.seed, 12) * 0.08)
  const midTop = tiers === 3 ? b.h * secondCut : b.h
  const midPts = drawPrism(
    ctx,
    view,
    b.x + inset1X,
    b.y + inset1Y,
    b.w - inset1X * 2,
    b.d - inset1Y * 2,
    mainH,
    midTop,
    [shade(b.body[0], 1.1), shade(b.body[1], 1.05), shade(b.body[2], 1.15)],
    shade(b.roof, 1.08),
    { alpha: dim, accent: b.accent, accentAlpha: 0.75 },
  )
  if (lod >= 1) {
    drawWindows(ctx, view, b, midPts.D0, midPts.C0, midPts.D1, midPts.C1, 2, Math.min(8, Math.max(2, Math.floor((midTop - mainH) / 12))), lod, dim)
  }
  if (tiers === 3) {
    const inset2X = inset1X + b.w * 0.09
    const inset2Y = inset1Y + b.d * 0.09
    const topPts = drawPrism(
      ctx,
      view,
      b.x + inset2X,
      b.y + inset2Y,
      b.w - inset2X * 2,
      b.d - inset2Y * 2,
      midTop,
      b.h,
      [shade(b.body[0], 1.18), shade(b.body[1], 1.1), shade(b.body[2], 1.22)],
      shade(b.roof, 1.14),
      { alpha: dim, accent: b.accent, accentAlpha: 0.85 },
    )
    if (lod >= 2) {
      drawWindows(ctx, view, b, topPts.D0, topPts.C0, topPts.D1, topPts.C1, 2, Math.min(6, Math.max(2, Math.floor((b.h - midTop) / 14))), lod, dim)
    }
  }
  drawRoofDetails(ctx, view, b, b.h, lod, dim)
}

function drawBlock(ctx: CanvasRenderingContext2D, view: View, b: Building, lod: number, dim: number) {
  const mainH = b.h * (0.74 + hash2(b.seed, 3) * 0.16)
  const pts = drawPrism(ctx, view, b.x, b.y, b.w, b.d, 0, mainH, b.body, b.roof, {
    alpha: dim,
    accent: b.neon,
    accentAlpha: 0.45,
  })
  const cols = lod === 0 ? 3 : lod === 1 ? 4 : Math.min(8, Math.max(4, Math.floor(b.w * 1.4)))
  const rows = lod === 0 ? 4 : lod === 1 ? 5 : Math.min(16, Math.max(4, Math.floor(mainH / 10)))
  drawWindows(ctx, view, b, pts.D0, pts.C0, pts.D1, pts.C1, cols, rows, lod, dim)
  drawWindows(ctx, view, b, pts.B0, pts.C0, pts.B1, pts.C1, cols, rows, lod, dim, 1)
  drawFacadeDetails(ctx, view, b, pts, lod, dim)
  if (lod >= 2 && hash2(b.seed, 21) > 0.4) {
    // rooftop setback shack + water tank
    const ix = b.w * 0.2
    const iy = b.d * 0.2
    const shack = drawPrism(
      ctx,
      view,
      b.x + ix,
      b.y + iy,
      b.w - ix * 2,
      b.d - iy * 2,
      mainH,
      b.h,
      [shade(b.body[0], 0.92), shade(b.body[1], 0.9), shade(b.body[2], 0.96)],
      shade(b.roof, 0.94),
      { alpha: dim },
    )
    drawWindows(ctx, view, b, shack.D0, shack.C0, shack.D1, shack.C1, 2, 2, lod, dim)
  }
  drawRoofDetails(ctx, view, b, b.h, lod, dim)
}

function drawPyramid(ctx: CanvasRenderingContext2D, view: View, b: Building, lod: number, dim: number) {
  const levels = [
    { f: 0, h: 0.46, inset: 0 },
    { f: 0.46, h: 0.76, inset: 0.16 },
    { f: 0.76, h: 1, inset: 0.33 },
  ]
  for (const level of levels) {
    const ix = b.w * level.inset
    const iy = b.d * level.inset
    const pts = drawPrism(
      ctx,
      view,
      b.x + ix,
      b.y + iy,
      b.w - ix * 2,
      b.d - iy * 2,
      b.h * level.f,
      b.h * level.h,
      b.body,
      b.roof,
      { alpha: dim, accent: b.neon, accentAlpha: 0.4 },
    )
    if (level.f === 0) {
      drawWindows(ctx, view, b, pts.D0, pts.C0, pts.D1, pts.C1, lod === 0 ? 2 : 4, lod === 0 ? 3 : 8, lod, dim)
      drawWindows(ctx, view, b, pts.B0, pts.C0, pts.B1, pts.C1, lod === 0 ? 2 : 4, lod === 0 ? 3 : 8, lod, dim)
      drawFacadeDetails(ctx, view, b, pts, lod, dim)
    } else if (lod >= 2) {
      drawWindows(ctx, view, b, pts.D0, pts.C0, pts.D1, pts.C1, 3, 4, lod, dim)
    }
  }
  drawRoofDetails(ctx, view, b, b.h, lod, dim)
}

function drawTwin(ctx: CanvasRenderingContext2D, view: View, b: Building, lod: number, dim: number) {
  const basePts = drawPrism(ctx, view, b.x, b.y, b.w, b.d, 0, b.h * 0.18, b.body, b.roof, { alpha: dim })
  if (lod >= 1) drawFacadeDetails(ctx, view, b, basePts, lod, dim)
  const towerW = b.w * 0.36
  const towerD = b.d * 0.76
  const gap = b.w * 0.12
  for (let i = 0; i < 2; i++) {
    const tx = b.x + (i === 0 ? b.w * 0.08 : b.w * 0.08 + towerW + gap)
    const ty = b.y + b.d * 0.12
    const topH = b.h * (i === 0 ? 0.9 : 1)
    const pts = drawPrism(ctx, view, tx, ty, towerW, towerD, b.h * 0.18, topH, b.body, b.roof, {
      alpha: dim,
      accent: b.neon,
      accentAlpha: 0.65,
    })
    drawWindows(ctx, view, b, pts.D0, pts.C0, pts.D1, pts.C1, lod === 0 ? 1 : 2, lod === 0 ? 3 : 9, lod, dim)
    drawWindows(ctx, view, b, pts.B0, pts.C0, pts.B1, pts.C1, lod === 0 ? 1 : 2, lod === 0 ? 3 : 9, lod, dim)
    if (lod >= 1) drawFacadeDetails(ctx, view, b, pts, lod, dim)
    if (lod >= 2) drawRoofDetails(ctx, view, b, topH, lod, dim)
  }
  if (lod >= 2) {
    const y = b.h * 0.55
    const a = project(view, b.x + b.w * 0.08, b.y + b.d * 0.5, y)
    const c = project(view, b.x + b.w * 0.92, b.y + b.d * 0.5, y)
    line(ctx, a, c, rgba(b.accent, 0.35), Math.max(1, Math.round(view.camera.zoom)))
  }
}

function drawDomeBuilding(ctx: CanvasRenderingContext2D, view: View, b: Building, lod: number, dim: number) {
  const baseH = b.h * 0.28
  const pts = drawPrism(ctx, view, b.x, b.y, b.w, b.d, 0, baseH, b.body, b.roof, { alpha: dim })
  if (lod >= 1) {
    drawWindows(ctx, view, b, pts.D0, pts.C0, pts.D1, pts.C1, 3, 2, lod, dim)
    drawWindows(ctx, view, b, pts.B0, pts.C0, pts.B1, pts.C1, 3, 2, lod, dim)
    drawFacadeDetails(ctx, view, b, pts, lod, dim)
  }
  const center = project(view, b.x + b.w / 2, b.y + b.d / 2, baseH)
  const rx = ((b.w + b.d) / 2) * (TILE_W / 2) * view.camera.zoom * 0.72
  const ry = (b.h - baseH) * view.camera.zoom
  if (rx < 2) return
  ctx.save()
  ctx.globalAlpha = dim * 0.9
  ctx.beginPath()
  ctx.ellipse(center[0], center[1], rx, ry, 0, Math.PI, Math.PI * 2)
  ctx.lineTo(center[0] + rx, center[1])
  ctx.closePath()
  const glass = ctx.createLinearGradient(center[0], center[1] - ry, center[0], center[1])
  glass.addColorStop(0, 'rgba(97,255,166,0.2)')
  glass.addColorStop(0.6, 'rgba(30,110,83,0.5)')
  glass.addColorStop(1, 'rgba(12,45,35,0.75)')
  ctx.fillStyle = glass
  ctx.fill()
  ctx.strokeStyle = rgba(b.neon, 0.7)
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.save()
  ctx.clip()
  if (lod >= 2) {
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = rgba(b.neon, 0.12)
      ctx.beginPath()
      ctx.ellipse(center[0], center[1], rx * (i / 5 + 0.15), ry * (i / 5 + 0.15), 0, Math.PI, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(center[0], center[1], rx * (i / 5 + 0.1), ry, 0, Math.PI, Math.PI * 2)
      ctx.stroke()
    }
    for (let i = 0; i < 9; i++) {
      const p = project(view, b.x + 1 + hash2(b.seed, i) * (b.w - 2), b.y + 1 + hash2(b.seed, i + 3) * (b.d - 2), baseH + 2)
      ctx.fillStyle = i % 3 === 0 ? '#aaff85' : '#2f8e5c'
      ctx.fillRect(p[0], p[1] - Math.max(1, 3 * view.camera.zoom), Math.max(1, 2 * view.camera.zoom), Math.max(1, 4 * view.camera.zoom))
    }
  }
  ctx.restore()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = rgba(b.accent, 0.25)
  ctx.beginPath()
  ctx.ellipse(center[0], center[1], rx * 0.96, ry * 0.96, 0, Math.PI, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawArena(ctx: CanvasRenderingContext2D, view: View, b: Building, lod: number, dim: number) {
  const baseH = b.h * 0.58
  const pts = drawPrism(ctx, view, b.x, b.y, b.w, b.d, 0, baseH, b.body, b.roof, {
    alpha: dim,
    accent: b.neon,
    accentAlpha: 0.6,
  })
  if (lod >= 1) {
    drawWindows(ctx, view, b, pts.D0, pts.C0, pts.D1, pts.C1, 4, 4, lod, dim)
    drawWindows(ctx, view, b, pts.B0, pts.C0, pts.B1, pts.C1, 4, 4, lod, dim)
    drawFacadeDetails(ctx, view, b, pts, lod, dim)
  }
  const center = project(view, b.x + b.w / 2, b.y + b.d / 2, baseH)
  const rx = ((b.w + b.d) / 2) * (TILE_W / 2) * view.camera.zoom * 0.78
  const ry = ((b.w + b.d) / 2) * (TILE_H / 2) * view.camera.zoom * 0.78
  ctx.save()
  ctx.globalAlpha = dim
  ctx.fillStyle = '#191027'
  ctx.beginPath()
  ctx.ellipse(center[0], center[1], rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = rgba(b.neon, 0.8)
  ctx.stroke()
  ctx.strokeStyle = rgba(b.accent, 0.45)
  ctx.beginPath()
  ctx.ellipse(center[0], center[1], rx * 0.72, ry * 0.72, 0, 0, Math.PI * 2)
  ctx.stroke()
  if (lod >= 2) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      ctx.fillStyle = i % 2 ? rgba(b.neon, 0.8) : rgba(b.accent, 0.65)
      ctx.fillRect(Math.round(center[0] + Math.cos(a) * rx * 0.88), Math.round(center[1] + Math.sin(a) * ry * 0.88), 1, 1)
    }
    drawPixelText(ctx, b.sign?.text ?? 'LIVE', center[0], center[1] - 5, Math.max(1, Math.floor(view.camera.zoom * 1.3)), rgba(b.accent, 0.9), 'center', 'rgba(0,0,0,0.8)')
  }
  ctx.restore()
}

function drawStation(ctx: CanvasRenderingContext2D, view: View, b: Building, lod: number, dim: number) {
  const baseH = b.h * 0.46
  const pts = drawPrism(ctx, view, b.x, b.y, b.w, b.d, 0, baseH, b.body, b.roof, {
    alpha: dim,
    accent: b.neon,
    accentAlpha: 0.5,
  })
  if (lod >= 1) {
    drawWindows(ctx, view, b, pts.D0, pts.C0, pts.D1, pts.C1, 5, 3, lod, dim)
    drawWindows(ctx, view, b, pts.B0, pts.C0, pts.B1, pts.C1, 5, 3, lod, dim)
    drawFacadeDetails(ctx, view, b, pts, lod, dim)
  }
  const topZ = baseH + (b.h - baseH) * 0.7
  const left = project(view, b.x + 1, b.y + b.d / 2, topZ)
  const right = project(view, b.x + b.w - 1, b.y + b.d / 2, topZ)
  const peakY = project(view, b.x + b.w / 2, b.y + b.d / 2, b.h).at(1)!
  ctx.save()
  ctx.globalAlpha = dim
  ctx.beginPath()
  ctx.moveTo(left[0], left[1])
  ctx.quadraticCurveTo((left[0] + right[0]) / 2, peakY, right[0], right[1])
  ctx.lineTo(right[0], right[1] + 4 * view.camera.zoom)
  ctx.quadraticCurveTo((left[0] + right[0]) / 2, peakY + 4 * view.camera.zoom, left[0], left[1] + 4 * view.camera.zoom)
  ctx.closePath()
  ctx.fillStyle = 'rgba(23,43,60,0.85)'
  ctx.fill()
  ctx.strokeStyle = rgba(b.neon, 0.65)
  ctx.stroke()
  if (lod >= 2) {
    for (let i = 0; i < 5; i++) {
      const t = (i + 1) / 6
      const x = left[0] + (right[0] - left[0]) * t
      line(ctx, [x, left[1] + 2], [x, left[1] + 4 * view.camera.zoom], rgba(b.accent, 0.2))
    }
    drawPixelText(ctx, 'NEXUS TRANSIT', (left[0] + right[0]) / 2, peakY - 8, 1, rgba(b.accent, 0.8), 'center', 'rgba(0,0,0,0.8)')
  }
  ctx.restore()
}

function drawMarket(ctx: CanvasRenderingContext2D, view: View, b: Building, lod: number, dim: number) {
  const pts = drawPrism(ctx, view, b.x, b.y, b.w, b.d, 0, b.h, b.body, b.roof, {
    alpha: dim,
    accent: b.neon,
    accentAlpha: 0.45,
  })
  if (lod >= 1) {
    drawWindows(ctx, view, b, pts.D0, pts.C0, pts.D1, pts.C1, 3, Math.max(2, Math.floor(b.h / 10)), lod, dim)
    drawWindows(ctx, view, b, pts.B0, pts.C0, pts.B1, pts.C1, 3, Math.max(2, Math.floor(b.h / 10)), lod, dim)
    drawFacadeDetails(ctx, view, b, pts, lod, dim)
  }
  if (lod >= 2) {
    // awnings
    for (let i = 0; i < 2; i++) {
      const t = 0.18 + i * 0.36
      const a: Pt = [pts.B0[0] + (pts.C0[0] - pts.B0[0]) * t, pts.B0[1] + (pts.C0[1] - pts.B0[1]) * t]
      const c: Pt = [a[0] + 7 * view.camera.zoom, a[1] - 2 * view.camera.zoom]
      polygon(ctx, [a, [a[0] + 9 * view.camera.zoom, a[1] - 1], [a[0] + 7 * view.camera.zoom, a[1] + 2], [a[0] + 1, a[1] + 2]], i % 2 ? rgba(b.accent, 0.5) : rgba(b.neon, 0.45))
      line(ctx, a, c, rgba(b.accent, 0.4))
    }
  }
  drawRoofDetails(ctx, view, b, b.h, lod, dim)
}

function drawData(ctx: CanvasRenderingContext2D, view: View, b: Building, lod: number, dim: number) {
  const pts = drawPrism(ctx, view, b.x, b.y, b.w, b.d, 0, b.h, b.body, b.roof, {
    alpha: dim,
    accent: b.neon,
    accentAlpha: 0.75,
  })
  if (lod >= 1) {
    drawWindows(ctx, view, b, pts.D0, pts.C0, pts.D1, pts.C1, lod === 1 ? 2 : 4, lod === 1 ? 3 : 10, lod, dim)
    drawWindows(ctx, view, b, pts.B0, pts.C0, pts.B1, pts.C1, lod === 1 ? 2 : 4, lod === 1 ? 3 : 10, lod, dim)
    drawFacadeDetails(ctx, view, b, pts, lod, dim)
  }
  if (lod >= 2) {
    const face = pts.C0
    const top = pts.C1
    for (let i = 1; i < 5; i++) {
      const y = face[1] + (top[1] - face[1]) * (i / 5)
      line(ctx, [face[0] - 1, y], [face[0] + 7 * view.camera.zoom, y - 1], rgba(b.neon, 0.16))
    }
  }
  drawRoofDetails(ctx, view, b, b.h, lod, dim)
}

function drawIndustrial(ctx: CanvasRenderingContext2D, view: View, b: Building, lod: number, dim: number) {
  const mainH = b.h * 0.7
  const pts = drawPrism(ctx, view, b.x, b.y, b.w, b.d, 0, mainH, b.body, b.roof, {
    alpha: dim,
    accent: b.neon,
    accentAlpha: 0.3,
  })
  if (lod >= 1) {
    drawWindows(ctx, view, b, pts.D0, pts.C0, pts.D1, pts.C1, 3, 3, lod, dim)
    drawWindows(ctx, view, b, pts.B0, pts.C0, pts.B1, pts.C1, 3, 3, lod, dim)
    drawFacadeDetails(ctx, view, b, pts, lod, dim)
  }
  // sawtooth roof
  const roofY = project(view, b.x + b.w / 2, b.y + b.d / 2, mainH)
  if (lod >= 1) {
    for (let i = 0; i < 3; i++) {
      const x = b.x + 0.5 + i * (b.w / 3)
      const a = project(view, x, b.y + b.d / 2, mainH)
      const c = project(view, x + b.w / 3, b.y + b.d / 2, mainH + 7)
      line(ctx, a, c, rgba(b.neon, 0.5), 1)
      line(ctx, [a[0] + 1, a[1] + 1], [a[0] + 6, a[1] - 3], 'rgba(30,25,25,0.9)')
    }
  }
  if (lod >= 2) {
    // smokestacks
    for (let i = 0; i < 2; i++) {
      const sx = b.x + b.w * (i === 0 ? 0.22 : 0.78)
      const sy = b.y + b.d * 0.32
      const base = project(view, sx, sy, mainH)
      const top = project(view, sx, sy, mainH + 18)
      line(ctx, base, top, '#332b2b', Math.max(2, Math.round(view.camera.zoom * 2)))
      ctx.fillStyle = rgba(b.neon, 0.55)
      ctx.fillRect(top[0] - 1, top[1], 3, 1)
      ctx.fillStyle = '#ff4f6d'
      ctx.fillRect(top[0], top[1] - 1, 1, 1)
    }
    for (let i = 0; i < 3; i++) {
      const y = roofY[1] - i * 2
      line(ctx, [roofY[0] - 8, y], [roofY[0] + 8, y], rgba('#ff8a2a', 0.2))
    }
  }
  drawRoofDetails(ctx, view, b, b.h, lod, dim)
}

function drawGreenhouse(ctx: CanvasRenderingContext2D, view: View, b: Building, lod: number, dim: number) {
  const baseH = b.h * 0.34
  const pts = drawPrism(ctx, view, b.x, b.y, b.w, b.d, 0, baseH, b.body, b.roof, { alpha: dim })
  if (lod >= 1) {
    drawWindows(ctx, view, b, pts.D0, pts.C0, pts.D1, pts.C1, 3, 2, lod, dim)
    drawFacadeDetails(ctx, view, b, pts, lod, dim)
  }
  const center = project(view, b.x + b.w / 2, b.y + b.d / 2, baseH)
  const rx = ((b.w + b.d) / 2) * (TILE_W / 2) * view.camera.zoom * 0.7
  const ry = (b.h - baseH) * view.camera.zoom
  ctx.save()
  ctx.globalAlpha = dim * 0.85
  ctx.beginPath()
  ctx.ellipse(center[0], center[1], rx, ry, 0, Math.PI, Math.PI * 2)
  ctx.lineTo(center[0] + rx, center[1])
  ctx.closePath()
  ctx.fillStyle = 'rgba(45,130,90,0.22)'
  ctx.fill()
  ctx.strokeStyle = rgba(b.neon, 0.55)
  ctx.stroke()
  if (lod >= 2) {
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = rgba(b.neon, 0.14)
      ctx.beginPath()
      ctx.ellipse(center[0], center[1], rx * (0.25 + i * 0.2), ry, 0, Math.PI, Math.PI * 2)
      ctx.stroke()
    }
  }
  ctx.restore()
}

function drawConstruction(ctx: CanvasRenderingContext2D, view: View, b: Building, lod: number, dim: number) {
  ctx.save()
  ctx.globalAlpha = dim
  const corners = [
    project(view, b.x, b.y, 0),
    project(view, b.x + b.w, b.y, 0),
    project(view, b.x + b.w, b.y + b.d, 0),
    project(view, b.x, b.y + b.d, 0),
  ]
  const tops = [
    project(view, b.x, b.y, b.h),
    project(view, b.x + b.w, b.y, b.h),
    project(view, b.x + b.w, b.y + b.d, b.h),
    project(view, b.x, b.y + b.d, b.h),
  ]
  for (let i = 0; i < 4; i++) {
    line(ctx, corners[i], tops[i], 'rgba(255,138,42,0.65)', 1)
  }
  const floors = Math.max(3, Math.floor(b.h / 9))
  for (let f = 1; f <= floors; f++) {
    const z = (b.h * f) / floors
    const a = project(view, b.x, b.y, z)
    const c = project(view, b.x + b.w, b.y, z)
    const e = project(view, b.x + b.w, b.y + b.d, z)
    const g = project(view, b.x, b.y + b.d, z)
    ctx.strokeStyle = f === floors ? 'rgba(255,138,42,0.7)' : 'rgba(255,180,92,0.25)'
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    ctx.lineTo(c[0], c[1])
    ctx.lineTo(e[0], e[1])
    ctx.lineTo(g[0], g[1])
    ctx.closePath()
    ctx.stroke()
  }
  // crane
  const craneX = b.x + b.w * 0.8
  const craneY = b.y + b.d * 0.8
  const base = project(view, craneX, craneY, 0)
  const top = project(view, craneX, craneY, b.h + 26)
  line(ctx, base, top, 'rgba(255,180,92,0.7)', 2)
  const arm = project(view, craneX - 9, craneY, b.h + 24)
  const arm2 = project(view, craneX + 9, craneY, b.h + 24)
  line(ctx, arm, arm2, 'rgba(255,180,92,0.6)', 1)
  ctx.fillStyle = '#ff4f6d'
  ctx.fillRect(top[0], top[1] - 1, 1, 1)
  ctx.restore()
}

export function drawBuilding(ctx: CanvasRenderingContext2D, view: View, b: Building) {
  const bounds = getBuildingBounds(view, b)
  if (!isBoundsVisible(view, bounds, 26)) return
  const zoom = view.camera.zoom
  const lod = zoom < 0.24 ? 0 : zoom < 0.55 ? 1 : zoom < 1.05 ? 2 : 3
  const dim = districtDim(view, b.district)

  // ground shadow
  const center = project(view, b.x + b.w / 2, b.y + b.d / 2)
  ctx.save()
  ctx.globalAlpha = 0.34 * dim
  ctx.fillStyle = '#020207'
  ctx.beginPath()
  ctx.ellipse(center[0] + 2, center[1] + 1, Math.max(3, (b.w + b.d) * 4 * zoom), Math.max(1, (b.w + b.d) * 2 * zoom), 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // soft neon bloom behind the silhouette
  if (zoom > 0.3) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const cx = (bounds.minX + bounds.maxX) / 2
    const cy = bounds.maxY
    const r = Math.max(8, (bounds.maxX - bounds.minX) * 0.8)
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0, rgba(b.neon, b.landmark ? 0.1 : 0.035))
    g.addColorStop(1, rgba(b.neon, 0))
    ctx.fillStyle = g
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
    ctx.restore()
  }

  if (b.style === 'construction') {
    drawConstruction(ctx, view, b, lod, dim)
    return
  }

  switch (b.style) {
    case 'tower':
      drawTower(ctx, view, b, lod, dim)
      break
    case 'pyramid':
      drawPyramid(ctx, view, b, lod, dim)
      break
    case 'twin':
      drawTwin(ctx, view, b, lod, dim)
      break
    case 'dome':
      drawDomeBuilding(ctx, view, b, lod, dim)
      break
    case 'greenhouse':
      drawGreenhouse(ctx, view, b, lod, dim)
      break
    case 'arena':
      drawArena(ctx, view, b, lod, dim)
      break
    case 'station':
      drawStation(ctx, view, b, lod, dim)
      break
    case 'market':
      drawMarket(ctx, view, b, lod, dim)
      break
    case 'data':
      drawData(ctx, view, b, lod, dim)
      break
    case 'industrial':
      drawIndustrial(ctx, view, b, lod, dim)
      break
    case 'spire':
      drawTower(ctx, view, b, lod, dim)
      break
    default:
      drawBlock(ctx, view, b, lod, dim)
      break
  }

  if (lod >= 2) {
    const streetPts = facePoints(view, b.x, b.y, b.w, b.d, 0, 5)
    drawStorefront(ctx, view, b, streetPts, lod, dim)
  }
}

export function drawProp(ctx: CanvasRenderingContext2D, view: View, p: Prop) {
  const zoom = view.camera.zoom
  const base = project(view, p.x, p.y, 0)
  if (base[0] < -40 || base[0] > view.width + 40 || base[1] < -40 || base[1] > view.height + 40) return
  const dim = districtDim(view, p.district)
  ctx.save()
  ctx.globalAlpha = dim
  if (p.kind === 'streetlight') {
    if (zoom < 0.28) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = rgba(p.color, 0.7)
      ctx.fillRect(base[0], base[1] - 1, 1, 1)
      ctx.restore()
    } else {
      const top = project(view, p.x, p.y, 7)
      const head = project(view, p.x + 1.6, p.y, 7.1)
      line(ctx, base, top, 'rgba(77,87,118,0.8)', 1)
      line(ctx, top, head, 'rgba(77,87,118,0.7)', 1)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = rgba(p.color, 0.9)
      ctx.fillRect(head[0] - 1, head[1] - 1, 2, 2)
      ctx.fillStyle = rgba(p.color, 0.12)
      ctx.fillRect(head[0] - 4, head[1] + 1, 9, 3)
      ctx.restore()
    }
  } else if (p.kind === 'vending') {
    if (zoom > 0.4) {
      const h = 2.2
      const a = project(view, p.x, p.y, 0)
      const b = project(view, p.x + 0.8, p.y, 0)
      const c = project(view, p.x + 0.8, p.y + 0.45, 0)
      const d = project(view, p.x, p.y + 0.45, 0)
      const at = project(view, p.x, p.y, h)
      const bt = project(view, p.x + 0.8, p.y, h)
      const ct = project(view, p.x + 0.8, p.y + 0.45, h)
      const dt = project(view, p.x, p.y + 0.45, h)
      polygon(ctx, [a, b, bt, at], '#1b2032', 'rgba(2,4,10,0.8)')
      polygon(ctx, [a, d, dt, at], '#242b42', 'rgba(2,4,10,0.8)')
      polygon(ctx, [at, bt, ct, dt], '#323b58')
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = rgba(p.color, 0.75)
      ctx.fillRect(bt[0] - 1, bt[1] + 1, 1, 2)
      ctx.restore()
    }
  } else if (p.kind === 'tree') {
    const s = zoom < 0.35 ? 1 : Math.max(2, Math.round(3 * zoom))
    const color = p.color
    const seed = hash2(p.x * 13.7, p.y * 7.3)
    ctx.fillStyle = '#191d1c'
    ctx.fillRect(base[0], base[1] - s * 2, s, s * 2)
    // layered canopy: dark base, mid, bright rim
    ctx.fillStyle = shade(color, 0.55)
    ctx.fillRect(base[0] - s * 2, base[1] - s * 3, s * 4, s * 2)
    ctx.fillStyle = color
    ctx.fillRect(base[0] - s, base[1] - s * 4, s * 2, s * 2)
    ctx.fillRect(base[0] - s * 2 + (seed > 0.5 ? 1 : 0), base[1] - s * 3, s * 4, s)
    ctx.fillStyle = shade(color, 1.35)
    ctx.fillRect(base[0] - s, base[1] - s * 4, s, 1)
    if (zoom > 0.9) {
      ctx.fillStyle = rgba(color, 0.28)
      ctx.fillRect(base[0] + s, base[1] - s * 2, s - 1, 1)
    }
  } else if (p.kind === 'bench') {
    if (zoom > 0.4) {
      const w = Math.max(2, Math.round(3 * zoom))
      ctx.fillStyle = '#2a2431'
      ctx.fillRect(base[0], base[1] - 2, w, 1)
      ctx.fillStyle = '#6b4f3a'
      ctx.fillRect(base[0], base[1] - 1, w, 1)
      ctx.fillStyle = '#1a1622'
      ctx.fillRect(base[0], base[1], 1, 1)
      ctx.fillRect(base[0] + w - 1, base[1], 1, 1)
      ctx.fillStyle = rgba(p.color, 0.5)
      ctx.fillRect(base[0], base[1] - 2, w, 1)
    }
  } else if (p.kind === 'planter') {
    if (zoom > 0.4) {
      const w = Math.max(2, Math.round(3 * zoom))
      ctx.fillStyle = '#2b2430'
      ctx.fillRect(base[0] - 1, base[1] - 2, w + 2, 2)
      ctx.fillStyle = shade(p.color, 0.6)
      ctx.fillRect(base[0] - 1, base[1] - 2, w + 2, 1)
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i % 2 ? p.color : shade(p.color, 1.25)
        ctx.fillRect(base[0] + i, base[1] - 3 - (i % 2), 1, 2)
      }
    }
  } else if (p.kind === 'foodcart') {
    if (zoom > 0.5) {
      const w = Math.max(3, Math.round(3.2 * zoom))
      ctx.fillStyle = '#2a2230'
      ctx.fillRect(base[0] - 1, base[1] - 2, w + 2, 2)
      ctx.fillStyle = p.color
      ctx.fillRect(base[0], base[1] - 4, w, 2)
      ctx.fillStyle = '#fff0c4'
      ctx.fillRect(base[0] + 1, base[1] - 3, 1, 1)
      ctx.fillStyle = rgba('#ff8a2a', 0.9)
      ctx.fillRect(base[0] + w - 1, base[1] - 3, 1, 1)
      ctx.strokeStyle = 'rgba(150,160,180,0.6)'
      ctx.beginPath()
      ctx.moveTo(base[0], base[1] - 4)
      ctx.lineTo(base[0] + 1, base[1] - 7)
      ctx.lineTo(base[0] + w, base[1] - 7)
      ctx.stroke()
      ctx.fillStyle = rgba(p.color, 0.35)
      ctx.fillRect(base[0] + 1, base[1] - 7, w - 1, 1)
    }
  } else if (p.kind === 'vent') {
    if (zoom > 0.45) {
      const top = project(view, p.x, p.y, p.z)
      ctx.fillStyle = '#1d222f'
      ctx.fillRect(top[0] - 1, top[1], 3, 3)
      ctx.fillStyle = rgba(p.color, 0.65)
      ctx.fillRect(top[0], top[1] + 1, 1, 1)
    }
  } else if (p.kind === 'crane') {
    if (zoom > 0.4) {
      const top = project(view, p.x, p.y, 20)
      line(ctx, base, top, 'rgba(255,180,92,0.55)', 1)
      const arm = project(view, p.x + 7, p.y, 19)
      line(ctx, top, arm, 'rgba(255,180,92,0.45)', 1)
      line(ctx, project(view, p.x + 7, p.y, 19), project(view, p.x + 7, p.y, 14), 'rgba(255,180,92,0.3)', 1)
      ctx.fillStyle = '#ff4f6d'
      ctx.fillRect(top[0], top[1] - 1, 1, 1)
    }
  } else if (p.kind === 'stall') {
    if (zoom > 0.45) {
      const top = project(view, p.x, p.y, 3)
      polygon(
        ctx,
        [base, [base[0] + 7 * zoom, base[1] - 1], [top[0] + 7 * zoom, top[1] - 1], top],
        rgba(p.color, 0.45),
        rgba(p.color, 0.6),
      )
      ctx.fillStyle = '#ffe1a3'
      ctx.fillRect(top[0], top[1], 1, 1)
    }
  } else if (p.kind === 'fountain') {
    if (zoom > 0.35) {
      ctx.strokeStyle = rgba(p.color, 0.55)
      ctx.beginPath()
      ctx.ellipse(base[0], base[1], Math.max(2, 4 * zoom), Math.max(1, 2 * zoom), 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = rgba(p.color, 0.18)
      ctx.fill()
    }
  } else if (p.kind === 'camera') {
    const top = project(view, p.x, p.y, p.z + 2)
    line(ctx, base, top, 'rgba(80,95,120,0.7)', 1)
    ctx.fillStyle = '#ff4f6d'
    ctx.fillRect(top[0], top[1], 1, 1)
  } else if (p.kind === 'terminal') {
    if (zoom > 0.45) {
      const top = project(view, p.x, p.y, 2.2)
      ctx.fillStyle = '#1a2233'
      ctx.fillRect(base[0] - 1, top[1], 4, Math.max(2, base[1] - top[1]))
      ctx.fillStyle = rgba(p.color, 0.8)
      ctx.fillRect(top[0] - 1, top[1] + 1, 3, 1)
    }
  } else if (p.kind === 'pipe') {
    if (zoom > 0.4) {
      const a = project(view, p.x - 1, p.y, p.z)
      const b = project(view, p.x + 2, p.y, p.z)
      line(ctx, a, b, '#3b3430', Math.max(1, Math.round(2 * zoom)))
      line(ctx, a, b, rgba(p.color, 0.3), 1)
    }
  }
  ctx.restore()
}

export function drawRailSegment(ctx: CanvasRenderingContext2D, view: View, rail: RailLine, from: number, to: number) {
  const isX = rail.axis === 'x'
  const x = isX ? from : rail.coord
  const y = isX ? rail.coord : from
  const w = isX ? to - from : 2.2
  const d = isX ? 2.2 : to - from
  const z = rail.z
  const color = rail.color
  const support = project(view, x + w / 2, y + d / 2, 0)
  const deck = project(view, x + w / 2, y + d / 2, z)
  if (support[0] < -80 || support[0] > view.width + 80 || support[1] < -80 || support[1] > view.height + 80) return
  ctx.save()
  ctx.globalAlpha = 0.95
  // pylon
  if (view.camera.zoom > 0.3) {
    line(ctx, support, deck, 'rgba(45,48,68,0.85)', Math.max(1, Math.round(view.camera.zoom * 2)))
    const cross = project(view, x + w / 2, y + d / 2, z * 0.5)
    line(ctx, [cross[0] - 4, cross[1]], [cross[0] + 4, cross[1]], 'rgba(80,88,112,0.45)', 1)
  }
  const height = rail.kind === 'highway' ? 2 : 2.8
  const body: [string, string, string] = rail.kind === 'highway' ? ['#242b3b', '#171b28', '#323c52'] : ['#1d2433', '#121722', '#2a3448']
  const pts = facePoints(view, x, y, w, d, z, z + height)
  polygon(ctx, [pts.D0, pts.C0, pts.C1, pts.D1], body[1])
  polygon(ctx, [pts.B0, pts.C0, pts.C1, pts.B1], body[0])
  polygon(ctx, [pts.A1, pts.B1, pts.C1, pts.D1], body[2])
  polygon(ctx, [pts.D0, pts.C0, pts.C1, pts.D1], undefined, 'rgba(2,4,10,0.8)')
  polygon(ctx, [pts.B0, pts.C0, pts.C1, pts.B1], undefined, 'rgba(2,4,10,0.8)')
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const a = project(view, isX ? from : rail.coord, isX ? rail.coord : from, z + height + 1)
  const b = project(view, isX ? to : rail.coord, isX ? rail.coord : to, z + height + 1)
  line(ctx, a, b, rgba(color, rail.kind === 'highway' ? 0.25 : 0.65), rail.kind === 'highway' ? 1 : 2)
  if (rail.kind === 'maglev') {
    ctx.fillStyle = rgba(color, 0.08)
    ctx.fillRect(Math.min(a[0], b[0]) - 2, Math.min(a[1], b[1]) - 1, Math.abs(b[0] - a[0]) + 4, Math.abs(b[1] - a[1]) + 4)
  }
  ctx.restore()
  // guard lights
  if (view.camera.zoom > 0.55) {
    for (let i = 0; i < 3; i++) {
      const t = (i + 0.5) / 3
      const p = project(view, isX ? from + (to - from) * t : rail.coord, isX ? rail.coord : from + (to - from) * t, z + height + 1)
      ctx.fillStyle = i % 2 ? rgba(color, 0.75) : 'rgba(255,255,255,0.5)'
      ctx.fillRect(p[0], p[1], 1, 1)
    }
  }
  ctx.restore()
}
