import type videojs from 'video.js'

let playerRef: videojs.Player | null = null

export function registerVideoJsPlayer(player: videojs.Player | null) {
  playerRef = player
}

export function getVideoJsPlayer(): videojs.Player | null {
  return playerRef
}

