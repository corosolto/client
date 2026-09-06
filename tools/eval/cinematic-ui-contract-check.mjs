/* Menu alinhado à main 695557906bcf6a8a3a80e8baf4c434d17d492944.
   Pedido do dono em 06/09/2026 substitui os shells cinematográficos do BUG-42.
   Referência: src/pages/index.astro e public/style.css desse SHA; adaptação preserva
   o registro de dez facções 5×2 e o fluxo local. docs/reports/SERTAO-MENU-MAIN.md.
   Contrato estrutural, não aprovação visual: capturas Astro 1536×1024 são obrigatórias.
   Cada --mutante abaixo altera uma única cláusula. --mutantes prova o conjunto exato.
*/
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = new URL('../../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
let astro = read('src/pages/index.astro');
let main = read('public/js/main.js');
let css = read('public/style.css');
const mutante = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1] || '';
const targets = { cinema: 'MENU1', elenco: 'MENU2', personagem: 'MENU3', configuracoes: 'MENU4', preview: 'MENU5', rota: 'MENU6', foco: 'MENU7', indisponivel: 'MENU8' };
function replace(src, before, after) {
  const changed = src.replace(before, after);
  if (changed === src) throw new Error(`MUTANTE NAO APLICOU: ${mutante}`);
  return changed;
}
if (mutante && !targets[mutante]) throw new Error(`Mutante desconhecido: ${mutante}`);
if (mutante === 'cinema') astro = replace(astro, 'class="cs-left"', 'class="home-broadcast"');
if (mutante === 'elenco') main = replace(main, "card.dataset.ready === '1' && n > 0", 'true');
if (mutante === 'personagem') astro = replace(astro, 'class="char-stage"', 'class="cast-stage"');
if (mutante === 'configuracoes') astro = replace(astro, 'class="panel settings-wrap"', 'class="settings-cockpit"');
if (mutante === 'preview') main = replace(main, 'bindMapPreview(b, b.dataset.id);', 'void b.dataset.id;');
if (mutante === 'rota') astro = replace(astro, 'id="pause-menu"', 'id="pause-menu-removido"');
if (mutante === 'foco') css = replace(css, '.team-card:focus-visible{outline:', '.team-card:focus{outline:');
if (mutante === 'indisponivel') css = replace(css, '.team-card:not([aria-disabled="true"]):hover .team-cta', '.team-card:hover .team-cta');
const results = [];
function check(id, desc, ok, evid) { results.push({ id, desc, ok: !!ok, evid }); }
const classHas = name => new RegExp(`class="[^"\\n]*\\b${name}\\b`).test(astro);
check('MENU1', 'home usa coluna e entrada local direta da main',
  classHas('cs-left') && classHas('aaa-links') && /data-act="sp"/.test(astro)
  && !/id="cine-chrome"|data-ui-layout="home-broadcast"|data-act="jogar"|data-act="mp"/.test(astro)
  && /case 'sp':\s*openModeMap\('rounds', 'SINGLE PLAYER'/.test(main),
  'coluna cs-left, links reais e SINGLE PLAYER; sem casca cinema/submenu/MP sem runtime');
check('MENU2', 'dez facções do registro ficam em grade, com bloqueio de elenco e adversário estável',
  /FACTIONS\.map\s*\(/.test(astro) && !/FACTIONS\.slice/.test(astro)
  && /data-faction=\{f.id\}/.test(astro) && /card.dataset.ready === '1' && n > 0/.test(main)
  && /grid-template-columns:repeat\(5,minmax\(0,1fr\)\);grid-template-rows:repeat\(2,minmax\(0,1fr\)\)/.test(css)
  && /\.team-card.faction-excluded\{visibility:hidden;pointer-events:none\}/.test(css)
  && !/class="faction-editorial"|id="faction-hero"/.test(astro),
  'FACTIONS sem recorte, ready AND roster, grade5×2 e posição preservada');
check('MENU3', 'personagem usa ficha, preview e faixa de elenco da main',
  ['char-stage', 'char-filmstrip', 'char-sheet', 'char-preview-box'].every(classHas)
  && !classHas('cast-stage') && /id="char-voice-caption"/.test(astro),
  'quatro landmarks da main e legenda de voz preservada');
check('MENU4', 'configurações usam wrap e abas da main',
  classHas('panel settings-wrap') && /id="settings-panel"[^>]*data-active-tab="video"/.test(astro)
  && !classHas('settings-cockpit') && /class="set-preview-wrap"/.test(astro),
  'wrap, aba inicial e prévia mantidos');
check('MENU5', 'preview real conecta as duas superfícies e encerra na navegação',
  /import \{ bindMapPreview, stopMapPreviews, previewRevision \} from '.\/map_preview.js'/.test(main)
  && /bindMapPreview\(mapThumb.parentElement, currentMap\)/.test(main)
  && /bindMapPreview\(b, b.dataset.id\)/.test(main)
  && /function show\(id\)\s*\{\s*stopMapPreviews\(\)/.test(main)
  && /href=\{`\/map-preview.css\?v=/.test(astro),
  'poster/card vinculados; saída pausa todos; stylesheet com revisão');
const screens = [...(main.match(/const screens\s*=\s*\[([^\]]+)\]/)?.[1] || '').matchAll(/'([^']+)'/g)].map(m => m[1]);
const missing = screens.filter(id => (astro.match(new RegExp(`id="${id}"`, 'g')) || []).length !== 1);
check('MENU6', 'inventário de telas de produção resolve DOM único', screens.length > 0 && missing.length === 0,
  `${screens.length} telas; IDs ausentes/duplicados: ${missing.join(', ') || 'nenhum'}`);
check('MENU7', 'foco de cartão e preferência de movimento ficam explícitos',
  /\.team-card:focus-visible\{outline:/.test(css)
  && /@media\s*\(prefers-reduced-motion:reduce\)\{[\s\S]*?\.team-card/.test(css),
  'foco visível e transições reduzidas na seleção');
check('MENU8', 'facção indisponível não promete entrada no hover ou foco',
  css.includes('.team-card:not([aria-disabled="true"]):hover .team-cta,.team-card:not([aria-disabled="true"]):focus-visible .team-cta{opacity:1}'),
  'crítica visual encontrou EM PRODUÇÃO junto de ENTRAR NESSE CORO');
const failures = results.filter(r => !r.ok).map(r => r.id);
if (process.argv.includes('--mutantes')) {
  if (failures.length) throw new Error(`Baseline vermelho: ${failures.join(', ')}`);
  for (const [name, target] of Object.entries(targets)) {
    const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url), `--mutante=${name}`, '--json'], { encoding: 'utf8' });
    const result = JSON.parse(run.stdout);
    if (run.status !== 1 || JSON.stringify(result.failures) !== JSON.stringify([target])) {
      throw new Error(`${name}: esperado somente ${target}, recebido ${run.status} ${run.stdout} ${run.stderr}`);
    }
    console.log(`✓ mutante ${name} -> somente ${target} vermelho`);
  }
}
if (process.argv.includes('--json')) console.log(JSON.stringify({ mutante, results, failures }, null, 2));
else {
  for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.id} ${r.desc}\n  ${r.evid}`);
  console.log(`${results.length - failures.length}/${results.length} contratos verdes; aprovação visual depende de Astro real.`);
}
process.exitCode = failures.length ? 1 : 0;
