import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useCurrentOrg } from '@/features/organizations/useCurrentOrg'
import { useOrganizationSettings } from '@/features/organizations/useOrganizationSettings'
import { canManageData } from '@/features/organizations/permissions'
import { useRecipe } from '@/features/recipes/useRecipe'
import { useDeleteRecipe, useUpdateRecipe } from '@/features/recipes/useRecipeMutations'
import {
  useAddRecipeItem,
  useDeleteRecipeItem,
  useUpdateRecipeItem,
} from '@/features/recipes/useRecipeItemMutations'
import { summarizeRecipe } from '@/features/recipes/recipeSummary'
import { CostHealthBadge } from '@/features/recipes/CostHealthBadge'
import { useIngredients } from '@/features/ingredients/useIngredients'
import { pourCosting, recipeItemCost } from '@/lib/recipeCosting'
import { PURCHASE_UNITS_BY_BASE, type BaseUnit } from '@/lib/units'
import { formatCurrency } from '@/lib/currency'
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

const detailsSchema = z.object({
  name: z.string().min(1, 'Enter a name'),
  portions: z.number().int().positive(),
  sellingPrice: z.number().min(0),
  laborCost: z.number().min(0),
  packagingCost: z.number().min(0),
  bottleSizeMl: z.number().positive().optional(),
  bottleCost: z.number().min(0).optional(),
  pourSizeMl: z.number().positive().optional(),
})

type DetailsForm = z.infer<typeof detailsSchema>

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentOrg } = useCurrentOrg()
  const orgId = currentOrg?.organizationId
  const baseCurrency = currentOrg?.organization.base_currency ?? 'PHP'
  const canManage = canManageData(currentOrg?.role)

  const { data: recipe, isLoading } = useRecipe(id)
  const { data: settings } = useOrganizationSettings(orgId)
  const { data: ingredients = [] } = useIngredients(orgId, { search: '', categoryId: 'all' })
  const updateRecipe = useUpdateRecipe(orgId ?? '')
  const deleteRecipe = useDeleteRecipe(orgId ?? '')
  const addItem = useAddRecipeItem(id ?? '')
  const updateItem = useUpdateRecipeItem(id ?? '')
  const deleteItem = useDeleteRecipeItem(id ?? '')

  const [newIngredientId, setNewIngredientId] = useState('')
  const [newQuantity, setNewQuantity] = useState('1')
  const [newUnit, setNewUnit] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DetailsForm>({ resolver: zodResolver(detailsSchema) })

  useEffect(() => {
    if (recipe) {
      reset({
        name: recipe.name,
        portions: recipe.portions,
        sellingPrice: recipe.selling_price,
        laborCost: recipe.labor_cost,
        packagingCost: recipe.packaging_cost,
        bottleSizeMl: recipe.bottle_size_ml ?? undefined,
        bottleCost: recipe.bottle_cost ?? undefined,
        pourSizeMl: recipe.pour_size_ml ?? undefined,
      })
    }
  }, [recipe, reset])

  if (isLoading || !recipe || !currentOrg) {
    return <p className="text-muted-foreground">Loading…</p>
  }

  const totals = summarizeRecipe(recipe)
  const targetMax =
    recipe.type === 'beverage' ? settings?.beverage_cost_target_max : settings?.food_cost_target_max

  const onSaveDetails = async (values: DetailsForm) => {
    try {
      await updateRecipe.mutateAsync({
        id: recipe.id,
        name: values.name,
        portions: values.portions,
        selling_price: values.sellingPrice,
        labor_cost: values.laborCost,
        packaging_cost: values.packagingCost,
        ...(recipe.type === 'beverage'
          ? {
              bottle_size_ml: values.bottleSizeMl ?? null,
              bottle_cost: values.bottleCost ?? null,
              pour_size_ml: values.pourSizeMl ?? null,
            }
          : {}),
      })
      toast.success('Recipe saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save recipe')
    }
  }

  const pour =
    recipe.bottle_size_ml && recipe.bottle_cost !== null && recipe.pour_size_ml
      ? pourCosting({
          bottleSizeMl: recipe.bottle_size_ml,
          bottleCost: recipe.bottle_cost,
          pourSizeMl: recipe.pour_size_ml,
        })
      : null

  const selectedIngredient = ingredients.find((i) => i.id === newIngredientId)
  const availableUnits = selectedIngredient
    ? PURCHASE_UNITS_BY_BASE[selectedIngredient.base_unit as BaseUnit]
    : []

  const onAddItem = async () => {
    if (!selectedIngredient || !newUnit) return
    const quantity = Number(newQuantity)
    if (!(quantity > 0)) {
      toast.error('Quantity must be greater than 0')
      return
    }
    try {
      await addItem.mutateAsync({ ingredientId: selectedIngredient.id, quantity, unit: newUnit })
      setNewIngredientId('')
      setNewQuantity('1')
      setNewUnit('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add ingredient')
    }
  }

  const onDeleteRecipe = async () => {
    try {
      await deleteRecipe.mutateAsync(recipe.id)
      toast.success('Recipe deleted')
      navigate('/recipes')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete recipe')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit(onSaveDetails)} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recipe-name">Name</Label>
            <Input id="recipe-name" disabled={!canManage} {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recipe-portions">Portions</Label>
            <Input
              id="recipe-portions"
              type="number"
              disabled={!canManage}
              className="w-24"
              {...register('portions', { valueAsNumber: true })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recipe-price">Selling price</Label>
            <Input
              id="recipe-price"
              type="number"
              step="any"
              disabled={!canManage}
              className="w-32"
              {...register('sellingPrice', { valueAsNumber: true })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recipe-labor">Labor cost</Label>
            <Input
              id="recipe-labor"
              type="number"
              step="any"
              disabled={!canManage}
              className="w-32"
              {...register('laborCost', { valueAsNumber: true })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recipe-packaging">Packaging cost</Label>
            <Input
              id="recipe-packaging"
              type="number"
              step="any"
              disabled={!canManage}
              className="w-32"
              {...register('packagingCost', { valueAsNumber: true })}
            />
          </div>
          {canManage && (
            <Button type="submit" disabled={updateRecipe.isPending}>
              Save
            </Button>
          )}
        </div>

        {recipe.type === 'beverage' && (
          <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bottle-size">Bottle size (ml)</Label>
              <Input
                id="bottle-size"
                type="number"
                step="any"
                disabled={!canManage}
                className="w-32"
                {...register('bottleSizeMl', { valueAsNumber: true })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bottle-cost">Bottle cost</Label>
              <Input
                id="bottle-cost"
                type="number"
                step="any"
                disabled={!canManage}
                className="w-32"
                {...register('bottleCost', { valueAsNumber: true })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pour-size">Pour size (ml)</Label>
              <Input
                id="pour-size"
                type="number"
                step="any"
                disabled={!canManage}
                className="w-32"
                {...register('pourSizeMl', { valueAsNumber: true })}
              />
            </div>
            {canManage && (
              <Button type="submit" variant="outline" disabled={updateRecipe.isPending}>
                Save pour details
              </Button>
            )}
          </div>
        )}
      </form>

      {recipe.type === 'beverage' && pour && (
        <Card className={pour.overPourRisk ? 'border-amber-500/50' : undefined}>
          <CardHeader>
            <CardTitle className="text-base">Pour costing</CardTitle>
            <CardDescription>
              {pour.poursPerBottle.toFixed(1)} pours per bottle ·{' '}
              {formatCurrency(pour.costPerPour, baseCurrency)} per pour
              {pour.overPourRisk && (
                <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">
                  ⚠ Over-pour risk — fewer than 15 pours per bottle at this pour size
                </span>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Ingredients cost</CardDescription>
            <CardTitle className="text-xl">
              {formatCurrency(totals.ingredientsCost, baseCurrency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total cost</CardDescription>
            <CardTitle className="text-xl">{formatCurrency(totals.totalCost, baseCurrency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Cost / portion</CardDescription>
            <CardTitle className="text-xl">
              {formatCurrency(totals.costPerPortion, baseCurrency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Cost %</CardDescription>
            <CardTitle className="text-xl">
              <CostHealthBadge costPercent={totals.costPercent} targetMax={targetMax} />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ingredients</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {recipe.recipe_items.map((item) => {
            const cost = item.ingredients
              ? recipeItemCost({
                  quantity: item.quantity,
                  unit: item.unit,
                  ingredientBaseUnit: item.ingredients.base_unit as BaseUnit,
                  ingredientCostPerBaseUnit: item.ingredients.cost_per_base_unit ?? 0,
                  ingredientExchangeRateToBase: item.ingredients.exchange_rate_to_base,
                })
              : 0
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2"
              >
                <span className="flex-1 font-medium">{item.ingredients?.name ?? 'Unknown'}</span>
                {canManage ? (
                  <>
                    <Input
                      type="number"
                      step="any"
                      defaultValue={item.quantity}
                      className="w-24"
                      onBlur={(e) => {
                        const quantity = Number(e.target.value)
                        if (quantity > 0 && quantity !== item.quantity) {
                          updateItem.mutate({ id: item.id, quantity, unit: item.unit })
                        }
                      }}
                    />
                    <Select
                      value={item.unit}
                      onValueChange={(unit) =>
                        unit && updateItem.mutate({ id: item.id, quantity: item.quantity, unit })
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PURCHASE_UNITS_BY_BASE[
                          (item.ingredients?.base_unit as BaseUnit) ?? 'g'
                        ].map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    {item.quantity} {item.unit}
                  </span>
                )}
                <span className="w-24 text-right">{formatCurrency(cost, baseCurrency)}</span>
                {canManage && (
                  <Button size="sm" variant="ghost" onClick={() => deleteItem.mutate(item.id)}>
                    Remove
                  </Button>
                )}
              </div>
            )
          })}

          {canManage && (
            <div className="flex items-end gap-2 border-t border-border pt-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="new-item-ingredient">Add ingredient</Label>
                <Select
                  value={newIngredientId}
                  onValueChange={(v) => {
                    if (!v) return
                    setNewIngredientId(v)
                    const ing = ingredients.find((i) => i.id === v)
                    if (ing) setNewUnit(ing.base_unit)
                  }}
                >
                  <SelectTrigger id="new-item-ingredient">
                    <SelectValue placeholder="Choose an ingredient">
                      {(id: string | null) => ingredients.find((i) => i.id === id)?.name ?? 'Choose an ingredient'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ingredients.map((ing) => (
                      <SelectItem key={ing.id} value={ing.id}>
                        {ing.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-24 flex-col gap-1.5">
                <Label htmlFor="new-item-qty">Quantity</Label>
                <Input
                  id="new-item-qty"
                  type="number"
                  step="any"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                />
              </div>
              <div className="flex w-24 flex-col gap-1.5">
                <Label htmlFor="new-item-unit">Unit</Label>
                <Select value={newUnit} onValueChange={(v) => v && setNewUnit(v)}>
                  <SelectTrigger id="new-item-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUnits.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={onAddItem} disabled={!selectedIngredient || addItem.isPending}>
                Add
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
            <CardDescription>Permanently delete this recipe.</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="destructive" />}>
                Delete recipe
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {recipe.name}?</AlertDialogTitle>
                  <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDeleteRecipe}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
