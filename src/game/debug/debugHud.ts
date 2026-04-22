import type { GameSnapshot } from '../types'

export class DebugHud {
  private readonly root: HTMLDivElement
  private readonly toggleButton: HTMLButtonElement
  private readonly content: HTMLDivElement
  private expanded = true
  private readonly onToggle?: (expanded: boolean) => void

  constructor(container: HTMLElement, options?: { onToggle?: (expanded: boolean) => void }) {
    this.onToggle = options?.onToggle
    this.root = document.createElement('div')
    this.root.className = 'debug-sidebar'

    this.toggleButton = document.createElement('button')
    this.toggleButton.className = 'debug-sidebar-toggle'
    this.toggleButton.type = 'button'
    this.toggleButton.addEventListener('click', () => {
      this.expanded = !this.expanded
      this.applyExpandedState()
      this.onToggle?.(this.expanded)
    })
    this.root.appendChild(this.toggleButton)

    this.content = document.createElement('div')
    this.content.className = 'debug-hud'
    this.root.appendChild(this.content)

    container.appendChild(this.root)
    this.applyExpandedState()
    this.onToggle?.(this.expanded)
  }

  public update(snapshot: GameSnapshot): void {
    const { environment, fps, player } = snapshot

    const jumpBuf =
      player.jumpBufferAge === null ? '—' : `${player.jumpBufferAge.toFixed(3)}s`

    this.content.innerHTML = [
      '<h2>Phase 3 Animation</h2>',
      `<div><span>FPS</span><strong>${fps.toFixed(1)}</strong></div>`,
      `<div><span>State</span><strong>${player.state}</strong></div>`,
      `<div><span>Note</span><strong>${player.transitionNote || '—'}</strong></div>`,
      `<div><span>Interaction</span><strong>${player.interactionKind}</strong></div>`,
      `<div><span>Surface Material</span><strong>${player.surfaceMaterial}</strong></div>`,
      `<div><span>Nearby Archetype</span><strong>${player.nearbyArchetype}</strong></div>`,
      `<div><span>Grounded</span><strong>${String(player.grounded)}</strong></div>`,
      `<div><span>Planar Speed</span><strong>${player.planarSpeed.toFixed(2)} m/s</strong></div>`,
      `<div><span>Vertical Speed</span><strong>${player.verticalSpeed.toFixed(2)} m/s</strong></div>`,
      `<div><span>Landing Impact</span><strong>${player.landingImpact.toFixed(2)}</strong></div>`,
      `<div><span>Coyote</span><strong>${player.coyoteRemaining.toFixed(3)}s</strong></div>`,
      `<div><span>Land grace</span><strong>${player.landingGraceRemaining.toFixed(3)}s</strong></div>`,
      `<div><span>Jump buffer</span><strong>${jumpBuf}</strong></div>`,
      `<div><span>Anim Desired</span><strong>${player.animation.desiredClip}</strong></div>`,
      `<div><span>Anim Active</span><strong>${player.animation.activeClip}</strong></div>`,
      `<div><span>Anim Fallback</span><strong>${player.animation.usedFallback ? player.animation.fallbackReason ?? 'yes' : 'none'}</strong></div>`,
      `<div><span>Missing Clips</span><strong>${player.animation.missingClipCount}</strong></div>`,
      `<div><span>Surface</span><strong>${environment.surfaceLabel}</strong></div>`,
      `<div><span>Layer</span><strong>${environment.layer}</strong></div>`,
      `<div><span>Route</span><strong>${environment.routeKind}</strong></div>`,
      `<div><span>Env Material</span><strong>${environment.surfaceMaterial}</strong></div>`,
      `<div><span>Env Archetype</span><strong>${environment.nearestArchetype}</strong></div>`,
      `<div><span>Env Hint</span><strong>${environment.interactionHint}</strong></div>`,
      `<div><span>Surface Tags</span><strong>${this.formatTags(environment.surfaceTags)}</strong></div>`,
      `<div><span>Nearby Tags</span><strong>${this.formatTags(environment.nearbyTags)}</strong></div>`,
      `<div><span>Respawn</span><strong>${environment.spawnLabel}</strong></div>`,
      `<div><span>Pos</span><strong>x:${player.position.x.toFixed(1)} y:${player.position.y.toFixed(1)} z:${player.position.z.toFixed(1)}</strong></div>`,
      `<div><span>Vel</span><strong>x:${player.velocity.x.toFixed(1)} y:${player.velocity.y.toFixed(1)} z:${player.velocity.z.toFixed(1)}</strong></div>`,
      '<p>Play: click to lock mouse. WASD, Shift sprint, Space (vault/climb use forward from keys, speed, or last direction), S/↓ slide or roll cue, R nearest respawn. Phase 3 checks: clip fallback behavior, interaction hints, and camera look-ahead/landing response in the gym at southwest ~x-118 z-118.</p>',
    ].join('')
  }

  private formatTags(tags: string[]): string {
    return tags.length ? tags.join(', ') : 'none'
  }

  private applyExpandedState(): void {
    this.root.classList.toggle('is-collapsed', !this.expanded)
    this.toggleButton.setAttribute('aria-expanded', String(this.expanded))
    this.toggleButton.textContent = this.expanded ? 'Hide Debug HUD' : 'Show Debug HUD'
  }
}
