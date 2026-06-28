import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function usePaymentSubmissions(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['payment-submissions', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_submissions')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useSubmitPayment(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      plan: string
      billingCycle: 'monthly' | 'yearly'
      amount: number
      currency: string
      paymentMethod: string
      referenceNumber: string
      notes: string
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      const { error } = await supabase.from('payment_submissions').insert({
        organization_id: organizationId,
        plan: input.plan,
        billing_cycle: input.billingCycle,
        amount: input.amount,
        currency: input.currency,
        payment_method: input.paymentMethod,
        reference_number: input.referenceNumber,
        notes: input.notes || null,
        submitted_by: user.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-submissions', organizationId] })
    },
  })
}
