import { getDistrict } from '../data/city'
import { useCityStore } from '../state/useCityStore'
import { formatNumber, statusColor } from './ui'
import { Icon } from './Icons'

export function HoverTooltip() {
  const hoveredId = useCityStore((s) => s.hoveredId)
  const hoverX = useCityStore((s) => s.hoverX)
  const hoverY = useCityStore((s) => s.hoverY)
  const getBuilding = useCityStore((s) => s.getBuilding)
  const activePanel = useCityStore((s) => s.activePanel)
  const facilityOpen = useCityStore((s) => s.facilityOpen)
  const searchOpen = useCityStore((s) => s.searchOpen)
  const selectedId = useCityStore((s) => s.selectedId)
  const building = getBuilding(hoveredId)

  if (!building || selectedId || activePanel || facilityOpen || searchOpen) return null

  const district = getDistrict(building.district)
  const width = 278
  const left = Math.min(Math.max(12, hoverX + 18), window.innerWidth - width - 12)
  const top = Math.min(Math.max(12, hoverY + 18), window.innerHeight - 158)
  const color = statusColor(building.status)

  return (
    <div className="hover-card" style={{ left, top, width }}>
      <div className="hover-card__accent" style={{ background: district.color }} />
      <div className="hover-card__head">
        <span className="hover-card__code" style={{ color: district.color }}>
          {district.code}
        </span>
        <span className="hover-card__type">{building.type}</span>
        {building.landmark ? <span className="hover-card__landmark">LANDMARK</span> : null}
      </div>
      <div className="hover-card__name">{building.name}</div>
      <div className="hover-card__meta">
        <span>
          <Icon name="sectors" size={10} /> {building.floors} FL
        </span>
        <span>{building.h}M</span>
        <span>{formatNumber(building.occupants)} OCC</span>
        <span style={{ color }}>
          <span className="status-dot" style={{ background: color }} />
          {building.status}
        </span>
      </div>
      <div className="hover-card__hint">
        <span>CLICK TO ACCESS</span>
        <span className="hover-card__hint-key">DBL-CLICK TO FOCUS</span>
      </div>
    </div>
  )
}
