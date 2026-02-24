import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, fireEvent } from "@testing-library/react"
import NetworkGraph from "@/components/ui/network-graph"

// ─── Mock the simulation so tests don't depend on requestAnimationFrame ───────

const mockPositions = [
  { x: 100, y: 100, vx: 0, vy: 0 },
  { x: 300, y: 200, vx: 0, vy: 0 },
  { x: 200, y: 300, vx: 0, vy: 0 },
]

vi.mock("@/components/ui/network-graph-simulation", () => ({
  runSimulation: (
    nodes: Array<{ id: string }>,
    _edges: unknown,
    _w: number,
    _h: number,
    onTick: (pos: typeof mockPositions) => void,
    onEnd: (pos: typeof mockPositions) => void
  ) => {
    const pos = nodes.map((_, i) => mockPositions[i] ?? { x: 0, y: 0, vx: 0, vy: 0 })
    // Immediately complete the simulation
    onTick(pos)
    onEnd(pos)
    return () => {}
  },
  getNodeExitPoint: (
    source: { x: number; y: number },
    _target: { x: number; y: number },
    bounds: { width: number; height: number }
  ) => ({
    x: source.x + bounds.width / 2,
    y: source.y,
  }),
  getEdgeKey: (s: string, t: string) => `${s}→${t}`,
}))

// ─── Test data ─────────────────────────────────────────────────────────────────

const nodes = [
  { id: "a", label: "Node A", subtitle: "Subtitle A", icon: "🅰" },
  { id: "b", label: "Node B" },
  { id: "c", label: "Node C", subtitle: "Subtitle C" },
]

const edges = [
  { source: "a", target: "b" },
  { source: "b", target: "c" },
]

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("NetworkGraph", () => {
  beforeEach(() => {
    // jsdom doesn't implement SVG getBoundingClientRect
    vi.spyOn(SVGSVGElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 800,
      height: 500,
      top: 0,
      right: 800,
      bottom: 500,
      left: 0,
      toJSON: () => {},
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders with the root data-slot", () => {
    const { container } = render(<NetworkGraph nodes={nodes} edges={edges} />)
    const root = container.querySelector('[data-slot="network-graph"]')
    expect(root).toBeInTheDocument()
  })

  it("renders the correct number of nodes", () => {
    const { container } = render(<NetworkGraph nodes={nodes} edges={edges} />)
    const nodeEls = container.querySelectorAll(
      '[data-slot="network-graph-node"]'
    )
    expect(nodeEls).toHaveLength(3)
  })

  it("renders edges", () => {
    const { container } = render(<NetworkGraph nodes={nodes} edges={edges} />)
    const edgeEls = container.querySelectorAll(
      '[data-slot="network-graph-edge"]'
    )
    expect(edgeEls).toHaveLength(2)
  })

  it("fires onSelectionChange when a node is clicked", () => {
    const onChange = vi.fn()
    const { container } = render(
      <NetworkGraph
        nodes={nodes}
        edges={edges}
        onSelectionChange={onChange}
      />
    )

    const nodeEl = container.querySelector(
      '[data-slot="network-graph-node"]'
    )!
    fireEvent.click(nodeEl)

    expect(onChange).toHaveBeenCalledWith("a")
  })

  it("fires onSelectionChange with null when background is clicked", () => {
    const onChange = vi.fn()
    const { container } = render(
      <NetworkGraph
        nodes={nodes}
        edges={edges}
        onSelectionChange={onChange}
      />
    )

    // First select a node
    const nodeEl = container.querySelector(
      '[data-slot="network-graph-node"]'
    )!
    fireEvent.click(nodeEl)
    onChange.mockClear()

    // Click the SVG background
    const svg = container.querySelector("svg")!
    fireEvent.click(svg)

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it("shows controls when interactive", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} interactive={true} />
    )
    const controls = container.querySelector(
      '[data-slot="network-graph-controls"]'
    )
    expect(controls).toBeInTheDocument()
  })

  it("hides controls when interactive=false", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} interactive={false} />
    )
    const controls = container.querySelector(
      '[data-slot="network-graph-controls"]'
    )
    expect(controls).not.toBeInTheDocument()
  })

  it("shows node info when a node is selected", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} />
    )

    const nodeEl = container.querySelector(
      '[data-slot="network-graph-node"]'
    )!
    fireEvent.click(nodeEl)

    const info = container.querySelector(
      '[data-slot="network-graph-node-info"]'
    )
    expect(info).toBeInTheDocument()
    expect(info).toHaveTextContent("Node A")
  })

  it("renders with custom className", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} className="my-custom-class" />
    )
    const root = container.querySelector('[data-slot="network-graph"]')
    expect(root).toHaveClass("my-custom-class")
  })

  it("renders with custom width and height", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} width={600} height={400} />
    )
    const root = container.querySelector(
      '[data-slot="network-graph"]'
    ) as HTMLElement
    expect(root.style.width).toBe("600px")
    expect(root.style.height).toBe("400px")
  })

  it("does not select a node on click when interactive=false", () => {
    const onChange = vi.fn()
    const { container } = render(
      <NetworkGraph
        nodes={nodes}
        edges={edges}
        interactive={false}
        onSelectionChange={onChange}
      />
    )

    const nodeEl = container.querySelector(
      '[data-slot="network-graph-node"]'
    )!
    fireEvent.click(nodeEl)

    // Node click is disabled; click bubbles to SVG which deselects (null),
    // but should never select a specific node ID
    expect(onChange).not.toHaveBeenCalledWith("a")
    expect(onChange).not.toHaveBeenCalledWith("b")
    expect(onChange).not.toHaveBeenCalledWith("c")
  })

  it("selects a node via keyboard Enter", () => {
    const onChange = vi.fn()
    const { container } = render(
      <NetworkGraph
        nodes={nodes}
        edges={edges}
        onSelectionChange={onChange}
      />
    )

    const nodeEl = container.querySelector(
      '[data-slot="network-graph-node"]'
    )!
    fireEvent.keyDown(nodeEl, { key: "Enter" })

    expect(onChange).toHaveBeenCalledWith("a")
  })

  it("renders without nodes or edges (empty graph)", () => {
    const { container } = render(<NetworkGraph />)
    const root = container.querySelector('[data-slot="network-graph"]')
    expect(root).toBeInTheDocument()
    const nodeEls = container.querySelectorAll(
      '[data-slot="network-graph-node"]'
    )
    expect(nodeEls).toHaveLength(0)
  })

  // ── v2: Edge labels ───────────────────────────────────────────────────

  it("renders edge labels when provided", () => {
    const edgesWithLabels = [
      { source: "a", target: "b", label: "connects" },
      { source: "b", target: "c" },
    ]
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edgesWithLabels} />
    )
    const labels = container.querySelectorAll(
      '[data-slot="network-graph-edge-label"]'
    )
    expect(labels).toHaveLength(1)
  })

  it("does not render edge labels when label is omitted", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} />
    )
    const labels = container.querySelectorAll(
      '[data-slot="network-graph-edge-label"]'
    )
    expect(labels).toHaveLength(0)
  })

  // ── v2: simulationConfig prop ──────────────────────────────────────────

  it("accepts simulationConfig prop without crashing", () => {
    const { container } = render(
      <NetworkGraph
        nodes={nodes}
        edges={edges}
        simulationConfig={{ iterations: 100, gravity: 0.2 }}
      />
    )
    const root = container.querySelector('[data-slot="network-graph"]')
    expect(root).toBeInTheDocument()
  })
})
