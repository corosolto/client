// Map registry — single source of truth for selectable arenas.
import { buildBrasilia } from './map_brasilia.js';
import { buildPoolDay } from './map_piscina.js';
import { buildHavan, havanPropsForMatch } from './map_havan.js';
import { buildFerroVelho, FERRO_PROPS } from './map_ferrovelho.js';
import { buildQuebrada, QUEBRADA_PROPS } from './map_quebrada.js';
import { buildEscadao, ESCADAO_PROPS } from './map_escadao.js';

export const MAPS = {
  awp_map:     { name: 'Praça dos Três Poderes', build: buildBrasilia }, // Brasília fiel (substitui o clássico)
  /* `praca_old` (a "Praça (clássico)", public/js/map.js) SAIU DO REGISTRO — pedido literal do
     dono: "vamos apagar a praça clássica". Ela era a versão procedural anterior da mesma
     praça que o awp_map já entrega em Brasília fiel, e ficava no menu como um 5º cartaz que
     ninguém escolhia. O arquivo map.js foi apagado junto; nada mais o importava (o awp_map
     mora em map_brasilia.js e NÃO compartilha código com ele — as duas funções de construção
     eram independentes, cada uma com seu próprio `addBox`/`lam`).
     Efeitos colaterais desta remoção, todos medidos e conferidos:
       • pickup-check cai de 246 para 244 pickups (o praca_old tinha 2 armas no chão) — é a
         ÚNICA redução de arma desta rodada e ela vem do mapa apagado, não de mapa vivo;
       • as réguas que iteram "os 5 mapas" passam a iterar 4 (map-check, invariants, botsim);
       • `tools/eval/ui-check.mjs` ainda lista 'praca_old' na constante MAPAS dele — não é
         defeito: `resolveMapId` (logo abaixo) devolve o DEFAULT_MAP para id desconhecido,
         então aquela corrida vira uma segunda passada no awp_map em vez de quebrar. O
         arquivo está em mão de outro agente nesta rodada e por isso não foi tocado. */
  fy_pool_day: { name: 'Piscina da Treta',        build: buildPoolDay },   // salão fechado do CS 1.6; a versão Piscinão está em map_piscinao_ramos.js, fora do registro
  // props via getter: a seleção de carros é sorteada por partida (seed no startGame) — peso
  // `ctfMode: true` = ABRE em CTF, mas o jogador pode trocar pra rounds no menu.
  // Era um flag `ctfOnly` que travava o modo. Pedido do dono: "os mapas todos podem ser rounds
  // ou CTF, mas tem uns que forçam ser CTF". A geometria dos dois foi desenhada em volta
  // das bandeiras, então CTF continua sendo o padrão — só deixou de ser prisão.
  fy_havan:    { name: 'Loja H (Estacionamento)', build: buildHavan, get props() { return havanPropsForMatch(); }, ctfMode: true },
  fy_ferrovelho: { name: 'Ferro Velho do Zé',    build: buildFerroVelho, props: FERRO_PROPS, ctfMode: true },
  // Quebrada: rua reta com rotunda do baile numa ponta e campinho de terra na outra, CTF de
  // 4 bandeiras (campinho · bar de esquina · ponto de ônibus · praça do baile). Spec do dono
  // em HANDOFF.md §A0.10. As vielas de fundo (x = ∓23) são requisito da CTF2, não decoração.
  fy_quebrada: { name: 'Quebrada (Rua do Baile)', build: buildQuebrada, props: QUEBRADA_PROPS, ctfMode: true },
  // Escadão: escadaria monumental de azulejo com caveirão no patamar central (spec plans/12).
  // Verticalidade pura: 3 lances, 2 patamares, 2 becos laterais de flanco.
  fy_escadao: { name: 'Escadão (Morro)', build: buildEscadao, props: ESCADAO_PROPS, ctfMode: true },
};
export const MAP_IDS = Object.keys(MAPS);
export const DEFAULT_MAP = 'awp_map';

export function resolveMapId(id) {
  return MAPS[id] ? id : DEFAULT_MAP;
}
