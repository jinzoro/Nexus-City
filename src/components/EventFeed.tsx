import { useCityStore } from '../state/useCityStore'
import { severityColor } from './ui'
import { Icon } from './Icons'

export function EventFeed() {
  const events = useCityStore((s) => s.events)
  const log = useCityStore((s) => s.eventLog)
  const setPanel = useCityStore((s) => s.setPanel)
  const latest = log[0]

  return (
    <aside className="event-feed">
      <div className="event-feed__head">
        <span className="event-feed__live">
          <span className="live-dot" /> LIVE FEED
        </span>
        <span className="event-feed__count">{events.length > 0 ? `${events.length} ACTIVE` : 'NOMINAL'}</span>
      </div>
      <div className="event-feed__body">
        {events.length === 0 ? (
          <div className="event-feed__quiet">
            <span className="event-feed__quiet-line" />
            <span>ALL SYSTEMS NOMINAL</span>
            <small>PATROL NETWORK ACTIVE</small>
          </div>
        ) : (
          events.slice(0, 2).map((event) => (
            <div key={event.id} className="event-feed__event">
              <span className="event-feed__bar" style={{ background: severityColor(event.severity) }} />
              <div className="event-feed__event-text">
                <strong style={{ color: severityColor(event.severity) }}>{event.title}</strong>
                <span>{event.message}</span>
              </div>
            </div>
          ))
        )}
      </div>
      {latest ? (
        <button className="event-feed__latest" onClick={() => setPanel('messages')}>
          <span className="event-feed__latest-time">{latest.time}</span>
          <span className="event-feed__latest-title">{latest.title}</span>
          <Icon name="chevron" size={10} />
        </button>
      ) : null}
    </aside>
  )
}
