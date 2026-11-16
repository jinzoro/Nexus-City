import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { CityData } from '../types'
import { CITY_SEED_DEFAULT } from '../data/city'
import { FACTIONS } from '../data/world'
import { AccountGate } from './AccountGate'
import { Icon } from './Icons'

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

const FEATURES = [
  {
    icon: 'systems' as const,
    title: 'LIVING SKYLINE',
    body: 'Day/night tint, rolling civic events, blackouts and festivals change the skyline in real time — the city runs whether you watch or not.',
  },
  {
    icon: 'power' as const,
    title: 'DISTRICT ECONOMY',
    body: 'Power demand, income and crime feed each other. A grid fault cascades into transit holds, street crime and emergency raids.',
  },
  {
    icon: 'messages' as const,
    title: 'CITIZEN MESH',
    body: 'Sign in, walk the streets, enter buildings on foot, talk to the occupants and signal other operators across the cavern.',
  },
]

/**
 * Marketing / entry site for the game. The city itself is not rendered here —
 * the page is a static presentation (skyline art, sectors, features, factions)
 * and the live simulation only boots once somebody enters.
 */
export function Landing({ city, social, error, disabled = false, leaving = false, onGuest }: LandingProps) {
  const [authMode, setAuthMode] = useState<'in' | 'up' | null>(null)
  const enterCity = social.enabled ? () => setAuthMode('up') : onGuest

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
      <div className="landing__bg" aria-hidden="true">
        <span className="landing__bg-grid" />
        <span className="landing__bg-glow landing__bg-glow--cyan" />
        <span className="landing__bg-glow landing__bg-glow--pink" />
      </div>

      <header className="landing__nav">
        <span className="landing__brand">NEXUS<span>//</span></span>
        <nav className="landing__navlinks" aria-label="Sections">
          <a href="#districts">SECTORS</a>
          <a href="#systems">SYSTEMS</a>
          <a href="#factions">FACTIONS</a>
        </nav>
        <div className="landing__nav-actions">
          {social.enabled ? (
            <>
              <button className="landing__nav-cta" onClick={() => setAuthMode('in')} disabled={disabled}>
                LOGIN
              </button>
              <button
                className="landing__nav-cta landing__nav-cta--primary"
                onClick={() => setAuthMode('up')}
                disabled={disabled}
              >
                CREATE CITIZEN
              </button>
            </>
          ) : (
            <button className="landing__nav-cta landing__nav-cta--primary" onClick={onGuest}>
              ENTER AS GUEST
            </button>
          )}
        </div>
      </header>

      <section className="landing__hero">
        <div className="landing__hero-copy">
          <p className="landing__eyebrow">
            <span className="live-dot" /> CAVERN 07 · CIVIC MESH ONLINE
          </p>
          <h1 className="landing__title">
            NEXUS<span>//</span>
          </h1>
          <p className="landing__kicker">UNDERGROUND MEGAPOLIS</p>
          <p className="landing__tagline">
            Nine sectors, 2,500 towers and seven million souls under one cavern ceiling.
            Maglev lines, street traffic and a full night cycle keep running whether you
            watch or not — step in and the city answers.
          </p>
          <div className="landing__ctas">
            <button
              className="landing__cta landing__cta--primary"
              onClick={enterCity}
              disabled={social.enabled ? disabled : undefined}
            >
              {social.enabled ? 'ENTER THE CITY' : 'ENTER AS GUEST'}
              <Icon name="enter" size={14} />
            </button>
            <a className="landing__cta landing__cta--ghost" href="#systems">
              HOW IT PLAYS
            </a>
          </div>
          <ul className="landing__assurances">
            <li>NO INSTALL</li>
            <li>RUNS IN YOUR BROWSER</li>
            <li>FREE TO ENTER</li>
          </ul>
          {!social.enabled ? (
            <p className="landing__offline">
              SOCIAL MESH OFFLINE — set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to
              enable citizen accounts. The city itself still runs locally once you enter.
            </p>
          ) : null}
        </div>

        <div className="landing__hero-art">
          <figure className="landing__frame">
            <div className="landing__frame-bar">
              <span className="landing__frame-tag">CAVERN 07 // SECTOR 09</span>
              <span className="landing__frame-live"><span className="live-dot" /> LIVE BUILD</span>
            </div>
            <img
              className="landing__frame-img"
              src="/og-image.png"
              alt="Isometric pixel-art cyberpunk skyline glowing with neon beneath a cavern ceiling"
            />
            <span className="landing__frame-scan" aria-hidden="true" />
            <figcaption className="landing__frame-foot">
              <span>SEED {CITY_SEED_DEFAULT}</span>
              <span>MAGLEV ONLINE</span>
              <span>NIGHT CYCLE</span>
            </figcaption>
          </figure>
          <span className="landing__hero-badge">
            <strong>{city ? city.districts.length : '—'}</strong> SECTORS · ONE CAVERN
          </span>
        </div>

        <div className="landing__statline">
          {stats.map((stat) => (
            <div key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>

        <a className="landing__scroll" href="#districts" aria-label="Scroll to sectors">
          <span>SCROLL</span>
          <i />
        </a>
      </section>

      <section className="landing__section" id="districts">
        <div className="landing__section-head">
          <span className="landing__eyebrow-label">01 // THE CAVERN</span>
          <h2>Nine sectors, one machine</h2>
          <p>Every district runs its own economy, palette and power draw. Walk in and the HUD follows you.</p>
        </div>
        <div className="landing__districts">
          {(city?.districts ?? []).map((district, index) => (
            <article
              key={district.id}
              className="landing__district"
              style={{ '--district': district.color, '--district-accent': district.accent } as CSSProperties}
            >
              <span className="landing__district-index">{String(index + 1).padStart(2, '0')}</span>
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
          <span className="landing__eyebrow-label">02 // SYSTEMS</span>
          <h2>The city is the interface</h2>
          <p>No cards, no dashboards. Drag to pan, scroll to zoom, click a tower to open its record.</p>
        </div>
        <div className="landing__features">
          {FEATURES.map((feature) => (
            <article key={feature.title}>
              <span className="landing__feature-icon">
                <Icon name={feature.icon} size={20} />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing__section" id="factions">
        <div className="landing__section-head">
          <span className="landing__eyebrow-label">03 // FACTIONS</span>
          <h2>Six factions hold the floor</h2>
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

      <section className="landing__closer">
        <div>
          <h2>Ready to drop in?</h2>
          <p>The cavern is already running. Take a citizen handle or walk in as a guest.</p>
        </div>
        <button
          className="landing__cta landing__cta--primary"
          onClick={enterCity}
          disabled={social.enabled ? disabled : undefined}
        >
          {social.enabled ? 'ENTER THE CITY' : 'ENTER AS GUEST'}
          <Icon name="enter" size={14} />
        </button>
      </section>

      <footer className="landing__footer">
        <div>
          <span className="landing__brand">NEXUS<span>//</span></span>
          <p>UNDERGROUND MEGAPOLIS · CAVERN 07 · SEED {CITY_SEED_DEFAULT}</p>
        </div>
        <nav className="landing__footer-links" aria-label="Footer">
          <a href="#districts">SECTORS</a>
          <a href="#systems">SYSTEMS</a>
          <a href="#factions">FACTIONS</a>
        </nav>
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
