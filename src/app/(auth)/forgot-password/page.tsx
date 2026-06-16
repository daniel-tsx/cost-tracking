'use client'

import { useState } from 'react'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: '/reset-password',
    })
    setLoading(false)
    if (error) {
      setError(error.message ?? 'Something went wrong. Please try again.')
      return
    }
    setSent(true)
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {sent ? (
        <div className="space-y-3 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            If an account exists for <span className="font-medium">{email}</span>,
            we&apos;ve sent a link to reset your password. The link expires in 1
            hour.
          </p>
          <Button
            variant="outline"
            className="w-full"
            render={<Link href="/login" />}
            nativeButton={false}
          >
            Back to sign in
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6 space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">
              Forgot password?
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered it?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
