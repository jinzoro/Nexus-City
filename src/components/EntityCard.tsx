import { getDistrict } from '../data/city'
import { useCityStore } from '../state/useCityStore'
import { Icon } from './Icons'

const KIND_LABEL = {
  pedestrian: 'CITIZEN SIGNAL',
  vehicle: 'VEHICLE SIGNAL',
  train: 'TRANSIT SIGNAL',
} as const

export function EntityCard() {
  const entity = useCityStore((s) => s.selectedEntity)
  const following = useCityStore((s) => s.followingEntity)
  const engine = useCityStore((s) => s.engine)
  const clearEntity = useCityStore((s) => s.clearEntity)
  const setFollowingEntity = useCityStore((s) => s.setFollowingEntity)
  const toggleScanMode = useCityStore((s) => s.toggleScanMode)

  if (!entity) return null
  const district = getDistrict(entity.district)

  const toggleFollow = () => {
    const next = !following
    engine?.setFollowingEntity(next ? { kind: entity.kind, id: entity.id } : null)
    setFollowingEntity(next)
  }

  return (
    <aside className="entity-card" style={{ borderColor: `${entity.color}55` }}>
      <div className="entity-card__head">
        <span className="entity-card__kind" style={{ color: entity.color }}>
          <span className="live-dot" /> {KIND_LABEL[entity.kind]}
        </span>
        <span className="entity-card__code" style={{ color: district.color }}>{district.code}</span>
        <button className="icon-btn icon-btn--small" onClick={clearEntity} title="Release signal [Esc]">
          <Icon name="close" size={13} />
        </button>
      </div>

      <h3 className="entity-card__title">{entity.label}</h3>
      <p className="entity-card__detail">{entity.detail}</p>

      <div className="entity-card__meta">
        <span><em>DISTRICT</em>{district.name}</span>
        <span><em>ID</em>{entity.id.toUpperCase()}</span>
        <span><em>LINK</em>{following ? 'FOLLOWING' : 'LOCKED'}</span>
      </div>

      <div className="entity-card__actions">
        <button className={`action-btn ${following ? 'action-btn--active' : ''}`} onClick={toggleFollow}>
          <Icon name={following ? 'target' : 'track'} size={14} />
          <span>{following ? 'RELEASE TRACK' : 'FOLLOW SIGNAL'}</span>
        </button>
        <button className="action-btn" onClick={() => engine?.focusEntity(entity.kind, entity.id, false)}>
          <Icon name="locate" size={14} />
          <span>RE-CENTER</span>
        </button>
        <button className="action-btn" onClick={toggleScanMode}>
          <Icon name="scan" size={14} />
          <span>SCAN GRID</span>
        </button>
      </div>
      <span className="entity-card__corner" style={{ borderColor: entity.color }} />
    </aside>
  )
}
