import * as mc from "@minecraft/server";

const TNT_ID = "tnt:meteorio_rine";  // seu identifier da TNT
const RADIUS = 20;              // raio total da explosão
const BATCH_SIZE = 10000;         // blocos processados por tick
const DIM = "overworld";

mc.world.beforeEvents.explosion.subscribe((ev) => {
  const src = ev.source;
  if (!src || src.typeId !== TNT_ID) return;

  // cancela explosão vanilla
  if (typeof ev.setCanceled === "function") ev.setCanceled(true);
  else ev.cancel = true;

  const center = src.location;
  const dim = mc.world.getDimension(DIM);

  const outerLayer = []; // casca da esfera (instantâneo)
  const inner = [];      // miolo (em lotes)

  const R = RADIUS;
  for (let x = -R; x <= R; x++) {
    for (let y = -R; y <= R; y++) {
      for (let z = -R; z <= R; z++) {
        const distSq = x*x + y*y + z*z;
        if (distSq <= R*R) {
          const bx = Math.floor(center.x + x);
          const by = Math.floor(center.y + y);
          const bz = Math.floor(center.z + z);

          if (distSq >= (R-2)*(R-2)) {
            // casca externa (instantâneo)
            outerLayer.push({x: bx, y: by, z: bz});
          } else {
            // resto do miolo
            inner.push({x: bx, y: by, z: bz});
          }
        }
      }
    }
  }

  // 1) Remove a casca instantaneamente
  for (const p of outerLayer) {
    const block = dim.getBlock(p);
    if (block && block.typeId !== "minecraft:bedrock") {
      try { block.setType("minecraft:air"); } catch {}
    }
  }

  // 2) Depois vai removendo o miolo em lotes
  let i = 0;
  const handle = mc.system.runInterval(() => {
    let count = 0;
    while (i < inner.length && count < BATCH_SIZE) {
      const p = inner[i++];
      const block = dim.getBlock(p);
      if (block && block.typeId !== "minecraft:bedrock") {
        try { block.setType("minecraft:air"); } catch {}
      }
      count++;
    }
    if (i >= inner.length) {
      mc.system.clearRun(handle);
    }
  }, 1); // 1 tick entre cada batch

  // 3) Efeitos visuais/sonoros extras
  try {
    dim.runCommandAsync(`particle tnt:meteorio_fumasa_impact ${center.x} ${center.y} ${center.z}`);
    dim.runCommandAsync(`playsound random.explode @a[r=${R+56}] ${center.x} ${center.y} ${center.z} 1 1`);
  } catch {}
});
