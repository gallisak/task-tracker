import { EmptyState } from '@/components/page-states'

export function HomePage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <EmptyState
        title="Task Tracker"
        message="The application shell is ready. Sign-in comes next."
      />
    </div>
  )
}
