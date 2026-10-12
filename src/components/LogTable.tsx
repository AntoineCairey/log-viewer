import { ArrowUp } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
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
  onFilterUser: (log: LogEntry) => void
  onFilterRequest: (log: LogEntry) => void
  noMatch: boolean
  onClearFilters: () => void
  paused: boolean
}

// Tableau virtualisé : seules les lignes visibles (plus une marge) sont dans le DOM.
// Les nouveaux logs arrivent en haut. En direct, en haut, on les voit apparaître.
// - Scroll : seul le défilement s'arrête, en décalant le scroll de la hauteur
//   des arrivées. Elles restent dans la liste, au-dessus. Un bouton flottant,
//   ou le retour tout en haut, reprend le suivi. Le graphique reste en direct.
// - Bouton Pause : App retire les logs arrivés après le clic. Ce tableau ne
//   les reçoit pas. Seul « Revenir en direct » les réaffiche et ramène en haut.
export function LogTable({
  logs,
  selectedId,
  onSelect,
  onFilterUser,
  onFilterRequest,
  noMatch,
  onClearFilters,
  paused,
}: LogTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const previousFirstIdRef = useRef<string | null>(null)
  const awayRef = useRef(false)
  // Ref miroir : le scroll et les layout effects lisent la pause du rendu
  // en cours sans se ré-abonner à chaque lot de logs.
  const pausedRef = useRef(paused)
  // Vrai quand l'utilisateur a quitté le haut sans passer par le bouton Pause.
  const [detached, setDetached] = useState(false)

  pausedRef.current = paused

  // useVirtualizer mutates its instance in place; React Compiler skips this
  // component on purpose. Silence until TanStack ships a compatible API.
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual
  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: (index) => logs[index]?.id ?? index,
    overscan: 10,
    useFlushSync: false,
  })

  // Avant l'affichage : si des logs ont été ajoutés en haut alors que
  // l'utilisateur a quitté le haut, on descend le scroll de leur hauteur.
  // Si l'ancien premier log a disparu, la liste a été filtrée : on revient
  // en haut, au lieu de traiter tout le tableau comme de nouveaux logs.
  useLayoutEffect(() => {
    const scroller = scrollRef.current
    const previousFirstId = previousFirstIdRef.current
    previousFirstIdRef.current = logs[0]?.id ?? null

    if (!scroller || previousFirstId === null) return

    const added = logs.findIndex((log) => log.id === previousFirstId)
    if (added === -1) {
      awayRef.current = false
      scroller.scrollTop = 0
      // Un filtre ne lève pas la pause : on reprend le suivi seulement en direct.
      if (!pausedRef.current) setDetached(false)
      return
    }
    const atTop = scroller.scrollTop < LIVE_THRESHOLD_PX
    if (atTop && !pausedRef.current) return
    if (added > 0) {
      awayRef.current = true
      scroller.scrollTop += added * ROW_HEIGHT
    }
  }, [logs])

  // Revenir en direct ramène en haut et reprend le défilement.
  useLayoutEffect(() => {
    if (paused) return

    const scroller = scrollRef.current
    awayRef.current = false
    if (scroller && scroller.scrollTop >= LIVE_THRESHOLD_PX) {
      scroller.scrollTo({ top: 0 })
    }
    setDetached(false)
  }, [paused])

  const handleScroll = () => {
    const scroller = scrollRef.current
    if (!scroller) return

    const atTop = scroller.scrollTop < LIVE_THRESHOLD_PX
    if (atTop) {
      // Déjà en haut : un scroll parasite ne doit pas reprendre le suivi.
      if (!awayRef.current) return
      awayRef.current = false
      // La pause du bouton ne se lève qu'avec « Revenir en direct ».
      if (pausedRef.current) return
      setDetached(false)
      return
    }

    awayRef.current = true
    if (!pausedRef.current) setDetached(true)
  }

  const resumeScroll = () => {
    const scroller = scrollRef.current
    awayRef.current = false
    setDetached(false)
    if (scroller && scroller.scrollTop >= LIVE_THRESHOLD_PX) {
      scroller.scrollTo({ top: 0 })
    }
  }

  const items = virtualizer.getVirtualItems()
  const paddingTop = items[0]?.start ?? 0
  const paddingBottom = virtualizer.getTotalSize() - (items.at(-1)?.end ?? 0)

  return (
    <div className={styles.frame}>
      {detached && !paused ? (
        <button
          type="button"
          className={styles.resumeScroll}
          onClick={resumeScroll}
        >
          <ArrowUp size={14} aria-hidden="true" />
          Voir les nouveaux messages
        </button>
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
                  onFilterUser={onFilterUser}
                  onFilterRequest={onFilterRequest}
                />
              ) : null
            })}
            {paddingBottom > 0 ? <SpacerRow height={paddingBottom} /> : null}
          </tbody>
        </table>
        {noMatch ? (
          <div className={styles.empty}>
            <p>Aucun log ne correspond à ces filtres</p>
            <button type="button" onClick={onClearFilters}>
              Tout effacer
            </button>
          </div>
        ) : null}
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
  onFilterUser,
  onFilterRequest,
}: {
  log: LogEntry
  selected: boolean
  onSelect: (log: LogEntry) => void
  onFilterUser: (log: LogEntry) => void
  onFilterRequest: (log: LogEntry) => void
}) {
  // Mise en évidence : error / critical, et les durées à partir de 1,5 s.
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
      <td>
        <button
          type="button"
          className={styles.cellButton}
          title="Filtrer sur cet utilisateur"
          onClick={(event) => {
            event.stopPropagation()
            onFilterUser(log)
          }}
        >
          {log.userId}
        </button>
      </td>
      <td>
        <button
          type="button"
          className={styles.cellButton}
          title="Filtrer sur cette requête"
          onClick={(event) => {
            event.stopPropagation()
            onFilterRequest(log)
          }}
        >
          {log.requestId}
        </button>
      </td>
    </tr>
  )
}
