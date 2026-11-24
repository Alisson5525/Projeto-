import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
const BASE = new URL("./", import.meta.url);
export async function resolve(spec, ctx, next) {
  if (spec === "@minecraft/server") return { url: new URL("mc-mock.mjs", BASE).href, shortCircuit: true };
  if (spec === "@minecraft/server-ui") return { url: new URL("ui-mock.mjs", BASE).href, shortCircuit: true };
  if ((spec.startsWith("./") || spec.startsWith("../")) && !spec.endsWith(".js")) {
    const u = new URL(spec + ".js", ctx.parentURL);
    if (existsSync(fileURLToPath(u))) return { url: u.href, shortCircuit: true };
  }
  return next(spec, ctx);
}
