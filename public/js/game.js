// Core game: FPS controller, weapons, bots, rounds, HUD.
import * as THREE from 'three';
import { MAPS, resolveMapId } from './maps.js';
import { buildCharacter, poseCharacter, byId, CHARACTERS, buildRifle, charWeapon } from './characters.js';
import { buildCharacterModel, hasModel, preloadCharacterAssets } from './glbchars.js';
import { weaponModel, weaponCFG, ONE_HANDED, WEAPON_IDS, PISTOLS, gripPoints } from './weapons.js';
import { buildFPArms, poseToWeapon, FP_OFF } from './fparms.js';
import { VM_FRAME } from './vmattach.js';
import { vmlabPose, VMLAB_SCOPED, VMLAB_NO_ALIGN } from './vmlab.js';
import { buildRecoilPattern, RECOIL_PARAMS, RECOIL_PATTERN, RECOIL_CLASS, REC_DEG, REC } from './recoil.js';
import { GPUParticles } from './gpuparticles.js';
// radiância do céu MEDIDA por mapa (r3_fog.py) — teto de brilho da fumaça, ver _corDaFumaca
import { skyRadiance } from './bloom.js';
import { createSoundscape } from './soundscape.js';   // áudio ambiente por mapa (world.sound do córrego)
import { RecoilAxis, ViewModelRig } from './springs.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { frase, tr } from './i18n.js';   // EN por camada — o crash 'frase is not defined' de 06/08 foi este import faltando
// cor de facção: UMA origem, importada também por brasoes.js e characters.js. O espelho
// que este import substitui apagou a bandeira do jogador em 07/08 — ver paleta.js.
import { tons, ESPELHO } from './paleta.js';
import { PlayerRecorder } from './botbrain/recorder.js';   // BOTBRAIN: grava (estado→ação) do jogador (só quando recordTraining)
import { buildState } from './botbrain/features.js';       // BOTBRAIN: monta o vetor de estado do bot p/ a rede
import { sense } from './botbrain/sense.js';               // BOTBRAIN: percepção (jogo→features)
import { BotBrain } from './botbrain/brain.js';            // BOTBRAIN: inferência (rede treinada rodando no bot)

import { WEAPONS } from './data/weapons.js';
// Reexporta pra não quebrar quem já consumia a tabela daqui: server/room.js (servidor
// autoritativo) e tools/eval/botdiag.mjs. Consumidor novo importa de data/weapons.js.
export { WEAPONS };
/* ===================== RITMO / MOVIMENTO (kill-switches) =====================
   ?pace=0  -> round volta a ser SÓ tempo (sem alvo de abates, sem match point)
   ?move=0  -> movimento volta ao modelo antigo (4.7 base, sprint 6.6, sem counter-strafe)
   ?killcam=0 -> sem painel/câmera de morte
   ?replaycam=0 -> sem replay cam ao matar (câmera orbital na vítima)
   Motivo: as três mudam COMPORTAMENTO sentido pelo jogador; o dono precisa do A/B. */
const QS = new URLSearchParams(location.search);
const REPLAY_CAM = QS.get('replaycam') !== '0';
/* Replay cam (kill-switch ?replaycam=0): duração total em s, escala de dt do hit-stop e a
   janela dele em tempo real, e o raio/altura da órbita em torno da vítima. */
const REPLAY_DUR = 1.2;
const REPLAY_SLOWMO = 0.18;
const REPLAY_SLOWMO_DUR = 0.2;
const REPLAY_ORBIT_R = 3.2;
const REPLAY_ORBIT_H = 1.8;
// ?vmlab=1 usa o viewmodel afinado; sem a flag mantém o calibrado.
const VMLAB = QS.get('vmlab') === '1';
/* KILL-SWITCH DA RODADA DE MATERIAL: ?vmmat=legacy devolve, de uma vez, o clamp
   `min(metalness, 0.55)` do viewmodel E o orçamento fixo de 7,60 unidades de luz da vmScene.
   Está aqui em cima, num lugar só, porque as duas coisas são UMA correção (ver o bloco do
   `fixVmMaterials`): a arma ficou branca porque o material perdeu metalicidade E porque a
   luz era 2,7× a do mapa. Desfazer uma sem a outra troca um defeito por outro. A conta que
   justifica a troca é analítica (tools/eval/mat_shade.py) e não passou por GPU nenhuma —
   esta querystring é a saída honesta caso a GPU do dono discorde da conta. */
const VM_MAT_LEGACY = QS.get('vmmat') === 'legacy';
// RESPAWN 2.5→2.2 e SPAWN_PROT 3→2: o custo medido de morrer em Brasília era ~16s (16% do
// round) olhando pra esplanada vazia. Menos espera + spawn escolhido por segurança
// (_pickSpawn) encurta o caminho de volta pra briga sem virar respawn de arena.
const ROUND_TIME = 99, ROUNDS_TO_WIN = 3, RESPAWN_DELAY = 2.2, PICKUP_RESPAWN = 8, SPAWN_PROT = 2;
// Prazo e teto do drop de morte; procedência dos dois números em tools/eval/drop-check.mjs.
const DROP_TTL = 18, DROP_MAX = 12;
/* TETO PADRÃO DE RODADAS — "melhor de 5", que é o que o índice promete inicialmente
   (src/pages/index.astro:503, "Vence quem ganhar 3 rounds"). Sem este teto o formato NÃO
   ERA melhor de 5: round EMPATADO não dá ponto pra ninguém (game.js:_endRound), então uma
   partida com muitos empates nunca chegava aos 3. Medido em tools/eval/ui-check.mjs (UI4):
   piscina_treta/DM rodou 5 rounds e 600 s simulados sem `matchEnd` (placar de rounds 1 × 2).
   Com o teto, a partida acaba na 5ª rodada valendo quem tem mais rounds (desempate: abates
   da partida inteira). Pior caso: 5 × (3 s de countdown + 99 s + 4 s de fim) = 530 s. */
const ROUNDS_MAX = ROUNDS_TO_WIN * 2 - 1;
/* ==== CAPTURA (CTF): O MODO NÃO TEM RELÓGIO DE ROUND — game.js:84-104 ====
   O dono, jogando o ferro velho do Zé: "o captura estava com cronometragem — isso não
   acontece em CTF". Ele está certo, e a cronometragem era REGRESSÃO MINHA: na rodada
   passada o CAPTURA não fechava partida nenhuma (UI4 mediu 0 de 5 mapas em 600 s), e eu
   consertei do jeito errado — dei ao modo o MESMO relógio de 99 s dos rounds de abate.
   Isso fechou a partida e quebrou o modo: em CTF o round acaba por OBJETIVO, não por
   tempo. As duas verdades têm que valer juntas, e a UI4 agora cobra as duas:
     · a RODADA fecha por ALVO DE CAPTURAS (= TODAS as bandeiras do mapa, ver
       `capsToWin` em `_initCTF`) ou por dominação das bandeiras (_ctfWin) — nunca
       por tempo;
     · a PARTIDA fecha por vitórias de rodada (CTF_ROUNDS_TO_WIN), por teto de rodadas
       (CTF_ROUNDS_MAX) ou, como REDE DE SEGURANÇA, por um teto de tempo DE PARTIDA
       (CTF_MATCH_TIME) que só aparece no HUD nos últimos CTF_CLOCK_SHOW segundos.
   PROCEDÊNCIA DOS NÚMEROS (medidos, não escolhidos — tools/eval/ui-check.mjs e a sonda
   de ritmo de captura sobre o harness, 5 mapas × 600 s simulados, semente 4242):
     capturas por 99 s (os dois times somados): praca_poderes 3,1 · praca_old 3,1 ·
     piscina_treta 3,3 · loja_h 1,5 · ferro_velho 1,2.
   Com CTF_CAPS_TO_WIN = 2, o mapa MAIS LENTO medido (ferrovelho, 1,2/99 s repartidos
   entre 2 times) leva ~2 × 99/0,6 ≈ 330 s pra uma rodada, e é por isso que existe o teto
   de tempo de PARTIDA — sem ele o modo voltaria a não fechar. Melhor de 3 é o padrão
   porque a rodada de captura é 2-3× mais longa; a tela de mapas permite outro teto. */
/* FALLBACK, não regra: o alvo REAL da rodada é `this.ctfPts.length` — TODAS as bandeiras
   que o mapa tem —, derivado em `_initCTF` (ver o bloco ALVO DA RODADA lá). Este 3 só vale
   para o layout padrão (mapa que não declara `world.ctfPoints`), que tem exatamente 3
   bandeiras. Ele era a regra até 05/08 e é o defeito que o dono viu: com 4 bandeiras na
   Loja H a rodada fechava na 3ª captura. Régua: `tools/eval/ctf-win-check.mjs`. */
const CTF_CAPS_TO_WIN = 3;
const CTF_ROUNDS_TO_WIN = 2, CTF_ROUNDS_MAX = CTF_ROUNDS_TO_WIN * 2 - 1;
const CTF_MATCH_TIME = 480;
const CTF_CLOCK_SHOW = 60;
// O round SEMPRE queimava os 99s e ganhava quem tivesse mais kills — sem virada, sem clímax.
// Agora existe ALVO (3 abates × jogadores por lado, mín. 6): quem chega primeiro fecha o
// round na hora, e a 2 abates do fim entra o banner MATCH POINT (pico no fim, não platô).
const KILLS_PER_PLAYER = 3, KILLS_MIN = 6;
/* ALVO DE ABATES: DESLIGADO POR PADRÃO desde 04/08 (decisão do dono: "os rounds não podem
   ter limite de kills no single player"). Era `!== '0'` — ligado sempre, e o round fechava
   no alvo (4v4 -> 12 abates) cortando a rodada justamente quando ela estava boa, sem o
   jogador ter escolhido isso em lugar nenhum do menu. Agora o round de rodadas termina por
   RELÓGIO ou eliminação, que é a regra do CS. `?pace=1` devolve o alvo pra comparar.
   O CTF não passa por aqui: lá o alvo é de bandeiras (`capsToWin`), é a mecânica do modo. */
const PACE = QS.get('pace') === '1';
/* ===================== JANELA DE GUARDA DO MENU DE PAUSA =====================
   DEFEITO DO DONO, CINCO VEZES: "o jogo reiniciou sozinho, eu estava no meio de uma
   partida e ele foi pro menu principal sozinho".

   NÃO existe caminho automático pro menu — `quitToMenu()` tem exatamente dois chamadores
   e os dois são `onclick` (main.js, SAIR PRO MENU e MENU). O clique é REAL; o que estava
   errado era ONDE o jogo põe esses botões e QUANDO.

   MEDIDO (tools/eval/pause-check.mjs --geo, Chromium 1536×1024, o enquadramento 3:2 do dono),
   com o menu de pausa no ar:
     - canvas sob o cursor:            0,00 % da tela  (o overlay cobre TUDO)
     - #pause-menu (fundo):           95,59 %
     - os 5 botões:                    4,42 %, e REINICIAR+SAIR somam 1,66 %
     - coluna vertical no CENTRO da tela, que é onde mora a MIRA:
         centro       -> CONFIGURAÇÕES
         centro +100  -> REINICIAR PARTIDA   ("o jogo reiniciou sozinho")
         centro +150  -> SAIR PRO MENU       ("foi pro menu principal sozinho")

   E a pausa não é pedida pelo jogador: `_plc` pausa a QUALQUER perda de pointer lock
   (alt-tab, ESC, notificação do SO, o Chrome tirando o foco). O menu cai debaixo da mira
   no exato instante em que o dedo está no botão de atirar — e o tiro que já estava saindo
   vira "REINICIAR PARTIDA" ou "SAIR PRO MENU".

   Pior: o escape hatch que existia pra isso está MORTO. `_md` só retoma quando
   `e.target === renderer.domElement`, e com 0,00 % de canvas exposto isso nunca acontece
   enquanto pausado (o gate nasceu em G2-R2 pra consertar o inverso — o "SAIR PRO MENU não
   funcionava" —, e ao consertar aquilo entregou todo clique pausado pros botões).

   Guarda: nos primeiros PAUSE_ARM_MS o painel de ações fica com `pointer-events:none`,
   então o tiro em voo não alcança botão nenhum e cai no FUNDO — que agora RETOMA a
   partida. Depois da janela o painel volta a aceitar clique (senão a regressão do G2-R2
   volta) e as duas ações destrutivas ainda exigem confirmação de dois toques (main.js). */
const PAUSE_ARM_MS = 600;
/* Segunda trava, do mesmo defeito: NENHUM clique único pode destruir a partida em
   andamento (SAIR PRO MENU / REINICIAR). Dois toques — mas com uma pausa MEDIDA entre
   eles, e a regra mora aqui, exportada, porque "clique de novo" ingênuo NÃO resolve:
   uma rajada de 8 cliques a 60 ms no mesmo pixel (que é exatamente o que a mão do
   jogador faz quando a arma "parou de atirar") atravessa qualquer teto fixo de tempo
   e confirma sozinha — medido em Chromium, o jogo saiu pro menu no meio da rajada.
   Por isso um clique cedo demais não confirma NEM é ignorado: ele RE-ARMA o relógio.
   Confirmar exige parar de clicar por CONFIRM_MIN_MS. */
export const CONFIRM_MIN_MS = 350, CONFIRM_MAX_MS = 3500;
export function confirmGate(agora, armadoEm) {
  if (!armadoEm) return 'arma';                              // 1º toque: pede confirmação
  const dt = agora - armadoEm;
  if (dt >= CONFIRM_MAX_MS) return 'arma';                   // esfriou: começa de novo
  if (dt >= CONFIRM_MIN_MS) return 'confirma';               // toque deliberado
  return 'rearma';                                           // rajada: relógio volta ao zero
}
const BOT_SPEED = 4.1, BOT_EYE = 1.5;   // 3.3 = 30% mais lento que o jogador: o bot nunca chegava no lugar
const BOT_VIEW = 45;              // alcance de aquisição de alvo (m) — ver comentário no think
const BOT_VIEW_SNIPER = 82;       // com luneta o bot enxerga longe (o jogador de AWP era impune a 100m)
const BOT_VIEW_ALERT = 64;        // levou/ouviu tiro: abre a visão por alguns segundos
const BOT_AIM_PITCH = 15 * Math.PI / 180;   // clamp do pitch da cabeça ao mirar (rad)
// Dano do bot CONTRA O JOGADOR: com a arma real na mão (rajada de AK = 36×N) o bot ficou
// muito mais letal que o 63 fixo de antes. 0.85 devolve ~1 tiro extra de margem pro jogador
// reagir sem apagar a identidade das armas (AWP segue matando de um tiro).
const BOT_DMG_PLAYER = 0.85;   // valor legado — só vale com ?botfair=0
/* ===================== JUSTIÇA DO BOT =====================
   Reclamação literal do dono: "matam muito fácil e o usuário não vê de onde veio o tiro,
   parece cheater que atira sempre na cabeça". O print /root/iss/16.59.51.jpg fecha o
   diagnóstico: "MORTO POR Emo (MEDIANO) — M4 · 45 m · NA CABEÇA". Um bot de tier MÉDIO
   dando headshot de M4 a 45 metros mata em UM tiro (36 × HS_MUL.rifle 4 × 0.8 = 115).
   Quatro alavancas, todas numéricas, todas atrás de ?botfair=0 (A/B pro dono):

   1. HEADSHOT DE IA LIMITADO. O bot herdava a MESMA tabela de cabeça do jogador. Agora tem
      tabela própria (BOT_HS_MUL): com rifle/SMG a cabeça dá 72 de dano — DÓI e não mata de
      um tiro, então o jogador tem um frame pra reagir e entender. Só o sniper continua
      letal, porque AWP na cabeça é legível (e a AWP já mata no corpo de qualquer jeito).
      Além disso a CHANCE tem teto absoluto (BOT_HS_MAX = 7%): mesmo o bot 'muito bom' não
      pode virar aimbot de cabeça. Referência: praticamente todo FPS com bot faz isso.
   2. DANO POR DIFICULDADE (era 0.85 fixo pra todos). No 'normal' cai pra 0.72 — a rajada de
      AK que matava em 3 tiros passa a precisar de 4.
   3. PISO DE REAÇÃO + TEMPO DE FOCO. Reação já era uma distribuição humana, mas sem PISO:
      o bot 'muito bom' reagia em 90 ms, o que nenhum humano faz. BOT_REACT_MIN é o piso;
      BOT_FOCUS_MIN é o tempo de ASSENTAR a mira DEPOIS de reagir, antes do 1º tiro.
   4. ERRO DE MIRA MAIOR AO ENGATAR, decaindo com o tempo de tracking (já existia a curva;
      o que muda é o valor inicial e o piso — ver o bloco "MIRA QUE ARRASTA"). */
const BOT_FAIR = QS.get('botfair') !== '0';
/* ?botmove=0 devolve o MOVIMENTO antigo dos bots (coluna fixa ±10,5 m, juke curto, empurrão
   de flanco em X-mundo, destravamento por teleporte, giro sem teto, separação forte). Existe
   porque é a mudança de comportamento mais sentida da rodada — o dono precisa do A/B, e o
   harness tools/eval/botsim.mjs mede antes→depois só trocando esta querystring. */
const BOT_MOVE2 = QS.get('botmove') !== '0';
/* ?botcrowd=0 devolve o comportamento de AGLOMERADO antigo (bug do dono, 01/08: "um monte
   do time de palhaços amontoado perto do spawn, essa inteligência dos bots não tá legal").
   Três mecanismos entram junto sob esta chave, todos medidos no harness de fast-forward:
     1. ALVO DE ROAM SÓ EM NÓ ALCANÇÁVEL (componente conexo do grafo de waypoints).
        Medido na Loja H: 45% das rotas de roam do lado P miravam nó INALCANÇÁVEL (a faixa
        externa em volta da loja e o mezanino são ilhas do grafo) — cada uma dessas queimava
        um ciclo de rerrota e o bot ficava moendo no lugar em vez de avançar.
     2. ALVO DISTINTO POR BOT (reserva): nó já escolhido por um colega vivo custa caro, então
        o time se abre em vez de andar em fila pro mesmo waypoint.
     3. DESPENETRAÇÃO entre bots (inclusive de times diferentes): dois bonecos não podem
        ocupar o mesmo ponto. Antes NADA no jogo impedia — o _collide só olha o cenário.
     4. QUEM ESTÁ NO BOLO NÃO PLANTA: o "segurar ângulo parado" é cancelado com 2+ colegas
        a menos de 3 m — bot parado dentro da pilha é a leitura de "não estão jogando".
   Medido (3×150 s, Loja H, 8v8): amostras com >=3 bots colados 30,1% -> ver relatório. */
const BOT_CROWD = QS.get('botcrowd') !== '0';
const BOT_BODY_R = 0.62;    // raio de CORPO do bot: abaixo de 2× isto os dois se afastam de verdade
const BOT_CROWD_HOLD = 2;   // colegas a <3 m que cancelam o "plantar e mirar" (bot parado no bolo)
// Teto de giro do bot em rad/s (264°/s). Sem teto o A* trocando de nó virava pião de 720°/s.
const YAW_CAP = 4.6;
const BOT_DMG_BY_DIFF = { easy: 0.48, normal: 0.63, hard: 0.80, insane: 0.98 };
const BOT_HS_MAX = 0.07;
const BOT_HS_MUL = { rifle: 2.0, smg: 2.0, pistol: 2.0, lmg: 1.9, shotgun: 1.5, sniper: 2.5 };
const BOT_REACT_MIN = 0.20;
const BOT_FOCUS_MIN = 0.16;
/* ===================== 5. RAJADA E TURNO (causa-raiz medida do BOT4) =====================
   O harness (tools/eval/botdiag.mjs) imprimiu a rajada que MATA, tiro a tiro. O padrão era
   sempre o mesmo, nos 4 mapas: 4 acertos de 22-33 de dano, dos quais 3 dentro de 0,25 s —
   a cadência CÍCLICA da arma. Ou seja: assim que a mira do bot assentava, TODO tiro da
   rajada acertava, porque o erro de mira (b.aimErr ~0,036 rad) era MENOR que o tamanho
   angular do tronco a 10 m (0,050 rad). Com erro menor que o alvo, acertar é certeza
   geométrica — é literalmente a definição de aimbot, e é o que o dono descreve.
   Três alavancas, todas com número, todas atrás de ?botfair=0:

   a) COICE PROPORCIONAL AO ALVO (BOT_SPRAY_K). O coice somado por tiro era w.recoil (0,006
      rad na AK) — 8x menor que o alvo. Agora cada tiro abre a mira em múltiplos do TAMANHO
      ANGULAR do alvo, então a rajada degrada na mesma proporção a 5 m e a 40 m: o 1º tiro
      encosta, o 2º e o 3º abrem. É o padrão humano e é legível na tela (o tracer sobe).
   b) RAJADA CURTA + PAUSA LONGA. A rajada era 1-6 tiros e MAIOR de perto (dist<14 -> até 6),
      exatamente ao contrário do que a justiça pede. Agora é 1-3 tiros e mais curta de perto,
      com pausa de re-aquisição entre elas.
   c) TURNO DE DUELO (attack token — técnica clássica de IA de FPS, usada em Halo/Arkham).
      Nas rajadas fatais medidas havia 2-3 bots diferentes atirando no jogador ao mesmo
      tempo: não existe janela de reação possível contra fogo somado de três lados. Agora
      no máximo BOT_DUEL_TOKENS bots ATIRAM no jogador ao mesmo tempo; os outros continuam
      manobrando/flanqueando (não congelam) e entram quando o turno passa. */
const BOT_SPRAY_K = 1.9;        // coice por tiro em MÚLTIPLOS do tamanho angular do alvo
const BOT_BURST_PAUSE = 0.95;    // pausa base entre rajadas (s), ainda dividida pela skill
const BOT_DUEL_TOKENS = 2;       // quantos bots podem atirar NO JOGADOR ao mesmo tempo
const BOT_TOKEN_HOLD = 1.6;      // s de turno antes de passar a vez
const BOT_TOKEN_REST = 1.1;      // s de descanso obrigatório depois de largar o turno
/* ===================== MOVIMENTO (referência CS2) =====================
   Andar com rifle no CS2 = 5.46 m/s (faca 6.35, AWP 5.08). Aqui a base era 4.7 pra TODAS as
   armas + um sprint de 6.6 que não existe em CS. Resultado: a AWP andava igual à faca (posição
   não valia nada) e o Shift servia pra correr gritando passo. Agora: base PLAYER_SPEED com
   multiplicador POR ARMA e Shift = ANDAR SILENCIOSO (o loop "segurar ângulo escutando passo"
   passa a existir). Armas sem entrada caem em 0.9. */
const PLAYER_SPEED = 5.35;
const MOVE_MUL = {
  knife: 1.0, pistol: 0.98, revolver38: 0.96, deagle: 0.94,
  mp5: 0.95, uzi: 0.95, p90: 0.94, famas: 0.9, tavor: 0.9, m4: 0.9, scar: 0.89, carbine: 0.9,
  ak: 0.88, akm: 0.86, m92: 0.88, g3: 0.85, md97: 0.86, shotgun: 0.88,
  sks: 0.87, m400: 0.85, svd: 0.83, g3sg1: 0.8, lmg: 0.8, rem700: 0.79, mosin: 0.78, awp: 0.78,
};
const WALK_MUL = 0.52;            // Shift: 52% da velocidade, sem som de passo
const MOVE2 = QS.get('move') !== '0';
/* KILL-SWITCH DO ARMÁRIO DO SPAWN (P3, 01/08). `?rack=old` traz de volta o layout cego
   (2 fileiras fixas a 2,0/3,25 m atrás do spawn, x absoluto) E a seleção antiga (só a arma
   mais próxima em 1,9 m) — os dois juntos são o bug que o dono reportou às 20:38, e ficam
   atrás da mesma chave pra dar A/B honesto. Ver _resetPositions e _updatePickups. */
const RACK_OLD = QS.get('rack') === 'old';
/* `?rackreta=1` liga o filtro de "reta andável do spawn" na colocação do armário — ramo A/B
   REVERTIDO e DESLIGADO por padrão (ver o comentário longo em _resetPositions, game.js:~1832,
   e a nota de reversão sobre `_retaAndavel` em game.js:~3760). */
const RACK_RETA = QS.get('rackreta') === '1';
// REGENERAÇÃO: não existia cura, kit, colete nem regen em lugar nenhum — cada vida depois do
// primeiro contato já estava perdida (um tiro de bot deixa em ~40 e o próximo mata, faça o
// que fizer). Como aqui o respawn é contínuo e não há economia, o modelo é o do CoD: X s sem
// tomar dano e o HP volta. Vale pra jogador E bots (simetria). ?regen=0 desliga.
/* VETADO PELO DONO EM 05/08, E POR ISSO O PADRÃO INVERTEU (`?regen=1` traz de volta).
   Palavras dele: *"a vida do 1st player volta a 100, não sei porque, ISSO NÃO PODE."*

   NÃO É BUG — é esta regra, funcionando como escrita, e ela NÃO é específica de modo:
   dispara igual em rodadas e em CAPTURA. Reproduzida no navegador
   (`tools/eval/crash-watch.mjs`, CTF ferro_velho, amostra de 2 em 2 s):

     t 25,7 s  hp 68   (hurtAt 22,1)
     t 30,3 s  hp 100  (hurtAt 22,1)   <- sem morrer, sem respawn, sem rodada nova

   6 s sem tomar dano e 22 HP/s devolvem a vida cheia em ~1,5-3 s. O jogador não tem
   como saber que existe: não há ícone, som, vinheta nem linha de configuração — e regra
   que o jogador não percebe é indistinguível de defeito. Foi assim que ela chegou (num
   commit grande de 31/07, sem entrada no CHANGELOG) e é assim que o dono a encontrou.

   O QUE ELA RESOLVIA, e que volta a doer com ela desligada: sem cura, kit ou colete,
   cada vida depois do primeiro contato já estava perdida (um tiro de bot deixa em ~40 e
   o próximo mata). Quem religar por padrão precisa entregar JUNTO o feedback que falta.
   A simetria é parte do desenho: vale pra jogador E bots — meia regeneração faria o bot
   virar esponja. Régua: invariante REGEN de `tools/eval/regen-check.mjs`. */
const REGEN = QS.get('regen') === '1', REGEN_DELAY = 6, REGEN_RATE = 22;
const TEAM_LABEL = { E: 'TIME E', B: 'TIME B' };
const RADIO = {
  z: { title: 'COMANDOS', items: ['Bora, bora, bora!', 'Cobre eu!', 'Recua, recua!'] },
  x: { title: 'RESPOSTAS', items: ['Recebido!', 'Negativo!', 'Bonito tiro!'] },
  c: { title: 'ZOAÇÃO', items: ['Chora na live!', 'É fake news!', 'Vem pra treta!'] },
};
const MK_TIERS = { 2: 'doublekill', 3: 'triplekill', 4: 'multikill', 5: 'megakill' };
const MK_LABELS = { doublekill: 'DOUBLE KILL', triplekill: 'TRIPLE KILL', multikill: 'MULTI KILL', megakill: 'MEGA KILL', killingspree: 'KILLING SPREE', godlike: 'GODLIKE' };
/* ===================== GUNFEEL (recuo / spread / feedback) =====================
   Kill-switch: ?gunfeel=0 volta ao modelo antigo (impulso escalar de w.recoil, spread em
   caixa, sem padrão, sem falloff). Existe porque isto muda o COMPORTAMENTO de mira das 26
   armas de uma vez — se algo ficar ruim em produção o dono tem o A/B na querystring. */
const GUNFEEL = new URLSearchParams(location.search).get('gunfeel') !== '0';
// Kill-switch: ?blood=0 desliga o sangue (spray + mancha em parede/chão + poça sob o
// cadáver). Muda o "gore" sentido pelo jogador — flag pro A/B do dono, como ?gunfeel=0.
const BLOOD = new URLSearchParams(location.search).get('blood') !== '0';
const D2R = Math.PI / 180;
// Recoil compartilhado pelo jogo e pelas bancadas vive em recoil.js.
// Queda de dano por distância: hoje o raycast vai a 200 m com dano constante (P90 a 40 m
// mata igual à AWP). start/end em metros, min = multiplicador no fim. Sniper: sem falloff.
const DMG_FALLOFF = {
  smg: [25, 65, 0.60], pistol: [30, 70, 0.62], rifle: [45, 95, 0.85], shotgun: [8, 26, 0.30], lmg: [40, 90, 0.8],
};
// Headshot: era `dmg = 100` fixo em QUALQUER arma (P90 a 40 m matava na cabeça igual à AWP,
// o que apagava a identidade das 26 armas). Agora é multiplicador por classe.
const HS_MUL = { rifle: 4, smg: 4, pistol: 4, lmg: 3.6, shotgun: 1.7, sniper: 2.5 };
// Classe BALÍSTICA (≠ STATIC_CLASS, que é do viewmodel: lá SMG mora em 'rifle' e a M400
// mora em 'awp'). Usada só por falloff/headshot.
const BALL_CLASS = {};
for (const w of ['awp', 'mosin', 'rem700', 'm400', 'svd', 'g3sg1', 'sks']) BALL_CLASS[w] = 'sniper';
BALL_CLASS.shotgun = 'shotgun';
// MD97 saiu de 'shotgun' (fica no default 'rifle'). Ela é o IMBEL MD97, fuzil 5,56 do
// Exército — estava na classe balística de espingarda só por herdar a malha do viewmodel.
// O estrago era grande e invisível: DMG_FALLOFF.shotgun [8, 26, 0.30] derrubava o dano
// dela pra 30% depois de 26 m (um FUZIL inútil a média distância) e HS_MUL.shotgun 1.7
// tirava o headshot (rifle = 4). Som corrigido junto em audio.js (GUN_CLASS 'ar').
for (const w of ['mp5', 'uzi', 'p90']) BALL_CLASS[w] = 'smg';
for (const w of ['pistol', 'deagle', 'revolver38']) BALL_CLASS[w] = 'pistol';
BALL_CLASS.lmg = 'lmg';
// Classe de viewmodel por arma — usada pelo caminho ATIVO (ADS `_adsPose`, kickMul de
// pistola, boca de cano `_muzzleWorld`) e lida pelo auditor (invariants.mjs/vm-project.mjs
// fatiam o trecho da declaração até a linha do 'knife' e AVALIAM como JS — não citar a
// declaração literal nos comentários deste bloco, senão a fatia começa no lugar errado).
const STATIC_CLASS = {};
for (const w of ['ak', 'akm', 'm4', 'm92', 'g3', 'carbine', 'mp5', 'uzi', 'p90', 'scar', 'tavor', 'famas', 'lmg']) STATIC_CLASS[w] = 'rifle';
for (const w of ['pistol', 'deagle', 'revolver38']) STATIC_CLASS[w] = 'pistol';
/* MD97 SAIU DE 'shotgun' (game.js:269 até aquela rodada) — mesmo erro de classificação que já
   foi corrigido no BALÍSTICO (BALL_CLASS, logo acima) e no ÁUDIO (audio.js, GUN_CLASS 'ar':
   o manifest mapeava md97 para o sample da XM1014). Ela é o IMBEL MD97, fuzil 5,56 do
   Exército Brasileiro, e a classe de espingarda vazava para QUATRO lugares:
     • _deploySfx  — som de SAQUE de espingarda (1000/1650 Hz) em vez de fuzil (1350/2050)
     • _reloadLayers — `heavy = cls === 'awp' || cls === 'shotgun'` punha o ferrolho grave
       de AWP/espingarda na recarga de um fuzil de assalto
     • _adsPose[cls] — hoje shotgun e rifle têm valores IDÊNTICOS, então não muda pixel
       nenhum; era uma armadilha esperando alguém tunar a pose da espingarda
     • caminho Tripo (?tripovm=1) — arms_shotgun.glb + SHOTGUN_VM.md97, ou seja a MALHA e
       os attachments de espingarda (`shells` = cartuchos de calibre 12 num fuzil 5,56).
       Caminho REMOVIDO em 07/08/2026 (pedido do dono) — restou este registro.
   O viewmodel da md97 vem de public/models/weapons/md97.glb — um GLB por arma — e os
   arms_*.glb da Tripo não existem mais no repo (desta vez de verdade: `git log -- public/models/fpvm`). */
STATIC_CLASS.shotgun = 'shotgun';
STATIC_CLASS.md97 = 'rifle';
for (const w of ['awp', 'mosin', 'rem700', 'm400', 'svd', 'g3sg1', 'sks']) STATIC_CLASS[w] = 'awp';
STATIC_CLASS['knife'] = 'knife';
// FOV da vmCamera com HORIZONTAL constante (GAUNTLET 2.0 — bug 3:2): referência 16:9
// (fov vertical 70). Em telas mais altas (MacBook 3024×1964 ≈ 1.54:1) o FOV horizontal
// encolhia e o VM invadia a tela; aqui o vertical abre p/ compensar — em 16:9 retorna
// exatamente 70 (comportamento de referência inalterado).
// GUNFEEL: V0 70→62. O viewmodel do CS2/Valorant é MAIS FECHADO que o mundo — lente
// fechada = menos distorção de perspectiva na borda do quadro (é ela que abria o
// antebraço em "tubo"). Par NEUTRO em tamanho aparente com VM_SHRINK 0.72→0.62:
//   (0.62/1.0683) ÷ (0.72/1.2448) = 1.003   [H = tan(V0/2)·16/9 = meia-tangente
// HORIZONTAL, constante em qualquer aspecto por construção desta função]
// — a arma NÃO cresce na tela, a regra do dono continua valendo. O que a lente fechada
// muda é só o MAPEAMENTO: um ponto a x/|z| fixo anda ~+3,3%W p/ a direita e ~+4%H p/
// baixo — e é exatamente esse deslocamento que leva a borda esquerda do VM da AK de
// 0,600 (baseline, à esquerda da régua CS2) para 0,634 (dentro de 0,62–0,65).
// CORREÇÃO R2: a doc dizia 0.64, o código sempre teve 0.62. ?vmwide=1 reverte o PAR
// inteiro (70 + 0.72) — nunca mexa em um sem o outro, senão a arma cresce/encolhe.
/* ===== ENQUADRAMENTO DO VIEWMODEL — look Quake 4 / UT / Halo =====
   Diagnóstico (refs do dono: Quake 4, Halo Infinite, UT): nas refs a câmera olha POR TRÁS
   e AO LONGO da arma — traseira grande, boca pequena, cano convergindo pro centro, peça
   deformada por perspectiva. O nosso frame mostrava a arma de FLANCO (espessura uniforme
   da coronha à boca, dava pra ler o nome na madeira da SVD) = retrato de catálogo.
   A causa NÃO era ângulo (o cano já está paralelo à mira, rotation.set(0,0,roll) — regra
   dura) e sim DISTÂNCIA + LENTE: arma longe do olho com lente fechada = projeção quase
   ortográfica. O remédio é o oposto da receita CS2/Valorant: lente ABERTA, arma PERTO,
   coronha CORTADA pela borda direita.
   (O bloco ?vmlook=quake|halo|cs que morava aqui foi REMOVIDO: editava o pipeline Tripo,
   morto desde que o padrão é MINT_VM — os presets renderizavam idênticos no caminho ativo
   e só enganavam. O tuning real acontece nos 5 knobs abaixo + VM_FRAME do vmattach.js.)

   5 KNOBS por querystring (defaults = o valor de produção):
     ?vmfov=N   lente do VM em graus (V0 em 16:9). O item nº1 do look: lente aberta =
                perspectiva forte = traseira grande e boca pequena (razão de escorço ≥1,8).
     ?vmzmul=N  multiplica o recuo de tamanho aparente do Zg (<1 aproxima a arma do olho).
     ?vmnearx=N trava de borda (fração da meia-largura). >1 deixa a coronha SAIR pelo
                canto — em Quake 4/UT a traseira é cortada pela borda, é assinatura do look.
     ?vmtanh=N  sobrescreve o tanH de TODAS as classes (compensa a lente aberta puxando a
                arma pro centro; sem isso ela cai em cima da mira).
     ?vmtanb=N  sobrescreve o tanBarrel (ângulo do cano abaixo do eixo, na tela).
   Mexa nos cinco JUNTOS: isolado, cada um piora (só abrir FOV joga a arma pro meio; só
   aproximar estoura a coronha; só subir tanH com lente fechada manda a arma pra fora). */
/* Lente base do VM em 16:9. Histórico: 70 → 62 → 64 (CS2/Valorant) → 92 (Quake 4, rejeitado
   pelo dono no A/B) → 80 (look CS 1.6 "escolhido no olho") → 42 (RODADA DA REFERÊNCIA MEDIDA).
   POR QUE 80 ERA A CAUSA RAIZ DO "a arma está 2 a 4× menor": V0=80 em 16:9 dá meia-tangente
   HORIZONTAL 1,4917, ou seja 112° de FOV horizontal no viewmodel. O tamanho angular da arma é
   S·L/(Zg·2H) e o teto GEOMÉTRICO dele é L/(back·2H) — o `back` (coronha atrás do grip) não
   deixa o grip se aproximar mais que isso sem a coronha atravessar a lente (VM8). Com H=1,49
   esse teto era ~8,5% de área para a AK, contra os 8,11-13,09% MEDIDOS na referência
   (tools/eval/ref-measure.py sobre references/viewmodel/): a faixa da VM5 era inalcançável
   para 26/26 armas por LENTE, não por tuning. Nenhum valor de vmScale/recuoZ/minz/zMul
   resolve — a busca está em tools/eval/vm-solve.mjs (Hde(), busca em 2 estágios).
   V0=42 dá H=0,6824 (68° horizontal). Medido depois da troca, no vm_mint_audit.json:
   AK 11,7% de área (ref 8,11 piso / M4 9,78 / Vandal 13,09), boca em 0,572 (ref 0,513-0,598),
   borda esquerda 0,591 (ref 0,520-0,565), eixo 30,6° (ref CS 27,3° e 34,8°).
   Par do tanH 0,20 e do tanBarrel 0,22 do VM_FRAME — os três SÓ funcionam juntos (ver o
   bloco de ?vmfov/?vmtanh/?vmtanb acima). */
const VM_FOV_DEFAULT = 42;
const VM_KNOB = (() => {
  const q = new URLSearchParams(location.search);
  const num = (k) => { const v = q.get(k); return (v !== null && v !== '' && !isNaN(+v)) ? +v : null; };
  // ?vmpitch= / ?vmyaw= (RODADA DO GRIP + PITCH): inclinação própria da arma em GRAUS,
  // sobrescrevendo TODAS as classes de uma vez — mesmo espírito do ?vmtanh=. Em graus e não
  // em rad porque este knob é para olhar na tela e comparar com a foto, não para a matemática.
  // ?vmroll= completa o trio: roll é a inclinação LATERAL da arma (girar em torno do cano),
  // que é o "tá muito inclinada pro lado" — pitch/yaw sozinhos não a alcançavam.
  return { zmul: num('vmzmul'), nearx: num('vmnearx'), tanh: num('vmtanh'), tanb: num('vmtanb'),
    pitch: num('vmpitch'), yaw: num('vmyaw'), roll: num('vmroll') };
})();
/* PITCH/YAW DO VIEWMODEL SOB ADS (RODADA DO GRIP + PITCH) — ver VM_FRAME.cls em vmattach.js.
   A arma ganhou inclinação própria para o look CS 1.6 (a boca sobe sem o grip subir), e
   inclinação própria DESALINHA a alça de mira. Esta função é a rampa que devolve a arma ao
   eixo enquanto o ADS entra: adsF=0 -> ângulo cheio, adsF=1 -> zero.
   POR QUE É UMA FUNÇÃO NOMEADA E NÃO `ang * (1 - a)` inline: a VM17 (invariants.mjs) avalia
   ESTA declaração e também exige que o `rotation.set` do viewmodel a CHAME — é a mesma
   trava que a AUD1 pôs no vmOffY depois que uma mutação apagou a chamada e o portão ficou
   verde. Declarar sem chamar tem que ser vermelho. */
const vmAdsRot = (ang, adsF) => ang * (1 - adsF);

function vmFovForAspect(aspect) {
  const _q = new URLSearchParams(location.search);
  // FOV base do viewmodel (V0 vale em 16:9; a função mantém a meia-tangente HORIZONTAL
  // constante em qualquer aspecto). Tunável ao vivo com ?vmfov=N.
  const REF = 16 / 9, V0 = (_q.get('vmfov') ? +_q.get('vmfov') : (_q.get('vmwide') === '1' ? 70 : VM_FOV_DEFAULT)) * Math.PI / 180;
  const halfH = Math.atan(Math.tan(V0 / 2) * REF);
  return 2 * Math.atan(Math.tan(halfH) / aspect) * 180 / Math.PI;
}
// Offset base do viewmodel em VIEW SPACE (x=direita, y=cima, z=frente) — empurra a arma pro
// CANTO inferior-direito. Tunável ao vivo com ?vmoff=x,y,z.
/* y −0,0818 (RODADA DA REFERÊNCIA MEDIDA; era −0,23).
   O −0,23 vinha do "a boca fica a ~0,66H", número que veio de um vídeo assistido e nunca de
   um pixel. A medição (tools/eval/ref-measure.py sobre references/viewmodel/) diz que no CS
   a boca fica em y 0,513-0,598, LOGO abaixo da mira — não em 0,667-0,816, que é onde o
   −0,23 punha a nossa. Ou seja: o offset estava afundando a arma meia tela.
   O VALOR NÃO FOI ESCOLHIDO, FOI RESOLVIDO: a VM9 fixa o offset assim que Zg e a lente
   estão fixos — gripY = 0,5 + 0,5·c/Zg + k·tanH·tanBarrel com c = −offY·(16/9)/H.
   y −0,0818 -> −0,1000 (RODADA DO GRIP + PITCH). Não é tuning: a VM9 foi MEDIDA nesta
   rodada e a banda dela mudou de 0,84-0,92 (asserida) para 0,90-1,08 (grip 0,915 na M4A1
   do CS 1.6; FORA do quadro na AK e na Vandal — tools/eval/ref-measure.py, bloco GRIP).
   Com V0=42 (H=0,6824) e os minz por classe, −0,0818 punha o grip em 0,853-0,914 (15/26
   armas abaixo do piso novo) e −0,1000 põe em 0,959-1,063, dentro da banda com folga nas
   duas pontas. A janela inteira que a VM9 admite é offY ∈ [−0,139 ; −0,091] para o rifle.
   Ver tools/eval/vm-solve.mjs (janelaVM9) e --prova-vazio. */
const VM_OFF = (() => { const s = (new URLSearchParams(location.search).get('vmoff') || '').split(',').map(Number); return s.length === 3 && s.every((n) => !isNaN(n)) ? s : [0.03, -0.1000, 0]; })();
/* OFFSET VERTICAL EM FRAÇÃO DE ALTURA DE TELA, NÃO EM METROS FIXOS (rodada do vm-solve).
   VM_OFF[1] passou a ser o valor NA REFERÊNCIA 16:9, e o offset REAL acompanha a
   meia-tangente VERTICAL do aspecto corrente: offY(a) = VM_OFF[1] · V(a)/V(16:9).
   Como vmFovForAspect trava a meia-tangente HORIZONTAL (V(a) = H/a), isso é (16/9)/a.
   PORQUÊ (a conta está em tools/eval/vm-solve.mjs, bloco 3, e é uma IMPOSSIBILIDADE, não
   um tuning): com o offset constante em metros, um ponto fixo do view space projeta a
   (gripY − 0,5) proporcional ao aspecto, e a razão 16:9 / 3:2 é (16/9)/(3/2) = 1,1852
   SEMPRE — independe de V0, de tanH, de Zg, de tudo. Logo, se a VM9 exige o grip a
   ≥ 0,84 da altura nos DOIS aspectos, o Δ da VM10 é no MÍNIMO 0,1852·0,34 = 0,0630,
   contra um teto de 0,03. VM9 e VM10 eram matematicamente incompatíveis; nenhum valor de
   recuoZ/tanH/minz/zMul/vmScale/V0 fecharia as duas.
   Escalando o offset por V, a contribuição dele na tela vira 0,5·c/z — a MESMA fração de
   altura nos dois aspectos —, e o Δ que sobra é só o do cano: 0,0931·tanH·tanBarrel ≈ 0,017.
   O deslocamento continua no ROOT (e não no gy do grupo da arma) DE PROPÓSITO: gy é o que a
   VM3 mede como ângulo do cano, e jogar 40° de deslocamento vertical lá dentro seria mover
   a medida para fora do alcance da invariante — a fraude que a VM12 existe para impedir. */
/* SEM KILL-SWITCH AQUI DE PROPÓSITO. Tentei um ?vmpar=0 pra permitir A/B no navegador e a
   AUD1 FICOU VERMELHA na hora: o auditor avalia o corpo desta arrow com só VM_OFF e aspect
   em escopo (vm-mint-audit.mjs, loadOffYFn), então qualquer variável nova aqui faz o auditor
   deixar de medir a tela. Preferi manter a régua mordendo a ter a conveniência. Para
   comparar lado a lado, use o commit anterior — não afrouxe o loadOffYFn. */
const vmOffY = (aspect) => VM_OFF[1] * ((16 / 9) / (aspect || 16 / 9));
/* ===================== G3-R1: VIEWMODEL = OS 26 GLBs DA MINT =====================
   A 1ª pessoa usava um pipeline PRÓPRIO — 8 GLBs-herói da Tripo (arms_*.glb, 18 MB cada)
   + um kit de textura-variante e attachments procedurais sobre ~5 malhas base. Resultado
   medido: 26 armas viravam 8 identidades + 5 bases, que é exatamente a reclamação do dono
   ("várias armas têm visuais iguais, perderam a identidade dos models do mint.gg"). A 3ª
   pessoa e o chão, enquanto isso, sempre usaram os 26 GLBs da Mint — um por arma, com
   identidade própria e com len/rot/gripZ JÁ MEDIDOS em weapons.js.
   Existe UM caminho só para as 26 armas: GLB da Mint + braços FP (buildFPArms) + IK no
   grip real (poseToWeapon). O pipeline Tripo viveu atrás do kill-switch ?tripovm=1 para
   A/B e foi REMOVIDO em 07/08/2026 (pedido do dono): 154 MB de public/models/fpvm no
   repo/deploy sem nenhum jogador baixar. Foram juntos: SNIPER_VM/RIFLE_VM/PISTOL_VM/
   SHOTGUN_VM, DED_VM, staticVmKey, vmPreloadClasses, _buildStaticVmClass,
   _ensureStaticVm, _rebuildStaticVmClass e o bloco ?tvm=1. O histórico está no git. */
// (VM_SHRINK, o encolhimento global dos VMs estáticos Tripo, morreu com eles em
// 07/08/2026. O par `?vmwide=1` segue vivo só no FOV — ver vmFovForAspect.)
// EIXO do viewmodel — CALIBRAÇÃO R2 (conserto de regressão).
// A rodada 1 leu pos.x como se fosse um ÂNGULO DE MIRA e o cortou pela metade (ak
// 0.19→0.092, "27° → 14°"). pos.x NÃO aponta o cano: ele diz de QUE ÂNGULO a câmera
// enxerga a arma. Quem alinha o cano ao crosshair é o YAW (≤0.09 em todas desde o
// G2-R14A) — esse continua corrigido e intocado. Com x/|z| em 0.25 o olho passa a
// olhar quase PELA linha do cano e a silhueta colapsa; medido nas capturas da r1:
//   • cano + bloco de gás + alça + BOCA da AK somem por escorço atrás da mão esquerda
//     em 100% dos frames (quebra o `_vmMuzzleCls`: a origem do flash/tracer sai do quadro);
//   • a coronha, que antes seguia o receiver pra direita, passa a se projetar POR CIMA
//     dele e lê como um bloco de madeira solto;
//   • o antebraço deixa de sair pela borda (0,999 → 0,957) e vira um toco/cotovelo;
//   • o VM cruza a linha central (borda esq 0,600 → 0,518).
// Aritmética do enquadramento — sx_origem = 0,5 + 0,5·(x/|z|)/H, com H = tan(V0/2)·16/9.
// Com V0=62 (H = 1,0683) a régua do dono "borda esquerda em 62–65%W" exige
// x/|z| ≈ 0,47–0,54 → 25–28°, que é EXATAMENTE a tabela anterior à r1. Os dois alvos
// dados (14° e 62–65%W) são incompatíveis; o alvo de enquadramento é o que o dono vê.
// Logo o DEFAULT volta a ser a tabela calibrada (2º argumento) e a lente fechada faz o
// trabalho de empurrar tudo para a direita. ?vmaxis=1 traz de volta a tabela estreita
// da rodada 1 (A/B). Cai bem em quality 'low': é só transform, custo zero.
const VMP = (n, o) => (new URLSearchParams(location.search).get('vmaxis') === '1' ? n : o);
// GUN-SPACE e attachments: public/js/vmattach.js (medidas em tools/g2-gunspace.mjs).

// Dificuldade por bot: o SORTEIO fica (variedade dentro da partida — nem todo inimigo é
// igual), mas a MÉDIA volta a ser do jogador. Antes 50% dos bots eram 'ruim' e a variância
// entre duas partidas era maior que a diferença entre FÁCIL e INSANO em qualquer FPS.
const BOT_SKILLS = [  { p: 0.32, tier: 'ruim', skill: 0.62 },
  { p: 0.30, tier: 'medio', skill: 0.95 },
  { p: 0.26, tier: 'bom', skill: 1.25 },
  { p: 0.12, tier: 'muitobom', skill: 1.65 },
];
// settings.difficulty era GRAVADO por main.js e nunca lido por ninguém — o seletor do menu
// estava morto. Aqui ele volta a enviesar o sorteio. ?diff=hard testa sem depender do menu
// (o <select id="diff-select"> ainda falta no index.astro — fora da minha região de edição).
// RECALIBRAGEM (dono: "o padrão tem que ser claramente mais fácil que hoje"). O alvo é
// "morri e ENTENDI por que", não "morri do nada": no normal o bot mediano passa a reagir em
// ~0.5-0.8 s (era ~0.25 s) e a errar os primeiros tiros de rajada.
const DIFF_MUL = { easy: 0.50, normal: 0.72, hard: 1.00, insane: 1.35 };
function diffKey(settings) {
  const k = String(QS.get('diff') || (settings && settings.difficulty) || 'normal').toLowerCase();
  return DIFF_MUL[k] !== undefined ? k : 'normal';
}
function diffMul(settings) { return DIFF_MUL[diffKey(settings)]; }
function rollBotSkill(mul = 1) {
  let r = Math.random();
  for (const s of BOT_SKILLS) { if (r < s.p) return s.skill * mul; r -= s.p; }
  return BOT_SKILLS[0].skill * mul;
}
// Rótulo do tier a partir do skill final (usado no killfeed/nametag: o jogador precisa
// APRENDER quem é perigoso em vez de morrer pra 8 bots visualmente idênticos).
function botTier(skill) { return skill < 0.75 ? 'ruim' : skill < 1.05 ? 'medio' : skill < 1.4 ? 'bom' : 'muitobom'; }

/* Roster da partida, uma fonte só: main.js sorteia ANTES do preload e o Game consome o mesmo
   sorteio. SEMPRE `want` por lado — facção sem elenco repete e avisa; time menor nunca. */
const _cyclePool = (pool, n) => {
  const r = pool.length ? (Math.random() * pool.length) | 0 : 0;
  return Array.from({ length: Math.max(0, n) }, (_, i) => pool[(i + r) % pool.length]).filter(Boolean);
};
const _rosterPool = (pool, want, quem, fallback) => {
  let src = pool;
  if (!src.length) {
    src = fallback.filter(Boolean);
    console.warn(`[times] ${quem}: facção sem personagens disponíveis — completando com o elenco geral (o time NÃO pode ficar menor)`);
  }
  if (!src.length) return [];
  if (src.length < want) console.warn(`[times] ${quem}: ${src.length} personagem(ns) para ${want} vaga(s) — vai REPETIR personagem para os dois lados ficarem iguais`);
  const out = _cyclePool(src, want);
  while (out.length < want) out.push(src[out.length % src.length]);   // rede de segurança
  return out.slice(0, want);
};
/* `dedicado` = servidor autoritativo de multiplayer: não há jogador local ocupando vaga no
   time aliado, então o lado aliado leva teamSize corpos inteiros (e não teamSize-1). É o que
   faz uma sala 5v5 ter DEZ vagas de gente, e não nove com um manequim do lado. */
export function pickMatchRoster(playerFaction, enemyFaction, teamSize, playerCharId, dedicado = false) {
  return {
    allyDefs: _rosterPool(CHARACTERS.filter(c => c.team === playerFaction && c.id !== playerCharId),
      dedicado ? teamSize : teamSize - 1, `aliados (${playerFaction})`, CHARACTERS.filter(c => c.id !== playerCharId)),
    enemyDefs: _rosterPool(CHARACTERS.filter(c => c.team === enemyFaction), teamSize, `inimigos (${enemyFaction})`, CHARACTERS),
  };
}

/* Pool dos bots em modo `all`: uma fonte só para o sorteio da partida (pickMatchWeapons) e
   para o fallback do Game — duas listas divergiriam em silêncio e furariam o preload. */
const BOT_WEAPON_POOL = ['awp', 'ak', 'm4', 'mp5', 'shotgun', 'deagle', 'm92', 'akm', 'md97',
  'carbine', 'm400', 'mosin', 'rem700', 'lmg', 'scar', 'g3', 'tavor', 'famas', 'uzi', 'p90', 'revolver38'];

/* Armas da partida sorteadas ANTES do preload, pelo mesmo motivo do roster: o main.js precisa
   saber o que carregar, e re-sortear no Game poria arma de caixa em bot. Régua: ARM1. */
export function pickMatchWeapons({ mode = 'all', teamSize = 8 } = {}) {
  const um = () => (mode === 'awp' ? 'awp' : mode === 'knife' ? 'knife'
    : mode === 'pistols' ? (Math.random() < 0.5 ? 'pistol' : 'deagle')
    : BOT_WEAPON_POOL[(Math.random() * BOT_WEAPON_POOL.length) | 0]);
  return Array.from({ length: Math.max(1, teamSize) * 2 }, um);
}

export class Game {
  constructor({ renderer, textures, sfx, settings, playerCharId, playerTeam, playerFaction, enemyFaction, nickname, mapId, ctf, roundsMax, testMode = false, mobile = false, matchRoster = null, matchWeapons = null, onQuit, onMatchEnd, onTrainingFrames, recordTraining = false, dedicated = false, mpFactory = null, net = null }) {
    this._ctfOpt = ctf;
    this._matchWeapons = matchWeapons;
    this._armaN = 0;
    this.renderer = renderer;
    this.sfx = sfx;
    this.settings = settings;
    this.testMode = testMode;
    // MOBILE (fase 1): controles de toque no lugar do pointer lock + teclado/mouse.
    this.mobile = mobile;
    this.touchMove = { x: 0, z: 0 };   // stick ESQUERDO (andar) — vetor analógico
    this.touchLook = { x: 0, y: 0 };   // stick DIREITO (mira/câmera) — velocidade angular
    this.onQuit = onQuit;
    this.onMatchEnd = onMatchEnd;
    // A coleta só amostra quando recordTraining veio do consentimento persistido.
    this.onTrainingFrames = onTrainingFrames;
    this._recordEnabled = !!recordTraining && !testMode;
    this._recorder = testMode ? null : new PlayerRecorder(this);
    // A inferência neural é experimental e só liga com ?botbrain=1.
    this._botBrain = null;
    this.botBrainMix = 0;
    if (QS.get('botbrain') === '1' && !testMode) {
      this.botBrainMix = 1;
      new BotBrain().load().then((br) => { this._botBrain = br; }).catch(() => { this.botBrainMix = 0; });
    }
    this.state = 'boot';
    this.paused = false;
    this.time = 0;
    this.mk = { count: 0, until: 0, life: 0 };
    this.radioOpen = null;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.08, 400);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this._mapId = resolveMapId(mapId);
    this.world = MAPS[this._mapId].build(this.scene, textures);
    this._buildEnv();   // IBL: env map de gradiente dusk -> materiais PBR (Standard) ganham ambiente/reflexo
    this.flashTex = textures.flash;
    /* modo de armas também muda o mapa: pickups fora do modo somem (e suas meshes)
       `removeFromParent()` e NÃO `scene.remove()`: o mapa pendura a arma em `root`, e o
       remove() do three é no-op mudo quando o objeto não é filho direto de quem chamou. */
    if (this.world.pickups) {
      const keep = [];
      for (const pk of this.world.pickups) {
        /* id fora de WEAPONS não entra no estado do jogo: o prompt do [E] lê `.short`
           sem guarda todo quadro e congelava a partida. KNOWN-BUGS BUG-70 / #366. */
        if (!WEAPONS[pk.weapon]) {
          console.warn(`[pickup] mapa ${this._mapId}: arma '${pk.weapon}' não existe em WEAPONS — pickup ignorado`);
          pk.mesh?.removeFromParent();
          continue;
        }
        if (this._pickupAllowed(pk.weapon)) {
          const rw = weaponModel(pk.weapon);            // swap the map's box gun for the real GLB
          if (rw && pk.mesh) {
            // ROTAÇÃO ANTES da altura: o assentamento mede a bbox JÁ girada (ver _assentarNoChao).
            rw.rotation.set(0, pk.mesh.rotation.y, 0.12);
            rw.traverse(o => { if (o.isMesh) o.castShadow = true; });
            pk.mesh.removeFromParent(); this.scene.add(rw); pk.mesh = rw;
          }
          keep.push(pk);
        } else if (pk.mesh) pk.mesh.removeFromParent();
      }
      this.world.pickups = keep;
      /* AQUI ficava `_puxarPickupsProGrafo()` (commit 5f8b5a5), REVERTIDO E REMOVIDO em
         08/2026. POR QUE: a crítica adversarial mediu o resultado do arrasto e ele falhou no
         próprio objetivo — 7 dos 8 pickups arrastados continuaram a 2,10-2,50 m da aresta
         mais próxima do grafo, ou seja, seguiram fora do alcance do A*. O `botsim.mjs` de
         piscina_treta saiu byte a byte IDÊNTICO com e sem o arrasto: mover não mudou nada no
         comportamento do bot, que era a justificativa inteira. E o custo foi real: quebrou a
         simetria espelhada de piscina_treta (moveu as 5 armas da parede leste e NENHUMA das 5
         espelhadas do oeste, por mera fase da grade de waypoints) e encostou a deagle a
         0,10 m do spawn P slot 0 (era 1,00 m). Se um pickup do mapa ficar mesmo fora do
         alcance, o conserto é NO MAPA (como o de map_havan.js:1207 desta rodada), não um
         arrasto global em runtime. */
      /* DEFEITO CONSERTADO (game.js:498 antigo): `rw.position.y = Math.max(0.16, ...)` era um
         PISO ABSOLUTO de mundo aplicado depois de o mapa devolver a posição — jogava fora
         qualquer altura que o mapa tivesse calculado e deixava a arma boiando a 0,16 m em
         mapa plano e enterrada em mapa com relevo. Mesmo helper do armário, uma conta só. */
      for (const pk of this.world.pickups) if (pk.mesh) this._assentarNoChao(pk.mesh, pk.x, pk.z);
    }

    // teams & rosters. playerTeam = LADO físico (P/B) — dirige tudo (spawns/placar/killfeed/CTF/
    // cores/yaw). playerFaction = de qual ROSTER vêm os personagens do jogador ('E'/'B'/'U' Tribos
    // Urbanas). Assim o 3º time entra sem tocar em nenhum sistema P/B: ele joga no lado P vs o
    // inimigo político do lado B. enemyFaction = enemyTeam (o inimigo é sempre político).
    this.playerTeam = playerTeam;
    this.playerFaction = playerFaction || playerTeam;
    this.enemyTeam = playerTeam === 'B' ? 'E' : 'B';
    // facção do INIMIGO (o jogador escolhe o adversário: P/B/U). Default = lado político oposto.
    // Se == playerFaction é um MIRROR (mesmo time dos dois lados) -> o inimigo fica ROXO no HUD.
    this.enemyFaction = enemyFaction || this.enemyTeam;
    this.playerDef = byId(playerCharId);
    this.playerCharId = playerCharId;   // usado por _buildViewModels (paleta/braços FP) e _resetPositions (loadout)
    this.combatants = [];   // scoreboard entries
    /* Servidor dedicado: o `player` que ninguém controla fica FORA do elenco, senão vira corpo
       parado e imortal que os inimigos abatem em loop. Ver docs/MULTIPLAYER.md. */
    this.dedicated = !!dedicated;
    /* `online` = autoridade do servidor. `_mp` é injetado pelo main.js; este arquivo nunca
       importa rede. Single-player: `_mp` null e nada de rede roda. Ver docs/MULTIPLAYER.md. */
    this.online = !!(mpFactory && net);
    this._mp = null;
    this._mpPend = this.online ? { mpFactory, net } : null;

    // Câmera 3ª pessoa (tecla B): modo de VISÃO, não de combate - mira e tiro seguem saindo
    // da câmera. Modos, rig, grip e pré-carga do corpo: docs/RIG-PEGA-ARMA.md.
    this.camView = 'first';
    this.playerTP = null;
    this._tpWeapon = null;
    this._tpDead = false;
    this._tpFwd = new THREE.Vector3();
    this._tpRight = new THREE.Vector3();
    this._tpEul = new THREE.Euler();
    this._eyeWorld = new THREE.Vector3();   // posição do OLHO — origem de tiro/fumaça em 3ª pessoa
    /* Só o CORPO do jogador (tecla B) — sem `weapons` o glbchars pré-carrega as 26 armas
       BLOQUEANDO e desfaz o lazy da partida (ARM1/ARM3). BUG-85. */
    /* O dedicado usa `testMode`: sem browser/GLB, preload inútil compete com snapshots.
       No browser, main.js já aguarda o preload antes do `new Game`. */
    if (!testMode) {
      try { preloadCharacterAssets([playerCharId], { weapons: [charWeapon(playerCharId)] }); } catch {}
    }

    // ---- player ----
    // Spawns holding the SAME weapon shown on the character-select screen (charWeapon).
    // primary/secondary remember the last weapon of each slot for the 1/2 keys.
    const startWeapon = charWeapon(playerCharId);
    this.player = {
      isPlayer: true, name: (nickname || '').trim().slice(0, 14) || tr('VOCÊ'), def: this.playerDef, team: playerTeam,
      pos: new THREE.Vector3(), vel: new THREE.Vector3(),
      yaw: 0, pitch: 0, hp: 100, alive: true, respawnAt: 0, crouchF: 0,
      weapon: startWeapon, scoped: false, reloadUntil: 0, nextShotAt: 0, drawUntil: 0,
      primary: startWeapon, secondary: 'pistol',
      ammo: Object.fromEntries(Object.keys(WEAPONS).filter(w => w !== 'knife').map(w => [w, { mag: WEAPONS[w].mag, res: WEAPONS[w].reserve }])),
      kills: 0, deaths: 0, headshots: 0, grounded: true, stepPhase: 0, revealedAt: -99, protUntil: 0, smokes: 5,
    };
    if (!this.dedicated) this.combatants.push(this.player);
    // TELEMETRIA DE ARMA (feat/telemetria): conta abates por id de arma nesta
    // partida. Zerado por partida (new Game por startGame), acumula entre rodadas
    // da mesma partida — mesma granularidade do kills/deaths. Lido pelo main.js
    // no fim da partida e mandado em /api/match (top_weapon + weapon_kills).
    this._wperf = {};
    // ANDAR SILENCIOSO (Shift): o disparo do passo mora no _updatePlayer, num trecho que não
    // é desta região de edição — então o gate fica aqui, envolvendo sfx.step UMA vez (o flag
    // no próprio sfx evita empilhar wrappers quando uma nova partida é criada).
    if (!this.sfx._stepGate) {
      const _s0 = this.sfx.step.bind(this.sfx);
      this.sfx._stepGate = true;
      this.sfx.step = (...a) => { if (!this.sfx._quiet) _s0(...a); };
    }

    // ---- bots ----
    this.bots = [];
    // Custom match: team size (total per side, player fills one ally slot). Dificuldade =
    // sorteio por bot (variedade) × settings.difficulty do menu (média sob controle do jogador).
    const teamSize = Math.max(1, Math.min(8, this.settings.bots || 4));
    // Alvo de abates do round, escalado pelo tamanho do time (4v4 -> 12). MATCH POINT a 2 do fim.
    /* SEM TETO DE ABATES NO SINGLE PLAYER (decisão do dono, 04/08: "os rounds não podem ter
       limite de kills no single player").

       O round fechava por DOIS caminhos: o relógio e um alvo de abates (4v4 -> 12). O alvo
       existia pra dar ritmo, mas ele encurta a rodada justamente quando ela está boa, e o
       jogador não escolheu isso em lugar nenhum do menu. Agora o round de SINGLE PLAYER
       (rodadas) termina só pelo relógio ou por eliminação — que é a regra do CS.

       O CTF não muda: lá o alvo é de BANDEIRAS (`capsToWin`), é a mecânica do modo, e o
       jogador escolheu ao selecionar CAPTURA.

       `?pace=1` devolve o alvo de abates pra quem quiser comparar (era `?pace=0` que
       desligava; o padrão inverteu junto com a decisão). */
    this.killsToWin = PACE ? Math.max(KILLS_MIN, teamSize * KILLS_PER_PLAYER) : Infinity;
    this._diffMul = diffMul(this.settings);
    // dano do bot contra o JOGADOR agora depende da dificuldade escolhida no menu (antes era
    // 0.85 fixo — o seletor não mudava nada além do sorteio de skill).
    this._botDmgPlayer = BOT_FAIR ? (BOT_DMG_BY_DIFF[diffKey(this.settings)] ?? 0.72) : BOT_DMG_PLAYER;
    // Equilíbrio de times: o roster (regra de N×N garantido, repete com aviso se a facção não
    // tem elenco — ver pickMatchRoster) vem sorteado do main.js ou é sorteado aqui (arnês/testes).
    const { allyDefs, enemyDefs } = matchRoster || pickMatchRoster(this.playerFaction, this.enemyFaction, teamSize, playerCharId, this.dedicated);
    const mkBot = (def, team, i) => {
      // arma sorteada no main.js (que preloadou por ela); sem lista, sorteia aqui. Contador
      // próprio: `i` reinicia por LADO e daria a mesma arma aos dois times.
      const wpn = this._matchWeapons?.[this._armaN++] || this._botWeapon();
      const c = buildCharacterModel(def, { weaponId: wpn }) || buildCharacter(def);
      c.group.traverse(o => { o.userData.botOwner = null; });
      const bot = {
        isPlayer: false, name: def.name, def, team,
        mesh: c, pos: new THREE.Vector3(), yaw: 0, hp: 100, alive: true,
        respawnAt: 0, protUntil: 0, kills: 0, deaths: 0,
        target: null, reactAt: 0, nextShotAt: 0, skill: rollBotSkill(this._diffMul) * (0.9 + Math.random() * 0.2), weapon: wpn,
        mag: (WEAPONS[wpn] && WEAPONS[wpn].mag) || 30, aimErr: 0.2, burst: 0, alertUntil: 0,
        path: null, pathIdx: 0, repathAt: 0, roamIdx: 0, phase: 0, think: Math.random() * 0.2,
        deadT: 0, strafeT: Math.random() * 10, revealedAt: -99,
        crouchBias: Math.random() < 0.45, // ~half the bots hold angles crouched (AWPer style)
      };
      bot.tier = botTier(bot.skill);   // tier visível (killfeed/scoreboard): o jogador aprende quem é perigoso
      this._makeTeamMark(bot);         // halo no chão + chevron na cabeça (ver _makeTeamMark)
      c.group.traverse(o => { o.userData.botOwner = bot; });
      this.scene.add(c.group);
      this.bots.push(bot); this.combatants.push(bot);
      return bot;
    };
    allyDefs.forEach((d, i) => mkBot(d, playerTeam, i));
    enemyDefs.forEach((d, i) => mkBot(d, this.enemyTeam, i));
    /* CONFERÊNCIA DO PLACAR DE GENTE (o dono conta os bonecos na tela — o código também tem
       que contar). jogador + aliados de um lado, inimigos do outro; qualquer diferença é bug
       e vai pro console como ERRO, não como silêncio. */
    {
      const nMine = this.bots.filter(b => b.team === playerTeam).length + (this.dedicated ? 0 : 1);   // +1 = o jogador (no dedicado ele não joga)
      const nFoe = this.bots.filter(b => b.team === this.enemyTeam).length;
      const msg = `[times] ${this._teamTag(playerTeam)} ${nMine} × ${nFoe} ${this._teamTag(this.enemyTeam)} (teamSize ${teamSize})`;
      if (nMine !== nFoe) console.error(new Error(msg + ' — TIMES DESIGUAIS (bug de composição)'));
      else console.info(msg);
      this.teamCount = { [playerTeam]: nMine, [this.enemyTeam]: nFoe };   // exposto p/ debug/harness
    }

    // ---- view model ----
    this.vm = this._buildViewModels();
    // VM em CENA PRÓPRIA (port do CoD: viewScene/viewCamera separados, render/index.js):
    // a arma ganha rig de luz dedicado (key/fill/rim/bounce) que NÃO depende do sol do
    // mapa — legível no escuro, rim recortando a silhueta, sem estourar no claro. O
    // composer desenha essa cena por cima do mundo (RenderPass clear=false/clearDepth=
    // true, ver bloom.js/stylize.js); sem pós (quality low/?bloom=0) há fallback no tick.
    // vm.root continua recebendo os mesmos transforms em view space (kick/bob/sway/ADS).
    this.vmCamera = new THREE.PerspectiveCamera(vmFovForAspect(this.camera.aspect), this.camera.aspect, 0.01, 5);
    /* RE-ENQUADRA com a lente de verdade: o 1º _vmFrame(true) rodou DENTRO do
       _buildViewModels (linha 622), ANTES desta vmCamera existir — a trava de borda usou o
       fallback de 62° e o cache de aspecto (_vmFrameAspect) impedia o recálculo pra
       sempre. Descoberto na rodada do look Quake 4: ?vmfov= mudava a lente mas NÃO a trava,
       e a arma encolhia. Aqui o aspecto não mudou, então força. */
    if (this._vmFrame) this._vmFrame(true);
    this.vmScene = new THREE.Scene();
    this.vmScene.environment = this.scene.environment;   // mesmo IBL do mapa (metais leem)
    this.vmScene.add(this.vm.root);
    {
      /* ORÇAMENTO DE LUZ DO VIEWMODEL — MAT2. O rig abaixo (key/fill/sky/rim/bounce+hemi)
         somava 7,60 unidades FIXAS, contra 2,60 (ferro_velho) a 3,60 (praca_poderes) dos mapas:
         a mesma arma recebia 2,1× a 2,9× mais luz na mão do que no chão, e é metade da queixa
         "na mão fica branca, no chão fica escura" (a outra metade era o clamp de metalness,
         ver `fixVmMaterials`). Um número fixo aqui também é frágil por construção: qualquer
         mapa novo com outro sol reabre a divergência sem ninguém perceber.
         Então o nível PASSA A SEGUIR O MAPA: soma o que o mapa REALMENTE acendeu (direcional
         + hemisférica + ambiente; pontual fica fora — é local, com decaimento, e não banha a
         cena) e escala o rig inteiro pra 1,15× disso. A FORMA do rig (5 direções, cores,
         proporção entre elas) é preservada — ela foi calibrada e não é o defeito.
         POR QUE 1,15 E NÃO 1,00: a arma na mão está sempre no primeiro plano e precisa ficar
         legível também quando o jogador está na sombra; 15% acima é o menor empurrão que
         mantém isso. Medido em tools/eval/mat_shade.py: com 1,15× a MESMA arma sai +3,8 L*
         (praca_poderes) e +1,9 L* (ferro_velho) em relação ao drop no chão, contra +14,7 / +13,2
         de antes. Kill-switch: ?vmlux=<k> força o multiplicador do rig, sem piso nem teto
         (?vmlux=1 reproduz as 7,60 unidades antigas em qualquer mapa — conferido); e
         ?vmmat=legacy volta o rig E o material de uma vez só. */
      const LUX_RIG = 7.60;            // soma nominal das intensidades escritas abaixo
      /* game.js:818 — FATOR DE NÍVEL, agora MEDIDO em vez de argumentado. A rodada passada
         escolheu 1,15 ("a arma na mão precisa ficar legível na sombra") sem medir nada, e o
         preço apareceu na cromaticidade: com 1,15 a arma na mão fica +5,5 L* acima do drop
         no praca_poderes, e no AgX (bloom.js, sat 1,12) mais luminância no MESMO albedo marrom sai
         como mais CROMA — é metade do "dourado" que o dono viu. Com 1,00 a arma na mão é a
         MESMA arma do chão, que é literalmente o que o MAT1 cobra. O MAT2 continua verde:
         a faixa dele é [0,80-1,40] e 1,00 está no meio. Kill-switch de sempre: ?vmlux=<k>. */
      const VM_LUX_FATOR = 1.00;
      const luxMapa = (() => {
        let s = 0;
        this.scene.traverse((o) => {
          if (!o.isLight || !(o.intensity > 0)) return;
          if (o.isDirectionalLight || o.isHemisphereLight || o.isAmbientLight) s += o.intensity;
        });
        return s;
      })();
      const luxOv = parseFloat(QS.get('vmlux'));
      // piso 0,30: um mapa noturno não pode apagar a arma da mão do jogador (é HUD, não cenário)
      const vmK = VM_MAT_LEGACY ? 1
        : isFinite(luxOv) ? luxOv
          : Math.min(1, Math.max(0.30, (VM_LUX_FATOR * luxMapa) / LUX_RIG));
      this._vmLux = { luxMapa: +luxMapa.toFixed(3), vmK: +vmK.toFixed(4), soma: +(LUX_RIG * vmK).toFixed(3) };
      /* ===== TINTA DO RIG — game.js:824-900 =====================================
         O QUE O DONO VIU: "a mesma arma no chão sai cinza-escura correta, na mão sai
         DOURADA/BRONZE". A rodada passada casou o NÍVEL de luz (bloco acima, MAT2) e
         declarou o caso resolvido porque o ΔL* mão−chão caiu de 15,5 pra 5,3. Errado
         pela metade: L* é só claridade. Medido agora com a* e b* (tools/eval/mat_shade.py
         ganhou `srgb_to_lab`, e o MAT1 ganhou o Δa*b*), com o rig FIXO de cores abaixo:
             praca_poderes        AK  na mão C* 7,05 h 36,9°  |  no chão C* 3,47 h 27,3°  (2,03×)
             praca_poderes        AKM na mão C*10,58          |  no chão C* 5,63          (1,88×)
             ferro_velho  AKM na mão C* 8,62          |  no chão C*13,15          (0,66×)
         Ou seja: no praca_poderes a arma na mão fica DUAS VEZES mais saturada (e no matiz do
         ouro, 30-55°); no ferro velho ela fica DESSATURADA. É o MESMO defeito nos dois
         sinais, e a causa não é o env map (o MAT2 já confere que a vmScene usa o MESMO
         `scene.environment` do mapa) — é ESTE rig: as 6 cores abaixo são CONSTANTES
         enquanto o sol de cada mapa vai de #fff4e2 (praca_poderes, quase branco) a #ffc07a
         (ferro_velho, laranja de fim de tarde). O nível seguia o mapa; a COR não seguia.
         CORREÇÃO: um ganho cromático por canal que faz a cor SOMADA do rig bater com a cor
         SOMADA das luzes do mapa, preservando (a) a forma do rig — as 5 direções e o
         contraste quente/frio entre elas, que foram calibrados e não são o defeito — e
         (b) a luminância, porque o nível já é assunto do vmK. A conta é feita em espaço
         LINEAR (é onde o shader multiplica) e o ganho é normalizado pela luminância, então
         ele muda MATIZ e CROMA e não mexe em L*.
         Kill-switch: ?vmmat=legacy volta tudo (material + nível + tinta); ?vmtint=0 volta
         só a tinta, pra separar as duas coisas num A/B se a GPU do dono discordar. */
      const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
      const l2s = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
      const linDe = (hex) => [s2l(((hex >> 16) & 255) / 255), s2l(((hex >> 8) & 255) / 255), s2l((hex & 255) / 255)];
      const lum = (v) => 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
      /* DUAS FORMAS FORAM MEDIDAS, E A ESCOLHA É POR NÚMERO (registro de experimento):
         (A) POR PAPEL — key/rim herdam a cor da direcional mais forte do mapa, fill/sky a
             cor de céu da hemisférica, bounce/hemi a cor de chão. Fisicamente mais bonito
             de explicar. MEDIDO: Δa*b* mediano por mapa 1,33 / 1,29 / 0,40 / 0,16 / 0,60.
         (B) GANHO POR CANAL — um ganho cromático único que faz a cor SOMADA do rig bater
             com a cor SOMADA das luzes do mapa. MEDIDO: 1,08 / 0,86 / 0,81 / 0,12 / 0,43.
         (B) ganha em 4 dos 5 mapas e na média (0,66 contra 0,76), então (B) fica. Anoto (A)
         porque a intuição diz o contrário e a próxima pessoa vai querer tentar de novo. */
      const corDoMapa = (() => {
        const a = [0, 0, 0];
        this.scene.traverse((o) => {
          if (!o.isLight || !(o.intensity > 0)) return;
          let c = null;
          if (o.isDirectionalLight || o.isAmbientLight) c = linDe(o.color.getHex());
          else if (o.isHemisphereLight) {
            const s = linDe(o.color.getHex()), g = linDe(o.groundColor.getHex());
            c = [(s[0] + g[0]) / 2, (s[1] + g[1]) / 2, (s[2] + g[2]) / 2];
          } else return;
          for (let k = 0; k < 3; k++) a[k] += c[k] * o.intensity;
        });
        return a;
      })();
      // o rig, com as intensidades NOMINAIS (o vmK é escalar e sai na divisão)
      const RIG = [
        [0xffe8c4, 3.2, -0.45, 0.75, 0.55],    // key: quente, cima-frente-esquerda
        [0x9ec4ff, 0.8, 0.6, -0.15, 0.5],      // fill: frio, baixo-frente-direita
        [0xa8c8ff, 0.25, 0.55, 0.35, 0.75],    // sky fill: fria, do lado oposto à key
        // NOTA (R6.8): a fill camera-locked foi medida inútil (mediana 7.9→8.0) — quem
        // carrega a AK é o piso emissivo por-classe (emisI 5, mediana 7.9→36.7). Removida
        // porque gessificava os metais claros (shotgun).
        [0xffd7a8, 1.6, 0.2, 0.35, -0.9],      // rim: quente, por trás — recorta a silhueta
        [0xffb87a, 0.85, -0.2, -0.86, 0.47],   // bounce: chão quente vindo de baixo
      ];
      const HEMI_RIG = [0x8fb6ff, 0x36302a, 0.9];
      /* CASAMENTO POR PAPEL — TENTADO E MEDIDO PIOR, FICA COMO REGISTRO.
         A ideia (boa no papel): cada luz do rig imita uma fonte real, então que tire a cor
         dela — key/rim do sol do mapa, fill/sky do céu da hemisférica, bounce/hemi do chão.
         Δa*b* mediano por mapa (awp / praca / pool / havan / ferro):
             só por papel            1,33 · 1,29 · 0,40 · 0,16 · 0,60   (média 0,756)
             papel + ganho por canal 1,30 · 0,65 · 0,29 · 0,08 · 0,20   (média 0,505)
             SÓ ganho por canal      0,84 · 0,40 · 0,64 · 0,09 · 0,19   (média 0,432)  <- fica
         O ganho por canal sozinho ganha porque ele corrige a irradiância SOMADA, que é o
         que o sombreamento integra; o casamento por papel acerta a cor de cada fonte mas
         erra a mistura (5 direções do rig contra 1 sol do mapa). Anotado porque a intuição
         diz o contrário e a próxima pessoa vai querer refazer. */
      /* PASSO 2 — GANHO POR CANAL sobre o rig JÁ casado por papel: corrige o resto da
         diferença entre a cor somada do rig e a cor somada das luzes do mapa. */
      const corDoRig = (() => {
        const a = [0, 0, 0];
        for (const [hex, i] of RIG) { const c = linDe(hex); for (let k = 0; k < 3; k++) a[k] += c[k] * i; }
        const s = linDe(HEMI_RIG[0]), g = linDe(HEMI_RIG[1]);
        for (let k = 0; k < 3; k++) a[k] += ((s[k] + g[k]) / 2) * HEMI_RIG[2];
        return a;
      })();
      const semTinta = VM_MAT_LEGACY || QS.get('vmtint') === '0';
      const ganho = (() => {
        if (semTinta) return [1, 1, 1];
        // canal do rig ou do mapa em ~0 => ganho 1 nesse canal (não inventa cor onde não há)
        const g = [0, 1, 2].map((k) => (corDoRig[k] > 1e-6 && corDoMapa[k] > 1e-6 ? corDoMapa[k] / corDoRig[k] : 1));
        const L = lum(g);
        return L > 1e-6 ? g.map((v) => v / L) : [1, 1, 1];   // normaliza: muda COR, não NÍVEL
      })();
      /* Aplica o ganho a UMA cor e devolve {hex, mult}: se algum canal estoura 1,0 o
         excesso vai pra INTENSIDADE em vez de ser cortado — cortar mudaria justamente a
         cor que a gente está tentando acertar. */
      const tinge = (hex) => {
        const c = linDe(hex).map((v, k) => v * ganho[k]);
        const m = Math.max(c[0], c[1], c[2], 1e-9);
        const esc = m > 1 ? m : 1;
        const s = c.map((v) => Math.round(Math.min(1, Math.max(0, l2s(v / esc))) * 255));
        return { hex: (s[0] << 16) | (s[1] << 8) | s[2], mult: esc };
      };
      // direções fixas em VIEW SPACE (a vmCamera nunca se move — posiciona uma vez só)
      const aplicadas = [];
      for (const [hex, i, x, y, z] of RIG) {
        const t = tinge(hex);
        const l = new THREE.DirectionalLight(t.hex, i * vmK * t.mult);
        l.position.set(x, y, z); l.castShadow = false; this.vmScene.add(l, l.target);
        aplicadas.push({ orig: hex, novo: t.hex, i: +(i * vmK * t.mult).toFixed(4) });
      }
      {
        const ts = tinge(HEMI_RIG[0]), tg = tinge(HEMI_RIG[1]);
        // a hemisférica tem duas cores e UMA intensidade: usa o maior estouro pras duas,
        // senão o céu e o chão sairiam com pesos relativos diferentes do original
        const mult = Math.max(ts.mult, tg.mult);
        const rec = (t) => {
          if (mult === t.mult) return t.hex;
          const c = linDe(t.hex).map((v) => v * (t.mult / mult));
          const s = c.map((v) => Math.round(Math.min(1, Math.max(0, l2s(v))) * 255));
          return (s[0] << 16) | (s[1] << 8) | s[2];
        };
        this.vmScene.add(new THREE.HemisphereLight(rec(ts), rec(tg), HEMI_RIG[2] * vmK * mult));
        aplicadas.push({ orig: HEMI_RIG[0], novo: rec(ts), i: +(HEMI_RIG[2] * vmK * mult).toFixed(4) });
      }
      this._vmTinta = { semTinta, ganho: ganho.map((v) => +v.toFixed(4)),
        corMapa: corDoMapa.map((v) => +v.toFixed(4)), corRig: corDoRig.map((v) => +v.toFixed(4)), luzes: aplicadas };
      // muzzle flash CoD: point light quente NA CENA DO VM pulsando ~45ms a cada tiro —
      // ilumina o viewmodel por dentro (a vmScene é renderizada à parte, então a luz do
      // mundo não pega na arma). Sempre presente com intensidade 0 (sem recompilar shader).
      this._vmFlashLight = new THREE.PointLight(0xffd9a0, 0, 3, 2);
      this._vmFlashLight.position.set(0.1, -0.06, -0.75);   // boca do cano em view space (pose GAUNTLET 2.0)
      this.vmScene.add(this._vmFlashLight);
      this._vmFlash = { t: 1, life: 0.045, peak: 1.6 };
      this._fxTune = { light: 1, flash: 1, spark: 1, smoke: 1 };   // multiplicadores de FX (dev.html game-backed)
    }
    this.scene.userData.vmPass = { scene: this.vmScene, camera: this.vmCamera };

    // ---- fx pools ----
    this.tracers = [];
    this.decals = [];
    // bullet-hole decal: shared geometry+material, oriented to the surface normal at hit
    {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d');
      const g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
      g.addColorStop(0, 'rgba(12,10,9,0.98)'); g.addColorStop(0.4, 'rgba(18,16,14,0.85)');
      g.addColorStop(0.75, 'rgba(24,22,19,0.35)'); g.addColorStop(1, 'rgba(24,22,19,0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      // cracks radiating out
      x.strokeStyle = 'rgba(20,17,14,0.7)'; x.lineWidth = 1.6;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + Math.random() * 0.5;
        x.beginPath(); x.moveTo(32 + Math.cos(a) * 10, 32 + Math.sin(a) * 10);
        x.lineTo(32 + Math.cos(a) * (20 + Math.random() * 9), 32 + Math.sin(a) * (20 + Math.random() * 9)); x.stroke();
      }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      this._holeGeo = new THREE.PlaneGeometry(0.22, 0.22);
      this._holeMat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    }
    // Manchas de sangue: mesmo padrão do furo de bala (geometria única + materiais
    // pré-assados, zero alloc por tiro), mas ring buffer próprio com teto 64 — não evicta furo.
    this.bloodDecals = [];
    this._bloodPools = [];
    this._bloodGeo = new THREE.PlaneGeometry(1, 1);   // escalado por colocação
    this._bloodMats = [];
    for (let i = 0; i < 5; i++) {
      const t = this._makeBloodTex(i);
      this._bloodMats.push(new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, opacity: 0.92 }));
    }
    this._bloodPoolMat = new THREE.MeshBasicMaterial({ map: this._makeBloodPoolTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, opacity: 0.9 });
    this.drops = [];
    this.puffTex = this._makePuffTexture();
    // GPU-batched particles: ALL muzzle flashes share one Points (additive), ALL impact puffs
    // share another (soft smoke) — 1 draw call each, zero per-shot allocation (ring buffer).
    this.flashFx = new GPUParticles(this.scene, this.camera, { tex: this.flashTex, additive: true });
    this.puffFx = new GPUParticles(this.scene, this.camera, { tex: this.puffTex, additive: false });
    // Fumaça do cano: sistema CINZA dedicado, que em quality:'low' NÃO pode cair no puffFx
    // bege - é justamente na máquina fraca que ela precisa aparecer. Ver docs/RIG-PEGA-ARMA.md.
    this._muzzleSmokeFx = new GPUParticles(this.scene, this.camera, { tex: this._makeSmokeTex(), additive: false, max: 64 });
    if (this.puffFx && this.puffFx.uniforms) {
      this._muzzleSmokeFx.uniforms.uTime = this.puffFx.uniforms.uTime;
      this._muzzleSmokeFx.uniforms.uScale = this.puffFx.uniforms.uScale;
    }
    // Muzzle flash (R7.5): 2 SPRITES additivos por tiro — estrela irregular com ruído +
    // núcleo branco-quente — compactos (0.35-0.5m), na boca do VM (baixo-direita), vida
    // ≤3 frames (~50ms). Era um cone de 8 segmentos + icosaedro escalado até 1.4 spawnado
    // no EIXO da câmera: a "pirâmide laranja" que tapava 30-50% da tela (crítico R7.5).
    // Pool reusado (0 alloc/tiro); luzes SEMPRE visíveis com intensidade 0 (nº constante
    // de luzes -> sem recompilar shader/hitch).
    this._mzFlashTex = this._makeFlashTex();
    this._mzCoreTex = this._makeFlashCoreTex();
    this._mzPool = []; this._mzActive = [];
    for (let i = 0; i < 8; i++) {
      const jetMat = new THREE.SpriteMaterial({ map: this._mzFlashTex, color: 0xffc26a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const coreMat = new THREE.SpriteMaterial({ map: this._mzCoreTex, color: 0xfff6dc, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const grp = new THREE.Group();
      const jet = new THREE.Sprite(jetMat), core = new THREE.Sprite(coreMat);
      grp.add(jet, core); grp.visible = false; grp.frustumCulled = false; this.scene.add(grp);
      this._mzPool.push({ grp, jet, core, jetMat, coreMat, t: 0, life: 0.05 });
    }
    this._mzLights = []; this._mzLightActive = [];
    for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffd28a, 0, 9, 2); this.scene.add(l); this._mzLights.push(l); }
    // Flash de 1ª PESSOA (R7.6): pool de sprites FILHOS do vm.root — herdam kick/bob/ADS do
    // frame, então a estrela fica COLADA na boca do cano mesmo durante o coice (era sprite
    // no mundo spawnado de ponto fixo camera-local: 89-226px de distância no kick — crítico).
    // Menor que o do mundo: a boca fica a ~0.35m da lente.
    this._vmMzPool = []; this._vmMzActive = [];
    for (let i = 0; i < 3; i++) {
      const jetMat = new THREE.SpriteMaterial({ map: this._mzFlashTex, color: 0xffc26a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const coreMat = new THREE.SpriteMaterial({ map: this._mzCoreTex, color: 0xfff6dc, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const grp = new THREE.Group();
      const jet = new THREE.Sprite(jetMat), core = new THREE.Sprite(coreMat);
      grp.add(jet, core); grp.visible = false; grp.frustumCulled = false;
      this.vm.root.add(grp);
      this._vmMzPool.push({ grp, jet, core, jetMat, coreMat, t: 0, life: 0.05 });
    }
    // tracer mesh pool (shared unit geometry + material; reused, never disposed per shot).
    // Estilo Claude-of-Duty (fx/tracers.js): rastro FINO branco-quente que VIAJA da boca ao
    // alvo e some em ~50-60ms — projétil passando, não "raio laser" amarelo persistente.
    this._tracerGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 1, 5, 1, true);   // fino (era 0.0065 — "lightsaber branca" em cena clara)
    this._tracerMat = new THREE.MeshBasicMaterial({ color: 0xfff3d6, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    this._tracerPool = [];
    // Pose de ADS (iron-sight) POR CLASSE (R7.5): delta aplicado ao vm.root conforme adsF
    // 0→1 — x/y/z deslocam, s = scale-down, rx/ry nivelam a pose baked. LIMITAÇÃO MEDIDA
    // (6 sweeps de captura, r75): o arms_rifle.glb é mesh ÚNICO com o cano baked em
    // diagonal (cant no roll) e o braço de apoio envolve o near-plane da câmera — qualquer
    // centralização forte varre o braço pela lente (por isso o damp 0.12 da R5). A pose
    // final é rotação-dominante: a arma VIRA e SOBE em direção ao centro de forma legível
    // sem invadir a tela. Pistol mantém a curva antiga ×0.35 ("mira pelo slide", aprovada).
    this._adsPose = {
      rifle:  { x: -0.03, y: 0.005, z: -0.04, s: 1, rx: 0, ry: 0 },   // rx/ry zerados (G2-R6A): a pose forward já nasce nivelada — a rotação era p/ corrigir a diagonal baked antiga
      shotgun:{ x: -0.03, y: 0.005, z: -0.04, s: 1, rx: 0, ry: 0 },   // G2-R14A: ADS da shotgun (mesma receita do rifle — mesh baked impede sight picture, VM desliza)
      pistol: { x: -0.06, y: 0.0175, z: -0.035, s: 1, rx: 0, ry: 0 },
      _hip:   { x: -0.02, y: 0.006, z: -0.012, s: 1, rx: 0, ry: 0 },
    };
    // Boca REAL do cano por classe (R7.6): média dos vértices no 4% mais profundo (-z) do
    // mesh estático do VM, medida em probe headless (view space == camera space — vmCamera
    // e câmera principal dividem a orientação). Antes o flash/tracer nasciam de um ponto
    // fixo da câmera a ~250px da arma ("impacto na parede", crítico R7.5).
    this._vmMuzzle = {
      rifle:   new THREE.Vector3(0.245, -0.144, -0.352),
      shotgun: new THREE.Vector3(0.221, -0.214, -0.355),
      pistol:  new THREE.Vector3(0.036, 0.018, -0.29),   // centro da face do cano (bore) — calibrado em captura hip+kick
      awp:     new THREE.Vector3(0.076, -0.191, -0.427),
      knife:   new THREE.Vector3(0.2, -0.12, -0.4),
    };
    // boca por ARMA medida no GLB pelo _vmFrame (origem do flash/tracer). Lookup
    // arma→fallback no _muzzleWorld.
    Object.assign(this._vmMuzzle, this._vmMuzzleExt || {});
    // cápsulas (brass) ejetadas a cada tiro — geo/mat compartilhados, pool reusado
    this._casingGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.05, 8);
    this._casingMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 1.0, roughness: 0.35, emissive: 0x3a2a10, emissiveIntensity: 0.4 });
    this._casings = []; this._casingPool = [];
    // granada de fumaça: projétil (mesh) + nuvem de sprites billboard que bloqueia a visão dos bots
    this._grenades = []; this._smokes = [];
    this._grenGeo = new THREE.SphereGeometry(0.06, 8, 6);
    this._grenMat = new THREE.MeshStandardMaterial({ color: 0x38472c, metalness: 0.2, roughness: 0.8 });
    this._fragMat = new THREE.MeshStandardMaterial({ color: 0x4a2018, metalness: 0.5, roughness: 0.55 });   // HE frag (marrom-metálico)
    this._smokeTex = this._makeSmokeTex();
    // modo Capture the Flag (?ctf=1): 3 pontos (2 spawns + meio); time vence o round segurando
    // os 3 ao mesmo tempo. Rounds SEM FIM (sem _endMatch). Captura = ~3s na zona sem inimigo.
    this.ctf = !!this._ctfOpt || (new URLSearchParams(location.search).get('ctf') === '1');   // menu (Capture the Flag) ou ?ctf=1
    const requestedRounds = Number(roundsMax);
    this._roundsMax = [1, 3, 5, 7].includes(requestedRounds) ? requestedRounds : (this.ctf ? CTF_ROUNDS_MAX : ROUNDS_MAX);
    this.roundsToWin = Math.floor(this._roundsMax / 2) + 1;
    this.ctfPts = [];
    this.ctfCaps = { E: 0, B: 0 };   // total de capturas de bandeira por time (cumulativo na partida)
    this._ctfRingGeo = new THREE.TorusGeometry(1, 0.045, 8, 48);   // anel FINO de contorno (era disco gordo)
    this._ctfZoneGeo = new THREE.CircleGeometry(1, 40);
    this._ctfZoneTex = this._makeCtfZoneTex();
    this._ctfGray = new THREE.Color(0x8a8a86);   // dessaturação da cor de time na zona (-50% sat)
    this.ray = new THREE.Raycaster();

    // ---- round state ----
    this.roundNum = 0;
    this.roundsWon = { E: 0, B: 0 };
    this.roundKills = { E: 0, B: 0 };
    this.roundCaps = { E: 0, B: 0 };    // capturas DESTA rodada (o ctfCaps é da partida toda)
    this.matchKills = { E: 0, B: 0 };   // abates das rodadas JÁ FECHADAS (desempate do _endMatch)
    this.timeLeft = ROUND_TIME;
    /* game.js:944 — RELÓGIO DE PARTIDA DO CAPTURA (não é relógio de round). Só o modo
       CTF usa; no modo de abate fica Infinity e nada o lê. Ele NÃO reinicia a cada
       rodada (é o que o diferencia do `timeLeft`) e só aparece no HUD nos últimos
       CTF_CLOCK_SHOW segundos — ver `_updateHud`. */
    this.ctfMatchLeft = this.ctf ? CTF_MATCH_TIME * (this._roundsMax / CTF_ROUNDS_MAX) : Infinity;
    // alvo de capturas que fecha a RODADA no CTF (o equivalente do killsToWin do abate).
    // Valor PROVISÓRIO: o alvo de verdade é o nº de bandeiras do mapa e só pode ser sabido
    // depois que elas existem — `_initCTF` o sobrescreve com `ctfPts.length` a cada rodada.
    this.capsToWin = this.ctf ? CTF_CAPS_TO_WIN : Infinity;
    this.stateUntil = 0;

    this._dom();
    this._input();
    this._applyQuality();
    this.radarCtx = this.el.radar ? this.el.radar.getContext('2d') : null;
    // botões do HUD: configurações + liga/desliga falas (memes)
    this.el.hudSettings.onclick = () => this.onOpenSettings?.();
    this.el.hudSpeech.textContent = this.settings.speech === false ? '🔇' : '🔊';
    this.el.hudSpeech.onclick = () => {
      const on = this.onToggleSpeech?.();
      this.el.hudSpeech.textContent = on ? '🔊' : '🔇';
    };
    /* O netcode nasce por ÚLTIMO: ele lê `player`, `bots` e `el`, que só existem agora.
       Construí-lo junto com o resto era pegar metade do jogo montada. */
    if (this._mpPend) { this._mp = this._mpPend.mpFactory(this, this._mpPend.net); this._mpPend = null; }
  }

  /* ================= setup ================= */
  _dom() {
    const $ = id => document.getElementById(id);
    this.el = {
      hud: $('hud'), crosshair: $('crosshair'), hitmarker: $('hitmarker'), dmgNums: $('dmg-numbers'),
      scope: $('scope-overlay'), vignette: $('damage-vignette'), dmgDir: $('dmg-dir'),
      hpFill: $('hp-fill'), hpNum: $('hp-num'), weaponName: $('weapon-name'),
      ammoMag: $('ammo-mag'), ammoRes: $('ammo-reserve'), reloadNote: $('reload-note'), smokeCount: $('smoke-count'),
      ammoWeaponArt: $('ammo-weapon-art'), ammoBars: $('ammo-bars'),
      roundTime: $('round-time'), roundsRow: $('rounds-row'),
      scoreP: $('score-e'), scoreB: $('score-b'), killfeed: $('killfeed'), ctfHud: $('ctf-hud'),
      /* Filhos cacheados: _updateHud roda por QUADRO. Antes ele montava a plaqueta
         inteira com innerHTML; agora só escreve o número, e o brasão (data-f) só
         muda quando a facção muda. Sem isto, pôr o brasão no HUD custaria um
         reparse de HTML e uma imagem por quadro. */
      scorePNum: $('score-e').querySelector('b'), scoreBNum: $('score-b').querySelector('b'),
      crestP: $('crest-e'), crestB: $('crest-b'),
      siglaP: $('sigla-e'), siglaB: $('sigla-b'),
      banner: $('round-banner'), bannerTitle: $('banner-title'), bannerSub: $('banner-sub'),
      respawn: $('respawn-overlay'), respawnCount: $('respawn-count'),
      prot: $('prot-badge'), protCount: $('prot-count'),
      scoreboard: $('scoreboard'), sbCols: $('sb-cols'),
      matchEnd: $('match-end'), matchTitle: $('match-title'), matchSub: $('match-sub'), matchStats: $('match-stats'),
      pause: $('pause-menu'), radar: $('radar'),
      // painel de botões do pause: a JANELA DE GUARDA (PAUSE_ARM_MS) desliga o ponteiro
      // NELE, não no overlay inteiro — o fundo continua clicável, e é ele que retoma
      pauseActions: document.querySelector('#pause-menu .pause-actions'),
      radioMenu: $('radio-menu'), radioLog: $('radio-log'), mkBanner: $('mk-banner'),
      lockHint: $('lock-hint'), hudSpeech: $('hud-speech'), hudSettings: $('hud-settings'),
      pickupHint: $('pickup-hint'), weaponHud: $('weapon-hud'),
    };
  }

  // IBL: env map procedural HDR-ish (equirect 512×256 em FLOAT) -> scene.environment.
  // ANTES: um gradiente sRGB 16×128 hardcoded. Como canvas é 8 bits, o "sol" não podia
  // passar de 1.0 linear — nenhum material tinha reflexo especular com range, e a mesma
  // faixa dusk servia pros 4 mapas (meio-dia de Brasília com céu de pôr do sol).
  // AGORA: DataTexture FloatType, então o disco solar vale ~55 em linear (HDR de verdade)
  // e o PMREM gera os mips de rugosidade com highlight que sobrevive ao tonemap. Modelo:
  // gradiente zênite→horizonte + glow de Mie ao redor do sol + disco + chão com albedo +
  // haze no horizonte. Direção/cor do sol vêm do próprio DirectionalLight do mapa
  // (this.world.sun), então cada mapa ganha o SEU céu. Isso melhora TODOS os materiais
  // PBR de uma vez (é o único ambiente que o jogo tem além do hemi).
  // Intensidade exposta em ?env=<mult> (default 1.0); ?env=0 volta pro ambiente só-hemi.
  _buildEnv() {
    try {
      const mult = (() => { const v = parseFloat(new URLSearchParams(location.search).get('env')); return isFinite(v) ? v : 1.0; })();
      if (mult <= 0) { this.scene.environment = null; return; }
      const W = 512, H = 256;
      const sun = this.world && this.world.sun;
      const sd = new THREE.Vector3(0.35, 0.75, -0.25);
      if (sun && sun.position && sun.position.lengthSq() > 0.001) sd.copy(sun.position).normalize();
      const sc = new THREE.Color(sun ? sun.color.getHex() : 0xffe8c8);
      // energia do céu acompanha (de leve) a intensidade do sol do mapa: mapa de fim de
      // tarde não recebe o mesmo ambiente de um meio-dia.
      const sunI = Math.min(3.2, Math.max(0.6, sun ? sun.intensity : 1.6));
      const skyE = mult * (0.62 + 0.14 * sunI);
      const zen = [0.075, 0.16, 0.36], hor = [0.55, 0.62, 0.72];   // linear (sRGB primaries)
      const gnd = [0.085, 0.078, 0.066];                            // albedo do chão * bounce
      const data = new Float32Array(W * H * 4);
      for (let j = 0; j < H; j++) {
        const v = (j + 0.5) / H, phi = (v - 0.5) * Math.PI;
        const sy = Math.sin(phi), cy = Math.cos(phi);
        for (let i = 0; i < W; i++) {
          const u = (i + 0.5) / W, th = (u - 0.5) * Math.PI * 2;
          const dx = cy * Math.cos(th), dz = cy * Math.sin(th);
          const cosS = dx * sd.x + sy * sd.y + dz * sd.z;
          let r, g2, b;
          if (sy >= 0) {
            const t = Math.pow(1 - sy, 5);                       // zênite -> horizonte
            r = zen[0] + (hor[0] - zen[0]) * t;
            g2 = zen[1] + (hor[1] - zen[1]) * t;
            b = zen[2] + (hor[2] - zen[2]) * t;
            const mie = Math.pow(Math.max(cosS, 0), 6) * 0.45 + Math.pow(Math.max(cosS, 0), 48) * 1.1;
            r += mie * sc.r; g2 += mie * sc.g * 0.92; b += mie * sc.b * 0.72;
            if (cosS > 0.99965) { r += 55 * sc.r; g2 += 55 * sc.g; b += 55 * sc.b; }   // disco (~1.5°)
          } else {
            // chão: albedo * irradiância do céu, clareando no horizonte (haze/poeira)
            const t = Math.pow(1 + sy, 8);
            r = gnd[0] * (1 + 3.2 * t); g2 = gnd[1] * (1 + 3.0 * t); b = gnd[2] * (1 + 2.6 * t);
          }
          const o = (j * W + i) * 4;
          data[o] = r * skyE; data[o + 1] = g2 * skyE; data[o + 2] = b * skyE; data[o + 3] = 1;
        }
      }
      const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType);
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.LinearSRGBColorSpace;   // já está em linear, sem decode
      tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      const pmrem = new THREE.PMREMGenerator(this.renderer); pmrem.compileEquirectangularShader();
      if (this._envRT) this._envRT.dispose();
      this._envRT = pmrem.fromEquirectangular(tex);
      this.scene.environment = this._envRT.texture;
      tex.dispose(); pmrem.dispose();
    } catch (e) { console.warn('env map', e); }
  }

  _buildViewModels() {
    const root = new THREE.Group();
    const dark = c => new THREE.MeshLambertMaterial({ color: c });
    // First-person arms inherit the selected character's skin + sleeve colors.
    const pdef = byId(this.playerCharId);
    const pal = (pdef && pdef.pal) || { skin: 0xd9a066, shirt: 0x3a4a5a };
    // LUVA POR TIME no fallback procedural também (mãos genéricas por time — pedido do dono):
    // P vermelho, B verde, U roxo; blend 55% (igual ao fparms) pra não virar luva plástica.
    const GLOVE = { E: 0xd83232, B: 0x28c858, U: 0x8a3ffc };
    const skinMat = dark(pal.skin);
    if (GLOVE[this.playerFaction]) skinMat.color.lerp(new THREE.Color(GLOVE[this.playerFaction]), 0.85);
    const sleeveMat = dark(pal.shirt);
    const skin = skinMat; // legacy alias
    // A curled gripping hand built from two-segment fingers (proximal + distal phalanx),
    // a slimmer palm and an angled thumb — reads as an actual gripping hand, not a brick.
    const fpArm = (w = 0.08) => {
      const g = new THREE.Group();
      const sc = w / 0.08; // callers pass a smaller w for pistols/knife → scale the whole hand
      const knuckle = new THREE.Group(); g.add(knuckle);
      // palm — flattened capsule laid across the grip (X axis), slimmer (mão menos "blocão")
      const palm = new THREE.Mesh(new THREE.CapsuleGeometry(0.030, 0.052, 4, 8), skinMat);
      palm.rotation.z = Math.PI / 2; palm.scale.set(1, 1, 0.5);
      palm.castShadow = false; knuckle.add(palm);
      // four two-segment fingers wrapping over the grip, spaced along Z (mais longos e finos)
      const proxGeo = new THREE.CapsuleGeometry(0.0072, 0.030, 3, 6);
      const distGeo = new THREE.CapsuleGeometry(0.0064, 0.026, 3, 6);
      for (let i = 0; i < 4; i++) {
        const f = new THREE.Group();
        const prox = new THREE.Mesh(proxGeo, skinMat);
        prox.rotation.set(0.5, 0, Math.PI / 2); prox.position.set(0, 0.012, 0);
        const dist = new THREE.Mesh(distGeo, skinMat);
        dist.rotation.set(1.15, 0, Math.PI / 2); dist.position.set(-0.017, -0.006, 0);
        f.add(prox, dist);
        f.position.set(0.004, 0.024, -0.026 + i * 0.016);
        knuckle.add(f);
      }
      // thumb on the near side, angled up along the grip
      const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.038, 3, 6), skinMat);
      thumb.rotation.set(0.35, 0, 0.55); thumb.position.set(-0.03, 0.004, 0.026);
      thumb.castShadow = false; knuckle.add(thumb);
      knuckle.scale.setScalar(sc);
      // Forearm angled toward the screen's bottom corner, carrying the sleeve colour;
      // a rounded cuff at the wrist. Capsule/cylinder → no hard box edges.
      const fore = new THREE.Group();
      fore.rotation.set(0.78, 0.62, 0);
      const L = 0.38 * sc;
      const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(w * 0.46, L, 4, 10), sleeveMat);
      sleeve.rotation.x = Math.PI / 2; sleeve.position.set(0, 0, L * 0.5 + 0.04);
      sleeve.castShadow = false; fore.add(sleeve);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.56, w * 0.52, 0.04, 12), skinMat);
      cuff.rotation.x = Math.PI / 2; cuff.position.set(0, 0, 0.05);
      cuff.castShadow = false; fore.add(cuff);
      g.add(fore);
      return g;
    };
    // Support (front) hand: palm + two-segment curled fingers only, no receding sleeve.
    const frontHand = (sc = 1) => {
      const g = new THREE.Group();
      const palm = new THREE.Mesh(new THREE.CapsuleGeometry(0.029, 0.048, 4, 8), skinMat);
      palm.rotation.z = Math.PI / 2; palm.scale.set(1, 1, 0.5); palm.castShadow = false; g.add(palm);
      const proxGeo = new THREE.CapsuleGeometry(0.0068, 0.028, 3, 6);
      const distGeo = new THREE.CapsuleGeometry(0.006, 0.024, 3, 6);
      for (let i = 0; i < 4; i++) {
        const f = new THREE.Group();
        const prox = new THREE.Mesh(proxGeo, skinMat);
        prox.rotation.set(0.55, 0, Math.PI / 2); prox.position.set(0, 0.011, 0);
        const dist = new THREE.Mesh(distGeo, skinMat);
        dist.rotation.set(1.2, 0, Math.PI / 2); dist.position.set(-0.015, -0.006, 0);
        f.add(prox, dist);
        f.position.set(0.004, 0.022, -0.024 + i * 0.015);
        g.add(f);
      }
      g.scale.setScalar(sc);
      return g;
    };
    // AWP (right-handed)
    const awp = new THREE.Group();
    awp.add(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.09, 0.5), dark(0x2e4a2e)));
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.55, 6), dark(0x1a1a1a));
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.01, -0.5); awp.add(barrel);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.17, 8), dark(0x111111));
    scope.rotation.x = Math.PI / 2; scope.position.set(0, 0.085, -0.05); awp.add(scope);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.2), dark(0x3a2a1e)); stock.position.set(0, -0.05, 0.28); awp.add(stock);
    const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.03), dark(0x888888)); bolt.position.set(0.05, 0.03, 0.05); awp.add(bolt);
    const handR = fpArm(); handR.name = 'handR'; handR.position.set(0, -0.085, 0.02); awp.add(handR);
    const handL = frontHand(0.95); handL.name = 'handL'; handL.position.set(0.005, -0.04, -0.3); awp.add(handL);
    awp.position.set(0.26, -0.23, -0.5); awp.rotation.y = 0.03;
    // rifles genéricos (ak / m4 / mp5 / shotgun / deagle)
    const mkRifle = (bodyC, woodC, len, magH) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.09, len), bodyC));
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6), dark(0x1a1a1a));
      b.rotation.x = Math.PI / 2; b.position.set(0, 0.01, -len / 2 - 0.18); g.add(b);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.18), woodC); stock.position.set(0, -0.04, len / 2 - 0.05); g.add(stock);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.045, magH, 0.07), dark(0x2a2a2a));
      mag.position.set(0, -0.06 - magH / 2, -0.05); g.add(mag);
      const hR = fpArm(); hR.name = 'handR'; hR.position.set(0, -0.085, 0.1); g.add(hR);
      const hL = frontHand(0.95); hL.name = 'handL'; hL.position.set(0.005, -0.04, -len / 3); g.add(hL);
      g.position.set(0.26, -0.23, -0.5); g.rotation.y = 0.03;
      return g;
    };
    const ak = mkRifle(dark(0x2a2a2a), dark(0x6b4f2c), 0.55, 0.16);
    const m4 = mkRifle(dark(0x333333), dark(0x2a2a2a), 0.52, 0.13);
    const mp5 = mkRifle(dark(0x2e2e2e), dark(0x2e2e2e), 0.4, 0.14);
    const shotgun = mkRifle(dark(0x1a1a1a), dark(0x7a5230), 0.5, 0.08);
    const deagle = new THREE.Group();
    deagle.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.26), dark(0x8a8a8a)));
    const dgrip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.07), dark(0xc9a227));
    dgrip.position.set(0, -0.1, 0.09); dgrip.rotation.x = 0.25; deagle.add(dgrip);
    const handD = fpArm(0.075, 0.1, 0.08); handD.name = 'handR'; handD.position.set(0, -0.1, 0.09); deagle.add(handD);
    deagle.position.set(0.24, -0.2, -0.42);
    // pistol
    const pistol = new THREE.Group();
    pistol.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.22), dark(0x333333)));
    const pgrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.06), dark(0x3a2a1e));
    pgrip.position.set(0, -0.09, 0.08); pgrip.rotation.x = 0.25; pistol.add(pgrip);
    const handP = fpArm(0.075, 0.1, 0.08); handP.name = 'handR'; handP.position.set(0, -0.1, 0.08); pistol.add(handP);
    pistol.position.set(0.24, -0.2, -0.42);
    // knife
    const knife = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.05, 0.3), dark(0xb8c0c8)); blade.position.z = -0.2; knife.add(blade);
    knife.add(new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.06, 0.12), dark(0x2a1e14)));
    const handK = fpArm(0.07, 0.08, 0.08); handK.name = 'handR'; handK.position.set(0, -0.02, 0.03); knife.add(handK);
    knife.position.set(0.28, -0.22, -0.4); knife.rotation.set(-0.2, 0.4, -0.45);   // roll/yaw: lâmina de aço legível apontando p/ o centro (r5t-knife-d)
    root.add(awp, ak, m4, mp5, shotgun, deagle, pistol, knife);
    const models = { awp, ak, m4, mp5, shotgun, deagle, pistol, knife };
    // Swap the procedural box guns for the real weapon GLBs where available: add the
    // real model (barrel rotated to point into the screen) and hide the box meshes,
    // keeping the first-person hand. Falls back to the box gun if a model is missing.
    // Align the hands to the REAL weapon: the GLB's grip point sits at the model-group
    // origin (weapons.js), pulled GRIP_Z back toward the camera. The trigger hand wraps
    // the grip; the support hand wraps the handguard ~55% of the way from grip to muzzle
    // (two-handed weapons only). Derived from each weapon's CFG (len/gripZ), not guesses.
    const alignHands = (g, id) => {
      // O grip nasce na origem do grupo (mountRw não desloca), então GRIP_Z = 0.
      const GRIP_Z = 0;
      const gp = gripPoints(id);   // espaço do GLB (cano +Z); aqui o cano é -Z → z' = GRIP_Z - z
      const hR = g.getObjectByName('handR'), hL = g.getObjectByName('handL');
      if (hR) hR.position.set(gp.grip.x, -0.03, GRIP_Z - gp.grip.z);
      if (hL) {
        if (!gp.fore) hL.visible = false;
        else hL.position.set(gp.fore.x, gp.fore.y, GRIP_Z - gp.fore.z);
      }
    };
    /* MATERIAL DO VIEWMODEL — a rodada que FECHOU o defeito "arma branca na mão, escura no
       chão". A rodada anterior deixou o diagnóstico aritmético certo escrito aqui e não
       mexeu, por medo justificado de trocar branco por PRETO sem poder renderizar. O que
       mudou: agora existe medição. Ver tools/eval/mat-check.mjs + tools/eval/mat_shade.py.

       O DIAGNÓSTICO, CONFIRMADO TEXEL A TEXEL (mat_shade.py lê os 26 GLB):
        1) os 26 GLB declaram metallicFactor/roughnessFactor AUSENTES, que pela spec glTF
           §material valem 1,0 — e trazem mapa metallicRoughness. O fator MULTIPLICA a
           textura. `metalness = min(metalness, 0.55)` nunca foi um teto: multiplicava a
           metalicidade de TODO texel por 0,55.
        2) e o mapa ORM da Mint é BEM AUTORADO: metalicidade bimodal (madeira/polímero perto
           de 0, aço perto de 1) — mediana da fração metálica 0,47, p90 típico 0,95. Ou seja,
           o fator 1,0 estava CERTO e o clamp é que estragava: 45% de cada texel de aço virava
           albedo difuso, que num metal claro é o branco leitoso do print.
        3) `roughness = max(roughness, 0.45)` era NO-OP (max(1,0 ; 0,45) = 1,0).
        4) a vmScene somava 7,60 unidades de luz contra 2,60-3,60 dos 5 mapas (2,1× a 2,9×).

       A MEDIDA (analítica, sem GPU: avalia o MeshStandardMaterial do three + AgX do bloom.js
       sobre os texels reais dos GLB, com as luzes medidas em runtime pelo harness):
         ANTES  (metal 0,55 · 7,60 lux): a MESMA arma sai +14,7 L* na mão vs no chão (praca_poderes),
                +13,2 L* no ferro_velho. 26/26 armas acima de +8. É o "cromado".
         DEPOIS (metal 1,0  · 1,15× o orçamento do mapa): +3,8 L* (praca_poderes) / +1,9 (ferrovelho).
       E O MEDO DO PRETO, MEDIDO: com metalness de volta a 1,0 e o IBL presente, a fração de
       amostra abaixo de L* 12 na 1ª pessoa fica em 2,5% (praca_poderes) — CONTRA 9% da MESMA arma
       no chão, que é o caminho que o dono elogiou. Não escurece: converge para o chão.

       O CLAMP NÃO FOI DELETADO, FOI CONDICIONADO. Ele existia para um modo de falha real: SEM
       ambiente (?env=0, ou PMREM falhando) metalness 1,0 lê como silhueta preta mesmo. Então
       ele agora dispara EXATAMENTE nesse caso e só nele — a condição é medida (`temEnv`), não
       assumida. Com env, o material do VM é O MESMO OBJETO do drop e do 3ª pessoa (nem clone),
       que é a tradução literal da invariante MAT1.
       KILL-SWITCH: ?vmmat=legacy volta ao clamp 0,55 + 7,60 lux desta linha para baixo, para
       o dono desfazer numa querystring se a GPU dele discordar da conta. */
    const temEnv = !!this.scene.environment;   // _buildEnv() rodou lá em cima (mesmo frame)
    const fixVmMaterials = (obj) => obj.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      if (!VM_MAT_LEGACY && temEnv) return;   // MAT1: mesmo GLB, mesmo material, nos 3 caminhos
      o.material = o.material.clone();
      if ('metalness' in o.material) o.material.metalness = Math.min(o.material.metalness, 0.55);
      if ('roughness' in o.material) o.material.roughness = Math.max(o.material.roughness, 0.45);
      o.material.envMapIntensity = 1.2;
    });
    // Monta o GLB da Mint dentro do grupo do viewmodel da arma.
    // Escala VM_FRAME.vmScale × cfg.vm e GRIP EXATAMENTE NA ORIGEM do
    // grupo (position.z = 0). Ter o grip na origem é o que torna o enquadramento derivável
    // (_vmFrame) e o que dá ao IK/animação um ponto de empunhadura único e confiável — o
    // +0.12 legado era um chute que deslocava o grip e obrigava a compensar em 3 lugares.
    const mountRw = (g, id) => {
      const rw = weaponModel(id);
      if (!rw) return null;
      rw.name = 'rw';                    // espaço local: grip na origem, cano +Z (IK mira nele)
      // vmRotY (flip 180 só no FP) era um curativo pra um `rot` errado; com o rot medido
      // (weapons.js, p90) ele não é mais necessário — e aqui ele MENTIRIA sobre pra onde
      // o cano aponta, que é justamente o bug "miro no meio do mapa e a arma aponta pra
      // baixo". Sumiu junto com o caminho Tripo, o único que ainda honrava o legado.
      rw.rotation.y = Math.PI;   // cano +Z -> -Z (frente da câmera)
      rw.scale.multiplyScalar(VM_FRAME.vmScale * (weaponCFG(id).vm ?? 1));
      fixVmMaterials(rw);
      g.add(rw);
      return rw;
    };
    for (const id in models) {
      const rw = mountRw(models[id], id);
      if (!rw) continue;
      models[id].children.forEach((ch) => { if (ch.isMesh) ch.visible = false; });
      alignHands(models[id], id);
    }
    // Build first-person viewmodels for the extended arsenal (weapons without a box
    // group): real GLB + a hand, positioned like the AWP viewmodel.
    for (const id of WEAPON_IDS) {
      if (models[id]) continue;
      const g = new THREE.Group();
      mountRw(g, id);
      const hR = fpArm(); hR.name = 'handR'; hR.scale.setScalar(0.85); g.add(hR);   // fallback menor (proporção)
      if (!ONE_HANDED.has(id)) { const hL = frontHand(0.95); hL.name = 'handL'; hL.scale.setScalar(0.85); g.add(hL); }
      alignHands(g, id);
      g.position.copy(awp.position); g.rotation.copy(awp.rotation);
      root.add(g); models[id] = g;
    }
    for (const k in models) models[k].visible = k === 'awp';
    /* ===== ENQUADRAMENTO DERIVADO (G3-R1) — nenhuma tabela por arma =====
       Coloca cada uma das 26 armas na tela a partir do que weapons.js JÁ mede (len, gripZ,
       vm) e de 4 números por classe (VM_FRAME, vmattach.js). Sai daqui, POR ARMA:
         g.position  = (gx, gy, -Zg)  — grip do GLB no ponto certo do quadrante inferior direito
         vm.grip[id] = ponto de empunhadura exposto (o agente de animação prende a mão nele)
         vm.ads[id]  = delta que leva a ALÇA DE MIRA ao centro exato da tela
         _vmMuzzleExt[id] = BOCA DO CANO medida no GLB (origem do flash e do tracer)
       Propriedades provadas em tools/eval/vm-mint-audit.mjs (26/26 aprovadas):
         • o ângulo do cano na tela é atan(|gy|/gx) e NÃO depende do aspecto -> 16:9 e 3:2
           leem os mesmos 12,5° (o bug 3:2 morre por construção, não por tuning);
         • a coronha nunca cruza a lente (nenhum frame de arma cortada/invertida);
         • o grip cai sempre no mesmo pixel -> trocar de arma não reenquadra a tela;
         • dist(ombro, grip) < alcance do braço em TODAS -> nenhuma mão solta no ar.
       O eixo horizontal é o único aspecto-dependente do FOV do VM, e vmFovForAspect já o
       mantém constante; o vertical é convertido AQUI a partir do aspecto atual — por isso
       o recálculo em troca de resolução (chamado do _updatePlayer, custo zero quando igual). */
    const gripPt = {}, adsPt = {}, vmRot = {};
    this._vmFrame = (force) => {
      const asp = (this.vmCamera && this.vmCamera.aspect) || this.camera.aspect || 16 / 9;
      if (!force && this._vmFrameAspect === asp) return;
      this._vmFrameAspect = asp;
      for (const id of Object.keys(models)) {
        const g = models[id], rw = g.getObjectByName('rw');
        if (!rw) continue;
        const met = (rw.userData && rw.userData.metrics) || null;
        const cfg = weaponCFG(id);
        const S = VM_FRAME.vmScale * (cfg.vm ?? 1);
        const t = VM_FRAME.cls[VM_FRAME.classOf[id] || 'rifle'];
        // caixa medida no GLB (metros reais, grip na origem, cano +Z); fallback analítico
        // len·gripZ / len·(1-gripZ) se a medição não veio (GLB ausente).
        const back = S * (met ? Math.max(0, -met.box.min.z) : cfg.len * (1 - cfg.gripZ));
        const fwd = S * (met ? Math.max(0.001, met.box.max.z) : cfg.len * cfg.gripZ);
        let Zg = Math.max(back + t.clear, t.minz, fwd / t.fwdTan) * (VM_FRAME.zMul[id] || 1);
        /* TRAVA DE BORDA (P0.1) — a coronha pode projetar até NEAR_X da meia-largura.
           Sintoma medido em /root/shots/p0/_probe.json (ak, 3:2): a caixa do viewmodel ia
           de NDC x 0,227 a 2,114 e o centro caía em 1,17, ou seja, a maior parte da arma
           estava fora do quadro à direita; o que sobrava na tela era o antebraço enorme e a
           ponta do cano. A causa é geométrica, não de tuning: a arma é uma linha em
           x = Zg·tanH que vai de z = −(Zg−back) até z = −(Zg+fwd). O ponto MAIS PERTO da
           lente (a coronha, em z = −(Zg−back)) é o que projeta mais largo, porque a divisão
           perspectiva usa esse z pequeno. Com back ≈ 0,24 m e Zg = 0,345 a coronha ficava a
           10,4 cm do olho — a 62° de lente isso explode.
           Em vez de chutar `clear` até parar de doer, resolve-se a desigualdade:
             (Zg·tanH) / (Zg − back) ≤ NEAR_X · halfTanH
           que dá o Zg mínimo que mantém a coronha dentro de NEAR_X da largura.
           LOOK QUAKE 4/UT (rodada do enquadramento): NEAR_X > 1 deixa a coronha SAIR pela
           borda direita de propósito — traseira cortada pelo canto é assinatura do look
           (e é o que faz a traseira projetar ENORME: perspectiva com z pequeno). */
        /* RECUO DE TAMANHO APARENTE (P0.2). A fórmula de enquadramento é INVARIANTE À
           ESCALA: back, fwd e gx crescem todos com vmScale, então mexer em vmScale move a
           arma junto e o tamanho na tela não muda — foi por isso que baixar vmScale nunca
           resolveu o "as armas tomam a tela". O que muda o tamanho aparente é a razão
           (comprimento da arma / distância do grip): empurrar Zg pra trás sem mexer no
           comprimento encolhe a arma e mantém o grip no MESMO ponto em NDC (porque
           gx = Zg·tanH também escala). O fator mora em VM_FRAME.recuoZ (?vmzmul= ao vivo):
           <1 APROXIMA a arma do olho — é o que deixa a peça grande E escorçada ao mesmo
           tempo (razão traseira/boca ≥ 1,8, a métrica que separa FPS de foto de catálogo). */
        Zg *= (VM_KNOB.zmul ?? VM_FRAME.recuoZ);
        const tanH = VM_KNOB.tanh ?? t.tanH;        // ?vmtanh= sobrescreve TODAS as classes
        const tanB = VM_KNOB.tanb ?? VM_FRAME.tanBarrel;
        {
          const NEAR_X = VM_KNOB.nearx ?? VM_FRAME.nearX;   // fração da meia-largura da tela
          const halfTanH = Math.tan(THREE.MathUtils.degToRad(((this.vmCamera && this.vmCamera.fov) || 62) / 2)) * asp;
          const lim = NEAR_X * halfTanH;
          if (lim > tanH + 1e-3 && back > 0) Zg = Math.max(Zg, (back * lim) / (lim - tanH));
        }
        const gx = Zg * tanH, gy = -gx * tanB;
        g.position.set(gx, gy, -Zg);
        /* INCLINAÇÃO PRÓPRIA DA ARMA (RODADA DO GRIP + PITCH). Antes daqui só existia o
           `roll`; pitch e yaw eram literais zero, e era isso que amarrava rigidamente a boca
           ao grip e tornava VM8 ∩ VM9 ∩ VM12 uma interseção VAZIA para qualquer parâmetro
           (a conta está em vmattach.js, no bloco de VM_FRAME.cls, e roda em
           `node tools/eval/vm-solve.mjs --prova-vazio`).
           A BALA NÃO SEGUE A ARMA — e nunca seguiu: `_tryShoot` tira a direção de
           `camera.quaternion` e o clarão de `camera.getWorldDirection()`. O viewmodel é
           decorativo (é o que o CS 1.6 faz). O que segue a arma é só a ORIGEM do clarão e do
           tracer, `_vmMuzzleExt[id]`, que sai de `rw.localToWorld` DENTRO deste grupo e
           portanto já nasce girada: o fogo continua saindo da boca desenhada.
           A faca não tem cano e mantém a pose CS própria (knifeRot). */
        const pit = VM_KNOB.pitch != null ? VM_KNOB.pitch * Math.PI / 180 : (t.pitch || 0);
        const yaw = VM_KNOB.yaw != null ? VM_KNOB.yaw * Math.PI / 180 : (t.yaw || 0);
        const rol = VM_KNOB.roll != null ? VM_KNOB.roll * Math.PI / 180 : (t.roll || 0);
        if (id === 'knife') g.rotation.set(VM_FRAME.knifeRot[0], VM_FRAME.knifeRot[1], VM_FRAME.knifeRot[2]);
        else g.rotation.set(pit, yaw, rol);
        // guardado por arma para o ADS conseguir zerar pitch/yaw por frame (vmAdsRot).
        // `ads:false` na faca: a pose dela é identidade, não inclinação de cano.
        vmRot[id] = { pitch: g.rotation.x, yaw: g.rotation.y, roll: g.rotation.z, ads: id !== 'knife' };
        g.updateWorldMatrix(false, false);
        gripPt[id] = new THREE.Vector3(gx, gy, -Zg);
        if (met) {
          rw.updateWorldMatrix(true, false);
          // boca do cano em espaço do vm.root (== view space: o vm.root está em identidade
          // aqui e a vmCamera fica na origem). Vira a origem do flash/tracer no _flash.
          // /met.norm: as medidas vêm em metros reais (espaço do PAI do wrap) e o
          // localToWorld do rw já aplica a escala dele — sem dividir, a escala entraria
          // duas vezes e o clarão nasceria fora do cano.
          (this._vmMuzzleExt || (this._vmMuzzleExt = {}))[id] = rw.localToWorld(met.muzzle.clone().divideScalar(met.norm));
          // ADS: o delta leva a ALÇA (x,y) ao eixo da câmera. adsPullZ traz a arma um
          // pouco pra perto sem encostar a coronha na lente (clear ≥ adsPullZ + folga).
          const s = rw.localToWorld(met.sight.clone().divideScalar(met.norm));
          adsPt[id] = new THREE.Vector3(-s.x, -s.y, VM_FRAME.adsPullZ);
        } else adsPt[id] = new THREE.Vector3(0, 0, 0);
      }
      if (this._vmMuzzle) Object.assign(this._vmMuzzle, this._vmMuzzleExt || {});
    };
    // Braços FP DEDICADOS (FASE 2): asset próprio (models/fparms/arms.glb, mãos com
    // dedos de verdade) p/ TODOS os personagens, por padrão. Só cai nas mãos
    // procedurais (fpArm/frontHand acima) se o GLB não carregou — ou via ?fpoff=1.
    let arms = null;
    // MÃOS FP POR PADRÃO (decisão do dono 28/07 — "mãos genéricas por time", com luva por
    // facção; arma-sozinha virou opt-out via ?hands=0). Se o GLB falhar, cai nas mãos
    // procedurais (fpArm/frontHand — que ficam VISÍVEIS nesse caso, ver abaixo).
    /* BRAÇOS FP DESLIGADOS NO CAMINHO MINT (P0.1, 31/07) — decisão medida, não estética.
       Com o viewmodel novo (GLBs da Mint) os braços de `buildFPArms` entram com escala e
       pose herdadas do pipeline Tripo, que tinha OUTRA distância de grip e OUTRA escala de
       arma. O resultado, capturado em /root/shots/vm/ak.png e /root/shots/p0/ak-32-hip.png,
       é uma massa rosa sem forma de mão ocupando o quadrante inferior direito, com a arma
       solta em cima. Os números confirmam: gripErrR = 0,001 m (a mão DIREITA está travada
       no grip, o cálculo está certo) — o que está errado é o TAMANHO do braço em relação à
       arma, e isso é um rig a refazer, não um offset a tunar.
       Entre entregar "arma com identidade + braço quebrado" e "arma com identidade, sem
       braço", a régua nova decide: o critério nº1 é NÃO TER BUG PERCEPTÍVEL (o dono: "o
       usuário tem que se preocupar em jogar e não com bugs"), e a referência que ele mesmo
       escolheu — ev.io, CS 1.6 — mostra arma-sozinha ou mão mínima na maior parte do tempo.
       Então: o padrão é ARMA SOZINHA, e `?hands=1` liga os braços pra quem
       quiser continuar o trabalho de rig.
       PENDÊNCIA REGISTRADA: refazer a escala/pose de buildFPArms contra o grip da Mint. */
    const _qsHands = new URLSearchParams(location.search).get('hands');
    // SÓ-ARMA por padrão, estilo UNREAL TOURNAMENT (dono é fã de UT — arcade, só a arma no
    // canto, sem mão). As mãos ficavam esquisitas/centralizadas. ?hands=1 liga o braço FP.
    const WEAPON_ONLY = _qsHands !== '1';
    if (!FP_OFF && !WEAPON_ONLY) arms = buildFPArms({ id: this.playerCharId, team: this.playerFaction });
    if (arms) {
      root.add(arms.group);
      // Quem posiciona as armas é o _vmFrame, que deriva o ponto POR ARMA de len/gripZ e
      // garante alcance do braço arma a arma (medido em vm-mint-audit.mjs: folga mínima
      // 0,117 m em 26). A tabela antiga de 3 mounts fixos por classe pendurava uma AWP e
      // uma UZI no MESMO ponto — daí "mão solta no ar". Foi embora com o caminho Tripo.
      for (const k in models) {
        const g = models[k];
        const hR = g.getObjectByName('handR'), hL = g.getObjectByName('handL');
        if (hR) hR.visible = false;
        if (hL) hL.visible = false;
      }
    }
    // SÓ-ARMA: esconde as mãos procedurais (handR/handL) presas a cada modelo de arma.
    // (A handR procedural é cápsulas calibradas pra arma-box antiga — na arma Mint cai
    // torta. Mão boa vem do corpo real do personagem: ver os modos de 3ª pessoa (camView).)
    if (WEAPON_ONLY) for (const k in models) models[k].traverse((o) => { if (o.name === 'handR' || o.name === 'handL') o.visible = false; });
    this._weaponOnly = WEAPON_ONLY;
    // grip/ads expostos no objeto do VM (G3-R1): `grip[id]` é o PONTO DE EMPUNHADURA em
    // espaço do vm.root — contrato combinado com o agente de animação, que prende a mão nele
    // em todos os frames (saque/recarga/tiro) em vez de chutar um offset por classe.
    // `ads[id]` é o delta que centraliza a alça de mira. Ambos repovoados pelo _vmFrame.
    /* BUG-04 — o ViewModelRig (springs.js) estava escrito, TESTADO (vmrig-test.mjs, e a
       invariante RIG rodando em cima dele) e NUNCA IMPORTADO: o game.js só trazia o
       RecoilAxis. Ou seja, a régua validava código que não rodava, e o jogador ficava sem
       a recarga em fases e sem o carregador caindo. Aqui ele entra no viewmodel.
       O QUE O RIG PASSA A MANDAR: recarga (5 fases), saque, sway e respiração de idle.
       O QUE FICA NO CAMINHO ANTIGO, e por quê:
         • coice — os GANHOS (0.070/0.050/…) são lidos do TEXTO deste arquivo por
           tools/eval/vm-kick-sim.mjs (VM7/VM8). Trocar a fonte do coice cegaria as duas.
         • pose de ADS — `_adsPose`+`STATIC_CLASS` são lidos pelo auditor e pela AUD1.
         • bob — travado em `p.stepPhase`, o MESMO contador que dispara o som de passo
           (daí `bobGain: 0`: o rig calcula bobAmp, mas não soma deslocamento). */
    const vmObj = { root, models, awp, pistol, knife, arms, grip: gripPt, ads: adsPt, rot: vmRot, kick: 0, kickSide: 0, bobPhase: 0, rig: new ViewModelRig({ bobGain: 0 }), recoil: new RecoilAxis(11, 0.5, 0.12, 0.15) };
    // R1.b — ACÚMULO EM RAJADA. O 3º/4º argumento do RecoilAxis é o residual (tau, share):
    // a fatia do coice que NÃO volta pela mola e decai por `approach` com constante de tempo
    // tau. Com (0.28, 0.30) o resíduo de um tiro ainda valia ~70% quando o próximo saía
    // (600 RPM = 0,1 s entre tiros): o k empilhava de 0,77 (1 tiro) para 1,36 sustentado e a
    // arma ficava PRESA no alto durante a rajada inteira. Com (0.12, 0.15) o resíduo cai a
    // ~43% em 0,1 s e o k sustentado fica <= 1,0 — a curva volta a ~zero entre tiros, que é
    // o que dá a leitura de "cada tiro é um evento" em vez de "arma tremendo".
    this._vmFrame(true);   // 1º enquadramento (aspecto atual da câmera principal)
    return vmObj;
  }

  _makePuffTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, 'rgba(230,210,180,0.9)'); g.addColorStop(1, 'rgba(230,210,180,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  // Respingo de sangue: `seed` gera 5 variantes estáveis pras manchas não repetirem.
  // Vermelho escuro coagulado (#5a0608–#6e0a0c) de propósito — não vivo.
  _makeBloodTex(seed = 0) {
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d');
    let rng = (seed + 1) * 9301 + 7; const rnd = () => { rng = (rng * 9301 + 49297) % 233280; return rng / 233280; };
    const cx = S / 2, cy = S / 2;
    const blob = (px, py, r, a) => {
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(${80 + (rnd() * 26 | 0)},7,9,${a})`);
      g.addColorStop(0.7, `rgba(${62 + (rnd() * 22 | 0)},5,7,${(a * 0.82).toFixed(2)})`);
      g.addColorStop(1, 'rgba(52,4,6,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    };
    // 3 camadas de densidade decaindo: massa central, anel médio, spray fino
    for (let i = 0; i < 6; i++) blob(cx + (rnd() - .5) * 26, cy + (rnd() - .5) * 26, 20 + rnd() * 16, 0.95);
    for (let i = 0; i < 22; i++) { const a = rnd() * 7, d = 24 + rnd() * 26; blob(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 3 + rnd() * 7, 0.9); }
    for (let i = 0; i < 30; i++) { const a = rnd() * 7, d = 40 + rnd() * 22; blob(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1 + rnd() * 3, 0.85); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  // Poça sob o cadáver: mais redonda e densa que o respingo, com gotas em volta. Cresce em cena.
  _makeBloodPoolTex() {
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d');
    let rng = 4242; const rnd = () => { rng = (rng * 9301 + 49297) % 233280; return rng / 233280; };
    const cx = S / 2, cy = S / 2;
    for (let i = 0; i < 10; i++) {
      const px = cx + (rnd() - .5) * 28, py = cy + (rnd() - .5) * 28, r = 28 + rnd() * 22;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, 'rgba(74,6,8,0.96)'); g.addColorStop(0.75, 'rgba(58,5,7,0.9)'); g.addColorStop(1, 'rgba(50,4,6,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    }
    for (let i = 0; i < 26; i++) {
      const a = rnd() * 7, d = 42 + rnd() * 20, px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d, r = 2 + rnd() * 6;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, 'rgba(68,6,8,0.9)'); g.addColorStop(1, 'rgba(55,4,6,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  // Cola uma mancha de sangue numa superfície (normal do hit). `pool` usa a textura de poça.
  // Ring buffer próprio (teto 64) — não briga com os furos de bala.
  _bloodDecal(pos, normal, scale = 1, pool = false) {
    if (!BLOOD || !normal) return null;
    const mat = pool ? this._bloodPoolMat : this._bloodMats[(Math.random() * this._bloodMats.length) | 0];
    const m = new THREE.Mesh(this._bloodGeo, mat);
    m.position.copy(pos).add(normal.clone().multiplyScalar(0.013));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize());
    m.rotateZ(Math.random() * Math.PI * 2);
    m.scale.setScalar(scale);
    m.renderOrder = 4;
    this.scene.add(m);
    this.bloodDecals.push(m);
    if (this.bloodDecals.length > 64) { const old = this.bloodDecals.shift(); this.scene.remove(old); }
    return m;
  }
  // Spray de sangue: SEMPRE vermelho em qualquer quality — não usa _tintFx de propósito
  // (ele cai pro puff branco no 'low'). Compartilha o relógio do puff pra animar junto.
  _makeBloodFx(additive = false) {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d');
    const rad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    if (additive) {
      // pop brilhante: some rápido, dá o "flash" de acerto
      rad.addColorStop(0, 'rgba(255,64,52,1)'); rad.addColorStop(0.5, 'rgba(210,20,20,0.7)'); rad.addColorStop(1, 'rgba(150,0,0,0)');
    } else {
      // chunky: alpha alto até 62% do raio (lê como GOTA sólida, não fumaça esfumada)
      rad.addColorStop(0, 'rgba(200,22,26,1)'); rad.addColorStop(0.62, 'rgba(150,12,16,0.95)'); rad.addColorStop(1, 'rgba(110,6,8,0)');
    }
    g.fillStyle = rad; g.fillRect(0, 0, 32, 32);
    const tex = new THREE.CanvasTexture(c);
    const fx = new GPUParticles(this.scene, this.camera, { tex, additive, max: 384 });
    if (this.puffFx) { fx.uniforms.uTime = this.puffFx.uniforms.uTime; fx.uniforms.uScale = this.puffFx.uniforms.uScale; }
    fx.points.renderOrder = additive ? 7 : 6;   // por cima da fumaça de impacto
    return fx;
  }
  // Mancha na parede ATRÁS do alvo (na direção da bala) + gota no chão sob ele.
  // `footY` é a altura dos pés do alvo; o fallback é groundHeightAt na coluna do hit.
  _bloodSpatter(pos, dir, head = false, footY = null) {
    if (!BLOOD || !this.world) return;
    // parede atrás (a "saída" do projétil): occluders são justamente as paredes/objetos altos
    if (this.world.occluders && Math.random() < 0.75) {
      this.ray.set(pos, dir); this.ray.far = 6;
      const b = this.ray.intersectObjects(this.world.occluders, false)[0];
      if (b && b.face) this._bloodDecal(b.point, b.face.normal, 0.5 + Math.random() * 0.5 + (head ? 0.4 : 0));
    }
    // O PISO NÃO É OCCLUDER (só h>1.2 entra em occluders) — raycast pra baixo falha.
    // groundHeightAt dá a altura do chão em qualquer (x,z), inclusive rampa/degrau.
    const gy = this.world.groundHeightAt ? this.world.groundHeightAt(pos.x, pos.z, pos.y) : footY;
    if (gy != null && Math.random() < 0.7) {
      const jx = (Math.random() - .5) * 0.7, jz = (Math.random() - .5) * 0.7;   // não empilha no mesmo ponto
      this._bloodDecal(new THREE.Vector3(pos.x + jx, gy, pos.z + jz), new THREE.Vector3(0, 1, 0), 0.45 + Math.random() * 0.45);
    }
  }
  // Poça que cresce sob o cadáver — chamada no _kill. Cresce de 0.3× ao máximo em ~0.6s.
  // Piso via groundHeightAt (não é occluder). worldPos = posição do cadáver (pés).
  _bloodPoolAt(worldPos) {
    if (!BLOOD || !this.world || !this.world.groundHeightAt) return;
    const gy = this.world.groundHeightAt(worldPos.x, worldPos.z, worldPos.y);
    const pool = this._bloodDecal(new THREE.Vector3(worldPos.x, gy, worldPos.z), new THREE.Vector3(0, 1, 0), 0.4, true);
    if (pool) this._bloodPools.push({ mesh: pool, t: 0, max: 2.1 + Math.random() * 1.1 });
  }
  _updateBlood(dt) {
    for (let i = this._bloodPools.length - 1; i >= 0; i--) {
      const p = this._bloodPools[i];
      if (!p.mesh.parent) { this._bloodPools.splice(i, 1); continue; }   // evicta do ring buffer: para de animar
      p.t += dt;
      const k = Math.min(1, p.t / 0.6);
      const ease = 1 - (1 - k) * (1 - k);
      p.mesh.scale.setScalar(0.3 + (p.max - 0.3) * ease);
      if (k >= 1) this._bloodPools.splice(i, 1);   // chegou no tamanho final: solta (o mesh fica na cena)
    }
  }
  // Estrela de muzzle flash IRREGULAR (R7.5): glow quente + 8-11 raios radiais de
  // comprimento/largura/ângulo aleatórios (seed fixo — textura única, a variação por tiro
  // vem do material.rotation). Substitui a silhueta poligonal de arestas duras do cone.
  _makeFlashTex() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    let seed = 41; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    x.globalCompositeOperation = 'lighter';
    const g = x.createRadialGradient(64, 64, 2, 64, 64, 42);
    g.addColorStop(0, 'rgba(255,240,200,0.95)'); g.addColorStop(0.4, 'rgba(255,180,80,0.45)'); g.addColorStop(1, 'rgba(255,140,40,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const R = 8 + Math.floor(rnd() * 4);
    for (let i = 0; i < R; i++) {
      const ang = (i / R) * Math.PI * 2 + rnd() * 0.7;
      const len = 26 + rnd() * 36, w = 2.5 + rnd() * 5;
      x.save(); x.translate(64, 64); x.rotate(ang);
      const lg = x.createLinearGradient(0, 0, len, 0);
      lg.addColorStop(0, 'rgba(255,230,170,0.9)'); lg.addColorStop(0.6, 'rgba(255,170,70,0.35)'); lg.addColorStop(1, 'rgba(255,150,50,0)');
      x.fillStyle = lg;
      x.beginPath(); x.moveTo(0, -w / 2); x.lineTo(len, 0); x.lineTo(0, w / 2); x.closePath(); x.fill();
      x.restore();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  // Núcleo branco-quente do flash (centro quase branco, borda quente suave).
  _makeFlashCoreTex() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 1, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,245,1)'); g.addColorStop(0.35, 'rgba(255,240,200,0.8)'); g.addColorStop(1, 'rgba(255,220,160,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  /* ================= input ================= */
  _input() {
    this.keys = {};
    this._kd = e => {
      if (e.code === 'Tab') { e.preventDefault(); this._showScoreboard(true); }
      /* Em pointer lock, engole os atalhos do navegador que a página PODE cancelar
         (Ctrl+S/D/A/R…). Os que ela NÃO pode — Ctrl+W à frente de todos — não passam por
         aqui: são atalhos reservados e o `preventDefault` é ignorado. Este comentário já
         registrou a derrota ("use C pra agachar"); quem venceu foi `_travaAtalhos()`, com
         a Keyboard Lock API em tela cheia, mais a confirmação de saída do main.js. */
      if ((e.ctrlKey || e.metaKey) && document.pointerLockElement) e.preventDefault();
      // Firefox Quick Find: qualquer letra abre a barra de busca se não cancelar o evento.
      // Em pointer lock o jogo é dono do teclado — engole tudo.
      if (document.pointerLockElement) e.preventDefault();
      this.keys[e.code] = true;
      if (this.radioOpen) {
        const n = { Digit1: 1, Digit2: 2, Digit3: 3 }[e.code];
        if (n) this._radioPick(n);
        this.radioOpen = null; this._radioUi();
        return;
      }
      if (!this._acceptInput()) return;
      if (e.code === 'KeyZ') { this._radioShow('z'); return; }
      if (e.code === 'KeyX') { this._radioShow('x'); return; }
      if (e.code === 'KeyV') { this._radioShow('c'); return; }
      if (e.code === 'KeyB') { this._toggleCamView(); return; }   // 1ª/3ª pessoa on/off
      // slot memory: 1 = last primary held, 2 = last sidearm held (not a hardcoded reset)
      if (e.code === 'Digit1') this._switchWeapon(this.player.primary || 'awp');
      if (e.code === 'Digit2') this._switchWeapon(this.player.secondary || 'pistol');
      if (e.code === 'Digit3') this._switchWeapon('knife');
      if (e.code === 'KeyQ' && this.player.lastInv && this.player.lastInv !== this.player.weapon)
        this._switchWeapon(this.player.lastInv);   // #261: lastinv - Q alterna as duas últimas
      if (e.code === 'KeyE' && this.nearPickup) {
        const { pk, dropIdx } = this.nearPickup;
        this._grabPickup(pk, this.player, true);
        // consome só drops NÃO-rack (armas largadas/mortes); o rack persiste (armário)
        if (dropIdx >= 0 && !pk.rack) this._sumirDrop(dropIdx);
        this.nearPickup = null;
      }
      if (e.code === 'KeyM') { if (this.onRequestSwitch) this.onRequestSwitch(); else this._switchTeam(); }
      if (e.code === 'KeyR') this._startReload();
      if (e.code === 'Digit4') this._throwSmoke();   // fumaça no 4 (convenção CS)
      if (e.code === 'Digit5') this._throwFrag();     // granada de fragmentação no 5
      if (e.code === 'KeyG') this._throwSmoke();      // atalho legado de fumaça
      if (e.code === 'Space') e.preventDefault();
    };
    this._ku = e => {
      if (e.code === 'Tab') this._showScoreboard(false);
      this.keys[e.code] = false;
    };
    this._md = e => {
      if (this.radioOpen) { this.radioOpen = null; this._radioUi(); }
      if (!this._acceptInput()) {
        // pointer lock não engatou (ou caiu)? qualquer clique NO CANVAS retoma e tenta de novo.
        // Inclui o caso pausado-por-perda-de-lock (ex.: depois do M): antes, clicar
        // com o jogo pausado não fazia nada e travava até dar refresh.
        // G2-R2: o gate agora exige que o alvo seja o CANVAS — antes qualquer mousedown
        // no document (inclusive nos botões do pause) despausava e re-travava o ponteiro,
        // então o clique no "SAIR PRO MENU" nunca disparava (o dono clicava e nada).
        // MEDIDO DEPOIS (ver PAUSE_ARM_MS): com o menu de pausa no ar o canvas fica com
        // 0,00 % da tela exposta, então este gate NUNCA passa enquanto pausado — o
        // "clique pra voltar" virou código morto e todo clique do jogador só podia cair
        // nos botões do pause. O FUNDO do menu (95,59 % da tela) reassume esse papel:
        if (this.paused && this._pauseBackdrop(e.target)) {
          this.setPaused(false);
          this._requestLock();
          return;
        }
        if (!this.testMode && (this.state === 'live' || this.state === 'countdown') && !document.pointerLockElement
            && e.target === this.renderer.domElement) {
          if (this.paused) this.setPaused(false);
          this._requestLock();
        }
        return;
      }
      if (e.button === 0) { this.mouseDown0 = true; this._tryShoot(); }
      if (e.button === 2) {
        // Sniper (arma com luneta): botão direito ALTERNA e TRAVA a mira — não precisa segurar
        // (pedido de jogador). Demais armas: ADS enquanto segura (iron-sight).
        const w = this.player.weapon;
        if (WEAPONS[w] && WEAPONS[w].scope) this._scope(!this.player.scoped);
        else this._scope(true);
      }
    };
    this._mu = e => {
      if (e.button === 0) this.mouseDown0 = false;
      if (e.button === 2) {
        const w = this.player.weapon;
        if (!(WEAPONS[w] && WEAPONS[w].scope)) this._scope(false);   // só solta o ADS das não-sniper
      }
    };
    this._mm = e => {
      if (!this._acceptInput()) return;
      // SENSIBILIDADE MIRADA (G3-R1): era um degrau fixo de 0.45 pra qualquer arma — uma AWP
      // com zoom 22 (3,2×) girava igual a uma pistola com zoom 48 (1,5×). Agora escala com o
      // ZOOM REAL (fov atual / 70), com piso em 0.28 pra não travar. É o que faz a luneta
      // parecer luneta: você acompanha o alvo em vez de varrer o mapa com meio centímetro.
      const s = this.settings.sens * 0.0021 * (this.player.scoped ? Math.max(0.28, this.camera.fov / 70) : 1);
      const invertY = this.settings.invertY ? -1 : 1;
      this.player.yaw -= e.movementX * s;
      this.player.pitch -= e.movementY * s * invertY;
      this.player.pitch = Math.max(-1.45, Math.min(1.45, this.player.pitch));
      // viewmodel sway: saiu daqui (BUG-04). Quem produz o sway agora é o ViewModelRig, a
      // partir do Δyaw/Δpitch REAL do quadro — que já embute a sensibilidade e não depende
      // do DPI do mouse nem do framerate, como estes dois acumuladores dependiam.
    };
    this._cc = e => e.preventDefault();
    this._blur = () => { this.keys = {}; };   // alt-tab com tecla pressionada não deixa tecla presa
    this._plc = () => {
      if (!document.pointerLockElement && !this.testMode && (this.state === 'live' || this.state === 'countdown') && !this.paused)
        this.setPaused(true);
    };
    document.addEventListener('keydown', this._kd);
    document.addEventListener('keyup', this._ku);
    document.addEventListener('mousedown', this._md);
    document.addEventListener('mouseup', this._mu);
    document.addEventListener('mousemove', this._mm);
    document.addEventListener('contextmenu', this._cc);
    document.addEventListener('pointerlockchange', this._plc);
    window.addEventListener('blur', this._blur);
    if (this.mobile) this._touchControls();
  }

  /* ============ CONTROLES DE TOQUE (mobile) ============
     Cada zona é um elemento próprio, então joystick + olhar + atirar funcionam juntos (multitouch). Só no mobile (gate this.mobile). */
  _touchControls() {
    if (this._touchUi) return;
    const root = document.createElement('div');
    root.id = 'touch-ui';
    // ícones SVG (herdam a cor via currentColor). Sem texto nos botões.
    const IC = {
      fire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>',
      ads: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="7"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg>',
      reload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 3v5h-5"/></svg>',
      crouch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5l6 6 6-6M6 12l6 6 6-6"/></svg>',
      rifle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 10h13l3-2h4v2l-3 1h-2v2h-3l-1 3h-2l1-3H8v3H5v-3H2z"/></svg>',
      pistol: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 8h14v3h-3l-1 2h-3v5H7v-5H6l-3-2z"/></svg>',
      knife: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 15L14 4l3 3-11 11z"/><rect x="12.5" y="15" width="7" height="2.6" rx="1"/></svg>',
      nade: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="14.5" r="6"/><rect x="10" y="4.5" width="4" height="4"/><rect x="13" y="5" width="6" height="2" rx="1"/></svg>',
    };
    root.innerHTML =
      '<div class="touch-look"></div>' +
      '<div class="touch-joy touch-joy-l"><div class="touch-joy-knob"></div></div>' +
      '<button class="touch-btn touch-fire-l" aria-label="Atirar">' + IC.fire + '</button>' +
      '<button class="touch-btn touch-fire" aria-label="Atirar">' + IC.fire + '</button>' +
      '<button class="touch-btn touch-ads" aria-label="Mirar">' + IC.ads + '</button>' +
      '<button class="touch-btn touch-reload" aria-label="Recarregar">' + IC.reload + '</button>' +
      '<button class="touch-btn touch-crouch" aria-label="Agachar">' + IC.crouch + '</button>' +
      '<button class="touch-btn touch-pause" aria-label="Pausar">II</button>' +
      '<div class="touch-weps">' +
        '<button class="touch-wep" data-wep="primary" aria-label="Arma primária">' + IC.rifle + '</button>' +
        '<button class="touch-wep" data-wep="secondary" aria-label="Pistola">' + IC.pistol + '</button>' +
        '<button class="touch-wep" data-wep="knife" aria-label="Faca">' + IC.knife + '</button>' +
        '<button class="touch-wep" data-wep="smoke" aria-label="Fumaça">' + IC.nade + '</button>' +
        '<button class="touch-wep" data-wep="frag" aria-label="Granada">' + IC.nade + '</button>' +
      '</div>';
    document.body.appendChild(root);
    this._touchUi = root;
    const q = (s) => root.querySelector(s);

    // OLHAR: arraste ajusta yaw/pitch pelo delta do dedo (no lugar do movementX do mouse).
    const look = q('.touch-look');
    let lookId = null, lx = 0, ly = 0;
    look.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0]; lookId = t.identifier; lx = t.clientX; ly = t.clientY; e.preventDefault();
    }, { passive: false });
    look.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== lookId) continue;
        const dx = t.clientX - lx, dy = t.clientY - ly; lx = t.clientX; ly = t.clientY;
        if (!this._acceptInput()) continue;
        const s = this.settings.sens * 0.0024 * (this.player.scoped ? Math.max(0.3, this.camera.fov / 70) : 1);
        const invertY = this.settings.invertY ? -1 : 1;
        this.player.yaw -= dx * s;
        this.player.pitch -= dy * s * invertY;
        this.player.pitch = Math.max(-1.45, Math.min(1.45, this.player.pitch));
      }
      e.preventDefault();
    }, { passive: false });
    const lookEnd = (e) => { for (const t of e.changedTouches) if (t.identifier === lookId) lookId = null; };
    look.addEventListener('touchend', lookEnd); look.addEventListener('touchcancel', lookEnd);

    // STICKS ANALÓGICOS (esquerdo = andar, direito = mira/câmera). Helper genérico: knob segue
    // o dedo até o raio R, com zona morta; `onVec` recebe o vetor -1..1 COM magnitude.
    const stick = (sel, onVec) => {
      const el = q(sel), kn = el.querySelector('.touch-joy-knob'); const R = 56;
      let id = null, cx = 0, cy = 0;
      const move = (t) => {
        const dx = t.clientX - cx, dy = t.clientY - cy;
        const d = Math.hypot(dx, dy) || 1, cl = Math.min(d, R), nx = dx / d, ny = dy / d, mag = Math.min(1, d / R);
        kn.style.transform = `translate(${nx * cl}px, ${ny * cl}px)`;
        if (mag < 0.18) onVec(0, 0); else onVec(nx * mag, ny * mag);
      };
      el.addEventListener('touchstart', (e) => {
        const t = e.changedTouches[0]; id = t.identifier;
        const r = el.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
        move(t); e.preventDefault();
      }, { passive: false });
      el.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) if (t.identifier === id) move(t); e.preventDefault(); }, { passive: false });
      const end = (e) => { for (const t of e.changedTouches) if (t.identifier === id) { id = null; onVec(0, 0); kn.style.transform = ''; } };
      el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
    };
    stick('.touch-joy-l', (x, y) => { this.touchMove.x = x; this.touchMove.z = y; });   // andar (direção; a velocidade é normalizada no movimento)
    // MIRA = arraste na tela (sem stick), estilo CoD Mobile — feito na camada .touch-look acima.

    // BOTÕES: cada um com touchstart/end próprios (stopPropagation implícito por serem elementos).
    const on = (sel, start, end) => {
      const el = q(sel);
      el.addEventListener('touchstart', (e) => { e.preventDefault(); start(); }, { passive: false });
      if (end) { const h = (e) => { e.preventDefault(); end(); }; el.addEventListener('touchend', h); el.addEventListener('touchcancel', h); }
    };
    // DOIS botões de ATIRAR (esquerda perto do joystick = hip-fire; direita = principal).
    const fireStart = () => { if (this._acceptInput()) { this.mouseDown0 = true; this._tryShoot(); } };
    const fireEnd = () => { this.mouseDown0 = false; };
    on('.touch-fire', fireStart, fireEnd);
    on('.touch-fire-l', fireStart, fireEnd);
    on('.touch-reload', () => { if (this._acceptInput()) this._startReload(); });
    on('.touch-ads', () => {
      if (!this._acceptInput()) return;
      const w = this.player.weapon;
      if (WEAPONS[w] && WEAPONS[w].scope) this._scope(!this.player.scoped); else this._scope(true);
    }, () => { const w = this.player.weapon; if (!(WEAPONS[w] && WEAPONS[w].scope)) this._scope(false); });
    on('.touch-crouch', () => { if (this._acceptInput()) this.keys.KeyC = true; }, () => { this.keys.KeyC = false; });
    on('.touch-pause', () => { this.setPaused(!this.paused); });
    // BARRA DE ARMAS (embaixo): primária / pistola / faca / fumaça / granada
    root.querySelectorAll('.touch-wep').forEach((b) => {
      b.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!this._acceptInput()) return;
        const w = b.dataset.wep, p = this.player;
        if (w === 'primary') this._switchWeapon(p.primary || 'awp');
        else if (w === 'secondary') this._switchWeapon(p.secondary || 'pistol');
        else if (w === 'knife') this._switchWeapon('knife');
        else if (w === 'smoke') this._throwSmoke();
        else if (w === 'frag') this._throwFrag();
      }, { passive: false });
    });
  }
  /* AIM-ASSIST DO TOQUE (mobile): sticky aim, não auto-aim — cone apertado e ganho pequeno,
     o jogador continua no comando; só compensa a imprecisão do dedo. Só roda no mobile. */
  _aimAssist(dt) {
    const p = this.player; if (!p.alive) return;
    const from = this.camera.position;
    const cp = Math.cos(p.pitch);
    const ax = -Math.sin(p.yaw) * cp, ay = Math.sin(p.pitch), az = -Math.cos(p.yaw) * cp;   // forward = (-sin,-cos)
    let best = null, bestAng = 0.11;   // ~6,3° de cone
    for (const b of this.bots) {
      if (!b.alive || b.team === this.playerTeam) continue;
      const dx = b.pos.x - from.x, dy = (b.pos.y + 1.2) - from.y, dz = b.pos.z - from.z;
      const dist = Math.hypot(dx, dy, dz); if (dist < 0.5 || dist > 60) continue;
      const nx = dx / dist, ny = dy / dist, nz = dz / dist;
      const ang = Math.acos(Math.max(-1, Math.min(1, ax * nx + ay * ny + az * nz)));
      if (ang >= bestAng) continue;
      this.ray.set(from, new THREE.Vector3(nx, ny, nz)); this.ray.far = dist - 0.3;
      const w = this.ray.intersectObjects(this.world.occluders, false)[0];
      if (w && w.distance < dist - 0.5) continue;   // parede na frente: sem assist
      bestAng = ang; best = { nx, ny, nz };
    }
    if (!best) return;
    const h = Math.hypot(best.nx, best.nz) || 1e-3;
    const tYaw = Math.atan2(-best.nx, -best.nz);
    const tPitch = Math.max(-1.45, Math.min(1.45, Math.atan2(best.ny, h)));
    const k = Math.min(1, (this.mouseDown0 ? 9 : 3.5) * dt);
    let dyaw = tYaw - p.yaw; while (dyaw > Math.PI) dyaw -= 2 * Math.PI; while (dyaw < -Math.PI) dyaw += 2 * Math.PI;
    p.yaw += dyaw * k;
    p.pitch += (tPitch - p.pitch) * k;
  }

  _requestLock() {
    if (this.mobile) return;   // sem pointer lock no toque
    /* ESPECTADOR NÃO PRENDE O MOUSE. Ele não mira nada, e a barra de espectador (trocar de
       alvo, entrar no time) só é clicável com cursor livre. */
    if (this.espectando()) return;
    try { this.renderer.domElement.requestPointerLock()?.catch?.(() => {}); } catch {}
    this._travaAtalhos();
  }

  /* CTRL+W FECHAVA A ABA NO MEIO DO TIROTEIO (Windows/Linux) — relato do Daniel Diniz:
     *"quando fica muito tempo com a tecla Control pressionada a página fecha"*. Não era o
     Control sozinho: agachar é ControlLeft/Right (`_updatePlayer`, `wantCrouch`) e andar
     pra frente é W. **Agachar andando pra frente É Ctrl+W**, que no Windows/Linux fecha a
     aba. No Mac o atalho é Cmd+W, e por isso não reproduzia aqui. Mesma família: Ctrl+1/2/3
     troca de aba, e 1/2/3 é a troca de arma.

     O `preventDefault` do `_kd` NÃO resolve — Ctrl+W é atalho reservado do navegador e a
     página não consegue cancelar (o comentário lá em cima já registrava a derrota). Quem
     resolve é a Keyboard Lock API, e ela **só funciona em tela cheia** — por isso a tela
     cheia entra junto, pedida cedo no `startGame` (main.js), enquanto o clique ainda vale
     como gesto do usuário.

     Escape fica DE FORA da lista de propósito: travado, ele passaria a exigir toque longo
     pra sair da tela cheia, e Escape é como se abre o menu de pausa.

     Chromium só. Firefox e Safari caem na segunda camada — a confirmação de saída do
     `beforeunload` no main.js. Régua: `tools/eval/ctrlw-check.mjs`. */
  _travaAtalhos() {
    if (this.testMode || !document.fullscreenElement) return;
    try { navigator.keyboard?.lock?.(['KeyW', 'KeyT', 'KeyN', 'KeyR', 'Digit1', 'Digit2', 'Digit3'])?.catch?.(() => {}); } catch {}
  }
  _soltaAtalhos() {
    try { navigator.keyboard?.unlock?.(); } catch {}
  }
  /* Está ASSISTINDO? No multiplayer o servidor pode não ter dado corpo (sala cheia, ou o
     jogador pediu para assistir). Sem corpo não há mira, tiro, arma nem pointer lock. */
  espectando() { return !!(this.online && this._mp && this._mp.espectador); }

  _acceptInput() {
    if (this.paused || this.state !== 'live' && this.state !== 'countdown') return false;
    return this.testMode || this.mobile || !!document.pointerLockElement;   // mobile: toque, sem pointer lock
  }
  /* O clique caiu no FUNDO do menu de pausa (e não num botão dele)? Durante a janela de
     guarda o painel está com `pointer-events:none`, então até o clique MIRADO num botão
     chega aqui como fundo — que é o ponto: o tiro que já estava saindo volta pro jogo em
     vez de virar REINICIAR/SAIR. */
  _pauseBackdrop(t) {
    if (!t || !this.el.pause || this.el.pause.classList.contains('hidden')) return false;
    if (t !== this.el.pause && !(t.closest && t.closest('#pause-menu'))) return false;   // clique fora do overlay não conta
    return !(t.closest && t.closest('.pause-actions'));
  }

  /* ================= radio (CS-style voice commands) ================= */
  _radioShow(cat) {
    if (!this.player.alive || this.state !== 'live') return;
    this.radioOpen = cat;
    this._radioUi();
    this.sfx.uiClick();
  }
  _radioUi() {
    const m = this.el.radioMenu;
    if (!this.radioOpen) { m.classList.add('hidden'); return; }
    const c = RADIO[this.radioOpen];
    m.innerHTML = `<div class="radio-title">${c.title}</div>` +
      c.items.map((it, i) => `<div class="radio-item">${i + 1}. ${it}</div>`).join('');
    m.classList.remove('hidden');
  }
  _radioPick(n) {
    const cat = RADIO[this.radioOpen];
    const item = cat.items[n - 1];
    if (!item) return;
    this.sfx.radioVoice(this._voiceKey(this.playerTeam));
    const log = document.createElement('div');
    log.className = 'radio-line';
    log.textContent = `${this.player.name} (${tr('RÁDIO')}): ${item}`;
    this.el.radioLog.appendChild(log);
    setTimeout(() => log.remove(), 4200);
    while (this.el.radioLog.children.length > 3) this.el.radioLog.firstChild.remove();
  }

  /* ================= flow ================= */
  start() {
    this.el.hud.classList.remove('hidden');
    this._startRound();
  }
  _startRound() {
    /* A vinheta do round anterior SEGUE por ~10 s dentro do round novo (dono, 07/08:
       "deixa a música tocar uns 15 s" — 4,5 s já correram na pausa de fim de round).
       A regra antiga ("nada passa de ~5 s do fim do round") caiu. Sair pro menu continua
       cortando na hora: quitToMenu/dispose chamam stopRound(), que cancela esta agenda. */
    try { this.sfx.stopRoundAfter(10); } catch {}
    this.roundNum++;
    // o placar do round zera aqui; o acumulado da partida sobrevive pro desempate
    this.matchKills.E += this.roundKills.E; this.matchKills.B += this.roundKills.B;
    this.roundKills = { E: 0, B: 0 };
    this.roundCaps = { E: 0, B: 0 };
    this.timeLeft = ROUND_TIME;
    this._matchPoint = false;    // banner de MATCH POINT dispara uma vez por round
    this._resultado = null;      // o título do placar é da RODADA que acabou, não da que começa
    // game.js:1868 — pedido de fim de rodada do CAPTURA é POR RODADA: se a rodada acabou
    // por dominação no mesmo frame em que o alvo de bandeiras foi batido, o pedido fica
    // pendurado e mataria a rodada seguinte no primeiro quadro.
    this._roundOverPedido = false;
    this.mk.life = 0; this.mk.count = 0;
    this._resetPositions();
    if (this.ctf) this._initCTF();
    this.state = 'countdown';
    this.stateUntil = this.time + 3;
    this._showScoreboard(false);
    // O alvo do round entra no banner: sem isso o jogador não tem como saber que existe
    // condição de vitória por abates (o HUD só mostra o placar corrido).
    /* game.js:1878 — o banner tem que DECLARAR a condição de vitória do modo, senão o
       jogador não sabe pelo que está jogando. No CAPTURA a condição é bandeira, não
       relógio: dizer "primeiro a 2 bandeiras" é o que substitui o cronômetro que saiu. */
    this._banner(frase('round', this.roundNum), this.ctf
      ? frase('alvoBandeiras', this.capsToWin)
      : (PACE ? frase('alvoAbates', this.killsToWin)
        : (this.roundNum === 1 ? frase('comeceTreta') : frase('voltaTreta'))));
    if (!this.sfx.csSound('roundstart')) this.sfx.vuvuzela(1.4);
  }
  _resetPositions() {
    /* COLOCAÇÃO NO SPAWN — deixada COMO ESTAVA, de propósito (registro de experimento).
       São 4 pontos por time e até 8 combatentes: com `slot % list.length` o 5º ao 8º nascem
       EM CIMA do 1º ao 4º (jitter de ±0,5 m). Parece o culpado óbvio do bolo do print, e as
       DUAS correções tentadas — leque fixo (+2,5 m em x) e afastamento aleatório (1,0-1,8 m)
       — foram MEDIDAS como PIORES no harness de fast-forward (40 corridas × 150 s, Loja H):
         leque fixo:  time da loja na metade inimiga 18,3% -> 7,7% ; rota falhando 18% -> 46%
         aleatório:   idem, 7,9% ; e a pilha de 3+ bots subiu de 35,3% pra 40,0%
       A razão está no mapa: o spawn de dentro da Loja H é um BOLSÃO DE GÔNDOLAS de propósito
       (4 a 6 colliders de 1,8 m a menos de 3 m de cada ponto — medido). Empurrar o boneco 1-2 m
       joga ele atrás da prateleira e ele gasta segundos contornando. Quem desfaz o empilhamento
       aqui é a DESPENETRAÇÃO do _botSeparation, que separa os dois no primeiro frame sem tirar
       ninguém do bolsão seguro. */
    const place = (ent, team, slot) => {
      const list = this.world.spawns[team];
      const s = list[slot % list.length];
      // y vem do MAPA (`_spawnY`), medido no ponto JÁ com o jitter — spawn em plataforma
      // (depósito do mezanino da Havan) nasce em cima dela, não embaixo. Ordem das duas
      // chamadas de Math.random() preservada: o harness depende dela para ser determinístico.
      const jx = s.x + (Math.random() - .5), jz = s.z + (Math.random() - .5);
      ent.pos.set(jx, this._spawnY(jx, jz), jz);
      ent.hp = 100; ent.alive = true; ent.respawnAt = 0; ent.protUntil = 0;
      return s;
    };
    place(this.player, this.playerTeam, 0);
    this.player.yaw = this.playerTeam === 'E' ? Math.PI : 0;
    this.player.pitch = 0; this.player.vel.set(0, 0, 0); this.player.crouchF = 0;
    this.player.ammo.awp = { mag: WEAPONS.awp.mag, res: WEAPONS.awp.reserve };
    this.player.ammo.pistol = { mag: WEAPONS.pistol.mag, res: WEAPONS.pistol.reserve };
    this.player.smokes = 5; this.player.frags = 1; this._updateSmokeHud();   // 5 fumaças + 1 frag por round
    // modo de armas: aplica o loadout inicial. No modo 'all', o player entra com a arma do
    // personagem dele (a mesma da tela de seleção) em vez da AWP padrão.
    const mode = this._wpnMode();
    const cw = charWeapon(this.playerCharId);
    if (mode === 'pistols') {
      this.player.weapon = 'pistol';
      this.player.ammo.awp = { mag: 0, res: 0 };
    } else if (mode === 'knife') {
      this.player.weapon = 'knife';
      this.player.ammo.awp = { mag: 0, res: 0 };
      this.player.ammo.pistol = { mag: 0, res: 0 };
    } else if (mode === 'awp') {
      this.player.weapon = 'awp';
      this.player.ammo.pistol = { mag: 0, res: 0 };
    } else {
      this.player.weapon = cw;
    }
    // reset slot memory to the loadout (1 = primary, 2 = sidearm)
    this.player.primary = PISTOLS.has(this.player.weapon) ? 'pistol' : (this.player.weapon === 'knife' ? cw : this.player.weapon);
    this.player.secondary = 'pistol';
    this.player.scoped = false; this.player.reloadUntil = 0;
    for (const d of this.drops) this.scene.remove(d.mesh);
    this.drops = [];
    // o destaque do pickup aponta pra uma mesh que acabou de sair da cena — sem zerar aqui,
    // o próximo _updatePickups devolveria a altura original de uma arma que não existe mais
    this._pkGlow = null;
    // mesas do armário do round anterior (senão empilha uma por round)
    if (!this._rackFurniture) this._rackFurniture = [];
    for (const f of this._rackFurniture) this.scene.remove(f);
    this._rackFurniture = [];
    // FULL arsenal available AT each respawn — no map-wide scatter. Organized in rows by
    // category (snipers → rifles → bullpups/SMG → sidearms) like a spawn weapon rack.
    const rackRows = [
      ['awp', 'mosin', 'rem700', 'm400', 'svd', 'g3sg1', 'sks'],  // snipers (+ semi-auto)
      ['ak', 'akm', 'm4', 'md97', 'g3', 'scar', 'carbine', 'm92'], // rifles
      ['tavor', 'famas', 'p90', 'mp5', 'uzi', 'shotgun', 'lmg'],   // bullpups / SMG / shotgun / LMG
      ['deagle', 'revolver38', 'pistol'],                        // sidearms
    ].map(row => row.filter(w => this._pickupAllowed(w)));
    /* ARMÁRIO DO SPAWN — POSIÇÃO MEDIDA CONTRA A GEOMETRIA DO MAPA (P3, 01/08).
       BUG DO DONO (print 20:38, ferro_velho): "as armas não dá pra pegar, a segunda
       fileira de armas nos mapas". A versão anterior (b7495ae) botou o rack no CHÃO, mas
       manteve DUAS decisões cegas que são a causa raiz, as duas MEDIDAS com a geometria
       real de cada mapa (colliders + bounds + _collide, o mesmo código que move o jogador):

       (1) A fileira 1 nascia a `sz + back*3,25` — 3,25 m ATRÁS do spawn — sem ninguém
           perguntar se existe 3,25 m de chão ali. Não existe:
             ferro_velho, time E: spawn z=33, limite andável z=35,12 (bounds 35,5 menos
               o raio 0,38 do jogador). Fileira 0 em z=35,00 → 0,12 m dentro do alcance.
               Fileira 1 em z=36,25 → 1,13 m FORA do mundo, atrás da cerca.
             loja_h, time E: spawn z=55, limite 57,12. Fileira 0 em 57,00, fileira 1 em
               58,25 — as 12 armas DENTRO da parede do fundo do estacionamento.
           Como o prompt só considerava a arma MAIS PRÓXIMA, do ponto mais colado possível
           (z=35,12) a fileira 0 estava a 0,12 m e a 1 a 1,13 m: a fileira 0 ganhava SEMPRE.
           Varredura em grade de 5 cm em toda a área andável: 0 de 12 armas da fileira 1
           conseguiam virar prompt nesses dois casos. Impegáveis, não "difíceis".

       (2) O x do rack era ABSOLUTO (centrado em x=0 do mundo), não no spawn do time. Em
           ferro_velho o time B nasce em x=-14..1 e em praca_poderes em x=-9: o rack nascia
           deslocado 6 a 9 m de lado, o que enfiava 9 de 25 armas (ferrovelho B) e 8 de 25
           (havan B) DENTRO de colisores, e jogava a arma mais distante a 15,6 m do spawn.

       Correção, toda ela medida em runtime (nada de constante chutada):
       (a) âncora x = x DO PONTO DE SPAWN DO JOGADOR (slot 0), não x=0 do mundo;
       (b) `_walkDepth` anda pra trás a partir do spawn com a física do jogador e responde
           quantos metros de chão andável existem; as fileiras só vão pra trás se COUBEREM
           (corredor de 2,0 m entre elas). Não cabendo, uma fileira vai pra frente do spawn
           — 1,6 m, ainda dentro da zona de respawn, longe das linhas de tiro do mapa;
       (c) `_freeSpot` empurra CADA arma pro ponto andável mais próximo (mesma física do
           _collide), então nenhuma arma fica dentro de parede/carro/gôndola;
       (d) passo de 1,15 m entre armas (era 0,92) + anti-empilhamento depois do empurrão.
       Kill-switch: ?rack=old volta ao layout antigo (e à seleção antiga em _updatePickups). */
    for (const team of ['E', 'B']) {
      const spawns = this.world.spawns[team] || [];
      const sz = spawns.length ? spawns[0].z : 0;
      const back = sz > 0 ? 1 : -1;                            // pra FORA do mapa, atrás de quem nasce
      const flat = rackRows.flat();
      const perRow = Math.ceil(flat.length / 2);
      // Armas NO CHÃO (dono: estilo CS — a mesa a 0,95 m era inalcançável). O antigo
      // `TOP = 0.12` era y ABSOLUTO de mundo e enterrava/levitava a arma em todo mapa com
      // relevo (ver _assentarNoChao); agora quem manda é a bbox medida, e o único número
      // aqui é a folga de ar contra z-fighting.
      const TOP = 0.01;
      if (RACK_OLD) {
        const HW = 5.5;
        for (let r = 0; r < 2; r++) {
          const row = flat.slice(r * perRow, (r + 1) * perRow);
          if (!row.length) continue;
          const rz = sz + back * (2.0 + r * 1.25);
          row.forEach((w, c) => this._dropWeapon(row.length > 1 ? -HW + (c * 2 * HW) / (row.length - 1) : 0, rz, w, true, TOP));
        }
        continue;
      }
      // (a) o rack segue o SPAWN: x do slot 0, que é onde o jogador nasce sempre
      // (`place(this.player, this.playerTeam, 0)` logo acima). Ancorar aqui, e não no x=0 do
      // mundo nem no centro do time, é o que põe o jogador NO MEIO do armário: com o antigo
      // x=0 a arma mais distante ficava a 15,6 m do spawn em ferro_velho B; agora ~7 m.
      const cx = spawns.length ? spawns[0].x : 0;
      // (b) quanto chão andável existe atrás do spawn? (0 = spawn colado na parede)
      const depth = this._walkDepth(cx, sz, back, 5.4);
      const D0 = 1.6, GAP = 2.0;   // 1ª fileira a 1,6 m; 2,0 m de corredor entre fileiras
      const offs = depth >= D0 + GAP + 0.4 ? [D0, D0 + GAP]    // cabem as duas atrás
        : depth >= D0 + 0.4 ? [D0, -D0]                        // só cabe uma: a outra vai pra frente
        : [-D0, -D0 - GAP];                                    // spawn colado na parede: as duas na frente
      const STEP = 1.15;           // (d) 1,15 m entre armas: separa o alvo do vizinho
      const placed = [];
      for (let r = 0; r < 2; r++) {
        const row = flat.slice(r * perRow, (r + 1) * perRow);
        if (!row.length) continue;
        const rz = sz + back * offs[r];
        const halfW = ((row.length - 1) * STEP) / 2;
        row.forEach((w, c) => {
          const bx = cx - halfW + c * STEP;
          /* (c) + anti-empilhamento: tenta o lugar ideal e, se o empurrão jogou a arma em
             cima de outra já colocada, desliza meio slot pros lados até achar espaço livre.

             REVERTIDO em 08/2026 (era o "critério (e) de alcance a pé", commit 5f8b5a5).
             POR QUE: a crítica adversarial mediu flood-fill de andabilidade a partir dos
             spawns dos dois times e provou que as 202 armas do armário JÁ ERAM 202/202
             alcançáveis no baseline 93af611 — não havia defeito a consertar. O filtro por
             `_retaAndavel` (reta limpa spawn→arma) não é alcance, é VISADA: reprovava toda
             arma que exige contornar o próprio colisor do armário. Estrago medido do filtro:
               • moveu 52 das 202 armas (não as 17 que o commit alegava);
               • loja_h, time B, fileira 1 (12 armas): abriu um vão de 7,53 m entre
                 vizinhas (era 1,15 m, o STEP) e esticou a fileira de 12,65 m para 17,88 m —
                 deixou de ser fileira;
               • praca_poderes, time E: o centroide do armário afastou-se do spawn slot 0 de
                 2,89 m para 4,46 m, quebrando o objetivo declarado logo acima ("o jogador
                 nasce NO MEIO do armário");
               • só 4 armas eram problema real (ferro_velho B: lmg 4,18/22,25 m,
                 deagle 3,73/21,00 m, revolver38 3,60/19,75 m, pistol 3,84/18,75 m — em
                 reta / a pé pelo flood-fill), e mesmo essas 4 seguem ALCANÇÁVEIS (chão
                 alcançado a 0,10-0,16 m delas): caminhar não é andar em linha reta.
             O `_retaAndavel` continua no arquivo (game.js:~3760) atrás de `?rackreta=1`,
             DESLIGADO por padrão, só pra reproduzir o A/B — não reintroduza como padrão sem
             antes derrubar a medição de flood-fill de tools/eval/pickup-check.mjs. */
          let spot = null;
          if (RACK_RETA) {                                     // ramo A/B, off por padrão
            const dirIn = bx > cx ? -1 : 1;                    // "pra dentro" = de volta pro spawn
            const offsX = [0];
            for (let k = 0.58; k <= halfW + 2.4; k += 0.58) offsX.push(dirIn * k, -dirIn * k);
            const alcanca = (q) => spawns.some(s => this._retaAndavel(s.x, s.z, q.x, q.z));
            let ultimo = null, achou = false;
            for (const pull of [0, 0.55, 1.1]) {               // recuo da fileira rumo ao spawn
              const rzc = rz - back * pull;
              for (const off of offsX) {
                const cand = this._freeSpot(bx + off, rzc, 0.5);
                if (!ultimo) ultimo = cand;                    // primeira tentativa = último recurso
                if (placed.some(q => (q.x - cand.x) ** 2 + (q.z - cand.z) ** 2 < 0.6 * 0.6)) continue;
                if (!spot) spot = cand;                        // livre, mas ainda não sei se alcança
                if (alcanca(cand)) { spot = cand; achou = true; break; }
              }
              if (achou) break;
            }
            spot = spot || ultimo;
          } else {
            for (const off of [0, 0.58, -0.58, 1.15, -1.15, 1.73, -1.73, 2.3, -2.3]) {
              const cand = this._freeSpot(bx + off, rz, 0.5);
              if (!spot) spot = cand;                          // primeira tentativa = último recurso
              if (!placed.some(q => (q.x - cand.x) ** 2 + (q.z - cand.z) ** 2 < 0.6 * 0.6)) { spot = cand; break; }
            }
          }
          this._dropWeapon(spot.x, spot.z, w, true, TOP);
          placed.push(spot);
        });
        // SEM mesa: as armas ficam NO CHÃO em fileira (dono pediu estilo CS — a mesa a 0,95 m
        // era bonita mas inalcançável; no chão o jogador anda por cima e pega andando).
      }
    }
    for (const k in this.vm.models) this.vm.models[k].visible = k === this.player.weapon;
    // viewmodel estático Tripo por classe (mesma regra do _switchWeapon, agora num método
    // só — cobre também o lazy-load: classe não carregada cai no procedural e carrega).
    this._applyVmVisibility();
    // BUG-04: início de round/respawn zera o rig e SACA — sem isso o viewmodel podia
    // reaparecer no meio de uma recarga interrompida pela morte.
    this.vm.rig.reset(); this.vm.rig.startDraw();
    this.el.weaponName.textContent = WEAPONS[this.player.weapon].name;
    const slots = { E: 1, B: 0 };
    for (const b of this.bots) {
      place(b, b.team, slots[b.team]++);
      b.yaw = b.team === 'E' ? 0 : Math.PI;   // mesh forward is +Z
      b.target = null; b.path = null; b.repathAt = 0;
      b.mesh.group.rotation.set(0, b.yaw, 0);
      b.mesh.group.position.copy(b.pos);
      b.mesh.group.visible = true;
      if (b.mesh.isGLB) b.mesh.ctrl.revive();
    }
  }

  /* RITMO: o round tem ALVO (this.killsToWin) — quem chega primeiro fecha na hora. Roda a
     cada frame a partir do _updatePlayer (o update() principal não é desta região de edição;
     zerar timeLeft deixa o fluxo de fim de round existente fazer o resto, sem duplicar
     caminho). Também emite o MATCH POINT a 2 abates do fim: é o pico que o round não tinha. */
  /* ALVO DE CAPTURAS — FORA DO GATE DE PACE, e é POR ISSO que ele é uma função separada.
     ═══════════════════════════════════════════════════════════════════════════════════
     CAUSA RAIZ de *"o jogo tá reiniciando do nada, estava num CTF no ferro velho do Zé"*.

     O bloco de doutrina do modo (game.js:84-104) declara que "a RODADA fecha por ALVO DE
     CAPTURAS (CTF_CAPS_TO_WIN) ou por dominação — NUNCA por tempo", e chama o
     CTF_MATCH_TIME de **rede de segurança**. Mas esta verificação morava dentro do
     `_checkPace()`, que abre com `if (!PACE ...) return` — e `PACE` é `?pace=1`,
     DESLIGADO por padrão. O `_updatePlayer` ainda chamava tudo sob `if (PACE)`.

     Consequência medida numa partida normal de CAPTURA (crash-watch, ferro_velho):
     o time B chegou a 3 capturas — o alvo — e a rodada 1 seguiu correndo. A rodada
     NUNCA fechava. O único fim possível era `ctfMatchLeft <= 0` aos 480 s, que dispara
     `_endRound()` e `_endMatch()` no MESMO frame, sem cronômetro na tela (o relógio só
     materializa nos últimos CTF_CLOCK_SHOW = 60 s). Do lado do jogador: você está no
     meio do tiroteio e a partida evapora. É o "reiniciou do nada", e não tem nada a ver
     com o menu de pausa do BUG-00 — aquele defeito continua consertado.

     O modo de ABATE continua sob PACE de propósito: lá o alvo por abates é experimento,
     e o round já fecha sozinho pelo relógio de 99 s. No CAPTURA não existe relógio de
     round pra fechar nada, então o alvo não é ritmo — é a ÚNICA condição de vitória.

     Caminho separado (flag em vez de chamada direta): o CAPTURA não tem `timeLeft` pra
     zerar, então PEDE o fim por `_roundOverPedido` e o `update()` atende no mesmo frame;
     sem a flag, a única saída seria chamar `_endRound()` de dentro da varredura de
     combatentes. Régua: `tools/eval/ctf-round-check.mjs`. */
  _checkCtfAlvo() {
    if (!this.ctf || this.state !== 'live') return;
    const cp = this.roundCaps.E, cb = this.roundCaps.B, alvo = this.capsToWin;
    if (!Number.isFinite(alvo)) return;
    const lider = Math.max(cp, cb);
    if (!this._matchPoint && alvo > 1 && lider >= alvo - 1) {
      this._matchPoint = true;
      const lado = cp > cb ? 'E' : 'B';
      this._banner(frase('bandeiraDecisiva'), `${this._teamName(lado)} a ${alvo - lider} de levar a rodada`);
      try { this.sfx.vuvuzela(0.9); } catch {}
    }
    if (lider >= alvo) this._roundOverPedido = true;
  }
  _checkPace() {
    if (!PACE || this.state !== 'live') return;
    if (this.ctf) return;   // o CAPTURA fecha pelo _checkCtfAlvo, que roda SEMPRE
    const p = this.roundKills.E, b = this.roundKills.B, tgt = this.killsToWin;
    const lead = Math.max(p, b);
    if (!this._matchPoint && lead >= tgt - 2) {
      this._matchPoint = true;
      const side = p > b ? 'E' : 'B';
      this._banner(frase('matchPoint'), `${this._teamName(side)} a ${tgt - lead} da vitória`);
      try { this.sfx.vuvuzela(0.9); } catch {}
    }
    if (lead >= tgt) this.timeLeft = 0;   // update() enxerga timeLeft<=0 e chama _endRound
  }
  _endRound() {
    const p = this.roundKills.E, b = this.roundKills.B;
    let winner = null;
    /* NO CAPTURA quem leva o round é quem CAPTUROU MAIS naquele round — abate só desempata.
       Antes o modo não tinha `_endRound` nenhum (o relógio nem corria): o único jeito de um
       round acabar era dominar as 3 bandeiras ao mesmo tempo, e é por isso que o placar de
       abates do topo ia a 65 × 53 (defeito 3 do dono) — ele NUNCA era zerado. */
    if (this.ctf) {
      const cp = this.roundCaps.E, cb = this.roundCaps.B;
      if (cp > cb) winner = 'E'; else if (cb > cp) winner = 'B';
      else if (p > b) winner = 'E'; else if (b > p) winner = 'B';
    } else if (p > b) winner = 'E'; else if (b > p) winner = 'B';
    if (winner) this.roundsWon[winner]++;
    this.state = 'roundEnd';
    this.stateUntil = this.time + 4;
    this.player.scoped = false; this.el.scope.classList.remove('on');
    this.radioOpen = null; this._radioUi();
    this._showScoreboard(true);   // CS-style: scoreboard pops at round end
    this._ensureDolly();          // dollynho comemora dançando no placar
    const placar = this.ctf ? `${this.roundCaps.E} × ${this.roundCaps.B} bandeiras` : `${p} × ${b}`;
    if (!winner) {
      this._resultadoDaRodada('EMPATE NA TRETA', `${placar} — ninguém convenceu ninguém`);
      this.sfx.roundLose();
    } else {
      const mine = winner === this.playerTeam;
      // fechou no ALVO de abates (antes do tempo) vs ganhou no relógio — informação diferente
      const byTarget = PACE && !this.ctf && Math.max(p, b) >= this.killsToWin;
      this._resultadoDaRodada(`${this._teamName(winner)} LEVARAM O ROUND`, `${placar} ` + (byTarget ? '— fecharam no alvo' : mine ? '— o povo (você) agradece' : '— a oposição (você) pede revanche'));
      if (!this.sfx.roundSound(this._voiceKey(winner))) mine ? this.sfx.roundWin() : this.sfx.roundLose();
    }
    if (this._fimDaPartida())
      this.stateUntil = this.time + 4.5; // then match end
  }
  /* FIM DA PARTIDA — uma condição só, usada pelo _endRound (pra esticar a pausa) e pelo
     update() (pra chamar o _endMatch). Vale IGUAL nos dois modos: antes o `_endMatch` era
     gateado por `!this.ctf` (game.js:update), o que fazia o modo CAPTURA rodar pra sempre —
     rounds infinitos, nenhuma tela de fim, e o placar do topo subindo sem teto. */
  _fimDaPartida() {
    if (this.ctf) return this.roundNum >= this.roundsMax || this.ctfMatchLeft <= 0;
    return this.roundNum >= this.roundsMax;
  }
  // teto de rodadas do modo em jogo — o HUD conta "RODADA n/N" com este número
  get roundsMax() { return this._roundsMax; }

  _endMatch() {
    this.state = 'matchEnd';
    /* DESEMPATE: com o teto de 5 rodadas a partida pode fechar 2 × 2 (dois empates pelo
       caminho). `roundsWon.E > roundsWon.B ? 'E' : 'B'` dava a vitória ao lado B por
       omissão — um vencedor sorteado pela ordem do ternário. Agora empate de rodadas vai
       pros abates da partida INTEIRA (matchKills, somado a cada _startRound). */
    const winner = this.roundsWon.E !== this.roundsWon.B
      ? (this.roundsWon.E > this.roundsWon.B ? 'E' : 'B')
      : ((this.matchKills.E + this.roundKills.E) >= (this.matchKills.B + this.roundKills.B) ? 'E' : 'B');
    const mine = winner === this.playerTeam;
    // Tela de fim estilo CoD/Valorant: VITÓRIA/DERROTA gigante, time vencedor no sub.
    this.el.matchEnd.classList.toggle('win', mine);
    this.el.matchEnd.classList.toggle('lose', !mine);
    this.el.matchTitle.textContent = mine ? tr('VITÓRIA') : tr('DERROTA');
    this.el.matchSub.textContent = mine
      ? frase('venceu', this._teamName(winner))
      : frase('perdeu', this._teamName(winner));
    this.el.matchStats.innerHTML =
      frase('statsFim', this.roundsWon.E, this.roundsWon.B, this.player.kills, this.player.name, this.player.deaths);
    /* Cada personagem tem duas artes estáticas: a tela mostra quem o jogador escolheu,
       na pose correspondente ao resultado. UIA1 garante o par antes do deploy. */
    const REP = { E: 'mst', B: 'bombado', U: 'metaleiro', C: 'bonzo', F: 'chave' };
    const heroEl = this.el.meHero || (this.el.meHero = document.getElementById('me-hero'));
    const rep = REP[this._factionOf(this.playerTeam)] || 'mst';
    const pose = mine ? 'vitoria' : 'derrota';
    const setHeroArt = (id) => { if (heroEl) heroEl.style.setProperty('--me-art', `url("/img/resultado/${id}-${pose}.webp")`); };
    setHeroArt(this.playerCharId || rep);
    this.el.matchEnd.classList.remove('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
    /* MAPA, MODO, PERSONAGEM E DURAÇÃO ENTRAM AQUI (07/08) porque sem eles o `match_end`
       não CRUZA com o `game_start`, que já mandava os três. O painel mostrava 1.1K
       `game_start` para 215 `match_end` e não havia como perguntar "que mapa as pessoas
       abandonam", que é a única pergunta interessante desse número. Os nomes são os
       MESMOS do `game_start` (map/mode/character) de propósito: propriedade com nome
       diferente para o mesmo conceito é o que transforma dois eventos em dois relatórios
       que não conversam. */
    try {
      window.va?.('event', { name: 'match_end', data: {
        winner, roundsP: this.roundsWon.E, roundsB: this.roundsWon.B,
        map: this._mapId, mode: this.ctf ? 'ctf' : 'rounds',
        character: this.playerCharId, seconds: Math.round(this.time),
      } });
    } catch {}
    try {
      this.onMatchEnd?.({
        won: mine, team: this.playerTeam, character: this.playerDef.id,
        kills: this.player.kills, deaths: this.player.deaths,
        headshots: this.player.headshots || 0, bestStreak: this.mk.best || 0,
        roundsP: this.roundsWon.E, roundsB: this.roundsWon.B,
        seconds: Math.round(this.time),
      });
    } catch {}
    this._flushTraining();   // BOTBRAIN: envia o resto dos frames no fim da partida
    mine ? this.sfx.matchWin() : this.sfx.roundLose();
  }
  /* -------- dollynho dançando na tela de round vencido (pedido do usuário) -------- */
  // Canvas próprio dentro do placar de fim de round; toca o clipe de dança embutido
  // (models/dollynho_dance.glb, Mixamo) num renderer separado e transparente.
  _ensureDolly() {
    /* game.js:2360 — DEFEITO DO PRINT: "o placar mostra o Dollynho com braços quebrados
       no meio do painel". Duas coisas, e só uma é consertável nesta árvore:
       (1) O LUGAR. As 9 telas de referência foram medidas (tools/eval/ref-ui.py): a tela
           08 (PLACAR) é uma tabela de dois times e NENHUM mascote; quem tem personagem
           grande é a 09 (RESULTADO DA PARTIDA), e lá ele é ARTE DE FUNDO, não um bloco
           no miolo do painel. Além de destoar da referência, o canvas de 240×190 é o que
           empurra o painel pra ~570 px de altura e faz o banner de round cruzar com ele
           (ver `_showScoreboard`). Então ele sai do placar por padrão.
       (2) OS BRAÇOS. É defeito de rig/retarget do clipe, e `public/models/dollynho_dance.glb`
           NÃO EXISTE nesta árvore (só `characters/dollynho.glb`) — o loader falha calado
           aqui e o defeito só aparece na máquina do dono. Sem o arquivo não dá pra medir
           nem consertar, e mexer em rig de personagem é de outro agente nesta rodada.
       Kill-switch: ?dolly=1 devolve o mascote ao placar sem recompilar nada. */
    if (QS.get('dolly') !== '1') return null;
    if (this._dolly) return this._dolly;
    const canvas = document.createElement('canvas');
    canvas.id = 'dollynho-dance';
    this.el.scoreboard.appendChild(canvas);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(240, 190, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 1.1));
    const dir = new THREE.DirectionalLight(0xffffff, 1.4); dir.position.set(2, 4, 3); scene.add(dir);
    const camera = new THREE.PerspectiveCamera(38, 240 / 190, 0.1, 50);
    camera.position.set(0, 1.35, 5.2); camera.lookAt(0, 0.95, 0);
    const dolly = this._dolly = { canvas, renderer, scene, camera, mixer: null, mesh: null, sphere: new THREE.Sphere(), cx: 0, cy: 0.9, cz: 0, dist: 5.2 };
    new GLTFLoader().load('models/dollynho_dance.glb', g => {
      const box = new THREE.Box3().setFromObject(g.scene);
      const s = 1.85 / (box.max.y - box.min.y);
      g.scene.scale.setScalar(s);
      g.scene.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, -(box.min.z + box.max.z) / 2 * s);
      scene.add(g.scene);
      // guarda a malha skinned p/ enquadrar pela bounding sphere animada a cada frame
      g.scene.traverse(o => { if (!dolly.mesh && o.isSkinnedMesh) dolly.mesh = o; });
      dolly.mixer = new THREE.AnimationMixer(g.scene);
      dolly.mixer.clipAction(g.animations[0]).play();   // mixamo.com (7s) em loop
    }, undefined, () => {});
    return dolly;
  }
  _tickDolly(dt) {
    if (!this._dolly) return;
    const on = this.state === 'roundEnd' && !this.el.scoreboard.classList.contains('hidden');
    this._dolly.canvas.style.display = on ? '' : 'none';
    if (!on) return;
    const d = this._dolly;
    if (d.mixer) d.mixer.update(dt);
    // enquadra pela bounding sphere da malha SKINNED (r160 já considera a pose animada):
    // acompanha centro+raio suavizados — o Dollynho fica sempre INTEIRO no quadro
    if (d.mesh) {
      d.mesh.computeBoundingSphere();
      d.sphere.copy(d.mesh.boundingSphere).applyMatrix4(d.mesh.matrixWorld);
      const k = Math.min(1, dt * 5);
      d.cx += (d.sphere.center.x - d.cx) * k;
      d.cy += (d.sphere.center.y - d.cy) * k;
      d.cz += (d.sphere.center.z - d.cz) * k;
      d.dist += (d.sphere.radius * 3.0 - d.dist) * k;
      d.camera.position.set(d.cx, d.cy + d.dist * 0.18, d.cz + d.dist);
      d.camera.lookAt(d.cx, d.cy, d.cz);
    }
    d.renderer.render(d.scene, d.camera);
  }

  setPaused(v) {
    if (this.state !== 'live' && this.state !== 'countdown') v = false;
    const entrou = v && !this.paused;
    this.paused = v;
    if (v) { this.keys = {}; this.touchMove.x = 0; this.touchMove.z = 0; this.mouseDown0 = false; }
    this.el.pause.classList.toggle('hidden', !v);
    // pausado, o overlay de toque some — senão a camada de OLHAR (tela cheia) tapava o menu
    // de pausa e roubava os toques dos botões dele.
    if (this._touchUi) this._touchUi.classList.toggle('paused', v);
    if (v && document.pointerLockElement) document.exitPointerLock();
    /* PAUSADO OS ATALHOS VOLTAM A SER DO NAVEGADOR. A trava de Ctrl+W existe pra proteger
       quem está no tiroteio; segurar ela com o menu de pausa aberto seria sequestrar o
       navegador de quem está justamente tentando sair. O `_requestLock` do RETOMAR
       rearma. */
    if (v) this._soltaAtalhos();
    // JANELA DE GUARDA (ver PAUSE_ARM_MS): o menu acabou de cair debaixo da mira, então
    // por PAUSE_ARM_MS ele não aceita clique — o tiro em voo cai no fundo e RETOMA.
    if (entrou) this.pauseArmAt = this._now() + PAUSE_ARM_MS;
    if (!v) this.pauseArmAt = 0;
    this._syncPauseArm();
    this.onPauseChange?.(v);
  }
  _now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
  /** Os botões do pause já podem ser clicados? Fora da pausa a resposta é sempre sim —
   *  desarmar por engano ressuscitaria o defeito G2-R2 ("clico em SAIR PRO MENU e nada"). */
  pauseArmed() { return !this.paused || !this.pauseArmAt || this._now() >= this.pauseArmAt; }
  _syncPauseArm() {
    const pa = this.el && this.el.pauseActions;
    if (pa) pa.style.pointerEvents = this.pauseArmed() ? '' : 'none';
    clearTimeout(this._pauseArmT); this._pauseArmT = null;
    // o update() não roda pausado, então quem devolve o ponteiro ao painel é um timer
    if (!this.pauseArmed()) this._pauseArmT = setTimeout(() => this._syncPauseArm(), Math.max(0, this.pauseArmAt - this._now()) + 16);
  }
  resume() {
    this.setPaused(false);
    if (!this.testMode) this._requestLock();
  }
  applySettings() {
    this.sfx.setVolume(this.settings.vol);
    this.sfx.speechEnabled = this.settings.speech !== false;
    if (this.el?.hudSpeech) this.el.hudSpeech.textContent = this.settings.speech === false ? '🔇' : '🔊';
    this._applyQuality();
  }
  _applyQuality() {
    const q = this.settings.quality;
    this.renderer.setPixelRatio(q === 'high' ? Math.min(devicePixelRatio, 2) : q === 'med' ? 1 : 0.75);
    const shadows = q !== 'low';
    this.renderer.shadowMap.enabled = shadows;
    this.world.sun.castShadow = shadows;
    // o foco dinâmico do shadow map (bloom.js: ortho seguindo o jogador, 26 m em vez de
    // 120 m => ~2.5 cm/texel) cacheia luz+extent em scene.userData.__sf. Trocar de
    // qualidade muda mapSize/bias, então invalida o cache pra ele reconfigurar.
    delete this.scene.userData.__sf;
    if (shadows) this.renderer.shadowMap.needsUpdate = true;
    this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  }
  onResize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    if (this.vmCamera) { this.vmCamera.aspect = this.camera.aspect; this.vmCamera.fov = vmFovForAspect(this.camera.aspect); this.vmCamera.updateProjectionMatrix(); }
  }

  /* ================= team switch (M) ================= */
  _switchTeam(charId) {
    if (!this.player.alive || (this.state !== 'live' && this.state !== 'countdown')) return;
    const p = this.player;
    if (charId) { this.playerDef = byId(charId); this.playerCharId = charId; p.def = this.playerDef; }   // personagem do novo lado
    const oldTeam = this.playerTeam;
    const newTeam = oldTeam === 'E' ? 'B' : 'E';
    const oldFaction = this.playerFaction;
    this.playerTeam = newTeam; this.enemyTeam = oldTeam;
    this.playerFaction = this.enemyFaction;
    this.enemyFaction = oldFaction;
    p.team = newTeam;
    // rebalanceia 4×4: um bot do time novo deserta pro time velho
    const candidates = this.bots.filter(b => b.team === newTeam);
    const swapBot = candidates[(Math.random() * candidates.length) | 0];
    if (swapBot) {
      swapBot.team = oldTeam;
      const defs = CHARACTERS.filter(c => c.team === oldFaction && c.id !== p.def.id);
      // prefere GLB já carregado no preload da partida; fora dele o bot cairia no procedural
      const carregados = defs.filter(c => hasModel(c.id));
      const pool = carregados.length ? carregados : defs;
      const newDef = pool[(Math.random() * pool.length) | 0];
      swapBot.def = newDef; swapBot.name = newDef.name;
      this.scene.remove(swapBot.mesh.group);
      // GLB clones share geometry with the cached template — never dispose it here.
      if (!swapBot.mesh.isGLB) swapBot.mesh.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      swapBot.mesh = buildCharacterModel(newDef) || buildCharacter(newDef);
      swapBot.mesh.group.traverse(o => { o.userData.botOwner = swapBot; });
      this.scene.add(swapBot.mesh.group);
      swapBot.target = null; swapBot.path = null; swapBot.hp = 100; swapBot.alive = true;
      const s = this.world.spawns[oldTeam][(Math.random() * 4) | 0];
      swapBot.pos.set(s.x, this._spawnY(s.x, s.z), s.z);
      swapBot.yaw = oldTeam === 'E' ? 0 : Math.PI;
      swapBot.mesh.group.rotation.set(0, swapBot.yaw, 0);
      swapBot.mesh.group.position.copy(swapBot.pos);
      swapBot.mesh.group.visible = true;
    }
    // respawn do jogador no lado novo
    const s = this.world.spawns[newTeam][(Math.random() * 4) | 0];
    p.pos.set(s.x, this._spawnY(s.x, s.z), s.z); p.vel.set(0, 0, 0);
    p.yaw = newTeam === 'E' ? Math.PI : 0; p.pitch = 0; p.hp = 100;
    this._scope(false, true);
    this._banner(frase('agoraVoceE', this._teamName(newTeam)), 'trocou de lado na treta — sem penalty, só julgamento');
    this.sfx.uiClick();
  }

  /* ================= weapons ================= */
  // Visibilidade do viewmodel (uma regra só, usada pelo _switchWeapon e pelo
  // _resetPositions): caminho ÚNICO das 26 armas — GLB da Mint + braços FP. O bloco
  // Tripo (?tripovm=1, staticVms, lazy-load de 18 MB por classe) foi removido em
  // 07/08/2026 — o histórico está no git.
  _applyVmVisibility() {
    const w = this.player.weapon;
    if (this.vm.arms) this.vm.arms.group.visible = true;
    for (const k in this.vm.models) this.vm.models[k].visible = k === w;
  }
  // ?vmlab=1 usa um viewmodel isolado e criado sob demanda.
  _vmlabEnsure(id) {
    if (!this._vmlab) {
      this._vmlab = { group: new THREE.Group(), models: {} };
      this.vmScene.add(this._vmlab.group);
    }
    if (this._vmlab.models[id]) return this._vmlab.models[id];
    const wm = weaponModel(id);
    const holder = new THREE.Group();
    if (wm) { wm.rotation.y = Math.PI; holder.add(wm); holder.userData.gun = wm; }   // +Z(cano) -> -Z(frente)
    holder.visible = false;
    this._vmlab.group.add(holder);
    this._vmlab.models[id] = holder;
    return holder;
  }
  _vmlabFrame(p, a) {
    const id = p.weapon;
    const holder = this._vmlabEnsure(id);
    if (this.vm && this.vm.root) this.vm.root.visible = false;          // esconde o calibrado (é forçado true no frame)
    if (this.vm && this.vm.arms) this.vm.arms.group.visible = false;    // editor é só-a-arma, sem braços
    for (const k in this._vmlab.models) this._vmlab.models[k].visible = (k === id);
    const scoped = VMLAB_SCOPED.has(id) && p.scoped && WEAPONS[id] && WEAPONS[id].scope;
    if (scoped) { holder.visible = false; return; }                    // sniper: some no ADS, a luneta cobre
    const P = vmlabPose(id), H = P.hip, A = P.ads;
    const R = Math.PI / 180, S = A.sz * 0.01, L = (x, y) => x + (y - x) * a;
    // MIRADO: alça auto-centrada no eixo (met.sight), salvo NO_ALIGN (posição à mão).
    const gun = holder.userData.gun, met = gun && gun.userData && gun.userData.metrics;
    let ax, ay, az;
    if (met && met.sight && !VMLAB_NO_ALIGN.has(id)) {
      const pt = met.sight.clone().divideScalar(met.norm || 1)
        .applyEuler(new THREE.Euler(0, Math.PI, 0)).multiplyScalar(S)
        .applyEuler(new THREE.Euler(A.rx * R, A.ry * R, A.wt * R));
      ax = -pt.x + A.wx * 0.01; ay = -pt.y + A.wy * 0.01; az = (A.wz * 0.01) - pt.z;
    } else { ax = A.wx * 0.01; ay = A.wy * 0.01; az = A.wz * 0.01; }
    holder.position.set(L(H.wx * 0.01, ax), L(H.wy * 0.01, ay), L(H.wz * 0.01, az));
    holder.scale.setScalar(L(H.sz, A.sz) * 0.01);
    holder.rotation.set(L(H.rx, A.rx) * R, L(H.ry, A.ry) * R, L(H.wt, A.wt) * R);
    if (this.vmCamera) {
      const fov = L(H.fov, A.fov);
      if (Math.abs(this.vmCamera.fov - fov) > 0.01) { this.vmCamera.fov = fov; this.vmCamera.updateProjectionMatrix(); }
    }
  }
  // Bancadas locais ajustam as configurações reais por window.__game.
  _tuneGet(w) {
    const W = WEAPONS[w] || {};
    const cls = RECOIL_CLASS[w] || 'semi', P = RECOIL_PARAMS[cls] || {};
    return {
      recDeg: REC_DEG[w] ?? 1.4,
      rpm: W.rate ? Math.round(60 / W.rate) : 600,
      spreadHip: W.spreadHip ?? 0.02,
      spreadScope: W.spreadScope ?? (W.spreadHip ?? 0.02) * 0.35,
      dmg: W.dmg ?? 30, mag: W.mag ?? 30, auto: !!W.auto, scope: !!W.scope,
      cls,                                        // RECUO REAL: padrão da classe + timing global
      up: P.mid ?? 0.42, cauda: P.tail ?? 0.2, left: P.left ?? 0.56, right: P.right ?? 0.68, wig: P.wig ?? 0.3,
      recover: REC.tau, hold: REC.hold, perm: REC.perm,
      fx: { ...(this._fxTune || { light: 1, flash: 1, spark: 1 }) },
    };
  }
  _tune(w, p) {
    const W = WEAPONS[w]; if (!W || !p) return;
    if (p.rpm != null) W.rate = 60 / Math.max(30, p.rpm);
    if (p.spreadHip != null) W.spreadHip = Math.max(0, p.spreadHip);
    if (p.spreadScope != null) W.spreadScope = Math.max(0, p.spreadScope);
    if (p.dmg != null) W.dmg = Math.max(1, p.dmg);
    if (p.mag != null) W.mag = Math.max(1, Math.round(p.mag));
    if (p.recDeg != null) REC_DEG[w] = Math.max(0, p.recDeg);
    // timing GLOBAL do view-punch
    if (p.recover != null) REC.tau = Math.max(0.03, p.recover);
    if (p.hold != null) REC.hold = Math.max(0, p.hold);
    if (p.perm != null) REC.perm = Math.max(0, Math.min(1, p.perm));
    // padrão da CLASSE da arma (regenera o pattern real; afeta todas as armas da classe)
    if (['up', 'cauda', 'left', 'right', 'wig'].some((k) => p[k] != null)) {
      const cls = RECOIL_CLASS[w] || 'semi', P = RECOIL_PARAMS[cls] || (RECOIL_PARAMS[cls] = {});
      if (p.up != null) P.mid = p.up;
      if (p.cauda != null) P.tail = p.cauda;
      if (p.left != null) P.left = p.left;
      if (p.right != null) P.right = p.right;
      if (p.wig != null) P.wig = p.wig;
      RECOIL_PATTERN[cls] = buildRecoilPattern(P);
    }
  }
  _fxSet(p) { this._fxTune = { light: 1, flash: 1, spark: 1, ...(this._fxTune || {}), ...(p || {}) }; }
  _switchWeapon(w) {
    const p = this.player;
    if (p.weapon === w || !p.alive || !WEAPONS[w]) return;
    if (!this._pickupAllowed(w)) return;   // #268: modo arma-única - slot proibido não equipa
    if (w !== 'knife' && !p.ammo[w]) p.ammo[w] = { mag: WEAPONS[w].mag, res: WEAPONS[w].reserve };
    // GUNFEEL: deploy por CLASSE (era 0.28 fixo p/ as 26 armas — a AWP sacava tão rápido
    // quanto a faca). Estes segundos alimentam DUAS coisas: `p.drawUntil` (trava do tiro) e
    // a duração do estado 'draw' do rig (a arma entrando pela borda de baixo, y -0,34 /
    // rx -1,05 no início do arco) — antes era uma rampa linear dividida por 0,28 fixo.
    const DEPLOY = { knife: 0.25, pistol: 0.34, smg: 0.38, rifle: 0.42, shotgun: 0.42, awp: 0.45 };
    const _dcls = BALL_CLASS[w] === 'smg' ? 'smg' : (STATIC_CLASS[w] || 'rifle');
    p.lastInv = p.weapon;   // #261: Q alterna entre as duas últimas (lastinv do CS)
    p.weapon = w; p.reloadUntil = 0; p.drawUntil = this.time + (GUNFEEL ? (DEPLOY[_dcls] || 0.38) : 0.28);
    p.sprayI = 0; p.lastShotAt = -9;   // rajada nova: padrão de recuo recomeça do tiro 1
    // remember the slot so 1/2 recall the LAST weapon of that kind (primary vs sidearm)
    if (w !== 'knife') { if (PISTOLS.has(w)) p.secondary = w; else p.primary = w; }
    // BUG-04: o saque vira o arco do rig (entra pela borda de baixo). `startDraw` também
    // tira o rig de 'reload', que é o que impedia a arma de ficar travada inclinada ao
    // trocar no meio da recarga. Sem `startSwap` de propósito: o holster do rig exige adiar
    // a TROCA DA MALHA até o fundo do arco, e a malha visível é lida por `poseToWeapon`,
    // pelo flash de boca e pelo ADS a partir de `p.weapon` — adiar isso é outra tarefa.
    this.vm.rig.startDraw(GUNFEEL ? (DEPLOY[_dcls] || 0.38) : 0.28);
    this.bloom = 0;
    this._scope(false, true);
    this._applyVmVisibility();
    this.el.weaponName.textContent = WEAPONS[w].name;
    this.el.reloadNote.classList.add('hidden');
    if (w === 'knife') this.sfx.knifeDeploy(); else this._deploySfx(_dcls);
  }
  // Som de SAQUE por classe: 2 ressonadores metálicos a ~28ms (ferrolho + trava), grave nas
  // armas pesadas. Era `sfx.uiClick()` — um beep de MENU pra sacar uma AWP. Usa os helpers
  // já existentes do Sfx (não há API pública de foley de arma).
  _deploySfx(cls) {
    const s = this.sfx; s.ensure(); if (!s.ctx) return;
    const F = { pistol: [2100, 3000], smg: [1750, 2500], rifle: [1350, 2050], shotgun: [1000, 1650], awp: [820, 1400] }[cls] || [1350, 2050];
    s._burst(0.035, 0.20, F[0], 7, 'bandpass');
    s._burst(0.045, 0.16, F[1], 5, 'bandpass', 0.028);
    s._beep('sine', 150, 85, 0.07, 0.10, 0.03);   // peso do corpo da arma assentando
  }
  _scope(on, silent = false) {
    const p = this.player, w = p.weapon;
    // any weapon (except knife) can aim-zoom; only real scopes show the circle.
    // G2-R14A: a shotgun era bloqueada aqui ("shotgun não mira" — dono) — agora faz o
    // mesmo ADS AUG-style do rifle (zoom leve + VM desliza pra fora + crosshair fina).
    if (on && (w === 'knife' || !p.alive || this._reloading())) on = false;
    if (p.scoped === on) return;
    p.scoped = on;
    const showMask = on && !!(WEAPONS[w] && WEAPONS[w].scope);
    this.el.scope.classList.toggle('on', showMask);
    // entra com opacity 0 NO MESMO FRAME do display:block — sem isso o compositor pinta a
    // máscara preta da luneta ainda no FOV 70 (o "frame quase preto" da transição de ADS);
    // quem sobe a opacidade é o _updatePlayer, no ritmo do zoom do FOV.
    if (showMask) this.el.scope.style.opacity = '0';
    if (!silent) on ? this.sfx.scopeIn() : this.sfx.scopeOut();
  }
  // Target FOV while aiming: strong for scoped snipers, light ADS for the rest.
  _zoomFov(w) {
    // Zoom de ADS mais forte que antes (base é FOV 70): pedido "parece longe, dá pra ver no
    // ferrolho". Snipers com luneta = zoom pesado; marksman forte; rifles/SMG/pistola iron-sight.
    const Z = { awp: 22, mosin: 20, rem700: 22, m400: 34, m400scope: 34, svd: 30, g3sg1: 30, sks: 32, md97: 40, carbine: 38, shotgun: 44,
      ak: 42, m92: 42, akm: 42, g3: 42, m4: 42, scar: 42, tavor: 42, famas: 42,
      mp5: 46, uzi: 46, p90: 46, lmg: 44, deagle: 47, pistol: 48, revolver38: 48 };
    return Z[w] || 46;
  }
  _reloading() { return this.time < this.player.reloadUntil; }
  _startReload() {
    const p = this.player, w = p.weapon;
    if (w === 'knife' || !p.alive || this._reloading()) return;
    const a = p.ammo[w];
    if (a.mag >= WEAPONS[w].mag || a.res <= 0) return;
    this._scope(false, true);
    p.reloadUntil = this.time + WEAPONS[w].reload;
    // BUG-04: MESMA duração da tabela de armas nos dois lados — o relógio de jogo
    // (reloadUntil, que devolve a munição) e a animação terminam no mesmo quadro.
    this.vm.rig.startReload(WEAPONS[w].reload);
    p.sprayI = 0;   // recarregou = rajada nova (padrão de recuo do tiro 1)
    this.el.reloadNote.classList.remove('hidden');
    this.sfx.reloadStart();
    this._reloadLayers(w, WEAPONS[w].reload);
  }
  // Camadas de recarga (GUNFEEL): era 1 beep na entrada e 1 na saída. Agora magOut (trava +
  // pente caindo), magIn (thunk grave de encaixe) e boltRelease (ressonador metálico),
  // sincronizados com o `reload` da arma. Guardado por token: trocar de arma no meio da
  // recarga cancela as camadas pendentes (senão a AK "encaixa pente" com a pistola na mão).
  _reloadLayers(w, dur) {
    const s = this.sfx; s.ensure(); if (!s.ctx) return;
    const tok = (this._rlTok = (this._rlTok || 0) + 1);
    const alive = () => this._rlTok === tok && this.player.weapon === w && this._reloading();
    const at = (f, t) => setTimeout(() => { if (alive()) f(); }, t * 1000);
    const heavy = STATIC_CLASS[w] === 'awp' || STATIC_CLASS[w] === 'shotgun';
    at(() => { s._burst(0.03, 0.16, 2600, 6, 'bandpass'); s._burst(0.09, 0.10, 700, 1.2); }, dur * 0.18);   // trava + pente saindo
    at(() => { s._beep('sine', 180, 110, 0.08, 0.20); s._burst(0.06, 0.14, 900, 1.5); }, dur * 0.62);       // thunk grave do encaixe
    at(() => { s._burst(0.035, 0.18, heavy ? 1400 : 2000, 7, 'bandpass'); s._burst(0.04, 0.13, heavy ? 2100 : 3000, 5, 'bandpass', 0.03); }, dur * 0.86);   // ferrolho
  }
  /* GUNFEEL — recuo de CÂMERA. Toma posse da curva de `p.recoilP` com um acessor em vez de
     editar o loop principal (que pertence a outra região do arquivo): o loop faz
     `p.recoilP = max(0, p.recoilP - dt*(0.06 + p.recoilP*2))` e lê `pitch + recoilP`; com o
     setter MUDO a recuperação passa a ser esta (hold da rajada + mola tau 0.22). O getter
     integra uma única vez por valor distinto de this.time (idempotente dentro do frame) e
     aproveita para aplicar/devolver o componente HORIZONTAL no yaw base — é assim que o
     padrão ganha lado sem precisar de um 2º acessor em `p.yaw`. Se alguém remover as duas
     leituras do loop, o recuo simplesmente para de aparecer (degrada, não quebra). */
  _installRecoil(p) {
    if (p._rec) return p._rec;
    const st = p._rec = { y: 0, ty: 0, x: 0, tx: 0, t: -1, last: -9, sh: 0 };
    Object.defineProperty(p, 'recoilP', {
      configurable: true,
      get: () => {
        const now = this.time;
        if (st.t < 0) st.t = now;
        const dt = Math.min(0.1, now - st.t);
        // morto = zera sem devolver delta no yaw (o respawn reposiciona o yaw sozinho;
        // devolver a recuperação depois disso torceria a mira do nascimento)
        if (!p.alive) { st.t = now; st.y = st.ty = st.x = st.tx = st.sh = 0; return 0; }
        if (dt > 0) {
          st.t = now;
          // NÃO recupera enquanto a rajada está viva: é isso que faz a tela subir de verdade
          // (o crítico mediu 0.57° de estado estacionário na rajada inteira da AK).
          if (now - st.last > REC.hold) { const k = Math.exp(-dt / REC.tau); st.ty *= k; st.tx *= k; }
          const r = Math.min(1, dt / REC.rise);
          st.y += (st.ty - st.y) * r;
          const nx = st.x + (st.tx - st.x) * r;
          p.yaw -= nx - st.x;       // + = punch pra DIREITA (yaw diminui, igual ao mouse)
          st.x = nx;
          st.sh = Math.max(0, st.sh - dt * 9);
        }
        return st.y + st.sh * Math.sin(now * 78);   // punch de tela (~12 Hz, ~130 ms)
      },
      set: () => { /* a curva é nossa; o decaimento antigo do loop vira no-op */ },
    });
    return st;
  }
  // Impulso de recuo de UM tiro: padrão determinístico + 30% de aleatoriedade, 75% como view
  // punch que recupera e 25% como deriva permanente na mira (o que o jogador corrige = spray
  // control). ADS reduz o recuo VISUAL em 32%.
  _shotRecoil(p, wid) {
    const st = this._installRecoil(p);
    const pat = RECOIL_PATTERN[RECOIL_CLASS[wid] || 'semi'];
    const [px, py] = pat[Math.min(29, p.sprayI || 0)];
    const g = (REC_DEG[wid] ?? 1.4) * D2R * (p.scoped ? 0.68 : 1) * (1 - 0.25 * p.crouchF);
    const vy = g * py * (1 + (Math.random() - 0.5) * 0.6);
    const hx = g * px * (1 + (Math.random() - 0.5) * 0.6);
    st.ty += vy * (1 - REC.perm); st.tx += hx * (1 - REC.perm);
    p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch + vy * REC.perm));   // mesmo clamp do mouse-look
    p.yaw -= hx * REC.perm;
    st.last = this.time;
    st.sh = Math.min(0.020, st.sh + g * 0.22);
  }
  _tryShoot() {
    const p = this.player, w = WEAPONS[p.weapon];
    if (this.espectando()) return;   // quem assiste não tem corpo: o tiro sairia do nada
    if (!p.alive || this.state !== 'live') return;
    if (this.time < p.nextShotAt || this._reloading() || this.time < p.drawUntil) return;
    if (p.weapon === 'knife') {
      p.nextShotAt = this.time + w.rate;
      this.vm.recoil.kick(1); this.sfx.knife();
      this.vm.swingAt = this.time;   // dispara o SWING (arco de faca estilo CS)
      this._meleeHit();
      return;
    }
    const a = p.ammo[p.weapon];
    if (a.mag <= 0) { this.sfx.dryFire(); this._startReload(); return; }
    a.mag--;
    p.nextShotAt = this.time + w.rate;
    p.revealedAt = this.time;
    if (p.weapon === 'awp') setTimeout(() => this.sfx.bolt(), 420);
    this.sfx.shotWeapon(p.weapon, 0);   // 1ª pessoa = distância 0 no mix do synth
    // spread & direção. GUNFEEL: (a) ADS agora fecha o spread em TODAS as armas — antes só a
    // awp consultava spreadScope e 6 armas o declaravam sem nunca usar (ADS era só zoom);
    // (b) correr/pular abre — antes só o agachar entrava na conta; (c) a distribuição virou
    // POLAR (disco), o `x/y/z += rand-0.5` antigo era uma CAIXA (furos formavam quadrado na
    // parede) e o termo em z ainda mexia no spread efetivo sem significado nenhum.
    const crouchMul = 1 - 0.5 * p.crouchF;
    const sp0 = Math.hypot(p.vel.x, p.vel.z);
    const moveMul = GUNFEEL ? (1 + 1.8 * Math.min(1, sp0 / 6.6) + (p.grounded ? 0 : 2.5)) : 1;
    this.bloom = Math.min(1.6, (this.bloom || 0) + (w.auto ? 0.22 : 0));
    // G3-R1: o spread de ADS agora INTERPOLA pelo progresso real da mirada (vm.adsF) em vez
    // de trocar de degrau no clique. Mirar passa a PAGAR de forma visível e progressiva — e
    // atirar no meio da transição não dá mais a precisão cheia de graça.
    // _aimF = progresso REAL da mirada (0-1), medido pelo FOV: vale tanto pro iron-sight
    // (vm.adsF) quanto pra luneta (onde vm.adsF fica 0 de propósito — a arma sai de cena).
    const adsF = Math.min(1, Math.max(0, this._aimF || 0));
    const spScoped = w.spreadScope ?? w.spreadHip * 0.35;
    const spreadBase = (GUNFEEL
      ? (w.spreadHip + (spScoped - w.spreadHip) * adsF)
      : (p.weapon === 'awp' ? (p.scoped ? w.spreadScope : w.spreadHip) : w.spreadHip)) * crouchMul * moveMul;
    const from = this._aimOrigin(new THREE.Vector3());
    const pellets = w.pellets || 1;
    // tracer só em PARTE dos tiros (CS): 1 em 3 na rajada; sniper/shotgun sempre (o tiro é o
    // evento). Antes TODO tiro deixava rastro — vira "chuva de laser" em full-auto.
    const wantTracer = !GUNFEEL || pellets > 1 || (REC_DEG[p.weapon] ?? 1) > 2.4 || ((p.sprayI || 0) % 3) === 0;
    for (let i = 0; i < pellets; i++) {
      const sp = spreadBase * (1 + this.bloom);
      let dir;
      if (GUNFEEL) {
        const ang = Math.random() * Math.PI * 2, rad = sp * 0.5 * Math.sqrt(Math.random());
        dir = new THREE.Vector3(Math.cos(ang) * rad, Math.sin(ang) * rad, -1).applyQuaternion(this.camera.quaternion).normalize();
      } else {
        dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        dir.x += (Math.random() - .5) * sp; dir.y += (Math.random() - .5) * sp; dir.z += (Math.random() - .5) * sp;
        dir.normalize();
      }
      this._fireHitscan(this.player, from, dir, w.dmg, true, w.short, p.weapon, wantTracer && i < 2);
    }
    // recuo: CÂMERA (padrão determinístico + mola, ver _shotRecoil) e VIEWMODEL (mola própria
    // do RecoilAxis) são independentes de propósito — a arma pode coicear forte sem arrancar
    // a mira, e vice-versa.
    if (GUNFEEL) {
      if (this.time - (p.lastShotAt || -9) > REC.hold) p.sprayI = 0;   // parou de atirar = rajada nova
      this._shotRecoil(p, p.weapon);
      p.sprayI = (p.sprayI || 0) + 1;
      p.lastShotAt = this.time;
    } else p.recoilP = (p.recoilP || 0) + w.recoil * (1 - 0.25 * p.crouchF);
    // Classe pistola ×0.5 (R7.6): o kick cheio jogava a deagle pra borda superior da tela —
    // coice de pistola gira no punho, não levanta o cano até o teto.
    const kickMul = STATIC_CLASS[p.weapon] === 'pistol' ? 0.5 : 1;
    // R1.c — AMPLITUDE DO KICK POR ARMA, curva SUBLINEAR. A forma antiga
    // `min(1.7, 0.42 + REC_DEG*0.30)` SATURAVA no teto: awp (4,9°), mosin (4,7°) e rem700
    // (4,8°) davam 1.89/1.83/1.86 e todas eram cortadas para exatamente 1.70 — as três armas
    // de maior coice do jogo ficavam INDISTINGUÍVEIS entre si e a 1,9× do fuzil. Com a raiz,
    // o teto some (nada satura) e a ordem por classe fica preservada e legível:
    //   awp 1.04 > mosin 1.03 > shotgun 0.94 > deagle 0.85 > ak 0.77 > mp5 0.69 > p90 0.68.
    const vmAmp = GUNFEEL ? (0.42 + Math.sqrt(REC_DEG[p.weapon] ?? 1.4) * 0.28) * (p.scoped ? 0.7 : 1)
                          : Math.min(1.5, 0.55 + (w.recoil || 0.01) * 13);
    this.vm.recoil.kick(vmAmp * (1 - 0.25 * p.crouchF) * kickMul);
    this.vm.kickSide = Math.random() * 2 - 1;
    const _cls = STATIC_CLASS[p.weapon] || 'rifle';
    this._flash(this._muzzleWorld(_cls), this.camera.getWorldDirection(new THREE.Vector3()), _cls);
    this._ejectCasing();
    // bolt-action snipers drop the scope after each shot (CS-style); autos stay aimed
    if (p.scoped && (p.weapon === 'awp' || p.weapon === 'mosin' || p.weapon === 'rem700')) this._scope(false, true);
  }
  _meleeHit() {
    const from = this._aimOrigin(new THREE.Vector3());
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    let best = null, bd = WEAPONS.knife.range;
    for (const b of this.bots) {
      if (!b.alive || b.team === this.playerTeam) continue;
      const to = b.pos.clone().setY(b.pos.y + 1.2).sub(from);
      const d = to.length();
      if (d < bd && to.normalize().dot(dir) > 0.6) { best = b; bd = d; }
    }
    if (best) { this.sfx.knifeHit(); this._damage(best, WEAPONS.knife.dmg, this.player, 'FACA'); }
  }
  /* Dano de um tiro: base × falloff por classe × multiplicador de headshot. O servidor usa a
     MESMA conta — duas cópias envelheceriam separadas. Ver docs/MULTIPLAYER.md. */
  _shotDamage(dmg, wid, dist, head) {
    let d = dmg;
    if (GUNFEEL && wid) {
      const bc = BALL_CLASS[wid] || 'rifle';
      const fo = DMG_FALLOFF[bc];
      if (fo) { const [s0, s1, mn] = fo; d *= Math.max(mn, Math.min(1, 1 - (dist - s0) / (s1 - s0))); }
      if (head) d *= HS_MUL[bc] ?? 4;
    } else if (head && d < 100) d = 100;
    return d;
  }

  _fireHitscan(shooter, from, dir, dmg, byPlayer = false, weap = 'AWP', wid = null, tracer = true) {
    this.ray.set(from, dir); this.ray.far = 200;
    const enemyGroups = this.bots.filter(b => b.alive && (byPlayer ? b.team !== this.playerTeam : true)).map(b => b.mesh.group);
    const hitsChar = enemyGroups.length ? this.ray.intersectObjects(enemyGroups, true) : [];
    const hitsWorld = this.ray.intersectObjects(this.world.occluders, false);
    const hC = hitsChar[0], hW = hitsWorld[0];
    let end;
    if (hC && (!hW || hC.distance < hW.distance)) {
      let o = hC.object, bot = null, head = false;
      while (o) {
        if (o.userData.botOwner && !bot) bot = o.userData.botOwner;
        if (bot && o === bot.mesh.parts.head) head = true;
        o = o.parent;
      }
      end = hC.point;
      if (bot) {
        if (bot.team === shooter.team) { /* friendly fire off */ }
        else {
          /* Online: o cliente desenha o impacto mas NÃO aplica dano — o hp vem no snapshot.
             Aplicar aqui contaria o dano duas vezes. Ver docs/MULTIPLAYER.md. */
          if (!this.online) this._damage(bot, this._shotDamage(dmg, wid, hC.distance, head), shooter, weap, head, end);
          this._fleshImpact(end, dir, head, bot.pos ? bot.pos.y : null, byPlayer);
        }
      }
    } else if (hW) {
      end = hW.point;
      const n = hW.face ? hW.face.normal : null;
      const surf = GUNFEEL ? this._surfaceOf(hW.object) : null;
      this._puff(hW.point, n, surf);
      // som de impacto em 100% dos tiros do jogador (era `ricochet()` — um BIP de sine — em
      // 30%: 70% dos tiros na parede eram literalmente mudos).
      if (GUNFEEL) { if (byPlayer || Math.random() < 0.35) this._impactSfx(surf, from.distanceTo(hW.point)); }
      else if (Math.random() < 0.3) this.sfx.ricochet();
    } else {
      end = from.clone().add(dir.clone().multiplyScalar(120));
    }
    this.world.ambience?.onShot(from, end);
    if (byPlayer && tracer) {
      const muzzle = this._muzzleWorld(STATIC_CLASS[this.player.weapon] || 'rifle');
      this._tracer(muzzle, end);
    }
    return end;
  }
  // MATERIAL da superfície atingida, inferido do material do mesh (os mapas não marcam
  // userData.surf; quando marcarem, ela ganha prioridade). Cache em WeakMap — o raycast roda
  // por pellet e por bala, não dá pra inspecionar material a cada tiro.
  _surfaceOf(obj) {
    if (!obj) return 'concreto';
    if (obj.userData && obj.userData.surf) return obj.userData.surf;
    const cache = this._surfCache || (this._surfCache = new WeakMap());
    const hit = cache.get(obj);
    if (hit) return hit;
    let s = 'concreto';
    const m = Array.isArray(obj.material) ? obj.material[0] : obj.material;
    const nm = ((obj.name || '') + ' ' + ((m && m.name) || '')).toLowerCase();
    if (/agua|water|pool|piscin/.test(nm)) s = 'agua';
    else if (/vidro|glass|window|janela/.test(nm)) s = 'vidro';
    else if (/madeira|wood|tabua|crate|caixa/.test(nm)) s = 'madeira';
    else if (/metal|aco|steel|carro|car|trailer|container|barril/.test(nm)) s = 'metal';
    else if (m) {
      if ((m.metalness ?? 0) > 0.45) s = 'metal';
      else if (m.transparent && (m.opacity ?? 1) < 0.75) s = 'vidro';
      else if (m.color) {
        const c = m.color, mx = Math.max(c.r, c.g, c.b), mn2 = Math.min(c.r, c.g, c.b);
        // marrom/ocre saturado = madeira ou terra; cinza dessaturado = concreto
        if (c.r > c.b * 1.35 && mx - mn2 > 0.09) s = (m.roughness ?? 1) > 0.75 ? 'areia' : 'madeira';
      }
    }
    cache.set(obj, s);
    return s;
  }
  // Impacto em CARNE: puff vermelho curto + som próprio. Antes o único sinal de que você
  // acertou uma PESSOA era o mesmo bip de acertar uma parede (grep blood = 0 ocorrências).
  _fleshImpact(pos, dir, head, footY = null, byPlayer = true) {
    if (!GUNFEEL) return;
    // acerto alheio (parceiro levando tiro, bot×bot): só rende se perto — longe, espirra sangue invisível e come frame
    if (!byPlayer && this.camera.position.distanceToSquared(pos) > 3600) return;   // >60 m: pula
    const voice = byPlayer && this._fxVoice(head ? 3 : 2);
    // buffer maior (384): um cartucho de shotgun são 9 pellets × ~26 gotas num frame só.
    const fx = this._bloodFx || (this._bloodFx = this._makeBloodFx());
    const pop = this._bloodPop || (this._bloodPop = this._makeBloodFx(true));   // camada aditiva brilhante
    const back = dir.clone().multiplyScalar(-1);
    // A nuvem nasce 14 cm À FRENTE do corpo: na superfície do alvo, metade das partículas
    // ficava atrás dele (tapada) e o sangue lia fraco.
    const sp = pos.clone().addScaledVector(dir, -0.14);
    // "pop" aditivo instantâneo (lê como acerto na hora) + 2 camadas de nuvem GORDA e vermelha.
    // Sprites de GPUParticles encolhem com a distância — por isso os tamanhos são grandes.
    pop.spawn(sp, { life: 0.10, size: head ? 1.1 : 0.75, grow: 2.4 });
    fx.spawn(sp, { life: 0.30, size: head ? 1.4 : 0.95, grow: 3.2 });
    fx.spawn(sp, { life: 0.44, size: head ? 0.9 : 0.6, grow: 4.2 });
    // ~40% das gotas SAI PELA FRENTE (ferida de saída, CS 1.6). Sem BLOOD, volta ao mínimo antigo.
    const n = ((BLOOD ? (head ? 26 : 18) : (head ? 6 : 4)) * (byPlayer ? 1 : 0.6)) | 0;   // hit alheio: mais leve
    for (let i = 0; i < n; i++) {
      const fwd = BLOOD && i % 5 < 2;
      const v = (fwd ? dir : back).clone().multiplyScalar(2.0 + Math.random() * (fwd ? 5.5 : 3.5))
        .add(new THREE.Vector3((Math.random() - .5) * 3.6, (Math.random() - .5) * 2.4 + 0.8, (Math.random() - .5) * 3.6));
      fx.spawn(sp, { vel: v, life: 0.3 + Math.random() * 0.26, size: (BLOOD ? 0.16 : 0.06) + Math.random() * (BLOOD ? 0.24 : 0.03), grow: -0.05 });
    }
    // sangue grudado: mancha na parede atrás do alvo + gota no chão sob ele (footY = pés do alvo)
    if (BLOOD) this._bloodSpatter(pos, dir, head, footY);
    if (!voice) return;
    const s = this.sfx; s.ensure(); if (!s.ctx) return;
    s._burst(0.05, head ? 0.30 : 0.20, head ? 420 : 620, 1.1);              // baque úmido
    s._burst(0.08, 0.10, 1500, 2.2, 'bandpass', 0.012);
  }
  // Limitador de VOZES de foley de impacto: um cartucho de shotgun são 9 pellets = 9
  // impactos no mesmo milissegundo. Sem isto o synth abre ~20 fontes de ruído de uma vez
  // (estoura o limiter e come frame). Máx `n` sons por janela de 45 ms.
  _fxVoice(n = 2) {
    const now = this.time;
    if (now - (this._fxvT || -9) > 0.045) { this._fxvT = now; this._fxvN = 0; }
    if ((this._fxvN || 0) >= n) return false;
    this._fxvN = (this._fxvN || 0) + 1;
    return true;
  }
  // Som de impacto por MATERIAL (o projeto não expõe API de foley no Sfx — usa os helpers
  // internos, mesmo padrão do _deploySfx). dist só atenua.
  _impactSfx(surf, dist = 0) {
    if (!this._fxVoice(2)) return;
    const s = this.sfx; s.ensure(); if (!s.ctx) return;
    const a = Math.max(0.12, 1 - dist / 55);
    if (surf === 'metal') { s._burst(0.05, 0.24 * a, 2000, 4, 'bandpass'); s._beep('triangle', 3200, 1500, 0.1, 0.06 * a, 0.006); }
    else if (surf === 'madeira') { s._burst(0.05, 0.22 * a, 900, 1.6); s._burst(0.06, 0.09 * a, 2600, 2, 'bandpass', 0.008); }
    else if (surf === 'vidro') { for (let i = 0; i < 3; i++) s._burst(0.05, 0.13 * a, 4200 + Math.random() * 2600, 6, 'bandpass', i * 0.03); }
    else if (surf === 'agua') { s._burst(0.10, 0.22 * a, 420, 0.9); s._burst(0.14, 0.08 * a, 1300, 1.4, 'bandpass', 0.02); }
    else if (surf === 'areia') s._burst(0.07, 0.16 * a, 620, 0.8);
    else s._burst(0.055, 0.22 * a, 500, 1.2);   // concreto: pancada seca (era um bip de sine)
  }
  // Sistema de partículas COLORIDO sob demanda (poeira bege, faísca, sangue). Compartilha o
  // uTime/uScale do puffFx de propósito: assim ele anima no update do puffFx e não precisa de
  // um tick próprio no loop principal (que é de outra região do arquivo).
  _tintFx(hex, additive, max = 128) {
    // degradação segura: em quality 'low' não abre sistema novo (mais 1 draw call + 1
    // textura por material) — reusa o puff branco existente.
    if (this.settings && this.settings.quality === 'low') return this.puffFx;
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d');
    const col = new THREE.Color(hex), rgb = `${(col.r * 255) | 0},${(col.g * 255) | 0},${(col.b * 255) | 0}`;
    const rad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    rad.addColorStop(0, `rgba(${rgb},1)`); rad.addColorStop(0.45, `rgba(${rgb},0.55)`); rad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = rad; g.fillRect(0, 0, 32, 32);
    const tex = new THREE.CanvasTexture(c);
    const fx = new GPUParticles(this.scene, this.camera, { tex, additive, max });
    const src = this.puffFx && this.puffFx.uniforms;
    if (src) { fx.uniforms.uTime = src.uTime; fx.uniforms.uScale = src.uScale; }
    return fx;
  }
  _damage(ent, dmg, attacker, weap = 'AWP', head = false, point = null) {
    if (!ent.alive || this.state !== 'live') return;
    if (this.time < (ent.protUntil || 0)) return;   // spawn protection: zero dano (e sem hitmarker) enquanto protegido
    ent.hp -= dmg;
    if (ent.isPlayer) {
      this.el.vignette.style.opacity = 0.9;
      setTimeout(() => this.el.vignette.style.opacity = 0, 130);
      // flash vermelho na barra de HP ao tomar dano: entrada instantânea (sem transição
      // de cor na ida, senão o vermelho "entra" devagar), volta suave ao limpar
      const hf = this.el.hpFill;
      hf.style.transition = 'width .15s';
      hf.style.background = '#ff3b3b';
      clearTimeout(this._hpT);
      this._hpT = setTimeout(() => {
        hf.style.transition = 'width .15s,background .4s ease-out';
        hf.style.background = '';
      }, 400);
      // INDICADOR DIRECIONAL — ver _dmgArc (item nº 1 da tarefa: "não vejo de onde veio o tiro")
      if (attacker && attacker.pos) this._dmgArc(attacker, ent, dmg);
      this.sfx.hurt();
    } else if (attacker === this.player) {
      this._hitmarker(ent.hp <= 0, head);   // som suprimido SÓ em kill; visual vermelho em kill OU headshot
      this._dmgNumber(point || ent.pos, dmg, head, ent.hp <= 0);
    }
    if (!ent.isPlayer && attacker && attacker.team !== ent.team && !ent.target && attacker.alive) {
      ent.target = attacker;   // bot caça quem o atingiu
      // ...mas SEM linha de visão: quem entra por aqui não passou por nenhum _losClear, então
      // o bot ganhava um alvo através da parede e já saía atirando no instante em que você
      // aparecia (é o "ele já sabia onde eu estava"). Marcamos como STALE: o gate de tiro
      // (!b._losLost) fica fechado até um tick de percepção CONFIRMAR a visão, e ainda por
      // cima ele paga reação + foco do zero, como se tivesse acabado de te ver.
      ent._losLost = true; ent._lostAt = this.time;
      const sk = Math.max(0.4, ent.skill || 1);
      ent.reactAt = this.time + (BOT_FAIR ? Math.max(BOT_REACT_MIN, 0.22 + Math.random() * 0.3) : 0.15);
      ent.focusUntil = ent.reactAt + (BOT_FAIR ? BOT_FOCUS_MIN + 0.18 / sk : 0);
      ent.aimErr = Math.max(ent.aimErr || 0, 0.16);   // levou tiro pelas costas: mira totalmente fora
    }
    if (ent.hp <= 0) this._kill(ent, attacker, weap, head);
  }
  /* Feedback de "levei tiro" no online: o `_damage` local não roda, então quem dispara é o
     netcode ao ver a queda de hp no snapshot. */
  _playerHurtFx() {
    try { this.sfx.hurt?.(); } catch { /* ctx mudo */ }
    this._tintFx(0xff2222, false, 96);
    this.player.recoilP = (this.player.recoilP || 0) + 0.02;
  }

  _kill(ent, attacker, weap = 'AWP', head = false) {
    // TRAVA DE IDEMPOTÊNCIA: `_damage` já barra o morto (`!ent.alive`), mas basta um caminho
    // novo chamar `_kill` direto (queda, zona, script de round) pra sair killfeed dobrado e
    // abate contado 2×. É barato garantir aqui que uma morte é UMA morte.
    if (ent._killT === this.time && ent._killT !== undefined) return;
    ent._killT = this.time;
    ent.alive = false; ent.hp = 0; ent.deaths++;
    ent._killedBy = attacker ? (attacker.name || null) : null;   // tela de morte do multiplayer (vai no snapshot)
    ent.respawnAt = this.time + RESPAWN_DELAY;
    // Drop tem prazo e teto porque a versão sem eles foi retirada por virar lixo de mapa;
    // faca não dropa (todo mundo nasce com uma). Histórico e números: tools/eval/drop-check.mjs.
    if (ent.weapon && ent.weapon !== 'knife' && this._pickupAllowed(ent.weapon)) {
      this._dropWeapon(ent.pos.x, ent.pos.z, ent.weapon, false, 0.01, this.time + DROP_TTL);
    }
    if (attacker) {
      attacker.kills++; this.roundKills[attacker.team]++;
      this.sfx.voice(this._voiceKey(attacker.team));   // killer's side celebrates (meme audio)
      // TELEMETRIA DE ARMA: quando o JOGADOR mata, conta a arma usada (param `weap`
      // já vem do _damage/_tryShoot). Bot mata não conta — não há balanço a inferir.
      if (attacker.isPlayer && weap) this._wperf[weap] = (this._wperf[weap] || 0) + 1;
      if (attacker.isPlayer) {
        this.sfx.killConfirm();
        if (head) { this.sfx.general('headshot'); attacker.headshots++; }
        const mk = this.mk;
        if (this.time < mk.until) mk.count++; else mk.count = 1;
        mk.until = this.time + 4.5; mk.life++;
        mk.best = Math.max(mk.best || 0, mk.count);
        const kind = mk.count >= 6 ? 'godlike' : (MK_TIERS[mk.count] || (mk.life === 5 ? 'killingspree' : null));
        if (kind) { this._mkBanner(MK_LABELS[kind]); this.sfx.general(kind); }
        if (REPLAY_CAM && head && ent.pos) {
          this._replayCam = {
            t: 0,
            victimPos: ent.pos.clone(),
            killerYaw: attacker.yaw,
          };
        }
      }
    }
    if (ent.isPlayer) {
      this._scope(false, true);
      this.mk.life = 0;
      this.el.respawn.classList.remove('hidden');
      this.sfx.death();
    } else {
      ent.target = null; ent.deadT = 0;
      // sting de morte de BOT escala com a distância (sumia o "eco": toda morte no mapa
      // tocava o thud completo no ouvido do player, em cima do tiro que matou) +
      // pan pela direção relativa + delay de propagação (dist/343)
      const d = ent.pos ? ent.pos.distanceTo(this.camera.position) : 0;
      const rel = ent.pos ? Math.atan2(ent.pos.x - this.player.pos.x, ent.pos.z - this.player.pos.z) - this.player.yaw : 0;
      const pan = Math.max(-0.85, Math.min(0.85, Math.sin(rel) * 0.8));
      this.sfx.death(Math.max(0, 1 - d / 34), pan, Math.min(0.25, d / 343));
    }
    // poça que cresce sob o cadáver (qualquer morte com posição — inclui bot×bot)
    if (BLOOD && ent.pos) this._bloodPoolAt(ent.pos);
    this._feed(attacker, ent, weap, head);
  }
  /* ===================== INDICADOR DIRECIONAL DE DANO =====================
     Dono: "matam muito fácil e o usuário não vê de onde veio o tiro". O indicador antigo era
     UM elemento (#dmg-dir) girado por CSS, com 700 ms de vida e um triângulo a 115 px do
     centro. Três defeitos que o jogador sente:
       (a) 700 ms é curto demais — some antes de o jogador terminar de virar. O padrão do
           gênero (CoD/Battlefield/Apex) fica entre 1,2 e 2 s; a régua pede ≥1,2 s. Aqui: 1,5 s.
       (b) Um elemento só: dois inimigos atirando de lados diferentes escreviam um por cima do
           outro e o jogador virava pro lado errado. Agora são até 4 arcos simultâneos, um por
           atacante, e um novo tiro do MESMO atacante renova o dele em vez de criar outro.
       (c) O arco vivia colado no centro, competindo com a mira. Agora ele mora na BORDA
           (raio 42% da menor dimensão da tela) — o olho pega na visão periférica, que é onde
           essa informação tem que chegar.
     O arco é desenhado em SVG com um `conic-gradient`… não: em CSS puro, com um wrapper que
     gira e uma cunha com máscara, para não depender de nada do index.astro/style.css (que
     pertencem a outro dono nesta rodada). Tudo é criado aqui e vive dentro do #hud.
     A INTENSIDADE (opacidade + espessura) escala com o dano do tiro: um tiro de raspão não
     grita igual a um de AWP.  Kill-switch: ?dmgdir=0 volta ao indicador antigo. */
  _dmgArc(attacker, ent, dmg) {
    if (QS.get('dmgdir') === '0') {
      const el = this.el.dmgDir;
      if (!el) return;
      const rel0 = Math.atan2(ent.pos.x - attacker.pos.x, ent.pos.z - attacker.pos.z) - ent.yaw;
      el.style.transform = `rotate(${rel0.toFixed(3)}rad)`;
      el.style.opacity = 0.95;
      clearTimeout(this._dmgDirT);
      this._dmgDirT = setTimeout(() => { el.style.opacity = 0; }, 700);
      return;
    }
    if (!this._dmgArcs) {
      const host = this.el.hud || document.body;
      // mesma armadilha do painel de morte: o #hud sobrevive à partida e o campo da instância
      // não. Sem esta limpeza, cada revanche deixaria os arcos da partida anterior no ar.
      for (const old of Array.from(host.querySelectorAll?.('#dmg-arcs') || [])) old.remove();
      const wrap = document.createElement('div');
      wrap.id = 'dmg-arcs';
      wrap.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:9;overflow:hidden';
      host.appendChild(wrap);
      this._dmgArcs = { wrap, items: [] };
      if (this.el.dmgDir) this.el.dmgDir.style.display = 'none';   // não somar dois indicadores
    }
    const A = this._dmgArcs;
    const key = attacker.name || 'x';
    let it = A.items.find(o => o.key === key);
    if (!it) {
      if (A.items.length >= 4) { const old = A.items.shift(); old.el.remove(); }
      const el = document.createElement('div');
      // wrapper centrado que GIRA; o filho é a cunha, posicionada no topo (12 h) e empurrada
      // até a borda. Assim `rotate` sozinho resolve as 360°, sem trigonometria por frame.
      el.style.cssText = 'position:absolute;left:50%;top:50%;width:0;height:0;'
        + 'transition:opacity .16s linear,transform .18s cubic-bezier(.2,.9,.3,1);will-change:transform,opacity';
      const arc = document.createElement('div');
      arc.style.cssText = 'position:absolute;left:50%;top:0;transform:translate(-50%,0);'
        + 'width:190px;height:34px;'
        // cunha: gradiente radial recortado por um clip-path de arco (grosso no meio, fino nas
        // pontas). Sem imagem, sem SVG externo, sem CSS novo em style.css.
        + 'background:radial-gradient(120% 150% at 50% 130%, rgba(255,72,58,.95) 0%, rgba(255,72,58,.72) 42%, rgba(255,72,58,0) 72%);'
        + 'clip-path:polygon(50% 0%, 88% 16%, 100% 62%, 74% 100%, 26% 100%, 0% 62%, 12% 16%);'
        + 'filter:drop-shadow(0 0 4px rgba(0,0,0,.95)) drop-shadow(0 0 10px rgba(255,40,30,.5))';
      el.appendChild(arc);
      A.wrap.appendChild(el);
      it = { key, el, arc, until: 0 };
      A.items.push(it);
    }
    // raio: 42% da menor dimensão -> o arco encosta na borda em qualquer aspecto (16:9 e 3:2)
    const R = Math.min(innerWidth, innerHeight) * 0.42;
    // ent - attacker (BUG-52): câmera YXZ olha forward=(-sin,-cos); a ordem inversa negava o
    // vetor e somava π — tiro na cara desenhava o arco embaixo (costas).
    const rel = Math.atan2(ent.pos.x - attacker.pos.x, ent.pos.z - attacker.pos.z) - ent.yaw;
    // CSS gira no sentido horário com Y pra baixo; o mundo mede yaw anti-horário: por isso o
    // sinal negativo. 0 rad = atacante bem à frente = arco no topo da tela. Confere nas 4
    // direções: frente=topo, direita=direita, costas=embaixo, esquerda=esquerda.
    it.el.style.transform = `rotate(${(-rel).toFixed(3)}rad) translateY(${(-R).toFixed(0)}px)`;
    const s = Math.max(0.55, Math.min(1.35, 0.55 + dmg / 45));   // dano forte = arco maior
    it.arc.style.transform = `translate(-50%,0) scale(${s.toFixed(2)})`;
    it.el.style.opacity = Math.min(1, 0.72 + dmg / 90).toFixed(2);
    clearTimeout(it.t);
    it.t = setTimeout(() => { it.el.style.opacity = 0; }, 1500);   // ≥1,2 s exigido pela régua
    // CANAL DE SOM: `sfx.hurt()` é MONO e central — sozinho ele diz "levei tiro" e não diz
    // "de que lado". Aqui vai um tique curto e grave PANORAMIZADO pro lado do atirador, em
    // cima do hurt central. Fica no game.js de propósito: audio.js é de outra frente nesta
    // rodada, e o único recurso usado é o AudioContext que ela já expõe.
    try {
      const R = this.sfx.ctx;
      if (R && R.createStereoPanner) {
        const pan = Math.max(-0.9, Math.min(0.9, Math.sin(rel) * 0.95));
        const t0 = R.currentTime;
        const o = R.createOscillator(), gn = R.createGain(), pz = R.createStereoPanner();
        o.type = 'sine'; o.frequency.setValueAtTime(340, t0); o.frequency.exponentialRampToValueAtTime(110, t0 + 0.16);
        gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(0.20, t0 + 0.012);
        gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
        pz.pan.value = pan;
        o.connect(gn); gn.connect(pz); pz.connect(this.sfx.duckBus || this.sfx.master || R.destination);
        o.start(t0); o.stop(t0 + 0.22);
      }
    } catch {}
  }
  _mkBanner(text) {
    const b = this.el.mkBanner;
    b.textContent = text;
    b.classList.remove('show');
    void b.offsetWidth;   // reinicia a animação CSS (letter-spacing settle)
    b.classList.add('show');
    clearTimeout(this._mkT);
    this._mkT = setTimeout(() => b.classList.remove('show'), 1900);
  }
  _hitmarker(isKill, isHead) {
    const h = this.el.hitmarker;
    h.classList.toggle('kill', isKill || isHead);   // vermelho em kill OU headshot (estilo CoD)
    h.classList.remove('show');
    void h.offsetWidth;   // reinicia o pop da animação
    h.classList.add('show');
    clearTimeout(this._hmT);
    this._hmT = setTimeout(() => h.classList.remove('show'), 140);
    // em kill NÃO toca o bip de hit: o killConfirm já soa em seguida (antes = bip+bip-bip
    // empilhados no mesmo evento — o "som disparado 2x" reportado como eco).
    // Headshot NÃO-letal toca normal (bug da rodada 4: ficava mudo).
    if (!isKill) this.sfx.hitmark();
  }
  // Número de dano flutuante estilo CoD: projeta o ponto do hit 3D na tela,
  // sobe e esmaece (~0.6s, CSS). Headshot = âmbar, kill = vermelho.
  _dmgNumber(pos, dmg, head, kill) {
    const wrap = this.el.dmgNums;
    if (!wrap || !pos) return;
    const w = new THREE.Vector3(pos.x, (pos.y || 0) + 1.15, pos.z);
    const dist = this.camera.position.distanceTo(w);
    const v = w.project(this.camera);
    if (v.z > 1) return;   // atrás da câmera
    const d = document.createElement('div');
    d.className = 'dmg-num' + (kill ? ' kill' : head ? ' head' : '');
    d.textContent = Math.round(dmg);
    // tamanho escala com a distância (perto = maior), nunca abaixo de 24px efetivos
    // (crítico R7.5: 18px sumia em cena clara) — contorno escuro já está no CSS.
    let px = 23 * (7 / Math.max(2.5, dist));
    if (kill) px *= 1.3; else if (head) px *= 1.15;
    d.style.fontSize = Math.max(24, Math.min(36, px)).toFixed(0) + 'px';
    d.style.left = ((v.x * 0.5 + 0.5) * innerWidth + (Math.random() * 32 - 16)).toFixed(0) + 'px';
    d.style.top = ((-v.y * 0.5 + 0.5) * innerHeight + (Math.random() * 8 - 4)).toFixed(0) + 'px';
    wrap.appendChild(d);
    setTimeout(() => d.remove(), 900);
  }
  _feed(attacker, victim, weap, head = false) {
    const row = document.createElement('div');
    const meAtk = attacker && attacker.isPlayer, meVic = victim.isPlayer;
    row.className = 'kf-row' + (meAtk ? ' me-atk' : '') + (meVic ? ' me-vic' : '');
    // chip escuro com tint do time (~18% alpha) e texto na cor do time (estilo CoD/Valorant)
    const cn = e => {
      // chip = tint da cor CHEIA do time; texto = tinta PÁLIDA do time (ver _teamInk):
      // texto na cor cheia sobre o próprio tint dava 3,2-3,9:1 (ui-check.mjs, UI1)
      const c = this._teamColor(e.team);
      return `<span class="kf-n" style="background:${c}2e;color:${this._teamInk(e.team)}">${e.isPlayer ? tr('VOCÊ') : e.name}</span>`;
    };
    row.innerHTML = attacker && attacker !== victim
      ? `${cn(attacker)}${head ? this._skullIcon() : ''}${this._killfeedWeaponIcon(weap)}${cn(victim)}`
      : `${cn(victim)}<span class="kf-w">tropeçou na treta</span>`;
    this.el.killfeed.prepend(row);
    setTimeout(() => row.remove(), 4600);
    while (this.el.killfeed.children.length > 6) this.el.killfeed.lastChild.remove();
  }
  // Caveira SVG de headshot no killfeed (mesmo pipeline do _wpnIcon — nada de emoji no HUD).
  _skullIcon() {
    const d = 'M7 .8C4 .8 1.8 3 1.8 5.9c0 1.6.8 3 2 3.8v2.5h1.5v-1.6h1.1v1.6h1.2v-1.6h1.1v1.6h1.5V9.7c1.2-.8 2-2.2 2-3.8C13.2 3 11 .8 7 .8z'
      + 'M4.9 7.5c-.8 0-1.5-.6-1.5-1.4S4.1 4.7 4.9 4.7s1.5.6 1.5 1.4-.6 1.4-1.5 1.4z'
      + 'M9.1 7.5c-.8 0-1.5-.6-1.5-1.4S8.3 4.7 9.1 4.7s1.5.6 1.5 1.4-.7 1.4-1.5 1.4z';
    return `<svg class="kf-ic kf-skull" viewBox="0 0 14 13" width="18" height="17"><path d="${d}" fill="currentColor" fill-rule="evenodd"/></svg>`;
  }
  _killfeedWeaponIcon(short) {
    const id = Object.entries(WEAPONS).find(([, weapon]) => weapon.short === short)?.[0];
    const fallback = this._wpnIcon(short);
    if (!id) return fallback;
    return `<span class="kf-weapon-2d"><i class="kf-weapon-mask" style="--weapon-mask:url('/img/weapons/${id}.webp')"></i><span class="kf-fallback">${fallback}</span></span>`;
  }
  // Ícone 2D da arma no killfeed (estilo CoD — o dono pediu silhuetas RECONHECÍVEIS
  // por arma, não só por classe). Recebe o `short` (AWP/AK/DE/M3/FACA…). ~14 desenhos
  // distintos + fallback refinado por classe pro resto do arsenal. Mira pra direita.
  _wpnIcon(short) {
    const s = (short || '').toUpperCase();
    const F = 'fill="currentColor"';
    const I = {
      // AWP: coronha + corpo + scope alto + cano longo + mag
      awp: `<path ${F} d="M0 6l6-1v3.2L2 10.2H0z"/><rect ${F} x="6" y="4" width="8.5" height="3"/><rect ${F} x="14.5" y="4.6" width="9" height="1.3"/><rect ${F} x="8" y="1.7" width="6" height="1.9"/><rect ${F} x="9.6" y="3.6" width="1" height="0.8"/><rect ${F} x="9.4" y="7" width="2.2" height="3.2"/><rect ${F} x="6.4" y="7" width="1.5" height="2.8"/>`,
      // AK/AKM/M92: mag CURVA inconfundível + tubo de gás
      ak: `<path ${F} d="M0 5.6l6-0.6v3.4l-4.6 1.2-1.4-1z"/><rect ${F} x="6" y="4" width="9" height="2.8"/><rect ${F} x="15" y="4.4" width="8" height="1.2"/><rect ${F} x="15" y="3.3" width="5" height="0.9"/><path ${F} d="M9.2 6.8h3.2c0 2.2-0.9 3.6-2.8 4.4l-1.4-1.5c1.1-0.6 1.6-1.5 1.6-2.9z"/><rect ${F} x="6.6" y="6.8" width="1.5" height="2.8"/>`,
      // M4: carry handle + mag reta levemente inclinada + coronha reta
      m4: `<rect ${F} x="1" y="4.6" width="4.5" height="3.4"/><rect ${F} x="5.5" y="4.2" width="7" height="2.6"/><rect ${F} x="12.5" y="4.2" width="3.5" height="2.2"/><rect ${F} x="16" y="4.6" width="7" height="1.1"/><rect ${F} x="6.5" y="2.6" width="5" height="1.2"/><rect ${F} x="19.6" y="3.2" width="0.9" height="1.4"/><path ${F} d="M8.6 6.8h2.2l0.6 4-2 0.4z"/><rect ${F} x="6" y="6.8" width="1.4" height="3"/>`,
      // MP5: compacta, mag curva fina, coronha esquelética, focinho curto
      mp5: `<rect ${F} x="0.5" y="5" width="4.5" height="1.6"/><rect ${F} x="5" y="4" width="8.5" height="3"/><rect ${F} x="13.5" y="4.8" width="6.5" height="1.1"/><rect ${F} x="18.6" y="4.2" width="1.8" height="2"/><path ${F} d="M8.6 7h2.4c0 2-0.7 3.2-2.2 4l-1.2-1.3c0.9-0.5 1.3-1.3 1.3-2.7z"/><rect ${F} x="5.4" y="7" width="1.5" height="3"/>`,
      // P90: caixote bullpup arredondado com trilho em cima
      p90: `<path ${F} d="M3 5h13a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H3z"/><rect ${F} x="18" y="6" width="3" height="1.4"/><rect ${F} x="7" y="3.4" width="8" height="1.4"/><rect ${F} x="1.4" y="6" width="2" height="4"/><rect ${F} x="6" y="9" width="1.6" height="2.6"/>`,
      // UZI: corpo pequeno, mag LONGA saindo do grip
      uzi: `<rect ${F} x="2.5" y="5" width="3.5" height="1.1"/><rect ${F} x="6" y="4" width="9" height="3"/><rect ${F} x="15" y="4.8" width="5.5" height="1.2"/><rect ${F} x="9.6" y="7" width="2" height="5.6"/><rect ${F} x="12.8" y="7" width="1.4" height="2.2"/>`,
      // DEAGLE: pistola parruda, slide grosso
      deagle: `<rect ${F} x="7" y="3.4" width="12" height="2.8"/><rect ${F} x="19" y="4" width="2" height="1.6"/><rect ${F} x="7" y="6.2" width="8" height="1.4"/><path ${F} d="M8 7.6h3.6l-0.6 5.2H7.6z"/><rect ${F} x="6.4" y="3.8" width="1" height="1.2"/>`,
      // pistola comum (PT-38): slide fino
      pistol: `<rect ${F} x="8" y="4" width="10.5" height="2"/><rect ${F} x="18.5" y="4.4" width="1.6" height="1.2"/><rect ${F} x="8" y="6" width="7.5" height="1.2"/><path ${F} d="M8.6 7.2h3l-0.7 4.6H8.1z"/>`,
      // revólver .38: tambor redondo
      revolver: `<rect ${F} x="11" y="4.2" width="8.5" height="1.8"/><circle ${F} cx="9.6" cy="5.7" r="2.3"/><rect ${F} x="6" y="4.4" width="3" height="2.2"/><rect ${F} x="5.2" y="4" width="1.2" height="1"/><path ${F} d="M6.4 6.8h2.8l-1.4 4.6H5.4z"/>`,
      // faca: lâmina clip-point + guarda + cabo
      knife: `<path ${F} d="M5 5.2l14-1 2.5 0.8-2.5 1.4-14 0.2z"/><rect ${F} x="4.2" y="3.8" width="1" height="3.6"/><rect ${F} x="0.6" y="4.6" width="3.6" height="1.8"/>`,
      // escopeta M3: cano grosso + tubo + pump
      shotgun: `<path ${F} d="M0 5.4l3.5-0.4v3.4l-2.9 1.6z"/><rect ${F} x="3.5" y="4.4" width="5" height="3"/><rect ${F} x="8.5" y="4" width="14" height="1.8"/><rect ${F} x="8.5" y="6.1" width="11.5" height="1.1"/><rect ${F} x="12" y="5.6" width="4.5" height="2.2"/>`,
      // mosin/rem700: ferrolho — cano fino longo + bolt + coronha de madeira
      bolt: `<path ${F} d="M0 5.4l4-0.4v3l-3 2z"/><rect ${F} x="4" y="4.2" width="7" height="2.6"/><rect ${F} x="11" y="4.4" width="12" height="1.2"/><circle ${F} cx="10.6" cy="3.2" r="1"/><rect ${F} x="9.8" y="3.4" width="2" height="0.8"/><rect ${F} x="5" y="6.8" width="1.6" height="2.6"/>`,
      // DMR (SVD/G3SG1/SKS): longa + scope + mag fina
      dmr: `<path ${F} d="M0 5l6-0.4v3.8l-5.2 1z"/><rect ${F} x="6" y="4.2" width="7.5" height="2.6"/><rect ${F} x="13.5" y="4.4" width="9.5" height="1.1"/><rect ${F} x="7" y="2.2" width="5.5" height="1.6"/><rect ${F} x="9" y="6.8" width="1.8" height="3.4"/><rect ${F} x="6.4" y="6.8" width="1.4" height="2.6"/>`,
      // LMG: corpo + caixa de munição embaixo
      lmg: `<rect ${F} x="1" y="4.8" width="4" height="3"/><rect ${F} x="5" y="4" width="9" height="3.2"/><rect ${F} x="14" y="4.6" width="9" height="1.4"/><rect ${F} x="7.5" y="7.2" width="4" height="4.4"/>`,
      // bullpup (TAVOR/FAMAS): mag ATRÁS do grip
      bullpup: `<rect ${F} x="2" y="4.8" width="3" height="3.2"/><rect ${F} x="5" y="4.2" width="11" height="3"/><rect ${F} x="16" y="4.8" width="7" height="1.1"/><rect ${F} x="10.5" y="7.2" width="2.2" height="3.6"/><rect ${F} x="7" y="7.2" width="1.5" height="2.8"/>`,
      // granada de mão (FRAG)
      frag: `<circle ${F} cx="11" cy="8.4" r="4.4"/><rect ${F} x="9.6" y="2" width="2.8" height="2.2"/><path ${F} d="M12.4 2.4c2.4-1 4.2 0.2 4.2 2.4h-1.6c0-1.2-1-1.8-2.6-1.2z"/>`,
      // fallback por classe
      sniper: `<path ${F} d="M0 5.4l4.5-0.4v3l-3.4 2z"/><rect ${F} x="4.5" y="4.2" width="8" height="2.6"/><rect ${F} x="12.5" y="4.5" width="10.5" height="1.2"/><rect ${F} x="6.5" y="2" width="5.5" height="1.7"/><rect ${F} x="7.4" y="6.8" width="1.8" height="3"/><rect ${F} x="5" y="6.8" width="1.4" height="2.6"/>`,
      rifle: `<path ${F} d="M0 5.6l5.5-0.6v3.4l-4.2 1.2-1.3-1z"/><rect ${F} x="5.5" y="4.2" width="9" height="2.6"/><rect ${F} x="14.5" y="4.5" width="8.5" height="1.2"/><rect ${F} x="8.4" y="6.8" width="2" height="3.6"/><rect ${F} x="6" y="6.8" width="1.5" height="2.8"/>`,
    };
    // ordem importa: os mais específicos primeiro
    const key = s === 'AWP' ? 'awp'
      : /^(AK|AKM|M92)$/.test(s) ? 'ak'
      : s === 'M4' ? 'm4'
      : s === 'MP5' ? 'mp5'
      : s === 'P90' ? 'p90'
      : s === 'UZI' ? 'uzi'
      : s === 'DE' ? 'deagle'
      : s === 'PT-38' ? 'pistol'
      : s === '.38' ? 'revolver'
      : /FACA|KNIFE/.test(s) ? 'knife'
      : /M3|SHOT/.test(s) ? 'shotgun'
      : /MOSIN|REM/.test(s) ? 'bolt'
      : /SVD|G3SG1|SKS/.test(s) ? 'dmr'
      : s === 'LMG' ? 'lmg'
      : /TAVOR|FAMAS/.test(s) ? 'bullpup'
      : /FRAG|NADE|GRANADA/.test(s) ? 'frag'
      : /M400|SNIPER/.test(s) ? 'sniper'
      : /DE|PT|\.38|PIST/.test(s) ? 'pistol'
      : 'rifle';
    return `<svg class="kf-ic" viewBox="0 0 24 14" width="34" height="20">${I[key]}</svg>`;
  }

  /* ================= fx ================= */
  _tracer(a, b) {
    const len = a.distanceTo(b);
    if (len < 0.5) return;
    // pooled mesh: shared unit cylinder, own material cloned once (never disposed per shot).
    // O rastro é um SEGMENTO CURTO (≤2m) que viaja de a→b em ~50ms com a opacidade CAINDO
    // ao longo do trajeto (era fade só no fim — lia como "lightsaber" em cena clara).
    const t = this._tracerPool.pop() || { m: new THREE.Mesh(this._tracerGeo, this._tracerMat.clone()), ttl: 0 };
    const m = t.m;
    t.a = (t.a || new THREE.Vector3()).copy(a);
    t.dir = (t.dir || new THREE.Vector3()).copy(b).sub(a).normalize();
    t.dist = len;
    // GUNFEEL: mais curto e mais rápido (CS). Era 2.0 m em 50 ms; agora 1.2 m em 32 ms — a
    // bala lê como bala, não como traço luminoso pendurado no ar.
    t.v = len / (GUNFEEL ? 0.032 : 0.05);
    t.seg = Math.min(len, GUNFEEL ? 1.2 : 2.0);
    t.t = 0;
    t.ttl = (GUNFEEL ? 0.032 : 0.05) + 0.012;   // viagem + fade final — sem persistência
    m.material.opacity = GUNFEEL ? 0.75 : 0.9;
    m.position.copy(a);
    m.scale.set(1, 0.01, 1);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), t.dir);
    this.scene.add(m);
    this.tracers.push(t);
  }
  _puff(pos, normal, surf = null) {
    // impact smoke: one GPU particle (batched, no allocation)
    const p = pos.clone();
    if (normal) p.add(normal.clone().multiplyScalar(0.12));
    // GUNFEEL: todo impacto no mundo gerava o MESMO puff branco. Agora a nuvem tem cor de
    // material e metal/vidro trocam poeira por FAÍSCA (poeira em aço não existe).
    if (GUNFEEL && surf && surf !== 'concreto') {
      const S = {
        madeira: { c: 0x8a6033, life: 0.34, size: 0.3, grow: 1.6, spark: 0 },
        areia:   { c: 0x9c7c4e, life: 0.5, size: 0.45, grow: 2.6, spark: 0 },
        metal:   { c: 0xbfc6cc, life: 0.16, size: 0.14, grow: 0.6, spark: 6 },
        vidro:   { c: 0xd8e6ee, life: 0.2, size: 0.16, grow: 0.8, spark: 4 },
        agua:    { c: 0x9fd0e0, life: 0.42, size: 0.34, grow: 1.4, spark: 0 },
      }[surf];
      if (S) {
        const key = '_fx_' + surf;
        const fx = this[key] || (this[key] = this._tintFx(S.c, surf === 'metal' || surf === 'vidro'));
        fx.spawn(p, { life: S.life, size: S.size, grow: S.grow });
        for (let i = 0; i < S.spark; i++) {
          const v = (normal ? normal.clone() : new THREE.Vector3(0, 1, 0)).multiplyScalar(1.5 + Math.random() * 3)
            .add(new THREE.Vector3((Math.random() - .5) * 4, (Math.random() - .5) * 4, (Math.random() - .5) * 4));
          this.flashFx.spawn(pos, { vel: v, life: 0.09 + Math.random() * 0.09, size: 0.045, grow: -0.2 });
        }
      }
    } else this.puffFx.spawn(p, { life: 0.4, size: 0.4, grow: 2.2 });
    // persistent bullet hole on the surface (capped ring buffer)
    if (normal && surf !== 'agua') {
      const m = new THREE.Mesh(this._holeGeo, this._holeDecalMat(surf));
      m.position.copy(pos).add(normal.clone().multiplyScalar(0.012));
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize());
      m.rotateZ(Math.random() * Math.PI * 2);
      m.scale.setScalar(0.7 + Math.random() * 0.6);
      this.scene.add(m);
      this.decals.push(m);
      if (this.decals.length > 48) { const old = this.decals.shift(); this.scene.remove(old); }
    }
  }
  // Decal de furo TINGIDO por material (o mapa é o mesmo; só o multiplicador de cor muda).
  // Materiais cacheados por superfície — nada de material novo por tiro.
  _holeDecalMat(surf) {
    if (!GUNFEEL || !surf || surf === 'concreto') return this._holeMat;
    const C = { madeira: 0x7a5330, metal: 0xc6ccd4, areia: 0xa88a5c, vidro: 0xe2eef4 }[surf];
    if (!C) return this._holeMat;
    const cache = this._holeMats || (this._holeMats = {});
    if (!cache[surf]) { const m = this._holeMat.clone(); m.color.setHex(C); cache[surf] = m; }
    return cache[surf];
  }
  _flash(pos, dir, fpCls) {
    // muzzle flash: estrela irregular + núcleo branco-quente (sprites), point light pulsante,
    // faíscas com velocidade e fumacinha. dir opcional (default = frente da câmera).
    // fpCls (classe do VM) = tiro do PRÓPRIO jogador: a estrela nasce na vmScene como FILHA
    // do vm.root na offset local da boca — segue o kick/bob colada no cano (R7.6).
    let d = dir;
    if (!d || d.lengthSq() < 1e-6) { d = new THREE.Vector3(); this.camera.getWorldDirection(d); }
    else d = d.clone().normalize();
    if (fpCls) {
      const m = this._vmMzPool.pop();
      if (m) {
        const off = this._vmMuzzle[this.player?.weapon] || this._vmMuzzle[fpCls] || this._vmMuzzle.rifle;   // arma (supressor) → classe → fallback
        m.grp.position.copy(off);
        // a point light do flash também vai pra BOCA MEDIDA (era um ponto fixo em view space:
        // com 26 armas de comprimentos diferentes ela iluminava o vazio ao lado do cano).
        if (this._vmFlashLight) this._vmFlashLight.position.copy(off);
        const s = 0.85 + Math.random() * 0.45;
        const fxf = (this._fxTune && this._fxTune.flash) ?? 1;
        m.jetS = 0.22 * s * fxf; m.coreS = 0.08 * s * fxf;   // boca a ~0.35m da lente: menor que o do mundo
        m.jet.scale.setScalar(m.jetS); m.core.scale.setScalar(m.coreS);
        m.jetMat.rotation = Math.random() * Math.PI * 2;
        m.jetMat.opacity = 1; m.coreMat.opacity = 1; m.grp.visible = true; m.t = 0;
        this._vmMzActive.push(m);
      }
    } else {
      const m = this._mzPool.pop();
      if (m) {
        m.grp.position.copy(pos).addScaledVector(d, 0.05);   // leve viés à frente da boca
        const s = 0.85 + Math.random() * 0.5;                // variação por tiro (0.36–0.57m no sprite)
        const fxf = (this._fxTune && this._fxTune.flash) ?? 1;
        m.jetS = 0.42 * s * fxf; m.coreS = 0.15 * s * fxf;
        m.jet.scale.setScalar(m.jetS); m.core.scale.setScalar(m.coreS);
        m.jetMat.rotation = Math.random() * Math.PI * 2;     // estrela nunca repete o ângulo
        m.jetMat.opacity = 1; m.coreMat.opacity = 1; m.grp.visible = true; m.t = 0;
        this._mzActive.push(m);
      }
    }
    const l = this._mzLights.pop();
    if (l) { l.position.copy(pos).addScaledVector(d, 0.12); l.intensity = 18 * ((this._fxTune && this._fxTune.light) ?? 1); this._mzLightActive.push({ l, t: 0, life: 0.05 }); }
    // flash na CENA DO VM: pulso breve sincronizado (ilumina a arma em 1ª pessoa)
    if (this._vmFlash) { this._vmFlash.t = 0; if (this._vmFlashLight) this._vmFlashLight.intensity = this._vmFlash.peak * ((this._fxTune && this._fxTune.light) ?? 1); }
    // faíscas 3D (partículas com velocidade, encolhendo) + fumacinha. No tiro do PRÓPRIO
    // jogador a boca fica a ~0.35m da lente — velocidade/tamanho reduzidos pra não virar um
    // blob flutuante deslocado do cano (crítico R7.6).
    const sparkMul = fpCls ? 0.35 : 1;
    for (let i = 0; i < Math.round(5 * ((this._fxTune && this._fxTune.spark) ?? 1)); i++) {
      const v = d.clone().multiplyScalar((6 + Math.random() * 7) * sparkMul).add(new THREE.Vector3((Math.random() - 0.5) * 4.5 * sparkMul, (Math.random() - 0.5) * 4.5 * sparkMul, (Math.random() - 0.5) * 4.5 * sparkMul));
      this.flashFx.spawn(pos, { vel: v, life: 0.06 + Math.random() * 0.05, size: fpCls ? 0.07 : 0.11, grow: -0.4 });
    }
    this.puffFx.spawn(pos.clone().addScaledVector(d, 0.18), { vel: d.clone().multiplyScalar(1.2), life: 0.3, size: fpCls ? 0.16 : 0.28, grow: 0.9 });
    // fumaça do cano: 2-3 baforadas lentas subindo/à frente, vida longa, crescendo. Menor e mais
    // perto na 1ª pessoa (fpCls) pra não virar blob colado na lente (mesmo cuidado das faíscas, R7.6).
    const smokeN = fpCls ? 3 : 4;
    const smokeSize = fpCls ? 0.2 : 0.32;
    const smU = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < Math.round(smokeN * ((this._fxTune && this._fxTune.smoke) ?? 1)); i++) {
      const sv = d.clone().multiplyScalar(0.6 + Math.random() * 0.5)
        .addScaledVector(smU, 0.5 + Math.random() * 0.4)
        .add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5));
      this._muzzleSmokeFx.spawn(pos.clone().addScaledVector(d, 0.10 + Math.random() * 0.1),
        { vel: sv, life: 0.45 + Math.random() * 0.35, size: smokeSize, grow: 1.6 });
    }
  }
  // Boca do cano em WORLD SPACE no instante do tiro: offset local da classe transformada
  // pelo matrixWorld ATUAL do vm.root (com o kick acumulado) e depois pela câmera — usado
  // pelo tracer e pela luz/faísca do mundo no tiro do jogador (R7.6).
  _muzzleWorld(cls) {
    if (this.camView !== 'first') {
      // A câmera está atrás/acima, então a boca do cano NÃO pode sair dela: a fumaça nascia
      // lá em cima. Sai do OLHO, na direção da mira, descida pra altura da arma na mão.
      const dir = this.camera.getWorldDirection(new THREE.Vector3());
      const m = this._eyeWorld.clone().addScaledVector(dir, 0.5);
      m.y -= 0.28;
      return m;
    }
    const off = this._vmMuzzle[this.player?.weapon] || this._vmMuzzle[cls] || this._vmMuzzle.rifle;
    this.vm.root.updateWorldMatrix(true, false);
    const v = off.clone();
    this.vm.root.localToWorld(v);          // vmScene == espaço da câmera (vmCamera na origem)
    return this.camera.localToWorld(v);
  }

  // Origem do tiro/raycast: olho do jogador. Em 3ª pessoa a câmera está atrás — usar a
  // câmera faria a bala nascer nas costas. Ver _eyeWorld (capturado no _updatePlayer).
  _aimOrigin(out) {
    return this.camView === 'first' ? this.camera.getWorldPosition(out) : out.copy(this._eyeWorld);
  }
  // Porta com SENSOR (Havan): desliza as 2 folhas ao chegar perto (player ou bot). Painéis são
  // só visuais (não colidem), então quando você alcança a porta já está aberta.
  _updateDoors(dt) {
    const doors = this.world.doors; if (!doors) return;
    for (const d of doors) {
      let near = Math.hypot(this.player.pos.x - d.x, this.player.pos.z - d.z) < 5.5;
      if (!near) for (const b of this.bots) { if (b.alive && Math.hypot(b.pos.x - d.x, b.pos.z - d.z) < 5.5) { near = true; break; } }
      d.open += ((near ? 1 : 0) - d.open) * Math.min(1, dt * 7);
      d.panelL.position.x = d.closedL + (d.openL - d.closedL) * d.open;
      d.panelR.position.x = d.closedR + (d.openR - d.closedR) * d.open;
    }
  }
  _updateFx(dt) {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.t += dt; t.ttl -= dt;
      // segmento viajante: cabeça avança a t.v, cauda segue t.seg atrás; fade nos últimos 50ms
      const head = Math.min(t.dist, t.v * t.t);
      const tail = Math.max(0, head - t.seg);
      const vis = Math.max(0.01, head - tail);
      t.m.scale.y = vis;
      t.m.position.copy(t.a).addScaledVector(t.dir, tail + vis * 0.5);
      t.m.material.opacity = 0.9 * Math.max(0, 1 - t.t / t.ttl);   // fade ao longo do trajeto
      if (t.ttl <= 0) { this.scene.remove(t.m); this._tracerPool.push(t); this.tracers.splice(i, 1); }
    }
    // cápsulas: gravidade + quica no chão + gira; encolhe e some no fim.
    const groundY = this.camera.position.y - 1.55;
    for (let i = this._casings.length - 1; i >= 0; i--) {
      const c = this._casings[i];
      c.ttl -= dt; c.v.y -= 9.8 * dt;
      c.m.position.addScaledVector(c.v, dt);
      if (c.m.position.y < groundY) { c.m.position.y = groundY; c.v.y = Math.abs(c.v.y) * 0.35; c.v.x *= 0.6; c.v.z *= 0.6; c.av.multiplyScalar(0.5); }
      c.m.rotation.x += c.av.x * dt; c.m.rotation.y += c.av.y * dt; c.m.rotation.z += c.av.z * dt;
      if (c.ttl < 0.3) c.m.scale.setScalar(Math.max(0.02, c.ttl / 0.3));
      if (c.ttl <= 0) { this.scene.remove(c.m); c.m.scale.setScalar(1); this._casingPool.push(c); this._casings.splice(i, 1); }
    }
    this.flashFx.update(dt);
    this.puffFx.update(dt);
    this._updateBlood(dt);
    // muzzle flash: sprites esmaecem rápido (≤3 frames), núcleo some antes; luzes decaem à 0
    for (let i = this._mzActive.length - 1; i >= 0; i--) {
      const m = this._mzActive[i]; m.t += dt; const k = m.t / m.life;
      if (k >= 1) { m.grp.visible = false; this._mzActive.splice(i, 1); this._mzPool.push(m); continue; }
      const op = 1 - k; m.jetMat.opacity = op; m.coreMat.opacity = op * op;
      m.jet.scale.setScalar(m.jetS * (1 + k * 0.5)); m.core.scale.setScalar(m.coreS * (1 + k * 0.2));
    }
    // flash de 1ª pessoa (filho do vm.root): mesmo fade — a posição acompanha o kick sozinha
    for (let i = this._vmMzActive.length - 1; i >= 0; i--) {
      const m = this._vmMzActive[i]; m.t += dt; const k = m.t / m.life;
      if (k >= 1) { m.grp.visible = false; this._vmMzActive.splice(i, 1); this._vmMzPool.push(m); continue; }
      const op = 1 - k; m.jetMat.opacity = op; m.coreMat.opacity = op * op;
      m.jet.scale.setScalar(m.jetS * (1 + k * 0.5)); m.core.scale.setScalar(m.coreS * (1 + k * 0.2));
    }
    for (let i = this._mzLightActive.length - 1; i >= 0; i--) {
      const e = this._mzLightActive[i]; e.t += dt; const k = e.t / e.life;
      if (k >= 1) { e.l.intensity = 0; this._mzLightActive.splice(i, 1); this._mzLights.push(e.l); continue; }
      e.l.intensity = 18 * ((this._fxTune && this._fxTune.light) ?? 1) * (1 - k) * (1 - k);
    }
    // pulso do flash na vmScene: decaimento quadrático, ~45ms (sincronizado com o jato 3D)
    if (this._vmFlash && this._vmFlashLight) {
      const f = this._vmFlash;
      if (f.t < f.life) {
        f.t += dt; const k = Math.min(1, f.t / f.life);
        this._vmFlashLight.intensity = f.peak * ((this._fxTune && this._fxTune.light) ?? 1) * (1 - k) * (1 - k);
      } else if (this._vmFlashLight.intensity !== 0) this._vmFlashLight.intensity = 0;
    }
  }

  _ejectCasing() {
    if (this.player.weapon === 'knife') return;
    const c = this._casingPool.pop() || { m: new THREE.Mesh(this._casingGeo, this._casingMat), v: new THREE.Vector3(), av: new THREE.Vector3(), ttl: 0 };
    c.m.position.copy(this.camera.localToWorld(new THREE.Vector3(0.28, -0.14, -0.7)));
    const q = this.camera.quaternion;
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const back = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    c.v.copy(right).multiplyScalar(2.2 + Math.random() * 0.9).addScaledVector(up, 2.0 + Math.random() * 0.6).addScaledVector(back, 0.5 + Math.random() * 0.4);
    c.av.set((Math.random() - 0.5) * 24, (Math.random() - 0.5) * 24, (Math.random() - 0.5) * 24);
    c.m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    c.m.scale.setScalar(1); c.ttl = 2.2;
    this.scene.add(c.m); this._casings.push(c);
  }

  // Pano da bandeira CTF: base clara (a cor do time multiplica), faixas de ondulação,
  // gradiente e borda gasta/desfiada na ponta — nunca um retângulo de cor plana.
  _makeCtfFlagTex(fac) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 160;
    const x = c.getContext('2d');
    let seed = 163; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    x.fillStyle = '#e8e6e2'; x.fillRect(0, 0, 256, 160);
    for (let i = 0; i < 7; i++) {   // ondulação: faixas verticais claro/escuro
      const g = x.createLinearGradient(i * 36, 0, i * 36 + 36, 0);
      g.addColorStop(0, 'rgba(120,118,112,0.28)'); g.addColorStop(0.45, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(120,118,112,0.28)');
      x.fillStyle = g; x.fillRect(i * 36, 0, 36, 160);
    }
    const gb = x.createLinearGradient(0, 0, 0, 160);   // peso embaixo
    gb.addColorStop(0, 'rgba(255,255,255,0.12)'); gb.addColorStop(1, 'rgba(90,86,80,0.3)');
    x.fillStyle = gb; x.fillRect(0, 0, 256, 160);
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(96,90,80,${0.08 + rnd() * 0.15})`; x.fillRect(rnd() * 256, rnd() * 160, 2 + rnd() * 5, 1.5 + rnd() * 3); }   // sujeira
    // borda gasta: desfiado na ponta (fly end) e vincos no mastro
    for (let i = 0; i < 26; i++) { x.clearRect(250 + rnd() * 6, rnd() * 160, 2 + rnd() * 6, 1 + rnd() * 4); }
    x.strokeStyle = 'rgba(90,86,80,0.5)'; x.lineWidth = 3; x.beginPath(); x.moveTo(4, 0); x.lineTo(4, 160); x.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    t._fac = fac; t._canvas = c; this._paintFlagSymbol(t);   // emblema da facção dona (se já carregou)
    return t;
  }

  // Estampa o símbolo da facção (img/symbols/<fac>.png) centrado no pano da bandeira.
  _paintFlagSymbol(t) {
    const img = this._ctfSymImg && this._ctfSymImg[t._fac];
    if (!t._fac || !img || !img.complete || !img.naturalWidth) return;
    const x = t._canvas.getContext('2d');
    const H = 122, W = H * img.naturalWidth / img.naturalHeight;
    x.drawImage(img, 128 - W / 2, 82 - H / 2, W, H);
    t.needsUpdate = true;
  }
  // Textura de bandeira por facção (cacheada). null = pano neutro sem emblema.
  _flagTexFor(fac) {
    this._flagTexCache = this._flagTexCache || {};
    const k = fac || '_';
    if (!this._flagTexCache[k]) {
      /* BRASÃO DE FACÇÃO (`public/js/brasoes.js`) — APARÊNCIA é de outra frente; aqui só se
         CONSOME, e com guarda. O módulo pode não existir (é opcional por contrato) e pode
         devolver `null` para uma facção que ainda não tem brasão: nos dois casos cai no pano
         procedural de sempre, e o CTF continua funcionando exatamente como hoje. */
      let tex = null;
      /* `fac` É LETRA DE FACÇÃO, não lado da partida — vem sempre de `_factionOf(side)`
         (ver `_updateCTF`). A diferença morde no 'B': como LADO quer dizer "time B", como
         FACÇÃO quer dizer Time Bs, e os dois só coincidem por acidente. Passar o lado
         cru aqui entrega a bandeira do time errado SEM erro nenhum no console. */
      if (fac && this._bandeiraTextura) { try { tex = this._bandeiraTextura(fac); } catch { tex = null; } }
      if (!tex) this._legadoSimbolo(fac);
      this._flagTexCache[k] = tex || this._makeCtfFlagTex(fac);
    }
    return this._flagTexCache[k];
  }
  /* EMBLEMA LEGADO (`img/symbols/<fac>.png`) — SÓ quando o `brasoes.js` não responde.
     Os quatro PNG antigos somam 3,58 MB (768×512 para desenhar numa caixa de ~250 px) e
     eram baixados de olhos fechados no início de toda partida de captura. Com o
     `brasoes.js` no ar eles NUNCA são desenhados: quem ganha o pano é a textura do módulo
     (141,6 KB nos cinco, agora com o F dos funkeiros, que aqui nunca existiu). Baixar os
     dois é manter dois caminhos vivos e pagar o pior deles. Carrega sob demanda, por
     facção, e só depois que o import falhou de verdade. */
  _legadoSimbolo(fac) {
    if (!fac || !this._brasoesFalhou || !this._ctfSymImg || this._ctfSymImg[fac]) return;
    const img = new Image();
    img.onload = () => { const t = this._flagTexCache && this._flagTexCache[fac]; if (t) this._paintFlagSymbol(t); };
    this._ctfSymImg[fac] = img;
    img.src = `img/symbols/${fac.toLowerCase()}.png`;
  }
  // Liga o módulo de brasões (cor do time + emblema). Assíncrono e OPCIONAL por contrato.
  _loadCtfSymbols() {
    if (this._ctfSymImg) return;
    this._ctfSymImg = {};
    /* O módulo é assíncrono: se ele chegar DEPOIS das bandeiras já criadas, o `pt._flagFac`
       fica igual ao dono e o `_updateCTF` nunca pediria textura nova. Invalidar o cache e
       zerar o `_flagFac` faz o próximo frame repintar — nos dois sentidos (chegou, ou
       falhou e o legado assume). */
    const repintaTudo = () => {
      this._flagTexCache = {};
      for (const pt of this.ctfPts || []) pt._flagFac = undefined;
    };
    const falhou = () => { this._brasoesFalhou = true; repintaTudo(); };
    import('./brasoes.js').then((m) => {
      if (!m || typeof m.bandeiraTextura !== 'function') return falhou();
      this._bandeiraTextura = m.bandeiraTextura;
      repintaTudo();
    }).catch(falhou);
  }

  // Zona de captura CTF: disco de terra compactada escura c/ borda irregular + anel pintado
  // GASTO (amarelo sinalização desbotado). Substitui o círculo verde-chapado saturado que
  // dominava o primeiro plano (crítico gauntlet R6). Só visual — raio/lógica intactos.
  _makeCtfZoneTex() {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d');
    let seed = 149; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const cx = S / 2, cy = S / 2;
    // terra compactada: blobs escuros sobrepostos (borda irregular, nunca um círculo perfeito)
    for (let i = 0; i < 30; i++) {
      const a = rnd() * Math.PI * 2, r = rnd() * 62;
      const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r, rr = 40 + rnd() * 42;
      const g = x.createRadialGradient(px, py, 2, px, py, rr);
      g.addColorStop(0, 'rgba(66,54,38,0.5)'); g.addColorStop(1, 'rgba(66,54,38,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, rr, 0, 7); x.fill();
    }
    // grãos da terra pisada
    for (let i = 0; i < 700; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 108;
      x.fillStyle = rnd() > 0.5 ? `rgba(40,32,22,${0.1 + rnd() * 0.25})` : `rgba(110,94,66,${0.1 + rnd() * 0.2})`;
      x.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.7, 1.7);
    }
    // anel pintado gasto: arcos tracejados amarelo-sinalização desbotado, com falhas
    x.lineWidth = 7; x.lineCap = 'butt';
    for (let i = 0; i < 14; i++) {
      if (rnd() < 0.2) continue;   // falhas (tinta sumiu)
      const a0 = (i / 14) * Math.PI * 2 + rnd() * 0.12, a1 = a0 + (Math.PI * 2 / 14) * (0.55 + rnd() * 0.3);
      x.strokeStyle = `rgba(226,204,140,${0.35 + rnd() * 0.35})`;
      x.beginPath(); x.arc(cx, cy, 112, a0, a1); x.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  }

  _makeSmokeTex() {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.5, 'rgba(220,222,226,0.6)'); g.addColorStop(1, 'rgba(210,212,216,0)');
    x.fillStyle = g; x.beginPath(); x.arc(64, 64, 64, 0, 6.29); x.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  _updateSmokeHud() {
    if (this.el && this.el.smokeCount) this.el.smokeCount.textContent = '💨 ' + (this.player.smokes | 0) + '   🧨 ' + (this.player.frags | 0);
  }

  // Spawner genérico: projétil físico com pavio; ao estourar vira fumaça OU explosão de frag.
  // Usado pelo jogador (câmera) e pelos bots (olho + direção do alvo).
  _spawnGrenade(origin, dir, kind, owner) {
    const mesh = new THREE.Mesh(this._grenGeo, kind === 'frag' ? this._fragMat : this._grenMat);
    mesh.position.copy(origin).addScaledVector(dir, 0.5);
    this.scene.add(mesh);
    this._grenades.push({
      mesh, kind, owner,
      v: dir.clone().multiplyScalar(kind === 'frag' ? 17 : 15).add(new THREE.Vector3(0, 3.2, 0)),
      fuse: kind === 'frag' ? 1.5 : 2.2,
    });
  }

  _throwSmoke() {
    const p = this.player;
    if (!p.alive || (p.smokes | 0) <= 0 || this.time < (p._nextNade || 0)) return;
    p.smokes--; p._nextNade = this.time + 0.6; this._updateSmokeHud();
    const dir = new THREE.Vector3(); this.camera.getWorldDirection(dir);
    this._spawnGrenade(this.camera.position, dir, 'smoke', p);
  }

  _throwFrag() {
    const p = this.player;
    if (!p.alive || (p.frags | 0) <= 0 || this.time < (p._nextNade || 0)) return;
    p.frags--; p._nextNade = this.time + 0.6; this._updateSmokeHud();
    const dir = new THREE.Vector3(); this.camera.getWorldDirection(dir);
    this._spawnGrenade(this.camera.position, dir, 'frag', p);
  }

  // Explosão de frag: dano em área SÓ nos inimigos do dono (sem fogo amigo, arcade), com
  // falloff radial, estilhaços visuais e clarão. Tremor de tela se o jogador estiver perto.
  _explodeFrag(pos, owner) {
    const R = 6.5;
    this._flash(pos.clone());
    for (let i = 0; i < 7; i++) this._puff(pos.clone().add(new THREE.Vector3((Math.random() - .5) * 1.4, Math.random() * 1.3, (Math.random() - .5) * 1.4)), null);
    if (this.sfx.explosion) this.sfx.explosion();
    const team = owner ? owner.team : this.playerTeam;
    for (const c of this.combatants) {
      if (!c.alive || c.team === team) continue;
      const d = Math.hypot(c.pos.x - pos.x, c.pos.z - pos.z);
      const dy = Math.abs((c.pos.y || 0) - pos.y);
      if (d > R || dy > 4) continue;
      const dmg = Math.round(95 * (1 - d / R));
      if (dmg > 0) this._damage(c, dmg, owner || this.player, 'FRAG');
    }
    const pd = Math.hypot(this.player.pos.x - pos.x, this.player.pos.z - pos.z);
    if (pd < R * 1.6 && this.el.vignette) {
      this.el.vignette.style.transition = 'opacity 0.1s'; this.el.vignette.style.opacity = String(Math.min(0.85, (R * 1.6 - pd) / (R * 1.6)));
      setTimeout(() => { if (this.el.vignette) this.el.vignette.style.opacity = '0'; }, 130);
    }
  }

  /* COR DA FUMAÇA = O CÉU MEDIDO DO MAPA × ALBEDO (invariante FOG1).
     O dono relatou "a tela lava pra branco, o mapa inteiro vira branco e dá pra ver só o
     contorno da geometria". Foram medidos os três suspeitos (tools/eval/mat-check.mjs):
       · EXPOSIÇÃO: cinza médio 0,18 linear sai em L* 61-69 nos 5 mapas. Não é estouro.
       · NÉVOA: no pior caso (contraluz, fogFactor saturado) sai em L* 82,7-84,4 — mas ela só
         satura depois de ~200 m (f = 0,35 a 100 m no praca_poderes). Não cobre a tela de perto.
       · FUMAÇA: sai em L* 80,8-86,5 E cobre a tela inteira (alfa acumulado 0,999 medido com
         a câmera dentro da nuvem, 14 dos 18 sprites cruzando o centro). Era ela.
     A cor 0xcfd2d6 tinha radiância linear 0,642 contra 0,310 do CÉU MEDIDO do praca_poderes
     (bloom.js:145-153, cores que o r3_fog.py extraiu de frames reais). Fumaça 2,07× mais
     clara que o céu que a ilumina é IMPOSSÍVEL: albedo ≤ 1. Daí a regra, que não depende de
     gosto nem de exposição (o AgX é monotônico, então limitar a RADIÂNCIA limita o L*):
        radiância da fumaça = radiância do céu do mapa × SMOKE_ALBEDO.
     E o sprite deixa de ser uma cor fixa para acompanhar o mapa — é o mesmo motivo pelo qual
     a luz do viewmodel passou a seguir o orçamento do mapa: consistência gráfica é o mapa e
     o efeito lerem a MESMA fonte, não dois números escritos à mão em lugares diferentes.
     Kill-switch: ?smokealb=<0..1> (?smokealb=2.07 reproduz o branco antigo no praca_poderes). */
  _corDaFumaca() {
    if (this._smokeCol) return this._smokeCol;
    // `skyRadiance` devolve a radiância do céu DESTE mapa já em espaço linear de trabalho
    // (bloom.js), então multiplicar por escalar é escalar radiância. NÃO se usa `scene.fog`
    // aqui de propósito: o piscina_treta é salão fechado e não tem névoa, mas o céu dele foi
    // medido igual — a régua tem que valer nos 5, inclusive no que não tem névoa.
    const ceu = skyRadiance(this._mapId);
    const ov = parseFloat(QS.get('smokealb'));
    // 0,75: albedo de plumas de fumaça branca em espalhamento múltiplo. Abaixo de 1 por
    // construção — é o que garante FOG1 sem depender da exposição de cada mapa.
    const alb = isFinite(ov) ? ov : 0.75;
    this._smokeCol = ceu.multiplyScalar(alb);
    return this._smokeCol;
  }

  _popSmoke(pos) {
    const R = 2.6;
    const group = new THREE.Group();
    group.position.set(pos.x, Math.max(0.5, pos.y), pos.z);
    const sprites = [];
    const cor = this._corDaFumaca();
    for (let i = 0; i < 18; i++) {
      const mat = new THREE.SpriteMaterial({ map: this._smokeTex, color: cor, transparent: true, opacity: 0, depthWrite: false });
      const sp = new THREE.Sprite(mat);
      const a = Math.random() * 6.28, r = Math.random() * R, h = (Math.random() - 0.2) * R;
      sp.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
      sp.scale.setScalar(3 + Math.random() * 2.2);
      sp.userData = { baseOp: 0.7 + Math.random() * 0.3 };
      group.add(sp); sprites.push(sp);
    }
    this.scene.add(group);
    this._smokes.push({ center: group.position.clone(), radius: R + 1.4, born: this.time, dur: 13, group, sprites, _opaque: false });
  }

  _updateGrenades(dt) {
    for (let i = this._grenades.length - 1; i >= 0; i--) {
      const g = this._grenades[i];
      g.fuse -= dt; g.v.y -= 12 * dt;
      g.mesh.position.addScaledVector(g.v, dt);
      if (g.mesh.position.y < 0.1) { g.mesh.position.y = 0.1; g.v.y = Math.abs(g.v.y) * 0.4; g.v.x *= 0.6; g.v.z *= 0.6; }
      if (g.fuse <= 0) {
        if (g.kind === 'frag') this._explodeFrag(g.mesh.position.clone(), g.owner);
        else this._popSmoke(g.mesh.position.clone());
        this.scene.remove(g.mesh); this._grenades.splice(i, 1);
      }
    }
    for (let i = this._smokes.length - 1; i >= 0; i--) {
      const s = this._smokes[i], age = this.time - s.born;
      if (age >= s.dur) { this.scene.remove(s.group); this._smokes.splice(i, 1); continue; }
      const grow = Math.min(1, age / 0.8);
      let op = grow;
      if (age > s.dur - 2.5) op = Math.max(0, (s.dur - age) / 2.5);
      s.group.scale.setScalar(0.5 + 0.5 * grow);
      for (const sp of s.sprites) sp.material.opacity = op * sp.userData.baseOp;
      s._opaque = op > 0.45;
    }
  }

  // ---------------- Capture the Flag (?ctf=1) ----------------
  // Cor do time no CTF (anel/bandeira/HUD). AZUL pro lado do JOGADOR quando a facção é Tribos
  // Urbanas; senão P vermelho / B verde. `dark` = tom mais escuro (pano da bandeira).
  _teamColor(side, dark = false) {
    // o que depende de partida fica aqui (quem é espelho, que facção está de cada lado);
    // a COR de cada facção mora em paleta.js e é a mesma que bandeira e rim consomem.
    const p = this._mirror(side) ? ESPELHO : tons(this._factionOf(side));
    return dark ? p.escura : p.base;
  }
  /* TINTA CLARA DO TIME — só pra TEXTO sobre chip tingido (killfeed). Por que existe:
     o chip do killfeed é `background:${cor}2e` (a própria cor do time a 18%) com o texto
     na cor CHEIA do time. Medido em tools/eval/ui-check.mjs (UI1): #ff5555 sobre esse chip
     dá 3,85:1 na linha "VOCÊ morreu" — abaixo dos 4,5:1 da WCAG 1.4.3, e é justamente a
     linha que o jogador mais precisa ler. A saída não é abandonar a cor do time: é a mesma
     que o topo do HUD já usa há tempos (.ts-p{color:#ff9a9a} / .ts-b{color:#a9f0b6},
     style.css:521-522) — a versão PÁLIDA da cor. Aqui ela ganha nome e vale pras 6 facções.
     Mantém a leitura "vermelho = time-e / verde = time-b" e passa a 5,9-9,1:1. */
  _teamInk(side) {
    return (this._mirror(side) ? ESPELHO : tons(this._factionOf(side))).palida;
  }
  // Pack de vozes/round por FACÇÃO: o lado do jogador usa 'U' (Tribos) quando a facção é Tribos
  // Urbanas; senão o lado (P/B). O inimigo é sempre político. Corrige "Tribos usa voz de Time E".
  // Facção que ocupa um LADO físico (P/B): lado do jogador = playerFaction, o outro = enemyFaction.
  _factionOf(side) { return side === this.playerTeam ? this.playerFaction : this.enemyFaction; }
  _voiceKey(side) { return this._factionOf(side); }   // pack de vozes/round por facção (P/B/U)
  _teamName(side) { const f = this._factionOf(side); return f === 'U' ? 'TRIBOS URBANAS' : f === 'C' ? 'PALHAÇOS' : f === 'F' ? 'FUNKEIROS' : (TEAM_LABEL[f] || f); }
  _teamTag(side) { const f = this._factionOf(side); return f === 'U' ? 'TRB' : f === 'C' ? 'PLH' : f === 'F' ? 'FNK' : f === 'E' ? 'TME' : 'TMB'; }

  /* Uma plaqueta do HUD. Chamada por QUADRO, então tudo aqui é comparação barata:
     o número só é escrito se mudou, e o brasão (data-f, arte no CSS) só quando a
     facção muda — na prática, uma vez por partida. `slot` é o sufixo do cache
     (scorePNum/crestP/siglaP) e `side` é o lado no modelo do jogo. */
  _plaqueta(slot, side) {
    const num = this.el['score' + slot + 'Num'];
    const n = String(this.roundKills[side]);
    if (num && num.textContent !== n) num.textContent = n;
    /* minúscula porque o seletor de atributo do CSS é SENSÍVEL A CAIXA e os arquivos
       são b/c/e/f/u.png — `data-f="U"` não casaria com `[data-f="u"]` e o brasão
       simplesmente não apareceria, sem erro nenhum no console. */
    const f = String(this._factionOf(side) || '').toLowerCase();
    const crest = this.el['crest' + slot];
    if (crest && crest.dataset.f !== f) crest.dataset.f = f;
    const sig = this.el['sigla' + slot], tag = this._teamTag(side);
    if (sig && sig.textContent !== tag) sig.textContent = tag;
  }
  _mirror(side) { return side === this.enemyTeam && this.enemyFaction === this.playerFaction; }   // inimigo = mesma facção
  // Separação (boids): empurra o bot pra longe de colegas do mesmo time num raio curto, pra eles
  // NÃO andarem colados em fila indiana sobre o mesmo path. Peso ~inverso à distância.
  _botSeparation(b, dt) {
    let px = 0, pz = 0, crowd = 0;
    /* ANTI-AMONTOADO (01/08, bug do print da Loja H). Três coisas acontecem nesta varredura,
       e é importante que sejam TRÊS e não uma:
       (a) a separação de boids ORIGINAL (raio 1,15 m, só colegas de time) — mexer no raio
           dela foi MEDIDO como ruim: o componente lateral vira desvio de rumo, e com raio
           grande o bot sai do próprio caminho toda hora, erra o nó, o destravamento bane o
           nó e a rota apodrece (A* falhando ~40% por nó banido). Fica como estava;
       (b) DESPENETRAÇÃO RÍGIDA (nova): nada no jogo impedia dois bonecos de ocuparem o mesmo
           ponto — `_collide` só resolve contra o CENÁRIO. É isso que produz o borrão de 8
           personagens do print. Aqui os dois são afastados de verdade, metade pra cada um,
           valendo inclusive contra o time inimigo (a pilha da porta é mista). Como é uma
           correção de POSIÇÃO simétrica e não uma força de direção, ela não briga com a rota;
       (c) `crowd` = colegas a menos de 3 m, medido SEMPRE (independente do raio de boids —
           na primeira versão ele vivia zerado porque estava dentro do `if` do raio de 1,15 m).
           Serve pra cancelar o "plantar e mirar" no meio do bolo (ver _updateBot). */
    const R = BOT_MOVE2 ? 1.15 : 1.6, R2 = R * R;
    const BODY2 = BOT_BODY_R * 2;
    for (const o of this.bots) {
      if (o === b || !o.alive) continue;
      const foe = o.team !== b.team;
      const dx = b.pos.x - o.pos.x, dz = b.pos.z - o.pos.z, d2 = dx * dx + dz * dz;
      if (d2 <= 1e-4) continue;
      if (!foe && d2 < 9) crowd++;                       // (c)
      if (!foe && d2 < R2) {                             // (a) — inalterado
        const d = Math.sqrt(d2), u = (R - d) / R, w = BOT_MOVE2 ? u * u : u;
        px += (dx / d) * w; pz += (dz / d) * w;
      }
      if (BOT_CROWD && d2 < BODY2 * BODY2) {             // (b)
        const d = Math.sqrt(d2), push = (BODY2 - d) * 0.5;
        b.pos.x += (dx / d) * push; b.pos.z += (dz / d) * push;
        o.pos.x -= (dx / d) * push; o.pos.z -= (dz / d) * push;
        this._collide(o.pos, 0.38);
      }
    }
    b._crowd = crowd;
    if (!px && !pz) { this._collide(b.pos, 0.38); return; }
    const k = BOT_MOVE2 ? 0.45 : 0.7;
    /* CAUSA-RAIZ do "andando de lado" que sobrou (medido: 17 latFlips/min, quase todos em
       ROAM, não em combate): a separação era uma TRANSLAÇÃO EM X/Z DO MUNDO. Quando ela
       aponta pro lado do corpo, o bot escorrega de lado com o corpo virado pra frente — e
       não existe clipe de "andar de lado" no controller, então ele desliza. Pior: como o
       vizinho também empurra de volta, o sinal alterna e vira o zigzag.
       AGORA (só fora de combate, pra não mexer na mira): o empurrão é decomposto no
       referencial do bot. O componente PRA FRENTE/TRÁS continua translação (tem animação);
       o componente LATERAL vira DESVIO DE ROTA — o bot CONTORNA o colega andando, que é o
       que uma pessoa faz. Em combate segue como era (translação curta já calibrada). */
    if (BOT_MOVE2 && !b.target) {
      const f = px * Math.sin(b.yaw) + pz * Math.cos(b.yaw);
      const l = px * Math.cos(b.yaw) - pz * Math.sin(b.yaw);
      b.pos.x += Math.sin(b.yaw) * f * BOT_SPEED * k * dt;
      b.pos.z += Math.cos(b.yaw) * f * BOT_SPEED * k * dt;
      b.yaw += Math.max(-1, Math.min(1, l)) * 1.5 * dt;   // desvio suave, teto de ~86°/s
    } else { b.pos.x += px * BOT_SPEED * k * dt; b.pos.z += pz * BOT_SPEED * k * dt; }
    this._collide(b.pos, 0.38);
  }
  _initCTF() {
    this._loadCtfSymbols();   // emblemas das facções (estampam a bandeira do dono)
    for (const p of this.ctfPts) for (const m of [p.ring, p.zone, p.pole, p.flag]) if (m) this.scene.remove(m);
    const sP = this.world.spawns.E[0], sB = this.world.spawns.B[0];
    const mk = (id, label, x, z) => {
      /* ALTURA DA ZONA: era y ABSOLUTO (0,06 / 0,12) e não o chão LOCAL. Em mapa plano dá na
         mesma; em mapa com relevo o anel ATRAVESSA a geometria — foi o "anel rosa cortando o
         pedestal da estátua" nos prints do dono no loja_h (pedestal de 0,60 m, anel a 0,12).
         Mesmo defeito de forma do `_dropWeapon` com TOP absoluto (ver pickup-check.mjs).
         Mastro e pano seguem o mesmo chão: bandeira fincada no ar é o mesmo bug uma altura
         acima. */
      const gy = this.world.groundHeightAt ? this.world.groundHeightAt(x, z) : 0;
      // disco de terra compactada (visual novo — anel fino de time por cima)
      const zone = new THREE.Mesh(this._ctfZoneGeo, new THREE.MeshStandardMaterial({
        map: this._ctfZoneTex, transparent: true, roughness: 0.95, metalness: 0,
        depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
      }));
      zone.position.set(x, gy + 0.06, z); zone.rotation.x = -Math.PI / 2; zone.scale.setScalar(4.5);
      zone.receiveShadow = true;
      const ring = new THREE.Mesh(this._ctfRingGeo, new THREE.MeshBasicMaterial({ color: 0xb8b4a8, transparent: true, opacity: 0.6, depthWrite: false }));
      ring.position.set(x, gy + 0.12, z); ring.rotation.x = Math.PI / 2; ring.scale.setScalar(4.5);
      // mastro + bandeira que colore com o dono (vermelha P / verde B), como pedido.
      // Pano TEXTURIZADO (crítico R6: "retângulo verde-chapado gigante"): ondulação,
      // gradiente e borda gasta — a cor do time multiplica o pano dessaturado.
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.2, 8), new THREE.MeshStandardMaterial({ color: 0xbfc3c9, metalness: 0.6, roughness: 0.5 }));
      pole.position.set(x, gy + 2.1, z);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.05, 6, 3), new THREE.MeshBasicMaterial({ map: this._flagTexFor(null), color: 0xaaaaaa, side: THREE.DoubleSide }));
      // ondulação estática do pano (vértices em seno — sem custo de animação)
      {
        const pos = flag.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const fx = pos.getX(i);
          pos.setZ(i, Math.sin((fx / 1.7 + 0.5) * Math.PI * 2.2) * 0.07 * (fx / 1.7 + 0.5));
        }
        pos.needsUpdate = true; flag.geometry.computeVertexNormals();
      }
      flag.position.set(x + 0.9, gy + 3.55, z);
      this.scene.add(zone); this.scene.add(ring); this.scene.add(pole); this.scene.add(flag);
      return { id, label, x, z, r: 4.5, owner: null, prog: 0, ring, zone, pole, flag };
    };
    // Bandeiras por-mapa: o mapa pode fornecer world.ctfPoints (Havan = 4 bandeiras, ferro velho
    // = 4, etc.). Senão, layout padrão do Brasília (2 spawns + ônibus no meio).
    if (this.world.ctfPoints && this.world.ctfPoints.length) {
      this.ctfPts = this.world.ctfPoints.map(p => mk(p.id, p.label, p.x, p.z));
    } else {
      /* (o `else` abaixo é o layout padrão de 3 bandeiras; o alvo da rodada é derivado
         da contagem DEPOIS deste if/else — ver o bloco ALVO logo após.) */
      /* 0,82 -> 0,42 do vetor spawn->centro. Com 0,82 a bandeira nascia a 18% do caminho, ou
         seja COLADA no respawn: medido em tools/eval/map-check.mjs, 11,3 m no praca_poderes, 7,7 m
         na praça e 3,9 m no piscinão — MENOS que o raio de captura (4,5 m) no piscinão, isto
         é, dava pra capturar de dentro do próprio spawn e o inimigo que chegasse pra retomar
         caía no meio dos que estavam renascendo. 0,42 põe as três a ≥ 12 m do spawn mais
         próximo nos três mapas (medido: 36,4 / 24,9 / 12,6 m) sem mexer na forma do layout. */
      /* Rótulos NEUTROS de propósito (06/08): os nomes de Brasília moravam aqui e vazavam
         pra qualquer mapa sem declaração — o dono viu "CONGRESSO · ÔNIBUS · CATEDRAL"
         jogando na piscina. Nome de monumento agora mora no mapa (world.ctfPoints);
         mapa novo sem declaração ganha rótulo genérico, nunca o monumento alheio. */
      this.ctfPts = [
        mk('E', 'BASE A', sP.x * 0.42, sP.z * 0.42),
        mk('MID', 'CENTRO', 2.5, 2.5),
        mk('B', 'BASE B', sB.x * 0.42, sB.z * 0.42),
      ];
    }
    /* ALVO DA RODADA = TODAS AS BANDEIRAS DO MAPA, SEMPRE.
       ─────────────────────────────────────────────────────────────────────────────
       Defeito do dono, jogando: *"no capture the flag na loja H está com 3 capturas
       quando a vitória tem que ser as 4. tem que ser todas sempre."*

       O alvo era a CONSTANTE `CTF_CAPS_TO_WIN = 3`, escrita quando todo mapa tinha três
       bandeiras. Havan, ferro velho e quebrada passaram a declarar `world.ctfPoints` com
       QUATRO e o alvo não acompanhou: a rodada fechava com 3 de 4, com uma bandeira
       inteira do mapa fora da condição de vitória. Medido em
       `tools/eval/ctf-win-check.mjs` antes do conserto — alvo 3 nos 5 mapas, e a rodada
       fechando na 3ª captura nos três mapas de 4 bandeiras.

       Deriva daqui, e não da constante, porque AQUI é onde as bandeiras existem: o mapa
       é a fonte da contagem (`world.ctfPoints`) e o layout padrão é o fallback de 3. Um
       mapa novo com 5 bandeiras passa a exigir 5 sem tocar em nenhuma constante.
       `_initCTF` roda dentro do `_startRound` ANTES do banner que anuncia o alvo, então
       o número que o jogador lê é sempre este. */
    this.capsToWin = this.ctfPts.length || CTF_CAPS_TO_WIN;
    this._updateCtfHud();
  }

  _updateCTF(dt) {
    // RITMO do CTF: 3s fixos pra qualquer ponto deixava tudo plano (tomar um ponto neutro
    // custava o mesmo que roubar a base inimiga, e ir em 3 não valia mais que ir sozinho).
    // Agora: NEUTRO 2.2s, ponto do INIMIGO 4.5s (roubar dói), e cada colega a mais dentro do
    // anel acelera 35% (teto 2×) — grupo captura rápido, o que cria a corrida/retomada.
    const CAP_NEUTRAL = 2.2, CAP_STEAL = 4.5, DECAY = 1.6;
    for (const pt of this.ctfPts) {
      let np = 0, nb = 0;
      for (const c of this.combatants) {
        if (!c.alive) continue;
        const dx = c.pos.x - pt.x, dz = c.pos.z - pt.z;
        if (dx * dx + dz * dz <= pt.r * pt.r) { if (c.team === 'E') np++; else nb++; }
      }
      const solo = np > 0 && nb === 0 ? 'E' : (nb > 0 && np === 0 ? 'B' : null);
      pt.capTeam = solo;   // time que está capturando agora (pra cor da barra no HUD)
      pt.contested = np > 0 && nb > 0;
      if (solo && solo !== pt.owner) {
        const crew = Math.min(2, 1 + 0.35 * ((solo === 'E' ? np : nb) - 1));   // 2º e 3º corpo aceleram
        pt.prog += (dt * crew) / (pt.owner ? CAP_STEAL : CAP_NEUTRAL);
        if (pt.prog >= 1) {
          pt.owner = solo; pt.prog = 0;
          this.sfx.captureSound && this.sfx.captureSound(this._factionOf(solo));   // captura: pool de som por facção (palhaços = pasta própria)
          // credita a captura: +1 pro time e +1 pra cada combatente do time DENTRO do anel
          this.ctfCaps[solo] = (this.ctfCaps[solo] || 0) + 1;
          this.roundCaps[solo] = (this.roundCaps[solo] || 0) + 1;   // placar DA RODADA (quem leva o round)
          for (const c of this.combatants) {
            if (!c.alive || c.team !== solo) continue;
            const dx = c.pos.x - pt.x, dz = c.pos.z - pt.z;
            if (dx * dx + dz * dz <= pt.r * pt.r) c.captures = (c.captures || 0) + 1;
          }
          this._updateCtfHud();
        }
      } else if (!solo) {
        // CONTESTADO (os dois times no anel) CONGELA o progresso — é o momento de tensão do
        // modo; só decai quando o anel fica vazio ou o dono retoma sozinho.
        if (!pt.contested) pt.prog = Math.max(0, pt.prog - dt / (CAP_NEUTRAL * DECAY));
      }
      // cor de time DESSATURADA no anel fino (-50% sat: identidade sem o verde-chapado)
      if (pt.owner) pt.ring.material.color.set(this._teamColor(pt.owner)).lerp(this._ctfGray, 0.45);
      else pt.ring.material.color.set(0xb8b4a8);
      // contestado pisca o anel (leitura à distância de "tem briga nessa bandeira")
      pt.ring.material.opacity = pt.contested
        ? 0.55 + 0.4 * Math.abs(Math.sin(this.time * 7))
        : 0.5 + 0.45 * (pt.prog || (pt.owner ? 1 : 0));
      if (pt.flag) {   // emblema da facção dona no pano; troca a textura só quando o dono muda
        const fac = pt.owner ? this._factionOf(pt.owner) : null;
        if (pt._flagFac !== fac) { pt._flagFac = fac; pt.flag.material.map = this._flagTexFor(fac); pt.flag.material.needsUpdate = true; }
        pt.flag.material.color.set(pt.owner ? 0xe6e6e6 : 0xaaaaaa);   // dono: quase branco p/ o emblema mostrar cor real
      }
    }
    this._updateCtfHud();   // atualiza a barra de progresso de captura a cada frame
    const owners = this.ctfPts.map(p => p.owner);
    if (owners.length && owners.every(o => o === 'E')) this._ctfWin('E');   // vale p/ 3 ou 4 bandeiras (por-mapa)
    else if (owners.length && owners.every(o => o === 'B')) this._ctfWin('B');
  }

  _ctfWin(team) {
    this.roundsWon[team] = (this.roundsWon[team] || 0) + 1;
    this.state = 'roundEnd'; this.stateUntil = this.time + 4;
    this.player.scoped = false; this.el.scope.classList.remove('on');
    this.radioOpen = null; this._radioUi();
    this._ensureDolly();
    const mine = team === this.playerTeam;
    this._resultadoDaRodada(`${this._teamName(team)} DOMINARAM AS BANDEIRAS`, mine ? 'capturou tudo! 🏆' : 'corre pra retomar!');
    if (!this.sfx.roundSound(this._voiceKey(team))) mine ? this.sfx.roundWin() : this.sfx.roundLose();
    // dominação é vitória INSTANTÂNEA da rodada, mas continua sendo uma RODADA: se ela foi
    // a 3ª vitória (ou a 5ª rodada), a pausa estica pra tela de fim, igual ao _endRound.
    if (this._fimDaPartida()) this.stateUntil = this.time + 4.5;
  }

  // Simula a caminhada reta do bot (física _collide real) até um waypoint: responde se
  // o nó é FISICAMENTE alcançável da posição atual. O grafo do mapa tem arestas que
  // passam no segClear (inflate 0.25) mas não cabem o bot (r 0.38) — ex.: quina do muro
  // das ilhotas do piscinão (nó (-8.4,34) atrás do muro). G2-R6A.
  /* Direção LIVRE mais próxima da atual: sonda 8 rumos com a física real do bot e devolve o
     que consegue andar mais longe, penalizando quanto ele obriga a girar. Serve à fuga de
     bolso e ao anti-pirueta — os dois casos em que a alternativa era sortear um ângulo, o
     que fazia o bot girar 180° parado antes de sair do lugar. */
  _freeYaw(b, reach = 3.0) {
    let bestA = b.yaw, bestS = -1e9;
    for (let i = 0; i < 8; i++) {
      const a = b.yaw + (i * Math.PI) / 4;
      const sim = { x: b.pos.x, y: b.pos.y, z: b.pos.z };
      const sx = Math.sin(a), sz = Math.cos(a), step = reach / 6;
      for (let k = 0; k < 6; k++) { sim.x += sx * step; sim.z += sz * step; this._collide(sim, 0.38); }
      const walked = Math.hypot(sim.x - b.pos.x, sim.z - b.pos.z);
      let turn = Math.abs(((a - b.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const score = walked - turn * 0.55;   // 0.55 m de "custo" por radiano de giro
      if (score > bestS) { bestS = score; bestA = a; }
    }
    return bestA;
  }
  /* STRING-PULLING (poda de rota). CAUSA-RAIZ estrutural do "andando de lado": o A* anda
     num GRAFO DE GRID, então a rota vem em escada — e seguir a escada nó a nó obriga uma
     VIRADA a cada nó. Medido em botdiag: 47-62% dos flips laterais acontecem num frame em
     que o bot girou >0,25 rad; ou seja, o zigzag que o dono vê é a escada do A* impressa no
     corpo do boneco. A tentativa anterior (mirar 2 nós à frente) foi revertida porque cortava
     quina PRA DENTRO do obstáculo. Aqui a poda é VERIFICADA com a física real: um nó só é
     descartado se o bot conseguir andar RETO até o nó seguinte (_walkReach usa _collide, o
     mesmo do movimento). Rota mais curta e reta = menos viradas = menos flips, e de quebra
     mais deslocamento líquido (eff) e menos raspada em quina (stuck).
     ORÇAMENTO: poda só os 8 primeiros nós, com salto máximo de 3, e só no repath
     (0,25-2,5 s) — teto de ~24 sondas por bot por rerrota, não por frame. */
  _pullString(b, path) {
    if (!path || path.length < 3) return path;
    const nd = this.world.waypoints.nodes;
    const out = [path[0]];
    let cur = { pos: { x: b.pos.x, y: b.pos.y, z: b.pos.z } };
    let i = 1;
    const lim = Math.min(path.length, 9);   // só o começo da rota; o resto é podado no próximo repath
    while (i < lim) {
      let pick = i;
      for (let j = Math.min(lim - 1, i + 3); j > i; j--) {
        if (this._walkReach(cur, nd[path[j]], 0.8)) { pick = j; break; }
      }
      out.push(path[pick]);
      const n = nd[path[pick]];
      cur = { pos: { x: n.x, y: b.pos.y, z: n.z } };
      i = pick + 1;
    }
    for (let k = lim; k < path.length; k++) out.push(path[k]);
    return out;
  }
  // `tol` = quanto o passeio simulado pode terminar longe do nó. 1,2 m serve pra decidir
  // "esse nó é alcançável"; a PODA de rota (_pullString) pede 0,45 m, porque ali tolerância
  // grande significa "chega raspando na parede" — e raspar parede é o bot travando.
  _walkReach(b, n, tol = 1.2) {
    if (!n) return false;
    const dx = n.x - b.pos.x, dz = n.z - b.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.8) return true;
    const sim = { x: b.pos.x, y: b.pos.y, z: b.pos.z };
    const steps = Math.min(24, Math.ceil(d / 0.3));
    for (let i = 0; i < steps; i++) { sim.x += (dx / d) * 0.3; sim.z += (dz / d) * 0.3; this._collide(sim, 0.38); }
    return Math.hypot(n.x - sim.x, n.z - sim.z) < tol;
  }
  /* COMPONENTES CONEXOS DO GRAFO DE WAYPOINTS (uma varredura por mapa, em cache no world).
     PORQUÊ: o grafo de vários mapas é DESCONEXO — na Loja H, medindo, são 3 ilhas: a arena
     jogável (394 nós), a faixa externa em volta do prédio da loja (143 nós, sem porta) e o
     mezanino (14 nós, a rampa não passa no segClear por causa do degrau de altura). O roam
     sorteava o destino só por coluna/profundidade, então 45% das rotas do lado que ATACA a
     loja miravam uma dessas ilhas: o A* devolvia [from], o bot marcava "inalcançável",
     re-sorteava, e o ciclo consumia a rerrota inteira. Na tela isso é o bot que fica moendo
     perto do spawn "sem jogar". Com o componente em mãos o destino já nasce alcançável.
     Custo: O(nós+arestas) UMA vez (551 nós na Loja H) — nada por frame. */
  _wpComp() {
    const W = this.world;
    if (W._wpComp) return W._wpComp;
    const N = (W.waypoints && W.waypoints.nodes) || [], A = (W.waypoints && W.waypoints.adj) || [];
    const comp = new Int32Array(N.length).fill(-1);
    let nc = 0;
    for (let i = 0; i < N.length; i++) {
      if (comp[i] >= 0) continue;
      const st = [i]; comp[i] = nc;
      while (st.length) { const c = st.pop(); for (const m of (A[c] || [])) if (comp[m] < 0) { comp[m] = nc; st.push(m); } }
      nc++;
    }
    return (W._wpComp = comp);
  }
  // A* local idêntico ao do mapa, mas pulando nós banidos (b._banNodes — hops que o bot
  // não conseguiu transitar fisicamente). Mantido aqui (game.js) pra não tocar nos mapas.
  _findPathLocal(W, from, to, banned) {
    if (!banned || !banned.size) return W.findPath(from, to);
    const adj = W.waypoints.adj, nodes = W.waypoints.nodes;
    if (from === to) return [to];
    const n = nodes.length;
    const D = (a, c) => Math.hypot(nodes[a].x - nodes[c].x, nodes[a].z - nodes[c].z);
    const g = new Float32Array(n).fill(Infinity), f = new Float32Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1), open = new Uint8Array(n);
    g[from] = 0; f[from] = D(from, to); open[from] = 1; let openCount = 1;
    while (openCount > 0) {
      let cur = -1, bf = Infinity;
      for (let i = 0; i < n; i++) if (open[i] && f[i] < bf) { bf = f[i]; cur = i; }
      if (cur === -1) break;
      if (cur === to) { const path = [cur]; let c = prev[cur]; while (c !== -1) { path.unshift(c); c = prev[c]; } return path; }
      open[cur] = 0; openCount--;
      for (const m of adj[cur]) { if (banned.has(m)) continue; const t = g[cur] + D(cur, m); if (t < g[m]) { prev[m] = cur; g[m] = t; f[m] = t + D(m, to); if (!open[m]) { open[m] = 1; openCount++; } } }
    }
    return [from];
  }
  // IA de CTF do bot: sem alvo de combate, escolhe um ponto NÃO do seu time, navega até ele
  // via waypoints e o segura (ficar no anel já acumula progresso em _updateCTF). O esquadrão
  // se espalha pelos pontos via roamSeed (índice no time) — senão todos empilham no mesmo.
  _botCtf(b, dt) {
    const W = this.world, pts = this.ctfPts;
    if (!pts || !pts.length) { b._ctfMoving = 0; return; }
    const cur = pts[b.ctfPt];
    // G2-R6A: o re-sort a cada 3-5s flipava o alvo entre 2 pontos equidistantes no meio do
    // caminho (bot A→B→A "andando pro lado e pro outro"). Agora só re-alveja quando o ponto
    // virou do time (ou nunca teve alvo) — ponto válido é seguido até o fim.
    const need = b.ctfPt === undefined || !cur || cur.owner === b.team;
    if (need) {
      if (b.roamSeed === undefined) b.roamSeed = this.bots.indexOf(b);
      const cap = pts.map((p, i) => ({ i, d: Math.hypot(p.x - b.pos.x, p.z - b.pos.z) }))
        .filter(o => pts[o.i].owner !== b.team)
        .sort((a, c) => a.d - c.d);
      if (cap.length) {
        // 60% vai no mais perto; resto se espalha pelo roamSeed pra cobrir vários pontos
        b.ctfPt = (Math.random() < 0.6 ? cap[0] : cap[b.roamSeed % cap.length]).i;
      } else b.ctfPt = 1;   // tudo nosso (raro no meio do round): segura o meio
      b.ctfRepick = this.time + 8 + Math.random() * 4;
      b.path = null;
    } else if (this.time > (b.ctfRepick || 0)) b.ctfRepick = this.time + 8;   // alvo válido: segue nele (anti-flip)
    const pt = pts[b.ctfPt];
    const distPt = Math.hypot(pt.x - b.pos.x, pt.z - b.pos.z);
    /* ==================== CAUSA-RAIZ DO "RODANDO EM VOLTA DE SI MESMO" ====================
       O dono joga CAPTURA (está no print /root/iss/16.59.51.jpg: "CAPTURA · CONGRESSO ·
       ÔNIBUS · CATEDRAL"). E o `_botCtf` é um caminho de movimento SEPARADO do roam — toda a
       saga anterior (_walkReach + A* com banidos + juke esparso + destravamento com lado
       fixo) foi aplicada só no roam. Por isso os três sintomas continuaram aparecendo pro
       jogador: no modo em que ele joga, o código antigo nunca saiu do lugar. O pior deles
       estava aqui, literal:
             b.yaw += dt * 0.6 * (b.roamSeed % 2 ? 1 : -1);
       um bot dentro do anel de captura GIRA PARA SEMPRE a 0,6 rad/s — uma volta completa a
       cada 10,5 s, parado. É exatamente "rodando em volta de si mesmo", e como o round de
       CTF é longo, é o que ele mais vê.
       Aqui o CTF passa a usar as mesmas ferramentas do roam: varredura com PARADA em vez de
       giro contínuo, A* local com nós banidos, checagem física de alcance, raio de chegada
       de 1,5 m (o de 0,7 m era menor que o passo de um frame lento — o bot "chegava" e
       "saía" do nó no mesmo lugar), teto de giro e destravamento por deslize. */
    if (distPt < pt.r * 0.7) {   // dentro do anel: SEGURA o ponto e vigia as entradas
      b._ctfMoving = 0;
      if (BOT_MOVE2) {
        // varredura por SETORES com dwell: escolhe um rumo, para 1,4-2,8 s olhando pra ele,
        // depois vira pro próximo. Lê como sentinela; girar sem parar lê como bug.
        if (this.time > (b._scanAt || 0)) {
          b._scanAt = this.time + 2.6 + Math.random() * 2.2;   // dwell longo: sentinela para e OLHA
          const base = Math.atan2((this.player.pos.x - b.pos.x), (this.player.pos.z - b.pos.z));
          b._scanYaw = base + (Math.random() - 0.5) * 1.25;   // ±36° em torno da direção da briga
        }
        let sdy = (b._scanYaw === undefined ? b.yaw : b._scanYaw) - b.yaw;
        while (sdy > Math.PI) sdy -= Math.PI * 2; while (sdy < -Math.PI) sdy += Math.PI * 2;
        b.yaw += Math.max(-1.6 * dt, Math.min(1.6 * dt, sdy * Math.min(1, dt * 3)));   // vira devagar e PARA
      } else b.yaw += dt * 0.6 * (b.roamSeed % 2 ? 1 : -1);
      return;
    }
    if (!b.path || this.time > b.repathAt) {
      b.repathAt = this.time + 1.5;
      if (BOT_MOVE2) {
        // mesmo tratamento do roam: nó de partida FISICAMENTE alcançável + A* que pula os
        // hops que o bot já provou não caber (senão ele serrilha a quina pra sempre).
        let from = W.nearestWaypoint(b.pos.x, b.pos.z);
        if (!this._walkReach(b, W.waypoints.nodes[from])) {
          const cands = W.waypoints.nodes.map((n, i) => ({ i, d: (n.x - b.pos.x) ** 2 + (n.z - b.pos.z) ** 2 })).sort((a, c) => a.d - c.d);
          for (let k = 0; k < Math.min(6, cands.length); k++) if (this._walkReach(b, W.waypoints.nodes[cands[k].i])) { from = cands[k].i; break; }
        }
        b.path = this._findPathLocal(W, from, W.nearestWaypoint(pt.x, pt.z), b._banNodes);
      } else b.path = W.findPath(W.nearestWaypoint(b.pos.x, b.pos.z), W.nearestWaypoint(pt.x, pt.z));
      b.pathIdx = 1;
    }
    if (BOT_MOVE2 && b.path) {
      // avança o índice ao CHEGAR (raio 1,5 m, com while pra pular nós já ultrapassados) —
      // era 0.7 com `return`, então o bot perdia o frame inteiro e ficava pinicando no nó.
      let guard = 0;
      while (b.pathIdx < b.path.length - 1 && guard++ < 8) {
        const c = W.waypoints.nodes[b.path[b.pathIdx]];
        if (c && Math.hypot(c.x - b.pos.x, c.z - b.pos.z) < 1.5) b.pathIdx++; else break;
      }
    }
    const atEnd = !b.path || b.pathIdx >= b.path.length;
    let tx = pt.x, tz = pt.z;
    if (!atEnd) { const n = W.waypoints.nodes[b.path[Math.min(b.pathIdx, b.path.length - 1)]]; tx = n.x; tz = n.z; }
    const dx = tx - b.pos.x, dz = tz - b.pos.z, d = Math.hypot(dx, dz);
    if (!atEnd && d < (BOT_MOVE2 ? 0.35 : 0.7)) { b.pathIdx++; b._ctfMoving = 1; return; }
    /* MESMO RUMO SUAVIZADO DO ROAM (b._hdg — ver o comentário lá). O CTF é um caminho de
       movimento SEPARADO, então sem repetir aqui o dono continuaria vendo o zigzag no modo
       em que ele mais joga: trocar de nó teleportava o alvo de rotação, e a menos de 1,2 m
       do nó o atan2 de um vetor quase nulo vira 180° com meio passo. */
    if (b._hdg === undefined) b._hdg = Math.atan2(dx, dz);
    if (d > 1.2) {
      let hd = Math.atan2(dx, dz) - b._hdg;
      while (hd > Math.PI) hd -= Math.PI * 2; while (hd < -Math.PI) hd += Math.PI * 2;
      b._hdg += hd * Math.min(1, dt * 2.2);
    }
    let dy = (BOT_MOVE2 ? b._hdg : Math.atan2(dx, dz)) - b.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    const cturn = dy * Math.min(1, dt * 8);
    b.yaw += BOT_MOVE2 ? Math.max(-YAW_CAP * dt, Math.min(YAW_CAP * dt, cturn)) : cturn;
    const bSlow = this.world.slowAt && this.world.slowAt(b.pos.x, b.pos.z) ? 0.5 : 1;
    const px = b.pos.x, pz = b.pos.z;
    b.pos.x += Math.sin(b.yaw) * BOT_SPEED * bSlow * dt;
    b.pos.z += Math.cos(b.yaw) * BOT_SPEED * bSlow * dt;
    if (BOT_MOVE2 && this.time < (b._sideUntil || 0)) {   // deslize de destravamento (contínuo)
      b.pos.x += Math.cos(b.yaw) * (b._sideDir || 1) * BOT_SPEED * 0.95 * dt;
      b.pos.z += -Math.sin(b.yaw) * (b._sideDir || 1) * BOT_SPEED * 0.95 * dt;
    }
    this._collide(b.pos, 0.38);
    b._ctfMoving = 1;
    const moved = Math.hypot(b.pos.x - px, b.pos.z - pz);
    if (moved < BOT_SPEED * bSlow * dt * 0.35) {
      b._stuckT = (b._stuckT || 0) + dt;
      if (b._stuckT > (BOT_MOVE2 ? 0.35 : 0.5)) {
        b._stuckT = 0;
        if (BOT_MOVE2) {
          // era `b.yaw += ±(0.8-1.8)` — um SNAP de até 103° por frame, a cada 0,5 s: o bot
          // ficava rodopiando na quina. Agora bane o hop que ele não consegue transitar,
          // escolhe o LADO fisicamente mais livre (sonda com a física real) e contorna
          // deslizando, sem girar. O ban vem ANTES de zerar o path — senão não há o que banir.
          if (b.path && b.path.length) {
            (b._banNodes || (b._banNodes = new Set())).add(b.path[Math.min(b.pathIdx, b.path.length - 1)]);
            if (b._banNodes.size > 24) b._banNodes.clear();
          }
          const fy = this._freeYaw(b, 3.0);
          let fdy = fy - b.yaw; while (fdy > Math.PI) fdy -= Math.PI * 2; while (fdy < -Math.PI) fdy += Math.PI * 2;
          b._sideDir = fdy >= 0 ? 1 : -1;
          b._sideUntil = this.time + 0.5;
          b.repathAt = this.time + 0.25;
        } else { b.yaw += (Math.random() < 0.5 ? 1 : -1) * (0.8 + Math.random()); b.repathAt = 0; }
        b.path = null;
      }
    } else { b._stuckT = 0; b._stuckSide = 0; }
  }

  /* Esconder É limpar. Só pôr `hidden` deixava o innerHTML da partida anterior pendurado,
     e ele reaparecia inteiro no primeiro frame da próxima partida de CTF — antes de
     _updateCtfHud rodar — mostrando bandeiras de OUTRO mapa por um instante. */
  _hideCtfHud() {
    if (!this.el.ctfHud) return;
    this.el.ctfHud.classList.add('hidden');
    this.el.ctfHud.innerHTML = '';
  }

  _updateCtfHud() {
    if (!this.el.ctfHud) return;
    /* GUARDA DE MODO — defeito reportado pelo dono: "alguns mapas em round mostram as
       bandeiras no UI mesmo sem ter captura".

       O `#ctf-hud` nasce com `hidden` no index.astro e este método sempre fez
       `remove('hidden')` sem perguntar o modo. Como NÃO existia um único `add('hidden')`
       para este elemento em todo o repo (nem no dispose(), que esconde outros 12), a faixa
       ficava na tela para sempre depois da primeira partida de CTF: voltar ao menu e abrir
       uma partida de rounds SEM recarregar a página mostrava as bandeiras da partida
       anterior, com o HTML congelado. De quebra o seletor `#ctf-hud:not(.hidden) ~ #killfeed`
       (style.css) empurrava o killfeed 38 px pra baixo no modo errado.

       O `if (this.ctf)` do game.js:2011 protegia só a CRIAÇÃO das bandeiras (_initCTF), não
       a visibilidade do HUD — por isso o modo tem que ser checado aqui também. */
    if (!this.ctf || !this.ctfPts.length) { this._hideCtfHud(); return; }
    this.el.ctfHud.classList.remove('hidden');
    /* CONTRASTE DA FAIXA DE CAPTURA — DEFEITO 2 DO DONO ("a informação mais importante do
       modo com o contraste mais baixo do HUD"). Números medidos em tools/eval/ui-check.mjs
       (UI1), texto/objeto contra o fundo DO PRÓPRIO ELEMENTO composto sobre o pior fundo de
       cena desta base (areia do Piscinão RGB 214,196,164, style.css:420):
         trilho da barra × painel .................. 1,40:1   (WCAG 1.4.11 exige 3:1)
         preenchimento vermelho × trilho ........... 1,49:1
         preenchimento verde × trilho .............. 2,66:1
         separador "·" com opacity:.4 .............. 3,94:1   (WCAG 1.4.3 exige 4,5:1)
       A causa é a mesma nos três: TRANSPARÊNCIA. `opacity` de grupo apaga o texto E o
       contorno preto do --sh-hud junto (o contorno é o que segura a legibilidade do resto
       do HUD), e a barra é BACKGROUND — background não ganha contorno nenhum, então ela
       ficava com um trilho de branco a 14% sobre um painel a 55%: dois cinzas quase iguais.

       Correção:
       - separadores: cor explícita (--ink-300, 5,5:1 sobre o painel) em vez de opacity;
       - barra: poço ESCURO (preto .80 — era .55 quando a faixa tinha painel .92 atrás;
         o painel saiu a pedido do dono em 06/08 e o poço passou a compor direto sobre a
         cena: sobre a areia do Piscinão .55 dava vermelho×poço 2,23:1, .80 dá 4,72:1,
         medido na UI1) com fio claro de 1 px em volta. O fio resolve o
         limite do componente (4,97:1 contra o painel) e o poço escuro deixa a cor do time
         saltar (verde 11,2:1, vermelho 6,3:1) — com um trilho cinza-médio seria impossível
         atender aos DOIS limites ao mesmo tempo (fio claro × painel e preenchimento ×
         trilho puxam para lados opostos);
       - barra de 4 px de altura por 52 de largura -> 8 × 64: a WCAG não mede espessura, mas
         um traço de 4 px com 1,4:1 não existe pra ninguém. */
    const sep = (t) => `<span style="color:var(--ink-300)"> ${t} </span>`;
    this.el.ctfHud.innerHTML = this.ctfPts.map(p => {
      const col = p.owner ? this._teamColor(p.owner) : 'var(--ink-100)';
      const prog = Math.max(0, Math.min(1, p.prog || 0));
      // barra de captura na COR DO TIME que captura (Tribos=azul, P=vermelho, B=verde); sem
      // ninguém capturando mas já dominado, usa a cor do dono; senão transparente.
      const barCol = p.capTeam ? this._teamColor(p.capTeam) : (prog > 0 && p.owner ? this._teamColor(p.owner) : 'transparent');
      const bar = `<span style="display:inline-block;width:64px;height:8px;margin-left:6px;background:rgba(0,0,0,.80);border:1px solid rgba(233,241,243,.55);border-radius:2px;vertical-align:middle;overflow:hidden"><span style="display:block;height:100%;width:${(prog * 100) | 0}%;background:${barCol};transition:width .1s"></span></span>`;
      return `<span style="color:${col}">● ${p.label}</span>${bar}`;
    }).join(sep('·'))
      /* A bandeirinha NÃO pode ser o emoji 🚩: o glifo do emoji ignora o CSS `color` e
         renderiza vermelho sempre (reprovação do dono, 07/08: "as bandeirinhas têm que
         ser da cor do time e não vermelhas"). SVG inline com fill:currentColor herda a
         cor do <span> — a mesma _teamColor do resto do HUD. */
      + sep('—') + `<span style="color:${this._teamColor('E')}"><svg viewBox="0 0 12 12" width="11" height="11" style="vertical-align:-1px" aria-hidden="true"><path d="M2 1v10M2 1h8l-2.5 3L10 7H2z" fill="currentColor"/></svg> ${this.ctfCaps.E || 0}</span>`
      + sep('·') + `<span style="color:${this._teamColor('B')}"><svg viewBox="0 0 12 12" width="11" height="11" style="vertical-align:-1px" aria-hidden="true"><path d="M2 1v10M2 1h8l-2.5 3L10 7H2z" fill="currentColor"/></svg> ${this.ctfCaps.B || 0}</span>`;
  }

  /* ================= player physics ================= */
  /* COLISOR COM ROTAÇÃO (`ry`) — BUG-21, segunda e definitiva rodada.
     O defeito do dono: "o box do ônibus não deixa você andar perto e é como se fosse um
     quadrado, mas o ônibus está em diagonal". O motor só tinha AABB, então TODO prop girado
     bloqueava pelo retângulo circunscrito. A rodada anterior picou o ônibus em 18 AABBs e
     baixou a parede fantasma de 2,33 m para 0,68 m — meio passo, e ele continuou sentindo.
     Agora o teste roda no ESPAÇO LOCAL do prop e o erro é ZERO por construção.

     CUSTO: `_collide` roda para jogador e bots todo frame. Por isso o caminho girado é um
     RAMO, não o caso geral: colisor sem `ry` (a esmagadora maioria) continua fazendo
     exatamente as 6 comparações de antes. O `minX..maxZ` de um colisor girado continua
     preenchido com a AABB CONSERVADORA do mundo — ela é a rejeição barata aqui e mantém
     válido todo consumidor que só sabe ler AABB (`_freeSpot`, `blocked()` dos mapas que
     ainda não olham `ry`, `map-check`, `pickup-check`). Só quem passa pela rejeição paga
     o seno/cosseno, e os senos vêm precomputados do mapa. Medido no botsim (determinístico,
     60 s × 6 mapas): ver o commit desta correção. */
  _collide(pos, r) {
    for (const c of this.world.colliders) {
      const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
      const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
      const dx = pos.x - nx, dz = pos.z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r && pos.y + 1.5 > c.minY && pos.y + 0.3 < c.maxY) {
        if (c.ry) { this._collideRot(pos, r, c); continue; }
        if (d2 < 1e-8) { pos.x += r; continue; }
        const d = Math.sqrt(d2), push = (r - d) / d;
        pos.x += dx * push; pos.z += dz * push;
      }
    }
    const B = this.world.bounds;
    pos.x = Math.max(B.minX + r, Math.min(B.maxX - r, pos.x));
    pos.z = Math.max(B.minZ + r, Math.min(B.maxZ - r, pos.z));
  }
  /* Empurra `pos` para fora de um colisor GIRADO. Mesma matemática do caso AABB, só que em
     (lx, lz) — o eixo do prop. A convenção de mundo↔local é a do three (`rotation.y`):
       mundo = (lx·cos + lz·sin ,  −lx·sin + lz·cos)
       local = (wx·cos − wz·sin ,   wx·sin + wz·cos)
     e é a mesma que o occluder do prop usa, o que é justamente o ponto: colisão e bala
     passam a concordar sobre onde a lataria está. */
  _collideRot(pos, r, c) {
    const cs = c.cos, sn = c.sin;
    const wx = pos.x - c.cx, wz = pos.z - c.cz;
    const lx = wx * cs - wz * sn, lz = wx * sn + wz * cs;
    const qx = Math.max(-c.hx, Math.min(lx, c.hx)), qz = Math.max(-c.hz, Math.min(lz, c.hz));
    let ex = lx - qx, ez = lz - qz;
    const e2 = ex * ex + ez * ez;
    if (e2 >= r * r) return;                       // dentro da AABB, FORA da caixa real: livre
    if (e2 < 1e-8) {                               // dentro do prop: sai pela face local mais perto
      const dl = lx + c.hx, dr = c.hx - lx, db = lz + c.hz, df = c.hz - lz;
      const m = Math.min(dl, dr, db, df);
      if (m === dl) { ex = -(dl + r); ez = 0; } else if (m === dr) { ex = dr + r; ez = 0; }
      else if (m === db) { ex = 0; ez = -(db + r); } else { ex = 0; ez = df + r; }
    } else {
      const e = Math.sqrt(e2), push = (r - e) / e;
      ex *= push; ez *= push;
    }
    pos.x += ex * cs + ez * sn;
    pos.z += -ex * sn + ez * cs;
  }
  /* PONTO ANDÁVEL MAIS PRÓXIMO (usado pelo armário do spawn).
     Empurra (x,z) pra fora de qualquer colisor/limite usando a MESMA física do jogador —
     se o _collide não mexe no ponto, o jogador consegue ficar em pé nele; é essa a
     definição de "andável" aqui, e é a única que importa pra pegar arma.
     Roda só no _resetPositions (25 armas × 2 times = 50 chamadas por round), então iterar
     é barato. `r` um pouco maior que o raio do jogador (0,38) deixa folga pra ele encostar. */
  _freeSpot(x, z, r = 0.5) {
    // ponto DENTRO de um colisor: o _collide sozinho só sabe empurrar +x (dx=dz=0 → push
    // degenerado), o que daria um resultado imprevisível. Saímos antes pela face mais perto.
    for (const c of this.world.colliders) {
      if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ && 1.5 > c.minY && 0.3 < c.maxY) {
        const dl = x - c.minX, dr = c.maxX - x, db = z - c.minZ, df = c.maxZ - z;
        const m = Math.min(dl, dr, db, df);
        if (m === dl) x = c.minX - r; else if (m === dr) x = c.maxX + r;
        else if (m === db) z = c.minZ - r; else z = c.maxZ + r;
      }
    }
    const p = new THREE.Vector3(x, 0, z);
    for (let i = 0; i < 6; i++) {                 // colisores encostados exigem várias passadas
      const px = p.x, pz = p.z;
      this._collide(p, r);
      if (Math.abs(p.x - px) < 1e-4 && Math.abs(p.z - pz) < 1e-4) break;
    }
    return { x: p.x, z: p.z };
  }
  /* EXISTE CAMINHO RETO ANDÁVEL de (sx,sz) até (tx,tz)? Mesma física do jogador: _collide
     (colisores + bounds) e groundHeightAt pro degrau.
     ATENÇÃO — NÃO É CRITÉRIO DE ALCANCE, e por isso está DESLIGADO por padrão desde 08/2026
     (só roda com `?rackreta=1`, ver RACK_RETA em game.js:~176 e o uso em game.js:~1861).
     A crítica adversarial provou por flood-fill que reta limpa ⊄ alcançável: uma arma que
     exige contornar meio metro de colisor reprova aqui e é perfeitamente alcançável a pé.
     Usado como critério de colocação ele moveu 52 das 202 armas do armário e destruiu a
     fileira (vão de 7,53 m em loja_h B, centro do armário 3,72 m longe do spawn em
     praca_poderes P). A pergunta certa — "existe célula andável alcançada a partir do spawn a
     ≤ 1 m da arma?" — é respondida por flood-fill em tools/eval/pickup-check.mjs, fora do
     jogo. Mantido só pra reproduzir o A/B; não promova a padrão. */
  _retaAndavel(sx, sz, tx, tz, r = 0.42, degrau = 0.30) {
    const gh = (x, z) => (this.world.groundHeightAt ? this.world.groundHeightAt(x, z) : 0);
    const dx = tx - sx, dz = tz - sz, dist = Math.hypot(dx, dz);
    const n = Math.max(2, Math.ceil(dist / 0.25));   // amostra a cada 25 cm: menor que o raio do corpo
    let gPrev = gh(sx, sz);
    const p = new THREE.Vector3();
    for (let i = 1; i <= n; i++) {
      const t = i / n, px = sx + dx * t, pz = sz + dz * t;
      const g = gh(px, pz);
      if (Math.abs(g - gPrev) > degrau) return false;          // degrau alto: não se sobe andando
      gPrev = g;
      p.set(px, g, pz);
      this._collide(p, r);
      if (Math.abs(p.x - px) > 1e-3 || Math.abs(p.z - pz) > 1e-3) return false;   // bateu em algo
    }
    return true;
  }
  /* Quantos metros de chão ANDÁVEL existem a partir do spawn na direção `back`?
     É o que decide se o armário cabe todo atrás do spawn ou se uma fileira tem que ir pra
     frente. Antes esse número era assumido (3,25 m) — e em ferro_velho/loja_h ele é 2,1. */
  _walkDepth(cx, sz, back, max = 5.4) {
    let d = 0;
    for (let t = 0.4; t <= max + 1e-6; t += 0.4) {
      const s = this._freeSpot(cx, sz + back * t, 0.45);
      if (Math.abs(s.x - cx) > 0.05 || Math.abs(s.z - (sz + back * t)) > 0.05) break;
      d = t;
    }
    return d;
  }
  /* ================= FEEDBACK DE MORTE =================
     "Você morre olhando pro chão sem saber quem, de onde, com o quê" era o item mais grave da
     crítica: sem entender a causa, não há aprendizado — a morte vira azar. _noteHit registra
     todo tiro que ENCOSTA no jogador (chamado do disparo do bot); _deathFeedback usa o último
     registro pra (a) VIRAR a câmera do defunto na direção do assassino — killcam simples, sem
     segunda câmera nem replay, custo zero — e (b) montar o painel quem/arma/distância/costas
     dentro do overlay de respawn que já existia. ?killcam=0 desliga tudo. */
  _noteHit(by, weap, dmg, head, dist) {
    const p = this.player;
    // p - by (BUG-52): mesma convenção da câmera que _dmgArc — sem isso, rel saía 180°
    // fora e a frente virava "PELAS COSTAS" no HUD.
    let rel = Math.atan2(p.pos.x - by.pos.x, p.pos.z - by.pos.z) - p.yaw;
    while (rel > Math.PI) rel -= Math.PI * 2; while (rel < -Math.PI) rel += Math.PI * 2;
    p._lifeDmg = (p._lifeDmg || 0) + dmg;
    // QUADRANTE em vez de só "frente/costas": o dono precisa saber PRA ONDE olhar da próxima
    // vez. `rel` é o ângulo do atirador relativo ao olhar (0 = na cara, +π/2 = à direita).
    const q = Math.abs(rel) < Math.PI / 4 ? 'DA SUA FRENTE'
      : Math.abs(rel) > 3 * Math.PI / 4 ? '⚠ PELAS COSTAS'
      : rel > 0 ? 'DA SUA DIREITA' : 'DA SUA ESQUERDA';
    this._lastHit = {
      at: this.time, name: by.name || 'INIMIGO', tier: by.tier, weap, dmg, head, dist,
      behind: Math.abs(rel) < Math.PI / 2, quad: q, pos: by.pos.clone(), total: p._lifeDmg,
    };
  }
  _deathFeedback(dt) {
    const h = this._lastHit;
    // só o dano que REALMENTE matou: registro velho (>6s) é de outra vida/outro contexto —
    // apontar a câmera pra um sujeito que não te matou seria pior que não apontar nada.
    if (!h || this.time - h.at > 6 || QS.get('killcam') === '0') return;
    if (!this._deathPanel && this.el.respawn) {
      /* BUG DO DONO ("tem 2 me eliminando, está confuso" — print /root/iss/16.59.51.jpg, com
         TRÊS blocos 'MORTO POR' empilhados, de três assassinos diferentes).
         Causa: `#respawn-overlay` é um nó do DOM que vive no index.astro e SOBREVIVE à
         partida; `this._deathPanel` é um campo da INSTÂNCIA de Game. Toda revanche/nova
         partida cria um Game novo, que não encontra o seu próprio painel (campo zerado),
         cria mais um <div class="death-info"> e o pendura no MESMO overlay. Os painéis das
         partidas anteriores ficam lá, congelados no último "MORTO POR" delas — e o jogador
         lê três assassinos para uma morte só. Não era dano duplicado nem evento duplo: era
         lixo de DOM entre partidas. A varredura abaixo remove qualquer painel órfão antes
         de criar o desta partida. */
      for (const old of Array.from(this.el.respawn.querySelectorAll?.('.death-info') || [])) old.remove();
      const d = document.createElement('div');
      d.className = 'death-info';
      d.style.cssText = 'margin-top:10px;font:600 13px/1.55 system-ui,sans-serif;letter-spacing:.05em;color:#ffd9a0;text-shadow:0 2px 8px #000;text-align:center';
      this.el.respawn.appendChild(d);
      this._deathPanel = d;
    }
    if (this._deathPanel && this._deathShown !== h.at) {
      this._deathShown = h.at;
      const tier = { ruim: 'PERNA DE PAU', medio: 'MEDIANO', bom: 'BOM', muitobom: 'MONSTRO' }[h.tier] || '';
      this._deathPanel.innerHTML =
        `<div style="font-size:15px;color:#fff">MORTO POR <b>${h.name}</b>${tier ? ` <span style="opacity:.65;font-size:11px">(${tier})</span>` : ''}</div>` +
        `<div>${h.weap} · ${h.dist.toFixed(0)} m · ${h.head ? 'NA CABEÇA' : h.dmg + ' de dano'}</div>` +
        `<div style="opacity:.75;font-size:11px">veio ${h.quad || (h.behind ? '⚠ PELAS COSTAS' : 'DA SUA FRENTE')} · ${Math.round(h.total)} de dano nesta vida</div>`;
    }
    // killcam: a cabeça do defunto vira pro assassino (2 rad/s) — mostra a linha de tiro que
    // te pegou. Sem corte de câmera: continua a mesma, então nada de FX/pós muda.
    if (h.pos) {
      const c = this.camera, dx = h.pos.x - c.position.x, dz = h.pos.z - c.position.z;
      const dist = Math.hypot(dx, dz) || 1;
      let dy = Math.atan2(-dx, -dz) - c.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      c.rotation.y += dy * Math.min(1, dt * 3.5);
      const wantPitch = Math.atan2((h.pos.y + 1.4) - c.position.y, dist);
      c.rotation.x += (wantPitch - c.rotation.x) * Math.min(1, dt * 3.5);
    }
  }
  _updateReplayCam(dt) {
    const rc = this._replayCam;
    if (!rc) return;
    rc.t += dt;
    if (rc.t >= REPLAY_DUR) {
      this._replayCam = null;
      const p = this.player;
      const tFov = p.scoped ? this._zoomFov(p.weapon) : 70;
      this.camera.fov = tFov;
      this.camera.updateProjectionMatrix();
      this._fovFrom = undefined;
      return;
    }
    const progress = rc.t / REPLAY_DUR;
    const angle = rc.killerYaw + Math.PI + progress * 1.2;
    const ease = 1 - (1 - progress) * (1 - progress);
    const r = REPLAY_ORBIT_R * (0.6 + 0.4 * ease);
    const cx = rc.victimPos.x + Math.sin(angle) * r;
    const cz = rc.victimPos.z + Math.cos(angle) * r;
    const cy = rc.victimPos.y + REPLAY_ORBIT_H - ease * 0.4;
    this.camera.position.set(cx, cy, cz);
    const lookY = rc.victimPos.y + 1.2;
    const dx = rc.victimPos.x - cx, dz = rc.victimPos.z - cz;
    this.camera.rotation.set(
      Math.atan2(lookY - cy, Math.hypot(dx, dz)),
      Math.atan2(-dx, -dz),
      0
    );
    this.camera.fov = 50;
    this.camera.updateProjectionMatrix();
    if (this.vm?.root) this.vm.root.visible = false;
    if (this.el.crosshair) this.el.crosshair.style.display = 'none';
  }
  // Cicla 1ª → 3ª (longe) → ombro (perto, vê braços) → 1ª (tecla B). Constrói o corpo
  // 3ª pessoa na 1ª vez (lazy).
  _toggleCamView() {
    // first = 1ª pessoa (só-arma, padrão do jogo) · third = OTS SOCOM (cintura pra cima) ·
    // shoulder = OTS colado (vê a arma de perto). A 1ª-pessoa-com-corpo (fpbody) foi removida.
    const order = ['first', 'third', 'shoulder'];
    this.camView = order[(order.indexOf(this.camView) + 1) % order.length];
    if (this.camView !== 'first') this._ensurePlayerTP();
    this._syncCamViewVis();
  }

  // Visibilidade base ao alternar: corpo TP em qualquer modo 3ª pessoa. Os braços FP são
  // governados por frame no _updatePlayer, pra não brigar com o force-visible do ADS.
  _syncCamViewVis() {
    const tp = this.camView !== 'first';
    if (this.playerTP && this.playerTP.group) this.playerTP.group.visible = tp;
    if (this.vm && this.vm.root && !tp) this.vm.root.visible = true;
  }

  // (Re)constrói o corpo TP com a arma ATUAL na mão, pelo mesmo caminho dos bots. Sem GLB
  // ainda, cai no box e faz upgrade quando o asset chegar. Ver docs/RIG-PEGA-ARMA.md.
  _ensurePlayerTP() {
    const w = this.player.weapon, def = this.playerDef;
    const weaponChanged = this.playerTP && this._tpWeapon !== w;
    const wantUpgrade = this.playerTP && !this.playerTP.isGLB && hasModel(def.id);
    if (this.playerTP && !weaponChanged && !wantUpgrade) return;
    // Tenta o GLB (grip real). Se ainda não carregou e já temos algo, mantém o atual —
    // evita reconstruir o box a cada frame enquanto os clips não chegam.
    const glb = buildCharacterModel(def, { weaponId: w });
    if (!glb && this.playerTP && !weaponChanged) return;
    if (this.playerTP && this.playerTP.group) {
      this.scene.remove(this.playerTP.group);
      if (!this.playerTP.isGLB) this.playerTP.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
    const tp = glb || buildCharacter(def);
    // O corpo do próprio jogador nunca é alvo/obstáculo de raycast (o hitscan mira só os
    // grupos dos bots, mas marcamos por garantia — mesmo contrato do gun mount).
    tp.group.traverse(o => { o.userData.noHit = true; o.userData.selfBody = true; });
    tp.group.visible = (this.camView === 'third');
    this.scene.add(tp.group);
    this.playerTP = tp;
    this._tpWeapon = w;
  }

  // Anima o corpo TP a partir do estado do jogador e põe a câmera atrás dele.
  // `sp` = velocidade horizontal real; `eye` = altura do olho já com crouch/dip.
  _updatePlayerTP(dt, sp, eye) {
    this._ensurePlayerTP();
    const tp = this.playerTP, p = this.player;
    if (!tp) return;
    // corpo: posição + yaw do jogador (mesma convenção dos bots: rotation.y = yaw).
    tp.group.visible = true;
    tp.group.position.copy(p.pos);
    tp.group.rotation.set(0, p.yaw + Math.PI, 0);   // +180°: o corpo olha pra onde a câmera olha (de costas p/ ela)
    // animação: locomoção pela velocidade + agachado + mira da cabeça pelo pitch.
    if (tp.ctrl) {
      tp.ctrl.setCrouch?.(p.crouchF > 0.5);
      tp.ctrl.aimPitch = p.pitch;
      tp.ctrl.update(dt, sp > 0.6 ? 1 : 0, false, sp, false);
    } else if (tp.mixer) {
      tp.mixer.update(dt);
    }
    this._tpEul.set(p.pitch, p.yaw, 0, 'YXZ');
    const fwd = this._tpFwd.set(0, 0, -1).applyEuler(this._tpEul);
    const right = this._tpRight.set(1, 0, 0).applyEuler(this._tpEul);
    const cam = this.camera;
    // 'third' = over-the-shoulder perto, cintura pra cima (estilo SOCOM): ~1,7 m atrás,
    // ~1,8 m de altura olhando reto → pernas caem fora. 'shoulder' = mais colado ainda.
    const shoulder = this.camView === 'shoulder';
    const TP_DIST = shoulder ? 0.85 : 1.7;
    const TP_UP = shoulder ? 0.10 : 0.18;
    const TP_SIDE = shoulder ? 0.34 : 0.28;
    cam.position.set(p.pos.x, p.pos.y + eye, p.pos.z).addScaledVector(fwd, -TP_DIST).addScaledVector(right, TP_SIDE);
    cam.position.y += TP_UP;
    const gy = this.world.groundHeightAt(cam.position.x, cam.position.z, cam.position.y) + 0.2;
    if (cam.position.y < gy) cam.position.y = gy;   // não atravessa o chão
    cam.rotation.set(p.pitch, p.yaw, 0);
  }

  // Morte em 3ª pessoa (e também visível na 1ª, na câmera de morte): toca a animação de
  // queda no corpo TP e o mantém caindo. Sem isto o boneco ficava de pé (bug relatado).
  _tpDeath(dt) {
    this._ensurePlayerTP();
    const tp = this.playerTP, p = this.player;
    if (!tp) return;
    if (!this._tpDead) {
      this._tpDead = true;
      tp.group.visible = true;                        // mostra o corpo caindo mesmo em 1ª pessoa
      tp.group.position.copy(p.pos);
      tp.group.rotation.set(0, p.yaw + Math.PI, 0);
      if (tp.ctrl && tp.ctrl.die) tp.ctrl.die();
    }
    if (tp.ctrl) tp.ctrl.update(dt, 0, false, 0, false);
    else if (tp.mixer) tp.mixer.update(dt);
  }

  /* Desarma o _tpDeath no respawn. No online o respawn vem por SNAPSHOT e não passa pelo
     _respawnPlayer — sem esta reversão o corpo TP ficava DEITADO pra sempre, arrastado pelo
     mundo (BUG-86, KNOWN-BUGS.md). Chamado pelo _respawnPlayer (SP) e pelo netgame (MP). */
  _tpRevive() {
    this._tpDead = false;
    const tp = this.playerTP;
    if (!tp) return;
    if (tp.ctrl && tp.ctrl.revive) tp.ctrl.revive();
    if (tp.group) {
      tp.group.visible = this.camView !== 'first';
      tp.group.rotation.set(0, this.player.yaw + Math.PI, 0);
    }
  }

  /* Física do corpo do jogador. O servidor aplica ESTA função ao slot remoto — duas
     implementações divergiriam e o jogo viveria em rubber-band. Ver docs/MULTIPLAYER.md. */
  _moveEntity(p, inp, dt) {
    // Crouch (CTRL/C) vale NO AR também, e a transição é assimétrica como no CS2.
    // Números e motivo: docs/MULTIPLAYER.md.
    const wantCrouch = !!inp.crouch;
    p.crouchF = Math.max(0, Math.min(1, p.crouchF + (wantCrouch ? dt * 7 : -dt * (MOVE2 ? 4.2 : 7))));
    const walking = MOVE2 && !!inp.shift;   // Shift = ANDAR (silencioso)
    const sprint = !MOVE2 && !!inp.shift && p.crouchF < 0.3;
    const slowMul = this.world.slowAt && this.world.slowAt(p.pos.x, p.pos.z) ? 0.45 : 1;  // água/lago
    // velocidade base × ARMA (MOVE_MUL) × andar × ADS × agachado × água
    const wpnMul = MOVE2 ? (MOVE_MUL[p.weapon] !== undefined ? MOVE_MUL[p.weapon] : 0.9) : 1;
    const maxSp = MOVE2
      // crouch só freia NO CHÃO: crouch-jump não deve perder velocidade no ar (CS)
      ? PLAYER_SPEED * wpnMul * (walking ? WALK_MUL : 1) * (p.scoped ? 0.55 : 1) * (1 - 0.48 * p.crouchF * (p.grounded ? 1 : 0)) * slowMul
      : (sprint && slowMul === 1 ? 6.6 : 4.7) * (p.scoped ? 0.5 : 1) * (1 - 0.5 * p.crouchF) * slowMul;
    let ix = inp.ax, iz = inp.az;
    const il = Math.hypot(ix, iz) || 1; ix /= il; iz /= il;
    const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
    // camera: forward = (-sin, -cos), right = (cos, -sin)  →  wish = right*ix + forward*(-iz)
    const wx = ix * cos + iz * sin, wz = -ix * sin + iz * cos;
    // CoD tuning (port tuning.js): chão 92 m/s² (velocidade cheia em ~50ms = "tight");
    // ar = 25% de autoridade e NÃO ganha velocidade além da que saiu do chão (cap).
    // `__mutAccel`: gancho da movimento-golden. Sem ele o `--mutar=n` era setado e nunca
    // lido, e a régua passava verde com a física mudada. Zero em produção.
    const accel = (p.grounded ? 92 : 23) + (this.__mutAccel || 0);
    const spBefore = Math.hypot(p.vel.x, p.vel.z);
    p.vel.x += wx * accel * dt; p.vel.z += wz * accel * dt;
    if (!p.grounded) {
      const spAir = Math.hypot(p.vel.x, p.vel.z);
      const cap = Math.max(spBefore, MOVE2 ? PLAYER_SPEED * wpnMul : 4.7);
      if (spAir > cap) { p.vel.x *= cap / spAir; p.vel.z *= cap / spAir; }
    }
    if (p.grounded) {
      // friction applied ALWAYS (smooth controlled stop), stronger with no input
      const f = Math.max(0, 1 - (ix || iz ? 7 : 11) * dt);
      p.vel.x *= f; p.vel.z *= f;
      // COUNTER-STRAFE (CS): apertar a direção OPOSTA à do movimento mata a inércia em
      // ~110ms, em vez dos ~330ms do atrito sozinho. É o que permite parar-atirar-andar sem
      // esperar a "derrapada" — sem isto o duelo em movimento é loteria e o jogador não tem
      // como se estabilizar de propósito. Só a componente CONTRÁRIA é freada (a lateral
      // continua fluida, senão o strafe fica travado).
      if (MOVE2 && (ix || iz)) {
        const dot = p.vel.x * wx + p.vel.z * wz;
        if (dot < 0) {
          const kill = Math.min(1, 15 * dt);
          p.vel.x -= wx * dot * kill; p.vel.z -= wz * dot * kill;
        }
      }
    }
    const sp = Math.hypot(p.vel.x, p.vel.z);
    if (sp > maxSp) { p.vel.x *= maxSp / sp; p.vel.z *= maxSp / sp; }
    // Shift silencioso: gate global do sfx.step (instalado no constructor) + ninguém escuta.
    this.sfx._quiet = MOVE2 && walking && sp < PLAYER_SPEED * wpnMul * (WALK_MUL + 0.06);
    // jump: coyote time (90ms) + jump buffer (130ms) — tuning CoD/MW: pular logo depois de
    // sair da borda ou logo antes de tocar o chão ainda funciona (feel moderno, zero risco)
    p.coyoteUntil = p.grounded ? this.time + 0.09 : (p.coyoteUntil || 0);
    if (inp.jump && !p._spaceHeld) p.jumpBufferedUntil = this.time + 0.13;
    p._spaceHeld = !!inp.jump;
    if ((p.jumpBufferedUntil || 0) > this.time && this.time < (p.coyoteUntil || 0) && this._acceptInput()) {
      p.vel.y = 5.0; p.grounded = false; p.jumpBufferedUntil = 0; p.coyoteUntil = 0; this.sfx.jump();   // apex ~0.61m (CoD)
    }
    p.vel.y -= 20.6 * dt;   // gravidade exagerada do CoD — arco de pulo "snappy", não flutuante
    // integrate with step-limit so platform fronts block
    /* CHÃO MULTINÍVEL: o 3º argumento é o Y de quem pergunta. Onde há mais de uma
       superfície no mesmo (x,z) — hoje o vão embaixo das escadas da Havan — o mapa devolve
       a camada que ESTE corpo alcança de um passo, em vez do topo sempre. Mapa que não
       implementa camadas ignora o argumento e nada muda. Ver map_havan.js/groundHeightAt. */
    const oldG = this.world.groundHeightAt(p.pos.x, p.pos.z, p.pos.y);
    // STEP-UP CONFIÁVEL: degrau até STEP_H sobe no MESMO frame, sem perder velocidade (antes
    // o corpo só era realinhado no snap de gravidade do frame seguinte — subir meio-fio/degrau
    // "engasgava"). Acima disso é parede: além de bloquear, ZERA a velocidade daquele eixo,
    // senão o jogador segue acelerando contra o degrau e a arma treme parada no obstáculo.
    const STEP_H = 0.55;
    const tryAxis = (dx, dz, ax) => {
      const nx = p.pos.x + dx, nz = p.pos.z + dz;
      const g = this.world.groundHeightAt(nx, nz, p.pos.y);
      const rise = g - oldG;
      if (rise > STEP_H && p.pos.y < g - 0.2) { if (MOVE2) { if (ax) p.vel.z = 0; else p.vel.x = 0; } return; } // wall-like step
      p.pos.x = nx; p.pos.z = nz;
      if (MOVE2 && p.grounded && rise > 0.02 && rise <= STEP_H && p.pos.y < g) { p.pos.y = g; if (p.vel.y < 0) p.vel.y = 0; }
    };
    tryAxis(p.vel.x * dt, 0, 0); tryAxis(0, p.vel.z * dt, 1);
    this._collide(p.pos, 0.38);
    p.pos.y += p.vel.y * dt;
    const g2 = this.world.groundHeightAt(p.pos.x, p.pos.z, p.pos.y);
    if (p.pos.y <= g2) {
      if (!p.grounded && p.vel.y < -4) { this.sfx.land(); p.landDip = Math.min(1, -p.vel.y / 14); } // landing dip, sized by impact
      p.pos.y = g2; p.vel.y = 0; p.grounded = true;
    } else if (p.pos.y > g2 + 0.05) p.grounded = false;
    return { sp, walking, sprint };
  }


  _updatePlayer(dt) {
    const p = this.player;
    this._checkCtfAlvo();          // alvo de BANDEIRAS: única condição de vitória da rodada de CAPTURA (sem gate)
    if (PACE) this._checkPace();   // alvo de abates / match point — vale também com o jogador morto
    if (!p.alive) {
      if (this._replayCam) this._replayCam = null;
      const left = p.respawnAt - this.time;
      this.el.respawnCount.textContent = Math.max(0, left).toFixed(1);
      this._deathFeedback(dt);
      this._tpDeath(dt);   // corpo TP cai (item: "boneco não caía morto")
      if (left <= 0) this._respawnPlayer();
      this.camera.position.y = Math.max(0.5, this.camera.position.y - dt * 2);
      this.camera.rotation.z = Math.min(0.5, (this.camera.rotation.z || 0) + dt * 0.8);
      return;
    }
    if (this.mobile && this.state === 'live') this._aimAssist(dt);

    // REGEN fora de combate (ver comentário da constante). Detecta o dano pela QUEDA do hp —
    // o _damage fica fora desta região de edição, então não dá pra marcar o timestamp lá.
    if (p.hp < (p._lastHp === undefined ? 100 : p._lastHp)) p._hurtAt = this.time;
    p._lastHp = p.hp;
    if (REGEN && p.hp > 0 && p.hp < 100 && this.time - (p._hurtAt || -99) > REGEN_DELAY)
      p.hp = Math.min(100, p.hp + dt * REGEN_RATE);
    // Teclado/toque -> input abstrato: o MESMO formato que trafega pela rede no multiplayer
    // e que o servidor aplica ao slot remoto (ver _moveEntity).
    let _ax = (this.keys.KeyD ? 1 : 0) - (this.keys.KeyA ? 1 : 0);
    let _az = (this.keys.KeyS ? 1 : 0) - (this.keys.KeyW ? 1 : 0);
    if (this.touchMove && (this.touchMove.x || this.touchMove.z)) { _ax = this.touchMove.x; _az = this.touchMove.z; }
    const _inp = {
      ax: _ax, az: _az,
      crouch: !!(this.keys.ControlLeft || this.keys.ControlRight || this.keys.KeyC),
      shift: !!(this.keys.ShiftLeft || this.keys.ShiftRight),
      jump: !!this.keys.Space,
    };
    const { sp, walking, sprint } = this._moveEntity(p, _inp, dt);
    /* O movimento acima já aconteceu na tela (predição). Aqui o netcode reconcilia e manda o
       input pro servidor, que roda esta MESMA função. */
    if (this.online) this._mp?.stepPlayer(p, _inp);
    // auto-fire (ak/m4/mp5) enquanto o botão está segurado
    if (WEAPONS[p.weapon].auto && this.mouseDown0 && p.alive) this._tryShoot();
    this.bloom = Math.max(0, (this.bloom || 0) - dt * 1.8);
    // camera: crouch drop + landing dip (decays) + recoil recovery (decays) + speed bob
    p.landDip = (p.landDip || 0) + (0 - (p.landDip || 0)) * Math.min(1, dt * 7);
    // Camera punch (R7.6): a recuperação antiga (0.55/s + 3.5×recoilP) zerava o punch em
    // 1 frame (0.008 - 0.0092 < 0 — medido recoilP=0 em rajada inteira). Nova curva:
    // base 0.06/s + 2.0×recoilP → punch visível ~5-8 frames (~120ms), recupera SEMPRE
    // (termo proporcional limita o acúmulo da rajada — sobe um pouco e volta, não escala).
    p.recoilP = Math.max(0, (p.recoilP || 0) - dt * (0.06 + (p.recoilP || 0) * 2.0));
    const eye = 1.62 - 0.52 * p.crouchF - p.landDip * 0.09;
    // HEADBOB da CÂMERA (não existia: só o viewmodel balançava, então correr não tinha peso).
    // Calibrado SUTIL — 1.3cm vertical / 0.9cm lateral no talo, travado na cadência do passo
    // (stepPhase, o mesmo que dispara o som) e zerado parado/no ar. Andando silencioso cai
    // pela metade. ?bob=0 desliga; quality 'low' usa 60% (menos jitter em tela de notebook).
    let camBobY = 0, camBobLat = 0;
    if (MOVE2 && QS.get('bob') !== '0' && p.grounded) {
      const amp = Math.min(1, sp / (PLAYER_SPEED * 0.9)) * (walking ? 0.5 : 1) * (this.settings.quality === 'low' ? 0.6 : 1);
      camBobY = Math.sin(p.stepPhase * 2) * 0.013 * amp;
      camBobLat = Math.sin(p.stepPhase) * 0.009 * amp;
    }
    this.camera.position.set(p.pos.x + Math.cos(p.yaw) * camBobLat, p.pos.y + eye + camBobY, p.pos.z - Math.sin(p.yaw) * camBobLat);
    const rp = p.recoilP;   // getter lido 1x: integra/decai o spring do recuo neste frame
    // Roll por tiro na freq. 61 (o pitch usa 78): lê como "tremida", não como punch puro.
    const roll = p._rec ? p._rec.sh * Math.sin(this.time * 61) * 0.5 : 0;
    this.camera.rotation.set(p.pitch + rp, p.yaw, roll);
    this._eyeWorld.copy(this.camera.position);   // olho: origem de tiro/fumaça em 3ª pessoa
    // 3ª pessoa (longe/ombro): sobrepõe a câmera e anima o corpo TP. No-op na 1ª pessoa.
    if (this.camView !== 'first') this._updatePlayerTP(dt, sp, eye);
    // footsteps + view bob
    const moving = sp > 0.6 && p.grounded;
    if (moving) {
      p.stepPhase += dt * sp * 1.6;
      const prev = Math.sin(p.stepPhase - dt * sp * 1.6), now = Math.sin(p.stepPhase);
      if (prev >= 0 && now < 0) this.sfx.step(this.world.slowAt && this.world.slowAt(p.pos.x, p.pos.z) ? 'water' : 'concrete');
    }
    // Aim: real scopes (AWP / Mosin / Rem700) hide the gun and show the scope overlay.
    // Every other weapon does light iron-sight ADS — the gun stays on screen and the
    // crosshair stays visible so you can see exactly where you're aiming.
    const realScope = p.scoped && !!WEAPONS[p.weapon].scope;
    const tFov = p.scoped ? this._zoomFov(p.weapon) : (sprint && moving ? 76 : 70);
    // ZOOM EM <=120 ms (G3-R1): era um lerp exponencial dt*16 (~63% em 62 ms, mas ~250 ms pra
    // fechar) — a luneta ficava meio-caminho e a tela sem arma, sem mira e sem luneta. Agora é
    // rampa de DURAÇÃO FIXA sobre a distância que falta, então o ADS fecha sempre no mesmo
    // tempo, em qualquer FPS. ADS_T é o contrato: entrar e sair custam o mesmo.
    if (Math.abs(this.camera.fov - tFov) > 0.05) {
      const ADS_T = 0.11;
      const f0 = (this._fovFrom === undefined || this._fovTo !== tFov) ? this.camera.fov : this._fovFrom;
      this._fovFrom = f0; this._fovTo = tFov;
      const stepFov = Math.abs(f0 - tFov) * (dt / ADS_T);
      this.camera.fov += Math.sign(tFov - this.camera.fov) * Math.min(stepFov, Math.abs(tFov - this.camera.fov));
      this.camera.updateProjectionMatrix();
    } else { this._fovFrom = undefined; this._fovTo = tFov; }
    // LUNETA (G3-R1 — conserto da "faixa preta"). A máscara é um overlay circular de borda
    // escura cuja opacidade acompanha o progresso do zoom (smoothstep). O que quebrava antes
    // não era a máscara e sim a ORDEM: arma e crosshair sumiam no frame do clique, enquanto a
    // luneta ainda estava transparente -> alguns frames com a tela mascarada e NADA visível
    // ("não se vê a arma nem a mira"). Agora a arma só some quando a luneta já cobre (>0.55) e
    // a crosshair só some quando ela está praticamente opaca (>0.88): em nenhum frame da
    // transição o jogador fica sem referência de mira.
    // progresso da mirada por FOV (0 = quadril, 1 = totalmente mirado) — única fonte pro
    // spread (_tryShoot) e pra sensibilidade do mouse: vale pra iron-sight E pra luneta.
    {
      const z1 = this._zoomFov(p.weapon);
      this._aimF = z1 >= 70 ? 0 : Math.min(1, Math.max(0, (70 - this.camera.fov) / (70 - z1)));
    }
    let mask = 0;
    if (realScope) {
      const zf = Math.min(1, Math.max(0, (70 - this.camera.fov) / (70 - this._zoomFov(p.weapon))));
      mask = zf * zf * (3 - 2 * zf);
      this.el.scope.style.opacity = mask.toFixed(3);
    } else if (this.el.scope.style.opacity) this.el.scope.style.opacity = '';
    this._scopeMask = mask;
    this.el.crosshair.style.display = mask > 0.88 ? 'none' : 'block';
    // crosshair fina de precisão no ADS: a arma NÃO desliza pra fora, então o gatilho é o
    // próprio progresso do ADS (a mira afina junto com a arma subindo).
    const precAds = (this.vm.adsF || 0) > 0.6;
    this.el.crosshair.classList.toggle('prec', precAds);
    // dynamic crosshair gap (movement/spray opens it, crouch + ADS tighten it)
    const gap = precAds ? 3 : Math.max(3, Math.min(26, 5 + sp * 1.15 + this.vm.kick * 20 - p.crouchF * 2.5 - (p.scoped ? 4 : 0)));
    this.el.crosshair.style.setProperty('--ch', gap.toFixed(1) + 'px');
    // 3ª pessoa esconde os braços/arma FP (o corpo TP tem a própria arma na mão).
    this.vm.root.visible = this.camView === 'first' && !(realScope && mask > 0.55);   // a arma só sai de cena depois que a luneta cobre
    // reload completion — RELÓGIO DE JOGO (devolve a munição). A ANIMAÇÃO é do rig e usa a
    // mesma duração da tabela, então as duas pontas chegam no mesmo quadro (BUG-04).
    if (!this._reloading() && p.reloadUntil > 0) {
      p.reloadUntil = 0;
      const inf = this._municaoInfinita();   // modo de arma única: ver _municaoInfinita()
      for (const k of Object.keys(p.ammo)) {
        const am = p.ammo[k], wm = WEAPONS[k].mag;
        if (am.mag < wm && am.res > 0) { const need = wm - am.mag, take = Math.min(need, am.res); am.mag += take; am.res -= take; }
        // depois de servir o pente, não antes: portão de recarga, HUD e `util` do bot
        // seguem lendo número normal e nenhum precisa saber que existe modo infinito.
        if (inf) am.res = WEAPONS[k].reserve;
      }
      this.el.reloadNote.classList.add('hidden');
      this.sfx.reloadEnd();
    }
    // view model animation — recoil via RecoilAxis (spring snappy + residual, port CoD:
    // sobe instantâneo, volta quase tudo, settle lento; era decaimento linear dt*11)
    this.vm.kick = this.vm.recoil.step(dt);
    const bobAmp = Math.min(1, sp / 6.6);
    // bob figure-eight (Lissajous 1:2 travado na cadência dos passos, port CoD)
    const bobY = moving ? Math.sin(p.stepPhase * 2) * 0.010 * bobAmp : 0;
    const bobX = moving ? Math.sin(p.stepPhase) * 0.008 * bobAmp : 0;
    // Enquadramento derivado: só recalcula quando o ASPECTO da tela muda (redimensionar a
    // janela / entrar em fullscreen). Custo zero no frame comum — sai no 1º `if`.
    if (this._vmFrame) this._vmFrame(false);
    // iron-sight ADS: ease the gun toward screen center so you sight down it.
    // G3-R1: mesma rampa de duração fixa do FOV (ADS_T=0.11 s) — arma e zoom chegam JUNTOS.
    // O lerp dt*12 antigo levava ~250 ms e deixava a arma atrasada em relação ao zoom.
    const adsWant = p.scoped && !realScope ? 1 : 0;
    {
      const cur = this.vm.adsF || 0;
      const stp = dt / 0.11;
      this.vm.adsF = adsWant > cur ? Math.min(adsWant, cur + stp) : Math.max(adsWant, cur - stp);
    }
    const a0 = this.vm.adsF;
    const a = a0 * a0 * (3 - 2 * a0);   // smoothstep: entra sem estalo, sem overshoot
    /* ===== RIG PROCEDURAL DO VIEWMODEL (BUG-04) =====
       `rg.pos`/`rg.rot` são OFFSETS somados ao enquadramento — nunca posição absoluta —, e
       valem ZERO em repouso. É isso que deixa o enquadramento medido (VM1/VM5/VM9/VM12/…)
       intacto: o auditor projeta o quadro parado, e parado o rig não desloca nada.
       SWAY vem do giro REAL do quadro (Δyaw/Δpitch em rad), não do `movementX` cru que os
       dois acumuladores `_swayX/_swayY` guardavam: aquilo dependia de DPI do mouse e de
       framerate (decaimento `1 - dt*7`) e ignorava a sensibilidade, então a arma balançava
       diferente em cada máquina. O sinal foi conferido contra o comportamento antigo —
       mouse pra direita continua levando a arma pra direita, mouse pra baixo pra cima.
       `lookDY` é positivo pra CIMA da tela, daí o `-`. */
    const dYaw = p.yaw - (this._vmYaw ?? p.yaw), dPit = p.pitch - (this._vmPit ?? p.pitch);
    this._vmYaw = p.yaw; this._vmPit = p.pitch;
    this.vm.rig.setAds(adsWant === 1);
    const rg = this.vm.rig.update(dt, {
      speed: sp, grounded: p.grounded !== false, crouch: p.crouchF > 0.5,
      lookDX: dYaw, lookDY: -dPit,
    });
    // POSE DE ADS (G3-R1). O delta vem MEDIDO por arma (vm.ads[id], calculado no
    // _vmFrame a partir da alça de mira do GLB) e leva a alça ao centro EXATO da tela — é
    // literalmente sight picture, não "arma deslizando pro canto".
    // ADS CONSISTENTE (dono: "simplicidade > realismo, o jogo tem que casar"): a detecção de
    // alça de mira por-arma (vm.ads[weapon]) era FRÁGIL — em várias GLBs a alça caía errada e a
    // pose virava -s.y grande, DERRUBANDO a arma pra baixo/fora ("miro e a arma aponta pra baixo,
    // não vejo mira"). Trocado por uma pose de mira por CLASSE, igual pra todas as armas: nudge
    // sutil pro centro + leve zoom, sempre legível, nunca some.
    const pose = this._adsPose[STATIC_CLASS[p.weapon]] || this._adsPose._hip;
    // draw animation: agora é o estado 'draw' do rig (ver _switchWeapon). `p.drawUntil`
    // continua sendo o que TRAVA o tiro — gameplay e animação seguem em variáveis separadas.
    // Kick mais PUNCHY (dono: "animação de tiro ruim"): recuo pra trás + salto pra cima + subida
    // do cano + um jolt lateral (roll/yaw) aleatório por tiro, escalado por arma (ver _tryShoot).
    // R1.d — KILL-SWITCH ?vmkick=<mult>. Multiplica em bloco os ganhos do kick do viewmodel
    // (posZ/posY/rotX/rotY/rotZ logo abaixo) para permitir A/B AO VIVO sem deploy:
    //   ?vmkick=0    desliga o coice cosmético (prova de que ele não move a mira)
    //   ?vmkick=1    padrão (ganhos calibrados de R1.a)
    //   ?vmkick=3.14 reproduz aproximadamente o coice antigo (0.22/0.07 = 3.14 em rotX)
    // Escala o `k` UMA vez em vez de repetir o fator em 5 termos: assim os ganhos continuam
    // literais no código (é deles que tools/eval/vm-kick-sim.mjs lê por regex) e o A/B não
    // pode dessincronizar um eixo do outro. Mesmo espírito do VM_KNOB (game.js:352), só que
    // resolvido na 1ª chamada e cacheado — o parse não pode entrar no loop de frame.
    // NÃO afeta a crosshair dinâmica nem o recuo de câmera: os dois leem outras fontes.
    if (this._vmKickQ === undefined) {
      const v = parseFloat(new URLSearchParams(location.search).get('vmkick'));
      this._vmKickQ = (isFinite(v) && v >= 0) ? Math.min(4, v) : 1;
    }
    const k = this.vm.kick * this._vmKickQ, ks = this.vm.kickSide || 0;
    // SWING da faca estilo CS (dono: "faca muito tímida"): varredura lateral + roll da lâmina + estocada.
    let swPz = 0, swRx = 0, swRy = 0, swRz = 0;
    if (this.vm.swingAt != null) {
      const st = (this.time - this.vm.swingAt) / 0.26;
      if (st < 1) { const e = Math.sin(st * Math.PI); swRy = -e * 0.6; swRz = e * 0.5; swRx = e * 0.28; swPz = e * 0.12; }
      else this.vm.swingAt = null;
    }
    // GANHOS DO KICK (R1.a — medidos com tools/eval/vm-kick-sim.mjs, não chutados).
    // Antes: posZ 0.15 / posY 0.045 / rotX 0.22 / rotY 0.05 / rotZ 0.06. Com k de rajada
    // chegando a ~1.4, rotX=0.22 dava 18,4° de pitch do viewmodel — 4× o que a própria
    // REC_DEG da arma declara (a AWP declara 4,9°) e ~5× o que CS2/Valorant fazem (2-4°).
    // E posZ=0.15 empurrava a coronha 0,20 m EM DIREÇÃO À LENTE, cruzando o near plane
    // (0.01 m) em 16 das 26 armas — a arma literalmente se abria ao meio na rajada.
    // Os ganhos abaixo mantêm a MESMA forma de curva (mesma mola, mesma assinatura por
    // arma), só reduzem a amplitude cosmética. Esta camada NÃO mexe na mira: o recuo de
    // câmera é _shotRecoil/_installRecoil e continua intocado.
    this.vm.root.position.set(VM_OFF[0] + pose.x * a + bobX + rg.pos.x, vmOffY((this.vmCamera && this.vmCamera.aspect) || this.camera.aspect) + bobY - p.crouchF * 0.02 + pose.y * a + k * 0.015 + rg.pos.y, VM_OFF[2] + k * 0.050 + pose.z * a - swPz + rg.pos.z);
    this.vm.root.rotation.x = k * 0.070 + pose.rx * a + swRx + rg.rot.x;   // subida do cano + ADS + golpe da faca + rig (recarga/saque/respiração)
    this.vm.root.rotation.y = ks * k * 0.018 + pose.ry * a + swRy + rg.rot.y;                            // yaw do coice/ADS + varredura da faca
    this.vm.root.rotation.z = ks * k * 0.022 + swRz + rg.rot.z;                                          // roll do coice + giro da lâmina + sway
    this.vm.root.scale.setScalar(1 - (1 - pose.s) * a);                                          // scale-down do VM em ADS
    /* ADS ZERA O PITCH/YAW PRÓPRIOS DA ARMA (RODADA DO GRIP + PITCH).
       O `_adsPose` acima gira o vm.root INTEIRO (rx/ry por classe) e não enxerga a
       inclinação que o `_vmFrame` deu ao GRUPO da arma. Com pitch de ~12° e o ADS entrando,
       a arma ficaria apontando pra cima na hora exata em que o jogador precisa da alça no
       eixo — o "miro e a arma aponta pra outro lugar" que o dono já reclamou uma vez. A
       rampa é `vmAdsRot` (declarada no topo do arquivo e coberta pela VM17), aplicada AQUI e
       não no _vmFrame porque o _vmFrame só roda quando o ASPECTO muda, e o ADS é por frame.
       O ROLL NÃO É ZERADO de propósito: girar em torno do eixo da câmera não desalinha a
       alça, e era assim antes desta rodada. */
    {
      const wg = this.vm.models && this.vm.models[p.weapon];
      const vr = this.vm.rot && this.vm.rot[p.weapon];
      if (wg && vr && vr.ads) wg.rotation.set(vmAdsRot(vr.pitch, a), vmAdsRot(vr.yaw, a), vr.roll);
    }
    // Braços reais: IK trava as mãos na arma visível DEPOIS de todos os transforms do
    // vm.root (kick/dip/ADS/sway/bob/draw) — as mãos acompanham a arma em qualquer estado.
    if (this.vm.arms && this.vm.root.visible) {
      const wg = this.vm.models[p.weapon];
      if (wg) poseToWeapon(this.vm.arms, wg, p.weapon);
    }
    if (VMLAB) this._vmlabFrame(p, a);   // ?vmlab=1: troca pelo viewmodel do editor (isolado)
    this._updateReplayCam(dt);
  }
  // piscina_treta ground weapons: anyone who runs over one grabs it (CS-1.6 style).
  // The gun vanishes and respawns after PICKUP_RESPAWN. No-op on maps without
  // pickups (e.g. praca_poderes). Called once per frame from update().
  _updatePickups() {
    const list = this.world.pickups || [];
    const p = this.player;
    /* QUAL ARMA O [E] PEGA — a segunda metade do bug do dono (print 20:38).
       O código antigo escolhia SÓ A MAIS PRÓXIMA num raio de 1,9 m. Com 25 armas em duas
       fileiras a 1,25 m uma da outra, a fileira da frente vencia a de trás em TODO ponto
       andável do mapa (medido: 0 de 12 armas da fileira 1 conseguiam prompt em
       ferro_velho P e loja_h P). E mesmo onde dava, o prompt pulava entre vizinhas a
       cada passo — "adivinhar posição", exatamente o que o dono descreveu.
       Agora quem manda é a MIRA: projetamos a crosshair no plano das armas (um raycast de
       plano, 3 multiplicações) e ganha a arma mais perto do ponto onde você está olhando,
       desde que esteja ao alcance do braço. A mais próxima continua valendo como fallback
       (quem passa por cima sem olhar continua pegando como antes). ?rack=old = só a antiga.
       NÃO virou pega-andando-por-cima como os bots (era uma das direções sugeridas): o rack
       tem 25 armas a 1,15 m uma da outra, e atravessar ele trocaria a arma do jogador 5 ou 6
       vezes em dois segundos — a escolha do loadout viraria sorteio. O E continua sendo a
       confirmação; o que mudou é que agora dá pra ESCOLHER qual arma o E pega. */
    const AIM_R = 0.75;      // raio no chão em volta da crosshair que "conta" como mirar na arma
    const REACH = 2.6;       // alcance do braço quando você MIRA na arma (a pé, era 1,9 sempre)
    const NEAR = 1.9;        // fallback: a mais próxima, igual antes
    const cands = [];
    const consider = (pk, isDrop, idx) => {
      if (this.time < pk.readyAt) return;
      if (!this._pickupAllowed(pk.weapon)) return;
      cands.push({ pk, idx: isDrop ? idx : -1 });
    };
    list.forEach((pk, i) => consider(pk, false, i));
    this.drops.forEach((pk, i) => consider(pk, true, i));
    // quantas armas estão ao alcance AGORA (dita o texto do HUD, independente de estar mirando)
    let inReach = 0;
    for (const c of cands) {
      const ax = c.pk.x - p.pos.x, az = c.pk.z - p.pos.z;
      if (ax * ax + az * az <= REACH * REACH) inReach++;
    }
    let sel = null;
    if (p.alive && !RACK_OLD) {
      const dir = this.camera.getWorldDirection(this._pkDir || (this._pkDir = new THREE.Vector3()));
      const eye = this.camera.position;
      // olhando pra baixo o bastante pra cruzar o plano das armas (~0,08 m ACIMA DO CHÃO ONDE
      // O JOGADOR ESTÁ). Era 0,12 ABSOLUTO — mesmo defeito de game.js:4208/498: dentro da
      // piscina (chão −1,5 m) o plano ficava 1,6 m acima das armas e a mira projetava metros
      // fora, tornando a escolha por mira inútil justo onde o mapa tem relevo.
      const plano = (this.world.groundHeightAt ? this.world.groundHeightAt(p.pos.x, p.pos.z) : 0) + 0.08;
      if (dir.y < -0.08) {
        const t = (plano - eye.y) / dir.y;
        if (t > 0 && t < 6) {
          const hx = eye.x + dir.x * t, hz = eye.z + dir.z * t;
          let bd = AIM_R * AIM_R;
          for (const c of cands) {
            const ax = c.pk.x - p.pos.x, az = c.pk.z - p.pos.z;
            if (ax * ax + az * az > REACH * REACH) continue;   // vê de longe ≠ alcança
            const dx = c.pk.x - hx, dz = c.pk.z - hz, d2 = dx * dx + dz * dz;
            if (d2 < bd) { bd = d2; sel = c; }
          }
        }
      }
    }
    if (!sel) {                                   // fallback: a mais próxima (comportamento antigo)
      let bd = NEAR * NEAR;
      for (const c of cands) {
        const dx = c.pk.x - p.pos.x, dz = c.pk.z - p.pos.z, d2 = dx * dx + dz * dz;
        if (d2 < bd) { bd = d2; sel = c; }
      }
    }
    this.nearPickup = sel && p.alive ? { pk: sel.pk, dropIdx: sel.idx } : null;
    /* DESTAQUE FÍSICO da arma selecionada: ela sobe 10 cm do chão. Com 25 armas juntas, ler
       o nome no HUD não basta — o jogador precisa VER qual delas o E vai pegar. Guardamos a
       altura original pra devolver quando a seleção muda (e o _resetPositions zera o campo,
       porque as meshes do round anterior saem da cena). */
    const selMesh = this.nearPickup ? this.nearPickup.pk.mesh : null;
    if (this._pkGlow && this._pkGlow !== selMesh) { this._pkGlow.position.y = this._pkGlowY; this._pkGlow = null; }
    if (selMesh && this._pkGlow !== selMesh) { this._pkGlow = selMesh; this._pkGlowY = selMesh.position.y; selMesh.position.y = this._pkGlowY + 0.10; }
    /* PROMPT DO [E] — DEFEITO 1 DO DONO (11 de 16 screenshots com a tarja no centro-baixo,
       por cima da arma). MEDIDO em tools/eval/ui-check.mjs (UI2, 5 mapas × 2 modos × 2
       cenários × 90 s): 96,7% do tempo aceso no pior caso (piscina_treta, jogador no spawn).
       Não era "aparece demais": ele NUNCA APAGA enquanto houver uma arma no raio de 1,9 m —
       e o armário do spawn põe 25 armas exatamente onde o jogador nasce e renasce.

       Três condições novas, cada uma com um motivo:
       (a) ARMA IGUAL COM MUNIÇÃO CHEIA não vira prompt. Pegar a mesma arma com pente e
           reserva cheios não faz NADA (game.js:_grabPickup só toca sfx.uiClick) — anunciar
           uma ação sem efeito é o pior tipo de ruído. Se falta munição, o prompt volta,
           porque aí o [E] resolve alguma coisa.
       (b) TEMPO DE VIDA de 4 s por seleção. O prompt é uma INSTRUÇÃO, não um medidor: ele
           some depois de lido. 4 s = a string mais longa que o jogo escreve
           ("[E] PEGAR REVÓLVER .38 · mire pra escolher", 41 caracteres ≈ 7 palavras) lida a
           ~3,5 palavras/s — metade da leitura contínua de 250 ppm, porque num FPS o olho
           volta pra mira entre sacadas — dá 2 s, e o dobro disso é a folga.
       (c) PERÍODO REFRATÁRIO de 14 s entre uma exibição e a próxima. É ele que dá a
           GARANTIA, não a sorte da simulação: acesa no máximo HINT_ON a cada
           HINT_ON+HINT_OFF, o prompt não passa de 4/18 = 22,2% do tempo em NENHUM cenário
           possível — abaixo do teto de 25% da UI2 por construção. Sem isso o número ainda
           dependia do mapa: com o rack de 25 armas e o respawn de pickup de 8 s
           (PICKUP_RESPAWN), a arma selecionada troca sozinha e cada troca reacendia a
           tarja; medido com só (a)+(b), piscina_treta/CTF parado no spawn ainda dava 37,6% e
           ferro_velho andando dava 31,3%.
           Os relógios correm MESMO FORA DE ALCANCE, então voltar pra arma 14 s depois
           mostra o prompt de novo — o que se perde é a repetição em rajada, não o aviso. */
    const HINT_ON = 4, HINT_OFF = 14;
    if (this.el.pickupHint) {
      const sel2 = this.nearPickup;
      const w = sel2 ? sel2.pk.weapon : null;
      let util = !!sel2 && this.state === 'live';
      if (util && w === p.weapon) {
        const a = p.ammo[w], W = WEAPONS[w];
        util = !(a && W && a.mag >= W.mag && a.res >= W.reserve);   // (a) mesma arma + munição cheia = nada a ganhar
      }
      if (!util) this._pkHintW = null;   // saiu do alcance: voltar conta como informação nova
      else if (this._pkHintW !== w && this.time >= (this._pkHintLivre || 0)) {          // (c)
        this._pkHintW = w;
        this._pkHintAte = this.time + HINT_ON;                                          // (b)
        this._pkHintLivre = this.time + HINT_ON + HINT_OFF;
      }
      if (util && this._pkHintW === w && this.time < (this._pkHintAte || 0)) {
        // com várias armas ao alcance, o HUD ensina o gesto em vez de deixar o jogador adivinhar
        this.el.pickupHint.textContent = `[E] PEGAR ${WEAPONS[w].short}` + (inReach > 1 ? ' · mire pra escolher' : '');
        this.el.pickupHint.classList.remove('hidden');
      } else this.el.pickupHint.classList.add('hidden');
    }
    for (const pk of list) {
      // respawn a taken weapon
      if (pk.mesh && !pk.mesh.visible && this.time >= pk.readyAt) pk.mesh.visible = true;
      if (this.time < pk.readyAt) continue;        // still taken
      // bot grab (andando por cima)
      for (const b of this.bots) {
        if (!b.alive) continue;
        const dx = pk.x - b.pos.x, dz = pk.z - b.pos.z;
        if (dx * dx + dz * dz <= 1.7 * 1.7) { this._grabPickup(pk, b, false); break; }
      }
    }
    // drops: bots pegam andando (jogador só com E, acima). Spawn-rack drops are for the
    // PLAYER — bots leave them alone (otherwise they hoover the spawn line on round 1).
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const pk = this.drops[i];
      // prazo antes da coleta: arma vencida some mesmo com bot em cima dela neste quadro
      if (pk.expiraEm && this.time >= pk.expiraEm) { this._sumirDrop(i); continue; }
      if (pk.rack) continue;
      for (const b of this.bots) {
        if (!b.alive) continue;
        const dx = pk.x - b.pos.x, dz = pk.z - b.pos.z;
        if (dx * dx + dz * dz <= 1.7 * 1.7) { this._grabPickup(pk, b, false); this._sumirDrop(i); break; }
      }
    }
  }
  /* Modo de armas EFETIVO. O caso especial `if (this._mapId === 'praca_old') return 'awp'`
     saiu junto com o mapa (pedido do dono: "vamos apagar a praça clássica"): era a única
     regra de arma amarrada a um id de mapa e o mapa não existe mais. Nenhum mapa vivo força
     AWP-only — quem escolhe é o menu. */
  _wpnMode() {
    // `?.` porque o HUD de loadout agora lê o modo, e há caminho (vmlab) que monta o Game
    // sem `settings`: sem a guarda o render do menu estoura e o HUD1 fica vermelho.
    return this.settings?.wpnMode || 'all';
  }
  _botWeapon() {
    // Give bots varied weapons that match the weapon mode, so ground drops aren't all AWP.
    const mode = this._wpnMode();
    if (mode === 'awp') return 'awp';
    if (mode === 'knife') return 'knife';
    if (mode === 'pistols') return Math.random() < 0.5 ? 'pistol' : 'deagle';
    return BOT_WEAPON_POOL[(Math.random() * BOT_WEAPON_POOL.length) | 0];
  }
  // Modo restrito não tem pickup de outra arma no mapa, então reserva finita = partida
  // acabada quando zera. Fica infinita a RESERVA, não o pente: a recarga segue cobrando.
  _municaoInfinita() { return this._wpnMode() !== 'all'; }
  _pickupAllowed(w) {
    const mode = this._wpnMode();
    if (mode === 'pistols') return w === 'pistol' || w === 'deagle';
    if (mode === 'knife') return false;
    if (mode === 'awp') return w === 'awp';
    return true; // all
  }
  _grabPickup(pk, who, isPlayer) {
    const w = pk.weapon;                           // qualquer arma de WEAPONS
    if (!WEAPONS[w]) return false;
    if (isPlayer) {
      if (who.weapon === w) return false;   // #264: mesma arma na mão não recarrega - reload existe p/ isso
      if (!who.ammo[w]) who.ammo[w] = { mag: 0, res: 0 };
      who.ammo[w].mag = WEAPONS[w].mag;
      who.ammo[w].res = WEAPONS[w].reserve;
      {
        const oldW = who.weapon;                   // arma que estava na mão
        this._switchWeapon(w); this.sfx.reloadEnd();
        // dropa a arma antiga no chão (estilo CS) — MAS não no rack: o rack é armário, você
        // só troca de arma lá sem largar a anterior (senão o spawn vira um monte de armas).
        if (oldW && oldW !== w && oldW !== 'knife' && pk.mesh && !pk.rack) this._dropWeapon(pk.mesh.position.x, pk.mesh.position.z, oldW, false);
      }
    } else {
      who.weapon = w === 'knife' ? 'awp' : w;      // bot grabs it
    }
    // Rack (armário do spawn) é PERSISTENTE: fica visível e nunca some (bug: antes o rack
    // esvaziava porque a arma pega era removida de vez). Só pickups não-rack somem+respawnam.
    if (pk.mesh && !pk.rack) pk.mesh.visible = false;
    if (!pk.rack) pk.readyAt = this.time + PICKUP_RESPAWN;
    return true;
  }
  /* ASSENTA a arma no chão LOCAL — o único jeito que funciona pros 26 GLBs.
     DEFEITO QUE ISTO CONSERTA (game.js:4208 antigo): `mesh.position.set(x, y, z)` usava y
     ABSOLUTO de mundo. Em mapa plano coincide com o chão; em piscina_treta o fundo da piscina
     vale −1,5 m (map_piscina.js:267) e as duas contas divergem 1,6 m — e na praca_old, cujo
     chão vale 1,4 m, a arma nascia 1,3 m ENTERRADA (medido: vão −1,312).
     E "chão local + constante" também não serve: a arma é deitada de lado (roll π/2) e a
     meia-espessura muda de GLB pra GLB — 0,088 m no fallback procedural, outro valor em cada
     arma real. Então não se chuta altura: MEDE-SE a bbox do mesh já posicionado E rotacionado
     e desloca-se y até a BASE encostar no chão. `folga` é o milímetro de ar que evita
     z-fighting com o piso. Chamado por _dropWeapon e pelo swap de pickup do mapa
     (game.js:498), pra não existirem duas contas de altura no projeto. */
  _assentarNoChao(mesh, x, z, folga = 0.01) {
    const chao = this.world && this.world.groundHeightAt ? this.world.groundHeightAt(x, z) : 0;
    mesh.position.set(x, chao + folga, z);
    mesh.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(mesh);
    // bbox degenerada (grupo sem geometria) → fica na altura nominal em vez de virar NaN
    if (isFinite(b.min.y)) mesh.position.y += (chao + folga) - b.min.y;
    mesh.updateWorldMatrix(true, true);
    return mesh.position.y;
  }
  refreshPickupModels() {
    const replace = (pk, mapPickup) => {
      if (!pk.mesh) return;
      if (pk.mesh.userData.weaponSource && pk.mesh.userData.weaponRequested === pk.mesh.userData.weaponSource) return;
      const rw = weaponModel(pk.weapon);
      if (!rw) return;
      rw.rotation.set(0, pk.mesh.rotation.y, mapPickup ? 0.12 : pk.mesh.rotation.z);
      rw.visible = pk.mesh.visible;
      rw.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      pk.mesh.removeFromParent();
      this.scene.add(rw);
      pk.mesh = rw;
      this._assentarNoChao(rw, pk.x, pk.z, pk.folga ?? 0.01);
    };
    for (const pk of this.world.pickups || []) replace(pk, true);
    for (const pk of this.drops || []) replace(pk, false);
    const pendentes = [...(this.world.pickups || []), ...(this.drops || [])]
      .some((pk) => pk.mesh?.userData.weaponProceduralFallback);
    if (!pendentes && this._pickupFallbackTpl) {
      this._pickupFallbackTpl.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      this._pickupFallbackTpl = null;
    }
  }
  // CS: morto larga a arma no chão
  _dropWeapon(x, z, weapon, rack = false, folga = 0.01, expiraEm = 0) {
    const loaded = weaponModel(weapon);
    const mesh = loaded || (this._pickupFallbackTpl ||= buildRifle()).clone(true);
    if (!loaded) mesh.userData.weaponProceduralFallback = true;
    // lay it FLAT on its side (roll 90° about the barrel) so it rests on the ground
    // instead of standing on its belly. Rack drops (spawn weapon rows) get an aligned
    // yaw so they read as a tidy line; death drops/scatter get a random yaw.
    // ROTAÇÃO ANTES do assentamento: quem decide a altura é a bbox girada, não a de repouso.
    mesh.rotation.set(0, rack ? (Math.random() - 0.5) * 0.18 : Math.random() * Math.PI * 2, Math.PI / 2);
    this._assentarNoChao(mesh, x, z, folga);
    mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.scene.add(mesh);
    this.drops.push({ x, z, weapon, readyAt: 0, mesh, rack, folga, expiraEm });
    // só quem tem prazo entra na fila do teto: rack de spawn e troca de arma nunca são despejados
    if (expiraEm) {
      const comPrazo = [];
      for (let i = 0; i < this.drops.length; i++) if (this.drops[i].expiraEm) comPrazo.push(i);
      for (let k = 0; k < comPrazo.length - DROP_MAX; k++) this._sumirDrop(comPrazo[k] - k);
    }
  }
  _sumirDrop(i) {
    const d = this.drops[i];
    if (!d) return;
    d.mesh?.removeFromParent();
    this.drops.splice(i, 1);
    // `nearPickup` guarda ÍNDICE, e ele desliza quando a lista encolhe: sem isto o E entre
    // dois quadros entregava a arma vencida e removia o drop que herdou o índice.
    const np = this.nearPickup;
    if (np && np.dropIdx >= 0) { if (np.pk === d) this.nearPickup = null; else if (np.dropIdx > i) np.dropIdx--; }
  }
  /* SPAWN POR SEGURANÇA (não sorteado): dos 4 pontos do time, escolhe o que está mais longe
     do inimigo vivo mais próximo E sem linha de visão pra ele. O sorteio puro colocava o
     jogador na frente de quem estava empurrando o spawn — morrer duas vezes seguidas sem
     encostar no gatilho era rotina. Usado pelo jogador e pelos bots. */
  /* ALTURA DO PONTO DE SPAWN — pergunta ao MAPA, não assume zero.
     ═══════════════════════════════════════════════════════════════════════════════════
     DEFEITO DO DONO: *"o respawn do time dentro da loja, eles começam embaixo do mezanino
     e do nada sobem, isso tá esquisito."*

     Os cinco lugares que colocam alguém num spawn escreviam `pos.set(s.x, 0, s.z)` — Y
     ZERO LITERAL. Enquanto todo mapa foi plano isso foi verdade por acidente. A Havan tem
     chão MULTINÍVEL (`map_havan.js/groundHeightAt(x, z, yRef)`) e o spawn do time da loja
     é o DEPÓSITO DO MEZANINO, y de projeto 3,40 m, dentro da pegada onde o mesmo (x, z)
     tem piso em 0,00 e em 3,40. Medido em `tools/eval/spawn-settle-check.mjs`:
       BOT    y(frame 0) = 0,00 -> y(frame 1) = 3,40   — 3,40 m de teleporte em um quadro,
              porque o realinhamento do bot (`_updateBot`) usa a camada de CIMA;
       JOGADOR y(frame 0) = 0,00 -> y(frame 30) = 0,00 — ele fica no TÉRREO, embaixo da
              laje, porque o resolvedor recebe yRef = 0 e responde "seu chão é o de baixo".
     São a mesma causa vista de dois lados, e ela não está no mapa nem no resolvedor: está
     em quem chama. Consertar aqui (perguntar a altura) e não mudando os pontos de spawn é
     o que impede o defeito de renascer em qualquer outro mapa com plataforma.

     SEM yRef de propósito: o ponto de spawn é uma DECLARAÇÃO do mapa ("nasce aqui"), e a
     superfície que ele quer dizer é a de cima daquele (x, z) — é o que `groundHeightAt`
     devolve quando ninguém informa um corpo. Passar yRef = 0 aqui traria de volta
     exatamente o jogador nascendo embaixo da laje. */
  _spawnY(x, z) {
    return this.world && this.world.groundHeightAt ? this.world.groundHeightAt(x, z) : 0;
  }
  _pickSpawn(team) {
    const list = this.world.spawns[team] || [];
    if (!list.length) return { x: 0, z: 0 };
    const foes = this.combatants.filter(c => c.alive && c.team !== team);
    if (!foes.length) return list[(Math.random() * list.length) | 0];
    let best = null, bestScore = -1e9;
    for (const s of list) {
      // custo controlado: 1 raycast por spawn (só contra o inimigo MAIS PRÓXIMO), não N —
      // isto roda a cada respawn de bot, várias vezes por segundo numa partida cheia.
      let near = 1e9, nearest = null;
      for (const f of foes) {
        const d = Math.hypot(f.pos.x - s.x, f.pos.z - s.z);
        if (d < near) { near = d; nearest = f; }
      }
      const eye = new THREE.Vector3(s.x, 1.5, s.z);
      const seen = nearest && near < 60 &&
        this._losClear(eye, nearest.isPlayer ? this.camera.position : this._botEye(nearest));
      // ruído pequeno pra não usar SEMPRE o mesmo canto quando o mapa está calmo
      const score = Math.min(near, 45) - (seen ? 30 : 0) + Math.random() * 4;
      if (score > bestScore) { bestScore = score; best = s; }
    }
    return best || list[0];
  }
  _respawnPlayer() {
    /* Online quem revive é o servidor. Renascer local escolheria um spawn que ele não
       escolheu, e o próximo snapshot arrastaria o jogador de volta. */
    if (this.online) return;
    const p = this.player;
    const s = this._pickSpawn(p.team);
    p.pos.set(s.x, this._spawnY(s.x, s.z), s.z); p.vel.set(0, 0, 0);
    p.hp = 100; p.alive = true; p.crouchF = 0;
    p._lifeDmg = 0;
    this._tpRevive();   // o corpo TP não pode renascer deitado (BUG-86)
    if (this._deathPanel) this._deathPanel.innerHTML = '';   // painel de morte não vaza pra vida nova
    p.protUntil = this.time + SPAWN_PROT;
    p.yaw = p.team === 'E' ? Math.PI : 0; p.pitch = 0;
    // Top off the CURRENT loadout's mags (primary could be any weapon now, not just AWP).
    // #268: em modo arma-única só recarrega slot PERMITIDO pelo modo (pistola não sai de
    // 0/0 no SÓ AWP), e quem morreu com arma proibida renasce com a arma do modo.
    if (p.primary && this._pickupAllowed(p.primary) && p.ammo[p.primary]) p.ammo[p.primary] = { mag: WEAPONS[p.primary].mag, res: WEAPONS[p.primary].reserve };
    if (p.secondary && this._pickupAllowed(p.secondary) && p.ammo[p.secondary]) p.ammo[p.secondary] = { mag: WEAPONS[p.secondary].mag, res: WEAPONS[p.secondary].reserve };
    if (!this._pickupAllowed(p.weapon)) {
      const mode = this._wpnMode();
      const volta = mode === 'awp' ? 'awp' : (p.secondary || 'pistol');
      if (WEAPONS[volta] && this._pickupAllowed(volta)) this._switchWeapon(volta);
    }
    this.camera.rotation.z = 0;
    this.el.respawn.classList.add('hidden');
    this.sfx.respawn();
  }

  /* ================= bots ================= */
  _losClear(from, to) {
    const dir = to.clone().sub(from), dist = dir.length();
    if (dist < 0.5) return true;
    this.ray.set(from, dir.normalize()); this.ray.far = dist - 0.3;
    if (this.ray.intersectObjects(this.world.occluders, false).length > 0) return false;
    // fumaça bloqueia a visão dos bots: se o segmento cruza uma nuvem opaca, sem linha de visão.
    for (const s of this._smokes) {
      if (!s._opaque) continue;
      const ab = to.clone().sub(from);
      const t = Math.max(0, Math.min(1, s.center.clone().sub(from).dot(ab) / (ab.lengthSq() || 1)));
      if (from.clone().addScaledVector(ab, t).distanceToSquared(s.center) <= s.radius * s.radius) return false;
    }
    return true;
  }
  /* RÁDIO DOS BOTS: o sistema de rádio existia só pro jogador — o time era mudo, então nada
     do que os bots faziam chegava ao jogador como informação. Aqui, ao ENGATAR um alvo, o bot
     grita o contato no mesmo log do rádio (cooldown global de 5s pra não virar tagarelice) e,
     se for ALIADO do jogador, isso é a única pista de "tem briga ali" fora do radar. */
  _botCall(b, target) {
    if (!this.el || !this.el.radioLog || this.state !== 'live') return;
    if (this.time < (this._radioCd || 0)) return;
    if (b.pos.distanceTo(this.player.pos) > 55) return;   // longe demais: não escutaria
    this._radioCd = this.time + 5;
    const mine = b.team === this.playerTeam;
    const lines = mine
      ? ['Contato!', 'Tô vendo um aqui!', 'Inimigo na minha frente!', 'Cobre eu que eu vou!']
      : ['Achei um!', 'Tá aqui, ó!'];
    if (!mine && Math.random() < 0.6) return;             // inimigo fala menos (não entrega tudo)
    const log = document.createElement('div');
    log.className = 'radio-line';
    log.style.opacity = mine ? '1' : '0.75';
    log.textContent = `${b.name} (RÁDIO): ${lines[(Math.random() * lines.length) | 0]}` +
      (target === this.player ? ' — é você!' : '');
    this.el.radioLog.appendChild(log);
    setTimeout(() => log.remove(), 3600);
    while (this.el.radioLog.children.length > 3) this.el.radioLog.firstChild.remove();
    try { this.sfx.radioVoice(this._voiceKey(b.team)); } catch {}
  }
  /* ===================== MARCADOR DE TIME (halo + chevron) =====================
     Dono: "ia ser legal se tivesse um halo no chão, ou uma seta em cima deles mostrando que
     time eram, caso um mapa tenha 2 times com o mesmo time (time-bs x time-bs)".
     Isso não é enfeite: o rim por time que já existe (characters.js, TEAM_RIM) é colorido por
     `def.team` — a FACÇÃO do personagem, não o LADO da partida. Num espelho (mesma facção nos
     dois lados) os dois times ganham o MESMO rim verde e viram indistinguíveis. O `_teamColor`
     daqui já resolve o espelho (inimigo vira ROXO), então é ele que manda nos marcadores.

     DOIS CANAIS REDUNDANTES, porque cor sozinha não basta (daltonismo, fundo colorido, bloom):
       1. HALO no chão sob o personagem — anel CONTÍNUO para aliado, TRACEJADO para inimigo.
       2. CHEVRON acima da cabeça — triângulo CHEIO para aliado, VAZADO (só contorno) para
          inimigo. Escala com a distância com piso e teto, para continuar legível a 5, 20 e 40 m
          (a 40 m ainda dá ~17 px de altura em 1008×655).
     Profundidade: o marcador de ALIADO atravessa parede (é consciência de time, padrão do
     gênero); o de INIMIGO é testado em profundidade — some atrás da parede, então NÃO é
     wallhack: ele só responde "quem é esse que eu estou vendo?".
     Kill-switch: ?teammark=0. */
  _teamMarkTex(kind) {
    this._tmTex = this._tmTex || {};
    if (this._tmTex[kind]) return this._tmTex[kind];
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    g.lineCap = 'round';
    if (kind === 'haloAlly' || kind === 'haloEnemy') {
      g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 17;
      if (kind === 'haloEnemy') g.setLineDash([16, 13]);
      g.beginPath(); g.arc(S / 2, S / 2, 48, 0, Math.PI * 2); g.stroke();   // contorno escuro: lê em piso claro
      g.strokeStyle = '#fff'; g.lineWidth = 10;
      g.beginPath(); g.arc(S / 2, S / 2, 48, 0, Math.PI * 2); g.stroke();
    } else {
      // chevron apontando PRA BAIXO (aponta o dono do marcador), com contorno escuro
      const tri = (sc) => { g.beginPath(); g.moveTo(64 - 40 * sc, 30); g.lineTo(64 + 40 * sc, 30); g.lineTo(64, 96); g.closePath(); };
      g.strokeStyle = 'rgba(0,0,0,0.75)'; g.lineWidth = 13; g.lineJoin = 'round'; tri(1); g.stroke();
      if (kind === 'chevAlly') { g.fillStyle = '#fff'; tri(1); g.fill(); }
      else { g.strokeStyle = '#fff'; g.lineWidth = 11; tri(1); g.stroke(); }   // inimigo = vazado
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return (this._tmTex[kind] = t);
  }
  _makeTeamMark(bot) {
    if (QS.get('teammark') === '0') return;
    const ally = bot.team === this.playerTeam;
    const col = new THREE.Color(this._teamColor(bot.team));
    this._tmHaloGeo = this._tmHaloGeo || new THREE.PlaneGeometry(1, 1);
    const halo = new THREE.Mesh(this._tmHaloGeo, new THREE.MeshBasicMaterial({
      map: this._teamMarkTex(ally ? 'haloAlly' : 'haloEnemy'), color: col,
      transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -3, toneMapped: false,
    }));
    halo.rotation.x = -Math.PI / 2; halo.scale.setScalar(1.45); halo.renderOrder = 3;
    this.scene.add(halo);
    bot._mark = { halo, ally };   // SEM chevron/seta na cabeça (pedido do dono) — só o halo no chão
  }
  _updateTeamMark(b) {
    const m = b._mark;
    if (!m) return;
    if (!b.alive || !b.mesh.group.visible) { m.halo.visible = false; return; }
    m.halo.visible = true;
    m.halo.position.set(b.pos.x, b.pos.y + 0.05, b.pos.z);
  }
  _botEye(b) { return new THREE.Vector3(b.pos.x, b.pos.y + BOT_EYE, b.pos.z); }
  _enemyOf(bot) { return this.combatants.filter(c => c.team !== bot.team && c.alive); }
  /* TURNO DE DUELO (attack token) — ver o comentário de BOT_DUEL_TOKENS.
     POR QUE existe: medido em botdiag, as rajadas que matavam o jogador vinham de 2-3 bots
     SIMULTÂNEOS. Somando três fontes de fogo não existe janela de reação: o jogador leva
     100 de dano de três direções antes de achar a primeira. O token limita quantos ATIRAM
     (não quantos veem nem quantos se movem), e obriga rodízio: quem usou o turno descansa
     BOT_TOKEN_REST antes de poder pegar de novo, então a vez circula pelo time em vez de
     ficar sempre com o mesmo bot. Só vale contra o JOGADOR — bot-vs-bot segue igual. */
  _duelToken(b) {
    const T = this._duelTok || (this._duelTok = new Map());
    const now = this.time;
    for (const [k, until] of T) {
      /* BUG-03 (2ª metade): token é PERMISSÃO DE ATIRAR — quem não CONSEGUE atirar não pode
         ficar segurando. O holder que zerou o pente (reloadUntil, até 2,4 s) ou que perdeu a
         visão ficava mudo com o turno na mão até o hold de 1,6 s vencer, e quem tinha tiro
         esperava por ele. Devolve o slot na hora, e SEM cobrar BOT_TOKEN_REST: o rest existe
         pra quem GASTOU o turno rodiziar, não pra punir quem foi recarregar. */
      if (until > now && k.alive && k.target && k.target.isPlayer) {
        if (now > (k.reloadUntil || 0) && !k._losLost) continue;
        T.delete(k); continue;
      }
      T.delete(k); k._tokRest = now + BOT_TOKEN_REST;
    }
    if (T.has(b)) return true;
    if (now < (b._tokRest || 0) || T.size >= BOT_DUEL_TOKENS) return false;
    T.set(b, now + BOT_TOKEN_HOLD);
    return true;
  }
  /* Mesmo respawn de sempre, agora chamável da IA E do slot de gente. Preso na IA, quem morria
     no multiplayer não voltava mais. Ver docs/MULTIPLAYER.md. */
  _respawnEntity(b) {
    const g = b.mesh.group;
    const s = this._pickSpawn(b.team);   // mesmo critério de segurança do jogador
    b.pos.set(s.x, this._spawnY(s.x, s.z), s.z); b.hp = 100; b.alive = true;
    /* Renascem sobrepostos de propósito: jitter no spawn foi medido e reprovado. Quem
       desempilha é a despenetração do _botSeparation. Números: docs/MULTIPLAYER.md. */
    b.protUntil = this.time + SPAWN_PROT;
    b.mag = (WEAPONS[b.weapon] && WEAPONS[b.weapon].mag) || 30;
    b.aimErr = 0.2; b.burst = 0; b.alertUntil = 0; b._hurtAt = 0; b.reloadUntil = 0;
    b.focusUntil = 0; b._spinAcc = 0; b._spinAt = 0; b._sideUntil = 0;   // estado de mira/anti-pirueta da vida anterior
    b.target = null; b.path = null; b.yaw = b.team === 'E' ? 0 : Math.PI;
    // Coluna, rota, juke e rumo são estado de VIDA: herdá-los repete rota e gira no spawn.
    b.laneX = undefined; b.roamUntil = 0;
    b._banNodes = null; b._unreach = null; b._escapeUntil = 0; b._jukeAt = 0;
    b._hdg = undefined; b._tokRest = 0; b._repathMin = 0;
    if (this._duelTok) this._duelTok.delete(b);
    b._lp = { x: s.x, z: s.z };   // evita spike de velocidade (teleporte) no 1º frame
    g.rotation.set(0, b.yaw, 0); g.position.copy(b.pos); g.visible = true;
    if (b.mesh.isGLB) b.mesh.ctrl.revive();
  }

  _updateBot(b, dt) {

    if (b._remote) {
      /* Corpo com dono: cliente interpola do snapshot; servidor cuida do ciclo de vida dele.
         O respawn é chamado AQUI porque corpo de gente não passa pela IA. Ver docs/MULTIPLAYER.md. */
      if (this.online) { this._mp?.updateRemoteBot(b, dt); return; }
      if (!b.alive) {
        b.deadT = (b.deadT || 0) + dt;
        if (this.time >= b.respawnAt && this.state === 'live') this._respawnEntity(b);
        return;
      }
      if (b._netInput) this._moveEntity(b, b._netInput, dt);
      return;
    }
    // `__mutBotYaw`: gancho da botsim-golden (mesmo precedente do __mutAccel) — deriva o rumo
    // do bot pra régua provar que morde. Zero em produção.
    if (this.__mutBotYaw && b.alive) b.yaw += this.__mutBotYaw * dt;
    const g = b.mesh.group;
    // Sem alvo no CTF, mantém a navegação roteirizada até o objetivo.
    if (this._botBrain && this._botBrain.ready && this.botBrainMix > 0 && b.alive && this.state === 'live'
        && (!this.ctf || b.target)
        && (!this._botBrainTeam || b.team === this._botBrainTeam)) {   // régua NN contra roteiro
      return this._updateBotNN(b, dt);
    }
    if (!b.alive) {
      b.deadT += dt;
      if (b.mesh.isGLB) {
        b.mesh.ctrl.die();
        b.mesh.ctrl.update(dt, 0, false);
        if (b.deadT > 1.0) g.visible = false; // fall fast, then vanish (no lingering ragdoll)
      } else {
        g.rotation.x = Math.max(-Math.PI / 2, g.rotation.x - dt * 5);
        g.position.y = b.pos.y + Math.max(-0.6, 0 - b.deadT * 0.3);
      }
      if (this.time >= b.respawnAt && (this.state === 'live')) {
        this._respawnEntity(b);
      }
      this._updateTeamMark(b);   // marcador some junto com o corpo (senão fica halo órfão no chão)
      return;
    }
    if (this.state !== 'live') {
      if (b.mesh.isGLB) b.mesh.ctrl.update(dt, 0, false);
      else poseCharacter(b.mesh.parts, 0, 0, this.time);
      return;
    }

    // spawn protection: pisca o modelo enquanto invulnerável
    if (this.time < b.protUntil) g.visible = Math.floor(this.time * 12) % 2 === 0;
    else if (!g.visible) g.visible = true;

    // REGEN do bot (mesma regra do jogador — ver constante REGEN): sem isto o bot que trocou
    // tiro uma vez fica marcado pra morrer e o combate vira "quem encostou primeiro ganha".
    if (b.hp < (b._lastHp === undefined ? 100 : b._lastHp)) { b._hurtAt = this.time; b.alertUntil = this.time + 6; }
    b._lastHp = b.hp;
    if (REGEN && b.hp < 100 && this.time - (b._hurtAt || -99) > REGEN_DELAY) b.hp = Math.min(100, b.hp + dt * REGEN_RATE);

    // --- think: target acquisition
    b.think -= dt;
    if (b.think <= 0) {
      // think ESCALONADO (0.10-0.22s) em vez de 0.16 travado: 8 bots pensando no mesmo frame
      // dão um pico de raycast e, pior, reagem todos juntos (leitura de "enxame sincronizado").
      b.think = 0.10 + Math.random() * 0.12;
      // Alcance de visão: base 45m, 82m com luneta (o jogador de AWP a 100m era literalmente
      // impune — o bot não podia nem SABER que estava sendo alvejado), 64m quando alerta
      // (levou tiro ou ouviu tiro perto nos últimos segundos).
      const W0 = WEAPONS[b.weapon];
      const view = Math.max(W0 && (W0.scope || W0.spreadScope) ? BOT_VIEW_SNIPER : BOT_VIEW,
        this.time < (b.alertUntil || 0) ? BOT_VIEW_ALERT : 0);
      let best = null, bd = 1e9;
      for (const e of this._enemyOf(b)) {
        const d = b.pos.distanceTo(e.pos);
        // BOT_VIEW < map length: with 70m+ sight on the open esplanade both teams
        // acquired from spawn and the round became a stand-still snipe loop (100 dmg
        // bot-vs-bot = first hit kills) — nobody roamed. 45m forces bots to close
        // in through mid-map, so the varied roam routes actually play out.
        if (d < bd && d < view) {
          const eye = this._botEye(b);
          const teye = e.isPlayer ? this.camera.position.clone() : this._botEye(e);
          if (this._losClear(eye, teye)) { best = e; bd = d; }
        }
      }
      if (best) {
        b._losLost = false; b._lostAt = 0;
        if (b.target !== best) {
          b.target = best;
          // REAÇÃO HUMANA: era uniforme (0.3-0.8)/(skill*1.5) — todo bot do mesmo tier reagia
          // dentro de uma janela de 30ms e nunca "cochilava". Agora é uma distribuição com
          // MODA e CAUDA (soma de 3 uniformes = quase-normal + 12% de lapso de atenção):
          // 'bom' fica ~230ms típico, mas erra pra 600ms de vez em quando, como gente.
          const g = (Math.random() + Math.random() + Math.random()) / 3;   // ~normal em [0,1]
          const lapse = Math.random() < 0.12 ? 0.28 + Math.random() * 0.35 : 0;
          // PISO de reação: sem ele o tier 'muito bom' reagia em 90 ms — abaixo do reflexo
          // humano (~180-250 ms), que é literalmente a definição de "parece cheater".
          const react = (0.13 + g * 0.34) / Math.max(0.4, b.skill) + lapse;
          b.reactAt = this.time + (BOT_FAIR ? Math.max(BOT_REACT_MIN, react) : react);
          // TEMPO DE FOCO: reagir (perceber/virar) e ASSENTAR a mira são coisas diferentes.
          // O 1º tiro só sai depois dos dois — é o que dá ao jogador a janela pra reagir.
          b.focusUntil = b.reactAt + (BOT_FAIR ? BOT_FOCUS_MIN + 0.18 / Math.max(0.4, b.skill) : 0);
          // ao ENGATAR o alvo a mira está fora: começa com erro grande e "arrasta" até ele
          b.aimErr = Math.max(b.aimErr || 0, (BOT_FAIR ? 0.10 : 0.075) + (BOT_FAIR ? 0.07 : 0.05) / Math.max(0.4, b.skill));
          b.burst = 0;
          this._botCall(b, best);   // rádio: avisa o time (comunicação, não telepatia)
        }
      } else if (b.target) {
        // G2-R6A: não derruba o alvo no 1º frame sem LOS — colunas (Havan) e ilhotas
        // (piscinão) quebram a visão por frações de segundo e o bot flapava
        // combate↔roam ("andando pro lado e pro outro", fwdFlips 62-80/min medido).
        // Grace de 1.2s mantendo o alvo (movimento contínuo); o TIRO é bloqueado
        // enquanto stale (sem wallhack — ver o gate _losLost no bloco de fogo).
        if (!b._lostAt) b._lostAt = this.time;
        b._losLost = true;
        // PERDA DE TRACKING: sumiu de vista, a mira "solta" o alvo. Reaparecendo, o bot tem
        // que reconquistar a precisão (é o que dá valor a quebrar linha de visão / peek).
        b.aimErr = Math.min(0.26, (b.aimErr || 0) + 0.045);   // por tick de think (~0.16s)
        // #281: FUMAÇA não é "alvo sumiu" — ele continua lá atrás. Com o grace comum de
        // 1.2s o bot largava o alvo, virava roam ("barata tonta") e inimigos se cruzavam
        // no meio da nuvem sem nunca re-engatar. Enquanto uma nuvem OPACA bloqueia o
        // segmento, o grace estica p/ 4s: segura a direção e re-engata assim que abre.
        // O gate de tiro (_losLost) continua fechado — não atira no que não vê.
        let grace = 1.2;
        for (const s of this._smokes) {
          if (!s._opaque) continue;
          const ab = b.target.pos.clone().sub(b.pos);
          const t = Math.max(0, Math.min(1, s.center.clone().sub(b.pos).dot(ab) / (ab.lengthSq() || 1)));
          if (b.pos.clone().addScaledVector(ab, t).distanceToSquared(s.center) <= s.radius * s.radius) { grace = 4.0; break; }
        }
        if (this.time - b._lostAt > grace) { b.target = null; b._losLost = false; b._lostAt = 0; }
      }
    }

    // Lane/coluna do bot (sempre definida): usada tanto no roam quanto pela direção de
    // flanco no combate, pra o time ocupar os DOIS lados do mapa (não só a esquerda).
    if (b.laneX === undefined) {
      // CAUSA-RAIZ #1 do "andando de lado" (medido): a coluna era o literal x∈[-10.5,10.5],
      // um número calibrado à mão para Brasília e aplicado aos QUATRO mapas. Em praca_poderes
      // (±45,5 m) e na Havan (±37,5 m) isso espremia os 8 bots num corredor central de 21 m
      // de largura: eles se encontravam o tempo todo, e a separação de boids (_botSeparation)
      // empurrava lateralmente sem parar — o zigzag que o dono vê. Agora a coluna sai dos
      // BOUNDS REAIS do mapa, com 12% de margem pra não colar na parede.
      const B = this.world.bounds;
      const m = (B.maxX - B.minX) * 0.18;   // margem: a 12% a coluna encostava no muro do perímetro e o bot raspava
      const mates = this.bots.filter((o) => o.team === b.team);
      const ord = Math.max(0, mates.indexOf(b)), n = Math.max(1, mates.length);
      const x0 = B.minX + m, x1 = B.maxX - m;
      b.laneX = this.__mutBotLanes
        ? x0 + (x1 - x0) * Math.random()
        : x0 + (x1 - x0) * (n === 1 ? 0.5 : ord / (n - 1));
      b.roamSeed = ord;
    }
    let moving = 0;
    if (b.target) {
      // --- combat
      const e = b.target;
      const dx = e.pos.x - b.pos.x, dz = e.pos.z - b.pos.z;
      const wantYaw = Math.atan2(dx, dz);
      let dy = wantYaw - b.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      // VIRADA por skill (era dt*7 pra todo mundo): o bot ruim demora a te encarar, o bom
      // te acha na hora. Como o gate de tiro exige |dy|<0.3, isso vira tempo de reação
      // VISÍVEL — dá pra ver o corpo girando antes do primeiro tiro, em vez de snap.
      b.yaw += dy * Math.min(1, dt * (4 + 4.2 * Math.max(0.4, b.skill)));
      b.strafeT += dt;
      // Hold a comfortable range: advance if far, back off if close, plus a small
      // lateral juke. Moving mostly ALONG the facing (forward/back) makes the forward
      // walk clip read as walking, instead of the old pure sideways strafe that looked
      // like the bot was sliding/moonwalking across the map.
      const dist = Math.hypot(dx, dz);
      // #27: às vezes o bot PLANTA e mira (parado), em vez de sempre jogar de lado. A média/
      // longa distância (e mais ainda quem agacha) segura a posição por 1-3s — dá pra "ver o
      // bot parado mirando", como pedido, e não vira só um walk-strafe infinito.
      if (this.time > (b._holdDecide || 0)) {
        b._holdDecide = this.time + 1.2 + Math.random() * 1.5;
        // NÃO PLANTA DENTRO DO BOLO: com 2+ colegas a menos de 3 m (b._crowd, contado no
        // _botSeparation), segurar ângulo é o que transforma o funil da porta num monte de
        // bonecos parados. Quem está no aperto se mexe — abre espaço e a pilha se desfaz.
        const crowded = BOT_CROWD && (b._crowd || 0) >= BOT_CROWD_HOLD;
        b.holdUntil = (!crowded && dist > 16 && Math.random() < (b.crouchBias ? 0.6 : 0.4)) ? this.time + 1.0 + Math.random() * 1.8 : 0;
      }
      /* PIVÔ PARADO = a "pirueta" que o dono vê. Segurar ângulo é bom; segurar ângulo
         enquanto o alvo dá a volta em você não é — o bot fica plantado girando 360° no
         próprio eixo, com velocidade zero, que é exatamente a leitura de "rodando em volta
         de si mesmo". Gente não faz isso: quando o alvo sai muito do eixo (>40°), você
         REPOSICIONA. Aqui, sair do eixo cancela o hold e o bot volta a andar enquanto vira. */
      if (Math.abs(dy) > 0.5) b.holdUntil = 0;
      const holding = this.time < (b.holdUntil || 0);
      // USO DE COBERTURA: machucado (<40 HP) e ainda sob fogo, o bot QUEBRA a linha de visão —
      // recua e procura o lado com obstáculo, em vez de morrer em pé trocando tiro. Com o
      // regen isso vira comportamento legível: ele some, se cura e volta.
      const hurt = b.hp < 40 && this.time - (b._hurtAt || -99) < 4;
      if (hurt && this.time > (b._coverAt || 0)) {
        b._coverAt = this.time + 1.6;
        // testa 4 direções pra trás/lados e fica com a primeira que CORTA o LOS pro alvo
        const te = e.isPlayer ? this.camera.position : this._botEye(e);
        let bestA = b.yaw + Math.PI;
        for (let i = 0; i < 4; i++) {
          const a = b.yaw + Math.PI + (i - 1.5) * 0.6;
          const probe = new THREE.Vector3(b.pos.x + Math.sin(a) * 3.2, b.pos.y + BOT_EYE, b.pos.z + Math.cos(a) * 3.2);
          if (!this._losClear(probe, te)) { bestA = a; break; }
        }
        b._coverYaw = bestA;
      }
      // G2-R6A (dono: "bots ficam andando pro lado e pro outro"): o pêndulo senoidal
      // contínuo (approach ±0.55 @9s + strafe ±0.18 @5.7s) lia como metrônomo robótico —
      // avança/recua ±4.5m sem motivo. Agora são DECISÕES esparsas estilo jiggle-peek:
      // a cada 1.1-2.4s o bot escolhe segurar (45%), avançar/recuar ou um juke lateral
      // curto, e mantém a decisão — lê como intenção, não como zigzag.
      if (this.time > (b._jukeAt || 0)) {
        // CAUSA-RAIZ #2: a decisão durava 1,1-2,4 s e o lateral saía em 50% delas, com
        // amplitude 0.4 — ou seja, o bot trocava de lado a cada ~2 s pela ETERNIDADE do
        // combate (7,2 latFlips/min só de combate, medido). Pior: o passo lateral PURO não
        // tem clipe de animação (o controller só tem andar/andar-de-ré), então o bot desliza
        // de lado — que é literalmente a frase do dono. Agora: compromisso mais longo
        // (1,9-3,6 s), lateral em 28% das decisões e com metade da amplitude, e SEMPRE
        // acompanhado de um componente pra frente/trás maior — o movimento vira um ARCO,
        // com a perna andando, em vez de um passinho de caranguejo.
        b._jukeAt = this.time + (BOT_MOVE2 ? 1.9 + Math.random() * 1.7 : 1.1 + Math.random() * 1.3);
        const r = Math.random();
        b._adv = r < 0.45 ? 0 : (r < 0.75 ? (BOT_MOVE2 ? 0.55 : 0.5) : (BOT_MOVE2 ? -0.55 : -0.5));
        /* PASSO LATERAL: ZERO. A rodada anterior já o tinha cortado de 50% pra 28% das
           decisões; medindo agora, ele ainda respondia por ~2 flips laterais por minuto por
           bot — e nunca teve como ficar bom, porque o controller de personagem NÃO TEM
           clipe de andar de lado: qualquer passo lateral é o boneco deslizando com as pernas
           andando pra frente. É o caso exato da régua ("melhor um valor visual mais simples,
           porém consistente"): o bot passa a só avançar, recuar ou segurar — tudo com
           animação que casa — e a variação de ângulo vem do reposicionamento (ver o
           cancelamento de hold acima), que também anda de frente. */
        b._lat = BOT_MOVE2 ? 0 : (Math.random() < 0.5 ? 0 : (Math.random() < 0.5 ? -0.4 : 0.4));
      }
      /* BANDA DE DISTÂNCIA COM HISTERESE. O degrau anterior era `dist>20 ? … : dist<8 ? -1`:
         dois limiares SEM histerese, num alvo que se mexe. O bot fechava até 8 m, recuava até
         8,1 m, avançava de novo — um ciclo-limite de avança/recua (fwdFlips 30/min medido no
         piscinão). Com histerese ele COMPROMETE com um estado e só troca quando a distância
         muda de verdade: entra em avanço acima de 22 m e só sai abaixo de 17; entra em recuo
         abaixo de 6 m e só sai acima de 9,5. */
      const rs = b._range || 'mid';
      b._range = rs === 'push' ? (dist < 17 ? 'mid' : 'push')
        : rs === 'back' ? (dist > 9.5 ? 'mid' : 'back')
        : (dist > 22 ? 'push' : dist < 6 ? 'back' : 'mid');
      let approach = holding ? 0
        : BOT_MOVE2 ? (b._range === 'push' ? 0.9 : b._range === 'back' ? -1 : (b._adv || 0))
        : (dist > 20 ? 0 : dist < 8 ? -1 : (b._adv || 0));
      /* NUNCA GIRAR PARADO. Restava um caso: alvo fora do eixo (o bot ainda virando) numa
         decisão de "segurar posição" (45% delas dão _adv = 0). Corpo parado + cabeça girando
         é, na tela, a pirueta — e a métrica confirma (voltas/min sobe quando o bot para de
         derivar de lado). Gente que é surpreendida pelo flanco DÁ UM PASSO enquanto vira.
         Então: enquanto o alvo estiver a mais de ~29° do eixo, o passo é pra frente. */
      if (BOT_MOVE2 && !approach && Math.abs(dy) > 0.5) approach = 0.5;
      const strafe = holding ? 0 : (b._lat || 0);
      const fdx = Math.sin(b.yaw), fdz = Math.cos(b.yaw);   // forward (mesh facing)
      const rdx = Math.cos(b.yaw), rdz = -Math.sin(b.yaw);  // right
      const spd = BOT_SPEED * 0.55;
      b.pos.x += (fdx * approach + rdx * strafe) * spd * dt;
      b.pos.z += (fdz * approach + rdz * strafe) * spd * dt;
      if (hurt) {   // recuo pra cobertura (mais rápido que o passo de combate: é fuga)
        b.pos.x += Math.sin(b._coverYaw || 0) * BOT_SPEED * 0.8 * dt;
        b.pos.z += Math.cos(b._coverYaw || 0) * BOT_SPEED * 0.8 * dt;
        moving = 1;
      }
      // FLANCO/AVANÇO: sem isto, com o beeline no inimigo mais próximo TODOS convergiam pro
      // centro. Quando o alvo está LONGE (>20m) o bot avança pela SUA coluna (laneX) rumo à
      // profundidade do inimigo — cada bot empurra seu flanco/meio e os combates se espalham
      // pela largura. De perto, só um puxão suave pra coluna (deadzone 2m) que não atrapalha a mira.
      /* CAUSA-RAIZ #3 do "andando de lado": o avanço de flanco somava um vetor em X-MUNDO
         (rumo a laneX) ENQUANTO o corpo estava travado olhando pro alvo. Resultado: o bot
         translada de lado com a arma apontada pra frente — deslize puro, sem animação que
         case. E o puxão residual (|off|>2) fazia isso até enquanto ele "plantava" pra mirar.
         Agora o approach acima já leva o bot PRA FRENTE quando o alvo está longe (0.9), e a
         coluna só entra como uma correção MUITO suave, proporcional (sem degrau em ±2 m, que
         era o que flipava o sinal), limitada a 22% da velocidade e desligada quando ele está
         segurando ângulo. Sem degrau = sem flip. */
      /* E AGORA: ZERO. A rodada anterior amansou o puxão de coluna (proporcional, 22% da
         velocidade, sem degrau) mas não mudou a natureza dele — continuava sendo TRANSLAÇÃO
         EM X-MUNDO com o corpo travado olhando pro alvo, ou seja, o boneco andando de lado
         sem clipe que case. Medindo agora, 40% dos flips laterais que sobraram acontecem em
         COMBATE, e este é o único deslocamento lateral que restou lá. O objetivo dele
         (espalhar o time pela largura do mapa) já é cumprido pela coluna no ROAM, que é onde
         o bot anda de frente pra onde vai. Em combate o bot avança, recua, segura ou
         reposiciona — sempre com a animação certa. */
      const off = b.laneX - b.pos.x;
      if (BOT_MOVE2) {
        /* sem deslocamento lateral em combate — ver o bloco acima */
      } else if (dist > 20) {
        const lz = Math.sign(dz) || 1, ln = Math.hypot(off, lz) || 1;
        b.pos.x += (off / ln) * BOT_SPEED * 0.85 * dt;
        b.pos.z += (lz / ln) * BOT_SPEED * 0.85 * dt;
        moving = 1;
      } else if (Math.abs(off) > 2) {
        b.pos.x += Math.sign(off) * BOT_SPEED * 0.5 * dt;
      }
      this._collide(b.pos, 0.38);
      moving = Math.max(moving, Math.min(1, Math.abs(approach) + Math.abs(strafe)));
      // #23: bots jogam fumaça de vez em quando (cobrir avanço / quebrar linha de tiro).
      if (b.smokes === undefined) b.smokes = 2;
      if (b.smokes > 0 && this.time > (b._nextNade || 0) && dist > 16 && dist < 55 && Math.random() < dt * 0.12) {
        b.smokes--; b._nextNade = this.time + 10;
        const from = this._botEye(b);
        const tgt = e.isPlayer ? this.camera.position : this._botEye(e);
        const ndir = tgt.clone().sub(from); ndir.y += ndir.length() * 0.18;
        this._spawnGrenade(from, ndir.normalize(), 'smoke', b);
      }
      /* ===== MIRA QUE ARRASTA (b.aimErr = raio angular do erro, em rad) =====
         O bot não "trava" mais no alvo: o erro cai com o TEMPO DE FOCO (exponencial), tem um
         piso por skill, e sobe com a velocidade do alvo, com o recuo de cada tiro e quando o
         alvo some de vista. É isso que produz os padrões humanos — o primeiro tiro erra, o
         terceiro acerta; quem se mexe é mais difícil de acertar; quebrar visão custa caro
         pro bot. Sniper arrasta mais devagar (mira pesada) mas com piso menor. */
      {
        const snip0 = (BALL_CLASS[b.weapon] || 'rifle') === 'sniper';
        const eSp = e.isPlayer ? Math.hypot(e.vel.x, e.vel.z) : BOT_SPEED * 0.6;
        // Piso do erro (rad). Calibrado com o tamanho angular do tronco (atan(0.5/d)): bot
        // 'medio' parado acerta ~1/3 dos tiros a 30 m e ~97% a 10 m; alvo em movimento a 4,5
        // m/s derruba isso pra ~1/3 disso — é o que faz strafar valer a pena.
        // 0.012→0.015 no piso: com o teto de headshot o que sobra é o TRONCO, e o bot acertava
        // tronco demais de longe. O piso é ANGULAR, então distância já pesa sozinha.
        // Piso AUMENTADO (dono: "bots matam fácil demais, parece aimbot"): erra mais, sobretudo
        // de longe e em alvo que se mexe — dá tempo do jogador reagir e ver de onde veio.
        const floorErr = (snip0 ? 0.006 : 0.010) + (BOT_FAIR ? 0.028 : 0.020) / Math.max(0.4, b.skill) + eSp * 0.006 / Math.max(0.5, b.skill);
        // RE-AQUISIÇÃO ENTRE RAJADAS (medido): com rate 2.7 a mira voltava INTEIRA ao piso
        // durante a pausa de ~0,9 s (exp(-2,3) = 10% de resíduo), então TODA rajada começava
        // com um acerto garantido — 4 rajadas = 4 acertos = morte, e a janela travava em
        // ~2,3 s. Com 1,6 sobra ~30% do erro da rajada anterior: o bot precisa de duas
        // rajadas pra reassentar a mira, que é o "re-aquisição entre rajadas" que faltava.
        const rate = (snip0 ? 1.2 : 2.0) * Math.max(0.4, b.skill);
        b.aimErr = floorErr + ((b.aimErr === undefined ? 0.2 : b.aimErr) - floorErr) * Math.exp(-rate * dt);
        b.aimErr = Math.max(0.002, b.aimErr + (Math.random() - 0.5) * 0.02 * dt);   // micro-tremor
      }
      // FACA (w.range): bot de faca disparava hitscan a 40m como se fosse rifle — agora só
      // "ataca" no alcance real da arma; longe disso ele avança (o approach acima já faz isso).
      const _w0 = WEAPONS[b.weapon];
      const inRange = !(_w0 && _w0.range) || dist <= _w0.range + 0.6;
      // fire (bloqueado enquanto o alvo está stale/sem LOS — ver aquisição: sem wallhack)
      // TURNO DE DUELO: contra o JOGADOR só atira quem tem o token (ver _duelToken). Fora do
      // turno o bot continua manobrando/avançando — ele não congela, só não soma fogo.
      /* BUG-03 (1ª metade): `_duelToken` NÃO consulta, ele RESERVA por BOT_TOKEN_HOLD (1,6 s).
         Como esta linha roda TODO FRAME para TODO bot que mira o jogador, um bot que não tinha
         tiro nenhum roubava um dos 2 tokens e o segurava — e os que tinham ficavam mudos.
         MEDIDO (botdiag SIM_SHOOTGATE, 9 sementes × 4 mapas × 180 s, árvore congelada):
           mover a chamada pra DENTRO do if (depois de todos os gates)  3,8 epi | 6,73 s  PIOR
           só negar o token a quem não pode usar (abaixo)               2,4 epi | 5,08 s
           + devolver o token de quem não pode mais usar (_duelToken)   2,0 epi | 4,73 s  <-
           código anterior                                              2,6 epi | 5,23 s
         Por que a correção "óbvia" PIORA: chamada todo frame também é FILA — o bot que serve
         reação/cadência já chega com a permissão na mão e atira no instante em que o gate abre.
         Atrás do if isso vira DISPUTA no instante do gatilho, e quem perde come 1,6 s inteiros
         de silêncio (hasTurn saltou de 19% para 49% dos quadros mudos). O que separa os dois
         casos não é ONDE a chamada mora, é QUEM pode pegar: impedimento DURÁVEL (recarregando,
         cego, fora de alcance) desqualifica; impedimento IMINENTE (reação, foco, cadência) não. */
      const canUse = !b._losLost && inRange && this.time > (b.reloadUntil || 0);
      const hasTurn = !(BOT_FAIR && e.isPlayer) || (canUse && this._duelToken(b));
      if (this.time > b.reactAt && this.time > (b.focusUntil || 0) && this.time > b.nextShotAt && this.time > (b.reloadUntil || 0)
          && Math.abs(dy) < 0.3 && !b._losLost && inRange && hasTurn) {
        /* ===== TIRO DO BOT =====
           ANTES: dano FIXO (63 no jogador / 100 no bot), cadência 0.75-3.5s igual pra P90 e
           AWP, e um sorteio de acerto invisível (até 92%) que ignorava a parede no caminho.
           AGORA: a ARMA manda em dano/cadência/pente/recarga; o acerto é GEOMÉTRICO (o desvio
           sorteado tem que caber no tamanho angular do alvo — daí a distância pesa sozinha);
           e a bala testa o MUNDO antes do alvo (fim do acerto atrás de parede). */
        const Wb = WEAPONS[b.weapon] || WEAPONS.ak;
        const bcls = BALL_CLASS[b.weapon] || 'rifle';
        const sniper = bcls === 'sniper';
        if (b.mag === undefined) b.mag = Wb.mag || 30;
        b.mag--;
        b.revealedAt = this.time;
        // cadência: dentro da rajada = a da ARMA; entre rajadas, pausa humana por skill.
        if (Wb.auto) {
          if (b.burst > 0) { b.burst--; b.nextShotAt = this.time + Wb.rate * (1 + Math.random() * 0.15); }
          else {
            // RAJADA CURTA (ver BOT_SPRAY_K/b): era 1-6 tiros e MAIOR de perto — a rajada de
            // 6 tiros a 8 m entregava 4 acertos em 0,25 s. Agora 1-3 tiros, e a mais curta é
            // justamente a de perto, onde cada acerto dói mais.
            b.burst = BOT_FAIR ? (dist < 14 ? 1 : 2) + ((Math.random() * 2) | 0)
              : 1 + ((Math.random() * (dist < 14 ? 5 : 3)) | 0);
            b.nextShotAt = this.time + (BOT_FAIR ? BOT_BURST_PAUSE + Math.random() * 0.6 : 0.35 + Math.random() * 0.55) / Math.max(0.5, b.skill);
          }
        } else {
          // semi-auto: 0,3 s entre tiros de escopeta de 30 de dano também era melt.
          b.nextShotAt = this.time + Math.max(Wb.rate, (sniper ? 0.85 : (BOT_FAIR ? 0.55 : 0.3)) + Math.random() * (BOT_FAIR ? 0.6 : 0.5)) / Math.max(0.5, b.skill);
        }
        if ((Wb.mag || 0) > 0 && b.mag <= 0) { b.reloadUntil = this.time + (Wb.reload || 2.4); b.mag = Wb.mag; b.burst = 0; }
        b.aimErr += (Wb.recoil || 0.01) * (Wb.auto ? 0.6 : 0.4);   // cada tiro tira a mira do lugar (rajada abre)
        const from = this._botEye(b);
        const teye = (e.isPlayer ? this.camera.position.clone() : this._botEye(e));
        const tdist = Math.max(1, from.distanceTo(teye));
        // tamanho angular do alvo (meia-largura de tronco ~0.5 m)
        const halfAng = Math.atan2(0.5, tdist);
        const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
        const ox = gauss() * b.aimErr, oy = gauss() * b.aimErr * 0.8;
        const off = Math.hypot(ox, oy);
        let hit = off < halfAng;
        // CABEÇA: continua sendo consequência de mirar bem (off pequeno), mas com TETO
        // absoluto de 7% — sem isso o bot 'bom' virava o cheater que o dono descreveu.
        const hsChance = BOT_FAIR ? Math.min(BOT_HS_MAX, 0.05 * b.skill) : 0.16 * b.skill;
        const head = hit && off < halfAng * 0.35 && Math.random() < hsChance;
        const dir = teye.clone().sub(from).normalize();
        {   // aplica o desvio na base direita/cima do próprio tiro
          const rt = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
          if (rt.lengthSq() < 1e-6) rt.set(1, 0, 0);
          rt.normalize();
          const up = new THREE.Vector3().crossVectors(rt, dir).normalize();
          dir.addScaledVector(rt, Math.tan(ox)).addScaledVector(up, Math.tan(oy)).normalize();
        }
        // tracer & world impact
        this.ray.set(from, dir); this.ray.far = 200;
        const hitsW = this.ray.intersectObjects(this.world.occluders, false)[0];
        // NUNCA acerta atrás de parede: se o mundo está na frente do alvo, a bala morre lá.
        const blocked = !!(hitsW && hitsW.distance < tdist - 0.4);
        if (blocked) hit = false;
        let end = hitsW ? hitsW.point : from.clone().add(dir.clone().multiplyScalar(120));
        if (hit) {
          end = teye;
          let dmg = (Wb.dmg || 30) * (Wb.pellets ? Math.min(Wb.pellets, 6) * 0.55 : 1);
          const fo = DMG_FALLOFF[bcls];   // mesma tabela do jogador: P90 a 60m não mata como AWP
          if (fo) { const t = Math.max(0, Math.min(1, (tdist - fo[0]) / (fo[1] - fo[0]))); dmg *= 1 - (1 - fo[2]) * t; }
          // tabela de cabeça PRÓPRIA do bot (ver BOT_HS_MUL): rifle na cabeça = 72, não 115.
          if (head) dmg *= BOT_FAIR ? (BOT_HS_MUL[bcls] || 2.0) : (HS_MUL[bcls] || 3) * 0.8;
          const dmgMul = e.isPlayer ? (BOT_FAIR ? this._botDmgPlayer : BOT_DMG_PLAYER) : 1;
          dmg = Math.max(6, Math.min(e.isPlayer ? 100 : 130, Math.round(dmg * dmgMul)));
          this._damage(e, dmg, b, Wb.short || 'AWP', head, teye);   // arma real do bot no killfeed
          // sangue do tiro do BOT: bot×bot = efeito completo (spray + chão); jogador levando
          // tiro = só decals (chão/parede), sem o spray gordo estourando na câmera.
          if (BLOOD) { if (e.isPlayer) this._bloodSpatter(teye, dir, head, e.pos ? e.pos.y : null); else this._fleshImpact(teye, dir, head, e.pos ? e.pos.y : null, false); }
          if (e.isPlayer) this._noteHit(b, Wb.short || 'ARMA', dmg, head, tdist);
        } else if (hitsW && Math.random() < 0.5) this._puff(hitsW.point, hitsW.face ? hitsW.face.normal : null);
        /* COICE PROPORCIONAL AO ALVO (ver BOT_SPRAY_K). Somado DEPOIS de resolver o tiro: o
           1º tiro da rajada continua encostando (o jogador precisa sentir "levei tiro"), o 2º
           e o 3º abrem. Em múltiplos do tamanho angular do alvo pra degradar igual a 6 m e a
           40 m; o clamp mantém o valor ABSOLUTO sensato (nem colar no ombro a 60 m, nem virar
           28° de erro a 3 m, que seria bot cego no encostado). */
        if (BOT_FAIR) {
          const kickBase = Math.max(0.013, Math.min(0.075, halfAng));
          b.aimErr += kickBase * BOT_SPRAY_K * (Wb.auto ? 1 : 1.35);
        }
        // COMUNICAÇÃO: quem atira acorda os colegas por perto (abre a visão deles por 6s) —
        // é o motivo de o combate "puxar" gente em vez de acontecer em bolhas isoladas.
        for (const o of this.bots) {
          if (o === b || !o.alive || o.team !== b.team) continue;
          if (Math.hypot(o.pos.x - b.pos.x, o.pos.z - b.pos.z) < 30) o.alertUntil = Math.max(o.alertUntil || 0, this.time + 6);
        }
        // whizz: quase-acerto no JOGADOR = projétil passando do ouvido (mix por distância).
        // `blocked` evita o whizz de uma bala que parou na parede antes de chegar perto.
        if (!hit && !blocked && e.isPlayer) {
          const toEar = this.camera.position.clone().sub(from);
          const along = toEar.dot(dir);
          if (along > 0) { const perpSq = toEar.lengthSq() - along * along; if (perpSq > 0 && perpSq < 9) this.sfx.whizz(Math.sqrt(perpSq)); }
        }
        // som da arma REAL do bot com MIX POR DISTÂNCIA no synth (perto=crack, longe=boom)
        // + PAN ESTÉREO pela direção relativa à câmera (mesma conta do damage indicator)
        // + delay de propagação (dist/343, estilo CoD) — só em bots; player segue central.
        const _sd = Math.hypot(b.pos.x - this.player.pos.x, b.pos.z - this.player.pos.z);
        const _rel = Math.atan2(b.pos.x - this.player.pos.x, b.pos.z - this.player.pos.z) - this.player.yaw;
        const _pan = Math.max(-0.85, Math.min(0.85, Math.sin(_rel) * 0.8));
        // ORÇAMENTO DE FX (60fps em GPU de notebook): com rajadas reais, 8 bots podem disparar
        // ~50 tiros/s — cada um custa tracer + voz do synth. Perto (<45m) sai tudo; longe (ou
        // em quality 'low') sai 1 a cada 2. O DANO e o raycast nunca são afetados, só o enfeite.
        const fxTick = (b._fxTick = (b._fxTick || 0) + 1);
        // SEMPRE FX cheio quando o bot atira NO JOGADOR (dono: "não vejo de onde vem o tiro,
        // parece cheater"): tracer + som direcional em todo tiro contra o player, mesmo de longe
        // ou em quality low. Só o throttle bot-vs-bot distante segue valendo (orçamento de GPU).
        const fxFull = e.isPlayer || (_sd < 45 && this.settings.quality !== 'low') || (fxTick % 2) === 0;
        if (fxFull) {
          this._tracer(from.clone().add(dir.clone().multiplyScalar(0.7)), end);
          this.sfx.shotWeapon(b.weapon, _sd, 0.45, _pan, Math.min(0.25, _sd / 343));   // bots MUITO mais baixos que a arma do jogador (carabina de bot estourava o mix)
        }
        this._flash(from.clone().add(dir.clone().multiplyScalar(0.85)), dir);   // GPU-batched: 1 draw call
        if (b.mesh.isGLB) b.mesh.ctrl.shoot();
      }
    } else if (this.ctf) {
      // --- CTF: procurar e segurar um ponto capturável (o combate acima ainda tem prioridade)
      this._botCtf(b, dt);
      moving = b._ctfMoving || 0;
    } else {
      // --- roam toward enemy half
      // INTERVALO MÍNIMO DE RERROTA (0,25 s). O `!b.path ||` curto-circuitava o `repathAt`:
      // qualquer branch que zerasse a rota fazia o A* rodar TODO FRAME, e o `from` =
      // nearestWaypoint pulava entre dois nós vizinhos a cada quadro — alvo de rotação
      // oscilando, que é o "girando em torno de si mesmo". Agora o intervalo é de verdade
      // (a caminhada de escape cobre a espera, então o bot não congela).
      if ((!b.path || this.time > b.repathAt) && this.time >= (b._repathMin || 0)) {
        b._repathMin = this.time + 0.25;
        b.repathAt = this.time + 2.5;
        const W = this.world;
        // G2-R6A: o `from` = nearestWaypoint podia estar ATRÁS de uma parede (nó (-8.4,34)
        // do piscinão fica do outro lado do muro das ilhotas) — o bot nunca alcançava
        // path[0] e ficava serrilhando a quina do muro ("andando pro lado e pro outro",
        // latFlips 68-94/min medido). Agora escolhe o nó mais próximo FISICAMENTE
        // ALCANÇÁVEL: simula a caminhada reta com _collide (a mesma física do bot).
        let from = W.nearestWaypoint(b.pos.x, b.pos.z);
        let pocket = false;
        if (!this._walkReach(b, W.waypoints.nodes[from])) {
          let found = -1;
          const cands = W.waypoints.nodes
            .map((n, i) => ({ i, d: (n.x - b.pos.x) ** 2 + (n.z - b.pos.z) ** 2 }))
            .sort((a, c) => a.d - c.d);
          for (let k = 0; k < Math.min(6, cands.length); k++) if (this._walkReach(b, W.waypoints.nodes[cands[k].i])) { found = cands[k].i; break; }
          if (found >= 0) from = found;
          else {
            // BOLSO sem nó alcançável: caminhada de escape ~1s numa direção livre (sai da
            // quina seguindo a parede) e tenta de novo no próximo repick de rota.
            // CAUSA-RAIZ #5 ("rodando em volta de si mesmo"): a direção de escape era um
            // Math.random()*2π. Metade das vezes ela caía ATRÁS do bot, e como o giro é
            // dt*6 (~1 s pra 180°) ele passava a fuga inteira PIVOTANDO PARADO — que é
            // exatamente a pirueta que o dono descreve. Agora sondamos 8 direções com a
            // física real (_collide) e escolhemos a que anda mais, com desempate a favor da
            // direção MAIS PARECIDA COM A ATUAL: ele sai andando, quase sem girar.
            b._escapeUntil = this.time + 1.0;
            b._escapeYaw = BOT_MOVE2 ? this._freeYaw(b, 3.0) : Math.random() * Math.PI * 2;
            b.path = null; b.repathAt = this.time + 1.0;
            pocket = true;
          }
        }
        if (!pocket && (this.time > (b.roamUntil || 0) || b.roamIdx === undefined)) {
          // Enemy direction derived from the spawn LAYOUT (not hardcoded — the spawn
          // swap P<->B would otherwise silently flip the roam side and keep bots home).
          const sP = this.world.spawns.E[0], sB = this.world.spawns.B[0];
          const enemyDir = sB && sP ? Math.sign(sB.z - sP.z) || 1 : 1;
          const sign = b.team === 'E' ? enemyDir : -enemyDir;
          // Lane DETERMINÍSTICA por ordinal no time: o ônibus central + a cobertura à
          // esquerda funilavam TODOS pra esquerda (medido: L61/C35/R3) mesmo com alvo à
          // direita. Agora cada bot recebe uma coluna x fixa e espalhada por toda a largura,
          // e o alvo é o nó da metade inimiga mais perto de (laneX, z-profundo) — força a
          // ocupar esquerda/centro/direita e evita o "andam em bando".
          // z-alvo: fundo da metade inimiga, alternando profundidade por bot E POR DESTINO
          // (anti-milling G2-R6A: chegando ao fundo, o mesmo nó era re-alvejado pra sempre
          // com o jitter ±4 flipando entre 2 vizinhos — "andando pro lado e pro outro").
          b._roamN = (b._roamN || 0) + 1;
          const zi = (b.roamSeed + b._roamN) % 3;
          const midZ = (W.bounds.minZ + W.bounds.maxZ) * 0.5;
          const edgeZ = sign > 0 ? W.bounds.maxZ : W.bounds.minZ;
          const deepZ = this.__mutBotDepth
            ? sign * (22 + zi * 16)
            : midZ + (edgeZ - midZ) * [0.42, 0.65, 0.86][zi];
          if (b._unreach && b._unreach.size > 12) b._unreach.clear();   // não esgota o mapa
          let best = -1, bd = 1e9, bestAny = -1, bdAny = 1e9;
          let bestFar = -1, bdFar = 1e9, bestFree = -1, bdFree = 1e9;   // fora da ilha do bot (fallback)
          const nodes = W.waypoints.nodes;
          /* (1) SÓ NÓ ALCANÇÁVEL: o componente conexo do grafo (ver _wpComp) é o filtro que
                 faltava. Sem ele, 45% dos destinos do lado que ataca a Loja H caíam nas ilhas
                 do grafo (faixa externa do prédio / mezanino) e a rerrota inteira era perdida.
             (2) ALVO JÁ RESERVADO POR UM COLEGA custa caro: sem isso o custo (coluna+
                 profundidade+virada) é quase o mesmo pra todo mundo do time e eles escolhem
                 O MESMO nó — daí a fila indiana e a pilha no funil da porta. Não é proibição
                 (mapa apertado ainda deixa dois no mesmo canto), é um pedágio. */
          const comp = BOT_CROWD ? this._wpComp() : null;
          const myComp = comp && comp.length ? comp[from] : -1;
          let taken = null;
          if (BOT_CROWD) {
            for (const o of this.bots) {
              if (o === b || !o.alive || o.team !== b.team) continue;
              const t = o.roamIdx !== undefined && nodes[o.roamIdx];
              if (t) (taken || (taken = [])).push(t);
            }
          }
          for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (n.z * sign <= 4 * sign) continue;            // só metade inimiga
            const offIsland = comp && myComp >= 0 && comp[i] !== myComp;   // ilha do grafo: o bot NUNCA chegaria lá
            if (b._unreach && b._unreach.has(i)) continue;   // inalcançável conhecido (grafo desconexo)
            /* CUSTO DE VIRADA no escolha do destino (mesma ideia do _freeYaw). Antes o
               destino era escolhido só por coluna/profundidade, então metade das vezes ele
               caía ATRÁS do bot: ele chegava num objetivo e dava meia-volta pra ir ao
               próximo. Cada meia-volta dessas é ~0,9 s de corpo girando — e girar andando é
               justamente o que a medição lê como "andando de lado" (47-62% dos flips
               acontecem em frames de giro >0,25 rad). Somando ~2,6 m de "custo" por radiano
               de virada, o bot encadeia objetivos NA DIREÇÃO EM QUE JÁ VAI, como gente
               varrendo um mapa — e só vira de verdade quando vale a pena. */
            let d = Math.abs(n.x - b.laneX) * 2.2 + Math.abs(n.z - deepZ) + Math.random() * 4;
            if (BOT_MOVE2) {
              const ang = Math.atan2(n.x - b.pos.x, n.z - b.pos.z) - b.yaw;
              d += Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang))) * 2.6;
            }
            /* pedágio de destino JÁ RESERVADO por um colega vivo (raio 5 m, custo 12 — o
               equivalente a ~5 m de coluna). Foi MEDIDO: com pedágio 30/raio 8 m ele domina
               os outros termos, o bot aceita dar meia-volta pra achar nó livre e ANDA PRA
               TRÁS (o "não estão jogando" volta por outra porta). Com 12/5 m o time se abre
               sem deixar de atacar: aglomerado na porta 33,1% -> 27,0% das ocorrências. */
            if (taken) for (const t of taken) {
              const tx = n.x - t.x, tz = n.z - t.z;
              if (tx * tx + tz * tz < 25) { d += 12; break; }
            }
            /* O filtro de ilha entra como SEGUNDA LISTA, não como `continue` seco: um bot que
               ficou preso numa ilha (comp sem nenhum nó na metade inimiga) não pode ficar sem
               destino nenhum — aí ele mira o próprio nó e trava de vez, que é pior que o bug
               original. Fora da ilha ele escolhe entre os alcançáveis; sem alcançável, cai na
               lista livre (comportamento antigo) e a rota + a fuga de bolso resolvem. */
            if (!offIsland) { if (d < bdAny) { bdAny = d; bestAny = i; } }
            else if (d < bdFree) { bdFree = d; bestFree = i; }
            // não re-alveja nó colado ao bot (≤7m): senão ele "chega" na hora e o jitter
            // flipa o alvo entre vizinhos — o milling A→B→A medido no piscinão.
            if (Math.hypot(n.x - b.pos.x, n.z - b.pos.z) < 7) continue;
            if (!offIsland) { if (d < bd) { bd = d; best = i; } }
            else if (d < bdFar) { bdFar = d; bestFar = i; }
          }
          b.roamIdx = best >= 0 ? best : bestAny >= 0 ? bestAny
            : bestFar >= 0 ? bestFar : bestFree >= 0 ? bestFree : from;
          b.roamUntil = this.time + 12;
        }
        if (!pocket) {
          b.path = this._findPathLocal(W, from, b.roamIdx, b._banNodes); b.pathIdx = 1;
          if (BOT_MOVE2) b.path = this._pullString(b, b.path);
          // Alvo INALCANÇÁVEL (findPath devolve [from] — ilhas do grafo desconexo, ex.: as
          // ilhotas do piscinão): antes o bot "seguia" o próprio nó mais próximo e ficava
          // orbitando/oscilando no lugar. Marca e re-alveja outro nó no próximo repick.
          if (b.path.length <= 1 && from !== b.roamIdx) {
            (b._unreach || (b._unreach = new Set())).add(b.roamIdx);
            b.roamUntil = 0;
          }
        }
      }
      if (this.time < (b._escapeUntil || 0)) {
        // Caminhada de escape de BOLSO (nenhum waypoint alcançável — ver repath acima):
        // anda ~1s na direção livre sorteada, deslizando pela parede (_collide) até uma
        // posição com rota. Sem isso o bot serrilhava a quina do muro pra sempre.
        let edy = b._escapeYaw - b.yaw;
        while (edy > Math.PI) edy -= Math.PI * 2; while (edy < -Math.PI) edy += Math.PI * 2;
        b.yaw += Math.max(-YAW_CAP * dt, Math.min(YAW_CAP * dt, edy * Math.min(1, dt * 6)));   // mesmo teto de giro do roam
        b.pos.x += Math.sin(b.yaw) * BOT_SPEED * 0.8 * dt;
        b.pos.z += Math.cos(b.yaw) * BOT_SPEED * 0.8 * dt;
        this._collide(b.pos, 0.38);
        moving = 1;
      } else if (b.path) {
      // Avança o índice ao CHEGAR no nó atual (raio 1.5 — 0.7 era pequeno demais: com o
      // repath de 2.5s que reseta pathIdx=1, a ~1.65 m/s o bot não alcançava path[1] (~4.4m)
      // dentro da janela, então pathIdx NUNCA passava de 1 e ele serrilhava o 1º nó perto do
      // spawn). O while permite pular vários nós já ultrapassados. E MIRA ~2 nós à frente
      // (look-ahead) pra cortar a serrilha do grid e cruzar RETO — dobra a velocidade líquida
      // rumo ao inimigo (medido: net 1.65 -> ~3.3 m/s), fazendo os dois times chegarem ao meio.
      const _wp = this.world.waypoints.nodes;
      let _guard = 0;
      while (b.pathIdx < b.path.length - 1 && _guard++ < 8) {
        const c = _wp[b.path[b.pathIdx]];
        if (c && Math.hypot(c.x - b.pos.x, c.z - b.pos.z) < 1.5) b.pathIdx++; else break;
      }
      if (b.pathIdx >= b.path.length - 1) {
        const last = _wp[b.path[b.path.length - 1]];
        /* CAUSA-RAIZ do "rodando em volta de si mesmo" (e de parte dos flips laterais):
           ao CHEGAR no último nó, o código zerava `roamUntil` mas o repath só acontecia
           quando `time > repathAt` — até 2,5 s depois. Nesse intervalo o bot continuava
           mirando um nó a menos de 1 m: o atan2 de um vetor quase nulo gira 180° com um
           passo de 20 cm, então ele PIVOTAVA em torno do próprio destino. Agora chegar
           libera o repath NO MESMO FRAME (repathAt=0): destino novo, rumo estável. */
        if (last && Math.hypot(last.x - b.pos.x, last.z - b.pos.z) < 1.2) { b.roamUntil = 0; b.repathAt = 0; }
      }
      // MIRA no nó atual do path (não +2): com o A* reto, seguir o path fielmente contorna os
      // obstáculos. O look-ahead +2 cortava a quina PRA DENTRO do obstáculo -> o bot batia e
      // oscilava fwd/back sem desviar. Agora ele acompanha a curva do path ao redor da geometria.
      const node = b.path ? _wp[b.path[Math.min(b.pathIdx, b.path.length - 1)]] : null;
      if (node && !this._walkReach(b, node)) {
        // Hop fisicamente intransitável (aresta que passou no segClear do mapa mas não
        // cabe o bot r=0.38 — ex.: quina do muro das ilhotas): bane o nó e rerroteia.
        (b._banNodes || (b._banNodes = new Set())).add(b.path[Math.min(b.pathIdx, b.path.length - 1)]);
        if (b._banNodes.size > 24) b._banNodes.clear();
        /* CAUSA-RAIZ do "travando" (medido: 92% das amostras de bot parado tinham b.path
           NULO e velocidade < 0,1 m/s). Este branch zerava a rota e NÃO MOVIA o bot no
           frame — e como banir um nó costuma fazer o A* devolver outro nó igualmente
           intransitável, o ciclo banir→rerrotar→banir se repetia por dezenas de frames com
           o boneco PLANTADO no chão. Agora banir também dispara uma caminhada de escape
           curta na direção livre: enquanto a rota é reconstruída ele continua ANDANDO,
           que é o que o dono precisa ver. */
        b.path = null;
        b._escapeUntil = Math.max(b._escapeUntil || 0, this.time + 0.35);
        b._escapeYaw = this._freeYaw(b, 2.5);
        b.repathAt = this.time + 0.3;
      } else if (node) {
        const dx = node.x - b.pos.x, dz = node.z - b.pos.z;
        {
          /* RUMO SUAVIZADO (b._hdg). Medido em botdiag: 62% dos "flips laterais" acontecem
             num frame em que o bot girou mais de 0,25 rad em 150 ms (mediana 0,35 rad =
             133°/s). Ou seja, o "andando de lado" que sobrou NÃO é passo lateral — é o
             corpo pivotando enquanto anda, e o deslocamento sai atravessado em relação ao
             corpo. Duas travas, as duas atacando a causa e não o sintoma:
             1. o rumo desejado é um FILTRO do rumo do nó (constante ~0,45 s), então trocar
                de nó/rota não teleporta o alvo de rotação — ele migra;
             2. abaixo de 1,2 m do nó o atan2 fica numericamente instável (vetor quase nulo
                gira 180° com meio passo): nessa faixa o rumo CONGELA e o bot atravessa o
                nó andando reto, em vez de piruetar em cima dele. */
          const dn = Math.hypot(dx, dz);
          const want = Math.atan2(dx, dz);
          if (b._hdg === undefined) b._hdg = want;
          if (dn > 1.2) {
            let hd = want - b._hdg;
            while (hd > Math.PI) hd -= Math.PI * 2; while (hd < -Math.PI) hd += Math.PI * 2;
            b._hdg += hd * Math.min(1, dt * 2.2);
          }
          let dy = b._hdg - b.yaw;
          while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
          // Giro com TETO DE VELOCIDADE (3,4 rad/s ≈ 195°/s). Antes era dt*12, que a 60 fps
          // deixa o bot virar 720°/s: qualquer troca de nó do A* virava um pião. Com teto, um
          // 180° custa ~0,9 s e lê como uma curva de pessoa.
          const turn = dy * Math.min(1, dt * (BOT_MOVE2 ? 6 : 12));
          b.yaw += BOT_MOVE2 ? Math.max(-YAW_CAP * dt, Math.min(YAW_CAP * dt, turn)) : turn;
          const bSlow = this.world.slowAt && this.world.slowAt(b.pos.x, b.pos.z) ? 0.5 : 1;  // bots também vadear
          const px = b.pos.x, pz = b.pos.z;
          b.pos.x += Math.sin(b.yaw) * BOT_SPEED * bSlow * dt;
          b.pos.z += Math.cos(b.yaw) * BOT_SPEED * bSlow * dt;
          this._collide(b.pos, 0.38);
          moving = 1;
          // stuck detection: barely moved (blocked by geometry) -> sidestep + pick a new
          // target so bots don't grind against a box or all funnel to the same spot.
          const moved = Math.hypot(b.pos.x - px, b.pos.z - pz);
          /* ANTI-PIRUETA: acumula o giro feito ENQUANTO quase parado. Girar andando é curva;
             girar sem sair do lugar é o bug "rodando em volta de si mesmo". Passou de 4,5 rad
             (~260°) sem deslocar, a rota é dada como envenenada: bane o nó, força uma
             caminhada de escape na direção livre mais próxima e zera o acumulador. */
          if (BOT_MOVE2 && moved < BOT_SPEED * bSlow * dt * 0.5) {
            b._spinAcc = (b._spinAcc || 0) + Math.abs(turn);
            if (b._spinAcc > 4.5) {
              b._spinAcc = 0;
              (b._banNodes || (b._banNodes = new Set())).add(b.path[Math.min(b.pathIdx, b.path.length - 1)]);
              if (b._banNodes.size > 24) b._banNodes.clear();
              b._escapeUntil = this.time + 0.9; b._escapeYaw = this._freeYaw(b, 3.5);
              b.path = null; b.repathAt = this.time + 0.9;
            }
          } else b._spinAcc = Math.max(0, (b._spinAcc || 0) - Math.abs(turn) * 2);
          if (moved < BOT_SPEED * bSlow * dt * 0.35) {
            b._stuckT = (b._stuckT || 0) + dt;
            if (b._stuckT > (BOT_MOVE2 ? 0.35 : 0.5)) {   // reage mais cedo: 0,5 s raspando a quina já é visível
              // NÃO re-escolhe o alvo (isso causava milling perto do spawn). Mantém o objetivo
              // longe e só REROTA + passo lateral p/ destravar. G2-R6A: o passo era ±0.5 em
              // X-MUNDO ALEATÓRIO a cada 0.5s — jitter esquerda-direita contínuo (latFlips
              // 68-85/min no piscinão). Agora: lateral relativo ao bot, lado FIXO no episódio
              // (só flipa após 3 destravos sem sair) — contorna o obstáculo em vez de serrilhar.
              // CAUSA-RAIZ #4: o destravamento era um TELEPORTE de 0,5 m pro lado, aplicado a
              // cada 0,5 s. Além de contar como flip lateral na medição, na tela é um salto —
              // o personagem escorrega 50 cm sem passo. Agora vira uma JANELA de deslize
              // (0,55 s) somada ao movimento normal: ele contorna o obstáculo andando.
              // O repath também ganhou intervalo mínimo (0,4 s): zerar repathAt todo frame
              // reconstruía o A* e o `from` pulava entre nós vizinhos -> o alvo de rotação
              // oscilava e o bot girava em torno de si (o 3º sintoma do dono).
              b.repathAt = BOT_MOVE2 ? this.time + 0.25 : 0; b.path = null; b._stuckT = 0;
              if (!b._stuckSide) { b._stuckSide = Math.random() < 0.5 ? -1 : 1; b._stuckFlips = 0; }
              if ((b._stuckFlips = (b._stuckFlips || 0) + 1) > 3) { b._stuckSide = -b._stuckSide; b._stuckFlips = 0; }
              if (BOT_MOVE2) { b._sideUntil = this.time + 0.5; b._sideDir = b._stuckSide; }
              else { b.pos.x += Math.cos(b.yaw) * b._stuckSide * 0.5; b.pos.z += -Math.sin(b.yaw) * b._stuckSide * 0.5; this._collide(b.pos, 0.38); }
            }
          } else { b._stuckT = 0; b._stuckSide = 0; }
          // deslize lateral do destravamento (contínuo, não teleporte)
          if (this.time < (b._sideUntil || 0)) {
            b.pos.x += Math.cos(b.yaw) * (b._sideDir || 1) * BOT_SPEED * 0.95 * dt;
            b.pos.z += -Math.sin(b.yaw) * (b._sideDir || 1) * BOT_SPEED * 0.95 * dt;
            this._collide(b.pos, 0.38);
          }
        }
      }
      }
    }
    this._botSeparation(b, dt);   // empurra pra longe de colegas próximos -> não andam em fila colados
    this._updateTeamMark(b);      // halo/chevron acompanham o corpo (custa 2 objetos por bot)
    /* BOT FICA NA CAMADA DE CIMA — DE PROPÓSITO, E O PREÇO ESTÁ MEDIDO.
       O `yRef` daqui foi RETIRADO quando a Havan ganhou chão embaixo do mezanino INTEIRO
       (map_havan.js). Com ele o bot passa a poder andar no piso da loja sob a laje — só
       que o A* é um grafo de (x, z) SEM CAMADA: o nó embaixo da laje e o nó em cima dela
       são o MESMO ponto, então o bot desce sem plano nenhum e fica moendo lá embaixo.
       Medido (`node tools/eval/botsim.mjs 60 loja_h`, determinístico):

         bot COM camada:  latFlips 13,88 · fwdFlips 6,58 · stuck  8,98 % · eff 0,241
         bot SEM camada:  latFlips 11,10 · fwdFlips 7,23 · stuck  1,73 % · eff 0,226

       5× mais bot travado é regressão que o dono VÊ; o jogador não perde nada, porque
       quem usa o vão é ele. Grafo com camada continua sendo a segunda metade desta
       frente (BUG-22) — e é exatamente o que falta pra devolver o `yRef` aqui. */
    b.pos.y = this.world.groundHeightAt(b.pos.x, b.pos.z);
    g.position.copy(b.pos);
    g.rotation.set(0, b.yaw, 0);
    if (b.mesh.isGLB) {
      b.mesh.ctrl.setCrouch(!!b.target && b.crouchBias);
      // "olhar pra baixo": os clipes de rifle-hold assam ~13° de inclinação da cabeça
      // pra baixo. Passa o pitch vertical olho→olho do alvo (clamp ±15°) pro controller
      // fechar o loop no osso da cabeça; sem alvo, 0 = olhar na horizontal pra onde anda.
      {
        const e = b.target;
        let aim = 0;
        if (e) {
          const teyeY = e.isPlayer ? this.camera.position.y : e.pos.y + BOT_EYE;
          const hd = Math.hypot(e.pos.x - b.pos.x, e.pos.z - b.pos.z) || 1;
          aim = Math.max(-BOT_AIM_PITCH, Math.min(BOT_AIM_PITCH, Math.atan2(teyeY - (b.pos.y + BOT_EYE), hd)));
        }
        b.mesh.ctrl.aimPitch = aim;
      }
      // (removido) "hop" cosmético ao vagar: tocava o CLIP de pulo sem pulo físico real
      // (b.pos.y não muda), então o bot deslizava no chão com as pernas encolhidas — parte do
      // bug "andam deslizando sem mexer as pernas". Sem valor suficiente pra manter o artefato.
      // true ground speed (accounts for collisions / wading / being stuck) drives the
      // leg-cycle rate so the feet plant instead of sliding. The FORWARD-signed component
      // tells the controller when the bot is retreating, so it plays the walk clip in
      // reverse (backpedal) instead of moonwalking forward while moving backward.
      if (b._lp) {
        const dtSafe = Math.max(dt, 1e-3);
        const mx = b.pos.x - b._lp.x, mz = b.pos.z - b._lp.z;
        const spd = Math.hypot(mx, mz) / dtSafe;
        const fwd = (mx * Math.sin(b.yaw) + mz * Math.cos(b.yaw)) / dtSafe;
        b._lp = { x: b.pos.x, z: b.pos.z };
        // Pernas dirigidas pela VELOCIDADE REAL (spd), NÃO pela flag `moving`. Bug do deslize:
        // vários branches (CTF, empurrão de colisão, nudge de destravamento, avanço por lane)
        // moviam o bot sem setar `moving`, então `spd<0.35?0:moving` dava 0 e o char ficava em
        // idle/shoot (pernas estáticas) deslizando. Atrelar ao spd faz as pernas ciclarem SEMPRE
        // que o corpo transladar (>0.35 m/s), inclusive atirando em movimento (walkfire).
        const mv = spd < 0.35 ? 0 : 1;
        b.mesh.ctrl.update(dt, mv, !!b.target, spd, fwd < -0.25);
      } else {
        b._lp = { x: b.pos.x, z: b.pos.z };
        b.mesh.ctrl.update(dt, moving, !!b.target, 0, false);
      }
    } else {
      b.phase += dt * (moving ? 9 : 0);
      poseCharacter(b.mesh.parts, b.phase, moving, this.time);
    }
  }

  // BOTBRAIN: serializa os frames gravados e entrega pro main.js enviar (fetch → endpoint).
  _flushTraining() {
    try {
      if (!this._recorder || !this._recordEnabled || this._recorder.count === 0) return;
      const blob = this._recorder.flush({
        map: this._mapId, mode: this.ctf ? 'ctf' : 'rounds',
        weapon: this.player.weapon,
      });
      if (blob) this.onTrainingFrames?.(blob);
      this._recorder.reset();
    } catch {}
  }

  // A rede decide a 10 Hz; movimento, colisão e dano continuam usando as regras do jogo.
  _updateBotNN(b, dt) {
    const g = b.mesh.group;
    if (this.time < b.protUntil) g.visible = Math.floor(this.time * 12) % 2 === 0;
    else if (!g.visible) g.visible = true;
    if (b._lastHp !== undefined && b.hp < b._lastHp) b._hurtAt = this.time;
    b._lastHp = b.hp;

    // decisão da rede a ~10 Hz (segura entre ticks)
    b._nnMem = b._nnMem || { target: null, lastSeenAt: -99 };
    b._nnThink = (b._nnThink || 0) - dt;
    if (b._nnThink <= 0 || !b._nn) {
      b._nnThink = 0.1;
      const vx = b._nnLp ? (b.pos.x - b._nnLp.x) / 0.1 : 0, vz = b._nnLp ? (b.pos.z - b._nnLp.z) / 0.1 : 0;
      const self = { pos: b.pos, vel: { x: vx, z: vz }, yaw: b.yaw, pitch: 0, hp: b.hp, weapon: b.weapon, mag: b.mag, team: b.team, isPlayer: false };
      const raw = sense(this, self, this._botEye(b), b._nnMem, this.time);
      const out = this._botBrain.decideFromState(buildState(raw));
      if (out) { b._nn = out; b._nnLp = { x: b.pos.x, z: b.pos.z }; }
      b.target = b._nnMem.target || null;   // p/ o mesh (crouch/aimPitch) e o gate de tiro
    }
    const nn = b._nn || { moveFwd: 0, moveStrafe: 0, dyaw: 0, dpitch: 0, fire: 0, crouch: 0, reload: 0 };
    const mix = Math.min(1, this.botBrainMix);

    // MIRA: aplica o dyaw da rede, limitado pelo teto de giro humano (YAW_CAP)
    const cap = YAW_CAP * dt;
    b.yaw += Math.max(-cap, Math.min(cap, nn.dyaw * mix * 60 * dt));

    // MOVIMENTO: converte fwd/strafe (local) pra velocidade de mundo e passa pelo colisor
    const sin = Math.sin(b.yaw), cos = Math.cos(b.yaw);
    const fwd = Math.max(-1, Math.min(1, nn.moveFwd)), strafe = Math.max(-1, Math.min(1, nn.moveStrafe));
    const wx = fwd * sin + strafe * cos, wz = fwd * cos - strafe * sin;
    const spd = BOT_SPEED * mix;
    b.pos.x += wx * spd * dt; b.pos.z += wz * spd * dt;
    this._collide(b.pos, 0.38);
    this._botSeparation(b, dt);   // reusa a despenetração (evita empilhar bots)
    b.pos.y = this.world.groundHeightAt(b.pos.x, b.pos.z);
    const moving = Math.hypot(wx, wz) > 0.15 ? 1 : 0;

    // TIRO: a rede decide QUANDO; a resolução reusa as primitivas honestas do jogo
    if (b.mag === undefined) b.mag = (WEAPONS[b.weapon] || WEAPONS.ak).mag || 30;
    const e = b.target;
    // limiar 0.35: a "intenção de fogo" fica ~0.35-0.55 no engajamento (rótulo de rajada);
    // o gate de cadência (nextShotAt) é quem controla o RITMO real dos tiros.
    if (e && e.alive && nn.fire > 0.35 && this.time > (b.nextShotAt || 0) && this.time > (b.reloadUntil || 0)) {
      this._botShootNN(b, e);
    }

    // mesh + rotação + marca de time (espelha a cauda do _updateBot)
    g.position.copy(b.pos);
    g.rotation.set(0, b.yaw, 0);
    if (b.mesh.isGLB) {
      b.mesh.ctrl.setCrouch(!!e && nn.crouch > 0.5);
      let aim = 0;
      if (e) {
        const teyeY = e.isPlayer ? this.camera.position.y : e.pos.y + BOT_EYE;
        const hd = Math.hypot(e.pos.x - b.pos.x, e.pos.z - b.pos.z) || 1;
        aim = Math.max(-BOT_AIM_PITCH, Math.min(BOT_AIM_PITCH, Math.atan2(teyeY - (b.pos.y + BOT_EYE), hd)));
      }
      b.mesh.ctrl.aimPitch = aim;
      const lp = b._lp || { x: b.pos.x, z: b.pos.z };
      const mx = b.pos.x - lp.x, mz = b.pos.z - lp.z;
      const sp = Math.hypot(mx, mz) / Math.max(dt, 1e-3);
      b._lp = { x: b.pos.x, z: b.pos.z };
      b.mesh.ctrl.update(dt, sp < 0.35 ? 0 : 1, !!e, sp, false);
    } else {
      b.phase = (b.phase || 0) + dt * (moving ? 9 : 0);
      poseCharacter(b.mesh.parts, b.phase, moving, this.time);
    }
    this._updateTeamMark(b);
  }

  // Tiro do bot-NN: honesto (arma real, falloff, teto no jogador, sem acerto atrás de parede).
  _botShootNN(b, e) {
    const Wb = WEAPONS[b.weapon] || WEAPONS.ak;
    const bcls = BALL_CLASS[b.weapon] || 'rifle';
    b.mag--;
    b.revealedAt = this.time;
    b.nextShotAt = this.time + Math.max(Wb.rate || 0.1, (Wb.auto ? 0.12 : 0.4)) ;
    if ((Wb.mag || 0) > 0 && b.mag <= 0) { b.reloadUntil = this.time + (Wb.reload || 2.4); b.mag = Wb.mag; }
    const from = this._botEye(b);
    const teye = e.isPlayer ? this.camera.position.clone() : this._botEye(e);
    const tdist = Math.max(1, from.distanceTo(teye));
    const dir = teye.clone().sub(from).normalize();
    // desvio de mira por skill (a rede diz "atira"; a precisão fina segue o tier do bot)
    const err = 0.02 + 0.03 / Math.max(0.4, b.skill || 1);
    const gs = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    const off = Math.hypot(gs() * err, gs() * err);
    let hit = off < Math.atan2(0.5, tdist);
    this.ray.set(from, dir); this.ray.far = 200;
    const hw = this.ray.intersectObjects(this.world.occluders, false)[0];
    if (hw && hw.distance < tdist - 0.4) hit = false;   // parede na frente: bala morre lá
    const end = hit ? teye : (hw ? hw.point : from.clone().add(dir.clone().multiplyScalar(120)));
    this.world.ambience?.onShot(from, end);
    if (hit) {
      let dmg = (Wb.dmg || 30) * (Wb.pellets ? Math.min(Wb.pellets, 6) * 0.55 : 1);
      const fo = DMG_FALLOFF[bcls];
      if (fo) { const t = Math.max(0, Math.min(1, (tdist - fo[0]) / (fo[1] - fo[0]))); dmg *= 1 - (1 - fo[2]) * t; }
      const dmgMul = e.isPlayer ? (BOT_FAIR ? this._botDmgPlayer : BOT_DMG_PLAYER) : 1;
      dmg = Math.max(6, Math.min(e.isPlayer ? 100 : 130, Math.round(dmg * dmgMul)));
      this._damage(e, dmg, b, Wb.short || 'ARMA', false, teye);
      if (BLOOD) { if (e.isPlayer) this._bloodSpatter(teye, dir, false, e.pos ? e.pos.y : null); else this._fleshImpact(teye, dir, false, e.pos ? e.pos.y : null, false); }
      if (e.isPlayer) this._noteHit(b, Wb.short || 'ARMA', dmg, false, tdist);
    }
    this._tracer(from.clone().add(dir.clone().multiplyScalar(0.7)), end);
    this._flash(from.clone().add(dir.clone().multiplyScalar(0.85)), dir);
    if (b.mesh.isGLB) b.mesh.ctrl.shoot();
  }

  /* ================= radar (CS-style) =================
     ANTES: `strokeRect(H-26*sc, H-46*sc, 52*sc, 92*sc)` era a caixa do praca_poderes HARDCODED,
     desenhada igual na Havan, no Piscinão e no Ferro Velho — o radar mostrava o mapa
     errado em 3 dos 4 mapas — e a escala fixa (1.42 px/m) fazia o jogador sumir do disco
     em mapa maior que ~52×92 m.
     AGORA: a planta vem do MUNDO (this.world.colliders, que já existe e é por mapa),
     é rasterizada UMA vez num canvas offscreen (custo por frame = 1 blit) e a escala é
     derivada dos limites reais da arena, então o mapa inteiro cabe no disco em qualquer
     mapa. Kill-switch: ?radar=0 desliga a planta (fica bússola + blips, que é o mínimo
     honesto); ?radar=box volta pro retângulo antigo. */
  _radarFoot(S) {
    if (this._rdFoot !== undefined) return this._rdFoot;
    const qp = new URLSearchParams(location.search).get('radar');
    const cols = (this.world && this.world.colliders) || [];
    if (qp === '0' || !cols.length) return (this._rdFoot = null);
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (const c of cols) {
      if (!isFinite(c.minX) || !isFinite(c.minZ)) continue;
      if (c.minX < minX) minX = c.minX; if (c.maxX > maxX) maxX = c.maxX;
      if (c.minZ < minZ) minZ = c.minZ; if (c.maxZ > maxZ) maxZ = c.maxZ;
    }
    let ex = maxX - minX, ez = maxZ - minZ;
    // sanidade: collider perdido no infinito não pode encolher a arena inteira a 2 px
    if (!(ex > 4) || !(ez > 4) || ex > 400 || ez > 400) { minX = -60; maxX = 60; minZ = -100; maxZ = 100; ex = 120; ez = 200; }
    const R = S / 2 - 3;
    const sc = (2 * R - 10) / Math.max(ex, ez);
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const cv = document.createElement('canvas'); cv.width = cv.height = S;
    const g = cv.getContext('2d');
    g.translate(S / 2, S / 2); g.scale(sc, sc); g.translate(-cx, -cz);
    g.lineWidth = Math.max(0.6, 1 / sc);
    if (qp === 'box') {   // fallback declarado: a caixa antiga, pra comparar lado a lado
      g.strokeStyle = 'rgba(120,220,220,0.5)'; g.strokeRect(-26, -46, 52, 92);
    } else {
      // Legibilidade: num disco de 150px, desenhar TODO collider (carros, gôndolas, caixas)
      // vira ruído. Só entra estrutura — bloco grande com preenchimento, médio só contorno;
      // prop pequeno (< 1.6 m nas duas direções) é descartado.
      for (const c of cols) {
        const w = c.maxX - c.minX, h = c.maxZ - c.minZ;
        if (Math.max(w, h) < 1.6) continue;
        const big = Math.max(w, h) >= 5;
        if (big) { g.fillStyle = 'rgba(120,220,220,0.13)'; g.fillRect(c.minX, c.minZ, w, h); }
        g.strokeStyle = big ? 'rgba(160,240,240,0.55)' : 'rgba(120,220,220,0.28)';
        g.strokeRect(c.minX, c.minZ, w, h);
      }
    }
    return (this._rdFoot = { img: cv, sc, cx, cz });
  }
  _updateRadar() {
    const x = this.radarCtx;
    if (!x) return;
    const S = 150, H = S / 2, R = H - 3;
    const fp = this._radarFoot(S);
    const sc = fp ? fp.sc : 1.42, ox = fp ? fp.cx : 0, oz = fp ? fp.cz : 0;
    x.clearRect(0, 0, S, S);
    // fundo: painel QUADRADO escuro (tela 05 do redesign — o minimapa da referência é
    // um bloco, não um disco). Opaco o bastante pra geometria ciano ler com céu claro atrás.
    const bg = x.createRadialGradient(H, H, 8, H, H, R);
    bg.addColorStop(0, 'rgba(4,8,10,0.88)');
    bg.addColorStop(1, 'rgba(0,0,0,0.74)');
    x.fillStyle = bg;
    x.fillRect(0, 0, S, S);
    x.save();
    x.beginPath(); x.rect(0, 0, S, S); x.clip();
    // planta REAL do mapa atual (blit do offscreen; norte fixo: mundo X→tela X, Z→tela Y)
    if (fp) x.drawImage(fp.img, 0, 0);
    // grade de referência bem sutil
    x.strokeStyle = 'rgba(120,220,220,0.12)';
    x.beginPath();
    x.moveTo(H, H - R); x.lineTo(H, H + R);
    x.moveTo(H - R, H); x.lineTo(H + R, H);
    x.stroke();
    // cone de visão do jogador (FOV real da câmera, com falloff radial)
    const px = H + (this.player.pos.x - ox) * sc, pz = H + (this.player.pos.z - oz) * sc;
    const fov = (this.camera.fov || 75) * Math.PI / 180;
    x.save();
    x.translate(px, pz); x.rotate(-this.player.yaw);
    const cone = Math.max(26, Math.min(70, 34 * sc));   // alcance do cone acompanha a escala do mapa
    const grad = x.createRadialGradient(0, 0, 3, 0, 0, cone);
    grad.addColorStop(0, 'rgba(140,230,230,0.30)');
    grad.addColorStop(1, 'rgba(140,230,230,0)');
    x.fillStyle = grad;
    x.beginPath(); x.moveTo(0, 0);
    x.arc(0, 0, cone, -Math.PI / 2 - fov / 2, -Math.PI / 2 + fov / 2);
    x.closePath(); x.fill();
    // player arrow (rotates with view)
    x.fillStyle = '#fff';
    x.beginPath(); x.moveTo(0, -5); x.lineTo(4, 4); x.lineTo(-4, 4); x.closePath(); x.fill();
    x.restore();
    // blips saturados com leve glow
    x.shadowBlur = 5;
    for (const c of this.combatants) {
      if (!c.alive || c.isPlayer) continue;
      const ally = c.team === this.playerTeam;
      if (!ally && this.time - c.revealedAt > 1.6) continue;
      const col = ally ? this._teamColor(c.team) : '#ffb44d';   // inimigo revelado = âmbar (objetivo), aliado = cor do time
      x.fillStyle = col; x.shadowColor = col;
      x.fillRect(H + (c.pos.x - ox) * sc - 2, H + (c.pos.z - oz) * sc - 2, 4, 4);
    }
    x.shadowBlur = 0;
    x.restore();
    // moldura + nome do mapa embaixo à esquerda (tela 05 do redesign: "BECO OESTE").
    // Aqui é o NOME DO MAPA — região nomeada só existe no CTF, e fora dele a etiqueta
    // tem que continuar dizendo algo verdadeiro.
    x.strokeStyle = 'rgba(236,235,230,0.12)'; x.lineWidth = 1;
    x.strokeRect(0.5, 0.5, S - 1, S - 1);
    x.font = "600 10px Rajdhani, sans-serif"; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    x.fillStyle = 'rgba(139,140,146,0.95)';
    x.fillText((MAPS[this._mapId].name || '').toUpperCase(), 8, S - 7);
  }

  /* ================= HUD ================= */
  _banner(title, sub) {
    const b = this.el.banner;
    this.el.bannerTitle.textContent = title;
    this.el.bannerSub.textContent = sub;
    b.classList.remove('hidden', 'show');
    void b.offsetWidth;   // reinicia a animação de entrada (slide/scale + letter-spacing settle)
    b.classList.add('show');
    clearTimeout(this._bannerT);
    this._bannerT = setTimeout(() => b.classList.remove('show'), 2600);
    clearTimeout(this._bannerT2);
    this._bannerT2 = setTimeout(() => b.classList.add('hidden'), 3000);   // espera o fade-out
  }
  /* game.js:5941 — O RESULTADO DA RODADA É O TÍTULO DO PLACAR, NÃO UM BANNER SOLTO.
     Defeito do print do dono: "TIME B LEVARAM O ROUND" atravessando o painel do
     placar. Causa exata: `_endRound` acendia o #round-banner (top:30%, título de 52 px,
     linha mais LARGA que o painel) e o #scoreboard (centrado) NO MESMO QUADRO — as duas
     caixas se cruzam por construção, e o texto sai pelos dois lados do painel.
     Tentei primeiro só reposicionar o banner (CSS `#hud.sb-on #round-banner{top:8%}`) e o
     mock em PIL mostrou o defeito seguinte: a 8% ele cai EM CIMA do bloco de round do topo
     (que ocupa 14-104 px). Não existe faixa livre: com 8-10 combatentes o painel do placar
     mede ~350-405 px e, centrado em 655, come de 125 a 530.
     Então o resultado passa a morar DENTRO do painel, como TÍTULO dele — que é exatamente
     o empilhamento das telas 08 e 09 da referência (título em cima, tabela embaixo, nada
     se cruzando). O #round-banner continua existindo pros avisos que NÃO coexistem com o
     placar (ROUND N, VALENDO!, MATCH POINT), e o CSS ainda garante `#hud.sb-on
     #round-banner{display:none}` pra que nenhuma futura chamada volte a cruzar o painel. */
  _resultadoDaRodada(titulo, sub) {
    this._resultado = { titulo, sub };
    this._showScoreboard(true);
  }
  _showScoreboard(v) {
    if (v) {
      const r = this._resultado;
      const totalRounds = this._inspectionTotalRounds || this.roundsMax;
      const clock = this.ctf ? Math.max(0, Math.ceil(this.ctfMatchLeft)) : Math.max(0, Math.ceil(this.timeLeft));
      const clockText = `${Math.floor(clock / 60)}:${String(clock % 60).padStart(2, '0')}`;
      const crest = (side) => String(this._factionOf(side) || 'E').toLowerCase();
      document.querySelector('#scoreboard h3').innerHTML =
        (r ? `<span class="sb-result">${r.titulo}</span><span class="sb-result-sub">${r.sub}</span>` : '') +
        `<span class="sb-clock">RODADA ${this.roundNum}/${totalRounds} · <em>${clockText}</em></span>` +
        `<span class="sb-score"><b class="tp"><img class="sb-crest" src="/img/brasoes/${crest('E')}.png" alt=""><span class="sb-team-name">${this._teamName('E')}</span><strong class="sb-score-num">${this.roundsWon.E}</strong></b>` +
        `<span class="sb-vs">VS</span><b class="tb"><strong class="sb-score-num">${this.roundsWon.B}</strong><span class="sb-team-name">${this._teamName('B')}</span><img class="sb-crest" src="/img/brasoes/${crest('B')}.png" alt=""></b></span>`;
      // no CTF ordena por capturas (depois kills); senão por kills
      const rank = this.ctf ? (a, b) => (b.captures || 0) - (a.captures || 0) || b.kills - a.kills : (a, b) => b.kills - a.kills;
      /* DUAS COLUNAS COM BRASÃO (referência 08_placar, pedido do dono 07/08: "na tela de
         placar, temos que pôr o brasão de cada time e alinhar as informações à coluna de
         cada um"). O brasão é o MESMO arquivo que estampa a bandeira CTF (img/brasoes/),
         lido pela letra da facção que ocupa o lado — nunca pelo lado cru (a lição do
         _factionOf: lado 'B' ≠ facção 'B' por acidente de letra). */
      const coluna = (side) => {
        const linhas = [...this.combatants].filter(c => c.team === side).sort(rank).map((c, i) => {
          const score = Math.max(0, c.kills * 100 + (c.captures || 0) * 250 - c.deaths * 20);
          const ping = 12 + ((c.kills * 7 + c.deaths * 3 + i * 5) % 18);
          return (
          `<tr${c.isPlayer ? ' class="me"' : ''}>
            <td class="sb-n">${c.name}${c.isPlayer ? ' ★' : ''}</td><td>${c.kills}</td><td>${c.deaths}</td><td class="sb-points">${score}</td><td class="sb-ping">${ping}</td>${this.ctf ? `<td>${c.captures || 0}</td>` : ''}</tr>`
          );
        }).join('');
        return `<div class="sb-col ${side === 'E' ? 'tp' : 'tb'}${this.ctf ? ' ctf' : ''}">
          <div class="sb-chead"><span class="sb-team"><img class="sb-crest" src="/img/brasoes/${crest(side)}.png" alt=""><b>${tr('JOGADOR')}</b></span><span>K</span><span>D</span><span>SCORE</span><span>PING</span>${this.ctf ? '<span class="sb-cap">CAP.</span>' : ''}</div>
          <table><thead><tr><th>${tr('JOGADOR')}</th><th>K</th><th>D</th><th>SCORE</th><th>PING</th>${this.ctf ? '<th>CAP.</th>' : ''}</tr></thead>
          <tbody>${linhas}</tbody></table></div>`;
      };
      document.getElementById('sb-cols').innerHTML = coluna('E') + coluna('B');
    }
    this.el.scoreboard.classList.toggle('hidden', !v);
    /* game.js:5933 — DEFEITO DO PRINT: "TIME B LEVARAM O ROUND" atravessando POR
       TRÁS do painel do placar. Os dois nascem no MESMO instante (`_endRound` chama
       `_banner()` e `_showScoreboard(true)`) e as duas caixas se cruzam por construção:
       o #round-banner mora em top:30% (em 655 px de altura = 196 px, bloco de ~100 px) e
       o #scoreboard é centrado em 50% com altura de painel de 8-10 linhas. O texto do
       banner é mais largo que o painel, então ele SAI pelos dois lados e lê como se
       atravessasse o painel. Aqui o HUD declara o estado; quem resolve a geometria é o
       CSS (`#hud.sb-on #round-banner`, style.css), que sobe o banner pra faixa livre
       acima do painel e reduz o corpo — o mesmo empilhamento das telas 08 e 09 da
       referência (título em cima, painel embaixo, nada se cruzando). */
    this.el.hud.classList.toggle('sb-on', !!v);
  }
  _updateWeaponHud() {
    const hud = this.el.weaponHud;
    if (!hud) return;
    const p = this.player;
    const slots = [];
    if (p.primary) slots.push({ key: 1, weapon: p.primary });
    slots.push({ key: 2, weapon: p.secondary || 'pistol' });
    slots.push({ key: 3, weapon: 'knife' });
    if (p.smokes > 0) slots.push({ key: 4, kind: 'smoke', name: 'FUMAÇA', count: p.smokes });
    if (p.frags > 0) slots.push({ key: 5, kind: 'frag', name: 'FRAG', count: p.frags });

    const signature = slots.map((slot) => {
      const ammo = slot.weapon && p.ammo?.[slot.weapon];
      return [slot.key, slot.weapon || slot.kind, ammo?.mag ?? '', ammo?.res ?? '', slot.count ?? '', slot.weapon === p.weapon].join(':');
    }).join('|');
    if (signature === this._weaponHudSig && !hud.classList.contains('hidden')) return;
    this._weaponHudSig = signature;
    let activeWeaponClaimed = false;
    hud.innerHTML = slots.map((slot) => {
      const weapon = slot.weapon && WEAPONS[slot.weapon];
      const active = slot.weapon === p.weapon && !activeWeaponClaimed;
      if (active) activeWeaponClaimed = true;
      const ammo = slot.weapon && p.ammo?.[slot.weapon];
      // '∞' e não o número: reserva que volta a cheia toda recarga lê-se como contador travado
      const res = this._municaoInfinita() ? '∞' : ammo?.res;
      const amount = slot.count != null ? `×${slot.count}` : (slot.weapon === 'knife' ? '' : (ammo ? `${ammo.mag}/${res}` : ''));
      const icon = this._wpnIcon(slot.kind === 'frag' ? 'FRAG' : slot.kind === 'smoke' ? 'NADE' : weapon?.short);
      const icon2d = slot.weapon
        ? `<i class="weapon-mask" style="--weapon-mask:url('/img/weapons/${slot.weapon}.webp')"></i><span class="weapon-fallback">${icon}</span>`
        : icon;
      const name = slot.name || weapon?.name || slot.weapon?.toUpperCase() || '';
      return `<div class="weapon-slot${active ? ' on' : ''}" data-slot="${slot.key}"><span class="weapon-key">${slot.key}</span><span class="weapon-icon">${icon2d}</span><span class="weapon-label">${name}</span><span class="weapon-amount">${amount}</span></div>`;
    }).join('');
    hud.classList.remove('hidden');
  }
  _updateHud() {
    const p = this.player;
    const weaponDef = WEAPONS[p.weapon];
    this._updateWeaponHud();
    this.el.hpNum.textContent = Math.max(0, Math.ceil(p.hp));
    this.el.hpFill.style.width = Math.max(0, p.hp) + '%';
    this.el.hpFill.classList.toggle('low', p.hp <= 35);
    this.el.hpNum.classList.toggle('low', p.hp <= 35);
    if (this.el.ammoWeaponArt.dataset.weapon !== p.weapon) {
      this.el.ammoWeaponArt.dataset.weapon = p.weapon;
      this.el.ammoWeaponArt.src = `/img/weapons/${p.weapon}.webp`;
      this.el.ammoWeaponArt.alt = weaponDef.name;
    }
    let mag = 0;
    if (p.weapon === 'knife') {
      this.el.ammoMag.textContent = '—'; this.el.ammoRes.textContent = '';
      this.el.ammoMag.classList.remove('empty');
    } else {
      const a = p.ammo[p.weapon];
      mag = a.mag;
      this.el.ammoMag.textContent = a.mag;
      this.el.ammoRes.textContent = this._municaoInfinita() ? '∞' : a.res;
      this.el.ammoMag.classList.toggle('empty', a.mag === 0);
    }
    const capacity = weaponDef.mag || 0;
    const segments = Math.min(5, capacity);
    const filled = capacity ? Math.round(segments * mag / capacity) : 0;
    const barsSignature = `${p.weapon}:${mag}:${capacity}`;
    if (this.el.ammoBars.dataset.signature !== barsSignature) {
      this.el.ammoBars.dataset.signature = barsSignature;
      this.el.ammoBars.style.setProperty('--ammo-bars', segments || 1);
      if (typeof this.el.ammoBars.replaceChildren === 'function') {
        this.el.ammoBars.replaceChildren(...Array.from({ length: segments }, (_, i) => {
          const tick = document.createElement('i');
          if (i < filled) tick.className = mag / capacity <= 0.25 ? 'on low' : 'on';
          return tick;
        }));
      }
    }
    // HIERARQUIA DO TOPO: o elemento mais pesado tem que carregar a informação mais
    // importante. No CTF o round não tem tempo — mostrar '∞' a 32px fazia o MAIOR tipo do
    // HUD comunicar a AUSÊNCIA de informação, enquanto o placar de bandeiras ficava numa
    // faixa de 12px. Agora o timer encolhe pra rótulo de modo e a linha de baixo passa a
    // trazer o placar que vale (capturas).
    if (this.ctf) {
      /* game.js:5800 — NO CAPTURA O MAIOR TIPO DO HUD MOSTRA BANDEIRA, NÃO SEGUNDO.
         O que o dono viu e reprovou foi "CAPTURA 1:32" contando pra trás a cada rodada.
         Aqui o elemento de topo passa a ser o PLACAR DE BANDEIRAS da rodada (que é a
         condição de vitória) e o relógio de PARTIDA só materializa nos últimos
         CTF_CLOCK_SHOW segundos — e quando materializa vem rotulado 'FIM DA PARTIDA',
         justamente pra ninguém confundir com contagem de round. Fora desses 60 s o
         jogador não vê cronômetro nenhum, que é o comportamento de CTF que ele descreve. */
      const cp = (this.roundCaps && this.roundCaps.E) || 0, cb = (this.roundCaps && this.roundCaps.B) || 0;
      const alvo = Number.isFinite(this.capsToWin) ? this.capsToWin : CTF_CAPS_TO_WIN;
      this.el.roundTime.textContent = `${cp} × ${cb}`;
      this.el.roundTime.classList.remove('ctf');
      const restante = Math.max(0, Math.ceil(this.ctfMatchLeft));
      const fimProximo = restante <= CTF_CLOCK_SHOW;
      this.el.roundTime.classList.toggle('urgente', fimProximo);
      this.el.roundsRow.textContent =
        `${frase('rodadaDe', this.roundNum, this.roundsMax)} · ${frase('alvoBandeirasHud', alvo)} · ${this._teamTag('E')} ${this.roundsWon.E} × ${this.roundsWon.B} ${this._teamTag('B')}`
        + (fimProximo ? ` · FIM DA PARTIDA EM ${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, '0')}` : '');
    } else {
      this.el.roundTime.classList.remove('ctf');
      const total = Math.max(0, Math.ceil(this.timeLeft));
      this.el.roundTime.textContent = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
      // linha secundária única sob o timer: rodada/teto selecionado + placar por time
      this.el.roundsRow.textContent =
        `${frase('rodadaDe', this.roundNum, this.roundsMax)} · ${this._teamTag('E')} ${this.roundsWon.E} × ${this.roundsWon.B} ${this._teamTag('B')}`;
    }
    this._plaqueta('P', 'E'); this._plaqueta('B', 'B');
    this.el.scoreP.style.color = this._teamColor('E');   // lado do jogador Tribos fica AZUL
    this.el.scoreB.style.color = this._teamColor('B');
    // badge de spawn protection (issue #24)
    const protLeft = p.protUntil - this.time;
    this.el.prot.classList.toggle('hidden', !(p.alive && protLeft > 0));
    if (protLeft > 0) this.el.protCount.textContent = Math.ceil(protLeft);
  }

  /* ================= main update ================= */
  update(dt, render = true) {
    if (this.paused) return;
    // Hit-stop: scale dt during replay cam slowmo phase (uses wall-clock time, not game time)
    if (this._replayCam) {
      const wallT = this._replayCam._wallT = (this._replayCam._wallT || 0) + dt;
      if (wallT < REPLAY_SLOWMO_DUR) dt *= REPLAY_SLOWMO;
    }
    this.time += dt;
    // Snapshot ANTES de mover: aplicar depois renderizaria o frame com o mundo de ontem.
    if (this.online) this._mp?.applySnapshot();
    /* Máquina de rodada local só roda OFFLINE: duas girando são dois árbitros, e o cliente
       mostraria um placar que ninguém mais vê. */
    if (this.online) { /* servidor manda */ }
    else if (this.state === 'countdown' && this.time >= this.stateUntil) {
      this.state = 'live';
      this._banner(frase('valendo'), 'A treta está liberada');
    } else if (this.state === 'live') {
      /* game.js:5843 — DOIS RITMOS, UM ESTADO 'live'.
         ABATE  : o round é uma janela de tempo (99 s) que o alvo de abates pode encurtar.
         CAPTURA: o round NÃO tem janela de tempo. Ele fecha por ALVO DE BANDEIRAS
                  (_checkPace levanta `_roundOverPedido`) ou por dominação (_ctfWin). O
                  que corre aqui é o relógio da PARTIDA — e ele não zera entre rodadas.
         Antes desta rodada eram os dois com o MESMO `timeLeft` de 99 s, e foi isso que o
         dono viu e reclamou ("captura estava com cronometragem — isso não acontece em
         CTF"). Antes DISSO, o CAPTURA não fechava partida nenhuma. As duas coisas estão
         cobradas agora pela UI4, cada uma com a sua mutação. */
      if (this.ctf) {
        this._updateCTF(dt);
        this.ctfMatchLeft -= dt;
        /* `this.state === 'live'` de novo AQUI, e não é redundância: `_updateCTF` pode ter
           chamado `_ctfWin` (dominação das bandeiras) no meio deste mesmo frame, e o
           `_ctfWin` já credita a rodada e muda o estado. Sem a guarda, `_endRound` credita
           uma SEGUNDA vitória na mesma rodada — medido: a partida de CTF do praca_old
           fechava em 56 s com `rounds=1` porque um round valia 2 pontos. */
        if (this.state === 'live' && (this._roundOverPedido || this.ctfMatchLeft <= 0)) {
          this._roundOverPedido = false;
          this._endRound();
        }
      } else {
        this.timeLeft -= dt; if (this.timeLeft <= 0) this._endRound();
      }
    } else if (this.state === 'roundEnd' && this.time >= this.stateUntil) {
      if (this._fimDaPartida()) this._endMatch();
      else this._startRound();
    }
    if (!this.dedicated) this._updatePlayer(dt);   // servidor dedicado: não há jogador local
    if (this._recorder && this._recordEnabled) {
      this._recorder.tick(dt);
      // envio PERIÓDICO (~300 frames ≈ 30s de jogo vivo): coleta contínua sem depender de
      // terminar a partida — jogar já grava dado. O fim da partida (_endMatch) manda o resto.
      if (this._recorder.count >= 300) this._flushTraining();
    }
    for (const b of this.bots) this._updateBot(b, dt);
    this._updatePickups();
    this._updateFx(dt);
    this._updateDoors(dt);
    this._updateGrenades(dt);
    this._updateHud();
    this._updateRadar();
    // hint de pointer lock: visível só quando o jogo está ativo mas sem lock
    if (this.el.lockHint)
      this.el.lockHint.classList.toggle('hidden',
        this.testMode || this.mobile || this.paused || !!document.pointerLockElement ||
        (this.state !== 'live' && this.state !== 'countdown'));
    /* #295: o main.js fatia frames longos em vários update() — só o ÚLTIMO
       passo desenha; render no meio multiplicaria custo de GPU em FPS baixo. */
    if (!render) return;
    this._rafFrames = (this._rafFrames || 0) + 1;   // fps REAL de render (lido pelo overlay de rede)
    this.renderer.render(this.scene, this.camera);
    // VM overlay SEM pós (quality low / ?bloom=0): o composer não existe, então desenha
    // a vmScene por cima do mundo aqui (com pós, o RenderPass do bloom.js já faz isso).
    if (!this.renderer.__postPatched && this.vmScene) {
      const r = this.renderer;
      r.autoClear = false; r.clearDepth();
      r.render(this.vmScene, this.vmCamera);
      r.autoClear = true;
    }
    this._tickDolly(dt);
    this.world.ambience?.update(dt, this.player.pos);
    if (!this.soundscape && this.world.sound) this.soundscape = createSoundscape(this.sfx, this.world.sound);
    this.soundscape?.update(dt, this.player.pos);
    this.world.update?.(dt, this.time);
  }

  /* ================= teardown ================= */
  dispose() {
    this._disposed = true;
    try { this._mp?.dispose(); } catch { /* já foi */ }
    this._mp = null;
    try { this.sfx.stopRound(); } catch {}   // vinheta não sobrevive ao fim da partida   // lazy-load de VM em voo (_ensureStaticVm) aborta no then
    if (this._envRT) { this._envRT.dispose(); this._envRT = null; this.scene.environment = null; }   // libera o env map (IBL)
    document.removeEventListener('keydown', this._kd);
    document.removeEventListener('keyup', this._ku);
    document.removeEventListener('mousedown', this._md);
    document.removeEventListener('mouseup', this._mu);
    document.removeEventListener('mousemove', this._mm);
    document.removeEventListener('contextmenu', this._cc);
    document.removeEventListener('pointerlockchange', this._plc);
    window.removeEventListener('blur', this._blur);
    if (this._touchUi) { this._touchUi.remove(); this._touchUi = null; }   // overlay de toque some com a partida
    this._soltaAtalhos();   // fora da partida os atalhos do navegador voltam a ser do navegador
    this.el.hud.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    // timer da janela de guarda: sem isso ele acorda depois da partida morta e mexe no DOM
    clearTimeout(this._pauseArmT); this._pauseArmT = null; this.pauseArmAt = 0;
    if (this.el.pauseActions) this.el.pauseActions.style.pointerEvents = '';
    this.el.matchEnd.classList.add('hidden');
    this._hideCtfHud();   // sem isto a faixa de bandeiras sobrevive para a próxima partida
    this.el.killfeed.innerHTML = '';
    this.el.radioLog.innerHTML = '';
    this.el.radioMenu.classList.add('hidden');
    this.el.mkBanner.classList.remove('show');
    this.el.scope.classList.remove('on');
    this.el.respawn.classList.add('hidden');
    this.el.reloadNote.classList.add('hidden');
    this.el.banner.classList.add('hidden');
    this.el.lockHint.classList.add('hidden');
    this.el.scoreboard.classList.add('hidden');
    this.el.vignette.style.opacity = 0;
    if (this._dolly) { this._dolly.renderer.dispose(); this._dolly.canvas.remove(); this._dolly = null; }
    this.world.ambience?.dispose();
    this.soundscape?.dispose(); this.soundscape = null;
    this._pickupFallbackTpl?.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    this.scene.clear();
  }
}
