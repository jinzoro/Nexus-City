/**
 * Social layer store: Supabase accounts, city presence, per-building living
 * channels and operator-to-operator direct threads. Everything no-ops when
 * `socialEnabled` is false (missing env keys) so the city stays playable.
 */
import { create } from 'zustand'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { socialEnabled, supabase } from './client'
import type {
  BuildingChannelMessage,
  DirectThreadMessage,
  PresenceEntry,
  SocialProfile,
} from './types'

const PENDING_HANDLE_KEY = 'nexus.pendingHandle'

export const BODY_SWATCHES = [
  '#22e6ff',
  '#ff4fa3',
  '#ffb347',
  '#63ff9b',
  '#8ff8ff',
  '#76dcff',
  '#ff3dd8',
  '#aaff85',
] as const

export const VISOR_SWATCHES = [
  '#ff3dd8',
  '#22e6ff',
  '#ffd45c',
  '#63ff9b',
  '#ffffff',
] as const

type SocialStatus = 'offline' | 'anonymous' | 'linking' | 'online'

interface SocialState {
  enabled: boolean
  status: SocialStatus
  authError: string | null
  profile: SocialProfile | null
  presence: PresenceEntry[]

  channelBuildingId: string | null
  channelBuildingName: string | null
  channelMessages: BuildingChannelMessage[]

  dmWith: { userId: string; handle: string } | null
  dmThread: DirectThreadMessage[]

  init: () => Promise<void>
  clearAuthError: () => void
  signUp: (email: string, password: string, handle: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  saveIdentity: (patch: Partial<Pick<SocialProfile, 'handle' | 'body' | 'visor' | 'built'>>) => Promise<void>

  enterBuilding: (buildingId: string, buildingName: string) => Promise<void>
  leaveBuilding: () => Promise<void>
  sendToChannel: (content: string) => Promise<void>

  openDirect: (userId: string, handle: string) => Promise<void>
  closeDirect: () => void
  sendDirect: (content: string) => Promise<void>
}

/* ------------------------------------------------------------------ */
/* module-scoped realtime plumbing                                     */
/* ------------------------------------------------------------------ */

let booted = false
let authListenerBound = false
let presenceCh: RealtimeChannel | null = null
let buildingCh: RealtimeChannel | null = null
let dmCh: RealtimeChannel | null = null
let presenceKey = `nx-${Math.random().toString(36).slice(2, 10)}`
let cachedSessionUserId: string | null = null

function mePresenceMeta(get: () => SocialState) {
  const p = get().profile
  if (!p) return null
  return {
    userId: p.id,
    handle: p.handle,
    body: p.body,
    visor: p.visor,
    built: p.built,
    buildingId: get().channelBuildingId,
    buildingName: get().channelBuildingName,
    district: null as string | null,
  }
}

function pushPresence(get: () => SocialState, set: (patch: Partial<SocialState>) => void) {
  if (!presenceCh) return
  const meta = mePresenceMeta(get)
  if (meta) presenceCh.track(meta)
}

function pullPresence(set: (patch: Partial<SocialState>) => void) {
  if (!presenceCh) return
  const raw = presenceCh.presenceState<Record<string, unknown>>()
  // presenceState() is keyed by presence key; carry that key into each entry
  // so React lists get stable unique keys.
  const rows: PresenceEntry[] = []
  for (const [key, metas] of Object.entries(raw)) {
    for (const meta of metas) {
      const entry = { ...(meta as unknown as PresenceEntry), key }
      if (entry && typeof entry.userId === 'string' && entry.handle) rows.push(entry)
    }
  }
  // one row per userId: track key per tab, but pick the row seen first
  const seen = new Set<string>()
  const list = rows.filter((m) => (seen.has(m.userId) ? false : (seen.add(m.userId), true)))
  set({ presence: list })
}

function closeBuildingChannel() {
  if (buildingCh) {
    void buildingCh.unsubscribe()
    buildingCh = null
  }
}

function closeDirectChannel() {
  if (dmCh) {
    void dmCh.unsubscribe()
    dmCh = null
  }
}

export const useSocialStore = create<SocialState>()((set, get) => ({
  enabled: socialEnabled,
  status: socialEnabled ? 'anonymous' : 'offline',
  authError: null,
  profile: null,
  presence: [],

  channelBuildingId: null,
  channelBuildingName: null,
  channelMessages: [],

  dmWith: null,
  dmThread: [],

  /* ---------------------------------------------------------------- */

  init: async () => {
    if (!socialEnabled || booted) return
    booted = true

    // Expired / invalid email-confirmation links land back here with the error
    // in the URL hash. Read it before supabase-js consumes the hash.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const hashError = hash.get('error_description') ?? hash.get('error')
    if (hashError) {
      const code = hash.get('error_code') ?? ''
      const expired = code === 'otp_expired' || /expired|invalid/i.test(hashError)
      set({
        authError: expired
          ? 'CONFIRMATION LINK EXPIRED // SIGN IN OR CREATE A NEW ACCOUNT'
          : decodeURIComponent(hashError).replace(/\+/g, ' ').toUpperCase(),
      })
      try {
        history.replaceState(null, '', window.location.pathname + window.location.search)
      } catch {
        /* history unavailable */
      }
    }

    const client = await supabase()
    if (!authListenerBound) {
      authListenerBound = true
      client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          closeBuildingChannel()
          closeDirectChannel()
          if (presenceCh) {
            void presenceCh.unsubscribe()
            presenceCh = null
          }
          cachedSessionUserId = null
          set({
            profile: null,
            presence: [],
            channelMessages: [],
            channelBuildingId: null,
            channelBuildingName: null,
            dmWith: null,
            dmThread: [],
            status: 'anonymous',
          })
        }
        if (event === 'SIGNED_IN' && session?.user) {
          cachedSessionUserId = session.user.id
          void get().init()
        }
      })
    }

    const { data } = await client.auth.getSession()
    const user = data.session?.user
    if (!user) return

    // load or provision the profile row
    let profile: SocialProfile | null = null
    const { data: row } = await client
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (row) {
      profile = {
        id: row.id,
        handle: row.handle as string,
        body: row.body as string,
        visor: row.visor as string,
        built: Math.min(2, Math.max(0, Number(row.built))) as 0 | 1 | 2,
      }
    } else {
      // Confirmation-required signups have no session yet, so the chosen
      // handle is stashed locally and claimed on the first authenticated boot.
      const pending = (() => {
        try {
          return (localStorage.getItem(PENDING_HANDLE_KEY) ?? '')
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, '')
        } catch {
          return ''
        }
      })()
      const fallback = (user.email?.split('@')[0] ?? 'operator').replace(/[^a-z0-9_-]/gi, '').slice(0, 10)
        || `op-${user.id.slice(0, 4)}`
      const candidates: string[] = []
      if (pending.length >= 3 && pending.length <= 16) candidates.push(pending)
      candidates.push(fallback.length >= 3 ? fallback : `op-${user.id.slice(0, 6)}`)

      for (const handle of candidates) {
        const { data: created, error: ierr } = await client
          .from('profiles')
          .insert({ id: user.id, handle })
          .select()
          .single()
        if (created) {
          profile = {
            id: created.id,
            handle: created.handle as string,
            body: created.body as string,
            visor: created.visor as string,
            built: Math.min(2, Math.max(0, Number(created.built))) as 0 | 1 | 2,
          }
          break
        }
        // 23505 = handle taken; try the fallback. Anything else is fatal.
        if (ierr && ierr.code !== '23505') break
      }
      try {
        localStorage.removeItem(PENDING_HANDLE_KEY)
      } catch {
        /* storage unavailable */
      }
    }

    set({ profile, status: profile ? 'online' : 'anonymous' })
    if (!profile) return

    // city presence: one global channel; facilities filter it locally
    presenceCh = client.channel('nexus-city', {
      config: { presence: { key: presenceKey } },
    })
    presenceCh.on('presence', { event: 'sync' }, () => pullPresence(set))
    presenceCh.subscribe(async (s) => {
      if (s === 'SUBSCRIBED') pushPresence(get, set)
    })
    set({ status: 'online' })
  },

  clearAuthError: () => set({ authError: null }),

  signUp: async (email, password, handle) => {
    if (!socialEnabled) return
    set({ authError: null })
    const clean = handle.trim().replace(/[^a-zA-Z0-9_-]/g, '')
    if (clean.length < 3 || clean.length > 16) {
      set({ authError: 'HANDLE NEEDS 3–16 LETTERS / DIGITS / _ / -' })
      return
    }
    const client = await supabase()
    set({ status: 'linking' })
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      // Return the confirmation link to whichever origin the app runs on
      // (localhost during dev, the Vercel domain in production).
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    if (error) {
      set({ authError: error.message.toUpperCase(), status: 'anonymous' })
      return
    }
    // Email confirmation enabled in Supabase: user exists but there is no
    // session yet, so profile insert would fail RLS. Remember the handle so
    // it can be claimed after the confirmation link is followed.
    if (!data.session || !data.user) {
      try {
        localStorage.setItem(PENDING_HANDLE_KEY, clean)
      } catch {
        /* storage unavailable */
      }
      set({
        status: 'anonymous',
        authError: 'CONFIRMATION SENT // CHECK YOUR INBOX, CONFIRM, THEN SIGN IN',
      })
      return
    }
    const { error: perr } = await client
      .from('profiles')
      .insert({ id: data.user.id, handle: clean })
    if (perr) {
      if (perr.code === '23505') {
        // Handle was claimed while this account was being created. The session
        // is already live, so provision a fallback identity instead of trapping
        // the user at the gate.
        set({ authError: 'HANDLE CLAIMED // USING YOUR EMAIL PREFIX INSTEAD' })
        booted = false
        await get().init()
      } else {
        set({ authError: perr.message.toUpperCase(), status: 'anonymous' })
      }
      return
    }
    booted = false
    await get().init()
  },

  signIn: async (email, password) => {
    if (!socialEnabled) return
    set({ authError: null, status: 'linking' })
    const client = await supabase()
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      set({ authError: error.message.toUpperCase(), status: 'anonymous' })
      return
    }
    booted = false
    await get().init()
  },

  signOut: async () => {
    if (!socialEnabled) return
    const client = await supabase()
    await client.auth.signOut()
    closeBuildingChannel()
    closeDirectChannel()
    if (presenceCh) {
      void presenceCh.unsubscribe()
      presenceCh = null
    }
    cachedSessionUserId = null
    set({
      profile: null,
      presence: [],
      channelMessages: [],
      channelBuildingId: null,
      channelBuildingName: null,
      dmWith: null,
      dmThread: [],
      authError: null,
      status: 'anonymous',
    })
  },

  saveIdentity: async (patch) => {
    const { profile, status } = get()
    if (!socialEnabled || status !== 'online' || !profile) return
    const client = await supabase()
    const clean: Record<string, string | number> = {}
    if (patch.handle) {
      const h = patch.handle.trim().replace(/[^a-zA-Z0-9_-]/g, '')
      if (h.length < 3 || h.length > 16) {
        set({ authError: 'HANDLE NEEDS 3–16 LETTERS / DIGITS / _ / -' })
        return
      }
      clean.handle = h
    }
    if (patch.body) clean.body = patch.body
    if (patch.visor) clean.visor = patch.visor
    if (patch.built !== undefined) clean.built = patch.built
    const { error } = await client.from('profiles').update(clean).eq('id', profile.id)
    if (error) {
      if (error.code === '23505') set({ authError: 'HANDLE CLAIMED // PICK ANOTHER' })
      else set({ authError: error.message.toUpperCase() })
      return
    }
    set({ profile: { ...profile, ...clean } as SocialProfile, authError: null })
    pushPresence(get, set)
  },

  /* ---------------------------------------------------------------- */

  enterBuilding: async (buildingId, buildingName) => {
    if (get().channelBuildingId === buildingId) return
    closeBuildingChannel()
    set({ channelBuildingId: buildingId, channelBuildingName: buildingName, channelMessages: [] })
    pushPresence(get, set)
    if (!socialEnabled || get().status !== 'online') return

    const client = await supabase()
    buildingCh = client.channel(`building:${buildingId}`)
    buildingCh.on('broadcast', { event: 'chat' }, ({ payload }) => {
      const m = payload as BuildingChannelMessage & { cid?: string }
      if (m.cid === presenceKey) return
      set((s) => ({
        channelMessages: [...s.channelMessages, { ...m, at: m.at ?? Date.now() }].slice(-60),
      }))
    })
    buildingCh.subscribe(async (s) => {
      if (s !== 'SUBSCRIBED') return
      const { data } = await client
        .from('building_messages')
        .select('user_id, handle, body, visor, content, created_at')
        .eq('building_id', buildingId)
        .order('created_at', { ascending: false })
        .limit(40)
      if (data && get().channelBuildingId === buildingId) {
        const history: BuildingChannelMessage[] = data
          .map((r) => ({
            userId: r.user_id as string,
            handle: r.handle as string,
            body: r.body as string,
            visor: r.visor as string,
            content: r.content as string,
            at: Date.parse(r.created_at as string),
          }))
          .reverse()
        set({ channelMessages: history })
      }
    })
    void buildingName
  },

  leaveBuilding: async () => {
    if (get().channelBuildingId === null) return
    closeBuildingChannel()
    set({ channelBuildingId: null, channelBuildingName: null, channelMessages: [] })
    pushPresence(get, set)
  },

  sendToChannel: async (content) => {
    const { profile, channelBuildingId, status } = get()
    if (!content.trim() || !profile || status !== 'online' || !channelBuildingId) {
      if (status === 'online' && !profile) set({ authError: 'IDENTITY REQUIRED // COMPLETE YOUR ACCOUNT' })
      return
    }
    const clean = content.trim().slice(0, 240)
    const msg: BuildingChannelMessage & { cid: string } = {
      userId: profile.id,
      handle: profile.handle,
      body: profile.body,
      visor: profile.visor,
      content: clean,
      at: Date.now(),
      cid: presenceKey,
    }
    set((s) => ({ channelMessages: [...s.channelMessages, msg].slice(-60) }))
    const client = await supabase()
    const { cid, ...payload } = msg
    if (buildingCh) {
      void buildingCh.send({ type: 'broadcast', event: 'chat', payload: { ...payload, cid } })
    }
    void client.from('building_messages').insert({
      building_id: channelBuildingId,
      user_id: payload.userId,
      handle: payload.handle,
      body: payload.body,
      visor: payload.visor,
      content: payload.content,
    })
  },

  /* ---------------------------------------------------------------- */

  openDirect: async (userId, handle) => {
    const { profile, status } = get()
    if (!socialEnabled || status !== 'online' || !profile || userId === profile.id) return
    closeDirectChannel()
    // sorted pair key so both sides land on the same channel
    const pair = [profile.id, userId].sort().join(':')
    set({ dmWith: { userId, handle }, dmThread: [] })

    const client = await supabase()
    dmCh = client.channel(`dm:${pair}`)
    dmCh.on('broadcast', { event: 'dm' }, ({ payload }) => {
      const m = payload as DirectThreadMessage & { cid?: string }
      if (m.cid === presenceKey) return
      set((s) => ({ dmThread: [...s.dmThread, m as DirectThreadMessage].slice(-80) }))
    })
    dmCh.subscribe(async (s) => {
      if (s !== 'SUBSCRIBED') return
      const { data } = await client
        .from('direct_messages')
        .select('sender_id, sender_handle, sender_body, recipient_id, content, created_at')
        .or(
          `and(sender_id.eq.${profile.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${profile.id})`,
        )
        .order('created_at', { ascending: false })
        .limit(60)
      if (!data || get().dmWith?.userId !== userId) return
      const thread: DirectThreadMessage[] = data
        .filter(
          (r) =>
            (r.sender_id === profile.id && r.recipient_id === userId) ||
            (r.sender_id === userId && r.recipient_id === profile.id),
        )
        .map((r) => ({
          userId: r.sender_id as string,
          handle: r.sender_handle as string,
          body: r.sender_body as string,
          content: r.content as string,
          at: Date.parse(r.created_at as string),
        }))
        .reverse() // newest-first query -> oldest-first thread
      set({ dmThread: thread })
    })
  },

  closeDirect: () => {
    closeDirectChannel()
    set({ dmWith: null, dmThread: [] })
  },

  sendDirect: async (content) => {
    const { profile, dmWith, status } = get()
    if (!content.trim() || !profile || !dmWith || status !== 'online') return
    const clean = content.trim().slice(0, 240)
    const msg: DirectThreadMessage & { cid: string } = {
      userId: profile.id,
      handle: profile.handle,
      body: profile.body,
      content: clean,
      at: Date.now(),
      cid: presenceKey,
    }
    set((s) => ({ dmThread: [...s.dmThread, msg].slice(-80) }))
    const client = await supabase()
    const { cid, ...payload } = msg
    if (dmCh) {
      void dmCh.send({ type: 'broadcast', event: 'dm', payload: { ...payload, cid } })
    }
    void client.from('direct_messages').insert({
      sender_id: payload.userId,
      recipient_id: dmWith.userId,
      sender_handle: payload.handle,
      sender_body: payload.body,
      content: payload.content,
    })
  },
}))
