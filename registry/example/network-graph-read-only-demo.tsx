"use client"

import * as React from "react"
import { NetworkGraph } from "@/components/ui/network-graph"

const nodes = [
  { id: "client", label: "Client",       subtitle: "browser" },
  { id: "lb",     label: "Load Balancer", subtitle: "nginx" },
  { id: "app1",   label: "App Server 1", subtitle: "node" },
  { id: "app2",   label: "App Server 2", subtitle: "node" },
  { id: "db",     label: "Database",     subtitle: "postgres" },
]

const edges = [
  { source: "client", target: "lb",   label: "HTTPS" },
  { source: "lb",     target: "app1", label: "round-robin" },
  { source: "lb",     target: "app2", label: "round-robin" },
  { source: "app1",   target: "db",   label: "pg" },
  { source: "app2",   target: "db",   label: "pg" },
]

function useContainerSize() {
  const ref = React.useRef<HTMLDivElement>(null)
  const [size, setSize] = React.useState({ width: 600, height: 360 })
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width)
      const h = Math.round(entry.contentRect.height)
      setSize({ width: w, height: h > 0 ? h : Math.round(w * 360 / 600) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, ...size }
}

export default function NetworkGraphReadOnlyDemo() {
  const { ref, width, height } = useContainerSize()

  return (
    <div ref={ref} className="h-full w-full sm:max-w-[600px]">
      <NetworkGraph
        nodes={nodes}
        edges={edges}
        width={width}
        height={height}
        interactive={false}
      />
    </div>
  )
}
