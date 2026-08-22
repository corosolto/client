/* ============================================================================
   occluder-ray-check.mjs — A BALA PARA NO AR? OCCLUDER × SUPERFÍCIE VISÍVEL,
   MEDIDO NO NAVEGADOR COM O JOGO REAL.
   ----------------------------------------------------------------------------
   Nasce do BUG-54 / relato do dono: "eu atiro pra frente e bate tiros no ar".
   A causa medida no censo: `_fireHitscan` (public/js/game.js:2927) raycasta
   `world.occluders` com `intersectObjects(list, false)` — NÃO recursivo — e o
   Raycaster do three IGNORA `visible`. Em `map_lajes_authored.js:128-139,204-205,227`
   caixas `MAT.proxy` (MeshBasicMaterial visible:false) cobrem volumes inteiros de
   casas GLB que têm portas e janelas: a bala morre na caixa invisível ANTES da
   superfície que o jogador vê. O mesmo array alimenta `_losClear` (game.js:5436),
   `_botShoot` (:5955), `_botShootNN` (:6461) e `botbrain/sense.js:19`.

   Proxy invisível NÃO é violação por si só (doutrina documentada em
   map_brasilia.js:553-570 e map_quebrada.js:106-122): a violação é a DIVERGÊNCIA
   medida por raios entre o que a bala vê (occluders) e o que o olho vê (malha
   visível). Proxy fora da cena (havan :613-622, ferrovelho :619-626) é
   deliberado e alinhado ao GLB — conta, não reprova.

   ── O QUE MEDE ──────────────────────────────────────────────────────────────
   PARTE 1 — varredura estrutural de `g.world.occluders`:
     (a) não-Mesh (Group etc.) → violação `grupo-sem-raycast`: o raycast
         não-recursivo chama o `raycast()` vazio de Object3D e a entrada é letra
         morta (brasilia putBuilding, escadao gprop). REPROVA.
     (b) mesh invisível (objeto ou material visible:false) → "proxy invisível"
         (conta; não viola por si).
     (c) mesh fora da cena → "proxy fora da cena" (conta; não viola por si).
     (d) mesh visível na cena → ok.
     Lista VAZIA → falha alto: régua por vacuidade é proibida aqui.

   PARTE 2 — sondagem por raios: origens = `world.waypoints.nodes` (subamostra
   determinística a cada ceil(n/140) nós, ~120-160 por mapa), 3 alturas acima do
   chão local (`groundHeightAt(x,z)` simples — joelho +0,5, peito +1,3, cabeça
   +1,62), 8 direções horizontais, far=60.
     hitA = 1º hit em occluders (intersectObjects(occ, false)) — o que a bala vê.
     hitB = 1º hit nas superfícies VISÍVEIS do mundo (coleta abaixo).
     tiro-no-ar:      hitA && (!hitB || hitA < hitB - 0,15)  → a bala para ANTES
                      da superfície visível (o defeito do dono). REPROVA acima do teto.
     atravessa-parede: hitB && (!hitA || hitB < hitA - 0,30) E o ponto atingido
                      está dentro de um AABB de `world.colliders` (folga 0,10 m) —
                      "o corpo não passa, a bala passa". Mobília sem colisor
                      (guarda-sol, pilha de pneu) é decisão declarada dos mapas e
                      não é parede. Cláusula separada. REPROVA acima do teto.

   COLETA DAS SUPERFÍCIES VISÍVEIS — traverse de `g.world.root` (não da scene:
   o que o game.js pendura direto na scene é pickup de arma, bandeira CTF, halo,
   granada, efeito — nada disso é parede, e os bots já foram afastados). Fica de
   fora, com a razão:
     · cadeia de `visible` quebrada (objeto ou ancestral) ou TODOS os materiais
       com visible:false → não é desenhado, não é superfície;
     · material transparente com opacity<0,9 ou indefinida → mesma doutrina do
       `_pintavel` (map_decals.js:170-178): vidro/água/decalque não é parede;
     · userData skyLife (pipas), routeCue (setas de rota), overheadCable (fios),
       runningDrain (água do córrego), manhole (tampas), proxyGLB / coverProxy
       (procurações — nunca superfície), fauna/ambientLife/faunaPart (ratos e
       pombos do ambientlife.js), nonCollider / nonSolidSurface (o próprio mapa
       declara "não é sólido") — testados na CADEIA de ancestrais;
     · nomes `decal:*`, `mural:*`, `faixa:*` (grafite/cartaz colado em parede —
       graffiti_pass.js:964) e `horizonte_*` (casario do horizonte, horizon.js);
     · renderOrder < 0 → pano de fundo (saia do horizonte, faixas de morro);
     · qualquer coisa sob mesh de `g.drops` (armas no chão — veto do dono: ficam)
       ou com `userData.botOwner` na cadeia (bots — afastados pra y=-80, mas as
       malhas continuam na cena).
   Lista visível VAZIA → falha alto (não sabe medir = vermelho).
   InstancedMesh (PropBatch, mapprops.js) responde a raycast e entra normal.

   PARTE 3 — mutantes in-page (page.evaluate ANTES de medir, determinísticos).
   `--mutante=occluder-invisivel`  caixa invisível 2×3×0,3 a 5 m de um raio que
                                   hoje tem 10 m livres (occluder E visual) →
                                   tiro-no-ar tem que SUBIR.
   `--mutante=proxy-inflado`       o proxy invisível mais atingido por raios hoje
                                   alinhados escala ×1,6 em XZ → tiro-no-ar tem
                                   que SUBIR.
   `--mutante=grupo-sem-raycast`   um mesh real de occluders vira Group (clone
                                   embrulhado) → a violação estrutural DISPARA.
   `--mutante=vao-fechado`         sela com caixa invisível a 4 m um raio com 8 m
                                   livres nos DOIS lados → tiro-no-ar DISPARA.
   Sem mutante: checks falham → exit 1. Com mutante: se não aplicou → erro alto
   ("MUTANTE NÃO APLICOU"); se os checks PASSAM → "MUTANTE sobreviveu", exit 1;
   se FALHAM como esperado → exit 0. Mutantes rodam em fy_lajes + quebrada
   (controle de mapa alinhado) quando --map não é passado.

   ── TETOS E PROCEDÊNCIA ─────────────────────────────────────────────────────
   TETO_TIRO = max(2, 0,5% dos raios do mapa); TETO_ATRAVESSA = 0.
   Medidos nesta execução de 16/08/2026 (branch feat/times-e-mapas-completo,
   worktree em cirurgia concorrente de Lajes — os números de lá já caíram de
   977 para ~80 entre duas execuções da mesma tarde):

     mapa           raios  tiro-no-ar      atravessa(c/ filtro colisor)  estrutural
     praca_poderes  2496   200 ( 8,0%)     234 ( 9,4%)                   38 grupos
     piscina_treta  2472     0 ( 0,0%)      28 ( 1,1%)                   0
     loja_h         3048   533 (17,5%)     367 (12,0%)                   0
     ferro_velho    2376   863 (36,3%)       1 ( 0,0%)                   0
     quebrada       2928   546 (18,6%)      52 ( 1,8%)                   0
     fy_escadao     3192   234 ( 7,3%)     320 (10,0%)                   34 grupos
     fy_campomorro  2880   307 (10,7%)      52 ( 1,8%)                   0
     fy_lajes       2928   977→82 (33→2,8%) 95 ( 3,2%)                   0
     fy_corrego     2808    89 ( 3,2%)     217 ( 7,7%)                   0
     fy_mansao      3000   129 ( 4,3%)      81 ( 2,7%)                   0

   O teto NÃO é folga para o estado atual: o estado atual reprova em 10/10 e as
   fotos (--fotos) mostram que não é ruído de coleta — em quebrada o jogador vê
   deserto aberto e a bala morre 0,6 m à frente (glbFallback sem par visível =
   limites invisíveis do mapa); em Lajes o beco segue aberto por 30 m e a bala
   morre a 10 m no proxyGLB. O 0,5% existe para o ruído legítimo de quina de
   caixa alinhada (raio tangente a proxy cuja face visível está centímetros
   adiante); ferro_velho com 1 hit de atravessa mostra que o teto 0 dessa
   cláusula é alcançável quando o mapa está alinhado.

   ── USO ─────────────────────────────────────────────────────────────────────
     npm run eval:serve &        # servidor no ar (BASE=http://127.0.0.1:8124)
     node tools/eval/occluder-ray-check.mjs                  # os 10 mapas
     node tools/eval/occluder-ray-check.mjs --map=fy_lajes   # um só
     node tools/eval/occluder-ray-check.mjs --mutante=proxy-inflado
     node tools/eval/occluder-ray-check.mjs --map=fy_lajes --fotos 4
   ============================================================================ */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:8124';
const TODOS = ['praca_poderes', 'piscina_treta', 'loja_h', 'ferro_velho', 'quebrada',
  'fy_escadao', 'fy_campomorro', 'fy_lajes', 'fy_corrego', 'fy_mansao'];
const MUTANTES = new Set(['occluder-invisivel', 'proxy-inflado', 'grupo-sem-raycast', 'vao-fechado']);

const argDe = (nome, def = '') => {
  const i = process.argv.findIndex((a) => a === nome || a.startsWith(nome + '='));
  if (i < 0) return def;
  const a = process.argv[i];
  if (a.includes('=')) return a.split('=')[1];
  return process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : def;
};
const argMapa = argDe('--map');
const argMutante = argDe('--mutante');
const argFotos = parseInt(argDe('--fotos', '0'), 10) || 0;
if (argMutante && !MUTANTES.has(argMutante)) throw new Error(`mutante desconhecido: ${argMutante}`);
const MAPAS = argMapa ? argMapa.split(',') : (argMutante ? ['fy_lajes', 'quebrada'] : TODOS);

/* Teto de tiro-no-ar: max(2, 0,5% dos raios). O ruído legítimo é o raio que
   roça quina de caixa alinhada; acima disso é proxy divergente de verdade. */
const tetoTiro = (raios) => Math.max(2, Math.ceil(raios * 0.005));
const TETO_ATRAVESSA = 0;

/* Roda DENTRO da página: precisa da cena montada e dos GLBs carregados. */
const MEDIR = async (mutante) => {
  const g = window.__game;
  const W = g.world;
  if (!W || !W.occluders) throw new Error('world.occluders ausente');
  // BUG-28: em headless sem render loop a matrixWorld fica identidade. O jogo real
  // renderiza, mas forçamos por segurança antes de qualquer medição.
  g.scene.updateMatrixWorld(true);
  const THREE = await import('./vendor/three.module.js');

  const occ = W.occluders;
  if (!occ.length) throw new Error('world.occluders VAZIO — régua por vacuidade proibida');

  const emCena = (o) => { for (let p = o; p; p = p.parent) if (p === g.scene) return true; return false; };
  const matsDe = (o) => (Array.isArray(o.material) ? o.material : [o.material]);
  const invisivel = (o) => {
    if (!o.visible) return true;
    const ms = matsDe(o);
    return ms.length > 0 && ms.every((m) => m && m.visible === false);
  };

  // ---- Parte 1: varredura estrutural ---------------------------------------
  const escanear = () => {
    const est = { total: occ.length, grupo: 0, invisivel: 0, fora: 0, visivel: 0, gruposEx: [] };
    for (const o of occ) {
      if (!o.isMesh && !o.isInstancedMesh) {
        est.grupo++;
        if (est.gruposEx.length < 5) est.gruposEx.push(o.name || o.type || 'Group');
        continue;
      }
      if (!emCena(o)) est.fora++;
      else if (invisivel(o)) est.invisivel++;
      else est.visivel++;
    }
    return est;
  };
  const estBase = escanear();

  // ---- coleta das superfícies visíveis (lista de exclusões no cabeçalho) ----
  const UD_EXC = ['skyLife', 'routeCue', 'overheadCable', 'runningDrain', 'manhole',
    'proxyGLB', 'coverProxy', 'fauna', 'ambientLife', 'faunaPart', 'nonCollider', 'nonSolidSurface'];
  const dropSet = new Set((g.drops || []).map((d) => d.mesh));
  const cadeiaTem = (o, teste) => { for (let p = o; p && p !== g.scene; p = p.parent) if (teste(p)) return true; return false; };
  const vis = [];
  W.root.traverse((o) => {
    if (!o.isMesh && !o.isInstancedMesh) return;
    if (cadeiaTem(o, (p) => !p.visible)) return;
    const opaco = (m) => m && m.visible !== false && !(m.transparent && (m.opacity === undefined || m.opacity < 0.9));
    if (!matsDe(o).some(opaco)) return;
    if (o.renderOrder < 0) return;
    const n = String(o.name || '');
    if (n.startsWith('decal:') || n.startsWith('mural:') || n.startsWith('faixa:') || n.startsWith('horizonte_')) return;
    if (cadeiaTem(o, (p) => UD_EXC.some((k) => (p.userData || {})[k]))) return;
    if (cadeiaTem(o, (p) => (p.userData || {}).botOwner)) return;
    if (cadeiaTem(o, (p) => dropSet.has(p))) return;
    vis.push(o);
  });
  if (!vis.length) throw new Error('lista de superfícies visíveis VAZIA — não sabe medir = vermelho');

  // ---- Parte 2: sondagem por raios ------------------------------------------
  const nodes = (W.waypoints && W.waypoints.nodes) || [];
  if (!nodes.length) throw new Error('world.waypoints.nodes ausente/vazio — sem origens de sondagem, falha alto');
  const passo = Math.max(1, Math.ceil(nodes.length / 140));
  const ALTS = [0.5, 1.3, 1.62];
  const ray = new THREE.Raycaster();
  ray.near = 0; ray.far = 60;
  // Auto-toque: origem encostada numa malha (nó colado na parede, prop sob o nó)
  // devolve hit a 0,03-0,3 m que não é bala nem parede — o graffiti-census mediu o
  // mesmo artefato e descarta < 0,25 m; aqui 0,30 m.
  const PISO = 0.30;
  const primeiro = (hits) => { for (const h of hits) if (h.distance >= PISO) return h; return null; };
  /* ATRAVESSA-PAREDE só conta massa que o CORPO respeita: o ponto atingido precisa
     estar dentro de um AABB de `world.colliders` (folga 0,10 m). Medido na 1ª
     execução (16/08): sem este filtro TODOS os mapas davam 12-36% de "atravessa"
     dominado por mobília que os mapas deliberadamente mantêm fora de occluders E
     de colliders (guarda-sol, pilha de pneu, borda de piscina) — decoração que o
     dono atravessa com o corpo sem chamar de parede. Com o filtro a cláusula mede
     o que o nome diz: o corpo não passa, a bala passa. */
  const cols = W.colliders || [];
  const dentroColisor = (x, y, z) => {
    for (const c of cols) {
      if (x >= c.minX - 0.1 && x <= c.maxX + 0.1 && y >= c.minY - 0.1 && y <= c.maxY + 0.1
        && z >= c.minZ - 0.1 && z <= c.maxZ + 0.1) return true;
    }
    return false;
  };
  const sondar = () => {
    const r = { raios: 0, tiroNoAr: 0, atravessa: 0, pioresTiro: [], pioresAtr: [], detalhe: [] };
    const org = new THREE.Vector3(), dir = new THREE.Vector3();
    for (let i = 0; i < nodes.length; i += passo) {
      const nd = nodes[i];
      const gy = W.groundHeightAt(nd.x, nd.z);
      if (!Number.isFinite(gy)) continue;
      for (const h of ALTS) {
        for (let d = 0; d < 8; d++) {
          const ang = d * Math.PI / 4;
          org.set(nd.x, gy + h, nd.z);
          dir.set(Math.cos(ang), 0, Math.sin(ang));
          ray.set(org, dir);
          const hA = primeiro(ray.intersectObjects(occ, false));
          const hB = primeiro(ray.intersectObjects(vis, false));
          const dA = hA ? hA.distance : null;
          const dB = hB ? hB.distance : null;
          const quem = (h) => {
            if (!h) return '';
            const o = h.object;
            const ud = Object.keys(o.userData || {}).join('|');
            return `${o.name || o.type}${o.isInstancedMesh ? '[inst]' : ''}/${o.geometry ? o.geometry.type : '?'}${ud ? ' ud:' + ud : ''}`;
          };
          r.raios++;
          r.detalhe.push({ x: nd.x, z: nd.z, y: gy + h, ang, dA, dB });
          if (hA && (!hB || dA < dB - 0.15)) {
            r.tiroNoAr++;
            r.pioresTiro.push({ x: nd.x, z: nd.z, y: gy + h, ang, dA, dB, sev: (dB ?? 60) - dA, quem: quem(hA), quemB: quem(hB) });
          } else if (hB && (!hA || dB < dA - 0.30)
            && dentroColisor(org.x + dir.x * dB, org.y, org.z + dir.z * dB)) {
            r.atravessa++;
            r.pioresAtr.push({ x: nd.x, z: nd.z, y: gy + h, ang, dA, dB, sev: (dA ?? 60) - dB, quem: quem(hB) });
          }
        }
      }
    }
    r.pioresTiro.sort((a, b) => b.sev - a.sev); r.pioresTiro.length = Math.min(r.pioresTiro.length, 8);
    r.pioresAtr.sort((a, b) => b.sev - a.sev); r.pioresAtr.length = Math.min(r.pioresAtr.length, 8);
    return r;
  };
  const base = sondar();

  // ---- Parte 3: mutantes -----------------------------------------------------
  const out = { est: estBase, base, depois: null, estDepois: null, aplicado: null };
  if (!mutante) { delete out.base.detalhe; return out; }

  const refMesh = occ.find((o) => o.isMesh);
  const refBox = occ.find((o) => o.isMesh && o.geometry && o.geometry.type === 'BoxGeometry'
    && !Array.isArray(o.material));
  const mkCaixa = (w, h, d) => {
    if (!refMesh || !refBox) return null;
    const m = new refMesh.constructor(new refBox.geometry.constructor(w, h, d),
      new refBox.material.constructor({ visible: false }));
    return m;
  };
  const aplicado = { ok: false, info: '' };
  if (mutante === 'occluder-invisivel' || mutante === 'vao-fechado') {
    const livre = mutante === 'occluder-invisivel' ? 10 : 8;
    const dist = mutante === 'occluder-invisivel' ? 5 : 4;
    const alvo = base.detalhe.find((r) => (r.dA === null || r.dA >= livre) && (r.dB === null || r.dB >= livre));
    const caixa = alvo && mkCaixa(2, 3, 0.3);
    if (!caixa) throw new Error(`MUTANTE NÃO APLICOU: ${mutante} — nenhum raio com ${livre} m livres nos dois lados (ou sem BoxGeometry de referência)`);
    caixa.position.set(alvo.x + Math.cos(alvo.ang) * dist, alvo.y, alvo.z + Math.sin(alvo.ang) * dist);
    caixa.rotation.y = Math.atan2(Math.cos(alvo.ang), Math.sin(alvo.ang));
    caixa.updateMatrixWorld(true);   // fora da cena de propósito: como o proxy da Havan
    const antes = occ.length;
    occ.push(caixa);
    if (occ.length !== antes + 1) throw new Error(`MUTANTE NÃO APLICOU: ${mutante} — caixa não entrou em occluders`);
    out.depois = sondar();
    aplicado.ok = out.depois.tiroNoAr > base.tiroNoAr;
    aplicado.info = `caixa invisível a ${dist} m do raio (${alvo.x.toFixed(1)},${alvo.z.toFixed(1)},ang ${alvo.ang.toFixed(2)}): tiro-no-ar ${base.tiroNoAr} → ${out.depois.tiroNoAr}`;
  } else if (mutante === 'proxy-inflado') {
    /* O proxy invisível mais ATINGIDO por raios hoje alinhados (|dA-dB|≤0,15 m).
       Inflar ×1,6 afasta cada face 0,6×meia-largura para FORA: o raio que batia
       na cara do proxy colado na malha visível passa a bater >0,15 m ANTES —
       tiro-no-ar novo garantido. Medido na quebrada: o "maior proxy absoluto"
       era muro de fundo de mapa onde todo raio já contava (546→546, não aplicou);
       e os 5 maiores perto de waypoints idem. O alvo certo é o mais atingido. */
    const contagem = new Map();
    const o3 = new THREE.Vector3(), d3 = new THREE.Vector3();
    for (const r0 of base.detalhe) {
      if (r0.dA === null || r0.dB === null || Math.abs(r0.dA - r0.dB) > 0.15) continue;
      ray.set(o3.set(r0.x, r0.y, r0.z), d3.set(Math.cos(r0.ang), 0, Math.sin(r0.ang)));
      const h = primeiro(ray.intersectObjects(occ, false));
      if (h && h.object && invisivel(h.object)) contagem.set(h.object, (contagem.get(h.object) || 0) + 1);
    }
    const ordenado = [...contagem.entries()].sort((a, b) => b[1] - a[1]);
    if (!ordenado.length) throw new Error('MUTANTE NÃO APLICOU: proxy-inflado — nenhum raio alinhado atinge proxy invisível');
    let ganhou = null;
    for (const [o, n] of ordenado.slice(0, 5)) {
      o.scale.x *= 1.6; o.scale.z *= 1.6;
      g.scene.updateMatrixWorld(true);
      const tentativa = sondar();
      if (tentativa.tiroNoAr > base.tiroNoAr) { ganhou = { o, n, tentativa }; break; }
      o.scale.x /= 1.6; o.scale.z /= 1.6;
      g.scene.updateMatrixWorld(true);
    }
    if (!ganhou) throw new Error(`MUTANTE NÃO APLICOU: proxy-inflado — 5 proxies inflados e tiro-no-ar preso em ${base.tiroNoAr}`);
    out.depois = ganhou.tentativa;
    aplicado.ok = true;
    aplicado.info = `proxy ${ganhou.o.name || ganhou.o.type} (${ganhou.n} raios alinhados) ×1,6: tiro-no-ar ${base.tiroNoAr} → ${out.depois.tiroNoAr}`;
  } else if (mutante === 'grupo-sem-raycast') {
    const idx = occ.findIndex((o) => o.isMesh || o.isInstancedMesh);
    if (idx < 0) throw new Error('MUTANTE NÃO APLICOU: grupo-sem-raycast — nenhum mesh real em occluders');
    const alvo = occ[idx];
    const grp = new W.root.constructor();   // Group fora da cena
    const clone = alvo.clone();
    alvo.updateWorldMatrix(true, false);
    alvo.matrixWorld.decompose(clone.position, clone.quaternion, clone.scale);
    grp.add(clone);
    grp.updateMatrixWorld(true);
    occ[idx] = grp;
    out.estDepois = escanear();
    out.depois = sondar();
    aplicado.ok = out.estDepois.grupo > estBase.grupo;
    aplicado.info = `occluders[${idx}] (${alvo.name || alvo.type}) virou Group: violações estruturais ${estBase.grupo} → ${out.estDepois.grupo}`;
  }
  delete out.base.detalhe;
  if (out.depois) delete out.depois.detalhe;
  out.aplicado = aplicado;
  return out;
};

// -----------------------------------------------------------------------------
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});

const fmtEx = (e) => `  (${e.x.toFixed(1)},${e.z.toFixed(1)}) y${e.y.toFixed(2)} ang${(e.ang * 180 / Math.PI).toFixed(0)}° bala=${e.dA === null ? '—' : e.dA.toFixed(2)}m visível=${e.dB === null ? '—' : e.dB.toFixed(2)}m [${e.quem || ''}${e.quemB ? ' → ' + e.quemB : ''}]`;
const falhasDe = (est, sonda) => {
  const f = [];
  if (est.grupo > 0) f.push(`grupo-sem-raycast: ${est.grupo} (${est.gruposEx.join(', ')})`);
  const teto = tetoTiro(sonda.raios);
  if (sonda.tiroNoAr > teto) f.push(`tiro-no-ar ${sonda.tiroNoAr} > teto ${teto}`);
  if (sonda.atravessa > TETO_ATRAVESSA) f.push(`atravessa-parede ${sonda.atravessa} > teto ${TETO_ATRAVESSA}`);
  return f;
};

let vermelho = false;
const resumo = [];
try {
  for (const id of MAPAS) {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
    page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
    let bootado = false;
    for (let att = 0; att < 3; att++) {
      try {
        await page.goto(`${BASE}/?debug=1&auto=P,mst&map=${id}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
        bootado = true; break;
      } catch (e) { console.log(`  goto retry ${att} (${id})`); if (att === 2) throw e; }
    }
    if (!bootado) throw new Error(`boot falhou: ${id}`);
    try {
      await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
    } catch (e) {
      console.log(`VERMELHO ${id}: boot/assets não ficaram prontos em 300 s — falha de captura é vermelho, não skip`);
      vermelho = true; await page.close(); continue;
    }
    await page.waitForTimeout(1000);
    await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
    await page.evaluate(() => {
      const g = window.__game;
      for (const b of g.bots) { b.pos.set(0, -80, 0); b.hp = 1e9; }   // sem bot cruzando a lente nem a sonda
      g.player.hp = 1e9;
    });

    let r;
    try {
      r = await page.evaluate(MEDIR, argMutante);
    } catch (e) {
      console.log(`VERMELHO ${id}: medição falhou — ${e.message}`);
      vermelho = true; await page.close(); continue;
    }

    if (argMutante) {
      if (!r.aplicado || !r.aplicado.ok) {
        console.log(`VERMELHO ${id}: MUTANTE NÃO APLICOU: ${argMutante} — ${r.aplicado ? r.aplicado.info : 'sem retorno'}`);
        vermelho = true; await page.close(); continue;
      }
      const falhas = falhasDe(r.estDepois || r.est, r.depois || r.base);
      if (!falhas.length) {
        console.log(`VERMELHO ${id}: MUTANTE ${argMutante} sobreviveu — checks VERDES depois de aplicar (${r.aplicado.info})`);
        vermelho = true;
      } else {
        console.log(`ok ${id}: mutante ${argMutante} aplicou e o gate mordeu (${r.aplicado.info}) → ${falhas.join('; ')}`);
      }
      await page.close(); continue;
    }

    const est = r.est, s = r.base;
    const falhas = falhasDe(est, s);
    const teto = tetoTiro(s.raios);
    const pct = (n) => (100 * n / Math.max(1, s.raios)).toFixed(1);
    console.log(`${falhas.length ? 'VERMELHO' : 'VERDE   '} ${id.padEnd(15)} raios ${String(s.raios).padStart(5)} | `
      + `tiro-no-ar ${s.tiroNoAr} (${pct(s.tiroNoAr)}%, teto ${teto}) | atravessa ${s.atravessa} (${pct(s.atravessa)}%, teto ${TETO_ATRAVESSA}) | `
      + `occluders ${est.total}: invisível ${est.invisivel}, fora ${est.fora}, visível ${est.visivel}, grupo ${est.grupo}`);
    if (s.pioresTiro.length && falhas.length) {
      console.log(`  piores tiro-no-ar:`);
      for (const e of s.pioresTiro.slice(0, 4)) console.log(' ' + fmtEx(e));
    }
    if (s.pioresAtr.length && falhas.length) {
      console.log(`  piores atravessa-parede:`);
      for (const e of s.pioresAtr.slice(0, 4)) console.log(' ' + fmtEx(e));
    }
    resumo.push({ id, raios: s.raios, tiroNoAr: s.tiroNoAr, atravessa: s.atravessa, est, falhas });
    if (falhas.length) vermelho = true;

    // ---- fotos das piores origens (evidência: a câmera olha AO LONGO do raio) --
    if (argFotos > 0 && s.pioresTiro.length) {
      const dir = `tools/eval/asset-evidence/occluder-ray/${id}`;
      mkdirSync(dir, { recursive: true });
      await page.addStyleTag({ content: '#hud{display:none!important}' });
      const legendas = [];
      const alvos = s.pioresTiro.slice(0, argFotos);
      for (let i = 0; i < alvos.length; i++) {
        const t = alvos[i];
        await page.evaluate((tt) => {
          const g = window.__game;
          const gy = g.world.groundHeightAt(tt.x, tt.z);
          g.player.pos.set(tt.x, gy, tt.z);
          if (g.player.vel && g.player.vel.set) g.player.vel.set(0, 0, 0);
          // forward da câmera é (-sin yaw, 0, -cos yaw) (game.js:4949, ordem YXZ)
          g.player.yaw = Math.atan2(-Math.cos(tt.ang), -Math.sin(tt.ang));
          g.player.pitch = 0; g.player.recoilP = 0;
          if (g.vmScene) g.vmScene.visible = false;
          if (g.vm && g.vm.root) g.vm.root.visible = false;
        }, t);
        await page.waitForTimeout(350);
        const arq = `${dir}/raio-${i}.png`;
        await page.screenshot({ path: arq, timeout: 90000 });
        legendas.push({ arquivo: `raio-${i}.png`, ...t });
        console.log(`  foto ${arq}:${fmtEx(t)}`);
      }
      writeFileSync(`${dir}/legendas.json`, JSON.stringify(legendas, null, 1));
    }
    await page.close();
  }
} finally {
  await browser.close();
}

if (argMutante) {
  if (vermelho) { console.log(`\nMUTANTE ${argMutante}: ver relatório acima`); process.exit(1); }
  console.log(`\nMUTANTE ${argMutante}: aplicou e o gate reprovou como esperado em ${MAPAS.join(', ')}`);
  process.exit(0);
}
console.log('');
for (const r of resumo) {
  if (r.falhas.length) console.log(`VERMELHO ${r.id}: ${r.falhas.join('; ')}`);
}
console.log(vermelho ? '\nRESULTADO: VERMELHO — a bala diverge da superfície visível (BUG-54 medido).'
  : '\nRESULTADO: VERDE — occluders alinhados à malha visível em todos os mapas.');
process.exit(vermelho ? 1 : 0);
