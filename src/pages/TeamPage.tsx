import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useCurrentOrg } from '@/features/organizations/useCurrentOrg'
import { useAuth } from '@/features/auth/useAuth'
import { canManageTeamAndBilling } from '@/features/organizations/permissions'
import type { OrganizationRole } from '@/features/organizations/useOrganizations'
import { useTeamMembers } from '@/features/team/useTeamMembers'
import { useTeamInvitations } from '@/features/team/useTeamInvitations'
import {
  useInviteMember,
  useRemoveMember,
  useRevokeInvitation,
  useUpdateMemberRole,
} from '@/features/team/useTeamMutations'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const inviteSchema = z.object({
  email: z.email('Enter a valid email address'),
  role: z.enum(['manager', 'staff']),
})

type InviteForm = z.infer<typeof inviteSchema>

const ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  staff: 'Staff',
}

export function TeamPage() {
  const { currentOrg } = useCurrentOrg()
  const { user } = useAuth()
  const orgId = currentOrg?.organizationId
  const canManage = canManageTeamAndBilling(currentOrg?.role)

  const { data: members = [] } = useTeamMembers(orgId)
  const { data: invitations = [] } = useTeamInvitations(orgId)
  const updateRole = useUpdateMemberRole(orgId ?? '')
  const removeMember = useRemoveMember(orgId ?? '')
  const inviteMember = useInviteMember(orgId ?? '')
  const revokeInvitation = useRevokeInvitation(orgId ?? '')
  const [inviteOpen, setInviteOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InviteForm>({ resolver: zodResolver(inviteSchema), defaultValues: { role: 'staff' } })
  const role = watch('role')

  if (!currentOrg) return null

  const onInvite = async (values: InviteForm) => {
    try {
      await inviteMember.mutateAsync(values)
      toast.success(`Invited ${values.email}`)
      reset({ email: '', role: 'staff' })
      setInviteOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send invitation')
    }
  }

  const ownerCount = members.filter((m) => m.role === 'owner').length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Team</h1>
          <p className="text-muted-foreground">Manage who has access to {currentOrg.organization.name}.</p>
        </div>
        {canManage && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger render={<Button />}>Invite member</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a team member</DialogTitle>
                <DialogDescription>
                  They'll automatically join with this role the next time they sign up or log in
                  with this email.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onInvite)} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input id="invite-email" type="email" {...register('email')} />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={role} onValueChange={(value) => value && setValue('role', value as 'manager' | 'staff')}>
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={inviteMember.isPending}>
                    {inviteMember.isPending ? 'Sending…' : 'Send invitation'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>{members.length} member(s)</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {members.map((member) => {
            const isSelf = member.user_id === user?.id
            const isLastOwner = member.role === 'owner' && ownerCount <= 1
            return (
              <div
                key={member.id}
                className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {member.profiles?.full_name ?? member.profiles?.email}
                    {isSelf && <span className="text-muted-foreground"> (you)</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">{member.profiles?.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && !isLastOwner ? (
                    <Select
                      value={member.role}
                      onValueChange={(value) =>
                        value &&
                        updateRole.mutate({ memberId: member.id, role: value as OrganizationRole })
                      }
                    >
                      <SelectTrigger size="sm" className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
                  )}
                  {canManage && !isLastOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMember.mutate(member.id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {canManage && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending invitations</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2"
              >
                <span className="text-sm">{invitation.email}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{ROLE_LABELS[invitation.role]}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeInvitation.mutate(invitation.id)}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
