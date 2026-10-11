import { useDeferredValue, useMemo, useState } from 'react'
import { FilterBar } from './components/FilterBar.tsx'
import { LogChart } from './components/LogChart.tsx'
import { LogDetail } from './components/LogDetail.tsx'
import { LogTable } from './components/LogTable.tsx'
import { ResultsBar } from './components/ResultsBar.tsx'
import { StatusBanner } from './components/StatusBanner.tsx'
import { useLogStream } from './hooks/useLogStream.ts'
import { csvFilename, downloadCsv, logsToCsv } from './lib/exportLogs.ts'
import {
  INITIAL_CRITERIA,
  criteriaWithCustomRange,
  filterLogs,
  filtersFromForm,
  pinText,
  type ExactTextField,
  type FilterCriteria,
  type TextField,
} from './lib/filterLogs.ts'
import type { LogEntry } from './types/log.ts'
import styles from './App.module.css'

export default function App() {
  const { logs, status, configured } = useLogStream()
  const [selected, setSelected] = useState<LogEntry | null>(null)
  // La pause fige le tableau. Le flux, lui, continue d'arriver.
  const [paused, setPaused] = useState(false)
  const [pending, setPending] = useState(0)
  const [criteria, setCriteria] = useState<FilterCriteria>(INITIAL_CRITERIA)
  const [field, setField] = useState<TextField>('message')
  const [draft, setDraft] = useState('')
  // Le brouillon filtre tout de suite. useDeferredValue laisse React repousser
  // ce calcul si un lot de logs arrive en même temps que la frappe.
  const deferredDraft = useDeferredValue(draft)
  const filters = useMemo(() => filtersFromForm(criteria), [criteria])
  const filtered = useMemo(
    () => filterLogs(logs, filters, { field, value: deferredDraft }),
    [logs, filters, field, deferredDraft],
  )
  // Les autres filtres modifient les courbes. La période, elle, recadre l'axe.
  const chartLogs = useMemo(
    () =>
      filterLogs(
        logs,
        { ...filters, period: null },
        { field, value: deferredDraft },
      ),
    [logs, filters, field, deferredDraft],
  )

  const pin = (nextField: TextField, value: string, exact: boolean) => {
    setCriteria((current) => pinText(current, nextField, value, exact))
    setDraft('')
  }

  const filterExact = (nextField: ExactTextField, value: string) => {
    pin(nextField, value, true)
  }

  const clearFilters = () => {
    setCriteria(INITIAL_CRITERIA)
    setDraft('')
  }

  return (
    <div className={styles.app}>
      <StatusBanner status={status} configured={configured} />
      {configured ? (
        <>
          <FilterBar
            logs={logs}
            criteria={criteria}
            filters={filters}
            field={field}
            draft={draft}
            deferredDraft={deferredDraft}
            onCriteria={setCriteria}
            onField={setField}
            onDraft={setDraft}
            onPin={pin}
            onClear={clearFilters}
          />
          <ResultsBar
            matched={filtered.length}
            total={logs.length}
            paused={paused}
            pending={pending}
            onPause={() => setPaused(true)}
            onResume={() => setPaused(false)}
            onExport={() => downloadCsv(csvFilename(), logsToCsv(filtered))}
          />
          <LogChart
            logs={logs}
            countedLogs={chartLogs}
            period={filters.period}
            onSelectRange={(from, to) =>
              setCriteria((current) =>
                criteriaWithCustomRange(current, from, to),
              )
            }
          />
          <div className={styles.workspace}>
            <LogTable
              logs={filtered}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
              onFilterUser={(log) => filterExact('userId', String(log.userId))}
              onFilterRequest={(log) => filterExact('requestId', log.requestId)}
              noMatch={logs.length > 0 && filtered.length === 0}
              onClearFilters={clearFilters}
              paused={paused}
              onPausedChange={setPaused}
              onPendingChange={setPending}
            />
            {selected ? (
              <LogDetail
                log={selected}
                onClose={() => setSelected(null)}
                onFilter={filterExact}
              />
            ) : null}
          </div>
        </>
      ) : (
        <p className={styles.missing}>
          Renseigner VITE_LOGS_API_URL dans .env, puis relancer le serveur.
        </p>
      )}
    </div>
  )
}
