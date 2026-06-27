import type { OrganizationRole } from './useOrganizations'

export function canManageTeamAndBilling(role: OrganizationRole | undefined): boolean {
  return role === 'owner'
}

export function canManageData(role: OrganizationRole | undefined): boolean {
  return role === 'owner' || role === 'manager'
}
