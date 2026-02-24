"use client"

import { NetworkGraph } from "@/components/ui/network-graph"

const nodes = [
  { id: "internet",  label: "Internet",       subtitle: "WAN",       icon: "🌐" },
  { id: "firewall",  label: "Firewall",       subtitle: "security",  icon: "🛡" },
  { id: "router",    label: "Router",         subtitle: "gateway",   icon: "⬡" },
  { id: "switch",    label: "Switch",         subtitle: "L2",        icon: "🔀" },
  { id: "ap",        label: "Wi-Fi AP",       subtitle: "wireless",  icon: "📡" },
  { id: "server",    label: "File Server",    subtitle: "NAS",       icon: "🗄" },
  { id: "printer",   label: "Printer",        subtitle: "network",   icon: "🖨" },
  { id: "pc1",       label: "Workstation 1",  subtitle: "desktop",   icon: "🖥" },
  { id: "pc2",       label: "Workstation 2",  subtitle: "desktop",   icon: "🖥" },
  { id: "laptop",    label: "Laptop",         subtitle: "wireless",  icon: "💻" },
  { id: "phone",     label: "Phone",          subtitle: "wireless",  icon: "📱" },
]

const edges = [
  { source: "internet", target: "firewall",  label: "WAN" },
  { source: "firewall", target: "router",    label: "NAT" },
  { source: "router",   target: "switch",    label: "1 Gbps" },
  { source: "router",   target: "ap",        label: "1 Gbps" },
  { source: "switch",   target: "server",    label: "1 Gbps" },
  { source: "switch",   target: "printer",   label: "100 Mbps" },
  { source: "switch",   target: "pc1",       label: "1 Gbps" },
  { source: "switch",   target: "pc2",       label: "1 Gbps" },
  { source: "ap",       target: "laptop",    label: "Wi-Fi 6" },
  { source: "ap",       target: "phone",     label: "Wi-Fi 6" },
]

export default function NetworkGraphLanDemo() {
  return (
    <NetworkGraph
      nodes={nodes}
      edges={edges}
      width={900}
      height={600}
      onSelectionChange={(id) => console.log("selected:", id)}
    />
  )
}
