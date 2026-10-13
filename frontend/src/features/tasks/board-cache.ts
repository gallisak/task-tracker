import type { InfiniteData, QueryKey } from '@tanstack/react-query'
import type { Task, TaskFilters, TaskPage, TaskStatus } from './types'

export type ColumnData = InfiniteData<TaskPage, string | undefined>
export type ColumnEntry = [QueryKey, ColumnData | undefined]

const STATUS_KEY_INDEX = 3
const FILTERS_KEY_INDEX = 4

function findTask(entries: ColumnEntry[], taskId: string): Task | undefined {
  for (const [, data] of entries) {
    for (const page of data?.pages ?? []) {
      const task = page.items.find((item) => item.id === taskId)
      if (task) {
        return task
      }
    }
  }
  return undefined
}

function matchesFilters(task: Task, filters: TaskFilters = {}): boolean {
  return (
    (!filters.priority || task.priority === filters.priority) &&
    (!filters.assigneeId || task.assignee?.id === filters.assigneeId)
  )
}

function isNewerThan(task: Task, other: Task): boolean {
  return (
    task.createdAt > other.createdAt ||
    (task.createdAt === other.createdAt && task.id > other.id)
  )
}

function withoutTask(data: ColumnData, taskId: string): ColumnData {
  const hasTask = data.pages.some((page) =>
    page.items.some((item) => item.id === taskId),
  )
  if (!hasTask) {
    return data
  }
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => item.id !== taskId),
      total: page.total - 1,
    })),
  }
}

function withTask(data: ColumnData, task: Task): ColumnData {
  const hasTask = data.pages.some((page) =>
    page.items.some((item) => item.id === task.id),
  )
  if (hasTask) {
    return data
  }

  let placed = false
  const lastPageIndex = data.pages.length - 1
  const pages = data.pages.map((page, index) => {
    const items = [...page.items]
    if (!placed) {
      const position = items.findIndex((item) => isNewerThan(task, item))
      if (position !== -1) {
        items.splice(position, 0, task)
        placed = true
      } else if (index === lastPageIndex) {
        items.push(task)
        placed = true
      }
    }
    return { ...page, items, total: page.total + 1 }
  })
  return { ...data, pages }
}

export function moveTaskInColumns(
  entries: ColumnEntry[],
  taskId: string,
  status: TaskStatus,
): ColumnEntry[] {
  const task = findTask(entries, taskId)
  if (!task) {
    return entries
  }

  const moved: Task = { ...task, status }
  return entries.map(([key, data]) => {
    if (!data) {
      return [key, data]
    }
    if (key[STATUS_KEY_INDEX] !== status) {
      return [key, withoutTask(data, taskId)]
    }
    const filters = key[FILTERS_KEY_INDEX] as TaskFilters | undefined
    return [key, matchesFilters(moved, filters) ? withTask(data, moved) : data]
  })
}
