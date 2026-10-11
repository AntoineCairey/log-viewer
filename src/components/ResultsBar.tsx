import { ChartLine, Download, Pause, Play } from 'lucide-react'
import { followStatusLabel, formatCount } from '../lib/formatLog.ts'
import { resultsCountLabel } from '../lib/filterLogs.ts'
import { LOG_BUFFER_LIMIT } from '../lib/prependCapped.ts'
import styles from './ResultsBar.module.css'

type ResultsBarProps = {
  matched: number
  total: number
  paused: boolean
  pending: number
  onPause: () => void
  onResume: () => void
  onExport: () => void
  chartVisible: boolean
  onToggleChart: () => void
}

// Pas de role="status" : le compteur change à chaque lot, et un aria-live
// annoncerait le flux en continu.
export function ResultsBar({
  matched,
  total,
  paused,
  pending,
  onPause,
  onResume,
  onExport,
  chartVisible,
  onToggleChart,
}: ResultsBarProps) {
  return (
    <div className={styles.bar} data-paused={paused ? 'true' : 'false'}>
      <div className={styles.summary}>
        <span className={styles.count}>{resultsCountLabel(matched)}</span>
        <span className={styles.memory}>
          sur {formatCount(total)} en mémoire (max{' '}
          {formatCount(LOG_BUFFER_LIMIT)})
        </span>
      </div>
      <div className={styles.follow}>
        <span
          className={styles.followStatus}
          data-paused={paused ? 'true' : 'false'}
        >
          <span className={styles.followDot} />
          {followStatusLabel(paused, pending)}
        </span>
        <div className={styles.actions}>
          {paused ? (
            <button type="button" className={styles.goLive} onClick={onResume}>
              <Play
                size={14}
                fill="currentColor"
                strokeWidth={0}
                aria-hidden="true"
              />
              Revenir en direct
            </button>
          ) : (
            <button type="button" className={styles.pause} onClick={onPause}>
              <Pause
                size={14}
                fill="currentColor"
                strokeWidth={0}
                aria-hidden="true"
              />
              Pause
            </button>
          )}
          <button type="button" className={styles.export} onClick={onExport}>
            <Download size={14} aria-hidden="true" />
            Exporter
          </button>
          <button
            type="button"
            className={styles.chartToggle}
            aria-expanded={chartVisible}
            aria-controls="log-chart"
            onClick={onToggleChart}
          >
            <ChartLine size={14} aria-hidden="true" />
            {chartVisible ? 'Masquer le graphique' : 'Afficher le graphique'}
          </button>
        </div>
      </div>
    </div>
  )
}
