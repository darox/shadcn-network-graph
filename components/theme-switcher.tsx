"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

const themes = ["neutral", "zinc", "slate", "rose", "green", "orange"] as const
type Theme = (typeof themes)[number]

export function ThemeSwitcher() {
  const [theme, setTheme] = React.useState<Theme>("neutral")
  const [dark, setDark] = React.useState(false)

  React.useEffect(() => {
    const html = document.documentElement
    for (const t of themes) html.classList.remove(`theme-${t}`)
    if (theme !== "neutral") html.classList.add(`theme-${theme}`)
    html.classList.toggle("dark", dark)
  }, [theme, dark])

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {themes.map((t) => (
        <Button
          key={t}
          variant={theme === t ? "default" : "outline"}
          size="sm"
          onClick={() => setTheme(t)}
          className="capitalize"
        >
          {t}
        </Button>
      ))}
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => setDark((d) => !d)}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>
    </div>
  )
}
