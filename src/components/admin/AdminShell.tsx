import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Building2, Megaphone, Flag, ScrollText, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { UserMenu } from '@/components/layout/UserMenu'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/tenants', label: 'Tenants', icon: Building2 },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/admin/feature-flags', label: 'Feature flags', icon: Flag },
  { to: '/admin/audit-log', label: 'Audit log', icon: ScrollText },
]

export function AdminShell() {
  return (
    <div className="flex min-h-svh bg-slate-950 text-slate-100">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900 md:flex">
        <div className="flex h-14 items-center gap-2 px-4">
          <span className="text-lg font-semibold text-slate-100">PlateCost</span>
        </div>
        <nav className="flex flex-col gap-1 px-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto p-3">
          <NavLink
            to="/"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Back to app
          </NavLink>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
          <Badge className="bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30">
            Platform Admin
          </Badge>
          <UserMenu />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
