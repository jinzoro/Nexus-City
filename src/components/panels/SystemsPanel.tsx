import type { QualityLevel } from '../../types'
import { DISTRICTS } from '../../data/city'
import { useCityStore } from '../../state/useCityStore'
import { formatPercent, Meter, SectionLabel, severityColor } from '../ui'
import { Icon } from '../Icons'
import { PanelShell } from './PanelShell'

const QUALITY: Array<{ id: QualityLevel; label: string; detail: string; color: string }> = [
  { id: 'auto', label: 'AUTO', detail: 'Device-aware default', color: '#8ff8ff' },
  { id: 'high', label: 'HIGH', detail: 'Sharper internal buffer', color: '#63ff9b' },
  { id: 'balanced', label: 'BALANCED', detail: 'Smaller buffer, stable', color: '#ffd45c' },
  { id: 'performance', label: 'PERFORMANCE', detail: 'Maximum frame headroom', color: '#ffb347' },
]

const OVERLAYS = [
  { id: 'none', label: 'CLEAR', color: '#8ff8ff', detail: 'No overlay' },
  { id: 'transit', label: 'TRANSIT', color: '#ffb347', detail: 'Rail + traffic lines' },
  { id: 'power', label: 'POWER', color: '#ffd45c', detail: 'Grid + substations' },
  { id: 'network', label: 'NETWORK', color: '#22e6ff', detail: 'Mesh + packet routes' },
  { id: 'atmosphere', label: 'ATMOSPHERE', color: '#63ff9b', detail: 'Air + particulates' },
] as const

export function SystemsPanel() {
  const city = useCityStore((s) => s.city)
  const stats = useCityStore((s) => s.stats)
  const fps = useCityStore((s) => s.fps)
  const overlay = useCityStore((s) => s.overlay)
  const setOverlay = useCityStore((s) => s.setOverlay)
  const audioEnabled = useCityStore((s) => s.audioEnabled)
  const toggleAudio = useCityStore((s) => s.toggleAudio)
  const events = useCityStore((s) => s.events)
  const quality = useCityStore((s) => s.quality)
  const setQuality = useCityStore((s) => s.setQuality)
  const economy = useCityStore((s) => s.economy)
  const workerLayers = useCityStore((s) => s.workerLayers)
  const setWorkerLayers = useCityStore((s) => s.setWorkerLayers)

  if (!city) return null

  return (
    <PanelShell
      title="SYSTEMS"
      subtitle="CIVIC CONTROL // RENDER + SIMULATION"
      icon="systems"
      wide
      footer={
        <>
          <span>ENGINE CANVAS 2D</span>
          <span className="panel-footer__sep">//</span>
          <span>FPS {fps}</span>
          <span className="panel-footer__sep">//</span>
          <span>NODES {city.buildings.length}</span>
          <span className="panel-footer__sep">//</span>
          <span>ENTITIES {city.vehicles.length + city.pedestrians.length + city.aircraft.length}</span>
        </>
      }
    >
      <div className="systems-grid">
        <div className="systems-column">
          <SectionLabel>CITY LAYERS</SectionLabel>          <div className="systems-overlays">
            {OVERLAYS.map((layer) => (
              <button
                key={layer.id}
                className={`systems-overlay ${overlay === layer.id ? 'systems-overlay--active' : ''}`}
                onClick={() => setOverlay(layer.id)}
                style={overlay === layer.id ? { borderColor: layer.color } : undefined}
              >
                <span className="systems-overlay__dot" style={{ background: layer.color, boxShadow: `0 0 8px ${layer.color}` }} />
                <span className="systems-overlay__text">
                  <strong style={overlay === layer.id ? { color: layer.color } : undefined}>{layer.label}</strong>
                  <small>{layer.detail}</small>
                </span>
                <span className="systems-overlay__check">{overlay === layer.id ? 'ON' : ''}</span>
              </button>
            ))}
          </div>

          <SectionLabel>INTERFACE</SectionLabel>
          <div className="toggle-list">
            <button className={`toggle-row ${audioEnabled ? 'toggle-row--on' : ''}`} onClick={() => void toggleAudio()}>
              <Icon name={audioEnabled ? 'audio' : 'audio-off'} size={15} />
              <span>
                <strong>AMBIENT AUDIO</strong>
                <small>{audioEnabled ? 'CITY FEED ACTIVE' : 'MUTED BY DEFAULT'}</small>
              </span>
              <i className="toggle-switch" />
            </button>
            <button
              className={`toggle-row ${workerLayers ? 'toggle-row--on' : ''}`}
              onClick={() => setWorkerLayers(!workerLayers)}
            >
              <Icon name="systems" size={15} />
              <span>
                <strong>WORKER LAYERS</strong>
                <small>{workerLayers ? 'OFFSCREEN CANVAS ACTIVE' : 'MAIN THREAD ONLY'}</small>
              </span>
              <i className="toggle-switch" />
            </button>
          </div>

          <SectionLabel>RENDER QUALITY</SectionLabel>
          <div className="quality-grid">
            {QUALITY.map((profile) => (
              <button
                key={profile.id}
                className={`quality-btn ${quality === profile.id ? 'quality-btn--active' : ''}`}
                onClick={() => setQuality(profile.id)}
                style={quality === profile.id ? { borderColor: profile.color, color: profile.color } : undefined}
              >
                <span className="quality-btn__dot" style={{ background: profile.color }} />
                <span>
                  <strong>{profile.label}</strong>
                  <small>{profile.detail}</small>
                </span>
                <i>{quality === profile.id ? 'ON' : ''}</i>
              </button>
            ))}
          </div>
        </div>

        <div className="systems-column">
          <SectionLabel>CORE HEALTH</SectionLabel>
          <div className="systems-health">
            <Meter label="POWER GRID" value={stats.power} color="#ffd45c" />
            <Meter label="CIVIC MESH" value={stats.network} color="#22e6ff" />
            <Meter label="STRUCTURAL" value={stats.stability} color="#63ff9b" />
            <Meter label="TRANSIT FLOW" value={stats.transit} color="#ffb347" />
            <Meter label="AIR QUALITY" value={stats.air} color="#8ff8ff" />
            <Meter label="TRAFFIC FLOW" value={stats.traffic} color="#ff4fa3" />
          </div>

          <SectionLabel>DISTRICT ECONOMY</SectionLabel>
          <div className="economy-head">
            <div><span>LEDGER</span><strong>{Math.round(economy.credits).toLocaleString('en-US')} CR</strong></div>
            <div><span>INCOME</span><strong>{Math.round(economy.incomePerMin)} CR/M</strong></div>
            <div><span>DEMAND</span><strong>{Math.round(economy.demand)} MW</strong></div>
            <div><span>SUPPLY</span><strong style={{ color: economy.supply < economy.demand ? '#ff4f6d' : '#63ff9b' }}>{Math.round(economy.supply)} MW</strong></div>
          </div>
          <div className="economy-list">
            {DISTRICTS.map((d) => {
              const row = economy.districts[d.id]
              const short = row.supply / Math.max(1, row.demand) < 0.92
              return (
                <div key={d.id} className="economy-row">
                  <span className="economy-row__code" style={{ color: d.color }}>{d.code}</span>
                  <span className="economy-row__name">{d.name}</span>
                  <span className="economy-row__bar">
                    <i style={{ width: `${Math.min(100, (row.income / 120) * 100)}%`, background: d.color }} />
                  </span>
                  <span className="economy-row__income">{Math.round(row.income)} CR/M</span>
                  <span className="economy-row__stability" style={{ color: short ? '#ff4f6d' : '#63ff9b' }}>
                    {short ? 'SHORT' : `${Math.round(row.stability)}%`}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="settings-note">
            Blackouts drain supply, festivals spike demand, and sustained shortfalls raise crime and
            drag stability down. Failures cascade: grid faults snarl signals, gridlock invites crime,
            and raids hit the substations next.
          </p>

          <SectionLabel>RUNTIME</SectionLabel>
          <div className="runtime-grid">
            <div><span>FRAME RATE</span><strong style={{ color: fps >= 50 ? '#63ff9b' : fps >= 30 ? '#ffb347' : '#ff4f6d' }}>{fps} FPS</strong></div>
            <div><span>VISIBLE NODES</span><strong>{city.buildings.filter((b) => b.landmark).length} LM</strong></div>
            <div><span>GRID COVERAGE</span><strong>{formatPercent((economy.supply / Math.max(1, economy.demand)) * 100, 1)}</strong></div>
            <div><span>ACTIVE EVENTS</span><strong>{events.length}</strong></div>
          </div>

          <SectionLabel>EVENT BUS</SectionLabel>
          <div className="event-bus">
            {events.length === 0 ? (
              <div className="event-bus__quiet">NO ACTIVE ANOMALIES</div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="event-bus__row">
                  <span style={{ background: severityColor(event.severity), boxShadow: `0 0 6px ${severityColor(event.severity)}` }} />
                  <strong style={{ color: severityColor(event.severity) }}>{event.title}</strong>
                  <small>{event.district?.toUpperCase() ?? 'CITY-WIDE'}</small>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PanelShell>
  )
}
