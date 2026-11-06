import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { FactionId } from '../../types'
import { getDistrict } from '../../data/city'
import { useCityStore } from '../../state/useCityStore'
import { severityColor, SectionLabel } from '../ui'
import { Icon } from '../Icons'
import { PanelShell } from './PanelShell'

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

export function MessagesPanel() {
  const log = useCityStore((s) => s.eventLog)
  const events = useCityStore((s) => s.events)
  const transmit = useCityStore((s) => s.transmit)
  const adjustRep = useCityStore((s) => s.adjustRep)
  const factionRep = useCityStore((s) => s.factionRep)
  const pushToast = useCityStore((s) => s.pushToast)
  const [message, setMessage] = useState('')

  const send = () => {
    transmit(message)
    setMessage('')
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
