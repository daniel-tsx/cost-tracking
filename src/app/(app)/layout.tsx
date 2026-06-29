import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MainNav } from '@/components/main-nav'
import { ThemeToggle } from '@/components/theme-toggle'
import { AnimatedLogo } from '@/components/logo'
import { UserMenu } from '@/components/user-menu'
import { getSessionUser } from '@/lib/auth-helpers'
import { getUserSettings } from '@/app/actions'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const settings = await getUserSettings()

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" className="group mr-3 flex items-center gap-2.5 sm:mr-8">
            <AnimatedLogo className="size-8 transition-transform group-hover:scale-105" />
            <span className="hidden text-lg font-semibold tracking-tight sm:inline">
              CostTracker
            </span>
          </Link>
          <MainNav />
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/account"
              title="Display currency"
              className="hidden items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 font-mono text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:flex"
            >
              <span className="size-1.5 rounded-full bg-success" />
              {settings.currency}
            </Link>
            <ThemeToggle />
            <UserMenu email={user.email} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </>
  )
}
