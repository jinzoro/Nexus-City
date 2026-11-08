import { useEffect, useState } from 'react'
import { useCityStore } from '../state/useCityStore'

/**
 * Touch-only hint: shows once after the intro on coarse-pointer devices
 * ("pinch to zoom / drag to pan"), auto-dismisses, tap to dismiss.
 */
export function MobileHint() {
  const introDone = useCityStore((s) => s.introDone)
  const [dismissed, setDismissed] = useState(false)
  const [coarse, setCoarse] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    setCoarse(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setCoarse(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!introDone || !coarse) return
    const timer = window.setTimeout(() => setDismissed(true), 7600)
    return () => window.clearTimeout(timer)
  }, [introDone, coarse])

  if (!introDone || !coarse || dismissed) return null
  return (
    <button type="button" className="mobile-hint" onClick={() => setDismissed(true)}>
      <span className="mobile-hint__glyph" aria-hidden="true">
        <span />
        <span />
      </span>
      <span className="mobile-hint__body">
        <strong>PINCH TO ZOOM · DRAG TO PAN</strong>
        <span>Tap any structure or citizen to open its record.</span>
      </span>
      <span className="mobile-hint__close" aria-hidden="true">×</span>
    </button>
  )
}
