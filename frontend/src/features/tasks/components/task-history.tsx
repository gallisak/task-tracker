import { ArrowRightIcon } from 'lucide-react'
import { ErrorState, LoadingState } from '@/components/page-states'
import { Badge } from '@/components/ui/badge'
import { getErrorMessage } from '@/lib/api-client'
import { STATUS_LABELS } from '../constants'
import { formatDateTime } from '../format'
import { useStatusHistory } from '../use-task-details'

export function TaskHistory({ taskId }: { taskId: string }) {
  const history = useStatusHistory(taskId)

  if (history.isPending) {
    return <LoadingState label="Loading history…" />
  }

  if (history.isError) {
    return (
      <ErrorState
        title="Could not load history"
        message={getErrorMessage(history.error)}
        onAction={() => void history.refetch()}
      />
    )
  }

  if (history.data.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        The status has not changed yet
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {history.data.map((change) => (
        <li key={change.id} className="space-y-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{STATUS_LABELS[change.fromStatus]}</Badge>
            <ArrowRightIcon className="size-3.5 text-muted-foreground" />
            <Badge variant="secondary">{STATUS_LABELS[change.toStatus]}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {change.changedBy.name} · {formatDateTime(change.changedAt)}
          </p>
        </li>
      ))}
    </ul>
  )
}
