'use client'

import { LogoutButton } from '@/components/LogoutButton'

export default function FinanceReportsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Finance Reports</h1>
          <LogoutButton />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Finance dashboard coming in Phase 3</p>
        </div>
      </div>
    </div>
  )
}
