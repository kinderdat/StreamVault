import { animate, stagger } from 'animejs'

/**
 * Stagger elements in from below on mount.
 * Only animates transform + opacity (GPU-composited).
 */
export function staggerIn(
  targets: string | Element | Element[] | NodeListOf<Element>,
  opts?: { delay?: number; distance?: number; duration?: number }
) {
  return animate(targets as Parameters<typeof animate>[0], {
    opacity: [0, 1],
    translateY: [opts?.distance ?? 14, 0],
    duration: opts?.duration ?? 380,
    ease: 'outExpo',
    delay: stagger(opts?.delay ?? 50, { from: 'first' }),
  })
}

/**
 * Animate a number counting up inside a DOM element.
 * Updates textContent on each frame.
 */
export function countUp(el: Element, to: number, duration = 850) {
  const obj = { val: 0 }
  return animate(obj, {
    val: [0, to],
    duration,
    ease: 'outExpo',
    onUpdate: () => {
      el.textContent = Math.round(obj.val).toLocaleString()
    },
  })
}

/**
 * Slide open an accordion panel (height 0 → scrollHeight, opacity 0 → 1).
 * Caller must set overflow:hidden on the element via CSS.
 */
export function accordionOpen(el: HTMLElement) {
  el.style.display = 'block'
  const height = el.scrollHeight
  return animate(el, {
    height: [0, height],
    opacity: [0, 1],
    duration: 240,
    ease: 'outCubic',
    onComplete: () => {
      el.style.height = 'auto'
    },
  })
}

/**
 * Slide close an accordion panel (height → 0, opacity → 0).
 * Calls onDone when finished so the caller can conditionally hide/remove.
 */
export function accordionClose(el: HTMLElement, onDone?: () => void) {
  // Snapshot current rendered height before animating
  el.style.height = `${el.offsetHeight}px`
  return animate(el, {
    height: [el.offsetHeight, 0],
    opacity: [1, 0],
    duration: 200,
    ease: 'inCubic',
    onComplete: () => {
      el.style.display = 'none'
      onDone?.()
    },
  })
}

/**
 * Slide an element down from above (UpdateBanner, toasts).
 */
export function slideDown(el: Element) {
  return animate(el, {
    translateY: [-36, 0],
    opacity: [0, 1],
    duration: 320,
    ease: 'outBack(1.1)',
  })
}

/**
 * Scale-pulse a badge when its count changes.
 */
export function badgePulse(el: Element) {
  return animate(el, {
    scale: [1, 1.45, 1],
    duration: 300,
    ease: 'outElastic(1, 0.5)',
  })
}

/**
 * Fade + translate a single element in (used for dynamically inserted rows).
 */
export function fadeSlideIn(el: Element, fromX = -20) {
  return animate(el, {
    opacity: [0, 1],
    translateX: [fromX, 0],
    duration: 280,
    ease: 'outExpo',
  })
}
