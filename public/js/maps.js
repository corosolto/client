// Map registry — single source of truth for selectable arenas.
import { buildBrasilia } from './map_brasilia.js';
import { buildPoolDay } from './map_piscina.js';
import { buildHavan, havanPropsForMatch } from './map_havan.js';
import { buildFerroVelho, FERRO_PROPS } from './map_ferrovelho.js';
import { buildQuebrada, QUEBRADA_PROPS } from './map_quebrada.js';
import { buildObras, OBRAS_PROPS } from './map_obras.js';
import { buildPosto, POSTO_PROPS } from './map_posto.js';
import { buildUpa, UPA_PROPS } from './map_upa.js';
import { buildAtacadao, ATACADAO_PROPS } from './map_atacadao.js';
import { buildParque } from './map_parque.js';
import { buildVelhoOeste } from './map_velho_oeste.js';
import { buildPenitenciaria } from './map_penitenciaria.js';

/* IDS SEM NOME DE COUNTER-STRIKE (rodada de 11/08).
   ═══════════════════════════════════════════════════════════════════════════════════
   Os ids antigos eram herança direta do CS 1.6 e não do nosso jogo: `awp_map` e
   `fy_pool_day` são nomes LITERAIS de mapas do CS, e o prefixo `fy_` ("fight yard") é
   convenção de lá. Os nomes EXIBIDOS já eram brasileiros desde sempre — era só o id que
   carregava o CS, e id vaza: ele aparece na URL que o jogador compartilha e vai gravado
   em toda partida do banco.

   Os ids novos saem do nome exibido, então o que está no código passa a ser o que o
   jogador lê na tela:

     awp_map        -> praca_poderes    (Praça dos Três Poderes)
     fy_pool_day    -> piscina_treta    (Piscina da Treta)
     fy_havan       -> loja_h           (Loja H — Estacionamento)
     fy_ferrovelho  -> ferro_velho      (Ferro Velho do Zé)
     fy_quebrada    -> quebrada         (Quebrada — Rua do Baile)

   Ver `ALIAS_MAPA` logo abaixo do registro: id antigo continua resolvendo, e o motivo
   de isso não ser opcional está escrito lá. */
export const MAPS = {
  praca_poderes: { name: 'Praça dos Três Poderes', build: buildBrasilia }, // Brasília fiel (substitui o clássico)
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
  piscina_treta: { name: 'Piscina da Treta',        build: buildPoolDay },   // salão fechado do CS 1.6; a versão Piscinão está em map_piscinao_ramos.js, fora do registro
  // props via getter: a seleção de carros é sorteada por partida (seed no startGame) — peso
  // `ctfMode: true` = ABRE em CTF, mas o jogador pode trocar pra rounds no menu.
  // Era um flag `ctfOnly` que travava o modo. Pedido do dono: "os mapas todos podem ser rounds
  // ou CTF, mas tem uns que forçam ser CTF". A geometria dos dois foi desenhada em volta
  // das bandeiras, então CTF continua sendo o padrão — só deixou de ser prisão.
  loja_h:      { name: 'Loja H (Estacionamento)', build: buildHavan, get props() { return havanPropsForMatch(); }, ctfMode: true },
  ferro_velho: { name: 'Ferro Velho do Zé',    build: buildFerroVelho, props: FERRO_PROPS, ctfMode: true },
  // Quebrada: rua reta com rotunda do baile numa ponta e campinho de terra na outra, CTF de
  // 4 bandeiras (campinho · bar de esquina · ponto de ônibus · praça do baile). Spec do dono
  // em HANDOFF.md §A0.10. As vielas de fundo (x = ∓23) são requisito da CTF2, não decoração.
  quebrada:    { name: 'Quebrada (Rua do Baile)', build: buildQuebrada, props: QUEBRADA_PROPS, ctfMode: true },
  // Posto de gasolina de beira de estrada na hora dourada, cercado de casas de favela e com a
  // greve dos caminhoneiros travando a pista. 3 corredores (loja O · marquise C · pátio L),
  // simétrico em z=0. Procedural (marquise/bombas/loja/totem) + props (kombi/fusca/pneus/casas).
  posto_treta: { name: 'Posto da Treta', build: buildPosto, props: POSTO_PROPS, ctfMode: true },
  // UPA 24h: pronto-socorro lotado, mapa 100% INTERNO (prédio fechado, sem céu). Salas de verdade
  // — recepção/espera, triagem, consultórios, raio-x, farmácia, enfermaria e emergência — ligadas
  // por corredor central em cruz com portas de vidro. Piso com faixas de sinalização coloridas
  // levando a cada setor e aparelhos médicos procedurais (monitores, respirador, crash cart, O2).
  // Cheio de canto pra se esconder. A treta é a fila eterna: "SENHA 999 · ESPERA 8H".
  upa_24h: { name: 'UPA 24h da Treta', build: buildUpa, props: UPA_PROPS, ctfMode: true },
  // Canteiro de obra da prefeitura que nunca acaba: TERRENO ONDULADO com buracos de escavação
  // (groundHeightAt), estrutura meio-construída no centro, tapumes, andaimes, guindaste, entulho.
  // Simétrico em z=0. A treta é o "desvio de dinheiro público".
  obras_prefeitura: { name: 'Obras da Prefeitura', build: buildObras, props: OBRAS_PROPS, ctfMode: true },
  // Galpão de atacado estilo Loja H: LOJA fechada (Time B) + ESTACIONAMENTO aberto (Time E) ligados
  // por portas de verdade na fachada. Gôndolas reais (gondola_mercado/eletro), caixas, doca, e um
  // bairro/skyline em volta. A treta é o preço absurdo. Simétrico funcional, A* pelos corredores.
  atacadao_treta: { name: 'Atacadão da Treta', build: buildAtacadao, props: ATACADAO_PROPS, ctfMode: true },
  parque_treta: { name: 'Parque da Treta', build: buildParque, ctfMode: true },
  velho_oeste: { name: 'Velho Oeste da Treta', build: buildVelhoOeste, ctfMode: true },
  penitenciaria: { name: 'Penitenciária da Treta', build: buildPenitenciaria, ctfMode: true },
};
export const MAP_IDS = Object.keys(MAPS);
export const DEFAULT_MAP = 'praca_poderes';

/* ALIAS DE ID ANTIGO -> NOVO, e por que ele NÃO é opcional.
   ═══════════════════════════════════════════════════════════════════════════════════
   Id de mapa não é detalhe interno: ele SAI do processo por dois caminhos, e os dois
   sobrevivem ao rename.

   1. VAI GRAVADO NO BANCO. `src/pages/api/match.ts:56` manda `p_map` em toda partida
      enviada. As linhas já gravadas continuam dizendo `awp_map` para sempre; sem alias,
      o mesmo mapa vira DUAS entradas no ranking — a de antes e a de depois do rename —
      e nenhuma das duas fica certa.

   2. VIAJA EM LINK. `?map=fy_quebrada` é o que o jogador manda no grupo. E aqui está a
      parte perigosa: `resolveMapId` devolve o DEFAULT_MAP para id desconhecido, então
      link antigo NÃO daria erro — abriria calado a Praça no lugar da Quebrada. Falha
      silenciosa é a assinatura do defeito mais caro deste repo: foi assim que o rename
      Time E (06/08) apagou a bandeira do jogador sem uma linha no console.

   Por isso o alias resolve ANTES do fallback. Ele é a diferença entre "link velho abre o
   mapa certo" e "link velho abre outro mapa e ninguém percebe".

   Régua: `tools/eval/mapa-id-check.mjs` — M1 nenhum id do CS sobrevive no código, M2
   todo id antigo resolve para um mapa que existe. */
export const ALIAS_MAPA = {
  awp_map: 'praca_poderes',
  fy_pool_day: 'piscina_treta',
  fy_havan: 'loja_h',
  fy_ferrovelho: 'ferro_velho',
  fy_quebrada: 'quebrada',
};

export function resolveMapId(id) {
  if (MAPS[id]) return id;
  const antigo = ALIAS_MAPA[id];
  if (antigo && MAPS[antigo]) return antigo;
  return DEFAULT_MAP;
}

export function nextMapId(id) {
  return MAP_IDS[(MAP_IDS.indexOf(resolveMapId(id)) + 1) % MAP_IDS.length];
}

/* Rotação da sugestão inicial (pedido do dono: menos awp_map, mais exposição dos
   outros mapas): link ?map= manda sempre; quem escolheu no carrossel (pin) fica
   no escolhido; quem nunca escolheu recebe o próximo da fila a cada visita. */
export function mapaDaSessao({ urlMap, savedMap, pinned } = {}) {
  if (urlMap) return resolveMapId(urlMap);
  if (pinned) return resolveMapId(savedMap);
  return nextMapId(savedMap);
}
