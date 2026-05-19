
import { AdminNav } from '@/components/AdminNav'
import { ToastProvider } from '@/components/toast'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ToastProvider>
      <AdminNav />
      <main className="flex-1 overflow-auto h-screen">
        {children}
      </main>
    </ToastProvider>
  )
}
