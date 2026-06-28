import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useUsageCounts(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['usage-counts', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const [locations, ingredients, members] = await Promise.all([
        supabase
          .from('locations')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId!),
        supabase
          .from('ingredients')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId!),
        supabase
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId!),
      ])

      return {
        locations: locations.count ?? 0,
        ingredients: ingredients.count ?? 0,
        members: members.count ?? 0,
      }
    },
  })
}
