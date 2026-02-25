import NetworkGraphDemo from "@/registry/example/network-graph-demo"
import { ThemeSwitcher } from "@/components/theme-switcher"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="relative w-full">
        <NetworkGraphDemo />
        <div className="absolute bottom-27 right-3 z-10">
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  )
}
