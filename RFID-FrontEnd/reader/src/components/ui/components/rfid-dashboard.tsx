"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Header } from "@/components/ui/components/header"
import { ProductForm } from "@/components/ui/components/product-form"
import { ProductTable } from "@/components/ui/components/product-table"
import { RfidLog } from "@/components/ui/components/rfid-log"
import { RecentReadings } from "@/components/ui/components/recent-readings"
import { useUser } from "@/contexts/userContext"

export function RfidDashboard() {
  const [isConnected, setIsConnected] = useState(false)
  const [refreshReadingsKey, setRefreshReadingsKey] = useState(0)
  const { user } = useUser()

  const refreshReadings = () => {
    setRefreshReadingsKey((prev) => prev + 1)
  }

  const isGuest = user?.isGuest

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <Header
        isConnected={isConnected}
        onToggleConnection={(simulated) => setIsConnected((prev) => !prev)}
        onRefreshReadings={refreshReadings}
      />

      <main className="flex-1 w-full overflow-y-auto px-4 md:px-6 py-4">
        <div className="mx-auto w-full max-w-7xl space-y-4">
          <Tabs defaultValue="inventory" className="py-4">
            <TabsList className="bg-gray-200">
              {!isGuest && <TabsTrigger value="dashboard">Dashboard</TabsTrigger>}
              {!isGuest && <TabsTrigger value="new-product">New Product</TabsTrigger>}
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="readings">Readings</TabsTrigger>
            </TabsList>

            {!isGuest && (
              <TabsContent value="dashboard" className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <ProductTable />
                  </div>
                  <div className="lg:col-span-1 flex flex-col gap-4">
                    <RfidLog isConnected={isConnected} />
                    <RecentReadings refreshTrigger={refreshReadingsKey} />
                  </div>
                </div>
              </TabsContent>
            )}

            {!isGuest && (
              <TabsContent value="new-product" className="space-y-4">
                <ProductForm />
              </TabsContent>
            )}

            <TabsContent value="inventory" className="space-y-4">
              <ProductTable />
            </TabsContent>

            <TabsContent value="readings" className="space-y-4">
              <RecentReadings refreshTrigger={refreshReadingsKey}/>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
