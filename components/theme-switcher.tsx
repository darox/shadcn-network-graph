"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeSwitcher() {
  const [dark, setDark] = React.useState(false)

  React.useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])

  return (
    <Button
      variant="outline"
      size="icon"
      className="size-7"
      onClick={() => setDark((d) => !d)}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
