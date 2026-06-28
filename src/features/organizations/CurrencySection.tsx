import { useState } from 'react'
import { toast } from 'sonner'
import { useCurrentOrg } from './useCurrentOrg'
import { canManageTeamAndBilling } from './permissions'
import { useExchangeRates, useSetExchangeRate } from './useExchangeRates'
import { CURRENCIES } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function CurrencySection() {
  const { currentOrg } = useCurrentOrg()
  const orgId = currentOrg?.organizationId
  const baseCurrency = currentOrg?.organization.base_currency ?? 'PHP'
  const canManage = canManageTeamAndBilling(currentOrg?.role)

  const { data: rates = [] } = useExchangeRates(orgId)
  const setRate = useSetExchangeRate(orgId ?? '')
  const [editing, setEditing] = useState<Record<string, string>>({})

  if (!currentOrg) return null

  const otherCurrencies = CURRENCIES.filter((c) => c.code !== baseCurrency)

  const onSave = async (currencyCode: string) => {
    const raw = editing[currencyCode]
    const value = Number(raw)
    if (!raw || !(value > 0)) {
      toast.error('Enter a rate greater than 0')
      return
    }
    try {
      await setRate.mutateAsync({ currencyCode, rateToBase: value })
      toast.success(`Saved 1 ${currencyCode} = ${value} ${baseCurrency}`)
      setEditing((prev) => ({ ...prev, [currencyCode]: '' }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save exchange rate')
    }
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="text-base">Exchange rates</CardTitle>
        <CardDescription>
          Set a rate once per currency to convert ingredient purchase costs into{' '}
          {baseCurrency}. New ingredients in that currency default to this rate; it can still be
          overridden per ingredient.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {otherCurrencies.map((currency) => {
          const saved = rates.find((r) => r.currency_code === currency.code)
          const value = editing[currency.code] ?? saved?.rate_to_base?.toString() ?? ''
          return (
            <div key={currency.code} className="flex items-center gap-2">
              <span className="w-32 text-sm">
                1 {currency.code} = <span className="text-muted-foreground">{currency.label}</span>
              </span>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="Rate"
                value={value}
                disabled={!canManage}
                className="w-28"
                onChange={(e) => setEditing((prev) => ({ ...prev, [currency.code]: e.target.value }))}
              />
              <span className="text-sm text-muted-foreground">{baseCurrency}</span>
              {canManage && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={setRate.isPending}
                  onClick={() => onSave(currency.code)}
                >
                  Save
                </Button>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
