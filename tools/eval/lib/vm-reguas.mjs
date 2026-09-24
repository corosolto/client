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
// Faixa de tamanho da cobertura: por ARMA quando o dono decidiu (m92, escala real), senão pela classe.
const faixaCobertura = (c) => L.COBERTURA_FAIXA[c.arma] || L.COBERTURA_FAIXA[c.classe];
// Tamanho linear POR METRO contra a PT-38 aprovada (mesma grandeza em cobertura e pistola-ref).
const lenCurta = (w) => weaponCFG(w).len || 0.26;
const tamanhoCurta = (q, p, arma) => Math.sqrt(q.areaArma / p.quadril.areaArma) / (lenCurta(arma) / lenCurta('pistol'));

const ROOT = process.cwd();
const { WEAPONS } = await import(pathToFileURL(path.join(ROOT, 'public/js/data/weapons.js')).href);
const { VM_WEAPON } = await import(pathToFileURL(path.join(ROOT, 'public/js/data/vmconfig.js')).href);
const { weaponCFG } = await import(pathToFileURL(path.join(ROOT, 'public/js/weapons.js')).href);

export const TODAS = Object.keys(WEAPONS);   // 26, com a faca
// Curtas: medidas contra a PT-38 APROVADA (decisão do dono, integração K) — a lista mora
// nos limiares, junto da faixa, para vm-frame e réguas de imagem lerem a mesma.
export const CURTAS = L.ARMAS_CURTAS;
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
  ak: { malhas: 'magazine|_MAG$' },   // golden (metarig) e K (#631)
  m4: { malhas: '_MAG$' }, md97: { malhas: '_MAG$' }, scar: { malhas: '_MAG$' }, famas: { malhas: '_MAG$' },
  tavor: { malhas: '_MAG$' }, m92: { malhas: '_MAG$' }, akm: { malhas: '_MAG$' }, g3: { malhas: '_MAG$' },
  awp: { malhas: '_MAG$' }, m400: { malhas: '_MAG$' }, g3sg1: { malhas: '^MINT_MAG_G3SG1$' },
  mp5: { malhas: 'MAG_MP5$' }, uzi: { malhas: 'MAG_UZI$' }, p90: { malhas: 'MAG_P90$|^P90_MAG_MESH' },   // P90_MAG_MESH*: produto do #634
  deagle: { osso: 'Mag' }, pistol: { osso: 'Mag' }, svd: { osso: 'Mag' },
  // clipe-pente (stripper): só aparece na recarga; escondido em repouso é legítimo.
  sks: { malhas: 'Clip', clipe: true }, mosin: { malhas: 'Clip', clipe: true }, rem700: { malhas: 'Clip', clipe: true },
  shotgun: { osso: 'MINT_AMMO_SHOTGUN_GAUGE', clipe: true },
};
// Produtos da fábrica (VM_PALCO_QS=vmfabrica=…): o pente é o osso Mag do chassi do pack numa
// malha única; na KXG12 o cartucho que a mão leva ao tubo é o osso Gauge (só aparece na recarga).
export const FABRICA_NA_REGUA = /(?:^|&)vmfabrica=/.test(process.env.VM_PALCO_QS || '');
if (FABRICA_NA_REGUA) {
  for (const arma of ['akm', 'm4', 'famas', 'pistol', 'g3', 'svd', 'awp', 'mp5', 'deagle']) CARREGADOR_PECA[arma] = { osso: 'Mag' };
  CARREGADOR_PECA.p90 = { osso: 'Magazine' };
  CARREGADOR_PECA.mosin = { osso: 'Cartridge', clipe: true };   // recarga em laço: o cartucho solto, não o clipe
  CARREGADOR_PECA.shotgun = { osso: 'Gauge', clipe: true };
}
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
export async function coletar(page, arma, { reguas, mut = null, fotos = '', variante = null, quadroEntre = false } = {}) {
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
      // #633 (vm-fix-grips) declara `ads.linhaDeMira` (alça e massa como pontos locais de um nó) e o
      // eval:vm-ads passa a medir nela. Aqui os dois pontos declarados são projetados no MESMO quadro e
      // comparados com o aparelho visto: ponto declarado que não cai sobre a imagem é outro socket cego.
      const linha = FABRICA_NA_REGUA ? null : VM_WEAPON[arma]?.ads?.linhaDeMira;   // fábrica: mira = AimPoint do pack
      if (linha) {
        c.mira.linha = await page.evaluate(({ x, linha }) => {
          const g = window.__game; const e = window.__authoredVm.entry(x); const ref = e?.scene.getObjectByName(linha.ref);
          if (!ref) return { erro: `nó ${linha.ref} ausente` };
          ref.updateWorldMatrix(true, false);
          const px = (loc) => { const p = ref.localToWorld(e.scene.position.clone().set(...loc)).project(g.vmCamera);
            return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight]; };
          return { alca: px(linha.alca), massa: px(linha.massa) };
        }, { x: arma, linha });
      }
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
  if (quer('carregador') && CARREGADOR_PECA[arma]) c.carregador = await coletarCarregador(page, arma, aplicar, quadroEntre);
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

// `quadroEntre`: render entre o passo e a medida; a amostra tem de sair igual com e sem ele (R1).
async function coletarCarregador(page, arma, aplicar, quadroEntre = false) {
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
      if (quadroEntre) await P.esperarQuadro(page);
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

/* Cobertura das CURTAS (decisão do dono, integração K): tamanho por metro contra a
   PT-38 APROVADA na faixa L.PISTOLA_APROVADA.faixa (o mesmo número do pistola-ref e
   do vm-frame), cruz livre e câmera fora da arma. Braço, ângulo e ADS contra a AK
   não se aplicam: a pistola aprovada tem outra pose (uma mão, yaw 15°), e o ADS das
   curtas é cobrado pelo pistola-ref contra a mesma pistola. */
function coberturaCurta(c, refs) {
  const p = refs.pistol;
  if (!p?.quadril?.areaArma) return NM(`referência da pistola ausente (${PISTOLA_APROVADA_ARQ} sem este aspecto)`);
  const q = c.quadril;
  if (!q?.areaArma) return NM('arma curta sem pixel de arma no quadril');
  const faixa = L.PISTOLA_APROVADA.faixa;
  const tam = tamanhoCurta(q, p, c.arma);
  const falhas = [];
  if (tam < faixa.min) falhas.push(`arma pequena: ${(tam * 100).toFixed(0)}% da PT-38 ${p.fonte} por metro (faixa das curtas ${faixa.min}–${faixa.max})`);
  if (tam > faixa.max) falhas.push(`arma gigante: ${(tam * 100).toFixed(0)}% da PT-38 ${p.fonte} por metro (faixa das curtas ${faixa.min}–${faixa.max})`);
  if (q.cruz > 0) falhas.push(`${q.cruz} px de arma/braço sobre a cruz no quadril`);
  if (q.olho !== null && q.olho !== undefined && q.olho < L.COBERTURA_OLHO_MIN) falhas.push(`câmera dentro da arma: a parte mais perto está a ${q.olho.toFixed(2)} palma do olho (mínimo ${L.COBERTURA_OLHO_MIN})`);
  const valor = `${tam.toFixed(2)}× PT-38`;
  const txt = `curta: tamanho ${valor} ${p.fonte} por metro (faixa ${faixa.min}–${faixa.max}), cruz ${q.cruz} px, olho ${q.olho?.toFixed(2) ?? '?'} palma`;
  return falhas.length ? R(valor, `${falhas.join('; ')} — ${txt}. Conserto: frame da arma curta (vmconfig/FAMILY_FRAME), contra a PT-38 aprovada.`) : V(valor, txt);
}

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
    let linhaTxt = '';
    if (m.linha) {
      if (m.linha.erro) falhas.push(`ads.linhaDeMira declarada e ${m.linha.erro}`);
      else {
        const d = Math.hypot(m.linha.massa[0] - m.ponto.x, m.linha.massa[1] - m.ponto.y);
        linhaTxt = `; linhaDeMira (#633): massa declarada a ${d.toFixed(0)} px do aparelho visto`;
        if (d > lim) falhas.push(`ads.linhaDeMira não bate com a imagem: a massa declarada fica a ${d.toFixed(0)} px do aparelho que aparece`);
      }
    }
    if (incl !== null && Math.abs(incl) > L.MIRA_INCLINACAO_MAX) falhas.push(`ângulo esquisito no ADS: arma tombada ${incl > 0 ? '+' : ''}${incl.toFixed(0)}° da vertical`);
    if (!falhas.length) return V(`${px.toFixed(0)} px`, txt + inclTxt + linhaTxt + ad1);
    return R(`${px.toFixed(0)} px`, `${falhas.join('; ')} — ${txt}${inclTxt}${linhaTxt}${ad1}. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).`);
  },

  cobertura(c, refs) {
    if (c.classe === 'faca') return NA('faca: meleevm, régua própria (melee-framing)');
    if (c.classe === 'curta') return coberturaCurta(c, refs);
    const ak = refs.ak?.quadril;
    if (!ak?.areaArma) return NM(`referência da AK ausente (${AK_APROVADA_ARQ} sem este aspecto; --assar-ak ou --ref-ak=viva)`);
    const q = c.quadril;
    if (!q) return NM('não coletado');
    const faixa = faixaCobertura(c);
    const tam = Math.sqrt(q.areaArma / ak.areaArma);
    const braco = ak.areaBraco ? q.areaBraco / ak.areaBraco : 0;
    const falhas = [];
    const qual = L.COBERTURA_FAIXA[c.arma] ? `faixa própria da ${c.arma}` : `classe ${c.classe}`;
    if (tam < faixa.min) falhas.push(`arma pequena: ${(tam * 100).toFixed(0)}% da AK (faixa ${faixa.min}–${faixa.max}, ${qual})`);
    if (tam > faixa.max) falhas.push(`arma gigante: ${(tam * 100).toFixed(0)}% da AK (faixa ${faixa.min}–${faixa.max}, ${qual})`);
    if (braco > L.COBERTURA_BRACO_MAX) falhas.push(`braço ${braco.toFixed(2)}× a área do braço da AK (teto ${L.COBERTURA_BRACO_MAX})`);
    if (q.cruz > 0) falhas.push(`${q.cruz} px de arma/braço sobre a cruz no quadril`);
    const dAng = q.eixo && ak.eixo ? ((q.eixo.graus - ak.eixo.graus + 540) % 360) - 180 : null;
    if (dAng !== null && Math.abs(dAng) > L.COBERTURA_ANGULO_MAX) falhas.push(`ângulo esquisito: eixo da arma na tela ${q.eixo.graus.toFixed(0)}° contra ${ak.eixo.graus.toFixed(0)}° da AK (${dAng > 0 ? '+' : ''}${dAng.toFixed(0)}°, teto ±${L.COBERTURA_ANGULO_MAX}°)`);
    if (q.olho !== null && q.olho !== undefined && rigDe(c.arma) !== 'metarig' && q.olho < L.COBERTURA_OLHO_MIN) falhas.push(`câmera dentro da arma: a parte mais perto está a ${q.olho.toFixed(2)} palma do olho (mínimo ${L.COBERTURA_OLHO_MIN})`);
    let adsTxt = 'ADS: viewmodel some (luneta)';
    if (c.ads && c.ads.areaTotal > 0) {
      const teto = L.COBERTURA_ADS_MAX_VS_AK * ak.areaTotal;
      adsTxt = `ADS cobre ${(c.ads.areaTotal * 100).toFixed(1)}% (teto ${(teto * 100).toFixed(1)}%)`;
      if (c.ads.areaTotal > teto) falhas.push(`no ADS arma+braço cobrem ${(c.ads.areaTotal * 100).toFixed(1)}% da tela (teto ${(teto * 100).toFixed(1)}%)`);
    } else if (!luneta(c.arma)) falhas.push('no ADS a arma sumiu (sem luneta)');
    const valor = `${tam.toFixed(2)}× AK`;
    // Rolagem: INFORMATIVA, não reprova. Bate com o crítico no p90 (+28° da AK com
    // o z −60 do FAMILY_FRAME), mas lê m92/mp5 a +22/+23° sem queixa do crítico e o
    // mutante de rolagem −20° na m4 não moveu o número (a borda de cima some):
    // régua que não morde não entra no portão (skill regua).
    const dRol = q.rolagem !== null && q.rolagem !== undefined && ak.rolagem !== null && ak.rolagem !== undefined ? q.rolagem - ak.rolagem : null;
    const txt = `tamanho ${valor}${dRol === null ? '' : `, rolagem ${dRol > 0 ? '+' : ''}${dRol.toFixed(0)}° da AK (informativa)`}, eixo ${dAng === null ? '?' : `${dAng > 0 ? '+' : ''}${dAng.toFixed(0)}°`} da AK, braço ${braco.toFixed(2)}×, cruz ${q.cruz} px, olho ${q.olho?.toFixed(2) ?? '?'} palma, ${adsTxt}`;
    return falhas.length ? R(valor, `${falhas.join('; ')} — ${txt}. Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).`) : V(valor, txt);
  },

  'pistola-ref'(c, refs) {
    if (c.classe !== 'curta') return NA('só armas curtas');
    const p = refs.pistol;
    if (!p?.quadril?.arma || !p.ads) return NM(`referência da pistola ausente (${PISTOLA_APROVADA_ARQ} sem este aspecto; --assar-pistola ou --ref-pistola=viva)`);
    const q = c.quadril;
    if (!q?.arma) return NM('arma curta sem pixel de arma no quadril');
    // comprimento declarado (weaponCFG.len): o mesmo "por metro" do vm-frame-calibra.
    const tam = tamanhoCurta(q, p, c.arma);
    const cen = (b) => [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
    const [x1, y1] = cen(q.arma); const [x0, y0] = cen(p.quadril.arma);
    const dpos = Math.hypot(x1 - x0, y1 - y0);
    const posMax = L.PISTOLA_POS_MAX * (refs.largura || L.LARGURA_REF);
    const adsRaz = p.ads.areaArma ? (c.ads?.areaArma || 0) / p.ads.areaArma : 0;
    const faixa = refs.faixaPistola || L.PISTOLA_FAIXA;
    const falhas = [];
    if (tam < faixa.min) falhas.push(`arma pequena: ${(tam * 100).toFixed(0)}% da pistola ${p.fonte} por metro (faixa ${faixa.min}–${faixa.max})`);
    if (tam > faixa.max) falhas.push(`arma gigante: ${(tam * 100).toFixed(0)}% da pistola ${p.fonte} por metro (faixa ${faixa.min}–${faixa.max})`);
    if (dpos > posMax) falhas.push(`posição: centro da arma a ${dpos.toFixed(0)} px do da pistola (${(x1 - x0).toFixed(0)}, ${(y1 - y0).toFixed(0)}; teto ${posMax.toFixed(0)})`);
    if (adsRaz < L.PISTOLA_ADS_MIN) falhas.push(`ADS: só ${(adsRaz * 100).toFixed(0)}% da arma visível contra a pistola (mínimo ${L.PISTOLA_ADS_MIN * 100}%)`);
    const valor = `${tam.toFixed(2)}× pistola ${p.fonte}`;
    const txt = `tamanho ${valor}, desvio ${dpos.toFixed(0)} px, ADS ${(adsRaz * 100).toFixed(0)}%`;
    return falhas.length ? R(valor, `${falhas.join('; ')} — ${txt}. Conserto: FAMILY_FRAME/VM_FRAME da família curta (escala/offset/rotDeg).`) : V(valor, txt);
  },

  maos(c) {
    if (c.classe === 'faca') return NA('faca');
    if (c.classe === 'curta') return NA('curta: mão de apoio envolve a outra mão, não a arma');
    if (c.arma === 'uzi') return NA('uzi: uma mão só (decisão do dono); mão de apoio é da vm-fix-grips');
    const m = c.maos;
    if (!m) return NM('não coletado');
    if (m.erro) return NM(m.erro);
    const d = m.dedos / m.compPalma;
    const p = m.palma / m.compPalma;
    const txt = `dedos da mão de apoio a ${d.toFixed(2)} palma da malha da arma (palma ${p.toFixed(2)}); teto ${L.MAOS_DEDOS_MAX}`;
    if (d <= L.MAOS_DEDOS_MAX) return V(d.toFixed(2), txt);
    return R(d.toFixed(2), `mão de apoio não encosta / fica no ar: ${txt}. Conserto: pose da mão de apoio no produto (vm-fix-grips); não é config.`);
  },

  carregador(c) {
    if (CARREGADOR_NA[c.arma]) return NA(CARREGADOR_NA[c.arma]);
    const k = c.carregador;
    if (!k) return NM('não coletado');
    if (k.erro) return NM(k.erro);
    const T = L.CARREGADOR;
    const r0 = k.repouso;
    const falhas = [];
    const repousoNaArma = r0.visivel && r0.dArma <= T.encostaMax;
    if (!k.clipe && !repousoNaArma) falhas.push(r0.visivel ? `em repouso o carregador não encosta na arma (${r0.dArma.toFixed(2)} palma)` : 'em repouso o carregador está invisível');
    if (k.clipe && r0.visivel && r0.dArma > T.encostaMax && r0.dMao > T.maoMax) falhas.push(`em repouso o clipe está solto no quadro (${r0.dMao.toFixed(2)} palma da mão, ${Number.isFinite(r0.dArma) ? r0.dArma.toFixed(2) : '∞'} da arma)`);
    if (r0.visivel && r0.tamCorpo && r0.tamPeca / r0.tamCorpo > T.fantasmaMax) falhas.push(`tira carregador fantasma: a peça do carregador mede ${(100 * r0.tamPeca / r0.tamCorpo).toFixed(0)}% da arma`);
    let naMao = 0;
    const estados = [];
    let yAnt = r0.vista?.[1];
    let tipoAnt = '';
    for (const a of k.amostras) {
      if (a.erro) { falhas.push(`${a.tipo}: ${a.erro}`); continue; }
      if (a.tipo !== tipoAnt) { yAnt = r0.vista?.[1]; tipoAnt = a.tipo; }
      const pc = `${a.tipo} ${Math.round(a.f * 100)}%`;
      let e;
      const naTela = a.visivel && a.px >= T.pxMin;
      if (!naTela) {
        // Fora do quadro/escondido: só é defeito se a mão de apoio está NA TELA e a
        // peça não está nela — o dono vê a mão fechada vazia (p90 da revisão L1).
        e = a.maoNaTela && !(a.visivel && a.dMao <= T.maoMax) ? 'mao-vazia' : 'fora';
      } else {
        const desloc = r0.local && a.local ? Math.hypot(a.local[0] - r0.local[0], a.local[1] - r0.local[1], a.local[2] - r0.local[2]) : Infinity;
        a.desloc = desloc;
        // Na arma: no encaixe, ou saindo/entrando dele ainda encostada no corpo (a PT-38
        // aprovada solta o pente a 0,44 palma do encaixe aos 15%, raspando no punho).
        if (!k.clipe && repousoNaArma && (desloc <= T.deslocMax || (desloc <= T.encaixeMax && a.dArma <= T.encostaMax))) e = 'arma';
        else if (a.dMao <= T.maoMax) e = 'mao';
        else if (k.clipe && a.dArma <= T.encostaMax) e = 'arma';
        else if (Number.isFinite(yAnt) && a.vista && a.vista[1] - yAnt <= -T.quedaMin) e = 'caindo';
        else e = 'solto';
      }
      if (a.vista) yAnt = a.vista[1];
      if (e === 'mao') naMao++;
      a.estado = e;
      estados.push(`${a.tipo}${a.f}:${e}`);
      if (e === 'solto') falhas.push(`recarrega com objeto no meio do ar: ${pc} — ${a.dMao.toFixed(2)} palma da mão, deslocado ${Number.isFinite(a.desloc) ? a.desloc.toFixed(2) : '∞'} do encaixe, ${a.px === Infinity ? 'na tela' : `${a.px} px na tela`}`);
      if (e === 'mao-vazia' && !k.clipe) falhas.push(`mão vazia: ${pc} — mão de apoio na tela e o carregador ${a.visivel ? `a ${a.dMao.toFixed(2)} palma dela, fora do quadro` : 'invisível'}`);
    }
    // Toco: com a peça na mão, a fração dela que APARECE (contra ela sozinha em
    // repouso) nunca passa de tocoMin — a mp5 da revisão L1 ("a mão segura um toco
    // de 15–20 px; nunca aparece pente inteiro").
    const fr = k.amostras.filter((a) => a.estado === 'mao' && Number.isFinite(a.px) && r0.pxSo).map((a) => a.px / r0.pxSo);
    if (fr.length && Math.max(...fr) < T.tocoMin) falhas.push(`tira carregador fantasma (toco): com o pente na mão aparece no máximo ${(100 * Math.max(...fr)).toFixed(0)}% dele (mínimo ${T.tocoMin * 100}%)`);
    if (!naMao) falhas.push('tira no ar: em nenhum quadro da recarga a peça está na mão');
    const valor = `${falhas.length ? falhas.length + ' falha(s)' : 'ok'}`;
    const txt = `${estados.join(' ')}`;
    if (!falhas.length) return V(valor, txt);
    return R(valor, `${[...new Set(falhas)].slice(0, 4).join('; ')}${falhas.length > 4 ? ` (+${falhas.length - 4})` : ''}. Conserto: prender a peça ao osso da mão no clipe reload_* (vm-fix-mags); não é config.`);
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
  // FILA-CORRECAO shotgun item 2: "mutante que aproxima a arma e reprova" —
  // 2,2 palmas (~26 cm de mão real) para o olho: a m4 fica com a câmera dentro
  // da coronha, o "tubo octogonal oco" do shotgun.
  aproxima: { regua: 'cobertura', arma: 'm4', fase: 'idle', aplicar: (page, arma) => page.evaluate(naPagina(`
    // No espaço de MUNDO, em direção à câmera (o pai do mount não é o espaço da câmera).
    const cam = window.__game.vmCamera.getWorldPosition(e.mount.position.clone());
    const w = e.mount.getWorldPosition(e.mount.position.clone()); const d0 = w.distanceTo(cam);
    const ancora = raizesDe(e)[0].getWorldPosition(w.clone());
    const dir = cam.clone().sub(ancora).normalize().multiplyScalar(palmaDe(e) * 2.2);
    mover(e.mount, dir.x, dir.y, dir.z);
    return { aplicou: e.mount.getWorldPosition(w.clone()).distanceTo(cam) !== d0, passo: dir.length() };`), arma) },
  // Malha da arma 1,6× com as mesmas mãos: o shotgun ("arma gigante") da revisão L1.
  'arma-gigante': { regua: 'cobertura', arma: 'm4', fase: 'idle', aplicar: (page, arma) => page.evaluate(naPagina(`
    const r = raizesDe(e); for (const m of r) { m.scale.multiplyScalar(1.6); m.updateMatrixWorld(true); }
    return { aplicou: r.length > 0, malhas: r.map((m) => m.name) };`), arma) },
  // A PT-38 com o frame da reescala do #631 (z −0,566), que o dono REVERTEU: a
  // cobertura das curtas mede contra a PT-38 aprovada e tem de reprovar (~0,55×).
  'pistola-631': { regua: 'cobertura', arma: 'pistol', fase: 'idle', aplicar: async (page, arma) => {
    const r = await aplicarVariante(page, arma, { frame: { x: 0.1648, y: -0.19, z: -0.5664 } });
    return { aplicou: r?.frame?.z === -0.5664, frame: r?.frame };
  } },
  // A PT-38 com a malha a 55% (o revólver da revisão L1: ~60% da pistola).
  encolhe: { regua: 'pistola-ref', arma: 'pistol', fase: 'idle', aplicar: (page, arma) => page.evaluate(naPagina(`
    const alvos = e.weaponMeshes.some((m) => m.isSkinnedMesh) ? ossosRaiz(e) : raizesDe(e);
    for (const m of alvos) { m.scale.multiplyScalar(0.55); m.updateMatrixWorld(true); }
    return { aplicou: alvos.length > 0, alvos: alvos.map((m) => m.name) };`), arma) },
  // A arma sobe 2,5 palmas e a mão de apoio fica no ar (a m92 da revisão L1).
  'arma-sobe': { regua: 'maos', arma: 'm4', fase: 'idle', aplicar: (page, arma) => page.evaluate(naPagina(`
    const d = palmaDe(e) * 2.5; const r = raizesDe(e); for (const m of r) mover(m, 0, d, 0);
    return { aplicou: r.length > 0, sobe: d, malhas: r.map((m) => m.name) };`), arma) },
  // O pente sai da mão e fica no ar (uzi 15%, sks 35% da revisão L1).
  solta: { regua: 'carregador', arma: 'm4', fase: 'amostra', aplicar: (page, arma) => page.evaluate(naPagina(`
    const mag = e.weaponMeshes.find((m) => /_MAG$/i.test(m.name)); if (!mag) return { aplicou: false };
    const antes = mag.position.clone(); mover(mag, 0, palmaDe(e) * 2, 0);
    return { aplicou: !mag.position.equals(antes) };`), arma) },
  // O pente some no meio da recarga com a mão na tela (p90 da revisão L1).
  esconde: { regua: 'carregador', arma: 'm4', fase: 'amostra', aplicar: (page, arma) => page.evaluate(naPagina(`
    const mag = e.weaponMeshes.find((m) => /_MAG$/i.test(m.name)); if (!mag) return { aplicou: false };
    mag.visible = false; return { aplicou: true };`), arma) },
};

/* Referências. AK: medida NA MESMA SESSÃO (é a referência viva do arsenal).
   PT-38: a APROVADA pelo dono é a de antes do rebuild em K (#631, que a reescala
   de 1,796× para o enquadramento da AK). O dono ainda decide se as curtas têm
   faixa própria ancorada nela, então o padrão é o retrato ASSADO da pistola
   aprovada (tools/eval/vm-pistola-aprovada.json, medido neste branch antes do
   #631); `pistola: 'viva'` mede a PT-38 do branch, e `assarPistola` regrava o
   retrato. */
export const PISTOLA_APROVADA_ARQ = 'tools/eval/vm-pistola-aprovada.json';
export const AK_APROVADA_ARQ = 'tools/eval/vm-ak-aprovada.json';
export async function coletarReferencias(page, reguas, { pistola = 'aprovada', ak = 'aprovada', aspecto = '3x2', assarPistola = false, assarAk = false } = {}) {
  const refs = {};
  if (reguas.includes('cobertura')) {
    // AK: a APROVADA é a golden (metarig). Com o #631 a AK vira produto K e passa a ser
    // CANDIDATA; a régua continua ancorada no retrato da golden (vm-ak-aprovada.json).
    const fs = await import('node:fs');
    if (ak === 'viva' || assarAk) {
      const c = await coletar(page, 'ak', { reguas: ['cobertura'] });
      const q = c.quadril;
      refs.ak = { quadril: { areaArma: q.areaArma, areaBraco: q.areaBraco, areaTotal: q.areaTotal, eixo: q.eixo, rolagem: q.rolagem }, fonte: 'viva' };
      if (assarAk) {
        const atual = fs.existsSync(AK_APROVADA_ARQ) ? JSON.parse(fs.readFileSync(AK_APROVADA_ARQ, 'utf8')) : {};
        atual.o_que_e = 'Retrato da AK golden APROVADA (antes do rebuild em K do #631) no quadro renderizado: referência do eval:vm-cobertura. Regravar só com decisão do dono (--assar-ak).';
        atual[aspecto] = { ...refs.ak, fonte: undefined, medido: new Date().toISOString().slice(0, 10) };
        fs.writeFileSync(AK_APROVADA_ARQ, `${JSON.stringify(atual, null, 1)}\n`);
      }
    } else {
      const assado = fs.existsSync(AK_APROVADA_ARQ) ? JSON.parse(fs.readFileSync(AK_APROVADA_ARQ, 'utf8'))[aspecto] : null;
      refs.ak = assado ? { ...assado, fonte: 'aprovada' } : null;
    }
  }
  // A cobertura das curtas também mede contra a PT-38 aprovada (decisão do dono).
  if (reguas.includes('pistola-ref') || reguas.includes('cobertura')) {
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
