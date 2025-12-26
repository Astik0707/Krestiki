import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Крестики-нолики',
  description: 'Элегантная игра для прекрасных дам',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}

