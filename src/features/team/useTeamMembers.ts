import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useTeamMembers(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['team-members', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('id, role, created_at, user_id, profiles(id, full_name, email)')
        .eq('organization_id', organizationId!)
        .order('created_at')

      if (error) throw error
      return data
    },
  })
}
