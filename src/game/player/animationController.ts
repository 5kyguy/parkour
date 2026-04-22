import type { MovementState } from '../types'

export type AnimationClipId =
  | 'idle'
  | 'run'
  | 'sprint'
  | 'jumpTakeoff'
  | 'airborne'
  | 'land'
  | 'vault'
  | 'climb'
  | 'wallRun'
  | 'roll'
  | 'slide'
  | 'leap'
  | 'stumble'

export type AnimationRuntime = {
  playClip: (clipId: AnimationClipId, fadeSeconds: number, oneShot?: boolean) => void
  getActiveClipId: () => AnimationClipId | null
  hasClip: (clipId: AnimationClipId) => boolean
}

export type AnimationControllerInput = {
  deltaTime: number
  state: MovementState
  grounded: boolean
  planarSpeed: number
  verticalSpeed: number
  interactionKind: string
}

export type AnimationControllerDebug = {
  desiredClip: AnimationClipId
  activeClip: AnimationClipId | null
  usedFallback: boolean
  fallbackReason: string | null
}

const LOCOMOTION_THRESHOLD = 0.7

const CLIP_FALLBACKS: Record<AnimationClipId, AnimationClipId[]> = {
  idle: [],
  run: ['idle'],
  sprint: ['run', 'idle'],
  jumpTakeoff: ['leap', 'airborne'],
  airborne: ['jumpTakeoff', 'fall', 'idle'].filter((clip): clip is AnimationClipId => clip !== 'fall'),
  land: ['roll', 'idle'],
  vault: ['run', 'jumpTakeoff'],
  climb: ['run', 'idle'],
  wallRun: ['airborne', 'run'],
  roll: ['land', 'idle'],
  slide: ['roll', 'run'],
  leap: ['jumpTakeoff', 'airborne'],
  stumble: ['roll', 'land', 'idle'],
}

export class AnimationController {
  private eventLockRemaining = 0
  private desiredClip: AnimationClipId = 'idle'
  private previousGrounded = false
  private debugFallbackReason: string | null = null
  private debugUsedFallback = false

  public update(input: AnimationControllerInput, runtime: AnimationRuntime): AnimationControllerDebug {
    if (this.eventLockRemaining > 0) {
      this.eventLockRemaining = Math.max(0, this.eventLockRemaining - input.deltaTime)
    }

    const eventClip = this.pickEventClip(input)
    if (eventClip && this.eventLockRemaining <= 0) {
      this.playWithFallback(eventClip, runtime, 0.08, true)
      this.eventLockRemaining = this.getEventDuration(eventClip)
      this.desiredClip = eventClip
    } else if (this.eventLockRemaining <= 0) {
      const locomotionClip = this.pickLocomotionClip(input)
      this.playWithFallback(locomotionClip, runtime, 0.12, false)
      this.desiredClip = locomotionClip
    }

    this.previousGrounded = input.grounded
    return {
      desiredClip: this.desiredClip,
      activeClip: runtime.getActiveClipId(),
      usedFallback: this.debugUsedFallback,
      fallbackReason: this.debugFallbackReason,
    }
  }

  private pickEventClip(input: AnimationControllerInput): AnimationClipId | null {
    if (input.interactionKind.startsWith('comedy_stumble')) {
      return 'stumble'
    }
    if (input.state === 'vault') {
      return 'vault'
    }
    if (input.state === 'climb') {
      return 'climb'
    }
    if (input.state === 'wallRun') {
      return 'wallRun'
    }
    if (input.state === 'roll') {
      return 'roll'
    }
    if (input.state === 'slide') {
      return 'slide'
    }
    if (input.state === 'leap') {
      return 'leap'
    }
    if (
      !this.previousGrounded &&
      input.grounded &&
      (input.state === 'land' || Math.abs(input.verticalSpeed) < 0.05)
    ) {
      return 'land'
    }
    if (this.previousGrounded && !input.grounded) {
      return 'jumpTakeoff'
    }
    return null
  }

  private pickLocomotionClip(input: AnimationControllerInput): AnimationClipId {
    if (!input.grounded || input.state === 'jump' || input.state === 'fall') {
      return 'airborne'
    }
    if (input.state === 'sprint') {
      return 'sprint'
    }
    if (input.state === 'run' || input.planarSpeed > LOCOMOTION_THRESHOLD) {
      return 'run'
    }
    return 'idle'
  }

  private playWithFallback(
    desiredClip: AnimationClipId,
    runtime: AnimationRuntime,
    fadeSeconds: number,
    oneShot: boolean,
  ): void {
    this.debugUsedFallback = false
    this.debugFallbackReason = null
    if (runtime.hasClip(desiredClip)) {
      runtime.playClip(desiredClip, fadeSeconds, oneShot)
      return
    }

    for (const fallback of CLIP_FALLBACKS[desiredClip]) {
      if (!runtime.hasClip(fallback)) {
        continue
      }
      this.debugUsedFallback = true
      this.debugFallbackReason = `${desiredClip}->${fallback}`
      runtime.playClip(fallback, fadeSeconds, oneShot)
      return
    }

    this.debugUsedFallback = true
    this.debugFallbackReason = `${desiredClip}->none`
  }

  private getEventDuration(clipId: AnimationClipId): number {
    switch (clipId) {
      case 'jumpTakeoff':
      case 'leap':
        return 0.16
      case 'land':
      case 'vault':
      case 'wallRun':
      case 'roll':
      case 'slide':
      case 'stumble':
        return 0.22
      case 'climb':
        return 0.3
      default:
        return 0
    }
  }
}
