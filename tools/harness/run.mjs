// Carrega scripts/main.js, dispara startup/worldLoad e executa cada intervalo registrado algumas vezes.
import { register } from "node:module";
register(new URL("./loader.mjs", import.meta.url));
const main = process.argv[2];
const srv = await import("./mock_server.mjs");
let errors = 0;
const origWarn = console.warn;
console.warn = (...a) => { errors++; origWarn("WARN", ...a); };
await import(main);
for (const fn of srv.subs["system.before.startup"] || []) fn({ customCommandRegistry: { registerCommand() {}, registerEnum() {} } });
for (const fn of srv.subs["world.after.worldLoad"] || []) fn({});
let n = 0;
for (let i = 0; i < 3; i++) for (const [fn] of srv.__intervals) { srv.system.currentTick += 1; try { fn(); n++; } catch (e) { errors++; console.error("interval error:", e); } }
const subsCount = Object.values(srv.subs).reduce((a, l) => a + l.length, 0);
console.log(`OK: módulos carregados; ${srv.__intervals.length} intervalos (${n} execuções), ${subsCount} assinaturas de eventos; avisos/erros: ${errors}`);
process.exit(errors ? 1 : 0);
