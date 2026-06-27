import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { OrgSwitcher } from './OrgSwitcher'
import { UserMenu } from './UserMenu'

export function AppShell() {
  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-4">
          <OrgSwitcher />
          <UserMenu />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
