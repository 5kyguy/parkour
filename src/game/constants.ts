export const WORLD = {
  WIDTH: 300,
  DEPTH: 300,
  GROUND_Y: 0,
  ROOFTOP_Y: 7,
} as const

export const PLAYER = {
  HALF_HEIGHT: 0.9,
  WIDTH: 0.55,
  DEPTH: 0.35,
  /** Small padding so the proxy does not graze wall meshes. */
  COLLISION_SKIN: 0.03,
} as const

export const PHYSICS = {
  GRAVITY: -22,
  RUN_SPEED: 6.5,
  SPRINT_SPEED: 10,
  JUMP_VELOCITY: 7.5,
  LEAP_VELOCITY: 10,
  /** Forward impulse multiplier when leaping from a rooftop edge (planar boost). */
  LEAP_FORWARD_BOOST: 4,
  AIR_CONTROL: 0.4,
  COYOTE_TIME: 0.12,
  JUMP_BUFFER: 0.1,
  LANDING_GRACE: 0.2,
  VAULT_DURATION: 0.35,
  VAULT_FORWARD_SPEED: 7,
  VAULT_UP_SPEED: 5,
  WALL_RUN_DURATION: 2,
  WALL_RUN_SPEED: 8,
  WALL_RUN_STICK_DISTANCE: 0.38,
  WALL_PUSH_VELOCITY: 9,
  /** Degrees from perpendicular — used for wall-jump direction blend. */
  WALL_PUSH_ANGLE: 45,
  CLIMB_SPEED: 3,
  ROLL_DURATION: 0.5,
  SLIDE_DURATION: 0.5,
  SLIDE_SPEED: 12,
  /** Landing vertical speed magnitude that triggers auto-roll when not sliding. */
  HARD_LANDING_THRESHOLD: 12,
  GROUND_ACCEL: 12,
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
