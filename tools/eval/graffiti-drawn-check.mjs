// Gate da curadoria desenhada: fixture GREEN + mutantes de cena real, em Node puro.
// Os mesmos módulos do prod ('/js/graffiti_pass.js', 'three') são rebasenados via hooks.
import { readFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { register } from 'node:module';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const base = pathToFileURL(path.resolve(dir, '../../public') + '/').href;
const hooks = `export async function resolve(specifier, context, next) {
  const base = ${JSON.stringify(base)};
  if (specifier === 'three' || specifier === '/vendor/three.module.js')
    return { url: base + 'vendor/three.module.js', shortCircuit: true };
  if (specifier.startsWith('three/addons/'))
    return { url: base + 'vendor/' + specifier.slice(6), shortCircuit: true };
  if (specifier.startsWith('/js/')) return { url: base + specifier.slice(1), shortCircuit: true };
  return next(specifier, context);
}`;
register('data:text/javascript,' + encodeURIComponent(hooks));

const measureSource = readFileSync(path.join(dir, 'graffiti-curation-measure.mjs'), 'utf8');
// Self-mutante do extrator (crítico R3 nº9): groups ignorado precisa ser detectado.
const semGroupsSrc = measureSource.replace('g => g.materialIndex === materialIndex', 'g => true');
if (semGroupsSrc === measureSource) throw Error('mutante groups não aplicou');
const medirSemGroups = (0, eval)('(' + semGroupsSrc.slice(semGroupsSrc.indexOf('export async function')).replace('export ', '') + ')');
const inventorySource = readFileSync(path.join(dir, 'graffiti-art-inventory.mjs'), 'utf8');
const medir = (0, eval)('(' + measureSource.slice(measureSource.indexOf('export async function')).replace('export ', '') + ')');
const THREE = await import('three');

// Fake com dimensões positivas: imagem sem pixels decodificados é RED, não GREEN.
const textura = src => new THREE.MeshLambertMaterial({ map: new THREE.Texture({ src, naturalWidth: 512, naturalHeight: 512 }) });

const cena = () => {
  const root = new THREE.Group();
  const parede = new THREE.Mesh(new THREE.BoxGeometry(20, 4, .3), textura('/img/textures/reboco.jpg'));
  parede.name = 'parede'; parede.position.set(0, 1.5, -31); root.add(parede);
  const quad = (w, h, x) => { const g = new THREE.PlaneGeometry(w, h); g.rotateY(0); g.translate(x, 1.5, -30.82); return g; };
  const baked = new THREE.Mesh(quad(2, 1, -8), textura('/img/decals/d9.png'));
  baked.name = 'decal:d9.png'; baked.userData.pecas = 1; baked.matrixAutoUpdate = false; root.add(baked);
  const manual = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), textura('/img/decals/manual1.png'));
  manual.name = 'decal:manual1.png'; manual.position.set(-5, 1.5, -30.82); root.add(manual);
  const soldada = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1).toNonIndexed(), textura('/img/decals/manual2.png'));
  soldada.name = 'decal:manual2.png'; soldada.position.set(-2, 1.5, -30.82); root.add(soldada);
  // count=0 é zero arte desenhada, não exceção (crítico R3 nº8): controle positivo do clean.
  const vazia = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.2, 1), textura('/img/decals/vazia.png'), 0);
  vazia.name = 'decal:vazia.png'; root.add(vazia);
  const arrGeo = quad(1.4, 1, 1); arrGeo.addGroup(0, 6, 0);
  const arranjo = new THREE.Mesh(arrGeo, [textura('/img/decals/arr.png'), new THREE.MeshLambertMaterial()]);
  arranjo.name = 'decal:arr.png'; root.add(arranjo);
  root.userData.graffitiPecas = [{ x: -8, y: 1.5, z: -30.82, ry: 0, w: 2, h: 1, f: 'd9.png' }];
  return { root, baked, arranjo, manual, soldada };
};

// FAIXA DE BECO (contrato 06/08): reproduz map_quebrada.js:1208-1239 — 1 pano físico
// pendurado em arame, 2 planos FrontSide coplanares opostos, sem parede atrás.
const cenaFaixas = () => {
  const root = new THREE.Group();
  const faixa = (src, nome, fx, fz) => {
    for (const ry of [Math.PI / 2, -Math.PI / 2]) {
      const mm = new THREE.Mesh(new THREE.PlaneGeometry(1.58 * 1.8333, 1.58), textura(src));
      mm.position.set(fx, 2.51, fz); mm.rotation.y = ry; mm.name = 'faixa:' + nome;
      root.add(mm);
    }
  };
  faixa('/posters/mural-eternamente.jpg', 'eternamente', -16.7, -10.5);
  faixa('/posters/mural-leste-vive.jpg', 'leste-vive', 20.1, 10.65);
  return { root };
};

// Piscina: parede de referência na janela do raio (0,6,-24)+far 2, decal no branco e
// par de faixa FORA do branco — aqui não existe exceção por nome.
const cenaPiscinaFaixa = () => {
  const root = new THREE.Group();
  const parede = new THREE.Mesh(new THREE.BoxGeometry(20, 8, .3), textura('/img/textures/reboco.jpg'));
  parede.name = 'parede'; parede.position.set(0, 4, -26); root.add(parede);
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), textura('/img/decals/manual1.png'));
  decal.name = 'decal:manual1.png'; decal.position.set(-5, 1.5, -25.82); root.add(decal);
  for (const ry of [Math.PI / 2, -Math.PI / 2]) {
    const mm = new THREE.Mesh(new THREE.PlaneGeometry(1.58 * 1.8333, 1.58), textura('/posters/mural-eternamente.jpg'));
    mm.position.set(6, 1.5, -10); mm.rotation.y = ry; mm.name = 'faixa:eternamente'; root.add(mm);
  }
  return { root };
};

// Poster manual: 1 quad por Mesh tem suporte próprio (Root 31/10); suspenso e batch reprovam.
const cenaPoster = () => {
  const root = new THREE.Group();
  const parede = new THREE.Mesh(new THREE.BoxGeometry(20, 4, .3), textura('/img/textures/reboco.jpg'));
  parede.name = 'parede'; parede.position.set(0, 1.5, -31); root.add(parede);
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1), textura('/posters/p_banho.png'));
  poster.name = 'poster:p_banho.png'; poster.position.set(-3, 1.5, -30.82); root.add(poster);
  return { root, poster };
};

const mutantesPoster = {
  'poster-suspenso': ({ poster }) => { poster.position.set(-3, 1.5, -20); },
  'poster-batched': ({ poster }) => {
    const a = poster.geometry.toNonIndexed(); a.translate(0, 0, .02);
    const b = poster.geometry.toNonIndexed();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(
      [...a.attributes.position.array, ...b.attributes.position.array], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([...a.attributes.uv.array, ...b.attributes.uv.array], 2));
    poster.geometry.dispose(); poster.geometry = g;
  }
};

const mutantes = {
  'clone-baked': ({ root, baked }) => root.add(baked.clone(false)),
  'move-baked': ({ baked }) => { baked.geometry = baked.geometry.clone().translate(1000, 0, 0); },
  'unnamed-poster': ({ root }) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1), textura('/posters/p_banho.png'));
    m.name = 'sem-prefixo'; m.position.set(0, 1.5, -30.82); root.add(m);
  },
  'ancestral-enganoso': ({ root }) => {
    const g = new THREE.Group(); g.name = 'decal:fake';
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1), textura('/img/decals/d29.png'));
    m.position.set(0, 1.5, -30.82); g.add(m); root.add(g);
  },
  'drawrange-corta': ({ baked }) => { baked.geometry.drawRange.count = 3; },
  'grupo-sem-cobertura': ({ arranjo }) => {
    arranjo.geometry.groups[0].materialIndex = 1; arranjo.userData.pecas = 1;
  },
  'instancia-duplicada': ({ root }) => {
    const inst = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.5, 1), textura('/img/decals/inst.png'), 2);
    inst.name = 'decal:inst.png';
    const m = new THREE.Matrix4();
    inst.setMatrixAt(0, m.clone().setPosition(-3, 1.5, -30.82));
    inst.setMatrixAt(1, m.clone().setPosition(0, 1.5, -30.82));
    root.add(inst);
  },
  'triangulo-solto': ({ root }) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-.75, .5, 0, .75, .5, 0, -.75, -.5, 0], 3));
    g.setIndex([0, 2, 1]);
    const m = new THREE.Mesh(g, textura('/img/decals/quebra.png'));
    m.name = 'decal:quebra.png'; m.position.set(-6, 1.5, -30.82); root.add(m);
  },
  'winding-misto': ({ manual }) => { manual.geometry.index.array.set([0, 2, 1, 2, 1, 3]); },   // crítico R2: 2º triângulo invertido
  'winding-invertido': ({ manual }) => { manual.geometry.index.array.set([0, 1, 2, 2, 1, 3]); },   // quad inteiro de costas
  'uv-repetido': ({ manual }) => { manual.material.map.wrapS = THREE.RepeatWrapping; manual.material.map.repeat.set(2, 1); },
  'uv-repetido-fracionado': ({ manual }) => {
    const uv = manual.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 2);
    manual.material.map.wrapS = THREE.RepeatWrapping; manual.material.map.repeat.set(.6, 1);
  },
  'sem-pixels': ({ manual }) => { manual.material.map.userData.faltou = true; },
  'overlay-fora-familia': ({ root }) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1),
      new THREE.MeshLambertMaterial({ map: new THREE.Texture({ src: '/arte/foo.png', naturalWidth: 0, naturalHeight: 0 }) }));
    m.name = 'decal:foo.png'; m.position.set(3, 1.5, -30.82); root.add(m);
  },
  'nonindexed-uv-divergente': ({ soldada }) => {
    const uv = soldada.geometry.attributes.uv;
    uv.setX(3, uv.getX(3) + 2); uv.setX(5, uv.getX(5) + 2);
    soldada.material.map.wrapS = THREE.RepeatWrapping;
  },
  'nonindexed-uv-nao-finito': ({ soldada }) => { soldada.geometry.attributes.uv.setX(3, NaN); },
  'rotacao-uv-nao-finita': ({ manual }) => { manual.material.map.rotation = NaN; },
  'uv-canal': ({ manual }) => {
    const g = manual.geometry, uv = g.attributes.uv;
    const uv1 = new THREE.Float32BufferAttribute(new Float32Array(uv.count * 2), 2);
    for (let i = 0; i < uv.count; i++) uv1.setXY(i, uv.getX(i) * 2, uv.getY(i));
    g.setAttribute('uv1', uv1);
    manual.material.map.channel = 1; manual.material.map.wrapS = THREE.RepeatWrapping;
  },
  // Crítico R5: wireframe não é quad preenchido; reflexão diverge do culling do renderer;
  // UV não finito escapa das comparações de span.
  'material-wireframe': ({ manual }) => { manual.material.wireframe = true; },
  'reflexao-parede-errada': ({ root, manual }) => {
    manual.scale.x = -1;
    root.children.find(m => m.name === 'parede').position.z = -30.65;
  },
  'uv-nao-finito': ({ manual }) => { manual.geometry.attributes.uv.setX(0, NaN); },
  // CRÍTICO R4 P2-1: vértice 3 dobra no UV do vértice 0 — span segue 1×1 com parede,
  // mas os dois triângulos amostram a mesma meia-arte duas vezes.
  'uv-dobrado': ({ manual }) => {
    const uv = manual.geometry.attributes.uv;
    uv.setXY(3, uv.getX(0), uv.getY(0));
  },
  // CRÍTICO R3 P2-1: opacity 0 com transparent=false/NormalBlending é NoBlending efetivo
  // (three.module.js:23445) — a cópia escreve RGB e tem que contar como duplicata.
  'opaco-zero-duplicado': ({ manual }) => {
    const m = manual.clone();
    m.material = manual.material.clone(); m.material.opacity = 0;
    m.position.set(-7.5, 1.5, -30.82); manual.parent.add(m);
  }
};

const mutantesFaixa = {
  'faixa-clone-deslocado': ({ root }) => {
    for (const f of root.children.filter(m => m.name === 'faixa:eternamente')) {
      const c = f.clone(); c.position.x += 40; c.position.z += 40; root.add(c);
    }
  },
  'faixa-terceira-face': ({ root }) => root.add(root.children.find(m => m.name === 'faixa:eternamente').clone()),
  'faixa-face-invertida': ({ root }) => {
    const faces = root.children.filter(m => m.name === 'faixa:eternamente');
    faces[1].rotation.y = faces[0].rotation.y;
  },
  'faixa-uv-espelhado': ({ root }) => {
    const uv = root.children.filter(m => m.name === 'faixa:eternamente')[1].geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
  },
  'faixa-uv-textura-espelhado': ({ root }) => {
    const map = root.children.filter(m => m.name === 'faixa:eternamente')[1].material.map;
    map.repeat.set(-1, 1); map.offset.x = 1;
  },
  'faixa-face-sem-pixels': ({ root }) => {
    // A face children[0] é DESCARTADA na consolidação (base = última): pixels dela não podem sumir (R3 nº2).
    root.children.filter(m => m.name === 'faixa:eternamente')[0].material.map.userData.faltou = true;
  },
  'faixa-par-girado': ({ root }) => {
    for (const f of root.children.filter(m => m.name === 'faixa:eternamente')) f.rotation.y += Math.PI / 2;
  },
  'faixa-par-aberto': ({ root }) => {
    // Abre a face children[0] (não-base do grupo): pose individual ok, quinas do par divergem (R3 nº6).
    root.children.filter(m => m.name === 'faixa:eternamente')[0].rotation.y += .1;
  },
  'faixa-doubleside': ({ root }) => {
    const faces = root.children.filter(m => m.name === 'faixa:eternamente');
    const mm = new THREE.Mesh(new THREE.PlaneGeometry(1.58 * 1.8333, 1.58), textura('/posters/mural-eternamente.jpg'));
    mm.material.side = THREE.DoubleSide; mm.name = 'faixa:eternamente';
    mm.position.copy(faces[0].position); mm.rotation.y = faces[0].rotation.y;
    root.remove(faces[0], faces[1]); root.add(mm);
  },
  'faixa-sem-verso': ({ root }) => root.remove(root.children.find(m => m.name === 'faixa:eternamente'))
};

const falhas = [], linhas = [];
const conferir = (nome, cond, detalhe) => {
  linhas.push(`${cond ? 'ok' : 'FALHOU'} ${nome}${cond ? '' : ' :: ' + detalhe}`);
  if (!cond) falhas.push(nome);
};
const alvos = {
  'clone-baked': { verde: r2 => r2.duplicates.length > 0, texto: 'duplicates>0' },
  'move-baked': { verde: r2 => r2.unsupported.length > 0, texto: 'unsupported>0' },
  'unnamed-poster': { verde: r2 => r2.unknown.some(v => String(v).includes('/posters/')), texto: 'unknown com /posters/' },
  'ancestral-enganoso': { verde: r2 => r2.unknown.some(v => String(v).startsWith('ancestral:')), texto: 'unknown ancestral:' },
  'drawrange-corta': { verde: r2 => r2.divergent.length > 0, texto: 'divergent>0' },
  'grupo-sem-cobertura': { verde: r2 => r2.divergent.some(v => String(v).startsWith('pecas:'))
    && !r2.pieces.some(p => String(p.file).includes('arr')), texto: 'pecas:0/1 e arr não contada' },
  'instancia-duplicada': { verde: r2 => r2.duplicates.length > 0, texto: 'duplicates>0' },
  'triangulo-solto': { verde: r2 => r2.unknown.length > 0, texto: 'unknown>0' },
  'winding-misto': { verde: r2 => r2.unknown.some(v => String(v).includes('manual1')), texto: 'unknown winding' },
  'winding-invertido': { verde: r2 => r2.unsupported.some(p => p.file.includes('manual1')), texto: 'unsupported manual1' },
  'uv-repetido': { verde: r2 => r2.unknown.some(v => String(v).startsWith('uv-repetido:')), texto: 'unknown uv-repetido:' },
  'uv-repetido-fracionado': { verde: r2 => r2.unknown.some(v => String(v).startsWith('uv-repetido:')), texto: 'spanUV2 × repeat0.6 = 1.2 aplicações' },
  'sem-pixels': { verde: r2 => r2.unknown.some(v => String(v).startsWith('sem-pixels:')), texto: 'unknown sem-pixels:' },
  'overlay-fora-familia': { verde: r2 => r2.unknown.some(v => String(v).startsWith('sem-entrada:')), texto: 'unknown sem-entrada:' },
  'nonindexed-uv-divergente': { verde: r2 => r2.unknown.includes('decal:manual2.png'), texto: 'unknown decal:manual2.png' },
  'nonindexed-uv-nao-finito': { verde: r2 => r2.unknown.some(v => String(v).startsWith('uv-nao-finito:')), texto: 'unknown uv-nao-finito:' },
  'rotacao-uv-nao-finita': { verde: r2 => r2.unknown.some(v => String(v).startsWith('uv-nao-reconhecido:')), texto: 'unknown uv-nao-reconhecido:' },
  'uv-canal': { verde: r2 => r2.unknown.some(v => String(v).startsWith('uv-canal:')), texto: 'unknown uv-canal:' },
  'material-wireframe': { verde: r2 => r2.unknown.some(v => String(v).startsWith('wireframe:')), texto: 'unknown wireframe:' },
  'reflexao-parede-errada': { verde: r2 => r2.unknown.some(v => String(v).includes('manual1')), texto: 'unknown reflexão manual1' },
  'uv-nao-finito': { verde: r2 => r2.unknown.some(v => String(v).startsWith('uv-nao-finito:')), texto: 'unknown uv-nao-finito:' },
  'opaco-zero-duplicado': { verde: r2 => r2.duplicates.some(d => d.file.includes('manual1'))
      && !r2.unknown.some(v => String(v).startsWith('sem-entrada:')),
    texto: 'duplicates manual1 com inventário concordante (sem sem-entrada)' },
  'uv-dobrado': { verde: r2 => r2.unknown.some(v => String(v).startsWith('uv-dobrado:')), texto: 'unknown uv-dobrado:' },
};
const alvosFaixa = {
  'faixa-face-sem-pixels': { verde: r2 => r2.unknown.some(v => String(v).startsWith('sem-pixels:')), texto: 'unknown sem-pixels:' },
  'faixa-clone-deslocado': { verde: r2 => r2.duplicates.some(d => d.file.includes('eternamente')) && (r2.banners || []).some(b => b.estado === 'nao-registrada'), texto: 'duplicata fora do registro' },
  'faixa-terceira-face': { verde: r2 => r2.duplicates.length > 0 && (r2.banners || []).some(b => b.motivo === 'faces=3'), texto: 'faces=3 + duplicata' },
  'faixa-face-invertida': { verde: r2 => r2.duplicates.length > 0 && (r2.banners || []).some(b => b.motivo === 'normais-nao-opostas'), texto: 'normais-nao-opostas + duplicata' },
  'faixa-uv-espelhado': { verde: r2 => r2.duplicates.length > 0 && (r2.banners || []).some(b => b.motivo === 'uv-ilegivel'), texto: 'uv-ilegivel + duplicata' },
  'faixa-uv-textura-espelhado': { verde: r2 => r2.duplicates.length > 0 && (r2.banners || []).some(b => b.motivo === 'uv-ilegivel'), texto: 'uv-ilegivel + duplicata' },
  'faixa-par-girado': { verde: r2 => r2.duplicates.some(d => d.file.includes('eternamente')) && (r2.banners || []).some(b => b.motivo === 'fora-do-registro'), texto: 'fora-do-registro + duplicata' },
  'faixa-par-aberto': { verde: r2 => r2.duplicates.length > 0 && (r2.banners || []).some(b => b.motivo === 'nao-coplanares'), texto: 'nao-coplanares + duplicata' },
  'faixa-doubleside': { verde: r2 => r2.unsupported.some(p => p.file.includes('eternamente')) && (r2.banners || []).some(b => b.motivo === 'faces=1'), texto: 'faces=1 + sem suporte' },
  'faixa-sem-verso': { verde: r2 => r2.unsupported.length > 0 && (r2.banners || []).some(b => b.motivo === 'faces=1'), texto: 'faces=1 + sem suporte' }
};
const alvosPoster = {
  'poster-suspenso': { verde: r2 => r2.unsupported.some(p => p.file.includes('p_banho')), texto: 'unsupported p_banho' },
  'poster-batched': { verde: r2 => r2.unknown.some(v => String(v).startsWith('poster-batched:')), texto: 'unknown poster-batched:' }
};
try {
  globalThis.window = globalThis;
  globalThis.location = { href: 'http://curadoria.fixture/' };
  const ctx = cena();
  globalThis.__gworld = { root: ctx.root };
  globalThis.__graffitiCanvasSources = new WeakMap();
  const r = await medir({ id: 'ferro_velho', inventorySource });
  conferir('clean.pass', r.pass === true, JSON.stringify({ pass: r.pass, unknown: r.unknown, divergent: r.divergent, duplicates: r.duplicates, unsupported: r.unsupported, outside: r.outside }));
  conferir('clean.contagem', r.total === 4 && r.unique === 4 && r.overlayPieces === 4, JSON.stringify({ total: r.total, unique: r.unique }));
  conferir('clean.fontes', r.sources.baked === 1 && r.sources.manual === 3, JSON.stringify(r.sources));
  for (const [nome, aplicar] of Object.entries(mutantes)) {
    const c = cena();
    globalThis.__gworld = { root: c.root };
    aplicar(c);
    let res;
    try { res = await medir({ id: 'ferro_velho', inventorySource }); }
    catch (e) { conferir(nome, false, 'exceção não é veredito: ' + e.message); continue; }
    conferir(`${nome}.vermelho`, res.pass === false, JSON.stringify(res.pass));
    conferir(`${nome}.clausula`, alvos[nome].verde(res), alvos[nome].texto + ' :: ' + JSON.stringify({ duplicates: res.duplicates, unknown: res.unknown, divergent: res.divergent, unsupported: res.unsupported, banners: res.banners }));
  }

  // Controle negativo (CRÍTICO R3 P2-1): transparent=true + opacity=0 + NormalBlending
  // é invisível de verdade — não conta como arte nem vira unknown; a cena segue limpa.
  {
    const c = cena();
    const fantasma = c.manual.clone();
    fantasma.material = c.manual.material.clone();
    fantasma.material.transparent = true; fantasma.material.opacity = 0;
    fantasma.position.set(-7.5, 1.5, -30.82); c.root.add(fantasma);
    globalThis.__gworld = { root: c.root };
    const res = await medir({ id: 'ferro_velho', inventorySource });
    conferir('invisivel-transparente-zero.limpo',
      res.pass === true && res.total === 4 && !res.duplicates.length && !res.unknown.length,
      JSON.stringify({ total: res.total, duplicates: res.duplicates, unknown: res.unknown }));
  }

  // Faixas de beco: estado bom é 2 objetos físicos / 4 faces legíveis, GREEN sem parede.
  globalThis.__gworld = { root: cenaFaixas().root };
  const rf = await medir({ id: 'quebrada', inventorySource });
  conferir('faixas.pass', rf.pass === true, JSON.stringify({ pass: rf.pass, unknown: rf.unknown, duplicates: rf.duplicates, unsupported: rf.unsupported, banners: rf.banners }));
  conferir('faixas.objetos', (rf.banners || []).length === 2 && rf.banners.every(b => b.estado === 'aprovada' && b.faces === 2), JSON.stringify(rf.banners));
  conferir('faixas.contagem', rf.total === 2 && rf.unique === 2 && (rf.sources.faixa || 0) === 2, JSON.stringify({ total: rf.total, unique: rf.unique, sources: rf.sources }));
  for (const [nome, aplicar] of Object.entries(mutantesFaixa)) {
    const c = cenaFaixas();
    globalThis.__gworld = { root: c.root };
    aplicar(c);
    let res;
    try { res = await medir({ id: 'quebrada', inventorySource }); }
    catch (e) { conferir(nome, false, 'exceção não é veredito: ' + e.message); continue; }
    conferir(`${nome}.vermelho`, res.pass === false, JSON.stringify(res.pass));
    conferir(`${nome}.clausula`, alvosFaixa[nome].verde(res), alvosFaixa[nome].texto + ' :: ' + JSON.stringify({ duplicates: res.duplicates, unsupported: res.unsupported, banners: res.banners }));
  }

  // Poster 1/Mesh: positivo GREEN com suporte próprio; suspenso e batch RED pelo motivo certo.
  globalThis.__gworld = { root: cenaPoster().root };
  const rpo = await medir({ id: 'ferro_velho', inventorySource });
  conferir('poster-self.pass', rpo.pass === true, JSON.stringify({ pass: rpo.pass, unknown: rpo.unknown, unsupported: rpo.unsupported }));
  conferir('poster-self.contagem', rpo.total === 1 && rpo.unique === 1, JSON.stringify({ total: rpo.total, unique: rpo.unique }));
  for (const [nome, aplicar] of Object.entries(mutantesPoster)) {
    const c = cenaPoster();
    globalThis.__gworld = { root: c.root };
    aplicar(c);
    let res;
    try { res = await medir({ id: 'ferro_velho', inventorySource }); }
    catch (e) { conferir(nome, false, 'exceção não é veredito: ' + e.message); continue; }
    conferir(`${nome}.vermelho`, res.pass === false, JSON.stringify(res.pass));
    conferir(`${nome}.clausula`, alvosPoster[nome].verde(res), alvosPoster[nome].texto + ' :: ' + JSON.stringify({ unknown: res.unknown, unsupported: res.unsupported, duplicates: res.duplicates }));
  }

  // Self-test do extrator (crítico R3 nº9): groups ignorado conta arr.png — a cláusula morde.
  {
    const c = cena(); globalThis.__gworld = { root: c.root };
    mutantes['grupo-sem-cobertura'](c);
    const reg = await medirSemGroups({ id: 'ferro_velho', inventorySource });
    conferir('groups-selftest.detecta', reg.pieces.some(p => String(p.file).includes('arr'))
      && !reg.divergent.some(v => String(v).startsWith('pecas:')),
      JSON.stringify({ pieces: reg.pieces.map(p => p.file), divergent: reg.divergent }));
  }

  // Piscina: banner de qualquer arte continua sujeito ao branco — sem exceção por prefixo.
  globalThis.__gworld = { root: cenaPiscinaFaixa().root };
  const rp = await medir({ id: 'piscina_treta', inventorySource });
  conferir('faixa-piscina.vermelho', rp.pass === false, JSON.stringify(rp.pass));
  conferir('faixa-piscina.fora-branco', rp.outside.length > 0 && rp.outside.every(p => p.file.includes('eternamente')) && rp.duplicates.length > 0, JSON.stringify({ outside: rp.outside, duplicates: rp.duplicates, banners: rp.banners }));
} catch (e) {
  falhas.push('execução');
  linhas.push('FALHOU execução :: ' + (e && e.stack || e));
}
console.log(linhas.join('\n'));
console.log(falhas.length ? `RED: ${falhas.length} falha(s): ${falhas.join(', ')}` : 'GREEN: curadoria desenhada');
try { appendFileSync(path.resolve(dir, '../../../audits/2026-10-31-visual-consistency/curation-drawn-check.log'), linhas.join('\n') + '\n'); } catch {}
process.exitCode = falhas.length ? 1 : 0;
