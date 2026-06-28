import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useCategories } from '@/features/categories/useCategories'
import { useCreateSupplier, useSuppliers } from '@/features/suppliers/useSuppliers'
import { useExchangeRates } from '@/features/organizations/useExchangeRates'
import { useCreateIngredient, useUpdateIngredient } from './useIngredientMutations'
import { convertToBaseUnit, PURCHASE_UNITS_BY_BASE, type BaseUnit } from '@/lib/units'
import { costPerBaseUnit, normalizeToBaseCurrency } from '@/lib/costing'
import { formatCurrency, CURRENCIES } from '@/lib/currency'
import type { Database } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

type Ingredient = Database['public']['Tables']['ingredients']['Row']

const ingredientSchema = z.object({
  name: z.string().min(1, 'Enter a name'),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  baseUnit: z.enum(['g', 'ml', 'each']),
  purchaseUnit: z.string().min(1),
  purchaseSize: z.number().positive('Must be greater than 0'),
  purchaseUnitCost: z.number().min(0, 'Cannot be negative'),
  purchaseCurrency: z.string().min(1),
  exchangeRateToBase: z.number().positive('Must be greater than 0'),
  yieldPercent: z.number().gt(0).max(100),
})

type IngredientForm = z.infer<typeof ingredientSchema>

function defaultValuesFromIngredient(
  ingredient: Ingredient | undefined,
  orgBaseCurrency: string,
): IngredientForm {
  if (!ingredient) {
    return {
      name: '',
      categoryId: undefined,
      supplierId: undefined,
      baseUnit: 'g',
      purchaseUnit: 'kg',
      purchaseSize: 1,
      purchaseUnitCost: 0,
      purchaseCurrency: orgBaseCurrency,
      exchangeRateToBase: 1,
      yieldPercent: 100,
    }
  }

  const baseUnit = ingredient.base_unit as BaseUnit
  // purchase_unit_quantity is stored already converted into base units (see
  // 20260627223008_ingredients.sql) — back-convert to show the original
  // purchase size the user entered (e.g. "1" for a 1kg bag, not "1000").
  const oneUnitInBase = convertToBaseUnit(1, ingredient.purchase_unit, baseUnit)

  return {
    name: ingredient.name,
    categoryId: ingredient.category_id ?? undefined,
    supplierId: ingredient.supplier_id ?? undefined,
    baseUnit,
    purchaseUnit: ingredient.purchase_unit,
    purchaseSize: ingredient.purchase_unit_quantity / oneUnitInBase,
    purchaseUnitCost: ingredient.purchase_unit_cost,
    purchaseCurrency: ingredient.purchase_currency,
    exchangeRateToBase: ingredient.exchange_rate_to_base,
    yieldPercent: ingredient.yield_percent,
  }
}

interface Props {
  organizationId: string
  orgBaseCurrency: string
  ingredient?: Ingredient
  trigger: React.ReactNode
}

export function IngredientFormDialog({
  organizationId,
  orgBaseCurrency,
  ingredient,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false)
  const { data: categories = [] } = useCategories(organizationId)
  const { data: suppliers = [] } = useSuppliers(organizationId)
  const { data: orgExchangeRates = [] } = useExchangeRates(organizationId)
  const createSupplier = useCreateSupplier(organizationId)
  const createIngredient = useCreateIngredient(organizationId)
  const updateIngredient = useUpdateIngredient(organizationId)
  const [newSupplierName, setNewSupplierName] = useState('')

  const isEditing = !!ingredient

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<IngredientForm>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: defaultValuesFromIngredient(ingredient, orgBaseCurrency),
  })

  useEffect(() => {
    if (open) {
      reset(defaultValuesFromIngredient(ingredient, orgBaseCurrency))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open])

  const baseUnit = watch('baseUnit')
  const purchaseUnit = watch('purchaseUnit')
  const purchaseSize = watch('purchaseSize')
  const purchaseUnitCost = watch('purchaseUnitCost')
  const yieldPercent = watch('yieldPercent')
  const exchangeRateToBase = watch('exchangeRateToBase')

  let preview: string | null
  try {
    const purchaseUnitQuantity = convertToBaseUnit(Number(purchaseSize) || 0, purchaseUnit, baseUnit)
    const perBase = costPerBaseUnit(Number(purchaseUnitCost) || 0, purchaseUnitQuantity, Number(yieldPercent) || 100)
    const inBaseCurrency = normalizeToBaseCurrency(perBase, Number(exchangeRateToBase) || 1)
    preview = `${formatCurrency(inBaseCurrency, orgBaseCurrency)} per ${baseUnit}`
  } catch {
    preview = null
  }

  const onSubmit = async (values: IngredientForm) => {
    try {
      const purchaseUnitQuantity = convertToBaseUnit(values.purchaseSize, values.purchaseUnit, values.baseUnit)
      const payload = {
        name: values.name,
        category_id: values.categoryId ?? null,
        supplier_id: values.supplierId ?? null,
        base_unit: values.baseUnit,
        purchase_unit: values.purchaseUnit,
        purchase_unit_quantity: purchaseUnitQuantity,
        purchase_unit_cost: values.purchaseUnitCost,
        purchase_currency: values.purchaseCurrency,
        exchange_rate_to_base: values.exchangeRateToBase,
        yield_percent: values.yieldPercent,
      }

      if (isEditing) {
        await updateIngredient.mutateAsync({ id: ingredient.id, ...payload })
        toast.success('Ingredient updated')
      } else {
        await createIngredient.mutateAsync(payload)
        toast.success('Ingredient added')
      }
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save ingredient')
    }
  }

  const onAddSupplier = async () => {
    if (!newSupplierName.trim()) return
    try {
      const supplier = await createSupplier.mutateAsync(newSupplierName.trim())
      setValue('supplierId', supplier.id)
      setNewSupplierName('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add supplier')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit ingredient' : 'Add ingredient'}</DialogTitle>
          <DialogDescription>
            Cost per base unit is computed automatically from purchase size, cost, and yield.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ing-name">Name</Label>
            <Input id="ing-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ing-category">Category</Label>
              <Select
                value={watch('categoryId') ?? ''}
                onValueChange={(v) => setValue('categoryId', v || undefined)}
              >
                <SelectTrigger id="ing-category">
                  <SelectValue placeholder="Uncategorized">
                    {(id: string | null) => categories.find((c) => c.id === id)?.name ?? 'Uncategorized'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ing-supplier">Supplier</Label>
              <Select
                value={watch('supplierId') ?? ''}
                onValueChange={(v) => setValue('supplierId', v || undefined)}
              >
                <SelectTrigger id="ing-supplier">
                  <SelectValue placeholder="None">
                    {(id: string | null) => suppliers.find((s) => s.id === id)?.name ?? 'None'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1">
                <Input
                  placeholder="New supplier"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="h-7 text-xs"
                />
                <Button type="button" size="sm" variant="outline" onClick={onAddSupplier}>
                  Add
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Base unit</Label>
              <Select
                value={baseUnit}
                onValueChange={(v) => {
                  if (!v) return
                  setValue('baseUnit', v as BaseUnit)
                  setValue('purchaseUnit', PURCHASE_UNITS_BY_BASE[v as BaseUnit][0])
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="g">g (mass)</SelectItem>
                  <SelectItem value="ml">ml (volume)</SelectItem>
                  <SelectItem value="each">each</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Purchase unit</Label>
              <Select value={purchaseUnit} onValueChange={(v) => v && setValue('purchaseUnit', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURCHASE_UNITS_BY_BASE[baseUnit].map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ing-size">Purchase size</Label>
              <Input
                id="ing-size"
                type="number"
                step="any"
                {...register('purchaseSize', { valueAsNumber: true })}
              />
              {errors.purchaseSize && (
                <p className="text-sm text-destructive">{errors.purchaseSize.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ing-cost">Purchase cost</Label>
              <Input
                id="ing-cost"
                type="number"
                step="any"
                {...register('purchaseUnitCost', { valueAsNumber: true })}
              />
              {errors.purchaseUnitCost && (
                <p className="text-sm text-destructive">{errors.purchaseUnitCost.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Currency</Label>
              <Select
                value={watch('purchaseCurrency')}
                onValueChange={(v) => {
                  if (!v) return
                  setValue('purchaseCurrency', v)
                  // Default from the org's saved rate for this currency when
                  // creating a new ingredient — editing an existing one
                  // leaves its own rate alone, since that may have been
                  // deliberately overridden.
                  if (!isEditing) {
                    const orgRate = orgExchangeRates.find((r) => r.currency_code === v)
                    setValue('exchangeRateToBase', orgRate?.rate_to_base ?? 1)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ing-yield">Yield %</Label>
              <Input
                id="ing-yield"
                type="number"
                step="any"
                {...register('yieldPercent', { valueAsNumber: true })}
              />
              {errors.yieldPercent && (
                <p className="text-sm text-destructive">{errors.yieldPercent.message}</p>
              )}
            </div>
          </div>

          {watch('purchaseCurrency') !== orgBaseCurrency && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ing-rate">
                Exchange rate to {orgBaseCurrency} (1 {watch('purchaseCurrency')} = ? {orgBaseCurrency})
              </Label>
              <Input
                id="ing-rate"
                type="number"
                step="any"
                {...register('exchangeRateToBase', { valueAsNumber: true })}
              />
            </div>
          )}

          <div className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-sm">
            {preview ? (
              <span>
                Cost: <span className="font-medium">{preview}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Enter purchase details to preview cost.</span>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createIngredient.isPending || updateIngredient.isPending}>
              {isEditing ? 'Save changes' : 'Add ingredient'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
