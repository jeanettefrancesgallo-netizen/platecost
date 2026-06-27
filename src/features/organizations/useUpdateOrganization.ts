import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface UpdateOrganizationInput {
  organizationId: string
  name: string
  baseCurrency: string
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ organizationId, name, baseCurrency }: UpdateOrganizationInput) => {
      const { data, error } = await supabase.rpc('update_organization', {
        p_org_id: organizationId,
        p_name: name,
        p_base_currency: baseCurrency,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
  })
}
