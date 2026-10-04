// #680: as stations da Amazônia precisam ser alcançáveis A PARTIR DA ÁGUA.
// Reproduz o relato pelo caminho do jogador: emerge da água, chega ao PE da escada e
// sobe até o patamar (deckY). Física real do Game (_moveEntity) e chão real
// (groundHeightAt) — nada de geometria presumida.
// Ângulos de chegada: quem sai da água chega pelo lado do RIO do eixo da escada, quem
// vem por terra pelo lado OPOSTO. Os dois têm que alcançar o deck.
// Escopo: geometria procedural e física no arnês Node; GLB e imagem WebGL não medidos.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { bootGame, initTextures, MAPS } from './harness.mjs';

const MUTANTES = ['pe-na-agua'];
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.slice(10) || '';
/* MUTANTE `pe-na-agua`: nenhuma estação entra na lista de acesso — é exatamente o
   estado de antes do conserto. O pé volta a medir a RAMPA DA MARGEM (h −0,0277,
   dentro d'água) e o degrau seguinte nasce a menos de 0,30 m do chão de quem chega:
   o corpo entra na sombra do colisor e trava antes do primeiro degrau. Alvo único no
   fonte; se deixar de bater, a régua está cega. */
if (mutant === 'pe-na-agua') {
  const fonte = new URL('../../public/js/map_amazonia.js', import.meta.url);
  const alvo = new URL(`../../public/js/.amz-agua-${process.pid}.mjs`, import.meta.url);
  const txt = readFileSync(fonte, 'utf8');
  const antes = 'st.e && Math.abs(st.x + st.d[0] * ESCADA_U) < RIO_MEIA_LARGURA)';
  if (txt.split(antes).length !== 2) throw Error('alvo da mutação não é único');
  try {
    writeFileSync(alvo, txt.replace(antes, 'st.e && false)'));
    MAPS.amazonia.build = (await import(alvo.href)).buildAmazonia;
  } finally { unlinkSync(alvo); }
}

const g = bootGame('amazonia', { textures: initTextures(), ctf: true, seed: 13007, bots: 0 });
const w = g.world, p = g.player, deckY = w.amazonia.deckY;

function reset(x, z) {
  p.pos.set(x, w.groundHeightAt(x, z, 0), z);
  p.vel.set(0, 0, 0); p.alive = true; p.hp = 100; p.grounded = true; p.mantle = null;
  p.yaw = 0; p.pitch = 0; p.crouchF = 0; p.scoped = false; p.weapon = 'knife';
  p._spaceHeld = false; p.jumpBufferedUntil = 0; p.coyoteUntil = 0;
}
function andarAte(x, z, maxT) {
  let t = 0;
  for (; t < maxT; t++) {
    const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz);
    if (d < .25) break;
    g.time += 1 / 60; g._moveEntity(p, { ax: dx / d, az: dz / d, shift: false, jump: false }, 1 / 60);
  }
  return { t, chegou: t < maxT && Math.hypot(x - p.pos.x, z - p.pos.z) < .25 };
}
const subiu = (from, s, maxT = 420) => {                 // sai de `from` e sobe até o patamar
  reset(from.x, from.z);
  const r = andarAte(s.patamar.x, s.patamar.z, maxT);
  return { ...r, noDeck: Math.abs(p.pos.y - deckY) < .06, y: +p.pos.y.toFixed(3) };
};

/* Laterais varridas: −0,8 e −0,4 são o lado do rio (de onde se sai d'água); +0,4/+0,8
   são o lado de terra. Fora disso (±1,2) a escada já tem corrimão nos dois PR — as
   estações secas reprovam lá igual, então esse ângulo não é invariante. */
const LATERAIS = [-0.8, -0.4, 0, 0.4, 0.8];
const registros = w.amazonia.estacoes.map(s => {
  if (!s.temEscada) return { estacao: [s.x, s.z], temEscada: false, rede: s.rede, ok: true, semEscada: true };
  const pe = s.peEscada, ladoRio = -Math.sign(pe.x);     // o igarapé fica em |x| menor
  const tentativas = LATERAIS.map(off => {
    const x = pe.x + off * ladoRio * -1;               // varre a largura da escada
    const r = subiu({ x, z: pe.z }, s);
    return { off, x: +x.toFixed(2), gh: +w.groundHeightAt(x, pe.z, 0).toFixed(4), ok: r.chegou && r.noDeck };
  });
  return {
    estacao: [s.x, s.z], temEscada: true, rede: s.rede, pe,
    ghPe: +w.groundHeightAt(pe.x, pe.z, 0).toFixed(4), tentativas,
    ok: tentativas.every(t => t.ok),
  };
});

const comEscada = registros.filter(r => r.temEscada);
const falhas = registros.filter(r => !r.ok);
const C = registros.find(r => r.estacao[0] === 14 && r.estacao[1] === -9);
const checks = [
  ['AME1', registros.length === 11 && comEscada.length === 10, 'as 11 estações são varridas (10 com escada)'],
  ['AME2', comEscada.every(r => r.ghPe >= 0), 'todo pé de escada nasce fora d\'água (seco ou tabuleiro)'],
  ['AME3', falhas.length === 0, 'da água E por terra, o pé sobe até o deck em todas as estações'],
  ['AME4', C?.semEscada === true, 'C (14,-9) segue sem escada: uso interno, só a rota alta chega'],
];
for (const [id, ok, regra] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${regra}`);

const relatorio = { valid: falhas.length === 0, mutant, escadas: comEscada.length, registros };
const out = process.argv.find(a => a.startsWith('--out='))?.slice(6);
if (out) writeFileSync(out, JSON.stringify(relatorio, null, 2) + '\n');
console.log(JSON.stringify({
  mutant, falhas: falhas.map(f => ({ estacao: f.estacao, ghPe: f.ghPe, ladosQueFalham: f.tentativas.filter(t => !t.ok).map(t => t.off) })),
  ...registros.map(r => ({ e: r.estacao, ghPe: r.ghPe ?? null, ok: r.ok })),
}));
g.dispose();
process.exit(checks.some(([, ok]) => !ok) ? 1 : 0);