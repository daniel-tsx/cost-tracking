'use client'

import { Fragment } from 'react'
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

// Dashboard stands alone (the read view); the rest is the management group,
// separated by a hairline so the bar reads as deliberate, not a flat row.
const navLinks = [
  { href: '/', label: 'Dashboard', icon: DashboardSquare01Icon, group: 'view' },
  { href: '/products', label: 'Products', icon: PackageIcon, group: 'manage' },
  { href: '/services', label: 'Services', icon: CloudServerIcon, group: 'manage' },
  { href: '/entries', label: 'Entries', icon: File01Icon, group: 'manage' },
  { href: '/templates', label: 'Templates', icon: RepeatIcon, group: 'manage' },
  { href: '/shared-costs', label: 'Shared', icon: DistributionIcon, group: 'manage' },
] as const

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-0.5 sm:gap-1">
      {navLinks.map((link, i) => {
        const active =
          link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
        const groupBoundary =
          i > 0 && link.group !== navLinks[i - 1].group
        return (
          <Fragment key={link.href}>
            {groupBoundary && (
              <span
                aria-hidden
                className="mx-1 hidden h-5 w-px bg-border sm:block"
              />
            )}
            <Link
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors sm:px-3',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              )}
            >
              <HugeiconsIcon icon={link.icon} className="size-4" />
              <span className="hidden sm:inline">{link.label}</span>
            </Link>
          </Fragment>
        )
      })}
    </nav>
  )
}
