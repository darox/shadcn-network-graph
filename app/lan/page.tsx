import NetworkGraphLanDemo from "@/registry/example/network-graph-lan-demo"
import { ThemeSwitcher } from "@/components/theme-switcher"

export default function LanPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="relative w-full">
        <NetworkGraphLanDemo />
        <div className="absolute bottom-43 right-3 z-10">
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  )
}
