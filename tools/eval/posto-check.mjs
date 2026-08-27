#!/usr/bin/env node
/* ============================================================================
   posto-check.mjs — O POSTO DA TRETA TEM MOLDE, INTERIOR E COBERTURA
   ----------------------------------------------------------------------------
   O DEFEITO QUE ELA FECHA

   Pedido do dono (26/08/2026), com estas palavras:

     "os mapas do emerson acho que da pra fazer models no mintgg e deixar mais
      realista, especialmente... posto da treta, e obras da prefeitura, e nao
      deixar tanto aberto, e sim colocar mais elementos pro mapa aumentar um
      pouco de complexidade"

   Três coisas concretas saíram daí, e as três são fáceis de DESFAZER sem que
   nenhum portão perceba:

   (a) a ilha de bomba do meio virar caixa pintada de novo — basta alguém tirar o
       `placeProp` num refactor e o mapa continua subindo, com o fallback
       procedural cobrindo o rastro;
   (b) a loja voltar a ser bloco maciço — o interior andável não tem colisor
       PRÓPRIO que o denuncie: se as gôndolas somem ou a porta fecha, o mapa
       segue verde em `eval:mapcontrato` e em `eval:mapjson`;
   (c) o pátio reabrir — mureta e jardineira são cinco linhas cada, e ninguém
       mede linha de visão. Foi exatamente o estado ANTERIOR do mapa: 41,2% dos
       pares de nós do pátio a mais de 20 m se enxergavam sem nenhum sólido de
       peito no caminho.

   ── O QUE ELA MEDE (mundo construído pelo harness, node puro) ──────────────
     POSTO1 · BOMBA CENTRAL — a ilha do meio declara o molde `bombas_combustivel`,
              o molde está em `POSTO_PROPS`, o GLB existe no disco e o fonte do
              mapa chama `placeProp` com ele. O colisor da ilha central cobre a
              pegada do molde (targetH 2,0 ⇒ 2,47 × 0,94 m) e passa de 2 m de alto.
     POSTO2 · LOJA INTERIOR — sala com teto, ≥ 4 gôndolas que COLIDEM dentro dela,
              DUAS aberturas atravessáveis na fachada leste, ≥ 6 nós de waypoint
              dentro e rota do spawn E até lá, e ≥ 2 pickups dentro da sala.
     POSTO3 · COBERTURA — grupo da cobertura com telha acima de 5 m cobrindo as
              três ilhas em XZ, telha SEM colisor (passa-se por baixo) e ≥ 6
              pilares que colidem.
     POSTO4 · LINHA DE VISÃO — na banda do olho (1,2-1,6 m), a fração de pares de
              nós do pátio distantes > 20 m que se enxergam sem nenhum sólido no
              caminho fica ≤ 33%, com ≥ 68 sólidos nessa banda. A/B medido no
              branch (`git show <base>:public/js/map_posto.js`): 41,2% -> 30,8%
              e 57 -> 71 sólidos. O teto de 33% é o medido com folga.
     POSTO5 · COVER DE PEITO — mureta e jardineira são OUTRA coisa: com 1,1 m e
              0,6 m elas nem entram na banda do olho, e é esse o ponto (cobrem
              agachado, deixam o peek em pé). Contadas à parte: ≥ 58 colisores
              com topo entre 0,5 e 1,5 m, ≥ 12 muretas, ≥ 4 jardineiras. A/B:
              38 -> 68 colisores de peito. Misturar as duas medidas numa cláusula
              só foi o primeiro erro desta régua — a mutação `patio-limpo`
              apagava as muretas e o percentual não se mexia UM DÍGITO.
     POSTO6 · SOM DO POSTO — o loop `bomba-ligada` fica na ilha central com raio
              curto e `rate` grave; o `radio-loja` fica DENTRO da sala andável e
              tem `lowpass` (é o que faz o rádio soar atravessando parede em vez
              de tocar na cara do jogador).

   ── O QUE ELA NÃO MEDE, DE PROPÓSITO ───────────────────────────────────────
   Em node o GLB não carrega (`placeProp` devolve null e o mapa cai no fallback,
   que é o contrato de prop opcional do `mapprops.js`). Então esta régua cobra o
   CONTRATO do molde — declarado, no disco, chamado no fonte, com a pegada certa
   de colisão — e não o pixel. Quem cobra o pixel é a captura de browser. Bytes e
   validade do GLB também não se repetem aqui: são do `eval:asset-integrity` e do
   `eval:gltf-validator`.

   ── AS MUTAÇÕES QUE PROVAM ─────────────────────────────────────────────────
     --mutante=bomba-caixa .... a ilha central perde o molde     -> POSTO1
     --mutante=loja-macica .... as gôndolas somem da sala        -> POSTO2
     --mutante=sem-cobertura .. a telha desaparece               -> POSTO3
     --mutante=patio-aberto ... some a ilha de ar/água da coxia  -> POSTO4
     --mutante=patio-limpo .... mureta e jardineira saem do mapa -> POSTO5
     --mutante=radio-limpo .... o rádio da loja perde o lowpass  -> POSTO6
   `--mutar=` é aceito como apelido de `--mutante=`.

   Uso: node tools/eval/posto-check.mjs [--mutante=<nome>]
   ============================================================================ */
import { existsSync, readFileSync } from 'node:fs';
import { THREE, MAPS, initTextures } from './harness.mjs';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const MUT = arg('mutante') || arg('mutar');
const MUTANTES = new Set(['bomba-caixa', 'loja-macica', 'sem-cobertura', 'patio-aberto', 'patio-limpo', 'radio-limpo']);
if (MUT && !MUTANTES.has(MUT)) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const FONTE_MAPA = new URL('../../public/js/map_posto.js', import.meta.url);
let fonte = readFileSync(FONTE_MAPA, 'utf8');
if (MUT === 'bomba-caixa') fonte = fonte.replace(/placeProp\('bombas_combustivel'/g, "placeProp('caixa_qualquer'");

const scene = new THREE.Scene();
const world = MAPS.posto_treta.build(scene, await initTextures());

/* ---------------- coleta por nome (o mapa nomeia o que a régua precisa achar) ---------------- */
const porNome = (prefixo) => { const o = []; world.root.traverse((n) => { if (n.name?.startsWith(prefixo)) o.push(n); }); return o; };
const ilhas = porNome('posto-ilha-bomba-');
const central = ilhas.find((i) => i.name === 'posto-ilha-bomba-central');
const gondolas = porNome('posto-loja-gondola-');
const muretas = porNome('posto-mureta');
const jardineiras = porNome('posto-jardineira');
const cobertura = porNome('posto-cobertura')[0];
const telha = porNome('posto-cobertura-telha')[0];
const pilares = porNome('posto-cobertura-pilar');
const teto = porNome('posto-loja-teto')[0];

/* ---------------- mutações: mexem no mundo JÁ construído, como o velho-oeste ---------------- */
if (MUT === 'bomba-caixa' && central) delete central.userData.molde;
if (MUT === 'loja-macica') gondolas.length = 0;
if (MUT === 'sem-cobertura' && telha) telha.position.y = 0.4;
/* A ilha de ar/água sozinha vale 3,9 pontos na POSTO4: ela mora na célula que
   tinha 71 linhas livres de mais de 20 m passando por dentro. */
const ehIlhaAr = (c) => Math.abs((c.minX + c.maxX) / 2 + 2.5) < 0.2 && Math.abs((c.minZ + c.maxZ) / 2) < 0.2;
if (MUT === 'patio-aberto') world.colliders = world.colliders.filter((c) => !ehIlhaAr(c));
if (MUT === 'patio-limpo') {
  const fora = new Set(muretas.map((m) => `${m.position.x.toFixed(2)},${m.position.z.toFixed(2)}`));
  world.colliders = world.colliders.filter((c) => {
    const cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
    if (fora.has(`${cx.toFixed(2)},${cz.toFixed(2)}`)) return false;
    return !jardineiras.some((j) => Math.abs(j.position.x - cx) < 2 && Math.abs(j.position.z - cz) < 2);
  });
  muretas.length = 0; jardineiras.length = 0;
}

const loops = (world.sound?.loops || []).map((l) => (MUT === 'radio-limpo' && l.tag === 'radio-loja' ? { ...l, lowpass: 0 } : l));

/* ================= POSTO1 · BOMBA CENTRAL ================= */
const MOLDE_BOMBA = 'bombas_combustivel';
const props = MAPS.posto_treta.props || [];
const glbBomba = new URL(`../../public/models/props/${MOLDE_BOMBA}.glb`, import.meta.url);
/* Pegada do molde em targetH 2,0: 2,47 × 0,94 m. O colisor declarado no mapa é
   1,3 × 0,6 de meia-medida, então tem de conter a bomba e passar de 2 m de alto. */
const colIlha = world.colliders.find((c) => Math.abs((c.minX + c.maxX) / 2 - 4) < 0.6 && Math.abs((c.minZ + c.maxZ) / 2) < 0.6 && c.maxY > 2);
const posto1 = !!central
  && central.userData.molde === MOLDE_BOMBA
  && props.includes(MOLDE_BOMBA)
  && existsSync(glbBomba)
  && fonte.includes(`placeProp('${MOLDE_BOMBA}'`)
  && !!colIlha && (colIlha.maxX - colIlha.minX) >= 2.4 && (colIlha.maxZ - colIlha.minZ) >= 0.9
  && ilhas.length >= 3;

/* ================= POSTO2 · LOJA INTERIOR ================= */
const SALA = { x0: -25, x1: -17.2, z0: -5.6, z1: 5.6 };
const dentroSala = (x, z) => x > SALA.x0 && x < SALA.x1 && z > SALA.z0 && z < SALA.z1;
const gondolasNaSala = gondolas.filter((g) => dentroSala(g.position.x, g.position.z));
const gondolasComColisor = gondolasNaSala.filter((g) => world.colliders.some((c) =>
  Math.abs((c.minX + c.maxX) / 2 - g.position.x) < 0.3 && Math.abs((c.minZ + c.maxZ) / 2 - g.position.z) < 0.3));
const solidoEm = (x, z, y = 1.2) => world.colliders.some((c) => x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ && c.minY <= y && c.maxY >= y);
/* Abertura = travessia da fachada leste (x de -16 a -18) livre na altura do peito.
   Duas z diferentes têm de passar: sala de um vão só é ratoeira. */
const travessia = (z) => { for (let x = -16; x >= -18.4; x -= 0.2) if (solidoEm(x, z)) return false; return true; };
const aberturas = [-3.4, 0, 3.4].filter(travessia);
const nosSala = world.waypoints.nodes.filter((n) => dentroSala(n.x, n.z));
const deE = world.nearestWaypoint(world.spawns.E[0].x, world.spawns.E[0].z);
const rotaSala = nosSala.length ? world.findPath(deE, world.nearestWaypoint(nosSala[0].x, nosSala[0].z)) : [];
const lootSala = world.pickups.filter((p) => dentroSala(p.x, p.z));
const posto2 = gondolasComColisor.length >= 4
  && aberturas.length >= 2
  && !!teto && teto.position.y >= 3.4
  && nosSala.length >= 6
  && rotaSala.length >= 2
  && lootSala.length >= 2;

/* ================= POSTO3 · COBERTURA ================= */
const cobreIlha = (iz) => !!telha && Math.abs(telha.position.x - 4) < 11
  && Math.abs(telha.position.z - iz) < 12 && telha.position.y >= 5;
const telhaSemColisor = !!telha && !world.colliders.some((c) =>
  c.minY > 4 && Math.abs((c.minX + c.maxX) / 2 - telha.position.x) < 1 && Math.abs((c.minZ + c.maxZ) / 2 - telha.position.z) < 1);
const pilaresColidem = pilares.filter((p) => world.colliders.some((c) =>
  Math.abs((c.minX + c.maxX) / 2 - p.position.x) < 0.3 && Math.abs((c.minZ + c.maxZ) / 2 - p.position.z) < 0.3 && c.maxY > 4));
const posto3 = !!cobertura && [-8, 0, 8].every(cobreIlha) && telhaSemColisor && pilaresColidem.length >= 6;

/* ================= POSTO4 · LINHA DE VISÃO / POSTO5 · COVER DE PEITO ================= */
const TETO_LIVRE = 0.33, MIN_OLHO = 68, MIN_PEITO = 58;
const noPatio = world.waypoints.nodes.filter((n) => n.x > -17 && n.x < 26 && Math.abs(n.z) < 26);
/* Banda do OLHO: o que corta a linha de tiro em pé. Banda do PEITO: o que cobre
   agachado. São conjuntos quase disjuntos, e por isso viram cláusulas separadas. */
const solidosOlho = world.colliders.filter((c) => c.maxY >= 1.2 && c.minY <= 1.6);
const solidosPeito = world.colliders.filter((c) => c.maxY >= 0.5 && c.maxY <= 1.5);
const linhaLivre = (a, b) => {
  const d = Math.hypot(b.x - a.x, b.z - a.z), N = Math.ceil(d / 0.5);
  for (let i = 1; i < N; i++) {
    const t = i / N, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
    for (const c of solidosOlho) if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) return false;
  }
  return true;
};
let pares = 0, livres = 0;
for (let i = 0; i < noPatio.length; i++) for (let j = i + 1; j < noPatio.length; j++) {
  if (Math.hypot(noPatio[i].x - noPatio[j].x, noPatio[i].z - noPatio[j].z) < 20) continue;
  pares++; if (linhaLivre(noPatio[i], noPatio[j])) livres++;
}
const fracao = pares ? livres / pares : 1;
const posto4 = fracao <= TETO_LIVRE && solidosOlho.length >= MIN_OLHO;
const posto5 = solidosPeito.length >= MIN_PEITO && muretas.length >= 12 && jardineiras.length >= 4;

/* ================= POSTO6 · SOM DO POSTO ================= */
const bomba = loops.find((l) => l.tag === 'bomba-ligada');
const radio = loops.find((l) => l.tag === 'radio-loja');
const posto6 = !!bomba && Math.abs(bomba.pos[0] - 4) < 1.5 && Math.abs(bomba.pos[2]) < 1.5 && bomba.radius <= 12 && bomba.rate > 0 && bomba.rate < 1
  && !!radio && dentroSala(radio.pos[0], radio.pos[2]) && radio.lowpass > 0 && radio.lowpass <= 1200 && radio.vol > 0;

/* ---------------- veredito ---------------- */
const marca = MUT ? ` [mutante ${MUT}]` : '';
const linha = (id, ok, evid) => { console.log(`${id} ${ok ? 'PASSA' : 'FALHA'} — ${evid}${marca}`); return ok; };
const r = [
  linha('POSTO1', posto1, `${ilhas.length} ilhas · central com molde "${central?.userData.molde || 'nenhum'}" · colisor ${colIlha ? `${(colIlha.maxX - colIlha.minX).toFixed(2)}×${(colIlha.maxZ - colIlha.minZ).toFixed(2)}×${colIlha.maxY.toFixed(2)} m` : 'ausente'}`),
  linha('POSTO2', posto2, `${gondolasComColisor.length} gôndolas com colisor · ${aberturas.length} aberturas · teto y=${teto ? teto.position.y.toFixed(2) : '—'} · ${nosSala.length} nós · rota de ${rotaSala.length} passos · ${lootSala.length} pickups`),
  linha('POSTO3', posto3, `telha y=${telha ? telha.position.y.toFixed(2) : '—'} sobre as 3 ilhas · ${telhaSemColisor ? 'sem' : 'COM'} colisor · ${pilaresColidem.length}/${pilares.length} pilares colidem`),
  linha('POSTO4', posto4, `${(fracao * 100).toFixed(1)}% dos ${pares} pares >20 m com linha livre (teto ${(TETO_LIVRE * 100).toFixed(0)}%) · ${solidosOlho.length} sólidos na banda do olho (mín. ${MIN_OLHO})`),
  linha('POSTO5', posto5, `${solidosPeito.length} colisores de peito (mín. ${MIN_PEITO}) · ${muretas.length} muretas · ${jardineiras.length} jardineiras`),
  linha('POSTO6', posto6, `bomba em (${bomba ? `${bomba.pos[0]}, ${bomba.pos[2]}` : '—'}) raio ${bomba?.radius ?? '—'} rate ${bomba?.rate ?? '—'} · rádio lowpass ${radio?.lowpass ?? '—'} Hz dentro da sala`),
];

const falhas = r.filter((ok) => !ok).length;
let cega = false;
if (MUT && !falhas) { console.log(`MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`); cega = true; }
if (!falhas && !cega) console.log(`POSTO ✓ 6 cláusulas do Posto da Treta (molde, interior, cobertura, visão, peito, som)`);
process.exit(falhas || cega ? 1 : 0);
