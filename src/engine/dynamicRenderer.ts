import type { Aircraft, Building, CityData, Drone, Emitter, Train, Vehicle } from '../types'
import { TILE_H, TILE_W, getDistrict } from '../data/city'
import { drawPixelText, measurePixelText } from './pixelFont'
import { pedFacing, pedMeta, pedSprite, type PedScale } from './spriteFactory'
import {
  type Pt,
  type View,
  clamp,
  getBuildingBounds,
  hash2,
  line,
  pRaw,
  polygon,
  project,
  rgba,
  shade,
} from './renderUtils'

const buildingMaps = new WeakMap<CityData, Map<string, Building>>()

function getBuildingMap(city: CityData) {
  let map = buildingMaps.get(city)
  if (!map) {
    map = new Map(city.buildings.map((b) => [b.id, b]))
    buildingMaps.set(city, map)
  }
  return map
}

function visiblePoint(view: View, p: Pt, margin = 40) {
  return p[0] > -margin && p[0] < view.width + margin && p[1] > -margin && p[1] < view.height + margin
}

export function drawVehicles(ctx: CanvasRenderingContext2D, view: View) {
  const zoom = view.camera.zoom
  if (zoom < 0.18) return
  for (const v of view.city.vehicles) {
    const x = v.axis === 'x' ? v.pos : v.lane
    const y = v.axis === 'x' ? v.lane : v.pos
    const p = project(view, x, y, 1)
    if (!visiblePoint(view, p, 20)) continue
    const dirX = v.axis === 'x' ? v.dir : 0
    const dirY = v.axis === 'y' ? v.dir : 0
    if (zoom < 0.3) {
      ctx.fillStyle = v.dir > 0 ? rgba(v.color, 0.9) : 'rgba(255,79,109,0.8)'
      ctx.fillRect(p[0], p[1], 1, 1)
      continue
    }

    const sizeFactor = v.type === 'bus' ? 1.9 : v.type === 'truck' ? 1.7 : v.type === 'van' ? 1.28 : v.type === 'bike' ? 0.66 : 1
    const len = 4.4 * sizeFactor * zoom
    const wid = 1.05 * sizeFactor * zoom
    const dx = (dirX - dirY) * (TILE_W / 2)
    const dy = (dirX + dirY) * (TILE_H / 2)
    const mag = Math.hypot(dx, dy) || 1
    const ux = (dx / mag) * len
    const uy = (dy / mag) * len
    const hx = (-dy / mag) * wid
    const hy = (dx / mag) * wid

    // Local vehicle space: t along the chassis (0 rear → 1 front), c across.
    const P = (t: number, c: number, z: number): Pt => [
      p[0] + ux * (t - 0.5) + hx * c,
      p[1] + uy * (t - 0.5) + hy * c - z * zoom,
    ]
    const poly = (pts: Pt[], fill: string, stroke?: string) => polygon(ctx, pts, fill, stroke)

    const bodyH = v.type === 'bike' ? 0.7 : v.type === 'bus' ? 2.4 : v.type === 'truck' ? 1.9 : v.type === 'van' ? 1.7 : 1.15
    const roofH = v.type === 'bus' ? 0.35 : v.type === 'truck' ? 0.1 : 0.55
    const dark = shade(v.color, 0.52)
    const mid = shade(v.color, 0.78)
    const light = shade(v.color, 1.32)

    ctx.save()
    ctx.globalAlpha = 0.97

    // ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    poly([P(-0.02, -1.05, 0), P(1.02, -1.05, 0), P(1.02, 1.05, 0), P(-0.02, 1.05, 0)], 'rgba(0,0,0,0.4)')

    if (v.type === 'bike') {
      // two wheels + a leaning rider
      const wheel = Math.max(1, Math.round(zoom * 1.3))
      ctx.fillStyle = '#0b0d12'
      ctx.fillRect(Math.round(P(0.12, 0, 0.3)[0]) - 1, Math.round(P(0.12, 0, 0.3)[1]), wheel, wheel)
      ctx.fillRect(Math.round(P(0.88, 0, 0.3)[0]) - 1, Math.round(P(0.88, 0, 0.3)[1]), wheel, wheel)
      poly([P(0.1, -0.35, 0.45), P(0.9, -0.35, 0.45), P(0.9, 0.35, 0.45), P(0.1, 0.35, 0.45)], v.color, dark)
      // rider torso + helmet
      ctx.fillStyle = dark
      ctx.fillRect(Math.round(P(0.5, 0, 0.8)[0]) - 1, Math.round(P(0.5, 0, 0.8)[1]), Math.max(2, Math.round(zoom * 1.4)), Math.max(2, Math.round(zoom * 2)))
      ctx.fillStyle = light
      ctx.fillRect(Math.round(P(0.58, 0, 2.05)[0]) - 1, Math.round(P(0.58, 0, 2.05)[1]), Math.max(1, Math.round(zoom)), Math.max(1, Math.round(zoom)))
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = 'rgba(255,240,190,0.95)'
      ctx.fillRect(Math.round(P(0.96, 0, 0.8)[0]) - 1, Math.round(P(0.96, 0, 0.8)[1]), 1, 1)
      ctx.restore()
      ctx.restore()
      continue
    }

    // wheels — visible under the chassis at all four corners
    const wheelW = Math.max(1, Math.round(zoom * (v.type === 'bus' || v.type === 'truck' ? 1.8 : 1.4)))
    const wheelH = Math.max(1, Math.round(zoom * 1.1))
    ctx.fillStyle = '#080a0f'
    for (const t of [0.2, 0.8]) {
      for (const c of [-1.02, 1.02]) {
        const w = P(t, c, 0.35)
        ctx.fillRect(Math.round(w[0] - wheelW / 2), Math.round(w[1]), wheelW, wheelH)
      }
    }

    // chassis side faces (base → roofline)
    const sideA = [P(0, -1, 0), P(1, -1, 0), P(1, -1, bodyH), P(0, -1, bodyH)]
    const sideB = [P(0, 1, 0), P(1, 1, 0), P(1, 1, bodyH), P(0, 1, bodyH)]
    const front = [P(1, -1, 0), P(1, 1, 0), P(1, 1, bodyH), P(1, -1, bodyH)]
    poly(sideA, mid, 'rgba(0,0,0,0.55)')
    poly(sideB, dark, 'rgba(0,0,0,0.55)')
    poly(front, shade(v.color, 0.7), 'rgba(0,0,0,0.6)')

    // top deck
    if (v.type === 'truck') {
      // cargo box behind the cab
      poly([P(0, -1, bodyH), P(0.63, -1, bodyH), P(0.63, 1, bodyH), P(0, 1, bodyH)], shade(v.color, 0.95), 'rgba(0,0,0,0.55)')
      poly([P(0, -1, bodyH + 1.5), P(0.63, -1, bodyH + 1.5), P(0.63, 1, bodyH + 1.5), P(0, 1, bodyH + 1.5)], shade(v.color, 1.15), 'rgba(0,0,0,0.5)')
      poly([P(0, -1, bodyH + 1.5), P(0, 1, bodyH + 1.5), P(0, 1, bodyH), P(0, -1, bodyH)], light)
      ctx.fillStyle = 'rgba(120,130,150,0.35)'
      const rib = Math.max(1, Math.round(zoom))
      for (let i = 1; i < 4; i++) {
        const q = P((i / 4) * 0.63, 0, bodyH + 1.5)
        ctx.fillRect(Math.round(q[0]), Math.round(q[1]), rib, Math.max(1, Math.round(zoom)))
      }
      // cab
      poly([P(0.66, -0.92, bodyH), P(1, -0.92, bodyH), P(1, 0.92, bodyH), P(0.66, 0.92, bodyH)], v.color, 'rgba(0,0,0,0.5)')
      poly([P(0.7, -0.82, bodyH + 0.9), P(0.97, -0.82, bodyH + 0.9), P(0.97, 0.82, bodyH + 0.9), P(0.7, 0.82, bodyH + 0.9)], light)
      poly([P(0.7, -0.82, bodyH + 0.9), P(0.7, 0.82, bodyH + 0.9), P(0.7, 0.82, bodyH), P(0.7, -0.82, bodyH)], 'rgba(145,225,255,0.6)')
    } else {
      // roof with an inset cabin
      poly([P(0.04, -0.86, bodyH), P(0.96, -0.86, bodyH), P(0.96, 0.86, bodyH), P(0.04, 0.86, bodyH)], v.color, 'rgba(0,0,0,0.5)')
      const cabinStart = v.type === 'bus' ? 0.02 : 0.22
      const cabinEnd = v.type === 'bus' ? 0.98 : 0.82
      poly(
        [P(cabinStart, -0.78, bodyH), P(cabinEnd, -0.78, bodyH), P(cabinEnd, 0.78, bodyH), P(cabinStart, 0.78, bodyH)],
        shade(v.color, 1.06),
        'rgba(0,0,0,0.45)',
      )
      poly(
        [P(cabinStart, -0.78, bodyH + roofH), P(cabinEnd, -0.78, bodyH + roofH), P(cabinEnd, 0.78, bodyH + roofH), P(cabinStart, 0.78, bodyH + roofH)],
        shade(v.color, 1.22),
        'rgba(0,0,0,0.35)',
      )
      // windshield (front face of the cabin)
      poly(
        [P(cabinEnd, -0.74, bodyH), P(cabinEnd, 0.74, bodyH), P(cabinEnd, 0.74, bodyH + roofH), P(cabinEnd, -0.74, bodyH + roofH)],
        'rgba(120,215,255,0.55)',
        'rgba(0,0,0,0.4)',
      )
      // side glass
      if (zoom > 0.7) {
        ctx.fillStyle = 'rgba(110,205,245,0.38)'
        for (let i = 0; i < (v.type === 'bus' ? 5 : 2); i++) {
          const t0 = cabinStart + ((cabinEnd - cabinStart) * (i + 0.16)) / (v.type === 'bus' ? 5 : 2)
          const a = P(t0, -0.79, bodyH + roofH * 0.32)
          const b = P(t0 + 0.09, -0.79, bodyH + roofH * 0.32)
          ctx.fillRect(Math.round(a[0]), Math.round(a[1]), Math.max(1, Math.round(Math.abs(b[0] - a[0]))), Math.max(1, Math.round(roofH * zoom * 0.6)))
        }
      }
      if (v.type === 'taxi') {
        // roof sign
        const roof = P(0.5, 0, bodyH + roofH)
        const s = Math.max(1, Math.round(zoom * 1.6))
        ctx.fillStyle = '#ffe066'
        ctx.fillRect(Math.round(roof[0] - s), Math.round(roof[1] - s), s * 2, s)
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = 'rgba(255,224,102,0.5)'
        ctx.fillRect(Math.round(roof[0] - s * 2), Math.round(roof[1] - s * 2), s * 4, s * 3)
        ctx.restore()
      }
      if (v.type === 'bus') {
        // roof strip / number board
        ctx.fillStyle = 'rgba(255,230,150,0.8)'
        const sign = P(0.5, 0, bodyH + roofH)
        ctx.fillRect(Math.round(sign[0]) - 2, Math.round(sign[1]) - 1, 4, 1)
      }
    }

    // lamps
    if (zoom > 0.55) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = 'rgba(200,250,255,0.95)'
      ctx.fillRect(Math.round(P(0.995, -0.7, 0.55)[0]), Math.round(P(0.995, -0.7, 0.55)[1]), 1, 1)
      ctx.fillRect(Math.round(P(0.995, 0.7, 0.55)[0]), Math.round(P(0.995, 0.7, 0.55)[1]), 1, 1)
      ctx.fillStyle = 'rgba(255,70,100,0.9)'
      ctx.fillRect(Math.round(P(0.005, -0.7, 0.55)[0]), Math.round(P(0.005, -0.7, 0.55)[1]), 1, 1)
      ctx.fillRect(Math.round(P(0.005, 0.7, 0.55)[0]), Math.round(P(0.005, 0.7, 0.55)[1]), 1, 1)
      if (zoom > 1.0) {
        // underglow
        ctx.fillStyle = rgba(v.color, 0.22)
        poly([P(0, -0.9, 0.05), P(1, -0.9, 0.05), P(1, 0.9, 0.05), P(0, 0.9, 0.05)], rgba(v.color, 0.18))
      }
      ctx.restore()
    }

    // headlight cone at close zoom
    if (zoom > 1.1) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const frontP = P(1.02, 0, 0.6)
      const tip = P(1.9, 0, 0.4)
      const sideL = P(1.4, -1.4, 0.1)
      const sideR = P(1.4, 1.4, 0.1)
      const cone = ctx.createLinearGradient(frontP[0], frontP[1], tip[0], tip[1])
      cone.addColorStop(0, rgba(v.color, 0.14))
      cone.addColorStop(1, rgba(v.color, 0))
      ctx.fillStyle = cone
      ctx.beginPath()
      ctx.moveTo(frontP[0], frontP[1])
      ctx.lineTo(sideL[0], sideL[1])
      ctx.lineTo(tip[0], tip[1])
      ctx.lineTo(sideR[0], sideR[1])
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    ctx.restore()
  }
}

export function drawPedestrians(ctx: CanvasRenderingContext2D, view: View) {
  const zoom = view.camera.zoom
  if (zoom < 0.4) return
  const time = view.time
  const scale: PedScale = zoom > 1.15 ? 2 : 1
  const raining = view.event?.type === 'rain'
  for (const n of view.city.pedestrians) {
    const p = project(view, n.x, n.y, 0.5)
    if (!visiblePoint(view, p, 14)) continue
    const { variant, seed } = pedMeta(n)
    const frame = Math.floor(time * (4.4 + n.speed * 2.6) + n.phase * 1.7) % 4
    const sprite = pedSprite(variant, frame, scale, seed, n.color)
    const w = sprite.width
    const h = sprite.height
    const facing = pedFacing(n)
    const x = Math.round(p[0]) - (w >> 1)
    const y = Math.round(p[1]) + 1 - h
    ctx.save()
    ctx.globalAlpha = 0.94
    // grounding shadow
    ctx.fillStyle = 'rgba(0,0,0,0.42)'
    ctx.fillRect(x + (w > 6 ? 1 : 0), Math.round(p[1]) + 1, w - (w > 6 ? 2 : 0), 1)
    if (facing === 'left') {
      ctx.scale(-1, 1)
      ctx.drawImage(sprite, -x - w, y)
    } else {
      ctx.drawImage(sprite, x, y)
    }
    if (raining && zoom > 0.95 && seed > 0.42) {
      // little umbrella canopy, in the NPC's own jacket accent
      const cx = Math.round(p[0])
      const uy = y - 2
      ctx.fillStyle = rgba(n.color, 0.9)
      ctx.fillRect(cx - 3, uy, 7, 1)
      ctx.fillRect(cx - 2, uy - 1, 5, 1)
      ctx.fillStyle = 'rgba(8,10,18,0.75)'
      ctx.fillRect(cx - 2, uy + 1, 5, 1)
      ctx.fillStyle = 'rgba(200,215,235,0.65)'
      ctx.fillRect(cx, uy + 2, 1, 2)
    }
    ctx.restore()
  }
}

export function drawTrains(ctx: CanvasRenderingContext2D, view: View) {
  const railMap = new Map(view.city.rails.map((r) => [r.id, r]))
  const zoom = view.camera.zoom
  for (const train of view.city.trains) {
    const rail = railMap.get(train.lineId)
    if (!rail) continue
    const isX = rail.axis === 'x'
    const carLen = rail.kind === 'highway' ? 5 : 6.2
    const gap = rail.kind === 'highway' ? 3.2 : 2.2
    for (let c = 0; c < train.cars; c++) {
      const offset = c * (carLen + gap) * train.dir
      const pos = train.pos - offset
      if (pos < rail.from - 20 || pos > rail.to + 20) continue
      const x = isX ? pos : rail.coord
      const y = isX ? rail.coord : pos
      const p = project(view, x, y, rail.z + 2)
      if (!visiblePoint(view, p, 30)) continue
      const dir = train.dir
      const dx = isX ? dir : 0
      const dy = isX ? 0 : dir
      const sx = (dx - dy) * (TILE_W / 2)
      const sy = (dx + dy) * (TILE_H / 2)
      const mag = Math.hypot(sx, sy) || 1
      const ux = (sx / mag) * carLen * zoom * 0.75
      const uy = (sy / mag) * carLen * zoom * 0.75
      const px = (-uy / mag) * 1.7 * zoom
      const py = (ux / mag) * 1.7 * zoom
      ctx.save()
      ctx.globalAlpha = 0.95
      if (rail.kind === 'highway') {
        ctx.fillStyle = c === 0 ? '#ff4fa3' : c === 1 ? '#ffb347' : '#8ff8ff'
        ctx.fillRect(p[0], p[1], 2, 1)
        ctx.fillStyle = 'rgba(255,240,190,0.9)'
        ctx.fillRect(p[0] + ux * 0.5, p[1] + uy * 0.5, 1, 1)
        ctx.restore()
        continue
      }
      polygon(
        ctx,
        [
          [p[0] - ux * 0.5 + px, p[1] - uy * 0.5 + py],
          [p[0] + ux * 0.5 + px, p[1] + uy * 0.5 + py],
          [p[0] + ux * 0.5 - px, p[1] + uy * 0.5 - py],
          [p[0] - ux * 0.5 - px, p[1] - uy * 0.5 - py],
        ],
        c === 0 ? '#e8fbff' : '#b8e9f5',
        rgba(rail.color, 0.8),
      )
      ctx.fillStyle = 'rgba(20,38,58,0.9)'
      ctx.fillRect(Math.round(p[0] - ux * 0.2), Math.round(p[1] - 1), Math.max(1, Math.round(ux * 0.45)), 1)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = rgba(rail.color, 0.75)
      ctx.fillRect(Math.round(p[0] - ux * 0.5), Math.round(p[1] + 2), Math.max(2, Math.round(ux)), 1)
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.fillRect(Math.round(p[0] + ux * 0.45), Math.round(p[1] - 1), 1, 1)
      ctx.restore()
      ctx.restore()
    }
  }
}

export function drawAircraft(ctx: CanvasRenderingContext2D, view: View) {
  const zoom = view.camera.zoom
  const time = view.time
  for (const a of view.city.aircraft) {
    const p = project(view, a.x, a.y, a.z)
    if (!visiblePoint(view, p, 30)) continue
    const blink = Math.sin(time * 4 + a.phase) > 0.2
    if (zoom < 0.3) {
      ctx.fillStyle = blink ? rgba(a.color, 0.9) : 'rgba(255,255,255,0.4)'
      ctx.fillRect(p[0], p[1], 1, 1)
      continue
    }
    ctx.save()
    ctx.globalAlpha = 0.95
    if (a.type === 'drone') {
      ctx.fillStyle = a.color
      ctx.fillRect(p[0], p[1], 1, 1)
      if (blink) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = rgba(a.color, 0.5)
        ctx.fillRect(p[0] - 1, p[1] - 1, 3, 3)
        ctx.restore()
      }
    } else if (a.type === 'cargo') {
      ctx.fillStyle = '#1c2537'
      ctx.fillRect(p[0] - 3, p[1] - 1, 6, 3)
      ctx.fillStyle = a.color
      ctx.fillRect(p[0] - 4, p[1], 2, 1)
      ctx.fillStyle = 'rgba(255,220,140,0.8)'
      ctx.fillRect(p[0] + 3, p[1], 1, 1)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = rgba(a.color, 0.16)
      ctx.fillRect(p[0] - 9, p[1] + 1, 6, 1)
      ctx.restore()
    } else {
      // small isometric flyer
      const dir = Math.atan2(a.vy, a.vx)
      const wing = Math.sin(dir) * 2
      polygon(
        ctx,
        [
          [p[0] - 3, p[1] + wing],
          [p[0], p[1] - 2],
          [p[0] + 3, p[1] + wing],
          [p[0], p[1] + 1],
        ],
        a.type === 'police' ? '#2d3550' : '#243247',
        rgba(a.color, 0.8),
      )
      ctx.fillStyle = blink ? 'rgba(180,245,255,0.95)' : rgba(a.color, 0.6)
      ctx.fillRect(p[0], p[1] - 1, 1, 1)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const trail = ctx.createLinearGradient(p[0], p[1], p[0] - a.vx * 2.5, p[1] - a.vy * 2.5)
      trail.addColorStop(0, rgba(a.color, 0.45))
      trail.addColorStop(1, rgba(a.color, 0))
      ctx.strokeStyle = trail
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(p[0], p[1])
      ctx.lineTo(p[0] - a.vx * 2.5, p[1] - a.vy * 2.5)
      ctx.stroke()
      ctx.restore()
    }
    if (a.type === 'police' && zoom > 0.7) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = blink ? 'rgba(255,60,90,0.55)' : 'rgba(60,160,255,0.55)'
      ctx.fillRect(p[0] - 2, p[1] - 2, 1, 1)
      ctx.fillRect(p[0] + 1, p[1] - 2, 1, 1)
      ctx.restore()
    }
    ctx.restore()
  }
}

export function drawDrones(ctx: CanvasRenderingContext2D, view: View) {
  const zoom = view.camera.zoom
  const time = view.time
  for (const d of view.city.drones) {
    const p = project(view, d.x, d.y, d.z)
    if (!visiblePoint(view, p, 20)) continue
    const blink = Math.sin(time * 5 + d.phase) > 0.4
    if (zoom < 0.35) {
      if (blink) {
        ctx.fillStyle = rgba(d.color, 0.6)
        ctx.fillRect(p[0], p[1], 1, 1)
      }
      continue
    }
    ctx.fillStyle = '#1c2330'
    ctx.fillRect(p[0] - 1, p[1], 3, 1)
    if (blink) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = rgba(d.color, 0.8)
      ctx.fillRect(p[0], p[1], 1, 1)
      ctx.fillRect(p[0] - 2, p[1], 1, 1)
      ctx.fillRect(p[0] + 2, p[1], 1, 1)
      ctx.restore()
    }
    if (zoom > 1.1) {
      ctx.fillStyle = 'rgba(120,140,180,0.4)'
      ctx.fillRect(p[0] - 2, p[1] - 1, 1, 1)
      ctx.fillRect(p[0] + 2, p[1] - 1, 1, 1)
    }
  }
}

export function drawEmitters(ctx: CanvasRenderingContext2D, view: View) {
  const zoom = view.camera.zoom
  if (zoom < 0.35) return
  const time = view.time
  for (const e of view.city.emitters) {
    const base = project(view, e.x, e.y, e.z)
    if (!visiblePoint(view, base, 60)) continue
    if (e.kind === 'steam' || e.kind === 'smoke') {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 5; i++) {
        const t = ((time * 0.35 + e.phase * 0.12 + i * 0.23) % 1 + 1) % 1
        const px = base[0] + Math.sin(t * 6 + e.phase) * 4 * zoom
        const py = base[1] - t * 22 * zoom
        const size = Math.max(1, Math.round((1 + t * 4) * zoom))
        ctx.fillStyle = e.kind === 'smoke' ? rgba(e.color, (1 - t) * 0.12) : rgba('#c9d9e8', (1 - t) * 0.15)
        ctx.fillRect(Math.round(px), Math.round(py), size, size)
      }
      ctx.restore()
    } else if (e.kind === 'water') {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 5; i++) {
        const t = ((time * 0.9 + e.phase + i * 0.2) % 1 + 1) % 1
        const angle = -Math.PI / 2 + Math.sin(e.phase + i) * 0.6
        const px = base[0] + Math.cos(angle) * t * 8 * zoom
        const py = base[1] + Math.sin(angle) * t * 12 * zoom + t * t * 8 * zoom
        ctx.fillStyle = rgba(e.color, (1 - t) * 0.65)
        ctx.fillRect(Math.round(px), Math.round(py), 1, Math.max(1, Math.round(2 * zoom)))
      }
      ctx.restore()
    } else if (e.kind === 'spark') {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 4; i++) {
        const t = ((time * 1.7 + e.phase + i * 0.3) % 1 + 1) % 1
        const px = base[0] + Math.sin(e.phase * 4 + i) * t * 10
        const py = base[1] - t * 9 + t * t * 12
        ctx.fillStyle = rgba(e.color, (1 - t) * 0.9)
        ctx.fillRect(Math.round(px), Math.round(py), 1, 1)
      }
      ctx.restore()
    } else if (e.kind === 'firefly') {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 8; i++) {
        const t = time * 0.3 + e.phase + i
        const px = base[0] + Math.sin(t * 1.7 + i) * 12 * zoom
        const py = base[1] + Math.cos(t * 1.1 + i * 2) * 7 * zoom - 4 * zoom
        const blink = 0.35 + Math.sin(t * 3) * 0.3
        ctx.fillStyle = rgba(e.color, blink)
        ctx.fillRect(Math.round(px), Math.round(py), 1, 1)
      }
      ctx.restore()
    }
  }
}

export function drawBillboards(ctx: CanvasRenderingContext2D, view: View) {
  const zoom = view.camera.zoom
  if (zoom < 0.23) return
  const map = getBuildingMap(view.city)
  const time = view.time
  let index = 0
  for (const bb of view.city.billboards) {
    const b = map.get(bb.buildingId)
    if (!b) continue
    const p = project(view, bb.x, bb.y, bb.z)
    if (!visiblePoint(view, p, 40)) continue
    index++
    const w = bb.width * zoom * 1.7
    const h = bb.height * zoom * 1.15
    if (w < 4 || h < 3) {
      ctx.fillStyle = rgba(index % 2 ? bb.colorA : bb.colorB, 0.7)
      ctx.fillRect(p[0], p[1], 1, 1)
      continue
    }
    const glitch = Math.sin(time * 2.1 + index * 4.7) > 0.94 ? Math.round(Math.sin(time * 45) * 2) : 0
    const x = Math.round(p[0] - w / 2 + glitch)
    const y = Math.round(p[1] - h)
    const cycle = Math.floor(time * 0.45 + index * 0.37) % 3
    const ca = cycle === 1 ? bb.colorB : bb.colorA
    const cb = cycle === 2 ? '#ffb347' : bb.colorB
    if (bb.kind === 'vertical') {
      const vh = Math.min(46 * zoom, 42)
      const vw = Math.max(5, 8 * zoom)
      ctx.fillStyle = 'rgba(7,9,18,0.9)'
      ctx.fillRect(x + w / 2 - vw / 2, y - vh, vw, vh)
      ctx.strokeStyle = rgba(ca, 0.7)
      ctx.strokeRect(x + w / 2 - vw / 2, y - vh, vw, vh)
      ctx.fillStyle = rgba(ca, 0.25)
      ctx.fillRect(x + w / 2 - vw / 2 + 1, y - vh + 1, vw - 2, 1)
      const chars = bb.text.slice(0, Math.max(1, Math.floor(vh / 8)))
      for (let i = 0; i < chars.length; i++) {
        drawPixelText(ctx, chars[i], x + w / 2, y - vh + 3 + i * 8, 1, rgba(i % 2 ? cb : ca, 0.9), 'center', 'rgba(0,0,0,0.8)')
      }
    } else {
      // support pole
      ctx.fillStyle = 'rgba(20,24,38,0.9)'
      ctx.fillRect(Math.round(p[0] - 1), Math.round(p[1]), 2, Math.max(2, 6 * zoom))
      ctx.fillStyle = 'rgba(8,10,20,0.95)'
      ctx.fillRect(x - 1, y - 1, w + 2, h + 2)
      ctx.strokeStyle = rgba(ca, 0.75)
      ctx.strokeRect(x - 1, y - 1, w + 2, h + 2)
      ctx.fillStyle = rgba(ca, 0.12)
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = rgba(cb, 0.18)
      ctx.fillRect(x, y + h * 0.55, w, h * 0.45)
      // scanline
      const scan = Math.floor((time * 20 + index * 3) % h)
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.fillRect(x, y + scan, w, 1)
      const text = bb.text.length > 6 ? bb.text.slice(0, 6) : bb.text
      const scale = measurePixelText(text, 1) <= w - 2 ? 1 : 0
      if (scale === 1) {
        drawPixelText(ctx, text, x + w / 2, y + Math.max(1, (h - 7) / 2), 1, rgba(cb, 0.95), 'center', 'rgba(0,0,0,0.7)')
      } else {
        for (let i = 0; i < Math.max(2, Math.floor(w / 3)); i++) {
          ctx.fillStyle = rgba(i % 2 ? ca : cb, 0.75)
          ctx.fillRect(x + 1 + i * 3, y + Math.floor(h / 2), 2, 1)
        }
      }
      // corner pixels
      ctx.fillStyle = rgba(cb, 0.85)
      ctx.fillRect(x, y, 1, 1)
      ctx.fillRect(x + w - 1, y, 1, 1)
    }
  }
}

export function drawHolograms(ctx: CanvasRenderingContext2D, view: View) {
  const zoom = view.camera.zoom
  if (zoom < 0.22) return
  const time = view.time
  for (const holo of view.city.holograms) {
    const p = project(view, holo.x, holo.y, holo.z)
    if (!visiblePoint(view, p, 80)) continue
    const r = Math.max(3, holo.radius * zoom * 1.7)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.75
    const pulse = 0.7 + Math.sin(time * 1.8 + holo.z) * 0.15
    ctx.strokeStyle = rgba(holo.color, pulse)
    ctx.lineWidth = 1
    if (holo.kind === 'globe') {
      ctx.beginPath()
      ctx.arc(p[0], p[1], r, 0, Math.PI * 2)
      ctx.stroke()
      const rot = time * 0.6
      for (let i = 0; i < 3; i++) {
        const rr = r * (0.38 + i * 0.3)
        ctx.strokeStyle = rgba(i === 1 ? holo.accent : holo.color, 0.35)
        ctx.beginPath()
        ctx.ellipse(p[0], p[1], Math.abs(Math.cos(rot + i) * rr) + 1, rr, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = rgba(holo.color, 0.28)
        ctx.beginPath()
        ctx.ellipse(p[0], p[1], r, rr(i, r), 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.fillStyle = rgba(holo.color, 0.18)
      ctx.beginPath()
      ctx.arc(p[0], p[1], r * 0.25, 0, Math.PI * 2)
      ctx.fill()
    } else if (holo.kind === 'ring') {
      const rot = time * 0.9
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = rgba(i === 1 ? holo.accent : holo.color, 0.5 - i * 0.1)
        ctx.beginPath()
        ctx.ellipse(p[0], p[1] - i * 2, r * (1 - i * 0.18), r * 0.35, rot + i * 0.4, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.fillStyle = rgba(holo.color, 0.12)
      ctx.beginPath()
      ctx.arc(p[0], p[1], r * 0.18, 0, Math.PI * 2)
      ctx.fill()
    } else if (holo.kind === 'crown') {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + time * 0.2
        ctx.fillStyle = rgba(i % 2 ? holo.accent : holo.color, 0.55)
        ctx.fillRect(Math.round(p[0] + Math.cos(a) * r), Math.round(p[1] + Math.sin(a) * r * 0.35), 2, 2)
      }
      ctx.strokeStyle = rgba(holo.color, 0.3)
      ctx.beginPath()
      ctx.ellipse(p[0], p[1], r, r * 0.32, 0, 0, Math.PI * 2)
      ctx.stroke()
    } else if (holo.kind === 'fish') {
      const dir = Math.sin(time * 0.4) > 0 ? 1 : -1
      const cx = p[0] + Math.sin(time * 0.7) * r * 0.35
      ctx.strokeStyle = rgba(holo.color, 0.65)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(cx, p[1], r * 0.6, r * 0.26, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(cx - r * 0.55 * dir, p[1])
      ctx.lineTo(cx - r * 0.95 * dir, p[1] - r * 0.2)
      ctx.lineTo(cx - r * 0.95 * dir, p[1] + r * 0.2)
      ctx.closePath()
      ctx.stroke()
      ctx.fillStyle = rgba(holo.accent, 0.7)
      ctx.fillRect(Math.round(cx + r * 0.25 * dir), Math.round(p[1] - 1), 1, 1)
    } else {
      ctx.fillStyle = rgba(holo.color, 0.1)
      ctx.beginPath()
      ctx.arc(p[0], p[1], r * 0.7, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = rgba(holo.color, 0.55)
      ctx.beginPath()
      ctx.arc(p[0], p[1], r, 0, Math.PI * 2)
      ctx.stroke()
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = rgba(holo.color, 0.14)
        ctx.beginPath()
        ctx.ellipse(p[0], p[1], r * (0.3 + i * 0.2), r * (0.15 + i * 0.08), time * 0.3, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    // base beam
    const ground = project(view, holo.x, holo.y, 0)
    ctx.strokeStyle = rgba(holo.color, 0.08)
    ctx.beginPath()
    ctx.moveTo(p[0], p[1] + r)
    ctx.lineTo(ground[0], ground[1])
    ctx.stroke()
    ctx.restore()
    if (zoom > 0.52) {
      drawPixelText(ctx, holo.label, p[0], p[1] + r + 4, 1, rgba(holo.color, 0.75), 'center', 'rgba(0,0,0,0.7)')
    }
  }
}

function rr(i: number, r: number) {
  return r * (0.25 + i * 0.18)
}

export function drawWeather(ctx: CanvasRenderingContext2D, view: View) {
  const { width, height, time } = view
  const rain = view.event?.type === 'rain'
  const count = rain ? 170 : 54
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < count; i++) {
    const speed = 90 + hash2(i, 3) * 120
    const x = (hash2(i, 1) * width + Math.sin(time * 0.3 + i) * 20 + width) % width
    const y = (hash2(i, 2) * height + time * speed) % height
    const len = rain ? 5 + hash2(i, 4) * 5 : 2
    ctx.strokeStyle = i % 5 === 0 ? rgba('#ff4fa3', rain ? 0.34 : 0.12) : rgba('#8ff8ff', rain ? 0.24 : 0.1)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - len * 0.35, y + len)
    ctx.stroke()
  }
  if (view.event?.type === 'festival') {
    const district = view.event.district ? getDistrict(view.event.district) : null
    if (district) {
      const p = project(view, district.center.x, district.center.y)
      for (let i = 0; i < 60; i++) {
        const t = (time * 0.16 + hash2(i, 4)) % 1
        const px = p[0] + (hash2(i, 1) - 0.5) * 220 + Math.sin(time + i) * 10
        const py = p[1] - t * 180
        ctx.fillStyle = rgba(i % 2 ? district.accent : district.color, (1 - t) * 0.55)
        ctx.fillRect(Math.round(px), Math.round(py), 1, 1)
      }
    }
  }
  if (rain) {
    // splash rings where the drizzle hits roofs and streets
    for (let i = 0; i < 34; i++) {
      const life = ((time * 1.7 + hash2(i, 14)) % 1 + 1) % 1
      const x = (hash2(i, 15) * width + Math.sin(time * 0.4 + i) * 10 + width) % width
      const y = (hash2(i, 16) * height + Math.cos(time * 0.27 + i) * 6 + height) % height
      const r = 1 + life * 4
      ctx.strokeStyle = rgba(i % 4 === 0 ? '#ff4fa3' : '#8ff8ff', (1 - life) * 0.28)
      ctx.beginPath()
      ctx.ellipse(Math.round(x), Math.round(y), r, r * 0.42, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  // floating motes
  for (let i = 0; i < 45; i++) {
    const x = (hash2(i, 11) * width + Math.sin(time * 0.2 + i) * 12 + width) % width
    const y = (hash2(i, 12) * height + Math.cos(time * 0.15 + i) * 8 + height) % height
    ctx.fillStyle = i % 6 === 0 ? 'rgba(255,79,163,0.35)' : 'rgba(143,248,255,0.16)'
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1)
  }
  ctx.restore()
}

export function drawOverlay(ctx: CanvasRenderingContext2D, view: View) {
  if (view.overlay === 'none') return
  const zoom = view.camera.zoom
  if (view.overlay === 'transit') {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const rail of view.city.rails) {
      const isX = rail.axis === 'x'
      const a = project(view, isX ? rail.from : rail.coord, isX ? rail.coord : rail.from, rail.z + 5)
      const b = project(view, isX ? rail.to : rail.coord, isX ? rail.coord : rail.to, rail.z + 5)
      ctx.strokeStyle = rgba(rail.color, 0.45)
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(a[0], a[1])
      ctx.lineTo(b[0], b[1])
      ctx.stroke()
      const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
      if (zoom > 0.28) drawPixelText(ctx, rail.name.split(' / ')[0], mid[0], mid[1] - 8, 1, rgba(rail.color, 0.9), 'center', 'rgba(0,0,0,0.8)')
    }
    ctx.restore()
  } else if (view.overlay === 'network') {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const d of view.city.districts) {
      const p = project(view, d.center.x, d.center.y, 40)
      ctx.strokeStyle = rgba(d.color, 0.15)
      ctx.beginPath()
      ctx.arc(p[0], p[1], 10 + Math.sin(view.time + d.center.x) * 2, 0, Math.PI * 2)
      ctx.stroke()
      drawPixelText(ctx, d.code, p[0], p[1] - 16, 1, rgba(d.color, 0.7), 'center', 'rgba(0,0,0,0.7)')
    }
    for (let i = 0; i < 24; i++) {
      const a = view.city.districts[i % view.city.districts.length]
      const b = view.city.districts[(i + 3) % view.city.districts.length]
      const pa = project(view, a.center.x, a.center.y, 20)
      const pb = project(view, b.center.x, b.center.y, 20)
      ctx.strokeStyle = rgba(i % 2 ? a.color : b.color, 0.1)
      ctx.setLineDash([3, 6])
      ctx.beginPath()
      ctx.moveTo(pa[0], pa[1])
      ctx.quadraticCurveTo((pa[0] + pb[0]) / 2, Math.min(pa[1], pb[1]) - 40, pb[0], pb[1])
      ctx.stroke()
      const t = (view.time * 0.15 + i / 24) % 1
      const px = pa[0] + (pb[0] - pa[0]) * t
      const py = pa[1] + (pb[1] - pa[1]) * t - Math.sin(t * Math.PI) * 30
      ctx.fillStyle = rgba(a.color, 0.7)
      ctx.fillRect(px, py, 1, 1)
    }
    ctx.setLineDash([])
    ctx.restore()
  } else if (view.overlay === 'power') {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (let b = 0; b < view.city.blocks; b++) {
      const x = b * 11
      const y = b * 11
      const a = project(view, x, 0)
      const c = project(view, x, view.city.size)
      const d = project(view, 0, y)
      const e = project(view, view.city.size, y)
      ctx.strokeStyle = rgba('#22e6ff', 0.09)
      ctx.beginPath()
      ctx.moveTo(a[0], a[1])
      ctx.lineTo(c[0], c[1])
      ctx.moveTo(d[0], d[1])
      ctx.lineTo(e[0], e[1])
      ctx.stroke()
    }
    for (const d of view.city.districts) {
      const p = project(view, d.center.x, d.center.y)
      ctx.fillStyle = rgba(d.color, 0.7)
      ctx.fillRect(p[0], p[1], 2, 2)
      ctx.strokeStyle = rgba(d.color, 0.3)
      ctx.beginPath()
      ctx.arc(p[0], p[1], 5 + Math.sin(view.time * 2 + d.center.x) * 2, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
  } else if (view.overlay === 'atmosphere') {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const d of view.city.districts) {
      const p = project(view, d.center.x, d.center.y, 12)
      const radius = Math.max(28, d.radius * 22 * zoom)
      const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], radius)
      g.addColorStop(0, rgba(d.color, 0.11))
      g.addColorStop(0.6, rgba(d.color, 0.035))
      g.addColorStop(1, rgba(d.color, 0))
      ctx.fillStyle = g
      ctx.fillRect(p[0] - radius, p[1] - radius, radius * 2, radius * 2)
      drawPixelText(ctx, d.atmosphere.split(' / ')[0], p[0], p[1] - 12, 1, rgba(d.accent, 0.8), 'center', 'rgba(0,0,0,0.7)')
    }
    for (let i = 0; i < 90; i++) {
      const t = (view.time * (0.03 + hash2(i, 8) * 0.06) + hash2(i, 5)) % 1
      const x = hash2(i, 2) * view.width + Math.sin(view.time * 0.4 + i) * 14
      const y = (hash2(i, 3) * view.height + t * 40) % view.height
      const d = view.city.districts[i % view.city.districts.length]
      ctx.fillStyle = rgba(i % 3 === 0 ? d.accent : d.color, 0.28)
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1)
    }
    ctx.restore()
  }
}

export function drawSelection(ctx: CanvasRenderingContext2D, view: View, b: Building, selected: boolean) {
  const bounds = getBuildingBounds(view, b)
  const zoom = view.camera.zoom
  const pulse = 0.65 + Math.sin(view.time * 3.2) * 0.25
  const color = selected ? '#ff4fa3' : '#22e6ff'
  const pad = Math.max(2, 4 * zoom)
  const x0 = bounds.minX - pad
  const y0 = bounds.minY - pad
  const x1 = bounds.maxX + pad
  const y1 = bounds.maxY + pad
  const corner = clamp(8 * zoom, 4, 12)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = rgba(color, pulse)
  ctx.lineWidth = 1
  const corners = [
    [[x0, y0 + corner], [x0, y0], [x0 + corner, y0]],
    [[x1 - corner, y0], [x1, y0], [x1, y0 + corner]],
    [[x0, y1 - corner], [x0, y1], [x0 + corner, y1]],
    [[x1 - corner, y1], [x1, y1], [x1, y1 - corner]],
  ]
  for (const pts of corners) {
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    ctx.lineTo(pts[1][0], pts[1][1])
    ctx.lineTo(pts[2][0], pts[2][1])
    ctx.stroke()
  }
  const scanY = y0 + ((view.time * 22) % Math.max(1, y1 - y0))
  ctx.fillStyle = rgba(color, 0.18)
  ctx.fillRect(x0, scanY, x1 - x0, 1)
  const top = project(view, b.x + b.w / 2, b.y + b.d / 2, b.h + 5)
  ctx.fillStyle = rgba(color, 0.85)
  ctx.fillRect(top[0] - 1, top[1] - 3, 2, 2)
  ctx.fillRect(top[0] - 3, top[1] - 1, 6, 1)
  if (selected) {
    drawPixelText(ctx, b.name.slice(0, 16), top[0], top[1] - 14, 1, rgba(color, 0.95), 'center', 'rgba(0,0,0,0.85)')
  }
  ctx.restore()
}

export interface EntityMarker {
  kind: string
  x: number
  y: number
  z: number
  color: string
}

/** Reticle + tag drawn around a selected citizen, vehicle or train. */
export function drawEntitySelection(ctx: CanvasRenderingContext2D, view: View, entity: EntityMarker, label: string) {
  const zoom = view.camera.zoom
  const p = project(view, entity.x, entity.y, entity.z)
  if (!visiblePoint(view, p, 80)) return
  const ground = project(view, entity.x, entity.y, 0)
  const pulse = 0.7 + Math.sin(view.time * 4.4) * 0.22
  const color = entity.color || '#22e6ff'
  const rx = Math.max(4, 7 * zoom)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = rgba(color, pulse)
  ctx.lineWidth = 1
  // ground reticle
  ctx.beginPath()
  ctx.ellipse(ground[0], ground[1], rx, rx * 0.48, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(ground[0], ground[1], rx * 0.55, rx * 0.27, 0, 0, Math.PI * 2)
  ctx.stroke()
  // bracket
  const w = Math.max(5, 9 * zoom)
  const h = Math.max(7, 14 * zoom)
  const bx = p[0]
  const by = p[1] - h
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    ctx.beginPath()
    ctx.moveTo(bx + sx * w, by + sy * h * 0.35)
    ctx.lineTo(bx + sx * w, by + sy * h)
    ctx.lineTo(bx + sx * w * 0.45, by + sy * h)
    ctx.stroke()
  }
  const scan = (view.time * 1.4) % 1
  ctx.fillStyle = rgba(color, 0.22)
  ctx.fillRect(bx - w, by - h + scan * h * 2, w * 2, 1)
  ctx.restore()
  drawPixelText(ctx, label.slice(0, 18), p[0], p[1] - h - 10, 1, rgba(color, 0.95), 'center', 'rgba(0,0,0,0.85)')
}

/** Event consequences rendered above the cached city layers. */
export function drawEventAtmosphere(ctx: CanvasRenderingContext2D, view: View) {
  const event = view.event
  if (!event) return
  const time = view.time
  const district = event.district ? getDistrict(event.district) : null
  const center = district ? project(view, district.center.x, district.center.y, 24) : [view.width / 2, view.height / 2]
  const zoom = view.camera.zoom

  if (event.type === 'power') {
    ctx.save()
    const p = center as Pt
    const radius = Math.max(view.width, view.height) * 0.55
    const flicker = 0.34 + Math.sin(time * 7.2) * 0.06 + (Math.sin(time * 31) > 0.94 ? 0.14 : 0)
    const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], radius)
    g.addColorStop(0, `rgba(2,3,10,${flicker + 0.16})`)
    g.addColorStop(0.55, `rgba(2,3,10,${flicker * 0.6})`)
    g.addColorStop(1, 'rgba(2,3,10,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, view.width, view.height)
    // emergency beacons around the failed district
    if (district) {
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 8; i++) {
        const a = time * 0.4 + (i / 8) * Math.PI * 2
        const rr = district.radius * 9 * zoom
        const bx = p[0] + Math.cos(a) * rr
        const by = p[1] + Math.sin(a) * rr * 0.5
        const blink = Math.sin(time * 5 + i * 1.7) > 0.45
        if (blink) {
          ctx.fillStyle = 'rgba(255,79,109,0.7)'
          ctx.fillRect(Math.round(bx), Math.round(by), 2, 2)
          ctx.fillStyle = 'rgba(255,79,109,0.12)'
          ctx.fillRect(Math.round(bx) - 4, Math.round(by) - 4, 10, 10)
        }
      }
    }
    ctx.restore()
  } else if (event.type === 'festival') {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const p = center as Pt
    for (let i = 0; i < 5; i++) {
      const a = time * (0.35 + i * 0.08) + (i / 5) * Math.PI * 2
      const len = 170 + Math.sin(time + i) * 30
      const g = ctx.createLinearGradient(p[0], p[1], p[0] + Math.cos(a) * len, p[1] + Math.sin(a) * len * 0.5)
      g.addColorStop(0, rgba(i % 2 ? district?.accent ?? '#ffb347' : district?.color ?? '#ff3dd8', 0.16))
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(p[0], p[1])
      ctx.lineTo(p[0] + Math.cos(a - 0.08) * len, p[1] + Math.sin(a - 0.08) * len * 0.5)
      ctx.lineTo(p[0] + Math.cos(a + 0.08) * len, p[1] + Math.sin(a + 0.08) * len * 0.5)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  } else if (event.type === 'construction') {
    ctx.save()
    const p = center as Pt
    ctx.strokeStyle = 'rgba(255,179,71,0.5)'
    ctx.lineWidth = 1
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * 16 * zoom
      const h = (46 + i * 12) * zoom
      ctx.beginPath()
      ctx.moveTo(p[0] + off, p[1])
      ctx.lineTo(p[0] + off, p[1] - h)
      ctx.lineTo(p[0] + off + 26 * zoom, p[1] - h)
      ctx.stroke()
      ctx.fillStyle = Math.sin(time * 4 + i) > 0.4 ? 'rgba(255,79,109,0.9)' : 'rgba(255,79,109,0.2)'
      ctx.fillRect(Math.round(p[0] + off + 25 * zoom), Math.round(p[1] - h), 2, 2)
    }
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 26; i++) {
      const t = (time * 0.22 + hash2(i, 5)) % 1
      ctx.fillStyle = `rgba(255,200,120,${(1 - t) * 0.3})`
      ctx.fillRect(p[0] + (hash2(i, 3) - 0.5) * 60 * zoom, p[1] - t * 70 * zoom, 1, 1)
    }
    ctx.restore()
  } else if (event.type === 'market') {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const p = center as Pt
    const r = 90 * zoom + 30
    const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r)
    g.addColorStop(0, 'rgba(255,179,71,0.16)')
    g.addColorStop(0.55, 'rgba(255,79,163,0.07)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(p[0] - r, p[1] - r, r * 2, r * 2)
    for (let i = 0; i < 40; i++) {
      const a = hash2(i, 6) * Math.PI * 2 + time * 0.06
      const rr = (20 + hash2(i, 9) * 90) * zoom
      const bob = Math.sin(time * 2 + i) * 1.5
      ctx.fillStyle = rgba(i % 2 ? '#ffb347' : '#ff4fa3', 0.35)
      ctx.fillRect(Math.round(p[0] + Math.cos(a) * rr), Math.round(p[1] + Math.sin(a) * rr * 0.5 + bob), 1, 1)
    }
    ctx.restore()
  } else if (event.type === 'network') {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 9; i++) {
      const y = (hash2(i, 17) * view.height + time * (12 + i * 3)) % view.height
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255,79,163,0.16)' : 'rgba(34,230,255,0.12)'
      ctx.fillRect(0, Math.round(y), view.width, 1)
    }
    const p = center as Pt
    for (let i = 0; i < 16; i++) {
      const t = (time * 0.5 + i / 16) % 1
      ctx.strokeStyle = rgba('#22e6ff', (1 - t) * 0.4)
      ctx.beginPath()
      ctx.arc(p[0], p[1], t * 80 * zoom + 8, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
  } else if (event.type === 'weather') {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 5; i++) {
      const y = view.height * (0.2 + i * 0.15) + Math.sin(time * 0.2 + i) * 8
      const g = ctx.createLinearGradient(0, y - 16, 0, y + 16)
      g.addColorStop(0, 'rgba(143,248,255,0)')
      g.addColorStop(0.5, 'rgba(143,248,255,0.035)')
      g.addColorStop(1, 'rgba(143,248,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, y - 16, view.width, 32)
    }
    ctx.restore()
  }

  // volumetric shafts are strongest during festivals and weather shifts
  if (event.type === 'festival' || event.type === 'weather') {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const p = center as Pt
    for (let i = 0; i < 3; i++) {
      const x = p[0] + (i - 1) * 70 * zoom
      const g = ctx.createLinearGradient(x, 0, x + 30, view.height)
      g.addColorStop(0, rgba(event.type === 'festival' ? '#ff4fa3' : '#8ff8ff', 0.045))
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(x - 8, 0)
      ctx.lineTo(x + 8, 0)
      ctx.lineTo(x + 54, view.height)
      ctx.lineTo(x + 18, view.height)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }
}

/** Structural scan mode: silhouettes, distances and concentration rings. */
export function drawScanOverlay(ctx: CanvasRenderingContext2D, view: View) {
  const zoom = view.camera.zoom
  const time = view.time
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  // sweep across the viewport
  const sweep = ((time * 0.18) % 1) * view.width
  const g = ctx.createLinearGradient(sweep - 40, 0, sweep + 40, 0)
  g.addColorStop(0, 'rgba(34,230,255,0)')
  g.addColorStop(0.5, 'rgba(34,230,255,0.09)')
  g.addColorStop(1, 'rgba(34,230,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(sweep - 40, 0, 80, view.height)
  ctx.fillStyle = 'rgba(143,248,255,0.35)'
  ctx.fillRect(sweep, 0, 1, view.height)

  // building footprints, only the visible slice
  ctx.strokeStyle = 'rgba(34,230,255,0.13)'
  ctx.lineWidth = 1
  for (const b of view.city.buildings) {
    const p = project(view, b.x + b.w / 2, b.y + b.d / 2, 0)
    if (p[0] < -20 || p[0] > view.width + 20 || p[1] < -20 || p[1] > view.height + 20) continue
    const a = project(view, b.x, b.y)
    const c = project(view, b.x + b.w, b.y)
    const d = project(view, b.x + b.w, b.y + b.d)
    const e = project(view, b.x, b.y + b.d)
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    ctx.lineTo(c[0], c[1])
    ctx.lineTo(d[0], d[1])
    ctx.lineTo(e[0], e[1])
    ctx.closePath()
    ctx.stroke()
  }

  for (const d of view.city.districts) {
    const p = project(view, d.center.x, d.center.y)
    const r = Math.max(18, d.radius * 7 * zoom)
    ctx.strokeStyle = rgba(d.color, 0.28)
    ctx.beginPath()
    ctx.arc(p[0], p[1], r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([3, 7])
    ctx.strokeStyle = rgba(d.color, 0.14)
    ctx.beginPath()
    ctx.arc(p[0], p[1], r * 1.45, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    const blips = 2 + Math.floor((Math.sin(time * 1.7 + d.center.x) + 1) * 2)
    for (let i = 0; i < blips; i++) {
      const a = time * 0.5 + i * 2.1
      ctx.fillStyle = rgba(d.accent, 0.5)
      ctx.fillRect(Math.round(p[0] + Math.cos(a) * r * 0.6), Math.round(p[1] + Math.sin(a) * r * 0.3), 1, 1)
    }
    if (zoom > 0.22) {
      drawPixelText(ctx, `${d.code} / ${d.name.split(' ')[0]}`, p[0], p[1] - r - 8, 1, rgba(d.color, 0.75), 'center', 'rgba(0,0,0,0.7)')
    }
  }

  // corner brackets + coordinate ticker
  ctx.strokeStyle = 'rgba(143,248,255,0.4)'
  const m = 10
  const len = 14
  for (const [x, y, sx, sy] of [
    [m, m, 1, 1],
    [view.width - m, m, -1, 1],
    [m, view.height - m, 1, -1],
    [view.width - m, view.height - m, -1, -1],
  ] as const) {
    ctx.beginPath()
    ctx.moveTo(x, y + sy * len)
    ctx.lineTo(x, y)
    ctx.lineTo(x + sx * len, y)
    ctx.stroke()
  }
  drawPixelText(ctx, 'SCAN ACTIVE // STRUCTURAL PASS', view.width / 2, m + 4, 1, 'rgba(143,248,255,0.75)', 'center', 'rgba(0,0,0,0.8)')
  ctx.restore()
}

export function drawCeilingDynamic(ctx: CanvasRenderingContext2D, view: View) {
  const { width, height, camera, time } = view
  const top = Math.round(height * 0.155)
  const shift = (-camera.x * 0.11) % (width + 200)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 2; i++) {
    const cx = width * (i === 0 ? 0.18 : 0.79) + shift * 0.5
    const cy = top * 0.38
    const r = Math.min(30, top * 0.34)
    const angle = time * (i === 0 ? 0.22 : -0.17)
    for (let b = 0; b < 4; b++) {
      const a = angle + (b / 4) * Math.PI * 2
      ctx.strokeStyle = rgba('#22e6ff', 0.09)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5))
      ctx.stroke()
    }
  }
  for (let i = 0; i < 5; i++) {
    const x = ((i * 173 + shift * 2.2) % (width + 100)) - 20
    const y = top * (0.34 + hash2(i, 4) * 0.34)
    const blink = Math.sin(time * 2.4 + i * 2.2) > 0.25
    ctx.fillStyle = blink ? (i % 2 ? 'rgba(255,61,216,0.7)' : 'rgba(34,230,255,0.7)') : 'rgba(60,70,100,0.2)'
    ctx.fillRect(Math.round(x), Math.round(y), 2, 1)
  }
  ctx.restore()
}
