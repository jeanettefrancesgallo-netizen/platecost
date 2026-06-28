import { useState } from 'react'
import { toast } from 'sonner'
import {
  useAdminPaymentMethods,
  useCreatePaymentMethod,
  useDeletePaymentMethod,
  useTogglePaymentMethod,
} from './usePaymentMethodsAdmin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

function parseDetails(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const [key, ...rest] = line.split(':')
    if (key && rest.length) {
      result[key.trim().toLowerCase().replace(/\s+/g, '_')] = rest.join(':').trim()
    }
  }
  return result
}

export function PaymentMethodsManagerDialog() {
  const [open, setOpen] = useState(false)
  const { data: methods = [] } = useAdminPaymentMethods()
  const createMethod = useCreatePaymentMethod()
  const toggleMethod = useTogglePaymentMethod()
  const deleteMethod = useDeletePaymentMethod()

  const [method, setMethod] = useState('gcash')
  const [label, setLabel] = useState('')
  const [detailsText, setDetailsText] = useState('')

  const onCreate = async () => {
    if (!label.trim()) return
    try {
      await createMethod.mutateAsync({ method, label: label.trim(), details: parseDetails(detailsText) })
      setLabel('')
      setDetailsText('')
      toast.success('Payment method added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add payment method')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Manage payment methods</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Platform payment methods</DialogTitle>
          <DialogDescription>
            Shown to tenants when they request a plan upgrade.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {methods.map((m) => (
            <div key={m.id} className="rounded-md border border-border p-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {m.label} <Badge variant="secondary">{m.method}</Badge>
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleMethod.mutate({ id: m.id, isActive: !m.is_active })}
                  >
                    {m.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMethod.mutate(m.id)}>
                    Delete
                  </Button>
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {Object.entries(m.details as Record<string, string>)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' · ')}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={method} onValueChange={(v) => v && setMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gcash">GCash</SelectItem>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="method-label">Label</Label>
              <Input
                id="method-label"
                placeholder="e.g. GCash"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="method-details">Details (one "key: value" per line)</Label>
            <Textarea
              id="method-details"
              placeholder={'account_name: Juan Dela Cruz\nnumber: 09171234567'}
              value={detailsText}
              onChange={(e) => setDetailsText(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={onCreate} disabled={createMethod.isPending} className="self-start">
            Add payment method
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
