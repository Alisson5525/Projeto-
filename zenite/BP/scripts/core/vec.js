// Matemática de vetores 3D (pura, sem dependência do jogo).

/** @typedef {{x:number,y:number,z:number}} V3 */

/** @param {V3} a @param {V3} b @returns {V3} */
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
/** @param {V3} a @param {V3} b @returns {V3} */
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
/** @param {V3} v @param {number} k @returns {V3} */
export const scale = (v, k) => ({ x: v.x * k, y: v.y * k, z: v.z * k });
/** @param {V3} a @param {V3} b */
export const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
/** @param {V3} v */
export const len = (v) => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
/** @param {V3} a @param {V3} b */
export const dist = (a, b) => len(sub(a, b));
/** @param {V3} a @param {V3} b @returns {V3} */
export const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
/** @param {V3} a @param {V3} b @param {number} t @returns {V3} */
export const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });

/** Vetor unitário; o vetor nulo continua nulo. @param {V3} v @returns {V3} */
export function norm(v) {
  const l = len(v);
  return l < 1e-12 ? { x: 0, y: 0, z: 0 } : scale(v, 1 / l);
}

/** Rotação em torno do eixo Y. @param {V3} v @param {number} rad @returns {V3} */
export function rotY(v, rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: v.x * c - v.z * s, y: v.y, z: v.x * s + v.z * c };
}

/**
 * Base ortonormal perpendicular à direção de olhar: "direita" (mão direita do
 * jogador) e "cima" (topo da tela). Funciona mesmo olhando reto para cima.
 * @param {V3} dir
 */
export function basePerpendicular(dir) {
  const d = norm(dir);
  let direita = cross(d, { x: 0, y: 1, z: 0 });
  if (len(direita) < 1e-6) direita = cross(d, { x: 0, y: 0, z: 1 });
  direita = norm(direita);
  const cima = norm(cross(direita, d));
  return { direita, cima };
}

/** Arredonda para o bloco que contém o ponto. @param {V3} v @returns {V3} */
export const bloco = (v) => ({ x: Math.floor(v.x), y: Math.floor(v.y), z: Math.floor(v.z) });

/** Centro do bloco. @param {V3} v @returns {V3} */
export const centro = (v) => ({ x: Math.floor(v.x) + 0.5, y: Math.floor(v.y) + 0.5, z: Math.floor(v.z) + 0.5 });

/**
 * Casca de esfera de raio r com 1 bloco de espessura e sem frestas:
 * todos os blocos da bola com algum vizinho de face fora dela.
 * Ordenada de cima para baixo (a cúpula "fecha" a partir do topo).
 * @param {number} r @returns {V3[]}
 */
export function pontosEsfera(r) {
  const r2 = r * r;
  const fora = (x, y, z) => x * x + y * y + z * z > r2;
  /** @type {(V3 & {a:number})[]} */
  const pts = [];
  const R = Math.ceil(r);
  for (let x = -R; x <= R; x++) {
    for (let y = -R; y <= R; y++) {
      for (let z = -R; z <= R; z++) {
        if (fora(x, y, z)) continue;
        if (fora(x + 1, y, z) || fora(x - 1, y, z) || fora(x, y + 1, z) || fora(x, y - 1, z) || fora(x, y, z + 1) || fora(x, y, z - 1)) {
          pts.push({ x, y, z, a: Math.atan2(z, x) });
        }
      }
    }
  }
  pts.sort((p, q) => q.y - p.y || p.a - q.a);
  return pts.map(({ x, y, z }) => ({ x, y, z }));
}

/**
 * Todos os blocos de uma bola de raio r, do centro para fora.
 * @param {number} r @returns {V3[]}
 */
export function pontosBola(r) {
  const r2 = r * r;
  const R = Math.ceil(r);
  /** @type {(V3 & {d:number})[]} */
  const pts = [];
  for (let x = -R; x <= R; x++) {
    for (let y = -R; y <= R; y++) {
      for (let z = -R; z <= R; z++) {
        const d = x * x + y * y + z * z;
        if (d <= r2) pts.push({ x, y, z, d });
      }
    }
  }
  pts.sort((p, q) => p.d - q.d);
  return pts.map(({ x, y, z }) => ({ x, y, z }));
}
