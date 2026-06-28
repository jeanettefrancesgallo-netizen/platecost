import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type RecipeInsert = Database['public']['Tables']['recipes']['Insert']
type RecipeUpdate = Database['public']['Tables']['recipes']['Update']

export function useCreateRecipe(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<RecipeInsert, 'organization_id'>) => {
      const { data, error } = await supabase
        .from('recipes')
        .insert({ ...input, organization_id: organizationId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipes', organizationId] }),
  })
}

export function useUpdateRecipe(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: RecipeUpdate & { id: string }) => {
      const { error } = await supabase.from('recipes').update(input).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recipes', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['recipe', variables.id] })
    },
  })
}

export function useDeleteRecipe(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recipes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipes', organizationId] }),
  })
}
