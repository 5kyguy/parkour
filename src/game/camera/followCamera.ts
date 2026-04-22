import { PerspectiveCamera, Vector3 } from 'three'
import { CAMERA } from '../constants'
import type { PlayerSnapshot } from '../types'

export class FollowCamera {
  public readonly camera: PerspectiveCamera
  private readonly target = new Vector3()
  private readonly desired = new Vector3()
  private readonly lookAhead = new Vector3()
  private readonly upTiltOffset = new Vector3()
  private readonly forward = new Vector3(0, 0, 1)
  private readonly right = new Vector3(1, 0, 0)
  private yaw = Math.PI
  private pitch = 0.28
  private shakeRemaining = 0
  private shakeAmount = 0

  constructor(aspect: number) {
    this.camera = new PerspectiveCamera(CAMERA.FOV, aspect, 0.1, 1000)
    this.camera.position.set(0, 10, -14)
  }

  public rotateByMouse(deltaX: number, deltaY: number): void {
    this.yaw -= deltaX * CAMERA.MOUSE_SENSITIVITY
    this.pitch -= deltaY * CAMERA.MOUSE_SENSITIVITY
    this.pitch = Math.min(CAMERA.MAX_PITCH, Math.max(CAMERA.MIN_PITCH, this.pitch))
  }

  public getPlanarBasis(): { forward: Vector3; right: Vector3 } {
    const cosYaw = Math.cos(this.yaw)
    const sinYaw = Math.sin(this.yaw)

    this.forward.set(-sinYaw, 0, -cosYaw).normalize()
    this.right.set(cosYaw, 0, -sinYaw).normalize()

    return {
      forward: this.forward,
      right: this.right,
    }
  }

  public update(player: PlayerSnapshot): void {
    this.target.copy(player.position)
    this.target.y += 1.5
    const basis = this.getPlanarBasis()
    const radius = CAMERA.DISTANCE
    const horizontalRadius = Math.cos(this.pitch) * radius

    this.lookAhead
      .copy(player.velocity)
      .setY(0)
      .multiplyScalar(CAMERA.LOOK_AHEAD / Math.max(1, player.planarSpeed))
    this.target.add(this.lookAhead)

    const airborneTilt = !player.grounded
      ? Math.max(-0.18, Math.min(0.18, player.verticalSpeed * 0.01))
      : 0
    this.upTiltOffset.set(0, airborneTilt, 0)
    this.target.add(this.upTiltOffset)

    if (player.state === 'land' && player.landingImpact > 6 && this.shakeRemaining <= 0) {
      this.shakeRemaining = 0.15
      this.shakeAmount = Math.min(0.28, player.landingImpact * 0.02)
    }

    this.desired.copy(this.target)
    this.desired.x -= basis.forward.x * horizontalRadius
    this.desired.z -= basis.forward.z * horizontalRadius
    this.desired.y += CAMERA.HEIGHT + Math.sin(this.pitch) * radius

    if (this.shakeRemaining > 0) {
      const strength = this.shakeAmount * (this.shakeRemaining / 0.15)
      this.desired.y += (Math.random() - 0.5) * strength
      this.shakeRemaining = Math.max(0, this.shakeRemaining - 1 / 60)
    }

    this.camera.position.lerp(this.desired, CAMERA.FOLLOW_LERP)
    this.camera.lookAt(this.target)
  }

  public resize(aspect: number): void {
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
  }
}
