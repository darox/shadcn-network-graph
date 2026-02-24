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
 *  - React.forwardRef + displayName on every export
 *  - TypeScript interfaces extending the correct HTML/SVG element types
 *  - Tailwind semantic classes only (fill-card, stroke-border, etc.)
 *  - Uses shadcn <Button> and lucide-react icons
 *  - Named + default exports
 *
 * Dependencies (already in any shadcn project):
 *   lucide-react, @/lib/utils (cn), @/components/ui/button
 */

import * as React from "react"
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  runSimulation,
  getNodeExitPoint,
  getEdgeKey,
  type SimNode,
} from "@/components/ui/network-graph-simulation"

// ─── Public types ──────────────────────────────────────────────────────────────

export interface NetworkGraphNode {
  id: string
  label: string
  subtitle?: string
  /** Emoji or short string rendered in the icon slot */
  icon?: string
}

export interface NetworkGraphEdge {
  source: string
  target: string
  /** Reserved for v2 — edge label rendering */
  // label?: string
}

// ─── Internal constants ────────────────────────────────────────────────────────

const NODE_W = 148
const NODE_H = 46
const ICON_W = 28
const ICON_PAD = 10
const LABEL_X = ICON_PAD + ICON_W + 8
/** Arrow marker size — used to offset edge endpoint so line doesn't overlap arrowhead */
const ARROW_OFFSET = 6

// ─── NetworkGraphNodeCard ──────────────────────────────────────────────────────

export interface NetworkGraphNodeCardProps
  extends React.SVGAttributes<SVGGElement> {
  node: NetworkGraphNode
  position: { x: number; y: number }
  selected?: boolean
  interactive?: boolean
  onNodeMouseDown?: (e: React.MouseEvent<SVGGElement>, id: string) => void
  onNodeSelect?: (id: string) => void
}

const NetworkGraphNodeCard = React.forwardRef<
  SVGGElement,
  NetworkGraphNodeCardProps
>(
  (
    {
      node,
      position,
      selected = false,
      interactive = true,
      onNodeMouseDown,
      onNodeSelect,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const x = position.x - NODE_W / 2
    const y = position.y - NODE_H / 2
    const hasSub = Boolean(node.subtitle)

    return (
      <g
        ref={ref}
        data-slot="network-graph-node"
        data-selected={selected || undefined}
        data-interactive={interactive || undefined}
        className={cn(
          interactive && "cursor-grab active:cursor-grabbing",
          className
        )}
        transform={`translate(${x},${y})`}
        onMouseDown={
          interactive
            ? (e) => {
                e.stopPropagation()
                onNodeMouseDown?.(e, node.id)
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
            "fill-card stroke-border",
            "[stroke-width:1]",
            "transition-[stroke,stroke-width] duration-150",
            // selected → ring pattern (stroke-ring, stroke-width:2)
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
          className="fill-muted"
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
          className="pointer-events-none select-none fill-card-foreground"
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
            className="pointer-events-none select-none fill-muted-foreground"
          >
            {node.subtitle}
          </text>
        )}
      </g>
    )
  }
)
NetworkGraphNodeCard.displayName = "NetworkGraphNodeCard"

// ─── NetworkGraphEdgeLine ──────────────────────────────────────────────────────

export interface NetworkGraphEdgeLineProps
  extends React.SVGAttributes<SVGLineElement> {
  edge: NetworkGraphEdge
  positions: Record<string, { x: number; y: number }>
  highlighted?: boolean
}

const NetworkGraphEdgeLine = React.forwardRef<
  SVGLineElement,
  NetworkGraphEdgeLineProps
>(({ edge, positions, highlighted = false, className, ...props }, ref) => {
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
  const x2 = entry.x + ux * ARROW_OFFSET
  const y2 = entry.y + uy * ARROW_OFFSET

  return (
    <line
      ref={ref}
      data-slot="network-graph-edge"
      data-highlighted={highlighted || undefined}
      className={cn(
        "stroke-border transition-[stroke,stroke-width] duration-150",
        highlighted && "stroke-muted-foreground",
        className
      )}
      strokeWidth={highlighted ? 2 : 1.5}
      x1={exit.x}
      y1={exit.y}
      x2={x2}
      y2={y2}
      markerEnd={
        highlighted ? "url(#ng-arrow-hi)" : "url(#ng-arrow)"
      }
      {...props}
    />
  )
})
NetworkGraphEdgeLine.displayName = "NetworkGraphEdgeLine"

// ─── NetworkGraphControls ──────────────────────────────────────────────────────
// Uses actual shadcn <Button variant="outline" size="icon"> — no custom classes

export interface NetworkGraphControlsProps
  extends React.HTMLAttributes<HTMLDivElement> {
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFit?: () => void
}

const NetworkGraphControls = React.forwardRef<
  HTMLDivElement,
  NetworkGraphControlsProps
>(({ onZoomIn, onZoomOut, onFit, className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="network-graph-controls"
    className={cn("absolute bottom-3 right-3 flex flex-col gap-1", className)}
    {...props}
  >
    <Button
      variant="outline"
      size="icon"
      className="size-7"
      onClick={onZoomIn}
      aria-label="Zoom in"
    >
      <ZoomIn />
    </Button>
    <Button
      variant="outline"
      size="icon"
      className="size-7"
      onClick={onZoomOut}
      aria-label="Zoom out"
    >
      <ZoomOut />
    </Button>
    <Button
      variant="outline"
      size="icon"
      className="size-7"
      onClick={onFit}
      aria-label="Reset view"
    >
      <Maximize2 />
    </Button>
  </div>
))
NetworkGraphControls.displayName = "NetworkGraphControls"

// ─── NetworkGraphNodeInfo ──────────────────────────────────────────────────────
// Bottom-center status bar shown when a node is selected.
// Styled like shadcn's inline badge/popover pattern.

export interface NetworkGraphNodeInfoProps
  extends React.HTMLAttributes<HTMLDivElement> {
  node: NetworkGraphNode
  connectionCount: number
}

const NetworkGraphNodeInfo = React.forwardRef<
  HTMLDivElement,
  NetworkGraphNodeInfoProps
>(({ node, connectionCount, className, ...props }, ref) => (
  <div
    ref={ref}
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
))
NetworkGraphNodeInfo.displayName = "NetworkGraphNodeInfo"

// ─── NetworkGraph (root) ───────────────────────────────────────────────────────

export interface NetworkGraphProps extends React.HTMLAttributes<HTMLDivElement> {
  nodes?: NetworkGraphNode[]
  edges?: NetworkGraphEdge[]
  width?: number
  height?: number
  /** When false, disables all pan, zoom, and node drag interactions. Default: true */
  interactive?: boolean
  /** Called when the selected node changes. Receives the node id, or null when deselected. */
  onSelectionChange?: (id: string | null) => void
}

const NetworkGraph = React.forwardRef<HTMLDivElement, NetworkGraphProps>(
  (
    {
      nodes = [],
      edges = [],
      width = 800,
      height = 500,
      interactive = true,
      onSelectionChange,
      className,
      ...props
    },
    ref
  ) => {
    const [positions, setPositions] = React.useState<
      Record<string, { x: number; y: number }>
    >({})
    const [tf, setTf] = React.useState({ x: 0, y: 0, scale: 1 })
    const [selected, setSelected] = React.useState<string | null>(null)
    const [simDone, setSimDone] = React.useState(false)

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

    // ── Force simulation ─────────────────────────────────────────────────────
    const hasFitted = React.useRef(false)
    React.useEffect(() => {
      if (!nodes.length) return
      setSimDone(false)
      hasFitted.current = false

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
        }
      )
    }, [nodes, edges, width, height])

    // ── Auto-fit once simulation settles ──────────────────────────────────────
    React.useEffect(() => {
      if (!simDone || hasFitted.current) return
      hasFitted.current = true
      requestAnimationFrame(() => fit())
    }, [simDone, fit])

    // ── Node drag ────────────────────────────────────────────────────────────
    const onNodeMouseDown = React.useCallback(
      (e: React.MouseEvent<SVGGElement>, id: string) => {
        if (!interactive || e.button !== 0) return
        dragRef.current = { id, sx: e.clientX, sy: e.clientY }

        const onMove = (ev: MouseEvent) => {
          if (!dragRef.current) return
          const dx = (ev.clientX - dragRef.current.sx) / tf.scale
          const dy = (ev.clientY - dragRef.current.sy) / tf.scale
          dragRef.current.sx = ev.clientX
          dragRef.current.sy = ev.clientY
          setPositions((p) => ({
            ...p,
            [id]: { x: p[id].x + dx, y: p[id].y + dy },
          }))
        }

        const onUp = () => {
          dragRef.current = null
          window.removeEventListener("mousemove", onMove)
          window.removeEventListener("mouseup", onUp)
        }

        window.addEventListener("mousemove", onMove)
        window.addEventListener("mouseup", onUp)
      },
      [interactive, tf.scale]
    )

    // ── Canvas pan ───────────────────────────────────────────────────────────
    const onSvgMouseDown = React.useCallback(
      (e: React.MouseEvent<SVGSVGElement>) => {
        if (!interactive || e.button !== 0) return
        panRef.current = { sx: e.clientX, sy: e.clientY, ox: tf.x, oy: tf.y }

        const onMove = (ev: MouseEvent) => {
          if (!panRef.current) return
          setTf((t) => ({
            ...t,
            x: panRef.current!.ox + ev.clientX - panRef.current!.sx,
            y: panRef.current!.oy + ev.clientY - panRef.current!.sy,
          }))
        }

        const onUp = () => {
          panRef.current = null
          window.removeEventListener("mousemove", onMove)
          window.removeEventListener("mouseup", onUp)
        }

        window.addEventListener("mousemove", onMove)
        window.addEventListener("mouseup", onUp)
      },
      [interactive, tf]
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

    return (
      <div
        ref={ref}
        data-slot="network-graph"
        data-interactive={interactive || undefined}
        className={cn(
          // Matches shadcn Card shell
          "relative overflow-hidden rounded-lg border bg-background",
          "select-none",
          className
        )}
        style={{ width, height }}
        {...props}
      >
        <svg
          ref={svgRef}
          width={width}
          height={height}
          onMouseDown={onSvgMouseDown}
          onClick={() => select(null)}
          className="block"
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
            {/* Edges — rendered behind nodes, decorative for a11y */}
            <g aria-hidden="true">
              {edges.map((e) => (
                <NetworkGraphEdgeLine
                  key={getEdgeKey(e.source, e.target)}
                  edge={e}
                  positions={positions}
                  highlighted={hiEdgeKeys.has(
                    getEdgeKey(e.source, e.target)
                  )}
                />
              ))}
            </g>

            {/* Nodes — fade in once simulation settles */}
            <g
              style={{
                opacity: simDone ? 1 : 0.5,
                transition: "opacity 350ms ease",
              }}
            >
              {nodes.map((node) =>
                positions[node.id] ? (
                  <NetworkGraphNodeCard
                    key={node.id}
                    node={node}
                    position={positions[node.id]}
                    selected={selected === node.id}
                    interactive={interactive}
                    onNodeMouseDown={onNodeMouseDown}
                    onNodeSelect={select}
                  />
                ) : null
              )}
            </g>
          </g>
        </svg>

        {/* Zoom controls — only shown when interactive */}
        {interactive && (
          <NetworkGraphControls
            onZoomIn={() => zoomBy(1.2)}
            onZoomOut={() => zoomBy(0.8)}
            onFit={fit}
          />
        )}

        {/* Selected node info tooltip */}
        {selNode && (
          <NetworkGraphNodeInfo node={selNode} connectionCount={connCount} />
        )}
      </div>
    )
  }
)
NetworkGraph.displayName = "NetworkGraph"

// ─── Exports ───────────────────────────────────────────────────────────────────
// Named exports for every composable piece (same pattern as card.tsx, dialog.tsx)
// Default export for the common case

export {
  NetworkGraph,
  NetworkGraphNodeCard,
  NetworkGraphEdgeLine,
  NetworkGraphControls,
  NetworkGraphNodeInfo,
}

export default NetworkGraph
