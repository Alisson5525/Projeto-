// Descobertas comuns: locais pequenos e frequentes, cada um com uma atividade própria (segredo com pista, resgate, bênção, ritual noturno).
import { system } from "@minecraft/server";
import { NS, V, ok, say } from "../core/util.js";
import { particle, psound } from "../core/fx.js";
import { Plan, B, prepareGround } from "./builder.js";
import { gableRoof, smallTree } from "./arch.js";
import { addCoins } from "../npc/economy.js";
import { addXP } from "../rpg/progression.js";
import { mechDone, mstate } from "../exploration/mechanisms.js";
import { revealRumor } from "../exploration/rumors.js";
import { saveSite } from "./registry.js";

const AIR = "minecraft:air";
const grassy = (p) => p.pick([["minecraft:grass_block", 8], ["minecraft:coarse_dirt", 2], ["minecraft:gravel", 1]]);

// ====================================================================== RUÍNAS DO POSTO DE VIGIA
export const RUINA_VIGIA = {
  id: "ruina_vigia", nome: "Ruínas do Posto de Vigia", raridade: "comum", raio: 9, alturaMax: 4, xp: 45, xpLimpo: 120, repovoar: 45,
  nivel: 1, peso: 5, espaco: 300,
  nomes: ["Posto de Vigia de Brom", "Posto da Encruzilhada", "Vigia do Vale Cinzento", "Posto do Corvo"],
  descricao: "Muralha partida e o toco de uma torre de vigia. O relatório do sargento fala de um soldo escondido sob a torre.",
  dica: "§7Restos de uma muralha despontam no mato",
  biomas: [""],
  objLimpo: "Expulsar os saqueadores",
  async plan(dim, origin, rot, rnd) {
    const p = new Plan(origin, rot, rnd);
    const prep = await prepareGround(dim, p, -9, -9, 9, 9, 12, "minecraft:dirt", (x, z) =>
      Math.abs(x) <= 6 && Math.abs(z) <= 6 ? p.pick([["minecraft:cobblestone", 3], ["minecraft:mossy_cobblestone", 2], ["minecraft:coarse_dirt", 2], ["minecraft:gravel", 1]]) : grassy(p));
    const stone = () => p.pick([["minecraft:stone_bricks", 4], ["minecraft:mossy_stone_bricks", 4], ["minecraft:cracked_stone_bricks", 2], ["minecraft:cobblestone", 1]]);
    // muralha baixa e partida (altura variável, falhas)
    for (let i = -6; i <= 6; i++) {
      for (const [x, z] of [[i, -6], [i, 6], [-6, i], [6, i]]) {
        if (z === 6 && Math.abs(x) <= 1) continue; // entrada
        if (rnd() < 0.12) continue;
        const h = 1 + Math.floor(rnd() * 3) + (Math.abs(i) === 6 ? 1 : 0);
        for (let y = 1; y <= h; y++) p.set(x, y, z, stone());
      }
    }
    // toco da torre (5x5) no canto noroeste, com a pedra lisa entre as musgosas
    for (let y = 1; y <= 6; y++) {
      for (let x = -6; x <= -2; x++) {
        for (let z = -6; z <= -2; z++) {
          const edge = x === -6 || x === -2 || z === -6 || z === -2;
          if (!edge) { p.set(x, y, z, AIR); continue; }
          if (y > 4 && rnd() < 0.45) continue;
          p.set(x, y, z, y <= 3 ? "minecraft:mossy_stone_bricks" : stone());
        }
      }
    }
    p.set(-4, 1, -2, AIR).set(-4, 2, -2, AIR); // porta da torre
    p.set(-4, 0, -4, "minecraft:cracked_stone_bricks"); // laje que cobre o porão
    p.set(-3, 2, -6, "minecraft:stone"); // a "pedra lisa"
    p.set(-3, 2, -5, B.button("south")); // botão discreto preso à pedra lisa
    // porão secreto sob a torre
    p.room(-6, -5, -6, -2, -1, -2, "minecraft:cobblestone", "minecraft:spruce_planks");
    p.set(-4, -1, -4, AIR).set(-4, -2, -4, AIR).set(-4, -3, -4, AIR).set(-4, -4, -4, AIR);
    for (let y = -4; y <= -1; y++) p.set(-4, y, -5, "minecraft:cobblestone");
    for (let y = -4; y <= 0; y++) p.set(-4, y, -4, y === 0 ? "minecraft:cracked_stone_bricks" : B.ladder("south"));
    p.chest(-3, -4, -3, "west", "vigia_segredo", { lore: "soldo_brom" });
    p.set(-5, -4, -3, B.barrel()).set(-5, -4, -5, B.lantern("minecraft:lantern"));
    p.box("sala_porao", -5, -4, -5, -3, -2, -3);
    p.mark("botao", -3, 2, -5).mark("laje", -4, 0, -4);
    // pátio: fogueira apagada, carroça tombada, armeiro
    p.set(1, 1, 1, B.deadFire());
    for (const [x, z] of [[0, 1], [2, 1], [1, 0], [1, 2]]) p.set(x, 0, z, "minecraft:cobblestone");
    p.set(3, 1, -3, B.log("minecraft:spruce_log", "x")).set(4, 1, -3, B.log("minecraft:spruce_log", "x"));
    p.set(3, 2, -3, B.slab("minecraft:spruce_slab")).set(4, 1, -4, B.barrel()).set(2, 1, -4, "minecraft:hay_block");
    for (const x of [3, 4]) p.set(x, 1, 3, B.fence("minecraft:spruce_fence", false, true));
    p.set(3, 2, 3, "minecraft:skeleton_skull").set(-2, 1, 3, B.lantern());
    p.set(0, 1, -4, B.facing("minecraft:lectern", "south"));
    p.mark("relatorio", 0, 1, -4);
    p.chest(4, 1, 1, "west", "vigia");
    for (const [x, z] of [[2, -1], [-1, 2], [3, 0]]) p.mark("saqueador", x, 1, z);
    p.box("area", -9, -6, -9, 9, 8, 9);
    return { plans: [prep, p], plan: p };
  },
  guards: [["saqueador", `${NS}:goblin`]],
  mecanismos: [
    { k: "leitura", id: "relatorio", bloco: "relatorio", titulo: "Relatório do Sargento Brom", obj: "Ler o relatório do sargento",
      texto: () => "§8Folhas úmidas presas ao atril:\n\n§f\"Terceiro dia sem reforços. Se os saqueadores voltarem, o soldo da guarnição está a salvo: " +
        "desci com ele para o porão da torre. A laje rachada só cede por baixo... ou quando alguém pressiona a §epedra lisa§f, " +
        "a única que não tem musgo na parede de dentro.\"\n\n§7- Sgt. Brom, Posto de Vigia" },
    { k: "segredo", id: "porao", gatilho: "botao", porta: "laje", sala: "sala_porao", obj: "Encontrar o porão escondido", nome: "O porão do sargento", xp: 70 },
  ],
};

// ====================================================================== ACAMPAMENTO DE SALTEADORES
export const SALTEADORES = {
  id: "salteadores", nome: "Acampamento de Salteadores", raridade: "comum", raio: 11, alturaMax: 4, xp: 50, xpLimpo: 160, repovoar: 50,
  nivel: 4, peso: 4, espaco: 380,
  nomes: ["Covil dos Mãos-Leves", "Acampamento do Caolho", "Pouso dos Salteadores", "Clareira da Faca Torta"],
  descricao: "Salteadores humanos montaram tendas sobre a carga de uma caravana roubada. Há alguém preso na jaula.",
  dica: "§7Fumaça e risadas ásperas vêm da mata",
  biomas: ["forest", "plains", "taiga", "savanna", "birch", "meadow", "dark_forest", "roofed", "windswept", "grove"],
  objLimpo: "Derrotar os salteadores",
  async plan(dim, origin, rot, rnd) {
    const p = new Plan(origin, rot, rnd);
    const prep = await prepareGround(dim, p, -11, -11, 11, 11, 12, "minecraft:dirt", (x, z) =>
      Math.hypot(x, z) < 8 ? p.pick([["minecraft:coarse_dirt", 4], ["minecraft:podzol", 2], ["minecraft:grass_path", 1]]) : grassy(p));
    // duas tendas de lona
    const tent = (cx, cz, wool) => {
      for (let z = cz - 2; z <= cz + 2; z++) {
        for (let lv = 0; lv <= 2; lv++) {
          const off = 2 - lv;
          p.set(cx - off, 1 + lv, z, wool).set(cx + off, 1 + lv, z, wool);
          if (z === cz - 2) for (let x = cx - off; x <= cx + off; x++) p.set(x, 1 + lv, z, wool);
        }
      }
      p.set(cx, 4, cz - 2, B.fence("minecraft:oak_fence")).set(cx, 4, cz + 2, B.fence("minecraft:oak_fence"));
      p.set(cx, 1, cz - 1, "minecraft:white_carpet");
    };
    tent(-6, -4, "minecraft:white_wool");
    tent(6, -4, "minecraft:brown_wool");
    // carroça roubada (rodas de alçapão, carga de barris)
    for (let x = -2; x <= 2; x++) for (let z = 4; z <= 6; z++) p.set(x, 1, z, B.slab("minecraft:spruce_slab", true));
    for (const x of [-2, 2]) for (const z of [4, 6]) p.set(x, 1, z, B.log("minecraft:stripped_spruce_log", "x"));
    p.set(-1, 2, 5, B.barrel()).set(0, 2, 5, B.barrel()).set(1, 2, 4, "minecraft:hay_block").set(0, 2, 4, B.log("minecraft:hay_block"));
    p.chest(1, 2, 6, "north", "salteadores", { lore: "lista_saque" });
    // fogueira com espeto
    p.set(0, 1, -1, B.fire());
    p.set(-1, 1, -1, B.fence("minecraft:spruce_fence")).set(1, 1, -1, B.fence("minecraft:spruce_fence"));
    p.set(-1, 2, -1, B.slab("minecraft:spruce_slab")).set(1, 2, -1, B.slab("minecraft:spruce_slab"));
    for (const [x, z] of [[-3, 0], [3, 0]]) p.set(x, 1, z, B.log("minecraft:oak_log", "z"));
    // jaula de ferro com alavanca do lado de fora
    for (let y = 1; y <= 3; y++) {
      for (const [x, z] of [[-9, 1], [-8, 1], [-7, 1], [-9, 3], [-7, 3], [-9, 2], [-7, 2], [-8, 3]]) p.set(x, y, z, B.bars(true, true));
    }
    for (let x = -9; x <= -7; x++) for (let z = 1; z <= 3; z++) p.set(x, 4, z, B.slab("minecraft:spruce_slab"));
    p.set(-8, 2, 2, AIR).set(-8, 1, 2, AIR);
    p.set(-6, 1, 0, "minecraft:spruce_planks").set(-6, 2, 0, B.wallLever("up_north_south"));
    p.mark("alavanca_jaula", -6, 2, 0);
    p.mark("grade_jaula", -8, 1, 3).mark("grade_jaula", -8, 2, 3);
    p.mark("cativo", -8, 1, 2);
    p.box("sala_jaula", -9, 1, 1, -7, 3, 3);
    // baú do chefe dentro da tenda leste
    p.chest(6, 1, -5, "south", "salteadores_chefe");
    for (const [x, z] of [[-3, 3], [3, 2], [-4, -1], [4, 1]]) p.mark("salteador", x, 1, z);
    p.mark("besteiro", 6, 1, -2).mark("besteiro", -6, 1, -2);
    p.mark("chefe_salt", 6, 1, -3);
    p.box("sala_tenda", 4, 1, -6, 8, 3, -2);
    p.box("area", -11, -2, -11, 11, 8, 11);
    return { plans: [prep, p], plan: p };
  },
  guards: [["salteador", "minecraft:vindicator"], ["besteiro", "minecraft:pillager"]],
  mecanismos: [
    { k: "guardiao", id: "chefe", ponto: "chefe_salt", sala: "sala_tenda", tipo: "minecraft:vindicator", nome: "Varg Caolho", nivel: 2,
      subtitulo: "o chefe dos salteadores", obj: "Derrotar Varg Caolho", xp: 120, solta: [[`${NS}:moeda_ouro`, 12]] },
    { k: "segredo", id: "jaula", gatilho: "alavanca_jaula", porta: "grade_jaula", sala: "sala_jaula", obj: "Libertar o prisioneiro",
      nome: "O cativo agradece", xp: 60 },
  ],
  afterBuild(rec) {
    rec.m.cativo = 0;
  },
  /** O cativo aparece quando alguém se aproxima e, depois de libertado, conta um rumor e vai embora. */
  tick(dim, rec, players) {
    const pos = rec.mk.cativo?.[0];
    if (!pos) return;
    const tag = `vc_${rec.id}`;
    const free = mechDone(rec, "jaula") || !!rec.m?.mec?.jaula?.aberto;
    const st = mstate(rec, "cativo");
    if (st.foi) return;
    const list = dim.getEntities({ tags: [tag] });
    if (!list.length) {
      if (!players.some((p) => V.dist(p.location, pos) < 28)) return;
      try {
        const e = dim.spawnEntity(`${NS}:prisioneiro`, { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 }, { initialPersistence: true });
        e.setProperty(`${NS}:oficio`, 11);
        e.addTag(tag);
        e.addTag("valdoria_cativo");
        e.setDynamicProperty(`${NS}:local`, rec.id);
        e.nameTag = "§fMercador Odo\n§7Cativo";
      } catch { /* */ }
      return;
    }
    if (!free) return;
    const e = list[0];
    const p = players.find((q) => V.dist(q.location, e.location) < 6);
    if (!p) return;
    st.foi = true;
    saveSite(rec);
    particle(dim, "nivel_anel", e.location, {});
    psound(p, "mob.villager.yes", 1.1, 1);
    say(p, "§f\"Pelos deuses, obrigado! Esses ratos levaram minha caravana inteira. Não tenho muito, mas tome isto... " +
      "e ouça: antes de me prenderem, vi luzes estranhas numa ruína ao longe. Marquei no seu mapa.\" §7- Mercador Odo");
    addCoins(p, 25, "recompensa do mercador");
    addXP(p, 60, "resgate");
    revealRumor(p, { motivo: "o mercador Odo" });
    system.runTimeout(() => {
      if (!ok(e)) return;
      particle(dim, "poeira", e.location, {});
      e.remove();
    }, 60);
  },
};

// ====================================================================== SANTUÁRIO À BEIRA DA ESTRADA
export const SANTUARIO_ESTRADA = {
  id: "santuario_estrada", nome: "Santuário à Beira da Estrada", raridade: "comum", raio: 6, alturaMax: 3, xp: 35, limpeza: false,
  nivel: 1, peso: 3, espaco: 420,
  nomes: ["Santuário de Santa Ilsa", "Capela do Peregrino", "Altar da Encruzilhada", "Ermida do Viajante"],
  descricao: "Pequena capela de peregrinos. Uma oferenda de pão ou ouro no altar concede a bênção da estrada (uma vez por dia).",
  dica: "§eUm sino de capela soa ao longe",
  biomas: [""],
  async plan(dim, origin, rot, rnd) {
    const p = new Plan(origin, rot, rnd);
    const prep = await prepareGround(dim, p, -6, -6, 6, 6, 10, "minecraft:dirt", (x, z) =>
      Math.abs(x) <= 1 && z >= 0 ? "minecraft:grass_path" : Math.abs(x) <= 3 && Math.abs(z) <= 3 ? "minecraft:stone_bricks" : grassy(p));
    // capela 5x5 de pedra calcária com telhado de duas águas
    for (let y = 1; y <= 3; y++) {
      for (let x = -2; x <= 2; x++) {
        for (let z = -3; z <= 1; z++) {
          const edge = Math.abs(x) === 2 || z === -3 || z === 1;
          p.set(x, y, z, edge ? (Math.abs(x) === 2 && (z === -3 || z === 1) ? B.log("minecraft:stripped_oak_log") : "minecraft:calcite") : AIR);
        }
      }
    }
    p.set(0, 1, 1, AIR).set(0, 2, 1, AIR).set(-2, 2, -1, B.fence("minecraft:glass_pane", true, false)).set(2, 2, -1, B.fence("minecraft:glass_pane", true, false));
    gableRoof(p, -2, -3, 2, 1, 4, { stairs: "minecraft:spruce_stairs", slab: "minecraft:spruce_slab", gable: "minecraft:calcite", axis: "z" });
    p.set(0, 7, 1, B.lantern("minecraft:lantern"));
    // altar de oferendas, velas e o sino
    p.set(0, 1, -2, "minecraft:chiseled_quartz_block").set(-1, 1, -2, B.candle(2, "minecraft:white_candle")).set(1, 1, -2, B.candle(3, "minecraft:white_candle"));
    p.set(0, 2, -2, B.candle(1, "minecraft:yellow_candle"));
    p.mark("altar", 0, 1, -2);
    p.set(-1, 1, 0, B.stairs("minecraft:oak_stairs", "north")).set(1, 1, 0, B.stairs("minecraft:oak_stairs", "north"));
    p.set(2, 1, 3, "minecraft:stone_bricks").set(2, 2, 3, B.bell());
    p.set(-3, 1, 3, B.fence("minecraft:oak_fence")).set(-3, 2, 3, B.lantern());
    for (const [x, z] of [[-3, -3], [3, -2], [-4, 1]]) p.set(x, 1, z, p.pick([["minecraft:poppy", 1], ["minecraft:cornflower", 1], ["minecraft:oxeye_daisy", 1]]));
    p.set(-1, 1, -1, B.facing("minecraft:lectern", "south"));
    p.mark("placa", -1, 1, -1);
    p.box("area", -6, -1, -6, 6, 8, 6);
    return { plans: [prep, p], plan: p };
  },
  mecanismos: [
    { k: "altar", id: "altar", bloco: "altar", pede: "Deixe um pão (segure-o e use o altar) como oferenda.", item: "minecraft:bread",
      obj: "Receber a bênção da estrada",
      bencao: { nome: "Bênção da Estrada", seg: 600, mods: { agi: 3, regen: 0.2, dr: 0.04 }, efeitos: [["speed", 0]] } },
    { k: "leitura", id: "placa", bloco: "placa", titulo: "Livro dos Peregrinos",
      texto: () => "§fNomes riscados por mil mãos:\n\n§7\"Que a estrada seja leve.\" - Mira de Pedravale\n\"Voltei vivo da Cripta. Agradeço.\" - Bertram\n" +
        "\"Um pão por uma bênção: Santa Ilsa nunca pediu mais que isso.\"\n\n§8(Deixe um pão no altar para receber a Bênção da Estrada uma vez por dia.)" },
  ],
};

// ====================================================================== CEMITÉRIO ABANDONADO
export const CEMITERIO = {
  id: "cemiterio", nome: "Cemitério Abandonado", raridade: "comum", raio: 10, alturaMax: 3, xp: 50, limpeza: false,
  nivel: 3, peso: 3, espaco: 420,
  nomes: ["Campo dos Esquecidos", "Cemitério de Velha Ravena", "Colina das Lápides", "Cemitério dos Corvos"],
  descricao: "Lápides tortas e um mausoléu. À noite os mortos se levantam; o epitáfio do coveiro indica um túmulo com tesouro.",
  dica: "§8Um sino de finados ecoa entre as lápides",
  biomas: ["plains", "forest", "taiga", "birch", "meadow", "dark_forest", "roofed", "swamp", "grove", "windswept", "pale"],
  async plan(dim, origin, rot, rnd) {
    const p = new Plan(origin, rot, rnd);
    const prep = await prepareGround(dim, p, -10, -10, 10, 10, 10, "minecraft:dirt", (x, z) =>
      Math.abs(x) <= 1 ? "minecraft:gravel" : p.pick([["minecraft:podzol", 3], ["minecraft:coarse_dirt", 3], ["minecraft:grass_block", 4], ["minecraft:mycelium", 1]]));
    // cerca de ferro torta
    for (let i = -8; i <= 8; i++) {
      for (const [x, z] of [[i, -8], [i, 8], [-8, i], [8, i]]) {
        if (z === 8 && Math.abs(x) <= 1) continue;
        if (rnd() < 0.15) continue;
        p.set(x, 1, z, B.bars(Math.abs(x) === 8, Math.abs(z) === 8));
      }
    }
    for (const x of [-2, 2]) { p.set(x, 1, 8, "minecraft:mossy_stone_bricks").set(x, 2, 8, "minecraft:mossy_stone_bricks").set(x, 3, 8, B.lantern("minecraft:soul_lantern")); }
    // lápides em fileiras: cada uma com velas; o túmulo marcado é o que tem a TERCEIRA vela apagada
    const graves = [];
    for (const z of [-3, 1, 5]) for (const x of [-6, -4, 4, 6]) graves.push([x, z]);
    const marked = Math.floor(rnd() * graves.length);
    graves.forEach(([x, z], i) => {
      p.set(x, 1, z - 1, p.pick([["minecraft:mossy_cobblestone_wall", 2], ["minecraft:cobblestone_wall", 2], ["minecraft:stone_brick_wall", 1]]));
      p.set(x, 0, z, "minecraft:coarse_dirt");
      p.set(x, 1, z, i === marked ? B.candleOff(3) : rnd() < 0.5 ? B.candle(3) : B.candle(2));
      if (i === marked) {
        // cova rasa: a terra com raízes cede para um poço com escada até a câmara do coveiro
        p.room(x - 2, -5, z - 2, x + 2, -1, z + 2, "minecraft:mossy_cobblestone", "minecraft:coarse_dirt");
        for (let y = -4; y <= -1; y++) p.set(x, y, z - 1, "minecraft:mossy_cobblestone").set(x, y, z, B.ladder("south"));
        p.set(x, 0, z, "minecraft:dirt_with_roots");
        p.mark("tumulo", x, 0, z);
        p.chest(x + 1, -4, z + 1, "west", "cemiterio_tumulo", { lore: "diario_ossian" });
        p.set(x - 1, -4, z + 1, "minecraft:skeleton_skull").set(x - 1, -3, z - 1, B.lantern("minecraft:soul_lantern"));
        p.box("sala_tumulo", x - 1, -4, z - 1, x + 1, -2, z + 1);
      }
    });
    // mausoléu do coveiro com o epitáfio
    for (let y = 1; y <= 4; y++) {
      for (let x = -2; x <= 2; x++) {
        for (let z = -8; z <= -5; z++) {
          const edge = Math.abs(x) === 2 || z === -8 || z === -5;
          p.set(x, y, z, edge ? p.pick([["minecraft:polished_andesite", 3], ["minecraft:andesite", 1]]) : AIR);
        }
      }
    }
    for (let x = -3; x <= 3; x++) for (let z = -9; z <= -4; z++) p.set(x, 5, z, B.slab("minecraft:andesite_slab"));
    p.set(0, 1, -5, AIR).set(0, 2, -5, AIR).set(0, 1, -7, B.facing("minecraft:lectern", "south"));
    p.set(-1, 1, -7, B.candle(2)).set(1, 1, -7, B.candle(2));
    p.mark("epitafio", 0, 1, -7);
    p.set(-7, 1, -6, "minecraft:stone").set(-7, 2, -6, B.bell());
    smallTree(p, 7, -6, 4);
    for (const [x, z] of [[-6, 7], [5, -1], [-3, 3]]) p.set(x, 1, z, "minecraft:skeleton_skull");
    for (const [x, z] of [[-5, -1], [5, 3], [-5, 5], [0, 3], [5, 7], [-6, 3]]) p.mark("cova", x, 1, z);
    p.box("sala_cemiterio", -8, 0, -8, 8, 4, 8);
    p.box("area", -10, -5, -10, 10, 8, 10);
    return { plans: [prep, p], plan: p };
  },
  mecanismos: [
    { k: "leitura", id: "epitafio", bloco: "epitafio", titulo: "Epitáfio do Coveiro",
      texto: () => "§fGravado na pedra do mausoléu:\n\n§7\"Aqui jaz Ossian, coveiro por quarenta invernos.\n" +
        "Guardei para mim o que os ricos levaram para a cova.\nAcendi três velas em cada túmulo, menos em um:\n" +
        "onde a terceira chama não arde, a terra é fofa.\"\n\n§8(Procure a lápide com a vela apagada e cave a terra com raízes diante dela.)" },
    { k: "segredo", id: "tumulo", porta: "tumulo", sala: "sala_tumulo", obj: "Encontrar o túmulo do coveiro", nome: "O tesouro de Ossian", xp: 70 },
    { k: "ondas", id: "despertar", sala: "sala_cemiterio", pontos: "cova", noite: true, obj: "Sobreviver à noite dos mortos", titulo: "§8Os mortos se levantam!",
      vitoria: "O cemitério volta ao silêncio", xp: 140,
      ondas: [[["minecraft:zombie", 3], ["minecraft:skeleton", 1]], [["minecraft:skeleton", 2], [`${NS}:espectro`, 1], ["minecraft:zombie", 2]],
        [[`${NS}:espectro`, 2], ["minecraft:stray", 2]]] },
  ],
};

export const COMUNS = [RUINA_VIGIA, SALTEADORES, SANTUARIO_ESTRADA, CEMITERIO];
