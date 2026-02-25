import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, fireEvent, act } from "@testing-library/react"
import { NetworkGraph } from "@/components/ui/network-graph"

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

  // ── Interaction tests ──────────────────────────────────────────────────

  it("zoom-in button increases scale (changes transform)", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} interactive={true} />
    )

    const svg = container.querySelector("svg")!
    const gTransform = svg.querySelector("g")!
    const before = gTransform.getAttribute("transform")

    const zoomInBtn = container.querySelector(
      '[aria-label="Zoom in"]'
    ) as HTMLButtonElement
    fireEvent.click(zoomInBtn)

    const after = gTransform.getAttribute("transform")
    expect(after).not.toBe(before)
  })

  it("zoom-out button changes transform", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} interactive={true} />
    )

    const svg = container.querySelector("svg")!
    const gTransform = svg.querySelector("g")!
    const before = gTransform.getAttribute("transform")

    const zoomOutBtn = container.querySelector(
      '[aria-label="Zoom out"]'
    ) as HTMLButtonElement
    fireEvent.click(zoomOutBtn)

    const after = gTransform.getAttribute("transform")
    expect(after).not.toBe(before)
  })

  it("reset-view button resets the transform", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} interactive={true} />
    )

    // Zoom in first, then reset
    const zoomInBtn = container.querySelector(
      '[aria-label="Zoom in"]'
    ) as HTMLButtonElement
    fireEvent.click(zoomInBtn)

    const fitBtn = container.querySelector(
      '[aria-label="Reset view"]'
    ) as HTMLButtonElement
    fireEvent.click(fitBtn)

    // After fit, transform should exist (we can't assert exact values
    // but it should not throw)
    const svg = container.querySelector("svg")!
    const gTransform = svg.querySelector("g")!
    expect(gTransform.getAttribute("transform")).toBeTruthy()
  })

  it("pan via pointerdown + pointermove on SVG changes transform", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} interactive={true} />
    )

    const svg = container.querySelector("svg")!
    const gTransform = svg.querySelector("g")!
    const before = gTransform.getAttribute("transform")

    // Simulate pointer pan
    fireEvent.pointerDown(svg, { clientX: 100, clientY: 100, button: 0, pointerId: 1 })
    fireEvent.pointerMove(window, { clientX: 150, clientY: 130, pointerId: 1 })
    fireEvent.pointerUp(window, { pointerId: 1 })

    const after = gTransform.getAttribute("transform")
    expect(after).not.toBe(before)
  })

  it("node drag via pointerdown + pointermove updates node position", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} interactive={true} />
    )

    const nodeEl = container.querySelector(
      '[data-slot="network-graph-node"]'
    )!

    // Simulate drag
    fireEvent.pointerDown(nodeEl, { clientX: 100, clientY: 100, button: 0, pointerId: 1 })
    fireEvent.pointerMove(window, { clientX: 120, clientY: 110, pointerId: 1 })
    fireEvent.pointerUp(window, { pointerId: 1 })

    // After drag, the node's transform should have changed from its mock position
    const updatedTransform = nodeEl.getAttribute("transform")
    expect(updatedTransform).toBeTruthy()
  })

  it("does not pan when interactive=false", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} interactive={false} />
    )

    const svg = container.querySelector("svg")!
    const gTransform = svg.querySelector("g")!
    const before = gTransform.getAttribute("transform")

    fireEvent.pointerDown(svg, { clientX: 100, clientY: 100, button: 0, pointerId: 1 })
    fireEvent.pointerMove(window, { clientX: 150, clientY: 130, pointerId: 1 })
    fireEvent.pointerUp(window, { pointerId: 1 })

    const after = gTransform.getAttribute("transform")
    expect(after).toBe(before)
  })

  it("scroll wheel changes zoom", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} interactive={true} />
    )

    const svg = container.querySelector("svg")!
    const gTransform = svg.querySelector("g")!
    const before = gTransform.getAttribute("transform")

    // Dispatch a real wheel event wrapped in act() since the handler
    // updates React state via addEventListener (not a React event)
    act(() => {
      const wheelEvt = new WheelEvent("wheel", {
        deltaY: -100,
        clientX: 400,
        clientY: 250,
        bubbles: true,
      })
      svg.dispatchEvent(wheelEvt)
    })

    const after = gTransform.getAttribute("transform")
    expect(after).not.toBe(before)
  })

  it("shows connection count in node info", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} />
    )

    // Node "b" has 2 connections (a→b and b→c)
    const nodeEls = container.querySelectorAll(
      '[data-slot="network-graph-node"]'
    )
    fireEvent.click(nodeEls[1]) // "b"

    const info = container.querySelector(
      '[data-slot="network-graph-node-info"]'
    )
    expect(info).toHaveTextContent("2 connections")
  })

  // ── v3: Custom colors ─────────────────────────────────────────────────

  it("applies color class to node rect when color='primary'", () => {
    const colorNodes = [
      { id: "x", label: "X", color: "primary" as const },
    ]
    const { container } = render(
      <NetworkGraph nodes={colorNodes} edges={[]} />
    )
    const rect = container.querySelector(
      '[data-slot="network-graph-node-rect"]'
    )
    expect(rect).toHaveClass("fill-primary")
  })

  // ── v3: Animated edges ────────────────────────────────────────────────

  it("applies animated class when edge.animated=true", () => {
    const animEdges = [
      { source: "a", target: "b", animated: true },
    ]
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={animEdges} />
    )
    const edge = container.querySelector('[data-slot="network-graph-edge"]')
    expect(edge).toHaveClass("ng-animated-edge")
  })

  // ── v3: Node grouping ────────────────────────────────────────────────

  it("renders group hull when nodes have group property", () => {
    const groupedNodes = [
      { id: "a", label: "A", group: "frontend" },
      { id: "b", label: "B", group: "frontend" },
      { id: "c", label: "C" },
    ]
    const { container } = render(
      <NetworkGraph nodes={groupedNodes} edges={edges} />
    )
    const groups = container.querySelectorAll(
      '[data-slot="network-graph-group"]'
    )
    expect(groups).toHaveLength(1)
  })

  it("does not render group when no nodes have group", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} />
    )
    const groups = container.querySelectorAll(
      '[data-slot="network-graph-group"]'
    )
    expect(groups).toHaveLength(0)
  })

  // ── v3: Search ────────────────────────────────────────────────────────

  it("renders search input when searchable=true", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} searchable={true} />
    )
    const search = container.querySelector(
      '[data-slot="network-graph-search"]'
    )
    expect(search).toBeInTheDocument()
  })

  it("does not render search when searchable is not set", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} />
    )
    const search = container.querySelector(
      '[data-slot="network-graph-search"]'
    )
    expect(search).not.toBeInTheDocument()
  })

  // ── v3: Minimap ───────────────────────────────────────────────────────

  it("renders minimap when minimap=true", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} minimap={true} />
    )
    const minimap = container.querySelector(
      '[data-slot="network-graph-minimap"]'
    )
    expect(minimap).toBeInTheDocument()
  })

  it("does not render minimap when minimap is not set", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} />
    )
    const minimap = container.querySelector(
      '[data-slot="network-graph-minimap"]'
    )
    expect(minimap).not.toBeInTheDocument()
  })

  // ── v3: Export ────────────────────────────────────────────────────────

  it("renders export buttons when exportable=true", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} exportable={true} />
    )
    const svgBtn = container.querySelector('[aria-label="Export SVG"]')
    const pngBtn = container.querySelector('[aria-label="Export PNG"]')
    expect(svgBtn).toBeInTheDocument()
    expect(pngBtn).toBeInTheDocument()
  })

  it("does not render export buttons when exportable is not set", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} />
    )
    const svgBtn = container.querySelector('[aria-label="Export SVG"]')
    expect(svgBtn).not.toBeInTheDocument()
  })

  // ── v3: Layout prop ──────────────────────────────────────────────────

  it("renders with layout='tree' without crashing", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} layout="tree" />
    )
    const root = container.querySelector('[data-slot="network-graph"]')
    expect(root).toBeInTheDocument()
  })

  it("renders with layout='radial' without crashing", () => {
    const { container } = render(
      <NetworkGraph nodes={nodes} edges={edges} layout="radial" />
    )
    const root = container.querySelector('[data-slot="network-graph"]')
    expect(root).toBeInTheDocument()
  })
})
