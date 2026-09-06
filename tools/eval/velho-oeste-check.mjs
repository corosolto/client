/* ============================================================================
   velho-oeste-check.mjs — O CONTRATO DE GAMEPLAY/ROTAS DA FRENTE map2.
   ----------------------------------------------------------------------------
   POR QUE ESTE ARQUIVO MUDOU NA r2 (e o que NÃO mudou)

   Esta régua media o LAYOUT do mapa original do contribuidor usantos (12
   fachadas de faroeste, 3 carroças, 8 cartazes de PROCURADO, 24 janelas
   western). Na r2 o dono revogou essa estética com todas as letras:

     "continua com visual do velho oeste so mudou o nome do mapa, precisa de
      casas do sertão, ... casas de pau a pique, caminhão antigo ..., igrejinha,
      cidade de pernambuco com menos de 3mil habitantes"

   Cláusula de régua que codifica decisão estética revogada é régua velha: ela
   reprovaria para sempre o mapa que o dono pediu. A re-derivação é o par
   régua+mudança com a procedência acima:

     · O QUE SAIU: OESTE1-saloon/carroças, OESTE11-14 (cartazes, retratos,
       janelas western, gênero/recompensa). O TEMA agora é medido pela
       eval:sertao (ST1-ST5), com mutações próprias — não é afrouxar, é a
       medida morar no instrumento certo.
     · O QUE FICOU COM OS MESMOS TETOS: CTF/spawns, rota ≥100 nós,
       ≥8 postes de alpendre bloqueando o
       corpo REAL, densidade central ≥12 estruturas + ≥8 obstáculos, texturas
       dedicadas e os webp real-v1 ligados ao fonte.
     · REVISÃO SERTÃO 2026-09: por instrução do dono, a identidade western de
       tumbleweeds com colisão dá lugar a tecidos no forró. OE8 passa a proibir
       tumbleweeds e colisores móveis. OE2 exige ≥3 tecidos variando >0,01 rad
       entre t=0 e 4,7 s: isso detecta animação, não aprova seu aspecto visual.
       O limiar angular separa movimento de zero; não foi extraído de fotografia.
       OE9 mantém piso 8 e teste Game._collide, agora nos postes finos reais.

   O QUE ELA MEDE (no mundo construído em node puro, MESMO lugar das demais)
     OE1  layout do arraial: ≥12 estruturas sertão (casas pau-a-pique, igrejinha,
          caminhão, poço, capelinha, palhoça, placa) com ≥6 casas, e ≥8
          obstáculos de cover no miolo (|x|,|z| ≤ 12 — a praça).
     OE2  movimento vivo: ≥3 tecidos oscilando (variação angular >0,01 rad)
          E ≥2 calangos em rajada (corre, PARA bruscamente, corre de novo).
     OE3  CTF: 3 pontos com ids distintos; spawns 4×4 dentro dos bounds.
     OE4  rota dos bots: ≥100 waypoints e caminho E→B íntegro.
     OE5  texturas dedicadas (oeste-sand/wood/wood-pale/roof/cactus/hay + adobe).
     OE6  obstáculos-chave no miolo: bebedouro, caixas-feira, amarra-cavalos,
          barricada (nomes do retheme sertão da r2).
     OE7  texturas realistas real-v1.webp presentes em disco e ligadas ao fonte.
     OE8  nenhum tumbleweed; nenhum colisor muda durante world.update.
     OE9  ≥8 postes (tag varanda-*) bloqueiam o corpo REAL (Game._collide).

   MUTANTES — cada um acende SÓ a cláusula dele (o teclado da r1 foi portado
   para os nomes da r2; os de tema saíram com o tema):
     sem-casas ........... remove as sertao-casa-*      -> OE1
     centro-aberto ....... esvazia estruturas/miolo     -> OE1
     obstaculos-sem-nome . renomeia os 4 obstáculos-chave -> OE6
     parada .............. substitui world.update e congela tecidos      -> OE2
     calango-morto ....... zera os calangos            -> OE2
     sem-ctf ............. derruba os pontos CTF       -> OE3
     rota-cortada ........ ilha o grafo de waypoints   -> OE4
     texturas-genericas .. apaga os nomes de textura   -> OE5
     colisao-movel ....... world.update move um colisor existente -> OE8
     sem-colisao-varanda . solta os colisores varanda- -> OE9
     (o `sem-obstaculos-centrais` da r1 removia TODOS os obstáculos: na r2 a OE1
     também conta obstáculos e ele acenderia duas — vira `obstaculos-sem-nome`.)

   USO
     node tools/eval/velho-oeste-check.mjs
     node tools/eval/velho-oeste-check.mjs --mutante=sem-casas
    ============================================================================ */
import { THREE, MAPS, initTextures, Game } from './harness.mjs';
import { existsSync, readFileSync } from 'node:fs';

const mutante = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1];
const scene = new THREE.Scene();
const world = MAPS.velho_oeste.build(scene, await initTextures());

const named = prefix => {
  const found = [];
  world.root.traverse(object => { if (object.name?.startsWith(prefix)) found.push(object); });
  return found;
};
const casas = named('sertao-casa-');
const estruturas = named('sertao-');
const tumbleweeds = named('tumbleweed-');
const tecidos = named('tecido-forro-');
const obstacles = named('obstaculo-');
if (mutante === 'sem-casas') {
  if (!casas.length) { console.error('MUTANTE NÃO APLICOU: nenhuma sertao-casa-*'); process.exit(1); }
  for (const c of casas) c.parent?.remove(c);
  casas.length = 0;
}
if (mutante === 'obstaculos-sem-nome') {
  const alvo = obstacles.filter(o => o.name.startsWith('obstaculo-bebedouro')
    || o.name.startsWith('obstaculo-caixas-feira') || o.name.startsWith('obstaculo-amarra-cavalos')
    || o.name.startsWith('obstaculo-barricada'));
  if (alvo.length < 4) { console.error('MUTANTE NÃO APLICOU: faltam os 4 obstáculos-chave'); process.exit(1); }
  for (const o of alvo) o.name = `obstaculo-x-${o.name.slice(10)}`;   // contagem OE1 intacta, nome some
}
if (mutante === 'centro-aberto') { estruturas.splice(12); obstacles.splice(4); casas.length = 0; }

const calangos = (world.ambience?.animals || []).filter(a => a.type === 'calango');
if (mutante === 'calango-morto') {
  if (!calangos.length) { console.error('MUTANTE NÃO APLICOU: nenhum calango na ambiência'); process.exit(1); }
  world.ambience.animals = world.ambience.animals.filter(a => a.type !== 'calango');
  calangos.length = 0;
}

/* ── OE1: arraial denso ── */
const layoutOk = estruturas.length >= 12 && casas.length >= 6
  && obstacles.length >= 8
  && obstacles.every(object => Math.abs(object.position.x) <= 12 && Math.abs(object.position.z) <= 12);

/* ── OE2: movimento vivo — tecidos oscilantes E rajada start-stop ──
   O update(dt) da ambiência CLAMPA dt em 0,05 s: saltar a janela da rajada
   exige marcar o relógio da própria ambiência (mesmo idioma do snap()). */
if (mutante === 'parada') {
  if (typeof world.update !== 'function' || !tecidos.length) throw new Error('MUTANTE parada NÃO APLICOU: update/tecidos ausentes');
  const updateOriginal = world.update;
  world.update = () => {};
  if (world.update === updateOriginal) throw new Error('MUTANTE parada NÃO APLICOU');
}
if (mutante === 'colisao-movel') {
  const colisor = world.colliders.find(c => Number.isFinite(c.minX) && Number.isFinite(c.maxX) && !c.tag?.startsWith('varanda-'));
  if (!colisor || typeof world.update !== 'function') throw new Error('MUTANTE colisao-movel NÃO APLICOU: colisor/update ausentes');
  const updateOriginal = world.update;
  world.update = function (...args) {
    updateOriginal.apply(this, args);
    colisor.minX += .25;
    colisor.maxX += .25;
  };
}
world.update?.(0, 0);
const antes = tecidos.map(o => o.rotation.x);
const collidersAntes = JSON.stringify(world.colliders);
world.update?.(0.9, 4.7);
const collidersDepois = JSON.stringify(world.colliders);
const collidersMudaram = collidersAntes !== collidersDepois;
if (mutante === 'colisao-movel' && !collidersMudaram) throw new Error('MUTANTE colisao-movel NÃO APLICOU: colisores não mudaram');
const motion = tecidos.map((o, i) => Math.abs(o.rotation.x - antes[i]));
const tecidosMovendo = motion.filter(delta => Number.isFinite(delta) && delta > .01).length;
const calangosVivos = calangos.length;
// Observar movimento contínuo: a duração depende da distância da rota.
// Janela0,4s mede avanço, e uma pausa real deve manter posição em cada animal.
world.ambience.reset();
const histories = calangos.map(() => []);
const longestRuns = calangos.map(() => 0);
const pauses = calangos.map(() => false);
for (let frame = 0; frame < 1800; frame++) {
  world.ambience.update(1 / 60, null);
  calangos.forEach((c, i) => {
    const h = histories[i]; h.push({ position: c.root.position.clone(), state: c.state });
    if (h.length > 25) h.shift();
    if (h.length !== 25) return;
    const distance = h[0].position.distanceTo(h[24].position);
    if (h.every(s => s.state === 'run')) longestRuns[i] = Math.max(longestRuns[i], distance);
    if (h.every(s => s.state === 'idle') && distance < .01) pauses[i] = true;
  });
}
const rajadas = mutante === 'calango-morto' ? [] : longestRuns;
const vidaOk = tecidos.length >= 3 && typeof world.update === 'function'
  && tecidosMovendo >= 3 && calangosVivos >= 2
  && rajadas.length >= 2 && Math.min(...rajadas) >= .2;
const calangoPara = mutante !== 'calango-morto' && pauses.length >= 2 && pauses.every(Boolean);

/* ── OE3: CTF e spawns ── */
let ctfPoints = world.ctfPoints;
if (mutante === 'sem-ctf') {
  if (!ctfPoints?.length) { console.error('MUTANTE NÃO APLICOU: sem ctfPoints para derrubar'); process.exit(1); }
  ctfPoints = ctfPoints.slice(0, 2);
}
const ctfOk = ctfPoints?.length === 3 && new Set(ctfPoints.map(p => p.id)).size === 3;
const spawnsOk = ['E', 'B'].every(team => world.spawns?.[team]?.length === 4 && world.spawns[team].every(p =>
  p.x > world.bounds.minX && p.x < world.bounds.maxX && p.z > world.bounds.minZ && p.z < world.bounds.maxZ));

/* ── OE4: rota dos bots ── */
const nodes = world.waypoints?.nodes || [];
let adj = world.waypoints?.adj;
if (mutante === 'rota-cortada') {
  if (!adj?.length) { console.error('MUTANTE NÃO APLICOU: grafo de waypoints ausente'); process.exit(1); }
  adj = adj.map(vizinhos => vizinhos.slice(0, 0));   // ilha: nenhuma aresta sobrevive
}
const start = world.nearestWaypoint(world.spawns.E[0].x, world.spawns.E[0].z);
const end = world.nearestWaypoint(world.spawns.B[0].x, world.spawns.B[0].z);
const path = (() => {
  if (adj === world.waypoints?.adj) return world.findPath(start, end);
  if (start === end) return [start];
  const prev = new Int16Array(nodes.length).fill(-1); const queue = [start]; prev[start] = start;
  while (queue.length) { const n = queue.shift(); for (const next of adj[n]) if (prev[next] < 0) { prev[next] = n; if (next === end) { const p = [next]; let q = n; while (q !== start) { p.unshift(q); q = prev[q]; } p.unshift(start); return p; } queue.push(next); } }
  return [start];
})();
const routeOk = nodes.length >= 100 && path.length >= 2 && path.every(i => Number.isInteger(i) && nodes[i]);

/* ── OE5: texturas dedicadas ── */
// Mutação atua no material do mundo, não na lista de medições.
if (mutante === 'texturas-genericas') world.root.traverse(object => {
  if (!object.isMesh) return;
  for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
    if (material) { material.map = new THREE.Texture(); material.map.name = 'generica'; material.bumpMap = null; }
  }
});
const textureNames = new Set();
world.root.traverse(object => {
  if (!object.isMesh) return;
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  for (const material of materials) {
    if (material?.map?.name) textureNames.add(material.map.name);
    if (material?.bumpMap?.name) textureNames.add(material.bumpMap.name);
  }
});
const textureOk = [
  ['oeste-sand', 'oeste-sand-real'], ['oeste-wood', 'oeste-wood-real'], ['oeste-wood-pale', 'oeste-wood-pale-real'],
  ['oeste-roof', 'oeste-roof-real'], ['oeste-cactus', 'oeste-cactus-real'], ['oeste-hay', 'oeste-hay-real'],
  ['oeste-adobe', 'oeste-adobe-real'], ['oeste-adobe-paupique'],
  // O bump rachado foi removido: causava listras que contrariavam o novo albedo.
  // RV9 mede detalhe e contraste na imagem real, com mutantes de solo plano/ondulado.
].every(names => names.some(name => textureNames.has(name)));

/* ── OE6: obstáculos-chave da praça (nomes do retheme r2) ── */
const requiredObstacles = ['obstaculo-bebedouro', 'obstaculo-caixas-feira', 'obstaculo-amarra-cavalos', 'obstaculo-barricada'];
const obstaclesOk = requiredObstacles.every(name => obstacles.some(object => object.name === name));

/* ── OE7: texturas realistas em disco e ligadas ao fonte ── */
const realTextureFiles = ['wood-real-v1.webp', 'dirt-real-v1.webp', 'roof-real-v1.webp', 'cactus-real-v1.webp', 'hay-real-v1.webp', 'metal-real-v1.webp'];
const mapSource = readFileSync(new URL('../../public/js/map_velho_oeste.js', import.meta.url), 'utf8');
const realTexturesOk = realTextureFiles.every(file => existsSync(new URL(`../../public/img/textures/velho_oeste/${file}`, import.meta.url)) && mapSource.includes(file));

/* ── OE8/OE9: colisões contra o corpo REAL ── */
const collisionProbe = Object.create(Game.prototype);
collisionProbe.world = { colliders: world.colliders, bounds: { minX: -999, maxX: 999, minZ: -999, maxZ: 999 } };
const staticCollisionOk = tumbleweeds.length === 0 && typeof world.update === 'function' && !collidersMudaram;
const porchColliders = world.colliders.filter(collider => collider.tag?.startsWith('varanda-'));
if (mutante === 'sem-colisao-varanda') {
  const antes = world.colliders.length;
  world.colliders = world.colliders.filter(collider => !collider.tag?.startsWith('varanda-'));
  if (world.colliders.length === antes) { console.error('MUTANTE NÃO APLICOU: nenhum colisor varanda-'); process.exit(1); }
  porchColliders.length = 0;
}
collisionProbe.world.colliders = world.colliders;
const porchCollisionOk = porchColliders.length >= 8 && porchColliders.every(collider => {
  const x = (collider.minX + collider.maxX) / 2, z = (collider.minZ + collider.maxZ) / 2;
  const body = new THREE.Vector3(x, 0, z); collisionProbe._collide(body, .38);
  return Math.hypot(body.x - x, body.z - z) >= .37;
});

console.log(`OESTE1 ${layoutOk ? 'PASSA' : 'FALHA'} — ${estruturas.length} estruturas · ${casas.length} casas pau-a-pique · ${obstacles.length} obstáculos no miolo${mutante ? ` [mutante ${mutante}]` : ''}`);
console.log(`OESTE2 ${vidaOk && calangoPara ? 'PASSA' : 'FALHA'} — ${tecidosMovendo}/${tecidos.length} tecidos com delta>0.01 rad (piso 3; mínimo observado ${motion.length ? Math.min(...motion).toFixed(3) : '0.000'} rad) · ${calangos.length} calangos (rajada ≥${rajadas.length ? Math.min(...rajadas).toFixed(2) : '0.00'} m · param: ${calangoPara ? 'sim' : 'NÃO'})`);
console.log(`OESTE3 ${ctfOk && spawnsOk ? 'PASSA' : 'FALHA'} — ${ctfPoints?.length || 0} pontos CTF · ${world.spawns?.E?.length || 0}×${world.spawns?.B?.length || 0} spawns`);
console.log(`OESTE4 ${routeOk ? 'PASSA' : 'FALHA'} — ${nodes.length} nós · rota entre bases com ${path.length} passos`);
console.log(`OESTE5 ${textureOk ? 'PASSA' : 'FALHA'} — materiais dedicados: ${[...textureNames].sort().join(', ') || 'nenhum'}`);
console.log(`OESTE6 ${obstaclesOk ? 'PASSA' : 'FALHA'} — obstáculos-chave da praça presentes`);
console.log(`OESTE7 ${realTexturesOk ? 'PASSA' : 'FALHA'} — ${realTextureFiles.length} texturas realistas presentes e ligadas ao mapa`);
console.log(`OESTE8 ${staticCollisionOk ? 'PASSA' : 'FALHA'} — ${tumbleweeds.length} tumbleweeds · ${world.colliders.length} colisores · snapshot antes/depois ${collidersMudaram ? 'MUDOU' : 'idêntico'}`);
console.log(`OESTE9 ${porchCollisionOk ? 'PASSA' : 'FALHA'} — ${porchColliders.length}/8 postes de alpendre bloqueiam o corpo real`);

const esperados = {
  'sem-casas': 'OESTE1', 'centro-aberto': 'OESTE1', 'obstaculos-sem-nome': 'OESTE6',
  'parada': 'OESTE2', 'calango-morto': 'OESTE2', 'sem-ctf': 'OESTE3', 'rota-cortada': 'OESTE4',
  'texturas-genericas': 'OESTE5', 'colisao-movel': 'OESTE8', 'sem-colisao-varanda': 'OESTE9',
};
const resultados = {
  OESTE1: layoutOk, OESTE2: vidaOk && calangoPara, OESTE3: ctfOk && spawnsOk, OESTE4: routeOk,
  OESTE5: textureOk, OESTE6: obstaclesOk, OESTE7: realTexturesOk, OESTE8: staticCollisionOk, OESTE9: porchCollisionOk,
};
if (mutante) {
  if (!Object.hasOwn(esperados, mutante)) { console.error(`mutante desconhecido: ${mutante}`); process.exit(2); }
  const vermelhas = Object.entries(resultados).filter(([, ok]) => !ok).map(([id]) => id);
  const esperado = esperados[mutante];
  if (vermelhas.length !== 1 || vermelhas[0] !== esperado) {
    console.error(`\nMUTANTE ${mutante} ${vermelhas.length ? `acendeu ${vermelhas.join(', ')} em vez de ${esperado}` : 'SOBREVIVEU'} — a régua não mede o que diz medir.`);
    process.exit(1);
  }
  console.log(`\nMUTANTE MORDIDO: ${mutante} -> ${esperado}`);
  process.exit(0);
}
const tudo = Object.values(resultados).every(Boolean);
if (!tudo) console.error('\n✗ OESTE: gameplay/rotas com cláusula vermelha — a reconstrução não pode quebrar o que jogava.');
else console.log('\n✓ OESTE ok — gameplay e rotas preservadas pela reconstrução r2.');
process.exit(tudo ? 0 : 1);
