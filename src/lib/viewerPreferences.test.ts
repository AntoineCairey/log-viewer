import { afterEach, describe, expect, it } from 'vitest'
import { INITIAL_CRITERIA, type FilterCriteria } from './filterLogs.ts'
import {
  CHART_STORAGE_KEY,
  DEFAULT_CHART_PREFERENCES,
  FILTERS_STORAGE_KEY,
  parseChartPreferences,
  parseFilterCriteria,
  readChartPreferences,
  readFilterCriteria,
  writeChartPreferences,
  writeFilterCriteria,
} from './viewerPreferences.ts'

afterEach(() => {
  localStorage.clear()
})

describe('viewerPreferences', () => {
  it('restaure les filtres et ignore les valeurs inattendues', () => {
    const criteria: FilterCriteria = {
      ...INITIAL_CRITERIA,
      levels: ['error', 'info'],
      services: ['auth-service'],
      statuses: [500, 200],
      texts: [{ field: 'message', value: 'timeout', exact: false }],
      periodMode: 'last',
      lastMs: 60_000,
      minD: '100',
      maxD: '1000',
    }

    writeFilterCriteria(criteria)
    expect(readFilterCriteria()).toEqual(criteria)

    localStorage.setItem(
      FILTERS_STORAGE_KEY,
      JSON.stringify({
        levels: ['nope', 'error', 'error'],
        services: ['api', '', 'api'],
        statuses: [200, 200.5, '404'],
        texts: [
          { field: 'message', value: '  timeout  ', exact: false },
          { field: 'nope', value: 'x', exact: true },
          { field: 'userId', value: ' 380 ', exact: false },
          { field: 'message', value: 'paiement', exact: true },
        ],
        periodMode: 'custom',
        lastMs: -1,
        fromStr: '2026-01-15T10:00:00',
        toStr: 12,
        minD: '50',
        maxD: 'beaucoup trop long pour un nombre',
      }),
    )

    expect(readFilterCriteria()).toEqual({
      ...INITIAL_CRITERIA,
      levels: ['error'],
      services: ['api'],
      statuses: [200],
      texts: [
        { field: 'userId', value: '380', exact: true },
        { field: 'message', value: 'paiement', exact: true },
      ],
      periodMode: 'custom',
      fromStr: '2026-01-15T10:00:00',
      minD: '50',
    })
  })

  it('revient aux filtres d’origine si le stockage est illisible', () => {
    localStorage.setItem(FILTERS_STORAGE_KEY, '{')
    expect(readFilterCriteria()).toEqual(INITIAL_CRITERIA)
    expect(parseFilterCriteria(['error'])).toEqual(INITIAL_CRITERIA)
  })

  it('restaure l’affichage du graphique, champ par champ', () => {
    writeChartPreferences({
      visible: false,
      group: 'service',
      bucketMs: 1_000,
    })
    expect(readChartPreferences()).toEqual({
      visible: false,
      group: 'service',
      bucketMs: 1_000,
    })

    localStorage.setItem(
      CHART_STORAGE_KEY,
      JSON.stringify({ visible: false, group: 'hourly', bucketMs: 7 }),
    )
    expect(readChartPreferences()).toEqual({
      ...DEFAULT_CHART_PREFERENCES,
      visible: false,
    })
    expect(parseChartPreferences(null)).toEqual(DEFAULT_CHART_PREFERENCES)
  })
})
