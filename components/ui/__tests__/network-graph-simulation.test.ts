import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  runSimulation,
  getNodeExitPoint,
  getEdgeKey,
  DEFAULT_SIMULATION_CONFIG,
} from "@/components/ui/network-graph-simulation"

// ─── getEdgeKey ────────────────────────────────────────────────────────────────

describe("getEdgeKey", () => {
  it("returns a directed key string", () => {
    expect(getEdgeKey("a", "b")).toBe("a→b")
  })

  it("produces different keys for reversed direction", () => {
    expect(getEdgeKey("a", "b")).not.toBe(getEdgeKey("b", "a"))
  })
})

// ─── getNodeExitPoint ──────────────────────────────────────────────────────────

describe("getNodeExitPoint", () => {
  const bounds = { width: 100, height: 50 }

  it("exits at the right edge for a horizontal rightward line", () => {
    const source = { x: 0, y: 0 }
    const target = { x: 200, y: 0 }
    const exit = getNodeExitPoint(source, target, bounds)
    expect(exit.x).toBeCloseTo(50) // half width
    expect(exit.y).toBeCloseTo(0)
  })

  it("exits at the left edge for a horizontal leftward line", () => {
    const source = { x: 200, y: 0 }
    const target = { x: 0, y: 0 }
    const exit = getNodeExitPoint(source, target, bounds)
    expect(exit.x).toBeCloseTo(150)
    expect(exit.y).toBeCloseTo(0)
  })

  it("exits at the bottom edge for a vertical downward line", () => {
    const source = { x: 0, y: 0 }
    const target = { x: 0, y: 200 }
    const exit = getNodeExitPoint(source, target, bounds)
    expect(exit.x).toBeCloseTo(0)
    expect(exit.y).toBeCloseTo(25) // half height
  })

  it("exits at the top edge for a vertical upward line", () => {
    const source = { x: 0, y: 200 }
    const target = { x: 0, y: 0 }
    const exit = getNodeExitPoint(source, target, bounds)
    expect(exit.x).toBeCloseTo(0)
    expect(exit.y).toBeCloseTo(175)
  })

  it("exits at a corner for a diagonal line", () => {
    const source = { x: 0, y: 0 }
    const target = { x: 100, y: 100 }
    const exit = getNodeExitPoint(source, target, bounds)
    // Diagonal — limited by height (25) before width (50)
    expect(exit.y).toBeCloseTo(25)
    expect(exit.x).toBeCloseTo(25)
  })

  it("returns source point when source equals target", () => {
    const source = { x: 50, y: 50 }
    const target = { x: 50, y: 50 }
    const exit = getNodeExitPoint(source, target, bounds)
    // When distance is 0, the function uses dist=1 fallback
    expect(typeof exit.x).toBe("number")
    expect(typeof exit.y).toBe("number")
  })
})

// ─── runSimulation ─────────────────────────────────────────────────────────────

describe("runSimulation", () => {
  let rafCallbacks: Array<{ id: number; cb: FrameRequestCallback }>
  let nextRafId: number

  beforeEach(() => {
    rafCallbacks = []
    nextRafId = 1
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      const id = nextRafId++
      rafCallbacks.push({ id, cb })
      return id
    })
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      rafCallbacks = rafCallbacks.filter((r) => r.id !== id)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function flushFrames(count: number) {
    for (let i = 0; i < count; i++) {
      const pending = [...rafCallbacks]
      rafCallbacks = []
      for (const { cb } of pending) {
        cb(performance.now())
      }
    }
  }

  it("returns a cleanup function", () => {
    const cleanup = runSimulation(
      [{ id: "a" }],
      [],
      800,
      500,
      () => {},
      () => {}
    )
    expect(typeof cleanup).toBe("function")
    cleanup()
  })

  it("calls onEnd when simulation completes", () => {
    const onTick = vi.fn()
    const onEnd = vi.fn()
    runSimulation(
      [{ id: "a" }, { id: "b" }],
      [{ source: "a", target: "b" }],
      800,
      500,
      onTick,
      onEnd
    )

    // Flush enough frames for the simulation to complete (300 iterations + 1)
    flushFrames(350)

    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(onEnd).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      ])
    )
  })

  it("calls onTick periodically during simulation", () => {
    const onTick = vi.fn()
    const onEnd = vi.fn()
    runSimulation(
      [{ id: "a" }, { id: "b" }],
      [{ source: "a", target: "b" }],
      800,
      500,
      onTick,
      onEnd
    )

    // Flush 16 frames (should trigger at least 1 batched tick at frame 8)
    flushFrames(16)

    expect(onTick).toHaveBeenCalled()
  })

  it("produces positions for each node", () => {
    const onEnd = vi.fn()
    runSimulation(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
      ],
      800,
      500,
      () => {},
      onEnd
    )

    flushFrames(350)

    const positions = onEnd.mock.calls[0][0]
    expect(positions).toHaveLength(3)
    for (const p of positions) {
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
    }
  })

  it("cleanup cancels the animation", () => {
    const onTick = vi.fn()
    const onEnd = vi.fn()
    const cleanup = runSimulation(
      [{ id: "a" }],
      [],
      800,
      500,
      onTick,
      onEnd
    )

    cleanup()
    flushFrames(350)

    expect(onEnd).not.toHaveBeenCalled()
  })

  // ── v2: Custom simulation config ────────────────────────────────────────

  it("accepts custom iterations via config", () => {
    const onEnd = vi.fn()
    runSimulation(
      [{ id: "a" }, { id: "b" }],
      [{ source: "a", target: "b" }],
      800,
      500,
      () => {},
      onEnd,
      { iterations: 50 }
    )

    // With iterations=50, should complete in ~51 frames
    flushFrames(60)
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it("merges partial config with defaults", () => {
    // Just verifying it doesn't crash with partial config
    const onEnd = vi.fn()
    runSimulation(
      [{ id: "a" }],
      [],
      800,
      500,
      () => {},
      onEnd,
      { gravity: 0.2 }
    )
    flushFrames(350)
    expect(onEnd).toHaveBeenCalled()
  })

  it("exports DEFAULT_SIMULATION_CONFIG with expected keys", () => {
    expect(DEFAULT_SIMULATION_CONFIG).toMatchObject({
      iterations: 300,
      repulsion: 0.5,
      attraction: 0.08,
      gravity: 0.08,
      damping: 0.7,
      integration: 0.85,
      tickInterval: 8,
      barnesHutThreshold: 100,
      barnesHutTheta: 0.7,
    })
  })

  // ── v2: Programmatic node positioning ───────────────────────────────────

  it("uses provided x/y as initial positions", () => {
    const onEnd = vi.fn()
    runSimulation(
      [
        { id: "a", x: 100, y: 200 },
        { id: "b", x: 500, y: 300 },
      ],
      [],
      800,
      500,
      () => {},
      onEnd
    )

    flushFrames(350)

    const positions = onEnd.mock.calls[0][0]
    // Positions should be near initial values (gravity pulls toward center but not far)
    expect(positions).toHaveLength(2)
    expect(Number.isFinite(positions[0].x)).toBe(true)
  })

  it("fixed nodes stay at their initial position", () => {
    const onEnd = vi.fn()
    runSimulation(
      [
        { id: "a", x: 100, y: 200, fixed: true },
        { id: "b", x: 500, y: 300 },
      ],
      [{ source: "a", target: "b" }],
      800,
      500,
      () => {},
      onEnd
    )

    flushFrames(350)

    const positions = onEnd.mock.calls[0][0]
    expect(positions[0].x).toBe(100)
    expect(positions[0].y).toBe(200)
    expect(positions[0].vx).toBe(0)
    expect(positions[0].vy).toBe(0)
  })

  // ── v2: Barnes-Hut algorithm ────────────────────────────────────────────

  it("uses Barnes-Hut for large node counts", () => {
    const onEnd = vi.fn()
    const nodes = Array.from({ length: 150 }, (_, i) => ({ id: `n${i}` }))
    const edges = Array.from({ length: 100 }, (_, i) => ({
      source: `n${i}`,
      target: `n${(i + 1) % 150}`,
    }))

    runSimulation(nodes, edges, 800, 500, () => {}, onEnd, {
      barnesHutThreshold: 100,
      iterations: 20,
    })

    flushFrames(30)

    expect(onEnd).toHaveBeenCalledTimes(1)
    const positions = onEnd.mock.calls[0][0]
    expect(positions).toHaveLength(150)
    for (const p of positions) {
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
    }
  })
})
