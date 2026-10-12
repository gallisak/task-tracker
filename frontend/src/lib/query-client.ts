import { QueryClient } from '@tanstack/react-query'
import { getErrorStatus } from './api-client'

const MAX_RETRIES = 2

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = getErrorStatus(error)
        if (status !== undefined && status < 500) {
          return false
        }
        return failureCount < MAX_RETRIES
      },
    },
  },
})
