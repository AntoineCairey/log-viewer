import { formatCount } from '../lib/formatLog.ts'
import { resultsCountLabel } from '../lib/filterLogs.ts'
import { LOG_BUFFER_LIMIT } from '../lib/prependCapped.ts'
import styles from './ResultsBar.module.css'

type ResultsBarProps = {
  matched: number
  total: number
}

// Pas de role="status" : le compteur change à chaque lot, et un aria-live
// annoncerait le flux en continu.
export function ResultsBar({ matched, total }: ResultsBarProps) {
  return (
    <div className={styles.bar}>
      <span className={styles.count}>{resultsCountLabel(matched)}</span>
      <span className={styles.memory}>
        sur {formatCount(total)} en mémoire (max {formatCount(LOG_BUFFER_LIMIT)}
        )
      </span>
    </div>
  )
}
