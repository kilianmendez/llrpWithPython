"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tag, AlertCircle } from "lucide-react"
import { useWebSocket } from "@/contexts/webSocketContext"

interface RfidLogProps {
  isConnected: boolean
}

export function RfidLog({ isConnected }: RfidLogProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { messages } = useWebSocket()

  const [logs, setLogs] = useState<
    { id: string; epc: string; name?: string; timestamp: Date; isNew: boolean }[]
  >([])

  useEffect(() => {
    if (!isConnected || messages.length === 0) return

    const lastMessage = messages[messages.length - 1]

    const newLog = {
      id: crypto.randomUUID(),
      epc: lastMessage.epc,
      name: lastMessage.name, // ✅ puede ser undefined
      timestamp: new Date(lastMessage.timestamp),
      isNew: true,
    }

    setLogs((prev) => {
      const updated = [newLog, ...prev].slice(0, 100)
      setTimeout(() => {
        setLogs((current) =>
          current.map((log) =>
            log.id === newLog.id ? { ...log, isNew: false } : log
          )
        )
      }, 2000)
      return updated
    })
  }, [messages, isConnected])

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
          <Badge
            variant={isConnected ? "default" : "outline"}
            className={isConnected ? "bg-emerald-600" : ""}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <ScrollArea
            className="h-[400px] rounded-md border p-4 font-mono text-sm"
            ref={scrollAreaRef}
          >
            {logs.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-500">
                Waiting for readings...
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2 rounded-md p-2 transition-colors ${
                      log.isNew ? "bg-emerald-50 dark:bg-emerald-950/20" : ""
                    }`}
                  >
                    <Tag
                      className={`mt-0.5 h-4 w-4 ${
                        log.isNew ? "text-emerald-600" : "text-gray-500"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-600">
                          {log.name ?? log.epc} {/* ✅ Muestra nombre si existe */}
                        </span>
                        {log.isNew && (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                          >
                            New
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {log.timestamp.toLocaleTimeString()}
                      </div>
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
              <p className="text-sm">
                Connect the reader to see tags in real-time
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
