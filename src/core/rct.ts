// Reverse Cursed Technique trial, ported from menu/ReversalTrial.java.

export type TrialStage = "IDLE" | "READY" | "CHARGING" | "PASSED" | "FAILED" | "INTERRUPTED";

export const TRIAL = {
  meterTicks: 42,
  pulses: 3,
  required: 2,
  waitTicks: 600,
  maxHoldTicks: 50,
  windowStarts: [12, 22, 16] as const,
  windowWidths: [10, 9, 8] as const,
};

export const windowStart = (attempt: number): number => TRIAL.windowStarts[attempt] ?? 0;
export const windowEnd = (attempt: number): number => windowStart(attempt) + (TRIAL.windowWidths[attempt] ?? 0);

export class ReversalTrial {
  stage: TrialStage = "IDLE";
  attempts = 0;
  successMask = 0;
  phaseAt = 0;

  isActive(): boolean {
    return this.stage === "READY" || this.stage === "CHARGING";
  }

  successes(): number {
    let n = 0;
    for (let m = this.successMask; m; m >>= 1) n += m & 1;
    return n;
  }

  start(now: number): void {
    this.stage = "READY";
    this.attempts = 0;
    this.successMask = 0;
    this.phaseAt = now;
  }

  charge(now: number): boolean {
    if (this.stage !== "READY") return false;
    if (now - this.phaseAt >= TRIAL.waitTicks) return this.cancel();
    this.stage = "CHARGING";
    this.phaseAt = now;
    return true;
  }

  release(now: number): boolean {
    if (this.stage !== "CHARGING") return false;
    const held = now - this.phaseAt;
    this.finishPulse(now, held >= windowStart(this.attempts) && held <= windowEnd(this.attempts));
    return true;
  }

  /** Advances timeouts; returns true when the state changed. */
  tick(now: number): boolean {
    if (this.stage === "READY" && now - this.phaseAt >= TRIAL.waitTicks) return this.cancel();
    if (this.stage === "CHARGING" && now - this.phaseAt >= TRIAL.maxHoldTicks) {
      this.finishPulse(now, false);
      return true;
    }
    return false;
  }

  cancel(): boolean {
    if (!this.isActive()) return false;
    this.stage = "INTERRUPTED";
    return true;
  }

  private finishPulse(now: number, success: boolean): void {
    if (success) this.successMask |= 1 << this.attempts;
    this.attempts++;
    this.phaseAt = now;
    if (this.attempts < TRIAL.pulses) this.stage = "READY";
    else this.stage = this.successes() >= TRIAL.required ? "PASSED" : "FAILED";
  }
}
