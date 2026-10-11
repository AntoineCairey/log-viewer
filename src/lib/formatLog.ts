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

// Indicateur de la barre de résultats. La pause ne coupe pas le flux :
// elle fige le défilement, comme quand on quitte le haut du tableau.
export function followStatusLabel(paused: boolean, pending: number): string {
  if (!paused) return 'Défilement automatique actif'
  if (pending <= 0) return 'Flux en pause'
  if (pending === 1) return 'Flux en pause · 1 nouveau log en attente'
  return `Flux en pause · ${formatCount(pending)} nouveaux logs en attente`
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
  // Les millisecondes viennent de la chaîne ISO : le formateur ne les garde pas.
  const fraction = timestamp.match(/\.(\d{3})/)
  const time = timeFormat.format(date)
  return fraction ? `${time}.${fraction[1]}` : time
}

// 5xx : server. 4xx : client. Le reste : ok. Le CSS lit ce data-tone.
export function httpStatusTone(status: number): 'ok' | 'client' | 'server' {
  if (status >= 500) return 'server'
  if (status >= 400) return 'client'
  return 'ok'
}
