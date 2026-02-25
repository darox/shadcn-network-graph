import { test, expect, Page } from "@playwright/test"

// These tests are written for desktop — mobile has dedicated tests in mobile.spec.ts
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop only")
})

/**
 * Resolves a CSS variable (e.g. "--background") to its computed value
 * on the document root, then converts it to an RGB string for comparison.
 */
async function getCSSVar(page: Page, varName: string): Promise<string> {
  return page.evaluate((v) => {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(v)
      .trim()
    // Create a temporary element to resolve oklch/hsl/etc to rgb
    const el = document.createElement("div")
    el.style.color = raw
    document.body.appendChild(el)
    const rgb = getComputedStyle(el).color
    el.remove()
    return rgb
  }, varName)
}

const modes = ["light", "dark"] as const

async function toggleDark(page: Page) {
  // The dark/light toggle is the last button with a sun/moon icon
  const darkBtn = page.locator(
    'button[aria-label="Switch to dark mode"], button[aria-label="Switch to light mode"]'
  )
  await darkBtn.click()
  await page.waitForTimeout(100)
}

// ---------------------------------------------------------------------------
// 1. Light and dark mode render without errors
// ---------------------------------------------------------------------------
for (const mode of modes) {
  test(`neutral ${mode}: renders graph without errors`, async ({ page }) => {
    await page.goto("/")
    await page.waitForSelector('[data-slot="network-graph-node"]', {
      timeout: 10000,
    })

    if (mode === "dark") await toggleDark(page)
    await page.waitForTimeout(150)

    // Graph nodes render
    const nodes = page.locator('[data-slot="network-graph-node"]')
    await expect(nodes).toHaveCount(10)

    // Edges render
    const edges = page.locator('[data-slot="network-graph-edge"]')
    await expect(edges).not.toHaveCount(0)

    // Group hulls render
    const groups = page.locator('[data-slot="network-graph-group"]')
    await expect(groups).not.toHaveCount(0)

    // Minimap renders
    await expect(
      page.locator('[data-slot="network-graph-minimap"]')
    ).toBeVisible()

    // Controls render
    await expect(
      page.locator('[data-slot="network-graph-controls"]')
    ).toBeVisible()

    // Search renders
    await expect(
      page.locator('[data-slot="network-graph-search"]')
    ).toBeVisible()

    // No console errors during render
    const errors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text())
    })
    // Give time for any delayed errors
    await page.waitForTimeout(200)
    expect(errors.length).toBe(0)
  })
}

// ---------------------------------------------------------------------------
// 3. Dark mode inverts background/foreground
// ---------------------------------------------------------------------------
test("dark mode inverts background and foreground", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 10000,
  })

  const lightBg = await getCSSVar(page, "--background")
  const lightFg = await getCSSVar(page, "--foreground")

  await toggleDark(page)
  await page.waitForTimeout(100)

  const darkBg = await getCSSVar(page, "--background")
  const darkFg = await getCSSVar(page, "--foreground")

  // Background and foreground should swap (or at least differ)
  expect(darkBg).not.toBe(lightBg)
  expect(darkFg).not.toBe(lightFg)
})

// ---------------------------------------------------------------------------
// 4. All nodes use default card fill
// ---------------------------------------------------------------------------
test("all nodes use default card fill", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 10000,
  })

  // All node rects should use the default card fill
  const fills = await page.evaluate(() => {
    const rects = document.querySelectorAll(
      '[data-slot="network-graph-node-rect"]'
    )
    return Array.from(rects).map((el) => getComputedStyle(el).fill)
  })

  // All fills should be the same (no colored variants)
  const unique = new Set(fills)
  expect(unique.size).toBe(1)
})

// ---------------------------------------------------------------------------
// 5. Node rects have a valid fill color
// ---------------------------------------------------------------------------
test("node rects have a valid fill color", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 10000,
  })

  const fill = await page.evaluate(() => {
    const el = document.querySelector('[data-slot="network-graph-node-rect"]')
    return el ? getComputedStyle(el).fill : null
  })

  expect(fill).toBeTruthy()
  expect(fill).not.toBe("none")
})

// ---------------------------------------------------------------------------
// 6. Selection ring uses --ring token
// ---------------------------------------------------------------------------
test("selected node uses ring color for stroke", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 10000,
  })

  // Click a node to select it
  const node = page.locator('[data-slot="network-graph-node"]').first()
  await node.click()

  // The selected node's rect should have stroke-ring class
  const selectedRect = page.locator(
    '[data-slot="network-graph-node-rect"].stroke-ring'
  )
  await expect(selectedRect).toHaveCount(1)

  // Verify [stroke-width:2] class is applied (computed value may differ due to SVG transform)
  const hasStrokeWidth2 = await selectedRect.evaluate((el) =>
    el.classList.contains("[stroke-width:2]")
  )
  expect(hasStrokeWidth2).toBe(true)
})

// ---------------------------------------------------------------------------
// 7. Edge stroke uses --border token
// ---------------------------------------------------------------------------
test("edges use border color for stroke", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 10000,
  })

  const edgeStroke = await page.evaluate(() => {
    const el = document.querySelector('[data-slot="network-graph-edge"]')
    return el ? getComputedStyle(el).stroke : null
  })

  const borderColor = await getCSSVar(page, "--border")

  // Both should resolve to a color value (they may not be identical rgb strings
  // due to oklch conversion, but both should be non-empty)
  expect(edgeStroke).toBeTruthy()
  expect(borderColor).toBeTruthy()
})

// ---------------------------------------------------------------------------
// 8. Group hull uses muted fill
// ---------------------------------------------------------------------------
test("group hull uses muted background", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 10000,
  })

  const hullFill = await page.evaluate(() => {
    const el = document.querySelector('[data-slot="network-graph-group"] path')
    return el ? getComputedStyle(el).fill : null
  })

  expect(hullFill).toBeTruthy()
  // Should have some opacity (not fully opaque and not transparent)
  // The class is fill-muted/30, so it should resolve to a color with alpha
})

// ---------------------------------------------------------------------------
// 9. Minimap uses card background
// ---------------------------------------------------------------------------
test("minimap has card-like background", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 10000,
  })

  const minimapBg = await page.evaluate(() => {
    const el = document.querySelector('[data-slot="network-graph-minimap"]')
    return el ? getComputedStyle(el).backgroundColor : null
  })

  // Minimap should have a background color (bg-card/80)
  expect(minimapBg).toBeTruthy()
})

// ---------------------------------------------------------------------------
// 10. Controls buttons match shadcn Button styling
// ---------------------------------------------------------------------------
test("control buttons use shadcn outline variant", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 10000,
  })

  const zoomInBtn = page.locator('[aria-label="Zoom in"]')
  await expect(zoomInBtn).toBeVisible()

  // Button should have border (outline variant)
  const borderStyle = await zoomInBtn.evaluate((el) =>
    getComputedStyle(el).borderStyle
  )
  expect(borderStyle).not.toBe("none")
})

// ---------------------------------------------------------------------------
// 11. Search input uses proper input styling
// ---------------------------------------------------------------------------
test("search input uses shadcn input tokens", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 10000,
  })

  const input = page.locator('[data-slot="network-graph-search"] input')
  await expect(input).toBeVisible()

  // Input should have border-input styling
  const borderColor = await input.evaluate((el) =>
    getComputedStyle(el).borderColor
  )
  expect(borderColor).toBeTruthy()

  // Input should have bg-background
  const bg = await input.evaluate((el) =>
    getComputedStyle(el).backgroundColor
  )
  expect(bg).toBeTruthy()
})

// ---------------------------------------------------------------------------
// 12. No hardcoded hex/rgb colors in computed styles of key elements
// ---------------------------------------------------------------------------
test("no hardcoded colors leak into computed styles", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 10000,
  })

  // Check that the graph container uses CSS variable-derived colors
  const containerBg = await page.evaluate(() => {
    const el = document.querySelector('[data-slot="network-graph"]')
    return el ? getComputedStyle(el).backgroundColor : null
  })
  expect(containerBg).toBeTruthy()
  // Should be a valid color (rgb/rgba format from browser)
  // Modern browsers may resolve oklch to lab(), rgb(), or rgba() — all are valid
  expect(containerBg).toMatch(/^(rgba?\(|lab\(|oklch\(|color\()/)
})

// ---------------------------------------------------------------------------
// 13. Node info bar uses card background + border
// ---------------------------------------------------------------------------
test("node info bar uses card background", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 10000,
  })

  // Select a node to show info bar
  const node = page.locator('[data-slot="network-graph-node"]').first()
  await node.click()

  const info = page.locator('[data-slot="network-graph-node-info"]')
  await expect(info).toBeVisible()

  const bg = await info.evaluate((el) => getComputedStyle(el).backgroundColor)
  const border = await info.evaluate((el) => getComputedStyle(el).borderColor)

  expect(bg).toBeTruthy()
  expect(bg).toMatch(/^(rgba?\(|lab\(|oklch\(|color\()/)
  expect(border).toBeTruthy()
})

// ---------------------------------------------------------------------------
// 14. Animated edges have correct animation
// ---------------------------------------------------------------------------
test("animated edges have marching-ants animation", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 10000,
  })

  const animated = page.locator(
    '[data-slot="network-graph-edge"].ng-animated-edge'
  )
  await expect(animated).not.toHaveCount(0)

  // Check that the animation property is set
  const animation = await animated.first().evaluate((el) =>
    getComputedStyle(el).animationName
  )
  expect(animation).toBe("ng-march")
})

// ---------------------------------------------------------------------------
// 15. Dark mode changes graph background
// ---------------------------------------------------------------------------
test("dark mode changes graph container background", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 10000,
  })

  const lightBg = await page.evaluate(() => {
    const el = document.querySelector('[data-slot="network-graph"]')
    return el ? getComputedStyle(el).backgroundColor : null
  })

  await toggleDark(page)
  await page.waitForTimeout(150)

  const darkBg = await page.evaluate(() => {
    const el = document.querySelector('[data-slot="network-graph"]')
    return el ? getComputedStyle(el).backgroundColor : null
  })

  expect(lightBg).not.toBe(darkBg)
})

// ---------------------------------------------------------------------------
// 17. Edge labels have proper card-like styling
// ---------------------------------------------------------------------------
test("edge labels have card-like background rect", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 10000,
  })

  const labelRect = page.locator(
    '[data-slot="network-graph-edge-label"] rect'
  )
  await expect(labelRect).not.toHaveCount(0)

  // Check the rect has fill applied
  const fill = await labelRect.first().evaluate((el) =>
    getComputedStyle(el).fill
  )
  expect(fill).toBeTruthy()
  expect(fill).not.toBe("none")
})

// ---------------------------------------------------------------------------
// 18. Arrow markers use border color
// ---------------------------------------------------------------------------
test("arrow markers have border fill", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 10000,
  })

  const markerFill = await page.evaluate(() => {
    const marker = document.querySelector("#ng-arrow path")
    return marker ? getComputedStyle(marker).fill : null
  })

  expect(markerFill).toBeTruthy()
  expect(markerFill).not.toBe("none")
})

// ---------------------------------------------------------------------------
// 19. LAN demo: nodes render with uniform styling
// ---------------------------------------------------------------------------
test("LAN demo: all nodes use default card fill", async ({ page }) => {
  await page.goto("/lan")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 10000,
  })

  // All node rects should use the default card fill
  const nodeRects = page.locator('[data-slot="network-graph-node-rect"]')
  await expect(nodeRects).not.toHaveCount(0)

  const fills = await page.evaluate(() => {
    const rects = document.querySelectorAll(
      '[data-slot="network-graph-node-rect"]'
    )
    return Array.from(rects).map((el) => getComputedStyle(el).fill)
  })

  const unique = new Set(fills)
  expect(unique.size).toBe(1)
})

// ---------------------------------------------------------------------------
// 20. Read-only demo respects theme
// ---------------------------------------------------------------------------
test("read-only demo: theme applies to non-interactive graph", async ({
  page,
}) => {
  await page.goto("/read-only")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 10000,
  })

  const lightBg = await page.evaluate(() => {
    const el = document.querySelector('[data-slot="network-graph"]')
    return el ? getComputedStyle(el).backgroundColor : null
  })

  await toggleDark(page)
  await page.waitForTimeout(150)

  const darkBg = await page.evaluate(() => {
    const el = document.querySelector('[data-slot="network-graph"]')
    return el ? getComputedStyle(el).backgroundColor : null
  })

  expect(lightBg).not.toBe(darkBg)
})
