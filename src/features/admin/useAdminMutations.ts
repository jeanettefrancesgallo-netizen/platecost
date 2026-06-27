import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type OrgStatus = Database['public']['Tables']['organizations']['Row']['status']

function useInvalidateOrgQueries(organizationId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['admin-organizations'] })
    queryClient.invalidateQueries({ queryKey: ['admin-organization-detail', organizationId] })
    queryClient.invalidateQueries({ queryKey: ['admin-platform-stats'] })
    queryClient.invalidateQueries({ queryKey: ['admin-audit-log'] })
  }
}

export function useSetOrganizationStatus(organizationId: string) {
  const invalidate = useInvalidateOrgQueries(organizationId)
  return useMutation({
    mutationFn: async (status: OrgStatus) => {
      const { error } = await supabase.rpc('admin_set_organization_status', {
        p_org_id: organizationId,
        p_status: status,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useChangeOrganizationPlan(organizationId: string) {
  const invalidate = useInvalidateOrgQueries(organizationId)
  return useMutation({
    mutationFn: async (plan: string) => {
      const { error } = await supabase.rpc('admin_change_organization_plan', {
        p_org_id: organizationId,
        p_plan: plan,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useExtendTrial(organizationId: string) {
  const invalidate = useInvalidateOrgQueries(organizationId)
  return useMutation({
    mutationFn: async (days: number) => {
      const { error } = await supabase.rpc('admin_extend_trial', {
        p_org_id: organizationId,
        p_days: days,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (organizationId: string) => {
      const { error } = await supabase.rpc('admin_delete_organization', {
        p_org_id: organizationId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] })
      queryClient.invalidateQueries({ queryKey: ['admin-platform-stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin-audit-log'] })
    },
  })
}

export function useLogOrganizationView() {
  return useMutation({
    mutationFn: async (organizationId: string) => {
      const { error } = await supabase.rpc('admin_log_organization_view', {
        p_org_id: organizationId,
      })
      if (error) throw error
    },
  })
}
