"use client"

import { NetworkGraph } from "@/components/ui/network-graph"

const nodes = [
  { id: "api",     label: "API Gateway",   subtitle: "gateway",  icon: "⬡" },
  { id: "auth",    label: "Auth Service",  subtitle: "service",  icon: "🔑" },
  { id: "db",      label: "PostgreSQL",    subtitle: "database", icon: "🗄" },
  { id: "cache",   label: "Redis",         subtitle: "cache",    icon: "⚡" },
  { id: "worker",  label: "Job Worker",    subtitle: "service",  icon: "⚙" },
  { id: "storage", label: "Object Store",  subtitle: "s3",       icon: "📦" },
  { id: "notify",  label: "Notifications", subtitle: "service",  icon: "🔔" },
  { id: "ml",      label: "ML Pipeline",   subtitle: "ai",       icon: "◈" },
  { id: "queue",   label: "Message Queue", subtitle: "rabbitmq", icon: "↔" },
  { id: "cdn",     label: "CDN",           subtitle: "edge",     icon: "🌐" },
]

const edges = [
  { source: "cdn",    target: "api" },
  { source: "api",    target: "auth" },
  { source: "api",    target: "db" },
  { source: "api",    target: "cache" },
  { source: "auth",   target: "db" },
  { source: "api",    target: "queue" },
  { source: "queue",  target: "worker" },
  { source: "worker", target: "db" },
  { source: "worker", target: "storage" },
  { source: "worker", target: "notify" },
  { source: "ml",     target: "db" },
  { source: "ml",     target: "queue" },
]

export default function NetworkGraphDemo() {
  return (
    <NetworkGraph
      nodes={nodes}
      edges={edges}
      width={800}
      height={500}
      onSelectionChange={(id) => console.log("selected:", id)}
    />
  )
}
