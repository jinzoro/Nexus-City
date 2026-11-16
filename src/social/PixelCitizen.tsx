import type { CSSProperties } from 'react'
import type { SocialProfile } from './types'
import { CITIZEN_SIZE, citizenPixels } from '../engine/citizenSprite'

/**
 * Pixel citizen avatar drawn from profile colours. `built` picks the
 * silhouette: 0 = lithe, 1 = broad, 2 = tall. Pixels come from the shared
 * sprite definition so the DOM avatar matches the citizen walking the city.
 */
export function PixelCitizen({
  profile,
  size = 22,
  className,
  style,
}: {
  profile: Pick<SocialProfile, 'body' | 'visor' | 'built'> | {
    body: string
    visor: string
    built: number
  }
  size?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      viewBox={`0 0 ${CITIZEN_SIZE} ${CITIZEN_SIZE}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {citizenPixels(profile).map((p, i) => (
        <rect
          key={i}
          x={p.x}
          y={p.y}
          width={p.w}
          height={p.h}
          fill={p.color}
          opacity={p.alpha}
        />
      ))}
    </svg>
  )
}
