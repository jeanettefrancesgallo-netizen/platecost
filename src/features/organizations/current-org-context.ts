import { createContext } from 'react'
import type { OrgMembership } from './useOrganizations'

export interface CurrentOrgContextValue {
  currentOrg: OrgMembership | null
  memberships: OrgMembership[]
  isLoading: boolean
  setCurrentOrgId: (organizationId: string) => void
}

export const CurrentOrgContext = createContext<CurrentOrgContextValue | undefined>(undefined)
