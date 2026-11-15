// Peças de arquitetura medieval para as estruturas: casas em enxaimel, telhados de duas águas, torres, postes e árvores.
import { B } from "./builder.js";

const AIR = "minecraft:air";

/** Telhado de duas águas sobre a caixa de paredes (x1..x2, z1..z2), começando em y0 (beiral com 1 bloco de sobra). */
export function gableRoof(p, x1, z1, x2, z2, y0, o = {}) {
  const stairs = o.stairs || "minecraft:dark_oak_stairs";
  const slab = o.slab || "minecraft:dark_oak_slab";
  const fill = o.gable || "minecraft:spruce_planks";
  const alongX = o.axis ? o.axis === "x" : x2 - x1 >= z2 - z1;
  for (let k = 0; k < 20; k++) {
    const y = y0 + k;
    if (alongX) {
      const za = z1 - 1 + k;
      const zb = z2 + 1 - k;
      if (za > zb) break;
      for (let x = x1 - 1; x <= x2 + 1; x++) {
        if (za === zb) p.set(x, y, za, B.slab(slab));
        else p.set(x, y, za, B.stairs(stairs, "south")).set(x, y, zb, B.stairs(stairs, "north"));
      }
      for (let z = za + 1; z <= zb - 1; z++) p.set(x1, y, z, fill).set(x2, y, z, fill);
    } else {
      const xa = x1 - 1 + k;
      const xb = x2 + 1 - k;
      if (xa > xb) break;
      for (let z = z1 - 1; z <= z2 + 1; z++) {
        if (xa === xb) p.set(xa, y, z, B.slab(slab));
        else p.set(xa, y, z, B.stairs(stairs, "east")).set(xb, y, z, B.stairs(stairs, "west"));
      }
      for (let x = xa + 1; x <= xb - 1; x++) p.set(x, y, z1, fill).set(x, y, z2, fill);
    }
  }
}

/**
 * Casa em enxaimel: base de pedra, paredes rebocadas com vigas de madeira, janelas, porta e telhado.
 * @param {any} p plano
 * @param {{x1:number,z1:number,x2:number,z2:number,h?:number,door:[string,number],wood?:string,plaster?:string,base?:string,
 *   floor?:string,roof?:any,windows?:boolean,open?:string[]}} o  door = [lado, posição ao longo da parede]
 */
export function house(p, o) {
  const { x1, z1, x2, z2 } = o;
  const h = o.h ?? 4;
  const log = o.wood || "minecraft:stripped_spruce_log";
  const plaster = o.plaster || "minecraft:white_terracotta";
  const base = o.base || "minecraft:cobblestone";
  const floor = o.floor || "minecraft:spruce_planks";
  p.fill(x1, 1, z1, x2, h + 8, z2, AIR);
  p.fill(x1, 0, z1, x2, 0, z2, base);
  p.fill(x1 + 1, 0, z1 + 1, x2 - 1, 0, z2 - 1, floor);
  const open = new Set(o.open || []);
  /** @type {any[]} */
  const sides = [
    ["north", (i) => [i, z1], x1, x2, "x"], ["south", (i) => [i, z2], x1, x2, "x"],
    ["west", (i) => [x1, i], z1, z2, "z"], ["east", (i) => [x2, i], z1, z2, "z"],
  ];
  for (const [side, at, a, b, axis] of sides) {
    if (open.has(side)) {
      for (let i = a; i <= b; i++) {
        const [x, z] = at(i);
        if (i === a || i === b || (i - a) % 4 === 0) for (let y = 1; y <= h; y++) p.set(x, y, z, B.log(log));
        p.set(x, h, z, B.log(log, axis));
      }
      continue;
    }
    for (let i = a; i <= b; i++) {
      const [x, z] = at(i);
      const corner = i === a || i === b;
      const post = corner || (i - a) % 4 === 0;
      for (let y = 1; y <= h; y++) {
        let blk;
        if (post) blk = B.log(log);
        else if (y === 1) blk = base;
        else if (y === h) blk = B.log(log, axis);
        else blk = plaster;
        if (!post && o.windows !== false && (y === 2 || y === 3) && h >= 4 && (i - a) % 4 === 2 && b - a >= 4) {
          blk = B.fence("minecraft:glass_pane", axis === "z", axis === "x");
        }
        p.set(x, y, z, blk);
      }
    }
  }
  // porta (vão de 2 blocos) e poste com lanterna ao lado, do lado de fora
  const [dside, dpos] = o.door;
  const dz = dside === "north" ? z1 : dside === "south" ? z2 : dpos;
  const dx = dside === "west" ? x1 : dside === "east" ? x2 : dpos;
  p.set(dx, 1, dz, AIR).set(dx, 2, dz, AIR).set(dx, 0, dz, floor);
  const out = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] }[dside];
  const along = dside === "north" || dside === "south" ? [1, 0] : [0, 1];
  const lx = dx + out[0] + along[0];
  const lz = dz + out[1] + along[1];
  p.set(lx, 1, lz, B.fence("minecraft:spruce_fence")).set(lx, 2, lz, B.lantern("minecraft:lantern"));
  gableRoof(p, x1, z1, x2, z2, h + 1, o.roof || {});
  // viga central sob a cumeeira com lanterna pendurada
  const cx = Math.round((x1 + x2) / 2);
  const cz = Math.round((z1 + z2) / 2);
  const alongX = o.roof?.axis ? o.roof.axis === "x" : x2 - x1 >= z2 - z1;
  if (alongX) for (let x = x1 + 1; x <= x2 - 1; x++) p.set(x, h, cz, B.log(log, "x"));
  else for (let z = z1 + 1; z <= z2 - 1; z++) p.set(cx, h, z, B.log(log, "z"));
  p.set(cx, h - 1, cz, B.lantern("minecraft:lantern", true));
  return { door: { x: dx, z: dz }, out: { x: dx + out[0], z: dz + out[1] } };
}

/** Torre de vigia quadrada com escada de mão, plataforma, ameias e telhado em pirâmide. */
export function watchtower(p, cx, cz, h = 9, doorSide = "south") {
  const ds = doorSide === "south" ? 1 : -1; // porta voltada para dentro da vila; escada na parede oposta
  const r = 2;
  for (let y = 0; y <= h; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      for (let z = cz - r; z <= cz + r; z++) {
        const edge = Math.abs(x - cx) === r || Math.abs(z - cz) === r;
        if (y === 0 || y === h) p.set(x, y, z, "minecraft:stone_bricks");
        else if (edge) p.set(x, y, z, p.pick([["minecraft:stone_bricks", 6], ["minecraft:cobblestone", 2], ["minecraft:mossy_stone_bricks", 2]]));
        else p.set(x, y, z, AIR);
      }
    }
  }
  for (let y = 1; y <= h; y++) p.set(cx, y, cz - ds, B.ladder(doorSide));
  p.set(cx, h, cz - ds, B.ladder(doorSide));
  for (let x = cx - r; x <= cx + r; x++) {
    for (let z = cz - r; z <= cz + r; z++) {
      const edge = Math.abs(x - cx) === r || Math.abs(z - cz) === r;
      if (!edge) continue;
      const corner = Math.abs(x - cx) === r && Math.abs(z - cz) === r;
      if (corner) for (let y = h + 1; y <= h + 3; y++) p.set(x, y, z, B.log("minecraft:spruce_log"));
      else if ((x + z) % 2 === 0) p.set(x, h + 1, z, "minecraft:stone_bricks");
    }
  }
  for (let k = 0; k <= r + 1; k++) {
    const y = h + 4 + k;
    const rr = r + 1 - k;
    for (let x = cx - rr; x <= cx + rr; x++) {
      for (let z = cz - rr; z <= cz + rr; z++) {
        if (rr === 0) p.set(x, y, z, B.slab("minecraft:dark_oak_slab"));
        else if (Math.abs(x - cx) === rr || Math.abs(z - cz) === rr) p.set(x, y, z, "minecraft:dark_oak_planks");
      }
    }
  }
  p.set(cx + 1, h + 1, cz + 1, B.lantern("minecraft:lantern"));
  p.set(cx, 1, cz + ds * r, AIR).set(cx, 2, cz + ds * r, AIR);
}

/** Poste de iluminação (cerca + lanterna). */
export function lampPost(p, x, z, h = 3) {
  for (let y = 1; y < h; y++) p.set(x, y, z, B.fence("minecraft:dark_oak_fence"));
  p.set(x, h, z, B.lantern("minecraft:lantern"));
}

/** Árvore decorativa pequena (folhas persistentes). */
export function smallTree(p, x, z, h = 4) {
  for (let y = 1; y <= h; y++) p.set(x, y, z, B.log("minecraft:oak_log"));
  const leaf = ["minecraft:oak_leaves", { persistent_bit: true, update_bit: false }];
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dy = -1; dy <= 1; dy++) {
        const d = Math.abs(dx) + Math.abs(dz) + Math.abs(dy) * 1.5;
        if (d > 3 || (dx === 0 && dz === 0 && dy < 1)) continue;
        if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
        if (p.rnd() < 0.15 && d > 2) continue;
        p.set(x + dx, h + dy, z + dz, leaf);
      }
    }
  }
  p.set(x, h + 2, z, leaf);
}
