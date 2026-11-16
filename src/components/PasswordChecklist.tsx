import { passwordRules } from '../social/password'
import type { PasswordHints } from '../social/password'

interface PasswordChecklistProps extends PasswordHints {
  password: string
}

/** Live requirement list shown while choosing a new access code. */
export function PasswordChecklist({ password, email, handle }: PasswordChecklistProps) {
  const rules = passwordRules(password, { email, handle })
  return (
    <ul className="pw-rules" aria-label="Access code requirements">
      {rules.map((rule) => (
        <li key={rule.id} className={`pw-rule${rule.ok ? ' pw-rule--ok' : ''}`}>
          <span className="pw-rule__mark" aria-hidden="true">{rule.ok ? '✓' : '·'}</span>
          {rule.label}
        </li>
      ))}
    </ul>
  )
}
