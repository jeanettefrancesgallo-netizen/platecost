import { useCurrentOrg } from '@/features/organizations/useCurrentOrg'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function DashboardPage() {
  const { currentOrg } = useCurrentOrg()

  if (!currentOrg) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{currentOrg.organization.name}</h1>
        <p className="text-muted-foreground">
          {currentOrg.organization.plan.toUpperCase()} plan · base currency{' '}
          {currentOrg.organization.base_currency}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Recipes" value="0" />
        <SummaryCard title="Avg. cost %" value="—" />
        <SummaryCard title="Ingredients" value="0" />
        <SummaryCard title="Low stock items" value="0" />
      </div>
    </div>
  )
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent />
    </Card>
  )
}
