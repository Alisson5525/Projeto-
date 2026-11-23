import * as mc from "@minecraft/server";

mc.system.runInterval(() => {
  for (const player of mc.world.getPlayers()) {
    if (player.getProperty("tnt:kurama") != 7) continue;

    // COMBO 1
    if (player.hasTag("attack") && !player.hasTag("combo1") && !player.hasTag("delay")) {
      player.playAnimation("animation.barion_atk_1");
      player.addTag("combo1");
      player.addTag("delay");

      mc.system.runTimeout(() => {
        player.runCommandAsync("camerashake add @s 0.1 0.2 rotational");
        player.runCommandAsync("tp @e[rm=0.7,c=1,r=3] ^^0.2 ^1");
      }, 0);

      mc.system.runTimeout(() => damage(player, 35, 2, 3), 0.13 * 20);
      mc.system.runTimeout(() => player.removeTag("delay"), 0.2 * 20);

      mc.system.runTimeout(() => {
        if (!player.hasTag("delay")) player.removeTag("combo1");
      }, 0.4 * 20);
    }

    // COMBO 2
    if (player.hasTag("attack") && player.hasTag("combo1") && !player.hasTag("combo2") && !player.hasTag("delay")) {
      player.playAnimation("animation.barion_atk_2");
      player.addTag("combo2");
      player.addTag("delay");

      mc.system.runTimeout(() => {
        player.runCommandAsync("camerashake add @s 0.1 0.2 rotational");
        player.runCommandAsync("tp @e[rm=0.7,c=1,r=3] ^^0.2 ^1");
      }, 0);

      mc.system.runTimeout(() => damage(player, 35, 2, 3), 0.13 * 20);
      mc.system.runTimeout(() => player.removeTag("delay"), 0.2 * 20);

      mc.system.runTimeout(() => {
        if (!player.hasTag("delay")) {
          player.removeTag("combo1");
          player.removeTag("combo2");
        }
      }, 0.4 * 20);
    }

    // COMBO 3
    if (player.hasTag("attack") && player.hasTag("combo2") && !player.hasTag("combo3") && !player.hasTag("delay")) {
      player.playAnimation("animation.barion_atk_3");
      player.addTag("combo3");
      player.addTag("delay");

      mc.system.runTimeout(() => {
        player.runCommandAsync("camerashake add @s 0.1 0.2 rotational");
        player.runCommandAsync("tp @e[rm=0.7,c=1,r=3] ^^0.2 ^1");
      }, 0);

      mc.system.runTimeout(() => damage(player, 35, 2, 3), 0.13 * 20);
      mc.system.runTimeout(() => player.removeTag("delay"), 0.2 * 20);

      mc.system.runTimeout(() => {
        if (!player.hasTag("delay")) {
          player.removeTag("combo1");
          player.removeTag("combo2");
          player.removeTag("combo3");
        }
      }, 0.4 * 20);
    }

    // COMBO 4
    if (player.hasTag("attack") && player.hasTag("combo3") && !player.hasTag("combo4") && !player.hasTag("delay")) {
      player.playAnimation("animation.barion_atk_2");
      player.addTag("combo4");
      player.addTag("delay");

      mc.system.runTimeout(() => {
        player.runCommandAsync("camerashake add @s 0.1 0.2 rotational");
        player.runCommandAsync("tp @e[rm=0.7,c=1,r=3] ^^0.2 ^1");
      }, 0);

      mc.system.runTimeout(() => damage(player, 35, 2, 3), 0.13 * 20);
      mc.system.runTimeout(() => player.removeTag("delay"), 0.2 * 20);

      mc.system.runTimeout(() => {
        if (!player.hasTag("delay")) {
          player.removeTag("combo1");
          player.removeTag("combo2");
          player.removeTag("combo3");
          player.removeTag("combo4");
        }
      }, 0.4 * 20);
    }


    // COMBO 5
    if (player.hasTag("attack") && player.hasTag("combo4") && !player.hasTag("combo5") && !player.hasTag("delay")) {
      player.playAnimation("animation.barion_atk_3");
      player.addTag("combo5");
      player.addTag("delay");

      mc.system.runTimeout(() => {
        player.runCommandAsync("camerashake add @s 0.1 0.2 rotational");
        player.runCommandAsync("tp @e[rm=0.7,c=1,r=3] ^^0.2 ^1");
      }, 0);

      mc.system.runTimeout(() => damage2(player, 45, 2, 3), 0.13 * 20);
      mc.system.runTimeout(() => player.removeTag("delay"), 0.2 * 20);

      mc.system.runTimeout(() => {
        if (!player.hasTag("delay")) {
          player.removeTag("combo1");
          player.removeTag("combo2");
          player.removeTag("combo3");
          player.removeTag("combo4");
          player.removeTag("combo5");
        }
      }, 0.4 * 20);
    }


    // COMBO 6
    if (player.hasTag("attack") && player.hasTag("combo5") && !player.hasTag("combo6") && !player.hasTag("delay")) {
      player.playAnimation("animation.barion_atk_2");
      player.addTag("combo6");
      player.addTag("delay");

      mc.system.runTimeout(() => {
        player.runCommandAsync("camerashake add @s 0.1 0.2 rotational");
        player.runCommandAsync("tp @e[rm=0.7,c=1,r=3] ^^0.2 ^1");
      }, 0);

      mc.system.runTimeout(() => damage2(player, 45, 2, 3), 0.13 * 20);
      mc.system.runTimeout(() => player.removeTag("delay"), 0.2 * 20);

      mc.system.runTimeout(() => {
        if (!player.hasTag("delay")) {
          player.removeTag("combo1");
          player.removeTag("combo2");
          player.removeTag("combo3");
          player.removeTag("combo4");
          player.removeTag("combo5");
          player.removeTag("combo6");
        }
      }, 0.4 * 20);
    }


    // COMBO 7
    if (player.hasTag("attack") && player.hasTag("combo6") && !player.hasTag("combo7") && !player.hasTag("delay")) {
      player.playAnimation("animation.barion_atk_3");
      player.addTag("combo7");
      player.addTag("delay");

      mc.system.runTimeout(() => {
        player.runCommandAsync("camerashake add @s 0.1 0.2 rotational");
        player.runCommandAsync("tp @e[rm=0.7,c=1,r=3] ^^0.2 ^1");
      }, 0);

      mc.system.runTimeout(() => damage2(player, 45, 2, 3), 0.13 * 20);
      mc.system.runTimeout(() => player.removeTag("delay"), 0.2 * 20);

      mc.system.runTimeout(() => {
        if (!player.hasTag("delay")) {
          player.removeTag("combo1");
          player.removeTag("combo2");
          player.removeTag("combo3");
          player.removeTag("combo4");
          player.removeTag("combo5");
          player.removeTag("combo6");
          player.removeTag("combo7");
        }
      }, 0.4 * 20);
    }


    // COMBO 8
    if (player.hasTag("attack") && player.hasTag("combo7") && !player.hasTag("combo8") && !player.hasTag("delay")) {
      player.playAnimation("animation.barion_atk_2");
      player.addTag("combo8");
      player.addTag("delay");

      mc.system.runTimeout(() => {
        player.runCommandAsync("camerashake add @s 0.1 0.2 rotational");
        player.runCommandAsync("tp @e[rm=0.7,c=1,r=3] ^^0.2 ^1");
      }, 0);

      mc.system.runTimeout(() => damage2(player, 45, 2, 3), 0.13 * 20);
      mc.system.runTimeout(() => player.removeTag("delay"), 0.2 * 20);

      mc.system.runTimeout(() => {
        if (!player.hasTag("delay")) {
          player.removeTag("combo1");
          player.removeTag("combo2");
          player.removeTag("combo3");
          player.removeTag("combo4");
          player.removeTag("combo5");
          player.removeTag("combo6");
          player.removeTag("combo7");
          player.removeTag("combo8");
        }
      }, 0.4 * 20);
    }


    // COMBO 9
    if (player.hasTag("attack") && player.hasTag("combo8") && !player.hasTag("combo9") && !player.hasTag("delay")) {
      player.playAnimation("animation.barion_atk_3");
      player.addTag("combo9");
      player.addTag("delay");

      mc.system.runTimeout(() => {
        player.runCommandAsync("camerashake add @s 0.1 0.2 rotational");
        player.runCommandAsync("tp @e[rm=0.7,c=1,r=3] ^^0.2 ^1");
      }, 0);

      mc.system.runTimeout(() => damage2(player, 45, 2, 3), 0.13 * 20);
      mc.system.runTimeout(() => player.removeTag("delay"), 0.2 * 20);

      mc.system.runTimeout(() => {
        if (!player.hasTag("delay")) {
          player.removeTag("combo1");
          player.removeTag("combo2");
          player.removeTag("combo3");
          player.removeTag("combo4");
          player.removeTag("combo5");
          player.removeTag("combo6");
          player.removeTag("combo7");
          player.removeTag("combo8");
          player.removeTag("combo9");
        }
      }, 0.4 * 20);
    }









    // COMBO 4
    if (player.hasTag("attack") && player.hasTag("combo9") && !player.hasTag("combo10") && !player.hasTag("delay")) {
      player.playAnimation("animation.barion_atk_2");
      player.addTag("combo10");
      player.addTag("delay");

      mc.system.runTimeout(() => {
        player.runCommandAsync("camerashake add @s 0.1 0.2 rotational");
        player.runCommandAsync("execute as @e[rm=0.5,r=5,c=1,type=!item,type=!xp_orb] at @s run tp @a[c=1] ^ ^1 ^-1.5 facing @s");
      }, 0);

      mc.system.runTimeout(() => {
        player.runCommandAsync("tp @s ~~6~");
        damage2(player, 4, 3, 3);
      }, 0.1 * 20);

      mc.system.runTimeout(() => {
        // olha para baixo
        player.runCommandAsync("tp @s ~ ~ ~ ~ 100");
        damage2(player, 4, 3, 3);
      }, 0.2 * 20);

      mc.system.runTimeout(() => {
        // ativa dash + marca impacto
        player.runCommandAsync("tag @s add dash");
        player.runCommandAsync("tag @s add impacto");
        player.runCommandAsync("tag @s add dano_barion");
        damage2(player, 4, 3, 3);
      }, 0.4 * 20);

      mc.system.runTimeout(() => player.removeTag("delay"), 0.2 * 20);

      mc.system.runTimeout(() => {
        if (!player.hasTag("delay")) {
          player.removeTag("combo1");
          player.removeTag("combo2");
          player.removeTag("combo3");
          player.removeTag("combo4");
          player.removeTag("combo5");
          player.removeTag("combo6");
          player.removeTag("combo7");
          player.removeTag("combo8");
          player.removeTag("combo9");
          player.removeTag("combo10");
        }
      }, 0.75 * 20);
    }

    // DETECTA IMPACTO NO CHÃO
    if (player.hasTag("impacto") && player.isOnGround) {
      player.runCommandAsync("damage @e[tag=!dano_barion,r=5,type=!item,family=!jutsu] 40");
      player.runCommandAsync("particle tnt:barion_atk_chao");
      player.runCommandAsync("particle tnt:barion_atk_chao_2");
      player.runCommandAsync("particle tnt:impact_chao");
      player.runCommandAsync("playsound random.explode @a[r=35] ~ ~ ~ 1 1");
      player.removeTag("impacto");
      mc.system.runTimeout(() => player.removeTag("dano_barion"), 0.1 * 20);

    }
  }
});



function damage2(player, damage, distancia, raio) {
  const view = player.getViewDirection();

  const pos = {
    x: player.location.x + view.x * distancia,
    y: player.location.y + 1,
    z: player.location.z + view.z * distancia
  };

  const entities = player.dimension.getEntities({
    maxDistance: 3,
    location: pos
  });

  for (const e of entities) {
    if (e.id === player.id) continue;

    const dx = e.location.x - pos.x;
    const dz = e.location.z - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist <= raio) {
      e.applyDamage(damage ?? 1, { damagingEntity: player, cause: "entityAttack" });
      player.runCommandAsync(`playsound attack.hit @s`);
      try {
        const molang = new mc.MolangVariableMap();
        e.dimension.spawnParticle("tnt:hit_2", {
          x: e.location.x,
          y: e.location.y + 1,
          z: e.location.z
        }, molang);
      } catch (err) {
        console.warn("Erro spawnando partícula:", err);
      }
    }
  }
}




// Função de dano com partículas
function damage(player, damage, distancia, raio) {
  const view = player.getViewDirection();

  const pos = {
    x: player.location.x + view.x * distancia,
    y: player.location.y + 1,
    z: player.location.z + view.z * distancia
  };

  const entities = player.dimension.getEntities({
    maxDistance: 3,
    location: pos
  });

  for (const e of entities) {
    if (e.id === player.id) continue;

    const dx = e.location.x - pos.x;
    const dz = e.location.z - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist <= raio) {
      e.applyDamage(damage ?? 1, { damagingEntity: player, cause: "entityAttack" });
      player.runCommandAsync(`playsound attack.hit @s`);
      try {
        const molang = new mc.MolangVariableMap();
        e.dimension.spawnParticle("tnt:hit", {
          x: e.location.x,
          y: e.location.y + 1.3,
          z: e.location.z
        }, molang);
      } catch (err) {
        console.warn("Erro spawnando partícula:", err);
      }
    }
  }
}
