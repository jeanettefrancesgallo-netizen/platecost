import { useState } from 'react'
import { toast } from 'sonner'
import { useCurrentOrg } from '@/features/organizations/useCurrentOrg'
import { canManageData } from '@/features/organizations/permissions'
import { useLocations } from '@/features/locations/useLocations'
import { LocationManagerDialog } from '@/features/locations/LocationManagerDialog'
import { useInventoryRows } from '@/features/inventory/useInventoryRows'
import { useInventoryLog } from '@/features/inventory/useInventoryLog'
import { useSetInventoryLevels } from '@/features/inventory/useInventoryMutations'
import { RecordMovementDialog } from '@/features/inventory/RecordMovementDialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function InventoryPage() {
  const { currentOrg } = useCurrentOrg()
  const orgId = currentOrg?.organizationId
  const canManage = canManageData(currentOrg?.role)

  const { data: locations = [], isLoading: locationsLoading } = useLocations(orgId)
  const [locationId, setLocationId] = useState<string | undefined>(undefined)
  const activeLocationId = locationId ?? locations[0]?.id

  const { data: rows = [] } = useInventoryRows(orgId, activeLocationId)
  const { data: log = [] } = useInventoryLog(activeLocationId)
  const setLevels = useSetInventoryLevels(orgId ?? '', activeLocationId ?? '')

  if (!currentOrg) return null

  const lowStockRows = rows.filter((r) => r.reorderLevel > 0 && r.quantityOnHand <= r.reorderLevel)

  if (!locationsLoading && locations.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <p className="text-muted-foreground">
          Create a location to start tracking stock.
        </p>
        {canManage && <LocationManagerDialog organizationId={orgId!} />}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="text-muted-foreground">{rows.length} ingredient(s) tracked</p>
        </div>
        <div className="flex gap-2">
          {canManage && <LocationManagerDialog organizationId={orgId!} />}
          {activeLocationId && (
            <RecordMovementDialog organizationId={orgId!} locationId={activeLocationId} />
          )}
        </div>
      </div>

      <Select value={activeLocationId} onValueChange={(v) => v && setLocationId(v)}>
        <SelectTrigger className="w-56">
          <SelectValue>
            {(id: string | null) => locations.find((l) => l.id === id)?.name ?? 'Select location'}
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

      {lowStockRows.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base text-destructive">
              {lowStockRows.length} item(s) at or below reorder level
            </CardTitle>
            <CardDescription>{lowStockRows.map((r) => r.name).join(', ')}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">On hand</th>
              <th className="px-3 py-2 text-left">Par level</th>
              <th className="px-3 py-2 text-left">Reorder level</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                  No ingredients yet — add some in the Ingredients page first.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const isLow = row.reorderLevel > 0 && row.quantityOnHand <= row.reorderLevel
              return (
                <tr key={row.ingredientId} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.categoryName}</td>
                  <td className="px-3 py-2">
                    {row.quantityOnHand} {row.baseUnit}
                  </td>
                  {canManage ? (
                    <>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="any"
                          // Keyed to the persisted value so a successful save
                          // remounts the (uncontrolled) input with the new
                          // default instead of mutating defaultValue in place,
                          // which Base UI's FieldControl warns against.
                          key={`par-${row.parLevel}`}
                          defaultValue={row.parLevel}
                          className="w-20"
                          onBlur={(e) => {
                            const parLevel = Number(e.target.value)
                            if (parLevel >= 0 && parLevel !== row.parLevel) {
                              setLevels.mutate(
                                { ingredientId: row.ingredientId, parLevel, reorderLevel: row.reorderLevel },
                                { onError: (err) => toast.error(err.message) },
                              )
                            }
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="any"
                          key={`reorder-${row.reorderLevel}`}
                          defaultValue={row.reorderLevel}
                          className="w-20"
                          onBlur={(e) => {
                            const reorderLevel = Number(e.target.value)
                            if (reorderLevel >= 0 && reorderLevel !== row.reorderLevel) {
                              setLevels.mutate(
                                { ingredientId: row.ingredientId, parLevel: row.parLevel, reorderLevel },
                                { onError: (err) => toast.error(err.message) },
                              )
                            }
                          }}
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-muted-foreground">{row.parLevel}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.reorderLevel}</td>
                    </>
                  )}
                  <td className="px-3 py-2">
                    {isLow ? (
                      <Badge variant="destructive">Low stock</Badge>
                    ) : (
                      <Badge variant="secondary">OK</Badge>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {log.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
          {log.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between text-sm">
              <span>
                <span className="font-medium">{entry.ingredients?.name ?? 'Unknown'}</span>{' '}
                <span className="text-muted-foreground">
                  {entry.change_type} {entry.quantity}
                  {entry.note ? ` — ${entry.note}` : ''}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(entry.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
