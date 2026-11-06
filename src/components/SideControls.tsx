import { useCityStore } from '../state/useCityStore'
import { Icon } from './Icons'

const OVERLAYS = ['none', 'transit', 'power', 'network', 'atmosphere'] as const

export function SideControls() {
  const engine = useCityStore((s) => s.engine)
  const camera = useCityStore((s) => s.camera)
  const overlay = useCityStore((s) => s.overlay)
  const setOverlay = useCityStore((s) => s.setOverlay)
  const setSearchOpen = useCityStore((s) => s.setSearchOpen)
  const photoMode = useCityStore((s) => s.photoMode)
  const scanMode = useCityStore((s) => s.scanMode)
  const togglePhotoMode = useCityStore((s) => s.togglePhotoMode)
  const toggleScanMode = useCityStore((s) => s.toggleScanMode)
  const setHelpOpen = useCityStore((s) => s.setHelpOpen)
  const helpOpen = useCityStore((s) => s.helpOpen)

  const cycleOverlay = () => {
    const index = OVERLAYS.indexOf(overlay)
    setOverlay(OVERLAYS[(index + 1) % OVERLAYS.length])
  }

  return (
    <div className="side-controls">
      <div className="side-controls__group">
        <button className="side-btn" onClick={() => engine?.zoomBy(1.35)} title="Zoom in" aria-label="Zoom in">
          <Icon name="plus" size={17} />
        </button>
        <button className="side-btn" onClick={() => engine?.zoomBy(1 / 1.35)} title="Zoom out" aria-label="Zoom out">
          <Icon name="minus" size={17} />
        </button>
      </div>
      <div className="side-controls__group">
        <button className="side-btn" onClick={() => engine?.resetView()} title="Reset view [0]" aria-label="Reset view">
          <Icon name="reset" size={16} />
        </button>
        <button className="side-btn" onClick={() => engine?.overview()} title="City overview [O]" aria-label="City overview">
          <Icon name="overview" size={16} />
        </button>
        <button
          className={`side-btn ${overlay !== 'none' ? 'side-btn--active' : ''}`}
          onClick={cycleOverlay}
          title="Cycle city layer"
          aria-label={`Cycle city layer (current: ${overlay})`}
        >
          <Icon name="grid" size={16} />
        </button>
      </div>
      <div className="side-controls__group">
        <button className="side-btn" onClick={() => setSearchOpen(true)} title="Search [Ctrl+K]" aria-label="Open city search">
          <Icon name="search" size={16} />
        </button>
        <button
          className={`side-btn ${scanMode ? 'side-btn--active' : ''}`}
          onClick={toggleScanMode}
          title="Structural scan [V]"
          aria-label="Toggle structural scan"
          aria-pressed={scanMode}
        >
          <Icon name="scan" size={16} />
        </button>
        <button
          className={`side-btn ${photoMode ? 'side-btn--active' : ''}`}
          onClick={togglePhotoMode}
          title="Photo mode [F]"
          aria-label="Toggle photo mode"
          aria-pressed={photoMode}
        >
          <Icon name="target" size={16} />
        </button>
        <button
          className={`side-btn ${helpOpen ? 'side-btn--active' : ''}`}
          onClick={() => setHelpOpen(!helpOpen)}
          title="Orientation [?]"
          aria-label="Open orientation"
        >
          <Icon name="info" size={16} />
        </button>
      </div>
      <div className="side-controls__zoom">
        <span>{Math.round(camera.zoom * 100)}</span>
        <small>ZOOM</small>
      </div>
    </div>
  )
}
