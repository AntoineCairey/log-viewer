export const DEFAULT_RETRY_DELAY_MS = 5_000

// Retry-After : un délai en secondes, ou une date HTTP.
// Sinon on attend DEFAULT_RETRY_DELAY_MS.
export function parseRetryAfter(
  header: string | null,
  now = Date.now(),
): number {
  if (header === null) return DEFAULT_RETRY_DELAY_MS

  const trimmed = header.trim()
  if (trimmed === '') return DEFAULT_RETRY_DELAY_MS
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed) * 1000

  const date = Date.parse(trimmed)
  if (Number.isNaN(date)) return DEFAULT_RETRY_DELAY_MS
  return Math.max(0, date - now)
}
