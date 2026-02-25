import { test, expect } from "@playwright/test"

// These tests are written for desktop — mobile has dedicated tests in mobile.spec.ts
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop only")
})

test.describe("Main demo (/)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    // Wait for simulation to finish and nodes to appear
    await page.waitForSelector('[data-slot="network-graph-node"]', {
      timeout: 10000,
    })
  })

  test("renders all 10 nodes", async ({ page }) => {
    const nodes = page.locator('[data-slot="network-graph-node"]')
    await expect(nodes).toHaveCount(10)
  })

  test("renders edges", async ({ page }) => {
    const edges = page.locator('[data-slot="network-graph-edge"]')
    await expect(edges).not.toHaveCount(0)
  })

  test("renders edge labels", async ({ page }) => {
    const labels = page.locator('[data-slot="network-graph-edge-label"]')
    await expect(labels).not.toHaveCount(0)
  })

  test("renders group hulls", async ({ page }) => {
    const groups = page.locator('[data-slot="network-graph-group"]')
    await expect(groups).not.toHaveCount(0)
  })

  test("renders search input", async ({ page }) => {
    const search = page.locator('[data-slot="network-graph-search"]')
    await expect(search).toBeVisible()
  })

  test("renders minimap", async ({ page }) => {
    const minimap = page.locator('[data-slot="network-graph-minimap"]')
    await expect(minimap).toBeVisible()
  })

  test("renders export buttons", async ({ page }) => {
    const svgBtn = page.locator('[aria-label="Export SVG"]')
    const pngBtn = page.locator('[aria-label="Export PNG"]')
    await expect(svgBtn).toBeVisible()
    await expect(pngBtn).toBeVisible()
  })

  test("renders zoom controls", async ({ page }) => {
    await expect(page.locator('[aria-label="Zoom in"]')).toBeVisible()
    await expect(page.locator('[aria-label="Zoom out"]')).toBeVisible()
    await expect(page.locator('[aria-label="Reset view"]')).toBeVisible()
  })

  test("colored nodes have correct fill class", async ({ page }) => {
    // API Gateway has color="primary"
    const primaryRects = page.locator(
      '[data-slot="network-graph-node-rect"].fill-primary'
    )
    await expect(primaryRects).not.toHaveCount(0)
  })

  test("animated edges have marching-ants class", async ({ page }) => {
    const animated = page.locator(
      '[data-slot="network-graph-edge"].ng-animated-edge'
    )
    await expect(animated).not.toHaveCount(0)
  })

  test("clicking a node shows node info", async ({ page }) => {
    const node = page.locator('[data-slot="network-graph-node"]').first()
    await node.click()
    const info = page.locator('[data-slot="network-graph-node-info"]')
    await expect(info).toBeVisible()
  })

  test("clicking background deselects node", async ({ page }) => {
    const node = page.locator('[data-slot="network-graph-node"]').first()
    await node.click()
    await expect(
      page.locator('[data-slot="network-graph-node-info"]')
    ).toBeVisible()

    // Click the SVG background directly to deselect (force bypasses overlay interception)
    const svg = page.locator('svg[aria-label="Network graph"]')
    await svg.click({ position: { x: 5, y: 5 }, force: true })
    await expect(
      page.locator('[data-slot="network-graph-node-info"]')
    ).not.toBeVisible()
  })

  test("search filters nodes by dimming unmatched", async ({ page }) => {
    const input = page.locator(
      '[data-slot="network-graph-search"] input'
    )
    await input.fill("Redis")
    // Wait for React to re-render
    await page.waitForTimeout(200)

    // The Redis node should be full opacity, others dimmed
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
    expect(dimmedCount).toBeLessThan(count) // at least one is NOT dimmed
  })

  test("zoom in button changes the transform", async ({ page }) => {
    const g = page.locator("svg > g").first()
    const before = await g.getAttribute("transform")
    await page.locator('[aria-label="Zoom in"]').click()
    const after = await g.getAttribute("transform")
    expect(after).not.toBe(before)
  })

  test("minimap click pans the view", async ({ page }) => {
    const g = page.locator("svg > g").first()
    const before = await g.getAttribute("transform")
    const minimap = page.locator('[data-slot="network-graph-minimap"]')
    await minimap.click({ position: { x: 20, y: 20 } })
    const after = await g.getAttribute("transform")
    expect(after).not.toBe(before)
  })
})

test.describe("LAN demo (/lan)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/lan")
    await page.waitForSelector('[data-slot="network-graph-node"]', {
      timeout: 10000,
    })
  })

  test("renders all 11 LAN nodes", async ({ page }) => {
    const nodes = page.locator('[data-slot="network-graph-node"]')
    await expect(nodes).toHaveCount(11)
  })

  test("renders 4 group hulls (WAN, Core, Wired, Wireless)", async ({
    page,
  }) => {
    const groups = page.locator('[data-slot="network-graph-group"]')
    await expect(groups).toHaveCount(4)
  })

  test("has colored nodes", async ({ page }) => {
    const primary = page.locator(
      '[data-slot="network-graph-node-rect"].fill-primary'
    )
    const destructive = page.locator(
      '[data-slot="network-graph-node-rect"].fill-destructive'
    )
    await expect(primary).not.toHaveCount(0)
    await expect(destructive).not.toHaveCount(0)
  })
})

test.describe("Layouts demo (/layouts)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/layouts")
    await page.waitForSelector('[data-slot="network-graph-node"]', {
      timeout: 10000,
    })
  })

  test("renders nodes in tree layout by default", async ({ page }) => {
    const nodes = page.locator('[data-slot="network-graph-node"]')
    await expect(nodes).toHaveCount(9)
  })

  test("switching to radial layout repositions nodes", async ({ page }) => {
    const firstNode = page.locator('[data-slot="network-graph-node"]').first()
    const treeTf = await firstNode.getAttribute("transform")

    await page.getByText("radial").click()
    await page.waitForTimeout(500)

    const radialTf = await firstNode.getAttribute("transform")
    expect(radialTf).not.toBe(treeTf)
  })

  test("switching to force layout triggers simulation", async ({ page }) => {
    await page.getByText("force").click()
    // Force layout runs simulation — nodes should still render
    await page.waitForSelector('[data-slot="network-graph-node"]', {
      timeout: 10000,
    })
    const nodes = page.locator('[data-slot="network-graph-node"]')
    await expect(nodes).toHaveCount(9)
  })
})

test.describe("Read-only demo (/read-only)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/read-only")
    await page.waitForSelector('[data-slot="network-graph-node"]', {
      timeout: 10000,
    })
  })

  test("renders 5 nodes", async ({ page }) => {
    const nodes = page.locator('[data-slot="network-graph-node"]')
    await expect(nodes).toHaveCount(5)
  })

  test("does not show controls", async ({ page }) => {
    const controls = page.locator('[data-slot="network-graph-controls"]')
    await expect(controls).not.toBeVisible()
  })

  test("does not show search", async ({ page }) => {
    const search = page.locator('[data-slot="network-graph-search"]')
    await expect(search).not.toBeVisible()
  })

  test("renders edge labels", async ({ page }) => {
    const labels = page.locator('[data-slot="network-graph-edge-label"]')
    await expect(labels).not.toHaveCount(0)
  })

  test("nodes are not interactive (no cursor-grab)", async ({ page }) => {
    const node = page.locator('[data-slot="network-graph-node"]').first()
    const hasGrab = await node.evaluate((el) =>
      el.classList.contains("cursor-grab")
    )
    expect(hasGrab).toBe(false)
  })
})
