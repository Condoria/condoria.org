import type { Metadata } from 'next'
import { Fraunces, Public_Sans } from 'next/font/google'
import type { ReactNode } from 'react'

import { Footer } from '@/components/site/Footer'
import { Nav } from '@/components/site/Nav'

import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['opsz'],
})

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-public-sans',
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Condoria — Official Gazette of the Nation',
    template: '%s · Condoria',
  },
  description:
    'The official record of the Nation of Condoria on the Rulercraft realm — charter, decrees, dispatches and chronicles from the high valley.',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    siteName: 'Condoria',
    type: 'website',
  },
}

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${publicSans.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-pine-900 focus:px-4 focus:py-2 focus:text-sm focus:text-parchment-50"
        >
          Skip to content
        </a>
        <Nav />
        <main id="content" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
