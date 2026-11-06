import type { BuildingStyle, CrownKind, DistrictId, FacadePattern, StorefrontKind } from '../types'

/**
 * Personality tables for the procedural city.
 *
 * Each building gets three independent traits — how its skin is patterned
 * (facade), what sits on its roof (crown) and what opens onto the street
 * (storefront) — plus an age and a one-line human detail. All of it is
 * derived from the seeded RNG in `city.ts`, so a given seed always produces
 * the same city.
 */

export const FACADE_LABELS: Record<FacadePattern, string> = {
  plain: 'PLAIN PANEL',
  ribbon: 'RIBBON GLASS',
  glass: 'CURTAIN GLASS',
  balcony: 'BALCONY STACK',
  louver: 'LOUVER SLITS',
  fins: 'VERTICAL FINS',
  checker: 'CHECKER GRID',
  diagrid: 'DIAGRID BRACE',
  capsule: 'CAPSULE PODS',
  mosaic: 'PATCHWORK',
}

export const CROWN_LABELS: Record<CrownKind, string> = {
  none: 'BARE ROOF',
  antenna: 'ANTENNA MAST',
  dishes: 'DISH ARRAY',
  tank: 'ROOF TANK',
  garden: 'ROOF GARDEN',
  sign: 'ROOF SIGN',
  vents: 'VENT CLUSTER',
  helipad: 'HELIPAD',
  solar: 'SOLAR ARRAY',
  beacon: 'BEACON RING',
}

export const STREET_LABELS: Record<StorefrontKind, string> = {
  none: 'NO FRONTAGE',
  shop: 'LATE SHOP',
  cafe: 'NOODLE BAR',
  garage: 'SERVICE GARAGE',
  lobby: 'PUBLIC LOBBY',
  dock: 'LOADING BAY',
  arcade: 'ARCADE',
  alley: 'SERVICE ALLEY',
}

const FACADES: Record<DistrictId, FacadePattern[]> = {
  central: ['ribbon', 'fins', 'glass', 'ribbon', 'checker', 'diagrid', 'fins', 'mosaic'],
  corporate: ['glass', 'ribbon', 'fins', 'checker', 'plain', 'glass', 'diagrid'],
  market: ['mosaic', 'capsule', 'louver', 'plain', 'balcony', 'checker', 'mosaic'],
  industrial: ['louver', 'plain', 'diagrid', 'louver', 'fins', 'checker'],
  residential: ['balcony', 'capsule', 'mosaic', 'plain', 'balcony', 'louver', 'checker'],
  tech: ['diagrid', 'fins', 'glass', 'checker', 'louver', 'plain', 'ribbon'],
  entertainment: ['mosaic', 'diagrid', 'fins', 'ribbon', 'checker', 'glass'],
  bio: ['capsule', 'balcony', 'plain', 'louver', 'ribbon'],
  transit: ['louver', 'ribbon', 'plain', 'fins', 'checker', 'diagrid'],
}

const CROWNS: Record<DistrictId, CrownKind[]> = {
  central: ['beacon', 'antenna', 'vents', 'sign', 'helipad', 'beacon', 'solar'],
  corporate: ['antenna', 'dishes', 'solar', 'sign', 'vents', 'antenna'],
  market: ['sign', 'vents', 'tank', 'antenna', 'garden', 'sign'],
  industrial: ['vents', 'tank', 'antenna', 'solar', 'none', 'vents'],
  residential: ['tank', 'garden', 'dishes', 'solar', 'vents', 'antenna', 'garden'],
  tech: ['solar', 'dishes', 'antenna', 'vents', 'beacon', 'helipad'],
  entertainment: ['sign', 'beacon', 'vents', 'antenna', 'helipad', 'sign'],
  bio: ['garden', 'solar', 'tank', 'vents', 'beacon', 'garden'],
  transit: ['vents', 'antenna', 'sign', 'solar', 'dishes', 'helipad'],
}

const STREETS: Record<DistrictId, StorefrontKind[]> = {
  central: ['lobby', 'shop', 'cafe', 'arcade', 'lobby', 'shop'],
  market: ['shop', 'cafe', 'arcade', 'shop', 'alley', 'cafe'],
  corporate: ['lobby', 'cafe', 'garage', 'lobby', 'shop', 'alley'],
  industrial: ['dock', 'garage', 'dock', 'alley', 'shop', 'garage'],
  residential: ['shop', 'cafe', 'lobby', 'alley', 'garage', 'shop', 'cafe'],
  tech: ['lobby', 'arcade', 'shop', 'cafe', 'lobby', 'alley'],
  entertainment: ['arcade', 'cafe', 'shop', 'lobby', 'alley', 'arcade'],
  bio: ['cafe', 'shop', 'lobby', 'alley', 'cafe', 'lobby'],
  transit: ['shop', 'cafe', 'lobby', 'dock', 'arcade', 'garage'],
}

const QUIRKS: Record<DistrictId, string[]> = {
  central: [
    'The lobby clock runs four minutes fast. Nobody will say why.',
    'A maintenance drone has been circling the atrium since the last census.',
    'The building AI answers questions with questions, politely.',
    'Its public elevator plays a different station on every floor.',
    'The roof beacon blinks the district code in an obsolete cipher.',
    'Two floors are listed as storage. They have their own weather.',
  ],
  market: [
    'The noodle counter on floor two has a permanent queue and no sign.',
    'Someone sells repaired umbrellas out of the stairwell every night.',
    'The third-floor arcade still accepts physical coins.',
    'A cat has been living in the sign housing for eleven years.',
    'The back wall opens into a different alley after midnight.',
    'Every shopkeeper claims to be the original tenant.',
  ],
  corporate: [
    'The lobby is legally a separate jurisdiction with its own air.',
    'A private weather system keeps the executive floor at 19 degrees.',
    'The security desk logs visitors who never arrived.',
    'Its glass is cleaned by a crew that has never been photographed.',
    'The boardroom table is older than the tower beneath it.',
    'A single window on floor forty is always dark. It is always booked.',
  ],
  industrial: [
    'Warm pipes run through every room. The floor hums in B-flat.',
    'The night shift has not been officially ended in nine years.',
    'A cargo elevator goes down one level further than the plans allow.',
    'The ventilation stacks exhale municipal weather at 04:00.',
    'The tool crib is guarded by a vending machine with opinions.',
    'Sparks from the rail bay are collected and sold as charms.',
  ],
  residential: [
    'Someone on the ninth floor grows tomatoes under a stolen sunlamp.',
    'The communal kitchen never quite closes.',
    'The building committee meets on the roof; nobody brings chairs.',
    'A corridor light has been flickering in a pattern since the blackout.',
    'The laundry line crosses three floors and two feuds.',
    'Kids race the freight elevator and usually win.',
  ],
  tech: [
    'The lights in the upper labs follow a schedule nobody can access.',
    'A clean room is wrapped around a machine that is learning to be a building.',
    'The cooling pipes glow faint blue through the floor plates.',
    'Prototype hardware fills the walls. Some of it is older than the district.',
    'The rooftop array powers exactly one floor, chosen at random each day.',
    'A lab door opens onto the same corridor from three directions.',
  ],
  entertainment: [
    'The bass travels through the support columns into the hab-stacks.',
    'Every screen shows something different. All of them are looking at you.',
    'The old arcade is still inside the new arcade.',
    'A queue forms at 23:00 for a door that only opens on Tuesdays.',
    'The roof sign has been repaired forty-one times and never repainted.',
    'The DJ booth is a converted transit booth with a better view.',
  ],
  bio: [
    'Condensation beads on the inside of the glass. The air is thick enough to drink.',
    'The irrigation system predates the city and still speaks its first language.',
    'A vine has learned to operate the door sensor.',
    'The roof garden is technically a protected wetland now.',
    'Bees from the atrium pollinate three neighboring districts.',
    'The greenhouse lights dim on a twenty-six hour cycle.',
  ],
  transit: [
    'Trains pass through the lower levels every ninety seconds. The floor moves with them.',
    'The departure board has been counting upward since before the calendar.',
    'The announcement system has been sampled by every musician in the city.',
    'A platform vending machine sells tickets for lines that were cancelled.',
    'The lost and found contains one bicycle and a great many gloves.',
    'The station clock and the district clock disagree by design.',
  ],
}

function pick<T>(rng: () => number, list: T[]): T {
  return list[Math.floor(rng() * list.length) % list.length]
}

export function pickFacade(rng: () => number, district: DistrictId): FacadePattern {
  return pick(rng, FACADES[district])
}

export function pickCrown(rng: () => number, district: DistrictId): CrownKind {
  return pick(rng, CROWNS[district])
}

export function pickStreet(rng: () => number, district: DistrictId): StorefrontKind {
  return pick(rng, STREETS[district])
}

export function pickQuirk(rng: () => number, district: DistrictId): string {
  return pick(rng, QUIRKS[district])
}

/** Hand-authored personality for the named landmarks, keyed by massing style. */
export function landmarkPersonality(style: BuildingStyle): {
  facade: FacadePattern
  crown: CrownKind
  street: StorefrontKind
  quirk: string
} {
  switch (style) {
    case 'spire':
      return {
        facade: 'fins',
        crown: 'beacon',
        street: 'lobby',
        quirk: 'The crown beacon has never once gone dark. The maintenance log agrees.',
      }
    case 'twin':
      return {
        facade: 'glass',
        crown: 'antenna',
        street: 'lobby',
        quirk: 'The skybridges are numbered out of order to discourage visitors.',
      }
    case 'station':
      return {
        facade: 'ribbon',
        crown: 'vents',
        street: 'cafe',
        quirk: 'The left-hand departure board is a painting. The right one is real.',
      }
    case 'market':
      return {
        facade: 'mosaic',
        crown: 'sign',
        street: 'shop',
        quirk: 'The gate sign is brighter than the sunlamps and older than the district.',
      }
    case 'industrial':
      return {
        facade: 'louver',
        crown: 'vents',
        street: 'dock',
        quirk: 'The night shift runs the foundry and, unofficially, the weather.',
      }
    case 'dome':
      return {
        facade: 'capsule',
        crown: 'garden',
        street: 'lobby',
        quirk: 'The lake has a tide because the dome breathes.',
      }
    case 'arena':
      return {
        facade: 'diagrid',
        crown: 'sign',
        street: 'arcade',
        quirk: 'The holo-core is visible from four districts and audible from six.',
      }
    case 'data':
      return {
        facade: 'diagrid',
        crown: 'solar',
        street: 'lobby',
        quirk: 'The upper floors are listed as unbuilt. Their lights are on.',
      }
    case 'greenhouse':
      return {
        facade: 'capsule',
        crown: 'garden',
        street: 'cafe',
        quirk: 'The gardeners insist there is no difference between real and projected species.',
      }
    case 'block':
      return {
        facade: 'balcony',
        crown: 'tank',
        street: 'shop',
        quirk: 'Four thousand homes, one communal laundry, zero vacancies.',
      }
    default:
      return {
        facade: 'ribbon',
        crown: 'antenna',
        street: 'lobby',
        quirk: 'A quiet machine for converting attention into ownership.',
      }
  }
}
