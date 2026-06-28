import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useCreateRecipe } from './useRecipeMutations'
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

const schema = z.object({
  name: z.string().min(1, 'Enter a name'),
  portions: z.number().int().positive('Must be at least 1'),
})

type FormValues = z.infer<typeof schema>

export function CreateRecipeDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const createRecipe = useCreateRecipe(organizationId)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { portions: 1 } })

  const onSubmit = async (values: FormValues) => {
    try {
      const recipe = await createRecipe.mutateAsync({ name: values.name, portions: values.portions })
      toast.success('Recipe created')
      reset()
      setOpen(false)
      navigate(`/recipes/${recipe.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create recipe')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>New recipe</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New recipe</DialogTitle>
          <DialogDescription>
            Add ingredients and pricing details after creating it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recipe-name">Name</Label>
            <Input id="recipe-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recipe-portions">Portions</Label>
            <Input
              id="recipe-portions"
              type="number"
              {...register('portions', { valueAsNumber: true })}
            />
            {errors.portions && (
              <p className="text-sm text-destructive">{errors.portions.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createRecipe.isPending}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
