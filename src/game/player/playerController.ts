import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Scene, Vector3 } from 'three'
import { PHYSICS, PLAYER } from '../constants'
import type { AnimationDebugSnapshot, MovementState, PlayerSnapshot } from '../types'
import type { WorldInteractionProfile, WorldSurface } from '../world/worldTypes'
import {
  probeClimbStart,
  probeRooftopLeap,
  probeVaultAhead,
  probeWallRun,
  type WorldTraversalData,
} from '../world/traversalQueries'
import { AnimationController } from './animationController'
import { MichaelRig } from './michaelRig'

type UpdateArgs = {
  deltaTime: number
  now: number
  moveX: number
  moveZ: number
  sprinting: boolean
  wantsJump: boolean
  wantsDown: boolean
  jumpBufferAge: number | null
  respawnTarget?: Vector3 | null
  traversal: WorldTraversalData
  resolveSurface: (position: Vector3, footY: number) => WorldSurface | null
  resolveCollision: (position: Vector3, velocity: Vector3) => void
  resolveInteraction: (position: Vector3) => WorldInteractionProfile
}

export class PlayerController {
  private readonly root = new Group()
  private readonly proxyRoot = new Group()
  private readonly velocity = new Vector3()
  private readonly prevVelocity = new Vector3()
  private readonly heading = new Vector3(0, 0, 1)
  private readonly animationController = new AnimationController()
  private readonly animationDebug: AnimationDebugSnapshot = {
    desiredClip: 'idle',
    activeClip: 'idle',
    usedFallback: false,
    fallbackReason: null,
    missingClipCount: 0,
  }

  private grounded = false
  private lastGroundedAt = -1
  private state: MovementState = 'fall'
  private landingTimer = 0
  private landingGraceTimer = 0
  private transitionNote = ''

  private vaultTimer = 0
  private climbRoofY = 0
  private climbSnapX = 0
  private climbSnapZ = 0

  private wallRunTimer = 0
  private wallRunTx = 0
  private wallRunTz = 0
  private wallRunNx = 0
  private wallRunNz = 0

  private slideTimer = 0
  private rollTimer = 0
  private pendingRoll = false
  private lastJumpBufferAge: number | null = null
  private lastLandingImpact = 0
  private interactionKind = 'none'
  private interactionProfile: WorldInteractionProfile = {
    moduleId: null,
    moduleLabel: 'Open route',
    archetype: 'none',
    material: 'streetStone',
    tags: [],
    hint: 'none',
  }
  private readonly michaelRig: MichaelRig

  constructor(scene: Scene, spawnPoint: Vector3) {
    const { tieNode, badgeNode, visualNodes } = this.createMichaelProxy()
    this.michaelRig = new MichaelRig(this.root, visualNodes, tieNode, badgeNode)
    this.root.position.copy(spawnPoint)
    scene.add(this.root)
  }

  public update(args: UpdateArgs): void {
    const {
      deltaTime,
      now,
      moveX,
      moveZ,
      sprinting,
      wantsJump,
      wantsDown,
      respawnTarget,
      traversal,
      resolveSurface,
      resolveCollision,
      resolveInteraction,
    } = args

    this.lastJumpBufferAge = args.jumpBufferAge
    this.interactionProfile = resolveInteraction(this.root.position)

    if (respawnTarget) {
      this.respawn(respawnTarget)
      this.lastGroundedAt = now
      this.transitionNote = 'respawn'
      this.interactionKind = 'respawn'
      this.updateVisualState(deltaTime)
      return
    }

    if (wantsDown && !this.grounded) {
      this.pendingRoll = true
    }

    const input = new Vector3(moveX, 0, moveZ)
    if (input.lengthSq() > 1) {
      input.normalize()
    }

    const footY = this.getFootY()
    const surfaceBelow = resolveSurface(this.root.position, footY)

    if (this.landingGraceTimer > 0) {
      this.landingGraceTimer = Math.max(0, this.landingGraceTimer - deltaTime)
    }

    // --- Kinematic / traversal states ---
    if (this.state === 'vault') {
      this.integrateVault(deltaTime, resolveCollision, resolveSurface, now)
      this.updateHeading()
      this.syncBaseStateFromFlags(sprinting, input, deltaTime)
      this.updateVisualState(deltaTime)
      return
    }
    if (this.state === 'climb') {
      this.integrateClimb(deltaTime, now)
      this.updateHeading()
      this.syncBaseStateFromFlags(sprinting, input, deltaTime)
      this.updateVisualState(deltaTime)
      return
    }
    if (this.state === 'wallRun') {
      this.integrateWallRun(deltaTime, resolveCollision, resolveSurface, now)
      this.updateHeading()
      this.syncBaseStateFromFlags(sprinting, input, deltaTime)
      this.updateVisualState(deltaTime)
      return
    }
    if (this.state === 'slide') {
      this.integrateSlide(deltaTime, input, resolveCollision, resolveSurface, now)
      this.updateHeading()
      this.syncBaseStateFromFlags(sprinting, input, deltaTime)
      this.updateVisualState(deltaTime)
      return
    }
    if (this.state === 'roll') {
      this.integrateRoll(deltaTime, resolveCollision, resolveSurface, now, input)
      this.updateHeading()
      this.syncBaseStateFromFlags(sprinting, input, deltaTime)
      this.updateVisualState(deltaTime)
      return
    }

    // --- Attempt traversal entry (grounded) ---
    if (this.grounded && wantsJump) {
      const fwd = this.getTraversalForwardXZ(input)
      const vault = probeVaultAhead(this.root.position, footY, fwd.x, fwd.z, traversal)
      const leapOk = probeRooftopLeap(this.root.position, footY, fwd.x, fwd.z, surfaceBelow)
      const climb = probeClimbStart(this.root.position, footY, fwd.x, fwd.z, traversal)

      if (vault) {
        this.beginVault(vault.exitForwardX, vault.exitForwardZ)
        this.transitionNote = `vault:${vault.moduleId}`
        this.interactionKind = `vault:${this.interactionProfile.archetype}`
        this.updateHeading()
        this.syncBaseStateFromFlags(sprinting, input, deltaTime)
        this.updateVisualState(deltaTime)
        return
      }
      if (leapOk && this.canJump(now)) {
        this.beginLeap(fwd.x, fwd.z)
        this.transitionNote = 'leap'
        this.interactionKind = 'leap:roof_gap'
      } else if (climb) {
        this.beginClimb(climb)
        this.transitionNote = `climb:${climb.moduleId}`
        this.interactionKind = `climb:${this.interactionProfile.archetype}`
        this.updateHeading()
        this.syncBaseStateFromFlags(sprinting, input, deltaTime)
        this.updateVisualState(deltaTime)
        return
      } else if (this.canJump(now)) {
        this.beginJump(now)
        this.transitionNote = 'jump'
        this.interactionKind = 'jump:takeoff'
      }
    }

    // --- Wall run entry (airborne) ---
    if (
      !this.grounded &&
      (this.state === 'jump' || this.state === 'fall' || this.state === 'leap') &&
      this.wallRunTimer <= 0
    ) {
      const wr = probeWallRun(
        this.root.position,
        footY,
        this.root.position.y + PLAYER.HALF_HEIGHT,
        this.velocity.x,
        this.velocity.z,
        traversal,
      )
      if (wr) {
        this.beginWallRun(wr.tangentX, wr.tangentZ, wr.wallNx, wr.wallNz)
        this.transitionNote = `wallRun:${wr.moduleId}`
        this.interactionKind = `wallRun:${this.interactionProfile.material}`
        this.integrateWallRun(deltaTime, resolveCollision, resolveSurface, now)
        this.updateHeading()
        this.syncBaseStateFromFlags(sprinting, input, deltaTime)
        this.updateVisualState(deltaTime)
        return
      }
    }

    // --- Slide entry ---
    if (this.grounded && wantsDown && input.lengthSq() > 0.15) {
      this.beginSlide(input.x, input.z)
      this.transitionNote = 'slide'
      this.interactionKind = `slide:${this.interactionProfile.hint}`
      this.integrateSlide(deltaTime, input, resolveCollision, resolveSurface, now)
      this.updateHeading()
      this.syncBaseStateFromFlags(sprinting, input, deltaTime)
      this.updateVisualState(deltaTime)
      return
    }

    // --- Standard motor ---
    const speed = sprinting ? PHYSICS.SPRINT_SPEED : PHYSICS.RUN_SPEED
    const currentMove = input.clone().multiplyScalar(speed)
    const control = this.grounded ? 1 : PHYSICS.AIR_CONTROL
    const accel = PHYSICS.GROUND_ACCEL

    this.velocity.x += (currentMove.x - this.velocity.x) * control * accel * deltaTime
    this.velocity.z += (currentMove.z - this.velocity.z) * control * accel * deltaTime

    this.velocity.y += PHYSICS.GRAVITY * deltaTime
    this.root.position.addScaledVector(this.velocity, deltaTime)
    resolveCollision(this.root.position, this.velocity)

    const wasGrounded = this.grounded
    this.resolveGroundContact(now, resolveSurface, surfaceBelow)

    if (!wasGrounded && this.grounded) {
      this.onLanded(now)
    }

    this.updateHeading()
    this.syncBaseStateFromFlags(sprinting, input, deltaTime)
    this.updateVisualState(deltaTime)
  }

  public getSnapshot(): PlayerSnapshot {
    const now = performance.now() / 1000
    const coyoteRemaining = this.grounded ? 0 : Math.max(0, PHYSICS.COYOTE_TIME - (now - this.lastGroundedAt))
    const planarSpeed = Math.hypot(this.velocity.x, this.velocity.z)
    return {
      position: this.root.position.clone(),
      velocity: this.velocity.clone(),
      state: this.state,
      grounded: this.grounded,
      planarSpeed,
      verticalSpeed: this.velocity.y,
      landingImpact: this.lastLandingImpact,
      interactionKind: this.interactionKind,
      surfaceMaterial: this.interactionProfile.material,
      nearbyArchetype: this.interactionProfile.archetype,
      animation: { ...this.animationDebug },
      coyoteRemaining,
      landingGraceRemaining: this.landingGraceTimer,
      jumpBufferAge: this.lastJumpBufferAge,
      transitionNote: this.transitionNote,
    }
  }

  public getPosition(): Vector3 {
    return this.root.position.clone()
  }

  private beginJump(now: number): void {
    if (!this.canJump(now)) {
      return
    }
    this.velocity.y = PHYSICS.JUMP_VELOCITY
    this.grounded = false
    this.state = 'jump'
  }

  private beginLeap(ix: number, iz: number): void {
    const len = Math.hypot(ix, iz) || 1
    const fx = ix / len
    const fz = iz / len
    this.velocity.y = PHYSICS.LEAP_VELOCITY
    this.velocity.x += fx * PHYSICS.LEAP_FORWARD_BOOST
    this.velocity.z += fz * PHYSICS.LEAP_FORWARD_BOOST
    this.grounded = false
    this.state = 'leap'
  }

  private beginVault(ex: number, ez: number): void {
    const len = Math.hypot(ex, ez) || 1
    this.velocity.x = (ex / len) * PHYSICS.VAULT_FORWARD_SPEED
    this.velocity.z = (ez / len) * PHYSICS.VAULT_FORWARD_SPEED
    this.velocity.y = PHYSICS.VAULT_UP_SPEED
    this.grounded = false
    this.state = 'vault'
    this.vaultTimer = PHYSICS.VAULT_DURATION
  }

  private beginClimb(climb: { roofY: number; snapX: number; snapZ: number }): void {
    this.climbRoofY = climb.roofY
    this.climbSnapX = climb.snapX
    this.climbSnapZ = climb.snapZ
    this.state = 'climb'
    this.velocity.set(0, PHYSICS.CLIMB_SPEED, 0)
  }

  private beginWallRun(tx: number, tz: number, nx: number, nz: number): void {
    const tLen = Math.hypot(tx, tz) || 1
    this.wallRunTx = tx / tLen
    this.wallRunTz = tz / tLen
    this.wallRunNx = nx
    this.wallRunNz = nz
    this.wallRunTimer = PHYSICS.WALL_RUN_DURATION
    this.state = 'wallRun'
    const dot = this.velocity.x * this.wallRunTx + this.velocity.z * this.wallRunTz
    const sign = dot >= 0 ? 1 : -1
    this.velocity.x = this.wallRunTx * PHYSICS.WALL_RUN_SPEED * sign
    this.velocity.z = this.wallRunTz * PHYSICS.WALL_RUN_SPEED * sign
    this.velocity.y = Math.min(this.velocity.y, 0.5)
  }

  private beginSlide(ix: number, iz: number): void {
    const len = Math.hypot(ix, iz) || 1
    this.velocity.x = (ix / len) * PHYSICS.SLIDE_SPEED
    this.velocity.z = (iz / len) * PHYSICS.SLIDE_SPEED
    this.velocity.y = 0
    this.slideTimer = PHYSICS.SLIDE_DURATION
    this.state = 'slide'
  }

  private beginRoll(): void {
    this.rollTimer = PHYSICS.ROLL_DURATION
    this.state = 'roll'
    this.pendingRoll = false
    this.velocity.x *= 0.85
    this.velocity.z *= 0.85
    this.velocity.y = 0
  }

  private integrateVault(
    deltaTime: number,
    resolveCollision: UpdateArgs['resolveCollision'],
    resolveSurface: UpdateArgs['resolveSurface'],
    now: number,
  ): void {
    this.vaultTimer -= deltaTime
    this.velocity.y += PHYSICS.GRAVITY * 0.65 * deltaTime
    this.root.position.addScaledVector(this.velocity, deltaTime)
    resolveCollision(this.root.position, this.velocity)
    this.resolveGroundContact(now, resolveSurface, resolveSurface(this.root.position, this.getFootY()))

    if (this.grounded) {
      this.state = 'run'
      this.vaultTimer = 0
      return
    }
    if (this.vaultTimer <= 0) {
      this.state = 'fall'
    }
  }

  private integrateClimb(deltaTime: number, now: number): void {
    const footY = this.getFootY()
    const targetFootY = this.climbRoofY - PLAYER.HALF_HEIGHT - 0.02
    if (footY >= targetFootY - 0.08) {
      this.root.position.y = this.climbRoofY + PLAYER.HALF_HEIGHT - 0.02
      this.velocity.set(0, 0, 0)
      this.grounded = true
      this.lastGroundedAt = now
      this.state = 'idle'
      this.transitionNote = 'climb_top'
      return
    }

    this.root.position.y += PHYSICS.CLIMB_SPEED * deltaTime
    this.root.position.x += (this.climbSnapX - this.root.position.x) * Math.min(1, 10 * deltaTime)
    this.root.position.z += (this.climbSnapZ - this.root.position.z) * Math.min(1, 10 * deltaTime)
    this.velocity.set(0, PHYSICS.CLIMB_SPEED, 0)
  }

  private integrateWallRun(
    deltaTime: number,
    resolveCollision: UpdateArgs['resolveCollision'],
    resolveSurface: UpdateArgs['resolveSurface'],
    now: number,
  ): void {
    this.wallRunTimer -= deltaTime
    this.velocity.x = this.wallRunTx * PHYSICS.WALL_RUN_SPEED
    this.velocity.z = this.wallRunTz * PHYSICS.WALL_RUN_SPEED
    this.velocity.y += PHYSICS.GRAVITY * 0.35 * deltaTime

    const stick = PHYSICS.WALL_RUN_STICK_DISTANCE
    this.root.position.x += this.wallRunNx * stick * 0.02 * deltaTime * 60
    this.root.position.z += this.wallRunNz * stick * 0.02 * deltaTime * 60

    this.root.position.addScaledVector(this.velocity, deltaTime)
    resolveCollision(this.root.position, this.velocity)
    this.resolveGroundContact(now, resolveSurface, resolveSurface(this.root.position, this.getFootY()))

    if (this.grounded) {
      this.state = 'run'
      this.wallRunTimer = 0
      return
    }
    if (this.wallRunTimer <= 0) {
      this.state = 'fall'
    }
  }

  private integrateSlide(
    deltaTime: number,
    input: Vector3,
    resolveCollision: UpdateArgs['resolveCollision'],
    resolveSurface: UpdateArgs['resolveSurface'],
    now: number,
  ): void {
    this.slideTimer -= deltaTime
    const speed = Math.hypot(this.velocity.x, this.velocity.z)
    if (input.lengthSq() > 0.05) {
      const len = Math.hypot(input.x, input.z)
      const fx = input.x / len
      const fz = input.z / len
      this.velocity.x = fx * PHYSICS.SLIDE_SPEED
      this.velocity.z = fz * PHYSICS.SLIDE_SPEED
    } else {
      this.velocity.x *= 0.92
      this.velocity.z *= 0.92
    }
    this.velocity.y += PHYSICS.GRAVITY * deltaTime
    this.root.position.addScaledVector(this.velocity, deltaTime)
    resolveCollision(this.root.position, this.velocity)
    this.resolveGroundContact(now, resolveSurface, resolveSurface(this.root.position, this.getFootY()))

    if (!this.grounded) {
      this.state = 'fall'
      this.slideTimer = 0
      return
    }
    if (this.slideTimer <= 0 || speed < 1.5) {
      this.state = 'run'
    }
  }

  private integrateRoll(
    deltaTime: number,
    resolveCollision: UpdateArgs['resolveCollision'],
    resolveSurface: UpdateArgs['resolveSurface'],
    now: number,
    input: Vector3,
  ): void {
    this.rollTimer -= deltaTime
    this.velocity.x *= 0.98
    this.velocity.z *= 0.98
    const nudge = PHYSICS.RUN_SPEED * 0.4
    if (input.lengthSq() > 0.05) {
      const len = Math.hypot(input.x, input.z)
      this.velocity.x += (input.x / len) * nudge * deltaTime * 3
      this.velocity.z += (input.z / len) * nudge * deltaTime * 3
    }
    this.velocity.y += PHYSICS.GRAVITY * deltaTime
    this.root.position.addScaledVector(this.velocity, deltaTime)
    resolveCollision(this.root.position, this.velocity)
    this.resolveGroundContact(now, resolveSurface, resolveSurface(this.root.position, this.getFootY()))

    if (this.rollTimer <= 0) {
      this.state = this.grounded ? this.pickGroundLocomotion(false, input) : 'fall'
    }
  }

  /**
   * Probes need a stable forward even if this frame has no WASD (Space-only jump).
   * Prefer current input, then horizontal velocity, then last heading from movement.
   */
  private getTraversalForwardXZ(input: Vector3): { x: number; z: number } {
    if (input.lengthSq() > 0.01) {
      const len = Math.hypot(input.x, input.z)
      return { x: input.x / len, z: input.z / len }
    }
    const vh = Math.hypot(this.velocity.x, this.velocity.z)
    if (vh > 0.18) {
      return { x: this.velocity.x / vh, z: this.velocity.z / vh }
    }
    const hh = Math.hypot(this.heading.x, this.heading.z)
    if (hh > 0.01) {
      return { x: this.heading.x / hh, z: this.heading.z / hh }
    }
    return { x: 0, z: 1 }
  }

  private pickGroundLocomotion(sprinting: boolean, input: Vector3): MovementState {
    if (input.lengthSq() < 0.01) {
      return 'idle'
    }
    return sprinting ? 'sprint' : 'run'
  }

  private onLanded(_now: number): void {
    this.landingGraceTimer = PHYSICS.LANDING_GRACE
    const impact = this.lastLandingImpact
    if (this.pendingRoll || impact > PHYSICS.HARD_LANDING_THRESHOLD) {
      this.beginRoll()
      this.transitionNote = this.pendingRoll ? 'roll_down' : 'roll_hard'
      this.interactionKind = this.pendingRoll ? 'roll:queued' : 'roll:hardLanding'
      return
    }
    if (impact > 4) {
      this.state = 'land'
      this.landingTimer = 0.12
      this.interactionKind = impact > 8 ? 'comedy_stumble:hard' : 'land:impact'
      return
    }
    this.interactionKind = 'land:soft'
  }

  private canJump(now: number): boolean {
    if (this.grounded) {
      return true
    }
    if (this.landingGraceTimer > 0) {
      return true
    }
    return now - this.lastGroundedAt <= PHYSICS.COYOTE_TIME
  }

  private resolveGroundContact(
    now: number,
    resolveSurface: (position: Vector3, footY: number) => WorldSurface | null,
    hintSurface: WorldSurface | null,
  ): void {
    const footY = this.getFootY()
    const surface = hintSurface ?? resolveSurface(this.root.position, footY)
    if (surface && footY <= surface.y && this.velocity.y <= 0) {
      if (!this.grounded) {
        this.lastLandingImpact = Math.max(0, -this.velocity.y)
      }
      if (!this.grounded && this.velocity.y < -4) {
        this.state = 'land'
        this.landingTimer = 0.12
      }
      this.root.position.y = surface.y + PLAYER.HALF_HEIGHT
      this.velocity.y = 0
      this.grounded = true
      this.lastGroundedAt = now
      return
    }

    if (this.grounded) {
      this.lastGroundedAt = now
    }
    this.grounded = false
  }

  private updateHeading(): void {
    const horizontalSpeedSq = this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z
    if (horizontalSpeedSq < 0.01) {
      return
    }

    this.heading.set(this.velocity.x, 0, this.velocity.z).normalize()
    this.root.lookAt(this.root.position.x + this.heading.x, this.root.position.y, this.root.position.z + this.heading.z)
  }

  private syncBaseStateFromFlags(sprinting: boolean, input: Vector3, deltaTime: number): void {
    if (this.state === 'land') {
      this.landingTimer -= deltaTime
      if (this.landingTimer > 0) {
        return
      }
    }

    if (
      this.state === 'vault' ||
      this.state === 'climb' ||
      this.state === 'wallRun' ||
      this.state === 'slide' ||
      this.state === 'roll'
    ) {
      return
    }

    if (!this.grounded) {
      if (this.state === 'leap') {
        return
      }
      this.state = this.velocity.y > 0 ? 'jump' : 'fall'
      this.interactionKind = this.state === 'jump' ? 'jump:airborne' : 'fall:airborne'
      return
    }

    if (!input.lengthSq()) {
      this.state = 'idle'
      this.interactionKind = `idle:${this.interactionProfile.hint}`
      return
    }

    this.state = sprinting ? 'sprint' : 'run'
    this.interactionKind = `${this.state}:${this.interactionProfile.hint}`
  }

  private updateVisualState(deltaTime: number): void {
    const acceleration = this.velocity.clone().sub(this.prevVelocity).multiplyScalar(1 / Math.max(deltaTime, 1 / 240))
    this.prevVelocity.copy(this.velocity)
    const planarSpeed = Math.hypot(this.velocity.x, this.velocity.z)
    const debug = this.animationController.update(
      {
        deltaTime,
        state: this.state,
        grounded: this.grounded,
        planarSpeed,
        verticalSpeed: this.velocity.y,
        interactionKind: this.interactionKind,
      },
      this.michaelRig,
    )
    this.animationDebug.desiredClip = debug.desiredClip
    this.animationDebug.activeClip = debug.activeClip ?? 'none'
    this.animationDebug.usedFallback = debug.usedFallback
    this.animationDebug.fallbackReason = debug.fallbackReason
    this.animationDebug.missingClipCount = this.michaelRig.getMissingClips().length

    this.michaelRig.update(deltaTime)
    this.michaelRig.updateSecondaryMotion({
      deltaTime,
      planarSpeed,
      verticalSpeed: this.velocity.y,
      acceleration,
    })
  }

  private respawn(position: Vector3): void {
    this.root.position.copy(position)
    this.velocity.set(0, 0, 0)
    this.prevVelocity.set(0, 0, 0)
    this.grounded = true
    this.state = 'idle'
    this.landingTimer = 0
    this.vaultTimer = 0
    this.wallRunTimer = 0
    this.slideTimer = 0
    this.rollTimer = 0
    this.pendingRoll = false
    this.interactionKind = 'respawn'
  }

  private getFootY(): number {
    return this.root.position.y - PLAYER.HALF_HEIGHT
  }

  private createMichaelProxy(): { tieNode: Mesh; badgeNode: Mesh; visualNodes: Group[] } {
    const shirt = new MeshStandardMaterial({ color: '#D4D0C8' })
    const pants = new MeshStandardMaterial({ color: '#3A3A3A' })
    const tie = new MeshStandardMaterial({ color: '#2B3A67' })
    const badge = new MeshStandardMaterial({ color: '#EDE6C9' })
    const skin = new MeshStandardMaterial({ color: '#D7AE8A' })

    const legs = new Mesh(new BoxGeometry(0.58, 0.9, 0.3), pants)
    legs.position.y = -0.45
    this.proxyRoot.add(legs)

    const torso = new Mesh(new BoxGeometry(0.82, 0.76, 0.4), shirt)
    torso.position.y = 0.08
    this.proxyRoot.add(torso)

    const shoulders = new Mesh(new BoxGeometry(0.92, 0.18, 0.34), shirt)
    shoulders.position.y = 0.36
    this.proxyRoot.add(shoulders)

    const head = new Mesh(new BoxGeometry(0.42, 0.42, 0.4), skin)
    head.position.y = 0.78
    this.proxyRoot.add(head)

    for (const side of [-1, 1]) {
      const arm = new Mesh(new BoxGeometry(0.18, 0.68, 0.18), shirt)
      arm.position.set(side * 0.4, -0.04, 0)
      this.proxyRoot.add(arm)
    }

    const tieMesh = new Mesh(new BoxGeometry(0.12, 0.5, 0.04), tie)
    tieMesh.position.set(0, 0.02, 0.22)
    this.proxyRoot.add(tieMesh)

    const badgeMesh = new Mesh(new BoxGeometry(0.16, 0.22, 0.03), badge)
    badgeMesh.position.set(0.18, -0.02, 0.23)
    this.proxyRoot.add(badgeMesh)

    this.root.add(this.proxyRoot)
    return {
      tieNode: tieMesh,
      badgeNode: badgeMesh,
      visualNodes: [this.proxyRoot],
    }
  }
}
