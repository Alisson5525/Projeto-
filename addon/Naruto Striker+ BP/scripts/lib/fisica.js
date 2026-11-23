// Empurrao/impulso compativel com a API 2.x.
// API 1.x: applyKnockback(dirX, dirZ, forcaHorizontal, forcaVertical)
// API 2.x: applyKnockback({ x, z } = direcao * forcaHorizontal, forcaVertical)
// A direcao horizontal e normalizada, mantendo o alcance constante do dash/jutsu.
export function empurrar(ent, dirX, dirZ, forcaH, forcaV) {
  try {
    const len = Math.hypot(dirX, dirZ);
    const x = len > 1e-6 ? (dirX / len) * forcaH : 0;
    const z = len > 1e-6 ? (dirZ / len) * forcaH : 0;
    ent.applyKnockback({ x, z }, forcaV);
    return true;
  } catch {
    return false;
  }
}
