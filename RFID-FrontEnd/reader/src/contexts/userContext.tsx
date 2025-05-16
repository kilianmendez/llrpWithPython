"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface User {
    email: string
    token: string
    isGuest?: boolean
    isAdmin?: boolean 
}

interface UserContextType {
  user: User | null
  setUser: (user: User | null) => void
  logout: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    const storedEmail = localStorage.getItem("email")
    const isGuest = localStorage.getItem("guest") === "true"
    const isAdmin = localStorage.getItem("isAdmin") === "true"  // ✅ recuperar rol
  
    if (isGuest) {
      setUser({ email: "guest", token: "", isGuest: true })
    } else if (storedToken && storedEmail) {
      setUser({ email: storedEmail, token: storedToken, isAdmin })
    }
  }, [])

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("email")
    localStorage.removeItem("guest")
    localStorage.removeItem("isAdmin")  // ✅ limpiar rol
    setUser(null)
  }

  return (
    <UserContext.Provider value={{ user, setUser, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
