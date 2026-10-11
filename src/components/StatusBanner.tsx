import type { ConnectionStatus } from '../hooks/useLogStream.ts'
import styles from './StatusBanner.module.css'

type StatusBannerProps = {
  status: ConnectionStatus
  configured: boolean
}

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Connexion…',
  open: 'Connecté · temps réel',
  reconnecting: 'Reconnexion…',
}

function apiHost(): string {
  const baseUrl = import.meta.env.VITE_LOGS_API_URL
  if (!baseUrl) return ''
  try {
    return new URL(baseUrl).host
  } catch {
    return baseUrl
  }
}

// Reflète l'état du flux. Sans URL d'API, le hook ne se connecte pas.
export function StatusBanner({ status, configured }: StatusBannerProps) {
  const host = apiHost()
  const apiLabel = !configured
    ? 'URL manquante'
    : status === 'open'
      ? 'API disponible'
      : 'API indisponible'

  return (
    <header className={styles.banner}>
      <div className={styles.identity}>
        <h1>Suivi des logs</h1>
        {host ? <p className={styles.host}>{host}</p> : null}
      </div>
      <div className={styles.status}>
        <p className={styles.api}>{apiLabel}</p>
        <p
          className={styles.pill}
          data-status={configured ? status : 'missing'}
        >
          <span className={styles.dot} />
          {configured ? STATUS_LABEL[status] : 'Non configuré'}
        </p>
      </div>
    </header>
  )
}
