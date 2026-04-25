import { createPlayer } from '@videojs/react'
import { videoFeatures } from '@videojs/react/video'
import '@videojs/react/video/skin.css'

export const StreamVaultVideo = createPlayer({ features: videoFeatures })
