import { formatCount, formatService } from './formatLog.ts'
import { LOG_LEVELS, type LogEntry, type LogLevel } from '../types/log.ts'

// Les filtres se combinent en ET. Dans un choix multiple, les valeurs cochées
// sont en OU, et une liste vide ne filtre pas cette dimension.
// « Dernières secondes » part du log le plus récent déjà retenu par les autres
// filtres : pas de Date.now(), donc pas de timer pour faire avancer la fenêtre.

export const PERIOD_PRESETS = [
  { ms: 30_000, label: '30 dernières s' },
  { ms: 60_000, label: 'Dernière minute' },
  { ms: 120_000, label: '2 dernières min' },
  { ms: 300_000, label: '5 dernières min' },
] as const

export const DURATION_PRESETS = [
  { label: '≤ 100 ms', min: '', max: '100' },
  { label: '100 ms – 1 s', min: '100', max: '1000' },
  { label: '≥ 1 s', min: '1000', max: '' },
] as const

const MESSAGE_FIELD = {
  value: 'message',
  label: 'Message',
  placeholder: 'Texte contenu dans le message…',
  chip: 'message',
} as const

export const TEXT_FIELD_OPTIONS = [
  MESSAGE_FIELD,
  {
    value: 'requestId',
    label: 'Request ID',
    placeholder: 'Début ou totalité du request_id',
    chip: 'request_id',
  },
  {
    value: 'userId',
    label: 'User ID',
    placeholder: 'Identifiant exact, ex. 380',
    chip: 'user_id',
  },
  {
    value: 'logId',
    label: 'Log ID',
    placeholder: 'Identifiant du log (UUID)',
    chip: 'log_id',
  },
] as const

export type TextField = (typeof TEXT_FIELD_OPTIONS)[number]['value']
export type ExactTextField = TextField

export type TextFilter = {
  field: TextField
  value: string
  exact: boolean
}

export type TextDraft = {
  field: TextField
  value: string
}

export type PeriodFilter =
  | { kind: 'last'; ms: number }
  | { kind: 'range'; from: number | null; to: number | null }

// Critères tels que saisis. Les chaînes de période et de durée restent brutes :
// une saisie invalide s'affiche, mais n'est pas appliquée.
export type FilterCriteria = {
  levels: LogLevel[]
  services: string[]
  statuses: number[]
  texts: TextFilter[]
  periodMode: 'none' | 'last' | 'custom'
  lastMs: number
  fromStr: string
  toStr: string
  minD: string
  maxD: string
}

export type Filters = {
  levels: readonly LogLevel[]
  services: readonly string[]
  statuses: readonly number[]
  texts: readonly TextFilter[]
  period: PeriodFilter | null
  minDurationMs: number | null
  maxDurationMs: number | null
}

export type FilterChip = {
  id: string
  label: string
  removeLabel: string
}

export const INITIAL_CRITERIA: FilterCriteria = {
  levels: [],
  services: [],
  statuses: [],
  texts: [],
  periodMode: 'none',
  lastMs: 0,
  fromStr: '',
  toStr: '',
  minD: '',
  maxD: '',
}

export const LOG_LEVEL_OPTIONS: readonly LogLevel[] = LOG_LEVELS

export function isTextField(value: string): value is TextField {
  return TEXT_FIELD_OPTIONS.some((option) => option.value === value)
}

export function textFieldOption(field: TextField) {
  return (
    TEXT_FIELD_OPTIONS.find((option) => option.value === field) ?? MESSAGE_FIELD
  )
}

export function toggleIn<T>(values: readonly T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : values.concat(value)
}

// Un seul filtre par champ : le nouveau remplace l'ancien, égal ou contient.
// Le user id est toujours une égalité : « 43 » ne doit pas prendre 143 ni 436.
export function pinText(
  criteria: FilterCriteria,
  field: TextField,
  value: string,
  exact: boolean,
): FilterCriteria {
  const exactMatch = exact || field === 'userId'
  const stored = exactMatch && field !== 'userId' ? value : value.trim()
  if (stored === '') return criteria

  const texts = criteria.texts
    .filter((current) => current.field !== field)
    .concat({ field, value: stored, exact: exactMatch })

  return { ...criteria, texts }
}

export function removeChip(
  criteria: FilterCriteria,
  id: string,
): FilterCriteria {
  if (id === 'levels') return { ...criteria, levels: [] }
  if (id === 'services') return { ...criteria, services: [] }
  if (id === 'statuses') return { ...criteria, statuses: [] }
  if (id === 'period') {
    return {
      ...criteria,
      periodMode: 'none',
      lastMs: 0,
      fromStr: '',
      toStr: '',
    }
  }
  if (id === 'duration') return { ...criteria, minD: '', maxD: '' }

  const index = textChipIndex(id)
  if (index === null) return criteria
  return {
    ...criteria,
    texts: criteria.texts.filter((_, textIndex) => textIndex !== index),
  }
}

export function periodFromForm(criteria: FilterCriteria): {
  period: PeriodFilter | null
  error: boolean
} {
  if (criteria.periodMode === 'none') return { period: null, error: false }
  if (criteria.periodMode === 'last') {
    return { period: { kind: 'last', ms: criteria.lastMs }, error: false }
  }

  const from = parseDatetimeLocal(criteria.fromStr)
  const to = parseDatetimeLocal(criteria.toStr)
  const error = from !== null && to !== null && to < from
  if (error || (from === null && to === null)) return { period: null, error }
  return { period: { kind: 'range', from, to }, error: false }
}

export function durationFromForm(criteria: FilterCriteria): {
  min: number | null
  max: number | null
  error: boolean
} {
  const min = parseDurationBound(criteria.minD)
  const max = parseDurationBound(criteria.maxD)
  if (min !== null && max !== null && max < min) {
    return { min: null, max: null, error: true }
  }
  return { min, max, error: false }
}

// Traduit le formulaire. Une durée ou une période invalide n'est pas appliquée.
export function filtersFromForm(criteria: FilterCriteria): Filters {
  const duration = durationFromForm(criteria)
  return {
    levels: criteria.levels,
    services: criteria.services,
    statuses: criteria.statuses,
    texts: criteria.texts,
    period: periodFromForm(criteria).period,
    minDurationMs: duration.min,
    maxDurationMs: duration.max,
  }
}

// Le glisser du graphique pose une période custom, au format datetime-local.
export function criteriaWithCustomRange(
  criteria: FilterCriteria,
  from: number,
  to: number,
): FilterCriteria {
  return {
    ...criteria,
    periodMode: 'custom',
    lastMs: 0,
    fromStr: formatDatetimeLocal(from),
    toStr: formatDatetimeLocal(to),
  }
}

// Passe 1 : niveau, service, statut, durée, texte (ET entre eux).
// Passe 2 : la période, calée sur ce qui reste — voir resolvePeriodBounds.
export function filterLogs(
  logs: readonly LogEntry[],
  filters: Filters,
  draft: TextDraft | null,
): LogEntry[] {
  const texts = activeTexts(filters.texts, draft)
  const durationActive =
    filters.minDurationMs === null ||
    filters.maxDurationMs === null ||
    filters.maxDurationMs >= filters.minDurationMs

  const base = logs.filter(
    (log) =>
      matchesChoices(log, filters) &&
      (durationActive ? matchesDuration(log, filters) : true) &&
      texts.every((text) => matchesText(log, text)),
  )

  const bounds = resolvePeriodBounds(filters.period, base)
  if (!bounds) return base

  return base.filter((log) => matchesPeriod(log, bounds))
}

export function activeChips(filters: Filters): FilterChip[] {
  const chips: FilterChip[] = []

  if (filters.levels.length > 0) {
    chips.push({
      id: 'levels',
      label: `Niveau : ${filters.levels.join(', ')}`,
      removeLabel: 'Retirer le filtre niveau',
    })
  }
  if (filters.services.length > 0) {
    chips.push({
      id: 'services',
      label: `Service : ${filters.services.map((service) => formatService(service)).join(', ')}`,
      removeLabel: 'Retirer le filtre service',
    })
  }
  if (filters.statuses.length > 0) {
    chips.push({
      id: 'statuses',
      label: `Statut : ${filters.statuses.join(', ')}`,
      removeLabel: 'Retirer le filtre statut',
    })
  }
  if (filters.period) chips.push(periodChip(filters.period))
  if (
    durationActive(filters) &&
    (filters.minDurationMs !== null || filters.maxDurationMs !== null)
  ) {
    chips.push({
      id: 'duration',
      label: durationLabel(filters.minDurationMs, filters.maxDurationMs),
      removeLabel: 'Retirer le filtre durée',
    })
  }
  filters.texts.forEach((text, index) => {
    const name = textFieldOption(text.field).chip
    chips.push({
      id: `text:${index}`,
      label: text.exact
        ? `${name} = ${text.value}`
        : `${name} contient « ${text.value} »`,
      removeLabel: 'Retirer ce filtre',
    })
  })

  return chips
}

export function resultsCountLabel(matched: number): string {
  if (matched > 1) return `${formatCount(matched)} logs correspondent`
  if (matched === 1) return '1 log correspond'
  return '0 log ne correspond'
}

export function newestTimestamp(logs: readonly LogEntry[]): number | null {
  let newest: number | null = null
  for (const log of logs) {
    const time = Date.parse(log.timestamp)
    if (Number.isNaN(time)) continue
    if (newest === null || time > newest) newest = time
  }
  return newest
}

export function formatDatetimeLocal(ms: number): string {
  const date = new Date(ms)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// datetime-local n'a pas de fuseau : on reconstruit une date locale.
// Une date que Date corrigerait (31 février) est rejetée.
export function parseDatetimeLocal(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value,
  )
  if (!match) return null

  const year = numberAt(match, 1)
  const month = numberAt(match, 2)
  const day = numberAt(match, 3)
  const hour = numberAt(match, 4)
  const minute = numberAt(match, 5)
  const second = match[6] === undefined ? 0 : numberAt(match, 6)
  if (
    year === null ||
    month === null ||
    day === null ||
    hour === null ||
    minute === null ||
    second === null
  ) {
    return null
  }

  const date = new Date(year, month - 1, day, hour, minute, second)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date.getTime()
}

function formatPeriodBound(ms: number): string {
  const date = new Date(ms)
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function activeTexts(
  texts: readonly TextFilter[],
  draft: TextDraft | null,
): TextFilter[] {
  const value = draft?.value.trim() ?? ''
  if (!draft || value === '') return [...texts]
  // Tant que l'on tape, le brouillon tient lieu de filtre de ce champ.
  const next: TextFilter = {
    field: draft.field,
    value,
    exact: draft.field === 'userId',
  }
  return texts.filter((text) => text.field !== draft.field).concat(next)
}

function matchesChoices(log: LogEntry, filters: Filters): boolean {
  if (filters.levels.length > 0 && !filters.levels.includes(log.level)) {
    return false
  }
  if (filters.services.length > 0 && !filters.services.includes(log.service)) {
    return false
  }
  if (
    filters.statuses.length > 0 &&
    !filters.statuses.includes(log.httpStatus)
  ) {
    return false
  }
  return true
}

function matchesDuration(log: LogEntry, filters: Filters): boolean {
  if (
    filters.minDurationMs !== null &&
    log.durationMs < filters.minDurationMs
  ) {
    return false
  }
  if (
    filters.maxDurationMs !== null &&
    log.durationMs > filters.maxDurationMs
  ) {
    return false
  }
  return true
}

function matchesText(log: LogEntry, filter: TextFilter): boolean {
  if (filter.field === 'message') {
    return filter.exact
      ? log.message === filter.value
      : includes(log.message, filter.value)
  }
  if (filter.field === 'requestId') {
    return filter.exact
      ? log.requestId === filter.value
      : includes(log.requestId, filter.value)
  }
  if (filter.field === 'userId') {
    return String(log.userId) === filter.value
  }
  return filter.exact ? log.id === filter.value : includes(log.id, filter.value)
}

// last : [plus récent de `base` − durée, +∞[. range : bornes saisies.
// null si pas de période, ou si la plage est vide ou inversée.
export function resolvePeriodBounds(
  period: PeriodFilter | null,
  base: readonly LogEntry[],
): { from: number | null; to: number | null } | null {
  if (!period) return null
  if (period.kind === 'range') {
    if (period.from !== null && period.to !== null && period.to < period.from) {
      return null
    }
    if (period.from === null && period.to === null) return null
    return { from: period.from, to: period.to }
  }

  const newest = newestTimestamp(base)
  if (newest === null) return { from: Number.POSITIVE_INFINITY, to: null }
  return { from: newest - period.ms, to: null }
}

function matchesPeriod(
  log: LogEntry,
  bounds: { from: number | null; to: number | null },
): boolean {
  const time = Date.parse(log.timestamp)
  if (Number.isNaN(time)) return false
  if (bounds.from !== null && time < bounds.from) return false
  if (bounds.to !== null && time > bounds.to) return false
  return true
}

function periodChip(period: PeriodFilter): FilterChip {
  if (period.kind === 'last') {
    const preset = PERIOD_PRESETS.find((item) => item.ms === period.ms)
    const label = preset
      ? preset.label.toLowerCase()
      : `${formatCount(period.ms / 1000)} dernières s`
    return {
      id: 'period',
      label: `Période : ${label}`,
      removeLabel: 'Retirer le filtre période',
    }
  }

  const from = period.from === null ? '…' : formatPeriodBound(period.from)
  const to = period.to === null ? '…' : formatPeriodBound(period.to)
  return {
    id: 'period',
    label: `Période : ${from} → ${to}`,
    removeLabel: 'Retirer le filtre période',
  }
}

function durationLabel(min: number | null, max: number | null): string {
  if (min !== null && max !== null) {
    return `Durée : ${formatCount(min)} – ${formatCount(max)} ms`
  }
  if (min !== null) return `Durée : ≥ ${formatCount(min)} ms`
  return `Durée : ≤ ${formatCount(max ?? 0)} ms`
}

function durationActive(filters: Filters): boolean {
  return (
    filters.minDurationMs === null ||
    filters.maxDurationMs === null ||
    filters.maxDurationMs >= filters.minDurationMs
  )
}

function parseDurationBound(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function includes(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

function textChipIndex(id: string): number | null {
  if (!id.startsWith('text:')) return null
  const index = Number(id.slice('text:'.length))
  return Number.isInteger(index) && index >= 0 ? index : null
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function numberAt(match: RegExpExecArray, index: number): number | null {
  const raw = match[index]
  if (raw === undefined) return null
  return Number(raw)
}
