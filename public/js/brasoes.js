/* brasoes.js — BANDEIRA DE FACÇÃO: COR DO TIME + BRASÃO, NUM CANVAS SÓ.
   ═══════════════════════════════════════════════════════════════════════════════════
   O PEDIDO QUE CRIOU ESTE ARQUIVO

   *"os funkeiros não têm logo pra bandeira. vamos pôr as bandeiras com a cor do time +
   brasão."* — e era literal: `_loadCtfSymbols()` do `game.js` carregava quatro emblemas
   (`img/symbols/{p,b,u,c}.png`) e nenhum para F. A bandeira dos funkeiros era pano liso.

   ── O BRASÃO DOS FUNKEIROS NASCEU DO GLB, NÃO DE UMA DESCRIÇÃO ───────────────────
   A lição mais cara do projeto está na docstring de `tools/eval/team-plate.mjs`:
   **gerador de imagem por texto desenha o arquétipo, não o teu personagem** — uma leva
   de placas de facção foi reprovada por isso. Então o emblema F saiu de
   `tools/eval/brasao-ref.mjs`, que RENDERIZA a cabeça de `oakley.glb` (o mesmo
   `buildCharacterModel()` da tela de seleção) e entrega o PNG como referência ao
   gerador. A diferença apareceu na hora: o texto de `characters.js:563` diz "Chapéu
   Medusa", e o modelo de verdade mostra o que isso É — capuz com MECHAS LONGAS caindo
   dos dois lados como as cobras da Medusa, e ÓCULOS DE PROTEÇÃO ERGUIDOS NA TESTA (não
   óculos escuros sobre os olhos, que é o que qualquer prompt teria desenhado).

   ── POR QUE A COR ENTRA NO CANVAS E NÃO NO MATERIAL ──────────────────────────────
   O caminho antigo pintava pano CLARO (`#e8e6e2`) e deixava `material.color` do time
   MULTIPLICAR. Isso tinge o pano e o emblema junto: numa bandeira dourada o emblema
   dourado dos funkeiros sumiria dentro do próprio fundo. Aqui o pano já sai na cor do
   time e o brasão é desenhado POR CIMA, em cor cheia — é o que garante que a massa
   escura do emblema continue separando do fundo. Quem consome esta textura precisa
   manter `material.color` BRANCO, senão tinge duas vezes.

   CONTRATO (não mude a assinatura — o chamador já tem a guarda escrita para ela):
     bandeiraTextura(teamId) -> THREE.CanvasTexture   (cor do time + brasão)
                             -> null                  (facção sem brasão; o chamador
                                                       mantém o visual atual)

     `teamId` é a LETRA DA FACÇÃO — 'P','B','U','C','F' —, que é o que `_factionOf(side)`
     devolve; NÃO é o lado da partida. A diferença morde justamente no 'B': como lado ele
     quer dizer "time B", como facção quer dizer Bolsonaristas, e os dois só coincidem por
     acidente. Passar o lado cru entrega a bandeira errada sem erro nenhum no console.
     Minúscula também serve (normaliza), e qualquer outra coisa devolve `null`.
   ═══════════════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { FACTIONS, factionColor } from './factions.js';

/* PALETA DO TIME — espelha `Game._teamColor()` (`public/js/game.js`, bloco "Capture the
   Flag"): P vermelho, B verde, U azul, C rosa-circo, F ouro. É espelho declarado, pelo
   mesmo motivo e no mesmo formato que `TEAM_RIM` em `characters.js:105` já faz: o
   original é MÉTODO DE INSTÂNCIA da classe `Game` (depende de `_mirror`/`_factionOf`,
   que são estado de partida), então não há o que importar. Se a paleta mudar lá, muda
   aqui — `tools/eval/brasao-check.mjs` falha se os dois discordarem. */
/* `E` e não `P` (07/08): o rename Time E de 06/08 trocou a letra no `BRASAO` logo abaixo
   e no arquivo (`img/brasoes/p.png` -> `e.png`) e ESQUECEU esta linha. Com `COR_TIME['E']`
   indefinido, `bandeiraTextura('E')` saía por `!cor` na primeira linha e devolvia `null` —
   a bandeira do time do jogador ficava sem cor E sem brasão, os dois de uma vez, que foi
   como o defeito chegou: *"quando captura bandeira não pinta de vermelho e nem põe o
   brasão"*. Régua: `tools/eval/faccao-paleta-check.mjs`. */
const COR_TIME = Object.fromEntries(FACTIONS.map((f) => [f.id, factionColor(f.id)]));

/* Só estas cinco têm brasão. Facção fora da lista devolve `null` de propósito: é o sinal
   combinado com o chamador para ele manter o pano que já desenhava. */
// E: arquivo renomeado p.png->e.png no rename Time E (06/08)
const BRASAO = Object.fromEntries(FACTIONS.map((f) => [f.id, f.crest]));

const W = 512, H = 320;          // 1,6:1 — a mesma proporção do pano que o jogo já usava
const EMB = 0.74;                // altura do brasão como fração da altura do pano
const EMB_CY = 0.5125;           // centro vertical do brasão (o mesmo 82/160 de antes)

const _cache = new Map();
const _img = new Map();

/* Carrega o PNG do brasão UMA vez por facção e, quando ele chega, repinta as texturas
   que já foram entregues. Sem isto a primeira bandeira do round sairia sem emblema —
   é exatamente o que `_loadCtfSymbols()` resolvia com o mesmo padrão de repintura. */
function imagemDoBrasao(fac, aoCarregar) {
  let e = _img.get(fac);
  if (!e) {
    const img = new Image();
    e = { img, pronta: false, espera: [] };
    _img.set(fac, e);
    img.onload = () => { e.pronta = true; for (const fn of e.espera) fn(); e.espera.length = 0; };
    img.onerror = () => { e.espera.length = 0; };   // sem brasão o pano fica só na cor do time
    img.src = `img/brasoes/${BRASAO[fac]}.png`;
  }
  if (e.pronta) aoCarregar();
  else e.espera.push(aoCarregar);
  return e;
}

/* Pano: cor do time + ondulação + peso embaixo + sujeira + ponta desfiada e vinco no
   mastro. A mesma receita (e a mesma semente 163) do pano que já estava no ar, para a
   bandeira não mudar de textura junto com a mudança de cor — só o que foi pedido muda. */
function pintaPano(x, cor) {
  let semente = 163;
  const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
  x.fillStyle = cor; x.fillRect(0, 0, W, H);
  const faixa = W / 7;
  for (let i = 0; i < 7; i++) {
    const g = x.createLinearGradient(i * faixa, 0, (i + 1) * faixa, 0);
    g.addColorStop(0, 'rgba(28,24,18,0.30)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.24)');
    g.addColorStop(1, 'rgba(28,24,18,0.30)');
    x.fillStyle = g; x.fillRect(i * faixa, 0, faixa, H);
  }
  const gb = x.createLinearGradient(0, 0, 0, H);
  gb.addColorStop(0, 'rgba(255,255,255,0.10)');
  gb.addColorStop(1, 'rgba(30,26,20,0.34)');
  x.fillStyle = gb; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 80; i++) {
    x.fillStyle = `rgba(52,44,32,${0.07 + rnd() * 0.13})`;
    x.fillRect(rnd() * W, rnd() * H, 3 + rnd() * 10, 3 + rnd() * 6);
  }
  for (let i = 0; i < 52; i++) x.clearRect(W - 12 + rnd() * 12, rnd() * H, 4 + rnd() * 12, 2 + rnd() * 8);
  x.strokeStyle = 'rgba(40,34,26,0.5)'; x.lineWidth = 6;
  x.beginPath(); x.moveTo(8, 0); x.lineTo(8, H); x.stroke();
}

/* Desenha o brasão centrado, com um halo escuro por baixo. O halo não é enfeite: o
   emblema dos funkeiros é ouro-e-preto sobre bandeira DOURADA, e sem ele a borda
   dourada do brasão encosta na cor do fundo. Ele custa quase nada nas outras quatro
   (é uma sombra suave) e é o que segura o contraste da pior combinação. */
function pintaBrasao(x, img) {
  const h = H * EMB, w = h * (img.naturalWidth / img.naturalHeight || 1);
  const cx = W / 2, cy = H * EMB_CY;
  const g = x.createRadialGradient(cx, cy, h * 0.12, cx, cy, h * 0.62);
  g.addColorStop(0, 'rgba(18,16,14,0.34)');
  g.addColorStop(0.72, 'rgba(18,16,14,0.20)');
  g.addColorStop(1, 'rgba(18,16,14,0)');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, h * 0.62, 0, 7); x.fill();
  x.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

/* CONTRATO PÚBLICO — ver cabeçalho. Não mude a assinatura. */
export function bandeiraTextura(teamId) {
  const fac = String(teamId || '').toUpperCase();
  const cor = COR_TIME[fac];
  if (!cor || !BRASAO[fac]) return null;
  if (_cache.has(fac)) return _cache.get(fac);

  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const repinta = () => {
    pintaPano(x, cor);
    const e = _img.get(fac);
    if (e && e.pronta && e.img.naturalWidth) pintaBrasao(x, e.img);
    tex.needsUpdate = true;
  };
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  pintaPano(x, cor);
  imagemDoBrasao(fac, repinta);
  _cache.set(fac, tex);
  return tex;
}

/* Só para a régua (`tools/eval/brasao-check.mjs`) e para quem precisar da cor sem
   montar textura. Não faz parte do contrato com o jogo. */
export const CORES_BANDEIRA = COR_TIME;
export const FACCOES_COM_BRASAO = Object.keys(BRASAO);
