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
     JANELA1 ≥ 40 vãos reais/decorativos, vidro nos decorativos; ≥ 8 janelas gradeadas com barra de
             ≥ 0,035 m, passo ≤ 0,13 m e o vidro ≥ 0,07 m atrás da grade.
     CARRO1  ≥ 16 carros em `root.userData.carros`, só ids de licença comercial, folga
             lateral até a guia entre 0,15 e 0,45 m e nenhum dentro do cruzamento.
     POSTE1  poste é CylinderGeometry, ≥ 16, nenhum no cruzamento (|x|,|z| < 8), uma
             luminária emissiva (≥ 2) por poste, trafo em ≥ 1 a cada 3 e exatamente 4
             luzes pontuais na praça e 1 de sódio que serve aos becos (rodada 3), 5 no total.
     DECAL1  ≥ 25 decalques de chão (lixo, poça, mancha, rachadura) dentro de cada beco.

   RODADA 3 (crítico 5,5/10, 30/10: "faixa de pedestre parece tábua de madeira"):
     ZEBRA1  o atlas é desenhado num contexto gravador e a célula da faixa é medida em
             METROS (0,5 × 2,6 m): nenhuma marca de desgaste ≥ 0,3 m com razão ≥ 4 no
             comprimento da faixa (veio), ≥ 80% das marcas com razão ≤ 4, tinta com b* ≤ 5.
     JANELA2 o vidro mostra o cômodo ("janela preta atrás da grade", L* 6): material com o
             mapa de interior, metal ≤ 0,1, cortina de luminância média ≥ 0,25 e 10–40% das
             janelas acesas com emissivo quente (r > g > b) modulado pelo mesmo mapa.
     JANELA3 rodada 4 ("grade de tábua branca", p95 L* da janela 54 contra 31 da parede): a
             janela apagada não brilha sozinha (emissivo de luminância linear ≤ 0,01; o
             0x4a4238 da rodada 3 dava 0,05) e a acesa compensa a cortina mais escura com
             emissiveIntensity ≥ 1,2.
    MURO1   rodada 4 (muro do beco na sombra voltou a L* 14 com o hemi a 0,95): o material
             `muro-bloco` tem albedo de luminância linear ≥ 0,7 (o 0xc4c0b8 dava 0,52). É albedo
             e não luz de preenchimento porque a cena já está no teto de 9 luzes pontuais.
    SACO1   rodada 4 ("saco ovo": saco solto em pé de silhueta simétrica no beco-n): dentro de
             cada beco todo saco está num monte (≥ 2 vizinhos a ≤ 1 m), com escala por eixo
             (maior/menor ≥ 1,1, altura 0,65–0,95) e inclinação ≥ 15° ou tombado (≥ 70°), um
             tombado por beco e ≥ 3 decalques de lixo a ≤ 0,9 m de um saco.
    BECOLUZ1 luz de sódio em cada beco ("beco sem fonte de luz", saco L* 6): com a câmera
             posta em cada beco, a luz `beco-luz` vai para dentro dele a 4–5 m, quente,
             intensidade ≥ 4, alcance 10–16 m, decaimento 2, com luminária a ≤ 0,5 m.
             Rodada 4 ("beiral alaranjado", C* 11,4 → 28,8): é SpotLight de abertura ≤ 1,2 rad
             com o eixo a ≤ 10° da vertical para baixo (nada acima da lâmpada recebe luz) e
             cor menos laranja (g/r ≥ 0,72; o 0xffb060 da rodada 3 dava 0,69).
     FIOS1   o rasgo de céu do beco tem poste e fio (sumiram na rodada 2): ≥ 3 fios acima de
             5,5 m cruzando o eixo de cada beco e um poste a ≤ 2 m da boca da viela.
     RUA1    rua do eixo da câmera do centro cheia ("rua vazia", ruaObj 3,8%): ≥ 8 carros no
             braço norte, todo junk_car repintado, ≥ 4 com C* ≥ 20 em ≥ 3 cores; caçamba a
             ≤ 12 m da faixa norte, monte de ≥ 8 sacos e mesa de bar com ≥ 2 cadeiras cada.

   RODADA 5 (crítico 6/10, 30/10: "mapa escuro", rodapé bordô do beco-n chapado):
     BARRA1  o material `barra-reboco` (rodapé e barra) usa o reboco descascado procedural
             (`jp-reboco-desc-*`), albedo branco e relevo com normalScale ≥ 2: o
             peeling_painted_wall tem sdL 1,8 e na sombra o rodapé lia flat8 99,7%.
     ORC2    telhado de 4 águas não fica solto: nenhuma malha ConeGeometry de 4 lados e ≤ 3
             malhas `telhado-lote` (eram 25 chamadas; a alta-diag estava em 999 de 1.000).
     FORRO1  o beiral visto de baixo é forro de tábua ("beiral tábua preta"): cada lote de
             telhado tem 2 grupos, o segundo com o mapa `jp-madeira` e cor de vértice ≥ 1,4
             (albedo L* ~50 em vez dos 40 da madeira crua), e nunca o material da telha.
     LAMP1   lâmpada do beco com ponto quente ("SpotLight virado pro chão, sem ponto quente"):
             cone de sódio a ≥ 30 e lente `poste-lente` com emissivo 0xffc48a a ≥ 4.
     LAMP2   halo `beco-luz-halo` aditivo de raio ≥ 0,5 m que vai com a luz para cada beco
             (a ≤ 0,3 m dela) e encara a câmera: a captura não passa pelo bloom.
     RUA3    lixo de guia que se vê ("mudou 1–4 px"): em cada trecho de RUA2, ≥ 5 peças 3D de
             ≥ 0,15 m a ≤ 0,6 m da guia nos primeiros 15 m e decalque de lado médio ≥ 0,9 m.

   RODADA 4 (crítico 6/10: "rua do centro lê como pátio", sem lixo ao longo da guia):
     ORC1    o GLB saco_lixo tem ~2,7 mil triângulos e a caixa ~3,2 mil: com os montes do
             beco o beco-l passava de 2,36 M. Corte por distância de saco_lixo e caixa_papelao
             ≤ 28 m em todo PropBatch da cidade e do mapa (eram 35–40).
     RUA2    no braço norte e nas duas guias da avenida leste-oeste (de 8,5 a 30 m do centro)
             há ≥ 0,8 decalque de lixo por metro a ≤ 0,6 m de cada guia, do lado do asfalto.

   MUTANTES (cada um tem de acender a cláusula indicada):
     saco-icosaedro  planta um saco de icosaedro na avenida          -> ICO1
     janela-cega     tira o vidro de todas as janelas                -> JANELA1
     carro-nc        troca um carro por byd_dolphin (licença NC)     -> CARRO1
     carros-poucos   volta a 9 carros                                -> CARRO1
     poste-viga      poste volta a caixa 0,18 × 9 × 0,25             -> POSTE1
     beco-limpo      tira a malha de decalques                       -> DECAL1
     zebra-veio      devolve as 10 tiras de altura inteira da rodada 2  -> ZEBRA1
     janela-preta    vidro volta ao cinza metálico 0x46525a, sem mapa    -> JANELA2
     janela-tabua    janela apagada volta a emitir 0x4a4238                -> JANELA3
     muro-escuro     muro volta ao albedo 0xc4c0b8                         -> MURO1
     barra-lisa      rodapé volta ao mapa liso, sem relevo                 -> BARRA1
     telhado-solto   um cone de telhado por casa de novo                   -> ORC2
     beiral-preto    tampa de baixo do telhado volta à telha                -> FORRO1
     lampada-fraca   cone volta a 20 e lente a 0xffb070 a 3                 -> LAMP1
     sem-halo        tira o halo da lâmpada                                 -> LAMP2
     guia-rasa       some com as latas da guia                              -> RUA3
     saco-ovo        tira a escala por eixo e a inclinação de todo saco      -> SACO1
     guia-limpa      some com o lixo de guia da malha de decalque             -> RUA2
     saco-longe      corte do saco volta a 38 m no fonte lido                 -> ORC1
     beco-apagado    tira a luz dos becos                                 -> BECOLUZ1, POSTE1
     luz-presa       a luz não segue a câmera (fica no primeiro beco)     -> BECOLUZ1
     luz-bola        volta a pontual 0xffb060 a 18 (acende o forro do beiral) -> BECOLUZ1
     beco-sem-fio    tira da fiação os segmentos sobre os becos           -> FIOS1
     rua-vazia       volta o braço norte a 4 carros e tira a cena da rua  -> RUA1
     carro-carvao    junk_car sem pintura (a ferrugem da rodada 2)        -> RUA1
   ============================================================================ */

export const MUTANTES = ['saco-icosaedro', 'janela-real-cega', 'janela-cega', 'carro-nc', 'carros-poucos', 'poste-viga', 'beco-limpo', 'zebra-veio', 'janela-preta', 'janela-tabua', 'muro-escuro', 'barra-lisa', 'telhado-solto', 'beiral-preto', 'lampada-fraca', 'sem-halo', 'guia-rasa', 'saco-ovo', 'guia-limpa', 'saco-longe', 'beco-apagado', 'luz-presa', 'luz-bola', 'beco-sem-fio', 'rua-vazia', 'carro-carvao'];
// licença: public/models/props/FONTE.md (saveiro/byd CC-BY-NC-SA); gol g2 e fusca 1968 (asset.extras) também são NC
export const CARROS_NC = ['saveiro_robust', 'byd_dolphin', '1999_volkswagen_gol_2000_gti_g2', '1968_volkswagen_beetle'];
export const CARROS_COMERCIAIS = ['carro_batido_scan_03', 'carro_batido_scan_07', 'perua_pichada_scan', 'junk_car',
  'chevette_sl76', 'uno_mille', 'old_vw_bug'];

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
  const becoCaixas = () => malhas().filter((o) => o.name === 'chao-beco').map((b) => new THREE.Box3().setFromObject(b));
  const sobreBeco = (bb, x, z, folga) => x >= bb.min.x - folga && x <= bb.max.x + folga && z >= bb.min.z - folga && z <= bb.max.z + folga;
  if (MUT === 'beco-apagado') {
    const ls = []; W.root.traverse((o) => { if (o.isLight && o.name === 'beco-luz') ls.push(o); });
    exige(ls.length, 'MUTANTE beco-apagado NÃO APLICOU'); ls.forEach((l) => l.parent.remove(l));
  }
  if (MUT === 'luz-bola') {
    const l = W.root.getObjectByName('beco-luz'), g = porNome('beco-luz-guia');
    exige(l && g, 'MUTANTE luz-bola NÃO APLICOU');
    const p = new THREE.PointLight(0xffb060, 18, 14, 2); p.name = 'beco-luz'; p.position.copy(l.position);
    l.parent.add(p); l.parent.remove(l);
    g.onBeforeRender = (r, s, cam) => { p.position.set(cam.position.x, 4.35, cam.position.z); p.updateMatrixWorld(); };
  }
  if (MUT === 'luz-presa') { const g = porNome('beco-luz-guia'); exige(g, 'MUTANTE luz-presa NÃO APLICOU'); g.onBeforeRender = () => {}; }
  if (MUT === 'beco-sem-fio') {
    const f = porNome('fiacao'), bbs = becoCaixas(), fica = instancias(f).map((q, i) => [q, i]).filter(([q]) => !bbs.some((bb) => sobreBeco(bb, q.p.x, q.p.z, 1.5)));
    exige(f && fica.length < f.count, 'MUTANTE beco-sem-fio NÃO APLICOU');
    fica.forEach(([, i], k) => { f.getMatrixAt(i, m4); f.setMatrixAt(k, m4); });
    f.count = fica.length;
  }
  const noNorte = (c) => Math.abs(c.x) < AV && c.z <= -(AV + CAL) && c.z >= -CIDADE_R;
  if (MUT === 'rua-vazia') {
    const cs = W.root.userData.carros || [];
    exige(cs.filter(noNorte).length > 4 && W.root.userData.cenaRua, 'MUTANTE rua-vazia NÃO APLICOU');
    let k = 0;
    W.root.userData.carros = cs.filter((c) => !noNorte(c) || k++ < 4);
    W.root.userData.cenaRua = null;
  }
  if (MUT === 'carro-carvao') {
    const cs = (W.root.userData.carros || []).filter((c) => c.id === 'junk_car');
    exige(cs.length, 'MUTANTE carro-carvao NÃO APLICOU'); cs.forEach((c) => { c.cor = null; });
  }
  if (MUT === 'janela-preta') {
    const vs = ['beco-vidro', 'beco-vidro-aceso'].map(porNome).filter(Boolean);
    exige(vs.length === 2, 'MUTANTE janela-preta NÃO APLICOU');
    for (const v of vs) v.material = new THREE.MeshStandardMaterial({ color: 0x46525a, roughness: 0.12, metalness: 0.35 });
  }
  if (MUT === 'janela-tabua') { const v = porNome('beco-vidro'); exige(v, 'MUTANTE janela-tabua NÃO APLICOU'); v.material.emissive.set(0x4a4238); }
  const muroMat = () => { let m = null; W.root.traverse((o) => { if (o.isMesh && o.material?.name === 'muro-bloco') m = o.material; }); return m; };
  if (MUT === 'muro-escuro') { const m = muroMat(); exige(m, 'MUTANTE muro-escuro NÃO APLICOU'); m.color.set(0xc4c0b8); }
  const barraMat = () => { let m = null; W.root.traverse((o) => { if (o.isMesh && o.material?.name === 'barra-reboco') m = o.material; }); return m; };
  if (MUT === 'barra-lisa') {
    const m = barraMat(); exige(m, 'MUTANTE barra-lisa NÃO APLICOU');
    m.map = new THREE.Texture(); m.map.name = 'pbr-peeling_painted_wall-color'; m.normalScale.set(1, 1);
  }
  if (MUT === 'saco-ovo') {
    const ss = W.root.userData.sacos || [];
    exige(ss.some((g) => g.esc), 'MUTANTE saco-ovo NÃO APLICOU');
    for (const g of ss) { delete g.esc; g.rx = 0; g.rz = 0; }
  }
  /* guias: [eixo da coordenada fixa, valor, sinal do asfalto] e o trecho de 8,5 a 30 m no outro eixo */
  const GUIAS = [['x', -AV, 1, -1], ['x', AV, -1, -1], ['z', -AV, 1, -1], ['z', -AV, 1, 1], ['z', AV, -1, -1], ['z', AV, -1, 1]];
  const naGuia = (x, z, [ex, v, , lado]) => {
    const [f, t] = ex === 'x' ? [x, z] : [z, x];
    return Math.abs(f - v) <= 0.6 && t * lado >= AV + CAL + 0.5 && t * lado <= 30;
  };
  if (MUT === 'guia-limpa') {
    const d = porNome('decal-chao'); exige(d, 'MUTANTE guia-limpa NÃO APLICOU');
    const pos = d.geometry.attributes.position;
    for (let q = 0; q < pos.count / 4; q++) {
      let x = 0, z = 0;
      for (let k = 0; k < 4; k++) { x += pos.getX(q * 4 + k) / 4; z += pos.getZ(q * 4 + k) / 4; }
      if (GUIAS.some((g) => naGuia(x, z, g))) for (let k = 0; k < 4; k++) pos.setXYZ(q * 4 + k, 0, -50, 0);
    }
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
    let abertas = 0;
    const raio = new THREE.Raycaster();
    for (const c of W.root.userData.interiores || []) {
      const cs = Math.cos(c.ry), sn = Math.sin(c.ry);
      for (const [x,y,z,nx,nz] of [[0,1.7,-c.d/2,0,-1],[0,4.7,-c.d/2,0,-1],[c.w/2,1.7,0,1,0],[c.w/2,4.7,0,1,0],[0,4.7,c.d/2,0,1]]) {
        const centro = new THREE.Vector3(c.x+x*cs+z*sn,c.y+y,c.z-x*sn+z*cs);
        const normal = new THREE.Vector3(nx*cs+nz*sn,0,-nx*sn+nz*cs), lateral = new THREE.Vector3(normal.z,0,-normal.x);
        if (MUT === 'janela-real-cega' && abertas === 0) {
          const tampa = new THREE.Mesh(new THREE.BoxGeometry(1.6,1.4,.2),new THREE.MeshBasicMaterial());
          tampa.position.copy(centro); tampa.rotation.y=c.ry; W.root.add(tampa); W.root.updateMatrixWorld(true);
        }
        const acertos = (dx,dy) => {
          const origem = centro.clone().addScaledVector(lateral,dx).addScaledVector(normal,-.3); origem.y+=dy;
          raio.set(origem,normal); raio.far=.6;
          return raio.intersectObject(W.root,true).length;
        };
        for (const dx of [-.5,0,.5]) for (const dy of [-.4,0,.4]) {
          exige(acertos(dx,dy)===0, `janela real fechada em (${centro.x},${centro.y},${centro.z})`);
        }
        exige(acertos(0,-.9)>0 && acertos(0,.9)>0, 'vão real sem peitoril ou verga');
        abertas++;
      }
    }
    exige(vaos.length+abertas >= 40, `só ${vaos.length} janelas decorativas + ${abertas} vãos reais (piso total 40)`);
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
    return `${vaos.length} janelas com vidro + ${abertas} vãos reais, ${gradeadas} gradeadas, vidro ≥ ${recuoMin.toFixed(2)} m atrás da grade, passo ≤ ${passoMax.toFixed(2)} m`;
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
    const luzes = { praca: 0, beco: 0, outras: 0 };
    W.root.traverse((o) => { if (o.isPointLight || o.isSpotLight) luzes[o.name === 'praca-luz' ? 'praca' : o.name === 'beco-luz' ? 'beco' : 'outras']++; });
    exige(luzes.praca === 4 && luzes.beco === 1 && !luzes.outras, `luzes pontuais: ${luzes.praca} na praça, ${luzes.beco} de beco, ${luzes.outras} outras (exatamente 4 + 1 + 0)`);
    return `${ps.length} postes cilíndricos, ${lente.count} luminárias, ${trafo.count} trafos, ${luzes.praca} luzes na praça e ${luzes.beco} de beco`;
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

  regra('JANELA3 janela apagada não acende a cortina sozinha', () => {
    const apagada = porNome('beco-vidro'), acesa = porNome('beco-vidro-aceso');
    exige(apagada && acesa, 'falta malha de vidro');
    const e = apagada.material.emissive, y = (0.2126 * e.r + 0.7152 * e.g + 0.0722 * e.b) * apagada.material.emissiveIntensity;
    exige(y <= 0.01, `janela apagada emite ${y.toFixed(3)} (teto 0,01): cortina vira tábua branca`);
    exige(acesa.material.emissiveIntensity >= 1.2, `janela acesa a ${acesa.material.emissiveIntensity} (piso 1,2): some com a cortina escura`);
    return `apagada emite ${y.toFixed(4)}, acesa a ${acesa.material.emissiveIntensity}`;
  });

  regra('MURO1 muro de bloco claro o bastante para a sombra do beco', () => {
    const m = muroMat();
    exige(m, 'sem material muro-bloco');
    const y = 0.2126 * m.color.r + 0.7152 * m.color.g + 0.0722 * m.color.b;
    exige(y >= 0.7, `albedo do muro com luminância ${y.toFixed(2)} (piso 0,7): muro preto na sombra`);
    return `albedo do muro ${m.color.getHexString()}, luminância ${y.toFixed(2)}`;
  });

  regra('BARRA1 rodapé do beco com reboco descascado e relevo', () => {
    const m = barraMat();
    exige(m, 'sem material barra-reboco');
    exige(/^jp-reboco-desc/.test(m.map?.name || ''), `mapa do rodapé ${m.map?.name}: sem o reboco descascado o rodapé na sombra é placa lisa`);
    exige(m.normalScale.x >= 2, `normalScale ${m.normalScale.x} (piso 2): relevo some na sombra`);
    exige(Math.min(m.color.r, m.color.g, m.color.b) >= 0.95, `cor ${m.color.getHexString()} escurece o albedo do mapa`);
    return `mapa ${m.map.name}, normalScale ${m.normalScale.x}`;
  });

  regra('SACO1 saco do beco em monte, amassado e inclinado', () => {
    const ss = W.root.userData.sacos || [], bbs = becoCaixas(), d = porNome('decal-chao');
    exige(bbs.length >= 4 && d, 'sem becos ou sem decalque');
    const pos = d.geometry.attributes.position, centros = [];
    for (let q = 0; q < pos.count / 4; q++) {
      let x = 0, z = 0;
      for (let k = 0; k < 4; k++) { x += pos.getX(q * 4 + k) / 4; z += pos.getZ(q * 4 + k) / 4; }
      centros.push([x, z]);
    }
    const desc = bbs.map((bb) => {
      const dentro = ss.filter((g) => sobreBeco(bb, g.x, g.z, 0.3));
      exige(dentro.length >= 3, `beco em (${((bb.min.x + bb.max.x) / 2).toFixed(1)}, ${((bb.min.z + bb.max.z) / 2).toFixed(1)}) com ${dentro.length} saco(s)`);
      let tomb = 0;
      for (const g of dentro) {
        const viz = dentro.filter((o) => o !== g && Math.hypot(o.x - g.x, o.z - g.z) <= 1).length;
        exige(viz >= 2, `saco isolado em (${g.x.toFixed(1)}, ${g.z.toFixed(1)}): ${viz} vizinho(s) a ≤ 1 m`);
        const e = g.esc || [1, 1, 1], incl = THREE.MathUtils.radToDeg(Math.hypot(g.rx || 0, g.rz || 0));
        exige(Math.max(...e) / Math.min(...e) >= 1.1 && e[1] >= 0.65 && e[1] <= 0.95, `saco em (${g.x.toFixed(1)}, ${g.z.toFixed(1)}) de escala ${e.map((v) => v.toFixed(2)).join('/')}: silhueta de ovo`);
        exige(incl >= 15, `saco em (${g.x.toFixed(1)}, ${g.z.toFixed(1)}) em pé (${incl.toFixed(0)}°, piso 15°)`);
        if (incl >= 70) tomb++;
      }
      exige(tomb >= 1, 'beco sem saco tombado');
      const lixo = centros.filter(([x, z]) => dentro.some((g) => Math.hypot(g.x - x, g.z - z) <= 0.9)).length;
      exige(lixo >= 3, `só ${lixo} decalque(s) a ≤ 0,9 m dos sacos (piso 3)`);
      return dentro.length;
    });
    return `sacos por beco ${desc.join(', ')}, todos em monte, amassados e inclinados, com tombado e lixo vazado`;
  });

  regra('RUA2 lixo ao longo da guia na rua do centro', () => {
    const d = porNome('decal-chao');
    exige(d, 'sem malha de decalque de chão');
    const pos = d.geometry.attributes.position, conta = GUIAS.map(() => 0);
    for (let q = 0; q < pos.count / 4; q++) {
      let x = 0, z = 0;
      for (let k = 0; k < 4; k++) { x += pos.getX(q * 4 + k) / 4; z += pos.getZ(q * 4 + k) / 4; }
      GUIAS.forEach((g, i) => { if (naGuia(x, z, g)) conta[i]++; });
    }
    const comp = 30 - (AV + CAL + 0.5), dens = conta.map((c) => c / comp);
    exige(dens.every((v) => v >= 0.8), `lixo por metro de guia: ${dens.map((v) => v.toFixed(2)).join(', ')} (piso 0,8)`);
    return `lixo por metro em ${GUIAS.length} trechos de guia: ${dens.map((v) => v.toFixed(2)).join(', ')}`;
  });

  if (MUT === 'guia-rasa') { exige(W.root.userData.lixoGuia?.length, 'MUTANTE guia-rasa NÃO APLICOU'); W.root.userData.lixoGuia = []; }
  regra('RUA3 lixo de guia com peça 3D e decalque grande', () => {
    const pecas = W.root.userData.lixoGuia || [], d = porNome('decal-chao'), ini = AV + CAL + 0.5;
    exige(d, 'sem malha de decalque de chão');
    const perto = (x, z, [ex, v, , lado]) => { const [f, t] = ex === 'x' ? [x, z] : [z, x]; return Math.abs(f - v) <= 0.6 && t * lado >= ini && t * lado <= ini + 15; };
    const conta = GUIAS.map((g) => pecas.filter((p) => p.h >= 0.15 && perto(p.x, p.z, g)).length);
    exige(conta.every((n) => n >= 5), `peças 3D nos primeiros 15 m de cada guia: ${conta.join(', ')} (piso 5)`);
    const pos = d.geometry.attributes.position, lados = [];
    for (let q = 0; q < pos.count / 4; q++) {
      let x = 0, z = 0;
      for (let k = 0; k < 4; k++) { x += pos.getX(q * 4 + k) / 4; z += pos.getZ(q * 4 + k) / 4; }
      if (GUIAS.some((g) => naGuia(x, z, g))) lados.push(Math.hypot(pos.getX(q * 4) - pos.getX(q * 4 + 1), pos.getZ(q * 4) - pos.getZ(q * 4 + 1)));
    }
    const med = lados.reduce((a, b) => a + b, 0) / Math.max(1, lados.length);
    exige(med >= 0.9, `decalque de guia com lado médio ${med.toFixed(2)} m (piso 0,9): some a 20 m`);
    return `peças por guia ${conta.join(', ')}, decalque médio ${med.toFixed(2)} m`;
  });

  if (MUT === 'telhado-solto') {
    const l = porNome('telhado-lote'); exige(l, 'MUTANTE telhado-solto NÃO APLICOU');
    for (let i = 0; i < 25; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(4, 1.2, 4), l.material); c.position.set(-30 + i * 2.4, 6, 20); W.root.add(c); }
  }
  regra('ORC2 telhados em lote, não um por casa', () => {
    const soltos = malhas().filter((o) => o.geometry?.type === 'ConeGeometry' && o.geometry.parameters.radialSegments === 4);
    const lotes = malhas().filter((o) => o.name === 'telhado-lote');
    exige(!soltos.length, `${soltos.length} telhado(s) de 4 águas soltos: uma chamada de desenho cada`);
    exige(lotes.length >= 1 && lotes.length <= 3, `${lotes.length} lotes de telhado (faixa 1–3)`);
    return `${lotes.length} lotes de telhado, ${lotes.reduce((n, o) => n + o.geometry.attributes.position.count, 0)} vértices`;
  });

  if (MUT === 'beiral-preto') {
    const ls = malhas().filter((o) => o.name === 'telhado-lote'); exige(ls.length, 'MUTANTE beiral-preto NÃO APLICOU');
    for (const l of ls) l.material = [l.material[0], l.material[0]];
  }
  regra('FORRO1 beiral com forro de tábua clara, não telha preta', () => {
    const ls = malhas().filter((o) => o.name === 'telhado-lote');
    exige(ls.length, 'sem lote de telhado');
    for (const l of ls) {
      const g = l.geometry.groups, m = Array.isArray(l.material) ? l.material[1] : null;
      exige(g.length === 2 && m, `lote com ${g.length} grupo(s) e ${Array.isArray(l.material) ? l.material.length : 1} material(is): sem forro`);
      exige(/^jp-madeira/.test(m.map?.name || ''), `forro com mapa ${m.map?.name}: telha por baixo lê tábua preta`);
      const c = l.geometry.attributes.color, i0 = g[1].start;
      exige(c && c.getX(i0) >= 1.4, `cor de vértice do forro ${c?.getX(i0)} (piso 1,4): madeira crua L* 40`);
    }
    return `${ls.length} lotes com forro jp-madeira`;
  });

  regra('ORC1 saco e caixa GLB somem antes de 28 m', () => {
    const cortes = [];
    for (const arq of ['map_javaporcos_cidade.js', 'map_invasao_javaporcos.js']) {
      let src = fs.readFileSync(new URL(`../../public/js/${arq}`, import.meta.url), 'utf8');
      if (MUT === 'saco-longe') src = src.replace(/saco_lixo: \d+/, 'saco_lixo: 38');
      for (const m of src.matchAll(/(saco_lixo|caixa_papelao): (\d+)/g)) cortes.push([arq, m[1], +m[2]]);
    }
    exige(cortes.length >= 4, `só ${cortes.length} corte(s) de saco/caixa achado(s) no fonte`);
    const longe = cortes.filter(([, , d]) => d > 28);
    exige(!longe.length, longe.map(([a, id, d]) => `${id} a ${d} m em ${a}`).join(', ') + ' (teto 28)');
    return `${cortes.length} cortes de saco/caixa, maior ${Math.max(...cortes.map(([, , d]) => d))} m`;
  });

  if (MUT === 'lampada-fraca') {
    let l = null; W.root.traverse((o) => { if (o.isLight && o.name === 'beco-luz') l = o; });
    const le = porNome('poste-lente'); exige(l && le, 'MUTANTE lampada-fraca NÃO APLICOU');
    l.intensity = 20; le.material.emissive.set(0xffb070); le.material.emissiveIntensity = 3;
  }
  regra('LAMP1 lâmpada do beco com ponto quente', () => {
    let l = null; W.root.traverse((o) => { if (o.isLight && o.name === 'beco-luz') l = o; });
    const m = porNome('poste-lente')?.material;
    exige(l && m, 'sem luz de beco ou sem lente');
    exige(l.intensity >= 30, `cone do beco a ${l.intensity} (piso 30): chão sem ponto quente`);
    exige(m.emissiveIntensity >= 4 && m.emissive.getHex() === 0xffc48a, `lente ${m.emissive.getHexString()} a ${m.emissiveIntensity} (0xffc48a a ≥ 4)`);
    return `cone a ${l.intensity}, lente ${m.emissive.getHexString()} a ${m.emissiveIntensity}`;
  });

  if (MUT === 'sem-halo') { const h = porNome('beco-luz-halo'); exige(h, 'MUTANTE sem-halo NÃO APLICOU'); h.parent.remove(h); }
  regra('LAMP2 halo da lâmpada vai com a luz e encara a câmera', () => {
    const h = porNome('beco-luz-halo'), guia = porNome('beco-luz-guia');
    let l = null; W.root.traverse((o) => { if (o.isLight && o.name === 'beco-luz') l = o; });
    exige(h && guia && l, 'sem halo, guia ou luz do beco');
    exige(h.material.blending === THREE.AdditiveBlending && !h.material.depthWrite, 'halo não é aditivo sem escrita de profundidade');
    h.geometry.computeBoundingSphere();
    exige(h.geometry.boundingSphere.radius >= 0.5, `halo de raio ${h.geometry.boundingSphere.radius.toFixed(2)} (piso 0,5)`);
    const cam = new THREE.PerspectiveCamera();
    const ds = becoCaixas().map((bb) => {
      bb.getCenter(cam.position); cam.position.y = 1.7; cam.rotation.set(0.3, 1, 0); cam.updateMatrixWorld();
      guia.onBeforeRender(null, null, cam);
      exige(h.visible && h.quaternion.angleTo(cam.quaternion) < 1e-3, 'halo apagado ou sem encarar a câmera dentro do beco');
      return h.position.distanceTo(l.position);
    });
    exige(ds.every((d) => d <= 0.3), `halo longe da luz: ${ds.map((d) => d.toFixed(2)).join(', ')} m (teto 0,3)`);
    return `halo em ${ds.length} becos a ${Math.max(...ds).toFixed(2)} m da luz`;
  });

  regra('BECOLUZ1 uma luz de sódio dentro de cada beco', () => {
    const bbs = becoCaixas(), luzes = [], lentes = instancias(porNome('poste-lente')), guia = porNome('beco-luz-guia');
    W.root.traverse((o) => { if (o.isLight && o.name === 'beco-luz') luzes.push(o); });
    exige(bbs.length >= 4, `só ${bbs.length} becos`);
    exige(guia && luzes.length, 'sem luz de beco ou sem a guia que a leva até a câmera');
    const cam = new THREE.PerspectiveCamera();
    const desc = bbs.map((bb) => {
      bb.getCenter(cam.position); cam.position.y = 1.7;
      guia.onBeforeRender(null, null, cam);
      luzes.forEach((q) => q.updateMatrixWorld(true));
      const l = luzes.find((q) => { const p = q.getWorldPosition(new THREE.Vector3()); return sobreBeco(bb, p.x, p.z, 0.2) && p.y >= 4 && p.y <= 5; });
      exige(l, `beco em (${((bb.min.x + bb.max.x) / 2).toFixed(1)}, ${((bb.min.z + bb.max.z) / 2).toFixed(1)}) sem luz a 4–5 m dentro dele`);
      const p = l.getWorldPosition(new THREE.Vector3()), c = l.color;
      exige(c.r > c.g && c.g > c.b, 'luz do beco não é quente (sódio)');
      const hex = c.getHex(), gr = ((hex >> 8) & 255) / Math.max(1, hex >> 16);   // sRGB, como o hex do fonte
      exige(gr >= 0.72, `luz do beco laranja demais (g/r ${gr.toFixed(2)}, piso 0,72): beiral C* 29`);
      exige(l.isSpotLight && l.angle <= 1.2, `luz do beco ${l.isSpotLight ? `com abertura ${l.angle.toFixed(2)} rad (teto 1,2)` : 'omnidirecional'}: acende o forro do beiral`);
      l.target.updateMatrixWorld(true);
      const eixo = l.target.getWorldPosition(new THREE.Vector3()).sub(p).normalize();
      exige(eixo.y <= -Math.cos(THREE.MathUtils.degToRad(10)), `cone do beco fora da vertical (eixo y ${eixo.y.toFixed(2)})`);
      exige(l.intensity >= 4 && l.distance >= 10 && l.distance <= 16 && l.decay === 2, `luz do beco fraca ou sem alcance (int ${l.intensity}, alcance ${l.distance}, decaimento ${l.decay})`);
      exige(lentes.some((q) => Math.hypot(q.p.x - p.x, q.p.z - p.z) <= 0.5 && Math.abs(q.p.y - p.y) <= 0.4), 'luz do beco sem luminária visível a ≤ 0,5 m');
      return `${p.y.toFixed(1)} m`;
    });
    return `câmera em cada um dos ${desc.length} becos leva a luz de sódio para dentro dele (${desc.join(', ')})`;
  });

  regra('FIOS1 poste e fios cruzando o rasgo de céu de cada beco', () => {
    const bbs = becoCaixas(), segs = instancias(porNome('fiacao')), postes = instancias(porNome('poste'));
    const d = new THREE.Vector3();
    const desc = bbs.map((bb) => {
      const aoLongoZ = bb.max.z - bb.min.z > bb.max.x - bb.min.x, eixo = aoLongoZ ? (bb.min.x + bb.max.x) / 2 : (bb.min.z + bb.max.z) / 2;
      let cruzam = 0;
      for (const q of segs) {
        if (q.p.y < 5.5 || !sobreBeco(bb, q.p.x, q.p.z, 1.5)) continue;
        d.set(q.s.x / 2, 0, 0).applyQuaternion(q.q);
        const a = aoLongoZ ? q.p.x - d.x : q.p.z - d.z, b = aoLongoZ ? q.p.x + d.x : q.p.z + d.z;
        if ((a - eixo >= -1e-4) !== (b - eixo >= -1e-4)) cruzam++;   // semiaberto: o vértice no eixo conta uma vez
      }
      exige(cruzam >= 3, `beco em (${((bb.min.x + bb.max.x) / 2).toFixed(1)}, ${((bb.min.z + bb.max.z) / 2).toFixed(1)}): só ${cruzam} fio(s) cruzando o rasgo acima de 5,5 m (piso 3)`);
      exige(postes.some((q) => sobreBeco(bb, q.p.x, q.p.z, 2)), 'beco sem poste a ≤ 2 m');
      return cruzam;
    });
    return `fios cruzando o rasgo por beco: ${desc.join(', ')}; poste em todos`;
  });

  regra('RUA1 rua do centro com carros coloridos, caçamba, sacos e mesa de bar', () => {
    const carros = W.root.userData.carros || [], norte = carros.filter(noNorte);
    exige(norte.length >= 8, `só ${norte.length} carros no braço norte (piso 8)`);
    const semTinta = carros.filter((c) => c.id === 'junk_car' && c.cor == null);
    exige(!semTinta.length, `${semTinta.length} junk_car sem pintura (carvão, C* 4)`);
    const croma = (hex) => {
      const c = new THREE.Color(hex), lin = [c.r, c.g, c.b];
      const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
      const X = (0.4124 * lin[0] + 0.3576 * lin[1] + 0.1805 * lin[2]) / 0.9505, Y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
      const Z = (0.0193 * lin[0] + 0.1192 * lin[1] + 0.9505 * lin[2]) / 1.089;
      return Math.hypot(500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z)));
    };
    const vivos = norte.filter((c) => c.cor != null && croma(c.cor) >= 20);
    const cores = new Set(vivos.map((c) => c.cor));
    exige(vivos.length >= 4 && cores.size >= 3, `braço norte com ${vivos.length} carro(s) de C* ≥ 20 em ${cores.size} cor(es) (piso 4 em 3)`);
    const cena = W.root.userData.cenaRua;
    exige(cena, 'sem cena da rua (caçamba, sacos, mesa de bar)');
    exige(Math.hypot(cena.cacamba[0], cena.cacamba[1] + AV + 1.4) <= 12, 'caçamba longe da faixa norte (> 12 m)');
    exige(cena.sacos >= 8, `monte de ${cena.sacos} sacos (piso 8)`);
    exige(cena.mesas >= 1 && cena.cadeiras >= 2 * cena.mesas, `bar com ${cena.mesas} mesa(s) e ${cena.cadeiras} cadeira(s)`);
    return `${norte.length} carros no braço norte, ${vivos.length} de C* ≥ 20 em ${cores.size} cores; caçamba, ${cena.sacos} sacos, ${cena.mesas} mesas com ${cena.cadeiras} cadeiras`;
  });
}
