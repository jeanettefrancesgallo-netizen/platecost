import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentOrg } from '@/features/organizations/useCurrentOrg'
import { useOrganizationSettings } from '@/features/organizations/useOrganizationSettings'
import { canManageData } from '@/features/organizations/permissions'
import { useRecipes, type RecipeFilters } from './useRecipes'
import { summarizeRecipe } from './recipeSummary'
import { CreateRecipeDialog } from './CreateRecipeDialog'
import { CostHealthBadge } from './CostHealthBadge'
import { formatCurrency } from '@/lib/currency'
import { Input } from '@/components/ui/input'

export function RecipeListPage({
  title,
  type,
  routePrefix,
}: {
  title: string
  type: RecipeFilters['type']
  routePrefix: string
}) {
  const { currentOrg } = useCurrentOrg()
  const orgId = currentOrg?.organizationId
  const baseCurrency = currentOrg?.organization.base_currency ?? 'PHP'
  const canManage = canManageData(currentOrg?.role)

  const [search, setSearch] = useState('')
  const { data: recipes = [], isLoading } = useRecipes(orgId, { search, type })
  const { data: settings } = useOrganizationSettings(orgId)

  if (!currentOrg) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-muted-foreground">{recipes.length} recipe(s)</p>
        </div>
        {canManage && <CreateRecipeDialog organizationId={orgId!} type={type} />}
      </div>

      <Input
        placeholder="Search by name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Portions</th>
              <th className="px-3 py-2 text-left">Cost / portion</th>
              <th className="px-3 py-2 text-left">Selling price</th>
              <th className="px-3 py-2 text-left">Cost %</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && recipes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                  None yet.
                </td>
              </tr>
            )}
            {recipes.map((recipe) => {
              const totals = summarizeRecipe(recipe)
              const targetMax =
                recipe.type === 'beverage'
                  ? settings?.beverage_cost_target_max
                  : settings?.food_cost_target_max
              return (
                <tr key={recipe.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <Link
                      to={`${routePrefix}/${recipe.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {recipe.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{recipe.portions}</td>
                  <td className="px-3 py-2">{formatCurrency(totals.costPerPortion, baseCurrency)}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {recipe.selling_price > 0
                      ? formatCurrency(recipe.selling_price, baseCurrency)
                      : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <CostHealthBadge costPercent={totals.costPercent} targetMax={targetMax} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
