import { formatService } from './formatLog.ts'
import { LOG_LEVELS, type LogEntry, type LogLevel } from '../types/log.ts'

// Compte les logs par tranche et prépare séries, axe Y et graduations.
// `domainLogs` donne l'étendue par défaut (du plus ancien au plus récent).
// `countedLogs` est ce qu'on additionne. `window` zoome sur la période choisie.
export const LOG_CHART_BUCKET_MS = 1_000

export type LogChartGroup = 'total' | 'level' | 'service' | 'status'

export type LogChartSeries = {
  key: string
  label: string
  color: string
  dash?: string
  values: number[]
  total: number
}

export type LogChartTick = {
  value: number
  label: string
  showDate: boolean
}

export type LogChartData = {
  startMs: number
  endMs: number
  bucketMs: number
  bucketCount: number
  series: LogChartSeries[]
  yMax: number
  yTicks: number[]
  xTicks: LogChartTick[]
}

type SeriesDefinition = Omit<LogChartSeries, 'values' | 'total'>

const LEVEL_DEFINITIONS: Record<LogLevel, SeriesDefinition> = {
  debug: { key: 'debug', label: 'debug', color: '#8a94a3' },
  info: { key: 'info', label: 'info', color: '#4a90e2' },
  warning: { key: 'warning', label: 'warning', color: '#e8b04b' },
  error: { key: 'error', label: 'error', color: '#f0715f' },
  critical: { key: 'critical', label: 'critical', color: '#ff4f9a' },
}

// Jaune, rouge, bleu, vert, puis d'autres teintes si davantage de services.
const SERVICE_COLORS = [
  '#FFE14D',
  '#FF3B3B',
  '#4C8DFF',
  '#3DDC6A',
  '#FF7A33',
  '#FF4D8D',
  '#7EE0FF',
  '#C084FC',
  '#F4F7FB',
  '#FFB45A',
  '#2DD4BF',
  '#C8F542',
] as const

const STATUS_COLORS: Record<string, string> = {
  '200': '#3DDC6A',
  '201': '#4C8DFF',
  '204': '#2DD4BF',
  '301': '#818CF8',
  '302': '#22D3EE',
  '304': '#A5B4FC',
  '400': '#FFE14D',
  '401': '#FF7A33',
  '403': '#FFB45A',
  '404': '#C5CED8',
  '409': '#C084FC',
  '422': '#F4F7FB',
  '429': '#FF4D8D',
  '500': '#FF3B3B',
  '502': '#FF8A9B',
  '503': '#FF4D6D',
  '504': '#E11D48',
}

const EXTRA_STATUS_COLORS = [
  '#C8F542',
  '#7EE0FF',
  '#FFB020',
  '#9AA8FF',
  '#86EFAC',
  '#FB923C',
] as const

const X_STEPS = [
  5_000, 10_000, 15_000, 30_000, 60_000, 120_000, 300_000, 600_000, 900_000,
  1_800_000, 3_600_000,
] as const

const timeFormat = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

export function buildLogChartData(
  domainLogs: readonly LogEntry[],
  countedLogs: readonly LogEntry[],
  group: LogChartGroup,
  bucketMs = LOG_CHART_BUCKET_MS,
  window: { from: number | null; to: number | null } | null = null,
): LogChartData | null {
  const bounds = chartBounds(domainLogs, bucketMs, window)
  if (!bounds) return null

  const { startMs, endMs } = bounds
  const bucketCount = Math.max(1, (endMs - startMs) / bucketMs)
  const definitions = seriesDefinitions(countedLogs, group)
  const byKey = new Map(
    definitions.map((definition, index) => [definition.key, index]),
  )
  const values = definitions.map(() => Array<number>(bucketCount).fill(0))
  const totals = definitions.map(() => 0)

  for (const log of countedLogs) {
    const timestamp = Date.parse(log.timestamp)
    if (Number.isNaN(timestamp) || timestamp < startMs || timestamp >= endMs) {
      continue
    }
    const key = seriesKey(log, group)
    const seriesIndex = byKey.get(key)
    if (seriesIndex === undefined) continue
    const bucketIndex = Math.floor((timestamp - startMs) / bucketMs)
    const seriesValues = values[seriesIndex]
    if (!seriesValues) continue
    seriesValues[bucketIndex] = (seriesValues[bucketIndex] ?? 0) + 1
    totals[seriesIndex] = (totals[seriesIndex] ?? 0) + 1
  }

  // Une série sans aucun log dans la fenêtre n'est pas dessinée.
  const series = definitions.flatMap((definition, index) => {
    const total = totals[index] ?? 0
    const seriesValues = values[index]
    if (total === 0 || !seriesValues) return []
    return [{ ...definition, values: seriesValues, total }]
  })
  const peak = series.reduce(
    (maximum, item) =>
      item.values.reduce(
        (innerMaximum, value) => Math.max(innerMaximum, value),
        maximum,
      ),
    0,
  )
  const { yMax, yTicks } = yScale(peak)

  return {
    startMs,
    endMs,
    bucketMs,
    bucketCount,
    series,
    yMax,
    yTicks,
    xTicks: buildTimeTicks(startMs, endMs),
  }
}

// Glisser sur le graphe : deux fractions de la largeur, bornes à la seconde.
export function rangeFromFractions(
  startMs: number,
  endMs: number,
  first: number,
  second: number,
): { from: number; to: number } {
  const span = endMs - startMs
  const low = clamp(Math.min(first, second), 0, 1)
  const high = clamp(Math.max(first, second), 0, 1)
  let from = Math.round((startMs + low * span) / 1000) * 1000
  let to = Math.round((startMs + high * span) / 1000) * 1000
  if (from >= endMs) from = Math.max(startMs, endMs - 1000)
  if (to <= from) to = Math.min(endMs, from + 1000)
  return { from, to }
}

// Sans période, l'axe couvre tout le buffer. Sinon il se cale sur `window`.
function chartBounds(
  logs: readonly LogEntry[],
  bucketMs: number,
  window: { from: number | null; to: number | null } | null,
): { startMs: number; endMs: number } | null {
  const domain = timestampDomain(logs)
  if (!domain) return null

  const from = window?.from ?? domain.min
  const to = window?.to ?? domain.max
  const startMs = floorBucket(from <= to ? from : domain.min, bucketMs)
  const endMs = floorBucket(from <= to ? to : domain.max, bucketMs) + bucketMs
  return { startMs, endMs: Math.max(endMs, startMs + bucketMs) }
}

function timestampDomain(
  logs: readonly LogEntry[],
): { min: number; max: number } | null {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const log of logs) {
    const timestamp = Date.parse(log.timestamp)
    if (Number.isNaN(timestamp)) continue
    min = Math.min(min, timestamp)
    max = Math.max(max, timestamp)
  }
  return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null
}

function seriesDefinitions(
  logs: readonly LogEntry[],
  group: LogChartGroup,
): SeriesDefinition[] {
  if (group === 'total') {
    return [{ key: 'total', label: 'Total', color: '#3987e5' }]
  }
  if (group === 'level') {
    return LOG_LEVELS.map((level) => LEVEL_DEFINITIONS[level])
  }

  const keys = new Set<string>()
  for (const log of logs) keys.add(seriesKey(log, group))
  return [...keys]
    .sort(group === 'status' ? compareNumericStrings : undefined)
    .map((key, index) => ({
      key,
      label: group === 'service' ? formatService(key) : key,
      color: group === 'status' ? colorForStatus(key) : colorForService(index),
    }))
}

function seriesKey(log: LogEntry, group: LogChartGroup): string {
  if (group === 'total') return 'total'
  if (group === 'level') return log.level
  if (group === 'service') return log.service
  return String(log.httpStatus)
}

function colorForService(index: number): string {
  return SERVICE_COLORS[index % SERVICE_COLORS.length] ?? SERVICE_COLORS[0]
}

function colorForStatus(key: string): string {
  const known = STATUS_COLORS[key]
  if (known) return known
  const code = Number(key)
  if (!Number.isInteger(code)) return EXTRA_STATUS_COLORS[0]
  return (
    EXTRA_STATUS_COLORS[Math.abs(code) % EXTRA_STATUS_COLORS.length] ??
    EXTRA_STATUS_COLORS[0]
  )
}

function compareNumericStrings(left: string, right: string): number {
  return Number(left) - Number(right)
}

function floorBucket(timestamp: number, bucketMs: number): number {
  return Math.floor(timestamp / bucketMs) * bucketMs
}

// Graduations en 1, 2 ou 5 × 10ⁿ, pour que l'axe reste lisible.
function yScale(peak: number): { yMax: number; yTicks: number[] } {
  if (peak <= 0) return { yMax: 1, yTicks: [0, 1] }
  const rawStep = peak / 5
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  const multiplier =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  const step = Math.max(1, multiplier * magnitude)
  const yMax = Math.ceil(peak / step) * step
  const yTicks: number[] = []
  for (let value = 0; value <= yMax; value += step) yTicks.push(value)
  return { yMax, yTicks }
}

function buildTimeTicks(startMs: number, endMs: number): LogChartTick[] {
  const span = endMs - startMs
  const step =
    X_STEPS.find((candidate) => span / candidate <= 7) ?? X_STEPS.at(-1)!
  // Les heures de début et de fin sont centrées sur les bords :
  // une graduation ronde trop proche les recouvrirait.
  const minGap = span * 0.1
  const values = [startMs]
  for (
    let value = Math.ceil(startMs / step) * step;
    value < endMs;
    value += step
  ) {
    if (value - startMs < minGap || endMs - value < minGap) continue
    values.push(value)
  }
  if (values.at(-1) !== endMs) values.push(endMs)

  let previousDay = ''
  return values.map((value, index) => {
    const date = new Date(value)
    const day = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    const showDate = index === 0 || day !== previousDay
    previousDay = day
    return { value, label: timeFormat.format(date), showDate }
  })
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
