export const WORLD = {
  WIDTH: 300,
  DEPTH: 300,
  GROUND_Y: 0,
  ROOFTOP_Y: 7,
} as const

export const PHYSICS = {
  GRAVITY: -22,
  RUN_SPEED: 6.5,
  SPRINT_SPEED: 10,
  JUMP_VELOCITY: 7.5,
  AIR_CONTROL: 0.4,
  COYOTE_TIME: 0.12,
  JUMP_BUFFER: 0.1,
} as const

export const CAMERA = {
  DISTANCE: 10,
  HEIGHT: 4,
  FOV: 70,
  LOOK_AHEAD: 3,
  FOLLOW_LERP: 0.1,
  MOUSE_SENSITIVITY: 0.0022,
  MIN_PITCH: -0.35,
  MAX_PITCH: 0.85,
} as const
