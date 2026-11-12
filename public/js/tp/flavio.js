/* Treta Pop · painel da Operação Flávio, o primeiro da coluna da esquerda do lobby (acima da caça ao
   Javaporco, pedido do dono 08/11), e a história do Flávio. O diálogo é o mesmo dos anúncios de modo
   (mode-announcements.js). Réguas: tools/eval/lobby-flavio-check.mjs e lobby-flavio-browser.mjs. */
import { tr } from '../i18n.js';
import { assetUrl } from '../data/asseturl.js';
import { MAP_IDS_JOGAVEIS } from '../maps.js';

export const MAPA_FLAVIO = 'operacao_flavio';
/* Capturas reais do embarque (tools/eval/lobby-flavio-captura.mjs), revisadas por conteúdo. */
export const ARTE_FLAVIO = '/img/mode-announcements/flavio-embarque.webp';

const $ = (id) => document.getElementById(id);
function no(tag, cls = '', texto = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texto) e.textContent = texto;
  return e;
}

/* Ficção do jogo: só nomes de personagem, nunca de gente real. */
export function historiaFlavio() {
  return {
    id: MAPA_FLAVIO,
    kicker: tr('A HISTÓRIA DO FLÁVIO'),
    titulo: tr('OPERAÇÃO FLÁVIO'),
    paragrafos: [
      tr('Zero Um, o senador Flávio, cansou de dar entrevista e resolveu que o mandato rende mais visto lá de fora. O jatinho já está ligado no pátio; só falta atravessar o aeroporto inteiro sem levar bala.'),
      tr('A comitiva faz de tudo: cerca o VIP, apressa o passo, abre cobertura e manda isca pelo outro lado. A equipe adversária fecha o terminal, o raio-X, o hangar e o pátio para interceptar o Flávio antes da escada.'),
    ],
    fatos: [
      tr('Escolta 6×6, do terminal ao jato'),
      tr('Três rotas: a comitiva escolhe, o outro time adivinha'),
      tr('Escolha o Zero Um e seja você o VIP'),
    ],
    fecho: tr('Se ele subir a escada, a manchete sai sozinha: FLÁVIO FUGIU PROS EUA.'),
    nota: tr('Paródia: personagens e fatos são ficção do jogo.'),
    imagem: assetUrl(ARTE_FLAVIO),
    alt: tr('Flávio na escada do jato, com a placa EMBARQUE DO FLÁVIO no pátio do aeroporto'),
    jogar: tr('JOGAR'),
    fechar: tr('FECHAR'),
  };
}

/* JOGAR = VS BOTS no mapa da escolta e a partida começa pelo mesmo JOGAR do lobby. */
export function jogarOperacaoFlavio() {
  const modos = window.__tpModos;
  if (!modos) return;
  $('hub-sp')?.click();
  modos.irMapa(MAPA_FLAVIO);
  $('btn-jogar')?.click();
}

/* Mesmo desenho do painel da invasão (tp-lobby-invasao): arte cheia, chip, título, linha e link.
   Sem o modo no catálogo jogável não há painel, como no anúncio. */
export function montarPainelFlavio() {
  if (!MAP_IDS_JOGAVEIS.includes(MAPA_FLAVIO)) return null;
  const card = no('button', 'tp-lobby-painel tp-lobby-invasao tp-lobby-flavio');
  card.type = 'button'; card.id = 'tp-lobby-flavio';
  card.setAttribute('aria-haspopup', 'dialog');
  card.setAttribute('aria-label', tr('Operação Flávio: a história do Flávio'));
  const arte = no('img'); arte.src = assetUrl(ARTE_FLAVIO); arte.alt = ''; arte.decoding = 'async';
  card.append(arte, no('span', 'tp-chip tp-chip--novo', tr('ESCOLTA')), no('strong', 'tp-disp', tr('OPERAÇÃO FLÁVIO')),
    no('span', '', tr('Escolta 6×6, do terminal ao jato')), no('span', 'tp-lobby-link', tr('A HISTÓRIA ▸')));
  card.addEventListener('click', () => abrirHistoriaFlavio(card));
  return card;
}

export function abrirHistoriaFlavio(card) {
  return import('../mode-announcements.js')
    .then((m) => m.abrirHistoria({ ...historiaFlavio(), aoJogar: jogarOperacaoFlavio, foco: card }))
    .catch((e) => console.error('[treta-pop] flavio', e));
}
