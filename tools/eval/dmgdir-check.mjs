/* ============================================================================
   dmgdir-check.mjs — O ARCO DE DANO NA TELA APONTA PRO ATACANTE, NÃO PRO OPOSTO?
   ----------------------------------------------------------------------------
   POR QUE EXISTE (defeito relatado pelo dono, com estas palavras)
     "O jogo está mostrando o dano recebido (e o texto do dano) em uma posição 180 graus
      além da esperada. Ou seja, se eu tomo na frente, aparece que eu tomei nas costas."

   CAUSA RAIZ — dois indicadores, uma dupla implementação, só uma corrigida.
   `_noteHit()` (o painel de texto "MORTO POR" / "veio DA SUA FRENTE") já tem a correção
   de sinal: `atan2(p.pos.x - by.pos.x, p.pos.z - by.pos.z) - p.yaw` (game.js, comentário
   em "atan2(-dx,-dz), não atan2(dx,dz)..."). Mas o indicador que o jogador vê PRIMEIRO —
   o arco vermelho na borda da tela, `_dmgArc()` — reimplementa o MESMO cálculo com a
   ORDEM DOS OPERANDOS TROCADA: `atan2(attacker.pos.x - ent.pos.x, attacker.pos.z -
   ent.pos.z) - ent.yaw`. Trocar a ordem do subtraendo nega o vetor, e negar um vetor
   soma π ao ângulo em `atan2` — exatamente os 180° que o dono está vendo. `_dmgArc` só é
   chamado com `ent === this.player` (game.js, `_damage`: `if (attacker && attacker.pos)
   this._dmgArc(attacker, ent, dmg)` dentro do `if (ent.isPlayer)`), então todo tiro que o
   JOGADOR HUMANO leva desenha o arco no lado espelhado.

   POR QUE O CONSERTO ANTERIOR (linha ~4358-4363) NÃO RESOLVEU
   Aquele trecho é o `_noteHit`, e já estava certo antes desta rodada — corrige o painel
   de morte, não o arco. São dois lugares com a mesma conta; só um tinha o sinal certo.

   COMO ELE MEDE (e por que não é regex)
   Recorta `_dmgArc` de game.js por casamento de chaves e EXECUTA o código de produção
   (mesma técnica de `ctfhud-check.mjs`) contra um `this` mínimo com DOM stubado. Injeta um
   atacante em cada uma das 4 direções cardeais ao redor da vítima, em VÁRIOS yaws da
   vítima (não só yaw=0 — um mutante que "acerta por acidente" só no eixo canônico não
   pode passar), e lê o ângulo real do `transform: rotate(...)` que o método escreveu no
   elemento do arco. 0 rad = topo da tela = atacante na frente (é o que o próprio
   comentário do método promete: "0 rad = atacante bem à frente = arco no topo da tela").

   MUTAÇÃO (regra da casa: régua que não morde não existe)
     node tools/eval/dmgdir-check.mjs --mutante=ordem-trocada
   reintroduz a ordem de operandos do defeito original (attacker - ent em vez de
   ent - attacker) e exige que as cláusulas de FRENTE/COSTAS fiquem vermelhas.

   Uso: node tools/eval/dmgdir-check.mjs [--mutante=ordem-trocada] [--json]
   ============================================================================ */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const SRC = readFileSync(path.join(ROOT, 'public', 'js', 'game.js'), 'utf8');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const JSON_OUT = process.argv.includes('--json');

/** recorta `nome(args) { ... }` de uma classe por casamento de chaves */
function method(name) {
  const start = SRC.indexOf(`\n  ${name}(`);
  if (start < 0) throw new Error(`método ${name}() não encontrado em game.js — o arnês falha em vez de passar`);
  let i = SRC.indexOf('{', start), depth = 0;
  for (let j = i; j < SRC.length; j++) {
    if (SRC[j] === '{') depth++;
    else if (SRC[j] === '}') { depth--; if (depth === 0) return SRC.slice(start, j + 1); }
  }
  throw new Error(`chaves desbalanceadas em ${name}()`);
}

let arcSrc = method('_dmgArc');

/* A MUTAÇÃO: devolve a ordem de operandos ao estado do defeito original. Se a régua
   continuar verde depois disso, ela está cega pro próprio bug que existe pra pegar. */
if (MUT === 'ordem-trocada') {
  const certo = /Math\.atan2\(ent\.pos\.x - attacker\.pos\.x, ent\.pos\.z - attacker\.pos\.z\)/;
  if (!certo.test(arcSrc)) {
    console.error('✗ MUTAÇÃO IMPOSSÍVEL: a ordem corrigida não está mais no formato esperado.');
    console.error('  Se você reescreveu _dmgArc, ajuste o regex desta mutação junto.');
    process.exit(1);
  }
  // troca TODAS as ocorrências (arco moderno + fallback ?dmgdir=0, que recebeu o mesmo conserto)
  arcSrc = arcSrc.replace(new RegExp(certo.source, 'g'), 'Math.atan2(attacker.pos.x - ent.pos.x, attacker.pos.z - ent.pos.z)');
}

/* --------- DOM stub mínimo: só o que _dmgArc toca --------- */
function mkEl() {
  const el = {
    style: {}, id: '', children: [],
    appendChild(c) { this.children.push(c); return c; },
    remove() {}, querySelectorAll() { return []; },
  };
  return el;
}
globalThis.document = { createElement: () => mkEl(), body: mkEl() };
globalThis.innerWidth = 1008; globalThis.innerHeight = 655;

/* `this` mínimo: só o que _dmgArc toca. Qualquer coisa a mais que ele passe a usar
   quebra aqui com ReferenceError/TypeError — de propósito: aviso de que a régua envelheceu. */
function freshCtx() {
  return {
    el: {},
    sfx: { ctx: null },
    _dmgArcs: null,
    _dmgArc: null,
  };
}

function build() {
  const ctx = freshCtx();
  // eslint-disable-next-line no-new-func
  const factory = new Function('ctx', 'QS', `
    const o = { ${arcSrc.trim()} };
    Object.assign(ctx, { _dmgArc: o._dmgArc });
  `);
  factory(ctx, new URLSearchParams(''));   // QS.get('dmgdir') !== '0' -> caminho moderno (o arco)
  return ctx;
}

/** ângulo do rotate(...) escrito no elemento do arco, normalizado em (-π, π] */
function arcAngle(ctx) {
  const it = ctx._dmgArcs.items[0];
  const m = /rotate\(([-0-9.]+)rad\)/.exec(it.el.style.transform);
  if (!m) throw new Error('transform sem rotate(): ' + it.el.style.transform);
  let a = parseFloat(m[1]);
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a <= -Math.PI) a += 2 * Math.PI;
  return a;
}

function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
}

const TOL = 0.01; // rad
const YAWS = [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0.7, -2.1, 2.9];
const D = 6;

/* Direções canônicas em relação ao OLHAR da vítima (forward = (-sin yaw, -cos yaw),
   right = (cos yaw, -sin yaw) — a mesma convenção que _updatePlayer já usa pro
   movimento, comentário "camera: forward = (-sin, -cos), right = (cos, -sin)"). */
const DIRS = [
  { nome: 'FRENTE', esperado: 0, off: (yaw) => ({ x: -Math.sin(yaw) * D, z: -Math.cos(yaw) * D }) },
  { nome: 'COSTAS', esperado: Math.PI, off: (yaw) => ({ x: Math.sin(yaw) * D, z: Math.cos(yaw) * D }) },
  { nome: 'DIREITA', esperado: Math.PI / 2, off: (yaw) => ({ x: Math.cos(yaw) * D, z: -Math.sin(yaw) * D }) },
  { nome: 'ESQUERDA', esperado: -Math.PI / 2, off: (yaw) => ({ x: -Math.cos(yaw) * D, z: Math.sin(yaw) * D }) },
];

const falhas = [];
const linhas = [];

for (const yaw of YAWS) {
  for (const dir of DIRS) {
    const ctx = build();
    const off = dir.off(yaw);
    const ent = { pos: { x: 0, y: 1, z: 0 }, yaw };
    const attacker = { pos: { x: off.x, y: 1, z: off.z }, name: 'BOT_TESTE' };
    ctx._dmgArc(attacker, ent, 24);
    const got = arcAngle(ctx);
    const diff = angDiff(got, dir.esperado);
    const ok = diff < TOL;
    if (!ok) falhas.push(`DMGDIR yaw=${yaw.toFixed(2)} ${dir.nome}: esperado rotate=${dir.esperado.toFixed(3)}rad, veio ${got.toFixed(3)}rad (diff ${diff.toFixed(3)})`);
    linhas.push(`yaw=${yaw.toFixed(2).padStart(6)}  ${dir.nome.padEnd(8)} esperado=${dir.esperado.toFixed(3).padStart(7)}  veio=${got.toFixed(3).padStart(7)}  ${ok ? 'ok' : 'FALHA'}`);
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ mutante: MUT || null, falhas, total: linhas.length }, null, 1));
} else {
  console.log(MUT ? `DMGDIR-CHECK (MUTANTE=${MUT} — o esperado é FALHAR)\n` : 'DMGDIR-CHECK — arco de dano aponta pro atacante?\n');
  for (const l of linhas) console.log('  ' + l);
}

if (MUT) {
  if (falhas.length) {
    console.log(`\n✓ a régua MORDE: a mutação derrubou ${falhas.length}/${linhas.length} caso(s).`);
    process.exit(0);
  }
  console.error('\n✗ RÉGUA CEGA: trocar a ordem dos operandos não derrubou nenhum caso.');
  process.exit(1);
}

console.log(`\n${falhas.length ? '✗' : '✓'} DMGDIR ${linhas.length - falhas.length}/${linhas.length} casos`);
if (falhas.length) { console.log('\nVERMELHA:'); for (const f of falhas) console.log('  ✗ ' + f); }
process.exit(falhas.length ? 1 : 0);
