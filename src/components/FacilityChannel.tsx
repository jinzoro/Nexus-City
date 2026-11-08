import { useEffect, useRef, useState } from 'react'
import { useSocialStore } from '../social/useSocialStore'
import { PixelCitizen } from '../social/PixelCitizen'
import { SectionLabel } from './ui'
import type { Building } from '../types'

/**
 * Per-building meeting channel inside a facility interior: shows who is
 * "inside" right now (Supabase presence filtered to this building) and a live
 * floor channel (broadcast + persisted history).
 */
export function FacilityChannel({ building }: { building: Building }) {
  const enabled = useSocialStore((s) => s.enabled)
  const status = useSocialStore((s) => s.status)
  const profile = useSocialStore((s) => s.profile)
  const presence = useSocialStore((s) => s.presence)
  const channelBuildingId = useSocialStore((s) => s.channelBuildingId)
  const channelMessages = useSocialStore((s) => s.channelMessages)
  const enterBuilding = useSocialStore((s) => s.enterBuilding)
  const leaveBuilding = useSocialStore((s) => s.leaveBuilding)
  const sendToChannel = useSocialStore((s) => s.sendToChannel)
  const openDirect = useSocialStore((s) => s.openDirect)

  const [draft, setDraft] = useState('')
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void enterBuilding(building.id, building.name)
    return () => {
      void leaveBuilding()
    }
  }, [building.id, building.name, enterBuilding, leaveBuilding])

  useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [channelMessages.length])

  if (!enabled) return null

  const occupants = presence.filter((p) => p.buildingId === building.id)
  const signedIn = status === 'online' && !!profile

  return (
    <>
      <SectionLabel>FLOOR CHANNEL</SectionLabel>
      <div className="fchannel">
        <div className="fchannel__heads">
          {occupants.length === 0 ? (
            <span className="fchannel__quiet">NO LINKED CITIZENS PRESENT</span>
          ) : (
            occupants.map((occ) => (
              <button
                key={occ.key}
                className="fchannel__person"
                title={occ.handle}
                onClick={() => {
                  if (occ.userId !== profile?.id) void openDirect(occ.userId, occ.handle)
                }}
              >
                <PixelCitizen profile={occ} size={16} />
                <span>{occ.userId === profile?.id ? `${occ.handle} (YOU)` : occ.handle}</span>
              </button>
            ))
          )}
        </div>

        <div className="fchannel__feed" ref={feedRef}>
          {channelMessages.length === 0 ? (
            <span className="fchannel__quiet">
              CHANNEL QUIET{signedIn ? ' // say something to the room' : ''}
            </span>
          ) : (
            channelMessages.map((m, i) => {
              const mine = m.userId === profile?.id
              return (
                <div key={`${m.at}-${m.userId}-${i}`} className={`fchannel__row ${mine ? 'fchannel__row--mine' : ''}`}>
                  <span className="fchannel__time">{fHour(m.at)}</span>
                  <span className="fchannel__who" style={{ color: m.body }}>{m.handle}</span>
                  <p>{m.content}</p>
                </div>
              )
            })
          )}
        </div>

        {signedIn ? (
          <form
            className="fchannel__compose"
            onSubmit={(e) => {
              e.preventDefault()
              if (!draft.trim()) return
              void sendToChannel(draft)
              setDraft('')
            }}
          >
            <input
              value={draft}
              placeholder="SPEAK TO THE FLOOR…"
              maxLength={240}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className="mini-btn mini-btn--primary" disabled={!draft.trim()}>
              SEND
            </button>
          </form>
        ) : (
          <p className="fchannel__guest">
            {status === 'linking'
              ? 'ESTABLISHING CIVIC LINK…'
              : 'CREATE A CITIZEN ACCOUNT (PROFILE > ACCOUNT) TO SPEAK ON THIS FLOOR.'}
          </p>
        )}
      </div>
    </>
  )
}

/** 19:42 style stamp; tolerates ms epoch or ISO strings. */
function fHour(at: number) {
  const safe = at < 1e12 ? at * 1000 : at
  return new Date(safe).toTimeString().slice(0, 5)
}
