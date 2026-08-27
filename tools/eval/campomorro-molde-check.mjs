/* campomorro-molde-check.mjs — CASARIO DE MOLDE E ESCALA DE PRÉDIO NO CAMPO DO MORRO.
   ═══════════════════════════════════════════════════════════════════════════════════
   DEFEITO DE ORIGEM (dono, verbatim): "os mapas de favela so o lajes tem cordao de
   roupas do model, os outros nao e tudo generico low poly" e "tem que ver a escala dos
   predios sempre". O campomorro era as duas coisas ao mesmo tempo: as 11 casas eram
   `addBox` + fachada pintada (zero molde), e o volume nascia com 3,6 m de pé-direito
   num pavimento só — casa de gigante, que é o erro de escala reclamado.

   Esta régua é a irmã da GL8 do gelo (moldes Mint registrados) somada à cláusula de
   escala que o gelo não precisava ter, porque lá não há casa habitada.

   ONDE MEDE: no mundo construído pelo harness, não no fonte.

     CM-M1 MOLDES  — ≥6 instâncias Mint registradas. Conta todo objeto com
        `userData.molde`, e só vale a instância que tem AS TRÊS pernas: o id em
        CAMPOMORRO_PROPS (sem o slot o preload não baixa o GLB e o procedural low poly
        volta), o GLB em disco, e o grupo marcado no build. Mesmo contrato da GL8.

     CM-M2 ESCALA  — pé-direito por pavimento entre 2,60 e 3,20 m e largura de fachada
        ≥ 4,00 m em TODA casa GLB instanciada. O registro `world.casario` é o valor de
        USO (o mapa declara pavimentos/pé-direito/fachada), mas declaração sozinha é
        auto-realizável: cada entrada é CONFERIDA contra o colisor real daquela casa no
        mundo (centro, altura e footprint). Registro sem colisor correspondente, ou
        colisor que não bate com o declarado, é FALHA — "não sei medir" custa o mesmo
        que estar errado.

   REFERÊNCIA DA FAIXA: pé-direito residencial brasileiro tem mínimo legal de 2,50 m
   (código de obras) e a laje-a-laje de sobrado de alvenaria fica em 2,6-3,2 m. A faixa
   da frente do córrego (escala-favela-check, BUG-55) é 2,4-2,8 m para BARRACO de um
   pavimento; aqui o casario é alvenaria de morro consolidado, um degrau acima — por
   isso 2,60-3,20 e não 2,40-2,80. Largura: fachada de casa de morro raramente desce de
   4 m (lote padrão de 5 m menos recuo lateral).

   REPRODUZ:  node tools/eval/campomorro-molde-check.mjs
   MUTAÇÕES (cada uma morde a sua cláusula, e só a sua):
     --mutante=lista-zerada   zera CAMPOMORRO_PROPS                     → CM-M1
     --mutar=ana              reconstrói o casario em escala 0,6        → CM-M2
   (`--mutar=` e `--mutante=` são aceitos nos dois casos.) Mutante desconhecido sai 2. */
import { existsSync } from 'node:fs';
import { THREE, MAPS, initTextures } from './harness.mjs';
import { CAMPOMORRO_PROPS } from '../../public/js/map_campomorro.js';

const arg = process.argv.find((a) => a.startsWith('--mutante=') || a.startsWith('--mutar='));
const MUTANTE = arg ? arg.split('=')[1] : null;
const conhecidos = new Set(['lista-zerada', 'ana']);
if (MUTANTE && !conhecidos.has(MUTANTE)) {
  console.error(`mutante desconhecido: ${MUTANTE} — conhecidos: ${[...conhecidos].join(', ')}`);
  process.exit(2);
}

const MIN_INSTANCIAS_MINT = 6;
const PE_MIN = 2.60, PE_MAX = 3.20;   // pé-direito por pavimento (m)
const FACHADA_MIN = 4.00;             // largura de fachada (m)
const ESCALA_ANA = 0.6;

const clausulas = [];
const put = (id, ok, msg) => { clausulas.push({ id, ok, msg }); console.log(`  ${id} ${ok ? 'PASSA' : 'FALHA'} — ${msg}`); };

if (!MAPS.campomorro || typeof MAPS.campomorro.build !== 'function') {
  put('CM-M1', false, 'campomorro ausente do registro (maps.js)');
  console.log('\nCAMPOMORRO-MOLDE VERMELHA · mapa ausente');
  process.exit(1);
}
const T = await initTextures();
const scene = new THREE.Scene();
let W = null, erroBuild = null;
try { W = MAPS.campomorro.build(scene, T); } catch (e) { erroBuild = String(e?.message || e); }
if (erroBuild || !W?.root || !Array.isArray(W?.colliders)) {
  put('CM-M1', false, `não sei medir: build do campomorro ${erroBuild ? `lançou "${erroBuild}"` : 'devolveu mundo sem root/colliders'}`);
  console.log('\nCAMPOMORRO-MOLDE VERMELHA · mundo não medível');
  process.exit(1);
}

/* ---- mutantes: aplicam DE VERDADE ou a régua morre aqui ---- */
let mutanteAplicou = null;
if (MUTANTE === 'lista-zerada') {
  mutanteAplicou = CAMPOMORRO_PROPS.length > 0;
  CAMPOMORRO_PROPS.length = 0;
} else if (MUTANTE === 'ana') {
  /* Escala 0,6 no casario INTEIRO — registro E colisor, como se o mapa tivesse sido
     construído pequeno. O declarado continua batendo com o construído; o que quebra é
     a faixa ABSOLUTA de pé-direito/fachada, que é o que a CM-M2 existe para prender. */
  const casas = W.casario || [];
  mutanteAplicou = casas.length > 0;
  for (const c of casas) {
    const alvo = acharColisor(c);
    if (alvo) {
      alvo.maxY = alvo.minY + (alvo.maxY - alvo.minY) * ESCALA_ANA;
      const cx = (alvo.minX + alvo.maxX) / 2, cz = (alvo.minZ + alvo.maxZ) / 2;
      const hw = (alvo.maxX - alvo.minX) / 2 * ESCALA_ANA, hd = (alvo.maxZ - alvo.minZ) / 2 * ESCALA_ANA;
      alvo.minX = cx - hw; alvo.maxX = cx + hw; alvo.minZ = cz - hd; alvo.maxZ = cz + hd;
    }
    c.peDireito *= ESCALA_ANA; c.alturaTotal *= ESCALA_ANA;
    c.larg *= ESCALA_ANA; c.prof *= ESCALA_ANA;
  }
}
if (MUTANTE && !mutanteAplicou) {
  console.error(`MUTANTE NÃO APLICOU: ${MUTANTE} — a régua não mede o que o mutante quebra`);
  process.exit(1);
}

/* colisor da casa: o mais próximo do centro declarado que também bate em altura.
   Declarado aqui é `c`; o colisor é o que o corpo do jogador realmente encontra. */
function acharColisor(c) {
  let melhor = null, dist = Infinity;
  for (const k of W.colliders) {
    const cx = (k.minX + k.maxX) / 2, cz = (k.minZ + k.maxZ) / 2;
    const d = Math.hypot(cx - c.x, cz - c.z);
    if (d > 0.4) continue;
    if (Math.abs((k.maxY - k.minY) - c.alturaTotal) > 0.35) continue;
    if (d < dist) { dist = d; melhor = k; }
  }
  return melhor;
}

/* ---- CM-M1: moldes Mint registrados ---- */
{
  const falta = [];
  let instancias = 0;
  const porMolde = new Map();
  W.root.traverse((o) => {
    const molde = o.userData?.molde;
    if (!molde) return;
    if (!CAMPOMORRO_PROPS.includes(molde)) {
      falta.push(`${o.name || molde}: molde "${molde}" fora de CAMPOMORRO_PROPS — sem o slot o preload não baixa o GLB e o low poly genérico volta`);
      return;
    }
    if (!existsSync(`public/models/props/${molde}.glb`)) { falta.push(`public/models/props/${molde}.glb ausente no disco`); return; }
    instancias++;
    porMolde.set(molde, (porMolde.get(molde) || 0) + 1);
  });
  if (instancias < MIN_INSTANCIAS_MINT)
    falta.push(`${instancias}/${MIN_INSTANCIAS_MINT} instâncias Mint registradas`);
  const resumo = [...porMolde].map(([m, n]) => `${m}×${n}`).join(' · ');
  put('CM-M1', !falta.length,
    falta.length ? falta.join(' · ')
      : `${instancias} instâncias Mint registradas (${resumo}) — grupo + userData.molde + CAMPOMORRO_PROPS + GLB em disco`);
}

/* ---- CM-M2: escala de prédio ---- */
{
  const casas = W.casario;
  const falta = [];
  if (!Array.isArray(casas) || !casas.length) {
    falta.push('não sei medir: o mapa não devolveu `casario` — sem registro de USO não há escala a conferir');
  } else {
    for (const c of casas) {
      const nome = `casa ${c.i} (${c.molde} em ${c.x},${c.z})`;
      if (!(c.pav >= 1)) { falta.push(`${nome}: pavimentos inválidos (${c.pav})`); continue; }
      if (c.peDireito < PE_MIN || c.peDireito > PE_MAX)
        falta.push(`${nome}: pé-direito ${c.peDireito.toFixed(2)} m fora de ${PE_MIN.toFixed(2)}–${PE_MAX.toFixed(2)}`);
      if (c.larg < FACHADA_MIN)
        falta.push(`${nome}: fachada ${c.larg.toFixed(2)} m < ${FACHADA_MIN.toFixed(2)} m`);
      /* o declarado tem que existir no mundo: colisor no lugar, na altura e no footprint */
      const k = acharColisor(c);
      if (!k) { falta.push(`${nome}: sem colisor correspondente no mundo — registro que não vira geometria não é escala, é intenção`); continue; }
      const kh = k.maxY - k.minY;
      if (Math.abs(kh - c.pav * c.peDireito) > 0.02)
        falta.push(`${nome}: colisor tem ${kh.toFixed(2)} m mas o registro diz ${(c.pav * c.peDireito).toFixed(2)} m`);
      const kw = k.maxX - k.minX, kd = k.maxZ - k.minZ;
      const viraEixo = Math.abs(Math.sin(c.ry)) > 0.5;
      const espW = viraEixo ? c.prof : c.larg, espD = viraEixo ? c.larg : c.prof;
      if (Math.abs(kw - espW) > 0.02 || Math.abs(kd - espD) > 0.02)
        falta.push(`${nome}: footprint do colisor ${kw.toFixed(2)}×${kd.toFixed(2)} m contra ${espW.toFixed(2)}×${espD.toFixed(2)} declarado`);
    }
  }
  const pes = (casas || []).map((c) => c.peDireito);
  const largs = (casas || []).map((c) => c.larg);
  const faixa = (v) => v.length ? `${Math.min(...v).toFixed(2)}–${Math.max(...v).toFixed(2)}` : '—';
  const pav2 = (casas || []).filter((c) => c.pav === 2).length;
  put('CM-M2', !falta.length,
    falta.length ? falta.join(' · ')
      : `${casas.length} casas · pé-direito ${faixa(pes)} m (teto ${PE_MIN}–${PE_MAX}) · fachada ${faixa(largs)} m (piso ${FACHADA_MIN}) · ${pav2} de 2 pavimentos, ${casas.length - pav2} de 1`);
}

/* ---- placar e veredito dos mutantes ---- */
const vermelhas = clausulas.filter((c) => !c.ok);
const ALVO = { 'lista-zerada': ['CM-M1'], ana: ['CM-M2'] };
if (MUTANTE) {
  const esperado = ALVO[MUTANTE];
  const acertou = esperado.every((id) => vermelhas.some((c) => c.id === id));
  const colaterais = vermelhas.filter((c) => !esperado.includes(c.id)).map((c) => c.id);
  if (!acertou) { console.error(`\nMUTANTE SOBREVIVEU: ${MUTANTE} não acendeu ${esperado.join('+')}`); process.exit(1); }
  if (colaterais.length) { console.error(`\nMUTANTE ${MUTANTE} acendeu cláusulas colaterais: ${colaterais.join(', ')}`); process.exit(1); }
  console.log(`\nMUTANTE MORDIDO: ${MUTANTE} -> ${esperado.join('+')}`);
  process.exit(0);
}
console.log(`\nCAMPOMORRO-MOLDE ${vermelhas.length ? `VERMELHA · ${vermelhas.map((c) => c.id).join(', ')}` : 'ok · CM-M1, CM-M2'}`);
process.exit(vermelhas.length ? 1 : 0);
