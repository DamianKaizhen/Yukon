import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Header } from '@/components/layout/header'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Cabinet Quoting System',
  description: 'Professional cabinet quoting and ordering system for customers and sales teams',
  keywords: ['cabinets', 'quoting', 'kitchen', 'bathroom', 'furniture'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <Header />
          <main className="min-h-screen">
            {children}
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}