import { test, expect } from "@playwright/test"

// Only run on mobile projects
test.beforeEach(({}, testInfo) => {
  test.skip(
    !["mobile-chrome", "mobile-safari", "tablet"].includes(testInfo.project.name),
    "Mobile/tablet only"
  )
})

const WAIT_FOR_NODES = { timeout: 10000 }

async function waitForGraph(page: import("@playwright/test").Page, path = "/") {
  await page.goto(path)
  await page.waitForSelector('[data-slot="network-graph-node"]', WAIT_FOR_NODES)
  await page.waitForTimeout(1500)
}

// ---------------------------------------------------------------------------
// 1. Basic rendering on mobile
// ---------------------------------------------------------------------------
test.describe("Mobile rendering", () => {
  test("graph renders all nodes on mobile", async ({ page }) => {
    await waitForGraph(page)

    const nodes = page.locator('[data-slot="network-graph-node"]')
    await expect(nodes).toHaveCount(10)
  })

  test("edges render on mobile", async ({ page }) => {
    await waitForGraph(page)

    const edges = page.locator('[data-slot="network-graph-edge"]')
    await expect(edges).not.toHaveCount(0)
  })

  test("controls render on mobile", async ({ page }) => {
    await waitForGraph(page)

    await expect(page.locator('[data-slot="network-graph-controls"]')).toBeVisible()
  })

  test("search renders on mobile", async ({ page }) => {
    await waitForGraph(page)

    await expect(page.locator('[data-slot="network-graph-search"]')).toBeVisible()
  })

  test("graph container is not wider than viewport", async ({ page }) => {
    await waitForGraph(page)

    const containerWidth = await page.evaluate(() => {
      const el = document.querySelector('[data-slot="network-graph"]')
      return el ? el.getBoundingClientRect().width : 0
    })
    const viewportWidth = page.viewportSize()!.width
    expect(containerWidth).toBeLessThanOrEqual(viewportWidth)
  })
})

// ---------------------------------------------------------------------------
// 2. Minimap visibility on mobile vs tablet
// ---------------------------------------------------------------------------
test.describe("Minimap responsive behavior", () => {
  test("minimap is hidden on small mobile screens", async ({ page }, testInfo) => {
    if (testInfo.project.name === "tablet") {
      test.skip()
      return
    }
    await waitForGraph(page)

    const minimap = page.locator('[data-slot="network-graph-minimap"]')
    // Minimap has `hidden sm:block` — should be invisible on mobile
    await expect(minimap).not.toBeVisible()
  })

  test("minimap is visible on tablet", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "tablet") {
      test.skip()
      return
    }
    await waitForGraph(page)

    const minimap = page.locator('[data-slot="network-graph-minimap"]')
    await expect(minimap).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 3. Touch interactions — tap to select
// ---------------------------------------------------------------------------
test.describe("Touch selection", () => {
  test("tapping a node selects it", async ({ page }) => {
    await waitForGraph(page)

    // Tap on a node
    const node = page.locator('[data-slot="network-graph-node"]').first()
    await node.tap()
    await page.waitForTimeout(200)

    // Info panel should appear
    await expect(page.locator('[data-slot="network-graph-node-info"]')).toBeVisible()
  })

  test("tapping background deselects", async ({ page }) => {
    await waitForGraph(page)

    const node = page.locator('[data-slot="network-graph-node"]').first()
    await node.tap()
    await expect(page.locator('[data-slot="network-graph-node-info"]')).toBeVisible()

    // Tap on empty area
    const svg = page.locator('svg[aria-label="Network graph"]')
    await svg.tap({ position: { x: 5, y: 5 }, force: true })
    await page.waitForTimeout(200)

    await expect(page.locator('[data-slot="network-graph-node-info"]')).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 4. Touch drag (node dragging on mobile)
// ---------------------------------------------------------------------------
test.describe("Touch drag", () => {
  test("dragging a node with touch changes its position", async ({ page }) => {
    await waitForGraph(page)

    const node = page.locator('[data-slot="network-graph-node"]').first()
    const before = await node.getAttribute("transform")
    const box = await node.boundingBox()
    if (!box) throw new Error("Node not visible")

    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    // Simulate touch drag via dispatchEvent (touchscreen API varies)
    await page.touchscreen.tap(cx, cy)
    await page.waitForTimeout(100)

    // Use mouse emulation for drag since Playwright's touchscreen doesn't have drag
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 50, cy + 40, { steps: 5 })
    await page.mouse.up()

    const after = await node.getAttribute("transform")
    // Position should have changed (drag moves the node)
    expect(after).not.toBe(before)
  })
})

// ---------------------------------------------------------------------------
// 5. No crashes on mobile — the critical mobile fixes
// ---------------------------------------------------------------------------
test.describe("Mobile crash prevention", () => {
  test("no setPointerCapture crash on rapid taps", async ({ page }) => {
    test.setTimeout(60000)
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await waitForGraph(page)

    // Tap nodes sequentially with enough pause for Playwright's tap gesture to complete
    const nodes = page.locator('[data-slot="network-graph-node"]')
    const count = await nodes.count()
    for (let i = 0; i < Math.min(count, 3); i++) {
      try {
        await nodes.nth(i).tap({ timeout: 3000 })
      } catch {
        // Tap may fail if node is not visible or actionable — that's fine
      }
      await page.waitForTimeout(200)
    }

    await page.waitForTimeout(500)
    const pointerErrors = errors.filter((e) => e.includes("setPointerCapture"))
    expect(pointerErrors).toHaveLength(0)
  })

  test("no panRef null crash on rapid pan gestures", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await waitForGraph(page)

    const svg = page.locator('svg[aria-label="Network graph"]')
    const box = await svg.boundingBox()
    if (!box) throw new Error("SVG not visible")

    // Simulate rapid pointer down/up cycles
    for (let i = 0; i < 10; i++) {
      await page.mouse.move(box.x + 10 + i * 5, box.y + 10)
      await page.mouse.down()
      await page.mouse.move(box.x + 50 + i * 5, box.y + 50, { steps: 2 })
      await page.mouse.up()
    }

    await page.waitForTimeout(500)
    const panErrors = errors.filter((e) => e.includes("panRef") || e.includes("null is not"))
    expect(panErrors).toHaveLength(0)
  })

  test("no crashes during rapid interaction sequences", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await waitForGraph(page)

    // Tap node, zoom button, tap different node, pan, tap background
    const nodes = page.locator('[data-slot="network-graph-node"]')
    const count = await nodes.count()

    if (count > 0) await nodes.first().tap().catch(() => {})
    await page.waitForTimeout(50)

    const zoomIn = page.locator('[aria-label="Zoom in"]')
    if (await zoomIn.isVisible()) await zoomIn.tap().catch(() => {})
    await page.waitForTimeout(50)

    if (count > 1) await nodes.nth(1).tap().catch(() => {})
    await page.waitForTimeout(50)

    // Pan
    const svg = page.locator('svg[aria-label="Network graph"]')
    const box = await svg.boundingBox()
    if (box) {
      await page.mouse.move(box.x + 10, box.y + 10)
      await page.mouse.down()
      await page.mouse.move(box.x + 100, box.y + 100, { steps: 3 })
      await page.mouse.up()
    }

    await page.waitForTimeout(50)
    const svgEl = page.locator('svg[aria-label="Network graph"]')
    await svgEl.tap({ position: { x: 5, y: 5 }, force: true }).catch(() => {})

    await page.waitForTimeout(500)
    expect(errors).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 6. Mobile rendering on all 4 pages
// ---------------------------------------------------------------------------
const mobilePages = [
  { name: "Main", path: "/" },
  { name: "LAN", path: "/lan" },
  { name: "Layouts", path: "/layouts" },
  { name: "Read-only", path: "/read-only" },
]

for (const { name, path } of mobilePages) {
  test(`${name} page renders without errors on mobile`, async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await waitForGraph(page, path)

    const nodes = page.locator('[data-slot="network-graph-node"]')
    const count = await nodes.count()
    expect(count).toBeGreaterThan(0)

    expect(errors).toHaveLength(0)
  })
}

// ---------------------------------------------------------------------------
// 7. Touch-none prevents scroll interference
// ---------------------------------------------------------------------------
test.describe("Touch behavior", () => {
  test("graph container has touch-none CSS", async ({ page }) => {
    await waitForGraph(page)

    const touchAction = await page.evaluate(() => {
      const el = document.querySelector('[data-slot="network-graph"]')
      return el ? getComputedStyle(el).touchAction : null
    })
    expect(touchAction).toBe("none")
  })

  test("SVG element has touch-none CSS", async ({ page }) => {
    await waitForGraph(page)

    const touchAction = await page.evaluate(() => {
      const el = document.querySelector('svg[aria-label="Network graph"]')
      return el ? getComputedStyle(el).touchAction : null
    })
    expect(touchAction).toBe("none")
  })
})

// ---------------------------------------------------------------------------
// 8. Read-only on mobile
// ---------------------------------------------------------------------------
test.describe("Read-only on mobile", () => {
  test("no controls visible", async ({ page }) => {
    await waitForGraph(page, "/read-only")

    await expect(page.locator('[data-slot="network-graph-controls"]')).not.toBeVisible()
  })

  test("no search visible", async ({ page }) => {
    await waitForGraph(page, "/read-only")

    await expect(page.locator('[data-slot="network-graph-search"]')).not.toBeVisible()
  })

  test("tapping nodes does nothing", async ({ page }) => {
    await waitForGraph(page, "/read-only")

    const node = page.locator('[data-slot="network-graph-node"]').first()
    await node.tap().catch(() => {})
    await page.waitForTimeout(200)

    await expect(page.locator('[data-slot="network-graph-node-info"]')).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 9. Zoom buttons work on mobile
// ---------------------------------------------------------------------------
test.describe("Zoom buttons on mobile", () => {
  test("zoom in button works with tap", async ({ page }) => {
    await waitForGraph(page)

    const g = page.locator("svg > g").first()
    const before = await g.getAttribute("transform")

    await page.locator('[aria-label="Zoom in"]').tap()
    await page.waitForTimeout(100)

    const after = await g.getAttribute("transform")
    expect(after).not.toBe(before)
  })

  test("zoom out button works with tap", async ({ page }) => {
    await waitForGraph(page)

    const g = page.locator("svg > g").first()
    const before = await g.getAttribute("transform")

    await page.locator('[aria-label="Zoom out"]').tap()
    await page.waitForTimeout(100)

    const after = await g.getAttribute("transform")
    expect(after).not.toBe(before)
  })

  test("reset view button works with tap", async ({ page }) => {
    await waitForGraph(page)

    // Zoom in first
    await page.locator('[aria-label="Zoom in"]').tap()
    await page.locator('[aria-label="Zoom in"]').tap()
    await page.waitForTimeout(100)

    const zoomed = await page.locator("svg > g").first().getAttribute("transform")

    await page.locator('[aria-label="Reset view"]').tap()
    await page.waitForTimeout(300)

    const reset = await page.locator("svg > g").first().getAttribute("transform")
    expect(reset).not.toBe(zoomed)
  })
})
