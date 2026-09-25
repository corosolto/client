#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '../..');
const series = path.join(root, 'artifacts/viewmodels/astra-series');
const evidence = path.join(series, 'hand-continuity');
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const publicAsset = await fs.readFile(path.join(root, 'public/models/viewmodels/coro/melee/knife-hires.glb'));
const hash = crypto.createHash('sha256').update(publicAsset).digest('hex');
const teamDir = path.join(evidence, 'final-teams-r2');
const teams = await read(path.join(teamDir, 'report.json'));
if (!teams.ok || teams.candidate || teams.knifeAsset.sha256 !== hash) throw Error('times não medem o asset público atual');
const photo = async file => `data:image/jpeg;base64,${(await sharp(file).resize({ width: 760, withoutEnlargement: true }).jpeg({ quality: 76 }).toBuffer()).toString('base64')}`;
const media = async file => `data:video/mp4;base64,${(await fs.readFile(file)).toString('base64')}`;
const names = { E: 'Time E · estrela', B: 'Time B · camuflada', C: 'Palhaços · branca', F: 'Funkeiros · sem dedos', U: 'Tribos Urbanas · quadriculada sem dedos' };
const sections = [];
for (const [aspect, directory] of [['3x2', 'final-chrome-3x2'], ['16x9', 'final-chrome-16x9']]) {
  const dir = path.join(evidence, directory), r = await read(path.join(dir, 'runtime-report.json'));
  if (!r.ok || r.candidateOverride || r.frameOverride || r.asset.sha256 !== hash || r.video?.frames.length !== 225) throw Error(`captura padrão incompleta ou divergente: ${directory}`);
  const pairs = [];
  for (const faction of Object.keys(names)) {
    const states = ['pistol', 'knife'].map(w => teams.states.find(s => s.label === `${aspect}-${faction}-${w}`));
    if (states.some(s => !s || s.qaInspection)) throw Error(`par de gameplay ausente ${aspect}/${faction}`);
    pairs.push(`<article><h3>${names[faction]}</h3><div class="pair">${await Promise.all(states.map(async (s, i) => `<figure><img loading="lazy" src="${await photo(path.join(teamDir, s.file))}" alt="${names[faction]} com ${i ? 'faca' : 'pistola'}"><figcaption>${i ? 'Faca' : 'Pistola'} · idle real</figcaption></figure>`)).then(x => x.join(''))}</div></article>`);
  }
  const attacks = [];
  for (const [label, file] of [['Esquerdo · estocada', '09-quick-050.png'], ['Direito · preparação', '14-heavy-025.png'], ['Direito · descida', '15-heavy-050.png']]) {
    attacks.push(`<figure><img loading="lazy" src="${await photo(path.join(dir, file))}" alt="${label}"><figcaption>${label}</figcaption></figure>`);
  }
  sections.push(`<section data-aspect="${aspect}" ${aspect === '16x9' ? 'hidden' : ''}>
    <h2>Movimento contínuo · ${aspect.replace('x', ':')}</h2>
    <video controls muted loop playsinline preload="metadata" src="${await media(path.join(dir, 'motion.mp4'))}"></video>
    <p>Troca → disparo → recarga → faca → esquerdo/direito. ${r.video.frames.length} quadros, ${r.video.duration} s em tempo simulado; sem cortes e sem áudio. Não é medição de FPS.</p>
    <div class="attacks">${attacks.join('')}</div><h2>Mesma identidade ao trocar de arma</h2>${pairs.join('')}
    <p>${r.checks.filter(c => c.ok).length}/${r.checks.length} verificações técnicas do movimento; ${r.errors.length} erros registrados.</p></section>`);
}
const before = await photo(path.join(series, 'knife-motion-candidate-d-runtime-retry-3x2/00-idle.png'));
const after = await photo(path.join(evidence, 'final-chrome-3x2/00-idle.png'));
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Faca · continuidade e proporção</title><style>
*{box-sizing:border-box}body{margin:0;background:#101419;color:#edf0f3;font:16px/1.5 system-ui,sans-serif}main{max-width:1280px;margin:auto;padding:28px}h1{font-size:32px;margin:0 0 8px}h2{margin:28px 0 14px}h3{font-size:18px}.status{color:#e7bd63}p,figcaption{color:#c1c9d2}article,.box{background:#1a2028;padding:18px;margin:18px 0;border:1px solid #343e4a;border-radius:12px}.pair,.attacks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.attacks{grid-template-columns:repeat(3,minmax(0,1fr))}figure{margin:0}img,video{display:block;width:100%;height:auto}figcaption{padding:7px 0;font-size:14px}button{background:#222d38;color:#edf0f3;border:1px solid #677788;border-radius:7px;padding:10px 22px;font:inherit;cursor:pointer}button[aria-pressed=true]{background:#b9dc62;color:#111;border-color:#b9dc62}code{overflow-wrap:anywhere}nav{display:flex;gap:12px;position:sticky;top:0;padding:12px 0;background:#101419;z-index:1}[hidden]{display:none!important}@media(max-width:760px){main{padding:14px}.pair,.attacks{grid-template-columns:1fr}}
</style><main><h1>Faca · continuidade e proporção</h1><p class="status">Implementação local · aprovação visual final pendente</p>
<p>Os ataques aprovados foram preservados. Luvas e mangas seguem o time; a câmera exportada da faca foi recalibrada para reduzir sua ampliação na troca com a pistola. AK e geometria da pistola foram preservadas.</p>
<div class="box"><h2>Antes e agora · 3:2</h2><div class="pair"><figure><img src="${before}" alt="Faca antes da correção de luvas e proporção"><figcaption>Antes · luva diferente e faca ampliada</figcaption></figure><figure><img src="${after}" alt="Faca com a correção local"><figcaption>Agora · asset padrão servido pelo Game</figcaption></figure></div><p>Referência histórica de enquadramento: câmera do cenário, iluminação e renderizador diferem entre as capturas. Não é uma comparação controlada de cor. Os pares atuais de pistola/faca abaixo usam a mesma sessão por formato.</p></div>
<nav aria-label="Formato da captura"><button type="button" data-target="3x2" aria-pressed="true">3:2</button><button type="button" data-target="16x9" aria-pressed="false">16:9</button></nav>${sections.join('')}
<div class="box"><h2>Escopo da revisão</h2><p>Vídeos e pares acima usam o Game real e o GLB público local, sem substituição de candidato. As imagens de inspeção com punho elevado ficam nos artefatos técnicos e não foram usadas como gameplay nesta página.</p><p>Materiais preservam identidade, mas as duas armas mantêm rigs, geometrias e poses distintos. As imagens não provam dimensões físicas universais nem contatos internos ocultos. O dano e o balanceamento não foram alterados; sincronização física de impacto e multiplayer não estão certificados por esta revisão visual.</p><p>GLB servido · SHA-256 <code>${hash}</code></p><p>Sem publicação ou merge. A confirmação visual do Ruben continua necessária.</p></div></main>
<script>document.querySelectorAll('button[data-target]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('section[data-aspect]').forEach(s=>s.hidden=s.dataset.aspect!==b.dataset.target);document.querySelectorAll('button[data-target]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelectorAll('video').forEach(v=>v.pause());}));</script></html>`;
const file = path.join(series, 'knife-final-review.html');
await fs.writeFile(file, html);
console.log(JSON.stringify({ file, bytes: Buffer.byteLength(html), sha256: hash }));
