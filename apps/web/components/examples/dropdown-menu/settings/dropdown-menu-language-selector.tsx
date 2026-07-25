"use client"

import { Languages } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const Example = () => {
  const [language, setLanguage] = useState("en")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Languages className="h-4 w-4" />
          Language
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        <DropdownMenuLabel>Select Language</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup onValueChange={setLanguage} value={language}>
          <DropdownMenuRadioItem value="en">
            <span className="flex items-center gap-2">
              <span>🇺🇸</span>
              <span>English</span>
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="es">
            <span className="flex items-center gap-2">
              <span>🇪🇸</span>
              <span>Español</span>
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="fr">
            <span className="flex items-center gap-2">
              <span>🇫🇷</span>
              <span>Français</span>
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="de">
            <span className="flex items-center gap-2">
              <span>🇩🇪</span>
              <span>Deutsch</span>
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="ja">
            <span className="flex items-center gap-2">
              <span>🇯🇵</span>
              <span>日本語</span>
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="zh">
            <span className="flex items-center gap-2">
              <span>🇨🇳</span>
              <span>中文</span>
            </span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default Example
