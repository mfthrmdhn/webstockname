
import { FinanceNav } from '@/components/FinanceNav'
import { ToastProvider } from '@/components/toast'

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ToastProvider>
      <div className="flex h-screen bg-gray-50 flex-col md:flex-row">
        <div className="hidden md:block">
          <FinanceNav />
        </div>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
