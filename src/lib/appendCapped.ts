export const LOG_BUFFER_LIMIT = 5000

export function appendCapped<T>(
  current: readonly T[],
  incoming: readonly T[],
  limit = LOG_BUFFER_LIMIT,
): T[] {
  const combined = current.concat(incoming)
  if (combined.length <= limit) return combined
  return combined.slice(combined.length - limit)
}
