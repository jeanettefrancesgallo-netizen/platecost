import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useAuditLog(search: string) {
  return useQuery({
    queryKey: ['admin-audit-log', search],
    queryFn: async () => {
      let query = supabase
        .from('admin_audit_log')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(200)

      if (search.trim()) {
        query = query.or(`action.ilike.%${search.trim()}%,target_type.ilike.%${search.trim()}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}
