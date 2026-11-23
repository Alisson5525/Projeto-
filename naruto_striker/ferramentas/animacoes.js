// Procura canais de animacao com catmull-rom que "passam do ponto" (overshoot) ou
// truques de esconder partes (posicoes enormes), que ficam estranhos com curvas.
// Uso: node ferramentas/animacoes.js resource_pack
const fs = require("fs"), path = require("path");
function walk(d, a = []) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p, a); else if (p.endsWith(".json")) a.push(p); } return a; }
const num = (v) => typeof v === "number" ? v : (typeof v === "string" && /^-?[0-9.]+$/.test(v) ? parseFloat(v) : null);
const susp = [];
for (const f of walk(path.join(process.argv[2] || "resource_pack", "animations"))) {
  const j = JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, ""));
  for (const [an, a] of Object.entries(j.animations || {})) for (const [bn, b] of Object.entries(a.bones || {})) for (const c of ["rotation", "position"]) {
    const v = b[c]; if (!v || Array.isArray(v) || typeof v !== "object") continue;
    const ts = Object.keys(v).sort((x, y) => x - y); if (!ts.some((t) => v[t] && v[t].lerp_mode === "catmullrom")) continue;
    const val = (t) => { const x = v[t]; return Array.isArray(x) ? x : (x.post || x.pre); };
    for (let k = 0; k < 3; k++) {
      const ys = ts.map((t) => num(val(t)[k])); if (ys.some((y) => y === null)) continue;
      let maxJump = 0; for (let i = 1; i < ys.length; i++) maxJump = Math.max(maxJump, Math.abs(ys[i] - ys[i - 1]));
      let over = 0;
      for (let i = 0; i < ys.length - 1; i++) {
        const p0 = ys[Math.max(0, i - 1)], p1 = ys[i], p2 = ys[i + 1], p3 = ys[Math.min(ys.length - 1, i + 2)], lo = Math.min(p1, p2), hi = Math.max(p1, p2);
        for (let s = 1; s < 20; s++) { const t = s / 20, t2 = t * t, t3 = t2 * t; const y = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); over = Math.max(over, y - hi, lo - y); }
      }
      if ((c === "position" && over > 3) || (over > Math.max(8, 0.35 * maxJump))) susp.push(`${c}[${k}] overshoot=${over.toFixed(1)} ${an} / ${bn} (${path.basename(f)})`);
    }
  }
}
console.log(susp.length ? susp.join("\n") : "OK: nenhum overshoot relevante");
