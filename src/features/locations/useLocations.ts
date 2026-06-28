import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useLocations(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['locations', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('created_at')
      if (error) throw error
      return data
    },
  })
}
