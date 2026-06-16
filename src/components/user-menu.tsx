'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { HugeiconsIcon } from '@hugeicons/react'
import { UserCircleIcon, Logout01Icon } from '@hugeicons/core-free-icons'
import { signOut } from '@/lib/auth-client'

export function UserMenu({ email }: { email: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Account menu">
            <HugeiconsIcon icon={UserCircleIcon} className="size-5" />
          </Button>
        }
      />
      <DialogContent showCloseButton={false} className="sm:max-w-xs">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
            <HugeiconsIcon icon={UserCircleIcon} className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{email}</p>
            <p className="text-xs text-muted-foreground">Signed in</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleSignOut}
          disabled={loading}
        >
          <HugeiconsIcon icon={Logout01Icon} className="mr-2 size-4" />
          {loading ? 'Signing out…' : 'Sign out'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
