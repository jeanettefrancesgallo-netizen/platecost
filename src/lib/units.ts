export type BaseUnit = 'g' | 'ml' | 'each'

// Grams per unit, for units that convert into the 'g' base unit.
const MASS_UNITS_TO_GRAMS: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
}

// Millilitres per unit, for units that convert into the 'ml' base unit.
const VOLUME_UNITS_TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  'fl oz': 29.5735,
}

export const PURCHASE_UNITS_BY_BASE: Record<BaseUnit, string[]> = {
  g: Object.keys(MASS_UNITS_TO_GRAMS),
  ml: Object.keys(VOLUME_UNITS_TO_ML),
  each: ['each'],
}

/**
 * Converts a quantity expressed in `fromUnit` into the equivalent quantity
 * expressed in `baseUnit` (g, ml, or each). Throws on an unrecognized or
 * incompatible unit (e.g. converting a volume unit into the 'g' base unit)
 * rather than silently returning a wrong number.
 */
export function convertToBaseUnit(quantity: number, fromUnit: string, baseUnit: BaseUnit): number {
  const unit = fromUnit.toLowerCase()

  if (baseUnit === 'each') {
    if (unit !== 'each') {
      throw new Error(`Cannot convert "${fromUnit}" into base unit "each".`)
    }
    return quantity
  }

  if (baseUnit === 'g') {
    const factor = MASS_UNITS_TO_GRAMS[unit]
    if (factor === undefined) {
      throw new Error(`Unknown mass unit "${fromUnit}" for base unit "g".`)
    }
    return quantity * factor
  }

  const factor = VOLUME_UNITS_TO_ML[unit]
  if (factor === undefined) {
    throw new Error(`Unknown volume unit "${fromUnit}" for base unit "ml".`)
  }
  return quantity * factor
}
