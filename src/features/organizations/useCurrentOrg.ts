import { useContext } from 'react'
import { CurrentOrgContext } from './current-org-context'

export function useCurrentOrg() {
  const context = useContext(CurrentOrgContext)
  if (!context) {
    throw new Error('useCurrentOrg must be used within a CurrentOrgProvider')
  }
  return context
}
