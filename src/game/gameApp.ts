import { Clock, Scene, Vector3, WebGLRenderer } from 'three'
import { FollowCamera } from './camera/followCamera'
import { PHYSICS } from './constants'
import { DebugHud } from './debug/debugHud'
import { InputController } from './input/inputController'
import { PlayerController } from './player/playerController'
import type { GameSnapshot } from './types'
import { WorldBuilder } from './world/worldBuilder'

export class GameApp {
  private readonly host: HTMLDivElement
  private readonly scene = new Scene()
  private readonly renderer = new WebGLRenderer({ antialias: true })
  private readonly clock = new Clock()
  private readonly worldBuilder = new WorldBuilder()
  private readonly input = new InputController(window)
  private readonly camera: FollowCamera
  private readonly player: PlayerController
  private readonly debugHud: DebugHud
  private readonly desiredMove = new Vector3()

  private framesInSecond = 0
  private fps = 0
  private fpsStartedAt = 0

  constructor(host: HTMLDivElement) {
    this.host = host
    this.host.innerHTML = ''
    this.host.classList.add('game-root')

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(host.clientWidth, host.clientHeight)
    this.renderer.domElement.className = 'game-canvas'
    this.host.appendChild(this.renderer.domElement)

    this.worldBuilder.build(this.scene)
    this.camera = new FollowCamera(host.clientWidth / host.clientHeight)
    this.player = new PlayerController(this.scene, this.worldBuilder.spawnPoint)
    this.debugHud = new DebugHud(this.host)
  }

  public start(): void {
    this.fpsStartedAt = performance.now()
    this.clock.start()
    window.addEventListener('resize', this.handleResize)
    this.renderer.domElement.addEventListener('click', this.handleCanvasClick)
    window.addEventListener('mousemove', this.handleMouseMove)
    requestAnimationFrame(this.tick)
  }

  private tick = (): void => {
    const deltaTime = Math.min(this.clock.getDelta(), 1 / 30)
    const now = performance.now() / 1000
    const basis = this.camera.getPlanarBasis()

    this.desiredMove
      .set(0, 0, 0)
      .addScaledVector(basis.right, this.input.moveX)
      .addScaledVector(basis.forward, this.input.moveZ)

    if (this.desiredMove.lengthSq() > 1) {
      this.desiredMove.normalize()
    }

    this.player.update({
      deltaTime,
      now,
      moveX: this.desiredMove.x,
      moveZ: this.desiredMove.z,
      sprinting: this.input.sprinting,
      wantsJump: this.input.consumeJumpRequest(now, PHYSICS.JUMP_BUFFER),
    })

    const playerSnapshot = this.player.getSnapshot()
    this.camera.update(playerSnapshot)

    this.renderer.render(this.scene, this.camera.camera)
    this.updateFps()
    this.debugHud.update(this.buildSnapshot())

    requestAnimationFrame(this.tick)
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
    return {
      fps: this.fps,
      player: this.player.getSnapshot(),
    }
  }

  private handleResize = (): void => {
    const width = this.host.clientWidth
    const height = this.host.clientHeight
    this.renderer.setSize(width, height)
    this.camera.resize(width / height)
  }

  private handleCanvasClick = async (): Promise<void> => {
    if (document.pointerLockElement === this.renderer.domElement) {
      return
    }
    await this.renderer.domElement.requestPointerLock()
  }

  private handleMouseMove = (event: MouseEvent): void => {
    if (document.pointerLockElement !== this.renderer.domElement) {
      return
    }
    this.camera.rotateByMouse(event.movementX, event.movementY)
  }
}
