import { describe, expect, it } from 'vitest'
import { formatCount } from './formatLog.ts'
import {
  INITIAL_CRITERIA,
  activeChips,
  durationFromForm,
  filterLogs,
  filtersFromForm,
  periodFromForm,
  pinText,
  removeChip,
  resultsCountLabel,
  toggleIn,
  type FilterCriteria,
  type Filters,
} from './filterLogs.ts'
import type { LogEntry as Entry } from '../types/log.ts'

function log(partial: Partial<Entry> & Pick<Entry, 'id'>): Entry {
  return {
    timestamp: '2026-01-15T10:00:00.000Z',
    level: 'info',
    service: 'auth-service',
    message: 'Order created',
    durationMs: 200,
    requestId: 'req-1',
    userId: 380,
    httpStatus: 200,
    ...partial,
  }
}

const emptyFilters: Filters = {
  levels: [],
  services: [],
  statuses: [],
  texts: [],
  period: null,
  minDurationMs: null,
  maxDurationMs: null,
}

const origin = Date.parse('2026-01-15T10:00:00.000Z')

function at(offsetMs: number): string {
  return new Date(origin + offsetMs).toISOString()
}

describe('filterLogs', () => {
  const logs = [
    log({
      id: 'a',
      level: 'error',
      service: 'payment-service',
      httpStatus: 500,
    }),
    log({ id: 'b', level: 'info', message: 'User logged in' }),
    log({ id: 'c', level: 'warning', durationMs: 1500, httpStatus: 404 }),
  ]

  it('conserve tout, dans l’ordre, sans filtre', () => {
    expect(
      filterLogs(logs, emptyFilters, null).map((entry) => entry.id),
    ).toEqual(['a', 'b', 'c'])
  })

  it('combine les choix multiples en OU, et les catégories en ET', () => {
    const filters: Filters = {
      ...emptyFilters,
      levels: ['info', 'warning'],
      services: ['auth-service'],
    }
    expect(filterLogs(logs, filters, null).map((entry) => entry.id)).toEqual([
      'b',
      'c',
    ])
  })

  it('ignore une liste de choix vide', () => {
    expect(
      filterLogs(logs, { ...emptyFilters, levels: [] }, null),
    ).toHaveLength(3)
  })

  it('filtre le statut HTTP en OU', () => {
    const filters: Filters = { ...emptyFilters, statuses: [404, 500] }
    expect(filterLogs(logs, filters, null).map((entry) => entry.id)).toEqual([
      'a',
      'c',
    ])
  })

  it('cherche un texte contenu, sans tenir compte de la casse', () => {
    const draft = { field: 'message' as const, value: 'user LOGGED' }
    expect(
      filterLogs(logs, emptyFilters, draft).map((entry) => entry.id),
    ).toEqual(['b'])
  })

  it('ignore un brouillon vide', () => {
    expect(
      filterLogs(logs, emptyFilters, { field: 'message', value: '   ' }),
    ).toHaveLength(3)
  })

  it('exige tous les textes épinglés, et distingue contient et exact', () => {
    const withIds = [
      log({ id: 'exact', requestId: 'abc', userId: 38, message: 'abc' }),
      log({ id: 'prefix', requestId: 'abcd', userId: 380, message: 'abcd' }),
    ]
    const filters: Filters = {
      ...emptyFilters,
      texts: [
        { field: 'requestId', value: 'abc', exact: true },
        { field: 'message', value: 'abc', exact: false },
      ],
    }
    expect(filterLogs(withIds, filters, null).map((entry) => entry.id)).toEqual(
      ['exact'],
    )
  })

  it('compare le user id en entier, y compris depuis la barre de recherche', () => {
    const users = [
      log({ id: 'short', userId: 43 }),
      log({ id: 'longer', userId: 143 }),
      log({ id: 'other', userId: 436 }),
    ]
    expect(
      filterLogs(users, emptyFilters, { field: 'userId', value: '43' }).map(
        (entry) => entry.id,
      ),
    ).toEqual(['short'])
  })

  it('le brouillon remplace le filtre déjà épinglé sur le même champ', () => {
    const filters: Filters = {
      ...emptyFilters,
      texts: [{ field: 'message', value: 'order', exact: false }],
    }
    expect(
      filterLogs(logs, filters, { field: 'message', value: 'logged' }).map(
        (entry) => entry.id,
      ),
    ).toEqual(['b'])
  })

  it('cherche un log id qui contient le texte', () => {
    expect(
      filterLogs(logs, emptyFilters, { field: 'logId', value: 'b' }).map(
        (entry) => entry.id,
      ),
    ).toEqual(['b'])
  })

  it('borne la durée, et n’applique pas une plage inversée', () => {
    const slow = filterLogs(
      logs,
      { ...emptyFilters, minDurationMs: 1000 },
      null,
    )
    expect(slow.map((entry) => entry.id)).toEqual(['c'])

    const fast = filterLogs(logs, { ...emptyFilters, maxDurationMs: 100 }, null)
    expect(fast).toHaveLength(0)

    const inverted = filterLogs(
      logs,
      { ...emptyFilters, minDurationMs: 500, maxDurationMs: 100 },
      null,
    )
    expect(inverted).toHaveLength(3)
  })

  it('filtre une période par un seul bord, et ignore une fin avant le début', () => {
    const timed = [
      log({ id: 'old', timestamp: at(0) }),
      log({ id: 'new', timestamp: at(60_000) }),
    ]
    const fromOnly: Filters = {
      ...emptyFilters,
      period: { kind: 'range', from: origin + 30_000, to: null },
    }
    expect(filterLogs(timed, fromOnly, null).map((entry) => entry.id)).toEqual([
      'new',
    ])

    const inverted: Filters = {
      ...emptyFilters,
      period: { kind: 'range', from: origin + 60_000, to: origin },
    }
    expect(filterLogs(timed, inverted, null)).toHaveLength(2)
  })

  it('cale les dernières secondes sur le plus récent déjà retenu', () => {
    const timed = [
      log({
        id: 'error',
        level: 'error',
        timestamp: at(50_000),
      }),
      log({ id: 'recent-info', level: 'info', timestamp: at(40_000) }),
      log({ id: 'old-info', level: 'info', timestamp: at(0) }),
    ]
    const filters: Filters = {
      ...emptyFilters,
      levels: ['info'],
      period: { kind: 'last', ms: 10_000 },
    }
    expect(filterLogs(timed, filters, null).map((entry) => entry.id)).toEqual([
      'recent-info',
    ])
  })

  it('écarte un horodatage illisible quand une période est active', () => {
    const timed = [log({ id: 'bad', timestamp: 'pas une date' })]
    const filters: Filters = {
      ...emptyFilters,
      period: { kind: 'range', from: origin, to: null },
    }
    expect(filterLogs(timed, filters, null)).toHaveLength(0)
    expect(filterLogs(timed, emptyFilters, null)).toHaveLength(1)
  })
})

describe('pinText', () => {
  const criteria: FilterCriteria = {
    ...INITIAL_CRITERIA,
    texts: [
      { field: 'userId', value: '12', exact: false },
      { field: 'userId', value: '380', exact: true },
      { field: 'message', value: 'order', exact: false },
    ],
  }

  it('ne garde qu’un filtre par champ, et le user id est une égalité', () => {
    const next = pinText(criteria, 'userId', '99', false)
    expect(next.texts).toEqual([
      { field: 'message', value: 'order', exact: false },
      { field: 'userId', value: '99', exact: true },
    ])
  })

  it('remplace un contient par un autre contient', () => {
    const next = pinText(criteria, 'message', 'queued', false)
    expect(next.texts.filter((text) => text.field === 'message')).toEqual([
      { field: 'message', value: 'queued', exact: false },
    ])
  })

  it('n’épingle pas un texte vide', () => {
    expect(pinText(criteria, 'message', '   ', false)).toBe(criteria)
  })
})

describe('activeChips', () => {
  it('regroupe chaque catégorie et détaille les textes', () => {
    const filters: Filters = {
      ...emptyFilters,
      levels: ['error', 'info'],
      services: ['payment-service'],
      statuses: [500],
      period: { kind: 'last', ms: 60_000 },
      minDurationMs: 100,
      maxDurationMs: 1000,
      texts: [{ field: 'requestId', value: 'abc', exact: true }],
    }
    expect(activeChips(filters).map((chip) => chip.label)).toEqual([
      'Niveau : error, info',
      'Service : payment',
      'Statut : 500',
      'Période : dernière minute',
      `Durée : ${formatCount(100)} – ${formatCount(1000)} ms`,
      'request_id = abc',
    ])
  })

  it('décrit une période partielle et une durée ouverte', () => {
    const filters: Filters = {
      ...emptyFilters,
      period: {
        kind: 'range',
        from: null,
        to: Date.UTC(2026, 0, 15, 10, 0, 0),
      },
      minDurationMs: 2000,
    }
    const labels = activeChips(filters).map((chip) => chip.label)
    expect(labels[0]).toMatch(/^Période : … → \d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/)
    expect(labels[1]).toBe(`Durée : ≥ ${formatCount(2000)} ms`)
  })

  it('retire la pastille demandée', () => {
    const criteria: FilterCriteria = {
      ...INITIAL_CRITERIA,
      levels: ['info'],
      texts: [
        { field: 'message', value: 'a', exact: false },
        { field: 'message', value: 'b', exact: false },
      ],
    }
    expect(removeChip(criteria, 'levels').levels).toEqual([])
    expect(
      removeChip(criteria, 'text:0').texts.map((text) => text.value),
    ).toEqual(['b'])
  })
})

describe('saisie période et durée', () => {
  it('signale une fin avant le début sans l’appliquer', () => {
    const criteria: FilterCriteria = {
      ...INITIAL_CRITERIA,
      periodMode: 'custom',
      fromStr: '2026-01-15T12:00:00',
      toStr: '2026-01-15T11:00:00',
    }
    expect(periodFromForm(criteria)).toEqual({ period: null, error: true })
    expect(filtersFromForm(criteria).period).toBeNull()
  })

  it('signale un maximum inférieur au minimum', () => {
    const criteria: FilterCriteria = {
      ...INITIAL_CRITERIA,
      minD: '1000',
      maxD: '100',
    }
    expect(durationFromForm(criteria).error).toBe(true)
    expect(filtersFromForm(criteria).minDurationMs).toBeNull()
  })

  it('lit une seule borne de durée', () => {
    expect(durationFromForm({ ...INITIAL_CRITERIA, maxD: '100' })).toEqual({
      min: null,
      max: 100,
      error: false,
    })
  })
})

describe('resultsCountLabel', () => {
  it('accorde le compteur', () => {
    expect(resultsCountLabel(0)).toBe('0 log ne correspond')
    expect(resultsCountLabel(1)).toBe('1 log correspond')
    expect(resultsCountLabel(2)).toBe('2 logs correspondent')
  })
})

describe('toggleIn', () => {
  it('ajoute puis retire une valeur', () => {
    expect(toggleIn(['info'], 'error')).toEqual(['info', 'error'])
    expect(toggleIn(['info', 'error'], 'info')).toEqual(['error'])
  })
})

describe('parse de la période', () => {
  it('refuse une date impossible', () => {
    const criteria: FilterCriteria = {
      ...INITIAL_CRITERIA,
      periodMode: 'custom',
      fromStr: '2026-02-31T00:00:00',
    }
    expect(periodFromForm(criteria).period).toBeNull()
  })
})
