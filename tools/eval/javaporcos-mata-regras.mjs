/* ============================================================================
   javaporcos-mata-regras.mjs — cláusulas da MATA, da TRILHA e do CUPINZEIRO do mapa
   Invasão dos Javaporcos, chamadas por javaporcos-mapa-check.mjs (mesmo mundo, mesmo
   placar, mesmos mutantes).

   POR QUE EXISTE
   Gauntlet visual, rodada 2 (crítico de contexto limpo, 30/10/2026, nota 5,5/10):
     - a trilha subia o barranco em DEGRAUS escuros (boca-n 660–800×450–570: 3 faixas, 25,9
       L* de contraste): retalho plano de 2,6–4,2 m deitado sobre chão inclinado enterra uma
       metade e deixa a outra no ar;
     - árvore "pirulito" no horizonte e tronco pelado: andar de cima com copa de 1,2 m numa
       árvore de até 14 m, e 45% das árvores sem o andar de baixo;
     - cupinzeiro era um cone liso (torno com ruído de alta frequência, sem forma).

   O QUE ELE MEDE
     TRILHA3 cada retalho `mata-trilha-pisada` encosta no chão: os 4 cantos, os 4 meios de
             aresta e o centro ficam a ≤ 0,12 m de `terrainHeightAt` (sem lajes).
     MATA5   cada árvore do mapa tem copa começando a ≤ 45% da altura do tronco em ≥ 90% das
             árvores; o andar mais alto de cada árvore tem raio ≥ 1,5 m; a copa impostora
             alta (y > 8 m) do horizonte tem raio ≥ 3,5 m.
     TRILHA4 rodada 4 (crítico 30/10: com o hemi de volta a 0,95 a trilha da boca-so cai de
             L* 30 para 20): cor do retalho com luminância linear ≥ 1,6 e r/b ≤ 1,6 (a luz
             vem só do hemi sob o dossel; mais amarelo sobe o b* médio das vistas).
     FOLHA1  rodada 5 (crítico 30/10: dossel da boca-so L* 15,7): o emissivo da folhagem tem
             luminância linear ≥ 0,05 e azul ≥ verde (sem puxar a copa da vista alta acima de 140°).
     CUPIM1  o torno do cupinzeiro tem 3 lóbulos (harmônico 3 do raio ≥ 0,12 do raio médio
             nos anéis do meio) e cada cupinzeiro tem ≥ 2 torrões de 0,3–0,5 m de raio.
     CUPIM2  rodada 4 ("ainda lê domo liso", boca-so sdL 4,8): o corpo tem ≥ 40 segmentos,
             ruído radial fora do harmônico 3 com desvio ≥ 0,04 do raio nos anéis do meio e
             ≥ 2 torrinhas fora do eixo (≥ 0,2 m do centro).
     CUPIM3  rodada 5 ("orelhas de gato"): nenhuma torrinha passa do topo do corpo (1,02) e o
             perfil não termina em ponta (raio médio ≥ 0,15 no anel de y ≈ 1,0).

   MUTANTES (cada um tem de acender a cláusula indicada):
     trilha-degrau   retalho volta a deitar na horizontal com 3,5 m          -> TRILHA3
     copa-pirulito   andar de cima de cada árvore volta a 1,1 m de raio      -> MATA5
     tronco-pelado   andar de baixo de cada árvore sobe para junto do de cima -> MATA5
     cupim-cone      torno volta a ConeGeometry lisa, sem torrão             -> CUPIM1
     cupim-domo      torno de 48 lados com lóbulo e sem ruído nem torrinha    -> CUPIM2
     cupim-orelha    torrinhas de volta a 1,3/1,05 m, finas e a 0,42 m        -> CUPIM3
     trilha-piche    cor do retalho volta a 1,15/0,9/0,58                     -> TRILHA4
     folha-escura    emissivo da folhagem volta a 0x1c2412                    -> FOLHA1
   ============================================================================ */

export const MUTANTES = ['cupim-orelha', 'folha-escura', 'cupim-domo', 'trilha-piche', 'trilha-degrau', 'copa-pirulito', 'tronco-pelado', 'cupim-cone'];
const HALF = 68;

export function regrasMata({ W, THREE, MUT, regra, exige }) {
  const porNome = (nome) => { let m = null; W.root.traverse((o) => { if (o.name === nome) m = o; }); return m; };
  const m4 = new THREE.Matrix4(), p3 = new THREE.Vector3(), q4 = new THREE.Quaternion(), s3 = new THREE.Vector3();
  const inst = (m, i) => { m.getMatrixAt(i, m4); m4.decompose(p3, q4, s3); return { i, p: p3.clone(), q: q4.clone(), s: s3.clone() }; };
  const grava = (m, e) => { m.setMatrixAt(e.i, m4.compose(e.p, e.q, e.s)); };
  const gh = W.groundHeightAt;

  const pis = porNome('mata-trilha-pisada'), copa = porNome('mata-copa'), tronco = porNome('mata-troncos');
  const cupim = porNome('pasto-cupinzeiro');
  const nCopaMapa = W.censo?.copas ?? 0;

  /* árvores e as copas de cada uma (copa vai para o tronco mais perto na horizontal) */
  const arvores = () => {
    const tr = [];
    for (let i = 0; i < (tronco?.count || 0); i++) {
      const e = inst(tronco, i);
      const y0 = gh(e.p.x, e.p.z);
      tr.push({ x: e.p.x, z: e.p.z, y0, topo: e.p.y + e.s.y / 2, copas: [] });
    }
    const cel = new Map(), chave = (x, z) => `${Math.floor(x / 3)},${Math.floor(z / 3)}`;
    tr.forEach((t) => { const k = chave(t.x, t.z); if (!cel.has(k)) cel.set(k, []); cel.get(k).push(t); });
    for (let i = 0; i < Math.min(nCopaMapa, copa?.count || 0); i++) {
      const e = inst(copa, i);
      let melhor = null, dm = 1.2;
      const cx = Math.floor(e.p.x / 3), cz = Math.floor(e.p.z / 3);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const t of cel.get(`${cx + a},${cz + b}`) || []) {
        const d = Math.hypot(t.x - e.p.x, t.z - e.p.z);
        if (d < dm) { dm = d; melhor = t; }
      }
      if (melhor) melhor.copas.push(e);
    }
    return tr.filter((t) => t.copas.length);
  };

  /* ------------------------------------------------------------- mutantes */
  if (MUT === 'trilha-degrau') {
    exige(pis?.count, 'MUTANTE trilha-degrau NÃO APLICOU: sem mata-trilha-pisada');
    for (let i = 0; i < pis.count; i++) {
      const e = inst(pis, i);
      e.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 0.7); e.s.set(3.5, 1, 3.5);
      grava(pis, e);
    }
  }
  if (MUT === 'copa-pirulito' || MUT === 'tronco-pelado') {
    const tr = arvores();
    exige(tr.length, `MUTANTE ${MUT} NÃO APLICOU: sem árvore com copa`);
    for (const t of tr) {
      const ord = t.copas.slice().sort((a, b) => a.p.y - b.p.y);
      const alto = ord[ord.length - 1], baixo = ord[0];
      if (MUT === 'copa-pirulito') { alto.s.set(1.1, 1.1 * 0.62, 1.1); grava(copa, alto); }
      else if (ord.length > 1) { baixo.p.y = alto.p.y - 0.3; grava(copa, baixo); }
    }
  }
  if (MUT === 'cupim-cone') {
    exige(cupim, 'MUTANTE cupim-cone NÃO APLICOU: sem pasto-cupinzeiro');
    cupim.geometry = new THREE.ConeGeometry(1, 1, 11, 6).translate(0, 0.5, 0);
    cupim.count = W.cupinzeiros?.length || cupim.count;
  }

  if (MUT === 'cupim-domo') {
    exige(cupim, 'MUTANTE cupim-domo NÃO APLICOU: sem pasto-cupinzeiro');
    const g = new THREE.LatheGeometry([[1.0, 0], [0.87, 0.3], [0.76, 0.5], [0.61, 0.69], [0.44, 0.84], [0.1, 1.01], [0, 1.02]].map(([r, y]) => new THREE.Vector2(r, y)), 48);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), n = 1 + 0.3 * Math.cos(3 * a + 2.2 * p.getY(i)); p.setXYZ(i, p.getX(i) * n, p.getY(i), p.getZ(i) * n); }
    cupim.geometry = g;
  }

  /* ---------------------------------------------------------------- TRILHA3 */
  regra('TRILHA3 retalho de trilha deita no chão, sem degrau no barranco', () => {
    exige(typeof W.terrainHeightAt === 'function', 'mapa não expõe a altura do terreno sob as lajes');
    exige(pis?.count >= 60, `${pis?.count || 0} retalhos de trilha (piso 60)`);
    const pts = [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5], [0, -0.5], [0, 0.5], [-0.5, 0], [0.5, 0], [0, 0]];
    const v = new THREE.Vector3();
    let pior = 0, ruins = 0, onde = null;
    for (let i = 0; i < pis.count; i++) {
      pis.getMatrixAt(i, m4);
      let p = 0;
      for (const [a, b] of pts) {
        v.set(a, 0, b).applyMatrix4(m4);
        p = Math.max(p, Math.abs(v.y - W.terrainHeightAt(v.x, v.z)));
      }
      if (p > 0.12) ruins++;
      if (p > pior) { pior = p; m4.decompose(p3, q4, s3); onde = `(${p3.x.toFixed(1)}, ${p3.z.toFixed(1)})`; }
    }
    exige(!ruins, `${ruins} de ${pis.count} retalhos com ponto a ${pior.toFixed(2)} m do chão em ${onde} (teto 0,12): degrau no barranco`);
    return `${pis.count} retalhos, pior ponto a ${pior.toFixed(3)} m do chão`;
  });

  if (MUT === 'trilha-piche') { exige(pis?.material?.color, 'MUTANTE trilha-piche NÃO APLICOU'); pis.material.color.setRGB(1.15, 0.9, 0.58); }
  regra('TRILHA4 trilha clara sob o dossel, sem amarelar', () => {
    const c = pis?.material?.color;
    exige(c, 'sem cor no retalho da trilha');
    const y = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b, rb = c.r / Math.max(1e-3, c.b);
    exige(y >= 1.6, `luminância linear da cor ${y.toFixed(2)} (piso 1,6): trilha L* 20 sob o dossel`);
    exige(rb <= 1.6, `r/b ${rb.toFixed(2)} (teto 1,6): trilha amarela`);
    return `cor ${c.r}/${c.g}/${c.b}, luminância ${y.toFixed(2)}, r/b ${rb.toFixed(2)}`;
  });

  if (MUT === 'folha-escura') { exige(copa?.material?.emissive, 'MUTANTE folha-escura NÃO APLICOU'); copa.material.emissive.set(0x1c2412); }
  regra('FOLHA1 dossel visto de baixo não é preto nem amarelo', () => {
    const e = copa?.material?.emissive;
    exige(e, 'sem emissivo na folhagem');
    const y = 0.2126 * e.r + 0.7152 * e.g + 0.0722 * e.b;
    exige(y >= 0.05, `luminância linear do emissivo ${y.toFixed(3)} (piso 0,05): dossel por baixo L* 16`);
    exige(e.b >= e.g, `emissivo com azul ${e.b.toFixed(3)} < verde ${e.g.toFixed(3)}: copa amarela, b* médio sobe`);
    return `emissivo ${e.getHexString()}, luminância ${y.toFixed(3)}`;
  });

  /* ------------------------------------------------------------------ MATA5 */
  regra('MATA5 copa desce até o tronco e o topo não é pirulito', () => {
    exige(copa?.isInstancedMesh && tronco?.isInstancedMesh, 'sem mata-copa / mata-troncos');
    const tr = arvores();
    exige(tr.length >= 300, `só ${tr.length} árvores com copa`);
    let pelados = 0, pirulitos = 0, somaFr = 0;
    for (const t of tr) {
      const base = Math.min(...t.copas.map((c) => c.p.y - c.s.y));
      const fr = (base - t.y0) / Math.max(0.1, t.topo - t.y0);
      somaFr += fr;
      if (fr > 0.45) pelados++;
      const alto = t.copas.reduce((a, c) => (c.p.y > a.p.y ? c : a));
      if (alto.s.x < 1.5) pirulitos++;
    }
    const fracPel = pelados / tr.length;
    exige(fracPel <= 0.1, `${(100 * fracPel).toFixed(1)}% das árvores com tronco pelado acima de 45% da altura (teto 10%)`);
    exige(!pirulitos, `${pirulitos} árvores com o andar de cima < 1,5 m de raio: pirulito acima do dossel`);
    let horizPir = 0, horiz = 0;
    const horizontes = [];W.root.traverse(o=>{if(o.name === 'mata-copa-horizonte')horizontes.push(o);});
    for (const lote of horizontes) for (let i = 0; i < lote.count; i++) {
      const e = inst(lote, i);
      if (Math.max(Math.abs(e.p.x), Math.abs(e.p.z)) < HALF - 1 || e.p.y - gh(e.p.x, e.p.z) < 8) continue;
      horiz++;
      if (e.s.x < 3.5) horizPir++;
    }
    exige(horiz >= 100 && !horizPir, `${horizPir} de ${horiz} copas altas do horizonte com raio < 3,5 m`);
    return `${tr.length} árvores, tronco visível médio ${(100 * somaFr / tr.length).toFixed(0)}%, pelados ${(100 * fracPel).toFixed(1)}%, horizonte ${horiz} copas altas ≥ 3,5 m`;
  });

  /* ----------------------------------------------------------------- CUPIM1 */
  regra('CUPIM1 cupinzeiro tem lóbulo e torrão, não é cone', () => {
    exige(cupim?.isInstancedMesh, 'sem pasto-cupinzeiro');
    const pos = cupim.geometry.attributes.position, aneis = new Map();
    for (let i = 0; i < (cupim.geometry.userData.vertsTorno ?? pos.count); i++) {
      const y = pos.getY(i);
      if (y < 0.15 || y > 0.85) continue;
      const k = y.toFixed(3);
      if (!aneis.has(k)) aneis.set(k, []);
      const a = Math.atan2(pos.getZ(i), pos.getX(i)), anel = aneis.get(k);
      if (!anel.some(([b]) => Math.abs(Math.sin((a - b) / 2)) < 1e-4)) anel.push([a, Math.hypot(pos.getX(i), pos.getZ(i))]);   // costura repetida enviesa o harmônico
    }
    const h3 = [];
    for (const anel of aneis.values()) {
      if (anel.length < 9) continue;
      const media = anel.reduce((s, [, r]) => s + r, 0) / anel.length;
      let c = 0, s = 0;
      for (const [a, r] of anel) { c += r * Math.cos(3 * a); s += r * Math.sin(3 * a); }
      h3.push((2 * Math.hypot(c, s) / anel.length) / media);
    }
    exige(h3.length >= 3, `torno com ${h3.length} anéis entre 0,15 e 0,85 da altura`);
    h3.sort((a, b) => a - b);
    const med = h3[Math.floor(h3.length / 2)];
    exige(med >= 0.12, `harmônico de 3 lóbulos ${med.toFixed(3)} do raio (piso 0,12): cone liso`);
    const n = W.cupinzeiros?.length || 0, torroes = [], tm = porNome('pasto-torrao');
    for (let i = n; i < cupim.count; i++) torroes.push(inst(cupim, i).s.x);
    for (let i = 0; i < (tm?.count || 0); i++) torroes.push(inst(tm, i).s.x);
    exige(n >= 8 && torroes.length >= 2 * n, `${torroes.length} torrões para ${n} cupinzeiros (piso 2 por cupinzeiro)`);
    const fora = torroes.filter((r) => r < 0.3 - 1e-6 || r > 0.5 + 1e-6).length;
    exige(!fora, `${fora} torrões fora de 0,3–0,5 m de raio`);
    return `lóbulo ${med.toFixed(3)} do raio, ${n} cupinzeiros, ${torroes.length} torrões`;
  });

  /* ----------------------------------------------------------------- CUPIM2 */
  regra('CUPIM2 cupinzeiro com ruído na silhueta e torrinha, não domo', () => {
    exige(cupim?.isInstancedMesh, 'sem pasto-cupinzeiro');
    const g = cupim.geometry, pos = g.attributes.position, nCorpo = g.userData.vertsTorno ?? pos.count;
    const aneis = new Map();
    let topo = 0;
    for (let i = 0; i < nCorpo; i++) {
      const y = pos.getY(i); topo = Math.max(topo, y);
      if (y < 0.3 || y > 0.85) continue;
      const k = y.toFixed(3);
      if (!aneis.has(k)) aneis.set(k, []);
      const a = Math.atan2(pos.getZ(i), pos.getX(i)), anel = aneis.get(k);
      if (!anel.some(([b]) => Math.abs(Math.sin((a - b) / 2)) < 1e-4)) anel.push([a, Math.hypot(pos.getX(i), pos.getZ(i))]);
    }
    const lados = Math.max(...[...aneis.values()].map((a) => a.length));
    exige(lados >= 40, `corpo com ${lados} lados (piso 40): silhueta poligonal`);
    const res = [];
    for (const anel of aneis.values()) {
      const media = anel.reduce((s, [, r]) => s + r, 0) / anel.length;
      let c = 0, s = 0;
      for (const [a, r] of anel) { c += r * Math.cos(3 * a); s += r * Math.sin(3 * a); }
      c *= 2 / anel.length; s *= 2 / anel.length;
      const resto = anel.map(([a, r]) => r - media - c * Math.cos(3 * a) - s * Math.sin(3 * a));
      res.push(Math.sqrt(resto.reduce((t, v) => t + v * v, 0) / resto.length) / media);
    }
    res.sort((a, b) => a - b);
    const med = res[Math.floor(res.length / 2)] || 0;
    exige(med >= 0.04, `ruído radial fora do lóbulo ${med.toFixed(3)} do raio (piso 0,04): domo liso`);
    const torres = [];
    for (let i = nCorpo; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
      if (Math.hypot(x, z) >= 0.2 && !torres.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 0.3)) torres.push([x, z]);
    }
    exige(torres.length >= 2, `${torres.length} torrinha(s) fora do eixo (piso 2)`);
    return `${lados} lados, ruído ${med.toFixed(3)} do raio, ${torres.length} torrinhas`;
  });

  /* ----------------------------------------------------------------- CUPIM3 */
  if (MUT === 'cupim-orelha') {
    exige(cupim?.geometry?.userData?.vertsTorno, 'MUTANTE cupim-orelha NÃO APLICOU');
    const g = cupim.geometry, pos = g.attributes.position;
    for (let i = g.userData.vertsTorno; i < pos.count; i++) pos.setY(i, pos.getY(i) * 1.55);
  }
  regra('CUPIM3 cupinzeiro sem orelha: torrinha abaixo do topo e topo sem ponta', () => {
    const g = cupim?.geometry, pos = g?.attributes.position, nCorpo = g?.userData.vertsTorno;
    exige(nCorpo, 'sem torno do cupinzeiro');
    let topo = 0, alto = 0, rs = [];
    for (let i = 0; i < nCorpo; i++) { const y = pos.getY(i); topo = Math.max(topo, y); if (Math.abs(y - 1.0) < 1e-3) rs.push(Math.hypot(pos.getX(i), pos.getZ(i))); }
    for (let i = nCorpo; i < pos.count; i++) alto = Math.max(alto, pos.getY(i));
    exige(alto <= topo + 1e-6, `torrinha a ${alto.toFixed(2)} acima do topo do corpo ${topo.toFixed(2)}: orelha de gato`);
    const r = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0;
    exige(r >= 0.15, `raio ${r.toFixed(2)} no anel de y 1,0 (piso 0,15): topo em ponta`);
    return `torrinha até ${alto.toFixed(2)}, corpo até ${topo.toFixed(2)}, raio ${r.toFixed(2)} em y 1,0`;
  });
}
