import { useLogStream, type ConnectionStatus } from './hooks/useLogStream.ts'
import type { LogEntry } from './types/log.ts'

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Connexion…',
  open: 'Connecté',
  reconnecting: 'Reconnexion…',
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return timestamp

  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatLog(entry: LogEntry): string {
  return `${formatTime(entry.timestamp)} ${entry.level} ${entry.service} ${entry.message} ${entry.durationMs} ms ${entry.httpStatus}`
}

export default function App() {
  const { logs, status, configured } = useLogStream()

  if (!configured) {
    return (
      <p>
        URL de l’API manquante. Renseigner VITE_LOGS_API_URL dans .env, puis
        relancer le serveur.
      </p>
    )
  }

  return (
    <>
      <p>
        {STATUS_LABEL[status]} — {logs.length} logs
      </p>
      <ul>
        {logs.map((entry) => (
          <li key={entry.id}>{formatLog(entry)}</li>
        ))}
      </ul>
    </>
  )
}
