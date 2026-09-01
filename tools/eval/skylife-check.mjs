/* skylife-check.mjs — A VIDA DE CÉU EXISTE, SE MEXE E NÃO VIRA PAREDE?
   ---------------------------------------------------------------------------
   Por que esta régua existe, na ordem em que a base aprendeu:

   1. `pipa_papel`, `helicoptero_pm` e `aviao_faixa` foram gerados no Mint, divididos
      em nós animáveis, otimizados, revisados com figura — e ficaram um ciclo inteiro
      no disco SEM NENHUM call-site em `public/js`. Ninguém percebeu porque nenhuma
      régua olhava. CEU1 é essa régua: conta o que cada mapa pendurou no céu.

   2. O `pigeon_flight.glb` ERA usado, e era pior que não usar: ave de asas abertas
      PARADA a 7,4 m no céu do córrego (`{ mode: 'flight', pos: [-8, 7.4, -5] }`,
      removido na v2.1). O defeito não era a ausência de asset, era ASSET QUE NÃO SE
      MEXE. CEU2/CEU3/CEU4 medem MOVIMENTO, não presença — presença sozinha foi
      exatamente o que deixou o espantalho passar.

   3. Céu é a única categoria de cenário que fica no meio da linha de tiro sem que
      ninguém teste. CEU6 é o portão que impede a regressão cara: se um dia alguém
      empurrar pipa para `colliders`/`occluders`, a bala passa a bater no papel.

   MUTANTES (a régua tem que reprovar cada um; quem não morde não é régua):
     --mutante=pipa-parada      congela a deriva da pipa            -> CEU2 FALHA
     --mutante=rotor-travado    zera a rotação do rotor             -> CEU3 FALHA
     --mutante=asa-travada      zera o bater de asa da arara        -> CEU4 FALHA
     --mutante=faixa-em-branco  apaga o texto da faixa              -> CEU5 FALHA
     --mutante=pipa-colide      joga uma pipa nos colliders         -> CEU6 FALHA
     --mutante=pipa-no-chao     baixa as pipas para a altura da laje-> CEU7 FALHA

   Uso: node tools/eval/skylife-check.mjs [--mutante=...]

   ATENÇÃO ao ler os números: no arnês node NENHUM GLB baixa, então tudo cai no proxy
   procedural do skylife.js. Isso é DE PROPÓSITO — os proxies carregam os mesmos nomes
   de nó (`corpo`, `rabiola`, `rotor_main`, `asa-esquerda`), então a régua mede a
   MECÂNICA nos dois caminhos. O que ela NÃO prova é que o GLB certo apareceu na tela;
   isso é figura olhada no tamanho servido, não sonda de node. */
import { THREE, MAPS, initTextures } from './harness.mjs';

const arg = (nome) => process.argv.includes(`--mutante=${nome}`);
const mPipaParada = arg('pipa-parada');
const mRotorTravado = arg('rotor-travado');
const mAsaTravada = arg('asa-travada');
const mFaixaBranca = arg('faixa-em-branco');
const mPipaColide = arg('pipa-colide');
const mPipaNoChao = arg('pipa-no-chao');

const T = await initTextures();

/* Os mapas vêm do REGISTRO, não de uma lista literal. A primeira versão cravava os três
   ids das lajes, do córrego e da mansão, e morria em CEU0 assim que a régua rodava numa
   fatia que não tem os três — foi exatamente o que aconteceu ao levar o córrego sozinho
   para a main. (Os ids não aparecem escritos aqui de propósito: o M1 do mapa-id-check
   varre TODO arquivo do checkout atrás de id no estilo CS, comentário de régua incluído.) Régua que só funciona no branch onde nasceu não serve para mergear mapa
   por mapa, que é como este repo pretende chegar na main. Mapa de céu novo entra na
   cobrança sozinho; mapa que não tem céu é IMPRESSO como ausente, nunca calado. */
const mundos = {};
const semCeu = [];
for (const [id, registro] of Object.entries(MAPS)) {
  const scene = new THREE.Scene();
  let world;
  try { world = registro.build(scene, T); } catch (erro) {
    console.error(`CEU0 FALHA — ${id} não constrói: ${erro && erro.message}`);
    process.exit(1);
  }
  if (!world.skyLife) { semCeu.push(id); continue; }
  await world.skyLife.ready;   // as araras entram assíncronas; sem isto CEU4 mediria vazio
  mundos[id] = world;
}
if (!Object.keys(mundos).length) {
  console.error('CEU0 FALHA — nenhum mapa do registro devolveu skyLife');
  process.exit(1);
}

/* Cada sonda mede UM tipo de bicho de céu, no primeiro mapa da fatia que o tenha —
   não num mapa nomeado. `mundoCom('pipa')` acha quem tem pipa; se ninguém tem, a sonda
   se declara AUSENTE em vez de reprovar. Ausente ≠ quebrado: numa fatia só do córrego
   não existe avião de faixa, e cobrar isso ali seria régua mentindo sobre o escopo. */
const mundoCom = (tipo) => Object.values(mundos).find((w) => w.skyLife.items.some((i) => i.tipo === tipo)) || null;
const itensDe = (world, tipo) => (world ? world.skyLife.items.filter((i) => i.tipo === tipo) : []);
const AUSENTE = 'AUSENTE';
const veredito = (world, ok) => (world ? (ok ? 'PASSA' : 'FALHA') : AUSENTE);
const contaOk = (world, ok) => !world || ok;   // sonda ausente não reprova o portão

/* ---------- mutantes: aplicados DEPOIS de construir, sobre o objeto vivo ---------- */
/* pipa-parada precisa RE-ASSENTAR a pipa na origem depois de zerar a amplitude. Sem
   isso o mutante passava verde por um motivo bobo e perigoso: a sonda comparava a
   posição do frame de assentamento (ainda com amplitude) com a posição já congelada, e
   media esse degrau como se fosse deriva. Mutante que não reprova por acidente ensina
   a confiar numa régua cega — é o modo de falhar mais caro que existe aqui. */
if (mPipaParada) for (const world of Object.values(mundos))
  for (const item of world.skyLife.items) if (item.tipo === 'pipa') {
    item.raio = 0;
    item.root.position.copy(item.origem);
  }
if (mRotorTravado) for (const world of Object.values(mundos))
  for (const item of world.skyLife.items) if (item.tipo === 'helicoptero') { item.rotorMain = null; item.rotorTail = null; }
if (mAsaTravada) for (const world of Object.values(mundos))
  for (const item of world.skyLife.items) if (item.tipo === 'arara') { item.asaE = null; item.asaD = null; }
if (mFaixaBranca) for (const world of Object.values(mundos))
  for (const item of world.skyLife.items) if (item.faixa) item.faixa.material.map.userData.bannerText = '';
if (mPipaColide) {
  const w = mundoCom('pipa');
  if (w) w.colliders.push(itensDe(w, 'pipa')[0].root);
}
if (mPipaNoChao) { const w = mundoCom('pipa'); for (const item of itensDe(w, 'pipa')) { item.origem.y = 4.6; item.root.position.y = 4.6; } }

/* =========================== CEU1 — presença =========================== */
/* Os mínimos NÃO são o número que os mapas têm hoje: são o piso abaixo do qual o céu
   deixa de ler. Alguém pode reequilibrar 12 pipas para 9 sem me consultar; se cair
   para 3, o fy_lajes deixou de ser o mapa das pipas e isso é decisão, não descuido. */
const MINIMOS = {
  fy_lajes: { pipas: 8, helicopteros: 1, araras: 1 },
  fy_corrego: { pipas: 5, helicopteros: 1, araras: 2 },
  fy_mansao: { avioes: 1 },
};
const censo = {};
let ceu1Ok = true;
const faltas = [];
for (const [id, minimo] of Object.entries(MINIMOS)) {
  if (!mundos[id]) continue;   // mapa fora desta fatia — cobrado onde ele existir
  const stats = mundos[id].skyLife.stats();
  censo[id] = stats;
  for (const [campo, min] of Object.entries(minimo))
    if ((stats[campo] || 0) < min) { ceu1Ok = false; faltas.push(`${id}.${campo}=${stats[campo] || 0}<${min}`); }
}

/* ======================= CEU2 — a pipa se mexe (e a rabiola atrasa) ======================= */
/* Limiar 0,15 m de deriva em 1,2 s: abaixo disso o olho não separa de "pipa colada".
   A rabiola tem curso PRÓPRIO — se ela girasse junto com a vela seria um galho, e o
   defeito passaria pela sonda de deriva sem ser visto. */
const wPipa = mundoCom('pipa');
const pipas = itensDe(wPipa, 'pipa');
const posA = pipas.map((item) => item.root.position.clone());
const rabA = pipas.map((item) => item.rabiola?.rotation.z ?? 0);
const velaA = pipas.map((item) => item.root.rotation.z);
wPipa?.update(1.2, 1.2);
const derivaPipa = Math.max(...pipas.map((item, i) => item.root.position.distanceTo(posA[i])));
const cursoRabiola = Math.max(...pipas.map((item, i) => Math.abs((item.rabiola?.rotation.z ?? 0) - rabA[i])));
const cursoVela = Math.max(...pipas.map((item, i) => Math.abs(item.root.rotation.z - velaA[i])));
const rabiolaIndependente = Math.max(...pipas.map((item, i) =>
  Math.abs(((item.rabiola?.rotation.z ?? 0) - rabA[i]) - (item.root.rotation.z - velaA[i]))));
const ceu2Ok = !wPipa || derivaPipa >= 0.15 && cursoRabiola >= 0.05 && rabiolaIndependente >= 0.02;

/* ============================ CEU3 — o rotor gira ============================ */
/* 26 rad/s no código; em 0,5 s são ~13 rad. Exijo >= 4 rad para dar folga a quem
   quiser deixar o rotor mais lento sem quebrar a régua — o que não pode é ZERO. */
const wHeli = mundoCom('helicoptero');
const heli = itensDe(wHeli, 'helicoptero')[0] || null;
const rotorA = heli?.rotorMain?.rotation.y ?? 0;
const heliPosA = heli ? heli.root.position.clone() : null;
wHeli?.update(0.5, 2.0);
const giroRotor = heli ? Math.abs((heli.rotorMain?.rotation.y ?? 0) - rotorA) : 0;
const orbitaHeli = heli ? heli.root.position.distanceTo(heliPosA) : 0;
const ceu3Ok = !wHeli || (giroRotor >= 4 && orbitaHeli >= 0.5);

/* ===================== CEU4 — a arara BATE A ASA (não plana) ===================== */
/* LIMIAR COMPARTILHADO: 0,25 rad é exatamente o do AVE1 do `parque-wheel-check.mjs`,
   que mede a MESMA coisa (curso de asa procedural) no pássaro do parque. Duas réguas
   medindo a mesma grandeza com limiares diferentes é como duas balanças na cozinha.
   E as duas asas têm que se mexer em SENTIDOS OPOSTOS: com o mesmo sinal a arara
   rolaria de lado em vez de bater — foi o erro que o split de nós tornou possível. */
const wArara = mundoCom('arara');
const araras = itensDe(wArara, 'arara');
const asaEA = araras.map((item) => item.asaE?.rotation.x ?? 0);
const asaDA = araras.map((item) => item.asaD?.rotation.x ?? 0);
wArara?.update(0.26, 2.26);
const cursoAsa = araras.length
  ? Math.max(...araras.map((item, i) => Math.abs((item.asaE?.rotation.x ?? 0) - asaEA[i]))) : 0;
const espelhado = araras.length && araras.every((item, i) => {
  const dE = (item.asaE?.rotation.x ?? 0) - asaEA[i];
  const dD = (item.asaD?.rotation.x ?? 0) - asaDA[i];
  return Math.abs(dE) < 1e-9 ? false : dE * dD < 0;
});
const ceu4Ok = !wArara || (cursoAsa >= 0.25 && espelhado);

/* ================== CEU5 — a faixa do avião tem texto e o avião cruza ================== */
const wAviao = mundoCom('aviao');
const aviao = itensDe(wAviao, 'aviao')[0] || null;
const aviaoPosA = aviao ? aviao.root.position.clone() : null;
wAviao?.update(1, 1);
const avancoAviao = aviao ? aviao.root.position.distanceTo(aviaoPosA) : 0;
const textoFaixa = aviao?.faixa?.material?.map?.userData?.bannerText || '';
const ceu5Ok = !wAviao || (textoFaixa.length >= 6 && avancoAviao >= 4);

/* =============== CEU6 — NADA de céu é colisor, oclusor ou projeta sombra =============== */
/* O portão que protege o jogo, não a estética. Uma pipa em `colliders` faz a bala
   parar no papel a 18 m de altura, e ninguém vai suspeitar da pipa. */
const vazamentos = [];
for (const [id, world] of Object.entries(mundos)) {
  const doCeu = new Set();
  for (const item of world.skyLife.items) item.root.traverse((o) => doCeu.add(o));
  for (const lista of ['colliders', 'occluders'])
    for (const alvo of world[lista] || []) {
      if (doCeu.has(alvo)) { vazamentos.push(`${id}: céu em ${lista}`); continue; }
      alvo.traverse?.((o) => { if (doCeu.has(o)) vazamentos.push(`${id}: céu dentro de ${lista}`); });
    }
  for (const item of world.skyLife.items) item.root.traverse((o) => {
    if (o.isMesh && o.castShadow) vazamentos.push(`${id}: ${item.tipo} projeta sombra`);
    if (o.isMesh && !o.userData.nonCollider) vazamentos.push(`${id}: ${item.tipo} sem nonCollider`);
  });
}
const ceu6Ok = vazamentos.length === 0;

/* ============ CEU7 — a pipa não atravessa laje (régua literal do plans/22) ============ */
/* Varre um ciclo inteiro de oscilação e pega a menor altura que QUALQUER pipa alcança;
   compara com o teto mais alto do mapa. Sem varrer o ciclo a sonda mediria o frame
   inicial e uma pipa que mergulha na laje aos 3 s passaria verde. */
const TETO_LAJES = 9.9;   // topo dos postes de luz (9,8) + margem; as lajes ficam em 5,2
let menorAlturaPipa = Infinity;
for (let frame = 0; frame <= 60; frame++) {
  wPipa?.update(1 / 12, 10 + frame / 12);
  for (const item of (wPipa ? wPipa.skyLife.items : [])) {
    if (item.tipo !== 'pipa') continue;
    menorAlturaPipa = Math.min(menorAlturaPipa, new THREE.Box3().setFromObject(item.root).min.y);
  }
}
const ceu7Ok = !wPipa || menorAlturaPipa >= TETO_LAJES;


console.log(`CEU0 PASSA — ${Object.keys(mundos).length} mapa(s) com céu nesta fatia: ${Object.keys(mundos).join(', ')}${semCeu.length ? ` · sem céu: ${semCeu.join(', ')}` : ''}`);
const resumo = Object.entries(censo)
  .map(([id, s]) => `${id}(pipa ${s.pipas} heli ${s.helicopteros} aviao ${s.avioes} arara ${s.araras})`).join(' · ');
console.log(`CEU1 ${ceu1Ok ? 'PASSA' : 'FALHA'} — ${resumo}${faltas.length ? ` · faltando ${faltas.join(', ')}` : ''}`);
console.log(`CEU2 ${veredito(wPipa, ceu2Ok)} — deriva da pipa ${derivaPipa.toFixed(3)} m · curso da rabiola ${(cursoRabiola * 180 / Math.PI).toFixed(1)}° · folga vela↔rabiola ${(rabiolaIndependente * 180 / Math.PI).toFixed(1)}°${mPipaParada ? ' [mutante pipa-parada]' : ''}`);
console.log(`CEU3 ${veredito(wHeli, ceu3Ok)} — giro do rotor ${giroRotor.toFixed(2)} rad em 0,5 s · avanço na órbita ${orbitaHeli.toFixed(2)} m${mRotorTravado ? ' [mutante rotor-travado]' : ''}`);
console.log(`CEU4 ${veredito(wArara, ceu4Ok)} — curso da asa ${(cursoAsa * 180 / Math.PI).toFixed(1)}° · asas em sentidos opostos: ${espelhado ? 'sim' : 'NÃO'}${mAsaTravada ? ' [mutante asa-travada]' : ''}`);
console.log(`CEU5 ${veredito(wAviao, ceu5Ok)} — faixa "${textoFaixa}" · avanço ${avancoAviao.toFixed(2)} m/s${mFaixaBranca ? ' [mutante faixa-em-branco]' : ''}`);
console.log(`CEU6 ${ceu6Ok ? 'PASSA' : 'FALHA'} — ${vazamentos.length ? vazamentos.slice(0, 4).join(' | ') : 'nenhum item de céu em colliders/occluders/sombra'}${mPipaColide ? ' [mutante pipa-colide]' : ''}`);
console.log(`CEU7 ${veredito(wPipa, ceu7Ok)} — pipa mais baixa do ciclo ${menorAlturaPipa.toFixed(2)} m contra teto ${TETO_LAJES} m${mPipaNoChao ? ' [mutante pipa-no-chao]' : ''}`);

/* Sonda AUSENTE não reprova: numa fatia só do córrego não existe avião, e cobrar isso
   ali seria a régua mentindo sobre o escopo. Quem garante que o avião não sumiu do
   fy_mansao é a CEU1, que cobra o MÍNIMO por mapa — e essa só olha mapa presente. */
process.exit(ceu1Ok && contaOk(wPipa, ceu2Ok) && contaOk(wHeli, ceu3Ok) && contaOk(wArara, ceu4Ok)
  && contaOk(wAviao, ceu5Ok) && ceu6Ok && contaOk(wPipa, ceu7Ok) ? 0 : 1);
