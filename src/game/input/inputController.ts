export class InputController {
  private pressed = new Set<string>()
  private jumpRequestedAt = -1
  private enabled = true

  constructor(target: Window) {
    target.addEventListener('keydown', this.handleKeyDown)
    target.addEventListener('keyup', this.handleKeyUp)
    target.addEventListener('blur', this.handleBlur)
  }

  public get moveX(): number {
    const left = this.isDown('KeyA') || this.isDown('ArrowLeft')
    const right = this.isDown('KeyD') || this.isDown('ArrowRight')
    return Number(right) - Number(left)
  }

  public get moveZ(): number {
    const forward = this.isDown('KeyW') || this.isDown('ArrowUp')
    const backward = this.isDown('KeyS') || this.isDown('ArrowDown')
    return Number(forward) - Number(backward)
  }

  public get sprinting(): boolean {
    return this.isDown('ShiftLeft') || this.isDown('ShiftRight')
  }

  public consumeJumpRequest(now: number, jumpBuffer: number): boolean {
    if (!this.enabled) {
      return false
    }
    if (this.jumpRequestedAt < 0) {
      return false
    }
    const fresh = now - this.jumpRequestedAt <= jumpBuffer
    if (fresh) {
      this.jumpRequestedAt = -1
    }
    return fresh
  }

  private isDown(code: string): boolean {
    if (!this.enabled) {
      return false
    }
    return this.pressed.has(code)
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.pressed.clear()
    this.jumpRequestedAt = -1
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) {
      return
    }
    this.pressed.add(event.code)
    if (event.code === 'Space') {
      this.jumpRequestedAt = performance.now() / 1000
    }
  }

  private handleKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code)
  }

  private handleBlur = (): void => {
    this.pressed.clear()
  }
}
