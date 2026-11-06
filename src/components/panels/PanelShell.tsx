import type { ReactNode } from 'react'
import { useCityStore } from '../../state/useCityStore'
import { Icon, type IconName } from '../Icons'

export function PanelShell({
  title,
  subtitle,
  icon,
  children,
  footer,
  wide = false,
}: {
  title: string
  subtitle?: string
  icon: IconName
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  const setPanel = useCityStore((s) => s.setPanel)
  return (
    <section className={`panel-shell ${wide ? 'panel-shell--wide' : ''}`}>
      <div className="panel-shell__head">
        <span className="panel-shell__icon">
          <Icon name={icon} size={18} />
        </span>
        <div className="panel-shell__titles">
          <h2>{title}</h2>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
        <div className="panel-shell__head-right">
          <span className="panel-shell__status">
            <span className="live-dot" /> LINK ACTIVE
          </span>
          <button className="icon-btn icon-btn--small" onClick={() => setPanel(null)} title="Close panel [Esc]">
            <Icon name="close" size={14} />
          </button>
        </div>
      </div>
      <div className="panel-shell__body">{children}</div>
      {footer ? <div className="panel-shell__footer">{footer}</div> : null}
      <span className="panel-shell__corner panel-shell__corner--tl" />
      <span className="panel-shell__corner panel-shell__corner--br" />
    </section>
  )
}
