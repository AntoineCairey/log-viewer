import type { LogEntry } from '../types/log.ts'

const SEPARATOR = ';'

const COLUMNS = [
  'Date et heure',
  'Niveau',
  'Service',
  'Message',
  'Durée (ms)',
  'Statut HTTP',
  'User ID',
  'Request ID',
  'Log ID',
] as const

// Point-virgule : un Excel réglé en français sépare les colonnes ainsi.
// Une cellule qui commence par = + - @ est préfixée, sinon le tableur
// l'ouvre comme une formule.
export function logsToCsv(logs: readonly LogEntry[]): string {
  const lines = [COLUMNS.join(SEPARATOR)]
  for (const log of logs) {
    lines.push(
      [
        log.timestamp,
        log.level,
        log.service,
        log.message,
        String(Math.round(log.durationMs)),
        String(log.httpStatus),
        String(log.userId),
        log.requestId,
        log.id,
      ]
        .map(cell)
        .join(SEPARATOR),
    )
  }
  return `${lines.join('\r\n')}\r\n`
}

export function csvFilename(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`
  return `logs-${date}-${time}.csv`
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  if (/[;"\r\n]/.test(safe)) return `"${safe.replaceAll('"', '""')}"`
  return safe
}
