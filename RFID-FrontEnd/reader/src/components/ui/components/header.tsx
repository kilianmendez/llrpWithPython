"use client"

import { Button } from "@/components/ui/button"
import { Wifi, WifiOff } from "lucide-react"

interface HeaderProps {
  isConnected: boolean
  onToggleConnection: () => void
}

export function Header({ isConnected, onToggleConnection }: HeaderProps) {
  return (
    <header className="w-full border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-2">
          {/* ❌ Elimina SidebarTrigger */}
          {/* <SidebarTrigger className="md:hidden" /> */}
          <h1 className="text-xl font-semibold">RFID Administration Panel</h1>
        </div>

        <Button
          onClick={onToggleConnection}
          variant={isConnected ? "default" : "outline"}
          className={isConnected ? "bg-emerald-600 hover:bg-emerald-700" : ""}
        >
          {isConnected ? (
            <>
              <Wifi className="mr-2 h-4 w-4" />
              Reader Connected
            </>
          ) : (
            <>
              <WifiOff className="mr-2 h-4 w-4" />
              Connect Reader
            </>
          )}
        </Button>
      </div>
    </header>
  )
}
