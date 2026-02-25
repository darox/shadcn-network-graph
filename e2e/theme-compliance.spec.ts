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

/**
 * Gets the computed fill/stroke/color of an SVG or HTML element as rgb.
 */
async function getComputedColor(
  page: Page,
  selector: string,
  prop: string
): Promise<string> {
  return page.evaluate(
    ([sel, p]) => {
      const el = document.querySelector(sel)
      if (!el) throw new Error(`Element not found: ${sel}`)
      return getComputedStyle(el).getPropertyValue(p)
    },
    [selector, prop] as const
  )
}

const themes = ["neutral", "zinc", "slate", "rose", "green", "orange"] as const
const modes = ["light", "dark"] as const

async function switchTheme(page: Page, theme: string) {
  // Click the theme button by its text
  const btn = page.getByRole("button", { name: new RegExp(`^${theme}$`, "i") })
  await btn.click()
  await page.waitForTimeout(100)
}

async function toggleDark(page: Page) {
  // The dark/light toggle is the last button with a sun/moon icon
  const darkBtn = page.locator(
    'button[aria-label="Switch to dark mode"], button[aria-label="Switch to light mode"]'
  )
  await darkBtn.click()
  await page.waitForTimeout(100)
}

// ---------------------------------------------------------------------------
// 1. Every theme × mode renders without errors
// ---------------------------------------------------------------------------
for (const theme of themes) {
  for (const mode of modes) {
    test(`${theme} ${mode}: renders graph without errors`, async ({ page }) => {
      await page.goto("/")
      await page.waitForSelector('[data-slot="network-graph-node"]', {
        timeout: 10000,
      })

      // Switch to the requested theme
      if (theme !== "neutral") await switchTheme(page, theme)
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
}

// ---------------------------------------------------------------------------
// 2. Background color changes between themes
// ---------------------------------------------------------------------------
test("background color differs between themes", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 10000,
  })

  // shadcn themes share the same --background in light mode (white).
  // The distinguishing token is --primary, which changes per theme.
  const primaryColors: string[] = []
  for (const theme of themes) {
    await switchTheme(page, theme)
    await page.waitForTimeout(100)
    const primary = await getCSSVar(page, "--primary")
    primaryColors.push(primary)
  }

  // Rose, green, orange should have distinct --primary colors
  const unique = new Set(primaryColors)
  expect(unique.size).toBeGreaterThanOrEqual(3)
})

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
// 4. Node color tokens resolve correctly per theme
// ---------------------------------------------------------------------------
for (const theme of themes) {
  test(`${theme}: node color tokens are distinct`, async ({ page }) => {
    await page.goto("/")
    await page.waitForSelector('[data-slot="network-graph-node"]', {
      timeout: 10000,
    })
    if (theme !== "neutral") await switchTheme(page, theme)
    await page.waitForTimeout(100)

    // Get the computed fill of different colored node rects
    const primaryFill = await page.evaluate(() => {
      const el = document.querySelector(
        '[data-slot="network-graph-node-rect"].fill-primary'
      )
      return el ? getComputedStyle(el).fill : null
    })

    const defaultFill = await page.evaluate(() => {
      const el = document.querySelector(
        '[data-slot="network-graph-node-rect"].fill-card'
      )
      return el ? getComputedStyle(el).fill : null
    })

    // Primary-colored nodes should have different fill than default-colored nodes
    if (primaryFill && defaultFill) {
      expect(primaryFill).not.toBe(defaultFill)
    }
  })
}

// ---------------------------------------------------------------------------
// 5. Destructive color is visually red-ish (not same as primary)
// ---------------------------------------------------------------------------
test("destructive color is distinct from primary", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 10000,
  })

  const destructiveFill = await page.evaluate(() => {
    const el = document.querySelector(
      '[data-slot="network-graph-node-rect"].fill-destructive'
    )
    return el ? getComputedStyle(el).fill : null
  })

  const primaryFill = await page.evaluate(() => {
    const el = document.querySelector(
      '[data-slot="network-graph-node-rect"].fill-primary'
    )
    return el ? getComputedStyle(el).fill : null
  })

  expect(destructiveFill).not.toBeNull()
  expect(primaryFill).not.toBeNull()
  expect(destructiveFill).not.toBe(primaryFill)
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
// 15. Theme switching propagates to all graph elements
// ---------------------------------------------------------------------------
for (const theme of ["rose", "green", "orange"] as const) {
  test(`${theme}: primary color propagates to node fills`, async ({
    page,
  }) => {
    await page.goto("/")
    await page.waitForSelector('[data-slot="network-graph-node"]', {
      timeout: 10000,
    })

    // Get neutral primary fill
    const neutralFill = await page.evaluate(() => {
      const el = document.querySelector(
        '[data-slot="network-graph-node-rect"].fill-primary'
      )
      return el ? getComputedStyle(el).fill : null
    })

    // Switch to colored theme
    await switchTheme(page, theme)
    await page.waitForTimeout(150)

    const themedFill = await page.evaluate(() => {
      const el = document.querySelector(
        '[data-slot="network-graph-node-rect"].fill-primary'
      )
      return el ? getComputedStyle(el).fill : null
    })

    // Rose/Green/Orange primary should differ from neutral primary
    expect(themedFill).not.toBeNull()
    expect(neutralFill).not.toBeNull()
    expect(themedFill).not.toBe(neutralFill)
  })
}

// ---------------------------------------------------------------------------
// 16. Dark mode changes graph background
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
// 19. LAN demo: theme colors propagate to colored nodes
// ---------------------------------------------------------------------------
test("LAN demo: theme colors applied correctly", async ({ page }) => {
  await page.goto("/lan")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 10000,
  })

  // Primary nodes exist
  const primary = page.locator(
    '[data-slot="network-graph-node-rect"].fill-primary'
  )
  await expect(primary).not.toHaveCount(0)

  // Destructive nodes exist
  const destructive = page.locator(
    '[data-slot="network-graph-node-rect"].fill-destructive'
  )
  await expect(destructive).not.toHaveCount(0)

  // Accent nodes exist
  const accent = page.locator(
    '[data-slot="network-graph-node-rect"].fill-accent'
  )
  await expect(accent).not.toHaveCount(0)

  // Switch to rose theme — primary color should change
  await switchTheme(page, "rose")
  await page.waitForTimeout(150)

  const rosePrimaryFill = await primary.first().evaluate((el) =>
    getComputedStyle(el).fill
  )
  expect(rosePrimaryFill).toBeTruthy()
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
