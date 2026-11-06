import { create } from 'zustand'
import type {
  Bookmark,
  Building,
  CameraInfo,
  CityData,
  CityEvent,
  DistrictId,
  FactionId,
  NewsItem,
  OverlayMode,
  QualityLevel,
  SelectedEntity,
} from '../types'
import type { CityEngine } from '../engine/CityEngine'
import { ambient } from '../audio/ambient'
import { defaultBookmarks } from '../data/world'

export type PanelId = 'map' | 'sectors' | 'transit' | 'systems' | 'messages' | 'profile' | null

const STORAGE_KEY = 'nexus-city-progress-v1'

interface PersistedProgress {
  discovered: string[]
  visitedDistricts: DistrictId[]
  tracked: string[]
  bookmarks: Bookmark[]
  quality: QualityLevel
  onboardingDone: boolean
  factionRep: Record<FactionId, number>
  codexFound: string[]
}

function readProgress(): Partial<PersistedProgress> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<PersistedProgress>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const savedProgress = typeof window === 'undefined' ? {} : readProgress()

let persistTimer = 0
function persistSoon() {
  if (typeof window === 'undefined') return
  window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    try {
      const state = useCityStore.getState()
      const payload: PersistedProgress = {
        discovered: state.discovered,
        visitedDistricts: state.visitedDistricts,
        tracked: state.tracked,
        bookmarks: state.bookmarks,
        quality: state.quality,
        onboardingDone: state.onboardingDone,
        factionRep: state.factionRep,
        codexFound: state.codexFound,
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      /* storage unavailable — progress stays in-session */
    }
  }, 260)
}

export interface Toast {
  id: string
  title: string
  message: string
  severity: CityEvent['severity']
}

export interface LogEntry {
  id: string
  time: string
  title: string
  message: string
  severity: CityEvent['severity']
  district?: DistrictId
}

export interface CityStats {
  population: number
  power: number
  network: number
  stability: number
  traffic: number
  transit: number
  air: number
  temperature: number
}

export interface WeatherState {
  label: string
  detail: string
  humidity: number
  wind: number
}

export interface CameraState extends CameraInfo {}

const initialCamera: CameraState = {
  x: 0,
  y: 1188,
  zoom: 0.5,
  cellX: 99,
  cellY: 99,
  district: 'central',
  level: 'DISTRICT',
}

const initialStats: CityStats = {
  population: 12_437_000,
  power: 94.2,
  network: 98.7,
  stability: 91.4,
  traffic: 76,
  transit: 82,
  air: 64,
  temperature: 19,
}

interface CityStore {
  engine: CityEngine | null
  setEngine: (engine: CityEngine | null) => void

  city: CityData | null
  buildingsById: Map<string, Building>
  setCity: (city: CityData) => void
  getBuilding: (id: string | null) => Building | null

  camera: CameraState
  setCamera: (camera: CameraInfo) => void

  hoveredId: string | null
  hoverX: number
  hoverY: number
  setHover: (building: Building | null, x: number, y: number) => void

  selectedId: string | null
  setSelected: (building: Building | null) => void
  clearSelection: () => void

  selectedEntity: SelectedEntity | null
  selectEntity: (entity: SelectedEntity) => void
  clearEntity: () => void
  followingEntity: boolean
  setFollowingEntity: (following: boolean) => void

  photoMode: boolean
  setPhotoMode: (on: boolean) => void
  togglePhotoMode: () => void

  scanMode: boolean
  toggleScanMode: () => void

  quality: QualityLevel
  setQuality: (quality: QualityLevel) => void

  bookmarks: Bookmark[]
  addBookmark: (bookmark: Omit<Bookmark, 'id'>) => void
  removeBookmark: (id: string) => void

  factionRep: Record<FactionId, number>
  adjustRep: (faction: FactionId, delta: number) => void

  codexFound: string[]
  discoverCodex: (id: string) => void

  news: NewsItem[]
  pushNews: (item: NewsItem) => void

  onboardingDone: boolean
  finishOnboarding: () => void
  helpOpen: boolean
  setHelpOpen: (open: boolean) => void

  activePanel: PanelId
  setPanel: (panel: PanelId) => void
  togglePanel: (panel: Exclude<PanelId, null>) => void

  overlay: OverlayMode
  setOverlay: (overlay: OverlayMode) => void

  facilityOpen: boolean
  openFacility: () => void
  closeFacility: () => void

  searchOpen: boolean
  setSearchOpen: (open: boolean) => void

  audioEnabled: boolean
  toggleAudio: () => Promise<void>

  scanlines: boolean
  toggleScanlines: () => void

  introDone: boolean
  finishIntro: () => void

  events: CityEvent[]
  eventLog: LogEntry[]
  addEvent: (event: CityEvent) => void
  removeEvent: (id: string) => void
  addLog: (entry: Omit<LogEntry, 'id' | 'time'> & { time?: string }) => void
  transmit: (text: string) => void

  toasts: Toast[]
  pushToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void

  discovered: string[]
  discover: (id: string) => void
  visitedDistricts: DistrictId[]
  visitDistrict: (id: DistrictId) => void
  tracked: string[]
  toggleTracked: (id: string) => void

  stats: CityStats
  setStats: (stats: Partial<CityStats>) => void
  weather: WeatherState
  setWeather: (weather: WeatherState) => void
  clock: string
  setClock: (clock: string) => void
  fps: number
  setFps: (fps: number) => void
}

const nowTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

const INITIAL_REP: Record<FactionId, number> = {
  civic: 50,
  kuro: 44,
  aureus: 36,
  guild: 52,
  cortex: 41,
  verdant: 58,
}

const SEED_NEWS: NewsItem[] = [
  {
    id: 'news-seed-1',
    headline: 'CEILING CONDENSERS BEGIN MORNING CYCLE',
    body: 'Artificial dawn is on schedule. Expect low haze over the outer ring until 07:10.',
    time: '06:02',
    tone: 'calm',
  },
  {
    id: 'news-seed-2',
    headline: 'MARKET STALLS OPEN EARLY',
    body: 'The Neon Market reports a strong start to the trading cycle. Noodle queues already forming.',
    time: '06:09',
    tone: 'trade',
  },
  {
    id: 'news-seed-3',
    headline: 'MAGLEV CYAN LINE RUNNING NOMINAL',
    body: 'All five cars reporting. Transit authority says the morning spike is within tolerance.',
    time: '06:14',
    tone: 'calm',
  },
]

const seedLog: LogEntry[] = [
  {
    id: 'seed-1',
    time: '06:12:44',
    title: 'CIVIC MESH ONLINE',
    message: 'All nine districts synchronized to the Central Nexus clock.',
    severity: 'info',
  },
  {
    id: 'seed-2',
    time: '06:14:02',
    title: 'WEATHER CONTROL',
    message: 'Ceiling condensers cycling. Artificial dawn scheduled for 06:30.',
    severity: 'info',
  },
  {
    id: 'seed-3',
    time: '06:18:37',
    title: 'PATROL NETWORK',
    message: '42 drone units active above the transit spine. No anomalies.',
    severity: 'info',
  },
]

export const useCityStore = create<CityStore>()((set, get) => ({
  engine: null,
  setEngine: (engine) => set({ engine }),

  city: null,
  buildingsById: new Map(),
  setCity: (city) =>
    set((state) => ({
      city,
      buildingsById: new Map(city.buildings.map((b) => [b.id, b])),
      bookmarks: state.bookmarks.length ? state.bookmarks : defaultBookmarks(city),
    })),
  getBuilding: (id) => (id ? get().buildingsById.get(id) ?? null : null),

  camera: initialCamera,
  setCamera: (camera) => set({ camera }),

  hoveredId: null,
  hoverX: 0,
  hoverY: 0,
  setHover: (building, x, y) => {
    if (!building) {
      if (get().hoveredId !== null) set({ hoveredId: null })
      return
    }
    set({ hoveredId: building.id, hoverX: x, hoverY: y })
  },

  selectedId: null,
  setSelected: (building) => {
    set({ selectedId: building?.id ?? null, selectedEntity: null, followingEntity: false })
    if (building) {
      get().discover(building.id)
      get().engine?.setFollowingEntity(null)
    }
  },
  clearSelection: () => {
    get().engine?.selectBuilding(null)
    set({ selectedId: null })
  },

  selectedEntity: null,
  selectEntity: (entity) => {
    get().engine?.selectBuilding(null)
    set({ selectedEntity: entity, selectedId: null, facilityOpen: false, activePanel: null })
  },
  clearEntity: () => {
    get().engine?.setFollowingEntity(null)
    set({ selectedEntity: null, followingEntity: false })
  },
  followingEntity: false,
  setFollowingEntity: (following) => set({ followingEntity: following }),

  photoMode: false,
  setPhotoMode: (on) => set({ photoMode: on }),
  togglePhotoMode: () => set({ photoMode: !get().photoMode }),

  scanMode: false,
  toggleScanMode: () => {
    const scanMode = !get().scanMode
    set({ scanMode })
    get().pushToast({
      title: scanMode ? 'SCAN MODE ENGAGED' : 'SCAN MODE DISENGAGED',
      message: scanMode ? 'Structural silhouettes and concentrations highlighted.' : 'Returning to clean city view.',
      severity: 'info',
    })
  },

  quality: (savedProgress.quality as QualityLevel) || 'auto',
  setQuality: (quality) => {
    set({ quality })
    get().engine?.setQuality(quality)
    persistSoon()
    get().pushToast({ title: 'RENDER QUALITY', message: `Quality profile set to ${quality.toUpperCase()}.`, severity: 'info' })
  },

  bookmarks: savedProgress.bookmarks && savedProgress.bookmarks.length ? savedProgress.bookmarks : [],
  addBookmark: (bookmark) => {
    const id = `bm-${Date.now().toString(36)}`
    set({ bookmarks: [...get().bookmarks, { ...bookmark, id }].slice(-12) })
    persistSoon()
    get().pushToast({ title: 'VANTAGE SAVED', message: `${bookmark.name} pinned to the camera rail.`, severity: 'info' })
  },
  removeBookmark: (id) => {
    set({ bookmarks: get().bookmarks.filter((b) => b.id !== id) })
    persistSoon()
  },

  factionRep: { ...INITIAL_REP, ...(savedProgress.factionRep ?? {}) },
  adjustRep: (faction, delta) => {
    const current = get().factionRep[faction] ?? 50
    set({ factionRep: { ...get().factionRep, [faction]: Math.max(0, Math.min(100, current + delta)) } })
    persistSoon()
  },

  codexFound: savedProgress.codexFound ?? [],
  discoverCodex: (id) => {
    if (get().codexFound.includes(id)) return
    set({ codexFound: [...get().codexFound, id] })
    persistSoon()
  },

  news: SEED_NEWS,
  pushNews: (item) => set({ news: [item, ...get().news].slice(0, 14) }),

  onboardingDone: savedProgress.onboardingDone ?? false,
  finishOnboarding: () => {
    set({ onboardingDone: true, helpOpen: false })
    persistSoon()
  },
  helpOpen: false,
  setHelpOpen: (helpOpen) => set({ helpOpen }),

  activePanel: null,
  setPanel: (panel) => set({ activePanel: panel, facilityOpen: false, searchOpen: false }),
  togglePanel: (panel) => set({ activePanel: get().activePanel === panel ? null : panel, facilityOpen: false }),

  overlay: 'none',
  setOverlay: (overlay) => {
    get().engine?.setOverlay(overlay)
    set({ overlay })
  },

  facilityOpen: false,
  openFacility: () => set({ facilityOpen: true, activePanel: null }),
  closeFacility: () => set({ facilityOpen: false }),

  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),

  audioEnabled: false,
  toggleAudio: async () => {
    if (get().audioEnabled) {
      ambient.stop()
      set({ audioEnabled: false })
      return
    }
    try {
      await ambient.start(get().camera.district)
      set({ audioEnabled: true })
      get().pushToast({ title: 'AUDIO LINK OPEN', message: 'Ambient city feed routed to local output.', severity: 'info' })
    } catch {
      set({ audioEnabled: false })
      get().pushToast({ title: 'AUDIO LINK FAILED', message: 'Output device refused the connection.', severity: 'warning' })
    }
  },

  scanlines: true,
  toggleScanlines: () => set({ scanlines: !get().scanlines }),

  introDone: false,
  finishIntro: () => set({ introDone: true }),

  events: [],
  eventLog: seedLog,
  addEvent: (event) => {
    set({ events: [...get().events, event] })
    get().addLog({
      title: event.title,
      message: event.message,
      severity: event.severity,
      district: event.district,
      time: nowTime(),
    })
    get().pushToast({
      title: event.title,
      message: event.message,
      severity: event.severity,
    })
  },
  removeEvent: (id) => set({ events: get().events.filter((e) => e.id !== id) }),
  addLog: (entry) =>
    set({
      eventLog: [
        {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          time: entry.time ?? nowTime(),
          title: entry.title,
          message: entry.message,
          severity: entry.severity,
          district: entry.district,
        },
        ...get().eventLog,
      ].slice(0, 120),
    }),
  transmit: (text) => {
    const message = text.trim()
    if (!message) return
    get().addLog({
      title: 'CITIZEN TRANSMISSION',
      message,
      severity: 'info',
    })
    get().pushToast({ title: 'MESSAGE SENT', message: 'Encrypted packet accepted by the civic relay.', severity: 'info' })
  },

  toasts: [],
  pushToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    set({ toasts: [...get().toasts, { ...toast, id }].slice(-3) })
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  discovered: savedProgress.discovered ?? [],
  discover: (id) => {
    if (get().discovered.includes(id)) return
    set({ discovered: [...get().discovered, id] })
    persistSoon()
  },
  visitedDistricts: savedProgress.visitedDistricts ?? ['central'],
  visitDistrict: (id) => {
    if (get().visitedDistricts.includes(id)) return
    set({ visitedDistricts: [...get().visitedDistricts, id] })
    persistSoon()
  },
  tracked: savedProgress.tracked ?? [],
  toggleTracked: (id) => {
    const tracked = get().tracked
    if (tracked.includes(id)) {
      set({ tracked: tracked.filter((t) => t !== id) })
      get().pushToast({ title: 'TRACK RELEASED', message: 'Node removed from the watch list.', severity: 'info' })
    } else {
      set({ tracked: [...tracked, id] })
      get().pushToast({ title: 'NODE TRACKED', message: 'Telemetry will remain pinned to this structure.', severity: 'info' })
    }
    persistSoon()
  },

  stats: initialStats,
  setStats: (stats) => set({ stats: { ...get().stats, ...stats } }),
  weather: { label: 'ARTIFICIAL DAWN', detail: 'CEILING LIGHTS / LOW HAZE', humidity: 71, wind: 3.2 },
  setWeather: (weather) => set({ weather }),
  clock: nowTime(),
  setClock: (clock) => set({ clock }),
  fps: 60,
  setFps: (fps) => set({ fps }),
}))
