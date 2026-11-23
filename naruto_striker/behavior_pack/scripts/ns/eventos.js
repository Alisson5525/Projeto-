// Ambiente e eventos do mundo:
//  - folhas caindo sob as árvores e vagalumes à noite perto dos jogadores;
//  - "Noite da Lua Vermelha": evento noturno raro com névoa vermelha,
//    XP em dobro e mais ninjas de elite.
import { world, system } from "@minecraft/server";
import { ehJogador, particula, som, msg, tremer, aleatorio } from "./util";

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

system.runInterval(() => {
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
    player.runCommandAsync(ligar ? `fog @s push ${NEVOA} ${ID_NEVOA}` : `fog @s remove ${ID_NEVOA}`);
  } catch {}
}

function comecar() {
  try { world.setDynamicProperty(CHAVE, true); } catch { return; }
  for (const p of world.getAllPlayers()) {
    aplicarNevoa(p, false); // evita empilhar
    aplicarNevoa(p, true);
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
    if (Math.random() < CHANCE_POR_NOITE && world.getAllPlayers().length > 0) comecar();
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
