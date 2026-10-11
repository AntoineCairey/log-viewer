import { useDeferredValue, useMemo, useState } from 'react'
import { FilterBar } from './components/FilterBar.tsx'
import { LogChart } from './components/LogChart.tsx'
import { LogDetail } from './components/LogDetail.tsx'
import { LogTable } from './components/LogTable.tsx'
import { ResultsBar } from './components/ResultsBar.tsx'
import { StatusBanner } from './components/StatusBanner.tsx'
import { useLogStream } from './hooks/useLogStream.ts'
import { useStoredState } from './hooks/useStoredState.ts'
import { csvFilename, downloadCsv, logsToCsv } from './lib/exportLogs.ts'
import { logsAtPause } from './lib/logsAtPause.ts'
import {
  INITIAL_CRITERIA,
  criteriaWithCustomRange,
  filterLogs,
  filtersFromForm,
  pinText,
  type ExactTextField,
  type TextField,
} from './lib/filterLogs.ts'
import {
  readChartPreferences,
  readFilterCriteria,
  writeChartPreferences,
  writeFilterCriteria,
} from './lib/viewerPreferences.ts'
import type { LogEntry } from './types/log.ts'
import styles from './App.module.css'

// Masqué, le graphique n'est pas monté : ce tableau évite le second filtrage.
const EMPTY_LOGS: readonly LogEntry[] = []

// Croise le buffer du flux avec les filtres, puis le distribue aux vues.
// Le tableau et l'export reçoivent `filtered`. Le graphique reçoit `chartSource`,
// figé au clic sur Pause, et `chartLogs` pour les courbes.
export default function App() {
  const { logs, status, configured } = useLogStream()
  const [selected, setSelected] = useState<LogEntry | null>(null)
  // Le bouton Pause fige la liste et le graphique. Le flux continue d'arriver.
  // Le scroll ne suspend que le défilement de la liste : LogTable le gère seul.
  const [paused, setPaused] = useState(false)
  const [pauseHeadId, setPauseHeadId] = useState<string | null>(null)
  const [pending, setPending] = useState(0)
  const [criteria, setCriteria] = useStoredState(
    readFilterCriteria,
    writeFilterCriteria,
  )
  const [chart, setChart] = useStoredState(
    readChartPreferences,
    writeChartPreferences,
  )
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
  // En pause, le graphique ignore les logs arrivés après le clic.
  // Masqué, on ne prépare ni l'axe ni les comptes.
  const chartSource = useMemo(
    () => (chart.visible ? logsAtPause(logs, paused, pauseHeadId) : EMPTY_LOGS),
    [chart.visible, logs, paused, pauseHeadId],
  )
  // Les autres filtres modifient les courbes. La période, elle, recadre l'axe.
  const chartLogs = useMemo(
    () =>
      chart.visible
        ? filterLogs(
            chartSource,
            { ...filters, period: null },
            { field, value: deferredDraft },
          )
        : EMPTY_LOGS,
    [chart.visible, chartSource, filters, field, deferredDraft],
  )

  const pause = () => {
    setPauseHeadId(logs[0]?.id ?? null)
    setPaused(true)
  }

  const resume = () => {
    setPauseHeadId(null)
    setPaused(false)
  }

  // Épingle la recherche comme filtre durable et vide le champ.
  // exact : égalité, depuis une cellule du tableau ou le panneau de détail.
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
            onPause={pause}
            onResume={resume}
            onExport={() => downloadCsv(csvFilename(), logsToCsv(filtered))}
            chartVisible={chart.visible}
            onToggleChart={() =>
              setChart((current) => ({ ...current, visible: !current.visible }))
            }
          />
          {chart.visible ? (
            <LogChart
              logs={chartSource}
              countedLogs={chartLogs}
              period={filters.period}
              group={chart.group}
              bucketMs={chart.bucketMs}
              onGroup={(group) =>
                setChart((current) => ({ ...current, group }))
              }
              onBucketMs={(bucketMs) =>
                setChart((current) => ({ ...current, bucketMs }))
              }
              onSelectRange={(from, to) =>
                setCriteria((current) =>
                  criteriaWithCustomRange(current, from, to),
                )
              }
            />
          ) : null}
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
