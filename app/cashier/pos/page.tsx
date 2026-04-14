'use client'

import { LogoutButton } from '@/components/LogoutButton'

export default function CashierPosPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Point of Sale</h1>
          <LogoutButton />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">POS interface coming in Phase 2</p>
        </div>
      </div>
    </div>
  )
}
