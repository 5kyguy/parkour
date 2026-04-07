import type { GameSnapshot } from '../types'

export class DebugHud {
  private readonly root: HTMLDivElement

  constructor(container: HTMLElement) {
    this.root = document.createElement('div')
    this.root.className = 'debug-hud'
    container.appendChild(this.root)
  }

  public update(snapshot: GameSnapshot): void {
    const { environment, fps, player } = snapshot

    this.root.innerHTML = [
      '<h2>Phase 1 Debug</h2>',
      `<div><span>FPS</span><strong>${fps.toFixed(1)}</strong></div>`,
      `<div><span>Move</span><strong>${player.state}</strong></div>`,
      `<div><span>Grounded</span><strong>${String(player.grounded)}</strong></div>`,
      `<div><span>Surface</span><strong>${environment.surfaceLabel}</strong></div>`,
      `<div><span>Layer</span><strong>${environment.layer}</strong></div>`,
      `<div><span>Route</span><strong>${environment.routeKind}</strong></div>`,
      `<div><span>Surface Tags</span><strong>${this.formatTags(environment.surfaceTags)}</strong></div>`,
      `<div><span>Nearby Tags</span><strong>${this.formatTags(environment.nearbyTags)}</strong></div>`,
      `<div><span>Respawn</span><strong>${environment.spawnLabel}</strong></div>`,
      `<div><span>Pos</span><strong>x:${player.position.x.toFixed(1)} y:${player.position.y.toFixed(1)} z:${player.position.z.toFixed(1)}</strong></div>`,
      `<div><span>Vel</span><strong>x:${player.velocity.x.toFixed(1)} y:${player.velocity.y.toFixed(1)} z:${player.velocity.z.toFixed(1)}</strong></div>`,
      '<p>Click Play to begin. During gameplay: click game to lock mouse, move mouse to look, WASD/Arrows to move, Shift sprint, Space jump, R respawn.</p>',
    ].join('')
  }

  private formatTags(tags: string[]): string {
    return tags.length ? tags.join(', ') : 'none'
  }
}
