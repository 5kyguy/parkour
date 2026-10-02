const STEP_SECONDS = 1 / 60
const MAX_STEPS_PER_RENDER = 6

/** Advances gameplay at a bounded fixed timestep regardless of render cadence. */
export class FixedStepper {
  private accumulator = 0

  advance(elapsedSeconds: number, simulate: (deltaTime: number) => void): void {
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return
    this.accumulator += Math.min(elapsedSeconds, STEP_SECONDS * MAX_STEPS_PER_RENDER)
    let steps = 0
    while (this.accumulator + 1e-9 >= STEP_SECONDS && steps < MAX_STEPS_PER_RENDER) {
      this.accumulator -= STEP_SECONDS
      simulate(STEP_SECONDS)
      steps++
    }
    // Drop excess catch-up time after a long frame rather than accumulating latency.
    this.accumulator = Math.max(0, Math.min(this.accumulator, STEP_SECONDS))
  }

  reset(): void {
    this.accumulator = 0
  }
}
