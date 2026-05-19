
import { FinanceNav } from '@/components/FinanceNav'
import { ToastProvider } from '@/components/toast'

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ToastProvider>
      <FinanceNav />
      <main className="flex-1 overflow-auto h-screen">
        {children}
      </main>
    </ToastProvider>
  )
}
