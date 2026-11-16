import { useEffect, useRef, useState } from 'react'
import { useCityStore } from '../state/useCityStore'

const RADIUS = 40
const AXIS_THRESHOLD = 0.32
const SPRINT_THRESHOLD = 0.9

type Dir = 'up' | 'down' | 'left' | 'right'

/**
 * Coarse-pointer only: a fixed thumb stick in the lower-left corner that feeds
 * the same `moveKeys` the keyboard uses, so walking feels identical on touch.
 * Hidden by CSS everywhere else, so mouse builds never see it.
 */
export function TouchStick() {
  const mode = useCityStore((s) => s.player.mode)
  const facilityOpen = useCityStore((s) => s.facilityOpen)
  const photoMode = useCityStore((s) => s.photoMode)
  const baseRef = useRef<HTMLDivElement | null>(null)
  const pointerId = useRef<number | null>(null)
  const directions = useRef<Record<Dir | 'sprint', boolean>>({
    up: false,
    down: false,
    left: false,
    right: false,
    sprint: false,
  })
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const [held, setHeld] = useState(false)

  const apply = (next: Record<Dir | 'sprint', boolean>) => {
    const state = useCityStore.getState()
    for (const key of ['up', 'down', 'left', 'right', 'sprint'] as const) {
      if (directions.current[key] !== next[key]) state.setMoveKey(key, next[key])
    }
    directions.current = next
  }

  const release = () => {
    pointerId.current = null
    apply({ up: false, down: false, left: false, right: false, sprint: false })
    setKnob({ x: 0, y: 0 })
    setHeld(false)
  }

  const track = (clientX: number, clientY: number) => {
    const rect = baseRef.current?.getBoundingClientRect()
    if (!rect) return
    let dx = clientX - (rect.left + rect.width / 2)
    let dy = clientY - (rect.top + rect.height / 2)
    const distance = Math.hypot(dx, dy)
    if (distance > RADIUS) {
      dx = (dx / distance) * RADIUS
      dy = (dy / distance) * RADIUS
    }
    setKnob({ x: dx, y: dy })
    const nx = dx / RADIUS
    const ny = dy / RADIUS
    apply({
      left: nx <= -AXIS_THRESHOLD,
      right: nx >= AXIS_THRESHOLD,
      up: ny <= -AXIS_THRESHOLD,
      down: ny >= AXIS_THRESHOLD,
      sprint: distance / RADIUS >= SPRINT_THRESHOLD,
    })
  }

  // A panel, facility or photo mode must never leave the citizen walking.
  useEffect(() => {
    if (mode !== 'citizen' || facilityOpen || photoMode) release()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, facilityOpen, photoMode])

  if (mode !== 'citizen' || facilityOpen || photoMode) return null

  return (
    <div
      ref={baseRef}
      className={`touch-stick${held ? ' touch-stick--held' : ''}`}
      role="group"
      aria-label="Walk control: drag to move the citizen, push further to sprint"
      onPointerDown={(e) => {
        if (pointerId.current !== null) return
        e.preventDefault()
        pointerId.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        setHeld(true)
        track(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => {
        if (e.pointerId !== pointerId.current) return
        track(e.clientX, e.clientY)
      }}
      onPointerUp={(e) => {
        if (e.pointerId !== pointerId.current) return
        e.currentTarget.releasePointerCapture(e.pointerId)
        release()
      }}
      onPointerCancel={(e) => {
        if (e.pointerId !== pointerId.current) return
        release()
      }}
      onLostPointerCapture={() => release()}
    >
      <span className="touch-stick__ring" aria-hidden="true" />
      <span
        className="touch-stick__knob"
        aria-hidden="true"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  )
}
