"use client"

import * as React from "react"
import { NetworkGraph } from "@/components/ui/network-graph"

const nodes = [
  { id: "root",   label: "Root",    subtitle: "entry" },
  { id: "a",      label: "Node A",  subtitle: "child" },
  { id: "b",      label: "Node B",  subtitle: "child" },
  { id: "c",      label: "Node C",  subtitle: "child" },
  { id: "a1",     label: "Leaf A1", subtitle: "leaf" },
  { id: "a2",     label: "Leaf A2", subtitle: "leaf" },
  { id: "b1",     label: "Leaf B1", subtitle: "leaf" },
  { id: "c1",     label: "Leaf C1", subtitle: "leaf" },
  { id: "c2",     label: "Leaf C2", subtitle: "leaf" },
]

const edges = [
  { source: "root", target: "a" },
  { source: "root", target: "b" },
  { source: "root", target: "c" },
  { source: "a",    target: "a1" },
  { source: "a",    target: "a2" },
  { source: "b",    target: "b1" },
  { source: "c",    target: "c1" },
  { source: "c",    target: "c2" },
]

function useContainerSize() {
  const ref = React.useRef<HTMLDivElement>(null)
  const [size, setSize] = React.useState({ width: 900, height: 500 })
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width)
      const h = Math.round(entry.contentRect.height)
      setSize({ width: w, height: h > 0 ? h : Math.round(w * 500 / 900) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, ...size }
}

export default function NetworkGraphLayoutsDemo() {
  const [layout, setLayout] = React.useState<"force" | "tree" | "radial">("tree")
  const { ref, width, height } = useContainerSize()

  return (
    <div className="flex h-full w-full flex-col items-center gap-4 sm:max-w-[900px]">
      <div className="flex gap-2 py-2 sm:py-0">
        {(["force", "tree", "radial"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLayout(l)}
            className={`rounded-md border px-3 py-1 text-sm capitalize ${
              layout === l
                ? "border-ring bg-primary text-primary-foreground"
                : "border-border bg-card text-card-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      <div ref={ref} className="h-full w-full min-h-0 flex-1">
        <NetworkGraph
          nodes={nodes}
          edges={edges}
          width={width}
          height={height}
          layout={layout}
          minimap
          onSelectionChange={(id) => console.log("selected:", id)}
        />
      </div>
    </div>
  )
}
