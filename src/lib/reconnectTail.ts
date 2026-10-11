// L'API refuse un tail au-dessus de 5 000. Le buffer mémoire peut être plus grand.
export const API_TAIL_LIMIT = 5000
export const INITIAL_TAIL = API_TAIL_LIMIT
const LOGS_PER_SECOND = 25
const TAIL_MARGIN = 50

// Combien de logs redemander après une coupure, pour couvrir l'attente.
// 25/s est le débit annoncé, la marge absorbe l'écart, le plafond est celui de l'API.
export function reconnectTail(lastLogAt: number, now = Date.now()): number {
  const elapsedSeconds = Math.max(0, (now - lastLogAt) / 1000)
  return Math.min(
    API_TAIL_LIMIT,
    Math.ceil(elapsedSeconds * LOGS_PER_SECOND) + TAIL_MARGIN,
  )
}
