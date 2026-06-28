import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
}
