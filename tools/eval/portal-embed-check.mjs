#!/usr/bin/env node
/* portal-embed-check.mjs — o wrapper de portal consegue embedar o site?
   Cada `tools/portal/<portal>/index.html` é um iframe para o site, servido pelo
   portal em hosts próprios (itch.io entrega em html-classic.itch.zone dentro
   de *.itch.io). `frame-ancestors` checa todos os ancestrais: um host faltando
   e o jogador vê tela preta. Ver docs/seguranca.md.
   Uso: node tools/eval/portal-embed-check.mjs [--mutate] */
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const root = new URL('../../', import.meta.url);
const read = (f) => readFileSync(new URL(f, root), 'utf8');

// Ancestrais que cada portal coloca entre a página e o nosso iframe.
const ANCESTRAIS = { itch: ['https://*.itch.io', 'https://*.itch.zone'] };
const SITE = 'https://www.corosolto.com.br/';

const frameAncestors = (vercelJson) => {
  const csp = JSON.parse(vercelJson).headers.flatMap((r) => r.headers || []).find((h) => h.key === 'Content-Security-Policy')?.value;
  assert.ok(csp, 'vercel.json sem Content-Security-Policy');
  const dir = csp.split(';').map((s) => s.trim()).find((s) => s.startsWith('frame-ancestors '));
  assert.ok(dir, 'CSP sem frame-ancestors');
  return new Set(dir.split(/\s+/).slice(1));
};

function check(vercelJson, wrappers) {
  const permitidos = frameAncestors(vercelJson);
  for (const [portal, html] of Object.entries(wrappers)) {
    assert.ok(ANCESTRAIS[portal], `${portal}: ancestrais não declarados em ANCESTRAIS`);
    for (const host of ANCESTRAIS[portal]) assert.ok(permitidos.has(host), `${portal}: frame-ancestors sem ${host}`);
    const src = html.match(/<iframe[^>]*\ssrc="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&');
    assert.ok(src, `${portal}: wrapper sem <iframe src>`);
    const url = new URL(src);
    assert.equal(url.origin + '/', SITE, `${portal}: iframe fora do site: ${src}`);
    assert.equal(url.searchParams.get('utm_source'), portal, `${portal}: utm_source deve ser "${portal}"`);
    assert.equal(url.searchParams.get('utm_medium'), 'portal', `${portal}: utm_medium deve ser "portal"`);
    const allow = html.match(/<iframe[^>]*\sallow="([^"]+)"/)?.[1] ?? '';
    for (const perm of ['pointer-lock', 'fullscreen']) assert.match(allow, new RegExp(`\\b${perm}\\b`), `${portal}: allow sem ${perm} (FPS sem mira/tela cheia)`);
    assert.doesNotMatch(html, /\s(?:src|href)="\/(?!\/)/, `${portal}: caminho absoluto "/..." quebra no CDN do portal`);
  }
}

const vercel = read('vercel.json');
const wrappers = Object.fromEntries(readdirSync(new URL('tools/portal/', root), { withFileTypes: true })
  .filter((e) => e.isDirectory()).map((e) => [e.name, read(`tools/portal/${e.name}/index.html`)]));
assert.ok(Object.keys(wrappers).length, 'nenhum wrapper em tools/portal/');

let falhas = 0;
try { check(vercel, wrappers); console.log(`✓ PE1 ${Object.keys(wrappers).join(', ')}: ancestrais liberados, iframe no site com UTM e pointer-lock`); }
catch (e) { falhas++; console.error(`✗ PE1 ${e.message}`); }

if (process.argv.includes('--mutate')) {
  const itch = wrappers.itch;
  const mutantes = {
    'frame-ancestors perde itch.zone': () => check(vercel.replace(' https://*.itch.zone', ''), wrappers),
    'iframe aponta pra outro host': () => check(vercel, { itch: itch.replace('https://www.corosolto.com.br/', 'https://csbrasil.online/') }),
    'iframe sem utm_source': () => check(vercel, { itch: itch.replace('utm_source=itch', 'utm_source=site') }),
    'allow sem pointer-lock': () => check(vercel, { itch: itch.replace('pointer-lock; ', '') }),
  };
  for (const [nome, fn] of Object.entries(mutantes)) {
    try { fn(); falhas++; console.error(`✗ mutante cego: ${nome}`); }
    catch { console.log(`✓ mutante morde: ${nome}`); }
  }
}
process.exitCode = falhas ? 1 : 0;
