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
  DmPolicy,
  PresenceEntry,
  SocialProfile,
  Visibility,
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

export interface AccountNotice {
  tone: 'ok' | 'error'
  text: string
}

interface SocialState {
  enabled: boolean
  status: SocialStatus
  authError: string | null
  profile: SocialProfile | null
  presence: PresenceEntry[]

  /** Set after sign-up when Supabase requires email confirmation. */
  signupPending: { email: string } | null
  /** Epoch ms before which the resend button stays disabled. */
  resendCooldownUntil: number
  resendStatus: 'idle' | 'sending' | 'sent' | 'error'
  /** Feedback for the settings/security forms. */
  accountNotice: AccountNotice | null
  accountBusy: boolean

  channelBuildingId: string | null
  channelBuildingName: string | null
  channelMessages: BuildingChannelMessage[]

  dmWith: { userId: string; handle: string } | null
  dmThread: DirectThreadMessage[]

  init: () => Promise<void>
  clearAuthError: () => void
  clearAccountNotice: () => void
  signUp: (email: string, password: string, handle: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signOutEverywhere: () => Promise<void>
  resendConfirmation: () => Promise<void>
  cancelSignup: () => void
  saveIdentity: (
    patch: Partial<
      Pick<
        SocialProfile,
        'handle' | 'body' | 'visor' | 'built' | 'bio' | 'statusText' | 'visibility' | 'dmPolicy'
      >
    >,
  ) => Promise<void>

  updateEmail: (email: string) => Promise<void>
  updatePassword: (current: string, next: string) => Promise<void>
  deleteAccount: () => Promise<void>
  exportData: () => Promise<void>

  enterBuilding: (buildingId: string, buildingName: string) => Promise<void>
  leaveBuilding: () => Promise<void>
  sendToChannel: (content: string) => Promise<void>

  openDirect: (userId: string, handle: string) => Promise<void>
  closeDirect: () => void
  sendDirect: (content: string) => Promise<void>
}

/** Map a Supabase `profiles` row (snake_case) onto the domain profile. */
function rowToProfile(row: Record<string, unknown>): SocialProfile {
  const visibility = row.visibility === 'ghost' ? 'ghost' : 'online'
  const policy = row.dm_policy
  const dmPolicy: DmPolicy = policy === 'floor' || policy === 'none' ? policy : 'all'
  return {
    id: row.id as string,
    handle: row.handle as string,
    body: row.body as string,
    visor: row.visor as string,
    built: Math.min(2, Math.max(0, Number(row.built))) as 0 | 1 | 2,
    bio: (row.bio as string) ?? '',
    statusText: (row.status_text as string) ?? '',
    visibility,
    dmPolicy,
  }
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
    bio: p.bio,
    statusText: p.statusText,
    dmPolicy: p.dmPolicy,
    buildingId: get().channelBuildingId,
    buildingName: get().channelBuildingName,
    district: null as string | null,
  }
}

function pushPresence(get: () => SocialState, set: (patch: Partial<SocialState>) => void) {
  if (!presenceCh) return
  // Ghost mode: stay signed in locally but disappear from the city roster.
  if (get().profile?.visibility === 'ghost') {
    void presenceCh.untrack()
    return
  }
  const meta = mePresenceMeta(get)
  if (meta) void presenceCh.track(meta)
}

/** Tear down every live channel and return the store to a signed-out shape. */
function resetSessionState(set: (patch: Partial<SocialState>) => void) {
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
    accountBusy: false,
    status: 'anonymous',
  })
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

  signupPending: null,
  resendCooldownUntil: 0,
  resendStatus: 'idle',
  accountNotice: null,
  accountBusy: false,

  channelBuildingId: null,
  channelBuildingName: null,
  channelMessages: [],

  dmWith: null,
  dmThread: [],

  /* ---------------------------------------------------------------- */

  init: async () => {
    if (!socialEnabled) return
    if (booted) return
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
      profile = rowToProfile(row as Record<string, unknown>)
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
      // The chosen handle also travels in user_metadata so it survives email
      // confirmation on another device/origin (localStorage does not).
      const meta = String((user.user_metadata as Record<string, unknown> | undefined)?.handle ?? '')
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '')
      const candidates: string[] = []
      if (pending.length >= 3 && pending.length <= 16) candidates.push(pending)
      if (meta.length >= 3 && meta.length <= 16 && meta !== pending) candidates.push(meta)
      candidates.push(fallback.length >= 3 ? fallback : `op-${user.id.slice(0, 6)}`)

      for (const handle of candidates) {
        const { data: created, error: ierr } = await client
          .from('profiles')
          .insert({ id: user.id, handle })
          .select()
          .single()
        if (created) {
          profile = rowToProfile(created as Record<string, unknown>)
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

  clearAccountNotice: () => set({ accountNotice: null }),

  resendConfirmation: async () => {
    const { signupPending, resendStatus, resendCooldownUntil } = get()
    if (!socialEnabled || !signupPending || resendStatus !== 'idle') return
    if (Date.now() < resendCooldownUntil) return
    set({ resendStatus: 'sending' })
    try {
      const client = await supabase()
      await client.auth.resend({ type: 'signup', email: signupPending.email })
      const now = Date.now()
      set({ resendStatus: 'sent', resendCooldownUntil: now + 60_000 })
    } catch (err: unknown) {
      set({
        resendStatus: 'error',
        authError: (err as Error)?.message?.toUpperCase() ?? 'RESEND FAILED',
      })
    }
  },

  cancelSignup: () => {
    set({ signupPending: null })
  },

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
      // (localhost during dev, the Vercel domain in production). The handle
      // rides along in user_metadata so it is available after confirmation
      // even when the pending localStorage entry is on another device.
      options: { data: { handle: clean }, emailRedirectTo: `${window.location.origin}/` },
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
        authError: null,
        signupPending: { email: email.trim() },
        resendStatus: 'idle',
        resendCooldownUntil: Date.now() + 60_000,
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
    set({ authError: null, status: 'linking', signupPending: null })
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
    resetSessionState(set)
    set({ authError: null, accountNotice: null })
  },

  signOutEverywhere: async () => {
    if (!socialEnabled) return
    set({ accountBusy: true })
    const client = await supabase()
    await client.auth.signOut({ scope: 'global' })
    resetSessionState(set)
    set({ authError: null, accountNotice: null })
  },

  saveIdentity: async (patch) => {
    const { profile, status } = get()
    if (!socialEnabled || status !== 'online' || !profile) return
    set({ accountBusy: true, accountNotice: null })
    const client = await supabase()
    const clean: Record<string, unknown> = {}
    if (patch.handle) {
      const h = patch.handle.trim().replace(/[^a-zA-Z0-9_-]/g, '')
      if (h.length < 3 || h.length > 16) {
        set({ accountBusy: false, authError: 'HANDLE NEEDS 3–16 LETTERS / DIGITS / _ / -' })
        return
      }
      clean.handle = h
    }
    if (patch.body) clean.body = patch.body
    if (patch.visor) clean.visor = patch.visor
    if (patch.built !== undefined) clean.built = patch.built
    if (patch.bio !== undefined) clean.bio = patch.bio.slice(0, 160)
    if (patch.statusText !== undefined) clean.status_text = patch.statusText.slice(0, 40)
    if (patch.visibility !== undefined) clean.visibility = patch.visibility
    if (patch.dmPolicy !== undefined) clean.dm_policy = patch.dmPolicy
    const { error } = await client.from('profiles').update(clean).eq('id', profile.id)
    if (error) {
      const msg = error.code === '23505' ? 'HANDLE CLAIMED // PICK ANOTHER' : error.message.toUpperCase()
      set({ accountBusy: false, accountNotice: { tone: 'error', text: msg } })
      return
    }
    const { data } = await client.from('profiles').select('*').eq('id', profile.id).single()
    const updated = data ? rowToProfile(data as Record<string, unknown>) : { ...profile, ...clean } as SocialProfile
    set({ profile: updated, accountBusy: false, accountNotice: { tone: 'ok', text: 'PROFILE SAVED' } })
    pushPresence(get, set)
  },

  updateEmail: async (email) => {
    const { profile, status } = get()
    if (!socialEnabled || status !== 'online' || !profile) return
    set({ accountBusy: true })
    const client = await supabase()
    try {
      const { error } = await client.auth.updateUser({ email: email.trim() })
      if (error) {
        set({ accountBusy: false, accountNotice: { tone: 'error', text: error.message.toUpperCase() } })
        return
      }
      set({ accountBusy: false, accountNotice: { tone: 'ok', text: 'EMAIL CHANGE PENDING // CONFIRM THE NEW ADDRESS' } })
    } catch (e: unknown) {
      set({ accountBusy: false, accountNotice: { tone: 'error', text: (e as Error).message.toUpperCase() } })
    }
  },

  updatePassword: async (current, next) => {
    const { profile, status, authError } = get()
    if (!socialEnabled || status !== 'online' || !profile) return
    set({ accountBusy: true })
    const client = await supabase()
    try {
      const { data: user } = await client.auth.getUser()
      const email = user.user?.email ?? ''
      if (!email) {
        set({ accountBusy: false, accountNotice: { tone: 'error', text: 'NO USER EMAIL ON FILE' } })
        return
      }
      const { error: re } = await client.auth.signInWithPassword({ email, password: current })
      if (re) {
        set({ accountBusy: false, accountNotice: { tone: 'error', text: 'CURRENT PASSWORD WRONG' } })
        return
      }
      const { error } = await client.auth.updateUser({ password: next })
      if (error) {
        set({ accountBusy: false, accountNotice: { tone: 'error', text: error.message.toUpperCase() } })
        return
      }
      set({ accountBusy: false, accountNotice: { tone: 'ok', text: 'PASSWORD UPDATED' } })
    } catch (e: unknown) {
      set({ accountBusy: false, accountNotice: { tone: 'error', text: (e as Error).message.toUpperCase() } })
    }
  },

  deleteAccount: async () => {
    const { profile, status } = get()
    if (!socialEnabled || status !== 'online' || !profile) return
    set({ accountBusy: true })
    const client = await supabase()
    try {
      await client.from('profiles').delete().eq('id', profile.id)
      await client.rpc('delete_my_user')
      resetSessionState(set)
      set({ accountNotice: { tone: 'ok', text: 'ACCOUNT DELETED' } })
    } catch (e: unknown) {
      set({ accountBusy: false, accountNotice: { tone: 'error', text: (e as Error).message.toUpperCase() } })
    }
  },

  exportData: async () => {
    const { profile, status } = get()
    if (!socialEnabled || status !== 'online' || !profile) return
    set({ accountBusy: true })
    const client = await supabase()
    try {
      const { data: p } = await client.from('profiles').select('*').eq('id', profile.id).single()
      const { data: msgs } = await client.from('building_messages').select('*').eq('user_id', profile.id)
      const payload = { profile: p, buildingMessages: msgs }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nexus-export-${profile.handle}.json`
      a.click()
      URL.revokeObjectURL(url)
      set({ accountBusy: false, accountNotice: { tone: 'ok', text: 'DATA EXPORTED' } })
    } catch (e: unknown) {
      set({ accountBusy: false, accountNotice: { tone: 'error', text: (e as Error).message.toUpperCase() } })
    }
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
