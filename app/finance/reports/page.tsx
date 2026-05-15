'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/components/toast'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type DatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month'

interface SaleRow {
  id: string
  createdAt: string
  products: string
  salesperson: string
  total: number
  paymentMethod: string
  marginPercent: number | null
}

interface StaffRow {
  staffId: string
  username: string
  salesCount: number
  totalRevenue: number
  totalProfit: number
  averageMargin: number | null
}

interface IncentiveRow {
  id: string
  salesperson: string
  amount: number
  date: string
  note: string
  createdBy: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
}

interface ReconData {
  cash: number
  card: number
  transfer: number
  grandTotal: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateRange(range: DatePreset): { start: string; end: string } {
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
  switch (range) {
    case 'today':
      return { start: startOfDay(now).toISOString(), end: endOfDay(now).toISOString() }
    case 'yesterday': {
      const d = new Date(now)
      d.setDate(now.getDate() - 1)
      return { start: startOfDay(d).toISOString(), end: endOfDay(d).toISOString() }
    }
    case 'this_week': {
      const mon = new Date(now)
      mon.setDate(now.getDate() - now.getDay() + 1)
      return { start: startOfDay(mon).toISOString(), end: endOfDay(now).toISOString() }
    }
    case 'this_month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: startOfDay(first).toISOString(), end: endOfDay(now).toISOString() }
    }
  }
}

function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

function marginClass(m: number | null): string {
  if (m === null) return 'text-gray-400'
  if (m >= 30) return 'text-sm font-semibold text-green-700'
  if (m >= 10) return 'text-sm font-semibold text-gray-900'
  return 'text-sm font-semibold text-red-600'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FinanceReportsPage() {
  const { addToast } = useToast()

  // Date range (global — persists across tab switches)
  const [preset, setPreset] = useState<DatePreset>('today')
  const [dateRange, setDateRange] = useState(getDateRange('today'))

  // Sales tab
  const [sales, setSales] = useState<SaleRow[]>([])
  const [salesLoading, setSalesLoading] = useState(false)
  const [salesPage, setSalesPage] = useState(1)
  const [salesPagination, setSalesPagination] = useState<PaginationInfo>({ page: 1, limit: 50, total: 0, pages: 0 })

  // By Staff tab
  const [staffStats, setStaffStats] = useState<StaffRow[]>([])
  const [staffLoading, setStaffLoading] = useState(false)

  // Incentives tab
  const [incentives, setIncentives] = useState<IncentiveRow[]>([])
  const [incentivesLoading, setIncentivesLoading] = useState(false)
  const [incentivesPage, setIncentivesPage] = useState(1)
  const [incentivesPagination, setIncentivesPagination] = useState<PaginationInfo>({ page: 1, limit: 25, total: 0, pages: 0 })
  const [incentiveModalOpen, setIncentiveModalOpen] = useState(false)
  const [incentiveRefreshKey, setIncentiveRefreshKey] = useState(0)

  // Add Incentive modal form
  const [modalError, setModalError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cashiers, setCashiers] = useState<{ id: string; username: string }[]>([])
  const [form, setForm] = useState({ salespersonId: '', amount: '', date: '', note: '' })

  // Reconciliation tab
  const [recon, setRecon] = useState<ReconData | null>(null)
  const [reconLoading, setReconLoading] = useState(false)
  const [physicalCash, setPhysicalCash] = useState<string>('')

  // Role
  const [isSuperadmin, setIsSuperadmin] = useState(false)

  // Decode role on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const role = JSON.parse(atob(token.split('.')[1])).role
        setIsSuperadmin(role === 'SUPERADMIN')
      } catch {
        // ignore
      }
    }
  }, [])

  // ─── Date range handler ────────────────────────────────────────────────────

  const handlePresetChange = (value: string) => {
    const p = value as DatePreset
    setPreset(p)
    setDateRange(getDateRange(p))
    setSalesPage(1)
    setIncentivesPage(1)
  }

  // ─── Fetch: Sales ──────────────────────────────────────────────────────────

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    const fetchSales = async () => {
      setSalesLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('start', dateRange.start)
        params.append('end', dateRange.end)
        params.append('page', salesPage.toString())
        params.append('limit', '50')
        const res = await fetch(`/api/reports/sales?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch sales')
        const data = await res.json()
        setSales(data.data ?? [])
        setSalesPagination(data.pagination ?? { page: 1, limit: 50, total: 0, pages: 0 })
      } catch {
        addToast('Failed to load sales data', 'error')
      } finally {
        setSalesLoading(false)
      }
    }
    fetchSales()
  }, [dateRange, salesPage, addToast])

  // ─── Fetch: Staff stats ────────────────────────────────────────────────────

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    const fetchStaff = async () => {
      setStaffLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('start', dateRange.start)
        params.append('end', dateRange.end)
        const res = await fetch(`/api/reports/staff?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch staff stats')
        const data = await res.json()
        setStaffStats(data.data ?? [])
      } catch {
        addToast('Failed to load staff data', 'error')
      } finally {
        setStaffLoading(false)
      }
    }
    fetchStaff()
  }, [dateRange, addToast])

  // ─── Fetch: Incentives ─────────────────────────────────────────────────────

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    const fetchIncentives = async () => {
      setIncentivesLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('start', dateRange.start)
        params.append('end', dateRange.end)
        params.append('page', incentivesPage.toString())
        params.append('limit', '25')
        const res = await fetch(`/api/incentives?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch incentives')
        const data = await res.json()
        setIncentives(data.data ?? [])
        setIncentivesPagination(data.pagination ?? { page: 1, limit: 25, total: 0, pages: 0 })
      } catch {
        addToast('Failed to load incentives', 'error')
      } finally {
        setIncentivesLoading(false)
      }
    }
    fetchIncentives()
  }, [dateRange, incentivesPage, incentiveRefreshKey, addToast])

  // ─── Fetch: Reconciliation ─────────────────────────────────────────────────

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    const fetchRecon = async () => {
      setReconLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('start', dateRange.start)
        params.append('end', dateRange.end)
        const res = await fetch(`/api/reports/reconciliation?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch reconciliation')
        const data = await res.json()
        setRecon(data)
      } catch {
        addToast('Failed to load reconciliation data', 'error')
      } finally {
        setReconLoading(false)
      }
    }
    fetchRecon()
  }, [dateRange, addToast])

  // ─── Fetch: Cashiers (for modal) ───────────────────────────────────────────

  const fetchCashiers = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    try {
      const res = await fetch('/api/users?role=CASHIER', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setCashiers(Array.isArray(data) ? data : (data.data ?? []))
      }
    } catch {
      // silently fail — modal will show empty list
    }
  }, [])

  // ─── Add Incentive submit ──────────────────────────────────────────────────

  const handleIncentiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError('')
    setSubmitting(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/incentives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          salespersonId: form.salespersonId,
          amount: parseFloat(form.amount),
          date: form.date,
          note: form.note,
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        setModalError(err.error || 'Failed to save incentive. Please check all fields and try again.')
        return
      }
      setIncentiveModalOpen(false)
      setForm({ salespersonId: '', amount: '', date: '', note: '' })
      setIncentiveRefreshKey(k => k + 1)
      addToast('Incentive saved', 'success')
    } catch {
      setModalError('Failed to save incentive. Please check all fields and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Reconciliation variance ───────────────────────────────────────────────

  const variance = (parseFloat(physicalCash) || 0) - (recon?.cash ?? 0)
  const varianceClass =
    variance > 0
      ? 'text-green-600 font-semibold'
      : variance < 0
      ? 'text-red-600 font-semibold'
      : 'text-gray-600 font-semibold'
  const varianceLabel =
    variance > 0 ? '(surplus)' : variance < 0 ? '(shortage)' : '(balanced)'

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      {/* Header with date preset selector */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold text-gray-900">Reports</h1>
        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="by-staff">By Staff</TabsTrigger>
          <TabsTrigger value="incentives">Incentives</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>

        {/* ── Sales Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="sales">
          <div className="bg-white rounded-lg border border-gray-200 mt-4">
            {salesLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Product(s)</TableHead>
                      <TableHead>Salesperson</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Margin%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No sales found for this period
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {sales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="text-sm text-gray-500">
                              {new Date(sale.createdAt).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                              })}
                            </TableCell>
                            <TableCell className="text-sm">{sale.products}</TableCell>
                            <TableCell className="text-sm font-semibold">{sale.salesperson}</TableCell>
                            <TableCell className="text-sm font-semibold">{formatCurrency(sale.total)}</TableCell>
                            <TableCell className="text-sm">{sale.paymentMethod}</TableCell>
                            <TableCell className={marginClass(sale.marginPercent)}>
                              {sale.marginPercent !== null ? `${sale.marginPercent}%` : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                        {sales.length > 0 && (
                          <TableRow className="bg-gray-50 border-t-2 border-gray-300">
                            <TableCell className="font-semibold" colSpan={3}>Total</TableCell>
                            <TableCell className="text-sm font-semibold text-gray-900">
                              {formatCurrency(sales.reduce((s, r) => s + r.total, 0))}
                            </TableCell>
                            <TableCell />
                            <TableCell className="text-sm font-semibold text-gray-900">
                              {(() => {
                                const margins = sales
                                  .filter(r => r.marginPercent !== null)
                                  .map(r => r.marginPercent as number)
                                return margins.length > 0
                                  ? `${(margins.reduce((a, b) => a + b, 0) / margins.length).toFixed(1)}%`
                                  : '—'
                              })()}
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    )}
                  </TableBody>
                </Table>
                {salesPagination.pages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      Page {salesPagination.page} of {salesPagination.pages} ({salesPagination.total} total)
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSalesPage(Math.max(1, salesPage - 1))}
                        disabled={salesPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSalesPage(Math.min(salesPagination.pages, salesPage + 1))}
                        disabled={salesPage === salesPagination.pages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* ── By Staff Tab ───────────────────────────────────────────────── */}
        <TabsContent value="by-staff">
          <div className="bg-white rounded-lg border border-gray-200 mt-4">
            {staffLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salesperson</TableHead>
                    <TableHead>Sales Count</TableHead>
                    <TableHead>Total Revenue</TableHead>
                    <TableHead>Total Profit</TableHead>
                    <TableHead>Avg Margin%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No staff data found for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffStats.map((row) => (
                      <TableRow key={row.staffId}>
                        <TableCell className="font-semibold">{row.username}</TableCell>
                        <TableCell>{row.salesCount}</TableCell>
                        <TableCell>{formatCurrency(row.totalRevenue)}</TableCell>
                        <TableCell>{formatCurrency(row.totalProfit)}</TableCell>
                        <TableCell className={marginClass(row.averageMargin)}>
                          {row.averageMargin !== null ? `${row.averageMargin.toFixed(1)}%` : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── Incentives Tab ─────────────────────────────────────────────── */}
        <TabsContent value="incentives">
          <div className="mt-4">
            {isSuperadmin && (
              <div className="flex justify-end mb-4">
                <Button
                  onClick={() => {
                    setIncentiveModalOpen(true)
                    fetchCashiers()
                  }}
                >
                  Add Incentive
                </Button>
              </div>
            )}
            <div className="bg-white rounded-lg border border-gray-200">
              {incentivesLoading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Salesperson</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>Added By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incentives.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            No incentives found for this period
                          </TableCell>
                        </TableRow>
                      ) : (
                        incentives.map((inc) => (
                          <TableRow key={inc.id}>
                            <TableCell className="text-sm text-gray-500">
                              {new Date(inc.date).toLocaleDateString('id-ID')}
                            </TableCell>
                            <TableCell className="font-semibold">{inc.salesperson}</TableCell>
                            <TableCell>{formatCurrency(inc.amount)}</TableCell>
                            <TableCell className="text-sm">{inc.note}</TableCell>
                            <TableCell className="text-sm text-gray-500">{inc.createdBy}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {incentivesPagination.pages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                      <div className="text-sm text-gray-500">
                        Page {incentivesPagination.page} of {incentivesPagination.pages} ({incentivesPagination.total} total)
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIncentivesPage(Math.max(1, incentivesPage - 1))}
                          disabled={incentivesPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIncentivesPage(Math.min(incentivesPagination.pages, incentivesPage + 1))}
                          disabled={incentivesPage === incentivesPagination.pages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Reconciliation Tab ─────────────────────────────────────────── */}
        <TabsContent value="reconciliation">
          <div className="mt-4 space-y-6">
            {reconLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : (
              <>
                {/* System totals */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">System Totals</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Cash</p>
                      <p className="text-xl font-semibold text-gray-900">{formatCurrency(recon?.cash ?? 0)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Card</p>
                      <p className="text-xl font-semibold text-gray-900">{formatCurrency(recon?.card ?? 0)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Transfer</p>
                      <p className="text-xl font-semibold text-gray-900">{formatCurrency(recon?.transfer ?? 0)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-600">Grand Total</p>
                      <p className="text-xl font-semibold text-blue-900">{formatCurrency(recon?.grandTotal ?? 0)}</p>
                    </div>
                  </div>
                </div>

                {/* Cash reconciliation */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Cash Reconciliation</h2>
                  <div className="space-y-4 max-w-sm">
                    <div>
                      <Label htmlFor="physical-cash">Physical Cash Count (Rp)</Label>
                      <Input
                        id="physical-cash"
                        type="number"
                        value={physicalCash}
                        onChange={(e) => setPhysicalCash(e.target.value)}
                        placeholder="Enter counted cash amount"
                        className="mt-1"
                      />
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">System Cash:</span>
                        <span className="font-semibold">{formatCurrency(recon?.cash ?? 0)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-gray-500">Physical Cash:</span>
                        <span className="font-semibold">{formatCurrency(parseFloat(physicalCash) || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                        <span className="font-semibold text-gray-700">Variance:</span>
                        <span className={varianceClass}>
                          {formatCurrency(Math.abs(variance))} {varianceLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Add Incentive Modal ────────────────────────────────────────────── */}
      <Dialog
        open={incentiveModalOpen}
        onOpenChange={(open) => {
          // Only allow closing if form is empty
          const formIsEmpty = !form.salespersonId && !form.amount && !form.date && !form.note
          if (!open && !formIsEmpty) return
          setIncentiveModalOpen(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Incentive</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 -mt-2 mb-2">
            Incentive records are immutable once saved. Please verify all details before submitting.
          </p>
          <form onSubmit={handleIncentiveSubmit} className="space-y-4">
            <div>
              <Label htmlFor="salesperson-select">Salesperson</Label>
              <Select
                value={form.salespersonId}
                onValueChange={(v) => setForm(f => ({ ...f, salespersonId: v }))}
              >
                <SelectTrigger id="salesperson-select" className="mt-1">
                  <SelectValue placeholder="Select salesperson" />
                </SelectTrigger>
                <SelectContent>
                  {cashiers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="incentive-amount">Amount (Rp)</Label>
              <Input
                id="incentive-amount"
                type="number"
                min="0"
                step="1"
                value={form.amount}
                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="Enter amount"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="incentive-date">Date</Label>
              <Input
                id="incentive-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="incentive-note">Note</Label>
              <Textarea
                id="incentive-note"
                value={form.note}
                onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Reason or reference for this incentive"
                className="mt-1"
              />
            </div>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {modalError}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIncentiveModalOpen(false)
                  setForm({ salespersonId: '', amount: '', date: '', note: '' })
                  setModalError('')
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !form.salespersonId || !form.amount || !form.date}>
                {submitting ? 'Saving...' : 'Save Incentive'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
