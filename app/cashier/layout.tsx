
import { ToastProvider } from '@/components/toast'
import { CashierNav } from '@/components/CashierNav'

export default function CashierLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ToastProvider>
      <div className="flex h-screen bg-gray-50">
        <CashierNav />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
