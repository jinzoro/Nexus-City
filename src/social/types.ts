/** Social layer domain types (Supabase-backed). */

export interface SocialProfile {
  id: string
  handle: string
  /** Body suit colour (neon hex). */
  body: string
  /** Visor colour (neon hex). */
  visor: string
  /** Avatar silhouette variant 0–2. */
  built: 0 | 1 | 2
}

/** One live operator tracked on the city presence channel. */
export interface PresenceEntry {
  key: string
  userId: string
  handle: string
  body: string
  visor: string
  built: 0 | 1 | 2
  /** Building the operator currently has open in facility view. */
  buildingId: string | null
  buildingName: string | null
  /** Cameras district code, for flavour. */
  district: string | null
}

export interface BuildingChannelMessage {
  userId: string
  handle: string
  body: string
  visor: string
  content: string
  at: number
}

export interface DirectThreadMessage {
  userId: string
  handle: string
  body: string
  content: string
  at: number
}
