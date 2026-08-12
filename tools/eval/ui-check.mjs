/* ============================================================================
   ui-check.mjs — A RÉGUA DE UI (UI1 contraste · UI2 poluição · UI3 área morta · UI4 ritmo)
   ----------------------------------------------------------------------------
   POR QUE ESTE ARQUIVO EXISTE
   ---------------------------
   A FASE 5 do roadmap ("melhorias de UI") chegou com três defeitos MEDIDOS nos
   screenshots do dono e com a instrução de trabalhar "baseado nas telas do GPT"
   (references/telas/01_menu_principal.png ... 09_resultado_partida.png).

   AS TELAS NÃO EXISTEM NESTA ÁRVORE. `ls references/` devolve só `viewmodel/`
   (3 JPGs de CS 1.6 / Valorant). Então NADA aqui é "alinhado à referência do GPT":
   toda decisão desta régua tem procedência em (a) medição no próprio código/CSS,
   (b) tabela WCAG 2.2, (c) tools/eval/vm_mint_audit.json + references/viewmodel
   (o viewmodel do JOGO e os 3 frames de referência que EXISTEM), ou (d) simulação
   do jogo real em node. É a mesma regra que o ref-measure.py fixou depois dos três
   dias perdidos: "TETO DE INVARIANTE SÓ ENTRA COM PROCEDÊNCIA. Número sem imagem
   é opinião." Aqui, sem imagem, o número sai de código medido — nunca de gosto.

   O QUE CADA PORTÃO MEDE (e qual defeito do dono ele pega)
   -------------------------------------------------------
   UI1 CONTRASTE  — todo texto do HUD >= 4,5:1 (>=3:1 se for texto grande) e todo
                    OBJETO GRÁFICO essencial >= 3:1, contra o fundo declarado do
                    próprio elemento composto sobre o pior fundo de cena medido.
                    PEGA O DEFEITO 2 (barra de captura).
   UI2 POLUIÇÃO   — fração do tempo em que cada elemento NÃO-PERMANENTE do HUD fica
                    na tela numa partida simulada. PEGA O DEFEITO 1 (prompt do [E]).
   UI3 ÁREA MORTA — nenhum elemento do HUD por cima da ZONA DA MIRA nem da ZONA DO
                    VIEWMODEL. PEGA O DEFEITO 1 na parte "por cima da arma".
   UI4 RITMO      — a partida FECHA no tempo/alvo declarado. PEGA O DEFEITO 3
                    (placar 65 × 53 num modo CAPTURA).

   Uso:  node tools/eval/ui-check.mjs [ui1|ui2|ui3|ui4|all] [--json]
         MUT=<nome> node tools/eval/ui-check.mjs   (mutação: ver MUTACOES lá embaixo)
   ============================================================================ */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const CSS_PATH = path.join(ROOT, 'public/style.css');
const ASTRO_PATH = path.join(ROOT, 'src/pages/index.astro');
const GAME_PATH = path.join(ROOT, 'public/js/game.js');
const ALVO = (process.argv[2] || 'all').toLowerCase();
const JSON_OUT = process.argv.includes('--json');
const MUT = process.env.MUT || '';

/* ==========================================================================
   0. PARÂMETROS COM PROCEDÊNCIA — cada número aqui tem uma fonte, não um gosto
   ========================================================================== */

/* CENA PIOR CASO: o HUD é desenhado POR CIMA do 3D, então "o fundo" não é o CSS —
   é o mapa. O pior fundo dos 5 mapas já está MEDIDO nesta base e anotado no próprio
   CSS: public/style.css:420 — "em 1600×900 sobre a areia do Piscinão (RGB 214,196,164
   = o pior fundo dos 4 mapas)". Uso exatamente esse RGB. Não invento "branco puro":
   branco reprovaria até o que o dono nunca reclamou, e a régua perderia a autoridade. */
const CENA_PIOR = [214, 196, 164];

/* VIEWPORT DE MEDIÇÃO: 1008×655 é a resolução que o arnês (tools/eval/harness.mjs:80)
   usa pra rodar o jogo em node, e é aspecto 1,539 — entre 3:2 (1,5) e 16:9 (1,778).
   Todo % de tela abaixo é convertido com estes números. */
const VW = 1008, VH = 655;

/* ZONA DA ARMA (viewmodel). Fonte 1: tools/eval/vm_mint_audit.json — a silhueta do
   viewmodel DO JOGO medida nas 26 armas; em 3:2 o MENOR `silBordaEsq` é 0,525 e o
   MENOR `topo` é 0,455. Fonte 2 (corrobora): tools/eval/ref_viewmodel.json,
   faixas.bordaEsq = [0,520 ; 0,565] nos 3 frames de CS 1.6 / Valorant.
   Uso o MÍNIMO das 26 armas, não a mediana: se ALGUMA arma chega ali, o HUD não pode
   ocupar aquele pixel — senão a régua passa com a pistola e reprova com a LMG. */
const ZONA_ARMA = { x0: 0.525, y0: 0.455, x1: 1.0, y1: 1.0 };

/* ZONA DA MIRA: "a mira e o que está sendo mirado". Derivada, não chutada:
     - lente: game.js:572 -> PerspectiveCamera(70, ...) => fov VERTICAL 70°.
       fov horizontal = 2*atan(tan(35°)*aspecto) = 94,3° em 1008×655.
     - alvo: altura do corpo 1,72 m e largura de ombro 0,259*H = 0,445 m
       (invariants CHR1/CHR2 — antropometria Drillis & Contini publicada, o mesmo
       número que o char-probe usa).
     - distância: MEDIANA DO ENGAJAMENTO medida na simulação deste arquivo
       (hook em game.js `_noteHit(by,w,dmg,head,dist)`), 13,7 m em 5 mapas × 180 s.
   => altura angular 2*atan(0,86/13,7) = 7,19° -> 10,3% da altura da tela
      largura angular 2*atan(0,2227/13,7) = 1,86° -> 2,0% da largura
   A largura de 2% é menor que a própria marca de acerto (#hitmarker vai a ±30 px =
   ±3,0% da largura, style.css:464-467), então a zona toma o MAIOR dos dois. */
const ZONA_MIRA = (() => {
  const fovV = 70 * Math.PI / 180, asp = VW / VH;
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * asp);
  const D = 13.7, H = 1.72, W = 0.259 * 1.72;
  const fracY = (2 * Math.atan((H / 2) / D)) / fovV;
  const fracX = Math.max((2 * Math.atan((W / 2) / D)) / fovH, (2 * 30) / VW);
  return { x0: 0.5 - fracX / 2, y0: 0.5 - fracY / 2, x1: 0.5 + fracX / 2, y1: 0.5 + fracY / 2 };
})();

/* TETO DA UI2 (poluição). Um elemento NÃO-PERMANENTE do HUD existe pra avisar de um
   ESTADO TRANSITÓRIO; o teto tem que separar "transitório" de "moldura que tapa a tela".
   Procedência do 25% — MEDIDA nesta régua, 5 mapas × 2 modos × 2 cenários × 90 s:
     #round-banner   17,3%  (pior caso, praca_old/dm/spawn)  <- transitório POR DESIGN
     #respawn-overlay 4,9%
     #prot-badge      4,5%
     #scoreboard      4,5%
     #reload-note     0,0%
   Ou seja: o transitório legítimo mais aceso do jogo hoje bate 17,3%. 25% fica acima
   dele com folga (não reprova nada que já está certo) e MUITO abaixo dos 96,7% do
   #pickup-hint — a diferença entre "pisca" e "mora na tela" não é sutil, são 5,6×.
   Não é 50% (aí um elemento em metade dos frames passaria) nem 15% (aí o banner de
   round, que é o pico do design atual, reprovaria a si mesmo).
   O #killfeed fica FORA do portão (medido e reportado, não cobrado): ele é um LOG
   CORRIDO ancorado na borda, e num 4v4 morre gente a cada <4,6 s — ele fica ~100% do
   tempo com pelo menos uma linha POR DESIGN. Cobrar 25% dele seria pedir pro jogo
   esconder o killfeed, que não é o defeito de ninguém. A UI3 já garante que ele não
   invade nem a mira nem a arma. */
const TETO_POLUICAO = 0.25;

/* TETOS DA UI4 (ritmo) — UM POR MODO, e é ESSA a correção desta rodada.
   ---------------------------------------------------------------------------
   A versão anterior desta régua tinha UM teto só e UM critério só ("a partida fecha em
   <= 540 s E o modo declara alvo"). Ela estava certa sobre o CAPTURA não fechar — e foi
   ela que me fez consertar do jeito errado: pra fazer o CAPTURA fechar eu dei a ele o
   MESMO relógio de 99 s do round de abate, e o dono jogou o ferro velho do Zé e disse
   "o captura estava com cronometragem — isso não acontece em CTF". Ele está certo: em
   CTF a rodada acaba por OBJETIVO. A régua que só sabe contar segundos empurra todo modo
   pro mesmo formato — o defeito era MEU, mas o instrumento colaborou.
   Agora são DOIS contratos, e a UI4 cobra o do modo certo em cada corrida:

   ABATE (dm)   · fecha em <= TETO_DM_S
                · declara alvo de abates finito e o placar do round nunca passa dele
                · TEM relógio de round no HUD, contando pra trás e REINICIANDO por rodada
   CAPTURA (ctf)· fecha em <= TETO_CTF_S
                · declara alvo de CAPTURAS finito e o placar de capturas da rodada nunca
                  passa dele
                · NÃO TEM cronômetro de round na cara do jogador: o texto do #round-time
                  não pode ser um relógio que reinicia a cada rodada, e qualquer relógio
                  visível (o de PARTIDA, na reta final) tem que ser MONOTÔNICO e ocupar
                  no máximo TETO_RELOGIO_CTF da partida.

   PROCEDÊNCIA DOS TETOS
   ABATE: 5 rounds × (3 s countdown + 99 s + 4 s fim) + 4,5 s da tela final = 534,5 s
          (game.js:76 ROUND_TIME/ROUNDS_TO_WIN). Arredondado pra 540.
   CAPTURA: CTF_MATCH_TIME (480 s, game.js:105) + 4 s do fim de rodada + 4,5 s da tela
          final + 3 s do countdown da rodada em curso = 491,5 s. Arredondado pra 500.
   TETO_RELOGIO_CTF: CTF_CLOCK_SHOW são 60 s de relógio de PARTIDA numa partida cujo pior
          caso é 480 s de jogo => 12,5%. 20% deixa folga pra partida que acaba cedo (aí
          os 60 s pesam mais no percentual) sem chegar perto do 100% de um relógio de
          round, que é o defeito. Uma partida de 300 s com os 60 s finais dá 20,0%. */
const TETO_DM_S = 540;
const TETO_CTF_S = 500;
const TETO_RELOGIO_CTF = 0.20;

/* Limiares WCAG 2.2: 1.4.3 (texto 4,5:1; texto grande 3:1) e 1.4.11 (objeto gráfico
   não-textual essencial 3:1). "Texto grande" = >=24px, ou >=18,66px se bold (>=700). */
const AA_TEXTO = 4.5, AA_GRANDE = 3.0, AA_GRAFICO = 3.0;

/* ==========================================================================
   1. COR — sRGB, composição alfa e contraste WCAG
   ========================================================================== */
const NOMES = { white: [255, 255, 255], black: [0, 0, 0], transparent: [0, 0, 0, 0], currentcolor: null };

function parseCor(s) {
  if (!s) return null;
  s = String(s).trim().toLowerCase();
  if (s in NOMES) return NOMES[s] ? [...NOMES[s], s === 'transparent' ? 0 : 1].slice(0, 4) : null;
  let m = /^#([0-9a-f]{3})$/.exec(s);
  if (m) return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16), 1];
  m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(s);   // #rrggbb e #rrggbbaa (o killfeed usa `${cor}2e`)
  if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16),
    m[2] ? parseInt(m[2], 16) / 255 : 1];
  m = /^rgba?\(([^)]+)\)$/.exec(s);
  if (m) {
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    if (p.length >= 3 && p.slice(0, 3).every(Number.isFinite)) return [p[0], p[1], p[2], p.length > 3 && Number.isFinite(p[3]) ? p[3] : 1];
  }
  return null;
}
/** `frente` (com alfa) por cima de `fundo` (opaco). */
function sobre(frente, fundo) {
  const a = frente[3] ?? 1;
  return [0, 1, 2].map(i => frente[i] * a + fundo[i] * (1 - a));
}
function lum(c) {
  const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}
function contraste(a, b) {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** CIELAB D65 de um RGB 0-255. Mesma matriz do tools/eval/ref-ui.py e do mat_shade.py —
    as três réguas têm que dar o MESMO número pro mesmo hex, senão a comparação é folclore. */
function lab(c) {
  const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const r = f(c[0]), g = f(c[1]), b = f(c[2]);
  const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const Y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b) / 1.0;
  const Z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;
  const k = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = k(X), fy = k(Y), fz = k(Z);
  const L = 116 * fy - 16, A = 500 * (fx - fy), B = 200 * (fy - fz);
  return { L, a: A, b: B, C: Math.hypot(A, B), h: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
}

/* ==========================================================================
   2. CSS — parser mínimo (regras + :root) e resolução de var()
   ========================================================================== */
function parseCss(txt) {
  // tira comentários /* */ (o CSS desta base é cheio deles, e todos contêm `{`/`}`)
  const limpo = txt.replace(/\/\*[\s\S]*?\*\//g, '');
  const regras = [];
  let i = 0;
  while (i < limpo.length) {
    const abre = limpo.indexOf('{', i);
    if (abre < 0) break;
    const sel = limpo.slice(i, abre).trim();
    // @keyframes/@media abrem um bloco QUE CONTÉM blocos: pula o bloco balanceado inteiro.
    if (sel.startsWith('@')) {
      let d = 0, j = abre;
      for (; j < limpo.length; j++) { if (limpo[j] === '{') d++; else if (limpo[j] === '}') { d--; if (!d) break; } }
      i = j + 1; continue;
    }
    const fecha = limpo.indexOf('}', abre);
    if (fecha < 0) break;
    const corpo = limpo.slice(abre + 1, fecha);
    const decls = {};
    for (const d of corpo.split(';')) {
      const k = d.indexOf(':');
      if (k < 0) continue;
      decls[d.slice(0, k).trim()] = d.slice(k + 1).trim();
    }
    if (sel) regras.push({ sels: sel.split(',').map(s => s.trim()), decls });
    i = fecha + 1;
  }
  return regras;
}
function montaVars(regras) {
  const v = {};
  for (const r of regras) if (r.sels.includes(':root')) for (const [k, val] of Object.entries(r.decls)) if (k.startsWith('--')) v[k] = val;
  return v;
}
function resolveVar(val, vars, prof = 0) {
  if (!val || prof > 12) return val;
  return val.replace(/var\(\s*(--[\w-]+)\s*(?:,([^()]*))?\)/g, (_, nome, fb) =>
    resolveVar(vars[nome] !== undefined ? vars[nome] : (fb || '').trim(), vars, prof + 1));
}

/* ==========================================================================
   3. HTML do HUD — árvore mínima (o cálculo de fundo/herança precisa de ancestrais)
   ========================================================================== */
function recortaHud(astroBruto) {
  /* COMENTÁRIO HTML É NEUTRALIZADO ANTES DA CONTAGEM (o `parseArvore` já fazia isso, e
     por motivo parecido). Sem isso um `<thead>` escrito DENTRO de um comentário de
     documentação conta profundidade: o `d` nunca volta a zero, o recorte passa do
     `</div>` do #hud e engole o resto do documento — a UI1 passou a medir o #match-title
     e até a tag <script> do rodapé, contra o pior fundo de CENA, e reprovou por 1,5:1
     texto que nem é HUD. Caso real desta rodada, com o comentário do #scoreboard.
     Mutação que prova que a régua morde: escreva `<thead>` num comentário do #hud com
     esta linha revertida e a UI1 salta de ~63 para ~86 itens medidos e fica VERMELHA. */
  const astro = astroBruto.replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
  const ini = astro.indexOf('<div id="hud"');
  if (ini < 0) throw new Error('não achei <div id="hud"> em index.astro');
  let d = 0, i = ini;
  const tag = /<\/?([a-z0-9-]+)([^>]*)>/gi;
  tag.lastIndex = ini;
  let m;
  while ((m = tag.exec(astro))) {
    const fechando = m[0][1] === '/', autofecha = /\/>$/.test(m[0]);
    if (/^(br|img|input|hr|meta|link|path|use)$/i.test(m[1]) || autofecha) continue;
    if (fechando) { d--; if (d === 0) { i = m.index + m[0].length; break; } } else d++;
  }
  return { html: astro.slice(ini, i), linha0: astro.slice(0, ini).split('\n').length };
}
function parseArvore(htmlBruto, linha0, paiExterno = null) {
  // comentários HTML fora: sem isso o texto de <!-- ... --> virava "texto do elemento"
  // e o #hud-actions era medido como se tivesse um parágrafo dentro (falso positivo).
  const html = htmlBruto.replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
  const raiz = { tag: 'root', id: null, cls: [], style: '', filhos: [], pai: paiExterno, texto: '', linha: linha0 };
  let atual = raiz;
  const tag = /<\/?([a-z0-9-]+)([^>]*?)(\/?)>/gi;
  let m, ult = 0;
  while ((m = tag.exec(html))) {
    const txt = html.slice(ult, m.index).replace(/\s+/g, ' ').trim();
    if (txt) atual.texto += (atual.texto ? ' ' : '') + txt;
    ult = m.index + m[0].length;
    const nome = m[1].toLowerCase(), attrs = m[2], fechando = m[0][1] === '/', vazio = m[3] === '/' || /^(br|img|input|hr|meta|link|path|use)$/.test(nome);
    if (nome === 'svg' && !fechando) {
      /* SVG é ÍCONE: vira um nó (ele tem class e `fill:currentColor`, logo tem cor e
         entra na UI1 — .kf-ic e .kf-skull são SVG), mas o interior é pulado. */
      const id = (/id="([^"]+)"/.exec(attrs) || [])[1] || null;
      const cls = ((/class="([^"]+)"/.exec(attrs) || [])[1] || '').split(/\s+/).filter(Boolean);
      const style = (/style="([^"]+)"/.exec(attrs) || [])[1] || '';
      atual.filhos.push({ tag: 'svg', id, cls, style, filhos: [], pai: atual, texto: '▪', ehIcone: true, linha: linha0 + html.slice(0, m.index).split('\n').length - 1 });
      const fim = html.toLowerCase().indexOf('</svg>', m.index);
      tag.lastIndex = ult = fim + 6; continue;
    }
    if (fechando) { if (atual.pai && atual !== raiz) atual = atual.pai; continue; }
    const id = (/id="([^"]+)"/.exec(attrs) || [])[1] || null;
    const cls = ((/class="([^"]+)"/.exec(attrs) || [])[1] || '').split(/\s+/).filter(Boolean);
    const style = (/style="([^"]+)"/.exec(attrs) || [])[1] || '';
    const no = { tag: nome, id, cls, style, filhos: [], pai: atual, texto: '', linha: linha0 + html.slice(0, m.index).split('\n').length - 1 };
    atual.filhos.push(no);
    if (!vazio) atual = no;
  }
  return raiz;
}
function achata(no, saida = []) { for (const f of no.filhos) { saida.push(f); achata(f, saida); } return saida; }

/* Especificidade grosseira só pra ordenar (#id > .classe > tag). Basta: o CSS desta
   base não usa seletor complexo no HUD além de `#pai .filho` e `.a,.b`. */
function casa(sel, no) {
  const partes = sel.trim().split(/\s+/);
  const alvo = partes[partes.length - 1];
  const casaSimples = (s, n) => {
    if (!n) return false;
    // pseudo-classes/elementos de estado não valem pro estado base (ex.: :hover, ::before)
    if (/::/.test(s)) return false;
    s = s.replace(/:(hover|focus|focus-visible|active|not\([^)]*\))/g, '');
    const mm = s.match(/^([a-z0-9-]*)((?:[.#][\w-]+)*)$/i);
    if (!mm) return false;
    if (mm[1] && mm[1].toLowerCase() !== n.tag) return false;
    for (const t of (mm[2].match(/[.#][\w-]+/g) || [])) {
      if (t[0] === '#' && n.id !== t.slice(1)) return false;
      if (t[0] === '.' && !n.cls.includes(t.slice(1))) return false;
    }
    return true;
  };
  if (!casaSimples(alvo, no)) return false;
  let p = no.pai;
  for (let k = partes.length - 2; k >= 0; k--) {
    let achou = false;
    while (p) { if (casaSimples(partes[k], p)) { achou = true; p = p.pai; break; } p = p.pai; }
    if (!achou) return false;
  }
  return true;
}
function espec(sel) { return (sel.match(/#/g) || []).length * 100 + (sel.match(/\./g) || []).length * 10 + 1; }

function computa(no, regras, vars) {
  const out = {};
  const hits = [];
  for (const r of regras) for (const s of r.sels) if (casa(s, no)) hits.push({ e: espec(s), decls: r.decls });
  hits.sort((a, b) => a.e - b.e);
  for (const h of hits) Object.assign(out, h.decls);
  for (const d of no.style.split(';')) { const k = d.indexOf(':'); if (k > 0) out[d.slice(0, k).trim()] = d.slice(k + 1).trim(); }
  for (const k of Object.keys(out)) out[k] = resolveVar(out[k], vars);
  return out;
}

/* ==========================================================================
   4. UI1 — CONTRASTE
   ========================================================================== */
const HERDA = ['color', 'text-shadow', 'font-size', 'font-weight', 'letter-spacing'];

/** Alfa do scrim de canto do #hud no ponto (fx,fy) em fração de tela.

    DEVOLVE 0 DESDE QUE O SCRIM SAIU DO CSS. O `#hud::before` (dois radial-gradient
    42%×34% nos cantos inferiores, .84 → .48 em 46% → 0 em 80%) foi removido a pedido do
    dono — "o placar e as informações embaixo não precisam de background". Quem segura o
    contraste do HUD agora é o contorno no glifo (--sh-hud + -webkit-text-stroke), que
    esta régua já credita logo abaixo, em `fundoEfetivo`.

    ESTA FUNÇÃO NÃO FOI APAGADA DE PROPÓSITO: enquanto ela existir devolvendo 0, o portão
    diz em voz alta que o crédito acabou. Apagá-la deixaria a próxima pessoa sem pista de
    que já houve um scrim aqui e de por que os números do UI1 mudaram de patamar.

    Isso APERTA a régua, não afrouxa: some uma fonte de contraste que o código não tem
    mais. Deixar o modelo antigo somando um scrim inexistente seria medir a favor do
    código — a régua passaria a mentir exatamente onde ela é mais necessária (areia do
    Piscinão, RGB 214,196,164). */
function alfaScrim(_fx, _fy) {
  return 0;
}

/** Quebra uma lista CSS nas vírgulas de TOPO. `rgba(0,0,0,.95)` tem vírgulas dentro e
    `split(',')` as trataria como separador de camada. */
function virgulasDeTopo(txt) {
  const fora = [];
  let nivel = 0, atual = '';
  for (const ch of txt) {
    if (ch === '(') nivel++;
    else if (ch === ')') nivel--;
    if (ch === ',' && nivel === 0) { fora.push(atual); atual = ''; continue; }
    atual += ch;
  }
  if (atual.trim()) fora.push(atual);
  return fora.map(s => s.trim()).filter(Boolean);
}

/** Alfa de uma cor CSS. Só interessa preto-ish: cama é tinta escura sob glifo claro. */
function alfaDaCor(txt) {
  const m = txt.match(/rgba?\(([^)]*)\)/);
  if (m) {
    const p = m[1].split(',').map(s => parseFloat(s.trim()));
    const [r, g, b] = p;
    const a = p.length > 3 ? p[3] : 1;
    // cama clara não é cama: só credita tinta escura (média dos canais < 96 de 255)
    if ((r + g + b) / 3 > 96) return 0;
    return Number.isFinite(a) ? a : 1;
  }
  if (/^#0{3,8}$/.test(txt.trim())) return 1;   // #000 / #000000
  if (/\bblack\b/.test(txt)) return 1;
  return 0;
}

/** ALFA DA CAMA DE TINTA rente ao glifo, pelo lado MAIS FRACO do anel.
    Ver o bloco longo em `fundoEfetivo` para o porquê de cada regra. */
function alfaDaCama(textShadow, textStroke) {
  // 8 vizinhos: N, S, L, O e as quatro diagonais
  const DIRS = [[0, -1], [0, 1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const acc = DIRS.map(() => 0);
  const soma = (i, a) => { acc[i] = 1 - (1 - acc[i]) * (1 - a); };   // camadas compõem

  for (const camada of virgulasDeTopo(textShadow)) {
    if (/^none$/i.test(camada)) continue;
    const a0 = alfaDaCor(camada);
    if (a0 <= 0) continue;
    const nums = (camada.replace(/rgba?\([^)]*\)/, ' ').match(/-?[\d.]+px|(?<![\w.])-?[\d.]+(?![\w.%])/g) || [])
      .map(s => parseFloat(s));
    const [dx = 0, dy = 0, blur = 0] = nums;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 1) continue;          // regra 1: só quem abraça
    const a = a0 / (1 + Math.max(0, blur));                          // regra 2: borrão espalha
    if (dx === 0 && dy === 0) { DIRS.forEach((_, i) => soma(i, a)); continue; }
    DIRS.forEach(([ux, uy], i) => { if (Math.sign(dx) === ux && Math.sign(dy) === uy) soma(i, a); });
  }

  // text-stroke: anel uniforme, todas as direções. `3px rgba(0,0,0,.92)`
  const larg = parseFloat((textStroke.match(/-?[\d.]+px/) || ['0'])[0]);
  const aStroke = alfaDaCor(textStroke);
  if (larg >= 1 && aStroke > 0) DIRS.forEach((_, i) => soma(i, aStroke));

  return Math.min(...acc);                                           // regra 3: o lado mais fraco
}

/** Fundo EFETIVO atrás do texto de um nó: cena pior caso -> scrim de canto -> fundos
    dos ancestrais -> fundo do próprio elemento. `contorno` some o halo do --sh-hud. */
function fundoEfetivo(no, comp, ctx, { contorno = true } = {}) {
  let bg = [...CENA_PIOR];
  const centro = ctx.caixa ? [(ctx.caixa.x0 + ctx.caixa.x1) / 2, (ctx.caixa.y0 + ctx.caixa.y1) / 2] : [0.5, 0.5];
  if (ctx.scrim !== false) {
    const a = alfaScrim(centro[0], centro[1]);
    if (a > 0) bg = sobre([9, 7, 4, a], bg);
  }
  const cadeia = [];
  for (let p = no; p; p = p.pai) cadeia.unshift(p);
  for (const p of cadeia) {
    const c = p === no ? comp : (p.__comp || {});
    const b = parseCor((c['background'] || c['background-color'] || '').split(/\s+(?=url|linear|radial|repeating)/)[0]);
    if (b && (b[3] ?? 1) > 0) bg = sobre(b, bg);
  }
  /* CONTORNO DE TEXTO = FUNDO REAL DO GLIFO. Não é licença poética: está escrito em
     public/style.css:63-66 — "um blur de 2px em preto .95 encosta no glifo e vira a
     'cor de fundo' real do texto". Sem esse crédito TODO HUD de TODO FPS reprova (texto
     claro sobre cena clara) e a régua vira inútil.

     O CRÉDITO ERA CONCEDIDO POR CASAMENTO DE SUBSTRING, E ISSO ERA UM BURACO. A linha
     anterior era:

         if (/rgba\(0,\s*0,\s*0,\s*\.9[0-9]?\)/.test(ts) && /0 0 2px/.test(ts))
           bg = sobre([0,0,0,0.95], bg);

     Ou seja: achou os dois pedaços de texto no valor -> credita fundo PRETO TOTALMENTE
     OPACO. Alfa real, largura e cobertura do anel não entravam na conta. Um fio de 1,5px
     a 50% pontuava igual a uma chapa sólida.
     Custo medido disso: a UI1 passava com 0 de 62 elementos abaixo do mínimo sobre um CSS
     cujas capturas estão ilegíveis (timer 2,23:1, vida 1,40:1, barra 1,07:1 no Piscinão).
     O DEFEITO SOBREVIVEU PORQUE A RÉGUA DIZIA QUE ESTAVA BOM - que é a única forma de
     falha que interessa num portão.

     O MODELO NOVO mede o que o olho vê: quanta tinta preta existe RENTE ao glifo, e em
     quantos lados. Três decisões, cada uma com motivo:

     1. SÓ CAMADA QUE ABRAÇA CONTA. Deslocamento > 1px é sombra projetada, não cama: ela
        cai longe da letra e o cenário volta a encostar no glifo. `max(|dx|,|dy|) <= 1`.
     2. BORRÃO ESPALHA, NÃO CONSTRÓI. Uma camada com blur r reparte a mesma tinta num anel
        mais largo, então o pico rente ao glifo cai. Atenuação `1/(1+r)`: r=0 entrega alfa
        cheio, r=2 entrega um terço, r=10 entrega ~9%. É a curva mais simples que respeita
        a direção certa; não é modelo gaussiano e não finge ser. Ela vale como PISO -
        superestimar o crédito é o erro que criou este bug.
     3. O ANEL VALE PELO LADO MAIS FRACO. Sombra deslocada só pinta o lado pra onde aponta;
        é por lá que o cenário entra. O crédito é o MÍNIMO das 8 direções, não a média:
        média deixaria um anel aberto de um lado passar por anel fechado.

     `-webkit-text-stroke` ENTRA NA CONTA, e não entrava antes: é anel uniforme de verdade,
     em todas as direções. Ignorá-lo fazia a régua cobrar duas vezes de quem já tinha
     resolvido o problema pelo caminho mais direto. */
  if (contorno) {
    const a = alfaDaCama(comp['text-shadow'] || '', comp['-webkit-text-stroke'] || '');
    if (a > 0) bg = sobre([0, 0, 0, a], bg);
  }
  return bg;
}

function caixaHerdada(no, caixas) {
  for (let p = no; p; p = p.pai) if (p.id && caixas[p.id]) return caixas[p.id];
  return null;
}
function textoGrande(comp) {
  const fs = parseFloat(comp['font-size']) || 16;
  const fw = parseInt(comp['font-weight'] || '400', 10) || 400;
  return fs >= 24 || (fs >= 18.66 && fw >= 700);
}

function ui1(ctxCss) {
  const { regras, vars, arvore, caixas } = ctxCss;
  const nos = achata(arvore);
  for (const n of nos) n.__comp = computa(n, regras, vars);
  // herança das propriedades de texto
  for (const n of nos) {
    for (const p of HERDA) {
      if (n.__comp[p] !== undefined) continue;
      for (let a = n.pai; a; a = a.pai) if (a.__comp && a.__comp[p] !== undefined) { n.__comp[p] = a.__comp[p]; break; }
    }
  }
  const achados = [];
  const add = (o) => achados.push(o);

  /* ---- (a) TEXTO ESTÁTICO do HUD (o que está no index.astro) ---- */
  for (const n of nos) {
    const c = n.__comp;
    if (!n.texto || !n.texto.trim()) continue;     // só nó com texto de verdade
    if ((c['display'] || '').includes('none') && !n.cls.includes('hidden')) continue;
    const cor = parseCor(c['color']);
    if (!cor) continue;
    /* CAIXA: elemento sem posição própria (ex.: #reload-note dentro de #hud-bottom-right)
       herda a caixa do ancestral POSICIONADO — é onde ele aparece na tela, e portanto é
       onde o scrim de canto do #hud (style.css:422) vale ou não vale. Sem isso o
       #reload-note era medido no meio da tela (sem scrim) e reprovava por erro MEU. */
    const cx = caixaHerdada(n, caixas);
    const bg = fundoEfetivo(n, c, { caixa: cx });
    // `opacity` de GRUPO apaga o texto E o contorno junto: a cor efetiva é a mistura
    // do par (glifo, contorno) contra o que houver atrás dos dois.
    const op = parseFloat(c['opacity'] ?? '1');
    const semContorno = fundoEfetivo(n, c, { caixa: cx }, { contorno: false });
    const corEf = op < 1 ? sobre([...cor.slice(0, 3), op], semContorno) : cor;
    const bgEf = op < 1 ? sobre([...bg, op], semContorno) : bg;
    const r = contraste(corEf, bgEf);
    const min = textoGrande(c) ? AA_GRANDE : AA_TEXTO;
    add({ tipo: 'texto', alvo: n.id ? '#' + n.id : '.' + (n.cls[0] || n.tag), fonte: `src/pages/index.astro:${n.linha}`,
      amostra: n.texto.slice(0, 34), razao: +r.toFixed(2), min, ok: r >= min - 1e-9 });
  }

  /* ---- (b) O HUD QUE O JOGO REALMENTE ESCREVE ----------------------------------
     A faixa de CTF (defeito 2) e o killfeed são innerHTML montado em runtime: não
     existem no index.astro. A primeira versão desta régua deduzia as cores por regex
     no game.js — frágil e, pior, ela mediria o que EU escrevi no regex, não o que o
     jogo desenha. Aqui o jogo é BOOTADO no arnês, os fragmentos são capturados e
     PARSEADOS como qualquer outro pedaço de HUD. Se alguém mudar o template, a régua
     acompanha sozinha. Sem o arnês (ui1 rodando isolado) o bloco é PULADO e isso sai
     no relatório — melhor buraco declarado que número inventado. */
  for (const [idPai, frag, fonte] of (ctxCss.fragmentos || [])) {
    const pai = nos.find(n => n.id === idPai);
    if (!pai) continue;
    const sub = parseArvore(frag, 0, pai);
    for (const n of achata(sub)) {
      n.__comp = computa(n, regras, vars);
      for (const p of HERDA) {
        if (n.__comp[p] !== undefined) continue;
        for (let a = n.pai; a; a = a.pai) if (a.__comp && a.__comp[p] !== undefined) { n.__comp[p] = a.__comp[p]; break; }
      }
    }
    for (const n of achata(sub)) {
      const c = n.__comp;
      if (!n.texto || !n.texto.trim()) continue;
      const cor = parseCor(c['color']); if (!cor) continue;
      const cx = caixaHerdada(n, caixas);
      const bg = fundoEfetivo(n, c, { caixa: cx });
      const semContorno = fundoEfetivo(n, c, { caixa: cx }, { contorno: false });
      const op = parseFloat(c['opacity'] ?? '1');
      const corEf = op < 1 ? sobre([...cor.slice(0, 3), op], semContorno) : cor;
      const bgEf = op < 1 ? sobre([...bg, op], semContorno) : bg;
      const r = contraste(corEf, bgEf);
      const min = textoGrande(c) ? AA_GRANDE : AA_TEXTO;
      const nome = (n.id ? '#' + n.id : (n.cls.length ? '.' + n.cls.join('.') : n.tag));
      add({ tipo: 'texto', alvo: `#${idPai} > ${nome}`, fonte, amostra: `"${n.texto.slice(0, 22)}" ${c['color']}${op < 1 ? ' opacity:' + op : ''}`,
        razao: +r.toFixed(2), min, ok: r >= min - 1e-9 });
    }
    /* ---- (c) OBJETO GRÁFICO ESSENCIAL (WCAG 1.4.11, 3:1) ------------------------
       Barra de captura = DEFEITO 2 do dono. Barra é BACKGROUND, e background não
       ganha crédito nenhum de text-shadow: o que o olho compara é PREENCHIMENTO ×
       TRILHO (quanto já capturei) e TRILHO × PAINEL (onde a barra começa e acaba).
       Detecção genérica: qualquer nó com background próprio cujo PAI também tenha. */
    for (const n of achata(sub)) {
      const c = n.__comp;
      const meu = parseCor((c['background'] || c['background-color'] || '').trim());
      if (!meu || (meu[3] ?? 1) === 0) continue;
      /* OBJETO GRÁFICO = barra/medidor: SEM TEXTO e com dimensão declarada. O chip
         colorido atrás do nome no killfeed (`background:${cor}2e`) NÃO entra: ele é
         decoração atrás de texto, e a WCAG 1.4.11 fala de gráfico "necessário para
         entender o conteúdo". Quem carrega informação ali é o NOME, medido acima. */
      if ((n.texto || '').trim()) continue;
      if (!(c['width'] && c['height'])) continue;
      const pc = n.pai && n.pai.__comp ? n.pai.__comp : null;
      const doPai = pc ? parseCor((pc['background'] || pc['background-color'] || '').trim()) : null;
      if (!doPai || (doPai[3] ?? 1) === 0) continue;
      const cx = caixaHerdada(n, caixas);
      const fundoDoPai = fundoEfetivo(n.pai, pc, { caixa: cx }, { contorno: false });
      const r = contraste(sobre(meu, fundoDoPai), fundoDoPai);
      add({ tipo: 'grafico', alvo: `#${idPai} > barra: ${c['background']} × ${pc['background']}`, fonte,
        amostra: 'preenchimento × trilho', razao: +r.toFixed(2), min: AA_GRAFICO, ok: r >= AA_GRAFICO - 1e-9 });
      /* LIMITE DO COMPONENTE (onde a barra começa e acaba). A WCAG 1.4.11 pede 3:1 pra
         "informação visual necessária pra identificar o componente"; esse limite pode ser
         o FUNDO do trilho OU a BORDA dele — o que o olho enxergar melhor. Medir só o fundo
         proibiria o padrão clássico "poço escuro + fio claro", que é justamente o único
         jeito de atender ao mesmo tempo (fio × painel) e (preenchimento × trilho): um
         trilho cinza-médio, alto o bastante pra se destacar do painel, mata o contraste do
         preenchimento vermelho por cima dele. Então: vale o MAIOR dos dois. */
      const bgAvo = fundoEfetivo(n.pai.pai || n.pai, (n.pai.pai || n.pai).__comp || {}, { caixa: cx }, { contorno: false });
      const rFundo = contraste(sobre(doPai, bgAvo), bgAvo);
      const corBorda = parseCor((/(?:^|\s)(#[0-9a-f]{3,8}|rgba?\([^)]*\))/i.exec(pc['border'] || '') || [])[1]);
      const rBorda = corBorda ? contraste(sobre(corBorda, bgAvo), bgAvo) : 0;
      const rt = Math.max(rFundo, rBorda);
      add({ tipo: 'grafico', alvo: `#${idPai} > barra: limite (trilho ${rFundo.toFixed(2)} / fio ${rBorda.toFixed(2)}) × painel`, fonte,
        amostra: `trilho ${pc['background']} + borda ${pc['border'] || '(nenhuma)'}`, razao: +rt.toFixed(2), min: AA_GRAFICO, ok: rt >= AA_GRAFICO - 1e-9 });
    }
  }

  /* ---- (d) outros objetos gráficos essenciais do HUD ---- */
  const parNo = (idFill, idTrack, rotulo) => {
    const f = nos.find(n => n.id === idFill), t = nos.find(n => n.id === idTrack);
    if (!f || !t) return;
    const cx = caixas[idTrack];
    const bgT = fundoEfetivo(t, t.__comp, { caixa: cx }, { contorno: false });
    const corF = parseCor(f.__comp['background'] || f.__comp['background-color']);
    if (!corF) return;
    const r = contraste(sobre(corF, bgT), bgT);
    add({ tipo: 'grafico', alvo: rotulo, fonte: `public/style.css (#${idFill} × #${idTrack})`,
      amostra: `${f.__comp['background']} sobre ${t.__comp['background']}`, razao: +r.toFixed(2), min: AA_GRAFICO, ok: r >= AA_GRAFICO - 1e-9 });
  };
  parNo('hp-fill', 'hp-bar', 'barra de vida: preenchimento × trilho');

  const falhas = achados.filter(a => !a.ok);
  return { nome: 'UI1', titulo: 'CONTRASTE — texto do HUD >= 4,5:1 (3:1 se grande) e objeto gráfico essencial >= 3:1',
    ok: falhas.length === 0, achados, falhas };
}

/* ==========================================================================
   5. UI3 — ÁREA MORTA (geometria do HUD resolvida a partir do CSS)
   ========================================================================== */
/* ISENÇÕES, cada uma com o MOTIVO — sem isso a régua reprovaria a própria camada de
   mira e viraria ruído. A regra que sobra é: elemento CENTRADO/FLUTUANTE não pode
   invadir as duas zonas; elemento ancorado na BORDA (left/right/top/bottom em px) é
   convenção do gênero (munição no canto, vida no canto) e o viewmodel do próprio CS 1.6
   sai pelas duas bordas (references/viewmodel, `cruzaBordaDireita:true`). */
const ISENTOS = {
  crosshair: 'É A MIRA.',
  hitmarker: 'marca de acerto: pertence à camada de mira.',
  'dmg-numbers': 'números de dano: camada de mira (posição vem do mundo, não do CSS).',
  'dmg-dir': 'indicador direcional de dano: camada de mira.',
  'damage-vignette': 'vinheta de dano: tela inteira, sem opacidade em repouso.',
  'scope-overlay': 'luneta: SUBSTITUI a cena, não é overlay de HUD.',
  'lock-hint': 'só aparece com o ponteiro DESTRAVADO (game.js:5618) — nesse estado não há mira nem tiro.',
  'respawn-overlay': 'só aparece MORTO: não há viewmodel nem mira pra tapar.',
  scoreboard: 'invocado pelo jogador (TAB) ou no fim de round — tapar a cena é a função dele.',
  'radio-menu': 'invocado pelo jogador (Z/X/V).',
  'round-banner': 'anúncio de round: some sozinho e o round nem começou (state=countdown).',
  'mk-banner': 'anúncio de multi-kill: é a recompensa, dura 0,16 s de transição.',
};
function caixaDe(comp, texto) {
  const px = (v, base) => {
    if (v === undefined || v === null || v === 'auto') return null;
    const s = String(v).trim();
    if (s.endsWith('%')) return parseFloat(s) / 100 * base;
    if (s.endsWith('px')) return parseFloat(s);
    if (s.endsWith('vw')) return parseFloat(s) / 100 * VW;
    if (s.endsWith('vh')) return parseFloat(s) / 100 * VH;
    return parseFloat(s);
  };
  const pad = (comp['padding'] || '0').split(/\s+/).map(v => px(v, VW) || 0);
  const padX = pad.length > 1 ? pad[1] : pad[0], padY = pad[0];
  const bw = /solid|px/.test(comp['border'] || '') ? (parseFloat(comp['border']) || 0) : 0;
  const fs = parseFloat(comp['font-size']) || 16;
  const lh = comp['line-height'] && !isNaN(parseFloat(comp['line-height']))
    ? (String(comp['line-height']).endsWith('px') ? parseFloat(comp['line-height']) : parseFloat(comp['line-height']) * fs)
    : fs * 1.2;
  /* LARGURA. Sem browser não existe medida de texto exata. Uso DOIS números e digo qual
     é qual: `largMin` = só padding+borda (EXATO, não depende de fonte nenhuma) e
     `largEst` = estimativa com o avanço da fonte. O veredito da UI3 usa a REGRA QUE NÃO
     DEPENDE DA ESTIMATIVA (ver ui3()); a estimativa entra só no relatório. */
  const mono = /mono/i.test(comp['font-family'] || '');
  const ls = parseFloat(comp['letter-spacing']) || 0;
  const avanco = mono ? 0.5 : 0.46;   // ST Mono (Share Tech Mono) = 0,5em; Rajdhani é condensada
  const largMin = 2 * padX + 2 * bw;
  const largEst = largMin + (texto ? texto.length * (fs * avanco + ls) : 0);
  const decl = px(comp['width'], VW);
  /* max-width: `min(38vw,380px)` etc. — pego o MENOR dos termos, que é o que o browser faz */
  const mw = comp['max-width'];
  const maxLarg = mw ? Math.min(...String(mw).replace(/^min\(|\)$/g, '').split(',').map(v => px(v.trim(), VW)).filter(Number.isFinite)) : null;
  /* ALTURA: com max-width o texto QUEBRA. Sem contar as linhas, um prompt de 2 linhas
     seria medido com a altura de 1 e a caixa da UI3 mentiria pra baixo. */
  const linhas = (maxLarg && largEst > maxLarg && !/nowrap/.test(comp['white-space'] || '')) ? Math.ceil(largEst / maxLarg) : 1;
  const alt = (px(comp['height'], VH) ?? (linhas * lh + 2 * padY + 2 * bw));
  const x = { esq: px(comp['left'], VW), dir: px(comp['right'], VW) };
  const y = { topo: px(comp['top'], VH), base: px(comp['bottom'], VH) };
  const tr = comp['transform'] || '';
  const centrX = /translateX\(-50%\)|translate\(-50%/.test(tr);
  const centrY = /translateY\(-50%\)|translate\([^,]*,\s*-50%/.test(tr);
  return { padX, padY, bw, fs, lh, alt, linhas, largMin, largEst, decl, maxLarg, x, y, centrX, centrY, mono };
}
function ui3(ctxCss) {
  const { regras, vars, arvore, textos = {} } = ctxCss;
  const nos = achata(arvore).filter(n => n.id);
  const achados = [];
  const emPx = v => v !== undefined && /px$/.test(String(v).trim());
  const cruza = (a, z) => a.x1 > z.x0 && a.x0 < z.x1 && a.y1 > z.y0 && a.y0 < z.y1;
  for (const n of nos) {
    const c = n.__comp || (n.__comp = computa(n, regras, vars));
    if (!/absolute|fixed/.test(c['position'] || '')) continue;
    if (ISENTOS[n.id]) { achados.push({ alvo: '#' + n.id, isento: ISENTOS[n.id], ok: true }); continue; }
    /* TEXTO: prefiro o que o JOGO escreve (medido no arnês) ao que está no .astro —
       #pickup-hint nasce VAZIO no HTML e é preenchido em runtime; medir o HTML daria
       uma caixa de 38 px (só o padding) que nunca existe na tela. */
    const b = caixaDe(c, textos[n.id] ?? n.texto);

    /* ---- Y: exato. top/bottom + altura de linha declarada. ---- */
    let y0 = b.y.topo != null ? b.y.topo : (b.y.base != null ? VH - b.y.base - b.alt : null);
    if (y0 == null) { achados.push({ alvo: '#' + n.id, isento: 'sem âncora vertical resolvível (container)', ok: true }); continue; }
    if (b.centrY) y0 -= b.alt / 2;
    const y1 = y0 + b.alt;

    /* ---- X: largura efetiva = width declarada, senão max-width, senão a estimativa
       de texto. `largMin` (só padding+borda) é EXATO e serve de piso. ---- */
    const larg = b.decl ?? b.maxLarg ?? Math.max(b.largMin, b.largEst);
    const centrado = b.centrX || (c['text-align'] === 'center' && b.x.esq === 0 && b.x.dir === 0);
    let x0;
    if (centrado) x0 = VW / 2 - larg / 2;
    else if (b.x.esq != null) x0 = b.x.esq;
    else if (b.x.dir != null) x0 = VW - b.x.dir - larg;
    else x0 = VW / 2 - larg / 2;
    const caixa = { x0: x0 / VW, y0: y0 / VH, x1: (x0 + larg) / VW, y1: y1 / VH };

    /* ---- veredito ----
       MIRA: ninguém pode tapar, nunca. Nem elemento de canto (se ele for largo o
       bastante pra chegar no meio, o problema é dele).
       ARMA: elemento ANCORADO NA BORDA em px é ISENTO desta zona — é a convenção do
       gênero (munição/vida no canto) e os 3 frames de referência mostram o viewmodel
       SAINDO pelas duas bordas (references/viewmodel + ref_viewmodel.json
       `cruzaBordaDireita:true` nos 3). Quem não é de canto (flutuante/centrado) não
       tem esse direito: ele escolheu ficar no meio da tela.

       REGRA DE PISO, que NÃO depende de métrica de fonte (não existe browser aqui):
       elemento CENTRADO cobre x = 0,5 ± L/2, então invade a ZONA DA ARMA assim que
       L >= 2*(0,525-0,5)*1008 = 50 px e a ZONA DA MIRA assim que L >= 60 px. O padding
       sozinho do #pickup-hint já vale 38 px e QUALQUER string real passa dos 50 — o
       veredito de invasão da arma não depende do meu palpite de avanço de glifo. */
    const ancorado = (emPx(c['left']) || emPx(c['right'])) && (emPx(c['top']) || emPx(c['bottom']));
    const limArma = 2 * (ZONA_ARMA.x0 - 0.5) * VW, limMira = 2 * (0.5 - ZONA_MIRA.x0) * VW;
    let invade = null;
    if (cruza(caixa, ZONA_MIRA)) invade = 'ZONA DA MIRA';
    else if (!ancorado && cruza(caixa, ZONA_ARMA)) invade = 'ZONA DA ARMA (viewmodel)';
    achados.push({
      alvo: '#' + n.id, fonte: 'public/style.css', ancorado, centrado,
      caixa: [+caixa.x0.toFixed(3), +caixa.y0.toFixed(3), +caixa.x1.toFixed(3), +caixa.y1.toFixed(3)],
      largPx: +larg.toFixed(0), largMinPx: +b.largMin.toFixed(0),
      limiarArmaPx: +limArma.toFixed(0), limiarMiraPx: +limMira.toFixed(0),
      invade, ok: !invade,
    });
  }
  const falhas = achados.filter(a => !a.ok);
  return { nome: 'UI3', titulo: `ÁREA MORTA — nada do HUD sobre a mira (x ${ZONA_MIRA.x0.toFixed(3)}-${ZONA_MIRA.x1.toFixed(3)} / y ${ZONA_MIRA.y0.toFixed(3)}-${ZONA_MIRA.y1.toFixed(3)}) nem, se for flutuante, sobre o viewmodel (x>=${ZONA_ARMA.x0} / y>=${ZONA_ARMA.y0})`,
    ok: falhas.length === 0, achados, falhas };
}

/* ==========================================================================
   6. SIMULAÇÃO (UI2 e UI4) — o jogo REAL em node, via tools/eval/harness.mjs
   ========================================================================== */
const MAPAS = ['praca_poderes', 'piscina_treta', 'loja_h', 'ferro_velho'];
let ARVORE_HUD = null;   // preenchida no main, consumida por preparaDom()
/* SEMENTES DA UI4: 1 por caso (5 mapas × 2 modos = 10 corridas de até 600 s simulados).
   Duas sementes dobrariam o tempo de parede pra ~2,5 min sem mudar o veredito: o defeito
   3 é do MODO, não do sorteio (medido: CTF não fecha em NENHUMA semente). Mais sementes:
   `UI4_SEEDS=4242,777,31337 node tools/eval/ui-check.mjs ui4`. */
const SEEDS_UI4 = (process.env.UI4_SEEDS || '4242').split(',').map(Number);
/* Elementos NÃO-PERMANENTES: os que o game.js liga/desliga por classe. Vida, munição,
   placar do topo, radar e mira são PERMANENTES por design e ficam fora da UI2. */
const TRANSITORIOS = [
  ['pickupHint', 'hidden', '#pickup-hint'],
  ['prot', 'hidden', '#prot-badge'],
  ['reloadNote', 'hidden', '#reload-note'],
  ['respawn', 'hidden', '#respawn-overlay'],
  ['scoreboard', 'hidden', '#scoreboard'],
  ['radioMenu', 'hidden', '#radio-menu'],
  ['banner', '!show', '#round-banner'],
  ['mkBanner', '!show', '#mk-banner'],
  /* o killfeed não tem classe: ele é "visível" enquanto tiver LINHA. Entra na lista
     porque é ele que ancora o teto de 25% (é o transitório com o maior motivo legítimo
     de ficar aceso: 4,6 s por abate, game.js:2895). */
  ['killfeed', 'filhos', '#killfeed', false],   // medido, NÃO cobrado — ver TETO_POLUICAO
];

/* Captura o HUD QUE O JOGO ESCREVE (innerHTML de #ctf-hud e do #killfeed), pra UI1
   medir o artefato e não a minha leitura do fonte. Estados forçados de propósito:
   ponto NEUTRO, ponto do time P e ponto do time B, todos com captura pela metade —
   é o estado em que a barra de progresso existe e portanto pode ser medida. */
async function fragmentosDoHud(H) {
  H.seedRandom(7);
  const g = new H.Game({
    renderer: H.renderer, textures: H.textures, sfx: H.sfx,
    settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: H.PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B',
    nickname: 'SIM', mapId: 'loja_h', ctf: true, testMode: true, onQuit() {}, onMatchEnd() {},
  });
  g._ensureDolly = () => {};
  g.start ? g.start() : g._startRound();
  g.ctfPts.forEach((p, i) => { p.owner = [null, 'E', 'B'][i % 3]; p.prog = 0.5; p.capTeam = i % 2 ? 'E' : 'B'; });
  g.ctfCaps = { P: 2, B: 1 };
  g._updateCtfHud();
  const fr = [['ctf-hud', g.el.ctfHud.innerHTML, `public/js/game.js:${'_updateCtfHud'} (innerHTML medido)`]];
  // killfeed: as 3 variantes de linha (neutra, VOCÊ matou, VOCÊ morreu) + headshot
  g.el.killfeed.children.length = 0;
  const bots = g.bots;
  const alvoP = bots.find(b => b.team === 'E') || g.player, alvoB = bots.find(b => b.team === 'B') || g.player;
  g._feed(alvoB, alvoP, 'ak', true);            // linha neutra com caveira
  g._feed(g.player, alvoB, 'awp', true);        // VOCÊ matou
  g._feed(alvoB, g.player, 'ak', false);        // VOCÊ morreu
  const html = g.el.killfeed.children.map(r => `<div class="${r.className}">${r.innerHTML}</div>`).join('');
  fr.push(['killfeed', html, 'public/js/game.js:_feed (innerHTML medido)']);

  /* TEXTO REAL dos elementos que o JS preenche — a UI3 precisa da LARGURA, e a largura
     depende da string. Em vez de eu chutar "o nome de arma mais longo", teleporto o
     jogador pra cima de CADA arma do armário do piscina_treta (o mapa com mais pickups) e
     deixo o _updatePickups escrever o texto. O que a régua mede é a string do jogo. */
  const textos = {};
  H.seedRandom(11);
  const g2 = new H.Game({
    renderer: H.renderer, textures: H.textures, sfx: H.sfx,
    settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: H.PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B',
    nickname: 'SIM', mapId: 'piscina_treta', ctf: false, testMode: true, onQuit() {}, onMatchEnd() {},
  });
  g2._ensureDolly = () => {};
  g2.start ? g2.start() : g2._startRound();
  g2.state = 'live';
  let maior = '';
  for (const pk of [...(g2.world.pickups || []), ...g2.drops]) {
    /* +30 s de relógio a cada arma: o prompt tem período refratário (game.js:_updatePickups),
       então sem avançar o tempo só a PRIMEIRA arma produziria texto e a régua mediria uma
       string de 13 caracteres em vez das 35 do pior caso. */
    g2.time += 30;
    g2.player.pos.set(pk.x, g2.player.pos.y, pk.z);
    g2._updatePickups();
    const t = g2.el.pickupHint.textContent || '';
    if (t.length > maior.length) maior = t;
  }
  if (maior) textos['pickup-hint'] = maior;
  return { fragmentos: fr, textos };
}

async function carregaArnes() {
  // o namespace do módulo é congelado: copio o que uso e já monto as texturas uma vez só
  const h = await import('./harness.mjs');
  return { THREE: h.THREE, MAPS: h.MAPS, Game: h.Game, renderer: h.renderer, sfx: h.sfx,
    PCHAR: h.PCHAR, seedRandom: h.seedRandom, textures: h.initTextures() };
}

/* CENÁRIOS. Os dois são estados REAIS de um jogador, e a régua cobra o teto nos DOIS:
   - 'spawn'    : parado no ponto de nascimento. É onde o round começa, onde se volta a
                  cada 2,2 s de respawn (game.js:66) e é literalmente o protocolo com que
                  os screenshots do dono foram tirados (tools/eval/blind-capture.mjs:47
                  entra em ?auto= e não anda). É o pior caso, e é o caso do print.
   - 'patrulha' : o jogador é POSSUÍDO por um bot aliado — anda pelo mapa com a navegação
                  A* real do jogo, não com uma reta minha que encalha em parede. */
/* DOIS CONSERTOS DE INSTRUMENTO — sem eles a UI2 mede o arnês, não o jogo:

   (1) CLASSE INICIAL. O stub do harness cria cada elemento por getElementById com
       classList VAZIA. No HTML de verdade metade do HUD nasce com class="hidden"
       (#reload-note, #respawn-overlay, #radio-menu, #round-banner, #pickup-hint...).
       Sem semear isso, TODOS marcavam 100% de tempo visível — 4 falsos positivos que
       teriam me feito "consertar" o que não está quebrado.
   (2) RELÓGIO DOS setTimeout. O laço de simulação é síncrono: `g.update(DT)` roda
       60× por segundo simulado sem ceder o event loop, então NENHUM setTimeout do jogo
       dispara. E é setTimeout que apaga o banner de round (game.js:5530), que remove a
       linha do killfeed (game.js:2895) e que limpa os números de dano. Resultado: tudo
       que "some sozinho" ficava aceso pra sempre. Aqui o setTimeout é reimplementado
       sobre o RELÓGIO DA SIMULAÇÃO e drenado a cada frame — o mesmo truque que o jogo
       real tem de graça. */
function preparaDom(arvoreHud) {
  const els = globalThis.__els || (globalThis.__els = {});
  for (const n of achata(arvoreHud)) {
    if (!n.id) continue;
    const el = globalThis.document.getElementById(n.id);
    el.classList._s = new Set(n.cls);
    els[n.id] = el;
  }
}
function relogioVirtual() {
  const fila = [];
  let t = 0;
  const st0 = globalThis.setTimeout, ct0 = globalThis.clearTimeout;
  globalThis.setTimeout = (fn, ms = 0) => { const h = { t: t + ms / 1000, fn }; fila.push(h); return h; };
  globalThis.clearTimeout = (h) => { const i = fila.indexOf(h); if (i >= 0) fila.splice(i, 1); };
  return {
    avanca(dt) {
      t += dt;
      for (let i = fila.length - 1; i >= 0; i--) if (fila[i].t <= t) { const h = fila.splice(i, 1)[0]; try { h.fn(); } catch {} }
    },
    solta() { globalThis.setTimeout = st0; globalThis.clearTimeout = ct0; },
  };
}

async function simula(H, mapId, { ctf = false, cenario = 'patrulha', secs = 90, seed = 4242, bots = 4 } = {}) {
  const DT = 1 / 60;
  preparaDom(ARVORE_HUD);
  const relogio = relogioVirtual();
  H.seedRandom(seed);
  const g = new H.Game({
    renderer: H.renderer, textures: H.textures, sfx: H.sfx,
    settings: { bots, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: H.PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B',
    nickname: 'SIM', mapId, ctf, testMode: true, onQuit() {}, onMatchEnd() {},
  });
  g._ensureDolly = () => {};
  if (MUT_SIM) MUT_SIM(g);          // mutação que mora no game.js: aplicada no objeto bootado
  g.start ? g.start() : g._startRound();
  const anfitriao = cenario === 'patrulha' ? (g.bots.find(b => b.team === 'E') || g.bots[0]) : null;
  const P = g.player;
  P.hp = 1e9;                       // a UI2 mede a UI, não o duelo: jogador imortal
  const p0 = { x: P.pos.x, y: P.pos.y, z: P.pos.z };
  const cont = Object.fromEntries(TRANSITORIOS.map(([k]) => [k, 0]));
  const dists = [];
  const n0 = g._noteHit.bind(g);
  g._noteHit = (by, w, dmg, head, dist) => { if (Number.isFinite(dist)) dists.push(dist); return n0(by, w, dmg, head, dist); };
  let n = 0, nLive = 0, fim = null, maxPlacar = 0, maxCaps = 0, rounds = 0;
  /* ALVO DECLARADO PELO MODO. Infinity = "o modo não declara alvo nenhum" — era o caso do
     CAPTURA antes desta rodada, e é por isso que o placar do topo subia até o 65 × 53 do
     print do dono. Cada modo tem o SEU alvo, e a UI4 cobra o do modo em jogo. */
  const alvo = ctf ? g.capsToWin : g.killsToWin;
  /* RELÓGIO QUE O JOGADOR VÊ. A UI4 não pergunta ao game.js se ele "tem relógio": ela LÊ
     O TEXTO que o HUD escreveu, quadro a quadro, e decide pelo comportamento da série.
     Um relógio de ROUND reinicia pra cima toda rodada; um relógio de PARTIDA só desce.
     Ler o texto é o que impede a régua de ser enganada por um campo interno renomeado. */
  const relogioSerie = [];   // [{t, seg, round}] só quando o HUD MOSTRA mm:ss
  const r0 = g._startRound.bind(g); g._startRound = () => { rounds++; return r0(); };
  for (let i = 0; i < Math.round(secs / DT); i++) {
    g.update(DT);
    relogio.avanca(DT);
    if (anfitriao && anfitriao.alive) { P.pos.set(anfitriao.pos.x, anfitriao.pos.y, anfitriao.pos.z); P.yaw = anfitriao.yaw; }
    else if (!anfitriao) P.pos.set(p0.x, p0.y, p0.z);
    n++;
    maxPlacar = Math.max(maxPlacar, g.roundKills.P, g.roundKills.B);
    maxCaps = Math.max(maxCaps, (g.roundCaps && g.roundCaps.P) || 0, (g.roundCaps && g.roundCaps.B) || 0);
    if (g.state === 'live') {
      nLive++;
      const txt = `${(g.el.roundTime && g.el.roundTime.textContent) || ''} ${(g.el.roundsRow && g.el.roundsRow.textContent) || ''}`;
      const mm = txt.match(/(\d+):(\d\d)/);
      if (mm) relogioSerie.push({ t: g.time, seg: (+mm[1]) * 60 + (+mm[2]), round: g.roundNum });
    }
    for (const [k, modo] of TRANSITORIOS) {
      const el = g.el[k]; if (!el) continue;
      const visivel = modo === 'hidden' ? !el.classList.contains('hidden')
        : modo === 'filhos' ? el.children.length > 0
          : el.classList.contains('show');
      if (visivel) cont[k]++;
    }
    if (g.state === 'matchEnd' && fim === null) { fim = g.time; break; }
  }
  relogio.solta();
  return { mapId, ctf, cenario, alvo, n, fracao: Object.fromEntries(Object.entries(cont).map(([k, v]) => [k, v / n])),
    fim, maxPlacar, maxCaps, rounds, dists, relogioSerie, nLive };
}

async function ui2(H) {
  const linhas = [];
  for (const mapId of MAPAS) {
    for (const ctf of [false, true]) {
      for (const cenario of ['spawn', 'patrulha']) {
        const r = await simula(H, mapId, { ctf, cenario, secs: 90 });
        /* a série do relógio é INSUMO da UI4 (um registro por quadro, ~5 400 por corrida);
           guardá-la nas linhas da UI2 inflou o ui_check.json de 60 KB pra 4,4 MB na
           primeira corrida. O que interessa aqui é a fração de tempo dos transitórios. */
        delete r.relogioSerie;
        linhas.push(r);
      }
    }
  }
  const porElemento = {};
  for (const [k, , sel, cobra = true] of TRANSITORIOS) {
    let pior = -1, ondePior = null;
    for (const l of linhas) if (l.fracao[k] > pior) { pior = l.fracao[k]; ondePior = l; }
    porElemento[sel] = { pior: +pior.toFixed(3), onde: `${ondePior.mapId}/${ondePior.ctf ? 'ctf' : 'dm'}/${ondePior.cenario}`,
      cobrado: cobra, ok: !cobra || pior <= TETO_POLUICAO + 1e-9 };
  }
  const falhas = Object.entries(porElemento).filter(([, v]) => !v.ok).map(([k, v]) => ({ alvo: k, ...v }));
  return { nome: 'UI2', titulo: `POLUIÇÃO — elemento não-permanente <= ${(TETO_POLUICAO * 100) | 0}% do tempo (pior de 5 mapas × 2 modos × 2 cenários, 90 s cada)`,
    ok: falhas.length === 0, porElemento, falhas, linhas };
}

/* ==========================================================================
   6b. UI5 — PALETA CONTRA A REFERÊNCIA MEDIDA (references/telas/01..09)
   --------------------------------------------------------------------------
   POR QUE ESTE PORTÃO EXISTE
   O dono disse, depois de uma rodada inteira de UI: "a melhora de UI não ocorreu".
   A rodada anterior consertou 3 defeitos pontuais e ESCREVEU no cabeçalho deste arquivo
   que as telas de referência não existiam na árvore. Agora existem, e foram medidas
   (tools/eval/ref-ui.py -> ref_ui.json). Este portão é o que impede a próxima rodada de
   voltar a decidir cor por gosto: cada papel da paleta do jogo é comparado, em CIELAB,
   com o papel equivalente MEDIDO nas 9 telas.

   O QUE É COBRADO, E O QUE NÃO É
   Cobra-se CROMA e MATIZ. NÃO se cobra L*, de propósito: claridade aqui é orçamento de
   CONTRASTE e já tem dono (a UI1, que mede WCAG contra o pior fundo de cena medido).
   Trocar a régua de L* por "igual à referência" faria dois portões brigarem pelo mesmo
   pixel — e a UI1 é a que tem consequência de acessibilidade.

   OS TETOS
     ΔC* <= 4   — o teto NÃO é redondo por acaso: ele é o corte que SEPARA os tokens que
                  produziam o "tudo azulado" dos que nunca incomodaram ninguém. Medido nos
                  valores ANTIGOS desta base contra o papel equivalente da referência:
                     --ink-100 #e9f1f3  C* 3,0 vs 1,5 -> ΔC* 1,5   (ninguém reclamou)
                     --ink-200 #c6d6db  C* 6,1 vs 1,5 -> ΔC* 4,6   (parte do véu ciano)
                     --ink-300 #93a8b0  C* 8,6 vs 1,1 -> ΔC* 7,5   (o pior; é o rótulo)
                     --ink-400 #63787f  C* 8,8 vs 1,1 -> ΔC* 7,7
                  4,0 reprova os três que carregam o véu e absolve o que não carrega. Um
                  teto de 8 (a 1ª tentativa deste portão) deixava o --ink-300 passar por
                  0,5 — a mutação `ui5_tinta_ciano` ficava VERDE, e um portão que não
                  reprova o defeito que o motivou é decoração.
     Δh  <= 25° — só vale quando AS DUAS cores têm C* >= 10. Abaixo disso o matiz é ruído
                  numérico (um cinza com C* 1,4 tem matiz aleatório: a referência mede
                  h 129° no fundo e h 110° na tinta, e é o MESMO cinza).
     b*  >= 0    — O EIXO AZUL↔AMARELO, e é a cláusula que faltava. Este portão nasceu
                  deixando --bg-900/800/700 FORA ("medido, não cobrado") porque metade dos
                  scrims era literal no CSS. Os literais morreram (style.css agora deriva
                  tudo de --bg-900-rgb) e os fundos entraram — mas entrar não bastava:
                  como fundo é NEUTRO (C* 1-6), as duas cláusulas acima são CEGAS pra ele.
                  A azul #05080b tem C* 1,5 e passaria em ΔC* por 0,1; o matiz nem é
                  cobrado, porque C* < 10. Um portão que aceita o defeito que o motivou é
                  decoração — de novo.
                  O que SEPARA os dois casos, e separa com folga, é o SINAL de b*:
                     referência  fundo +1,08 · painel +4,43 · tinta_alta +1,44 · média +1,05
                     azul antigo bg-900 -1,42 · bg-800 -3,79 · bg-700 -6,28
                     corrigido   bg-900 +1,32 · bg-800 +3,98 · bg-700 +4,58
                  Não existe uma cor da referência com b* negativo, e não existia uma cor
                  azul desta base com b* positivo. O corte em 0 tem +1,05 de folga de um
                  lado e -1,42 do outro. A mutação `ui5_fundo_azul` devolve o triplo antigo
                  e TEM que ficar vermelha; sem essa cláusula ela ficava VERDE. */
const UI5_DC = 4, UI5_DH = 25, UI5_CMIN_H = 10, UI5_B_MIN = 0;
const UI5_PAPEIS = [
  ['--ink-100', 'tinta_alta', true, 'números de HUD e títulos'],
  ['--ink-200', 'tinta_alta', true, 'corpo de texto'],
  ['--ink-300', 'tinta_media', true, 'rótulos/meta'],
  ['--ink-400', 'tinta_media', true, 'régua/ícone decorativo'],
  ['--am', 'acento', true, 'objetivo e conquista'],
  ['--bg-900', 'fundo', true, 'fundo de tela'],
  ['--bg-800', 'painel', true, 'painel'],
  ['--bg-700', 'painel', true, 'painel 2'],
];
function ui5(ctxCss) {
  let ref = null;
  try { ref = JSON.parse(readFileSync(path.join(HERE, 'ref_ui.json'), 'utf8')); } catch { /* ausente */ }
  if (!ref || !ref.consenso) {
    return { nome: 'UI5', titulo: 'PALETA CONTRA A REFERÊNCIA — ref_ui.json ausente; rode `python3 tools/eval/ref-ui.py`',
      ok: true, pulado: true, achados: [] };
  }
  const achados = [];
  for (const [token, papel, cobrado, uso] of UI5_PAPEIS) {
    const alvo = ref.consenso[papel];
    const meu = parseCor(resolveVar(ctxCss.vars[token] || '', ctxCss.vars));
    if (!alvo || !meu) { achados.push({ token, papel, erro: 'sem cor', cobrado, ok: true }); continue; }
    const A = lab(meu), B = lab(parseCor(alvo.hexNucleo));
    const dC = Math.abs(A.C - B.C);
    const dhBruto = Math.abs(A.h - B.h);
    const dh = Math.min(dhBruto, 360 - dhBruto);
    const matizVale = A.C >= UI5_CMIN_H && B.C >= UI5_CMIN_H;
    /* b* do EIXO AZUL↔AMARELO. Vale pra TODO papel, não só pros fundos: é a única
       cláusula que enxerga "azulado" quando o croma é baixo demais pro matiz valer. */
    const bOk = A.b >= UI5_B_MIN;
    const ok = !cobrado || (dC <= UI5_DC && (!matizVale || dh <= UI5_DH) && bOk);
    achados.push({ token, papel, uso, cobrado, ok, bOk, b: +A.b.toFixed(2), bRef: +B.b.toFixed(2),
      meuHex: '#' + meu.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join(''),
      refHex: alvo.hexNucleo,
      meu: { L: +A.L.toFixed(1), C: +A.C.toFixed(1), h: +A.h.toFixed(1) },
      ref: { L: +B.L.toFixed(1), C: +B.C.toFixed(1), h: +B.h.toFixed(1) },
      dC: +dC.toFixed(1), dh: matizVale ? +dh.toFixed(1) : null });
  }
  const falhas = achados.filter(a => !a.ok);
  return { nome: 'UI5', titulo: `PALETA — cada papel do jogo dentro de ΔC* <= ${UI5_DC}, Δh <= ${UI5_DH}° e b* >= ${UI5_B_MIN} (nada de azulado) do MESMO papel medido nas 9 telas (tools/eval/ref_ui.json)`,
    ok: falhas.length === 0, achados, falhas };
}

/* Classifica a SÉRIE do relógio visível numa corrida. É o coração da UI4 nova: ela não
   pergunta "o modo tem timer?", ela olha o que o HUD escreveu e classifica o padrão.
     'ausente'      — o HUD nunca mostrou mm:ss em estado 'live'
     'round'        — a série REINICIA pra cima (o valor sobe quando a rodada troca):
                      é a assinatura de um cronômetro DE ROUND. Foi isto que o dono viu.
     'partida'      — a série só desce e cobre uma fração pequena do jogo: relógio de
                      PARTIDA aparecendo na reta final.
     'partida-longa'— só desce, mas fica aceso além do teto: é relógio de partida na cara
                      do jogador o jogo inteiro, e pro CAPTURA isso também reprova. */
function classificaRelogio(r) {
  const s = r.relogioSerie;
  if (!s.length) return { tipo: 'ausente', fracao: 0, reinicios: 0, maiorSalto: 0 };
  let reinicios = 0, maiorSalto = 0;
  for (let i = 1; i < s.length; i++) {
    const d = s[i].seg - s[i - 1].seg;
    /* +2 s de tolerância: o texto é `Math.ceil` de um float, então subir 1 s entre dois
       quadros é arredondamento, não reinício. Um reinício de round pula dezenas. */
    if (d > 2) { reinicios++; maiorSalto = Math.max(maiorSalto, d); }
  }
  const fracao = r.nLive ? s.length / r.nLive : 0;
  if (reinicios > 0) return { tipo: 'round', fracao, reinicios, maiorSalto };
  return { tipo: fracao <= TETO_RELOGIO_CTF ? 'partida' : 'partida-longa', fracao, reinicios, maiorSalto };
}

async function ui4(H) {
  const casos = [];
  for (const mapId of MAPAS) {
    for (const ctf of [false, true]) {
      for (const seed of SEEDS_UI4) {
        const teto = ctf ? TETO_CTF_S : TETO_DM_S;
        const r = await simula(H, mapId, { ctf, cenario: 'patrulha', secs: teto + 120, seed });
        /* TRÊS CRITÉRIOS, e o terceiro é o que faltava na régua anterior:
           (1) FECHA:  a partida chega a state='matchEnd' dentro do teto DO MODO.
           (2) ALVO:   o modo DECLARA um alvo finito (abates no dm, capturas no ctf) e o
                       placar da rodada nunca passa dele. Alvo = Infinity é "o modo não
                       declara nada" — era o CAPTURA antes, e é a origem do 65 × 53.
           (3) FORMATO DO RELÓGIO: dm PRECISA de cronômetro de round; ctf NÃO PODE ter.
               Sem este critério a régua aceita (e premia) transformar CTF em deathmatch
               cronometrado, que foi exatamente a regressão desta base. */
        const fecha = r.fim !== null && r.fim <= teto;
        const temAlvo = Number.isFinite(r.alvo);
        const placarDoModo = ctf ? r.maxCaps : r.maxPlacar;
        const dentroDoAlvo = temAlvo && placarDoModo <= r.alvo;
        const rel = classificaRelogio(r);
        const relogioOk = ctf ? (rel.tipo === 'ausente' || rel.tipo === 'partida')
          : rel.tipo === 'round';
        casos.push({ mapId, modo: ctf ? 'ctf' : 'dm', seed, teto, fim: r.fim, rounds: r.rounds,
          placarDoModo, alvo: temAlvo ? r.alvo : null,
          relogio: rel.tipo, relogioFrac: +rel.fracao.toFixed(3), reinicios: rel.reinicios,
          fecha, dentroDoAlvo, relogioOk, ok: fecha && dentroDoAlvo && relogioOk });
      }
    }
  }
  const falhas = casos.filter(c => !c.ok);
  return { nome: 'UI4',
    titulo: `RITMO POR MODO — ABATE fecha <= ${TETO_DM_S}s COM cronômetro de round; CAPTURA fecha <= ${TETO_CTF_S}s SEM cronômetro de round (relógio de partida <= ${(TETO_RELOGIO_CTF * 100) | 0}% dos quadros e sempre descendo)`,
    ok: falhas.length === 0, casos, falhas };
}

/* ==========================================================================
   7. MUTAÇÕES — provam que a régua NÃO passa de graça
   ========================================================================== */
/* Cada mutação DESFAZ um dos consertos desta rodada (ou fura um portão de propósito) e
   diz qual portão TEM que ficar vermelho. Uma régua que não reprova a versão anterior do
   próprio arquivo não é régua, é decoração. `css` mexe no public/style.css lido em
   memória; `sim` mexe no objeto Game já bootado (pra desfazer coisa que mora no game.js
   sem ter que reescrever o arquivo em disco no meio de uma rodada com outros agentes). */
const MUTACOES = {
  /* A MUTAÇÃO QUE PROVA A CLÁUSULA b*. Devolve o triplo azul de antes do BUG-05. Como o
     style.css agora DERIVA token e scrim do mesmo `--bg-900-rgb`, uma linha desfaz a
     rodada inteira — que é exatamente por isso que ela é o teste certo. Sem `UI5_B_MIN`
     esta mutação passa VERDE (ΔC* do azul contra o fundo da referência é 0,1). */
  ui5_fundo_azul: {
    portao: 'UI5', o_que: 'volta as superfícies pro azul-asfalto de antes (--bg-900/800/700 h ~253°)',
    css: (c) => c.replace('--bg-900-rgb:9,7,4;      --bg-800-rgb:20,16,8;    --bg-700-rgb:28,24,18;',
      '--bg-900-rgb:5,8,11;     --bg-800-rgb:10,17,22;   --bg-700-rgb:16,26,33;'),
  },
  /* APOSENTADA — e a aposentadoria fica registrada em vez de a linha sumir.
     `ui1_ctf_scrim_fraco` devolvia o `#ctf-hud{background:...92}` pro .55 de antes. Esse
     `background` NÃO EXISTE MAIS: saiu a pedido do dono em 06/08 ("tirar o bg e deixar
     transparente"), e quem segura o contraste da barra de captura hoje é o poço escuro
     montado INLINE no `_updateCtfHud` do game.js. O sistema de mutação só sabe remendar
     texto de CSS, então não há como escrever esta prova aqui.
     Conferido: ela já saía com `não casou com nada` em 7222a16, antes do bloco 1 - ou
     seja, a suíte vinha rodando com uma mutação morta, que é uma régua dizendo "provei"
     sem ter provado.

     TENTEI SUBSTITUÍ-LA POR UMA DA BARRA DE VIDA E NÃO CONSEGUI - fica o registro, porque
     a tentativa expõe um BURACO REAL DE COBERTURA desta régua:
     a barra de vida foi o pior número do HUD nas capturas do bloco 2 (1,07:1 sobre o
     azulejo do Piscinão), e nenhuma cláusula daqui pega isso. A (c) só roda sobre os
     fragmentos que o game.js monta em runtime (faixa de CTF, killfeed); a (d) mede
     `#hp-fill × #hp-bar`, isto é, preenchimento contra TRILHO - que passa fácil. O que
     ninguém mede é a barra contra a CENA, e com a vida cheia o preenchimento cobre o
     trilho inteiro, então quem encosta no cenário é o âmbar.
     Escrevi a mutação (voltar o fundo pro .8) e ela passa VERDE: o fio de 1px da borda
     sozinho satisfaz a conta de 3:1 do WCAG, ainda que seja imperceptível nesse tamanho.
     Fechar isso direito exige modelo de ESPESSURA - contraste de fio fino não vale o mesmo
     que contraste de área - e isso é mudança de modelo, não remendo de mutação. Fica
     declarado aqui em vez de virar mutação de mentira. */
  ui1_sem_contorno: {
    portao: 'UI1', o_que: 'apaga o contorno --sh-hud: tudo que depende do halo tem que cair',
    css: (c) => c.replace(/--sh-hud:[^;]+;/, '--sh-hud:none;'),
  },
  /* A MUTAÇÃO QUE PROVA O MODELO DE DOSE, e a razão de ele existir. Devolve o --sh-hud
     só-de-borrões de antes do bloco 2 — o valor cujas capturas estão ilegíveis sobre o
     azulejo do Piscinão (timer 2,23:1, rótulo VIDA 1,26:1).
     ELA PASSAVA VERDE NO MODELO ANTIGO: o crédito era casamento de substring, e este valor
     casa `/0 0 2px/` E `/rgba(0,0,0,.95)/` — então a régua creditava fundo preto OPACO e
     não via defeito nenhum. Com alfa × cobertura de perímetro a mesma string entrega 0,35
     de cama, e os rótulos pequenos (que não têm text-stroke pra segurar) caem.
     Se um dia esta mutação voltar a passar VERDE, o crédito virou substring de novo. */
  ui1_so_borrao: {
    portao: 'UI1', o_que: 'devolve o --sh-hud só-de-borrões de antes do bloco 2 (passava verde na régua antiga)',
    css: (c) => c.replace(
      /--sh-hud:[^;]+;/,
      '--sh-hud:0 0 2px rgba(0,0,0,.95),0 1px 3px rgba(0,0,0,.9),0 0 10px rgba(0,0,0,.55);',
    ),
  },
  ui1_killfeed_tint: {
    portao: 'UI1', o_que: 'volta o killfeed "VOCÊ matou/morreu" pro tingimento translúcido de antes',
    css: (c) => c.replace('.kf-row.me-atk{background:rgba(9,38,42,.92)', '.kf-row.me-atk{background:rgba(57,214,224,.16)')
      .replace('.kf-row.me-vic{background:rgba(44,10,10,.92)', '.kf-row.me-vic{background:rgba(255,77,77,.18)'),
  },
  ui3_prompt_como_antes: {
    portao: 'UI3', o_que: 'devolve o prompt do [E] pro centro-baixo (left:50%/top:58%) — o estado do print',
    css: (c) => c.replace('#pickup-hint{position:absolute;left:68px;bottom:134px;',
      '#pickup-hint{position:absolute;left:50%;top:58%;transform:translateX(-50%);'),
  },
  ui3_prompt_na_mira: {
    portao: 'UI3', o_que: 'põe o prompt do [E] no centro EXATO da tela',
    css: (c) => c.replace('#pickup-hint{position:absolute;left:68px;bottom:134px;',
      '#pickup-hint{position:absolute;left:50%;top:50%;transform:translateX(-50%);'),
  },
  ui2_prompt_eterno: {
    portao: 'UI2', o_que: 'desfaz o tempo de vida + refratário: prompt aceso sempre que houver arma perto (regra antiga)',
    sim: (g) => { const f = g._updatePickups.bind(g); g._updatePickups = () => { f(); if (g.nearPickup && g.state === 'live') g.el.pickupHint.classList.remove('hidden'); }; },
  },
  /* ---- AS DUAS MUTAÇÕES DA UI4: os dois defeitos OPOSTOS que a régua tem que separar.
     Elas existem em par de propósito. A régua anterior só sabia pegar o primeiro, e por
     isso premiou a correção que criou o segundo. Se um dia alguém "simplificar" a UI4
     removendo o critério de formato de relógio, `ui4_ctf_relogio_de_round` fica VERDE e
     a simplificação se denuncia sozinha. ---- */
  ui4_ctf_nunca_fecha: {
    portao: 'UI4', o_que: 'DEFEITO A — volta o CAPTURA pro estado "round infinito": sem relógio de partida, sem alvo de capturas e exigindo 3 vitórias de rodada (é o modo como o dono o encontrou, com o placar do topo subindo até 65 × 53)',
    sim: (g) => {
      if (!g.ctf) return;
      g.capsToWin = Infinity;
      g.ctfMatchLeft = Infinity;
      g._checkPace = () => {};
      g._fimDaPartida = () => g.roundsWon.P >= 3 || g.roundsWon.B >= 3;
    },
  },
  ui4_ctf_relogio_de_round: {
    portao: 'UI4', o_que: 'DEFEITO B — devolve ao CAPTURA o cronômetro de 99 s POR RODADA no HUD (a regressão que o dono pegou no ferro velho do Zé: "o captura estava com cronometragem")',
    sim: (g) => {
      if (!g.ctf) return;
      const u = g.update.bind(g);
      g.timeLeft = 99;
      g.update = (dt) => {
        const r = u(dt);
        if (g.state === 'live') {
          g.timeLeft -= dt;
          if (g.timeLeft <= 0) g.timeLeft = 99;      // reinicia igual a um round de abate
          const t = Math.max(0, Math.ceil(g.timeLeft));
          // escreve DEPOIS do _updateHud do jogo: é o texto final que o jogador leria
          g.el.roundTime.textContent = `CAPTURA ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
        }
        return r;
      };
    },
  },
  ui5_tinta_ciano: {
    portao: 'UI5', o_que: 'volta a tinta pro ciano de antes (--ink-300 #93a8b0, C* 8,6 contra 1,1 da referência) — é o "tudo azulado" que o dono viu',
    css: (c) => c.replace('--ink-300:#a5a5a3;', '--ink-300:#93a8b0;').replace('--ink-400:#757573;', '--ink-400:#63787f;'),
  },
  ui5_acento_fora_de_matiz: {
    portao: 'UI5', o_que: 'gira o âmbar do objetivo pro laranja-vermelho (h 79° -> 40°), longe do acento medido nas 9 telas',
    css: (c) => c.replace('--am:#f3b958;', '--am:#f37b58;'),
  },
  ui4_sem_teto_de_rodadas: {
    portao: 'UI4', o_que: 'desfaz o teto de rodadas nos DOIS modos (volta a exigir 3 vitórias, com empate travando a partida)',
    sim: (g) => { g._fimDaPartida = () => g.roundsWon.P >= 3 || g.roundsWon.B >= 3; },
  },
};
const MUT_SIM = MUT && MUTACOES[MUT] && MUTACOES[MUT].sim ? MUTACOES[MUT].sim : null;

/* ==========================================================================
   8. MAIN
   ========================================================================== */
function caixasAproximadas(regras, vars, arvore) {
  // caixa em fração de tela por id — só pra saber ONDE cai o scrim de canto na UI1
  const out = {};
  for (const n of achata(arvore)) {
    if (!n.id) continue;
    const c = n.__comp || (n.__comp = computa(n, regras, vars));
    if (!/absolute|fixed/.test(c['position'] || '')) continue;
    const b = caixaDe(c, n.texto);
    let y0 = b.y.topo != null ? b.y.topo : (b.y.base != null ? VH - b.y.base - b.alt : VH / 2);
    if (b.centrY) y0 -= b.alt / 2;
    let x0 = b.x.esq != null ? b.x.esq : (b.x.dir != null ? VW - b.x.dir - (b.decl ?? b.largEst) : VW / 2);
    if (b.centrX) x0 -= (b.decl ?? b.largEst) / 2;
    out[n.id] = { x0: x0 / VW, y0: y0 / VH, x1: (x0 + (b.decl ?? b.largEst)) / VW, y1: (y0 + b.alt) / VH };
  }
  return out;
}

let cssTxt = readFileSync(CSS_PATH, 'utf8');
if (MUT) {
  const m = MUTACOES[MUT];
  if (!m) { console.error(`mutação desconhecida: ${MUT}. conhecidas: ${Object.keys(MUTACOES).join(', ')}`); process.exit(2); }
  if (m.css) {
    const antes = cssTxt;
    cssTxt = m.css(cssTxt);
    if (cssTxt === antes) { console.error(`mutação ${MUT} não casou com nada — o CSS mudou de forma`); process.exit(2); }
  }
  console.log(`### MUTAÇÃO ATIVA: ${MUT} (espera ${m.portao} VERMELHA) — ${m.o_que}\n`);
}
const regras = parseCss(cssTxt);
const vars = montaVars(regras);
const { html, linha0 } = recortaHud(readFileSync(ASTRO_PATH, 'utf8'));
const arvore = parseArvore(html, linha0);
/* O #hud é filho de <body>, e `body{color:var(--ink1);font-family:...}` (style.css:93)
   é de onde vem a cor de tudo que não declara a sua. Sem plantar isso na raiz, `.rip`
   ("ELIMINADO") e o texto solto do #respawn-overlay saíam da conta por falta de cor. */
{
  arvore.__comp = {};
  for (const r of regras) {
    if (!r.sels.some(s => s === 'body' || s === 'html' || s === 'html,body')) continue;
    // SÓ o que HERDA. O `background:var(--dark)` do body NÃO conta: o HUD é desenhado
    // por cima do canvas 3D, não por cima do body — usar o body como fundo daria um
    // preto opaco de graça e a régua passaria tudo (foi o que aconteceu na 1ª tentativa).
    for (const k of HERDA) if (r.decls[k] !== undefined) arvore.__comp[k] = resolveVar(r.decls[k], vars);
  }
}
for (const n of achata(arvore)) n.__comp = computa(n, regras, vars);
const caixas = caixasAproximadas(regras, vars, arvore);
const ctxCss = { regras, vars, arvore, caixas };
ARVORE_HUD = arvore;

const res = [];
/* O arnês sobe SEMPRE: a UI1 mede o HUD que o jogo escreve e a UI3 mede a LARGURA da
   string que o jogo escreve. Ler só o .astro/.css mediria um HUD que não existe. */
const H = await carregaArnes();
const sonda = await fragmentosDoHud(H);
ctxCss.fragmentos = sonda.fragmentos;
ctxCss.textos = sonda.textos;
if (ALVO === 'all' || ALVO === 'ui1') res.push(ui1(ctxCss));
if (ALVO === 'all' || ALVO === 'ui3') res.push(ui3(ctxCss));
if (ALVO === 'all' || ALVO === 'ui5') res.push(ui5(ctxCss));
if (ALVO === 'all' || ALVO === 'ui2') res.push(await ui2(H));
if (ALVO === 'all' || ALVO === 'ui4') res.push(await ui4(H));

let vermelhas = 0;
for (const r of res) {
  console.log(`\n${r.ok ? '✓ PASSA' : '✗ FALHA'}  ${r.nome}  ${r.titulo}`);
  if (!r.ok) vermelhas++;
  if (r.nome === 'UI1') {
    const ord = r.achados.slice().sort((a, b) => a.razao - b.razao);
    for (const a of ord.slice(0, 14))
      console.log(`   ${a.ok ? '·' : '✗'} ${String(a.razao).padStart(6)}:1 (min ${a.min})  ${a.alvo}  [${a.tipo}]  ${a.fonte}`);
    console.log(`   ${r.achados.length} itens medidos, ${r.falhas.length} abaixo do mínimo`);
  } else if (r.nome === 'UI3') {
    for (const a of r.achados) {
      if (a.isento) { console.log(`   · ISENTO ${a.alvo} — ${a.isento}`); continue; }
      console.log(`   ${a.ok ? '·' : '✗'} ${a.alvo.padEnd(18)} caixa=[${a.caixa}]  larg=${a.largPx}px (piso ${a.largMinPx}px; limiar arma ${a.limiarArmaPx}px / mira ${a.limiarMiraPx}px)  ${a.ancorado ? 'canto' : a.centrado ? 'centrado' : 'flutuante'}${a.invade ? '  ✗ INVADE ' + a.invade : ''}`);
    }
  } else if (r.nome === 'UI2') {
    for (const [k, v] of Object.entries(r.porElemento))
      console.log(`   ${v.cobrado ? (v.ok ? '·' : '✗') : '~'} ${String((v.pior * 100).toFixed(1)).padStart(5)}% do tempo  ${k}  (pior: ${v.onde})${v.cobrado ? '' : '  [medido, fora do portão]'}`);
  } else if (r.nome === 'UI5') {
    for (const a of r.achados) {
      if (a.erro) { console.log(`   ~ ${a.token.padEnd(10)} ${a.erro}`); continue; }
      console.log(`   ${a.cobrado ? (a.ok ? '·' : '✗') : '~'} ${a.token.padEnd(10)} ${a.meuHex} vs ${a.refHex} (${a.papel})  ` +
        `jogo L*${String(a.meu.L).padStart(5)} C*${String(a.meu.C).padStart(5)} h${String(a.meu.h).padStart(5)}  |  ` +
        `ref L*${String(a.ref.L).padStart(5)} C*${String(a.ref.C).padStart(5)} h${String(a.ref.h).padStart(5)}  ` +
        `ΔC*=${a.dC}${a.dh === null ? ' (matiz: croma baixo demais pra cobrar)' : ' Δh=' + a.dh + '°'}` +
        `  b*=${a.b}${a.bOk ? '' : ' ✗ AZULADO'} (ref ${a.bRef})` +
        `${a.cobrado ? '' : '  [medido, fora do portão]'}`);
    }
  } else if (r.nome === 'UI4') {
    for (const c of r.casos)
      console.log(`   ${c.ok ? '·' : '✗'} ${c.modo.toUpperCase().padEnd(3)} ${c.mapId.padEnd(14)} fim=${(c.fim === null ? `NUNCA(>${c.teto}s)` : c.fim.toFixed(0) + 's').padEnd(13)} rounds=${c.rounds}  maiorPlacarDeRodada=${String(c.placarDoModo).padStart(2)}  alvoDeclarado=${String(c.alvo === null ? 'NENHUM' : c.alvo).padEnd(6)} relogio=${c.relogio.padEnd(13)} ${String((c.relogioFrac * 100).toFixed(0)).padStart(3)}% dos quadros${c.ok ? '' : '   ✗ ' + [!c.fecha && 'NÃO FECHA', !c.dentroDoAlvo && 'SEM ALVO/ACIMA DO ALVO', !c.relogioOk && (c.modo === 'ctf' ? 'CRONÔMETRO DE ROUND NO CTF' : 'SEM CRONÔMETRO DE ROUND NO ABATE')].filter(Boolean).join(' + ')}`);
  }
}
console.log(`\n--------------------------------------------------------`);
console.log(`UI: ${res.length - vermelhas}/${res.length} portões passam` + (vermelhas ? `  ← ${res.filter(r => !r.ok).map(r => r.nome).join(', ')} VERMELHAS` : ''));
console.log(`--------------------------------------------------------`);
if (JSON_OUT) writeFileSync(path.join(HERE, 'ui_check.json'), JSON.stringify({ gerado: new Date().toISOString(), zonaMira: ZONA_MIRA, zonaArma: ZONA_ARMA, cenaPior: CENA_PIOR, res }, null, 1));
process.exit(vermelhas ? 1 : 0);
