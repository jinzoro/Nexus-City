import { useCityStore } from '../state/useCityStore'
import { useSocialStore } from '../social/useSocialStore'
import { PixelCitizen } from '../social/PixelCitizen'
import { Icon } from './Icons'

export function PlayerHud() {
  const x = useCityStore((s) => Math.round(s.player.x))
  const y = useCityStore((s) => Math.round(s.player.y))
  const moving = useCityStore((s) => s.player.moving)
  const mode = useCityStore((s) => s.player.mode)
  const togglePlayerMode = useCityStore((s) => s.togglePlayerMode)
  const playerStop = useCityStore((s) => s.playerStop)
  const profile = useSocialStore((s) => s.profile)
  const online = useSocialStore((s) => s.status === 'online')
  const signOut = useSocialStore((s) => s.signOut)

  if (!online || !profile) return null

  return (
    <div className="player-hud">
      <div className="player-hud__avatar">
        <PixelCitizen profile={profile} size={20} />
        <span className={`player-hud__dot ${moving ? 'player-hud__dot--moving' : ''}`} />
      </div>
      <div className="player-hud__info">
        <div className="player-hud__coords">{x} × {y}</div>
        <div className="player-hud__mode">{mode.toUpperCase()}</div>
      </div>
      <div className="player-hud__actions">
        <button className="mini-btn" onClick={togglePlayerMode} title="Toggle mode (C)">MODE</button>
        <button className="mini-btn" onClick={playerStop} title="Stop movement" disabled={!moving}>STOP</button>
      </div>
      <button className="mini-btn player-hud__logout" onClick={() => void signOut()} title="Log out of NEXUS">
        <Icon name="logout" size={11} /> LOG OUT
      </button>
    </div>
  )
}