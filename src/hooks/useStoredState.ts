import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

// Relit au montage, puis réécrit à chaque changement.
// `read` et `write` viennent du module : leur identité ne change pas.
export function useStoredState<T>(
  read: () => T,
  write: (value: T) => void,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => read())

  useEffect(() => {
    write(value)
  }, [value, write])

  return [value, setValue]
}
