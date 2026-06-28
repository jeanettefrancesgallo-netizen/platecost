import { useState } from 'react'
import { toast } from 'sonner'
import {
  useAdminPaymentSubmissions,
  useApprovePayment,
  useRejectPayment,
} from '@/features/admin/usePaymentSubmissionsAdmin'
import { PaymentMethodsManagerDialog } from '@/features/admin/PaymentMethodsManagerDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const STATUS_OPTIONS = ['pending', 'approved', 'rejected', 'all']

export function AdminPaymentsPage() {
  const [status, setStatus] = useState('pending')
  const { data: submissions = [], isLoading } = useAdminPaymentSubmissions(status)
  const approvePayment = useApprovePayment()
  const rejectPayment = useRejectPayment()

  const onApprove = async (id: string, orgName: string) => {
    try {
      await approvePayment.mutateAsync(id)
      toast.success(`Approved payment for ${orgName}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not approve payment')
    }
  }

  const onReject = async (id: string, orgName: string) => {
    const notes = window.prompt(`Reason for rejecting ${orgName}'s payment (optional):`) ?? ''
    try {
      await rejectPayment.mutateAsync({ submissionId: id, notes })
      toast.success(`Rejected payment for ${orgName}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not reject payment')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Payments</h1>
        <PaymentMethodsManagerDialog />
      </div>

      <Select value={status} onValueChange={(v) => v && setStatus(v)}>
        <SelectTrigger className="w-40 border-slate-800 bg-slate-900 text-slate-100">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {s === 'all' ? 'All' : s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex flex-col gap-2">
        {isLoading && <p className="text-slate-400">Loading…</p>}
        {!isLoading && submissions.length === 0 && (
          <p className="text-slate-400">No submissions.</p>
        )}
        {submissions.map((s) => (
          <Card key={s.id} className="border-slate-800 bg-slate-900 text-slate-100">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{s.organizations?.name}</span>
                  <Badge variant="secondary">
                    {s.plan} · {s.billing_cycle}
                  </Badge>
                  <Badge
                    variant={
                      s.status === 'approved'
                        ? 'default'
                        : s.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {s.status}
                  </Badge>
                </div>
                <p className="text-sm text-slate-400">
                  {s.amount} {s.currency} via {s.payment_method} · ref {s.reference_number} ·{' '}
                  {new Date(s.created_at).toLocaleString()}
                </p>
                {s.notes && <p className="text-xs text-slate-500">Note: {s.notes}</p>}
                {s.admin_notes && (
                  <p className="text-xs text-amber-400">Admin note: {s.admin_notes}</p>
                )}
              </div>
              {s.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={approvePayment.isPending}
                    onClick={() => onApprove(s.id, s.organizations?.name ?? 'this org')}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={rejectPayment.isPending}
                    onClick={() => onReject(s.id, s.organizations?.name ?? 'this org')}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
