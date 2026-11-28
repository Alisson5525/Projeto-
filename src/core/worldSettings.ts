// World-level options (world dynamic property "jjk:settings") and the work
// budgets they imply. "alto" reproduces the Java values; "leve" is tuned for
// weak phones.

export type PerfProfile = "leve" | "medio" | "alto";
export type TerrainMode = "desligada" | "leve" | "completa";

export interface WorldSettings {
  perf: PerfProfile;
  terrain: TerrainMode;
}

export const defaultWorldSettings = (): WorldSettings => ({ perf: "leve", terrain: "leve" });

export function parseWorldSettings(raw: string | undefined): WorldSettings {
  const d = defaultWorldSettings();
  if (!raw) return d;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const perf = o.perf === "leve" || o.perf === "medio" || o.perf === "alto" ? o.perf : d.perf;
    const terrain = o.terrain === "desligada" || o.terrain === "leve" || o.terrain === "completa" ? o.terrain : d.terrain;
    return { perf, terrain };
  } catch {
    return d;
  }
}

export interface Budget {
  /** Particle count multiplier passed to particle effects (0..1). */
  particles: number;
  destroyTerrain: boolean;
  /** Block cells removed per tick by all destruction jobs together. */
  blocksPerTick: number;
  maxBlueBlocksPerScan: number;
  maxDebris: number;
  selfPurpleRadius: number;
  nukeRadius: number;
}

export function budget(s: WorldSettings): Budget {
  const perf = {
    leve: { particles: 0.45, blocksPerTick: 350, scan: 3, debris: 40 },
    medio: { particles: 0.7, blocksPerTick: 900, scan: 5, debris: 120 },
    alto: { particles: 1, blocksPerTick: 1800, scan: 8, debris: 256 },
  }[s.perf];
  const full = s.terrain === "completa";
  return {
    particles: perf.particles,
    destroyTerrain: s.terrain !== "desligada",
    blocksPerTick: perf.blocksPerTick,
    maxBlueBlocksPerScan: perf.scan,
    maxDebris: perf.debris,
    selfPurpleRadius: full ? 24 : 16,
    nukeRadius: full ? 64 : 32,
  };
}
