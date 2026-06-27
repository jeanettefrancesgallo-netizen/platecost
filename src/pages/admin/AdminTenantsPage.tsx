import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminOrganizations } from '@/features/admin/useAdminOrganizations'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const STATUS_OPTIONS = ['all', 'trialing', 'active', 'past_due', 'suspended', 'canceled']
const PLAN_OPTIONS = ['all', 'free', 'pro', 'enterprise']

export function AdminTenantsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [plan, setPlan] = useState('all')
  const { data: organizations = [], isLoading } = useAdminOrganizations({ search, status, plan })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-white">Tenants</h1>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-500"
        />
        <Select value={status} onValueChange={(v) => v && setStatus(v)}>
          <SelectTrigger className="w-40 border-slate-800 bg-slate-900 text-slate-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? 'All statuses' : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={plan} onValueChange={(v) => v && setPlan(v)}>
          <SelectTrigger className="w-40 border-slate-800 bg-slate-900 text-slate-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAN_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p === 'all' ? 'All plans' : p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-md border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Plan</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Members</th>
              <th className="px-3 py-2 text-left">Currency</th>
              <th className="px-3 py-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && organizations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                  No organizations match.
                </td>
              </tr>
            )}
            {organizations.map((org) => (
              <tr key={org.id} className="border-t border-slate-800 hover:bg-slate-900/60">
                <td className="px-3 py-2">
                  <Link
                    to={`/admin/tenants/${org.id}`}
                    className="font-medium text-white underline-offset-4 hover:underline"
                  >
                    {org.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-slate-300">{org.plan}</td>
                <td className="px-3 py-2">
                  <Badge variant="secondary">{org.status}</Badge>
                </td>
                <td className="px-3 py-2 text-slate-300">
                  {org.organization_members[0]?.count ?? 0}
                </td>
                <td className="px-3 py-2 text-slate-300">{org.base_currency}</td>
                <td className="px-3 py-2 text-slate-400">
                  {new Date(org.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
