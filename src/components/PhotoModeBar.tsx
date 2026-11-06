import { getDistrict, TILE_H, TILE_W } from '../data/city'
import { useCityStore } from '../state/useCityStore'
import { Icon } from './Icons'

function cameraCell(x: number, y: number) {
  return {
    x: x / TILE_W + y / TILE_H,
    y: y / TILE_H - x / TILE_W,
  }
}

export function PhotoModeBar() {
  const photoMode = useCityStore((s) => s.photoMode)
  const scanMode = useCityStore((s) => s.scanMode)
  const camera = useCityStore((s) => s.camera)
  const engine = useCityStore((s) => s.engine)
  const setPhotoMode = useCityStore((s) => s.setPhotoMode)
  const toggleScanMode = useCityStore((s) => s.toggleScanMode)
  const addBookmark = useCityStore((s) => s.addBookmark)
  const pushToast = useCityStore((s) => s.pushToast)
  const district = getDistrict(camera.district)

  if (!photoMode) return null
  const cell = cameraCell(camera.x, camera.y)

  const saveVantage = () => {
    addBookmark({
      name: `${district.code} / ${Math.round(cell.x)}:${Math.round(cell.y)}`,
      x: cell.x,
      y: cell.y,
      zoom: camera.zoom,
      district: camera.district,
    })
  }

  const copyLink = async () => {
    const url = new URL(window.location.href)
    url.hash = `cell=${cell.x.toFixed(1)},${cell.y.toFixed(1)},${camera.zoom.toFixed(3)}`
    window.history.replaceState(null, '', url.toString())
    try {
      await navigator.clipboard.writeText(url.toString())
      pushToast({ title: 'LINK COPIED', message: 'Vantage point encoded in the address bar.', severity: 'info' })
    } catch {
      pushToast({ title: 'LINK READY', message: 'Copy it from the address bar — clipboard access was denied.', severity: 'warning' })
    }
  }

  const exportPng = () => {
    const data = engine?.captureFrame()
    if (!data) return
    const link = document.createElement('a')
    link.href = data
    link.download = `nexus-${Date.now().toString(36)}.png`
    link.click()
    pushToast({ title: 'FRAME EXPORTED', message: 'The current city frame has been written to disk.', severity: 'info' })
  }

  return (
    <div className="photo-bar">
      <div className="photo-bar__brand">
        <span className="live-dot" />
        <span>PHOTO MODE</span>
        <small>{district.name} // {Math.round(camera.zoom * 100)}%</small>
      </div>
      <div className="photo-bar__actions">
        <button className={`photo-btn ${scanMode ? 'photo-btn--on' : ''}`} onClick={toggleScanMode}>
          <Icon name="scan" size={14} /> SCAN
        </button>
        <button className="photo-btn" onClick={saveVantage}>
          <Icon name="track" size={14} /> SAVE VANTAGE
        </button>
        <button className="photo-btn" onClick={() => void copyLink()}>
          <Icon name="network" size={14} /> COPY LINK
        </button>
        <button className="photo-btn photo-btn--primary" onClick={exportPng}>
          <Icon name="enter" size={14} /> EXPORT PNG
        </button>
        <button className="photo-btn" onClick={() => setPhotoMode(false)}>
          <Icon name="close" size={14} /> EXIT
        </button>
      </div>
      <span className="photo-bar__hint">ESC TO RETURN // HUD HIDDEN WHILE CAPTURING</span>
    </div>
  )
}
