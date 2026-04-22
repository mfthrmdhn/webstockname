'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/toast'
import { ShoppingCart, Search, Plus, Minus, X } from 'lucide-react'
import { getAccessToken } from '@/lib/auth/client'

interface Product {
  id: string
  name: string
  sku: string
  sellingPrice: number
  cost: number
  storeQty: number
  warehouseQty: number
}

interface CartItem {
  productId: string
  name: string
  sku: string
  quantity: number
  unitPrice: number
  storeQty: number
}

interface Staff {
  id: string
  username: string
}

interface SaleConfirmation {
  saleId: string
  total: number
  itemCount: number
  paymentMethod: string
  changeDue?: number
  salespersonName: string
  items: CartItem[]
}

type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER'

export default function PosPage() {
  const { addToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [salespersonId, setSalespersonId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [amountReceived, setAmountReceived] = useState('')
  const [confirmedSale, setConfirmedSale] = useState<SaleConfirmation | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)

  // Fetch CASHIER staff list on mount
  useEffect(() => {
    const fetchStaff = async () => {
      const token = getAccessToken()
      if (!token) return
      try {
        const res = await fetch('/api/cashier/staff', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) setStaff(await res.json())
      } catch {
        addToast('Failed to load staff list', 'error')
      }
    }
    fetchStaff()
  }, [addToast])

  // Debounced product search (300ms)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      const token = getAccessToken()
      if (!token) return
      try {
        const res = await fetch(
          `/api/cashier/products?search=${encodeURIComponent(searchQuery)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (res.ok) setSearchResults(await res.json())
      } catch {
        addToast('Search failed', 'error')
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, addToast])

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          quantity: 1,
          unitPrice: Number(product.sellingPrice),
          storeQty: product.storeQty,
        },
      ]
    })
  }

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }

  const total = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const parsedAmountReceived = parseFloat(amountReceived)
  const changeDue =
    paymentMethod === 'CASH' && !isNaN(parsedAmountReceived)
      ? parsedAmountReceived - total
      : null

  const canCheckout =
    cart.length > 0 &&
    salespersonId !== '' &&
    (paymentMethod !== 'CASH' ||
      (amountReceived !== '' && parsedAmountReceived >= total))

  const handleCheckout = async () => {
    if (!canCheckout) return
    setCheckingOut(true)
    try {
      const token = getAccessToken()
      if (!token) {
        addToast('Not authenticated', 'error')
        return
      }

      const body: Record<string, unknown> = {
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        salespersonId,
        paymentMethod,
      }
      if (paymentMethod === 'CASH') {
        body.amountReceived = parsedAmountReceived
      }

      const res = await fetch('/api/cashier/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        addToast(err.error || 'Checkout failed', 'error')
        return
      }

      const sale = await res.json()
      const salesperson = staff.find((s) => s.id === salespersonId)
      setConfirmedSale({
        ...sale,
        salespersonName: salesperson?.username ?? salespersonId,
        items: [...cart],
      })
      setCart([])
      setSearchQuery('')
      setSearchResults([])
      setSalespersonId('')
      setAmountReceived('')
    } catch {
      addToast('Error processing checkout', 'error')
    } finally {
      setCheckingOut(false)
    }
  }

  const startNewSale = () => {
    setConfirmedSale(null)
  }

  // Confirmation screen
  if (confirmedSale) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full">
          <div className="text-center mb-6">
            <div className="text-green-500 text-5xl mb-2">✓</div>
            <h2 className="text-2xl font-bold">Sale Complete</h2>
            <p className="text-gray-500 text-sm">Sale ID: {confirmedSale.saleId}</p>
          </div>
          <div className="border-t border-b py-4 mb-4 space-y-2">
            {confirmedSale.items.map((item) => (
              <div key={item.productId} className="flex justify-between text-sm">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span>Rp {(item.unitPrice * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1 text-sm mb-4">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>Rp {confirmedSale.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Payment</span>
              <span>{confirmedSale.paymentMethod}</span>
            </div>
            {confirmedSale.changeDue !== undefined && (
              <div className="flex justify-between text-gray-600">
                <span>Change Due</span>
                <span>Rp {confirmedSale.changeDue.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Salesperson</span>
              <span>{confirmedSale.salespersonName}</span>
            </div>
          </div>
          <Button className="w-full" onClick={startNewSale}>
            New Sale
          </Button>
        </div>
      </div>
    )
  }

  // Main POS layout — two panels
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            <h1 className="text-xl font-bold">Point of Sale</h1>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left panel: Product search */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Search className="h-4 w-4" />
              Product Search
            </h2>
            <Input
              placeholder="Search by name or scan SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-3"
            />
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {searchResults.length === 0 && searchQuery && (
                <p className="text-gray-400 text-sm text-center py-4">
                  No products found
                </p>
              )}
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="w-full text-left p-2 hover:bg-gray-50 rounded border border-gray-100 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        Rp {Number(product.sellingPrice).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        Store: {product.storeQty} | WH: {product.warehouseQty}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right panel: Cart + checkout */}
          <div className="bg-white rounded-lg shadow p-4 flex flex-col">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Cart ({cart.length} items)
            </h2>

            <div className="flex-1 space-y-2 mb-4 max-h-64 overflow-y-auto">
              {cart.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-8">
                  Cart is empty
                </p>
              )}
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center gap-2 border rounded p-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      Rp {item.unitPrice.toLocaleString()} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.productId, -1)}
                      className="h-6 w-6 rounded border flex items-center justify-center hover:bg-gray-100"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, 1)}
                      disabled={item.quantity >= item.storeQty}
                      className="h-6 w-6 rounded border flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-sm font-semibold w-20 text-right">
                    Rp {(item.unitPrice * item.quantity).toLocaleString()}
                  </p>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t pt-2 mb-4">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>Rp {total.toLocaleString()}</span>
              </div>
            </div>

            <div className="mb-3">
              <Label htmlFor="salesperson">Salesperson *</Label>
              <Select value={salespersonId} onValueChange={setSalespersonId}>
                <SelectTrigger id="salesperson" className="mt-1">
                  <SelectValue placeholder="Select salesperson..." />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mb-3">
              <Label htmlFor="payment">Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger id="payment" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === 'CASH' && (
              <div className="mb-3">
                <Label htmlFor="amount">Amount Received</Label>
                <Input
                  id="amount"
                  type="number"
                  min={total}
                  placeholder={`Min: ${total.toLocaleString()}`}
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="mt-1"
                />
                {changeDue !== null && changeDue >= 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    Change due: Rp {changeDue.toLocaleString()}
                  </p>
                )}
                {changeDue !== null && changeDue < 0 && (
                  <p className="text-sm text-red-500 mt-1">Insufficient amount</p>
                )}
              </div>
            )}

            <Button
              className="w-full"
              disabled={!canCheckout || checkingOut}
              onClick={handleCheckout}
            >
              {checkingOut ? 'Processing...' : 'Complete Sale'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
