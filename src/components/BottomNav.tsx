import { useCityStore, type PanelId } from '../state/useCityStore'
import { Icon, type IconName } from './Icons'

const ITEMS: Array<{ id: Exclude<PanelId, null>; label: string; icon: IconName; key: string }> = [
  { id: 'map', label: 'MAP', icon: 'map', key: 'M' },
  { id: 'sectors', label: 'SECTORS', icon: 'sectors', key: 'S' },
  { id: 'transit', label: 'TRANSIT', icon: 'transit', key: 'T' },
  { id: 'systems', label: 'SYSTEMS', icon: 'systems', key: 'Y' },
  { id: 'messages', label: 'MESSAGES', icon: 'messages', key: 'N' },
  { id: 'profile', label: 'PROFILE', icon: 'profile', key: 'P' },
]

export function BottomNav() {
  const activePanel = useCityStore((s) => s.activePanel)
  const togglePanel = useCityStore((s) => s.togglePanel)
  const events = useCityStore((s) => s.events)

  return (
    <nav className="bottom-nav" aria-label="City navigation">
      <div className="bottom-nav__edge" aria-hidden="true" />
      {ITEMS.map((item) => {
        const active = activePanel === item.id
        return (
          <button
            key={item.id}
            className={`nav-btn ${active ? 'nav-btn--active' : ''}`}
            onClick={() => togglePanel(item.id)}
            title={`${item.label} [${item.key}]`}
          >
            <span className="nav-btn__icon">
              <Icon name={item.icon} size={19} />
              {item.id === 'messages' && events.length > 0 ? <span className="nav-btn__badge">{events.length}</span> : null}
            </span>
            <span className="nav-btn__label">{item.label}</span>
            <span className="nav-btn__key">{item.key}</span>
          </button>
        )
      })}
      <div className="bottom-nav__edge bottom-nav__edge--right" aria-hidden="true" />
    </nav>
  )
}
