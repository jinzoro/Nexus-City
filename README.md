# NEXUS // UNDERGROUND MEGAPOLIS

A full-screen, real-time **pixel-art cyberpunk city** where the city itself is the
interface. There is no landing page and no scrolling document: you arrive inside
a sealed artificial cavern, 2.5 km beneath the surface, and explore a living
isometric metropolis of thousands of buildings, moving citizens, maglev trains,
drones, neon signage and holograms — all rendered and simulated in your browser.

- **Stack:** React 19 + TypeScript + Vite + Zustand
- **Renderer:** hand-written Canvas 2D isometric engine (no PixiJS / no WebGL)
- **Backend:** none — the whole city is generated and simulated client-side
- **Determinism:** seeded procedural generation; the seed is a **code constant**
  (`CITY_SEED_DEFAULT = 720412` in `src/data/city.ts`) — change it in source and
  redeploy. There is no in-app picker by owner decision.
- **Verified:** desktop, day/night, civic actions, goals, stations, 390 px and
  320 px layouts, production build

---

## What you can do

### Explore a living city
- **4 zoom levels** — cavern overview → district → street → single building,
  with continuous pan / zoom (wheel, drag, pinch) and LOD that streams façade,
  crown and storefront detail as you get closer.
- **~2,545 buildings** on a 198×198 world grid, 9 districts radially arranged
  around Central Nexus, plus parks, lakes, farms, plazas, roads and elevated
  rail loops with visible support pylons.
- **Moving lives** — 7,200 pedestrians with 4-frame walk cycles and role
  sprites, 520 detailed isometric vehicles (taxis with roof signs, buses,
  trucks, bikes), 10 trains on 5 lines, aircraft, drones and steam emitters.
- **Day/night cycle** — the cavern follows your real clock: deep-night indigo
  wash, dusk warm bloom, greyed signage after dark, and windows that light up
  floor by floor overnight. The coord rail shows the current phase (DAWN/DUSK/…).
- **Transit life** — 9 named stations sit on the 3 transit lines; trains dwell
  ~5 s at platforms while queues of pixel commuters board and glowing doors
  announce arrival.
- **Ambient life everywhere** — flickering neon, scrolling billboards,
  holograms, window light pulses, elevator cars, rooftop clutter, wet-street
  reflections during rain, and district-tinted atmosphere per event (acid-green
  drizzle over Central reads different from a magenta festival in Entertainment).

### Interrogate anything
- **Hover** highlights a building and shows a live tooltip; **click** opens its
  node record; **double-click** focuses the camera.
- **Click citizens, vehicles or trains** to open a Citizens' Signal card,
  then **follow** them — the camera tracks the signal as it moves.
- **Enter facility view** to step inside a building's interior pixel scene.
- **Search palette** (`Ctrl/⌘+K`, or `/`) over building names, types,
  districts; also accepts **commands** with a `>` prefix.
- **Minimap** with drag-to-pan, tracked nodes, trains, live-event and entity
  markers.
- **Photos** — photo mode (`F`) hides all HUD, `Export PNG` saves the current
  frame; save vantages (`B`) and return to them from the Map panel.

### Run the city
- **Six terminal panels** — MAP, SECTORS, TRANSIT, SYSTEMS, MESSAGES, PROFILE.
- **City layers** — transit / power / network / atmosphere overlays.
- **Live events** — power outages, rain, neon festivals, transit delays,
  network spikes, construction, market surges, weather shifts; they alter the
  skyline (rain, banners, docked construction cranes, flicker waves) and the
  message wire.
- **Civic actions** — six player-triggered events with a two-punch confirm
  (first click arms, second fires) in MESSAGES, plus `>` commands in the search
  palette. Pull district breakers, throw festivals, open condenser rain, hold
  transit, stress the mesh or vent haze — the skyline, weather badge, faction
  standing and news wire all react.
- **City goals** — six missions in PROFILE (visit all 9 sectors, pin 3 nodes,
  discover 10 structural nodes, file 5 codex entries, throw a festival, save a
  vantage) with live progress bars; completion is persisted.
- **News wire ticker** — emergent headlines drawn from factions, buildings and
  events.
- **Factions & reputation** — six factions with standing you can shift by
  answering their dispatches in MESSAGES.
- **Codex** — 34 hidden lore entries, discovered by visiting landmark
  buildings and through play; persisted.
- **Structural scan** (`V`) — wireframe read-out overlay of the skyline.
- **Render quality profiles** — AUTO / HIGH / BALANCED / PERFORMANCE, plus
  CRT scanlines toggle and procedural ambient audio, all in SYSTEMS.
- **Progress persists** — discovered sites, visited districts, tracked nodes,
  saved vantages, faction standing, codex findings, completed goals are kept in
  `localStorage` (`nexus-city-progress-v1`). The city seed is a code constant and
  is not persisted.
- **Deep links** — `#node=<buildingId>`, `#cell=<x>,<y>,<zoom>`,
  `#view=overview` restore a view or open a node record.
- **PWA** — installable (fullscreen manifest + generated diamond-glyph icons),
  `og-image.png` social preview for shared links.
- **Social mesh (optional)** — citizen accounts, avatars, per-building floor
  channels and 1:1 DMs via Supabase Realtime. See **Social mesh** section below.
  The app degrades gracefully when the Supabase env vars are absent.

---

## Controls

| Input | Action |
| --- | --- |
| Drag / one finger | Pan |
| Scroll / pinch | Zoom |
| `Ctrl/⌘ + K` or `/` | Search palette & commands |
| `M` `S` `T` `Y` `N` `P` | Map / Sectors / Transit / Systems / Messages / Profile |
| `O` | City overview · `0` reset view · `+/-` zoom |
| `F` | Photo mode · `V` structural scan · `B` save vantage |
| `Esc` | Close search → facility → panel → selection |
| Click building | Node record · Double-click | Focus |
| Click citizen/vehicle/train | Citizens' Signal card · Follow |

Mobile: bottom-sheet node panel, all six nav tabs fit at 320 px, HUD compacts
progressively (top stats hide ≤760 px, brand hides ≤380 px). Touch devices get
a transient PINCH-TO-PAN / DRAG-TO-CRUISE hint after the intro (tap to dismiss).

---

## Project structure

```
index.html
public/
  fonts/                     Silkscreen + VT323 (local, no CDN)
  og-image.png               1200×630 social preview (generated)
  icon-512.png / icon-192.png  PWA icons (generated diamond glyph)
  manifest.webmanifest       fullscreen PWA manifest
src/
  main.tsx                   React root (+ dev-only window.__nexus state hook)
  App.tsx                    App shell, engine lifecycle, seed boot, clock,
                             events, keyboard, deep links
  styles.css                 Full pixel-art design system + HUD + responsive rules
  types.ts                   Domain types (buildings, entities, factions, goals,
                             codex…)
  audio/
    ambient.ts               Procedural Web Audio ambience (off by default)
  data/
    city.ts                  World constants, districts, rail lines, train
                             stations, seeded generation
    personality.ts           Facade / crown / storefront / age / quirk tables
    events.ts                Event templates + createEventForType factory
    world.ts                 Factions, GOALS, codex, news, entity profiles,
                             bookmarks
  engine/
    CityEngine.ts            Camera, input, loop, static caching, hit-testing,
                             entity selection + follow camera, photo/scan/quality,
                             visibility pause, FPS watchdog, train dwell
    renderUtils.ts           Projection, colour helpers, View (daylight/weather/
                             district), bounds, hash/noise
    groundRenderer.ts        Ground, roads, parks, water, wet reflections
    buildingRenderer.ts      Buildings, facades, crowns, storefronts, props,
                             rails, night window glow
    dynamicRenderer.ts       Vehicles, pedestrians, trains, aircraft, drones,
                             emitters, billboards, holograms, overlays, weather,
                             day/night + district tints, station crowds, scan
                             overlay, event atmosphere, selection reticles
    spriteFactory.ts         Cached pixel pedestrian sprites
    pixelFont.ts             Procedural 5×7 pixel font for in-world signage
  state/
    useCityStore.ts          Zustand store: UI state, lookups, civic
                             events, goals, persistence (seed is code-only)
  social/
    client.ts                Lazy Supabase client; socialEnabled gate
    useSocialStore.ts        Auth, presence (nexus-city), per-building channels,
                             DMs, avatar state
    types.ts                 SocialProfile, PresenceEntry, BuildingChannelMessage,
                             DirectThreadMessage
    PixelCitizen.tsx         SVG pixel avatar parameterized by body/visor/built
  components/
    AccountSection.tsx       PROFILE > ACCOUNT — sign-up/sign-in, wardrobe, unlink
    FacilityChannel.tsx      FACILITY interior — live floor channel + occupants
    DirectsSection.tsx       MESSAGES > DIRECTS — operator list + 1:1 threads
    TopBar, BottomNav, SideControls, EventFeed, HoverTooltip, SelectionPanel,
    SearchPalette, Minimap, Intro, ToastStack, FacilityView,
    EntityCard, PhotoModeBar, NewsTicker, Onboarding, MobileHint, ui.tsx,
    Icons.tsx
    panels/                  Map, Sectors, Transit, Systems, Messages, Profile
  supabase/
    schema.sql               Run-once DDL for profiles / building_messages /
                             direct_messages + RLS
scripts/
  gen-assets.mjs             Dependency-free generator for og-image.png and
                             PWA icons (pure Node, hand-rolled PNG encoder)
```

---

## Rendering pipeline

One internal-resolution canvas (reduced by design) is upscaled with
`image-rendering: pixelated`. Projection is 2:1 isometric
(`TILE_W 24` / `TILE_H 12`, world `198×198`, 18 blocks of 11 + 2 road cells).

Three cached static layers are rebuilt only when the camera moves far enough or
crosses a zoom bucket:

```
ground → vehicles → pedestrians → city → trains/aircraft/drones/emitters
→ billboards/holograms → event atmosphere → overlays → selection
→ foreground/ceiling → weather → scan overlay
```

Dynamic entities render between ground and city layers, so they are correctly
occluded by buildings. LOD thresholds: `<0.24` silhouettes, `<0.55` windows +
roofs, `<1.05` façade patterns + storefronts, `≥1.05` full interior detail.
Pedestrians skip below zoom 0.4; vehicles become single pixels below 0.3;
sprites double resolution at zoom ≥ 1.15.

---

## Scripts

```bash
npm install
npm run dev        # dev server (http://localhost:4173)
npm run build      # tsc -b && vite build
npm run preview    # serve the production build
node scripts/gen-assets.mjs   # regenerate og-image.png + PWA icons (no deps)
```

Current production bundle: ~509 kB JS / ~92 kB CSS (≈156.8 kB / 15.8 kB gzip).

### Social mesh (optional) — Supabase Realtime

Live citizen accounts, per-building floor channels and 1:1 DMs require a free Supabase project.

**Prerequisites**
- A Supabase project (https://app.supabase.com). Free tier is enough for testing.
- The DDL in `supabase/schema.sql` (run once).

**Setup**
1. Create a project at https://supabase.com and copy the **Project URL** and **anon public key**.
2. Open **SQL Editor → New query** and run the full contents of `supabase/schema.sql`.
   - Creates `profiles`, `building_messages`, `direct_messages` with RLS.
   - No table replication is needed; realtime is via broadcast + presence channels.
3. Configure auth redirects: **Authentication → URL Configuration**
   - **Site URL**: your production URL (e.g. `https://your-app.vercel.app`).
   - **Redirect URLs**: add `https://your-app.vercel.app/**` **and** `http://localhost:4173/**`.
   - Sign-up sends `emailRedirectTo` = the current origin, so whichever origin you sign up
     from must be listed here. Otherwise Supabase falls back to the Site URL.
   - Email confirmation can stay enabled. After clicking the link you are signed in and
     the handle chosen at sign-up is claimed automatically.
4. Add env vars to Vercel / your local `.env`:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Newer Supabase projects use the **publishable** key (`sb_publishable_...`); older
projects use the legacy anon JWT. The client reads either
`VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`.

5. Redeploy.

**What you get when live**
- **PROFILE > ACCOUNT** — sign up / sign in with email + password; citizen handle; avatar wardrobe (suit / visor / build); identity persistence.
- **FACILITY interiors** — per-building **FLOOR CHANNEL**: live occupancy (presence filtered by building), realtime broadcast chat, persisted history (last 40 msgs).
- **MESSAGES > DIRECTS** — operator-to-operator 1:1 encrypted-looking threads; live roster of online citizens; history persisted in `direct_messages`.
- **Presence** — global channel `nexus-city`; each client tracks buildingId + buildingName; UI shows occupants in-floor and in the Directs list.

**Graceful degrade**
Without the env vars `socialEnabled` is false. All social components render offline notices and the city remains fully playable. No backend server is required; Supabase Realtime handles presence + broadcast.

---

## Performance

- Cached static layers, per-frame culling of every dynamic system, cached
  pedestrian sprite canvases, chunked rail/prop painting.
- `drawStorefront` is gated behind zoom > 0.75 (only street view pays for it).
- Render loop pauses automatically while the tab is hidden.
- FPS watchdog: 4 s below 30 FPS (quality AUTO) auto-lowers the internal
  buffer scale, resizes and toasts "RENDER AUTO-TUNE".
- Quality profiles re-scale the internal buffer (AUTO follows device) so
  laptops can trade resolution for frames.
- Live FPS + zoom readout in the coord rail; Systems panel exposes the profile.

---

## Feature status

| Area | Status |
| --- | --- |
| Procedural city, districts, rail, roads, parks, water | ✅ |
| Building personality (facades, crowns, storefronts, quirks, legends) | ✅ |
| Pedestrians, vehicles, trains, aircraft, drones, emitters | ✅ |
| Entity selection + follow camera | ✅ |
| Facility interiors | ✅ |
| Search + `>` commands (incl. civic actions) | ✅ |
| Six terminal panels, overlays, layers | ✅ |
| Events + event-driven visuals + news wire + player-triggered civic actions | ✅ |
| Day/night cycle + per-weather district atmosphere tints | ✅ |
| Train stations with boarding crowds + door glow | ✅ |
| City goals with persisted progress | ✅ |
| Seeded generation locked to code constant (`CITY_SEED_DEFAULT`) | ✅ |
| Citizen accounts + avatar wardrobe (Supabase) | ✅ |
| Per-building floor channels (presence + live chat) | ✅ |
| Operator-to-operator DMs | ✅ |
| Photo mode, structural scan, saved vantages | ✅ |
| Factions, reputation, codex, onboarding | ✅ |
| Quality profiles, scanlines, ambient audio | ✅ |
| Perf gates: storefront zoom gate, hidden-tab pause, FPS watchdog | ✅ |
| PWA manifest + icons + OG social image | ✅ |
| Loading state (COMPILING…) + mobile hint overlay | ✅ |
| Persistence + deep links | ✅ |
| Responsive 320 px–desktop, touch controls | ✅ |

See [`HANDOFF.md`](./HANDOFF.md) for the deep architecture notes and the
roadmap for what comes next.
