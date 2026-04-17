import { useQuery } from '@tanstack/react-query'

/**
 * Returns disk space info for a given storage path, cached and refreshed every 30s.
 * Multiple components using the same path share a single IPC call via React Query cache.
 */
export function useDiskSpace(storagePath: string | undefined) {
  return useQuery({
    queryKey: ['diskSpace', storagePath],
    queryFn: () => window.electronAPI.getDiskSpace(storagePath!),
    enabled: !!storagePath,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}
