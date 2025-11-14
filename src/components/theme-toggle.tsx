
"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-2 rounded-full border p-1">
        <Button 
            variant={theme === 'light' ? 'secondary': 'ghost'} 
            size="icon" 
            className="rounded-full h-8 w-8" 
            onClick={() => setTheme('light')}
        >
            <Sun className="h-5 w-5"/>
        </Button>
            <Button 
            variant={theme === 'dark' ? 'secondary': 'ghost'} 
            size="icon" 
            className="rounded-full h-8 w-8" 
            onClick={() => setTheme('dark')}
        >
            <Moon className="h-5 w-5"/>
        </Button>
    </div>
  )
}
