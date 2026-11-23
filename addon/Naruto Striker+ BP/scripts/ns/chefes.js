// Diretor de combate dos chefes (Naruto Striker+ - Edição Definitiva).
//
// Cada chefe recebe:
//  - FASES por porcentagem de vida, com anuncio, mudanca de ritmo e habilidades novas;
//  - ATAQUES TELEGRAFADOS: a area de impacto e marcada no chao antes do golpe, entao
//    o jogador pode esquivar (dash, kawarimi, correr) em vez de apenas trocar dano;
//  - MECANICAS PROPRIAS (genjutsu do Itachi so pega quem olha nos olhos dele, escudo de
//    areia do Gaara bloqueia golpes frontais, Kisame drena chakra, Bijudama carregada...);
//  - POSTURA: uma sequencia de golpes rapidos atordoa o chefe e abre uma janela de dano.
//
// Os ataques originais definidos nos JSON das entidades continuam funcionando; este
// diretor so adiciona decisoes por cima, com ritmo controlado para nao sobrecarregar.
import { world, system } from "@minecraft/server";
import { ehJogador, valido, particula, somArea, tremer, aleatorio, lerScore, somarScore, msg } from "./util";
import { textoFlutuante } from "./combate";
import { empurrar } from "../lib/fisica.js";

/* ------------------------------------------------------------------ */
/* Utilitarios geometricos e de efeito                                 */
/* ------------------------------------------------------------------ */
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
const distH = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const sortear = (l) => l[Math.floor(Math.random() * l.length)];

function ativo(p) {
  try {
    const m = String(p.getGameMode()).toLowerCase();
    return m !== "creative" && m !== "spectator";
  } catch {
    return true;
  }
}

function vidaDe(e) {
  try {
    const h = e.getComponent("minecraft:health");
    return h ? { atual: h.currentValue, max: h.effectiveMax, comp: h } : undefined;
  } catch {
    return undefined;
  }
}

/** Anel de aviso no chao (pixel art vermelho). Repetido a cada 4 ticks ate o impacto. */
function anelAviso(dim, centro, raio, cor = [1, 0.15, 0.1]) {
  const pontos = Math.max(8, Math.round(raio * 5));
  for (let i = 0; i < pontos; i++) {
    const a = (i / pontos) * Math.PI * 2;
    particula(dim, "tnt:ns_aviso", { x: centro.x + Math.cos(a) * raio, y: centro.y + 0.15, z: centro.z + Math.sin(a) * raio }, cor);
  }
  particula(dim, "tnt:ns_aviso", { x: centro.x, y: centro.y + 0.15, z: centro.z }, cor);
}

/** Linha de aviso entre dois pontos (investidas). */
function linhaAviso(dim, a, b, cor = [1, 0.15, 0.1]) {
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  const passos = Math.max(2, Math.round(d * 1.5));
  for (let i = 0; i <= passos; i++) {
    const t = i / passos;
    particula(dim, "tnt:ns_aviso", { x: a.x + (b.x - a.x) * t, y: Math.min(a.y, b.y) + 0.15, z: a.z + (b.z - a.z) * t }, cor);
  }
}

/** Dano em area vindo do chefe: atinge jogadores e criaturas, nunca o proprio chefe/aliados. */
function ferirArea(chefe, centro, raio, dano, extra) {
  let acertos = 0;
  try {
    const dim = chefe.dimension;
    for (const e of dim.getEntities({ location: centro, maxDistance: raio, excludeTypes: ["minecraft:item", "minecraft:xp_orb", "tnt:ns_texto"] })) {
      if (e.id === chefe.id || e.typeId === chefe.typeId) continue;
      if (!ehJogador(e)) {
        // nao atinge outros chefes nem entidades de efeito sem vida
        if (CHEFES[e.typeId] || !vidaDe(e)) continue;
      } else if (!ativo(e)) continue;
      try {
        e.applyDamage(dano, { cause: "entityAttack", damagingEntity: chefe });
        acertos++;
        if (extra) extra(e);
      } catch {}
    }
  } catch {}
  return acertos;
}

function anunciar(chefe, raio, titulo, sub, mensagem) {
  try {
    for (const p of chefe.dimension.getPlayers({ location: chefe.location, maxDistance: raio })) {
      try {
        if (titulo !== undefined) p.onScreenDisplay.setTitle(titulo, { subtitle: sub ?? "", fadeInDuration: 4, stayDuration: 36, fadeOutDuration: 10 });
        if (mensagem) msg(p, mensagem);
      } catch {}
    }
  } catch {}
}

function falar(chefe, cor, texto) {
  try {
    const c = chefe.getHeadLocation();
    textoFlutuante(chefe.dimension, { x: c.x, y: c.y + 1.1, z: c.z }, `${cor}§o"${texto}"`, 60, 0.03);
  } catch {}
}

/** Agenda um passo com validacao do chefe (evita erros se ele morrer/descarregar). */
function depois(chefe, ticks, fn) {
  system.runTimeout(() => {
    try {
      if (!valido(chefe)) return;
      const v = vidaDe(chefe);
      if (v && v.atual <= 0) return;
      fn();
    } catch {}
  }, ticks);
}

/** Marca uma area e, apos o atraso, aplica o impacto. Retorna os ticks ocupados. */
function golpeTelegrafado(chefe, centro, { raio, atraso, dano, cor, particulaImpacto, som, tremor = 0.4, extra }) {
  const dim = chefe.dimension;
  const pulsos = Math.max(1, Math.floor(atraso / 4));
  somArea(dim, "ns.chefe.aviso", centro, 0.9, 1);
  for (let i = 0; i < pulsos; i++) depois(chefe, i * 4, () => anelAviso(dim, centro, raio, cor));
  depois(chefe, atraso, () => {
    if (particulaImpacto) for (const id of [].concat(particulaImpacto)) particula(dim, id, centro);
    particula(dim, "tnt:ns_onda", { x: centro.x, y: centro.y + 0.1, z: centro.z });
    if (som) somArea(dim, som, centro, 1.2, 0.9);
    ferirArea(chefe, centro, raio, dano, extra);
    for (const p of dim.getPlayers({ location: centro, maxDistance: raio + 8 })) tremer(p, tremor, 0.4);
  });
  return atraso + 6;
}

/** Ponto do chao abaixo de uma posicao (para marcar areas mesmo com o alvo pulando). */
function chao(dim, loc) {
  try {
    for (let dy = 0; dy < 6; dy++) {
      const b = dim.getBlock({ x: Math.floor(loc.x), y: Math.floor(loc.y) - dy - 1, z: Math.floor(loc.z) });
      if (b && !b.isAir && !b.isLiquid) return { x: loc.x, y: Math.floor(loc.y) - dy, z: loc.z };
    }
  } catch {}
  return { x: loc.x, y: loc.y, z: loc.z };
}

function atras(alvo, distancia) {
  const v = alvo.getViewDirection();
  const h = Math.hypot(v.x, v.z) || 1;
  return { x: alvo.location.x - (v.x / h) * distancia, y: alvo.location.y, z: alvo.location.z - (v.z / h) * distancia };
}

function livre(dim, p) {
  try {
    const a = dim.getBlock({ x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) });
    const b = dim.getBlock({ x: Math.floor(p.x), y: Math.floor(p.y) + 1, z: Math.floor(p.z) });
    return !!a && !!b && a.isAir && b.isAir;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Habilidades reutilizaveis (parametrizadas por chefe)                 */
/* ------------------------------------------------------------------ */
const H = {
  /** Area marcada sob o alvo. */
  area: (o) => ({
    ...o,
    exec(chefe, alvo) {
      if (o.fala) falar(chefe, o.corFala ?? "§c", sortear(o.fala));
      if (o.somCarga) somArea(chefe.dimension, o.somCarga, chefe.location, 1, 1);
      return golpeTelegrafado(chefe, chao(chefe.dimension, alvo.location), o);
    },
  }),

  /** Varias areas em sequencia ao redor do alvo (chuva de espinhos, meteoros de areia). */
  rajada: (o) => ({
    ...o,
    exec(chefe, alvo) {
      if (o.fala) falar(chefe, o.corFala ?? "§c", sortear(o.fala));
      let total = 0;
      for (let i = 0; i < o.quantidade; i++) {
        depois(chefe, i * o.intervalo, () => {
          if (!valido(alvo)) return;
          const base = alvo.location;
          const c = i === 0 ? base : { x: base.x + aleatorio(-o.espalhar, o.espalhar), y: base.y, z: base.z + aleatorio(-o.espalhar, o.espalhar) };
          golpeTelegrafado(chefe, chao(chefe.dimension, c), o);
        });
        total = i * o.intervalo + o.atraso + 6;
      }
      return total;
    },
  }),

  /** Investida em linha reta ate (e atraves de) onde o alvo estava. */
  investida: (o) => ({
    ...o,
    exec(chefe, alvo) {
      const dim = chefe.dimension;
      const a = chefe.location;
      const b = alvo.location;
      const d = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const alcance = Math.min(o.alcance, d + 3);
      const fim = { x: a.x + ((b.x - a.x) / d) * alcance, y: b.y, z: a.z + ((b.z - a.z) / d) * alcance };
      if (o.fala) falar(chefe, o.corFala ?? "§c", sortear(o.fala));
      if (o.somCarga) somArea(dim, o.somCarga, a, 1, 1);
      if (o.particulaCarga) particula(dim, o.particulaCarga, chefe.getHeadLocation());
      try { chefe.addEffect("slowness", o.atraso, { amplifier: 255, showParticles: false }); } catch {}
      for (let t = 0; t < o.atraso; t += 4) depois(chefe, t, () => linhaAviso(dim, a, fim, o.cor));
      depois(chefe, o.atraso, () => {
        const passos = Math.round(alcance);
        const atingidos = new Set();
        for (let i = 1; i <= passos; i++) {
          const p = { x: a.x + ((fim.x - a.x) * i) / passos, y: a.y + ((fim.y - a.y) * i) / passos, z: a.z + ((fim.z - a.z) * i) / passos };
          if (o.rastro) particula(dim, o.rastro, { x: p.x, y: p.y + 1, z: p.z });
          for (const e of dim.getEntities({ location: p, maxDistance: o.largura })) {
            if (e.id === chefe.id || atingidos.has(e.id) || CHEFES[e.typeId]) continue;
            if (ehJogador(e) && !ativo(e)) continue;
            if (!ehJogador(e) && !vidaDe(e)) continue;
            atingidos.add(e.id);
            try { e.applyDamage(o.dano, { cause: "entityAttack", damagingEntity: chefe }); } catch {}
            if (o.extra) try { o.extra(e); } catch {}
          }
        }
        const destino = livre(dim, fim) ? fim : a;
        try { chefe.teleport(destino, { facingLocation: valido(alvo) ? alvo.location : fim }); } catch {}
        if (o.som) somArea(dim, o.som, destino, 1.2, 1);
        if (o.particulaImpacto) particula(dim, o.particulaImpacto, destino);
      });
      return o.atraso + 8;
    },
  }),

  /** Some numa nuvem e reaparece atras do alvo, golpeando apos uma breve janela de reacao. */
  emboscada: (o) => ({
    ...o,
    exec(chefe, alvo) {
      const dim = chefe.dimension;
      const destino = atras(alvo, 1.8);
      if (!livre(dim, destino)) return 0;
      particula(dim, o.particulaSumir ?? "tnt:ns_fumaca_ninja", chefe.location);
      somArea(dim, "ns.kawarimi", chefe.location, 0.9, 1.2);
      if (o.fala) falar(chefe, o.corFala ?? "§7", sortear(o.fala));
      try { chefe.teleport(destino, { facingLocation: alvo.location }); } catch { return 0; }
      particula(dim, o.particulaSumir ?? "tnt:ns_fumaca_ninja", destino);
      // aviso sonoro: o jogador tem ~0,6s para se mover
      if (ehJogador(alvo)) try { alvo.playSound("ns.chefe.aviso", { volume: 0.8, pitch: 1.3 }); } catch {}
      depois(chefe, o.reacao ?? 12, () => {
        if (!valido(alvo)) return;
        if (dist2(chefe.location, alvo.location) > 3.2 * 3.2) {
          textoFlutuante(dim, { x: alvo.location.x, y: alvo.location.y + 2.2, z: alvo.location.z }, "§a§lESQUIVOU!", 22);
          if (ehJogador(alvo)) try { alvo.playSound("ns.esquiva", { volume: 0.8 }); } catch {}
          return;
        }
        try { alvo.applyDamage(o.dano, { cause: "entityAttack", damagingEntity: chefe }); } catch {}
        particula(dim, o.particulaGolpe ?? "tnt:ns_corte", alvo.getHeadLocation());
        somArea(dim, o.som ?? "random.anvil_land", alvo.location, 0.6, 1.6);
        if (o.extra) o.extra(alvo);
        if (ehJogador(alvo)) tremer(alvo, 0.5, 0.3);
      });
      return (o.reacao ?? 12) + 8;
    },
  }),

  /** Rugido: empurra todos para longe e enfraquece. */
  rugido: (o) => ({
    ...o,
    exec(chefe) {
      const dim = chefe.dimension;
      const c = chefe.location;
      if (o.particula) particula(dim, o.particula, chefe.getHeadLocation());
      somArea(dim, o.som ?? "mob.enderdragon.growl", c, 1.6, o.pitch ?? 0.7);
      for (let t = 0; t < 12; t += 4) depois(chefe, t, () => anelAviso(dim, chao(dim, c), o.raio, [1, 0.55, 0.1]));
      depois(chefe, 12, () => {
        for (const p of dim.getPlayers({ location: c, maxDistance: o.raio })) {
          if (!ativo(p)) continue;
          const dx = p.location.x - c.x, dz = p.location.z - c.z;
          empurrar(p, dx, dz, o.forca ?? 3, 0.6);
          try { p.addEffect("weakness", o.fraqueza ?? 100, { amplifier: 0, showParticles: true }); } catch {}
          try { p.applyDamage(o.dano, { cause: "entityAttack", damagingEntity: chefe }); } catch {}
          tremer(p, 1.0, 0.8);
        }
        particula(dim, "tnt:ns_onda", { x: c.x, y: c.y + 0.1, z: c.z });
      });
      return 22;
    },
  }),
};

/* ------------------------------------------------------------------ */
/* Habilidades exclusivas                                               */
/* ------------------------------------------------------------------ */
const ESPECIAIS = {
  // Itachi: quem estiver OLHANDO para ele quando o Tsukuyomi se completa cai no genjutsu.
  tsukuyomi: {
    nome: "Tsukuyomi", cd: 360, alcance: [0, 22], peso: 3,
    exec(chefe) {
      const dim = chefe.dimension;
      falar(chefe, "§c", sortear(["Olhe nos meus olhos.", "Você está preso no meu mundo.", "Tsukuyomi."]));
      somArea(dim, "genjutsu", chefe.location, 1.2, 1);
      anunciar(chefe, 26, "", "§c§lNÃO OLHE NOS OLHOS DO ITACHI!");
      for (let t = 0; t < 30; t += 5) depois(chefe, t, () => particula(dim, "tnt:genjutsu", chefe.getHeadLocation()));
      depois(chefe, 30, () => {
        const olhos = chefe.getHeadLocation();
        for (const p of dim.getPlayers({ location: chefe.location, maxDistance: 22 })) {
          if (!ativo(p)) continue;
          const v = p.getViewDirection();
          const h = p.getHeadLocation();
          const d = { x: olhos.x - h.x, y: olhos.y - h.y, z: olhos.z - h.z };
          const n = Math.hypot(d.x, d.y, d.z) || 1;
          const olhando = (v.x * d.x + v.y * d.y + v.z * d.z) / n > 0.82;
          if (!olhando) {
            textoFlutuante(dim, { x: p.location.x, y: p.location.y + 2.2, z: p.location.z }, "§a§lRESISTIU!", 24);
            continue;
          }
          try {
            p.addEffect("blindness", 60, { amplifier: 0 });
            p.addEffect("nausea", 140, { amplifier: 0 });
            p.addEffect("slowness", 70, { amplifier: 3 });
            p.applyDamage(18, { cause: "magic", damagingEntity: chefe });
          } catch {}
          particula(dim, "tnt:genjutsu", h);
          textoFlutuante(dim, { x: p.location.x, y: p.location.y + 2.2, z: p.location.z }, "§4§lGENJUTSU!", 30);
        }
      });
      return 40;
    },
  },

  // Itachi fase final: Amaterasu - chamas negras que permanecem no chao.
  amaterasu: {
    nome: "Amaterasu", cd: 420, alcance: [0, 18], peso: 3, fase: 2,
    exec(chefe, alvo) {
      const dim = chefe.dimension;
      const c = chao(dim, alvo.location);
      falar(chefe, "§4", "Amaterasu.");
      somArea(dim, "mgk", chefe.location, 1, 0.9);
      for (let t = 0; t < 16; t += 4) depois(chefe, t, () => anelAviso(dim, c, 2.2, [0.25, 0.0, 0.3]));
      // 5 segundos de chamas: dano por pulso a quem ficar na area
      for (let t = 16; t <= 116; t += 10) {
        depois(chefe, t, () => {
          particula(dim, "tnt:amaterasu_chao", c);
          particula(dim, "tnt:amaterasu_1", { x: c.x + aleatorio(-1, 1), y: c.y + 0.3, z: c.z + aleatorio(-1, 1) });
          ferirArea(chefe, c, 2.2, 5, (e) => { try { e.setOnFire(3, true); } catch {} });
        });
      }
      return 24;
    },
  },

  // Itachi fase final: Susanoo protege por alguns segundos (resistencia alta, aura).
  susanoo: {
    nome: "Susanoo", cd: 700, alcance: [0, 40], peso: 2, fase: 2, unicaPorFase: false,
    exec(chefe) {
      const dim = chefe.dimension;
      falar(chefe, "§c", "Susanoo.");
      somArea(dim, "susanoo_2", chefe.location, 1.2, 1);
      anunciar(chefe, 30, "", "§5Susanoo ativo: §fespere ou recue!");
      try { chefe.addEffect("resistance", 120, { amplifier: 3, showParticles: false }); } catch {}
      for (let t = 0; t < 120; t += 8) depois(chefe, t, () => particula(dim, "tnt:ns_aura", chefe.location, [0.75, 0.15, 0.25]));
      return 16;
    },
  },

  // Kisame: absorve chakra de todos ao redor e se cura com ele.
  samehada: {
    nome: "Samehada: Absorção de Chakra", cd: 320, alcance: [0, 8], peso: 3,
    exec(chefe) {
      const dim = chefe.dimension;
      falar(chefe, "§9", sortear(["Samehada está com fome!", "Seu chakra é delicioso!"]));
      for (let t = 0; t < 20; t += 4) depois(chefe, t, () => anelAviso(dim, chao(dim, chefe.location), 6, [0.2, 0.4, 1]));
      depois(chefe, 20, () => {
        let total = 0;
        for (const p of dim.getPlayers({ location: chefe.location, maxDistance: 6 })) {
          if (!ativo(p)) continue;
          const tirado = Math.min(lerScore(p, "chakra"), 25);
          if (tirado > 0) somarScore(p, "chakra", -tirado);
          total += tirado;
          particula(dim, "tnt:impact_agua", p.location);
          textoFlutuante(dim, { x: p.location.x, y: p.location.y + 2.2, z: p.location.z }, `§9-${tirado} Chakra`, 26);
        }
        const v = vidaDe(chefe);
        if (v && total > 0) try { v.comp.setCurrentValue(Math.min(v.max, v.atual + total * 6)); } catch {}
        somArea(dim, "random.drink", chefe.location, 1, 0.6);
      });
      return 28;
    },
  },

  // Zabuza: Kirigakure - nevoa que cega quem esta perto e o torna invisivel.
  nevoa: {
    nome: "Kirigakure no Jutsu", cd: 500, alcance: [0, 30], peso: 2,
    exec(chefe) {
      const dim = chefe.dimension;
      falar(chefe, "§7", "Oito pontos vitais... qual eu devo cortar?");
      for (let i = 0; i < 6; i++) particula(dim, "tnt:ns_poeira", { x: chefe.location.x + aleatorio(-3, 3), y: chefe.location.y + 1, z: chefe.location.z + aleatorio(-3, 3) });
      try { chefe.addEffect("invisibility", 120, { amplifier: 0, showParticles: false }); } catch {}
      for (const p of dim.getPlayers({ location: chefe.location, maxDistance: 16 })) {
        try { if (ativo(p)) p.addEffect("darkness", 120, { amplifier: 0 }); } catch {}
      }
      return 10;
    },
  },

  // Orochimaru: troca de pele uma vez por luta (abaixo de 30% de vida).
  trocaPele: {
    nome: "Troca de Pele", cd: 999999, alcance: [0, 99], peso: 99, vidaMax: 0.3, umaVez: true,
    exec(chefe) {
      const dim = chefe.dimension;
      falar(chefe, "§5", "Kukuku... achou mesmo que tinha acabado?");
      particula(dim, "tnt:ns_fumaca_ninja", chefe.location);
      somArea(dim, "mob.slime.big", chefe.location, 1, 0.6);
      const v = vidaDe(chefe);
      if (v) try { v.comp.setCurrentValue(Math.min(v.max, v.atual + v.max * 0.25)); } catch {}
      anunciar(chefe, 30, "", "§5Orochimaru trocou de pele e recuperou vida!");
      return 20;
    },
  },

  // Gaara: escudo de areia absoluto - golpes FRONTAIS sao anulados por 6s.
  escudoAreia: {
    nome: "Defesa Absoluta de Areia", cd: 400, alcance: [0, 12], peso: 3,
    exec(chefe) {
      const dim = chefe.dimension;
      falar(chefe, "§6", "A areia me protege.");
      somArea(dim, "dig.sand", chefe.location, 1.4, 0.6);
      anunciar(chefe, 24, "", "§6Escudo de areia: §fataque pelas costas!");
      estado(chefe).escudoAte = system.currentTick + 120;
      for (let t = 0; t < 120; t += 6) depois(chefe, t, () => particula(dim, "tnt:ns_poeira", { x: chefe.location.x + aleatorio(-0.8, 0.8), y: chefe.location.y + 1, z: chefe.location.z + aleatorio(-0.8, 0.8) }));
      return 10;
    },
  },

  // Gaara: Sabaku Kyu - caixao de areia prende e esmaga quem nao sair da area.
  caixaoAreia: {
    nome: "Sabaku Kyū", cd: 300, alcance: [3, 18], peso: 3,
    exec(chefe, alvo) {
      return golpeTelegrafado(chefe, chao(chefe.dimension, alvo.location), {
        raio: 1.8, atraso: 26, dano: 22, cor: [0.85, 0.65, 0.3], particulaImpacto: "tnt:ns_detritos", som: "dig.sand",
        extra: (e) => { try { e.addEffect("slowness", 60, { amplifier: 4 }); } catch {} },
      });
    },
  },

  // Neji: 64 Palmas - sela o chakra: zera parte do chakra e enfraquece.
  palmas64: {
    nome: "Oito Trigramas: 64 Palmas", cd: 340, alcance: [0, 4], peso: 3,
    exec(chefe, alvo) {
      const dim = chefe.dimension;
      falar(chefe, "§f", "Você está dentro do meu campo de adivinhação.");
      for (let t = 0; t < 14; t += 4) depois(chefe, t, () => anelAviso(dim, chao(dim, chefe.location), 4, [0.7, 0.8, 1]));
      for (let i = 0; i < 8; i++) {
        depois(chefe, 14 + i * 3, () => {
          if (!valido(alvo) || dist2(chefe.location, alvo.location) > 16) return;
          try { alvo.applyDamage(3, { cause: "entityAttack", damagingEntity: chefe }); } catch {}
          particula(dim, "tnt:critical_hit_hyuga", alvo.getHeadLocation());
          if (i === 7 && ehJogador(alvo)) {
            somarScore(alvo, "chakra", -Math.min(lerScore(alvo, "chakra"), 30));
            try { alvo.addEffect("weakness", 120, { amplifier: 1 }); } catch {}
            textoFlutuante(dim, { x: alvo.location.x, y: alvo.location.y + 2.2, z: alvo.location.z }, "§b§lCHAKRA SELADO!", 30);
          }
        });
      }
      return 14 + 8 * 3 + 6;
    },
  },

  // Neji: Rotacao Celestial - repele tudo e reflete projeteis.
  kaiten: H.rugido({ nome: "Hakkeshō Kaiten", cd: 260, alcance: [0, 4], peso: 2, raio: 5, dano: 8, forca: 3.2, particula: "tnt:rotacao_celestial", som: "rotacao", pitch: 1 }),

  // Kurama: Bijudama - carga longa, area gigante marcada onde o alvo ESTAVA.
  bijudama: {
    nome: "Bijūdama", cd: 600, alcance: [6, 40], peso: 4, fase: 1,
    exec(chefe, alvo) {
      const dim = chefe.dimension;
      const c = chao(dim, alvo.location);
      anunciar(chefe, 48, "", "§4§lBIJŪDAMA! §fSaia da área marcada!");
      somArea(dim, "reload_bijudama", chefe.location, 1.5, 1);
      for (let t = 0; t < 50; t += 5) depois(chefe, t, () => particula(dim, "tnt:bijudama_orb_vermelho", chefe.getHeadLocation()));
      for (let t = 0; t < 50; t += 4) depois(chefe, t, () => anelAviso(dim, c, 5, [1, 0.05, 0.05]));
      depois(chefe, 50, () => {
        somArea(dim, "lancar_bijudama", c, 2, 1);
        particula(dim, "tnt:bijudama_impact_1", c);
        particula(dim, "tnt:bijudama_impact_2", c);
        ferirArea(chefe, c, 5, 60);
        for (const p of dim.getPlayers({ location: c, maxDistance: 24 })) tremer(p, 1.5, 1.2);
      });
      return 58;
    },
  },
};

/* ------------------------------------------------------------------ */
/* Perfis dos chefes                                                    */
/* ------------------------------------------------------------------ */
// fases: limiares de vida (fracao) que iniciam a fase 1, 2...
// ritmo: ticks entre decisoes em cada fase (a fase final e mais agressiva)
const CHEFES = {
  "tnt:itachi_c": {
    nome: "Itachi Uchiha", cor: "§c", fases: [0.66, 0.33], ritmo: [90, 70, 55], postura: 9,
    falasFase: ["Você ainda não tem ódio suficiente.", "Então... vai me forçar a usar isto."],
    habilidades: [
      ESPECIAIS.tsukuyomi,
      H.emboscada({ nome: "Clone de Corvos", cd: 220, alcance: [2, 16], peso: 3, dano: 14, particulaSumir: "tnt:corvos_espalhar", fala: ["Por aqui.", "Lento demais."] }),
      H.area({ nome: "Katon: Gōkakyū", cd: 200, alcance: [3, 18], peso: 3, raio: 2.6, atraso: 20, dano: 16, particulaImpacto: "tnt:bola_fogo_projetil_impact", som: "bola_fogo", fala: ["Katon: Gōkakyū no Jutsu!"],
        extra: (e) => { try { e.setOnFire(3, true); } catch {} } }),
      ESPECIAIS.amaterasu,
      ESPECIAIS.susanoo,
    ],
  },
  "tnt:kisame_c": {
    nome: "Kisame Hoshigaki", cor: "§9", fases: [0.5, 0.25], ritmo: [90, 70, 60], postura: 12,
    falasFase: ["Agora a Samehada vai se divertir!", "Grande Tubarão Bala Explosiva!"],
    habilidades: [
      ESPECIAIS.samehada,
      H.investida({ nome: "Tubarão Bala", cd: 200, alcance: 14, largura: 1.8, atraso: 18, dano: 22, rastro: "tnt:tubarao_triplo_rastro_agua", particulaImpacto: "tnt:impact_agua", som: "random.splash", cor: [0.2, 0.45, 1], fala: ["Suiton: Gōshokuzame!"] }),
      H.rajada({ nome: "Prisões de Água", cd: 300, fase: 1, alcance: [2, 18], peso: 2, quantidade: 3, intervalo: 10, espalhar: 3, raio: 2, atraso: 22, dano: 14, cor: [0.2, 0.45, 1], particulaImpacto: "tnt:saudacao_agua", som: "random.splash",
        extra: (e) => { try { e.addEffect("slowness", 50, { amplifier: 2 }); } catch {} } }),
    ],
  },
  "tnt:zabuza": {
    nome: "Zabuza Momochi", cor: "§7", fases: [0.5], ritmo: [80, 60], postura: 10,
    falasFase: ["Agora você vai conhecer o Demônio da Névoa Oculta!"],
    habilidades: [
      ESPECIAIS.nevoa,
      H.emboscada({ nome: "Assassinato Silencioso", cd: 160, alcance: [2, 16], peso: 3, dano: 16, reacao: 14, fala: ["...", "Atrás de você."] }),
      H.investida({ nome: "Corte da Kubikiribōchō", cd: 220, alcance: 10, largura: 1.6, atraso: 16, dano: 18, rastro: "tnt:ns_corte", som: "random.anvil_land", fase: 1 }),
    ],
  },
  "tnt:neji_c": {
    nome: "Neji Hyūga", cor: "§f", fases: [0.5], ritmo: [70, 55], postura: 10,
    falasFase: ["O destino já decidiu o vencedor."],
    habilidades: [ESPECIAIS.palmas64, ESPECIAIS.kaiten,
      H.investida({ nome: "Palma de Ar", cd: 180, alcance: 9, largura: 1.3, atraso: 14, dano: 10, rastro: "tnt:chakra_hyuga_mao", cor: [0.7, 0.8, 1] })],
  },
  "tnt:kakashi_sinos": {
    nome: "Kakashi Hatake", cor: "§7", fases: [0.5], ritmo: [110, 85], postura: 8,
    falasFase: ["Hm. Vocês até que são bons."],
    habilidades: [
      H.emboscada({ nome: "Substituição", cd: 240, alcance: [2, 14], peso: 2, dano: 4, reacao: 16, fala: ["Atrás de você."] }),
      H.investida({ nome: "Chidori", cd: 320, fase: 1, alcance: 12, largura: 1.4, atraso: 24, dano: 9, rastro: "tnt:chidori_raio_1", particulaCarga: "tnt:chidori", somCarga: "chidori_load", som: "chidori_load_atk", cor: [0.5, 0.8, 1], fala: ["Chidori!"] }),
    ],
  },
  "tnt:orochimaru_miss_c": {
    nome: "Orochimaru", cor: "§5", fases: [0.6, 0.3], ritmo: [90, 70, 60], postura: 10,
    falasFase: ["Kukuku... interessante.", "Vou ficar com esse corpo!"],
    habilidades: [
      ESPECIAIS.trocaPele,
      H.rajada({ nome: "Mãos de Serpente", cd: 220, alcance: [2, 14], peso: 3, quantidade: 2, intervalo: 8, espalhar: 2, raio: 1.6, atraso: 16, dano: 12, cor: [0.5, 0.15, 0.6], particulaImpacto: "tnt:ns_detritos", som: "mob.slime.attack",
        extra: (e) => { try { e.addEffect("poison", 60, { amplifier: 0 }); e.addEffect("slowness", 40, { amplifier: 1 }); } catch {} } }),
      H.emboscada({ nome: "Emergir da Terra", cd: 260, fase: 1, alcance: [3, 18], peso: 2, dano: 14, particulaSumir: "tnt:ns_detritos" }),
    ],
  },
  "tnt:gaara_c": {
    nome: "Gaara", cor: "§6", fases: [0.5], ritmo: [90, 70], postura: 11,
    falasFase: ["Mãe... está com sede de sangue."],
    habilidades: [ESPECIAIS.escudoAreia, ESPECIAIS.caixaoAreia,
      H.rajada({ nome: "Chuva de Areia", cd: 260, fase: 1, alcance: [2, 20], peso: 2, quantidade: 4, intervalo: 6, espalhar: 3.5, raio: 1.5, atraso: 18, dano: 9, cor: [0.85, 0.65, 0.3], particulaImpacto: "tnt:ns_poeira", som: "dig.sand" })],
  },
  "tnt:gaara_c_manto_1": {
    nome: "Gaara (Shukaku Parcial)", cor: "§6", fases: [0.5], ritmo: [75, 60], postura: 12,
    habilidades: [ESPECIAIS.caixaoAreia,
      H.investida({ nome: "Garra de Areia", cd: 180, alcance: 10, largura: 1.8, atraso: 16, dano: 16, rastro: "tnt:ns_poeira", cor: [0.85, 0.65, 0.3] })],
  },
  "tnt:gaara_c_manto_2": {
    nome: "Gaara (Despertar do Shukaku)", cor: "§6", fases: [0.5], ritmo: [70, 55], postura: 13,
    habilidades: [ESPECIAIS.caixaoAreia,
      H.rajada({ nome: "Chuva de Areia", cd: 220, alcance: [2, 20], peso: 3, quantidade: 5, intervalo: 6, espalhar: 4, raio: 1.6, atraso: 18, dano: 12, cor: [0.85, 0.65, 0.3], particulaImpacto: "tnt:ns_poeira", som: "dig.sand" }),
      H.rugido({ nome: "Rugido do Shukaku", cd: 300, alcance: [0, 6], peso: 2, raio: 6, dano: 8, particula: "tnt:shukaku_biju_grito" })],
  },
  "tnt:shukaku_biju": {
    nome: "Shukaku, o Uma Cauda", cor: "§6", fases: [0.6, 0.3], ritmo: [90, 70, 55], postura: 22, bioma: true,
    falasFase: ["HAHAHA! SANGUE!", "VOU TE ESMAGAR!"],
    habilidades: [
      H.rajada({ nome: "Espinhos de Areia", cd: 200, alcance: [0, 26], peso: 3, quantidade: 5, intervalo: 6, espalhar: 4, raio: 1.8, atraso: 20, dano: 16, cor: [0.85, 0.65, 0.3], particulaImpacto: "tnt:shukaku_skill_espinho", som: "dig.sand" }),
      H.rugido({ nome: "Rugido", cd: 320, alcance: [0, 8], peso: 2, raio: 8, dano: 10, particula: "tnt:shukaku_biju_grito" }),
      H.area({ nome: "Bala de Ar Compactado", cd: 260, fase: 1, alcance: [6, 30], peso: 3, raio: 3.5, atraso: 24, dano: 30, particulaImpacto: "tnt:shukaku_impact", som: "random.explode", tremor: 0.9, cor: [0.85, 0.65, 0.3] }),
    ],
  },
  "tnt:kurama_biju": {
    nome: "Kurama, a Raposa de Nove Caudas", cor: "§6", fases: [0.6, 0.3], ritmo: [90, 70, 50], postura: 26,
    falasFase: ["MALDITOS HUMANOS! SINTAM O MEU ÓDIO!", "EU SOU A MAIS FORTE DAS BIJŪS!"],
    habilidades: [
      H.area({ nome: "Golpe de Cauda", cd: 160, alcance: [0, 10], peso: 3, raio: 3.5, atraso: 18, dano: 28, particulaImpacto: "tnt:impact_chao", som: "random.explode", tremor: 0.8 }),
      H.rugido({ nome: "Rugido da Raposa", cd: 300, alcance: [0, 9], peso: 2, raio: 9, dano: 12, particula: "tnt:kurama_biju_grito", som: "kurama_grito", pitch: 1 }),
      ESPECIAIS.bijudama,
      H.rajada({ nome: "Chuva de Chakra", cd: 280, fase: 2, alcance: [0, 30], peso: 3, quantidade: 6, intervalo: 5, espalhar: 5, raio: 2, atraso: 20, dano: 20, cor: [1, 0.4, 0.05], particulaImpacto: "tnt:bijudama_impact_1", som: "random.explode" }),
    ],
  },
  "tnt:anbu_boss": {
    nome: "Capitão ANBU", cor: "§8", fases: [0.5], ritmo: [90, 70], postura: 9,
    falasFase: ["Reforços! Agora!"],
    habilidades: [
      H.emboscada({ nome: "Shunshin", cd: 200, alcance: [2, 16], peso: 3, dano: 8 }),
      {
        nome: "Chamar Reforços", cd: 99999, fase: 1, alcance: [0, 30], peso: 99, umaVez: true,
        exec(chefe) {
          const dim = chefe.dimension;
          for (let i = 0; i < 2; i++) {
            const p = { x: chefe.location.x + aleatorio(-3, 3), y: chefe.location.y, z: chefe.location.z + aleatorio(-3, 3) };
            if (!livre(dim, p)) continue;
            try { dim.spawnEntity("tnt:anbu_basico", p); particula(dim, "tnt:ns_fumaca_ninja", p); } catch {}
          }
          return 10;
        },
      },
    ],
  },
  "tnt:espadachin_ss": {
    nome: "Espadachim da Névoa (SS)", cor: "§b", fases: [0.5], ritmo: [80, 60], postura: 12,
    habilidades: [
      H.investida({ nome: "Corte Relâmpago", cd: 180, alcance: 11, largura: 1.6, atraso: 16, dano: 26, rastro: "tnt:ns_corte", som: "random.anvil_land" }),
      H.emboscada({ nome: "Passo Fantasma", cd: 240, fase: 1, alcance: [2, 16], peso: 2, dano: 24 }),
    ],
  },
};
CHEFES["tnt:shukaku_biju_miss"] = CHEFES["tnt:shukaku_biju"];

/** Tipos controlados pelo diretor (outros sistemas, como a furia generica, os ignoram). */
export const CHEFES_DIRIGIDOS = new Set(Object.keys(CHEFES));
export function nomeDoChefe(typeId) {
  return CHEFES[typeId]?.nome;
}

/* ------------------------------------------------------------------ */
/* Estado por chefe                                                     */
/* ------------------------------------------------------------------ */
const estados = new Map(); // id -> estado

function estado(chefe) {
  let s = estados.get(chefe.id);
  if (!s) {
    s = { fase: 0, proxima: system.currentTick + 40, ocupadoAte: 0, cds: {}, usadas: new Set(), golpes: [], posturaImuneAte: 0, escudoAte: 0, visto: system.currentTick };
    // fase persistida (sobrevive a recarregar o chunk/mundo)
    try { const f = chefe.getDynamicProperty("ns:fase"); if (typeof f === "number") s.fase = f; } catch {}
    estados.set(chefe.id, s);
  }
  return s;
}

export function faseDoChefe(chefe) {
  return estados.get(chefe.id)?.fase ?? 0;
}

function faseAlvo(perfil, fracao) {
  let f = 0;
  perfil.fases.forEach((lim, i) => { if (fracao <= lim) f = i + 1; });
  return f;
}

function mudarFase(chefe, perfil, s, nova) {
  s.fase = nova;
  try { chefe.setDynamicProperty("ns:fase", nova); } catch {}
  const dim = chefe.dimension;
  const loc = chefe.location;
  const romano = ["I", "II", "III", "IV"][nova] ?? String(nova + 1);
  try { chefe.playAnimation("animation.ns.chefe_fase", { controller: "ns_fase", blendOutTime: 0.3 }); } catch {}
  anunciar(chefe, 48, `${perfil.cor}§l${perfil.nome}`, `§7Fase §f${romano}`);
  if (perfil.falasFase?.[nova - 1]) falar(chefe, perfil.cor, perfil.falasFase[nova - 1]);
  somArea(dim, "ns.chefe.fase", loc, 1.3, 1);
  particula(dim, "tnt:ns_onda", { x: loc.x, y: loc.y + 0.1, z: loc.z });
  particula(dim, "tnt:ns_flash", chefe.getHeadLocation());
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    particula(dim, "tnt:ns_aura", { x: loc.x + Math.cos(a) * 1.5, y: loc.y + 0.3, z: loc.z + Math.sin(a) * 1.5 }, [1, 0.2, 0.1]);
  }
  // cada fase deixa o chefe um pouco mais rapido e resistente (sem multiplicar a vida)
  try { chefe.addEffect("speed", 20 * 600, { amplifier: Math.min(1, nova - 1), showParticles: false }); } catch {}
  try { chefe.addEffect("resistance", 60, { amplifier: 2, showParticles: false }); } catch {}
  // breve pausa dramatica antes do proximo ataque
  s.proxima = system.currentTick + 30;
  s.ocupadoAte = system.currentTick + 20;
}

/* ------------------------------------------------------------------ */
/* Postura e escudo                                                     */
/* ------------------------------------------------------------------ */
world.afterEvents.entityHurt.subscribe((ev) => {
  try {
    const chefe = ev.hurtEntity;
    const perfil = chefe && CHEFES[chefe.typeId];
    if (!perfil) return;
    const atacante = ev.damageSource?.damagingEntity;
    if (!ehJogador(atacante)) return;
    const s = estado(chefe);
    const agora = system.currentTick;

    // Escudo de areia: golpes vindos da frente sao devolvidos como vida
    if (s.escudoAte > agora) {
      const v = chefe.getViewDirection();
      const d = { x: atacante.location.x - chefe.location.x, z: atacante.location.z - chefe.location.z };
      const n = Math.hypot(d.x, d.z) || 1;
      if ((v.x * d.x + v.z * d.z) / n > 0.2) {
        const vida = vidaDe(chefe);
        if (vida) try { vida.comp.setCurrentValue(Math.min(vida.max, vida.atual + ev.damage)); } catch {}
        particula(chefe.dimension, "tnt:ns_poeira", chefe.getHeadLocation());
        textoFlutuante(chefe.dimension, { x: chefe.location.x, y: chefe.location.y + 2.6, z: chefe.location.z }, "§6BLOQUEADO", 16);
        return;
      }
    }

    // Postura: N golpes em 3 segundos atordoam o chefe por 2 segundos
    if (s.posturaImuneAte > agora) return;
    s.golpes = s.golpes.filter((t) => agora - t < 60);
    s.golpes.push(agora);
    if (s.golpes.length >= (perfil.postura ?? 10)) {
      s.golpes = [];
      s.posturaImuneAte = agora + 300; // 15s ate poder ser atordoado de novo
      s.ocupadoAte = agora + 40;
      s.proxima = Math.max(s.proxima, agora + 50);
      try { chefe.addEffect("slowness", 40, { amplifier: 255, showParticles: false }); } catch {}
      try { chefe.addEffect("weakness", 40, { amplifier: 3, showParticles: false }); } catch {}
      const dim = chefe.dimension;
      particula(dim, "tnt:ns_critico_anel", chefe.getHeadLocation());
      particula(dim, "tnt:ns_critico", chefe.getHeadLocation());
      somArea(dim, "ns.chefe.atordoado", chefe.location, 1, 1);
      textoFlutuante(dim, { x: chefe.location.x, y: chefe.location.y + 2.8, z: chefe.location.z }, "§e§lATORDOADO!", 36);
      tremer(atacante, 0.4, 0.3);
    }
  } catch {}
});

/* ------------------------------------------------------------------ */
/* Laco principal do diretor (a cada 5 ticks)                          */
/* ------------------------------------------------------------------ */
function escolherAlvo(chefe) {
  let melhor, melhorD = Infinity;
  try {
    for (const p of chefe.dimension.getPlayers({ location: chefe.location, maxDistance: 32 })) {
      if (!ativo(p)) continue;
      const d = dist2(p.location, chefe.location);
      if (d < melhorD) { melhorD = d; melhor = p; }
    }
  } catch {}
  return melhor;
}

function decidir(chefe, perfil, s, alvo) {
  const agora = system.currentTick;
  const v = vidaDe(chefe);
  const fracao = v && v.max > 0 ? v.atual / v.max : 1;
  const d = distH(chefe.location, alvo.location);
  const candidatos = [];
  let pesoTotal = 0;
  for (const h of perfil.habilidades) {
    if ((h.fase ?? 0) > s.fase) continue;
    if ((s.cds[h.nome] ?? 0) > agora) continue;
    if (h.umaVez && s.usadas.has(h.nome)) continue;
    if (h.vidaMax !== undefined && fracao > h.vidaMax) continue;
    const [min, max] = Array.isArray(h.alcance) ? h.alcance : [0, h.alcance ?? 99];
    if (d < min || d > max) continue;
    candidatos.push(h);
    pesoTotal += h.peso ?? 1;
  }
  if (!candidatos.length) return false;
  let r = Math.random() * pesoTotal;
  let escolhida = candidatos[0];
  for (const h of candidatos) { r -= h.peso ?? 1; if (r <= 0) { escolhida = h; break; } }

  // fase final reduz recargas em 25%
  const fator = s.fase >= perfil.fases.length ? 0.75 : 1;
  s.cds[escolhida.nome] = agora + Math.round((escolhida.cd ?? 200) * fator);
  if (escolhida.umaVez) s.usadas.add(escolhida.nome);
  const ocupado = escolhida.exec(chefe, alvo, s) ?? 0;
  s.ocupadoAte = agora + ocupado;
  return true;
}

system.runInterval(() => {
  const agora = system.currentTick;
  const vistos = new Set();
  for (const player of world.getPlayers()) {
    let perto;
    try { perto = player.dimension.getEntities({ location: player.location, maxDistance: 40, excludeTypes: ["minecraft:item", "minecraft:xp_orb", "minecraft:player", "tnt:ns_texto"] }); } catch { continue; }
    for (const chefe of perto) {
      if (vistos.has(chefe.id)) continue;
      const perfil = CHEFES[chefe.typeId];
      if (!perfil) continue;
      vistos.add(chefe.id);
      try {
        const v = vidaDe(chefe);
        if (!v || v.atual <= 0) continue;
        const s = estado(chefe);
        s.visto = agora;
        const fase = faseAlvo(perfil, v.atual / v.max);
        if (fase > s.fase) { mudarFase(chefe, perfil, s, fase); continue; }
        if (agora < s.ocupadoAte || agora < s.proxima) continue;
        const alvo = escolherAlvo(chefe);
        if (!alvo) continue;
        const ritmo = perfil.ritmo[Math.min(s.fase, perfil.ritmo.length - 1)];
        // sempre ha um intervalo entre acoes: o jogador tem tempo de contra-atacar
        s.proxima = agora + ritmo + Math.floor(Math.random() * 30);
        decidir(chefe, perfil, s, alvo);
      } catch {}
    }
  }
}, 5);

// limpeza de estados de chefes que sumiram/morreram
world.afterEvents.entityDie.subscribe((ev) => {
  try { estados.delete(ev.deadEntity.id); } catch {}
});
system.runInterval(() => {
  const agora = system.currentTick;
  for (const [id, s] of estados) if (agora - s.visto > 1200) estados.delete(id);
}, 600);
