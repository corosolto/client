/* poda.mjs — podador: relatório semanal de arquivo sem uso e estado inchado.
   ─────────────────────────────────────────────────────────────────────────────
   O QUE É: ronda semanal na MAIN com duas frentes:
     · ARQUIVO MORTO (determinístico): módulos de public/js inalcançáveis a
       partir das entradas (main.js + imports dos HTML servidos) via grafo de
       importação real, e assets (img/models) cujo nome de arquivo não aparece
       em NENHUM código da árvore. O que o arnês usa fica em classe separada.
     · ESTADO INCHADO (LLM, advisory, --deep): os maiores módulos avaliados por
       prompt — superengenharia é julgamento, e julgamento errado custa jogo.

   REGRA DURA (medo do dono declarado: "otimizar demais e quebrar o jogo"):
   o podador NUNCA apaga, NUNCA abre PR de remoção. Abre/EDITA uma issue
   semanal com a lista e a prova de cada candidato. Quem decide é humano; a
   prova vem junto (por que cada um está na lista). Falso positivo declarado é
   resposta válida — o item sai da próxima edição com o motivo registrado.

   COMANDOS:
     bun poda.mjs rodada [--deep]   varredura + issue semanal (editada, dedupe)
     bun poda.mjs relatorio         imprime o relatório sem postar nada
     bun poda.mjs selftest          fixture mínima offline
*/
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarCliente } from '../lib/gh.mjs';
import { carregarPersona, cabecalho, assinatura } from '../lib/persona.mjs';
import { perguntar } from '../lib/llm.mjs';
import { grafoDeImports, listaModulos, alcancaveis } from '../lib/grafo.mjs';
import { tabela, lista, alerta } from '../lib/formatacao.mjs';
import { extraiJson } from '../estraga-codigo/canarinho.mjs';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(readFileSync(join(RAIZ, 'config.json'), 'utf8'));
const PERSONA = carregarPersona(RAIZ);
const ESTADO_DIR = join(RAIZ, 'estado');
if (!existsSync(ESTADO_DIR)) mkdirSync(ESTADO_DIR, { recursive: true });
const { gh, api } = criarCliente({ patEnv: CFG.pat_env, estadoDir: ESTADO_DIR, repo: CFG.repo });
const REPO_DIR = resolve(RAIZ, CFG.base_dir || '../..');
const log = (...a) => console.log(`[${new Date().toLocaleTimeString('pt-BR')}]`, ...a);
const MARCADOR = '<!-- podador: ronda-semanal -->';

/* ── referências: nomes de arquivo citados em código vivo ──────────────────── */
export const RE_EXT = /[\w./-]+\.(?:js|mjs|css|png|webp|jpe?g|gif|glb|mp3|wav|ogg|json|woff2?)/g;
const PULAR = new Set(['node_modules', '.git', '.astro', '.vercel', 'docs', 'dist', 'graphify-out', 'godot', 'editor', 'estado']);

export function varreReferencias(dirRaiz, { ler = readFileSync, anda = readdirSync } = {}) {
  const refs = new Set();
  (function varre(d) {
    for (const e of anda(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { if (!PULAR.has(e.name)) varre(p); continue; }
      if (!/\.(js|mjs|ts|astro|html|css|json|sh|py|md)$/.test(e.name)) continue;
      if (statSync(p).size > 2_000_000) continue;
      const t = ler(p, 'utf8');
      for (const m of t.matchAll(RE_EXT)) {
        refs.add(m[0].split('/').pop());
        refs.add(m[0].replace(/^\.\//, ''));
      }
    }
  })(dirRaiz);
  return refs;
}

/* ── classificação de módulos ──────────────────────────────────────────────── */
export function classificarModulos({ modulos, grafo, entradas, refs }) {
  const vivos = alcancaveis(entradas, grafo);
  const mortos = [];
  const arnes = [];
  for (const m of modulos) {
    if (vivos.has(m)) continue;
    const base = m.split('/').pop();
    (refs.has(base) || refs.has(`public/js/${m}`) ? arnes : mortos).push(m);
  }
  return { mortos, arnes };
}

/* Assets (img/models) sem NENHUMA citação do nome em código. Dinamicamente
 * montados (or-*, walls) citam o nome em código — a expressão que monta o nome
 * conta como uso e o arquivo fica de fora da lista. */
export function assetsMortos(dirRaiz, refs, { teto = CFG.max_assets_relatorio } = {}) {
  const mortos = [];
  for (const dir of ['public/img', 'public/models']) {
    const base = join(dirRaiz, dir);
    if (!existsSync(base)) continue;
    (function varre(d) {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) { varre(p); continue; }
        if (!/\.(png|webp|jpe?g|gif|glb)$/i.test(e.name)) continue;
        const rel = relative(dirRaiz, p).split('/').join('/');
        if (/\/(avatars|chars)\//.test(rel)) return;   // elenco: sempre usado (menus e bots)
        if (!refs.has(e.name)) mortos.push(rel);
      }
    })(base);
  }
  return mortos.slice(0, teto);
}

/* ── entradas: main.js + o que os HTML servidos importam ───────────────────── */
export function entradasDeHtml(dirRaiz) {
  const entradas = [];
  const htmls = [join(dirRaiz, 'public', 'mapview.html')].filter(existsSync);
  for (const h of htmls) {
    for (const m of readFileSync(h, 'utf8').matchAll(/['"]\.\/js\/([\w./-]+\.js)['"]/g)) entradas.push(m[1]);
  }
  return entradas;
}

/* ── estado inchado (LLM, advisory) ────────────────────────────────────────── */
export function promptDeep(mod, info) {
  return `Você audita SUPERENGENHARIA num arquivo do jogo CORO SOLTO (browser FPS, zero build).
Arquivo: ${mod} · ${info.linhas} linhas · importado por: ${info.importadores.join(', ') || 'ninguém'}
Primeiras linhas (o cabeçalho documenta as decisões — leia antes de julgar):

${info.cabecalho}

Julgue com o critério da casa: código que existe PARA o jogo hoje, ou estrutura
que existe para um futuro que nunca chegou (abstração sem segundo uso, camada
que só repassa, configuração que ninguém configura, régua que não morde)?
Cuidado com o OPONGO: arquivo grande por HISTÓRICO de decisões documentadas é o
padrão daqui (game.js é grande POR CAUSA dos casos do KNOWN-BUGS) — tamanho não
é defeito. Acuse só o que você removeria hoje com convicção.

Responda SOMENTE JSON: {"inchado": true|false, "motivo":"<=2 frases técnicas", "acao":"o que encolher, concreto"}`;
}

export async function deepScan({ dirJs, top = CFG.deep_top, perguntarFn = perguntar, cfg = CFG, dirBot = RAIZ }) {
  const grafo = grafoDeImports(dirJs);
  const tamanho = listaModulos(dirJs)
    .map((m) => ({ m, linhas: readFileSync(join(dirJs, m), 'utf8').split('\n').length }))
    .sort((a, b) => b.linhas - a.linhas)
    .slice(0, top);
  const achados = [];
  for (const { m, linhas } of tamanho) {
    const texto = readFileSync(join(dirJs, m), 'utf8');
    const cabecalho = texto.split('\n').slice(0, 60).join('\n');
    const importadores = grafo.get(m) || [];
    try {
      const r = await perguntarFn(promptDeep(m, { linhas, cabecalho, importadores }), { cfg, dirBot });
      const d = extraiJson(r);
      if (d && typeof d.inchado === 'boolean' && d.inchado && d.motivo) achados.push({ modulo: m, linhas, motivo: d.motivo, acao: d.acao || '' });
    } catch (e) { log(`deep ${m}: ${String(e.message).split('\n')[0]}`); }
  }
  return achados;
}

/* ── relatório e issue ─────────────────────────────────────────────────────── */
export function corpoRelatorio({ mortos, arnes, assets, deep }, { semana }) {
  const linhas = [];
  if (mortos.length) linhas.push(`### módulo morto (${mortos.length})\n\n${tabela({ colunas: ['arquivo', 'prova'], linhas: mortos.map((m) => [m, 'inalcançável de main.js/HTML e sem citação em código']) })}`);
  if (arnes.length) linhas.push(`### só o arnês usa (${arnes.length})\n\n${lista(arnes.map((m) => `\`${m}\` — vivo pelo harness/eval, não pelo jogo`))}`);
  if (assets.length) linhas.push(`### asset sem citação (${assets.length}${assets.length >= (CFG.max_assets_relatorio || 40) ? '+' : ''})\n\n${lista(assets.map((a) => `\`${a}\``))}`);
  if (deep.length) linhas.push(`### estado inchado — julgamento advisory (${deep.length})\n\n${tabela({ colunas: ['arquivo', 'linhas', 'por quê'], linhas: deep.map((d) => [d.modulo, d.linhas, d.motivo]) })}\n${deep.map((d) => d.acao ? `- \`${d.modulo}\`: ${d.acao}` : '').filter(Boolean).join('\n')}`);
  const miolo = `${MARCADOR}

## Ronda do estado — ${semana}

${linhas.length ? alerta('nota', `**${mortos.length} módulo(s) morto(s) · ${assets.length} asset(s) sem citação${deep.length ? ` · ${deep.length} achado(s) de superengenharia` : ''}.** Nada foi apagado: cada item vem com a prova; falso positivo se refuta no fio e sai da próxima edição.`)
    : alerta('dica', 'Nada na lista desta semana: nenhum módulo inalcançável, nenhum asset sem citação.')}

${linhas.join('\n\n')}

> O podador nunca apaga e nunca abre PR de remoção — o medo declarado da casa
> é otimização que quebra o jogo. Esta issue é cobrança com prova, sentença é
> de humano.`;
  return `${cabecalho(PERSONA)}\n\n${miolo}\n\n---\n${assinatura(PERSONA)}`;
}

async function publicar(relat) {
  const dirRel = join(ESTADO_DIR, 'relatorios');
  if (!existsSync(dirRel)) mkdirSync(dirRel, { recursive: true });
  const nome = `ronda-${relat.semana}.md`;
  writeFileSync(join(dirRel, nome), relat.corpo);
  const abertas = gh(['issue', 'list', '-R', CFG.repo, '--state', 'open', '--limit', '100', '--json', 'number,body,title'], { json: true });
  const minha = abertas.find((i) => (i.body || '').includes(MARCADOR));
  if (minha) { api(`repos/${CFG.repo}/issues/${minha.number}`, 'PATCH', { body: relat.corpo }); log(`issue #${minha.number} EDITADA`); }
  else { gh(['issue', 'create', '-R', CFG.repo, '--title', 'ronda do estado — arquivo sem uso e superengenharia', '--body', relat.corpo]); log('issue aberta'); }
}

/* ── rodada ────────────────────────────────────────────────────────────────── */
async function rodada({ deep = process.argv.includes('--deep') } = {}) {
  const dirJs = join(REPO_DIR, 'public', 'js');
  const grafo = grafoDeImports(dirJs);
  const entradas = [...new Set([...(CFG.entradas || ['main.js']), ...entradasDeHtml(REPO_DIR)])];
  const refs = varreReferencias(REPO_DIR);
  const { mortos, arnes } = classificarModulos({ modulos: listaModulos(dirJs), grafo, entradas, refs });
  const assets = assetsMortos(REPO_DIR, refs);
  log(`módulos: ${mortos.length} morto(s) · ${arnes.length} só-arnês · assets: ${assets.length}`);
  const achadosDeep = deep ? await deepScan({ dirJs }) : [];
  const semana = new Date().toISOString().slice(0, 10);
  const relat = { semana, corpo: corpoRelatorio({ mortos, arnes, assets, deep: achadosDeep }, { semana }) };
  await publicar(relat);
}

async function selftest() {
  /* árvore sintética: main→a→b (vivo), c isolado (morto), d citado só por
   * tools (arnês), asset sem citação (morto) e com citação (vivo). */
  const { mkdtempSync, writeFileSync: wf } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const tmp = mkdtempSync(join(tmpdir(), 'podador-'));
  wf(join(tmp, 'main.js'), "import { a } from './a.js';\n");
  wf(join(tmp, 'a.js'), "import { b } from './b.js';\n");
  wf(join(tmp, 'b.js'), 'export const b = 1;\n');
  wf(join(tmp, 'c.js'), 'export const c = 1;\n');
  wf(join(tmp, 'd.js'), 'export const d = 1;\n');
  mkdirSync(join(tmp, 'public', 'img'), { recursive: true });
  wf(join(tmp, 'public', 'img', 'vivo.png'), 'x');
  wf(join(tmp, 'public', 'img', 'morto.png'), 'x');
  wf(join(tmp, 'refs.js'), "/* tools usam d.js e img/vivo.png */\n");

  const grafo = new Map([['a.js', ['main.js']], ['b.js', ['a.js']]]);
  const refs = new Set(['d.js', 'vivo.png']);
  const { mortos, arnes } = classificarModulos({ modulos: ['main.js', 'a.js', 'b.js', 'c.js', 'd.js'], grafo, entradas: ['main.js'], refs });
  const ok1 = mortos.length === 1 && mortos[0] === 'c.js';
  const ok2 = arnes.length === 1 && arnes[0] === 'd.js';
  const assets = assetsMortos(tmp, refs, { teto: 10 });
  const ok3 = assets.length === 1 && assets[0].endsWith('img/morto.png');
  const corpo = corpoRelatorio({ mortos, arnes, assets, deep: [{ modulo: 'x.js', linhas: 100, motivo: 'camada que só repassa', acao: 'colar direto' }] }, { semana: '2026-08-16' });
  const ok4 = corpo.includes(MARCADOR) && corpo.includes('**1 módulo(s) morto(s)') && corpo.includes('| c.js') && corpo.includes('estado inchado') && corpo.includes('nunca apaga');
  console.log(`  c.js morto, d.js só-arnês: ${ok1 && ok2 ? '✓' : '✗ ' + JSON.stringify({ mortos, arnes })}`);
  console.log(`  asset sem citação isolado: ${ok3 ? '✓' : '✗ ' + JSON.stringify(assets)}`);
  console.log(`  relatório com prova e contrato: ${ok4 ? '✓' : '✗'}`);
  const tudo = ok1 && ok2 && ok3 && ok4;
  console.log(tudo ? '✓ SELFTEST verde' : '✗ SELFTEST vermelho');
  process.exit(tudo ? 0 : 1);
}

const [cmd] = process.argv.slice(2);
const chamadoDireto = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (chamadoDireto) {
  if (cmd === 'rodada') await rodada();
  else if (cmd === 'relatorio') { const r = { mortos: [], arnes: [], assets: [], deep: [] }; console.log(corpoRelatorio(r, { semana: 'x' })); }
  else if (cmd === 'selftest') await selftest();
  else { console.log('uso: poda.mjs rodada [--deep]|relatorio|selftest'); process.exit(2); }
}
