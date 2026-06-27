import { useMemo, useState, type ReactNode } from 'react'
import { useOrganizations } from './useOrganizations'
import { CurrentOrgContext } from './current-org-context'

const STORAGE_KEY = 'platecost.currentOrgId'

export function CurrentOrgProvider({ children }: { children: ReactNode }) {
  const { data: memberships = [], isLoading } = useOrganizations()
  const [storedOrgId, setStoredOrgId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  )

  const setCurrentOrgId = (organizationId: string) => {
    localStorage.setItem(STORAGE_KEY, organizationId)
    setStoredOrgId(organizationId)
  }

  // Fall back to the first membership whenever the stored org id doesn't
  // (or no longer) matches one of the user's orgs, without writing state in
  // an effect — this is a pure derivation from props/state each render.
  const currentOrg = useMemo(() => {
    if (memberships.length === 0) return null
    return memberships.find((m) => m.organizationId === storedOrgId) ?? memberships[0]
  }, [memberships, storedOrgId])

  return (
    <CurrentOrgContext.Provider value={{ currentOrg, memberships, isLoading, setCurrentOrgId }}>
      {children}
    </CurrentOrgContext.Provider>
  )
}
