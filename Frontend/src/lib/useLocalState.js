import { useCallback, useEffect, useRef, useState } from 'react'

/** useState persisted to localStorage (per-viewer convenience; every access is guarded). */
export function useLocalState(key, initial) {
  const read = () => {
    try {
      const raw = localStorage.getItem(key)
      if (raw != null) return JSON.parse(raw)
    } catch {
      /* storage unavailable or corrupt */
    }
    return typeof initial === 'function' ? initial() : initial
  }
  const [value, setValue] = useState(read)
  const keyRef = useRef(key)
  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key
      setValue(read())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const set = useCallback(
    (next) =>
      setValue((prev) => {
        const v = typeof next === 'function' ? next(prev) : next
        try {
          localStorage.setItem(keyRef.current, JSON.stringify(v))
        } catch {
          /* ignore */
        }
        return v
      }),
    [],
  )
  return [value, set]
}
