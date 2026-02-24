import { NetworkGraph } from "@/components/ui/network-graph"

const nodes = [
  { id: "client", label: "Client",    subtitle: "browser",  icon: "🌐" },
  { id: "lb",     label: "Load Balancer", subtitle: "nginx", icon: "⬡" },
  { id: "app1",   label: "App Server 1", subtitle: "node",  icon: "⚙" },
  { id: "app2",   label: "App Server 2", subtitle: "node",  icon: "⚙" },
  { id: "db",     label: "Database",  subtitle: "postgres", icon: "🗄" },
]

const edges = [
  { source: "client", target: "lb" },
  { source: "lb",     target: "app1" },
  { source: "lb",     target: "app2" },
  { source: "app1",   target: "db" },
  { source: "app2",   target: "db" },
]

export default function NetworkGraphReadOnlyDemo() {
  return (
    <NetworkGraph
      nodes={nodes}
      edges={edges}
      width={600}
      height={360}
      interactive={false}
    />
  )
}
