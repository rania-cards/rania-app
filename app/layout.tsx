/* eslint-disable @next/next/no-html-link-for-pages */
import type React from "react"
import type { Metadata } from "next"


import "./globals.css"
import Link from "next/link"


export const metadata: Metadata = {
  title: "RANIA · Emotional Truth Engine",
  description: "Turn honest feelings into shareable WhatsApp moments. For Gen Z in East Africa.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans antialiased bg-background text-foreground`}>
        {/* <CHANGE> Added sticky header with glassmorphism */}
        <header className="sticky top-0 z-50 glass border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="text-2xl font-black bg-linear-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                ✨ RANIA
              </Link>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm text-white/60">
              <Link
              href="/moments/create"
              className="block w-full px-6 py-3 rounded-full bg-linear-to-r from-purple-500 via-pink-500 to-cyan-400 text-black 
              font-bold text-sm shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 transition-all text-center"
             
            >
              Create Moment
            </Link>
            </nav>
          </div>
        </header>

        {/* Main content */}
        <main className="min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
        </main>

        {/* Background decoration */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        </div>

      
      </body>
    </html>
  )
}
