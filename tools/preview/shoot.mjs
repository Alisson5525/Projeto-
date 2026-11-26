// Uso: node shoot.mjs spec.json saida.png
// spec: {cols, cw, ch, cells:[...]}  (ver index.html)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const PREV = path.dirname(new URL(import.meta.url).pathname);
const types = { '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.html': 'text/html' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let file = p.startsWith('/superman_addon/') ? path.join(ROOT, p) : path.join(PREV, p === '/' ? 'index.html' : p);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
page.on('pageerror', e => console.error('[pageerror]', e.message));
await page.goto(`http://localhost:${port}/index.html`);
const animDir = path.join(ROOT, 'superman_addon/resource_pack/animations');
const files = fs.existsSync(animDir) ? fs.readdirSync(animDir).filter(f => f.endsWith('.json')) : [];
const n = await page.evaluate((f) => window.init(f), files);
const url = await page.evaluate(([c, cols, cw, ch]) => window.sheet(c, cols, cw, ch), [spec.cells, spec.cols || 4, spec.cw || 300, spec.ch || 360]);
fs.writeFileSync(process.argv[3], Buffer.from(url.split(',')[1], 'base64'));
console.log(`ok: ${spec.cells.length} quadros, ${n} animacoes -> ${process.argv[3]}`);
await browser.close();
server.close();
