import type { MovementState } from '../types'

export type PoseInput = {
  state: MovementState
  grounded: boolean
  speed: number
  verticalSpeed: number
  distance: number
  time: number
}

export type CharacterPose = {
  hipY: number
  torsoPitch: number
  torsoRoll: number
  headPitch: number
  leftArm: number
  rightArm: number
  leftElbow: number
  rightElbow: number
  leftLeg: number
  rightLeg: number
  leftKnee: number
  rightKnee: number
}

const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value))

/** A local-space target pose. Locomotion phase follows distance, not render frames. */
export function characterPose(input: PoseInput): CharacterPose {
  const speed = clamp(input.speed, 0, 12)
  const breath = Math.sin(input.time * 1.7)
  const pose: CharacterPose = {
    hipY: breath * 0.008,
    torsoPitch: 0.02 + breath * 0.015,
    torsoRoll: 0,
    headPitch: -0.02,
    leftArm: 0.12 + breath * 0.025,
    rightArm: 0.16 - breath * 0.025,
    leftElbow: -0.22,
    rightElbow: -0.23,
    leftLeg: 0,
    rightLeg: 0,
    leftKnee: 0.08,
    rightKnee: 0.08,
  }

  switch (input.state) {
    case 'run':
    case 'sprint': {
      const effort = clamp(speed / 9, 0, 1)
      const phase = input.distance * Math.PI / 0.8
      const stride = Math.sin(phase) * (0.25 + 0.38 * effort)
      pose.leftLeg = stride
      pose.rightLeg = -stride
      pose.leftArm = -stride * 0.8
      pose.rightArm = stride * 0.8
      pose.leftElbow = pose.rightElbow = -0.55
      pose.leftKnee = 0.1 + Math.max(0, -stride) * 0.9
      pose.rightKnee = 0.1 + Math.max(0, stride) * 0.9
      pose.hipY = Math.abs(Math.sin(phase)) * 0.04
      pose.torsoPitch = 0.08 + effort * 0.18
      pose.torsoRoll = Math.sin(phase) * 0.035
      break
    }
    case 'jump':
    case 'leap':
      pose.torsoPitch = 0.08
      pose.leftArm = pose.rightArm = -0.85
      pose.leftLeg = -0.34
      pose.rightLeg = -0.28
      pose.leftKnee = pose.rightKnee = 0.7
      break
    case 'fall':
      pose.torsoPitch = -0.12
      pose.leftArm = -0.5
      pose.rightArm = -0.38
      pose.leftLeg = 0.2
      pose.rightLeg = -0.14
      pose.leftKnee = pose.rightKnee = 0.24
      break
    case 'land':
      pose.hipY = -0.18
      pose.torsoPitch = 0.48
      pose.leftArm = pose.rightArm = 0.32
      pose.leftKnee = pose.rightKnee = 0.85
      break
    case 'vault':
      pose.hipY = 0.08
      pose.torsoPitch = 0.7
      pose.leftArm = -1.1
      pose.rightArm = -0.75
      pose.leftElbow = pose.rightElbow = -0.4
      pose.leftLeg = -0.65
      pose.rightLeg = 0.45
      pose.leftKnee = pose.rightKnee = 0.7
      break
    case 'climb': {
      const reach = Math.sin(input.time * 8) * 0.25
      pose.torsoPitch = 0.23
      pose.leftArm = -2.3 + reach
      pose.rightArm = -2.3 - reach
      pose.leftLeg = -0.32 + reach
      pose.rightLeg = -0.32 - reach
      pose.leftKnee = pose.rightKnee = 0.65
      break
    }
    case 'wallRun':
      pose.torsoRoll = 0.3
      pose.torsoPitch = 0.18
      pose.leftArm = -0.95
      pose.rightArm = 0.5
      pose.leftLeg = 0.45
      pose.rightLeg = -0.45
      pose.leftKnee = pose.rightKnee = 0.48
      break
    case 'slide':
      pose.hipY = -0.35
      pose.torsoPitch = 0.6
      pose.leftArm = -0.6
      pose.rightArm = 0.55
      pose.leftLeg = -0.82
      pose.rightLeg = -0.5
      pose.leftKnee = 0.2
      pose.rightKnee = 0.75
      break
    case 'roll':
      pose.hipY = -0.43
      pose.torsoPitch = 1.2
      pose.leftArm = pose.rightArm = -0.85
      pose.leftLeg = pose.rightLeg = -0.65
      pose.leftKnee = pose.rightKnee = 1.05
      break
    case 'idle':
      break
  }

  return pose
}
