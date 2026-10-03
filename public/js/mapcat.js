/* CATÁLOGO DOS MAPAS (categoria/autoria/data). Fonte única: a tela e o servidor de
   multiplayer leem daqui. Dados puros, importável do browser e do node. Ver docs/MULTIPLAYER.md. */
/* Categoria é LISTA: um mapa pode ser ARENA e COMUNIDADE. OFICIAL é o autor da casa. */
const MAP_CATS = {
  campomorro: ['FAVELA'],
  mansao: ['CIDADES'],
  /* Amazonia NÃO é favela (pedido do dono, 26/09): palafita de ribeirinho, igarapé e
     mata — bioma próprio. Chorar de FAVELA vendia o mapa errado na ficha e no cartão. */
  amazonia: ['AMAZONIA'],
  escadao: ['FAVELA'],
  praca_poderes: ['CIDADES'], loja_h: ['CIDADES'],
  ferro_velho: ['ARENA'], quebrada: ['FAVELA'],
  /* Córrego nasceu sem entrada e vivia do fallback `catsDe = ['ARENA']` — a ficha
     dizia ARENA para uma "Favela de SP" (bug de classificação puro, achado no
     planejamento do plans/26). Data: entrada no registro em 28/08 (dec46d5b4). */
  corrego: ['FAVELA'],
  lajes: ['FAVELA', 'COMUNIDADE'],
  piscina_treta: ['ARENA', 'COMUNIDADE'], posto_treta: ['ARENA', 'COMUNIDADE'], atacadao_treta: ['ARENA', 'COMUNIDADE'],
  parque_treta: ['ARENA', 'COMUNIDADE'],
  velho_oeste: ['ARENA', 'COMUNIDADE'],
  penitenciaria: ['ARENA', 'COMUNIDADE'],
  upa_24h: ['ARENA', 'COMUNIDADE'],
  obras_prefeitura: ['ARENA', 'COMUNIDADE'],
};
const MAP_AUTOR = {
  campomorro: 'Ruben Marcus',
  amazonia: 'Ruben Marcus',
  praca_poderes: 'Ruben Marcus', loja_h: 'Ruben Marcus',
  lajes: 'Ruben Marcus',
  ferro_velho: 'Ruben Marcus', quebrada: 'Ruben Marcus', atacadao_treta: 'Emerson Garrido',
  mansao: 'Ruben Marcus', escadao: 'Ruben Marcus',
  corrego: 'Ruben Marcus',
  piscina_treta: 'Dalton Fontes', posto_treta: 'Emerson Garrido',
  parque_treta: 'Ubiracy Santos', velho_oeste: 'Ubiracy Santos', penitenciaria: 'Ubiracy Santos',
  upa_24h: 'Emerson Garrido', obras_prefeitura: 'Emerson Garrido',
};
const MAP_DATA = {
  amazonia: '06/09/2026',
  quebrada: '04/08/2026', atacadao_treta: '14/08/2026',
  corrego: '28/08/2026',
  praca_poderes: '19/07/2026', loja_h: '31/07/2026', ferro_velho: '31/07/2026',
  campomorro: '07/09/2026', mansao: '10/09/2026', escadao: '06/09/2026', lajes: '25/09/2026',
  piscina_treta: '17/07/2026', posto_treta: '13/08/2026',
  parque_treta: '17/08/2026', velho_oeste: '17/08/2026', penitenciaria: '17/08/2026',
  upa_24h: '13/08/2026', obras_prefeitura: '13/08/2026',
};
const CAT_DESC = {
  TODOS: 'O acervo inteiro, do mais jogado ao menos jogado.',
  OFICIAIS: 'Mapas oficiais da casa.',
  ARENA: 'Combate fechado e simétrico — o duelo de angulação clássico.',
  CIDADES: 'Marcos do Brasil em escala de treta: concreto, calçada e linha reta.',
  FAVELA: 'Verticalidade de laje, beco e sombra: quem domina o alto dita o round.',
  AMAZONIA: 'Palafita de ribeirinho, igarapé e mata fechada: o Norte do Brasil em guerra de voadeira.',
  COMUNIDADE: 'Mapas feitos pela comunidade.',
  AI: 'Construídos pelos agentes de IA da casa.',
};
const AUTOR_CASA = 'Ruben Marcus';
const catsDe = (id) => MAP_CATS[id] || ['ARENA'];
const autorDe = (id) => MAP_AUTOR[id] || AUTOR_CASA;
const oficialDe = (id) => autorDe(id) === AUTOR_CASA;

/* Recortes que as rotações de sala do multiplayer consomem. OFICIAL é o autor da casa, o
   mesmo critério do crachá na tela de mapas — e não uma segunda lista escrita à mão. */
export const ehComunidade = (id) => catsDe(id).includes('COMUNIDADE');
export const ehOficial = (id) => !ehComunidade(id);
export { MAP_CATS, MAP_AUTOR, MAP_DATA, CAT_DESC, AUTOR_CASA, catsDe, autorDe, oficialDe };

/* Nomes de facção como a TELA os escreve. Mora aqui, junto do catálogo, porque o servidor
   de multiplayer mostra os mesmos rótulos na lista de salas — dois dicionários virariam
   "PALHAÇOS" numa tela e "Palhaços" na outra. Espelha game.js:_teamName. */
export const FACCAO_NOME_UI = { E: 'TIME E', B: 'TIME B', F: 'FUNKEIROS', C: 'PALHAÇOS', U: 'TRIBOS URBANAS', M: 'MÍTICO' };
