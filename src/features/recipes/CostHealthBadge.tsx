import { classifyCostPercent } from '@/lib/recipeCosting'
import { cn } from '@/lib/utils'

const HEALTH_CLASSES: Record<ReturnType<typeof classifyCostPercent>, string> = {
  good: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400',
  bad: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400',
}

export function CostHealthBadge({
  costPercent,
  targetMax,
}: {
  costPercent: number | null
  targetMax: number | null | undefined
}) {
  if (costPercent === null) {
    return <span className="text-sm text-muted-foreground">—</span>
  }

  const health = classifyCostPercent(costPercent, targetMax)
  return (
    <span className={cn('rounded-md px-2 py-0.5 text-sm font-medium', HEALTH_CLASSES[health])}>
      {costPercent.toFixed(1)}%
    </span>
  )
}
