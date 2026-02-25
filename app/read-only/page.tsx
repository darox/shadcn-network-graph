import NetworkGraphReadOnlyDemo from "@/registry/example/network-graph-read-only-demo"
import { ThemeSwitcher } from "@/components/theme-switcher"

export default function ReadOnlyPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="relative w-full">
        <NetworkGraphReadOnlyDemo />
        <div className="absolute bottom-3 right-3 z-10">
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  )
}
