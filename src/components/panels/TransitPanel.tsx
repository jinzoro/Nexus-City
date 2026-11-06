import { useEffect, useState } from 'react'
import { useCityStore } from '../../state/useCityStore'
import { formatPercent, SectionLabel } from '../ui'
import { Icon } from '../Icons'
import { PanelShell } from './PanelShell'

export function TransitPanel() {
  const city = useCityStore((s) => s.city)
  const engine = useCityStore((s) => s.engine)
  const events = useCityStore((s) => s.events)
  const overlay = useCityStore((s) => s.overlay)
  const setOverlay = useCityStore((s) => s.setOverlay)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  if (!city) return null
  const delayed = events.some((e) => e.type === 'transit')
  const trainsByLine = new Map<string, typeof city.trains>()
  for (const train of city.trains) {
    const list = trainsByLine.get(train.lineId) ?? []
    list.push(train)
    trainsByLine.set(train.lineId, list)
  }

  return (
    <PanelShell
      title="TRANSIT"
      subtitle="MAGLEV SPINE // METRO GRID // SURFACE LINKS"
      icon="transit"
      wide
      footer={
        <>
          <span>LINES {city.rails.length}</span>
          <span className="panel-footer__sep">//</span>
          <span>TRAINS {city.trains.length}</span>
          <span className="panel-footer__sep">//</span>
          <span style={{ color: delayed ? '#ffb347' : '#63ff9b' }}>{delayed ? 'DELAYS DETECTED' : 'ALL LINES NOMINAL'}</span>
          <button className="panel-footer__action" onClick={() => setOverlay(overlay === 'transit' ? 'none' : 'transit')}>
            <Icon name="grid" size={12} /> {overlay === 'transit' ? 'CLEAR LAYER' : 'SHOW LAYER'}
          </button>
        </>
      }
    >
      <div className="transit-summary">
        <div className="transit-summary__block">
          <span>NETWORK LOAD</span>
          <strong>82.4%</strong>
          <div className="transit-summary__bar"><i style={{ width: '82.4%' }} /></div>
        </div>
        <div className="transit-summary__block">
          <span>ON-TIME RATE</span>
          <strong style={{ color: delayed ? '#ffb347' : '#63ff9b' }}>{delayed ? '71.2%' : '97.8%'}</strong>
          <div className="transit-summary__bar"><i style={{ width: delayed ? '71.2%' : '97.8%', background: delayed ? '#ffb347' : '#63ff9b' }} /></div>
        </div>
        <div className="transit-summary__block">
          <span>ACTIVE CARS</span>
          <strong>{city.trains.reduce((sum, t) => sum + t.cars, 0)}</strong>
          <div className="transit-summary__bar"><i style={{ width: '64%' }} /></div>
        </div>
        <div className="transit-summary__block">
          <span>STATIONS</span>
          <strong>148</strong>
          <div className="transit-summary__bar"><i style={{ width: '88%' }} /></div>
        </div>
      </div>

      <SectionLabel>ACTIVE LINES</SectionLabel>
      <div className="line-list">
        {city.rails.map((rail) => {
          const trains = trainsByLine.get(rail.id) ?? []
          const mid = rail.axis === 'x' ? (rail.from + rail.to) / 2 : rail.coord
          const midY = rail.axis === 'x' ? rail.coord : (rail.from + rail.to) / 2
          return (
            <div key={rail.id} className="line-row">
              <div className="line-row__id" style={{ borderColor: `${rail.color}66` }}>
                <span style={{ background: rail.color, boxShadow: `0 0 8px ${rail.color}` }} />
                <strong>{rail.name.split(' / ')[0]}</strong>
                <small>{rail.kind.toUpperCase()}</small>
              </div>
              <div className="line-row__track">
                <div className="line-row__rail" style={{ background: `linear-gradient(90deg, ${rail.color}22, ${rail.color}66, ${rail.color}22)` }}>
                  {trains.map((train) => {
                    const progress = Math.max(0, Math.min(1, (train.pos - rail.from) / (rail.to - rail.from)))
                    return (
                      <span
                        key={train.id}
                        className="line-row__train"
                        style={{
                          left: `${progress * 100}%`,
                          background: rail.color,
                          boxShadow: `0 0 7px ${rail.color}`,
                          opacity: delayed && train.id.endsWith('0') ? 0.35 : 1,
                        }}
                      />
                    )
                  })}
                </div>
                <div className="line-row__labels">
                  <span>{rail.from}</span>
                  <span>{formatPercent(78 + Math.sin(tick * 0.4 + rail.from) * 12)} LOAD</span>
                  <span>{rail.to}</span>
                </div>
              </div>
              <div className="line-row__status">
                <span className="line-row__state" style={{ color: delayed ? '#ffb347' : '#63ff9b' }}>
                  {delayed ? 'HOLD' : 'LIVE'}
                </span>
                <button
                  className="mini-btn"
                  onClick={() => engine?.focusCell(mid, midY, 0.72)}
                  title="Focus line"
                >
                  <Icon name="locate" size={11} /> FOCUS
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </PanelShell>
  )
}
