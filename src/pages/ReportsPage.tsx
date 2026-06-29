import { useState } from 'react'
import { useCurrentOrg } from '@/features/organizations/useCurrentOrg'
import { useLocations } from '@/features/locations/useLocations'
import {
  useRecipeCostingReport,
  useIngredientCostReport,
  useInventoryValuationReport,
  useCogsReport,
} from '@/features/reports/useReportData'
import { formatCurrency } from '@/lib/currency'
import { exportCsv, exportPdf } from '@/lib/exportFile'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function ReportCard({
  title,
  description,
  count,
  columns,
  rows,
  filenameBase,
  pdfTitle,
  children,
}: {
  title: string
  description: string
  count: number
  columns: string[]
  rows: (string | number)[][]
  filenameBase: string
  pdfTitle: string
  children?: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {description} — {count} row(s)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {children}
            <Button
              variant="outline"
              size="sm"
              disabled={rows.length === 0}
              onClick={() => exportCsv(filenameBase, columns, rows)}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={rows.length === 0}
              onClick={() => exportPdf(pdfTitle, filenameBase, columns, rows)}
            >
              Export PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2 text-left">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-4 text-center text-muted-foreground">
                    No data yet.
                  </td>
                </tr>
              )}
              {rows.slice(0, 10).map((row, i) => (
                <tr key={i} className="border-t border-border">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 10 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Showing 10 of {rows.length} — export to see all.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const today = new Date()
const todayIso = today.toISOString().slice(0, 10)
const startOfMonthIso = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)

export function ReportsPage() {
  const { currentOrg } = useCurrentOrg()
  const orgId = currentOrg?.organizationId
  const baseCurrency = currentOrg?.organization.base_currency ?? 'PHP'

  const { data: locations = [] } = useLocations(orgId)
  const [locationId, setLocationId] = useState<string | undefined>(undefined)
  const activeLocationId = locationId ?? locations[0]?.id

  const [periodStart, setPeriodStart] = useState(startOfMonthIso)
  const [periodEnd, setPeriodEnd] = useState(todayIso)

  const { data: recipeReport = [] } = useRecipeCostingReport(orgId)
  const { data: ingredientReport = [] } = useIngredientCostReport(orgId)
  const { data: inventoryReport = [] } = useInventoryValuationReport(orgId, activeLocationId)
  const { data: cogsReport = [] } = useCogsReport(orgId, activeLocationId, periodStart, periodEnd)

  if (!currentOrg) return null

  const recipeColumns = ['Name', 'Type', 'Portions', 'Cost/portion', 'Selling price', 'Cost %', 'Margin/portion']
  const recipeRows = recipeReport.map((r) => [
    r.name,
    r.type,
    r.portions,
    formatCurrency(r.totals.costPerPortion, baseCurrency),
    r.sellingPrice > 0 ? formatCurrency(r.sellingPrice, baseCurrency) : '—',
    r.totals.costPercent !== null ? `${r.totals.costPercent.toFixed(1)}%` : '—',
    r.totals.grossProfitPerPortion !== null
      ? formatCurrency(r.totals.grossProfitPerPortion, baseCurrency)
      : '—',
  ])

  const ingredientColumns = ['Name', 'Category', 'Supplier', 'Base unit', 'Cost/base unit']
  const ingredientRows = ingredientReport.map((i) => [
    i.name,
    i.categoryName,
    i.supplierName,
    i.baseUnit,
    formatCurrency(i.costPerBaseUnit, baseCurrency),
  ])

  const inventoryColumns = ['Name', 'Category', 'On hand', 'Base unit', 'Cost/base unit', 'Value']
  const inventoryRows = inventoryReport.map((i) => [
    i.name,
    i.categoryName,
    i.quantityOnHand,
    i.baseUnit,
    formatCurrency(i.costPerBaseUnit, baseCurrency),
    formatCurrency(i.value, baseCurrency),
  ])
  const inventoryTotalValue = inventoryReport.reduce((sum, i) => sum + i.value, 0)

  const cogsColumns = [
    'Name',
    'Base unit',
    'Beginning qty',
    'Beginning value',
    'Purchases qty',
    'Purchases value',
    'Ending qty',
    'Ending value',
  ]
  const cogsRows = cogsReport.map((c) => [
    c.name,
    c.baseUnit,
    c.beginningQty,
    formatCurrency(c.beginningValue, baseCurrency),
    c.purchasesQty,
    formatCurrency(c.purchasesValue, baseCurrency),
    c.endingQty,
    formatCurrency(c.endingValue, baseCurrency),
  ])
  const totalCogs = cogsReport.reduce((sum, c) => sum + c.cogs, 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground">Export CSV or PDF for accounting, audits, or sharing.</p>
      </div>

      <ReportCard
        title="Menu Costing Report"
        description="All recipes and beverages, cost and margin per portion"
        count={recipeReport.length}
        columns={recipeColumns}
        rows={recipeRows}
        filenameBase="menu-costing-report"
        pdfTitle="Menu Costing Report"
      />

      <ReportCard
        title="Ingredient Cost List"
        description="Current cost per base unit for every ingredient"
        count={ingredientReport.length}
        columns={ingredientColumns}
        rows={ingredientRows}
        filenameBase="ingredient-cost-list"
        pdfTitle="Ingredient Cost List"
      />

      <ReportCard
        title="Inventory Valuation"
        description={`Stock on hand × cost, total ${formatCurrency(inventoryTotalValue, baseCurrency)}`}
        count={inventoryReport.length}
        columns={inventoryColumns}
        rows={inventoryRows}
        filenameBase="inventory-valuation"
        pdfTitle="Inventory Valuation Report"
      >
        {locations.length > 1 && (
          <Select value={activeLocationId} onValueChange={(v) => v && setLocationId(v)}>
            <SelectTrigger className="w-44">
              <SelectValue>
                {(id: string | null) => locations.find((l) => l.id === id)?.name ?? 'Location'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </ReportCard>

      <ReportCard
        title="Cost of Goods Sold"
        description={`Beginning + Purchases − Ending, valued at current ingredient cost (not historical) — total COGS ${formatCurrency(totalCogs, baseCurrency)}`}
        count={cogsReport.length}
        columns={cogsColumns}
        rows={cogsRows}
        filenameBase="cost-of-goods-sold"
        pdfTitle="Cost of Goods Sold"
      >
        <div className="flex items-end gap-2">
          {locations.length > 1 && (
            <Select value={activeLocationId} onValueChange={(v) => v && setLocationId(v)}>
              <SelectTrigger className="w-36">
                <SelectValue>
                  {(id: string | null) => locations.find((l) => l.id === id)?.name ?? 'Location'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex flex-col gap-1">
            <Label htmlFor="cogs-start" className="text-xs">
              From
            </Label>
            <Input
              id="cogs-start"
              type="date"
              value={periodStart}
              max={periodEnd}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-36"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="cogs-end" className="text-xs">
              To
            </Label>
            <Input
              id="cogs-end"
              type="date"
              value={periodEnd}
              min={periodStart}
              max={todayIso}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-36"
            />
          </div>
        </div>
      </ReportCard>
    </div>
  )
}
