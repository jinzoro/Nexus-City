import { useCityStore } from '../state/useCityStore'
import { Icon } from './Icons'

const STEPS = [
  {
    title: 'READ THE CITY',
    body: 'Drag to pan, scroll or pinch to zoom. The city resolves from district silhouettes down to individual windows and rooflines.',
    icon: 'map' as const,
    color: '#22e6ff',
  },
  {
    title: 'OPEN ANYTHING',
    body: 'Hover a structure for telemetry. Click to open its node record, double-click to focus it, or enter the facility to see the interior.',
    icon: 'enter' as const,
    color: '#ff4fa3',
  },
  {
    title: 'FOLLOW THE SMALL LIVES',
    body: 'At street zoom, citizens, vehicles and trains are individually selectable. Follow a signal and the camera will track it.',
    icon: 'people' as const,
    color: '#ffb347',
  },
  {
    title: 'CAPTURE + SCAN',
    body: 'Press F for photo mode, V for structural scan, and B or the photo bar to save a vantage point you can return to.',
    icon: 'scan' as const,
    color: '#63ff9b',
  },
]

const KEYS = [
  ['CTRL K / /', 'City search + actions'],
  ['M S T Y N P', 'Open terminal panels'],
  ['F', 'Photo mode'],
  ['V', 'Structural scan'],
  ['O / 0', 'Overview / reset camera'],
  ['?', 'Reopen this orientation'],
  ['ESC', 'Close the topmost layer'],
]

export function Onboarding() {
  const introDone = useCityStore((s) => s.introDone)
  const onboardingDone = useCityStore((s) => s.onboardingDone)
  const helpOpen = useCityStore((s) => s.helpOpen)
  const finishOnboarding = useCityStore((s) => s.finishOnboarding)
  const setHelpOpen = useCityStore((s) => s.setHelpOpen)

  if (!introDone || (onboardingDone && !helpOpen)) return null

  return (
    <div className="onboarding-layer" onMouseDown={(e) => { if (e.target === e.currentTarget) finishOnboarding() }}>
      <div className="onboarding-panel">
        <div className="onboarding-panel__head">
          <div>
            <span className="onboarding-panel__eyebrow">CIVIC ORIENTATION // CAVERN 07</span>
            <h2>WELCOME TO NEXUS</h2>
            <p>You are inside a sealed city. The interface is the skyline.</p>
          </div>
          <button className="icon-btn icon-btn--small" onClick={() => (helpOpen ? setHelpOpen(false) : finishOnboarding())} title="Close orientation">
            <Icon name="close" size={15} />
          </button>
        </div>

        <div className="onboarding-steps">
          {STEPS.map((step) => (
            <article key={step.title} className="onboarding-step" style={{ borderColor: `${step.color}33` }}>
              <span className="onboarding-step__icon" style={{ color: step.color, background: `${step.color}14` }}>
                <Icon name={step.icon} size={18} />
              </span>
              <strong style={{ color: step.color }}>{step.title}</strong>
              <p>{step.body}</p>
            </article>
          ))}
        </div>

        <div className="onboarding-keys">
          <span className="onboarding-keys__label">SHORTCUT RAIL</span>
          <div className="onboarding-keys__grid">
            {KEYS.map(([key, label]) => (
              <div key={key}>
                <kbd>{key}</kbd>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="onboarding-panel__foot">
          <span><span className="live-dot" /> CIVIC MESH ONLINE</span>
          <button className="mini-btn mini-btn--primary" onClick={finishOnboarding}>
            <Icon name="enter" size={13} /> ENTER THE CITY
          </button>
        </div>
        <span className="onboarding-panel__corner onboarding-panel__corner--tl" />
        <span className="onboarding-panel__corner onboarding-panel__corner--br" />
      </div>
    </div>
  )
}
