import { useState, type ReactNode } from 'react'
import { Check, ChevronRight, Copy, Funnel, X } from 'lucide-react'
import {
  formatDuration,
  formatLogDate,
  formatLogTime,
  httpStatusTone,
} from '../lib/formatLog.ts'
import type { LogEntry } from '../types/log.ts'
import styles from './LogDetail.module.css'

const ICON_SIZE = 14

type LogDetailProps = {
  log: LogEntry
  onClose: () => void
}

type CopiedField = 'message' | 'userId' | 'requestId' | 'logId' | 'json'

// Panneau fixe à côté du tableau : il a son propre défilement.
// Les boutons « filtrer » sont en place, branchés plus tard.
export function LogDetail({ log, onClose }: LogDetailProps) {
  const [jsonOpen, setJsonOpen] = useState(false)
  const [copied, setCopied] = useState<CopiedField | null>(null)
  const json = JSON.stringify(toRawLog(log), null, 2)

  const copy = (field: CopiedField, value: string) => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(field)
    })
  }

  return (
    <aside className={styles.panel} aria-label="Détail du log">
      <header className={styles.header}>
        <h2>Détail du log</h2>
        <button
          type="button"
          className={styles.close}
          aria-label="Fermer le détail"
          onClick={onClose}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      <div className={styles.meta}>
        <span className={styles.level} data-level={log.level}>
          {log.level}
        </span>
        <span className={styles.when}>
          {formatLogDate(log.timestamp)} {formatLogTime(log.timestamp)}
        </span>
      </div>

      <div className={styles.messageRow}>
        <p className={styles.message}>{log.message}</p>
        <Actions
          copyLabel="Copier le message"
          filterLabel="Filtrer sur ce message"
          copied={copied === 'message'}
          onCopy={() => copy('message', log.message)}
        />
      </div>
      <p className={styles.service}>{log.service}</p>

      <Field label="Durée" value={formatDuration(log.durationMs)} />
      <Field
        label="Statut HTTP"
        value={String(log.httpStatus)}
        tone={httpStatusTone(log.httpStatus)}
      />
      <Field label="User ID" value={String(log.userId)}>
        <Actions
          copyLabel="Copier le User ID"
          filterLabel="Filtrer sur cet utilisateur"
          copied={copied === 'userId'}
          onCopy={() => copy('userId', String(log.userId))}
        />
      </Field>
      <Field label="Request ID" value={log.requestId}>
        <Actions
          copyLabel="Copier le Request ID"
          filterLabel="Filtrer sur cette requête"
          copied={copied === 'requestId'}
          onCopy={() => copy('requestId', log.requestId)}
        />
      </Field>
      <Field label="Log ID" value={log.id} wrap>
        <Actions
          copyLabel="Copier le Log ID"
          filterLabel="Filtrer sur ce log"
          copied={copied === 'logId'}
          onCopy={() => copy('logId', log.id)}
        />
      </Field>

      <div className={styles.json}>
        <button
          type="button"
          className={styles.jsonToggle}
          aria-expanded={jsonOpen}
          onClick={() => setJsonOpen((open) => !open)}
        >
          <ChevronRight
            size={ICON_SIZE}
            aria-hidden="true"
            className={jsonOpen ? styles.chevronOpen : styles.chevron}
          />
          JSON brut
        </button>
        <button
          type="button"
          className={styles.copyJson}
          onClick={() => copy('json', json)}
        >
          {copied === 'json' ? (
            <Check size={ICON_SIZE} aria-hidden="true" />
          ) : (
            <Copy size={ICON_SIZE} aria-hidden="true" />
          )}
          {copied === 'json' ? 'Copié' : 'Copier le JSON'}
        </button>
      </div>
      {jsonOpen ? <pre className={styles.raw}>{json}</pre> : null}
    </aside>
  )
}

// Reconstruit l'objet tel que l'API l'envoie (snake_case), pour l'affichage brut.
function toRawLog(log: LogEntry) {
  return {
    id: log.id,
    timestamp: log.timestamp,
    level: log.level,
    service: log.service,
    message: log.message,
    duration_ms: log.durationMs,
    metadata: {
      request_id: log.requestId,
      user_id: log.userId,
      http_status: log.httpStatus,
    },
  }
}

function Field({
  label,
  value,
  tone,
  wrap = false,
  children,
}: {
  label: string
  value: string
  tone?: 'ok' | 'client' | 'server'
  wrap?: boolean
  children?: ReactNode
}) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span
        className={wrap ? styles.fieldValueWrap : styles.fieldValue}
        data-tone={tone}
      >
        {value}
      </span>
      {children}
    </div>
  )
}

function Actions({
  copyLabel,
  filterLabel,
  copied,
  onCopy,
}: {
  copyLabel: string
  filterLabel: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.iconButton}
        aria-label={copyLabel}
        title={copyLabel}
        onClick={onCopy}
      >
        {copied ? (
          <Check size={ICON_SIZE} aria-hidden="true" />
        ) : (
          <Copy size={ICON_SIZE} aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        className={styles.iconButton}
        aria-label={filterLabel}
        title={filterLabel}
      >
        <Funnel size={ICON_SIZE} aria-hidden="true" />
      </button>
    </div>
  )
}
