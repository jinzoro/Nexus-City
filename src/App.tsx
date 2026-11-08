import { useEffect, useRef, useState } from 'react'
import type { CityData } from './types'
import { CityEngine } from './engine/CityEngine'
import { generateCity, getDistrict, CITY_SEED_DEFAULT } from './data/city'
import { createRandomEvent } from './data/events'
import { ambient } from './audio/ambient'
import { useCityStore } from './state/useCityStore'
import { useSocialStore } from './social/useSocialStore'
import { AccountGate } from './components/AccountGate'
import { PlayerHud } from './components/PlayerHud'
import { TopBar } from './components/TopBar'
import { BottomNav } from './components/BottomNav'
import { SideControls } from './components/SideControls'
import { EventFeed } from './components/EventFeed'
import { HoverTooltip } from './components/HoverTooltip'
import { SelectionPanel } from './components/SelectionPanel'
import { SearchPalette } from './components/SearchPalette'
import { Minimap } from './components/Minimap'
import { Panels } from './components/panels/Panels'
import { FacilityView } from './components/FacilityView'
import { Intro } from './components/Intro'
import { ToastStack } from './components/ToastStack'
import { EntityCard } from './components/EntityCard'
import { PhotoModeBar } from './components/PhotoModeBar'
import { NewsTicker } from './components/NewsTicker'
import { Onboarding } from './components/Onboarding'
import { MobileHint } from './components/MobileHint'
import { Icon } from './components/Icons'
import { createNewsItem } from './data/world'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/** Map the wall-clock hour onto the cavern's artificial day cycle. */
function daylightForClock(now: Date) {
  const hour = now.getHours() + now.getMinutes() / 60
  // Peaks at 13:00, trough at 01:00 — the cavern never goes fully black.
  const cycle = Math.cos(((hour - 13) / 24) * Math.PI * 2)
  return clamp(0.12 + ((cycle + 1) / 2) * 0.88, 0.12, 1)
}

/** Convert a store clock ("HH:MM:SS") onto today's date for the cycle math. */
function clockToDate(clock: string) {
  const [h, m, s] = clock.split(':').map(Number)
  const d = new Date()
  d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, Number.isFinite(s) ? s : 0, 0)
  return d
}

/** Weather label → renderer presentation. */
function weatherKindForState(label: string) {
  if (label.includes('DRIZZLE')) return 'rain' as const
  if (label.includes('HAZE')) return 'haze' as const
  if (label.includes('FESTIVAL')) return 'festival' as const
  return 'clear' as const
}

/** Day-cycle phases for the HUD label. */
function phaseLabel(daylight: number) {
  if (daylight >= 0.8) return 'ARTIFICIAL NOON'
  if (daylight >= 0.55) return 'SHIFT CYCLE'
  if (daylight >= 0.3) return 'CONDENSER DUSK'
  return 'DEEP NIGHT CYCLE'
}

export default function App() {
  const [city, setCity] = useState<CityData | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const introDone = useCityStore((s) => s.introDone)
  const finishIntro = useCityStore((s) => s.finishIntro)
  const selectedId = useCityStore((s) => s.selectedId)
  const selectedEntity = useCityStore((s) => s.selectedEntity)
  const activePanel = useCityStore((s) => s.activePanel)
  const camera = useCityStore((s) => s.camera)
  const district = getDistrict(camera.district)
  const fps = useCityStore((s) => s.fps)
  const audioEnabled = useCityStore((s) => s.audioEnabled)
  const photoMode = useCityStore((s) => s.photoMode)
  const scanMode = useCityStore((s) => s.scanMode)
  const weather = useCityStore((s) => s.weather)
  const clock = useCityStore((s) => s.clock)
  const quality = useCityStore((s) => s.quality)
  const onboardingDone = useCityStore((s) => s.onboardingDone)

  const socialEnabled = useSocialStore((s) => s.enabled)
  const socialStatus = useSocialStore((s) => s.status)
  const socialProfile = useSocialStore((s) => s.profile)
  const socialAuthError = useSocialStore((s) => s.authError)
  const socialSignIn = useSocialStore((s) => s.signIn)
  const socialSignUp = useSocialStore((s) => s.signUp)
  const socialSignOut = useSocialStore((s) => s.signOut)
  const socialClearAuthError = useSocialStore((s) => s.clearAuthError)
  const social = {
    enabled: socialEnabled,
    status: socialStatus,
    profile: socialProfile,
    authError: socialAuthError,
    signIn: socialSignIn,
    signUp: socialSignUp,
    signOut: socialSignOut,
    clearAuthError: socialClearAuthError,
  }

  // Init social on mount
  useEffect(() => {
    if (!social.enabled) return
    useSocialStore.getState().init()
  }, [social.enabled])

  useEffect(() => {
    if (city) useCityStore.getState().setCity(city)
  }, [city])

  // Engine lifecycle — only after auth
  useEffect(() => {
    if (!social.enabled || social.status !== 'online' || !social.profile) {
      setCity(null)
      return
    }
    const handle = window.setTimeout(() => setCity(generateCity(CITY_SEED_DEFAULT)), 460)
    return () => window.clearTimeout(handle)
  }, [social.enabled, social.status, social.profile])

  // Engine lifecycle
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !city) return
    const engine = new CityEngine(canvas, city, {
      onHover: (building, x, y) => useCityStore.getState().setHover(building, x, y),
      onSelect: (building) => useCityStore.getState().setSelected(building),
      onSelectEntity: (entity) => {
        const state = useCityStore.getState()
        if (entity) state.selectEntity(entity)
        else state.clearEntity()
      },
      onFollowChange: (following) => useCityStore.getState().setFollowingEntity(following),
      onCamera: (info) => {
        const state = useCityStore.getState()
        state.setCamera(info)
        state.visitDistrict(info.district)
      },
      onAutoQuality: (scale) => {
        useCityStore.getState().pushToast({
          title: 'RENDER AUTO-TUNE',
          message: `Frame rate dipped — internal buffer reduced to 1:${scale.toFixed(1)}.`,
          severity: 'info',
        })
      },
    })
    useCityStore.getState().setEngine(engine)
    engine.setQuality(useCityStore.getState().quality)
    engine.setPhotoMode(useCityStore.getState().photoMode)
    engine.setScanMode(useCityStore.getState().scanMode)

    const deep = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const nodeId = deep.get('node')
    const bookmarkCell = deep.get('cell')
    if (nodeId) {
      const building = city.buildings.find((b) => b.id === nodeId)
      if (building) {
        useCityStore.getState().setSelected(building)
        engine.focusBuilding(building, 1.2)
      }
    } else if (bookmarkCell) {
      const [cx, cy, z] = bookmarkCell.split(',').map(Number)
      if (Number.isFinite(cx) && Number.isFinite(cy)) {
        engine.focusCell(cx, cy, Number.isFinite(z) ? z : 0.8)
      }
    } else if (deep.get('view') === 'overview') {
      engine.overview()
    }

    const observer = new ResizeObserver(() => engine.resize())
    observer.observe(canvas)
    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', onResize)
      engine.destroy()
      useCityStore.getState().setEngine(null)
    }
  }, [city])

  // Keep engine render modes in sync with UI state.
  useEffect(() => {
    useCityStore.getState().engine?.setPhotoMode(photoMode)
  }, [photoMode])

  useEffect(() => {
    useCityStore.getState().engine?.setScanMode(scanMode)
  }, [scanMode])

  useEffect(() => {
    useCityStore.getState().engine?.setQuality(quality)
  }, [quality])

  // Deep links: the hash always points at the current node, or the camera cell in photo mode.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (selectedId) {
      url.hash = `node=${selectedId}`
    } else if (url.hash.startsWith('#node=')) {
      url.hash = ''
    } else {
      return
    }
    window.history.replaceState(null, '', url.toString())
  }, [selectedId])

  useEffect(() => {
    const onHashChange = () => {
      const deep = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const cell = deep.get('cell')
      const state = useCityStore.getState()
      if (cell) {
        const [cx, cy, z] = cell.split(',').map(Number)
        if (Number.isFinite(cx) && Number.isFinite(cy)) state.engine?.focusCell(cx, cy, Number.isFinite(z) ? z : 0.8)
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Clock — drives the in-game day/night cycle + phase label.
  useEffect(() => {
    const update = () => {
      const d = new Date()
      const state = useCityStore.getState()
      state.setClock(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(
          d.getSeconds(),
        ).padStart(2, '0')}`,
      )
      // daylight no longer fed to engine for raw pixel output
      // const daylight = daylightForClock(d)
      // state.engine?.setEnvironment({ daylight })
    }
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [])

  // Weather presentation follows the store's weather label.
  useEffect(() => {
    // weather no longer fed to engine for raw pixel output
    // useCityStore.getState().engine?.setEnvironment({ weather: weatherKindForState(weather.label) })
  }, [weather.label])

  // Ambient audio follows the camera district
  useEffect(() => {
    if (audioEnabled) ambient.setDistrict(camera.district)
  }, [camera.district, audioEnabled])

  // Living city stats
  useEffect(() => {
    const timer = window.setInterval(() => {
      const state = useCityStore.getState()
      const powerEvent = state.events.some((e) => e.type === 'power')
      const networkEvent = state.events.some((e) => e.type === 'network')
      const transitEvent = state.events.some((e) => e.type === 'transit')
      const festival = state.events.some((e) => e.type === 'festival')
      state.setStats({
        power: clamp(state.stats.power + (powerEvent ? -2.4 : 0.9) + (Math.random() - 0.5) * 1.6, 46, 99.6),
        network: clamp(state.stats.network + (networkEvent ? -3.1 : 0.7) + (Math.random() - 0.5) * 1.9, 42, 99.8),
        stability: clamp(state.stats.stability + (powerEvent || networkEvent ? -1.6 : 0.6) + (Math.random() - 0.5) * 1.1, 48, 99.4),
        traffic: clamp(state.stats.traffic + (festival ? 2.2 : 0.4) + (Math.random() - 0.5) * 3.4, 24, 99),
        transit: clamp(state.stats.transit + (transitEvent ? -2.8 : 0.5) + (Math.random() - 0.5) * 2.2, 30, 99),
        air: clamp(state.stats.air + (Math.random() - 0.5) * 1.8, 38, 92),
        temperature: clamp(18.6 + Math.sin(Date.now() / 240000) * 1.8 + (Math.random() - 0.5) * 0.4, 16, 24),
      })
    }, 2800)
    return () => window.clearInterval(timer)
  }, [])

  // FPS sampler
  useEffect(() => {
    let frames = 0
    let last = performance.now()
    let raf = 0
    const loop = (now: number) => {
      frames += 1
      if (now - last >= 1000) {
        useCityStore.getState().setFps(Math.round((frames * 1000) / (now - last)))
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Event simulation — the store centralizes lifecycle (engine sync, weather,
  // reputation, news, goals); App only schedules the random spawning/cleanup.
  useEffect(() => {
    if (!introDone) return
    let disposed = false
    const timers = new Set<number>()

    const spawn = () => {
      if (disposed) return
      const state = useCityStore.getState()
      const active = new Set(state.events.map((e) => e.type))
      const event = createRandomEvent(active)
      state.dispatchEvent(event)
      const timer = window.setTimeout(() => {
        if (!disposed) useCityStore.getState().removeEvent(event.id)
      }, event.duration)
      timers.add(timer)
    }

    const first = window.setTimeout(spawn, 11000)
    const interval = window.setInterval(spawn, 27000)

    return () => {
      disposed = true
      window.clearTimeout(first)
      window.clearInterval(interval)
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [introDone])

  // Civic newsroom: a new item every 38 seconds once the city is live.
  useEffect(() => {
    if (!introDone) return
    const timer = window.setInterval(() => {
      const state = useCityStore.getState()
      state.pushNews(createNewsItem(state.city, state.camera.district))
    }, 38000)
    return () => window.clearInterval(timer)
  }, [introDone])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        useCityStore.getState().setSearchOpen(true)
        return
      }
      if (typing) return

      const state = useCityStore.getState()
      const key = event.key.toLowerCase()

      if (event.key === 'Escape') {
        if (state.helpOpen) state.setHelpOpen(false)
        else if (state.photoMode) state.setPhotoMode(false)
        else if (state.searchOpen) state.setSearchOpen(false)
        else if (state.facilityOpen) state.closeFacility()
        else if (state.activePanel) state.setPanel(null)
        else if (state.selectedEntity) state.clearEntity()
        else state.clearSelection()
        return
      }

      const panels = { m: 'map', s: 'sectors', t: 'transit', y: 'systems', n: 'messages', p: 'profile', g: 'settings' } as const
      if (key in panels) {
        state.togglePanel(panels[key as keyof typeof panels])
        return
      }
      if (key === 'o') state.engine?.overview()
      if (key === 'f') state.togglePhotoMode()
      if (key === 'v') state.toggleScanMode()
      if (key === '?') state.setHelpOpen(!state.helpOpen)
      if (key === '0') state.engine?.resetView()
      if (key === '+' || key === '=') state.engine?.zoomBy(1.32)
      if (key === '-') state.engine?.zoomBy(1 / 1.32)
      if (key === '/') {
        event.preventDefault()
        state.setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      {!social.enabled || social.status !== 'online' || !social.profile ? (
        <div className="login-gate" data-login>
          <div className="login-gate__card">
            <div className="login-gate__head">
              <span className="login-gate__badge">NEXUS</span>
              <h1>CITIZEN ACCESS</h1>
            </div>
            <p className="login-gate__tag">AUTHENTICATION REQUIRED TO ENTER THE CITY</p>
            {!social.enabled ? (
              <p className="login-gate__offline">
                SOCIAL MESH OFFLINE — set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to
                enable sign-in.
              </p>
            ) : null}
            <AccountGate social={social} error={social.authError} disabled={!social.enabled} />
            <div className="login-gate__foot">NEXUS // UNDERGROUND MEGAPOLIS</div>
          </div>
        </div>
      ) : (
        <div
          className={`app ${selectedId ? 'app--selection' : ''} ${
            selectedEntity ? 'app--entity' : ''
          } ${activePanel ? 'app--panel' : ''} ${photoMode ? 'app--photo' : ''} ${scanMode ? 'app--scan' : ''}`}
        >
          <canvas ref={canvasRef} className="city-canvas" aria-label="NEXUS underground city" />
          {/* cinematic overlays removed per owner request */}
          <div className="hud">
            <TopBar />
            <EventFeed />
            <PlayerHud />
            <SideControls />
            <div className="hud-minimap">
              <div className="hud-minimap__head">
                <span><span className="live-dot" /> CITY GRID</span>
                <span>{Math.round(camera.zoom * 100)}%</span>
              </div>
              <Minimap size={152} />
              <div className="hud-minimap__foot">
                <span style={{ color: district.color }}>{district.code} // {district.name}</span>
                <span>{Math.round(camera.cellX)}:{Math.round(camera.cellY)}</span>
              </div>
            </div>
            <div className="coord-rail">
              <div className="coord-rail__row">
                <span className="coord-rail__key">CAM</span>
                <span>{Math.round(camera.x)} / {Math.round(camera.y)}</span>
              </div>
              <div className="coord-rail__row">
                <span className="coord-rail__key">CELL</span>
                <span>{Math.round(camera.cellX)}:{Math.round(camera.cellY)}</span>
              </div>
              <div className="coord-rail__row">
                <span className="coord-rail__key">LEVEL</span>
                <span style={{ color: district.color }}>{camera.level}</span>
              </div>
              <div className="coord-rail__row coord-rail__row--muted">
                <span className="coord-rail__key">FPS</span>
                <span className={fps >= 50 ? 'coord-rail__good' : fps >= 30 ? 'coord-rail__warn' : 'coord-rail__bad'}>{fps}</span>
                <span className="coord-rail__sep">/</span>
                <span>RENDER {Math.round(camera.zoom * 100)}%</span>
              </div>
              <div className="coord-rail__row coord-rail__row--muted">
                <span className="coord-rail__key">CYCLE</span>
                <span>{phaseLabel(daylightForClock(clockToDate(clock)))}</span>
              </div>
            </div>
            <div className="hud-help">
              <span><Icon name="search" size={10} /> CTRL+K SEARCH</span>
              <span><Icon name="map" size={10} /> DRAG TO PAN</span>
              <span><Icon name="target" size={10} /> SCROLL TO ZOOM</span>
            </div>
            <SelectionPanel />
            <EntityCard />
            <HoverTooltip />
            <BottomNav />
            <NewsTicker />
          </div>
          <Panels />
          <FacilityView />
          <SearchPalette />
          <PhotoModeBar />
          <Onboarding />
          <ToastStack />
          <MobileHint />
          {!introDone ? <Intro city={city} onEnter={finishIntro} /> : null}
        </div>
      )}
    </>
  )
}
