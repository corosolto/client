/* ============================================================================
   sitio-check.mjs — A RÉGUA DO RESGATE DO SÍTIO DA TRETA (Atibaia).
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O mapa `fy_sitio` foi o PR #4 (fechado) e voltou pelo pedido do dono: "tinha
   um mapa do sitio de atibaia, acho que esse mapa seria legal resgatar". O
   resgate não é copiar o arquivo antigo: ele tem que chegar no padrão map2
   (registro com slots, CTF com rotas, arma no chão, fauna viva) — e cada uma
   dessas promessas já morreu calada uma vez nesta base. Esta régua existe para
   que "resgate" seja medida, não intenção.

   O QUE ELA MEDE (node puro, o mapa real via harness)
     S1  REGISTRO + ALIAS: `sitio` no MAPS com nome exato, slots `props` e
         `ambience` preenchidos, e `fy_sitio` resolvendo para `sitio` pelo
         ALIAS_MAPA — o id antigo do PR #4 viaja em link (`?map=fy_sitio`) e
         sem alias abriria a Praça calado (mesma falha do mapa-id-check).
     S2  LAGO VIVO: o mapa declara `world.lake` (bounds + cota da lâmina) e os
         patos existem, NASCEM na água e NADAM — posição muda >= PASSO_VIVO sob
         `ambience.update(dt)` e continua dentro do lago. Pato parado é o
         defeito do jacaré estático; pato fora d'água é decoração perdida.
     S3  FAUNA >= 3 ESPÉCIES: pato (lago), galinha_angola (horta) e cavalinho
         (pomar) — o kit Mint r3 `sitio_fauna_r3` inteiro integrado, mais a
         base AR2 (rato+pombo) que o registro inteiro já paga.
     S4  PICKUPS >= MIN_PICKUPS com id que existe em WEAPONS: o dono VETA
         reduzir arma no chão ("é a única forma do usuário escolher armas").
     S5  PRÉVIA em disco (`public/img/map-previews/sitio.jpg`): sem ela o menu
         fica com cartaz quebrado (404 sem erro de build) — cláusula M3 do
         mapa-id-check, cobrada aqui para o id novo nascer completo.

   PROCEDÊNCIA DOS TETOS (Lei 2 — nenhum número novo sem fonte)
     MIN_PICKUPS = 20    tools/eval/pickup-arma-check.mjs `MIN_PICKUPS` — a
                         anti-vacuidade do portão de armas; o fy_sitio do PR #4
                         tinha 6, abaixo do piso atual do registro.
     MIN_PATOS = 2       um pato único pode ser estático acidental; o par obriga
                         trajetórias independentes (kit sitio_fauna_r3 tem 3).
     MIN_ESPECIES = 3    a tarefa do resgate nomeia as três (pato/galinha de
                         angola/cavalinho); duas é kit incompleto.
     PASSO_VIVO = 0.30   o DEGRAU do corpo do map-check (constante de 0,30 m):
                         deslocamento que a régua da geometria já considera
                         perceptível. Em 3,6 s de update é arrasto de tartaruga.
     Y_TOL = 0.25        um quarto de metro sobre a lâmina: acomoda o bob de
                         nado sem deixar o pato virar barco a vela.

   MUTAÇÕES QUE FAZEM ELA FICAR VERMELHA
     --mutar=sem-map       apaga o registro em memória          -> S1
     --mutar=lago-morto    congela os patos após cada update    -> S2
     --mutar=fauna-unica   re-tipa 2 das 3 espécies p/ base     -> S3

   USO
     node tools/eval/sitio-check.mjs
     node tools/eval/sitio-check.mjs --mutar=lago-morto
   ============================================================================ */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { THREE, MAPS, initTextures } from './harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(HERE, '../..');
const MUTAR = (process.argv.find((a) => a.startsWith('--mutar=')) || '').split('=')[1] || '';
const CONHECIDOS = new Set(['sem-map', 'lago-morto', 'fauna-unica']);
if (MUTAR && !CONHECIDOS.has(MUTAR)) throw new Error(`mutante desconhecido: ${MUTAR}`);

const NOME_ESPERADO = 'Sítio da Treta (Atibaia)';
const MIN_PICKUPS = 20;
const MIN_PATOS = 2;
const MIN_ESPECIES_SITIO = ['pato', 'galinha_angola', 'cavalinho'];
const PASSO_VIVO = 0.30;
const Y_TOL = 0.25;
const DT = 1.2;
const CICLOS = 3;

const falhas = [];
const reprova = (clauso, motivo) => { falhas.push(`${clauso}: ${motivo}`); };

/* ---------------- S1 — registro + alias ---------------- */
if (MUTAR === 'sem-map') delete MAPS.sitio;
const sit = MAPS.sitio;
console.log(`SITIO-CHECK${MUTAR ? `  [mutante: ${MUTAR}]` : ''}\n`);
{
  let ok = !!sit;
  if (!ok) reprova('S1', 'id `sitio` ausente do registro (maps.js MAPS)');
  else {
    if (sit.name !== NOME_ESPERADO) reprova('S1', `name=${JSON.stringify(sit.name)} != ${JSON.stringify(NOME_ESPERADO)}`);
    if (typeof sit.build !== 'function') reprova('S1', 'slot build não é função');
    if (!Array.isArray(sit.props) || sit.props.length === 0) reprova('S1', 'slot props ausente/vazio — preload de GLB quebrado');
    if (!Array.isArray(sit.ambience) || sit.ambience.length === 0) reprova('S1', 'slot ambience ausente/vazio — fauna cai no fallback (BUG-57)');
  }
  const { resolveMapId } = await import(pathToFileURL(path.join(RAIZ, 'public/js/maps.js')).href);
  const resolvido = resolveMapId('fy_sitio');
  if (resolvido !== 'sitio') reprova('S1', `alias fy_sitio -> ${resolvido} (esperado sitio) — link do PR #4 abriria ${resolvido || 'DEFAULT'} calado`);
  const aliasOk = resolvido === 'sitio';
  console.log(`  S1 registro+alias      ${ok && sit?.name === NOME_ESPERADO && aliasOk ? 'ok' : 'FALHA'}`);
}

/* ---------------- S2/S3/S4 — o mapa de verdade ---------------- */
let W = null;
if (sit) {
  const scene = new THREE.Scene();
  const T = await initTextures();
  try {
    W = sit.build(scene, T);
  } catch (e) { reprova('S2', `build lançou: ${e?.message || e}`); }
}

if (W) {
  const animals = W.ambience?.animals || [];

  /* S2 — lago vivo */
  {
    const lake = W.lake;
    if (!lake || [lake.minX, lake.maxX, lake.minZ, lake.maxZ, lake.aguaY].some((v) => typeof v !== 'number'))
      reprova('S2', 'world.lake ausente/malformado (bounds + aguaY)');
    const patos = animals.filter((a) => a.type === 'pato' && a.root);
    if (patos.length < MIN_PATOS) reprova('S2', `${patos.length} pato(s) (< ${MIN_PATOS}) no ambience.animals`);
    if (typeof W.ambience?.update !== 'function') reprova('S2', 'ambience.update não é função — nada se move');
    if (lake && patos.length >= MIN_PATOS && typeof W.ambience?.update === 'function') {
      const dentro = (r) => r.position.x >= lake.minX && r.position.x <= lake.maxX && r.position.z >= lake.minZ && r.position.z <= lake.maxZ;
      const naAgua = (r) => Math.abs(r.position.y - lake.aguaY) <= Y_TOL;
      for (const p of patos) {
        if (!dentro(p.root)) reprova('S2', `pato nasceu fora do lago (${p.root.position.x.toFixed(1)},${p.root.position.z.toFixed(1)})`);
        if (!naAgua(p.root)) reprova('S2', `pato nasceu fora da lâmina (y=${p.root.position.y.toFixed(2)} vs aguaY=${lake.aguaY})`);
      }
      const antes = patos.map((p) => p.root.position.clone());
      if (MUTAR === 'lago-morto') {
        const upd = W.ambience.update.bind(W.ambience);
        W.ambience.update = (dt, pl) => { upd(dt, pl); patos.forEach((p, i) => p.root.position.copy(antes[i])); };
      }
      for (let i = 0; i < CICLOS; i++) W.ambience.update(DT, null);
      patos.forEach((p, i) => {
        const d = p.root.position.distanceTo(antes[i]);
        if (d < PASSO_VIVO) reprova('S2', `pato ${i} NADOU ${d.toFixed(3)} m em ${(DT * CICLOS).toFixed(1)} s (< ${PASSO_VIVO}) — estátua no lago`);
        if (lake && !dentro(p.root)) reprova('S2', `pato ${i} saiu do lago nadando (${p.root.position.x.toFixed(1)},${p.root.position.z.toFixed(1)})`);
      });
    }
    const andou = falhas.length === 0 || !falhas.some((f) => f.startsWith('S2'));
    console.log(`  S2 lago vivo           ${andou ? 'ok' : 'FALHA'}`);
  }

  /* S3 — fauna >= 3 espécies + base AR2 */
  {
    if (MUTAR === 'fauna-unica') {
      const troca = { galinha_angola: 'chicken', cavalinho: 'cow' };
      for (const a of animals) if (troca[a.type]) a.type = troca[a.type];
    }
    const por = {};
    for (const a of animals) por[a.type] = (por[a.type] || 0) + 1;
    for (const esp of MIN_ESPECIES_SITIO)
      if (!(por[esp] > 0)) reprova('S3', `espécie ${esp} ausente (kit sitio_fauna_r3 incompleto)`);
    if (!(por.rat > 0) || !(por.pigeon > 0)) reprova('S3', `base AR2 sem rato(${por.rat || 0})/pombo(${por.pigeon || 0}) — ambience-registry reprova`);
    const ok3 = MIN_ESPECIES_SITIO.every((e) => por[e] > 0) && por.rat > 0 && por.pigeon > 0;
    console.log(`  S3 fauna >=3 espécies  ${ok3 ? 'ok' : 'FALHA'}   [${Object.entries(por).map(([k, v]) => `${k}:${v}`).join(' ')}]`);
  }

  /* S4 — pickups */
  {
    const { WEAPONS } = await import(pathToFileURL(path.join(RAIZ, 'public/js/data/weapons.js')).href);
    const pk = W.pickups || [];
    if (pk.length < MIN_PICKUPS) reprova('S4', `${pk.length} pickups (< ${MIN_PICKUPS} — piso anti-vacuidade do pickup-arma-check)`);
    const ruins = pk.filter((p) => !WEAPONS[p.weapon || p.kind]);
    if (ruins.length) reprova('S4', `${ruins.length} pickup(s) com arma fora de WEAPONS: ${[...new Set(ruins.map((p) => p.weapon || p.kind))].join(',')}`);
    const ok4 = pk.length >= MIN_PICKUPS && !ruins.length;
    console.log(`  S4 pickups >=${MIN_PICKUPS}       ${ok4 ? 'ok' : 'FALHA'}   [${pk.length} armas]`);
  }
} else {
  console.log('  S2 lago vivo           FALHA (sem mapa para buildar)');
  console.log('  S3 fauna >=3 espécies  FALHA (sem mapa para buildar)');
  console.log('  S4 pickups             FALHA (sem mapa para buildar)');
}

/* ---------------- S5 — prévia ---------------- */
{
  const p = path.join(RAIZ, 'public/img/map-previews/sitio.jpg');
  const ok5 = existsSync(p);
  if (!ok5) reprova('S5', `prévia ausente: ${p} — cartaz quebrado no menu`);
  console.log(`  S5 prévia em disco      ${ok5 ? 'ok' : 'FALHA'}`);
}

/* ---------------- placar ---------------- */
const ESPERADO = { 'sem-map': 'S1', 'lago-morto': 'S2', 'fauna-unica': 'S3' };
if (MUTAR) {
  const cla = ESPERADO[MUTAR];
  const mordeu = falhas.some((f) => f.startsWith(cla));
  if (!mordeu) { console.error(`\nMUTANTE SOBREVIVEU: ${MUTAR} não acendeu ${cla}`); process.exit(1); }
  console.error(`\nMUTANTE MORDIDO: ${MUTAR} -> ${cla}`);
  process.exit(0);
}
for (const f of falhas) console.error(`  ✗ ${f}`);
console.log(falhas.length
  ? `\n✗ SITIO ${falhas.length} cláusula(s) reprovada(s)`
  : '\n✓ SITIO registro+alias, lago vivo, fauna 3 espécies, pickups e prévia');
process.exit(falhas.length ? 1 : 0);
