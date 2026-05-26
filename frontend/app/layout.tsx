import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = {
  title: 'Anuradha Textile — TaskFlow',
  description: 'Employee task management by Anuradha Textile',
  icons: { icon: '/logo.jpeg' },
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mesh" />
        <div className="rel">{children}</div>
      </body>
    </html>
  )
}
