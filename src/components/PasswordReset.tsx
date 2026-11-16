import { useState } from 'react'
import { useSocialStore } from '../social/useSocialStore'

/**
 * Full-screen overlay shown when the visitor arrives from a Supabase password
 * recovery link (`#...type=recovery`). Supabase has already exchanged the link
 * for a session, so this form only needs to set a new access code.
 */
export function PasswordReset() {
  const recovery = useSocialStore((s) => s.recovery)
  const busy = useSocialStore((s) => s.resetBusy)
  const notice = useSocialStore((s) => s.resetNotice)
  const completePasswordReset = useSocialStore((s) => s.completePasswordReset)
  const cancelRecovery = useSocialStore((s) => s.cancelRecovery)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  if (!recovery) return null

  const valid = password.length >= 6 && password === confirm && !busy

  return (
    <div className="login-gate recovery-gate" data-login>
      <div
        className="login-gate__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-title"
      >
        <div className="login-gate__head">
          <span className="login-gate__badge">NEXUS</span>
          <h1 id="recovery-title">ACCESS RECOVERY</h1>
        </div>
        <p className="login-gate__tag">RECOVERY LINK VERIFIED — SET A NEW ACCESS CODE</p>
        <form
          className="login-gate__form"
          onSubmit={(event) => {
            event.preventDefault()
            if (valid) void completePasswordReset(password)
          }}
        >
          <input
            type="password"
            placeholder="NEW ACCESS CODE (6+)"
            value={password}
            autoComplete="new-password"
            autoFocus
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
          />
          <input
            type="password"
            placeholder="CONFIRM NEW ACCESS CODE"
            value={confirm}
            autoComplete="new-password"
            onChange={(event) => setConfirm(event.target.value)}
            disabled={busy}
          />
          <div className="login-gate__actions">
            <button type="submit" disabled={!valid}>
              {busy ? 'WRITING…' : 'SET ACCESS CODE'}
            </button>
            <button
              type="button"
              className="login-gate__secondary"
              onClick={() => {
                cancelRecovery()
                void useSocialStore.getState().signOut()
              }}
              disabled={busy}
            >
              CANCEL
            </button>
          </div>
          {password && confirm && password !== confirm ? (
            <div className="login-gate__error">CODES DO NOT MATCH</div>
          ) : null}
          {notice ? (
            <div className={notice.tone === 'error' ? 'login-gate__error' : 'login-gate__hint'}>
              {notice.text}
            </div>
          ) : (
            <p className="login-gate__hint">
              Choose something you have not used elsewhere. Your city, progress and contacts stay
              attached to this citizen.
            </p>
          )}
        </form>
        <div className="login-gate__foot">NEXUS // UNDERGROUND MEGAPOLIS</div>
      </div>
    </div>
  )
}
