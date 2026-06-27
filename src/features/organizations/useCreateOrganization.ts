import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface CreateOrganizationInput {
  name: string
  slug: string
  baseCurrency: string
}

export function useCreateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, slug, baseCurrency }: CreateOrganizationInput) => {
      const { data, error } = await supabase.rpc('create_organization_with_owner', {
        p_name: name,
        p_slug: slug,
        p_base_currency: baseCurrency,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Awaited so callers that navigate right after mutateAsync() resolves
      // (e.g. into a route gated on the organizations list) see fresh data,
      // not the stale pre-creation cache.
      return queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
  })
}
