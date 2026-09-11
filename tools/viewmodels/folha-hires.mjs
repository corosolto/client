#!/usr/bin/env node
/* ============================================================================
   folha-hires.mjs — UMA PÁGINA COM AS 24 ARMAS PARA O DONO JULGAR DE UMA VEZ.
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O Gauntlet manda entregar a página viva a cada rodada: o dono acompanha do
   celular sem interromper o loop. E a lei 3 da casa manda OLHAR a figura — mas
   olhar 24 pastas de render, uma a uma, é o que faz ninguém olhar.

   Junta o `idle` de cada piloto recém-construído ao lado do da AK aprovada, na
   MESMA escala de exibição, porque o defeito que o dono relatou é justamente de
   escala: "algumas gigantes outras pequenas". Comparação lado a lado no mesmo
   tamanho é o que denuncia isso; miniatura reescalada por arma esconde.

   Embute como data URL para a página abrir sem servidor e sobreviver a mover de
   pasta — o dono abre no celular.

   USO
     node tools/viewmodels/folha-hires.mjs [--saida=artifacts/folha-hires.html]
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const RAIZ = process.cwd();
const HIRES = path.join(RAIZ, 'artifacts/viewmodels/hires-v3');
const REF = path.join(RAIZ, 'artifacts/viewmodels/hires-v3/ak/renders/idle_000.png');
const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? d;
const SAIDA = path.join(RAIZ, arg('saida', 'artifacts/folha-hires.html'));

/* 760px de largura e JPEG q62: 34 pares cabem em ~2MB, medido pelo Gauntlet.
   Acima disso a página não abre no celular, que é onde o dono julga. */
function miniatura(png) {
  if (!fs.existsSync(png)) return null;
  const tmp = path.join('/tmp', `folha-${path.basename(path.dirname(path.dirname(png)))}.jpg`);
  try {
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '62', '-Z', '760', png, '--out', tmp], { stdio: 'pipe' });
    return `data:image/jpeg;base64,${fs.readFileSync(tmp).toString('base64')}`;
  } catch {
    return null;
  }
}

const armas = fs.existsSync(HIRES)
  ? fs.readdirSync(HIRES).filter((d) => d !== 'ak' && fs.existsSync(path.join(HIRES, d, 'ak-hires-pilot.glb')) && fs.existsSync(path.join(HIRES, d, 'renders/idle_000.png'))).sort()
  : [];

const refUrl = miniatura(REF);
const cartoes = armas.map((a) => {
  const url = miniatura(path.join(HIRES, a, 'renders/idle_000.png'));
  const glb = path.join(HIRES, a, 'ak-hires-pilot.glb');
  const bytes = fs.existsSync(glb) ? fs.statSync(glb).size : 0;
  return { arma: a, url, bytes };
}).filter((c) => c.url);

const html = `<title>Pilotos hires — 24 armas</title>
<style>
  :root { --tinta:#12151a; --papel:#f6f7f9; --linha:#d8dce3; --acento:#c8102e; }
  :root:not([data-theme="light"]) { }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --tinta:#e8eaee; --papel:#0f1216; --linha:#2a303a; } }
  :root[data-theme="dark"] { --tinta:#e8eaee; --papel:#0f1216; --linha:#2a303a; }
  body { background:var(--papel); color:var(--tinta); font:14px/1.5 system-ui,-apple-system,sans-serif; margin:0; padding:24px; }
  h1 { font-size:20px; margin:0 0 4px; }
  p.sub { margin:0 0 24px; opacity:.7; }
  .ref { border:2px solid var(--acento); border-radius:8px; padding:12px; margin-bottom:28px; }
  .ref h2 { margin:0 0 8px; font-size:15px; color:var(--acento); }
  .grade { display:grid; grid-template-columns:repeat(auto-fill,minmax(330px,1fr)); gap:18px; }
  figure { margin:0; border:1px solid var(--linha); border-radius:8px; overflow:hidden; background:var(--papel); }
  figure img, .ref img { display:block; width:100%; height:auto; }
  figcaption { padding:8px 10px; font-size:13px; display:flex; justify-content:space-between; border-top:1px solid var(--linha); }
  figcaption b { font-weight:600; }
  figcaption span { opacity:.6; font-variant-numeric:tabular-nums; }
</style>
<h1>Pilotos hires — ${cartoes.length} armas</h1>
<p class="sub">Todas construídas com o doador da AK aprovada: mesmas mãos, mesmo rig de 77 ossos, mesmos clipes Equip/Idle/Reload/Shoot. Mesma escala de exibição — a comparação de tamanho vale.</p>
${refUrl ? `<div class="ref"><h2>REFERÊNCIA — AK golden (aprovada 07/09)</h2><img src="${refUrl}" alt="AK golden"></div>` : ''}
<div class="grade">
${cartoes.map((c) => `  <figure><img src="${c.url}" alt="${c.arma}"><figcaption><b>${c.arma}</b><span>${(c.bytes / 1048576).toFixed(2)} MB</span></figcaption></figure>`).join('\n')}
</div>
`;

fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
fs.writeFileSync(SAIDA, html);
console.log(`folha: ${SAIDA} — ${cartoes.length} armas, ${(fs.statSync(SAIDA).size / 1048576).toFixed(2)} MB`);
