import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useSuppliers(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['suppliers', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreateSupplier(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({ organization_id: organizationId, name })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers', organizationId] }),
  })
}
