import type { Vector3 } from 'three'
import type { TraversalTag, WorldLayer, WorldRouteKind } from './world/worldTypes'

export type MovementState = 'idle' | 'run' | 'sprint' | 'jump' | 'fall' | 'land'

export type PlayerSnapshot = {
  position: Vector3
  velocity: Vector3
  state: MovementState
  grounded: boolean
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
