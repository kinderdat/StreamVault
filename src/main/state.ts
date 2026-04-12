/** Shared runtime state — imported by both monitor and recorder to avoid circular deps */

// streamerId → timestamp of last recording completion
export const recentlyFinished = new Map<number, number>()
export const COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

export function markRecordingFinished(streamerId: number): void {
  recentlyFinished.set(streamerId, Date.now())
}
