"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search, Trash2, Edit, Tag } from "lucide-react"
import { API_BASE_URL, API_GET_PRODUCTS, API_DELETE_PRODUCT } from "@/app/config/config"
import axios from "axios"

interface Product {
  id: string
  name: string
  description: string
  stock: number
  epc: string
  image_url: string
}

export function ProductTable() {
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [showToast, setShowToast] = useState(false)

  const [productToEdit, setProductToEdit] = useState<Product | null>(null)
  const [editedProduct, setEditedProduct] = useState<FormData | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.epc.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product)
  }

  const handleUpdateProduct = async () => {
    if (!productToEdit) return
  
    try {
      const formData = new FormData()
      formData.append("name", productToEdit.name)
      formData.append("epc", productToEdit.epc)
      formData.append("description", productToEdit.description)
      formData.append("stock", String(productToEdit.stock))
      if (editedProduct) {
        const file = editedProduct.get("image") as File
        if (file) formData.append("image", file)
      }
  
      const response = await axios.put(
        `${API_BASE_URL}/products/update/${productToEdit.id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
  
      console.log("Updated:", response.data)
      setProductToEdit(null)
      getProducts()
    } catch (error) {
      console.error("Error updating product:", error)
    }
  }
  
  
  const confirmDelete = async (productId: string) => {
    try {
      await axios.delete(API_DELETE_PRODUCT(Number(productId)))
      setProducts(products.filter((p) => p.id !== productId))
      setShowToast(true)
    } catch (error) {
      console.error("Error al eliminar producto:", error)
    } finally {
      setProductToDelete(null)
    }
  }

  const getProducts = async () => {
    try {
      const response = await axios.get(API_GET_PRODUCTS)
      setProducts(response.data)
      console.log(response.data)
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  useEffect(() => {
    getProducts()
  }, [])

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [showToast])

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Product Inventory</CardTitle>
            <CardDescription>List of products registered in the system</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by name or EPC..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="hidden lg:table-cell">EPC</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <img
                        src={`${API_BASE_URL}/${product.image_url}` || "/placeholder.svg"}
                        alt={product.name}
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="hidden max-w-xs truncate md:table-cell">{product.description}</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell className="hidden font-mono text-xs lg:table-cell">
                      <div className="flex items-center gap-1">
                        <Tag className="h-3 w-3 text-emerald-500" />
                        {product.epc}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setProductToEdit(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(product)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    {productToDelete && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
          <h2 className="text-lg font-semibold mb-4">
            Delete "{productToDelete.name}"?
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to delete this product? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setProductToDelete(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => confirmDelete(productToDelete.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    )}
    {showToast && (
      <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded shadow-lg">
        Product deleted successfully
      </div>
    )}
    

    {productToEdit && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
      <div className="max-h-[85vh] overflow-y-auto p-6">
        <h2 className="text-lg font-semibold mb-4">
          Edit Product: "{productToEdit.name}"
        </h2>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Product Name</label>
            <Input
              value={productToEdit.name}
              onChange={(e) =>
                setProductToEdit({ ...productToEdit, name: e.target.value })
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">EPC</label>
            <Input
              value={productToEdit.epc}
              onChange={(e) =>
                setProductToEdit({ ...productToEdit, epc: e.target.value })
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={productToEdit.description}
              onChange={(e) =>
                setProductToEdit({ ...productToEdit, description: e.target.value })
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Stock</label>
            <Input
              type="number"
              value={productToEdit.stock}
              onChange={(e) =>
                setProductToEdit({
                  ...productToEdit,
                  stock: Number(e.target.value),
                })
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Image</label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  const preview = URL.createObjectURL(file)
                  setImagePreview(preview)
                  const form = new FormData()
                  form.append("image", file)
                  setEditedProduct(form)
                }
              }}
            />
            {imagePreview || productToEdit.image_url ? (
              <img
                src={imagePreview || `${API_BASE_URL}/${productToEdit.image_url}`}
                alt="Preview"
                className="mt-2 h-32 object-cover rounded"
              />
            ) : null}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setProductToEdit(null)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={handleUpdateProduct}
          >
            Update
          </Button>
        </div>
      </div>
    </div>
  </div>
)}



    </>
  )
}
