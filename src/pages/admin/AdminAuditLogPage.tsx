import { useState } from 'react'
import { useAuditLog } from '@/features/admin/useAuditLog'
import { Input } from '@/components/ui/input'

export function AdminAuditLogPage() {
  const [search, setSearch] = useState('')
  const { data: entries = [], isLoading } = useAuditLog(search)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-white">Audit log</h1>

      <Input
        placeholder="Search by action or target type…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-500"
      />

      <div className="overflow-hidden rounded-md border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">When</th>
              <th className="px-3 py-2 text-left">Admin</th>
              <th className="px-3 py-2 text-left">Action</th>
              <th className="px-3 py-2 text-left">Target</th>
              <th className="px-3 py-2 text-left">Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                  No matching entries.
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t border-slate-800">
                <td className="px-3 py-2 text-slate-400">
                  {new Date(entry.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-slate-300">
                  {entry.profiles?.full_name ?? entry.profiles?.email}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-white">{entry.action}</td>
                <td className="px-3 py-2 text-slate-300">
                  {entry.target_type}
                  {entry.target_id ? ` (${entry.target_id.slice(0, 8)}…)` : ''}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-slate-500">
                  {JSON.stringify(entry.metadata)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
