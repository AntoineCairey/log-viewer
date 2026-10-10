import { useLayoutEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { countNewerLogs } from '../lib/countNewerLogs.ts'
import {
  formatCount,
  formatDuration,
  formatLogDate,
  formatLogTime,
  formatService,
  httpStatusTone,
} from '../lib/formatLog.ts'
import type { LogEntry } from '../types/log.ts'
import styles from './LogTable.module.css'

const ROW_HEIGHT = 40
const COLUMN_COUNT = 8
// En dessous de ce décalage, on considère que l'utilisateur est en haut, donc en direct.
const LIVE_THRESHOLD_PX = 4

type LogTableProps = {
  logs: readonly LogEntry[]
  selectedId: string | null
  onSelect: (log: LogEntry) => void
}

// Tableau virtualisé : seules les lignes visibles (plus une marge) sont dans le DOM.
// Les nouveaux logs arrivent en haut. En haut, on les voit apparaître ; plus bas,
// on décale le scroll d'autant pour que les lignes regardées ne bougent pas.
export function LogTable({ logs, selectedId, onSelect }: LogTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const previousFirstIdRef = useRef<string | null>(null)
  // Premier log au moment où l'utilisateur a quitté le haut. null : en direct.
  const [anchorId, setAnchorId] = useState<string | null>(null)

  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: (index) => logs[index]?.id ?? index,
    overscan: 10,
    useFlushSync: false,
  })

  // Avant l'affichage : si des logs ont été ajoutés en haut pendant qu'on
  // regarde plus bas, on descend le scroll de leur hauteur.
  useLayoutEffect(() => {
    const scroller = scrollRef.current
    const previousFirstId = previousFirstIdRef.current
    previousFirstIdRef.current = logs[0]?.id ?? null

    if (!scroller || previousFirstId === null) return
    if (scroller.scrollTop < LIVE_THRESHOLD_PX) return

    const added = countNewerLogs(logs, previousFirstId)
    if (added > 0) scroller.scrollTop += added * ROW_HEIGHT
  }, [logs])

  const handleScroll = () => {
    const scroller = scrollRef.current
    if (!scroller) return

    const live = scroller.scrollTop < LIVE_THRESHOLD_PX
    if (live && anchorId !== null) setAnchorId(null)
    if (!live && anchorId === null) setAnchorId(logs[0]?.id ?? null)
  }

  const goLive = () => {
    scrollRef.current?.scrollTo({ top: 0 })
  }

  const items = virtualizer.getVirtualItems()
  const paddingTop = items[0]?.start ?? 0
  const paddingBottom = virtualizer.getTotalSize() - (items.at(-1)?.end ?? 0)
  const pending = countNewerLogs(logs, anchorId)

  return (
    <div className={styles.frame}>
      {anchorId !== null ? (
        <div className={styles.caughtUp}>
          <p>
            {pending > 1
              ? `${formatCount(pending)} nouveaux logs au-dessus`
              : pending === 1
                ? '1 nouveau log au-dessus'
                : 'Défilement automatique en pause'}
          </p>
          <button type="button" onClick={goLive}>
            Revenir en direct
          </button>
        </div>
      ) : null}
      <div ref={scrollRef} className={styles.scroller} onScroll={handleScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date et heure</th>
              <th>Niveau</th>
              <th>Service</th>
              <th>Message</th>
              <th>Durée</th>
              <th>Statut</th>
              <th>User ID</th>
              <th>Request ID</th>
            </tr>
          </thead>
          <tbody>
            {paddingTop > 0 ? <SpacerRow height={paddingTop} /> : null}
            {items.map((item) => {
              const log = logs[item.index]
              return log ? (
                <LogRow
                  key={item.key}
                  log={log}
                  selected={log.id === selectedId}
                  onSelect={onSelect}
                />
              ) : null
            })}
            {paddingBottom > 0 ? <SpacerRow height={paddingBottom} /> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Ligne vide qui remplace les lignes non rendues, pour garder la bonne hauteur de scroll.
function SpacerRow({ height }: { height: number }) {
  return (
    <tr aria-hidden="true" className={styles.spacer} style={{ height }}>
      <td colSpan={COLUMN_COUNT} />
    </tr>
  )
}

function LogRow({
  log,
  selected,
  onSelect,
}: {
  log: LogEntry
  selected: boolean
  onSelect: (log: LogEntry) => void
}) {
  const heavy = log.level === 'error' || log.level === 'critical'
  const slow = log.durationMs >= 1500

  return (
    <tr
      className={[selected ? styles.selected : '', heavy ? styles.heavy : '']
        .filter(Boolean)
        .join(' ')}
      aria-selected={selected}
      onClick={() => onSelect(log)}
    >
      <td>
        <span className={styles.time}>
          <span>{formatLogDate(log.timestamp)}</span>
          <span>{formatLogTime(log.timestamp)}</span>
        </span>
      </td>
      <td>
        <span className={styles.level} data-level={log.level}>
          {log.level}
        </span>
      </td>
      <td className={styles.service} title={log.service}>
        {formatService(log.service)}
      </td>
      <td>
        <span className={styles.message}>{log.message}</span>
      </td>
      <td className={slow ? styles.slow : styles.duration}>
        {formatDuration(log.durationMs)}
      </td>
      <td className={styles.status} data-tone={httpStatusTone(log.httpStatus)}>
        {log.httpStatus}
      </td>
      <td className={styles.mono}>{log.userId}</td>
      <td className={styles.mono}>{log.requestId}</td>
    </tr>
  )
}
