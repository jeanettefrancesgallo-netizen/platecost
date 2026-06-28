import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useAdminPaymentMethods() {
  return useQuery({
    queryKey: ['admin-payment-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_payment_methods')
        .select('*')
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
}

export function useCreatePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { method: string; label: string; details: Record<string, string> }) => {
      const { error } = await supabase.from('platform_payment_methods').insert(input)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-methods'] })
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
    },
  })
}

export function useTogglePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('platform_payment_methods')
        .update({ is_active: isActive })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-methods'] })
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
    },
  })
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('platform_payment_methods').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-methods'] })
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
    },
  })
}
