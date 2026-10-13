import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { columnCoordinates } from '../board-keyboard'
import { TASK_STATUSES } from '../constants'
import type { Task, TaskStatus } from '../types'
import { useBoardFilters } from '../use-board-filters'
import { useBoardRealtime } from '../use-board-realtime'
import { useMoveTask } from '../use-tasks'
import { BoardColumn } from './board-column'
import { BoardFilters } from './board-filters'
import { EditTaskDialog } from './edit-task-dialog'
import { TaskCardView } from './task-card'

interface BoardProps {
  projectId: string
  workspaceId: string
}

export function Board({ projectId, workspaceId }: BoardProps) {
  const moveTask = useMoveTask(projectId)
  useBoardRealtime(projectId)
  const [filters, setFilters] = useBoardFilters()
  const { status: visibleStatus, ...taskFilters } = filters
  const visibleStatuses = visibleStatus ? [visibleStatus] : TASK_STATUSES
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [openedTask, setOpenedTask] = useState<Task | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: columnCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  )
  const movingTaskId = moveTask.isPending ? moveTask.variables.taskId : null

  const onDragStart = ({ active }: DragStartEvent) => {
    setDraggedTask((active.data.current?.task as Task | undefined) ?? null)
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggedTask(null)
    const task = active.data.current?.task as Task | undefined
    const status = over?.id as TaskStatus | undefined
    if (!task || !status || task.status === status) {
      return
    }
    moveTask.mutate(
      { taskId: task.id, status },
      { onError: (error) => toast.error(getErrorMessage(error)) },
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDraggedTask(null)}
    >
      <BoardFilters
        workspaceId={workspaceId}
        filters={filters}
        onChange={setFilters}
      />
      <div
        className={cn(
          'grid items-start gap-4',
          !visibleStatus && 'md:grid-cols-3',
        )}
      >
        {visibleStatuses.map((status) => (
          <BoardColumn
            key={status}
            projectId={projectId}
            status={status}
            filters={taskFilters}
            movingTaskId={movingTaskId}
            dragDisabled={Boolean(visibleStatus)}
            onOpenTask={setOpenedTask}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {draggedTask && (
          <TaskCardView task={draggedTask} className="cursor-grabbing shadow-lg" />
        )}
      </DragOverlay>
      <EditTaskDialog
        projectId={projectId}
        workspaceId={workspaceId}
        task={openedTask}
        onClose={() => setOpenedTask(null)}
      />
    </DndContext>
  )
}
