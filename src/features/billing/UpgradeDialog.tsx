import { useState } from 'react'
import { toast } from 'sonner'
import { usePlans } from './usePlans'
import { usePaymentMethods } from './usePaymentMethods'
import { useSubmitPayment } from './usePaymentSubmissions'
import { formatCurrency } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function UpgradeDialog({
  organizationId,
  orgCurrency,
}: {
  organizationId: string
  orgCurrency: string
}) {
  const [open, setOpen] = useState(false)
  const { data: plans = [] } = usePlans()
  const { data: paymentMethods = [] } = usePaymentMethods()
  const submitPayment = useSubmitPayment(organizationId)

  const paidPlans = plans.filter((p) => p.key !== 'free')
  const [explicitPlanKey, setPlanKey] = useState('')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [methodId, setMethodId] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')

  // Plans load asynchronously — fall back to the first paid plan once they
  // arrive instead of guessing a key before any <SelectItem> for it exists
  // (the Select would never "see" the value become valid otherwise).
  const planKey = explicitPlanKey || paidPlans[0]?.key || ''

  const selectedPlan = plans.find((p) => p.key === planKey)
  const selectedMethod = paymentMethods.find((m) => m.id === methodId)

  const priceCurrency = orgCurrency === 'PHP' ? 'PHP' : 'USD'
  const price = selectedPlan
    ? priceCurrency === 'PHP'
      ? billingCycle === 'yearly'
        ? selectedPlan.price_yearly_php
        : selectedPlan.price_monthly_php
      : billingCycle === 'yearly'
        ? selectedPlan.price_yearly_usd
        : selectedPlan.price_monthly_usd
    : 0

  const onSubmit = async () => {
    if (!selectedPlan || !selectedMethod || !referenceNumber.trim()) {
      toast.error('Choose a plan, payment method, and enter your reference number')
      return
    }
    try {
      await submitPayment.mutateAsync({
        plan: selectedPlan.key,
        billingCycle,
        amount: price,
        currency: priceCurrency,
        paymentMethod: selectedMethod.method,
        referenceNumber: referenceNumber.trim(),
        notes,
      })
      toast.success('Payment submitted — a platform admin will review it shortly')
      setReferenceNumber('')
      setNotes('')
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not submit payment')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Upgrade plan</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upgrade your plan</DialogTitle>
          <DialogDescription>
            Pay via GCash or bank transfer, then submit your reference number below. A platform
            admin will review and activate your plan.
          </DialogDescription>
        </DialogHeader>

        {paidPlans.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading plans…</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Plan</Label>
                <Select value={planKey} onValueChange={(v) => v && setPlanKey(v)}>
                  <SelectTrigger>
                    <SelectValue>
                      {(key: string | null) =>
                        plans.find((p) => p.key === key)?.name ?? 'Choose a plan'
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {paidPlans.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Billing cycle</Label>
                <Select
                  value={billingCycle}
                  onValueChange={(v) => v && setBillingCycle(v as 'monthly' | 'yearly')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-sm">
              Amount due: <span className="font-medium">{formatCurrency(price, priceCurrency)}</span>{' '}
              ({billingCycle})
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Pay via</Label>
              {paymentMethods.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No payment methods configured yet — contact support.
                </p>
              ) : (
                <RadioGroup value={methodId} onValueChange={(v) => v && setMethodId(v)}>
                  {paymentMethods.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start gap-2 rounded-md border border-border p-2"
                    >
                      <RadioGroupItem value={m.id} id={`method-${m.id}`} className="mt-1" />
                      <Label htmlFor={`method-${m.id}`} className="flex flex-col gap-0.5 font-normal">
                        <span className="font-medium">{m.label}</span>
                        {Object.entries(m.details as Record<string, string>).map(([k, v]) => (
                          <span key={k} className="text-xs text-muted-foreground">
                            {k.replace(/_/g, ' ')}: {v}
                          </span>
                        ))}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ref-number">Reference number</Label>
              <Input
                id="ref-number"
                placeholder="e.g. GCash reference number"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payment-notes">Notes (optional)</Label>
              <Textarea
                id="payment-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onSubmit} disabled={submitPayment.isPending || paidPlans.length === 0}>
            Submit payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
