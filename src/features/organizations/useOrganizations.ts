import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/useAuth'
import type { Database } from '@/types/database.types'

export type OrganizationRole = Database['public']['Tables']['organization_members']['Row']['role']

export interface OrgMembership {
  organizationId: string
  role: OrganizationRole
  organization: Database['public']['Tables']['organizations']['Row']
}

export function useOrganizations() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['organizations', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<OrgMembership[]> => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id, role, organizations(*)')
        .eq('user_id', user!.id)

      if (error) throw error

      return data
        .filter((row) => row.organizations)
        .map((row) => ({
          organizationId: row.organization_id,
          role: row.role,
          organization: row.organizations!,
        }))
    },
  })
}
