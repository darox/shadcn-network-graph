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

export default function NetworkGraphLayoutsDemo() {
  const [layout, setLayout] = React.useState<"force" | "tree" | "radial">("tree")
  const { ref, width } = useContainerWidth(900)
  const height = Math.round(width * (500 / 900))

  return (
    <div className="flex w-full max-w-[900px] flex-col items-center gap-4">
      <div className="flex gap-2">
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
      <div ref={ref} className="w-full">
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
