import { describe, expect, it } from 'vitest'
import { csvFilename, logsToCsv } from './exportLogs.ts'
import type { LogEntry } from '../types/log.ts'

const log: LogEntry = {
  id: '8a1b',
  timestamp: '2026-10-11T01:06:44.860Z',
  level: 'info',
  service: 'auth-service',
  message: 'Email queued',
  durationMs: 1257.4,
  requestId: 'd5840151650e',
  userId: 212,
  httpStatus: 200,
}

describe('logsToCsv', () => {
  it('écrit les logs filtrés avec un en-tête, du plus récent au plus ancien', () => {
    const older: LogEntry = { ...log, id: 'plus-ancien', message: 'Order created' }

    expect(logsToCsv([log, older])).toBe(
      [
        'Date et heure;Niveau;Service;Message;Durée (ms);Statut HTTP;User ID;Request ID;Log ID',
        '2026-10-11T01:06:44.860Z;info;auth-service;Email queued;1257;200;212;d5840151650e;8a1b',
        '2026-10-11T01:06:44.860Z;info;auth-service;Order created;1257;200;212;d5840151650e;plus-ancien',
        '',
      ].join('\r\n'),
    )
  })

  it('échappe les séparateurs, les guillemets et les retours à la ligne', () => {
    const tricky: LogEntry = {
      ...log,
      message: 'dit "ok";\nsuite',
    }

    expect(logsToCsv([tricky])).toContain('"dit ""ok"";\nsuite"')
  })

  it('neutralise une cellule qui serait lue comme une formule', () => {
    const command: LogEntry = { ...log, message: '=1+1' }

    expect(logsToCsv([command])).toContain("'=1+1")
  })

  it('n’écrit que l’en-tête quand la liste est vide', () => {
    expect(logsToCsv([])).toBe(
      'Date et heure;Niveau;Service;Message;Durée (ms);Statut HTTP;User ID;Request ID;Log ID\r\n',
    )
  })
})

describe('csvFilename', () => {
  it('date le fichier à la minute', () => {
    expect(csvFilename(new Date(2026, 9, 11, 1, 16))).toBe('logs-20261011-0116.csv')
  })
})
