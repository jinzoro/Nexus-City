# NEXUS — Underground Megapolis

A full-screen, browser-based pixel-art cyberpunk city where the city itself is the
interface. No landing page, no cards, no scrolling document: you arrive inside a
sealed artificial cavern and explore a living isometric metropolis with a day/night
cycle, player-triggered civic events and city goals. The cavern seed is locked
in code (`CITY_SEED_DEFAULT`).

- **Stack:** React 19 + TypeScript + Vite + Zustand
- **Renderer:** hand-written Canvas 2D isometric engine (no PixiJS/WebGL)
- **Backend:** none. Everything is generated and simulated client-side.
- **Determinism:** seeded procedural generation, default `seed 720412`, so a build
  always produces the same city. Any other seed compiles a different cavern.

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

1. **Intro** — boot sequence over the city. While `generateCity()` compiles, the
   button reads COMPILING… and is disabled; it unlocks the moment the city data
   is ready ("COMPILING CAVERN TOPOLOGY — SEED LOCK" status line).
2. **City overview** — thousands of lit towers, elevated rail, traffic, drones,
   airships, neon signs and holograms inside a colossal cavern. Sky tint and
   window fire follow the real wall clock (deep-night indigo → noon haze).
3. **Zoom levels** — overview → district → street → building. Detail streams in
   via LOD thresholds; static layers are cached and reused.
4. **Interaction** — hover highlights a building and shows a card; click opens
   the node panel; double-click focuses it; clicking a citizen, vehicle or
   train opens a signal card the camera can follow; the bottom terminal opens
   panels. Photo mode (`F`) strips the HUD for clean captures; structural scan
   (`V`) rewires the overlay.
5. **Living systems** — clock + day/night sky, weather, rolling events, player
   civic actions, goals, news wire, ambient audio, live power/network/stability
   stats, faction standing, codex lore.
6. **Facility view** — entering a selected building opens an interior pixel view
   with its own controls.
7. **Touch devices** — after the intro, a PINCH/DRAG hint floats above the nav;
   it auto-dismisses and taps away.

---

## Controls

| Input | Action |
| --- | --- |
| Drag | Pan |
| Scroll / pinch | Zoom |
| `Ctrl/⌘ + K` or `/` | Search palette and `>` commands |
| `M` `S` `T` `Y` `N` `P` | Map / Sectors / Transit / Systems / Messages / Profile |
| `O` | City overview |
| `0` | Reset view |
| `+` / `-` | Zoom in / out |
| `F` | Photo mode (hide HUD, export PNG, save vantage) |
| `V` | Structural scan overlay |
| `B` | Book current camera position as a vantage |
| `?` | Onboarding / orientation overlay |
| `Esc` | Close search → facility → panel → selection → entity |
| Click building | Open node panel |
| Double-click building | Focus building |
| Click citizen / vehicle / train | Citizens' Signal card (follow / re-center) |
| MESSAGES > CIVIC ACTIONS button | Arm (click 1) → fire event (click 2); mouse-leave disarms |

Search palette commands also fire civic actions: `> blackout`, `> festival`,
`> rain`, `> transit hold`, `> mesh stress`, `> haze vent`. The city seed is
locked to the code constant `CITY_SEED_DEFAULT` — no runtime picker.

Touch: one-finger pan, two-finger pinch zoom. Mobile uses a bottom sheet for the
node panel and keeps all six nav tabs visible at 320 px. A transient hint
overlay tells coarse-pointer users to pinch/drag (auto-dismiss ~7.6 s).

---

## Project structure

```
index.html
public/
  fonts/                     Silkscreen + VT323 (local, no CDN)
  og-image.png               generated 1200×630 social image
  icon-512.png, icon-192.png generated PWA icons
  manifest.webmanifest       fullscreen PWA manifest
src/
  main.tsx                   React root + dev-only window.__nexus hook
  App.tsx                    App shell, engine lifecycle, seed boot, clock,
                             events, keyboard
  styles.css                 Full pixel-art design system and HUD layout
  types.ts                   Domain types (Building, CityData, TrainStation,
                             Goal, events, entities…)
  audio/
    ambient.ts               Procedural Web Audio ambience, off by default
  data/
    city.ts                  World constants, palettes, districts, rail lines,
                             train stations, generation
    personality.ts           Facade/crown/storefront/quirk tables
    events.ts                Event templates + createEventForType factory
    world.ts                 Factions, GOALS, codex entries, news, entity
                             profiles, default bookmarks
  engine/
    CityEngine.ts            Camera, input, loop, static caching, hit-testing,
                             entity selection/follow, photo/scan/quality,
                             visibility pause, FPS watchdog, train dwell
    renderUtils.ts           Projection, colour helpers, View
                             (daylight/weather/district), bounds, noise/hash
    groundRenderer.ts        Ground, roads, parks, water, cavern floor, foreground
    buildingRenderer.ts      Buildings, facades, crowns, storefronts, props,
                             rails, night window glow
    dynamicRenderer.ts       Vehicles, pedestrians, trains, aircraft, drones,
                             emitters, billboards, holograms, overlays, weather,
                             day/night + district tints, station crowds
    spriteFactory.ts         Cached pixel pedestrian sprites
    pixelFont.ts             Procedural 5×7 pixel font for in-world signage
  state/
    useCityStore.ts          Zustand UI/app state, lookups, seeds, civic events,
                             goals, notifications, persistence
  components/
    TopBar, BottomNav, SideControls, EventFeed, HoverTooltip,
    SelectionPanel, SearchPalette, Minimap, Intro, ToastStack, FacilityView,
    EntityCard, PhotoModeBar, NewsTicker, Onboarding, MobileHint, ui.tsx,
    Icons.tsx
    panels/                  Map, Sectors, Transit, Systems, Messages, Profile
scripts/
  gen-assets.mjs             Dependency-free generator for og-image.png and the
                             PWA icons (pure Node, hand-rolled PNG encoder)
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

`generateCity(seed = CITY_SEED_DEFAULT)` in `data/city.ts` builds, from a seed:

- 9 districts arranged radially around **Central Nexus**:
  central, corporate, market, industrial, residential, tech, entertainment,
  bio, transit.
- 2,545 buildings on a 3 × 3-per-block lattice, plus hand-placed landmarks
  (spire, twin towers, transit station, market, foundry, dome, arena, data
  center, greenhouse, hab-block).
- 888 props, roads and elevated rail loops, parks, plazas, lakes, farms, yards.
- 7,200 pedestrians, 520 vehicles, 10 trains on 5 rail lines, aircraft, drones,
  emitters, billboards and holograms.
- **9 train stations** — 3 evenly spaced halts on each of the 3 non-highway
  lines (`maglev-cyan`, `maglev-magenta`, `metro-amber`) at
  `line.from + span·(i + 0.5)/3`, named from a seeded name wheel and coloured
  by their line. Stations are seed-independent grid coordinates, so debugging
  by cell math is stable across seeds (e.g. maglev-magenta is always `x=154`).
- District-weighted colour palettes, names, owners, descriptions and stats.

The default seed is `720412` (`CITY_SEED_DEFAULT` in `src/data/city.ts`). Per owner
decision there is **no runtime seed picker**: the seed is part of the codebase.
To ship a different cavern, change the constant and redeploy; the App boot
always calls `generateCity(CITY_SEED_DEFAULT)` after the intro delay. The store
no longer carries `seed`/`reseed`, and persisted progress is scrubbed of the
seed key on first write.

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

## Deep systems (latest batch)

### Entity selection and follow camera

- `CityEngine` keeps `pedMap` / `vehicleMap` / `trainMap` for O(1) entity
  lookups; clicks hit-test entities **before** buildings, so moving things win.
- Double-clicking an entity both selects and follows it.
- `SelectedEntity` profiles come from `data/world.ts` (`pedestrianEntity`,
  `vehicleEntity`, `trainEntity`) with names, roles and one-line detail.
- Selecting an entity sets `.app--entity`, which shifts side controls, minimap
  and toasts left of the entity card (desktop) or docks the card above the nav
  as a bottom sheet (mobile).
- FOLLOW engages a follow target; the camera eases to the entity each frame and
  zooms to at least `1.15` if the camera was further out. Any manual pan calls
  `breakFollow()` and resets the card button to RELEASE TRACK.

### Photo mode, scan mode, quality profiles

- **Photo mode (`F`)** sets `.app--photo`: HUD, panels, facility view, toasts
  and the news ticker fade out; a photo bar offers SCAN toggle, SAVE VANTAGE,
  COPY LINK, EXPORT PNG (via `engine.captureFrame()`), EXIT. The camera hash
  becomes `#cell=…` so the exact framing is shareable.
- **Scan mode (`V`)** adds `drawScanOverlay` (sweep, wireframe reads); it works
  standalone and inside photo mode.
- **Quality profiles** (`auto|high|balanced|performance`) re-scale the internal
  canvas resolution; AUTO picks from device memory/screen. Selectable in
  SYSTEMS; persisted.

### Vantages, deep links, persistence

- **Vantages (`B` or SelectionPanel action)** store `{x, y, zoom, district}` in
  the store; the MAP panel lists them ("SAVED VANTAGES") with jump/remove.
- **Deep links:** `#node=<id>` (node record), `#cell=<x>,<y>,<zoom>` (camera,
  used by photo mode), `#view=overview`. Parsed on boot, maintained with
  `history.replaceState`.
- **Persistence** (`nexus-city-progress-v1`): discovered/visited sites,
  tracked nodes, bookmarks, quality, onboarding done, faction reputation and
  codex findings survive reloads.

### Factions, codex, news wire

- Six factions with standing 0–100 shown in PROFILE (data in `world.ts`).
  Answering dispatches in MESSAGES (`CIV/KUR/GLD/VRD` buttons) transmits a
  message, bumps standing and logs.
- **Codex**: 34 lore entries; visiting landmark buildings/events discovers
  them (`discoverCodex`), card list in PROFILE with unknown entries masked.
- **News ticker** (bottom-left): generated headlines from factions, events and
  city stats; click opens MESSAGES. Hidden while a panel/selection is open.

### Onboarding

First visit auto-opens the orientation overlay (read the city / open anything /
follow the small lives / capture & scan + key list). Also reachable via `?`,
the side-controls info button, and re-opened by clearing `onboardingDone` in
the persisted progress.

---

## Underground life batch (day/night, seeds, civic actions, stations)

### Day/night cycle driven by the wall clock

- `renderUtils.daylightForClock(date)` maps today's clock onto a 0–1 daylight
  scalar: trough `0.12` at 01:00, peak `1.0` at 13:00 (smooth cosine ramp).
- `App.tsx` subscribes to the store clock and calls
  `engine.setEnvironment({ daylight })` every second. `phaseLabel()` names the
  phase (DEEP NIGHT / DAWN / DAY / DUSK / …) for the coord rail **CYCLE** row.
- `dynamicRenderer.drawDayNight(ctx, view)` re-grays and re-blooms the composite
  frame by daylight: a multiply-indigo wash deepens at night, a warm dusk pass
  (`lighter`) fires around dawn/dusk, and overall neon glow is boosted when
  `daylight < 0.5`.
- `drawWindows()` takes `night` and biases lit windows
  (`litThreshold = base - night·0.22`), so buildings visibly switch their
  lights on after dark.
- Because the static layers bake window/roof colours, the engine compares the
  new daylight to the last-rendered one and marks itself dirty when the delta
  exceeds `0.02` → static layers rebuild. View sync happens **before**
  `renderStaticLayers()` in the tick (order matters for glow rebuilds).
- Debugging: `engine.setEnvironment({ daylight: 0.06 })` forces deep night.

### Weather as a renderer state + district atmosphere

- `types.ViewWeather = 'clear' | 'rain' | 'haze' | 'festival'`.
- `useCityStore.weatherKindFor(eventType)` maps event → presentation
  (rain → rain, weather → haze, festival → festival, else clear), and
  `App.weatherKindForState(label)` keeps the engine in sync whenever the
  top-level weather label changes.
- `dynamicRenderer.drawDistrictAtmosphere(ctx, view)` paints per-camera-district
  and per-weather tints above buildings (acid-green drizzle over Central,
  magenta festival glow in Entertainment, pale haze in the outer ring).
  `renderUtils.districtDim(view, district)` also dims districts outside the
  event's focus so player actions read locally.
- `drawWeather()` honours only the presentation kind from `view.weather`, so
  renderer and store stay decoupled.

### Player-triggered events (civic actions)

- Store adds **`triggerEvent(type, district?)`** → `createEventForType` (moved
  into `data/events.ts`) → **`dispatchEvent(event)`**, the single funnel that
  adds the event, retargets the engine, pushes news + rep changes, re-syncs the
  weather label and calls `checkGoals`. The store schedules the event's own
  removal timeout (`removeEvent` syncs engine/weather/log).
- `App` spawner is back to only: schedule `createRandomEvent` every ~27 s and
  prune expired events.
- **MESSAGES > CIVIC ACTIONS** (six buttons, colour-keyed): DISTRICT BLACKOUT,
  NEON FESTIVAL, CONDENSER TEST, TRANSIT HOLD, MESH STRESS, HAZE VENT.
  District-picking actions target the camera's current sector; HAZE VENT is
  city-wide. Two-click confirm: click 1 arms (border pulse + `CONFIRM?` chip),
  click 2 fires; mouse-leave disarms.
- **SearchPalette** exposes the same six as `>` commands.
- Effects are real: power blackouts darken the event district via
  `renderUtils.isBuildingBlackout` / `districtDim`, festivals throw
  lanterns/banners/crowds, rain opens streaks + umbrella pedestrians.

### City goals

- `world.GOALS` — six `Goal` entries with `progress(GoalContext)`:
  CAVE CARTOGRAPHER (visit 9 districts), NODE WATCHER (3 tracked nodes),
  DEEP SURVEYOR (10 discovered nodes), LORE ARCHIVIST (5 codex entries),
  NEON PATRON (throw a festival), VANTAGE KEEPER (save a vantage).
- `store.checkGoals()` diffs achievements against `goalsDone`, pushes
  comms-log completion entries + toasts, and is hooked into visitDistrict,
  discover, toggleTracked, discoverCodex, addBookmark and dispatchEvent.
- PROFILE renders the `CITY GOALS` section (progress bars + ✓ when done).
  `goalsDone` (and the seed) persist in `nexus-city-progress-v1`.
- Festival goal counts `festivalsThrown`, incremented inside `dispatchEvent`.

### City seed (code-only)

- The seed lives in one constant, `CITY_SEED_DEFAULT = 720412` in
  `data/city.ts`. `generateCity(seed)` stays parameterized, but nothing in the
  UI dispatches a different value — the App boot always compiles the constant.
- The seed survived to the UI earlier as a "seed forge" and was reverted by
  owner decision (seed management belongs to the codebase, "backend only").
- `CityData.seed` only feeds the flavor copy ("CAVERN COMPILED · SEED …" line)
  in the intro; no persistence reads or writes a seed anymore.
- Per-city run state wipes/discoveries therefore only reset through normal
  gameplay — the store no longer carries `seed` or `reseed`.

### Transit stations & boarding crowds

- `drawStationCrowds()` renders a queue of up to 6 waiting commuters + a lit
  door glow on each side of every station. Queues effect the train schedule:
  `CityEngine.trainDwell` holds trains ~5.2 s at station positions, and the
  parked train shows its doors glowing while commuters board.
- Station positions are stable grid math, so you can verify visually with
  `engine.focusCell(154, 99, 1.3)` + `train.pos = 99.6; train.stopped = true`
  on the maglev-magenta line.

### Performance gates

- `buildingRenderer.drawStorefront` now bails below zoom `0.75`
  (`lod >= 2 && zoom > 0.75`) — street-level detail is only paid for at street
  level.
- `CityEngine` pauses the raf loop on `visibilitychange` (document hidden) and
  resumes on return, so background tabs burn zero frames.
- FPS watchdog (`runFpsWatch`): 4 consecutive seconds under 30 FPS with quality
  `auto` → `autoScale *= 1.3` (clamp 2.6 / 1.7 by profile class), `resize()`,
  and an `onAutoQuality(scale)` callback that App surfaces as a
  RENDER AUTO-TUNE toast.

### PWA, OG image and procedural assets

- `index.html` carries full OG/Twitter meta (1200×630 preview), theme colours,
  the web manifest link and PNG touch/favicon icons.
- `public/manifest.webmanifest` — fullscreen display, any orientation,
  192/512 + maskable icons.
- `scripts/gen-assets.mjs` wrote all binary assets **procedurally and with zero
  dependencies** (hand-rolled zlib/PNG encoder, mulberry32-stable): the OG city
  scene and the diamond-glyph icons. Re-run with `node scripts/gen-assets.mjs`.
- `.gitignore` keeps `node_modules/`, `dist/` and `*.tsbuildinfo` out of git.

### Loading state + touch hint

- The intro disables INITIALIZE until `generateCity()` resolves; the status
  line swaps to COMPILING CAVERN TOPOLOGY — SEED LOCK in the meantime.
- `components/MobileHint.tsx` mounts only on `(pointer: coarse)` devices, after
  the intro, floating above the bottom nav with a two-phone glyph and a
  PINCH/DRAG hint; auto-dismisses after 7.6 s or on tap.
- Dev-only debug hook: `window.__nexus` exposes the Zustand store in DEV builds
  (`main.tsx`, stripped in production).

---

## HUD and panels

`App.tsx` renders the canvas and a pointer-events-none HUD containing:

- **TopBar** — city name, population, grid/network/stability stats.
- **Top-right sector card** — sector code, district, time, weather temperature.
- **SideControls** — zoom, reset, overview, layer cycle, search.
- **EventFeed** — live events with severity and timestamps.
- **Minimap** — clickable city grid, district colouring, camera frustum.
- **Coord rail** — camera position, cell, zoom level, FPS, day/night CYCLE
  phase.
- **BottomNav** — MAP / SECTORS / TRANSIT / SYSTEMS / MESSAGES / PROFILE.
- **SelectionPanel** — node preview, telemetry meters, record grid, owner,
  description, personality chips, quirk, actions.
- **SearchPalette** — fuzzy search over building names/types/districts plus
  `>` commands (layers, overview, civic actions).
- **FacilityView** — interior view for a selected building.
- **ToastStack** — transient notifications.
- **MobileHint** — coarse-pointer-only floating gesture hint.

Panels use the shared `panels/PanelShell.tsx`; the six terminal screens live in
`components/panels/`.

State is centralized in `state/useCityStore.ts` (Zustand): selected/hovered
building, selected entity + follow, photo/scan modes, quality, bookmarks,
faction reputation, codex, news, onboarding/help, active panel, search,
facility, camera info, events/logs, weather, stats, clock, audio, overlays,
discovery/tracking, FPS, city seed + civic actions + goals, and O(1) lookup
maps. A curated slice of this state persists to `localStorage` under
`nexus-city-progress-v1` (including `seed` and `goalsDone`).

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

- Static layers are cached and only rebuilt when the camera warrants it (or
  when daylight changes by more than 0.02, so the night wash stays in sync).
- LOD keeps facade/crown/storefront detail at zoom 1+; `drawStorefront` is
  gated behind zoom > 0.75 total.
- Pedestrian sprites are cached canvases, not per-frame vector drawing.
- Every dynamic system culls by projected position before drawing.
- The raf loop halts while the document is hidden; on return it resumes and
  re-syncs the view before rebuilding static layers.
- The renderer intentionally runs at reduced internal resolution and upscales.
- FPS watchdog in auto quality: sustained < 30 FPS for 4 s shrinks the buffer
  (autoScale ×1.3, capped) and toasts the change.
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
  transit delay, rain, festival, construction, market surge, weather shift,
  and `createEventForType(type, district)` which fills title/message/severity/
  timeframe from the template (city-wide for `weather`).
- All events (random or player-triggered) funnel through
  `store.dispatchEvent` → engine target + news + reputation + weather label +
  goal check. Random spawner in `App.tsx` fires one after ~11 s then every
  ~27 s and only handles scheduling + expiry.
- `audio/ambient.ts` builds a procedural Web Audio bed (hum, filtered noise,
  district-dependent tone). It is off by default and starts only on user action.
- `index.html` additionally ships OG/Twitter meta, the PWA manifest link and
  generated PNG icons (`scripts/gen-assets.mjs`).

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
- In DEV builds `window.__nexus` exposes the store for console-driven
  verification (`getState()`, `triggerEvent`, engine tricks). It is not present
  in production. Always read fresh state with
  `window.__nexus.getState()` — captured snapshots go stale after mutations.
- The seed is a code constant; no runtime path sets it. To ship a different
  city, edit `CITY_SEED_DEFAULT` and redeploy.
- Background tabs throttle timers to ~1 s, so React state updates and toasts
  appear delayed during automated DOM testing of a hidden tab.

---

## Status

The current build compiles cleanly (`npm run build`) and has been verified in
browser for intro (incl. COMPILING gated button), zoom/pan, hover, selection,
search and commands, all six panels, facility view, minimap, events + news
wire, overlays, audio and keyboard shortcuts, entity selection/follow, photo
mode (export + vantages), structural scan, quality profiles, faction
dispatches, codex, onboarding, persistence and deep links.

Newer batch, verified live via console/state checks:

- forced deep night + noon restore (indigo sky wash, lit windows, coord-rail
  CYCLE row),
- NEON FESTIVAL triggered from profile palette (`render` purple cast, weather
  badge, civic standing bump, goal cleared),
- DISTRICT BLACKOUT via armed civic-action button (powered-down event grid +
  GRID FAULT entries),
- constant-seed boot: every load compiles `CITY_SEED_DEFAULT` 720412 with the
  intro COMPILING gate working; 2545 buildings / 9 stations each time,
- maglev-magenta station dwell with boarding crowd + door glow,
- rain event with streaks + umbrella pedestrians,
- PROFILE goals with live progress and completed badges,
- perf watchdog / hidden-tab behaviour wired (`onAutoQuality` toast observed),
- 390 px and 320 px harness: zero horizontal overflow with the full HUD
  mounted.

Bundle size: ~491 kB JS / ~87 kB CSS (≈150.8 kB / 15.1 kB gzip).

---

# Roadmap

Ideas for next iterations, ordered by value for effort.

### Quick wins
- [x] **Shareable views** — `#node=` / `#cell=` / `#view=` deep links
- [x] **Save state** — `nexus-city-progress-v1` persists progress/settings
- [x] **Screenshot button** — photo mode `EXPORT PNG`
- [x] **Day/night cycle** — wall-clock daylight (`daylightForClock`) drives sky
      tint, window fire and neon bloom
- [x] **Open Graph image + title** — `public/og-image.png` + full meta in `index.html`
- [x] **Seed picker** — **decided against**: seed is a code constant (`CITY_SEED_DEFAULT`),
      change + redeploy; UI forge removed

### Gameplay / interactivity
- [x] Click vehicles and NPCs to open a small info card (with follow camera)
- [x] Terminal commands (`>` prefixed actions in the search palette)
- [x] Factions with reputation + dispatches; codex discovery
- [x] Player-triggered events (district blackout, festival, rain, transit hold,
      mesh stress, haze vent) with visible skyline effects + `>` command variants
- [x] Goals / missions — six OBJECTIVES in PROFILE using discovery/tracking state
- [x] Seed picker to generate different cities (reverted — same decision as above)

### Visual
- [x] Neon reflections on roads during rain (`groundRenderer` wet streets)
- [x] Photo mode: hide HUD, free camera, export PNG
- [x] District-specific palette tint per weather (`drawDistrictAtmosphere`)
- [x] Transit stations with NPCs boarding trains (9 halts, 5.2 s dwell, door glow)

### Performance
- [x] Quality profiles (AUTO/HIGH/BALANCED/PERFORMANCE) rescale the buffer
- [x] Honor `prefers-reduced-motion` (CSS-level)

### Performance gates
- [x] Gate `drawStorefront` behind zoom > 0.75
- [x] Pause the render loop when the tab is hidden
- [x] Auto-lower internal resolution when FPS stays under 30 (~1.3× buffer shrink + toast)

### Social layer architecture

The social mesh is Supabase-backed and fully optional.

**Files**
- `src/social/client.ts` — lazy dynamic import of `@supabase/supabase-js`; `socialEnabled` gate.
- `src/social/types.ts` — domain types: `SocialProfile`, `PresenceEntry`, `BuildingChannelMessage`, `DirectThreadMessage`.
- `src/social/useSocialStore.ts` — Zustand store: auth (signUp/signIn/signOut), profile CRUD, presence on channel `nexus-city`, per-building broadcast channels `building:<id>`, DM channels `dm:<pair>`, DB history fallback for messages.
- `src/social/PixelCitizen.tsx` — SVG avatar parameterized by suit colour, visor colour, build 0–2.
- `src/components/AccountSection.tsx` — PROFILE > ACCOUNT UI (offline notice, sign-up/sign-in, wardrobe, rename, unlink).
- `src/components/FacilityChannel.tsx` — FACILITY interior floor channel (occupants + live thread).
- `src/components/DirectsSection.tsx` — MESSAGES > DIRECTS (operator roster + 1:1 threads).
- `supabase/schema.sql` — `profiles`, `building_messages`, `direct_messages` + RLS (public reads on profiles/building_messages, participants-only on DMs).

**Flow**
- Boot: if env vars missing → `socialEnabled=false` → components render offline notices, no network traffic.
- Auth: Supabase Auth email/password; on sign-in the store loads/creates `profiles` row, sets `status='online'`, subscribes to `nexus-city` presence.
- Presence: each client tracks `presenceKey` with `{userId, handle, body, visor, built, buildingId, buildingName}`. `enterBuilding` updates presence meta; occupants are filtered locally.
- Floor channel: on facility open, subscribe to `building:<id>` broadcast `chat` events; on subscribe pull last 40 rows from `building_messages` for history; messages are deduped by sender-local `cid`.
- DMs: open `dm:<sortedPair>` broadcast channel; history pulled from `direct_messages`; messages are best-effort persisted via insert.

**Security**
- RLS ensures users can only insert rows as themselves and read DMs where they are sender/recipient. Profiles and building messages are public read.
- No server code required; Vercel remains static.

### Supabase social mesh (optional but recommended)

Add a free Supabase project, run `supabase/schema.sql`, set two env vars, and configure auth redirects:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY   # or VITE_SUPABASE_ANON_KEY
```

**Authentication → URL Configuration:** set **Site URL** to the production domain and add
both `https://your-app.vercel.app/**` and `http://localhost:4173/**` to **Redirect URLs**.
Sign-up passes `emailRedirectTo` = the current origin, so the origin you sign up from must
be allow-listed or Supabase falls back to the Site URL. Email confirmation can stay on;
the handle chosen at sign-up is stored locally and claimed after confirmation.

**What you get when live**

- **PROFILE > ACCOUNT** — sign up / sign in with email + password; citizen handle; avatar wardrobe (suit / visor / build); identity persistence.
- **FACILITY interiors** — per-building **FLOOR CHANNEL**: live occupancy (presence filtered by building), realtime broadcast chat, persisted history (last 40 msgs).
- **MESSAGES > DIRECTS** — operator-to-operator 1:1 encrypted-looking threads; live roster of online citizens; history persisted in `direct_messages`.
- **Presence** — global channel `nexus-city`; each client tracks buildingId + buildingName; UI shows occupants in-floor and in the Directs list.

**No server needed** — Supabase Realtime handles presence + broadcast. The app no-ops gracefully if the env vars are missing.

### Bigger features
- [x] Live citizen accounts + per-building floor channels + 1:1 DMs — **Supabase Realtime**
  (offline graceful degrade; no backend server required)
- [ ] Interactive facility interiors with NPCs and floor plans

## Deployment (Vercel)

- Framework preset: Vite, Node 20+
- Install: `npm ci` (keep `package-lock.json` in sync with `package.json`)
- Build: `npm run build`, output: `dist`
- `public/` (fonts, `manifest.webmanifest`, `og-image.png`, icons) is copied
  verbatim into `dist/`; regenerate the images with
  `node scripts/gen-assets.mjs` if you change the brand art
- Optional `vercel.json` for SPA rewrite and asset caching
- Windows note: if PowerShell blocks `npm`, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` or use `npm.cmd`
