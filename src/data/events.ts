import type { CityEvent, DistrictId } from '../types'
import { DISTRICTS, getDistrict } from './city'

type Template = {
  type: CityEvent['type']
  title: string
  severity: CityEvent['severity']
  duration: [number, number]
  district?: boolean
  message: (districtName: string) => string
}

const TEMPLATES: Template[] = [
  {
    type: 'power',
    title: 'GRID FAULT',
    severity: 'warning',
    duration: [26, 44],
    district: true,
    message: (d) => `Power rerouted around a failed conduit in ${d}. Backup cells holding at 68%.`,
  },
  {
    type: 'power',
    title: 'CASCADE FAILURE',
    severity: 'critical',
    duration: [20, 34],
    district: true,
    message: (d) => `Three substations offline in ${d}. Civic AI has isolated the affected ring.`,
  },
  {
    type: 'festival',
    title: 'NEON FESTIVAL',
    severity: 'info',
    duration: [34, 55],
    district: true,
    message: (d) => `Holo-parade flooding ${d}. Audio levels above the civic limit. Attendance rising.`,
  },
  {
    type: 'rain',
    title: 'CONDENSATION EVENT',
    severity: 'info',
    duration: [30, 48],
    district: true,
    message: (d) => `Ceiling condensers venting over ${d}. Acid drizzle expected for the next cycle.`,
  },
  {
    type: 'transit',
    title: 'TRANSIT DELAY',
    severity: 'warning',
    duration: [24, 40],
    district: true,
    message: (d) => `Signal fault on the maglev spine near ${d}. Trains holding at reduced speed.`,
  },
  {
    type: 'network',
    title: 'NETWORK SPIKE',
    severity: 'warning',
    duration: [18, 30],
    district: true,
    message: (d) => `Packet storm detected in ${d}. Civic mesh latency up 240ms.`,
  },
  {
    type: 'construction',
    title: 'DEEP CONSTRUCTION',
    severity: 'info',
    duration: [38, 60],
    district: true,
    message: (d) => `Foundry crew opening a new service shaft beneath ${d}. Minor seismic reported.`,
  },
  {
    type: 'market',
    title: 'MARKET SURGE',
    severity: 'info',
    duration: [28, 46],
    district: true,
    message: (d) => `Night market exceeds capacity in ${d}. Crowd control requested at the east gate.`,
  },
  {
    type: 'weather',
    title: 'ATMOSPHERE SHIFT',
    severity: 'info',
    duration: [32, 52],
    message: () => 'Particulate drift from the ceiling vents. Visibility reduced across the outer ring.',
  },
]

let eventCounter = 0

export function createRandomEvent(activeTypes: Set<string> = new Set()): CityEvent {
  const available = TEMPLATES.filter((t) => !activeTypes.has(t.type))
  const pool = available.length > 0 ? available : TEMPLATES
  const template = pool[Math.floor(Math.random() * pool.length)]
  const district: DistrictId = template.district
    ? DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)].id
    : 'central'
  return createEventForType(template.type, district)
}

/** Build a deterministic event of a chosen type (used by player-triggered actions). */
export function createEventForType(type: CityEvent['type'], preferredDistrict?: DistrictId): CityEvent {
  const template = TEMPLATES.find((t) => t.type === type) ?? TEMPLATES[0]
  const district: DistrictId = template.district ? (preferredDistrict ?? 'central') : 'central'
  const districtName = getDistrict(district).name
  const [min, max] = template.duration
  const duration = Math.round((min + Math.random() * (max - min)) * 1000)
  eventCounter += 1
  return {
    id: `evt-${Date.now().toString(36)}-${eventCounter}`,
    type: template.type,
    title: template.title,
    message: template.message(districtName),
    district: template.district ? district : undefined,
    startedAt: Date.now(),
    duration,
    severity: template.severity,
  }
}
