import { describe, expect, it, vi } from "vitest";
import { mockModule } from "../helpers/mcMock";

vi.mock("@minecraft/server", () => mockModule("server"));
vi.mock("@minecraft/server-ui", () => mockModule("ui"));

describe("slash commands", () => {
  it("lets any player choose the technique without cheats (fallback when menus fail)", async () => {
    const { registerCommands } = await import("../../src/game/commands");
    const defs: { name: string; permissionLevel: unknown; cheatsRequired?: boolean }[] = [];
    registerCommands({ customCommandRegistry: { registerCommand: (def: (typeof defs)[number]) => void defs.push(def) } } as never);
    const choose = defs.find((d) => d.name === "jjk:escolher");
    expect(choose).toBeDefined();
    expect(choose!.cheatsRequired).toBe(false);
    expect(String(choose!.permissionLevel)).toContain("CommandPermissionLevel.Any");
    const menu = defs.find((d) => d.name === "jjk:menu");
    expect(menu?.cheatsRequired).toBe(false);
  });
});
