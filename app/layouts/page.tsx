import NetworkGraphLayoutsDemo from "@/registry/example/network-graph-layouts-demo"
import { ThemeSwitcher } from "@/components/theme-switcher"

export default function LayoutsPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="relative w-full">
        <NetworkGraphLayoutsDemo />
        <div className="absolute bottom-27 right-3 z-10">
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  )
}
