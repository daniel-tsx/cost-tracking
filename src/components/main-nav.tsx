'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  DashboardSquare01Icon,
  PackageIcon,
  File01Icon,
  CloudServerIcon,
  RepeatIcon,
  DistributionIcon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/', label: 'Dashboard', icon: DashboardSquare01Icon },
  { href: '/products', label: 'Products', icon: PackageIcon },
  { href: '/services', label: 'Services', icon: CloudServerIcon },
  { href: '/entries', label: 'Entries', icon: File01Icon },
  { href: '/templates', label: 'Templates', icon: RepeatIcon },
  { href: '/shared-costs', label: 'Shared', icon: DistributionIcon },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1">
      {navLinks.map((link) => {
        const active =
          link.href === '/'
            ? pathname === '/'
            : pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
            )}
          >
            <HugeiconsIcon icon={link.icon} className="size-4" />
            <span className="hidden sm:inline">{link.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
