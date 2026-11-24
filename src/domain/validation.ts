export const defaultEnergy = 50
export const defaultDate = '1970-01-01'

export function isValidEnergy(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && Number.isInteger(value)
    && value >= 0
    && value <= 100
}

export function normalizeEnergy(value: unknown, fallback = defaultEnergy): number {
  const safeFallback = isValidEnergy(fallback) ? fallback : defaultEnergy
  if (typeof value !== 'number' || !Number.isFinite(value)) return safeFallback
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function normalizeDate(value: unknown, fallback = defaultDate): string {
  if (isValidDate(value)) return value
  return isValidDate(fallback) ? fallback : defaultDate
}

export function isValidText(value: unknown): value is string {
  return typeof value === 'string'
}

export function normalizeText(value: unknown, fallback = ''): string {
  return isValidText(value) ? value : fallback
}
