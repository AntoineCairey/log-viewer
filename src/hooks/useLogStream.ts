import { useEffect, useRef, useState } from 'react'
import { appendCapped, LOG_BUFFER_LIMIT } from '../lib/appendCapped.ts'
import { parseLog } from '../lib/parseLog.ts'
import type { LogEntry } from '../types/log.ts'

const FLUSH_INTERVAL_MS = 100
const TAIL_COUNT = 10

export type ConnectionStatus = 'connecting' | 'open' | 'error'

type UseLogStreamResult = {
  logs: LogEntry[]
  status: ConnectionStatus
  droppedCount: number
  configured: boolean
}

export function useLogStream(): UseLogStreamResult {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [droppedCount, setDroppedCount] = useState(0)
  const bufferRef = useRef<LogEntry[]>([])
  const droppedRef = useRef(0)

  const baseUrl = import.meta.env.VITE_LOGS_API_URL?.replace(/\/$/, '') ?? ''

  useEffect(() => {
    if (baseUrl === '') return

    const source = new EventSource(`${baseUrl}/logs/stream?tail=${TAIL_COUNT}`)

    source.onopen = () => {
      setStatus('open')
    }

    source.onerror = () => {
      setStatus('error')
    }

    source.onmessage = (event: MessageEvent<string>) => {
      const entry = parseLog(event.data)
      if (!entry) {
        droppedRef.current += 1
        return
      }
      bufferRef.current.push(entry)
    }

    // ~25 logs/s : on accumule hors rendu, puis un seul setState par lot.
    const flushTimer = setInterval(() => {
      const batch = bufferRef.current
      const dropped = droppedRef.current
      if (batch.length === 0 && dropped === 0) return

      bufferRef.current = []
      droppedRef.current = 0

      if (batch.length > 0) {
        setLogs((current) => appendCapped(current, batch, LOG_BUFFER_LIMIT))
      }
      if (dropped > 0) {
        setDroppedCount((count) => count + dropped)
      }
    }, FLUSH_INTERVAL_MS)

    return () => {
      source.close()
      clearInterval(flushTimer)
      bufferRef.current = []
      droppedRef.current = 0
    }
  }, [baseUrl])

  return {
    logs,
    status,
    droppedCount,
    configured: baseUrl !== '',
  }
}
