
import { AdminNav } from '@/components/AdminNav'
import { ToastProvider } from '@/components/toast'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ToastProvider>
      <div className="flex h-screen">
        <AdminNav />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
