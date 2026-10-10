// Nombre de logs arrivés devant `anchorId` (la liste commence par le plus récent).
// Si l'ancre a été retirée par le plafond, tous les logs sont plus récents qu'elle.
export function countNewerLogs(
  logs: readonly { id: string }[],
  anchorId: string | null,
): number {
  if (anchorId === null) return 0

  const position = logs.findIndex((log) => log.id === anchorId)
  if (position === -1) return logs.length
  return position
}
