import { describe, it, expect } from "vitest"
import {
  computeTreeLayout,
  computeRadialLayout,
} from "@/components/ui/network-graph-layouts"

const nodes = [
  { id: "a" },
  { id: "b" },
  { id: "c" },
  { id: "d" },
]

const edges = [
  { source: "a", target: "b" },
  { source: "a", target: "c" },
  { source: "b", target: "d" },
]

describe("computeTreeLayout", () => {
  it("returns a position for every node", () => {
    const pos = computeTreeLayout(nodes, edges, 800, 500)
    for (const n of nodes) {
      expect(pos[n.id]).toBeDefined()
      expect(typeof pos[n.id].x).toBe("number")
      expect(typeof pos[n.id].y).toBe("number")
    }
  })

  it("places root at leftmost x", () => {
    const pos = computeTreeLayout(nodes, edges, 800, 500)
    // "a" is root (no incoming edges) → should have smallest x
    const xs = nodes.map((n) => pos[n.id].x)
    expect(pos["a"].x).toBe(Math.min(...xs))
  })

  it("places deeper nodes at larger x", () => {
    const pos = computeTreeLayout(nodes, edges, 800, 500)
    // d is depth 2, b is depth 1
    expect(pos["d"].x).toBeGreaterThan(pos["b"].x)
    expect(pos["b"].x).toBeGreaterThan(pos["a"].x)
  })

  it("handles empty input", () => {
    const pos = computeTreeLayout([], [], 800, 500)
    expect(Object.keys(pos)).toHaveLength(0)
  })

  it("handles cycles gracefully", () => {
    const cycleEdges = [
      { source: "a", target: "b" },
      { source: "b", target: "a" },
    ]
    const pos = computeTreeLayout(
      [{ id: "a" }, { id: "b" }],
      cycleEdges,
      800,
      500
    )
    expect(pos["a"]).toBeDefined()
    expect(pos["b"]).toBeDefined()
  })
})

describe("computeRadialLayout", () => {
  it("places root at center", () => {
    const pos = computeRadialLayout(nodes, edges, 800, 500)
    expect(pos["a"].x).toBe(400) // width / 2
    expect(pos["a"].y).toBe(250) // height / 2
  })

  it("places depth-1 nodes on a ring", () => {
    const pos = computeRadialLayout(nodes, edges, 800, 500)
    const cx = 400
    const cy = 250
    // b and c are depth 1 — same distance from center
    const distB = Math.hypot(pos["b"].x - cx, pos["b"].y - cy)
    const distC = Math.hypot(pos["c"].x - cx, pos["c"].y - cy)
    expect(distB).toBeCloseTo(distC, 1)
  })

  it("returns a position for every node", () => {
    const pos = computeRadialLayout(nodes, edges, 800, 500)
    for (const n of nodes) {
      expect(pos[n.id]).toBeDefined()
    }
  })

  it("handles empty input", () => {
    const pos = computeRadialLayout([], [], 800, 500)
    expect(Object.keys(pos)).toHaveLength(0)
  })
})
