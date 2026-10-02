import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import type { MovementState } from '../types'
import { characterPose } from './pose.ts'

const shirt = new MeshStandardMaterial({ color: '#d8cdb8', flatShading: true, roughness: 0.95 })
const collar = new MeshStandardMaterial({ color: '#eee3cf', flatShading: true })
const trousers = new MeshStandardMaterial({ color: '#343642', flatShading: true })
const shoes = new MeshStandardMaterial({ color: '#282229', flatShading: true })
const skin = new MeshStandardMaterial({ color: '#cf9a74', flatShading: true })
const hair = new MeshStandardMaterial({ color: '#45342c', flatShading: true })
const tieMaterial = new MeshStandardMaterial({ color: '#30496a', flatShading: true, side: DoubleSide })
const badgeMaterial = new MeshStandardMaterial({ color: '#efe3c8', flatShading: true })
const ink = new MeshStandardMaterial({ color: '#29232a', flatShading: true })

function box(parent: Group, name: string, material: MeshStandardMaterial, width: number, height: number, depth: number, x: number, y: number, z: number): Mesh {
  const mesh = new Mesh(new BoxGeometry(width, height, depth), material)
  mesh.name = name
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  parent.add(mesh)
  return mesh
}

function limb(parent: Group, name: string, material: MeshStandardMaterial, width: number, length: number, depth: number, x: number, y: number): Group {
  const joint = new Group()
  joint.name = name
  joint.position.set(x, y, 0)
  parent.add(joint)
  box(joint, `${name}-segment`, material, width, length, depth, 0, -length / 2, 0)
  return joint
}

/** Generated mesh and local-space posing; gameplay position remains owned by the motor. */
export class Character {
  readonly group = new Group()
  private readonly torso = new Group()
  private readonly head = new Group()
  private readonly leftArm: Group
  private readonly rightArm: Group
  private readonly leftElbow: Group
  private readonly rightElbow: Group
  private readonly leftLeg: Group
  private readonly rightLeg: Group
  private readonly leftKnee: Group
  private readonly rightKnee: Group
  private readonly tie = new Group()
  private readonly badge = new Group()
  private readonly lastPosition = new Vector3()
  private distance = 0
  private tieAngle = 0
  private tieVelocity = 0
  private badgeAngle = 0
  private badgeVelocity = 0

  constructor(root: Group) {
    this.group.name = 'parkour-character'
    root.add(this.group)
    this.lastPosition.copy(root.position)

    this.torso.name = 'torso-joint'
    this.torso.position.y = -0.07
    this.group.add(this.torso)
    box(this.torso, 'shirt', shirt, 0.66, 0.65, 0.36, 0, 0.28, 0)
    box(this.torso, 'collar', collar, 0.37, 0.09, 0.38, 0, 0.59, 0)
    box(this.group, 'belt', shoes, 0.53, 0.08, 0.31, 0, -0.16, 0)
    box(this.group, 'hips', trousers, 0.55, 0.22, 0.32, 0, -0.23, 0)

    this.head.name = 'head-joint'
    this.head.position.set(0, 0.69, 0)
    this.torso.add(this.head)
    const face = new Mesh(new SphereGeometry(0.22, 8, 6), skin)
    face.name = 'head'
    face.scale.set(0.94, 1.08, 0.9)
    face.castShadow = true
    face.position.y = 0.12
    this.head.add(face)
    const crown = new Mesh(new SphereGeometry(0.215, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.45), hair)
    crown.name = 'hair'
    crown.position.y = 0.15
    crown.castShadow = true
    this.head.add(crown)
    for (const side of [-1, 1]) {
      box(this.head, 'eye', ink, 0.025, 0.025, 0.025, side * 0.077, 0.135, 0.185)
      box(this.head, 'brow', hair, 0.085, 0.021, 0.03, side * 0.079, 0.19, 0.182)
    }
    box(this.head, 'nose', skin, 0.055, 0.07, 0.075, 0, 0.09, 0.214)

    this.leftArm = limb(this.torso, 'left-shoulder', shirt, 0.19, 0.28, 0.21, -0.43, 0.53)
    this.rightArm = limb(this.torso, 'right-shoulder', shirt, 0.19, 0.28, 0.21, 0.43, 0.53)
    this.leftElbow = limb(this.leftArm, 'left-elbow', skin, 0.13, 0.26, 0.15, 0, -0.28)
    this.rightElbow = limb(this.rightArm, 'right-elbow', skin, 0.13, 0.26, 0.15, 0, -0.28)
    box(this.leftElbow, 'left-hand', skin, 0.14, 0.1, 0.16, 0, -0.28, 0)
    box(this.rightElbow, 'right-hand', skin, 0.14, 0.1, 0.16, 0, -0.28, 0)

    this.leftLeg = limb(this.group, 'left-hip', trousers, 0.23, 0.31, 0.25, -0.17, -0.25)
    this.rightLeg = limb(this.group, 'right-hip', trousers, 0.23, 0.31, 0.25, 0.17, -0.25)
    this.leftKnee = limb(this.leftLeg, 'left-knee', trousers, 0.19, 0.27, 0.21, 0, -0.31)
    this.rightKnee = limb(this.rightLeg, 'right-knee', trousers, 0.19, 0.27, 0.21, 0, -0.31)
    box(this.leftKnee, 'left-shoe', shoes, 0.22, 0.12, 0.35, 0, -0.29, 0.075)
    box(this.rightKnee, 'right-shoe', shoes, 0.22, 0.12, 0.35, 0, -0.29, 0.075)

    this.tie.name = 'tie-joint'
    this.tie.position.set(0, 0.53, 0.208)
    this.torso.add(this.tie)
    box(this.tie, 'tie-knot', tieMaterial, 0.1, 0.09, 0.035, 0, -0.045, 0)
    const blade = new Mesh(new CylinderGeometry(0.035, 0.065, 0.4, 3), tieMaterial)
    blade.name = 'tie-blade'
    blade.position.y = -0.26
    blade.rotation.y = Math.PI / 2
    this.tie.add(blade)

    this.badge.name = 'badge-joint'
    this.badge.position.set(0.26, 0.32, 0.2)
    this.torso.add(this.badge)
    box(this.badge, 'lanyard', ink, 0.018, 0.21, 0.018, 0, -0.1, 0)
    box(this.badge, 'id-card', badgeMaterial, 0.13, 0.17, 0.025, 0, -0.24, 0)
    box(this.badge, 'id-line', tieMaterial, 0.09, 0.026, 0.003, 0, -0.22, 0.016)
  }

  reset(position: Vector3): void {
    this.lastPosition.copy(position)
    this.distance = 0
    this.group.position.y = 0
    for (const joint of [this.torso, this.head, this.leftArm, this.rightArm, this.leftElbow, this.rightElbow, this.leftLeg, this.rightLeg, this.leftKnee, this.rightKnee]) {
      joint.rotation.set(0, 0, 0)
    }
    this.tieAngle = this.tieVelocity = this.badgeAngle = this.badgeVelocity = 0
    this.tie.rotation.set(0, 0, 0)
    this.badge.rotation.set(0, 0, 0)
  }

  update(deltaTime: number, now: number, position: Vector3, state: MovementState, grounded: boolean, speed: number, verticalSpeed: number): void {
    if (grounded && (state === 'run' || state === 'sprint')) {
      this.distance += Math.hypot(position.x - this.lastPosition.x, position.z - this.lastPosition.z)
    }
    this.lastPosition.copy(position)
    const pose = characterPose({ state, grounded, speed, verticalSpeed, distance: this.distance, time: now })
    const blend = 1 - Math.exp(-Math.max(0, deltaTime) * 15)
    this.group.position.y = MathUtils.lerp(this.group.position.y, pose.hipY, blend)
    this.torso.rotation.x = MathUtils.lerp(this.torso.rotation.x, pose.torsoPitch, blend)
    this.torso.rotation.z = MathUtils.lerp(this.torso.rotation.z, pose.torsoRoll, blend)
    this.head.rotation.x = MathUtils.lerp(this.head.rotation.x, pose.headPitch - pose.torsoPitch * 0.35, blend)
    this.leftArm.rotation.x = MathUtils.lerp(this.leftArm.rotation.x, pose.leftArm, blend)
    this.rightArm.rotation.x = MathUtils.lerp(this.rightArm.rotation.x, pose.rightArm, blend)
    this.leftElbow.rotation.x = MathUtils.lerp(this.leftElbow.rotation.x, pose.leftElbow, blend)
    this.rightElbow.rotation.x = MathUtils.lerp(this.rightElbow.rotation.x, pose.rightElbow, blend)
    this.leftLeg.rotation.x = MathUtils.lerp(this.leftLeg.rotation.x, pose.leftLeg, blend)
    this.rightLeg.rotation.x = MathUtils.lerp(this.rightLeg.rotation.x, pose.rightLeg, blend)
    this.leftKnee.rotation.x = MathUtils.lerp(this.leftKnee.rotation.x, pose.leftKnee, blend)
    this.rightKnee.rotation.x = MathUtils.lerp(this.rightKnee.rotation.x, pose.rightKnee, blend)

    // Spring the accessories toward a trailing angle; cap dt when resuming a hidden tab.
    const dt = Math.min(1 / 30, Math.max(0, deltaTime))
    const trailing = MathUtils.clamp(speed / 12 + Math.max(0, -verticalSpeed) / 30, 0, 1)
    this.tieVelocity += (trailing * 0.9 - this.tieAngle) * 30 * dt
    this.tieVelocity *= Math.exp(-9 * dt)
    this.tieAngle += this.tieVelocity * dt
    this.tie.rotation.x = -this.tieAngle
    this.badgeVelocity += (trailing * 0.5 - this.badgeAngle) * 25 * dt
    this.badgeVelocity *= Math.exp(-10 * dt)
    this.badgeAngle += this.badgeVelocity * dt
    this.badge.rotation.x = -this.badgeAngle
  }
}
