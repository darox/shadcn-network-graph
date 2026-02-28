import NetworkGraphDemo from "@/registry/example/network-graph-demo"
import { ThemeSwitcher } from "@/components/theme-switcher"

export default function Home() {
  return (
    <div className="flex h-dvh flex-col items-center sm:justify-center sm:p-8">
      <div className="relative h-full w-full sm:h-auto">
        <NetworkGraphDemo />
        <div className="absolute bottom-27 right-3 z-10">
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  )
}
