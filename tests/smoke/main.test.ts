import { describe, expect, it, vi } from "vitest";
import { mockModule, subscriptions } from "../helpers/mcMock";

vi.mock("@minecraft/server", () => mockModule("server"));
vi.mock("@minecraft/server-ui", () => mockModule("ui"));

describe("add-on entry point", () => {
  it("loads without throwing and wires its events", async () => {
    await import("../../src/main");
    const paths = subscriptions.map((s) => s.path);
    expect(paths).toContain("server.system.beforeEvents.startup");
    expect(paths).toContain("server.world.afterEvents.playerSpawn");
    expect(paths).toContain("server.world.afterEvents.itemUse");
    expect(paths).toContain("server.world.afterEvents.entityDie");
  });
});
