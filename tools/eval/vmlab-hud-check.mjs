#!/usr/bin/env node
/* ============================================================================
   vmlab-hud-check.mjs - O MENU DE ARMAS APARECE COM ?vmlab=1 EM PRODUÇÃO?
   ----------------------------------------------------------------------------
   POR QUE EXISTE
     "o menu de hud nao esta mostrando com vmlab=1 em producao"

   CAUSA RAIZ (KNOWN-BUGS.md BUG-43)
     O protótipo do #131 vivia em public/dev.html, que é podado de produção. O jogo
     publicado não tinha host nem método para desenhar os slots.

   COMO MEDE
     Recorta e executa `_updateWeaponHud()` de game.js contra o elemento que existe
     em index.astro. Exercita flag desligada, loadout completo e loadout sem granadas.

   MUTAÇÃO
     --mutante=semflag força o ramo escondido sob vmlab=1; HUD2 precisa falhar.

   Uso: node tools/eval/vmlab-hud-check.mjs [--mutante=semflag] [--json]
   ============================================================================ */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const GAME = readFileSync(path.join(ROOT, 'public/js/game.js'), 'utf8');
const HTML = readFileSync(path.join(ROOT, 'src/pages/index.astro'), 'utf8');
const MUTANTE = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1];
const JSON_OUT = process.argv.includes('--json');

function method(name) {
  const start = GAME.indexOf(`\n  ${name}() {`);
  if (start < 0) return null;
  const open = GAME.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < GAME.length; i++) {
    if (GAME[i] === '{') depth++;
    else if (GAME[i] === '}') {
      depth--;
      if (depth === 0) return GAME.slice(start, i + 1);
    }
  }
  throw new Error(`chaves desbalanceadas em ${name}()`);
}

let updateSrc = method('_updateWeaponHud');
if (MUTANTE && MUTANTE !== 'semflag') {
  console.error(`mutante desconhecido: ${MUTANTE}`);
  process.exit(2);
}
if (MUTANTE === 'semflag' && updateSrc) {
  const antes = updateSrc;
  updateSrc = updateSrc.replace('if (!VMLAB)', 'if (true)');
  if (updateSrc === antes) {
    console.error('MUTAÇÃO IMPOSSÍVEL: guarda `if (!VMLAB)` não encontrada');
    process.exit(2);
  }
}

const fakeHud = () => {
  const classes = new Set(['hidden']);
  return {
    innerHTML: '',
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    },
    get hidden() { return classes.has('hidden'); },
  };
};

function run(vmlab, player, infinita = false) {
  if (!updateSrc) return { erro: '_updateWeaponHud() ausente em game.js' };
  const hud = fakeHud();
  const ctx = {
    player,
    el: { weaponHud: hud },
    _weaponHudSig: '',
    _wpnIcon: () => '<svg></svg>',
    _municaoInfinita: () => infinita,
  };
  // eslint-disable-next-line no-new-func
  const execute = new Function('ctx', 'VMLAB', 'WEAPONS', `
    const o = { ${updateSrc.trim()} };
    ctx._updateWeaponHud = o._updateWeaponHud;
    ctx._updateWeaponHud();
  `);
  const weapons = {
    ak: { name: 'AK', short: 'AK' },
    pistol: { name: 'PT-38', short: 'PT-38' },
    knife: { name: 'FACA', short: 'FACA' },
  };
  try { execute(ctx, vmlab, weapons); }
  catch (error) { return { erro: error.message }; }
  return {
    hidden: hud.hidden,
    html: hud.innerHTML,
    slots: [...hud.innerHTML.matchAll(/data-slot="(\d)"/g)].map((match) => match[1]),
    ativos: (hud.innerHTML.match(/weapon-slot on/g) || []).length,
  };
}

const ammo = {
  ak: { mag: 30, res: 90 },
  pistol: { mag: 12, res: 36 },
  knife: { mag: 0, res: 0 },
};
const completo = { weapon: 'ak', primary: 'ak', secondary: 'pistol', smokes: 2, frags: 1, ammo };
const seco = { weapon: 'pistol', primary: 'ak', secondary: 'pistol', smokes: 0, frags: 0, ammo };
const desligado = run(false, completo);
const ligado = run(true, completo);
const semGranada = run(true, seco);
const infinito = run(true, completo, true);

const resultados = [
  {
    id: 'HUD1',
    desc: 'index.astro publica o host do menu de armas',
    ok: /id=["']weapon-hud["']/.test(HTML),
    evid: /id=["']weapon-hud["']/.test(HTML) ? 'host presente' : '#weapon-hud ausente',
  },
  {
    id: 'HUD2',
    desc: 'vmlab=1 mostra os slots 1-5 do loadout completo',
    ok: !ligado.erro && !ligado.hidden && ligado.slots.join('') === '12345' && ligado.ativos === 1,
    evid: ligado.erro || `hidden=${ligado.hidden} slots=${ligado.slots.join(',') || 'nenhum'} ativos=${ligado.ativos}`,
  },
  {
    id: 'HUD3',
    desc: 'vmlab sem granadas mostra apenas arma, pistola e faca',
    ok: !semGranada.erro && !semGranada.hidden && semGranada.slots.join('') === '123' && semGranada.ativos === 1,
    evid: semGranada.erro || `hidden=${semGranada.hidden} slots=${semGranada.slots.join(',') || 'nenhum'} ativos=${semGranada.ativos}`,
  },
  {
    id: 'HUD4',
    desc: 'sem vmlab o menu continua escondido',
    ok: !desligado.erro && desligado.hidden && desligado.html === '',
    evid: desligado.erro || `hidden=${desligado.hidden} html=${desligado.html.length} bytes`,
  },
  /* HUD5 — no modo de arma única a reserva é infinita, e o menu tem que DIZER isso. Sem esta
     cláusula o slot imprimia `30/90` num número que nunca anda, que o jogador lê como bug. */
  {
    id: 'HUD5',
    desc: 'reserva infinita imprime 30/∞ no slot, e o modo normal segue imprimindo 30/90',
    ok: !infinito.erro && /30\/∞/.test(infinito.html) && !/30\/90/.test(infinito.html)
        && !ligado.erro && /30\/90/.test(ligado.html) && !/∞/.test(ligado.html),
    evid: infinito.erro || `infinito=${(infinito.html.match(/\d+\/[\d∞]+/g) || []).join(',')} normal=${(ligado.html.match(/\d+\/[\d∞]+/g) || []).join(',')}`,
  },
];

if (JSON_OUT) console.log(JSON.stringify({ mutante: MUTANTE || null, resultados }, null, 2));
else {
  console.log(MUTANTE ? 'VMLAB HUD (MUTANTE)\n' : 'VMLAB HUD\n');
  for (const item of resultados) console.log(` ${item.ok ? '✓' : '✗'} ${item.id} ${item.desc} - ${item.evid}`);
}

const falhas = resultados.filter((item) => !item.ok);
if (MUTANTE) {
  if (falhas.some((item) => item.id === 'HUD2')) {
    if (!JSON_OUT) console.log('\n✓ a régua MORDE: HUD2 ficou vermelha.');
    process.exit(0);
  }
  if (!JSON_OUT) console.error('\n✗ RÉGUA CEGA: a mutação não derrubou HUD2.');
  process.exit(1);
}
process.exit(falhas.length ? 1 : 0);
