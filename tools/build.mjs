// Bundles the TypeScript sources into the behavior pack script module and
// emits .cache/refs.json (every id the scripts reference) for the validator.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const external = ["@minecraft/server", "@minecraft/server-ui"];

await build({
  entryPoints: [join(root, "src/main.ts")],
  outfile: join(root, "packs/JJK_BP/scripts/main.js"),
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  external,
  minifySyntax: true,
  legalComments: "none",
  logLevel: "warning",
});

// Emit the id registry so tools/validate-packs.mjs can cross-check packs.
mkdirSync(join(root, ".cache"), { recursive: true });
const refsScript = join(root, ".cache/emit-refs.mjs");
await build({
  entryPoints: [join(root, "tools/emit-refs.ts")],
  outfile: refsScript,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  external,
  logLevel: "warning",
});
const refs = execFileSync(process.execPath, [refsScript], { encoding: "utf8" });
writeFileSync(join(root, ".cache/refs.json"), refs);
console.log("[build] scripts/main.js and .cache/refs.json written");
