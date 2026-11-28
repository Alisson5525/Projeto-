import { describe, expect, it } from "vitest";
import { countCells, type Run } from "../../src/core/geometry";
import { TerrainQueue } from "../../src/core/terrainQueue";

const run = (y: number, x0: number, x1: number): Run => ({ y, z: 0, x0, x1 });

describe("terrain destruction queue", () => {
  it("hands out at most the per-tick budget, splitting long runs", () => {
    const q = new TerrainQueue<string>();
    q.push("overworld", [run(5, 0, 9), run(4, 0, 9)]);
    const first = q.take(15);
    expect(countCells(first.map((w) => w.run))).toBe(15);
    expect(first[1]!.run).toEqual(run(4, 0, 4));
    expect(q.pending).toBe(5);
    expect(q.take(15).map((w) => w.run)).toEqual([run(4, 5, 9)]);
    expect(q.pending).toBe(0);
  });

  it("serves jobs in the order they were queued", () => {
    const q = new TerrainQueue<string>();
    q.push("a", [run(1, 0, 1)]);
    q.push("b", [run(2, 0, 1)]);
    expect(q.take(10).map((w) => w.target)).toEqual(["a", "b"]);
  });

  it("drops work beyond the backlog cap", () => {
    const q = new TerrainQueue<string>(12);
    expect(q.push("a", [run(1, 0, 9)])).toBe(10);
    expect(q.push("a", [run(2, 0, 9)])).toBe(2);
    expect(q.pending).toBe(12);
  });

  it("does nothing without budget", () => {
    const q = new TerrainQueue<string>();
    q.push("a", [run(1, 0, 3)]);
    expect(q.take(0)).toEqual([]);
    expect(q.pending).toBe(4);
  });

  it("can forget every job of one target", () => {
    const q = new TerrainQueue<string>();
    q.push("a", [run(1, 0, 3)]);
    q.push("b", [run(1, 0, 1)]);
    q.clear("a");
    expect(q.pending).toBe(2);
    expect(q.take(10).map((w) => w.target)).toEqual(["b"]);
  });
});
