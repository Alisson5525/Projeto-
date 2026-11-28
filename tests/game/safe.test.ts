import { describe, expect, it, vi } from "vitest";
import { safely } from "../../src/game/safe";

describe("isolated systems", () => {
  it("keeps running the next systems when one throws", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const ran: string[] = [];
    safely("a", () => {
      throw new Error("boom");
    });
    safely("b", () => void ran.push("b"));
    expect(ran).toEqual(["b"]);
    warn.mockRestore();
  });

  it("reports each failing system once instead of every tick", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    for (let i = 0; i < 5; i++) {
      safely("hud", () => {
        throw new Error("bad title");
      });
    }
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toContain("hud");
    warn.mockRestore();
  });
});
