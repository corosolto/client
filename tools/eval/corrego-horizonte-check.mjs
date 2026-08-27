/* ============================================================================
   corrego-horizonte-check.mjs — O CÉU NÃO ENTRA POR BAIXO DO CHÃO.
   ----------------------------------------------------------------------------
   Relato do dono: "o horizonte estas aparecendo nas escadas mas nao no topo".

   O PALPITE ÓBVIO ESTAVA ERRADO, e refutá-lo veio antes de mexer: NÃO existe
   plano de fundo no córrego. `grep PlaneGeometry map_corrego.js` dá UM resultado,
   o helper `addFloor`, e todo uso dele é horizontal. O céu é `scene.background`
   equiretangular (map_sky.js) — ele desenha no infinito e não pode CRUZAR
   geometria. Logo não é plano atravessando o chão: é BURACO no mundo, e o céu
   aparece pelo buraco. "Nas escadas e não no topo" é a assinatura disso — o olho
   só vê o buraco quando está ABAIXO da cota 0.

   ONDE ESTÁ O BURACO: a parede do canal é construída em trechos que EXCLUEM as
   4 rampas. No lugar da parede a rampa põe uma laje fina inclinada, que é o piso
   por onde se desce — mas nada fecha a face EXTERNA (|x| = RAMPA_X1) por baixo
   dela. Do leito, uma visada para fora entre a cota do fundo e a cota 0 sai do
   mundo sem encontrar nada: o asfalto de fora é um PlaneGeometry de face única
   virado pra cima, invisível por baixo.

   COMO MEDE: raio de verdade (THREE.Raycaster) contra a cena montada pelo arnês,
   partindo de dentro do canal e olhando pra fora na horizontal, na faixa de
   altura em que o defeito vive. Raio que não acerta NADA é vazamento de céu.

   MUTAÇÃO (`--mutante=<id>`): apaga o fechamento e a régua tem que acender.
   ============================================================================ */
import { THREE, initTextures, bootGame } from './harness.mjs';

const MAPA = 'corrego';
const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
const MUTANTES = new Set(['sem-fechamento']);
if (mutante && !MUTANTES.has(mutante)) {
  console.error(`mutante desconhecido: ${mutante} (conhecidos: ${[...MUTANTES].join(', ')})`);
  process.exit(2);
}

const game = bootGame(MAPA, { textures: initTextures(), ctf: true, seed: 13007 });
const root = game.world.root;

/* o mutante remove exatamente as peças de fechamento da face externa da rampa */
let removidas = 0;
if (mutante === 'sem-fechamento') {
  const alvo = [];
  root.traverse((o) => { if (o.userData && o.userData.corregoRampaSkin) alvo.push(o); });
  for (const o of alvo) { o.removeFromParent(); removidas++; }
}

/* alvos opacos: o que de fato tapa a vista. Malha transparente não tapa céu. */
const opacos = [];
root.traverse((o) => {
  if (!o.isMesh || !o.visible || !o.geometry) return;
  let vis = true;
  o.traverseAncestors((a) => { if (!a.visible) vis = false; });
  if (!vis) return;
  const m = Array.isArray(o.material) ? o.material[0] : o.material;
  if (!m) return;
  if (m.transparent && (m.opacity === undefined || m.opacity < 0.9)) return;
  opacos.push(o);
});

const RAMPAS = [
  { lado: -1, zAlto: -33, zBaixo: -27 },
  { lado: 1, zAlto: -13, zBaixo: -7 },
  { lado: -1, zAlto: 9, zBaixo: 15 },
  { lado: 1, zAlto: 29, zBaixo: 35 },
];
const CANAL_FUNDO = -1.75;
const ALCANCE = 60;             // se em 60 m não achou nada, achou o céu
const rc = new THREE.Raycaster();
rc.far = ALCANCE;

/* Amostra: de dentro do canal (x = lado*2,5), olhando PRA FORA na horizontal, ao
   longo de cada rampa e nas alturas entre o fundo e a cota do passeio. */
const vazamentos = [];
let total = 0;
for (const r of RAMPAS) {
  const zA = Math.min(r.zAlto, r.zBaixo), zB = Math.max(r.zAlto, r.zBaixo);
  for (let z = zA + 0.35; z <= zB - 0.35; z += 0.5) {
    for (let y = CANAL_FUNDO + 0.12; y <= -0.12; y += 0.2) {
      const origem = new THREE.Vector3(r.lado * 2.5, y, z);
      const dir = new THREE.Vector3(r.lado, 0, 0).normalize();
      rc.set(origem, dir);
      total++;
      const hits = rc.intersectObjects(opacos, false);
      if (!hits.length) vazamentos.push({ lado: r.lado, z: +z.toFixed(2), y: +y.toFixed(2) });
    }
  }
}

const frac = total ? vazamentos.length / total : 0;
console.log(`\n[corrego-horizonte] ${opacos.length} malhas opacas · ${total} raios da margem do leito pra fora`);
if (removidas) console.log(`  mutante: ${removidas} peça(s) de fechamento removida(s)`);
console.log(`  vazamentos (raio que sai do mundo sem acertar nada): ${vazamentos.length} (${(frac * 100).toFixed(1)} %)`);
if (vazamentos.length) {
  const porRampa = new Map();
  for (const v of vazamentos) {
    const k = `${v.lado > 0 ? 'leste' : 'oeste'} z~${Math.round(v.z)}`;
    porRampa.set(k, (porRampa.get(k) || 0) + 1);
  }
  for (const [k, n] of [...porRampa].sort((a, b) => b[1] - a[1]).slice(0, 6)) console.log(`    · ${k}: ${n} raios`);
}

const checks = [
  ['HOR1 nenhuma visada horizontal do leito escapa do mundo (céu por baixo do chão)', vazamentos.length === 0,
    `${vazamentos.length} de ${total} raios`],
];

let vermelho = 0;
console.log('');
for (const [nome, ok, det] of checks) {
  console.log(`  ${ok ? '✓' : '✗'} ${nome}${ok ? '' : ` — ${det}`}`);
  if (!ok) vermelho++;
}
if (mutante) {
  if (vermelho === 0) { console.error(`\nMUTANTE ${mutante} NÃO FOI PEGO — a régua não morde.`); process.exit(1); }
  console.log(`\nmutante ${mutante}: ${vermelho} cláusula(s) vermelha(s) — a régua mordeu.`);
  process.exit(0);
}
if (vermelho) { console.error(`\nCÓRREGO-HORIZONTE VERMELHO · ${vermelho} cláusula(s)`); process.exit(1); }
console.log('\nCÓRREGO-HORIZONTE OK — o mundo é fechado na faixa do leito');
