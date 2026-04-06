import { Mesh, BoxGeometry, MeshStandardMaterial, Scene, Vector3 } from 'three'
import { PHYSICS, WORLD } from '../constants'
import type { MovementState, PlayerSnapshot } from '../types'

type UpdateArgs = {
  deltaTime: number
  now: number
  moveX: number
  moveZ: number
  sprinting: boolean
  wantsJump: boolean
}

export class PlayerController {
  private readonly body: Mesh
  private readonly velocity = new Vector3()
  private readonly heading = new Vector3(0, 0, 1)

  private grounded = false
  private lastGroundedAt = -1
  private state: MovementState = 'fall'
  private landingTimer = 0

  constructor(scene: Scene, spawnPoint: Vector3) {
    this.body = new Mesh(
      new BoxGeometry(0.55, 1.8, 0.35),
      new MeshStandardMaterial({ color: '#D4D0C8' }),
    )
    this.body.position.copy(spawnPoint)
    scene.add(this.body)
  }

  public update(args: UpdateArgs): void {
    const { deltaTime, now, moveX, moveZ, sprinting, wantsJump } = args

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
    this.body.position.addScaledVector(this.velocity, deltaTime)

    this.resolveGroundContact(now)
    this.updateHeading()
    this.updateState(sprinting, input.lengthSq() > 0, deltaTime)
  }

  public getSnapshot(): PlayerSnapshot {
    return {
      position: this.body.position.clone(),
      velocity: this.velocity.clone(),
      state: this.state,
      grounded: this.grounded,
    }
  }

  private canJump(now: number): boolean {
    if (this.grounded) {
      return true
    }
    return now - this.lastGroundedAt <= PHYSICS.COYOTE_TIME
  }

  private resolveGroundContact(now: number): void {
    const groundTop = WORLD.GROUND_Y + 0.9
    const rooftopTop = WORLD.ROOFTOP_Y + 0.5
    const onRooftop =
      Math.abs(this.body.position.x) <= 14 &&
      Math.abs(this.body.position.z) <= 14 &&
      this.body.position.y <= rooftopTop

    const contactY = onRooftop ? rooftopTop : groundTop
    if (this.body.position.y <= contactY) {
      if (!this.grounded && this.velocity.y < -4) {
        this.state = 'land'
        this.landingTimer = 0.12
      }
      this.body.position.y = contactY
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
    this.body.lookAt(this.body.position.x + this.heading.x, this.body.position.y, this.body.position.z + this.heading.z)
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
}
