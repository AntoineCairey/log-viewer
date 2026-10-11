import { ChevronDown } from 'lucide-react'
import {
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  buildLogChartData,
  rangeFromFractions,
  type LogChartGroup,
} from '../lib/logChartSeries.ts'
import { resolvePeriodBounds, type PeriodFilter } from '../lib/filterLogs.ts'
import { formatCount } from '../lib/formatLog.ts'
import type { LogEntry } from '../types/log.ts'
import styles from './LogChart.module.css'

const GROUPS: readonly { value: LogChartGroup; label: string }[] = [
  { value: 'total', label: 'Total' },
  { value: 'level', label: 'Niveau' },
  { value: 'service', label: 'Service' },
  { value: 'status', label: 'Statut HTTP' },
]

const BUCKETS = [
  { ms: 1_000, label: '1 s' },
  { ms: 5_000, label: '5 s' },
  { ms: 15_000, label: '15 s' },
  { ms: 30_000, label: '30 s' },
  { ms: 60_000, label: '1 min' },
] as const

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
})
const timeFormat = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

type Drag = {
  pointerId: number
  start: number
  current: number
}

type LogChartProps = {
  logs: readonly LogEntry[]
  countedLogs: readonly LogEntry[]
  period: PeriodFilter | null
  onSelectRange: (from: number, to: number) => void
}

export function LogChart({
  logs,
  countedLogs,
  period,
  onSelectRange,
}: LogChartProps) {
  const [group, setGroup] = useState<LogChartGroup>('level')
  const [bucketMs, setBucketMs] =
    useState<(typeof BUCKETS)[number]['ms']>(1_000)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const bucketLabel =
    BUCKETS.find((option) => option.ms === bucketMs)?.label ?? '1 s'
  const bounds = useMemo(
    () => resolvePeriodBounds(period, countedLogs),
    [period, countedLogs],
  )
  const data = useMemo(
    () => buildLogChartData(logs, countedLogs, group, bucketMs, bounds),
    [logs, countedLogs, group, bucketMs, bounds],
  )

  const fractionOf = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width === 0) return 0
    return Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!data) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const fraction = fractionOf(event)
    setHoverIndex(null)
    setDrag({
      pointerId: event.pointerId,
      start: fraction,
      current: fraction,
    })
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!data) return
    const fraction = fractionOf(event)
    if (drag?.pointerId === event.pointerId) {
      setDrag({ ...drag, current: fraction })
      return
    }
    setHoverIndex(
      Math.min(data.bucketCount - 1, Math.floor(fraction * data.bucketCount)),
    )
  }

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!data || drag?.pointerId !== event.pointerId) return
    const end = fractionOf(event)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDrag(null)
    if (Math.abs(end - drag.start) < 0.01) return
    const range = rangeFromFractions(data.startMs, data.endMs, drag.start, end)
    onSelectRange(range.from, range.to)
  }

  const cancelDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag?.pointerId !== event.pointerId) return
    setDrag(null)
  }

  const hover =
    data && hoverIndex !== null
      ? {
          index: hoverIndex,
          fraction: (hoverIndex + 0.5) / data.bucketCount,
          start: data.startMs + hoverIndex * data.bucketMs,
        }
      : null

  return (
    <section
      className={styles.section}
      aria-label="Graphique temporel des logs"
    >
      <div className={styles.header}>
        <span className={styles.title}>
          Nombre de logs par tranche de {bucketLabel}
        </span>
        <div className={styles.controls}>
          <label className={styles.selectControl}>
            Granularité
            <span className={styles.selectWrap}>
              <select
                aria-label="Granularité"
                value={bucketMs}
                onChange={(event) => {
                  const next = BUCKETS.find(
                    (option) => option.ms === Number(event.target.value),
                  )
                  if (!next) return
                  setBucketMs(next.ms)
                  setHoverIndex(null)
                }}
              >
                {BUCKETS.map((option) => (
                  <option key={option.ms} value={option.ms}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} aria-hidden="true" />
            </span>
          </label>
          <label className={styles.selectControl}>
            Regrouper par
            <span className={styles.selectWrap}>
              <select
                aria-label="Regrouper par"
                value={group}
                onChange={(event) => {
                  if (!isGroup(event.target.value)) return
                  setGroup(event.target.value)
                  setHoverIndex(null)
                }}
              >
                {GROUPS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} aria-hidden="true" />
            </span>
          </label>
        </div>
      </div>

      <div className={styles.legend} aria-label="Légende">
        {data?.series.map((series) => (
          <span key={series.key} className={styles.legendItem}>
            <span
              className={styles.swatch}
              style={{
                borderColor: series.color,
                borderStyle: series.dash ? 'dotted' : 'solid',
              }}
            />
            {series.label}
            <span className={styles.legendCount}>
              {formatCount(series.total)}
            </span>
          </span>
        ))}
      </div>

      {data ? (
        <>
          <div className={styles.plotRow}>
            <div className={styles.yAxis} aria-hidden="true">
              {data.yTicks.map((tick) => (
                <span
                  key={tick}
                  style={{ bottom: `${(tick / data.yMax) * 100}%` }}
                >
                  {formatCount(tick)}
                </span>
              ))}
            </div>
            <div className={styles.plot}>
              <svg
                className={styles.svg}
                viewBox="0 0 1000 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {data.yTicks.map((tick) => {
                  const y = 100 - (tick / data.yMax) * 100
                  return (
                    <line
                      key={tick}
                      className={tick === 0 ? styles.baseGrid : styles.grid}
                      x1="0"
                      x2="1000"
                      y1={y}
                      y2={y}
                    />
                  )
                })}
                {data.xTicks
                  .filter(
                    (tick) =>
                      tick.showDate &&
                      new Date(tick.value).getHours() === 0 &&
                      new Date(tick.value).getMinutes() === 0,
                  )
                  .map((tick) => (
                    <line
                      key={`midnight-${tick.value}`}
                      className={styles.midnight}
                      x1={xForTime(tick.value, data.startMs, data.endMs)}
                      x2={xForTime(tick.value, data.startMs, data.endMs)}
                      y1="0"
                      y2="100"
                    />
                  ))}
                {data.series.map((series) => (
                  <polyline
                    key={series.key}
                    className={styles.line}
                    points={series.values
                      .map(
                        (value, index) =>
                          `${((index + 0.5) / data.bucketCount) * 1000},${100 - (value / data.yMax) * 100}`,
                      )
                      .join(' ')}
                    stroke={series.color}
                    strokeDasharray={series.dash}
                  />
                ))}
              </svg>

              {drag ? (
                <div
                  className={styles.brush}
                  style={{
                    left: `${Math.min(drag.start, drag.current) * 100}%`,
                    width: `${Math.abs(drag.current - drag.start) * 100}%`,
                  }}
                />
              ) : null}

              {hover && !drag ? (
                <>
                  <div
                    className={styles.hoverLine}
                    style={{ left: `${hover.fraction * 100}%` }}
                  />
                  {data.series.map((series) => (
                    <span
                      key={series.key}
                      className={styles.hoverDot}
                      style={{
                        left: `${hover.fraction * 100}%`,
                        top: `${100 - ((series.values[hover.index] ?? 0) / data.yMax) * 100}%`,
                        background: series.color,
                      }}
                    />
                  ))}
                  <div
                    className={styles.tooltip}
                    role="tooltip"
                    data-flip={hover.fraction > 0.6 ? 'true' : 'false'}
                    style={
                      hover.fraction > 0.6
                        ? { right: `${(1 - hover.fraction) * 100}%` }
                        : { left: `${hover.fraction * 100}%` }
                    }
                  >
                    <div className={styles.tooltipTitle}>
                      {dateFormat.format(hover.start)}{' '}
                      {timeFormat.format(hover.start)} –{' '}
                      {timeFormat.format(hover.start + data.bucketMs)}
                    </div>
                    {data.series.map((series) => (
                      <div key={series.key} className={styles.tooltipRow}>
                        <span>
                          <span
                            className={styles.tooltipSwatch}
                            style={{ background: series.color }}
                          />
                          {series.label}
                        </span>
                        <span>{series.values[hover.index] ?? 0}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              <div
                className={styles.pointerLayer}
                aria-label="Sélectionner une période en faisant glisser"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishDrag}
                onPointerCancel={cancelDrag}
                onPointerLeave={() => {
                  if (!drag) setHoverIndex(null)
                }}
              />
            </div>
          </div>
          <div className={styles.xAxis} aria-hidden="true">
            {data.xTicks.map((tick) => (
              <span
                key={tick.value}
                style={{
                  left: `${((tick.value - data.startMs) / (data.endMs - data.startMs)) * 100}%`,
                }}
              >
                {tick.label}
                {tick.showDate ? (
                  <small>{dateFormat.format(tick.value)}</small>
                ) : null}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.empty}>
          Aucun horodatage exploitable en mémoire
        </div>
      )}
    </section>
  )
}

function isGroup(value: string): value is LogChartGroup {
  return GROUPS.some((option) => option.value === value)
}

function xForTime(value: number, start: number, end: number): number {
  return ((value - start) / (end - start)) * 1000
}
