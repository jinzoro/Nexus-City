import { useEffect } from 'react'
import type { CSSProperties } from 'react'
import { useCityStore } from '../state/useCityStore'
import { severityColor } from './ui'
import { Icon } from './Icons'

function ToastItem({ id, title, message, severity }: { id: string; title: string; message: string; severity: 'info' | 'warning' | 'critical' }) {
  const dismiss = useCityStore((s) => s.dismissToast)

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(id), 6200)
    return () => window.clearTimeout(timer)
  }, [id, dismiss])

  const color = severityColor(severity)
  return (
    <div className="toast" style={{ '--toast-color': color } as CSSProperties}>
      <span className="toast__bar" />
      <span className="toast__icon">
        <Icon name={severity === 'critical' ? 'critical' : severity === 'warning' ? 'warning' : 'info'} size={14} />
      </span>
      <div className="toast__text">
        <strong>{title}</strong>
        <span>{message}</span>
      </div>
      <button className="toast__close" onClick={() => dismiss(id)} title="Dismiss">
        <Icon name="close" size={11} />
      </button>
    </div>
  )
}

export function ToastStack() {
  const toasts = useCityStore((s) => s.toasts)
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </div>
  )
}
