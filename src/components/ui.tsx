import type { ReactNode } from 'react'
import type { Building, CityEvent, District } from '../types'

export function formatNumber(value: number, digits = 0) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(digits > 0 ? digits : 0)}K`
  return value.toLocaleString('en-US')
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`
}

export function pad(value: number, length = 2) {
  return String(Math.round(value)).padStart(length, '0')
}

export function statusColor(status: Building['status']) {
  switch (status) {
    case 'ONLINE':
      return '#63ff9b'
    case 'STABLE':
      return '#22e6ff'
    case 'MAINTENANCE':
      return '#ffb347'
    case 'RESTRICTED':
      return '#ff3dd8'
    case 'OFFLINE':
      return '#ff4f6d'
  }
}

export function severityColor(severity: CityEvent['severity']) {
  if (severity === 'critical') return '#ff4f6d'
  if (severity === 'warning') return '#ffb347'
  return '#22e6ff'
}

export function districtColor(district: District | undefined) {
  return district?.color ?? '#22e6ff'
}

export function Meter({
  label,
  value,
  color = '#22e6ff',
  detail,
  compact = false,
}: {
  label: string
  value: number
  color?: string
  detail?: ReactNode
  compact?: boolean
}) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={`meter ${compact ? 'meter--compact' : ''}`}>
      <div className="meter__head">
        <span className="meter__label">{label}</span>
        <span className="meter__value" style={{ color }}>
          {detail ?? formatPercent(clamped, 1)}
        </span>
      </div>
      <div className="meter__track">
        <div className="meter__fill" style={{ width: `${clamped}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
        <div className="meter__ticks" />
      </div>
    </div>
  )
}

export function StatusBadge({ status }: { status: Building['status'] }) {
  const color = statusColor(status)
  return (
    <span className="status-badge" style={{ color, borderColor: `${color}66`, background: `${color}12` }}>
      <span className="status-badge__dot" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      {status}
    </span>
  )
}

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="section-label">
      <span className="section-label__line" />
      <span>{children}</span>
      <span className="section-label__line section-label__line--grow" />
      {action}
    </div>
  )
}

export function PulseDot({ color = '#22e6ff', label }: { color?: string; label?: string }) {
  return (
    <span className="pulse-dot-wrap">
      <span className="pulse-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      {label ? <span className="pulse-dot__label">{label}</span> : null}
    </span>
  )
}

export function SignalBars({ value, color = '#22e6ff', bars = 5 }: { value: number; color?: string; bars?: number }) {
  const active = Math.max(1, Math.min(bars, Math.round((value / 100) * bars)))
  return (
    <span className="signal-bars" aria-label={`${Math.round(value)} percent`}>
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className="signal-bars__bar"
          style={{
            height: `${4 + i * 2}px`,
            background: i < active ? color : 'rgba(120,150,190,0.18)',
            boxShadow: i < active ? `0 0 4px ${color}` : 'none',
          }}
        />
      ))}
    </span>
  )
}

export function CornerTicks() {
  return (
    <span className="corner-ticks" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}
