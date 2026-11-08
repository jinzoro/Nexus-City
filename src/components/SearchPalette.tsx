import { useEffect, useMemo, useRef, useState } from 'react'
import type { Building, CityEvent, District } from '../types'
import { getDistrict, TILE_H, TILE_W } from '../data/city'
import { useCityStore } from '../state/useCityStore'
import { formatNumber } from './ui'
import { Icon, type IconName } from './Icons'

type Result =
  | { kind: 'building'; building: Building }
  | { kind: 'district'; district: District }
  | { kind: 'command'; command: Command }

interface Command {
  id: string
  label: string
  detail: string
  icon: IconName
  color: string
  run: () => void
}

export function SearchPalette() {
  const open = useCityStore((s) => s.searchOpen)
  const setSearchOpen = useCityStore((s) => s.setSearchOpen)
  const setPanel = useCityStore((s) => s.setPanel)
  const engine = useCityStore((s) => s.engine)
  const city = useCityStore((s) => s.city)
  const camera = useCityStore((s) => s.camera)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      window.setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const commands = useMemo<Command[]>(() => {
    const state = useCityStore.getState()
    const cellX = camera.x / TILE_W + camera.y / TILE_H
    const cellY = camera.y / TILE_H - camera.x / TILE_W
    return [
      {
        id: 'cmd-overview',
        label: 'CITY OVERVIEW',
        detail: 'Pull the camera back to the full cavern',
        icon: 'overview',
        color: '#22e6ff',
        run: () => {
          engine?.overview()
          setPanel(null)
        },
      },
      {
        id: 'cmd-photo',
        label: state.photoMode ? 'EXIT PHOTO MODE' : 'ENTER PHOTO MODE',
        detail: 'Hide the HUD, export frames, save vantage points',
        icon: 'scan',
        color: '#ff4fa3',
        run: () => state.togglePhotoMode(),
      },
      {
        id: 'cmd-scan',
        label: state.scanMode ? 'DISENGAGE SCAN' : 'ENGAGE SCAN',
        detail: 'Outline structures and district concentrations',
        icon: 'target',
        color: '#63ff9b',
        run: () => state.toggleScanMode(),
      },
      {
        id: 'cmd-audio',
        label: state.audioEnabled ? 'MUTE CITY FEED' : 'ENABLE CITY FEED',
        detail: 'Procedural ambient audio tuned to the current district',
        icon: state.audioEnabled ? 'audio' : 'audio-off',
        color: '#ffb347',
        run: () => void state.toggleAudio(),
      },
      {
        id: 'cmd-vantage',
        label: 'SAVE VANTAGE POINT',
        detail: `Pin ${Math.round(cellX)}:${Math.round(cellY)} at ${Math.round(camera.zoom * 100)}% zoom`,
        icon: 'track',
        color: '#8ff8ff',
        run: () => {
          state.addBookmark({
            name: `${getDistrict(camera.district).code} / ${Math.round(cellX)}:${Math.round(cellY)}`,
            x: cellX,
            y: cellY,
            zoom: camera.zoom,
            district: camera.district,
          })
        },
      },
      {
        id: 'cmd-lucky',
        label: 'RANDOM LANDMARK',
        detail: 'Jump to a landmark you may not have discovered',
        icon: 'locate',
        color: '#ff4fa3',
        run: () => {
          if (!city) return
          const unknown = city.landmarks.filter((b) => !state.discovered.includes(b.id))
          const pool = unknown.length ? unknown : city.landmarks
          const pick = pool[Math.floor(Math.random() * pool.length)]
          state.setSelected(pick)
          engine?.focusBuilding(pick, 1.15)
        },
      },
      {
        id: 'cmd-map',
        label: 'OPEN CITY MAP',
        detail: 'Cartography layer with sectors and overlays',
        icon: 'map',
        color: '#22e6ff',
        run: () => setPanel('map'),
      },
      {
        id: 'cmd-civic',
        label: 'CIVIC ACTIONS',
        detail: 'Player-triggered events: blackout, festival, condensers, transit',
        icon: 'warning',
        color: '#ff4fa3',
        run: () => setPanel('messages'),
      },
      ...([
        ['power', 'TRIGGER BLACKOUT', 'Pull the grid under the current sector', '#ffd45c'],
        ['festival', 'THROW NEON FESTIVAL', 'Start a holo-parade in the current sector', '#ff4fa3'],
        ['rain', 'CONDENSER TEST', 'Vent acid drizzle over the current sector', '#8ff8ff'],
        ['transit', 'HOLD TRANSIT', 'Stop maglev cars on the spine', '#ffb347'],
        ['network', 'STRESS THE MESH', 'Flood the civic mesh with noise', '#22e6ff'],
        ['weather', 'SHIFT ATMOSPHERE', 'Cycle the filters, particulate haze citywide', '#63ff9b'],
      ] as const).map(([type, label, detail, color]) => ({
        id: `cmd-event-${type}`,
        label,
        detail,
        icon: 'target' as const,
        color,
        run: () => {
          const state = useCityStore.getState()
          state.triggerEvent(type as CityEvent['type'], state.camera.district)
          setPanel(null)
        },
      })),
      {
        id: 'cmd-systems',
        label: 'OPEN SYSTEMS',
        detail: 'Render quality, layers, audio and event bus',
        icon: 'systems',
        color: '#ffb347',
        run: () => setPanel('systems'),
      },
      {
        id: 'cmd-help',
        label: 'ORIENTATION',
        detail: 'Reopen the controls and interaction guide',
        icon: 'info',
        color: '#8ff8ff',
        run: () => state.setHelpOpen(true),
      },
    ]
  }, [camera, city, engine, setPanel])

  const results = useMemo<Result[]>(() => {
    if (!city) return []
    const raw = query.trim()
    const commandOnly = raw.startsWith('>')
    const q = (commandOnly ? raw.slice(1) : raw).trim().toLowerCase()
    const commandMatches = commands
      .filter((c) => (q ? `${c.label} ${c.detail}`.toLowerCase().includes(q) : true))
      .map((command) => ({ kind: 'command' as const, command }))

    if (commandOnly) return commandMatches.slice(0, 12)
    if (!q) {
      return [
        ...commandMatches.slice(0, 4),
        ...city.landmarks.slice(0, 6).map((building) => ({ kind: 'building' as const, building })),
        ...city.districts.slice(0, 4).map((district) => ({ kind: 'district' as const, district })),
      ]
    }

    const districtMatches = city.districts
      .filter((d) => `${d.name} ${d.code} ${d.tagline} ${d.id}`.toLowerCase().includes(q))
      .map((district) => ({ kind: 'district' as const, district }))
    const buildingMatches: Result[] = []
    for (const building of city.buildings) {
      if (buildingMatches.length >= 12) break
      const haystack = `${building.name} ${building.type} ${building.district} ${building.owner} ${building.status}`.toLowerCase()
      if (haystack.includes(q)) buildingMatches.push({ kind: 'building', building })
    }
    return [...commandMatches.slice(0, 4), ...districtMatches, ...buildingMatches].slice(0, 16)
  }, [city, query, commands])

  useEffect(() => {
    if (active >= results.length) setActive(0)
  }, [results.length, active])

  if (!open || !city) return null

  const choose = (result: Result) => {
    if (result.kind === 'building') {
      engine?.focusBuilding(result.building, Math.max(1.25, 1.3))
      setPanel(null)
    } else if (result.kind === 'district') {
      engine?.focusDistrict(result.district.id, 0.95)
    } else {
      result.command.run()
    }
    setSearchOpen(false)
  }

  return (
    <div className="search-layer" onMouseDown={(e) => { if (e.target === e.currentTarget) setSearchOpen(false) }}>
      <div className="search-panel">
        <div className="search-panel__head">
          <Icon name="search" size={18} />
          <span>CITY INDEX</span>
          <span className="search-panel__count">{city.buildings.length.toLocaleString('en-US')} NODES</span>
          <button className="icon-btn icon-btn--small" onClick={() => setSearchOpen(false)}>
            <Icon name="close" size={14} />
          </button>
        </div>
        <div className="search-panel__input">
          <span className="search-panel__prompt">&gt;</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => (a + 1) % Math.max(1, results.length))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => (a - 1 + results.length) % Math.max(1, results.length))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                const result = results[active]
                if (result) choose(result)
              } else if (e.key === 'Escape') {
                setSearchOpen(false)
              }
            }}
            placeholder="SEARCH NODES, SECTORS, OWNERS OR TYPE > FOR ACTIONS..."
            spellCheck={false}
            autoComplete="off"
          />
          <span className="search-panel__blink" />
        </div>
        <div className="search-panel__results">
          {results.length === 0 ? (
            <div className="search-panel__empty">
              <Icon name="info" size={15} />
              <span>NO MATCHING RECORDS IN THE CIVIC INDEX</span>
            </div>
          ) : (
            results.map((result, index) => {
              if (result.kind === 'command') {
                const c = result.command
                return (
                  <button
                    key={c.id}
                    className={`search-row search-row--command ${index === active ? 'search-row--active' : ''}`}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(result)}
                  >
                    <span className="search-row__command-icon" style={{ color: c.color, borderColor: `${c.color}44` }}>
                      <Icon name={c.icon} size={14} />
                    </span>
                    <span className="search-row__main">
                      <strong>{c.label}</strong>
                      <small>{c.detail}</small>
                    </span>
                    <span className="search-row__meta" style={{ color: c.color }}>ACTION</span>
                  </button>
                )
              }
              if (result.kind === 'district') {
                const d = result.district
                return (
                  <button
                    key={`d-${d.id}`}
                    className={`search-row ${index === active ? 'search-row--active' : ''}`}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(result)}
                  >
                    <span className="search-row__swatch" style={{ background: d.color, boxShadow: `0 0 7px ${d.color}` }} />
                    <span className="search-row__main">
                      <strong>{d.name}</strong>
                      <small>{d.tagline}</small>
                    </span>
                    <span className="search-row__code" style={{ color: d.color }}>{d.code}</span>
                    <span className="search-row__meta">SECTOR · {formatNumber(d.population)}</span>
                  </button>
                )
              }
              const b = result.building
              const d = getDistrict(b.district)
              return (
                <button
                  key={`b-${b.id}`}
                  className={`search-row ${index === active ? 'search-row--active' : ''}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(result)}
                >
                  <span className="search-row__swatch" style={{ background: d.color, boxShadow: `0 0 7px ${d.color}` }} />
                  <span className="search-row__main">
                    <strong>{b.name}</strong>
                    <small>{b.type} · {b.owner}</small>
                  </span>
                  <span className="search-row__code" style={{ color: d.color }}>{d.code}</span>
                  <span className="search-row__meta">{b.h}M · {b.status}</span>
                </button>
              )
            })
          )}
        </div>
        <div className="search-panel__footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> NAVIGATE</span>
          <span><kbd>ENTER</kbd> ACCESS</span>
          <span><kbd>&gt;</kbd> ACTIONS</span>
          <span><kbd>ESC</kbd> CLOSE</span>
          <span className="search-panel__hint">INDEX UPDATED LIVE</span>
        </div>
      </div>
    </div>
  )
}
