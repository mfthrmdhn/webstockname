'use client'

import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/toast'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { z } from 'zod'

interface User {
  id: string
  username: string
  role: { name: string }
  isActive: boolean
  createdAt: string
}

const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .refine(
      (pwd) => /[A-Z]/.test(pwd),
      'Password must contain at least 1 uppercase letter'
    )
    .refine(
      (pwd) => /[0-9]/.test(pwd),
      'Password must contain at least 1 number'
    ),
  role: z.string().min(1, 'Role is required'),
})

const editUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  role: z.string().min(1, 'Role is required'),
})

type CreateUserForm = z.infer<typeof createUserSchema>
type EditUserForm = z.infer<typeof editUserSchema>

export default function UsersPage() {
  const { addToast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [roles] = useState<string[]>(['SUPERADMIN', 'FINANCE', 'CASHIER'])

  // Form states
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    username: '',
    password: '',
    role: '',
  })
  const [editForm, setEditForm] = useState<EditUserForm>({
    username: '',
    role: '',
  })
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({})
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  // Fetch users
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const fetchUsers = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/users', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch users')
        }

        const data = await response.json()
        setUsers(data)
      } catch (error) {
        console.error('Error fetching users:', error)
        addToast('Failed to load users', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [addToast])

  // Handle create user
  const handleCreateUser = async () => {
    try {
      setCreateErrors({})
      const validation = createUserSchema.safeParse(createForm)

      if (!validation.success) {
        const errors: Record<string, string> = {}
        validation.error.issues.forEach((err) => {
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

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(validation.data),
      })

      if (!response.ok) {
        const error = await response.json()
        addToast(error.error || 'Failed to create user', 'error')
        return
      }

      const newUser = await response.json()
      setUsers([...users, { ...newUser, isActive: true }])
      setCreateForm({ username: '', password: '', role: '' })
      setCreateOpen(false)
      addToast('User created successfully', 'success')
    } catch (error) {
      console.error('Error creating user:', error)
      addToast('Error creating user', 'error')
    }
  }

  // Handle edit user
  const handleEditUser = async () => {
    if (!selectedUser) return

    try {
      setEditErrors({})
      const validation = editUserSchema.safeParse(editForm)

      if (!validation.success) {
        const errors: Record<string, string> = {}
        validation.error.issues.forEach((err) => {
          errors[err.path[0] as string] = err.message
        })
        setEditErrors(errors)
        return
      }

      const token = localStorage.getItem('accessToken')
      if (!token) {
        addToast('Not authenticated', 'error')
        return
      }

      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(validation.data),
      })

      if (!response.ok) {
        const error = await response.json()
        addToast(error.error || 'Failed to update user', 'error')
        return
      }

      const updatedUser = await response.json()
      setUsers(
        users.map((u) =>
          u.id === selectedUser.id ? { ...u, ...updatedUser } : u
        )
      )
      setEditOpen(false)
      setSelectedUser(null)
      addToast('User updated successfully', 'success')
    } catch (error) {
      console.error('Error updating user:', error)
      addToast('Error updating user', 'error')
    }
  }

  // Handle deactivate user
  const handleDeactivateUser = async () => {
    if (!selectedUser) return

    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        addToast('Not authenticated', 'error')
        return
      }

      const response = await fetch(`/api/users/${selectedUser.id}/deactivate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        addToast(error.error || 'Failed to deactivate user', 'error')
        return
      }

      setUsers(
        users.map((u) =>
          u.id === selectedUser.id ? { ...u, isActive: false } : u
        )
      )
      setDeactivateOpen(false)
      setSelectedUser(null)
      addToast('User deactivated successfully', 'success')
    } catch (error) {
      console.error('Error deactivating user:', error)
      addToast('Error deactivating user', 'error')
    }
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setEditForm({ username: user.username, role: user.role.name })
    setEditOpen(true)
  }

  const openDeactivateDialog = (user: User) => {
    setSelectedUser(user)
    setDeactivateOpen(true)
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">User Management</h1>
        <div className="text-gray-500">Loading users...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new staff member to the system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={createForm.username}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, username: e.target.value })
                  }
                  placeholder="john_doe"
                />
                {createErrors.username && (
                  <p className="text-red-600 text-sm mt-1">
                    {createErrors.username}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, password: e.target.value })
                  }
                  placeholder="Min 12 chars, 1 uppercase, 1 number"
                />
                {createErrors.password && (
                  <p className="text-red-600 text-sm mt-1">
                    {createErrors.password}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value) =>
                    setCreateForm({ ...createForm, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {createErrors.role && (
                  <p className="text-red-600 text-sm mt-1">
                    {createErrors.role}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser}>Create User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                      {user.role.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded ${
                        user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(user)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {user.isActive && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDeactivateDialog(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={editForm.username}
                onChange={(e) =>
                  setEditForm({ ...editForm, username: e.target.value })
                }
              />
              {editErrors.username && (
                <p className="text-red-600 text-sm mt-1">
                  {editErrors.username}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editErrors.role && (
                <p className="text-red-600 text-sm mt-1">
                  {editErrors.role}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser}>Update User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate User Dialog */}
      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate {selectedUser?.username}? They will no longer be able to access the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeactivateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivateUser}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
