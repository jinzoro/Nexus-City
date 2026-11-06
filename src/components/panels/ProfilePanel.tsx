import type { CSSProperties } from 'react'
import { useCityStore } from '../../state/useCityStore'
import { FACTIONS, buildCodex } from '../../data/world'
import { getDistrict } from '../../data/city'
import { formatNumber, Meter, SectionLabel } from '../ui'
import { Icon } from '../Icons'
import { PanelShell } from './PanelShell'

function PixelAvatar() {
  return (
    <div className="pixel-avatar" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="88" height="88" shapeRendering="crispEdges">
        <rect width="16" height="16" fill="#070a16" />
        <rect x="3" y="2" width="10" height="1" fill="#22e6ff" opacity=".35" />
        <rect x="2" y="3" width="12" height="9" fill="#0b1020" />
        <rect x="4" y="4" width="8" height="1" fill="#ff3dd8" />
        <rect x="4" y="5" width="8" height="5" fill="#1b2740" />
        <rect x="5" y="6" width="2" height="1" fill="#8ff8ff" />
        <rect x="9" y="6" width="2" height="1" fill="#8ff8ff" />
        <rect x="5" y="8" width="6" height="1" fill="#22e6ff" opacity=".7" />
        <rect x="6" y="9" width="4" height="1" fill="#ff4fa3" />
        <rect x="3" y="12" width="10" height="2" fill="#182038" />
        <rect x="5" y="11" width="6" height="1" fill="#2a3555" />
        <rect x="2" y="14" width="12" height="1" fill="#05060f" />
        <rect x="7" y="1" width="2" height="1" fill="#63ff9b" />
        <rect x="1" y="6" width="1" height="3" fill="#22e6ff" opacity=".5" />
        <rect x="14" y="6" width="1" height="3" fill="#ff3dd8" opacity=".5" />
      </svg>
      <span className="pixel-avatar__scan" />
    </div>
  )
}

export function ProfilePanel() {
  const city = useCityStore((s) => s.city)
  const discovered = useCityStore((s) => s.discovered)
  const visited = useCityStore((s) => s.visitedDistricts)
  const tracked = useCityStore((s) => s.tracked)
  const getBuilding = useCityStore((s) => s.getBuilding)
  const engine = useCityStore((s) => s.engine)
  const log = useCityStore((s) => s.eventLog)
  const factionRep = useCityStore((s) => s.factionRep)
  const codexFound = useCityStore((s) => s.codexFound)
  const discoverCodex = useCityStore((s) => s.discoverCodex)
  const setSelected = useCityStore((s) => s.setSelected)

  if (!city) return null
  const landmarkIds = city.landmarks.map((b) => b.id)
  const found = landmarkIds.filter((id) => discovered.includes(id)).length
  const progress = (found / landmarkIds.length) * 100
  const transmissions = log.filter((entry) => entry.title === 'CITIZEN TRANSMISSION').length
  const codex = buildCodex(city)
  const codexCount = codex.filter((entry) => codexFound.includes(entry.id)).length

  return (
    <PanelShell
      title="PROFILE"
      subtitle="CITIZEN TERMINAL // NEXUS ACCESS"
      icon="profile"
      wide
      footer={
        <>
          <span>ACCESS LEVEL 04</span>
          <span className="panel-footer__sep">//</span>
          <span>NODE {discovered.length} DISCOVERED</span>
          <span className="panel-footer__sep">//</span>
          <span>SESSION STABLE</span>
        </>
      }
    >
      <div className="profile-layout">
        <div className="profile-card">
          <PixelAvatar />
          <div className="profile-card__id">
            <span className="profile-card__eyebrow">CITIZEN // NX-8841</span>
            <h3>VISITOR 8841</h3>
            <p>UNREGISTERED OBSERVER</p>
            <div className="profile-card__chips">
              <span className="chip chip--cyan">CLEARANCE 04</span>
              <span className="chip">NO AFFILIATION</span>
            </div>
          </div>
          <div className="profile-card__stats">
            <div><span>DISCOVERIES</span><strong>{discovered.length}</strong></div>
            <div><span>SECTORS</span><strong>{visited.length}/9</strong></div>
            <div><span>TRACKED</span><strong>{tracked.length}</strong></div>
            <div><span>PACKETS</span><strong>{transmissions}</strong></div>
          </div>
        </div>

        <div className="profile-main">
          <SectionLabel>LANDMARK SURVEY</SectionLabel>
          <div className="survey">
            <div className="survey__head">
              <span>KNOWN LANDMARKS</span>
              <strong>{found}/{landmarkIds.length}</strong>
            </div>
            <Meter label="SURVEY COMPLETE" value={progress} color="#22e6ff" detail={`${Math.round(progress)}%`} />
            <div className="survey__grid">
              {city.landmarks.map((landmark) => {
                const known = discovered.includes(landmark.id)
                return (
                  <button
                    key={landmark.id}
                    className={`survey__item ${known ? 'survey__item--known' : ''}`}
                    onClick={() => engine?.focusBuilding(landmark, 1.15)}
                    title={known ? landmark.name : 'Undiscovered landmark'}
                  >
                    <span className="survey__item-dot" />
                    <span className="survey__item-name">{known ? landmark.name : '████████ ██████'}</span>
                    <span className="survey__item-code">{known ? landmark.district.toUpperCase() : '???'}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <SectionLabel>TRACKED NODES</SectionLabel>
          <div className="tracked-list">
            {tracked.length === 0 ? (
              <div className="tracked-list__quiet">NO TRACKED NODES // SELECT A STRUCTURE AND TRACK IT</div>
            ) : (
              tracked.map((id) => {
                const building = getBuilding(id)
                if (!building) return null
                return (
                  <button key={id} className="tracked-row" onClick={() => engine?.focusBuilding(building, 1.3)}>
                    <span className="tracked-row__dot" />
                    <span className="tracked-row__name">{building.name}</span>
                    <span className="tracked-row__meta">{building.h}M</span>
                    <Icon name="locate" size={11} />
                  </button>
                )
              })
            )}
          </div>

          <SectionLabel>VISITED SECTORS</SectionLabel>
          <div className="visited-grid">
            {city.districts.map((d) => (
              <button
                key={d.id}
                className={`visited-chip ${visited.includes(d.id) ? 'visited-chip--on' : ''}`}
                style={{ '--sector-color': d.color } as CSSProperties}
                onClick={() => engine?.focusDistrict(d.id, 0.92)}
              >
                <span />
                {d.code}
              </button>
            ))}
          </div>

          <SectionLabel>FACTION STANDING</SectionLabel>
          <div className="faction-grid">
            {FACTIONS.map((faction) => {
              const value = factionRep[faction.id] ?? 50
              return (
                <div key={faction.id} className="faction-row" style={{ '--faction-color': faction.color } as CSSProperties}>
                  <div className="faction-row__head">
                    <span className="faction-row__swatch" style={{ background: faction.color, boxShadow: `0 0 7px ${faction.color}` }} />
                    <strong style={{ color: faction.color }}>{faction.name}</strong>
                    <span className="faction-row__code">{faction.code}</span>
                    <span className="faction-row__value" style={{ color: faction.accent }}>{Math.round(value)}</span>
                  </div>
                  <div className="faction-row__track">
                    <i style={{ width: `${value}%`, background: faction.color }} />
                  </div>
                  <p>{faction.description}</p>
                </div>
              )
            })}
          </div>

          <SectionLabel action={<span className="codex-count">{codexCount}/{codex.length} FILED</span>}>CIVIC CODEX</SectionLabel>
          <div className="codex-grid">
            {codex.map((entry) => {
              const known =
                codexFound.includes(entry.id) ||
                (entry.id.startsWith('lm-') && discovered.includes(entry.id.slice(3))) ||
                (entry.id.startsWith('dist-') && visited.includes(entry.id.slice(5) as never))
              return (
                <button
                  key={entry.id}
                  className={`codex-card ${known ? 'codex-card--known' : ''}`}
                  style={{ '--codex-color': entry.color } as CSSProperties}
                  onClick={() => {
                    discoverCodex(entry.id)
                    if (entry.district) {
                      const landmark = city.landmarks.find((b) => `lm-${b.id}` === entry.id)
                      if (landmark) {
                        setSelected(landmark)
                        engine?.focusBuilding(landmark, 1.15)
                      } else {
                        engine?.focusDistrict(entry.district, 0.92)
                      }
                    } else if (entry.id.startsWith('dist-')) {
                      const districtId = entry.id.replace('dist-', '')
                      engine?.focusDistrict(districtId as never, 0.92)
                    }
                  }}
                >
                  <span className="codex-card__category" style={{ color: entry.color }}>{entry.category}</span>
                  <strong>{known ? entry.title : '████████ █████'}</strong>
                  <small>{known ? entry.body : 'SIGNAL NOT YET FILED // VISIT OR INTERACT TO UNLOCK'}</small>
                  {known ? <span className="codex-card__dot" style={{ background: entry.color }} /> : null}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </PanelShell>
  )
}
