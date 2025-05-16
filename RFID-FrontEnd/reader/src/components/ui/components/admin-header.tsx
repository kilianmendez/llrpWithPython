"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, ArrowLeft } from "lucide-react"
import { useUser } from "@/contexts/userContext"

export function AdminHeader() {
  const router = useRouter()
  const { user, logout } = useUser()

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <>
      <div className="w-full bg-[#77c99d] h-1" />
      <header className="w-full border-b border-gray-200 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Title */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <h1 className="text-2xl text-[#081c15] font-bold">
              <span className="text-[#52b788] font-sans">RFID</span> Administration Panel
            </h1>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 text-sm text-[#081c15] dark:text-white">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span>{user?.email || "Guest"}</span>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
