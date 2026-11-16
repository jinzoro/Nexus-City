/**
 * Builds the three cached static layers (ground, city, foreground) for a view.
 * Pure canvas work — no DOM APIs — so the same function runs on the main
 * thread and inside the OffscreenCanvas worker.
 */
import type { CityData } from '../types'
import type { View } from './renderUtils'
import { getBuildingBounds, isBoundsVisible, project } from './renderUtils'
import { drawBuilding, drawProp, drawRailSegment } from './buildingRenderer'
import { renderForeground, renderGround } from './groundRenderer'
import type { Prop, RailLine } from '../types'

type StaticEntry =
  | { depth: number; kind: 'building'; building: CityData['buildings'][number] }
  | { depth: number; kind: 'prop'; prop: Prop }
  | { depth: number; kind: 'rail'; line: RailLine; from: number; to: number }

export function renderStaticLayers(
  view: View,
  city: CityData,
  groundCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  cityCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  fgCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
) {
  renderGround(groundCtx as CanvasRenderingContext2D, view)
  cityCtx.clearRect(0, 0, width, height)
  const entries: StaticEntry[] = []
  for (const b of city.buildings) {
    const bounds = getBuildingBounds(view, b)
    if (!isBoundsVisible(view, bounds, 20)) continue
    entries.push({ depth: b.x + b.y + (b.w + b.d) * 0.5, kind: 'building', building: b })
  }
  for (const p of city.props) {
    const pt = project(view, p.x, p.y, 0)
    if (pt[0] < -40 || pt[0] > width + 40 || pt[1] < -40 || pt[1] > height + 40) continue
    entries.push({ depth: p.x + p.y, kind: 'prop', prop: p })
  }
  for (const line of city.rails) {
    const step = 11
    for (let from = line.from; from < line.to; from += step) {
      const to = Math.min(from + step, line.to)
      const cx = line.axis === 'x' ? (from + to) / 2 : line.coord
      const cy = line.axis === 'x' ? line.coord : (from + to) / 2
      const p = project(view, cx, cy, line.z)
      if (p[0] < -100 || p[0] > width + 100 || p[1] < -100 || p[1] > height + 100) continue
      entries.push({ depth: cx + cy, kind: 'rail', line, from, to })
    }
  }
  entries.sort((a, b) => a.depth - b.depth)
  for (const entry of entries) {
    if (entry.kind === 'building') drawBuilding(cityCtx as CanvasRenderingContext2D, view, entry.building)
    else if (entry.kind === 'prop') drawProp(cityCtx as CanvasRenderingContext2D, view, entry.prop)
    else drawRailSegment(cityCtx as CanvasRenderingContext2D, view, entry.line, entry.from, entry.to)
  }
  renderForeground(fgCtx as CanvasRenderingContext2D, view)
}
