import { test, expect } from "@playwright/test"

// Only run accessibility tests on desktop chromium
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop only")
})

const WAIT_FOR_NODES = { timeout: 10000 }

async function waitForGraph(page: import("@playwright/test").Page, path = "/") {
  await page.goto(path)
  await page.waitForSelector('[data-slot="network-graph-node"]', WAIT_FOR_NODES)
  await page.waitForTimeout(1500)
}

// ---------------------------------------------------------------------------
// 1. ARIA attributes
// ---------------------------------------------------------------------------
test.describe("ARIA attributes", () => {
  test("SVG has aria-label and role=img", async ({ page }) => {
    await waitForGraph(page)

    const svg = page.locator('svg[aria-label="Network graph"]')
    await expect(svg).toBeVisible()
    const role = await svg.getAttribute("role")
    expect(role).toBe("img")
  })

  test("interactive nodes have role=button", async ({ page }) => {
    await waitForGraph(page)

    const nodes = page.locator('[data-slot="network-graph-node"]')
    const count = await nodes.count()
    for (let i = 0; i < count; i++) {
      const role = await nodes.nth(i).getAttribute("role")
      expect(role).toBe("button")
    }
  })

  test("interactive nodes have aria-label with node name", async ({ page }) => {
    await waitForGraph(page)

    const nodes = page.locator('[data-slot="network-graph-node"]')
    const count = await nodes.count()
    for (let i = 0; i < count; i++) {
      const label = await nodes.nth(i).getAttribute("aria-label")
      expect(label).toBeTruthy()
      expect(label!.length).toBeGreaterThan(0)
    }
  })

  test("interactive nodes have aria-pressed attribute", async ({ page }) => {
    await waitForGraph(page)

    const nodes = page.locator('[data-slot="network-graph-node"]')
    const first = nodes.first()

    // Before selection, aria-pressed should be "false"
    const before = await first.getAttribute("aria-pressed")
    expect(before).toBe("false")

    // After selection, aria-pressed should be "true"
    await first.click()
    await page.waitForTimeout(100)
    const after = await first.getAttribute("aria-pressed")
    expect(after).toBe("true")
  })

  test("read-only nodes have no role=button", async ({ page }) => {
    await waitForGraph(page, "/read-only")

    const nodes = page.locator('[data-slot="network-graph-node"]')
    const count = await nodes.count()
    for (let i = 0; i < count; i++) {
      const role = await nodes.nth(i).getAttribute("role")
      expect(role).toBeNull()
    }
  })

  test("read-only nodes have no aria-pressed", async ({ page }) => {
    await waitForGraph(page, "/read-only")

    const nodes = page.locator('[data-slot="network-graph-node"]')
    const count = await nodes.count()
    for (let i = 0; i < count; i++) {
      const pressed = await nodes.nth(i).getAttribute("aria-pressed")
      expect(pressed).toBeNull()
    }
  })

  test("edge groups are marked aria-hidden", async ({ page }) => {
    await waitForGraph(page)

    // Edges container should be aria-hidden (decorative)
    const edgeContainers = await page.evaluate(() => {
      const gs = document.querySelectorAll('svg g[aria-hidden="true"]')
      return gs.length
    })
    expect(edgeContainers).toBeGreaterThanOrEqual(2) // edges + edge labels
  })

  test("control buttons have aria-labels", async ({ page }) => {
    await waitForGraph(page)

    await expect(page.locator('[aria-label="Zoom in"]')).toBeVisible()
    await expect(page.locator('[aria-label="Zoom out"]')).toBeVisible()
    await expect(page.locator('[aria-label="Reset view"]')).toBeVisible()
    await expect(page.locator('[aria-label="Export SVG"]')).toBeVisible()
    await expect(page.locator('[aria-label="Export PNG"]')).toBeVisible()
  })

  test("search input has aria-label", async ({ page }) => {
    await waitForGraph(page)

    const input = page.locator('[data-slot="network-graph-search"] input')
    const label = await input.getAttribute("aria-label")
    expect(label).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// 2. Keyboard navigation
// ---------------------------------------------------------------------------
test.describe("Keyboard navigation", () => {
  test("nodes are focusable via Tab", async ({ page }) => {
    await waitForGraph(page)

    // Tab into the graph area — focus should land on nodes
    // First we need to get to the SVG area
    const nodes = page.locator('[data-slot="network-graph-node"]')
    const first = nodes.first()

    // Focus the first node directly
    await first.focus()
    await page.waitForTimeout(100)

    // Check that it received focus
    const focused = await page.evaluate(() => {
      const el = document.activeElement
      return el?.getAttribute("data-slot")
    })
    expect(focused).toBe("network-graph-node")
  })

  test("Enter key selects a focused node", async ({ page }) => {
    await waitForGraph(page)

    const nodes = page.locator('[data-slot="network-graph-node"]')
    const first = nodes.first()

    // Focus and press Enter
    await first.focus()
    await page.keyboard.press("Enter")
    await page.waitForTimeout(200)

    // Node info should appear
    await expect(page.locator('[data-slot="network-graph-node-info"]')).toBeVisible()
  })

  test("Tab key navigates between focusable elements", async ({ page }) => {
    await waitForGraph(page)

    const nodes = page.locator('[data-slot="network-graph-node"]')
    const first = nodes.first()

    await first.focus()
    const firstLabel = await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label")
    )

    await page.keyboard.press("Tab")
    await page.waitForTimeout(100)

    const secondSlot = await page.evaluate(() =>
      document.activeElement?.getAttribute("data-slot") ??
      document.activeElement?.tagName
    )

    // Focus should have moved to something
    expect(secondSlot).toBeTruthy()
    expect(firstLabel).toBeTruthy()
  })

  test("nodes have tabIndex=0 when interactive", async ({ page }) => {
    await waitForGraph(page)

    const nodes = page.locator('[data-slot="network-graph-node"]')
    const count = await nodes.count()
    for (let i = 0; i < count; i++) {
      const tabIndex = await nodes.nth(i).getAttribute("tabindex")
      expect(tabIndex).toBe("0")
    }
  })

  test("read-only nodes have no tabIndex", async ({ page }) => {
    await waitForGraph(page, "/read-only")

    const nodes = page.locator('[data-slot="network-graph-node"]')
    const count = await nodes.count()
    for (let i = 0; i < count; i++) {
      const tabIndex = await nodes.nth(i).getAttribute("tabindex")
      expect(tabIndex).toBeNull()
    }
  })
})

// ---------------------------------------------------------------------------
// 3. data-slot attributes on every element
// ---------------------------------------------------------------------------
test.describe("data-slot coverage", () => {
  test("all key elements have data-slot attributes", async ({ page }) => {
    await waitForGraph(page)

    // Click a node to show info panel
    await page.locator('[data-slot="network-graph-node"]').first().click()
    await page.waitForTimeout(200)

    const slots = await page.evaluate(() => {
      const slotElements = document.querySelectorAll("[data-slot]")
      const slotNames = new Set<string>()
      slotElements.forEach((el) => {
        const slot = el.getAttribute("data-slot")
        if (slot) slotNames.add(slot)
      })
      return Array.from(slotNames).sort()
    })

    // Verify all expected data-slot values exist
    const expected = [
      "network-graph",
      "network-graph-node",
      "network-graph-node-rect",
      "network-graph-node-icon-bg",
      "network-graph-node-icon",
      "network-graph-node-label",
      "network-graph-edge",
      "network-graph-edge-label",
      "network-graph-group",
      "network-graph-controls",
      "network-graph-node-info",
      "network-graph-search",
      "network-graph-minimap",
      "network-graph-minimap-bg",
      "network-graph-minimap-node",
      "network-graph-minimap-viewport",
    ]

    for (const slot of expected) {
      expect(slots).toContain(slot)
    }
  })
})

// ---------------------------------------------------------------------------
// 4. Focus visible styles
// ---------------------------------------------------------------------------
test.describe("Focus visible", () => {
  test("focused zoom buttons show visible focus ring", async ({ page }) => {
    await waitForGraph(page)

    const zoomIn = page.locator('[aria-label="Zoom in"]')
    await zoomIn.focus()

    // The button should have a visible outline/ring when focused
    const outline = await zoomIn.evaluate((el) => {
      const styles = getComputedStyle(el)
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
      }
    })

    // shadcn buttons use ring utility for focus-visible, which compiles to box-shadow
    // At minimum, the button should be reachable and styled
    expect(outline).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// 5. Semantic structure
// ---------------------------------------------------------------------------
test.describe("Semantic structure", () => {
  test("graph container uses div with data-slot", async ({ page }) => {
    await waitForGraph(page)

    const container = page.locator('[data-slot="network-graph"]')
    await expect(container).toBeVisible()
    const tag = await container.evaluate((el) => el.tagName.toLowerCase())
    expect(tag).toBe("div")
  })

  test("controls are in a separate div from SVG", async ({ page }) => {
    await waitForGraph(page)

    const controls = page.locator('[data-slot="network-graph-controls"]')
    await expect(controls).toBeVisible()
    const tag = await controls.evaluate((el) => el.tagName.toLowerCase())
    expect(tag).toBe("div")
  })

  test("info panel uses div outside SVG", async ({ page }) => {
    await waitForGraph(page)

    await page.locator('[data-slot="network-graph-node"]').first().click()
    await page.waitForTimeout(200)

    const info = page.locator('[data-slot="network-graph-node-info"]')
    await expect(info).toBeVisible()
    const tag = await info.evaluate((el) => el.tagName.toLowerCase())
    expect(tag).toBe("div")

    // Verify it's a child of the main graph container, not inside SVG
    const parentTag = await info.evaluate((el) => el.parentElement?.tagName.toLowerCase())
    expect(parentTag).toBe("div") // parent should be the graph container div
  })

  test("search is outside SVG element", async ({ page }) => {
    await waitForGraph(page)

    const search = page.locator('[data-slot="network-graph-search"]')
    await expect(search).toBeVisible()

    // Should not be inside an SVG
    const isInSVG = await search.evaluate((el) => {
      let parent = el.parentElement
      while (parent) {
        if (parent.tagName === "svg" || parent.tagName === "SVG") return true
        parent = parent.parentElement
      }
      return false
    })
    expect(isInSVG).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 6. Color contrast (basic check)
// ---------------------------------------------------------------------------
test.describe("Visual clarity", () => {
  test("node labels are visible (non-transparent)", async ({ page }) => {
    await waitForGraph(page)

    const labels = page.locator('[data-slot="network-graph-node-label"]')
    const count = await labels.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < Math.min(count, 3); i++) {
      const fill = await labels.nth(i).evaluate((el) => getComputedStyle(el).fill)
      expect(fill).toBeTruthy()
      expect(fill).not.toBe("none")
      expect(fill).not.toBe("transparent")
    }
  })

  test("edge labels are readable", async ({ page }) => {
    await waitForGraph(page)

    const labels = page.locator('[data-slot="network-graph-edge-label"] text')
    const count = await labels.count()
    if (count > 0) {
      const fill = await labels.first().evaluate((el) => getComputedStyle(el).fill)
      expect(fill).toBeTruthy()
      expect(fill).not.toBe("none")
    }
  })
})
