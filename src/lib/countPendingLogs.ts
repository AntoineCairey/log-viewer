// Logs de `matched` arrivés après `headId`.
// Les deux listes commencent par le plus récent, et `matched` en est une sous-suite.
// Sans repère, ou si le plafond l'a évincé, tout `matched` est plus récent.
export function countPendingLogs(
  matched: readonly { id: string }[],
  logs: readonly { id: string }[],
  headId: string | null,
): number {
  if (headId === null) return matched.length

  const headIndex = logs.findIndex((log) => log.id === headId)
  if (headIndex === -1) return matched.length
  if (headIndex === 0) return 0

  const newer = new Set(logs.slice(0, headIndex).map((log) => log.id))
  let count = 0
  for (const log of matched) {
    if (!newer.has(log.id)) break
    count += 1
  }
  return count
}
