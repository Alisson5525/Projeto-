// Resolve os imports dos scripts do add-on para rodar no Node:
//  - "@minecraft/server" e "@minecraft/server-ui" -> simuladores em ./mock
//  - imports relativos sem extensao ("./config") -> "./config.js"
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
export async function resolve(spec, ctx, next) {
  if (spec === '@minecraft/server') return { url: pathToFileURL(path.join(AQUI, 'mock', 'server.js')).href, shortCircuit: true };
  if (spec === '@minecraft/server-ui') return { url: pathToFileURL(path.join(AQUI, 'mock', 'server-ui.js')).href, shortCircuit: true };
  if ((spec.startsWith('./') || spec.startsWith('../')) && !path.extname(spec) && ctx.parentURL) {
    const p = path.resolve(path.dirname(fileURLToPath(ctx.parentURL)), spec + '.js');
    if (existsSync(p)) return { url: pathToFileURL(p).href, shortCircuit: true };
  }
  return next(spec, ctx);
}
