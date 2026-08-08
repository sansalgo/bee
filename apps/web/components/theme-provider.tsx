"use client"

import * as React from "react"
import { Moon, Sun } from "@phosphor-icons/react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

import { Button } from "@workspace/ui/components/button"

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // resolvedTheme is unknown on the server, so wait for the client mount
  // before rendering an icon to avoid a hydration mismatch.
  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle theme"
      disabled={!mounted}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? <Sun /> : <Moon />}
    </Button>
  )
}

export { ThemeProvider, ThemeToggle }
