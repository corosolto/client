/* IMPRESSÃO DIGITAL DA SIMULAÇÃO — o que o nó de multiplayer realmente roda deste repo.

   O nó vendoriza esta árvore e roda a classe `Game` headless. Ele e o navegador precisam
   simular o MESMO código, mas comparar `VERSION` é estrito demais: todo release muda a
   versão, inclusive os que só mexem em menu, chat ou docs, e cada um deles deixaria o nó
   "incompatível" até ser reimplantado. O que importa é o conteúdo dos módulos que o nó
   carrega — então é isso que se compara.

   Como: registra um gancho de `resolve`, importa os MESMOS pontos de entrada que o servidor
   importa daqui (backend `game/room.js` e `game/index.js`) e anota cada arquivo resolvido.
   `import('./x.js')` com caminho literal (carga preguiçosa) também entra. O hash é SHA-256
   de `caminho\0conteúdo\0` em ordem, sem `public/js/version.js` (que todo release reescreve e
   que é onde o próprio hash mora).

     node scripts/sim-hash.mjs           → imprime o hash
     node scripts/sim-hash.mjs --list    → imprime os arquivos que entram
     node scripts/sim-hash.mjs --write   → grava SIM_HASH em public/js/version.js

   O release.yml roda `--write` a cada bump; o backend compara o SIM_HASH do ref fixado com o
   do release novo para decidir se o nó precisa de imagem nova. Ver net.js:versaoCompativel. */
import { register } from 'node:module';
import { MessageChannel } from 'node:worker_threads';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSION_JS = 'public/js/version.js';
// O que o backend importa desta árvore. Entrada nova lá = linha nova aqui.
const ENTRADAS = [
  'tools/eval/harness.mjs',
  'public/js/game.js',
  'public/js/maps.js',
  'public/js/mapcat.js',
  'public/js/weapons.js',
  'public/js/netcodec.js',
];

const { port1, port2 } = new MessageChannel();
const vistos = new Set();
port1.on('message', (url) => vistos.add(url));
port1.unref();
register(`data:text/javascript,${encodeURIComponent(`
  let porta;
  export function initialize(d) { porta = d.porta; }
  export async function resolve(spec, ctx, next) {
    const r = await next(spec, ctx);
    if (r.url.startsWith('file:')) porta.postMessage(r.url);
    return r;
  }
`)}`, { data: { porta: port2 }, transferList: [port2] });

const raizReal = fs.realpathSync(ROOT);
/* `three` resolve para o pacote do npm onde houver `npm install`, e para o atalho que aponta
   o vendorizado onde não houver (o nó, o CI do release). O nó e o navegador rodam SEMPRE o
   vendorizado, então o pacote do npm é contado como o arquivo vendorizado equivalente — senão
   o hash dependeria de quem rodou `npm install`. */
const comoVendor = (real) => {
  const p = real.split(path.sep).join('/');
  // atalho `three` de OUTRO checkout (pai compartilhado): o arquivo equivalente é o desta árvore
  const outro = p.match(/\/public\/vendor\/(.+)$/);
  if (outro && !real.startsWith(raizReal + path.sep)) return `public/vendor/${outro[1]}`;
  const m = p.match(/\/node_modules\/three\/(.+)$/);
  if (!m) return null;
  if (m[1] === 'index.js' || m[1] === 'build/three.module.js') return 'public/vendor/three.module.js';
  const addon = m[1].match(/^(?:addons|examples\/jsm)\/(.+)$/);
  return addon ? `public/vendor/addons/${addon[1]}` : null;
};
const relativo = (url) => {
  const real = fs.realpathSync(fileURLToPath(url));
  const vendor = comoVendor(real);
  if (vendor) return vendor;
  if (!real.startsWith(raizReal + path.sep)) return null;   // node_modules fora da árvore, node:*
  const rel = path.relative(raizReal, real).split(path.sep).join('/');
  return /^(public|tools)\//.test(rel) ? rel : null;
};
const entregar = () => new Promise((ok) => setImmediate(ok));

for (const e of ENTRADAS) await import(pathToFileURL(path.join(ROOT, e)).href);
await entregar();

// Carga preguiçosa com caminho literal: segue até não aparecer arquivo novo.
const seguidos = new Set();
for (let mudou = true; mudou;) {
  mudou = false;
  for (const url of [...vistos]) {
    const rel = relativo(url);
    if (!rel || seguidos.has(rel) || !/\.m?js$/.test(rel)) continue;
    seguidos.add(rel);
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const [, spec] of src.matchAll(/import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g)) {
      const alvo = pathToFileURL(path.resolve(path.dirname(path.join(ROOT, rel)), spec)).href;
      if (vistos.has(alvo)) continue;
      try { await import(alvo); } catch { vistos.add(alvo); }   // módulo de browser: o arquivo conta mesmo sem subir
      mudou = true;
    }
  }
  await entregar();
}

const arquivos = [...new Set([...vistos].map(relativo).filter((r) => r && r !== VERSION_JS))].sort();
if (!arquivos.includes('public/js/game.js')) {
  console.error('sim-hash: public/js/game.js não apareceu no grafo — o gancho de resolve não registrou nada.');
  process.exit(1);
}
const h = createHash('sha256');
for (const rel of arquivos) h.update(rel).update('\0').update(fs.readFileSync(path.join(ROOT, rel))).update('\0');
const hash = h.digest('hex').slice(0, 16);

if (process.argv.includes('--list')) process.stdout.write(`${arquivos.join('\n')}\n`);
else if (process.argv.includes('--write')) {
  const p = path.join(ROOT, VERSION_JS);
  const src = fs.readFileSync(p, 'utf8');
  const linha = `export const SIM_HASH = '${hash}';`;
  const novo = /^export const SIM_HASH = '[^']*';$/m.test(src)
    ? src.replace(/^export const SIM_HASH = '[^']*';$/m, linha)
    : `${src.trimEnd()}\n${linha}\n`;
  fs.writeFileSync(p, novo);
  console.log(`SIM_HASH ${hash} (${arquivos.length} arquivos)`);
} else console.log(hash);
process.exit(0);
