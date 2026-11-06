import { useEffect, useRef, useState } from 'react'
import type { Building } from '../types'
import { getDistrict } from '../data/city'
import { CROWN_LABELS, FACADE_LABELS, STREET_LABELS } from '../data/personality'
import { useCityStore } from '../state/useCityStore'
import { formatNumber, Meter, SectionLabel, StatusBadge, statusColor } from './ui'
import { Icon } from './Icons'

const INTERIOR_ROOMS = [
  'ATRIUM ACCESS',
  'TENANT SERVICES',
  'RECORDS VAULT',
  'MECHANICAL BAY',
  'RELAY CLOSET',
  'CREW LOUNGE',
  'MAINTENANCE SPINE',
  'EMPTY TENANCY',
  'PRIVATE OFFICE',
  'HYDROPONIC BAY',
  'SERVER CAGE',
  'STORAGE / UNLISTED',
]

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function drawScene(ctx: CanvasRenderingContext2D, building: Building, time: number, width: number, height: number, focusFloor = 0) {
  const district = getDistrict(building.district)
  const body = building.body
  ctx.clearRect(0, 0, width, height)

  const bg = ctx.createLinearGradient(0, 0, 0, height)
  bg.addColorStop(0, '#070a16')
  bg.addColorStop(0.55, '#05070f')
  bg.addColorStop(1, '#03040a')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  // background grid
  ctx.strokeStyle = 'rgba(80,120,170,0.12)'
  ctx.lineWidth = 1
  for (let x = 0; x < width; x += 24) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 0; y < height; y += 24) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  // distant silhouettes
  for (let i = 0; i < 18; i++) {
    const w = 18 + hash(building.seed + i) * 38
    const h = 30 + hash(building.seed + i * 3) * 120
    const x = (i / 18) * width + hash(building.seed + i * 7) * 10
    ctx.fillStyle = i % 3 === 0 ? '#0a0d1a' : '#070a14'
    ctx.fillRect(x, height - h - 30, w, h)
    for (let k = 0; k < 4; k++) {
      if (hash(building.seed + i * 11 + k) > 0.5) {
        ctx.fillStyle = k % 2 ? `${district.color}55` : `${district.accent}44`
        ctx.fillRect(x + 3 + hash(i + k) * (w - 6), height - h - 26 + hash(k + i) * (h - 8), 1, 1)
      }
    }
  }

  const baseY = height - 46
  const topY = 50
  const towerH = baseY - topY
  const centerX = width / 2
  const totalW = Math.min(330, width * 0.62)
  const gap = building.style === 'twin' ? 26 : 0
  const stackW = building.style === 'twin' ? (totalW - gap) / 2 : totalW
  const stackX = building.style === 'twin' ? [centerX - totalW / 2, centerX - totalW / 2 + stackW + gap] : [centerX - totalW / 2]
  const floors = Math.max(6, Math.min(18, Math.round(building.floors)))
  const floorH = (towerH - 14) / floors

  const drawStack = (x: number, w: number, stackIndex: number) => {
    // outer shell
    ctx.fillStyle = '#070b15'
    ctx.fillRect(x - 4, topY - 6, w + 8, towerH + 10)
    ctx.strokeStyle = `${district.color}44`
    ctx.lineWidth = 1
    ctx.strokeRect(x - 4, topY - 6, w + 8, towerH + 10)
    ctx.fillStyle = body[1]
    ctx.fillRect(x, topY, w, towerH)
    ctx.fillStyle = 'rgba(3,5,12,0.55)'
    ctx.fillRect(x + 4, topY + 4, w - 8, towerH - 4)
    ctx.fillStyle = body[2]
    ctx.fillRect(x, topY, w, 5)
    ctx.fillStyle = `${district.color}66`
    ctx.fillRect(x, topY, w, 1)

    for (let floor = 0; floor < floors; floor++) {
      const y = topY + 10 + floor * floorH
      const active = hash(building.seed + floor * 7 + stackIndex * 91) > 0.28
      ctx.strokeStyle = 'rgba(120,155,200,0.16)'
      ctx.beginPath()
      ctx.moveTo(x + 4, y + floorH - 1)
      ctx.lineTo(x + w - 4, y + floorH - 1)
      ctx.stroke()
      const cols = Math.max(3, Math.floor(w / 22))
      for (let col = 0; col < cols; col++) {
        const lit = hash(building.seed + floor * 37 + col * 11 + stackIndex * 53) > 0.42
        const wx = x + 8 + (col / cols) * (w - 16)
        const wy = y + 3
        if (lit && active) {
          ctx.fillStyle = hash(floor + col + building.seed) > 0.85 ? building.accent : building.window
          ctx.globalAlpha = 0.45 + hash(floor * col + 3) * 0.5
          ctx.fillRect(Math.round(wx), Math.round(wy), 4, 2)
          if (hash(building.seed + floor * 3 + col) > 0.86) {
            ctx.fillStyle = `${building.neon}33`
            ctx.fillRect(Math.round(wx) - 1, Math.round(wy) - 1, 6, 4)
          }
        } else {
          ctx.fillStyle = 'rgba(8,12,22,0.85)'
          ctx.fillRect(Math.round(wx), Math.round(wy), 4, 2)
        }
        ctx.globalAlpha = 1
      }
      // occasional room glow
      if (hash(building.seed + floor * 17) > 0.82) {
        ctx.fillStyle = `${hash(floor) > 0.5 ? district.color : district.accent}18`
        ctx.fillRect(x + 6, y + 1, w - 12, floorH - 2)
      }
    }

    // elevator shaft
    if (stackIndex === 0) {
      const shaftX = x + w * 0.58
      ctx.fillStyle = 'rgba(3,5,12,0.9)'
      ctx.fillRect(shaftX - 7, topY + 8, 14, towerH - 12)
      ctx.strokeStyle = 'rgba(143,248,255,0.24)'
      ctx.strokeRect(shaftX - 7, topY + 8, 14, towerH - 12)
      ctx.strokeStyle = 'rgba(143,248,255,0.15)'
      for (let k = 0; k < 2; k++) {
        ctx.beginPath()
        ctx.moveTo(shaftX - 4 + k * 8, topY + 8)
        ctx.lineTo(shaftX - 4 + k * 8, topY + towerH - 4)
        ctx.stroke()
      }
      const carT = (Math.sin(time * 0.24 + building.seed) + 1) / 2
      const carY = topY + 14 + carT * (towerH - 42)
      ctx.fillStyle = '#0d2630'
      ctx.fillRect(shaftX - 5, carY, 10, 12)
      ctx.fillStyle = '#8ff8ff'
      ctx.fillRect(shaftX - 2, carY + 3, 4, 1)
      ctx.fillStyle = 'rgba(143,248,255,0.35)'
      ctx.fillRect(shaftX - 5, carY - 2, 10, 1)
    }

    // vertical conduits
    for (let c = 0; c < 3; c++) {
      const cx = x + 5 + c * 6
      ctx.strokeStyle = c === 1 ? `${district.accent}55` : `${district.color}33`
      ctx.beginPath()
      ctx.moveTo(cx, topY + 10)
      ctx.lineTo(cx, baseY - 6)
      ctx.stroke()
      for (let p = 0; p < 4; p++) {
        const py = topY + 18 + ((time * (0.05 + c * 0.01) + p * 0.25 + hash(building.seed + p)) % 1) * (towerH - 30)
        ctx.fillStyle = c === 1 ? district.accent : district.color
        ctx.globalAlpha = 0.65
        ctx.fillRect(cx - 1, py, 2, 1)
        ctx.globalAlpha = 1
      }
    }
  }

  for (let s = 0; s < stackX.length; s++) drawStack(stackX[s], stackW, s)

  // selected floor highlight
  const floorIndex = Math.max(0, Math.min(floors - 1, Math.round(focusFloor)))
  const floorY = topY + 10 + floorIndex * floorH
  const highlightX = Math.min(...stackX) - 6
  const highlightW = totalW + 12
  ctx.fillStyle = 'rgba(255,79,163,0.1)'
  ctx.fillRect(highlightX, floorY, highlightW, Math.max(2, floorH - 1))
  ctx.fillStyle = 'rgba(255,79,163,0.75)'
  ctx.fillRect(highlightX, floorY, 2, Math.max(2, floorH - 1))
  ctx.fillStyle = 'rgba(255,79,163,0.95)'
  ctx.fillRect(highlightX, floorY + Math.max(1, floorH / 2), 5, 1)
  ctx.font = '7px Silkscreen, monospace'
  ctx.fillStyle = 'rgba(255,79,163,0.85)'
  ctx.fillText(`FLOOR ${String(floorIndex + 1).padStart(2, '0')} // ${building.name.slice(0, 20)}`, highlightX, floorY - 4)

  // skybridge for twin
  if (building.style === 'twin' && stackX.length === 2) {
    const bridgeY = topY + towerH * 0.48
    ctx.fillStyle = '#0b1322'
    ctx.fillRect(stackX[0] + stackW, bridgeY, gap, 10)
    ctx.strokeStyle = `${district.color}55`
    ctx.strokeRect(stackX[0] + stackW, bridgeY, gap, 10)
    ctx.fillStyle = `${district.color}22`
    ctx.fillRect(stackX[0] + stackW + 2, bridgeY + 2, gap - 4, 2)
  }

  // style-specific crown
  const crownX = stackX[0] + stackW / 2
  if (building.style === 'pyramid') {
    ctx.fillStyle = body[2]
    ctx.beginPath()
    ctx.moveTo(stackX[0] - 6, topY)
    ctx.lineTo(crownX, topY - 44)
    ctx.lineTo(stackX[0] + stackW + 6, topY)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = `${district.color}66`
    ctx.stroke()
    ctx.strokeStyle = `${district.accent}44`
    for (let i = 1; i < 5; i++) {
      const t = i / 5
      ctx.beginPath()
      ctx.moveTo(stackX[0] - 6 + (stackW + 12) * t, topY)
      ctx.lineTo(crownX, topY - 44 + 44 * t)
      ctx.stroke()
    }
  } else if (building.style === 'dome') {
    ctx.fillStyle = body[2]
    ctx.beginPath()
    ctx.ellipse(crownX, topY, stackW * 0.58, 38, 0, Math.PI, 0)
    ctx.fill()
    ctx.strokeStyle = `${district.color}66`
    ctx.stroke()
    ctx.strokeStyle = `${district.accent}33`
    for (let i = 1; i < 4; i++) {
      ctx.beginPath()
      ctx.ellipse(crownX, topY, stackW * 0.58 * (i / 4), 38 * (i / 4), 0, Math.PI, 0)
      ctx.stroke()
    }
  } else if (building.style === 'industrial') {
    for (let c = 0; c < 2; c++) {
      const cx = stackX[0] + stackW * (0.25 + c * 0.5)
      ctx.fillStyle = '#151b25'
      ctx.fillRect(cx - 7, topY - 54, 14, 58)
      ctx.fillStyle = '#ff8a2a'
      ctx.fillRect(cx - 7, topY - 54, 14, 2)
      for (let p = 0; p < 4; p++) {
        const t = (time * 0.2 + p * 0.25 + c * 0.3) % 1
        ctx.fillStyle = `rgba(255,180,92,${(1 - t) * 0.2})`
        ctx.fillRect(cx - 4 + Math.sin(t * 6) * 4, topY - 58 - t * 34, 7, 7)
      }
    }
  } else if (building.style === 'spire') {
    ctx.strokeStyle = `${district.color}88`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(crownX, topY)
    ctx.lineTo(crownX, 16)
    ctx.stroke()
    ctx.fillStyle = '#ff4f6d'
    const blink = Math.sin(time * 3) > 0
    ctx.globalAlpha = blink ? 1 : 0.25
    ctx.fillRect(crownX - 1, 14, 3, 3)
    ctx.globalAlpha = 1
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `${district.accent}44`
      ctx.beginPath()
      ctx.ellipse(crownX, topY - 14 - i * 12, 18 - i * 4, 4, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  } else {
    ctx.fillStyle = body[2]
    ctx.fillRect(crownX - stackW * 0.28, topY - 10, stackW * 0.56, 12)
    ctx.strokeStyle = `${district.color}55`
    ctx.strokeRect(crownX - stackW * 0.28, topY - 10, stackW * 0.56, 12)
    ctx.strokeStyle = `${district.accent}66`
    ctx.beginPath()
    ctx.moveTo(crownX, topY - 10)
    ctx.lineTo(crownX, topY - 34)
    ctx.stroke()
    const blink = Math.sin(time * 2.4 + building.seed) > 0.2
    ctx.fillStyle = blink ? '#ff4f6d' : 'rgba(255,79,109,0.25)'
    ctx.fillRect(crownX - 1, topY - 36, 2, 2)
  }

  // ground haze
  const haze = ctx.createLinearGradient(0, baseY - 20, 0, height)
  haze.addColorStop(0, 'rgba(5,7,15,0)')
  haze.addColorStop(1, 'rgba(5,7,15,0.95)')
  ctx.fillStyle = haze
  ctx.fillRect(0, baseY - 20, width, height - baseY + 20)

  // scan sweep
  const sweep = (time * 32) % height
  const sweepGrad = ctx.createLinearGradient(0, sweep - 10, 0, sweep + 10)
  sweepGrad.addColorStop(0, 'rgba(34,230,255,0)')
  sweepGrad.addColorStop(0.5, 'rgba(34,230,255,0.09)')
  sweepGrad.addColorStop(1, 'rgba(34,230,255,0)')
  ctx.fillStyle = sweepGrad
  ctx.fillRect(0, sweep - 10, width, 20)

  // scanlines
  for (let y = 0; y < height; y += 3) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)'
    ctx.fillRect(0, y, width, 1)
  }

  // labels
  ctx.font = '7px Silkscreen, monospace'
  ctx.fillStyle = `${district.color}cc`
  ctx.fillText('SECTION A-A // LIVE', 12, 18)
  ctx.fillStyle = 'rgba(143,248,255,0.55)'
  ctx.fillText(`FLOORS ${building.floors} // ${building.h}M`, 12, 30)
  ctx.fillStyle = 'rgba(255,79,163,0.7)'
  ctx.fillText('OCCUPANCY SENSOR ACTIVE', width - 158, 18)
  ctx.fillStyle = 'rgba(143,248,255,0.4)'
  ctx.fillText('NEXUS CIVIC ARCHIVE', width - 158, 30)
}

export function FacilityView() {
  const open = useCityStore((s) => s.facilityOpen)
  const closeFacility = useCityStore((s) => s.closeFacility)
  const selectedId = useCityStore((s) => s.selectedId)
  const getBuilding = useCityStore((s) => s.getBuilding)
  const engine = useCityStore((s) => s.engine)
  const tracked = useCityStore((s) => s.tracked)
  const toggleTracked = useCityStore((s) => s.toggleTracked)
  const pushToast = useCityStore((s) => s.pushToast)
  const addLog = useCityStore((s) => s.addLog)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [power, setPower] = useState(true)
  const [security, setSecurity] = useState(true)
  const [comms, setComms] = useState(true)
  const [logs, setLogs] = useState<string[]>([])
  const [floor, setFloor] = useState(0)
  const building = getBuilding(selectedId)

  useEffect(() => {
    if (!building) return
    setPower(building.status !== 'OFFLINE')
    setSecurity(building.status !== 'RESTRICTED')
    setComms(true)
    setFloor(0)
    setLogs([
      `> HANDSHAKE ACCEPTED // NODE ${building.id.slice(-6).toUpperCase()}`,
      `> ACCESS LEVEL 04 GRANTED TO CITIZEN NX-8841`,
      `> ${building.systems.toLocaleString('en-US')} SYSTEMS REPORTING`,
      `> AWAITING OPERATOR INPUT`,
    ])
  }, [building])

  useEffect(() => {
    if (!open || !building) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const width = 640
    const height = 460
    const scale = 2
    canvas.width = width * scale
    canvas.height = height * scale
    ctx.imageSmoothingEnabled = false
    let raf = 0
    const draw = (now: number) => {
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      drawScene(ctx, building, now / 1000, width, height, floor)
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [open, building, floor])

  if (!open || !building) return null
  const district = getDistrict(building.district)
  const color = statusColor(building.status)
  const isTracked = tracked.includes(building.id)
  const totalFloors = Math.min(24, Math.max(6, Math.round(building.floors)))
  const roomFor = (index: number) => {
    if (index === 0) return STREET_LABELS[building.street]
    if (index === totalFloors - 1) return CROWN_LABELS[building.crown]
    return INTERIOR_ROOMS[Math.floor(hash(building.seed + index * 71) * INTERIOR_ROOMS.length)]
  }
  const room = roomFor(floor)
  const floorOccupancy = Math.max(0, Math.round(building.occupants / totalFloors + (hash(building.seed + floor * 13) - 0.5) * 20))

  const log = (line: string) => {
    setLogs((prev) => [...prev.slice(-5), `> ${line}`])
  }

  const toggle = (kind: 'power' | 'security' | 'comms') => {
    if (kind === 'power') {
      setPower((v) => !v)
      log(power ? 'POWER BUS ISOLATED // BACKUP CELLS ONLINE' : 'POWER BUS RESTORED // GRID SYNC 100%')
      pushToast({ title: 'FACILITY POWER', message: power ? 'Local bus isolated.' : 'Power restored to the node.', severity: 'info' })
    } else if (kind === 'security') {
      setSecurity((v) => !v)
      log(security ? 'SECURITY LOCKDOWN ENGAGED' : 'SECURITY SEALS RELEASED')
      pushToast({ title: 'SECURITY', message: security ? 'All bulkheads sealed.' : 'Bulkheads unlocked.', severity: 'warning' })
    } else {
      setComms((v) => !v)
      log(comms ? 'COMMS CHANNEL MUTED' : 'COMMS CHANNEL OPEN // RELAY LOCKED')
      pushToast({ title: 'COMMS', message: comms ? 'Channel muted.' : 'Civic relay connected.', severity: 'info' })
    }
  }

  return (
    <div className="facility-layer" onMouseDown={(e) => { if (e.target === e.currentTarget) closeFacility() }}>
      <div className="facility-panel">
        <header className="facility-head">
          <div className="facility-head__left">
            <span className="facility-head__code" style={{ color: district.color }}>{district.code}</span>
            <div>
              <h2>{building.name}</h2>
              <span>{building.type} // {district.name}</span>
            </div>
          </div>
          <div className="facility-head__right">
            <span className="facility-access">
              <span className="live-dot" /> ACCESS GRANTED
            </span>
            <button className="icon-btn icon-btn--small" onClick={closeFacility} title="Exit facility [Esc]">
              <Icon name="close" size={15} />
            </button>
          </div>
        </header>

        <div className="facility-body">
          <div className="facility-visual">
            <canvas ref={canvasRef} className="facility-canvas" />
            <div className="facility-visual__hud">
              <span>ARCHIVE FEED</span>
              <span>CAM 04 / EAST FACE</span>
            </div>
            <div className="facility-visual__legend">
              <span><i style={{ background: district.color }} /> POWER</span>
              <span><i style={{ background: district.accent }} /> DATA</span>
              <span><i style={{ background: '#63ff9b' }} /> LIFE SUPPORT</span>
            </div>
          </div>

          <div className="facility-side">
            <div className="facility-status">
              <StatusBadge status={building.status} />
              <span className="facility-status__id">NODE #{building.id.slice(-8).toUpperCase()}</span>
            </div>

            <SectionLabel>FACILITY RECORD</SectionLabel>
            <div className="facility-kv">
              <div><span>FLOORS</span><strong>{building.floors}</strong></div>
              <div><span>HEIGHT</span><strong>{building.h} M</strong></div>
              <div><span>OCCUPANTS</span><strong>{formatNumber(building.occupants)}</strong></div>
              <div><span>SYSTEMS</span><strong>{formatNumber(building.systems)}</strong></div>
              <div><span>OWNER</span><strong>{building.owner}</strong></div>
              <div><span>GRID</span><strong>{Math.round(building.x)}:{Math.round(building.y)}</strong></div>
            </div>

            <SectionLabel>FLOOR DIRECTORY</SectionLabel>
            <div className="floor-strip">
              {Array.from({ length: totalFloors }, (_, index) => (
                <button
                  key={index}
                  className={`floor-tab ${index === floor ? 'floor-tab--active' : ''}`}
                  onClick={() => {
                    setFloor(index)
                    log(`FLOOR ${String(index + 1).padStart(2, '0')} // ${roomFor(index)}`)
                  }}
                  title={`Floor ${index + 1}: ${roomFor(index)}`}
                >
                  {String(index + 1).padStart(2, '0')}
                </button>
              ))}
            </div>
            <div className="floor-detail">
              <div className="floor-detail__head">
                <span>FLOOR {String(floor + 1).padStart(2, '0')}</span>
                <strong>{room}</strong>
              </div>
              <div className="floor-detail__meta">
                <span>OCCUPANCY {formatNumber(floorOccupancy)}</span>
                <span>{FACADE_LABELS[building.facade]}</span>
                <span style={{ color: power ? '#63ff9b' : '#ff4f6d' }}>{power ? 'POWERED' : 'DARK'}</span>
              </div>
              <p>
                {floor === 0
                  ? `Street frontage: ${STREET_LABELS[building.street].toLowerCase()}. Public access is logged by the civic mesh.`
                  : floor === totalFloors - 1
                    ? `Roof access: ${CROWN_LABELS[building.crown].toLowerCase()}. Weather exposure nominal.`
                    : `Tenant level ${floor + 1}. ${building.quirk}`}
              </p>
            </div>

            <SectionLabel>SYSTEMS</SectionLabel>
            <div className="facility-meters">
              <Meter label="POWER DRAW" value={power ? Math.min(100, building.load * 0.95) : 0} color="#ffd45c" />
              <Meter label="NETWORK" value={comms ? Math.min(100, (building.systems / 24000) * 100) : 0} color="#22e6ff" />
              <Meter label="SECURITY" value={security ? 92 : 18} color="#ff4fa3" />
            </div>

            <div className="facility-toggles">
              <button className={`facility-toggle ${power ? 'facility-toggle--on' : ''}`} onClick={() => toggle('power')}>
                <Icon name="power" size={13} /> POWER
              </button>
              <button className={`facility-toggle ${security ? 'facility-toggle--on' : ''}`} onClick={() => toggle('security')}>
                <Icon name="stability" size={13} /> SECURITY
              </button>
              <button className={`facility-toggle ${comms ? 'facility-toggle--on' : ''}`} onClick={() => toggle('comms')}>
                <Icon name="network" size={13} /> COMMS
              </button>
            </div>

            <SectionLabel>ARCHIVE NOTE</SectionLabel>
            <p className="facility-desc">{building.description}</p>

            <div className="facility-actions">
              <button
                className="mini-btn"
                onClick={() => {
                  closeFacility()
                  engine?.focusBuilding(building, 1.35)
                }}
              >
                <Icon name="locate" size={12} /> LOCATE
              </button>
              <button className={`mini-btn ${isTracked ? 'mini-btn--primary' : ''}`} onClick={() => toggleTracked(building.id)}>
                <Icon name="track" size={12} /> {isTracked ? 'UNTRACK' : 'TRACK'}
              </button>
              <button className="mini-btn" onClick={closeFacility}>
                <Icon name="enter" size={12} /> EXIT
              </button>
            </div>
          </div>
        </div>

        <footer className="facility-terminal">
          <div className="facility-terminal__head">
            <span><span className="live-dot" /> TERMINAL LOG</span>
            <span style={{ color }}>{building.status}</span>
          </div>
          <div className="facility-terminal__lines">
            {logs.map((line, i) => (
              <div key={`${line}-${i}`} className="facility-terminal__line">{line}</div>
            ))}
          </div>
        </footer>
        <span className="facility-panel__corner facility-panel__corner--tl" />
        <span className="facility-panel__corner facility-panel__corner--br" />
      </div>
    </div>
  )
}
