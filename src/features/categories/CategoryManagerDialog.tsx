import { useState } from 'react'
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCategories } from './useCategories'
import {
  useCreateCategory,
  useDeleteCategory,
  useRenameCategory,
  useReorderCategories,
} from './useCategoryMutations'
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

export function CategoryManagerDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false)
  const { data: categories = [] } = useCategories(organizationId)
  const createCategory = useCreateCategory(organizationId)
  const renameCategory = useRenameCategory(organizationId)
  const reorderCategories = useReorderCategories(organizationId)
  const deleteCategory = useDeleteCategory(organizationId)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const onAdd = async () => {
    if (!newName.trim()) return
    const nextSortOrder = (categories.at(-1)?.sort_order ?? -1) + 1
    try {
      await createCategory.mutateAsync({ name: newName.trim(), sortOrder: nextSortOrder })
      setNewName('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create category')
    }
  }

  const onMove = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= categories.length) return
    const a = categories[index]
    const b = categories[targetIndex]
    reorderCategories.mutate([
      { id: a.id, sort_order: b.sort_order },
      { id: b.id, sort_order: a.sort_order },
    ])
  }

  const onDelete = async (id: string, name: string) => {
    try {
      await deleteCategory.mutateAsync(id)
      toast.success(`Deleted "${name}" — any ingredients in it moved to Uncategorized`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete category')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Manage categories</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Categories</DialogTitle>
          <DialogDescription>
            Add, rename, reorder, or delete ingredient categories for this organization.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {categories.map((category, index) => (
            <div
              key={category.id}
              className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={index === 0}
                  onClick={() => onMove(index, -1)}
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={index === categories.length - 1}
                  onClick={() => onMove(index, 1)}
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </div>
              {editingId === category.id ? (
                <Input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      renameCategory.mutate({ id: category.id, name: editingName })
                      setEditingId(null)
                    }
                  }}
                  onBlur={() => {
                    if (editingName.trim() && editingName !== category.name) {
                      renameCategory.mutate({ id: category.id, name: editingName.trim() })
                    }
                    setEditingId(null)
                  }}
                  className="h-7 flex-1"
                />
              ) : (
                <span className="flex-1 text-sm">{category.name}</span>
              )}
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setEditingId(category.id)
                  setEditingName(category.name)
                }}
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(category.id, category.name)}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="New category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          />
          <Button onClick={onAdd} disabled={createCategory.isPending}>
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
