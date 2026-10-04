import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Vector3 } from 'three'

import { FollowCamera } from '../../src/game/camera/followCamera.ts'
import type { PlayerSnapshot } from '../../src/game/types.ts'

const player = (): PlayerSnapshot => ({
  position: new Vector3(0, 0.9, 0), velocity: new Vector3(), state: 'idle', grounded: true,
  planarSpeed: 0, verticalSpeed: 0, landingImpact: 0, interactionKind: 'none',
  surfaceMaterial: 'streetStone', nearbyArchetype: 'none', coyoteRemaining: 0,
  landingGraceRemaining: 0, jumpBufferAge: null, transitionNote: '',
})

test('follow camera moves in front of a wall rather than passing behind it', () => {
  const obstacle = { id: 'courtyard-wall', minX: -3, maxX: 3, minY: 0, maxY: 6, minZ: -3, maxZ: -2 }
  const camera = new FollowCamera(1, [obstacle])
  for (let i = 0; i < 30; i++) camera.update(player(), 1 / 60)
  assert.ok(camera.camera.position.z > -2, `camera behind wall at z=${camera.camera.position.z}`)
  assert.ok(camera.camera.position.z < -0.5, `camera must still follow from behind`)
})

test('camera restores distance when the obstruction is no longer between player and camera', () => {
  const obstacle = { id: 'courtyard-wall', minX: -3, maxX: 3, minY: 0, maxY: 6, minZ: -3, maxZ: -2 }
  const camera = new FollowCamera(1, [obstacle])
  for (let i = 0; i < 20; i++) camera.update(player(), 1 / 60)
  const blockedZ = camera.camera.position.z
  const onRoof = { ...player(), position: new Vector3(0, 7.9, 0) }
  for (let i = 0; i < 90; i++) camera.update(onRoof, 1 / 60)
  assert.ok(camera.camera.position.z < blockedZ - 3, `camera did not zoom back: ${camera.camera.position.z}`)
})
