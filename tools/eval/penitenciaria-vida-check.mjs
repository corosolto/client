/* ============================================================================
   penitenciaria-vida-check.mjs — A PENITENCIÁRIA NÃO PODE PARECER LOW POLY
   (frente USANTOS, mapa 2).
   ----------------------------------------------------------------------------
   POR QUE EXISTE — frase do dono, 25/08/2026, com estas palavras:
     "Os mapas do usantos são os mais low poly do jogo. A ideia é os mapas não
      parecerem low poly."
   Irmã da parque-vida-check (mesma frente, mesmo padrão de mutantes). O que a
   penitenciária ATUAL entrega, medido neste commit pelo próprio harness:
   1.167 meshes (432 deles são torus clonados de arame farpado), 5 texturas
   de canvas distintas, muros de concreto chapado, guaritas sem holofote,
   celas-caixa sem varanda e nenhum céu/LOOK próprio. Esta régua congela o
   que a reconstrução entrega.

   O QUE ELA MEDE (no MESMO mundo do jogo: build real via harness, node puro)
     NV1  reboco descascado NOS MUROS: os meshes com collider tag 'muro-*'
          carregam material.map nomeado 'penitenciaria-reboco*' E a textura é
          medida de verdade — tem que ser DataTexture (canvas é stub em node:
          lição 3/5, a régua não pode medir outro mundo). Sobre os pixels:
          desvio-padrão de luminância ≥ 14 (reboco creme × concreto/tijolo
          exposto = dois estados, não gradiente suave), ≥ 20 baldes de cor
          distintos (ruído+fiadas) e diferença de luminância entre as faixas
          de topo e base ≥ 8 (umidade na base). Limiares: 2/3 dos valores
          medidos na textura gerada (ver comentário na cláusula).
     NV2  holofotes que VARREM: 4 objetos 'penitenciaria-holofote-*' e
          world.update(dt,t) exportado; entre dois updates com t distante a
          assinatura de varredura (posição do target do spot/rotação do cone)
          muda nos 4. Holofote parado é decoração, não holofote.
     NV3  varandas de cela: ≥ 2 grupos 'penitenciaria-varanda-*' (uma por ala)
          com guarda-corpo nomeado dentro ('*-guarda-corpo').
     NV4  arame contínuo: meshes 'penitenciaria-arame-*' entre 1 e 6 por lado
          cobrindo os 4 lados (hélice única por lado = 4; o estado antigo são
          432 torus soltos sem nome — reprova pelos dois lados: zero nomeados
          E nenhuma geometria contínua).
     NV5  horizonte próprio: scene.userData.skyUrl gravado pelo applyLook/
          setMapSky (a régua lê o USO — BUG-02) E LOOK.penitenciaria em
          public/js/look.js.
     NV6  riqueza de superfície: ≥ 12 material.map.name distintos na cena.
          Medido no estado atual: 5 (penitenciaria-aco-enferrujado,
          -caixa-municao, -concreto, -concreto-escuro, -patio-concreto-gasto).
          O rebuild adiciona reboco, galvanizado, arame, grade, poça e pisos.

   FALHA = NÃO SABER MEDIR (lição 5): build que lança, textura de muro sem
   pixels legíveis em node ou update ausente reprovam com mensagem de conserto.

   USO
     node tools/eval/penitenciaria-vida-check.mjs
     node tools/eval/penitenciaria-vida-check.mjs --mutante=sem-reboco      # NV1
     node tools/eval/penitenciaria-vida-check.mjs --mutante=holofote-parado # NV2
     node tools/eval/penitenciaria-vida-check.mjs --mutante=sem-varanda     # NV3
   ============================================================================ */
import { THREE, MAPS, initTextures } from './harness.mjs';
import { LOOK } from '../../public/js/look.js';

const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
const conhecidos = new Set(['sem-reboco', 'holofote-parado', 'sem-varanda']);
if (MUTANTE && !conhecidos.has(MUTANTE)) throw new Error(`mutante desconhecido: ${MUTANTE}`);

const MIN_TEXTURAS = 12;

const T = await initTextures();
const scene = new THREE.Scene();
let W = null, erroBuild = null;
try { W = MAPS.penitenciaria.build(scene, T); } catch (e) { erroBuild = String(e?.message || e); }

const clausulas = [];
const put = (id, ok, msg) => { clausulas.push({ id, ok, msg }); console.log(`  ${id} ${ok ? 'PASSA' : 'FALHA'} — ${msg}`); };

if (erroBuild || !W?.root) {
  put('NV0', false, `não sei medir: build da penitenciária ${erroBuild ? `lançou "${erroBuild}"` : 'devolveu mundo sem root'} — conserte o build antes da régua`);
  console.log('\nPENITENCIARIA-VIDA VERMELHA · mundo não medível');
  process.exit(1);
}

/* ---- mutantes (aplicam DE VERDADE ou morrem — lição 8) ---- */
let mutanteAplicou = null;
if (MUTANTE === 'sem-reboco') {
  let n = 0;
  W.root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m?.map?.name?.startsWith('penitenciaria-reboco')) { m.map = null; n++; }
    }
  });
  mutanteAplicou = n > 0;
} else if (MUTANTE === 'holofote-parado') {
  mutanteAplicou = typeof W.update === 'function';
  if (mutanteAplicou) W.update = () => {};
} else if (MUTANTE === 'sem-varanda') {
  const alvos = [];
  W.root.traverse((o) => { if (o.name?.startsWith('penitenciaria-varanda-')) alvos.push(o); });
  mutanteAplicou = alvos.length > 0;
  for (const o of alvos) o.parent.remove(o);
}
if (MUTANTE && !mutanteAplicou) {
  console.error(`MUTANTE NÃO APLICOU: ${MUTANTE} — a régua não mede o que o mutante quebra`);
  process.exit(1);
}

/* ---- NV1 reboco descascado nos muros ---- */
{
  const muros = [];
  W.root.traverse((o) => { if (o.isMesh && o.userData?.collider?.tag?.startsWith('muro-')) muros.push(o); });
  const comReboco = muros.filter((o) => {
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    return mats.some((m) => m?.map?.name?.startsWith('penitenciaria-reboco'));
  });
  const tex = comReboco.length
    ? (Array.isArray(comReboco[0].material) ? comReboco[0].material : [comReboco[0].material])
      .find((m) => m?.map?.name?.startsWith('penitenciaria-reboco'))?.map
    : null;
  const data = tex?.image?.data;
  if (!muros.length) {
    put('NV1', false, 'não sei medir: nenhum mesh com collider tag muro-* — o PEN1 cobre os muros?');
  } else if (!comReboco.length) {
    put('NV1', false, `${muros.length} muros sem textura 'penitenciaria-reboco*' — concreto chapado é a cara low poly que o dono nomeou; gere o reboco descascado (DataTexture, idioma texProcedural da mansão)`);
  } else if (!data || !data.length) {
    put('NV1', false, 'não sei medir: a textura de reboco não expõe pixels em node (canvas é stub — lição 3). Use DataTexture pixel-a-pixel, como o texProcedural da mansão');
  } else {
    const n = data.length / 4;
    let soma = 0, soma2 = 0, cnt = 0, somaTopo = 0, cntTopo = 0, somaBase = 0, cntBase = 0;
    const baldes = new Set();
    const altura = tex.image.height || 1;
    for (let i = 0; i < n; i += 7) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      soma += lum; soma2 += lum * lum; cnt++;
      baldes.add((r >> 4) << 8 | (g >> 4) << 4 | b >> 4);
      const y = Math.floor(i / (tex.image.width || 1));
      if (y < altura * 0.15) { somaBase += lum; cntBase++; }
      else if (y > altura * 0.85) { somaTopo += lum; cntTopo++; }
    }
    const media = soma / cnt;
    const desvio = Math.sqrt(Math.max(0, soma2 / cnt - media * media));
    const gradiente = Math.abs(somaTopo / cntTopo - somaBase / cntBase);
    /* medido na textura gerada (rebuild): desvio ≈ 24, baldes ≈ 41, gradiente ≈ 22
       (reboco creme 205 × concreto 145 × tijolo 120 × umidade −30 % na base).
       Limiares em ~60 % do medido: ajuste de paleta passa, reboco chapado não. */
    const falta = [];
    if (desvio < 14) falta.push(`desvio de luminância ${desvio.toFixed(1)}/14 (reboco × substrato exposto = dois estados; chapado não descasca)`);
    if (baldes.size < 20) falta.push(`${baldes.size}/20 baldes de cor (fiadas + nuance + mancha)`);
    if (gradiente < 8) falta.push(`gradiente topo↔base ${gradiente.toFixed(1)}/8 (umidade na base)`);
    put('NV1', !falta.length, falta.length
      ? falta.join(' · ')
      : `${comReboco.length}/${muros.length} muros com reboco medido: desvio ${desvio.toFixed(1)} · ${baldes.size} cores · gradiente ${gradiente.toFixed(1)}`);
  }
}

/* ---- NV2 holofotes que varrem ---- */
{
  const holofotes = [];
  W.root.traverse((o) => { if (o.name?.startsWith('penitenciaria-holofote-')) holofotes.push(o); });
  if (holofotes.length !== 4) {
    put('NV2', false, `${holofotes.length}/4 'penitenciaria-holofote-*' — cada guarita ganha um holofote que varre o pátio`);
  } else if (typeof W.update !== 'function') {
    put('NV2', false, 'não sei medir: o mapa não exporta update(dt, time) — o game.js chama world.update se existir (game.js:7218); exporte-o com a varredura');
  } else {
    const assinatura = () => holofotes.map((h) => {
      const v = [];
      h.traverse((o) => { v.push(o.position.toArray(), o.rotation.toArray().slice(0, 3), o.quaternion.toArray()); });
      return JSON.stringify(v);
    });
    const antes = assinatura();
    W.update(0.1, 3.0); W.update(0.1, 3.5); W.update(0.1, 11.0);
    const depois = assinatura();
    const parados = holofotes.filter((_, i) => antes[i] === depois[i]).length;
    put('NV2', parados === 0, parados
      ? `${parados}/4 holofotes PARADOS entre update(t=3) e update(t=11) — holofote fixo é luminária; varra o pátio LENTO no update`
      : '4 holofotes varrem entre update(t=3) e update(t=11)');
  }
}

/* ---- NV3 varandas de cela ---- */
{
  const varandas = [];
  W.root.traverse((o) => { if (o.name?.startsWith('penitenciaria-varanda-')) varandas.push(o); });
  const comGuarda = varandas.filter((v) => {
    let ok = false;
    v.traverse((o) => { if (o.name?.includes('guarda-corpo')) ok = true; });
    return ok;
  });
  put('NV3', varandas.length >= 2 && comGuarda.length >= 2, varandas.length >= 2 && comGuarda.length >= 2
    ? `${varandas.length} varandas com guarda-corpo (duas alas)`
    : `${varandas.length}/2 varandas, ${comGuarda.length}/2 com guarda-corpo — o 1º pavimento das duas alas ganha passarela metálica 'penitenciaria-varanda-*' com '*-guarda-corpo'`);
}

/* ---- NV4 arame contínuo ---- */
{
  const arames = [];
  W.root.traverse((o) => { if (o.isMesh && o.name?.startsWith('penitenciaria-arame-')) arames.push(o); });
  const lados = new Set(arames.map((a) => {
    const p = new THREE.Vector3(); a.getWorldPosition(p);
    const cands = [['sul', Math.abs(p.z + 48)], ['norte', Math.abs(p.z - 48)], ['oeste', Math.abs(p.x + 38)], ['leste', Math.abs(p.x - 38)]];
    cands.sort((x, y) => x[1] - y[1]);
    return cands[0][1] < 6 ? cands[0][0] : `solto(${p.x.toFixed(0)},${p.z.toFixed(0)})`;
  }));
  const falta = [];
  if (!arames.length) falta.push('nenhum mesh penitenciaria-arame-* — o arame atual são centenas de torus clonados sem nome: refaça como hélice contínua (TubeGeometry) nomeada por lado');
  else {
    if (arames.length > 24) falta.push(`${arames.length} meshes de arame (teto 24 = 6/lado) — hélice contínua, não torus soltos`);
    if (lados.size < 4) falta.push(`arame em ${lados.size}/4 lados (${[...lados].join(', ')})`);
  }
  put('NV4', !falta.length, falta.length ? falta.join(' · ') : `${arames.length} meshes de arame cobrindo 4 lados`);
}

/* ---- NV5 horizonte próprio ---- */
{
  const sky = scene.userData.skyUrl;
  const look = LOOK.penitenciaria;
  const falta = [];
  if (!sky) falta.push('scene.userData.skyUrl ausente (o mapa não passou pelo applyLook/setMapSky)');
  if (!look) falta.push('LOOK.penitenciaria ausente em public/js/look.js (APPEND na tabela)');
  put('NV5', !falta.length, falta.length ? falta.join(' · ') : `sky ${sky} · LOOK.penitenciaria ok`);
}

/* ---- NV6 riqueza de superfície ---- */
{
  const nomes = new Set();
  W.root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m?.map?.name) nomes.add(m.map.name);
  });
  put('NV6', nomes.size >= MIN_TEXTURAS, nomes.size >= MIN_TEXTURAS
    ? `${nomes.size} texturas distintas em uso`
    : `${nomes.size}/${MIN_TEXTURAS} texturas distintas (${[...nomes].sort().join(', ') || 'nenhuma'}) — 5 canvas repetidos é a cara low poly; crie superfícies novas (reboco, galvanizado, arame, grade, poça…)`);
}

/* ---- placar e veredito dos mutantes ---- */
const vermelhas = clausulas.filter((c) => !c.ok);
const ALVO = { 'sem-reboco': 'NV1', 'holofote-parado': 'NV2', 'sem-varanda': 'NV3' };
if (MUTANTE) {
  const esperado = ALVO[MUTANTE];
  const acertou = vermelhas.some((c) => c.id === esperado);
  const colaterais = vermelhas.filter((c) => c.id !== esperado).map((c) => c.id);
  if (!acertou) { console.error(`\nMUTANTE SOBREVIVEU: ${MUTANTE} não acendeu ${esperado}`); process.exit(1); }
  if (colaterais.length) { console.error(`\nMUTANTE ${MUTANTE} acendeu cláusulas colaterais: ${colaterais.join(', ')}`); process.exit(1); }
  console.log(`\nMUTANTE MORDIDO: ${MUTANTE} -> ${esperado}`);
  process.exit(0);
}
console.log(`\nPENITENCIARIA-VIDA ${vermelhas.length ? `VERMELHA · ${vermelhas.map((c) => c.id).join(', ')}` : 'ok · NV1-NV6'}`);
process.exit(vermelhas.length ? 1 : 0);
