import { useEffect, useRef } from 'react'

export function useIpcListener<T>(
  register: ((cb: (data: T) => void) => () => void) | undefined | null,
  handler: (data: T) => void,
): void {
  const handlerRef = useRef(handler)
  handlerRef.current = handler // always keep the latest closure

  useEffect(() => {
    if (typeof register !== 'function') return
    // The wrapper is stable — it delegates to whatever handlerRef.current is
    const off = register((data: T) => handlerRef.current(data))
    if (typeof off === 'function') return off
  }, [register])
}
