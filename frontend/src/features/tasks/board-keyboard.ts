import type { KeyboardCoordinateGetter } from '@dnd-kit/core'
import { TASK_STATUSES } from './constants'
import type { Task, TaskStatus } from './types'

const NEXT_COLUMN_KEYS = ['ArrowRight', 'ArrowDown']
const PREVIOUS_COLUMN_KEYS = ['ArrowLeft', 'ArrowUp']
const COLUMN_HEADER_OFFSET = 48

export const columnCoordinates: KeyboardCoordinateGetter = (
  event,
  { context: { active, over, collisionRect, droppableRects } },
) => {
  const step = NEXT_COLUMN_KEYS.includes(event.code)
    ? 1
    : PREVIOUS_COLUMN_KEYS.includes(event.code)
      ? -1
      : 0
  if (step === 0 || !collisionRect) {
    return undefined
  }
  event.preventDefault()

  const columns = TASK_STATUSES.filter((status) => droppableRects.has(status))
  const task = active?.data.current?.task as Task | undefined
  const current = (over?.id ?? task?.status) as TaskStatus | undefined
  const target = current && columns[columns.indexOf(current) + step]
  const rect = target && droppableRects.get(target)
  if (!rect) {
    return undefined
  }

  return {
    x: rect.left + (rect.width - collisionRect.width) / 2,
    y: rect.top + COLUMN_HEADER_OFFSET,
  }
}
