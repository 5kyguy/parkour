import type { Vector3 } from 'three'

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
}
