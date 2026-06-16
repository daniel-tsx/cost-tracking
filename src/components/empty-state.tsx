import { HugeiconsIcon } from '@hugeicons/react'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentProps<typeof HugeiconsIcon>['icon']
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-20 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-muted">
        <HugeiconsIcon icon={icon} className="size-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
