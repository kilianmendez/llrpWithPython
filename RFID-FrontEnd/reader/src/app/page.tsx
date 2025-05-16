"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { API_LOGIN, API_REGISTER } from "@/lib/config"
import axios from "axios"
import { useUser } from "@/contexts/userContext"

export default function AuthPage() {
  const [loginData, setLoginData] = useState({ email: "", password: "" })
  const [registerData, setRegisterData] = useState({ name: "", email: "", password: "", confirmPassword: "" })
  const [error, setError] = useState("")
  const router = useRouter()

  const { setUser } = useUser()

  const handleLogin = async () => {
    try {
      const formData = new URLSearchParams()
      formData.append("username", loginData.email)
      formData.append("password", loginData.password)
  
      const response = await axios.post(API_LOGIN, formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
  
      const token = response.data.access_token
      const isAdmin = response.data.is_admin // ✅ viene del backend

      localStorage.setItem("token", token)
      localStorage.setItem("email", loginData.email)
      localStorage.setItem("isAdmin", isAdmin ? "true" : "false") // ✅ guardar

      setUser({ email: loginData.email, token, isAdmin })
  
      router.push("/dashboard")
    } catch (err) {
      setError("Invalid credentials. Please try again.")
    }
  }
  


  const handleRegister = async () => {
    try {
      setError("")
  
      if (registerData.password !== registerData.confirmPassword) {
        setError("Passwords do not match.")
        return
      }
  
      const response = await axios.post(API_REGISTER, {
        name: registerData.name,
        email: registerData.email,
        password: registerData.password,
      })
  
      // Registro correcto: ahora iniciamos sesión automáticamente
      const formData = new URLSearchParams()
      formData.append("username", registerData.email)
      formData.append("password", registerData.password)
  
      const loginRes = await axios.post(API_LOGIN, formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
  
      const token = loginRes.data.access_token
      const isAdmin = loginRes.data.is_admin

      localStorage.setItem("token", token)
      localStorage.setItem("email", registerData.email)
      localStorage.setItem("isAdmin", isAdmin ? "true" : "false")

      setUser({ email: registerData.email, token, isAdmin })

      router.push("/dashboard")
  
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError("Error creating account. Try again.")
      }
    }
  }
  

  const enterAsGuest = () => {
    const guest = { email: "guest", token: "", isGuest: true }
    setUser(guest)
    localStorage.setItem("guest", "true")
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-900">
      {/* Left Info Section */}
      <div className="flex-1 p-10 flex items-center justify-center bg-green-50 dark:bg-green-900">
        <div className="max-w-md space-y-6 text-gray-800 dark:text-white">
          <h1 className="text-4xl font-bold text-green-700 dark:text-green-300">
            Welcome to the <span className="text-green-600 dark:text-green-400">RFID</span> Inventory Dashboard
          </h1>
          <p className="text-lg">
            This platform helps you manage products using RFID technology. Monitor inventory, register new items, and track real-time readings.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-base">
            <li>📦 Real-time product tracking</li>
            <li>📊 Visual dashboard with inventory overview</li>
            <li>➕ Add and manage items easily</li>
            <li>🧾 View RFID scan history and logs</li>
            <li>👤 Login or continue as guest to explore</li>
          </ul>
        </div>
      </div>

      {/* Right Auth Section */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-6">
          <h2 className="text-2xl font-bold text-center text-green-700 dark:text-green-300">Get Started</h2>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="w-full grid grid-cols-2 bg-green-100 dark:bg-green-800">
              <TabsTrigger value="login" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                Register
              </TabsTrigger>
            </TabsList>

            {/* Login */}
            <TabsContent value="login" className="space-y-4 pt-4">
              <Input
                placeholder="Email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              />
              <Input
                placeholder="Password"
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              />
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleLogin}>
                Login
              </Button>
              <Button variant="outline" className="w-full" onClick={enterAsGuest}>
                Continue as Guest
              </Button>
            </TabsContent>

            {/* Register */}
            <TabsContent value="register" className="space-y-4 pt-4">
              <Input
                placeholder="Name"
                value={registerData.name}
                onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
              />
              <Input
                placeholder="Email"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
              />
              <Input
                placeholder="Password"
                type="password"
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
              />
              <Input
                placeholder="Confirm Password"
                type="password"
                value={registerData.confirmPassword}
                onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
              />
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleRegister}>
                Register
              </Button>
              <Button variant="outline" className="w-full" onClick={enterAsGuest}>
                Continue as Guest
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
