// ─────────────────────────────────────────────────────────────────────────────
// Dashboard hooks — TanStack Query wrappers for the three dashboard endpoints
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query'
import {
  fetchDashboardStats,
  fetchRecentPatients,
  fetchTodaySchedule,
  type DashboardStats,
  type DashboardPatientRow,
  type DashboardScheduleItem,
} from '@/services/dashboardService'
import { ApiError } from '@/services/apiClient'

// ── Query keys ────────────────────────────────────────────────────────────────

export const dashboardKeys = {
  all:            ['dashboard']                    as const,
  stats:          ['dashboard', 'stats']           as const,
  recentPatients: ['dashboard', 'recent-patients'] as const,
  todaySchedule:  ['dashboard', 'today-schedule']  as const,
}

// ── Shared query options ──────────────────────────────────────────────────────

const BASE_OPTIONS = {
  // Don't fire an extra request every time the user alt-tabs back —
  // the refetchInterval already keeps data fresh.
  refetchOnWindowFocus: false,
} as const

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Fetches the four stat-card metrics. Refetches every 60 s automatically. */
export function useDashboardStats() {
  return useQuery<DashboardStats, ApiError>({
    ...BASE_OPTIONS,
    queryKey:        dashboardKeys.stats,
    queryFn:         fetchDashboardStats,
    refetchInterval: 60_000,
  })
}

/** Fetches the latest 10 patients for the Recent Patients table. */
export function useRecentPatients() {
  return useQuery<DashboardPatientRow[], ApiError>({
    ...BASE_OPTIONS,
    queryKey:        dashboardKeys.recentPatients,
    queryFn:         fetchRecentPatients,
    refetchInterval: 60_000,
  })
}

/**
 * Fetches today's appointment schedule.
 * Refetches every 30 s so the "active" appointment marker stays current.
 */
export function useTodaySchedule() {
  return useQuery<DashboardScheduleItem[], ApiError>({
    ...BASE_OPTIONS,
    queryKey:        dashboardKeys.todaySchedule,
    queryFn:         fetchTodaySchedule,
    refetchInterval: 30_000,
  })
}
