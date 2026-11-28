// World-saved return journal (Java DomainReturnData): written before anyone is
// moved into the void, so a crash, reload or logout never strands them there.
import { world } from "@minecraft/server";
import { addEntries, type Journal, markDeceased, parseJournal, removeEntry, type ReturnEntry, serializeJournal } from "../../core/domainJournal";

const PROPERTY = "jjk:domain_journal";
let cache: Journal | null = null;

export function journal(): Journal {
  if (!cache) {
    const raw = world.getDynamicProperty(PROPERTY);
    cache = parseJournal(typeof raw === "string" ? raw : undefined);
  }
  return cache;
}

function save(j: Journal): void {
  cache = j;
  world.setDynamicProperty(PROPERTY, serializeJournal(j));
}

export const recordEntries = (entries: readonly ReturnEntry[]): void => save(addEntries(journal(), entries));
export const forgetEntry = (id: string): void => save(removeEntry(journal(), id));
export const markDead = (id: string): void => save(markDeceased(journal(), id));
export const entryOf = (id: string): ReturnEntry | undefined => journal().entries[id];
