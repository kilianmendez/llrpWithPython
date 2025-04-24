"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Upload, Tag, Save } from "lucide-react"
import axios from "axios"
import { API_POST_PRODUCT } from "@/app/config/config"

export function ProductForm() {
  const [image, setImage] = useState<string | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const createProduct = async (formData) => {
    try {
      const response = await axios.post(API_POST_PRODUCT, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log("Producto creado:", response.data);
    } catch (error) {
      console.error("Error al crear producto:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const formData = new FormData();
    formData.append("epc", epc);
    formData.append("name", name);
    formData.append("description", description);
    formData.append("stock", stock);
    formData.append("image", imageFile); // imageFile debe ser del input type="file"
  
    await createProduct(formData);
  };
  

  return (
    <Card className="w-full max-w-4xl mx-auto overflow-hidden">
      <CardHeader>
        <CardTitle className="text-2xl">Register New Product</CardTitle>
        <CardDescription>
          Complete the form to add a new product to inventory
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input id="name" placeholder="Enter product name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="epc">EPC (Electronic Product Code)</Label>
              <div className="flex">
                <Input id="epc" placeholder="EPC Code" />
                <Button variant="outline" className="ml-2" size="icon">
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Detailed product description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                placeholder="Available quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Product Image</Label>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-md border border-dashed border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600">
                  {image ? (
                    <img
                      src={image || "/placeholder.svg"}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-sm text-gray-500">
                      <Upload className="mb-1 h-6 w-6" />
                      <span>Upload image</span>
                    </div>
                  )}
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={handleImageChange}
                  />
                </div>
                <div className="mt-2 text-sm text-gray-500 sm:mt-0">
                  <p>Formats: JPG, PNG, GIF</p>
                  <p>Maximum size: 2MB</p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          size="lg"
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          onClick={handleSubmit}
        >
          <Save className="h-5 w-5" />
          Save Product
        </Button>
      </CardFooter>
    </Card>
  )
}
