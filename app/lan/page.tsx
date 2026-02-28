import NetworkGraphLanDemo from "@/registry/example/network-graph-lan-demo"
import { ThemeSwitcher } from "@/components/theme-switcher"

export default function LanPage() {
  return (
    <div className="flex h-dvh flex-col items-center sm:justify-center sm:p-8">
      <div className="relative h-full w-full sm:h-auto">
        <NetworkGraphLanDemo />
        <div className="absolute bottom-43 right-3 z-10">
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  )
}
