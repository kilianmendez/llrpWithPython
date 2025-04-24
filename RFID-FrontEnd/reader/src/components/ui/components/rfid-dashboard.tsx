"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProductForm } from "@/components/ui/components/product-form"
import { ProductTable } from "@/components/ui/components/product-table"
import { RfidLog } from "@/components/ui/components/rfid-log"
import { Header } from "@/components/ui/components/header"

export function RfidDashboard() {
  const [isConnected, setIsConnected] = useState(false)

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-50 dark:bg-gray-900 overflow-x-hidden">
      <Header
        isConnected={isConnected}
        onToggleConnection={() => setIsConnected(!isConnected)}
      />

      <main className="flex-1 w-full overflow-y-auto px-4 md:px-6">
        <div className="mx-auto max-w-7xl w-full space-y-4">
          <Tabs defaultValue="dashboard" className="space-y-4">
            <TabsList>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="new-product">New Product</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="col-span-1 md:col-span-2 lg:col-span-2">
                  <ProductTable />
                </div>
                <div className="col-span-1 md:col-span-2 lg:col-span-1">
                  <RfidLog isConnected={isConnected} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="new-product" className="space-y-4">
              <ProductForm />
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4">
              <ProductTable />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
