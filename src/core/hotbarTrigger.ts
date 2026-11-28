// Turns hotbar selection changes into "slot tapped" events while in combat
// mode. The script snaps the selection back to the home slot after each tap,
// and that self-induced change must not count as a tap.

export class HotbarTrigger {
  private expected: number | null = null;
  private lastSlot = -1;
  private lastAt = -1000;

  constructor(
    readonly homeSlot = 8,
    readonly debounceTicks = 4,
  ) {}

  /** Call right before the script changes the selected slot itself. */
  expectSelfChange(slot: number): void {
    this.expected = slot;
  }

  /** Returns the tapped slot index (0-based) or null when it is not a tap. */
  onChange(_previous: number, next: number, now: number): number | null {
    if (this.expected !== null && next === this.expected) {
      this.expected = null;
      return null;
    }
    this.expected = null;
    if (next === this.homeSlot) return null;
    if (next === this.lastSlot && now - this.lastAt < this.debounceTicks) return null;
    this.lastSlot = next;
    this.lastAt = now;
    return next;
  }
}
