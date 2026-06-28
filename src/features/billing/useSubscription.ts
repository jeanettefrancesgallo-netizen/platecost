import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useSubscription(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['subscription', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('organization_id', organizationId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}
