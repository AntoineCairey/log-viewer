import { describe, expect, it } from 'vitest'
import { parseLog } from './parseLog.ts'

const validEvent = JSON.stringify({
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

describe('parseLog', () => {
  it('parse un événement valide', () => {
    expect(parseLog(validEvent)).toEqual({
      id: '4cd74a2b-0a6a-482b-88c9-1f97be083f19',
      timestamp: '2026-10-10T12:35:02.745903Z',
      level: 'debug',
      service: 'notification-service',
      message: 'Query plan computed',
      durationMs: 227,
      requestId: 'd107df59df49',
      userId: 209,
      httpStatus: 200,
    })
  })

  it('ignore un JSON cassé', () => {
    expect(parseLog('{"id":')).toBeNull()
  })

  it('ignore un niveau inconnu', () => {
    const event = JSON.parse(validEvent) as { level: string }
    event.level = 'trace'

    expect(parseLog(JSON.stringify(event))).toBeNull()
  })
})
