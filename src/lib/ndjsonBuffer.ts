// Découpe le flux NDJSON en lignes JSON complètes.
// `rest` est le morceau coupé en fin de chunk : on le garde pour le suivant.
export function readNdjsonLines(
  buffer: string,
  flush = false,
): { lines: string[]; rest: string } {
  const normalized = buffer.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
  const parts = normalized.split('\n')
  const rest = parts.pop() ?? ''
  const lines = parts.filter((line) => line.trim() !== '')

  if (!flush || rest.trim() === '') return { lines, rest }
  return { lines: lines.concat(rest.trim()), rest: '' }
}
