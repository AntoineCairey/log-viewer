import {
  isChartBucketMs,
  isLogChartGroup,
  type ChartBucketMs,
  type LogChartGroup,
} from './logChartSeries.ts'
import {
  INITIAL_CRITERIA,
  isTextField,
  type FilterCriteria,
  type TextField,
  type TextFilter,
} from './filterLogs.ts'
import { LOG_LEVELS, type LogLevel } from '../types/log.ts'

// Deux clés : le formulaire de filtres, et l'affichage du graphique.
// Une valeur illisible ou inattendue revient au réglage d'origine.
export const FILTERS_STORAGE_KEY = 'log-viewer.filters'
export const CHART_STORAGE_KEY = 'log-viewer.chart'

export type ChartPreferences = {
  visible: boolean
  group: LogChartGroup
  bucketMs: ChartBucketMs
}

export const DEFAULT_CHART_PREFERENCES: ChartPreferences = {
  visible: true,
  group: 'level',
  bucketMs: 5_000,
}

export function readFilterCriteria(): FilterCriteria {
  const stored = readStored(FILTERS_STORAGE_KEY)
  if (stored === undefined) return INITIAL_CRITERIA
  return parseFilterCriteria(stored)
}

export function writeFilterCriteria(criteria: FilterCriteria): void {
  writeStored(FILTERS_STORAGE_KEY, criteria)
}

export function readChartPreferences(): ChartPreferences {
  const stored = readStored(CHART_STORAGE_KEY)
  if (stored === undefined) return DEFAULT_CHART_PREFERENCES
  return parseChartPreferences(stored)
}

export function writeChartPreferences(preferences: ChartPreferences): void {
  writeStored(CHART_STORAGE_KEY, preferences)
}

export function parseFilterCriteria(value: unknown): FilterCriteria {
  if (!isRecord(value)) return INITIAL_CRITERIA
  return {
    levels: parseLevels(value.levels),
    services: parseStrings(value.services),
    statuses: parseStatuses(value.statuses),
    texts: parseTexts(value.texts),
    periodMode: parsePeriodMode(value.periodMode),
    lastMs: parseLastMs(value.lastMs),
    fromStr: parseInput(value.fromStr, 32),
    toStr: parseInput(value.toStr, 32),
    minD: parseInput(value.minD, 16),
    maxD: parseInput(value.maxD, 16),
  }
}

export function parseChartPreferences(value: unknown): ChartPreferences {
  if (!isRecord(value)) return DEFAULT_CHART_PREFERENCES
  return {
    visible:
      typeof value.visible === 'boolean'
        ? value.visible
        : DEFAULT_CHART_PREFERENCES.visible,
    group: isLogChartGroup(value.group)
      ? value.group
      : DEFAULT_CHART_PREFERENCES.group,
    bucketMs: isChartBucketMs(value.bucketMs)
      ? value.bucketMs
      : DEFAULT_CHART_PREFERENCES.bucketMs,
  }
}

function readStored(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return undefined
    return JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
}

function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota dépassé ou stockage bloqué : l'écran reste utilisable.
  }
}

function parseLevels(value: unknown): LogLevel[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<LogLevel>()
  const levels: LogLevel[] = []
  for (const item of value) {
    if (!isLogLevel(item) || seen.has(item)) continue
    seen.add(item)
    levels.push(item)
  }
  return levels
}

function parseStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const strings: string[] = []
  for (const item of value) {
    if (typeof item !== 'string' || item === '' || seen.has(item)) continue
    seen.add(item)
    strings.push(item)
  }
  return strings
}

function parseStatuses(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<number>()
  const statuses: number[] = []
  for (const item of value) {
    if (!isInteger(item) || item < 0 || seen.has(item)) continue
    seen.add(item)
    statuses.push(item)
  }
  return statuses
}

// Un seul filtre par champ : le dernier enregistré remplace les précédents.
function parseTexts(value: unknown): TextFilter[] {
  if (!Array.isArray(value)) return []

  const parsed: TextFilter[] = []
  for (const item of value) {
    const text = parseText(item)
    if (text) parsed.push(text)
  }

  const seen = new Set<TextField>()
  const unique: TextFilter[] = []
  for (const text of parsed.toReversed()) {
    if (seen.has(text.field)) continue
    seen.add(text.field)
    unique.push(text)
  }
  return unique.toReversed()
}

function parseText(value: unknown): TextFilter | null {
  if (!isRecord(value) || typeof value.field !== 'string') return null
  if (!isTextField(value.field)) return null
  if (typeof value.value !== 'string' || typeof value.exact !== 'boolean') {
    return null
  }

  const field = value.field
  const exact = field === 'userId' ? true : value.exact
  const stored = exact && field !== 'userId' ? value.value : value.value.trim()
  if (stored === '') return null
  return { field, value: stored, exact }
}

function parsePeriodMode(value: unknown): FilterCriteria['periodMode'] {
  if (value === 'none' || value === 'last' || value === 'custom') return value
  return 'none'
}

function parseLastMs(value: unknown): number {
  if (!isInteger(value) || value < 0) return 0
  return value
}

function parseInput(value: unknown, maxLength: number): string {
  if (typeof value !== 'string' || value.length > maxLength) return ''
  return value
}

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
