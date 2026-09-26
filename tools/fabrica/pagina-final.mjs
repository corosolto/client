#!/usr/bin/env node
// Página final do dono com as 26 armas: as da fábrica pura (este worktree, artifacts/fabrica-final),
// as variantes/plano B de outro lote (copiadas da página dele, só leitura) e as aprovadas de fora
// da fábrica (AK golden, faca, granada). Um cartão por arma: veredito do crítico, réguas, capturas
// 3:2, vídeo e os botões do dono (a linha `VEREDITO-DONO <arma> <VEREDITO> — nota` é para colar).
// Uso: node tools/fabrica/pagina-final.mjs [porta] [--variantes=<artifacts/fabrica-variantes de outro worktree>]
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { RAIZ_REPO, lerJson } from './lib/comum.mjs';

const opt = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') || d;
const PORTA = process.argv.slice(2).find((a) => !a.startsWith('--')) || '4671';
const FINAL = path.join(RAIZ_REPO, 'artifacts/fabrica-final');
const VARIANTES = opt('variantes', path.resolve(RAIZ_REPO, '../vm-fabrica-variantes/artifacts/fabrica-variantes'));
const rj = (f, d) => { try { return lerJson(f); } catch { return d; } };
const rt = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rev = execSync('git rev-parse --short HEAD', { cwd: RAIZ_REPO }).toString().trim();

// Ordem do §9 do VM-FABRICA; fonte de cada arma.
const MINHAS = ['m4', 'pistol', 'shotgun', 'g3', 'svd', 'mp5', 'p90', 'lmg', 'deagle', 'famas', 'tavor'];
const DE_VARIANTES = ['akm', 'm92', 'md97', 'scar', 'g3sg1', 'sks', 'awp', 'rem700', 'm400', 'mosin', 'carbine', 'uzi', 'revolver38'];
const APROVADAS = { ak: 'AK golden (rig A) — aprovada pelo dono; servida por gold#ak (eval:vm-launch VL7)', knife: 'faca aprovada (o pack não tem faca)', grenade: 'granada K — já é o pack como autorado (ready)' };
const ORDEM = ['ak', 'akm', 'm92', 'm4', 'famas', 'tavor', 'md97', 'scar', 'g3', 'g3sg1', 'svd', 'sks', 'awp', 'rem700', 'm400',
  'mosin', 'carbine', 'mp5', 'uzi', 'p90', 'lmg', 'shotgun', 'deagle', 'revolver38', 'pistol', 'grenade', 'knife'];

// Copia (só leitura na origem) as figuras e o veredito do lote das variantes para dentro desta página.
const fonteDe = (id) => (MINHAS.includes(id) ? 'fabrica' : DE_VARIANTES.includes(id) ? 'variantes' : 'aprovada');
const pastaVar = path.join(FINAL, 'fontes/variantes');
for (const id of DE_VARIANTES) {
  const dst = path.join(pastaVar, id);
  fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(dst, { recursive: true });
  const cap = path.join(VARIANTES, 'capturas/3x2');
  if (fs.existsSync(cap)) for (const f of fs.readdirSync(cap)) if (f.startsWith(`${id}-`) && f.endsWith('.png')) fs.copyFileSync(path.join(cap, f), path.join(dst, f));
  for (const f of ['veredito.txt']) if (fs.existsSync(path.join(VARIANTES, 'critico', id, f))) fs.copyFileSync(path.join(VARIANTES, 'critico', id, f), path.join(dst, f));
  const q = path.join(VARIANTES, 'qa', `${id}.json`);
  if (fs.existsSync(q)) fs.copyFileSync(q, path.join(dst, 'qa.json'));
}

const critico = (id) => {
  const f = fonteDe(id) === 'variantes' ? path.join(pastaVar, id, 'veredito.txt') : path.join(FINAL, 'critico', id, 'veredito.txt');
  const t = rt(f).trim();
  if (fonteDe(id) === 'aprovada') return { v: 'APROVADA', texto: APROVADAS[id] };
  const v = /VEREDITO:\s*([A-ZÇÃ-]+)/.exec(t)?.[1]
    || ['REPROVADA', 'RESSALVA', 'APROVADA'].find((k) => new RegExp(`^\\S+\\s+${k}\\b`, 'm').test(t)) || (t ? 'VER TEXTO' : 'PENDENTE');
  return { v, texto: t };
};
const nota = (id) => rt(path.join(FINAL, 'critico', id, 'nota-construtor.txt')).trim();
const qa = (id) => rj(fonteDe(id) === 'variantes' ? path.join(pastaVar, id, 'qa.json') : path.join(FINAL, 'qa', `${id}.json`), null);
const figuras = (id) => {
  const fonte = fonteDe(id);
  if (fonte === 'aprovada') {
    const d = path.join(FINAL, 'ref'); const pref = id === 'ak' ? 'REF-ak-' : `${id}-`;
    const dd = id === 'ak' ? d : path.join(FINAL, 'capturas/3x2');
    const fs_ = fs.existsSync(dd) ? fs.readdirSync(dd).filter((f) => f.startsWith(pref) && f.endsWith('.png')).sort() : [];
    return fs_.map((f) => [path.relative(FINAL, path.join(dd, f)), f]);
  }
  const d = fonte === 'variantes' ? path.join(pastaVar, id) : path.join(FINAL, 'capturas/3x2');
  const fs_ = fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.startsWith(`${id}-`) && f.endsWith('.png')).sort() : [];
  return fs_.map((f) => [path.relative(FINAL, path.join(d, f)), f]);
};
const ROTULO = (f) => f.replace(/\.png$/, '').replace(/^(REF-)?[a-z0-9]+-/, '').replace('reload-empty-f', 'rec. vazia ').replace('inspect-f', 'inspeção ');
const chips = (id) => {
  const q = qa(id);
  if (!q) return fonteDe(id) === 'aprovada' ? '' : '<span class="chip">QA sem json</span>';
  const out = [];
  const c = (ok, txt, dica = '') => out.push(`<span class="chip ${ok === null || ok === undefined ? '' : ok ? 'ok' : 'bad'}" title="${esc(dica)}">${esc(txt)} ${ok === null || ok === undefined ? '·' : ok ? '✓' : '✗'}</span>`);
  if (q.produto) c(q.produto.ok, 'produto FB1–FB4', (q.produto.falhas || []).join('\n'));
  if (q['manga-oca']) c(q['manga-oca'].ok, 'manga-oca', q['manga-oca'].linha);
  if (q['manga-tela']) c(q['manga-tela'].ok, 'manga-tela', q['manga-tela'].linha);
  for (const regua of ['mira', 'cobertura', 'pistola-ref', 'maos', 'carregador']) {
    const a = q['imagem-3x2']?.[regua]; const b = q['imagem-16x9']?.[regua];
    if (!a && !b) continue;
    if (a?.estado === 'N/A' && b?.estado === 'N/A') continue;
    const cel = (x) => (x?.estado === 'VERDE' ? '✓' : x?.estado === 'VERMELHO' ? '✗' : '·');
    out.push(`<span class="chip ${[a, b].some((x) => x?.estado === 'VERMELHO') ? 'bad' : 'ok'}" title="${esc(`3:2 ${a?.estado} ${a?.msg || ''}\n16:9 ${b?.estado} ${b?.msg || ''}`)}">${esc(regua)} ${cel(a)}${cel(b)}</span>`);
  }
  if (q['carregador-repete']) c(q['carregador-repete'].ok, 'carregador-repete');
  return out.join('');
};
const vclass = (v) => `v-${esc(String(v).split(/[ (]/)[0])}`;
const url = (id) => (fonteDe(id) === 'aprovada'
  ? `http://127.0.0.1:${PORTA}/?debug=1&auto=P,mst&map=piscina_treta&armaslazy=0&vmauthored=1&vmqa=precision`
  : `http://127.0.0.1:${PORTA}/?debug=1&auto=P,mst&map=piscina_treta&armaslazy=0&vmauthored=1&vmqa=precision&vmfabrica=${id}`);
const dono = '<div class="owner"><button data-v="APROVADA">Aprovo</button><button data-v="RESSALVA">Ressalva</button><button data-v="REPROVADA">Reprovo</button><input placeholder="o que está errado (frame + o que se vê)" aria-label="nota do dono"><output></output></div>';
const ORIGEM = { fabrica: 'fábrica pura (vm/fabrica)', variantes: 'variante / plano B (vm/fabrica-variantes, PR #653)', aprovada: 'aprovada fora da fábrica' };
const card = (id) => {
  const cr = critico(id); const fig = figuras(id);
  return `<section class="card" id="${esc(id)}" data-w="${esc(id)}">
  <header><h2>${esc(id)}</h2><span class="tag">${esc(ORIGEM[fonteDe(id)])}</span><span class="verd ${vclass(cr.v)}">crítico: ${esc(cr.v)}</span></header>
  <p class="open">${fonteDe(id) === 'variantes' ? '<span class="ref">no jogo: pelo worktree/servidor das variantes (a chave fab# desta arma vem do PR #653)</span>' : `<a href="${esc(url(id))}" target="_blank" rel="noopener">▶ abrir no jogo</a>`}</p>
  <div class="chips">${chips(id)}</div>
  <div class="grid">${fig.map(([src, f]) => `<figure><a href="${esc(src)}" data-lb><img loading="lazy" src="${esc(src)}" alt="${esc(id)} ${esc(f)}"></a><figcaption>${esc(ROTULO(f))}</figcaption></figure>`).join('') || '<p class="ref">sem figura</p>'}</div>
  ${cr.texto ? `<details><summary>parecer do crítico cego</summary><pre>${esc(cr.texto)}</pre></details>` : ''}
  ${nota(id) ? `<p class="ref"><b>Nota de quem construiu (não é do crítico):</b> ${esc(nota(id))}</p>` : ''}
  ${dono}
</section>`;
};
const linhas = ORDEM.map((id) => {
  const cr = critico(id); const q = qa(id);
  const cel = (a) => { const r = q?.[`imagem-${a}`]; if (!r) return '—';
    return ['mira', 'cobertura', 'pistola-ref', 'maos', 'carregador'].map((k) => (r[k]?.estado === 'VERDE' ? '✓' : r[k]?.estado === 'VERMELHO' ? '✗' : '·')).join(''); };
  return `<tr><td><a href="#${id}">${id}</a></td><td>${esc(ORIGEM[fonteDe(id)])}</td><td><code>${cel('3x2')}</code></td><td><code>${cel('16x9')}</code></td><td class="${vclass(cr.v)}">${esc(cr.v)}</td></tr>`;
}).join('');
const n = (v) => ORDEM.filter((id) => critico(id).v === v).length;

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arsenal da fábrica</title>
<style>
:root{--bg:#f6f5f2;--fg:#1d1d1b;--mut:#6b6960;--card:#fff;--line:#dedbd2;--ok:#1d7a3e;--bad:#b3261e;--warn:#a15c00;--acc:#1f5fbf}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#141413;--fg:#ecebe6;--mut:#9d9a90;--card:#1e1e1c;--line:#34332f;--ok:#5fcf86;--bad:#ff8a80;--warn:#f0b35a;--acc:#8ab4ff}}
:root[data-theme="dark"]{--bg:#141413;--fg:#ecebe6;--mut:#9d9a90;--card:#1e1e1c;--line:#34332f;--ok:#5fcf86;--bad:#ff8a80;--warn:#f0b35a;--acc:#8ab4ff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif}
main{max-width:1500px;margin:0 auto;padding:16px}h1{font-size:22px;margin:8px 0}a{color:var(--acc)}code{font:12px ui-monospace,monospace}
.box{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;overflow-x:auto;margin-bottom:12px}
table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;margin:18px 0}
.card header{display:flex;align-items:center;gap:8px;flex-wrap:wrap}h2{margin:0;font-size:20px;margin-right:auto}.tag{font-size:13px;color:var(--mut)}
.verd{font-weight:700;padding:3px 10px;border-radius:8px;border:1px solid currentColor}
.v-REPROVADA{color:var(--bad)}.v-RESSALVA{color:var(--warn)}.v-APROVADA{color:var(--ok)}.v-PENDENTE,.v-VER{color:var(--mut)}
.chips{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}.chip{font-size:12px;border:1px solid var(--line);border-radius:6px;padding:1px 6px}.chip.ok{color:var(--ok)}.chip.bad{color:var(--bad)}
.grid{display:grid;gap:6px;grid-template-columns:repeat(2,1fr);margin-top:8px}@media(min-width:700px){.grid{grid-template-columns:repeat(5,1fr)}}
figure{margin:0}figure img{width:100%;display:block;border-radius:6px;border:1px solid var(--line)}figcaption{font-size:12px;color:var(--mut)}
details pre{white-space:pre-wrap;font:12px ui-monospace,monospace;background:var(--bg);padding:8px;border-radius:8px}
.owner{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid var(--line)}
.owner button{font:inherit;font-weight:600;border-radius:8px;border:1px solid var(--line);padding:6px 14px;cursor:pointer;background:var(--card);color:var(--fg)}
.owner button[data-v=APROVADA]{color:var(--ok)}.owner button[data-v=REPROVADA]{color:var(--bad)}.owner button[data-v=RESSALVA]{color:var(--warn)}
.owner button.sel{outline:3px solid currentColor}.owner input{flex:1;min-width:200px;font:inherit;padding:6px 8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--fg)}
.owner output{flex-basis:100%;font:12px ui-monospace,monospace;color:var(--mut)}
textarea{width:100%;min-height:110px;font:12px ui-monospace,monospace;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:8px}
#lb{position:fixed;inset:0;background:#000d;display:none;place-items:center;z-index:9;cursor:zoom-out}#lb img{max-width:98vw;max-height:96vh}.ref{color:var(--mut);font-size:13px}
</style></head><body><main>
<h1>Arsenal da fábrica — rodada final</h1>
<div class="box"><p class="ref">${ORDEM.length} armas: ${n('APROVADA')} aprovadas, ${n('RESSALVA')} com ressalva, ${n('REPROVADA')} reprovadas pelo crítico cego (as aprovadas de fora da fábrica contam como aprovadas). Réguas de imagem: mira · cobertura · pistola-ref · mãos · carregador (✓ verde, ✗ vermelho, · n/a). Fábrica pura: <code>vm/fabrica</code> @ ${esc(rev)}, servidor <code>node tools/eval/serve.mjs ${PORTA}</code>; variantes e plano B copiados da página do lote das variantes (PR #653). Nenhuma flag <code>ready</code> nem <code>VM_LAUNCH</code> foi mudada.</p>
<table><thead><tr><th>arma</th><th>origem</th><th>réguas 3:2</th><th>réguas 16:9</th><th>crítico cego</th></tr></thead><tbody>${linhas}</tbody></table></div>
<div class="box"><b>Veredito do dono (colar)</b><textarea id="out" readonly></textarea><button id="cp" style="margin-top:6px">copiar</button></div>
${ORDEM.map(card).join('\n')}
</main><div id="lb"><img alt=""></div>
<script>
const K='fabricaFinal';let st={};try{st=JSON.parse(localStorage.getItem(K)||'{}')}catch{}
const save=()=>{try{localStorage.setItem(K,JSON.stringify(st))}catch{}};
const line=(w)=>{const s=st[w];return s&&s.v?\`VEREDITO-DONO \${w} \${s.v}\${s.n?' — '+s.n:''}\`:''};
const render=()=>{document.getElementById('out').value=Object.keys(st).map(line).filter(Boolean).join('\\n');
 document.querySelectorAll('.card').forEach((c)=>{const w=c.dataset.w,s=st[w]||{};c.querySelectorAll('.owner button').forEach((b)=>b.classList.toggle('sel',b.dataset.v===s.v));const o=c.querySelector('.owner output');if(o)o.textContent=line(w);const i=c.querySelector('.owner input');if(i&&document.activeElement!==i)i.value=s.n||''})};
document.querySelectorAll('.card').forEach((c)=>{const w=c.dataset.w;
 c.querySelectorAll('.owner button').forEach((b)=>b.onclick=()=>{st[w]={...(st[w]||{}),v:b.dataset.v};save();render()});
 const i=c.querySelector('.owner input');if(i)i.oninput=()=>{st[w]={...(st[w]||{}),n:i.value.trim()};save();render()}});
document.getElementById('cp').onclick=()=>{const t=document.getElementById('out');t.select();navigator.clipboard?.writeText(t.value).catch(()=>document.execCommand('copy'))};
const lb=document.getElementById('lb');document.querySelectorAll('[data-lb]').forEach((a)=>a.onclick=(e)=>{e.preventDefault();lb.querySelector('img').src=a.href;lb.style.display='grid'});lb.onclick=()=>lb.style.display='none';
render();
</script></body></html>`;
fs.writeFileSync(path.join(FINAL, 'index.html'), html);
console.log(`PAGINA ${path.join(FINAL, 'index.html')} → http://127.0.0.1:${PORTA}/artifacts/fabrica-final/index.html`);
