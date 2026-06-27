import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCurrentOrg } from '@/features/organizations/useCurrentOrg'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function OrgSwitcher() {
  const { currentOrg, memberships, setCurrentOrgId } = useCurrentOrg()
  const navigate = useNavigate()

  if (!currentOrg) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" className="w-56 justify-between" />}>
        <span className="truncate">{currentOrg.organization.name}</span>
        <ChevronsUpDown className="size-4 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {memberships.map((membership) => (
          <DropdownMenuItem
            key={membership.organizationId}
            onSelect={() => setCurrentOrgId(membership.organizationId)}
            className="justify-between"
          >
            <span className="truncate">{membership.organization.name}</span>
            {membership.organizationId === currentOrg.organizationId && (
              <Check className="size-4" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/onboarding')}>
          <Plus className="size-4" />
          New organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
