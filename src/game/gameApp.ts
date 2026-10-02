import { Scene, Vector3, WebGLRenderer } from 'three'
import { FollowCamera } from './camera/followCamera'
import { PHYSICS, PLAYER } from './constants'
import { DebugHud } from './debug/debugHud'
import { InputController } from './input/inputController'
import { FixedStepper } from './movement/fixedStepper'
import { PlayerController } from './player/playerController'
import type { GameSnapshot } from './types'
import { WorldBuilder } from './world/worldBuilder'

type GamePhase = 'intro' | 'playing'

export class GameApp {
  private readonly host: HTMLDivElement
  private readonly viewport: HTMLDivElement
  private readonly scene = new Scene()
  private readonly renderer = new WebGLRenderer({ antialias: true })
  private readonly stepper = new FixedStepper()
  private readonly worldBuilder = new WorldBuilder()
  private readonly input = new InputController(window)
  private readonly camera: FollowCamera
  private readonly player: PlayerController
  private readonly debugHud: DebugHud
  private readonly desiredMove = new Vector3()

  private framesInSecond = 0
  private fps = 0
  private fpsStartedAt = 0
  private lastFrameAt: number | null = null
  private phase: GamePhase = 'intro'

  constructor(host: HTMLDivElement) {
    this.host = host
    this.host.innerHTML = ''
    this.host.classList.add('game-root')

    this.viewport = document.createElement('div')
    this.viewport.className = 'game-viewport'
    this.host.appendChild(this.viewport)

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(this.viewport.clientWidth, this.viewport.clientHeight)
    this.renderer.domElement.className = 'game-canvas'
    this.viewport.appendChild(this.renderer.domElement)

    this.worldBuilder.build(this.scene)
    const initialSpawnPoint = this.worldBuilder.getInitialSpawnPoint()
    this.camera = new FollowCamera(this.viewport.clientWidth / this.viewport.clientHeight)
    this.player = new PlayerController(this.scene, initialSpawnPoint)
    this.debugHud = new DebugHud(this.host, {
      onToggle: (expanded) => {
        this.host.classList.toggle('hud-collapsed', !expanded)
        this.handleResize()
      },
    })
    this.input.setEnabled(false)
  }

  public start(): void {
    this.fpsStartedAt = performance.now()
    window.addEventListener('resize', this.handleResize)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    this.renderer.domElement.addEventListener('click', this.handleCanvasClick)
    window.addEventListener('mousemove', this.handleMouseMove)
    requestAnimationFrame(this.tick)
  }

  public async startPlaying(): Promise<void> {
    if (this.phase === 'playing') {
      return
    }
    this.phase = 'playing'
    this.input.setEnabled(true)
    await this.requestPointerLock()
  }

  private tick = (frameAt: number): void => {
    const elapsed = this.lastFrameAt === null ? 0 : Math.max(0, (frameAt - this.lastFrameAt) / 1000)
    this.lastFrameAt = frameAt
    const now = frameAt / 1000
    this.stepper.advance(elapsed, (deltaTime) => this.simulate(deltaTime, now))
    this.player.updateVisual(Math.min(elapsed, 1 / 30), now)
    this.camera.update(this.player.getSnapshot())

    this.renderer.render(this.scene, this.camera.camera)
    this.updateFps()
    this.debugHud.update(this.buildSnapshot())

    requestAnimationFrame(this.tick)
  }

  private simulate(deltaTime: number, now: number): void {
    const basis = this.camera.getPlanarBasis()

    this.desiredMove
      .set(0, 0, 0)
      .addScaledVector(basis.right, this.phase === 'playing' ? this.input.moveX : 0)
      .addScaledVector(basis.forward, this.phase === 'playing' ? this.input.moveZ : 0)

    if (this.desiredMove.lengthSq() > 1) {
      this.desiredMove.normalize()
    }

    const respawnTarget =
      this.phase === 'playing' && this.input.consumeRespawnRequest()
        ? this.worldBuilder.getRespawnPoint(this.player.getPosition())
        : null
    if (respawnTarget) {
      this.input.acknowledgeJumpRequest()
    }

    const jumpBufferAge =
      this.phase === 'playing' ? this.input.peekJumpBufferAge(now, PHYSICS.JUMP_BUFFER) : null

    this.player.update({
      deltaTime,
      now,
      moveX: this.desiredMove.x,
      moveZ: this.desiredMove.z,
      sprinting: this.phase === 'playing' ? this.input.sprinting : false,
      wantsJump: jumpBufferAge !== null,
      acceptJump: () => this.input.acknowledgeJumpRequest(),
      wantsDown: this.phase === 'playing' ? this.input.wantsDown : false,
      jumpBufferAge,
      respawnTarget,
      traversal: this.worldBuilder.getWorldTraversalData(),
      resolveSurface: (position, footY) => this.worldBuilder.getSurfaceBelow(position, footY),
      resolveCollision: (position, velocity) => this.worldBuilder.resolvePlayerCollision(position, velocity),
      resolveInteraction: (position) => this.worldBuilder.getInteractionProfile(position),
    })
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.stepper.reset()
      this.lastFrameAt = null
      this.input.clear()
    }
  }

  private updateFps(): void {
    this.framesInSecond += 1
    const now = performance.now()
    const elapsed = now - this.fpsStartedAt
    if (elapsed < 1000) {
      return
    }
    this.fps = (this.framesInSecond / elapsed) * 1000
    this.framesInSecond = 0
    this.fpsStartedAt = now
  }

  private buildSnapshot(): GameSnapshot {
    const player = this.player.getSnapshot()
    const environment = this.worldBuilder.getEnvironmentSnapshot(
      player.position,
      player.position.y - PLAYER.HALF_HEIGHT,
    )
    return {
      fps: this.fps,
      player,
      environment,
    }
  }

  private handleResize = (): void => {
    const width = this.viewport.clientWidth
    const height = this.viewport.clientHeight
    if (width <= 0 || height <= 0) {
      return
    }
    this.renderer.setSize(width, height)
    this.camera.resize(width / height)
  }

  private handleCanvasClick = async (): Promise<void> => {
    if (this.phase !== 'playing') {
      return
    }
    await this.requestPointerLock()
  }

  private requestPointerLock = async (): Promise<void> => {
    if (document.pointerLockElement === this.renderer.domElement) {
      return
    }
    try {
      await this.renderer.domElement.requestPointerLock()
    } catch {
      // Some browsers may reject on first attempt; canvas click remains a fallback.
    }
  }

  private handleMouseMove = (event: MouseEvent): void => {
    if (this.phase !== 'playing') {
      return
    }
    if (document.pointerLockElement !== this.renderer.domElement) {
      return
    }
    this.camera.rotateByMouse(event.movementX, event.movementY)
  }
}
