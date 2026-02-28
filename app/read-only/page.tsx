import NetworkGraphReadOnlyDemo from "@/registry/example/network-graph-read-only-demo"
import { ThemeSwitcher } from "@/components/theme-switcher"

export default function ReadOnlyPage() {
  return (
    <div className="flex h-dvh flex-col items-center sm:justify-center sm:p-8">
      <div className="relative h-full w-full sm:h-auto">
        <NetworkGraphReadOnlyDemo />
        <div className="absolute bottom-3 right-3 z-10">
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  )
}
