// Medicao compartilhada das capturas; limites em KNOWN-BUGS.md, BUG-VM-FECHAMENTO-RUBEN.
export const MEDIR = (arma) => {
  const g = window.__game;
  const cam = g.vmCamera;
  if (!cam) return { erro: 'sem vmCamera' };
  cam.updateMatrixWorld(true);
  const W = innerWidth, H = innerHeight;
  const raizes = [];
  if (g.vm?.root) raizes.push(g.vm.root);
  const ent = window.__authoredVm?.entry?.(arma);
  const maosRegistradas = new Set(ent?.handMeshes || []);
  if (ent?.scene) raizes.push(ent.scene);
  /* `arm` cru NAO serve de token: todo skinned mesh pende de um no `Armature`, e
     com ele a primeira versao desta regua classificou a arma inteira como mao
     (m92: mao 278/306, arma 0/0). Tokens ancorados; so `fp-character` sobe na
     arvore, que e o grupo de bracos do caminho legado (fparms.js:217). */
  const eMao = (n) => /GEO_FP_SK_|fp-character|(^|[_.\-])(glove|hand|forearm|sleeve|cloth)/i.test(n || '');
  const visivel = (o) => { let p = o; while (p) { if (!p.visible) return false; p = p.parent; } return true; };
  const maos = [], armas = [], invMao = [], invArma = [];
  // `entry.scene` pende de `vm.root`: sem dedupe a mesma malha entra duas vezes e
  // a amostra vira metade do que diz ser.
  const vistas = new Set();
  for (const r of raizes) {
    r.updateWorldMatrix(true, true);
    r.traverse((c) => {
      if (!c.isMesh || !c.geometry?.attributes?.position || !visivel(c)) return;
      if (vistas.has(c)) return;
      vistas.add(c);
      let n = c.name || '', p = c.parent;
      let mao = ent && window.__VM_MUTANTE !== 'mao-nome' ? maosRegistradas.has(c) : eMao(n);
      while (!ent && !mao && p) { if (/fp-character/i.test(p.name || '')) mao = true; p = p.parent; }
      (mao ? maos : armas).push(c);
      (mao ? invMao : invArma).push(`${n || '?'}:${c.geometry.attributes.position.count}`);
    });
  }
  const V3 = cam.position.constructor;
  /* Orcamento PROPORCIONAL com piso por malha: dividir um orcamento global pelo total
     deixava arma de muitas malhas rala, e o contato media densidade de amostra em vez do
     vao — carbine 1,7 cm no driver contra 0,5 numa sonda densa. */
  const amostrar = (lista, maxPts) => {
    const pts = [];
    const total = lista.reduce((s, c) => s + c.geometry.attributes.position.count, 0) || 1;
    for (const c of lista) {
      const pos = c.geometry.attributes.position;
      const cota = Math.max(150, Math.round(maxPts * (pos.count / total)));
      const passo = Math.max(1, Math.floor(pos.count / cota));
      const v = new V3();
      for (let i = 0; i < pos.count; i += passo) {
        v.fromBufferAttribute(pos, i);
        if (c.isSkinnedMesh && c.applyBoneTransform) c.applyBoneTransform(i, v);
        pts.push(v.clone().applyMatrix4(c.matrixWorld));
      }
    }
    return pts;
  };
  const proj = (v) => {
    const p = v.clone().project(cam);
    return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, fora: p.z > 1 || p.z < -1 || p.x < -1 || p.x > 1 || p.y < -1 || p.y > 1 };
  };
  /* 300 pontos por lado davam 41 px num par de mãos que a figura mostra ENCOSTADO
     (pistol/ads) contra 49 px numa mão comprovadamente solta (shotgun/ads): o teto
     caía dentro do ruído da amostra. Resolução maior separa os dois casos. */
  const maoPts = amostrar(maos, 800), armaPts = amostrar(armas, 800);
  const maoPx = [], armaPx = [];
  for (const p of maoPts) { const s = proj(p); if (!s.fora) maoPx.push(s); }
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const p of armaPts) {
    const s = proj(p);
    if (s.fora) continue;
    armaPx.push(s);
    minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x);
    minY = Math.min(minY, s.y); maxY = Math.max(maxY, s.y);
  }
  /* Contato em 3D, em cm: a pergunta e fisica ("a mao encosta na arma?") e a resposta
     em pixels depende de quanto a arma ocupa a tela e de quao rala e a amostra — no
     `deagle/ads` a mao esta NA coronha e a medida em pixels deu a pior razao de todas. */
  let contato3d = null;
  if (maoPts.length && armaPts.length) {
    /* Amostra INTEIRA: com 260 pontos por lado a mesma m92 media 2,7 cm e uma sonda
       densa media 1,3 — o teto estaria medindo densidade de amostra, nao o vao. */
    let melhor = 1e9;
    for (let i = 0; i < maoPts.length; i += 1) {
      for (let k = 0; k < armaPts.length; k += 1) {
        const d = maoPts[i].distanceTo(armaPts[k]);
        if (d < melhor) melhor = d;
      }
    }
    contato3d = Math.round(melhor * 1000) / 10;
  }
  let contato = null;
  if (maoPx.length && armaPx.length) {
    contato = 1e9;
    for (const a of maoPx) for (const b of armaPx) { const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < contato) contato = d; }
    contato = Math.round(contato);
  }
  /* Espacamento da amostra: mediana da distancia ao vizinho mais proximo DENTRO da
     nuvem da arma. O contato em px cresce sozinho quando a arma ocupa mais tela — sem
     esta escala nao se separa "mao solta" de "amostra rala". */
  /* Diametro 3D da nuvem da arma, em cm: a maior distancia entre dois pontos dela no
     mundo. Corpo rigido, entao NAO muda com a pose — ao contrario da diagonal na tela,
     que oscilou 624→878 px para a mesma arma entre rodadas. */
  /* A luva e o MESMO asset em toda arma: a razao arma/mao e a unica medida de escala
     com denominador comum entre familias e entre pipelines. */
  const diam = (pts) => {
    if (pts.length < 5) return null;
    const passo = Math.max(1, Math.floor(pts.length / 200));
    let maior = 0;
    for (let i = 0; i < pts.length; i += passo) {
      for (let k = i + passo; k < pts.length; k += passo) {
        const d = pts[i].distanceTo(pts[k]);
        if (d > maior) maior = d;
      }
    }
    return Math.round(maior * 1000) / 10;
  };
  const maoDiam = diam(maoPts);
  let diam3d = null;
  if (armaPts.length > 4) {
    const passoD = Math.max(1, Math.floor(armaPts.length / 200));
    let maior = 0;
    for (let i = 0; i < armaPts.length; i += passoD) {
      for (let k = i + passoD; k < armaPts.length; k += passoD) {
        const d = armaPts[i].distanceTo(armaPts[k]);
        if (d > maior) maior = d;
      }
    }
    diam3d = Math.round(maior * 1000) / 10;
  }
  let espacamento = null;
  if (armaPx.length > 8) {
    const passoE = Math.max(1, Math.floor(armaPx.length / 120));
    const dists = [];
    for (let i = 0; i < armaPx.length; i += passoE) {
      let melhor = 1e9;
      for (let k = 0; k < armaPx.length; k += 1) {
        if (k === i) continue;
        const d = Math.hypot(armaPx[i].x - armaPx[k].x, armaPx[i].y - armaPx[k].y);
        if (d < melhor) melhor = d;
      }
      dists.push(melhor);
    }
    dists.sort((a, b) => a - b);
    espacamento = Math.round(dists[Math.floor(dists.length / 2)] * 10) / 10;
  }
  return {
    maoEmQuadro: maoPx.length, maoAmostra: maoPts.length,
    espacamento_px: espacamento,
    arma_diam3d_cm: diam3d,
    mao_diam3d_cm: maoDiam,
    razao_arma_mao: (diam3d && maoDiam) ? Math.round(diam3d / maoDiam * 100) / 100 : null,
    len_declarado_cm: window.__WEAPON_LEN?.[arma] ?? null,
    // assada (Mint dentro do GLB) ou encaixada em runtime: sao dois pipelines de
    // escala, e comparar um com o outro produz "escala em fuga" que nao existe.
    assada: !!window.__VM_BAKED?.[arma],
    contato_em_espacamentos: (contato !== null && espacamento) ? Math.round(contato / espacamento * 100) / 100 : null,
    armaEmQuadro: armaPx.length, armaAmostra: armaPts.length,
    contato_px: contato,
    contato_3d_cm: contato3d,
    arma_diag_px: maxX > minX ? Math.round(Math.hypot(maxX - minX, maxY - minY)) : 0,
    arma_bbox: maxX > minX ? [minX, minY, maxX, maxY].map(Math.round) : null,
    quadro: [W, H],
    invMao: invMao.slice(0, 12), invArma: invArma.slice(0, 12),
    classificacaoMaoCorreta: !ent || (maos.every((m) => maosRegistradas.has(m))
      && armas.every((m) => !maosRegistradas.has(m))),
    autorado: !!ent,
    /* De onde veio a arma desenhada. Escala aparente so se compara entre a MESMA
       fonte: o wrap Mint e a malha do pack tem tamanhos proprios, e desde o
       conserto do encaixe uma familia pode cair no pack enquanto o GLB de mundo
       nao chega (vmweapon.js pedirModeloDeMundo). */
    fonte: (ent?.mint?.weaponId === arma && ent.mint.active?.visible) ? 'mint' : (armas.length ? 'pack' : 'nenhuma'),
    /* Arma com luneta esconde o viewmodel enquanto mirada (game.js `_scope`): medir
       0 ali e estado legitimo, nao defeito. Vem do dado do jogo, nao de lista minha. */
    luneta: !!(window.__WEAPONS_SCOPE?.[arma]),
    mirando: !!g.player?.scoped,
  };
};

