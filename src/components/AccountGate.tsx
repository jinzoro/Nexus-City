import { useState } from 'react'
import type { FormEvent } from 'react'

interface AccountGateProps {
  social: {
    signIn: (email: string, password: string) => Promise<void>
    signUp: (email: string, password: string, handle: string) => Promise<void>
    clearAuthError?: () => void
  }
  error?: string | null
  disabled?: boolean
}

export function AccountGate({ social, error, disabled = false }: AccountGateProps) {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [handle, setHandle] = useState('')

  const validEmail = email.trim().length > 3 && email.includes('@')
  const validPassword = password.length >= 6
  const validHandle = handle.trim().replace(/[^a-zA-Z0-9_-]/g, '').length >= 3
  const canSubmit =
    !disabled && validEmail && validPassword && (mode === 'in' || validHandle)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    if (mode === 'in') void social.signIn(email, password)
    else void social.signUp(email, password, handle)
  }

  return (
    <form className="login-gate__form" onSubmit={submit}>
      <input
        placeholder="EMAIL"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        autoFocus
        disabled={disabled}
      />
      {mode === 'up' ? (
        <input
          placeholder="HANDLE"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          autoComplete="username"
          maxLength={16}
          disabled={disabled}
        />
      ) : null}
      <input
        placeholder="PASSWORD"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
        disabled={disabled}
      />
      <div className="login-gate__actions">
        <button type="submit" disabled={!canSubmit}>
          {mode === 'in' ? 'SIGN IN' : 'SIGN UP'}
        </button>
        <button
          type="button"
          className="login-gate__secondary"
          onClick={() => {
            social.clearAuthError?.()
            setMode(mode === 'in' ? 'up' : 'in')
          }}
          disabled={disabled}
        >
          {mode === 'in' ? 'CREATE ACCOUNT' : 'BACK'}
        </button>
      </div>
      {error && <div className="login-gate__error">{error}</div>}
      {mode === 'up' && !error && !disabled ? (
        <p className="login-gate__hint">
          EMAIL CONFIRMATION IS ON — CONFIRM YOUR ADDRESS, THEN SIGN IN.
        </p>
      ) : null}
    </form>
  )
}
