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
    if (player.getProperty("tnt:kurama") != 4) continue;

    // ================= COMBO 1 =================
    if (player.hasTag("attack") && !player.hasTag("combo1") && !player.hasTag("delay")) {
      player.playAnimation("animation.mk1_combo_1", { blendOutTime: 0.2 });
      player.addTag("combo1");
      player.addTag("delay");

      runTimeoutSeguro(() => {
        player.runCommandAsync("playsound item.trident.riptide_1 @a[r=7] ^^^1 1 1 ")?.catch?.(() => {});
      }, 0);

      runTimeoutSeguro(() => {
        damage(player, 12, 2, 3);
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
      player.playAnimation("animation.mk1_combo_2", { blendOutTime: 0.2 });
      player.addTag("combo2");
      player.addTag("delay");

      runTimeoutSeguro(() => {
        player.runCommandAsync("playsound item.trident.riptide_1 @a[r=7] ^^^1 1 1 ")?.catch?.(() => {});
      }, 0);

      runTimeoutSeguro(() => {
        damage(player, 12, 2, 3);
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
      player.playAnimation("animation.mk1_combo_3", { blendOutTime: 0.2 });
      player.addTag("combo3");
      player.addTag("delay");

      runTimeoutSeguro(() => {
        player.runCommandAsync("playsound item.trident.riptide_1 @a[r=7] ^^^1 1 1 ")?.catch?.(() => {});
      }, 0);

      runTimeoutSeguro(() => {
        damage(player, 12, 2, 3);
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
  if (player.getProperty("tnt:kurama") != 4) return;

  if (player.hasTag("attack") && player.hasTag("combo3") && !player.hasTag("combo4") && !player.hasTag("delay")) {
    player.playAnimation("animation.mk1_special", { blendOutTime: 0.2 });
    player.addTag("combo4");
    player.addTag("delay");


    runTimeoutSeguro(() => {
      player.runCommandAsync("playsound mob.evocation_illager.cast_spell @a[r=7] ~ ~ ~ 1 1.2")?.catch?.(() => {});
    }, 0);


    runTimeoutSeguro(() => { player.runCommandAsync("playsound mob.evocation_illager.cast_spell @a[r=7] ~ ~ ~ 1 1.2");}, 0.1 * 36);
    runTimeoutSeguro(() => { player.runCommandAsync("playsound mob.evocation_illager.cast_spell @a[r=7] ~ ~ ~ 1 1.2");}, 0.3 * 36);

    runTimeoutSeguro(() => {
      player.runCommandAsync("tp @e[rm=1,c=1,r=5] ^^1^3")?.catch?.(() => {});
      damage(player, 4, 3, 3);
    }, 0.13 * 36);

    runTimeoutSeguro(() => { player.runCommandAsync("tp @e[rm=1,c=1,r=5] ^^1^3");  damage_rasen_bj(player, 4, 3, 3); }, 0.16 * 36);
    runTimeoutSeguro(() => { player.runCommandAsync("tp @e[rm=1,c=1,r=5] ^^1^3");  damage_rasen_bj(player, 4, 3, 3); }, 0.18 * 36);
    runTimeoutSeguro(() => { player.runCommandAsync("tp @e[rm=1,c=1,r=5] ^^1^3");  damage_rasen_bj(player, 4, 3, 3); }, 0.20 * 36);
    runTimeoutSeguro(() => { player.runCommandAsync("tp @e[rm=1,c=1,r=5] ^^1^3");  damage_rasen_bj(player, 4, 3, 3); }, 0.22 * 36);
    runTimeoutSeguro(() => { player.runCommandAsync("tp @e[rm=1,c=1,r=5] ^^1^3");  damage_rasen_bj(player, 4, 3, 3); }, 0.24 * 36);
    runTimeoutSeguro(() => { player.runCommandAsync("tp @e[rm=1,c=1,r=5] ^^1^3");  damage_rasen_bj(player, 4, 3, 3); }, 0.26 * 36);
    runTimeoutSeguro(() => { player.runCommandAsync("tp @e[rm=1,c=1,r=5] ^^1^3");  damage_rasen_bj(player, 4, 3, 3); }, 0.28 * 36);
    runTimeoutSeguro(() => { player.runCommandAsync("tp @e[rm=1,c=1,r=5] ^^1^3");  damage_rasen_bj(player, 8, 3, 3); }, 0.30 * 36);
    runTimeoutSeguro(() => { player.runCommandAsync("tp @e[rm=1,c=1,r=5] ^^1^3");  damage_rasen_bj(player, 9, 3, 3); }, 0.32 * 36);
    runTimeoutSeguro(() => { player.runCommandAsync("tp @e[rm=1,c=1,r=5] ^^1^3");  damage_rasen_bj(player, 10, 3, 3); }, 0.34 * 36);


    runTimeoutSeguro(() => player.removeTag("delay"), 0.5 * 36);

    runTimeoutSeguro(() => {
      if (!player.hasTag("delay")) {
        player.removeTag("combo1");
        player.removeTag("combo2");
        player.removeTag("combo3");
        player.removeTag("combo4");
      }
    }, 0.75 * 60);
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
      player.runCommandAsync(`playsound attack.hit @s`)?.catch?.(() => {});

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

function damage_rasen_bj(player, damage, distancia, raio) {
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
      player.runCommandAsync(`playsound mob.evocation_illager.cast_spell @a[r=7] ~ ~ ~ 1 1.2`)?.catch?.(() => {});

      // Partícula no inimigo atingido
      try {
        const molang = new mc.MolangVariableMap();
        e.dimension.spawnParticle("tnt:critical_hit_hyuga", {
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
