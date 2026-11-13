// Pedido de 11/10/2026: integrar páginas ao lobby sem perder HTML/SEO/AEO.
// Baseline: AEO ignorava EN/grupos, idioma trocava só o chrome e fundo exigia Three.js.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { SITE } from '../../src/lib/site-origin.mjs';
const root = new URL('../../', import.meta.url);
const dist = new URL('dist/client/', root);
const read = (file) => readFileSync(new URL(file, dist), 'utf8');
const pairs = [['como-jogar', 'how-to-play'], ['personagens', 'characters'], ['mapas', 'maps'], ['armas', 'weapons'], ['sobre', 'about'], ['changelog', 'whats-new']];
const routes = [...pairs.flat(), 'apoie', ...readdirSync(new URL('grupos/', dist), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => `grupos/${e.name}`)];
const pages = Object.fromEntries(routes.map(route => [route, read(`${route}/index.html`)]));
const index = JSON.parse(read('ai-index.json'));
const urls = new Set(index.entries.map(e => new URL(e.url).href));
const checks = {
  shell(html) { assert.match(html, /data-game-shell/); assert.doesNotMatch(html, /site-bg\.js|id="bg-canvas"/); },
  metadata(html, route) {
    assert.match(html, new RegExp(`<link rel="canonical" href="${SITE}/${route}"`));
    assert.match(html, /<meta name="description" content="[^"]+"/);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
    assert.match(html, /<main[^>]*id="conteudo"/);
    const lang = pairs.some(([, en]) => en === route) ? 'en' : 'pt-BR';
    assert.match(html, new RegExp(`<html[^>]*lang="${lang}"`));
    assert.match(html, /aria-current="page"/);
    assert.doesNotMatch(html, /(?:href|src)\s*=\s*["']\s*["']/i);
  },
  aeo(route) { assert.ok(urls.has(`${SITE}/${route}`), `${route} ausente do AEO`); },
};
let failures = 0;
for (const [route, html] of Object.entries(pages)) {
  for (const [name, check] of Object.entries(checks)) {
    try { name === 'aeo' ? check(route) : check(html, route); }
    catch (e) { failures++; console.error(`✗ /${route} ${name}: ${e.message.split('\n')[0]}`); }
  }
}
if (process.argv.includes('--mutate')) {
  const html = pages['mapas'];
  for (const [name, mutate] of Object.entries({
    shell: h => h.replace('data-game-shell', 'data-old-shell'),
    metadata: h => h.replace(`href="${SITE}/mapas"`, 'href="https://csbrasil.online/mapas"'),
  })) {
    const broken = mutate(html);
    assert.notEqual(broken, html, `mutação ${name} não aplicou`);
    assert.throws(() => checks[name](broken, 'mapas'), `régua ${name} cega`);
  }
  urls.delete(`${SITE}/maps`);
  assert.throws(() => checks.aeo('maps'), 'régua AEO cega');
  console.log('✓ 3 mutações detectadas');
}
console.log(`${routes.length * 3 - failures}/${routes.length * 3} contratos de páginas`);
process.exitCode = failures ? 1 : 0;

// As duas rotas centrais têm contratos próprios: a home é o jogo, /mapa é SSR.
const nodes = html => [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m => { const data = JSON.parse(m[1]); return data['@graph'] ?? [data]; });
const text = html => html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#(?:39|x27);/gi, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/\s+/g, ' ').trim();
function faq(html) {
  const schema = nodes(html).find(n => n['@type'] === 'FAQPage');
  assert.ok(schema?.mainEntity?.length, 'FAQ JSON-LD ausente');
  const details = [...html.matchAll(/<details[^>]*>([\s\S]*?)<\/details>/g)].map(m => [m[1].match(/<summary[^>]*>([\s\S]*?)<\/summary>/), m[1].match(/<p[^>]*>([\s\S]*?)<\/p>/)]).filter(([q, a]) => q && a).map(([q, a]) => [text(q[1]), text(a[1])]);
  for (const q of schema.mainEntity) assert.ok(details.some(([name, answer]) => name === text(q.name) && answer === text(q.acceptedAnswer.text)), `FAQ invisível ou divergente: ${q.name}`);
}
function home(html) {
  faq(html);
  assert.match(html, /id="hub-guide-frame"/);
  assert.doesNotMatch(html.match(/<iframe[^>]*id="hub-guide-frame"[^>]*>/)?.[0] ?? '', /\bsrc=|loading="lazy"/);
  for (const route of ['sobre', 'como-jogar', 'personagens', 'armas', 'mapas', 'mapa', 'changelog', 'apoie']) assert.match(html, new RegExp(`href="/${route}"[^>]*data-guide="${route}"`));
  assert.equal((html.match(/<summary data-en=/g) ?? []).length, nodes(html).find(n => n['@type'] === 'FAQPage').mainEntity.length, 'FAQ sem tradução EN');
  assert.doesNotMatch(html, /sem pessoas reais|seis facções fictícias/);
  // Gêmea EN da home: declarada só aqui (head próprio), nunca nas rotas do hub.
  assert.match(html, new RegExp(`<link rel="alternate" hreflang="en" href="${SITE}/en">`), 'home sem hreflang en');
  assert.match(html, /<meta property="og:locale:alternate" content="en_US">/, 'home sem og:locale:alternate');
}
// /en é a home que o buscador em inglês vê: não está no nav (sem aria-current),
// por isso não entra em `routes`; o contrato é próprio e mais estrito.
function enHome(html) {
  assert.match(html, new RegExp(`<link rel="canonical" href="${SITE}/en">`));
  assert.match(html, /<html[^>]*lang="en"/);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  assert.match(html, /<main[^>]*id="conteudo"/);
  assert.match(html, new RegExp(`<link rel="alternate" hreflang="pt-BR" href="${SITE}/">`), '/en sem hreflang pt-BR para a home');
  assert.match(html, new RegExp(`<link rel="alternate" hreflang="en" href="${SITE}/en">`), '/en sem auto-referência');
  assert.match(html, new RegExp(`<link rel="alternate" hreflang="x-default" href="${SITE}/">`), '/en com x-default fora da home PT');
  assert.match(html, /<meta property="og:locale" content="en_US">/);
  assert.match(html, /<meta property="og:locale:alternate" content="pt_BR">/);
  assert.match(html, /href="\/\?lang=en"/, '/en sem CTA pro jogo em inglês');
  for (const en of pairs.map(([, en]) => en)) assert.match(html, new RegExp(`href="/${en}"`), `/en não linka /${en}`);
  const webpage = nodes(html).find(n => n['@type'] === 'WebPage');
  assert.equal(webpage?.inLanguage, 'en');
  assert.equal(webpage?.mainEntity?.['@id'], `${SITE}/#game`, '/en não referencia o VideoGame da home');
  faq(html);
  assert.doesNotMatch(html, /(?:href|src)\s*=\s*["']\s*["']/i);
}
let extra = 0;
function contract(name, fn) {
  extra++;
  try { fn(); }
  catch (e) { failures++; console.error(`✗ ${name}: ${e.message.split('\n')[0]}`); }
}
const homeHtml = read('index.html');
contract('home: subtabs + FAQ visível/EN', () => home(homeHtml));
contract('home: AEO', () => assert.ok(urls.has(`${SITE}/`)));
const enHtml = read('en/index.html');
contract('/en: home em inglês (hreflang, JSON-LD, FAQ, links)', () => enHome(enHtml));
contract('/en: AEO', () => assert.ok(urls.has(`${SITE}/en`)));
const { fileURLToPath } = await import('node:url');
const { join } = await import('node:path');
// CSB_SSR_BASE (build Cloudflare): o handler importa `cloudflare:workers` e não roda em Node;
// /mapa é pedido a esse host e o AEO publicado é o de dist/client (o Workers serve dist/client direto).
const SSR_BASE = (process.env.CSB_SSR_BASE || '').replace(/\/$/, '');
const cwd = process.cwd();
let liveHtml;
if (SSR_BASE) {
  const response = await fetch(`${SSR_BASE}/mapa`);
  assert.equal(response.status, 200);
  liveHtml = await response.text();
} else {
  const functionDir = fileURLToPath(new URL('.vercel/output/_functions/', root));
  process.chdir(functionDir);
  try {
    const handler = (await import(new URL('.vercel/output/_functions/entry.mjs', root))).default;
    const response = await handler.fetch(new Request(`${SITE}/mapa`));
    assert.equal(response.status, 200);
    liveHtml = await response.text();
  } finally { process.chdir(cwd); }
}
for (const [name, check] of Object.entries(checks)) contract(`mapa SSR: ${name}`, () => name === 'aeo' ? check('mapa') : check(liveHtml, 'mapa'));
contract('mapa SSR: FAQ', () => faq(liveHtml));
contract(SSR_BASE ? 'AEO entregue no Workers' : 'AEO entregue na Vercel', () => {
  const publicado = SSR_BASE ? new URL('dist/client/ai-index.json', root) : new URL('.vercel/output/static/ai-index.json', root);
  const deployed = JSON.parse(readFileSync(publicado, 'utf8'));
  assert.deepEqual(deployed.entries.map(e => e.url), index.entries.map(e => e.url));
});
// A vitrine deve cobrir exatamente os mapas selecionáveis, com o modo inicial real.
const registry = readFileSync(new URL('public/js/maps.js', root), 'utf8');
const paused = new Set([...registry.match(/MAPAS_PARADOS = new Set\(\[([\s\S]*?)\]\)/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]));
const playable = [...registry.match(/export const MAPS = \{([\s\S]*?)\n\};/)[1].matchAll(/^\s+(\w+):\s*\{([^\n]+)/gm)].filter(m => !paused.has(m[1]));
const editorial = readFileSync(new URL('src/data/jogo.ts', root), 'utf8').split('export const MAPAS: Mapa[] = [')[1].split('export const GRUPOS')[0];
const defaults = new Map([...editorial.matchAll(/["']?id["']?:\s*["']([^"']+)["'][^{}]*["']?ctf["']?:\s*(true|false)/g)].map(m => [m[1], m[2] === 'true']));
const cards = nodes(pages.mapas).find(n => n['@type'] === 'ItemList').itemListElement;
contract('catálogo: todos os mapas selecionáveis', () => {
  assert.equal(cards.length, playable.length);
  for (const [, id, definition] of playable) {
    assert.match(pages.mapas, new RegExp(`id="${id}"`));
    assert.equal(defaults.get(id), /ctfMode:\s*true/.test(definition), `${id}: modo inicial diverge do runtime`);
    const name = definition.match(/name:\s*'([^']+)'/)[1];
    assert.ok(cards.some(card => card.name === name || card.item?.name === name), `${id} ausente do ItemList`);
  }
});
const PUBLICADO = SSR_BASE ? 'dist/client' : '.vercel/output/static';
contract('imagens de conteúdo no artefato publicado', () => {
  for (const [route, html] of Object.entries(pages)) for (const match of html.matchAll(/<img[^>]*src="(\/[^"]+)"/g)) {
    const pathname = new URL(match[1], SITE).pathname;
    assert.ok(existsSync(new URL(`${PUBLICADO}${pathname}`, root)), `${route}: imagem ausente ${pathname}`);
  }
});
if (process.argv.includes('--mutate')) {
  assert.throws(() => home(homeHtml.replace('data-guide="mapa"', 'data-guide="missing"')), 'subtabs cegas');
  assert.throws(() => faq(liveHtml.replace('O que aparece no mapa ao vivo?</summary>', 'Outra pergunta</summary>')), 'FAQ SSR cega');
  urls.delete(`${SITE}/mapa`);
  assert.throws(() => checks.aeo('mapa'), 'AEO SSR cego');
  urls.delete(`${SITE}/`);
  assert.throws(() => assert.ok(urls.has(`${SITE}/`)), 'AEO home cego');
  assert.throws(() => home(homeHtml.replace(`hreflang="en" href="${SITE}/en"`, `hreflang="en" href="${SITE}/about"`)), 'home → /en cego');
  assert.throws(() => enHome(enHtml.replace(`hreflang="pt-BR" href="${SITE}/"`, `hreflang="pt-BR" href="${SITE}/sobre"`)), '/en → home cego');
  assert.throws(() => enHome(enHtml.replace('"inLanguage":"en"', '"inLanguage":"pt-BR"')), '/en inLanguage cego');
  assert.throws(() => enHome(enHtml.replaceAll('href="/how-to-play"', 'href="/como-jogar"')), '/en links EN cegos');
  console.log('✓ 8 mutações centrais detectadas');
}
console.log(`${routes.length * 3 + extra - failures}/${routes.length * 3 + extra} contratos totais, incluindo home e SSR`);
process.exitCode = failures ? 1 : 0;
