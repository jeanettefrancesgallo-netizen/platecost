import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useAdminOrganizationDetail(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['admin-organization-detail', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const [orgResult, membersResult, subscriptionResult, ingredientCountResult, recipeCountResult] =
        await Promise.all([
          supabase.from('organizations').select('*').eq('id', organizationId!).single(),
          supabase
            .from('organization_members')
            .select('id, role, created_at, user_id, profiles(id, full_name, email)')
            .eq('organization_id', organizationId!)
            .order('created_at'),
          supabase.from('subscriptions').select('*').eq('organization_id', organizationId!).maybeSingle(),
          supabase
            .from('ingredients')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId!),
          supabase
            .from('recipes')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId!),
        ])

      if (orgResult.error) throw orgResult.error
      if (membersResult.error) throw membersResult.error
      if (subscriptionResult.error) throw subscriptionResult.error

      return {
        organization: orgResult.data,
        members: membersResult.data,
        subscription: subscriptionResult.data,
        ingredientCount: ingredientCountResult.count ?? 0,
        recipeCount: recipeCountResult.count ?? 0,
      }
    },
  })
}
