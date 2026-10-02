import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Scene, Vector3 } from 'three'

import { PlayerController } from '../../src/game/player/playerController.ts'
import type { WorldInteractionProfile, WorldSurface } from '../../src/game/world/worldTypes.ts'

const roof: WorldSurface = {
  id: 'roof', label: 'Roof', layer: 'rooftop', routeKind: 'rooftop', material: 'roofTile', tags: [], y: 0,
  bounds: { minX: -2, maxX: 1, minZ: -5, maxZ: 5 },
}
const interaction: WorldInteractionProfile = {
  moduleId: null, moduleLabel: 'Open', archetype: 'none', material: 'streetStone', tags: [], hint: 'none',
}
const base = {
  deltaTime: 1 / 60,
  now: 5,
  moveX: 0,
  moveZ: 0,
  sprinting: false,
  wantsJump: false,
  wantsDown: false,
  jumpBufferAge: null,
  traversal: { surfaces: [roof], modules: [] },
  resolveSurface: (position: Vector3) => position.x >= -2 && position.x <= 1 ? roof : null,
  resolveCollision: () => {},
  resolveInteraction: () => interaction,
}

test('buffered jump waits for the next grounded step before being accepted', () => {
  const player = new PlayerController(new Scene(), new Vector3(0, 0.96, 0))
  let accepted = 0
  let landed = false
  let jumped = false
  for (let i = 0; i < 12; i++) {
    player.update({ ...base, now: 5 + i / 60, wantsJump: true, acceptJump: () => { accepted++ } })
    const snapshot = player.getSnapshot()
    if (snapshot.grounded) landed = true
    if (landed && snapshot.verticalSpeed > 0) { jumped = true; break }
  }
  assert.equal(landed, true)
  assert.equal(jumped, true)
  assert.equal(accepted, 1)
})

test('coyote jump works after leaving a roof and cannot be repeated in the air', () => {
  const player = new PlayerController(new Scene(), new Vector3(0.8, 0.9, 0))
  player.update({ ...base, now: 10, acceptJump: () => {} })
  let leftAt = 0
  for (let i = 1; i <= 30; i++) {
    const now = 10 + i / 60
    player.update({ ...base, now, moveX: 1, sprinting: true, acceptJump: () => {} })
    if (!player.getSnapshot().grounded) { leftAt = now; break }
  }
  assert.ok(leftAt > 0, 'player left the roof')
  let accepted = 0
  player.update({ ...base, now: leftAt + 1 / 60, moveX: 1, wantsJump: true, acceptJump: () => { accepted++ } })
  const jumpSpeed = player.getSnapshot().verticalSpeed
  assert.ok(jumpSpeed > 0)
  player.update({ ...base, now: leftAt + 2 / 60, wantsJump: true, acceptJump: () => { accepted++ } })
  assert.equal(accepted, 1)
  assert.ok(player.getSnapshot().verticalSpeed < jumpSpeed)
})
