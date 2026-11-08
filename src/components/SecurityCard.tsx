import { useState } from 'react'
import { useSocialStore } from '../social/useSocialStore'

export function SecurityCard() {
  const { profile, status, updateEmail, updatePassword, signOutEverywhere, deleteAccount, accountBusy, accountNotice, clearAccountNotice } = useSocialStore()
  const [email, setEmail] = useState('')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')

  const canAct = status === 'online' && profile

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
        <input type="password" placeholder="NEW CODE (6+)" value={next} onChange={e => setNext(e.target.value)} disabled={!canAct || accountBusy} />
        <input type="password" placeholder="CONFIRM NEW CODE" value={confirm} onChange={e => setConfirm(e.target.value)} disabled={!canAct || accountBusy} />
        <button className="mini-btn" onClick={() => { if (next.length >= 6 && next === confirm) updatePassword(current, next) }} disabled={!canAct || accountBusy || next.length < 6 || next !== confirm}>UPDATE PASSWORD</button>
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
