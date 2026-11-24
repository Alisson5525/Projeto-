import { world, system } from "@minecraft/server";
import { cmd } from "./lib/cmd.js";

const config = {
  bijuus: [
    {
      id: "tnt:kurama_biju_morte",
      playerCmds: ["give @s tnt:chakra_kurama"],
      mobCmds: ["event entity @s transformation"]
    },
     
    {
      id: "wg:shukaku",
      playerCmds: ["say Shukaku liberado"],
      mobCmds: ["say Grrrr"]
    }
  ],
  maxCharge: 100,
  particle: "tnt:chakra_biju",
  particleStep: 1,
  loopTick: 5,
  searchDistance: 20
};

const charging = new Set();

function isValidItem(item) {
  return item &&
    (
      item.typeId === "tnt:pergaminho_ceifeiro" ||
      item.typeId === "tnt:teste3"
    );
}

function getScore(player, objective) {
  try {
    return world.scoreboard
      .getObjective(objective)
      .getScore(player.scoreboardIdentity);
  } catch {
    return 0;
  }
}

function setScore(player, obj, value) {
  cmd(player, `scoreboard players set @s ${obj} ${value}`);
}

function addScore(player, obj, value) {
  cmd(player, `scoreboard players add @s ${obj} ${value}`);
}

function isStopped(player) {
  const v = player.getVelocity();
  return Math.abs(v.x) < 0.01 && Math.abs(v.z) < 0.01;
}

function isMoving(player) {
  return !isStopped(player);
}

function getNearestBijuu(player) {
  const entities = player.dimension.getEntities({
    location: player.location,
    maxDistance: config.searchDistance,
  });

  return entities.find(e =>
    config.bijuus.some(b => b.id === e.typeId)
  );
}

function getBijuuConfig(entity) {
  return config.bijuus.find(b => b.id === entity.typeId);
}

function drawLine(dimension, from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // pelo menos 1 passo (antes: 0/0 = NaN quando o bijuu estava a menos de 1 bloco)
  const steps = Math.max(1, Math.floor(dist / config.particleStep));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;

    dimension.spawnParticle(config.particle, {
      x: from.x + dx * t,
      y: from.y + dy * t + 1,
      z: from.z + dz * t,
    });
  }
}

//
// COMEÇA A SEGURAR BOTÃO DIREITO
//
world.afterEvents.itemStartUse.subscribe(ev => {
  const player = ev.source;
  const item = ev.itemStack;

  if (!player || !isValidItem(item)) return;

  cmd(player, "playanimation @s animation.ceifeiro default 0.2");
  charging.add(player.id);
});

//
// SOLTA O BOTÃO DIREITO
//
world.afterEvents.itemStopUse.subscribe(ev => {
  const player = ev.source;
  const item = ev.itemStack;

  if (!player || !isValidItem(item)) return;

  if (!charging.has(player.id)) return;

  charging.delete(player.id);

  cmd(player, "particle tnt:rasengan_impact_fumaca ^^0.6^-1.7");
  cmd(player, "playanimation @s animation.ceifeiro_stop default 0.2");

  setScore(player, "charge_bijuu", 0);
});

world.afterEvents.playerLeave.subscribe((ev) => {
  charging.delete(ev.playerId);
});

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    if (!charging.has(player.id)) continue;
    try {

    //
    // SE ANDAR CANCELA
    //
    if (isMoving(player)) {
      cmd(player, "particle tnt:rasengan_impact_fumaca ^^0.6^-1.7");
      cmd(player, "playanimation @s animation.ceifeiro_stop default 0.2");

      charging.delete(player.id);
      setScore(player, "charge_bijuu", 0);
      continue;
    }

    const bijuu = getNearestBijuu(player);

    if (!bijuu) {
      setScore(player, "charge_bijuu", 0);
      continue;
    }

    //
    // CARREGANDO
    //
    addScore(player, "charge_bijuu", 1);

    const score = getScore(player, "charge_bijuu");

    drawLine(
      player.dimension,
      player.location,
      bijuu.location
    );

    if (score >= config.maxCharge) {
      setScore(player, "charge_bijuu", 0);

      const bijuuCfg = getBijuuConfig(bijuu);

      if (bijuuCfg?.playerCmds) {
        for (const comando of bijuuCfg.playerCmds) {
          cmd(player, comando);
        }
      }

      if (bijuuCfg?.mobCmds) {
        for (const comando of bijuuCfg.mobCmds) {
          cmd(bijuu, comando);
        }
      }
    }
    } catch (e) {
      // um erro com um jogador nao interrompe os demais
      charging.delete(player.id);
    }
  }
}, config.loopTick);