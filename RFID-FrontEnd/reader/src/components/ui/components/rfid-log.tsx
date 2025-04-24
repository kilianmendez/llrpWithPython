"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tag, AlertCircle } from "lucide-react"

interface LogEntry {
  id: string
  epc: string
  timestamp: Date
  isNew: boolean
}

interface RfidLogProps {
  isConnected: boolean
}

export function RfidLog({ isConnected }: RfidLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Simular lecturas RFID entrantes cuando está conectado
  useEffect(() => {
    if (!isConnected) return

    const epcCodes = [
      "3034257BF395AD8F2801A23C",
      "3034257BF395AD8F2801B45D",
      "3034257BF395AD8F2801C67E",
      "3034257BF395AD8F2801D89F",
      "3034257BF395AD8F2801E01G",
      "3034257BF395AD8F2801F12H",
      "3034257BF395AD8F2801G34I",
    ]

    const interval = setInterval(() => {
      const randomEpc = epcCodes[Math.floor(Math.random() * epcCodes.length)]
      const newLog = {
        id: Math.random().toString(36).substring(2, 9),
        epc: randomEpc,
        timestamp: new Date(),
        isNew: true,
      }

      setLogs((prevLogs) => {
        // Mantener solo los últimos 100 registros
        const updatedLogs = [...prevLogs, newLog].slice(-100)

        // Marcar entradas anteriores como no nuevas después de 2 segundos
        setTimeout(() => {
          setLogs((currentLogs) => currentLogs.map((log) => (log.id === newLog.id ? { ...log, isNew: false } : log)))
        }, 2000)

        return updatedLogs
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [isConnected])

  // Auto-scroll al fondo cuando se agregan nuevos logs
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current
      scrollArea.scrollTop = scrollArea.scrollHeight
    }
  }, [logs])

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-emerald-500" />
              RFID Readings
            </CardTitle>
            <CardDescription>Tags detected in real-time</CardDescription>
          </div>
          <Badge variant={isConnected ? "default" : "outline"} className={isConnected ? "bg-emerald-600" : ""}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <ScrollArea className="h-[400px] rounded-md border p-4 font-mono text-sm" ref={scrollAreaRef}>
            {logs.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-500">Waiting for readings...</div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2 rounded-md p-2 transition-colors ${
                      log.isNew ? "bg-emerald-50 dark:bg-emerald-950/20" : ""
                    }`}
                  >
                    <Tag className={`mt-0.5 h-4 w-4 ${log.isNew ? "text-emerald-600" : "text-gray-500"}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-600">{log.epc}</span>
                        {log.isNew && (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                          >
                            New
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{log.timestamp.toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        ) : (
          <div className="flex h-[400px] flex-col items-center justify-center gap-4 rounded-md border p-4 text-center text-gray-500">
            <AlertCircle className="h-12 w-12 text-gray-400" />
            <div>
              <p className="font-medium">RFID Reader disconnected</p>
              <p className="text-sm">Connect the reader to see tags in real-time</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
