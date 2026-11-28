import { describe, expect, it } from "vitest";
import {
  cursedMult,
  earnedPoints,
  effectiveCost,
  energyMax,
  energyRecovery,
  isSkillUnlocked,
  killXp,
  lockReason,
  physicalMult,
  skillLevel,
  techniqueXp,
  vitalityHealthBonus,
  vitalityReduction,
  xpToNext,
} from "../../src/core/progression";

describe("xp curve", () => {
  it("matches the Java formula 40 + 3n + n²/24 (integer division)", () => {
    expect(xpToNext(0)).toBe(40);
    expect(xpToNext(24)).toBe(136);
    expect(xpToNext(99)).toBe(40 + 297 + Math.floor((99 * 99) / 24));
  });
  it("is zero at the level cap", () => {
    expect(xpToNext(100)).toBe(0);
  });
  it("awards kill xp from max health clamped to 160", () => {
    expect(killXp(20)).toBe(35);
    expect(killXp(500)).toBe(126);
    expect(killXp(0)).toBe(22);
  });
  it("awards technique xp between 4 and 24", () => {
    expect(techniqueXp(0)).toBe(4);
    expect(techniqueXp(60)).toBe(8);
    expect(techniqueXp(200)).toBe(19);
    expect(techniqueXp(280)).toBe(24);
  });
  it("gives 3 points per level up to 300", () => {
    expect(earnedPoints(10)).toBe(30);
    expect(earnedPoints(150)).toBe(300);
  });
});

describe("cursed energy", () => {
  it("computes the maximum with a cap of 1000", () => {
    expect(energyMax(0, 0)).toBe(240);
    expect(energyMax(10, 10)).toBe(240 + 30 + 46);
    expect(energyMax(100, 100)).toBe(1000);
  });
  it("applies the Six Eyes discount (ceil base/20)", () => {
    expect(effectiveCost(60, true)).toBe(3);
    expect(effectiveCost(100, true)).toBe(5);
    expect(effectiveCost(280, true)).toBe(14);
    expect(effectiveCost(280, false)).toBe(280);
    expect(effectiveCost(0, true)).toBe(0);
  });
  it("does not regenerate during the first 15 idle ticks", () => {
    expect(energyRecovery(14, 0, true)).toBe(0);
  });
  it("ramps to 2 + 12 + ce/25 and is 30% faster outside combat", () => {
    expect(energyRecovery(15, 0, true)).toBe(2);
    expect(energyRecovery(240, 0, true)).toBe(14);
    expect(energyRecovery(240, 0, false)).toBe(18);
    expect(energyRecovery(1000, 100, true)).toBe(18);
  });
});

describe("attributes", () => {
  it("scales damage with strength and cursed energy points", () => {
    expect(physicalMult(100)).toBeCloseTo(1.8);
    expect(cursedMult(100)).toBeCloseTo(1.65);
  });
  it("converts vitality to health and damage reduction", () => {
    expect(vitalityHealthBonus(100)).toBe(25);
    expect(vitalityReduction(100)).toBeCloseTo(0.2);
  });
});

describe("skill unlocks", () => {
  it("uses the Java unlock levels", () => {
    expect([1, 2, 3, 4, 5, 6].map(skillLevel)).toEqual([0, 0, 6, 18, 32, 48]);
  });
  it("requires the reverse technique for Red and Red for Purple", () => {
    expect(isSkillUnlocked(4, 18, false)).toBe(false);
    expect(isSkillUnlocked(4, 18, true)).toBe(true);
    expect(isSkillUnlocked(5, 40, false)).toBe(false);
    expect(isSkillUnlocked(5, 40, true)).toBe(true);
    expect(isSkillUnlocked(6, 47, true)).toBe(false);
    expect(isSkillUnlocked(7, 100, true)).toBe(false);
  });
  it("explains why a slot is locked", () => {
    expect(lockReason(3, 5, false)).toBe("level");
    expect(lockReason(4, 20, false)).toBe("rct");
    expect(lockReason(5, 35, false)).toBe("red");
    expect(lockReason(5, 20, true)).toBe("level");
    expect(lockReason(1, 0, false)).toBeNull();
  });
});
