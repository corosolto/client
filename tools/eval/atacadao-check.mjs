/* ============================================================================
   atacadao-check.mjs — O ATACADÃO É UM ARMAZÉM DE CORREDORES, NÃO UMA LOJA ABERTA.
   ----------------------------------------------------------------------------
   O QUE O DONO DISSE (verbatim, 27/08/2026)
     "os mapas do emerson acho que da pra fazer models no mintgg e deixar mais
      realista, especialmente o do atacadao... e nao deixar tanto aberto, e sim
      colocar mais elementos pro mapa aumentar um pouco de complexidade"
     "o atacadao nao queria tanto igual o lojas havan, tem que fazer algo de diferente"

   "Não deixar tanto aberto" não é gosto: é a distância média que um raio percorre
   antes de bater em alguma coisa, na altura do olho, dentro do galpão. Medida no
   estado ANTERIOR a esta frente (racks de pallet ainda inexistentes, gôndolas de
   1,9 m em fileiras curtas): LOS média 14,17 m em 145 nós andáveis da loja. Um
   armazém de clube de atacado real é o oposto — parede de pallet de 3 m de altura
   formando corredor, LOS curta, canto em cada cruzamento.

   ── O QUE MEDE (mundo real do jogo, node puro, sem navegador) ───────────────
     ATA1 · corredores de rack: as fileiras de `estante_pallets` são DERIVADAS das
            marcas `atacadaoRack` (fila, índice) — a régua não confia em corredor
            declarado. Exige >= 4 fileiras de 8 a 14 racks, e >= 3 corredores
            paralelos entre fileiras vizinhas com vão livre andável de 2,2 a 5,0 m.
            Cada rack precisa de colisor de verdade em `world.colliders`.
     ATA2 · cover de meio-altura: >= 5 ilhas de caixa com altura de mundo entre
            0,85 e 1,45 m (peito: cobre o corpo, não a cabeça) e colisor que
            empurra o corpo de raio 0,38 — cover que não empurra é cenário.
     ATA3 · parede fria: >= 4 freezers na MESMA lateral (|x| >= 18) e >= 2 luzes
            frias (azul > vermelho) acesas sobre eles.
     ATA4 · luz de galpão: >= 8 luminárias industriais PENDURADAS (y >= 5,5, com
            emissivo) e >= 8 luzes locais acesas. Idioma emprestado do galpão do
            campomorro (tools/eval/campo-contract-check.mjs): teto opaco não pode
            depender do sol atravessar a laje.
     ATA5 · LOS média <= TETO_LOS m: 12 direções na altura do olho (1,62 m) em
            todo nó andável de dentro do galpão, contra a malha VISÍVEL de
            `world.root` (raycast, então batch/merge e collide:false não enganam).
     ATA6 · seções nomeadas: >= 4 placas `atacadaoSecao` com nome do vocabulário de
            supermercado (AÇOUGUE, PADARIA, HORTIFRÚTI, PEIXARIA, BEBIDAS...), nomes
            DISTINTOS, penduradas acima da cabeça (y >= 2,4) e dentro do galpão. A
            reclamação era "sessao de legumes e frutas... padaria, peixaria, sessao
            de carnes": a régua conta seção RECONHECÍVEL, não balcão anônimo.
     ATA7 · frente de caixa: >= 4 checkouts `atacadaoCaixa` com colisor que empurra o
            corpo E com nó andável a <= 3,2 m ligado ao MESMO componente do grafo em
            que os spawns nascem. Caixa que o bot não alcança é cenário.
     ATA8 · NADA DE CINZA CHAPADO em superfície grande: toda malha marcada
            `atacadaoSuperficie` (piso, parede, fachada, doca, asfalto) precisa de
            material COM textura, e piso/parede/fachada/doca não podem compartilhar a
            MESMA textura. Era esse o defeito: os quatro caíam em T.concrete e a loja
            inteira lia cinza ("a faixada da loja ta cinza, o chao ta cinza").

   ── AS MUTAÇÕES QUE PROVAM QUE ELA MORDE ───────────────────────────────────
     --mutar=sem-racks .. tira os racks da cena e dos colisores → ATA1 e ATA5 vermelhas
     --mutar=aberto ..... tira racks E ilhas (o átrio de loja de departamento que o
                          dono recusou) → ATA1, ATA2 e ATA5 vermelhas
     --mutar=sem-secoes . tira as placas de seção → ATA6 vermelha
     --mutar=sem-caixas . tira a frente de caixa da cena e dos colisores → ATA7 vermelha
     --mutar=cinza ...... devolve as superfícies grandes ao cinza: tira o `.map` dos
                          materiais marcados, que é exatamente o estado anterior desta
                          frente → ATA8 vermelha
   As cinco falham com código 2 se não acharem o que remover, e mutante desconhecido
   também sai com 2: régua por vacuidade é proibida nesta base (docs/LICOES.md).

   MORDIDA MEDIDA (27/08/2026, todas com código 1):
     sem-racks  -> ATA1 0/4 fileiras, 0/3 corredores; ATA5 LOS 9,75 -> 12,93 m
     aberto     -> o de cima + ATA2 0/5 ilhas
     sem-secoes -> ATA6 0/4 seções
     sem-caixas -> ATA7 0/4 caixas alcançáveis
     cinza      -> ATA8 11 superfícies sem textura + os 4 tipos obrigatórios ausentes

   USO
     node tools/eval/atacadao-check.mjs
     node tools/eval/atacadao-check.mjs --mutar=sem-racks|aberto|sem-secoes|sem-caixas|cinza
   ============================================================================ */
import { THREE, bootGame, initTextures, Game } from './harness.mjs';

const MUTANTES = new Set(['sem-racks', 'aberto', 'sem-secoes', 'sem-caixas', 'cinza']);
const MUTAR = (process.argv.find((a) => a.startsWith('--mutar=')) || '').split('=')[1] || '';
if (MUTAR && !MUTANTES.has(MUTAR)) { console.error(`mutante desconhecido: ${MUTAR}`); process.exit(2); }

/* Teto da LOS média. 10,50 m fica ABAIXO dos 14,17 m medidos no átrio antigo e ACIMA
   do que um corredor de 3,2 m entrega de fato — o número não é redondo por acaso: é o
   ponto em que a loja deixa de ser átrio sem virar labirinto intransitável. */
const TETO_LOS = 10.5;
const OLHO = 1.62;      // mesma altura de olho do map-check.mjs e do occluder-ray-check.mjs
const RAIOS = 12;       // direções horizontais por nó
const LONGE = 45;       // alcance do raio: maior que a diagonal do galpão

const game = bootGame('atacadao_treta', { textures: initTextures(), ctf: true, seed: 12345 });
const W = game.world;
game.scene.updateMatrixWorld(true);
W.root.updateMatrixWorld(true);

const racks = [], ilhas = [], freezers = [], luminarias = [], luzesGalpao = [], luzesFrias = [];
const secoes = [], caixas = [], superficies = [];
W.root.traverse((o) => {
  if (o.userData?.atacadaoRack) racks.push(o);
  if (o.userData?.atacadaoCover) ilhas.push(o);
  if (o.userData?.atacadaoFreezer !== undefined) freezers.push(o);
  if (o.userData?.atacadaoLuminaire) luminarias.push(o);
  if (o.userData?.atacadaoSecao) secoes.push(o);
  if (o.userData?.atacadaoCaixa) caixas.push(o);
  if (o.userData?.atacadaoSuperficie) superficies.push(o);
});
game.scene.traverse((o) => {
  if (o.userData?.mapLight === 'atacadao-galpao') luzesGalpao.push(o);
  if (o.userData?.mapLight === 'atacadao-frio') luzesFrias.push(o);
});

/* MUTAÇÃO — some com a geometria NA CENA e nos colisores, que é o que as cinco
   cláusulas leem. Mexer só na lista local provaria a lista, não o mundo. */
const removidos = [];
function sumir(lista) {
  for (const o of lista) {
    if (o.parent) o.parent.remove(o);
    const c = o.userData.collider;
    const i = c ? W.colliders.indexOf(c) : -1;
    if (i >= 0) W.colliders.splice(i, 1);
    removidos.push(o);
  }
  lista.length = 0;
}
if (MUTAR === 'sem-racks') sumir(racks);
if (MUTAR === 'aberto') { sumir(racks); sumir(ilhas); }
if (MUTAR === 'sem-secoes') sumir(secoes);
if (MUTAR === 'sem-caixas') sumir(caixas);
if (MUTAR === 'cinza') {
  /* O estado ANTERIOR desta frente: superfície grande sem textura própria. Tirar o
     `.map` devolve o material ao cinza chapado que o dono reclamou. */
  for (const o of superficies) for (const m of [].concat(o.material || [])) {
    if (m && m.map) { m.map = null; m.needsUpdate = true; removidos.push(o); }
  }
}
if (MUTAR && !removidos.length) {
  console.error(`MUTANTE NÃO APLICOU: --mutar=${MUTAR} não achou nada para remover.`);
  process.exit(2);
}
W.root.updateMatrixWorld(true);

const bbox = (o) => new THREE.Box3().setFromObject(o);
const falhas = [];

/* ---------------- ATA1 · corredores de rack derivados das fileiras ---------- */
const fileiras = new Map();
for (const r of racks) {
  const id = r.userData.atacadaoRack.fila;
  if (!fileiras.has(id)) fileiras.set(id, []);
  fileiras.get(id).push(r);
}
const filas = [...fileiras.entries()]
  .map(([id, lista]) => {
    const caixas = lista.map(bbox);
    const x = caixas.reduce((s, b) => s + (b.min.x + b.max.x) / 2, 0) / caixas.length;
    return { id, n: lista.length, x, meiaLargura: Math.max(...caixas.map((b) => (b.max.x - b.min.x) / 2)), lista };
  })
  .sort((a, b) => a.x - b.x);
const filasOk = filas.filter((f) => f.n >= 8 && f.n <= 14);
const semColisor = racks.filter((r) => !r.userData.collider || !W.colliders.includes(r.userData.collider));

/* Nó andável dentro do vão: o corredor tem que existir para os PÉS, não só no papel. */
const nos = W.waypoints?.nodes || [];
const corredores = [];
for (let i = 1; i < filas.length; i++) {
  const a = filas[i - 1], b = filas[i];
  const x0 = a.x + a.meiaLargura, x1 = b.x - b.meiaLargura;
  const vao = x1 - x0;
  const andaveis = nos.filter((n) => n.x > x0 && n.x < x1).length;
  if (vao >= 2.2 && vao <= 5.0 && andaveis >= 6) corredores.push({ vao, andaveis, centro: (x0 + x1) / 2 });
}
if (filasOk.length < 4) falhas.push(`ATA1 — ${filasOk.length}/4 fileiras de rack com 8 a 14 unidades (${filas.length} fileiras marcadas)`);
if (corredores.length < 3) falhas.push(`ATA1 — ${corredores.length}/3 corredores paralelos com vão andável de 2,2 a 5,0 m`);
if (semColisor.length) falhas.push(`ATA1 — ${semColisor.length} rack(s) sem colisor registrado em world.colliders`);

/* ---------------- ATA2 · cover de meio-altura que empurra o corpo ----------- */
const sonda = Object.create(Game.prototype);
sonda.world = { colliders: W.colliders, bounds: W.bounds };
const empurra = (c) => {
  const x = (c.minX + c.maxX) / 2, z = (c.minZ + c.maxZ) / 2;
  const corpo = new THREE.Vector3(x, 0, z);
  sonda._collide(corpo, .38);
  return Math.hypot(corpo.x - x, corpo.z - z) >= .37;
};
const coversOk = ilhas.filter((o) => {
  const b = bbox(o), h = b.max.y - b.min.y;
  if (!(h >= .85 && h <= 1.45)) return false;
  const c = o.userData.collider;
  return !!c && W.colliders.includes(c) && empurra(c);
});
if (coversOk.length < 5) falhas.push(`ATA2 — ${coversOk.length}/5 ilhas de meio-altura (0,85–1,45 m) com colisor que empurra o corpo (${ilhas.length} marcadas)`);

/* ---------------- ATA3 · freezers na lateral fria --------------------------- */
const lateral = { '-1': 0, '1': 0 };
for (const f of freezers) {
  const x = bbox(f).getCenter(new THREE.Vector3()).x;
  if (Math.abs(x) >= 18) lateral[x < 0 ? '-1' : '1']++;
}
const naParede = Math.max(lateral['-1'], lateral['1']);
const friasAcesas = luzesFrias.filter((l) => l.intensity >= .8 && l.color.b > l.color.r).length;
if (naParede < 4) falhas.push(`ATA3 — ${naParede}/4 freezers na mesma lateral fria (|x| >= 18); ${freezers.length} marcados no total`);
if (friasAcesas < 2) falhas.push(`ATA3 — ${friasAcesas}/2 luzes frias acesas sobre os freezers`);

/* ---------------- ATA4 · luminárias industriais penduradas ------------------ */
const penduradas = luminarias.filter((o) => {
  const b = bbox(o);
  const emissivo = [].concat(o.material || []).some((m) => m?.emissiveIntensity >= .5);
  return b.min.y >= 5.5 && emissivo;
});
const acesas = luzesGalpao.filter((l) => l.intensity >= .8).length;
if (penduradas.length < 8) falhas.push(`ATA4 — ${penduradas.length}/8 luminárias penduradas (y >= 5,5 m, emissivo >= 0,50); ${luminarias.length} marcadas`);
if (acesas < 8) falhas.push(`ATA4 — ${acesas}/8 luzes locais acesas no galpão`);

/* ---------------- ATA5 · LOS média dentro do galpão ------------------------- */
const solidos = [];
W.root.traverse((o) => { if (o.isMesh && o.visible) solidos.push(o); });
const DENTRO = W.lojaZ || { z0: -6, z1: 33 };
const DENTRO_Z0 = DENTRO.z0, DENTRO_Z1 = DENTRO.z1;
const nosLoja = nos.filter((n) => n.z > DENTRO.z0 && n.z < DENTRO.z1);
const ray = new THREE.Raycaster(); ray.camera = game.camera; ray.far = LONGE;
let soma = 0, tiros = 0;
for (const p of nosLoja) for (let k = 0; k < RAIOS; k++) {
  const a = (k * 2 * Math.PI) / RAIOS;
  ray.set(new THREE.Vector3(p.x, OLHO, p.z), new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
  const hit = ray.intersectObjects(solidos, false)[0];
  soma += hit ? hit.distance : LONGE; tiros++;
}
const losMedia = tiros ? soma / tiros : LONGE;
if (!nosLoja.length) falhas.push('ATA5 — nenhum nó andável dentro do galpão: medida vazia não vale');
if (losMedia > TETO_LOS) falhas.push(`ATA5 — LOS média ${losMedia.toFixed(2)} m > teto ${TETO_LOS.toFixed(2)} m: o galpão ainda é átrio aberto`);

/* ---------------- ATA6 · seções nomeadas e reconhecíveis -------------------- */
const VOCAB = ['AÇOUGUE', 'PADARIA', 'HORTIFRÚTI', 'PEIXARIA', 'BEBIDAS', 'FRIOS', 'MERCEARIA', 'CONGELADOS'];
const nomesSecao = new Set();
for (const o of secoes) {
  const nome = String(o.userData.atacadaoSecao || '').toUpperCase();
  if (!VOCAB.includes(nome)) continue;
  const b = bbox(o);
  const c = b.getCenter(new THREE.Vector3());
  if (b.min.y < 2.4) continue;                                   // placa tem de ficar acima da cabeça
  if (!(c.z > DENTRO_Z0 && c.z < DENTRO_Z1)) continue;           // e dentro do galpão
  nomesSecao.add(nome);
}
if (nomesSecao.size < 4) falhas.push(`ATA6 — ${nomesSecao.size}/4 seções nomeadas e reconhecíveis (${secoes.length} placas marcadas): ${[...nomesSecao].join(', ') || '—'}`);

/* ---------------- ATA7 · frente de caixa alcançável ------------------------- */
/* Componente conexo em que os spawns nascem: caixa fora dele é decoração. */
const adj = W.waypoints?.adj || [];
const vistos = new Set();
{
  const fila = [];
  for (const lado of Object.values(W.spawns || {})) for (const sp of lado) {
    const i = W.nearestWaypoint(sp.x, sp.z);
    if (!vistos.has(i)) { vistos.add(i); fila.push(i); }
  }
  while (fila.length) { const n = fila.shift(); for (const m of (adj[n] || [])) if (!vistos.has(m)) { vistos.add(m); fila.push(m); } }
}
const R_CAIXA = 3.2;
const caixasOk = caixas.filter((o) => {
  const c = o.userData.collider;
  if (!c || !W.colliders.includes(c) || !empurra(c)) return false;
  const cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
  return nos.some((n, i) => vistos.has(i) && Math.hypot(n.x - cx, n.z - cz) <= R_CAIXA);
});
if (caixasOk.length < 4) falhas.push(`ATA7 — ${caixasOk.length}/4 caixas com colisor que empurra e nó andável conexo a <= ${R_CAIXA} m (${caixas.length} marcadas)`);

/* ---------------- ATA8 · superfície grande sem cinza chapado ---------------- */
const PRECISA = ['piso', 'parede', 'fachada', 'doca'];
const porTipo = new Map();
const semMapa = [];
for (const o of superficies) {
  const tipo = o.userData.atacadaoSuperficie;
  for (const m of [].concat(o.material || [])) {
    if (!m) continue;
    if (!m.map) { semMapa.push(`${tipo}`); continue; }
    if (!porTipo.has(tipo)) porTipo.set(tipo, new Set());
    porTipo.get(tipo).add(m.map.uuid);
  }
}
const faltando = PRECISA.filter((t) => !porTipo.has(t));
/* Textura COMPARTILHADA entre dois tipos é o defeito original (todos em T.concrete). */
const donos = new Map();
for (const t of PRECISA) for (const uuid of (porTipo.get(t) || [])) {
  if (!donos.has(uuid)) donos.set(uuid, new Set());
  donos.get(uuid).add(t);
}
const compartilhadas = [...donos.values()].filter((set) => set.size > 1).map((set) => [...set].join('+'));
if (semMapa.length) falhas.push(`ATA8 — ${semMapa.length} superfície(s) grande(s) sem textura (cinza chapado): ${[...new Set(semMapa)].join(', ')}`);
if (faltando.length) falhas.push(`ATA8 — superfície grande sem malha marcada: ${faltando.join(', ')}`);
if (compartilhadas.length) falhas.push(`ATA8 — superfícies grandes dividindo a MESMA textura: ${compartilhadas.join(' / ')}`);

/* ---------------- saída ---------------------------------------------------- */
console.log(`ATA1 ${filasOk.length} fileiras de 8–14 racks · ${corredores.length} corredores (vão ${corredores.map((c) => c.vao.toFixed(1)).join('/') || '—'} m) · ${racks.length} racks`);
console.log(`ATA2 ${coversOk.length} ilhas de meio-altura com colisor que empurra`);
console.log(`ATA3 ${naParede} freezers na lateral fria · ${friasAcesas} luzes frias`);
console.log(`ATA4 ${penduradas.length} luminárias penduradas · ${acesas} luzes de galpão acesas`);
console.log(`ATA5 LOS média ${losMedia.toFixed(2)} m / teto ${TETO_LOS.toFixed(2)} m em ${nosLoja.length} nós × ${RAIOS} raios`);
console.log(`ATA6 ${nomesSecao.size} seções nomeadas: ${[...nomesSecao].join(', ') || '—'}`);
console.log(`ATA7 ${caixasOk.length} caixas alcançáveis de ${caixas.length} marcadas`);
console.log(`ATA8 ${superficies.length} superfícies grandes texturadas · tipos ${[...porTipo.keys()].join(', ') || '—'} · 0 textura compartilhada`);
if (falhas.length) {
  falhas.forEach((f) => console.error(`✗ ${f}`));
  process.exit(1);
}
console.log('ATACADAO ✓ armazém de corredores de rack + chão de loja: fileiras, cover, parede fria, luz de galpão, LOS curta, seções nomeadas, frente de caixa alcançável e superfície grande sem cinza');
