/* Miolo urbano: avenidas, vielas, 16 quarteirões, 4 lojas com interior, praça com feira e
   o lixo que o javaporco revira. Medidas e paleta: docs/maps/invasao-javaporcos-visual.md. */
import * as THREE from 'three';
import { hasProp, placeProp, PropBatch, mergeParts } from './mapprops.js';
import { LETREIRO_UV } from './map_javaporcos_texturas.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { construirInterior } from './map_javaporcos_interiores.js';
import { construirTorre } from './map_javaporcos_torre.js';

export const AV = 6;             // meia-largura da avenida (12 m de asfalto)
export const CAL = 2;            // calçada
export const MEIO_FIO = 0.15;
export const SOLEIRA = 0.33;     // calçada + 0,18 da soleira: o degrau que faz o bicho tropeçar
export const VIELA = 1.75;
export const B_IN = [8, 20.25], B_OUT = [23.75, 31.5];
export const PERIMETRAL = [31.5, 36];
export const CIDADE_R = 36;

const QUADRANTES = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const GLB = typeof location !== 'undefined' && /^https?:/.test(location.protocol || '') && new URLSearchParams(location.search).get('glb') !== '0';
const usaGLB = (id) => GLB && hasProp(id);
/* Sorteio próprio do que é só enfeite: o `rnd` do mapa é compartilhado com a mata, e uma
   chamada a mais aqui desloca a mata inteira. */
const lcg = (s) => () => ((s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296);
const faixa = (s, b) => (s > 0 ? [b[0], b[1]] : [-b[1], -b[0]]);

export function blocos() {
  const saida = [];
  for (const [sx, sz] of QUADRANTES) {
    for (const ax of ['i', 'o']) for (const az of ['i', 'o']) {
      const [x0, x1] = faixa(sx, ax === 'i' ? B_IN : B_OUT);
      const [z0, z1] = faixa(sz, az === 'i' ? B_IN : B_OUT);
      saida.push({ id: `${sx > 0 ? 'L' : 'O'}${sz > 0 ? 'S' : 'N'}-${ax}${az}`, sx, sz, ax, az, x0, x1, z0, z1 });
    }
  }
  return saida;
}

/* Quem recebe o quê. A praça fica no quarteirão mais perto do cruzamento central, as
   quatro lojas em quadrantes diferentes e os sobrados nunca colados um no outro. */
const PAPEL = {
  'ON-ii': 'praca', 'LN-ii': 'mercearia', 'OS-ii': 'padaria', 'LS-ii': 'boteco',
  'ON-io': 'farmacia', 'LN-oi': 'acougue', 'ON-oo': 'racao', 'LN-oo': 'igreja', 'OS-oo': 'sobrados', 'LS-oo': 'sobrados',
};

export function construirCidade(kit, campo, rnd, ambiente='cidade') {
  if(ambiente!=='cidade')return construirAmbiente(kit,campo,rnd,ambiente);
  const { MAT, caixa, piso, placa, root, colliders } = kit;
  const foodSpots = [], foodMeshes = new Map(), foodColliders = new Map();
  const portas = [], lojas = [], becos = [];
  const extras = novosExtras();
  kit.ex = extras;
  let edificacoes = 0;
  // saco plástico brilha: rugosidade 1 do GLB deixava o saco um "ovo preto" (L* 6, C* 0,4)
  if (usaGLB('saco_lixo')) placeProp('saco_lixo', {})?.traverse((m) => { if (m.isMesh) m.material.roughness = MAT.saco.roughness; });

  /* ── Plataformas no campo de altura ANTES de qualquer malha: é o campo que manda, e é
     por isso que o bicho deixa de andar por baixo de calçada e soleira. */
  const calcadas = [];
  const faixaCalcada = (x0, x1, z0, z1) => {
    const r = [Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1)];
    calcadas.push(r);
    campo.plataforma(r[0], r[1], r[2], r[3], MEIO_FIO);
  };
  /* A calçada PARA no cruzamento: a primeira versão atravessava a avenida e virava um
     degrau de 0,15 m no meio da pista, que ninguém constrói e ninguém espera. */
  const BRACOS = [[AV + CAL, CIDADE_R], [-CIDADE_R, -(AV + CAL)]];
  for (const s of [-1, 1]) for (const [a, b] of BRACOS) {
    faixaCalcada(s * AV, s * (AV + CAL), a, b);
    faixaCalcada(a, b, s * AV, s * (AV + CAL));
  }

  // ── Asfalto, calçada e meio-fio
  piso(2 * AV, 2 * CIDADE_R, MAT.asfalto, 0, 0, 0.012, 'chao-avenida-ns');
  piso(2 * CIDADE_R, 2 * AV, MAT.asfalto, 0, 0, 0.014, 'chao-avenida-ew');
  for (const s of [-1, 1]) for (const [a, b] of BRACOS) {
    const comp = Math.abs(b - a), meio = (a + b) / 2;
    piso(CAL, comp, MAT.calcada, s * (AV + CAL / 2), meio, MEIO_FIO, 'chao-calcada');
    piso(comp, CAL, MAT.calcada, meio, s * (AV + CAL / 2), MEIO_FIO + 0.002, 'chao-calcada');
    caixa(0.14, MEIO_FIO, comp, MAT.calcada, s * AV, 0, meio, { collide: false, cast: false });
    caixa(comp, MEIO_FIO, 0.14, MAT.calcada, meio, 0, s * AV, { collide: false, cast: false });
  }

  // ── Vielas de terra e anel perimetral: é por onde a horda corta quarteirão
  const VIELA_BRACOS = [[B_IN[0], PERIMETRAL[0]], [-PERIMETRAL[0], -B_IN[0]]];
  for (const s of [-1, 1]) for (const [a, b] of VIELA_BRACOS) {
    const comp = Math.abs(b - a), meio = (a + b) / 2;
    piso(2 * VIELA, comp, MAT.terra, s * 22, meio, 0.016, 'chao-viela');
    piso(comp, 2 * VIELA, MAT.terra, meio, s * 22, 0.018, 'chao-viela');
  }
  const [p0, p1] = PERIMETRAL;
  for (const s of [-1, 1]) {
    piso(2 * CIDADE_R, p1 - p0, MAT.terra, 0, s * (p0 + p1) / 2, 0.02, 'chao-perimetral');
    piso(p1 - p0, 2 * p0, MAT.terra, s * (p0 + p1) / 2, 0, 0.022, 'chao-perimetral');
  }

  // ── Quarteirões: cada bloco tem UM papel, senão a loja nasce dentro de uma casa
  const COM_LOJA = new Set(['mercearia', 'padaria', 'boteco', 'racao', 'farmacia', 'acougue']);
  let pracaInfo = null, igrejaInfo = null;
  for (const b of blocos()) {
    const papel = PAPEL[b.id] || 'casas';
    if (papel === 'praca') { pracaInfo = praca(kit, campo, rnd, b); continue; }
    if (papel === 'igreja') {
      igrejaInfo = igrejinha(kit, campo, b);
      edificacoes += igrejaInfo.malhas; muroDeFundo(kit, campo, rnd, b, b.sz < 0 ? 'z1' : 'z0');
      continue;
    }
    if (COM_LOJA.has(papel)) {
      const l = loja(kit, campo, rnd, b, papel);
      lojas.push(l); portas.push(l.porta); edificacoes++;
      edificacoes += puxadinho(kit, campo, rnd, b, l);
      const comercio = papel === 'racao' ? 'armazem' : papel;
      l.comercio = comercio;
      criarFood(kit, campo, foodSpots, foodMeshes, foodColliders,
        `saque-${comercio}`, 'racao', l.porta.dentro[0] + (l.eixo === 'z' ? 1.1 : 0), l.porta.dentro[1] + (l.eixo === 'x' ? 1.1 : 0));
      const spot = foodSpots[foodSpots.length - 1], mesh = foodMeshes.get(spot.id);
      spot.loja = comercio; spot.r = 1.15;
      if (!l.aberta) {
        spot.porta = { x: l.porta.vao[0], z: l.porta.vao[1] };
        portaSaque(kit, l, mesh);
      }
      continue;
    }
    if (BECOS[b.id]) {
      const bc = quarteiraoBeco(kit, campo, rnd, b, BECOS[b.id], extras);
      becos.push(bc.contrato); edificacoes += bc.casas;
      continue;
    }
    edificacoes += quarteiraoCasas(kit, campo, rnd, b, papel === 'sobrados' ? 2 : 0);
  }

  // ── Postes, fiação e carros parados
  const postes = fiacao(kit, campo, rnd, extras);

  // ── Lixo que a horda revira, espalhado pelos quatro quadrantes
  const pontos = [
    ['lixo-av-n', 'lixo', -3.2, -17.4], ['lixo-av-s', 'lixo', 3.4, 18.1],
    ['lixo-viela-on', 'lixo', -22, -14.5], ['lixo-viela-ls', 'lixo', 22, 15.2],
    ['lixo-perim-n', 'lixo', -19.6, -33.4], ['lixo-perim-l', 'lixo', 33.2, -14.6],
    ['lixo-perim-s', 'lixo', 8.4, 33.1],
    ['cacamba-obra', 'cacamba', -33.1, -11.2], ['cacamba-viela', 'cacamba', 22, -22],
    ['cacamba-perim', 'cacamba', 31.2, 33.2],
    ['racao-galpao', 'racao', -33.4, 12.6],
  ];
  pracaInfo.feira.forEach(([x, z], i) => pontos.push([`feira-${i + 1}`, 'feira', x, z]));
  for(const [id,x,z] of [['hortifruti',12.5,-3.5],['padaria',-12.5,3.5],['refeitorio',-3.5,-28.5],['racao',28.5,3.5]]) pontos.push([`alimento-${id}`,'racao',x,z]);
  for (const [id, kind, x, z] of pontos) {
    criarFood(kit, campo, foodSpots, foodMeshes, foodColliders, id, kind, x, z);
    if(id.startsWith('alimento-')) {
      const mesh=foodMeshes.get(id),box=new THREE.Box3().setFromObject(mesh);
      mesh.scale.y=.25/(box.max.y-mesh.position.y);
      const col=foodColliders.get(id);col.maxY=col.minY+.25;
    }
  }

  lixoSolto(kit, campo, rnd, extras.glb);
  lixoDeRua(kit, campo, extras, pontos);
  kit.root.userData.lixoGuia = lixoDaGuia(campo, extras);
  cacambas(kit, campo, extras, pontos);
  cenaDaRua(kit, campo, extras);
  kit.root.userData.sacos = [...extras.rua, ...extras.glb].filter((g) => g.id === 'saco_lixo');
  luzDosBecos(kit, extras.postesBeco);
  construirExtras(kit, extras);
  telhadosEmLote(kit);

  /* O objetivo mora num ponto ALCANÇÁVEL (corredor da feira, porta da loja, adro da
     igreja) e leva `r`: centro de prédio era bando empacado na parede a 6,6 m (medido). */
  const mercearia = lojas.find((l) => l.papel === 'mercearia') || lojas[0];
  const hordeObjectives = [
    { id: 'feira', x: +pracaInfo.objetivo[0].toFixed(2), z: +pracaInfo.objetivo[1].toFixed(2), hp: 1200, r: 3.2 },
    { id: 'mercearia', x: +mercearia.porta.x.toFixed(2), z: +mercearia.porta.z.toFixed(2), hp: 1200, r: 2.6 },
    { id: 'igreja', x: +igrejaInfo.frente[0].toFixed(2), z: +igrejaInfo.frente[1].toFixed(2), hp: 1200, r: 3.0 },
  ];

  return { foodSpots, foodMeshes, foodColliders, portas, lojas, hordeObjectives, becos, becoAreas: extras.becoAreas, glb: extras.glb, setores: setores(),
    censo: { edificacoes, postes, calcadas: calcadas.length, becos: becos.length, colisores: colliders.length }, root };
}

/* ── JANELA E PORTA ─────────────────────────────────────────────────────────────────── */
/* (cx,cy,cz) é o centro do vão NO PLANO da parede; +z local sai da parede. Vidro 0,08 m
   atrás da frente da moldura, grade de barra 0,04 a cada 0,12 m. Tudo vai para lote. */
function janela(ex, cx, cy, cz, ry, w, h, gradeada) {
  const cs = Math.cos(ry), sn = Math.sin(ry);
  const p = (lista, lx, ly, lz, sx, sy, sz) => lista.push(mtx(cx + lx * cs + lz * sn, cy + ly, cz - lx * sn + lz * cs, sx, sy, sz, ry));
  const m = 0.09, f = 0.11;
  p(ex.vao, 0, 0, 0.01, w, h, 0.02);
  const acesa = ex.rj() < 0.22;
  p(acesa ? ex.vidroAceso : ex.vidro, 0, 0, f - 0.08, w - 0.04, h - 0.04, 0.01);
  (acesa ? ex.vidroAcesoCor : ex.vidroCor).push(new THREE.Color(CORTINAS[(ex.rj() * CORTINAS.length) | 0]));
  p(ex.moldura, 0, h / 2 + m / 2, f / 2, w + 2 * m, m, f);
  p(ex.moldura, 0, -h / 2 - 0.03, 0.09, w + 0.3, 0.06, 0.18);
  for (const s of [-1, 1]) p(ex.moldura, s * (w / 2 + m / 2), 0, f / 2, m, h, f);
  if (!gradeada) return;
  const zg = f + 0.03;
  for (let lx = -w / 2 + 0.06; lx <= w / 2 - 0.05; lx += 0.12) p(ex.grade, lx, 0, zg, 0.04, h + 0.04, 0.04);
  for (const ly of [-h / 2 + 0.02, 0, h / 2 - 0.02]) p(ex.grade, 0, ly, zg, w + 0.04, 0.04, 0.04);
}

// cortina desbotada: bege, azul, rosa, verde, mostarda e branco encardido
const CORTINAS = [0xd8c6a8, 0xa8bccc, 0xdcb0aa, 0xb8c8a2, 0xe0c482, 0xeae4d6];

function porta(ex, cx, cy, cz, ry) {
  const cs = Math.cos(ry), sn = Math.sin(ry);
  const p = (lista, lx, ly, lz, sx, sy, sz) => lista.push(mtx(cx + lx * cs + lz * sn, cy + ly, cz - lx * sn + lz * cs, sx, sy, sz, ry));
  p(ex.porta, 0, 0, 0.03, 0.92, 2.15, 0.05);
  p(ex.moldura, 0, 1.12, 0.05, 1.18, 0.09, 0.1);
  for (const s of [-1, 1]) p(ex.moldura, s * 0.51, 0, 0.05, 0.09, 2.2, 0.1);
}

/* ── CASA TÉRREA / SOBRADO ─────────────────────────────────────────────────────────── */
function casa(kit, campo, rnd, x, z, w, d, ry, alt, cor, paredeMat = null, aberta = false) {
  const { MAT, caixa, placa } = kit;
  const y = kit.ambiente ? Math.max(...[-1,1].flatMap(a=>[-1,1].map(b=>campo.amostra(x+a*w/2,z+b*d/2)))) : campo.amostra(x,z);
  if(kit.ambiente)campo.plataforma(x-w/2-.4,x+w/2+.4,z-d/2-.4,z+d/2+.4,y);
  const parede = paredeMat || MAT.reboco[cor % MAT.reboco.length];
  if(aberta) construirInterior(kit,{x,z,y,w,d,ry,parede});
  else {
    caixa(w, alt, d, parede, x, y, z, { ry });
    caixa(w + 0.04, 1.1, d + 0.04, MAT.barra, x, y, z, { ry, collide: false, cast: false });
  }
  const cume = alt > 5 ? 1.3 : 1.1;
  if(kit.ambiente==='vila'){
    const geo=new THREE.BufferGeometry(),a=w/2+.5,b=d/2+.5;
    geo.setAttribute('position',new THREE.Float32BufferAttribute([-a,0,-b,a,0,-b,0,cume,-b,-a,0,b,0,cume,b,a,0,b,-a,0,-b,0,cume,-b,0,cume,b,-a,0,-b,0,cume,b,-a,0,b,a,0,-b,a,0,b,0,cume,b,a,0,-b,0,cume,b,0,cume,-b],3));
    geo.setIndex(Array.from({length:6},(_,i)=>[i*3,i*3+2,i*3+1]).flat());
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(Array.from({length:18},(_,i)=>[i%3===1?1:0,i%3===2?1:0]).flat(),2));geo.computeVertexNormals();
    const roof=new THREE.Mesh(geo,MAT.telha);roof.position.set(x,y+alt,z);roof.rotation.y=ry;roof.castShadow=true;roof.receiveShadow=true;kit.root.add(roof);kit.occluders.push(roof);
    (kit.root.userData.coberturas ||= []).push({tipo:'duas-aguas',x,z,y:y+alt,h:cume,w:a,d:b,cos:Math.cos(ry),sin:Math.sin(ry)});
    for(const sx of [-w/2,w/2])kit.caixa(.18,alt,.24,MAT.reboco[1],x+sx*Math.cos(ry)+d/2*Math.sin(ry),y,z-sx*Math.sin(ry)+d/2*Math.cos(ry),{ry,nome:'cunhal-portugues'});
  }
  const telhado = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.76, cume, 4), rnd() < 0.15 ? MAT.fibrocimento : MAT.telha);
  telhado.position.set(x, y + alt + cume / 2, z);
  telhado.rotation.y = ry + Math.PI / 4;
  telhado.castShadow = true; telhado.receiveShadow = true;
  if(kit.ambiente!=='vila'){kit.root.add(telhado); kit.occluders.push(telhado);}
  const cs = Math.cos(ry), sn = Math.sin(ry);
  const frente = (ox, oy, oz) => [x + ox * cs + oz * sn, y + oy, z - ox * sn + oz * cs];
  const ex = kit.ex;
  const [px, py, pz] = frente(0, 1.1, d / 2);
  if(!aberta) porta(ex, px, py, pz, ry);
  for (const ox of [-w / 4 - 0.4, w / 4 + 0.4]) {
    const [jx, jy, jz] = frente(ox, 1.65, d / 2);
    const acesa=ex.rr()<.7;
    if(!aberta) janela(ex, jx, jy, jz, ry, 1.1, 1.0, acesa);
  }
  if (alt > 5) {
    const [lx, ly, lz] = frente(0, alt * 0.52, d / 2 + 0.02);
    placa(w * 0.86, 0.12, 0.6, MAT.calcada, lx, ly, lz, ry);
  }
  return 1;
}

function construirAmbiente(kit,campo,rnd,ambiente){
  const {MAT,caixa,piso,root}=kit,foodSpots=[],foodMeshes=new Map(),foodColliders=new Map(),lojas=[],portas=[];
  kit.ambiente=ambiente;kit.ex=novosExtras();
  root.userData.layoutAmbiente=ambiente==='rural'?'fazendas-patios':'vila-praca-ruelas';
  const via=(pts,largura,mat)=>{
    (root.userData.vias ||= []).push({pts,largura});
    for(let i=1;i<pts.length;i++){
      const a=pts[i-1],b=pts[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.6);
      for(let j=0;j<=n;j++){const t=j/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;piso(largura,.75,mat,x,z,campo.amostra(x,z)+.025,'chao-caminho').rotateZ(Math.atan2(b[0]-a[0],b[1]-a[1]));}
    }
  };
  if(ambiente==='rural'){
    via([[-36,-12],[-8,-12],[4,0],[5,25],[24,36]],7,MAT.terra);
    via([[-36,20],[-12,20],[5,10],[36,10]],5,MAT.terra);
    for(const [x,z] of [[-19,-2],[19,-17]])casa(kit,campo,rnd,x,z,9,10,0,6,0,MAT.madeira,true);
    for(const [x,z,ry] of [[-24,-25,0],[22,25,Math.PI],[-25,28,Math.PI/2]])casa(kit,campo,rnd,x,z,6,6,ry,3,0);
    for(const [x,z] of [[23,-29],[29,-29]]){
      const y=campo.amostra(x,z),silo=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.2,7,16),MAT.medidor);
      silo.position.set(x,y+3.5,z);silo.castShadow=true;silo.receiveShadow=true;root.add(silo);kit.occluders.push(silo);kit.colisor(x,z,2.2,2.2,y,y+7,0);
      const topo=new THREE.Mesh(new THREE.ConeGeometry(2.4,1.5,16),MAT.zinco);topo.position.set(x,y+7.75,z);topo.name='telhado-silo';root.add(topo);kit.occluders.push(topo);
      (root.userData.coberturas ||= []).push({tipo:'cone',lados:16,x,z,y:y+7,h:1.5,r:2.4,cos:1,sin:0});
    }
    for(const [x,z] of [[-15,-27],[17,24],[-24,13]])for(const side of [-1,1]){
      for(let i=-4;i<=4;i+=2){const px=x+i,pz=z+side*4,y=campo.amostra(px,pz);caixa(.15,1.3,.15,MAT.madeira,px,y,pz,{nome:'mourao-curral'});}
      caixa(9,.14,.14,MAT.madeira,x,campo.amostra(x,z)+.65,z+side*4,{nome:'travessa-curral'});
    }
  }else{
    via([[-36,-10],[-6,-10],[0,0],[8,13],[36,18]],4,MAT.bloquete);
    via([[-8,-36],[-8,-10],[0,0],[-8,18],[-8,36]],4,MAT.bloquete);
    for(let x=-5;x<=5;x+=1)for(let z=-5;z<=5;z+=1)piso(1,1,MAT.bloquete,x,z,campo.amostra(x,z)+.025,'chao-praca-vila');
    const casas=[[-23,-24,0],[-15,-24,0],[9,-26,.08],[25,-20,-Math.PI/2],[-24,-3,Math.PI/2],[24,4,-Math.PI/2],[-24,17,Math.PI/2],[-16,25,Math.PI],[10,25,Math.PI],[26,24,Math.PI]];
    casas.forEach(([x,z,ry],i)=>casa(kit,campo,rnd,x,z,6.5,6.5,ry,6,i%2,MAT.rebocoIgreja,i<2));
    for(const [x,z] of [[-15,9],[14,-12],[16,5]]){
      const y=campo.amostra(x,z);caixa(6,.95,.22,MAT.bloco,x,y,z,{nome:'muro-patio'});
      for(const dx of [-3,3])caixa(.22,.95,4,MAT.bloco,x+dx,y,z+2,{nome:'muro-patio'});
    }
  }
  const pontosLojas=ambiente==='rural'?[['racao',-13,12],['mercearia',17,2]]:[['mercearia',-13,1],['padaria',12,-6],['boteco',25,-7]];
  for(const [papel,x,z] of pontosLojas){
    const b={x0:x-5,x1:x+5,z0:z-4.5,z1:z+4.5,ax:'i',az:'i',sx:Math.sign(x)||1,sz:Math.sign(z)||1};
    const l=loja(kit,campo,rnd,b,papel);l.aberta=true;l.comercio=papel;lojas.push(l);portas.push(l.porta);
    criarFood(kit,campo,foodSpots,foodMeshes,foodColliders,`saque-${papel}`,'racao',...l.porta.dentro);
    foodSpots.at(-1).loja=papel;foodSpots.at(-1).r=1.15;
  }
  const comidas=ambiente==='rural'?[[-18.5,-9.5],[17.5,-8.5],[-10.5,23.5],[11.5,27.5],[-28.5,-13.5],[27.5,13.5],[2.5,-24.5],[1.5,16.5]]:[[-.5,-7.5],[7.5,1.5],[-5.5,7.5],[17.5,-15.5],[-17.5,14.5],[16.5,21.5],[-18.5,-15.5],[3.5,-20.5]];
  comidas.forEach(([x,z],i)=>{
    const id=`alimento-${ambiente}-${i}`;criarFood(kit,campo,foodSpots,foodMeshes,foodColliders,id,'racao',x,z);
    const m=foodMeshes.get(id),box=new THREE.Box3().setFromObject(m);m.scale.y=.25/(box.max.y-m.position.y);const c=foodColliders.get(id);c.maxY=c.minY+.25;
  });
  construirExtras(kit,kit.ex);telhadosEmLote(kit);
  const hordeObjectives=foodSpots.slice(0,3).map((s,i)=>({id:`polo-${i}`,x:s.x,z:s.z,hp:1200,r:3}));
  return {foodSpots,foodMeshes,foodColliders,lojas,portas,hordeObjectives,becos:[],becoAreas:[],glb:kit.ex.glb,setores:setores(),censo:{edificacoes:lojas.length+(ambiente==='rural'?5:10),postes:0,calcadas:0,becos:0,colisores:kit.colliders.length},root};
}

function quarteiraoCasas(kit, campo, rnd, b, sobrados) {
  const { MAT, caixa } = kit;
  const largura = b.x1 - b.x0, fundo = b.z1 - b.z0;
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  let n = 0;
  const primeiraAberta=['OS-oo','LS-oo','OS-oi','LS-io'].includes(b.id);
  const construirCasa=(...args)=>{
    if(!primeiraAberta)return casa(...args,null,false);
    if(n===0){args.splice(3,6,cx,cz,largura-1.2,fundo-1.2,0,6);return casa(...args,null,true);}
    rnd();kit.ex.rr();kit.ex.rr();return 0;
  };
  const giro = () => (rnd() < 0.22 ? (rnd() - 0.5) * 0.49 : 0);
  if (largura >= 11 && fundo >= 11) {
    n += construirCasa(kit, campo, rnd, b.x0 + 3.5, b.z0 + 4.2, 6.4, 7.6, giro(), sobrados ? 6 : 3, (rnd() * 4) | 0);
    n += construirCasa(kit, campo, rnd, b.x1 - 3.4, b.z1 - 3.9, 6.2, 7.0, giro() + Math.PI, 3, (rnd() * 4) | 0);
    n += construirCasa(kit, campo, rnd, b.x1 - 3.0, b.z0 + 3.4, 4.6, 5.2, giro() + Math.PI / 2, sobrados > 1 ? 6 : 3, (rnd() * 4) | 0);
  } else if (largura >= fundo) {
    n += construirCasa(kit, campo, rnd, cx - largura / 4, cz, 5.4, fundo - 2.6, giro(), sobrados ? 6 : 3, (rnd() * 4) | 0);
    n += construirCasa(kit, campo, rnd, cx + largura / 4, cz, 5.0, fundo - 3.2, giro(), 3, (rnd() * 4) | 0);
  } else {
    n += construirCasa(kit, campo, rnd, cx, cz - fundo / 4, largura - 2.6, 5.4, giro() + Math.PI / 2, sobrados ? 6 : 3, (rnd() * 4) | 0);
    n += construirCasa(kit, campo, rnd, cx, cz + fundo / 4, largura - 3.2, 5.0, giro() + Math.PI / 2, 3, (rnd() * 4) | 0);
  }
  muroDeFundo(kit, campo, rnd, b, '', primeiraAberta);
  quintal(kit, campo, rnd, b, primeiraAberta);
  return n;
}

/* Muro de fundo e de divisa: 1,80 m, 2,20 m na esquina. É o que transforma quarteirão em
   labirinto para a horda. `pular` guarda a face da fachada: muro ali sela a porta da loja. */
function muroDeFundo(kit, campo, rnd, b, pular = '', abrirFrente=false) {
  const { MAT } = kit;
  const lados = [
    ['z0', b.x0, b.x1, b.z0, b.z0, 'z'], ['z1', b.x0, b.x1, b.z1, b.z1, 'z'],
    ['x0', b.x0, b.x0, b.z0, b.z1, 'x'], ['x1', b.x1, b.x1, b.z0, b.z1, 'x'],
  ];
  for (const [nome, x0, x1, z0, z1, eixo] of lados) {
    if (nome === pular) continue;
    if (rnd() < 0.45) continue;
    const alt = rnd() < 0.25 ? 2.2 : 1.8;
    const esp = alt > 2 ? 0.2 : 0.15;
    const y = campo.amostra((x0 + x1) / 2, (z0 + z1) / 2);
    if (eixo === 'z') {
      const comp = (x1 - x0) * (0.55 + rnd() * 0.4);
      const px=(x0+x1)/2+(rnd()-.5)*1.2;
      if(!abrirFrente||nome!=='z1')kit.caixa(comp,alt,esp,MAT.bloco,px,y,z0,{});
    } else {
      const comp = (z1 - z0) * (0.55 + rnd() * 0.4);
      kit.caixa(esp, alt, comp, MAT.bloco, x0, y, (z0 + z1) / 2 + (rnd() - 0.5) * 1.2, {});
    }
  }
}

function quintal(kit, campo, rnd, b, livre=false) {
  const { MAT, caixa, piso } = kit;
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  piso(b.x1 - b.x0 - 0.4, b.z1 - b.z0 - 0.4, MAT.terraQuintal, cx, cz, 0.006, 'chao-quintal');
  if (rnd() < 0.55) {
    const y = campo.amostra(cx, cz);
    if(!livre)kit.caixa(1.1, 1.4, 1.1, MAT.caixaDagua, b.x0 + 1.4, y + 2.9, b.z1 - 1.5, { collide: false });
    if(!livre)kit.caixa(0.12, 2.9, 0.12, MAT.metal, b.x0 + 1.4, y, b.z1 - 1.5, { collide: false, cast: false });
  }
  if(rnd()<.5){const px=cx+(rnd()-.5)*3,pz=cz+(rnd()-.5)*3,ry=rnd()*3;if(!livre)kit.caixa(1.8,.9,1.2,MAT.caixote,px,campo.amostra(cx,cz),pz,{ry});}
}

/* ── LOJA COM INTERIOR ─────────────────────────────────────────────────────────────── */
/* Índices em LETREIROS (texturas): nome na fachada, anúncio pintado ao lado da porta e
   anúncio na parede lateral. */
const LOJA_LETREIRO = { padaria: [0, 8, 5], mercearia: [1, 7, 4], boteco: [2, 6, -1], racao: [3, 9, -1], farmacia: [5, 5, -1], acougue: [4, 4, -1] };

function loja(kit, campo, rnd, b, papel) {
  const { MAT, caixa, piso, placa } = kit;
  /* A fachada olha para a rua mais perto: loja que abre para o fundo do quarteirão é loja
     que a horda nunca acha, e o pedido do dono é que ela ENTRE. */
  const eixo = b.ax === 'i' && b.az === 'i' ? 'z' : (b.ax === 'o' ? 'x' : 'z');
  const largX = b.x1 - b.x0, largZ = b.z1 - b.z0;
  const W = Math.min(8.4, (eixo === 'z' ? largX : largZ) - 0.8);
  const D = Math.min(7.2, (eixo === 'z' ? largZ : largX) - 0.8);
  const alt = 3.4, esp = 0.22, vao = 2.7;
  const sinal = eixo === 'z' ? -b.sz : -b.sx;
  const cx = eixo === 'z' ? (b.x0 + b.x1) / 2 : (b.sx < 0 ? b.x1 - D / 2 - 0.3 : b.x0 + D / 2 + 0.3);
  const cz = eixo === 'z' ? (b.sz < 0 ? b.z1 - D / 2 - 0.3 : b.z0 + D / 2 + 0.3) : (b.z0 + b.z1) / 2;
  const mundo = (n, l) => (eixo === 'z' ? [cx + l, cz + n] : [cx + n, cz + l]);
  const dims = (dn, dl) => (eixo === 'z' ? [dl, dn] : [dn, dl]);

  const [mw, md] = dims(D, W);
  const y = kit.ambiente?Math.max(...[-1,1].flatMap(a=>[-1,1].map(b=>campo.amostra(cx+a*mw/2,cz+b*md/2)))):campo.amostra(cx,cz);
  const soleira=y+SOLEIRA;
  campo.plataforma(cx - mw / 2, cx + mw / 2, cz - md / 2, cz + md / 2, soleira);
  const [pw, pd] = dims(D - 0.3, W - 0.3);
  piso(pw, pd, MAT.ceramica, cx, cz, soleira + 0.004, 'chao-loja');

  const parede = (n, l, h, dn, dl, base = y) => {
    const [px, pz] = mundo(n, l);
    const [w, d] = dims(dn, dl);
    caixa(w, h, d, MAT.rebocoLoja, px, base, pz, {});
  };
  const meio = (W - vao) / 2;
  const face = sinal * (D / 2 - esp / 2);
  for (const s of [-1, 1]) parede(face, s * (vao + meio) / 2, alt, esp, meio);
  parede(face, 0, alt - 2.4, esp, vao, y + 2.4);
  parede(-face, 0, alt, esp, W);
  for (const s of [-1, 1]) parede(0, s * (W / 2 - esp / 2), alt, D, esp);

  const cume = 1.2;
  const telhado = new THREE.Mesh(new THREE.ConeGeometry(Math.max(W, D) * 0.76, cume, 4), papel === 'racao' ? MAT.fibrocimento : MAT.telha);
  telhado.position.set(cx, y + alt + cume / 2, cz);
  telhado.rotation.y = Math.PI / 4;
  telhado.castShadow = true; telhado.receiveShadow = true;
  kit.root.add(telhado); kit.occluders.push(telhado);

  const [nome, anuncio, lateral] = LOJA_LETREIRO[papel];
  const ryFora = eixo === 'z' ? (sinal > 0 ? 0 : Math.PI) : (sinal > 0 ? Math.PI / 2 : -Math.PI / 2);
  const ex = kit.ex;
  // letreiro na testeira do beiral (o beiral avança ~0,9 m): rente à parede o telhado o cortava
  const lw = Math.min(4.2, W * 0.55), [lx, lz] = mundo(sinal * (D / 2 + 1.0), 0), [bx0, bz0] = mundo(sinal * (D / 2 + 0.965), 0);
  ex.letreiro.push({ i: nome, x: lx, y: y + alt + 0.05, z: lz, ry: ryFora, w: lw, h: lw / 3.5 });
  ex.moldura.push(mtx(bx0, y + alt + 0.05, bz0, eixo === 'z' ? lw + 0.12 : 0.06, lw / 3.5 + 0.12, eixo === 'z' ? 0.06 : lw + 0.12));
  // um lado da porta com porta de aço baixada, o outro com o anúncio pintado na parede
  const ladoAco = papel.length % 2 ? 1 : -1;
  const [ax, az] = mundo(sinal * (D / 2 + 0.16), ladoAco * (vao + meio) / 2);
  ex.rua.push({ id: 'porta_aco', x: ax, z: az, y, h: 2.4, ry: ryFora });
  const [px2, pz2] = mundo(sinal * (D / 2 + 0.03), -ladoAco * (vao + meio) / 2);
  ex.letreiro.push({ i: anuncio, x: px2, y: y + 1.75, z: pz2, ry: ryFora, w: Math.min(2.5, meio - 0.3), h: Math.min(2.5, meio - 0.3) / 3.5 * 1.25 });
  if (lateral >= 0) {
    const lado = eixo === 'z' ? -b.sx : -b.sz;
    const [sx2, sz2] = mundo(0, lado * (W / 2 + 0.03));
    const ryLado = eixo === 'z' ? (lado > 0 ? Math.PI / 2 : -Math.PI / 2) : (lado > 0 ? 0 : Math.PI);
    ex.letreiro.push({ i: lateral, x: sx2, y: y + 2.0, z: sz2, ry: ryLado, w: 3.2, h: 3.2 / 3.5 });
  }

  // balcão e prateleiras: é o que dá leitura de loja ao interior, em vez de caixa oca
  const [bx, bz] = mundo(-sinal * 1.9, 0);
  const [bw, bd] = dims(0.7, 3.0);
  caixa(bw, 1.05, bd, MAT.madeira, bx, soleira, bz, {});
  for (const s of [-1, 1]) {
    const [sx, sz] = mundo(-sinal * (D / 2 - 0.8), s * (W / 2 - 1.3));
    const [sw, sd] = dims(0.42, 2.0);
    caixa(sw, 1.8, sd, MAT.prateleira, sx, soleira, sz, {});
  }
  if (rnd() < 0.8) {
    const [tx, tz] = mundo(sinal * (D / 2 + 0.7), 0);
    const [tw, td] = dims(1.5, W * 0.6);
    placa(tw, 0.08, td, MAT.toldo[papel.length % 3], tx, y + 2.55, tz, 0, sinal * (eixo === 'z' ? 0.14 : -0.14));
  }

  if (papel === 'boteco') {
    for (const [lat, nor, giro] of [[1.5, 1.7, 0.4], [2.3, 2.0, -0.3], [3.0, 1.5, 2.6], [-1.6, 1.8, 3.4], [-2.4, 1.6, 1.2]]) {
      const [cx2, cz2] = mundo(sinal * (D / 2 + nor), lat);
      ex.rua.push({ id: 'cadeira_plastico', x: cx2, z: cz2, y: campo.amostra(cx2, cz2), h: 0.86, ry: ryFora + giro });
    }
  }
  const [portaX, portaZ] = mundo(sinal * (D / 2 + 1.1), 0);
  /* `dentro` fica entre a porta e o balcão: a 2,1 m do centro ele caía DENTRO do colisor
     do balcão, e nó dentro de sólido é destino que ninguém alcança (relato do modo). */
  const [dentroX, dentroZ] = mundo(sinal * (D / 2 - 1.1), 0);
  return { papel, aberta: papel === 'mercearia', eixo, sinal, fundo: D, largura: W, porta: { x: portaX, z: portaZ, vao: mundo(face, 0), dentro: [dentroX, dentroZ] }, interior: [cx, cz] };
}

function portaSaque(kit, loja, grupo) {
  const geo = new THREE.BoxGeometry(2.6, 2.25, .08, 1, 36, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + .035 * Math.cos(p.getY(i) * Math.PI * 16));
  geo.computeVertexNormals();
  for (const estado of ['inteiro', 'revirado']) {
    const porta = new THREE.Mesh(geo, kit.MAT.medidor);
    porta.name = estado === 'inteiro' ? 'porta-fechada' : 'porta-arrombada';
    porta.position.set(loja.porta.vao[0] - grupo.position.x, 1.15, loja.porta.vao[1] - grupo.position.z);
    porta.rotation.order = 'YXZ';
    porta.rotation.y = loja.eixo === 'z' ? 0 : Math.PI / 2;
    if (estado === 'revirado') {
      porta.rotation.x = -1.45; porta.position.y = .2; porta.scale.x = .65;
      porta.position[loja.eixo === 'z' ? 'x' : 'z'] -= 1.7;
    }
    porta.castShadow = true; porta.receiveShadow = true;
    grupo.getObjectByName(estado).add(porta);
    grupo.userData.foodOccluders[estado].push(porta);
    if (estado === 'inteiro') kit.occluders.push(porta);
  }
}

/* ── IGREJINHA E PRAÇA ─────────────────────────────────────────────────────────────── */
function igrejinha(kit, campo, b) {
  const { MAT, caixa, placa } = kit;
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const y = campo.amostra(cx, cz);
  const paraCidade = b.sz < 0 ? 1 : -1;
  caixa(6.6, 5.2, 7.0, MAT.rebocoIgreja, cx, y, cz, { ry: 0.06 });
  const telhado = new THREE.Mesh(new THREE.ConeGeometry(5.1, 1.7, 4), MAT.telha);
  telhado.position.set(cx, y + 5.2 + 0.85, cz); telhado.rotation.y = Math.PI / 4 + 0.06;
  telhado.castShadow = true; kit.root.add(telhado); kit.occluders.push(telhado);
  caixa(2.2, 9.8, 2.2, MAT.rebocoIgreja, cx - 2.0, y, cz + paraCidade * 2.6, { ry: 0.06 });
  // portal e sino: o campanário é o único volume que compete com a copa da mata
  placa(1.6, 2.6, 0.12, MAT.vao, cx + 0.9, y, cz + paraCidade * 3.56, 0.06);
  placa(1.0, 1.4, 0.1, MAT.vao, cx - 2.0, y + 7.6, cz + paraCidade * 3.72, 0.06);
  placa(0.18, 1.5, 0.18, MAT.metal, cx - 2.0, y + 10.5, cz + paraCidade * 2.6, 0);
  placa(1.1, 0.14, 0.14, MAT.metal, cx - 2.0, y + 10.1, cz + paraCidade * 2.6, 0);
  return { malhas: 2, frente: [cx + 0.9, b.sz < 0 ? b.z1 + 1.7 : b.z0 - 1.7] };
}

/* Praça com CORREDOR de feira, não anel de bancas. O anel selava o miolo: a horda
   chegava na praça e o objetivo ficava numa coroa sem saída (medido na navegação). */
function praca(kit, campo, rnd, b) {
  const { MAT, caixa, piso, placa } = kit;
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  campo.plataforma(b.x0, b.x1, b.z0, b.z1, 0.18);
  piso(b.x1 - b.x0, b.z1 - b.z0, MAT.bloquete, cx, cz, 0.184, 'chao-praca');
  const y = 0.18;
  const coretoZ = cz + 4.1;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 6.283;
    placa(0.2, 2.6, 0.2, MAT.madeira, cx + Math.cos(a) * 2.0, y, coretoZ + Math.sin(a) * 2.0, 0);
  }
  const cobertura = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.1, 6), MAT.telha);
  cobertura.position.set(cx, y + 3.1, coretoZ); cobertura.castShadow = true;
  kit.root.add(cobertura); kit.occluders.push(cobertura);
  caixa(4.4, 0.35, 4.4, MAT.bloquete, cx, y, coretoZ, { collide: false, cast: false });
  colisorRedondo(kit, cx, coretoZ, 2.4, y, y + 3.2);
  /* Duas fileiras com corredor de 5,6 m no meio: as posições 1 e 3 de cada fileira são
     foodSpots de feira, então a banca que o bicho revira É uma banca da feira. */
  const feira = [];
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const bx = cx + (s<0?-.6:3.3), bz = cz - 4.6 + i * 2.5;
    if (i % 2) { feira.push([bx, bz]); continue; }
    banca(kit, bx, bz, y, s > 0 ? Math.PI / 2 : -Math.PI / 2, MAT.toldo[(i + (s > 0 ? 1 : 0)) % 3]);
  }
  for (const [ox, oz] of [[-5.2, -4.4], [5.2, -4.4], [-5.2, 1.8], [5.2, 1.8]])
    caixa(1.7, 0.45, 0.5, MAT.madeira, cx + ox, y, cz + oz, { ry: (rnd() - 0.5) * 0.3 });
  // torre da caixa d'água: o marco alto que a referência de arte pede no miolo
  const tx = b.x0 + 2.0, tz = b.z1 - 2.0, ty = campo.amostra(tx, tz);
  construirTorre(kit,campo,tx,tz,rnd()*.3);
  // luz de verdade só nos quatro postes da praça; os da rua só brilham (emissivo)
  for (const [lx, lz] of [[b.x0 + 0.7, b.z0 + 0.7], [b.x1 - 0.7, b.z0 + 0.7], [b.x1 - 0.7, b.z1 - 0.7], [b.x0 + 0.7, b.z1 - 0.7]]) {
    const luz = new THREE.PointLight(0xffb070, 8, 11, 2);
    luz.position.set(lx, y + 3.55, lz); luz.name = 'praca-luz';
    kit.root.add(luz);
  }
  return { objetivo: [cx, cz - 2.0], feira };
}

/* Puxadinho ATRÁS da loja, e só quando sobra fundo de lote. Antes ele nascia em cima do
   balcão no quarteirão pequeno e selava o interior — a horda não entrava. */
function puxadinho(kit, campo, rnd, b, l) {
  const { MAT, caixa } = kit;
  const paraFora = l.eixo === 'z' ? 'z' : 'x';
  const bloco = paraFora === 'z' ? b.z1 - b.z0 : b.x1 - b.x0;
  const sobra = bloco - l.fundo - 0.6;
  const face = paraFora === 'z' ? (l.sinal > 0 ? 'z1' : 'z0') : (l.sinal > 0 ? 'x1' : 'x0');
  muroDeFundo(kit, campo, rnd, b, face);
  if (sobra < 3.6) return 0;
  const recuo = 1.7;
  const cx = paraFora === 'x' ? (l.sinal > 0 ? b.x0 + recuo : b.x1 - recuo) : (b.x0 + b.x1) / 2;
  const cz = paraFora === 'z' ? (l.sinal > 0 ? b.z0 + recuo : b.z1 - recuo) : (b.z0 + b.z1) / 2;
  const y = campo.amostra(cx, cz);
  const ry = (rnd() - 0.5) * 0.2;
  caixa(3.2, 2.7, 3.0, MAT.bloco, cx, y, cz, { ry });
  kit.placa(3.4, 0.14, 3.2, MAT.fibrocimento, cx, y + 2.7, cz, ry, 0.1);
  return 1;
}

function banca(kit, x, z, y, ry, toldoMat) {
  const { MAT, caixa, placa } = kit;
  caixa(2.0, 0.85, 1.0, MAT.madeira, x, y, z, { ry });
  for (const s of [-1, 1]) placa(0.08, 1.35, 0.08, MAT.metal, x + Math.cos(ry) * s * 0.9, y + 0.85, z - Math.sin(ry) * s * 0.9, ry);
  placa(2.3, 0.08, 1.3, toldoMat, x, y + 2.2, z, ry, 0.12);
  for (let i = 0; i < 3; i++) placa(0.5, 0.3, 0.38, MAT.caixote, x - 0.7 + i * 0.7, y + 0.85, z, ry);
}

function colisorRedondo(kit, x, z, raio, minY, maxY) {
  kit.colliders.push({ minX: x - raio, maxX: x + raio, minY, maxY, minZ: z - raio, maxZ: z + raio });
}

/* ── POSTES E FIAÇÃO ───────────────────────────────────────────────────────────────── */
function fiacao(kit, campo, rnd, ex) {
  const { MAT } = kit;
  const borda = AV + CAL - 0.45;
  /* Cada LINHA de postes é uma calçada: o cabo só fecha vão entre vizinhos da mesma
     linha. Ligar todo par a menos de 16 m virava rede cruzando a avenida inteira. */
  const linhas = [];
  for (const s of [-1, 1]) {
    const ao = [], través = [];
    /* ±19 e ±31: em ±14 o poste caía na frente da porta das lojas e furava o toldo; 0 era
       o meio do cruzamento. Cinco posições continuam lendo o `rnd` (ordem da mata). */
    for (const t of [-31, -19, null, 19, 31]) { ao.push(t === null ? null : [s * borda, t]); través.push(t === null ? null : [t, s * borda]); }
    linhas.push(ao, través);
  }
  const postes = [];
  const vistos = new Set();
  const cabos = [];
  const L = { fuste: [], cruzeta: [], braco: [], luminaria: [], lente: [], trafo: [] };
  for (const linha of linhas) {
    const topo = [];
    for (const ponto of linha) {
      rnd();
      if (!ponto) { topo.push(null); continue; }
      const [x, z] = ponto;
      const k = `${x.toFixed(2)}|${z.toFixed(2)}`;
      const y = campo.amostra(x, z);
      if (!vistos.has(k)) {
        vistos.add(k);
        const naNS = Math.abs(Math.abs(x) - borda) < 1e-6;
        const ry = naNS ? (x > 0 ? -Math.PI / 2 : Math.PI / 2) : (z > 0 ? Math.PI : 0);
        const dx = Math.sin(ry), dz = Math.cos(ry);
        L.fuste.push(mtx(x, y + 4.5, z, 1, 1, 1));
        L.cruzeta.push(mtx(x, y + 8.35, z, 1.5, 0.12, 0.12, ry + Math.PI / 2));
        L.braco.push(mtx(x + dx * 0.65, y + 7.75, z + dz * 0.65, 0.05, 0.05, 1.2, ry));
        L.luminaria.push(mtx(x + dx * 1.25, y + 7.9, z + dz * 1.25, 0.24, 0.12, 0.5, ry));
        L.lente.push(mtx(x + dx * 1.27, y + 7.835, z + dz * 1.27, 0.18, 0.02, 0.38, ry));
        if (postes.length % 3 === 1) L.trafo.push(mtx(x - dx * 0.42, y + 6.3, z - dz * 0.42, 1, 1, 1));
        kit.colliders.push({ minX: x - 0.17, maxX: x + 0.17, minY: y, maxY: y + 9, minZ: z - 0.17, maxZ: z + 0.17 });
        postes.push([x, y + 8.4, z]);
      }
      topo.push([x, y + 8.35, z]);
    }
    for (let i = 0; i + 1 < topo.length; i++) if (topo[i] && topo[i + 1]) cabos.push([topo[i], topo[i + 1]]);
  }
  /* Poste do beco: luminária baixa (4,5 m) virada para dentro e trafo; a luz pontual é a
     de luzDosBecos, aqui só a peça. */
  for (const { x, y, z, lum: [lx, ly, lz] } of ex.postesBeco) {
    const ry = Math.atan2(lx - x, lz - z), dx = Math.sin(ry), dz = Math.cos(ry), braco = Math.hypot(lx - x, lz - z);
    L.fuste.push(mtx(x, y + 4.5, z, 1, 1, 1));
    L.cruzeta.push(mtx(x, y + 8.35, z, 1.5, 0.12, 0.12, ry + Math.PI / 2));
    L.braco.push(mtx(x + dx * braco / 2, y + ly + 0.14, z + dz * braco / 2, 0.05, 0.05, braco, ry));
    L.luminaria.push(mtx(lx, y + ly + 0.06, lz, 0.24, 0.12, 0.5, ry));
    L.lente.push(mtx(lx, y + ly - 0.005, lz, 0.18, 0.02, 0.38, ry));
    L.trafo.push(mtx(x - dx * 0.42, y + 6.3, z - dz * 0.42, 1, 1, 1));
    kit.colliders.push({ minX: x - 0.17, maxX: x + 0.17, minY: y, maxY: y + 9, minZ: z - 0.17, maxZ: z + 0.17 });
    postes.push([x, y + 8.4, z]);
  }
  const fusteGeo = new THREE.CylinderGeometry(0.10, 0.17, 9, 12);
  const uv = fusteGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.85 / 2.5, uv.getY(i) * 9 / 2.5);
  const lote = (lista, geo, mat, nome, solido = false, sombra = true) => {
    const m = new THREE.InstancedMesh(geo, mat, lista.length);
    lista.forEach((mt, i) => m.setMatrixAt(i, mt));
    m.name = nome; m.castShadow = sombra; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true;
    if (solido) kit.occluders.push(m); else m.userData.nonSolidSurface = true;
    m.computeBoundingSphere(); kit.root.add(m);
  };
  const cubo = new THREE.BoxGeometry(1, 1, 1);
  lote(L.fuste, fusteGeo, MAT.poste, 'poste', true);
  lote(L.cruzeta, cubo, MAT.metal, 'poste-cruzeta');
  lote(L.braco, cubo, MAT.metal, 'poste-braco', false, false);
  lote(L.luminaria, cubo, MAT.cabo, 'poste-luminaria');
  lote(L.lente, cubo, MAT.luminaria, 'poste-lente', false, false);
  const trafoGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.85, 12);
  lote(L.trafo, trafoGeo, MAT.medidor, 'poste-trafo');
  const seg = new THREE.BoxGeometry(1, 0.045, 0.045);
  const matrizes = [];
  const _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const eixoX = new THREE.Vector3(1, 0, 0), dir = new THREE.Vector3();
  const fio = (a, b, off, f) => {
    const nx = -(b[2] - a[2]), nz = b[0] - a[0];
    const comp = Math.hypot(nx, nz) || 1;
    for (let k = 0; k < 6; k++) {
      const t0 = k / 6, t1 = (k + 1) / 6;
      const flecha = (t) => -f * 4 * t * (1 - t);
      const x0 = a[0] + (b[0] - a[0]) * t0 + off * nx / comp, z0 = a[2] + (b[2] - a[2]) * t0 + off * nz / comp;
      const x1 = a[0] + (b[0] - a[0]) * t1 + off * nx / comp, z1 = a[2] + (b[2] - a[2]) * t1 + off * nz / comp;
      const y0 = a[1] + (b[1] - a[1]) * t0 + flecha(t0), y1 = a[1] + (b[1] - a[1]) * t1 + flecha(t1);
      const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
      _p.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      _q.setFromUnitVectors(eixoX, dir.set(x1 - x0, y1 - y0, z1 - z0).normalize());
      _s.set(len, 1, 1);
      matrizes.push(new THREE.Matrix4().compose(_p, _q, _s));
    }
  };
  for (const [a, b] of cabos) for (let c = 0; c < 3; c++) fio(a, b, (c - 1) * 0.3, 0.9);
  for (const [a, b, f] of ex.fiosBeco) fio(a, b, 0, f);
  if (matrizes.length) {
    const cabos = new THREE.InstancedMesh(seg, MAT.cabo, matrizes.length);
    for (let i = 0; i < matrizes.length; i++) cabos.setMatrixAt(i, matrizes[i]);
    cabos.name = 'fiacao'; cabos.instanceMatrix.needsUpdate = true;
    cabos.userData.nonSolidSurface = true;
    cabos.computeBoundingSphere();
    kit.root.add(cabos);
  }
  return postes.length;
}

/* ── LIXO, COMIDA E ESTRAGO ────────────────────────────────────────────────────────── */
const MEIA_EXT = { lixo: 0.45, cacamba: 1.5, feira: 0.9, racao: 0.5 };
const HP_PADRAO = { lixo: 90, feira: 150, cacamba: 220, racao: 120 };

function criarFood(kit, campo, foodSpots, foodMeshes, foodColliders, id, kind, x, z) {
  const { MAT } = kit;
  const grupo = new THREE.Group();
  grupo.name = `food-${id}`;
  grupo.userData.foodId = id;
  const y = campo.amostra(x, z);
  const inteiro = new THREE.Group(), revirado = new THREE.Group();
  const meia = MEIA_EXT[kind];
  const malha = (geo, mat, px, py, pz, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz); m.rotation.y = ry;
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  const cubo = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const saco = (alvo, px, py, pz, ry, e) => {
    const o = usaGLB('saco_lixo') ? placeProp('saco_lixo', { x: px, y: py, z: pz, targetH: 0.62 * e, ry }) : malha(sacoGeo(), MAT.saco, px, py, pz, ry);
    const a = amassaSaco(x + px, z + pz);
    if (!o.isMesh) { o.rotation.set(a.rx, ry, a.rz, 'YXZ'); o.scale.multiply(new THREE.Vector3(...a.esc)); o.traverse((m) => { m.castShadow = false; }); alvo.add(o); return; }
    o.scale.setScalar(e); alvo.add(o);
  };
  if (kind === 'lixo') {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * 6.283;
      saco(inteiro, Math.cos(a) * 0.3, i === 2 ? 0.28 : 0, Math.sin(a) * 0.3, a, 1.05);
    }
    inteiro.add(malha(cubo(0.73, 1.07, 0.58), MAT.lixeira, 0.55, 0.53, -0.3, 0.4));
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 6.283, r = 0.5 + (i % 3) * 0.35;
      saco(revirado, Math.cos(a) * r, 0, Math.sin(a) * r, a, 0.65);
    }
    revirado.add(malha(cubo(1.07, 0.58, 0.73), MAT.lixeira, 0.6, 0.29, -0.4, 0.9));
  } else if (kind === 'cacamba') {
    inteiro.add(malha(cubo(3.0, 1.2, 1.6), MAT.cacamba, 0, 0.85, 0));
    inteiro.add(malha(cubo(2.8, 0.3, 1.4), MAT.entulho, 0, 1.5, 0));
    for (const s of [-1, 1]) inteiro.add(malha(cubo(0.3, 0.25, 1.5), MAT.metal, s * 1.2, 0.12, 0));
    revirado.add(malha(cubo(3.0, 1.2, 1.6), MAT.cacamba, 0, 0.85, 0));
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * 6.283, r = 1.4 + (i % 3) * 0.4;
      const pedaco = malha(cubo(0.38, 0.17, 0.26), MAT.entulho, Math.cos(a) * r, 0.09, Math.sin(a) * r, a * 2.3);
      pedaco.rotation.z = (i % 3 - 1) * 0.35;
      revirado.add(pedaco);
    }
  } else if (kind === 'feira') {
    inteiro.add(malha(cubo(1.8, 0.85, 0.95), MAT.madeira, 0, 0.42, 0));
    for (let i = 0; i < 4; i++) inteiro.add(malha(cubo(0.5, 0.32, 0.38), MAT.caixote, -0.6 + i * 0.42, 1.0, 0, i * 0.3));
    revirado.add(malha(cubo(1.8, 0.85, 0.95), MAT.madeira, 0, 0.3, 0, 0.22));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 6.283, r = 0.8 + (i % 2) * 0.5;
      revirado.add(malha(cubo(0.42, 0.26, 0.3), MAT.caixote, Math.cos(a) * r, 0.13, Math.sin(a) * r, a));
    }
  } else {
    for (let i = 0; i < 6; i++) inteiro.add(malha(cubo(0.8, 0.25, 0.45), MAT.racao, (i % 2) * 0.12, 0.13 + i * 0.25, 0, i * 0.18));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 6.283;
      revirado.add(malha(cubo(0.8, 0.2, 0.45), MAT.racao, Math.cos(a) * 0.7, 0.1, Math.sin(a) * 0.7, a + 0.4));
    }
  }
  inteiro.name = 'inteiro'; revirado.name = 'revirado'; revirado.visible = false;
  grupo.add(inteiro); grupo.add(revirado);
  grupo.position.set(x, y, z);
  /* Lixo é superfície pisável, não teto: quem barra o corpo é o colisor do monte, que o
     modo encolhe conforme o hp cai. Sem esta marca a sonda do map-check acusa saco rasgado. */
  grupo.userData.nonSolidSurface = true;
  kit.root.add(grupo);
  grupo.userData.foodOccluders = { inteiro: [], revirado: [] };
  for (const estado of [inteiro, revirado]) estado.traverse(o => {
    if (!o.isMesh) return;
    o.userData.foodId = id;
    grupo.userData.foodOccluders[estado.name].push(o);
    if (estado === inteiro) kit.occluders.push(o);
  });

  const altura = kind === 'cacamba' ? 1.5 : kind === 'feira' ? 1.1 : 0.9;
  const col = { minX: x - meia, maxX: x + meia, minY: y, maxY: y + altura, minZ: z - meia, maxZ: z + meia };
  kit.colliders.push(col);
  foodColliders.set(id, col);
  foodMeshes.set(id, grupo);
  foodSpots.push({ id, x: +x.toFixed(2), z: +z.toFixed(2), hp: HP_PADRAO[kind], kind, r: +(meia + 0.4).toFixed(2) });
}

// fallback do GLB `saco_lixo` (node ou ?glb=0): esfera com nó no topo e fundo assentado
let _sacoGeo = null;
function sacoGeo() {
  if (_sacoGeo) return _sacoGeo;
  const g = new THREE.SphereGeometry(0.3, 14, 10);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = (y + 0.3) / 0.6;
    const aperto = t > 0.8 ? 0.3 + (1 - t) * 2.2 : 1;
    const ruga = 1 + 0.07 * Math.sin(x * 31 + z * 17) + 0.05 * Math.sin(y * 40 + x * 9);
    x *= aperto * ruga; z *= aperto * ruga;
    if (y < -0.16) y = -0.16 + (y + 0.16) * 0.2;
    p.setXYZ(i, x * 1.05, y, z * 0.92);
  }
  g.translate(0, 0.17, 0);
  g.computeVertexNormals();
  return (_sacoGeo = g);
}

/* Saco amassado: escala por eixo e inclinação sorteadas pela POSIÇÃO (não gasta o sorteio
   da cidade). Saco em pé e redondo lia ovo de páscoa (crítico, rodada 3). */
const _hash = (x, z, k) => { const v = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v); };
export function amassaSaco(x, z, tombado = false) {
  const h = (k) => _hash(x, z, k), esc = [1 + 0.3 * h(4), 0.7 + 0.2 * h(5), 1 + 0.3 * h(6)];
  if (tombado) return { rx: 1.45, rz: (h(3) - 0.5) * 0.4, esc, dy: 0.2 };
  const incl = (15 + 15 * h(1)) * Math.PI / 180, dir = h(2) * 6.283;
  return { rx: Math.cos(dir) * incl, rz: Math.sin(dir) * incl, esc, dy: 0 };
}
// monte de n sacos (o último tombado) com lixo vazado no chão até 0,8 m do centro
function monteDeSacos(ex, cx, cz, y, n, h = 0.55) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + _hash(cx, cz, 10 + i), d = i ? 0.28 + 0.14 * _hash(cz, cx, 20 + i) : 0.05;
    const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, m = amassaSaco(x, z, i === n - 1);
    out.push({ id: 'saco_lixo', x, z, y: y + m.dy, dy: m.dy, h: h * (0.85 + 0.3 * _hash(x, z, 7)), ry: _hash(x, z, 8) * 6.283, rx: m.rx, rz: m.rz, esc: m.esc, monte: true });
  }
  for (let i = 0; i < 3; i++) {
    const a = _hash(cx, cz, 30 + i) * 6.283, d = 0.35 + 0.45 * _hash(cx, cz, 40 + i);
    ex.decal.push({ k: [4, 2, 3][i], x: cx + Math.cos(a) * d, y: y + 0.028, z: cz + Math.sin(a) * d, s: 0.6 + 0.4 * _hash(cz, cx, 50 + i), ry: a });
  }
  return out;
}

/* Lixo cênico: não é foodSpot, é o estrago. Tudo em UMA InstancedMesh por família e
   marcado `nonSolidSurface` — peça solta de 0,3 m não pode virar teto na sonda do mapa. */
function lixoSolto(kit, campo, rnd, glb) {
  const { MAT } = kit;
  const sacos = [], caixotes = [];
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const mtx = (x, y, z, ry, e) => {
    _e.set(0, ry, 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(e, e, e);
    return new THREE.Matrix4().compose(_p, _q, _s);
  };
  for (let i = 0; i < 54; i++) {
    const perto = rnd() < 0.6;
    let x, z;
    if (perto) {
      const eixo = rnd() < 0.5;
      const s = rnd() < 0.5 ? -1 : 1;
      const t = (rnd() - 0.5) * 2 * (CIDADE_R - 2);
      const o = s * (AV + 0.6 + rnd() * (CAL - 0.3));
      x = eixo ? o : t; z = eixo ? t : o;
    } else {
      x = (rnd() - 0.5) * 2 * (CIDADE_R - 3); z = (rnd() - 0.5) * 2 * (CIDADE_R - 3);
    }
    const y = campo.amostra(x, z);
    const saco = rnd() < 0.55, ry = rnd() * 6.283, e = saco ? 0.5 + rnd() * 0.5 : 0.7 + rnd() * 0.6;
    const id = saco ? 'saco_lixo' : 'caixa_papelao';
    if (hasProp(id)) { if (i % 2 === 0) glb.push({ id, x, z, h: saco ? 0.35 + e * 0.3 : 0.28 + e * 0.12, ry }); continue; }
    (saco ? sacos : caixotes).push(mtx(x, y + (saco ? 0 : 0.16), z, ry, e));
  }
  const add = (lista, geo, mat, nome) => {
    if (!lista.length) return;
    const m = new THREE.InstancedMesh(geo, mat, lista.length);
    for (let i = 0; i < lista.length; i++) m.setMatrixAt(i, lista[i]);
    m.name = nome; m.castShadow = true; m.receiveShadow = true;
    m.instanceMatrix.needsUpdate = true; m.userData.nonSolidSurface = true;
    m.computeBoundingSphere();
    kit.root.add(m);
  };
  add(sacos, sacoGeo(), MAT.saco, 'lixo-saco-solto');
  add(caixotes, new THREE.BoxGeometry(0.5, 0.32, 0.38), MAT.caixote, 'lixo-caixote-solto');
}

/* Lixo pequeno de avenida: decalque no chão (papel, lata, poça, comida) e peça GLB na
   sarjeta e na calçada. Nada disso tem colisor: é o estrago, não obstáculo. */
const CEL_SARJETA = [1, 2, 2, 3, 3, 4, 5, 6, 6, 7], CEL_PISTA = [0, 0, 1, 1, 2, 7], CEL_CALCADA = [2, 3, 5, 5, 6, 7];
function lixoDeRua(kit, campo, ex, pontos) {
  const r = ex.rr;
  const pick = (l) => l[(r() * l.length) | 0];
  for (const eixoNS of [true, false]) {
    for (let i = 0; i < 72; i++) {
      const t = (r() - 0.5) * 2 * (CIDADE_R - 1.5), s = r() < 0.5 ? -1 : 1, u = r();
      const [atr, cel] = u < 0.55 ? [s * (AV - 0.12 - r() * 1.1), pick(CEL_SARJETA)]
        : u < 0.8 ? [s * (AV + 0.25 + r() * (CAL - 0.5)), pick(CEL_CALCADA)] : [(r() - 0.5) * 2 * (AV - 1.2), pick(CEL_PISTA)];
      const [x, z] = eixoNS ? [atr, t] : [t, atr];
      ex.decal.push({ k: cel, x, y: campo.amostra(x, z) + 0.022, z, s: cel === 0 ? 1.0 + r() * 1.6 : 0.4 + r() * 0.6, ry: r() * 6.283 });
    }
    for (let i = 0; i < 18; i++) {
      const t = (r() - 0.5) * 2 * (CIDADE_R - 2), s = r() < 0.5 ? -1 : 1;
      if (Math.abs(t) < AV + CAL) continue;
      const atr = r() < 0.6 ? s * (AV - 0.25 - r() * 0.3) : s * (AV + 0.4 + r() * (CAL - 0.8));
      const [x, z] = eixoNS ? [atr, t] : [t, atr];
      const [id, h] = [['lata_enferrujada', 0.26], ['saco_lixo', 0.55], ['lata_enferrujada', 0.22]][i % 3];
      ex.rua.push({ id, x, z, y: campo.amostra(x, z), h, ry: r() * 6.283 });
    }
  }
  // sinalização gasta: eixo amarelo tracejado, faixa de pedestre, remendo e rachadura
  for (const s of [-1, 1]) {
    for (let t = AV + CAL + 2; t < CIDADE_R - 1; t += 6) {
      ex.decal.push({ k: 9, x: 0, y: 0.034, z: s * t, w: 0.14, h: 2.8, ry: 0 });
      ex.decal.push({ k: 9, x: s * t, y: 0.034, z: 0, w: 0.14, h: 2.8, ry: Math.PI / 2 });
    }
    for (let a = -AV + 1; a <= AV - 1; a += 1.0) {
      ex.decal.push({ k: 8, x: a, y: 0.034, z: s * (AV + 1.4), w: 0.5, h: 2.6, ry: 0 });
      ex.decal.push({ k: 8, x: s * (AV + 1.4), y: 0.034, z: a, w: 0.5, h: 2.6, ry: Math.PI / 2 });
    }
  }
  for (let i = 0; i < 48; i++) {
    const t = (r() - 0.5) * 2 * (CIDADE_R - 2), a = (r() - 0.5) * 2 * (AV - 0.8), ns = i % 2 === 0;
    const [x, z] = ns ? [a, t] : [t, a];
    const k = i % 3 ? 10 : 11;
    ex.decal.push({ k, x, y: 0.03, z, w: 0.9 + r() * 2.2, h: 0.8 + r() * 1.6, ry: (ns ? 0 : Math.PI / 2) + (r() - 0.5) * 0.3 });
  }
  for (const [sx, sz] of QUADRANTES) {
    const cx = sx * (AV + 1.0), cz = sz * (AV + 1.0), y = campo.amostra(cx, cz);
    ex.rua.push({ id: 'lixeira_metal', x: cx, z: cz, y, h: 0.85, ry: r() * 6.283 });
    for (const [ox, oz, id, h] of [[0.6, 0.1, 'saco_lixo', 0.6], [0.2, 0.65, 'saco_lixo', 0.5], [-0.5, 0.4, 'caixa_papelao', 0.4]]) {
      ex.rua.push({ id, x: cx + ox * sx, z: cz + oz * sz, y, h, ry: r() * 6.283 });
    }
    for (let i = 0; i < 4; i++) ex.decal.push({ k: [2, 4, 6, 1][i], x: cx + (r() - 0.3) * 1.6 * sx, y: y + 0.02, z: cz + (r() - 0.3) * 1.6 * sz, s: 0.6 + r() * 0.5, ry: r() * 6.283 });
  }
  for (const [, kind, px, pz] of pontos) {
    if (kind !== 'lixo') continue;
    for (let i = 0; i < 6; i++) {
      const a = r() * 6.283, d = 0.6 + r() * 1.4, x = px + Math.cos(a) * d, z = pz + Math.sin(a) * d;
      ex.decal.push({ k: [2, 3, 4, 4, 6, 1][i], x, y: campo.amostra(x, z) + 0.024, z, s: 0.5 + r() * 0.5, ry: r() * 6.283 });
    }
  }
}

/* Lixo encostado na guia, ~1 peça por metro, no que a câmera do centro vê: braço norte e as
   duas guias da avenida leste-oeste. Sorteio próprio: o `ex.rr` move o lixo dos becos. */
function lixoDaGuia(campo, ex) {
  const r = lcg(0x9a1a), pick = (l) => l[(r() * l.length) | 0], ini = AV + CAL + 0.5;
  const linhas = [];
  for (const s of [-1, 1]) linhas.push((t) => [s * (AV - 0.22), -t]);
  for (const s of [-1, 1]) for (const lado of [-1, 1]) linhas.push((t) => [s * t, lado * (AV - 0.22)]);
  const lista = [];
  for (const em of linhas) for (let t = ini; t < 30; t += 0.7 + r() * 0.6) {
    const [x0, z0] = em(t), ox = (r() - 0.5) * 0.25, x = Math.abs(x0) < AV ? x0 - Math.sign(x0) * r() * 0.3 : x0 + ox, z = Math.abs(z0) < AV ? z0 - Math.sign(z0) * r() * 0.3 : z0 + ox;
    lista.push({ k: pick(CEL_SARJETA), x, y: campo.amostra(x, z) + 0.023, z, s: 0.9 + r() * 0.6, ry: r() * 6.283 });
  }
  ex.decal.push(...lista);
  ex.lixoGuia = lista.length;
  // lata de 0,28 m a cada 3 m nos primeiros 15 m: decalque deitado mudava 1–4 px da faixa
  const q = lcg(0x1a7a), pecas = [];
  for (const em of linhas) for (let t = ini + 0.6; t < ini + 15; t += 3) {
    const [x, z] = em(t), tomba = q() < 0.6;
    pecas.push({ id: 'lata_enferrujada', x, z, y: campo.amostra(x, z) + (tomba ? 0.09 : 0), h: 0.28, ry: q() * 6.283, rz: tomba ? Math.PI / 2 : 0 });
  }
  if (usaGLB('lata_enferrujada')) ex.rua.push(...pecas);
  return pecas;
}

/* Uma caçamba por quarteirão, encostada na guia (avenida) ou no anel de terra (fundo). O
   colisor é o mesmo em node e no navegador; o GLB só troca a aparência. */
function cacambas(kit, campo, ex, pontos) {
  for (const b of blocos()) {
    let x, z, aoLongoZ;
    if (b.ax === 'i') { x = b.sx * (AV - 0.95); z = b.sz * (b.az === 'i' ? 18.75 : 26.25); aoLongoZ = true; }
    else if (b.az === 'i') { z = b.sz * (AV - 0.95); x = b.sx * 26.25; aoLongoZ = false; }
    else { x = b.sx * 28.5; z = b.sz * 33.4; aoLongoZ = false; }
    if (pontos.some(([, , px, pz]) => Math.hypot(px - x, pz - z) < 3.5)) continue;
    const y = campo.amostra(x, z);
    const [hx, hz] = aoLongoZ ? [0.62, 1.0] : [1.0, 0.62];
    kit.colliders.push({ minX: x - hx, maxX: x + hx, minY: y, maxY: y + 1.3, minZ: z - hz, maxZ: z + hz });
    if (usaGLB('dumpster')) ex.rua.push({ id: 'dumpster', x, z, y, h: 1.3, ry: aoLongoZ ? 0 : Math.PI / 2, solido: true });
    else kit.caixa(2 * hx, 1.25, 2 * hz, kit.MAT.cacamba, x, y, z, { collide: false, bala: true });
  }
}

/* Telhados de 4 águas num lote por material: eram 25 malhas, uma chamada de desenho cada.
   A tampa de baixo é o forro de tábua do beiral (a telha vista por baixo lia tábua preta). */
function telhadosEmLote(kit) {
  const forro = kit.aoMat ? kit.aoMat(kit.MAT.madeira) : kit.MAT.madeira;
  const parte = (g, mi, claro) => {
    const gr = g.groups.find((x) => (x.materialIndex > 0 ? 1 : 0) === mi), p = g.clone();
    p.setIndex(Array.from(g.index.array.slice(gr.start, gr.start + gr.count))); p.clearGroups();
    const n = p.toNonIndexed(), pos = n.attributes.position, cor = new Float32Array(pos.count * 3).fill(claro);
    if (mi === 1) for (let i = 0; i < pos.count; i++) n.attributes.uv.setXY(i, pos.getX(i) / 1.2, pos.getZ(i) / 1.2);
    return n.setAttribute('color', new THREE.BufferAttribute(cor, 3));
  };
  kit.root.updateMatrixWorld(true);
  const porMat = new Map(), base = new THREE.Matrix4().copy(kit.root.matrixWorld).invert(), m4 = new THREE.Matrix4();
  kit.root.traverse((o) => {
    if (!o.isMesh || o.geometry.type !== 'ConeGeometry' || o.geometry.parameters.radialSegments !== 4) return;
    const p=o.geometry.parameters;
    (kit.root.userData.coberturas ||= []).push({x:o.position.x,z:o.position.z,y:o.position.y-p.height/2,h:p.height,r:p.radius,cos:Math.cos(o.rotation.y),sin:Math.sin(o.rotation.y)});
    if (!porMat.has(o.material)) porMat.set(o.material, []);
    porMat.get(o.material).push(o);
  });
  for (const [mat, lista] of porMat) {
    const geos = lista.map((o) => o.geometry.clone().applyMatrix4(m4.multiplyMatrices(base, o.matrixWorld)));
    const telha = mergeGeometries(geos.map((g) => parte(g, 0, 1)), false), tabua = mergeGeometries(geos.map((g) => parte(g, 1, 1.6)), false);
    const lote = new THREE.Mesh(mergeGeometries([telha, tabua], true), [mat, forro]);
    lote.name = 'telhado-lote'; lote.castShadow = true; lote.receiveShadow = true;
    for (const o of lista) { o.parent.remove(o); o.geometry.dispose(); const i = kit.occluders.indexOf(o); if (i >= 0) kit.occluders.splice(i, 1); }
    kit.root.add(lote); kit.occluders.push(lote);
  }
}

/* Uma luz de sódio só, que pula para o beco mais perto da câmera (quatro custavam ~9% do quadro).
   Cone virado para o chão: a pontual acendia o forro do beiral de laranja (C* 11 → 29). */
function luzDosBecos(kit, postes) {
  const lampadas = postes.map((p) => new THREE.Vector3(p.lum[0], p.y + p.lum[1] - 0.15, p.lum[2]));
  const luz = new THREE.SpotLight(0xffc48a, 32, 12, 1.1, 0.6, 2);
  luz.name = 'beco-luz'; luz.position.copy(lampadas[0]); luz.target.position.set(lampadas[0].x, 0, lampadas[0].z);
  kit.root.add(luz, luz.target);
  // triângulo degenerado sem corte de frustum: é ele que recebe a câmera a cada quadro
  const guia = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3)), kit.MAT.cabo);
  guia.name = 'beco-luz-guia'; guia.frustumCulled = false; guia.castShadow = false; guia.userData.nonSolidSurface = true;
  guia.onBeforeRender = (r, s, cam) => {
    if (!cam?.isPerspectiveCamera) return;
    let melhor = lampadas[0], d2 = Infinity;
    for (const l of lampadas) { const d = (l.x - cam.position.x) ** 2 + (l.z - cam.position.z) ** 2; if (d < d2) { d2 = d; melhor = l; } }
    if (!luz.position.equals(melhor)) {
      luz.position.copy(melhor); luz.target.position.set(melhor.x, 0, melhor.z);
      luz.updateMatrixWorld(); luz.target.updateMatrixWorld();
    }
  };
  // halo de 0,6 m que encara a câmera: a captura não passa pelo bloom, então o brilho é dele
  const disco = new THREE.RingGeometry(0, 0.6, 24, 2), pos = disco.attributes.position, alfa = [];
  for (let i = 0; i < pos.count; i++) { const t = 1 - Math.hypot(pos.getX(i), pos.getY(i)) / 0.6; alfa.push(1, 1, 1, t * t); }
  disco.setAttribute('color', new THREE.Float32BufferAttribute(alfa, 4));
  const halo = new THREE.Mesh(disco, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc48a).multiplyScalar(2), vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.name = 'beco-luz-halo'; halo.frustumCulled = false; halo.castShadow = false; halo.userData.nonSolidSurface = true;
  kit.root.add(guia, halo);
  const antes = guia.onBeforeRender;
  guia.onBeforeRender = (r, s, cam) => {
    antes(r, s, cam);
    if (!cam?.isPerspectiveCamera) return;
    halo.visible = cam.position.y < 15 && luz.position.distanceToSquared(cam.position) < 900;
    halo.position.set(luz.position.x, luz.position.y + 0.12, luz.position.z); halo.quaternion.copy(cam.quaternion);
    halo.updateMatrixWorld();
  };
}

/* Cena do eixo da câmera do centro (rua do conceito D): caçamba na guia da avenida
   oeste, monte de sacos na esquina da praça e mesa de bar na calçada da mercearia. */
function cenaDaRua(kit, campo, ex) {
  const { MAT } = kit;
  const [cx, cz] = [-10.6, -(AV - 0.95)], cy = campo.amostra(cx, cz);
  kit.colliders.push({ minX: cx - 1.0, maxX: cx + 1.0, minY: cy, maxY: cy + 1.3, minZ: cz - 0.62, maxZ: cz + 0.62 });
  if (usaGLB('dumpster')) ex.rua.push({ id: 'dumpster', x: cx, z: cz, y: cy, h: 1.3, ry: Math.PI / 2, solido: true });
  else kit.caixa(2.0, 1.25, 1.24, MAT.cacamba, cx, cy, cz, { collide: false, bala: true });
  const r = lcg(0x5ac0);
  const sacos = [];
  for (let i = 0; i < 9; i++) {
    const a = r() * 6.283, d = 0.15 + r() * 0.75, x = -6.95 + Math.cos(a) * d * 0.6, z = -9.4 + Math.sin(a) * d;
    const m = amassaSaco(x, z, i === 3);
    sacos.push({ id: 'saco_lixo', x, z, y: campo.amostra(x, z) + (i > 6 ? 0.32 : 0) + m.dy, h: 0.5 + r() * 0.2, ry: r() * 6.283, rx: m.rx, rz: m.rz, esc: m.esc, monte: true });
  }
  monteDeSacos(ex, -6.95, -9.4, campo.amostra(-6.95, -9.4), 0);
  ex.rua.push(...sacos, { id: 'caixa_papelao', x: -6.5, z: -10.5, y: campo.amostra(-6.5, -10.5), h: 0.42, ry: 0.4 });
  const mesas = [[7.05, -9.9], [7.05, -12.4]], cadeiras = [];
  for (const [mx, mz] of mesas) for (const [ox, oz, g] of [[-0.62, 0.1, -1.4], [0.55, -0.15, 1.7], [0.05, 0.62, 3.2]]) {
    cadeiras.push({ id: 'cadeira_plastico', x: mx + ox, z: mz + oz, y: campo.amostra(mx + ox, mz + oz), h: 0.86, ry: g });
  }
  ex.rua.push(...cadeiras);
  const tampo = new THREE.BoxGeometry(0.72, 0.035, 0.72).translate(0, 0.72, 0);
  const pernas = [-1, 1].flatMap((a) => [-1, 1].map((b) => new THREE.CylinderGeometry(0.022, 0.026, 0.72, 6).translate(a * 0.31, 0.36, b * 0.31)));
  const geo = mergeParts([tampo, ...pernas]);
  const im = new THREE.InstancedMesh(geo, MAT.lixeiraAmarela, mesas.length);
  mesas.forEach(([mx, mz], i) => im.setMatrixAt(i, mtx(mx, campo.amostra(mx, mz), mz, 1, 1, 1, 0.3 * i)));
  im.name = 'rua-mesa-bar'; im.castShadow = true; im.receiveShadow = true; im.userData.nonSolidSurface = true;
  im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); kit.root.add(im);
  kit.root.userData.cenaRua = { cacamba: [cx, cz], sacos: sacos.length, mesas: mesas.length, cadeiras: cadeiras.length };
}

/* ── BECOS ─────────────────────────────────────────────────────────────────────────── */
/* Um beco por lado, no quarteirão externo: liga o anel perimetral (pasto) à viela.
   Medidas e o porquê dos 2,5 m: docs/maps/invasao-javaporcos-layout.md, seção "Becos". */
export const BECO_MEIA = 1.25;
const BECO_FUNDO = 5.2;
// `fundo`: parede do outro lado da viela; o beco oeste dá na praça, que já é o fundo dele
const BECOS = {
  'LN-io': { id: 'beco-norte', nome: 'Beco do Medidor', fundo: true },
  'OS-io': { id: 'beco-sul', nome: 'Beco do Varal', fundo: true },
  'LS-oi': { id: 'beco-leste', nome: 'Beco do Botijão', fundo: true },
  'ON-oi': { id: 'beco-oeste', nome: 'Beco da Caixa', fundo: false },
};

/* Fundo do beco do outro lado da viela, na divisa do quarteirão: reboco descascado,
   barra de tinta, portão de aço e pichação. A rodada 2 via ali uma placa lisa (flat8 96%). */
function fundoDoBeco(kit, campo, ex, W, dims, cm, lf, ry, dIn) {
  const { MAT, caixa } = kit;
  const [x, z] = W(cm, lf), [w, d] = dims(4.6, 0.2), y = campo.amostra(x, z);
  caixa(w, 3.2, d, MAT.rebocoDesc[1], x, y, z, {});
  caixa(w + 0.04, 1.1, d + 0.04, MAT.barra, x, y, z, { collide: false, cast: false });
  const [gx, gz] = W(cm + 0.85, lf - dIn * 0.16);
  if (usaGLB('porta_aco')) ex.rua.push({ id: 'porta_aco', x: gx, z: gz, y, h: 2.4, ry });
  else porta(ex, gx, y + 1.1, gz, ry);
  const nx = Math.sin(ry), nz = Math.cos(ry);
  for (const [dc, alt, k, larg] of [[-1.25, 1.55, 12, 1.7], [0.9, 2.75, 13, 1.5]]) {
    const [qx, qz] = W(cm + dc, lf);
    ex.decal.push({ k, x: qx + nx * 0.125, y: y + alt, z: qz + nz * 0.125, w: larg, h: larg * 0.5, ry, deitado: false });
  }
}

function novosExtras() {
  return { glb: [], medidor: [], eletroduto: [], vao: [], grade: [], arame: [], roupa: [], roupaCor: [], botijao: [], saco: [], lixeira: [], becoAreas: [],
    vidro: [], vidroCor: [], vidroAceso: [], vidroAcesoCor: [], moldura: [], porta: [], decal: [], letreiro: [], rua: [], lixeiraTomb: [],
    postesBeco: [], fiosBeco: [],
    rr: lcg(0xbec0), rj: lcg(0x1a7e) };
}

const _mq = new THREE.Quaternion(), _me = new THREE.Euler(), _mp = new THREE.Vector3(), _ms = new THREE.Vector3();
const mtx = (x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) => {
  _me.set(rx, ry, rz); _mq.setFromEuler(_me); _mp.set(x, y, z); _ms.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_mp, _mq, _ms);
};

function quarteiraoBeco(kit, campo, rnd, b, def, ex) {
  const { MAT, caixa, piso, colliders } = kit;
  const aoLongoZ = b.az === 'o';
  const [c0, c1] = aoLongoZ ? [b.x0, b.x1] : [b.z0, b.z1];
  const [l0, l1] = aoLongoZ ? [b.z0, b.z1] : [b.x0, b.x1];
  const sOut = aoLongoZ ? b.sz : b.sx;
  const lOut = sOut < 0 ? l0 : l1, lIn = sOut < 0 ? l1 : l0, dIn = Math.sign(lIn - lOut);
  const cm = (c0 + c1) / 2, comp = Math.abs(lIn - lOut);
  const larg = (c1 - c0) / 2 - BECO_MEIA - 0.35;
  const W = (c, l) => (aoLongoZ ? [c, l] : [l, c]);
  const dims = (dc, dl) => (aoLongoZ ? [dc, dl] : [dl, dc]);
  const ryPara = (f) => (aoLongoZ ? (f > 0 ? 0 : Math.PI) : (f > 0 ? Math.PI / 2 : -Math.PI / 2));
  const parede = MAT.rebocoDesc;

  const altA = 6, altB = rnd() < 0.5 ? 6 : 3;
  const [ax, az] = W(cm - BECO_MEIA - larg / 2, lOut + dIn * BECO_FUNDO / 2);
  casa(kit, campo, rnd, ax, az, larg, BECO_FUNDO, ryPara(-dIn), altA, 0, parede[0]);
  const [bx, bz] = W(cm + BECO_MEIA + larg / 2, lIn - dIn * BECO_FUNDO / 2);
  casa(kit, campo, rnd, bx, bz, larg, BECO_FUNDO, ryPara(dIn), altB, 1, parede[1]);

  const muroC = (cc, la, lb, esp, alt, mat) => {
    const [x, z] = W(cc, (la + lb) / 2), [w, d] = dims(esp, Math.abs(lb - la));
    caixa(w, alt, d, mat, x, campo.amostra(x, z), z, {});
  };
  const muroL = (ll, ca, cb, esp, alt, mat) => {
    const [x, z] = W((ca + cb) / 2, ll), [w, d] = dims(Math.abs(cb - ca), esp);
    caixa(w, alt, d, mat, x, campo.amostra(x, z), z, {});
  };
  const quintal = comp - BECO_FUNDO;
  muroC(cm - BECO_MEIA - 0.1, lOut + dIn * BECO_FUNDO, lIn, 0.2, 2.2, parede[1]);
  muroC(cm + BECO_MEIA + 0.1, lOut, lOut + dIn * quintal, 0.2, 2.2, parede[0]);
  muroL(lIn - dIn * 0.08, c0 + 0.2, cm - BECO_MEIA - 0.2, 0.16, 1.9, MAT.bloco);
  muroC(c0 + 0.1, lOut + dIn * BECO_FUNDO, lIn - dIn * 0.16, 0.16, 1.9, MAT.bloco);
  muroL(lOut + dIn * 0.08, cm + BECO_MEIA + 0.2, c1 - 0.2, 0.16, 1.9, MAT.bloco);
  muroC(c1 - 0.1, lOut + dIn * 0.16, lOut + dIn * quintal, 0.16, 1.9, MAT.bloco);

  const [fx, fz] = W(cm, (lOut + lIn) / 2), [fw, fd] = dims(2 * BECO_MEIA, comp);
  piso(fw, fd, MAT.cimento, fx, fz, 0.026, 'chao-beco');
  for (const [cc, la, lb] of [[cm - BECO_MEIA - larg / 2, lOut + dIn * BECO_FUNDO, lIn], [cm + BECO_MEIA + larg / 2, lOut, lOut + dIn * quintal]]) {
    const [qx, qz] = W(cc, (la + lb) / 2), [qw, qd] = dims(larg, Math.abs(lb - la));
    piso(qw, qd, MAT.terraQuintal, qx, qz, 0.006, 'chao-quintal');
  }
  const [ex0, ez0] = W(cm - BECO_MEIA, lOut), [ex1, ez1] = W(cm + BECO_MEIA, lIn);
  ex.becoAreas.push([Math.min(ex0, ex1), Math.max(ex0, ex1), Math.min(ez0, ez1), Math.max(ez0, ez1)]);

  const caixaLocal = (lista, c, y, l, dc, h, dl) => {
    const [x, z] = W(c, l), [w, d] = dims(dc, dl);
    lista.push(mtx(x, y, z, w, h, d));
  };
  // medidor com eletroduto subindo ao beiral, um em cada casa, na face do beco
  for (const [lado, lm, alt] of [[-1, lOut + dIn * 1.5, altA], [1, lIn - dIn * 1.5, altB]]) {
    const cw = cm + lado * (BECO_MEIA - 0.07);
    caixaLocal(ex.medidor, cw, 1.68, lm, 0.13, 0.44, 0.34);
    caixaLocal(ex.eletroduto, cm + lado * (BECO_MEIA - 0.03), 1.9 + (alt - 2.0) / 2, lm, 0.05, alt - 2.0, 0.05);
  }
  // janela gradeada no térreo e (sobrado) no primeiro andar, olhando para dentro do beco
  for (const [lado, lm, alt] of [[-1, lOut + dIn * 3.6, altA], [1, lIn - dIn * 3.6, altB]]) {
    const ry = aoLongoZ ? -lado * Math.PI / 2 : (lado > 0 ? Math.PI : 0);
    for (const yb of alt > 5 ? [1.25, 4.05] : [1.25]) {
      const [jx, jz] = W(cm + lado * BECO_MEIA, lm);
      janela(ex, jx, yb + 0.5, jz, ry, 0.9, 1.0, true);
    }
  }
  // varal na parede do sobrado: dois suportes, o arame e as peças penduradas acima de 1,6 m
  const vl0 = lOut + dIn * 0.9, vl1 = lOut + dIn * 4.4, vc = cm - BECO_MEIA + 0.36;
  for (const lv of [vl0, vl1]) caixaLocal(ex.arame, cm - BECO_MEIA + 0.18, 2.32, lv, 0.36, 0.03, 0.03);
  caixaLocal(ex.arame, vc, 2.3, (vl0 + vl1) / 2, 0.012, 0.012, Math.abs(vl1 - vl0));
  const CORES = [0xc94f4f, 0x3c5e8c, 0xe0d9c4, 0x6f8f4a, 0xd9a441, 0x8a5a9a, 0x2f2f33];
  for (let t = 0.12; t < 0.95; t += 0.16 + rnd() * 0.06) {
    const lr = vl0 + (vl1 - vl0) * t, h = 0.45 + rnd() * 0.25, w = 0.32 + rnd() * 0.2;
    const [x, z] = W(vc, lr);
    ex.roupa.push(mtx(x, 2.3 - h / 2, z, w, h, 1, aoLongoZ ? Math.PI / 2 : 0));
    ex.roupaCor.push(new THREE.Color(CORES[(rnd() * CORES.length) | 0]));
  }
  // botijão encostado no muro, com colisor; lixo e lixeira tombada no fim do beco
  const [gx, gz] = W(cm + BECO_MEIA - 0.24, lOut + dIn * 1.1);
  ex.botijao.push(mtx(gx, 0.3, gz, 1, 1, 1, rnd() * 6.283));
  colliders.push({ minX: gx - 0.17, maxX: gx + 0.17, minY: 0, maxY: 0.62, minZ: gz - 0.17, maxZ: gz + 0.17 });
  for (let k = 0; k < 4; k++) {
    const [x, z] = W(cm - BECO_MEIA + 0.3 + rnd() * 0.25, lIn - dIn * (0.5 + k * 0.42));
    const e = 0.75 + rnd() * 0.45;
    ex.saco.push(mtx(x, 0.2 * e, z, e, e * 0.8, e, rnd() * 6.283));
  }
  const [lx, lz] = W(cm + BECO_MEIA - 0.42, lIn - dIn * (BECO_FUNDO + 0.6));
  ex.lixeira.push(mtx(lx, 0.27, lz, 0.55, 0.52, 0.8, rnd() * 6.283, 0, Math.PI / 2));

  // chão do beco: poça, óleo, papel, lata, comida, folha, sacola e barro (atlas único)
  const PESO = [0, 0, 1, 1, 1, 2, 3, 4, 4, 5, 6, 7, 7, 7, 10, 11, 11];
  for (let k = 0; k < 56; k++) {
    const cel = PESO[(ex.rr() * PESO.length) | 0];
    const [x, z] = W(cm + (ex.rr() - 0.5) * 2 * (BECO_MEIA - 0.3), lOut + dIn * ex.rr() * comp);
    const tam = cel === 0 ? 0.9 + ex.rr() * 0.9 : 0.45 + ex.rr() * 0.6;
    ex.decal.push({ k: cel, x, y: 0.034, z, s: tam, ry: ex.rr() * 6.283 });
  }
  for (let k = 0; k < 6; k++) {
    const lado = k % 2 ? 1 : -1, [x, z] = W(cm + lado * (BECO_MEIA - 0.22), lOut + dIn * (0.1 + 0.15 * k + ex.rr() * 0.1) * comp);
    ex.decal.push({ k: k % 3 ? 1 : 7, x, y: 0.035, z, w: aoLongoZ ? 0.5 : 1.8, h: aoLongoZ ? 1.8 : 0.5, ry: 0 });
  }
  const [tx0, tz0] = W(cm + BECO_MEIA - 0.42, (lOut + lIn) / 2 + dIn * 1.2);
  ex.lixeiraTomb.push(mtx(tx0, 0.29, tz0, 1, 1, 1, aoLongoZ ? 0.3 : Math.PI / 2 + 0.3, 0, Math.PI / 2));
  for (const [id, dc, dl, h] of [['saco_lixo', 0.5, 0.35, 0.55], ['saco_lixo', 0.75, 0.5, 0.5], ['caixa_papelao', 0.85, 0.55, 0.4],
    ['lata_enferrujada', 0.95, 0.6, 0.28], ['saco_lixo', 0.2, 0.62, 0.6], ['lata_enferrujada', 0.6, 0.3, 0.25]]) {
    const [x, z] = W(cm + (dc - 0.5) * 2 * (BECO_MEIA - 0.3), lOut + dIn * dl * comp), ry = ex.rr() * 6.283;
    if (id !== 'saco_lixo') ex.rua.push({ id, x, z, y: 0.026, h, ry });
    else if (dl === 0.35) ex.rua.push(...monteDeSacos(ex, x, z, 0.026, 4, h));
  }
  /* Poste de sódio na boca da viela, luminária a 4,5 m sobre o fundo do beco e fios
     cruzando o rasgo de céu acima dos beirais (a rodada 2 tinha perdido os dois). */
  const [px, pz] = W(cm + 0.9, lIn + dIn * 0.25), py = campo.amostra(px, pz);
  const [lux, luz] = W(cm + 0.2, lIn - dIn * 0.7);
  ex.postesBeco.push({ x: px, y: py, z: pz, lum: [lux, 4.5, luz] });
  const topo = [px, py + 8.35, pz];
  const ponto = (c, alt, l) => { const [x, z] = W(c, l); return [x, alt, z]; };
  // térreo amarra o fio num cano de entrada no telhado, senão o fio desce abaixo do beiral
  const altFioB = Math.max(altB + 0.75, 6.0);
  const beiralA = (l, d = 0) => ponto(cm - BECO_MEIA - 0.55, altA + 0.75 + d, l), beiralB = (l, d = 0) => ponto(cm + BECO_MEIA + 0.55, altFioB + d, l);
  if (altFioB > altB + 0.8) for (const lc of [lOut + dIn * 4.0, lOut + dIn * 5.4, lOut + dIn * 6.2, lOut + dIn * 7.4]) caixaLocal(ex.eletroduto, cm + BECO_MEIA + 0.55, (altB + altFioB + 0.6) / 2, lc, 0.06, altFioB + 0.6 - altB, 0.06);
  ex.fiosBeco.push([topo, beiralA(lOut + dIn * 1.0), 0.7], [topo, beiralB(lOut + dIn * 4.0), 0.5],
    [beiralA(lOut + dIn * 3.6), beiralB(lOut + dIn * 6.2), 0.35], [beiralA(lOut + dIn * 4.6, 0.3), beiralB(lOut + dIn * 7.4, 0.2), 0.3],
    [beiralA(lOut + dIn * 5.0, 0.6), beiralB(lOut + dIn * 5.4, 0.5), 0.4]);
  if (def.fundo) {
    const lf = lIn + dIn * (2 * VIELA + 0.1);
    fundoDoBeco(kit, campo, ex, W, dims, cm, lf, ryPara(-dIn), dIn);
    ex.fiosBeco.push([topo, ponto(cm - 1.6, py + 3.25, lf), 0.25]);
  }
  const glb = (id, c, l, h) => { const [x, z] = W(c, l); ex.glb.push({ id, x, z, h, ry: rnd() * 6.283 }); };
  glb('saco_lixo', cm - BECO_MEIA + 0.45, lIn - dIn * 0.7, 0.75);
  glb('saco_lixo', cm - BECO_MEIA + 0.4, lIn - dIn * 1.5, 0.6);
  // os dois sacos do muro viram um monte (o sorteio de cima continua o mesmo: a mata depende dele)
  const [sx0, sz0] = W(cm - BECO_MEIA + 0.5, lIn - dIn * 1.1);
  ex.glb.splice(ex.glb.length - 2, 2, ...monteDeSacos(ex, sx0, sz0, 0, 3, 0.62).map((g) => ({ ...g, y: undefined })));
  glb('caixa_papelao', cm - BECO_MEIA + 0.35, lIn - dIn * 2.3, 0.42);
  glb('lata_enferrujada', cm + BECO_MEIA - 0.25, lOut + dIn * 2.0, 0.3);
  glb('lixeira_metal', cm + BECO_MEIA - 0.42, lIn - dIn * (BECO_FUNDO + 0.6), 0.85);
  const [dx, dz] = W(cm, lOut - dIn * 0.6), [tx, tz] = W(cm, lIn + dIn * 0.6);
  return {
    casas: 2,
    contrato: { id: def.id, nome: def.nome, de: { x: +dx.toFixed(2), z: +dz.toFixed(2) }, ate: { x: +tx.toFixed(2), z: +tz.toFixed(2) },
      abreNaOnda: 3, largura: 2 * BECO_MEIA },
  };
}

/* Peças do beco em lote: uma InstancedMesh por família para os quatro becos juntos. As
   que não têm colisor levam `nonSolidSurface` — não são chão nem teto para a sonda. */
function construirExtras(kit, ex) {
  const { MAT, root, occluders } = kit;
  const lote = (lista, geo, mat, nome, { solido = false, cores = null, sombra = true } = {}) => {
    if (!lista.length) return;
    const m = new THREE.InstancedMesh(geo, mat, lista.length);
    for (let i = 0; i < lista.length; i++) { m.setMatrixAt(i, lista[i]); if (cores) m.setColorAt(i, cores[i]); }
    m.name = nome; m.castShadow = sombra; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    if (solido) occluders.push(m); else m.userData.nonSolidSurface = true;
    m.computeBoundingSphere();
    root.add(m);
  };
  const cubo = new THREE.BoxGeometry(1, 1, 1);
  lote(ex.medidor, cubo, MAT.medidor, 'beco-medidor');
  lote(ex.eletroduto, cubo, MAT.cabo, 'beco-eletroduto', { sombra: false });
  lote(ex.vao, cubo, MAT.vao, 'beco-janela', { sombra: false });
  lote(ex.vidro, cubo, MAT.janela, 'beco-vidro', { sombra: false, cores: ex.vidroCor });
  lote(ex.vidroAceso, cubo, MAT.janelaAcesa, 'beco-vidro-aceso', { sombra: false, cores: ex.vidroAcesoCor });
  lote(ex.moldura, cubo, MAT.barra, 'janela-moldura');
  lote(ex.porta, cubo, MAT.madeira, 'casa-porta', { sombra: false });
  lote(ex.grade, cubo, MAT.cabo, 'beco-grade');
  lote(ex.lixeiraTomb, new THREE.CylinderGeometry(0.3, 0.26, 0.8, 14), MAT.lixeiraAmarela, 'beco-lixeira-tombada');
  lote(ex.arame, cubo, MAT.cabo, 'beco-varal', { sombra: false });
  const roupaGeo = new THREE.PlaneGeometry(1, 1);
  lote(ex.roupa, roupaGeo, MAT.roupa, 'beco-roupa', { cores: ex.roupaCor });
  const botijaoGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.6, 14);
  lote(ex.botijao, botijaoGeo, MAT.botijao, 'beco-botijao', { solido: true });
  if (!hasProp('saco_lixo')) lote(ex.saco, sacoGeo(), MAT.saco, 'beco-saco');
  if (!hasProp('lixeira_metal')) lote(ex.lixeira, cubo, MAT.lixeiraAmarela, 'beco-lixeira');
  quads(kit, ex.decal.map((d) => ({ ...d, w: d.w ?? d.s, h: d.h ?? d.s, deitado: d.deitado ?? true, uv: celulaDecal(d.k) })), MAT.decal, 'decal-chao', false);
  quads(kit, ex.letreiro.map((l) => ({ ...l, uv: LETREIRO_UV(l.i) })), MAT.letreiro, 'letreiro-loja', true);
  if (GLB && ex.rua.length) {
    const PR = new PropBatch({ bucket: 24, cortes: { cadeira_plastico: 45 } });
    const PL = new PropBatch({ bucket: 24, cast: false, cortes: { saco_lixo: 20, caixa_papelao: 20, lata_enferrujada: 28, lixeira_metal: 40 } });
    for (const g of ex.rua) {
      const a = g.id === 'saco_lixo' && !g.esc ? amassaSaco(g.x, g.z) : g;
      (PL.opts.cortes[g.id] ? PL : PR).add(g.id, { x: g.x, y: (g.y ?? 0) + (a.dy && a !== g ? a.dy : 0), z: g.z, targetH: g.h, ry: g.ry, rx: a.rx, rz: a.rz, esc: a.esc });
    }
    const antes = root.children.length;
    PR.build(root); PL.build(root);
    const solidos = new Set(ex.rua.filter((g) => g.solido).map((g) => g.id));
    for (const o of root.children.slice(antes)) if (solidos.has(o.userData.mapPropId)) occluders.push(o);
  }
}

const celulaDecal = (k) => {
  const u0 = (k % 4) / 4, v1 = 1 - ((k / 4) | 0) / 4;
  return [u0 + 0.002, v1 - 1 / 4 + 0.002, u0 + 0.248, v1 - 0.002];
};

/* Muitos quads (decalque de chão, letreiro) numa malha só: uma chamada de desenho para
   todos, com a UV de cada um apontando para a célula do atlas. */
function quads(kit, lista, mat, nome, sombra) {
  if (!lista.length) return;
  const n = lista.length, pos = new Float32Array(n * 12), nor = new Float32Array(n * 12), uv = new Float32Array(n * 8), idx = [];
  const v = new THREE.Vector3(), no = new THREE.Vector3(), e = new THREE.Euler(0, 0, 0, 'YXZ'), m = new THREE.Matrix4();
  lista.forEach((q, i) => {
    e.set(q.deitado ? -Math.PI / 2 : 0, q.ry, 0);
    m.compose(_mp.set(q.x, q.y, q.z), _mq.setFromEuler(e), _ms.set(q.w, q.h, 1));
    const [u0, v0, u1, v1] = q.uv;
    [[-0.5, -0.5, u0, v0], [0.5, -0.5, u1, v0], [0.5, 0.5, u1, v1], [-0.5, 0.5, u0, v1]].forEach(([a, b, uu, vv], k) => {
      v.set(a, b, 0).applyMatrix4(m); no.set(0, 0, 1).transformDirection(m);
      pos.set([v.x, v.y, v.z], (i * 4 + k) * 3); nor.set([no.x, no.y, no.z], (i * 4 + k) * 3); uv.set([uu, vv], (i * 4 + k) * 2);
    });
    idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  const malha = new THREE.Mesh(g, mat);
  malha.name = nome; malha.receiveShadow = true; malha.castShadow = sombra;
  malha.userData.nonSolidSurface = true;
  kit.root.add(malha);
}

/* Setores de domínio: grade 3×3 cortada no fio da calçada da avenida. O pasto fica fora:
   é passagem, não território. Peso = área relativa. */
export function setores() {
  const R = CIDADE_R, M = AV + CAL;
  const def = [
    ['cruzamento', 'Cruzamento', -M, -M, M, M],
    ['av-norte', 'Avenida Norte', -M, -R, M, -M], ['av-sul', 'Avenida Sul', -M, M, M, R],
    ['av-oeste', 'Avenida Oeste', -R, -M, -M, M], ['av-leste', 'Avenida Leste', M, -M, R, M],
    ['quadra-no', 'Quadra da Praça', -R, -R, -M, -M], ['quadra-ne', 'Quadra da Igreja', M, -R, R, -M],
    ['quadra-so', 'Quadra da Padaria', -R, M, -M, R], ['quadra-se', 'Quadra do Boteco', M, M, R, R],
  ];
  const total = (2 * R) ** 2;
  return def.map(([id, nome, x0, z0, x1, z1]) => ({ id, nome, x0, z0, x1, z1, peso: +(((x1 - x0) * (z1 - z0)) / total).toFixed(4) }));
}
