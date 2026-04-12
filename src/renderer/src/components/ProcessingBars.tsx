import { useRef, useEffect } from 'react'
import { createScope, animate, stagger } from 'animejs'

export function ProcessingBars({ label = 'Processing' }: { label?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const scope = createScope({ root: ref.current })
    scope.add(() =>
      animate('.proc-bar', {
        scaleY: [0.25, 1, 0.25],
        duration: 700,
        ease: 'inOutSine',
        delay: stagger(90),
        loop: true,
      })
    )
    return () => scope.revert()
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div ref={ref} style={{ display: 'flex', gap: 3, alignItems: 'center', height: 18 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="proc-bar"
            style={{
              width: 3,
              height: 18,
              background: 'var(--warning)',
              borderRadius: 2,
              transformOrigin: 'bottom',
            }}
          />
        ))}
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
        {label}
      </span>
    </div>
  )
}
