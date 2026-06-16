import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MainNav } from '@/components/main-nav'
import { ThemeToggle } from '@/components/theme-toggle'
import { Logo } from '@/components/logo'
import { UserMenu } from '@/components/user-menu'
import { getSessionUser } from '@/lib/auth-helpers'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-6">
          <Link href="/" className="group mr-6 flex items-center gap-2.5 sm:mr-10">
            <Logo className="size-8 transition-transform group-hover:scale-105" />
            <span className="hidden text-lg font-semibold tracking-tight sm:inline">
              CostTracker
            </span>
          </Link>
          <MainNav />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserMenu email={user.email} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
    </>
  )
}
