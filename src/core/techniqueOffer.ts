// What to do after showing the technique-choice menu. A player who reads the
// menu and closes it is simply asked again later; a menu that keeps closing on
// its own (or cannot be shown at all) must never lock the player out of the
// add-on, so after two such failures the only technique, Limitless, is granted.

/** A menu closed faster than this was not closed by a person. */
export const MIN_OPEN_TICKS = 10;
const FAILURES_BEFORE_GRANT = 2;

export type OfferResult =
  | { selected: boolean; canceled: boolean; busy: boolean; openTicks: number }
  | { error: true };

export class OfferTracker {
  private failures = 0;

  outcome(result: OfferResult): "choose" | "retry" | "grant" {
    if ("error" in result) return this.fail();
    if (result.selected && !result.canceled) {
      this.failures = 0;
      return "choose";
    }
    if (result.busy) return "retry";
    if (result.openTicks < MIN_OPEN_TICKS) return this.fail();
    this.failures = 0;
    return "retry";
  }

  private fail(): "retry" | "grant" {
    this.failures++;
    return this.failures >= FAILURES_BEFORE_GRANT ? "grant" : "retry";
  }
}
