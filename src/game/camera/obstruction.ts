import type { Vector3 } from 'three'
import type { CollisionBox } from '../world/worldTypes'

/** First unobstructed camera distance along a focus-to-camera segment (0..1). */
export function firstObstructionFraction(
  focus: Vector3,
  desired: Vector3,
  boxes: readonly CollisionBox[],
  clearance = 0.25,
): number {
  const dx = desired.x - focus.x
  const dy = desired.y - focus.y
  const dz = desired.z - focus.z
  const length = Math.hypot(dx, dy, dz)
  if (length < 1e-6) return 1

  let nearest = 1
  for (const box of boxes) {
    // Ignore the solid containing the player focus. Its exit face is not an obstruction.
    if (
      focus.x > box.minX && focus.x < box.maxX &&
      focus.y > box.minY && focus.y < box.maxY &&
      focus.z > box.minZ && focus.z < box.maxZ
    ) continue

    let entry = 0
    let exit = 1
    for (const [start, direction, low, high] of [
      [focus.x, dx, box.minX, box.maxX],
      [focus.y, dy, box.minY, box.maxY],
      [focus.z, dz, box.minZ, box.maxZ],
    ]) {
      if (Math.abs(direction) < 1e-8) {
        if (start < low || start > high) { entry = Infinity; break }
      } else {
        const near = (low - start) / direction
        const far = (high - start) / direction
        entry = Math.max(entry, Math.min(near, far))
        exit = Math.min(exit, Math.max(near, far))
        if (entry > exit) break
      }
    }
    if (entry <= exit && entry >= 0 && entry <= 1) {
      nearest = Math.min(nearest, Math.max(0.1, entry - clearance / length))
    }
  }
  return nearest
}
