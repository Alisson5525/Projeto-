// Executa o plan() de todas as estruturas registradas (4 rotações, terreno plano simulado) e valida cada bloco e estado
// contra a lista oficial de blocos do Bedrock (vanilla-data) e os blocos do próprio add-on. Também confere mecanismos e marcações.
import { register } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
register(new URL("./loader.mjs", import.meta.url));
const SCRIPTS = process.argv[2];
const BP = new URL("../../Cronicas_de_Valdoria_BP/", import.meta.url);
const vanilla = JSON.parse(readFileSync(new URL("./blocks_1_26_60.json", import.meta.url)));
const old = JSON.parse(readFileSync(new URL("./blocks_1_26_10.json", import.meta.url)));
const legacy = new Map();
const custom = new Set(readdirSync(new URL("blocks/valdoria/", BP)).map((f) => `valdoria:${f.replace(".json", "")}`));
await import(`${SCRIPTS}/data/items_explore.js`);
const reg = await import(`${SCRIPTS}/structures/registry.js`);
await import(`${SCRIPTS}/structures/index.js`);
await import(`${SCRIPTS}/structures/dungeon.js`);
await import(`${SCRIPTS}/exploration/index.js`);
for (const f of ["capital", "aelthar", "village", "kardum_run", "nyxhal_run", "celeste_run", "lairs"]) {
  try { await import(`${SCRIPTS}/structures/${f}.js`); } catch (e) { /* alguns registram em outro módulo */ }
}
try { await import(`${SCRIPTS}/npc/index.js`); } catch { /* */ }
const { rng } = await import(`${SCRIPTS}/structures/builder.js`);
const dim = {
  id: "minecraft:overworld",
  getTopmostBlock: () => ({ location: { y: 70 }, typeId: "minecraft:grass_block" }),
  getBlock: (p) => ({ typeId: p.y > 70 ? "minecraft:air" : "minecraft:grass_block", location: p }),
  isChunkLoaded: () => true, getBiome: () => ({ id: "minecraft:plains" }),
};
const problems = new Map();
const note = (k) => problems.set(k, (problems.get(k) || 0) + 1);
const lootTiers = new Set((await import(`${SCRIPTS}/structures/loot.js`)).LOOT_TIERS);
let nTypes = 0, nOps = 0;
for (const [id, T] of Object.entries(reg.TYPES)) {
  if (typeof T.plan !== "function") continue;
  nTypes++;
  for (let rot = 0; rot < 4; rot++) {
    let res;
    try {
      res = await T.plan(dim, { x: 1000, y: 70, z: -500 }, rot, rng(12345 + rot), 987654 + rot);
    } catch (e) {
      note(`${id}: plan() lançou erro: ${e.message}`);
      continue;
    }
    for (const plan of res.plans) for (const op of plan.ops) {
      nOps++;
      const bid = op.id;
      if (bid.startsWith("valdoria:")) {
        if (!custom.has(bid)) note(`${id}: bloco do add-on inexistente ${bid}`);
        continue;
      }
      if (!(bid in vanilla)) { note(`${id}: bloco inexistente ${bid}`); continue; }
      if (op.st) for (const k of Object.keys(op.st)) {
        if (!vanilla[bid].includes(k)) note(`${id}: estado '${k}' inválido para ${bid}`);
        else if (!(old[bid] || []).includes(k)) legacy.set(k, (legacy.get(k) || 0) + 1);
      }
      if (!(bid in old)) legacy.set(`bloco ${bid}`, (legacy.get(`bloco ${bid}`) || 0) + 1);
    }
    if (rot === 0) {
      const marks = res.plan.marks;
      for (const c of res.plan.chests) if (!lootTiers.has(c.tier)) note(`${id}: tabela de saque inexistente '${c.tier}'`);
      for (const M of T.mecanismos || []) {
        for (const role of ["entradas", "porta", "leitor", "gatilho", "sala", "placas", "origem", "bloco", "alvos", "ponto", "pontos", "guardioes"]) {
          if (M[role] && !marks[M[role]]) note(`${id}/${M.id}: marcação '${M[role]}' (${role}) não existe no plano`);
        }
        if (M.k === "sequencia" && marks[M.entradas] && marks[M.entradas].length !== M.n) note(`${id}/${M.id}: ${marks[M.entradas].length} entradas para n=${M.n}`);
        if (M.depois?.bau && !marks[M.depois.bau]) note(`${id}/${M.id}: baú '${M.depois.bau}' sem marcação`);
        if (M.depois?.tier && !lootTiers.has(M.depois.tier)) note(`${id}/${M.id}: tabela '${M.depois.tier}' inexistente`);
      }
      for (const [k] of T.guards || []) if (!marks[k]) note(`${id}: guardião '${k}' sem marcação`);
    }
  }
}
console.log(`${nTypes} tipos de estrutura, ${nOps} operações de bloco verificadas (4 rotações).`);
if (legacy.size) console.log(`Compatibilidade 1.26.10-1.26.40 (tratada pelo fallback do construtor): ${[...legacy.keys()].join(", ")}`);
if (!problems.size) console.log("Nenhum problema encontrado.");
for (const [k, n] of problems) console.log(`  ${n}x ${k}`);
process.exit(problems.size ? 1 : 0);
