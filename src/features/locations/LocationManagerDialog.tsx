import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLocations } from './useLocations'
import { useCreateLocation, useDeleteLocation, useRenameLocation } from './useLocationMutations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function LocationManagerDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false)
  const { data: locations = [] } = useLocations(organizationId)
  const createLocation = useCreateLocation(organizationId)
  const renameLocation = useRenameLocation(organizationId)
  const deleteLocation = useDeleteLocation(organizationId)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const onAdd = async () => {
    if (!newName.trim()) return
    try {
      await createLocation.mutateAsync(newName.trim())
      setNewName('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create location')
    }
  }

  const onDelete = async (id: string, name: string) => {
    try {
      await deleteLocation.mutateAsync(id)
      toast.success(`Deleted "${name}"`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete location')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Manage locations</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Locations</DialogTitle>
          <DialogDescription>
            Add, rename, or delete locations. Plan limits apply for new locations.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {locations.map((location) => (
            <div
              key={location.id}
              className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
            >
              {editingId === location.id ? (
                <Input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      renameLocation.mutate({ id: location.id, name: editingName })
                      setEditingId(null)
                    }
                  }}
                  onBlur={() => {
                    if (editingName.trim() && editingName !== location.name) {
                      renameLocation.mutate({ id: location.id, name: editingName.trim() })
                    }
                    setEditingId(null)
                  }}
                  className="h-7 flex-1"
                />
              ) : (
                <span className="flex-1 text-sm">{location.name}</span>
              )}
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setEditingId(location.id)
                  setEditingName(location.name)
                }}
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(location.id, location.name)}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="New location name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          />
          <Button onClick={onAdd} disabled={createLocation.isPending}>
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
