import Link from 'next/link'
import { AnimatedLogo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 flex items-center justify-center gap-2.5"
          >
            <AnimatedLogo className="size-9" />
            <span className="text-xl font-semibold tracking-tight">
              CostTracker
            </span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  )
}
