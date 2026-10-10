export const DEFAULT_RETRY_DELAY_MS = 5_000

// Le 503 annonce combien de temps attendre avant de rouvrir le flux.
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
