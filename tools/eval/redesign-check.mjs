#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MUTANTE = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
const alvoPorMutante = {
  'asset-ausente': 'UIA1',
  'resultado-nao-auditado': 'UIA1',
  'video-dimensao': 'UIA2',
  'splash-sem-wallpaper': 'UIA3',
  'lote-nao-auditado': 'UIA4',
  'loading-sem-canvas': 'UIA5',
  'loading-uma-acao': 'UIA6',
  'loading-clipe-falso': 'UIA6',
  'sem-i18n': 'UIR1',
  'preview-render': 'UIR2',
  'preview-decode': 'UIR3',
  'mapa-esconde-um': 'UIR4',
  'mapa-sem-miniaturas': 'UIR4',
  'mapa-sem-navegacao': 'UIR4',
  'mapa-navega-global': 'UIR4',
  'mapa-acervo-deitado': 'UIR4',
  'mapa-acervo-nao-rola': 'UIR4',
  'mapa-card-achatado': 'UIR4',
  'mapa-palco-sem-scrim': 'UIR4',
  'mapa-ficha-fora-do-header': 'UIR4',
  'mapa-rodape-junto': 'UIR4',
  'mapa-palco-sem-wallpaper': 'UIR4',
  'mapa-plays-inventado': 'UIR4',
  'mapa-todos-sem-ranking': 'UIR4',
  'mapa-plays-sem-guarda': 'UIR4',
  'mapa-categoria-errada': 'UIR4',
  'i18n-duplicada': 'UIR5',
  'arma-unica': 'UIR6',
  'placar-sem-cap': 'UIR7',
  'placar-labels-curtos': 'UIR7',
  'mount-sem-resize': 'UIR8',
  'gerador-engole-erro': 'UIR9',
  'i18n-dinamica-restante': 'UIR10',
  'video-vaza': 'UIR11',
  'preview-sem-interacao': 'UIR12',
  'selecao-tres-colunas': 'UIR13',
  'selecao-thumbs-pequenos': 'UIR13',
  'selecao-rail-descentrado': 'UIR13',
  'selecao-controle-colide': 'UIR13',
  'preview-gira-sozinho': 'UIR14',
  'resultado-em-video': 'UIR15',
  'resultado-personagem-antigo': 'UIR15',
  'loading-sem-wallpaper': 'UIR16',
  'loading-uma-faccao': 'UIR16',
  'hud-score-volta-preto': 'UIR17',
  'hud-3d-volta': 'UIR18',
  'hud-centro-volta': 'UIR18',
  'hud-sem-barras': 'UIR18',
  'hud-fonte-antiga': 'UIR18',
  'resultado-corta-personagem': 'UIR19',
  'resultado-sem-alpha': 'UIR19',
  'resultado-derrota-sem-alpha': 'UIR19',
  'idioma-por-navegador': 'UIR20',
  'idioma-prerender': 'UIR20',
  'loading-volta-grande': 'UIR21',
  'loading-vira-esquerda': 'UIR21',
  'loading-rotulo-volta': 'UIR21',
  'config-volta-cartao': 'UIR22',
  'config-mostra-media': 'UIR22',
  'placar-volta-opaco': 'UIR23',
  'placar-abre-pausa': 'UIR23',
  'hud-fonte-bebas': 'UIR17',
  'hud-sem-vinheta-baixa': 'UIR24',
  'killfeed-volta-svg': 'UIR25',
  'modo-volta-setup': 'UIR26',
  'personagem-dificuldade-volta': 'UIR27',
  'punk-avatar-nao-auditado': 'UIR28',
  'perfil-volta-iniciais': 'UIR29',
  'suporte-sai-do-menu': 'UIR30',
  'mouse-invertido-ignorado': 'UIR31',
  'loading-wall-cover-unico': 'UIR32',
  'menu-wall-sem-3x2': 'UIR32',
  'opcoes-mapa-decorativas': 'UIR33',
  'borda-tracejada-volta': 'UIR34',
  'splash-sem-personagem': 'UIR35',
  'splash-conteudo-atras': 'UIR35',
  'placar-sem-brasoes': 'UIR36',
  'placar-volta-topo': 'UIR37',
  'backend-aviso-volta': 'UIR38',
  'faccao-mostra-antes-da-arte': 'UIR39',
  'troca-m-abre-pausa': 'UIR40',
  'resultado-emenda-volta': 'UIR41',
  'versao-menu-volta-rodape': 'UIR42',
  'sem-autoria': 'UIR43',
  'filtro-autor-morto': 'UIR4',   // mistura comunidade nos OFICIAIS de novo (reverte o #368)
  'sem-badge-oficial': 'UIR43',
};
if (MUTANTE && !alvoPorMutante[MUTANTE]) {
  console.error(`mutante desconhecido: ${MUTANTE}`);
  process.exit(2);
}

let main = readFileSync(join(ROOT, 'public/js/main.js'), 'utf8');
let css = readFileSync(join(ROOT, 'public/style.css'), 'utf8');
let i18n = readFileSync(join(ROOT, 'public/js/i18n.js'), 'utf8');
let astro = readFileSync(join(ROOT, 'src/pages/index.astro'), 'utf8');
let mapPlaysApi = readFileSync(join(ROOT, 'src/pages/api/map-plays.ts'), 'utf8');
const characters = readFileSync(join(ROOT, 'public/js/characters.js'), 'utf8');
let videoGenerator = readFileSync(join(ROOT, 'tools/eval/char-native-vids.mjs'), 'utf8');
let game = readFileSync(join(ROOT, 'public/js/game.js'), 'utf8');
let mounttest = readFileSync(join(ROOT, 'public/mounttest.html'), 'utf8');
let dev = readFileSync(join(ROOT, 'public/dev.html'), 'utf8');
let mediaAudit = existsSync(join(ROOT, 'tools/eval/char-native-audit.json'))
  ? readFileSync(join(ROOT, 'tools/eval/char-native-audit.json'), 'utf8') : '';
let staticAudit = existsSync(join(ROOT, 'tools/eval/redesign-static-audit.json'))
  ? readFileSync(join(ROOT, 'tools/eval/redesign-static-audit.json'), 'utf8') : '';
let loading3d = existsSync(join(ROOT, 'public/js/loading3d.js'))
  ? readFileSync(join(ROOT, 'public/js/loading3d.js'), 'utf8') : '';
const geoLib = existsSync(join(ROOT, 'src/lib/geo.ts'))
  ? readFileSync(join(ROOT, 'src/lib/geo.ts'), 'utf8') : '';
const apiGeoLang = existsSync(join(ROOT, 'src/pages/api/geo-lang.ts'))
  ? readFileSync(join(ROOT, 'src/pages/api/geo-lang.ts'), 'utf8') : '';
let mutacaoAplicou = !MUTANTE;
const muta = (nome, texto, antes, depois) => {
  if (MUTANTE !== nome) return texto;
  const alterado = texto.replace(antes, depois);
  mutacaoAplicou = alterado !== texto;
  return alterado;
};
staticAudit = muta('resultado-nao-auditado', staticAudit,
  '"resultImagesSha256":',
  '"resultImagesSha256Mutado":');
staticAudit = muta('punk-avatar-nao-auditado', staticAudit,
  '"punkAvatarSha256":',
  '"punkAvatarSha256Mutado":');
astro = muta('loading-sem-canvas', astro,
  '<canvas id="load-character-3d"',
  '<canvas id="load-character-3d-mutado"');
astro = muta('splash-sem-personagem', astro,
  '<div id="splash-character-stage" aria-hidden="true">',
  '<div id="splash-character-stage-mutado" aria-hidden="true">');
loading3d = muta('loading-uma-acao', loading3d,
  "{ name: 'ready'",
  "{ name: 'run'");
loading3d = muta('loading-clipe-falso', loading3d,
  'find(([, clip]) => clip === this.ctrl.cur)',
  'find(() => true)');
loading3d = muta('loading-uma-faccao', loading3d,
  "U: 'blackmetal'",
  "U: 'canarinho'");

main = muta('sem-i18n', main,
  "`${tr('MAPA')} ${MAP_IDS.indexOf(currentMap) + 1} ${tr('DE')} ${MAP_IDS.length}`",
  "`MAPA ${MAP_IDS.indexOf(currentMap) + 1} DE ${MAP_IDS.length}`");
main = muta('preview-render', main,
  "if (csOpen && pv && pv.model && !previewVideoVisible()) {",
  "if (csOpen && pv && pv.model) {");
main = muta('preview-decode', main,
  "if (id !== 'char-select') pvStopVideo();",
  '');
i18n = muta('i18n-duplicada', i18n,
  "  'PERSONAGENS': 'CHARACTERS', 'PERSONAGEM': 'CHARACTER',",
  "  'PERSONAGENS': 'CHARACTERS', 'PERSONAGENS': 'CHARACTERS', 'PERSONAGEM': 'CHARACTER',");
videoGenerator = muta('arma-unica', videoGenerator,
  "const weapon = weaponById[id] || 'ak';",
  "const weapon = 'ak';");
game = muta('placar-sem-cap', game,
  "${this.ctf ? '<span class=\"sb-cap\">CAP.</span>' : ''}",
  "${this.ctf ? '' : ''}");
game = muta('placar-labels-curtos', game,
  '<span>K</span><span>D</span><span>SCORE</span><span>PING</span>',
  '<span>K</span><span>D</span>');
game = muta('placar-sem-brasoes', game,
  '<img class="sb-crest" src="/img/brasoes/${crest(side)}.png" alt="">',
  '');
css = muta('loading-wall-cover-unico', css,
  'background-size:cover,contain;background-position:center;background-repeat:no-repeat}',
  'background-size:cover,cover;background-position:center;background-repeat:no-repeat}');
css = muta('menu-wall-sem-3x2', css,
  "background-image:var(--menu-wall-3x2,var(--menu-wall))",
  'background-image:var(--menu-wall)');
main = muta('opcoes-mapa-decorativas', main,
  'roundsMax: matchRounds(),',
  'roundsMax: 5,');
css = muta('borda-tracejada-volta', css,
  'background:transparent;border:1px solid var(--line);color:var(--ink3);padding:10px}',
  'background:transparent;border:1px dashed var(--br-faixa);color:var(--ink3);padding:10px}');
css = muta('splash-conteudo-atras', css,
  '#boot-splash .splash-frame{position:relative;z-index:2}',
  '#boot-splash .splash-frame{position:relative;z-index:1}');
css = muta('placar-volta-topo', css,
  '#scoreboard .sb-center{position:absolute;inset:0 64px;display:flex;flex-direction:column;justify-content:center;',
  '#scoreboard .sb-center{position:absolute;inset:0 64px;display:flex;flex-direction:column;justify-content:flex-start;');
mediaAudit = muta('lote-nao-auditado', mediaAudit,
  '"mediaSha256":',
  '"mediaSha256Mutado":');
mounttest = muta('mount-sem-resize', mounttest,
  "addEventListener('resize', resizeMount);",
  '');
videoGenerator = muta('gerador-engole-erro', videoGenerator,
  'const pageErrors = [];',
  'const pageErrors = null;');
main = muta('i18n-dinamica-restante', main,
  "$('char-info-blurb').textContent = tr(c.blurb);",
  "$('char-info-blurb').textContent = c.blurb;");
astro = muta('video-vaza', astro,
  '<div id="load-overlay" class="hidden">',
  '<div id="load-overlay" class="hidden"><video id="load-char" autoplay></video>');
main = muta('preview-sem-interacao', main,
  'if (staticPreviews) pvSetVideo(c); else pvStopVideo();',
  'pvSetVideo(c);');
main = muta('preview-gira-sozinho', main,
  'if (pv.ctrl) pv.ctrl.update(dt, 0, false, 0); else if (pv.mixer) pv.mixer.update(dt);',
  'if (!pvDrag) pv.model.rotation.y += dt * 0.9;\n    if (pv.ctrl) pv.ctrl.update(dt, 0, false, 0); else if (pv.mixer) pv.mixer.update(dt);');
main = muta('mapa-esconde-um', main,
  "return mapCategory === 'TODOS' ? MAP_IDS : MAP_IDS.filter((id) => MAP_CAT[id] === mapCategory);",
  "return mapCategory === 'TODOS' ? MAP_IDS.slice(0, -1) : MAP_IDS.filter((id) => MAP_CAT[id] === mapCategory);");
main = muta('mapa-sem-miniaturas', main,
  '`<img class="ms-thumb-img" src="/img/map-previews/${id}.jpg?v=${VERSION}" alt="">` +',
  "'' +");
main = muta('mapa-navega-global', main,
  "$('ms-next').onclick = () => stepMap(1, visibleMapIds());",
  "$('ms-next').onclick = () => stepMap(1);");
/* 21/08: a faixa horizontal virou GRADE elástica no corpo. Cada mutação abaixo desfaz
   UMA decisão da tela e tem de acender a UIR4 sozinha. */
css = muta('mapa-acervo-deitado', css,     // grade elástica vira fileira de largura fixa
  '.ms-strip{--map-count:1;display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr))',
  '.ms-strip{--map-count:1;display:grid;grid-template-columns:repeat(var(--map-count),196px)');
css = muta('mapa-ficha-fora-do-header', css,   // cabeçalho deixa de dividir a linha com as opções
  '.ms-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between',
  '.ms-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:flex-start');
css = muta('mapa-rodape-junto', css,           // VOLTAR e CONTINUAR deixam de ir pros cantos
  '.ms-foot{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between',
  '.ms-foot{position:relative;z-index:2;display:flex;align-items:center;justify-content:flex-start');
css = muta('mapa-palco-sem-wallpaper', css,    // o borrão do wallpaper some: volta o preto chapado
  '.ms-bg::before{inset:-24px;background-size:cover;filter:blur(20px) brightness(.4) saturate(.7)}',
  '.ms-bg::before{inset:-24px;background-size:auto;filter:none}');
main = muta('mapa-plays-inventado', main,      // zero vira "0 partidas" em vez de sumir
  '    plays.hidden = !n;',
  '    plays.hidden = false;');
main = muta('mapa-todos-sem-ranking', main,    // TODOS deixa de ordenar por partidas jogadas
  'return MAP_IDS.slice().sort((a, b) => playsDe(b) - playsDe(a) || MAP_IDS.indexOf(a) - MAP_IDS.indexOf(b));',
  'return MAP_IDS.slice();');
mapPlaysApi = muta('mapa-plays-sem-guarda', mapPlaysApi,   // sem banco, a rota passa a estourar
  '  if (!supabaseAdmin) return resposta({ plays: {} });',
  '  // guarda removida');
css = muta('mapa-card-achatado', css,          // volta ao px fixo: o card deixa de ser quadrado
  '.ms-thumb-img{display:block;width:100%;height:auto;aspect-ratio:4/3',
  '.ms-thumb-img{display:block;width:100%;height:96px');
css = muta('mapa-palco-sem-scrim', css,        // preview sem véu: ficha some em mapa claro
  '.ms-scrim{position:absolute;inset:0;pointer-events:none;z-index:1;\n  background:linear-gradient(90deg',
  '.ms-scrim{position:absolute;inset:0;pointer-events:none;z-index:1;\n  background:none;--morto:linear-gradient(90deg');
css = muta('mapa-acervo-nao-rola', css,
  '.ms-viewport{flex:1;min-height:0;overflow-y:auto',
  '.ms-viewport{flex:1;min-height:0;overflow-y:visible');
main = muta('sem-autoria', main,
  "const byline = $('ms-byline');",
  "const byline = null;");
main = muta('filtro-autor-morto', main,
  "mapCategory === 'TODOS' ? !catsDe(id).includes('COMUNIDADE') : catsDe(id).includes(mapCategory)",
  "mapCategory === 'TODOS' ? true : catsDe(id).includes(mapCategory)");
main = muta('sem-badge-oficial', main,
  'class="ms-badge-oficial"',
  'class="ms-badge-x"');   // remove o crachá de verdade: trocar a CONDIÇÃO não mordia (a string ficava)
main = muta('mapa-categoria-errada', main,
  "piscina_treta: ['ARENA', 'COMUNIDADE'], posto_treta: ['ARENA', 'COMUNIDADE'], atacadao_treta: ['ARENA', 'COMUNIDADE'],",
  "piscina_treta: ['CIDADES'], posto_treta: ['ARENA', 'COMUNIDADE'], atacadao_treta: ['CIDADES'],");
astro = muta('mapa-sem-navegacao', astro,
  '<button id="ms-prev" class="ms-arrow"',
  '<button id="ms-prev-mutado" class="ms-arrow"');
css = muta('selecao-tres-colunas', css,
  'grid-template-columns:minmax(280px,360px) minmax(0,1fr);',
  'grid-template-columns:96px minmax(280px,360px) minmax(0,1fr);');
css = muta('selecao-thumbs-pequenos', css,
  '--char-thumb:114px;',
  '--char-thumb:76px;');
css = muta('selecao-rail-descentrado', css,
  '.char-filmstrip{grid-area:rail;display:flex;flex-direction:row;align-items:center;justify-content:center;',
  '.char-filmstrip{grid-area:rail;display:flex;flex-direction:row;align-items:center;justify-content:flex-start;');
css = muta('selecao-controle-colide', css,
  'max-height:calc(100% - 28px);',
  'max-height:none;');
game = muta('resultado-em-video', game,
  'setHeroArt(this.playerCharId || rep);',
  "setHeroArt(this.playerCharId || rep);\n    void '/video/resultado/personagem-vitoria.webm';");
game = muta('resultado-personagem-antigo', game,
  'if (charId) { this.playerDef = byId(charId); this.playerCharId = charId; p.def = this.playerDef; }',
  'if (charId) { this.playerDef = byId(charId); p.def = this.playerDef; }');
main = muta('loading-sem-wallpaper', main,
  "_lo.box.style.setProperty('--loading-wall', loadingWallUrl(_loadWallI++));",
  "_lo.box.style.setProperty('--loading-wall', 'none');");
main = muta('splash-sem-wallpaper', main,
  "splash.style.setProperty('--loading-wall', loadingWallUrl(_wallK));",
  "splash.style.setProperty('--loading-wall', 'none');");
css = muta('hud-score-volta-preto', css,
  '#hud-top .team-score{min-height:42px;padding:7px 16px;background:transparent;border:0;color:#ecebe6!important}',
  '#hud-top .team-score{min-height:42px;padding:7px 16px;background:rgba(10,10,12,.78);border:0;color:#ecebe6!important}');
css = muta('hud-3d-volta', css,
  '#ammo-weapon-art{display:none;',
  '#ammo-weapon-art{display:block;');
css = muta('hud-centro-volta', css,
  '#weapon-hud{right:20px;bottom:122px;width:150px}',
  '#weapon-hud{left:50%;right:auto;bottom:14px;width:150px;transform:translateX(-50%)}');
astro = muta('hud-sem-barras', astro,
  'id="ammo-bars"',
  'id="ammo-bars-mutado"');
css = muta('hud-fonte-antiga', css,
  '#ammo{order:0;font-family:var(--font);',
  '#ammo{order:0;font-family:var(--aaa-font-display);');
css = muta('resultado-corta-personagem', css,
  'background:var(--me-art,none) right bottom/contain no-repeat',
  'background:var(--me-art,none) center top/cover no-repeat;');
css = muta('resultado-emenda-volta', css,
  '.me-wrap{position:relative;',
  '.me-wrap::after{content:"";position:absolute;inset:0 0 0 44%;background:radial-gradient(ellipse at 88% 58%,rgba(73,168,70,.2),transparent 78%)}\n.me-wrap{position:relative;');
astro = muta('versao-menu-volta-rodape', astro,
  '<span class="menu-version" id="mf-ver"></span>',
  '<span class="mf-ver" id="mf-ver"></span>');
css = muta('loading-volta-grande', css,
  'width:min(86px,6.8vw);height:min(144px,15.2vh);pointer-events:none;',
  'width:min(430px,34vw);height:min(720px,76vh);pointer-events:none;');
css = muta('loading-rotulo-volta', css,
  'color:var(--ink-200);display:none}',
  'color:var(--ink-200);display:block}');
css = muta('config-volta-cartao', css,
  '#settings-panel .settings-wrap{width:980px;',
  '#settings-panel .settings-wrap{width:560px;');
main = muta('config-mostra-media', main,
  "$('set-quality').value = 'high'; show('settings-panel'); return;",
  "$('set-quality').value = 'medium'; show('settings-panel'); return;");
css = muta('placar-volta-opaco', css,
  'background:radial-gradient(ellipse at 50% 40%,rgba(8,8,10,.5) 0%,rgba(8,8,10,.88) 100%);',
  'background:rgba(8,8,10,.98);');
main = muta('placar-abre-pausa', main,
  "game.paused = true; game.keys = {}; game.el.pause.classList.add('hidden'); game._showScoreboard(true); return;",
  "game.setPaused(true); game._showScoreboard(true); return;");
css = muta('hud-fonte-bebas', css,
  '#round-time{font-family:var(--font);',
  '#round-time{font-family:var(--aaa-font-display);');
css = muta('hud-sem-vinheta-baixa', css,
  '#hud:has(#hp-num.low) #damage-vignette{opacity:1}',
  '#hud:has(#hp-num.low) #damage-vignette{opacity:0}');
game = muta('killfeed-volta-svg', game,
  '${this._killfeedWeaponIcon(weap)}',
  '${this._wpnIcon(weap)}');
main = muta('modo-volta-setup', main,
  "case 'sp':    openModeMap('rounds', 'MATA-MATA', 'sp'); break;",
  "case 'sp':    openSetup('rounds', 'MATA-MATA', 'sp'); break;");
main = muta('personagem-dificuldade-volta', main,
  ".map(([l, v]) => `<div class=\"attr\"><span>${tr(l)}</span><div class=\"attr-bar\"><i style=\"width:${v * 20}%\"></i></div><b>${v}</b></div>`).join('');",
  ".map(([l, v]) => `<div class=\"attr\"><span>${tr(l)}</span><div class=\"attr-bar\"><i style=\"width:${v * 20}%\"></i></div><b>${v}</b></div>`).join('') + `<div class=\"attr attr-dif\">DIFICULDADE</div>`;");
main = muta('perfil-volta-iniciais', main,
  'applyPlayerAvatar($(\'pp-avatar\'), nick);',
  "$('pp-avatar').textContent = (nick || 'CS').slice(0, 2);");
astro = muta('suporte-sai-do-menu', astro,
  '<button class="cs-item" data-act="feedback" type="button"><span class="cs-tick">▸</span>ENVIE SEU FEEDBACK</button>',
  '');
game = muta('mouse-invertido-ignorado', game,
  'const invertY = this.settings.invertY ? -1 : 1;',
  'const invertY = this.settings.invertY ? 1 : 1;');
loading3d = muta('loading-vira-esquerda', loading3d,
  'built.group.rotation.y = 0.42;',
  'built.group.rotation.y = -0.42;');
main = muta('idioma-por-navegador', main,
  'await resolveGeoLang();\n', '');
astro = muta('idioma-prerender', astro,
  "import pkg from '../../package.json';",
  "export const prerender = false;\nimport pkg from '../../package.json';");
main = muta('backend-aviso-volta', main,
  "function submitNote(msg) {\n  console.warn('[ranking]', msg);\n}",
  "function submitNote(msg) {\n  console.warn('[ranking]', msg);\n  const el = document.getElementById('match-stats');\n  if (el) el.textContent += ` SUPABASE_SERVICE_ROLE_KEY ${msg}`;\n}");
main = muta('faccao-mostra-antes-da-arte', main,
  "await factionArtReady;\n  setTeamStep('side');",
  "setTeamStep('side');");
main = muta('troca-m-abre-pausa', main,
  "game.setPaused(true);\n    switchMode = true;",
  "if (document.pointerLockElement) document.exitPointerLock();\n    switchMode = true;");

function literalIds() {
  const bloco = characters.match(/export const CHARACTERS = \[([\s\S]*?)\n\];\nexport const byId/);
  return bloco ? [...bloco[1].matchAll(/\{\s*id:\s*'([^']+)'/g)].map((m) => m[1]) : [];
}
function arrayInline(nome) {
  const bloco = astro.match(new RegExp(`var ${nome} = \\[([\\s\\S]*?)\\];`));
  return bloco ? [...bloco[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
}
function arrayFonte(fonte, nome) {
  const bloco = fonte.match(new RegExp(`(?:const|let|var) ${nome} = \\[([\\s\\S]*?)\\];`));
  return bloco ? [...bloco[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
}
function nomes(dir, filtro = () => true) {
  return readdirSync(join(ROOT, dir)).filter(filtro).sort();
}
function iguais(a, b) {
  return a.length === b.length && a.every((valor, i) => valor === b[i]);
}
function diff(a, b) {
  const B = new Set(b);
  return a.filter((x) => !B.has(x));
}
function bytesDepois(buf, id) {
  for (let pos = 0; pos <= buf.length - id.length - 2; pos++) {
    if (!id.every((byte, i) => buf[pos + i] === byte)) continue;
    const primeiro = buf[pos + id.length];
    let largura = 1;
    while (largura <= 8 && !(primeiro & (0x80 >> (largura - 1)))) largura++;
    if (largura > 8 || pos + id.length + largura >= buf.length) continue;
    let tamanho = primeiro & (0xff >> largura);
    for (let i = 1; i < largura; i++) tamanho = tamanho * 256 + buf[pos + id.length + i];
    const inicio = pos + id.length + largura;
    if (tamanho < 1 || tamanho > 8 || inicio + tamanho > buf.length) continue;
    let valor = 0;
    for (let i = 0; i < tamanho; i++) valor = valor * 256 + buf[inicio + i];
    if (valor > 0 && valor < 8192) return valor;
  }
  return null;
}
function metaWebm(rel) {
  const buf = readFileSync(join(ROOT, rel)).subarray(0, 131072);
  return {
    webm: buf.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
    vp9: buf.includes(Buffer.from('V_VP9')),
    width: bytesDepois(buf, [0xb0]),
    height: bytesDepois(buf, [0xba]),
  };
}
function metaWebpAlpha(buf) {
  const chunk = buf.indexOf(Buffer.from('VP8X'));
  if (chunk < 0 || chunk + 18 > buf.length) return { alpha: false, width: null, height: null };
  const byte24 = (offset) => buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16);
  return {
    alpha: Boolean(buf[chunk + 8] & 0x10) && buf.includes(Buffer.from('ALPH')),
    width: byte24(chunk + 12) + 1,
    height: byte24(chunk + 15) + 1,
  };
}
async function alphaBounds(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cols = new Uint32Array(info.width);
  const rows = new Uint32Array(info.height);
  let total = 0;
  for (let y = 0, p = 3; y < info.height; y++) {
    for (let x = 0; x < info.width; x++, p += info.channels) {
      if (data[p] <= 8) continue;
      cols[x]++; rows[y]++; total++;
    }
  }
  const quantile = (hist, q) => {
    const target = total * q;
    let acc = 0;
    for (let i = 0; i < hist.length; i++) {
      acc += hist[i];
      if (acc >= target) return i;
    }
    return hist.length - 1;
  };
  const left = quantile(cols, .002), right = quantile(cols, .998);
  const top = quantile(rows, .002), bottom = quantile(rows, .998);
  return {
    width: info.width, height: info.height, total,
    left: left / info.width, right: (info.width - 1 - right) / info.width,
    top: top / info.height, bottom: (info.height - 1 - bottom) / info.height,
  };
}
function blocoFuncao(fonte, nome) {
  const inicio = fonte.indexOf(`function ${nome}(`);
  if (inicio < 0) return '';
  const abre = fonte.indexOf('{', inicio);
  let nivel = 0;
  for (let i = abre; i < fonte.length; i++) {
    if (fonte[i] === '{') nivel++;
    else if (fonte[i] === '}' && --nivel === 0) return fonte.slice(inicio, i + 1);
  }
  return '';
}

const ids = literalIds().sort();
const esperadoResultado = ids.flatMap((id) => [`${id}-derrota.webp`, `${id}-vitoria.webp`]).sort();
const esperadoResultadoVideo = esperadoResultado.map((f) => f.replace('.webp', '.webm'));
let avatares = nomes('public/img/chars/avatars', (f) => f.endsWith('.webp'));
if (MUTANTE === 'asset-ausente' && avatares.length) { avatares = avatares.slice(1); mutacaoAplicou = true; }
const selecao = nomes('public/video/chars', (f) => f.endsWith('.webm'));
const resultadoImg = nomes('public/img/resultado', (f) => /-(?:derrota|vitoria)\.webp$/.test(f));
const resultadoVideo = nomes('public/video/resultado', (f) => /-(?:derrota|vitoria)\.webm$/.test(f));
const esperadoAvatar = ids.map((id) => `${id}.webp`);
const esperadoSelecao = ids.map((id) => `${id}.webm`);
const hashResultado = createHash('sha256');
for (const arquivo of resultadoImg) {
  const rel = `public/img/resultado/${arquivo}`;
  hashResultado.update(rel).update('\0').update(readFileSync(join(ROOT, rel))).update('\0');
}
const resultImagesSha256 = hashResultado.digest('hex');
const resultadoBufPorArquivo = new Map(resultadoImg.map((arquivo) => [
  arquivo,
  readFileSync(join(ROOT, 'public/img/resultado', arquivo)),
]));
if (MUTANTE === 'resultado-sem-alpha') {
  const resultadoHeroBuf = Buffer.from(resultadoBufPorArquivo.get('mst-vitoria.webp'));
  const chunk = resultadoHeroBuf.indexOf(Buffer.from('VP8X'));
  if (chunk >= 0) {
    resultadoHeroBuf[chunk + 8] &= ~0x10;
    resultadoBufPorArquivo.set('mst-vitoria.webp', resultadoHeroBuf);
    mutacaoAplicou = true;
  }
}
if (MUTANTE === 'resultado-derrota-sem-alpha') {
  const resultadoDerrotaBuf = Buffer.from(resultadoBufPorArquivo.get('mst-derrota.webp'));
  const chunk = resultadoDerrotaBuf.indexOf(Buffer.from('VP8X'));
  if (chunk >= 0) {
    resultadoDerrotaBuf[chunk + 8] &= ~0x10;
    resultadoBufPorArquivo.set('mst-derrota.webp', resultadoDerrotaBuf);
    mutacaoAplicou = true;
  }
}
const resultadoVisual = await Promise.all([...resultadoBufPorArquivo].map(async ([arquivo, buf]) => ({
  arquivo,
  pose: arquivo.endsWith('-vitoria.webp') ? 'vitoria' : 'derrota',
  meta: metaWebpAlpha(buf),
  bounds: await alphaBounds(buf),
})));
const resultadoRuins = resultadoVisual.filter(({ meta, bounds }) => {
  const [width, height] = [1024, 1536];
  const usoPrincipal = 1 - bounds.top - bounds.bottom;
  return !meta.alpha || meta.width !== width || meta.height !== height
    || bounds.total < width * height * .01
    || bounds.top < .015 || bounds.top > .20
    || bounds.bottom < .015 || bounds.bottom > .20
    || bounds.right < .015 || bounds.right > .08
    || bounds.left < .015 || bounds.left > .65
    || usoPrincipal < .72;
});
let resultAudit = {};
try { resultAudit = JSON.parse(staticAudit); } catch { /* ausência ou JSON inválido reprova UIA1 */ }
const punkAvatarSha256 = createHash('sha256').update(readFileSync(join(ROOT, 'public/img/chars/avatars/punk.webp'))).digest('hex');
const gotinhaAvatarSha256 = createHash('sha256').update(readFileSync(join(ROOT, 'public/img/chars/avatars/gotinha.webp'))).digest('hex');
const assetOk = iguais(avatares, esperadoAvatar) && iguais(selecao, esperadoSelecao)
  && iguais(resultadoImg, esperadoResultado) && resultAudit.resultImagesSha256 === resultImagesSha256;
const assetEvid = assetOk ? `${ids.length} personagens com avatar, seleção e dois resultados estáticos`
  : `faltam avatar=${diff(esperadoAvatar, avatares).join(',') || '-'} seleção=${diff(esperadoSelecao, selecao).join(',') || '-'} imagem=${diff(esperadoResultado, resultadoImg).join(',') || '-'} auditoria=${resultAudit.resultImagesSha256 ? 'divergente' : 'ausente/inválida'}`;
const avatarIdentidadeOk = resultAudit.punkAvatarSha256 === punkAvatarSha256
  && resultAudit.gotinhaAvatarSha256 === gotinhaAvatarSha256
  && resultAudit.avatarReference === 'public/video/chars/{punk,gotinha}.webm@1.0s';

const metas = [
  ...selecao.map((f) => ({ arquivo: `public/video/chars/${f}`, esperado: [640, 854] })),
  ...resultadoVideo.map((f) => ({ arquivo: `public/video/resultado/${f}`, esperado: [640, 640] })),
].map(({ arquivo, esperado }) => ({ arquivo, esperado, meta: metaWebm(arquivo) }));
if (MUTANTE === 'video-dimensao' && metas.length) { metas[0].meta.width = 320; mutacaoAplicou = true; }
const videosRuins = metas.filter(({ esperado: [w, h], meta }) => !meta.webm || !meta.vp9 || meta.width !== w || meta.height !== h);

const caminhosMidia = metas.map(({ arquivo }) => arquivo).sort();
const hashMidia = createHash('sha256');
for (const arquivo of caminhosMidia) {
  hashMidia.update(arquivo).update('\0').update(readFileSync(join(ROOT, arquivo))).update('\0');
}
const weaponBlock = characters.match(/export const CHAR_WEAPON = \{([\s\S]*?)\n\};/);
const weaponMap = Object.fromEntries(
  [...(weaponBlock?.[1] || '').matchAll(/(\w+):\s*'([^']+)'/g)]
    .map((m) => [m[1], m[2]]).sort(([a], [b]) => a.localeCompare(b)),
);
let audit = {};
try { audit = JSON.parse(mediaAudit); } catch { /* ausência ou JSON inválido reprova UIA4 */ }
const mediaSha256 = hashMidia.digest('hex');
const weaponMapSha256 = createHash('sha256').update(JSON.stringify(weaponMap)).digest('hex');
const loteAuditado = audit.mediaSha256 === mediaSha256 && audit.weaponMapSha256 === weaponMapSha256;

let wallManifest = {};
try { wallManifest = JSON.parse(readFileSync(join(ROOT, 'public/img/walls.json'), 'utf8')); } catch { /* manifesto ausente reprova UIA3 */ }
const splash = arrayFonte(main, 'LOADING_WALLS');
const loadingManifest = Array.isArray(wallManifest.loading) ? wallManifest.loading : [];
const splashOk = iguais(splash, loadingManifest)
  && !/id="splash-video"/.test(astro)
  && !/var (?:ANIMADOS|MOLDE) =/.test(astro)
  && /splash\.style\.setProperty\('--loading-wall', loadingWallUrl\(_wallK\)\)/.test(main);

const loadingActions = [...loading3d.matchAll(/\{ name: '([^']+)'/g)].map((match) => match[1]);
const loadingCharacterIds = [...loading3d.matchAll(/[EBUCF]: '([^']+)'/g)].map((match) => match[1]);
const loadingCanvas3d = /id="load-character-3d"[^>]*><\/canvas>/.test(astro)
  && !/id="load-char" class="loading-runner"/.test(astro)
  && /export class LoadingCharacterStage/.test(loading3d)
  && /preloadCharacterAssets\(\[id\]\)/.test(loading3d)
  && /buildCharacterModel\(def, \{ weaponId: charWeapon\(id\), preview: true \}\)/.test(loading3d)
  && /criaRenderer\(\{ canvas, alpha: true/.test(loading3d)
  && /this\.renderer\.render\(this\.scene, this\.camera\)/.test(loading3d);
const loadingAcoes3d = new Set(loadingActions).size >= 6
  && ['run', 'ready', 'shoot', 'crouch', 'crouchwalk', 'jump', 'walkfire'].every((name) => loadingActions.includes(name))
  && /this\.ctrl\.shoot\(\)/.test(loading3d)
  && /this\.ctrl\.jump\(\)/.test(loading3d)
  && /this\.ctrl\.setCrouch\(/.test(loading3d)
  && /this\.ctrl\.update\(dt, moving, hasTarget, speed\)/.test(loading3d)
  && /this\.canvas\.dataset\.clip = Object\.entries\(this\.ctrl\.actions\)\.find\(\(\[, clip\]\) => clip === this\.ctrl\.cur\)/.test(loading3d)
  && /loadingStage\.update\(/.test(main);   // chamada importa, não a forma do clamp (#300 fatia dtReal)

const funcLoop = blocoFuncao(main, 'loop');
const funcShow = blocoFuncao(main, 'show');
const funcMap = blocoFuncao(main, 'renderMapScreen');
const i18nDinamico = /\$\{tr\('MAPA'\)\}[\s\S]{0,100}\$\{tr\('DE'\)\}/.test(main)
  && /tr\(FACTION_NAME\[currentFaction\] \|\| ''\)[\s\S]{0,120}tr\('PERSONAGENS'\)/.test(main)
  && /a\.textContent = tr\(FACTION_NAME\[currentFaction\] \|\| ''\)/.test(main)
  && /b\.textContent = tr\(FACTION_NAME\[currentEnemyFaction\] \|\| ''\)/.test(main)
  && /chip\.textContent = `\$\{n\} \$\{tr\('PERSONAGENS'\)\}`/.test(main)
  && /ms-desc'\)\.textContent = tr\(MAP_DESC\[currentMap\] \|\| ''\)/.test(main)
  && /frase\('escolhaAdversario', tr\(FACTION_NAME\[myFaction\]/.test(main)
  && /continuar\.textContent = frase\('continuarSetup'\)/.test(main)
  && /const FACTION_NAME = \{ E: 'TIME E'/.test(main)
  && /rEl\.textContent = tr\(RARITIES\[tier\]\[0\]\)/.test(main)
  && /char-spec-name'\)\.textContent = tr\(specName\)/.test(main);
const previewUso = /if \(csOpen && pv && pv\.model && !previewVideoVisible\(\)\)/.test(funcLoop)
  && /function previewVideoVisible\(\)[\s\S]*classList\.contains\('has-video'\)/.test(main);
const previewPausa = /id !== 'char-select'[\s\S]{0,60}pvStopVideo\(\)/.test(funcShow)
  && /function pvStopVideo\(\)[\s\S]{0,180}video\.pause\(\)/.test(main);
const strip = (css.match(/\.ms-strip\{([^}]*)\}/) || [])[1] || '';
const fundoMapa = (css.match(/\.ms-bg\{([^}]*)\}/) || [])[1] || '';
const autoriaNaFicha = /const MAP_AUTOR = \{/.test(main)
  && /const MAP_DATA = \{/.test(main)
  && /const AUTOR_CASA = 'Ruben Marcus';/.test(main)
  && /const byline = \$\('ms-byline'\);/.test(funcMap)
  && /\$\{autorDe\(currentMap\)\}<\/strong> · \$\{MAP_DATA\[currentMap\] \|\| ''\}/.test(funcMap)
  && /ms-badge-oficial/.test(funcMap)
  && /ms-badge-comunidade/.test(funcMap)
  // #368: o sub-filtro por autor saiu — COMUNIDADE lista todos. Guardava o elemento ESCONDIDO;
  // agora guarda a AUSÊNCIA dele (marcação morta é lixo que confunde quem lê — achado do #368).
  && !/ms-authors/.test(astro)
  && !/ms-authors/.test(main)
  && !/ms-authors/.test(css);
const mapaReferencia = /const shown = visibleMapIds\(\);/.test(funcMap)
  && /ferro_velho: \['ARENA'\], quebrada: \['FAVELA'\]/.test(main)
  && /piscina_treta: \['ARENA', 'COMUNIDADE'\], posto_treta: \['ARENA', 'COMUNIDADE'\], atacadao_treta: \['ARENA', 'COMUNIDADE'\]/.test(main)
  && /const catsDe = \(id\) => MAP_CATS\[id\] \|\| \['ARENA'\];/.test(main)
  /* TODOS voltou a ser o acervo INTEIRO (21/08) e ordena por partidas jogadas; OFICIAIS
     virou aba própria. Sem o desempate por índice a lista dança entre renders. */
  && /if \(mapCategory === 'TODOS'\) \{[\s\S]{0,220}playsDe\(b\) - playsDe\(a\) \|\| MAP_IDS\.indexOf\(a\) - MAP_IDS\.indexOf\(b\)/.test(main)
  && /if \(mapCategory === 'OFICIAIS'\) return MAP_IDS\.filter\(\(id\) => !catsDe\(id\)\.includes\('COMUNIDADE'\)\)/.test(main)
  && /return MAP_IDS\.filter\(\(id\) => catsDe\(id\)\.includes\(mapCategory\)\)/.test(main)
  /* a estatística sai do contador REAL (picks_daily via /api/pick), nunca de número local,
     e a tela tem de abrir sem ela: rede caída não pode derrubar a escolha de mapa. */
  && /fetch\('\/api\/map-plays'\)/.test(main)
  && /let mapPlays = \{\};/.test(main)
  && /\.catch\(\(\) => \{ \/\* sem banco\/rede/.test(main)
  && /\.from\('picks_daily'\)[\s\S]{0,120}\.eq\('kind', 'mapa'\)/.test(mapPlaysApi)
  && /if \(!supabaseAdmin\) return resposta\(\{ plays: \{\} \}\);/.test(mapPlaysApi)
  /* zero partidas é AUSÊNCIA de medida, não medida de zero: o crachá some em vez de mentir */
  && /plays\.hidden = !n;/.test(funcMap)
  && /function stepMap\(dir, ids = MAP_IDS\)/.test(main)
  && /const pool = ids\.length \? ids : MAP_IDS;/.test(main)
  && /const nextId = pool\[\(Math\.max\(0, pool\.indexOf\(currentMap\)\) \+ dir \+ pool\.length\) % pool\.length\];/.test(main)
  && /gotoMap\(MAP_IDS\.indexOf\(nextId\)\)/.test(main)
  && /\$\('ms-prev'\)\.onclick = \(\) => stepMap\(-1, visibleMapIds\(\)\)/.test(main)
  && /\$\('ms-next'\)\.onclick = \(\) => stepMap\(1, visibleMapIds\(\)\)/.test(main)
  && /e\.key === 'ArrowLeft'[\s\S]{0,100}stepMap\(-1, visibleMapIds\(\)\)/.test(main)
  && /e\.key === 'ArrowRight'[\s\S]{0,100}stepMap\(1, visibleMapIds\(\)\)/.test(main)
  && /\$\('ms-strip'\)\.innerHTML = shown\.map\(\(id\) =>/.test(funcMap)
  && /\$\('ms-strip'\)\.style\.setProperty\('--map-count', shown\.length\)/.test(funcMap)
  && /aria-pressed="\$\{id === currentMap\}"/.test(funcMap)
  && /<img class="ms-thumb-img" loading="lazy" decoding="async" src="\/img\/map-previews\/\$\{id\}\.jpg\?v=\$\{VERSION\}" alt="">/.test(funcMap)
  && /id="ms-tabs"/.test(astro) && /id="ms-prev"/.test(astro) && /id="ms-next"/.test(astro)
  && /id="ms-dashes"/.test(astro) && /class="ms-carousel"/.test(astro)
  // As três abas: TODOS (acervo inteiro, por partidas), OFICIAIS e COMUNIDADE. O #368
  // tinha fundido TODOS e OFICIAIS numa só; 21/08 separou de novo, a pedido do dono.
  && /data-cat="TODOS"[^>]*>TODOS</.test(astro)
  && /data-cat="OFICIAIS"[^>]*>OFICIAIS</.test(astro)
  && /data-cat="COMUNIDADE"/.test(astro)
  && main.includes("$('ms-dashes').innerHTML = '';")
  /* geometria de 21/08 (3ª rodada): CABEÇALHO + ACERVO + RODAPÉ em três faixas. O corpo
     é só a grade; ficha e opções da partida moram no cabeçalho; VOLTAR e CONTINUAR nos
     cantos opostos do rodapé. */
  && /#map-screen\{[^}]*grid-template-rows:auto minmax\(0,1fr\) auto/.test(css)
  && /\.ms-head\{[^}]*justify-content:space-between/.test(css)
  /* ficha e opções da partida moram DENTRO do cabeçalho, antes do corpo — é o que
     libera o corpo inteiro para a grade. A ordem na marcação é a prova. */
  && /class="ms-topbar"[\s\S]*?class="ms-head"[\s\S]*?id="ms-match-options"[\s\S]*?class="ms-body"[\s\S]*?class="ms-foot"/.test(astro)
  && /\.ms-foot\{[^}]*justify-content:space-between/.test(css)
  && /\.ms-name\{[^}]*font-size:40px/.test(css)
  && /\.ms-viewport\{[^}]*overflow-y:auto/.test(css)
  && /--map-count:1/.test(strip)
  && /display:grid/.test(strip)
  /* a grade decide o número de colunas pela largura real (até 3), e o card é quase
     quadrado por PROPORÇÃO — px fixo volta a achatar a arte quando a faixa estica. */
  && /grid-template-columns:repeat\(auto-fill,minmax\(360px,1fr\)\)/.test(strip)
  && /max-width:1180px/.test(strip)
  && /width:100%/.test(strip)
  && /\.ms-thumb\{[^}]*width:100%[^}]*min-width:0/.test(css)
  && /\.ms-thumb-img\{[^}]*aspect-ratio:4\/3[^}]*object-fit:cover/.test(css)
  /* o palco é o WALLPAPER, não a preview: o `<img>` fica só para a sonda de tela ler o src */
  && /inset:\s*0/.test(fundoMapa)
  && /\.ms-bg::before\{[^}]*background-size:cover[^}]*blur/.test(css)
  && /\.ms-bg img\{display:none\}/.test(css)
  && /palco\.style\.setProperty\('--wall', SETUP_WALL\)/.test(funcMap)
  && /\.ms-scrim\{[^}]*linear-gradient\(90deg[^}]*linear-gradient\(0deg/.test(css)
  && !/class="ms-rail/.test(funcMap);
const dict = (i18n.match(/const DICT = \{([\s\S]*?)\n\};/) || [])[1] || '';
const chaves = [...dict.matchAll(/'((?:\\.|[^'\\])*)'\s*:/g)].map((m) => m[1]);
const repetidas = [...new Set(chaves.filter((chave, i) => chaves.indexOf(chave) !== i))];
const blurbs = [...characters.matchAll(/blurb:\s*'((?:\\.|[^'\\])*)'/g)].map((m) => m[1]);
const blurbsSemIngles = blurbs.filter((blurb) => !chaves.includes(blurb));
const geradorArma = /CHAR_WEAPON/.test(videoGenerator)
  && /const weaponById = Object\.fromEntries/.test(videoGenerator)
  && /const weapon = weaponById\[id\] \|\| 'ak'/.test(videoGenerator)
  && /w=\$\{encodeURIComponent\(weapon\)\}/.test(videoGenerator);
const placarCap = /class="sb-chead"[\s\S]{0,500}class="sb-cap">CAP\.<\/span>/.test(game)
  && /<span>K<\/span><span>D<\/span><span>SCORE<\/span><span>PING<\/span>/.test(game)
  && /<th>K<\/th><th>D<\/th><th>SCORE<\/th><th>PING<\/th>/.test(game)
  && /--sb-grid:minmax\(0,1fr\) 46px 46px 72px 52px/.test(css)
  && /\.sb-col\.ctf\{--sb-grid:minmax\(0,1fr\)[^}]*46px/.test(css)
  && /\.sb-chead\{[^}]*grid-template-columns:var\(--sb-grid\)/.test(css)
  && /\.sb-col tbody tr\{[^}]*grid-template-columns:var\(--sb-grid\)/.test(css);
const mountResize = /const resizeMount = \(\) => \{[\s\S]{0,240}cam\.aspect\s*=\s*innerWidth\s*\/\s*innerHeight[\s\S]{0,180}renderer\.setSize\(innerWidth,\s*innerHeight\)[\s\S]{0,120}addEventListener\('resize', resizeMount\)/.test(mounttest);
const geradorFalhaFechado = /const pageErrors = \[\]/.test(videoGenerator)
  && /page\.on\('pageerror',[\s\S]{0,120}pageErrors\.push/.test(videoGenerator)
  && /catch \{ throw new Error\(`\$\{id\}: mounttest não ficou pronto`\); \}/.test(videoGenerator)
  && /if \(pageErrors\.length\) throw new Error\(`Falhas no browser:/.test(videoGenerator);
const i18nRestante = /textContent = tr\('PASSO À PARTE · NOME NA CAMISA'\)/.test(main)
  && /textContent = tr\(matchMode === 'ctf' \? 'PASSO 1 · A PARTIDA \(CTF\)' : 'PASSO 1 · A PARTIDA'\)/.test(main)
  && (main.match(/nick \|\| tr\('SEM NICK'\)/g) || []).length >= 1
  && /char-info-blurb'\)\.textContent = tr\(c\.blurb\)/.test(main)
  && blurbsSemIngles.length === 0;
const cicloVideos = !/id="(?:splash-video|me-video)"/.test(astro)
  && !/<video id="load-char"/.test(astro)
  && !/video\/resultado|meVideo/.test(game)
  && !/\.me-hero video/.test(css)
  && previewPausa;
const previewInterativo = /function pvStopVideo\(\)[\s\S]{0,400}removeAttribute\('src'\)/.test(main)
  && /if \(staticPreviews\) pvSetVideo\(c\); else pvStopVideo\(\);/.test(main);
const charStage = (css.match(/\.char-stage\{([^}]*)\}/) || [])[1] || '';
const charFilmstrip = (css.match(/\.char-filmstrip\{([^}]*)\}/) || [])[1] || '';
const charList = (css.match(/\.char-list\{([^}]*)\}/) || [])[1] || '';
const charRow = (css.match(/\.char-row\{([^}]*)\}/) || [])[1] || '';
const charPreview = (css.match(/#char-preview\{([^}]*)\}/) || [])[1] || '';
const selecaoDuasColunas = /grid-template-columns:minmax\(280px,360px\) minmax\(0,1fr\)/.test(charStage)
  && /grid-template-areas:"sheet preview" "rail rail"/.test(charStage)
  && /--char-thumb:114px/.test(charStage)
  && /grid-template-rows:minmax\(0,1fr\) var\(--char-thumb\)/.test(charStage)
  && /grid-area:rail/.test(charFilmstrip) && /flex-direction:row/.test(charFilmstrip)
  && /justify-content:center/.test(charFilmstrip)
  && /flex-direction:row/.test(charList) && /overflow-x:auto/.test(charList)
  && /flex:0 1 auto/.test(charList) && /width:max-content/.test(charList)
  && /width:var\(--char-thumb\)/.test(charRow) && /height:var\(--char-thumb\)/.test(charRow)
  && /max-height:calc\(100% - 28px\)/.test(charPreview)
  && /\.pv-hints\{[^}]*flex:0 0 auto/.test(css);
const previewSobControle = !/pv\.model\.rotation\.y \+= dt/.test(funcLoop)
  && /pointermove[\s\S]{0,180}pv\.model\.rotation\.y = pvDrag\.yaw/.test(main);
const resultadoEstatico = /--me-art/.test(game)
  && !/video\/resultado|meVideo/.test(game)
  && !/id="me-video"/.test(astro)
  && !/\.me-hero video/.test(css)
  && /if \(charId\) \{ this\.playerDef = byId\(charId\); this\.playerCharId = charId; p\.def = this\.playerDef; \}/.test(game);
const loadingWallpaper = /const loadingWallUrl = \(i\) =>/.test(main)
  && /_lo\.box\.style\.setProperty\('--loading-wall', loadingWallUrl\(_loadWallI\+\+\)\)/.test(main)
  && /splash\.style\.setProperty\('--loading-wall', loadingWallUrl\(_wallK\)\)/.test(main)
  && loadingCharacterIds.length === 5 && new Set(loadingCharacterIds).size === 5
  && /E: 'gotinha'[\s\S]*?B: 'canarinho'[\s\S]*?U: 'blackmetal'[\s\S]*?C: 'bonzo'[\s\S]*?F: 'mandrake'/.test(loading3d)
  && /loadingStage\.show\(currentFaction\)/.test(main)
  && /loadingStage\.hide\(\)/.test(main)
  && !/loading-runner/.test(astro)
  && !/loading-runner-frames/.test(css);
const hudTopoReferencia = /#hud-top \.team-score\{min-height:42px;padding:7px 16px;background:transparent;border:0;color:#ecebe6!important\}/.test(css)
  && /#hud-mid\{min-height:42px;padding:7px 18px;background:transparent\}/.test(css)
  && /#hud-top \.team-score b\{[^}]*font-family:var\(--font\)/.test(css)
  && /#round-time\{[^}]*font-family:var\(--font\)/.test(css);
const hudArma2D = /id="weapon-hud"/.test(astro) && /id="ammo-bars"/.test(astro)
  && /this\._wpnIcon\(slot\.kind === 'frag'/.test(game)
  && /class="weapon-mask" style="--weapon-mask:url/.test(game)
  && /class="weapon-icon">\$\{icon2d\}/.test(game)
  && /ammoBars\.replaceChildren\(\.\.\.Array\.from/.test(game)
  && /#ammo-weapon-art\{display:none;/.test(css)
  && /#weapon-hud\{right:20px;bottom:122px;width:150px/.test(css)
  && /#weapon-hud\{[^}]*flex-direction:column/.test(css)
  && /\.weapon-slot\{[^}]*background:transparent/.test(css)
  && /\.weapon-mask\{[^}]*mask:var\(--weapon-mask\) center\/contain no-repeat/.test(css)
  && /#ammo-bars\{[^}]*display:grid/.test(css)
  && /#ammo\{[^}]*font-family:var\(--font\)/.test(css);
const resultadoIntegrado = /\.me-hero\{[^}]*position:absolute[^}]*inset:2\.5% 0 0 44%[^}]*overflow:visible/.test(css)
  && /\.me-hero\{[^}]*background:var\(--me-art,none\) right bottom\/contain no-repeat/.test(css)
  && !/\.me-hero\{[^}]*(?:mask-image|-webkit-mask-image)/.test(css)
  && resultadoRuins.length === 0;
const loadingStageCss = (css.match(/#load-character-stage\{([^}]*)\}/) || [])[1] || '';
const loadingCompactoDireita = /width:min\(86px,6\.8vw\)/.test(loadingStageCss)
  && /height:min\(144px,15\.2vh\)/.test(loadingStageCss)
  && /built\.group\.rotation\.y = 0\.42/.test(loading3d)
  && /#load-character-action\{[^}]*display:none/.test(css);
const configuracoesReferencia = /id="settings-close"/.test(astro)
  && /id="settings-restore"/.test(astro) && /id="settings-apply"/.test(astro)
  && /class="set-preview-caption"/.test(astro)
  && /#settings-panel\{[^}]*font-family:var\(--aaa-font-body\)/.test(css)
  && /#settings-panel \.settings-wrap\{[^}]*width:980px[^}]*background:rgba\(16,17,20,\.96\)[^}]*clip-path:var\(--aaa-cut-lg\)/.test(css)
  && /#settings-panel \.set-cols\{[^}]*gap:36px[^}]*padding:26px 32px/.test(css)
  && /#settings-panel \.set-preview\{[^}]*width:360px[^}]*height:200px/.test(css)
  && /#settings-panel \.set-actions\{[^}]*padding:18px 32px 22px/.test(css)
  && /\$\('set-quality'\)\.value = 'high'; show\('settings-panel'\); return;/.test(main);
const placarReferencia = /class="sb-clock"/.test(game)
  && /class="sb-team-name"/.test(game) && /class="sb-score-num"/.test(game)
  && /<span>SCORE<\/span><span>PING<\/span>/.test(game)
  && /#scoreboard\{[^}]*background:radial-gradient\(ellipse at 50% 40%,rgba\(8,8,10,\.5\) 0%,rgba\(8,8,10,\.88\) 100%\)/.test(css)
  && /#scoreboard\{[^}]*backdrop-filter:blur\(5px\) brightness\(\.32\)/.test(css)
  && /#scoreboard h3\{[^}]*top:44px/.test(css)
  && /#scoreboard \.sb-cols\{[^}]*left:64px[^}]*right:64px[^}]*top:190px[^}]*column-gap:32px/.test(css)
  && /#scoreboard \.sb-col\.tp\{[^}]*border-top:2px solid #e0762a/.test(css)
  && /#scoreboard \.sb-col\.tb\{[^}]*border-top:2px solid #8258d8/.test(css)
  && /const totalRounds = this\._inspectionTotalRounds \|\|/.test(game)
  && /game\.ctf = false; game\._inspectionTotalRounds = 5;/.test(main)
  && /game\.paused = true; game\.keys = \{\}; game\.el\.pause\.classList\.add\('hidden'\); game\._showScoreboard\(true\)/.test(main);
const hudTipografiaReferencia = /#hud\{[^}]*font-family:var\(--aaa-font-body\)/.test(css)
  && /#hp-num\{[^}]*font-size:42px[^}]*font-family:var\(--font\)/.test(css)
  && /#ammo\{[^}]*font-family:var\(--font\)[^}]*font-size:42px/.test(css)
  && /#weapon-name\{[^}]*font-size:11px[^}]*letter-spacing:3px/.test(css)
  && /#damage-vignette\{[^}]*160px 50px rgba\(200,30,24,\.5\)/.test(css)
  && /#hud:has\(#hp-num\.low\) #damage-vignette\{opacity:1\}/.test(css);
const killfeedArma2D = /_killfeedWeaponIcon\(short\) \{/.test(game)
  && /Object\.entries\(WEAPONS\)\.find\(\(\[, weapon\]\) => weapon\.short === short\)/.test(game)
  && /class="kf-weapon-mask" style="--weapon-mask:url\('\/img\/weapons\/\$\{id\}\.webp'\)"/.test(game)
  && /\$\{this\._killfeedWeaponIcon\(weap\)\}/.test(game)
  && /\.kf-weapon-mask\{[^}]*background:currentColor[^}]*mask:var\(--weapon-mask\) center\/contain no-repeat/.test(css)
  && /\.kf-weapon-2d:has\(\.kf-weapon-mask\) \.kf-fallback\{display:none\}/.test(css);
const funcAttrs = blocoFuncao(main, 'renderCharAttrs');
const modoMapaPadrao = /<button class="cs-item cs-sub-item" data-act="sp"[^>]*>[\s\S]*?MATA-MATA<\/button>/.test(astro)
  && !/>ABATE<\/button>/.test(astro)
  && /function openModeMap\(mode, title, act\) \{[\s\S]{0,180}openSetup\(mode, title, act\);[\s\S]{0,100}renderMapScreen\(\);[\s\S]{0,80}show\('map-screen'\);/.test(main)
  && /case 'sp':\s+openModeMap\('rounds', 'MATA-MATA', 'sp'\); break;/.test(main)
  && /case 'ctf':\s+openModeMap\('ctf', 'CAPTURE THE FLAG', 'ctf'\); break;/.test(main);
const personagemSemDificuldade = !!funcAttrs && !/attr-dif|DIFICULDADE|undefined/.test(funcAttrs);
const perfilComAvatar = /const PLAYER_AVATAR_KEY = 'awpbr_player_avatar'/.test(main)
  && /function fallbackPlayerAvatar\(seed\)[\s\S]{0,420}\/img\/chars\/avatars\/\$\{character\.id\}\.webp/.test(main)
  && /function applyPlayerAvatar\(el, seed\)/.test(main)
  && /applyPlayerAvatar\(\$\('pp-avatar'\), nick\);/.test(main)
  && /res && res\.ok && res\.url[\s\S]{0,220}localStorage\.setItem\(PLAYER_AVATAR_KEY, res\.url\)[\s\S]{0,160}renderPlayerPlate\(\)/.test(main)
  && /#menu-bottombar \.pp-avatar\{[^}]*background-size:cover[^}]*background-position:center/.test(css);
const suporteNoMenu = /<button class="cs-item" data-act="feedback" type="button"><span class="cs-tick">▸<\/span>ENVIE SEU FEEDBACK<\/button>/.test(astro)
  && /case 'feedback': markCurrent\('feedback'\); show\('feedback-panel'\); break;/.test(main);
const mouseVerticalConfiguravel = /invertY: false/.test(main)
  && /id="set-invert-y" type="checkbox"/.test(astro)
  && /invertEl = \$\('set-invert-y'\)/.test(main)
  && /settings\.invertY = invertEl\.checked/.test(main)
  && /const invertY = this\.settings\.invertY \? -1 : 1;[\s\S]{0,100}this\.player\.pitch -= e\.movementY \* s \* invertY;/.test(game);
const menuWallSources = readdirSync(join(ROOT, 'public', 'img')).filter((file) => /^wall-\d+\.webp$/.test(file));
const menuWall3x2AssetsOk = menuWallSources.length > 0 && (await Promise.all(menuWallSources.map(async (name) => {
  const file = join(ROOT, 'public', 'img', 'walls-3x2', name);
  if (!existsSync(file)) return false;
  const sourceMeta = await sharp(join(ROOT, 'public', 'img', name)).metadata();
  const meta = await sharp(file).metadata();
  return meta.width === sourceMeta.width && meta.height === Math.round(sourceMeta.width / 1.5);
}))).every(Boolean);
const wallpaperLoadingResponsivo = /setProperty\('--loading-wall', loadingWallUrl\(_wallK\)\)/.test(main)
  && /setProperty\('--loading-wall', loadingWallUrl\(_loadWallI\+\+\)\)/.test(main)
  && /setProperty\('--menu-wall', HOME_WALL\)/.test(main)
  && /setProperty\('--menu-wall', SETUP_WALL\)/.test(main)
  && /setProperty\('--menu-wall-3x2', HOME_WALL_3X2\)/.test(main)
  && /setProperty\('--menu-wall-3x2', SETUP_WALL_3X2\)/.test(main)
  && /\.cs-wallpaper::before,\.cs-wallpaper::after\{[^}]*background-image:var\(--menu-wall\);[^}]*background-repeat:no-repeat/.test(css)
  && /\.cs-wallpaper::before\{[^}]*background-size:cover;[^}]*filter:blur\(18px\)/.test(css)
  && /\.cs-wallpaper::after\{[^}]*background-size:contain/.test(css)
  && /@media \(min-aspect-ratio:37\/25\) and \(max-aspect-ratio:38\/25\)\{[\s\S]{0,240}background-image:var\(--menu-wall-3x2,var\(--menu-wall\)\)[\s\S]{0,180}\.cs-wallpaper::after\{background-size:cover\}/.test(css)
  && menuWall3x2AssetsOk
  && /#boot-splash::before,#load-overlay::before\{[^}]*background-image:var\(--loading-wall\);background-size:cover;[^}]*filter:blur\(18px\)/.test(css)
  && /#boot-splash::after\{[^}]*background-image:[^}]*var\(--loading-wall\);[^}]*background-size:cover,contain;/.test(css)
  && /#load-overlay::after\{[^}]*background-image:[^}]*var\(--loading-wall\);[^}]*background-size:cover,contain;/.test(css);
const opcoesPartidaNoMapa = /id="ms-wpn-mode"/.test(astro)
  && /id="ms-players"/.test(astro)
  && /id="ms-rounds"/.test(astro)
  && /settings\.wpnMode = msWpnMode\.value/.test(main)
  && /settings\.bots = \+msPlayers\.value/.test(main)
  && /settings\[matchMode === 'ctf' \? 'ctfRounds' : 'rounds'\] = \+msRounds\.value/.test(main)
  && /function matchRounds\(\)[\s\S]{0,260}settings\.ctfRounds[\s\S]{0,260}settings\.rounds/.test(main)
  && /roundsMax: matchRounds\(\),/.test(main)
  && /constructor\(\{[^}]*roundsMax/.test(game)
  && /this\._roundsMax = \[1, 3, 5, 7\]\.includes\(requestedRounds\)/.test(game)
  && /if \(this\.ctf\) return this\.roundNum >= this\.roundsMax \|\| this\.ctfMatchLeft <= 0;[\s\S]{0,80}return this\.roundNum >= this\.roundsMax;/.test(game)
  && /get roundsMax\(\) \{ return this\._roundsMax; \}/.test(game);
const semBordaTracejada = !/(?:--hazard|var\(--hazard\)|border(?:-(?:bottom|top|left|right|style))?[^;}{]*(?:dashed|dotted))/i.test(css)
  && !/border(?:-(?:bottom|top|left|right|style))?[^;}{]*(?:dashed|dotted)/i.test(dev);
const personagemNoSplash = /id="splash-character-stage"[^>]*>[\s\S]{0,100}<canvas id="load-character-3d"><\/canvas>/.test(astro)
  && /const loadingStage = new LoadingCharacterStage\(document\.getElementById\('load-character-3d'\)/.test(main)
  && /loadingStage\.show\('B'\)/.test(main)
  && /function dockLoadingCharacter\(\)[\s\S]{0,260}stage\.prepend\(canvas\)/.test(main)
  && /#splash-character-stage\{[^}]*width:min\(86px,18vw\)[^}]*height:min\(144px,23vh\)/.test(css)
  && /#boot-splash \.splash-frame\{position:relative;z-index:2\}/.test(css)
  && /#splash-enter\{[^}]*font-family:var\(--aaa-font-display\)/.test(css);
const brasoesNoPlacar = /const crest = \(side\) => String\(this\._factionOf\(side\)/.test(game)
  && /<img class="sb-crest" src="\/img\/brasoes\/\$\{crest\('E'\)\}\.png" alt="">/.test(game)
  && /<img class="sb-crest" src="\/img\/brasoes\/\$\{crest\('B'\)\}\.png" alt="">/.test(game)
  && /<img class="sb-crest" src="\/img\/brasoes\/\$\{crest\(side\)\}\.png" alt="">/.test(game)
  && /#scoreboard \.sb-score \.sb-crest\{[^}]*width:48px[^}]*height:48px[^}]*object-fit:contain/.test(css)
  && /#scoreboard \.sb-chead \.sb-crest\{[^}]*width:24px[^}]*height:24px[^}]*object-fit:contain/.test(css);
const placarCentralizado = /<div class="sb-center">[\s\S]{0,180}<h3>CORO SOLTO - PLACAR<\/h3>[\s\S]{0,220}<div class="sb-cols" id="sb-cols"><\/div>[\s\S]{0,40}<\/div>/.test(astro)
  && /#scoreboard \.sb-center\{position:absolute;inset:0 64px;display:flex;flex-direction:column;justify-content:center;/.test(css)
  && /#scoreboard \.sb-center>h3\{position:static;[^}]*width:100%/.test(css)
  && /#scoreboard \.sb-center>\.sb-cols\{position:static;[^}]*width:100%/.test(css);
const submitNoteBlock = blocoFuncao(main, 'submitNote');
const backendSoNoConsole = /console\.warn\('\[ranking\]', msg\)/.test(submitNoteBlock)
  && !/(?:document|appendChild|match-stats|SUPABASE_)/.test(submitNoteBlock);
const faccaoPreloadBloqueante = /const FACTION_ART_URLS = \[[^\]]*time-e\.webp[^\]]*time-b\.webp[^\]]*tribos\.webp[^\]]*palhacos\.webp[^\]]*funkeiros\.webp[^\]]*\]/s.test(main)
  && /const factionArtImages = FACTION_ART_URLS\.map/.test(main)
  && /const factionArtReady = Promise\.all\(factionArtImages\.map/.test(main)
  && /\$\('btn-jogar'\)\.onclick = async \(\) => \{[\s\S]{0,900}await factionArtReady;[\s\S]{0,120}show\('team-select'\)/.test(main)
  && /target\.screen === 'faction'[\s\S]{0,80}await factionArtReady;[\s\S]{0,120}show\('team-select'\)/.test(main);
const trocaMConsistente = /game\.onRequestSwitch = \(\) => \{[\s\S]{0,180}game\.setPaused\(true\);[\s\S]{0,120}pickTeam\(game\.enemyFaction\)/.test(main)
  && /\$\('char-back'\)\.onclick = \(\) => \{[\s\S]{0,400}if \(switchMode && game\)[\s\S]{0,300}game\.resume\(\)/.test(main)
  && /const oldFaction = this\.playerFaction;[\s\S]{0,160}this\.playerFaction = this\.enemyFaction;[\s\S]{0,80}this\.enemyFaction = oldFaction;/.test(game);
const resultadoFundoContinuo = !/\.me-(?:wrap|hero)::after\{/.test(css)
  && !/--me-accent-rgb/.test(`${css}\n${main}\n${game}`);
const versaoMenuNoCanto = /<\/div>\s*<span class="menu-version" id="mf-ver"><\/span>\s*<\/div>\s*<!-- PAINEL DE SETUP/.test(astro)
  && /\.menu-version\{[^}]*position:fixed[^}]*right:min\(4vw,42px\)[^}]*bottom:14px/.test(css)
  && /\.menu-footer\{[^}]*bottom:48px/.test(css);
/* UIR20 — home ESTÁTICA com idioma por país. O Stateloop só publica build estático
   e a home SSR não emite dist/client/index.html, então a decisão de idioma migrou
   do frontmatter para o /api/geo-lang: o fetch começa no <head>, o i18n resolve
   ANTES do boot (translateDom) e cai no navegador quando a API não existe. */
const idiomaGeo = !/export const prerender = false/.test(astro)
  && /window\.__GEO_LANG__/.test(astro)
  && /const EN_GEO_COUNTRIES = new Set\(\[[\s\S]*?'US'[\s\S]*?'GB'/.test(geoLib)
  && !/EN_GEO_COUNTRIES[\s\S]{0,400}'PT'|'ES'/.test(geoLib)
  && /export function langFromCountry/.test(geoLib)
  && /export const prerender = false/.test(apiGeoLang)
  && /langFromCountry/.test(apiGeoLang)
  && /export async function resolveGeoLang/.test(i18n)
  && /navigator\.language/.test(i18n)
  && /await resolveGeoLang\(\)/.test(main);

const resultados = [
  ['UIA1', 'elenco inteiro tem avatar, seleção e dois resultados estáticos', assetOk, assetEvid],
  ['UIA2', 'vídeos são WebM VP9 no quadro nativo declarado', videosRuins.length === 0,
    videosRuins.length ? videosRuins.slice(0, 5).map(({ arquivo, meta }) => `${basename(arquivo)}=${meta.width}x${meta.height} vp9=${meta.vp9}`).join(' · ') : `${metas.length} vídeos conferidos`],
  ['UIA3', 'entrada usa exatamente o lote de wallpapers de loading', splashOk,
    splashOk ? `${splash.length} wallpapers do manifesto; nenhum vídeo de personagem` : 'manifesto, fonte e composição da splash divergiram'],
  ['UIA4', 'lote visualmente auditado corresponde aos vídeos e ao mapa de armas publicados', loteAuditado,
    loteAuditado ? `mídia=${mediaSha256.slice(0, 12)} mapa=${weaponMapSha256.slice(0, 12)}`
      : `auditoria=${audit.mediaSha256 ? 'divergente' : 'ausente/inválida'} mídia=${mediaSha256.slice(0, 12)} mapa=${weaponMapSha256.slice(0, 12)}`],
  ['UIA5', 'loading usa personagem GLB renderizado ao vivo num canvas Three.js transparente', loadingCanvas3d,
    loadingCanvas3d ? 'canvas + renderer + GLB real + câmera/luz próprios' : 'canvas, renderer ou integração GLB ausente'],
  ['UIA6', 'loading alterna múltiplas ações reais do rig em vez de repetir uma corrida', loadingAcoes3d,
    `${new Set(loadingActions).size} ações: ${[...new Set(loadingActions)].join(', ') || 'nenhuma'}`],
  ['UIR1', 'texto dinâmico novo passa pela camada i18n', i18nDinamico,
    'mapa/descrição/nível, facção/personagens, loading e confronto'],
  ['UIR2', 'canvas 3D não renderiza atrás do vídeo de seleção', previewUso, 'o uso de pv.r.render consulta previewVideoVisible()'],
  ['UIR3', 'vídeo de seleção pausa ao sair da tela', previewPausa, 'show() pausa #char-preview-video fora de char-select'],
  ['UIR4', 'mapas: três abas com TODOS por partidas, ficha e opções no cabeçalho, acervo dono do corpo', mapaReferencia,
    `render usa MAP_IDS completo; aba TODOS exclui COMUNIDADE; coluna=${strip.replace(/\s+/g, ' ').trim()} palco=${fundoMapa.replace(/\s+/g, ' ').trim() || 'vazio'}`],
  ['UIR5', 'dicionário i18n não tem chave duplicada', repetidas.length === 0, repetidas.join(', ') || `${chaves.length} chaves únicas`],
  ['UIR6', 'gerador de captura recebe a arma declarada de cada personagem', geradorArma,
    'gerador deriva weaponById de CHAR_WEAPON e envia a arma ao mounttest'],
  ['UIR7', 'placar alinha JOGADOR/K/D/SCORE/PING e preserva CAP. no CTF', placarCap,
    'cabeçalho e linhas compartilham --sb-grid; CTF acrescenta CAP.'],
  ['UIR8', 'captura quadrada redimensiona renderer e câmera, não só o contêiner', mountResize,
    'mounttest atualiza aspect e backing store também durante PLAY'],
  ['UIR9', 'gerador falha fechado em timeout e pageerror', geradorFalhaFechado,
    'falha de captura não pode preservar artefato velho com saída zero'],
  ['UIR10', 'strings dinâmicas restantes passam por i18n', i18nRestante,
    blurbsSemIngles.length ? `blurbs sem inglês: ${blurbsSemIngles.slice(0, 3).join(' · ')}` : 'setup, nick vazio e todo blurb do elenco'],
  ['UIR11', 'só o fallback da seleção mantém decoder de vídeo', cicloVideos,
    'entrada, loading e resultado não têm vídeo; fallback 3D pausa ao sair'],
  ['UIR12', 'vídeo de seleção é fallback e preserva o preview 3D interativo', previewInterativo,
    'WebGL mantém GIRAR/ZOOM; vídeo só entra quando o renderer não existe'],
  ['UIR13', 'seleção tem rail central de avatares 1,5× sem colidir com controles', selecaoDuasColunas,
    'ficha + preview; rail de 114px centralizado e preview respeita a linha inferior'],
  ['UIR14', 'preview preserva a pose de apresentação até o jogador girar', previewSobControle,
    'animação idle continua; yaw só responde ao arraste'],
  ['UIR15', 'resultado usa exclusivamente arte estática do personagem atual', resultadoEstatico,
    'game.js sincroniza troca no meio da partida e só aponta --me-art; DOM/CSS não têm vídeo'],
  ['UIR16', 'loading combina wallpaper com um personagem 3D distinto por facção', loadingWallpaper,
    `${new Set(loadingCharacterIds).size}/5 representantes GLB distintos; sem GIF ou sprite sheet no DOM`],
  ['UIR17', 'placar superior in-game fica solto sobre a cena e usa números Rajdhani', hudTopoReferencia,
    'times e relógio sem placa preta; números em Rajdhani'],
  ['UIR18', 'HUD 1–5 usa silhuetas 2D planas na lateral direita', hudArma2D,
    'slots vêm de _wpnIcon; arte WebP 3D fica oculta e a coluna lateral não tem placas'],
  ['UIR19', 'resultado enquadra o personagem inteiro como recorte alpha', resultadoIntegrado,
    resultadoRuins.length
      ? `${resultadoRuins.length}/${resultadoVisual.length} artes cortadas, opacas ou no quadro errado: ${resultadoRuins.slice(0, 4).map(({ arquivo, meta, bounds }) => `${arquivo} ${meta.width}×${meta.height} alpha=${meta.alpha} margens=${[bounds.left, bounds.right, bounds.top, bounds.bottom].map((v) => (v * 100).toFixed(1)).join('/')}`).join(' · ')}`
      : `${resultadoVisual.length}/${resultadoVisual.length} recortes alpha do elenco inteiro, com folga nos quatro lados`],
  ['UIR20', 'idioma automático usa país conhecido e português como fallback', idiomaGeo,
    'home estática; /api/geo-lang decide pelo país antes do boot; sem API (host estático) cai no navegador'],
  ['UIR21', 'loading ocupa um quinto do palco anterior e olha para o avanço da barra', loadingCompactoDireita,
    'palco 86×144 no desktop; yaw positivo acompanha a barra da esquerda para a direita'],
  ['UIR22', 'configurações reproduzem painel 980px, prévia 360×200, cabeçalho e rodapé da tela 07', configuracoesReferencia,
    'Barlow no corpo; ESC, restaurar, aplicar e salvar presentes'],
  ['UIR23', 'placar reproduz cabeçalho e duas tabelas translúcidas da tela 08', placarReferencia,
    'fundo de jogo borrado; rodada no topo; JOGADOR/K/D/SCORE/PING em duas colunas'],
  ['UIR24', 'HUD usa Barlow no corpo e Rajdhani nos números, com estado de vida baixa', hudTipografiaReferencia,
    'vida e munição 42px; nome 11px; vinheta e vermelho crítico medidos na tela 05'],
  ['UIR25', 'killfeed usa a mesma silhueta 2D alfa da arma que realizou o abate', killfeedArma2D,
    'short da arma resolve o WebP publicado; máscara monocromática substitui o SVG no evento real'],
  ['UIR26', 'Mata-mata e CTF entram pela seleção de mapas em tela cheia', modoMapaPadrao,
    'os dois modos preservam seu estado no setup e abrem a tela 04 antes de facção/personagem'],
  ['UIR27', 'ficha do personagem não inventa dificuldade sem contrato', personagemSemDificuldade,
    'renderCharAttrs publica somente VIDA, VELOCIDADE, PRECISÃO e MEME; nenhum undefined'],
  ['UIR28', 'avatares de Punk e Gotinha correspondem às identidades 3D auditadas', avatarIdentidadeOk,
    `punk=${punkAvatarSha256.slice(0, 12)} gotinha=${gotinhaAvatarSha256.slice(0, 12)} referência=${resultAudit.avatarReference || 'ausente'}`],
  ['UIR29', 'perfil usa avatar estável do elenco e troca imediatamente pela foto enviada', perfilComAvatar,
    'fallback é derivado do UID/nick; upload bem-sucedido persiste a URL e redesenha o card'],
  ['UIR30', 'menu principal convida o jogador a enviar feedback pelo canal existente', suporteNoMenu,
    'ENVIE SEU FEEDBACK abre o painel funcional sem criar rota morta'],
  ['UIR31', 'configuração de eixo vertical chega ao mouse-look real', mouseVerticalConfiguravel,
    'checkbox persistido inverte somente movementY; movimento horizontal permanece igual'],
  ['UIR32', 'menu preenche o 3:2 sem cortar; splash e loading preservam a arte inteira', wallpaperLoadingResponsivo,
    'cada wallpaper ganha variante 3:2 derivada da arte real; demais formatos mantêm contain sobre cover'],
  ['UIR33', 'tela cheia de mapas configura armas, jogadores e número real de rounds', opcoesPartidaNoMapa,
    'os três controles persistem no estado; roundsMax atravessa main.js e governa o encerramento em game.js'],
  ['UIR34', 'interface pública não usa borda tracejada ou faixa hazard', semBordaTracejada,
    'menu, painéis, seleção, resultado, links e arnês público ficam sem dashed/dotted'],
  ['UIR35', 'splash inicial mostra chamada de clique junto do personagem animado', personagemNoSplash,
    'o mesmo canvas Three.js transparente nasce na entrada e é reaproveitado no loading da partida'],
  ['UIR36', 'placar do TAB mostra os brasões das duas facções', brasoesNoPlacar,
    'cabeçalho geral e cada tabela resolvem /img/brasoes pela facção que ocupa o lado'],
  ['UIR37', 'conteúdo do placar do TAB fica centralizado verticalmente', placarCentralizado,
    'cabeçalho e tabelas formam um único bloco flex centrado no viewport'],
  ['UIR38', 'falha de ranking nunca vaza detalhe de backend na interface', backendSoNoConsole,
    'submitNote preserva diagnóstico no console e não escreve no DOM nem publica nomes de variáveis'],
  ['UIR39', 'as cinco artes de facção terminam de decodificar antes da tela aparecer', faccaoPreloadBloqueante,
    'o preload começa no boot e o primeiro acesso aguarda o mesmo Promise antes de mostrar team-select'],
  ['UIR40', 'troca com M pausa uma única camada e mantém facção, lado e volta coerentes', trocaMConsistente,
    'o jogo pausa antes do pointer lock sair; seleção usa enemyFaction e VOLTAR retoma a partida'],
  ['UIR41', 'resultado usa um único fundo preto contínuo atrás da arte alpha', resultadoFundoContinuo,
    'nenhum halo ou degradê limitado à metade direita pode criar emenda no palco do personagem'],
  ['UIR42', 'menu preenche o viewport e fixa a versão no canto inferior direito', versaoMenuNoCanto,
    'a versão fica em camada própria abaixo do rodapé, sem participar da fileira de links'],
  ['UIR43', 'ficha do mapa traz autor, data e crachá OFICIAL/COMUNIDADE (sub-filtro de autor removido, #368)', autoriaNaFicha,
    'MAP_AUTOR/MAP_DATA por mapa; byline renderiza; badge OFICIAL pra casa e COMUNIDADE pra fora; sem marcação morta de chips de autor'],
];

for (const [id, desc, ok, evid] of resultados) console.log(`${ok ? '✓' : '✗'} ${id} · ${desc}\n  ${evid}`);
if (!mutacaoAplicou) {
  console.error(`MUTAÇÃO IMPOSSÍVEL: ${MUTANTE} não encontrou o uso de produção esperado`);
  process.exit(2);
}
if (MUTANTE) {
  const alvo = alvoPorMutante[MUTANTE];
  const vermelho = resultados.find(([id]) => id === alvo)?.[2] === false;
  console.log(vermelho ? `\n✓ mutante ${MUTANTE}: ${alvo} ficou VERMELHA; a régua morde`
    : `\n✗ mutante ${MUTANTE}: ${alvo} sobreviveu`);
  process.exit(vermelho ? 0 : 1);
}
process.exit(resultados.every(([, , ok]) => ok) ? 0 : 1);
