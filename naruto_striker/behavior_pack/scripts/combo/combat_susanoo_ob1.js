import * as mc from "@minecraft/server";

// Agenda com protecao: se o jogador sair/morrer no meio do combo, o callback nao gera erro.
function runTimeoutSeguro(fn, ticks) {
  return mc.system.runTimeout(() => {
    try { fn(); } catch (e) {}
  }, ticks);
}

mc.system.runInterval(() => {
  for (const player of mc.world.getPlayers()) {
    try {
    if (player.getProperty("tnt:uchiha") != 9) continue;

    // ================= COMBO 1 =================
    if (player.hasTag("attack") && !player.hasTag("combo1") && !player.hasTag("delay")) {
      player.playAnimation("animation.susanoo_sk1_combo_1", { blendOutTime: 0.2 });
      player.addTag("combo1");
      player.addTag("delay");

      runTimeoutSeguro(() => {
        player.runCommandAsync("playsound mob.evocation_illager.cast_spell @a[r=7] ~ ~ ~ 1 1.2");
      }, 0);

      runTimeoutSeguro(() => {
        damage(player, 9, 2, 3);
      }, 0.13 * 20);

      runTimeoutSeguro(() => player.removeTag("delay"), 0.5 * 20);

      runTimeoutSeguro(() => {
        if (!player.hasTag("delay")) {
          player.removeTag("combo1");
        }
      }, 0.75 * 20);
    }

    // ================= COMBO 2 =================
    if (player.hasTag("attack") && player.hasTag("combo1") && !player.hasTag("combo2") && !player.hasTag("delay")) {
      player.playAnimation("animation.susanoo_sk1_combo_2", { blendOutTime: 0.2 });
      player.addTag("combo2");
      player.addTag("delay");

      runTimeoutSeguro(() => {
        player.runCommandAsync("playsound mob.evocation_illager.cast_spell @a[r=7] ~ ~ ~ 1 1.2");
      }, 0);

      runTimeoutSeguro(() => {
        damage(player, 9, 2, 3);
      }, 0.13 * 20);

      runTimeoutSeguro(() => player.removeTag("delay"), 0.5 * 20);

      runTimeoutSeguro(() => {
        if (!player.hasTag("delay")) {
          player.removeTag("combo1");
          player.removeTag("combo2");
        }
      }, 0.75 * 20);
    }

    // ================= COMBO 3 =================
    if (player.hasTag("attack") && player.hasTag("combo2") && !player.hasTag("combo3") && !player.hasTag("delay")) {
      player.playAnimation("animation.susanoo_sk1_combo_3", { blendOutTime: 0.2 });
      player.addTag("combo3");
      player.addTag("delay");

      runTimeoutSeguro(() => {
        player.runCommandAsync("playsound mob.evocation_illager.cast_spell @a[r=7] ~ ~ ~ 1 1.2");
      }, 0);

      runTimeoutSeguro(() => {
        damage(player, 9, 2, 3);
      }, 0.13 * 20);

      runTimeoutSeguro(() => player.removeTag("delay"), 0.5 * 20);

      runTimeoutSeguro(() => {
        if (!player.hasTag("delay")) {
          player.removeTag("combo1");
          player.removeTag("combo2");
          player.removeTag("combo3");
        }
      }, 0.75 * 20);
    }
  
    } catch (e) {}
  }
});

// ================= COMBO 4 =================
mc.world.afterEvents.entityHitEntity.subscribe((event) => {
  const player = event.damagingEntity;
  const target = event.hitEntity;

  if (!player || !target || player.typeId !== "minecraft:player") return;
  if (player.getProperty("tnt:uchiha") != 9) return;

  if (player.hasTag("attack") && player.hasTag("combo3") && !player.hasTag("combo4") && !player.hasTag("delay")) {
    player.playAnimation("animation.susanoo_sk1_combo_4", { blendOutTime: 0.2 });
    player.addTag("combo4");
    player.addTag("delay");

    runTimeoutSeguro(() => {
      player.runCommandAsync("tag @s add susanoo_ob1_corte");
    }, 0 * 20);    

    runTimeoutSeguro(() => {
      player.runCommandAsync("playsound mob.evocation_illager.cast_spell @a[r=7] ~ ~ ~ 1 1.2");
      player.runCommandAsync(`summon tnt:susanoo_ob1_corte ~ ~ ~ ~ ~100`);
      player.runCommandAsync(`summon tnt:susanoo_ob1_corte ~ ~ ~ ~15 ~100`);
      player.runCommandAsync(`summon tnt:susanoo_ob1_corte ~ ~ ~ ~-15 ~100`);
    }, 0.1);

    runTimeoutSeguro(() => {
      player.runCommandAsync("tag @s remove susanoo_ob1_corte");
    }, 0.4 * 20);


    runTimeoutSeguro(() => {
      damage(player, 9, 2, 3);
    }, 0.13 * 20);

    runTimeoutSeguro(() => player.removeTag("delay"), 0.5 * 20);

    runTimeoutSeguro(() => {
      if (!player.hasTag("delay")) {
        player.removeTag("combo1");
        player.removeTag("combo2");
        player.removeTag("combo3");
        player.removeTag("combo4");
      }
    }, 0.75 * 20);
  }
});

// Função de dano com partículas no inimigo
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
    // Evita atingir o próprio player
    if (e.id === player.id) continue;

    const dx = e.location.x - pos.x;
    const dz = e.location.z - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist <= raio) {
      e.applyDamage(damage ?? 1, { damagingEntity: player, cause: "entityAttack" });
      player.runCommandAsync(`playsound attack.hit @s`);

      // Partícula no inimigo atingido
      try {
        const molang = new mc.MolangVariableMap();
        e.dimension.spawnParticle("tnt:sangue", {
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
