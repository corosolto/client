// Arte única por mapa, Ferro só na casa B e Piscina só no branco.
// Contratos do extrator: docs/visual-consistency/GRAFITE-REGUA.md.
export async function medirCuradoria({ id, mutant = '', inventorySource }) {
  const THREE = await import('/vendor/three.module.js');
  const { retanguloGrafiteDesenhado, gradeEspacial } = await import('/js/graffiti_pass.js');
  const { identidadeArteGrafite } = await import('/js/graffiti_art_id.js');
  const { criarSuporteGrafite, superficieGrafitavel } = await import('/js/graffiti_surface.js');
  const { criarCoberturaGrafite } = await import('/js/graffiti_coverage.js');
  const root = window.__game?.world?.root || window.__gworld?.root;
  if (!root) throw Error('Cena real ausente; curadoria não medida');
  if (!inventorySource || !window.__graffitiCanvasSources) throw Error('Inventário de texturas/canvas não instrumentado; não aceitar curadoria');
  root.updateMatrixWorld(true);
  const pieces = [], unknown = [], divergent = [], medidas = new Map(), bakedQuads = new Map(), canvasImages = new WeakMap();
  let canvasId = 0;
  const asset = (texture, fallback) => {
    const image = texture?.source?.data || texture?.image;
    if (image?.src) return decodeURIComponent(new URL(image.src, location.href).pathname);
    if (!image || typeof image !== 'object') return fallback;
    if (!canvasImages.has(image)) canvasImages.set(image, ++canvasId);
    return `canvas:${canvasImages.get(image)}`;
  };
  const QUAD = [0, 2, 1, 2, 3, 1];
  // Cada componente conectado desenhado tem que ser um quad canônico; senão UNKNOWN.
  const quadsDesenhados = (mesh, materialIndex, material) => {
    const geometry = mesh.geometry, position = geometry?.attributes?.position;
    if (!position) return null;
    const total = geometry.index ? geometry.index.count : position.count;
    const start = geometry.drawRange.start, end = Math.min(total, start + geometry.drawRange.count);
    // Material de array só desenha o que o grupo dele cobre; sem grupo, nada sai.
    let spans = [[start, end]];
    if (Array.isArray(mesh.material)) {
      spans = geometry.groups.filter(g => g.materialIndex === materialIndex)
        .map(g => [Math.max(start, g.start), Math.min(end, g.start + g.count)]);
    }
    const ref = t => geometry.index ? geometry.index.getX(t) : t;
    const chave = v => geometry.index ? 'i' + v
      : 'p' + Math.round(position.getX(v) * 1e4) + ',' + Math.round(position.getY(v) * 1e4)
        + ',' + Math.round(position.getZ(v) * 1e4);
    // Sem índice a solda é por posição quantizada; a união tem que ser sobre a CHAVE.
    // Solda só vale se TODAS as ocorrências da posição concordarem no UV (crítico R3 nº5).
    const uv = geometry.attributes.uv;
    const triangulos = [], bruto = new Map();
    let uvDivergente = false;
    for (const [a, b] of spans) for (let t = a; t + 3 <= b; t += 3) {
      const tri = [];
      for (let j = 0; j < 3; j++) {
        const v = ref(t + j), k = chave(v);
        const visto = bruto.get(k);
        if (visto === undefined) bruto.set(k, v);
        else if (uv && (Math.abs(uv.getX(visto) - uv.getX(v)) > 1e-6
          || Math.abs(uv.getY(visto) - uv.getY(v)) > 1e-6)) uvDivergente = true;
        tri.push(k);
      }
      triangulos.push(tri);
    }
    if (uvDivergente) return null;
    if (!triangulos.length) return [];
    const pai = new Map();
    const find = k => { let r = k; while (pai.get(r) !== r) r = pai.get(r); return r; };
    const uni = (a, b) => { if (!pai.has(a)) pai.set(a, a); if (!pai.has(b)) pai.set(b, b); pai.set(find(a), find(b)); };
    for (const tri of triangulos) { uni(tri[0], tri[1]); uni(tri[1], tri[2]); }
    const comps = new Map();
    for (const tri of triangulos) {
      if (!comps.has(find(tri[0]))) comps.set(find(tri[0]), { seq: [], verts: new Map() });
      const c = comps.get(find(tri[0]));
      for (const k of tri) { c.seq.push(k); if (!c.verts.has(k)) c.verts.set(k, bruto.get(k)); }
    }
    const matrizes = [];
    if (mesh.isInstancedMesh) {
      if (!mesh.instanceMatrix) return null;
      const m = new THREE.Matrix4();
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, m);
        matrizes.push(new THREE.Matrix4().copy(mesh.matrixWorld).multiply(m));
      }
    } else matrizes.push(mesh.matrixWorld);
    if (!matrizes.length) return [];   // 0 instâncias = 0 arte desenhada, não exceção (R3 nº8)
    // Reflexão (det<0) inverte o culling no renderer (frontFace compensado): UNKNOWN fail-closed.
    if (matrizes.some(m => { const d = m.determinant(); return !(d > 0); })) return null;
    // Transformação de UV reconhecida: só repeat/offset; matrix/rotação/center próprios reprovam.
    const mapa = material.map;
    const uvValido = !!mapa && mapa.matrixAutoUpdate !== false && mapa.rotation === 0
      && mapa.center.x === 0 && mapa.center.y === 0;
    const rects = [];
    for (const c of comps.values()) {
      const u = [...c.verts.keys()];
      if (u.length !== 4 || c.seq.length !== 6) return null;
      // Dois triângulos compartilham a diagonal; as pontas soltas são p0 e p3.
      const t1 = c.seq.slice(0, 3), t2 = c.seq.slice(3);
      const diag = t1.filter(k => t2.includes(k));
      const so = [t1.filter(k => !diag.includes(k))[0], t2.filter(k => !diag.includes(k))[0]];
      if (diag.length !== 2 || so.some(k => k === undefined)) return null;
      const vertice = k => { const v = c.verts.get(k);
        return [position.getX(v), position.getY(v), position.getZ(v)]; };
      // A face vista vem do winding REAL dos triângulos desenhados, não do índice canônico.
      const normalDe = tri => {
        const [a, b, d] = tri.map(vertice);
        return new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2])
          .cross(new THREE.Vector3(d[0] - a[0], d[1] - a[1], d[2] - a[2]));
      };
      const n1 = normalDe(t1), n2 = normalDe(t2);
      if (n1.lengthSq() < 1e-12 || n2.lengthSq() < 1e-12) return null;   // triângulo degenerado não desenha
      if (material.side !== THREE.DoubleSide && n1.dot(n2) <= 0) return null;   // winding misto: metade culled de qualquer lado
      const frente = (n1.dot(n2) > 0 ? n1.clone().add(n2) : n1.clone()).normalize();
      if (material.side === THREE.BackSide) frente.negate();
      // UV: eixos em mundo (leitura da faixa) e arte aplicada uma única vez por quad.
      let uvLegivel = false, uvSpan = [0, 0], uvDobra = false;
      if (uv) {
        // UV EFETIVO com o sinal do repeat: espelho pela textura inverte a leitura (R3 nº3).
        const dados = u.map(k => { const v = c.verts.get(k);
          return { s: uv.getX(v) * mapa.repeat.x, t: uv.getY(v) * mapa.repeat.y,
            p: new THREE.Vector3(...vertice(k)).applyMatrix4(matrizes[0]) }; });
        const ms = dados.reduce((a, d) => a + d.s, 0) / 4, mt = dados.reduce((a, d) => a + d.t, 0) / 4;
        const centro = dados.reduce((a, d) => a.add(d.p), new THREE.Vector3()).multiplyScalar(.25);
        const eixoU = new THREE.Vector3(), eixoV = new THREE.Vector3();
        for (const d of dados) { const rel = d.p.clone().sub(centro);
          eixoU.add(rel.clone().multiplyScalar(d.s - ms)); eixoV.add(rel.clone().multiplyScalar(d.t - mt)); }
        const fW = frente.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(matrizes[0])).normalize();
        uvLegivel = eixoU.normalize().dot(new THREE.Vector3(0, 1, 0).cross(fW).normalize()) > .98
          && eixoV.normalize().y > .98;
        uvSpan = [Math.max(...dados.map(d => d.s)) - Math.min(...dados.map(d => d.s)),
          Math.max(...dados.map(d => d.t)) - Math.min(...dados.map(d => d.t))];
        // Dobra UV (crítico R4 P2-1): pontas livres em lados OPOSTOS da diagonal em UV;
        // mesmo lado/colinear = mesma região da arte amostrada 2×, não é amostra íntegra.
        const du = diag.map(k => { const v = c.verts.get(k); return [uv.getX(v), uv.getY(v)]; });
        const lado = k => { const v = c.verts.get(k);
          return (du[1][0] - du[0][0]) * (uv.getY(v) - du[0][1]) - (du[1][1] - du[0][1]) * (uv.getX(v) - du[0][0]); };
        const l0 = lado(so[0]), l3 = lado(so[1]);
        uvDobra = !(l0 < 0 && l3 > 0) && !(l0 > 0 && l3 < 0);
      }
      const pontos = ordem => new THREE.Float32BufferAttribute(
        ordem.flatMap(k => vertice(k)), 3);
      for (const ordem of [[so[0], diag[0], diag[1], so[1]], [so[0], diag[1], diag[0], so[1]]]) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', pontos(ordem));
        g.setIndex(QUAD);
        const antes = rects.length;
        const falhou = matrizes.some(matriz => {
          const rect = retanguloGrafiteDesenhado(g, matriz);
          if (!rect) return true;
          if (material.side !== THREE.DoubleSide) {
            // Honra o lado do material: a normal mundial do triângulo real decide o ry.
            const [a, b, d] = t1.map(k => new THREE.Vector3(...vertice(k)).applyMatrix4(matriz));
            const nW = b.clone().sub(a).cross(d.clone().sub(a)).normalize();
            if (material.side === THREE.BackSide) nW.negate();
            const alinhado = Math.sin(rect.ry) * nW.x + Math.cos(rect.ry) * nW.z;
            if (Math.abs(alinhado) < .7) return true;
            if (alinhado < 0) rect.ry = rect.ry > 0 ? rect.ry - Math.PI : rect.ry + Math.PI;
          }
        rect.uvLegivel = uvLegivel; rect.uvSpan = uvSpan; rect.uvValido = uvValido; rect.uvDobra = uvDobra;
          rects.push(rect);
          return false;
        });
        if (falhou) rects.length = antes;   // descarta tentativa parcial (instância que não mediu)
        g.dispose();
        if (!falhou) break;
        if (ordem[1] === diag[1]) return null;
      }
    }
    return rects;
  };
  root.traverse(mesh => {
    if (!mesh.isMesh || !(mesh.layers.mask & 1)) return;
    for (let n = mesh; n; n = n.parent) if (!n.visible) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const nomeado = /^(decal:|mural:|poster:|faixa:)/.test(mesh.name);
    if (!nomeado) return;
    for (let mi = 0; mi < materials.length; mi++) {
      const material = materials[mi];
      // wireframe renderiza LINES, não o quad preenchido: UNKNOWN fail-closed (crítico R5 nº1).
      if (material.wireframe) { unknown.push(`wireframe:${asset(material.map, mesh.name)}`); continue; }
      // Opacity0 ainda escreve RGB com NoBlending ou NormalBlending opaco.
      // Mesmo predicado do inventário; contrato em GRAFITE-REGUA.md.
      if (!material?.map || material.visible === false || material.colorWrite === false
        || !(material.opacity > 0 || material.blending === THREE.NoBlending
          || (material.blending === THREE.NormalBlending && material.transparent === false))) continue;
      const uv = mesh.geometry?.attributes?.uv;
      let uvFinito = true;
      for (let i = 0; uv && i < uv.count; i++) {
        if (!Number.isFinite(uv.getX(i)) || !Number.isFinite(uv.getY(i))) { uvFinito = false; break; }
      }
      if (!uvFinito) { unknown.push(`uv-nao-finito:${asset(material.map, mesh.name)}`); continue; }
      const rects = quadsDesenhados(mesh, mi, material);
      if (rects === null) { unknown.push(materials.length > 1 ? `${mesh.name}#${mi}` : mesh.name); continue; }
      medidas.set(mesh.uuid + ':' + mi, rects.length);
      if (!rects.length) continue;
      const file = asset(material.map, mesh.name);
      // UV irreconhecível, arte repetida (repeat/tiling) ou sem aplicação não é peça.
      // channel≠0 desenha por uv1/… que não medimos: UNKNOWN, não GREEN (crítico R3 nº4).
      if (material.map.channel) { unknown.push(`uv-canal:${file}`); continue; }
      if (rects.some(r => !r.uvValido)) { unknown.push(`uv-nao-reconhecido:${file}`); continue; }
      if (rects.some(r => r.uvSpan[0] > 1.002 || r.uvSpan[1] > 1.002)) { unknown.push(`uv-repetido:${file}`); continue; }
      // UV efetivo/repeat/offset não finito não passa por comparação de span: UNKNOWN (R5 nº3).
      const mapaT = material.map;
      if (rects.some(r => !Number.isFinite(r.uvSpan[0]) || !Number.isFinite(r.uvSpan[1]))
        || [mapaT.repeat.x, mapaT.repeat.y, mapaT.offset.x, mapaT.offset.y].some(v => !Number.isFinite(v))
        || rects.some(r => !Number.isFinite(r.x) || !Number.isFinite(r.y) || !Number.isFinite(r.z))) {
        unknown.push(`uv-nao-finito:${file}`); continue;
      }
      if (rects.some(r => r.uvSpan[0] < 1e-6 || r.uvSpan[1] < 1e-6)) { unknown.push(`uv-nulo:${file}`); continue; }
      // Quad com dobra UV não é amostra íntegra da arte: UNKNOWN (crítico R4 P2-1).
      if (rects.some(r => r.uvDobra)) { unknown.push(`uv-dobrado:${file}`); continue; }
      if (mesh.userData.pecas) bakedQuads.set(mesh.uuid, (bakedQuads.get(mesh.uuid) || 0) + rects.length);
      const source = mesh.userData.pecas ? 'baked' : 'manual';
      for (const rect of rects) pieces.push({ ...rect, file, source, name: mesh.name,
        origem: mesh.uuid + ':' + mi, lado: material.side });
    }
  });
  // Metadado do bake é RECONCILIAÇÃO: divergir reprova, nunca substitui a medição.
  const r3v = v => Math.round(v * 1000) / 1000;
  const assinatura = rect => [rect.x, rect.y, rect.z, rect.ry, rect.w, rect.h].map(r3v);
  const ordem = (a, b) => { for (let i = 0; i < 6; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
  const metas = [];
  root.traverse(node => {
    for (const p of node.userData.graffitiPecas || []) {
      const g = new THREE.PlaneGeometry(p.w, p.h); g.rotateY(p.ry); g.translate(p.x, p.y, p.z);
      const rect = retanguloGrafiteDesenhado(g, null); g.dispose();
      if (!rect) divergent.push(`metadado-invalido:${p.f || 'peca'}`);
      else metas.push(assinatura(rect));
    }
  });
  metas.sort(ordem);
  const livres = new Array(metas.length).fill(true);
  for (const m of pieces.filter(p => p.source === 'baked').map(p => assinatura(p))) {
    const j = metas.findIndex((t, k) => livres[k] && t.every((v, i) => Math.abs(v - m[i]) <= 0.002));
    if (j < 0) divergent.push(`sem-metadado:${m.join(',')}`); else livres[j] = false;
  }
  metas.forEach((t, j) => { if (livres[j]) divergent.push(`sem-geometria:${t.join(',')}`); });
  root.traverse(m => {
    if (m.isMesh && m.userData.pecas && (bakedQuads.get(m.uuid) || 0) !== m.userData.pecas)
      divergent.push(`pecas:${m.name}:${bakedQuads.get(m.uuid) || 0}/${m.userData.pecas}`);
  });
  const inventoryFns = (0, eval)('(()=>{' + inventorySource.replaceAll('export function ', 'function ')
    + ';return {identifyGraffitiTexture,inventoryGraffitiMaterials}})()');
  const inventory = inventoryFns.inventoryGraffitiMaterials(root, THREE, superficieGrafitavel,
    inventoryFns.identifyGraffitiTexture, window.__graffitiCanvasSources);
  // Declarado por ANCESTRAL não reconcilia: quem conta é a malha medida, com nome próprio.
  for (const entry of inventory) {
    if (entry.classification !== 'declared-overlay') continue;
    const arte = entry.artwork.path || entry.artwork.producer;
    if (!/^(decal:|mural:|poster:)/.test(entry.mesh || '')) unknown.push(`ancestral:${arte}`);
    else if (!medidas.get(entry.meshUUID + ':' + entry.materialIndex)) unknown.push(`nao-medido:${arte}`);
  }

  // Cada face exige inventário e pixels próprios antes da consolidação da faixa.
  const porOrigem = new Map(inventory.map(e => [e.meshUUID + ':' + e.materialIndex, e]));
  const semEntrada = new Set(), semPixels = new Set();
  for (const p of pieces) {
    const e = porOrigem.get(p.origem);
    if (!e) semEntrada.add(p.file); else if (!e.visibleArtwork) semPixels.add(p.file);
  }
  unknown.push(...[...semEntrada].map(f => `sem-entrada:${f}`), ...[...semPixels].map(f => `sem-pixels:${f}`));
  // Faixas aprovadas da Quebrada: duas faces opostas, registradas pelas quatro quinas.
  // Girar ou deslocar o par retira a dispensa; ver GRAFITE-REGUA.md.
  const FAIXAS = id === 'quebrada' ? [
    { file: '/posters/mural-eternamente.jpg', x: -16.7, y: 2.51, z: -10.5, w: 1.58 * 1.8333, h: 1.58 },
    { file: '/posters/mural-leste-vive.jpg', x: 20.1, y: 2.51, z: 10.65, w: 1.58 * 1.8333, h: 1.58 },
  ] : [];
  const quinas = r => {
    const dx = Math.cos(r.ry) * r.w / 2, dz = -Math.sin(r.ry) * r.w / 2;
    return [[r.x - dx, r.y + r.h / 2, r.z - dz], [r.x + dx, r.y + r.h / 2, r.z + dz],
      [r.x - dx, r.y - r.h / 2, r.z - dz], [r.x + dx, r.y - r.h / 2, r.z + dz]];
  };
  // Mesma tolerância da pose (0.01): quad inteiro contra o registro, não centro/tamanho.
  const mesmoQuad = (a, b) => quinas(a).every(c => quinas(b).some(d =>
    c.every((v, i) => Math.abs(v - d[i]) <= .01)));
  const grupos = new Map();
  for (let i = pieces.length - 1; i >= 0; i--) {
    const p = pieces[i];
    if (!/^faixa:/.test(p.name)) continue;
    const chave = p.file + '|' + [p.x, p.y, p.z, p.w, p.h].map(r3v).join(',');
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(p);
    pieces.splice(i, 1);
  }
  const banners = [], faixaValida = new Set();
  for (const grupo of grupos.values()) {
    const base = grupo[0];
    const aprovada = FAIXAS.find(f => f.file === base.file && mesmoQuad(base, { ...f, ry: Math.PI / 2 }));
    const opostas = grupo.length === 2 && grupo.every(p => p.uvLegivel && p.lado === THREE.FrontSide)
      && Math.cos(grupo[0].ry - grupo[1].ry) <= -.98;
    const coplanares = grupo.length === 2 && mesmoQuad(grupo[0], grupo[1]);
    const relato = { file: base.file, x: r3v(base.x), y: r3v(base.y), z: r3v(base.z),
      w: r3v(base.w), h: r3v(base.h), faces: grupo.length,
      estado: aprovada && opostas && coplanares ? 'aprovada' : aprovada ? 'par-invalido' : 'nao-registrada' };
    if (aprovada && opostas && coplanares) {
      for (const p of grupo) faixaValida.add(p.origem);
      relato.normais = grupo.map(p => r3v(p.ry));
      pieces.push({ ...base, source: 'faixa', faces: 2 });   // 1 objeto físico; parede não se exige (arame)
    } else {
      pieces.push(...grupo);
      relato.motivo = !aprovada ? 'fora-do-registro'
        : grupo.length !== 2 ? `faces=${grupo.length}`
        : grupo.some(p => p.lado !== THREE.FrontSide) ? 'face-nao-frontside'
        : !coplanares ? 'nao-coplanares'
        : Math.cos(grupo[0].ry - grupo[1].ry) > -.98 ? 'normais-nao-opostas' : 'uv-ilegivel';
    }
    banners.push(relato);
  }
  // (pixels/entrada por face já validados ANTES da consolidação de faixa — R3 nº1/nº2)
  const unclassified = inventory.filter(entry => entry.classification !== 'declared-overlay'
    && !faixaValida.has(entry.meshUUID + ':' + entry.materialIndex));
  unknown.push(...unclassified.map(entry => `${entry.classification}:${entry.artwork.path || entry.artwork.producer}`));
  if (mutant === 'repeticao' && pieces.length) pieces.push({ ...pieces[0], source: 'mutation' });
  if (mutant === 'sem-arte') pieces.length = 0;
  if (mutant === 'fora-casa') pieces.push({ x: 0, y: 1, z: 35.4, ry: Math.PI, w: 2, h: 1, file: 'mutation-house' });
  if (mutant === 'faixa-azul') pieces.push({ x: 0, y: 2.3, z: -24.97, ry: 0, w: 1, h: .4, file: 'mutation-band' });
  // Contagem por IDENTIDADE editorial (alias curado); pieces.file preserva o caminho real.
  const counts = new Map();
  for (const piece of pieces) {
    const key = identidadeArteGrafite(piece.file);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  for (const entry of unclassified) {
    const key = identidadeArteGrafite(entry.artwork.path || entry.artwork.producer);
    counts.set(key, (counts.get(key) || 0) + entry.instances);
  }
  const duplicates = [...counts].filter(([, n]) => n > 1).map(([file, count]) => ({ file, count }));
  // A textura branca vem de uma parede conhecida, sem confiar na allowlist do produtor.
  let whiteCoverage;
  if (id === 'piscina_treta') {
    const walls = [];
    root.traverse(mesh => {
      if (!mesh.isMesh || /^(decal:|mural:|poster:|faixa:)/.test(mesh.name) || mesh.userData.pecas) return;
      for (let n = mesh; n; n = n.parent) if (!n.visible) return;
      walls.push(mesh);
    });
    const ray = new THREE.Raycaster(new THREE.Vector3(0, 6, -24), new THREE.Vector3(0, 0, -1), 0, 2);
    const knownWall = ray.intersectObjects(walls, false).find(hit => !Array.isArray(hit.object.material) && hit.object.material.opacity === 1);
    const whiteImage = knownWall?.object.material.map?.source?.data;
    if (!whiteImage) throw Error('Parede branca de referência ausente; não aceitar curadoria');
    const cover = criarCoberturaGrafite(mesh => !Array.isArray(mesh.material)
      && mesh.material.map?.source?.data === whiteImage, .05);
    whiteCoverage = p => cover(p, walls);
  }
  // Os limites da casa B vêm das quatro paredes MAT.office construídas no Ferro.
  const allowed = p => {
    const dx = Math.abs(Math.cos(p.ry)) * p.w / 2, dz = Math.abs(Math.sin(p.ry)) * p.w / 2;
    const x0 = p.x - dx, x1 = p.x + dx, z0 = p.z - dz, z1 = p.z + dz;
    if (id === 'ferro_velho') return x0 >= -12.5 && x1 <= 2.5 && z0 >= -35.5 && z1 <= -26.5;
    if (id !== 'piscina_treta') return true;
    return whiteCoverage(p);
  };
  const outside = pieces.filter(p => !allowed(p));
  const support = criarSuporteGrafite(root, gradeEspacial);
  // Suporte próprio de poster ignora o Mesh INTEIRO: só vale com 1 poster por Mesh (Root
  // 31/10). Batch de 2+ quads não sabe excluir só o triângulo alvo — UNKNOWN (R3 nº7).
  const posterMeshes = new Map();
  root.traverse(mesh => { if (mesh.isMesh && /^poster:/.test(mesh.name)) posterMeshes.set(mesh.uuid, mesh); });
  const quadsDoMesh = new Map();
  for (const [chave, n] of medidas) { const u = chave.split(':')[0]; quadsDoMesh.set(u, (quadsDoMesh.get(u) || 0) + n); }
  const suportePoster = new Map();   // lazy: criado só para Mesh com peça efetivamente avaliada
  const unsupported = [], batched = new Set();
  for (const p of pieces) {
    if (p.source === 'faixa') continue;   // pano em arame: dispensa parede
    const mesh = posterMeshes.get((p.origem || '').split(':')[0]);
    if (mesh && (quadsDoMesh.get(mesh.uuid) || 0) > 1) { batched.add(p.file); continue; }
    let sup = support;
    if (mesh) {
      if (!suportePoster.has(mesh.uuid)) suportePoster.set(mesh.uuid, criarSuporteGrafite(root, gradeEspacial, mesh));
      sup = suportePoster.get(mesh.uuid);
    }
    if (!sup(p)) unsupported.push(p);
  }
  unknown.push(...[...batched].map(f => `poster-batched:${f}`));
  const unclassifiedOccurrences = unclassified.reduce((sum, entry) => sum + entry.instances, 0);
  return { id, total: pieces.length + unclassifiedOccurrences, overlayPieces: pieces.length,
    unclassifiedOccurrences, unique: counts.size, sources: pieces.reduce((a, p) => (a[p.source || 'mutation'] = (a[p.source || 'mutation'] || 0) + 1, a), {}),
    duplicates, outside, unsupported, unknown, divergent, pieces, banners, inventory,
    pass: pieces.length > 0 && !duplicates.length && !outside.length && !unsupported.length && !unknown.length && !divergent.length };
}
