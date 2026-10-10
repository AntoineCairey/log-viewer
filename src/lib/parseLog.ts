import { LOG_LEVELS, type LogEntry, type LogLevel } from '../types/log.ts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLogLevel(value: unknown): value is LogLevel {
  return (
    typeof value === 'string' && LOG_LEVELS.some((level) => level === value)
  )
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

export function parseLog(raw: string): LogEntry | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }

  if (!isRecord(data) || !isRecord(data.metadata)) return null

  const { metadata } = data
  const durationMs = data.duration_ms
  const level = data.level

  if (
    typeof data.id !== 'string' ||
    typeof data.timestamp !== 'string' ||
    !isLogLevel(level) ||
    typeof data.service !== 'string' ||
    typeof data.message !== 'string' ||
    typeof durationMs !== 'number' ||
    !Number.isFinite(durationMs) ||
    typeof metadata.request_id !== 'string' ||
    !isInteger(metadata.user_id) ||
    !isInteger(metadata.http_status)
  ) {
    return null
  }

  return {
    id: data.id,
    timestamp: data.timestamp,
    level,
    service: data.service,
    message: data.message,
    durationMs,
    requestId: metadata.request_id,
    userId: metadata.user_id,
    httpStatus: metadata.http_status,
  }
}
