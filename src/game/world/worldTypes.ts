export type TraversalTag =
  | 'climbable'
  | 'vaultable'
  | 'wallRunnable'
  | 'ledge'
  | 'openPassage'
  | 'parkourStarter'
  | 'landmark'
  | 'spawn'

export type WorldLayer = 'ground' | 'rooftop' | 'transition'

export type WorldRouteKind = 'ground' | 'rooftop' | 'connector' | 'landmark'

export type MaterialKind =
  | 'streetStone'
  | 'plazaStone'
  | 'stucco'
  | 'brick'
  | 'stone'
  | 'roofTile'
  | 'wood'
  | 'cloth'
  | 'foliage'

export type ModuleArchetype =
  | 'street'
  | 'alley'
  | 'plaza'
  | 'residential'
  | 'commercial'
  | 'palazzo'
  | 'landmark'
  | 'marketStall'
  | 'crateCluster'
  | 'barrelStack'
  | 'archway'

export type Vec3 = {
  x: number
  y: number
  z: number
}

export type RectFootprint = {
  width: number
  depth: number
}

type BaseModuleDefinition = {
  id: string
  label: string
  archetype: ModuleArchetype
  position: Vec3
  footprint: RectFootprint
  tags: TraversalTag[]
  routeKind: WorldRouteKind
  layer: WorldLayer
}

export type GroundModuleDefinition = BaseModuleDefinition & {
  kind: 'ground'
  material: MaterialKind
}

export type BuildingFeature = 'balcony' | 'drainpipe' | 'windowSills' | 'awning'

/** Extra rectangular volumes (offsets from module anchor) for L- or U-shaped blocks. */
export type BuildingWing = {
  offsetX: number
  offsetZ: number
  width: number
  depth: number
}

export type RoofStyle = 'flat' | 'pitched'

/**
 * - plain: single box mass (legacy).
 * - rusticated: stone base course + upper plaster/brick.
 * - renaissance: cornice band, pilaster strips, arched ground-floor hints (15th-c. Florentine civic look).
 */
export type FacadeStyle = 'plain' | 'rusticated' | 'renaissance'

export type BuildingModuleDefinition = BaseModuleDefinition & {
  kind: 'building'
  height: number
  wallMaterial: MaterialKind
  roofMaterial: MaterialKind
  wallTags: TraversalTag[]
  roofTags: TraversalTag[]
  features?: BuildingFeature[]
  /** Additional masses for non-rectangular footprints (e.g. L-shaped palazzi). */
  wings?: BuildingWing[]
  roofStyle?: RoofStyle
  facadeStyle?: FacadeStyle
  hasDome?: boolean
  hasTower?: boolean
}

export type PropModuleDefinition = {
  kind: 'prop'
  id: string
  label: string
  archetype: 'marketStall' | 'crateCluster' | 'barrelStack' | 'archway'
  position: Vec3
  size: Vec3
  material: MaterialKind
  tags: TraversalTag[]
  routeKind: WorldRouteKind
  layer: WorldLayer
  walkableTop?: boolean
}

export type WorldModuleDefinition =
  | GroundModuleDefinition
  | BuildingModuleDefinition
  | PropModuleDefinition

export type SpawnPointDefinition = {
  id: string
  label: string
  position: Vec3
}

export type AuthoredWorldData = {
  modules: WorldModuleDefinition[]
  spawnPoints: SpawnPointDefinition[]
  primarySpawnId: string
}

export type WorldBounds = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

/** Axis-aligned volume for blocking horizontal movement (walls, solid props). */
export type CollisionBox = {
  id: string
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

export type WorldSurface = {
  id: string
  label: string
  layer: WorldLayer
  routeKind: WorldRouteKind
  material: MaterialKind
  tags: TraversalTag[]
  y: number
  bounds: WorldBounds
}

export type WorldModuleRuntime = {
  id: string
  label: string
  archetype: ModuleArchetype
  material: MaterialKind
  layer: WorldLayer
  routeKind: WorldRouteKind
  tags: TraversalTag[]
  bounds: WorldBounds
}

export type InteractionHint =
  | 'none'
  | 'vaultableProp'
  | 'wallRunWall'
  | 'climbableWall'
  | 'slideArchway'
  | 'ledgeRecovery'

export type WorldInteractionProfile = {
  moduleId: string | null
  moduleLabel: string
  archetype: ModuleArchetype | 'none'
  material: MaterialKind
  tags: TraversalTag[]
  hint: InteractionHint
}

export type WorldSpawnPoint = {
  id: string
  label: string
  position: Vec3
}
