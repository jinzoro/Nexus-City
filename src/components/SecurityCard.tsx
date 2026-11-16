import { useState } from 'react'
import { useSocialStore } from '../social/useSocialStore'
import { passwordError } from '../social/password'
import { PasswordChecklist } from './PasswordChecklist'

export function SecurityCard() {
  const { profile, status, updateEmail, updatePassword, signOutEverywhere, deleteAccount, accountBusy, accountNotice, clearAccountNotice } = useSocialStore()
  const [email, setEmail] = useState('')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const autoLock = useSocialStore((s) => s.sessionAutoLock)
  const setAutoLock = useSocialStore((s) => s.setSessionAutoLock)
  const lockSession = useSocialStore((s) => s.lockSession)
  const sessionSince = useSocialStore((s) => s.sessionSince)

  const canAct = status === 'online' && profile
  const nextProblem = passwordError(next, { handle: profile?.handle })
  const sessionMinutes = sessionSince ? Math.max(1, Math.round((Date.now() - sessionSince) / 60000)) : 0

  return (
    <div className="settings-card">
      <h4>SECURITY</h4>

      <div className="settings-field">
        <label>CHANGE EMAIL</label>
        <div className="settings-row">
          <input type="email" value={email} placeholder="NEW@CAVERN.NET" onChange={e => setEmail(e.target.value)} disabled={!canAct || accountBusy} />
          <button className="mini-btn mini-btn--primary" onClick={() => updateEmail(email)} disabled={!canAct || accountBusy || !email.includes('@')}>UPDATE EMAIL</button>
        </div>
      </div>

      <div className="settings-field">
        <label>CHANGE PASSWORD</label>
        <input type="password" placeholder="CURRENT CODE" value={current} onChange={e => setCurrent(e.target.value)} disabled={!canAct || accountBusy} />
        <input type="password" placeholder="NEW CODE (12+)" value={next} onChange={e => setNext(e.target.value)} disabled={!canAct || accountBusy} />
        <input type="password" placeholder="CONFIRM NEW CODE" value={confirm} onChange={e => setConfirm(e.target.value)} disabled={!canAct || accountBusy} />
        {next ? <PasswordChecklist password={next} handle={profile?.handle} /> : null}
        <button className="mini-btn" onClick={() => { if (!nextProblem && next === confirm) updatePassword(current, next) }} disabled={!canAct || accountBusy || Boolean(nextProblem) || next !== confirm}>UPDATE PASSWORD</button>
      </div>

      <div className="settings-field">
        <label>SESSION</label>
        <div className="settings-row">
          <select
            className="settings-select"
            value={autoLock}
            onChange={(event) => setAutoLock(Number(event.target.value))}
            disabled={!canAct}
            aria-label="Auto-lock after inactivity"
          >
            <option value={0}>AUTO-LOCK OFF</option>
            <option value={5}>LOCK AFTER 5 MIN</option>
            <option value={15}>LOCK AFTER 15 MIN</option>
            <option value={30}>LOCK AFTER 30 MIN</option>
            <option value={60}>LOCK AFTER 60 MIN</option>
          </select>
          <button className="mini-btn" onClick={lockSession} disabled={!canAct}>
            LOCK NOW
          </button>
        </div>
        <p className="settings-note">
          {sessionMinutes ? `This session has been open for ${sessionMinutes} min. ` : ''}
          Locking hides the city until your access code is re-entered. Signing out in one tab signs out the others.
        </p>
      </div>

      <div className="settings-field">
        <button className="mini-btn" onClick={() => signOutEverywhere()} disabled={!canAct || accountBusy}>
          SIGN OUT EVERYWHERE
        </button>
        <p className="settings-note">Ends all existing sessions. You'll need to sign in again.</p>
      </div>

      <div className="settings-field settings-field--danger">
        <button className="mini-btn mini-btn--warn" onClick={() => { if (window.confirm('DELETE YOUR CITIZEN ACCOUNT? THIS CANNOT BE UNDONE.')) deleteAccount() }} disabled={!canAct || accountBusy}>
          DELETE ACCOUNT
        </button>
      </div>

      {accountNotice && (
        <div className={`settings-notice ${accountNotice.tone}`} onClick={clearAccountNotice} title="Click to clear">
          {accountNotice.text}
        </div>
      )}
    </div>
  )
}
