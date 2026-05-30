// Singleton QueryClient — importable outside React components (e.g. Zustand stores)
import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,   // always refetch on mount — dashboard data must be fresh
      retry: 1,
    },
  },
})

export function getQueryClient(): QueryClient {
  return queryClient
}
