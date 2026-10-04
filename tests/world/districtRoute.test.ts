import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createDistrictSlice } from '../../src/game/world/districtSlice.ts'
import type { BuildingModuleDefinition } from '../../src/game/world/worldTypes'

const district = createDistrictSlice()
const building = (id: string): BuildingModuleDefinition => {
  const module = district.modules.find(item => item.id === id)
  if (!module || module.kind !== 'building') throw new Error(`${id} must be a building`)
  return module
}

test('the courtyard workshop has a forward roof within leaping reach', () => {
  const workshop = building('courtyard-north-workshop')
  const arcade = building('courtyard-north-arcade')
  const farEdge = workshop.position.z + workshop.footprint.depth / 2
  const nearEdge = arcade.position.z - arcade.footprint.depth / 2
  assert.ok(nearEdge > farEdge)
  assert.ok(nearEdge - farEdge <= 2.5, 'the gap is within the intended parkour metric')
  assert.equal(arcade.height, workshop.height)
  assert.ok(arcade.position.x - arcade.footprint.width / 2 < -118)
  assert.ok(arcade.position.x + arcade.footprint.width / 2 > -118)
})

test('the northern roof branches to two supported side roofs', () => {
  const arcade = building('courtyard-north-arcade')
  const west = building('courtyard-west-ledger')
  const east = building('courtyard-east-gallery')
  const arcadeWest = arcade.position.x - arcade.footprint.width / 2
  const arcadeEast = arcade.position.x + arcade.footprint.width / 2
  assert.ok(arcadeWest - (west.position.x + west.footprint.width / 2) > 0)
  assert.ok(arcadeWest - (west.position.x + west.footprint.width / 2) <= 2.5)
  assert.ok(east.position.x - east.footprint.width / 2 - arcadeEast > 0)
  assert.ok(east.position.x - east.footprint.width / 2 - arcadeEast <= 2.5)
  assert.equal(west.height, arcade.height)
  assert.equal(east.height, arcade.height)
})
