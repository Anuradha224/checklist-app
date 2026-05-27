import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Anuradha Textile — TaskFlow',
  description: 'Employee task management by Anuradha Textile',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TaskFlow',
  },
  icons: {
    icon: [
      { url: '/icon-16x16.png',  sizes: '16x16',  type: 'image/png' },
      { url: '/icon-32x32.png',  sizes: '32x32',  type: 'image/png' },
      { url: '/icon-48x48.png',  sizes: '48x48',  type: 'image/png' },
      { url: '/icon-96x96.png',  sizes: '96x96',  type: 'image/png' },
      { url: '/icon-192x192.png',sizes: '192x192',type: 'image/png' },
      { url: '/icon-512x512.png',sizes: '512x512',type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/icon-512x512.png' },
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#4F46E5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TaskFlow" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <div className="mesh" />
        <div className="rel">{children}</div>
      </body>
    </html>
  )
}
