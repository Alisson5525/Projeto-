// Persistent record of everything a domain moved into its arena (Java
// DomainReturnData): where each entity came from, so it can be returned even
// if the world closes, the script reloads or the player logs out mid-domain.
import type { V3 } from "./vec";

export interface ReturnEntry {
  id: string;
  session: string;
  slot: number;
  /** Dimension id of the origin. */
  dimension: string;
  origin: V3;
  yaw: number;
  pitch: number;
  arrival: V3;
  player: boolean;
  deceased: boolean;
}

export interface Journal {
  v: 1;
  entries: Record<string, ReturnEntry>;
}

export const emptyJournal = (): Journal => ({ v: 1, entries: {} });

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isVec = (v: unknown): v is V3 => !!v && typeof v === "object" && isNum((v as V3).x) && isNum((v as V3).y) && isNum((v as V3).z);

function validEntry(e: unknown): e is ReturnEntry {
  if (!e || typeof e !== "object") return false;
  const o = e as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.session === "string" &&
    isNum(o.slot) &&
    typeof o.dimension === "string" &&
    isVec(o.origin) &&
    isNum(o.yaw) &&
    isNum(o.pitch) &&
    isVec(o.arrival) &&
    typeof o.player === "boolean" &&
    typeof o.deceased === "boolean"
  );
}

export function parseJournal(raw: string | undefined): Journal {
  if (!raw) return emptyJournal();
  try {
    const data = JSON.parse(raw) as { entries?: Record<string, unknown> };
    const out = emptyJournal();
    for (const [id, e] of Object.entries(data.entries ?? {})) if (validEntry(e) && e.id === id) out.entries[id] = e;
    return out;
  } catch {
    return emptyJournal();
  }
}

export const serializeJournal = (j: Journal): string => JSON.stringify(j);

export function addEntries(j: Journal, entries: readonly ReturnEntry[]): Journal {
  const out: Journal = { v: 1, entries: { ...j.entries } };
  for (const e of entries) out.entries[e.id] = e;
  return out;
}

export function removeEntry(j: Journal, id: string): Journal {
  if (!j.entries[id]) return j;
  const entries = { ...j.entries };
  delete entries[id];
  return { v: 1, entries };
}

export function markDeceased(j: Journal, id: string): Journal {
  const e = j.entries[id];
  if (!e) return j;
  return { v: 1, entries: { ...j.entries, [id]: { ...e, deceased: true } } };
}

/** Entries of sessions that no longer run: they must be returned. */
export const staleEntries = (j: Journal, liveSessions: ReadonlySet<string>): ReturnEntry[] =>
  Object.values(j.entries).filter((e) => !liveSessions.has(e.session));

/** Arena slots that cannot be reused while someone may still be inside. */
export function reservedSlots(j: Journal): Set<number> {
  return new Set(Object.values(j.entries).map((e) => e.slot));
}
