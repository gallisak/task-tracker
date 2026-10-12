import type { ReactNode } from 'react'
import { CircleAlertIcon, InboxIcon, Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StateShellProps {
  icon: ReactNode
  title: string
  message?: string
  children?: ReactNode
  role?: 'status' | 'alert'
}

function StateShell({ icon, title, message, children, role }: StateShellProps) {
  return (
    <div
      role={role}
      className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center"
    >
      <div className="text-muted-foreground">{icon}</div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {message && (
          <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
        )}
      </div>
      {children}
    </div>
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <StateShell
      role="status"
      icon={<Loader2Icon className="size-6 animate-spin" />}
      title={label}
    />
  )
}

interface ErrorStateProps {
  title?: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function ErrorState({
  title = 'Could not load this',
  message,
  actionLabel = 'Try again',
  onAction,
}: ErrorStateProps) {
  return (
    <StateShell
      role="alert"
      icon={<CircleAlertIcon className="size-6 text-destructive" />}
      title={title}
      message={message}
    >
      {onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </StateShell>
  )
}

interface EmptyStateProps {
  title: string
  message?: string
  action?: ReactNode
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <StateShell
      icon={<InboxIcon className="size-6" />}
      title={title}
      message={message}
    >
      {action}
    </StateShell>
  )
}
