'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/toast'
import { Plus } from 'lucide-react'
import { z } from 'zod'

interface Product {
  id: string
  name: string
  sku: string
  category?: string
  storeQty?: number
  warehouseQty?: number
  createdAt: string
}

const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  sku: z.string().min(3, 'SKU must be at least 3 characters').max(50),
  category: z.string().max(100).optional(),
  sellingPrice: z.number().positive('Selling price must be positive'),
  cost: z.number().min(0, 'Cost must be non-negative'),
  storeQty: z.number().min(0, 'Store quantity must be non-negative').optional(),
  warehouseQty: z.number().min(0, 'Warehouse quantity must be non-negative').optional(),
})

type CreateProductForm = z.infer<typeof createProductSchema>

export default function ProductsPage() {
  const { addToast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newProductSellingPrice, setNewProductSellingPrice] = useState('')
  const [newProductCost, setNewProductCost] = useState('')
  const [newProductStoreQty, setNewProductStoreQty] = useState('')
  const [newProductWarehouseQty, setNewProductWarehouseQty] = useState('')
  const [createForm, setCreateForm] = useState<Omit<CreateProductForm, 'sellingPrice' | 'cost' | 'storeQty' | 'warehouseQty'>>({
    name: '',
    sku: '',
    category: '',
  })
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({})

  // Fetch products
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const fetchProducts = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/products', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch products')
        }

        const data = await response.json()
        setProducts(data)
      } catch (error) {
        console.error('Error fetching products:', error)
        addToast('Failed to load products', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [addToast])

  // Handle create product
  const handleCreateProduct = async () => {
    try {
      setCreateErrors({})
      const validation = createProductSchema.safeParse({
        ...createForm,
        sellingPrice: parseFloat(newProductSellingPrice),
        cost: parseFloat(newProductCost),
        storeQty: newProductStoreQty ? parseInt(newProductStoreQty) : 0,
        warehouseQty: newProductWarehouseQty ? parseInt(newProductWarehouseQty) : 0,
      })

      if (!validation.success) {
        const errors: Record<string, string> = {}
        validation.error.errors.forEach((err) => {
          errors[err.path[0] as string] = err.message
        })
        setCreateErrors(errors)
        return
      }

      const token = localStorage.getItem('accessToken')
      if (!token) {
        addToast('Not authenticated', 'error')
        return
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(validation.data),
      })

      if (!response.ok) {
        const error = await response.json()
        addToast(error.error || 'Failed to create product', 'error')
        return
      }

      const newProduct = await response.json()
      setProducts([...products, newProduct])
      setCreateForm({ name: '', sku: '', category: '' })
      setNewProductSellingPrice('')
      setNewProductCost('')
      setNewProductStoreQty('')
      setNewProductWarehouseQty('')
      setCreateOpen(false)
      addToast('Product created successfully', 'success')
    } catch (error) {
      console.error('Error creating product:', error)
      addToast('Error creating product', 'error')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Product Management</h1>
        <div className="text-gray-500">Loading products...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Product</DialogTitle>
              <DialogDescription>
                Add a new product to the catalog
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  placeholder="e.g., Laptop"
                />
                {createErrors.name && (
                  <p className="text-red-600 text-sm mt-1">
                    {createErrors.name}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
                <Input
                  id="sku"
                  value={createForm.sku}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, sku: e.target.value })
                  }
                  placeholder="e.g., LAPTOP-001"
                />
                {createErrors.sku && (
                  <p className="text-red-600 text-sm mt-1">
                    {createErrors.sku}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="category">Category (Optional)</Label>
                <Input
                  id="category"
                  value={createForm.category}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, category: e.target.value })
                  }
                  placeholder="e.g., Electronics"
                />
                {createErrors.category && (
                  <p className="text-red-600 text-sm mt-1">
                    {createErrors.category}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="selling-price">Selling Price *</Label>
                <Input
                  id="selling-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 150000"
                  value={newProductSellingPrice}
                  onChange={(e) => setNewProductSellingPrice(e.target.value)}
                  className="mt-1"
                />
                {createErrors.sellingPrice && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.sellingPrice}</p>
                )}
              </div>
              <div>
                <Label htmlFor="cost">Cost *</Label>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 80000"
                  value={newProductCost}
                  onChange={(e) => setNewProductCost(e.target.value)}
                  className="mt-1"
                />
                {createErrors.cost && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.cost}</p>
                )}
              </div>
              <div>
                <Label htmlFor="store-qty">Store Quantity</Label>
                <Input
                  id="store-qty"
                  type="number"
                  min="0"
                  placeholder="e.g. 5"
                  value={newProductStoreQty}
                  onChange={(e) => setNewProductStoreQty(e.target.value)}
                  className="mt-1"
                />
                {createErrors.storeQty && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.storeQty}</p>
                )}
              </div>
              <div>
                <Label htmlFor="warehouse-qty">Warehouse Quantity</Label>
                <Input
                  id="warehouse-qty"
                  type="number"
                  min="0"
                  placeholder="e.g. 10"
                  value={newProductWarehouseQty}
                  onChange={(e) => setNewProductWarehouseQty(e.target.value)}
                  className="mt-1"
                />
                {createErrors.warehouseQty && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.warehouseQty}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateProduct}>Create Product</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Store Qty</TableHead>
              <TableHead>Warehouse Qty</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {product.sku}
                    </code>
                  </TableCell>
                  <TableCell>{product.category || '-'}</TableCell>
                  <TableCell className="text-center">{product.storeQty || 0}</TableCell>
                  <TableCell className="text-center">{product.warehouseQty || 0}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(product.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
