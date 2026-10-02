import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Vector3 } from 'three'

import { probeVaultAhead } from '../../src/game/world/traversalQueries.ts'

const data = {
  surfaces: [{ id: 'crate:top', label: 'Crate', layer: 'transition', routeKind: 'connector', material: 'wood', tags: ['vaultable'], y: 1, bounds: { minX: -0.5, maxX: 0.5, minZ: -0.5, maxZ: 0.5 } }],
  modules: [{ id: 'crate', label: 'Crate', archetype: 'crateCluster', material: 'wood', layer: 'transition', routeKind: 'connector', tags: ['vaultable'], bounds: { minX: -0.5, maxX: 0.5, minZ: -0.5, maxZ: 0.5 } }],
} as const

test('vault exits past the obstacle in the approach direction from either side', () => {
  const fromNorth = probeVaultAhead(new Vector3(0, 0.9, -1), 0, 0, 1, data)
  const fromSouth = probeVaultAhead(new Vector3(0, 0.9, 1), 0, 0, -1, data)
  assert.equal(fromNorth?.exitForwardZ, 1)
  assert.equal(fromSouth?.exitForwardZ, -1)
})

test('vault rejects an approach facing away from the obstacle', () => {
  assert.equal(probeVaultAhead(new Vector3(0, 0.9, 1), 0, 0, 1, data), null)
})
