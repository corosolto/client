/* ============================================================================
   vm-reguas.mjs — AS CINCO RÉGUAS DE IMAGEM DO VIEWMODEL (revisão L1, 23/09)
   ----------------------------------------------------------------------------
   POR QUE EXISTE: o crítico cego reprovou 10/10 armas da revisão L1 com todos
   os portões verdes. Cada régua aqui cobre um defeito que o crítico nomeou e
   que um portão existente dizia estar certo:
     mira         AD1 do eval:vm-ads mede o socket `sight` que o ADS automático
                  leva ao centro (tautologia): md97/m92/mp5/akm 0,000 com a mira
                  40–90 px fora. Aqui: o aparelho de pontaria VISTO na imagem.
     cobertura    vm-frame mede diagonal de vértice: shotgun 1,001 com a arma a
                  ~160% da AK na tela; akm 0,50×. Aqui: área renderizada.
     pistola-ref  vm-frame compara revólver com a AK (1,109, "dentro"); o crítico
                  viu 60% da pistola. Aqui: curtas contra a PT-38 aprovada.
     maos         nenhuma régua media a mão de apoio encostando na arma (m92:
                  "mão fechada no ar abaixo do guarda-mão").
     carregador   nenhuma régua seguia a peça do carregador na recarga (p90
                  "nunca aparece na mão", uzi "bastão solto", sks "clipe no ar").
   Toda medida sai do quadro que o jogo acabou de desenhar (vm-palco.mjs).
   Limiares: vm-limiares.mjs (compartilhados com o crítico).
   ============================================================================ */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import * as P from './vm-palco.mjs';
import * as A from './vm-analise.mjs';
import * as L from './vm-limiares.mjs';
import { aplicarVariante } from './vm-variante.mjs';

const ROOT = process.cwd();
const { WEAPONS } = await import(pathToFileURL(path.join(ROOT, 'public/js/data/weapons.js')).href);
const { VM_WEAPON } = await import(pathToFileURL(path.join(ROOT, 'public/js/data/vmconfig.js')).href);
const { weaponCFG } = await import(pathToFileURL(path.join(ROOT, 'public/js/weapons.js')).href);

export const TODAS = Object.keys(WEAPONS);   // 26, com a faca
export const CURTAS = ['pistol', 'deagle', 'revolver38'];
export const COMPACTAS = ['mp5', 'uzi', 'p90'];

export function classe(arma) {
  if (arma === 'knife') return 'faca';
  if (CURTAS.includes(arma)) return 'curta';
  if (arma === 'lmg') return 'lmg';
  if (COMPACTAS.includes(arma)) return 'compacta';
  return 'longa';
}
const luneta = (arma) => Boolean(WEAPONS[arma]?.scope);
const rigDe = (arma) => (VM_WEAPON[arma]?.golden ? 'metarig' : 'k');

// Peça do carregador por arma (nome de malha ou osso do produto K, 23/09).
export const CARREGADOR_PECA = {
  ak: { malhas: 'magazine' },
  m4: { malhas: '_MAG$' }, md97: { malhas: '_MAG$' }, scar: { malhas: '_MAG$' }, famas: { malhas: '_MAG$' },
  tavor: { malhas: '_MAG$' }, m92: { malhas: '_MAG$' }, akm: { malhas: '_MAG$' }, g3: { malhas: '_MAG$' },
  awp: { malhas: '_MAG$' }, m400: { malhas: '_MAG$' }, g3sg1: { malhas: '^MINT_MAG_G3SG1$' },
  mp5: { malhas: 'MAG_MP5$' }, uzi: { malhas: 'MAG_UZI$' }, p90: { malhas: 'MAG_P90$' },
  deagle: { osso: 'Mag' }, pistol: { osso: 'Mag' }, svd: { osso: 'Mag' },
  // clipe-pente (stripper): só aparece na recarga; escondido em repouso é legítimo.
  sks: { malhas: 'Clip', clipe: true }, mosin: { malhas: 'Clip', clipe: true }, rem700: { malhas: 'Clip', clipe: true },
  shotgun: { osso: 'MINT_AMMO_SHOTGUN_GAUGE', clipe: true },
};
const CARREGADOR_NA = {
  knife: 'faca: sem carregador',
  revolver38: 'cilindro: tambor e cartuchos são do eval:vm-pistol-revolver',
  carbine: 'alavanca com cartucho solto pela janela: sem peça de carregador no produto',
  lmg: 'fita/caixa: eval:vm-lmg-final (tampa/caixa/fita)',
};

/* ---------------------------------------------------------------------------
   COLETA: tudo que as cinco réguas leem de UMA arma, numa passada do jogo.
   `mut` = mutante ativo ({ regua, arma, fase, aplicar }) ou null.
   --------------------------------------------------------------------------- */
export async function coletar(page, arma, { reguas, mut = null, fotos = '', variante = null } = {}) {
  const c = { arma, classe: classe(arma) };
  if (arma === 'knife') return c;
  const quer = (r) => reguas.includes(r);
  const mutAqui = (fase) => (mut && mut.arma === arma && mut.fase === fase ? mut : null);
  const aplicar = async (fase) => {
    const m = mutAqui(fase);
    if (!m) return;
    const prova = await m.aplicar(page, arma);
    if (!prova?.aplicou) throw new Error(`MUTANTE NAO APLICOU: ${m.nome} (${JSON.stringify(prova)})`);
    c.mutante = { nome: m.nome, prova };
  };
  await P.equipar(page, arma);
  await P.segurar(page, true);
  if (variante?.[arma]) c.variante = await aplicarVariante(page, arma, variante[arma]);
  await P.esperarQuadro(page);
  await aplicar('idle');
  if (quer('cobertura') || quer('pistola-ref')) {
    const m = await P.mascara(page, arma, { profundidade: true, normais: true });
    c.quadril = A.silhueta(m);
    c.quadril.rolagem = A.rolagem(m)?.graus ?? null;
    c.quadril.cruz = pixelsNaCruz(m);
    c.quadril.olho = await olhoNaArma(page, arma, m);
    c.quadril.eixo = A.eixoNaTela(m);
    if (fotos) {
      P.salvarMascaraPng(m, path.join(fotos, `${arma}-quadril-mascara.png`), [{ x: m.w / 2, y: m.h / 2, r: 12 }]);
      await page.screenshot({ path: path.join(fotos, `${arma}-quadril.png`) });
    }
  }
  if (quer('maos') && !CURTAS.includes(arma) && arma !== 'uzi') {
    c.maos = await P.contatoMao(page, arma, { lado: 'l', rig: rigDe(arma) });
  }
  if (quer('mira') || quer('cobertura') || quer('pistola-ref')) {
    await aplicar('antesAds');
    const semAds = mut?.nome === 'sem-ads' && mut.arma === arma;
    const est = semAds ? { scoped: false, ads: 0 } : await P.entrarAds(page);
    if (semAds) await P.esperarQuadro(page);
    await aplicar('ads');
    const m = await P.mascara(page, arma, { profundidade: quer('mira') });
    c.ads = { ...A.silhueta(m), scoped: est.scoped, adsF: est.ads };
    if (quer('mira')) {
      c.mira = m.nArma > 0 ? A.pontoDeMira(m) : { mensuravel: false, motivo: 'viewmodel some no ADS', semVm: true };
      // O que o AD1 antigo leria no mesmo quadro: projeção do socket `sight`.
      c.mira.socketNdc = await page.evaluate((x) => {
        const g = window.__game; const e = window.__authoredVm.entry(x); const s = e?.sockets?.sight;
        if (!s) return null; s.updateWorldMatrix(true, false);
        const p = s.getWorldPosition(e.scene.position.clone()).project(g.vmCamera); return [p.x, p.y];
      }, arma);
      c.mira.escala = m.w / L.LARGURA_REF;
      c.mira.eixo = m.nArma > 0 ? A.eixoNaTela(m) : null;
    }
    if (fotos) {
      const mk = [{ x: m.w / 2, y: m.h / 2, r: 12 }];
      if (c.mira?.ponto) mk.push({ x: c.mira.ponto.x, y: c.mira.ponto.y, r: 8, cor: [0, 200, 255] });
      P.salvarMascaraPng(m, path.join(fotos, `${arma}-ads-mascara.png`), mk);
      await page.screenshot({ path: path.join(fotos, `${arma}-ads.png`) });
    }
    if (!semAds) await P.sairAds(page);
  }
  if (quer('carregador') && CARREGADOR_PECA[arma]) c.carregador = await coletarCarregador(page, arma, aplicar);
  return c;
}

// Pixels da peça que APARECEM no quadro (tapados por mão/arma não contam). Peça
// definida por osso numa malha única não se separa na máscara: vale o centro
// dentro do quadro.
async function pixelsDaPeca(page, arma, spec, r) {
  if (!r.visivel) return 0;
  if (!spec.malhas) return r.ndc && Math.abs(r.ndc[0]) < 1 && Math.abs(r.ndc[1]) < 1 ? Infinity : 0;
  const conta = (m) => { let n = 0; for (const v of m.px) if (v === 3) n++; return n; };
  // `so` = a peça sozinha no quadro (sem nada na frente): o denominador do "toco".
  r.pxSo = conta(await P.mascara(page, arma, { destaque: spec.malhas, soDestaque: true }));
  return conta(await P.mascara(page, arma, { destaque: spec.malhas }));
}

// Distância do olho à parte MAIS PERTO da arma que aparece (percentil 2 da
// profundidade), em palmas. Câmera dentro da arma = número pequeno.
async function olhoNaArma(page, arma, m) {
  const palma = await page.evaluate((x) => {
    const e = window.__authoredVm.entry(x);
    const a = e.scene.getObjectByName('hand_l') || e.scene.getObjectByName('handL_metarig');
    const b = e.scene.getObjectByName('middle_01_l') || e.scene.getObjectByName('f_middle01L_metarig');
    return a && b ? a.getWorldPosition(a.position.clone()).distanceTo(b.getWorldPosition(b.position.clone())) : null;
  }, arma);
  if (!palma) return null;
  const ds = [];
  for (let i = 0; i < m.px.length; i++) if ((m.px[i] === 1 || m.px[i] === 3) && m.prof[i]) ds.push(m.prof[i]);
  if (!ds.length) return null;
  ds.sort((a, b) => a - b);
  return ds[Math.floor(ds.length * 0.02)] / 1000 / palma;
}

function pixelsNaCruz(m) {
  const r = Math.round(L.COBERTURA_CRUZ_RAIO * m.w);
  const cx = m.w / 2; const cy = m.h / 2;
  let n = 0;
  for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(m.h, cy + r); y++) {
    for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(m.w, cx + r); x++) {
      if (m.px[y * m.w + x] && Math.hypot(x - cx, y - cy) <= r) n++;
    }
  }
  return n;
}

async function coletarCarregador(page, arma, aplicar) {
  const spec = CARREGADOR_PECA[arma];
  const rig = rigDe(arma);
  const amostras = [];
  await P.segurar(page, true);
  const repouso = await P.pecaCarregador(page, arma, spec, rig);
  if (repouso.erro) return { erro: repouso.erro };
  repouso.px = await pixelsDaPeca(page, arma, spec, repouso);
  const dur = WEAPONS[arma].reload;
  for (const [tipo, mag, n] of [['vazia', 0, 12], ['tatica', Math.max(1, Math.floor(WEAPONS[arma].mag / 2)), 6]]) {
    const ini = await P.iniciarRecarga(page, arma, mag);
    if (!ini.ok) { amostras.push({ tipo, erro: `recarga não entrou (${ini.clip})` }); continue; }
    let prev = 0;
    for (let k = 1; k <= n; k++) {
      const f = k / (n + 1);
      await P.passo(page, dur * (f - prev)); prev = f;
      await aplicar('amostra');
      const r = await P.pecaCarregador(page, arma, spec, rig);
      r.px = await pixelsDaPeca(page, arma, spec, r);
      amostras.push({ tipo, f: +f.toFixed(2), ...r });
    }
    await P.passo(page, dur * (1 - prev) + 0.8);
    await page.evaluate(() => { window.__game.player.reloadUntil = 0; });
  }
  return { repouso, amostras, clipe: Boolean(spec.clipe) };
}

/* ---------------------------------------------------------------------------
   JULGAMENTO: { estado: 'VERDE'|'VERMELHO'|'N/A'|'NAO_MEDE', valor, msg }
   NAO_MEDE conta como vermelho (skill regua, pergunta 4).
   --------------------------------------------------------------------------- */
const V = (valor, msg) => ({ estado: 'VERDE', valor, msg });
const R = (valor, msg) => ({ estado: 'VERMELHO', valor, msg });
const NA = (msg) => ({ estado: 'N/A', valor: '—', msg });
const NM = (msg) => ({ estado: 'NAO_MEDE', valor: '?', msg });

export const JUIZ = {
  mira(c) {
    if (c.classe === 'faca') return NA('faca: sem ADS');
    const m = c.mira;
    if (!m) return NM('não coletado');
    if (!m.mensuravel) {
      if (m.semVm && luneta(c.arma) && c.ads?.scoped) return NA('luneta: no ADS o viewmodel some e entra o overlay 2D');
      return NM(`${m.motivo} — sem aparelho de pontaria visível no ADS`);
    }
    const lim = L.MIRA_MAX_PX * m.escala;
    const px = m.desvio;
    const txt = `${m.ponto.tipo} a ${px.toFixed(0)} px da cruz (${m.dx >= 0 ? '+' : ''}${m.dx.toFixed(0)}, ${m.dy >= 0 ? '+' : ''}${m.dy.toFixed(0)}); teto ${lim.toFixed(0)} px`;
    const ad1 = m.socketNdc ? ` · socket sight (o que o AD1 lê) ${Math.hypot(...m.socketNdc).toFixed(3)} NDC` : '';
    // Inclinação no ADS: o eixo coronha→boca tem de subir reto para a cruz (90°).
    // Rolagem herdada do quadril (rotDeg z do frame) tomba a arma no ADS mesmo
    // com a massa no centro — a uzi "rolada 15–20° no ADS" do A/B da revisão L1.
    const incl = m.eixo ? m.eixo.graus - 90 : null;
    const inclTxt = incl === null ? '' : `; eixo no ADS ${incl > 0 ? '+' : ''}${incl.toFixed(0)}° da vertical (teto ±${L.MIRA_INCLINACAO_MAX}°)`;
    const falhas = [];
    if (px > lim) falhas.push(`mira fora da cruz a ${px.toFixed(0)} px`);
    if (incl !== null && Math.abs(incl) > L.MIRA_INCLINACAO_MAX) falhas.push(`ângulo esquisito no ADS: arma tombada ${incl > 0 ? '+' : ''}${incl.toFixed(0)}° da vertical`);
    if (!falhas.length) return V(`${px.toFixed(0)} px`, txt + inclTxt + ad1);
    return R(`${px.toFixed(0)} px`, `${falhas.join('; ')} — ${txt}${inclTxt}${ad1}. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).`);
  },




};

export const REGUAS = Object.keys(JUIZ);

/* ---------------------------------------------------------------------------
   MUTANTES — cada um quebra de propósito o que a régua cobre numa arma que está
   VERDE, e prova que aplicou (skill regua: mutante que não aplica é pior que
   nenhum).
   --------------------------------------------------------------------------- */
// Palma (hand→middle_01) e raízes das malhas de arma, dentro da página.
const PAGINA_UTIL = `
  const palmaDe = (e) => { const a = e.scene.getObjectByName('hand_l') || e.scene.getObjectByName('handL_metarig');
    const b = e.scene.getObjectByName('middle_01_l') || e.scene.getObjectByName('f_middle01L_metarig');
    return a.getWorldPosition(a.position.clone()).distanceTo(b.getWorldPosition(b.position.clone())); };
  const raizesDe = (e) => e.weaponMeshes.filter((m) => !e.weaponMeshes.includes(m.parent));
  // Arma skinned (PT-38, revólver, deagle): escalar a malha não faz nada — quem
  // posiciona os vértices são os ossos. Escala o osso mais alto usado pela arma.
  const ossosRaiz = (e) => { const usados = new Set();
    for (const m of e.weaponMeshes) if (m.isSkinnedMesh) { const si = m.geometry.attributes.skinIndex; const sw = m.geometry.attributes.skinWeight;
      for (let i = 0; i < si.count; i++) for (const [k, get] of [['X', 'getX'], ['Y', 'getY'], ['Z', 'getZ'], ['W', 'getW']]) { void k;
        if (sw[get](i) > 0) usados.add(m.skeleton.bones[si[get](i)]); } }
    const temAncestral = (b) => { for (let p = b.parent; p; p = p.parent) if (usados.has(p)) return true; return false; };
    return [...usados].filter((b) => b && !temAncestral(b)); };
  const mover = (o, dx, dy, dz) => { const w = o.getWorldPosition(o.position.clone()); w.x += dx; w.y += dy; w.z += dz;
    o.position.copy(o.parent.worldToLocal(w)); o.updateMatrixWorld(true); };
`;
const naPagina = (corpo) => new Function('x', `${PAGINA_UTIL}\nconst e = window.__authoredVm.entry(x);\n${corpo}`);

export const MUTANTES = {
  // O defeito da revisão L1 (md97/m92/mp5/akm): os sockets de mira acima da
  // linha de mira real. O ADS automático centra o socket — o AD1 do eval:vm-ads
  // continua 0,000 — e a massa desenhada afunda abaixo da cruz.
  'sockets-acima': { regua: 'mira', arma: 'carbine', fase: 'antesAds', aplicar: (page, arma) => page.evaluate(naPagina(`
    const s = e?.sockets; if (!s?.sight || !s?.muzzle) return { aplicou: false, motivo: 'sem sockets' };
    const d = palmaDe(e) * 1.2; const y0 = s.sight.getWorldPosition(s.sight.position.clone()).y;
    mover(s.sight, 0, d, 0); mover(s.muzzle, 0, d, 0);
    return { aplicou: s.sight.getWorldPosition(s.sight.position.clone()).y - y0 > d * 0.9, sobe: d };`), arma) },
  'sem-ads': { regua: 'mira', arma: 'carbine', fase: 'antesAds', aplicar: async () => ({ aplicou: true }) },
};

/* Referências. AK: medida NA MESMA SESSÃO (é a referência viva do arsenal).
   PT-38: a APROVADA pelo dono é a de antes do rebuild em K (#631, que a reescala
   de 1,796× para o enquadramento da AK). O dono ainda decide se as curtas têm
   faixa própria ancorada nela, então o padrão é o retrato ASSADO da pistola
   aprovada (tools/eval/vm-pistola-aprovada.json, medido neste branch antes do
   #631); `pistola: 'viva'` mede a PT-38 do branch, e `assarPistola` regrava o
   retrato. */
export const PISTOLA_APROVADA_ARQ = 'tools/eval/vm-pistola-aprovada.json';
export async function coletarReferencias(page, reguas, { pistola = 'aprovada', aspecto = '3x2', assarPistola = false } = {}) {
  const refs = {};
  if (reguas.includes('cobertura')) refs.ak = await coletar(page, 'ak', { reguas: ['cobertura'] });
  if (reguas.includes('pistola-ref')) {
    const fs = await import('node:fs');
    if (pistola === 'viva' || assarPistola) {
      const c = await coletar(page, 'pistol', { reguas: ['pistola-ref'] });
      refs.pistol = { quadril: { areaArma: c.quadril.areaArma, arma: c.quadril.arma }, ads: { areaArma: c.ads.areaArma }, fonte: 'viva' };
      if (assarPistola) {
        const atual = fs.existsSync(PISTOLA_APROVADA_ARQ) ? JSON.parse(fs.readFileSync(PISTOLA_APROVADA_ARQ, 'utf8')) : {};
        atual.o_que_e = 'Retrato da PT-38 APROVADA (antes do #631) no quadro renderizado: referência do eval:vm-pistola-ref. Regravar só com decisão do dono (--assar-pistola).';
        atual[aspecto] = { ...refs.pistol, fonte: undefined, medido: new Date().toISOString().slice(0, 10) };
        fs.writeFileSync(PISTOLA_APROVADA_ARQ, `${JSON.stringify(atual, null, 1)}\n`);
      }
    } else {
      const assado = fs.existsSync(PISTOLA_APROVADA_ARQ) ? JSON.parse(fs.readFileSync(PISTOLA_APROVADA_ARQ, 'utf8'))[aspecto] : null;
      refs.pistol = assado ? { ...assado, fonte: 'aprovada' } : null;
    }
  }
  return refs;
}
