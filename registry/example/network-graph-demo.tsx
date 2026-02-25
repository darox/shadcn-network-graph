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
  const [w, setW] = React.useState(800)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setW(Math.round(entry.contentRect.width))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, width: w }
}

export default function NetworkGraphDemo() {
  const { ref, width } = useContainerSize()
  const height = Math.round(width * (9 / 16))

  return (
    <div ref={ref} className="w-full">
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
