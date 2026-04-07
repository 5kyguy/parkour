import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Scene, Vector3 } from 'three'
import { PHYSICS, PLAYER } from '../constants'
import type { MovementState, PlayerSnapshot } from '../types'
import type { WorldSurface } from '../world/worldTypes'

type UpdateArgs = {
  deltaTime: number
  now: number
  moveX: number
  moveZ: number
  sprinting: boolean
  wantsJump: boolean
  respawnTarget?: Vector3 | null
  resolveSurface: (position: Vector3, footY: number) => WorldSurface | null
  resolveCollision: (position: Vector3, velocity: Vector3) => void
}

export class PlayerController {
  private readonly root = new Group()
  private readonly velocity = new Vector3()
  private readonly heading = new Vector3(0, 0, 1)

  private grounded = false
  private lastGroundedAt = -1
  private state: MovementState = 'fall'
  private landingTimer = 0

  constructor(scene: Scene, spawnPoint: Vector3) {
    this.createMichaelProxy()
    this.root.position.copy(spawnPoint)
    scene.add(this.root)
  }

  public update(args: UpdateArgs): void {
    const { deltaTime, now, moveX, moveZ, sprinting, wantsJump, respawnTarget, resolveSurface, resolveCollision } =
      args

    if (respawnTarget) {
      this.respawn(respawnTarget)
      this.lastGroundedAt = now
      return
    }

    const input = new Vector3(moveX, 0, moveZ)
    if (input.lengthSq() > 1) {
      input.normalize()
    }

    const speed = sprinting ? PHYSICS.SPRINT_SPEED : PHYSICS.RUN_SPEED
    const currentMove = input.multiplyScalar(speed)
    const control = this.grounded ? 1 : PHYSICS.AIR_CONTROL

    this.velocity.x += (currentMove.x - this.velocity.x) * control * 12 * deltaTime
    this.velocity.z += (currentMove.z - this.velocity.z) * control * 12 * deltaTime

    if (wantsJump && this.canJump(now)) {
      this.velocity.y = PHYSICS.JUMP_VELOCITY
      this.grounded = false
      this.state = 'jump'
    }

    this.velocity.y += PHYSICS.GRAVITY * deltaTime
    this.root.position.addScaledVector(this.velocity, deltaTime)
    resolveCollision(this.root.position, this.velocity)

    this.resolveGroundContact(now, resolveSurface)
    this.updateHeading()
    this.updateState(sprinting, input.lengthSq() > 0, deltaTime)
  }

  public getSnapshot(): PlayerSnapshot {
    return {
      position: this.root.position.clone(),
      velocity: this.velocity.clone(),
      state: this.state,
      grounded: this.grounded,
    }
  }

  public getPosition(): Vector3 {
    return this.root.position.clone()
  }

  private canJump(now: number): boolean {
    if (this.grounded) {
      return true
    }
    return now - this.lastGroundedAt <= PHYSICS.COYOTE_TIME
  }

  private resolveGroundContact(
    now: number,
    resolveSurface: (position: Vector3, footY: number) => WorldSurface | null,
  ): void {
    const footY = this.getFootY()
    const surface = resolveSurface(this.root.position, footY)
    if (surface && footY <= surface.y && this.velocity.y <= 0) {
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

  private updateState(sprinting: boolean, moving: boolean, deltaTime: number): void {
    if (this.state === 'land') {
      this.landingTimer -= deltaTime
      if (this.landingTimer > 0) {
        return
      }
    }

    if (!this.grounded) {
      this.state = this.velocity.y > 0 ? 'jump' : 'fall'
      return
    }

    if (!moving) {
      this.state = 'idle'
      return
    }

    this.state = sprinting ? 'sprint' : 'run'
  }

  private createMichaelProxy(): void {
    const shirt = new MeshStandardMaterial({ color: '#D4D0C8' })
    const pants = new MeshStandardMaterial({ color: '#3A3A3A' })
    const tie = new MeshStandardMaterial({ color: '#2B3A67' })
    const badge = new MeshStandardMaterial({ color: '#EDE6C9' })
    const skin = new MeshStandardMaterial({ color: '#D7AE8A' })

    const legs = new Mesh(new BoxGeometry(0.58, 0.9, 0.3), pants)
    legs.position.y = -0.45
    this.root.add(legs)

    const torso = new Mesh(new BoxGeometry(0.82, 0.76, 0.4), shirt)
    torso.position.y = 0.08
    this.root.add(torso)

    const shoulders = new Mesh(new BoxGeometry(0.92, 0.18, 0.34), shirt)
    shoulders.position.y = 0.36
    this.root.add(shoulders)

    const head = new Mesh(new BoxGeometry(0.42, 0.42, 0.4), skin)
    head.position.y = 0.78
    this.root.add(head)

    for (const side of [-1, 1]) {
      const arm = new Mesh(new BoxGeometry(0.18, 0.68, 0.18), shirt)
      arm.position.set(side * 0.4, -0.04, 0)
      this.root.add(arm)
    }

    const tieMesh = new Mesh(new BoxGeometry(0.12, 0.5, 0.04), tie)
    tieMesh.position.set(0, 0.02, 0.22)
    this.root.add(tieMesh)

    const badgeMesh = new Mesh(new BoxGeometry(0.16, 0.22, 0.03), badge)
    badgeMesh.position.set(0.18, -0.02, 0.23)
    this.root.add(badgeMesh)
  }

  private respawn(position: Vector3): void {
    this.root.position.copy(position)
    this.velocity.set(0, 0, 0)
    this.grounded = true
    this.state = 'idle'
    this.landingTimer = 0
  }

  private getFootY(): number {
    return this.root.position.y - PLAYER.HALF_HEIGHT
  }
}
