import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type Category = Database['public']['Tables']['ingredient_categories']['Row']

function useInvalidateCategories(organizationId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['categories', organizationId] })
}

export function useCreateCategory(organizationId: string) {
  const invalidate = useInvalidateCategories(organizationId)
  return useMutation({
    mutationFn: async ({ name, sortOrder }: { name: string; sortOrder: number }) => {
      const { error } = await supabase
        .from('ingredient_categories')
        .insert({ organization_id: organizationId, name, sort_order: sortOrder })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useRenameCategory(organizationId: string) {
  const invalidate = useInvalidateCategories(organizationId)
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('ingredient_categories').update({ name }).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useReorderCategories(organizationId: string) {
  const invalidate = useInvalidateCategories(organizationId)
  return useMutation({
    mutationFn: async (categories: Pick<Category, 'id' | 'sort_order'>[]) => {
      await Promise.all(
        categories.map((c) =>
          supabase
            .from('ingredient_categories')
            .update({ sort_order: c.sort_order })
            .eq('id', c.id)
            .then(({ error }) => {
              if (error) throw error
            }),
        ),
      )
    },
    onSuccess: invalidate,
  })
}

export function useDeleteCategory(organizationId: string) {
  const invalidate = useInvalidateCategories(organizationId)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase.rpc('delete_category_safely', {
        p_category_id: categoryId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      invalidate()
      queryClient.invalidateQueries({ queryKey: ['ingredients', organizationId] })
    },
  })
}
