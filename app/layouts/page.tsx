import NetworkGraphLayoutsDemo from "@/registry/example/network-graph-layouts-demo"
import { ThemeSwitcher } from "@/components/theme-switcher"

export default function LayoutsPage() {
  return (
    <div className="flex h-dvh flex-col items-center sm:justify-center sm:p-8">
      <div className="relative h-full w-full sm:h-auto">
        <NetworkGraphLayoutsDemo />
        <div className="absolute bottom-27 right-3 z-10">
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  )
}
