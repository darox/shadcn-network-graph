/**
 * simulation.ts
 * Force-directed layout engine — no external dependencies.
 * Designed to run entirely outside React state (mutates internal pos[] array,
 * commits to React only on batched ticks).
 */

export interface SimNode {
  x: number
  y: number
  vx: number
  vy: number
}

export interface SimEdge {
  source: string
  target: string
}

export interface SimGraphNode {
  id: string
  /** Pre-set initial x position. If omitted, randomized. */
  x?: number
  /** Pre-set initial y position. If omitted, randomized. */
  y?: number
  /** When true, simulation will not move this node. Default: false */
  fixed?: boolean
}

// ─── Simulation config ───────────────────────────────────────────────────────

export interface SimulationConfig {
  /** Number of simulation iterations. Default: 300 */
  iterations: number
  /** Repulsion multiplier on k² (ideal spring length squared). Default: 0.5 */
  repulsion: number
  /** Edge spring constant. Default: 0.08 */
  attraction: number
  /** Pull toward canvas center. Default: 0.08 */
  gravity: number
  /** Velocity damping per tick. Default: 0.7 */
  damping: number
  /** Euler integration step. Default: 0.85 */
  integration: number
  /** Commit to React every N frames. Default: 8 */
  tickInterval: number
  /** Node count above which Barnes-Hut is used. Default: 100 */
  barnesHutThreshold: number
  /** Barnes-Hut accuracy (0–1, lower = more accurate). Default: 0.7 */
  barnesHutTheta: number
}

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  iterations: 300,
  repulsion: 0.5,
  attraction: 0.08,
  gravity: 0.08,
  damping: 0.7,
  integration: 0.85,
  tickInterval: 8,
  barnesHutThreshold: 100,
  barnesHutTheta: 0.7,
}

// ─── Barnes-Hut quadtree ─────────────────────────────────────────────────────

interface QTNode {
  // Bounding box
  x0: number
  y0: number
  x1: number
  y1: number
  // Center of mass
  cx: number
  cy: number
  mass: number
  // Leaf body index (or -1 if internal)
  body: number
  // Children: NW, NE, SW, SE (null if empty)
  children: (QTNode | null)[] | null
}

function createQTNode(x0: number, y0: number, x1: number, y1: number): QTNode {
  return { x0, y0, x1, y1, cx: 0, cy: 0, mass: 0, body: -1, children: null }
}

function qtInsert(node: QTNode, idx: number, x: number, y: number): void {
  const midX = (node.x0 + node.x1) / 2
  const midY = (node.y0 + node.y1) / 2

  if (node.mass === 0) {
    // Empty node — place body here
    node.body = idx
    node.cx = x
    node.cy = y
    node.mass = 1
    return
  }

  // If leaf, subdivide and re-insert existing body
  if (node.children === null) {
    node.children = [null, null, null, null]
    const oldIdx = node.body
    const oldX = node.cx
    const oldY = node.cy
    node.body = -1
    qtInsert(node, oldIdx, oldX, oldY)
  }

  // Insert new body into the correct quadrant
  const quadrant =
    (x > midX ? 1 : 0) + (y > midY ? 2 : 0)

  if (node.children![quadrant] === null) {
    const qx0 = quadrant & 1 ? midX : node.x0
    const qy0 = quadrant & 2 ? midY : node.y0
    const qx1 = quadrant & 1 ? node.x1 : midX
    const qy1 = quadrant & 2 ? node.y1 : midY
    node.children![quadrant] = createQTNode(qx0, qy0, qx1, qy1)
  }

  qtInsert(node.children![quadrant]!, idx, x, y)

  // Update center of mass
  const totalMass = node.mass + 1
  node.cx = (node.cx * node.mass + x) / totalMass
  node.cy = (node.cy * node.mass + y) / totalMass
  node.mass = totalMass
}

function applyRepulsionBarnesHut(
  pos: SimNode[],
  repulsion: number,
  alpha: number,
  theta: number
): void {
  // Compute bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of pos) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  const pad = 1
  const root = createQTNode(minX - pad, minY - pad, maxX + pad, maxY + pad)

  // Build tree
  for (let i = 0; i < pos.length; i++) {
    qtInsert(root, i, pos[i].x, pos[i].y)
  }

  // Traverse tree for each body
  for (let i = 0; i < pos.length; i++) {
    applyForceFromNode(pos, i, root, repulsion, alpha, theta)
  }
}

function applyForceFromNode(
  pos: SimNode[],
  i: number,
  node: QTNode,
  repulsion: number,
  alpha: number,
  theta: number
): void {
  if (node.mass === 0) return

  const dx = node.cx - pos[i].x || 0.01
  const dy = node.cy - pos[i].y || 0.01
  const dist2 = dx * dx + dy * dy || 1

  // Leaf with single body — direct calculation
  if (node.body >= 0) {
    if (node.body !== i) {
      const force = (repulsion / dist2) * alpha
      pos[i].vx -= dx * force
      pos[i].vy -= dy * force
    }
    return
  }

  // Check if cell is far enough to approximate
  const size = node.x1 - node.x0
  if (size * size / dist2 < theta * theta) {
    const force = (repulsion * node.mass / dist2) * alpha
    pos[i].vx -= dx * force
    pos[i].vy -= dy * force
    return
  }

  // Recurse into children
  if (node.children) {
    for (const child of node.children) {
      if (child) applyForceFromNode(pos, i, child, repulsion, alpha, theta)
    }
  }
}

function applyRepulsionBruteForce(
  pos: SimNode[],
  repulsion: number,
  alpha: number
): void {
  for (let i = 0; i < pos.length; i++) {
    for (let j = i + 1; j < pos.length; j++) {
      const dx = pos[j].x - pos[i].x || 0.01
      const dy = pos[j].y - pos[i].y || 0.01
      const dist2 = dx * dx + dy * dy || 1
      const force = (repulsion / dist2) * alpha
      pos[i].vx -= dx * force
      pos[i].vy -= dy * force
      pos[j].vx += dx * force
      pos[j].vy += dy * force
    }
  }
}

// ─── Main simulation ─────────────────────────────────────────────────────────

export function runSimulation(
  nodes: SimGraphNode[],
  edges: SimEdge[],
  width: number,
  height: number,
  onTick: (positions: SimNode[]) => void,
  onEnd: (positions: SimNode[]) => void,
  config?: Partial<SimulationConfig>
): () => void {
  const cfg = { ...DEFAULT_SIMULATION_CONFIG, ...config }
  const k = Math.sqrt((width * height) / Math.max(nodes.length, 1))
  const repulsion = k * k * cfg.repulsion
  const cx = width / 2
  const cy = height / 2
  const useBarnesHut = nodes.length > cfg.barnesHutThreshold

  // Initialise: use provided positions or scatter randomly around center
  const pos: SimNode[] = nodes.map((n) => ({
    x: n.x ?? cx + (Math.random() - 0.5) * width * 0.5,
    y: n.y ?? cy + (Math.random() - 0.5) * height * 0.5,
    vx: 0,
    vy: 0,
  }))

  // Index: node id → position array index
  const idx: Record<string, number> = {}
  nodes.forEach((n, i) => (idx[n.id] = i))

  let frame = 0
  let animId: number

  function step() {
    const alpha = Math.max(0, 1 - frame / cfg.iterations)

    if (alpha <= 0) {
      onTick([...pos])
      onEnd([...pos])
      return
    }

    // Repulsion: choose algorithm based on node count
    if (useBarnesHut) {
      applyRepulsionBarnesHut(pos, repulsion, alpha, cfg.barnesHutTheta)
    } else {
      applyRepulsionBruteForce(pos, repulsion, alpha)
    }

    // Attraction: edges act as springs pulling connected nodes together
    for (const e of edges) {
      const s = pos[idx[e.source]]
      const t = pos[idx[e.target]]
      if (!s || !t) continue
      const dx = t.x - s.x
      const dy = t.y - s.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = (dist - k) * cfg.attraction * alpha
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      s.vx += fx
      s.vy += fy
      t.vx -= fx
      t.vy -= fy
    }

    // Gravity + integration + damping + fixed-node handling
    for (let i = 0; i < pos.length; i++) {
      const p = pos[i]
      const n = nodes[i]

      if (n.fixed) {
        // Fixed nodes: restore initial position, zero velocity
        p.x = n.x ?? p.x
        p.y = n.y ?? p.y
        p.vx = 0
        p.vy = 0
        continue
      }

      p.vx += (cx - p.x) * cfg.gravity * alpha
      p.vy += (cy - p.y) * cfg.gravity * alpha
      p.x += p.vx * cfg.integration
      p.y += p.vy * cfg.integration
      p.vx *= cfg.damping
      p.vy *= cfg.damping
    }

    frame++
    // Batch React updates — commit every tickInterval frames
    if (frame % cfg.tickInterval === 0) {
      onTick([...pos])
    }

    animId = requestAnimationFrame(step)
  }

  animId = requestAnimationFrame(step)
  return () => cancelAnimationFrame(animId)
}

// ─── Geometry utilities ────────────────────────────────────────────────────────

export interface Point {
  x: number
  y: number
}

export interface NodeBounds {
  width: number
  height: number
}

/**
 * Compute where a line from `source` toward `target` exits the source node's
 * bounding box. Used to start edges at the node border rather than its center.
 */
export function getNodeExitPoint(
  source: Point,
  target: Point,
  bounds: NodeBounds
): Point {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const ux = dx / dist
  const uy = dy / dist

  const hw = bounds.width / 2
  const hh = bounds.height / 2

  // Parametric intersection with the node bounding box
  const tX = Math.abs(ux) > 0 ? hw / Math.abs(ux) : Infinity
  const tY = Math.abs(uy) > 0 ? hh / Math.abs(uy) : Infinity
  const t = Math.min(tX, tY)

  return {
    x: source.x + ux * t,
    y: source.y + uy * t,
  }
}

/**
 * Stable string key for an edge, used for React reconciliation.
 */
export function getEdgeKey(source: string, target: string): string {
  return `${source}→${target}`
}
