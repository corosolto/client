import { DESC_LONG, RANKING_DESCRIPTION_PT, RANKING_DESCRIPTION_EN } from '../lib/site';
import { GRUPOS, MAPAS, PERSONAGENS } from './jogo';

const NOMES_GRUPOS = GRUPOS.map((g) => g.nome).join(', ');
// Mesma vitrine de /mapas, que o game-pages-check amarra ao registro jogável.
const lista = (nomes: string[], e: string) => `${nomes.slice(0, -1).join(', ')} ${e} ${nomes.at(-1)}`;
const NOMES_MAPAS = MAPAS.map((m) => m.nome);

export const HOME_FAQ: [string, string][] = [
  [
    "O que é CORO SOLTO: Treta Suprema?",
    DESC_LONG
  ],
  [
    "Preciso instalar ou pagar algo?",
    "Não. O jogo é gratuito e roda no navegador, sem download nem cadastro. No celular, você também pode adicionar o beta web à tela inicial pelo menu do navegador quando essa opção estiver disponível."
  ],
  [
    "Quais são os controles?",
    "WASD move, mouse mira, clique esquerdo atira, clique direito abre a luneta, Ctrl (ou C) agacha e melhora a mira, Shift corre, Espaço pula, R recarrega, I inspeciona a arma de lado, as teclas 1/2/3 (ou a rodinha do mouse) trocam entre primária, pistola e faca, Z/X/V abrem os comandos de voz, M troca de time e Tab mostra o placar."
  ],
  [
    "Quais são os times e os personagens?",
    `Toda partida usa só dois times: Time E e Time B. Os ${PERSONAGENS.length} personagens estão organizados em ${GRUPOS.length} grupos de catálogo: ${NOMES_GRUPOS}. Esses grupos organizam o elenco; não são times extras.`
  ],
  [
    "Quais mapas o jogo tem?",
    `São ${MAPAS.length} mapas jogáveis: ${lista(NOMES_MAPAS, 'e')}. O menu mostra os mapas disponíveis e permite escolher rounds ou Capture the Flag.`
  ],
  [
    "Como funciona o ranking global?",
    RANKING_DESCRIPTION_PT
  ],
  [
    "É um jogo oficial da Valve ou do Counter-Strike?",
    "Não. É uma paródia independente feita por fãs, sem qualquer afiliação com a Valve. Counter-Strike é marca da Valve Corporation."
  ],
  [
    "Funciona no celular?",
    "Sim. O beta web tem controles de toque; use o celular na horizontal para jogar. O desempenho varia conforme o aparelho e o navegador."
  ],
  [
    "Dá para jogar com amigos?",
    "Sim. O multiplayer está em beta. Abra MULTIPLAYER, entre por JOGO RÁPIDO, escolha uma sala ou use o link/código de convite. Você também pode criar uma sala pública ou privada."
  ]
];
export const HOME_FAQ_EN: [string, string][] = [
  ['What is CORO SOLTO: Treta Suprema?', 'A free browser FPS inspired by classic arena shooters, set in a satirical Brazil. Pick Team E or Team B and a character, play against bots or join the multiplayer beta, and compete in rounds or Capture the Flag. Desktop uses mouse and keyboard; mobile has touch controls.'],
  ['Do I need to install or pay for anything?', 'No. The game is free and runs in your browser, with no download or account required. On mobile, you can add the web beta to your home screen when your browser offers that option.'],
  ['What are the controls?', 'WASD moves, mouse aims, left click fires, right click scopes, Ctrl (or C) crouches, Shift sprints, Space jumps, R reloads, I turns the weapon sideways for inspection, 1/2/3 or the mouse wheel switches weapons, Z/X/V opens voice commands, M switches teams and Tab shows the scoreboard.'],
  ['Which teams and characters are available?', `Every match has only two teams: Team E and Team B. The ${PERSONAGENS.length} characters are organized into ${GRUPOS.length} catalogue groups; those groups are not extra teams.`],
  ['Which maps does the game have?', `There are ${MAPAS.length} playable maps: ${lista(NOMES_MAPAS, 'and')}. The menu shows the available maps and lets you choose rounds or Capture the Flag.`],
  ['How does the global ranking work?', RANKING_DESCRIPTION_EN],
  ['Is this an official Valve or Counter-Strike game?', 'No. This is an independent fan parody with no affiliation with Valve. Counter-Strike is a trademark of Valve Corporation.'],
  ['Does it work on mobile?', 'Yes. The web beta has touch controls; hold your phone horizontally to play. Performance depends on your device and browser.'],
  ['Can I play with friends?', 'Yes. Multiplayer is in beta. Open MULTIPLAYER, use QUICK PLAY, choose a room or use an invitation link or code. You can also create a public or private room.'],
];
