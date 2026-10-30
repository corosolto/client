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
             aresta e o centro ficam a ≤ 0,12 m de `groundHeightAt`.
     MATA5   cada árvore do mapa tem copa começando a ≤ 45% da altura do tronco em ≥ 90% das
             árvores; o andar mais alto de cada árvore tem raio ≥ 1,5 m; a copa impostora
             alta (y > 8 m) do horizonte tem raio ≥ 3,5 m.
     CUPIM1  o torno do cupinzeiro tem 3 lóbulos (harmônico 3 do raio ≥ 0,12 do raio médio
             nos anéis do meio) e cada cupinzeiro tem ≥ 2 torrões de 0,3–0,5 m de raio.

   MUTANTES (cada um tem de acender a cláusula indicada):
     trilha-degrau   retalho volta a deitar na horizontal com 3,5 m          -> TRILHA3
     copa-pirulito   andar de cima de cada árvore volta a 1,1 m de raio      -> MATA5
     tronco-pelado   andar de baixo de cada árvore sobe para junto do de cima -> MATA5
     cupim-cone      torno volta a ConeGeometry lisa, sem torrão             -> CUPIM1
   ============================================================================ */

export const MUTANTES = ['trilha-degrau', 'copa-pirulito', 'tronco-pelado', 'cupim-cone'];
const HALF = 58;

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

  /* ---------------------------------------------------------------- TRILHA3 */
  regra('TRILHA3 retalho de trilha deita no chão, sem degrau no barranco', () => {
    exige(pis?.count >= 60, `${pis?.count || 0} retalhos de trilha (piso 60)`);
    const pts = [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5], [0, -0.5], [0, 0.5], [-0.5, 0], [0.5, 0], [0, 0]];
    const v = new THREE.Vector3();
    let pior = 0, ruins = 0, onde = null;
    for (let i = 0; i < pis.count; i++) {
      pis.getMatrixAt(i, m4);
      let p = 0;
      for (const [a, b] of pts) {
        v.set(a, 0, b).applyMatrix4(m4);
        p = Math.max(p, Math.abs(v.y - gh(v.x, v.z)));
      }
      if (p > 0.12) ruins++;
      if (p > pior) { pior = p; m4.decompose(p3, q4, s3); onde = `(${p3.x.toFixed(1)}, ${p3.z.toFixed(1)})`; }
    }
    exige(!ruins, `${ruins} de ${pis.count} retalhos com ponto a ${pior.toFixed(2)} m do chão em ${onde} (teto 0,12): degrau no barranco`);
    return `${pis.count} retalhos, pior ponto a ${pior.toFixed(3)} m do chão`;
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
    for (let i = nCopaMapa; i < copa.count; i++) {
      const e = inst(copa, i);
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
    for (let i = 0; i < pos.count; i++) {
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
    const n = W.cupinzeiros?.length || 0, torroes = [];
    for (let i = n; i < cupim.count; i++) torroes.push(inst(cupim, i).s.x);
    exige(n >= 8 && torroes.length >= 2 * n, `${torroes.length} torrões para ${n} cupinzeiros (piso 2 por cupinzeiro)`);
    const fora = torroes.filter((r) => r < 0.3 - 1e-6 || r > 0.5 + 1e-6).length;
    exige(!fora, `${fora} torrões fora de 0,3–0,5 m de raio`);
    return `lóbulo ${med.toFixed(3)} do raio, ${n} cupinzeiros, ${torroes.length} torrões`;
  });
}
