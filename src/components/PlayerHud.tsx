import { useCityStore } from '../state/useCityStore'
import { useSocialStore } from '../social/useSocialStore'
import { socialEnabled } from '../social/client'
import { PixelCitizen } from '../social/PixelCitizen'
import { DEFAULT_CITIZEN } from '../engine/citizenSprite'
import { Icon } from './Icons'

export function PlayerHud() {
  const x = useCityStore((s) => Math.round(s.player.x))
  const y = useCityStore((s) => Math.round(s.player.y))
  const moving = useCityStore((s) => s.player.moving)
  const mode = useCityStore((s) => s.player.mode)
  const follow = useCityStore((s) => s.playerFollow)
  const locatePlayer = useCityStore((s) => s.locatePlayer)
  const togglePlayerMode = useCityStore((s) => s.togglePlayerMode)
  const playerStop = useCityStore((s) => s.playerStop)
  const profile = useSocialStore((s) => s.profile)
  const signOut = useSocialStore((s) => s.signOut)

  // A guest still walks a citizen, so they still get the controls. Only the
  // account-backed bits (log out) need a profile.
  if (!profile && socialEnabled) return null
  const look = profile ?? DEFAULT_CITIZEN

  return (
    <div className="player-hud">
      <div className="player-hud__avatar">
        <PixelCitizen profile={look} size={20} />
        <span className={`player-hud__dot ${moving ? 'player-hud__dot--moving' : ''}`} />
      </div>
      <div className="player-hud__info">
        <div className="player-hud__coords">{x} × {y}</div>
        <div className={`player-hud__mode ${follow ? 'player-hud__mode--locked' : ''}`}>
          {follow ? 'CAM LOCK' : mode.toUpperCase()}
        </div>
      </div>
      <div className="player-hud__actions">
        <button
          className={`mini-btn ${follow ? 'mini-btn--active' : ''}`}
          onClick={locatePlayer}
          title="Locate my citizen and lock the camera [L]"
          aria-pressed={follow}
        >
          <Icon name="locate" size={12} /> LOCATE
        </button>
        <button className="mini-btn" onClick={togglePlayerMode} title="Toggle mode (C)">MODE</button>
        <button className="mini-btn" onClick={playerStop} title="Stop movement" disabled={!moving}>STOP</button>
      </div>
      {profile ? (
        <button className="mini-btn player-hud__logout" onClick={() => void signOut()} title="Log out of NEXUS">
          <Icon name="logout" size={11} /> LOG OUT
        </button>
      ) : null}
    </div>
  )
}
