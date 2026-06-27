import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useAdminFeatureFlags() {
  return useQuery({
    queryKey: ['admin-feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCreateFeatureFlag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { key: string; description: string; isEnabledDefault: boolean }) => {
      const { error } = await supabase.from('feature_flags').insert({
        key: input.key,
        description: input.description,
        is_enabled_default: input.isEnabledDefault,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] }),
  })
}

export function useToggleFeatureFlagDefault() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isEnabledDefault }: { id: string; isEnabledDefault: boolean }) => {
      const { error } = await supabase
        .from('feature_flags')
        .update({ is_enabled_default: isEnabledDefault })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] }),
  })
}

export function useDeleteFeatureFlag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('feature_flags').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] }),
  })
}
