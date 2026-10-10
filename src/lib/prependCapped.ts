// Buffer affiché, du plus récent au plus ancien. L'API refuse aussi un tail > 5 000.
export const LOG_BUFFER_LIMIT = 5000

// Le lot arrive dans l'ordre d'émission. On le renverse pour le mettre devant,
// puis on oublie la fin de la liste au-delà du plafond.
export function prependCapped<T>(
  current: readonly T[],
  incoming: readonly T[],
  limit = LOG_BUFFER_LIMIT,
): T[] {
  const combined = incoming.toReversed().concat(current)
  if (combined.length <= limit) return combined
  return combined.slice(0, limit)
}

// Le tail de reconnexion renvoie des logs déjà affichés : on les écarte par id.
export function prependUniqueCapped<T extends { id: string }>(
  current: T[],
  incoming: readonly T[],
  limit = LOG_BUFFER_LIMIT,
): T[] {
  const seen = new Set(current.map((entry) => entry.id))
  const fresh: T[] = []

  for (const entry of incoming) {
    if (seen.has(entry.id)) continue
    seen.add(entry.id)
    fresh.push(entry)
  }

  if (fresh.length === 0) return current
  return prependCapped(current, fresh, limit)
}
