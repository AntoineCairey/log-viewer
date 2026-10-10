import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { Popover } from 'radix-ui'
import { formatService } from '../lib/formatLog.ts'
import {
  DURATION_PRESETS,
  LOG_LEVEL_OPTIONS,
  PERIOD_PRESETS,
  activeChips,
  durationFromForm,
  filterLogs,
  formatDatetimeLocal,
  isTextField,
  newestTimestamp,
  periodFromForm,
  TEXT_FIELD_OPTIONS,
  removeChip,
  textFieldOption,
  toggleIn,
  type FilterCriteria,
  type Filters,
  type TextField,
} from '../lib/filterLogs.ts'
import type { LogEntry } from '../types/log.ts'
import styles from './FilterBar.module.css'

type MenuId = 'level' | 'service' | 'status' | 'period' | 'duration'

type FilterBarProps = {
  logs: readonly LogEntry[]
  criteria: FilterCriteria
  filters: Filters
  field: TextField
  draft: string
  deferredDraft: string
  onCriteria: (criteria: FilterCriteria) => void
  onField: (field: TextField) => void
  onDraft: (draft: string) => void
  onPin: (field: TextField, value: string, exact: boolean) => void
  onClear: () => void
}

// Un seul menu ouvert. Popover gère Échap, le focus et le clic dehors.
export function FilterBar({
  logs,
  criteria,
  filters,
  field,
  draft,
  deferredDraft,
  onCriteria,
  onField,
  onDraft,
  onPin,
  onClear,
}: FilterBarProps) {
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null)
  const chips = activeChips(filters)
  const fieldOption = textFieldOption(field)

  const services = useMemo(() => {
    const values = new Set(logs.map((log) => log.service))
    for (const service of criteria.services) values.add(service)
    return [...values].sort((left, right) => left.localeCompare(right, 'fr'))
  }, [logs, criteria.services])

  const statuses = useMemo(() => {
    const values = new Set(logs.map((log) => log.httpStatus))
    for (const status of criteria.statuses) values.add(status)
    return [...values].sort((left, right) => left - right)
  }, [logs, criteria.statuses])

  const onOpenChange = (menu: MenuId, open: boolean) => {
    setOpenMenu((current) => {
      if (open) return menu
      return current === menu ? null : current
    })
  }

  return (
    <section className={styles.bar} aria-label="Filtres">
      <div className={styles.controls}>
        <ChoiceMenu
          menu="level"
          label="Niveau"
          openMenu={openMenu}
          onOpenChange={onOpenChange}
          count={criteria.levels.length}
          onReset={() => onCriteria({ ...criteria, levels: [] })}
        >
          {LOG_LEVEL_OPTIONS.map((level) => (
            <ChoiceOption
              key={level}
              checked={criteria.levels.includes(level)}
              onToggle={() =>
                onCriteria({
                  ...criteria,
                  levels: toggleIn(criteria.levels, level),
                })
              }
            >
              <span className={styles.level} data-level={level}>
                {level}
              </span>
            </ChoiceOption>
          ))}
        </ChoiceMenu>

        <ChoiceMenu
          menu="service"
          label="Service"
          openMenu={openMenu}
          onOpenChange={onOpenChange}
          count={criteria.services.length}
          onReset={() => onCriteria({ ...criteria, services: [] })}
        >
          {services.length === 0 ? (
            <p className={styles.emptyMenu}>Aucun service en mémoire</p>
          ) : (
            services.map((service) => (
              <ChoiceOption
                key={service}
                checked={criteria.services.includes(service)}
                onToggle={() =>
                  onCriteria({
                    ...criteria,
                    services: toggleIn(criteria.services, service),
                  })
                }
              >
                <span className={styles.optionText} title={service}>
                  {formatService(service)}
                </span>
              </ChoiceOption>
            ))
          )}
        </ChoiceMenu>

        <ChoiceMenu
          menu="status"
          label="Statut HTTP"
          openMenu={openMenu}
          onOpenChange={onOpenChange}
          count={criteria.statuses.length}
          onReset={() => onCriteria({ ...criteria, statuses: [] })}
        >
          {statuses.length === 0 ? (
            <p className={styles.emptyMenu}>Aucun statut en mémoire</p>
          ) : (
            statuses.map((status) => (
              <ChoiceOption
                key={status}
                checked={criteria.statuses.includes(status)}
                onToggle={() =>
                  onCriteria({
                    ...criteria,
                    statuses: toggleIn(criteria.statuses, status),
                  })
                }
              >
                <span className={styles.statusOption}>{status}</span>
              </ChoiceOption>
            ))
          )}
        </ChoiceMenu>

        <PeriodMenu
          logs={logs}
          criteria={criteria}
          filters={filters}
          field={field}
          deferredDraft={deferredDraft}
          openMenu={openMenu}
          onOpenChange={onOpenChange}
          onCriteria={onCriteria}
        />
        <DurationMenu
          criteria={criteria}
          active={
            filters.minDurationMs !== null || filters.maxDurationMs !== null
          }
          openMenu={openMenu}
          onOpenChange={onOpenChange}
          onCriteria={onCriteria}
        />

        <div className={styles.search}>
          <span className={styles.searchFieldWrap}>
            <select
              className={styles.searchField}
              aria-label="Champ à rechercher"
              value={field}
              onChange={(event) => {
                if (isTextField(event.target.value)) onField(event.target.value)
              }}
            >
              {TEXT_FIELD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className={styles.searchChevron}
              size={12}
              aria-hidden="true"
            />
          </span>
          <input
            className={styles.searchInput}
            type="text"
            aria-label="Texte à rechercher"
            placeholder={fieldOption.placeholder}
            value={draft}
            onChange={(event) => onDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              onPin(field, draft, false)
            }}
          />
          <button
            type="button"
            className={styles.pin}
            disabled={draft.trim() === ''}
            onClick={() => onPin(field, draft, false)}
          >
            Épingler ↵
          </button>
        </div>
      </div>

      {chips.length > 0 ? (
        <div className={styles.chips}>
          <span className={styles.chipsLabel}>Filtres actifs</span>
          {chips.map((chip) => (
            <span key={chip.id} className={styles.chip}>
              <span>{chip.label}</span>
              <button
                type="button"
                aria-label={chip.removeLabel}
                onClick={() => onCriteria(removeChip(criteria, chip.id))}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))}
          <button type="button" className={styles.clear} onClick={onClear}>
            Tout effacer
          </button>
        </div>
      ) : null}
    </section>
  )
}

function ChoiceMenu({
  menu,
  label,
  openMenu,
  onOpenChange,
  count,
  onReset,
  children,
}: {
  menu: MenuId
  label: string
  openMenu: MenuId | null
  onOpenChange: (menu: MenuId, open: boolean) => void
  count: number
  onReset: () => void
  children: ReactNode
}) {
  return (
    <FilterPopover
      menu={menu}
      openMenu={openMenu}
      onOpenChange={onOpenChange}
      panelClass={classes(styles.panelChoice)}
      trigger={
        <>
          <span>{label}</span>
          {count > 0 ? <span className={styles.count}>{count}</span> : null}
          <ChevronDown size={12} aria-hidden="true" />
        </>
      }
      triggerClass={triggerClass(count > 0)}
    >
      <div className={styles.options}>{children}</div>
      <MenuFooter onReset={onReset} />
    </FilterPopover>
  )
}

function ChoiceOption({
  checked,
  onToggle,
  children,
}: {
  checked: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <label className={styles.option}>
      <input type="checkbox" checked={checked} onChange={onToggle} />
      {children}
    </label>
  )
}

function PeriodMenu({
  logs,
  criteria,
  filters,
  field,
  deferredDraft,
  openMenu,
  onOpenChange,
  onCriteria,
}: {
  logs: readonly LogEntry[]
  criteria: FilterCriteria
  filters: Filters
  field: TextField
  deferredDraft: string
  openMenu: MenuId | null
  onOpenChange: (menu: MenuId, open: boolean) => void
  onCriteria: (criteria: FilterCriteria) => void
}) {
  const newest = useMemo(() => {
    if (criteria.periodMode !== 'last' || openMenu !== 'period') return null
    const base = filterLogs(
      logs,
      { ...filters, period: null },
      { field, value: deferredDraft },
    )
    return newestTimestamp(base)
  }, [criteria.periodMode, openMenu, logs, filters, field, deferredDraft])

  const shownFrom = shownPeriodBound(criteria, newest, 'from')
  const shownTo = shownPeriodBound(criteria, newest, 'to')
  const { error } = periodFromForm(criteria)

  const editBound = (bound: 'from' | 'to', value: string) => {
    onCriteria({
      ...criteria,
      periodMode: 'custom',
      fromStr: bound === 'from' ? value : shownFrom,
      toStr: bound === 'to' ? value : shownTo,
    })
  }

  return (
    <FilterPopover
      menu="period"
      openMenu={openMenu}
      onOpenChange={onOpenChange}
      panelClass={classes(styles.panelWide)}
      trigger={
        <>
          <span>Période</span>
          {filters.period ? <span className={styles.dot} /> : null}
          <ChevronDown size={12} aria-hidden="true" />
        </>
      }
      triggerClass={triggerClass(filters.period !== null)}
    >
      <p className={styles.hint}>Raccourcis</p>
      <div className={styles.presets}>
        {PERIOD_PRESETS.map((preset) => (
          <button
            key={preset.ms}
            type="button"
            className={presetClass(
              criteria.periodMode === 'last' && criteria.lastMs === preset.ms,
            )}
            aria-pressed={
              criteria.periodMode === 'last' && criteria.lastMs === preset.ms
            }
            onClick={() =>
              onCriteria({
                ...criteria,
                periodMode: 'last',
                lastMs: preset.ms,
                fromStr: '',
                toStr: '',
              })
            }
          >
            {preset.label}
          </button>
        ))}
      </div>
      <p className={styles.hint}>Ou une période précise</p>
      <label className={styles.field}>
        Début
        <input
          className={styles.bound}
          type="datetime-local"
          step={1}
          value={shownFrom}
          onChange={(event) => editBound('from', event.target.value)}
        />
      </label>
      <label className={styles.field}>
        Fin
        <input
          className={styles.bound}
          type="datetime-local"
          step={1}
          value={shownTo}
          onChange={(event) => editBound('to', event.target.value)}
        />
      </label>
      {error ? (
        <p className={styles.error} role="alert">
          La fin doit être après le début.
        </p>
      ) : null}
      <MenuFooter
        onReset={() =>
          onCriteria({
            ...criteria,
            periodMode: 'none',
            lastMs: 0,
            fromStr: '',
            toStr: '',
          })
        }
      />
    </FilterPopover>
  )
}

function DurationMenu({
  criteria,
  active,
  openMenu,
  onOpenChange,
  onCriteria,
}: {
  criteria: FilterCriteria
  active: boolean
  openMenu: MenuId | null
  onOpenChange: (menu: MenuId, open: boolean) => void
  onCriteria: (criteria: FilterCriteria) => void
}) {
  const { error } = durationFromForm(criteria)

  return (
    <FilterPopover
      menu="duration"
      openMenu={openMenu}
      onOpenChange={onOpenChange}
      panelClass={classes(styles.panelWide, styles.panelDuration)}
      trigger={
        <>
          <span>Durée</span>
          {active ? <span className={styles.dot} /> : null}
          <ChevronDown size={12} aria-hidden="true" />
        </>
      }
      triggerClass={triggerClass(active)}
    >
      <p className={styles.hint}>Raccourcis</p>
      <div className={styles.presets}>
        {DURATION_PRESETS.map((preset) => {
          const pressed =
            criteria.minD === preset.min && criteria.maxD === preset.max
          return (
            <button
              key={preset.label}
              type="button"
              className={presetClass(pressed)}
              aria-pressed={pressed}
              onClick={() =>
                onCriteria({ ...criteria, minD: preset.min, maxD: preset.max })
              }
            >
              {preset.label}
            </button>
          )
        })}
      </div>
      <p className={styles.hint}>Ou une plage précise (en millisecondes)</p>
      <div className={styles.durationRow}>
        <label className={styles.field}>
          Minimum
          <input
            className={styles.bound}
            type="number"
            min={0}
            step={50}
            placeholder="0"
            value={criteria.minD}
            onChange={(event) =>
              onCriteria({ ...criteria, minD: event.target.value })
            }
          />
        </label>
        <span className={styles.unit}>à</span>
        <label className={styles.field}>
          Maximum
          <input
            className={styles.bound}
            type="number"
            min={0}
            step={50}
            placeholder="∞"
            value={criteria.maxD}
            onChange={(event) =>
              onCriteria({ ...criteria, maxD: event.target.value })
            }
          />
        </label>
        <span className={styles.unit}>ms</span>
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          Le maximum doit être supérieur au minimum.
        </p>
      ) : null}
      <MenuFooter
        onReset={() => onCriteria({ ...criteria, minD: '', maxD: '' })}
      />
    </FilterPopover>
  )
}

function FilterPopover({
  menu,
  openMenu,
  onOpenChange,
  panelClass,
  triggerClass,
  trigger,
  children,
}: {
  menu: MenuId
  openMenu: MenuId | null
  onOpenChange: (menu: MenuId, open: boolean) => void
  panelClass: string
  triggerClass: string
  trigger: ReactNode
  children: ReactNode
}) {
  return (
    <Popover.Root
      open={openMenu === menu}
      onOpenChange={(open) => onOpenChange(menu, open)}
    >
      <Popover.Trigger className={triggerClass}>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={classes(styles.panel, panelClass)}
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={12}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function MenuFooter({ onReset }: { onReset: () => void }) {
  return (
    <div className={styles.footer}>
      <button type="button" className={styles.reset} onClick={onReset}>
        Réinitialiser
      </button>
      <Popover.Close className={styles.close}>Fermer</Popover.Close>
    </div>
  )
}

function shownPeriodBound(
  criteria: FilterCriteria,
  newest: number | null,
  bound: 'from' | 'to',
): string {
  if (criteria.periodMode === 'custom') {
    return bound === 'from' ? criteria.fromStr : criteria.toStr
  }
  if (criteria.periodMode !== 'last' || newest === null) return ''
  const ms = bound === 'from' ? newest - criteria.lastMs : newest
  return formatDatetimeLocal(ms)
}

function triggerClass(active: boolean): string {
  return classes(styles.trigger, active && styles.triggerActive)
}

function presetClass(pressed: boolean): string {
  return classes(styles.preset, pressed && styles.presetOn)
}

function classes(...names: Array<string | false | undefined>): string {
  return names
    .filter((name): name is string => typeof name === 'string' && name !== '')
    .join(' ')
}
