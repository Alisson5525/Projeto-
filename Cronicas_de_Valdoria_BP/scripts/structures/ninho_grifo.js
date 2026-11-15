// Ninho de Grifo: um esporão de rocha nas montanhas, com o ninho de galhos e feno no topo, ossos de presas, penas e um baú.
// Dois grifos selvagens guardam o lugar; com a Rédea Celeste (nível 18+) é possível domá-los.
import { Plan, B, prepareGround } from "./builder.js";

export const NINHO_GRIFO = {
  id: "ninho_grifo", nome: "Ninho de Grifo", raio: 9, alturaMax: 10, xp: 60, limpeza: false, distGen: 22, minY: 85, minYSoft: true,
  nomes: ["Ninho de Grifo", "Rochedo das Penas", "Pico do Grifo", "Ninho das Asas Douradas"],
  descricao: "Esporão de rocha no alto das montanhas onde grifos selvagens fazem o ninho. Leve a Rédea Celeste.",
  dica: "§ePenas douradas giram ao vento lá no alto",
  biomas: ["mountain", "peaks", "stony", "windswept", "jagged", "grove", "slopes", "meadow", "extreme_hills", "cherry"],
  async plan(dim, origin, rot, rnd) {
    const p = new Plan(origin, rot, rnd);
    const rock = () => p.pick([["minecraft:stone", 4], ["minecraft:andesite", 2], ["minecraft:calcite", 1], ["minecraft:cobblestone", 1],
      ["minecraft:tuff", 1]]);
    const prep = await prepareGround(dim, p, -9, -9, 9, 9, 14, "minecraft:stone",
      (x, z) => (Math.hypot(x, z) < 6 ? rock() : p.pick([["minecraft:stone", 3], ["minecraft:gravel", 1], ["minecraft:grass_block", 2]])));
    // esporão: um cone irregular de rocha que sobe até o ninho
    const H = 6;
    for (let x = -6; x <= 6; x++) {
      for (let z = -6; z <= 6; z++) {
        const d = Math.hypot(x, z);
        const top = Math.round(H - d * 0.9 + rnd() * 1.4);
        for (let y = 1; y <= Math.min(H, top); y++) p.set(x, y, z, rock());
      }
    }
    // rampa de subida (degraus de pedra) ao sul
    for (let k = 0; k < 6; k++) {
      for (const x of [-1, 0, 1]) {
        for (let y = 1; y <= k; y++) p.set(x, y, 8 - k, rock());
        p.set(x, k + 1, 8 - k, "minecraft:air");
      }
    }
    // o ninho: anel de galhos (troncos e cercas), forro de feno, ossos e penas
    for (let a = 0; a < 360; a += 15) {
      const r = (a * Math.PI) / 180;
      const x = Math.round(Math.cos(r) * 3.5);
      const z = Math.round(Math.sin(r) * 3.5);
      p.set(x, H + 1, z, B.log(a % 30 === 0 ? "minecraft:spruce_log" : "minecraft:dark_oak_log", a % 90 < 45 ? "x" : "z"));
      if (rnd() < 0.4) p.set(x, H + 2, z, B.fence("minecraft:spruce_fence"));
    }
    for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) if (Math.hypot(x, z) <= 2.6) p.set(x, H + 1, z, "minecraft:hay_block");
    p.set(-1, H + 2, 1, B.log("minecraft:bone_block", "x")).set(2, H + 2, -1, B.skull());
    p.chest(0, H + 2, -2, "south", "ninho_grifo");
    p.set(4, H + 1, 4, "minecraft:web");
    for (const [x, z] of [[-3, -2], [3, 2]]) p.mark("grifo", x, H + 2, z);
    p.box("area", -9, -2, -9, 9, 16, 9);
    return { plans: [prep, p], plan: p };
  },
  guards: [["grifo", "valdoria:grifo"]],
};
