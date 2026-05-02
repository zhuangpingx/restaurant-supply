import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '供应链协同系统',
  description: '餐饮连锁供应商协同管理平台',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        {children}
        <Toaster position="top-center" toastOptions={{ duration: 3000, style: { borderRadius: '12px', fontSize: '14px' } }} />
      </body>
    </html>
  )
}
