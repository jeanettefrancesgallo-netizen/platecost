import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useAdminPaymentSubmissions(status: string) {
  return useQuery({
    queryKey: ['admin-payment-submissions', status],
    queryFn: async () => {
      let query = supabase
        .from('payment_submissions')
        .select('*, organizations(name)')
        .order('created_at', { ascending: false })

      if (status !== 'all') {
        query = query.eq('status', status)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

function useInvalidatePaymentQueries() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['admin-payment-submissions'] })
    queryClient.invalidateQueries({ queryKey: ['admin-organizations'] })
    queryClient.invalidateQueries({ queryKey: ['admin-platform-stats'] })
    queryClient.invalidateQueries({ queryKey: ['admin-audit-log'] })
  }
}

export function useApprovePayment() {
  const invalidate = useInvalidatePaymentQueries()
  return useMutation({
    mutationFn: async (submissionId: string) => {
      const { error } = await supabase.rpc('admin_approve_payment', {
        p_submission_id: submissionId,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useRejectPayment() {
  const invalidate = useInvalidatePaymentQueries()
  return useMutation({
    mutationFn: async ({ submissionId, notes }: { submissionId: string; notes: string }) => {
      const { error } = await supabase.rpc('admin_reject_payment', {
        p_submission_id: submissionId,
        p_notes: notes,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
