"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Wifi, WifiOff, LogOut } from "lucide-react"
import axios from "axios"
import { API_CONNECT_READER, API_DISCONNECT_READER } from "@/app/config/config"
import { useUser } from "@/contexts/userContext"

interface HeaderProps {
  isConnected: boolean
  onToggleConnection: (isSimulated: boolean) => void
  onRefreshReadings: () => void
}

export function Header({ isConnected, onToggleConnection, onRefreshReadings }: HeaderProps) {
  const [simulateMode, setSimulateMode] = useState(false)
  const [ipAddress, setIpAddress] = useState("")
  const { user, logout } = useUser()
  const router = useRouter()

  const isGuest = user?.isGuest

  const handleConnect = async () => {
    try {
      if (isConnected) {
        await axios.post(API_DISCONNECT_READER)
        onToggleConnection(simulateMode)
        onRefreshReadings()
      } else {
        const response = await axios.post(API_CONNECT_READER, {
          ip_address: simulateMode ? "127.0.0.1" : ipAddress,
          simulation_mode: simulateMode,
        })
        onToggleConnection(simulateMode)
      }
    } catch (error) {
      console.error("Error during connection toggle:", error)
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <>
      <div className="w-full bg-[#77c99d] h-1"></div>
      <header className="w-full border-b border-gray-200 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Title */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <h1 className="text-2xl text-[#081c15] font-bold">
              <span className="text-[#52b788] font-sans">RFID</span>{" "}
              {isGuest ? "Inventory" : "Reader Dashboard"}
            </h1>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            {!isGuest && (
              <>
                <div className="flex items-center gap-2">
                  <Switch checked={simulateMode} onCheckedChange={setSimulateMode} />
                  <span className="text-sm text-[#081c15]">
                    {simulateMode ? "Simulation Mode" : "Connection Mode"}
                  </span>
                </div>

                {!simulateMode && (
                  <Input
                    type="text"
                    placeholder="Enter Reader IP"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    className="w-44 md:w-48 bg-white dark:bg-gray-800"
                  />
                )}

                <Button
                  onClick={handleConnect}
                  variant={isConnected ? "default" : "outline"}
                  className={isConnected ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                >
                  {isConnected ? (
                    <>
                      <Wifi className="mr-2 h-4 w-4" />
                      Connected
                    </>
                  ) : (
                    <>
                      <WifiOff className="mr-2 h-4 w-4" />
                      Connect Reader
                    </>
                  )}
                </Button>
              </>
            )}

            {user?.isAdmin && (
              <Button
                variant="outline"
                onClick={() => router.push("/admin")}
                className="text-sm"
              >
                Manage Users
              </Button>
            )}

            <div className="flex items-center gap-2 text-sm text-[#081c15] dark:text-white">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="truncate max-w-[120px]">{user?.email || "Guest"}</span>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
