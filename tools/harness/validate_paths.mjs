// Simula o plano em voxels e verifica, por busca em largura, se um jogador alcança a pé (saltando 1 bloco, descendo, usando
// escadas de mão) as salas, baús e entradas dos mecanismos a partir da entrada. Portas de mecanismos são abertas na simulação
// "resolvida"; na simulação "fechada" as salas secretas não devem ser alcançáveis.
import { register } from "node:module";
register(new URL("./loader.mjs", import.meta.url));
const SCRIPTS = process.argv[2];
await import(`${SCRIPTS}/data/items_explore.js`);
const reg = await import(`${SCRIPTS}/structures/registry.js`);
await import(`${SCRIPTS}/exploration/index.js`);
const { rng } = await import(`${SCRIPTS}/structures/builder.js`);
const PASS = ["ladder", "rail", "pressure_plate", "button", "lever", "carpet", "candle", "mushroom", "poppy", "cornflower", "daisy",
  "allium", "lily_of_the_valley", "azure_bluet", "wither_rose", "web", "water", "torch", "skull", "glow_lichen"];
const passable = (id) => !id || id === "minecraft:air" || id === "minecraft:fire" || PASS.some((k) => id.includes(k));
const O = { x: 0, y: 70, z: 0 };
const dim = { id: "minecraft:overworld", getTopmostBlock: () => ({ location: { y: 70 }, typeId: "minecraft:grass_block" }),
  getBlock: (p) => ({ typeId: p.y > 70 ? "minecraft:air" : "minecraft:grass_block" }), isChunkLoaded: () => true };
const K = (x, y, z) => `${x},${y},${z}`;
let fails = 0;
for (const T of Object.values(reg.TYPES)) {
  if (!T.mecanismos || !T.raridade) continue;
  const res = await T.plan(dim, O, 0, rng(77), 4242);
  const vox = new Map();
  for (const plan of res.plans) for (const op of plan.ops) {
    if (op.k === "s") vox.set(K(op.p.x, op.p.y, op.p.z), op.id);
    else for (let x = Math.min(op.a.x, op.b.x); x <= Math.max(op.a.x, op.b.x); x++) for (let y = Math.min(op.a.y, op.b.y); y <= Math.max(op.a.y, op.b.y); y++)
      for (let z = Math.min(op.a.z, op.b.z); z <= Math.max(op.a.z, op.b.z); z++) vox.set(K(x, y, z), op.id);
  }
  const at = (m, x, y, z) => (m.has(K(x, y, z)) ? m.get(K(x, y, z)) : y <= 70 ? "minecraft:stone" : "minecraft:air");
  const marks = res.plan.marks;
  const doors = new Set();
  for (const M of T.mecanismos) for (const role of ["porta"]) for (const p of marks[M[role]] || []) doors.add(K(p.x, p.y, p.z));
  const A = marks.area;
  const inArea = (x, y, z) => x >= A[0].x - 3 && x <= A[1].x + 3 && z >= A[0].z - 3 && z <= A[1].z + 3 && y >= A[0].y - 2 && y <= A[1].y + 4;
  function reach(open) {
    const m = new Map(vox);
    if (open) for (const d of doors) m.set(d, "minecraft:air");
    const stand = (x, y, z) => passable(at(m, x, y, z)) && passable(at(m, x, y + 1, z));
    const start = [];
    for (let x = A[0].x - 3; x <= A[1].x + 3; x++) for (let z = A[1].z + 1; z <= A[1].z + 3; z++) if (stand(x, 71, z) && !passable(at(m, x, 70, z))) start.push([x, 71, z]);
    const seen = new Set(start.map((s) => K(...s)));
    const q = [...start];
    while (q.length) {
      const [x, y, z] = q.shift();
      const nexts = [];
      const lad = at(m, x, y, z).includes("ladder");
      if (lad || at(m, x, y + 1, z).includes("ladder")) nexts.push([x, y + 1, z]);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        nexts.push([x + dx, y, z + dz], [x + dx, y + 1, z + dz]);
        for (let f = 1; f <= 6; f++) nexts.push([x + dx, y - f, z + dz]);
      }
      nexts.push([x, y - 1, z]);
      for (const [a, b, c] of nexts) {
        const k = K(a, b, c);
        if (seen.has(k) || !inArea(a, b, c) || !stand(a, b, c)) continue;
        if (b < y) { // queda: a coluna inteira até o destino precisa estar livre
          let clear = true;
          for (let yy = b + 1; yy <= y + 1 && clear; yy++) clear = passable(at(m, a, yy, c));
          if (!clear) continue;
        }
        const supported = !passable(at(m, a, b - 1, c)) || at(m, a, b, c).includes("ladder") || at(m, a, b - 1, c).includes("ladder") || at(m, a, b, c).includes("water");
        if (!supported && b !== y - 1) continue;
        if (b === y + 1 && !passable(at(m, x, y + 2, z)) && !lad) continue; // sem espaço para saltar
        if (b < y && !(dx0(a, x) || dz0(c, z) || true)) continue;
        seen.add(k);
        if (seen.size > 400000) return seen;
        q.push([a, b, c]);
      }
    }
    return seen;
  }
  const dx0 = () => true, dz0 = () => true;
  const near = (seen, p, r = 2) => {
    for (let x = -r; x <= r; x++) for (let y = -2; y <= 1; y++) for (let z = -r; z <= r; z++) if (seen.has(K(p.x + x, p.y + y, p.z + z))) return true;
    return false;
  };
  const inBoxReach = (seen, b) => {
    for (let x = b[0].x; x <= b[1].x; x++) for (let y = b[0].y; y <= b[1].y; y++) for (let z = b[0].z; z <= b[1].z; z++) if (seen.has(K(x, y, z))) return true;
    return false;
  };
  const openS = reach(true);
  const closedS = reach(false);
  const issues = [];
  for (const c of res.plan.chests) if (!near(openS, c.pos)) issues.push(`baú ${c.tier} inalcançável`);
  for (const M of T.mecanismos) {
    for (const role of ["entradas", "leitor", "bloco", "gatilho", "alvos", "placas"]) for (const p of marks[M[role]] || []) if (!near(openS, p, role === "alvos" ? 3 : 2)) issues.push(`${M.id}.${role} inalcançável em ${p.x},${p.y},${p.z}`);
    if (M.sala && marks[M.sala] && !inBoxReach(openS, marks[M.sala])) issues.push(`${M.id}: sala '${M.sala}' inalcançável`);
    if (M.k === "segredo" && marks[M.sala] && M.porta && inBoxReach(closedS, marks[M.sala])) issues.push(`${M.id}: sala secreta acessível sem abrir a passagem`);
    if (M.k === "chave" && marks.sala_cofre && inBoxReach(closedS, marks.sala_cofre)) issues.push(`${M.id}: cofre acessível sem chave`);
  }
  if (process.env.DEBUG === T.id) {
    let maxY = -999;
    for (const k of openS) maxY = Math.max(maxY, Number(k.split(",")[1]));
    console.log("maxY", maxY);
    for (const k of [...openS].filter((k) => Number(k.split(",")[1]) >= maxY - 1).slice(0, 40)) console.log("  ", k, at(new Map(vox), ...k.split(",").map(Number)));
  }
  const uniq = [...new Set(issues)];
  console.log(`${uniq.length ? "✗" : "✓"} ${T.id}: ${openS.size} posições alcançáveis${uniq.length ? "\n    - " + uniq.slice(0, 12).join("\n    - ") : ""}`);
  if (uniq.length) fails++;
}
process.exit(fails ? 1 : 0);
