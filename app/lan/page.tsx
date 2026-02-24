import NetworkGraphLanDemo from "@/registry/example/network-graph-lan-demo"
import { ThemeSwitcher } from "@/components/theme-switcher"

export default function LanPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <ThemeSwitcher />
      <NetworkGraphLanDemo />
    </div>
  )
}
