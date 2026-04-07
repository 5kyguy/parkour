import type { Vector3 } from 'three'
import type { TraversalTag, WorldLayer, WorldRouteKind } from './world/worldTypes'

export type MovementState =
  | 'idle'
  | 'run'
  | 'sprint'
  | 'jump'
  | 'fall'
  | 'land'
  | 'climb'
  | 'vault'
  | 'leap'
  | 'wallRun'
  | 'roll'
  | 'slide'

export type PlayerSnapshot = {
  position: Vector3
  velocity: Vector3
  state: MovementState
  grounded: boolean
  /** Seconds remaining for coyote jump after leaving ground. */
  coyoteRemaining: number
  /** Seconds remaining in landing grace window. */
  landingGraceRemaining: number
  /** Buffered jump age in seconds if a jump is queued, else null. */
  jumpBufferAge: number | null
  /** Last transition reason for debug HUD. */
  transitionNote: string
}

export type GameSnapshot = {
  fps: number
  player: PlayerSnapshot
  environment: EnvironmentSnapshot
}

export type EnvironmentSnapshot = {
  surfaceLabel: string
  layer: WorldLayer
  routeKind: WorldRouteKind
  surfaceTags: TraversalTag[]
  nearbyTags: TraversalTag[]
  spawnLabel: string
}
