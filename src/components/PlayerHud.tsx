import { useCityStore } from '../state/useCityStore'
import { useSocialStore } from '../social/useSocialStore'
import { PixelCitizen } from '../social/PixelCitizen'

export function PlayerHud() {
  const { player, togglePlayerMode, playerStop } = useCityStore()
  const { profile, status } = useSocialStore()

  if (status !== 'online' || !profile) return null

  return (
    <div className="player-hud">
      <div className="player-hud__avatar">
        <PixelCitizen profile={profile} size={20} />
        <span className={`player-hud__dot ${player.moving ? 'player-hud__dot--moving' : ''}`} />
      </div>
      <div className="player-hud__info">
        <div className="player-hud__coords">{player.x.toFixed(0)} × {player.y.toFixed(0)}</div>
        <div className="player-hud__mode">{player.mode.toUpperCase()}</div>
      </div>
      <div className="player-hud__actions">
        <button className="mini-btn" onClick={togglePlayerMode} title="Toggle mode (C)">MODE</button>
        <button className="mini-btn" onClick={playerStop} title="Stop movement" disabled={!player.moving}>STOP</button>
      </div>
    </div>
  )
}
