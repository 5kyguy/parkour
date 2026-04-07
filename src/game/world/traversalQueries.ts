import { Vector3 } from 'three'
import { PHYSICS, PLAYER, WORLD } from '../constants'
import type { WorldBounds, WorldModuleRuntime, WorldSurface } from './worldTypes'

export type WorldTraversalData = {
  surfaces: readonly WorldSurface[]
  modules: readonly WorldModuleRuntime[]
}

export type VaultProbe = {
  moduleId: string
  label: string
  /** World Y of the vault landing (walkable top). */
  landingY: number
  /** Horizontal direction away from obstacle after vault (unit XZ). */
  exitForwardX: number
  exitForwardZ: number
}

export type ClimbProbe = {
  moduleId: string
  label: string
  roofY: number
  /** Snap the player toward this XZ (wall midpoint on the approached side). */
  snapX: number
  snapZ: number
}

export type WallRunProbe = {
  moduleId: string
  tangentX: number
  tangentZ: number
  wallNx: number
  wallNz: number
  roofY: number
}

const VAULT_PROBE_DISTANCE = 1.15
const CLIMB_MAX_START_HEIGHT = 2.2
const LEDGE_LEAP_SAMPLE = 0.55

export function closestPointOnBoundsXZ(x: number, z: number, bounds: WorldBounds): { cx: number; cz: number } {
  const cx = Math.min(Math.max(x, bounds.minX), bounds.maxX)
  const cz = Math.min(Math.max(z, bounds.minZ), bounds.maxZ)
  return { cx, cz }
}

export function distancePointToBoundsXZ(x: number, z: number, bounds: WorldBounds): number {
  const { cx, cz } = closestPointOnBoundsXZ(x, z, bounds)
  return Math.hypot(x - cx, z - cz)
}

export function isPointInsideBoundsXZ(x: number, z: number, bounds: WorldBounds): boolean {
  return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ
}

export function getModuleRoofY(moduleId: string, surfaces: readonly WorldSurface[]): number {
  let best = 0
  for (const s of surfaces) {
    if (s.id.startsWith(moduleId)) {
      best = Math.max(best, s.y)
    }
  }
  return best
}

export function probeVaultAhead(
  position: Vector3,
  footY: number,
  forwardX: number,
  forwardZ: number,
  data: WorldTraversalData,
): VaultProbe | null {
  const len = Math.hypot(forwardX, forwardZ)
  if (len < 0.05) {
    return null
  }
  const fx = forwardX / len
  const fz = forwardZ / len

  let best: VaultProbe | null = null
  let bestDist = VAULT_PROBE_DISTANCE

  for (const mod of data.modules) {
    if (!mod.tags.includes('vaultable')) {
      continue
    }

    const { cx, cz } = closestPointOnBoundsXZ(position.x, position.z, mod.bounds)
    const tox = cx - position.x
    const toz = cz - position.z
    const distXZ = Math.hypot(tox, toz)
    const toLen = distXZ || 1
    const faceDot = (fx * tox + fz * toz) / toLen
    // Flush against obstacle: skip facing check so Space still registers.
    if (distXZ > 0.06 && faceDot < 0.22) {
      continue
    }

    if (distXZ > 0.95) {
      continue
    }

    const landingY = getVaultLandingY(mod.id, data.surfaces)
    if (landingY <= footY + 0.05) {
      continue
    }
    if (footY < landingY - 2.8 || footY > landingY - 0.12) {
      continue
    }

    if (distXZ < bestDist) {
      bestDist = distXZ
      const awayX = position.x - cx
      const awayZ = position.z - cz
      const awayLen = Math.hypot(awayX, awayZ) || 1
      best = {
        moduleId: mod.id,
        label: mod.label,
        landingY,
        exitForwardX: awayX / awayLen,
        exitForwardZ: awayZ / awayLen,
      }
    }
  }

  return best
}

function getVaultLandingY(moduleId: string, surfaces: readonly WorldSurface[]): number {
  for (const s of surfaces) {
    if (s.id === `${moduleId}:top`) {
      return s.y
    }
  }
  return getModuleRoofY(moduleId, surfaces)
}

function distanceToAxisAlignedRectEdge(x: number, z: number, bounds: WorldBounds): number {
  const inside = isPointInsideBoundsXZ(x, z, bounds)
  if (inside) {
    const dx = Math.min(x - bounds.minX, bounds.maxX - x)
    const dz = Math.min(z - bounds.minZ, bounds.maxZ - z)
    return Math.min(dx, dz)
  }
  return distancePointToBoundsXZ(x, z, bounds)
}

export function probeClimbStart(
  position: Vector3,
  footY: number,
  forwardX: number,
  forwardZ: number,
  data: WorldTraversalData,
): ClimbProbe | null {
  if (footY > CLIMB_MAX_START_HEIGHT) {
    return null
  }

  const len = Math.hypot(forwardX, forwardZ)
  if (len < 0.05) {
    return null
  }
  const fx = forwardX / len
  const fz = forwardZ / len

  let best: ClimbProbe | null = null
  let bestScore = Number.POSITIVE_INFINITY

  for (const mod of data.modules) {
    if (!mod.tags.includes('climbable')) {
      continue
    }

    const roofY = getModuleRoofY(mod.id, data.surfaces)
    if (roofY < 3) {
      continue
    }

    if (footY > roofY - PLAYER.HALF_HEIGHT - 0.25) {
      continue
    }

    const { cx, cz } = closestPointOnBoundsXZ(position.x, position.z, mod.bounds)
    const dist = Math.hypot(position.x - cx, position.z - cz)
    if (dist > 0.88) {
      continue
    }

    const inside = isPointInsideBoundsXZ(position.x, position.z, mod.bounds)
    if (inside) {
      continue
    }

    const toWallX = cx - position.x
    const toWallZ = cz - position.z
    const toLen = Math.hypot(toWallX, toWallZ) || 1
    const dot = (toWallX / toLen) * fx + (toWallZ / toLen) * fz
    if (dist > 0.08 && dot < 0.22) {
      continue
    }

    const score = dist
    if (score < bestScore) {
      bestScore = score
      best = {
        moduleId: mod.id,
        label: mod.label,
        roofY,
        snapX: cx,
        snapZ: cz,
      }
    }
  }

  return best
}

export function probeRooftopLeap(
  position: Vector3,
  _footY: number,
  forwardX: number,
  forwardZ: number,
  surface: WorldSurface | null,
): boolean {
  if (!surface) {
    return false
  }
  const isRooftopLike =
    surface.layer === 'rooftop' || surface.tags.includes('ledge') || surface.routeKind === 'rooftop'
  if (!isRooftopLike) {
    return false
  }

  const len = Math.hypot(forwardX, forwardZ)
  if (len < 0.35) {
    return false
  }
  const fx = forwardX / len
  const fz = forwardZ / len

  const sampleX = position.x + fx * LEDGE_LEAP_SAMPLE
  const sampleZ = position.z + fz * LEDGE_LEAP_SAMPLE
  if (isPointInsideBoundsXZ(sampleX, sampleZ, surface.bounds)) {
    return false
  }

  return true
}

export function probeWallRun(
  position: Vector3,
  footY: number,
  headY: number,
  velocityX: number,
  velocityZ: number,
  data: WorldTraversalData,
): WallRunProbe | null {
  let best: WallRunProbe | null = null
  let bestDist: number = PHYSICS.WALL_RUN_STICK_DISTANCE

  for (const mod of data.modules) {
    if (!mod.tags.includes('wallRunnable')) {
      continue
    }

    const roofY = Math.max(getModuleRoofY(mod.id, data.surfaces), WORLD.ROOFTOP_Y + 1)
    if (footY > roofY - 0.4 || headY < 0.8) {
      continue
    }

    const edgeDist = distanceToAxisAlignedRectEdge(position.x, position.z, mod.bounds)
    if (edgeDist > bestDist) {
      continue
    }

    const inside = isPointInsideBoundsXZ(position.x, position.z, mod.bounds)
    const { cx, cz } = closestPointOnBoundsXZ(position.x, position.z, mod.bounds)

    let nx: number
    let nz: number
    if (inside) {
      const dx = Math.min(position.x - mod.bounds.minX, mod.bounds.maxX - position.x)
      const dz = Math.min(position.z - mod.bounds.minZ, mod.bounds.maxZ - position.z)
      if (dx < dz) {
        nx = position.x < (mod.bounds.minX + mod.bounds.maxX) / 2 ? -1 : 1
        nz = 0
      } else {
        nx = 0
        nz = position.z < (mod.bounds.minZ + mod.bounds.maxZ) / 2 ? -1 : 1
      }
    } else {
      nx = position.x - cx
      nz = position.z - cz
      const nLen = Math.hypot(nx, nz) || 1
      nx /= nLen
      nz /= nLen
    }

    const tx = -nz
    const tz = nx
    const speed = Math.hypot(velocityX, velocityZ)
    if (speed < 1.2) {
      continue
    }

    const align = Math.abs((velocityX * nx + velocityZ * nz) / speed)
    if (align > 0.92) {
      continue
    }

    if (edgeDist < bestDist) {
      bestDist = edgeDist
      best = {
        moduleId: mod.id,
        tangentX: tx,
        tangentZ: tz,
        wallNx: nx,
        wallNz: nz,
        roofY,
      }
    }
  }

  return best
}
