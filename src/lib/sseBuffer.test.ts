import { describe, expect, it } from 'vitest'
import { parseLog } from './parseLog.ts'
import { readSseData } from './sseBuffer.ts'

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

describe('readSseData', () => {
  it('extrait un événement terminé et garde le fragment incomplet', () => {
    const splitAt = 20
    const stream = `data: ${payload}\n\ndata: ${payload.slice(0, splitAt)}`
    const { data, rest } = readSseData(stream)

    expect(data).toEqual([payload])
    expect(parseLog(data[0] ?? '')?.message).toBe('Query plan computed')
    expect(rest).toBe(`data: ${payload.slice(0, splitAt)}`)
  })

  it('reconstitue un JSON coupé entre deux chunks', () => {
    const first = readSseData(`data: ${payload.slice(0, 30)}`)
    const second = readSseData(
      `${first.rest}${payload.slice(30)}\n\ndata: {"id":`,
    )

    expect(second.data).toEqual([payload])
    expect(second.rest).toBe('data: {"id":')
  })

  it('lit le dernier événement quand le flux se ferme sans ligne vide', () => {
    const { data, rest } = readSseData(`data: ${payload}`, true)

    expect(data).toEqual([payload])
    expect(rest).toBe('')
  })
})
