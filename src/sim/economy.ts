/**
 * District economy + cascading failure engine.
 *
 * The economy is a deterministic, event-driven scalar model layered on top of
 * the passive city stats: every district has an income rate, a power demand
 * and a supply ceiling. Blackouts starve supply, festivals and night markets
 * spike demand, and sustained shortfalls feed a crime score that drags civic
 * stability down. Cascades turn those numbers into visible events
 * (blackout → gridlocked signals → crime spike → substation raid).
 */
import type { CityEvent, DistrictId } from '../types'
import { DISTRICTS, getDistrict } from '../data/city'

export interface DistrictEconomy {
  id: DistrictId
  /** Credits per minute at the current coverage. */
  income: number
  incomeTotal: number
  /** Megawatts demanded by the district right now. */
  demand: number
  /** Megawatts the grid can actually deliver. */
  supply: number
  stability: number
  traffic: number
  crime: number
}

export interface EconomyState {
  districts: Record<DistrictId, DistrictEconomy>
  credits: number
  incomePerMin: number
  demand: number
  supply: number
  stability: number
  traffic: number
  crime: number
}

export interface EconomyTick {
  /** Seconds since the last tick. */
  dt: number
  hour: number
  events: CityEvent[]
  /** 0..1 daylight scalar (night boosts nightlife, dims offices). */
  daylight: number
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/** Trade intensity per district: how much nightlife drives the local ledger. */
const TRADE: Partial<Record<DistrictId, number>> = {
  market: 1.35,
  entertainment: 1.5,
  central: 1.2,
  corporate: 1.15,
  tech: 1.05,
  transit: 0.95,
  industrial: 0.9,
  residential: 0.7,
  bio: 0.8,
}

/** Map a clock hour onto the cavern's artificial daylight scalar (0..1). */
export function daylightForHour(hour: number) {
  const cycle = Math.cos(((hour - 13) / 24) * Math.PI * 2)
  return clamp(0.12 + ((cycle + 1) / 2) * 0.88, 0.12, 1)
}

/** Hour curve: offices and trade peak around 13:00, nightlife around 22:00. */
function hourFactor(hour: number, district: DistrictId) {
  const night = district === 'entertainment' || district === 'market'
  const peak = night ? 22 : 13
  return 0.45 + ((Math.cos(((hour - peak) / 24) * Math.PI * 2) + 1) / 2) * 0.85
}

export function createEconomy(): EconomyState {
  const districts = {} as Record<DistrictId, DistrictEconomy>
  for (const d of DISTRICTS) {
    const demand = 18 + (d.population / 1_000_000) * 22 + d.power * 0.35
    districts[d.id] = {
      id: d.id,
      income: 0,
      incomeTotal: 0,
      demand,
      supply: demand,
      stability: d.stability,
      traffic: clamp(38 + (d.population / 2_200_000) * 30, 24, 92),
      crime: clamp(22 + (100 - d.stability) * 0.35, 8, 62),
    }
  }
  return {
    districts,
    credits: 0,
    incomePerMin: 0,
    demand: 0,
    supply: 0,
    stability: 0,
    traffic: 0,
    crime: 0,
  }
}

/**
 * Advance the simulation by `dt` seconds. Pure: returns a new economy object
 * so React can diff it cheaply.
 */
export function stepEconomy(prev: EconomyState, tick: EconomyTick): EconomyState {
  const { dt, hour, events, daylight } = tick
  const powerOut = new Map<DistrictId, boolean>()
  const festival = new Set<DistrictId>()
  const transitDown = new Set<DistrictId>()
  const networkDown = new Set<DistrictId>()
  for (const event of events) {
    const district = event.district ?? 'central'
    if (event.type === 'power') powerOut.set(district, true)
    if (event.type === 'festival') festival.add(district)
    if (event.type === 'transit') transitDown.add(district)
    if (event.type === 'network') networkDown.add(district)
  }

  const districts = {} as Record<DistrictId, DistrictEconomy>
  let credits = prev.credits
  let incomePerMin = 0
  let demandTotal = 0
  let supplyTotal = 0
  let stabilityTotal = 0
  let trafficTotal = 0
  let crimeTotal = 0

  for (const base of DISTRICTS) {
    const last = prev.districts[base.id]
    const trade = TRADE[base.id] ?? 1
    const night = 1 - daylight
    const demand =
      last.demand * 0.72 +
      (18 + (base.population / 1_000_000) * 22) * hourFactor(hour, base.id) * 0.28 +
      (festival.has(base.id) ? 9 : 0)
    const gridLoss = powerOut.has(base.id) ? 0.34 : 1
    const networkLoss = networkDown.has(base.id) ? 0.86 : 1
    const supply = clamp(demand * gridLoss, 0, demand * 1.05)
    const coverage = clamp(supply / Math.max(1, demand), 0.15, 1.05)

    const income =
      (base.population / 1_000_000) * (2.6 + trade * (1 + night * (TRADE[base.id] ? 0.9 : 0.3))) *
      coverage *
      (0.72 + last.stability / 320) *
      (networkLoss < 1 ? 0.9 : 1)

    const crimeTarget =
      18 +
      (1 - coverage) * 55 +
      (transitDown.has(base.id) ? 12 : 0) +
      (festival.has(base.id) ? 6 : 0) +
      (100 - last.stability) * 0.18
    const crime = last.crime + (crimeTarget - last.crime) * Math.min(0.5, dt * 0.045)

    const stabilityTarget = clamp(
      94 - crime * 0.55 - (1 - coverage) * 46 - (networkLoss < 1 ? 6 : 0),
      18,
      99.5,
    )
    const stability = last.stability + (stabilityTarget - last.stability) * Math.min(0.6, dt * 0.04)

    const trafficTarget = clamp(
      34 + (base.population / 2_200_000) * 26 + hourFactor(hour, base.id) * 12 - (transitDown.has(base.id) ? 0 : 8) + (1 - coverage) * 26,
      18,
      99,
    )
    const traffic = last.traffic + (trafficTarget - last.traffic) * Math.min(0.6, dt * 0.05)

    credits += (income / 60) * dt
    incomePerMin += income
    demandTotal += demand
    supplyTotal += supply
    stabilityTotal += stability * (base.population / 12_000_000)
    trafficTotal += traffic * (base.population / 12_000_000)
    crimeTotal += crime * (base.population / 12_000_000)

    districts[base.id] = {
      id: base.id,
      income,
      incomeTotal: last.incomeTotal + (income / 60) * dt,
      demand,
      supply,
      stability,
      traffic,
      crime,
    }
  }

  return {
    districts,
    credits,
    incomePerMin,
    demand: demandTotal,
    supply: supplyTotal,
    stability: stabilityTotal,
    traffic: trafficTotal,
    crime: crimeTotal,
  }
}

/* ------------------------------------------------------------------ */
/* Cascading failure chains                                            */
/* ------------------------------------------------------------------ */

export interface CascadeRule {
  from: CityEvent['type']
  to: CityEvent['type']
  /** Seconds the source event must be running before the chain fires. */
  delay: number
  title: string
  severity: CityEvent['severity']
  message: (districtName: string, sourceTitle: string) => string
}

export const CASCADE_RULES: CascadeRule[] = [
  {
    from: 'power',
    to: 'transit',
    delay: 9,
    title: 'SIGNAL GRIDLOCK',
    severity: 'warning',
    message: (d, s) =>
      `Traffic signals lost grid sync after ${s} in ${d}. Intersections are backing up along the service spine.`,
  },
  {
    from: 'power',
    to: 'crime',
    delay: 22,
    title: 'SUPPLY THEFT',
    severity: 'warning',
    message: (d, s) =>
      `Unregistered taps reported on dark blocks in ${d} while ${s} holds. Civic patrols request backup.`,
  },
  {
    from: 'transit',
    to: 'crime',
    delay: 16,
    title: 'ROUTE AMBUSH',
    severity: 'critical',
    message: (d, s) =>
      `Stalled commuters stranded by ${s} in ${d}. Opportunists are working the platform crowd.`,
  },
  {
    from: 'crime',
    to: 'power',
    delay: 14,
    title: 'SUBSTATION RAID',
    severity: 'critical',
    message: (d, s) =>
      `${s} in ${d} drew crews away from the perimeter. A substation is being stripped.`,
  },
  {
    from: 'network',
    to: 'transit',
    delay: 11,
    title: 'TELEMETRY LAG',
    severity: 'warning',
    message: (d, s) =>
      `Signal telemetry is lagging after ${s}. ${d} trains are holding at reduced separation.`,
  },
]

/** Build the follow-up event for a chain that just fired. */
export function createCascadeEvent(rule: CascadeRule, source: CityEvent): CityEvent {
  const district: DistrictId = source.district ?? 'central'
  return {
    id: `cascade-${source.id}-${rule.to}-${Date.now().toString(36)}`,
    type: rule.to,
    title: rule.title,
    message: rule.message(getDistrict(district).name, source.title),
    district: source.district,
    startedAt: Date.now(),
    duration: 18_000 + Math.round(Math.random() * 14_000),
    severity: rule.severity,
  }
}
