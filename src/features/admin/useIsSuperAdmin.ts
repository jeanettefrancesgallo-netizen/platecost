import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/useAuth'

export function useIsSuperAdmin() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['is-super-admin', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user!.id)
        .single()
      if (error) throw error
      return data.is_super_admin
    },
  })
}
