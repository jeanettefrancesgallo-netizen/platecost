import { useCurrentOrg } from '@/features/organizations/useCurrentOrg'
import { canManageTeamAndBilling } from '@/features/organizations/permissions'
import { usePlans } from './usePlans'
import { useSubscription } from './useSubscription'
import { useUsageCounts } from './useUsageCounts'
import { usePaymentSubmissions } from './usePaymentSubmissions'
import { UpgradeDialog } from './UpgradeDialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  approved: 'default',
  pending: 'secondary',
  rejected: 'destructive',
}

function UsageRow({ label, used, max }: { label: string; used: number; max: number | null }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">
        {used} / {max ?? '∞'}
      </span>
    </div>
  )
}

export function BillingSection() {
  const { currentOrg } = useCurrentOrg()
  const orgId = currentOrg?.organizationId
  const isOwner = canManageTeamAndBilling(currentOrg?.role)

  const { data: plans = [] } = usePlans()
  const { data: subscription } = useSubscription(orgId)
  const { data: usage } = useUsageCounts(orgId)
  const { data: submissions = [] } = usePaymentSubmissions(orgId)

  if (!currentOrg) return null

  const currentPlan = plans.find((p) => p.key === currentOrg.organization.plan)

  return (
    <div className="flex flex-col gap-4">
      <Card className="max-w-md">
        <CardHeader>
          <CardDescription>Current plan</CardDescription>
          <CardTitle className="flex items-center gap-2 text-xl">
            {currentPlan?.name ?? currentOrg.organization.plan}
            <Badge variant="secondary">{currentOrg.organization.status}</Badge>
          </CardTitle>
          {currentOrg.organization.status === 'trialing' && currentOrg.organization.trial_ends_at && (
            <CardDescription>
              Trial ends {new Date(currentOrg.organization.trial_ends_at).toLocaleDateString()}
            </CardDescription>
          )}
          {subscription?.current_period_end && (
            <CardDescription>
              Renews {new Date(subscription.current_period_end).toLocaleDateString()}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5 rounded-md border border-border p-3">
            <UsageRow label="Locations" used={usage?.locations ?? 0} max={currentPlan?.max_locations ?? null} />
            <UsageRow
              label="Ingredients"
              used={usage?.ingredients ?? 0}
              max={currentPlan?.max_ingredients ?? null}
            />
            <UsageRow label="Team members" used={usage?.members ?? 0} max={currentPlan?.max_members ?? null} />
          </div>
          {isOwner && (
            <UpgradeDialog
              organizationId={orgId!}
              orgCurrency={currentOrg.organization.base_currency}
            />
          )}
        </CardContent>
      </Card>

      {isOwner && submissions.length > 0 && (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-base">Payment history</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {submissions.map((s) => (
              <div key={s.id} className="rounded-md border border-border p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {s.plan} · {s.billing_cycle}
                  </span>
                  <Badge variant={STATUS_VARIANT[s.status]}>{s.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.amount} {s.currency} via {s.payment_method} · ref {s.reference_number} ·{' '}
                  {new Date(s.created_at).toLocaleDateString()}
                </p>
                {s.status === 'rejected' && s.admin_notes && (
                  <p className="mt-1 text-xs text-destructive">Admin note: {s.admin_notes}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
