import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type IngredientInsert = Database['public']['Tables']['ingredients']['Insert']
type IngredientUpdate = Database['public']['Tables']['ingredients']['Update']

function useInvalidateIngredients(organizationId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['ingredients', organizationId] })
}

export function useCreateIngredient(organizationId: string) {
  const invalidate = useInvalidateIngredients(organizationId)
  return useMutation({
    mutationFn: async (input: Omit<IngredientInsert, 'organization_id'>) => {
      const { error } = await supabase
        .from('ingredients')
        .insert({ ...input, organization_id: organizationId })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useUpdateIngredient(organizationId: string) {
  const invalidate = useInvalidateIngredients(organizationId)
  return useMutation({
    mutationFn: async ({ id, ...input }: IngredientUpdate & { id: string }) => {
      const { error } = await supabase.from('ingredients').update(input).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useDeleteIngredient(organizationId: string) {
  const invalidate = useInvalidateIngredients(organizationId)
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ingredients').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
