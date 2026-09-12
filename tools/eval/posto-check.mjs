#!/usr/bin/env node
/* ============================================================================
   posto-check.mjs — A ESTAÇÃO DO POSTO DA TRETA É UM GLB: O QUE ELA PRECISA PROVAR
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   A marquise, as ilhas de bomba e a loja do Posto da Treta eram caixas procedurais
   e viraram um GLB só (`posto_ipiranga.glb`). Isso move três coisas para fora do
   código, onde elas quebram CALADAS:

   (a) ESCALA. `placeProp` escala pelo `targetH` declarado. Se alguém reexportar o
       modelo com outra altura, a estação inteira muda de tamanho e NADA reclama —
       o mapa só fica errado. POSTO1 mede a altura real do arquivo contra a
       declarada no `map_posto.js`.
   (b) O EXPORT DO FAB. O arquivo original vinha com DOIS conjuntos de UV e a cor
       declarada no `texCoord: 0`, enquanto o unwrap bom estava no UV1 — a estação
       entrava CINZA. E com `alphaMode: BLEND` em material opaco, entrava
       TRANSLÚCIDA. A ingestão conserta os dois e o `prune` do pipeline de props
       consolida a malha num conjunto de UV só (ver docs/maps/POSTO-IPIRANGA.md).
       POSTO2 cobra o estado final: um UV por primitiva (aí não existe canal errado
       possível) e nenhum material translúcido. Reexportar o arquivo do Fab por cima
       devolve os dois defeitos SEM UMA LINHA no console.
   (c) COLISÃO. O GLB não traz colisor nenhum, e colisor girado está proibido
       (BUG-21), então a pegada é declarada à mão no mapa. Se o modelo andar e os
       colisores não, o jogador atravessa parede. POSTO3 mede a ocupação SÓLIDA do
       modelo na altura do peito e exige colisor declarado cobrindo cada célula.

   E POSTO4 guarda o mapa em volta: spawn, bandeira de CTF ou waypoint DENTRO da
   estação nova é bug de rodada inteira (nascer preso, bandeira inalcançável).

   ── AS MUTAÇÕES QUE PROVAM ─────────────────────────────────────────────────
   --mutante=escala-errada     altura declarada 15% maior  -> POSTO1 vermelha
   --mutante=dois-uvs          devolve o segundo conjunto de UV -> POSTO2 vermelha
   --mutante=blend             devolve alphaMode BLEND     -> POSTO2 vermelha
   --mutante=sem-colisor-loja  apaga o colisor da loja     -> POSTO3 vermelha
   --mutante=spawn-na-loja     joga um spawn dentro da loja -> POSTO4 vermelha
   ============================================================================ */
import { readFileSync, existsSync } from 'node:fs';
import { THREE, MAPS, initTextures } from './harness.mjs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MUT = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1] || '';
const MUTANTES = ['', 'escala-errada', 'dois-uvs', 'blend', 'sem-colisor-loja', 'spawn-na-loja'];
if (!MUTANTES.includes(MUT)) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const GLB = 'public/models/props/posto_ipiranga.glb';
const FONTE_MAPA = 'public/js/map_posto.js';
let falhou = false;
const put = (id, ok, evid) => { console.log(`${ok ? '✓' : '✗'} ${id}  ${evid}`); if (!ok) falhou = true; };

/* ── o que o MAPA declara ──────────────────────────────────────────────────── */
const src = readFileSync(FONTE_MAPA, 'utf8');
const decl = /const PX = (-?[\d.]+), ALT = ([\d.]+);/.exec(src);
if (!decl) { console.log('✗ POSTO0  map_posto.js não declara mais `const PX = …, ALT = …` — régua cega, conserte a régua junto com o mapa'); process.exit(1); }
const PX = Number(decl[1]);
let ALT = Number(decl[2]);
if (MUT === 'escala-errada') ALT *= 1.15;

/* ── o GLB: geometria e materiais ──────────────────────────────────────────── */
if (!existsSync(GLB)) { console.log(`✗ POSTO1  ${GLB} não existe — a estação do mapa sumiu do disco`); process.exit(1); }
const bruto = readFileSync(GLB);
const jsonLen = bruto.readUInt32LE(12);
const json = JSON.parse(bruto.subarray(20, 20 + jsonLen));

// POSTO2 lê o JSON do glTF direto: é lá que o defeito do Fab mora.
const prims = json.meshes.flatMap(m => m.primitives.map(p => ({ malha: m.name, attrs: { ...p.attributes }, material: json.materials[p.material] })));
if (MUT === 'dois-uvs') {   // devolve a forma do arquivo cru do Fab: dois conjuntos de UV
  for (const p of prims) p.attrs.TEXCOORD_1 = p.attrs.TEXCOORD_0;
}
const materiais = json.materials.map(m => ({ nome: m.name, alphaMode: MUT === 'blend' ? 'BLEND' : (m.alphaMode || 'OPAQUE') }));
const multiUV = prims.filter(p => p.attrs.TEXCOORD_1 !== undefined);
const canalInexistente = prims.filter(p => {
  const tc = p.material?.pbrMetallicRoughness?.baseColorTexture?.texCoord ?? 0;
  return p.material?.pbrMetallicRoughness?.baseColorTexture && p.attrs[`TEXCOORD_${tc}`] === undefined;
});
const translucidos = materiais.filter(m => m.alphaMode !== 'OPAQUE');
put('POSTO2', multiUV.length === 0 && canalInexistente.length === 0 && translucidos.length === 0,
  multiUV.length || canalInexistente.length || translucidos.length
    ? `export do Fab de volta: ${multiUV.length} primitivas com 2 conjuntos de UV · ${canalInexistente.length} com cor em canal inexistente · ${translucidos.map(m => m.nome).join(' ') || 'nenhum'} translúcido(s) — estação cinza ou fantasma no jogo`
    : `${prims.length} primitivas com UV único e ${materiais.length} materiais opacos`);

/* geometria sem textura (o truque do prop-geometry-fixture: node não decodifica webp) */
const semTex = JSON.parse(JSON.stringify(json));
semTex.materials = [{ pbrMetallicRoughness: { baseColorFactor: [.5, .5, .5, 1] } }];
semTex.meshes.forEach(m => m.primitives.forEach(p => { p.material = 0; }));
delete semTex.textures; delete semTex.images; delete semTex.samplers;
for (const campo of ['extensionsRequired', 'extensionsUsed']) {
  if (semTex[campo]) semTex[campo] = semTex[campo].filter(e => e !== 'EXT_texture_webp');
}
const enc = Buffer.from(JSON.stringify(semTex)), pad = Buffer.alloc(Math.ceil(enc.length / 4) * 4, 32);
enc.copy(pad);
const bin = bruto.subarray(20 + jsonLen), glb = Buffer.alloc(20 + pad.length + bin.length);
bruto.copy(glb, 0, 0, 20); glb.writeUInt32LE(glb.length, 8); glb.writeUInt32LE(pad.length, 12);
pad.copy(glb, 20); bin.copy(glb, 20 + pad.length);
const gltf = await new Promise((ok, err) => new GLTFLoader().parse(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), '', ok, err));
const modelo = gltf.scene; modelo.updateMatrixWorld(true);
const caixa = new THREE.Box3().setFromObject(modelo), tam = caixa.getSize(new THREE.Vector3());

// POSTO1: placeProp escala por targetH/altura. Escala 1,0 é o que "1:1" quer dizer.
const escala = ALT / tam.y;
put('POSTO1', Math.abs(escala - 1) <= 0.005 && Math.abs(caixa.min.y) <= 0.01,
  `altura do arquivo ${tam.y.toFixed(2)} m · ALT declarado ${ALT.toFixed(2)} m · escala ${escala.toFixed(3)} · pousado em y=${caixa.min.y.toFixed(3)}`);

/* ── o mapa montado ────────────────────────────────────────────────────────── */
const scene = new THREE.Scene();
const world = MAPS.posto_treta.build(scene, await initTextures());
let colisores = world.colliders;
if (MUT === 'sem-colisor-loja') {
  const antes = colisores.length;
  colisores = colisores.filter(c => !(c.minX <= -14 && c.maxX >= -9 && c.minZ <= -19 && c.maxZ >= -7));
  if (colisores.length === antes) { console.error('MUTANTE NÃO APLICOU: colisor da loja não encontrado'); process.exit(2); }
}

/* POSTO3: ocupação sólida do modelo na altura do peito × colisor declarado.
   Célula de 1 m; só conta célula com massa de verdade (>= 4 triângulos cruzando a
   faixa), senão poste fino e meio-fio decorativo virariam exigência de colisor. */
/* Só exige colisor de célula cuja geometria SOBE até a altura do peito (>= ALTO).
   Meio-fio de ilha e rampa de serviço do posto ficam em 0,73 m e o mapa NÃO os colide de
   propósito — a nota do map_posto.js sobre o meio-fio é explícita ("não trava tiro").
   Sem esse corte a régua cobraria parede onde o mapa quer degrau. */
const CELULA = 1, Y0 = 0.4, Y1 = 1.9, MASSA = 4, ALTO = 1.0;
const ocupa = new Map();
const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
modelo.traverse(o => {
  if (!o.isMesh) return;
  const g = o.geometry, pos = g.attributes.position, idx = g.index;
  const n = idx ? idx.count : pos.count;
  for (let i = 0; i < n; i += 3) {
    for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(pos, idx ? idx.getX(i + k) : i + k).applyMatrix4(o.matrixWorld);
    const ymin = Math.min(v[0].y, v[1].y, v[2].y), ymax = Math.max(v[0].y, v[1].y, v[2].y);
    if (ymax < Y0 || ymin > Y1) continue;
    const xs = [v[0].x, v[1].x, v[2].x].map(x => x + PX), zs = [v[0].z, v[1].z, v[2].z];
    for (let x = Math.floor(Math.min(...xs)); x <= Math.floor(Math.max(...xs)); x++)
      for (let z = Math.floor(Math.min(...zs)); z <= Math.floor(Math.max(...zs)); z++)
      {
        const k = `${x},${z}`, cel = ocupa.get(k) || { n: 0, topo: -Infinity };
        cel.n++; cel.topo = Math.max(cel.topo, ymax);
        ocupa.set(k, cel);
      }
  }
});
const solidas = [...ocupa.entries()].filter(([, c]) => c.n >= MASSA && c.topo >= ALTO).map(([k]) => k.split(',').map(Number));
const coberta = ([x, z]) => colisores.some(c =>
  c.maxY >= 1.0 && c.minX <= x + CELULA && c.maxX >= x && c.minZ <= z + CELULA && c.maxZ >= z);
const furos = solidas.filter(cel => !coberta(cel));
put('POSTO3', furos.length === 0,
  `${solidas.length} células sólidas até >= ${ALTO} m · sem colisor: ${furos.length}${furos.length ? ' -> ' + furos.slice(0, 8).map(([x, z]) => `(${x},${z})`).join(' ') : ''}`);

/* POSTO4: o mapa em volta continua jogável */
const dentro = (p, c) => p.x > c.minX && p.x < c.maxX && p.z > c.minZ && p.z < c.maxZ && c.maxY > 0.5;
const spawns = [...(world.spawns?.A || []), ...(world.spawns?.B || []), ...(Array.isArray(world.spawns) ? world.spawns : [])];
if (MUT === 'spawn-na-loja') spawns.push({ x: -11.5, y: 0, z: -13 });
const presos = spawns.filter(s => colisores.some(c => dentro(s, c)));
const bandeiras = (world.ctfPoints || []).filter(p => colisores.some(c => dentro(p, c)));
const nos = (world.waypoints?.nodes || []).filter(n => colisores.some(c => dentro(n, c)));
put('POSTO4', presos.length === 0 && bandeiras.length === 0 && nos.length === 0,
  `spawns ${spawns.length} (presos ${presos.length}) · bandeiras ${(world.ctfPoints || []).length} (presas ${bandeiras.length}) · waypoints ${(world.waypoints?.nodes || []).length} (dentro de colisor ${nos.length})`);

console.log(falhou
  ? '\n✗ POSTO  a estação do Posto da Treta não está no contrato — ver acima'
  : '\n✓ POSTO  estação 1:1, export do Fab consertado, colisão cobrindo o sólido e mapa jogável em volta');
process.exit(falhou ? 1 : 0);
