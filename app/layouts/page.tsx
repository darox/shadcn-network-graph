import NetworkGraphLayoutsDemo from "@/registry/example/network-graph-layouts-demo"
import { ThemeSwitcher } from "@/components/theme-switcher"

export default function LayoutsPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <ThemeSwitcher />
      <NetworkGraphLayoutsDemo />
    </div>
  )
}
