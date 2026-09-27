#!/usr/bin/env node
// Página do dono: arma × time com os quadros do jogo (vm-maos-time --fotos), o veredito da
// régua (relatorio.json) e a auditoria da base (relatorio-base.json), com link para o jogo.
// Uso: node tools/eval/vm-maos-time-pagina.mjs [--porta=4701] [--saida=artifacts/maos-por-time]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { TEAM_HANDS, F_OPCOES } from '../../public/js/vmhands.js';
import { FACTIONS } from '../../public/js/factions.js';
import { VM_WEAPON, VM_FAMILY } from '../../public/js/data/vmconfig.js';

const root = path.resolve(import.meta.dirname, '../..');
const opt = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? d;
const porta = opt('porta', '4701');
const dir = path.resolve(root, opt('saida', 'artifacts/maos-por-time'));
const ler = (f) => (fs.existsSync(path.join(dir, f)) ? JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) : null);
const depois = ler('relatorio.json'), antes = ler('relatorio-base.json'), fotos = ler('fotos.json');
const mutantes = ['golden-sem-time', 'faca-time-errado', 'atlas-trocado'].map((m) => [m, ler(`relatorio-${m}.json`)]);
const critico = fs.existsSync(path.join(dir, 'critico/veredito.md')) ? fs.readFileSync(path.join(dir, 'critico/veredito.md'), 'utf8') : '';
const rev = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root }).toString().trim();
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const CHAR = { E: 'esquerdomacho', B: 'caminhoneiro', C: 'bonzo', F: 'mandrake', U: 'emo', M: 'lobisomem' };
const times = (depois?.times || FACTIONS.filter((f) => f.ready).map((f) => f.id));
const nomeTime = (t) => FACTIONS.find((f) => f.id === t)?.name || t;
const familias = [...new Set([...Object.values(VM_WEAPON).map((e) => e.family), ...Object.keys(VM_FAMILY)])].join(',');
const url = (col, arma, t, extra = {}) => {
  const q = new URLSearchParams({ debug: '1', auto: `${t},${CHAR[t] || ''}`, map: 'piscina_treta', vmauthored: '1', vmqa: 'precision',
    vmready: familias, vmweapon: Object.keys(VM_WEAPON).join(','), ...(col === 'ak-golden' ? { vmgolden: 'ak' } : { vmfabrica: '1' }), ...extra });
  return `http://127.0.0.1:${porta}/?${q}`;
};
const colunas = [];
for (const c of [...(depois?.celulas || []), ...(fotos?.celulas || [])]) if (!colunas.some((x) => x.id === c.coluna)) colunas.push({ id: c.coluna, arma: c.arma });

const cel = (rel, col, t) => rel?.celulas.find((c) => c.coluna === col && c.time === t);
function estado(c) {
  if (!c) return { cls: 'na', txt: '—' };
  if (c.erro) return { cls: 'mal', txt: 'erro' };
  if (c.servido === 'legado') return { cls: 'na', txt: 'legado' };
  const mats = c.materiais || [];
  const ok = mats.length && mats.every((m) => m.time === c.time);
  const rigs = [...new Set(mats.map((m) => m.rig))].join('');
  if (!ok) return { cls: 'mal', txt: `${rigs}: ${[...new Set(mats.map((m) => m.time || 'sem time'))].join('/')}` };
  const cor = c.estranho <= 0.12;
  return { cls: cor ? 'bom' : 'mal', txt: `${rigs} ✓${cor ? '' : ` cor ${Math.round(c.estranho * 100)}%`}` };
}
const rigDe = (rel, col) => [...new Set((rel?.celulas || []).filter((c) => c.coluna === col).flatMap((c) => (c.materiais || []).map((m) => m.rig)))].join('') || '—';
const servidoDe = (rel, col) => (rel?.celulas || []).find((c) => c.coluna === col)?.servido || '—';

const linhasAuditoria = colunas.map((col) => `<tr><th>${esc(col.id)}</th><td class="k">${esc(servidoDe(depois, col.id))}</td><td class="k">${esc(rigDe(depois, col.id))}</td>${
  times.map((t) => { const a = estado(cel(antes, col.id, t)), d = estado(cel(depois, col.id, t));
    return `<td><span class="${a.cls}">${esc(a.txt)}</span> → <span class="${d.cls}">${esc(d.txt)}</span></td>`; }).join('')}</tr>`).join('');

const grade = colunas.map((col) => `<tr><th>${esc(col.id)}<div class="k">${esc(servidoDe(fotos || depois, col.id))}</div></th>${times.map((t) => {
  const f = cel(fotos, col.id, t);
  const link = col.id === 'knife-L' ? '' : `<a href="${esc(url(col.id, col.arma, t))}" target="_blank" rel="noopener">abrir no jogo</a>`;
  return `<td>${f?.foto ? `<a href="${esc(f.foto)}" target="_blank"><img loading="lazy" src="${esc(f.foto)}" alt="${esc(col.id)} ${t}"></a>` : '<div class="vazio">sem foto</div>'}${link}</td>`;
}).join('')}</tr>`).join('');

const OPC_COLS = ['ak-golden', 'm4', 'pistol', 'knife', 'knife-L'];
const padraoF = Object.entries(F_OPCOES).find(([, v]) => v === TEAM_HANDS.F)?.[0];
const DESCR = { ouro: 'luva dourada sem dedos, manga preta — ostentação, a cor da facção', grife: 'luva preta com treliça dourada de grife (a jaqueta estampada da arte), sem dedos', corrente: 'luva escura sem dedos, cordão de ouro no pulso e nos nós (proposta anterior; crítico: lê como onça na M4, some na pistola)' };
const opcoesF = Object.entries(F_OPCOES).map(([op, st]) => {
  const fj = op === padraoF ? fotos : ler(`f-${op}/fotos.json`);
  const pre = op === padraoF ? '' : `f-${op}/`;
  return `<tr><th>${op}${op === padraoF ? ' <span class="k">(padrão no código)</span>' : ''}<div class="k">${esc(DESCR[op])}</div><div class="pal"><span style="background:${st.glove}"></span><span style="background:${st.sleeve}"></span><span style="background:${st.accent}"></span></div></th>${OPC_COLS.map((c) => {
    const f = fj?.celulas.find((x) => x.coluna === c && x.time === 'F');
    const link = c === 'knife-L' ? '' : `<a href="${esc(url(c, c.replace('-golden', ''), 'F', { vmmaosf: op }))}" target="_blank" rel="noopener">abrir no jogo</a>`;
    return `<td>${f?.foto ? `<a href="${esc(pre + f.foto)}" target="_blank"><img loading="lazy" src="${esc(pre + f.foto)}" alt="F ${op} ${c}"></a>` : '<div class="vazio">sem foto</div>'}${link}</td>`;
  }).join('')}</tr>`;
}).join('');
const cons = Object.entries(depois?.consistencia || {}).map(([k, v]) => `<tr><th>${esc(k)}</th><td>rgb(${v.mediana.join(', ')})</td><td>${esc(v.pior.coluna)} a ${v.pior.d}</td></tr>`).join('');
const falhas = (depois?.checks || []).filter((c) => !c.ok);
const mut = mutantes.map(([m, r]) => `<li><b>${m}</b>: ${r ? (r.ok ? '<span class="mal">NÃO mordeu</span>' : `<span class="bom">mordeu</span> — ${r.checks.filter((c) => !c.ok).length} falhas`) : 'não rodado'}</li>`).join('');
const pal = Object.values(TEAM_HANDS).map((s) => `<div class="pal"><b>${s.id}</b> ${esc(nomeTime(s.id))}<span style="background:${s.glove}"></span><span style="background:${s.sleeve}"></span><span style="background:${s.accent}"></span><i>${s.motif}${s.fingerless ? ', sem dedos' : ''}</i></div>`).join('');

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mãos por time</title><style>
:root{--bg:#f4f3ef;--fg:#1d1d1b;--mut:#6a6a64;--card:#fff;--line:#d9d7cf;--bom:#1d7a3a;--mal:#b3261e}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#151514;--fg:#eceae4;--mut:#a3a19a;--card:#1f1f1d;--line:#34332f;--bom:#6fd08c;--mal:#ff8a80}}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,sans-serif}main{max-width:1500px;margin:auto;padding:16px}
h1{font-size:22px;margin:4px 0}h2{font-size:17px;margin:24px 0 8px}p{max-width:900px}.k{color:var(--mut);font-size:12px}
.box{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px;margin:12px 0;overflow-x:auto}
table{border-collapse:collapse;font-size:12px}th,td{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}
.grade td{min-width:170px}.grade img{width:170px;display:block;border-radius:4px}.grade a{font-size:11px}
.bom{color:var(--bom)}.mal{color:var(--mal);font-weight:600}.na{color:var(--mut)}.vazio{width:170px;height:113px;background:var(--line);border-radius:4px}
.pal{display:inline-flex;gap:6px;align-items:center;margin:4px 14px 4px 0}.pal span{width:18px;height:18px;border-radius:3px;border:1px solid var(--line)}
pre{white-space:pre-wrap;font:12px/1.4 ui-monospace,monospace}
</style></head><body><main>
<h1>Mãos por time — todos os viewmodels</h1>
<p class="k">branch <code>vm/maos-por-time</code> @ ${esc(rev)} · servidor <code>node tools/eval/serve.mjs ${porta}</code> no worktree <code>vm-maos-por-time</code>. Nenhuma flag <code>ready</code> nem <code>VM_LAUNCH</code> mudou.</p>
<p>Pedido do dono (11/09): "skins de mãos diferentes por time, mas tudo na mesma escala". Os três rigs de braço do jogo — K (SK_Arms_Mono: fábrica, catálogo K, granada, faca K), L (faca aprovada) e A (AK golden) — usam agora o mesmo sistema (<code>vmhands.js</code>): um atlas por rig, pintado no mesmo referencial da mão, com a mesma paleta e o mesmo motivo. A AK golden, que ficava fora, recebe o time; a troca de time no meio da partida reaplica em todas as armas carregadas.</p>
<div class="box">${pal}<div class="k">cor da luva, da manga e do acento; neutro = base da fábrica (luva e manga Mandrake da AK aprovada)</div></div>
<h2>Arma × time, no jogo</h2>
<p class="k">Quadro de idle no jogo real (pós ligado). "abrir no jogo" abre a partida com o personagem do time; troque de arma no painel de QA ou no console com <code>__vmPrecisionQa.equip('m4')</code>. A AK golden abre com <code>?vmgolden=ak</code>; a faca L não tem URL (a régua troca o GLB da faca K pela L).</p>
<div class="box"><table class="grade"><tr><th>arma</th>${times.map((t) => `<th>${t} · ${esc(nomeTime(t))}</th>`).join('')}</tr>${grade}</table></div>
<h2>FUNKEIROS: escolha do dono (três propostas)</h2>
<p class="k">Mesma régua para as três; no jogo, <code>?vmmaosf=ouro|grife|corrente</code> troca a opção (só revisão). A que ficar vira o padrão em <code>F_OPCOES</code>/<code>TEAM_HANDS.F</code> (vmhands.js).</p>
<div class="box"><table class="grade"><tr><th>opção</th>${OPC_COLS.map((c) => `<th>${c}</th>`).join('')}</tr>${opcoesF}</table></div>
<h2>Auditoria: antes (base vm/fabrica) → depois</h2>
<p class="k">Célula = rig(s) da mão e se todo material de mão é o atlas do time; "cor N%" = pixels de mão fora da paleta do time no passe de albedo. K/L/A = rig. Base: ${esc(antes ? 'origin/vm/fabrica' : 'não rodada')}.</p>
<div class="box"><table><tr><th>arma</th><th>servido</th><th>rig</th>${times.map((t) => `<th>${t}</th>`).join('')}</tr>${linhasAuditoria}</table></div>
<h2>Régua <code>eval:vm-maos-time</code></h2>
<div class="box"><p>${depois ? `${depois.ok ? '<span class="bom">VERDE</span>' : '<span class="mal">VERMELHA</span>'} — ${depois.checks.length} verificações, ${falhas.length} falhas.` : 'não rodada'}</p>
${falhas.length ? `<pre>${esc(falhas.map((f) => `${f.nome} ${JSON.stringify(f.evid || '')}`).join('\n'))}</pre>` : ''}
<table><tr><th>time/parte</th><th>mediana (albedo)</th><th>pior arma, distância RGB</th></tr>${cons}</table>
<p class="k">Mutantes:</p><ul>${mut}</ul>
<p class="k">Tetos: pixel a mais de ${depois?.tetos?.LIMIAR ?? '—'} RGB de toda a paleta é "cor estranha" (máx. ${depois?.tetos?.MAX_ESTRANHO ?? '—'}); mediana de luva/manga a ${depois?.tetos?.TOL_PALETA ?? '—'} da cor declarada; entre armas a ${depois?.tetos?.TOL_CONSIST ?? '—'}. ${esc(depois?.tetos?.procedencia || '')}</p></div>
<h2>Crítico cego</h2><div class="box">${critico ? `<pre>${esc(critico)}</pre>` : '<p class="k">ainda não rodado</p>'}</div>
</main></body></html>`;
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log(path.join(dir, 'index.html'));
