import { useState } from 'react'
import { toast } from 'sonner'
import { useCurrentOrg } from '@/features/organizations/useCurrentOrg'
import { canManageData } from '@/features/organizations/permissions'
import { useCategories } from '@/features/categories/useCategories'
import { CategoryManagerDialog } from '@/features/categories/CategoryManagerDialog'
import { useIngredients } from '@/features/ingredients/useIngredients'
import { useDeleteIngredient } from '@/features/ingredients/useIngredientMutations'
import { IngredientFormDialog } from '@/features/ingredients/IngredientFormDialog'
import { normalizeToBaseCurrency } from '@/lib/costing'
import { formatCurrency } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function IngredientsPage() {
  const { currentOrg } = useCurrentOrg()
  const orgId = currentOrg?.organizationId
  const baseCurrency = currentOrg?.organization.base_currency ?? 'PHP'
  const canManage = canManageData(currentOrg?.role)

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')

  const { data: categories = [] } = useCategories(orgId)
  const { data: ingredients = [], isLoading } = useIngredients(orgId, { search, categoryId })
  const deleteIngredient = useDeleteIngredient(orgId ?? '')

  if (!currentOrg) return null

  const onDelete = async (id: string, name: string) => {
    try {
      await deleteIngredient.mutateAsync(id)
      toast.success(`Deleted "${name}"`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete ingredient')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ingredients</h1>
          <p className="text-muted-foreground">{ingredients.length} ingredient(s)</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <CategoryManagerDialog organizationId={orgId!} />
            <IngredientFormDialog
              organizationId={orgId!}
              orgBaseCurrency={baseCurrency}
              trigger={<Button>Add ingredient</Button>}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Supplier</th>
              <th className="px-3 py-2 text-left">Purchase</th>
              <th className="px-3 py-2 text-left">Cost / base unit</th>
              {canManage && <th className="px-3 py-2 text-left">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && ingredients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                  No ingredients yet.
                </td>
              </tr>
            )}
            {ingredients.map((ingredient) => {
              const costInBase =
                ingredient.cost_per_base_unit !== null
                  ? normalizeToBaseCurrency(
                      ingredient.cost_per_base_unit,
                      ingredient.exchange_rate_to_base,
                    )
                  : null
              return (
                <tr key={ingredient.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{ingredient.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {ingredient.ingredient_categories?.name ?? 'Uncategorized'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {ingredient.suppliers?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {ingredient.purchase_unit_cost} {ingredient.purchase_currency} /{' '}
                    {ingredient.purchase_unit}
                  </td>
                  <td className="px-3 py-2">
                    {costInBase !== null
                      ? `${formatCurrency(costInBase, baseCurrency)} / ${ingredient.base_unit}`
                      : '—'}
                  </td>
                  {canManage && (
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <IngredientFormDialog
                          organizationId={orgId!}
                          orgBaseCurrency={baseCurrency}
                          ingredient={ingredient}
                          trigger={
                            <Button size="sm" variant="ghost">
                              Edit
                            </Button>
                          }
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(ingredient.id, ingredient.name)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
