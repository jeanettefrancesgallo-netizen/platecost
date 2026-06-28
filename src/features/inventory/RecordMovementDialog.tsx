import { useState } from 'react'
import { toast } from 'sonner'
import { useIngredients } from '@/features/ingredients/useIngredients'
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

const CHANGE_TYPES = [
  { value: 'received', label: 'Received' },
  { value: 'used', label: 'Used' },
  { value: 'wasted', label: 'Wasted' },
  { value: 'adjustment', label: 'Adjustment' },
] as const

export function RecordMovementDialog({
  organizationId,
  locationId,
}: {
  organizationId: string
  locationId: string
}) {
  const [open, setOpen] = useState(false)
  const { data: ingredients = [] } = useIngredients(organizationId, { search: '', categoryId: 'all' })
  const recordMovement = useRecordMovement(organizationId, locationId)

  const [ingredientId, setIngredientId] = useState('')
  const [changeType, setChangeType] = useState<(typeof CHANGE_TYPES)[number]['value']>('received')
  const [quantity, setQuantity] = useState('1')
  const [note, setNote] = useState('')

  const selectedIngredient = ingredients.find((i) => i.id === ingredientId)

  const onSubmit = async () => {
    const qty = Number(quantity)
    // Adjustment is a signed correction (positive adds stock, negative
    // removes it, e.g. after a physical count) — every other type is
    // always a positive magnitude in one fixed direction.
    const isValid = changeType === 'adjustment' ? qty !== 0 : qty > 0
    if (!selectedIngredient || !isValid) {
      toast.error(
        changeType === 'adjustment'
          ? 'Choose an ingredient and a non-zero quantity'
          : 'Choose an ingredient and a quantity greater than 0',
      )
      return
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="movement-type">Type</Label>
              <Select value={changeType} onValueChange={(v) => v && setChangeType(v as typeof changeType)}>
                <SelectTrigger id="movement-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANGE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="movement-qty">
                Quantity {selectedIngredient ? `(${selectedIngredient.base_unit})` : ''}
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
          {changeType === 'adjustment' && (
            <p className="text-xs text-muted-foreground">
              Adjustment is a correction, e.g. after a physical count — enter a positive number to
              add stock, or a negative number to remove it.
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
