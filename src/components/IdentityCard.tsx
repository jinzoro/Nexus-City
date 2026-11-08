import type { CSSProperties } from 'react'
import { useState } from 'react'
import { useSocialStore, BODY_SWATCHES, VISOR_SWATCHES } from '../social/useSocialStore'
import { PixelCitizen } from '../social/PixelCitizen'
import { SectionLabel } from './ui'

export function IdentityCard() {
  const { profile, status, saveIdentity, accountBusy, accountNotice, clearAccountNotice } = useSocialStore()
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [statusText, setStatusText] = useState(profile?.statusText ?? '')
  const [handle, setHandle] = useState('')
  const [visibility, setVisibility] = useState<'online' | 'ghost'>(profile?.visibility ?? 'online')
  const [dmPolicy, setDmPolicy] = useState<'all' | 'floor' | 'none'>(profile?.dmPolicy ?? 'all')

  const canSave = status === 'online' && profile

  return (
    <div className="settings-card">
      <div className="settings-card__head">
        <PixelCitizen profile={profile!} size={34} />
        <div>
          <strong>{profile?.handle}</strong>
          <span className="settings-card__meta">CITIZEN · LINKED</span>
        </div>
      </div>

      <div className="account__wardrobe">
        <span className="account__label">SUIT</span>
        <div className="account__swatches">
          {BODY_SWATCHES.map((c) => (
            <button
              key={c}
              className={`swatch ${profile?.body.toLowerCase() === c ? 'swatch--on' : ''}`}
              style={{ '--swatch': c } as CSSProperties}
              onClick={() => saveIdentity({ body: c })}
              disabled={!canSave || accountBusy}
            />
          ))}
        </div>
        <span className="account__label">VISOR</span>
        <div className="account__swatches">
          {VISOR_SWATCHES.map((c) => (
            <button
              key={c}
              className={`swatch swatch--visor ${profile?.visor.toLowerCase() === c ? 'swatch--on' : ''}`}
              style={{ '--swatch': c } as CSSProperties}
              onClick={() => saveIdentity({ visor: c })}
              disabled={!canSave || accountBusy}
            />
          ))}
        </div>
        <span className="account__label">BUILD</span>
        <div className="account__swatches">
          {[0, 1, 2].map((b) => (
            <button
              key={b}
              className={`build-swatch ${profile?.built === b ? 'build-swatch--on' : ''}`}
              onClick={() => saveIdentity({ built: b as 0 | 1 | 2 })}
              disabled={!canSave || accountBusy}
            >
              <PixelCitizen profile={{ body: profile?.body ?? '#22e6ff', visor: profile?.visor ?? '#ff3dd8', built: b }} size={16} />
            </button>
          ))}
        </div>
      </div>

      <div className="settings-field">
        <label>HANDLE</label>
        <div className="settings-row">
          <input value={handle} maxLength={16} placeholder={profile?.handle ?? ''} onChange={e => setHandle(e.target.value)} disabled={!canSave || accountBusy} />
          <button className="mini-btn mini-btn--primary" onClick={() => saveIdentity({ handle })} disabled={!canSave || accountBusy || handle.trim().length < 3}>RENAME</button>
        </div>
      </div>

      <div className="settings-field">
        <label>BIO (160)</label>
        <textarea value={bio} maxLength={160} onChange={e => setBio(e.target.value)} disabled={!canSave || accountBusy} />
        <button className="mini-btn" onClick={() => saveIdentity({ bio })} disabled={!canSave || accountBusy}>SAVE BIO</button>
      </div>

      <div className="settings-field">
        <label>STATUS (40)</label>
        <input value={statusText} maxLength={40} onChange={e => setStatusText(e.target.value)} disabled={!canSave || accountBusy} />
        <button className="mini-btn" onClick={() => saveIdentity({ statusText })} disabled={!canSave || accountBusy}>SAVE STATUS</button>
      </div>

      <div className="settings-field">
        <label>VISIBILITY</label>
        <div className="settings-radio">
          {(['online', 'ghost'] as const).map(v => (
            <button
              key={v}
              className={`mini-btn ${visibility === v ? 'mini-btn--primary' : ''}`}
              onClick={() => { setVisibility(v); saveIdentity({ visibility: v }) }}
              disabled={!canSave || accountBusy}
            >
              {v.toUpperCase()}
            </button>
          ))}
        </div>
        <small className="settings-note">GHOST hides you from the city roster and presence.</small>
      </div>

      <div className="settings-field">
        <label>DM POLICY</label>
        <select value={dmPolicy} onChange={e => { const v = e.target.value as any; setDmPolicy(v); saveIdentity({ dmPolicy: v }) }} disabled={!canSave || accountBusy}>
          <option value="all">ALL</option>
          <option value="floor">FLOOR ONLY</option>
          <option value="none">NONE</option>
        </select>
      </div>

      {accountNotice && (
        <div className={`settings-notice ${accountNotice.tone}`} onClick={clearAccountNotice} title="Click to clear">
          {accountNotice.text}
        </div>
      )}
    </div>
  )
}
