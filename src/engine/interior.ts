import type { Building } from '../types'
import { getDistrict } from '../data/city'

export const PLAN_COLS = 28
export const PLAN_ROWS = 18
export const PLAN_CELL = 21
export const PLAN_OX = 26
export const PLAN_OY = 50

export type Archetype =
  | 'office'
  | 'market'
  | 'industrial'
  | 'residential'
  | 'server'
  | 'entertainment'
  | 'bio'
  | 'transit'
  | 'lobby'

type FurnitureKind =
  | 'desk'
  | 'table'
  | 'bed'
  | 'rack'
  | 'stall'
  | 'machine'
  | 'crate'
  | 'plant'
  | 'tank'
  | 'sofa'
  | 'counter'
  | 'screen'
  | 'bench'
  | 'stage'

export interface Furniture {
  x: number
  y: number
  w: number
  h: number
  kind: FurnitureKind
}

export interface InteriorRoom {
  x: number
  y: number
  w: number
  h: number
  label: string
}

export interface FloorPlan {
  archetype: Archetype
  cells: Uint8Array // 0 wall, 1 walkable, 2 furniture
  rooms: InteriorRoom[]
  furniture: Furniture[]
  doors: Array<{ x: number; y: number }>
}

export interface Npc {
  id: number
  name: string
  role: string
  visitor: boolean
  self: boolean
  body: string
  visor: string
  x: number
  y: number
  tx: number
  ty: number
  wait: number
  speed: number
  phase: number
}

export interface VisitorSprite {
  name: string
  body: string
  visor: string
  self: boolean
}

function rngFactory(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function archetypeFor(building: Building, floor: number): Archetype {
  if (floor === 0) return 'lobby'
  const t = building.type.toUpperCase()
  if (/SERVER|DATA|AI CORE|QUANTUM|ARCHIVE|COLD|COMMS/.test(t)) return 'server'
  if (/FABRICATION|REFINERY|POWER|CARGO|FOUNDRY|WATER|ASSEMBLY|HEAVY|ROBOTICS|PROTOTYPE/.test(t)) return 'industrial'
  if (/HABITAT|APARTMENT|HOUSING|RESIDEN|FAMILY|HOSTEL|LAUNDRY/.test(t)) return 'residential'
  if (/FARM|BOTANICAL|GREENHOUSE|RESERVOIR|FOREST|SEED|HYDRO|BIO|GARDEN/.test(t)) return 'bio'
  if (/THEATRE|ARCADE|MUSIC|CINEMA|GAME|CLUB|AMUSEMENT|HOLO|NIGHTCLUB|ENTERTAINMENT/.test(t)) return 'entertainment'
  if (/METRO|MAGLEV|BUS|TRANSIT|RAIL|STATION|PLATFORM|TERMINAL|CONTROL/.test(t)) return 'transit'
  if (/RAMEN|MARKET|TEA|PAWN|NOODLE|CLINIC|SHOP/.test(t)) return 'market'
  return 'office'
}

const ROOM_LABELS: Record<Archetype, string[]> = {
  office: ['OPEN PLAN', 'MEETING', 'FOCUS POD', 'OPS DESK'],
  market: ['STALL ROW', 'FOOD COURT', 'TRADE FLOOR', 'STOCK ROOM'],
  industrial: ['FAB BAY', 'ASSEMBLY', 'HAZMAT STORE', 'GANTRY'],
  residential: ['UNIT A', 'UNIT B', 'UNIT C', 'UNIT D'],
  server: ['RACK HALL', 'COOLING', 'NODE CAGE', 'UPS BAY'],
  entertainment: ['MAIN FLOOR', 'ARCADE', 'LOUNGE', 'BACKSTAGE'],
  bio: ['GROW BEDS', 'NURSERY', 'WATER LAB', 'CANOPY'],
  transit: ['CONCOURSE', 'WAITING', 'TICKETING', 'BAGGAGE'],
  lobby: ['ATRIUM', 'RECEPTION', 'WAITING', 'LIFT CORE'],
}

const planCache = new Map<string, FloorPlan>()

export function buildFloorPlan(building: Building, floor: number): FloorPlan {
  const key = `${building.id}:${floor}`
  const cached = planCache.get(key)
  if (cached) return cached

  const archetype = archetypeFor(building, floor)
  const rng = rngFactory(building.seed * 7919 + floor * 104729 + 13)
  const cells = new Uint8Array(PLAN_COLS * PLAN_ROWS)
  const at = (x: number, y: number) => y * PLAN_COLS + x
  const rooms: InteriorRoom[] = []
  const furniture: Furniture[] = []
  const doors: Array<{ x: number; y: number }> = []

  // cross corridors
  for (let x = 1; x < PLAN_COLS - 1; x++) {
    cells[at(x, 8)] = 1
    cells[at(x, 9)] = 1
  }
  for (let y = 1; y < PLAN_ROWS - 1; y++) {
    cells[at(13, y)] = 1
    cells[at(14, y)] = 1
  }

  const quads = [
    { x: 1, y: 1, w: 12, h: 7, side: 'top' },
    { x: 15, y: 1, w: 12, h: 7, side: 'top' },
    { x: 1, y: 10, w: 12, h: 7, side: 'bottom' },
    { x: 15, y: 10, w: 12, h: 7, side: 'bottom' },
  ]

  const split = archetype === 'residential' || archetype === 'office'
  const labels = ROOM_LABELS[archetype]
  let li = 0
  for (const q of quads) {
    const parts = split
      ? [
          { x: q.x, y: q.y, w: 6, h: q.h },
          { x: q.x + 6, y: q.y, w: 6, h: q.h },
        ]
      : [q]
    for (const p of parts) {
      const label = archetype === 'residential' ? `UNIT ${String(li + 1).padStart(2, '0')}` : labels[li % labels.length]
      li++
      rooms.push({ x: p.x, y: p.y, w: p.w, h: p.h, label })
      for (let y = p.y + 1; y < p.y + p.h - 1; y++) {
        for (let x = p.x + 1; x < p.x + p.w - 1; x++) cells[at(x, y)] = 1
      }
      // door onto the horizontal corridor
      const doorX = p.x + 1 + Math.floor(rng() * (p.w - 2))
      const doorY = q.side === 'top' ? p.y + p.h - 1 : p.y
      cells[at(doorX, doorY)] = 1
      doors.push({ x: doorX, y: doorY })
      // optional side door onto the vertical corridor
      if (rng() < 0.5) {
        const sideX = p.x === 1 ? p.x + p.w - 1 : p.x
        const sideY = p.y + 1 + Math.floor(rng() * (p.h - 2))
        cells[at(sideX, sideY)] = 1
        doors.push({ x: sideX, y: sideY })
      }
      furnish(archetype, p, rng, furniture, cells, at)
    }
  }

  if (archetype === 'lobby') {
    furniture.push({ x: 12, y: 2, w: 4, h: 2, kind: 'counter' })
    furniture.push({ x: 3, y: 4, w: 2, h: 1, kind: 'sofa' })
    furniture.push({ x: 22, y: 4, w: 2, h: 1, kind: 'sofa' })
    furniture.push({ x: 6, y: 13, w: 1, h: 1, kind: 'plant' })
    furniture.push({ x: 21, y: 13, w: 1, h: 1, kind: 'plant' })
  }

  for (const f of furniture) {
    for (let y = f.y; y < f.y + f.h; y++) {
      for (let x = f.x; x < f.x + f.w; x++) {
        if (x > 0 && y > 0 && x < PLAN_COLS - 1 && y < PLAN_ROWS - 1 && cells[at(x, y)] === 1) {
          cells[at(x, y)] = 2
        }
      }
    }
  }

  const plan: FloorPlan = { archetype, cells, rooms, furniture, doors }
  if (planCache.size > 96) planCache.clear()
  planCache.set(key, plan)
  return plan
}

function furnish(
  arch: Archetype,
  r: { x: number; y: number; w: number; h: number },
  rng: () => number,
  out: Furniture[],
  cells: Uint8Array,
  at: (x: number, y: number) => number,
) {
  const ix = r.x + 1
  const iy = r.y + 1
  const iw = r.w - 2
  const ih = r.h - 2
  const free = (x: number, y: number, w: number, h: number) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (cells[at(xx, yy)] !== 1) return false
    return true
  }
  const put = (kind: FurnitureKind, x: number, y: number, w: number, h: number) => {
    if (x >= ix && y >= iy && x + w <= ix + iw && y + h <= iy + ih && free(x, y, w, h)) out.push({ x, y, w, h, kind })
  }

  if (arch === 'office' || arch === 'lobby') {
    for (let y = iy; y < iy + ih - 1; y += 2) {
      for (let x = ix; x < ix + iw - 1; x += 3) {
        if (rng() < 0.8) put('desk', x, y, 2, 1)
      }
    }
    put('screen', ix + Math.floor(iw / 2) - 1, iy, 2, 1)
    if (rng() < 0.6) put('plant', ix + iw - 1, iy + ih - 1, 1, 1)
  } else if (arch === 'market') {
    for (let x = ix; x < ix + iw - 1; x += 3) {
      put('stall', x, iy, 2, 1)
      if (ih > 3) put('stall', x, iy + ih - 1, 2, 1)
    }
    put('table', ix + Math.floor(iw / 2), iy + Math.floor(ih / 2), 1, 1)
    if (rng() < 0.5) put('crate', ix, iy + ih - 1, 1, 1)
  } else if (arch === 'industrial') {
    for (let y = iy; y < iy + ih - 1; y += 3) {
      for (let x = ix; x < ix + iw - 1; x += 4) put('machine', x, y, 2, 2)
    }
    put('tank', ix + iw - 1, iy, 1, 1)
    for (let i = 0; i < 3; i++) put('crate', ix + Math.floor(rng() * iw), iy + Math.floor(rng() * ih), 1, 1)
  } else if (arch === 'residential') {
    put('bed', ix, iy, 1, 2)
    put('sofa', ix + iw - 2, iy + ih - 1, 2, 1)
    put('table', ix + Math.floor(iw / 2), iy + Math.floor(ih / 2), 1, 1)
    if (rng() < 0.6) put('plant', ix + iw - 1, iy, 1, 1)
  } else if (arch === 'server') {
    for (let x = ix; x < ix + iw; x += 2) {
      for (let y = iy; y < iy + ih - 1; y += 3) put('rack', x, y, 1, 2)
    }
    put('tank', ix + iw - 1, iy + ih - 1, 1, 1)
  } else if (arch === 'entertainment') {
    put('stage', ix, iy, Math.min(4, iw), 2)
    for (let y = iy + 3; y < iy + ih; y += 2) {
      for (let x = ix; x < ix + iw - 1; x += 3) put(rng() < 0.5 ? 'machine' : 'table', x, y, 1, 1)
    }
    put('screen', ix + iw - 2, iy, 2, 1)
  } else if (arch === 'bio') {
    for (let y = iy; y < iy + ih; y += 2) {
      for (let x = ix; x < ix + iw; x++) if (rng() < 0.85) put('plant', x, y, 1, 1)
    }
    put('tank', ix + iw - 1, iy + ih - 1, 1, 1)
  } else if (arch === 'transit') {
    for (let y = iy + 1; y < iy + ih - 1; y += 2) put('bench', ix, y, 2, 1)
    put('counter', ix + iw - 3, iy, 3, 1)
    put('screen', ix + Math.floor(iw / 2), iy, 2, 1)
  }
}

const NAME_A = ['KA', 'RI', 'ZEN', 'NO', 'VA', 'LU', 'MI', 'SO', 'REN', 'TA', 'YU', 'KO', 'NA', 'SHI', 'E', 'RA']
const NAME_B = ['DA', 'MI', 'RO', 'KI', 'SA', 'NE', 'JI', 'WO', 'HA', 'LIN', 'MAR', 'OX']
const SUITS = ['#3ddad7', '#ff4fa3', '#ffb347', '#63ff9b', '#7a5cff', '#ff6b4a', '#4aa3ff', '#d7e04a']
const VISORS = ['#8ff8ff', '#ffd45c', '#ff8ae2', '#a4ff8f']

const ROLES: Record<Archetype, string[]> = {
  office: ['ANALYST', 'CLERK', 'AUDITOR', 'MANAGER', 'INTERN'],
  market: ['VENDOR', 'SHOPPER', 'COOK', 'COURIER', 'HAGGLER'],
  industrial: ['FABRICATOR', 'WELDER', 'HAULER', 'TECH', 'FOREMAN'],
  residential: ['RESIDENT', 'ELDER', 'CARER', 'KID', 'NEIGHBOR'],
  server: ['SYSOP', 'ENGINEER', 'DAEMON', 'ARCHIVIST'],
  entertainment: ['PERFORMER', 'GAMER', 'BARTENDER', 'DJ', 'ROADIE'],
  bio: ['BOTANIST', 'FARMER', 'GENETICIST', 'KEEPER'],
  transit: ['COMMUTER', 'CONDUCTOR', 'PORTER', 'PILOT', 'GUARD'],
  lobby: ['RECEPTIONIST', 'VISITOR', 'COURIER', 'GUARD', 'CONCIERGE'],
}

export function npcCountFor(building: Building, floor: number, totalFloors: number, arch: Archetype, hour: number): number {
  const perFloor = building.occupants / Math.max(1, totalFloors)
  const peak = arch === 'entertainment' || arch === 'residential' ? 22 : 13
  const cycle = (Math.cos(((hour - peak) / 24) * Math.PI * 2) + 1) / 2
  const dayFactor = arch === 'entertainment' ? 0.2 + cycle * 1.1 : arch === 'residential' ? 0.45 + cycle * 0.75 : 0.15 + cycle * 0.85
  const floorFactor = floor === 0 ? 1.6 : floor === totalFloors - 1 ? 0.5 : 1
  const min = floor === 0 ? 2 : arch === 'residential' ? 1 : 0
  return Math.max(min, Math.min(24, Math.round(perFloor * 0.12 * floorFactor * dayFactor)))
}

export function spawnNpcs(
  plan: FloorPlan,
  building: Building,
  floor: number,
  totalFloors: number,
  hour: number,
  visitors: VisitorSprite[],
): Npc[] {
  const rng = rngFactory(building.seed * 31 + floor * 977 + Math.floor(hour) * 61)
  const walkable: Array<{ x: number; y: number }> = []
  for (let y = 1; y < PLAN_ROWS - 1; y++) {
    for (let x = 1; x < PLAN_COLS - 1; x++) {
      if (plan.cells[y * PLAN_COLS + x] === 1) walkable.push({ x, y })
    }
  }
  if (!walkable.length) return []
  const spot = () => walkable[Math.floor(rng() * walkable.length)]
  const count = npcCountFor(building, floor, totalFloors, plan.archetype, hour)
  const roles = ROLES[plan.archetype]
  const npcs: Npc[] = []
  const make = (visitor: boolean, self: boolean, name: string, body: string, visor: string): Npc => {
    const s = spot()
    const t = spot()
    return {
      id: npcs.length,
      name,
      role: visitor ? 'LINKED CITIZEN' : roles[Math.floor(rng() * roles.length)],
      visitor,
      self,
      body,
      visor,
      x: s.x + 0.5,
      y: s.y + 0.5,
      tx: t.x + 0.5,
      ty: t.y + 0.5,
      wait: rng() * 2,
      speed: 1.2 + rng() * 1.1,
      phase: rng() * Math.PI * 2,
    }
  }
  for (let i = 0; i < count; i++) {
    const name = `${NAME_A[Math.floor(rng() * NAME_A.length)]}${NAME_B[Math.floor(rng() * NAME_B.length)]}${rng() < 0.3 ? `-${Math.floor(rng() * 90 + 10)}` : ''}`
    npcs.push(make(false, false, name, SUITS[Math.floor(rng() * SUITS.length)], VISORS[Math.floor(rng() * VISORS.length)]))
  }
  for (const v of visitors) npcs.push(make(true, v.self, v.name, v.body, v.visor))
  return npcs
}

export function stepNpcs(npcs: Npc[], plan: FloorPlan, dt: number, rngSeed: number) {
  let t = rngSeed >>> 0
  const rnd = () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
  const walkable: Array<{ x: number; y: number }> = []
  for (let y = 1; y < PLAN_ROWS - 1; y++) {
    for (let x = 1; x < PLAN_COLS - 1; x++) {
      if (plan.cells[y * PLAN_COLS + x] === 1) walkable.push({ x, y })
    }
  }
  if (!walkable.length) return
  const blocked = (x: number, y: number) => {
    const cx = Math.floor(x)
    const cy = Math.floor(y)
    if (cx < 0 || cy < 0 || cx >= PLAN_COLS || cy >= PLAN_ROWS) return true
    return plan.cells[cy * PLAN_COLS + cx] !== 1
  }
  for (const n of npcs) {
    if (n.wait > 0) {
      n.wait -= dt
      continue
    }
    const dx = n.tx - n.x
    const dy = n.ty - n.y
    const dist = Math.hypot(dx, dy)
    if (dist < 0.15) {
      const s = walkable[Math.floor(rnd() * walkable.length)]
      n.tx = s.x + 0.5
      n.ty = s.y + 0.5
      n.wait = rnd() * 2.4
      continue
    }
    const step = Math.min(n.speed * dt, dist)
    const vx = (dx / dist) * step
    const vy = (dy / dist) * step
    let moved = false
    if (!blocked(n.x + vx, n.y)) {
      n.x += vx
      moved = true
    }
    if (!blocked(n.x, n.y + vy)) {
      n.y += vy
      moved = true
    }
    if (!moved) {
      const s = walkable[Math.floor(rnd() * walkable.length)]
      n.tx = s.x + 0.5
      n.ty = s.y + 0.5
      n.wait = rnd() * 0.8
    }
  }
}

const FURN_COLORS: Record<FurnitureKind, string> = {
  desk: '#1a2740',
  table: '#22304a',
  bed: '#2a3550',
  rack: '#0a1220',
  stall: '#3a2a18',
  machine: '#26313f',
  crate: '#2c3648',
  plant: '#1f7a44',
  tank: '#14424f',
  sofa: '#33284a',
  counter: '#22304a',
  screen: '#3a1030',
  bench: '#22304a',
  stage: '#1a1030',
}

export function drawFloorPlan(
  ctx: CanvasRenderingContext2D,
  plan: FloorPlan,
  building: Building,
  npcs: Npc[],
  opts: { width: number; height: number; time: number; power: boolean; security: boolean; floor: number },
) {
  const { width, height, time, power, security, floor } = opts
  const district = getDistrict(building.district)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#04060d'
  ctx.fillRect(0, 0, width, height)

  const px = (x: number) => PLAN_OX + x * PLAN_CELL
  const py = (y: number) => PLAN_OY + y * PLAN_CELL

  // shell
  ctx.fillStyle = '#0c1322'
  ctx.fillRect(px(0), py(0), PLAN_COLS * PLAN_CELL, PLAN_ROWS * PLAN_CELL)
  ctx.strokeStyle = `${district.color}55`
  ctx.lineWidth = 1
  ctx.strokeRect(px(0) - 2, py(0) - 2, PLAN_COLS * PLAN_CELL + 4, PLAN_ROWS * PLAN_CELL + 4)

  // corridors
  ctx.fillStyle = '#0b1120'
  ctx.fillRect(px(1), py(8), (PLAN_COLS - 2) * PLAN_CELL, 2 * PLAN_CELL)
  ctx.fillRect(px(13), py(1), 2 * PLAN_CELL, (PLAN_ROWS - 2) * PLAN_CELL)

  // rooms
  for (const r of plan.rooms) {
    ctx.fillStyle = `${district.color}0d`
    ctx.fillRect(px(r.x + 1), py(r.y + 1), (r.w - 2) * PLAN_CELL, (r.h - 2) * PLAN_CELL)
  }

  // walls (cells adjacent to walkable space)
  ctx.fillStyle = '#111b30'
  for (let y = 0; y < PLAN_ROWS; y++) {
    for (let x = 0; x < PLAN_COLS; x++) {
      if (plan.cells[y * PLAN_COLS + x] !== 0) continue
      const near =
        (x > 0 && plan.cells[y * PLAN_COLS + x - 1] !== 0) ||
        (x < PLAN_COLS - 1 && plan.cells[y * PLAN_COLS + x + 1] !== 0) ||
        (y > 0 && plan.cells[(y - 1) * PLAN_COLS + x] !== 0) ||
        (y < PLAN_ROWS - 1 && plan.cells[(y + 1) * PLAN_COLS + x] !== 0)
      if (near) ctx.fillRect(px(x), py(y), PLAN_CELL, PLAN_CELL)
    }
  }

  // doors
  for (const d of plan.doors) {
    ctx.fillStyle = security ? '#0b1120' : 'rgba(255,79,109,0.5)'
    ctx.fillRect(px(d.x) + 2, py(d.y) + 2, PLAN_CELL - 4, PLAN_CELL - 4)
    if (security) {
      ctx.fillStyle = 'rgba(143,248,255,0.4)'
      ctx.fillRect(px(d.x) + 3, py(d.y) + PLAN_CELL / 2, PLAN_CELL - 6, 1)
    }
  }

  // furniture
  for (const f of plan.furniture) {
    const fx = px(f.x)
    const fy = py(f.y)
    const fw = f.w * PLAN_CELL
    const fh = f.h * PLAN_CELL
    ctx.fillStyle = FURN_COLORS[f.kind]
    ctx.fillRect(fx + 2, fy + 2, fw - 4, fh - 4)
    if (f.kind === 'desk') {
      ctx.fillStyle = power ? 'rgba(143,248,255,0.75)' : 'rgba(143,248,255,0.12)'
      ctx.fillRect(fx + 4, fy + 4, 5, 3)
    } else if (f.kind === 'rack') {
      for (let i = 0; i < 3; i++) {
        const on = power && Math.sin(time * 3 + f.x * 2 + i) > -0.2
        ctx.fillStyle = on ? (i === 1 ? '#63ff9b' : '#22e6ff') : '#123'
        ctx.fillRect(fx + 5, fy + 5 + i * 6, 3, 2)
      }
    } else if (f.kind === 'stall') {
      ctx.fillStyle = `${district.accent}88`
      ctx.fillRect(fx + 2, fy + 2, fw - 4, 3)
    } else if (f.kind === 'machine') {
      ctx.fillStyle = '#ff8a2a'
      ctx.fillRect(fx + 3, fy + fh - 6, fw - 6, 2)
    } else if (f.kind === 'plant') {
      ctx.fillStyle = '#2fae5e'
      ctx.fillRect(fx + 6, fy + 5, PLAN_CELL - 12, PLAN_CELL - 11)
      ctx.fillStyle = '#63ff9b'
      ctx.fillRect(fx + 8, fy + 7, 3, 3)
    } else if (f.kind === 'tank') {
      ctx.strokeStyle = '#22e6ff66'
      ctx.beginPath()
      ctx.arc(fx + fw / 2, fy + fh / 2, Math.min(fw, fh) / 2 - 4, 0, Math.PI * 2)
      ctx.stroke()
    } else if (f.kind === 'bed') {
      ctx.fillStyle = '#8ff8ff55'
      ctx.fillRect(fx + 4, fy + 4, fw - 8, 4)
    } else if (f.kind === 'screen') {
      ctx.fillStyle = power ? `rgba(255,79,163,${0.5 + Math.sin(time * 2 + f.x) * 0.2})` : 'rgba(255,79,163,0.1)'
      ctx.fillRect(fx + 3, fy + 4, fw - 6, fh - 8)
    } else if (f.kind === 'stage') {
      ctx.strokeStyle = '#ff4fa388'
      ctx.strokeRect(fx + 2, fy + 2, fw - 4, fh - 4)
    } else if (f.kind === 'crate') {
      ctx.strokeStyle = '#4a5a74'
      ctx.strokeRect(fx + 4, fy + 4, fw - 8, fh - 8)
    }
  }

  // room labels
  ctx.font = '6px Silkscreen, monospace'
  ctx.fillStyle = `${district.color}88`
  for (const r of plan.rooms) {
    ctx.fillText(r.label, px(r.x + 1) + 4, py(r.y + 1) + 9)
  }

  // occupants
  for (const n of npcs) {
    const moving = n.wait <= 0
    const bob = moving ? Math.sin(time * 8 + n.phase) * 0.6 : 0
    const nx = px(n.x)
    const ny = py(n.y) + bob
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(nx - 3, ny + 2, 7, 2)
    ctx.fillStyle = n.body
    ctx.fillRect(nx - 2, ny - 3, 5, 6)
    ctx.fillStyle = n.visor
    ctx.fillRect(nx - 1, ny - 4, 3, 2)
    if (n.visitor) {
      ctx.font = '6px Silkscreen, monospace'
      ctx.fillStyle = n.self ? '#63ff9b' : '#8ff8ff'
      const tag = n.self ? `${n.name} (YOU)` : n.name
      ctx.fillText(tag, nx - tag.length * 2, ny - 8)
    }
  }

  // power-out darkness
  if (!power) {
    ctx.fillStyle = 'rgba(2,3,10,0.78)'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = `rgba(255,79,109,${0.5 + Math.sin(time * 2) * 0.3})`
    ctx.fillRect(px(1), py(8), 3, 3)
    ctx.fillRect(px(PLAN_COLS - 2), py(9), 3, 3)
    ctx.fillRect(px(13), py(1), 3, 3)
    ctx.fillRect(px(14), py(PLAN_ROWS - 2), 3, 3)
  }

  // scan sweep + scanlines
  const sweep = (time * 30) % height
  const grad = ctx.createLinearGradient(0, sweep - 8, 0, sweep + 8)
  grad.addColorStop(0, 'rgba(34,230,255,0)')
  grad.addColorStop(0.5, 'rgba(34,230,255,0.07)')
  grad.addColorStop(1, 'rgba(34,230,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, sweep - 8, width, 16)
  for (let y = 0; y < height; y += 3) {
    ctx.fillStyle = 'rgba(0,0,0,0.1)'
    ctx.fillRect(0, y, width, 1)
  }

  // labels
  ctx.font = '7px Silkscreen, monospace'
  ctx.fillStyle = `${district.color}cc`
  ctx.fillText(`FLOOR PLAN // LEVEL ${String(floor + 1).padStart(2, '0')} // ${plan.archetype.toUpperCase()}`, 12, 18)
  ctx.fillStyle = 'rgba(143,248,255,0.55)'
  ctx.fillText(`${building.name.slice(0, 26)} // ${district.code}`, 12, 30)
  ctx.fillStyle = 'rgba(255,79,163,0.7)'
  ctx.fillText('LIFE SIGNS TRACKED', width - 130, 18)
  ctx.fillStyle = 'rgba(143,248,255,0.4)'
  ctx.fillText(power ? 'GRID POWER NOMINAL' : 'BACKUP CELLS ONLY', width - 130, 30)
}