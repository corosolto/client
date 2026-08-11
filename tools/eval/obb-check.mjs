/* ============================================================================
   obb-check.mjs — A RÉGUA DA PAREDE INVISÍVEL DE PROP GIRADO.
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   Reprovação do dono, DUAS vezes, sobre o mesmo ônibus da Brasília:
     1ª "o mapa não deixa eu andar perto do ônibus"                    (BUG-21)
     2ª "o box do ônibus não deixa você andar perto e é como se fosse um
         quadrado, mas o ônibus está em diagonal. devia ser possível andar"

   Entre as duas houve um conserto que MEDIU BEM e mesmo assim não resolveu: a
   caixa girada virou uma grade de 18 AABBs e a parede fantasma caiu de 2,33 m
   para 0,69 m. 0,69 m é meio passo — e meio passo se sente. O conserto certo era
   collider com rotação no MOTOR (`game.js/_collideRot`), e é isso que esta régua
   guarda.

   O QUE ELA MEDE, e por que assim
   Ela não confere declaração nenhuma: ela ANDA. Para cada colisor girado do mapa,
   varre uma grade de 5 cm em volta dele, chama o **`_collide` de produção** (o
   mesmo do jogador e do bot) num ponto por vez e pergunta se o corpo foi empurrado.
   Aí compara com a caixa REAL do prop:

     · EXCESSO = maior distância entre a lataria e um ponto bloqueado, MENOS o raio
       do corpo (0,38 m). É a parede fantasma que sobra depois de descontar o corpo,
       ou seja, exatamente o que o jogador sente como "não deixa chegar perto".
     · BURACO  = área DENTRO do prop onde o corpo NÃO é empurrado (dá pra entrar
       na lataria pelas quinas — o defeito espelhado, que a AABB também tinha).

   INVENTÁRIO DECLARADO: sem ele a régua é cega. Se alguém tirar o `ry` do ônibus,
   não sobra colisor girado nenhum e uma régua ingênua passaria VERDE por vacuidade
   (o buraco clássico desta base). Por isso os props que TÊM que estar girados são
   listados abaixo e a falta de qualquer um é vermelha.

   MUTAÇÕES QUE FAZEM ELA FICAR VERMELHA (rodadas e medidas):
     --mutante=aabb    trata o colisor girado como a AABB dele (o estado de antes)
     --mutante=semry   apaga o `ry` (o motor volta ao teste barato)

   Uso: node tools/eval/obb-check.mjs [mapId|all] [--mutante=aabb|semry]
   ============================================================================ */
import { THREE, MAPS, initTextures, Game } from './harness.mjs';

const ONLY = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : 'all';
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const R = 0.38;          // raio do corpo, o mesmo do game.js
const PASSO = 0.05;      // grade de 5 cm
const TETO_EXCESSO = 0.10;   // 10 cm: abaixo do passo da grade + folga numérica
const TETO_BURACO = 0.20;    // m² de lataria sem colisão

/* Props que TÊM que ter colisor girado. Sem esta lista a régua fica cega quando o
   conserto é desfeito — ver o cabeçalho. */
const OBRIGATORIOS = {
  // ry efetivo do ônibus = placement (0,55) + correção do corpo torto (PEGADA_BUS.ryCorr,
  // 0,3263). A 4ª passada do BUG-21 (06/08) mediu o corpo ~20° fora da caixa do GLB —
  // o inventário tem que cobrar o colisor NO EIXO DO CORPO, não no da caixa.
  praca_poderes: [{ nome: 'ônibus', cx: 2.5, cz: -4, ry: 0.8763 }],
};

const T = initTextures();
const mapas = ONLY === 'all' ? Object.keys(MAPS) : [ONLY];
let vermelho = 0;

for (const id of mapas) {
  const W = MAPS[id].build(new THREE.Scene(), T);
  let girados = W.colliders.filter((c) => c.ry);

  if (MUT === 'semry') {
    for (const c of girados) delete c.ry;
    girados = W.colliders.filter((c) => c.ry);
  }
  if (MUT === 'aabb') for (const c of girados) { c.hx = c.maxX - c.cx; c.hz = c.maxZ - c.cz; c.cos = 1; c.sin = 0; }

  // inventário declarado
  const faltando = (OBRIGATORIOS[id] || []).filter((o) =>
    !W.colliders.some((c) => c.ry && Math.hypot(c.cx - o.cx, c.cz - o.cz) < 0.6 && Math.abs(c.ry - o.ry) < 0.02));
  if (faltando.length) {
    vermelho++;
    console.log(`${id.padEnd(12)} OBB1 VERMELHA — prop que devia ter colisor girado e não tem: ${faltando.map((f) => f.nome).join(', ')}`);
  }
  if (!girados.length) { if (!(OBRIGATORIOS[id] || []).length) console.log(`${id.padEnd(12)} sem colisor girado`); continue; }

  // um "mundo" com UM colisor por vez: assim o número é do prop, não do vizinho
  const jogo = Object.create(Game.prototype);
  for (const c of girados) {
    jogo.world = { colliders: [c], bounds: { minX: -999, maxX: 999, minZ: -999, maxZ: 999 } };
    // caixa REAL do prop (espaço local), independente do que o colisor declara
    const cs = Math.cos(c.ry), sn = Math.sin(c.ry);
    const dentro = (x, z) => {
      const wx = x - c.cx, wz = z - c.cz;
      const lx = wx * cs - wz * sn, lz = wx * sn + wz * cs;
      return Math.abs(lx) <= c.hx && Math.abs(lz) <= c.hz;
    };
    const distDaLataria = (x, z) => {
      const wx = x - c.cx, wz = z - c.cz;
      const lx = wx * cs - wz * sn, lz = wx * sn + wz * cs;
      const ex = Math.max(0, Math.abs(lx) - c.hx), ez = Math.max(0, Math.abs(lz) - c.hz);
      return Math.hypot(ex, ez);
    };
    const marg = 3.5;
    let excesso = 0, buraco = 0, bloqFora = 0;
    const p = new THREE.Vector3();
    for (let x = c.minX - marg; x <= c.maxX + marg; x += PASSO)
      for (let z = c.minZ - marg; z <= c.maxZ + marg; z += PASSO) {
        p.set(x, 0.9, z);
        jogo._collide(p, R);
        const empurrado = Math.abs(p.x - x) > 1e-6 || Math.abs(p.z - z) > 1e-6;
        if (dentro(x, z)) { if (!empurrado) buraco += PASSO * PASSO; continue; }
        if (!empurrado) continue;
        bloqFora += PASSO * PASSO;
        excesso = Math.max(excesso, distDaLataria(x, z) - R);
      }
    excesso = Math.max(0, excesso);
    const mal = excesso > TETO_EXCESSO || buraco > TETO_BURACO;
    if (mal) vermelho++;
    console.log(`${id.padEnd(12)} ${mal ? 'OBB2 VERMELHA' : 'OBB2 ok       '} prop @(${c.cx.toFixed(1)},${c.cz.toFixed(1)}) ry=${c.ry.toFixed(2)} `
      + `${(c.hx * 2).toFixed(2)}×${(c.hz * 2).toFixed(2)} m | parede fantasma ALÉM do corpo ${excesso.toFixed(3)} m [≤${TETO_EXCESSO}] `
      + `| lataria sem colisão ${buraco.toFixed(2)} m² [≤${TETO_BURACO}] | bloqueio fora da lataria ${bloqFora.toFixed(1)} m²`);
  }
}
console.log(vermelho ? `OBBCHECK ${vermelho} VERMELHA(S)` : 'OBBCHECK verde');
if (vermelho) process.exitCode = 1;
