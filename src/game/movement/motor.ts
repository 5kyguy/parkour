export type Vec3 = { x: number; y: number; z: number }
export type Solid = { id: string; min: Vec3; max: Vec3; traversal?: 'vault' | 'mantle' }
export type Intent = { x: number; z: number; sprint?: boolean }
export type Traversal = { kind: 'vault' | 'mantle'; start: Vec3; end: Vec3; contact: Vec3; peak: number; progress: number; duration: number; direction: { x: number; z: number }; speed: number }

const smooth = (t: number): number => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t) }
export function traversalPosition(action: Traversal, progress: number): Vec3 {
  const across = smooth((progress - 0.3) / 0.5)
  const y = progress < 0.3
    ? action.start.y + (action.peak - action.start.y) * smooth(progress / 0.3)
    : action.peak + (action.end.y - action.peak) * smooth((progress - 0.8) / 0.2)
  return { x: action.start.x + (action.end.x - action.start.x) * across, y, z: action.start.z + (action.end.z - action.start.z) * across }
}

/** x/z are centers; y is the bottom. Render geometry shares these bounds. */
export function solid(id: string, x: number, y: number, z: number, width: number, height: number, depth: number, traversal?: Solid['traversal']): Solid {
  return { id, min: { x: x - width / 2, y, z: z - depth / 2 }, max: { x: x + width / 2, y: y + height, z: z + depth / 2 }, traversal }
}

export class Motor {
  readonly radius = 0.32
  readonly height = 1.72
  readonly solids: readonly Solid[]
  readonly position: Vec3
  readonly velocity: Vec3 = { x: 0, y: 0, z: 0 }
  grounded = false
  time = 0
  private jumpUntil = -Infinity
  private supportedAt = -Infinity
  readonly spawn: Vec3
  action: Traversal | null = null
  distance = 0
  landing = 0
  heading = { x: 0, z: -1 }

  get state(): string {
    return this.action?.kind ?? (!this.grounded ? (this.velocity.y > 0 ? 'jump' : 'fall') : this.landing > 0 ? 'land' : Math.hypot(this.velocity.x, this.velocity.z) > 0.2 ? 'run' : 'idle')
  }

  constructor(solids: readonly Solid[], spawn: Vec3) {
    this.solids = solids
    this.position = { ...spawn }
    this.spawn = { ...spawn }
  }

  reset(): void {
    Object.assign(this.position, this.spawn)
    Object.assign(this.velocity, { x: 0, y: 0, z: 0 })
    this.clearInput()
    this.supportedAt = -Infinity
    this.action = null
    this.landing = 0
    this.distance = 0
    this.grounded = false
    this.heading = { x: 0, z: -1 }
  }

  clearInput(): void { this.jumpUntil = -Infinity }

  private freeAt(p: Vec3): boolean {
    return !this.solids.some(box => p.y < box.max.y - 0.002 && p.y + this.height > box.min.y + 0.002 && this.overlapsXZ(box, p.x, p.z))
  }

  probe(direction: { x: number; z: number }): Traversal | null {
    const length = Math.hypot(direction.x, direction.z)
    if (length < 0.1 || this.action) return null
    const axis = Math.abs(direction.x) > Math.abs(direction.z) ? 'x' : 'z'
    const other = axis === 'x' ? 'z' : 'x'
    const sign = Math.sign(direction[axis])
    if (Math.abs(direction[axis]) / length < 0.8) return null
    const p = this.position
    let best: Traversal | null = null
    let nearest = Infinity
    for (const box of this.solids) {
      if (!box.traversal) continue
      const near = sign > 0 ? box.min[axis] : box.max[axis]
      const distance = (near - p[axis]) * sign
      const rise = box.max.y - p.y
      if (distance < this.radius - 0.04 || distance > 1.15 || distance >= nearest || rise < 0.25 || rise > 1.65) continue
      if (p[other] < box.min[other] + this.radius || p[other] > box.max[other] - this.radius) continue
      const kind = box.traversal === 'vault' && rise <= 1.05 && this.grounded ? 'vault' : 'mantle'
      const end = { ...p }
      end[axis] = kind === 'vault' ? (sign > 0 ? box.max[axis] : box.min[axis]) + sign * (this.radius + 0.18) : near + sign * (this.radius + 0.25)
      end.y = box.max.y
      if (kind === 'vault') {
        const support = this.solids.filter(s => s.max.y <= p.y + 0.3 && s.max.y >= p.y - 0.4 && end.x > s.min.x + this.radius && end.x < s.max.x - this.radius && end.z > s.min.z + this.radius && end.z < s.max.z - this.radius).sort((a, b) => b.max.y - a.max.y)[0]
        if (!support) continue
        end.y = support.max.y
      }
      const contact = { ...p, y: box.max.y }
      contact[axis] = near + sign * 0.08
      const candidate: Traversal = { kind, start: { ...p }, end, contact, peak: box.max.y + 0.06, progress: 0, duration: kind === 'vault' ? 0.54 : 0.64, direction: { x: axis === 'x' ? sign : 0, z: axis === 'z' ? sign : 0 }, speed: Math.max(3.2, Math.hypot(this.velocity.x, this.velocity.z)) }
      let clear = true
      for (let i = 0; i <= 40; i++) {
        if (!this.freeAt(traversalPosition(candidate, i / 40))) { clear = false; break }
      }
      if (clear) { best = candidate; nearest = distance }
    }
    return best
  }

  queueJump(): void {
    this.jumpUntil = this.time + 0.14
  }

  step(dt: number, intent: Intent): void {
    this.time += dt
    this.landing = Math.max(0, this.landing - dt)
    const inputLength = Math.hypot(intent.x, intent.z)
    if (inputLength > 0.1) this.heading = { x: intent.x / inputLength, z: intent.z / inputLength }
    if (this.jumpUntil >= this.time && !this.action) {
      const candidate = this.probe(inputLength > 0.1 ? intent : this.heading)
      if (candidate) {
        this.action = candidate
        this.jumpUntil = -Infinity
        this.supportedAt = -Infinity
        this.grounded = false
      }
    }
    if (this.action) {
      const a = this.action
      a.progress = Math.min(1, a.progress + dt / a.duration)
      const next = traversalPosition(a, a.progress)
      if (!this.freeAt(next)) { this.action = null; this.velocity.y = 0; return }
      Object.assign(this.velocity, { x: (next.x - this.position.x) / dt, y: (next.y - this.position.y) / dt, z: (next.z - this.position.z) / dt })
      Object.assign(this.position, next)
      if (a.progress >= 1) {
        this.action = null
        this.grounded = true
        this.velocity.x = a.direction.x * a.speed
        this.velocity.z = a.direction.z * a.speed
        this.velocity.y = 0
      }
      return
    }
    if (this.grounded) this.supportedAt = this.time
    if (this.jumpUntil >= this.time && (this.grounded || this.time - this.supportedAt <= 0.12)) {
      this.velocity.y = 8
      this.grounded = false
      this.supportedAt = -Infinity
      this.jumpUntil = -Infinity
    }
    const magnitude = Math.max(1, Math.hypot(intent.x, intent.z))
    const speed = intent.sprint ? 8.5 : 5.2
    const blend = 1 - Math.exp(-(this.grounded ? 16 : 4) * dt)
    this.velocity.x += (intent.x / magnitude * speed - this.velocity.x) * blend
    this.velocity.z += (intent.z / magnitude * speed - this.velocity.z) * blend
    this.velocity.y -= 22 * dt
    const oldYSpeed = this.velocity.y
    const wasGrounded = this.grounded
    const oldX = this.position.x
    const oldZ = this.position.z
    const substeps = Math.max(1, Math.ceil(Math.hypot(this.velocity.x, this.velocity.y, this.velocity.z) * dt / 0.12))
    this.grounded = false
    for (let i = 0; i < substeps; i++) this.move(dt / substeps)
    this.distance += Math.hypot(this.position.x - oldX, this.position.z - oldZ)
    if (!wasGrounded && this.grounded && oldYSpeed < -3) this.landing = 0.18
    if (this.position.y < -12) this.reset()
  }

  private overlapsXZ(box: Solid, x = this.position.x, z = this.position.z, radius = this.radius): boolean {
    const dx = x - Math.max(box.min.x, Math.min(box.max.x, x))
    const dz = z - Math.max(box.min.z, Math.min(box.max.z, z))
    return dx * dx + dz * dz < radius * radius
  }

  private move(dt: number): void {
    const p = this.position
    const v = this.velocity
    const previousY = p.y
    p.y += v.y * dt
    for (const box of this.solids) {
      if (!this.overlapsXZ(box)) continue
      if (v.y <= 0 && previousY >= box.max.y - 0.001 && p.y <= box.max.y) {
        p.y = box.max.y
        v.y = 0
        this.grounded = true
      } else if (v.y > 0 && previousY + this.height <= box.min.y + 0.001 && p.y + this.height >= box.min.y) {
        p.y = box.min.y - this.height
        v.y = 0
      }
    }
    for (const axis of ['x', 'z'] as const) {
      const before = p[axis]
      p[axis] += v[axis] * dt
      for (const box of this.solids) {
        if (p.y >= box.max.y - 0.001 || p.y + this.height <= box.min.y + 0.001 || !this.overlapsXZ(box)) continue
        const other = axis === 'x' ? 'z' : 'x'
        const otherDistance = p[other] - Math.max(box.min[other], Math.min(box.max[other], p[other]))
        const extent = Math.sqrt(Math.max(0, this.radius * this.radius - otherDistance * otherDistance))
        if (before <= box.min[axis]) p[axis] = box.min[axis] - extent
        else if (before >= box.max[axis]) p[axis] = box.max[axis] + extent
        else p[axis] = before < (box.min[axis] + box.max[axis]) / 2 ? box.min[axis] - extent : box.max[axis] + extent
        v[axis] = 0
      }
    }
    // Walking beyond support must leave the grounded state in this same step.
    this.grounded = this.grounded && this.solids.some(box => Math.abs(p.y - box.max.y) < 0.002 && this.overlapsXZ(box))
  }
}
