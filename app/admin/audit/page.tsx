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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/toast'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface AuditLog {
  id: string
  userId: string
  username: string
  action: string
  entityType: string
  entityId: string
  createdAt: string
  timestamp: number
  metadata?: Record<string, unknown> | null
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
}

const ACTIONS = [
  'LOGIN',
  'LOGOUT',
  'USER_CREATE',
  'USER_EDIT',
  'USER_DEACTIVATE',
  'PRODUCT_CREATE',
  'SALE_CREATE',           // Phase 2 backfill
  'INVENTORY_REPLENISH',   // Phase 2 backfill
  'INCENTIVE_CREATE',      // Phase 3
]

export default function AuditPage() {
  const { addToast } = useToast()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<{ id: string; username: string }[]>([])

  // Filter states
  const [action, setAction] = useState('')
  const [userId, setUserId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 1,
  })

  // Fetch users for filter
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setUsers(data)
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }

    fetchUsers()
  }, [])

  // Fetch audit logs
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    const fetchLogs = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        params.append('page', page.toString())
        params.append('limit', '50')

        if (action) params.append('action', action)
        if (userId) params.append('user_id', userId)
        if (startDate) params.append('start_date', startDate)
        if (endDate) params.append('end_date', endDate)

        const response = await fetch(`/api/audit?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch audit logs')
        }

        const data = await response.json()
        setLogs(data.data)
        setPagination(data.pagination)
      } catch (error) {
        console.error('Error fetching audit logs:', error)
        addToast('Failed to load audit logs', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [action, userId, startDate, endDate, page, addToast])

  const handleReset = () => {
    setAction('')
    setUserId('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Audit Log</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label htmlFor="action-filter">Action</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All actions</SelectItem>
                {ACTIONS.map((act) => (
                  <SelectItem key={act} value={act}>
                    {act}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="user-filter">User</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPage(1)
              }}
            />
          </div>

          <div>
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPage(1)
              }}
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Audit table */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading audit logs...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.username}</TableCell>
                      <TableCell>
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell>{log.entityType}</TableCell>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {log.entityId}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell
                        className="text-sm text-gray-500 font-mono max-w-xs truncate"
                        title={log.metadata ? JSON.stringify(log.metadata) : ''}
                      >
                        {log.metadata ? JSON.stringify(log.metadata).slice(0, 60) : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.pages} (
                  {pagination.total} total)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage(Math.min(pagination.pages, page + 1))
                    }
                    disabled={page === pagination.pages}
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
  )
}
