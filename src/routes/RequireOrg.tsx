import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useCurrentOrg } from '@/features/organizations/useCurrentOrg'

export function RequireOrg({ children }: { children: ReactNode }) {
  const { memberships, isLoading } = useCurrentOrg()

  if (isLoading) return null

  if (memberships.length === 0) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
