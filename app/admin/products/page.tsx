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
  sellingPrice?: number
  cost?: number
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

const updateProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  sku: z.string().min(3, 'SKU must be at least 3 characters').max(50).optional(),
  category: z.string().max(100).optional().nullable(),
  sellingPrice: z.number().positive('Selling price must be positive').optional(),
  cost: z.number().min(0, 'Cost must be non-negative').optional(),
  storeQty: z.number().min(0, 'Store quantity must be non-negative').optional(),
  warehouseQty: z.number().min(0, 'Warehouse quantity must be non-negative').optional(),
})

type CreateProductForm = z.infer<typeof createProductSchema>

export default function ProductsPage() {
  const { addToast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Create dialog state
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

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    sku: '',
    sellingPrice: '',
    cost: '',
    storeQty: '',
    warehouseQty: '',
    category: '',
  })
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [editOriginalValues, setEditOriginalValues] = useState<Record<string, unknown>>({})

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [deleteError, setDeleteError] = useState<{ salesCount: number } | null>(null)
  const [deleteSoftDeletePending, setDeleteSoftDeletePending] = useState(false)

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

  // Open edit dialog with product values pre-filled
  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    const formValues = {
      name: product.name,
      sku: product.sku,
      sellingPrice: product.sellingPrice?.toString() || '',
      cost: product.cost?.toString() || '',
      storeQty: product.storeQty?.toString() || '',
      warehouseQty: product.warehouseQty?.toString() || '',
      category: product.category || '',
    }
    setEditForm(formValues)
    setEditOriginalValues({
      name: product.name,
      sku: product.sku,
      sellingPrice: product.sellingPrice?.toString() || '',
      cost: product.cost?.toString() || '',
      storeQty: product.storeQty?.toString() || '',
      warehouseQty: product.warehouseQty?.toString() || '',
      category: product.category || '',
    })
    setEditErrors({})
    setEditOpen(true)
  }

  // Handle update product
  const handleUpdateProduct = async () => {
    try {
      setEditErrors({})
      const validation = updateProductSchema.safeParse({
        name: editForm.name || undefined,
        sku: editForm.sku || undefined,
        sellingPrice: editForm.sellingPrice ? parseFloat(editForm.sellingPrice) : undefined,
        cost: editForm.cost ? parseFloat(editForm.cost) : undefined,
        storeQty: editForm.storeQty ? parseInt(editForm.storeQty) : undefined,
        warehouseQty: editForm.warehouseQty ? parseInt(editForm.warehouseQty) : undefined,
        category: editForm.category || undefined,
      })

      if (!validation.success) {
        const errors: Record<string, string> = {}
        validation.error.errors.forEach((err) => {
          errors[err.path[0] as string] = err.message
        })
        setEditErrors(errors)
        return
      }

      const token = localStorage.getItem('accessToken')
      if (!token || !editingProduct) {
        addToast('Not authenticated', 'error')
        return
      }

      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(validation.data),
      })

      if (!response.ok) {
        const error = await response.json()
        addToast(error.error || 'Failed to update product', 'error')
        return
      }

      const updatedProduct = await response.json()
      setProducts(products.map((p) => (p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p)))
      setEditOpen(false)
      setEditingProduct(null)
      setEditForm({ name: '', sku: '', sellingPrice: '', cost: '', storeQty: '', warehouseQty: '', category: '' })
      addToast('Product updated successfully', 'success')
    } catch (error) {
      console.error('Error updating product:', error)
      addToast('Error updating product', 'error')
    }
  }

  // Open delete confirmation dialog
  const openDeleteDialog = (product: Product) => {
    setDeletingProduct(product)
    setDeleteError(null)
    setDeleteDialogOpen(true)
  }

  // Handle hard-delete product
  const handleDeleteProduct = async () => {
    if (!deletingProduct) return

    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        addToast('Not authenticated', 'error')
        return
      }

      const response = await fetch(`/api/products/${deletingProduct.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.salesCount !== undefined) {
          // Product has sales — show soft-delete fallback
          setDeleteError({ salesCount: error.salesCount })
          return
        }
        addToast(error.error || 'Failed to delete product', 'error')
        setDeleteDialogOpen(false)
        return
      }

      // Hard delete succeeded
      setProducts(products.filter((p) => p.id !== deletingProduct.id))
      setDeleteDialogOpen(false)
      setDeletingProduct(null)
      addToast('Product deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting product:', error)
      addToast('Error deleting product', 'error')
    }
  }

  // Handle soft-delete (deactivate) product
  const handleSoftDeleteProduct = async () => {
    if (!deletingProduct) return

    try {
      setDeleteSoftDeletePending(true)
      const token = localStorage.getItem('accessToken')
      if (!token) {
        addToast('Not authenticated', 'error')
        return
      }

      const response = await fetch(`/api/products/${deletingProduct.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: false }),
      })

      if (!response.ok) {
        const error = await response.json()
        addToast(error.error || 'Failed to deactivate product', 'error')
        return
      }

      setProducts(products.filter((p) => p.id !== deletingProduct.id))
      setDeleteDialogOpen(false)
      setDeletingProduct(null)
      setDeleteError(null)
      addToast('Product deactivated successfully (can be reactivated later)', 'success')
    } catch (error) {
      console.error('Error deactivating product:', error)
      addToast('Error deactivating product', 'error')
    } finally {
      setDeleteSoftDeletePending(false)
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

      {/* Edit Product Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product details. Original values are shown below each field.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Product Name</Label>
                <p className="text-xs text-gray-500 mb-1">Current: {editOriginalValues.name as string}</p>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder={editOriginalValues.name as string}
                />
                {editErrors.name && <p className="text-red-600 text-sm mt-1">{editErrors.name}</p>}
              </div>
              <div>
                <Label htmlFor="edit-sku">SKU</Label>
                <p className="text-xs text-gray-500 mb-1">Current: {editOriginalValues.sku as string}</p>
                <Input
                  id="edit-sku"
                  value={editForm.sku}
                  onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                  placeholder={editOriginalValues.sku as string}
                />
                {editErrors.sku && <p className="text-red-600 text-sm mt-1">{editErrors.sku}</p>}
              </div>
              <div>
                <Label htmlFor="edit-selling-price">Selling Price</Label>
                <p className="text-xs text-gray-500 mb-1">Current: {editOriginalValues.sellingPrice as string}</p>
                <Input
                  id="edit-selling-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.sellingPrice}
                  onChange={(e) => setEditForm({ ...editForm, sellingPrice: e.target.value })}
                  placeholder={editOriginalValues.sellingPrice as string}
                />
                {editErrors.sellingPrice && <p className="text-red-600 text-sm mt-1">{editErrors.sellingPrice}</p>}
              </div>
              <div>
                <Label htmlFor="edit-cost">Cost</Label>
                <p className="text-xs text-gray-500 mb-1">Current: {editOriginalValues.cost as string}</p>
                <Input
                  id="edit-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.cost}
                  onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                  placeholder={editOriginalValues.cost as string}
                />
                {editErrors.cost && <p className="text-red-600 text-sm mt-1">{editErrors.cost}</p>}
              </div>
              <div>
                <Label htmlFor="edit-store-qty">Store Quantity</Label>
                <p className="text-xs text-gray-500 mb-1">Current: {editOriginalValues.storeQty as string}</p>
                <Input
                  id="edit-store-qty"
                  type="number"
                  min="0"
                  value={editForm.storeQty}
                  onChange={(e) => setEditForm({ ...editForm, storeQty: e.target.value })}
                  placeholder={editOriginalValues.storeQty as string}
                />
                {editErrors.storeQty && <p className="text-red-600 text-sm mt-1">{editErrors.storeQty}</p>}
              </div>
              <div>
                <Label htmlFor="edit-warehouse-qty">Warehouse Quantity</Label>
                <p className="text-xs text-gray-500 mb-1">Current: {editOriginalValues.warehouseQty as string}</p>
                <Input
                  id="edit-warehouse-qty"
                  type="number"
                  min="0"
                  value={editForm.warehouseQty}
                  onChange={(e) => setEditForm({ ...editForm, warehouseQty: e.target.value })}
                  placeholder={editOriginalValues.warehouseQty as string}
                />
                {editErrors.warehouseQty && <p className="text-red-600 text-sm mt-1">{editErrors.warehouseQty}</p>}
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-category">Category</Label>
                <p className="text-xs text-gray-500 mb-1">Current: {(editOriginalValues.category as string) || 'None'}</p>
                <Input
                  id="edit-category"
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  placeholder="e.g., Electronics"
                />
                {editErrors.category && <p className="text-red-600 text-sm mt-1">{editErrors.category}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProduct}>Update Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product?</DialogTitle>
          </DialogHeader>

          {deleteError ? (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded p-3">
                <p className="text-sm font-medium text-amber-900">
                  Cannot delete &quot;{deletingProduct?.name}&quot;
                </p>
                <p className="text-sm text-amber-800 mt-1">
                  This product has {deleteError.salesCount} sale(s) in history. Deletion is permanent but
                  won&apos;t affect past reports (they use sale-time prices).
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Alternative: Deactivate instead</p>
                <p className="text-sm text-gray-600">
                  Deactivated products won&apos;t appear in the POS, but their history is preserved.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm">
                Permanently delete <strong>{deletingProduct?.name}</strong>?
              </p>
              <p className="text-xs text-gray-500">
                This product has no sales history. Deletion is permanent.
              </p>
            </div>
          )}

          <DialogFooter>
            {deleteError ? (
              <>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleSoftDeleteProduct}
                  disabled={deleteSoftDeletePending}
                >
                  {deleteSoftDeletePending ? 'Deactivating...' : 'Deactivate Instead'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteProduct}>
                  Delete Permanently
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => openEditDialog(product)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openDeleteDialog(product)}
                    >
                      Delete
                    </Button>
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
