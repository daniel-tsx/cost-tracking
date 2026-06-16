'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function ResetForm() {
  const params = useSearchParams()
  const token = params.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!token) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Invalid link</h1>
        <p className="text-sm text-muted-foreground">
          This password reset link is invalid or has expired.
        </p>
        <Button
          variant="outline"
          className="w-full"
          render={<Link href="/forgot-password" />}
          nativeButton={false}
        >
          Request a new link
        </Button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Password updated</h1>
        <p className="text-sm text-muted-foreground">
          Your password has been changed. You can now sign in with it.
        </p>
        <Button
          className="w-full"
          render={<Link href="/login" />}
          nativeButton={false}
        >
          Sign in
        </Button>
      </div>
    )
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    })
    setLoading(false)
    if (error) {
      setError(
        error.message ?? 'This link is invalid or has expired. Request a new one.'
      )
      return
    }
    setDone(true)
  }

  return (
    <>
      <div className="mb-6 space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Set a new password</h1>
        <p className="text-sm text-muted-foreground">
          Choose a new password for your account.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Loading…</p>}
      >
        <ResetForm />
      </Suspense>
    </div>
  )
}
