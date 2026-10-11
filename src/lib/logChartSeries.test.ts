import { describe, expect, it } from 'vitest'
import {
  LOG_CHART_BUCKET_MS,
  buildLogChartData,
  rangeFromFractions,
} from './logChartSeries.ts'
import type { LogEntry } from '../types/log.ts'

const origin = Date.parse('2026-01-15T10:00:00.000Z')

function log(
  id: string,
  offsetMs: number,
  partial: Partial<LogEntry> = {},
): LogEntry {
  return {
    id,
    timestamp: new Date(origin + offsetMs).toISOString(),
    level: 'info',
    service: 'auth-service',
    message: 'Order created',
    durationMs: 200,
    requestId: `req-${id}`,
    userId: 380,
    httpStatus: 200,
    ...partial,
  }
}

describe('buildLogChartData', () => {
  it('aligne les tranches sur 1 seconde et conserve les trous', () => {
    const logs = [log('a', 100), log('b', 2_500)]
    const data = buildLogChartData(logs, logs, 'total')

    expect(data).not.toBeNull()
    expect(data?.bucketMs).toBe(LOG_CHART_BUCKET_MS)
    expect(data?.bucketCount).toBe(3)
    expect(data?.series[0]?.values).toEqual([1, 0, 1])
  })

  it('garde le domaine mémoire quand les logs comptés sont filtrés', () => {
    const domain = [log('old', 0), log('new', 3_000)]
    const data = buildLogChartData(domain, [domain[1]!], 'total')

    expect(data?.bucketCount).toBe(4)
    expect(data?.series[0]?.values).toEqual([0, 0, 0, 1])
  })

  it('regroupe par niveau dans un ordre fixe et masque les séries vides', () => {
    const logs = [
      log('info', 0),
      log('error', 1_000, { level: 'error' }),
      log('debug', 6_000, { level: 'debug' }),
    ]
    const data = buildLogChartData(logs, logs, 'level')

    expect(data?.series.map((series) => series.key)).toEqual([
      'debug',
      'info',
      'error',
    ])
    expect(
      data?.series.find((series) => series.key === 'debug')?.dash,
    ).toBeUndefined()
  })

  it('attribue aux services des couleurs distinctes', () => {
    const logs = [
      log('alpha', 0, { service: 'alpha-service' }),
      log('beta', 1_000, { service: 'beta-service' }),
      log('gamma', 2_000, { service: 'gamma-service' }),
      log('delta', 3_000, { service: 'delta-service' }),
    ]
    const colors = buildLogChartData(logs, logs, 'service')?.series.map(
      (series) => series.color,
    )

    expect(colors).toEqual(['#FFE14D', '#FF3B3B', '#4C8DFF', '#3DDC6A'])
  })

  it('colore les statuts selon leur famille, avec des variantes distinctes', () => {
    const logs = [
      log('ok', 0, { httpStatus: 200 }),
      log('created', 1_000, { httpStatus: 201 }),
      log('missing', 2_000, { httpStatus: 404 }),
      log('bad', 2_500, { httpStatus: 400 }),
      log('denied', 3_000, { httpStatus: 401 }),
      log('boom', 4_000, { httpStatus: 500 }),
      log('down', 5_000, { httpStatus: 503 }),
    ]
    const byKey = Object.fromEntries(
      buildLogChartData(logs, logs, 'status')?.series.map((series) => [
        series.key,
        series.color,
      ]) ?? [],
    )

    expect(byKey['200']).toBe('#3DDC6A')
    expect(byKey['201']).toBe('#4C8DFF')
    expect(byKey['400']).toBe('#FFE14D')
    expect(byKey['401']).toBe('#FF7A33')
    expect(byKey['404']).toBe('#C5CED8')
    expect(byKey['500']).toBe('#FF3B3B')
    expect(byKey['503']).toBe('#FF4D6D')
  })

  it('masque une graduation alignée trop proche du début', () => {
    const logs = [log('a', 0), log('b', 80_000)]
    const data = buildLogChartData(logs, logs, 'total', 1_000, {
      from: origin + 9_200,
      to: origin + 69_200,
    })
    const offsets = data?.xTicks.map((tick) => tick.value - origin)

    expect(offsets?.[0]).toBe(9_000)
    expect(offsets?.at(-1)).toBe(70_000)
    expect(offsets).not.toContain(10_000)
    expect(offsets).toContain(20_000)
  })

  it('affiche l’heure de fin et masque une graduation trop proche', () => {
    const logs = [log('a', 0), log('b', 80_000)]
    const data = buildLogChartData(logs, logs, 'total', 1_000, {
      from: origin,
      to: origin + 61_200,
    })
    const offsets = data?.xTicks.map((tick) => tick.value - origin)

    expect(offsets?.[0]).toBe(0)
    expect(offsets?.at(-1)).toBe(62_000)
    expect(offsets).not.toContain(60_000)
    expect(offsets).toContain(50_000)
  })

  it('regroupe les services et statuts avec un ordre déterministe', () => {
    const logs = [
      log('payment', 0, { service: 'payment-service', httpStatus: 503 }),
      log('auth', 1_000, { service: 'auth-service', httpStatus: 200 }),
      log('not-found', 2_000, {
        service: 'auth-service',
        httpStatus: 404,
      }),
    ]

    expect(
      buildLogChartData(logs, logs, 'service')?.series.map((series) => [
        series.key,
        series.label,
        series.total,
      ]),
    ).toEqual([
      ['auth-service', 'auth', 2],
      ['payment-service', 'payment', 1],
    ])
    expect(
      buildLogChartData(logs, logs, 'status')?.series.map(
        (series) => series.key,
      ),
    ).toEqual(['200', '404', '503'])
  })

  it('ignore les dates invalides et gère une mémoire sans date valide', () => {
    const invalid = { ...log('bad', 0), timestamp: 'pas une date' }
    const valid = log('valid', 0)
    expect(buildLogChartData([invalid], [invalid], 'total')).toBeNull()
    expect(
      buildLogChartData([valid, invalid], [valid, invalid], 'total'),
    ).not.toBeNull()
  })

  it('rassemble les logs d’une tranche de 5 secondes', () => {
    const logs = [log('a', 100), log('b', 2_500)]
    const data = buildLogChartData(logs, logs, 'total', 5_000)

    expect(data?.bucketCount).toBe(1)
    expect(data?.series[0]?.values).toEqual([2])
  })

  it('occupe toute la largeur avec la période demandée', () => {
    const logs = [log('old', 0), log('mid', 5_000), log('new', 20_000)]
    const data = buildLogChartData(logs, logs, 'total', 1_000, {
      from: origin + 4_000,
      to: origin + 6_000,
    })

    expect(data?.startMs).toBe(origin + 4_000)
    expect(data?.endMs).toBe(origin + 7_000)
    expect(data?.series[0]?.values).toEqual([0, 1, 0])
  })

  it('laisse le bord ouvert de la période jusqu’à la mémoire', () => {
    const logs = [log('old', 0), log('new', 4_000)]
    const data = buildLogChartData(logs, logs, 'total', 1_000, {
      from: origin + 3_000,
      to: null,
    })

    expect(data?.startMs).toBe(origin + 3_000)
    expect(data?.endMs).toBe(origin + 5_000)
    expect(data?.series[0]?.values).toEqual([0, 1])
  })

  it('produit au plus cinq intervalles verticaux', () => {
    const logs = Array.from({ length: 23 }, (_, index) => log(String(index), 0))
    const data = buildLogChartData(logs, logs, 'total')

    expect(data?.yMax).toBeGreaterThanOrEqual(23)
    expect((data?.yTicks.length ?? 0) - 1).toBeLessThanOrEqual(5)
  })
})

describe('helpers d’interaction', () => {
  it('convertit un glisser dans les deux sens et arrondit à la seconde', () => {
    expect(rangeFromFractions(origin, origin + 20_000, 0.75, 0.2)).toEqual({
      from: origin + 4_000,
      to: origin + 15_000,
    })
  })

  it('garantit une plage non vide et borne les fractions', () => {
    expect(rangeFromFractions(origin, origin + 20_000, -1, -1)).toEqual({
      from: origin,
      to: origin + 1_000,
    })
    expect(rangeFromFractions(origin, origin + 20_000, 1, 1)).toEqual({
      from: origin + 19_000,
      to: origin + 20_000,
    })
  })
})
