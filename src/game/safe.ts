// Runs one system of the tick loop so that its failure cannot stop the others
// (an exception used to abort the whole tick, including the technique offer).
// Each failing system is reported once in the content log, not every tick.
const reported = new Set<string>();

export function safely(label: string, fn: () => void): void {
  try {
    fn();
  } catch (e) {
    if (reported.has(label)) return;
    reported.add(label);
    console.warn(`[JJK] ${label} failed: ${e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e)}`);
  }
}
