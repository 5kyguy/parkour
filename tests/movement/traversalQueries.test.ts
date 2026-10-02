import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Vector3 } from 'three'

import { probeVaultAhead } from '../../src/game/world/traversalQueries.ts'

const data = {
  surfaces: [
    { id: 'ground', label: 'Ground', layer: 'ground', routeKind: 'ground', material: 'streetStone', tags: [], y: 0, bounds: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 } },
    { id: 'crate:top', label: 'Crate', layer: 'transition', routeKind: 'connector', material: 'wood', tags: ['vaultable'], y: 1, bounds: { minX: -0.5, maxX: 0.5, minZ: -0.5, maxZ: 0.5 } },
  ],
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

test('vault rejects an unsupported far side and an obstacle too high to clear', () => {
  const drop = { ...data, surfaces: data.surfaces.slice(1) }
  assert.equal(probeVaultAhead(new Vector3(0, 0.9, -1), 0, 0, 1, drop), null)
  const tall = { ...data, surfaces: [data.surfaces[0], { ...data.surfaces[1], y: 2 }] }
  assert.equal(probeVaultAhead(new Vector3(0, 0.9, -1), 0, 0, 1, tall), null)
})
