/**
 * Mirrors the `ingredients.cost_per_base_unit` generated column in
 * supabase/migrations/20260627223008_ingredients.sql — kept in sync so the
 * ingredient form can preview cost live before the row is saved.
 */
export function costPerBaseUnit(
  purchaseUnitCost: number,
  purchaseUnitQuantity: number,
  yieldPercent: number,
): number {
  if (purchaseUnitQuantity <= 0) throw new Error('purchaseUnitQuantity must be greater than 0')
  if (yieldPercent <= 0 || yieldPercent > 100) {
    throw new Error('yieldPercent must be between 0 (exclusive) and 100')
  }
  return purchaseUnitCost / purchaseUnitQuantity / (yieldPercent / 100)
}

/** Converts a cost stored in an ingredient's purchase currency into the org's base currency. */
export function normalizeToBaseCurrency(amount: number, exchangeRateToBase: number): number {
  return amount * exchangeRateToBase
}
