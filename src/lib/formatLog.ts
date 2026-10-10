const numberFormat = new Intl.NumberFormat('fr-FR')
const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
})
const timeFormat = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

export function formatCount(count: number): string {
  return numberFormat.format(count)
}

export function formatDuration(durationMs: number): string {
  return `${numberFormat.format(Math.round(durationMs))} ms`
}

// Tous les services finissent par « -service » : le suffixe n'apporte rien dans le tableau.
export function formatService(service: string): string {
  return service.replace(/-service$/, '')
}

export function formatLogDate(timestamp: string): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return timestamp
  return dateFormat.format(date)
}

export function formatLogTime(timestamp: string): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  const fraction = timestamp.match(/\.(\d{3})/)
  const time = timeFormat.format(date)
  return fraction ? `${time}.${fraction[1]}` : time
}

export function httpStatusTone(status: number): 'ok' | 'client' | 'server' {
  if (status >= 500) return 'server'
  if (status >= 400) return 'client'
  return 'ok'
}
