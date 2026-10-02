import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Box3, Group, Vector3 } from 'three'

import { Character } from '../../src/game/character/character.ts'

function joint(character: Character, name: string): Group {
  const node = character.group.getObjectByName(name)
  assert.ok(node instanceof Group, `missing ${name}`)
  return node
}

test('character is a connected figure that fits the movement capsule at rest', () => {
  const root = new Group()
  root.position.y = 0.9
  const character = new Character(root)
  assert.equal(character.group.parent, root)
  for (const name of ['torso-joint', 'head-joint', 'left-shoulder', 'right-shoulder', 'left-elbow', 'right-elbow', 'left-hip', 'right-hip', 'left-knee', 'right-knee', 'tie-joint', 'badge-joint']) {
    assert.ok(character.group.getObjectByName(name), name)
  }
  const bounds = new Box3().setFromObject(root)
  assert.ok(bounds.min.y >= -0.08, `feet pass through ground by ${-bounds.min.y}`)
  assert.ok(bounds.max.y < 2, 'head fits within the intended silhouette')
})

test('run animates opposing limbs and jump changes pose without moving the motor root', () => {
  const root = new Group()
  root.position.set(1, 0.9, 2)
  const character = new Character(root)
  character.update(0.2, 1, root.position, 'run', true, 6, 0)
  const initial = joint(character, 'left-hip').rotation.x
  root.position.z += 0.3
  character.update(0.2, 1.2, root.position, 'run', true, 6, 0)
  assert.notEqual(joint(character, 'left-hip').rotation.x, initial)
  assert.ok(joint(character, 'left-hip').rotation.x * joint(character, 'right-hip').rotation.x < 0)
  const before = root.position.clone()
  character.update(0.2, 1.4, root.position, 'jump', false, 6, 7)
  assert.ok(joint(character, 'left-knee').rotation.x > 0.5)
  assert.deepEqual(root.position, before)
})

test('respawn resets motion distance and accessory springs', () => {
  const root = new Group()
  const character = new Character(root)
  root.position.z = 3
  character.update(0.2, 1, root.position, 'run', true, 10, -6)
  root.position.z += 1
  character.update(0.2, 1.2, root.position, 'run', true, 10, -6)
  assert.notEqual(joint(character, 'tie-joint').rotation.x, 0)
  const spawn = new Vector3(0, 0.9, 0)
  character.reset(spawn)
  assert.equal(joint(character, 'tie-joint').rotation.x, 0)
  assert.equal(joint(character, 'badge-joint').rotation.x, 0)
  character.update(1 / 60, 2, spawn, 'idle', true, 0, 0)
  assert.equal(joint(character, 'left-hip').rotation.x, joint(character, 'right-hip').rotation.x)
})
