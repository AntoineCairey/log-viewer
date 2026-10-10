// Découpe le texte reçu en payloads `data:`.
// `rest` est le morceau coupé en fin de chunk : on le garde pour le suivant.
export function readSseData(
  buffer: string,
  flush = false,
): { data: string[]; rest: string } {
  const normalized = buffer.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
  const blocks = normalized.split('\n\n')
  const rest = blocks.pop() ?? ''
  const data = blocks.flatMap(readDataBlock)

  if (!flush || rest.trim() === '') return { data, rest }

  return { data: data.concat(readDataBlock(rest)), rest: '' }
}

function readDataBlock(block: string): string[] {
  const lines: string[] = []

  for (const line of block.split('\n')) {
    if (!line.startsWith('data:')) continue
    lines.push(line.slice('data:'.length).replace(/^ /, ''))
  }

  if (lines.length === 0) return []
  return [lines.join('\n')]
}
