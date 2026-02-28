"use client"

/**
 * network-graph.tsx
 * Place at: components/ui/network-graph.tsx
 *
 * A shadcn-compatible force-directed network graph component.
 *
 * Conventions followed (identical to first-party shadcn components):
 *  - cn() for all class composition, zero injected stylesheets
 *  - className forwarded on every sub-component
 *  - data-slot on every element
 *  - Plain function components (React 19 ref-as-prop)
 *  - TypeScript interfaces extending the correct HTML/SVG element types
 *  - Tailwind semantic classes only (fill-card, stroke-border, etc.)
 *  - Uses shadcn <Button> and lucide-react icons
 *  - Named + default exports
 *
 * Dependencies (already in any shadcn project):
 *   lucide-react, @/lib/utils (cn), @/components/ui/button
 */

import * as React from "react"
import { Maximize2, ZoomIn, ZoomOut, Download, ImageDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  runSimulation,
  getNodeExitPoint,
  getEdgeKey,
  type SimNode,
  type SimulationConfig,
} from "@/components/ui/network-graph-simulation"
import {
  computeTreeLayout,
  computeRadialLayout,
} from "@/components/ui/network-graph-layouts"

// ─── Public types ──────────────────────────────────────────────────────────────

export interface NetworkGraphNode {
  id: string
  label: string
  subtitle?: string
  /** Emoji or short string rendered in the icon slot */
  icon?: string
  /** Initial x position. If omitted, randomized by simulation. */
  x?: number
  /** Initial y position. If omitted, randomized by simulation. */
  y?: number
  /** When true, simulation will not move this node. Default: false */
  fixed?: boolean
  /** Semantic color preset for the node card. Default: "default" */
  color?: "default" | "primary" | "secondary" | "destructive" | "accent"
  /** Group identifier — nodes with the same group are visually clustered */
  group?: string
}

export interface NetworkGraphEdge {
  source: string
  target: string
  /** Optional label displayed at the edge midpoint */
  label?: string
  /** When true, shows a marching-ants animation on the edge */
  animated?: boolean
  /** When false, hides the arrowhead and draws an undirected line. Default: true */
  directed?: boolean
}

// ─── Internal constants ────────────────────────────────────────────────────────

const NODE_W = 148
const NODE_H = 46
const ICON_W = 28
const ICON_PAD = 10
const LABEL_X = ICON_PAD + ICON_W + 8
/** Arrow marker size — used to offset edge endpoint so line doesn't overlap arrowhead */
const ARROW_OFFSET = 6

// ─── Node color presets ───────────────────────────────────────────────────────

const NODE_COLOR_CLASSES: Record<
  NonNullable<NetworkGraphNode["color"]>,
  { rect: string; iconBg: string; label: string; subtitle: string }
> = {
  default:     { rect: "fill-card stroke-border",              iconBg: "fill-muted",           label: "fill-card-foreground",      subtitle: "fill-muted-foreground" },
  primary:     { rect: "fill-primary stroke-primary",          iconBg: "fill-primary/20",      label: "fill-primary-foreground",   subtitle: "fill-primary-foreground/70" },
  secondary:   { rect: "fill-secondary stroke-border",         iconBg: "fill-secondary/50",    label: "fill-secondary-foreground", subtitle: "fill-secondary-foreground/70" },
  destructive: { rect: "fill-destructive stroke-destructive",  iconBg: "fill-destructive/20",  label: "fill-destructive-foreground", subtitle: "fill-destructive-foreground/70" },
  accent:      { rect: "fill-accent stroke-accent",            iconBg: "fill-accent/50",       label: "fill-accent-foreground",    subtitle: "fill-accent-foreground/70" },
}

// ─── NetworkGraphNodeCard ──────────────────────────────────────────────────────

export interface NetworkGraphNodeCardProps
  extends React.ComponentProps<"g"> {
  node: NetworkGraphNode
  position: { x: number; y: number }
  selected?: boolean
  interactive?: boolean
  onNodePointerDown?: (e: React.PointerEvent<SVGGElement>, id: string) => void
  onNodeSelect?: (id: string) => void
}

function NetworkGraphNodeCard({
  node,
  position,
  selected = false,
  interactive = true,
  onNodePointerDown,
  onNodeSelect,
  className,
  style,
  ...props
}: NetworkGraphNodeCardProps) {
    const x = position.x - NODE_W / 2
    const y = position.y - NODE_H / 2
    const hasSub = Boolean(node.subtitle)
    const cc = NODE_COLOR_CLASSES[node.color ?? "default"]

    return (
      <g
        data-slot="network-graph-node"
        data-selected={selected || undefined}
        data-interactive={interactive || undefined}
        className={cn(
          interactive && "cursor-grab active:cursor-grabbing",
          className
        )}
        transform={`translate(${x},${y})`}
        onPointerDown={
          interactive
            ? (e) => {
                e.stopPropagation()
                onNodePointerDown?.(e, node.id)
              }
            : undefined
        }
        onClick={
          interactive
            ? (e) => {
                e.stopPropagation()
                onNodeSelect?.(node.id)
              }
            : undefined
        }
        role={interactive ? "button" : undefined}
        aria-label={node.label}
        aria-pressed={interactive ? selected : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={
          interactive
            ? (e) => e.key === "Enter" && onNodeSelect?.(node.id)
            : undefined
        }
        // drop-shadow equivalent of shadcn Card's shadow-sm for SVG elements
        // (Tailwind shadow-* utilities don't apply to SVG <g>)
        style={{
          filter: `drop-shadow(0 1px 2px hsl(var(--foreground) / 0.06))`,
          transition: "filter 150ms ease",
          ...style,
        }}
        {...props}
      >
        {/* Card background — matches shadcn <Card> shell exactly */}
        <rect
          data-slot="network-graph-node-rect"
          width={NODE_W}
          height={NODE_H}
          rx={6}
          className={cn(
            cc.rect,
            "[stroke-width:1]",
            "transition-[stroke,stroke-width] duration-150",
            selected && "stroke-ring [stroke-width:2]"
          )}
        />

        {/* Icon background — bg-muted */}
        <rect
          data-slot="network-graph-node-icon-bg"
          x={ICON_PAD}
          y={(NODE_H - ICON_W) / 2}
          width={ICON_W}
          height={ICON_W}
          rx={4}
          className={cc.iconBg}
        />

        {/* Icon */}
        <text
          data-slot="network-graph-node-icon"
          x={ICON_PAD + ICON_W / 2}
          y={NODE_H / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={14}
          className="pointer-events-none select-none"
        >
          {node.icon ?? "◈"}
        </text>

        {/* Label — text-[12px] font-medium fill-card-foreground */}
        <text
          data-slot="network-graph-node-label"
          x={LABEL_X}
          y={NODE_H / 2 - (hasSub ? 7 : 0)}
          dominantBaseline="middle"
          fontSize={12}
          fontWeight={500}
          className={cn("pointer-events-none select-none", cc.label)}
        >
          {node.label}
        </text>

        {/* Subtitle — text-[10px] fill-muted-foreground */}
        {hasSub && (
          <text
            data-slot="network-graph-node-subtitle"
            x={LABEL_X}
            y={NODE_H / 2 + 8}
            dominantBaseline="middle"
            fontSize={10}
            className={cn("pointer-events-none select-none", cc.subtitle)}
          >
            {node.subtitle}
          </text>
        )}
      </g>
    )
}

// ─── NetworkGraphEdgeLine ──────────────────────────────────────────────────────

export interface NetworkGraphEdgeLineProps
  extends React.ComponentProps<"line"> {
  edge: NetworkGraphEdge
  positions: Record<string, { x: number; y: number }>
  highlighted?: boolean
}

function NetworkGraphEdgeLine({ edge, positions, highlighted = false, className, ...props }: NetworkGraphEdgeLineProps) {
  const s = positions[edge.source]
  const t = positions[edge.target]
  if (!s || !t) return null

  // Exit source node bounding box, enter target offset by arrow marker size
  const nodeBounds = { width: NODE_W, height: NODE_H }
  const exit = getNodeExitPoint(s, t, nodeBounds)

  // For the entry point: flip direction (target → source) to get target border exit,
  // then offset inward by ARROW_OFFSET so arrowhead doesn't overlap the node
  const dx = t.x - s.x
  const dy = t.y - s.y
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const ux = dx / dist
  const uy = dy / dist
  const entry = getNodeExitPoint(t, s, nodeBounds)
  const arrowOff = edge.directed === false ? 0 : ARROW_OFFSET
  const x2 = entry.x + ux * arrowOff
  const y2 = entry.y + uy * arrowOff

  return (
    <line
      data-slot="network-graph-edge"
      data-highlighted={highlighted || undefined}
      className={cn(
        "stroke-border transition-[stroke,stroke-width] duration-150",
        highlighted && "stroke-muted-foreground",
        edge.animated && "ng-animated-edge",
        className
      )}
      strokeWidth={highlighted ? 2 : 1.5}
      x1={exit.x}
      y1={exit.y}
      x2={x2}
      y2={y2}
      markerEnd={
        edge.directed === false
          ? undefined
          : highlighted ? "url(#ng-arrow-hi)" : "url(#ng-arrow)"
      }
      {...props}
    />
  )
}

// ─── NetworkGraphEdgeLabel ─────────────────────────────────────────────────────

export interface NetworkGraphEdgeLabelProps
  extends React.ComponentProps<"g"> {
  label: string
  x: number
  y: number
  highlighted?: boolean
}

function NetworkGraphEdgeLabel({ label, x, y, highlighted = false, className, ...props }: NetworkGraphEdgeLabelProps) {
  // Heuristic sizing: ~6px per char at 10px font, 8px horizontal padding, 16px height
  const textW = label.length * 6
  const padX = 4
  const padY = 2
  const rw = textW + padX * 2
  const rh = 14 + padY * 2

  return (
    <g
      data-slot="network-graph-edge-label"
      className={cn("pointer-events-none", className)}
      transform={`translate(${x - rw / 2},${y - rh / 2})`}
      {...props}
    >
      <rect
        width={rw}
        height={rh}
        rx={4}
        className={cn(
          "fill-card stroke-border [stroke-width:0.5]",
          highlighted && "stroke-muted-foreground"
        )}
      />
      <text
        x={rw / 2}
        y={rh / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
        className={cn(
          "select-none fill-muted-foreground",
          highlighted && "fill-foreground"
        )}
      >
        {label}
      </text>
    </g>
  )
}

// ─── Convex hull utilities ────────────────────────────────────────────────────

function cross(o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}

/** Graham scan — returns hull vertices in CCW order */
function convexHull(pts: { x: number; y: number }[]): { x: number; y: number }[] {
  const sorted = [...pts].sort((a, b) => a.x - b.x || a.y - b.y)
  if (sorted.length <= 2) return sorted
  const lower: typeof sorted = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop()
    lower.push(p)
  }
  const upper: typeof sorted = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop()
    upper.push(p)
  }
  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

/** Expand hull outward from centroid and build a rounded SVG path */
function hullPath(pts: { x: number; y: number }[], pad: number): string {
  if (pts.length === 0) return ""
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length

  if (pts.length === 1) {
    const x = pts[0].x - NODE_W / 2 - pad
    const y = pts[0].y - NODE_H / 2 - pad
    const w = NODE_W + pad * 2
    const h = NODE_H + pad * 2
    const r = Math.min(pad, 16)
    return `M${x + r},${y} h${w - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - 2 * r} a${r},${r} 0 0 1 -${r},${r} h-${w - 2 * r} a${r},${r} 0 0 1 -${r},-${r} v-${h - 2 * r} a${r},${r} 0 0 1 ${r},-${r} Z`
  }

  // Expand each point outward from centroid
  const expanded = pts.map((p) => {
    const dx = p.x - cx
    const dy = p.y - cy
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    return { x: p.x + (dx / dist) * pad, y: p.y + (dy / dist) * pad }
  })

  // Build rounded polygon path with quadratic curves at corners
  const n = expanded.length
  const parts: string[] = []
  for (let i = 0; i < n; i++) {
    const curr = expanded[i]
    const next = expanded[(i + 1) % n]
    const mx = (curr.x + next.x) / 2
    const my = (curr.y + next.y) / 2
    if (i === 0) parts.push(`M${mx},${my}`)
    parts.push(`Q${next.x},${next.y} ${(next.x + expanded[(i + 2) % n].x) / 2},${(next.y + expanded[(i + 2) % n].y) / 2}`)
  }
  parts.push("Z")
  return parts.join(" ")
}

// ─── NetworkGraphGroup ────────────────────────────────────────────────────────

export interface NetworkGraphGroupProps
  extends React.ComponentProps<"g"> {
  groupId: string
  nodes: NetworkGraphNode[]
  positions: Record<string, { x: number; y: number }>
}

function NetworkGraphGroup({ groupId, nodes, positions, className, ...props }: NetworkGraphGroupProps) {
  const pts = nodes
    .filter((n) => positions[n.id])
    .map((n) => positions[n.id])
  if (pts.length === 0) return null

  const hull = pts.length >= 3 ? convexHull(pts) : pts
  const pathD = hullPath(hull, 32)
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
  const cy = Math.min(...pts.map((p) => p.y)) - NODE_H / 2 - 24

  return (
    <g
      data-slot="network-graph-group"
      className={cn("pointer-events-none", className)}
      {...props}
    >
      <path
        d={pathD}
        className="fill-muted/30 stroke-border [stroke-width:1.5] [stroke-dasharray:4_3]"
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fontWeight={500}
        className="select-none fill-muted-foreground"
      >
        {groupId}
      </text>
    </g>
  )
}

// ─── NetworkGraphControls ──────────────────────────────────────────────────────
// Uses actual shadcn <Button variant="outline" size="icon"> — no custom classes

export interface NetworkGraphControlsProps
  extends React.ComponentProps<"div"> {
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFit?: () => void
  onExportSVG?: () => void
  onExportPNG?: () => void
}

function NetworkGraphControls({ onZoomIn, onZoomOut, onFit, onExportSVG, onExportPNG, className, ...props }: NetworkGraphControlsProps) {
  return (
    <div
      data-slot="network-graph-controls"
      className={cn("absolute bottom-3 right-3 flex flex-col gap-1", className)}
      {...props}
    >
      <Button variant="outline" size="icon" className="size-7" onClick={onZoomIn} aria-label="Zoom in">
        <ZoomIn />
      </Button>
      <Button variant="outline" size="icon" className="size-7" onClick={onZoomOut} aria-label="Zoom out">
        <ZoomOut />
      </Button>
      <Button variant="outline" size="icon" className="size-7" onClick={onFit} aria-label="Reset view">
        <Maximize2 />
      </Button>
      {onExportSVG && (
        <Button variant="outline" size="icon" className="size-7" onClick={onExportSVG} aria-label="Export SVG">
          <Download />
        </Button>
      )}
      {onExportPNG && (
        <Button variant="outline" size="icon" className="size-7" onClick={onExportPNG} aria-label="Export PNG">
          <ImageDown />
        </Button>
      )}
    </div>
  )
}

// ─── NetworkGraphNodeInfo ──────────────────────────────────────────────────────
// Bottom-center status bar shown when a node is selected.
// Styled like shadcn's inline badge/popover pattern.

export interface NetworkGraphNodeInfoProps
  extends React.ComponentProps<"div"> {
  node: NetworkGraphNode
  connectionCount: number
}

function NetworkGraphNodeInfo({ node, connectionCount, className, ...props }: NetworkGraphNodeInfoProps) {
  return (
    <div
      data-slot="network-graph-node-info"
      role="status"
      aria-live="polite"
      className={cn(
        "absolute bottom-3 left-1/2 -translate-x-1/2",
        "flex items-center gap-1.5",
        "rounded-md border bg-card px-2.5 py-1",
        "text-xs text-muted-foreground shadow-sm",
        "pointer-events-none whitespace-nowrap",
        className
      )}
      {...props}
    >
      <span className="text-xs font-medium text-card-foreground">
        {node.label}
      </span>
      {node.subtitle && (
        <>
          <span className="h-3 w-px bg-border" aria-hidden="true" />
          <span>{node.subtitle}</span>
        </>
      )}
      <span className="h-3 w-px bg-border" aria-hidden="true" />
      <span>
        {connectionCount} connection{connectionCount !== 1 ? "s" : ""}
      </span>
    </div>
  )
}

// ─── NetworkGraphSearch ────────────────────────────────────────────────────────

export interface NetworkGraphSearchProps
  extends React.ComponentProps<"div"> {
  query: string
  onQueryChange: (q: string) => void
}

function NetworkGraphSearch({ query, onQueryChange, className, ...props }: NetworkGraphSearchProps) {
  return (
    <div
      data-slot="network-graph-search"
      className={cn("absolute top-3 left-3 w-48", className)}
      {...props}
    >
      <input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search nodes…"
        className={cn(
          "flex h-7 w-full rounded-md border border-input bg-background px-2 py-1",
          "text-xs ring-offset-background",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        aria-label="Search nodes"
      />
    </div>
  )
}

// ─── NetworkGraphMinimap ──────────────────────────────────────────────────────

const MINIMAP_W = 160
const MINIMAP_H = 100

export interface NetworkGraphMinimapProps
  extends React.ComponentProps<"svg"> {
  graphNodes: NetworkGraphNode[]
  positions: Record<string, { x: number; y: number }>
  tf: { x: number; y: number; scale: number }
  viewWidth: number
  viewHeight: number
  onNavigate?: (tf: { x: number; y: number; scale: number }) => void
}

function NetworkGraphMinimap({ graphNodes, positions, tf, viewWidth, viewHeight, onNavigate, className, ...props }: NetworkGraphMinimapProps) {
    const pts = graphNodes.map((n) => positions[n.id]).filter(Boolean)
    if (pts.length === 0) return null

    const pad = 8
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of pts) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
    const gw = maxX - minX || 1
    const gh = maxY - minY || 1
    const mmScale = Math.min(
      (MINIMAP_W - pad * 2) / gw,
      (MINIMAP_H - pad * 2) / gh
    )

    // Viewport rect in minimap coords
    const vpLeft = (-tf.x / tf.scale - minX) * mmScale + pad
    const vpTop = (-tf.y / tf.scale - minY) * mmScale + pad
    const vpW = (viewWidth / tf.scale) * mmScale
    const vpH = (viewHeight / tf.scale) * mmScale

    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
      if (!onNavigate) return
      const rect = e.currentTarget.getBoundingClientRect()
      const ex = e.clientX - rect.left
      const ey = e.clientY - rect.top
      const worldX = (ex - pad) / mmScale + minX
      const worldY = (ey - pad) / mmScale + minY
      onNavigate({
        scale: tf.scale,
        x: viewWidth / 2 - worldX * tf.scale,
        y: viewHeight / 2 - worldY * tf.scale,
      })
    }

    return (
      <svg
        data-slot="network-graph-minimap"
        width={MINIMAP_W}
        height={MINIMAP_H}
        className={cn(
          "absolute top-3 right-3 cursor-pointer",
          "hidden sm:block rounded border bg-card/80 backdrop-blur-sm",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        <rect
          data-slot="network-graph-minimap-bg"
          width={MINIMAP_W}
          height={MINIMAP_H}
          className="fill-muted/50"
          rx={4}
        />
        {graphNodes.map((n) => {
          const pos = positions[n.id]
          if (!pos) return null
          const mx = (pos.x - minX) * mmScale + pad
          const my = (pos.y - minY) * mmScale + pad
          return (
            <rect
              key={n.id}
              data-slot="network-graph-minimap-node"
              x={mx - 3}
              y={my - 2}
              width={6}
              height={4}
              rx={1}
              className="fill-muted-foreground/70"
            />
          )
        })}
        <rect
          data-slot="network-graph-minimap-viewport"
          x={vpLeft}
          y={vpTop}
          width={vpW}
          height={vpH}
          rx={2}
          className="fill-transparent stroke-ring [stroke-width:1.5]"
        />
      </svg>
    )
}

// ─── NetworkGraph (root) ───────────────────────────────────────────────────────

export interface NetworkGraphProps extends React.ComponentProps<"div"> {
  nodes?: NetworkGraphNode[]
  edges?: NetworkGraphEdge[]
  width?: number
  height?: number
  /** When false, disables all pan, zoom, and node drag interactions. Default: true */
  interactive?: boolean
  /** Called when the selected node changes. Receives the node id, or null when deselected. */
  onSelectionChange?: (id: string | null) => void
  /** Custom simulation parameters. Merged with defaults. */
  simulationConfig?: Partial<SimulationConfig>
  /** Layout algorithm. Default: "force" */
  layout?: "force" | "tree" | "radial"
  /** Show a search/filter input. Default: false */
  searchable?: boolean
  /** Show a minimap overview. Default: false */
  minimap?: boolean
  /** Show export PNG/SVG buttons. Default: false */
  exportable?: boolean
  /** When false, all edges are drawn without arrowheads (undirected). Per-edge `directed` overrides this. Default: true */
  directed?: boolean
}

function NetworkGraph({
  nodes = [],
  edges = [],
  width = 800,
  height = 500,
  interactive = true,
  onSelectionChange,
  simulationConfig,
  layout = "force",
  searchable = false,
  minimap: showMinimap = false,
  exportable = false,
  directed: globalDirected = true,
  className,
  ...props
}: NetworkGraphProps) {
    const [positions, setPositions] = React.useState<
      Record<string, { x: number; y: number }>
    >({})
    const [tf, setTf] = React.useState({ x: 0, y: 0, scale: 1 })
    const [selected, setSelected] = React.useState<string | null>(null)
    const [simDone, setSimDone] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")

    const svgRef = React.useRef<SVGSVGElement>(null)
    const dragRef = React.useRef<{ id: string; sx: number; sy: number } | null>(
      null
    )
    const panRef = React.useRef<{
      sx: number
      sy: number
      ox: number
      oy: number
    } | null>(null)

    // Keep a ref to the latest tf so pointer handlers never read stale closures
    const tfRef = React.useRef(tf)
    tfRef.current = tf

    // Track active global listeners for cleanup on unmount
    const cleanupFnsRef = React.useRef<Set<() => void>>(new Set())
    React.useEffect(() => {
      return () => {
        // Clean up any lingering global listeners on unmount
        for (const fn of cleanupFnsRef.current) fn()
        cleanupFnsRef.current.clear()
      }
    }, [])

    // ── Selection helper — keeps internal state + fires callback ─────────────
    const select = React.useCallback(
      (id: string | null) => {
        setSelected(id)
        onSelectionChange?.(id)
      },
      [onSelectionChange]
    )

    // ── Fit-to-content ─────────────────────────────────────────────────────
    const fit = React.useCallback(() => {
      const pts = Object.values(positions)
      if (!pts.length) return setTf({ x: 0, y: 0, scale: 1 })
      const pad = 40
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const p of pts) {
        minX = Math.min(minX, p.x - NODE_W / 2)
        minY = Math.min(minY, p.y - NODE_H / 2)
        maxX = Math.max(maxX, p.x + NODE_W / 2)
        maxY = Math.max(maxY, p.y + NODE_H / 2)
      }
      const bw = maxX - minX + pad * 2
      const bh = maxY - minY + pad * 2
      const s = Math.max(0.2, Math.min(2, Math.min(width / bw, height / bh)))
      setTf({
        scale: s,
        x: (width - (minX + maxX) * s) / 2,
        y: (height - (minY + maxY) * s) / 2,
      })
    }, [positions, width, height])

    // ── Layout / Force simulation ────────────────────────────────────────────
    const hasFitted = React.useRef(false)
    React.useEffect(() => {
      if (!nodes.length) return
      setSimDone(false)
      hasFitted.current = false

      // Static layouts — skip force simulation entirely
      if (layout === "tree" || layout === "radial") {
        const fn = layout === "tree" ? computeTreeLayout : computeRadialLayout
        const pos = fn(nodes, edges, width, height)
        setPositions(pos)
        setSimDone(true)
        return
      }

      // Force-directed layout (default)
      const toMap = (pos: SimNode[]) => {
        const m: Record<string, { x: number; y: number }> = {}
        nodes.forEach((n, i) => (m[n.id] = { x: pos[i].x, y: pos[i].y }))
        return m
      }

      return runSimulation(
        nodes,
        edges,
        width,
        height,
        (pos) => setPositions(toMap(pos)),
        (pos) => {
          setPositions(toMap(pos))
          setSimDone(true)
        },
        simulationConfig
      )
    }, [nodes, edges, width, height, simulationConfig, layout])

    // ── Auto-fit once simulation settles ──────────────────────────────────────
    React.useEffect(() => {
      if (!simDone || hasFitted.current) return
      hasFitted.current = true
      requestAnimationFrame(() => fit())
    }, [simDone, fit])

    // ── Node drag ────────────────────────────────────────────────────────────
    const onNodePointerDown = React.useCallback(
      (e: React.PointerEvent<SVGGElement>, id: string) => {
        if (!interactive || e.button !== 0) return
        try {
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
        } catch {
          // Pointer may already be released on mobile — safe to ignore
        }
        dragRef.current = { id, sx: e.clientX, sy: e.clientY }

        const onMove = (ev: PointerEvent) => {
          if (!dragRef.current) return
          const dx = (ev.clientX - dragRef.current.sx) / tfRef.current.scale
          const dy = (ev.clientY - dragRef.current.sy) / tfRef.current.scale
          dragRef.current.sx = ev.clientX
          dragRef.current.sy = ev.clientY
          setPositions((p) => ({
            ...p,
            [id]: { x: p[id].x + dx, y: p[id].y + dy },
          }))
        }

        const cleanup = () => {
          dragRef.current = null
          window.removeEventListener("pointermove", onMove)
          window.removeEventListener("pointerup", cleanup)
          window.removeEventListener("pointercancel", cleanup)
          cleanupFnsRef.current.delete(cleanup)
        }

        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", cleanup)
        window.addEventListener("pointercancel", cleanup)
        cleanupFnsRef.current.add(cleanup)
      },
      [interactive]
    )

    // ── Canvas pan + pinch-zoom ───────────────────────────────────────────────
    const pointersRef = React.useRef<Map<number, { x: number; y: number }>>(
      new Map()
    )
    const pinchRef = React.useRef<{ dist: number; mx: number; my: number } | null>(
      null
    )

    const onSvgPointerDown = React.useCallback(
      (e: React.PointerEvent<SVGSVGElement>) => {
        if (!interactive || e.button !== 0) return
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

        // If two fingers, start pinch tracking
        if (pointersRef.current.size === 2) {
          const [a, b] = [...pointersRef.current.values()]
          const dist = Math.hypot(b.x - a.x, b.y - a.y)
          pinchRef.current = { dist: dist || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }
          panRef.current = null // cancel any active pan
          return
        }

        const t = tfRef.current
        panRef.current = { sx: e.clientX, sy: e.clientY, ox: t.x, oy: t.y }

        const onMove = (ev: PointerEvent) => {
          pointersRef.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })

          // Pinch-zoom with two pointers
          if (pointersRef.current.size >= 2 && pinchRef.current) {
            const pts = [...pointersRef.current.values()]
            const newDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
            const factor = pinchRef.current.dist > 0 ? newDist / pinchRef.current.dist : 1
            const el = svgRef.current
            if (!el) return
            const rect = el.getBoundingClientRect()
            const mx = (pts[0].x + pts[1].x) / 2 - rect.left
            const my = (pts[0].y + pts[1].y) / 2 - rect.top
            setTf((prev) => {
              const ns = Math.max(0.2, Math.min(3, prev.scale * factor))
              return {
                scale: ns,
                x: mx - (mx - prev.x) * (ns / prev.scale),
                y: my - (my - prev.y) * (ns / prev.scale),
              }
            })
            pinchRef.current.dist = newDist || 1
            return
          }

          // Single-pointer pan — capture locally so the ref can't go null
          // between the guard and when React executes the updater callback.
          const pan = panRef.current
          if (!pan) return
          setTf((prev) => ({
            ...prev,
            x: pan.ox + ev.clientX - pan.sx,
            y: pan.oy + ev.clientY - pan.sy,
          }))
        }

        const onUp = (ev: PointerEvent) => {
          pointersRef.current.delete(ev.pointerId)
          if (pointersRef.current.size < 2) pinchRef.current = null
          if (pointersRef.current.size === 0) {
            panRef.current = null
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            cleanupFnsRef.current.delete(removeAll)
          }
        }

        const removeAll = () => {
          pointersRef.current.clear()
          pinchRef.current = null
          panRef.current = null
          window.removeEventListener("pointermove", onMove)
          window.removeEventListener("pointerup", onUp)
          window.removeEventListener("pointercancel", onUp)
        }

        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)
        cleanupFnsRef.current.add(removeAll)
      },
      [interactive]
    )

    // ── Scroll zoom ──────────────────────────────────────────────────────────
    React.useEffect(() => {
      if (!interactive) return
      const el = svgRef.current
      if (!el) return

      const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        setTf((t) => {
          const ns = Math.max(0.2, Math.min(3, t.scale * delta))
          const rect = el.getBoundingClientRect()
          const mx = e.clientX - rect.left
          const my = e.clientY - rect.top
          // Zoom toward cursor point (standard zoom-to-point formula)
          return {
            scale: ns,
            x: mx - (mx - t.x) * (ns / t.scale),
            y: my - (my - t.y) * (ns / t.scale),
          }
        })
      }

      el.addEventListener("wheel", onWheel, { passive: false })
      return () => el.removeEventListener("wheel", onWheel)
    }, [interactive])

    const zoomBy = React.useCallback(
      (factor: number) =>
        setTf((t) => {
          const ns = Math.max(0.2, Math.min(3, t.scale * factor))
          const cx = width / 2
          const cy = height / 2
          return {
            scale: ns,
            x: cx - (cx - t.x) * (ns / t.scale),
            y: cy - (cy - t.y) * (ns / t.scale),
          }
        }),
      [width, height]
    )

    // ── Export helpers ─────────────────────────────────────────────────────────
    const cloneAndInlineSVG = React.useCallback(() => {
      const el = svgRef.current
      if (!el) return null
      const clone = el.cloneNode(true) as SVGSVGElement
      const allEls = [
        clone,
        ...Array.from(clone.querySelectorAll("*")),
      ] as Element[]
      for (const child of allEls) {
        const computed = window.getComputedStyle(child)
        const s = (child as SVGElement | HTMLElement).style
        for (const prop of [
          "fill",
          "stroke",
          "stroke-width",
          "font-size",
          "font-family",
          "font-weight",
          "opacity",
        ]) {
          const val = computed.getPropertyValue(prop)
          if (val) s.setProperty(prop, val)
        }
      }
      clone
        .querySelectorAll(".ng-animated-edge")
        .forEach((el) => el.classList.remove("ng-animated-edge"))
      return clone
    }, [])

    const exportSVG = React.useCallback(() => {
      const clone = cloneAndInlineSVG()
      if (!clone) return
      const xml = new XMLSerializer().serializeToString(clone)
      const blob = new Blob([xml], { type: "image/svg+xml" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "network-graph.svg"
      a.click()
      URL.revokeObjectURL(url)
    }, [cloneAndInlineSVG])

    const exportPNG = React.useCallback(() => {
      const clone = cloneAndInlineSVG()
      if (!clone) return
      const xml = new XMLSerializer().serializeToString(clone)
      const blob = new Blob([xml], { type: "image/svg+xml" })
      const url = URL.createObjectURL(blob)
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = width * 2
        canvas.height = height * 2
        const ctx = canvas.getContext("2d")!
        ctx.scale(2, 2)
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
        const a = document.createElement("a")
        a.href = canvas.toDataURL("image/png")
        a.download = "network-graph.png"
        a.click()
      }
      img.src = url
    }, [cloneAndInlineSVG, width, height])

    // ── Highlighted edges (connected to selected node) ───────────────────────
    const hiEdgeKeys = React.useMemo<Set<string>>(
      () =>
        selected
          ? new Set(
              edges
                .filter(
                  (e) => e.source === selected || e.target === selected
                )
                .map((e) => getEdgeKey(e.source, e.target))
            )
          : new Set(),
      [selected, edges]
    )

    // ── Group ids for hull rendering ──────────────────────────────────────
    const groupIds = React.useMemo(
      () => [...new Set(nodes.flatMap((n) => (n.group ? [n.group] : [])))],
      [nodes]
    )

    const selNode = nodes.find((n) => n.id === selected)
    const connCount = React.useMemo(
      () =>
        selected
          ? edges.filter(
              (e) => e.source === selected || e.target === selected
            ).length
          : 0,
      [selected, edges]
    )

    // ── Search filter ───────────────────────────────────────────────────────
    const matchedIds = React.useMemo<Set<string>>(() => {
      if (!searchable || !searchQuery.trim())
        return new Set(nodes.map((n) => n.id))
      const q = searchQuery.toLowerCase()
      return new Set(
        nodes
          .filter(
            (n) =>
              n.label.toLowerCase().includes(q) ||
              (n.subtitle?.toLowerCase().includes(q) ?? false)
          )
          .map((n) => n.id)
      )
    }, [searchable, searchQuery, nodes])

    return (
      <div
        data-slot="network-graph"
        data-interactive={interactive || undefined}
        className={cn(
          // Matches shadcn Card shell
          "relative overflow-hidden rounded-lg border bg-background",
          "select-none touch-none",
          className
        )}
        style={{ width, height }}
        {...props}
      >
        <svg
          ref={svgRef}
          width={width}
          height={height}
          onPointerDown={onSvgPointerDown}
          onClick={() => select(null)}
          className="block touch-none"
          aria-label="Network graph"
          role="img"
        >
          <defs>
            {/*
             * Two arrowhead markers — one per highlight state.
             *
             * Why two markers instead of one with dynamic fill?
             * SVG <marker> content is painted in a separate context where
             * CSS custom properties (hsl(var(--...))) are not reliably
             * resolved at paint time across all browsers.
             *
             * Solution: classed <path> inside each marker, styled by
             * Tailwind's fill-* utilities which compile to concrete values.
             */}
            <marker
              id="ng-arrow"
              markerWidth={6}
              markerHeight={6}
              refX={5}
              refY={3}
              orient="auto"
            >
              <path d="M0,0 L0,6 L6,3 z" className="fill-border" />
            </marker>
            <marker
              id="ng-arrow-hi"
              markerWidth={6}
              markerHeight={6}
              refX={5}
              refY={3}
              orient="auto"
            >
              <path
                d="M0,0 L0,6 L6,3 z"
                className="fill-muted-foreground"
              />
            </marker>
          </defs>

          <g
            transform={`translate(${tf.x},${tf.y}) scale(${tf.scale})`}
          >
            {/* Group hulls — rendered behind everything else */}
            {groupIds.length > 0 && (
              <g aria-hidden="true">
                {groupIds.map((gid) => (
                  <NetworkGraphGroup
                    key={gid}
                    groupId={gid}
                    nodes={nodes.filter((n) => n.group === gid)}
                    positions={positions}
                  />
                ))}
              </g>
            )}

            {/* Edges — rendered behind nodes, decorative for a11y */}
            <g aria-hidden="true">
              {edges.map((e) => {
                const edgeMatch =
                  matchedIds.has(e.source) || matchedIds.has(e.target)
                const resolvedEdge = e.directed === undefined ? { ...e, directed: globalDirected } : e
                return (
                  <NetworkGraphEdgeLine
                    key={getEdgeKey(e.source, e.target)}
                    edge={resolvedEdge}
                    positions={positions}
                    highlighted={hiEdgeKeys.has(
                      getEdgeKey(e.source, e.target)
                    )}
                    style={{ opacity: edgeMatch ? undefined : 0.15 }}
                  />
                )
              })}
            </g>

            {/* Edge labels — rendered above edge lines, below nodes */}
            <g aria-hidden="true">
              {edges.map((e) => {
                if (!e.label) return null
                const s = positions[e.source]
                const t = positions[e.target]
                if (!s || !t) return null
                const nodeBounds = { width: NODE_W, height: NODE_H }
                const exit = getNodeExitPoint(s, t, nodeBounds)
                const entry = getNodeExitPoint(t, s, nodeBounds)
                const mx = (exit.x + entry.x) / 2
                const my = (exit.y + entry.y) / 2
                const key = getEdgeKey(e.source, e.target)
                return (
                  <NetworkGraphEdgeLabel
                    key={`label-${key}`}
                    label={e.label}
                    x={mx}
                    y={my}
                    highlighted={hiEdgeKeys.has(key)}
                  />
                )
              })}
            </g>

            {/* Nodes — fade in once simulation settles */}
            <g
              style={{
                opacity: simDone ? 1 : 0.5,
                transition: "opacity 350ms ease",
              }}
            >
              {nodes.map((node) => {
                if (!positions[node.id]) return null
                const nodeMatch = matchedIds.has(node.id)
                return (
                  <NetworkGraphNodeCard
                    key={node.id}
                    node={node}
                    position={positions[node.id]}
                    selected={selected === node.id}
                    interactive={interactive && nodeMatch}
                    onNodePointerDown={onNodePointerDown}
                    onNodeSelect={select}
                    style={
                      nodeMatch
                        ? undefined
                        : { opacity: 0.15, pointerEvents: "none" as const }
                    }
                  />
                )
              })}
            </g>
          </g>
        </svg>

        {/* Search input */}
        {searchable && (
          <NetworkGraphSearch
            query={searchQuery}
            onQueryChange={setSearchQuery}
          />
        )}

        {/* Minimap */}
        {showMinimap && (
          <NetworkGraphMinimap
            graphNodes={nodes}
            positions={positions}
            tf={tf}
            viewWidth={width}
            viewHeight={height}
            onNavigate={interactive ? setTf : undefined}
          />
        )}

        {/* Zoom controls — only shown when interactive */}
        {interactive && (
          <NetworkGraphControls
            onZoomIn={() => zoomBy(1.2)}
            onZoomOut={() => zoomBy(0.8)}
            onFit={fit}
            onExportSVG={exportable ? exportSVG : undefined}
            onExportPNG={exportable ? exportPNG : undefined}
          />
        )}

        {/* Selected node info tooltip */}
        {selNode && (
          <NetworkGraphNodeInfo node={selNode} connectionCount={connCount} />
        )}
      </div>
    )
}

// ─── Exports ───────────────────────────────────────────────────────────────────
// Named exports for every composable piece (same pattern as card.tsx, dialog.tsx)

export {
  NetworkGraph,
  NetworkGraphNodeCard,
  NetworkGraphEdgeLine,
  NetworkGraphEdgeLabel,
  NetworkGraphGroup,
  NetworkGraphSearch,
  NetworkGraphMinimap,
  NetworkGraphControls,
  NetworkGraphNodeInfo,
}
