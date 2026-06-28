import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useCurrentOrg } from '@/features/organizations/useCurrentOrg'
import { useOrganizationSettings } from '@/features/organizations/useOrganizationSettings'
import { useDashboardSummary } from '@/features/dashboard/useDashboardSummary'
import { useRecipeCostingReport } from '@/features/reports/useReportData'
import { classifyCostPercent, classifyMenuEngineering } from '@/lib/recipeCosting'
import { formatCurrency } from '@/lib/currency'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const HEALTH_COLORS = { good: '#16a34a', warning: '#d97706', bad: '#dc2626' } as const

const QUADRANT_LABELS = {
  star: 'Star',
  plowhorse: 'Plowhorse',
  puzzle: 'Puzzle',
  dog: 'Dog',
} as const

const QUADRANT_CLASSES = {
  star: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400',
  plowhorse: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-400',
  puzzle: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400',
  dog: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400',
} as const

export function DashboardPage() {
  const { currentOrg } = useCurrentOrg()
  const orgId = currentOrg?.organizationId
  const baseCurrency = currentOrg?.organization.base_currency ?? 'PHP'

  const { data: summary } = useDashboardSummary(orgId)
  const { data: settings } = useOrganizationSettings(orgId)
  const { data: recipes = [] } = useRecipeCostingReport(orgId)

  if (!currentOrg) return null

  const priced = recipes.filter((r) => r.totals.costPercent !== null)
  const avgCostPercent =
    priced.length > 0 ? priced.reduce((sum, r) => sum + r.totals.costPercent!, 0) / priced.length : null
  const avgGrossProfit =
    priced.length > 0
      ? priced.reduce((sum, r) => sum + r.totals.grossProfitPerPortion!, 0) / priced.length
      : 0

  const chartData = [...priced]
    .sort((a, b) => b.totals.costPercent! - a.totals.costPercent!)
    .slice(0, 10)
    .map((r) => {
      const targetMax = r.type === 'beverage' ? settings?.beverage_cost_target_max : settings?.food_cost_target_max
      return {
        name: r.name,
        costPercent: r.totals.costPercent!,
        health: classifyCostPercent(r.totals.costPercent, targetMax),
      }
    })

  const menuRows = priced
    .map((r) => {
      const quadrant = classifyMenuEngineering({
        grossProfitPerPortion: r.totals.grossProfitPerPortion,
        avgGrossProfitPerPortion: avgGrossProfit,
        costPercent: r.totals.costPercent,
        avgCostPercent: avgCostPercent ?? 0,
      })
      return { ...r, quadrant }
    })
    .sort((a, b) => b.totals.grossProfitPerPortion! - a.totals.grossProfitPerPortion!)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{currentOrg.organization.name}</h1>
        <p className="text-muted-foreground">
          {currentOrg.organization.plan.toUpperCase()} plan · base currency{' '}
          {currentOrg.organization.base_currency}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Recipes" value={String(recipes.length)} />
        <SummaryCard
          title="Avg. cost %"
          value={avgCostPercent !== null ? `${avgCostPercent.toFixed(1)}%` : '—'}
        />
        <SummaryCard title="Ingredients" value={String(summary?.ingredientCount ?? 0)} />
        <SummaryCard title="Low stock items" value={String(summary?.lowStockCount ?? 0)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost % by recipe</CardTitle>
          <CardDescription>
            Highest cost % first, color-coded against each recipe's target band (top 10 shown)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No priced recipes yet — set a selling price on a recipe to see it here.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-30} textAnchor="end" fontSize={12} interval={0} />
                <YAxis fontSize={12} unit="%" />
                <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                <Bar dataKey="costPercent" radius={4} isAnimationActive={false}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={HEALTH_COLORS[entry.health]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Menu engineering</CardTitle>
          <CardDescription>
            Margin per portion vs. average, and cost % vs. average — a cost/margin health check
            standing in for sales-mix popularity, since this app doesn't track sales yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {menuRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No priced recipes yet — set a selling price on a recipe to see it here.
            </p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Cost %</th>
                    <th className="px-3 py-2 text-left">Margin/portion</th>
                    <th className="px-3 py-2 text-left">Quadrant</th>
                  </tr>
                </thead>
                <tbody>
                  {menuRows.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.type}</td>
                      <td className="px-3 py-2">{r.totals.costPercent!.toFixed(1)}%</td>
                      <td className="px-3 py-2">
                        {formatCurrency(r.totals.grossProfitPerPortion!, baseCurrency)}
                      </td>
                      <td className="px-3 py-2">
                        {r.quadrant && (
                          <span
                            className={`rounded-md px-2 py-0.5 text-sm font-medium ${QUADRANT_CLASSES[r.quadrant]}`}
                          >
                            {QUADRANT_LABELS[r.quadrant]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent />
    </Card>
  )
}
