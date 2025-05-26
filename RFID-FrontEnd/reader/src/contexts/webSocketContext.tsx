"use client"

import React, { createContext, useContext, useEffect, useRef, useState } from "react"
import { API_CONNECT_WEB_SOCKET } from "@/app/config/config"

interface RfidTag {
  epc: string
  antenna: number
  rssi: number
  timestamp: string
  count: number
}

interface WebSocketContextType {
  messages: RfidTag[]
  connected: boolean
  sendMessage: (msg: string) => void
  disconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [messages, setMessages] = useState<RfidTag[]>([])
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const socket = new WebSocket(API_CONNECT_WEB_SOCKET)

    socketRef.current = socket

    socket.onopen = () => {
      console.log("✅ WebSocket connected")
      setConnected(true)
    }

    socket.onmessage = (event) => {
      console.log("📨 MENSAJE DEL BACK:", event.data);
      try {
        const data = JSON.parse(event.data)
        setMessages((prev) => [...prev.slice(-99), data])
      } catch (err) {
        console.error("❌ Error processing message:", err)
      }
    }

    socket.onclose = () => {
      console.log("🔌 WebSocket disconnected")
      setConnected(false)
    }

    return () => {
      socket.close()
    }
  }, [])

  const sendMessage = (msg: string) => {
    socketRef.current?.send(msg)
  }

  const disconnect = () => {
    socketRef.current?.close()
  }

  return (
    <WebSocketContext.Provider value={{ messages, connected, sendMessage, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider")
  }
  return context
}
