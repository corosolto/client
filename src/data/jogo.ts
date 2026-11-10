// Conteúdo do jogo em forma de DADO, pro site.
//
// POR QUE ISSO EXISTE, E QUAL É A FONTE DA VERDADE
// As páginas /armas, /mapas e /personagens são SEO orgânico barato: texto real
// sobre coisas que as pessoas procuram por nome ("mapa ferro velho", "AWP",
// "personagens"). Mas o site é Astro/SSR e o jogo é vanilla ES modules que
// importa `three` - dá pra importar public/js/game.js daqui sem arrastar o
// Three.js inteiro pro build do servidor.
//
// FONTE DA VERDADE continua sendo o jogo; o catálogo editorial é gerado offline.
// SSR importa apenas o módulo estático `catalog.generated.ts`, nunca o filesystem.
//
//   ARMAS       <- public/js/game.js, objeto WEAPONS (dmg/mag/reserve/rate)
//   MAPAS       <- public/js/maps.js, objeto MAPS
//   PERSONAGENS <- scripts/site-catalog.mjs <- public/js/characters.js
//
// Os mapas permanecem neste arquivo porque ainda não têm gerador equivalente.
// Reconferido em 2026-08-05 - e a lista de MAPAS estava errada por DOIS motivos
// que se anulavam na contagem e por isso ninguém tinha visto:
//   · `praca_old` ("Praça (clássico)") SAIU do registro (`public/js/maps.js:11-20`,
//     pedido literal do dono: "vamos apagar praça clássica"; o `map.js` foi apagado
//     junto). Ela continuava listada aqui, em /mapas, no llms.txt e no JSON-LD;
//   · `quebrada` ("Quebrada (Rua do Baile)") ENTROU (`maps.js:35`) e não estava
//     em lugar nenhum do site.
// Um mapa a menos e um a mais: o total continuou 5 e o texto continuou mentindo.
// Efeito colateral que também estava errado por causa disso: o default de modo.
// Com `ctfMode: true` em loja_h, ferro_velho e quebrada, hoje são
// 2 arenas em rounds e 3 em CTF - as páginas diziam "três em rounds e duas em CTF".

export interface Arma {
  id: string; nome: string; curto: string; classe: string;
  dano: number; pente: number; reserva: number; cadencia: number; nota: string;
}

/** 26 armas - `dano` é por projétil; a M3 dispara 9 bagos de 14. */
export const ARMAS: Arma[] = [
  { id: 'awp', nome: 'AWP "DELIBERADOR"', curto: 'AWP', classe: 'Sniper', dano: 400, pente: 5, reserva: 25, cadencia: 1.7, nota: 'Mata com um tiro em qualquer lugar do corpo. É a arma que define a arena - e a que mais castiga quem atira correndo.' },
  { id: 'mosin', nome: 'MOSIN "VOVÓ RUSSA"', curto: 'MOSIN', classe: 'Sniper', dano: 120, pente: 5, reserva: 25, cadencia: 1.5, nota: 'Ferrolho lento, dano brutal. Perdoa menos que a AWP e recompensa mais o agachado.' },
  { id: 'rem700', nome: 'REM 700 "CAÇADOR"', curto: 'REM', classe: 'Sniper', dano: 130, pente: 5, reserva: 25, cadencia: 1.5, nota: 'A irmã civil da Mosin: mesmo ritmo, um tiquinho mais de dano.' },
  { id: 'svd', nome: 'SVD "VODKA"', curto: 'SVD', classe: 'Sniper semi-auto', dano: 62, pente: 10, reserva: 40, cadencia: 0.28, nota: 'Semi-automática: dois tiros derrubam, e você não perde a mira entre eles.' },
  { id: 'g3sg1', nome: 'G3SG1 "FRITZ"', curto: 'G3SG1', classe: 'Sniper semi-auto', dano: 55, pente: 20, reserva: 60, cadencia: 0.22, nota: 'Pente de 20 numa sniper semi-auto. A escolha de quem segura ângulo longo sozinho.' },
  { id: 'sks', nome: 'SKS "MILÍCIA"', curto: 'SKS', classe: 'Sniper semi-auto', dano: 48, pente: 10, reserva: 50, cadencia: 0.18, nota: 'A mais rápida das semi-autos. Recompensa quem acerta a segunda no susto.' },
  { id: 'ak', nome: 'AK-47 "BATE-ESTACA"', curto: 'AK', classe: 'Fuzil', dano: 36, pente: 30, reserva: 90, cadencia: 0.1, nota: 'Mata em 3 tiros no corpo. O padrão-ouro de fuzil: dano alto, coice honesto.' },
  { id: 'akm', nome: 'AKM "KALASH DA VÉIA"', curto: 'AKM', classe: 'Fuzil', dano: 34, pente: 30, reserva: 90, cadencia: 0.105, nota: 'Cadência um pouco mais lenta que a AK, com dano próximo por disparo.' },
  { id: 'm4', nome: 'M4A1 "REQUINTE"', curto: 'M4', classe: 'Fuzil', dano: 31, pente: 30, reserva: 90, cadencia: 0.09, nota: 'Mais rápida e mais estável que a AK, em troca de dano por tiro.' },
  { id: 'g3', nome: 'HK G3 "FRITZ"', curto: 'G3', classe: 'Fuzil de batalha', dano: 37, pente: 20, reserva: 80, cadencia: 0.11, nota: 'Pente curto, tiro que dói. Fuzil de quem conta os tiros.' },
  { id: 'md97', nome: 'MD97 "FUZIL DA PÁTRIA"', curto: 'MD97', classe: 'Fuzil de batalha', dano: 38, pente: 20, reserva: 80, cadencia: 0.12, nota: 'O fuzil brasileiro do arsenal. Dano alto por disparo e pente curto.' },
  { id: 'm400', nome: 'M400 "MIRA FINA"', curto: 'M400', classe: 'Fuzil de batalha', dano: 40, pente: 20, reserva: 80, cadencia: 0.11, nota: 'Dano de fuzil de batalha com estabilidade de M4.' },
  { id: 'scar', nome: 'SCAR "PAGA-PAU"', curto: 'SCAR', classe: 'Fuzil de batalha', dano: 37, pente: 20, reserva: 80, cadencia: 0.11, nota: 'Equilibrada até demais - a que menos surpreende, pro bem e pro mal.' },
  { id: 'm92', nome: 'ZASTAVA M92 "IOGUSLAVO"', curto: 'M92', classe: 'Carabina', dano: 32, pente: 30, reserva: 90, cadencia: 0.1, nota: 'AK serrada. Curta, gorda na tela e boa de corredor.' },
  { id: 'tavor', nome: 'TAVOR "CURTINHO"', curto: 'TAVOR', classe: 'Bullpup', dano: 32, pente: 30, reserva: 90, cadencia: 0.09, nota: 'Bullpup: cano de fuzil num corpo de SMG. Boa em espaço apertado.' },
  { id: 'famas', nome: 'FAMAS "BAGUETE"', curto: 'FAMAS', classe: 'Bullpup', dano: 29, pente: 25, reserva: 90, cadencia: 0.075, nota: 'Cadência altíssima e pente curto. Erra pouco quem controla a rajada.' },
  { id: 'carbine', nome: 'CARABINA "PAPO DE PEÃO"', curto: 'CARB', classe: 'Carabina de alavanca', dano: 42, pente: 10, reserva: 40, cadencia: 0.5, nota: 'Alavanca lenta, dano alto. A arma mais roceira e mais satisfatória do jogo.' },
  { id: 'lmg', nome: 'METRALHA "TRETA PESADA"', curto: 'LMG', classe: 'Metralhadora', dano: 31, pente: 100, reserva: 200, cadencia: 0.085, nota: '100 tiros sem recarregar. Trava corredor inteiro - se você aguentar o peso.' },
  { id: 'mp5', nome: 'MP5 "VASSOURA"', curto: 'MP5', classe: 'SMG', dano: 26, pente: 30, reserva: 120, cadencia: 0.075, nota: 'A SMG de referência: previsível, precisa, sem drama.' },
  { id: 'uzi', nome: 'UZI "RÁ-TÁ-TÁ"', curto: 'UZI', classe: 'SMG', dano: 25, pente: 25, reserva: 100, cadencia: 0.07, nota: 'Cospe o pente em 1,7 s. Perto funciona, longe é fogo de artifício.' },
  { id: 'p90', nome: 'P90 "CHINELÃO"', curto: 'P90', classe: 'SMG', dano: 23, pente: 50, reserva: 100, cadencia: 0.065, nota: '50 tiros e a cadência mais alta do arsenal. Dano por tiro é o preço.' },
  { id: 'shotgun', nome: 'M3 "CONVERSA FIADA"', curto: 'M3', classe: 'Escopeta', dano: 14, pente: 7, reserva: 32, cadencia: 0.9, nota: '9 bagos de 14 por tiro: 126 de dano se tudo pegar. Só que nunca pega tudo.' },
  { id: 'deagle', nome: 'DEAGLE "MARTELO"', curto: 'DE', classe: 'Pistola', dano: 53, pente: 7, reserva: 35, cadencia: 0.28, nota: 'Pistola que mata em 2. Headshot resolve round.' },
  { id: 'revolver38', nome: 'REVÓLVER .38 "TROVÃO"', curto: '.38', classe: 'Pistola', dano: 46, pente: 6, reserva: 24, cadencia: 0.36, nota: 'Seis tiros, muito barulho e nenhuma pressa.' },
  { id: 'pistol', nome: 'PT-38 "APITO"', curto: 'PT-38', classe: 'Pistola', dano: 34, pente: 12, reserva: 48, cadencia: 0.24, nota: 'A secundária padrão. Mata em 3 e te tira de aperto quando a primária seca.' },
  { id: 'knife', nome: 'FACA "CONVERSA FIADA"', curto: 'FACA', classe: 'Corpo a corpo', dano: 55, pente: 0, reserva: 0, cadencia: 0.55, nota: 'Alcance de 2,4 m. Anda mais rápido com ela na mão - e humilha mais também.' },
];

export interface Arremesso {
  id: string; nome: string; classe: string; tecla: string;
  /** Quantas o jogador recebe no início de cada rodada. */
  quantidade: number;
  /** Segundos entre o arremesso e o estouro. */
  fusivel: number;
  /** Raio de efeito em metros - dano no caso da frag, nuvem no caso da fumaça. */
  raio: number;
  efeito: string; nota: string;
}

/* AS DUAS DE ARREMESSO - e por que elas não entram em `ARMAS`.
 *
 * O jogo tem granada e fumaça desde sempre (`_spawnGrenade`, `_explodeFrag`,
 * `_updateGrenades` em `public/js/game.js`) e o HUD as mostra em toda partida
 * ("💨 5  🧨 1", `#smoke-count`, `src/pages/index.astro`). /armas listava as 26 armas de
 * FOGO e ignorava as duas jogáveis de arremesso - a página prometia "o arsenal" e
 * entregava parte dele.
 *
 * Elas ficam num array PRÓPRIO de propósito. `ARMAS.length` é a origem do "26" em título,
 * meta description, kicker, JSON-LD e nos espelhos de máquina; empurrar as duas para
 * dentro de `ARMAS` viraria "28 armas" em todo lugar e passaria a contar fumaça como arma
 * de fogo - além de quebrar as colunas da tabela (granada não tem pente, reserva nem
 * cadência). São coisas diferentes, então são listas diferentes.
 *
 * TODO número abaixo foi lido do motor, com arquivo:linha. Nada aqui é estimativa. */
export const ARREMESSO: Arremesso[] = [
  {
    id: 'smoke', nome: 'FUMAÇA', classe: 'Arremesso', tecla: '4 (ou G)',
    // quantidade  game.js:2174  `this.player.smokes = 5` a cada rodada
    // fusível     game.js:3752  `fuse: kind === 'frag' ? 1.5 : 2.2`
    // raio        game.js:3828 (`const R = 2.6`) + 3843 (`radius: R + 1.4`) = 4,0 m de bloqueio
    // duração     game.js:3843  `dur: 13`
    // tecla       game.js:1986 (`Digit4`) e 1988 (`KeyG`, atalho legado)
    quantidade: 5, fusivel: 2.2, raio: 4.0,
    efeito: 'Nuvem que bloqueia linha de visão por 13 s',
    nota: 'Cinco por rodada - é a granada que você tem de sobra. Corta ângulo de sniper, cobre travessia '
      + 'e tapa a bandeira no CTF. A cor da nuvem é o céu do mapa multiplicado por 0,75, então ela nunca '
      + 'lava a tela pra branco.',
  },
  {
    id: 'frag', nome: 'GRANADA DE FRAGMENTAÇÃO', classe: 'Arremesso', tecla: '5',
    // quantidade  game.js:2174  `this.player.frags = 1` a cada rodada
    // fusível     game.js:3752  `fuse: kind === 'frag' ? 1.5 : 2.2`
    // raio/dano   game.js:3775 (`const R = 6.5`) e 3785 (`Math.round(95 * (1 - d / R))`)
    // só inimigo  game.js:3781  `if (!c.alive || c.team === team) continue`
    // tecla       game.js:1987  `Digit5`
    quantidade: 1, fusivel: 1.5, raio: 6.5,
    efeito: 'Até 95 de dano no epicentro, caindo a zero na borda',
    nota: 'UMA por rodada. O dano cai linearmente com a distância: 95 em cima, ~47 na metade do raio, '
      + 'zero na borda. Não acerta o próprio time, e o fusível curto (1,5 s) significa que ela estoura '
      + 'quase onde cai - jogar por cima de cobertura é o uso, não arremessar longe.',
  },
];

export interface Mapa {
  id: string; nome: string; modo: string; resumo: string; detalhe: string;
  /** `ctfMode: true` no registro do jogo - a arena ABRE em Capture the Flag.
   *  Não é trava: qualquer mapa aceita qualquer modo pelo menu. Existe como
   *  BOOLEANO (e não como texto dentro de `modo`) porque as páginas precisavam
   *  contar "quantas abrem em rounds e quantas em CTF", e contar essa frase à mão
   *  foi exatamente o que fez /mapas e /como-jogar dizerem 3×2 quando é 2×3. */
  ctf: boolean;
}

/** Arenas com apresentação editorial; o registro jogável vive em public/js/maps.js. */
export const MAPAS: Mapa[] = [
  /* `mansao` e `campomorro` saíram da vitrine: estão PARADOS para retrabalho e
     fora do menu. O registro jogável vive em public/js/maps.js (MAPAS_PARADOS). */
  {
    id: 'praca_poderes', nome: 'Praça dos Três Poderes', modo: 'Rounds · padrão', ctf: false,
    resumo: 'A arena principal: uma Brasília fictícia com urna gigante quebrada no meio.',
    detalhe: 'Reinterpretação do praca_poderes do CS 1.6 em versão Brasília. Duas plataformas altas se encaram, ' +
      'e o mid é dominado por uma urna eletrônica gigante e rachada que serve de cobertura central. ' +
      'Em volta: boteco, carrinho de pastel, acampamento e a silhueta do Congresso no horizonte. ' +
      'É o mapa em que a AWP manda - ângulo longo, cobertura curta e nenhum lugar realmente seguro.',
  },
  {
    id: 'piscina_treta', nome: 'Piscina da Treta', modo: 'Rounds', ctf: false,
    resumo: 'Salão fechado com piscina no meio - o piscina_treta brasileiro.',
    detalhe: 'Arena interna, sem céu, com a piscina rebaixada partindo o mapa em dois níveis. ' +
      'Combate curto e vertical: quem controla a borda controla o round. ' +
      'É onde a escopeta e as SMGs finalmente ganham da AWP.',
  },
  {
    id: 'upa_24h', nome: 'UPA 24h da Treta', modo: 'CTF · rounds opcional', ctf: true,
    resumo: 'Pronto-socorro fechado, com seis setores clínicos ligados por corredores e doze passagens internas.',
    detalhe: 'Recepção, triagem, consultórios, observação, emergência e farmácia dividem a arena. ' +
      'Macas, biombos e balcões dão cobertura; as faixas no piso mostram o caminho de cada setor. ' +
      'Três bandeiras disputam recepção, corredor e emergência. Abre em Capture the Flag, ' +
      'com rounds também disponíveis no menu.',
  },
  {
    id: 'loja_h', nome: 'Loja H (Estacionamento)', modo: 'CTF · rounds opcional', ctf: true,
    resumo: 'Estacionamento de megaloja com estátua, carrinhos e carros sorteados por partida.',
    detalhe: 'Mapa de asfalto e concreto, com fileiras de carros que MUDAM a cada partida ' +
      '(a seleção é sorteada por semente), então a cobertura nunca é a mesma duas vezes. ' +
      'Abre em Capture the Flag porque a geometria foi desenhada em volta das bandeiras - ' +
      'mas dá pra trocar pra rounds no menu.',
  },
  {
    id: 'ferro_velho', nome: 'Ferro Velho do Zé', modo: 'CTF · rounds opcional', ctf: true,
    resumo: 'Ferro-velho de fim de tarde, com o cânion de carros empilhados do BECO OESTE.',
    detalhe: 'Pilhas de carros formam paredes de verdade. O flanco oeste é o BECO OESTE: um cânion reto ' +
      'de muros duplos de carros, com duas saídas laterais pro miolo e uma placa suspensa na boca sul. ' +
      'Luz baixa e quente, sombras longas. Quatro bandeiras, todas alcançáveis dos dois spawns.',
  },
  {
    id: 'quebrada', nome: 'Quebrada (Rua do Baile)', modo: 'CTF · rounds opcional', ctf: true,
    resumo: 'Uma rua reta e comprida de periferia, com a rotunda do baile numa ponta e o campinho de terra na outra.',
    detalhe: 'O mapa mais novo, e o único que é uma RUA: asfalto no eixo, calçada dos dois lados, ' +
      'barracos e comércio de quebrada em volta - adega, açaí, sorveteria, lanchonete, móveis. ' +
      'Numa ponta a praça do baile, com carros tunados e paredão de caixa de som; na outra, o ' +
      'campinho de terra. Pelo meio: ônibus parado com ponto, bar com cadeira de plástico na ' +
      'calçada e barricadas. As duas vielas do fundo não são enfeite - são a rota alternativa que ' +
      'impede a rua virar corredor de sniper. Quatro bandeiras: campinho, bar de esquina, ponto de ' +
      'ônibus e praça do baile.',
  },
  {
    id: 'lajes', nome: 'Lajes (Comunidade)', modo: 'CTF · rounds opcional', ctf: true,
    resumo: 'Becos estreitos entre casas de alvenaria, um campo aberto no centro e combate nas lajes.',
    detalhe: 'Os dois times começam no térreo. Três caminhos entre as casas ligam os respawns, ' +
      'e só o campo central oferece uma abertura ampla no chão. Quatro escadas conectam os becos ' +
      'às duas travessias superiores, com caixas de água, muretas e varais. As quatro bandeiras ' +
      'ficam nas lajes: subir amplia a visão, mas exige disputar os acessos e a cobertura.',
  },
  {"id": "amazonia", "nome": "Treta na Amazônia", "modo": "CTF · rounds opcional", "ctf": true, "resumo": "Uma arena na floresta amazônica, com construções e vegetação em torno das rotas de combate.", "detalhe": "Escolha a rota entre a vegetação e as construções. Abre em Capture the Flag; o modo pode ser alterado no menu."},
  {"id": "escadao", "nome": "Escadão (Morro)", "modo": "CTF · rounds opcional", "ctf": true, "resumo": "Arena de morro com escadarias, casas e combate entre níveis.", "detalhe": "As escadarias ligam as áreas da comunidade. Abre em Capture the Flag; também aceita rounds."},
  {"id": "corrego", "nome": "Córrego (Favela de SP)", "modo": "CTF · rounds opcional", "ctf": true, "resumo": "Favela de São Paulo organizada em torno de um córrego.", "detalhe": "O córrego faz parte da paisagem e das rotas de travessia. Escolha Capture the Flag ou rounds antes da partida."},
  {"id": "posto_treta", "nome": "Posto da Treta", "modo": "CTF · rounds opcional", "ctf": true, "resumo": "Posto de gasolina de beira de estrada, com bombas, marquise e loja.", "detalhe": "Bombas, marquise e loja dividem as áreas de combate. Abre em Capture the Flag; também aceita rounds."},
  {"id": "velho_oeste", "nome": "Sertão da Treta", "modo": "CTF · rounds opcional", "ctf": true, "resumo": "Arena no sertão, com construções e paisagem da caatinga.", "detalhe": "Explore as rotas da arena do sertão. Abre em Capture the Flag; escolha o modo no menu antes de jogar."},
  {
    id: 'invasao_javaporcos', nome: 'Cidade Invadida', modo: 'Caça ao Javaporco', ctf: false,
    resumo: 'Bandos saem da mata e se espalham entre lojas e quarteirões.',
    detalhe: 'Retome setores, proteja seu time e explore sobrados, lajes e mercearia. O domínio cai quando você limpa as áreas.',
  },
  {
    id: 'operacao_flavio', nome: 'Operação Flávio', modo: 'Escolta', ctf: false,
    resumo: 'Escolte o senador Zero Um do escritório ao avião executivo antes do fim dos 6 minutos.',
    detalhe: 'A rota cruza o anel de escritórios, o controle de segurança, o pátio de serviço e o hangar. ' +
      'Flávio só avança com ao menos um defensor a até 6 metros; um atacante a até 4 metros contesta o objetivo. ' +
      'O time B vence após 3 segundos na escada de embarque. O time E vence ao abater o alvo.',
  },
];

/** Catálogo editorial gerado de `public/js/characters.js`; nunca leia o filesystem no SSR. */
export { GRUPOS, PERSONAGENS, capaDoGrupo } from './catalog.generated';
export type { Grupo, Personagem } from './catalog.generated';

export interface Controle { tecla: string; acao: string; }

/** Fonte: public/js/main.js (bind de teclado) + tela de configurações do jogo. */
export const CONTROLES: Controle[] = [
  { tecla: 'W A S D', acao: 'Mover' },
  { tecla: 'Mouse', acao: 'Mirar' },
  { tecla: 'Shift', acao: 'Correr' },
  { tecla: 'Ctrl ou C', acao: 'Agachar - deixa a mira bem mais estável' },
  { tecla: 'Espaço', acao: 'Pular' },
  { tecla: 'Clique esquerdo', acao: 'Atirar' },
  { tecla: 'Clique direito', acao: 'Luneta (armas com mira) / ADS' },
  { tecla: 'R', acao: 'Recarregar' },
  { tecla: 'I', acao: 'Inspecionar a arma e ver a skin inteira' },
  { tecla: '1 / 2 / 3', acao: 'Primária / pistola / faca' },
  { tecla: 'Z / X / V', acao: 'Comandos de voz (rádio estilo CS)' },
  { tecla: 'M', acao: 'Trocar de time a qualquer momento' },
  { tecla: 'Tab', acao: 'Placar' },
  { tecla: 'Esc', acao: 'Pausar' },
];
