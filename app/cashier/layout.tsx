
import { ToastProvider } from '@/components/toast'
import { CashierNav } from '@/components/CashierNav'

export default function CashierLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ToastProvider>
      <CashierNav />
      <main className="flex-1 overflow-auto h-screen">
        {children}
      </main>
    </ToastProvider>
  )
}
