"use client"

import * as React from "react"
import { NetworkGraph } from "@/components/ui/network-graph"

const nodes = [
  { id: "api",     label: "API Gateway",   subtitle: "gateway",  icon: "⬡",  color: "primary" as const, group: "edge" },
  { id: "auth",    label: "Auth Service",  subtitle: "service",  icon: "🔑", color: "accent" as const,  group: "services" },
  { id: "db",      label: "PostgreSQL",    subtitle: "database", icon: "🗄",  group: "data" },
  { id: "cache",   label: "Redis",         subtitle: "cache",    icon: "⚡",  group: "data" },
  { id: "worker",  label: "Job Worker",    subtitle: "service",  icon: "⚙",  group: "services" },
  { id: "storage", label: "Object Store",  subtitle: "s3",       icon: "📦",  group: "data" },
  { id: "notify",  label: "Notifications", subtitle: "service",  icon: "🔔", color: "secondary" as const, group: "services" },
  { id: "ml",      label: "ML Pipeline",   subtitle: "ai",       icon: "◈",  color: "destructive" as const, group: "services" },
  { id: "queue",   label: "Message Queue", subtitle: "rabbitmq", icon: "↔",  group: "services" },
  { id: "cdn",     label: "CDN",           subtitle: "edge",     icon: "🌐", color: "primary" as const, group: "edge" },
]

const edges = [
  { source: "cdn",    target: "api",     label: "HTTP",    animated: true },
  { source: "api",    target: "auth",    label: "JWT" },
  { source: "api",    target: "db" },
  { source: "api",    target: "cache",   label: "get/set" },
  { source: "auth",   target: "db" },
  { source: "api",    target: "queue",   label: "publish", animated: true },
  { source: "queue",  target: "worker",  label: "consume", animated: true },
  { source: "worker", target: "db" },
  { source: "worker", target: "storage" },
  { source: "worker", target: "notify" },
  { source: "ml",     target: "db" },
  { source: "ml",     target: "queue" },
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

export default function NetworkGraphDemo() {
  const { ref, width } = useContainerWidth(900)
  const height = Math.round(width * (600 / 900))

  return (
    <div ref={ref} className="w-full max-w-[900px]">
      <NetworkGraph
        nodes={nodes}
        edges={edges}
        width={width}
        height={height}
        searchable
        minimap
        exportable
        onSelectionChange={(id) => console.log("selected:", id)}
      />
    </div>
  )
}
