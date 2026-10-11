// Jeu du graphique pendant la pause. `headId` est le log le plus récent au clic.
// Les arrivées suivantes restent hors du graphique. Si ce repère a été évincé
// par le plafond, le graphique se vide plutôt que de reprendre le direct.
export function logsAtPause<T extends { id: string }>(
  logs: readonly T[],
  paused: boolean,
  headId: string | null,
): readonly T[] {
  if (!paused) return logs
  if (headId === null) return []

  const index = logs.findIndex((log) => log.id === headId)
  if (index === -1) return []
  if (index === 0) return logs
  return logs.slice(index)
}
