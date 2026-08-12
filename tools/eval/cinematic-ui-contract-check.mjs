/* ============================================================================
   cinematic-ui-contract-check.mjs — o chrome cinematográfico cobre TODO fluxo de tela?
   ----------------------------------------------------------------------------
   POR QUE EXISTE
     Pedido do dono em 11/08/2026: "uma UI bem cinematográfica de todos os flows do
     menu". O baseline real em Astro, 1536x1024, mostrou cada trecho falando um idioma:
     facções = catálogo de dez cards, mapa = campo preto, configurações = formulário e
     pausa = modal. Esta régua não tenta dar nota de "cinema". Ela cobra apenas as
     decisões estruturais que podem sumir sem erro: um chrome persistente, metadados
     para toda tela roteada, uma superfície compartilhada, foco e reduced-motion.

   O QUE MEDE, E POR QUE ASSIM
     O inventário vem do `screens` de PRODUÇÃO em public/js/main.js. Cada id ali precisa
     existir como `.cine-surface` no Astro e como chave de CINE_SCREEN_META; portanto
     adicionar uma tela nova sem integrá-la deixa o portão vermelho. A captura visual
     continua obrigatória: este contrato prova cobertura/estados, não beleza.

   MUTAÇÕES
     --mutante=sem-chrome   remove o único #cine-chrome -> CINE1 vermelha
     --mutante=sem-tela     remove match-end dos metadados -> CINE2 vermelha
     --mutante=sem-movimento reduzido remove o bloco de acessibilidade -> CINE5 vermelha
     --mutante=sem-runtime  corta o hook de pausa real -> CINE6 vermelha
     --mutante=composicao-antiga restaura os seis shells da alpha.58 -> CINE7 vermelha
     --mutante=faccao-rolavel restaura paginação/scroll -> CINE8 vermelha

   Uso: node tools/eval/cinematic-ui-contract-check.mjs [--mutante=<nome>] [--json]
   ============================================================================ */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MAIN_PATH = path.join(ROOT, 'public/js/main.js');
const ASTRO_PATH = path.join(ROOT, 'src/pages/index.astro');
const CSS_PATH = path.join(ROOT, 'public/style.css');
const FACTION_PATH = path.join(ROOT, 'public/js/factions.js');
const mutante = (process.argv.find(a => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const json = process.argv.includes('--json');

let main = readFileSync(MAIN_PATH, 'utf8');
let astro = readFileSync(ASTRO_PATH, 'utf8');
let css = readFileSync(CSS_PATH, 'utf8');
const factions = readFileSync(FACTION_PATH, 'utf8');

function troca(src, antigo, novo, nome) {
  const out = src.replace(antigo, novo);
  if (out === src) {
    console.error(`MUTANTE NAO APLICOU: ${nome} — o código mudou de forma; atualize a mutação`);
    process.exit(2);
  }
  return out;
}

if (mutante === 'sem-chrome') astro = troca(astro, 'id="cine-chrome"', 'id="cine-chrome-removido"', mutante);
if (mutante === 'sem-tela') main = troca(main,
  /\n\s*'match-end':\s*\{[^\n]+\},?/, '', mutante);
if (mutante === 'sem-movimento-reduzido') css = troca(css,
  /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\/\* cine-reduced-motion \*\/[\s\S]*?\}/,
  '/* cine reduced motion removido pelo mutante */', mutante);
if (mutante === 'sem-runtime') main = troca(main,
  "applyCinematicScreen(paused ? 'pause-menu' : null);",
  '/* hook cinematográfico removido pelo mutante */', mutante);
if (mutante === 'composicao-antiga') {
  const regressions = [
    ['data-ui-layout="home-broadcast"', 'class="cs-left"'],
    ['data-ui-layout="mission-cut"', 'class="cs-setup"'],
    ['data-ui-layout="faction-editorial"', 'class="team-rail"'],
    ['data-ui-layout="cast-stage"', 'class="char-stage"'],
    ['data-ui-layout="map-broadcast"', 'class="map-screen-legacy"'],
    ['data-ui-layout="settings-cockpit"', 'class="panel settings-wrap"'],
  ];
  for (const [novo, antigo] of regressions) astro = troca(astro, novo, antigo, mutante);
}
if (mutante === 'faccao-rolavel') css = troca(css,
  'display:grid;grid-template-columns:repeat(5,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:8px;overflow:hidden',
  'display:flex;gap:8px;overflow:auto', mutante);
if (mutante && !['sem-chrome', 'sem-tela', 'sem-movimento-reduzido', 'sem-runtime', 'composicao-antiga', 'faccao-rolavel'].includes(mutante)) {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

const results = [];
const put = (id, desc, ok, evid) => results.push({ id, desc, ok, evid });

const screenMatch = /const screens\s*=\s*\[([^\]]+)\]/.exec(main);
const screens = screenMatch ? [...screenMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]) : [];
put('CINE0', 'o inventário vem do array screens de produção', screens.length > 0,
  screens.length ? `${screens.length} telas: ${screens.join(', ')}` : 'não consegui ler public/js/main.js: screens');

const chromeCount = (astro.match(/id="cine-chrome"/g) || []).length;
put('CINE1', 'existe um único chrome cinematográfico persistente e decorativo',
  chromeCount === 1 && /id="cine-chrome"[^>]*aria-hidden="true"/.test(astro),
  `${chromeCount} #cine-chrome; esperado 1 com aria-hidden=true`);

const metaStart = main.indexOf('const CINE_SCREEN_META = Object.freeze({');
let metaKeys = [];
if (metaStart >= 0) {
  const metaEnd = main.indexOf('\n});', metaStart);
  const block = metaEnd >= 0 ? main.slice(metaStart, metaEnd) : '';
  metaKeys = [...block.matchAll(/^\s*'([^']+)':\s*\{/gm)].map(m => m[1]);
}
const missingMeta = screens.filter(s => !metaKeys.includes(s));
const extraMeta = metaKeys.filter(s => !screens.includes(s));
put('CINE2', 'toda tela roteada declara seção, etapa e progresso no chrome',
  screens.length > 0 && missingMeta.length === 0 && extraMeta.length === 0,
  `faltam [${missingMeta.join(', ') || 'nenhuma'}] · sobram [${extraMeta.join(', ') || 'nenhuma'}]`);

const missingSurface = screens.filter(id => {
  const re = new RegExp(`<div\\s+id=["']${id}["'][^>]*class=["'][^"']*\\bcine-surface\\b`);
  return !re.test(astro);
});
put('CINE3', 'toda tela roteada usa a superfície compartilhada no DOM real',
  screens.length > 0 && missingSurface.length === 0,
  `sem .cine-surface: ${missingSurface.join(', ') || 'nenhuma'}`);

const applies = /function\s+show\(id\)[\s\S]{0,900}applyCinematicScreen\(id\)/.test(main);
const writesState = /document\.body\.dataset\.cineScreen/.test(main)
  && /cine-section/.test(main) && /cine-step/.test(main) && /cine-progress/.test(main);
put('CINE4', 'o roteador de produção atualiza o chrome a cada show(id)', applies && writesState,
  `show->apply=${applies} · estado/labels=${writesState}`);

const sharedCss = /--cine-frame:/.test(css)
  && /#cine-chrome\{/.test(css)
  && /body\[data-cine-screen\]/.test(css)
  && /\.cine-surface:not\(\.hidden\)/.test(css)
  && /\.cine-surface\s+:is\([^)]*button/.test(css) && /:focus-visible/.test(css);
const reduced = /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\/\* cine-reduced-motion \*\//.test(css);
put('CINE5', 'CSS compartilhado cobre moldura, entrada, foco e reduced-motion', sharedCss && reduced,
  `chrome/foco=${sharedCss} · reduced-motion=${reduced}`);

const pauseRuntime = /onPauseChange\s*=\s*\(paused\)[\s\S]{0,180}applyCinematicScreen\(paused \? 'pause-menu' : null\)/.test(main);
const endRuntime = /async function recordMatchStats\(s\)[\s\S]{0,120}applyCinematicScreen\('match-end'\)/.test(main);
put('CINE6', 'pausa e resultado acionam o chrome pelos caminhos reais do jogo', pauseRuntime && endRuntime,
  `pause=${pauseRuntime} · match-end=${endRuntime}`);

/* CINE7 — BUG-42, palavras do dono: "a UI continua a mesma de sempre".
   O contrato anterior premiava decoração: chrome, foco e reduced-motion podiam ficar
   verdes sobre os mesmos cinco shells da alpha.58. Esta cláusula lê o DOM de produção
   e exige seis composições novas, cada uma com landmarks próprios. Não tenta dar nota
   estética; prova que a árvore deixou de ser a velha coluna/cards/filmstrip/painel. */
const structuralFlows = [
  ['home-broadcast', ['home-mode-deck', 'home-service-strip']],
  ['mission-cut', ['mission-visual', 'mission-console']],
  ['faction-editorial', ['faction-index', 'faction-hero']],
  ['cast-stage', ['cast-rail', 'cast-avatar', 'cast-dossier']],
  ['map-broadcast', ['map-story', 'map-reel']],
  ['settings-cockpit', ['settings-nav', 'settings-workbench']],
];
const structuralEvidence = structuralFlows.map(([layout, landmarks]) => {
  const hasLayout = astro.includes(`data-ui-layout="${layout}"`);
  const missing = landmarks.filter(name => !new RegExp(`class=["'][^"']*\\b${name}\\b`).test(astro));
  return { layout, ok: hasLayout && missing.length === 0, missing: hasLayout ? missing : ['shell'] };
});
const legacyShells = ['cs-left', 'team-rail', 'char-filmstrip', 'panel settings-wrap']
  .filter(name => astro.includes(`class="${name}"`));
put('CINE7', 'os seis fluxos usam composições próprias, não os shells da alpha.58',
  structuralEvidence.every(x => x.ok) && legacyShells.length === 0,
  `${structuralEvidence.filter(x => x.ok).length}/${structuralEvidence.length} fluxos novos · ` +
  `faltas: ${structuralEvidence.filter(x => !x.ok).map(x => `${x.layout}[${x.missing.join('+')}]`).join(', ') || 'nenhuma'} · ` +
  `shells antigos: ${legacyShells.join(', ') || 'nenhum'}`);

/* CINE8 — specs/0002-novas-faccoes/spec.md §2: dez facções simultâneas em 5×2,
   sem paginação/rolagem, e o adversário indisponível não desloca a grade. O hero novo
   pode coexistir com a decisão; não pode transformar a regra de produto em carrossel. */
const factionPageSize = Number(/FACTION_PAGE_SIZE\s*=\s*(\d+)/.exec(factions)?.[1] || 0);
const gridFiveByTwo = /\.faction-index \.team-row\{display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\);grid-template-rows:repeat\(2,minmax\(0,1fr\)\);gap:8px;overflow:hidden/.test(css);
const noPagination = /\.faction-index \.team-rail-arrow\{display:none\}/.test(css);
const stableEnemy = /\.faction-index \.team-card\.faction-excluded\{visibility:hidden;pointer-events:none\}/.test(css);
put('CINE8', 'as dez facções ficam simultâneas em grade 5×2 e estáveis no adversário',
  factionPageSize === 10 && gridFiveByTwo && noPagination && stableEnemy,
  `pageSize=${factionPageSize} · grade5x2=${gridFiveByTwo} · sem paginação=${noPagination} · posição adversário estável=${stableEnemy}`);

const failures = results.filter(r => !r.ok);
if (json) console.log(JSON.stringify({ mutante: mutante || null, results }, null, 2));
else {
  console.log(`\nCINEMATIC UI CONTRACT${mutante ? ` · mutante=${mutante}` : ''}`);
  for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.id} ${r.desc}\n    ${r.evid}`);
  console.log(`\n${results.length - failures.length}/${results.length} cláusulas verdes`);
  if (failures.length) console.log('Correção: integre chrome/estado, os seis layouts estruturais e preserve a grade de facções 5×2 sem scroll.');
}
process.exit(failures.length ? 1 : 0);
