import { useEffect, useState } from 'react'
import type { CityData } from '../types'
import { formatNumber } from './ui'

const BOOT_LINES = [
  'NEXUS CIVIC KERNEL v9.41.7',
  'MOUNTING CAVERN 07 TOPOLOGY...',
  'CIVIC MESH HANDSHAKE ACCEPTED',
  'DISTRICT REGISTRY SYNCHRONIZED',
  'TRAFFIC + TRANSIT SIMULATION LIVE',
  'ATMOSPHERE CONDENSERS NOMINAL',
  'OPERATOR ACCESS CHANNEL OPEN',
]

export function Intro({ city, onEnter }: { city: CityData | null; onEnter: () => void }) {
  const [line, setLine] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (line < BOOT_LINES.length) {
      const timer = window.setTimeout(() => setLine((v) => v + 1), 210)
      return () => window.clearTimeout(timer)
    }
    if (!city) return
    const timer = window.setTimeout(() => setReady(true), 280)
    return () => window.clearTimeout(timer)
  }, [line, city])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (ready && city && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        onEnter()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, city, onEnter])

  return (
    <div className="intro">
      <div className="intro__grid" aria-hidden="true" />
      <div className="intro__sweep" aria-hidden="true" />
      <div className="intro__panel">
        <div className="intro__corner intro__corner--tl" />
        <div className="intro__corner intro__corner--br" />

        <div className="intro__mark" aria-hidden="true">
          <svg viewBox="0 0 80 80" width="92" height="92">
            <path d="M40 4 74 22v36L40 76 6 58V22Z" fill="none" stroke="#22e6ff" strokeWidth="1.4" />
            <path d="M40 12 66 26v28L40 68 14 54V26Z" fill="none" stroke="#ff3dd8" strokeOpacity=".5" strokeWidth="1" />
            <path d="M26 54V26l28 28V26" fill="none" stroke="#8ff8ff" strokeWidth="3.2" />
            <path d="M40 4v8M74 22l-8 4M74 58l-8-4M40 76v-8M6 58l8-4M6 22l8 4" stroke="#ff3dd8" strokeWidth="1.4" />
          </svg>
        </div>

        <h1 className="intro__title">
          NEXUS<span>//</span>
        </h1>
        <p className="intro__sub">UNDERGROUND MEGAPOLIS · CAVERN 07</p>

        <div className="intro__terminal">
          {BOOT_LINES.slice(0, line).map((text, index) => (
            <div key={text} className="intro__line">
              <span className="intro__line-time">[{String(index * 3 + 1).padStart(2, '0')}:{String(42 + index).slice(-2)}]</span>
              <span>{text}</span>
              <span className="intro__ok">OK</span>
            </div>
          ))}
          {!city && line >= BOOT_LINES.length ? (
            <div className="intro__line intro__line--wait">
              <span className="intro__line-time">[SYS]</span>
              <span>COMPILING CAVERN TOPOLOGY — SEED LOCK</span>
            </div>
          ) : null}
          {city && line >= BOOT_LINES.length ? (
            <div className="intro__line">
              <span className="intro__line-time">[SYS]</span>
              <span>CAVERN COMPILED · SEED {city.seed}</span>
              <span className="intro__ok">OK</span>
            </div>
          ) : null}
          {line < BOOT_LINES.length || !city ? <span className="intro__cursor" /> : null}
        </div>

        <div className="intro__stats">
          <div>
            <strong>{city ? city.districts.length : '—'}</strong>
            <span>DISTRICTS</span>
          </div>
          <div>
            <strong>{city ? formatNumber(city.buildings.length) : '—'}</strong>
            <span>STRUCTURES</span>
          </div>
          <div>
            <strong>{city ? formatNumber(city.vehicles.length + city.pedestrians.length) : '—'}</strong>
            <span>LIVE ENTITIES</span>
          </div>
          <div>
            <strong>12.4M</strong>
            <span>CITIZENS</span>
          </div>
        </div>

        <button
          className={`intro__enter ${ready ? 'intro__enter--ready' : ''}`}
          onClick={onEnter}
          disabled={!ready || !city}
        >
          <span className="intro__enter-key">ENTER</span>
          <span>{city ? 'INITIALIZE CITY INTERFACE' : 'COMPILING…'}</span>
          <span className="intro__enter-arrow">→</span>
        </button>

        <div className="intro__foot">
          <span><span className="live-dot" /> CIVIC MESH ONLINE</span>
          <span>CLICK OR PRESS ENTER</span>
          <span>NX-8841 // CLEARANCE 04</span>
        </div>
      </div>
    </div>
  )
}
