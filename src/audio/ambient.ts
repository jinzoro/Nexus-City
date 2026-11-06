import type { DistrictId } from '../types'

interface DistrictTone {
  hum: number
  filter: number
  noise: number
  pulse: number
}

const TONES: Record<DistrictId, DistrictTone> = {
  central: { hum: 48, filter: 420, noise: 0.028, pulse: 0.06 },
  market: { hum: 58, filter: 880, noise: 0.05, pulse: 0.11 },
  corporate: { hum: 42, filter: 260, noise: 0.018, pulse: 0.035 },
  industrial: { hum: 36, filter: 190, noise: 0.055, pulse: 0.08 },
  residential: { hum: 51, filter: 520, noise: 0.03, pulse: 0.045 },
  tech: { hum: 64, filter: 760, noise: 0.022, pulse: 0.07 },
  entertainment: { hum: 72, filter: 980, noise: 0.04, pulse: 0.14 },
  bio: { hum: 46, filter: 640, noise: 0.035, pulse: 0.04 },
  transit: { hum: 40, filter: 330, noise: 0.045, pulse: 0.09 },
}

export class AmbientAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private hum: OscillatorNode | null = null
  private humGain: GainNode | null = null
  private noiseFilter: BiquadFilterNode | null = null
  private noiseGain: GainNode | null = null
  private lfo: OscillatorNode | null = null
  private lfoGain: GainNode | null = null
  private pingTimer: number | null = null
  private stopTimer: number | null = null
  private running = false

  get isRunning() {
    return this.running
  }

  async start(district: DistrictId = 'central') {
    if (this.stopTimer !== null) {
      window.clearTimeout(this.stopTimer)
      this.stopTimer = null
    }
    if (this.ctx) {
      await this.ctx.resume()
      this.running = true
      this.setDistrict(district)
      return
    }
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) throw new Error('AudioContext unavailable')
    const ctx = new AudioCtor()
    this.ctx = ctx
    if (ctx.state === 'suspended') await ctx.resume()

    const master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
    this.master = master

    const hum = ctx.createOscillator()
    hum.type = 'sine'
    hum.frequency.value = 48
    const humGain = ctx.createGain()
    humGain.gain.value = 0.13
    hum.connect(humGain)
    humGain.connect(master)
    hum.start()
    this.hum = hum
    this.humGain = humGain

    const sub = ctx.createOscillator()
    sub.type = 'triangle'
    sub.frequency.value = 24
    const subGain = ctx.createGain()
    subGain.gain.value = 0.055
    sub.connect(subGain)
    subGain.connect(master)
    sub.start()

    const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      last = last * 0.96 + white * 0.04
      data[i] = last * 2.6
    }
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 420
    filter.Q.value = 0.8
    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.028
    noise.connect(filter)
    filter.connect(noiseGain)
    noiseGain.connect(master)
    noise.start()
    this.noiseFilter = filter
    this.noiseGain = noiseGain

    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.07
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.035
    lfo.connect(lfoGain)
    lfoGain.connect(humGain.gain)
    lfo.start()
    this.lfo = lfo
    this.lfoGain = lfoGain

    master.gain.setTargetAtTime(0.16, ctx.currentTime, 1.4)
    this.running = true
    this.setDistrict(district)

    this.pingTimer = window.setInterval(() => this.ping(), 7600)
  }

  stop() {
    this.running = false
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer)
      this.pingTimer = null
    }
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.25)
    this.stopTimer = window.setTimeout(() => {
      try {
        this.hum?.stop()
        this.lfo?.stop()
        void ctx.close()
      } catch {
        /* already closed */
      }
      this.ctx = null
      this.master = null
      this.hum = null
      this.humGain = null
      this.noiseFilter = null
      this.noiseGain = null
      this.lfo = null
      this.lfoGain = null
      this.stopTimer = null
    }, 700)
  }

  setDistrict(id: DistrictId) {
    if (!this.ctx || !this.hum || !this.noiseFilter || !this.noiseGain || !this.lfo) return
    const tone = TONES[id] ?? TONES.central
    const t = this.ctx.currentTime
    this.hum.frequency.setTargetAtTime(tone.hum, t, 0.8)
    this.noiseFilter.frequency.setTargetAtTime(tone.filter, t, 0.9)
    this.noiseGain.gain.setTargetAtTime(tone.noise, t, 0.9)
    this.lfo.frequency.setTargetAtTime(tone.pulse, t, 0.8)
  }

  setIntensity(value: number) {
    if (!this.ctx || !this.master) return
    this.master.gain.setTargetAtTime(Math.max(0, Math.min(0.4, value)), this.ctx.currentTime, 0.5)
  }

  private ping() {
    if (!this.ctx || !this.master || !this.running) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    const base = 520 + Math.random() * 620
    osc.frequency.setValueAtTime(base, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(base * 0.55, ctx.currentTime + 0.9)
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.018, ctx.currentTime + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start()
    osc.stop(ctx.currentTime + 1.5)
  }
}

export const ambient = new AmbientAudio()
