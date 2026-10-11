import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LogChart } from './LogChart.tsx'
import type { ChartBucketMs, LogChartGroup } from '../lib/logChartSeries.ts'
import type { LogEntry } from '../types/log.ts'

const origin = Date.parse('2026-01-15T10:00:00.000Z')

function log(id: string, offsetMs: number, service = 'auth-service'): LogEntry {
  return {
    id,
    timestamp: new Date(origin + offsetMs).toISOString(),
    level: id === 'error' ? 'error' : 'info',
    service,
    message: 'Order created',
    durationMs: 200,
    requestId: `req-${id}`,
    userId: 380,
    httpStatus: id === 'error' ? 500 : 200,
  }
}

const logs = [
  log('first', 0),
  log('second', 5_000, 'payment-service'),
  log('error', 10_000),
]

afterEach(cleanup)

describe('LogChart', () => {
  it('affiche le tooltip de la tranche survolée', () => {
    renderChart()
    const layer = screen.getByLabelText(
      'Sélectionner une période en faisant glisser',
    )
    mockRect(layer)

    fireEvent.pointerMove(layer, { pointerId: 1, clientX: 50 })

    expect(screen.getByRole('tooltip')).toHaveTextContent('info')
    expect(screen.getByRole('tooltip')).toHaveTextContent('error')
  })

  it('change de regroupement et remonte la plage glissée', () => {
    const onSelectRange = vi.fn()
    renderChart({ onSelectRange })

    fireEvent.change(screen.getByRole('combobox', { name: 'Regrouper par' }), {
      target: { value: 'service' },
    })
    expect(screen.getByText('payment')).toBeInTheDocument()

    expect(screen.getByRole('combobox', { name: 'Granularité' })).toHaveValue(
      '5000',
    )
    expect(
      screen.getByText('Nombre de logs par tranche de 5 s'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Granularité' }), {
      target: { value: '1000' },
    })
    expect(
      screen.getByText('Nombre de logs par tranche de 1 s'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Granularité' }), {
      target: { value: '5000' },
    })
    expect(
      screen.getByText('Nombre de logs par tranche de 5 s'),
    ).toBeInTheDocument()

    const layer = screen.getByLabelText(
      'Sélectionner une période en faisant glisser',
    )
    mockRect(layer)
    Object.assign(layer, {
      setPointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => true),
      releasePointerCapture: vi.fn(),
    })

    fireEvent.pointerDown(layer, { pointerId: 3, clientX: 20 })
    fireEvent.pointerUp(layer, { pointerId: 3, clientX: 80 })

    expect(onSelectRange).toHaveBeenCalledWith(origin + 3_000, origin + 12_000)
  })
})

function renderChart(
  props: {
    onSelectRange?: (from: number, to: number) => void
  } = {},
) {
  const onSelectRange = props.onSelectRange ?? (() => {})

  function Harness() {
    const [group, setGroup] = useState<LogChartGroup>('level')
    const [bucketMs, setBucketMs] = useState<ChartBucketMs>(5_000)
    return (
      <LogChart
        logs={logs}
        countedLogs={logs}
        period={null}
        group={group}
        bucketMs={bucketMs}
        onGroup={setGroup}
        onBucketMs={setBucketMs}
        onSelectRange={onSelectRange}
      />
    )
  }

  return render(<Harness />)
}

function mockRect(element: HTMLElement) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    width: 100,
    height: 120,
    top: 0,
    right: 100,
    bottom: 120,
    left: 0,
    toJSON: () => ({}),
  })
}
