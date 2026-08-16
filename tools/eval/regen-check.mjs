/* REGEN-CHECK — "a vida do 1st player volta a 100, não sei porque, isso não pode."
   ═══════════════════════════════════════════════════════════════════════════════════
   O dono vetou a regeneração fora de combate em 05/08. Ela não era bug: era a regra
   `REGEN` (game.js), CoD-style, ligada por padrão desde 31/07 e invisível — sem ícone,
   som, vinheta ou linha de configuração. Reproduzida no navegador antes do conserto
   (`tools/eval/crash-watch.mjs`, CTF ferro_velho): hp 68 -> 100 em 4,6 s, com o
   jogador vivo, sem respawn e sem rodada nova.

   Esta régua garante as duas metades do veto:

     REGEN1  o padrão é DESLIGADO (só `?regen=1` liga) — jogador e bot
     REGEN2  ANDANDO o motor de verdade: um jogador ferido, parado e sem tomar dano por
             mais que REGEN_DELAY, NÃO recupera vida
     REGEN3  o kill-switch continua existindo nos dois sentidos (a regra não foi apagada,
             só desligada — quem religar tem que entregar o feedback que falta)

   Por que REGEN2 anda em vez de ler a constante: a Lei 1 da casa. Um teto que lê a
   DECLARAÇÃO passa verde com o uso quebrado — já aconteceu quatro vezes nesta base.

   uso: node tools/eval/regen-check.mjs [--mutante=ligado|semkill]
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import { bootGame, initTextures } from './harness.mjs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const falhas = [];

/* ── REGEN1/REGEN3: a DECLARAÇÃO ──────────────────────────────────────────────────── */
let fonte = fs.readFileSync('public/js/game.js', 'utf8');
if (MUT === 'ligado') fonte = fonte.replace(/const REGEN = QS\.get\('regen'\) === '1'/, "const REGEN = QS.get('regen') !== '0'");
if (MUT === 'semkill') fonte = fonte.replace(/const REGEN = QS\.get\('regen'\) === '1'/, 'const REGEN = false');

{
  const m = fonte.match(/const REGEN = ([^,;]+)/);
  if (!m) falhas.push('REGEN1 a constante REGEN sumiu de game.js');
  else {
    const expr = m[1].trim();
    if (!/=== '1'/.test(expr)) falhas.push(`REGEN1 o padrão da regeneração NÃO está desligado: \`REGEN = ${expr}\` (o dono vetou em 05/08; só \`?regen=1\` pode ligar)`);
    if (!/QS\.get\('regen'\)/.test(expr)) falhas.push(`REGEN3 o kill-switch \`?regen=\` sumiu: \`REGEN = ${expr}\` — a regra tem que continuar religável`);
  }
  // jogador e bot têm que ler a MESMA constante (simetria é parte do desenho)
  const usos = (fonte.match(/if \(REGEN &&/g) || []).length;
  if (usos < 2) falhas.push(`REGEN1 esperava 2 usos de REGEN (jogador e bot), achei ${usos}`);
}

/* ── REGEN2: ANDA o motor ─────────────────────────────────────────────────────────── */
const textures = initTextures();
const g = bootGame('ferro_velho', { textures, ctf: false, seed: 4242 });
// mutação `ligado` reproduz o estado vetado dentro do motor já carregado
if (MUT === 'ligado') {
  const P = g.player;
  g.__regenMut = true;
  const orig = g._updatePlayer.bind(g);
  g._updatePlayer = (dt) => {
    orig(dt);
    if (P.alive && P.hp > 0 && P.hp < 100 && g.time - (P._hurtAt || -99) > 6) P.hp = Math.min(100, P.hp + dt * 22);
  };
}
const p = g.player;
p.hp = 40;
p._hurtAt = g.time;
p._lastHp = 40;
const hpFerido = p.hp;
const DT = 1 / 30;
// 20 s parado e sem tomar dano — 3× o REGEN_DELAY de 6 s. Congela o dano de bot para
// que a única variação possível de hp seja a regeneração.
g._damage = () => {};
for (let i = 0; i < 20 / DT; i++) { g.update(DT); if (!p.alive) { p.alive = true; p.hp = hpFerido; p._hurtAt = g.time; } }
const ganho = +(p.hp - hpFerido).toFixed(2);
console.log(`REGEN-CHECK: jogador ferido em ${hpFerido} hp, 20 s parado sem tomar dano -> ${p.hp.toFixed(1)} hp (ganho ${ganho})`);
if (ganho > 0.5) falhas.push(`REGEN2 o jogador recuperou ${ganho} hp sozinho — a regeneração vetada continua rodando`);

if (falhas.length) { for (const f of falhas) console.error('  ✗', f); process.exit(1); }
console.log('  ✓ regeneração desligada por padrão, medida no motor, e o kill-switch continua lá');
