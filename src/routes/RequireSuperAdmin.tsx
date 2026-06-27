import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useIsSuperAdmin } from '@/features/admin/useIsSuperAdmin'

export function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const { data: isSuperAdmin, isLoading } = useIsSuperAdmin()

  if (isLoading) return null

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
