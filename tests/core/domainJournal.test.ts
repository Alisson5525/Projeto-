import { describe, expect, it } from "vitest";
import {
  addEntries,
  emptyJournal,
  markDeceased,
  parseJournal,
  removeEntry,
  reservedSlots,
  type ReturnEntry,
  serializeJournal,
  staleEntries,
} from "../../src/core/domainJournal";
import { closureProgress, isClosedPhase, keepInArena, DOMAIN } from "../../src/core/domainRules";

const entry = (id: string, session = "s1", slot = 0, player = true): ReturnEntry => ({
  id,
  session,
  slot,
  dimension: "minecraft:overworld",
  origin: { x: 10.5, y: 70, z: -3.25 },
  yaw: 45,
  pitch: -10,
  arrival: { x: 0.5, y: 64, z: 0.5 },
  player,
  deceased: false,
});

describe("domain return journal", () => {
  it("round-trips through its saved text", () => {
    const j = addEntries(emptyJournal(), [entry("a"), entry("b", "s1", 0, false)]);
    const back = parseJournal(serializeJournal(j));
    expect(back).toEqual(j);
    expect(back.entries["b"]!.player).toBe(false);
  });

  it("survives missing or corrupted data", () => {
    expect(parseJournal(undefined)).toEqual(emptyJournal());
    expect(parseJournal("{not json")).toEqual(emptyJournal());
    const partial = parseJournal(JSON.stringify({ v: 1, entries: { a: entry("a"), bad: { id: "bad" } } }));
    expect(Object.keys(partial.entries)).toEqual(["a"]);
  });

  it("flags entries whose session is not running (world closed or script reloaded)", () => {
    const j = addEntries(emptyJournal(), [entry("a", "live"), entry("b", "gone"), entry("c", "gone")]);
    expect(staleEntries(j, new Set(["live"])).map((e) => e.id).sort()).toEqual(["b", "c"]);
    expect(staleEntries(j, new Set(["live", "gone"]))).toEqual([]);
  });

  it("keeps arena slots of returning entities reserved", () => {
    const j = addEntries(emptyJournal(), [entry("a", "s1", 0), entry("b", "s2", 3)]);
    expect([...reservedSlots(j)].sort()).toEqual([0, 3]);
    expect([...reservedSlots(removeEntry(j, "b"))]).toEqual([0]);
  });

  it("remembers who died inside", () => {
    const j = markDeceased(addEntries(emptyJournal(), [entry("a")]), "a");
    expect(j.entries["a"]!.deceased).toBe(true);
    expect(markDeceased(j, "nobody")).toEqual(j);
  });
});

describe("domain barrier phases", () => {
  it("closes over the forming time and stays closed until the end", () => {
    expect(closureProgress("forming", 0)).toBe(0);
    expect(closureProgress("forming", DOMAIN.formingTicks / 2)).toBeCloseTo(0.5);
    expect(closureProgress("sealed", 0)).toBe(1);
    expect(closureProgress("active", 100)).toBe(1);
    expect(closureProgress("ending", 0)).toBe(1);
    expect(closureProgress("ending", DOMAIN.fractureTicks)).toBe(0);
  });

  it("blocks crossings only while sealed, transferring or active", () => {
    expect(isClosedPhase("forming")).toBe(false);
    expect(isClosedPhase("sealed")).toBe(true);
    expect(isClosedPhase("transferring")).toBe(true);
    expect(isClosedPhase("active")).toBe(true);
    expect(isClosedPhase("ending")).toBe(false);
  });

  it("keeps occupants on the arena floor", () => {
    expect(keepInArena({ x: 3, y: 0, z: -2 }, 38)).toBeNull();
    expect(keepInArena({ x: 50, y: 0, z: 0 }, 38)).toEqual({ x: 37, y: 0, z: 0 });
    expect(keepInArena({ x: 0, y: -5, z: 0 }, 38)).toEqual({ x: 0, y: 0, z: 0 });
  });
});
