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

    const jumpBuf =
      player.jumpBufferAge === null ? '—' : `${player.jumpBufferAge.toFixed(3)}s`

    this.root.innerHTML = [
      '<h2>Phase 2 Movement</h2>',
      `<div><span>FPS</span><strong>${fps.toFixed(1)}</strong></div>`,
      `<div><span>State</span><strong>${player.state}</strong></div>`,
      `<div><span>Note</span><strong>${player.transitionNote || '—'}</strong></div>`,
      `<div><span>Grounded</span><strong>${String(player.grounded)}</strong></div>`,
      `<div><span>Coyote</span><strong>${player.coyoteRemaining.toFixed(3)}s</strong></div>`,
      `<div><span>Land grace</span><strong>${player.landingGraceRemaining.toFixed(3)}s</strong></div>`,
      `<div><span>Jump buffer</span><strong>${jumpBuf}</strong></div>`,
      `<div><span>Surface</span><strong>${environment.surfaceLabel}</strong></div>`,
      `<div><span>Layer</span><strong>${environment.layer}</strong></div>`,
      `<div><span>Route</span><strong>${environment.routeKind}</strong></div>`,
      `<div><span>Surface Tags</span><strong>${this.formatTags(environment.surfaceTags)}</strong></div>`,
      `<div><span>Nearby Tags</span><strong>${this.formatTags(environment.nearbyTags)}</strong></div>`,
      `<div><span>Respawn</span><strong>${environment.spawnLabel}</strong></div>`,
      `<div><span>Pos</span><strong>x:${player.position.x.toFixed(1)} y:${player.position.y.toFixed(1)} z:${player.position.z.toFixed(1)}</strong></div>`,
      `<div><span>Vel</span><strong>x:${player.velocity.x.toFixed(1)} y:${player.velocity.y.toFixed(1)} z:${player.velocity.z.toFixed(1)}</strong></div>`,
      '<p>Play: click to lock mouse. WASD, Shift sprint, Space (vault/climb use forward from keys, speed, or last direction), S/↓ slide or roll cue, R nearest respawn. Phase 2 gym: southwest ~x-118 z-118 (vault crates, climb wall, leap roofs).</p>',
    ].join('')
  }

  private formatTags(tags: string[]): string {
    return tags.length ? tags.join(', ') : 'none'
  }
}
