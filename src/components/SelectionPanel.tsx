import { useEffect, useState } from 'react'
import type { Building } from '../types'
import { getDistrict } from '../data/city'
import { CROWN_LABELS, FACADE_LABELS, STREET_LABELS } from '../data/personality'
import { buildingCodexId } from '../data/world'
import { useCityStore } from '../state/useCityStore'
import { formatNumber, Meter, SectionLabel, StatusBadge } from './ui'
import { Icon } from './Icons'

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function NodePreview({ building }: { building: Building }) {
  const district = getDistrict(building.district)
  const towers = Array.from({ length: 7 }, (_, i) => {
    const h = 16 + hash(building.seed + i * 13) * 52
    const w = 14 + hash(building.seed + i * 7) * 18
    const x = 14 + i * 42 + hash(building.seed + i) * 6
    const lit = hash(building.seed + i * 31) > 0.35
    return { x, y: 76 - h, w, h, lit, i }
  })
  return (
    <div className="node-preview" style={{ borderColor: `${district.color}44` }}>
      <svg viewBox="0 0 320 84" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`sky-${building.seed}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={district.color} stopOpacity="0.1" />
            <stop offset="1" stopColor="#05060f" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id={`glow-${building.seed}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={district.color} stopOpacity="0.8" />
            <stop offset="1" stopColor={district.accent} stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect width="320" height="84" fill={`url(#sky-${building.seed})`} />
        <path d="M0 76h320" stroke={`${district.color}55`} strokeWidth="1" />
        <path d="M0 77h320" stroke="#000" strokeWidth="1" opacity=".7" />
        {towers.map((t) => (
          <g key={t.i}>
            <rect x={t.x} y={t.y} width={t.w} height={t.h} fill={building.body[1]} stroke="#05060f" strokeWidth="1" />
            <rect x={t.x} y={t.y} width={t.w} height={3} fill={building.roof} />
            {Array.from({ length: Math.floor(t.h / 8) }, (_, r) =>
              Array.from({ length: Math.max(1, Math.floor(t.w / 6)) }, (_, c) => {
                const on = hash(building.seed + t.i * 97 + r * 13 + c) > 0.48
                return on ? (
                  <rect
                    key={`${r}-${c}`}
                    x={t.x + 3 + c * 6}
                    y={t.y + 6 + r * 8}
                    width="2"
                    height="2"
                    fill={r % 3 === 0 ? building.neon : building.window}
                    opacity={0.5 + hash(r + c) * 0.5}
                  />
                ) : null
              }),
            )}
            {t.i === 3 ? (
              <line x1={t.x + t.w / 2} y1={t.y} x2={t.x + t.w / 2} y2={t.y - 12} stroke={district.accent} strokeWidth="1" opacity=".8" />
            ) : null}
          </g>
        ))}
        <rect x="0" y="0" width="320" height="84" fill={`url(#glow-${building.seed})`} opacity=".05" />
        {Array.from({ length: 42 }, (_, i) => (
          <rect key={i} x="0" y={i * 2} width="320" height="1" fill="#000" opacity=".12" />
        ))}
      </svg>
      <div className="node-preview__scan" />
      <span className="node-preview__label">SECTION VIEW // {building.h}M</span>
    </div>
  )
}

export function SelectionPanel() {
  const selectedId = useCityStore((s) => s.selectedId)
  const getBuilding = useCityStore((s) => s.getBuilding)
  const engine = useCityStore((s) => s.engine)
  const clearSelection = useCityStore((s) => s.clearSelection)
  const openFacility = useCityStore((s) => s.openFacility)
  const tracked = useCityStore((s) => s.tracked)
  const toggleTracked = useCityStore((s) => s.toggleTracked)
  const addBookmark = useCityStore((s) => s.addBookmark)
  const setPhotoMode = useCityStore((s) => s.setPhotoMode)
  const pushToast = useCityStore((s) => s.pushToast)
  const discoverCodex = useCityStore((s) => s.discoverCodex)
  const [tick, setTick] = useState(0)
  const building = getBuilding(selectedId)

  useEffect(() => {
    if (!building) return
    discoverCodex(buildingCodexId(building))
    const timer = window.setInterval(() => setTick((t) => t + 1), 1500)
    return () => window.clearInterval(timer)
  }, [building, discoverCodex])

  if (!building) return null
  const district = getDistrict(building.district)
  const phase = tick * 0.7 + building.seed * 0.01
  const powerDraw = Math.max(4, Math.min(100, building.load * 0.9 + Math.sin(phase) * 5))
  const networkLoad = Math.max(6, Math.min(100, (building.systems / 24000) * 100 + Math.cos(phase * 1.3) * 4))
  const integrity = Math.max(28, Math.min(100, 100 - building.load * 0.14 + Math.sin(phase * 0.6) * 1.6))
  const isTracked = tracked.includes(building.id)

  return (
    <aside className="selection-panel">
      <div className="selection-panel__header" style={{ borderColor: `${district.color}55` }}>
        <div className="selection-panel__eyebrow">
          <span style={{ color: district.color }}>{district.code}</span>
          <span>NODE ACCESS</span>
          {building.landmark ? <span className="selection-panel__flag">LANDMARK</span> : null}
        </div>
        <h2 className="selection-panel__title">{building.name}</h2>
        <div className="selection-panel__badges">
          <StatusBadge status={building.status} />
          <span className="chip">{building.type}</span>
        </div>
        <button className="selection-panel__close" onClick={clearSelection} title="Close node [Esc]">
          <Icon name="close" size={15} />
        </button>
        <span className="selection-panel__corner" style={{ background: district.color }} />
      </div>

      <div className="selection-panel__scroll">
        <NodePreview building={building} />

        <div className="selection-panel__live">
          <span className="live-dot" />
          <span>LIVE TELEMETRY</span>
          <span className="selection-panel__live-id">#{building.id.slice(-8).toUpperCase()}</span>
        </div>

        <div className="selection-panel__meters">
          <Meter label="POWER DRAW" value={powerDraw} color="#ffd45c" />
          <Meter label="NETWORK LOAD" value={networkLoad} color="#22e6ff" />
          <Meter label="STRUCTURAL" value={integrity} color="#63ff9b" />
        </div>

        <SectionLabel>NODE RECORD</SectionLabel>
        <div className="kv-grid">
          <div>
            <span>FLOORS</span>
            <strong>{building.floors}</strong>
          </div>
          <div>
            <span>HEIGHT</span>
            <strong>{building.h} M</strong>
          </div>
          <div>
            <span>OCCUPANTS</span>
            <strong>{formatNumber(building.occupants)}</strong>
          </div>
          <div>
            <span>SYSTEMS</span>
            <strong>{formatNumber(building.systems)}</strong>
          </div>
          <div>
            <span>GRID REF</span>
            <strong>
              {String(Math.round(building.x)).padStart(3, '0')}:{String(Math.round(building.y)).padStart(3, '0')}
            </strong>
          </div>
          <div>
            <span>STATUS</span>
            <strong>{building.status}</strong>
          </div>
        </div>

        <div className="selection-panel__owner">
          <span>REGISTERED OWNER</span>
          <strong>{building.owner}</strong>
        </div>

        <p className="selection-panel__desc">{building.description}</p>

        <SectionLabel>BUILDING CHARACTER</SectionLabel>
        <div className="persona-chips">
          <span className="persona-chip">
            <em>FACADE</em>
            {FACADE_LABELS[building.facade]}
          </span>
          <span className="persona-chip">
            <em>ROOF</em>
            {CROWN_LABELS[building.crown]}
          </span>
          <span className="persona-chip">
            <em>STREET</em>
            {STREET_LABELS[building.street]}
          </span>
          <span className="persona-chip persona-chip--age">
            <em>AGE</em>
            {Math.round(8 + building.age * 92)} YR
          </span>
        </div>
        <div className="persona-quirk">
          <span className="persona-quirk__label">// LOCAL LEGEND</span>
          <p>{building.quirk}</p>
        </div>

        <div className="selection-panel__actions">
          <SectionLabel>NODE ACTIONS</SectionLabel>
          <div className="action-grid">
            <button className="action-btn action-btn--primary" onClick={openFacility}>
              <Icon name="enter" size={15} />
              <span>ENTER FACILITY</span>
            </button>
            <button className="action-btn" onClick={() => engine?.focusBuilding(building, Math.max(1.4, 1.5))}>
              <Icon name="locate" size={15} />
              <span>LOCATE</span>
            </button>
            <button className={`action-btn ${isTracked ? 'action-btn--active' : ''}`} onClick={() => toggleTracked(building.id)}>
              <Icon name="track" size={15} />
              <span>{isTracked ? 'UNTRACK' : 'TRACK NODE'}</span>
            </button>
            <button
              className="action-btn"
              onClick={() => {
                engine?.focusDistrict(building.district, 0.92)
              }}
            >
              <Icon name="sectors" size={15} />
              <span>DISTRICT</span>
            </button>
            <button
              className="action-btn"
              onClick={() => {
                addBookmark({
                  name: building.name,
                  x: building.x + building.w / 2,
                  y: building.y + building.d / 2,
                  zoom: Math.max(1.2, 1.4),
                  district: building.district,
                })
              }}
            >
              <Icon name="track" size={15} />
              <span>SAVE VANTAGE</span>
            </button>
            <button
              className="action-btn"
              onClick={() => {
                setPhotoMode(true)
                engine?.focusBuilding(building, Math.max(1.4, 1.5))
              }}
            >
              <Icon name="scan" size={15} />
              <span>PHOTO MODE</span>
            </button>
            <button
              className="action-btn"
              onClick={async () => {
                const url = new URL(window.location.href)
                url.hash = `node=${building.id}`
                window.history.replaceState(null, '', url.toString())
                try {
                  await navigator.clipboard.writeText(url.toString())
                  pushToast({ title: 'NODE LINK COPIED', message: 'Deep link written to the clipboard.', severity: 'info' })
                } catch {
                  pushToast({ title: 'NODE LINK READY', message: 'Copy the address from the browser bar.', severity: 'warning' })
                }
              }}
            >
              <Icon name="network" size={15} />
              <span>COPY LINK</span>
            </button>
          </div>
        </div>
      </div>

      <div className="selection-panel__footer">
        <span className="selection-panel__footer-dot" style={{ background: district.color }} />
        <span>SECURE LINK</span>
        <span className="selection-panel__footer-sep">//</span>
        <span>{district.name}</span>
      </div>
    </aside>
  )
}
