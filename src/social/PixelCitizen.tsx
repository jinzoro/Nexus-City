import type { CSSProperties } from 'react'
import type { SocialProfile } from './types'

/**
 * Pixel citizen avatar drawn from profile colours. `built` picks the
 * silhouette: 0 = lithe, 1 = broad, 2 = tall.
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
  const b = profile.body
  const v = profile.visor
  const built = Math.min(2, Math.max(0, Math.round(profile.built)))
  // variants: width of the suit + leg height offsets
  const torsoW = built === 1 ? 8 : 6
  const torsoX = (16 - torsoW) / 2
  const legY = built === 2 ? 10 : 11
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* legs */}
      <rect x={torsoX} y={legY} width={Math.max(2, torsoW / 3)} height={16 - legY - 1} fill={b} />
      <rect x={torsoX + torsoW - Math.max(2, torsoW / 3)} y={legY} width={Math.max(2, torsoW / 3)} height={16 - legY - 1} fill={b} />
      {/* boots */}
      <rect x={torsoX} y={15} width={torsoW} height={1} fill="#05060f" />
      {/* torso */}
      <rect x={torsoX} y={6} width={torsoW} height={legY - 6} fill={b} />
      {/* belt line */}
      <rect x={torsoX} y={legY - 2} width={torsoW} height={1} fill="#05060f" opacity=".45" />
      {/* head */}
      <rect x={5} y={2} width={6} height={4} fill={b} />
      {/* visor band */}
      <rect x={5} y={3} width={6} height={2} fill={v} />
      <rect x={6} y={3} width={1} height={1} fill="#ffffff" opacity=".8" />
      {/* shoulders signal */}
      <rect x={4} y={6} width={1} height={2} fill={v} />
      <rect x={11} y={6} width={1} height={2} fill={v} />
    </svg>
  )
}
