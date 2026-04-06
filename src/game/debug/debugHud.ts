import { WORLD } from '../constants'
import type { GameSnapshot } from '../types'

export class DebugHud {
  private readonly root: HTMLDivElement

  constructor(container: HTMLElement) {
    this.root = document.createElement('div')
    this.root.className = 'debug-hud'
    container.appendChild(this.root)
  }

  public update(snapshot: GameSnapshot): void {
    const { fps, player } = snapshot
    const altitude = player.position.y >= WORLD.ROOFTOP_Y - 0.5 ? 'ROOFTOP' : 'GROUND'

    this.root.innerHTML = [
      '<h2>Phase 0 Debug</h2>',
      `<div><span>FPS</span><strong>${fps.toFixed(1)}</strong></div>`,
      `<div><span>Move</span><strong>${player.state}</strong></div>`,
      `<div><span>Grounded</span><strong>${String(player.grounded)}</strong></div>`,
      `<div><span>Altitude</span><strong>${altitude}</strong></div>`,
      `<div><span>Pos</span><strong>x:${player.position.x.toFixed(1)} y:${player.position.y.toFixed(1)} z:${player.position.z.toFixed(1)}</strong></div>`,
      `<div><span>Vel</span><strong>x:${player.velocity.x.toFixed(1)} y:${player.velocity.y.toFixed(1)} z:${player.velocity.z.toFixed(1)}</strong></div>`,
      '<p>Click game to lock mouse. Move mouse to look, WASD/Arrows to move, Shift sprint, Space jump.</p>',
    ].join('')
  }
}
