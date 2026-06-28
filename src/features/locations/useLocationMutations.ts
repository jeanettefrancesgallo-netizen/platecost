import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

function useInvalidateLocations(organizationId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['locations', organizationId] })
}

export function useCreateLocation(organizationId: string) {
  const invalidate = useInvalidateLocations(organizationId)
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('locations')
        .insert({ organization_id: organizationId, name, is_primary: false })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: invalidate,
  })
}

export function useRenameLocation(organizationId: string) {
  const invalidate = useInvalidateLocations(organizationId)
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('locations').update({ name }).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useDeleteLocation(organizationId: string) {
  const invalidate = useInvalidateLocations(organizationId)
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('locations').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
