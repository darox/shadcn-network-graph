# Network Graph Component

## What we're building
A production-grade shadcn-compatible force-directed network graph component.
Lives at `components/ui/network-graph.tsx`.

## Rules (non-negotiable)
- Zero injected `<style>` tags — Tailwind utility classes via `cn()` only
- `className` forwarded on every component
- `data-slot` on every element
- Plain function components (React 19 ref-as-prop pattern), no `forwardRef` or `displayName`
- TypeScript interfaces extend `React.ComponentProps<"element">`
- No hardcoded hex colors — Tailwind semantic classes only (`fill-card`, `stroke-border`, etc.)
- SVG drop-shadow via inline `filter: drop-shadow(...)`, not Tailwind `shadow-*`
- SVG marker fill via classed `<path>` element, not inline `hsl(var(--...))`
- Drag delta must be divided by `tf.scale`
- Zoom must use zoom-to-point formula, not scale around origin
- Simulation ticks batched every 8 frames, not every frame
- Use actual shadcn `<Button>` from `@/components/ui/button` — never a custom button

## Locked API (v1)
```ts
interface NetworkGraphNode {
  id: string
  label: string
  subtitle?: string
  icon?: string
}

interface NetworkGraphEdge {
  source: string
  target: string
}

interface NetworkGraphProps extends React.ComponentProps<"div"> {
  nodes?: NetworkGraphNode[]
  edges?: NetworkGraphEdge[]
  width?: number
  height?: number
  interactive?: boolean          // defaults true
  onSelectionChange?: (id: string | null) => void
}
```

## File structure
```
components/ui/
  network-graph.tsx              ← main component
  network-graph-simulation.ts   ← force layout engine
registry/ui/
  network-graph.json             ← registry manifest
registry/example/
  network-graph-demo.tsx
  network-graph-read-only-demo.tsx
tasks/
  todo.md
  lessons.md
```

## Definition of done
- `pnpm tsc --noEmit` passes with zero errors
- `pnpm build` succeeds
- All interactions work: drag, pan, scroll-zoom, select, keyboard nav
- `interactive={false}` hides controls and disables all interactions
- `onSelectionChange` fires correctly
- Works in all 5 shadcn themes (Zinc, Slate, Rose, Green, Orange) in light and dark mode
