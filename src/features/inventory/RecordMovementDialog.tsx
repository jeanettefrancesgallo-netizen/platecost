import { useState } from 'react'
import { toast } from 'sonner'
import { useIngredients } from '@/features/ingredients/useIngredients'
import { useInventoryRows } from './useInventoryRows'
import { useRecordMovement } from './useInventoryMutations'
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

const MOVEMENT_TYPES = [
  { value: 'received', label: 'Purchases (restock)' },
  { value: 'used', label: 'Used' },
  { value: 'wasted', label: 'Wastage / spoilage' },
  { value: 'adjustment', label: 'Adjustment (known correction amount)' },
  // Not a real change_type — a UI convenience for "I just counted the
  // shelf and it's X" that computes and logs the right signed adjustment
  // for you, instead of making you do that subtraction by hand.
  { value: 'physical_count', label: 'Physical count (ending inventory)' },
] as const

type MovementType = (typeof MOVEMENT_TYPES)[number]['value']

export function RecordMovementDialog({
  organizationId,
  locationId,
}: {
  organizationId: string
  locationId: string
}) {
  const [open, setOpen] = useState(false)
  const { data: ingredients = [] } = useIngredients(organizationId, { search: '', categoryId: 'all' })
  const { data: rows = [] } = useInventoryRows(organizationId, locationId)
  const recordMovement = useRecordMovement(organizationId, locationId)

  const [ingredientId, setIngredientId] = useState('')
  const [movementType, setMovementType] = useState<MovementType>('received')
  const [quantity, setQuantity] = useState('1')
  const [note, setNote] = useState('')

  const selectedIngredient = ingredients.find((i) => i.id === ingredientId)
  const currentQty = rows.find((r) => r.ingredientId === ingredientId)?.quantityOnHand ?? 0

  const onSubmit = async () => {
    const entered = Number(quantity)
    if (!selectedIngredient) {
      toast.error('Choose an ingredient')
      return
    }

    let changeType: 'received' | 'used' | 'wasted' | 'adjustment'
    let qty: number

    if (movementType === 'physical_count') {
      changeType = 'adjustment'
      qty = entered - currentQty
      if (qty === 0) {
        toast.success('Count matches current stock — nothing to record')
        setOpen(false)
        return
      }
    } else {
      changeType = movementType
      qty = entered
      // Adjustment is a signed correction (positive adds stock, negative
      // removes it) — every other type is a positive magnitude in one
      // fixed direction.
      const isValid = changeType === 'adjustment' ? qty !== 0 : qty > 0
      if (!isValid) {
        toast.error(
          changeType === 'adjustment'
            ? 'Enter a non-zero quantity'
            : 'Enter a quantity greater than 0',
        )
        return
      }
    }

    try {
      await recordMovement.mutateAsync({ ingredientId, changeType, quantity: qty, note })
      toast.success('Movement recorded')
      setIngredientId('')
      setQuantity('1')
      setNote('')
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not record movement')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Record movement</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record stock movement</DialogTitle>
          <DialogDescription>
            Available to any team member — logs are kept and stock levels update automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="movement-ingredient">Ingredient</Label>
            <Select value={ingredientId} onValueChange={(v) => v && setIngredientId(v)}>
              <SelectTrigger id="movement-ingredient">
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
            {selectedIngredient && (
              <p className="text-xs text-muted-foreground">
                Currently on hand: {currentQty} {selectedIngredient.base_unit}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="movement-type">Type</Label>
              <Select
                value={movementType}
                onValueChange={(v) => v && setMovementType(v as MovementType)}
              >
                <SelectTrigger id="movement-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOVEMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="movement-qty">
                {movementType === 'physical_count' ? 'Actual count' : 'Quantity'}{' '}
                {selectedIngredient ? `(${selectedIngredient.base_unit})` : ''}
              </Label>
              <Input
                id="movement-qty"
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>
          {movementType === 'physical_count' && (
            <p className="text-xs text-muted-foreground">
              Enter what you actually counted on the shelf — the difference from the current{' '}
              {currentQty} {selectedIngredient?.base_unit ?? ''} is computed and logged for you.
            </p>
          )}
          {movementType === 'adjustment' && (
            <p className="text-xs text-muted-foreground">
              A correction by a known amount — enter a positive number to add stock, or a negative
              number to remove it. If you just want to true up to a physical count, use "Physical
              count" instead.
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="movement-note">Note (optional)</Label>
            <Input id="movement-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSubmit} disabled={recordMovement.isPending}>
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
