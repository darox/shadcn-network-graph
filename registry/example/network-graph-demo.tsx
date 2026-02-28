"use client"

import * as React from "react"
import { NetworkGraph } from "@/components/ui/network-graph"

const nodes = [
  { id: "app",   label: "App",      subtitle: "frontend" },
  { id: "api",   label: "API",      subtitle: "backend" },
  { id: "auth",  label: "Auth",     subtitle: "service" },
  { id: "db",    label: "Database", subtitle: "postgres" },
  { id: "cache", label: "Cache",    subtitle: "redis" },
]

const edges = [
  { source: "app",  target: "api",   label: "REST",   animated: true },
  { source: "api",  target: "auth",  label: "JWT" },
  { source: "api",  target: "db" },
  { source: "api",  target: "cache", label: "get/set" },
  { source: "auth", target: "db" },
]

function useContainerSize() {
  const ref = React.useRef<HTMLDivElement>(null)
  const [size, setSize] = React.useState({ width: 800, height: 500 })
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width)
      const h = Math.round(entry.contentRect.height)
      setSize({ width: w, height: h > 0 ? h : Math.round(w * 9 / 16) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, ...size }
}

export default function NetworkGraphDemo() {
  const { ref, width, height } = useContainerSize()

  return (
    <div ref={ref} className="h-full w-full">
      <NetworkGraph
        nodes={nodes}
        edges={edges}
        width={width}
        height={height}
        simulationConfig={{ repulsion: 0.3, attraction: 0.12 }}
        onSelectionChange={(id) => console.log("selected:", id)}
      />
    </div>
  )
}
