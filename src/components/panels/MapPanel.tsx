import { getDistrict } from '../../data/city'
import { useCityStore } from '../../state/useCityStore'
import { Minimap } from '../Minimap'
import { formatNumber, SectionLabel } from '../ui'
import { Icon } from '../Icons'
import { PanelShell } from './PanelShell'

const LAYERS = [
  { id: 'none', label: 'CLEAR', color: '#8ff8ff' },
  { id: 'transit', label: 'TRANSIT', color: '#ffb347' },
  { id: 'power', label: 'POWER', color: '#ffd45c' },
  { id: 'network', label: 'NETWORK', color: '#22e6ff' },
  { id: 'atmosphere', label: 'ATMOSPHERE', color: '#63ff9b' },
] as const

export function MapPanel() {
  const city = useCityStore((s) => s.city)
  const engine = useCityStore((s) => s.engine)
  const camera = useCityStore((s) => s.camera)
  const overlay = useCityStore((s) => s.overlay)
  const setOverlay = useCityStore((s) => s.setOverlay)
  const stats = useCityStore((s) => s.stats)
  const bookmarks = useCityStore((s) => s.bookmarks)
  const removeBookmark = useCityStore((s) => s.removeBookmark)
  const district = getDistrict(camera.district)

  if (!city) return null

  return (
    <PanelShell
      title="CITY MAP"
      subtitle="NEXUS UNDERGROUND // CARTOGRAPHY LAYER"
      icon="map"
      wide
      footer={
        <>
          <span>GRID {city.size}×{city.size}</span>
          <span className="panel-footer__sep">//</span>
          <span>CAMERA {Math.round(camera.cellX)}:{Math.round(camera.cellY)}</span>
          <span className="panel-footer__sep">//</span>
          <span>ZOOM {Math.round(camera.zoom * 100)}%</span>
          <span className="panel-footer__sep">//</span>
          <span style={{ color: district.color }}>{district.name}</span>
          <button className="panel-footer__action" onClick={() => engine?.overview()}>
            <Icon name="overview" size={12} /> OVERVIEW
          </button>
        </>
      }
    >
      <div className="map-panel">
        <div className="map-panel__map">
          <Minimap size={360} detailed />
          <div className="map-panel__frame" aria-hidden="true">
            <span>N</span>
            <span>CAVERN 07</span>
          </div>
          <div className="map-panel__coords">
            <span>SECTOR {district.code}</span>
            <span>{Math.round(camera.cellX)} / {Math.round(camera.cellY)}</span>
          </div>
        </div>

        <div className="map-panel__side">
          <div className="map-panel__vitals">
            <div>
              <span>POPULATION</span>
              <strong>{formatNumber(stats.population)}</strong>
            </div>
            <div>
              <span>POWER</span>
              <strong>{stats.power.toFixed(1)}%</strong>
            </div>
            <div>
              <span>NETWORK</span>
              <strong>{stats.network.toFixed(1)}%</strong>
            </div>
            <div>
              <span>STABILITY</span>
              <strong>{stats.stability.toFixed(1)}%</strong>
            </div>
          </div>

          <SectionLabel>DISTRICT INDEX</SectionLabel>
          <div className="district-index">
            {city.districts.map((d) => (
              <button key={d.id} className="district-index__row" onClick={() => engine?.focusDistrict(d.id, 0.92)}>
                <span className="district-index__swatch" style={{ background: d.color, boxShadow: `0 0 6px ${d.color}` }} />
                <span className="district-index__code">{d.code}</span>
                <span className="district-index__name">{d.name}</span>
                <span className="district-index__pop">{formatNumber(d.population)}</span>
                <Icon name="locate" size={11} />
              </button>
            ))}
          </div>

          <SectionLabel>CITY LAYERS</SectionLabel>
          <div className="layer-grid">
            {LAYERS.map((layer) => (
              <button
                key={layer.id}
                className={`layer-btn ${overlay === layer.id ? 'layer-btn--active' : ''}`}
                onClick={() => setOverlay(layer.id)}
                style={overlay === layer.id ? { borderColor: layer.color, color: layer.color } : undefined}
              >
                <span className="layer-btn__dot" style={{ background: layer.color }} />
                {layer.label}
              </button>
            ))}
          </div>

          <div className="map-legend">
            <span><i className="legend-dot" style={{ background: '#22e6ff' }} /> MAGLEV / DATA</span>
            <span><i className="legend-dot" style={{ background: '#ff4fa3' }} /> TRAFFIC / SIGNAL</span>
            <span><i className="legend-dot" style={{ background: '#ffb347' }} /> METRO / INDUSTRY</span>
            <span><i className="legend-dot" style={{ background: '#63ff9b' }} /> BIO / PARKS</span>
          </div>

          <SectionLabel action={<span className="codex-count">{bookmarks.length} PINNED</span>}>SAVED VANTAGES</SectionLabel>
          <div className="vantage-list">
            {bookmarks.length === 0 ? (
              <div className="vantage-empty">NO SAVED VANTAGES // PRESS F TO CAPTURE ONE</div>
            ) : (
              bookmarks.map((bookmark) => {
                const bookmarkDistrict = getDistrict(bookmark.district)
                return (
                  <div key={bookmark.id} className="vantage-row">
                    <button className="vantage-row__go" onClick={() => engine?.focusCell(bookmark.x, bookmark.y, bookmark.zoom)}>
                      <span className="vantage-row__swatch" style={{ background: bookmarkDistrict.color }} />
                      <span className="vantage-row__name">{bookmark.name}</span>
                      <span className="vantage-row__meta">{Math.round(bookmark.zoom * 100)}%</span>
                    </button>
                    <button className="vantage-row__remove" onClick={() => removeBookmark(bookmark.id)} title="Remove vantage">
                      <Icon name="close" size={10} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </PanelShell>
  )
}
