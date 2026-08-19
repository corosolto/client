// "Praça dos Três Poderes" — Brasília arena built from Mint-generated building
// models (Congresso, Catedral, Ministério, Palácio) composed with a hand-authored
// competitive layout. Gameplay scaffolding (ground, esplanade, spawns, waypoints,
// cover, colliders) is procedural; the landmarks are real GLB models placed and
// collidered from their actual bounds. Same contract as buildWorld().
import * as THREE from 'three';
import { placeProp } from './mapprops.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { makeAerialFog } from './bloom.js';   // névoa exponencial + cor por direção do olhar
import { detailFor, registerDetail } from './textures.js';   // normal+rough por Sobel (ver lam)
import { decalIds, paredeAtras } from './map_decals.js';   // pool por NOME + raycast na MALHA
import { grafitar, esconderSeFaltar } from './graffiti_pass.js';             // cobertura medida, não coordenada à mão
import { setMapSky } from './map_sky.js';
import { createFavelaAmbience } from './ambientlife.js';
import { AMB_LOOPS } from './soundscape.js';

/* PEGADA NA ALTURA DO CORPO (reprovação do dono, 05/08: "problemas com o box do ônibus
   e barracas"). O colisor derivado do Box3 do GLB INTEIRO conta como parede coisas que só
   existem ACIMA da cabeça ou como pano solto: o guarda-sol do drinkstand (+0,5 m de raio),
   o telhado da barraquinha de camelô (dobra a profundidade: 2,12 m de caixa para um balcão
   de 1,16 m) e a saia da lona da tenda (3,14 m de quadrado para um domo de ~2,1 m onde o
   peito encosta). O jogador esbarrava em ar.
   Números MEDIDOS por vértice (percentil 1–99 ponderado por área de triângulo, faixa de
   colisão y 0,25–2,05 m com o targetH usado neste mapa) — frações do box local SEM rotação,
   por eixo. Régua: `node tools/eval/pegada-check.mjs` recomputa dos GLBs e acusa deriva.
   Regra: mudou o GLB, re-mede — número velho aqui é parede fantasma nova. */
export const PEGADA_CORPO = {
  tent:       { x0: 0.127, x1: 0.783, z0: 0.124, z1: 0.831 },  // 3,14×3,14 -> 2,06×2,22 m
  stall:      { x0: 0.021, x1: 0.959, z0: 0.217, z1: 0.759 },  // 2,44×2,12 -> 2,29×1,15 m
  drinkstand: { x0: 0.115, x1: 0.913, z0: 0.088, z1: 0.912 },  // 2,86×3,06 -> 2,28×2,52 m
};
/* Meias-larguras e CORREÇÃO DE ÂNGULO do corpo do ônibus — 4ª passada do BUG-21 (06/08,
   "o box do onibus esta protegendo um espaco que devia ser vazio e esta pegando tiros").
   A 3ª passada mediu a pegada no eixo DA CAIXA do GLB — mas o modelo do Mint é torto
   DENTRO da própria caixa: o corpo sai a **-18,7° do eixo x do arquivo** (PCA dos
   triângulos da faixa 0,25–2,05 m, ponderado por área; `tools/eval/pegada-check.mjs`
   recomputa). Colisor e occluder no eixo da caixa ficavam ~20° fora do corpo visível:
   3,77 m de parede fantasma pra bala na ponta sudoeste, lataria descoberta na nordeste.
   Medido (arquivo, targetH 3,1): corpo 9,2 × 2,0 m ao longo do eixo principal,
   centro ≈ origem do arquivo. ryCorr é o delta SOBRE o ry de placement (0,55). */
export const PEGADA_BUS = { hx: 4.6, hz: 1.0, ryCorr: 0.3263 };

export function buildBrasilia(scene, T) {
  const colliders = [];   // {minX,minY,minZ,maxX,maxY,maxZ}
  const occluders = [];   // meshes for LOS / bullet raycasts
  const root = new THREE.Group();
  scene.add(root);

  // PBR: era MeshLambertMaterial (chapado). Standard reage ao env map (IBL) e à luz com
  // roughness/metalness — mesmo com map/color, ganha ambiente e sombreamento real.
  /* PBR DE SUPERFÍCIE — o MESMO caminho do map.js:17-28, que era o único mapa a ter.
     MEDIDO antes desta rodada, varrendo a cena dos 5 mapas reais em runtime: 877 materiais,
     70 normalMap e 70 roughnessMap, TODOS no praca_old (o único que chamava `detailFor`).
     Este mapa tinha ZERO. Depois: 113/113 no total. O `detailFor`
     pendura normal+roughness derivados do PRÓPRIO albedo por Sobel (textures.js), então a
     superfície deixa de ser cor chapada e passa a reagir ao sol e ao env map — sem asset
     externo e sem textura nova: os dois mapas derivados são gerados UMA vez por canvas de
     albedo e cacheados num WeakMap, e materiais que compartilham o mesmo albedo compartilham
     os mesmos derivados.
     CUSTO NA MÁQUINA FRACA (a preocupação do dono): zero. O `withDetail` do textures.js já
     sai fora em quality 'low' e com ?detail=0, e nesses casos `detailFor` devolve null e o
     material fica exatamente como era. normalScale 0,65 é o mesmo do map.js — relevo por
     Sobel exagera fácil e vira plástico. */
  const lam = (opts) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0.0, ...opts });
    const det = m.map && detailFor(m.map);
    if (det) {
      if (det.normalMap && !m.normalMap) { m.normalMap = det.normalMap; m.normalScale.set(0.65, 0.65); }
      if (det.roughnessMap && !m.roughnessMap) m.roughnessMap = det.roughnessMap;
    }
    return m;
  };
  /* AO DE VÉRTICE (critério A1). Toda caixa procedural ganha faixas de escurecimento na
     base + uma saia de contato no chão. Ver vao.js para a calibração dos multiplicadores.
     `opts.vao === false` isenta caixas onde o efeito seria errado (volume invisível). */
  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const vao = VAO_BANDS && opts.vao !== false && mat && mat.visible !== false;
    // `solo` é geométrico, não depende do gate de faixas — assim `?vao=skirt` (A/B do
    // agente de captura) ainda emite a saia. SKIRT.add já checa o próprio kill-switch.
    const solo = onGround(y, h) && !opts.rx && !opts.rz;
    const geo = vao ? aoBoxGeo(w, h, d, { low: LOWQ, base: solo ? undefined : BASE_FLOATING })
      : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, vao ? aoMat(mat) : mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry;
    if (solo && opts.skirt !== false) SKIRT.add(x, y, z, w, d, opts.ry || 0);
    root.add(m);
    if (opts.collide !== false) {
      const pad = opts.pad || 0;
      // Caixa girada: era `max(w,d)/2` nos DOIS eixos, ou seja, o QUADRADO circunscrito —
      // uma caixa de 1,6 × 0,4 girada 20° bloqueava 1,6 × 1,6. Agora o colisor é a caixa.
      if (opts.ry) colRot(x, z, w / 2 + pad, d / 2 + pad, y, y + h, opts.ry);
      else colliders.push({ minX: x - w / 2 - pad, maxX: x + w / 2 + pad, minY: y, maxY: y + h, minZ: z - d / 2 - pad, maxZ: z + d / 2 + pad });
      occluders.push(m);
    }
    return m;
  }
  function addPlane(w, h, mat, x, y, z, ry = 0, rx = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z); m.rotation.y = ry; m.rotation.x = rx;
    m.receiveShadow = true; root.add(m); return m;
  }
  const col = (minX, maxX, minY, maxY, minZ, maxZ) => colliders.push({ minX, maxX, minY, maxY, minZ, maxZ });
  /* COLISOR GIRADO — BUG-21 ("o box do ônibus é como se fosse um quadrado, mas o ônibus está
     em diagonal"). O motor agora testa no eixo do prop (game.js `_collideRot`); aqui só se
     produz o objeto: a AABB CONSERVADORA do mundo (rejeição barata no motor, e o que todo
     consumidor antigo continua lendo) MAIS a caixa exata em espaço local.
     ry múltiplo de 90° NÃO vira colisor girado: ali a AABB já é exata (só troca w↔d) e
     pagar seno/cosseno no caminho quente seria custo sem ganho. */
  const alinhado = (ry) => Math.abs(Math.sin(2 * ry)) < 1e-6;
  const colRot = (cx, cz, hx, hz, minY, maxY, ry) => {
    if (alinhado(ry)) {
      const troca = Math.abs(Math.cos(ry)) < 0.5;                 // 90° ou 270°: w vira d
      const ax = troca ? hz : hx, az = troca ? hx : hz;
      return col(cx - ax, cx + ax, minY, maxY, cz - az, cz + az);
    }
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const ax = Math.abs(hx * cs) + Math.abs(hz * sn), az = Math.abs(hx * sn) + Math.abs(hz * cs);
    colliders.push({
      minX: cx - ax, maxX: cx + ax, minY, maxY, minZ: cz - az, maxZ: cz + az,
      ry, cx, cz, hx, hz, cos: cs, sin: sn,
    });
  };
  /* Mesmo teste, do lado do A*: sem isto o bot planeja pela AABB e continua contornando ar. */
  const foraDaCaixaGirada = (c, x, z, inf) => {
    const wx = x - c.cx, wz = z - c.cz;
    const lx = wx * c.cos - wz * c.sin, lz = wx * c.sin + wz * c.cos;
    return Math.abs(lx) > c.hx + inf || Math.abs(lz) > c.hz + inf;
  };
  // Os landmarks têm pegada DERIVADA do GLB (muda com targetH), então nenhum prop pode ter
  // posição fixa "na fé": tudo que é decoração passa por aqui e some se cair dentro de um
  // volume já ocupado. Sem isso um poste nasce dentro do STF quando o modelo muda.
  const freeSpot = (x, z, r = 0.6) => !colliders.some(c =>
    x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r && c.maxY > 0.3);

  /* ---------------- config: kill-switches + degradação por qualidade ---------------- */
  // buildBrasilia só recebe (scene, T), então a qualidade vem do MESMO localStorage que o
  // main.js grava — assim o mapa degrada sozinho sem mudar a assinatura da função (outro
  // agente está editando game.js ao mesmo tempo, não dá pra passar parâmetro novo).
  const QP = new URLSearchParams(location.search);
  let _q = 'med';
  try { _q = JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality || 'med'; } catch (e) { /* storage bloqueado */ }
  const LOWQ = _q === 'low';
  const DETAIL = QP.get('props') === '0' ? 0 : (LOWQ ? 1 : 2);   // 0=nada, 1=essencial, 2=cheio
  const BIG = QP.get('bigscale') !== '0';   // ?bigscale=0 volta à escala antiga dos landmarks
  const SKY2 = QP.get('sky') !== '0';       // ?sky=0 volta ao céu/luz antigos
  // AO de vértice: `?vao=0` desliga; em 'low' cai de 3 faixas para 1 (ver vao.js)
  const aoMat = aoMatFactory();
  const SKIRT = new ContactSkirt({ low: LOWQ });

  /* ---------------- texturas locais do cerrado (NÃO mexer em textures.js) ------------- */
  // textures.js é do agente GRÁFICOS-CORE; tudo que é específico de Brasília nasce aqui.
  const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const ctex = (c, rx = 1, ry = 1) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = LOWQ ? 1 : 8;
    /* PBR DE SUPERFÍCIE — este é o ÚNICO ponto por onde passa toda textura local deste mapa,
       então registrar aqui cobre o mapa inteiro numa linha (ver `lam` logo acima e
       textures.js `registerDetail`). Antes desta rodada o praca_poderes — que é o mapa PADRÃO —
       tinha 41 materiais com albedo e ZERO normalMap/roughnessMap: cada superfície era cor
       chapada, sem reagir ao sol nem ao env map, e era um dos "três níveis de acabamento na
       mesma tela" que o dono descreveu.
       CUSTO: o Sobel roda uma vez por canvas, teto de 512² (MAX_DETAIL do textures.js), e
       some inteiro em quality 'low' e com ?detail=0 — o gate já é o do textures.js, não um
       segundo gate que alguém tem que lembrar de manter. */
    return registerDetail(t, c, 2.2, 0.60, 0.98);
  };
  // BAR §4.1: na seca (mai–set) o gramado do Eixo é PALHA DOURADA com manchas verdes, não
  // verde-esmeralda. E o solo laterítico vermelho aparece onde a grama falhou — é o único
  // vermelho natural da cena.
  function cerradoTex() {
    const c = cvs(512, 512), x = c.getContext('2d');
    x.fillStyle = '#b0a069'; x.fillRect(0, 0, 512, 512);
    const blob = (cols, n, rmin, rmax, a) => {
      for (let i = 0; i < n; i++) {
        const px = Math.random() * 512, py = Math.random() * 512, r = rmin + Math.random() * (rmax - rmin);
        const g = x.createRadialGradient(px, py, 1, px, py, r);
        g.addColorStop(0, cols[(Math.random() * cols.length) | 0]); g.addColorStop(1, 'rgba(0,0,0,0)');
        x.globalAlpha = a; x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
      }
      x.globalAlpha = 1;
    };
    blob(['#8f9455', '#7d8a4a'], 90, 14, 60, 0.55);   // manchas verdes que sobraram
    blob(['#c9b87a', '#d6c68c'], 70, 18, 70, 0.5);    // palha clara queimada de sol
    blob(['#7d6a3f'], 40, 10, 34, 0.45);              // capim seco escuro
    blob(['#9c4a2a', '#8a3f22'], 26, 8, 26, 0.4);     // SOLO LATERÍTICO exposto
    // fiapos de capim, alta frequência (evita o "chapado" a 2 m do chão)
    for (let i = 0; i < 2600; i++) {
      x.strokeStyle = ['rgba(255,240,190,.16)', 'rgba(70,66,40,.18)'][i & 1];
      x.lineWidth = 1; const px = Math.random() * 512, py = Math.random() * 512;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.random() * 5 - 2.5, py + 3 + Math.random() * 4); x.stroke();
    }
    return c;
  }
  // Calçada portuguesa (pedra preta e branca) — o piso que diz "praça brasileira".
  // CALIBRAÇÃO r2 (critério C4): a versão anterior usava preto #2a2a2c sobre branco #e8e4d8
  // com pedra de 3–5 px. Isso é ruído de altíssima frequência E altíssimo contraste; contra
  // esse chão a silhueta do inimigo simplesmente não lê, e o serrilhado aparece já a 10 m.
  // Agora: pedra ~2× maior (o desenho da onda fica legível) e amplitude de L* cortada a ~1/3
  // (escuro #6f6c66 contra claro #c4bfb3, não preto contra branco). Continua sendo pedra
  // portuguesa — só parou de competir com o jogador. Além disso ela sai da lane central e
  // vai só para as calçadas laterais (ver o piso, mais abaixo).
  function portuguesaTex() {
    const S = LOWQ ? 128 : 256;
    const c = cvs(S, S), x = c.getContext('2d');
    const k = S / 256;
    x.fillStyle = '#a9a49a'; x.fillRect(0, 0, S, S);   // argamassa/rejunte, tom médio
    for (let i = 0; i < 1500 * k * k; i++) {
      const px = Math.random() * S, py = Math.random() * S;
      // desenho de ONDA (o padrão clássico do calçadão): faixas senoidais largas
      const band = ((px / S) * 2.5 + Math.sin((py / S) * 6.0) * 0.55) % 1;
      const dark = band < 0.42;
      const j = Math.random() * 18 | 0;
      x.fillStyle = dark ? `rgb(${105 + j},${102 + j},${96 + j})` : `rgb(${190 + j},${185 + j},${175 + j})`;
      const w = (6 + Math.random() * 3) * k;
      x.beginPath(); x.ellipse(px, py, w * 0.5, w * 0.45, Math.random() * 3, 0, 7); x.fill();
    }
    // desgaste: manchas largas e de baixa frequência (quebram o tile sem virar ruído)
    for (let i = 0; i < 26; i++) {
      const px = Math.random() * S, py = Math.random() * S, r = (18 + Math.random() * 46) * k;
      const g = x.createRadialGradient(px, py, 1, px, py, r);
      g.addColorStop(0, i % 3 ? 'rgba(150,145,132,.30)' : 'rgba(96,92,84,.26)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    }
    return c;
  }
  // Asfalto claro estourado de sol (BAR: "cinza-claro esbranquiçado, faixas desgastadas").
  function asfaltoTex() {
    const c = cvs(256, 256), x = c.getContext('2d');
    x.fillStyle = '#8d8982'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5000; i++) {
      x.fillStyle = `rgba(${170 + Math.random() * 60 | 0},${168 + Math.random() * 55 | 0},${160 + Math.random() * 50 | 0},${Math.random() * 0.22})`;
      x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    return c;
  }

  /* ---------------- r2: texturas que matam o "bloco branco chapado" (B6) ---------------- */
  // O concreto de Niemeyer NÃO é liso: é concreto aparente moldado em TÁBUA de madeira, e a
  // marca da forma (faixas horizontais de ~30 cm com veio de madeira e uma linha escura na
  // emenda) fica pra sempre na superfície. Somado a isso: junta de dilatação vertical,
  // escorrimento de chuva descendo de cada junta horizontal e bolha/mancha de cura.
  // Esta textura é NEUTRA de propósito (quase branca) — quem decide se é concreto branco
  // tratado ou concreto cru cinza é o `color` do material.
  function concretoFormaTex() {
    const S = LOWQ ? 256 : 512;
    const c = cvs(S, S), x = c.getContext('2d'), k = S / 512;
    x.fillStyle = '#efece4'; x.fillRect(0, 0, S, S);
    const BW = 64 * k;                              // largura da tábua da forma (~36 cm no mundo)
    for (let b = 0; b * BW < S; b++) {
      const y0 = b * BW;
      // cada tábua tem tom levemente diferente (madeira usada em ordem aleatória na obra)
      x.fillStyle = `rgba(${b % 2 ? 205 : 220},${b % 2 ? 202 : 218},${b % 2 ? 193 : 208},${0.16 + Math.random() * 0.14})`;
      x.fillRect(0, y0, S, BW);
      // veio da madeira impresso no concreto (horizontal, baixa amplitude)
      for (let i = 0; i < 26 * k; i++) {
        x.strokeStyle = `rgba(${140 + Math.random() * 60 | 0},${138 + Math.random() * 58 | 0},${130 + Math.random() * 55 | 0},${0.05 + Math.random() * 0.10})`;
        x.lineWidth = 1; const yy = y0 + Math.random() * BW;
        x.beginPath(); x.moveTo(0, yy); x.bezierCurveTo(S * 0.3, yy + 2, S * 0.7, yy - 2, S, yy); x.stroke();
      }
      // emenda entre tábuas: linha escura fina + rebarba clara logo abaixo
      x.fillStyle = 'rgba(108,110,102,.34)'; x.fillRect(0, y0, S, Math.max(1, 1.6 * k));
      x.fillStyle = 'rgba(255,255,255,.16)'; x.fillRect(0, y0 + 2 * k, S, Math.max(1, 1 * k));
      // ESCORRIMENTO: a água da chuva empoça na emenda e desce levando fuligem. É o sinal de
      // idade nº 1 de fachada de concreto no Brasil (D2 estava em FAIL).
      for (let i = 0; i < 9; i++) {
        const px = Math.random() * S, w = (2 + Math.random() * 9) * k, h = (18 + Math.random() * 120) * k;
        const g = x.createLinearGradient(0, y0, 0, y0 + h);
        g.addColorStop(0, 'rgba(112,120,110,.32)'); g.addColorStop(0.35, 'rgba(120,126,116,.16)'); g.addColorStop(1, 'rgba(120,126,116,0)');
        x.fillStyle = g; x.fillRect(px, y0, w, h);
      }
    }
    // furos dos tirantes da forma (a cada 2 tábuas) — detalhe que só aparece de perto (B5)
    for (let gy = BW; gy < S; gy += BW * 2) for (let gx = 40 * k; gx < S; gx += 96 * k) {
      x.fillStyle = 'rgba(120,120,112,.42)'; x.beginPath(); x.arc(gx, gy + BW * 0.5, 2.4 * k, 0, 7); x.fill();
      const g = x.createLinearGradient(0, gy + BW * 0.5, 0, gy + BW * 0.5 + 26 * k);
      g.addColorStop(0, 'rgba(118,124,112,.26)'); g.addColorStop(1, 'rgba(118,124,112,0)');
      x.fillStyle = g; x.fillRect(gx - 2.4 * k, gy + BW * 0.5, 4.8 * k, 26 * k);
    }
    // junta de DILATAÇÃO vertical (a cada ~2,9 m de mundo) + manchas largas de cura
    x.fillStyle = 'rgba(96,98,92,.40)'; x.fillRect(S * 0.5 - 1.5 * k, 0, 3 * k, S);
    x.fillStyle = 'rgba(255,255,255,.10)'; x.fillRect(S * 0.5 + 1.5 * k, 0, 2 * k, S);
    for (let i = 0; i < 30; i++) {
      const px = Math.random() * S, py = Math.random() * S, r = (30 + Math.random() * 90) * k;
      const g = x.createRadialGradient(px, py, 1, px, py, r);
      g.addColorStop(0, i % 2 ? 'rgba(196,196,186,.22)' : 'rgba(255,255,252,.20)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    }
    return c;
  }
  // Mármore branco polido (colunata do Planalto/STF): veio cinza suave. Precisa de textura
  // porque roughness 0.25 sem mapa produz UM hotspot especular chapado — exatamente o que a
  // métrica pegou no pior frame do jogo.
  function marmoreTex() {
    const S = LOWQ ? 128 : 256;
    const c = cvs(S, S), x = c.getContext('2d'), k = S / 256;
    x.fillStyle = '#f6f4ee'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 22; i++) {   // veios
      x.strokeStyle = `rgba(${170 + Math.random() * 40 | 0},${168 + Math.random() * 40 | 0},${162 + Math.random() * 40 | 0},${0.08 + Math.random() * 0.14})`;
      x.lineWidth = (0.7 + Math.random() * 2.4) * k;
      const y0 = Math.random() * S;
      x.beginPath(); x.moveTo(-4, y0);
      x.bezierCurveTo(S * 0.3, y0 + (Math.random() - 0.5) * 60 * k, S * 0.7, y0 + (Math.random() - 0.5) * 60 * k, S + 4, y0 + (Math.random() - 0.5) * 40 * k);
      x.stroke();
    }
    for (let i = 0; i < 14; i++) {   // manchas amplas (variação de L* sem alta frequência)
      const px = Math.random() * S, py = Math.random() * S, r = (24 + Math.random() * 70) * k;
      const g = x.createRadialGradient(px, py, 1, px, py, r);
      g.addColorStop(0, 'rgba(214,212,204,.24)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    }
    return c;
  }
  // Piso de concreto da lane (substitui a pedra portuguesa na linha de tiro, critério C4/C3).
  // ESCURO de propósito: o chão tem que ficar >= 6 pontos de L* abaixo das paredes brancas,
  // senão o inimigo vira silhueta preta sobre fundo claro. Placas de 4 m com junta serrada,
  // remendo, mancha de óleo e desgaste — variação BAIXA frequência, que é o que C4 permite.
  function pisoConcTex() {
    const S = LOWQ ? 256 : 512;
    const c = cvs(S, S), x = c.getContext('2d'), k = S / 512;
    x.fillStyle = '#7d7a72'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 3200 * k * k; i++) {   // agregado fino (micro-detalhe p/ B5)
      const v = 90 + Math.random() * 90 | 0;
      x.fillStyle = `rgba(${v},${v - 2},${v - 8},${Math.random() * 0.16})`;
      x.fillRect(Math.random() * S, Math.random() * S, 2 * k, 2 * k);
    }
    for (let i = 0; i < 34; i++) {   // manchas de cura / remendo (quebram o tile, B2)
      const px = Math.random() * S, py = Math.random() * S, r = (26 + Math.random() * 96) * k;
      const g = x.createRadialGradient(px, py, 1, px, py, r);
      g.addColorStop(0, i % 3 ? 'rgba(150,146,136,.22)' : 'rgba(70,68,62,.24)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    }
    // junta serrada nas bordas do tile (o tile mede 4 m no mundo = placa de concreto real)
    x.fillStyle = 'rgba(58,56,52,.55)'; x.fillRect(0, 0, S, 3 * k); x.fillRect(0, 0, 3 * k, S);
    x.fillStyle = 'rgba(255,255,255,.10)'; x.fillRect(0, 3 * k, S, 2 * k); x.fillRect(3 * k, 0, 2 * k, S);
    // trinca fina saindo da junta + sujeira acumulada nela
    for (let i = 0; i < 5; i++) {
      x.strokeStyle = 'rgba(52,50,46,.42)'; x.lineWidth = 1.2 * k;
      let px = Math.random() * S, py = 3 * k;
      x.beginPath(); x.moveTo(px, py);
      for (let s = 0; s < 6; s++) { px += (Math.random() - 0.5) * 26 * k; py += (14 + Math.random() * 26) * k; x.lineTo(px, py); }
      x.stroke();
    }
    return c;
  }
  // Alpha de folhagem/flor de ipê para billboard cruzado — massa irregular de flor amarela.
  // CONSERTO (reclamação nº 3: "árvores amarelas meio esquisitas"). A paleta era amarelo-
  // limão esverdeado (#f4cf2e) com emissivo por cima: dava aquele tom fluorescente de planta
  // DOENTE, e ainda por cima competia com a silhueta do inimigo, que é o pecado capital
  // segundo a régua de consistência. Agora é ouro/âmbar quente — a cor real do ipê — sem
  // emissivo nenhum.
  function florIpeTex() {
    const S = LOWQ ? 128 : 256;
    const c = cvs(S, S), x = c.getContext('2d');
    const tones = ['#e0a41c', '#c88b10', '#efbe4c', '#a97208', '#f4d68c'];
    for (let i = 0; i < 340; i++) {
      // cachos concentrados no centro, esgarçando na borda -> silhueta recortada, não hexágono
      const a = Math.random() * Math.PI * 2, rr = Math.pow(Math.random(), 0.62) * S * 0.47;
      const px = S / 2 + Math.cos(a) * rr, py = S / 2 + Math.sin(a) * rr * 0.92;
      x.fillStyle = tones[(Math.random() * tones.length) | 0];
      x.globalAlpha = 0.75 + Math.random() * 0.25;
      const r = (S / 256) * (5 + Math.random() * 11) * (1 - rr / (S * 0.62));
      x.beginPath(); x.arc(px, py, Math.max(1.5, r), 0, 7); x.fill();
    }
    x.globalAlpha = 1;
    for (let i = 0; i < 26; i++) {   // galhinho escuro aparecendo entre as flores
      x.strokeStyle = 'rgba(74,58,40,.75)'; x.lineWidth = 1 + Math.random() * 2;
      const a = Math.random() * Math.PI * 2;
      x.beginPath(); x.moveTo(S / 2, S * 0.62);
      x.lineTo(S / 2 + Math.cos(a) * S * 0.36, S * 0.62 + Math.sin(a) * S * 0.3); x.stroke();
    }
    return c;
  }
  // Tufo de mato — vai nas rachaduras e no pé do meio-fio (D2: "mato em rachadura").
  function matoTex() {
    const S = 64;
    const c = cvs(S, S), x = c.getContext('2d');
    for (let i = 0; i < 40; i++) {
      const bx2 = 8 + Math.random() * 48, h = 22 + Math.random() * 38;
      x.strokeStyle = ['#5d6b34', '#77843f', '#8d8a4a', '#4a5a2c'][(Math.random() * 4) | 0];
      x.lineWidth = 1 + Math.random() * 1.6;
      x.beginPath(); x.moveTo(bx2, S);
      x.quadraticCurveTo(bx2 + (Math.random() - 0.5) * 14, S - h * 0.6, bx2 + (Math.random() - 0.5) * 26, S - h);
      x.stroke();
    }
    return c;
  }

  // Tinta de sinalização DESGASTADA: faixa de pedestre e seta apagam onde o pneu passa.
  // Tinta branca 100% opaca e inteira é o "recém-construído" que o D2 reprova.
  function faixaTex() {
    const c = cvs(64, 128), x = c.getContext('2d');
    x.fillStyle = '#e6e3d8'; x.fillRect(0, 0, 64, 128);
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 70; i++) {   // buracos de desgaste, maiores no meio (trilha do pneu)
      const px = Math.random() * 64, py = Math.random() * 128;
      const r = (1 + Math.random() * 7) * (1 - Math.abs(py - 64) / 90);
      x.globalAlpha = 0.35 + Math.random() * 0.6;
      x.beginPath(); x.arc(px, py, Math.max(0.6, r), 0, 7); x.fill();
    }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    return c;
  }
  // Mancha de óleo / escorrimento no piso — decal solto que quebra a leitura do tile (B2/B4).
  function manchaTex() {
    const c = cvs(128, 128), x = c.getContext('2d');
    for (let i = 0; i < 16; i++) {
      const px = 24 + Math.random() * 80, py = 24 + Math.random() * 80, r = 12 + Math.random() * 34;
      const g = x.createRadialGradient(px, py, 1, px, py, r);
      g.addColorStop(0, `rgba(${30 + Math.random() * 40 | 0},${28 + Math.random() * 36 | 0},${24 + Math.random() * 30 | 0},${0.30 + Math.random() * 0.35})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    }
    return c;
  }
  // Placa de sinalização OFICIAL brasileira (D4: "sinalização oficial em Brasília"): placa
  // indicativa verde do DNIT, letra branca em caixa alta, seta. Nada de fonte decorativa.
  function placaTex(txt) {
    const c = cvs(512, 128), x = c.getContext('2d');
    x.fillStyle = '#1d6b3f'; x.fillRect(0, 0, 512, 128);
    x.strokeStyle = '#f2f2ee'; x.lineWidth = 5; x.strokeRect(9, 9, 494, 110);
    x.fillStyle = '#f2f2ee'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'bold 44px sans-serif'; x.fillText(txt, 246, 62);
    x.beginPath(); x.moveTo(430, 62); x.lineTo(470, 62); x.lineTo(458, 48);   // seta
    x.moveTo(470, 62); x.lineTo(458, 76); x.lineWidth = 6; x.strokeStyle = '#f2f2ee'; x.stroke();
    // sujeira de chuva escorrendo da moldura (a placa está lá desde os anos 60)
    for (let i = 0; i < 26; i++) {
      const px = Math.random() * 512, h = 10 + Math.random() * 60;
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(20,26,20,.28)'); g.addColorStop(1, 'rgba(20,26,20,0)');
      x.fillStyle = g; x.fillRect(px, 0, 2 + Math.random() * 5, h);
    }
    return c;
  }

  // A projeção no mundo mantém densidade constante em GLBs e caixas; `?tri=0` usa os UVs.
  const TRI = QP.get('tri') !== '0';
  function triplanar(mat, tex, scale) {
    mat.map = tex;   // fallback por UV se o patch de shader for desligado
    if (!TRI) return mat;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTriScale = { value: scale };
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uTriScale;\nfloat gTriL;')
        .replace('#include <map_fragment>', `
  vec3 triP = cameraPosition - ( vec4( vViewPosition, 0.0 ) * viewMatrix ).xyz;
  vec3 triN = inverseTransformDirection( vNormal, viewMatrix );
  vec3 triW = pow( abs( triN ), vec3( 4.0 ) );
  triW /= max( 1e-4, triW.x + triW.y + triW.z );
  vec4 triC = texture2D( map, triP.zy * uTriScale ) * triW.x
            + texture2D( map, triP.xz * uTriScale ) * triW.y
            + texture2D( map, triP.xy * uTriScale ) * triW.z;
  gTriL = triC.g;
  diffuseColor *= triC;`)
        // O hotspot especular chapado morre aqui: a rugosidade passa a variar com a sujeira.
        // Escorrimento (pixel escuro) = superfície selada/mais lisa; concreto limpo = mais fosco.
        .replace('#include <roughnessmap_fragment>',
          'float roughnessFactor = clamp( roughness * ( 0.62 + 0.62 * gTriL ), 0.04, 1.0 );');
    };
    mat.customProgramCacheKey = () => 'briTri' + scale.toFixed(4);
    return mat;
  }

  /* ---------------- os QUATRO brancos de Brasília (BAR §4.1) ---------------- */
  // "Branco não é um branco só": mármore polido, concreto branco tratado, concreto aparente
  // cru e granito preto nas bases. Usar um material só é o erro que apaga a informação.
  // Texturas compartilhadas: uma instância só, reaproveitada por todos os materiais de
  // concreto (o triplanar é que decide a escala, então não precisa de clone por objeto).
  const TX_FORMA = ctex(concretoFormaTex()), TX_MARM = ctex(marmoreTex());
  const MAT = {
    // r2: mármore GANHOU MAPA. Sem mapa, roughness 0.25 = um único hotspot especular
    // chapado — foi literalmente o que a métrica B6 marcou no pior frame do jogo.
    marmore: triplanar(lam({ color: 0xe9e7de, roughness: 0.30, metalness: 0.02 }), TX_MARM, 0.55),
    // Concreto branco TRATADO: fosco, com marca de forma e escorrimento nas juntas.
    concBranco: triplanar(lam({ color: 0xdedcd2, roughness: 0.88 }), TX_FORMA, 0.34),
    // Concreto aparente CRU (Panteão): mesma marca de forma, mas cinza e mais rugoso —
    // o contraste com o branco polido é o assunto do edifício.
    concCru: triplanar(lam({ color: 0x93938c, roughness: 0.96 }), TX_FORMA, 0.42),
    // granito preto tem veio também; sem mapa ele vira outro plano chapado (escuro, mas chapado)
    /* ESPECULARES — RECALIBRAÇÃO R9 (o frame não tinha TOPO).
       Medido: 0,002 % dos pixels acima de L* 97 nos 96 frames das três rodadas, alvo
       0,2-0,6 %. Ou seja: NENHUM especular clipava em lugar nenhum. A causa é contra-
       intuitiva — os materiais espelhados estavam LISOS DEMAIS. Com uma luz direcional
       (delta de Dirac), o lóbulo GGX de roughness 0,06-0,14 tem meio-ângulo de 0,1-0,6°:
       o brilho existe, é intensíssimo, e cabe em MENOS DE UM PIXEL. Subindo pra 0,20-0,34
       o pico continua bem acima do ponto branco do AgX (que nesta exposição exige
       radiância de cena ≥ 2,9), mas agora espalhado por 2-4° — o que num cilindro/curva vira
       um RISCO de dezenas de pixels que estoura de verdade. `envMapIntensity` sobe junto
       porque é ele que sustenta a MEIA-LUZ da reflexão em volta do risco (o IBL é o
       gradiente de céu do game.js, e a 1,0 ele lia como se não houvesse reflexo nenhum). */
    granitoPreto: triplanar(lam({ color: 0x33353a, roughness: 0.34, metalness: 0.18, envMapIntensity: 1.6 }), TX_MARM, 0.9),
    corten: lam({ color: 0x7a4a32, roughness: 0.52, metalness: 0.62, envMapIntensity: 1.5 }),   // mastro
    // vidro fumê dos ministérios. metalness BAIXA de propósito: vidro é dielétrico. Com metalness 0.7 sobre uma cor
    // quase preta o F0 cairia pra 0,03 e o reflexo do sol sumiria de novo — o brilho de
    // fachada de vidro vem do Fresnel (F->1 na rasante), não de tratar vidro como metal.
    vidroFume: lam({ color: 0x56636b, roughness: 0.26, metalness: 0.08, envMapIntensity: 2.0 }),
    aco: lam({ color: 0x9aa0a6, roughness: 0.32, metalness: 0.85, envMapIntensity: 1.8 }),
    pintBranca: lam({ color: 0xdedbd2, roughness: 0.7 }),
    asfalto: lam({ map: ctex(asfaltoTex(), 8, 40), roughness: 0.95, emissive: 0x282521, emissiveIntensity: 0.48 }),
    // lâmina d'água do espelho: 0.06 = espelho perfeito de uma fonte pontual = ponto
    // invisível. 0.24 abre o rastro de sol na água (o "glitter path") pra vários pixels.
    agua: lam({ color: 0x2f6ea0, roughness: 0.24, metalness: 0.55, envMapIntensity: 2.2, transparent: true, opacity: 0.88 }),
    bronze: lam({ color: 0x5d6b4e, roughness: 0.40, metalness: 0.78, envMapIntensity: 1.7 }),   // pátina verde-escura
  };
  // mármore polido da colunata: o mapa de veio já quebra o hotspot chapado (r2), então aqui
  // só entra o ganho de IBL — sem ele o branco do Congresso não tem para onde subir.
  MAT.marmore.envMapIntensity = 1.35;
  const invis = new THREE.MeshBasicMaterial({ visible: false });
  // Materiais r2: piso da lane, mato de rachadura e as três massas de flor do ipê.
  const TX_PISO = ctex(pisoConcTex(), 1, 1);
  MAT.pisoConc = lam({ map: tiledLocal(TX_PISO, 3, 60), color: 0xc6c3ba, roughness: 0.94 });
  MAT.pisoCalcada = lam({ map: ctex(portuguesaTex(), 1.4, 84), color: 0xb6b2a8, roughness: 0.9 });
  // Guia/meio-fio e props pequenos: triplanar de escala fina (tile ~85 cm) — assim uma peça
  // de 1,5 m recebe textura na densidade certa em vez de 60 tiles espremidos.
  MAT.guia = triplanar(lam({ color: 0xc9c6bb, roughness: 0.92 }), TX_FORMA, 1.18);
  MAT.mato = lam({ map: ctex(matoTex(), 1, 1), transparent: false, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 1 });
  // Três materiais com a MESMA textura de flor e tinta diferente: é a variação de VALOR
  // (claro/médio/escuro) dentro da copa que faz a massa ter volume sem sólido facetado.
  {
    const txFlor = ctex(florIpeTex(), 1, 1);
    MAT.folhaIpe = [0xffffff, 0xdccfa6, 0xb6a271].map(c => lam({
      map: txFlor, color: c, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9,
    }));
  }
  MAT.tintaGasta = lam({ map: ctex(faixaTex(), 1, 1), transparent: true, roughness: 0.85, depthWrite: false });
  MAT.mancha = lam({ map: ctex(manchaTex(), 1, 1), transparent: true, opacity: 0.9, roughness: 0.9, depthWrite: false });
  function tiledLocal(tex, rx, ry) { const t = tex.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.needsUpdate = true; return t; }
  // Reveste um GLB do Mint com um dos nossos materiais. Os GLB de arquitetura vêm com UM
  // material só (branco, roughness 1 do default do glTF) para o prédio inteiro — é a origem
  // direta do "bloco branco liso". Com triplanar o UV do GLB deixa de importar.
  function dressGLB(o, mat) { if (o) o.traverse(m => { if (m.isMesh) m.material = mat; }); return o; }

  // InstancedMesh helper: um draw call por família de prop repetido (postes, cones, grades…).
  const _m4 = new THREE.Matrix4(), _qt = new THREE.Quaternion(), _eu = new THREE.Euler(), _v3 = new THREE.Vector3(1, 1, 1);
  function addInst(geo, mat, list, { occlude = false, shadow = true } = {}) {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((t, i) => {
      _eu.set(t.rx || 0, t.ry || 0, t.rz || 0); _qt.setFromEuler(_eu);
      _v3.set(t.sx || 1, t.sy || 1, t.sz || 1);
      _m4.compose(new THREE.Vector3(t.x, t.y, t.z), _qt, _v3);
      im.setMatrixAt(i, _m4);
    });
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = shadow && !LOWQ; im.receiveShadow = true;
    root.add(im);
    if (occlude) occluders.push(im);   // InstancedMesh é Mesh: entra no raycast de bala
    return im;
  }
  /* Caixa invisível de colisão de BALA/LOS. Os landmarks são GLB (Group) e o raycast do
     jogo é NÃO-recursivo (game.js:2611 `intersectObjects(..., false)`) — sem isso a bala
     atravessa o Congresso inteiro. Mesmo truque já usado no ônibus.

     REGRA DE USO (invariante MAP4, tools/eval/map-check.mjs): esta caixa só pode existir
     como PROCURAÇÃO de uma malha que a régua não consegue medir — ou seja, de um GLB. Ela
     é o que a bala bate; se ela for MAIOR que a massa que o jogador VÊ, a bala para no
     vazio e o decal de impacto fica boiando no ar. Foi exatamente o defeito que o dono
     relatou ("se atira e fica a marca no ar como se tivesse uma parede invisível"): o
     Panteão, o monumento dos Candangos e o Pombal eram GEOMETRIA PROCEDURAL (não GLB) e
     mesmo assim ganharam uma caixa cheia envolvendo um volume que é quase todo AR — asas
     inclinadas com 0,9 m de espessura dentro de uma caixa de 14 × 12 × 12 m, duas figuras
     de bronze de 0,6 m dentro de uma caixa de 3,2 × 8,9 m, e um bloco VAZADO de Niemeyer
     (o vazio é o assunto dele) dentro de uma caixa maciça de 4,6 × 6 × 4,6 m.
     Para geometria procedural o certo é o que se faz agora: registrar as PRÓPRIAS MALHAS
     em `occluders` (`occMesh`), porque aí a bala bate onde a malha está, por construção.
     `proxyGLB` marca as procurações legítimas (a régua as pula e reporta quantas pulou —
     em node nenhum GLB carrega). */
  function occBox(w, h, d, x, y, z, ry = 0, proxyGLB = null) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), invis);
    b.position.set(x, y + h / 2, z); b.rotation.y = ry; root.add(b); occluders.push(b);
    if (proxyGLB) b.userData.proxyGLB = proxyGLB;
    return b;
  }
  // (sem uso desde o contrato BUG-54 — occluder = malha visível; mantida pela doutrina acima)
  /* Registra uma malha VISÍVEL (inclusive filha de Group, que é o caso de todo landmark
     procedural montado em grupo) como alvo de bala/LOS. É a alternativa certa ao occBox
     quando a geometria existe e é desenhada: a bala passa a bater na forma real — entre as
     duas asas do Panteão, por exemplo, ela ATRAVESSA, que é o que os olhos prometem. */
  const occMesh = (o) => { if (!o) return o; o.traverse((m) => { if (m.isMesh) occluders.push(m); }); return o; };

  // Place a Mint building GLB, normalized to targetH metres, and derive a footprint
  // collider from its real placed bounds. Returns the object (or null if not loaded).
  function putBuilding(id, { x, z, targetH, ry = 0, solid = true, y = 0, dress = null, skirt = true, sq = 1 }) {
    const o = placeProp(id, { x, z, targetH, ry, y });
    if (!o) return null;
    // `sq` achata SÓ o eixo Z LOCAL do modelo. Nos blocos que entram girados 90° esse eixo
    // vira a ESPESSURA no mundo — é o que deixa o ministério um prisma fino em vez de caixa.
    if (sq !== 1) o.scale.z *= sq;
    if (dress) dressGLB(o, dress);
    // GLB é Group e o raycast de bala/LOS é NÃO-recursivo: quem segura a bala são as
    // malhas filhas — occluder = malha visível (BUG-54). Caixa de procuração não entra mais.
    root.add(o); occMesh(o);
    o.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(o);
    /* PEGADA NO EIXO DO PRÓPRIO PRÉDIO (BUG-21). `setFromObject` devolve a AABB do GLB JÁ
       GIRADO — para o ônibus (31,5°) isso é o retângulo circunscrito, e era daí que vinha a
       parede invisível. Medimos com `rotation.y = 0` e devolvemos a rotação: a caixa passa a
       ser a do modelo, e `colRot` cuida do resto. Múltiplo de 90° cai no caminho barato. */
    if (solid) {
      const peg = PEGADA_CORPO[id];
      if (peg || (ry && !alinhado(ry))) {
        o.rotation.y = 0; o.updateMatrixWorld(true);
        const b0 = new THREE.Box3().setFromObject(o);
        o.rotation.y = ry; o.updateMatrixWorld(true);
        let x0 = b0.min.x, x1 = b0.max.x, z0 = b0.min.z, z1 = b0.max.z;
        if (peg) {
          // frações do box local — a caixa vira a pegada NA ALTURA DO CORPO (tabela acima)
          const W = x1 - x0, D = z1 - z0;
          x1 = x0 + W * peg.x1; x0 += W * peg.x0;
          z1 = z0 + D * peg.z1; z0 += D * peg.z0;
        }
        const hx = (x1 - x0) / 2, hz = (z1 - z0) / 2;
        const lx = (x0 + x1) / 2 - x, lz = (z0 + z1) / 2 - z;
        const cs = Math.cos(ry), sn = Math.sin(ry);
        colRot(x + lx * cs + lz * sn, z - lx * sn + lz * cs, hx, hz, y, Math.max(1, bb.max.y), ry);
      } else col(bb.min.x, bb.max.x, y, Math.max(1, bb.max.y), bb.min.z, bb.max.z);
    }
    // AO de contato também para os LANDMARKS GLB. A geometria deles é template compartilhado
    // entre clones (placeProp faz clone(true)), então gravar `color` na malha contaminaria
    // todas as instâncias — mas a SAIA é geometria nova em espaço de mundo e não tem esse
    // problema. É o que faz o Congresso/Catedral/Ministério pararem de flutuar sobre o gramado.
    // O anel nasce 6 % PARA DENTRO da bounding box: a pegada real de um GLB é menor que o
    // AABB, e sem o recuo os quatro cantos do anel apareceriam como quadrados escuros no
    // gramado. `skirt: false` nos landmarks de planta redonda (catedral, pilha de pneus),
    // onde nenhum recuo salva um anel retangular.
    if (skirt && y <= 0.35) SKIRT.add((bb.min.x + bb.max.x) / 2, y, (bb.min.z + bb.max.z) / 2,
      (bb.max.x - bb.min.x) * 0.94, (bb.max.z - bb.min.z) * 0.94, 0);
    return o;
  }

  /* ---------------- ground + esplanade ---------------- */
  // Tile the textures (clone + RepeatWrapping) so big surfaces show real detail
  // instead of one blurry stretched image.
  const tiled = (tex, rx, ry) => {
    const t = tex.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.needsUpdate = true; return t;
  };
  // Medimos ANTES de desenhar o chão: a pegada real do bloco de ministério define onde
  // ficam as pistas do Eixo (elas passam POR FORA dos ministérios, como no real).
  const MIN_H = BIG ? 22 : 7;          // 8-10 pavimentos ≈ 22 m (era 7 m = casinha)
  const PILOTI = BIG ? 4.8 : 0;        // os blocos reais são VAZADOS por baixo (pilotis)
  const LANE_HX = 24;                  // face interna dos ministérios = parede da lane
  // RECLAMAÇÃO Nº 6 ("os prédios do lado parecem malfeitos"). O GLB do ministério tem
  // 0,69 de espessura para 1,0 de altura: a 22 m ele nasce com 15,2 m de espesso e lê como
  // CAIXA. O bloco real da Esplanada é um prisma fino — ~20 m de espessura para ~26 m de
  // altura. MIN_SQ achata só a espessura (10,9 m), sem mexer no comprimento nem na altura,
  // então nada do layout derivado (espaçamento, Z do Palácio, jardim) se move. Proporção
  // antes de detalhe. `?minsq=0` volta ao bloco gordo.
  const MIN_SQ = (BIG && QP.get('minsq') !== '0') ? 0.72 : 1;
  let MW = 26, MD = 14;                // fallback se o GLB não carregou
  {
    const probe = placeProp('ministerio', { x: 0, z: 0, targetH: MIN_H, ry: Math.PI / 2 });
    if (probe) {
      probe.scale.z *= MIN_SQ;
      probe.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(probe);
      MW = Math.max(6, bb.max.x - bb.min.x); MD = Math.max(6, bb.max.z - bb.min.z);
    }
  }
  const MIN_CX = LANE_HX + MW / 2;                 // centro do bloco (face interna em ±24)
  const ROAD_IN = LANE_HX + MW + 5, ROAD_W = 21;   // 6 faixas por sentido, por fora dos blocos

  // Chão: gramado do cerrado NA SECA (palha dourada), não verde-esmeralda (BAR §4.1 / gap B1).
  // Plano maior (420×460) porque a escala nova joga os landmarks pra 130 m.
  const cerrado = ctex(cerradoTex(), 54, 60);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 460), lam({ map: cerrado, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);
  // PISO DA LANE (r2 — regressão C4). A rodada 1 colocou pedra portuguesa nos 12 m centrais,
  // ou seja, EXATAMENTE na linha de tiro principal: padrão de altíssima frequência e alto
  // contraste bem atrás do bot no crosshair. A pedra é certa pro lugar, errada pra banda de
  // 0–2 m. Agora a lane é CONCRETO ESCURO com placa de 4 m e junta serrada (variação de
  // baixa frequência, que é o que C4 permite) e a portuguesa migra pras calçadas laterais.
  // O concreto também é o que garante C3: chão bem abaixo do L* das paredes brancas.
  addPlane(12.4, 240, MAT.pisoConc, 0, 0.03, 0, 0, -Math.PI / 2);
  // Calçadas de PEDRA PORTUGUESA nas laterais (fora dos meio-fios, |x| entre 6,2 e 10,4).
  // Continua sendo a praça brasileira — só saiu de dentro do duelo.
  for (const sx of [-1, 1])
    addPlane(4.2, 240, MAT.pisoCalcada, sx * 8.3, 0.028, 0, 0, -Math.PI / 2);
  // Faixa de concreto sob os pilotis (a "calçada" dos ministérios) + meio-fio.
  for (const sx of [-1, 1]) {
    addPlane(MW + 10, 240, lam({ map: tiled(T.concreteDark, 4, 80), roughness: 0.9 }),
      sx * (LANE_HX + MW / 2 - 1), 0.02, 0, 0, -Math.PI / 2);
    // Eixo Monumental: 250 m de largura no total — as pistas asfaltadas por fora dos blocos.
    addPlane(ROAD_W, 300, MAT.asfalto, sx * (ROAD_IN + ROAD_W / 2), 0.04, 0, 0, -Math.PI / 2);
  }
  // Faixas brancas tracejadas das pistas (InstancedMesh: 1 draw call pro Eixo inteiro).
  if (DETAIL > 0) {
    const dashes = [];
    for (const sx of [-1, 1]) for (let li = 1; li < 6; li++) {
      const lx = sx * (ROAD_IN + (ROAD_W / 6) * li);
      for (let z = -140; z <= 140; z += 9) dashes.push({ x: lx, y: 0.06, z, rx: -Math.PI / 2 });
    }
    // tinta DESGASTADA (r2/D2): a faixa da pista não é branca inteira, ela apaga na trilha do pneu
    addInst(new THREE.PlaneGeometry(0.18, 4.5), MAT.tintaGasta, dashes, { shadow: false });
  }

  /* ---------------- LANDMARKS (Mint building models) ---------------- */
  // Congresso Nacional at the NORTH end (towers + Senate dome + Chamber bowl).
  // ry = π: towers BEHIND the tray, Senate dome (convex) left, Chamber bowl right —
  // the postcard view from the esplanade (verified in mapeval).
  // ESCALA (gap B2): as torres reais têm ~100 m. A 22 m o Congresso lia como pavilhão de
  // feira e a "monumentalidade esmagadora" — que é O assunto de Brasília — sumia. 55 m a
  // 130 m de distância devolve o cartão-postal sem invadir o campo de jogo.
  const CONG_H = BIG ? 55 : 22, CONG_Z = BIG ? 152 : 78;
  putBuilding('congresso', { x: 0, z: CONG_Z, targetH: CONG_H, ry: Math.PI, dress: MAT.concBranco });
  // Catedral (crown) at the SOUTH end + stained glass BETWEEN the ribs (the Mint model
  // has no glass). The glass profile is fitted 0.3–0.5m INSIDE the measured rib envelope
  // (ribs run r≈10.3 @ base → r≈3.4 @ rim y≈9.5, see tools: measure-catedral) so the
  // white ribs stay visible outside the glass, like the real Niemeyer crown.
  // Catedral: 40 m no real. 30 m recuada a -108 (era 13 m a -76, "minúscula no fundo").
  const CAT_H = BIG ? 30 : 13, CAT_Z = BIG ? -108 : -76, CAT_S = CAT_H / 13;
  putBuilding('catedral', { x: 0, z: CAT_Z, targetH: CAT_H, ry: 0, dress: MAT.concBranco, skirt: false });
  {
    // O perfil do vitral foi medido pra targetH 13; escala junto com a coroa (CAT_S).
    const profile = [[9.6, 0.3], [9.35, 1], [8.35, 2], [7.3, 3], [6.3, 4], [4.6, 5],
      [4.1, 6], [3.5, 7], [3.35, 8], [3.2, 9.2]]
      .map(([r, y]) => new THREE.Vector2(r * CAT_S, y * CAT_S));
    const glassGeo = new THREE.LatheGeometry(profile, 28);
    const glassMat = new THREE.MeshLambertMaterial({
      color: 0x2e6f9e, emissive: 0x0a2440, transparent: true, opacity: 0.55,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0, 0, CAT_Z); root.add(glass);
  }
  // Palácio do Planalto (east) + STF (west) framing the Praça, facing inward. Like the
  // REAL Planalto, the pilotis stand IN a shallow reflecting pool — the water grounds
  // the cantilevered roof so it no longer reads as floating. Plinth slab + water on top.
  // Layout da Esplanada calculado a partir da pegada REAL do bloco (o GLB muda de proporção
  // quando a altura sobe pra 22 m): espaçamento e nº de blocos derivam de MD, não hard-coded.
  const MSP = Math.max(MD + 6, 26);
  const MN = Math.max(2, Math.min(4, Math.floor(96 / MSP) + 1));
  const MZ = []; for (let i = 0; i < MN; i++) MZ.push(-30 + (i - (MN - 1) / 2) * MSP);
  // O Z do Planalto/STF é DERIVADO da última fileira de ministérios (a pegada do GLB muda
  // com a altura) — hard-coded, os volumes se atravessavam quando o bloco ficava mais fundo.
  const PAL_Z = BIG ? Math.max(50, MZ[MN - 1] + MD / 2 + 16) : 30;
  // PAL_H=10 (não 14): o GLB do palácio tem planta QUADRADA 3,55:1 — a 14 m ele viraria um
  // bloco de 50 × 50 m que engolia os spawns do norte. 10 m mantém a leitura e o campo livre.
  // PAL_X 29 -> 32: a plataforma cresceu em X para caber a colunata nova (ela avança 2,2 m
  // da fachada e precisa nascer EM CIMA do embasamento, não boiando fora dele). Empurrar o
  // prédio 3 m para fora mantém o corredor central da praça e os spawns do norte livres.
  const PAL_X = BIG ? 32 : 22, PAL_H = BIG ? 10 : 6;
  const PAL_OUT = 2.2;                       // avanço da colunata em relação à fachada
  const PAL_EX = BIG ? PAL_OUT + 1.0 : 1.2;  // folga da plataforma em X (cobre a colunata)
  let PAL_ZMAX = PAL_Z + 10;   // borda norte real da Praça, medida (usada pelos marcos)

  for (const px of [PAL_X, -PAL_X]) {
    const ry = px > 0 ? -Math.PI / 2 : Math.PI / 2;
    const PL = BIG ? 1.45 : 0.35;   // plataforma elevada (o STF real fica sobre plataforma)
    const probe = placeProp('palacio', { x: px, z: PAL_Z, targetH: PAL_H, ry });
    if (probe) {
      probe.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(probe);
      const pw = (bb.max.x - bb.min.x) + PAL_EX * 2, pd = (bb.max.z - bb.min.z) + 2.4;
      const pcx = (bb.min.x + bb.max.x) / 2, pcz = (bb.min.z + bb.max.z) / 2;
      PAL_ZMAX = Math.max(PAL_ZMAX, bb.max.z + 1.2);
      // base em GRANITO PRETO (BAR: granito preto em bases e soleiras) + soleira de mármore.
      // AGORA COLIDE (era `collide:false`): a plataforma tinha 1,2 m de altura VISÍVEL e zero
      // colisão, então o jogador entrava 1,2 m dentro do granito e só parava na caixa
      // invisível do prédio — com o espelho d'água boiando na altura do peito. Era isso o
      // "não dá pra andar na parte da água". Com 1,45 m (acima do apex do pulo, 0,61 m) a
      // plataforma vira o que ela parece: um embasamento de monumento em que não se sobe.
      addBox(pw, PL, pd, MAT.granitoPreto, pcx, 0, pcz);
      addBox(pw + 0.3, 0.14, pd + 0.3, MAT.marmore, pcx, PL, pcz, { collide: false });
      // O espelho d'água que existia AQUI EM CIMA foi REMOVIDO. Ele ficava sobre a plataforma,
      // quase todo escondido embaixo do próprio prédio: sobrava um anel azul de 40 cm que
      // ninguém nunca leu como água — só como "borda azul esquisita" — e era a segunda
      // superfície de água meia-boca do mapa. O mapa fica com UMA lâmina d'água só, a do
      // jardim, essa sim com parapeito e leitura clara. Excesso é o problema, não falta.
      const b = placeProp('palacio', { x: px, z: PAL_Z, targetH: PAL_H, ry, y: PL + 0.16 });
      if (b) {
        // O Palácio Mint já traz albedo, normal e metallic/roughness. Não revestir a malha
        // inteira com um material procedural: isso apaga o asset profissional e o reduz a
        // uma caixa branca/escura. Os volumes abaixo complementam a silhueta sem substituir PBR.
        root.add(b); occMesh(b);
        b.updateMatrixWorld(true);
        const bb2 = new THREE.Box3().setFromObject(b);
        col(bb2.min.x, bb2.max.x, 0, Math.max(1, bb2.max.y), bb2.min.z, bb2.max.z);
        /* ============ IDENTIDADE DO PLANALTO / STF (reclamação nº 4 do dono) ============
           "ganhou texturas mas perdeu toda identidade". A versão anterior enfiava BRISE
           VERTICAL nas QUATRO faces + uma laje de coroamento de 60 cm: brise vertical em
           volta inteira é vocabulário de edifício comercial dos anos 80, é o oposto do
           Planalto, e a laje gorda matava o "flutuar". Regra deste conserto: SILHUETA ANTES
           DE TEXTURA. Ficam só os quatro elementos que fazem qualquer brasileiro reconhecer
           o prédio de longe, sem nenhuma textura nova:
             1. duas LAJES FINAS (34 cm) em balanço de 2,8 m — o volume "flutua";
             2. o VIDRO ESCURO RECUADO entre elas (a caixa some na sombra da laje);
             3. a COLUNATA CURVA de Niemeyer, perfil de vela: toca o chão num fio, engrossa
                no meio e afina de novo ao encontrar a laje (era um tronco de cone de 8 lados);
             4. a RAMPA, que é a assinatura do Planalto.
           `?planalto=old` volta ao brise antigo. */
        // A/B visual: `mint` preserva o landmark autoral sem a releitura procedural.
        // `enhanced` e `old` ficam disponíveis para provar, na mesma câmera, quanto
        // cada sobreposição se afasta do asset aprovado.
        const PALMODE = QP.get('planalto') || 'enhanced';
        const NEWPAL = PALMODE === 'enhanced';
        if (BIG && DETAIL > 0 && NEWPAL) {
          const y0 = bb2.min.y, y1 = bb2.max.y, HH = Math.max(2, y1 - y0);
          const x0 = bb2.min.x, x1 = bb2.max.x, z0 = bb2.min.z, z1 = bb2.max.z;
          const W = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
          const OUT = PAL_OUT;                               // quanto a colunata avança da fachada
          // 1. LAJES FINAS. A de baixo é o piso que a colunata apoia; a de cima é a cobertura.
          //    O balanço (OUT+1,0) passa DA FRENTE da colunata: é a sombra dura desse balanço
          //    que joga o vidro para dentro e faz o volume ler como laje flutuando.
          addBox(W + PAL_EX * 2, 0.32, D + 2.0, MAT.marmore, cx, y1 - 0.32, cz, { collide: false });
          addBox(W + PAL_EX * 2, 0.30, D + 2.0, MAT.marmore, cx, y0 - 0.30, cz, { collide: false, cast: false });
          // 2. VIDRO ESCURO ocupando TODA a altura entre as lajes (antes era uma faixa de
          //    peitoril de 34% da altura, que lia como "listra" e não como caixa envidraçada).
          const gy = y0 + HH * 0.5, gh = HH - 0.9;
          for (const [fw, fx, fz, fry] of [[D - 1.0, x0 - 0.05, cz, -Math.PI / 2],
            [D - 1.0, x1 + 0.05, cz, Math.PI / 2],
            [W - 1.0, cx, z0 - 0.05, Math.PI], [W - 1.0, cx, z1 + 0.05, 0]])
            addPlane(fw, gh, MAT.vidroFume, fx, gy, fz, fry);
          // 3. COLUNATA CURVA. Perfil desenhado com bezier e EXTRUDADO: é um plano de mármore,
          //    não um cilindro. `ry = π/2` põe a curva de frente para quem olha a fachada
          //    (o x local do Shape vira o z do mundo, a extrusão vira a espessura em x).
          const CH = Math.max(2, (y1 - 0.32) - y0);
          const sh = new THREE.Shape();
          const wb = 0.07, wm = 0.52, wt = 0.19;   // largura no pé / no bojo / no encontro c/ a laje
          sh.moveTo(-wb, 0);
          sh.bezierCurveTo(-wm * 1.06, CH * 0.17, -wm, CH * 0.63, -wt, CH);
          sh.lineTo(wt, CH);
          sh.bezierCurveTo(wm, CH * 0.63, wm * 1.06, CH * 0.17, wb, 0);
          sh.lineTo(-wb, 0);
          const colGeo = new THREE.ExtrudeGeometry(sh, { depth: 1.5, bevelEnabled: false, curveSegments: LOWQ ? 3 : 6 });
          colGeo.translate(0, 0, -0.75);
          const nc = LOWQ ? 6 : 10, cz0 = z0 + 1.6, cstep = (D - 3.2) / (nc - 1);
          const colsL = [];
          for (const fs of [-1, 1]) for (let i = 0; i < nc; i++)
            colsL.push({ x: (fs < 0 ? x0 : x1) + fs * OUT, y: y0, z: cz0 + i * cstep, ry: Math.PI / 2 });
          addInst(colGeo, MAT.marmore, colsL, { occlude: false });
          // 4. RAMPA — a assinatura do Planalto. Lâmina branca subindo em diagonal contra o
          //    vidro escuro, na face virada pro miolo da praça. É DECORATIVA e nasce a 2,3 m
          //    do chão (acima da cabeça do jogador) justamente para não prometer um caminho
          //    que não existe: quem manda no acesso é o embasamento de granito, que é sólido.
          const rrun = Math.min(17, W * 0.52), rrise = HH * 0.45;
          const rlen = Math.hypot(rrun, rrise), rsg = px > 0 ? 1 : -1;
          const rmp = new THREE.Mesh(new THREE.BoxGeometry(rlen, 0.26, 2.4), MAT.marmore);
          rmp.rotation.z = rsg * Math.atan2(rrise, rrun);
          rmp.position.set(px > 0 ? x0 + rrun / 2 : x1 - rrun / 2, PL + 0.9 + rrise / 2, z0 - 0.9);
          rmp.castShadow = !LOWQ; rmp.receiveShadow = true; root.add(rmp);
          const guard = new THREE.Mesh(new THREE.BoxGeometry(rlen, 0.52, 0.14), MAT.marmore);
          guard.position.set(0, 0.39, -1.16); rmp.add(guard);   // guarda-corpo só na face de fora
        }
        // brise antigo (só com `?planalto=old`, para A/B)
        if (BIG && DETAIL > 0 && PALMODE === 'old') {
          const y0 = bb2.min.y, y1 = bb2.max.y, HH = Math.max(2, y1 - y0);
          const x0 = bb2.min.x, x1 = bb2.max.x, z0 = bb2.min.z, z1 = bb2.max.z;
          const W = x1 - x0, D = z1 - z0;
          addBox(W + 0.5, 0.95, D + 0.5, MAT.granitoPreto, (x0 + x1) / 2, y0 - 0.02, (z0 + z1) / 2, { collide: false, cast: false });
          addBox(W + 2.6, 0.60, D + 2.6, MAT.marmore, (x0 + x1) / 2, y1 - 0.38, (z0 + z1) / 2, { collide: false });
          const gy = y0 + HH * 0.52, gh = HH * 0.34;
          for (const [fw, fx, fz, fry] of [[D - 1.2, x0 - 0.06, (z0 + z1) / 2, -Math.PI / 2],
            [D - 1.2, x1 + 0.06, (z0 + z1) / 2, Math.PI / 2],
            [W - 1.2, (x0 + x1) / 2, z0 - 0.06, Math.PI], [W - 1.2, (x0 + x1) / 2, z1 + 0.06, 0]])
            addPlane(fw, gh, MAT.vidroFume, fx, gy, fz, fry);
          const finsX = [], finsZ = [], step = LOWQ ? 4.2 : 2.6;
          const finH = Math.max(1.2, HH - 1.7), finY = y0 + 0.95 + finH / 2;
          for (let t = step * 0.5; t < D - 0.4; t += step) {
            finsX.push({ x: x0 - 0.28, y: finY, z: z0 + t });
            finsX.push({ x: x1 + 0.28, y: finY, z: z0 + t });
          }
          for (let t = step * 0.5; t < W - 0.4; t += step) {
            finsZ.push({ x: x0 + t, y: finY, z: z0 - 0.28 });
            finsZ.push({ x: x0 + t, y: finY, z: z1 + 0.28 });
          }
          addInst(new THREE.BoxGeometry(0.62, finH, 0.30), MAT.marmore, finsX, { occlude: false });
          addInst(new THREE.BoxGeometry(0.30, finH, 0.62), MAT.marmore, finsZ, { occlude: false });
        }
        // (o poster do Dollynho saiu do Palácio do Planalto — agora vai só nas fachadas
        //  dos ministérios, abaixo; o Planalto fica limpo, como na Brasília real)
      }
    }
  }
  // Ministérios lining the esplanade (reuse the one slab, long axis along Z = lane walls).
  // Agora com 22 m e SOBRE PILOTIS: o bloco real é vazado por baixo, e isso vira a rota de
  // flanco que faltava (o mapa era um corredor reto). Colisão só nos pilares.
  const ministries = [];
  const pilCols = [];
  // FACHADA POR PAVIMENTO (reclamação nº 6). Antes cada bloco levava UM plano de vidro fumê
  // de 54 × 19,6 m: um retângulo cinza-escuro chapado do tamanho de um quarteirão — a coisa
  // mais "malfeita" do fundo. Agora a mesma área vira 6 FITAS horizontais de vidro separadas
  // por testeiras brancas de concreto que se projetam 15 cm: a sombra própria de cada
  // testeira desenha os pavimentos e o bloco passa a ler como edifício a qualquer distância.
  // Continua sendo 2 draw calls no total (InstancedMesh) e nenhum prop novo.
  const minGlass = [], minBand = [];
  for (const sx of [-1, 1]) for (const mz of MZ) {
    const b = putBuilding('ministerio', { x: sx * MIN_CX, z: mz, targetH: MIN_H, ry: Math.PI / 2, y: PILOTI, solid: !BIG, dress: MAT.concBranco, sq: MIN_SQ });
    ministries.push(b);
    if (!b) continue;
    b.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(b);
    const w = bb.max.x - bb.min.x, d = bb.max.z - bb.min.z;
    const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
    if (!BIG) continue;
    // laje inferior (fecha o vão por baixo e dá sombra dura de meio-dia no piso)
    addBox(w, 0.9, d, MAT.concBranco, cx, PILOTI - 0.9, cz, { collide: false });
    // vidro fumê em FITAS de pavimento + testeira branca entre elas (ver comentário acima)
    {
      const NF = LOWQ ? 4 : 6, fh = (MIN_H - 1.6) / NF;
      for (let i = 0; i < NF; i++) {
        const yb = PILOTI + 0.9 + i * fh;
        for (const fs of [-1, 1]) {
          minGlass.push({ x: cx + fs * (w / 2 + 0.05), y: yb + fh * 0.32, z: cz,
            ry: fs > 0 ? Math.PI / 2 : -Math.PI / 2, sx: d - 1.4, sy: fh * 0.64 });
          minBand.push({ x: cx + fs * (w / 2 + 0.12), y: yb + fh * 0.82, z: cz,
            sx: 0.3, sy: fh * 0.34, sz: d - 0.5 });
        }
      }
    }
    // pilares: grade 3 (X) × N (Z). Viram COVER dentro da passagem de flanco.
    const nz = Math.max(3, Math.round(d / 7));
    for (let i = 0; i < 3; i++) for (let j = 0; j < nz; j++) {
      const px2 = cx + (i - 1) * (w / 2 - 1.4), pz2 = cz + (j - (nz - 1) / 2) * ((d - 3) / (nz - 1));
      pilCols.push({ x: px2, y: PILOTI / 2, z: pz2 });
      col(px2 - 0.55, px2 + 0.55, 0, PILOTI, pz2 - 0.55, pz2 + 0.55);
    }
  }
  if (pilCols.length) addInst(new THREE.CylinderGeometry(0.5, 0.55, PILOTI, 8), MAT.concBranco, pilCols, { occlude: true });
  addInst(new THREE.PlaneGeometry(1, 1), MAT.vidroFume, minGlass, { shadow: false });
  addInst(new THREE.BoxGeometry(1, 1, 1), MAT.concBranco, minBand, { shadow: false });

  /* ---------------- statues ---------------- */
  { // A Justiça — Mint GLB v2 (blindfolded, sword across the lap, Brazil flag draped as a
    // sash — matches the real reference). The flag is baked into the mesh now; we only add
    // the small "PERDEU, MANÉ" graffiti on the chest (Mint can't render reliable text).
    // Fica EM FRENTE AO STF (lado oeste da Praça), como a real — antes estava solta no meio
    // da lane, sem relação com nenhum edifício.
    const sx = BIG ? -9 : -11, sz = BIG ? 26 : 22;   // out in the open facing the lane (+X)
    const o = placeProp('justica', { x: sx, z: sz, targetH: 3.6, ry: Math.PI / 2 });
    if (o) {
      root.add(o); occMesh(o); col(sx - 1, sx + 1, 0, 3.6, sz - 1, sz + 1);
      // small "PERDEU MANÉ" graffiti decal on the chest (statue front faces +X, chest
      // surface measured by raycast at x≈-11.1), clear of the sash
      addPlane(0.6, 0.4, lam({ map: T.perdeuMane, transparent: true, side: THREE.DoubleSide }),
        sx - 0.04, 2.35, sz + 0.05, Math.PI / 2);
    }
  }
  { // Os Guerreiros — procedural bronze monument (Mint mesher failed on it twice)
    // BAR: Bruno Giorgi 1959, duas figuras de ~8 m, pátina VERDE-ESCURA (não marrom-mostarda
    // como estava) sobre base baixa de GRANITO. É a silhueta que identifica a praça de longe,
    // então cresce de 5,6 m -> 8,4 m junto com o resto da escala.
    // CONSERTO (reclamação nº 5: "parecem 2 cones"). Eram literalmente dois troncos de cone
    // de 6 lados com uma bola em cima — nenhuma leitura humana. Os Candangos do Giorgi são
    // duas figuras CHAPADAS e altíssimas, de pernas muito longas, ombro largo, cabeça
    // pequena, encostadas uma na outra e com as lanças subindo em V. Aqui a figura é montada
    // com as proporções certas (perna 45% da altura, tronco 30%, cabeça 4%): mesmo em
    // primitivas simples, proporção certa = silhueta humana. Nada de textura nova.
    const bx = BIG ? 9 : 6, bz = BIG ? 24 : 40, S = BIG ? 1.25 : 0.85;
    const bronze = MAT.bronze;
    // `occluders.push(g)` (Group) era LETRA MORTA: Group.raycast é no-op e o raycast de bala
    // é não-recursivo — quem registrava o monumento era só o occBox de baixo. Ver occMesh.
    const g = new THREE.Group(); g.position.set(bx, 0, bz); root.add(g);
    const ped = new THREE.Mesh(new THREE.BoxGeometry(2.5 * S, 0.5, 1.6 * S), MAT.granitoPreto);
    ped.position.y = 0.25; ped.receiveShadow = true; g.add(ped);
    // uma figura, em metros "de figura" (a escala S é aplicada no grupo)
    const candango = (s) => {
      const f = new THREE.Group();
      for (const lx of [-0.17, 0.17]) {   // pernas longas e finas: 45% da altura
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.16, 3.05, 6), bronze);
        leg.position.set(lx, 1.52, 0); leg.rotation.z = -lx * 0.11; f.add(leg);
      }
      const hip = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.4), bronze); hip.position.y = 3.3; f.add(hip);
      // tronco de cintura fina para ombro largo — é esse trapézio que o olho lê como "torso"
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.31, 2.05, 6), bronze);
      torso.position.y = 4.58; f.add(torso);
      const sho = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.32, 0.42), bronze); sho.position.y = 5.62; f.add(sho);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 5), bronze); neck.position.y = 5.92; f.add(neck);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), bronze);
      head.position.y = 6.32; head.scale.set(0.82, 1.35, 0.9); f.add(head);
      // braço de DENTRO: quase horizontal, cruzando para as costas do companheiro = o abraço
      const armIn = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 1.6, 5), bronze);
      armIn.position.set(-s * 0.6, 5.32, 0.1); armIn.rotation.z = s * 1.18; f.add(armIn);
      // braço de FORA: levantado, acompanhando a lança
      const armOut = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 1.75, 5), bronze);
      armOut.position.set(s * 0.7, 5.02, 0); armOut.rotation.z = -s * 0.44; f.add(armOut);
      const lance = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 5.6, 5), bronze);
      lance.position.set(s * 1.0, 5.2, -0.12); lance.rotation.z = -s * 0.17; f.add(lance);
      f.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      return f;
    };
    for (const s of [-1, 1]) {
      const f = candango(s);
      f.position.set(s * 0.62 * S, 0.5, 0);
      f.rotation.z = -s * 0.06;          // as duas se apoiam: o V é o assunto do monumento
      f.scale.setScalar(S); g.add(f);
    }
    // colisão FINA (o monumento é uma lâmina): fica fora da faixa de tiro da lane
    col(bx - 1.4 * S, bx + 1.4 * S, 0, 0.5 + 6.7 * S, bz - 0.95 * S, bz + 0.95 * S);
    /* PAREDE INVISÍVEL CORRIGIDA (map_brasilia.js:928, invariante MAP4). Era
       `occBox(2.6*S, 0.5+6.7*S, 1.8*S, …)`: uma caixa MACIÇA de 3,2 × 8,9 × 2,2 m em volta
       de duas figuras de bronze que somam ~1,2 m de largura de massa. Medido: 92% da
       superfície dessa caixa não tinha NENHUMA malha visível atrás, até 8,2 m de altura —
       quem mirava o céu entre as duas cabeças via o tiro parar no ar. Agora a bala bate nas
       figuras: pernas, tronco, ombro, cabeça, braços e lança viram occluders de verdade. */
    occMesh(g);
  }

  /* ---------------- praça furniture ---------------- */
  // MASTRO ESPECIAL DA PRAÇA DOS TRÊS PODERES — Sérgio Bernardes.
  // CONSERTO (reclamação do dono: "mastro gigante e impossível de ver a bandeira"). Ele
  // estava em x=0, ou seja, EXATAMENTE na linha de tiro central, e com 84 m de altura +
  // 1,6 m de raio: virava uma coluna de corten no meio da mira, e a bandeira ficava a 78 m
  // — muito acima do frustum (FOV vertical 70° => a 50 m o topo da tela é ~37 m). Ou seja:
  // atrapalhava o duelo E não entregava o marco. Agora ele SAI DO EIXO (x = -34, fora da
  // lane e fora do crosshair de quem duela pelo eixo), afina de 3,2 m para 1,5 m de largura
  // (treliça esbelta, que é o que o real é) e a bandeira desce para ~38 m — dentro do
  // frustum de quem olha para o norte de qualquer ponto jogável. Marco de orientação, não
  // obstáculo. `?mastro=old` volta ao mastro antigo se algo depender dele.
  {
    const OLDM = QP.get('mastro') === 'old';
    const MZ2 = BIG ? Math.min(118, Math.max(96, PAL_ZMAX + 34)) : 44;
    const MX = OLDM ? 0 : (BIG ? -34 : -16), H = BIG ? (OLDM ? 84 : 46) : 30, R = BIG ? (OLDM ? 1.6 : 0.75) : 0.5;
    const NB = LOWQ ? 8 : 14, NR = LOWQ ? 5 : 9;
    const bars = [];
    for (let i = 0; i < NB; i++) {
      const a = (i / NB) * Math.PI * 2;
      bars.push({ x: MX + Math.cos(a) * R, y: H / 2, z: MZ2 + Math.sin(a) * R });
    }
    addInst(new THREE.CylinderGeometry(0.04, 0.11, H, 4), MAT.corten, bars, { occlude: false });
    const core = new THREE.Mesh(new THREE.CylinderGeometry(BIG ? 0.19 : 0.14, BIG ? 0.26 : 0.18, H, 8), MAT.corten);
    core.position.set(MX, H / 2, MZ2); core.castShadow = !LOWQ; root.add(core);
    const rings = [];
    for (let i = 1; i <= NR; i++) rings.push({ x: MX, y: (H / (NR + 1)) * i, z: MZ2, rx: Math.PI / 2 });
    addInst(new THREE.TorusGeometry(R, 0.06, 4, 12), MAT.corten, rings, { shadow: false });
    // ponta curta + bandeira. Sem hook de update por frame no mapa, então a ondulação é
    // ASSADA na geometria (custo zero, mesma leitura de pano ao vento).
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, BIG ? 5 : 3, 6), MAT.corten);
    tip.position.set(MX, H + (BIG ? 2.5 : 1.5), MZ2); root.add(tip);
    const FW = BIG ? 13 : 6, FH = BIG ? 9.3 : 4;
    const fg = new THREE.PlaneGeometry(FW, FH, 14, 6);
    { const p = fg.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const vx = p.getX(i), vy = p.getY(i), t = (vx + FW / 2) / FW;   // preso na tralha (x=-FW/2)
        p.setZ(i, Math.sin(t * 7.5 + vy * 0.35) * 0.85 * t * t);
      }
      fg.computeVertexNormals(); }
    const flag = new THREE.Mesh(fg, lam({ map: T.flagBR, side: THREE.DoubleSide, roughness: 0.85 }));
    // altura da bandeira DENTRO do frustum: a 100 m de distância o topo da tela está a ~72 m,
    // a 50 m está a ~37 m. 38 m é o maior valor que ainda lê do meio do mapa sem olhar pra cima.
    flag.position.set(MX + FW / 2 + 0.3, BIG ? (OLDM ? 78 : 38) : 25, MZ2); flag.castShadow = !LOWQ; root.add(flag);
    col(MX - R - 0.3, MX + R + 0.3, 0, H, MZ2 - R - 0.3, MZ2 + R + 0.3);
  }
  // Jardim com espelho d'água em frente ao Congresso (garden + reflecting pool)
  // CONSERTO (reclamação do dono: "não dá pra andar na parte da água"). O espelho era um
  // PLANO sem colisão, e quem parava o jogador era o limite invisível do mapa, alguns metros
  // ANTES da água: o jogador via água caminhável e batia no nada. Escolha feita aqui: a água
  // é INTRANSPONÍVEL e passa a DIZER isso: virou uma BACIA ELEVADA com parede de granito de
  // 1,05 m e soleira de mármore, que colide de verdade, e com a lâmina d'água a 55 cm — ou
  // seja, a água aparece POR CIMA da borda, de longe, em vez de ser um decalque azul no
  // chão. O espelho ainda desceu 6 m e o limite invisível do mapa subiu de 76 para 84 m,
  // para que quem para o jogador seja a PAREDE QUE ELE VÊ e não o nada. 1,05 m é de
  // propósito: o teste de colisão libera a passagem em `y + 0,3 > maxY`, e o apex do pulo é
  // 0,61 m — com 0,9 m dava pra atravessar pulando; com 1,05 não dá.
  const GARDEN_Z = BIG ? Math.max(76, PAL_ZMAX + 14) : 50;
  {
    const PAR_H = 1.05, HW = 14.2, HD = 5.1;   // meia-largura / meia-profundidade do parapeito
    addPlane(26.4, 8.6, MAT.agua, 0, 0.55, GARDEN_Z, 0, -Math.PI / 2);
    // parapeito fechado nos 4 lados: granito no corpo + soleira de mármore no topo (a linha
    // clara é o que faz a borda LER a 30 m, mesmo contra o piso claro da praça)
    for (const rz of [GARDEN_Z - HD, GARDEN_Z + HD]) {
      addBox(HW * 2, PAR_H, 0.7, MAT.granitoPreto, 0, 0, rz);
      addBox(HW * 2 + 0.3, 0.12, 0.92, MAT.marmore, 0, PAR_H, rz, { collide: false });
    }
    for (const rx of [-HW + 0.35, HW - 0.35]) {
      addBox(0.7, PAR_H, HD * 2, MAT.granitoPreto, rx, 0, GARDEN_Z);
      addBox(0.92, 0.12, HD * 2, MAT.marmore, rx, PAR_H, GARDEN_Z, { collide: false });
    }
    for (const gx of [-22, 22]) addPlane(10, 12, lam({ map: ctex(cerradoTex(), 3, 4) }), gx, 0.04, GARDEN_Z, 0, -Math.PI / 2);
  }

  /* ---------------- marcos secundários da Praça (gap B5) ---------------- */
  // Panteão, Pombal e Museu da Cidade são elementos OBRIGATÓRIOS no BAR §4.1 e não existiam.
  // Além de fidelidade, cada um vira um marco visual distinto por área da praça (regra de
  // clareza competitiva: o jogador tem que saber onde está sem olhar o radar).
  if (BIG && DETAIL > 0) {
    // Panteão da Pátria Tancredo Neves — CONCRETO APARENTE CRU (cinza), forma de pomba.
    // O contraste deliberado com o branco polido do resto é o ponto do edifício.
    {
      const px = 22, pz = PAL_ZMAX + 8;
      const g = new THREE.Group(); g.position.set(px, 0, pz); root.add(g);
      const base = new THREE.Mesh(new THREE.BoxGeometry(15, 1.0, 12), MAT.concCru); base.position.y = 0.5; g.add(base);
      for (const s of [-1, 1]) {   // as duas "asas" inclinadas que fazem a pomba
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 13, 11), MAT.concCru);
        wing.position.set(s * 3.4, 6.5, 0); wing.rotation.z = s * 0.30; g.add(wing);
        // r2: a asa era uma chapa de 13 × 11 m de cor lisa — o outro candidato ao "muro
        // branco" que a métrica B6 pegou. Além da textura de forma (triplanar), ganha
        // FRISOS horizontais a cada 3,2 m: cada friso projeta uma sombra fina ao meio-dia,
        // e é essa sombra que faz uma superfície grande ler como concreto, não placeholder.
        for (let fy = -4.4; fy < 5.6; fy += 3.2) {
          const fr = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.18, 11.2), MAT.concCru);
          fr.position.set(0, fy, 0); wing.add(fr);   // filho da asa: acompanha a inclinação
        }
      }
      const beak = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.8, 3), MAT.concCru);
      beak.position.set(0, 11.5, 0); beak.rotation.z = 0.12; g.add(beak);
      // embasamento de granito preto: separa o volume do chão e dá o gradiente de contato (A1)
      const emb = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.42, 12.6), MAT.granitoPreto);
      emb.position.y = 0.21; g.add(emb);
      g.traverse(o => { if (o.isMesh) { o.castShadow = !LOWQ; o.receiveShadow = true; } });
      // A pegada acompanha o embasamento visível de 15,6 × 12,6 m, não só as asas.
      col(px - 7.8, px + 7.8, 0, 12, pz - 6.3, pz + 6.3);
      /* PAREDE INVISÍVEL CORRIGIDA (map_brasilia.js:1042, invariante MAP4). Era
         `occBox(14, 12, 12, …)`: um bloco maciço de 14 × 12 × 12 m em cima de um edifício
         que é DUAS chapas de 0,90 m inclinadas e um bico. Medido: 100% da superfície dessa
         caixa sem malha visível atrás, até 11,1 m de altura — o "V" entre as asas do
         Panteão, que é o vazio que o edifício desenha, parava bala. Este era o pior dos
         três, e fica no quadrante nordeste da praça, de frente pro eixo de duelo.
         Agora as próprias chapas (com os frisos), o bico, a base e o embasamento são os
         occluders: atirar no V atravessa, atirar na asa acerta a asa. */
      occMesh(g);
    }
    // Pombal (Niemeyer) — bloco vazado de concreto branco, escala pequena, ISOLADO no vazio.
    {
      // +6 -> +4: o espelho d'água ganhou parapeito e desceu para PAL_ZMAX+14; a +6 o Pombal
      // encostava na borda dele (folga de 15 cm). A +4 sobram ~2 m, sem volume atravessado.
      const px = -14, pz = PAL_ZMAX + 4;
      const g = new THREE.Group(); g.position.set(px, 0, pz); root.add(g);
      for (const [ox, oy] of [[0, 5.6], [0, 0]])   // laje de cima e de baixo
        { const s = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.4, 4.4), MAT.concBranco); s.position.set(ox, oy + 0.2, 0); g.add(s); }
      for (const [ox, oz] of [[-2, 0], [2, 0]])    // duas paredes → o vazado
        { const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.6, 4.4), MAT.concBranco); w.position.set(ox, 2.9, oz); g.add(w); }
      g.traverse(o => { if (o.isMesh) { o.castShadow = !LOWQ; o.receiveShadow = true; } });
      col(px - 2.4, px + 2.4, 0, 6, pz - 2.4, pz + 2.4);
      /* PAREDE INVISÍVEL CORRIGIDA (map_brasilia.js:1056, invariante MAP4). O Pombal é um
         bloco VAZADO — o vazio entre as duas paredes é literalmente o assunto da peça — e
         estava dentro de um `occBox(4,6 × 6 × 4,6)` maciço: 44% da superfície sem malha
         atrás, até 5,6 m. Quem atirava PELO vazado via a bala parar no meio do buraco. */
      occMesh(g);
    }
    // Museu da Cidade — laje de concreto branco apoiada num ÚNICO pilar.
    {
      const px = -24, pz = PAL_ZMAX + 8;
      addBox(1.4, 3.2, 1.4, MAT.concBranco, px, 0, pz);
      const laje = addBox(11, 0.9, 6, MAT.concBranco, px, 3.2, pz, { collide: false, cast: true });
      addBox(11.4, 0.2, 6.4, MAT.granitoPreto, px, 0, pz, { collide: false });   // soleira/piso
      /* PAREDE INVISÍVEL CORRIGIDA (map_brasilia.js:1076, invariante MAP4). O `occBox(11,
         1.1, 6, …, y 3,1)` era 20 cm mais alto que a laje visível (0,90 m, y 3,2-4,1): uma
         fatia de 10 cm de ar acima e abaixo dela parava bala — 32% da superfície medida.
         Pouco, mas é o mesmo defeito: a laje é geometria PRÓPRIA, então ela é o occluder. */
      occMesh(laje);
    }
  }

  /* ---------------- protest posters / banners on the ministry FACADES ---------------- */
  let POOLS = null;   // ponte dos pools de decalque pra passada de grafite (fim do build)
  {
    const imgs = T.posterImgs || [], aspects = T.posterAspects || [];
    const laneOrder = [1, 4, 0, 3, 2, 5];   // priority posters land on the mid buildings first
    const putPoster = (b, idx) => {
      if (!b || !imgs.length) return;
      const bb = new THREE.Box3().setFromObject(b);
      const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
      const lane = cx > 0 ? -1 : 1;
      const fx = (lane > 0 ? bb.max.x : bb.min.x) + lane * 0.3;   // 0.3 (era 0.06): não briga em z com o vidro fumê
      const ti = idx % imgs.length;
      const H = 5.6 * ((T.posterEscala || [])[ti] || 1), A = aspects[ti] || 0.7;             // big posters on the lane facades
      // Com os pilotis o térreo ficou vazado; os cartazes sobem pra primeira laje cheia.
      const fy = BIG ? PILOTI + H / 2 + 0.8 : Math.min(bb.max.y - H / 2 - 0.4, 3.5);
      addPlane(H * A, H, lam({ map: imgs[ti], side: THREE.DoubleSide }), fx, fy, cz, lane > 0 ? Math.PI / 2 : -Math.PI / 2);
    };
    ministries.forEach((b, i) => putPoster(b, laneOrder[i] ?? i));

    /* ---------------- DECALQUE DE RUA nas fachadas dos ministérios ----------------
       Pedido do dono (04/08): aplicar os 179 recortes de `public/img/decals` "na textura de
       todos mapas onde faz sentido: laterais de prédios ... e num tamanho MAIOR que os
       posters atuais para serem bem visíveis".

       POR QUE AQUI FAZ SENTIDO E NOS MONUMENTOS NÃO: este mapa já é o 8 de janeiro — tem
       acampamento de barraca, barricada de pneu e cartaz de protesto colado na fachada. Bloco
       de ministério pichado é a continuação literal dessa cena. Planalto, STF, Congresso e
       Catedral NÃO recebem nada: são os quatro marcos que orientam o mapa inteiro (C23 da
       BAR-CONSISTENCIA — "um marco por área, e ele não se repete"), e cobrir a silhueta deles
       destrói justamente a leitura que faz a Esplanada ser reconhecível de qualquer ponto.

       VAI NA EMPENA (as duas faces CURTAS, ±z), e não na fachada da lane. A 1ª versão colou
       na face longa e a captura mostrou o defeito na hora: aquela face é feita de 6 FITAS DE
       VIDRO FUMÊ separadas por testeiras brancas de 15 cm, então a peça inteira cai em cima
       de janela — grafite em vidro não existe e lê como adesivo flutuando. A empena é o
       oposto: ~11 m de concreto branco liso e 22 m de altura, sem uma abertura, virada para a
       travessa entre um bloco e o outro. É a parede cega do prédio, que é exatamente onde
       grafite grande mora na cidade real.

       ALTURA: até 5,0 m de peça começando em 5,2 m — logo acima do piloti, que é vazado e onde
       ninguém pinta. Bem maior que os 2,2 m dos cartazes do Piscinão, que é a régua de tamanho
       que o dono deu; aqui os cartazes de protesto locais são de 5,6 m e ficam no CENTRO da
       fachada da lane, então as duas famílias não competem pela mesma parede.

       O QUE FOI TENTADO E MEDIDO COMO RUIM: uma faixa de pixação na testeira da laje do piloti
       (0,90 m de altura entre 3,90 e 4,80 m, a única alvenaria cega da fachada da lane). A
       captura mostrou o motivo de sair: a 24 m — que é a largura da lane, ou seja, a distância
       NORMAL de quem olha pro bloco — a peça fica com ~25 px de altura na tela. É exatamente o
       "detalhe invisível a 10 m" que a BAR §2.1 chama de ruído: custa GPU e não entrega nada.

       REGRAS (cada uma com defeito real atrás): `T.decals[i]` lido por ÍNDICE — é getter
       memoizado (textures.js:696) e spread acordaria os 179 PNG (7 MB) de uma vez;
       `transparent: true`, senão o alpha vira retângulo preto na fachada; `addPlane`, que NÃO
       empurra collider nem occluder — decalque com colisor vira parede invisível, que foi o
       BUG-21 do ônibus DESTE mapa (2,33 m de parede fantasma); 0,35 m de afastamento, o mesmo
       do cartaz, pra não brigar em z com as fitas de vidro fumê; e escolha determinística por
       posição, porque o `botsim` é determinístico e mapa que muda a cada carregamento é
       defeito. Fora do pool: as 47 folhas de 'alfabeto' (letra fina e clara, some a 10 m —
       BAR §2.1) e os recortes de olho/boca soltos (viram mancha abstrata ampliados). */
    // (`POOLS` é declarado antes do bloco — ver a ponte no fim desta seção)
    const D_MURAL = decalIds(T, ['personagem-muro.png', 'personagens-graffiti-01.png',
      'personagens-graffiti-02.png', 'personagens-graffiti-03.png', 'personagens-graffiti-04.png',
      'personagens-graffiti-05.png', 'personagens-graffiti-06.png', 'personagens-graffiti-07.png',
      'peca-bolha.png', 'or-graf-treta.png', 'or-graf-coro.png',
      'or-stencil-capivara.png', 'or-stencil-pomba.png']);   // originais versionados (vivos em prod)
    /* PROTESTO E PIXO PRA PASSADA DE COBERTURA (07/08). A Praça dos Três Poderes não
       se escreve com tag de bairro: o que aparece em muro de contenção, tapume de obra
       e ônibus queimado aqui é lambe de campanha, stencil e pixação de manifestação.
       Por isso pool separado do `D_MURAL` — mesma passada, vocabulário diferente. */
    const D_LAMBE = decalIds(T, ['cartaz-america-latina.png', 'cartaz-medo.png',
      'cartaz-neutro.png', 'dont-overthink.png', 'gratidao-sol.png', 'meio-ano.png',
      'pra-gringo.png', 'folha-lambes.png', 'folha-stenci.png']);
    const D_TAG = decalIds(T, ['tag-fina.png', 'tag-flop.png', 'tag-larga.png',
      'tag-money.png', 'tag-pingo.png', 'tag-selvagem.png', 'tags-treino-02.png',
      'tags-treino-05.png', 'folha-pixaca-01.png', 'folha-pixaca-03.png',
      'folha-pixaca-05.png', 'folha-pixaca-07.png']);
    /* Ponte pro fim do build: a passada roda depois dos waypoints (é deles que ela
       mira) e este bloco é fechado. Copiar as listas lá embaixo criaria duas verdades
       sobre o mesmo pacote de arte. */
    POOLS = { D_MURAL, D_LAMBE, D_TAG };
    /* SÓLIDOS DE DECALQUE. O bloco do ministério é GLB e, com `bigscale`, entra com
       `solid: false` — a colisão fica só nos pilares do piloti, então `colliders` NÃO tem a
       empena e o `paredeAtras` reprovaria as 16 peças certas. A empena entra aqui, medida do
       Box3 do próprio GLB, que é a mesma caixa de onde saem `cx`/`w` logo abaixo. */
    const _dmix = (n) => { let v = (n * 2654435761) >>> 0; v ^= v >>> 15; v = Math.imul(v, 2246822519) >>> 0; v ^= v >>> 13; v = Math.imul(v, 3266489917) >>> 0; return (v ^ (v >>> 16)) >>> 0; };
    const _dmat = new Map(), _usados = [];
    const decal = (x, y0, z, ry, alt, larg) => {
      if (!T.decals || !T.decalAspects || !D_MURAL.length) return null;
      const k = _dmix(_dmix(Math.round(x * 10) + 9973) + Math.round(z * 10) * 131 + 7);
      let i = D_MURAL[k % D_MURAL.length];        // anti-repetição: arte repetida a menos de
      for (let t = 0; t < D_MURAL.length; t++) {  // 30 m em fachada de bloco lê como falha de
        const j = D_MURAL[(k + t) % D_MURAL.length];   // asset, não como cidade pichada
        if (!_usados.some((u) => u.i === j && Math.hypot(u.x - x, u.z - z) < 30)) { i = j; break; }
      }
      const asp = T.decalAspects[i] || 1;
      let hh = alt, ww = alt * asp;
      if (ww > larg) { ww = larg; hh = larg / asp; }
      /* PAREDE ATRÁS ANTES DE DESENHAR (map_decals.js), agora contra a MALHA e não contra
         caixa declarada. A versão anterior media contra `caixaDeBox3(Box3.setFromObject(b))`
         — a caixa do ministério INTEIRO — e o ministério é um bloco sobre PILOTIS: o térreo
         é VAZADO. As 16 peças passavam a régua e nasciam NO AR, entre as colunas, com o
         gramado visível através delas (capturado). Medido no navegador: 16/16 com os 25
         raios no vazio, até 0,90 m de distância da malha mais próxima, e a única malha por
         perto é `Pilotis_Glass_Ministry_1`, que é VIDRO. Passando `root` o teste vira
         raycast na geometria desenhada e o defeito não tem como voltar. */
      if (!paredeAtras([root], x, y0 + hh / 2, z, ry, ww, hh)) return null;
      _usados.push({ i, x, z });
      let m = _dmat.get(i);
      if (!m) {
        /* MeshStandardMaterial direto, NÃO o `lam` daqui: o `lam` roda `detailFor(map)`, que
           deriva normal/roughness do albedo por Sobel — num PNG com alpha isso gera relevo a
           partir do RECORTE, e a peça ganha um contorno em baixo-relevo que não existe na
           arte. Tinta é lisa; quem tem relevo é a parede. */
        m = new THREE.MeshStandardMaterial({
          map: T.decals[i], transparent: true, alphaTest: 0.22, roughness: 0.95, metalness: 0,
          polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
        });
        _dmat.set(i, m);
      }
      const h = hh, w = ww;                       // encolhe inteiro; NUNCA estica
      const q = addPlane(w, h, m, x, y0 + h / 2, z, ry);
      q.renderOrder = 2;
      q.name = 'decal:' + (T.decalFiles ? T.decalFiles[i] : i);
      esconderSeFaltar(q, T.decals[i]);   // PNG 404 em prod vira BRANCO CHAPADO se não sumir (ver graffiti_pass.esconderSeFaltar)
      return q;
    };
    for (const b of ministries) {
      if (!b) continue;
      const bb = new THREE.Box3().setFromObject(b);
      const cx = (bb.min.x + bb.max.x) / 2, w = bb.max.x - bb.min.x;
      /* DUAS peças lado a lado por empena (norte com ry = π, sul com ry = 0). A empena tem
         ~11 m: uma peça só com `larg = 0,8 · w` toma a parede inteira e vira fachada pintada,
         que não é grafite — é publicidade. Duas de 0,44 · w deixam respiro entre elas e entre
         cada uma e a quina, que é como muro bombardeado de verdade se distribui. */
      for (const s of [-1, 1]) {
        decal(cx + s * w * 0.24, BIG ? 5.2 : 0.6, bb.min.z - 0.35, Math.PI, BIG ? 5.0 : 2.8, w * 0.44);
        decal(cx + s * w * 0.24, BIG ? 5.2 : 0.6, bb.max.z + 0.35, 0, BIG ? 5.0 : 2.8, w * 0.44);
      }
    }
  }

  /* ---------------- gameplay cover: props do 8 de janeiro ---------------- */
  // Tire-pile barricades (Mint) as the main lane cover — the protest look.
  for (const [tx, tz, ry] of [[-6, -14, 0.3], [7, 12, -0.4], [-8, 26, 0.8], [9, -26, 0.2],
    [10, 3, 0], [-10, -3, 1.1], [4, 34, 0.5], [-4, -34, -0.3]])
    putBuilding('tires', { x: tx, z: tz, targetH: 1.6, ry, skirt: false });
  // Barraquinhas de camelô (vendor stalls) — o vão debaixo do toldo é ABERTO
  for (const [sx, sz, sry] of [[-13, -8, Math.PI / 2], [13, 8, -Math.PI / 2], [-10, -23, Math.PI / 2], [9, -21, -Math.PI / 2]])
    putBuilding('stall', { x: sx, z: sz, targetH: 2.7, ry: sry });
  // Mini-acampamento de barracas (protest camp) junto aos ministérios oeste
  // (+2 barracas avançadas em direção ao centro: cobertura extra saindo do spawn B)
  for (const [tx, tz, ry] of [[-15, -30, 0.2], [-17, -35, 1.1], [-13, -36, -0.5], [16, 20, 0.6],
    [-6, -27, 0.9], [7, -25, -0.4]])
    putBuilding('tent', { x: tx, z: tz, targetH: 1.7, ry });
  // Acampamento (barracas em 2 fileiras) emoldurando a ponta da CATEDRAL (lado time-b),
  // simétrico ao jardim+espelho da ponta do Congresso — backdrop temático atrás do spawn B.
  for (const [tx, tz, ry] of [[-12, -66, 0.15], [-4, -67, -0.2], [4, -66, 0.25], [12, -67, -0.15],
    [-8, -70.5, 0.5], [8, -70.5, -0.5]])
    putBuilding('tent', { x: tx, z: tz, targetH: 1.7, ry });
  // a few Correios/SEDEX parcels still around for variety (Brazilian postal boxes)
  const crateMats = [lam({ map: T.crate }), lam({ map: T.crate2 || T.crate })];
  for (const [i, [cx, cz, lv]] of [[11, 2, 0], [-11, 0, 0], [11, 3.6, 1], [-5, 18, 0]].entries())
    addBox(1.6, 1.6, 1.6, crateMats[i % 2], cx, lv * 1.6, cz, { ry: (cx * 7 % 10) / 22, pad: -0.05 });

  /* ---------------- ônibus quebrado do DF (Mint GLB — cover grande, CENTRAL) ---------------- */
  // "Amarelinho" gerado no Mint, atravessado no meio da Esplanada (quebrado, encostado).
  // solid:false — o colisor do ônibus é o colRot MEDIDO logo abaixo (único, igual em
  // browser e em node); deixar o putBuilding derivar outro do Box3 criava caixa DUPLICADA
  // e mais gorda (o Box3 inteiro conta retrovisor e saia do para-choque).
  putBuilding('bus', { x: 2.5, z: -4, targetH: 3.1, ry: 0.55, solid: false });
  {
    /* COLISÃO DO ÔNIBUS — defeito reportado pelo dono com print: "o mapa não deixa eu andar
       perto do ônibus".

       CAUSA RAIZ: o ônibus está girado 0,55 rad (31,5°) e `col()` empurra `{minX,maxX,minY,maxY,minZ,maxZ}` e **o motor
       não tem collider rotacionado em lugar nenhum** (nem `_collide`, nem o A* dos bots).
       A caixa única de 9,0 × 5,2 alinhada aos eixos é o retângulo girado "achatado": sobra
       nas quinas e falta nas laterais.

       MEDIDO (planta, amostragem de 2 cm — script no fim deste comentário):
         ônibus real ................ 41,5 m²
         collider antigo ............ 46,8 m²
         BLOQUEAVA SEM ÔNIBUS ....... 12,9 m², com parede invisível a até **2,33 m** da
                                      lataria  <- é isso que ele sentiu
         ônibus SEM colisão ......... 7,6 m² (dava pra entrar no ônibus pelas quinas)

       CORREÇÃO: decompor o retângulo girado numa grade 6×3 no espaço LOCAL do ônibus e
       empurrar a AABB exata de cada célula. Vira uma escada de caixas que segue a diagonal.
         parede invisível ........... 2,33 m -> **0,69 m**
         bloqueio indevido .......... 12,9 -> 9,4 m²
         ônibus sem colisão ......... 7,6 -> **0 m²**
       18 caixas num mapa que tem ~20 chamadas de `col()` é caro em legibilidade, não em
       CPU (AABB é um teste de 6 comparações). Aumentar a grade continua melhorando
       (8×4 dá 0,51 m), mas 0,69 m já é menor que o raio do jogador (0,38) + passo.

       E VOLTOU A INCOMODAR — palavras dele na segunda passada: "o box do ônibus não deixa
       você andar perto e é como se fosse um quadrado, mas o ônibus está em diagonal, devia
       ser possível andar". 0,69 m é meio passo de parede fantasma, e meio passo se sente.

       CORREÇÃO DEFINITIVA (esta): COLLIDER COM ROTAÇÃO NO MOTOR. `game.js/_collideRot`
       testa no espaço local do prop, então a caixa aqui é UMA e é a lataria:
         parede invisível ........... 0,69 m -> **0,00 m** (o erro é zero por construção)
         bloqueio indevido .......... 9,4 m² -> 0,0 m²
         ônibus sem colisão ......... 0 m² (mantido)
         colisores do ônibus ........ 18 -> 1
       Régua: `node tools/eval/obb-check.mjs` — anda com o `_collide` DO JOGO numa grade de
       5 cm em volta do prop e mede a maior distância entre a lataria e o ponto bloqueado. */
    /* 3ª PASSADA (05/08, "ainda tem problemas com o box do ônibus"): a caixa 9,26×4,48 era
       o Box3 do GLB INTEIRO — retrovisores e a aba do teto contam largura que não existe na
       altura do peito. Medido por vértice (faixa y 0,25–2,05 m, percentil 1–99 por área):
       o corpo tocável é 8,85×4,21 m, com centro deslocado (+0,025, −0,095) no espaço local.
       Centro abaixo já está no MUNDO (mesma transformação do putBuilding, cos/sin de 0,55). */
    /* 4ª PASSADA (06/08, "o box do onibus esta protegendo um espaco que devia ser vazio e
       esta pegando tiros"): a pegada da 3ª passada estava no eixo DA CAIXA do GLB, e o
       corpo do modelo é TORTO dentro dela (-18,7° — PCA ponderado por área; ver PEGADA_BUS).
       Colisor e occluder ficavam ~20° fora da lataria: fantasma de 3,77 m numa ponta,
       lataria descoberta na outra. Agora o colisor segue o eixo DO CORPO — e a bala
       bate nas malhas do GLB (occMesh do putBuilding), sem caixa de procuração. */
    colRot(2.5, -4, PEGADA_BUS.hx, PEGADA_BUS.hz, 0, 3.1, 0.55 + PEGADA_BUS.ryCorr);
  }

  /* ---------------- urna eletrônica (Sketchfab — monumento no MEIO do mapa) ---------------- */
  // Urna no centro da praça (pedido do usuário): cover baixo entre o ônibus e as barracas.
  putBuilding('urna', { x: 0, z: 0, targetH: 1.2, ry: -0.4 });

  /* ---------------- Towner do hotdog (Sketchfab — carrinho de hotdog) ---------------- */
  // Asia Towner/Daihatsu Hijet virou o carrinho de hotdog da praça, no lado time-b.
  putBuilding('towner', { x: 12, z: -15, targetH: 2.0, ry: -0.9 });

  /* ---------------- barraquinha de bebida (Mint GLB — mini-bar c/ guarda-sol) -------------- */
  // Drink stand com cadeiras de plástico e guarda-sol grande, junto às barraquinhas.
  putBuilding('drinkstand', { x: -14, z: -17, targetH: 3.2, ry: 0.5 });   // guarda-sol é ABERTO embaixo — bala atravessa e para só no balcão/mastro

  /* ---------------- barricada improvisada (bloco + chapa + tábuas) ---------------- */
  { // protest barricade near the west tents: concrete block, corrugated sheet, planks.
    const bx = -8, bz = 20, bry = -0.3;
    const g = new THREE.Group(); g.position.set(bx, 0, bz); g.rotation.y = bry; root.add(g);
    const conc = lam({ color: 0xb8bab2 }), rust = lam({ color: 0x8a5a3a }), wood = lam({ color: 0x9a7b4f });
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.7, 0.8), conc); base.position.y = 0.35; g.add(base);
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 0.08), rust);
    sheet.position.set(0.2, 1.15, 0.1); sheet.rotation.x = -0.12; g.add(sheet);
    for (const [py, pr] of [[0.95, 0.18], [1.25, -0.14]]) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.16, 0.06), wood);
      plank.position.set(0, py, 0.28); plank.rotation.z = pr; g.add(plank);
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    occMesh(g);
    const c = Math.abs(Math.cos(bry)), s = Math.abs(Math.sin(bry));
    const ex = 1.7 * c + 0.45 * s, ez = 1.7 * s + 0.45 * c;
    col(bx - ex, bx + ex, 0, 1.6, bz - ez, bz + ez);
  }

  // concrete planters with greenery. A grama do topo ERA {collide:false} (só visual): o muro
  // parecia ~1.4m de cobertura mas só bloqueava 0.9m (a base), então agachado (olho ~1m) a
  // cabeça ficava exposta e tomava tiro "atrás do muro". Agora o topo também bloqueia
  // bala/visão → a cobertura visível = a cobertura real (agachado protege).
  const jardTex = lam({ map: ctex(cerradoTex(), 2, 1) });
  for (const [px, pz] of [[-9, 8], [9, -8], [0, -20], [0, 16], [-16, 30], [16, 26], [-14, -46], [14, -50]]) {
    if (!freeSpot(px, pz, 2.2)) continue;
    addBox(3.4, 0.9, 1.3, MAT.concBranco, px, 0, pz);
    addBox(3, 0.5, 0.9, jardTex, px, 0.9, pz);
  }

  /* ---------------- DENSIDADE: mobiliário urbano + vegetação (task 3) ---------------- */
  // Tudo aqui é InstancedMesh: o frame ganha detalhe secundário sem estourar draw call
  // (≈14 draw calls no total pra ~500 objetos). ?props=0 desliga; quality low corta pela metade.
  if (DETAIL > 0) {
    const every = DETAIL === 1 ? 2 : 1;   // low: metade dos props
    const Zs = [];
    for (let z = -64; z <= 64; z += 8 * every) Zs.push(z);

    // MEIO-FIO / GUIA (r2). Era UM box de 240 m: uma aresta perfeitamente reta de ponta a
    // ponta, que é justo o que o critério B7 reprova. Agora são guias de 1,5 m (a peça real
    // de concreto pré-moldado) com desnível e giro milimétricos, junta visível entre elas e
    // pintura branca desbotada — a linha continua guiando o olho, mas parou de ser um traço
    // de CAD. Duas fileiras: guia interna (lane) e externa (fim da calçada portuguesa).
    const guias = [], guiaTopo = [];
    for (const sx of [-1, 1]) for (const gx of [6.2, 10.4]) {
      for (let z = -118; z <= 118; z += 1.52) {
        const jt = ((z * 7.3) % 1 + 1) % 1;                    // ruído determinístico por peça
        guias.push({ x: sx * gx, y: 0.085 + jt * 0.012, z, ry: (jt - 0.5) * 0.012 });
        if (jt > 0.62) guiaTopo.push({ x: sx * gx, y: 0.175, z, rx: -Math.PI / 2 });   // trecho repintado
      }
    }
    addInst(new THREE.BoxGeometry(0.34, 0.19, 1.46), MAT.guia, guias, { shadow: false });
    addInst(new THREE.PlaneGeometry(0.3, 1.4), MAT.pintBranca, guiaTopo, { shadow: false });

    // MATO NA RACHADURA (D2 estava em FAIL: "tudo recém-construído"). Tufo de capim
    // brotando na junta entre a guia e o piso — o sinal de abandono mais barato e mais
    // brasileiro que existe. Billboard cruzado com alphaTest; não projeta sombra.
    if (!LOWQ) {
      const tufos = [];
      for (const sx of [-1, 1]) for (const gx of [6.05, 10.55]) {
        for (let z = -112; z <= 112; z += 3.1) {
          if (((z * 3.7 + gx) % 1 + 1) % 1 > 0.42) continue;   // esparso, não um canteiro
          const a = ((z * 11.1) % 1) * 3;
          tufos.push({ x: sx * gx, y: 0.17, z, ry: a });
          tufos.push({ x: sx * gx, y: 0.17, z, ry: a + 1.57 });
        }
      }
      addInst(new THREE.PlaneGeometry(0.44, 0.34), MAT.mato, tufos, { shadow: false });
    }

    // Postes de iluminação: mastro galvanizado 9 m + braço + luminária. Marcam a lane e dão
    // ritmo vertical ao vazio (o vazio é o assunto, mas vazio SEM ritmo lê como cena inacabada).
    const masts = [], arms = [], heads = [];
    for (const sx of [-1, 1]) for (const z of Zs.filter((_, i) => i % 2 === 0)) {
      const x = sx * 22;
      if (!freeSpot(x, z, 1)) continue;
      masts.push({ x, y: 4.5, z });
      arms.push({ x: x - sx * 0.9, y: 8.9, z, rz: Math.PI / 2 });
      heads.push({ x: x - sx * 1.8, y: 8.7, z });
      col(x - 0.25, x + 0.25, 0, 9, z - 0.25, z + 0.25);
    }
    addInst(new THREE.CylinderGeometry(0.13, 0.22, 9, 6), MAT.aco, masts, { occlude: true });
    addInst(new THREE.CylinderGeometry(0.1, 0.1, 2, 5), MAT.aco, arms, { shadow: false });
    addInst(new THREE.BoxGeometry(0.9, 0.18, 0.4), MAT.pintBranca, heads, { shadow: false });

    // Grades metálicas de contenção da PM (BAR: "detalhes que confirmam isso é Brasília, hoje").
    // Bloqueiam bala/visão agachado: viram cobertura leve nos ângulos longos da Esplanada.
    const gPost = [], gRail = [];
    const gradeAt = (x, z, ry) => {
      if (!freeSpot(x, z, 1.6)) return;
      for (const d of [-1.1, 1.1]) gPost.push({ x: x + Math.cos(ry) * d, y: 0.55, z: z - Math.sin(ry) * d });
      for (const h of [0.45, 1.0]) gRail.push({ x, y: h, z, ry, rz: Math.PI / 2 });
      col(x - 1.2, x + 1.2, 0, 1.1, z - 0.25, z + 0.25);
    };
    for (const [gx, gz, gr] of [[-13, 34, 0], [-10.6, 34, 0], [13, 34, 0], [10.6, 34, 0],
      [-13, -30, 0], [13, -30, 0], [4, 20, 0], [-4, 20, 0], [8, -44, 0], [-8, -44, 0]])
      if (DETAIL === 2 || gx > 0) gradeAt(gx, gz, gr);
    addInst(new THREE.BoxGeometry(0.08, 1.1, 0.08), MAT.aco, gPost, { occlude: true });
    addInst(new THREE.CylinderGeometry(0.045, 0.045, 2.2, 5), MAT.aco, gRail, { occlude: true, shadow: false });

    // Lixeiras + cones + jardineiras cilíndricas (props de escala humana perto do chão).
    const bins = [], cones = [], vasos = [];
    for (const [bx2, bz2] of [[7.2, 22], [-7.2, 6], [7.2, -18], [-7.2, -38], [7.2, 46], [-7.2, -56]])
      if ((DETAIL === 2 || bz2 > 0) && freeSpot(bx2, bz2, 0.8)) { bins.push({ x: bx2, y: 0.5, z: bz2 }); col(bx2 - 0.4, bx2 + 0.4, 0, 1, bz2 - 0.4, bz2 + 0.4); }
    addInst(new THREE.CylinderGeometry(0.38, 0.30, 1.0, 8), lam({ color: 0x3f4a3f, roughness: 0.7 }), bins, { occlude: true });
    for (const [cx2, cz2] of [[3, -8], [4.2, -9], [-3, 12], [-4.2, 13], [1, 30], [10, -34], [-10, 42], [2.4, -52]])
      if ((DETAIL === 2 || cx2 > 0) && freeSpot(cx2, cz2, 0.6)) {
        cones.push({ x: cx2, y: 0.35, z: cz2 });
        col(cx2 - 0.28, cx2 + 0.28, 0, 0.7, cz2 - 0.28, cz2 + 0.28);
      }
    addInst(new THREE.ConeGeometry(0.28, 0.7, 7), lam({ color: 0xd8501e, roughness: 0.8 }), cones, { occlude: true, shadow: false });
    for (const [vx, vz] of [[9.5, 40], [-9.5, 40], [9.5, -12], [-9.5, -12], [9.5, 56], [-9.5, 56]])
      if (freeSpot(vx, vz, 1.1)) { vasos.push({ x: vx, y: 0.35, z: vz }); col(vx - 0.7, vx + 0.7, 0, 0.7, vz - 0.7, vz + 0.7); }
    addInst(new THREE.CylinderGeometry(0.72, 0.6, 0.7, 10), MAT.concCru, vasos, { occlude: true });

    // Faixa de pedestre atravessando o eixo (tinta branca desgastada).
    const zebra = [];
    for (const fz of [18, -26]) for (let i = -6; i <= 6; i++) zebra.push({ x: i * 0.95, y: 0.05, z: fz, rx: -Math.PI / 2 });
    addInst(new THREE.PlaneGeometry(0.5, 4), MAT.tintaGasta, zebra, { shadow: false });

    // PALMEIRA-IMPERIAL em fileira: tronco cinza liso e alto, copa pequena no topo.
    // A fileira é o que dá a leitura de "eixo" — e serve de referência de distância.
    const troncos = [], frondes = [];
    // tronco de 14 m com cor chapada também entrava no B6; triplanar em escala fina resolve
    const palmMat = triplanar(lam({ color: 0xa39d91, roughness: 0.88 }), TX_FORMA, 1.6);
    const leafMat = lam({ color: 0x3f5a2c, roughness: 0.9, side: THREE.DoubleSide });
    for (const sx of [-1, 1]) for (let i = 0; i < (DETAIL === 2 ? 7 : 4); i++) {
      const x = sx * 18, z = -52 + i * (DETAIL === 2 ? 18 : 32);
      if (!freeSpot(x, z, 1.2)) continue;
      troncos.push({ x, y: 7, z }); col(x - 0.4, x + 0.4, 0, 14, z - 0.4, z + 0.4);
      for (let f = 0; f < 6; f++) {
        const a = (f / 6) * Math.PI * 2;
        frondes.push({ x: x + Math.cos(a) * 1.5, y: 14.1, z: z + Math.sin(a) * 1.5, ry: -a, rz: 0.55 });
      }
    }
    addInst(new THREE.CylinderGeometry(0.34, 0.5, 14, 7), palmMat, troncos, { occlude: true });
    addInst(new THREE.PlaneGeometry(3.4, 0.9), leafMat, frondes, { shadow: false });

    // IPÊ-AMARELO florido (ago–set): galhos NUS cobertos de flor amarela intensa. O BAR diz
    // que é "o único ponto de cor saturada legítimo da cena" — logo, o melhor marcador de
    // affordance disponível. Vão nos chokepoints, de propósito.
    // r3 — REFEITO DE NOVO (reclamação nº 3). A r2 ainda deixava 9 ICOSAEDROS de flor por
    // árvore: sólido convexo facetado, e a 15 m ele lê como uma bola de origami amarela. Os
    // icosaedros saíram INTEIROS. A copa agora é só BILLBOARD CRUZADO com alpha: 3 alturas
    // × 3 planos a 60°, tamanho e posição sorteados por ruído determinístico e tinta
    // diferente por plano. Só o alpha dá borda esgarçada; poliedro nenhum dá.
    const ipeTr = [], ipeGalho = [], ipeFolha = [[], [], []];
    const ipeMat = lam({ color: 0x6b5a44, roughness: 0.95 });
    // ruído determinístico: cada árvore precisa ser DIFERENTE, mas igual em todo carregamento
    const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
    // a árvore de z=46 estava em x=-5, ou seja, DENTRO da lane (|x| < 6,2) — tronco no meio
    // da linha de tiro. Foi para x=-9, junto da calçada, com as outras.
    for (const [ti, [tx, tz]] of [[-11, -14], [12, 14], [-9, 46], [9, -40]].entries()) {
      if (!freeSpot(tx, tz, 2.6)) continue;
      const S0 = ti * 17.3 + 3.1;
      ipeTr.push({ x: tx, y: 2.35, z: tz, rz: (hash(S0) - 0.5) * 0.07 });
      col(tx - 0.4, tx + 0.4, 0, 5, tz - 0.4, tz + 0.4);
      for (let g = 0; g < 5; g++) {
        const a = (g / 5) * Math.PI * 2 + hash(S0 + g) * 0.8, len = 2.1 + hash(S0 + g + 40) * 1.2;
        ipeGalho.push({ x: tx + Math.cos(a) * len * 0.34, y: 4.55 + hash(S0 + g + 9) * 0.55,
          z: tz + Math.sin(a) * len * 0.34, ry: -a, rz: 0.8 + hash(S0 + g + 5) * 0.4, sy: len / 2.4 });
      }
      // 3 patamares de copa; em cada um, 3 planos cruzados a 60°. O deslocamento lateral
      // (ox/oz) por patamar é o que impede a copa de virar um cilindro simétrico.
      const tiers = LOWQ ? 2 : 3;
      for (let t = 0; t < tiers; t++) {
        const ty = 5.0 + t * 0.92, ts = 4.9 - t * 0.9;
        const ox = (hash(S0 + t + 11) - 0.5) * 1.2, oz = (hash(S0 + t + 21) - 0.5) * 1.2;
        for (let b = 0; b < 3; b++)
          ipeFolha[(t + b) % 3].push({ x: tx + ox, y: ty, z: tz + oz,
            ry: b * 1.047 + hash(S0 + t * 3 + b) * 0.5,
            sx: ts * (0.86 + hash(S0 + t + b + 31) * 0.4),
            sy: ts * 0.62 * (0.82 + hash(S0 + t + b + 41) * 0.42) });
      }
    }
    addInst(new THREE.CylinderGeometry(0.2, 0.42, 4.7, 8), ipeMat, ipeTr, { occlude: true });
    addInst(new THREE.CylinderGeometry(0.05, 0.14, 2.4, 5), ipeMat, ipeGalho, { shadow: false });
    ipeFolha.forEach((list, i) => addInst(new THREE.PlaneGeometry(1, 1), MAT.folhaIpe[i], list, { shadow: false }));

    /* ------- SINAIS DE IDADE + densidade secundária (critério D2, que estava em FAIL) ------- */
    // Brasília tem 65 anos e o mapa parecia entregue ontem. Tudo aqui é decal ou InstancedMesh:
    // não muda colisão, não muda rota de bot, e some com ?props=0.
    {
      // remendo de asfalto e mancha de óleo nas pistas do Eixo + escorrimento no piso da lane
      const decals = [];
      for (let i = 0; i < (LOWQ ? 26 : 64); i++) {
        const h = hash(i * 3.77), h2 = hash(i * 9.13 + 5), h3 = hash(i * 4.51 + 11);
        const onRoad = h3 > 0.45;
        const x = onRoad ? (h2 > 0.5 ? 1 : -1) * (ROAD_IN + h * ROAD_W) : (h - 0.5) * 20;
        const s = onRoad ? 1.6 + h2 * 3.4 : 1.0 + h2 * 2.6;
        decals.push({ x, y: onRoad ? 0.055 : 0.045, z: (h2 - 0.5) * 210, rx: -Math.PI / 2, ry: h3 * 3.1, sx: s, sy: s * (0.6 + h * 0.8) });
      }
      const manchas = addInst(new THREE.PlaneGeometry(1, 1), MAT.mancha, decals, { shadow: false });
      if (manchas) manchas.userData.nonSolidSurface = true;

      // BANCO de concreto do mobiliário urbano dos anos 60 (bloco maciço sobre dois apoios).
      // Cobertura baixa de verdade nas laterais, longe do miolo do duelo.
      const bancoT = [], bancoP = [];
      for (const [bx2, bz2] of [[8.6, 34], [-8.6, 34], [8.6, -12], [-8.6, -12], [8.6, 58], [-8.6, -58]]) {
        if (!freeSpot(bx2, bz2, 1.4)) continue;
        bancoT.push({ x: bx2, y: 0.46, z: bz2 });
        for (const d of [-0.75, 0.75]) bancoP.push({ x: bx2, y: 0.21, z: bz2 + d });
        col(bx2 - 0.32, bx2 + 0.32, 0, 0.55, bz2 - 1.1, bz2 + 1.1);
      }
      addInst(new THREE.BoxGeometry(0.58, 0.16, 2.3), MAT.guia, bancoT, { occlude: true });
      addInst(new THREE.BoxGeometry(0.44, 0.42, 0.36), MAT.concCru, bancoP, { occlude: true, shadow: false });

      // PLACA INDICATIVA OFICIAL (critério D4). Poste galvanizado + chapa verde do DNIT.
      const placas = [['ESPLANADA', -12.6, 30, 1], ['PRAÇA DOS TRÊS PODERES', 12.6, -30, -1]];
      const placaPost = [];
      for (const [txt, sx2, sz2, sg] of placas) {
        if (!freeSpot(sx2, sz2, 1)) continue;
        placaPost.push({ x: sx2, y: 1.5, z: sz2 });
        const pm = lam({ map: ctex(placaTex(txt), 1, 1), side: THREE.DoubleSide, roughness: 0.75 });
        addPlane(2.6, 0.65, pm, sx2, 2.55, sz2, sg > 0 ? Math.PI / 2 : -Math.PI / 2);
        col(sx2 - 0.12, sx2 + 0.12, 0, 3, sz2 - 0.12, sz2 + 0.12);
      }
      addInst(new THREE.CylinderGeometry(0.06, 0.08, 3, 6), MAT.aco, placaPost, { occlude: true });
    }
  }

  /* ---------------- lighting & sky ---------------- */
  // Céu do Planalto Central (BAR §4.1): azul PROFUNDO no zênite (1.172 m de altitude, ar
  // seco), clareando muito rápido perto do horizonte, e a poeira da seca deixando a faixa
  // baixa lavada e amarelada. ?sky=0 volta ao céu antigo.
  if (SKY2) {
    const c = cvs(16, 256), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.00, '#123a72');   // zênite azul profundo/escuro
    g.addColorStop(0.38, '#4d84bd');
    g.addColorStop(0.66, '#9fbdd2');   // clareia rápido
    g.addColorStop(0.86, '#d9cfae');   // poeira em suspensão — horizonte lavado amarelado
    g.addColorStop(1.00, '#c6b791');
    x.fillStyle = g; x.fillRect(0, 0, 16, 256);
    const sk = new THREE.CanvasTexture(c);
    sk.colorSpace = THREE.SRGBColorSpace;
    sk.wrapS = sk.wrapT = THREE.ClampToEdgeWrapping;
    // No browser, a placa fotográfica prolonga o cerrado e a silhueta baixa da cidade.
    // O canvas acima continua sendo fallback determinístico do harness node.
    setMapSky(scene, { sky: sk }, '/img/textures/sky_brasilia.webp', sk);
  } else scene.background = T.sky;
  // FOG: continua valendo que no Planalto o ar é seco e os primeiros metros não têm haze —
  // o que muda é a CURVA. A névoa linear (near 130 / far 360) só tinha apagado 43 % do
  // terreno no ponto em que o plano de chão de 420 × 460 m ACABA (~220 m): sobrava uma
  // aresta reta de "parede de neblina" no horizonte de awp-169-a. A FogExp2 (ρ = 0,0066)
  // vale 1,7 % a 20 m, 6,7 % a 40 m, 24 % a 80 m e 88 % a 220 m: não vela a lane e apaga a
  // borda. A cor bege fixa (0xd6ccae) era a outra metade do problema — o céu MEDIDO logo
  // acima daquela silhueta é azul-acinzentado, não poeira; agora a base é o azul medido e a
  // poeira quente aparece só de contraluz (ver AERIAL no bloom.js). ?nofog=1 / ?fog2=0.
  if (QP.get('nofog') !== '1') scene.fog = SKY2 ? makeAerialFog('praca_poderes') : new THREE.Fog(0xbfd8ee, 100, 260);
  const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.sunSprite, transparent: true, fog: false, depthWrite: false }));
  sunSpr.position.set(170, 118, -75); sunSpr.scale.setScalar(58); root.add(sunSpr);
  // Céu de seca: pouquíssima nuvem, e alta/rala. Nuvem gorda de verão mata a leitura.
  const cloudSet = SKY2 ? [[-120, 130, -190, 90], [90, 142, -210, 104]]
    : [[-90, 80, -130, 60], [50, 88, -160, 74], [130, 72, 70, 64], [-120, 82, 100, 68]];
  for (const [cx, cy, cz, cs] of cloudSet) {
    const cl = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.cloud, transparent: true, fog: false, depthWrite: false, opacity: SKY2 ? 0.5 : 0.9 }));
    cl.position.set(cx, cy, cz); cl.scale.set(cs, cs * (SKY2 ? 0.24 : 0.42), 1); root.add(cl);
  }
  // LUZ DURA DO PLANALTO: ambiente baixo (ar seco espalha pouco → sombra FUNDA), sol forte
  // e quente-neutro, e sobretudo penumbra ESTREITA (radius 3 -> 1). O sol fica a ~33° de
  // elevação: sombra longa (≈1,6× a altura) atravessando a lane, que é o que dá volume ao
  // vazio da praça. O env map (IBL, do agente de gráficos) preenche o resto do ambiente.
  const hemi = new THREE.HemisphereLight(0xbdd8f5, SKY2 ? 0xa08a5c : 0x8a7f63, SKY2 ? 0.52 : 0.48);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(SKY2 ? 0xfff4e2 : 0xfff1d8, SKY2 ? 3.1 : 2.5);
  if (SKY2) sun.position.set(90, 62, -40); else sun.position.set(38, 58, -14);
  sun.castShadow = true;
  const SM = LOWQ ? 1024 : 2048;
  sun.shadow.mapSize.set(SM, SM);
  // A escala nova (mastro 100 m, Congresso 55 m) exige um frustum de sombra maior, senão
  // o mastro e os ministérios sombreiam fora do mapa e aparecem "recortados".
  const SE = BIG ? 110 : 80;
  sun.shadow.camera.left = -SE; sun.shadow.camera.right = SE;
  sun.shadow.camera.top = SE; sun.shadow.camera.bottom = -SE;
  sun.shadow.camera.far = BIG ? 420 : 220; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.035;
  sun.shadow.radius = SKY2 ? 1 : 3;   // sol duro do cerrado = penumbra estreita
  scene.add(sun);
  // Rebote: no cerrado seco o rebote dominante vem do CHÃO (palha/laterita), não do céu.
  const fill = new THREE.DirectionalLight(SKY2 ? 0xd8c9a3 : 0xaecbe8, SKY2 ? 0.42 : 0.38);
  fill.position.set(-32, 22, 28); scene.add(fill);

  /* ---------------- ground height (flat) ---------------- */
  function groundHeightAt() { return 0; }

  /* ---------------- waypoints graph ---------------- */
  const nodes = [], adj = [];
  const STEP = 4.4;
  const blocked = (x, z, inflate) => {
    for (const c of colliders) {
      if (x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate &&
          c.minY < 1.6 && c.maxY > 0.15) {
        // colisor girado: a AABB acima é só a rejeição barata — quem decide é o eixo do prop,
        // senão o A* continua contornando o ar das quinas que o `_collide` já deixa passar.
        if (c.ry && foraDaCaixaGirada(c, x, z, inflate)) continue;
        return true;
      }
    }
    return false;
  };
  // Folga = raio do bot (0.38) + margem. Antes o grafo usava 0.5/0.25 (< raio do bot), então
  // os caminhos passavam por frestas estreitas demais entre os props e o bot ENCALHAVA perto
  // do spawn (nunca cruzava). Agora nós e arestas respeitam a largura do bot -> rotas pelas
  // faixas abertas de verdade.
  const BOTR = 0.55;
  // A grade agora cobre TAMBÉM a passagem sob os pilotis dos ministérios: o mapa era um
  // corredor reto único (crítica: "não há rota flanqueadora"). Com os blocos vazados por
  // baixo existe uma rota lateral coberta dos dois lados, e o A* passa a usá-la.
  const FLANK_X = BIG ? Math.min(44, LANE_HX + MW - 1.5) : 22;
  for (let gx = -FLANK_X; gx <= FLANK_X; gx += STEP)
    for (let gz = -60; gz <= 60; gz += STEP)   // grade de waypoints estendida p/ o mapa longo
      if (!blocked(gx, gz, BOTR + 0.15)) nodes.push({ x: gx, z: gz });
  const segClear = (a, b) => {
    const dist = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.max(5, Math.ceil(dist / 0.9));
    for (let i = 1; i < steps; i++) {
      const t = i / steps, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      if (blocked(x, z, BOTR)) return false;   // corredor com largura do bot
    }
    return true;
  };
  // Arestas simétricas testadas UMA vez (j > i): com a grade maior + os colliders dos pilares
  // o build do grafo dobrou de custo, e isso corta metade dos segClear sem mudar o resultado.
  for (let i = 0; i < nodes.length; i++) adj.push([]);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z;
      if (dx * dx + dz * dz < STEP * STEP * 2.2 && segClear(nodes[i], nodes[j])) { adj[i].push(j); adj[j].push(i); }
    }
  }
  function nearestWaypoint(x, z) {
    let best = 0, bd = 1e9;
    for (let i = 0; i < nodes.length; i++) {
      const dx = nodes[i].x - x, dz = nodes[i].z - z, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  // A* com custo EUCLIDIANO. Antes era BFS por nº de saltos: com arestas diagonais, o
  // "menor nº de saltos" preferia passos diagonais e escolhia um caminho ERRANTE — uma viagem
  // reta pela direita (x=9, z 59->-29) voltava zigue-zagueando até x=-13 e voltava, funilando
  // TODOS os bots pelo centro-esquerda (a dor "time-e esquerda / time-b direita"). A*
  // por distância devolve o caminho geometricamente mais curto -> desce reto pela coluna.
  const D = (a, b) => { const dx = nodes[a].x - nodes[b].x, dz = nodes[a].z - nodes[b].z; return Math.sqrt(dx * dx + dz * dz); };
  function findPath(fromIdx, toIdx) {
    if (fromIdx === toIdx) return [toIdx];
    const n = nodes.length;
    const g = new Float32Array(n).fill(Infinity);
    const f = new Float32Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1);
    const open = new Uint8Array(n);
    g[fromIdx] = 0; f[fromIdx] = D(fromIdx, toIdx); open[fromIdx] = 1;
    let openCount = 1;
    while (openCount > 0) {
      let cur = -1, bf = Infinity;                       // grafo pequeno (~centenas): scan linear
      for (let i = 0; i < n; i++) if (open[i] && f[i] < bf) { bf = f[i]; cur = i; }
      if (cur === -1) break;
      if (cur === toIdx) {
        const path = [cur]; let c = prev[cur];
        while (c !== -1) { path.unshift(c); c = prev[c]; }
        return path;
      }
      open[cur] = 0; openCount--;
      for (const m of adj[cur]) {
        const t = g[cur] + D(cur, m);
        if (t < g[m]) { prev[m] = cur; g[m] = t; f[m] = t + D(m, toIdx); if (!open[m]) { open[m] = 1; openCount++; } }
      }
    }
    return [fromIdx];
  }

  /* ---------------- spawns ---------------- */
  const mk = s => [-9, -3, 3, 9].map(x => ({ x, z: 62 * s, yaw: s < 0 ? Math.PI : 0 }));   // spawns recuados (43->62) p/ longe da 1ª área
  // Time B start at the Cathedral (south) end, Time E at the Congresso (north)
  // end — swapped per request.
  const spawns = { B: mk(-1), E: mk(1) };

  // saia de contato: TODAS as bases registradas viram UMA malha mesclada = 1 draw call
  SKIRT.build(root);

  /* ═══ PASSADA DE GRAFITE (07/08) ══════════════════════════════════════════
     Este mapa tinha ZERO arte na tela. As 16 peças das empenas dos ministérios são
     coladas com `paredeAtras`, que mede contra a MALHA — e o ministério é um bloco
     sobre PILOTIS, com o térreo vazado: as 16 nasciam no ar e passaram a ser todas
     reprovadas, corretamente. Resultado medido pela `graffiti-census`: 0 de 425
     placas pintadas. O dono pediu ~60% aqui — é cidade oficial pichada, não quebrada.

     A passada mira dos waypoints, então quem recebe tinta é o que dá pra ver andando:
     muro de contenção, empena de bloco, barreira, ônibus queimado, tapume de obra.
     Pool com peso em PROTESTO (lambe, stencil, cartaz), que é a escrita real desta
     praça — tag de bairro em Brasília leria como outro mapa. */
  grafitar({
    id: 'praca_poderes',
    root, T, waypoints: nodes, seed: 3311, passo: 1.1, alcance: 9, cobre: 0.06, minLarg: 0.35,
    bandas: [
      /* CARTAZ DA COLEÇÃO (07/08). Reprovação: "tem diversos posters da minha coleção
         e tb que vc gerou que não estão em nenhum mapa". Eram 30 arquivos vivendo em
         2 dos 5 mapas, e mesmo nesses só ~6 entravam por rodada (a vaga era fixa).
         Aqui eles entram como lambe-lambe: banda do olho, tamanho de papel colado, e
         `chance` baixa de propósito — cartaz é tempero, parede de cartaz vira outdoor. */
      { y0: 0.4, y1: 2.6, larg: 1.9, alturas: [1.5, 1.15, 0.85], chance: 30, fonte: 'poster',
        pool: (T.posterFiles || []).map((_, i) => i) },
      { y0: 0.35, y1: 2.6, larg: 3.8, alturas: [2.1, 1.6, 1.15, 0.85],
        pool: POOLS.D_LAMBE.concat(POOLS.D_TAG, POOLS.D_MURAL) },
      { y0: 2.5, y1: 5.0, larg: 5.0, alturas: [2.3, 1.7, 1.2], chance: 82,
        pool: POOLS.D_MURAL.concat(POOLS.D_LAMBE) },
      { y0: 0.35, y1: 3.0, larg: 1.7, alturas: [0.9, 0.65, 0.45], planura: 0.5, chance: 70,
        pool: POOLS.D_TAG },
    ],
    murais: { texturas: T.muraisHom, nomes: T.muraisHomNomes, seed: 17, separacao: 13, larg: 4.0, alt: 2.1, minLarg: 2.2 },
  });

  /* BUG-57: a Praça é DOS POMBOS — fauna ancorada na esplanada aberta (0,0). */
  const ambience = createFavelaAmbience(root, {
    map: 'praca_poderes',
    rats: [
      { pos: [-18, 0, -30], to: [-15.5, 0, -27], phase: .3 },
      { pos: [17, 0, 24], to: [14.5, 0, 27], phase: 1.7 },
    ],
    pigeons: [
      { mode: 'ground', pos: [-4, 0, -8], phase: .2 }, { mode: 'ground', pos: [11, 0, -6], phase: 1.1 },
      { mode: 'ground', pos: [-2, 0, 10], phase: 2.0 }, { mode: 'ground', pos: [8, 0, 16], phase: 2.9 },
      { mode: 'ground', pos: [-2.8, 0, 1], phase: .6 }, { mode: 'ground', pos: [9.5, 0, 17], phase: 2.4 },
    ],
    /* vida 1: tatu no gramado do eixo — cerrado de Brasília (fauna 2) */
    armadillos: [
      { pos: [-8, 0, 2], to: [-5, 0, 5], phase: 1.3 }, { pos: [13, 0, -14], to: [10, 0, -11], phase: 2.8 },
    ],
  });

  return {
    ambience,sound:{loops:[{src:AMB_LOOPS.vento,pos:[0,3,0],radius:85,vol:.28},{src:AMB_LOOPS.passaros,pos:[0,3,0],radius:85,vol:.22}],bioma:'campo'},
    root, colliders, occluders, groundHeightAt, spawns, sun, hemi,
    /* BANDEIRAS DO CTF — DECLARADAS PELO MAPA (06/08). Os nomes CONGRESSO/ÔNIBUS/CATEDRAL
       moravam no fallback do game.js e vazavam pra QUALQUER mapa sem declaração — o dono
       viu "CONGRESSO" jogando na piscina. Agora o nome mora onde o monumento mora.
       Posições = as mesmas do fallback antigo (spawn×0,42 e o ônibus): zero mudança de
       gameplay. P nasce no norte (Congresso), B no sul (Catedral) — ver spawns acima. */
    ctfPoints: [
      { id: 'E', label: 'CONGRESSO', x: -3.78, z: 26.04 },
      { id: 'MID', label: 'ÔNIBUS', x: 2.5, z: 2.5 },
      { id: 'B', label: 'CATEDRAL', x: -3.78, z: -26.04 },
    ],
    /* DECLARAÇÃO PRA RÉGUA (tools/eval/decal-probe.mjs): é a MESMA coisa contra a qual o
       `paredeAtras` validou cada decalque — a malha desenhada. Era `colliders + empenas`,
       e essa lista era justamente a mentira que deixou 16 peças nascerem no vão do piloti. */
    decalSolids: [root],
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    // bounds abertos até a face externa dos ministérios: sem isso o jogador é empurrado
    // pra fora da rota de flanco sob os pilotis que acabamos de abrir.
    // maxZ 76 -> 84: o limite invisível caía a ~15 m ANTES do espelho d'água, e era ele que
    // o dono sentia como "não dá pra andar na água". Agora quem para o jogador é o parapeito
    // de granito do espelho (geometria que ele VÊ), e o limite invisível fica atrás dela.
    bounds: { minX: -(FLANK_X + 1.5), maxX: FLANK_X + 1.5, minZ: -76, maxZ: BIG ? 84 : 76 },
  };
}
