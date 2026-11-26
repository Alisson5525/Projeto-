// Pequena biblioteca de vetores 3D.
export const V = {
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
  mul: (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s }),
  dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
  len: (a) => Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z),
  dist: (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2),
  norm: (a) => {
    const l = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
    return l > 1e-6 ? { x: a.x / l, y: a.y / l, z: a.z / l } : { x: 0, y: 0, z: 0 };
  },
  lerp: (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }),
  cross: (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }),
  floor: (a) => ({ x: Math.floor(a.x), y: Math.floor(a.y), z: Math.floor(a.z) }),
  center: (b) => ({ x: b.x + 0.5, y: b.y + 0.5, z: b.z + 0.5 }),
  zero: () => ({ x: 0, y: 0, z: 0 }),
  /** Vetores frente (horizontal) e direita a partir da direcao do olhar. */
  basis(dir) {
    const f = V.norm({ x: dir.x, y: 0, z: dir.z });
    // Minecraft: olhando para +Z (sul) a direita e -X (oeste)
    return { fwd: f, right: { x: -f.z, y: 0, z: f.x } };
  },
  /** Direcao aleatoria dentro de um cone de meio-angulo `deg` em torno de `dir`. */
  cone(dir, deg) {
    const a = (deg * Math.PI) / 180;
    const up = Math.abs(dir.y) < 0.95 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    const u = V.norm(V.cross(dir, up));
    const w = V.cross(u, dir);
    const r = Math.tan(a) * Math.sqrt(Math.random());
    const t = Math.random() * Math.PI * 2;
    return V.norm(V.add(dir, V.add(V.mul(u, Math.cos(t) * r), V.mul(w, Math.sin(t) * r))));
  },
};

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const sign0 = (v, dead = 0.3) => (v > dead ? 1 : v < -dead ? -1 : 0);
