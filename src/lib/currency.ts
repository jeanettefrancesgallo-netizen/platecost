export const CURRENCIES = [
  { code: 'PHP', label: 'Philippine Peso', symbol: '₱' },
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]['code']

export function formatCurrency(amount: number, currencyCode: string): string {
  const locale = currencyCode === 'PHP' ? 'en-PH' : undefined
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'symbol',
  }).format(amount)
}
