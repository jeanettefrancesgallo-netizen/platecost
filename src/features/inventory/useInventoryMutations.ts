import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type ChangeType = Database['public']['Tables']['inventory_log']['Row']['change_type']

function useInvalidateInventory(organizationId: string, locationId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['inventory-rows', organizationId, locationId] })
    queryClient.invalidateQueries({ queryKey: ['inventory-log', locationId] })
  }
}

export function useRecordMovement(organizationId: string, locationId: string) {
  const invalidate = useInvalidateInventory(organizationId, locationId)
  return useMutation({
    mutationFn: async (input: {
      ingredientId: string
      changeType: ChangeType
      quantity: number
      note: string
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const { error } = await supabase.from('inventory_log').insert({
        organization_id: organizationId,
        location_id: locationId,
        ingredient_id: input.ingredientId,
        change_type: input.changeType,
        quantity: input.quantity,
        note: input.note || null,
        created_by: user?.id,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useSetInventoryLevels(organizationId: string, locationId: string) {
  const invalidate = useInvalidateInventory(organizationId, locationId)
  return useMutation({
    mutationFn: async (input: {
      ingredientId: string
      parLevel: number
      reorderLevel: number
    }) => {
      const { error } = await supabase.rpc('set_inventory_levels', {
        p_location_id: locationId,
        p_ingredient_id: input.ingredientId,
        p_par_level: input.parLevel,
        p_reorder_level: input.reorderLevel,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
