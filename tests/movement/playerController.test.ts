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

test('Space vaults a low solid barrier and lands beyond it with forward momentum', () => {
  const floor: WorldSurface = { ...roof, id: 'floor', layer: 'ground', routeKind: 'ground', material: 'streetStone', bounds: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 } }
  const barrier: WorldSurface = { ...roof, id: 'barrier:top', layer: 'transition', routeKind: 'connector', material: 'stone', tags: ['vaultable'], y: 0.8, bounds: { minX: -1.5, maxX: 1.5, minZ: -0.3, maxZ: 0.3 } }
  const module = { id: 'barrier', label: 'Low wall', archetype: 'vaultBarrier' as const, material: 'stone' as const, layer: 'transition' as const, routeKind: 'connector' as const, tags: ['vaultable' as const], bounds: barrier.bounds }
  const player = new PlayerController(new Scene(), new Vector3(0, 0.9, -0.9))
  const collision = (position: Vector3, velocity: Vector3): void => {
    const foot = position.y - 0.9
    if (foot < 0.8 && position.y + 0.9 > 0 && Math.abs(position.x) < 1.8 && Math.abs(position.z) < 0.5) {
      position.z = position.z < 0 ? -0.5 : 0.5
      velocity.z = 0
    }
  }
  const args = {
    ...base,
    moveZ: 1,
    traversal: { surfaces: [floor, barrier], modules: [module] },
    resolveSurface: (position: Vector3, footY: number) => Math.abs(position.z) <= 0.3 && footY >= -0.4 && footY <= 2 ? barrier : floor,
    resolveCollision: collision,
  }
  player.update({ ...args, now: 10, acceptJump: () => {} })
  let accepted = 0
  player.update({ ...args, now: 10 + 1 / 60, wantsJump: true, acceptJump: () => { accepted++ } })
  assert.equal(accepted, 1)
  assert.equal(player.getSnapshot().state, 'vault')
  for (let i = 2; i < 80; i++) {
    player.update({ ...args, now: 10 + i / 60, acceptJump: () => {} })
  }
  assert.ok(player.getPosition().z > 0.65, `vault exit z=${player.getPosition().z}`)
  assert.equal(player.getSnapshot().grounded, true)
  assert.ok(player.getSnapshot().planarSpeed > 2)
})
