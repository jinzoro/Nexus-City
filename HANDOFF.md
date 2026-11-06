# NEXUS — Underground Megapolis

A full-screen, browser-based pixel-art cyberpunk city where the city itself is the
interface. No landing page, no cards, no scrolling document: you arrive inside a
sealed artificial cavern and explore a living isometric metropolis.

- **Stack:** React 19 + TypeScript + Vite + Zustand
- **Renderer:** hand-written Canvas 2D isometric engine (no PixiJS/WebGL)
- **Backend:** none. Everything is generated and simulated client-side.
- **Determinism:** seeded procedural generation, so a build always produces the same city.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:4173 (fixed in vite.config.ts)
npm run build      # tsc -b && vite build
npm run preview    # serve the production build
```

On this Windows machine Node was not on `PATH`; use:

```powershell
$env:PATH = "$env:LOCALAPPDATA\nodejs;$env:PATH"
npm.cmd run dev
```

The app is a single full-screen canvas plus absolutely positioned HUD layers.
It targets desktop first but is responsive down to 320 px wide.

---

## What the user experiences

1. **Intro** — boot sequence over the city, then `ENTER CITY`.
2. **City overview** — thousands of lit towers, elevated rail, traffic, drones,
   airships, neon signs and holograms inside a colossal cavern.
3. **Zoom levels** — overview → district → street → building. Detail streams in
   via LOD thresholds; static layers are cached and reused.
4. **Interaction** — hover highlights a building and shows a card; click opens
   the node panel; double-click focuses it; the bottom terminal opens panels.
5. **Living systems** — clock, weather, rolling events, ambient audio, live
   power/network/stability stats.
6. **Facility view** — entering a selected building opens an interior pixel view
   with its own controls.

---

## Controls

| Input | Action |
| --- | --- |
| Drag | Pan |
| Scroll / pinch | Zoom |
| `Ctrl/⌘ + K` or `/` | Search palette |
| `M` `S` `T` `Y` `N` `P` | Map / Sectors / Transit / Systems / Messages / Profile |
| `O` | City overview |
| `0` | Reset view |
| `+` / `-` | Zoom in / out |
| `Esc` | Close search → facility → panel → selection |
| Click building | Open node panel |
| Double-click building | Focus building |

Touch: one-finger pan, two-finger pinch zoom. Mobile uses a bottom sheet for the
node panel and keeps all six nav tabs visible at 320 px.

---

## Project structure

```
index.html
public/
  fonts/                     Silkscreen + VT323 (local, no CDN)
src/
  main.tsx                   React root
  App.tsx                    App shell, engine lifecycle, clock, events, keyboard
  styles.css                 Full pixel-art design system and HUD layout
  types.ts                   Domain types (Building, CityData, events, entities…)
  audio/
    ambient.ts               Procedural Web Audio ambience, off by default
  data/
    city.ts                  World constants, palettes, districts, generation
    personality.ts           Facade/crown/storefront/quirk tables
    events.ts                Event templates and random event factory
  engine/
    CityEngine.ts            Camera, input, loop, static caching, hit-testing
    renderUtils.ts           Projection, colour helpers, bounds, noise/hash
    groundRenderer.ts        Ground, roads, parks, water, cavern floor, foreground
    buildingRenderer.ts      Buildings, facades, crowns, storefronts, props, rails
    dynamicRenderer.ts       Vehicles, pedestrians, trains, aircraft, drones,
                             emitters, billboards, holograms, overlays, weather
    spriteFactory.ts         Cached pixel pedestrian sprites
    pixelFont.ts             Procedural 5×7 pixel font for in-world signage
  state/
    useCityStore.ts          Zustand UI/app state, lookups, notifications
  components/
    TopBar, BottomNav, SideControls, EventFeed, HoverTooltip,
    SelectionPanel, SearchPalette, Minimap, Intro, ToastStack, FacilityView,
    ui.tsx, Icons.tsx
    panels/                  Map, Sectors, Transit, Systems, Messages, Profile
```

---

## Rendering pipeline

Everything is drawn into one internal-resolution canvas that is upscaled with
`image-rendering: pixelated`.

### Camera and projection

`renderUtils.ts` defines a 2:1 isometric projection:

```
screenX = (x - y) * (TILE_W / 2) * zoom + cameraX
screenY = (x + y) * (TILE_H / 2) * zoom - z * zoom + cameraY
```

- `TILE_W = 24`, `TILE_H = 12`
- world grid: `198 × 198`, 18 × 18 blocks, `BLOCK_SIZE = 11`, `ROAD_SIZE = 2`
- default camera: central Nexus `(99, 99)`, zoom `0.5`
- overview zoom `0.16`; range `0.135 – 2.65`

Internal resolution is reduced on purpose (desktop ≈ `1 / 1.7` CSS pixels,
mobile ≈ `1 / 1.2`). This keeps the look chunky and the fill cost low.

### Static layer caching

The city is split into three cached canvases:

1. **Ground layer** — cavern floor, roads, markings, parks, water, districts.
2. **City layer** — every building, prop and rail deck.
3. **Foreground / ceiling layer** — stalactites, haze, vignette-ish framing.

`CityEngine.renderStaticLayers()` rebuilds these only when the camera moves far
enough or zoom crosses a bucket. Dynamic entities are drawn between ground and
city layers, so vehicles and NPCs are correctly occluded by buildings:

```
ground → vehicles → pedestrians → city → trains/aircraft/drones/emitters
→ billboards/holograms → overlays → selection → foreground → weather
```

### Level of detail

Thresholds in `drawBuilding`:

| zoom | LOD | What is drawn |
| --- | --- | --- |
| `< 0.24` | 0 | silhouette + sparse windows |
| `< 0.55` | 1 | windows, roofs, major crowns |
| `< 1.05` | 2 | facade patterns, storefronts, facade details |
| `≥ 1.05` | 3 | full detail: interior window lights, mullions, clutter |

Culling uses projected building bounds (`getBuildingBounds`,
`isBoundsVisible`). Pedestrians are skipped below zoom `0.4`; vehicles are
reduced to single pixels below zoom `0.3`; trains and props have their own
distance checks.

---

## City generation

`generateCity()` in `data/city.ts` builds, from a fixed seed:

- 9 districts arranged radially around **Central Nexus**:
  central, corporate, market, industrial, residential, tech, entertainment,
  bio, transit.
- 2,545 buildings on a 3 × 3-per-block lattice, plus hand-placed landmarks
  (spire, twin towers, transit station, market, foundry, dome, arena, data
  center, greenhouse, hab-block).
- 888 props, roads and elevated rail loops, parks, plazas, lakes, farms, yards.
- 7,200 pedestrians, 520 vehicles, 10 trains on 5 rail lines, aircraft, drones,
  emitters, billboards and holograms.
- District-weighted colour palettes, names, owners, descriptions and stats.

The default seed is `720412` (`generateCity(seed = 720412)`).

All random choices flow through `mulberry32` seeded RNG plus a stable `hash2`
for per-element variation. Keep this discipline when adding features: never
call `Math.random()` during generation if you want reproducible cities.

### World constants

| Constant | Value |
| --- | --- |
| `WORLD_SIZE` | 198 |
| `BLOCK_COUNT` | 18 |
| `BLOCK_SIZE` | 11 |
| `ROAD_SIZE` | 2 |
| `TILE_W` / `TILE_H` | 24 / 12 |

---

## Building personality system

Every `Building` carries:

```ts
facade: FacadePattern   // plain, ribbon, glass, balcony, louver, fins,
                        // checker, diagrid, capsule, mosaic
crown: CrownKind        // none, antenna, dishes, tank, garden, sign,
                        // vents, helipad, solar, beacon
street: StorefrontKind  // none, shop, cafe, garage, lobby, dock, arcade, alley
age: number             // 0..1, drives grime and weathering
quirk: string           // one human detail shown in the node panel
```

`data/personality.ts` holds:

- label maps used by the UI (`FACADE_LABELS`, `CROWN_LABELS`, `STREET_LABELS`)
- district-weighted pick tables for facades, crowns and storefronts
- six quirks per district
- hand-authored personalities for named landmarks

`data/city.ts` additionally applies a per-building body tint (±16–30%), window
warm/cool variation, occasional neon/accent swaps, and assigns the above fields.

### Renderer integration

- `drawWindows()` implements all ten facade patterns, including ribbon/glass
  bands, glass mullions, checker occupancy and clustered “party floors”.
- `drawFacadeDetails()` adds balconies, fins, diagrid braces, louvers, market
  awnings, industrial pipework, gardens, grime streaks and elevator shafts.
- `drawStorefront()` builds 1–4 street-level units with lit interiors, awnings,
  shutters, garage slats, lobby canopies, loading docks and alley clutter.
- `drawRoofDetails()` implements every crown type plus lived-in roof clutter.
- `drawTower()` uses 2–3 variable setbacks per building, so identical heights
  still read as different architecture.
- `drawBlock()` adds a rooftop setback shack and water tank.

Personality data is also shown in `SelectionPanel.tsx` as facade/roof/street/age
chips plus a “LOCAL LEGEND” quirk paragraph.

---

## Pedestrians and vehicles

### Pedestrians (`engine/spriteFactory.ts`)

Pedestrians are no longer rectangles. Each NPC resolves to one of six roles:

`hood`, `coat`, `suit`, `worker`, `punk`, `kid`

Sprites are generated once per `(variant, frame, scale)` and cached:

- 5 × 8 sprite at zoom `< 1.15`
- 9 × 14 sprite at zoom `≥ 1.15` (face, arms, hi-vis stripe, bag, etc.)
- 4-frame walk cycle driven by `time` and each NPC’s speed/phase
- horizontal mirroring based on world axis + direction
- umbrella canopy during rain events
- ground shadow under each NPC

`drawPedestrians()` only iterates visible NPCs (projected point culling).

### Vehicles (`drawVehicles` in `dynamicRenderer.ts`)

Each vehicle is drawn as a small isometric box, not a flat quad:

- chassis side faces + front face, top deck, inset cabin and roof
- wheels at four corners
- windshield and side glass
- headlights / tail lights, taxi roof sign, bus window rows and number board
- truck cargo box with ribs and separate cab
- bike variant with two wheels and a rider
- underglow and a headlight cone at close zoom
- single-pixel representation below zoom `0.3`

---

## HUD and panels

`App.tsx` renders the canvas and a pointer-events-none HUD containing:

- **TopBar** — city name, population, grid/network/stability stats.
- **Top-right sector card** — sector code, district, time, weather temperature.
- **SideControls** — zoom, reset, overview, layer cycle, search.
- **EventFeed** — live events with severity and timestamps.
- **Minimap** — clickable city grid, district colouring, camera frustum.
- **Coord rail** — camera position, cell, zoom level, FPS.
- **BottomNav** — MAP / SECTORS / TRANSIT / SYSTEMS / MESSAGES / PROFILE.
- **SelectionPanel** — node preview, telemetry meters, record grid, owner,
  description, personality chips, quirk, actions.
- **SearchPalette** — fuzzy search over building names/types/districts.
- **FacilityView** — interior view for a selected building.
- **ToastStack** — transient notifications.

Panels use the shared `panels/PanelShell.tsx`; the six terminal screens live in
`components/panels/`.

State is centralized in `state/useCityStore.ts` (Zustand): selected/hovered
building, active panel, search, facility, camera info, events/logs, weather,
stats, clock, audio, overlays, discovery/tracking, FPS, and O(1) lookup maps.

When a selection is open the app gets `.app--selection`, which shifts side
controls and minimap left on desktop; on mobile the panel becomes a bottom
sheet. Full-screen terminal panels get `.app--panel`, which hides the toast
stack behind them.

---

## Visual design system

`styles.css` is the single source of truth:

- near-black blue backgrounds, cyan/magenta accents
- pixel borders, corner notches, scanlines, slight glitch animation
- Silkscreen for labels/HUD, VT323 for body copy
- all fonts served locally from `public/fonts`
- responsive breakpoints for desktop, tablet, 390 px and 320 px

Do not introduce white cards, soft SaaS shadows or generic rounded panels —
the whole point is that the city and terminal share one visual language.

---

## Performance notes

- Static layers are cached and only rebuilt when the camera warrants it.
- LOD keeps facade/crown/storefront detail at zoom 1+.
- Pedestrian sprites are cached canvases, not per-frame vector drawing.
- Every dynamic system culls by projected position before drawing.
- The renderer intentionally runs at reduced internal resolution and upscales.
- Typical observed rates on this machine: ~50–60 FPS at street zoom, higher at
  overview. The HUD shows live FPS and zoom percentage.

If you need more headroom, the cheapest wins are:

1. Raise the static-layer rebuild tolerance.
2. Gate `drawStorefront` behind zoom `> 0.75`.
3. Reduce `drawFacadeDetails` at LOD 2.
4. Pool or chunk pedestrian iteration by block.
5. Add an offscreen entity layer that only redraws dirty regions.

---

## Events and audio

- `data/events.ts` defines event templates: power outage, network spike,
  transit delay, rain, festival, construction, market surge, weather shift.
- `App.tsx` spawns one after ~11 s and then every ~27 s, updates weather,
  logs resolution, and resets the weather when no weather event remains.
- `audio/ambient.ts` builds a procedural Web Audio bed (hum, filtered noise,
  district-dependent tone). It is off by default and starts only on user action.

---

## Extension points

Good places to build next:

- **Backend / persistence** — replace `generateCity()` with fetched city data;
  the renderer only needs the `CityData` shape.
- **Multiplayer presence** — sync camera and selected nodes over WebSocket.
- **More building styles** — add to `BuildingStyle`, `drawBuilding` switch and
  the personality tables.
- **Deeper interiors** — `FacilityView` is a separate canvas; add floor plans,
  NPCs and interactions there.
- **District-specific rules** — weather, traffic density, event weights and
  audio already key off district; extend them in `data/city.ts` / `events.ts`.
- **Search indexing** — add aliases, tags and owner names in `SearchPalette`.
- **Save state** — tracked nodes and discovered locations are already in the
  store; persist those keys rather than the whole city.

### Gotchas

- `project()` returns internal canvas pixels, not CSS pixels. A 50-unit
  building is `50 * zoom` pixels tall.
- Do not call `Math.random()` in generation paths if reproducibility matters.
- Static layers must be invalidated when weather/event effects change the
  scene, or the cached layer will lag behind.
- The intro button is briefly disabled during mount; tests that click it
  immediately should retry after a snapshot.
- The canvas listens to pointer/wheel events directly; HUD elements need
  `pointer-events: auto` to remain clickable.

---

## Status

The current build compiles cleanly (`npm run build`) and has been verified in
browser for intro, zoom/pan, hover, selection, search, all six panels, facility
view, minimap, events, overlays, audio and keyboard shortcuts. The personality
pass adds per-building facades/crowns/storefronts/quirks, richer props, readable
pedestrian sprites and detailed isometric vehicles.
