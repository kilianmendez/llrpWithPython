"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Wifi, WifiOff } from "lucide-react"
import axios from "axios"
import { API_CONNECT_READER, API_DISCONNECT_READER } from "@/app/config/config"

interface HeaderProps {
  isConnected: boolean
  onToggleConnection: (isSimulated: boolean) => void
  onRefreshReadings: () => void
}

export function Header({ isConnected, onToggleConnection, onRefreshReadings }: HeaderProps) {
  const [simulateMode, setSimulateMode] = useState(false)
  const [ipAddress, setIpAddress] = useState("")

  const handleConnect = async () => {
    try {
      if (isConnected) {
        await axios.post(API_DISCONNECT_READER)
        console.log("Reader disconnected")
        onToggleConnection(simulateMode)
        onRefreshReadings() // 👈 Triggea recarga de lecturas recientes
      } else {
        const response = await axios.post(API_CONNECT_READER, {
          ip_address: simulateMode ? "127.0.0.1" : ipAddress,
          simulation_mode: simulateMode,
        })
        console.log(response.data)
        onToggleConnection(simulateMode)
      }
    } catch (error) {
      console.error("Error during connection toggle:", error)
    }
  }

  return (
    <>
    <div className="w-full bg-[#77c99d] h-1"></div>
    <header className="w-full border-b border-gray-200 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
      {/* <div className="w-full bg-gray-200">some</div> */}
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <h1 className="text-2xl text-[#081c15] font-bold"><span className="text-[#52b788] font-sans">RFID</span> Administration Panel</h1>
        </div>

        <div className="flex items-center gap-5">
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
              className="w-48 bg-white dark:bg-gray-800"
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
        </div>
      </div>
    </header>
    </>
  )
}
