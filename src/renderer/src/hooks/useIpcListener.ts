import { useEffect, useRef } from 'react'

/**
 * Subscribe to an IPC push event from the main process.
 * Automatically unsubscribes when the component unmounts.
 *
 * Uses a ref for the handler so the IPC subscription stays stable (registered
 * once per `register` identity) while always calling through to the latest
 * closure.  This avoids the stale-closure problem where captured state (e.g.
 * exportJobId) was frozen at the value from the first render.
 *
 * @param register - One of `window.electronAPI.onXxx` — must return an unsubscribe fn
 * @param handler  - Callback to run when the event fires
 */
export function useIpcListener<T>(
  register: ((cb: (data: T) => void) => () => void) | undefined | null,
  handler: (data: T) => void,
): void {
  const handlerRef = useRef(handler)
  handlerRef.current = handler          // always keep the latest closure

  useEffect(() => {
    if (typeof register !== 'function') return
    // The wrapper is stable — it delegates to whatever handlerRef.current is
    const off = register((data: T) => handlerRef.current(data))
    if (typeof off === 'function') return off
  }, [register])
}
