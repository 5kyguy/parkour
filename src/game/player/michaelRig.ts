import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  Box3,
  Group,
  LoopOnce,
  LoopRepeat,
  MathUtils,
  Object3D,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { PLAYER } from '../constants'
import type { AnimationClipId, AnimationRuntime } from './animationController'

type SecondaryMotionInput = {
  deltaTime: number
  planarSpeed: number
  verticalSpeed: number
  acceleration: Vector3
}

const MODEL_PATH = '/assets/michael_v0.glb'

const CLIP_PATHS: Record<AnimationClipId, string> = {
  idle: '/assets/movements/idle_1.glb',
  run: '/assets/movements/running.glb',
  sprint: '/assets/movements/sprinting.glb',
  jumpTakeoff: '/assets/movements/jump_takeoff.glb',
  airborne: '/assets/movements/jumping_down.glb',
  land: '/assets/movements/landing_hard.glb',
  vault: '/assets/movements/jumping_over_obstacle_with_two_hand_planted.glb',
  climb: '/assets/movements/climbing_up_wall.glb',
  wallRun: '/assets/movements/wall_run.glb',
  roll: '/assets/movements/falling_to_roll_land.glb',
  slide: '/assets/movements/slide.glb',
  leap: '/assets/movements/leap.glb',
  stumble: '/assets/movements/run_to_trip.glb',
}

export class MichaelRig implements AnimationRuntime {
  private readonly loader = new GLTFLoader()
  private readonly visualRoot = new Group()
  private readonly actions = new Map<AnimationClipId, AnimationAction>()
  private readonly missingClips = new Set<AnimationClipId>()
  private readonly loadedClips = new Set<AnimationClipId>()
  private readonly tieVelocity = new Vector3()
  private readonly badgeVelocity = new Vector3()
  private readonly tieOffset = new Vector3()
  private readonly badgeOffset = new Vector3()
  private readonly fallbackVisuals: Object3D[]

  private mixer: AnimationMixer | null = null
  private currentAction: AnimationAction | null = null
  private activeClipId: AnimationClipId | null = null
  private tieNode: Object3D | null
  private badgeNode: Object3D | null
  private baseTiePos = new Vector3()
  private baseBadgePos = new Vector3()
  private readonly root: Group

  constructor(root: Group, fallbackVisuals: Object3D[], tieNode: Object3D | null, badgeNode: Object3D | null) {
    this.root = root
    this.fallbackVisuals = fallbackVisuals
    this.tieNode = tieNode
    this.badgeNode = badgeNode
    this.root.add(this.visualRoot)
    this.visualRoot.visible = false
    void this.loadAssets()
  }

  public update(deltaTime: number): void {
    this.mixer?.update(deltaTime)
  }

  public updateSecondaryMotion(input: SecondaryMotionInput): void {
    const tie = this.tieNode
    const badge = this.badgeNode
    if (!tie || !badge) {
      return
    }

    const speedInfluence = Math.min(1, input.planarSpeed / 10)
    const accelStrength = Math.min(1, input.acceleration.length() / 15)
    const dt = Math.max(1 / 240, input.deltaTime)
    const tieTarget = new Vector3(
      -input.acceleration.x * 0.01,
      -Math.abs(input.verticalSpeed) * 0.002 - speedInfluence * 0.05,
      -speedInfluence * 0.18 - accelStrength * 0.1,
    )
    const badgeTarget = new Vector3(
      -input.acceleration.x * 0.006,
      -Math.abs(input.verticalSpeed) * 0.0015 - speedInfluence * 0.02,
      -speedInfluence * 0.08,
    )

    this.springVec(this.tieOffset, this.tieVelocity, tieTarget, dt, 22, 0.76)
    this.springVec(this.badgeOffset, this.badgeVelocity, badgeTarget, dt, 18, 0.7)

    tie.position.copy(this.baseTiePos).add(this.tieOffset)
    tie.rotation.x = MathUtils.lerp(tie.rotation.x, 0.25 + speedInfluence * 0.35, 0.2)
    tie.rotation.z = MathUtils.lerp(tie.rotation.z, this.tieOffset.x * 1.8, 0.2)

    badge.position.copy(this.baseBadgePos).add(this.badgeOffset)
    badge.rotation.z = MathUtils.lerp(badge.rotation.z, this.badgeOffset.x * 2.2, 0.2)
  }

  public playClip(clipId: AnimationClipId, fadeSeconds: number, oneShot = false): void {
    const action = this.actions.get(clipId)
    if (!action) {
      return
    }

    if (this.currentAction === action) {
      return
    }

    action.reset()
    action.setLoop(oneShot ? LoopOnce : LoopRepeat, oneShot ? 1 : Infinity)
    action.clampWhenFinished = oneShot
    action.enabled = true
    action.fadeIn(fadeSeconds)
    action.play()

    if (this.currentAction) {
      this.currentAction.fadeOut(fadeSeconds)
    }

    this.currentAction = action
    this.activeClipId = clipId
  }

  public hasClip(clipId: AnimationClipId): boolean {
    return this.loadedClips.has(clipId)
  }

  public getActiveClipId(): AnimationClipId | null {
    return this.activeClipId
  }

  public getMissingClips(): AnimationClipId[] {
    return [...this.missingClips.values()].sort()
  }

  public getLoadedClips(): AnimationClipId[] {
    return [...this.loadedClips.values()].sort()
  }

  private async loadAssets(): Promise<void> {
    try {
      const modelGltf = await this.loader.loadAsync(MODEL_PATH)
      this.visualRoot.add(modelGltf.scene)
      this.alignModelToCapsule(modelGltf.scene)
      this.mixer = new AnimationMixer(modelGltf.scene)
      this.visualRoot.visible = true
      for (const node of this.fallbackVisuals) {
        node.visible = false
      }
      this.remapAccessoryNodes(modelGltf.scene)
      await Promise.all(
        (Object.keys(CLIP_PATHS) as AnimationClipId[]).map(async (clipId) => {
          await this.loadClip(clipId)
        }),
      )
    } catch {
      this.visualRoot.visible = false
      for (const node of this.fallbackVisuals) {
        node.visible = true
      }
    }
  }

  private async loadClip(clipId: AnimationClipId): Promise<void> {
    if (!this.mixer) {
      this.missingClips.add(clipId)
      return
    }
    const path = CLIP_PATHS[clipId]
    try {
      const clipGltf = await this.loader.loadAsync(path)
      const clip = clipGltf.animations[0]
      if (!clip) {
        this.missingClips.add(clipId)
        return
      }
      this.registerClip(clipId, clip)
    } catch {
      this.missingClips.add(clipId)
    }
  }

  /**
   * Align the imported mesh so its feet match the controller's foot level.
   * This prevents visual floating when source assets have different pivots.
   */
  private alignModelToCapsule(modelRoot: Object3D): void {
    const bounds = new Box3().setFromObject(modelRoot)
    if (!Number.isFinite(bounds.min.y)) {
      return
    }
    const desiredFootY = -PLAYER.HALF_HEIGHT
    this.visualRoot.position.y = desiredFootY - bounds.min.y
  }

  private registerClip(clipId: AnimationClipId, clip: AnimationClip): void {
    if (!this.mixer) {
      return
    }
    const action = this.mixer.clipAction(clip, this.visualRoot)
    action.enabled = true
    this.actions.set(clipId, action)
    this.loadedClips.add(clipId)
    if (clipId === 'idle' && !this.currentAction) {
      this.playClip('idle', 0.05)
    }
  }

  private remapAccessoryNodes(modelRoot: Object3D): void {
    const tieCandidate = this.findNodeByName(modelRoot, ['tie'])
    const badgeCandidate = this.findNodeByName(modelRoot, ['badge', 'id', 'lanyard'])
    if (tieCandidate) {
      this.tieNode = tieCandidate
      this.baseTiePos.copy(this.tieNode.position)
    } else if (this.tieNode) {
      this.baseTiePos.copy(this.tieNode.position)
    }
    if (badgeCandidate) {
      this.badgeNode = badgeCandidate
      this.baseBadgePos.copy(this.badgeNode.position)
    } else if (this.badgeNode) {
      this.baseBadgePos.copy(this.badgeNode.position)
    }
  }

  private findNodeByName(root: Object3D, fragments: string[]): Object3D | null {
    let found: Object3D | null = null
    root.traverse((node) => {
      const lower = node.name.toLowerCase()
      if (found || !lower) {
        return
      }
      if (fragments.some((fragment) => lower.includes(fragment))) {
        found = node
      }
    })
    return found
  }

  private springVec(
    value: Vector3,
    velocity: Vector3,
    target: Vector3,
    deltaTime: number,
    stiffness: number,
    damping: number,
  ): void {
    const forceX = (target.x - value.x) * stiffness
    const forceY = (target.y - value.y) * stiffness
    const forceZ = (target.z - value.z) * stiffness
    velocity.x = (velocity.x + forceX * deltaTime) * damping
    velocity.y = (velocity.y + forceY * deltaTime) * damping
    velocity.z = (velocity.z + forceZ * deltaTime) * damping
    value.x += velocity.x * deltaTime
    value.y += velocity.y * deltaTime
    value.z += velocity.z * deltaTime
  }
}
