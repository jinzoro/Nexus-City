/**
 * OffscreenCanvas worker: rasterises the cached ground / city / foreground
 * layers off the main thread and transfers them back as ImageBitmaps.
 *
 * Activated only when the camera has been idle for a moment, so live panning
 * still renders on the main thread and never lags behind the dynamic entities.
 */
import type { CityData } from '../types'
import type { View } from './renderUtils'
import { renderStaticLayers } from './staticRender'

interface InitMessage {
  type: 'init'
  city: CityData
}

interface RenderMessage {
  type: 'render'
  id: number
  key: string
  view: View
  width: number
  height: number
}

type Inbound = InitMessage | RenderMessage

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Inbound>) => void) | null
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}

let city: CityData | null = null
let ground: OffscreenCanvas | null = null
let cityLayer: OffscreenCanvas | null = null
let fg: OffscreenCanvas | null = null
let groundCtx: OffscreenCanvasRenderingContext2D | null = null
let cityCtx: OffscreenCanvasRenderingContext2D | null = null
let fgCtx: OffscreenCanvasRenderingContext2D | null = null

function ensureLayers(width: number, height: number) {
  if (ground && ground.width === width && ground.height === height) return
  ground = new OffscreenCanvas(width, height)
  cityLayer = new OffscreenCanvas(width, height)
  fg = new OffscreenCanvas(width, height)
  groundCtx = ground.getContext('2d')
  cityCtx = cityLayer.getContext('2d')
  fgCtx = fg.getContext('2d')
  if (groundCtx) groundCtx.imageSmoothingEnabled = false
  if (cityCtx) cityCtx.imageSmoothingEnabled = false
  if (fgCtx) fgCtx.imageSmoothingEnabled = false
}

scope.onmessage = (event) => {
  const message = event.data
  if (!message) return
  if (message.type === 'init') {
    city = message.city
    return
  }
  if (message.type !== 'render' || !city) return
  ensureLayers(message.width, message.height)
  if (!ground || !cityLayer || !fg || !groundCtx || !cityCtx || !fgCtx) return
  const view: View = { ...message.view, city }
  renderStaticLayers(view, city, groundCtx, cityCtx, fgCtx, message.width, message.height)
  const groundBitmap = ground.transferToImageBitmap()
  const cityBitmap = cityLayer.transferToImageBitmap()
  const fgBitmap = fg.transferToImageBitmap()
  scope.postMessage(
    { type: 'layers', id: message.id, key: message.key, ground: groundBitmap, city: cityBitmap, fg: fgBitmap },
    [groundBitmap, cityBitmap, fgBitmap],
  )
}
