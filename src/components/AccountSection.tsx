import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useSocialStore, BODY_SWATCHES, VISOR_SWATCHES } from '../social/useSocialStore'
import { PixelCitizen } from '../social/PixelCitizen'
import { SectionLabel } from './ui'

/**
 * ACCOUNT / IDENTITY block shown in the PROFILE panel. Handles Supabase
 * sign-in, sign-up, the avatar wardrobe and sign-out. Renders an offline
 * readout when the layer is not configured.
 */
export function AccountSection() {
  const {
    enabled,
    status,
    authError,
    profile,
    init,
    signUp,
    signIn,
    signOut,
    saveIdentity,
    clearAuthError,
  } = useSocialStore()
  const [mode, setMode] = useState<'in' | 'up'>('up')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [handle, setHandle] = useState('')

  useEffect(() => {
    void init()
  }, [init])

  if (!enabled) {
    return (
      <>
        <SectionLabel>ACCOUNT</SectionLabel>
        <div className="account account--offline">
          <span className="account__offline-dot" />
          <p>
            SOCIAL MESH OFFLINE — citizen accounts, avatars, live chat and
            building channels run on Supabase. Wire <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> (or{' '}
            <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>), run <code>supabase/schema.sql</code>,
            redeploy.
          </p>
        </div>
      </>
    )
  }

  if (status === 'online' && profile) {
    return (
      <>
        <SectionLabel>IDENTITY</SectionLabel>
        <div className="account account--live">
          <div className="account__me">
            <PixelCitizen profile={profile} size={34} />
            <div>
              <strong>{profile.handle}</strong>
              <span>CITIZEN · LINKED</span>
            </div>
            <button className="mini-btn" onClick={() => void signOut()}>UNLINK</button>
          </div>

          <div className="account__wardrobe">
            <span className="account__label">SUIT</span>
            <div className="account__swatches">
              {BODY_SWATCHES.map((c) => (
                <button
                  key={c}
                  className={`swatch ${profile.body.toLowerCase() === c ? 'swatch--on' : ''}`}
                  style={{ '--swatch': c } as CSSProperties}
                  aria-label={`Suit ${c}`}
                  onClick={() => void saveIdentity({ body: c })}
                />
              ))}
            </div>
            <span className="account__label">VISOR</span>
            <div className="account__swatches">
              {VISOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  className={`swatch swatch--visor ${profile.visor.toLowerCase() === c ? 'swatch--on' : ''}`}
                  style={{ '--swatch': c } as CSSProperties}
                  aria-label={`Visor ${c}`}
                  onClick={() => void saveIdentity({ visor: c })}
                />
              ))}
            </div>
            <span className="account__label">BUILD</span>
            <div className="account__swatches">
              {[0, 1, 2].map((b) => (
                <button
                  key={b}
                  className={`build-swatch ${profile.built === b ? 'build-swatch--on' : ''}`}
                  onClick={() => void saveIdentity({ built: b as 0 | 1 | 2 })}
                >
                  <PixelCitizen profile={{ body: profile.body, visor: profile.visor, built: b }} size={16} />
                </button>
              ))}
            </div>
          </div>

          <div className="account__row">
            <input
              className="account__input"
              value={handle}
              placeholder={profile.handle}
              maxLength={16}
              onChange={(e) => setHandle(e.target.value)}
            />
            <button className="mini-btn mini-btn--primary" onClick={() => void saveIdentity({ handle })}>
              RENAME
            </button>
          </div>
          {authError ? <p className="account__error">{authError}</p> : null}
        </div>
      </>
    )
  }

  return (
    <>
      <SectionLabel>ACCOUNT</SectionLabel>
      <form
        className="account"
        onSubmit={(e) => {
          e.preventDefault()
          if (
            !email.trim() ||
            password.length < 6 ||
            (mode === 'up' && handle.trim().length < 3) ||
            status === 'linking'
          ) {
            return
          }
          void (mode === 'up' ? signUp(email, password, handle) : signIn(email, password))
        }}
      >
        <div className="account__tabs">
          <button type="button" className={mode === 'up' ? 'account__tab--on' : ''} onClick={() => { clearAuthError(); setMode('up') }}>
            NEW CITIZEN
          </button>
          <button type="button" className={mode === 'in' ? 'account__tab--on' : ''} onClick={() => { clearAuthError(); setMode('in') }}>
            LINK UP
          </button>
        </div>
        <div className="account__row">
          <input
            className="account__input"
            type="email"
            value={email}
            placeholder="OPERATOR@CAVERN.NET"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="account__row">
          <input
            className="account__input"
            type="password"
            value={password}
            placeholder="ACCESS CODE"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {mode === 'up' ? (
          <div className="account__row">
            <input
              className="account__input"
              value={handle}
              placeholder="CITIZEN HANDLE (e.g. RAZOR_GLASS)"
              maxLength={16}
              onChange={(e) => setHandle(e.target.value)}
            />
          </div>
        ) : null}
        <div className="account__row">
          <button
            type="submit"
            className="mini-btn mini-btn--primary account__go"
            disabled={!email.trim() || password.length < 6 || (mode === 'up' && handle.trim().length < 3) || status === 'linking'}
          >
            {mode === 'up' ? 'CREATE CITIZEN' : 'LINK IN'}
          </button>
        </div>
        {status === 'linking' ? <p className="account__note">ESTABLISHING CIVIC LINK…</p> : null}
        {authError ? <p className="account__error">{authError}</p> : null}
        <p className="account__note">
          {mode === 'up'
            ? '6+ character access code. Your handle seeds your avatar suit and citizen sigil.'
            : 'Welcome back, operator. Your avatar, channels and threads resume with you.'}
        </p>
      </form>
    </>
  )
}
