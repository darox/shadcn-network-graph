"use client"

import * as React from "react"
import { NetworkGraph } from "@/components/ui/network-graph"

const nodes = [
  { id: "internet",  label: "Internet",       subtitle: "WAN",       icon: "🌐", color: "primary" as const, group: "WAN" },
  { id: "firewall",  label: "Firewall",       subtitle: "security",  icon: "🛡", color: "destructive" as const, group: "WAN" },
  { id: "router",    label: "Router",         subtitle: "gateway",   icon: "⬡",  color: "accent" as const, group: "Core" },
  { id: "switch",    label: "Switch",         subtitle: "L2",        icon: "🔀", group: "Core" },
  { id: "ap",        label: "Wi-Fi AP",       subtitle: "wireless",  icon: "📡", group: "Core" },
  { id: "server",    label: "File Server",    subtitle: "NAS",       icon: "🗄",  group: "Wired" },
  { id: "printer",   label: "Printer",        subtitle: "network",   icon: "🖨", group: "Wired" },
  { id: "pc1",       label: "Workstation 1",  subtitle: "desktop",   icon: "🖥", group: "Wired" },
  { id: "pc2",       label: "Workstation 2",  subtitle: "desktop",   icon: "🖥", group: "Wired" },
  { id: "laptop",    label: "Laptop",         subtitle: "wireless",  icon: "💻", group: "Wireless" },
  { id: "phone",     label: "Phone",          subtitle: "wireless",  icon: "📱", group: "Wireless" },
]

const edges = [
  { source: "internet", target: "firewall",  label: "WAN",      animated: true },
  { source: "firewall", target: "router",    label: "NAT",      animated: true },
  { source: "router",   target: "switch",    label: "1 Gbps" },
  { source: "router",   target: "ap",        label: "1 Gbps" },
  { source: "switch",   target: "server",    label: "1 Gbps" },
  { source: "switch",   target: "printer",   label: "100 Mbps" },
  { source: "switch",   target: "pc1",       label: "1 Gbps" },
  { source: "switch",   target: "pc2",       label: "1 Gbps" },
  { source: "ap",       target: "laptop",    label: "Wi-Fi 6" },
  { source: "ap",       target: "phone",     label: "Wi-Fi 6" },
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

export default function NetworkGraphLanDemo() {
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
