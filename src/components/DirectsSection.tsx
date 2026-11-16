import { useEffect, useRef, useState } from 'react'
import { useCityStore } from '../state/useCityStore'
import { useSocialStore } from '../social/useSocialStore'
import { PixelCitizen } from '../social/PixelCitizen'
import { SectionLabel } from './ui'
import type { SocialProfile } from '../social/types'

/**
 * Operator-to-operator direct threads in the MESSAGES panel. Lists live
 * presence (other citizens online right now), keeps a local watchlist of
 * friends with a jump-to camera, shows per-thread unread counts and a live
 * typing line while the peer composes.
 */
export function DirectsSection() {
  const enabled = useSocialStore((s) => s.enabled)
  const status = useSocialStore((s) => s.status)
  const profile = useSocialStore((s) => s.profile)
  const presence = useSocialStore((s) => s.presence)
  const dmWith = useSocialStore((s) => s.dmWith)
  const dmThread = useSocialStore((s) => s.dmThread)
  const openDirect = useSocialStore((s) => s.openDirect)
  const closeDirect = useSocialStore((s) => s.closeDirect)
  const sendDirect = useSocialStore((s) => s.sendDirect)
  const friends = useSocialStore((s) => s.friends)
  const toggleFriend = useSocialStore((s) => s.toggleFriend)
  const dmUnread = useSocialStore((s) => s.dmUnread)
  const dmTyping = useSocialStore((s) => s.dmTyping)
  const sendTyping = useSocialStore((s) => s.sendTyping)
  const refreshUnread = useSocialStore((s) => s.refreshUnread)
  const engine = useCityStore((s) => s.engine)
  const getBuilding = useCityStore((s) => s.getBuilding)
  const setSelected = useCityStore((s) => s.setSelected)
  const pushToast = useCityStore((s) => s.pushToast)

  const [draft, setDraft] = useState('')
  const [, setTypingTick] = useState(0)
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [dmThread.length])

  // Re-render once a second so an expired typing line disappears.
  useEffect(() => {
    if (!dmTyping) return
    const timer = window.setInterval(() => setTypingTick((t) => t + 1), 900)
    return () => window.clearInterval(timer)
  }, [dmTyping])

  useEffect(() => {
    if (status !== 'online') return
    void refreshUnread()
    const timer = window.setInterval(() => void refreshUnread(), 45_000)
    return () => window.clearInterval(timer)
  }, [status, refreshUnread])

  if (!enabled) {
    return <p className="directs__offline">SOCIAL MESH OFFLINE // citizen accounts run on Supabase once wired.</p>
  }

  const others = presence.filter((p) => p.userId !== profile?.id)
  const typingLive = Boolean(dmTyping && Date.now() < dmTyping.until && dmWith && dmTyping.userId === dmWith.userId)
  const totalUnread = Object.values(dmUnread).reduce((sum, n) => sum + n, 0)

  if (status !== 'online' || !profile) {
    return (
      <>
        <SectionLabel>DIRECTS</SectionLabel>
        <p className="directs__offline">LINK A CITIZEN ACCOUNT (PROFILE &gt; ACCOUNT) TO SIGNAL OPERATORS DIRECTLY.</p>
      </>
    )
  }

  const jumpTo = (userId: string) => {
    const entry = presence.find((p) => p.userId === userId)
    if (!entry?.buildingId) {
      pushToast({
        title: 'NO FIXED SIGNAL',
        message: 'That operator is on the civic relay, not inside a facility.',
        severity: 'info',
      })
      return
    }
    const building = getBuilding(entry.buildingId)
    if (!building) return
    setSelected(building)
    engine?.focusBuilding(building, 1.35)
    pushToast({
      title: 'CAMERA JUMP',
      message: `Locked onto ${entry.handle} at ${building.name}.`,
      severity: 'info',
    })
  }

  return (
    <>
      <SectionLabel>DIRECTS</SectionLabel>
      <div className="directs">
        {dmWith ? (
          <div className="dm">
            <div className="dm__head">
              <button className="icon-btn icon-btn--small" onClick={closeDirect} title="Close thread">
                ‹
              </button>
              <strong>{dmWith.handle}</strong>
              <span>ENCRYPTED / 1:1</span>
              <button
                className="directs__star directs__star--on"
                onClick={() => toggleFriend(dmWith.userId, dmWith.handle)}
                title="Toggle watchlist"
              >
                ★
              </button>
            </div>
            <div className="dm__feed" ref={feedRef}>
              {dmThread.length === 0 ? (
                <span className="directs__quiet">THREAD QUIET // say hello, operator.</span>
              ) : (
                dmThread.map((m, i) => {
                  const mine = m.userId === (profile as SocialProfile).id
                  return (
                    <div key={`${m.at}-${m.userId}-${i}`} className={`dm__row ${mine ? 'dm__row--mine' : ''}`}>
                      <span className="dm__time">{new Date(m.at).toTimeString().slice(0, 5)}</span>
                      <span className="dm__who" style={{ color: m.body }}>{mine ? 'YOU' : m.handle}</span>
                      <p>{m.content}</p>
                    </div>
                  )
                })
              )}
              {typingLive ? <span className="dm__typing">{dmTyping!.handle} IS TYPING…</span> : null}
            </div>
            <form
              className="dm__compose"
              onSubmit={(e) => {
                e.preventDefault()
                if (!draft.trim()) return
                void sendDirect(draft)
                setDraft('')
              }}
            >
              <input
                value={draft}
                placeholder={`SIGNAL ${dmWith.handle}…`}
                maxLength={240}
                onChange={(e) => {
                  setDraft(e.target.value)
                  sendTyping()
                }}
              />
              <button type="submit" className="mini-btn mini-btn--primary" disabled={!draft.trim()}>
                SEND
              </button>
            </form>
          </div>
        ) : (
          <>
            <SectionLabel>
              OPERATORS ONLINE
              {totalUnread > 0 ? <span className="directs__unread-pill">{totalUnread} NEW</span> : null}
            </SectionLabel>
            {others.length === 0 ? (
              <span className="directs__quiet">NO OPERATORS ON MESH // channel opens when citizens link up.</span>
            ) : (
              <div className="directs__list">
                {others.map((p) => {
                  const unread = dmUnread[p.userId] ?? 0
                  const friend = Boolean(friends[p.userId])
                  return (
                    <div key={p.key} className={`directs__person ${friend ? 'directs__person--friend' : ''}`}>
                      <button className="directs__open" onClick={() => void openDirect(p.userId, p.handle)}>
                        <PixelCitizen profile={p} size={18} />
                        <span className="directs__handle">{p.handle}</span>
                        <span className="directs__where">
                          {p.buildingName ?? (p.buildingId ? 'IN A FACILITY' : 'CIVIC RELAY')}
                        </span>
                      </button>
                      {unread > 0 ? <span className="directs__unread" title={`${unread} unread`}>{unread}</span> : null}
                      <button
                        className={`directs__star ${friend ? 'directs__star--on' : ''}`}
                        onClick={() => toggleFriend(p.userId, p.handle)}
                        title={friend ? 'Remove from watchlist' : 'Add to watchlist'}
                        aria-label={friend ? 'Remove friend' : 'Add friend'}
                      >
                        ★
                      </button>
                      <i className="directs__pulse" />
                    </div>
                  )
                })}
              </div>
            )}

            <SectionLabel>FRIENDS</SectionLabel>
            {Object.keys(friends).length === 0 ? (
              <span className="directs__quiet">STAR AN OPERATOR TO KEEP THEM ON YOUR WATCHLIST.</span>
            ) : (
              <div className="directs__list">
                {Object.entries(friends).map(([userId, handle]) => {
                  const live = presence.find((p) => p.userId === userId)
                  return (
                    <div key={userId} className="directs__person directs__person--friend">
                      <PixelCitizen
                        profile={live ?? { body: '#2a3550', visor: '#64809b', built: 0 }}
                        size={18}
                      />
                      <span className="directs__handle">{handle}</span>
                      <span className={`directs__status ${live ? 'directs__status--on' : ''}`}>
                        {live ? 'ONLINE' : 'OFFLINE'}
                      </span>
                      <button
                        className="mini-btn directs__jump"
                        onClick={() => jumpTo(userId)}
                        disabled={!live}
                        title="Jump the camera to this citizen"
                      >
                        JUMP
                      </button>
                      <button
                        className="directs__star directs__star--on"
                        onClick={() => toggleFriend(userId, handle)}
                        title="Remove from watchlist"
                        aria-label="Remove friend"
                      >
                        ★
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
