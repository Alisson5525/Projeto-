// FIFO queue of block runs to erase, served under a per-tick cell budget so
// big techniques (Red dome, Purple, Self Purple, Nuke) never freeze a weak
// phone. The game layer turns each handed-out run into one fillBlocks call.
import type { Run } from "./geometry";

export interface Work<T> {
  target: T;
  run: Run;
}

interface Job<T> {
  target: T;
  runs: Run[];
  index: number;
  /** Next cell to erase inside runs[index]. */
  x: number;
}

const cells = (r: Run): number => r.x1 - r.x0 + 1;

export class TerrainQueue<T> {
  private jobs: Job<T>[] = [];
  private count = 0;

  constructor(private readonly maxPending = 60000) {}

  get pending(): number {
    return this.count;
  }

  /** Queues runs; returns how many cells were accepted under the backlog cap. */
  push(target: T, runs: readonly Run[]): number {
    const accepted: Run[] = [];
    let room = this.maxPending - this.count;
    for (const r of runs) {
      if (room <= 0) break;
      const n = Math.min(cells(r), room);
      accepted.push(n === cells(r) ? r : { ...r, x1: r.x0 + n - 1 });
      room -= n;
    }
    const total = accepted.reduce((s, r) => s + cells(r), 0);
    if (total > 0) {
      this.jobs.push({ target, runs: accepted, index: 0, x: accepted[0]!.x0 });
      this.count += total;
    }
    return total;
  }

  /** Runs to erase this tick, at most `budget` cells in total. */
  take(budget: number): Work<T>[] {
    const out: Work<T>[] = [];
    while (budget > 0 && this.jobs.length > 0) {
      const job = this.jobs[0]!;
      const run = job.runs[job.index]!;
      const n = Math.min(run.x1 - job.x + 1, budget);
      out.push({ target: job.target, run: { y: run.y, z: run.z, x0: job.x, x1: job.x + n - 1 } });
      budget -= n;
      this.count -= n;
      job.x += n;
      if (job.x > run.x1) {
        job.index++;
        if (job.index >= job.runs.length) this.jobs.shift();
        else job.x = job.runs[job.index]!.x0;
      }
    }
    return out;
  }

  /** Forgets every queued job of `target`. */
  clear(target: T): void {
    for (const job of this.jobs) {
      if (job.target !== target) continue;
      let left = job.runs[job.index] ? job.runs[job.index]!.x1 - job.x + 1 : 0;
      for (let i = job.index + 1; i < job.runs.length; i++) left += cells(job.runs[i]!);
      this.count -= left;
    }
    this.jobs = this.jobs.filter((j) => j.target !== target);
  }
}
