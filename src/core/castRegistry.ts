// Tracks per-player temporary states (locks, cameras, invulnerability, ...)
// with the cleanup that restores each one, so any interruption (death,
// logout, dimension change, leaving combat) can undo all of them at once.

export class CastRegistry<K> {
  private readonly owners = new Map<K, Map<string, () => void>>();

  set(owner: K, name: string, cleanup: () => void): void {
    let map = this.owners.get(owner);
    if (!map) {
      map = new Map();
      this.owners.set(owner, map);
    }
    map.set(name, cleanup);
  }

  has(owner: K, name: string): boolean {
    return this.owners.get(owner)?.has(name) ?? false;
  }

  /** Forget a state without running its cleanup (it ended normally). */
  clear(owner: K, name: string): void {
    const map = this.owners.get(owner);
    if (!map) return;
    map.delete(name);
    if (map.size === 0) this.owners.delete(owner);
  }

  /** Run and remove one cleanup. Returns whether it existed. */
  interrupt(owner: K, name: string): boolean {
    const cleanup = this.owners.get(owner)?.get(name);
    if (!cleanup) return false;
    this.clear(owner, name);
    safe(cleanup);
    return true;
  }

  /** Run and remove every cleanup of an owner. Returns how many ran. */
  interruptAll(owner: K): number {
    const map = this.owners.get(owner);
    if (!map) return 0;
    this.owners.delete(owner);
    for (const cleanup of map.values()) safe(cleanup);
    return map.size;
  }
}

function safe(fn: () => void): void {
  try {
    fn();
  } catch (e) {
    console.warn(`[JJK] cleanup failed: ${String(e)}`);
  }
}
