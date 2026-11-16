import { supabase } from './client'
import { useSocialStore } from './useSocialStore'

/**
 * Session manager: keeps the Supabase session warm, locks the console after a
 * configurable idle period, and mirrors sign-out across browser tabs.
 *
 * Attached once from <App />; returns a cleanup for hot reloads.
 */
export function attachSessionManager(): () => void {
  let lastNote = 0
  const note = () => {
    const now = Date.now()
    // Activity fires for every pointermove; 5s is plenty of resolution for a
    // multi-minute idle timer.
    if (now - lastNote < 5000) return
    lastNote = now
    useSocialStore.getState().noteActivity()
  }

  const checkIdle = () => {
    const state = useSocialStore.getState()
    if (state.status !== 'online' || state.sessionLocked) return
    if (!state.sessionAutoLock) return
    if (Date.now() - state.lastActiveAt >= state.sessionAutoLock * 60_000) {
      state.lockSession()
    }
  }

  const refreshIfStale = async () => {
    const state = useSocialStore.getState()
    if (!state.enabled || state.status !== 'online') return
    try {
      const client = await supabase()
      const { data } = await client.auth.getSession()
      const expiresAt = data.session?.expires_at
      // Refresh a little before expiry so a sleeping tab resumes cleanly.
      if (expiresAt && expiresAt * 1000 - Date.now() < 5 * 60_000) {
        await client.auth.refreshSession()
      }
      void state.refreshUnread()
    } catch {
      /* offline / no backend */
    }
  }

  const onVisible = () => {
    if (!document.hidden) void refreshIfStale()
  }

  let channel: BroadcastChannel | null = null
  if ('BroadcastChannel' in window) {
    try {
      channel = new BroadcastChannel('nexus.session')
      channel.onmessage = (event: MessageEvent) => {
        if (event.data?.type !== 'signed-out') return
        const state = useSocialStore.getState()
        if (state.profile) void state.signOut()
      }
    } catch {
      channel = null
    }
  }

  const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'wheel', 'touchstart']
  for (const name of events) window.addEventListener(name, note, { passive: true })
  document.addEventListener('visibilitychange', onVisible)
  const timer = window.setInterval(checkIdle, 15_000)

  return () => {
    for (const name of events) window.removeEventListener(name, note)
    document.removeEventListener('visibilitychange', onVisible)
    window.clearInterval(timer)
    channel?.close()
  }
}
