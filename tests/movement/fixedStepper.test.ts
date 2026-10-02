import assert from 'node:assert/strict'
import { test } from 'node:test'

import { FixedStepper } from '../../src/game/movement/fixedStepper.ts'

test('equal elapsed time produces equal simulation steps across render schedules', () => {
  const steady = new FixedStepper()
  const uneven = new FixedStepper()
  let steadySteps = 0
  let unevenSteps = 0
  for (let i = 0; i < 60; i++) steady.advance(1 / 60, () => { steadySteps++ })
  for (let i = 0; i < 30; i++) {
    uneven.advance(1 / 120, () => { unevenSteps++ })
    uneven.advance(3 / 120, () => { unevenSteps++ })
  }
  assert.equal(steadySteps, 60)
  assert.equal(unevenSteps, steadySteps)
})

test('catch-up is bounded and reset discards accumulated frame time', () => {
  const stepper = new FixedStepper()
  let steps = 0
  stepper.advance(10, () => { steps++ })
  assert.ok(steps <= 6)
  assert.ok(steps > 0)
  stepper.advance(1 / 120, () => { steps++ })
  stepper.reset()
  const before = steps
  stepper.advance(1 / 120, () => { steps++ })
  assert.equal(steps, before)
  stepper.advance(1 / 120, () => { steps++ })
  assert.equal(steps, before + 1)
})

test('a zero elapsed render does not advance the game', () => {
  const stepper = new FixedStepper()
  let steps = 0
  stepper.advance(0, () => { steps++ })
  assert.equal(steps, 0)
})
