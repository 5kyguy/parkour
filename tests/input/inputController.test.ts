import assert from 'node:assert/strict'
import { test } from 'node:test'

import { InputController } from '../../src/game/input/inputController.ts'

function key(target: EventTarget, type: string, code: string): void {
  const event = new Event(type)
  Object.defineProperty(event, 'code', { value: code })
  Object.defineProperty(event, 'repeat', { value: false })
  target.dispatchEvent(event)
}

test('a jump stays queued until the movement controller accepts it', () => {
  const target = new EventTarget()
  const input = new InputController(target as Window)
  key(target, 'keydown', 'Space')
  const now = performance.now() / 1000
  assert.notEqual(input.peekJumpBufferAge(now, 0.1), null)
  assert.notEqual(input.peekJumpBufferAge(now + 0.05, 0.1), null)
  input.acknowledgeJumpRequest()
  assert.equal(input.peekJumpBufferAge(now + 0.05, 0.1), null)
})

test('stale jumps expire and focus loss clears pending actions and movement', () => {
  const target = new EventTarget()
  const input = new InputController(target as Window)
  key(target, 'keydown', 'Space')
  key(target, 'keydown', 'KeyW')
  const now = performance.now() / 1000
  assert.equal(input.peekJumpBufferAge(now + 1, 0.1), null)
  key(target, 'keydown', 'Space')
  target.dispatchEvent(new Event('blur'))
  assert.equal(input.peekJumpBufferAge(performance.now() / 1000, 0.1), null)
  assert.equal(input.moveZ, 0)
})

test('auto-repeated keydown does not queue a second jump', () => {
  const target = new EventTarget()
  const input = new InputController(target as Window)
  key(target, 'keydown', 'Space')
  input.acknowledgeJumpRequest()
  const repeat = new Event('keydown')
  Object.defineProperty(repeat, 'code', { value: 'Space' })
  Object.defineProperty(repeat, 'repeat', { value: true })
  target.dispatchEvent(repeat)
  assert.equal(input.peekJumpBufferAge(performance.now() / 1000, 0.1), null)
})
