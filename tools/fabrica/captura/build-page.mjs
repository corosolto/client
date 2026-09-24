#!/usr/bin/env node
// Página única de revisão do dono, build integrado K (vm/integracao-k): 25 armas de fogo + faca + granada.
// Sem backend: o veredito vira a linha `VEREDITO-DONO <arma> <VEREDITO> — nota` para colar.
// Uso (na raiz do worktree): node artifacts/review-integrado/tools/build-page.mjs [porta]
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'artifacts/review-integrado');
const PORT = process.argv[2] || '4661';
const rj = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const rt = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
const shots = fs.readdirSync(path.join(DIR, 'shots')).filter((f) => /^capture-.*\.json$/.test(f))
  .flatMap((f) => rj(path.join(DIR, 'shots', f), { records: [] }).records)
  .filter((r) => fs.existsSync(path.join(DIR, 'shots', r.file)));
const video = rj(path.join(DIR, 'video/video.json'), { records: [] });
const critic = rj(path.join(DIR, 'critico/criticos.json'), {});
const P3 = rj(path.join(ROOT, 'tools/eval/vm-reguas-placar.json'), { resultados: {} });
const P6 = rj(path.join(ROOT, 'tools/eval/vm-reguas-placar-16x9.json'), { resultados: {} });
const FR = Object.fromEntries((rj(path.join(ROOT, 'artifacts/placar-integrado/vm-frame.json'), { armas: [] }).armas).map((r) => [r.weapon, r]));
const divida = rj(path.join(ROOT, 'tools/eval/vm-reguas-divida.json'), { dividas: {} }).dividas;
const logRe = (f, re) => Object.fromEntries([...rt(path.join(ROOT, 'artifacts/placar-integrado', f)).matchAll(re)].map((m) => [m[2], m[1]]));
const ori = Object.fromEntries([...rt(path.join(ROOT, 'artifacts/placar-integrado/vm-orientacao.log')).matchAll(/^(\w+)\s+([\d.]+)\s/gm)].map((m) => [m[1], m[2]]));
const peg = logRe('vm-pegada-k.log', /^(ok|FALHA)\s+(\w+)/gm);
const manga = logRe('vm-manga-oca.log', /^(OK|FALHA)\s+(\w+)/gm);
const pente = {};
for (const m of rt(path.join(ROOT, 'artifacts/placar-integrado/vm-pente-na-mao.log')).matchAll(/^(PASSA|FALHA) (\w+) /gm)) pente[m[2]] = (pente[m[2]] ?? true) && m[1] === 'PASSA';
const rev = execSync('git rev-parse --short HEAD').toString().trim();

const ORDEM = ['pistol', 'deagle', 'revolver38', 'ak', 'akm', 'm92', 'm4', 'md97', 'scar', 'famas', 'carbine', 'tavor', 'g3',
  'mp5', 'uzi', 'p90', 'shotgun', 'lmg', 'sks', 'svd', 'g3sg1', 'm400', 'awp', 'mosin', 'rem700', 'knife', 'grenade'];
const STATES = ['saque-30', 'saque-65', 'idle', 'tiro-1', 'rajada', 'recarga-tatica-30', 'recarga-tatica-55', 'recarga-tatica-80',
  'recarga-vazia-15', 'recarga-vazia-35', 'recarga-vazia-55', 'recarga-vazia-75', 'recarga-vazia-95', 'inspecao-35', 'inspecao-70', 'ads'];
const LABEL = { 'saque-30': 'saque 30%', 'saque-65': 'saque 65%', idle: 'idle', 'tiro-1': '1º tiro (+60 ms)', rajada: 'rajada (6º tiro)',
  'recarga-tatica-30': 'rec. tática 30%', 'recarga-tatica-55': 'rec. tática 55%', 'recarga-tatica-80': 'rec. tática 80%',
  'recarga-vazia-15': 'rec. vazia 15%', 'recarga-vazia-35': 'rec. vazia 35%', 'recarga-vazia-55': 'rec. vazia 55%',
  'recarga-vazia-75': 'rec. vazia 75%', 'recarga-vazia-95': 'rec. vazia 95%', 'inspecao-35': 'inspeção 35%', 'inspecao-70': 'inspeção 70%', ads: 'ADS' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const url = (w) => `http://127.0.0.1:${PORT}/?debug=1&auto=P,mst&map=piscina_treta&armaslazy=0&vmauthored=1&vmqa=precision${['knife', 'grenade'].includes(w) ? '' : `&vmweapon=${w}`}`;
const vclass = (v) => `v-${esc(String(v || 'PENDENTE').split(/[ (]/)[0])}`;

const grid = (w, aspect) => STATES.map((s) => {
  const r = shots.find((x) => x.weapon === w && x.state === s && x.aspect === aspect);
  if (!r) return `<figure class="miss"><div>${esc(LABEL[s])}<br>sem captura</div></figure>`;
  return `<figure><a href="shots/${esc(r.file)}" data-lb><img loading="lazy" src="shots/${esc(r.file)}" alt="${esc(w)} ${esc(LABEL[s])}"></a>
      <figcaption>${esc(LABEL[s])}<small>${esc(r.runtime?.clip || '')}${r.runtime?.clipTime != null ? ` @${r.runtime.clipTime}s` : ''}</small></figcaption></figure>`;
}).join('');
const kgrid = (w, a) => {
  const d = path.join(DIR, `kcap-${a}`);
  const files = fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.startsWith(`${w}-`) && f.endsWith('.png')).sort() : [];
  if (!files.length) return '<p class="ref">sem captura</p>';
  return files.map((f) => `<figure><a href="kcap-${a}/${esc(f)}" data-lb><img loading="lazy" src="kcap-${a}/${esc(f)}" alt=""></a><figcaption>${esc(f.replace(/\.png$/, '').replace(`${w}-`, ''))}</figcaption></figure>`).join('');
};
const vids = (w) => (video.records || []).filter((r) => r.weapon === w).map((r) => `<div class="vid"><video controls preload="none" src="video/${esc(r.file)}"></video>
      <small>${esc(r.aspect)} · ${esc(r.seconds)} s · ${esc((r.timeline || []).map((t) => `${t.phase} ${(t.at - r.masterStart).toFixed(1)}s`).join(' · '))}</small></div>`).join('') || '<p class="ref">sem vídeo</p>';

const REGUAS = ['mira', 'cobertura', 'pistola-ref', 'maos', 'carregador'];
const gauges = (w) => {
  const out = []; const red = [];
  for (const r of REGUAS) {
    const a = P3.resultados[w]?.[r]; const b = P6.resultados[w]?.[r];
    if (!a || (a.estado === 'N/A' && b?.estado === 'N/A')) continue;
    const bad = [a, b].some((x) => ['VERMELHO', 'NAO_MEDE'].includes(x?.estado));
    if (bad) red.push(r);
    const d = divida[r]?.[w];
    out.push(`<span class="chip ${bad ? 'bad' : 'ok'}" title="${esc(`3:2 ${a.msg}\n16:9 ${b?.msg || ''}${d ? `\ndono: ${d.dono}\nfila: ${d.fila}` : ''}`)}">${esc(r)} ${esc(a.valor === '—' ? '' : a.valor)} ${bad ? '✗' : '✓'}</span>`);
  }
  const f = FR[w];
  if (f) {
    const a = f.aspectos['3x2'].razao, b = f.aspectos['16x9'].razao, band = f.ratioBand;
    const ok = a >= band.min && a <= band.max && b >= band.min && b <= band.max;
    if (!ok && !f.informativo) red.push('vm-frame');
    out.push(`<span class="chip ${ok ? 'ok' : f.informativo ? 'note' : 'bad'}">vm-frame ${a}/${b}${f.referencia === 'pistol-aprovada' ? ' ×PT-38' : ''} ${ok ? '✓' : f.informativo ? 'ⓘ raster manda' : '✗'}</span>`);
  }
  if (ori[w]) out.push(`<span class="chip ok">orientação ${ori[w]} ✓</span>`);
  if (pente[w] !== undefined) out.push(`<span class="chip ${pente[w] ? 'ok' : 'bad'}">pente-na-mão ${pente[w] ? '✓' : '✗'}</span>`);
  if (peg[w]) out.push(`<span class="chip ${peg[w] === 'ok' ? 'ok' : 'bad'}">pegada-k ${peg[w] === 'ok' ? '✓' : '✗'}</span>`);
  if (manga[w]) out.push(`<span class="chip ${manga[w] === 'OK' ? 'ok' : 'bad'}">manga-oca ${manga[w] === 'OK' ? '✓' : '✗'}</span>`);
  return { html: out.join(''), red };
};
const owner = `<div class="owner"><button data-v="APROVADA">Aprovo</button><button data-v="RESSALVA">Ressalva</button><button data-v="REPROVADA">Reprovo</button>
    <input placeholder="o que está errado (frame + o que se vê)" aria-label="nota do dono"><output></output></div>`;

const card = (w) => {
  const c = critic[w] || {}; const g = gauges(w); const k = ['knife', 'grenade'].includes(w);
  return `<section class="card" id="${esc(w)}" data-w="${esc(w)}">
  <header><h2>${esc(w)}</h2><span class="verd ${vclass(c.veredito)}">crítico: ${esc(c.veredito || 'PENDENTE')}</span></header>
  <p class="resumo">${esc(c.resumo || '')} <small class="ref">(${esc(c.rodada || '')} · <code>${esc(c.fonte || '')}</code>)</small></p>
  <p class="open"><a href="${esc(url(w))}" target="_blank" rel="noopener">▶ abrir no jogo</a> <code>${esc(url(w))}</code></p>
  <div class="chips">${g.html || '<span class="chip">sem réguas de imagem (faca/granada: melee-vm e vm-launch)</span>'}</div>
  <div class="tabs"><button class="on" data-a="3x2">3:2</button><button data-a="16x9">16:9</button></div>
  <div class="grid" data-aspect="3x2">${k ? kgrid(w, '32') : grid(w, '3x2')}</div>
  <div class="grid" data-aspect="16x9" hidden>${k ? kgrid(w, '169') : grid(w, '16x9')}</div>
  <div class="vids">${k ? '' : vids(w)}</div>
  ${owner}
</section>`;
};
const rows = ORDEM.map((w) => { const c = critic[w] || {}; const g = gauges(w);
  return `<tr><td><a href="#${w}">${w}</a></td><td class="${vclass(c.veredito)}">${esc(c.veredito || 'PENDENTE')}</td><td>${g.red.length ? `<span class="bad">${esc(g.red.join(', '))}</span>` : (FR[w] || P3.resultados[w] ? '<span class="okt">verde</span>' : '—')}</td><td>${esc(c.resumo || '')}</td></tr>`; }).join('');

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Revisão viewmodel integrado</title>
<style>
:root{--bg:#f6f5f2;--fg:#1d1d1b;--mut:#6b6960;--card:#fff;--line:#dedbd2;--ok:#1d7a3e;--bad:#b3261e;--warn:#a15c00;--acc:#1f5fbf}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#141413;--fg:#ecebe6;--mut:#9d9a90;--card:#1e1e1c;--line:#34332f;--ok:#5fcf86;--bad:#ff8a80;--warn:#f0b35a;--acc:#8ab4ff}}
:root[data-theme="dark"]{--bg:#141413;--fg:#ecebe6;--mut:#9d9a90;--card:#1e1e1c;--line:#34332f;--ok:#5fcf86;--bad:#ff8a80;--warn:#f0b35a;--acc:#8ab4ff}
*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif}
main{max-width:1500px;margin:0 auto;padding:16px}h1{font-size:22px;margin:8px 0}h3{margin:24px 0 6px}a{color:var(--acc)}
code{font:12px ui-monospace,monospace;word-break:break-all;color:var(--mut)}.bad{color:var(--bad)}.okt{color:var(--ok)}
.top{display:grid;gap:12px;grid-template-columns:1fr;margin-bottom:16px}@media(min-width:900px){.top{grid-template-columns:1.1fr 1fr}}
.box{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;margin:18px 0}
.card header{display:flex;align-items:center;gap:8px;flex-wrap:wrap}h2{margin:0;font-size:20px;margin-right:auto}
.verd{font-weight:700;padding:3px 10px;border-radius:8px;border:1px solid currentColor}
.v-REPROVADA{color:var(--bad)}.v-RESSALVA{color:var(--warn)}.v-APROVADA-CRITICO,.v-APROVADA,.v-IGUAL-A-APROVADA,.v-MELHOROU{color:var(--ok)}.v-PENDENTE{color:var(--mut)}
.chips{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}.chip{font-size:12px;border:1px solid var(--line);border-radius:6px;padding:1px 6px}
.chip.ok{color:var(--ok)}.chip.bad{color:var(--bad)}.chip.note{color:var(--warn)}
.tabs button{font:inherit;font-size:13px;background:none;border:1px solid var(--line);color:var(--fg);border-radius:6px;padding:3px 10px;cursor:pointer;margin:2px 0}.tabs button.on{background:var(--fg);color:var(--bg)}
.grid{display:grid;gap:6px;grid-template-columns:repeat(2,1fr);margin-top:8px}@media(min-width:700px){.grid{grid-template-columns:repeat(4,1fr)}}
figure{margin:0}figure img{width:100%;display:block;border-radius:6px;border:1px solid var(--line)}figcaption{font-size:12px;display:flex;justify-content:space-between;gap:4px}figcaption small{color:var(--mut)}
figure.miss div{aspect-ratio:3/2;display:grid;place-items:center;text-align:center;font-size:12px;color:var(--mut);border:1px dashed var(--line);border-radius:6px}
.vids{display:grid;gap:8px;grid-template-columns:1fr;margin-top:10px}@media(min-width:900px){.vids{grid-template-columns:1fr 1fr}}video{width:100%;border-radius:6px;background:#000}.vid small{font-size:11px;color:var(--mut)}
.owner{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid var(--line)}
.owner button{font:inherit;font-weight:600;border-radius:8px;border:1px solid var(--line);padding:6px 14px;cursor:pointer;background:var(--card);color:var(--fg)}
.owner button[data-v=APROVADA]{color:var(--ok)}.owner button[data-v=REPROVADA]{color:var(--bad)}.owner button[data-v=RESSALVA]{color:var(--warn)}
.owner button.sel{outline:3px solid currentColor}.owner input{flex:1;min-width:200px;font:inherit;padding:6px 8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--fg)}
.owner output{flex-basis:100%;font:12px ui-monospace,monospace;color:var(--mut)}
textarea{width:100%;min-height:120px;font:12px ui-monospace,monospace;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:8px}
#lb{position:fixed;inset:0;background:#000d;display:none;place-items:center;z-index:9;cursor:zoom-out}#lb img{max-width:98vw;max-height:96vh}
.ref{color:var(--mut);font-size:13px}
</style></head><body><main>
<h1>Revisão do viewmodel K — build integrado (todas as frentes + decisões do dono)</h1>
<div class="top">
 <div class="box"><b>Como usar</b><ol style="margin:6px 0 0 18px;padding:0">
  <li>Servidor no ar: <code>node tools/eval/serve.mjs ${PORT}</code> no worktree <code>vm-integracao-k</code> (branch <code>vm/integracao-k</code> @ ${esc(rev)}; catálogo <code>~/csbrasil-private-assets/generated/viewmodels-integracao-k/overlay</code>). Esta página é arquivo local: <code>file://${esc(DIR)}/index.html</code>.</li>
  <li>Por arma: capturas no jogo real (3:2 e 16:9, clique amplia), vídeo, último veredito do crítico cego, fila de réguas (passe o mouse: medida, dono e classe do conserto) e "▶ abrir no jogo".</li>
  <li>Um clique: Aprovo / Ressalva / Reprovo (+ nota). A linha <code>VEREDITO-DONO &lt;arma&gt; &lt;VEREDITO&gt; — nota</code> aparece no quadro ao lado; copie e cole na conversa.</li></ol>
  <p class="ref" style="margin:8px 0 0">Decisões do dono já aplicadas: curtas contra a PT-38 aprovada (reescala do #631 revertida; deagle no frame de curta); LMG na opção B (0,877×); AKM em escala 1,0; M92 em escala real; raster manda sobre o vm-frame (akm, m92, mp5 e, para confirmar, revolver38); rem700 mantém a orientação do #635. PLACAR completo: <code>docs/reports/VM-INTEGRACAO-K.md</code>; fila: <code>docs/reports/VM-INTEGRACAO-K-FILA-CORRECAO.md</code>. Armas de luneta: o ADS mostra a máscara da luneta. Nenhuma flag <code>ready</code> nem <code>VM_LAUNCH</code> foi mudada.</p></div>
 <div class="box"><b>Veredito do dono (colar)</b><textarea id="out" readonly></textarea><button id="cp" style="margin-top:6px">copiar</button></div>
</div>
<div class="box"><table><thead><tr><th>arma</th><th>crítico (último)</th><th>réguas vermelhas</th><th>o que resta</th></tr></thead><tbody>${rows}</tbody></table></div>
${ORDEM.map(card).join('\n')}
</main><div id="lb"><img alt=""></div>
<script>
const K='vmreviewIntegradoK';let st={};try{st=JSON.parse(localStorage.getItem(K)||'{}')}catch{}
const save=()=>{try{localStorage.setItem(K,JSON.stringify(st))}catch{}};
const line=(w)=>{const s=st[w];return s&&s.v?\`VEREDITO-DONO \${w} \${s.v}\${s.n?' — '+s.n:''}\`:''};
const render=()=>{document.getElementById('out').value=Object.keys(st).map(line).filter(Boolean).join('\\n');
 document.querySelectorAll('.card').forEach((c)=>{const w=c.dataset.w,s=st[w]||{};c.querySelectorAll('.owner button').forEach((b)=>b.classList.toggle('sel',b.dataset.v===s.v));const o=c.querySelector('.owner output');if(o)o.textContent=line(w);const i=c.querySelector('.owner input');if(i&&document.activeElement!==i)i.value=s.n||''})};
document.querySelectorAll('.card').forEach((c)=>{const w=c.dataset.w;
 c.querySelectorAll('.owner button').forEach((b)=>b.onclick=()=>{st[w]={...(st[w]||{}),v:b.dataset.v};save();render()});
 const i=c.querySelector('.owner input');if(i)i.oninput=()=>{st[w]={...(st[w]||{}),n:i.value.trim()};save();render()};
 c.querySelectorAll('.tabs button').forEach((b)=>b.onclick=()=>{c.querySelectorAll('.tabs button').forEach((x)=>x.classList.toggle('on',x===b));c.querySelectorAll('.grid[data-aspect]').forEach((g)=>g.hidden=g.dataset.aspect!==b.dataset.a)})});
document.getElementById('cp').onclick=()=>{const t=document.getElementById('out');t.select();navigator.clipboard?.writeText(t.value).catch(()=>document.execCommand('copy'))};
const lb=document.getElementById('lb');document.querySelectorAll('[data-lb]').forEach((a)=>a.onclick=(e)=>{e.preventDefault();lb.querySelector('img').src=a.href;lb.style.display='grid'});lb.onclick=()=>lb.style.display='none';
render();
</script></body></html>`;
fs.writeFileSync(path.join(DIR, 'index.html'), html);
console.log(`PAGE ${path.join(DIR, 'index.html')} armas=${ORDEM.length} capturas=${shots.length} videos=${(video.records || []).length}`);
