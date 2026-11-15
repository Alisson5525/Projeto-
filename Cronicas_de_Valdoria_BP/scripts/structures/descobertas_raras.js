// Descobertas raras e lendárias: masmorras subterrâneas em várias salas (enigmas, armadilhas, guardião, cofre com chave,
// passagem secreta), o Bosque Encantado, o Altar Corrompido e o Cofre dos Reis Esquecidos.
import { NS, V } from "../core/util.js";
import { particle, sound } from "../core/fx.js";
import { Plan, B, prepareGround, build } from "./builder.js";
import { symbolsFor } from "../exploration/mechanisms.js";

const AIR = "minecraft:air";
const grassy = (p) => p.pick([["minecraft:grass_block", 8], ["minecraft:coarse_dirt", 2], ["minecraft:gravel", 1]]);
const top = (q) => ({ x: q.x + 0.5, y: q.y + 1, z: q.z + 0.5 });

/** Escadaria reta de 3 de largura descendo para o norte (de y=0 em z=z0 até y=F). */
function stairway(p, z0, F, wall, stair) {
  const n = -F;
  for (let i = 0; i <= n; i++) {
    const y = -i;
    const z = z0 - i;
    for (let x = -2; x <= 2; x++) for (let h = -1; h <= 5; h++) {
      const edge = Math.abs(x) === 2;
      if (h === -1) p.set(x, y + h, z, wall);
      else if (edge || h === 5) p.set(x, y + h, z, wall);
      else p.set(x, y + h, z, AIR);
    }
    if (i < n) for (let x = -1; x <= 1; x++) p.set(x, y, z, B.stairs(stair, "south"));
    if (i % 4 === 2) p.set(-1, y + 3, z, B.lantern("minecraft:soul_lantern", true));
  }
  return z0 - n;
}
/** Reabre o último degrau da escadaria depois que a primeira sala é construída por cima dele. */
function stairFoot(p, zEnd, F, stair) {
  for (let x = -1; x <= 1; x++) {
    p.set(x, F + 1, zEnd + 1, B.stairs(stair, "south"));
    for (let y = F + 2; y <= F + 4; y++) p.set(x, y, zEnd + 1, AIR);
  }
}
/** Parede de blocos que um mecanismo abre (x de -w..w, y de F+1..F+h, em z). */
function gateWall(p, mark, z, F, w, h, block) {
  for (let x = -w; x <= w; x++) for (let y = F + 1; y <= F + h; y++) p.set(x, y, z, block).mark(mark, x, y, z);
}

// ====================================================================== TEMPLO RÚNICO SUBTERRÂNEO
const TF = -12;
const TEMPLO_SINOS = { k: "sequencia", id: "sinos", input: "bell", n: 4, entradas: "sino", porta: "porta_sinos", leitor: "mural",
  nome: "Os sinos rúnicos", tituloPista: "Mural dos Sacerdotes", falha: "choque", obj: "Resolver o enigma dos sinos", xp: 220,
  prologo: "§8Um mural mostra sacerdotes tocando sinos sob as estrelas. Abaixo, versos rúnicos:§r",
  depois: { msg: "§7A parede de runas se desfaz em pó" } };
export const TEMPLO_RUNICO = {
  id: "templo_runico", nome: "Templo Rúnico Subterrâneo", raridade: "raro", raio: 7, alcance: 26, alturaMax: 4, minY: 30, xp: 120,
  xpLimpo: 260, repovoar: 90, nivel: 12, peso: 2, espaco: 1100,
  nomes: ["Templo de Runeval", "Santuário Sob a Colina", "Templo dos Sinos Mudos", "Câmara de Ithrel"],
  descricao: "Templo aetheriano sob a terra: sinos com enigma, corredor de dardos, o Guardião Rúnico e um cofre selado. Há uma passagem dos sacerdotes.",
  dica: "§dPedras eretas cercam uma escadaria escura",
  biomas: [""],
  objLimpo: "Limpar as salas do templo",
  async plan(dim, origin, rot, rnd, seed) {
    const p = new Plan(origin, rot, rnd);
    const prep = await prepareGround(dim, p, -7, -7, 7, 7, 10, "minecraft:dirt", (x, z) =>
      Math.hypot(x, z) <= 4.5 ? p.pick([["minecraft:stone_bricks", 3], ["minecraft:mossy_stone_bricks", 2], ["minecraft:cracked_stone_bricks", 1]]) : grassy(p));
    const wall = "minecraft:polished_deepslate";
    const tile = "minecraft:deepslate_tiles";
    // pedras eretas com runas no topo
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const x = Math.round(Math.cos(a) * 5.5);
      const z = Math.round(Math.sin(a) * 5.5);
      if (z > 3 && Math.abs(x) < 3) continue;
      for (let y = 1; y <= 3 + (k % 2); y++) p.set(x, y, z, y === 3 + (k % 2) ? "minecraft:chiseled_deepslate" : "minecraft:deepslate_bricks");
    }
    const zEnd = stairway(p, 2, TF, wall, "minecraft:deepslate_brick_stairs");
    // 1) antecâmara dos sinos
    p.room(-7, TF, -22, 7, TF + 6, zEnd + 1, wall, tile);
    stairFoot(p, zEnd, TF, "minecraft:deepslate_brick_stairs");
    const syms = symbolsFor(seed, TEMPLO_SINOS);
    [[-5, -14], [5, -14], [-5, -19], [5, -19]].forEach(([x, z], i) => {
      p.set(x, TF + 1, z, syms[i].bloco).set(x, TF + 2, z, B.bell());
      p.mark("sino", x, TF + 2, z);
    });
    p.set(0, TF + 1, -13, B.facing("minecraft:lectern", "south")).mark("mural", 0, TF + 1, -13);
    for (const x of [-6, 6]) for (const z of [-12, -16, -21]) p.set(x, TF + 3, z, B.lantern("minecraft:soul_lantern"));
    // passagem dos sacerdotes (secreta): botão liso ao lado da vela eterna, parede oeste
    p.room(-14, TF, -18, -7, TF + 4, -12, "minecraft:polished_blackstone_bricks", "minecraft:polished_blackstone");
    p.set(-7, TF + 2, -17, "minecraft:polished_blackstone").set(-6, TF + 2, -17, B.button("east", "minecraft:polished_blackstone_button"));
    p.set(-6, TF + 1, -17, B.candle(1, "minecraft:white_candle"));
    p.mark("botao_sacerdotes", -6, TF + 2, -17);
    for (let y = TF + 1; y <= TF + 2; y++) p.set(-7, y, -15, "minecraft:polished_blackstone_bricks").mark("passagem", -7, y, -15);
    p.chest(-13, TF + 1, -15, "east", "templo_segredo", { lore: "sacerdotes_runeval" });
    p.set(-12, TF + 1, -17, B.candle(4, "minecraft:white_candle")).set(-12, TF + 1, -13, "minecraft:enchanting_table");
    p.box("sala_sacerdotes", -13, TF + 1, -17, -8, TF + 3, -13);
    // 2) corredor dos dardos (placas visíveis; um caminho seguro em zigue-zague)
    p.room(-3, TF, -37, 3, TF + 5, -22, wall, tile);
    gateWall(p, "porta_sinos", -22, TF, 1, 3, "minecraft:chiseled_polished_blackstone");
    for (let z = -24; z >= -35; z--) {
      const safe = Math.floor((-z - 24) / 3) % 2 === 0 ? -1 : 1;
      for (const x of [-1, 0, 1]) {
        if (x === safe) continue;
        if ((z + x) % 2 === 0) {
          p.set(x, TF + 1, z, B.plate("minecraft:polished_blackstone_pressure_plate")).mark("placa_dardo", x, TF + 1, z);
          const bx = x > 0 ? -3 : 3;
          p.set(bx, TF + 2, z, B.dispenser(bx < 0 ? "east" : "west")).mark("bico_dardo", bx, TF + 2, z);
        }
      }
    }
    // 3) salão do guardião
    p.room(-9, TF, -51, 9, TF + 8, -37, wall, "minecraft:polished_deepslate");
    for (let x = -1; x <= 1; x++) for (let y = TF + 1; y <= TF + 3; y++) p.set(x, y, -37, AIR);
    for (const [x, z] of [[-6, -40], [6, -40], [-6, -48], [6, -48]]) for (let y = TF + 1; y <= TF + 7; y++) p.set(x, y, z, y % 3 === 0 ? "minecraft:chiseled_deepslate" : "minecraft:deepslate_bricks");
    for (let x = -2; x <= 2; x++) for (let z = -46; z <= -42; z++) if (Math.abs(x) === 2 || Math.abs(z + 44) === 2) p.set(x, TF, z, "minecraft:chiseled_polished_blackstone");
    p.mark("guardiao", 0, TF + 1, -44);
    p.box("sala_guardiao", -8, TF + 1, -50, 8, TF + 7, -38);
    // 4) cofre selado
    p.room(-5, TF, -59, 5, TF + 5, -51, "minecraft:polished_blackstone_bricks", "minecraft:gilded_blackstone");
    gateWall(p, "porta_cofre", -51, TF, 1, 3, `${NS}:portao_selado`);
    p.chest(0, TF + 1, -57, "south", "templo_cofre", { item: `${NS}:sino_runico` });
    p.chest(-3, TF + 1, -56, "east", "templo_cofre");
    p.set(3, TF + 1, -56, "minecraft:gold_block").set(3, TF + 2, -56, B.candle(3, "minecraft:yellow_candle"));
    p.box("sala_cofre", -4, TF + 1, -58, 4, TF + 4, -52);
    p.mark("espectro", -3, TF + 1, -17).mark("espectro", 3, TF + 1, -17).mark("espectro", 0, TF + 1, -30);
    p.mark("esqueleto", -4, TF + 1, -48).mark("esqueleto", 4, TF + 1, -40);
    p.box("area", -14, TF - 1, -59, 7, 6, 7);
    return { plans: [prep, p], plan: p };
  },
  guards: [["espectro", `${NS}:espectro`], ["esqueleto", "minecraft:skeleton"]],
  mecanismos: [
    TEMPLO_SINOS,
    { k: "armadilha", id: "dardos", placas: "placa_dardo", origem: "bico_dardo", tipo: "dardos", dano: 5, veneno: true, atraso: 6 },
    { k: "guardiao", id: "guardiao", ponto: "guardiao", sala: "sala_guardiao", requer: "sinos", tipo: `${NS}:sentinela_runica`, nome: "Guardião Rúnico de Ithrel",
      nivel: 3, subtitulo: "o constructo acorda", obj: "Derrotar o Guardião Rúnico", xp: 380,
      solta: [[`${NS}:chave_antiga`, 1], [`${NS}:engrenagem_runica`, 2]] },
    { k: "chave", id: "cofre", porta: "porta_cofre", obj: "Abrir o cofre selado", xp: 200, dica: "O Guardião Rúnico a carrega." },
    { k: "segredo", id: "sacerdotes", gatilho: "botao_sacerdotes", porta: "passagem", sala: "sala_sacerdotes", obj: "Achar a passagem dos sacerdotes",
      nome: "A passagem dos sacerdotes", xp: 120 },
  ],
};

// ====================================================================== BOSQUE ENCANTADO
const BOSQUE_CIRCULO = { k: "sequencia", id: "circulo", input: "button", n: 4, entradas: "pedra_fada", leitor: "verso_fadas",
  nome: "O Círculo das Fadas", tituloPista: "Canção das Fadas", falha: "choque", obj: "Despertar o Círculo das Fadas", xp: 260,
  prologo: "§8Uma voz fina, vinda das flores, cantarola:§r",
  depois: { bau: "bau_fadas", tier: "bosque", extra: { item: `${NS}:lanterna_fadas` }, msg: "§dO círculo se acende: as fadas deixam um presente",
    fn: (dim, rec) => {
      const pos = rec.mk.coracao?.[0];
      if (!pos) return;
      for (const [id, n] of [[`${NS}:unicornio`, 1], [`${NS}:cervo_magico`, 2]]) {
        for (let i = 0; i < n; i++) {
          try {
            dim.spawnEntity(id, V.add(top(pos), { x: (Math.random() - 0.5) * 6, y: 0, z: (Math.random() - 0.5) * 6 }));
          } catch { /* */ }
        }
      }
      particle(dim, "fada_brilho", top(pos), {});
      particle(dim, "natureza_explosao", top(pos), { radius: 3 });
      sound(dim, "random.levelup", top(pos), 1.6, 1);
    } } };
export const BOSQUE = {
  id: "bosque", nome: "Bosque Encantado", raridade: "raro", raio: 12, alturaMax: 5, xp: 110, xpLimpo: 220, repovoar: 80,
  nivel: 10, peso: 2, espaco: 1000,
  nomes: ["Bosque de Lúmen", "Clareira das Fadas", "Bosque da Lua Verde", "Jardim de Ysolwen"],
  descricao: "Clareira de árvores antigas, uma fonte lunar e o Círculo das Fadas. A corrupção tenta tomar o bosque.",
  dica: "§aLuzes dançam entre as árvores",
  biomas: ["forest", "birch", "flower", "cherry", "dark_forest", "roofed", "meadow", "taiga", "jungle", "grove"],
  objLimpo: "Expulsar a corrupção do bosque",
  async plan(dim, origin, rot, rnd, seed) {
    const p = new Plan(origin, rot, rnd);
    const prep = await prepareGround(dim, p, -12, -12, 12, 12, 16, "minecraft:dirt", (x, z) => {
      const d = Math.hypot(x, z);
      if (d <= 3.5) return "minecraft:moss_block";
      return p.pick([["minecraft:grass_block", 8], ["minecraft:moss_block", 2], ["minecraft:podzol", 1]]);
    });
    // árvores antigas em anel (troncos grossos de 2x2, copas de azaleia florida)
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + 0.3;
      const cx = Math.round(Math.cos(a) * 9.5);
      const cz = Math.round(Math.sin(a) * 9.5);
      if (cz > 7 && Math.abs(cx) < 4) continue;
      const h = 8 + Math.floor(rnd() * 4);
      for (let y = 1; y <= h; y++) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) p.set(cx + dx, y, cz + dz, B.log("minecraft:oak_log"));
      for (let dx = -3; dx <= 4; dx++) for (let dz = -3; dz <= 4; dz++) for (let dy = -2; dy <= 2; dy++) {
        const d = Math.hypot(dx - 0.5, dz - 0.5) + Math.abs(dy) * 0.8;
        if (d > 4 || (Math.abs(dx - 0.5) < 1 && Math.abs(dz - 0.5) < 1 && dy < 1)) continue;
        if (rnd() < 0.12) continue;
        p.set(cx + dx, h + dy, cz + dz, B.leaves(rnd() < 0.35 ? "minecraft:azalea_leaves_flowered" : "minecraft:azalea_leaves"));
      }
      p.set(cx - 1, 1, cz, "minecraft:red_mushroom").set(cx + 2, 1, cz + 1, "minecraft:brown_mushroom");
    }
    // anel de cogumelos e flores
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * Math.PI * 2;
      const x = Math.round(Math.cos(a) * 6);
      const z = Math.round(Math.sin(a) * 6);
      p.set(x, 1, z, k % 3 === 0 ? "minecraft:red_mushroom" : k % 3 === 1 ? "minecraft:allium" : "minecraft:lily_of_the_valley");
    }
    // fonte lunar no centro
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) {
      p.set(x, -1, z, "minecraft:sea_lantern").set(x, 0, z, "minecraft:water");
    }
    for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) if (Math.abs(x) === 2 || Math.abs(z) === 2) p.set(x, 1, z, B.slab("minecraft:mossy_stone_brick_slab"));
    p.mark("fonte", 0, 1, -2);
    p.set(0, 1, -2, "minecraft:mossy_stone_bricks");
    p.mark("coracao", 0, 0, 0);
    // pedras das fadas: botão sobre o bloco colorido (cor = símbolo da canção)
    const syms = symbolsFor(seed, BOSQUE_CIRCULO);
    [[4, 0], [0, 4], [-4, 0], [0, -4]].forEach(([x, z], i) => {
      p.set(x, 1, z, syms[i].bloco);
      p.set(x, 2, z, "minecraft:mossy_cobblestone").set(x, 3, z, ["minecraft:wooden_button", { facing_direction: 1, button_pressed_bit: false }]);
      p.mark("pedra_fada", x, 3, z);
    });
    p.set(2, 1, 3, B.facing("minecraft:lectern", "north")).mark("verso_fadas", 2, 1, 3);
    p.mark("bau_fadas", -2, 1, 3);
    for (const [x, z] of [[-7, -3], [6, 4], [-4, 8], [5, -7]]) p.mark("broto", x, 1, z);
    p.mark("cavaleiro", 0, 1, 8);
    p.box("area", -12, -2, -12, 12, 16, 12);
    return { plans: [prep, p], plan: p };
  },
  guards: [["broto", `${NS}:broto_corrompido`], ["cavaleiro", `${NS}:cavaleiro_corrompido`]],
  mecanismos: [
    BOSQUE_CIRCULO,
    { k: "altar", id: "fonte", bloco: "fonte", obj: "Beber da Fonte da Lua", particula: "natureza_explosao",
      bencao: { nome: "Bênção da Lua Verde", seg: 900, mods: { nature: 0.15, regen: 0.3, heal: 0.15 }, efeitos: [["night_vision", 0], ["regeneration", 0]] } },
  ],
};

// ====================================================================== ALTAR CORROMPIDO
export const ALTAR_CORROMPIDO = {
  id: "altar_corrompido", nome: "Altar Corrompido", raridade: "raro", raio: 11, alturaMax: 4, xp: 110, xpLimpo: 240, repovoar: 0,
  nivel: 14, peso: 1, espaco: 1100,
  nomes: ["Círculo do Véu", "Altar de Cinzas", "Pedras Chorosas", "Ferida de Morgath"],
  descricao: "Ritual do Véu Negro que apodrece a terra. Destrua os três cristais dos obeliscos para purificar o lugar.",
  dica: "§5O chão escurece e o ar cheira a enxofre",
  biomas: [""],
  objLimpo: "Derrotar os corrompidos",
  async plan(dim, origin, rot, rnd) {
    const p = new Plan(origin, rot, rnd);
    const prep = await prepareGround(dim, p, -11, -11, 11, 11, 12, "minecraft:dirt", (x, z) => {
      const d = Math.hypot(x, z);
      if (d <= 9) return p.pick([["minecraft:blackstone", 4], ["minecraft:soul_soil", 3], ["minecraft:basalt", 1], ["minecraft:coarse_dirt", 2]]);
      return p.pick([["minecraft:podzol", 3], ["minecraft:coarse_dirt", 3], ["minecraft:grass_block", 2]]);
    });
    // obeliscos com o cristal do ritual no topo
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 - Math.PI / 2;
      const x = Math.round(Math.cos(a) * 7);
      const z = Math.round(Math.sin(a) * 7);
      for (let y = 1; y <= 3; y++) p.set(x, y, z, y === 3 ? "minecraft:chiseled_polished_blackstone" : "minecraft:polished_blackstone_bricks");
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.set(x + dx, 1, z + dz, B.stairs("minecraft:polished_blackstone_brick_stairs", dx > 0 ? "west" : dx < 0 ? "east" : dz > 0 ? "north" : "south"));
      p.set(x, 4, z, "minecraft:amethyst_block").mark("cristal", x, 4, z); // ao alcance de quem sobe no degrau da base
      p.set(x, 5, z, B.cluster());
      // correntes de energia até o altar
      for (let t = 1; t < 6; t++) p.set(Math.round(x * (1 - t / 7)), 0, Math.round(z * (1 - t / 7)), "minecraft:crying_obsidian");
    }
    // altar central
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) p.set(x, 1, z, "minecraft:polished_blackstone");
    p.set(0, 2, 0, "minecraft:chiseled_polished_blackstone").set(0, 3, 0, ["minecraft:wither_skeleton_skull", { facing_direction: 1 }]);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.set(x, 2, z, B.soulFire());
    p.set(3, 1, 4, B.facing("minecraft:lectern", "west")).mark("ordem", 3, 1, 4);
    for (let i = 0; i < 10; i++) {
      const x = Math.round((rnd() - 0.5) * 16);
      const z = Math.round((rnd() - 0.5) * 16);
      if (Math.hypot(x, z) < 3) continue;
      p.set(x, 1, z, rnd() < 0.5 ? `${NS}:raiz_corrompida` : "minecraft:wither_rose");
    }
    p.mark("bau_purificado", 0, 1, 3);
    p.mark("onda_cristal", 4, 1, 0).mark("onda_cristal", -4, 1, 0).mark("onda_cristal", 0, 1, -4);
    for (const [x, z] of [[-5, 3], [5, 3]]) p.mark("gargula", x, 1, z);
    p.mark("cavaleiro", 0, 1, 5).mark("broto", -3, 1, -6).mark("broto", 3, 1, -6);
    p.box("area", -11, -2, -11, 11, 10, 11);
    return { plans: [prep, p], plan: p };
  },
  guards: [["gargula", `${NS}:gargula`], ["cavaleiro", `${NS}:cavaleiro_corrompido`], ["broto", `${NS}:broto_corrompido`]],
  mecanismos: [
    { k: "leitura", id: "ordem", bloco: "ordem", titulo: "Ordem do Ritual",
      texto: () => "§fPergaminho negro, letra elegante:\n\n§7\"Três cristais bebem a vida desta terra e a enviam ao Véu. " +
        "Enquanto brilharem, nada aqui crescerá. Se algum tolo partir um cristal, que os guardiões do círculo o recebam.\"\n§8- V.\n\n" +
        "§8(Quebre os três cristais de ametista no topo dos obeliscos. Cada cristal partido chama defensores.)" },
    { k: "quebrar", id: "cristais", alvos: "cristal", nome: "Cristais do ritual", obj: "Partir os três cristais do ritual", xp: 300,
      aoQuebrar: (dim, rec, n) => {
        const pts = rec.mk.onda_cristal || [];
        const pos = pts[(n - 1) % Math.max(1, pts.length)];
        if (!pos) return;
        for (const id of n >= 3 ? [`${NS}:cavaleiro_corrompido`, `${NS}:broto_corrompido`] : [`${NS}:broto_corrompido`, `${NS}:broto_corrompido`]) {
          try { dim.spawnEntity(id, top(pos)); } catch { /* */ }
        }
        sound(dim, "mob.wither.ambient", top(pos), 1.2, 0.8);
      },
      depois: { bau: "bau_purificado", tier: "altar_purificado", extra: { item: `${NS}:medalhao_purificado` }, msg: "§aA terra respira de novo: o altar foi purificado",
        fn: (dim, rec) => purify(dim, rec) } },
  ],
};
/** Purificação: a terra enegrecida volta a ser grama e musgo, em lotes. */
function purify(dim, rec) {
  const p = new Plan({ x: rec.x, y: rec.y, z: rec.z }, rec.rot, Math.random);
  const swap = { "minecraft:blackstone": "minecraft:grass_block", "minecraft:soul_soil": "minecraft:moss_block", "minecraft:basalt": "minecraft:grass_block",
    "minecraft:crying_obsidian": "minecraft:moss_block", [`${NS}:raiz_corrompida`]: "minecraft:azure_bluet", "minecraft:wither_rose": "minecraft:cornflower" };
  for (let x = -10; x <= 10; x++) for (let z = -10; z <= 10; z++) for (const y of [0, 1]) {
    const w = p.world(x, y, z);
    let id;
    try { id = dim.getBlock(w)?.typeId; } catch { continue; }
    if (id && swap[id]) p.set(x, y, z, swap[id]);
  }
  build(dim, p, 120).then(() => particle(dim, "sagrado_explosao", { x: rec.x + 0.5, y: rec.y + 2, z: rec.z + 0.5 }, { radius: 4 }));
}

// ====================================================================== COFRE DOS REIS ESQUECIDOS (lendário)
const CF = -16;
const COFRE_ALAV = { k: "sequencia", id: "coroas", input: "lever", n: 4, entradas: "alavanca", porta: "porta_coroas", leitor: "cronica_reis",
  nome: "As quatro coroas", tituloPista: "Crônica dos Quatro Reis", falha: "dardos", obj: "Decifrar a Crônica dos Quatro Reis", xp: 350,
  prologo: "§8Placas de ouro narram a ordem em que os quatro reis subiram ao trono:§r" };
const COFRE_SINOS = { k: "sequencia", id: "sinos", input: "bell", n: 4, entradas: "sino", porta: "porta_sinos", leitor: "salmo",
  nome: "Os sinos do luto", tituloPista: "Salmo do Funeral Real", falha: "despertar", guardioes: "onda_sinos", mob: "minecraft:wither_skeleton",
  obj: "Tocar o Salmo do Funeral Real", xp: 400, prologo: "§8O salmo cantado no enterro dos reis, gravado sobre os sinos:§r" };
export const COFRE_REIS = {
  id: "cofre_reis", nome: "Cofre dos Reis Esquecidos", raridade: "lendario", raio: 9, alcance: 30, alturaMax: 5, minY: 35, xp: 300,
  xpLimpo: 500, repovoar: 180, nivel: 18, peso: 0, espaco: 2000, distGen: 46,
  nomes: ["Cofre dos Reis Esquecidos"],
  descricao: "A tumba-tesouro dos quatro reis anteriores à Ruptura. Duas provas de enigma, a Galeria das Chamas, o Rei Esquecido e a Câmara Real.",
  dica: "§6Um zigurate de pedra e ouro emerge da terra",
  biomas: [""],
  objLimpo: "Silenciar a guarda dos mortos",
  async plan(dim, origin, rot, rnd, seed) {
    const p = new Plan(origin, rot, rnd);
    const prep = await prepareGround(dim, p, -9, -9, 9, 9, 14, "minecraft:dirt", (x, z) => (Math.max(Math.abs(x), Math.abs(z)) <= 7 ? "minecraft:stone_bricks" : grassy(p)));
    // zigurate em três degraus com detalhes de ouro
    for (let t = 0; t < 3; t++) {
      const r = 7 - t * 2;
      for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
        if (Math.abs(x) <= 2 && z >= 2) continue; // frente aberta até a escadaria (que passa por baixo dos degraus)
        p.set(x, 1 + t, z, (Math.abs(x) === r || Math.abs(z) === r) && (x + z) % 4 === 0 ? "minecraft:gold_block" : "minecraft:chiseled_stone_bricks");
      }
    }
    for (const [x, z] of [[-3, -3], [3, -3]]) { p.set(x, 4, z, "minecraft:gold_block").set(x, 5, z, B.fire("minecraft:soul_campfire")); }
    const wall = "minecraft:polished_blackstone_bricks";
    const zEnd = stairway(p, 2, CF, wall, "minecraft:polished_blackstone_brick_stairs");
    // 1) salão das estátuas (alavancas sobre as cores das coroas)
    p.room(-9, CF, -26, 9, CF + 7, zEnd + 1, wall, "minecraft:polished_blackstone");
    stairFoot(p, zEnd, CF, "minecraft:polished_blackstone_brick_stairs");
    // ossário secreto (botão sob a estátua do quarto rei): a sala vem antes para não cobrir a pedra do botão
    p.room(9, CF, -24, 16, CF + 4, -16, "minecraft:bone_block", "minecraft:soul_soil");
    p.set(9, CF + 2, -21, "minecraft:polished_blackstone").set(8, CF + 2, -21, B.button("west", "minecraft:polished_blackstone_button"));
    p.mark("botao_ossario", 8, CF + 2, -21);
    for (let y = CF + 1; y <= CF + 2; y++) p.set(9, y, -19, "minecraft:polished_blackstone_bricks").mark("passagem_ossario", 9, y, -19);
    p.chest(15, CF + 1, -20, "west", "cofre_ossario");
    for (const [x, z] of [[11, -23], [14, -17], [12, -17]]) p.set(x, CF + 1, z, "minecraft:skeleton_skull");
    p.box("sala_ossario", 10, CF + 1, -23, 15, CF + 3, -17);
    const s1 = symbolsFor(seed, COFRE_ALAV);
    [-6, -2, 2, 6].forEach((x, i) => {
      for (let y = CF + 1; y <= CF + 3; y++) p.set(x, y, -25, y === CF + 3 ? "minecraft:gold_block" : "minecraft:chiseled_stone_bricks");
      p.set(x, CF + 4, -25, "minecraft:skeleton_skull");
      p.set(x, CF + 1, -23, s1[i].bloco).set(x, CF + 2, -23, B.lever("x"));
      p.mark("alavanca", x, CF + 2, -23);
    });
    p.set(0, CF + 1, -20, B.facing("minecraft:lectern", "south")).mark("cronica_reis", 0, CF + 1, -20);
    // porta das coroas no lado oeste do salão leva à galeria
    p.room(-9, CF, -40, 9, CF + 6, -26, wall, "minecraft:polished_blackstone");
    gateWall(p, "porta_coroas", -26, CF, 1, 3, "minecraft:gilded_blackstone");
    // 2) galeria das chamas: bocais visíveis nas paredes, placas no chão
    for (let z = -28; z >= -38; z -= 2) {
      for (const x of [-9, 9]) p.set(x, CF + 2, z, `${NS}:bocal_chamas`);
      for (const x of [-4, 0, 4]) if ((z / 2 + x) % 3 !== 0) p.set(x, CF + 1, z, B.plate("minecraft:polished_blackstone_pressure_plate")).mark("placa_chama", x, CF + 1, z);
    }
    for (let z = -28; z >= -38; z -= 4) for (const x of [-6, 6]) p.set(x, CF + 5, z, B.lantern("minecraft:soul_lantern", true));
    // 3) câmara dos sinos
    p.room(-8, CF, -54, 8, CF + 7, -40, wall, "minecraft:gilded_blackstone");
    for (let x = -1; x <= 1; x++) for (let y = CF + 1; y <= CF + 3; y++) p.set(x, y, -40, AIR);
    const s2 = symbolsFor(seed, COFRE_SINOS);
    [[-5, -44], [5, -44], [-5, -50], [5, -50]].forEach(([x, z], i) => { p.set(x, CF + 1, z, s2[i].bloco).set(x, CF + 2, z, B.bell()).mark("sino", x, CF + 2, z); });
    p.set(0, CF + 1, -42, B.facing("minecraft:lectern", "south")).mark("salmo", 0, CF + 1, -42);
    p.mark("onda_sinos", -3, CF + 1, -47).mark("onda_sinos", 3, CF + 1, -47);
    // 4) trono do Rei Esquecido (o portão dos sinos é a passagem entre as duas salas)
    p.room(-10, CF, -72, 10, CF + 9, -54, wall, "minecraft:polished_blackstone");
    gateWall(p, "porta_sinos", -54, CF, 1, 3, "minecraft:chiseled_polished_blackstone");
    for (const [x, z] of [[-7, -58], [7, -58], [-7, -67], [7, -67]]) for (let y = CF + 1; y <= CF + 8; y++) p.set(x, y, z, y % 4 === 0 ? "minecraft:gold_block" : "minecraft:chiseled_polished_blackstone");
    p.set(0, CF + 1, -69, B.stairs("minecraft:polished_blackstone_brick_stairs", "south")).set(0, CF + 2, -70, "minecraft:gold_block");
    p.mark("rei", 0, CF + 1, -64);
    p.box("sala_trono", -9, CF + 1, -71, 9, CF + 8, -55);
    // 5) câmara real (portão selado)
    p.room(-6, CF, -82, 6, CF + 6, -72, "minecraft:gold_block", "minecraft:gilded_blackstone");
    gateWall(p, "porta_real", -72, CF, 1, 3, `${NS}:portao_selado`);
    p.chest(0, CF + 1, -80, "south", "cofre_reis", { item: `${NS}:coroa_reis_esquecidos`, lore: "testamento_reis" });
    p.chest(-3, CF + 1, -79, "east", "cofre_reis");
    p.chest(3, CF + 1, -79, "west", "cofre_reis");
    for (const [x, z] of [[-4, -75], [4, -75], [-4, -81], [4, -81]]) p.set(x, CF + 1, z, B.candle(4, "minecraft:yellow_candle"));
    for (const [x, z] of [[-4, -15], [4, -15], [-5, -33], [5, -33], [0, -47]]) p.mark("morto", x, CF + 1, z);
    p.box("area", -10, CF - 1, -82, 16, 7, 9);
    return { plans: [prep, p], plan: p };
  },
  guards: [["morto", "minecraft:wither_skeleton"]],
  mecanismos: [
    COFRE_ALAV,
    { k: "armadilha", id: "chamas", placas: "placa_chama", tipo: "chamas", dano: 7, raio: 2, atraso: 10 },
    COFRE_SINOS,
    { k: "guardiao", id: "rei", ponto: "rei", sala: "sala_trono", requer: "sinos", tipo: `${NS}:cavaleiro_corrompido`, nome: "Aldemar, o Rei Esquecido",
      nivel: 5, subtitulo: "ergue-se do trono", obj: "Derrotar o Rei Esquecido", xp: 700, som: "mob.wither.spawn",
      solta: [[`${NS}:chave_antiga`, 1], [`${NS}:fragmento_alma`, 2]] },
    { k: "chave", id: "camara", porta: "porta_real", obj: "Abrir a Câmara Real", xp: 400, dica: "O Rei Esquecido a carrega." },
    { k: "segredo", id: "ossario", gatilho: "botao_ossario", porta: "passagem_ossario", sala: "sala_ossario", obj: "Descobrir o ossário escondido",
      nome: "O ossário dos servos", xp: 200 },
  ],
};

export const RARAS = [TEMPLO_RUNICO, BOSQUE, ALTAR_CORROMPIDO, COFRE_REIS];
