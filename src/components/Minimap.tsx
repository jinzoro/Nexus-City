import { useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useCityStore } from '../state/useCityStore'
import { TILE_H, TILE_W } from '../data/city'

interface MinimapProps {
  size?: number
  detailed?: boolean
  interactive?: boolean
  className?: string
}

export function Minimap({ size = 164, detailed = false, interactive = true, className = '' }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragging = useRef(false)
  const city = useCityStore((s) => s.city)
  const engine = useCityStore((s) => s.engine)
  const events = useCityStore((s) => s.events)
  const tracked = useCityStore((s) => s.tracked)
  const selectedEntity = useCityStore((s) => s.selectedEntity)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !city) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const scale = 2
    canvas.width = size * scale
    canvas.height = size * scale
    ctx.imageSmoothingEnabled = false
    let timer = 0

    const draw = () => {
      const time = performance.now() / 1000
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      ctx.clearRect(0, 0, size, size)
      const pad = detailed ? 14 : 8
      const span = size - pad * 2
      const mapX = (x: number) => pad + (x / city.size) * span
      const mapY = (y: number) => pad + (y / city.size) * span

      ctx.fillStyle = '#05060f'
      ctx.fillRect(0, 0, size, size)

      // grid
      ctx.strokeStyle = 'rgba(80,120,170,0.12)'
      ctx.lineWidth = 0.5
      for (let i = 0; i <= 8; i++) {
        const p = pad + (i / 8) * span
        ctx.beginPath()
        ctx.moveTo(p, pad)
        ctx.lineTo(p, pad + span)
        ctx.moveTo(pad, p)
        ctx.lineTo(pad + span, p)
        ctx.stroke()
      }

      // city plate
      ctx.fillStyle = 'rgba(10,12,26,0.9)'
      ctx.strokeStyle = 'rgba(34,230,255,0.28)'
      ctx.lineWidth = 0.6
      ctx.fillRect(pad, pad, span, span)
      ctx.strokeRect(pad, pad, span, span)

      // district zones
      for (const d of city.districts) {
        const cx = mapX(d.center.x)
        const cy = mapY(d.center.y)
        const r = (d.radius / city.size) * span
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        g.addColorStop(0, `${d.color}38`)
        g.addColorStop(0.65, `${d.color}12`)
        g.addColorStop(1, `${d.color}00`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = `${d.color}44`
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2)
        ctx.stroke()
      }

      // parks
      for (const p of city.parks) {
        ctx.fillStyle = p.kind === 'lake' ? 'rgba(55,220,210,0.35)' : 'rgba(99,255,155,0.22)'
        ctx.fillRect(mapX(p.x), mapY(p.y), (p.w / city.size) * span, (p.d / city.size) * span)
      }

      // rails
      for (const rail of city.rails) {
        ctx.strokeStyle = `${rail.color}99`
        ctx.lineWidth = detailed ? 1.2 : 0.7
        ctx.beginPath()
        if (rail.axis === 'x') {
          ctx.moveTo(mapX(rail.from), mapY(rail.coord))
          ctx.lineTo(mapX(rail.to), mapY(rail.coord))
        } else {
          ctx.moveTo(mapX(rail.coord), mapY(rail.from))
          ctx.lineTo(mapX(rail.coord), mapY(rail.to))
        }
        ctx.stroke()
      }

      // building density
      const step = detailed ? 1 : 3
      for (let i = 0; i < city.buildings.length; i += step) {
        const b = city.buildings[i]
        const x = mapX(b.x)
        const y = mapY(b.y)
        const color = city.districts.find((d) => d.id === b.district)?.color ?? '#22e6ff'
        ctx.fillStyle = `${color}${b.landmark ? 'cc' : '44'}`
        ctx.fillRect(x, y, b.landmark ? 2.4 : 1, b.landmark ? 2.4 : 1)
      }

      // landmarks
      for (const b of city.landmarks) {
        const x = mapX(b.x + b.w / 2)
        const y = mapY(b.y + b.d / 2)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(x - 1, y - 1, 2, 2)
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.arc(x, y, 3 + Math.sin(time * 1.7 + b.seed) * 1.2, 0, Math.PI * 2)
        ctx.stroke()
      }

      // tracked structures
      for (const id of tracked) {
        const b = city.buildings.find((node) => node.id === id)
        if (!b) continue
        const x = mapX(b.x + b.w / 2)
        const y = mapY(b.y + b.d / 2)
        ctx.strokeStyle = 'rgba(255,179,71,0.9)'
        ctx.lineWidth = 0.8
        ctx.strokeRect(x - 2, y - 2, 4, 4)
        ctx.fillStyle = '#ffb347'
        ctx.fillRect(x - 0.5, y - 0.5, 1, 1)
      }

      // active event districts
      for (const event of events) {
        if (!event.district) continue
        const d = city.districts.find((entry) => entry.id === event.district)
        if (!d) continue
        const x = mapX(d.center.x)
        const y = mapY(d.center.y)
        const pulse = 4 + Math.sin(time * 4 + d.center.x) * 2.5
        ctx.strokeStyle = event.severity === 'critical' ? 'rgba(255,79,109,0.85)' : 'rgba(255,179,71,0.8)'
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.arc(x, y, pulse, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = event.severity === 'critical' ? '#ff4f6d' : '#ffb347'
        ctx.fillRect(x - 1, y - 1, 2, 2)
      }

      // moving trains
      for (const train of city.trains) {
        const rail = city.rails.find((entry) => entry.id === train.lineId)
        if (!rail) continue
        const x = rail.axis === 'x' ? train.pos : rail.coord
        const y = rail.axis === 'x' ? rail.coord : train.pos
        ctx.fillStyle = rail.color
        ctx.fillRect(mapX(x) - 1, mapY(y) - 1, 2, 2)
      }

      // selected moving signal
      if (selectedEntity) {
        let ex: number | null = null
        let ey: number | null = null
        if (selectedEntity.kind === 'pedestrian') {
          const n = city.pedestrians.find((entry) => entry.id === selectedEntity.id)
          if (n) { ex = n.x; ey = n.y }
        } else if (selectedEntity.kind === 'vehicle') {
          const v = city.vehicles.find((entry) => entry.id === selectedEntity.id)
          if (v) { ex = v.axis === 'x' ? v.pos : v.lane; ey = v.axis === 'x' ? v.lane : v.pos }
        } else {
          const train = city.trains.find((entry) => entry.id === selectedEntity.id)
          const rail = train ? city.rails.find((entry) => entry.id === train.lineId) : null
          if (train && rail) { ex = rail.axis === 'x' ? train.pos : rail.coord; ey = rail.axis === 'x' ? rail.coord : train.pos }
        }
        if (ex != null && ey != null) {
          const x = mapX(ex)
          const y = mapY(ey)
          ctx.strokeStyle = 'rgba(255,79,163,0.95)'
          ctx.lineWidth = 0.9
          ctx.beginPath()
          ctx.arc(x, y, 3 + Math.sin(time * 5) * 1.2, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // viewport
      if (engine) {
        const bounds = engine.getViewBounds()
        const pts: Array<[number, number]> = [
          [mapX(bounds.minX), mapY(bounds.minY)],
          [mapX(bounds.maxX), mapY(bounds.minY)],
          [mapX(bounds.maxX), mapY(bounds.maxY)],
          [mapX(bounds.minX), mapY(bounds.maxY)],
        ]
        ctx.beginPath()
        ctx.moveTo(pts[0][0], pts[0][1])
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
        ctx.closePath()
        ctx.fillStyle = 'rgba(34,230,255,0.08)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(143,248,255,0.95)'
        ctx.lineWidth = 0.8
        ctx.stroke()

        const cam = engine.getCamera()
        const cellX = cam.x / TILE_W + cam.y / TILE_H
        const cellY = cam.y / TILE_H - cam.x / TILE_W
        ctx.strokeStyle = 'rgba(255,79,163,0.9)'
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.moveTo(mapX(cellX) - 3, mapY(cellY))
        ctx.lineTo(mapX(cellX) + 3, mapY(cellY))
        ctx.moveTo(mapX(cellX), mapY(cellY) - 3)
        ctx.lineTo(mapX(cellX), mapY(cellY) + 3)
        ctx.stroke()
      }

      // scan sweep
      const sweep = ((time * 0.22) % 1) * span
      const grad = ctx.createLinearGradient(pad, pad + sweep - 10, pad, pad + sweep + 10)
      grad.addColorStop(0, 'rgba(34,230,255,0)')
      grad.addColorStop(0.5, 'rgba(34,230,255,0.14)')
      grad.addColorStop(1, 'rgba(34,230,255,0)')
      ctx.fillStyle = grad
      ctx.fillRect(pad, pad + sweep - 10, span, 20)

      if (detailed) {
        ctx.font = '5px Silkscreen, monospace'
        ctx.textAlign = 'center'
        for (const d of city.districts) {
          ctx.fillStyle = `${d.color}cc`
          ctx.fillText(d.code, mapX(d.center.x), mapY(d.center.y) - 5)
        }
      }

      // compass
      ctx.fillStyle = 'rgba(143,248,255,0.7)'
      ctx.font = '6px Silkscreen, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('N', size - 10, 10)
      ctx.beginPath()
      ctx.moveTo(size - 10, 12)
      ctx.lineTo(size - 12, 17)
      ctx.lineTo(size - 8, 17)
      ctx.closePath()
      ctx.fillStyle = 'rgba(143,248,255,0.35)'
      ctx.fill()
    }

    draw()
    timer = window.setInterval(draw, 400)
    return () => window.clearInterval(timer)
  }, [city, engine, size, detailed, events, tracked, selectedEntity])

  const moveTo = (event: ReactPointerEvent<HTMLCanvasElement>, animate: boolean) => {
    if (!interactive || !engine || !city) return
    const rect = event.currentTarget.getBoundingClientRect()
    const pad = detailed ? 14 : 8
    const span = size - pad * 2
    const x = ((event.clientX - rect.left) / rect.width) * size
    const y = ((event.clientY - rect.top) / rect.height) * size
    if (x < pad || x > pad + span || y < pad || y > pad + span) return
    const cellX = ((x - pad) / span) * city.size
    const cellY = ((y - pad) / span) * city.size
    const zoom = animate ? (detailed ? 0.85 : 0.62) : engine.getCamera().zoom
    engine.focusCell(cellX, cellY, zoom, animate)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return
    dragging.current = true
    event.currentTarget.setPointerCapture?.(event.pointerId)
    moveTo(event, false)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return
    moveTo(event, false)
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return
    dragging.current = false
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    moveTo(event, true)
  }

  return (
    <canvas
      ref={canvasRef}
      className={`minimap ${interactive ? 'minimap--interactive' : ''} ${className}`}
      style={{ width: size, height: size }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { dragging.current = false }}
      aria-label="City minimap — click or drag to move the camera"
    />
  )
}
