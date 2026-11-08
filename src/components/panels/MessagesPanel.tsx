import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { CityEvent, DistrictId, FactionId } from '../../types'
import { getDistrict } from '../../data/city'
import { useCityStore } from '../../state/useCityStore'
import { severityColor, SectionLabel } from '../ui'
import { Icon } from '../Icons'
import { PanelShell } from './PanelShell'
import { DirectsSection } from '../DirectsSection'

const DISPATCHES: Array<{
  faction: FactionId
  code: string
  label: string
  message: string
  rep: number
  color: string
}> = [
  {
    faction: 'civic',
    code: 'CIV',
    label: 'REQUEST GRID PRIORITY',
    message: 'Civic Synod: request priority routing for the lower transit corridor. Maintenance backlog exceeds tolerance.',
    rep: 2,
    color: '#22e6ff',
  },
  {
    faction: 'kuro',
    code: 'KUR',
    label: 'OPEN MARKET BACKCHANNEL',
    message: 'Kuro Family: asking after the late noodle stalls. Looking for a quiet supply route past the checkpoint.',
    rep: 3,
    color: '#ff4fa3',
  },
  {
    faction: 'guild',
    code: 'GLD',
    label: 'REPORT STRUCTURAL STRAIN',
    message: 'Foundry Guild: west stack 14 is shedding facade panels. Requesting a crew before the next drizzle cycle.',
    rep: 2,
    color: '#ffb347',
  },
  {
    faction: 'verdant',
    code: 'VRD',
    label: 'FLAG AIR QUALITY',
    message: 'Verdant Conservancy: particulate readings in the outer ring are above the sealed-cavern limit. Requesting a vent audit.',
    rep: 2,
    color: '#63ff9b',
  },
]

/** Player-triggerable civic actions with visible city effects. */
const CIVIC_ACTIONS: Array<{
  type: CityEvent['type']
  label: string
  detail: string
  color: string
  districtPick: boolean
}> = [
  {
    type: 'power',
    label: 'DISTRICT BLACKOUT',
    detail: 'Pull the grid breakers under the camera sector. Emergency cells take over.',
    color: '#ffd45c',
    districtPick: true,
  },
  {
    type: 'festival',
    label: 'NEON FESTIVAL',
    detail: 'Throw a holo-parade. Sky lanterns, banners and crowd surge.',
    color: '#ff4fa3',
    districtPick: true,
  },
  {
    type: 'rain',
    label: 'CONDENSER TEST',
    detail: 'Open the ceiling vents. Acid drizzle and wet reflections.',
    color: '#8ff8ff',
    districtPick: true,
  },
  {
    type: 'transit',
    label: 'TRANSIT HOLD',
    detail: 'Hold the maglev spine at the next platform. Rush-hour cascade.',
    color: '#ffb347',
    districtPick: true,
  },
  {
    type: 'network',
    label: 'MESH STRESS',
    detail: 'Flood the civic mesh with packet noise. Latency warning.',
    color: '#22e6ff',
    districtPick: true,
  },
  {
    type: 'weather',
    label: 'HAZE VENT',
    detail: 'Cycle the outer-ring filters. Visibility drops.',
    color: '#63ff9b',
    districtPick: false,
  },
]

export function MessagesPanel() {
  const log = useCityStore((s) => s.eventLog)
  const events = useCityStore((s) => s.events)
  const transmit = useCityStore((s) => s.transmit)
  const adjustRep = useCityStore((s) => s.adjustRep)
  const factionRep = useCityStore((s) => s.factionRep)
  const pushToast = useCityStore((s) => s.pushToast)
  const districtNow = useCityStore((s) => s.camera.district)
  const [message, setMessage] = useState('')
  const [confirming, setConfirming] = useState<CityEvent['type'] | null>(null)

  const send = () => {
    transmit(message)
    setMessage('')
  }

  const runAction = (action: (typeof CIVIC_ACTIONS)[number]) => {
    const district: DistrictId = action.districtPick ? districtNow : 'central'
    useCityStore.getState().triggerEvent(action.type, district)
    setConfirming(null)
  }

  return (
    <PanelShell
      title="MESSAGES"
      subtitle="CIVIC RELAY // PRIORITY CHANNEL"
      icon="messages"
      wide
      footer={
        <>
          <span>PACKETS {log.length}</span>
          <span className="panel-footer__sep">//</span>
          <span>ACTIVE EVENTS {events.length}</span>
          <span className="panel-footer__sep">//</span>
          <span>ENCRYPTION AES-4096</span>
        </>
      }
    >
      <div className="messages-layout">
        <div className="messages-list">
          <SectionLabel>INCOMING FEED</SectionLabel>
          {log.map((entry) => {
            const district = entry.district ? getDistrict(entry.district) : null
            return (
              <article key={entry.id} className="message-row">
                <div className="message-row__rail" style={{ background: severityColor(entry.severity) }} />
                <div className="message-row__body">
                  <div className="message-row__head">
                    <span className="message-row__time">{entry.time}</span>
                    <strong style={{ color: severityColor(entry.severity) }}>{entry.title}</strong>
                    {district ? <span className="message-row__district" style={{ color: district.color }}>{district.code}</span> : null}
                  </div>
                  <p>{entry.message}</p>
                </div>
              </article>
            )
          })}
        </div>

        <div className="messages-side">
          <SectionLabel>TRANSMIT</SectionLabel>
          <div className="compose">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 280))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="TYPE A MESSAGE TO THE CIVIC RELAY..."
              rows={5}
            />
            <div className="compose__footer">
              <span>{message.length}/280</span>
              <button className="mini-btn mini-btn--primary" onClick={send} disabled={!message.trim()}>
                <Icon name="send" size={12} /> SEND
              </button>
            </div>
          </div>

          <SectionLabel>CIVIC ACTIONS</SectionLabel>
          <div className="civic-actions">
            {CIVIC_ACTIONS.map((action) => {
              const armed = confirming === action.type
              return (
                <button
                  key={action.type}
                  className={`civic-action ${armed ? 'civic-action--armed' : ''}`}
                  style={{ '--dispatch-color': action.color } as CSSProperties}
                  onMouseLeave={() => setConfirming((c) => (c === action.type ? null : c))}
                  onClick={() => {
                    if (armed) {
                      runAction(action)
                      return
                    }
                    setConfirming(action.type)
                  }}
                >
                  <span className="civic-action__dot" style={{ background: action.color, boxShadow: `0 0 8px ${action.color}66` }} />
                  <span className="civic-action__text">
                    <strong>{action.label}</strong>
                    <small>{action.districtPick ? `TARGET ${getDistrict(districtNow).name.toUpperCase()}` : 'CITY-WIDE'}</small>
                  </span>
                  <em>{armed ? 'CONFIRM?' : 'PUSH'}</em>
                </button>
              )
            })}
          </div>
          <p className="civic-actions__note">
            Direct civic action. Effects are visible on the skyline and the wire — and the factions will notice who pushed the button.
          </p>

          <DirectsSection />

          <SectionLabel>FACTION CHANNELS</SectionLabel>
          <div className="dispatch-grid">
            {DISPATCHES.map((dispatch) => (
              <button
                key={dispatch.faction}
                className="dispatch-btn"
                style={{ '--dispatch-color': dispatch.color } as CSSProperties}
                onClick={() => {
                  transmit(dispatch.message)
                  adjustRep(dispatch.faction, dispatch.rep)
                  pushToast({
                    title: 'CHANNEL ACKNOWLEDGED',
                    message: `${dispatch.code} standing +${dispatch.rep}. The message is in the relay log.`,
                    severity: 'info',
                  })
                }}
              >
                <span className="dispatch-btn__code">{dispatch.code}</span>
                <span className="dispatch-btn__label">
                  <strong>{dispatch.label}</strong>
                  <small>Send via the civic relay</small>
                </span>
                <span className="dispatch-btn__rep">{Math.round(factionRep[dispatch.faction] ?? 50)} →</span>
              </button>
            ))}
          </div>

          <SectionLabel>ACTIVE ALERTS</SectionLabel>
          <div className="alert-list">
            {events.length === 0 ? (
              <div className="alert-list__quiet">NO ACTIVE ALERTS</div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="alert-row">
                  <span className="alert-row__dot" style={{ background: severityColor(event.severity), boxShadow: `0 0 7px ${severityColor(event.severity)}` }} />
                  <div>
                    <strong style={{ color: severityColor(event.severity) }}>{event.title}</strong>
                    <small>{event.message}</small>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="messages-note">
            <Icon name="info" size={14} />
            <span>Messages are mirrored to every civic terminal within 400ms. Do not transmit personal access codes.</span>
          </div>
        </div>
      </div>
    </PanelShell>
  )
}
