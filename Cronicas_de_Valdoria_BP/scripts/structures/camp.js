// Acampamento Goblin: paliçada, fogueira, barracas, tenda do chefe, totem e caixotes. Defendido por goblins, xamãs e o Chefe Goblin.
import { NS } from "../core/util.js";
import { Plan, B, prepareGround } from "./builder.js";

const R = 11;

function tent(p, cx, z1, z2, half, wool, openFront = true) {
  // barraca em "A" ao longo do eixo z; a frente (z2) fica aberta
  for (let z = z1; z <= z2; z++) {
    for (let level = 0; level <= half; level++) {
      const y = 1 + level;
      const off = half - level;
      p.set(cx - off, y, z, wool).set(cx + off, y, z, wool);
      if (z === z1 || (!openFront && z === z2)) for (let x = cx - off; x <= cx + off; x++) p.set(x, y, z, wool);
    }
  }
  p.set(cx, half + 2, z2, B.fence("minecraft:spruce_fence"));
  p.set(cx, half + 2, z1, B.fence("minecraft:spruce_fence"));
}

export const CAMP = {
  id: "acampamento", nome: "Acampamento Goblin", raio: 13, alturaMax: 4, xp: 50, xpLimpo: 150, repovoar: 40,
  nomes: ["Acampamento Presa-Rubra", "Acampamento Dente-Podre", "Acampamento Olho-Torto", "Acampamento Unha-Negra",
    "Acampamento Crânio-Rachado", "Acampamento Lua-Sangrenta"],
  descricao: "Paliçada goblin com barracas, totem e a tenda do chefe. Os goblins voltam algum tempo depois de expulsos.",
  dica: "§6Você ouve tambores goblins",
  biomas: ["forest", "plains", "taiga", "savanna", "birch", "meadow", "grove", "windswept", "sunflower", "cherry"],
  async plan(dim, origin, rot, rnd) {
    const p = new Plan(origin, rot, rnd);
    const ground = (x, z) => {
      const d = Math.hypot(x, z);
      if (d <= 3) return "minecraft:coarse_dirt";
      if (d <= R) return p.pick([["minecraft:coarse_dirt", 4], ["minecraft:podzol", 3], ["minecraft:grass_block", 3], ["minecraft:gravel", 1]]);
      return "minecraft:grass_block";
    };
    const prep = await prepareGround(dim, p, -13, -13, 13, 13, 14, "minecraft:dirt", ground);

    // paliçada com estacas pontiagudas e falhas (desgaste); portão ao sul
    const done = new Set();
    for (let a = 0; a < 360; a += 2) {
      const x = Math.round(Math.cos((a * Math.PI) / 180) * R);
      const z = Math.round(Math.sin((a * Math.PI) / 180) * R);
      const k = `${x},${z}`;
      if (done.has(k)) continue;
      done.add(k);
      if (z > 8 && Math.abs(x) <= 1) continue; // portão
      if (rnd() < 0.05) continue; // estaca caída
      const h = 3 + (rnd() < 0.45 ? 1 : 0);
      for (let y = 1; y <= h; y++) p.set(x, y, z, B.log("minecraft:spruce_log"));
      if (rnd() < 0.6) p.set(x, h + 1, z, B.fence("minecraft:spruce_fence"));
    }
    for (const gx of [-2, 2]) {
      for (let y = 1; y <= 5; y++) p.set(gx, y, R, B.log("minecraft:spruce_log"));
      p.set(gx, 6, R, B.skull());
      p.set(gx, 4, R + 1, B.lantern("minecraft:lantern"));
    }
    // fogueira central com pedras e troncos-assento
    p.set(0, 1, 1, B.fire());
    for (const [x, z] of [[-1, 0], [1, 0], [0, -1], [0, 2], [-1, 2], [1, 2], [-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      if (Math.abs(x) + Math.abs(z - 1) === 1 || (Math.abs(x) === 1 && Math.abs(z - 1) === 1)) p.set(x, 0, z, "minecraft:cobblestone");
    }
    p.set(-3, 1, 1, B.log("minecraft:oak_log", "z")).set(3, 1, 1, B.log("minecraft:oak_log", "z")).set(0, 1, -2, B.log("minecraft:oak_log", "x"));
    // barracas
    const wool = () => p.pick([["minecraft:brown_wool", 3], ["minecraft:green_wool", 2], ["minecraft:gray_wool", 1]]);
    tent(p, -7, -3, 1, 2, wool());
    tent(p, 7, -3, 1, 2, wool());
    tent(p, -6, 3, 7, 2, wool());
    p.set(-7, 1, -2, B.log("minecraft:hay_block", "z")).set(7, 1, -2, B.log("minecraft:hay_block", "z")).set(-6, 1, 4, B.barrel());
    // tenda do chefe (maior, vermelha) ao norte
    tent(p, 0, -9, -3, 3, "minecraft:red_wool");
    p.chest(0, 1, -8, "south", "goblin_chefe", { lore: "ordens_goblin" });
    p.set(-2, 1, -8, B.barrel()).set(2, 1, -8, B.skull()).set(1, 1, -7, B.lantern());
    // baú comum na barraca oeste
    p.chest(-6, 1, 6, "south", "goblin");
    // totem com crânio e caixotes
    for (let y = 1; y <= 3; y++) p.set(6, y, 5, B.log("minecraft:stripped_spruce_log"));
    p.set(6, 4, 5, B.skull()).set(5, 2, 5, B.fence("minecraft:spruce_fence")).set(7, 2, 5, B.fence("minecraft:spruce_fence"));
    p.set(5, 1, 7, B.barrel()).set(6, 1, 7, B.barrel()).set(4, 1, 6, B.log("minecraft:hay_block"));
    p.set(-4, 1, -6, B.lantern()).set(4, 1, -6, B.lantern());
    // pontos de defesa
    for (const [x, z] of [[-3, 3], [3, 3], [-4, -1], [4, -1], [0, 5]]) p.mark("goblin", x, 1, z);
    for (const [x, z] of [[-6, 0], [6, 0]]) p.mark("xama", x, 1, z);
    p.mark("chefe", 0, 1, -5);
    p.box("area", -R, -2, -R, R, 8, R);
    return { plans: [prep, p], plan: p };
  },
  guards: [["goblin", `${NS}:goblin`], ["xama", `${NS}:goblin_xama`], ["chefe", `${NS}:chefe_goblin`]],
};
