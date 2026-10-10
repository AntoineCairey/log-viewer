import { describe, expect, it } from 'vitest'
import { readNdjsonLines } from './ndjsonBuffer.ts'
import { parseLog } from './parseLog.ts'

const payload = JSON.stringify({
  id: '4cd74a2b-0a6a-482b-88c9-1f97be083f19',
  timestamp: '2026-10-10T12:35:02.745903Z',
  level: 'debug',
  service: 'notification-service',
  message: 'Query plan computed',
  duration_ms: 227,
  metadata: {
    request_id: 'd107df59df49',
    user_id: 209,
    http_status: 200,
  },
})

describe('readNdjsonLines', () => {
  it('extrait une ligne terminée et garde le fragment incomplet', () => {
    const splitAt = 20
    const stream = `${payload}\n${payload.slice(0, splitAt)}`
    const { lines, rest } = readNdjsonLines(stream)

    expect(lines).toEqual([payload])
    expect(parseLog(lines[0] ?? '')?.message).toBe('Query plan computed')
    expect(rest).toBe(payload.slice(0, splitAt))
  })

  it('reconstitue un JSON coupé entre deux chunks', () => {
    const first = readNdjsonLines(payload.slice(0, 30))
    const second = readNdjsonLines(`${first.rest}${payload.slice(30)}\n{"id":`)

    expect(second.lines).toEqual([payload])
    expect(second.rest).toBe('{"id":')
  })

  it('lit la dernière ligne quand le flux se ferme sans retour à la ligne', () => {
    const { lines, rest } = readNdjsonLines(payload, true)

    expect(lines).toEqual([payload])
    expect(rest).toBe('')
  })
})
