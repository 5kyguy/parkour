import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Vector3 } from 'three'

import { firstObstructionFraction } from '../../src/game/camera/obstruction.ts'

const wall = { id: 'wall', minX: -2, maxX: 2, minY: 0, maxY: 6, minZ: 2, maxZ: 3 }

test('camera ray stops before the nearest wall on the way back from the player', () => {
  const focus = new Vector3(0, 2, 0)
  const desired = new Vector3(0, 4, 8)
  const fraction = firstObstructionFraction(focus, desired, [wall])
  assert.ok(fraction > 0.2 && fraction < 0.25, `expected to stop before z=2, got ${fraction}`)
  assert.equal(firstObstructionFraction(focus, desired, [{ ...wall, minZ: 5, maxZ: 6 }, wall]), fraction)
})

test('camera ray ignores solids behind or beside the camera and below its flight path', () => {
  const focus = new Vector3(0, 8, 0)
  const desired = new Vector3(0, 11, 8)
  assert.equal(firstObstructionFraction(focus, desired, [wall]), 1)
  assert.equal(firstObstructionFraction(new Vector3(0, 2, 0), new Vector3(0, 4, 8), [{ ...wall, minX: 3, maxX: 4 }]), 1)
  assert.equal(firstObstructionFraction(new Vector3(0, 2, 0), new Vector3(0, 4, 8), [{ ...wall, minZ: -3, maxZ: -2 }]), 1)
})

test('a focus inside a solid cannot cause an invalid camera fraction', () => {
  const value = firstObstructionFraction(new Vector3(0, 2, 2.5), new Vector3(0, 4, 8), [wall])
  assert.equal(value, 1)
  assert.equal(firstObstructionFraction(new Vector3(0, 2, 0), new Vector3(0, 2, 0), [wall]), 1)
})
