import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { CityData } from '../types'
import { CityEngine } from '../engine/CityEngine'
import { CITY_SEED_DEFAULT } from '../data/city'
import { FACTIONS } from '../data/world'
import { AccountGate } from './AccountGate'

interface LandingSocial {
  enabled: boolean
  status: string
  authError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, handle: string) => Promise<void>
  clearAuthError?: () => void
}

interface LandingProps {
  city: CityData | null
  social: LandingSocial
  error?: string | null
  disabled?: boolean
  /** True while the page crossfades into the city after a successful auth. */
  leaving?: boolean
  /** Offline fallback: enter the city without an account. */
  onGuest?: () => void
}

/**
 * Marketing / entry experience. The single Canvas city engine is reused as a
 * dimmed, non-interactive backdrop; CSS handles the parallax, flicker,
 * scanlines and reveal motion (all disabled under prefers-reduced-motion).
 */
export function Landing({ city, social, error, disabled = false, leaving = false, onGuest }: LandingProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [authMode, setAuthMode] = useState<'in' | 'up' | null>(null)

  // Live city backdrop — the same engine, just non-interactive.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !city) return
    const engine = new CityEngine(canvas, city)
    engine.setPhotoMode(true)
    engine.focusCell(99, 99, 0.62, false)
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let step = 0
    const vantages: Array<[number, number, number]> = [
      [99, 99, 0.62],
      [126, 78, 0.72],
      [78, 126, 0.58],
      [154, 99, 0.66],
      [99, 107, 0.7],
    ]
    const timer = reduce
      ? 0
      : window.setInterval(() => {
          step = (step + 1) % vantages.length
          const [x, y, z] = vantages[step]
          engine.focusCell(x, y, z)
        }, 7200)
    const observer = new ResizeObserver(() => engine.resize())
    observer.observe(canvas)
    return () => {
      if (timer) window.clearInterval(timer)
      observer.disconnect()
      engine.destroy()
    }
  }, [city])

  const stats = city
    ? [
        { label: 'STRUCTURES', value: city.buildings.length.toLocaleString('en-US') },
        { label: 'LIVE ENTITIES', value: (city.pedestrians.length + city.vehicles.length).toLocaleString('en-US') },
        { label: 'SECTORS', value: String(city.districts.length) },
        { label: 'RAIL HALTS', value: String(city.stations.length) },
      ]
    : [
        { label: 'STRUCTURES', value: '—' },
        { label: 'LIVE ENTITIES', value: '—' },
        { label: 'SECTORS', value: '—' },
        { label: 'RAIL HALTS', value: '—' },
      ]

  return (
    <div className={`landing ${leaving ? 'landing--leaving' : ''}`} data-login>
      <div className="landing__backdrop" aria-hidden="true">
        <canvas ref={canvasRef} className="landing__canvas" />
        <span className="landing__scanlines" />
        <span className="landing__flicker" />
      </div>

      <header className="landing__nav">
        <span className="landing__brand">NEXUS<span>//</span></span>
        <nav className="landing__navlinks" aria-label="Entry">
          <a href="#districts">DISTRICTS</a>
          <a href="#systems">SYSTEMS</a>
          <a href="#factions">FACTIONS</a>
          <button
            className="landing__nav-cta"
            onClick={() => setAuthMode('in')}
            disabled={disabled}
          >
            LOGIN
          </button>
        </nav>
      </header>

      <section className="landing__hero">
        <p className="landing__eyebrow"><span className="live-dot" /> CAVERN 07 // CIVIC MESH ONLINE</p>
        <h1 className="landing__title">
          NEXUS<span>//</span>
        </h1>
        <p className="landing__tagline">
          An underground megapolis where the city itself is the interface.
          Nine sectors, 2,500 towers, maglev rails and seven million souls — running
          live in your browser.
        </p>
        <div className="landing__ctas">
          {social.enabled ? (
            <>
              <button className="landing__cta landing__cta--primary" onClick={() => setAuthMode('up')} disabled={disabled}>
                CREATE CITIZEN
              </button>
              <button className="landing__cta" onClick={() => setAuthMode('in')} disabled={disabled}>
                LOGIN
              </button>
            </>
          ) : (
            <button className="landing__cta landing__cta--primary" onClick={onGuest}>
              ENTER AS GUEST
            </button>
          )}
        </div>
        {!social.enabled ? (
          <p className="landing__offline">
            SOCIAL MESH OFFLINE — set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable
            citizen accounts. The city preview below is still live.
          </p>
        ) : null}

        <div className="landing__statline">
          {stats.map((stat) => (
            <div key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>

        <a className="landing__scroll" href="#districts" aria-label="Scroll to districts">
          <span>SCROLL</span>
          <i />
        </a>
      </section>

      <section className="landing__section" id="districts">
        <div className="landing__section-head">
          <h2>NINE SECTORS, ONE CAVERN</h2>
          <p>Every district runs its own economy, palette and power draw. Walk in and the HUD follows you.</p>
        </div>
        <div className="landing__districts">
          {(city?.districts ?? []).map((district) => (
            <article
              key={district.id}
              className="landing__district"
              style={{ '--district': district.color, '--district-accent': district.accent } as CSSProperties}
            >
              <div className="landing__district-head">
                <span>{district.code}</span>
                <i />
              </div>
              <h3>{district.name}</h3>
              <p>{district.tagline}</p>
              <footer>
                <span>{(district.population / 1_000_000).toFixed(2)}M</span>
                <span>PWR {Math.round(district.power)}%</span>
              </footer>
            </article>
          ))}
          {!city ? <p className="landing__loading">COMPILING CAVERN TOPOLOGY — SEED LOCK…</p> : null}
        </div>
      </section>

      <section className="landing__section" id="systems">
        <div className="landing__section-head">
          <h2>THE CITY IS THE INTERFACE</h2>
          <p>No cards, no dashboards. Drag to pan, scroll to zoom, click a tower to open its record.</p>
        </div>
        <div className="landing__features">
          <article>
            <span className="landing__feature-glyph">◈</span>
            <h3>LIVING SKYLINE</h3>
            <p>Day/night tint, rolling civic events, blackouts and festivals change the skyline in real time.</p>
          </article>
          <article>
            <span className="landing__feature-glyph">▦</span>
            <h3>DISTRICT ECONOMY</h3>
            <p>Power demand, income and crime feed each other. Grid faults cascade into gridlock and raids.</p>
          </article>
          <article>
            <span className="landing__feature-glyph">⌁</span>
            <h3>CITIZEN MESH</h3>
            <p>Sign in, walk the streets, enter buildings on foot, talk to occupants and signal other operators.</p>
          </article>
        </div>
      </section>

      <section className="landing__section" id="factions">
        <div className="landing__section-head">
          <h2>SIX FACTIONS HOLD THE FLOOR</h2>
          <p>Standing is earned by answering dispatches and by who you help inside the towers.</p>
        </div>
        <div className="landing__factions">
          {FACTIONS.map((faction) => (
            <div key={faction.id} className="landing__faction" style={{ '--faction': faction.color } as CSSProperties}>
              <span>{faction.code}</span>
              <strong>{faction.name}</strong>
              <small>{faction.description.slice(0, 96)}…</small>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing__footer">
        <div>
          <span className="landing__brand">NEXUS<span>//</span></span>
          <p>UNDERGROUND MEGAPOLIS · CAVERN 07 · SEED {CITY_SEED_DEFAULT}</p>
        </div>
        <div className="landing__footer-actions">
          {social.enabled ? (
            <>
              <button className="landing__cta landing__cta--primary" onClick={() => setAuthMode('up')} disabled={disabled}>
                CREATE CITIZEN
              </button>
              <button className="landing__cta" onClick={() => setAuthMode('in')} disabled={disabled}>
                LOGIN
              </button>
            </>
          ) : (
            <button className="landing__cta landing__cta--primary" onClick={onGuest}>
              ENTER AS GUEST
            </button>
          )}
        </div>
        <div className="landing__footer-meta">
          <span>CLIENT-SIDE SIMULATION</span>
          <span>SUPABASE PRESENCE</span>
          <span>NO INSTALL</span>
        </div>
      </footer>

      {authMode ? (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          social={social}
          error={error}
          disabled={disabled}
          onChangeMode={setAuthMode}
        />
      ) : null}
    </div>
  )
}

function AuthModal({
  mode,
  onClose,
  social,
  error,
  disabled,
  onChangeMode,
}: {
  mode: 'in' | 'up'
  onClose: () => void
  social: LandingSocial
  error?: string | null
  disabled?: boolean
  onChangeMode: (mode: 'in' | 'up') => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => !el.hasAttribute('disabled'))
    focusables()[0]?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusables()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      previous?.focus?.()
    }
  }, [])

  return (
    <div
      className="auth-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="auth-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        ref={panelRef}
      >
        <header className="auth-modal__head">
          <div>
            <span className="auth-modal__eyebrow">NEXUS // CITIZEN ACCESS</span>
            <h2 id="auth-modal-title">{mode === 'in' ? 'LINK IN' : 'CREATE CITIZEN'}</h2>
          </div>
          <button className="auth-modal__close" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </header>
        <div className="auth-modal__tabs">
          <button
            className={mode === 'in' ? 'auth-modal__tab--on' : ''}
            onClick={() => onChangeMode('in')}
          >
            LOGIN
          </button>
          <button
            className={mode === 'up' ? 'auth-modal__tab--on' : ''}
            onClick={() => onChangeMode('up')}
          >
            CREATE CITIZEN
          </button>
        </div>
        <AccountGate
          key={mode}
          social={social}
          error={error}
          disabled={disabled}
          initialMode={mode}
        />
        <p className="auth-modal__foot">
          Accounts are optional infrastructure for the social mesh. The city itself runs entirely on
          your device.
        </p>
      </div>
    </div>
  )
}
