import type { Vector3 } from 'three'
import type {
  InteractionHint,
  MaterialKind,
  ModuleArchetype,
  TraversalTag,
  WorldLayer,
  WorldRouteKind,
} from './world/worldTypes'

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
  planarSpeed: number
  verticalSpeed: number
  landingImpact: number
  interactionKind: string
  surfaceMaterial: MaterialKind
  nearbyArchetype: ModuleArchetype | 'none'
  animation: AnimationDebugSnapshot
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
  surfaceMaterial: MaterialKind
  nearestArchetype: ModuleArchetype | 'none'
  interactionHint: InteractionHint
  surfaceTags: TraversalTag[]
  nearbyTags: TraversalTag[]
  spawnLabel: string
}

export type AnimationDebugSnapshot = {
  desiredClip: string
  activeClip: string
  usedFallback: boolean
  fallbackReason: string | null
  missingClipCount: number
}
