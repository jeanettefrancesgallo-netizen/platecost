import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { usePlatformStats } from '@/features/admin/usePlatformStats'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader>
        <CardDescription className="text-slate-400">{title}</CardDescription>
        <CardTitle className="text-2xl text-white">{value}</CardTitle>
      </CardHeader>
      <CardContent />
    </Card>
  )
}

export function AdminDashboardPage() {
  const { data: stats, isLoading } = usePlatformStats()

  if (isLoading || !stats) {
    return <p className="text-slate-400">Loading platform stats…</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-white">Platform Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total organizations" value={stats.total_organizations} />
        <StatCard title="Active" value={stats.active_organizations} />
        <StatCard title="Trialing" value={stats.trialing_organizations} />
        <StatCard title="Churned" value={stats.churned_organizations} />
        <StatCard title="Total users" value={stats.total_users} />
        <StatCard title="MRR" value={`$${stats.mrr_usd.toFixed(2)}`} />
        <StatCard title="Suspended" value={stats.suspended_organizations} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle className="text-base text-white">Signups (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.signups_by_day}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
                <Bar dataKey="count" fill="#22c55e" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle className="text-base text-white">Plan distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.plan_distribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={12} allowDecimals={false} />
                <YAxis dataKey="plan" type="category" stroke="#64748b" fontSize={12} width={80} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
                <Bar dataKey="count" fill="#f59e0b" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
