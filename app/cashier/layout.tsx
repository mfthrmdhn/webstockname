
import { ToastProvider } from '@/components/toast'
import { CashierNav } from '@/components/CashierNav'

export default function CashierLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ToastProvider>
      <div className="flex h-screen bg-gray-50 flex-col md:flex-row">
        <div className="hidden md:block">
          <CashierNav />
        </div>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
