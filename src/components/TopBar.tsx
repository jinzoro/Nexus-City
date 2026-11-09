import { getDistrict } from '../data/city'
import { useCityStore } from '../state/useCityStore'
import { useSocialStore } from '../social/useSocialStore'
import { formatNumber, PulseDot } from './ui'
import { Icon } from './Icons'

function Stat({
  icon,
  label,
  value,
  color,
  compact,
}: {
  icon: 'people' | 'power' | 'network' | 'stability'
  label: string
  value: string
  color: string
  compact?: boolean
}) {
  return (
    <div className={`stat-chip ${compact ? 'stat-chip--compact' : ''}`}>
      <Icon name={icon} size={13} style={{ color }} />
      <span className="stat-chip__label">{label}</span>
      <span className="stat-chip__value" style={{ color }}>
        {value}
      </span>
    </div>
  )
}

export function TopBar() {
  const camera = useCityStore((s) => s.camera)
  const stats = useCityStore((s) => s.stats)
  const clock = useCityStore((s) => s.clock)
  const weather = useCityStore((s) => s.weather)
  const audioEnabled = useCityStore((s) => s.audioEnabled)
  const toggleAudio = useCityStore((s) => s.toggleAudio)
  const setSearchOpen = useCityStore((s) => s.setSearchOpen)
  const overlay = useCityStore((s) => s.overlay)
  const setPanel = useCityStore((s) => s.setPanel)
  const { profile, status } = useSocialStore()
  const signOut = useSocialStore((s) => s.signOut)
  const setOverlay = useCityStore((s) => s.setOverlay)
  const photoMode = useCityStore((s) => s.photoMode)
  const scanMode = useCityStore((s) => s.scanMode)
  const togglePhotoMode = useCityStore((s) => s.togglePhotoMode)
  const toggleScanMode = useCityStore((s) => s.toggleScanMode)
  const district = getDistrict(camera.district)

  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="brand">
          <div className="brand__mark" style={{ color: district.color }}>
            <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true">
              <path d="M20 2 37 11v18L20 38 3 29V11Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M20 7 32 14v12L20 33 8 26V14Z" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="1" />
              <path d="M13 27V13l14 14V13" fill="none" stroke="currentColor" strokeWidth="2.2" />
              <path d="M20 2v5M37 11l-5 3M37 29l-5-3M20 38v-5M3 29l5-3M3 11l5 3" stroke="#ff3dd8" strokeWidth="1" />
            </svg>
          </div>
          <div className="brand__text">
            <div className="brand__title">
              NEXUS<span className="brand__slash">//</span>
            </div>
            <div className="brand__sub">
              UNDERGROUND MEGAPOLIS <span>·</span> CAVERN 07
            </div>
          </div>
        </div>
        <div className="top-stats">
          <Stat icon="people" label="POP" value={formatNumber(stats.population)} color="#8ff8ff" />
          <Stat icon="power" label="GRID" value={`${stats.power.toFixed(1)}%`} color="#ffd45c" />
          <Stat icon="network" label="NET" value={`${stats.network.toFixed(1)}%`} color="#22e6ff" />
          <Stat icon="stability" label="STAB" value={`${stats.stability.toFixed(1)}%`} color="#63ff9b" compact />
        </div>
      </div>

      <div className="topbar__right">
        {overlay !== 'none' ? (
          <button className="overlay-chip" onClick={() => setOverlay('none')} title="Clear city layer">
            <span className="overlay-chip__dot" />
            {overlay.toUpperCase()} LAYER
            <Icon name="close" size={11} />
          </button>
        ) : null}
        <div className="sector-hud">
          <div className="sector-hud__head">
            <PulseDot color={district.color} label={`SECTOR ${district.code}`} />
            <span className="sector-hud__level">{camera.level}</span>
          </div>
          <div className="sector-hud__name" style={{ color: district.color }}>
            {district.name}
          </div>
          <div className="sector-hud__meta">
            <span>
              <Icon name="clock" size={11} /> {clock}
            </span>
            <span>
              <Icon name="weather" size={11} /> {weather.label}
            </span>
            <span className="sector-hud__temp">{Math.round(stats.temperature)}°C</span>
          </div>
        </div>
        <div className="topbar__actions">
          {status === 'online' && profile ? (
            <button className="icon-btn" onClick={() => setPanel('settings')} title="Settings" aria-label="Settings">
              <Icon name="settings" size={17} />
            </button>
          ) : null}
          <button
            className="icon-btn"
            onClick={() => setSearchOpen(true)}
            title="Search city (Ctrl+K)"
            aria-label="Search city"
          >
            <Icon name="search" size={17} />
          </button>
          <button
            className={`icon-btn ${scanMode ? 'icon-btn--active' : ''}`}
            onClick={toggleScanMode}
            title="Structural scan (V)"
            aria-label="Toggle structural scan"
            aria-pressed={scanMode}
          >
            <Icon name="scan" size={17} />
          </button>
          <button
            className={`icon-btn ${photoMode ? 'icon-btn--active' : ''}`}
            onClick={togglePhotoMode}
            title="Photo mode (F)"
            aria-label="Toggle photo mode"
            aria-pressed={photoMode}
          >
            <Icon name="target" size={17} />
          </button>
          <button
            className={`icon-btn ${audioEnabled ? 'icon-btn--active' : ''}`}
            onClick={() => void toggleAudio()}
            title={audioEnabled ? 'Mute ambient feed' : 'Enable ambient feed'}
            aria-label={audioEnabled ? 'Mute ambient feed' : 'Enable ambient feed'}
            aria-pressed={audioEnabled}
          >
            <Icon name={audioEnabled ? 'audio' : 'audio-off'} size={17} />
          </button>
          {status === 'online' && profile ? (
            <button className="icon-btn" onClick={() => void signOut()} title="Log out of NEXUS" aria-label="Log out">
              <Icon name="logout" size={17} />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
