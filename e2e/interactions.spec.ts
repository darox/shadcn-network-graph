import { test, expect } from "@playwright/test"

// Only run interaction tests on desktop chromium (mobile has its own file)
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop only")
})

const WAIT_FOR_NODES = { timeout: 10000 }

// ---------------------------------------------------------------------------
// Helper: wait for graph to fully load and auto-fit
// ---------------------------------------------------------------------------
async function waitForGraph(page: import("@playwright/test").Page, path = "/") {
  await page.goto(path)
  await page.waitForSelector('[data-slot="network-graph-node"]', WAIT_FOR_NODES)
  // Wait for auto-fit animation to complete
  await page.waitForTimeout(1500)
}

// ---------------------------------------------------------------------------
// 1. Node drag — verify position changes
// ---------------------------------------------------------------------------
test.describe("Node drag interaction", () => {
  test("dragging a node changes its position", async ({ page }) => {
    await waitForGraph(page)

    const node = page.locator('[data-slot="network-graph-node"]').first()
    const before = await node.getAttribute("transform")

    // Get bounding box to target center of node
    const box = await node.boundingBox()
    if (!box) throw new Error("Node not visible")

    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 80, cy + 60, { steps: 10 })
    await page.mouse.up()

    const after = await node.getAttribute("transform")
    expect(after).not.toBe(before)
  })

  test("dragging does not crash on rapid mousedown/mouseup", async ({ page }) => {
    await waitForGraph(page)

    const node = page.locator('[data-slot="network-graph-node"]').first()
    const box = await node.boundingBox()
    if (!box) throw new Error("Node not visible")

    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    // Rapid click-release cycles
    for (let i = 0; i < 10; i++) {
      await page.mouse.move(cx + i, cy)
      await page.mouse.down()
      await page.mouse.up()
    }

    // Graph should still be functional
    const nodes = page.locator('[data-slot="network-graph-node"]')
    await expect(nodes).toHaveCount(10)
  })
})

// ---------------------------------------------------------------------------
// 2. Canvas pan — verify transform changes
// ---------------------------------------------------------------------------
test.describe("Canvas pan interaction", () => {
  test("panning the canvas changes the view transform", async ({ page }) => {
    await waitForGraph(page)

    const svg = page.locator('svg[aria-label="Network graph"]')
    const box = await svg.boundingBox()
    if (!box) throw new Error("SVG not visible")

    const g = page.locator("svg > g").first()
    const before = await g.getAttribute("transform")

    // Click on an empty area of the SVG (near edge, away from nodes)
    const startX = box.x + 10
    const startY = box.y + 10

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 120, startY + 80, { steps: 10 })
    await page.mouse.up()

    const after = await g.getAttribute("transform")
    expect(after).not.toBe(before)
  })
})

// ---------------------------------------------------------------------------
// 3. Scroll zoom — verify scale changes
// ---------------------------------------------------------------------------
test.describe("Scroll zoom interaction", () => {
  test("scrolling up zooms in", async ({ page }) => {
    await waitForGraph(page)

    const svg = page.locator('svg[aria-label="Network graph"]')
    const box = await svg.boundingBox()
    if (!box) throw new Error("SVG not visible")

    const g = page.locator("svg > g").first()
    const before = await g.getAttribute("transform")
    const beforeScale = parseFloat(before?.match(/scale\(([^)]+)\)/)?.[1] ?? "1")

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, -300)
    await page.waitForTimeout(200)

    const after = await g.getAttribute("transform")
    const afterScale = parseFloat(after?.match(/scale\(([^)]+)\)/)?.[1] ?? "1")
    expect(afterScale).toBeGreaterThan(beforeScale)
  })

  test("scrolling down zooms out", async ({ page }) => {
    await waitForGraph(page)

    const svg = page.locator('svg[aria-label="Network graph"]')
    const box = await svg.boundingBox()
    if (!box) throw new Error("SVG not visible")

    const g = page.locator("svg > g").first()
    const before = await g.getAttribute("transform")
    const beforeScale = parseFloat(before?.match(/scale\(([^)]+)\)/)?.[1] ?? "1")

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, 300)
    await page.waitForTimeout(200)

    const after = await g.getAttribute("transform")
    const afterScale = parseFloat(after?.match(/scale\(([^)]+)\)/)?.[1] ?? "1")
    expect(afterScale).toBeLessThan(beforeScale)
  })

  test("zoom clamps at minimum 0.2 scale", async ({ page }) => {
    await waitForGraph(page)

    const svg = page.locator('svg[aria-label="Network graph"]')
    const box = await svg.boundingBox()
    if (!box) throw new Error("SVG not visible")

    // Zoom out a lot
    for (let i = 0; i < 30; i++) {
      await page.mouse.wheel(0, 500)
    }
    await page.waitForTimeout(200)

    const g = page.locator("svg > g").first()
    const tf = await g.getAttribute("transform")
    const scale = parseFloat(tf?.match(/scale\(([^)]+)\)/)?.[1] ?? "1")
    expect(scale).toBeGreaterThanOrEqual(0.2)
  })

  test("zoom clamps at maximum 3.0 scale", async ({ page }) => {
    await waitForGraph(page)

    const svg = page.locator('svg[aria-label="Network graph"]')
    const box = await svg.boundingBox()
    if (!box) throw new Error("SVG not visible")

    // Zoom in a lot
    for (let i = 0; i < 30; i++) {
      await page.mouse.wheel(0, -500)
    }
    await page.waitForTimeout(200)

    const g = page.locator("svg > g").first()
    const tf = await g.getAttribute("transform")
    const scale = parseFloat(tf?.match(/scale\(([^)]+)\)/)?.[1] ?? "1")
    expect(scale).toBeLessThanOrEqual(3.0)
  })
})

// ---------------------------------------------------------------------------
// 4. Zoom control buttons
// ---------------------------------------------------------------------------
test.describe("Zoom control buttons", () => {
  test("zoom in button increases scale", async ({ page }) => {
    await waitForGraph(page)

    const g = page.locator("svg > g").first()
    const before = await g.getAttribute("transform")
    const beforeScale = parseFloat(before?.match(/scale\(([^)]+)\)/)?.[1] ?? "1")

    await page.locator('[aria-label="Zoom in"]').click()
    await page.waitForTimeout(100)

    const after = await g.getAttribute("transform")
    const afterScale = parseFloat(after?.match(/scale\(([^)]+)\)/)?.[1] ?? "1")
    expect(afterScale).toBeGreaterThan(beforeScale)
  })

  test("zoom out button decreases scale", async ({ page }) => {
    await waitForGraph(page)

    const g = page.locator("svg > g").first()
    const before = await g.getAttribute("transform")
    const beforeScale = parseFloat(before?.match(/scale\(([^)]+)\)/)?.[1] ?? "1")

    await page.locator('[aria-label="Zoom out"]').click()
    await page.waitForTimeout(100)

    const after = await g.getAttribute("transform")
    const afterScale = parseFloat(after?.match(/scale\(([^)]+)\)/)?.[1] ?? "1")
    expect(afterScale).toBeLessThan(beforeScale)
  })

  test("reset view button resets to fit-to-content", async ({ page }) => {
    await waitForGraph(page)

    // Zoom in multiple times to change the view
    for (let i = 0; i < 5; i++) {
      await page.locator('[aria-label="Zoom in"]').click()
    }
    await page.waitForTimeout(100)

    const zoomed = await page.locator("svg > g").first().getAttribute("transform")

    // Hit reset
    await page.locator('[aria-label="Reset view"]').click()
    await page.waitForTimeout(300)

    const reset = await page.locator("svg > g").first().getAttribute("transform")
    expect(reset).not.toBe(zoomed)
  })
})

// ---------------------------------------------------------------------------
// 5. Node selection & deselection
// ---------------------------------------------------------------------------
test.describe("Node selection", () => {
  test("clicking a node selects it and shows info panel", async ({ page }) => {
    await waitForGraph(page)

    const node = page.locator('[data-slot="network-graph-node"]').first()
    await node.click()

    await expect(page.locator('[data-slot="network-graph-node-info"]')).toBeVisible()
    const selectedRects = page.locator('[data-slot="network-graph-node-rect"].stroke-ring')
    await expect(selectedRects).toHaveCount(1)
  })

  test("clicking a different node switches selection", async ({ page }) => {
    await waitForGraph(page)

    const nodes = page.locator('[data-slot="network-graph-node"]')
    await nodes.first().click()
    const firstInfo = await page.locator('[data-slot="network-graph-node-info"]').textContent()

    await nodes.nth(1).click()
    const secondInfo = await page.locator('[data-slot="network-graph-node-info"]').textContent()

    // Info should change
    expect(secondInfo).not.toBe(firstInfo)
    // Still only one selection ring
    await expect(page.locator('[data-slot="network-graph-node-rect"].stroke-ring')).toHaveCount(1)
  })

  test("clicking background deselects and hides info panel", async ({ page }) => {
    await waitForGraph(page)

    const node = page.locator('[data-slot="network-graph-node"]').first()
    await node.click()
    await expect(page.locator('[data-slot="network-graph-node-info"]')).toBeVisible()

    const svg = page.locator('svg[aria-label="Network graph"]')
    await svg.click({ position: { x: 5, y: 5 }, force: true })

    await expect(page.locator('[data-slot="network-graph-node-info"]')).not.toBeVisible()
    await expect(page.locator('[data-slot="network-graph-node-rect"].stroke-ring')).toHaveCount(0)
  })

  test("selecting a node highlights connected edges", async ({ page }) => {
    await waitForGraph(page)

    // Before selection, no highlighted edges
    await expect(
      page.locator('[data-slot="network-graph-edge"][data-highlighted="true"]')
    ).toHaveCount(0)

    // Click a node
    const node = page.locator('[data-slot="network-graph-node"]').first()
    await node.click()
    await page.waitForTimeout(100)

    // After selection, some edges should be highlighted
    const highlighted = page.locator('[data-slot="network-graph-edge"][data-highlighted="true"]')
    const count = await highlighted.count()
    expect(count).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 6. Search functionality
// ---------------------------------------------------------------------------
test.describe("Search functionality", () => {
  test("typing in search dims unmatched nodes", async ({ page }) => {
    await waitForGraph(page)

    const input = page.locator('[data-slot="network-graph-search"] input')
    await input.fill("Redis")
    await page.waitForTimeout(300)

    // Check dimmed nodes
    const allNodes = page.locator('[data-slot="network-graph-node"]')
    const count = await allNodes.count()
    let dimmedCount = 0
    for (let i = 0; i < count; i++) {
      const opacity = await allNodes.nth(i).evaluate(
        (el) => (el as SVGElement).style.opacity
      )
      if (opacity === "0.15") dimmedCount++
    }
    expect(dimmedCount).toBeGreaterThan(0)
    expect(dimmedCount).toBe(count - 1) // Only "Redis" should be visible
  })

  test("clearing search restores all nodes", async ({ page }) => {
    await waitForGraph(page)

    const input = page.locator('[data-slot="network-graph-search"] input')
    await input.fill("Redis")
    await page.waitForTimeout(200)
    await input.fill("")
    await page.waitForTimeout(200)

    const allNodes = page.locator('[data-slot="network-graph-node"]')
    const count = await allNodes.count()
    for (let i = 0; i < count; i++) {
      const opacity = await allNodes.nth(i).evaluate(
        (el) => (el as SVGElement).style.opacity
      )
      expect(opacity).not.toBe("0.15")
    }
  })

  test("search by subtitle works", async ({ page }) => {
    await waitForGraph(page)

    const input = page.locator('[data-slot="network-graph-search"] input')
    await input.fill("database")
    await page.waitForTimeout(300)

    // PostgreSQL has subtitle "database"
    const allNodes = page.locator('[data-slot="network-graph-node"]')
    const count = await allNodes.count()
    let visibleCount = 0
    for (let i = 0; i < count; i++) {
      const opacity = await allNodes.nth(i).evaluate(
        (el) => (el as SVGElement).style.opacity
      )
      if (opacity !== "0.15") visibleCount++
    }
    expect(visibleCount).toBe(1)
  })

  test("search is case-insensitive", async ({ page }) => {
    await waitForGraph(page)

    const input = page.locator('[data-slot="network-graph-search"] input')
    await input.fill("rEdIs")
    await page.waitForTimeout(300)

    const allNodes = page.locator('[data-slot="network-graph-node"]')
    const count = await allNodes.count()
    let visibleCount = 0
    for (let i = 0; i < count; i++) {
      const opacity = await allNodes.nth(i).evaluate(
        (el) => (el as SVGElement).style.opacity
      )
      if (opacity !== "0.15") visibleCount++
    }
    expect(visibleCount).toBe(1)
  })

  test("dimmed nodes are not interactive", async ({ page }) => {
    await waitForGraph(page)

    const input = page.locator('[data-slot="network-graph-search"] input')
    await input.fill("Redis")
    await page.waitForTimeout(300)

    // Try to click a dimmed node
    const allNodes = page.locator('[data-slot="network-graph-node"]')
    const count = await allNodes.count()
    for (let i = 0; i < count; i++) {
      const opacity = await allNodes.nth(i).evaluate(
        (el) => (el as SVGElement).style.opacity
      )
      if (opacity === "0.15") {
        // This dimmed node should have pointerEvents: none
        const pe = await allNodes.nth(i).evaluate(
          (el) => (el as SVGElement).style.pointerEvents
        )
        expect(pe).toBe("none")
        break
      }
    }
  })
})

// ---------------------------------------------------------------------------
// 7. Export buttons (verify buttons are functional, not actual download)
// ---------------------------------------------------------------------------
test.describe("Export functionality", () => {
  test("SVG export button triggers download", async ({ page }) => {
    await waitForGraph(page)

    // Listen for download event
    const downloadPromise = page.waitForEvent("download", { timeout: 5000 }).catch(() => null)
    await page.locator('[aria-label="Export SVG"]').click()

    const download = await downloadPromise
    expect(download).not.toBeNull()
    if (download) {
      expect(download.suggestedFilename()).toBe("network-graph.svg")
    }
  })

  test("PNG export button triggers download", async ({ page }) => {
    await waitForGraph(page)

    const downloadPromise = page.waitForEvent("download", { timeout: 5000 }).catch(() => null)
    await page.locator('[aria-label="Export PNG"]').click()
    // PNG export is async (img.onload), give it more time
    await page.waitForTimeout(1000)

    const download = await downloadPromise
    expect(download).not.toBeNull()
    if (download) {
      expect(download.suggestedFilename()).toBe("network-graph.png")
    }
  })
})

// ---------------------------------------------------------------------------
// 8. Minimap interaction
// ---------------------------------------------------------------------------
test.describe("Minimap interaction", () => {
  test("clicking minimap pans the view", async ({ page }) => {
    await waitForGraph(page)

    const g = page.locator("svg > g").first()
    const before = await g.getAttribute("transform")

    const minimap = page.locator('[data-slot="network-graph-minimap"]')
    await minimap.click({ position: { x: 20, y: 20 } })
    await page.waitForTimeout(100)

    const after = await g.getAttribute("transform")
    expect(after).not.toBe(before)
  })

  test("minimap shows viewport indicator", async ({ page }) => {
    await waitForGraph(page)

    const viewport = page.locator('[data-slot="network-graph-minimap-viewport"]')
    await expect(viewport).toBeVisible()
  })

  test("minimap shows node indicators", async ({ page }) => {
    await waitForGraph(page)

    const minimapNodes = page.locator('[data-slot="network-graph-minimap-node"]')
    await expect(minimapNodes).not.toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// 9. Edge cases and robustness
// ---------------------------------------------------------------------------
test.describe("Edge cases", () => {
  test("double-click does not cause errors", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await waitForGraph(page)

    const node = page.locator('[data-slot="network-graph-node"]').first()
    await node.dblclick()
    await page.waitForTimeout(200)

    expect(errors).toHaveLength(0)
  })

  test("rapid zoom in/out does not crash", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await waitForGraph(page)

    const zoomIn = page.locator('[aria-label="Zoom in"]')
    const zoomOut = page.locator('[aria-label="Zoom out"]')

    for (let i = 0; i < 10; i++) {
      await zoomIn.click({ delay: 0 })
    }
    for (let i = 0; i < 20; i++) {
      await zoomOut.click({ delay: 0 })
    }
    for (let i = 0; i < 10; i++) {
      await zoomIn.click({ delay: 0 })
    }

    await page.waitForTimeout(200)
    expect(errors).toHaveLength(0)

    // Graph should still render
    const nodes = page.locator('[data-slot="network-graph-node"]')
    await expect(nodes).toHaveCount(10)
  })

  test("selecting then immediately panning does not crash", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await waitForGraph(page)

    const node = page.locator('[data-slot="network-graph-node"]').first()
    await node.click()

    // Immediately start panning
    const svg = page.locator('svg[aria-label="Network graph"]')
    const box = await svg.boundingBox()
    if (!box) throw new Error("SVG not visible")

    await page.mouse.move(box.x + 10, box.y + 10)
    await page.mouse.down()
    await page.mouse.move(box.x + 200, box.y + 200, { steps: 5 })
    await page.mouse.up()

    await page.waitForTimeout(200)
    expect(errors).toHaveLength(0)
  })

  test("search + select + deselect cycle works cleanly", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await waitForGraph(page)

    // Search
    const input = page.locator('[data-slot="network-graph-search"] input')
    await input.fill("API")
    await page.waitForTimeout(200)

    // Click matching node
    const visibleNodes = page.locator('[data-slot="network-graph-node"]')
    const count = await visibleNodes.count()
    for (let i = 0; i < count; i++) {
      const opacity = await visibleNodes.nth(i).evaluate(
        (el) => (el as SVGElement).style.opacity
      )
      if (opacity !== "0.15") {
        await visibleNodes.nth(i).click()
        break
      }
    }
    await page.waitForTimeout(100)

    // Info should be visible
    await expect(page.locator('[data-slot="network-graph-node-info"]')).toBeVisible()

    // Clear search
    await input.fill("")
    await page.waitForTimeout(200)

    // Deselect
    const svg = page.locator('svg[aria-label="Network graph"]')
    await svg.click({ position: { x: 5, y: 5 }, force: true })
    await page.waitForTimeout(100)

    await expect(page.locator('[data-slot="network-graph-node-info"]')).not.toBeVisible()
    expect(errors).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 10. Layout switching (/layouts page)
// ---------------------------------------------------------------------------
test.describe("Layout switching", () => {
  test("switching between all three layouts works without errors", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await waitForGraph(page, "/layouts")

    // Tree → Radial
    await page.getByText("radial").click()
    await page.waitForTimeout(500)
    const radialNodes = page.locator('[data-slot="network-graph-node"]')
    await expect(radialNodes).toHaveCount(9)

    // Radial → Force
    await page.getByText("force").click()
    await page.waitForSelector('[data-slot="network-graph-node"]', WAIT_FOR_NODES)

    // Force → Tree
    await page.getByText("tree").click()
    await page.waitForTimeout(500)
    await expect(page.locator('[data-slot="network-graph-node"]')).toHaveCount(9)

    expect(errors).toHaveLength(0)
  })

  test("node positions differ between tree and radial layouts", async ({ page }) => {
    await waitForGraph(page, "/layouts")

    // Get tree positions
    const treePositions = await page.evaluate(() => {
      const nodes = document.querySelectorAll('[data-slot="network-graph-node"]')
      return Array.from(nodes).map((n) => n.getAttribute("transform"))
    })

    // Switch to radial
    await page.getByText("radial").click()
    await page.waitForTimeout(500)

    const radialPositions = await page.evaluate(() => {
      const nodes = document.querySelectorAll('[data-slot="network-graph-node"]')
      return Array.from(nodes).map((n) => n.getAttribute("transform"))
    })

    // At least some positions should differ
    let diffCount = 0
    for (let i = 0; i < treePositions.length; i++) {
      if (treePositions[i] !== radialPositions[i]) diffCount++
    }
    expect(diffCount).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 11. Read-only mode (/read-only page)
// ---------------------------------------------------------------------------
test.describe("Read-only mode", () => {
  test("nodes cannot be dragged", async ({ page }) => {
    await waitForGraph(page, "/read-only")
    // Extra wait for simulation to fully settle
    await page.waitForTimeout(2000)

    const node = page.locator('[data-slot="network-graph-node"]').first()
    const before = await node.getAttribute("transform")
    const parseXY = (tf: string | null) => {
      const m = tf?.match(/translate\(([^,]+),([^)]+)\)/)
      return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 }
    }
    const beforeXY = parseXY(before)

    const box = await node.boundingBox()
    if (!box) throw new Error("Node not visible")

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + 100, box.y + 100, { steps: 5 })
    await page.mouse.up()

    const after = await node.getAttribute("transform")
    const afterXY = parseXY(after)

    // In read-only mode, drag should not move the node significantly
    // (simulation jitter may cause tiny sub-pixel changes)
    expect(Math.abs(afterXY.x - beforeXY.x)).toBeLessThan(2)
    expect(Math.abs(afterXY.y - beforeXY.y)).toBeLessThan(2)
  })

  test("clicking nodes does not show info panel", async ({ page }) => {
    await waitForGraph(page, "/read-only")

    const node = page.locator('[data-slot="network-graph-node"]').first()
    await node.click()
    await page.waitForTimeout(200)

    await expect(page.locator('[data-slot="network-graph-node-info"]')).not.toBeVisible()
  })

  test("scroll zoom is disabled", async ({ page }) => {
    await waitForGraph(page, "/read-only")

    const g = page.locator("svg > g").first()
    const before = await g.getAttribute("transform")

    const svg = page.locator('svg[aria-label="Network graph"]')
    const box = await svg.boundingBox()
    if (!box) throw new Error("SVG not visible")

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, -300)
    await page.waitForTimeout(200)

    const after = await g.getAttribute("transform")
    expect(after).toBe(before)
  })
})

// ---------------------------------------------------------------------------
// 12. LAN demo specific tests
// ---------------------------------------------------------------------------
test.describe("LAN demo", () => {
  test("all 4 group hulls render with correct structure", async ({ page }) => {
    await waitForGraph(page, "/lan")

    const groups = page.locator('[data-slot="network-graph-group"]')
    await expect(groups).toHaveCount(4)

    // Each group should have a path element for the hull
    for (let i = 0; i < 4; i++) {
      const path = groups.nth(i).locator("path")
      await expect(path).toHaveCount(1)
    }
  })

  test("all node color presets are visible", async ({ page }) => {
    await waitForGraph(page, "/lan")

    // LAN demo uses primary, secondary, destructive, and accent colors
    await expect(
      page.locator('[data-slot="network-graph-node-rect"].fill-primary')
    ).not.toHaveCount(0)
    await expect(
      page.locator('[data-slot="network-graph-node-rect"].fill-destructive')
    ).not.toHaveCount(0)
    await expect(
      page.locator('[data-slot="network-graph-node-rect"].fill-accent')
    ).not.toHaveCount(0)
  })
})
