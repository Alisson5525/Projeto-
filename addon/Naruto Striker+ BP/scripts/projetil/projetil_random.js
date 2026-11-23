import * as mc from "@minecraft/server";

// /scriptevent tnt:tenseigan_orb [velocidade opcional]
mc.system.afterEvents.scriptEventReceive.subscribe(ev => {
  if (!ev.id.startsWith("tnt:")) return;
  const id = ev.id.slice(4);
  const src = ev.sourceEntity;
  if (!src || src.typeId !== "minecraft:player") return;

  if (id === "tenseigan_orb") {
    const speed = Math.max(0.1, parseFloat(ev.message) || 2.5);
    fireFromSides(src, speed);
  }
});

function fireFromSides(player, speed) {
  const dir = normalize(player.getViewDirection());
  const up = { x: 0, y: 1, z: 0 };
  const side = normalize(cross(up, dir)); // lateral

  const sideFactor = Math.random() < 0.5 ? -1 : 1;

  const backDist = 1.4; // distância para trás fixa
  const base = {
    x: player.location.x - dir.x * backDist,
    y: player.location.y + 1,
    z: player.location.z - dir.z * backDist,
  };

  // randomizar deslocamento lateral (1.2 a 2 blocos)
  const sideDist = 1.2 + Math.random() * 0.8;

  // randomizar altura (pouco, pra não bater no chão)
  const yOffset = (Math.random() - 0.5) * 0.8; // entre -0.4 e +0.4

  const spawnPos = {
    x: base.x + side.x * sideFactor * sideDist,
    y: base.y + yOffset,
    z: base.z + side.z * sideFactor * sideDist,
  };

  let proj;
  try { proj = player.dimension.spawnEntity("tnt:teiseigan_chakra_orb", spawnPos); } catch { return; }

  mc.system.runTimeout(() => {
    if (!proj?.isValid) return;
    const v = { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed };
    // componente de projetil: velocidade exata e o jogador como dono (credito do abate,
    // sem acertar o proprio usuario). Sem o componente, cai no impulso fisico.
    const comp = proj.getComponent("minecraft:projectile");
    try {
      if (comp) { comp.owner = player; comp.shoot(v); return; }
    } catch {}
    try { proj.applyImpulse({ x: v.x * 0.4, y: v.y * 0.4, z: v.z * 0.4 }); } catch {}
  }, 1);
}

// helpers
function normalize(a) {
  const l = Math.hypot(a.x, a.y, a.z);
  return l > 0 ? { x: a.x / l, y: a.y / l, z: a.z / l } : { x: 0, y: 0, z: 0 };
}
function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}
