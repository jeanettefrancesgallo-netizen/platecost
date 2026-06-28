import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useExchangeRates(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['exchange-rates', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_exchange_rates')
        .select('*')
        .eq('organization_id', organizationId!)
      if (error) throw error
      return data
    },
  })
}

export function useSetExchangeRate(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ currencyCode, rateToBase }: { currencyCode: string; rateToBase: number }) => {
      const { error } = await supabase
        .from('organization_exchange_rates')
        .upsert({ organization_id: organizationId, currency_code: currencyCode, rate_to_base: rateToBase })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exchange-rates', organizationId] }),
  })
}
