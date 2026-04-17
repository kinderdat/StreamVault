/**
 * Module-level singleton ref to the persistent <video> element.
 * Not React state — imperative access without re-renders.
 * Set once by PersistentVideoMount on mount.
 */
let videoEl: HTMLVideoElement | null = null

export function registerVideoElement(el: HTMLVideoElement | null): void {
  videoEl = el
}

export function getVideoElement(): HTMLVideoElement | null {
  return videoEl
}
