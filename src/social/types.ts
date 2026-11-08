/** Social layer domain types (Supabase-backed). */

export type Visibility = 'online' | 'ghost'
export type DmPolicy = 'all' | 'floor' | 'none'

export interface SocialProfile {
  id: string
  handle: string
  /** Body suit colour (neon hex). */
  body: string
  /** Visor colour (neon hex). */
  visor: string
  /** Avatar silhouette variant 0–2. */
  built: 0 | 1 | 2
  /** Short public biography (max 160). */
  bio: string
  /** Short public status line (max 40). */
  statusText: string
  /** `ghost` hides the citizen from presence/roster. */
  visibility: Visibility
  /** Soft policy: who may open a direct thread with this citizen. */
  dmPolicy: DmPolicy
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
  /** Public bio, mirrored from the profile row. */
  bio?: string
  /** Public status line, mirrored from the profile row. */
  statusText?: string
  /** Soft DM policy mirrored so peers can respect it. */
  dmPolicy?: DmPolicy
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
