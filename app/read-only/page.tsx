import NetworkGraphReadOnlyDemo from "@/registry/example/network-graph-read-only-demo"
import { ThemeSwitcher } from "@/components/theme-switcher"

export default function ReadOnlyPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <ThemeSwitcher />
      <NetworkGraphReadOnlyDemo />
    </div>
  )
}
