import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'WebStockName',
  description: 'Single-store inventory and sales management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
