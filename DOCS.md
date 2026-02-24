# Network Graph

A force-directed network graph component for visualizing relationships between nodes. Supports pan, zoom, drag, node selection, and inherits your shadcn theme automatically.

## Installation

```bash
npx shadcn add network-graph
```

## Usage

```tsx
import { NetworkGraph } from "@/components/ui/network-graph"

const nodes = [
  { id: "api",  label: "API Gateway", subtitle: "gateway",  icon: "⬡" },
  { id: "db",   label: "PostgreSQL",  subtitle: "database", icon: "🗄" },
  { id: "auth", label: "Auth",        subtitle: "service",  icon: "🔑" },
]

const edges = [
  { source: "api",  target: "db" },
  { source: "api",  target: "auth" },
  { source: "auth", target: "db" },
]

export default function MyGraph() {
  return (
    <NetworkGraph
      nodes={nodes}
      edges={edges}
      width={800}
      height={500}
    />
  )
}
```

## Examples

### Default

<ComponentPreview name="network-graph-demo" />

### Read-only

Pass `interactive={false}` to disable all pan, zoom, and drag interactions. Useful for static diagrams embedded in documentation or dashboards.

<ComponentPreview name="network-graph-read-only-demo" />

### With selection callback

```tsx
<NetworkGraph
  nodes={nodes}
  edges={edges}
  onSelectionChange={(id) => {
    if (id) console.log("Selected:", id)
    else console.log("Deselected")
  }}
/>
```

## Interactions

| Action | Behavior |
|---|---|
| Click node | Select node, highlight connected edges |
| Click canvas | Deselect |
| Drag node | Reposition node |
| Drag canvas | Pan viewport |
| Scroll | Zoom toward cursor |
| `+` / `-` buttons | Zoom in / out |
| Reset button | Fit to original view |
| `Tab` | Focus nodes (keyboard navigation) |
| `Enter` | Select focused node |

## Props

### NetworkGraph

| Prop | Type | Default | Description |
|---|---|---|---|
| `nodes` | `NetworkGraphNode[]` | `[]` | Array of nodes to render |
| `edges` | `NetworkGraphEdge[]` | `[]` | Array of directed edges |
| `width` | `number` | `800` | Canvas width in pixels |
| `height` | `number` | `500` | Canvas height in pixels |
| `interactive` | `boolean` | `true` | Enable pan, zoom, and drag |
| `onSelectionChange` | `(id: string \| null) => void` | — | Called when selection changes |
| `className` | `string` | — | Additional classes for the root element |

### NetworkGraphNode

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | ✓ | Unique identifier |
| `label` | `string` | ✓ | Primary label text |
| `subtitle` | `string` | — | Secondary label (shown below) |
| `icon` | `string` | — | Emoji or short string for icon slot |

### NetworkGraphEdge

| Prop | Type | Required | Description |
|---|---|---|---|
| `source` | `string` | ✓ | Source node `id` |
| `target` | `string` | ✓ | Target node `id` |

## Composable sub-components

Every piece of the graph is a separately exported, `forwardRef`'d component with full `className` forwarding and `data-slot` attributes. You can replace any part individually.

### Custom controls position

```tsx
import {
  NetworkGraph,
  NetworkGraphControls,
} from "@/components/ui/network-graph"

// Move controls to top-left
<NetworkGraphControls
  className="top-3 left-3 bottom-auto right-auto"
  onZoomIn={...}
  onZoomOut={...}
  onFit={...}
/>
```

### Targeting sub-elements with Tailwind

```tsx
// Dim all non-selected nodes from a parent
<NetworkGraph
  className="[&_[data-slot=network-graph-node]:not([data-selected])]:opacity-40"
  ...
/>
```

### Hide controls entirely

```tsx
// Build your own controls outside the graph
import { NetworkGraph, NetworkGraphControls } from "@/components/ui/network-graph"

// Simply don't render NetworkGraphControls — or pass interactive={false}
// and render your own UI outside the component
```

## Theming

The component uses shadcn's standard CSS variable tokens throughout. It inherits whatever theme is active in your project — no configuration needed.

| Token used | Purpose |
|---|---|
| `bg-background` | Canvas background |
| `bg-card` / `fill-card` | Node card background |
| `bg-muted` / `fill-muted` | Node icon background |
| `stroke-border` / `fill-border` | Edges and arrowheads |
| `stroke-ring` | Selected node outline |
| `fill-card-foreground` | Node label text |
| `fill-muted-foreground` | Node subtitle text, highlighted edges |
| `text-muted-foreground` | Info tooltip text |

## Accessibility

- Graph root has `role="img"` and `aria-label="Network graph"`
- Each node card has `role="button"`, `aria-label`, and `aria-pressed`
- Edges layer has `aria-hidden="true"` (decorative)
- Node info tooltip has `role="status"` and `aria-live="polite"`
- Keyboard navigation: `Tab` to reach nodes, `Enter` to select

## Notes

- The force simulation runs at up to 300 iterations and settles automatically. Nodes fade in as it completes.
- For graphs with more than ~200 nodes, consider a canvas-based renderer.
- Node positions can be manually overridden by dragging — the simulation is not re-run after mount unless `nodes` or `edges` props change.
