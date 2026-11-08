import { useEffect, useRef, useState } from 'react'
import { useSocialStore } from '../social/useSocialStore'
import { PixelCitizen } from '../social/PixelCitizen'
import { SectionLabel } from './ui'
import type { SocialProfile } from '../social/types'

/**
 * Operator-to-operator direct threads in the MESSAGES panel. Lists live
 * presence (other citizens online right now) and hosts the open DM thread.
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

  const [draft, setDraft] = useState('')
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [dmThread.length])

  if (!enabled) {
    return <p className="directs__offline">SOCIAL MESH OFFLINE // citizen accounts run on Supabase once wired.</p>
  }

  const others = presence.filter((p) => p.userId !== profile?.id)

  if (status !== 'online' || !profile) {
    return (
      <>
        <SectionLabel>DIRECTS</SectionLabel>
        <p className="directs__offline">LINK A CITIZEN ACCOUNT (PROFILE &gt; ACCOUNT) TO SIGNAL OPERATORS DIRECTLY.</p>
      </>
    )
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
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="submit" className="mini-btn mini-btn--primary" disabled={!draft.trim()}>
                SEND
              </button>
            </form>
          </div>
        ) : others.length === 0 ? (
          <span className="directs__quiet">NO OPERATORS ON MESH // channel opens when citizens link up.</span>
        ) : (
          <div className="directs__list">
            {others.map((p) => (
              <button
                key={p.key}
                className="directs__person"
                onClick={() => void openDirect(p.userId, p.handle)}
              >
                <PixelCitizen profile={p} size={18} />
                <span className="directs__handle">{p.handle}</span>
                <span className="directs__where">{p.buildingName ?? (p.buildingId ? 'IN A FACILITY' : 'CIVIC RELAY')}</span>
                <i className="directs__pulse" />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
