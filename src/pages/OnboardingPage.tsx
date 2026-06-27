import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useCreateOrganization } from '@/features/organizations/useCreateOrganization'
import { slugify } from '@/lib/slug'
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

const onboardingSchema = z.object({
  businessName: z.string().min(1, 'Enter your business name'),
  baseCurrency: z.string().min(1),
})

type OnboardingForm = z.infer<typeof onboardingSchema>

export function OnboardingPage() {
  const navigate = useNavigate()
  const createOrganization = useCreateOrganization()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { baseCurrency: 'PHP' },
  })

  const baseCurrency = watch('baseCurrency')

  const onSubmit = async (values: OnboardingForm) => {
    try {
      await createOrganization.mutateAsync({
        name: values.businessName,
        slug: slugify(values.businessName),
        baseCurrency: values.baseCurrency,
      })
      navigate('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create organization')
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Set up your business</CardTitle>
          <CardDescription>
            Create your organization to start costing ingredients and recipes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                placeholder="e.g. Sunrise Coffee Co."
                {...register('businessName')}
              />
              {errors.businessName && (
                <p className="text-sm text-destructive">{errors.businessName.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="baseCurrency">Base currency</Label>
              <Select
                value={baseCurrency}
                onValueChange={(value) => value && setValue('baseCurrency', value)}
              >
                <SelectTrigger id="baseCurrency">
                  <SelectValue placeholder="Select currency" />
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
            <Button type="submit" disabled={createOrganization.isPending} className="mt-2">
              {createOrganization.isPending ? 'Creating…' : 'Create organization'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
