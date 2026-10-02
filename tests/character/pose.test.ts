import assert from 'node:assert/strict'
import { test } from 'node:test'

import { characterPose, type PoseInput } from '../../src/game/character/pose.ts'

const idle: PoseInput = { state: 'idle', grounded: true, speed: 0, verticalSpeed: 0, distance: 0, time: 0 }

test('idle holds an upright, asymmetric relaxed pose', () => {
  const pose = characterPose(idle)
  assert.ok(Math.abs(pose.torsoPitch) < 0.15)
  assert.ok(Math.abs(pose.leftLeg) < 0.15)
  assert.ok(Math.abs(pose.rightLeg) < 0.15)
  assert.ok(Math.abs(pose.leftArm - pose.rightArm) > 0.01)
})

test('running legs and opposing arms alternate with distance, not elapsed time', () => {
  const a = characterPose({ ...idle, state: 'run', speed: 6, distance: 0.2, time: 0 })
  const b = characterPose({ ...idle, state: 'run', speed: 6, distance: 0.2, time: 100 })
  const halfStride = characterPose({ ...idle, state: 'run', speed: 6, distance: 1, time: 0 })
  assert.equal(a.leftLeg, b.leftLeg)
  assert.equal(a.rightLeg, b.rightLeg)
  assert.ok(a.leftLeg * a.rightLeg < 0)
  assert.ok(a.leftArm * a.leftLeg < 0)
  assert.ok(a.leftLeg * halfStride.leftLeg < 0)
})

test('airborne, vault, climb, slide, and roll states have distinct silhouettes', () => {
  const jump = characterPose({ ...idle, state: 'jump', grounded: false, verticalSpeed: 7 })
  const fall = characterPose({ ...idle, state: 'fall', grounded: false, verticalSpeed: -8 })
  const vault = characterPose({ ...idle, state: 'vault', grounded: false, speed: 7 })
  const climb = characterPose({ ...idle, state: 'climb', grounded: false })
  const slide = characterPose({ ...idle, state: 'slide', speed: 8 })
  const roll = characterPose({ ...idle, state: 'roll', speed: 4 })
  assert.ok(jump.leftKnee > 0.3 && jump.rightKnee > 0.3)
  assert.ok(fall.leftArm !== jump.leftArm)
  assert.ok(vault.torsoPitch > jump.torsoPitch)
  assert.ok(climb.leftArm < 0 && climb.rightArm < 0)
  assert.ok(slide.hipY < -0.25)
  assert.ok(roll.torsoPitch > slide.torsoPitch)
})

test('all poses remain finite across speed and vertical velocity extremes', () => {
  for (const state of ['idle', 'run', 'sprint', 'jump', 'fall', 'leap', 'land', 'vault', 'climb', 'wallRun', 'slide', 'roll'] as const) {
    for (const speed of [0, 5, 12, 100]) {
      const pose = characterPose({ state, speed, grounded: state === 'idle' || state === 'run', verticalSpeed: -100, distance: 10000, time: 10000 })
      assert.ok(Object.values(pose).every(Number.isFinite), `${state} pose must be finite`)
    }
  }
})
