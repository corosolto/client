/* CO1–CO5 — link de convite de sala carrega a origem até a aquisição do jogo.
 * Caso: até 13/10/2026 `linkDeConvite` gerava `/sala/BR-XXXX` sem utm/ref e o botão ENTRAR
 * NA SALA levava a `/?sala=…`; a aquisição gravava `landing: '/'` sem campanha e quem
 * chegava por convite virava "direto" no first-touch.
 * Mutantes: --mutante=link-sem-origem | cta-sem-origem | repassa-tudo | chave-errada | sem-teto */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const mut = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const raiz = new URL('../../', import.meta.url);
const ler = (p) => { try { return readFileSync(new URL(p, raiz), 'utf8'); } catch { return null; } };

let nos = ler('public/js/nos.js');
let lib = ler('src/lib/convite-origem.mjs');
let pagina = ler('src/pages/sala/[codigo].astro');
const main = ler('public/js/main.js');
const troca = (texto, velho, novo) => {
  const n = texto?.replace(velho, novo);
  if (!texto || n === texto) { console.error(`MUTANTE ${mut} NAO APLICOU`); process.exit(2); }
  return n;
};
if (mut === 'link-sem-origem') nos = troca(nos, '/sala/${convite}?${ORIGEM_CONVITE}`', '/sala/${convite}`');
if (mut === 'cta-sem-origem') pagina = troca(pagina, 'href={hrefEntrarNaSala(convite, Astro.url.searchParams)}', 'href={`/?sala=${encodeURIComponent(convite)}`}');
if (mut === 'repassa-tudo') lib = troca(lib, 'for (const chave of CHAVES_ORIGEM) {', 'for (const chave of new Set(origem.keys())) {');
if (mut === 'sem-teto') lib = troca(lib, 'valor && valor.length <= 60', 'valor');
if (mut === 'chave-errada') lib = troca(lib, "'utm_source', ", "'utm_src', ");

const falhas = [];
const cobra = (ok, msg) => { if (!ok) falhas.push(msg); };
const dir = mkdtempSync(join(tmpdir(), 'convite-origem-'));
const importa = async (nome, fonte) => { const f = join(dir, nome); writeFileSync(f, fonte); return import(pathToFileURL(f).href); };

const { linkDeConvite, parseConvite } = await importa('nos.mjs', nos);
const link = new URL(linkDeConvite('BR-7K3M', 'https://www.corosolto.com.br'));
const codigo = decodeURIComponent(link.pathname.split('/').pop());
cobra(link.pathname === '/sala/BR-7K3M' && /^([A-Z]{2})[-_]?([A-Z0-9]{3,8})$/.test(codigo) && parseConvite(codigo)?.convite === 'BR-7K3M',
  `CO1 o link de convite quebrou a rota /sala/BR-XXXX (${link.href})`);
cobra(link.searchParams.get('utm_source') === 'convite' && link.searchParams.get('utm_medium') === 'sala',
  `CO2 link de convite sem origem (${link.href}) — a aquisição grava quem chega por convite como "direto"`);

if (!lib) falhas.push('CO3 src/lib/convite-origem.mjs não existe — a página /sala não repassa a origem ao jogo');
else {
  const { hrefEntrarNaSala, CHAVES_ORIGEM } = await importa('lib.mjs', lib);
  const chegada = new URLSearchParams(`${link.search.slice(1)}&utm_campaign=lancamento&utm_content=video-curto&ref=AMIGO1&token=segredo&sala=US-XXXX`);
  const href = new URL(hrefEntrarNaSala('BR-7K3M', chegada), 'https://x');
  cobra(href.pathname === '/' && href.searchParams.get('sala') === 'BR-7K3M', `CO3 ENTRAR NA SALA perdeu ?sala (${href})`);
  cobra(href.searchParams.get('utm_source') === 'convite' && href.searchParams.get('utm_medium') === 'sala'
    && href.searchParams.get('utm_campaign') === 'lancamento' && href.searchParams.get('utm_content') === 'video-curto'
    && href.searchParams.get('ref') === 'AMIGO1',
  `CO3 ENTRAR NA SALA não repassa a origem completa (${href})`);
  const longo = new URL(hrefEntrarNaSala('BR-7K3M', new URLSearchParams({ utm_campaign: 'x'.repeat(61) })), 'https://x');
  cobra(!longo.searchParams.has('utm_campaign'), 'CO3 valor de origem acima de 60 caracteres (corte do backend) foi repassado');
  cobra(!href.searchParams.has('token'), `CO3 ENTRAR NA SALA repassa parâmetro fora da lista de origem (${href})`);
  const lidas = main ? [...(main.slice(main.indexOf('// AQUISIÇÃO (019)'), main.indexOf('// PERF (018)')).matchAll(/u\.get\('([a-z_]+)'\)/g))].map((m) => m[1]).sort() : [];
  cobra(lidas.length > 0 && JSON.stringify(lidas) === JSON.stringify([...CHAVES_ORIGEM].sort()),
    `CO4 chaves repassadas (${[...CHAVES_ORIGEM].join(',')}) ≠ chaves que a aquisição lê em main.js (${lidas.join(',') || 'nenhuma — régua não sabe medir'})`);
}
cobra(!!pagina && pagina.includes('href={hrefEntrarNaSala(convite, Astro.url.searchParams)}') && pagina.includes("from '../../lib/convite-origem.mjs'"),
  'CO5 o CTA de src/pages/sala/[codigo].astro não usa hrefEntrarNaSala — a origem do link morre na página de convite');

if (falhas.length) {
  console.error(`convite origem${mut ? ` [mutante ${mut}]` : ''}: ${falhas.length} FALHA(S)`);
  for (const f of falhas) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('convite origem: CO1–CO5 verde (rota /sala intacta, link com utm, CTA repassa só a origem que a aquisição lê)');
