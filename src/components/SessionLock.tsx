import { useEffect, useState } from 'react'
import { useSocialStore } from '../social/useSocialStore'

/**
 * Resume screen for an idle-locked session. Re-authenticates against Supabase
 * so a walked-away console cannot be taken over by the next person at the desk.
 */
export function SessionLock() {
  const locked = useSocialStore((s) => s.sessionLocked)
  const profile = useSocialStore((s) => s.profile)
  const authError = useSocialStore((s) => s.authError)
  const [busy, setBusy] = useState(false)
  const unlockSession = useSocialStore((s) => s.unlockSession)
  const signOut = useSocialStore((s) => s.signOut)
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!locked) setPassword('')
  }, [locked])

  useEffect(() => {
    if (!locked) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [locked])

  if (!locked) return null

  return (
    <div className="login-gate session-lock" data-login>
      <div className="login-gate__card" role="dialog" aria-modal="true" aria-labelledby="session-lock-title">
        <div className="login-gate__head">
          <span className="login-gate__badge">NEXUS</span>
          <h1 id="session-lock-title">SESSION LOCKED</h1>
        </div>
        <p className="login-gate__tag">
          IDLE TIMEOUT // {profile ? `CITIZEN ${profile.handle}` : 'OPERATOR'} — ENTER YOUR ACCESS CODE
        </p>
        <form
          className="login-gate__form"
          onSubmit={(event) => {
            event.preventDefault()
            if (password.length < 6 || busy) return
            setBusy(true)
            void unlockSession(password).finally(() => setBusy(false))
          }}
        >
          <input
            type="password"
            placeholder="ACCESS CODE"
            value={password}
            autoComplete="current-password"
            autoFocus
            disabled={busy}
            onChange={(event) => setPassword(event.target.value)}
          />
          <div className="login-gate__actions">
            <button type="submit" disabled={busy || password.length < 6}>
              {busy ? 'VERIFYING…' : 'RESUME SESSION'}
            </button>
            <button type="button" className="login-gate__secondary" onClick={() => void signOut()} disabled={busy}>
              SIGN OUT
            </button>
          </div>
          {authError ? <div className="login-gate__error">{authError}</div> : null}
        </form>
        <div className="login-gate__foot">AUTO-LOCK IS CONFIGURED IN PROFILE → SECURITY</div>
      </div>
    </div>
  )
}
