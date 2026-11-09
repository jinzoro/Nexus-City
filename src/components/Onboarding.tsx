import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useCityStore } from '../state/useCityStore'
import { Icon, type IconName } from './Icons'

type TabId = 'start' | 'move' | 'camera' | 'terminal' | 'life' | 'social' | 'facility' | 'keys'

const TABS: Array<{ id: TabId; label: string; icon: IconName; color: string }> = [
  { id: 'start', label: 'START', icon: 'info', color: '#22e6ff' },
  { id: 'move', label: 'MOVE', icon: 'people', color: '#ffb347' },
  { id: 'camera', label: 'CAMERA', icon: 'map', color: '#22e6ff' },
  { id: 'terminal', label: 'TERMINAL', icon: 'grid', color: '#ff4fa3' },
  { id: 'life', label: 'CITY LIFE', icon: 'clock', color: '#63ff9b' },
  { id: 'social', label: 'SOCIAL', icon: 'profile', color: '#ff4fa3' },
  { id: 'facility', label: 'FACILITY', icon: 'enter', color: '#63ff9b' },
  { id: 'keys', label: 'KEYS', icon: 'scan', color: '#ffb347' },
]

const CONTENT: Record<Exclude<TabId, 'keys'>, { intro: string; rows: Array<[string, string]> }> = {
  start: {
    intro:
      'NEXUS is a sealed underground megapolis rendered as a living isometric city. You enter as a linked citizen: your account, avatar and position persist between visits.',
    rows: [
      ['LINK', 'Sign in at the access gate, or create a citizen. Your handle seeds your avatar suit and sigil.'],
      ['HUD', 'Top bar: clock, weather and district telemetry. Bottom rail: terminal panels. Left: your citizen readout with MODE, STOP and LOG OUT.'],
      ['ORIENTATION', 'This manual opens on your first visit and any time with ? or the help button on the side rail. ESC closes the topmost layer.'],
    ],
  },
  move: {
    intro:
      'Your citizen walks the streets in CITIZEN mode. SURVEY mode turns the pointer into a pure inspection tool.',
    rows: [
      ['W A S D / ARROWS', 'Walk relative to the screen. Hold SHIFT to sprint. Buildings block you; you slide along their walls.'],
      ['DOUBLE-CLICK STREET', 'Send your citizen walking to that spot. STOP, or pressing any movement key, cancels the route.'],
      ['C', 'Toggle CITIZEN / SURVEY. In SURVEY, clicks select structures by silhouette and double-click focuses the camera.'],
      ['CLICK BUILDING', 'In CITIZEN mode a single click opens the node record; a double-click focuses it.'],
      ['PERSIST', 'Your position is saved locally and restored next visit. Walking pauses while any panel, search, help or facility view is open.'],
    ],
  },
  camera: {
    intro: 'The city resolves from district silhouettes down to individual windows and rooflines as you zoom.',
    rows: [
      ['DRAG / WHEEL', 'Drag to pan. Scroll or pinch to zoom.'],
      ['O / 0', 'Overview of the whole cavern / reset to the default view. + and − zoom in steps.'],
      ['F', 'Photo mode: the HUD hides and a capture bar offers SCAN, SAVE VANTAGE, COPY LINK and EXPORT PNG.'],
      ['B', 'While in photo mode, pin the current camera as a saved vantage. Vantages live in the MAP panel.'],
      ['V', 'Structural scan overlay.'],
      ['FOLLOW', 'Select a citizen, vehicle or train at street zoom and follow it; the camera tracks until you drag away.'],
    ],
  },
  terminal: {
    intro: 'Seven terminal panels cover the city. Hotkeys never fire while you type in an input.',
    rows: [
      ['M / X / T', 'MAP (districts + saved vantages), SECTORS (district telemetry), TRANSIT (lines and vehicles).'],
      ['Y / N', 'SYSTEMS (city infrastructure) and MESSAGES (events + civic news).'],
      ['P / G', 'PROFILE (identity, wardrobe, account, LOG OUT) and SETTINGS.'],
      ['CTRL K or /', 'City search: nodes, districts, owners. Type > for actions like photo mode or this manual.'],
      ['ESC', 'Close the topmost layer: help, photo, search, facility, panel, then selection.'],
    ],
  },
  life: {
    intro: 'The cavern is simulated: light, traffic, events and interior occupancy all follow the artificial day cycle.',
    rows: [
      ['DISTRICTS', 'Each district has its own palette, architecture and economy. The minimap rail names the district under the camera.'],
      ['SMALL LIVES', 'At street zoom, citizens, vehicles and trains are individually selectable with their own records.'],
      ['EVENTS', 'Random civic events — festivals, outages, drifts — surface in the feed and alter the city while they run.'],
      ['CLOCK', 'The cavern never goes fully black, but night shifts empty the streets and dim the towers.'],
    ],
  },
  social: {
    intro: 'The social mesh runs on Supabase: accounts, avatars, live chat and presence.',
    rows: [
      ['IDENTITY', 'Change suit, visor and build in PROFILE; rename any time. Your avatar walks the city as you.'],
      ['CHANNELS', 'Every building has a live chat channel. Messages sync across linked citizens.'],
      ['PRESENCE', 'Linked visitors inside a facility appear as named avatars on its floor plan.'],
      ['LOG OUT', 'The red LOG OUT button on your citizen HUD (and in PROFILE) ends the session and returns you to the gate.'],
    ],
  },
  facility: {
    intro: 'Every structure has an interior. Layouts derive from the building type, district and seed — no two towers read the same.',
    rows: [
      ['ENTER', 'Select a building, then ENTER FACILITY in its node record.'],
      ['FLOOR PLAN / SECTION', 'Toggle between a top-down floor plan with furniture and wandering occupants, and the exterior cross-section.'],
      ['FLOORS', 'The floor strip switches levels; each level has its own rooms, doors and furniture.'],
      ['PEOPLE', 'Occupants wander in real time, scaled by occupancy and the hour. Click one for their readout.'],
      ['SYSTEMS', 'Power, security and comms toggles change the interior; cutting power darkens the plan.'],
    ],
  },
}

const KEYS: Array<[string, string]> = [
  ['W A S D / ARROWS', 'Walk (citizen mode)'],
  ['SHIFT', 'Sprint'],
  ['C', 'Citizen / survey mode'],
  ['DOUBLE-CLICK', 'Walk to street / focus building'],
  ['M X T Y N P G', 'Terminal panels'],
  ['CTRL K / /', 'Search + actions'],
  ['F', 'Photo mode'],
  ['B', 'Save vantage (photo mode)'],
  ['V', 'Structural scan'],
  ['O / 0', 'Overview / reset camera'],
  ['+ / -', 'Zoom'],
  ['?', 'This manual'],
  ['ESC', 'Close topmost layer'],
]

export function Onboarding() {
  const introDone = useCityStore((s) => s.introDone)
  const onboardingDone = useCityStore((s) => s.onboardingDone)
  const helpOpen = useCityStore((s) => s.helpOpen)
  const finishOnboarding = useCityStore((s) => s.finishOnboarding)
  const setHelpOpen = useCityStore((s) => s.setHelpOpen)
  const [tab, setTab] = useState<TabId>('start')

  if (!introDone || (onboardingDone && !helpOpen)) return null

  const active = TABS.find((t) => t.id === tab) ?? TABS[0]
  const content = tab === 'keys' ? null : CONTENT[tab]

  return (
    <div className="onboarding-layer" onMouseDown={(e) => { if (e.target === e.currentTarget) finishOnboarding() }}>
      <div className="onboarding-panel">
        <div className="onboarding-panel__head">
          <div>
            <span className="onboarding-panel__eyebrow">CIVIC ORIENTATION // CAVERN 07</span>
            <h2>{onboardingDone ? 'FIELD MANUAL' : 'WELCOME TO NEXUS'}</h2>
            <p>You are inside a sealed city. The interface is the skyline.</p>
          </div>
          <button className="icon-btn icon-btn--small" onClick={() => (helpOpen ? setHelpOpen(false) : finishOnboarding())} title="Close manual">
            <Icon name="close" size={15} />
          </button>
        </div>

        <div className="manual-tabs" role="tablist" aria-label="Manual sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`manual-tab ${tab === t.id ? 'manual-tab--on' : ''}`}
              style={{ '--tab-color': t.color } as CSSProperties}
              onClick={() => setTab(t.id)}
            >
              <Icon name={t.icon} size={12} /> {t.label}
            </button>
          ))}
        </div>

        <div className="manual-body" style={{ '--tab-color': active.color } as CSSProperties}>
          {content ? (
            <>
              <p className="manual-intro">{content.intro}</p>
              <div className="manual-rows">
                {content.rows.map(([chip, body]) => (
                  <div key={chip} className="manual-row">
                    <span className="manual-row__chip">{chip}</span>
                    <p>{body}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
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
          )}
        </div>

        <div className="onboarding-panel__foot">
          <span><span className="live-dot" /> CIVIC MESH ONLINE</span>
          {onboardingDone ? (
            <button className="mini-btn mini-btn--primary" onClick={() => setHelpOpen(false)}>
              <Icon name="close" size={13} /> CLOSE MANUAL
            </button>
          ) : (
            <button className="mini-btn mini-btn--primary" onClick={finishOnboarding}>
              <Icon name="enter" size={13} /> ENTER THE CITY
            </button>
          )}
        </div>
        <span className="onboarding-panel__corner onboarding-panel__corner--tl" />
        <span className="onboarding-panel__corner onboarding-panel__corner--br" />
      </div>
    </div>
  )
}