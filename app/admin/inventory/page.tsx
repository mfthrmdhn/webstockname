'use client'

import React, { useState, useEffect, useCallback } from 'react'
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

interface Product {
  id: string
  name: string
  sku: string
  sellingPrice: number
  cost: number
  storeQty: number
  warehouseQty: number
}

export default function InventoryPage() {
  const { addToast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [replenishOpen, setReplenishOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [replenishQty, setReplenishQty] = useState('')
  const [replenishReason, setReplenishReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchInventory = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    try {
      setLoading(true)
      const res = await fetch('/api/admin/inventory', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch inventory')
      setProducts(await res.json())
    } catch {
      addToast('Failed to load inventory', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  const openReplenishDialog = (product: Product) => {
    setSelectedProduct(product)
    setReplenishQty('')
    setReplenishReason('')
    setReplenishOpen(true)
  }

  const handleReplenish = async () => {
    if (!selectedProduct) return
    const qty = parseInt(replenishQty, 10)
    if (isNaN(qty) || qty < 1) {
      addToast('Quantity must be at least 1', 'error')
      return
    }
    if (!replenishReason.trim()) {
      addToast('Reason is required', 'error')
      return
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        addToast('Not authenticated', 'error')
        return
      }

      const res = await fetch('/api/admin/inventory/replenish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity: qty,
          reason: replenishReason.trim(),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        addToast(err.error || 'Failed to replenish', 'error')
        return
      }

      const result = await res.json()
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id
            ? { ...p, storeQty: result.newStoreQty, warehouseQty: result.newWarehouseQty }
            : p
        )
      )
      setReplenishOpen(false)
      addToast('Stock replenished successfully', 'success')
    } catch {
      addToast('Error replenishing stock', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading inventory...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Selling Price</TableHead>
              <TableHead className="text-right">Store Stock</TableHead>
              <TableHead className="text-right">Warehouse Stock</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                  No products found
                </TableCell>
              </TableRow>
            )}
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-gray-500">{product.sku}</TableCell>
                <TableCell className="text-right">
                  Rp {Number(product.sellingPrice).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      product.storeQty === 0
                        ? 'text-red-500 font-semibold'
                        : product.storeQty < 5
                        ? 'text-yellow-600 font-semibold'
                        : ''
                    }
                  >
                    {product.storeQty}
                  </span>
                </TableCell>
                <TableCell className="text-right">{product.warehouseQty}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openReplenishDialog(product)}
                    disabled={product.warehouseQty === 0}
                  >
                    Add Stock
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={replenishOpen} onOpenChange={setReplenishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replenish Stock</DialogTitle>
            <DialogDescription>
              Move stock from warehouse to store floor for{' '}
              <strong>{selectedProduct?.name}</strong>.
              <br />
              Warehouse available: {selectedProduct?.warehouseQty ?? 0}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="replenish-qty">Quantity to Move *</Label>
              <Input
                id="replenish-qty"
                type="number"
                min={1}
                max={selectedProduct?.warehouseQty}
                value={replenishQty}
                onChange={(e) => setReplenishQty(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="replenish-reason">Reason *</Label>
              <Input
                id="replenish-reason"
                type="text"
                placeholder="e.g. Weekly restock, promotional stock"
                value={replenishReason}
                onChange={(e) => setReplenishReason(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplenishOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReplenish}
              disabled={submitting || !replenishQty || !replenishReason.trim()}
            >
              {submitting ? 'Replenishing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
