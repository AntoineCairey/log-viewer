import { useState } from 'react'
import { LogDetail } from './components/LogDetail.tsx'
import { LogTable } from './components/LogTable.tsx'
import { StatusBanner } from './components/StatusBanner.tsx'
import { useLogStream } from './hooks/useLogStream.ts'
import type { LogEntry } from './types/log.ts'
import styles from './App.module.css'

export default function App() {
  const { logs, status, configured } = useLogStream()
  const [selected, setSelected] = useState<LogEntry | null>(null)

  return (
    <div className={styles.app}>
      <StatusBanner
        status={status}
        logCount={logs.length}
        configured={configured}
      />
      {configured ? (
        <div className={styles.workspace}>
          <LogTable
            logs={logs}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
          {selected ? (
            <LogDetail log={selected} onClose={() => setSelected(null)} />
          ) : null}
        </div>
      ) : (
        <p className={styles.missing}>
          Renseigner VITE_LOGS_API_URL dans .env, puis relancer le serveur.
        </p>
      )}
    </div>
  )
}
