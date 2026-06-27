import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PlatformStats {
  total_organizations: number
  active_organizations: number
  trialing_organizations: number
  suspended_organizations: number
  churned_organizations: number
  total_users: number
  mrr_usd: number
  plan_distribution: { plan: string; count: number }[]
  signups_by_day: { day: string; count: number }[]
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ['admin-platform-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_platform_stats')
      if (error) throw error
      return data as unknown as PlatformStats
    },
  })
}
