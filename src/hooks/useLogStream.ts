import { useEffect, useRef, useState } from 'react'
import { LOG_BUFFER_LIMIT, prependUniqueCapped } from '../lib/prependCapped.ts'
import { parseLog } from '../lib/parseLog.ts'
import { INITIAL_TAIL, reconnectTail } from '../lib/reconnectTail.ts'
import { DEFAULT_RETRY_DELAY_MS, parseRetryAfter } from '../lib/retryAfter.ts'
import { readSseData } from '../lib/sseBuffer.ts'
import type { LogEntry } from '../types/log.ts'

const FLUSH_INTERVAL_MS = 100

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting'

type UseLogStreamResult = {
  logs: LogEntry[]
  status: ConnectionStatus
  configured: boolean
}

// Connexion au flux, mise à jour par lots, plafond de 5 000, reconnexion.
// `logs` commence par le plus récent.
export function useLogStream(): UseLogStreamResult {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const bufferRef = useRef<LogEntry[]>([])

  const baseUrl = import.meta.env.VITE_LOGS_API_URL?.replace(/\/$/, '') ?? ''

  useEffect(() => {
    if (baseUrl === '') return

    const abort = new AbortController()
    let lastLogAt: number | null = null

    const remember = (rawEvents: string[]) => {
      for (const raw of rawEvents) {
        const entry = parseLog(raw)
        if (!entry) continue
        const timestamp = Date.parse(entry.timestamp)
        lastLogAt = Number.isNaN(timestamp) ? Date.now() : timestamp
        bufferRef.current.push(entry)
      }
    }

    const readBody = async (body: ReadableStream<Uint8Array>) => {
      const reader = body.getReader()
      const decoder = new TextDecoder()
      let pending = ''

      try {
        while (!abort.signal.aborted) {
          const { done, value } = await reader.read()
          if (done) {
            pending += decoder.decode()
            remember(readSseData(pending, true).data)
            return
          }

          pending += decoder.decode(value, { stream: true })
          const parsed = readSseData(pending)
          pending = parsed.rest
          remember(parsed.data)
        }
      } finally {
        reader.releaseLock()
      }
    }

    // EventSource masque le statut et Retry-After, et abandonne sur un 503.
    const run = async () => {
      let reconnecting = false

      while (!abort.signal.aborted) {
        const tail =
          lastLogAt === null ? INITIAL_TAIL : reconnectTail(lastLogAt)
        setStatus(reconnecting ? 'reconnecting' : 'connecting')

        try {
          const response = await fetch(`${baseUrl}/logs/stream?tail=${tail}`, {
            headers: { Accept: 'text/event-stream' },
            signal: abort.signal,
          })
          if (abort.signal.aborted) return

          if (response.status === 503) {
            reconnecting = true
            setStatus('reconnecting')
            await response.body?.cancel()
            await sleep(
              parseRetryAfter(response.headers.get('Retry-After')),
              abort.signal,
            )
            continue
          }

          if (!response.ok || response.body === null) {
            reconnecting = true
            setStatus('reconnecting')
            await response.body?.cancel()
            await sleep(DEFAULT_RETRY_DELAY_MS, abort.signal)
            continue
          }

          setStatus('open')
          reconnecting = false
          await readBody(response.body)
          if (abort.signal.aborted) return
          reconnecting = true
          setStatus('reconnecting')
        } catch (error) {
          if (abort.signal.aborted || isAbortError(error)) return
          reconnecting = true
          setStatus('reconnecting')
          try {
            await sleep(DEFAULT_RETRY_DELAY_MS, abort.signal)
          } catch {
            return
          }
        }
      }
    }

    void run()

    // ~25 logs/s : on accumule hors rendu, puis un seul setState par lot.
    const flushTimer = setInterval(() => {
      const batch = bufferRef.current
      if (batch.length === 0) return

      bufferRef.current = []
      setLogs((current) =>
        prependUniqueCapped(current, batch, LOG_BUFFER_LIMIT),
      )
    }, FLUSH_INTERVAL_MS)

    return () => {
      abort.abort()
      clearInterval(flushTimer)
      bufferRef.current = []
    }
  }, [baseUrl])

  return {
    logs,
    status,
    configured: baseUrl !== '',
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError())
      return
    }

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    const onAbort = () => {
      clearTimeout(timer)
      reject(abortError())
    }

    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError')
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
