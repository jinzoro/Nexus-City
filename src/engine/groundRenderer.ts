import type { CityData, Park } from '../types'
import { BLOCK_COUNT, BLOCK_SIZE, ROAD_SIZE, TILE_H, TILE_W, districtForCell, getDistrict } from '../data/city'
import { drawPixelText } from './pixelFont'
import {
  type Pt,
  type View,
  clamp,
  drawDiamond,
  hash2,
  isBoundsVisible,
  line,
  pRaw,
  polygon,
  project,
  rgba,
} from './renderUtils'

function worldDiamond(view: View, x: number, y: number, w: number, d: number) {
  return [
    project(view, x, y),
    project(view, x + w, y),
    project(view, x + w, y + d),
    project(view, x, y + d),
  ] as Pt[]
}

function screenBounds(points: Pt[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of points) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY }
}

function drawBackground(ctx: CanvasRenderingContext2D, view: View) {
  const { width, height, camera } = view
  const grad = ctx.createLinearGradient(0, 0, 0, height)
  grad.addColorStop(0, '#04030b')
  grad.addColorStop(0.42, '#080519')
  grad.addColorStop(0.7, '#0b0620')
  grad.addColorStop(1, '#05040d')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  const px = (-camera.x * 0.045) % (width + 320)
  const py = (-camera.y * 0.025) % (height + 220)

  const glow = ctx.createRadialGradient(width * 0.53 + px, height * 0.44 + py, 10, width * 0.53 + px, height * 0.44 + py, width * 0.65)
  glow.addColorStop(0, 'rgba(37,40,105,0.32)')
  glow.addColorStop(0.45, 'rgba(61,15,73,0.18)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  // distant cavern wall ribs
  ctx.save()
  ctx.globalAlpha = 0.8
  for (let i = -2; i < 10; i++) {
    const x = ((i * 150 + px * 1.8) % (width + 300)) - 150
    const rib = ctx.createLinearGradient(x, 0, x + 90, 0)
    rib.addColorStop(0, 'rgba(2,2,8,0)')
    rib.addColorStop(0.45, 'rgba(20,16,44,0.5)')
    rib.addColorStop(0.5, 'rgba(40,30,85,0.25)')
    rib.addColorStop(1, 'rgba(2,2,8,0)')
    ctx.fillStyle = rib
    ctx.fillRect(x, height * 0.1, 120, height * 0.72)
  }
  ctx.restore()

  // far city silhouette and lights
  ctx.save()
  ctx.globalAlpha = 0.5
  for (let i = 0; i < 54; i++) {
    const x = ((hash2(i, 2) * (width + 260) + px * 2.2) % (width + 260)) - 130
    const base = height * 0.68 + hash2(i, 4) * height * 0.12
    const w = 5 + hash2(i, 7) * 22
    const h = 20 + hash2(i, 9) * height * 0.25
    ctx.fillStyle = i % 4 === 0 ? '#0d0b21' : '#080716'
    ctx.fillRect(Math.round(x), Math.round(base - h), Math.round(w), Math.round(h))
    for (let k = 0; k < 6; k++) {
      if (hash2(i * 7, k) > 0.48) {
        ctx.fillStyle = k % 3 === 0 ? 'rgba(34,230,255,0.34)' : 'rgba(255,79,163,0.22)'
        ctx.fillRect(Math.round(x + 2 + hash2(i, k) * (w - 4)), Math.round(base - h + 5 + hash2(k, i) * (h - 8)), 1, 1)
      }
    }
  }
  ctx.restore()

  // artificial sky ribbons
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 3; i++) {
    const y = height * (0.17 + i * 0.055) + py * 0.4
    const a = 0.035 + i * 0.012
    ctx.fillStyle = i === 1 ? rgba('#ff3dd8', a) : rgba('#22e6ff', a)
    ctx.fillRect(0, Math.round(y), width, 2 + i)
  }
  ctx.restore()

  // dust / distant sparks
  for (let i = 0; i < 80; i++) {
    const x = (hash2(i, 21) * width + px * 0.8) % width
    const y = (hash2(i, 22) * height + py * 0.6) % height
    ctx.fillStyle = i % 7 === 0 ? 'rgba(255,79,163,0.32)' : 'rgba(143,248,255,0.18)'
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1)
  }
}

function drawOuterSprawl(ctx: CanvasRenderingContext2D, view: View) {
  if (view.camera.zoom > 0.48) return
  const { city } = view
  for (const b of city.outerBlocks) {
    const pts = worldDiamond(view, b.x, b.y, b.w, b.d)
    const bounds = screenBounds(pts)
    if (!isBoundsVisible(view, bounds, 20)) continue
    const top = project(view, b.x + b.w / 2, b.y + b.d / 2, b.h)
    const left = project(view, b.x, b.y + b.d / 2, 0)
    const right = project(view, b.x + b.w, b.y + b.d / 2, 0)
    const bottom = project(view, b.x + b.w / 2, b.y + b.d, 0)
    polygon(ctx, [left, top, right, bottom], b.color)
    polygon(ctx, [pts[1], pts[2], right, top], rgba('#05040c', 0.55))
    polygon(ctx, [pts[2], pts[3], bottom, right], rgba('#05040c', 0.7))
    const seed = b.seed
    if (view.camera.zoom > 0.28) {
      for (let i = 0; i < 4; i++) {
        if (hash2(seed, i) > 0.5) {
          const p = project(view, b.x + 1 + hash2(seed, i + 3) * (b.w - 2), b.y + 1 + hash2(seed, i + 8) * (b.d - 2), b.h * (0.35 + hash2(i, seed) * 0.5))
          ctx.fillStyle = i % 2 ? 'rgba(34,230,255,0.35)' : 'rgba(255,79,163,0.25)'
          ctx.fillRect(p[0], p[1], 1, 1)
        }
      }
    }
  }
}

function drawCityBase(ctx: CanvasRenderingContext2D, view: View) {
  const size = view.city.size
  const outer = worldDiamond(view, -70, -70, size + 140, size + 140)
  polygon(ctx, outer, '#070610', rgba('#22e6ff', 0.05))
  const inner = worldDiamond(view, -2, -2, size + 4, size + 4)
  polygon(ctx, inner, '#0a0914', rgba('#22e6ff', 0.22))

  const city = worldDiamond(view, 0, 0, size, size)
  polygon(ctx, city, '#0d0c19', rgba('#22e6ff', 0.34), 1)

  // huge structural seams under the city
  ctx.save()
  ctx.globalAlpha = 0.45
  for (let i = 1; i < 5; i++) {
    const x = (size / 5) * i
    line(ctx, project(view, x, 0), project(view, x, size), 'rgba(53,68,120,0.22)')
    line(ctx, project(view, 0, x), project(view, size, x), 'rgba(53,68,120,0.22)')
  }
  ctx.restore()

  // edge warning glow
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = 'rgba(34,230,255,0.18)'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i < city.length; i++) {
    if (i === 0) ctx.moveTo(city[i][0], city[i][1])
    else ctx.lineTo(city[i][0], city[i][1])
  }
  ctx.closePath()
  ctx.stroke()
  ctx.restore()
}

function drawBlockGround(ctx: CanvasRenderingContext2D, view: View) {
  const { city } = view
  const zoom = view.camera.zoom
  for (let by = 0; by < BLOCK_COUNT; by++) {
    for (let bx = 0; bx < BLOCK_COUNT; bx++) {
      const x0 = bx * BLOCK_SIZE + ROAD_SIZE
      const y0 = by * BLOCK_SIZE + ROAD_SIZE
      const pts = worldDiamond(view, x0, y0, 9, 9)
      const bounds = screenBounds(pts)
      if (!isBoundsVisible(view, bounds, 30)) continue
      const district = districtForCell(x0 + 4.5, y0 + 4.5)
      const d = getDistrict(district)
      const base = district === 'bio' ? '#0d1815' : district === 'residential' ? '#13101c' : '#10101d'
      polygon(ctx, pts, base)
      polygon(ctx, pts, rgba(d.color, district === 'bio' ? 0.045 : 0.028))
      ctx.strokeStyle = 'rgba(150,180,220,0.08)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) ctx.moveTo(pts[i][0], pts[i][1])
        else ctx.lineTo(pts[i][0], pts[i][1])
      }
      ctx.closePath()
      ctx.stroke()

      if (zoom > 0.5) {
        const seams = [3, 6]
        for (const s of seams) {
          line(ctx, project(view, x0 + s, y0), project(view, x0 + s, y0 + 9), 'rgba(155,180,220,0.055)')
          line(ctx, project(view, x0, y0 + s), project(view, x0 + 9, y0 + s), 'rgba(155,180,220,0.055)')
        }
      }
      if (zoom > 1.1) {
        for (let i = 0; i < 6; i++) {
          const px = x0 + hash2(bx * 9 + i, by * 7) * 9
          const py = y0 + hash2(by * 9 + i, bx * 7) * 9
          const p = project(view, px, py)
          ctx.fillStyle = i % 3 === 0 ? 'rgba(34,230,255,0.14)' : 'rgba(255,255,255,0.06)'
          ctx.fillRect(p[0], p[1], 1, 1)
        }
      }
    }
  }
}

function drawRoadStrip(
  ctx: CanvasRenderingContext2D,
  view: View,
  x: number,
  y: number,
  w: number,
  d: number,
  district: string,
  axis: 'x' | 'y',
) {
  const pts = worldDiamond(view, x, y, w, d)
  const bounds = screenBounds(pts)
  if (!isBoundsVisible(view, bounds, 40)) return
  const dColor = getDistrict(district as never).color
  polygon(ctx, pts, '#080b16', 'rgba(76,98,142,0.16)')
  if (view.camera.zoom > 0.48) {
    const mid = axis === 'x' ? x + w / 2 : x + w / 2
    const midY = y + d / 2
    line(
      ctx,
      project(view, axis === 'x' ? x : mid, axis === 'x' ? midY : y),
      project(view, axis === 'x' ? x + w : mid, axis === 'x' ? midY : y + d),
      rgba(dColor, 0.09),
    )
  }
  if (view.camera.zoom > 0.28) {
    // lane dashes
    const step = 5
    const offset = 1.5
    if (axis === 'x') {
      for (let yy = y + offset; yy < y + d; yy += step) {
        const p = project(view, x + w * 0.5, yy)
        ctx.fillStyle = 'rgba(255,207,122,0.28)'
        ctx.fillRect(p[0] - 1, p[1], 2, 1)
      }
    } else {
      for (let xx = x + offset; xx < x + w; xx += step) {
        const p = project(view, xx, y + d * 0.5)
        ctx.fillStyle = 'rgba(255,207,122,0.28)'
        ctx.fillRect(p[0], p[1] - 1, 1, 2)
      }
    }
  }
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = rgba(dColor, 0.12)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  ctx.lineTo(pts[1][0], pts[1][1])
  ctx.stroke()
  ctx.restore()
}

function drawRoads(ctx: CanvasRenderingContext2D, view: View) {
  const size = view.city.size
  for (let b = 0; b < BLOCK_COUNT; b++) {
    const x = b * BLOCK_SIZE
    const y = b * BLOCK_SIZE
    const district = districtForCell(x + 1, 99)
    drawRoadStrip(ctx, view, x, 0, ROAD_SIZE, size, district, 'x')
    const district2 = districtForCell(99, y + 1)
    drawRoadStrip(ctx, view, 0, y, size, ROAD_SIZE, district2, 'y')
  }
}

function drawCrosswalks(ctx: CanvasRenderingContext2D, view: View) {
  if (view.camera.zoom < 0.72) return
  for (let by = 0; by < BLOCK_COUNT; by++) {
    for (let bx = 0; bx < BLOCK_COUNT; bx++) {
      const cx = bx * BLOCK_SIZE + 1
      const cy = by * BLOCK_SIZE + 1
      const p = project(view, cx, cy)
      if (p[0] < -60 || p[0] > view.width + 60 || p[1] < -60 || p[1] > view.height + 60) continue
      for (let i = 0; i < 4; i++) {
        const a = project(view, cx - 1.6 + i * 0.9, cy - 1.3)
        const b = project(view, cx - 1.2 + i * 0.9, cy + 1.3)
        line(ctx, a, b, 'rgba(220,235,255,0.22)', 1)
        const c = project(view, cx - 1.3, cy - 1.6 + i * 0.9)
        const d = project(view, cx + 1.3, cy - 1.2 + i * 0.9)
        line(ctx, c, d, 'rgba(220,235,255,0.18)', 1)
      }
    }
  }
}

function drawPark(ctx: CanvasRenderingContext2D, view: View, park: Park) {
  const pts = worldDiamond(view, park.x, park.y, park.w, park.d)
  const bounds = screenBounds(pts)
  if (!isBoundsVisible(view, bounds, 40)) return
  const d = getDistrict(park.district)
  if (park.kind === 'plaza') {
    polygon(ctx, pts, '#171527', rgba(d.color, 0.3))
    const center = project(view, park.x + park.w / 2, park.y + park.d / 2)
    const rx = ((park.w + park.d) / 2) * (TILE_W / 2) * view.camera.zoom * 0.7
    const ry = ((park.w + park.d) / 2) * (TILE_H / 2) * view.camera.zoom * 0.7
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 1; i <= 3; i++) {
      ctx.strokeStyle = rgba(d.color, 0.1 + i * 0.04)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(center[0], center[1], rx * (i / 3), ry * (i / 3), 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const p = project(view, park.x + park.w / 2 + Math.cos(a) * park.w * 0.38, park.y + park.d / 2 + Math.sin(a) * park.d * 0.38)
      ctx.fillStyle = rgba(i % 2 ? d.color : d.accent, 0.45)
      ctx.fillRect(p[0], p[1], 1, 1)
    }
  } else if (park.kind === 'park') {
    polygon(ctx, pts, '#0c1714', rgba(d.color, 0.28))
    const c = project(view, park.x + park.w / 2, park.y + park.d / 2)
    line(ctx, project(view, park.x + 1, park.y + park.d / 2), project(view, park.x + park.w - 1, park.y + park.d / 2), 'rgba(190,220,180,0.2)')
    line(ctx, project(view, park.x + park.w / 2, park.y + 1), project(view, park.x + park.w / 2, park.y + park.d - 1), 'rgba(190,220,180,0.2)')
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = rgba(d.color, 0.1)
    ctx.beginPath()
    ctx.ellipse(c[0], c[1], park.w * 5 * view.camera.zoom, park.d * 2.5 * view.camera.zoom, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  } else if (park.kind === 'lake') {
    polygon(ctx, pts, '#071d23', rgba(d.color, 0.4))
    const center = project(view, park.x + park.w / 2, park.y + park.d / 2)
    const rx = (park.w * TILE_W * 0.36) * view.camera.zoom
    const ry = (park.d * TILE_H * 0.4) * view.camera.zoom
    ctx.fillStyle = '#0a3038'
    ctx.beginPath()
    ctx.ellipse(center[0], center[1], rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = rgba('#4fffe0', 0.4)
    ctx.stroke()
    for (let i = 0; i < 5; i++) {
      const t = i / 5
      ctx.strokeStyle = rgba('#4fffe0', 0.16)
      ctx.beginPath()
      ctx.ellipse(center[0], center[1] + 1, rx * (0.2 + t * 0.7), ry * (0.2 + t * 0.7), 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  } else if (park.kind === 'farm') {
    polygon(ctx, pts, '#101a12', rgba(d.color, 0.25))
    for (let i = 0; i < 7; i++) {
      const t = (i + 0.5) / 7
      line(
        ctx,
        project(view, park.x + park.w * t, park.y + 0.7),
        project(view, park.x + park.w * t, park.y + park.d - 0.7),
        'rgba(120,220,120,0.2)',
      )
    }
  } else {
    polygon(ctx, pts, '#171412', rgba('#ff8a2a', 0.18))
    for (let i = 0; i < 3; i++) {
      const t = (i + 0.5) / 3
      line(ctx, project(view, park.x + park.w * t, park.y), project(view, park.x + park.w * t, park.y + park.d), 'rgba(255,138,42,0.22)')
    }
  }
  // border accents
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = rgba(d.color, 0.2)
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) ctx.moveTo(pts[i][0], pts[i][1])
    else ctx.lineTo(pts[i][0], pts[i][1])
  }
  ctx.closePath()
  ctx.stroke()
  ctx.restore()
}

function drawGroundGlow(ctx: CanvasRenderingContext2D, view: View) {
  const { city } = view
  if (view.camera.zoom > 0.7) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const d of city.districts) {
    const p = project(view, d.center.x, d.center.y)
    if (p[0] < -200 || p[0] > view.width + 200 || p[1] < -160 || p[1] > view.height + 160) continue
    const radius = (d.radius * 18 + 80) * view.camera.zoom
    const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], radius)
    g.addColorStop(0, rgba(d.color, 0.07))
    g.addColorStop(1, rgba(d.color, 0))
    ctx.fillStyle = g
    ctx.fillRect(p[0] - radius, p[1] - radius, radius * 2, radius * 2)
  }
  ctx.restore()
}

export function renderGround(ctx: CanvasRenderingContext2D, view: View) {
  ctx.clearRect(0, 0, view.width, view.height)
  drawBackground(ctx, view)
  drawGroundGlow(ctx, view)
  drawOuterSprawl(ctx, view)
  drawCityBase(ctx, view)
  drawBlockGround(ctx, view)
  drawRoads(ctx, view)
  drawCrosswalks(ctx, view)
  for (const park of view.city.parks) drawPark(ctx, view, park)
  drawGroundDetails(ctx, view)
  drawWetStreets(ctx, view)
}

function drawWetStreets(ctx: CanvasRenderingContext2D, view: View) {
  const raining = view.event?.type === 'rain'
  const strength = raining ? 1 : 0.28
  if (view.camera.zoom < 0.34) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const time = view.time
  // long vertical smears beneath landmarks read as reflected neon
  const landmarks = view.city.landmarks
  for (let i = 0; i < landmarks.length; i++) {
    const b = landmarks[i]
    const d = getDistrict(b.district)
    const base = project(view, b.x + b.w / 2, b.y + b.d / 2, 0)
    if (base[0] < -80 || base[0] > view.width + 80 || base[1] < -40 || base[1] > view.height + 60) continue
    const len = (22 + (i % 4) * 12) * view.camera.zoom * strength
    const wobble = Math.sin(time * 1.1 + i) * 2
    for (let k = 0; k < 5; k++) {
      const spread = (k - 2) * 3 * view.camera.zoom
      ctx.fillStyle = rgba(k % 2 ? d.color : d.accent, (0.08 + (raining ? 0.06 : 0)) * (1 - k * 0.12))
      ctx.fillRect(Math.round(base[0] + spread + wobble), Math.round(base[1] + k * 2), Math.max(1, Math.round(2 * view.camera.zoom)), Math.max(2, Math.round(len * (0.5 + k * 0.1))))
    }
  }
  // scattered puddles with animated highlight
  const count = raining ? 90 : 34
  for (let i = 0; i < count; i++) {
    const x = hash2(i, 41) * view.city.size
    const y = hash2(i, 42) * view.city.size
    const p = project(view, x, y)
    if (p[0] < -10 || p[0] > view.width + 10 || p[1] < -10 || p[1] > view.height + 10) continue
    const d = getDistrict(districtForCell(x, y))
    const shimmer = 0.5 + Math.sin(time * 2 + i * 1.3) * 0.5
    ctx.fillStyle = rgba(i % 3 === 0 ? d.accent : d.color, (raining ? 0.1 : 0.04) * (0.5 + shimmer * 0.8))
    ctx.fillRect(p[0], p[1], 2 + (i % 3), 1)
  }
  ctx.restore()
}

function drawGroundDetails(ctx: CanvasRenderingContext2D, view: View) {
  if (view.camera.zoom < 0.5) return
  const { city } = view
  // neon reflections in the wet streets
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 70; i++) {
    const x = hash2(i, 31) * city.size
    const y = hash2(i, 32) * city.size
    const p = project(view, x, y)
    if (p[0] < 0 || p[0] > view.width || p[1] < 0 || p[1] > view.height) continue
    const d = getDistrict(districtForCell(x, y))
    ctx.fillStyle = rgba(i % 3 === 0 ? d.accent : d.color, 0.12)
    ctx.fillRect(p[0], p[1], 2, 1)
  }
  ctx.restore()
}

export function renderForeground(ctx: CanvasRenderingContext2D, view: View) {
  ctx.clearRect(0, 0, view.width, view.height)
  const { width, height, camera, time } = view
  const top = Math.round(height * 0.155)
  const shift = (-camera.x * 0.11) % (width + 200)
  const shiftY = (-camera.y * 0.035) % 50

  ctx.save()
  // jagged cavern ceiling in the foreground
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(width, 0)
  ctx.lineTo(width, top * 0.55 + shiftY)
  const teeth = Math.ceil(width / 34) + 2
  for (let i = teeth; i >= 0; i--) {
    const x = i * 34 + shift
    const t = i % 5
    const depth = top * (0.45 + (t === 0 ? 0.72 : t === 2 ? 0.25 : 0.5)) + hash2(i, 3) * 20
    ctx.lineTo(x + 10, depth)
    ctx.lineTo(x + 18, top * 0.5)
    ctx.lineTo(x + 26, depth * 0.7)
  }
  ctx.lineTo(0, top * 0.55 + shiftY)
  ctx.closePath()
  const rock = ctx.createLinearGradient(0, 0, 0, top)
  rock.addColorStop(0, '#030208')
  rock.addColorStop(0.55, '#080513')
  rock.addColorStop(1, '#0d0718')
  ctx.fillStyle = rock
  ctx.fill()

  // giant support ribs
  ctx.globalAlpha = 0.85
  for (let i = -1; i < 8; i++) {
    const x = ((i * 160 + shift * 1.8) % (width + 220)) - 60
    ctx.fillStyle = '#0b0817'
    ctx.fillRect(Math.round(x), 0, 22, top * 0.72)
    ctx.fillStyle = '#18132e'
    ctx.fillRect(Math.round(x + 4), 0, 4, top * 0.7)
    ctx.fillStyle = rgba('#22e6ff', 0.12)
    ctx.fillRect(Math.round(x + 9), 0, 1, top * 0.56)
    ctx.fillStyle = '#070510'
    ctx.fillRect(Math.round(x - 10), Math.round(top * 0.62), 44, 7)
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = k === 1 ? rgba('#ff3dd8', 0.42) : rgba('#22e6ff', 0.24)
      ctx.fillRect(Math.round(x - 6 + k * 13), Math.round(top * 0.64), 4, 1)
    }
  }

  // suspended pipes
  ctx.globalAlpha = 1
  for (let i = 0; i < 3; i++) {
    const y = 14 + i * 18 + shiftY * 0.2
    const x0 = -30 + shift * 0.6
    ctx.fillStyle = i === 0 ? '#17142a' : '#0e0c1c'
    ctx.fillRect(Math.round(x0), Math.round(y), width + 80, 5)
    ctx.fillStyle = 'rgba(143,248,255,0.14)'
    ctx.fillRect(Math.round(x0), Math.round(y), width + 80, 1)
    for (let k = 0; k < 12; k++) {
      const x = x0 + k * 90
      ctx.fillStyle = '#231d3c'
      ctx.fillRect(Math.round(x), Math.round(y - 2), 6, 9)
      ctx.fillStyle = i === 1 ? rgba('#ff3dd8', 0.4) : rgba('#22e6ff', 0.4)
      ctx.fillRect(Math.round(x + 2), Math.round(y + 1), 2, 1)
    }
  }

  // hanging cables
  for (let i = 0; i < 9; i++) {
    const x = ((i * 113 + shift * 2.2) % (width + 120)) - 60
    const sag = 22 + hash2(i, 8) * 34
    ctx.strokeStyle = 'rgba(31,26,55,0.9)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.quadraticCurveTo(x + 8, sag, x + 34, top * 0.65)
    ctx.stroke()
    if (i % 3 === 0) {
      ctx.fillStyle = rgba('#22e6ff', 0.6)
      ctx.fillRect(Math.round(x + 31), Math.round(top * 0.64), 2, 2)
    }
  }

  // giant ceiling fans
  for (let i = 0; i < 2; i++) {
    const cx = width * (i === 0 ? 0.18 : 0.79) + shift * 0.5
    const cy = top * 0.38
    const r = Math.min(30, top * 0.34)
    ctx.strokeStyle = '#181331'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = 'rgba(12,9,25,0.95)'
    ctx.beginPath()
    ctx.arc(cx, cy, r - 2, 0, Math.PI * 2)
    ctx.fill()
    const angle = time * (i === 0 ? 0.22 : -0.17)
    for (let b = 0; b < 4; b++) {
      const a = angle + (b / 4) * Math.PI * 2
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(a)
      ctx.fillStyle = '#221b3d'
      ctx.fillRect(0, -2, r - 5, 4)
      ctx.fillStyle = rgba('#22e6ff', 0.25)
      ctx.fillRect(3, -1, r - 10, 1)
      ctx.restore()
    }
    ctx.fillStyle = '#2b2350'
    ctx.fillRect(Math.round(cx - 2), Math.round(cy - 2), 4, 4)
    ctx.fillStyle = 'rgba(255,61,216,0.35)'
    ctx.fillRect(Math.round(cx + r - 6), Math.round(cy - 1), 1, 1)
  }

  // artificial sun panels
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 3; i++) {
    const x = width * (0.32 + i * 0.18) + shift * 0.4
    const y = top * (0.25 + i * 0.08)
    ctx.fillStyle = i === 1 ? 'rgba(255,61,216,0.12)' : 'rgba(34,230,255,0.1)'
    ctx.fillRect(Math.round(x), Math.round(y), 52, 3)
    ctx.fillStyle = i === 1 ? 'rgba(255,61,216,0.45)' : 'rgba(34,230,255,0.42)'
    ctx.fillRect(Math.round(x + 4), Math.round(y + 1), 44, 1)
  }
  // light shafts
  for (let i = 0; i < 2; i++) {
    const x = width * (0.2 + i * 0.56)
    const g = ctx.createLinearGradient(x, top * 0.3, x + 30, height)
    g.addColorStop(0, i === 0 ? 'rgba(34,230,255,0.035)' : 'rgba(255,61,216,0.03)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(x, top * 0.2)
    ctx.lineTo(x + 26, top * 0.2)
    ctx.lineTo(x + 150, height)
    ctx.lineTo(x + 60, height)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()

  // bottom fog
  const fog = ctx.createLinearGradient(0, height * 0.8, 0, height)
  fog.addColorStop(0, 'rgba(5,4,13,0)')
  fog.addColorStop(1, 'rgba(5,4,13,0.55)')
  ctx.fillStyle = fog
  ctx.fillRect(0, height * 0.8, width, height * 0.2)
  ctx.restore()

  if (camera.zoom < 0.36) drawDistrictLabels(ctx, view)
}

function drawDistrictLabels(ctx: CanvasRenderingContext2D, view: View) {
  const scale = view.width > 620 ? 2 : 1
  for (const d of view.city.districts) {
    const p = project(view, d.center.x, d.center.y)
    if (p[0] < -120 || p[0] > view.width + 120 || p[1] < -80 || p[1] > view.height + 80) continue
    const y = p[1] - 14
    ctx.save()
    ctx.globalAlpha = 0.9
    ctx.fillStyle = rgba(d.color, 0.9)
    ctx.fillRect(p[0] - 1, y - 4, 2, 2)
    ctx.fillRect(p[0] - 3, y - 2, 6, 1)
    drawPixelText(ctx, d.name, p[0], y, scale, rgba(d.color, 0.9), 'center', 'rgba(0,0,0,0.8)')
    drawPixelText(ctx, d.code, p[0], y + 8 * scale, Math.max(1, scale - 1), rgba(d.accent, 0.65), 'center', 'rgba(0,0,0,0.8)')
    ctx.restore()
  }
}
