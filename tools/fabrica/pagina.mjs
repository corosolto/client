#!/usr/bin/env node
// Página do dono do lote da fábrica: as armas lado a lado com a AK golden aprovada, capturas
// 3:2/16:9, vídeo, réguas, crítico cego, URL no jogo e botões de veredito (sem backend: a linha
// `VEREDITO-DONO <arma> <VEREDITO> — nota` é para colar na conversa).
// Uso: node tools/fabrica/pagina.mjs [porta]   → artifacts/fabrica-lote1/index.html
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { MANIFESTO, RAIZ_REPO, lerJson } from './lib/comum.mjs';

const opt = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] || d;
const LOTE = path.join(RAIZ_REPO, 'artifacts', opt('lote', 'fabrica-lote1'));
const PORTA = process.argv.slice(2).find((a) => !a.startsWith('--')) || '4671';
const rj = (f, d) => { try { return lerJson(f); } catch { return d; } };
const rt = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const manifesto = lerJson(MANIFESTO);
const ORDEM = opt('armas', 'ak,m4,famas,shotgun,pistol').split(',').filter((id) => manifesto.candidates[id]);
const TITULO = opt('titulo', 'lote 1 (AK, M4, FAMAS, escopeta, pistola)').replaceAll('_', ' ');
const resumo = rj(path.join(LOTE, 'qa/resumo.json'), { porArma: {}, regressao: {}, mutantesDoProduto: [] });
const rev = execSync('git rev-parse --short HEAD', { cwd: RAIZ_REPO }).toString().trim();
const url = (w) => `http://127.0.0.1:${PORTA}/?debug=1&auto=P,mst&map=piscina_treta&armaslazy=0&vmauthored=1&vmqa=precision&vmfabrica=${w}`;
const urlAntes = (w) => `http://127.0.0.1:${PORTA}/?debug=1&auto=P,mst&map=piscina_treta&armaslazy=0&vmauthored=1&vmqa=precision&vmweapon=${w}`;
const vclass = (v) => `v-${esc(String(v || 'PENDENTE').split(/[ (]/)[0])}`;
const ficha = (id) => rj(path.join(RAIZ_REPO, 'tools/fabrica/fichas', `${id}.json`), {});
const critico = (id) => {
  const t = rt(path.join(LOTE, 'critico', id, 'veredito.txt')).trim();
  const v = /VEREDITO:\s*([A-ZÇÃ-]+)/.exec(t)?.[1] || (t ? t.split('\n')[0].slice(0, 40) : 'PENDENTE');
  return { v, texto: t };
};
const ROTULO = (f) => f.replace(/\.png$/, '').replace(/^[a-z0-9]+-/, '').replace('reload-empty-f', 'rec. vazia ').replace('inspect-f', 'inspeção ');
const grade = (id, a) => {
  const d = path.join(LOTE, 'capturas', a);
  const fs_ = fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.startsWith(`${id}-`) && f.endsWith('.png')).sort() : [];
  if (!fs_.length) return '<p class="ref">sem captura</p>';
  return fs_.map((f) => `<figure><a href="capturas/${a}/${esc(f)}" data-lb><img loading="lazy" src="capturas/${a}/${esc(f)}" alt="${esc(id)} ${esc(f)}"></a><figcaption>${esc(ROTULO(f))}</figcaption></figure>`).join('');
};
const video = (id) => {
  const d = path.join(LOTE, 'video', id);
  const j = rj(path.join(d, 'video.json'), { records: [] });
  const recs = (j.records || []).filter((r) => fs.existsSync(path.join(d, r.file)));
  return recs.map((r) => `<div class="vid"><video controls preload="none" src="video/${esc(id)}/${esc(r.file)}"></video>
    <small>${esc(r.aspect)} · ${esc(r.seconds)} s · ${esc((r.timeline || []).map((t) => `${t.phase} ${(t.at - r.masterStart).toFixed(1)}s`).join(' · '))}</small></div>`).join('')
    || '<p class="ref">sem vídeo</p>';
};
const chips = (id) => {
  const q = rj(path.join(LOTE, 'qa', `${id}.json`), null);
  if (!q) return '<span class="chip">QA não rodou</span>';
  const out = [];
  const c = (ok, txt, dica = '') => out.push(`<span class="chip ${ok === null ? '' : ok ? 'ok' : 'bad'}" title="${esc(dica)}">${esc(txt)} ${ok === null ? '·' : ok ? '✓' : '✗'}</span>`);
  c(q.produto?.ok, 'produto FB1–FB4', (q.produto?.falhas || []).join('\n') || JSON.stringify(q.produto?.medidas || {}));
  c(q['manga-oca']?.ok, 'manga-oca', q['manga-oca']?.linha);
  c(q['manga-tela']?.ok, 'manga-tela', q['manga-tela']?.linha);
  for (const regua of ['mira', 'cobertura', 'pistola-ref', 'maos', 'carregador']) {
    const a = q['imagem-3x2']?.[regua]; const b = q['imagem-16x9']?.[regua];
    if (!a && !b) continue;
    if (a?.estado === 'N/A' && b?.estado === 'N/A') continue;
    const ok = ![a, b].some((x) => x?.estado === 'VERMELHO');
    c(ok, `${regua} ${a?.valor && a.valor !== '—' ? a.valor : ''}`, `3:2 ${a?.estado} ${a?.msg || ''}\n16:9 ${b?.estado} ${b?.msg || ''}`);
  }
  if (q['carregador-repete']) c(q['carregador-repete'].ok, 'carregador-repete (#641)', q['carregador-repete'].log);
  return out.join('');
};
const REF = { pistol: ['REF-pistol-idle.png', 'REF-pistol-ads.png', 'REF-pistol-recarga-vazia-35.png'],
  padrao: ['REF-ak-idle.png', 'REF-ak-tiro-1.png', 'REF-ak-recarga-tatica-55.png'] };
const refs = (id) => (REF[id] || REF.padrao).filter((f) => fs.existsSync(path.join(LOTE, 'ref', f)))
  .map((f) => `<figure><a href="ref/${f}" data-lb><img loading="lazy" src="ref/${f}" alt="${f}"></a><figcaption>${esc(f.replace(/^REF-|\.png$/g, ''))} (aprovada)</figcaption></figure>`).join('');
const dono = `<div class="owner"><button data-v="APROVADA">Aprovo</button><button data-v="RESSALVA">Ressalva</button><button data-v="REPROVADA">Reprovo</button>
    <input placeholder="o que está errado (frame + o que se vê)" aria-label="nota do dono"><output></output></div>`;

const card = (id) => {
  const f = ficha(id); const cr = critico(id); const vermelhos = resumo.porArma?.[id] || [];
  return `<section class="card" id="${esc(id)}" data-w="${esc(id)}">
  <header><h2>${esc(id)}</h2><span class="tag">chassi ${esc(f.chassi)}${f.zonaLivre?.length ? ' · VARIANTE' : ' · puro'}</span><span class="verd ${vclass(cr.v)}">crítico: ${esc(cr.v)}</span></header>
  <p class="resumo">${esc(f.descricao || '')}${f.limite ? ` <b>Limite:</b> ${esc(f.limite)}` : ''}</p>
  <p class="open"><a href="${esc(url(id))}" target="_blank" rel="noopener">▶ abrir no jogo (fábrica)</a> · <a href="${esc(urlAntes(id))}" target="_blank" rel="noopener">produto atual (antes)</a></p>
  <div class="chips">${chips(id)}</div>
  <p class="ref">${vermelhos.length ? `vermelho em: <span class="bad">${esc(vermelhos.join(', '))}</span>` : '<span class="okt">réguas verdes</span>'}</p>
  <div class="tabs"><button class="on" data-a="3x2">3:2</button><button data-a="16x9">16:9</button><button data-a="regua">quadril/ADS (régua)</button><button data-a="ref">aprovada (${id === 'pistol' ? 'PT-38' : 'AK golden'})</button></div>
  <div class="grid" data-aspect="3x2">${grade(id, '3x2')}</div>
  <div class="grid" data-aspect="16x9" hidden>${grade(id, '16x9')}</div>
  <div class="grid" data-aspect="regua" hidden>${['quadril', 'ads'].map((k) => `<figure><a href="reguas-3x2/${id}-${k}.png" data-lb><img loading="lazy" src="reguas-3x2/${id}-${k}.png" alt=""></a><figcaption>${k} (quadro da régua, 3:2)</figcaption></figure>`).join('')}</div>
  <div class="grid" data-aspect="ref" hidden>${refs(id)}</div>
  <div class="vids">${video(id)}</div>
  ${cr.texto ? `<details><summary>parecer do crítico cego</summary><pre>${esc(cr.texto)}</pre></details>` : ''}
  ${dono}
</section>`;
};
const linhas = ORDEM.map((id) => { const f = ficha(id); const cr = critico(id); const v = resumo.porArma?.[id] || [];
  return `<tr><td><a href="#${id}">${id}</a></td><td>${esc(f.chassi)}${f.zonaLivre?.length ? ' (variante)' : ''}</td><td class="${vclass(cr.v)}">${esc(cr.v)}</td><td>${v.length ? `<span class="bad">${esc(v.join(', '))}</span>` : '<span class="okt">verde</span>'}</td></tr>`; }).join('');
const reg = Object.entries(resumo.regressao || {}).map(([k, v]) => `<span class="chip ${v.ok ? 'ok' : 'bad'}">${esc(k)} ${v.ok ? '✓' : '✗'}</span>`).join('');
const mut = (resumo.mutantesDoProduto || []).map((m) => `<span class="chip ${m.mordeu ? 'ok' : 'bad'}">mutante ${esc(m.mutante)} ${m.mordeu ? 'mordeu' : 'NÃO mordeu'}</span>`).join('');
const refLote1 = fs.existsSync(path.join(LOTE, 'ref-lote1')) ? `<div class="box"><b>Referências aprovadas (no topo)</b><p class="ref">AK golden aprovada (rig A — decisão do dono: a 'ak' fica a golden) e as aprovadas da fábrica no lote 1 (m4 e pistola, crítico APROVADA).</p>
<div class="grid">${['../ref/REF-ak-idle.png|AK golden (aprovada)', 'ref-lote1/m4-idle.png|m4 fábrica (lote 1, aprovada)', 'ref-lote1/pistol-idle.png|pistola fábrica (lote 1, aprovada)', 'ref-lote1/m4-ads.png|m4 ADS']
  .map((x) => x.split('|')).map(([f, l]) => `<figure><a href="${f.replace('../', '')}" data-lb><img src="${f.replace('../', '')}" alt="${l}"></a><figcaption>${l}</figcaption></figure>`).join('')}</div></div>` : '';
const duasAks = `<div class="box"><b>Decisão pendente: duas AKs</b><p class="ref">À esquerda a AK golden aprovada (rig A, braço próprio). À direita a AK do pack com a skin AK-47 e o braço do pack — o braço que as outras armas da fábrica usam. Manter a golden deixa a AK com um braço diferente das outras; padronizar troca a golden pela do pack.</p>
<div class="duas"><figure><img src="ref/REF-ak-idle.png" alt="AK golden aprovada"><figcaption>AK golden aprovada (rig A)</figcaption></figure>
<figure><img src="capturas/3x2/ak-idle.png" alt="AK do pack"><figcaption>AK do pack (fábrica)</figcaption></figure></div></div>`;

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fábrica de armas</title>
<style>
:root{--bg:#f6f5f2;--fg:#1d1d1b;--mut:#6b6960;--card:#fff;--line:#dedbd2;--ok:#1d7a3e;--bad:#b3261e;--warn:#a15c00;--acc:#1f5fbf}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#141413;--fg:#ecebe6;--mut:#9d9a90;--card:#1e1e1c;--line:#34332f;--ok:#5fcf86;--bad:#ff8a80;--warn:#f0b35a;--acc:#8ab4ff}}
:root[data-theme="dark"]{--bg:#141413;--fg:#ecebe6;--mut:#9d9a90;--card:#1e1e1c;--line:#34332f;--ok:#5fcf86;--bad:#ff8a80;--warn:#f0b35a;--acc:#8ab4ff}
*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif}
main{max-width:1500px;margin:0 auto;padding:16px}h1{font-size:22px;margin:8px 0}a{color:var(--acc)}
code{font:12px ui-monospace,monospace;word-break:break-all;color:var(--mut)}.bad{color:var(--bad)}.okt{color:var(--ok)}
.top{display:grid;gap:12px;grid-template-columns:1fr;margin-bottom:16px}@media(min-width:900px){.top{grid-template-columns:1.2fr 1fr}}
.box{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;overflow-x:auto;margin-bottom:12px}
table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;margin:18px 0}
.card header{display:flex;align-items:center;gap:8px;flex-wrap:wrap}h2{margin:0;font-size:20px;margin-right:auto}.tag{font-size:13px;color:var(--mut)}
.verd{font-weight:700;padding:3px 10px;border-radius:8px;border:1px solid currentColor}
.v-REPROVADA{color:var(--bad)}.v-RESSALVA{color:var(--warn)}.v-APROVADA,.v-IGUAL-A-APROVADA,.v-MELHOROU{color:var(--ok)}.v-PENDENTE{color:var(--mut)}
.chips{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}.chip{font-size:12px;border:1px solid var(--line);border-radius:6px;padding:1px 6px}.chip.ok{color:var(--ok)}.chip.bad{color:var(--bad)}
.tabs button{font:inherit;font-size:13px;background:none;border:1px solid var(--line);color:var(--fg);border-radius:6px;padding:3px 10px;cursor:pointer;margin:2px 0}.tabs button.on{background:var(--fg);color:var(--bg)}
.grid{display:grid;gap:6px;grid-template-columns:repeat(2,1fr);margin-top:8px}@media(min-width:700px){.grid{grid-template-columns:repeat(4,1fr)}}
figure{margin:0}figure img{width:100%;display:block;border-radius:6px;border:1px solid var(--line)}figcaption{font-size:12px;color:var(--mut)}
.duas{display:grid;gap:8px;grid-template-columns:1fr}@media(min-width:700px){.duas{grid-template-columns:1fr 1fr}}
.vids{display:grid;gap:8px;grid-template-columns:1fr;margin-top:10px}@media(min-width:900px){.vids{grid-template-columns:1fr 1fr}}video{width:100%;border-radius:6px;background:#000}.vid small{font-size:11px;color:var(--mut)}
details pre{white-space:pre-wrap;font:12px ui-monospace,monospace;background:var(--bg);padding:8px;border-radius:8px}
.owner{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid var(--line)}
.owner button{font:inherit;font-weight:600;border-radius:8px;border:1px solid var(--line);padding:6px 14px;cursor:pointer;background:var(--card);color:var(--fg)}
.owner button[data-v=APROVADA]{color:var(--ok)}.owner button[data-v=REPROVADA]{color:var(--bad)}.owner button[data-v=RESSALVA]{color:var(--warn)}
.owner button.sel{outline:3px solid currentColor}.owner input{flex:1;min-width:200px;font:inherit;padding:6px 8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--fg)}
.owner output{flex-basis:100%;font:12px ui-monospace,monospace;color:var(--mut)}
textarea{width:100%;min-height:110px;font:12px ui-monospace,monospace;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:8px}
#lb{position:fixed;inset:0;background:#000d;display:none;place-items:center;z-index:9;cursor:zoom-out}#lb img{max-width:98vw;max-height:96vh}.ref{color:var(--mut);font-size:13px}
</style></head><body><main>
<h1>Fábrica de armas — ${esc(TITULO)}</h1>
<div class="top">
 <div class="box"><b>O que é</b><p class="ref" style="margin:4px 0">Cada arma é o pack KINEMATION <b>como autorado</b> na zona de contato (braço, arma, pose e recargas do próprio pack); só a zona livre varia (a FAMAS troca alça e soleira) e a identidade vem de skin. Servidor: <code>node tools/eval/serve.mjs ${PORTA}</code> no worktree <code>vm-fabrica</code> (branch <code>vm/fabrica</code> @ ${esc(rev)}). No jogo: <code>?vmauthored=1&amp;vmfabrica=&lt;arma&gt;</code>. Nenhuma flag <code>ready</code> nem <code>VM_LAUNCH</code> foi mudada.</p>
 <p class="ref" style="margin:4px 0"><b>Política revogada (confirmar):</b> desde 24/08 (BUG-75) a arma do pack ficava escondida e a Mint era encaixada por cima ("pacote é doador, nunca aparência"). A fábrica mostra a arma do pack; a identidade do jogo vem de skin, nome e variante de zona livre.</p>
 <p class="ref" style="margin:4px 0"><b>Mint:</b> 0 crédito. A zona livre da FAMAS saiu da FAMAS Mint que o jogo já usa no mundo. <b>Mãos:</b> base neutra na aparência da AK aprovada; no jogo o time pinta por cima (mãos por time, mesma escala).</p>
 <p class="ref" style="margin:4px 0">Como a fábrica funciona e o mapa das 26 armas: <code>docs/reports/VM-FABRICA.md</code>.</p></div>
 <div class="box"><b>Veredito do dono (colar)</b><textarea id="out" readonly></textarea><button id="cp" style="margin-top:6px">copiar</button>
 <div class="chips" style="margin-top:8px">${mut}${reg}</div></div>
</div>
${refLote1 || duasAks}
<div class="box"><table><thead><tr><th>arma</th><th>chassi</th><th>crítico cego</th><th>réguas vermelhas (3:2 e 16:9)</th></tr></thead><tbody>${linhas}</tbody></table></div>
${ORDEM.map(card).join('\n')}
</main><div id="lb"><img alt=""></div>
<script>
const K='fabricaLote1';let st={};try{st=JSON.parse(localStorage.getItem(K)||'{}')}catch{}
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
fs.writeFileSync(path.join(LOTE, 'index.html'), html);
console.log(`PAGINA ${path.join(LOTE, 'index.html')} → http://127.0.0.1:${PORTA}/artifacts/fabrica-lote1/index.html`);
