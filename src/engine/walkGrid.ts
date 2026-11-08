export const WORLD_SIZE = 198
export const BLOCK_COUNT = 18
export const BLOCK_SIZE = 11
export const ROAD_SIZE = 2
export const CELL_SIZE = 1
export const TILE_W = 178
export const TILE_H = 278

type Node = { x: number; y: number; g: number; f: number; p?: Node }

function heuristic(ax: number, ay: number, bx: number, by: number) {
  const dx = Math.abs(ax - bx)
  const dy = Math.abs(ay - by)
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)
}

export function isWalkable(x: number, y: number, buildingMask: Uint8Array): boolean {
  if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) return false
  if (Math.floor(x) % 11 < 2 || Math.floor(y) % 11 < 2) return true
  return buildingMask[y * WORLD_SIZE + x] !== 1
}

export function findPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  buildingMask: Uint8Array,
): { x: number; y: number }[] {
  const open: Node[] = []
  const closed = new Uint8Array(WORLD_SIZE * WORLD_SIZE)
  const start: Node = { x: Math.floor(sx), y: Math.floor(sy), g: 0, f: heuristic(sx, sy, tx, ty) }
  open.push(start)
  const gScore = new Map<string, number>()
  gScore.set(`${start.x},${start.y}`, 0)

  while (open.length) {
    open.sort((a, b) => a.f - b.f)
    const cur = open.shift()!
    if (cur.x === Math.floor(tx) && cur.y === Math.floor(ty)) {
      const path: { x: number; y: number }[] = []
      let n: Node | undefined = cur
      while (n) {
        path.unshift({ x: n.x, y: n.y })
        n = n.p as Node | undefined
      }
      return path
    }
    closed[cur.y * WORLD_SIZE + cur.x] = 1
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const nx = cur.x + dx
        const ny = cur.y + dy
        if (!isWalkable(nx, ny, buildingMask)) continue
        if (closed[ny * WORLD_SIZE + nx]) continue
        const cost = dx === 0 || dy === 0 ? 1 : Math.SQRT2
        const ng = (gScore.get(`${cur.x},${cur.y}`) ?? 0) + cost
        const key = `${nx},${ny}`
        if (!gScore.has(key) || ng < (gScore.get(key) ?? Infinity)) {
          gScore.set(key, ng)
          const nNode: Node = { x: nx, y: ny, g: ng, f: ng + heuristic(nx, ny, tx, ty), p: cur }
          open.push(nNode)
        }
      }
    }
  }
  return []
}

export function nearestWalkable(cx: number, cy: number, buildingMask: Uint8Array, radius = 18): { x: number; y: number } | null {
  for (let r = 0; r <= radius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = Math.floor(cx + dx)
        const ny = Math.floor(cy + dy)
        if (isWalkable(nx, ny, buildingMask)) return { x: nx, y: ny }
      }
    }
  }
  return null
}
