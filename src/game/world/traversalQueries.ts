import { Vector3 } from 'three'
import { PHYSICS, PLAYER, WORLD } from '../constants.ts'
import type { WorldBounds, WorldModuleRuntime, WorldSurface } from './worldTypes'

export type WorldTraversalData = {
  surfaces: readonly WorldSurface[]
  modules: readonly WorldModuleRuntime[]
}

export type VaultProbe = {
  moduleId: string
  label: string
  /** Obstacle top and supported far-side landing height. */
  obstacleY: number
  landingY: number
  exitX: number
  exitZ: number
  /** Horizontal approach direction across the obstacle (unit XZ). */
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
const CLIMB_LANDING_INSET = PLAYER.WIDTH / 2 + PLAYER.COLLISION_SKIN + 0.1
const LEAP_APPROACH_DISTANCE = 2.2

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

    const obstacleY = getVaultLandingY(mod.id, data.surfaces)
    if (obstacleY <= footY + 0.05 || obstacleY > footY + 1.15) {
      continue
    }
    const alongX = Math.abs(fx) > Math.abs(fz)
    const main = alongX ? fx : fz
    if (Math.abs(main) < 0.8) {
      continue
    }
    const edge = alongX
      ? main > 0 ? mod.bounds.maxX : mod.bounds.minX
      : main > 0 ? mod.bounds.maxZ : mod.bounds.minZ
    const crossing = (edge - (alongX ? position.x : position.z)) / main
    if (crossing < 0 || crossing > 4) {
      continue
    }
    const exitDistance = crossing + PLAYER.WIDTH / 2 + 0.35
    const exitX = position.x + fx * exitDistance
    const exitZ = position.z + fz * exitDistance
    const landing = data.surfaces
      .filter((surface) =>
        surface.id !== `${mod.id}:top` &&
        isPointInsideBoundsXZ(exitX, exitZ, surface.bounds) &&
        surface.y <= footY + 0.3 && surface.y >= footY - 2,
      )
      .sort((a, b) => b.y - a.y)[0]
    if (!landing) {
      continue
    }

    if (distXZ < bestDist) {
      bestDist = distXZ
      best = {
        moduleId: mod.id,
        label: mod.label,
        obstacleY,
        landingY: landing.y,
        exitX,
        exitZ,
        exitForwardX: fx,
        exitForwardZ: fz,
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
        snapX: Math.max(mod.bounds.minX + CLIMB_LANDING_INSET, Math.min(mod.bounds.maxX - CLIMB_LANDING_INSET, cx)),
        snapZ: Math.max(mod.bounds.minZ + CLIMB_LANDING_INSET, Math.min(mod.bounds.maxZ - CLIMB_LANDING_INSET, cz)),
      }
    }
  }

  return best
}

export function probeRooftopLeap(
  position: Vector3,
  footY: number,
  forwardX: number,
  forwardZ: number,
  surface: WorldSurface | null,
  data: WorldTraversalData,
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

  if (!isPointInsideBoundsXZ(position.x, position.z, surface.bounds)) {
    return false
  }
  const edgeX = fx > 0 ? (surface.bounds.maxX - position.x) / fx
    : fx < 0 ? (surface.bounds.minX - position.x) / fx : Number.POSITIVE_INFINITY
  const edgeZ = fz > 0 ? (surface.bounds.maxZ - position.z) / fz
    : fz < 0 ? (surface.bounds.minZ - position.z) / fz : Number.POSITIVE_INFINITY
  const toEdge = Math.min(edgeX, edgeZ)
  if (toEdge < 0 || toEdge > LEAP_APPROACH_DISTANCE) {
    return false
  }
  const takeoffX = position.x + fx * toEdge
  const takeoffZ = position.z + fz * toEdge

  // Require a landing inside another roof rather than leaping toward open ground.
  const landingInset = PLAYER.WIDTH / 2 + PLAYER.COLLISION_SKIN + 0.08
  for (const candidate of data.surfaces) {
    if (candidate.id === surface.id || candidate.layer !== 'rooftop' || Math.abs(candidate.y - footY) > 0.8) {
      continue
    }
    const safeBounds = {
      minX: candidate.bounds.minX + landingInset,
      maxX: candidate.bounds.maxX - landingInset,
      minZ: candidate.bounds.minZ + landingInset,
      maxZ: candidate.bounds.maxZ - landingInset,
    }
    for (let distance = 0.25; distance <= 3; distance += 0.25) {
      if (isPointInsideBoundsXZ(takeoffX + fx * distance, takeoffZ + fz * distance, safeBounds)) {
        return true
      }
    }
  }
  return false
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
