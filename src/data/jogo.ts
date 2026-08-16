// Conteúdo do jogo em forma de DADO, pro site.
//
// POR QUE ISSO EXISTE, E QUAL É A FONTE DA VERDADE
// As páginas /armas, /mapas e /personagens são SEO orgânico barato: texto real
// sobre coisas que as pessoas procuram por nome ("mapa ferro velho", "AWP",
// "personagens"). Mas o site é Astro/SSR e o jogo é vanilla ES modules que
// importa `three` - dá pra importar public/js/game.js daqui sem arrastar o
// Three.js inteiro pro build do servidor.
//
// Então: FONTE DA VERDADE continua sendo o jogo. Este arquivo é uma CÓPIA de
// vitrine, e cada bloco diz de onde foi copiado. Se divergir, o jogo está certo
// e este arquivo está velho.
//
//   ARMAS       <- public/js/game.js, objeto WEAPONS (dmg/mag/reserve/rate)
//   MAPAS       <- public/js/maps.js, objeto MAPS
//   PERSONAGENS <- public/js/characters.js, arrays de roster (id/team/tribe/name/blurb)
//
// Extraído do código em 2026-08-03 (44 personagens, 5 facções, 5 mapas, 26 armas).
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
  { id: 'akm', nome: 'AKM "KALASH DA VÉIA"', curto: 'AKM', classe: 'Fuzil', dano: 34, pente: 30, reserva: 90, cadencia: 0.105, nota: 'Prima pesada da AK: 4 tiros no corpo, um tico mais lenta.' },
  { id: 'm4', nome: 'M4A1 "REQUINTE"', curto: 'M4', classe: 'Fuzil', dano: 31, pente: 30, reserva: 90, cadencia: 0.09, nota: 'Mais rápida e mais estável que a AK, em troca de dano por tiro.' },
  { id: 'g3', nome: 'HK G3 "FRITZ"', curto: 'G3', classe: 'Fuzil de batalha', dano: 37, pente: 20, reserva: 80, cadencia: 0.11, nota: 'Pente curto, tiro que dói. Fuzil de quem conta os tiros.' },
  { id: 'md97', nome: 'MD97 "FUZIL DA PÁTRIA"', curto: 'MD97', classe: 'Fuzil de batalha', dano: 38, pente: 20, reserva: 80, cadencia: 0.12, nota: 'O fuzil brasileiro do arsenal. O maior dano por tiro entre os automáticos.' },
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

/** 5 arenas jogáveis - a ordem é a do registro (public/js/maps.js, objeto MAPS). */
export const MAPAS: Mapa[] = [
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
];

export interface Personagem { faccao: string; nome: string; blurb: string; }

/* As CORES saem de `public/style.css:384-392` (`.team-p/-b/-u/-c/-f`, variável `--tc`),
   que é o que o jogador vê na tela de seleção. Elas estavam próximas mas diferentes
   (#ff8080 × #ff6b6b, #9dff9d × #7de08f, #c8a8ff × #c79bff, #ff9de0 × #ff8ad1) - perto
   o bastante pra ninguém notar e longe o bastante pra não ser a mesma marca. Só o
   amarelo dos funkeiros já batia.

   Os LEMAS são copiados do jogo - `src/pages/index.astro`, `span.team-slogan` das
   5 team-cards. Três dos cinco divergiam ("A treta se faz na rua!" × "na quebrada!",
   "A treta é um circo!" × "se faz no picadeiro!", "A treta é no fluxo!" × "se faz no
   bailão!"), e o /personagens publicava a versão que ninguém vê na tela. Regra da casa:
   se divergir, o JOGO está certo e este arquivo está velho. */
export const FACCOES: { id: string; nome: string; lema: string; cor: string; nota: string }[] = [
  { id: 'E', nome: 'Time E', lema: 'A treta se faz na praça!', cor: '#ff6b6b', nota: 'O time vermelho da arena. Oito arquétipos de esquerda caricata - nenhum deles é uma pessoa real.' },
  { id: 'B', nome: 'Time B', lema: 'A treta se faz na rodovia!', cor: '#7de08f', nota: 'O time verde. Nove arquétipos de direita caricata, com a mesma dose de zoeira dos adversários.' },
  { id: 'urbanas', nome: 'Tribos Urbanas', lema: 'A treta se faz na quebrada!', cor: '#c79bff', nota: 'Facção sem lado político: emo, punk, metaleiro, skatista, rapper e companhia. Entra na treta pelo estilo.' },
  { id: 'palhacos', nome: 'Palhaços', lema: 'A treta se faz no picadeiro!', cor: '#ff8ad1', nota: 'O picadeiro invadiu a arena. Nove palhaços, do clássico de cartola ao que dá medo de verdade.' },
  { id: 'funkeiros', nome: 'Funkeiros', lema: 'A treta se faz no bailão!', cor: '#ffd23f', nota: 'A facção mais nova: mandrake, cria, trap, tamborzão. Ostenta antes, atira depois.' },
];

/** 44 personagens (public/js/characters.js). `faccao` casa com FACCOES[].id */
export const PERSONAGENS: Personagem[] = [
  { id: 'esquerdomacho', faccao: 'E', nome: 'Esquerdomacho', blurb: 'Barba, tote bag e 47 bottons. Mira acadêmica: analisa a treta antes de atirar.' },
  { id: 'sindicato', faccao: 'E', nome: 'Líder do Sindicato', blurb: 'Boné vermelho, colete de assembleia e megafone. Convoca greve de fogo a cada round.' },
  { id: 'mst', faccao: 'E', nome: 'Líder do MST', blurb: 'Do campo pra arena. Bandeira na mochila, bota no barro e tiro certeiro de enxada.' },
  { id: 'doutora', faccao: 'E', nome: 'Doutora do SUS', blurb: 'Jaleco, estetoscópio e plantão de 24h. Receita tiro certeiro, na veia.' },
  { id: 'mistico', faccao: 'E', nome: 'Jovem Místico', blurb: 'Faixa na testa, cristal no peito e aura calibrada. Só atira quando Mercúrio permite.' },
  { id: 'gotinha', faccao: 'E', nome: 'Zé da Gotinha', blurb: 'Mascote da saúde. Imuniza a treta com dose de reforço - e ainda pega o SUS de graça.' },
  { id: 'hipster', faccao: 'E', nome: 'Hipster Alternativo', blurb: 'Moicano colorido e camiseta de banda que você não conhece. Já jogava isso antes de ser mainstream.' },
  { id: 'et', faccao: 'E', nome: 'ET de Varginha', blurb: 'Veio de longe pra treta. Abduz a direita e some no mato de Minas.' },

  { id: 'caminhoneiro', faccao: 'B', nome: 'Caminhoneiro', blurb: 'Camisa do Brasil, luva de estrada e 40h de BR na semana. Freia pra ninguém.' },
  { id: 'sertanejo', faccao: 'B', nome: 'Cantor Sertanejo', blurb: 'Chapéu de cowboy, fivela de ouro e violão nas costas. Moda de viola em dose dupla.' },
  { id: 'coach', faccao: 'B', nome: 'Coach Quântico', blurb: 'Blazer, headset e 47 técnicas de manifestação. Já venceu antes de começar - no quântico.' },
  { id: 'farialimer', faccao: 'B', nome: 'Faria Limer', blurb: 'Colete, sapatênis e planilha de day trade. Compra na baixa, atira na alta.' },
  { id: 'bombado', faccao: 'B', nome: 'Bombado da Academia', blurb: 'Peitoral gigante, perna de palito. Pulou o leg day pra treinar o gatilho.' },
  { id: 'dollynho', faccao: 'B', nome: 'Dollynho', blurb: 'Mascote do guaraná polêmico. Efervescente, gelado e sempre do contra.' },
  { id: 'ancap', faccao: 'B', nome: 'Ancap Medieval', blurb: 'Cota de malha, cruz templária e capa verde-amarela. Privatiza a treta e xinga o Banco Central.' },
  { id: 'canarinho', faccao: 'B', nome: 'Canarinho Pistola', blurb: 'Pistola desde 2016. Bico torto, peito estufado e camisa 24: ele NÃO amarela.' },
  { id: 'proerd', faccao: 'B', nome: 'Leão do Proerd', blurb: 'Camisa preta colada, rugido de mascote de formatura e garra afiada na defesa da treta.' },

  { id: 'emo', faccao: 'urbanas', nome: 'Emo', blurb: 'Franja na cara e playlist de sofrência. Mira embaçada por um olho só.' },
  { id: 'blackmetal', faccao: 'urbanas', nome: 'Black Metal', blurb: 'Corpse paint, cabelão e blast beat. Congela a treta num inverno norueguês.' },
  { id: 'metaleiro', faccao: 'urbanas', nome: 'Metaleiro', blurb: 'Jaqueta jeans coberta de bottons e cabelo até a cintura. Headbang no recuo.' },
  { id: 'punk', faccao: 'urbanas', nome: 'Punk', blurb: 'Moicano colorido e jaqueta de spikes. Anarquia, três acordes e um tiro só.' },
  { id: 'skatista', faccao: 'urbanas', nome: 'Skatista', blurb: 'Gorro, camiseta larga e joelho ralado. Dropa a treta de flip.' },
  { id: 'clubber', faccao: 'urbanas', nome: 'Clubber', blurb: 'Regata neon e glowstick. Só atira no drop da batida.' },
  { id: 'rapper', faccao: 'urbanas', nome: 'Rapper', blurb: 'Camisão gigante, correntes de ouro e calça saggy. Rima e recarrega no flow.' },
  { id: 'reggae', faccao: 'urbanas', nome: 'Rasta', blurb: 'Dreads, gorro rastafári e paz interior. Só que armado. Jah guia a mira.' },
  { id: 'pagodeiro', faccao: 'urbanas', nome: 'Pagodeiro', blurb: 'Platinado, roupa toda branca e corrente de ouro. Canta o hit e acerta o tiro no refrão.' },

  { id: 'bonzo', faccao: 'palhacos', nome: 'Bonzo', blurb: 'Do picadeiro pra praça. Nariz vermelho, sapatão marrom e risada de quem arma o circo.' },
  { id: 'palhacomal', faccao: 'palhacos', nome: 'Palhaço do Mal', blurb: 'Riso que gela a espinha. Sai do picadeiro direto pro pesadelo - e ainda cobra ingresso.' },
  { id: 'jozo', faccao: 'palhacos', nome: 'Jozo', blurb: 'Mascote de lanche pirata. Fritou o juízo no óleo e agora só serve treta com batata.' },
  { id: 'adjim', faccao: 'palhacos', nome: 'Adjim', blurb: 'Espirra, ri e atira. Metade da dupla que faz a criançada chorar de rir (e de medo).' },
  { id: 'esbirro', faccao: 'palhacos', nome: 'Esbirro', blurb: 'A outra metade da dupla. Buzina no gatilho e resenha no recuo.' },
  { id: 'titica', faccao: 'palhacos', nome: 'Titica', blurb: 'Do circo pro Congresso e do Congresso pra arena, sempre no bom humor e no gatilho leve.' },
  { id: 'padati', faccao: 'palhacos', nome: 'Padati', blurb: 'Um da dupla mais colorida do picadeiro. Cambalhota, buzina e mira infantil.' },
  { id: 'padata', faccao: 'palhacos', nome: 'Padata', blurb: 'O outro da dupla. Se um erra, o outro acerta - geralmente na risada.' },
  { id: 'cadequinha', faccao: 'palhacos', nome: 'Cadequinha', blurb: 'Clássico dos clássicos. Cartola, xadrez e uma gargalhada que atravessa gerações.' },

  { id: 'mandrake', faccao: 'funkeiros', nome: 'Mandrake', blurb: 'Boné, Juliet vermelho e corrente de ouro. Ostenta e domina na quebrada.' },
  { id: 'raul', faccao: 'funkeiros', nome: 'Raul da Franja', blurb: 'Franja açucarada, camisa de grife e cordão de ouro falso. Desfila antes de atirar.' },
  { id: 'oakley', faccao: 'funkeiros', nome: 'Oakley', blurb: 'Chapéu Medusa, colete tático e tattoo no braço. O corre só passa por ele.' },
  { id: 'criarj', faccao: 'funkeiros', nome: 'Cria RJ', blurb: 'Cabelo zebrado platinado e camisa de time. Cria do morro, mira de craque.' },
  { id: 'chave', faccao: 'funkeiros', nome: 'Chave SP', blurb: 'Polo, boné e óculos escuros. Só entra na treta se for chave.' },
  { id: 'funkraiz', faccao: 'funkeiros', nome: 'Funk Raiz', blurb: 'Tamborzão na cabeça e passinho no recuo. O funk mais velho da arena.' },
  { id: 'trapfunk', faccao: 'funkeiros', nome: 'Trap Funk', blurb: 'Autotune no grito de guerra e 808 no peito. Trap em dose dupla.' },
  { id: 'fluxo', faccao: 'funkeiros', nome: 'Fluxo', blurb: 'Óculos espelhado e corte na régua. No fluxo, quem corre é a bala.' },
  { id: 'ostentacao', faccao: 'funkeiros', nome: 'Ostentação', blurb: 'Corrente, anel e relógio brilhando. Se é pra atirar, que seja com estilo.' },
];

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
  { tecla: '1 / 2 / 3', acao: 'Primária / pistola / faca' },
  { tecla: 'Z / X / V', acao: 'Comandos de voz (rádio estilo CS)' },
  { tecla: 'M', acao: 'Trocar de time a qualquer momento' },
  { tecla: 'Tab', acao: 'Placar' },
  { tecla: 'Esc', acao: 'Pausar' },
];
