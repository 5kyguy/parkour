import {
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  Vector3,
} from 'three'
import { PLAYER, WORLD } from '../constants'
import type { EnvironmentSnapshot } from '../types'
import { createDistrictSlice } from './districtSlice'
import { createWorldMaterial } from './worldPalette'
import type {
  BuildingModuleDefinition,
  CollisionBox,
  FacadeStyle,
  InteractionHint,
  MaterialKind,
  PropModuleDefinition,
  RoofStyle,
  TraversalTag,
  WorldBounds,
  WorldInteractionProfile,
  WorldModuleDefinition,
  WorldModuleRuntime,
  WorldSpawnPoint,
  WorldSurface,
} from './worldTypes'
import type { WorldTraversalData } from './traversalQueries'

const GROUND_OVERLAY_THICKNESS = 0.08
const ROOF_THICKNESS = 0.4
const NEARBY_TAG_RADIUS = 10
/** Solid building volume stops slightly below the roof deck so rooftop standing does not intersect walls. */
const BUILDING_SOLID_TOP_EPS = 0.12
const COLLISION_ITERATIONS = 6
const PLINTH_HEIGHT = 0.52
/** Visual ridge height for `pitched` style (deck stays horizontal so it meets walls cleanly). */
const PITCHED_RIDGE_HEIGHT = 0.3

type BuildingPart = {
  cx: number
  cz: number
  width: number
  depth: number
  index: number
}

export class WorldBuilder {
  private readonly materialCache = new Map<MaterialKind, ReturnType<typeof createWorldMaterial>>()
  private readonly surfaces: WorldSurface[] = []
  private readonly moduleRuntime: WorldModuleRuntime[] = []
  private readonly collisionBoxes: CollisionBox[] = []
  private spawnPoints: WorldSpawnPoint[] = []
  private activeSpawnPoint: WorldSpawnPoint | null = null

  public build(scene: Scene): void {
    this.surfaces.length = 0
    this.moduleRuntime.length = 0
    this.collisionBoxes.length = 0
    this.spawnPoints = []
    this.activeSpawnPoint = null

    scene.background = new Color('#87CEEB')

    const hemi = new HemisphereLight('#87CEEB', '#C45C3E', 0.35)
    scene.add(hemi)

    const sun = new DirectionalLight('#F4C430', 1.1)
    sun.position.set(-60, 120, 40)
    scene.add(sun)

    const ground = new Mesh(
      new PlaneGeometry(WORLD.WIDTH, WORLD.DEPTH),
      this.getMaterial('streetStone'),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = WORLD.GROUND_Y
    scene.add(ground)

    this.surfaces.push({
      id: 'world-ground',
      label: 'Florence Ground',
      layer: 'ground',
      routeKind: 'ground',
      material: 'streetStone',
      tags: [],
      y: WORLD.GROUND_Y,
      bounds: {
        minX: -WORLD.WIDTH / 2,
        maxX: WORLD.WIDTH / 2,
        minZ: -WORLD.DEPTH / 2,
        maxZ: WORLD.DEPTH / 2,
      },
    })

    const district = createDistrictSlice()
    for (const module of district.modules) {
      this.buildModule(scene, module)
    }

    this.spawnPoints = district.spawnPoints.map((spawnPoint) => ({
      ...spawnPoint,
      position: { ...spawnPoint.position },
    }))

    const preferredSpawn =
      this.spawnPoints.find((spawnPoint) => spawnPoint.id === district.primarySpawnId) ?? this.spawnPoints[0] ?? null
    const randomSpawn = this.spawnPoints[Math.floor(Math.random() * Math.max(this.spawnPoints.length, 1))] ?? null
    this.activeSpawnPoint = randomSpawn ?? preferredSpawn
  }

  public getInitialSpawnPoint(): Vector3 {
    const spawnPoint = this.activeSpawnPoint ?? this.spawnPoints[0]
    if (!spawnPoint) {
      return new Vector3(0, WORLD.ROOFTOP_Y, 0)
    }
    return this.toVector3(spawnPoint.position)
  }

  public getRespawnPoint(position: Vector3): Vector3 {
    const nearestSpawn = this.getNearestSpawnPoint(position)
    this.activeSpawnPoint = nearestSpawn
    return this.toVector3(nearestSpawn.position)
  }

  /** Surfaces + module metadata for movement queries (vault, climb, wall-run, leap). */
  public getWorldTraversalData(): WorldTraversalData {
    return {
      surfaces: this.surfaces,
      modules: this.moduleRuntime,
    }
  }

  /**
   * Keeps the player capsule out of solid building/prop volumes (XZ separation).
   * Mutates position and velocity when a wall is hit.
   */
  public resolvePlayerCollision(position: Vector3, velocity: Vector3): void {
    const halfW = PLAYER.WIDTH / 2 + PLAYER.COLLISION_SKIN
    const halfD = PLAYER.DEPTH / 2 + PLAYER.COLLISION_SKIN
    const minY = position.y - PLAYER.HALF_HEIGHT
    const maxY = position.y + PLAYER.HALF_HEIGHT

    for (let i = 0; i < COLLISION_ITERATIONS; i += 1) {
      let corrected = false
      for (const box of this.collisionBoxes) {
        if (maxY <= box.minY || minY >= box.maxY) {
          continue
        }

        const pMinX = position.x - halfW
        const pMaxX = position.x + halfW
        const pMinZ = position.z - halfD
        const pMaxZ = position.z + halfD

        const overlapX = Math.min(pMaxX, box.maxX) - Math.max(pMinX, box.minX)
        const overlapZ = Math.min(pMaxZ, box.maxZ) - Math.max(pMinZ, box.minZ)
        if (overlapX <= 0 || overlapZ <= 0) {
          continue
        }

        corrected = true
        const midX = (box.minX + box.maxX) / 2
        const midZ = (box.minZ + box.maxZ) / 2

        if (overlapX < overlapZ) {
          if (position.x < midX) {
            position.x -= overlapX
            velocity.x = Math.min(velocity.x, 0)
          } else {
            position.x += overlapX
            velocity.x = Math.max(velocity.x, 0)
          }
        } else if (position.z < midZ) {
          position.z -= overlapZ
          velocity.z = Math.min(velocity.z, 0)
        } else {
          position.z += overlapZ
          velocity.z = Math.max(velocity.z, 0)
        }
      }
      if (!corrected) {
        break
      }
    }
  }

  public getSurfaceBelow(position: Vector3, footY: number, maxStepUp = 1.25): WorldSurface | null {
    let bestSurface: WorldSurface | null = null
    for (const surface of this.surfaces) {
      if (!this.boundsContain(surface.bounds, position.x, position.z)) {
        continue
      }
      if (surface.y > footY + maxStepUp) {
        continue
      }
      if (!bestSurface || surface.y > bestSurface.y) {
        bestSurface = surface
      }
    }
    return bestSurface
  }

  public getEnvironmentSnapshot(position: Vector3, footY: number): EnvironmentSnapshot {
    const surface = this.getSurfaceBelow(position, footY, 4)
    const interaction = this.getInteractionProfile(position)
    const nearbyTags = new Set<TraversalTag>(surface?.tags ?? [])
    for (const module of this.moduleRuntime) {
      if (this.distanceToBounds(position.x, position.z, module.bounds) > NEARBY_TAG_RADIUS) {
        continue
      }
      for (const tag of module.tags) {
        nearbyTags.add(tag)
      }
    }

    return {
      surfaceLabel: surface?.label ?? 'Florence Ground',
      layer: surface?.layer ?? 'ground',
      routeKind: surface?.routeKind ?? 'ground',
      surfaceMaterial: surface?.material ?? 'streetStone',
      nearestArchetype: interaction.archetype,
      interactionHint: interaction.hint,
      surfaceTags: surface?.tags ?? [],
      nearbyTags: [...nearbyTags].sort(),
      spawnLabel:
        this.activeSpawnPoint?.label ??
        this.getNearestSpawnPoint(position).label,
    }
  }

  private buildModule(scene: Scene, module: WorldModuleDefinition): void {
    if (module.kind === 'ground') {
      const mesh = new Mesh(
        new BoxGeometry(module.footprint.width, GROUND_OVERLAY_THICKNESS, module.footprint.depth),
        this.getMaterial(module.material),
      )
      mesh.position.set(
        module.position.x,
        module.position.y - GROUND_OVERLAY_THICKNESS / 2,
        module.position.z,
      )
      scene.add(mesh)

      const bounds = this.boundsFromRect(module.position.x, module.position.z, module.footprint.width, module.footprint.depth)
      this.surfaces.push({
        id: `${module.id}:surface`,
        label: module.label,
        layer: module.layer,
        routeKind: module.routeKind,
        material: module.material,
        tags: module.tags,
        y: module.position.y,
        bounds,
      })
      this.moduleRuntime.push({
        id: module.id,
        label: module.label,
        archetype: module.archetype,
        material: module.material,
        layer: module.layer,
        routeKind: module.routeKind,
        tags: module.tags,
        bounds,
      })
      return
    }

    if (module.kind === 'building') {
      this.buildBuilding(scene, module)
      return
    }

    this.buildProp(scene, module)
  }

  private getBuildingParts(module: BuildingModuleDefinition): BuildingPart[] {
    const { x, z } = module.position
    const parts: BuildingPart[] = [
      {
        cx: x,
        cz: z,
        width: module.footprint.width,
        depth: module.footprint.depth,
        index: 0,
      },
    ]
    for (const wing of module.wings ?? []) {
      parts.push({
        cx: x + wing.offsetX,
        cz: z + wing.offsetZ,
        width: wing.width,
        depth: wing.depth,
        index: parts.length,
      })
    }
    return parts
  }

  private unionBounds(a: WorldBounds, b: WorldBounds): WorldBounds {
    return {
      minX: Math.min(a.minX, b.minX),
      maxX: Math.max(a.maxX, b.maxX),
      minZ: Math.min(a.minZ, b.minZ),
      maxZ: Math.max(a.maxZ, b.maxZ),
    }
  }

  private buildBuilding(scene: Scene, module: BuildingModuleDefinition): void {
    const group = new Group()
    const parts = this.getBuildingParts(module)

    for (const part of parts) {
      this.buildBuildingPart(group, module, part)
    }

    if (module.hasDome) {
      const dome = new Mesh(
        new SphereGeometry(6, 24, 16),
        this.getMaterial('roofTile'),
      )
      dome.scale.set(1, 0.72, 1)
      dome.position.set(module.position.x - 2, module.height + 3.2, module.position.z)
      group.add(dome)

      const domeCx = module.position.x - 2
      const domeCy = module.height + 3.2
      const domeCz = module.position.z
      const domeR = 6
      this.collisionBoxes.push({
        id: `${module.id}:dome`,
        minX: domeCx - domeR,
        maxX: domeCx + domeR,
        minY: domeCy - domeR * 0.72,
        maxY: domeCy + domeR * 0.72,
        minZ: domeCz - domeR,
        maxZ: domeCz + domeR,
      })
    }

    if (module.hasTower) {
      const tower = new Mesh(
        new BoxGeometry(6, 12, 6),
        this.getMaterial('stone'),
      )
      const tcx = module.position.x + module.footprint.width / 2 - 4
      const tcy = module.height / 2 + 2
      const tcz = module.position.z - module.footprint.depth / 2 + 4
      tower.position.set(tcx, tcy, tcz)
      group.add(tower)

      this.collisionBoxes.push({
        id: `${module.id}:tower`,
        minX: tcx - 3,
        maxX: tcx + 3,
        minY: tcy - 6,
        maxY: tcy + 6,
        minZ: tcz - 3,
        maxZ: tcz + 3,
      })
    }

    scene.add(group)

    let union: WorldBounds | null = null
    for (const part of parts) {
      const partBounds = this.boundsFromRect(part.cx, part.cz, part.width, part.depth)
      union = union ? this.unionBounds(union, partBounds) : partBounds

      this.collisionBoxes.push({
        id: `${module.id}:volume${part.index}`,
        minX: partBounds.minX,
        maxX: partBounds.maxX,
        minY: 0,
        maxY: module.height - BUILDING_SOLID_TOP_EPS,
        minZ: partBounds.minZ,
        maxZ: partBounds.maxZ,
      })

      this.surfaces.push({
        id: `${module.id}:roof${part.index}`,
        label: module.label,
        layer: module.layer,
        routeKind: module.routeKind,
        material: module.roofMaterial,
        tags: module.roofTags,
        y: module.height,
        bounds: partBounds,
      })
    }

    this.moduleRuntime.push({
      id: module.id,
      label: module.label,
      archetype: module.archetype,
      material: module.wallMaterial,
      layer: module.layer,
      routeKind: module.routeKind,
      tags: [...new Set([...module.tags, ...module.wallTags, ...module.roofTags])],
      bounds: union ?? this.boundsFromRect(module.position.x, module.position.z, module.footprint.width, module.footprint.depth),
    })
  }

  private buildBuildingPart(group: Group, module: BuildingModuleDefinition, part: BuildingPart): void {
    const bodyTop = module.height - ROOF_THICKNESS
    const facadeStyle: FacadeStyle = module.facadeStyle ?? 'plain'
    const roofStyle: RoofStyle = module.roofStyle ?? 'flat'

    if (facadeStyle === 'rusticated' || facadeStyle === 'renaissance') {
      const upperH = bodyTop - PLINTH_HEIGHT
      const plinth = new Mesh(
        new BoxGeometry(part.width, PLINTH_HEIGHT, part.depth),
        this.getMaterial('stone'),
      )
      plinth.position.set(part.cx, PLINTH_HEIGHT / 2, part.cz)
      group.add(plinth)

      const upper = new Mesh(
        new BoxGeometry(part.width - 0.08, upperH, part.depth - 0.08),
        this.getMaterial(module.wallMaterial),
      )
      upper.position.set(part.cx, PLINTH_HEIGHT + upperH / 2, part.cz)
      group.add(upper)
    } else {
      const body = new Mesh(
        new BoxGeometry(part.width, bodyTop, part.depth),
        this.getMaterial(module.wallMaterial),
      )
      body.position.set(part.cx, bodyTop / 2, part.cz)
      group.add(body)
    }

    if (facadeStyle === 'renaissance') {
      this.addRenaissanceOrnament(group, module, part)
    }

    if (roofStyle === 'pitched') {
      this.addPitchedRoof(group, module, part)
    } else {
      const roof = new Mesh(
        new BoxGeometry(part.width, ROOF_THICKNESS, part.depth),
        this.getMaterial(module.roofMaterial),
      )
      roof.position.set(part.cx, module.height - ROOF_THICKNESS / 2, part.cz)
      group.add(roof)
    }

    this.addRoofLedgeForPart(group, module, part)
    if (part.index === 0) {
      this.addBuildingFeaturesForPart(group, module, part)
    }
  }

  /**
   * "Pitched" look without rotating the main volume: a single rotated slab's bottom face is not
   * horizontal, so it intersects vertical walls at a diagonal (looked broken in-game). Instead we
   * use the same horizontal deck as flat roofs plus a ridge cap — reads as tile + peak, stays flush.
   */
  private addPitchedRoof(group: Group, module: BuildingModuleDefinition, part: BuildingPart): void {
    const { width: w, depth: d, cx, cz } = part
    const mat = this.getMaterial(module.roofMaterial)

    const deck = new Mesh(new BoxGeometry(w + 0.28, ROOF_THICKNESS, d + 0.28), mat)
    deck.position.set(cx, module.height - ROOF_THICKNESS / 2, cz)
    group.add(deck)

    const ridge = new Mesh(new BoxGeometry(w + 0.36, PITCHED_RIDGE_HEIGHT, 0.42), mat)
    ridge.position.set(cx, module.height + PITCHED_RIDGE_HEIGHT / 2, cz)
    group.add(ridge)
  }

  private addRenaissanceOrnament(group: Group, module: BuildingModuleDefinition, part: BuildingPart): void {
    const { cx, cz, width: w, depth: d } = part
    const corniceY = module.height - ROOF_THICKNESS - 0.1
    const cornice = new Mesh(
      new BoxGeometry(w + 0.42, 0.16, d + 0.42),
      this.getMaterial('stone'),
    )
    cornice.position.set(cx, corniceY, cz)
    group.add(cornice)

    const pilasterW = 0.14
    const pilasterD = 0.12
    const pilasterH = module.height - ROOF_THICKNESS - 0.35
    const step = 3.4
    for (let px = cx - w / 2 + 1.8; px <= cx + w / 2 - 1.8; px += step) {
      const front = new Mesh(new BoxGeometry(pilasterW, pilasterH, pilasterD), this.getMaterial('stone'))
      front.position.set(px, pilasterH / 2 + 0.2, cz + d / 2 + pilasterD / 2 + 0.02)
      group.add(front)

      const back = new Mesh(new BoxGeometry(pilasterW, pilasterH, pilasterD), this.getMaterial('stone'))
      back.position.set(px, pilasterH / 2 + 0.2, cz - d / 2 - pilasterD / 2 - 0.02)
      group.add(back)
    }

    const archW = 1.15
    const archH = 0.55
    for (let ax = cx - w / 2 + 1.4; ax <= cx + w / 2 - 1.4; ax += 2.45) {
      const arch = new Mesh(new BoxGeometry(archW, archH, 0.14), this.getMaterial('stone'))
      arch.position.set(ax, 1.05, cz + d / 2 + 0.12)
      group.add(arch)
    }
  }

  private addRoofLedgeForPart(group: Group, module: BuildingModuleDefinition, part: BuildingPart): void {
    const ledgeMaterial = this.getMaterial(module.roofMaterial)
    const { cx, cz, width: w, depth: d } = part
    const horizontal = new BoxGeometry(w + 0.3, 0.2, 0.22)
    const vertical = new BoxGeometry(0.22, 0.2, d + 0.3)
    for (const z of [-d / 2, d / 2]) {
      const ledge = new Mesh(horizontal, ledgeMaterial)
      ledge.position.set(cx, module.height - 0.1, cz + z)
      group.add(ledge)
    }
    for (const x of [-w / 2, w / 2]) {
      const ledge = new Mesh(vertical, ledgeMaterial)
      ledge.position.set(cx + x, module.height - 0.1, cz)
      group.add(ledge)
    }
  }

  private addBuildingFeaturesForPart(group: Group, module: BuildingModuleDefinition, part: BuildingPart): void {
    if (!module.features?.length) {
      return
    }

    const { cx, cz, width: w, depth: d } = part

    for (const feature of module.features) {
      if (feature === 'windowSills') {
        const sillGeometry = new BoxGeometry(w * 0.22, 0.16, 0.35)
        for (const y of [2.2, 3.9]) {
          const frontSill = new Mesh(sillGeometry, this.getMaterial('stone'))
          frontSill.position.set(cx, y, cz + d / 2 + 0.1)
          group.add(frontSill)

          const backSill = new Mesh(sillGeometry, this.getMaterial('stone'))
          backSill.position.set(cx, y, cz - d / 2 - 0.1)
          group.add(backSill)
        }
      }

      if (feature === 'drainpipe') {
        const pipe = new Mesh(
          new BoxGeometry(0.18, module.height - 0.5, 0.18),
          this.getMaterial('stone'),
        )
        pipe.position.set(cx + w / 2 - 0.45, (module.height - 0.5) / 2, cz + d / 2 - 0.45)
        group.add(pipe)
      }

      if (feature === 'balcony') {
        const balcony = new Mesh(
          new BoxGeometry(w * 0.35, 0.2, 1.4),
          this.getMaterial('stone'),
        )
        balcony.position.set(cx, 3.6, cz + d / 2 + 0.55)
        group.add(balcony)
      }

      if (feature === 'awning') {
        const awning = new Mesh(
          new BoxGeometry(w * 0.48, 0.16, 1.6),
          this.getMaterial('cloth'),
        )
        awning.position.set(cx, 2.2, cz + d / 2 + 0.55)
        group.add(awning)
      }
    }
  }

  private buildProp(scene: Scene, module: PropModuleDefinition): void {
    const group = new Group()
    group.position.set(module.position.x, module.position.y, module.position.z)

    switch (module.archetype) {
      case 'marketStall': {
        const tabletop = new Mesh(
          new BoxGeometry(module.size.x, 0.24, module.size.z),
          this.getMaterial('wood'),
        )
        tabletop.position.y = -0.18
        group.add(tabletop)

        const canopy = new Mesh(
          new BoxGeometry(module.size.x + 0.35, 0.16, module.size.z + 0.2),
          this.getMaterial('cloth'),
        )
        canopy.position.y = module.size.y / 2 - 0.2
        group.add(canopy)

        const legGeometry = new BoxGeometry(0.16, module.size.y - 0.4, 0.16)
        for (const x of [-module.size.x / 2 + 0.2, module.size.x / 2 - 0.2]) {
          for (const z of [-module.size.z / 2 + 0.2, module.size.z / 2 - 0.2]) {
            const leg = new Mesh(legGeometry, this.getMaterial('wood'))
            leg.position.set(x, -0.4, z)
            group.add(leg)
          }
        }
        break
      }
      case 'crateCluster': {
        const crate = new Mesh(
          new BoxGeometry(module.size.x, module.size.y, module.size.z),
          this.getMaterial('wood'),
        )
        group.add(crate)

        const topper = new Mesh(
          new BoxGeometry(module.size.x * 0.52, module.size.y * 0.45, module.size.z * 0.52),
          this.getMaterial('wood'),
        )
        topper.position.set(module.size.x * 0.16, module.size.y * 0.72, module.size.z * 0.1)
        group.add(topper)
        break
      }
      case 'barrelStack': {
        const barrel = new Mesh(
          new BoxGeometry(module.size.x, module.size.y, module.size.z),
          this.getMaterial('wood'),
        )
        group.add(barrel)
        break
      }
      case 'archway': {
        const pillarGeometry = new BoxGeometry(0.55, module.size.y, 0.55)
        const leftPillar = new Mesh(pillarGeometry, this.getMaterial(module.material))
        leftPillar.position.set(-module.size.x / 2 + 0.3, 0, 0)
        group.add(leftPillar)

        const rightPillar = new Mesh(pillarGeometry, this.getMaterial(module.material))
        rightPillar.position.set(module.size.x / 2 - 0.3, 0, 0)
        group.add(rightPillar)

        const lintel = new Mesh(
          new BoxGeometry(module.size.x, 0.55, module.size.z),
          this.getMaterial(module.material),
        )
        lintel.position.y = module.size.y / 2 - 0.3
        group.add(lintel)
        break
      }
    }

    scene.add(group)

    const bounds = this.boundsFromRect(module.position.x, module.position.z, module.size.x, module.size.z)
    this.addPropCollision(module)

    this.moduleRuntime.push({
      id: module.id,
      label: module.label,
      archetype: module.archetype,
      material: module.material,
      layer: module.layer,
      routeKind: module.routeKind,
      tags: module.tags,
      bounds,
    })

    if (!module.walkableTop) {
      return
    }

    this.surfaces.push({
      id: `${module.id}:top`,
      label: module.label,
      layer: module.layer,
      routeKind: module.routeKind,
      material: module.material,
      tags: module.tags,
      y: module.position.y + module.size.y / 2,
      bounds,
    })
  }

  public getInteractionProfile(position: Vector3): WorldInteractionProfile {
    let nearest: WorldModuleRuntime | null = null
    let bestDistance = Number.POSITIVE_INFINITY
    for (const module of this.moduleRuntime) {
      const distance = this.distanceToBounds(position.x, position.z, module.bounds)
      if (distance > 5.5) {
        continue
      }
      if (distance >= bestDistance) {
        continue
      }
      nearest = module
      bestDistance = distance
    }

    if (!nearest) {
      return {
        moduleId: null,
        moduleLabel: 'Open route',
        archetype: 'none',
        material: 'streetStone',
        tags: [],
        hint: 'none',
      }
    }

    return {
      moduleId: nearest.id,
      moduleLabel: nearest.label,
      archetype: nearest.archetype,
      material: nearest.material,
      tags: nearest.tags,
      hint: this.pickInteractionHint(nearest),
    }
  }

  private pickInteractionHint(module: WorldModuleRuntime): InteractionHint {
    if (module.archetype === 'archway') {
      return 'slideArchway'
    }
    if (module.tags.includes('vaultable')) {
      if (module.archetype === 'marketStall' || module.archetype === 'crateCluster' || module.archetype === 'barrelStack') {
        return 'vaultableProp'
      }
      return 'ledgeRecovery'
    }
    if (module.tags.includes('wallRunnable')) {
      return 'wallRunWall'
    }
    if (module.tags.includes('climbable')) {
      return 'climbableWall'
    }
    if (module.tags.includes('ledge')) {
      return 'ledgeRecovery'
    }
    return 'none'
  }

  private addCollisionBox(box: CollisionBox): void {
    this.collisionBoxes.push(box)
  }

  private addPropCollision(module: PropModuleDefinition): void {
    const { x: px, y: py, z: pz } = module.position
    const { x: sx, y: sy, z: sz } = module.size

    switch (module.archetype) {
      case 'marketStall': {
        const legBottomY = py - 0.9
        const canopyTopY = py + sy / 2 + 0.05
        this.addCollisionBox({
          id: `${module.id}:stall`,
          minX: px - sx / 2,
          maxX: px + sx / 2,
          minY: legBottomY,
          maxY: canopyTopY,
          minZ: pz - sz / 2,
          maxZ: pz + sz / 2,
        })
        break
      }
      case 'crateCluster':
      case 'barrelStack': {
        this.addCollisionBox({
          id: `${module.id}:body`,
          minX: px - sx / 2,
          maxX: px + sx / 2,
          minY: py - sy / 2,
          maxY: py + sy / 2,
          minZ: pz - sz / 2,
          maxZ: pz + sz / 2,
        })
        break
      }
      case 'archway': {
        const pillarHalf = 0.55 / 2
        const pillarMinY = py - sy / 2
        const pillarMaxY = py + sy / 2
        const leftCx = px - sx / 2 + 0.3
        const rightCx = px + sx / 2 - 0.3
        this.addCollisionBox({
          id: `${module.id}:arch-pillar-left`,
          minX: leftCx - pillarHalf,
          maxX: leftCx + pillarHalf,
          minY: pillarMinY,
          maxY: pillarMaxY,
          minZ: pz - pillarHalf,
          maxZ: pz + pillarHalf,
        })
        this.addCollisionBox({
          id: `${module.id}:arch-pillar-right`,
          minX: rightCx - pillarHalf,
          maxX: rightCx + pillarHalf,
          minY: pillarMinY,
          maxY: pillarMaxY,
          minZ: pz - pillarHalf,
          maxZ: pz + pillarHalf,
        })
        const lintelCy = py + sy / 2 - 0.3
        const lintelHalfH = 0.55 / 2
        this.addCollisionBox({
          id: `${module.id}:arch-lintel`,
          minX: px - sx / 2,
          maxX: px + sx / 2,
          minY: lintelCy - lintelHalfH,
          maxY: lintelCy + lintelHalfH,
          minZ: pz - sz / 2,
          maxZ: pz + sz / 2,
        })
        break
      }
    }
  }

  private getNearestSpawnPoint(position: Vector3): WorldSpawnPoint {
    if (!this.spawnPoints.length) {
      return {
        id: 'fallback-spawn',
        label: 'Fallback Rooftop Spawn',
        position: { x: 0, y: WORLD.ROOFTOP_Y, z: 0 },
      }
    }

    let bestSpawn = this.spawnPoints[0]
    let bestDistance = Number.POSITIVE_INFINITY
    for (const spawnPoint of this.spawnPoints) {
      const dx = spawnPoint.position.x - position.x
      const dz = spawnPoint.position.z - position.z
      const distance = dx * dx + dz * dz
      if (distance < bestDistance) {
        bestDistance = distance
        bestSpawn = spawnPoint
      }
    }
    return bestSpawn
  }

  private getMaterial(kind: MaterialKind) {
    const cached = this.materialCache.get(kind)
    if (cached) {
      return cached
    }

    const material = createWorldMaterial(kind)
    this.materialCache.set(kind, material)
    return material
  }

  private boundsFromRect(x: number, z: number, width: number, depth: number): WorldBounds {
    return {
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2,
    }
  }

  private boundsContain(bounds: WorldBounds, x: number, z: number): boolean {
    return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ
  }

  private distanceToBounds(x: number, z: number, bounds: WorldBounds): number {
    const dx = x < bounds.minX ? bounds.minX - x : x > bounds.maxX ? x - bounds.maxX : 0
    const dz = z < bounds.minZ ? bounds.minZ - z : z > bounds.maxZ ? z - bounds.maxZ : 0
    return Math.hypot(dx, dz)
  }

  private toVector3(position: WorldSpawnPoint['position']): Vector3 {
    return new Vector3(position.x, position.y, position.z)
  }
}
