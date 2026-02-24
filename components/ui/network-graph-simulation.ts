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
}

// Tuning constants — exposed for potential future prop passthrough
const ITERATIONS = 300
const REPULSION_FACTOR = 0.5    // multiplier on k² (ideal spring length squared)
const ATTRACTION = 0.08         // edge spring constant
const GRAVITY = 0.08            // pull toward canvas center
const DAMPING = 0.7             // velocity damping per tick
const INTEGRATION = 0.85        // Euler integration step
const TICK_INTERVAL = 8         // commit to React every N frames

export function runSimulation(
  nodes: SimGraphNode[],
  edges: SimEdge[],
  width: number,
  height: number,
  onTick: (positions: SimNode[]) => void,
  onEnd: (positions: SimNode[]) => void
): () => void {
  const k = Math.sqrt((width * height) / Math.max(nodes.length, 1))
  const repulsion = k * k * REPULSION_FACTOR
  const cx = width / 2
  const cy = height / 2

  // Initialise: scatter nodes randomly around center
  const pos: SimNode[] = nodes.map(() => ({
    x: cx + (Math.random() - 0.5) * width * 0.5,
    y: cy + (Math.random() - 0.5) * height * 0.5,
    vx: 0,
    vy: 0,
  }))

  // Index: node id → position array index
  const idx: Record<string, number> = {}
  nodes.forEach((n, i) => (idx[n.id] = i))

  let frame = 0
  let animId: number

  function step() {
    const alpha = Math.max(0, 1 - frame / ITERATIONS)

    if (alpha <= 0) {
      onTick([...pos])
      onEnd([...pos])
      return
    }

    // Repulsion: every pair of nodes pushes apart (O(n²) — fine for <200 nodes)
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

    // Attraction: edges act as springs pulling connected nodes together
    for (const e of edges) {
      const s = pos[idx[e.source]]
      const t = pos[idx[e.target]]
      if (!s || !t) continue
      const dx = t.x - s.x
      const dy = t.y - s.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = (dist - k) * ATTRACTION * alpha
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      s.vx += fx
      s.vy += fy
      t.vx -= fx
      t.vy -= fy
    }

    // Gravity: weak pull toward canvas center to prevent drift
    for (const p of pos) {
      p.vx += (cx - p.x) * GRAVITY * alpha
      p.vy += (cy - p.y) * GRAVITY * alpha
      // Integrate
      p.x += p.vx * INTEGRATION
      p.y += p.vy * INTEGRATION
      // Damp velocity
      p.vx *= DAMPING
      p.vy *= DAMPING
    }

    frame++
    // Batch React updates — commit every TICK_INTERVAL frames
    if (frame % TICK_INTERVAL === 0) {
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
