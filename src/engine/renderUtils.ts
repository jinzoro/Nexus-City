import type { Building, CityData, CityEvent, OverlayMode } from '../types'
import { TILE_H, TILE_W } from '../data/city'

export type Pt = [number, number]

export interface Camera {
  x: number
  y: number
  zoom: number
}

export interface View {
  width: number
  height: number
  camera: Camera
  time: number
  event: CityEvent | null
  overlay: OverlayMode
  city: CityData
  photoMode?: boolean
  scanMode?: boolean
}

export function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function rgba(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${alpha})`
}

export function shade(hex: string, factor: number) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  const r = clamp(Math.round(((n >> 16) & 255) * factor), 0, 255)
  const g = clamp(Math.round(((n >> 8) & 255) * factor), 0, 255)
  const b = clamp(Math.round((n & 255) * factor), 0, 255)
  return `rgb(${r},${g},${b})`
}

export function hash(n: number) {
  let x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  x -= Math.floor(x)
  return x
}

export function hash2(x: number, y: number) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263)
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export function pRaw(view: View, x: number, y: number, z = 0): Pt {
  const sx = (x - y) * (TILE_W / 2)
  const sy = (x + y) * (TILE_H / 2) - z
  return [
    (sx - view.camera.x) * view.camera.zoom + view.width / 2,
    (sy - view.camera.y) * view.camera.zoom + view.height / 2,
  ]
}

export function project(view: View, x: number, y: number, z = 0): Pt {
  const p = pRaw(view, x, y, z)
  return [Math.round(p[0]), Math.round(p[1])]
}

export function polygon(ctx: CanvasRenderingContext2D, points: Pt[], fill?: string, stroke?: string, lineWidth = 1) {
  if (points.length < 3) return
  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1])
  ctx.closePath()
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = lineWidth
    ctx.stroke()
  }
}

export function line(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, color: string, width = 1) {
  ctx.beginPath()
  ctx.moveTo(a[0], a[1])
  ctx.lineTo(b[0], b[1])
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.stroke()
}

export function getBuildingBounds(view: View, b: Building) {
  const corners = [
    project(view, b.x, b.y, 0),
    project(view, b.x + b.w, b.y, 0),
    project(view, b.x + b.w, b.y + b.d, 0),
    project(view, b.x, b.y + b.d, 0),
    project(view, b.x, b.y, b.h),
    project(view, b.x + b.w, b.y, b.h),
    project(view, b.x + b.w, b.y + b.d, b.h),
    project(view, b.x, b.y + b.d, b.h),
  ]
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of corners) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY }
}

export function isBoundsVisible(view: View, bounds: { minX: number; minY: number; maxX: number; maxY: number }, margin = 24) {
  return !(bounds.maxX < -margin || bounds.minX > view.width + margin || bounds.maxY < -margin || bounds.minY > view.height + margin)
}

export function isBuildingVisible(view: View, b: Building, margin = 20) {
  return isBoundsVisible(view, getBuildingBounds(view, b), margin)
}

export function isPointInBounds(px: number, py: number, bounds: { minX: number; minY: number; maxX: number; maxY: number }) {
  return px >= bounds.minX && px <= bounds.maxX && py >= bounds.minY && py <= bounds.maxY
}

export function isPowerOut(view: View, b: Building) {
  return view.event?.type === 'power' && view.event.district === b.district
}

export function districtDim(view: View, district: string) {
  if (view.event?.type === 'power' && view.event.district === district) return 0.38
  return 1
}

export function drawIsoRect(ctx: CanvasRenderingContext2D, view: View, x: number, y: number, w: number, d: number, z: number, fill: string, stroke?: string) {
  polygon(
    ctx,
    [project(view, x, y, z), project(view, x + w, y, z), project(view, x + w, y + d, z), project(view, x, y + d, z)],
    fill,
    stroke,
  )
}

export function drawDiamond(ctx: CanvasRenderingContext2D, view: View, x: number, y: number, w: number, d: number, fill: string, stroke?: string) {
  drawIsoRect(ctx, view, x, y, w, d, 0, fill, stroke)
}
