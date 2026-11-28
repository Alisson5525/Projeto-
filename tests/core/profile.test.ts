import { describe, expect, it } from "vitest";
import {
  defaultProfile,
  grantXp,
  investStat,
  parseProfile,
  rebirth,
  remainingPoints,
  removeStat,
  serializeProfile,
} from "../../src/core/profile";

describe("profile storage", () => {
  it("falls back to defaults for garbage or missing data", () => {
    expect(parseProfile(undefined)).toEqual(defaultProfile());
    expect(parseProfile("not json")).toEqual(defaultProfile());
    expect(parseProfile("[]")).toEqual(defaultProfile());
  });
  it("round-trips through serialize/parse", () => {
    const p = { ...defaultProfile(), level: 12, xp: 30, technique: "limitless" as const, rct: true, vit: 4, str: 7, ce: 9 };
    expect(parseProfile(serializeProfile(p))).toEqual(p);
  });
  it("clamps out-of-range numbers and rejects unknown techniques", () => {
    const p = parseProfile(JSON.stringify({ v: 1, level: 500, xp: -5, technique: "ratio", vit: 900, str: -1, ce: 3 }));
    expect(p.level).toBe(100);
    expect(p.xp).toBe(0);
    expect(p.technique).toBe("none");
    expect(p.vit).toBe(100);
    expect(p.str).toBe(0);
    expect(p.ce).toBe(3);
  });
});

describe("stat points", () => {
  it("spends only earned points and caps each stat at 100", () => {
    let p = { ...defaultProfile(), level: 1 };
    expect(remainingPoints(p)).toBe(3);
    p = investStat(p, "vit");
    p = investStat(p, "vit");
    p = investStat(p, "str");
    expect(remainingPoints(p)).toBe(0);
    expect(investStat(p, "ce")).toBe(p);
    const capped = { ...defaultProfile(), level: 100, vit: 100 };
    expect(investStat(capped, "vit")).toBe(capped);
  });
  it("refunds a point and never goes below zero", () => {
    const p = { ...defaultProfile(), level: 2, str: 1 };
    expect(removeStat(p, "str").str).toBe(0);
    expect(removeStat({ ...p, str: 0 }, "str").str).toBe(0);
  });
});

describe("xp gain", () => {
  it("levels up across several thresholds and keeps the remainder", () => {
    const r = grantXp(defaultProfile(), 40 + 43 + 10);
    expect(r.profile.level).toBe(2);
    expect(r.profile.xp).toBe(10);
    expect(r.leveledUp).toBe(true);
    expect(r.gainedPoints).toBe(6);
  });
  it("does not level without reaching the threshold", () => {
    const r = grantXp(defaultProfile(), 39);
    expect(r.profile.level).toBe(0);
    expect(r.profile.xp).toBe(39);
    expect(r.leveledUp).toBe(false);
  });
  it("stops at level 100 with zero xp", () => {
    const r = grantXp({ ...defaultProfile(), level: 99, xp: 0 }, 1_000_000);
    expect(r.profile.level).toBe(100);
    expect(r.profile.xp).toBe(0);
    expect(grantXp(r.profile, 50).profile).toBe(r.profile);
  });
});

describe("Six Eyes rebirth", () => {
  it("resets progression, keeps the technique and grants Six Eyes", () => {
    const before = { ...defaultProfile(), level: 60, xp: 12, technique: "limitless" as const, rct: true, vit: 50, str: 60, ce: 70 };
    const after = rebirth(before);
    expect(after).toMatchObject({ level: 0, xp: 0, technique: "limitless", sixEyes: true, rct: false, vit: 0, str: 0, ce: 0 });
    expect(after.settings).toEqual(before.settings);
  });
});
