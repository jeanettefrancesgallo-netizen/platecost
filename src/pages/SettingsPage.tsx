import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useCurrentOrg } from '@/features/organizations/useCurrentOrg'
import { canManageTeamAndBilling } from '@/features/organizations/permissions'
import { useUpdateOrganization } from '@/features/organizations/useUpdateOrganization'
import { BillingSection } from '@/features/billing/BillingSection'
import { CurrencySection } from '@/features/organizations/CurrencySection'
import { CURRENCIES } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const settingsSchema = z.object({
  name: z.string().min(1, 'Enter a business name'),
  baseCurrency: z.string().min(1),
})

type SettingsForm = z.infer<typeof settingsSchema>

export function SettingsPage() {
  const { currentOrg } = useCurrentOrg()
  const isOwner = canManageTeamAndBilling(currentOrg?.role)
  const updateOrganization = useUpdateOrganization()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    values: currentOrg
      ? { name: currentOrg.organization.name, baseCurrency: currentOrg.organization.base_currency }
      : undefined,
  })
  const baseCurrency = watch('baseCurrency')

  if (!currentOrg) return null

  const onSubmit = async (values: SettingsForm) => {
    try {
      await updateOrganization.mutateAsync({
        organizationId: currentOrg.organizationId,
        name: values.name,
        baseCurrency: values.baseCurrency,
      })
      toast.success('Organization settings saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save settings')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="currency">Currency</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="organization">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-base">Organization</CardTitle>
              <CardDescription>
                {isOwner ? 'Business name and base currency.' : 'Only the owner can change these.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Business name</Label>
                  <Input id="name" disabled={!isOwner} {...register('name')} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="baseCurrency">Base currency</Label>
                  <Select
                    value={baseCurrency}
                    onValueChange={(value) => value && setValue('baseCurrency', value)}
                    disabled={!isOwner}
                  >
                    <SelectTrigger id="baseCurrency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code} — {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isOwner && (
                  <Button type="submit" disabled={updateOrganization.isPending} className="self-start">
                    {updateOrganization.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="currency">
          <CurrencySection />
        </TabsContent>
        <TabsContent value="billing">
          <BillingSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
