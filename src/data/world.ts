import type {
  Bookmark,
  Building,
  CityData,
  CodexEntry,
  Faction,
  FactionId,
  Goal,
  GoalContext,
  NewsItem,
  Pedestrian,
  RailLine,
  SelectedEntity,
  Train,
  Vehicle,
} from '../types'
import { getDistrict } from './city'
import { pedMeta, type PedVariant } from '../engine/spriteFactory'

/* ------------------------------------------------------------------ */
/* Player goals                                                        */
/* ------------------------------------------------------------------ */

/** All nine district ids, for the sector-completion goal. */
export const GOALS: Goal[] = [
  {
    id: 'goal-districts',
    title: 'CAVE CARTOGRAPHER',
    detail: 'Visit all nine sectors of the cavern (drive the camera into each).',
    target: 9,
    progress: (s: GoalContext) => s.visitedDistricts.length,
  },
  {
    id: 'goal-track',
    title: 'NODE WATCHER',
    detail: 'Keep 3 active nodes pinned to the watch list at the same time.',
    target: 3,
    progress: (s: GoalContext) => Math.min(s.tracked.length, 3),
  },
  {
    id: 'goal-discover',
    title: 'DEEP SURVEYOR',
    detail: 'Discover 10 structural nodes by clicking them on the map.',
    target: 10,
    progress: (s: GoalContext) => Math.min(s.discovered.length, 10),
  },
  {
    id: 'goal-codex',
    title: 'LORE ARCHIVIST',
    detail: 'File 5 codex entries from landmarks and events.',
    target: 5,
    progress: (s: GoalContext) => Math.min(s.codexFound.length, 5),
  },
  {
    id: 'goal-festival',
    title: 'NEON PATRON',
    detail: 'Throw a neon festival with a civic action and visit it while it burns.',
    target: 1,
    progress: (s: GoalContext) => Math.min(s.festivalsThrown, 1),
  },
  {
    id: 'goal-vantage',
    title: 'VANTAGE KEEPER',
    detail: 'Save a camera vantage point for the map rail.',
    target: 1,
    progress: (s: GoalContext) => Math.min(s.bookmarks.length, 1),
  },
]

/* ------------------------------------------------------------------ */
/* Factions                                                            */
/* ------------------------------------------------------------------ */

export const FACTIONS: Faction[] = [
  {
    id: 'civic',
    name: 'CIVIC SYNOD',
    code: 'CIV',
    description: 'The administrative mesh that keeps the cavern breathing. Believes every problem is a scheduling problem.',
    color: '#22e6ff',
    accent: '#8ff8ff',
  },
  {
    id: 'kuro',
    name: 'KURO FAMILY',
    code: 'KUR',
    description: 'Market brokers, noodle magnates and the closest thing the lower decks have to a social service.',
    color: '#ff4fa3',
    accent: '#ffb347',
  },
  {
    id: 'aureus',
    name: 'AUREUS HOLDINGS',
    code: 'AUR',
    description: 'Private weather, private air, private law. Owns more vertical metres than the Synod admits.',
    color: '#76dcff',
    accent: '#d8f7ff',
  },
  {
    id: 'guild',
    name: 'FOUNDRY GUILD',
    code: 'GLD',
    description: 'The people who actually build the city. Their strikes are measured in district-wide darkness.',
    color: '#ff9a3d',
    accent: '#ffe15c',
  },
  {
    id: 'cortex',
    name: 'CORTEX INSTITUTE',
    code: 'CTX',
    description: 'Research collective wrapped around the civic AI. Publishes everything except the interesting parts.',
    color: '#2affc8',
    accent: '#39d9ff',
  },
  {
    id: 'verdant',
    name: 'VERDANT CONSERVANCY',
    code: 'VRD',
    description: 'Dome gardeners and water engineers. Quietly indispensable, loudly idealistic.',
    color: '#63ff9b',
    accent: '#4fffe0',
  },
]

export const FACTION_MAP = new Map(FACTIONS.map((f) => [f.id, f]))

export function getFaction(id: FactionId) {
  return FACTION_MAP.get(id) ?? FACTIONS[0]
}

/* ------------------------------------------------------------------ */
/* Codex                                                               */
/* ------------------------------------------------------------------ */

const SYSTEM_CODEX: CodexEntry[] = [
  {
    id: 'sys-cavern',
    title: 'CAVERN 07',
    category: 'SYSTEM',
    body: 'A sealed artificial cavern roughly eleven kilometres across. The ceiling is a suspended weather deck; the floor is a layered machine. Nobody alive has seen the original survey.',
    color: '#22e6ff',
  },
  {
    id: 'sys-maglev',
    title: 'THE MAGLEV SPINE',
    category: 'SYSTEM',
    body: 'Five elevated lines thread between the towers. The cyan and magenta lines carry passengers; the amber loop carries freight and rumours.',
    color: '#ffb347',
  },
  {
    id: 'sys-neon',
    title: 'NEON ECONOMY',
    category: 'SYSTEM',
    body: 'Advertising is the second-largest power draw after climate control. A dark sign is read as a distress signal, which is why so few ever go dark.',
    color: '#ff4fa3',
  },
  {
    id: 'sys-weather',
    title: 'CEILING WEATHER',
    category: 'SYSTEM',
    body: 'Condensers, sunlamps and particulate vents simulate a day cycle. Acid drizzle is technically a maintenance fault, but the market bottles and sells it.',
    color: '#8ff8ff',
  },
  {
    id: 'sys-civic-ai',
    title: 'CIVIC AI',
    category: 'SYSTEM',
    body: 'The city’s scheduler. It routes power, water, trains and public messaging. It has never been switched off, and its oldest unanswered message is still queued.',
    color: '#63ff9b',
  },
]

const FACTION_CODEX: CodexEntry[] = FACTIONS.map((faction) => ({
  id: `fac-${faction.id}`,
  title: faction.name,
  category: 'FACTION' as const,
  body: faction.description,
  color: faction.color,
}))

export function buildCodex(city: CityData | null): CodexEntry[] {
  const districts: CodexEntry[] = city
    ? city.districts.map((d) => ({
        id: `dist-${d.id}`,
        title: d.name,
        category: 'DISTRICT',
        body: `${d.tagline}. ${d.description}`,
        color: d.color,
        district: d.id,
      }))
    : []
  const landmarks: CodexEntry[] = city
    ? city.landmarks.map((b) => ({
        id: `lm-${b.id}`,
        title: b.name,
        category: 'LANDMARK',
        body: b.description,
        color: getDistrict(b.district).color,
        district: b.district,
      }))
    : []
  return [...landmarks, ...districts, ...SYSTEM_CODEX, ...FACTION_CODEX]
}

/* ------------------------------------------------------------------ */
/* News ticker                                                         */
/* ------------------------------------------------------------------ */

const NEWS_POOL: Array<Omit<NewsItem, 'id' | 'time'>> = [
  {
    headline: 'CEILING LIGHTS RUN FOUR MINUTES LONG',
    body: 'Residents in the western stacks report a longer artificial dawn. The Synod calls it a rounding error.',
    tone: 'calm',
  },
  {
    headline: 'MAGLEV CYAN LINE ADDS NIGHT CAR',
    body: 'A fifth car joins the 02:00 service. The extra capacity is already oversubscribed.',
    tone: 'trade',
  },
  {
    headline: 'ACID DRIZZLE BOTTLED AS COLLECTOR ITEM',
    body: 'Market stalls are selling sealed rain from the last condensation event. Buyers are advised not to open them.',
    tone: 'culture',
  },
  {
    headline: 'FOUNDRY OUTPUT UP, TEMPERATURE UP',
    body: 'The industrial ring is running a third shift. Air quality in two neighbouring sectors has dipped.',
    tone: 'alarm',
  },
  {
    headline: 'CORTEX LABS DENIES UNLISTED FLOORS',
    body: 'A research spokesperson says the lights above floor forty are reflections. Several residents disagree.',
    tone: 'alarm',
  },
  {
    headline: 'BIO-DOME OPENS NIGHT WALK',
    body: 'The conservancy is allowing after-hours visits to the reservoir path. Tickets are allocated by lottery.',
    tone: 'culture',
  },
  {
    headline: 'KURO NOODLE STALL MARKS 40 YEARS',
    body: 'The counter has no sign, no website and a permanent queue. The owner says the secret is the water.',
    tone: 'culture',
  },
  {
    headline: 'AUREUS BUYS ANOTHER SKYBRIDGE',
    body: 'The purchase gives the holdings control of three vertical routes in the corporate sector.',
    tone: 'trade',
  },
  {
    headline: 'DRONE PATROL ROUTE SHIFTED',
    body: 'Forty-two units will now circle the transit spine at a lower altitude. Expect more visible blinking.',
    tone: 'calm',
  },
  {
    headline: 'POWER CELL RECYCLING DRIVE',
    body: 'Drop-off points open in every district. The Guild is offering repair vouchers for old units.',
    tone: 'trade',
  },
  {
    headline: 'HOLO PARADE AUDITIONS OPEN',
    body: 'The entertainment district is casting for the next festival. Applications close when the bass stops.',
    tone: 'culture',
  },
  {
    headline: 'PLATFORM 14 STILL MISSING',
    body: 'Transit staff insist the number is simply skipped. The departure board disagrees on Tuesdays.',
    tone: 'alarm',
  },
]

const nowTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

let newsCounter = 0

export function createNewsItem(city: CityData | null, districtId?: string): NewsItem {
  const template = NEWS_POOL[Math.floor(Math.random() * NEWS_POOL.length)]
  newsCounter += 1
  const district = districtId
    ? city?.districts.find((d) => d.id === districtId)
    : Math.random() < 0.45
      ? city?.districts[Math.floor(Math.random() * (city?.districts.length || 1))]
      : undefined
  return {
    ...template,
    id: `news-${Date.now().toString(36)}-${newsCounter}`,
    time: nowTime(),
    district: template.body.toLowerCase().includes('district') ? (district?.id ?? undefined) : undefined,
  }
}

/* ------------------------------------------------------------------ */
/* Moving entity profiles                                              */
/* ------------------------------------------------------------------ */

const PED_NAMES = [
  'MIRA', 'JUNO', 'KAI', 'SABLE', 'ORIN', 'NOVA', 'RHEA', 'ECHO', 'TAL', 'YUKI',
  'IMAN', 'CASS', 'DEX', 'LUX', 'RIN', 'SOL', 'VEX', 'ARIA', 'NIKO', 'JADE',
]

const PED_ROLES: Record<PedVariant, { role: string; errands: string[] }> = {
  hood: { role: 'NIGHT COURIER', errands: ['carrying a sealed packet', 'walking a fixed route', 'avoiding the cameras'] },
  coat: { role: 'SHIFT WORKER', errands: ['heading home', 'buying late noodles', 'waiting for a tram'] },
  suit: { role: 'CIVIC CLERK', errands: ['between meetings', 'carrying a paper file', 'missing the last train'] },
  worker: { role: 'FOUNDRY CREW', errands: ['on a maintenance call', 'carrying a tool case', 'taking a smoke break'] },
  punk: { role: 'ARCADE REGULAR', errands: ['chasing a high score', 'trading bootleg chips', 'looking for a friend'] },
  kid: { role: 'HAB-KID', errands: ['running an errand', 'skipping the queue', 'counting the trains'] },
}

function stableIndex(id: string, length: number) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h % length
}

export function pedestrianEntity(n: Pedestrian): SelectedEntity {
  const { variant } = pedMeta(n)
  const role = PED_ROLES[variant]
  const name = PED_NAMES[stableIndex(n.id, PED_NAMES.length)]
  return {
    kind: 'pedestrian',
    id: n.id,
    label: `${name} // ${role.role}`,
    district: n.district,
    color: n.color,
    detail: `Currently ${role.errands[stableIndex(n.id, role.errands.length)]}. Moving ${n.axis === 'x' ? 'east' : 'south'} at ${(n.speed * 1.8).toFixed(1)} km/h.`,
  }
}

const VEHICLE_LABELS: Record<Vehicle['type'], { label: string; detail: string }> = {
  car: { label: 'PRIVATE CAR', detail: 'Single occupant. Transponder registered to a residential co-op.' },
  taxi: { label: 'AUTO-TAXI', detail: 'For-hire. Meter running, route optimized around the transit delay.' },
  bus: { label: 'CIVIC BUS', detail: 'Fixed route, low fare. Standing room only after the market shift.' },
  truck: { label: 'CARGO HAULER', detail: 'Heavy freight. Manifest sealed by the Foundry Guild.' },
  bike: { label: 'SCOOTER', detail: 'Lane-splitter. Fast, cheap and statistically brave.' },
  van: { label: 'SERVICE VAN', detail: 'Maintenance crew. Carrying parts for a node you cannot see.' },
}

export function vehicleEntity(v: Vehicle): SelectedEntity {
  const info = VEHICLE_LABELS[v.type]
  const road = Math.round(v.lane / 11)
  const district = getDistrict((['central', 'market', 'industrial', 'transit', 'residential', 'tech'] as const)[road % 6])
  return {
    kind: 'vehicle',
    id: v.id,
    label: `UNIT ${v.id.replace('v-', 'V-')} // ${info.label}`,
    district: district.id,
    color: v.color,
    detail: `${info.detail} Corridor ${road.toString().padStart(2, '0')}, ${v.axis === 'x' ? 'eastbound' : 'southbound'} at ${Math.round(v.speed * 11)} km/h.`,
  }
}

export function trainEntity(train: Train, rail: RailLine): SelectedEntity {
  const progress = Math.max(0, Math.min(1, (train.pos - rail.from) / Math.max(1, rail.to - rail.from)))
  return {
    kind: 'train',
    id: train.id,
    label: `${rail.name} // ${String(train.cars).padStart(2, '0')} CARS`,
    district: 'transit',
    color: rail.color,
    detail: `${Math.round(progress * 100)}% along the line. ${train.dir > 0 ? 'Outbound' : 'Inbound'} through the ${rail.kind.toUpperCase()} corridor.`,
  }
}

/** Bookmarks start pre-seeded with a few useful vantage points. */
export function defaultBookmarks(city: CityData): Bookmark[] {
  const spire = city.landmarks.find((b) => b.style === 'spire')
  return [
    {
      id: 'bookmark-overview',
      name: 'CITY OVERVIEW',
      x: city.size / 2,
      y: city.size / 2,
      zoom: 0.16,
      district: 'central',
    },
    {
      id: 'bookmark-spire',
      name: spire?.name ?? 'CENTRAL SPIRE',
      x: spire ? spire.x + spire.w / 2 : city.size / 2,
      y: spire ? spire.y + spire.d / 2 : city.size / 2,
      zoom: 1.25,
      district: 'central',
    },
    {
      id: 'bookmark-market',
      name: 'NEON MARKET GATE',
      x: 35,
      y: 99,
      zoom: 0.9,
      district: 'market',
    },
  ]
}

export function buildingCodexId(b: Building) {
  return `lm-${b.id}`
}
