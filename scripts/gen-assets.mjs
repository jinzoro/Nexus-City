/**
 * Generates NEXUS brand assets without any npm dependency:
 *   public/og-image.png   1200×630 social preview
 *   public/icon-512.png   512×512 PWA icon
 *   public/icon-192.png   192×192 PWA icon
 *
 * Pure Node: hand-rolled RGBA raster + PNG encoder (zlib + CRC32).
 * Run: node scripts/gen-assets.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public')
mkdirSync(outDir, { recursive: true })

/* ---------------------------------------------------------------- */
/* PNG encoding                                                      */
/* ---------------------------------------------------------------- */

const CRC_TABLE = new Int32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[i] = c
}

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function pngEncode(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const stride = w * 4
  const raw = Buffer.alloc((stride + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------------------------------------------------------------- */
/* Raster                                                            */
/* ---------------------------------------------------------------- */

function raster(w, h) {
  const data = Buffer.alloc(w * h * 4)
  function blend(x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= w || y >= h || a <= 0.002) return
    a = Math.min(1, a)
    const i = (y * w + x) * 4
    const keep = 1 - a
    data[i] = Math.round(r * a + data[i] * keep)
    data[i + 1] = Math.round(g * a + data[i + 1] * keep)
    data[i + 2] = Math.round(b * a + data[i + 2] * keep)
    data[i + 3] = 255
  }
  return {
    w,
    h,
    data,
    rect(x, y, rw, rh, color, alpha = 1) {
      x = Math.round(x)
      y = Math.round(y)
      rw = Math.round(rw)
      rh = Math.round(rh)
      for (let yy = y; yy < y + rh; yy++) {
        for (let xx = x; xx < x + rw; xx++) blend(xx, yy, color[0], color[1], color[2], alpha)
      }
    },
    verticalGradient(y0, y1, c0, c1) {
      for (let y = y0; y < y1; y++) {
        const t = (y - y0) / Math.max(1, y1 - y0)
        this.rect(0, y, w, 1, [
          Math.round(c0[0] + (c1[0] - c0[0]) * t),
          Math.round(c0[1] + (c1[1] - c0[1]) * t),
          Math.round(c0[2] + (c1[2] - c0[2]) * t),
        ])
      }
    },
  }
}

/* Deterministic RNG so every run produces the exact same assets. */
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ---------------------------------------------------------------- */
/* OG image: isometric city glow                                     */
/* ---------------------------------------------------------------- */

function drawOgImage() {
  const W = 1200
  const H = 630
  const r = mulberry32(720412)
  const c = raster(W, H)

  // sky gradient (deep cavern haze)
  c.verticalGradient(0, H, [7, 6, 18], [13, 18, 38])

  // stalactites from the ceiling
  for (let x = 0; x < W; x += 18) {
    const len = 40 + r() * 150
    const width = 10 + r() * 14
    for (let y = 0; y < len; y++) {
      const shrink = (y / len) * (width / 2)
      c.rect(x + shrink, y, Math.max(2, width - shrink * 2), 1, [12, 12, 28], 0.9)
    }
  }

  // ground plane + iso roads
  const groundY = 470
  c.rect(0, groundY, W, H - groundY, [10, 10, 24])
  for (let i = 0; i < 6; i++) {
    const y = groundY + 8 + i * 26
    c.rect(0, y, W, 1, [34, 46, 84], 0.55)
    c.rect(0, y + 1, W, 2, [18, 22, 44], 0.5)
  }
  for (let i = 0; i < 9; i++) {
    const x = 40 + i * 140 + ((i % 2) * 26)
    for (let y = groundY; y < H; y++) {
      c.rect(x + (y - groundY) * 0.42, y, 2, 1, [30, 40, 78], 0.5)
    }
  }

  // tower battery behind the main skyline
  for (let i = 0; i < 22; i++) {
    const tw = 26 + r() * 44
    const th = 60 + r() * 160
    const x = 20 + r() * (W - tw - 40)
    const y = groundY + 4 + r() * 60 - th
    c.rect(x, y, tw, -y + groundY + 4, [11, 14, 30])
    c.rect(x, y, tw, 1, [40, 70, 120], 0.5)
  }

  // hero towers, isometric-ish: front face + shaded right face + roof
  const NEON = [
    [34, 230, 255], // cyan
    [255, 79, 163], // magenta
    [255, 179, 71], // amber
    [143, 248, 255], // ice
  ]
  for (let i = 0; i < 12; i++) {
    const tw = 34 + Math.floor(r() * 52)
    const th = 130 + Math.floor(r() * 210)
    const x = 30 + i * 96 + Math.floor(r() * 40)
    const base = groundY + 20 + Math.floor(r() * 40)
    const top = base - th
    const depth = 6 + Math.floor(r() * 8)

    // front face
    c.rect(x, top, tw, th, [15, 20, 40])
    // right shaded face
    for (let d = 0; d < depth; d++) {
      c.rect(x + tw + d, top + Math.floor(d / 2), 1, th, [9, 12, 26])
    }
    // roof
    for (let d = 0; d < depth * 2; d++) {
      c.rect(x + d, top - Math.floor(d / 2), d === depth * 2 - 1 ? 1 : 2, 1, [24, 34, 64])
    }
    // top accent — spire light
    if (r() > 0.45) {
      const accent = NEON[Math.floor(r() * NEON.length)]
      c.rect(x + tw / 2 - 1, top - 26, Math.max(2, tw / 14), 26, [accent[0], accent[1], accent[2]], 0.85)
      c.rect(x + tw / 2 - 3, top - 30, 6, 3, [accent[0], accent[1], accent[2]], 0.95)
    }

    // windows: lit floors, denser near the street
    const accent = NEON[i % NEON.length]
    for (let wy = top + 8; wy < base - 10; wy += 7) {
      for (let wx = x + 3; wx < x + tw - 4; wx += 6) {
        if (r() < 0.42) continue
        const lit = r()
        const col =
          lit > 0.92 ? [255, 217, 160] : lit > 0.7 ? accent : [70, 110, 160]
        c.rect(wx, wy, 2, 3, col, lit > 0.7 ? 0.9 : 0.55)
      }
    }
    // vertical neon sign strip on the facade
    if (r() > 0.5) {
      const sx = x + 2 + Math.floor(r() * (tw - 8))
      const sy = top + 14 + Math.floor(r() * 40)
      const sh = 40 + Math.floor(r() * 60)
      for (let yy = sy; yy < sy + sh; yy += 2) {
        c.rect(sx, yy, 2, 1, accent, 0.9)
      }
      c.rect(sx - 1, sy - 1, 1, sh, [0, 0, 0], 0.4)
    }
    // street bloom under the tower
    c.rect(x - 6, base + 6, tw + 12, 2, accent, 0.5)
    c.rect(x - 2, base + 7, tw + 4, 1, [5, 6, 14], 0.8)
  }

  // elevated maglev line with a train
  const lineY = 236
  c.rect(90, lineY, W - 180, 3, [60, 120, 170], 0.7)
  for (let px = 120; px < W - 120; px += 84) {
    for (let y = lineY + 3; y < groundY + 40; y += 3) {
      c.rect(px, y, 2, 2, [22, 32, 60], 0.42)
    }
  }
  // train
  for (let car = 0; car < 4; car++) {
    const tx = 300 + car * 54
    c.rect(tx, lineY - 14, 46, 14, [16, 30, 46])
    c.rect(tx, lineY - 14, 46, 2, [34, 230, 255], 0.95)
    c.rect(tx, lineY - 3, 46, 3, [10, 18, 34], 0.9)
    for (let wx = tx + 6; wx < tx + 40; wx += 9) {
      c.rect(wx, lineY - 10, 5, 4, [143, 248, 255], 0.85)
    }
  }
  // line glow along the rails
  c.rect(90, lineY + 3, W - 180, 1, [34, 230, 255], 0.3)

  // foreground haze band
  for (let y = 520; y < H; y++) {
    c.rect(0, y, W, 1, [6, 10, 24], ((y - 520) / (H - 520)) * 0.55)
  }
  // ceiling shadowing
  for (let y = 0; y < 70; y++) {
    c.rect(0, y, W, 1, [2, 2, 8], (1 - y / 70) * 0.5)
  }

  // scanlines
  for (let y = 0; y < H; y += 3) {
    c.rect(0, y, W, 1, [0, 0, 0], 0.1)
  }
  // corner vignette (approximate with edge strips)
  for (let i = 0; i < 60; i++) {
    c.rect(0, i, W, 1, [0, 0, 0], 0)
  }

  writeFileSync(join(outDir, 'og-image.png'), pngEncode(W, H, c.data))
}

/* ---------------------------------------------------------------- */
/* Icon: NEXUS diamond glyph                                         */
/* ---------------------------------------------------------------- */

function drawIcon(size, blocks) {
  const p = size / blocks
  const c = raster(size, size)
  c.rect(0, 0, size, size, [5, 4, 12])
  // subtle radial-ish glow via concentric squares
  const mid = size / 2
  for (let ring = blocks / 2; ring > 0; ring--) {
    const alpha = 0.028 * (1 - ring / (blocks / 2))
    c.rect(mid - ring * p / 2, mid - ring * p / 2, ring * p / 2 * 2, ring * p / 2 * 2, [34, 230, 255], alpha)
  }

  const R = Math.floor(blocks / 2) - 2 // diamond radius in blocks
  const plot = (dx, dy, color, alpha) => c.rect(mid + dx * p, mid + dy * p, p, p, color, alpha)

  // outer diamond outline (cyan)
  for (let y = -R; y <= R; y++) {
    const span = R - Math.abs(y)
    plot(-span, y, [34, 230, 255], 0.95)
    plot(span, y, [34, 230, 255], 0.95)
    for (let x = -span + 1; x < span; x++) plot(x, y, [10, 18, 36])
  }
  // inner diamond (magenta fill), cells bright core
  const r2 = Math.max(2, Math.floor(R * 0.42))
  for (let y = -r2; y <= r2; y++) {
    const span = r2 - Math.abs(y)
    for (let x = -span; x <= span; x++) plot(x, y, [255, 61, 226], y === 0 ? 0.98 : 0.8)
  }
  // central core (white hot)
  plot(0, 0, [220, 250, 255], 1)
  plot(-1, 0, [180, 245, 255], 0.9)
  plot(1, 0, [180, 245, 255], 0.9)
  // scanline texture
  for (let y = 0; y < size; y += Math.max(2, Math.round(p / 2))) {
    c.rect(0, y, size, 1, [0, 0, 4], 0.08)
  }

  writeFileSync(join(outDir, `icon-${size}.png`), pngEncode(size, size, c.data))
}

drawOgImage()
drawIcon(512, 16)
drawIcon(192, 16)
console.log('assets written to public/')
