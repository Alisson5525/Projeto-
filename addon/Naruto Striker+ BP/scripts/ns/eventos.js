// Ambiente e eventos do mundo:
//  - folhas caindo sob as árvores e vagalumes à noite perto dos jogadores;
//  - "Noite da Lua Vermelha": evento noturno raro com névoa vermelha,
//    XP em dobro e mais ninjas de elite.
import { world, system } from "@minecraft/server";
import { ehJogador, particula, som, msg, tremer, aleatorio, mundoCfg, lerNum, gravar, somarScore } from "./util";

/* ------------------------------------------------------------------ */
/* Ambiente                                                            */
/* ------------------------------------------------------------------ */
function horaDoDia() {
  try {
    return world.getTimeOfDay(); // 0..23999
  } catch {
    return 6000;
  }
}

const ehNoite = () => {
  const t = horaDoDia();
  return t >= 13000 && t <= 23000;
};

let cacheVila = null, cacheVilaTick = -9999;
function posicaoVila() {
  if (system.currentTick - cacheVilaTick < 600) return cacheVila;
  cacheVilaTick = system.currentTick;
  try {
    const v = world.getDynamicProperty("ns:konoha_pos");
    if (typeof v === "string") cacheVila = JSON.parse(v);
    else if (world.getDynamicProperty("estrutura_spawnada")) {
      const s = world.getDefaultSpawnLocation();
      cacheVila = { x: s.x, z: s.z };
    } else cacheVila = null;
  } catch { cacheVila = null; }
  return cacheVila;
}

system.runInterval(() => {
  if (!mundoCfg("ambiente")) return;
  const noite = ehNoite();
  for (const player of world.getPlayers()) {
    try {
      if (!ehJogador(player) || player.dimension.id !== "minecraft:overworld") continue;
      const dim = player.dimension;
      const b = player.location;
      // folhas: procura copas de arvore acima de pontos aleatorios proximos
      for (let i = 0; i < 3; i++) {
        const x = Math.floor(b.x + aleatorio(-7, 7));
        const z = Math.floor(b.z + aleatorio(-7, 7));
        const y = Math.floor(b.y) + 3 + Math.floor(Math.random() * 6);
        let bloco;
        try { bloco = dim.getBlock({ x, y, z }); } catch { continue; }
        if (bloco && bloco.typeId.includes("leaves")) {
          particula(dim, "tnt:ns_folha_caindo", { x: x + Math.random(), y: y - 0.1, z: z + Math.random() });
        }
      }
      // petalas de sakura perto da Vila da Folha
      const vila = posicaoVila();
      if (vila && Math.abs(b.x - vila.x) < 70 && Math.abs(b.z - vila.z) < 70) {
        for (let i = 0; i < 2; i++) {
          particula(dim, "tnt:ns_petala", { x: b.x + aleatorio(-9, 9), y: b.y + aleatorio(3, 7), z: b.z + aleatorio(-9, 9) });
        }
      }
      // vagalumes a noite, ao ar livre e perto do chao
      if (noite && Math.random() < 0.6) {
        const p = { x: b.x + aleatorio(-6, 6), y: b.y + aleatorio(0.3, 2.2), z: b.z + aleatorio(-6, 6) };
        let bloco;
        try { bloco = dim.getBlock({ x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) }); } catch {}
        if (bloco && bloco.isAir) particula(dim, "tnt:ns_vagalume", p);
      }
    } catch {}
  }
}, 30);

/* ------------------------------------------------------------------ */
/* Noite da Lua Vermelha                                               */
/* ------------------------------------------------------------------ */
const CHAVE = "ns:lua_vermelha";
const CHANCE_POR_NOITE = 0.12;
const NEVOA = "tnt:ns_lua_vermelha";
const ID_NEVOA = "ns_lua";

export function luaVermelhaAtiva() {
  try {
    return world.getDynamicProperty(CHAVE) === true;
  } catch {
    return false;
  }
}

function aplicarNevoa(player, ligar) {
  try {
    player.runCommandAsync(ligar ? `fog @s push ${NEVOA} ${ID_NEVOA}` : `fog @s remove ${ID_NEVOA}`)?.catch?.(() => {});
  } catch {}
}

function comecar() {
  try { world.setDynamicProperty(CHAVE, true); } catch { return; }
  for (const p of world.getAllPlayers()) {
    aplicarNevoa(p, false); // evita empilhar
    aplicarNevoa(p, true);
    gravar(p, "ns:lua_inicio", lerNum(p, "ns:kills_lua", 0)); // base para o saldo da noite
    msg(p, "§4§l[!] A NOITE DA LUA VERMELHA COMEÇOU!§r\n§cNinjas de elite surgem com mais frequência. §6XP em dobro até o amanhecer.");
    som(p, "mob.wither.spawn", 0.4, 0.6);
    tremer(p, 0.3, 1.5);
  }
}

function terminar() {
  try { world.setDynamicProperty(CHAVE, false); } catch {}
  for (const p of world.getAllPlayers()) {
    aplicarNevoa(p, false);
    msg(p, "§6O sol nasce... §7A Noite da Lua Vermelha terminou.");
    // saldo da noite: TP pelos inimigos derrotados durante o evento
    try {
      const inicio = lerNum(p, "ns:lua_inicio", -1);
      if (inicio >= 0) {
        const n = lerNum(p, "ns:kills_lua", 0) - inicio;
        if (n > 0) {
          const tp = Math.min(600, n * 15);
          somarScore(p, "tp", tp);
          msg(p, `§4[Lua Vermelha] §fVocê derrotou §c${n}§f inimigo(s) esta noite. §6+${tp} TP`);
          som(p, "random.orb", 0.8, 0.9);
        }
      }
      gravar(p, "ns:lua_inicio", -1);
    } catch {}
  }
}

let noiteAnterior = null;
system.runInterval(() => {
  const noite = ehNoite();
  if (noiteAnterior === null) {
    noiteAnterior = noite;
    // mundo carregado de dia com evento "preso": encerra
    if (!noite && luaVermelhaAtiva()) terminar();
    return;
  }
  if (noite && !noiteAnterior) {
    if (mundoCfg("lua_vermelha") && Math.random() < CHANCE_POR_NOITE && world.getAllPlayers().length > 0) comecar();
  } else if (!noite && noiteAnterior && luaVermelhaAtiva()) {
    terminar();
  }
  noiteAnterior = noite;
}, 100);

// particulas vermelhas no ar durante o evento + nevoa para quem entrar no meio
system.runInterval(() => {
  if (!luaVermelhaAtiva()) return;
  for (const p of world.getPlayers()) {
    try {
      if (p.dimension.id !== "minecraft:overworld") continue;
      const b = p.location;
      particula(p.dimension, "tnt:ns_aura", { x: b.x + aleatorio(-8, 8), y: b.y + aleatorio(0, 3), z: b.z + aleatorio(-8, 8) }, [0.9, 0.05, 0.05]);
    } catch {}
  }
}, 20);

world.afterEvents.playerSpawn.subscribe((ev) => {
  if (!ev.initialSpawn) return;
  system.runTimeout(() => {
    if (!ehJogador(ev.player)) return;
    aplicarNevoa(ev.player, false);
    // base do saldo da noite: so conta o que for derrotado a partir de agora
    gravar(ev.player, "ns:lua_inicio", luaVermelhaAtiva() ? lerNum(ev.player, "ns:kills_lua", 0) : -1);
    if (luaVermelhaAtiva()) {
      aplicarNevoa(ev.player, true);
      msg(ev.player, "§4A Noite da Lua Vermelha está acontecendo! §6XP em dobro.");
    }
  }, 40);
});

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id === "ns:lua_vermelha") {
    if (luaVermelhaAtiva()) terminar();
    else comecar();
  }
});
