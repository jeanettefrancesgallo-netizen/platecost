import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useTeamInvitations(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['team-invitations', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('organization_id', organizationId!)
        .is('accepted_at', null)
        .order('created_at')

      if (error) throw error
      return data
    },
  })
}
