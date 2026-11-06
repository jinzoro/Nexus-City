import type {
  Aircraft,
  Billboard,
  Building,
  BuildingStyle,
  CityData,
  District,
  DistrictId,
  Drone,
  Emitter,
  Hologram,
  OuterBlock,
  Park,
  Pedestrian,
  Prop,
  RailLine,
  Train,
  Vehicle,
  VehicleType,
} from '../types'
import { landmarkPersonality, pickCrown, pickFacade, pickQuirk, pickStreet } from './personality'

export const WORLD_SIZE = 198
export const BLOCK_COUNT = 18
export const BLOCK_SIZE = 11
export const ROAD_SIZE = 2
export const TILE_W = 24
export const TILE_H = 12

const TAU = Math.PI * 2

function mulberry32(seed: number) {
  let a = seed >>> 0
  return function random() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash2(x: number, y: number) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263)
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function pick<T>(rng: () => number, list: T[]): T {
  return list[Math.floor(rng() * list.length) % list.length]
}

function between(rng: () => number, min: number, max: number) {
  return min + rng() * (max - min)
}

function tintHex(hex: string, factor: number) {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * factor)))
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * factor)))
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * factor)))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export const DISTRICTS: District[] = [
  {
    id: 'central',
    name: 'CENTRAL NEXUS',
    code: 'NX-00',
    tagline: 'THE HEART OF THE MACHINE',
    description:
      'The administrative and technological core of the underground world. A vertical city of civic towers, holographic plazas and the great transit spine.',
    center: { x: 99, y: 99 },
    radius: 34,
    color: '#22e6ff',
    accent: '#ff45d4',
    glow: '#00b8ff',
    population: 1842000,
    power: 97,
    network: 99.8,
    stability: 96,
    atmosphere: 'CLEAR / ARTIFICIAL DAWN',
    sound: 'CIVIC HUM',
  },
  {
    id: 'market',
    name: 'NEON MARKET',
    code: 'NM-02',
    tagline: 'EAT. TRADE. DISAPPEAR.',
    description:
      'A compressed bazaar of ramen counters, black-market tech and stacked apartments. Every surface is a sign; every alley is a transaction.',
    center: { x: 35, y: 99 },
    radius: 28,
    color: '#ff4fa3',
    accent: '#ffb347',
    glow: '#ff2a88',
    population: 2340000,
    power: 91,
    network: 94.2,
    stability: 78,
    atmosphere: 'STEAM / NEON HAZE',
    sound: 'CROWD + SIZZLE',
  },
  {
    id: 'corporate',
    name: 'CORPORATE SECTOR',
    code: 'CS-04',
    tagline: 'OWN THE AIR YOU BREATHE',
    description:
      'Sovereign towers and private skybridges. The oldest money beneath the surface lives here, suspended above the smog on columns of glass.',
    center: { x: 145, y: 53 },
    radius: 28,
    color: '#76dcff',
    accent: '#d8f7ff',
    glow: '#26a8ff',
    population: 1110000,
    power: 99,
    network: 99.9,
    stability: 88,
    atmosphere: 'FILTERED / COLD',
    sound: 'LOW SERVER WIND',
  },
  {
    id: 'industrial',
    name: 'INDUSTRIAL SECTOR',
    code: 'IS-07',
    tagline: 'WE BUILD THE DARK',
    description:
      'Foundries, fabrication halls and coolant rivers. The city is assembled here in shifts that never end, under a ceiling of pipes and orange sparks.',
    center: { x: 55, y: 155 },
    radius: 30,
    color: '#ff9a3d',
    accent: '#ffe15c',
    glow: '#ff6a00',
    population: 890000,
    power: 86,
    network: 87.4,
    stability: 81,
    atmosphere: 'SMOG / SPARK DRIFT',
    sound: 'PISTONS + VENTILATION',
  },
  {
    id: 'residential',
    name: 'RESIDENTIAL SECTOR',
    code: 'RS-11',
    tagline: 'TWELVE MILLION SMALL LIVES',
    description:
      'Habitat stacks, communal gardens and a million kitchen windows. The warmest light in the city comes from here.',
    center: { x: 145, y: 145 },
    radius: 31,
    color: '#ffd68a',
    accent: '#ff6fb7',
    glow: '#ffb84d',
    population: 3520000,
    power: 92,
    network: 96.1,
    stability: 90,
    atmosphere: 'WARM / LIGHT DRIZZLE',
    sound: 'DISTANT LIVES',
  },
  {
    id: 'tech',
    name: 'TECHNOLOGY DISTRICT',
    code: 'TD-08',
    tagline: 'THE FUTURE IS UNDER CONSTRUCTION',
    description:
      'Research campuses, AI vaults and experimental habitats. Entire buildings are prototypes; some have never been switched off.',
    center: { x: 158, y: 100 },
    radius: 29,
    color: '#2affc8',
    accent: '#39d9ff',
    glow: '#00ffb3',
    population: 780000,
    power: 96,
    network: 99.7,
    stability: 93,
    atmosphere: 'COOL / IONIZED',
    sound: 'SERVO + DATA CHORUS',
  },
  {
    id: 'entertainment',
    name: 'ENTERTAINMENT DISTRICT',
    code: 'ED-03',
    tagline: 'FORGET THE CEILING',
    description:
      'Arcades, holo-theatres and sound arenas stacked around the old ventilation shaft. The district never sees a dark hour.',
    center: { x: 99, y: 36 },
    radius: 27,
    color: '#ff3dd8',
    accent: '#ffb13d',
    glow: '#ff00cc',
    population: 1240000,
    power: 94,
    network: 98.2,
    stability: 84,
    atmosphere: 'HOLO PARTICLES / HOT',
    sound: 'BASS + ARCADE CHORUS',
  },
  {
    id: 'bio',
    name: 'BIO-DOME',
    code: 'BD-06',
    tagline: 'A SMALL GREEN LIE',
    description:
      'A chain of pressure domes holding forests, farms and a reservoir. Artificial sunlight falls in slow amber columns. People come here to remember weather.',
    center: { x: 39, y: 44 },
    radius: 30,
    color: '#63ff9b',
    accent: '#4fffe0',
    glow: '#2dff7e',
    population: 380000,
    power: 89,
    network: 92.5,
    stability: 95,
    atmosphere: 'HUMID / SUNLAMP',
    sound: 'WATER + LEAVES',
  },
  {
    id: 'transit',
    name: 'TRANSPORT HUB',
    code: 'TH-01',
    tagline: 'EVERY LINE LEADS DOWN',
    description:
      'The Grand Terminal and the maglev interchange. Trains arrive from eleven buried cities; nobody has counted all the platforms.',
    center: { x: 99, y: 164 },
    radius: 27,
    color: '#5fe5ff',
    accent: '#ffb347',
    glow: '#19c7ff',
    population: 380000,
    power: 95,
    network: 97.8,
    stability: 87,
    atmosphere: 'EXHAUST / STATIC',
    sound: 'BRAKES + ANNOUNCEMENTS',
  },
]

const districtMap = new Map<DistrictId, District>(DISTRICTS.map((d) => [d.id, d]))

export function getDistrict(id: DistrictId) {
  return districtMap.get(id) ?? DISTRICTS[0]
}

const PALETTES: Record<
  DistrictId,
  { body: [string, string, string][]; roof: string; window: string; neon: string; accent: string }
> = {
  central: {
    body: [
      ['#2a3159', '#1d2343', '#38406f'],
      ['#242b50', '#171c38', '#333b69'],
      ['#303764', '#1f2548', '#414a7c'],
      ['#202748', '#151a33', '#303765'],
    ],
    roof: '#4a558c',
    window: '#8ff8ff',
    neon: '#22e6ff',
    accent: '#ff45d4',
  },
  corporate: {
    body: [
      ['#182741', '#101b30', '#243b5c'],
      ['#1c2e4a', '#121f35', '#294467'],
      ['#132138', '#0c1729', '#1f3451'],
      ['#223752', '#16263d', '#304c70'],
    ],
    roof: '#36567a',
    window: '#76dcff',
    neon: '#00d4ff',
    accent: '#d8f7ff',
  },
  market: {
    body: [
      ['#3a2138', '#2a172b', '#4a2a43'],
      ['#301b31', '#221125', '#41243d'],
      ['#45253c', '#2f192b', '#58314c'],
      ['#392039', '#28152a', '#4b2b45'],
    ],
    roof: '#5f3a58',
    window: '#ffd27a',
    neon: '#ff4fa3',
    accent: '#ffb347',
  },
  industrial: {
    body: [
      ['#352d2c', '#241f20', '#463a34'],
      ['#2b2524', '#1d1919', '#3b312d'],
      ['#3d322e', '#2a2220', '#4d3f38'],
      ['#312927', '#211c1b', '#433733'],
    ],
    roof: '#59473d',
    window: '#ffb45c',
    neon: '#ff8a2a',
    accent: '#ffe15c',
  },
  residential: {
    body: [
      ['#30263f', '#211a2f', '#3d3053'],
      ['#29203b', '#1c162b', '#372b4d'],
      ['#372b49', '#261d36', '#46375d'],
      ['#2c2340', '#1e1831', '#3b2f54'],
    ],
    roof: '#55446c',
    window: '#ffd68a',
    neon: '#ff6fb7',
    accent: '#74e4ff',
  },
  tech: {
    body: [
      ['#123039', '#0b2128', '#1d4651'],
      ['#102a33', '#091d24', '#1a3d47'],
      ['#173840', '#0d272f', '#23525b'],
      ['#0f2c36', '#0a1f27', '#1b434c'],
    ],
    roof: '#2a5e66',
    window: '#6affd2',
    neon: '#2affc8',
    accent: '#39d9ff',
  },
  entertainment: {
    body: [
      ['#321846', '#21102f', '#45205e'],
      ['#29123a', '#1a0c27', '#3a1a4f'],
      ['#3a1b50', '#251133', '#4d2568'],
      ['#2e1542', '#1e0e2c', '#401d59'],
    ],
    roof: '#5f3180',
    window: '#ff72e0',
    neon: '#ff3dd8',
    accent: '#ffb13d',
  },
  bio: {
    body: [
      ['#17382e', '#0e241e', '#24503f'],
      ['#143129', '#0c1f1a', '#1f4739'],
      ['#1a4033', '#102a22', '#2a5b48'],
      ['#12362c', '#0b221c', '#1d493c'],
    ],
    roof: '#356d51',
    window: '#aaff85',
    neon: '#63ff9b',
    accent: '#4fffe0',
  },
  transit: {
    body: [
      ['#282f42', '#191e2c', '#39445c'],
      ['#222939', '#151a26', '#323c53'],
      ['#2f374c', '#1d2332', '#414d68'],
      ['#252c3f', '#171c29', '#353f57'],
    ],
    roof: '#4e5d7c',
    window: '#ffcf7a',
    neon: '#5fe5ff',
    accent: '#ffb347',
  },
}

const RING: { id: DistrictId; angle: number }[] = [
  { id: 'tech', angle: 0 },
  { id: 'corporate', angle: -Math.PI / 4 },
  { id: 'entertainment', angle: -Math.PI / 2 },
  { id: 'bio', angle: (-3 * Math.PI) / 4 },
  { id: 'market', angle: Math.PI },
  { id: 'industrial', angle: (3 * Math.PI) / 4 },
  { id: 'transit', angle: Math.PI / 2 },
  { id: 'residential', angle: Math.PI / 4 },
]

function angleDiff(a: number, b: number) {
  let d = a - b
  while (d > Math.PI) d -= TAU
  while (d < -Math.PI) d += TAU
  return Math.abs(d)
}

export function districtForCell(x: number, y: number): DistrictId {
  const cx = WORLD_SIZE / 2
  const cy = WORLD_SIZE / 2
  const dx = x - cx
  const dy = y - cy
  const dist = Math.hypot(dx, dy)
  const jitter = (hash2(Math.floor(x / 4), Math.floor(y / 4)) - 0.5) * 12
  if (dist < 30 + jitter) return 'central'
  let angle = Math.atan2(dy, dx)
  angle += (hash2(Math.floor(x / 5), Math.floor(y / 5)) - 0.5) * 0.12
  let best = RING[0]
  let bestDiff = Infinity
  for (const entry of RING) {
    const d = angleDiff(angle, entry.angle)
    if (d < bestDiff) {
      bestDiff = d
      best = entry
    }
  }
  return best.id
}

const PREFIX: Record<DistrictId, string[]> = {
  central: ['AXIOM', 'MERIDIAN', 'NEXUS', 'HELIX', 'VANTAGE', 'CIVIC', 'VECTOR', 'MONOLITH', 'ORBIT', 'SYNOD', 'APEX', 'CONCORD'],
  market: ['NEON', 'LUCKY', 'DRAGON', 'KURO', 'MIDNIGHT', 'STAR', 'HIKARI', 'CHROME', 'MAMA', 'TIGER', 'MOON', 'PAPER'],
  corporate: ['OMNI', 'ZENITH', 'AUREUS', 'STRATOS', 'BLACKLINE', 'VANTA', 'PARALLAX', 'SUMMIT', 'OBSIDIAN', 'MERIT', 'ASCENT', 'GOLDEN'],
  industrial: ['FOUNDRY', 'FORGE', 'IRON', 'SMOG', 'GEAR', 'KESSLER', 'VULCAN', 'RIVET', 'ANVIL', 'CINDER', 'PISTON', 'SLAG'],
  residential: ['HABITAT', 'HIVE', 'NOOK', 'BLOOM', 'COMMONS', 'TERRACE', 'NEST', 'GARDEN', 'LATTICE', 'WARM', 'MORNING', 'QUIET'],
  tech: ['QUANTUM', 'SYNAPSE', 'CORTEX', 'LUMEN', 'VERTEX', 'NANO', 'PHASE', 'CIPHER', 'AETHER', 'PROTO', 'NEURAL', 'VECTOR'],
  entertainment: ['PULSE', 'ARCADE', 'ECHO', 'PRISM', 'STARLIGHT', 'BASSLINE', 'HOLO', 'COMET', 'CARNIVAL', 'STATIC', 'DREAM', 'LASER'],
  bio: ['VERDANT', 'TERRA', 'SPORE', 'CANOPY', 'HYDRO', 'CHLORO', 'MOSS', 'FERN', 'SUNLAMP', 'DEWDROP', 'ORCHID', 'MIST'],
  transit: ['TRANSIT', 'WAYPOINT', 'JUNCTION', 'RAIL', 'DEPOT', 'PLATFORM', 'SIGNAL', 'CONCOURSE', 'BRIDGE', 'TUNNEL', 'CARRIAGE', 'GATE'],
}

const SUFFIX: Record<DistrictId, string[]> = {
  central: ['TOWER', 'CORE', 'SPIRE', 'EXCHANGE', 'HALL', 'ARCOLOGY', 'OBSERVATORY', 'AUTHORITY', 'COMMONS', 'NODE'],
  market: ['RAMEN', 'BAZAAR', 'NOODLE', 'MARKET', 'ARCADE', 'PAWN', 'TEA HOUSE', 'STALL', 'HOTEL', 'CLINIC', 'BAR', 'KITCHEN'],
  corporate: ['TOWER', 'GROUP', 'PLAZA', 'CAPITAL', 'HEADQUARTERS', 'BANK', 'SPIRE', 'HOLDINGS', 'EXCHANGE', 'OFFICES'],
  industrial: ['WORKS', 'FOUNDRY', 'PLANT', 'YARD', 'DEPOT', 'ASSEMBLY', 'REFINERY', 'FABRICATION', 'WAREHOUSE', 'STACK'],
  residential: ['BLOCK', 'HABITAT', 'HOMES', 'TERRACES', 'APARTMENTS', 'COMMONS', 'GARDENS', 'STACK', 'COURT', 'RESIDENCES'],
  tech: ['LABS', 'INSTITUTE', 'CORE', 'FACILITY', 'VAULT', 'RESEARCH', 'ARRAY', 'SYSTEMS', 'BIOLAB', 'NEXUS'],
  entertainment: ['ARCADE', 'ARENA', 'CLUB', 'THEATRE', 'HALL', 'LOUNGE', 'STUDIO', 'CINEMA', 'PALACE', 'STAGE'],
  bio: ['DOME', 'GARDENS', 'FARM', 'RESERVOIR', 'ARBORETUM', 'GREENHOUSE', 'ORCHARD', 'HABITAT', 'PONDS', 'GROVE'],
  transit: ['STATION', 'TERMINAL', 'PLATFORM', 'DEPOT', 'INTERCHANGE', 'JUNCTION', 'LINE', 'GATE', 'HALT', 'CROSSING'],
}

const TYPES: Record<DistrictId, string[]> = {
  central: ['CIVIC COMPLEX', 'ADMINISTRATION', 'DATA HUB', 'PUBLIC PLAZA', 'COMMS TOWER', 'ARCHIVE'],
  market: ['RAMEN BAR', 'NIGHT MARKET', 'ARCADE', 'TEA HOUSE', 'PAWN SHOP', 'HOSTEL', 'NOODLE HOUSE', 'STREET CLINIC'],
  corporate: ['CORPORATE HQ', 'FINANCIAL TOWER', 'EXECUTIVE OFFICE', 'PRIVATE BANK', 'SKY LOBBY', 'LEGAL VAULT'],
  industrial: ['FABRICATION', 'REFINERY', 'POWER PLANT', 'CARGO DEPOT', 'FOUNDRY', 'WATER WORKS', 'ASSEMBLY LINE'],
  residential: ['HABITAT STACK', 'APARTMENT BLOCK', 'COMMUNAL HOUSING', 'ROOFTOP GARDEN', 'LAUNDRY', 'FAMILY UNIT'],
  tech: ['RESEARCH LAB', 'AI CORE', 'SERVER FARM', 'ROBOTICS BAY', 'QUANTUM ARRAY', 'BIOTECH LAB', 'PROTOTYPE HALL'],
  entertainment: ['HOLO THEATRE', 'ARCADE', 'MUSIC VENUE', 'CINEMA', 'GAME CENTER', 'CLUB', 'AMUSEMENT HALL'],
  bio: ['VERTICAL FARM', 'BOTANICAL LAB', 'GREENHOUSE', 'RESERVOIR', 'FOREST DOME', 'SEED VAULT', 'HYDROPONICS'],
  transit: ['METRO STATION', 'MAGLEV PLATFORM', 'BUS TERMINAL', 'CARGO HALT', 'CONTROL TOWER', 'TRANSIT OFFICE'],
}

const OWNERS: Record<DistrictId, string[]> = {
  central: ['NEXUS CIVIC AUTHORITY', 'THE CENTRAL SYNOD', 'ORBITAL SYSTEMS', 'CIVIC TRUST 07'],
  market: ['KURO FAMILY', 'NEON TRADERS UNION', 'MAMA HIKARI', 'THE PAPER MOON CO-OP'],
  corporate: ['AUREUS HOLDINGS', 'VANTA GROUP', 'OMNI STRATOS', 'BLACKLINE CAPITAL'],
  industrial: ['FOUNDRY GUILD 09', 'KESSLER INDUSTRIES', 'VULCAN WORKS', 'CIVIC POWER DIVISION'],
  residential: ['HABITAT CO-OP', 'RESIDENT ASSEMBLY', 'COMMONS TRUST', 'CIVIC HOUSING BOARD'],
  tech: ['CORTEX INSTITUTE', 'QUANTUM DIVISION', 'SYNAPSE LABS', 'NEXUS RESEARCH COUNCIL'],
  entertainment: ['PULSE ENTERTAINMENT', 'STARLIGHT ARCADE CO.', 'HOLO DREAMS', 'THE BASSLINE CLUB'],
  bio: ['VERDANT CONSERVANCY', 'TERRA DOMES', 'HYDRO FARM COLLECTIVE', 'BIO ARCHIVE'],
  transit: ['NEXUS TRANSIT AUTHORITY', 'LINE 02 OPERATIONS', 'GRAND TERMINAL CO.', 'RAIL GUILD'],
}

const ADS = [
  'NEXUS',
  'RAMEN 24H',
  'BUY NOW',
  'ZERO',
  'HOLO',
  'LINE 02',
  'SYNTH',
  'DREAM',
  'NOVA',
  'AI NOW',
  'KURO',
  'ORBIT',
  'LIVE',
  'MEGA',
  'NEON',
  'CHROME',
  'PULSE',
  'EAT',
  'DATA',
  'SALE',
  'FUTURE',
  'WAKE',
]

const STATUSES: Building['status'][] = [
  'ONLINE',
  'ONLINE',
  'ONLINE',
  'ONLINE',
  'ONLINE',
  'STABLE',
  'STABLE',
  'STABLE',
  'MAINTENANCE',
  'RESTRICTED',
  'OFFLINE',
]

const LANDMARK_DEFS: Array<
  Partial<Building> & {
    x: number
    y: number
    w: number
    d: number
    h: number
    style: BuildingStyle
    district: DistrictId
    name: string
    type: string
    description: string
  }
> = [
  {
    x: 94,
    y: 94,
    w: 10,
    d: 10,
    h: 300,
    style: 'spire',
    district: 'central',
    name: 'NEXUS CENTRAL SPIRE',
    type: 'CIVIC CORE / AI SEAT',
    description:
      'The tallest structure beneath the surface. Its crown houses the civic AI, the climate grid and the city’s oldest unanswered messages.',
    billboard: true,
    sign: { text: 'NEXUS', vertical: false },
  },
  {
    x: 140,
    y: 48,
    w: 9,
    d: 9,
    h: 255,
    style: 'twin',
    district: 'corporate',
    name: 'AUREUS TWIN TOWERS',
    type: 'CORPORATE HEADQUARTERS',
    description:
      'Two sovereign towers joined by three private skybridges. The western face is leased entirely to advertisements nobody remembers buying.',
    billboard: true,
  },
  {
    x: 90,
    y: 166,
    w: 18,
    d: 11,
    h: 78,
    style: 'station',
    district: 'transit',
    name: 'GRAND TERMINAL',
    type: 'TRANSIT CATHEDRAL',
    description:
      'Eleven buried railway lines converge here. The departure board has been counting upward since before the current calendar.',
    billboard: true,
    sign: { text: 'LINE 02', vertical: false },
  },
  {
    x: 24,
    y: 94,
    w: 11,
    d: 9,
    h: 58,
    style: 'market',
    district: 'market',
    name: 'THE NEON GATE',
    type: 'MARKET ARCADE',
    description:
      'The eastern entrance to the market warren. Six storeys of signs, steam and fried noodles compressed into a single address.',
    billboard: true,
    sign: { text: 'MARKET', vertical: true },
  },
  {
    x: 44,
    y: 150,
    w: 14,
    d: 11,
    h: 92,
    style: 'industrial',
    district: 'industrial',
    name: 'FOUNDRY 09',
    type: 'HEAVY FABRICATION',
    description:
      'A city-sized machine that eats ore and exhales warm rain. The night shift has not been officially ended in nine years.',
    billboard: true,
    sign: { text: 'FOUNDRY', vertical: false },
  },
  {
    x: 20,
    y: 36,
    w: 17,
    d: 17,
    h: 74,
    style: 'dome',
    district: 'bio',
    name: 'THE VERDANT DOME',
    type: 'PRESSURE FOREST',
    description:
      'A sealed forest beneath a geodesic sky. Real birds, engineered weather, and a lake deep enough to have its own tide.',
    billboard: true,
    sign: { text: 'BIO', vertical: false },
  },
  {
    x: 78,
    y: 22,
    w: 13,
    d: 12,
    h: 105,
    style: 'arena',
    district: 'entertainment',
    name: 'PULSE ARENA',
    type: 'HOLO-ENTERTAINMENT VENUE',
    description:
      'A stacked arena built around a suspended holographic core. Tonight’s event is visible from four districts.',
    billboard: true,
    sign: { text: 'PULSE', vertical: false },
  },
  {
    x: 162,
    y: 94,
    w: 11,
    d: 11,
    h: 158,
    style: 'data',
    district: 'tech',
    name: 'CORTEX LABS',
    type: 'AI RESEARCH INSTITUTE',
    description:
      'A black-glass research pyramid. The upper floors are listed as unbuilt; the lights on those floors are unexplained.',
    billboard: true,
    sign: { text: 'CORTEX', vertical: false },
  },
  {
    x: 140,
    y: 140,
    w: 11,
    d: 11,
    h: 152,
    style: 'block',
    district: 'residential',
    name: 'HABITAT 7',
    type: 'MEGA RESIDENCE',
    description:
      'Four thousand homes arranged around a vertical garden. The communal laundry is the social center of the western stacks.',
    hasGarden: true,
    billboard: true,
    sign: { text: 'HABITAT 7', vertical: true },
  },
  {
    x: 146,
    y: 118,
    w: 9,
    d: 9,
    h: 112,
    style: 'data',
    district: 'tech',
    name: 'ORBITAL DATA VAULT',
    type: 'ARCHIVE / COLD STORAGE',
    description:
      'A radiation-shielded archive of every message transmitted in the city. Its cooling pipes glow faint blue through the floor.',
    billboard: true,
  },
  {
    x: 108,
    y: 26,
    w: 10,
    d: 9,
    h: 82,
    style: 'market',
    district: 'entertainment',
    name: 'ZERO ARCADE',
    type: 'ARCADE / NIGHTCLUB',
    description:
      'The oldest arcade in the underground. Cabinet high-scores are considered a form of local government.',
    billboard: true,
    sign: { text: 'ZERO', vertical: true },
  },
  {
    x: 74,
    y: 78,
    w: 8,
    d: 8,
    h: 118,
    style: 'tower',
    district: 'central',
    name: 'SKYWAY EXCHANGE',
    type: 'ELEVATED TRANSIT NODE',
    description:
      'A vertical interchange connecting the street grid to the maglev decks. The elevators here are the busiest machines in NEXUS.',
    billboard: true,
    sign: { text: 'SKYWAY', vertical: false },
  },
  {
    x: 30,
    y: 118,
    w: 8,
    d: 7,
    h: 34,
    style: 'market',
    district: 'market',
    name: 'MIDNIGHT RAMEN',
    type: '24H NOODLE COUNTER',
    description:
      'Nine stools, three broth taps and a neon dragon that has been repaired forty-one times. Open until the city stops.',
    billboard: true,
    sign: { text: 'RAMEN', vertical: true },
  },
  {
    x: 48,
    y: 34,
    w: 8,
    d: 8,
    h: 44,
    style: 'greenhouse',
    district: 'bio',
    name: 'HOLO GARDENS',
    type: 'BOTANICAL ATRIUM',
    description:
      'A glasshouse where projected species grow beside real ones. The gardeners insist there is no difference.',
    billboard: true,
    sign: { text: 'BLOOM', vertical: false },
  },
]

const PARK_DEFS: Array<Omit<Park, 'id' | 'seed'>> = [
  { kind: 'plaza', x: 87, y: 87, w: 24, d: 24, district: 'central' },
  { kind: 'park', x: 124, y: 136, w: 11, d: 11, district: 'residential' },
  { kind: 'park', x: 32, y: 132, w: 9, d: 9, district: 'market' },
  { kind: 'lake', x: 34, y: 54, w: 10, d: 10, district: 'bio' },
  { kind: 'farm', x: 56, y: 36, w: 10, d: 10, district: 'bio' },
  { kind: 'yard', x: 62, y: 144, w: 9, d: 9, district: 'industrial' },
  { kind: 'plaza', x: 154, y: 104, w: 9, d: 9, district: 'tech' },
  { kind: 'park', x: 116, y: 146, w: 8, d: 8, district: 'residential' },
]

const OCCUPIED = new Uint8Array(WORLD_SIZE * WORLD_SIZE)

function markOccupied(x: number, y: number, w: number, d: number) {
  const x0 = Math.max(0, Math.floor(x))
  const y0 = Math.max(0, Math.floor(y))
  const x1 = Math.min(WORLD_SIZE, Math.ceil(x + w))
  const y1 = Math.min(WORLD_SIZE, Math.ceil(y + d))
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      OCCUPIED[yy * WORLD_SIZE + xx] = 1
    }
  }
}

function isOccupied(x: number, y: number, w: number, d: number) {
  const x0 = Math.max(0, Math.floor(x))
  const y0 = Math.max(0, Math.floor(y))
  const x1 = Math.min(WORLD_SIZE, Math.ceil(x + w))
  const y1 = Math.min(WORLD_SIZE, Math.ceil(y + d))
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      if (OCCUPIED[yy * WORLD_SIZE + xx]) return true
    }
  }
  return false
}

function resetOccupied() {
  OCCUPIED.fill(0)
}

function makeBuildingName(rng: () => number, district: DistrictId, used: Set<string>) {
  const prefix = pick(rng, PREFIX[district])
  const suffix = pick(rng, SUFFIX[district])
  let name = `${prefix} ${suffix}`
  if (used.has(name)) {
    const n = 2 + Math.floor(rng() * 88)
    name = `${prefix} ${suffix} ${String(n).padStart(2, '0')}`
  }
  let i = 2
  while (used.has(name)) {
    name = `${prefix} ${suffix} ${String(i).padStart(2, '0')}`
    i++
  }
  used.add(name)
  return name
}

function makeDescription(rng: () => number, district: DistrictId, type: string) {
  const snippets: Record<DistrictId, string[]> = {
    central: [
      'A civic node tied directly into the Central Spire. The lobby smells of ozone and fresh concrete.',
      'One of the original support structures, now wrapped in public terminals and vertical gardens.',
      'Its lower floors are open to all citizens. The upper floors answer only to the civic AI.',
    ],
    market: [
      'The smell of broth and solder reaches the third floor. Nobody has ever seen the back room empty.',
      'A stacked commercial warren. The sign outside is brighter than the sunlamps.',
      'Open late, cash only, no questions. The elevator has a waiting list.',
    ],
    corporate: [
      'Private floors, private weather, private air. The lobby is legally a separate jurisdiction.',
      'Its glass skin reflects the cavern lights in colors that do not appear on the public spectrum.',
      'A quiet machine for converting attention into ownership.',
    ],
    industrial: [
      'Warm pipes run through every room. The floor hums at a frequency you can feel in your teeth.',
      'Production has not stopped since the last audit. The last audit was cancelled.',
      'Smoke is routed through three filters and then released as municipal weather.',
    ],
    residential: [
      'Warm windows, narrow corridors, and a communal kitchen that never quite closes.',
      'Someone on the ninth floor is growing tomatoes under a stolen sunlamp.',
      'The building committee meets on the roof. Everyone is welcome; nobody brings chairs.',
    ],
    tech: [
      'A clean room wrapped around a machine that is learning to be a building.',
      'The lights in the upper labs are on a schedule nobody can access.',
      'Prototype hardware fills the walls. Some of it is older than the district.',
    ],
    entertainment: [
      'The bass travels through the support columns and into the neighboring hab-stacks.',
      'A palace of projected light built on top of an old arcade. The old arcade is still inside.',
      'Every screen is showing something different. All of them are looking at you.',
    ],
    bio: [
      'Condensation beads on the inside of the glass. The air is thick enough to drink.',
      'A living machine for making oxygen, food and the idea of a sky.',
      'The irrigation system is older than the city and still speaks its first language.',
    ],
    transit: [
      'Trains pass through the lower levels every ninety seconds. The floor moves with them.',
      'A cathedral of timetables and temporary walls. Every platform is both new and abandoned.',
      'The announcement system has been sampled by every musician in the city.',
    ],
  }
  const base = pick(rng, snippets[district])
  return `${type}. ${base}`
}

function buildingFromDef(
  def: (typeof LANDMARK_DEFS)[number],
  index: number,
  rng: () => number,
): Building {
  const palette = PALETTES[def.district]
  const baseBody = pick(rng, palette.body)
  const tint = 0.9 + rng() * 0.2
  const body: [string, string, string] = [
    tintHex(baseBody[0], tint),
    tintHex(baseBody[1], tint * 0.97),
    tintHex(baseBody[2], tint * 1.04),
  ]
  const persona = landmarkPersonality(def.style)
  return {
    id: `landmark-${index}-${def.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: def.name,
    type: def.type,
    district: def.district,
    x: def.x,
    y: def.y,
    w: def.w,
    d: def.d,
    h: def.h,
    style: def.style,
    seed: Math.floor(rng() * 1_000_000),
    floors: Math.max(3, Math.round(def.h / 6)),
    status: 'ONLINE',
    load: 40 + Math.floor(rng() * 55),
    systems: 4000 + Math.floor(rng() * 28000),
    owner: OWNERS[def.district][0],
    occupants: Math.floor(def.w * def.d * def.h * 1.8),
    description: def.description,
    landmark: true,
    billboard: def.billboard,
    sign: def.sign,
    body,
    roof: palette.roof,
    window: palette.window,
    neon: palette.neon,
    accent: palette.accent,
    hasGarden: def.hasGarden,
    ...persona,
    age: 0.08 + rng() * 0.26,
  }
}

function makeBuilding(
  x: number,
  y: number,
  w: number,
  d: number,
  district: DistrictId,
  rng: () => number,
  usedNames: Set<string>,
): Building {
  const palette = PALETTES[district]
  const baseBody = pick(rng, palette.body)
  const tint = 0.84 + rng() * 0.3
  const body: [string, string, string] = [
    tintHex(baseBody[0], tint),
    tintHex(baseBody[1], tint * 0.97),
    tintHex(baseBody[2], tint * 1.04),
  ]
  const window = pick(rng, [
    palette.window,
    palette.window,
    palette.window,
    palette.window,
    '#ffd9a0',
    '#bff8ff',
    '#ff9bd2',
  ])
  const neon = rng() < 0.16 ? palette.accent : palette.neon
  const accent = rng() < 0.12 ? palette.neon : palette.accent
  const styleRoll = rng()
  let style: BuildingStyle
  if (district === 'corporate') {
    style = styleRoll < 0.42 ? 'tower' : styleRoll < 0.64 ? 'twin' : styleRoll < 0.82 ? 'pyramid' : 'block'
  } else if (district === 'central') {
    style = styleRoll < 0.58 ? 'tower' : styleRoll < 0.75 ? 'pyramid' : styleRoll < 0.9 ? 'block' : 'data'
  } else if (district === 'market') {
    style = styleRoll < 0.58 ? 'market' : 'block'
  } else if (district === 'industrial') {
    style = styleRoll < 0.72 ? 'industrial' : 'block'
  } else if (district === 'residential') {
    style = styleRoll < 0.64 ? 'block' : styleRoll < 0.84 ? 'tower' : 'greenhouse'
  } else if (district === 'tech') {
    style = styleRoll < 0.38 ? 'data' : styleRoll < 0.68 ? 'tower' : styleRoll < 0.86 ? 'block' : 'dome'
  } else if (district === 'entertainment') {
    style = styleRoll < 0.3 ? 'arena' : styleRoll < 0.6 ? 'market' : styleRoll < 0.84 ? 'tower' : 'block'
  } else if (district === 'bio') {
    style = styleRoll < 0.34 ? 'greenhouse' : styleRoll < 0.56 ? 'dome' : 'block'
  } else {
    style = styleRoll < 0.28 ? 'station' : styleRoll < 0.56 ? 'tower' : 'block'
  }

  const ranges: Record<DistrictId, [number, number, number]> = {
    central: [45, 235, 2.4],
    corporate: [60, 275, 2.6],
    market: [14, 82, 1.55],
    industrial: [16, 98, 1.7],
    residential: [28, 145, 1.8],
    tech: [32, 185, 2.1],
    entertainment: [24, 140, 1.9],
    bio: [12, 78, 1.45],
    transit: [22, 112, 1.7],
  }
  const [minH, maxH, power] = ranges[district]
  let h = minH + Math.pow(rng(), power) * (maxH - minH)
  if (rng() < 0.035) h = Math.min(300, h * 1.4)
  h = Math.round(h)

  const type = pick(rng, TYPES[district])
  const name = makeBuildingName(rng, district, usedNames)
  const statusRoll = rng()
  const status: Building['status'] =
    statusRoll < 0.02 ? 'OFFLINE' : statusRoll < 0.07 ? 'MAINTENANCE' : statusRoll < 0.12 ? 'RESTRICTED' : statusRoll < 0.32 ? 'STABLE' : 'ONLINE'

  const billboard =
    h > 35 &&
    ['central', 'corporate', 'market', 'entertainment', 'tech', 'transit'].includes(district) &&
    rng() < 0.31
  const signRoll = rng()
  const sign =
    signRoll < 0.44 && ['market', 'entertainment', 'central', 'residential', 'transit'].includes(district)
      ? { text: pick(rng, ADS), vertical: district === 'market' || rng() < 0.4 }
      : undefined

  return {
    id: `b-${x}-${y}-${Math.floor(rng() * 1_000_000)}`,
    name,
    type,
    district,
    x,
    y,
    w,
    d,
    h,
    style,
    seed: Math.floor(rng() * 1_000_000),
    floors: Math.max(2, Math.round(h / 7)),
    status,
    load: 18 + Math.floor(rng() * 81),
    systems: 200 + Math.floor(rng() * 24000),
    owner: pick(rng, OWNERS[district]),
    occupants: Math.floor((w * d * h) / 4 + rng() * 80),
    description: makeDescription(rng, district, type),
    billboard,
    sign,
    body,
    roof: palette.roof,
    window,
    neon,
    accent,
    hasGarden: district === 'residential' && rng() < 0.35,
    construction: rng() < 0.018,
    facade: pickFacade(rng, district),
    crown: pickCrown(rng, district),
    street: pickStreet(rng, district),
    age: 0.08 + rng() * 0.86,
    quirk: pickQuirk(rng, district),
  }
}

export function generateCity(seed = 720412): CityData {
  resetOccupied()
  const rng = mulberry32(seed)
  const usedNames = new Set<string>()

  for (const def of LANDMARK_DEFS) markOccupied(def.x, def.y, def.w, def.d)
  for (const p of PARK_DEFS) markOccupied(p.x, p.y, p.w, p.d)

  const buildings: Building[] = []
  const parks: Park[] = PARK_DEFS.map((p, i) => ({ ...p, id: `park-${i}`, seed: Math.floor(rng() * 1_000_000) }))

  for (let by = 0; by < BLOCK_COUNT; by++) {
    for (let bx = 0; bx < BLOCK_COUNT; bx++) {
      const ox = bx * BLOCK_SIZE + ROAD_SIZE
      const oy = by * BLOCK_SIZE + ROAD_SIZE
      const district = districtForCell(ox + 4.5, oy + 4.5)
      for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 3; i++) {
          const x = ox + i * 3
          const y = oy + j * 3
          if (isOccupied(x, y, 3, 3)) continue
          if (rng() < 0.035) continue
          buildings.push(makeBuilding(x, y, 3, 3, district, rng, usedNames))
        }
      }
    }
  }

  const landmarks = LANDMARK_DEFS.map((def, i) => buildingFromDef(def, i, rng))
  buildings.push(...landmarks)
  buildings.sort((a, b) => a.x + a.y - (b.x + b.y))

  const billboards: Billboard[] = []
  const holograms: Hologram[] = []
  for (const b of buildings) {
    if (b.billboard) {
      const district = getDistrict(b.district)
      billboards.push({
        id: `bb-${b.id}`,
        buildingId: b.id,
        x: b.x + b.w * 0.5,
        y: b.y + b.d * 0.5,
        z: b.h + 14,
        width: b.landmark ? 38 : 22,
        height: b.landmark ? 17 : 10,
        text: b.sign?.text ?? pick(rng, ADS),
        colorA: district.color,
        colorB: district.accent,
        kind: b.sign?.vertical ? 'vertical' : 'billboard',
      })
    }
  }

  const addHolo = (h: Omit<Hologram, 'id'>) => {
    holograms.push({ ...h, id: `holo-${holograms.length}` })
  }
  addHolo({ x: 99, y: 99, z: 338, radius: 26, color: '#22e6ff', accent: '#ff45d4', kind: 'globe', label: 'CIVIC AI' })
  addHolo({ x: 144.5, y: 52.5, z: 280, radius: 18, color: '#76dcff', accent: '#d8f7ff', kind: 'logo', label: 'AUREUS' })
  addHolo({ x: 167.5, y: 99.5, z: 186, radius: 15, color: '#2affc8', accent: '#39d9ff', kind: 'orb', label: 'CORTEX' })
  addHolo({ x: 84.5, y: 28, z: 128, radius: 20, color: '#ff3dd8', accent: '#ffb13d', kind: 'ring', label: 'PULSE' })
  addHolo({ x: 99, y: 171, z: 112, radius: 17, color: '#5fe5ff', accent: '#ffb347', kind: 'crown', label: 'LINE 02' })
  addHolo({ x: 29.5, y: 98.5, z: 78, radius: 13, color: '#ff4fa3', accent: '#ffb347', kind: 'fish', label: 'KURO' })
  addHolo({ x: 28.5, y: 44.5, z: 92, radius: 12, color: '#63ff9b', accent: '#4fffe0', kind: 'orb', label: 'BIO' })
  addHolo({ x: 112, y: 79, z: 132, radius: 10, color: '#22e6ff', accent: '#ff45d4', kind: 'ring', label: 'SKYWAY' })
  for (const b of buildings) {
    if (b.landmark || b.h < 120) continue
    if (rng() < 0.035) {
      addHolo({
        x: b.x + b.w * 0.5,
        y: b.y + b.d * 0.5,
        z: b.h + 24,
        radius: 7 + rng() * 8,
        color: b.neon,
        accent: b.accent,
        kind: rng() < 0.5 ? 'ring' : 'orb',
        label: b.name.split(' ')[0],
      })
    }
  }

  const props: Prop[] = []
  const emitters: Emitter[] = []
  const addProp = (kind: Prop['kind'], x: number, y: number, z: number, color: string, district: DistrictId, s = rng()) => {
    props.push({
      id: `p-${props.length}-${Math.floor(s * 1_000_000)}`,
      kind,
      x,
      y,
      z,
      color,
      seed: Math.floor(s * 1_000_000),
      district,
    })
  }
  const addEmitter = (kind: Emitter['kind'], x: number, y: number, z: number, color: string, district: DistrictId) => {
    emitters.push({ id: `e-${emitters.length}`, x, y, z, kind, color, phase: rng() * TAU, district })
  }

  for (let by = 0; by < BLOCK_COUNT; by++) {
    for (let bx = 0; bx < BLOCK_COUNT; bx++) {
      const ox = bx * BLOCK_SIZE + ROAD_SIZE
      const oy = by * BLOCK_SIZE + ROAD_SIZE
      const district = districtForCell(ox + 4.5, oy + 4.5)
      const d = getDistrict(district)
      if (rng() < 0.75) addProp('streetlight', ox + 0.4, oy + 0.4, 0, d.color, district)
      if (rng() < 0.5) addProp('streetlight', ox + 8.6, oy + 8.6, 0, d.color, district)
      if (rng() < 0.38) addProp('streetlight', ox + 0.4, oy + 8.6, 0, d.color, district)
      if (district === 'market') {
        if (rng() < 0.65) addProp('stall', ox + between(rng, 0.5, 8.5), oy + 0.2, 0, d.accent, district)
        if (rng() < 0.6) addProp('vending', ox + between(rng, 0.4, 8.6), oy + 8.8, 0, d.color, district)
        if (rng() < 0.5) addProp('vent', ox + between(rng, 0.5, 8.5), oy + between(rng, 0.5, 8.5), 8, '#ffcf9a', district)
        if (rng() < 0.32) addProp('foodcart', ox + between(rng, 0.5, 8.5), oy + 0.6, 0, d.accent, district)
        if (rng() < 0.24) addProp('bench', ox + between(rng, 1, 8), oy + 8.4, 0, d.color, district)
      }
      if (district === 'industrial') {
        if (rng() < 0.48) addProp('vent', ox + between(rng, 0.5, 8.5), oy + between(rng, 0.5, 8.5), 22, '#ffb45c', district)
        if (rng() < 0.35) addProp('pipe', ox + between(rng, 0.5, 8.5), oy + 8.7, 4, '#ff8a2a', district)
        if (rng() < 0.18) addProp('crane', ox + between(rng, 1, 8), oy + between(rng, 1, 8), 0, '#ffb347', district)
      }
      if (district === 'residential' || district === 'bio') {
        if (rng() < 0.45) addProp('tree', ox + between(rng, 0.3, 8.7), oy + between(rng, 0.3, 8.7), 0, d.color, district)
        if (rng() < 0.18) addProp('planter', ox + between(rng, 0.4, 8.6), oy + 8.5, 0, '#63ff9b', district)
      }
      if (district === 'residential' || district === 'central') {
        if (rng() < 0.16) addProp('bench', ox + between(rng, 0.8, 8.2), oy + 8.4, 0, d.color, district)
      }
      if (district === 'central' || district === 'corporate') {
        if (rng() < 0.24) addProp('camera', ox + between(rng, 0.5, 8.5), oy + 0.2, 7, d.color, district)
        if (rng() < 0.2) addProp('terminal', ox + between(rng, 0.5, 8.5), oy + 8.8, 0, d.color, district)
      }
      if (district === 'tech' && rng() < 0.16) addProp('camera', ox + 8.8, oy + between(rng, 0.5, 8.5), 9, d.color, district)
      if (rng() < 0.1) addEmitter('steam', ox + between(rng, 0.5, 8.5), oy + between(rng, 0.5, 8.5), 6, d.color, district)
    }
  }

  for (const park of parks) {
    if (park.kind === 'plaza') {
      addProp('fountain', park.x + park.w / 2, park.y + park.d / 2, 0, '#22e6ff', park.district)
      addEmitter('water', park.x + park.w / 2, park.y + park.d / 2, 10, '#22e6ff', park.district)
      for (let i = 0; i < 14; i++) {
        addProp('tree', park.x + between(rng, 1, park.w - 1), park.y + between(rng, 1, park.d - 1), 0, '#63ff9b', park.district)
      }
      for (let i = 0; i < 8; i++) {
        addProp(i % 2 ? 'bench' : 'planter', park.x + between(rng, 1, park.w - 1), park.y + between(rng, 1, park.d - 1), 0, '#22e6ff', park.district)
      }
    } else if (park.kind === 'lake') {
      addEmitter('water', park.x + park.w / 2, park.y + park.d / 2, 3, '#4fffe0', park.district)
      for (let i = 0; i < 18; i++) {
        addProp('tree', park.x + between(rng, 0, park.w), park.y + between(rng, 0, park.d), 0, '#63ff9b', park.district)
      }
    } else if (park.kind === 'park') {
      for (let i = 0; i < 20; i++) {
        addProp('tree', park.x + between(rng, 0, park.w), park.y + between(rng, 0, park.d), 0, '#63ff9b', park.district)
      }
      if (rng() < 0.5) {
        addProp('fountain', park.x + park.w / 2, park.y + park.d / 2, 0, '#4fffe0', park.district)
        addEmitter('water', park.x + park.w / 2, park.y + park.d / 2, 8, '#4fffe0', park.district)
      }
    } else if (park.kind === 'farm') {
      for (let i = 0; i < 12; i++) {
        addProp('tree', park.x + between(rng, 0, park.w), park.y + between(rng, 0, park.d), 0, '#aaff85', park.district)
      }
      addEmitter('firefly', park.x + park.w / 2, park.y + park.d / 2, 14, '#aaff85', park.district)
    } else if (park.kind === 'yard') {
      for (let i = 0; i < 5; i++) {
        addProp('crane', park.x + between(rng, 1, park.w - 1), park.y + between(rng, 1, park.d - 1), 0, '#ffb347', park.district)
      }
    }
  }

  for (const b of landmarks) {
    if (b.style === 'industrial') {
      addEmitter('smoke', b.x + b.w * 0.2, b.y + b.d * 0.2, b.h + 6, '#ffb45c', b.district)
      addEmitter('smoke', b.x + b.w * 0.75, b.y + b.d * 0.7, b.h + 3, '#ffcf9a', b.district)
      addEmitter('spark', b.x + b.w * 0.5, b.y + b.d * 0.5, b.h * 0.3, '#ffd45c', b.district)
    }
    if (b.style === 'dome') {
      addEmitter('water', b.x + b.w * 0.82, b.y + b.d * 0.45, 8, '#4fffe0', b.district)
      addEmitter('firefly', b.x + b.w * 0.5, b.y + b.d * 0.5, 20, '#aaff85', b.district)
    }
    if (b.style === 'station') {
      addEmitter('spark', b.x + b.w * 0.3, b.y + b.d * 0.4, 12, '#5fe5ff', b.district)
    }
  }

  const rails: RailLine[] = [
    { id: 'maglev-cyan', name: 'MAGLEV / CYAN LINE', axis: 'x', coord: 42, z: 92, from: 8, to: 190, color: '#22e6ff', kind: 'maglev' },
    { id: 'maglev-magenta', name: 'MAGLEV / MAGENTA LINE', axis: 'y', coord: 154, z: 74, from: 14, to: 184, color: '#ff4fa3', kind: 'maglev' },
    { id: 'metro-amber', name: 'METRO / AMBER LOOP', axis: 'x', coord: 148, z: 56, from: 10, to: 188, color: '#ffb347', kind: 'metro' },
    { id: 'skyway', name: 'ELEVATED SKYWAY', axis: 'y', coord: 84, z: 38, from: 8, to: 190, color: '#8ff8ff', kind: 'highway' },
    { id: 'highway-2', name: 'OUTER RING HIGHWAY', axis: 'x', coord: 112, z: 32, from: 4, to: 194, color: '#ff6fb7', kind: 'highway' },
  ]

  const trains: Train[] = []
  for (const line of rails) {
    for (let i = 0; i < 2; i++) {
      trains.push({
        id: `train-${line.id}-${i}`,
        lineId: line.id,
        pos: line.from + ((i + 0.3) / 2) * (line.to - line.from),
        speed: line.kind === 'highway' ? 9 + rng() * 4 : 8 + rng() * 6,
        dir: i % 2 === 0 ? 1 : -1,
        cars: line.kind === 'highway' ? 3 : 4,
        color: line.color,
        phase: rng() * TAU,
      })
    }
  }

  const vehicles: Vehicle[] = []
  const carColors = ['#22e6ff', '#ff4fa3', '#ffd68a', '#f4f7ff', '#ff8a2a', '#63ff9b', '#b98cff']
  const vehicleTypes: VehicleType[] = ['car', 'car', 'car', 'taxi', 'car', 'van', 'bus', 'truck', 'bike']
  for (let i = 0; i < 520; i++) {
    const axis = rng() < 0.5 ? 'x' : 'y'
    const road = Math.floor(rng() * BLOCK_COUNT)
    const laneOffset = rng() < 0.5 ? 0.62 : 1.4
    const lane = road * BLOCK_SIZE + laneOffset
    const type = pick(rng, vehicleTypes)
    vehicles.push({
      id: `v-${i}`,
      axis,
      lane,
      pos: rng() * WORLD_SIZE,
      dir: rng() < 0.5 ? 1 : -1,
      speed: type === 'bike' ? 10 + rng() * 7 : type === 'bus' ? 3 + rng() * 2.5 : 5 + rng() * 6,
      type,
      color: type === 'bus' ? '#ffb347' : type === 'taxi' ? '#ffd84d' : type === 'truck' ? '#63ff9b' : pick(rng, carColors),
      phase: rng() * TAU,
    })
  }

  const aircraft: Aircraft[] = []
  const airTypes: Aircraft['type'][] = ['flyer', 'flyer', 'drone', 'cargo', 'police']
  for (let i = 0; i < 110; i++) {
    const type = pick(rng, airTypes)
    const angle = rng() * TAU
    const speed = type === 'cargo' ? 2.5 + rng() * 2 : 5 + rng() * 6
    aircraft.push({
      id: `a-${i}`,
      x: rng() * WORLD_SIZE,
      y: rng() * WORLD_SIZE,
      z: type === 'cargo' ? 100 + rng() * 100 : 55 + rng() * 180,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vz: (rng() - 0.5) * 1.5,
      type,
      color: type === 'police' ? '#ff4f6d' : type === 'cargo' ? '#ffb347' : pick(rng, carColors),
      phase: rng() * TAU,
    })
  }

  const drones: Drone[] = []
  for (let i = 0; i < 170; i++) {
    const district = pick(rng, DISTRICTS).id
    const center = getDistrict(district).center
    drones.push({
      id: `d-${i}`,
      x: center.x + (rng() - 0.5) * 38,
      y: center.y + (rng() - 0.5) * 38,
      z: 18 + rng() * 130,
      phase: rng() * TAU,
      radius: 1 + rng() * 4,
      speed: 0.4 + rng() * 1.4,
      color: rng() < 0.5 ? '#22e6ff' : '#ff4fa3',
    })
  }

  const pedestrians: Pedestrian[] = []
  const jacketColors = ['#ff4fa3', '#22e6ff', '#ffd68a', '#63ff9b', '#ff8a2a', '#b98cff', '#f4f7ff', '#ff6fb7']
  for (let i = 0; i < 7200; i++) {
    const axis = rng() < 0.5 ? 'x' : 'y'
    const blockX = Math.floor(rng() * BLOCK_COUNT)
    const blockY = Math.floor(rng() * BLOCK_COUNT)
    const ox = blockX * BLOCK_SIZE
    const oy = blockY * BLOCK_SIZE
    let x: number
    let y: number
    if (axis === 'x') {
      x = ox + rng() * BLOCK_SIZE
      y = oy + (rng() < 0.5 ? 1.8 : 9.9)
    } else {
      x = ox + (rng() < 0.5 ? 1.8 : 9.9)
      y = oy + rng() * BLOCK_SIZE
    }
    pedestrians.push({
      id: `npc-${i}`,
      x,
      y,
      axis,
      dir: rng() < 0.5 ? 1 : -1,
      speed: 0.35 + rng() * 0.85,
      color: pick(rng, jacketColors),
      phase: rng() * TAU,
      district: districtForCell(x, y),
    })
  }

  const outerBlocks: OuterBlock[] = []
  for (let i = 0; i < 260; i++) {
    const x = between(rng, -38, WORLD_SIZE + 38)
    const y = between(rng, -38, WORLD_SIZE + 38)
    if (x > -6 && x < WORLD_SIZE + 6 && y > -6 && y < WORLD_SIZE + 6) continue
    outerBlocks.push({
      x,
      y,
      w: 2 + rng() * 5,
      d: 2 + rng() * 5,
      h: 8 + rng() * 90,
      seed: Math.floor(rng() * 1_000_000),
      color: pick(rng, ['#141327', '#1a1530', '#101525', '#20162c']),
    })
  }

  return {
    size: WORLD_SIZE,
    blocks: BLOCK_COUNT,
    blockSize: BLOCK_SIZE,
    roadSize: ROAD_SIZE,
    districts: DISTRICTS,
    buildings,
    parks,
    props,
    billboards,
    holograms,
    vehicles,
    aircraft,
    pedestrians,
    drones,
    rails,
    trains,
    emitters,
    outerBlocks,
    landmarks,
  }
}
