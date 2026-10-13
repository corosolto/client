/* brasao-versao-check.mjs — o brasão trocado chega ao jogador sem esperar o edge?
 *
 * O edge da Cloudflare segura /img/ por 30 dias (scripts/cloudflare-setup.sh) e o deploy
 * normal pela Vercel não purga nada. Em 13/10/2026 /img/brasoes/b.png servia 32846 B (HIT,
 * age 499741 s) contra 21692 B na main; o mesmo arquivo com ?v= qualquer vinha 21692 B.
 *
 *   BV1  public/js/brasoes_versao.js tem o hash de conteúdo de cada PNG de public/img/brasoes;
 *   BV2  a bandeira do CTF (brasoes.js) pede cada brasão com ?v= do conteúdo atual;
 *   BV3  o placar (game.js _showScoreboard) idem;
 *   BV4  varredura de public/js, src e public/style.css: URL de brasão sem ?v= só onde a
 *        dívida está declarada abaixo, e nunca em número maior.
 *
 * Mutações (sai 1 se a mutação PASSAR):
 *   --mutante=defasado   versão de b.png velha no manifesto em memória
 *   --mutante=sem-v      placar de game.js volta à URL crua (o estado da main antes)
 *
 *   node tools/eval/brasao-versao-check.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { versoes, fonte, OUT } from '../gen-brasoes-versao.mjs';

const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (!['', 'defasado', 'sem-v'].includes(MUTANTE)) { console.error(`mutante desconhecido: ${MUTANTE}`); process.exit(1); }
const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/* Dívida fora desta frente (menu e CSS de outro dono). Só pode descer. */
const DIVIDA = { 'public/js/main.js': 3, 'src/pages/index.astro': 7, 'public/style.css': 6 };

const disco = versoes();
let manifesto = readFileSync(OUT, 'utf8');
if (MUTANTE === 'defasado') {
  const m = manifesto.replace(/"b":"[0-9a-f]{12}"/, '"b":"000000000000"');
  if (m === manifesto) { console.error('MUTANTE NAO APLICOU: defasado'); process.exit(1); }
  manifesto = m;
}
const BV1 = manifesto === fonte(disco);

const harness = await import('./harness.mjs');
if (MUTANTE === 'sem-v') {
  const Game = harness.Game;
  const src = Game.prototype._showScoreboard.toString();
  const mut = src.replaceAll('urlDoBrasao(', '((l) => `img/brasoes/${l}.png`)(');
  if (mut === src) { console.error('MUTANTE NAO APLICOU: sem-v'); process.exit(1); }
  const { tr } = await import('../../public/js/i18n.js');
  Game.prototype._showScoreboard = new Function('tr', `return ({ ${mut} })._showScoreboard;`)(tr);
}
const urlsBoas = (urls) => urls.length > 0 && urls.every((u) => {
  const m = u.match(/img\/brasoes\/([a-z])\.png\?v=([0-9a-f]{12})$/);
  return m && disco[m[1]] === m[2];
});

const pedidas = [];
const ImageOrig = globalThis.Image;
globalThis.Image = class extends ImageOrig { set src(v) { pedidas.push(v); super.src = v; } get src() { return super.src; } };
const brasoes = await import('../../public/js/brasoes.js');
for (const f of brasoes.FACCOES_COM_BRASAO) brasoes.bandeiraTextura(f);
globalThis.Image = ImageOrig;
const BV2 = urlsBoas(pedidas);

const g = harness.bootGame('praca_poderes', { textures: harness.initTextures() });
g._showScoreboard(true);
const html = Object.values(globalThis.__els).map((e) => e && e.innerHTML || '').join('\n');
const doPlacar = [...html.matchAll(/src="([^"]*brasoes\/[^"]*)"/g)].map((m) => m[1]);
const BV3 = urlsBoas(doPlacar);

const varrer = (dir, ext, out = []) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (n !== 'vendor') varrer(p, ext, out); } else if (ext.some((e) => n.endsWith(e))) out.push(p);
  }
  return out;
};
const arquivos = [...varrer(join(ROOT, 'public/js'), ['.js']), ...varrer(join(ROOT, 'src'), ['.astro', '.ts', '.js']), join(ROOT, 'public/style.css')];
const achados = {};
for (const p of arquivos) {
  let s = readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const n = [...s.matchAll(/img\/brasoes\/(?:[a-z]|\$\{[^}]*\})\.png(?!\?v=)/g)].length;
  if (n) achados[relative(ROOT, p)] = n;
}
const novos = Object.entries(achados).filter(([f, n]) => n > (DIVIDA[f] || 0));
const pagos = Object.entries(DIVIDA).filter(([f, n]) => (achados[f] || 0) < n);
const BV4 = novos.length === 0 && pagos.length === 0;

const res = [
  ['BV1', 'manifesto de versões em dia com public/img/brasoes', BV1,
    BV1 ? `${Object.keys(disco).length} brasões` : 'rode `npm run brasoes:versao` e commite public/js/brasoes_versao.js'],
  ['BV2', 'bandeira do CTF pede o brasão com ?v= do conteúdo', BV2, `${pedidas.length} pedidos, ex.: ${pedidas[0]}`],
  ['BV3', 'placar pede o brasão com ?v= do conteúdo', BV3, `${doPlacar.length} imagens, ex.: ${doPlacar[0]}`],
  ['BV4', 'nenhuma URL de brasão nova sem ?v=', BV4,
    novos.length ? `sem versão: ${novos.map(([f, n]) => `${f} (${n})`).join(', ')} — use urlDoBrasao de public/js/brasoes_versao.js`
      : pagos.length ? `dívida paga em ${pagos.map(([f]) => f).join(', ')}: baixe DIVIDA neste arquivo` : `dívida declarada: ${JSON.stringify(achados)}`],
];
for (const [id, desc, ok, evid] of res) console.log(`${ok ? '✓' : '✗'} ${id}  ${desc} — ${evid}`);
const falhou = res.some(([, , ok]) => !ok);
if (MUTANTE) {
  console.log(falhou ? `✓ mutante ${MUTANTE} ficou vermelho` : `✗ mutante ${MUTANTE} PASSOU — régua cega`);
  process.exit(falhou ? 0 : 1);
}
process.exit(falhou ? 1 : 0);
