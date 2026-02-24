import NetworkGraphDemo from "@/registry/example/network-graph-demo"
import { ThemeSwitcher } from "@/components/theme-switcher"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <ThemeSwitcher />
      <NetworkGraphDemo />
    </div>
  )
}
