import { Badge } from '@/components/ui/badge'
import { PRIORITY_LABELS } from '../constants'
import type { TaskPriority } from '../types'

const VARIANTS = {
  LOW: 'outline',
  MEDIUM: 'secondary',
  HIGH: 'default',
  URGENT: 'destructive',
} as const

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge variant={VARIANTS[priority]}>{PRIORITY_LABELS[priority]}</Badge>
}
