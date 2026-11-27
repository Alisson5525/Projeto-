// Renderiza as prévias 3D (Arconte e armadura) com o Chromium do ambiente.
// Uso: node ferramentas/previa/renderizar.mjs <saida.png>
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const RAIZ = resolve(new URL('../..', import.meta.url).pathname);
const { execFileSync } = require('node:child_process');
execFileSync('python3', [join(RAIZ, 'ferramentas/previa/preparar.py')], { stdio: 'inherit' });
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const srv = http.createServer(async (req, res) => {
  try {
    const caminho = req.url === '/' ? '/ferramentas/previa/index.html' : decodeURIComponent(req.url.split('?')[0]);
    const dados = await readFile(join(RAIZ, caminho));
    res.writeHead(200, { 'content-type': TIPOS[extname(caminho)] || 'application/octet-stream' });
    res.end(dados);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => srv.listen(0, ok));
const porta = srv.address().port;
const nav = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pag = await nav.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
pag.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
pag.on('pageerror', (e) => console.error('erro na página:', e.message));
await pag.goto(`http://127.0.0.1:${porta}/`);
await pag.waitForFunction(() => document.title === 'pronto', null, { timeout: 30000 });
await pag.screenshot({ path: process.argv[2] || 'previa.png' });
await nav.close();
srv.close();
console.log('prévia salva em', process.argv[2]);
