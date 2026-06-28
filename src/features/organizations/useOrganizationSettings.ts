import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useOrganizationSettings(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organization-settings', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organizationId!)
        .single()
      if (error) throw error
      return data
    },
  })
}
