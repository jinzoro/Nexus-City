import type {
  Building,
  CameraInfo,
  CityData,
  CityEvent,
  DistrictId,
  EntityKind,
  OverlayMode,
  QualityLevel,
  SelectedEntity,
  ViewWeather,
} from '../types'
import { TILE_H, TILE_W, districtForCell, getDistrict } from '../data/city'
import { trainEntity, vehicleEntity, pedestrianEntity } from '../data/world'
import { drawBuilding, drawProp, drawRailSegment } from './buildingRenderer'
import {
  drawCeilingDynamic,
  drawAircraft,
  drawBillboards,
  drawDrones,
  drawEmitters,
  drawEntitySelection,
  drawEventAtmosphere,
  drawHolograms,
  drawOverlay,
  drawPedestrians,
  drawScanOverlay,
  drawSelection,
  drawTrains,
  drawVehicles,
  drawWeather,
  drawDayNight,
  drawDistrictAtmosphere,
  drawStationCrowds,
} from './dynamicRenderer'
import { renderForeground, renderGround } from './groundRenderer'
import { type Camera, type View, clamp, getBuildingBounds, isBoundsVisible, isPointInBounds, project } from './renderUtils'

interface EngineCallbacks {
  onHover?: (building: Building | null, clientX: number, clientY: number) => void
  onSelect?: (building: Building | null) => void
  onSelectEntity?: (entity: SelectedEntity | null) => void
  onFollowChange?: (following: boolean) => void
  onCamera?: (info: CameraInfo) => void
  onAutoQuality?: (pixelScale: number) => void
}

type FollowTarget = { kind: EntityKind; id: string } | null

interface EntityVisual {
  kind: EntityKind
  id: string
  x: number
  y: number
  z: number
  color: string
  label: string
  profile: SelectedEntity
}

interface PointerInfo {
  x: number
  y: number
  startX: number
  startY: number
  clientX: number
  clientY: number
  startTime: number
  moved: boolean
}

type StaticEntry =
  | { depth: number; kind: 'building'; building: Building }
  | { depth: number; kind: 'prop'; prop: import('../types').Prop }
  | { depth: number; kind: 'rail'; line: import('../types').RailLine; from: number; to: number }

const MIN_ZOOM = 0.135
const MAX_ZOOM = 2.65

export class CityEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private groundCanvas: HTMLCanvasElement
  private groundCtx: CanvasRenderingContext2D
  private cityCanvas: HTMLCanvasElement
  private cityCtx: CanvasRenderingContext2D
  private fgCanvas: HTMLCanvasElement
  private fgCtx: CanvasRenderingContext2D
  private city: CityData
  private callbacks: EngineCallbacks
  private camera: Camera
  private view: View
  private width = 800
  private height = 500
  private target: Camera | null = null
  private dirty = true
  private raf = 0
  private last = 0
  private time = 0
  private selected: Building | null = null
  private hovered: Building | null = null
  private overlay: OverlayMode = 'none'
  private event: CityEvent | null = null
  private photoMode = false
  private scanMode = false
  private quality: QualityLevel = 'auto'
  private pixelScale = 1.7
  /** Multiplier applied on top of the AUTO profile when the FPS watchdog fires (up to ~2.6). */
  private autoScale = 1
  private fpsWatch = { frames: 0, windowStart: 0, lowSeconds: 0, lastShot: 0 }
  private daylight = 1
  private weather: ViewWeather = 'clear'
  private selectedEntity: { kind: EntityKind; id: string } | null = null
  private followTarget: FollowTarget = null
  private pedMap: Map<string, import('../types').Pedestrian>
  private vehicleMap: Map<string, import('../types').Vehicle>
  private trainMap: Map<string, import('../types').Train>
  private buildingMask: Uint8Array | null = null
  private playerTick = 0
  private dwellMap = new Map<string, number>()
  private stationMap = new Map<string, number[]>()
  private pointers = new Map<number, PointerInfo>()
  private pinch: { dist: number; midX: number; midY: number; camX: number; camY: number; zoom: number } | null = null
  private drag: { startX: number; startY: number; camX: number; camY: number; moved: boolean } | null = null
  private lastMouse: { x: number; y: number; clientX: number; clientY: number } | null = null
  private lastInfo = 0
  private lastInfoKey = ''
  private destroyed = false
  private onWheel = (e: WheelEvent) => this.handleWheel(e)
  private onPointerDown = (e: PointerEvent) => this.handlePointerDown(e)
  private onPointerMove = (e: PointerEvent) => this.handlePointerMove(e)
  private onPointerUp = (e: PointerEvent) => this.handlePointerUp(e)
  private onPointerLeave = () => this.clearHover()
  private onDoubleClick = (e: MouseEvent) => this.handleDoubleClick(e)
  private onContextMenu = (e: MouseEvent) => e.preventDefault()

  constructor(canvas: HTMLCanvasElement, city: CityData, callbacks: EngineCallbacks = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D
    this.city = city
    this.callbacks = callbacks
    this.pedMap = new Map(city.pedestrians.map((n) => [n.id, n]))
    this.vehicleMap = new Map(city.vehicles.map((v) => [v.id, v]))
    this.trainMap = new Map(city.trains.map((t) => [t.id, t]))
    for (const st of city.stations) {
      const list = this.stationMap.get(st.lineId) ?? []
      list.push(st.pos)
      this.stationMap.set(st.lineId, list)
    }
    this.groundCanvas = document.createElement('canvas')
    this.groundCtx = this.groundCanvas.getContext('2d') as CanvasRenderingContext2D
    this.cityCanvas = document.createElement('canvas')
    this.cityCtx = this.cityCanvas.getContext('2d') as CanvasRenderingContext2D
    this.fgCanvas = document.createElement('canvas')
    this.fgCtx = this.fgCanvas.getContext('2d') as CanvasRenderingContext2D
    this.camera = { x: 0, y: (this.city.size / 2) * 2 * (TILE_H / 2), zoom: 0.5 }
    this.view = {
      width: this.width,
      height: this.height,
      camera: this.camera,
      time: 0,
      event: null,
      overlay: 'none',
      city: this.city,
      photoMode: false,
      scanMode: false,
      daylight: this.daylight,
      weather: this.weather,
      district: 'central',
    }
    this.ctx.imageSmoothingEnabled = false
    this.groundCtx.imageSmoothingEnabled = false
    this.cityCtx.imageSmoothingEnabled = false
    this.fgCtx.imageSmoothingEnabled = false
    this.buildMask()
    this.resize()
    this.bind()
    this.last = performance.now()
    this.fpsWatch = { frames: 0, windowStart: this.last, lowSeconds: 0, lastShot: 0 }
    document.addEventListener('visibilitychange', this.onVisibility)
    this.raf = requestAnimationFrame(this.tick)
  }

  private bind() {
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false })
    this.canvas.addEventListener('pointerdown', this.onPointerDown)
    this.canvas.addEventListener('pointermove', this.onPointerMove)
    this.canvas.addEventListener('pointerup', this.onPointerUp)
    this.canvas.addEventListener('pointercancel', this.onPointerUp)
    this.canvas.addEventListener('pointerleave', this.onPointerLeave)
    this.canvas.addEventListener('dblclick', this.onDoubleClick)
    this.canvas.addEventListener('contextmenu', this.onContextMenu)
  }

  destroy() {
    this.destroyed = true
    cancelAnimationFrame(this.raf)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.canvas.removeEventListener('wheel', this.onWheel)
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('pointercancel', this.onPointerUp)
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave)
    this.canvas.removeEventListener('dblclick', this.onDoubleClick)
    this.canvas.removeEventListener('contextmenu', this.onContextMenu)
  }

  private resolvePixelScale(cssW: number) {
    if (this.quality === 'high') return cssW < 720 ? 1.2 : 1.35
    if (this.quality === 'performance') return cssW < 720 ? 1.7 : 2.4
    if (this.quality === 'balanced') return cssW < 720 ? 1.35 : 1.85
    return (cssW < 720 ? 1.2 : 1.7) * this.autoScale
  }

  private onVisibility = () => {
    if (this.destroyed) return
    if (document.hidden) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
    } else if (!this.raf) {
      // Re-anchor the clock so the first resumed frame doesn't produce a huge dt.
      this.last = performance.now()
      this.fpsWatch.windowStart = this.last
      this.raf = requestAnimationFrame(this.tick)
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    const cssW = rect.width || window.innerWidth
    const cssH = rect.height || window.innerHeight
    this.pixelScale = this.resolvePixelScale(cssW)
    this.width = Math.max(300, Math.round(cssW / this.pixelScale))
    this.height = Math.max(240, Math.round(cssH / this.pixelScale))
    this.canvas.width = this.width
    this.canvas.height = this.height
    for (const c of [this.groundCanvas, this.cityCanvas, this.fgCanvas]) {
      c.width = this.width
      c.height = this.height
    }
    // Resizing a canvas resets its context state, so restore nearest-neighbour
    // sampling for every layer to keep the pixel art crisp.
    this.ctx.imageSmoothingEnabled = false
    this.groundCtx.imageSmoothingEnabled = false
    this.cityCtx.imageSmoothingEnabled = false
    this.fgCtx.imageSmoothingEnabled = false
    this.view.width = this.width
    this.view.height = this.height
    this.dirty = true
    this.clampCamera()
  }

  private tick = (now: number) => {
    if (this.destroyed) return
    const dt = Math.min(0.05, Math.max(0.001, (now - this.last) / 1000))
    this.last = now
    this.time = now / 1000
    this.view.time = this.time
    this.runFpsWatch(now)
    this.update(dt)
    this.updatePlayer()
    // Sync the atmosphere section of the view before any layer rendering.
    this.view.daylight = this.daylight
    this.view.weather = this.weather
    this.view.district = districtForCell(
      clamp(this.camera.x / TILE_W + this.camera.y / TILE_H, 0, this.city.size),
      clamp(this.camera.y / TILE_H - this.camera.x / TILE_W, 0, this.city.size),
    )
    if (this.dirty) {
      this.renderStaticLayers()
      this.dirty = false
    }
    const ctx = this.ctx
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, this.width, this.height)
    ctx.drawImage(this.groundCanvas, 0, 0)
    drawVehicles(ctx, this.view)
    drawPedestrians(ctx, this.view)
    ctx.drawImage(this.cityCanvas, 0, 0)
    this.drawPlayer(ctx)
    drawStationCrowds(ctx, this.view)
    drawTrains(ctx, this.view)
    drawAircraft(ctx, this.view)
    drawDrones(ctx, this.view)
    drawEmitters(ctx, this.view)
    drawBillboards(ctx, this.view)
    drawHolograms(ctx, this.view)
    drawEventAtmosphere(ctx, this.view)
    drawOverlay(ctx, this.view)
    const entity = this.selectedEntity ? this.resolveEntity(this.selectedEntity.kind, this.selectedEntity.id) : null
    if (entity && !this.photoMode) {
      drawEntitySelection(ctx, this.view, entity, entity.label)
    }
    if (!this.photoMode) {
      if (this.selected) drawSelection(ctx, this.view, this.selected, true)
      if (this.hovered && this.hovered !== this.selected) drawSelection(ctx, this.view, this.hovered, false)
    }
    ctx.drawImage(this.fgCanvas, 0, 0)
    drawCeilingDynamic(ctx, this.view)
    // day/night, district atmosphere and weather tints removed for crisp pixel output
    // drawDayNight(ctx, this.view)
    // drawDistrictAtmosphere(ctx, this.view)
    // drawWeather(ctx, this.view)
    if (this.scanMode) drawScanOverlay(ctx, this.view)
    this.emitCameraInfo()
    this.raf = requestAnimationFrame(this.tick)
  }

  /** Auto-quality watchdog: if FPS sits under 30 for ~4s, degrade the buffer. */
  private runFpsWatch(now: number) {
    const watch = this.fpsWatch
    watch.frames += 1
    if (now - watch.windowStart < 1000) return
    const fps = (watch.frames * 1000) / (now - watch.windowStart)
    watch.frames = 0
    watch.windowStart = now
    if (document.hidden) return
    if (fps < 30) {
      watch.lowSeconds += 1
      if (watch.lowSeconds >= 4 && now - watch.lastShot > 6000) {
        watch.lastShot = now
        watch.lowSeconds = 0
        const next = Math.min(2.6 / 1.7, this.autoScale * 1.3)
        if (next > this.autoScale + 0.01) {
          this.autoScale = next
          this.resize()
          this.callbacks.onAutoQuality?.(this.pixelScale)
        }
      }
    } else {
      watch.lowSeconds = 0
    }
  }

  private updatePlayer() {
    try {
      const store = (globalThis as any).useCityStore
      if (!store || typeof store.getState !== 'function') return
      const s = store.getState()
      const p = s.player
      if (!p.moving || !p.target) return
      const dx = p.target.x - p.x
      const dy = p.target.y - p.y
      const dist = Math.hypot(dx, dy)
      const speed = 0.8
      const step = speed * 0.016
      if (dist <= step) {
        store.setState((prev: any) => ({ player: { ...prev.player, x: p.target.x, y: p.target.y, moving: false, target: null, path: [] } }))
      } else {
        const nx = p.x + dx / dist * step
        const ny = p.y + dy / dist * step
        const facing = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up'
        store.setState((prev: any) => ({ player: { ...prev.player, x: nx, y: ny, facing } }))
      }
    } catch { /* no-op */ }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    try {
      const store = (globalThis as any).useCityStore
      const social = (globalThis as any).useSocialStore
      if (!store || !social) return
      const s = store.getState()
      const prof = social.getState().profile
      if (!prof) return
      const p = s.player
      const pt = project(this.view, p.x, p.y, 0.5)
      const x = Math.round(pt[0]) - 6
      const y = Math.round(pt[1]) - 14
      ctx.save()
      ctx.fillStyle = prof.body
      ctx.fillRect(x, y, 12, 10)
      ctx.fillStyle = prof.visor
      ctx.fillRect(x + 2, y + 2, 8, 2)
      ctx.fillStyle = '#8ff8ff'
      if (p.facing === 'up') ctx.fillRect(x + 4, y - 2, 4, 2)
      if (p.facing === 'down') ctx.fillRect(x + 4, y + 12, 4, 2)
      if (p.facing === 'left') ctx.fillRect(x - 2, y + 4, 2, 4)
      if (p.facing === 'right') ctx.fillRect(x + 12, y + 4, 2, 4)
      ctx.restore()
    } catch { /* no-op */ }
  }

  private update(dt: number) {
    if (this.followTarget) {
      const entity = this.resolveEntity(this.followTarget.kind, this.followTarget.id)
      if (entity) {
        const sx = (entity.x - entity.y) * (TILE_W / 2)
        const sy = (entity.x + entity.y) * (TILE_H / 2) - entity.z * 0.55
        this.target = { x: sx, y: sy, zoom: this.target ? this.target.zoom : Math.max(1.15, this.camera.zoom) }
        this.dirty = true
      }
    }
    if (this.target) {
      const t = this.target
      const k = Math.min(1, dt * 7.5)
      this.camera.x += (t.x - this.camera.x) * k
      this.camera.y += (t.y - this.camera.y) * k
      this.camera.zoom += (t.zoom - this.camera.zoom) * k
      this.dirty = true
      if (Math.abs(t.x - this.camera.x) < 0.5 && Math.abs(t.y - this.camera.y) < 0.5 && Math.abs(t.zoom - this.camera.zoom) < 0.001) {
        this.camera.x = t.x
        this.camera.y = t.y
        this.camera.zoom = t.zoom
        this.target = null
      }
      this.clampCamera()
    }
    const transitStopped = this.event?.type === 'transit'
    for (const v of this.city.vehicles) {
      v.pos += v.speed * v.dir * dt
      if (v.pos < -3) v.pos = this.city.size + 3
      if (v.pos > this.city.size + 3) v.pos = -3
    }
    for (const a of this.city.aircraft) {
      a.x += a.vx * dt
      a.y += a.vy * dt
      a.z += a.vz * dt
      if (a.x < -20) a.x = this.city.size + 20
      if (a.x > this.city.size + 20) a.x = -20
      if (a.y < -20) a.y = this.city.size + 20
      if (a.y > this.city.size + 20) a.y = -20
      if (a.z < 32 || a.z > 290) a.vz *= -1
    }
    for (const d of this.city.drones) {
      d.phase += dt * d.speed
      d.x += Math.cos(d.phase) * dt * 1.7
      d.y += Math.sin(d.phase * 1.3) * dt * 1.2
      if (d.x < 0) d.x = this.city.size
      if (d.x > this.city.size) d.x = 0
      if (d.y < 0) d.y = this.city.size
      if (d.y > this.city.size) d.y = 0
    }
    for (const n of this.city.pedestrians) {
      if (n.axis === 'x') {
        n.x += n.speed * n.dir * dt
        if (n.x < 0) n.x = this.city.size
        if (n.x > this.city.size) n.x = 0
      } else {
        n.y += n.speed * n.dir * dt
        if (n.y < 0) n.y = this.city.size
        if (n.y > this.city.size) n.y = 0
      }
    }
    for (const train of this.city.trains) {
      if (transitStopped && train.id.endsWith('0')) continue
      const rail = this.city.rails.find((r) => r.id === train.lineId)
      if (!rail) continue
      switch (this.trainDwell(train)) {
        case 'running':
          train.pos += train.speed * train.dir * dt
          break
        case 'boarding':
          continue
        case 'ending':
          break
      }
      if (train.pos < rail.from - 10) train.pos = rail.to + 10
      if (train.pos > rail.to + 10) train.pos = rail.from - 10
    }
  }

  /** Trains stop at their line's stations for a few seconds to board NPCs. */
  private trainDwell(train: import('../types').Train): 'running' | 'boarding' | 'ending' {
    const until = this.dwellMap.get(train.id)
    if (until !== undefined) {
      if (this.time < until) {
        train.stopped = true
        return 'boarding'
      }
      this.dwellMap.delete(train.id)
      train.stopped = false
      return 'ending'
    }
    const stations = this.stationMap.get(train.lineId)
    if (!stations) return 'running'
    for (const pos of stations) {
      if (Math.abs(train.pos - pos) < Math.max(0.9, train.speed * 0.12)) {
        this.dwellMap.set(train.id, this.time + 5.2)
        train.stopped = true
        return 'boarding'
      }
    }
    return 'running'
  }

  private renderStaticLayers() {
    const view = this.view
    renderGround(this.groundCtx, view)
    this.cityCtx.clearRect(0, 0, this.width, this.height)
    const entries: StaticEntry[] = []
    for (const b of this.city.buildings) {
      const bounds = getBuildingBounds(view, b)
      if (!isBoundsVisible(view, bounds, 20)) continue
      entries.push({ depth: b.x + b.y + (b.w + b.d) * 0.5, kind: 'building', building: b })
    }
    for (const p of this.city.props) {
      const pt = project(view, p.x, p.y, 0)
      if (pt[0] < -40 || pt[0] > this.width + 40 || pt[1] < -40 || pt[1] > this.height + 40) continue
      entries.push({ depth: p.x + p.y, kind: 'prop', prop: p })
    }
    for (const line of this.city.rails) {
      const step = 11
      for (let from = line.from; from < line.to; from += step) {
        const to = Math.min(from + step, line.to)
        const cx = line.axis === 'x' ? (from + to) / 2 : line.coord
        const cy = line.axis === 'x' ? line.coord : (from + to) / 2
        const p = project(view, cx, cy, line.z)
        if (p[0] < -100 || p[0] > this.width + 100 || p[1] < -100 || p[1] > this.height + 100) continue
        entries.push({ depth: cx + cy, kind: 'rail', line, from, to })
      }
    }
    entries.sort((a, b) => a.depth - b.depth)
    for (const entry of entries) {
      if (entry.kind === 'building') drawBuilding(this.cityCtx, view, entry.building)
      else if (entry.kind === 'prop') drawProp(this.cityCtx, view, entry.prop)
      else drawRailSegment(this.cityCtx, view, entry.line, entry.from, entry.to)
    }
    renderForeground(this.fgCtx, view)
  }

  private getPos(e: PointerEvent | MouseEvent | WheelEvent) {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * this.width,
      y: ((e.clientY - rect.top) / rect.height) * this.height,
      clientX: e.clientX,
      clientY: e.clientY,
    }
  }

  private handleWheel(e: WheelEvent) {
    e.preventDefault()
    const { x, y } = this.getPos(e)
    const factor = Math.exp(-e.deltaY * 0.0016)
    const newZoom = clamp(this.camera.zoom * factor, MIN_ZOOM, MAX_ZOOM)
    const worldX = this.camera.x + (x - this.width / 2) / this.camera.zoom
    const worldY = this.camera.y + (y - this.height / 2) / this.camera.zoom
    this.breakFollow()
    this.target = null
    this.camera.zoom = newZoom
    this.camera.x = worldX - (x - this.width / 2) / newZoom
    this.camera.y = worldY - (y - this.height / 2) / newZoom
    this.clampCamera()
    this.dirty = true
    this.clearHover()
  }

  private handlePointerDown(e: PointerEvent) {
    const pos = this.getPos(e)
    this.canvas.setPointerCapture?.(e.pointerId)
    this.pointers.set(e.pointerId, {
      x: pos.x,
      y: pos.y,
      startX: pos.x,
      startY: pos.y,
      clientX: pos.clientX,
      clientY: pos.clientY,
      startTime: performance.now(),
      moved: false,
    })
    this.lastMouse = pos
    if (this.pointers.size === 1) {
      this.drag = { startX: pos.x, startY: pos.y, camX: this.camera.x, camY: this.camera.y, moved: false }
    } else if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()]
      this.pinch = {
        dist: Math.hypot(b.x - a.x, b.y - a.y),
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
        camX: this.camera.x,
        camY: this.camera.y,
        zoom: this.camera.zoom,
      }
      this.drag = null
    }
  }

  private handlePointerMove(e: PointerEvent) {
    const pos = this.getPos(e)
    this.lastMouse = pos
    const pointer = this.pointers.get(e.pointerId)
    if (pointer) {
      pointer.x = pos.x
      pointer.y = pos.y
      pointer.clientX = pos.clientX
      pointer.clientY = pos.clientY
      if (Math.hypot(pos.x - pointer.startX, pos.y - pointer.startY) > 4) pointer.moved = true
    }
    if (this.pointers.size === 2 && this.pinch) {
      const [a, b] = [...this.pointers.values()]
      const dist = Math.max(10, Math.hypot(b.x - a.x, b.y - a.y))
      const midX = (a.x + b.x) / 2
      const midY = (a.y + b.y) / 2
      const newZoom = clamp(this.pinch.zoom * (dist / this.pinch.dist), MIN_ZOOM, MAX_ZOOM)
      const worldX = this.pinch.camX + (this.pinch.midX - this.width / 2) / this.pinch.zoom
      const worldY = this.pinch.camY + (this.pinch.midY - this.height / 2) / this.pinch.zoom
      this.breakFollow()
      this.target = null
      this.camera.zoom = newZoom
      this.camera.x = worldX - (midX - this.width / 2) / newZoom
      this.camera.y = worldY - (midY - this.height / 2) / newZoom
      this.clampCamera()
      this.dirty = true
      this.clearHover()
      return
    }
    if (this.pointers.size === 1 && this.drag) {
      const dx = pos.x - this.drag.startX
      const dy = pos.y - this.drag.startY
      if (Math.hypot(dx, dy) > 3) this.drag.moved = true
      if (this.drag.moved) {
        this.breakFollow()
        this.target = null
        this.camera.x = this.drag.camX - dx / this.camera.zoom
        this.camera.y = this.drag.camY - dy / this.camera.zoom
        this.clampCamera()
        this.dirty = true
        this.clearHover()
      }
      return
    }
    this.updateHover(pos.x, pos.y, pos.clientX, pos.clientY)
  }

  private handlePointerUp(e: PointerEvent) {
    const pointer = this.pointers.get(e.pointerId)
    if (pointer) {
      const elapsed = performance.now() - pointer.startTime
      if (this.pointers.size === 1 && !pointer.moved && elapsed < 600) {
        const hit = this.hitTestEntity(pointer.x, pointer.y)
        if (hit) {
          this.selectedEntity = { kind: hit.kind, id: hit.id }
          this.selected = null
          this.hovered = null
          this.callbacks.onSelect?.(null)
          this.callbacks.onSelectEntity?.(hit.profile)
        } else {
          this.selectedEntity = null
          const b = this.hitTest(pointer.x, pointer.y)
          this.selected = b
          this.callbacks.onSelectEntity?.(null)
          this.callbacks.onSelect?.(b)
        }
        this.updateHover(pointer.x, pointer.y, pointer.clientX, pointer.clientY)
      }
      this.pointers.delete(e.pointerId)
    }
    if (this.pointers.size === 0) {
      this.drag = null
      this.pinch = null
    }
  }

  private handleDoubleClick(e: MouseEvent) {
    const { x, y } = this.getPos(e)
    const hit = this.hitTestEntity(x, y)
    if (hit) {
      this.selectedEntity = { kind: hit.kind, id: hit.id }
      this.selected = null
      this.callbacks.onSelect?.(null)
      this.callbacks.onSelectEntity?.(hit.profile)
      this.focusEntity(hit.kind, hit.id, true)
      return
    }
    const b = this.hitTest(x, y)
    if (b) {
      this.selected = b
      this.callbacks.onSelect?.(b)
      this.focusBuilding(b, Math.max(1.25, this.camera.zoom * 1.8))
    } else {
      const worldX = this.camera.x + (x - this.width / 2) / this.camera.zoom
      const worldY = this.camera.y + (y - this.height / 2) / this.camera.zoom
      const cellX = worldX / TILE_W + worldY / TILE_H
      const cellY = worldY / TILE_H - worldX / TILE_W
      try {
        const store = (globalThis as any).useCityStore
        if (store && typeof store.getState === 'function') {
          const s = store.getState()
          if (s && s.player && s.player.mode === 'citizen') {
            s.playerMoveTo(cellX, cellY)
          } else {
            this.focusCell(cellX, cellY, clamp(this.camera.zoom * 1.8, MIN_ZOOM, MAX_ZOOM))
          }
        } else {
          this.focusCell(cellX, cellY, clamp(this.camera.zoom * 1.8, MIN_ZOOM, MAX_ZOOM))
        }
      } catch {
        this.focusCell(cellX, cellY, clamp(this.camera.zoom * 1.8, MIN_ZOOM, MAX_ZOOM))
      }
    }
  }

  private updateHover(x: number, y: number, clientX: number, clientY: number) {
    const b = this.hitTest(x, y)
    const entity = !b && this.camera.zoom >= 0.7 ? this.hitTestEntity(x, y) : null
    if (b !== this.hovered) {
      this.hovered = b
      this.callbacks.onHover?.(b, clientX, clientY)
    } else if (b) {
      this.callbacks.onHover?.(b, clientX, clientY)
    }
    this.canvas.style.cursor = b || entity ? 'pointer' : 'grab'
  }

  private clearHover() {
    if (this.hovered) {
      this.hovered = null
      this.callbacks.onHover?.(null, 0, 0)
    }
    this.canvas.style.cursor = 'grab'
  }

  private resolveEntity(kind: EntityKind, id: string): EntityVisual | null {
    if (kind === 'pedestrian') {
      const n = this.pedMap.get(id)
      if (!n) return null
      return { kind, id, x: n.x, y: n.y, z: 0.5, color: n.color, label: 'CITIZEN', profile: pedestrianEntity(n) }
    }
    if (kind === 'vehicle') {
      const v = this.vehicleMap.get(id)
      if (!v) return null
      const x = v.axis === 'x' ? v.pos : v.lane
      const y = v.axis === 'x' ? v.lane : v.pos
      return { kind, id, x, y, z: 1, color: v.color, label: 'VEHICLE', profile: vehicleEntity(v) }
    }
    const train = this.trainMap.get(id)
    if (!train) return null
    const rail = this.city.rails.find((r) => r.id === train.lineId)
    if (!rail) return null
    const x = rail.axis === 'x' ? train.pos : rail.coord
    const y = rail.axis === 'x' ? rail.coord : train.pos
    return { kind, id, x, y, z: rail.z + 3, color: rail.color, label: 'TRANSIT', profile: trainEntity(train, rail) }
  }

  private hitTestEntity(x: number, y: number): EntityVisual | null {
    const zoom = this.camera.zoom
    let best: EntityVisual | null = null
    let bestScore = Infinity

    for (const n of this.city.pedestrians) {
      const p = project(this.view, n.x, n.y, 0.5)
      const dx = p[0] - x
      const dy = p[1] - y
      const radius = clamp(5.5 * zoom + 2, 5, 12)
      const dist = dx * dx + dy * dy
      if (dist < radius * radius && dist < bestScore) {
        bestScore = dist
        best = { kind: 'pedestrian', id: n.id, x: n.x, y: n.y, z: 0.5, color: n.color, label: 'CITIZEN', profile: pedestrianEntity(n) }
      }
    }

    for (const v of this.city.vehicles) {
      const vx = v.axis === 'x' ? v.pos : v.lane
      const vy = v.axis === 'x' ? v.lane : v.pos
      const p = project(this.view, vx, vy, 1)
      const dx = p[0] - x
      const dy = p[1] - y
      const radius = clamp(8 * zoom + 3, 7, 18)
      const dist = dx * dx + dy * dy
      if (dist < radius * radius && dist < bestScore) {
        bestScore = dist
        best = { kind: 'vehicle', id: v.id, x: vx, y: vy, z: 1, color: v.color, label: 'VEHICLE', profile: vehicleEntity(v) }
      }
    }

    for (const train of this.city.trains) {
      const rail = this.city.rails.find((r) => r.id === train.lineId)
      if (!rail) continue
      const carLen = rail.kind === 'highway' ? 5 : 6.2
      const gap = rail.kind === 'highway' ? 3.2 : 2.2
      for (let c = 0; c < train.cars; c++) {
        const pos = train.pos - c * (carLen + gap) * train.dir
        if (pos < rail.from - 20 || pos > rail.to + 20) continue
        const tx = rail.axis === 'x' ? pos : rail.coord
        const ty = rail.axis === 'x' ? rail.coord : pos
        const p = project(this.view, tx, ty, rail.z + 3)
        const dx = p[0] - x
        const dy = p[1] - y
        const radius = clamp(11 * zoom + 4, 9, 22)
        const dist = dx * dx + dy * dy
        if (dist < radius * radius && dist < bestScore) {
          bestScore = dist
          best = { kind: 'train', id: train.id, x: tx, y: ty, z: rail.z + 3, color: rail.color, label: 'TRANSIT', profile: trainEntity(train, rail) }
        }
      }
    }

    return best
  }

  private breakFollow() {
    if (!this.followTarget) return
    this.followTarget = null
    this.callbacks.onFollowChange?.(false)
  }

  focusEntity(kind: EntityKind, id: string, follow = false) {
    const entity = this.resolveEntity(kind, id)
    if (!entity) return
    this.selectedEntity = { kind, id }
    this.selected = null
    const sx = (entity.x - entity.y) * (TILE_W / 2)
    const sy = (entity.x + entity.y) * (TILE_H / 2) - entity.z * 0.55
    this.target = { x: sx, y: sy, zoom: Math.max(1.15, this.camera.zoom) }
    this.dirty = true
    if (follow) {
      this.followTarget = { kind, id }
      this.callbacks.onFollowChange?.(true)
    }
  }

  buildMask() {
    const size = this.city.size
    this.buildingMask = new Uint8Array(size * size)
    for (const b of this.city.buildings) {
      const x0 = Math.max(0, Math.floor(b.x))
      const y0 = Math.max(0, Math.floor(b.y))
      const x1 = Math.min(size, Math.ceil(b.x + b.w))
      const y1 = Math.min(size, Math.ceil(b.y + b.d))
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          this.buildingMask[y * size + x] = 1
        }
      }
    }
  }

  setFollowingEntity(target: FollowTarget) {
    this.followTarget = target
    if (target) {
      const entity = this.resolveEntity(target.kind, target.id)
      if (entity) {
        this.target = {
          x: (entity.x - entity.y) * (TILE_W / 2),
          y: (entity.x + entity.y) * (TILE_H / 2) - entity.z * 0.55,
          zoom: Math.max(1.15, this.camera.zoom),
        }
      }
    }
    this.callbacks.onFollowChange?.(!!target)
  }

  followPlayer(px: number, py: number, follow = true) {
    if (follow) {
      this.target = {
        x: (px - py) * (TILE_W / 2),
        y: (px + py) * (TILE_H / 2),
        zoom: Math.max(1.1, this.camera.zoom),
      }
    }
  }

  setPhotoMode(on: boolean) {
    this.photoMode = on
    this.view.photoMode = on
    this.dirty = true
  }

  setScanMode(on: boolean) {
    this.scanMode = on
    this.view.scanMode = on
  }

  setQuality(quality: QualityLevel) {
    this.quality = quality
    this.autoScale = 1
    this.resize()
  }

  /** Hand the engine the current day-phase and weather presentation. */
  setEnvironment(env: { daylight?: number; weather?: ViewWeather }) {
    let changed = false
    if (env.daylight !== undefined && Math.abs(env.daylight - this.daylight) > 0.02) {
      this.daylight = env.daylight
      changed = true
    }
    if (env.weather !== undefined && env.weather !== this.weather) {
      this.weather = env.weather
      changed = true
    }
    if (changed) this.dirty = true
  }

  captureFrame() {
    return this.canvas.toDataURL('image/png')
  }

  private hitTest(x: number, y: number): Building | null {
    let best: Building | null = null
    let bestDepth = -Infinity
    for (const b of this.city.buildings) {
      const bounds = getBuildingBounds(this.view, b)
      if (!isPointInBounds(x, y, bounds)) continue
      const depth = b.x + b.y + (b.w + b.d) * 0.5
      if (depth > bestDepth) {
        bestDepth = depth
        best = b
      }
    }
    return best
  }

  private clampCamera() {
    const size = this.city.size
    const spanX = size * TILE_W
    const spanY = size * TILE_H
    this.camera.x = clamp(this.camera.x, -spanX / 2 - 500, spanX / 2 + 500)
    this.camera.y = clamp(this.camera.y, -500, spanY + 500)
  }

  private emitCameraInfo() {
    if (this.time - this.lastInfo < 0.18) return
    this.lastInfo = this.time
    const sx = this.camera.x
    const sy = this.camera.y
    const cellX = clamp(sx / TILE_W + sy / TILE_H, 0, this.city.size)
    const cellY = clamp(sy / TILE_H - sx / TILE_W, 0, this.city.size)
    const district = districtForCell(cellX, cellY)
    const level: CameraInfo['level'] =
      this.camera.zoom < 0.25 ? 'OVERVIEW' : this.camera.zoom < 0.78 ? 'DISTRICT' : this.camera.zoom < 1.65 ? 'STREET' : 'INTERIOR'
    const key = `${district}-${level}-${Math.round(cellX / 4)}-${Math.round(cellY / 4)}`
    if (key === this.lastInfoKey) return
    this.lastInfoKey = key
    this.callbacks.onCamera?.({
      x: sx,
      y: sy,
      zoom: this.camera.zoom,
      cellX,
      cellY,
      district,
      level,
    })
  }

  focusCell(cellX: number, cellY: number, zoom = this.camera.zoom, animate = true) {
    this.breakFollow()
    const sx = (cellX - cellY) * (TILE_W / 2)
    const sy = (cellX + cellY) * (TILE_H / 2)
    const next = { x: sx, y: sy, zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM) }
    if (animate) {
      this.target = next
    } else {
      this.target = null
      this.camera.x = next.x
      this.camera.y = next.y
      this.camera.zoom = next.zoom
      this.clampCamera()
      this.dirty = true
    }
  }

  focusDistrict(id: DistrictId, zoom = 0.9) {
    const d = getDistrict(id)
    this.focusCell(d.center.x, d.center.y, zoom)
    this.clearHover()
  }

  focusBuilding(b: Building, zoom = 1.45) {
    this.focusCell(b.x + b.w / 2, b.y + b.d / 2, zoom)
    this.selected = b
    this.callbacks.onSelect?.(b)
    this.clearHover()
  }

  selectBuilding(b: Building | null) {
    this.selected = b
    if (b) this.selectedEntity = null
  }

  overview() {
    this.focusCell(this.city.size / 2, this.city.size / 2, 0.16)
  }

  resetView() {
    this.focusCell(this.city.size / 2, this.city.size / 2, 0.5)
  }

  zoomBy(factor: number) {
    const next = clamp(this.camera.zoom * factor, MIN_ZOOM, MAX_ZOOM)
    const worldX = this.camera.x
    const worldY = this.camera.y
    this.target = null
    this.camera.zoom = next
    this.camera.x = worldX
    this.camera.y = worldY
    this.clampCamera()
    this.dirty = true
  }

  setOverlay(mode: OverlayMode) {
    this.overlay = mode
    this.view.overlay = mode
  }

  setEvent(event: CityEvent | null) {
    this.event = event
    this.view.event = event
    this.dirty = true
  }

  getCamera() {
    return { ...this.camera }
  }

  getViewport() {
    return { width: this.width, height: this.height, camera: { ...this.camera } }
  }

  getViewBounds() {
    const corners: Array<[number, number]> = [
      [0, 0],
      [this.width, 0],
      [this.width, this.height],
      [0, this.height],
    ]
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const [sx, sy] of corners) {
      const worldX = this.camera.x + (sx - this.width / 2) / this.camera.zoom
      const worldY = this.camera.y + (sy - this.height / 2) / this.camera.zoom
      const cellX = worldX / TILE_W + worldY / TILE_H
      const cellY = worldY / TILE_H - worldX / TILE_W
      if (cellX < minX) minX = cellX
      if (cellY < minY) minY = cellY
      if (cellX > maxX) maxX = cellX
      if (cellY > maxY) maxY = cellY
    }
    return { minX, minY, maxX, maxY }
  }

  getTime() {
    return this.time
  }
}
