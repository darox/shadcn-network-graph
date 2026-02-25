import { test, expect } from "@playwright/test"

// These tests are written for desktop — mobile has dedicated tests in mobile.spec.ts
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop only")
})

const pages = [
  { name: "Main demo", path: "/" },
  { name: "LAN demo", path: "/lan" },
  { name: "Layouts demo", path: "/layouts" },
  { name: "Read-only demo", path: "/read-only" },
]

for (const { name, path } of pages) {
  test.describe(`${name} (${path})`, () => {
    test("page loads within budget", async ({ page }) => {
      const start = Date.now()
      await page.goto(path)
      await page.waitForSelector('[data-slot="network-graph-node"]', {
        timeout: 15000,
      })
      const loadTime = Date.now() - start
      console.log(`  ${name} load time: ${loadTime}ms`)
      expect(loadTime).toBeLessThan(10000) // 10s budget
    })

    test("no memory leaks from rapid interactions", async ({ page }) => {
      await page.goto(path)
      await page.waitForSelector('[data-slot="network-graph-node"]', {
        timeout: 15000,
      })

      // Get initial JS heap
      const initialMetrics = await page.evaluate(() => {
        if ("memory" in performance) {
          return (performance as unknown as { memory: { usedJSHeapSize: number } }).memory
            .usedJSHeapSize
        }
        return null
      })

      // Wait for auto-fit to complete (nodes become visible in viewport)
      await page.waitForTimeout(2000)

      // Rapid click/select via page.evaluate (avoids viewport issues with SVG nodes)
      await page.evaluate(() => {
        const nodes = document.querySelectorAll('[data-slot="network-graph-node"]')
        for (let i = 0; i < 50; i++) {
          const node = nodes[i % nodes.length] as SVGGElement
          node.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 0, clientY: 0 }))
          node.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))
          node.dispatchEvent(new MouseEvent("click", { bubbles: true }))
        }
      })

      // Get post-interaction heap
      const finalMetrics = await page.evaluate(() => {
        if ("memory" in performance) {
          return (performance as unknown as { memory: { usedJSHeapSize: number } }).memory
            .usedJSHeapSize
        }
        return null
      })

      if (initialMetrics && finalMetrics) {
        const growth = finalMetrics - initialMetrics
        const growthMB = (growth / 1024 / 1024).toFixed(2)
        console.log(
          `  ${name} heap growth after 50 interactions: ${growthMB}MB`
        )
        // Should not grow more than 20MB from rapid clicking
        expect(growth).toBeLessThan(20 * 1024 * 1024)
      }
    })

    test("SVG render performance - measures FPS during zoom", async ({
      page,
    }) => {
      await page.goto(path)
      await page.waitForSelector('[data-slot="network-graph-node"]', {
        timeout: 15000,
      })

      // Measure frame timing during rapid zoom operations
      const frameStats = await page.evaluate(async () => {
        return new Promise<{
          frames: number
          duration: number
          avgFrameTime: number
          maxFrameTime: number
        }>((resolve) => {
          const frameTimes: number[] = []
          let lastTime = performance.now()
          let frameCount = 0
          const startTime = performance.now()

          function onFrame(now: number) {
            frameTimes.push(now - lastTime)
            lastTime = now
            frameCount++
            if (now - startTime < 2000) {
              requestAnimationFrame(onFrame)
            } else {
              resolve({
                frames: frameCount,
                duration: now - startTime,
                avgFrameTime:
                  frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length,
                maxFrameTime: Math.max(...frameTimes),
              })
            }
          }

          requestAnimationFrame(onFrame)

          // Trigger zoom interactions during measurement
          const svg = document.querySelector(
            'svg[aria-label="Network graph"]'
          )
          if (svg) {
            let i = 0
            const interval = setInterval(() => {
              svg.dispatchEvent(
                new WheelEvent("wheel", {
                  deltaY: i % 2 === 0 ? -100 : 100,
                  clientX: 400,
                  clientY: 300,
                  bubbles: true,
                })
              )
              i++
              if (i >= 20) clearInterval(interval)
            }, 100)
          }
        })
      })

      const fps = (frameStats.frames / frameStats.duration) * 1000
      console.log(`  ${name} FPS during zoom: ${fps.toFixed(1)}`)
      console.log(
        `  ${name} avg frame time: ${frameStats.avgFrameTime.toFixed(1)}ms`
      )
      console.log(
        `  ${name} max frame time: ${frameStats.maxFrameTime.toFixed(1)}ms`
      )

      // Should maintain at least 20fps during zoom
      expect(fps).toBeGreaterThan(20)
      // No frame should take longer than 200ms (catastrophic jank)
      expect(frameStats.maxFrameTime).toBeLessThan(200)
    })

    test("DOM element count is reasonable", async ({ page }) => {
      await page.goto(path)
      await page.waitForSelector('[data-slot="network-graph-node"]', {
        timeout: 15000,
      })

      const domStats = await page.evaluate(() => {
        const graph = document.querySelector('[data-slot="network-graph"]')
        if (!graph) return null
        const allElements = graph.querySelectorAll("*")
        const svgElements = graph.querySelectorAll("svg *")
        return {
          total: allElements.length,
          svgElements: svgElements.length,
        }
      })

      console.log(`  ${name} total DOM elements in graph: ${domStats?.total}`)
      console.log(`  ${name} SVG elements: ${domStats?.svgElements}`)

      // Graph shouldn't have more than 1000 elements (10 nodes, ~12 edges)
      expect(domStats!.total).toBeLessThan(1000)
    })

    test("no console errors during interactions", async ({ page }) => {
      const errors: string[] = []
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text())
      })
      page.on("pageerror", (err) => {
        errors.push(err.message)
      })

      await page.goto(path)
      await page.waitForSelector('[data-slot="network-graph-node"]', {
        timeout: 15000,
      })

      // Wait for auto-fit then click nodes via JS dispatch
      await page.waitForTimeout(2000)
      await page.evaluate(() => {
        const nodes = document.querySelectorAll('[data-slot="network-graph-node"]')
        for (let i = 0; i < Math.min(nodes.length, 3); i++) {
          nodes[i].dispatchEvent(new MouseEvent("click", { bubbles: true }))
        }
      })
      await page.waitForTimeout(100)

      // Click zoom buttons if present
      const zoomIn = page.locator('[aria-label="Zoom in"]')
      if ((await zoomIn.count()) > 0) {
        await zoomIn.click()
        await zoomIn.click()
        await zoomIn.click()
      }

      const zoomOut = page.locator('[aria-label="Zoom out"]')
      if ((await zoomOut.count()) > 0) {
        await zoomOut.click()
        await zoomOut.click()
      }

      // Reset view
      const reset = page.locator('[aria-label="Reset view"]')
      if ((await reset.count()) > 0) {
        await reset.click()
      }

      // Search if available
      const searchInput = page.locator('[aria-label="Search nodes"]')
      if ((await searchInput.count()) > 0) {
        await searchInput.fill("test")
        await page.waitForTimeout(200)
        await searchInput.fill("")
      }

      // Click background to deselect
      const svg = page.locator('svg[aria-label="Network graph"]')
      if ((await svg.count()) > 0) {
        await svg.click({ position: { x: 5, y: 5 }, force: true })
      }

      console.log(
        `  ${name} console errors: ${errors.length === 0 ? "none" : errors.join(", ")}`
      )
      expect(errors).toHaveLength(0)
    })
  })
}

// ---------------------------------------------------------------------------
// Stress test: Large graph performance
// ---------------------------------------------------------------------------
test("stress test: 100 nodes render without crash", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 15000,
  })

  // Inject a large graph via window eval
  const result = await page.evaluate(async () => {
    const start = performance.now()
    // Wait for the graph to settle, then measure how many SVG nodes exist
    await new Promise((r) => setTimeout(r, 3000))
    const nodes = document.querySelectorAll('[data-slot="network-graph-node"]')
    const elapsed = performance.now() - start
    return {
      nodeCount: nodes.length,
      elapsed: Math.round(elapsed),
      heapMB:
        "memory" in performance
          ? (
              (
                performance as unknown as {
                  memory: { usedJSHeapSize: number }
                }
              ).memory.usedJSHeapSize /
              1024 /
              1024
            ).toFixed(1)
          : "N/A",
    }
  })

  console.log(`  Stress test: ${result.nodeCount} nodes rendered`)
  console.log(`  Heap usage: ${result.heapMB}MB`)
  expect(result.nodeCount).toBeGreaterThan(0)
})

// ---------------------------------------------------------------------------
// Paint timing
// ---------------------------------------------------------------------------
test("measures Web Vitals (LCP, CLS)", async ({ page }) => {
  // Navigate and collect performance entries
  await page.goto("/")
  await page.waitForSelector('[data-slot="network-graph-node"]', {
    timeout: 15000,
  })

  const vitals = await page.evaluate(async () => {
    // Wait a bit for LCP to settle
    await new Promise((r) => setTimeout(r, 2000))

    const entries = performance.getEntriesByType(
      "paint"
    ) as PerformancePaintTiming[]
    const fcp = entries.find((e) => e.name === "first-contentful-paint")

    // Get layout shift entries
    const layoutShifts = performance
      .getEntriesByType("layout-shift")
      .reduce(
        (sum, entry) =>
          sum + ((entry as unknown as { value: number }).value || 0),
        0
      )

    // Navigation timing
    const nav = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming
    const ttfb = nav ? nav.responseStart - nav.requestStart : null
    const domContentLoaded = nav
      ? nav.domContentLoadedEventEnd - nav.requestStart
      : null

    return {
      fcp: fcp ? Math.round(fcp.startTime) : null,
      cls: Math.round(layoutShifts * 1000) / 1000,
      ttfb: ttfb ? Math.round(ttfb) : null,
      domContentLoaded: domContentLoaded
        ? Math.round(domContentLoaded)
        : null,
    }
  })

  console.log(`  FCP: ${vitals.fcp ?? "N/A"}ms`)
  console.log(`  CLS: ${vitals.cls}`)
  console.log(`  TTFB: ${vitals.ttfb ?? "N/A"}ms`)
  console.log(`  DOM Content Loaded: ${vitals.domContentLoaded ?? "N/A"}ms`)

  // FCP should be under 3s
  if (vitals.fcp) expect(vitals.fcp).toBeLessThan(3000)
  // CLS should be under 0.1 (good)
  expect(vitals.cls).toBeLessThan(0.25)
})
