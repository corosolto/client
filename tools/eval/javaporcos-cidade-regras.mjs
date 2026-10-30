/* ============================================================================
   javaporcos-cidade-regras.mjs — cláusulas da CIDADE do mapa Invasão dos Javaporcos,
   chamadas por javaporcos-mapa-check.mjs (mesmo mundo, mesmo placar, mesmos mutantes).

   POR QUE EXISTE
   Gauntlet visual, rodada 2 (crítico de contexto limpo, 30/10/2026, nota 3/10): saco de lixo,
   entulho e moita liam como "pedra facetada" (IcosahedronGeometry); a janela era um buraco
   preto com grade de 0,025 m que some a mais de 2 m; o poste era uma viga com textura de
   bloco e um deles ficava no meio do cruzamento; a rua tinha 9 carros; o chão do beco era
   cimento liso. Cada frase vira uma propriedade do mundo que o build devolve.

   O QUE ELE MEDE
     ICO1    nenhuma malha de icosaedro/poliedro dentro da cidade (ou com nome de lixo,
             beco, cidade, food) e o fonte da cidade não constrói IcosahedronGeometry.
     JANELA1 ≥ 40 vãos de janela, um vidro por vão; ≥ 8 janelas gradeadas com barra de
             ≥ 0,035 m, passo ≤ 0,13 m e o vidro ≥ 0,07 m atrás da grade.
     CARRO1  ≥ 16 carros em `root.userData.carros`, só ids de licença comercial, folga
             lateral até a guia entre 0,15 e 0,45 m e nenhum dentro do cruzamento.
     POSTE1  poste é CylinderGeometry, ≥ 16, nenhum no cruzamento (|x|,|z| < 8), uma
             luminária emissiva (≥ 2) por poste, trafo em ≥ 1 a cada 3 e exatamente 4
             luzes pontuais (as da praça).
     DECAL1  ≥ 25 decalques de chão (lixo, poça, mancha, rachadura) dentro de cada beco.

   RODADA 3 (crítico 5,5/10, 30/10: "faixa de pedestre parece tábua de madeira"):
     ZEBRA1  o atlas é desenhado num contexto gravador e a célula da faixa é medida em
             METROS (0,5 × 2,6 m): nenhuma marca de desgaste ≥ 0,3 m com razão ≥ 4 no
             comprimento da faixa (veio), ≥ 80% das marcas com razão ≤ 4, tinta com b* ≤ 5.
     JANELA2 o vidro mostra o cômodo ("janela preta atrás da grade", L* 6): material com o
             mapa de interior, metal ≤ 0,1, cortina de luminância média ≥ 0,25 e 10–40% das
             janelas acesas com emissivo quente (r > g > b) modulado pelo mesmo mapa.

   MUTANTES (cada um tem de acender a cláusula indicada):
     saco-icosaedro  planta um saco de icosaedro na avenida          -> ICO1
     janela-cega     tira o vidro de todas as janelas                -> JANELA1
     carro-nc        troca um carro por byd_dolphin (licença NC)     -> CARRO1
     carros-poucos   volta a 9 carros                                -> CARRO1
     poste-viga      poste volta a caixa 0,18 × 9 × 0,25             -> POSTE1
     beco-limpo      tira a malha de decalques                       -> DECAL1
     zebra-veio      devolve as 10 tiras de altura inteira da rodada 2  -> ZEBRA1
     janela-preta    vidro volta ao cinza metálico 0x46525a, sem mapa    -> JANELA2
   ============================================================================ */

export const MUTANTES = ['saco-icosaedro', 'janela-cega', 'carro-nc', 'carros-poucos', 'poste-viga', 'beco-limpo', 'zebra-veio', 'janela-preta'];
// licença: public/models/props/FONTE.md (saveiro/byd CC-BY-NC-SA); o gol g2 também é NC
export const CARROS_NC = ['saveiro_robust', 'byd_dolphin', '1999_volkswagen_gol_2000_gti_g2'];
export const CARROS_COMERCIAIS = ['carro_batido_scan_03', 'carro_batido_scan_07', 'perua_pichada_scan', 'junk_car',
  'chevette_sl76', 'uno_mille', '1968_volkswagen_beetle', 'old_vw_bug'];

const CIDADE_R = 36, AV = 6, CAL = 2, MEIA_CARRO = 0.86;
const TX = await import('../../public/js/map_javaporcos_texturas.js');

/* Desenha o atlas de decalque num canvas falso que grava fillRect/ellipse com a operação
   e a tinta do momento: mede o desenho, não a intenção. */
function gravaAtlas() {
  const telas = [];
  const novaTela = () => {
    const marcas = [];
    let op = 'source-over', estilo = '';
    const ctx = new Proxy({}, {
      get: (t, k) => (k === 'fillRect' ? (x, y, w, h) => marcas.push({ x, y, w, h, rot: 0, op, estilo })
        : k === 'ellipse' ? (x, y, rx, ry, rot = 0) => marcas.push({ x: x - rx, y: y - ry, w: 2 * rx, h: 2 * ry, rot, op, estilo })
          : typeof k === 'string' && k.startsWith('create') ? () => ({ addColorStop() {} })
            : k === 'measureText' ? () => ({ width: 10 }) : k in t ? t[k] : () => {}),
      set: (t, k, v) => { if (k === 'globalCompositeOperation') op = v; if (k === 'fillStyle') estilo = v; t[k] = v; return true; },
    });
    const c = { width: 0, height: 0, style: {}, getContext: () => ctx };
    telas.push(marcas);
    return c;
  };
  const orig = globalThis.document.createElement;
  globalThis.document.createElement = (tag) => (tag === 'canvas' ? novaTela() : orig.call(globalThis.document, tag));
  try { TX.decalAtlasTex(); } finally { globalThis.document.createElement = orig; }
  return telas[0];
}
const labB = (r, g, b) => {
  const lin = (v) => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B, Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.089;
  return 200 * (f(Y) - f(Z));
};

export function regrasCidade({ W, THREE, MUT, regra, exige, fs }) {
  const malhas = () => { const l = []; W.root.traverse((o) => { if (o.isMesh) l.push(o); }); return l; };
  const porNome = (nome) => malhas().find((o) => o.name === nome) || null;
  const m4 = new THREE.Matrix4(), p3 = new THREE.Vector3(), q4 = new THREE.Quaternion(), s3 = new THREE.Vector3();
  const instancias = (m) => {
    const out = [];
    for (let i = 0; i < (m?.count || 0); i++) { m.getMatrixAt(i, m4); m4.decompose(p3, q4, s3); out.push({ p: p3.clone(), q: q4.clone(), s: s3.clone() }); }
    return out;
  };

  if (MUT === 'saco-icosaedro') {
    const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(0.33, 0), new THREE.MeshBasicMaterial());
    ico.name = 'lixo-saco-solto'; ico.position.set(3, 0.2, 18); W.root.add(ico); ico.updateMatrixWorld(true);
  }
  if (MUT === 'janela-cega') { const v = porNome('beco-vidro'); exige(v, 'MUTANTE janela-cega NÃO APLICOU'); v.parent.remove(v); }
  if (MUT === 'janela-preta') {
    const vs = ['beco-vidro', 'beco-vidro-aceso'].map(porNome).filter(Boolean);
    exige(vs.length === 2, 'MUTANTE janela-preta NÃO APLICOU');
    for (const v of vs) v.material = new THREE.MeshStandardMaterial({ color: 0x46525a, roughness: 0.12, metalness: 0.35 });
  }
  if (MUT === 'carro-nc') { exige(W.root.userData.carros?.length, 'MUTANTE carro-nc NÃO APLICOU'); W.root.userData.carros[0].id = 'byd_dolphin'; }
  if (MUT === 'carros-poucos') { exige(W.root.userData.carros?.length, 'MUTANTE carros-poucos NÃO APLICOU'); W.root.userData.carros.length = 9; }
  if (MUT === 'poste-viga') { const p = porNome('poste'); exige(p, 'MUTANTE poste-viga NÃO APLICOU'); p.geometry = new THREE.BoxGeometry(0.18, 9, 0.25); }
  if (MUT === 'beco-limpo') { const d = porNome('decal-chao'); exige(d, 'MUTANTE beco-limpo NÃO APLICOU'); d.parent.remove(d); }

  regra('ICO1 nenhum saco, entulho ou moita de icosaedro na cidade', () => {
    const ruins = [];
    for (const o of malhas()) {
      if (!/Icosahedron|Polyhedron/.test(o.geometry?.type || '')) continue;
      o.updateMatrixWorld(true); o.getWorldPosition(p3);
      const nome = o.name || o.parent?.name || '?';
      if (Math.max(Math.abs(p3.x), Math.abs(p3.z)) <= CIDADE_R || /lixo|saco|beco|cidade|food|inteiro|revirado/.test(nome)) ruins.push(nome);
    }
    exige(!ruins.length, `${ruins.length} malha(s) de icosaedro na cidade: ${[...new Set(ruins)].join(', ')}`);
    const fonte = fs.readFileSync(new URL('../../public/js/map_javaporcos_cidade.js', import.meta.url), 'utf8');
    exige(!/IcosahedronGeometry/.test(fonte), 'map_javaporcos_cidade.js ainda constrói IcosahedronGeometry');
    return `0 icosaedros na cidade, ${malhas().length} malhas varridas`;
  });

  regra('JANELA1 janela com vidro recuado e grade de barra ≥ 0,04 a cada ≤ 0,13 m', () => {
    const vidros = [...instancias(porNome('beco-vidro')), ...instancias(porNome('beco-vidro-aceso'))], barras = instancias(porNome('beco-grade')), vaos = instancias(porNome('beco-janela'));
    exige(vaos.length >= 40, `só ${vaos.length} vãos de janela instanciados (piso 40: casas + becos)`);
    exige(vidros.length === vaos.length, `${vidros.length} vidros para ${vaos.length} vãos: janela sem vidro é buraco preto`);
    let gradeadas = 0, recuoMin = Infinity, passoMax = 0;
    const n = new THREE.Vector3(), lat = new THREE.Vector3(), d = new THREE.Vector3();
    for (const v of vidros) {
      n.set(0, 0, 1).applyQuaternion(v.q); lat.set(1, 0, 0).applyQuaternion(v.q);
      const minhas = barras.filter((b) => { d.copy(b.p).sub(v.p); return Math.abs(d.y) < 0.1 && b.s.y > 0.8 && Math.abs(d.dot(lat)) < 0.6 && Math.abs(d.dot(n)) < 0.25; });
      if (!minhas.length) continue;
      gradeadas++;
      exige(minhas.every((b) => Math.min(b.s.x, b.s.z) >= 0.035), 'barra de grade mais fina que 0,04 m (some a 2 m)');
      recuoMin = Math.min(recuoMin, ...minhas.map((b) => d.copy(b.p).sub(v.p).dot(n)));
      const xs = minhas.map((b) => d.copy(b.p).sub(v.p).dot(lat)).sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) passoMax = Math.max(passoMax, xs[i] - xs[i - 1]);
    }
    exige(gradeadas >= 8, `só ${gradeadas} janela(s) gradeada(s) (piso 8: todas as dos becos)`);
    exige(recuoMin >= 0.07, `vidro só ${recuoMin.toFixed(3)} m atrás da grade (piso 0,07)`);
    exige(passoMax <= 0.13, `vão entre barras de ${passoMax.toFixed(3)} m (teto 0,13)`);
    return `${vaos.length} janelas com vidro, ${gradeadas} gradeadas, vidro ≥ ${recuoMin.toFixed(2)} m atrás da grade, passo ≤ ${passoMax.toFixed(2)} m`;
  });

  regra('CARRO1 ≥ 16 carros, só licença comercial, na guia e fora do cruzamento', () => {
    const carros = W.root.userData.carros || [];
    exige(carros.length >= 16, `só ${carros.length} carros estacionados (piso 16)`);
    const ruins = carros.filter((c) => !CARROS_COMERCIAIS.includes(c.id) || CARROS_NC.includes(c.id));
    exige(!ruins.length, `carro fora da lista comercial: ${ruins.map((c) => c.id).join(', ')}`);
    const folgas = carros.map((c) => AV - Math.abs(Math.abs(c.x) < AV ? c.x : c.z) - MEIA_CARRO);
    exige(folgas.every((f) => f >= 0.15 && f <= 0.45), `folga lateral até a guia fora de 0,15–0,45 m: ${folgas.map((f) => f.toFixed(2)).join(' ')}`);
    exige(carros.every((c) => Math.max(Math.abs(c.x), Math.abs(c.z)) >= AV + CAL), 'carro estacionado dentro do cruzamento');
    return `${carros.length} carros (${[...new Set(carros.map((c) => c.id))].join(', ')}), folga ${Math.min(...folgas).toFixed(2)}–${Math.max(...folgas).toFixed(2)} m`;
  });

  regra('POSTE1 poste redondo, luminária acesa, nenhum no cruzamento', () => {
    const p = porNome('poste'), lente = porNome('poste-lente'), trafo = porNome('poste-trafo');
    exige(p && /Cylinder/.test(p.geometry.type), `poste é ${p?.geometry.type || 'ausente'}, não cilindro`);
    const ps = instancias(p);
    exige(ps.length >= 16, `só ${ps.length} postes`);
    exige(ps.every((q) => !(Math.abs(q.p.x) < AV + CAL && Math.abs(q.p.z) < AV + CAL)), 'poste dentro do cruzamento');
    exige(lente && lente.count === ps.length && lente.material.emissiveIntensity >= 2, 'luminária faltando ou apagada');
    exige(trafo && trafo.count >= Math.floor(ps.length / 3), `transformador em ${trafo?.count || 0} postes (piso 1 a cada 3)`);
    let luzes = 0;
    W.root.traverse((o) => { if (o.isPointLight) luzes++; });
    exige(luzes === 4, `${luzes} luzes pontuais no mapa (exatamente 4, as da praça)`);
    return `${ps.length} postes cilíndricos, ${lente.count} luminárias, ${trafo.count} trafos, ${luzes} luzes na praça`;
  });

  regra('DECAL1 chão do beco com ≥ 25 decalques por beco', () => {
    const d = porNome('decal-chao');
    exige(d, 'sem malha de decalque de chão');
    const pos = d.geometry.attributes.position;
    const bbs = malhas().filter((o) => o.name === 'chao-beco').map((b) => new THREE.Box3().setFromObject(b));
    const conta = bbs.map(() => 0);
    for (let q = 0; q < pos.count / 4; q++) {
      let x = 0, z = 0;
      for (let k = 0; k < 4; k++) { x += pos.getX(q * 4 + k) / 4; z += pos.getZ(q * 4 + k) / 4; }
      bbs.forEach((bb, i) => { if (x >= bb.min.x && x <= bb.max.x && z >= bb.min.z && z <= bb.max.z) conta[i]++; });
    }
    exige(bbs.length >= 4 && conta.every((c) => c >= 25), `decalques por beco: ${conta.join(', ')} (piso 25)`);
    return `${pos.count / 4} decalques no mapa; por beco ${conta.join(', ')}`;
  });

  regra('ZEBRA1 faixa de pedestre gasta sem veio de tábua', () => {
    const C = 256, ox = (8 % 4) * C, oy = ((8 / 4) | 0) * C, SX = 0.5 / C, SY = 2.6 / C;   // célula 8 esticada 0,5 × 2,6 m
    const marcas = gravaAtlas();
    exige(marcas?.length, 'atlas de decalque não desenhou nada no canvas gravador');
    const naCelula = marcas.filter((m) => m.x + m.w / 2 >= ox && m.x + m.w / 2 < ox + C && m.y + m.h / 2 >= oy && m.y + m.h / 2 < oy + C);
    const tinta = naCelula.find((m) => m.op === 'source-over' && /rgba?\(/.test(m.estilo) && m.w > C / 2);
    exige(tinta, 'sem tinta de faixa na célula 8');
    if (MUT === 'zebra-veio') for (let i = 0; i < 10; i++) naCelula.push({ x: ox + i * 25, y: oy, w: 4, h: C, rot: 0, op: 'destination-out' });
    const [r, g, b] = tinta.estilo.match(/[\d.]+/g).map(Number);
    const bstar = labB(r, g, b);
    const gasto = naCelula.filter((m) => m.op === 'destination-out').map((m) => {
      const c = Math.cos(m.rot), s = Math.sin(m.rot);
      const u = Math.hypot(c * m.w * SX, s * m.w * SY), v = Math.hypot(s * m.h * SX, c * m.h * SY);
      return { longo: Math.max(u, v), razao: Math.max(u, v) / Math.max(1e-6, Math.min(u, v)), noComprimento: v > u };
    });
    exige(gasto.length >= 40, `só ${gasto.length} marcas de desgaste na faixa`);
    const veios = gasto.filter((m) => m.noComprimento && m.longo >= 0.3 && m.razao >= 4);
    const iso = gasto.filter((m) => m.razao <= 4).length / gasto.length;
    exige(!veios.length, `${veios.length} marca(s) de desgaste viram veio de tábua (≥ 0,3 m e razão ≥ 4 no comprimento)`);
    exige(iso >= 0.8, `só ${(100 * iso).toFixed(0)}% das marcas com razão ≤ 4 em metros (piso 80%)`);
    exige(bstar <= 5, `tinta da faixa amarelada: b* ${bstar.toFixed(1)} (teto 5; a da rodada 2 dava 6,4)`);
    return `${gasto.length} marcas de desgaste, 0 veios, ${(100 * iso).toFixed(0)}% com razão ≤ 4 em metros, tinta b* ${bstar.toFixed(1)}`;
  });

  regra('JANELA2 janela com cômodo atrás do vidro, algumas acesas', () => {
    const apagada = porNome('beco-vidro'), acesa = porNome('beco-vidro-aceso');
    exige(apagada && acesa, `falta malha de vidro ${apagada ? '' : 'apagada '}${acesa ? '' : 'acesa'}`);
    const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    for (const v of [apagada, acesa]) {
      const m = v.material;
      exige(m.map && /janela-interior/.test(m.map.name || ''), `${v.name} sem o mapa de interior (vidro chapado)`);
      exige(m.metalness <= 0.1, `${v.name} com metal ${m.metalness} (sem ambiente o metal sai preto)`);
      exige(lum(m.color) >= 0.5, `${v.name} com cor de base escura (${m.color.getHexString()})`);
      exige(v.instanceColor, `${v.name} sem cor de cortina por instância`);
      const c = new THREE.Color(); let soma = 0;
      for (let i = 0; i < v.count; i++) { v.getColorAt(i, c); soma += lum(c); }
      exige(soma / v.count >= 0.25, `cortina média de luminância ${(soma / v.count).toFixed(2)} (piso 0,25)`);
    }
    const e = acesa.material.emissive, fr = acesa.count / (acesa.count + apagada.count);
    exige(acesa.material.emissiveIntensity > 0 && e.r > e.g && e.g > e.b, 'janela acesa sem emissivo quente');
    exige(acesa.material.emissiveMap === acesa.material.map, 'luz da janela acesa não passa pela cortina (emissiveMap ≠ map)');
    exige(fr >= 0.1 && fr <= 0.4, `${(100 * fr).toFixed(0)}% das janelas acesas (faixa 10–40%)`);
    return `${apagada.count + acesa.count} janelas com cortina, ${acesa.count} acesas (${(100 * fr).toFixed(0)}%)`;
  });
}
