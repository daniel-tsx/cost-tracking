import type { Metadata, Viewport } from 'next'
import { DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

const appUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'CostTracker — Cost & Profit Tracker',
    template: '%s · CostTracker',
  },
  description:
    'Track product costs, revenue and profit margins — month over month.',
  applicationName: 'CostTracker',
  openGraph: {
    type: 'website',
    siteName: 'CostTracker',
    title: 'CostTracker — Cost & Profit Tracker',
    description:
      'Track product costs, revenue and profit margins — month over month.',
    url: appUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CostTracker — Cost & Profit Tracker',
    description:
      'Track product costs, revenue and profit margins — month over month.',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#19171d' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
