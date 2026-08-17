#!/usr/bin/env node
// Gera (e VALIDA) o tools/eval/ARCH.md — o índice por linha e a tabela de conflito.
//
// POR QUE ESTE SCRIPT EXISTE
// O ARCH.md escrito à mão dizia "game.js (3234 linhas)" quando o arquivo tinha 5361. Todos os
// ponteiros arquivo:linha da tabela de conflito estavam deslocados — e essa tabela é justamente
// o que impede dois agentes (ou dois contribuidores) de editarem a mesma região. Um índice por
// número de linha escrito à mão desatualiza no primeiro commit; a única correção é gerar.
//
// A SEPARAÇÃO QUE FAZ ISSO FUNCIONAR
//   frente -> SÍMBOLO   = conhecimento humano, estável, vive em FRENTES abaixo
//   símbolo -> LINHA    = volátil, é o que este script resolve toda vez
// O ARCH.md antigo cravava frente -> linha, misturando os dois prazos de validade.
//
// USO
//   node tools/gen-arch.mjs            reescreve o bloco gerado do ARCH.md
//   node tools/gen-arch.mjs --check    sai 1 se o ARCH.md estiver desatualizado (para CI)
//   node tools/gen-arch.mjs --json     imprime o índice em JSON (para outras ferramentas)
//
// O texto FORA dos marcadores BEGIN/END é preservado — os "Levers por frente" e as notas de
// projeto são conhecimento humano e este script não os toca. Ele só VALIDA os ponteiros deles.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ARCH = join(ROOT, 'tools/eval/ARCH.md');
const BEGIN = '<!-- BEGIN:GERADO — não edite à mão, rode `npm run arch` -->';
const END = '<!-- END:GERADO -->';

/* ---------------------------------------------------------------- FRENTES
   MANTIDO À MÃO. Cada frente declara os SÍMBOLOS que possui, nunca as linhas.
   Ao mover/renomear um método, atualize aqui — o script avisa se um símbolo sumir. */
const FRENTES = {
  'ARMAS / VIEWMODEL': {
    arquivos: ['public/js/vmattach.js', 'public/js/springs.js', 'public/js/weapons.js', 'public/js/fparms.js', 'public/js/handik.js', 'public/js/recoil.js', 'public/js/vmlab.js'],
    simbolos: ['_buildViewModels', '_vmFrame', '_applyVmVisibility',
      '_switchWeapon', '_startReload', '_scope', '_zoomFov', '_tryShoot', '_fireHitscan', '_meleeHit',
      '_muzzleWorld', '_flash', '_tracer', '_ejectCasing', '_shotRecoil', '_installRecoil'],
    consts: ['STATIC_CLASS', 'VM_FOV_DEFAULT', 'VM_OFF', 'VM_KNOB', 'GUNFEEL'],   // WEAPONS extraído p/ data/weapons.js (#305); REC_DEG movido p/ recoil.js (indexado por arquivo)
  },
  'BOTS / JOGABILIDADE': {
    arquivos: [],
    simbolos: ['_updateBot', '_botCtf', '_botSeparation', '_duelToken', '_botEye', '_losClear',
      '_findPathLocal', '_wpComp', '_pullString', '_walkReach', '_freeYaw', '_damage', '_kill', '_updatePlayer', '_collide'],
    consts: ['BOT_VIEW', 'BOT_VIEW_SNIPER', 'BOT_VIEW_ALERT', 'BOT_SPEED', 'BOT_SKILLS', 'DIFF_MUL',
      'BOT_DUEL_TOKENS', 'BOT_TOKEN_HOLD', 'BOT_TOKEN_REST', 'BOT_DMG_BY_DIFF', 'BOT_SPRAY_K', 'PLAYER_SPEED'],
  },
  'MAPAS / MUNDO': {
    arquivos: ['public/js/maps.js', 'public/js/mapprops.js', 'public/js/map_brasilia.js',
      'public/js/map_havan.js', 'public/js/map_piscina.js', 'public/js/map_piscinao_ramos.js', 'public/js/map_ferrovelho.js'],
    simbolos: ['_buildEnv', '_resetPositions', '_initCTF', '_updateCTF', '_updatePickups'],
    consts: [],
  },
  'GRÁFICOS / FX': {
    arquivos: ['public/js/bloom.js', 'public/js/textures.js', 'public/js/vao.js', 'public/js/stylize.js', 'public/js/gpuparticles.js'],
    simbolos: ['_updateFx', '_puff', '_makePuffTexture', '_makeFlashTex', '_makeFlashCoreTex', '_applyQuality'],
    consts: [],
  },
  'UI / HUD / MENU': {
    arquivos: ['public/js/main.js', 'public/style.css', 'src/pages/index.astro'],
    simbolos: ['_dom', '_updateHud', '_showScoreboard', '_feed', '_hitmarker', '_dmgNumber', '_wpnIcon',
      '_updateRadar', '_dmgArc', 'setPaused', 'applySettings', 'onResize'],
    consts: [],
  },
  'ÁUDIO': { arquivos: ['public/js/audio.js'], simbolos: [], consts: [] },
  'PERSONAGENS': {
    arquivos: ['public/js/characters.js', 'public/js/glbchars.js'],
    simbolos: [], consts: ['CHARACTERS', 'CHAR_WEAPON', 'GLB_CHARS'],
  },
  'SITE / BACKEND': { arquivos: ['src/', 'supabase/'], simbolos: [], consts: [] },
};

/* ZONAS VERMELHAS: métodos que qualquer frente pode PRECISAR tocar, e por isso são append-only.
   Editar o miolo destes é o jeito mais rápido de dois agentes se atropelarem. */
const ZONA_VERMELHA = ['update', '_dom', 'constructor'];

/* ---------------------------------------------------------------- parsing */
function indexar(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return null;
  const linhas = readFileSync(abs, 'utf8').split('\n');
  const simbolos = [];

  linhas.forEach((l, i) => {
    const n = i + 1;
    // método de classe: exatamente 2 espaços de indentação, nome(, e chave na mesma linha
    const m = /^ {2}(?:async\s+)?([_a-zA-Z][\w]*)\s*\([^)]*\)\s*\{/.exec(l);
    if (m && !/^\s*(if|for|while|switch|catch|return|function|else)\b/.test(l.trim())) {
      simbolos.push({ tipo: 'metodo', nome: m[1], linha: n });
      return;
    }
    // método-arrow atribuído em runtime: `this._vmFrame = (force) => {`. No game.js vários
    // métodos grandes nascem assim DENTRO de outro método (fecham sobre variáveis locais) —
    // a v1 deste script não os via, e _vmFrame (~100 linhas) ficava invisível no índice.
    const a = /^\s*this\.([_a-zA-Z][\w]*)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[_a-zA-Z][\w]*)\s*=>/.exec(l);
    if (a) { simbolos.push({ tipo: 'metodo~', nome: a[1], linha: n }); return; }
    // const/let/function/class de topo (sem indentação)
    const c = /^(?:export\s+)?(?:const|let|var|function|class)\s+([_a-zA-Z][\w]*)/.exec(l);
    if (c) simbolos.push({ tipo: 'topo', nome: c[1], linha: n });
  });

  simbolos.sort((a, b) => a.linha - b.linha);
  for (let i = 0; i < simbolos.length; i++) {
    const fim = i + 1 < simbolos.length ? simbolos[i + 1].linha : linhas.length;
    simbolos[i].tam = fim - simbolos[i].linha;
    simbolos[i].fim = fim - 1;
  }
  return { rel, total: linhas.length, simbolos };
}

const ALVOS = ['public/js/game.js', 'public/js/main.js', 'public/js/glbchars.js',
  'public/js/characters.js', 'public/js/vmattach.js', 'public/js/springs.js', 'public/js/weapons.js'];
const idx = ALVOS.map(indexar).filter(Boolean);
const game = idx.find((x) => x.rel === 'public/js/game.js');
if (!game) { console.error('ERRO: public/js/game.js não encontrado a partir de', ROOT); process.exit(2); }

const acharNoGame = (nome) => game.simbolos.find((s) => s.nome === nome);
// alguns símbolos de uma frente vivem em OUTRO arquivo (ex.: CHARACTERS em characters.js).
// Só é "sumido" se não estiver em nenhum arquivo indexado.
const acharEmQualquer = (nome) => {
  for (const f of idx) { const s = f.simbolos.find((x) => x.nome === nome); if (s) return { ...s, arquivo: f.rel }; }
  return null;
};

/* ---------------------------------------------------------------- geração */
function bloco() {
  const L = [];
  const agora = readFileSync(join(ROOT, 'public/js/version.js'), 'utf8').match(/'([^']+)'/);
  L.push(`> Gerado por \`node tools/gen-arch.mjs\`. **Não edite este bloco à mão.**`);
  L.push(`> Versão do jogo: ${agora ? agora[1] : '?'} · \`npm run arch\` para regenerar · \`npm run arch:check\` no CI.`);
  L.push('');

  // --- tamanho dos arquivos
  L.push('## Tamanho dos arquivos indexados');
  L.push('');
  L.push('| Arquivo | Linhas | Símbolos |');
  L.push('|---|---:|---:|');
  for (const f of idx) L.push(`| \`${f.rel}\` | ${f.total} | ${f.simbolos.length} |`);
  L.push('');

  // --- os maiores métodos: onde o risco de conflito mora
  const grandes = game.simbolos.filter((s) => s.tipo === 'metodo').sort((a, b) => b.tam - a.tam).slice(0, 15);
  const somaG = grandes.reduce((a, s) => a + s.tam, 0);
  L.push(`## Maiores métodos de \`game.js\` — onde o conflito mora`);
  L.push('');
  L.push(`Os 15 maiores somam **${somaG} linhas (${Math.round((100 * somaG) / game.total)}% do arquivo)**. Método grande = PR irrevisável e merge conflitante.`);
  L.push('');
  L.push('| Linhas | Início | Método | |');
  L.push('|---:|---:|---|---|');
  for (const s of grandes) {
    const flag = ZONA_VERMELHA.includes(s.nome) ? '🔴 append-only' : s.tam > 300 ? '⚠️ candidato a extração' : '';
    L.push(`| ${s.tam} | ${s.linha} | \`${s.nome}()\` | ${flag} |`);
  }
  L.push('');

  // --- tabela de conflito resolvida para linhas de HOJE
  L.push('## Tabela de CONFLITO — resolvida para as linhas de hoje');
  L.push('');
  L.push('Declare sua frente antes de editar. Em `game.js` use **só a ferramenta Edit, nunca Write**.');
  L.push('Duas frentes com faixas disjuntas podem rodar em paralelo — foi medido: 3 agentes editaram');
  L.push('faixas disjuntas simultaneamente com zero conflito de conteúdo.');
  L.push('');
  L.push('| Frente | Faixas em `game.js` | Arquivos exclusivos |');
  L.push('|---|---|---|');
  for (const [nome, def] of Object.entries(FRENTES)) {
    const faixas = [];
    for (const sim of def.simbolos) { const s = acharNoGame(sim); if (s) faixas.push({ ...s, sim }); }
    for (const c of def.consts) { const s = acharNoGame(c); if (s) faixas.push({ ...s, sim: c }); }
    faixas.sort((a, b) => a.linha - b.linha);
    // funde faixas contíguas (gap <= 12 linhas) para a tabela ficar legível
    const fundidas = [];
    for (const f of faixas) {
      const u = fundidas[fundidas.length - 1];
      if (u && f.linha - u.fim <= 12) { u.fim = Math.max(u.fim, f.fim); u.nomes.push(f.sim); }
      else fundidas.push({ ini: f.linha, fim: f.fim, nomes: [f.sim] });
    }
    const txt = fundidas.length
      ? fundidas.map((f) => `\`${f.ini}–${f.fim}\``).join(' ')
      : '—';
    L.push(`| **${nome}** | ${txt} | ${def.arquivos.map((a) => `\`${a}\``).join(' ') || '—'} |`);
  }
  L.push('');
  L.push(`**🔴 Zonas vermelhas (append-only, qualquer frente pode precisar):** ${ZONA_VERMELHA
    .map((n) => { const s = acharNoGame(n); return s ? `\`${n}()\` ${s.linha}–${s.fim}` : `\`${n}()\` (ausente)`; })
    .join(' · ')}`);
  L.push('');

  // --- sobreposição entre frentes: uma tabela de conflito que se contradiz é pior que nenhuma
  const donos = new Map();   // linha -> [frentes]
  for (const [nome, def] of Object.entries(FRENTES))
    for (const sim of [...def.simbolos, ...def.consts]) {
      const s = acharNoGame(sim);
      if (!s) continue;
      for (let n = s.linha; n <= s.fim; n++) {
        if (!donos.has(n)) donos.set(n, new Set());
        donos.get(n).add(nome);
      }
    }
  const conflitos = new Map();
  for (const [, fs] of donos) {
    if (fs.size < 2) continue;
    const k = [...fs].sort().join(' × ');
    conflitos.set(k, (conflitos.get(k) || 0) + 1);
  }
  if (conflitos.size) {
    L.push('### ⚠️ Frentes que reivindicam as MESMAS linhas');
    L.push('');
    L.push('Estas faixas não podem ser editadas em paralelo — serialize ou reparticione os símbolos.');
    L.push('');
    L.push('| Frentes | Linhas em comum |');
    L.push('|---|---:|');
    for (const [k, v] of [...conflitos].sort((a, b) => b[1] - a[1])) L.push(`| ${k} | ${v} |`);
    L.push('');
  } else {
    L.push('Nenhuma sobreposição entre frentes — todas as faixas são disjuntas. ✓');
    L.push('');
  }
  const cobertas = donos.size;
  L.push(`Cobertura: **${cobertas} de ${game.total} linhas (${Math.round((100 * cobertas) / game.total)}%)** do \`game.js\` têm dono declarado. O resto é território neutro — declare a frente mesmo assim.`);
  L.push('');

  // --- índice completo
  L.push('<details><summary><strong>Índice completo de <code>game.js</code> (todos os símbolos)</strong></summary>');
  L.push('');
  L.push('| Linha | Símbolo | Linhas |');
  L.push('|---:|---|---:|');
  for (const s of game.simbolos) {
    if (s.tam < 3 && s.tipo === 'topo') continue;
    L.push(`| ${s.linha} | ${s.tipo === 'metodo' ? `\`${s.nome}()\`` : `\`${s.nome}\``} | ${s.tam} |`);
  }
  L.push('');
  L.push('</details>');
  L.push('');

  // --- validação dos ponteiros da prosa
  const prosa = existsSync(ARCH) ? readFileSync(ARCH, 'utf8') : '';
  const fora = prosa.split(BEGIN)[0] + (prosa.split(END)[1] || '');
  const refs = [...fora.matchAll(/`?([\w./-]+\.(?:js|mjs|astro|css))[:`]*\s*(\d+)/g)];
  const quebrados = [];
  for (const [, arq, ln] of refs) {
    const alvo = idx.find((x) => x.rel.endsWith(arq) || x.rel.endsWith('/' + arq));
    if (alvo && +ln > alvo.total) quebrados.push(`${arq}:${ln} (arquivo tem ${alvo.total} linhas)`);
  }
  L.push('## Validação dos ponteiros escritos à mão');
  L.push('');
  if (!quebrados.length) L.push('Nenhum ponteiro `arquivo:linha` da prosa aponta para fora do arquivo. ✓');
  else {
    L.push('⚠️ **Ponteiros fora do arquivo** (a prosa abaixo envelheceu — corrija à mão):');
    L.push('');
    for (const q of [...new Set(quebrados)]) L.push(`- ${q}`);
  }
  L.push('');
  return L.join('\n');
}

/* ---------------------------------------------------------------- saída */
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ arquivos: idx.map((f) => ({ arquivo: f.rel, linhas: f.total, simbolos: f.simbolos })) }, null, 2));
  process.exit(0);
}

const novo = bloco();
const atual = existsSync(ARCH) ? readFileSync(ARCH, 'utf8') : '';
let saida;
if (atual.includes(BEGIN) && atual.includes(END)) {
  saida = atual.slice(0, atual.indexOf(BEGIN)) + BEGIN + '\n\n' + novo + '\n' + END + atual.slice(atual.indexOf(END) + END.length);
} else {
  // primeira execução: injeta o bloco depois do H1 e preserva TODO o resto
  const linhas = atual.split('\n');
  const h1 = linhas.findIndex((l) => l.startsWith('# '));
  const corte = h1 >= 0 ? h1 + 1 : 0;
  saida = [...linhas.slice(0, corte), '', BEGIN, '', novo, END, '', ...linhas.slice(corte)].join('\n');
}

if (process.argv.includes('--check')) {
  if (saida !== atual) {
    console.error('✗ ARCH1  ARCH.md está DESATUALIZADO em relação ao código.');
    console.error('         game.js tem ' + game.total + ' linhas; o índice do ARCH.md não bate.');
    console.error('         Rode: npm run arch');
    process.exit(1);
  }
  console.log('✓ ARCH1  ARCH.md em dia (game.js ' + game.total + ' linhas, ' + game.simbolos.length + ' símbolos)');
  process.exit(0);
}

// símbolos declarados nas FRENTES que sumiram do código: aviso alto, não falha
const sumidos = [];
for (const [nome, def] of Object.entries(FRENTES))
  for (const s of [...def.simbolos, ...def.consts]) {
    const achado = acharEmQualquer(s);
    if (!achado) sumidos.push(`${nome} → ${s}  (não existe em nenhum arquivo indexado)`);
  }

writeFileSync(ARCH, saida);
console.log(`✓ ARCH.md regenerado — ${relative(ROOT, ARCH)}`);
console.log(`  game.js: ${game.total} linhas, ${game.simbolos.length} símbolos indexados`);
if (sumidos.length) {
  console.log(`\n  ⚠ ${sumidos.length} símbolo(s) declarados em FRENTES não existem mais no game.js:`);
  for (const s of sumidos) console.log(`    - ${s}`);
  console.log('    (renomeados ou movidos? atualize o mapa FRENTES no topo de tools/gen-arch.mjs)');
}
