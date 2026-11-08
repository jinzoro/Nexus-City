export type DistrictId =
  | 'central'
  | 'market'
  | 'corporate'
  | 'industrial'
  | 'residential'
  | 'tech'
  | 'entertainment'
  | 'bio'
  | 'transit'

export type BuildingStyle =
  | 'tower'
  | 'block'
  | 'twin'
  | 'pyramid'
  | 'industrial'
  | 'dome'
  | 'greenhouse'
  | 'arena'
  | 'station'
  | 'market'
  | 'data'
  | 'spire'
  | 'construction'

export type FacadePattern =
  | 'plain'
  | 'ribbon'
  | 'glass'
  | 'balcony'
  | 'louver'
  | 'fins'
  | 'checker'
  | 'diagrid'
  | 'capsule'
  | 'mosaic'

export type CrownKind =
  | 'none'
  | 'antenna'
  | 'dishes'
  | 'tank'
  | 'garden'
  | 'sign'
  | 'vents'
  | 'helipad'
  | 'solar'
  | 'beacon'

export type StorefrontKind =
  | 'none'
  | 'shop'
  | 'cafe'
  | 'garage'
  | 'lobby'
  | 'dock'
  | 'arcade'
  | 'alley'

export type OverlayMode = 'none' | 'transit' | 'power' | 'network' | 'atmosphere'

export type EntityKind = 'pedestrian' | 'vehicle' | 'train'

export interface SelectedEntity {
  kind: EntityKind
  id: string
  label: string
  district: DistrictId
  color: string
  detail: string
}

export type QualityLevel = 'auto' | 'high' | 'balanced' | 'performance'

export type FactionId = 'civic' | 'kuro' | 'aureus' | 'guild' | 'cortex' | 'verdant'

export interface Faction {
  id: FactionId
  name: string
  code: string
  description: string
  color: string
  accent: string
}

export interface Bookmark {
  id: string
  name: string
  x: number
  y: number
  zoom: number
  district: DistrictId
}

export interface NewsItem {
  id: string
  headline: string
  body: string
  district?: DistrictId
  time: string
  tone: 'calm' | 'alarm' | 'trade' | 'culture'
}

export interface CodexEntry {
  id: string
  title: string
  category: 'LANDMARK' | 'DISTRICT' | 'SYSTEM' | 'FACTION'
  body: string
  color: string
  district?: DistrictId
}

export interface Vec2 {
  x: number
  y: number
}

export interface District {
  id: DistrictId
  name: string
  code: string
  tagline: string
  description: string
  center: Vec2
  radius: number
  color: string
  accent: string
  glow: string
  population: number
  power: number
  network: number
  stability: number
  atmosphere: string
  sound: string
}

export interface Building {
  id: string
  name: string
  type: string
  district: DistrictId
  x: number
  y: number
  w: number
  d: number
  h: number
  style: BuildingStyle
  seed: number
  floors: number
  status: 'ONLINE' | 'STABLE' | 'MAINTENANCE' | 'RESTRICTED' | 'OFFLINE'
  load: number
  systems: number
  owner: string
  occupants: number
  description: string
  landmark?: boolean
  billboard?: boolean
  sign?: { text: string; vertical: boolean }
  body: [string, string, string]
  roof: string
  window: string
  neon: string
  accent: string
  construction?: boolean
  hasGarden?: boolean
  facade: FacadePattern
  crown: CrownKind
  street: StorefrontKind
  age: number
  quirk: string
}

export interface Park {
  id: string
  kind: 'park' | 'plaza' | 'lake' | 'yard' | 'farm'
  x: number
  y: number
  w: number
  d: number
  district: DistrictId
  seed: number
}

export type PropKind =
  | 'streetlight'
  | 'vending'
  | 'tree'
  | 'vent'
  | 'crane'
  | 'stall'
  | 'fountain'
  | 'camera'
  | 'terminal'
  | 'pipe'
  | 'bench'
  | 'planter'
  | 'foodcart'

export interface Prop {
  id: string
  kind: PropKind
  x: number
  y: number
  z: number
  color: string
  seed: number
  district: DistrictId
}

export interface Billboard {
  id: string
  buildingId: string
  x: number
  y: number
  z: number
  width: number
  height: number
  text: string
  colorA: string
  colorB: string
  kind: 'billboard' | 'holo' | 'vertical'
}

export interface Hologram {
  id: string
  x: number
  y: number
  z: number
  radius: number
  color: string
  accent: string
  kind: 'globe' | 'ring' | 'orb' | 'crown' | 'fish' | 'logo'
  label: string
}

export type VehicleType = 'car' | 'taxi' | 'bus' | 'truck' | 'bike' | 'van'

export interface Vehicle {
  id: string
  axis: 'x' | 'y'
  lane: number
  pos: number
  dir: 1 | -1
  speed: number
  type: VehicleType
  color: string
  phase: number
}

export type AircraftType = 'flyer' | 'drone' | 'cargo' | 'police'

export interface Aircraft {
  id: string
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  type: AircraftType
  color: string
  phase: number
}

export interface Pedestrian {
  id: string
  x: number
  y: number
  axis: 'x' | 'y'
  dir: 1 | -1
  speed: number
  color: string
  phase: number
  district: DistrictId
}

export interface Drone {
  id: string
  x: number
  y: number
  z: number
  phase: number
  radius: number
  speed: number
  color: string
}

export interface RailLine {
  id: string
  name: string
  axis: 'x' | 'y'
  coord: number
  z: number
  from: number
  to: number
  color: string
  kind: 'maglev' | 'metro' | 'highway'
}

export interface Train {
  id: string
  lineId: string
  pos: number
  speed: number
  dir: 1 | -1
  cars: number
  color: string
  phase: number
  stopped?: boolean
}

export interface TrainStation {
  id: string
  name: string
  lineId: string
  axis: 'x' | 'y'
  /** Track coordinate (the fixed axis of the rail line). */
  coord: number
  /** Track z (deck height). */
  z: number
  /** Position along the track axis. */
  pos: number
  district: DistrictId
  color: string
}

/** Weather presentation state handed to the renderer each frame. */
export type ViewWeather = 'clear' | 'rain' | 'haze' | 'festival'

export interface Emitter {
  id: string
  x: number
  y: number
  z: number
  kind: 'steam' | 'water' | 'spark' | 'smoke' | 'firefly'
  color: string
  phase: number
  district: DistrictId
}

export interface OuterBlock {
  x: number
  y: number
  w: number
  d: number
  h: number
  seed: number
  color: string
}

export interface CityEvent {
  id: string
  type: 'power' | 'festival' | 'rain' | 'transit' | 'network' | 'construction' | 'market' | 'weather'
  title: string
  message: string
  district?: DistrictId
  startedAt: number
  duration: number
  severity: 'info' | 'warning' | 'critical'
}

export interface CityData {
  size: number
  blocks: number
  blockSize: number
  roadSize: number
  districts: District[]
  buildings: Building[]
  parks: Park[]
  props: Prop[]
  billboards: Billboard[]
  holograms: Hologram[]
  vehicles: Vehicle[]
  aircraft: Aircraft[]
  pedestrians: Pedestrian[]
  drones: Drone[]
  rails: RailLine[]
  trains: Train[]
  stations: TrainStation[]
  emitters: Emitter[]
  outerBlocks: OuterBlock[]
  landmarks: Building[]
  seed: number
}

/** A persistent player goal tracked across the run. */
export interface Goal {
  id: string
  title: string
  detail: string
  /** Progress numerator computed by the store. */
  progress: (state: GoalContext) => number
  target: number
}

export interface GoalContext {
  visitedDistricts: DistrictId[]
  tracked: string[]
  discovered: string[]
  codexFound: string[]
  bookmarks: Bookmark[]
  festivalsThrown: number
}

export interface CameraInfo {
  x: number
  y: number
  zoom: number
  cellX: number
  cellY: number
  district: DistrictId
  level: 'OVERVIEW' | 'DISTRICT' | 'STREET' | 'INTERIOR'
}
