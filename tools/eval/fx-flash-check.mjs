/* FX-FLASH-CHECK — o jogador pode baixar o clarão dos tiros.
   ═══════════════════════════════════════════════════════════════════════════════════
   O QUE COMPROU ESTA RÉGUA (relato do jogador, 21/09)

   "algumas armas soltam um flash cada vez que voce atira, isso atrapalha demais". O
   clarão (estrela + núcleo + point light do _flash, game.js) tinha ajuste SÓ de dev
   (_fxTune via dev.html) — o jogador não alcançava nenhum controle. Esta régua cobra
   o circuito inteiro: a opção nas CONFIGURAÇÕES (aba VÍDEO) chega ao multiplicador
   que o _flash de fato multiplica (jet/core escalam por _fxTune.flash; a point light
   e a _vmFlashLight por _fxTune.light), já na partida e AO VIVO (applySettings).

   FATORES (medidos no dev.html, não palpite): normal 1,0; reduzido 0,45 (~metade do
   pico percebido); mínimo 0,15 (rastro, sem estourar). Faíscas/fumaça não mudam — o
   relato é do CLARÃO, não do resto do efeito.

   A PROVA DE QUE ELA MORDE: esta régua REPROVOU 13 cláusulas no estado anterior ao
   conserto (sem setting, _fxTune sempre 1 — ver o PR). Mutante de fonte:
     --mutante=sem-seletor  o painel de configurações perde o seletor (tem que ficar vermelho)

   USO: npm run eval:fxFlash
        node tools/eval/fx-flash-check.mjs --mutante=sem-seletor
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { bootGame, initTextures } from './harness.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && !['sem-seletor'].includes(MUT)) {
  console.error(`mutante desconhecido: ${MUT}`); process.exit(2);
}

const FATORES = { normal: 1, reduzido: 0.45, minimo: 0.15 };
const textures = initTextures();
const falhas = [];
const cobra = (ok, msg) => { if (!ok) falhas.push(msg); };
const perto = (a, b) => Math.abs(a - b) < 1e-9;

/* 1–3 · cada opção chega ao multiplicador que o _flash multiplica */
for (const [opcao, f] of Object.entries(FATORES)) {
  const g = bootGame('praca_poderes', { textures, settings: { fxFlash: opcao } });
  cobra(perto(g._fxTune.flash, f), `FXF1 · ${opcao}: _fxTune.flash=${g._fxTune.flash} (esperado ${f})`);
  cobra(perto(g._fxTune.light, f), `FXF1b · ${opcao}: _fxTune.light=${g._fxTune.light} (esperado ${f})`);
  cobra(perto(g._fxTune.spark, 1) && perto(g._fxTune.smoke, 1), `FXF1c · ${opcao}: faíscas e fumaça intactas`);
  g.dispose();
}

/* 4 · AO VIVO: mudar na partida (applySettings) repassa — é o caminho do onchange */
{
  const g = bootGame('praca_poderes', { textures, settings: { fxFlash: 'normal' } });
  g.settings.fxFlash = 'reduzido';
  g.applySettings();
  cobra(perto(g._fxTune.flash, FATORES.reduzido), 'FXF2 · applySettings repassa o clarão novo em partida');
  g.dispose();
}

/* 5 · sem a opção, o comportamento de antes (1,0) — quem não mexe não vê diferença */
{
  const g = bootGame('praca_poderes', { textures });
  cobra(perto(g._fxTune.flash, 1) && perto(g._fxTune.light, 1), 'FXF3 · sem fxFlash o clarão segue 1,0 (padrão de antes)');
  g.dispose();
}

/* 6 · o seletor existe na aba VÍDEO e o binder salva + aplica ao vivo */
let astro = readFileSync(join(ROOT, 'src/pages/index.astro'), 'utf8');
let main = readFileSync(join(ROOT, 'public/js/main.js'), 'utf8');
if (MUT === 'sem-seletor') astro = astro.replace(/<label class="set-row" data-section="video">CLARÃO DOS TIROS[\s\S]*?<\/label>\n/, '');
const painel = astro.slice(astro.indexOf('settings-panel'));
cobra(/id="set-fxflash"/.test(painel), 'FXF4 · CONFIGURAÇÕES tem o seletor #set-fxflash');
cobra(/data-section="video">CLARÃO DOS TIROS/.test(painel), 'FXF4b · o seletor mora na aba VÍDEO');
for (const o of ['normal', 'reduzido', 'minimo']) {
  cobra(new RegExp(`<option value="${o}"`).test(painel), `FXF4c · opção ${o} presente`);
}
cobra(/fxFlash:\s*'normal'/.test(main), 'FXF5 · settings default fxFlash normal (padrão de antes)');
const binder = main.slice(main.indexOf("set-fxflash"));
cobra(/onchange/.test(binder) && /applySettings/.test(binder.slice(0, 700)), 'FXF6 · onchange salva e aplica ao vivo (game.applySettings)');

/* 7 · o construtor usa a setting de verdade (coberto pelas FXF1: boot com a opção
   reduzido já devolve 0.45 — se o construtor jogasse fora, FXF1 ficava vermelha,
   como ficou no estado anterior ao conserto). */

if (falhas.length) {
  console.error(`✗ FX-FLASH — ${falhas.length} cláusula(s):`);
  for (const f of falhas) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('✓ FX-FLASH: clarão configurável (normal/reduzido/mínimo), ao vivo, sem tocar faíscas/fumaça, padrão intacto');
