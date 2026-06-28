import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useInventoryLog(locationId: string | undefined) {
  return useQuery({
    queryKey: ['inventory-log', locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_log')
        .select('*, ingredients(name), profiles(full_name, email)')
        .eq('location_id', locationId!)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
  })
}
