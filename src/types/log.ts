export const LOG_LEVELS = [
  'debug',
  'info',
  'warning',
  'error',
  'critical',
] as const

export type LogLevel = (typeof LOG_LEVELS)[number]

// Log validé. Les noms sont en camelCase ; le JSON de l'API reste en snake_case.
export type LogEntry = {
  id: string
  timestamp: string
  level: LogLevel
  service: string
  message: string
  durationMs: number
  requestId: string
  userId: number
  httpStatus: number
}
