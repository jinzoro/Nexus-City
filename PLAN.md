# NEXUS — working plan

Bug fixes first (small, verifiable), then features ordered by value for effort.
Each item says where it lives and how to prove it works. Nothing here needs a
backend unless stated.

Status: 2026-11-16. Roadmap history and architecture live in `HANDOFF.md`.

---

## 1. Bug fixes

### P0 — wrong or missing for a real player

**1. Guest sessions have no citizen HUD.**
`PlayerHud` returns `null` unless a Supabase profile is loaded, so the offline
build (`socialEnabled === false`) shows the citizen walking the city with no
coordinates, no MODE/STOP/LOCATE buttons and no logout slot. Keyboard `L`/`C`
work but nothing is discoverable.
- Fix: render the HUD whenever the city is entered, using a fallback identity
  (same cyan/ice default as the city sprite) and hiding only the LOG OUT action
  when there is no account.
- Files: `src/components/PlayerHud.tsx`, `src/social/useSocialStore.ts`.
- Prove: offline build → ENTER AS GUEST → HUD shows coords, LOCATE/STOP/MODE work,
  LOG OUT absent, no console errors.

**2. AUTO-TUNE toast fires during boot.**
The FPS watchdog starts on mount; the worker layer build drops frames, so the
first thing a new player sees is “Frame rate dipped — internal buffer reduced”,
mid-onboarding. The degrade itself is fine; the timing and the toast are not.
- Fix: ignore the first ~10 s after mount (or until the intro gate is dismissed)
  and only toast when the drop actually changes quality after play has started;
  keep the resize silent on boot.
- Files: `src/engine/CityEngine.ts` (`runFpsWatch`), `src/App.tsx` (toast).
- Prove: fresh offline build, enter city, watch 15 s of onboarding — no toast;
  artificially throttle CPU to force a post-boot drop and confirm one toast.

### P1 — visible inconsistencies

**3. Interior avatar does not animate or respect `built` for others.**
The on-foot plan avatar now uses the shared sprite (fixed), but it never plays
the walk cycle, and linked visitors are still 5×6 blocks because `VisitorSprite`
carries no `built`.
- Fix: pass a `walking` flag from FacilityView's movement effect; add `built` to
  `VisitorSprite`/`Npc` and use `drawCitizen` for visitors too (scaled ~0.55),
  keeping the `(YOU)` tag only if a visitor equals self.
- Files: `src/engine/interior.ts`, `src/components/FacilityView.tsx`.
- Prove: walk the plan → legs cycle; open a busy building → visitors vary in
  silhouette and match their roster colours.

**4. Guest citizen position is shared with accounts.**
`nexus.player` is unnamespaced, so a guest walk shifts where an account resumes,
and vice versa.
- Fix: key the saved position by profile id (`nexus.player:<id>`, guest →
  `nexus.player:guest`).
- Files: `src/state/useCityStore.ts`.
- Prove: walk as guest, reload, sign in → account keeps its own last position.

**5. Mobile has no walk input.**
Touch users can double-tap to walk but cannot steer continuously (already on the
`HANDOFF.md` roadmap).
- Fix: coarse-pointer-only virtual stick in the lower-left, clamped outside HUD
  hit areas, writing the existing `moveKeys` store fields.
- Files: `src/components/SideControls.tsx` or a new `TouchStick.tsx`, `styles.css`.
- Prove: 390×844 emulation → stick drags the citizen; HUD stays tappable.

### P2 — polish / misleading labels

**6. `RENDER 149%` in the coord rail is actually zoom.** `camera.zoom * 100`
is labelled RENDER, which reads as render load.
- Fix: label it `ZOOM`, or show the real render scale from the engine.
- Files: `src/App.tsx` (coord rail).

**7. Interior NPC visitor labels can overflow the plan.** 6 px Silkscreen tags are
centred by `length * 1.9` and run off the plan edge for long handles.
- Fix: clamp the label x inside the plan bounds and truncate handles at ~14 chars.

**8. Landing hero art is a static capture.** `public/og-image.png` no longer
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

1. Bugs 1–2 (both small, both first-impression).
2. Bugs 3–4 (consistency and persistence).
3. Feature B (avatar preview) — cheap, and it locks in the shared-sprite fix.
4. Bug 5 (touch) before any promotion aimed at phones.
5. Features A, then C, then E/F depending on whether the next goal is “feels
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
