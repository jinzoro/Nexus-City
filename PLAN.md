# NEXUS — working plan

Bug fixes first (small, verifiable), then features ordered by value for effort.
Each item says where it lives and how to prove it works. Nothing here needs a
backend unless stated.

Status: 2026-11-16. Roadmap history and architecture live in `HANDOFF.md`.

---

## 1. Bug fixes

Shipped 2026-11-16: guest citizen HUD (fallback identity, no LOG OUT), boot-time
FPS watchdog silenced for the first 12 s, floor-plan walk cycle for the on-foot
avatar, visitors wearing their own `built` silhouette, labels clamped inside the
plan, and per-identity walk positions (`nexus.player:<id>` / `:guest`, with the
old shared key read once as migration).

### P1 — visible inconsistencies

**1. Mobile has no walk input.**
Touch users can double-tap to walk but cannot steer continuously (already on the
`HANDOFF.md` roadmap).
- Fix: coarse-pointer-only virtual stick in the lower-left, clamped outside HUD
  hit areas, writing the existing `moveKeys` store fields.
- Files: `src/components/SideControls.tsx` or a new `TouchStick.tsx`, `styles.css`.
- Prove: 390×844 emulation → stick drags the citizen; HUD stays tappable.

### P2 — polish / misleading labels

**2. `RENDER 149%` in the coord rail is actually zoom.** `camera.zoom * 100`
is labelled RENDER, which reads as render load.
- Fix: label it `ZOOM`, or show the real render scale from the engine.
- Files: `src/App.tsx` (coord rail).

**3. Landing hero art is a static capture.** `public/og-image.png` no longer
matches the in-game look (new skyline). Regenerate with
`node scripts/gen-assets.mjs` after the next visual batch; keep the file under
~300 KB.

---

## 2. Features

### Near term (one focused session each)

**A. Other citizens walk the city.**
Presence already carries handle, suit, visor and `built`. Broadcast a throttled
cell position (~2 Hz, only on movement) on the `nexus-city` channel and draw
remote citizens with the same `drawCitizen` sprite, fading them out when stale.
- Value: the social mesh becomes visible in the world instead of only in panels.
- Cost: one presence field, one draw pass, no schema change.

**B. Avatar preview in the world.**
PROFILE wardrobe currently previews only the tiny SVG. Add a live canvas preview
that calls `drawCitizen` at 6–8× on a street-coloured backdrop, so what you pick
is literally what walks.
- Value: removes the “different in game” class of bug for good.
- Cost: small component; the shared sprite already exists.

**C. Street-level follow camera.**
LOCATE locks the camera at ~1.5 zoom. Add a slow zoom-in when following (and an
option to keep the citizen centred at 2.0), with the existing momentum easing.
- Value: makes the citizen and the new sprite detail worth looking at.
- Cost: camera tween only; verify no clipping through towers at max zoom.

**D. Photo mode improvements.**
Depth-of-field blur, hide-HUD toggle already exists; add a “pose” shortcut that
faces the citizen toward the camera and a 2×/4× export.
- Value: shareable screenshots of the new avatar.

### Mid term

**E. Interiors as places, not diagrams.**
Clickable furniture (desks, vending, terminals), a small interaction prompt, and
NPC routines that move occupants between rooms by hour. Reuse `dialogue.ts` for
the interaction text.
- Value: turns facility view from a floor plan into a playable room.

**F. Jobs and income for the citizen.**
`sim/economy.ts` already tracks district income and power. Add per-district
contracts (deliver, survey, patrol) that pay credits, with credits shown in the
citizen HUD. Credits become the sink for cosmetic suits/visors.
- Value: first real gameplay loop; gives the avatar a reason to walk.

**G. Progression perks per faction.**
Reputation exists but only gates text. Add one tangible perk per faction
(faster transit, cheaper suits, police escort, access to restricted floors).

### Later

**H. Transit riding.** Board a maglev at a halt, ride to another station, see the
city pass — the rails, trains and stations all exist already.
**I. Weather that changes the walk.** Rain already renders; make it slow sprint,
glow puddles under the citizen, and let interiors shelter you.
**J. Save profiles.** Named save slots for position, goals, reputation and
bookmarks, with export/import JSON.

---

## 3. Order I'd work in

1. Bug 1 (touch) before any promotion aimed at phones; Bugs 2–3 when touching
   the HUD or assets.
2. Feature B (avatar preview) — cheap, and it locks in the shared-sprite fix.
3. Features A, then C, then E/F depending on whether the next goal is “feels
   alive” or “has a game loop”.

## 4. Verification habits

- `npx tsc -b` then `npm run build` for every batch; CI runs the same.
- Offline build for guest paths:
  `VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= VITE_SUPABASE_PUBLISHABLE_KEY= npx vite build --outDir .dist-guest`,
  preview it, then delete `.dist-guest`.
- Headless Chromium + CDP script (Node 22 global `WebSocket`, no Playwright) for
  layout and canvas checks: 1440/1280/1024/768/390 widths, no overflow, no
  console exceptions, screenshots cropped around the citizen.
- Supabase-only flows (recovery email, DMs, presence, idle lock) stay marked
  unverified until project credentials exist.
