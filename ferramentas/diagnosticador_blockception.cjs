// Driver do diagnosticador Blockception para um projeto com BP e RP.
const fs = require("fs"), path = require("path");
const { Diagnoser, DiagnosticSeverity } = require("bc-minecraft-bedrock-diagnoser");
const { ProjectData, MinecraftData } = require("bc-minecraft-bedrock-project");
const { MCProject } = require("bc-minecraft-project");

const raiz = process.argv[2];
const cache = new Map();
function lerTexto(uri) {
  if (cache.has(uri)) return cache.get(uri);
  let t; try { t = fs.readFileSync(uri, "utf8").replace(/^﻿/, ""); } catch { t = undefined; }
  cache.set(uri, t); return t;
}
function getDocument(uri) {
  const t = lerTexto(uri);
  if (t === undefined) return undefined;
  return { uri, getText(range) { if (!range) return t; const s = typeof range.start === "number" ? range.start : 0; const e = typeof range.end === "number" ? range.end : t.length; return t.slice(s, e); } };
}
function globParaRegex(g) {
  let r = "^"; for (let i = 0; i < g.length; i++) { const c = g[i];
    if (c === "*") { if (g[i + 1] === "*") { r += ".*"; i++; if (g[i + 1] === "/") i++; } else r += "[^/]*"; }
    else if (c === "?") r += "."; else if (c === "{") r += "("; else if (c === "}") r += ")"; else if (c === "," ) r += "|"; else if ("\\.+^$()[]|".includes(c)) r += "\\" + c; else r += c; }
  return new RegExp(r + "$");
}
function listar(d) { const out = []; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) out.push(...listar(p)); else out.push(p); } return out; }
const util = (f) => !/\.txt$/i.test(f);
function getFiles(folder, patterns) {
  if (!patterns || patterns.includes("*") || patterns.includes("**/*")) return listar(folder).filter(util);
  const regs = patterns.map(globParaRegex);
  return listar(folder).filter((f) => { const rel = path.relative(folder, f).split(path.sep).join("/"); return regs.some((r) => r.test(rel) || r.test(f)); });
}
const docs = { getDocument, getFiles };
const pd = new ProjectData(docs);
const projeto = MCProject.createEmpty();
const packs = [];
for (const m of listar(raiz).filter((f) => path.basename(f) === "manifest.json")) {
  const p = pd.addPack(m, projeto); if (p) packs.push(p);
}
for (const p of packs) for (const f of listar(p.folder).filter(util)) { const d = getDocument(f); if (d) try { pd.process(d); } catch (e) { console.error("process", f, e.message); } }
const mcdata = new MinecraftData(pd);
const achados = [];
function linhaDe(uri, pos) {
  const t = lerTexto(uri) ?? "";
  if (typeof pos === "number") return t.slice(0, pos).split("\n").length;
  if (pos && typeof pos.line === "number") return pos.line + 1;
  if (pos && typeof pos.start === "number") return t.slice(0, pos.start).split("\n").length;
  return 0;
}
const ctx = {
  getDocument, getFiles, getProjectData: () => mcdata,
  getDiagnoser(doc, project) {
    return { context: ctx, project, done() {}, add(position, message, severity, code) { achados.push({ uri: doc.uri, linha: linhaDe(doc.uri, position), message, severity, code: String(code) }); } };
  },
};
const diag = new Diagnoser(ctx);
for (const p of packs) { try { diag.processPack(p); } catch (e) { console.error("diag", p.folder, e.stack); } }
fs.writeFileSync(process.argv[3], JSON.stringify(achados, null, 1));
const sev = ["none", "info", "warning", "error"];
const cont = {}; for (const a of achados) { const k = sev[a.severity] + " " + a.code; cont[k] = (cont[k] ?? 0) + 1; }
console.log("pacotes:", packs.map((p) => p.folder));
console.log(Object.entries(cont).sort((a, b) => b[1] - a[1]).map(([k, v]) => v + "\t" + k).join("\n"));
