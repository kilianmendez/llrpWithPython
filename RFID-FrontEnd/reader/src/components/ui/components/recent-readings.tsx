"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { API_GET_READINGS } from "@/app/config/config"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Tag, Copy, Check } from "lucide-react"

interface Reading {
  epc: string
  antenna: number
  rssi: number
  timestamp: string
  count: number
}

interface RecentReadingsProps {
  refreshTrigger?: number
}

export function RecentReadings({ refreshTrigger }: RecentReadingsProps) {
  const [readings, setReadings] = useState<Reading[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedEpc, setCopiedEpc] = useState<string | null>(null)

  const fetchReadings = async () => {
    try {
      const response = await axios.get(API_GET_READINGS)
      setReadings(response.data.reverse())
    } catch (error) {
      console.error("Error fetching readings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (epc: string) => {
    navigator.clipboard.writeText(epc)
    setCopiedEpc(epc)

    setTimeout(() => {
      setCopiedEpc(null)
    }, 2000)
  }

  useEffect(() => {
    fetchReadings()
  }, [refreshTrigger])

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-emerald-500" />
          Recent RFID Reads
        </CardTitle>
        <CardDescription>
          List of the latest 100 tags detected (from database)
        </CardDescription>
      </CardHeader>
      <CardContent>
  <div className="max-h-[450px] overflow-y-auto space-y-2 text-sm font-mono pr-2">
    {loading ? (
      <p className="text-gray-500">Loading readings...</p>
    ) : readings.length === 0 ? (
      <p className="text-gray-500">No readings found.</p>
    ) : (
      readings.map((r, idx) => (
        <div
          key={`${r.epc}-${idx}`}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-1 gap-x-4 border-b py-2"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-emerald-700 break-all">{r.epc}</span>
            <button
              onClick={() => handleCopy(r.epc)}
              className="text-gray-400 hover:text-emerald-600 transition-colors"
              title="Copy EPC"
            >
              {copiedEpc === r.epc ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="text-xs text-gray-500">
            Antenna: {r.antenna} | RSSI: {r.rssi} | Count: {r.count}
          </div>
          <div className="text-xs text-gray-400">
            {new Date(r.timestamp).toLocaleString()}
          </div>
        </div>
      ))
    )}
  </div>
</CardContent>

    </Card>
  )
}
