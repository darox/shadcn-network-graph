/**
 * network-graph-layouts.ts
 * Static layout algorithms for NetworkGraph.
 * Each function returns Record<string, {x,y}> — same shape as positions state.
 */

export type LayoutPositions = Record<string, { x: number; y: number }>

interface LayoutNode {
  id: string
}

interface LayoutEdge {
  source: string
  target: string
}

/**
 * BFS-based tree layout: root at left, layers spread horizontally.
 * Finds root as the node with zero incoming edges (falls back to nodes[0]).
 */
export function computeTreeLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  width: number,
  height: number
): LayoutPositions {
  if (nodes.length === 0) return {}

  const { layers, maxDepth } = buildLayers(nodes, edges)
  const positions: LayoutPositions = {}
  const pad = 60

  for (const [depthStr, layerNodes] of Object.entries(layers)) {
    const depth = Number(depthStr)
    const x =
      maxDepth === 0
        ? width / 2
        : pad + ((width - pad * 2) * depth) / maxDepth
    const count = layerNodes.length
    for (let i = 0; i < count; i++) {
      const y =
        count === 1
          ? height / 2
          : pad + ((height - pad * 2) * i) / (count - 1)
      positions[layerNodes[i]] = { x, y }
    }
  }

  return positions
}

/**
 * BFS-based radial layout: root at center, layers on concentric rings.
 */
export function computeRadialLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  width: number,
  height: number
): LayoutPositions {
  if (nodes.length === 0) return {}

  const { layers, maxDepth } = buildLayers(nodes, edges)
  const positions: LayoutPositions = {}
  const cx = width / 2
  const cy = height / 2
  const maxRadius = Math.min(width, height) / 2 - 80

  for (const [depthStr, layerNodes] of Object.entries(layers)) {
    const depth = Number(depthStr)

    if (depth === 0) {
      // Root at center
      for (const id of layerNodes) {
        positions[id] = { x: cx, y: cy }
      }
      continue
    }

    const radius =
      maxDepth === 0 ? 0 : (depth / maxDepth) * maxRadius
    const count = layerNodes.length
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2
      positions[layerNodes[i]] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      }
    }
  }

  return positions
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildLayers(
  nodes: LayoutNode[],
  edges: LayoutEdge[]
): { layers: Record<number, string[]>; maxDepth: number } {
  // Build adjacency and compute incoming edge count
  const children = new Map<string, string[]>()
  const incoming = new Map<string, number>()
  for (const n of nodes) {
    children.set(n.id, [])
    incoming.set(n.id, 0)
  }
  for (const e of edges) {
    children.get(e.source)?.push(e.target)
    incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1)
  }

  // Find root: node with zero incoming edges. Fallback: nodes[0].
  const roots = nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0)
  const root = roots.length > 0 ? roots[0].id : nodes[0].id

  // BFS to assign depths
  const depth = new Map<string, number>()
  const queue: string[] = [root]
  depth.set(root, 0)

  while (queue.length > 0) {
    const id = queue.shift()!
    const d = depth.get(id)!
    for (const child of children.get(id) ?? []) {
      if (!depth.has(child)) {
        depth.set(child, d + 1)
        queue.push(child)
      }
    }
  }

  // Any unreachable nodes get placed at max depth + 1
  let maxDepth = 0
  for (const d of depth.values()) {
    if (d > maxDepth) maxDepth = d
  }
  for (const n of nodes) {
    if (!depth.has(n.id)) {
      depth.set(n.id, maxDepth + 1)
    }
  }
  // Recalculate maxDepth
  maxDepth = 0
  for (const d of depth.values()) {
    if (d > maxDepth) maxDepth = d
  }

  // Group by layer
  const layers: Record<number, string[]> = {}
  for (const n of nodes) {
    const d = depth.get(n.id)!
    if (!layers[d]) layers[d] = []
    layers[d].push(n.id)
  }

  return { layers, maxDepth }
}
