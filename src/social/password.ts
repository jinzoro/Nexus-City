/**
 * Access-code policy for new and changed passwords.
 *
 * This is deliberately NOT applied to sign-in: complexity rules only make
 * sense when a password is being created, so existing citizens can still use
 * whatever they already have. Pair this client-side guidance with the real
 * enforcement in Supabase Auth (minimum length + leaked-password protection)
 * because anything in the bundle can be bypassed by calling the Auth API
 * directly.
 */

export const PASSWORD_MIN_LENGTH = 12
/** bcrypt only uses the first 72 bytes, so refuse longer inputs outright. */
export const PASSWORD_MAX_LENGTH = 72

export interface PasswordHints {
  email?: string
  handle?: string
}

export interface PasswordRule {
  id: string
  label: string
  ok: boolean
}

/** Tokens from the citizen's own identity that a code must not contain. */
function identityTokens({ email, handle }: PasswordHints): string[] {
  const tokens: string[] = []
  const local = email?.trim().split('@')[0]?.replace(/[^a-z0-9]/gi, '').toLowerCase() ?? ''
  const name = handle?.trim().replace(/[^a-z0-9]/gi, '').toLowerCase() ?? ''
  if (local.length >= 3) tokens.push(local)
  if (name.length >= 3) tokens.push(name)
  return tokens
}

export function passwordRules(password: string, hints: PasswordHints = {}): PasswordRule[] {
  const lower = password.toLowerCase()
  const tokens = identityTokens(hints)
  return [
    { id: 'length', label: `${PASSWORD_MIN_LENGTH}+ CHARACTERS`, ok: password.length >= PASSWORD_MIN_LENGTH },
    { id: 'upper', label: 'UPPERCASE LETTER', ok: /[A-Z]/.test(password) },
    { id: 'lower', label: 'LOWERCASE LETTER', ok: /[a-z]/.test(password) },
    { id: 'digit', label: 'NUMBER', ok: /[0-9]/.test(password) },
    { id: 'symbol', label: 'SYMBOL', ok: /[^A-Za-z0-9]/.test(password) },
    {
      id: 'identity',
      label: 'NO EMAIL OR HANDLE IN CODE',
      ok: !tokens.some((token) => lower.includes(token)),
    },
  ]
}

/**
 * First unmet requirement as a UI-ready sentence, or null when the password
 * passes. Empty input also fails, which keeps submit buttons disabled.
 */
export function passwordError(password: string, hints: PasswordHints = {}): string | null {
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `ACCESS CODE MUST BE ${PASSWORD_MAX_LENGTH} CHARACTERS OR FEWER`
  }
  const failed = passwordRules(password, hints).find((rule) => !rule.ok)
  if (!failed) return null
  if (failed.id === 'length') return `ACCESS CODE NEEDS ${PASSWORD_MIN_LENGTH}+ CHARACTERS`
  if (failed.id === 'identity') return 'ACCESS CODE CANNOT CONTAIN YOUR EMAIL OR HANDLE'
  return `ACCESS CODE NEEDS ${failed.label}`
}

export function isStrongPassword(password: string, hints: PasswordHints = {}): boolean {
  return passwordError(password, hints) === null
}
