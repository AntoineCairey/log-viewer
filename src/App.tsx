import { LogTable } from './components/LogTable.tsx'
import { StatusBanner } from './components/StatusBanner.tsx'
import { useLogStream } from './hooks/useLogStream.ts'
import styles from './App.module.css'

export default function App() {
  const { logs, status, configured } = useLogStream()

  return (
    <div className={styles.app}>
      <StatusBanner
        status={status}
        logCount={logs.length}
        configured={configured}
      />
      {configured ? (
        <LogTable logs={logs} />
      ) : (
        <p className={styles.missing}>
          Renseigner VITE_LOGS_API_URL dans .env, puis relancer le serveur.
        </p>
      )}
    </div>
  )
}
