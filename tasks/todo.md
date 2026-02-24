# Network Graph — Build Plan

## Phase 1 — Project setup
- [x] Scaffold Next.js + shadcn project
  ```bash
  pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir no --import-alias "@/*"
  pnpm dlx shadcn@latest init
  pnpm dlx shadcn@latest add button
  ```
- [x] Copy `network-graph.tsx` → `components/ui/network-graph.tsx`
- [x] Copy `network-graph-simulation.ts` → `components/ui/network-graph-simulation.ts`
- [x] Fix import in `network-graph.tsx`: `from "./simulation"` → `from "@/components/ui/network-graph-simulation"`
- [x] Copy demo files → `app/page.tsx` and `app/read-only/page.tsx`
- [x] Run `pnpm tsc --noEmit` — fix all errors before continuing

## Phase 2 — Sub-components
- [x] `NetworkGraphNodeCard` — SVGGElement, data-slot, selected ring, interactive guard
- [x] `NetworkGraphEdgeLine` — exits node border (not center), two arrowhead markers
- [x] `NetworkGraphControls` — uses shadcn `<Button variant="outline" size="icon">`, hidden when `interactive={false}`
- [x] `NetworkGraphNodeInfo` — role="status" aria-live="polite", pointer-events-none

## Phase 3 — Root component
- [x] Force simulation wired up, cleanup on unmount
- [x] Node drag (delta divided by tf.scale)
- [x] Canvas pan
- [x] Scroll zoom toward cursor (zoom-to-point formula)
- [x] Button controls (zoom in/out, fit)
- [x] Selection state + `onSelectionChange` callback
- [x] Highlighted edges via `useMemo`
- [x] `interactive={false}` disables all interactions and hides controls
- [x] Nodes fade in (`opacity: simDone ? 1 : 0.5`)

## Phase 4 — Registry files
- [x] `registry/ui/network-graph.json` manifest
- [x] `registry/example/network-graph-demo.tsx`
- [x] `registry/example/network-graph-read-only-demo.tsx`

## Phase 5 — Verification
- [x] `pnpm tsc --noEmit` — zero errors
- [x] `pnpm build` — succeeds
- [x] Run quality gate script (see lessons.md) — all 12 checks pass
- [x] Visual: drag, pan, zoom, select, keyboard nav
- [x] Visual: `interactive={false}` page
- [x] Visual: all 5 themes × light/dark (use Playwright MCP)

## Review
- Completed: All phases 1–5 done. Component is production-ready.
- Decisions made:
  - `zoomBy` uses zoom-to-point formula centered on canvas (not origin)
  - `fit()` computes bounding box of all nodes and scales/translates to fit viewport
  - Auto-fit triggers once after simulation settles via `hasFitted` ref
  - Simulation tuned: REPULSION 1.5→0.5, ATTRACTION 0.05→0.08, GRAVITY 0.02→0.08
  - Demo files need `"use client"` when using `onSelectionChange` callback
  - tsconfig `@/*` maps to `./*` (no src directory)
- Known issues:
  - None. All interactions, themes, and build checks pass.
