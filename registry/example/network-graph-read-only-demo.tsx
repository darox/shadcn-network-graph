"use client"

import * as React from "react"
import { NetworkGraph } from "@/components/ui/network-graph"

const nodes = [
  { id: "client", label: "Client",    subtitle: "browser",  icon: "🌐" },
  { id: "lb",     label: "Load Balancer", subtitle: "nginx", icon: "⬡" },
  { id: "app1",   label: "App Server 1", subtitle: "node",  icon: "⚙" },
  { id: "app2",   label: "App Server 2", subtitle: "node",  icon: "⚙" },
  { id: "db",     label: "Database",  subtitle: "postgres", icon: "🗄" },
]

const edges = [
  { source: "client", target: "lb",   label: "HTTPS" },
  { source: "lb",     target: "app1", label: "round-robin" },
  { source: "lb",     target: "app2", label: "round-robin" },
  { source: "app1",   target: "db",   label: "pg" },
  { source: "app2",   target: "db",   label: "pg" },
]

function useContainerWidth(maxWidth: number) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [w, setW] = React.useState(maxWidth)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setW(Math.min(entry.contentRect.width, maxWidth))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [maxWidth])
  return { ref, width: w }
}

export default function NetworkGraphReadOnlyDemo() {
  const { ref, width } = useContainerWidth(600)
  const height = Math.round(width * (360 / 600))

  return (
    <div ref={ref} className="w-full max-w-[600px]">
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
