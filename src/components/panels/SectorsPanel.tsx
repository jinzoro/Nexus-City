import type { CSSProperties } from 'react'
import { useCityStore } from '../../state/useCityStore'
import { formatNumber, Meter, SectionLabel } from '../ui'
import { Icon } from '../Icons'
import { PanelShell } from './PanelShell'

export function SectorsPanel() {
  const city = useCityStore((s) => s.city)
  const engine = useCityStore((s) => s.engine)
  const visited = useCityStore((s) => s.visitedDistricts)
  const setPanel = useCityStore((s) => s.setPanel)

  if (!city) return null

  return (
    <PanelShell
      title="SECTORS"
      subtitle="NINE DISTRICTS // ONE MACHINE"
      icon="sectors"
      wide
      footer={
        <>
          <span>DISTRICTS {visited.length}/{city.districts.length} SURVEYED</span>
          <span className="panel-footer__sep">//</span>
          <span>POPULATION {formatNumber(city.districts.reduce((sum, d) => sum + d.population, 0))}</span>
        </>
      }
    >
      <SectionLabel>DISTRICT REGISTRY</SectionLabel>
      <div className="sector-grid">
        {city.districts.map((d) => {
          const surveyed = visited.includes(d.id)
          return (
            <article key={d.id} className="sector-card" style={{ '--sector-color': d.color, '--sector-accent': d.accent } as CSSProperties}>
              <div className="sector-card__top">
                <span className="sector-card__code">{d.code}</span>
                <span className="sector-card__survey">{surveyed ? 'SURVEYED' : 'UNCHARTED'}</span>
              </div>
              <h3>{d.name}</h3>
              <p className="sector-card__tagline">{d.tagline}</p>
              <p className="sector-card__desc">{d.description}</p>
              <div className="sector-card__stats">
                <Meter label="POWER" value={d.power} color="#ffd45c" compact />
                <Meter label="NETWORK" value={d.network} color="#22e6ff" compact />
                <Meter label="STABILITY" value={d.stability} color="#63ff9b" compact />
              </div>
              <div className="sector-card__meta">
                <span>
                  <Icon name="people" size={11} /> {formatNumber(d.population)}
                </span>
                <span>{d.atmosphere}</span>
              </div>
              <div className="sector-card__actions">
                <button className="mini-btn" onClick={() => engine?.focusDistrict(d.id, 0.95)}>
                  <Icon name="locate" size={12} /> FOCUS
                </button>
                <button className="mini-btn" onClick={() => setPanel('transit')}>
                  <Icon name="transit" size={12} /> LINES
                </button>
              </div>
              <span className="sector-card__accent" />
            </article>
          )
        })}
      </div>
    </PanelShell>
  )
}
