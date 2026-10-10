import { LOG_BUFFER_LIMIT } from './prependCapped.ts'

export const INITIAL_TAIL = 10
const LOGS_PER_SECOND = 25
const TAIL_MARGIN = 50

// Combien de logs redemander après une coupure, pour couvrir l'attente.
// 25/s est le débit annoncé, la marge absorbe l'écart, le plafond est celui de l'API.
export function reconnectTail(lastLogAt: number, now = Date.now()): number {
  const elapsedSeconds = Math.max(0, (now - lastLogAt) / 1000)
  return Math.min(
    LOG_BUFFER_LIMIT,
    Math.ceil(elapsedSeconds * LOGS_PER_SECOND) + TAIL_MARGIN,
  )
}
