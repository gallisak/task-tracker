import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from './page-states'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-svh items-center justify-center p-6">
          <ErrorState
            title="Something went wrong"
            message="The page crashed unexpectedly. Reloading usually helps."
            actionLabel="Reload page"
            onAction={() => window.location.reload()}
          />
        </div>
      )
    }
    return this.props.children
  }
}
