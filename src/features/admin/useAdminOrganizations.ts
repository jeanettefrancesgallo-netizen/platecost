import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface AdminOrgFilters {
  search: string
  status: string
  plan: string
}

export function useAdminOrganizations(filters: AdminOrgFilters) {
  return useQuery({
    queryKey: ['admin-organizations', filters],
    queryFn: async () => {
      let query = supabase
        .from('organizations')
        .select('*, organization_members(count)')
        .order('created_at', { ascending: false })

      if (filters.search.trim()) {
        query = query.ilike('name', `%${filters.search.trim()}%`)
      }
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters.plan !== 'all') {
        query = query.eq('plan', filters.plan)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}
