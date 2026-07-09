import React from 'react'

import './globals.css'

export const metadata = {
  title: 'Condoria',
  description: 'Official site of the Nation of Condoria on Rulercraft.',
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
