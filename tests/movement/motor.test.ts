import assert from 'node:assert/strict'
import { test } from 'node:test'

import { Motor, solid } from '../../src/game/movement/motor.ts'

test('the motor lands on supported floors and stops at walls', () => {
  assert.ok(Motor && solid, 'a testable character motor must exist')
  const world = [solid('floor', 0, -1, 0, 40, 1, 40), solid('wall', 0, 0, -3, 8, 5, 1)]
  const motor = new Motor(world, { x: 0, y: 2, z: 0 })
  for (let i = 0; i < 180; i++) motor.step(1 / 60, { x: 0, z: -1, sprint: true })
  assert.equal(motor.grounded, true)
  assert.ok(Math.abs(motor.position.y) < 0.001)
  assert.ok(motor.position.z >= -2.5 + motor.radius - 0.001)
})

test('a jump leaves support and lands without passing through an overhead beam', () => {
  const motor = new Motor([solid('floor', 0, -1, 0, 20, 1, 20), solid('ceiling', 0, 2.2, 0, 4, 1, 4)], { x: 0, y: 0, z: 0 })
  motor.step(1 / 60, { x: 0, z: 0 })
  assert.equal(typeof motor.queueJump, 'function', 'jump input must reach the motor')
  motor.queueJump()
  motor.step(1 / 60, { x: 0, z: 0 })
  assert.ok(motor.position.y > 0)
  assert.equal(motor.grounded, false)
  for (let i = 0; i < 120; i++) {
    motor.step(1 / 60, { x: 0, z: 0 })
    assert.ok(motor.position.y + motor.height <= 2.201)
  }
  assert.equal(motor.position.y, 0)
  assert.equal(motor.grounded, true)
})

test('jump intent survives until landing inside the buffer window', () => {
  const motor = new Motor([solid('floor', 0, -1, 0, 20, 1, 20)], { x: 0, y: 0.05, z: 0 })
  motor.queueJump()
  motor.step(1 / 60, { x: 0, z: 0 })
  assert.ok(motor.velocity.y < 0, 'airborne request waits for support')
  for (let i = 0; i < 10; i++) motor.step(1 / 60, { x: 0, z: 0 })
  assert.ok(motor.velocity.y > 0, 'buffered jump fires after landing')
})

test('coyote jump works just after leaving a roof edge and cannot repeat in air', () => {
  const motor = new Motor([solid('roof', 0, -1, 0, 2, 1, 2)], { x: 0.8, y: 0, z: 0 })
  motor.step(1 / 60, { x: 1, z: 0 })
  while (motor.grounded) motor.step(1 / 60, { x: 1, z: 0 })
  motor.step(1 / 60, { x: 1, z: 0 })
  motor.queueJump()
  motor.step(1 / 60, { x: 1, z: 0 })
  assert.ok(motor.velocity.y > 7, 'late takeoff should be accepted')
  const before = motor.velocity.y
  motor.queueJump()
  motor.step(1 / 60, { x: 1, z: 0 })
  assert.ok(motor.velocity.y < before, 'the same support cannot grant another jump')
})

test('a contextual vault crosses the obstacle in the approach direction and lands', () => {
  const world = [solid('floor', 0, -1, 0, 30, 1, 30), solid('hurdle', 0, 0, -1, 4, 0.85, 0.6, 'vault')]
  const motor = new Motor(world, { x: 0, y: 0, z: 0.05 })
  motor.step(1 / 60, { x: 0, z: -1 })
  motor.queueJump()
  motor.step(1 / 60, { x: 0, z: -1 })
  assert.equal(motor.state, 'vault')
  for (let i = 0; i < 45; i++) motor.step(1 / 60, { x: 0, z: -1 })
  assert.ok(motor.position.z < -1.7)
  assert.equal(motor.position.y, 0)
  assert.equal(motor.grounded, true)
})

test('a mantle finishes supported on the higher terrace', () => {
  const motor = new Motor([solid('floor', 0, -1, 0, 30, 1, 30), solid('terrace', 0, 0, -3, 6, 1.35, 4, 'mantle')], { x: 0, y: 0, z: -0.3 })
  motor.step(1 / 60, { x: 0, z: -1 })
  motor.queueJump()
  motor.step(1 / 60, { x: 0, z: -1 })
  assert.equal(motor.state, 'mantle')
  for (let i = 0; i < 48; i++) motor.step(1 / 60, { x: 0, z: 0 })
  assert.ok(motor.position.z < -1.3)
  assert.equal(motor.position.y, 1.35)
  assert.equal(motor.grounded, true)
})

test('traversal rejects a blocked destination and a vault over an unsupported drop', () => {
  const motor = new Motor([
    solid('floor', 0, -1, 0, 30, 1, 30), solid('terrace', 0, 0, -3, 6, 1.35, 4, 'mantle'),
    solid('low-ceiling', 0, 2.3, -3, 6, 1, 4),
  ], { x: 0, y: 0, z: -0.3 })
  assert.equal(typeof motor.probe, 'function')
  assert.equal(motor.probe({ x: 0, z: -1 }), null)
  const drop = new Motor([solid('roof', 0, 0, 2.5, 6, 3, 5), solid('rail', 0, 3, 0.3, 4, 0.8, 0.5, 'vault')], { x: 0, y: 3, z: 1.2 })
  drop.step(1 / 60, { x: 0, z: 0 })
  assert.equal(drop.probe({ x: 0, z: -1 }), null)
})

test('respawn clears velocity and pending actions at the known safe spawn', () => {
  const spawn = { x: 1, y: 0, z: 2 }
  const motor = new Motor([solid('floor', 0, -1, 0, 20, 1, 20)], spawn)
  motor.queueJump()
  assert.equal(typeof motor.reset, 'function')
  motor.reset()
  assert.deepEqual(motor.position, spawn)
  assert.deepEqual(motor.velocity, { x: 0, y: 0, z: 0 })
  motor.step(1 / 60, { x: 0, z: 0 })
  assert.equal(motor.position.y, 0)
})
