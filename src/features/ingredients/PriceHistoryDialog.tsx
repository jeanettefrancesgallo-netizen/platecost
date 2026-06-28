import type { ReactNode } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { usePriceHistory } from './usePriceHistory'
import { formatCurrency } from '@/lib/currency'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

/**
 * A single price change of more than this is flagged as a spike — a jump
 * worth a manager's attention, not just routine supplier fluctuation.
 */
const SPIKE_THRESHOLD_PERCENT = 10

export function PriceHistoryDialog({
  ingredientId,
  ingredientName,
  trigger,
}: {
  ingredientId: string
  ingredientName: string
  trigger: ReactNode
}) {
  const { data: history = [], isLoading } = usePriceHistory(ingredientId)

  const chartData = history.map((entry) => ({
    date: new Date(entry.changed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    cost: entry.new_cost,
  }))

  return (
    <Dialog>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Price history — {ingredientName}</DialogTitle>
          <DialogDescription>
            Every change to the supplier purchase cost, recorded automatically.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!isLoading && history.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No price changes recorded yet — this ingredient's cost hasn't been edited since it was
            added.
          </p>
        )}

        {history.length > 1 && (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} width={50} />
              <Tooltip />
              <Line type="monotone" dataKey="cost" stroke="#3f6433" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        )}

        {history.length > 0 && (
          <div className="max-h-64 overflow-y-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Old cost</th>
                  <th className="px-3 py-2 text-left">New cost</th>
                  <th className="px-3 py-2 text-left">Change</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((entry) => {
                  const percentChange =
                    entry.old_cost > 0
                      ? ((entry.new_cost - entry.old_cost) / entry.old_cost) * 100
                      : 0
                  const isSpike = percentChange > SPIKE_THRESHOLD_PERCENT
                  return (
                    <tr key={entry.id} className="border-t border-border">
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(entry.changed_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2">{formatCurrency(entry.old_cost, entry.currency)}</td>
                      <td className="px-3 py-2">{formatCurrency(entry.new_cost, entry.currency)}</td>
                      <td className="px-3 py-2">
                        <Badge variant={isSpike ? 'destructive' : 'secondary'} title={isSpike ? 'Price spike' : undefined}>
                          {percentChange > 0 ? '+' : ''}
                          {percentChange.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
