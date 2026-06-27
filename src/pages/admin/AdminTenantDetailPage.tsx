import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAdminOrganizationDetail } from '@/features/admin/useAdminOrganizationDetail'
import {
  useChangeOrganizationPlan,
  useDeleteOrganization,
  useExtendTrial,
  useLogOrganizationView,
  useSetOrganizationStatus,
} from '@/features/admin/useAdminMutations'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function AdminTenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useAdminOrganizationDetail(id)
  const setStatus = useSetOrganizationStatus(id ?? '')
  const changePlan = useChangeOrganizationPlan(id ?? '')
  const extendTrial = useExtendTrial(id ?? '')
  const deleteOrganization = useDeleteOrganization()
  const logView = useLogOrganizationView()

  useEffect(() => {
    if (id) logView.mutate(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- log once per tenant id, not on every render
  }, [id])

  if (isLoading || !data) {
    return <p className="text-slate-400">Loading…</p>
  }

  const { organization, members, subscription, ingredientCount, recipeCount } = data

  const onDelete = async () => {
    try {
      await deleteOrganization.mutateAsync(organization.id)
      toast.success(`Deleted ${organization.name}`)
      navigate('/admin/tenants')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete organization')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">{organization.name}</h1>
        <p className="text-slate-400">{organization.slug}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardDescription className="text-slate-400">Status</CardDescription>
            <CardTitle className="text-white">
              <Badge variant="secondary">{organization.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            {organization.status !== 'suspended' ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={setStatus.isPending}
                onClick={() => setStatus.mutate('suspended')}
              >
                Suspend
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                disabled={setStatus.isPending}
                onClick={() => setStatus.mutate('active')}
              >
                Reactivate
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardDescription className="text-slate-400">Plan</CardDescription>
            <CardTitle className="text-white">{organization.plan}</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={organization.plan} onValueChange={(v) => v && changePlan.mutate(v)}>
              <SelectTrigger className="w-full border-slate-800 bg-slate-950 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardDescription className="text-slate-400">Trial ends</CardDescription>
            <CardTitle className="text-white">
              {organization.trial_ends_at
                ? new Date(organization.trial_ends_at).toLocaleDateString()
                : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              size="sm"
              variant="secondary"
              disabled={extendTrial.isPending}
              onClick={() => extendTrial.mutate(14)}
            >
              Extend 14 days
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardDescription className="text-slate-400">Base currency</CardDescription>
            <CardTitle className="text-white">{organization.base_currency}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardDescription className="text-slate-400">Ingredients / Recipes</CardDescription>
            <CardTitle className="text-white">
              {ingredientCount} / {recipeCount}
            </CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardDescription className="text-slate-400">Billing cycle</CardDescription>
            <CardTitle className="text-white">{subscription?.billing_cycle ?? 'monthly'}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
      </div>

      <Card className="border-slate-800 bg-slate-900 text-slate-100">
        <CardHeader>
          <CardTitle className="text-base text-white">Members</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-md border border-slate-800 px-3 py-2"
            >
              <span>{member.profiles?.full_name ?? member.profiles?.email}</span>
              <Badge variant="secondary">{member.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-destructive/50 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
          <CardDescription className="text-slate-400">
            Permanently delete this organization and all of its data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              Delete organization
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {organization.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes the organization and all of its ingredients, recipes,
                  inventory, and members. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
