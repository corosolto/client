/* i18n.js — PT é a FONTE, EN é camada (decisão de 06/08, pré-lançamento internacional).
   Por que assim e não chaves espalhadas: o jogo tem centenas de strings PT hardcoded e
   véspera de live não é hora de reescrever call site. Este módulo:
     1. resolve o idioma: escolha explícita (?lang, cs_lang) > país via /api/geo-lang
        (resolveGeoLang, esperada pelo main.js ANTES do boot) > navegador > português;
     2. `tr(s)`: tradução por CORRESPONDÊNCIA EXATA da string PT (o dicionário abaixo);
        sem entrada = fica PT (sabor como apelido de arma É PT nos dois idiomas, decisão);
     3. `translateDom(root)`: varre nós de texto e atributos (placeholder/title/aria) do
        menu ESTÁTICO uma vez no boot — zero mudança no index.astro;
     4. `frase(id, ...args)`: os textos DINÂMICOS do game.js (banner, HUD) com template.
   Páginas do site e docs em EN são outra frente (issue #54; changelog já tem /whats-new). */

let _lang = null;
// ?lang=pt|en na URL vence tudo (teste/demonstração — ex.: a live mostra EN sem mexer em config)
try { const q = new URLSearchParams(location.search).get('lang'); if (q === 'pt' || q === 'en') _lang = q; } catch { /* sem window */ }
if (!_lang) try { _lang = localStorage.getItem('cs_lang'); } catch { /* storage bloqueado */ }
const _explicito = _lang === 'pt' || _lang === 'en';
if (!_explicito) {
  // provisório até a geo responder: navegador ('pt*' vira pt; o resto, en)
  const nav = (typeof navigator !== 'undefined' && (navigator.language || '')) || 'pt';
  _lang = /^pt/i.test(nav) ? 'pt' : 'en';
}
export let LANG = _lang;

/* window.__GEO_LANG__ é a promise que o <head> do index.astro abre antes dos módulos;
   sem ela (host estático puro, dev offline, arnês) fica o provisório do navegador. */
export async function resolveGeoLang() {
  if (_explicito || typeof window === 'undefined' || !window.__GEO_LANG__) return LANG;
  try {
    const d = await window.__GEO_LANG__;
    if (d && (d.lang === 'pt' || d.lang === 'en')) { _lang = d.lang; LANG = d.lang; }
  } catch { /* promise rejeitada: fica o provisório */ }
  return LANG;
}

/* PT -> EN. Ordena por tela pra manutenção; a chave é o texto EXATO (trim) do DOM. */
const DICT = {
  'T$ · ERRO': 'T$ · ERROR',
  // splash / boot
  'CLIQUE OU PRESSIONE QUALQUER TECLA': 'CLICK OR PRESS ANY KEY',
  'CARREGANDO ARENA…': 'LOADING ARENA…',
  'CARREGANDO MODELOS 3D…': 'LOADING 3D MODELS…',
  'CARREGANDO…': 'LOADING…',
  'ARENA PRONTA': 'ARENA READY',
  'SEU PERSONAGEM': 'YOUR CHARACTER',
  'Você entra como': 'You enter as',
  'convidado': 'guest',
  'trocar nick': 'change nick',
  'escolher nick': 'choose nick',
  'já tenho conta': 'I have an account',
  'em segundo plano': 'in the background',
  'Andar com a arma no ombro (tecla F) é mais rápido do que andar mirando.': 'Carrying your weapon on your shoulder (F key) is faster than walking while aiming.',
  // menu principal
  '// ESCOLHA A TRETA': '// PICK YOUR FIGHT',
  // Os dois modos ficam num submenu sob JOGAR e desembocam na tela cheia de mapas.
  'JOGAR': 'PLAY',
  'ABATE': 'DEATHMATCH',
  'CAPTURE A BANDEIRA': 'CAPTURE THE FLAG',
  'SUPORTE AO JOGO': 'SUPPORT THE GAME',
  'COMO JOGAR': 'HOW TO PLAY',
  'SINGLE PLAYER': 'SINGLE PLAYER',
  'CAPTURE THE FLAG': 'CAPTURE THE FLAG',
  'CONFIGURAÇÕES': 'SETTINGS',
  'MÚSICA LIGADA': 'MUSIC ON',
  'MÚSICA DESLIGADA': 'MUSIC OFF',
  'Desligar música do menu': 'Turn off menu music',
  'Ligar música do menu': 'Turn on menu music',
  'Automático (país)': 'Automatic (country)',
  'RANKING': 'LEADERBOARD',
  'MAPA': 'MAP', 'DE': 'OF',
  'APOIE O JOGO': 'SUPPORT THE GAME',
  'SOBRE O JOGO': 'ABOUT THE GAME',
  'Feedback': 'Feedback',
  // painel de feedback (substituiu o MAPA no menu, 07/08)
  'FEEDBACK': 'FEEDBACK',
  'Conta o que curtiu, o que quebrou, o que falta. Vai direto pro dono do jogo.':
    "Tell us what you liked, what broke, what's missing. It goes straight to the game's owner.",
  'escreve aqui o teu feedback…': 'write your feedback here…',
  'teu email': 'your email',
  'Aceito receber novidades do jogo por email (newsletter)': 'I agree to receive game news by email (newsletter)',
  'ENVIAR': 'SEND',
  'escreve o feedback primeiro': 'write your feedback first',
  'preenche um email válido': 'enter a valid email',
  'marca o aceite da newsletter pra enviar': 'tick the newsletter consent to send',
  'enviando…': 'sending…',
  'valeu! feedback enviado.': 'thanks! feedback sent.',
  'calma — muitos envios, tenta daqui a pouco': 'easy — too many submissions, try again soon',
  'não deu pra enviar agora, tenta de novo mais tarde': "couldn't send right now, try again later",
  'Armas': 'Weapons', 'Personagens': 'Characters', 'Mapas': 'Maps',
  'Como jogar': 'How to play', 'Changelog': 'Changelog', 'Sobre': 'About',
  'Docs': 'Docs', 'Issues': 'Issues',
  'online': 'online',
  // multiplayer (menu de primeira instância + tela de salas, 30/08)
  'SALAS ONLINE · CONVIDE PELO LINK': 'ONLINE ROOMS · INVITE BY LINK',
  'CONTRA BOTS · MATA-MATA E CTF': 'VS BOTS · DEATHMATCH AND CTF',
  'CONTRA BOTS · ESCOLHA O MODO': 'VS BOTS · CHOOSE A MODE',
  '// TRETA ONLINE': '// ONLINE FIGHT',
  'SERVIDOR': 'SERVER',
  'o de menor ping é o seu': 'lowest ping is yours',
  'ENTRAR NA TRETA': 'JOIN THE FIGHT',
  '▶ JOGO RÁPIDO': '▶ QUICK PLAY',
  'ENTRAR': 'JOIN',
  'Recebeu um convite? Cola o código aqui.': 'Got an invite? Paste the code here.',
  'CRIAR MINHA SALA': 'CREATE MY ROOM',
  'JOGAR COM AMIGOS': 'PLAY WITH FRIENDS',
  'MAIS OPÇÕES · CRIAR MINHA SALA': 'MORE OPTIONS · CREATE MY ROOM',
  'Escolha um servidor primeiro.': 'Pick a server first.',
  'Este servidor ainda não cria sala só com convite. Use MAIS OPÇÕES e crie com senha.':
    'This server cannot make invite-only rooms yet. Use MORE OPTIONS and set a password.',
  'Esse servidor está no limite de salas. Tente outra região.': 'This server is at its room limit. Try another region.',
  'Não deu pra criar a sala. Tente de novo.': 'Could not create the room. Try again.',
  'ESC ou clique fora só fecham este aviso - a sala continua criada. Ela não aparece na lista: só entra quem tem o código.':
    'ESC or clicking outside only closes this notice - the room stays created. It is not in the list: only people with the code can join.',
  'SALAS ABERTAS': 'OPEN ROOMS',
  'ATUALIZAR': 'REFRESH',
  'NOME': 'NAME', 'MAPAS': 'MAPS', 'MODO': 'MODE', 'SENHA': 'PASSWORD',
  'SALA PRIVADA (só com senha)': 'PRIVATE ROOM (password only)',
  'CRIAR E ENTRAR': 'CREATE AND JOIN',
  'SALA CRIADA': 'ROOM CREATED',
  'COPIAR CÓDIGO': 'COPY CODE',
  'COPIAR LINK': 'COPY LINK',
  'MANDAR NO WHATSAPP': 'SEND ON WHATSAPP',
  '▶ ENTRAR NA SALA': '▶ JOIN THE ROOM',
  'ESC ou clique fora só fecham este aviso - a sala continua criada, na lista.':
    'ESC or clicking outside only closes this notice - the room stays created, in the list.',
  // setup da partida
  'PASSO 1 · A PARTIDA': 'STEP 1 · THE MATCH',
  'PASSO 2 · O SEU LADO': 'STEP 2 · YOUR SIDE',
  'PASSO 2 · O SEU TIME': 'STEP 2 · YOUR TEAM',
  'PASSO 3 · O PERSONAGEM': 'STEP 3 · THE CHARACTER',
  'PASSO 4 · O ADVERSÁRIO': 'STEP 4 · THE OPPONENT',
  'PASSO À PARTE · NOME NA CAMISA': 'SIDE STEP · NAME ON THE JERSEY',
  'PASSO 1 · A PARTIDA (CTF)': 'STEP 1 · THE MATCH (CTF)',
  'O PALCO DA TRETA': 'THE STAGE',
  // map screen (abas de categoria — tela 04 do redesign)
  'ESCOLHA DO MAPA': 'PICK THE MAP',
  'TODOS': 'ALL', 'ARENA': 'ARENA', 'FAVELA': 'FAVELA', 'CIDADES': 'CITIES', 'AMAZONIA': 'AMAZONIA', 'COMUNIDADE': 'COMMUNITY', 'AI': 'AI',
  'OFICIAL': 'OFFICIAL', 'por': 'by',
  // descrições de categoria da tela de mapas (a chave é o texto PT exato do CAT_DESC)
  'O acervo inteiro: oficial e comunidade, arena e cidade.': 'The whole roster: official and community, arena and city.',
  // as duas abas que sobraram do #368 trocaram o texto de categoria
  'Mapas oficiais da casa.': 'Maps made in-house.',
  'O acervo inteiro, do mais jogado ao menos jogado.': 'The whole roster, most played first.',
  'PARTIDA': 'MATCH', 'PARTIDAS': 'MATCHES',
  'Mapas feitos pela comunidade.': 'Maps made by the community.',
  'OFICIAIS': 'OFFICIAL',
  'Combate fechado e simétrico — o duelo de angulação clássico.': 'Tight, symmetric combat — the classic angle duel.',
  'Verticalidade de laje, beco e sombra: quem domina o alto dita o round.': 'Rooftop verticality, alley and shade: who owns the high ground runs the round.',
  'Marcos do Brasil em escala de treta: concreto, calçada e linha reta.': 'Brazilian landmarks at treta scale: concrete, sidewalk and straight lines.',
  'Autoria da comunidade — o crachá de cada mapa diz quem fez.': 'Community-made maps — each badge says who built it.',
  'Construídos pelos agentes de IA da casa.': 'Built by the house AI agents.',
  'ESCOLHA SEU LADO DA TRETA': 'PICK YOUR SIDE',
  'ESCOLHA SEU TIME': 'PICK YOUR TEAM',
  'QUEM VAI LEVAR O CORO?': "WHO'S GETTING THE BOOT?",
  'ESCOLHA SEU PERSONAGEM': 'PICK YOUR CHARACTER',
  'Toda partida é Time E contra Time B.': 'Every match is Team E versus Team B.',
  'ARMAS': 'WEAPONS', 'LUVAS': 'GLOVES', 'BOTS / LADO': 'BOTS / SIDE', 'JOGADORES': 'PLAYERS', 'Nº DE ROUNDS': 'ROUNDS',
  'TODAS': 'ALL', 'VOLTAR': 'BACK', '◀ VOLTAR': '◀ BACK',
  'SEU PERFIL': 'YOUR PROFILE', 'PÔR O NOME NA CAMISA': 'PUT YOUR NAME ON THE JERSEY',
  'NOME NA CAMISA': 'NAME ON THE JERSEY', 'SEM NICK': 'NO NICK',
  'USAR PERSONAGEM': 'USE CHARACTER',
  'NÍVEL': 'LEVEL',
  'ESPECIALIDADE': 'ROLE', 'ATRIBUTOS': 'ATTRIBUTES',
  'VIDA': 'HEALTH', 'VELOCIDADE': 'SPEED', 'PRECISÃO': 'ACCURACY', 'MEME': 'MEME',
  'DIFICULDADE': 'DIFFICULTY', 'FÁCIL': 'EASY', 'MÉDIA': 'MEDIUM', 'DIFÍCIL': 'HARD',
  'INVERTER EIXO VERTICAL': 'INVERT VERTICAL AXIS',
  'ARRASTE · GIRAR': 'DRAG · ROTATE', 'SCROLL · ZOOM': 'SCROLL · ZOOM',
  'PERSONAGENS': 'CHARACTERS', 'PERSONAGEM': 'CHARACTER',
  'ROUNDS': 'ROUNDS', 'CAPTURA': 'CAPTURE', 'MATA-MATA': 'DEATHMATCH',
  'SEU TIME': 'YOUR TEAM', 'INIMIGOS': 'ENEMIES',
  'COMUM': 'COMMON', 'RARO': 'RARE', 'ÉPICO': 'EPIC', 'LENDÁRIO': 'LEGENDARY',
  'FRANCO-ATIRADOR': 'SNIPER', 'DUELISTA': 'DUELIST', 'CORINGA': 'WILDCARD',
  'SOLDADO': 'SOLDIER', 'BATEDOR': 'SCOUT', 'QUEBRA-PORTA': 'BREACHER', 'PAREDE': 'ANCHOR',
  'Um tiro, uma história. Domina as linhas longas do mapa.': 'One shot, one story. Controls the long sightlines.',
  'Ferrolho de guerra: lento, mas cada bala conta uma lenda.': 'War bolt-action: slow, but every bullet tells a story.',
  'Canhão de mão. Recompensa mira fria e pavio curto.': 'Hand cannon. Rewards steady aim and a short fuse.',
  'Seis tiros de pura confiança. Não precisa de mais.': 'Six shots of pure confidence. It needs no more.',
  'Leve e rápido: ganha no giro, na economia e na esperteza.': 'Light and fast: wins on rotations, economy and cunning.',
  'Dano bruto por bala. Controla o recuo, controla a treta.': 'Raw damage per bullet. Control the recoil, control the fight.',
  'Precisão consistente em qualquer distância.': 'Consistent accuracy at any range.',
  'O fuzil da pátria: equilibrado em tudo, ruim em nada.': "The nation's rifle: balanced at everything, bad at nothing.",
  'Pesada e estável — tiroteio longo é com ela mesma.': 'Heavy and steady — long firefights are its specialty.',
  'Mobilidade e cadência: entra, resolve, sai.': 'Mobility and fire rate: get in, settle it, get out.',
  'A mais rápida do pedaço: o mapa inteiro é dela.': 'The fastest around: the whole map is hers.',
  '50 balas de pressão constante no corredor.': '50 rounds of constant pressure down the corridor.',
  'De perto não tem conversa. Nem round pro outro lado.': 'Up close, there is no discussion. No round for the other side either.',
  'Fogo de supressão: segura o corredor sozinho.': 'Suppressive fire: holds the corridor alone.',
  'Equilíbrio em tudo.': 'Balanced at everything.',
  // fichas dinâmicas dos personagens
  'Barba, tote bag e 47 bottons. Mira acadêmica: analisa a treta antes de atirar.':
    'Beard, tote bag and 47 buttons. Academic aim: studies the fight before taking the shot.',
  'Boné vermelho, colete de assembleia e megafone. Convoca greve de fogo a cada round.':
    'Red cap, union vest and megaphone. Calls a fire strike every round.',
  'Do campo pra arena. Bandeira na mochila, bota no barro e tiro certeiro de enxada.':
    'From the fields to the arena. Flag on his pack, boots in the mud and hoe-sharp aim.',
  'Jaleco, estetoscópio e plantão de 24h. Receita tiro certeiro, na veia.':
    'Lab coat, stethoscope and a 24-hour shift. Prescribes a clean shot, straight to the vein.',
  'Faixa na testa, cristal no peito e aura calibrada. Só atira quando Mercúrio permite.':
    'Headband, crystal on his chest and a calibrated aura. Only shoots when Mercury allows it.',
  'Camisa do Brasil, luva de estrada e 40h de BR na semana. Freia pra ninguém.':
    'Brazil jersey, road gloves and 40 hours on the highway each week. Brakes for nobody.',
  'Chapéu de cowboy, fivela de ouro e violão nas costas. Moda de viola em dose dupla.':
    'Cowboy hat, gold buckle and a guitar on his back. Country roots in a double dose.',
  'Blazer, headset e 47 técnicas de manifestação. Já venceu antes de começar — no quântico.':
    'Blazer, headset and 47 manifestation techniques. He won before it started — on the quantum plane.',
  'Mascote da saúde. Imuniza a treta com dose de reforço — e ainda pega o SUS de graça.':
    'Public-health mascot. Immunizes the fight with a booster — courtesy of free universal healthcare.',
  'Colete, sapatênis e planilha de day trade. Compra na baixa, atira na alta.':
    'Vest, dress sneakers and a day-trading spreadsheet. Buys low, shoots high.',
  'Peitoral gigante, perna de palito. Pulou o leg day pra treinar o gatilho.':
    'Massive chest, toothpick legs. Skipped leg day to train his trigger finger.',
  'Moicano colorido e camiseta de banda que você não conhece. Já jogava isso antes de ser mainstream.':
    'Colorful mohawk and a band shirt you have never heard of. Played it before it was mainstream.',
  'Mascote do guaraná polêmico. Efervescente, gelado e sempre do contra.':
    'Mascot of a notorious guaraná soda. Fizzy, chilled and always contrary.',
  'Veio de longe pra treta. Abduz a direita e some no mato de Minas.':
    'Came a long way for the fight. Abducts the right and vanishes into the Minas backwoods.',
  'Cota de malha, cruz templária e capa verde-amarela. Privatiza a treta e xinga o Banco Central.':
    'Chain mail, Templar cross and a green-and-yellow cape. Privatizes the fight and curses the Central Bank.',
  'Pistola desde 2016. Bico torto, peito estufado e camisa 24: ele NÃO amarela.':
    'Furious since 2016. Crooked beak, puffed chest and number 24: this canary never turns yellow.',
  'Camisa preta colada, rugido de mascote de formatura e garra afiada na defesa da treta.':
    'Tight black shirt, graduation-mascot roar and sharp claws defending the fight.',
  'Do picadeiro pra praça. Nariz vermelho, sapatão marrom e risada de quem arma o circo.':
    'From the circus ring to the square. Red nose, brown clown shoes and a laugh that starts a scene.',
  'Riso que gela a espinha. Sai do picadeiro direto pro pesadelo — e ainda cobra ingresso.':
    'A spine-chilling laugh. Goes straight from the ring to your nightmare — and still charges admission.',
  'Mascote de lanche pirata. Fritou o juízo no óleo e agora só serve treta com batata.':
    'Bootleg fast-food mascot. Deep-fried his mind and now serves every fight with fries.',
  'Espirra, ri e atira. Metade da dupla que faz a criançada chorar de rir (e de medo).':
    'Sneezes, laughs and shoots. Half of the duo that makes kids cry with laughter — and fear.',
  'A outra metade da dupla. Buzina no gatilho e resenha no recuo.':
    'The other half of the duo. Horn on the trigger and banter in the recoil.',
  'Do circo pro Congresso e do Congresso pra arena, sempre no bom humor e no gatilho leve.':
    'From circus to Congress and Congress to arena, always in good spirits with a light trigger.',
  'Um da dupla mais colorida do picadeiro. Cambalhota, buzina e mira infantil.':
    'One half of the ring’s most colorful duo. Somersaults, horns and childlike aim.',
  'O outro da dupla. Se um erra, o outro acerta — geralmente na risada.':
    'The other half of the duo. If one misses, the other lands it — usually with a laugh.',
  'Clássico dos clássicos. Cartola, xadrez e uma gargalhada que atravessa gerações.':
    'The ultimate classic. Top hat, checkered suit and a laugh that spans generations.',
  'Franja na cara e playlist de sofrência. Mira embaçada por um olho só.':
    'Bangs over the face and a heartbreak playlist. Aim blurred through one eye.',
  'Corpse paint, cabelão e blast beat. Congela a treta num inverno norueguês.':
    'Corpse paint, long hair and a blast beat. Freezes the fight in a Norwegian winter.',
  'Jaqueta jeans coberta de bottons e cabelo até a cintura. Headbang no recuo.':
    'Denim jacket covered in buttons and waist-length hair. Headbangs through the recoil.',
  'Moicano colorido e jaqueta de spikes. Anarquia, três acordes e um tiro só.':
    'Colorful mohawk and a spiked jacket. Anarchy, three chords and one shot.',
  'Gorro, camiseta larga e joelho ralado. Dropa a treta de flip.':
    'Beanie, baggy tee and scraped knees. Kickflips straight into the fight.',
  'Regata neon e glowstick. Só atira no drop da batida.':
    'Neon tank top and a glow stick. Only shoots when the beat drops.',
  'Camisão gigante, correntes de ouro e calça saggy. Rima e recarrega no flow.':
    'Oversized tee, gold chains and saggy pants. Rhymes and reloads on flow.',
  'Dreads, gorro rastafári e paz interior. Só que armado. Jah guia a mira.':
    'Dreads, a Rasta cap and inner peace. Armed inner peace. Jah guides the aim.',
  'Platinado, roupa toda branca e corrente de ouro. Canta o hit e acerta o tiro no refrão.':
    'Platinum hair, all-white outfit and a gold chain. Sings the hit and lands the shot on the chorus.',
  'Boné, Juliet vermelho e corrente de ouro. Ostenta e domina na quebrada.':
    'Cap, red Juliet shades and a gold chain. Flexes and rules the neighborhood.',
  'Franja açucarada, camisa de grife e cordão de ouro falso. Desfila antes de atirar.':
    'Sugary bangs, designer shirt and a fake gold chain. Struts before taking the shot.',
  'Chapéu Medusa, colete tático e tattoo no braço. O corre só passa por ele.':
    'Medusa hat, tactical vest and an arm tattoo. Every hustle goes through him.',
  'Cabelo zebrado platinado e camisa de time. Cria do morro, mira de craque.':
    'Platinum zebra stripes and a football jersey. Raised on the hill, aims like a star.',
  'Polo, boné e óculos escuros. Só entra na treta se for chave.':
    'Polo shirt, cap and dark shades. Only joins the fight when it is top-tier.',
  'Tamborzão na cabeça e passinho no recuo. O funk mais velho da arena.':
    'Tamborzão in his head and footwork in the recoil. The arena’s old-school funk.',
  'Autotune no grito de guerra e 808 no peito. Trap em dose dupla.':
    'Autotune in the battle cry and an 808 in the chest. A double dose of trap.',
  'Óculos espelhado e corte na régua. No fluxo, quem corre é a bala.':
    'Mirrored shades and a razor-sharp fade. In the flow, the bullet does the running.',
  'Corrente, anel e relógio brilhando. Se é pra atirar, que seja com estilo.':
    'Chain, ring and a gleaming watch. If you are going to shoot, do it in style.',
  'Sétimo filho, maldição da encruzilhada. O lobo preto acorda forte, dentuço e sem coleira.':
    'Seventh son, crossroads curse. The black wolf wakes strong, fanged and unchained.',
  'Cangaceira de precisão. Parou, mirou, acertou — a rainha do primeiro tiro.':
    'Cangaço markswoman. Stop, aim, hit — the queen of the first shot.',
  'Discurso de três horas e o microfone nunca cansa. Faixa no peito, churrasco no domingo.':
    'Three-hour speeches and the mic never gets tired. Sash on the chest, barbecue on Sunday.',
  'Camisa amarela, cercadinho lotado e live toda quinta. Não leva desaforo pra casa.':
    'Yellow jersey, packed fan pen and a live stream every Thursday. Never lets an insult slide.',
  'Estoca vento e saúda a mandioca. Ninguém entende a frase, todo mundo lembra.':
    'Stocks up on wind and salutes the cassava. Nobody gets the sentence, everybody remembers it.',
  'Calcula o arcabouço de cabeça e ainda acha tempo de explicar a conta pro time.':
    'Runs the fiscal framework in his head and still finds time to explain the math to the team.',
  'O 01 da família. Sorriso de campanha e broche sempre no lugar.':
    'The family\'s number 01. Campaign smile and lapel pin always in place.',
  'A toga é capa e o despacho sai antes do café. Joga pelo Time E e ninguém discute.':
    'The robe is a cape and the ruling is out before coffee. Plays for Team E and nobody argues.',
  'Sobe na tribuna de peruca loira e vira meme antes de terminar a frase.':
    'Takes the podium in a blond wig and becomes a meme before finishing the sentence.',
  'Carro de som, cabelo ao vento e uma convocação por minuto. Briga com os dois lados.':
    'Sound truck, hair in the wind and a rally call every minute. Fights with both sides.',
  'Ex-juiz de sotaque marcado. O conje confirma: ele não perde um prazo.':
    'Former judge with a thick accent. The missus confirms: he never misses a deadline.',
  'Tiara de flores, blazer fúcsia e presença de plenário. A treta começa com pose e termina no placar.':
    'Flower tiara, fuchsia blazer and a commanding floor presence. The drama starts with a pose and ends on the scoreboard.',
  'Óculos vinho, coque grisalho e vestido verde-petróleo. A conversa é calma; a mira, firme.':
    'Burgundy glasses, a grey bun and a petrol-green dress. Calm words; steady aim.',
  'Moleque de uma perna só. Redemoinho de fumaça e some — o gorro vermelho é hitbox.':
    'One-legged trickster boy. A whirl of smoke and he is gone — the red cap is the hitbox.',
  'Cangaço no gatilho. Quanto mais segura o tiro, mais dano faz — Virgem Maria!':
    'Cangaço on the trigger. The longer you hold the shot, the harder it hits — Virgem Maria!',
  'Caçador de pegadas. Vê onde o inimigo pisou — o vilão que o time tolera.':
    'Tracker of footprints. Sees where the enemy stepped — the villain the team puts up with.',
  'Golfinho rosa do Amazonas. Sai da cobertura, encanta a mira inimiga e responde de Deagle.':
    'Pink river dolphin of the Amazon. Breaks cover, charms the enemy aim and answers with a Deagle.',
  'Capitão quilombola. O grito de Palmares ecoa e acelera a recarga dos aliados.':
    'Quilombo captain. The cry of Palmares echoes and speeds up allied reloads.',
  'A bruxa de Lobato. Lança poção de lentidão e visão embaralhada — "dorme com o medo".':
    'Lobato’s witch. Throws a potion of slowness and scrambled vision — "sleep with the fear".',
  'Menino de cabelo de fogo, pés virados. As pegadas apontam pro lado errado.':
    'Fire-haired boy with backwards feet. The footprints point the wrong way.',
  'Guardiã da mata, cabelo de fogo e pintura de guerra. Quem caça demais vira caça.':
    'Guardian of the forest, fire hair and war paint. Hunt too much and you become the hunt.',
  'ESQUERDA': 'LEFT', 'DIREITA': 'RIGHT', 'ESQ': 'LFT', 'DIR': 'RGT', 'POLÍTICOS': 'POLITICIANS',
  'TIME E': 'TEAM E', 'TIME B': 'TEAM B', 'Time E': 'Team E', 'Time B': 'Team B',
  'Entrar no time': 'Join team',
  'os seus': 'your crew',
  'TRIBOS URBANAS': 'URBAN TRIBES', 'PALHAÇOS': 'CLOWNS', 'FUNKEIROS': 'FUNKEIROS', 'MÍTICO': 'MYTHIC',
  'PALHACOS': 'CLOWNS', 'MITICOS': 'MYTHIC',
  'ALIADO': 'ALLY', 'INIMIGO': 'ENEMY', 'Fechar': 'Close', 'Lados': 'Sides', 'Categorias': 'Categories',
  'ESCALAÇÃO': 'LINEUP', 'LADO E PERSONAGEM': 'SIDE AND CHARACTER', 'LIMPAR ESCALAÇÃO': 'CLEAR LINEUP',
  '"A treta se faz na praça!"': '"The fight is at the square!"',
  '"A treta se faz na rodovia!"': '"The fight is on the highway!"',
  '"A treta se faz na quebrada!"': '"The fight is in the hood!"',
  '"A treta se faz no picadeiro!"': '"The fight is at the circus ring!"',
  '"A treta se faz no bailão!"': '"The fight is at the baile!"',
  '"A treta atravessa os séculos!"': '"The fight spans the centuries!"',
  '8 PERSONAGENS': '8 CHARACTERS', '9 PERSONAGENS': '9 CHARACTERS',
  'O coração do poder vira arena: rampas do Planalto, espelho d\'água e linhas de tiro longas entre os ministérios.':
    'The heart of power becomes an arena: palace ramps, reflecting pool and long sightlines between ministries.',
  'Salão fechado, eco de tiro e briga de faca no raso. Quem controla a borda controla o round.':
    'An enclosed hall, echoing gunfire and knife fights in the shallow end. Control the edge, control the round.',
  'Estacionamento de megastore: corredores de vaga, mezanino de sniper e a estátua te olhando atirar.':
    'Megastore parking lot: lanes of cars, a sniper mezzanine and the statue watching every shot.',
  'Um ferro velho gigantesco onde tudo pode ser arma e toda sombra pode esconder um traira.':
    'A massive scrapyard where anything can be a weapon and every shadow can hide a traitor.',
  'Rua de baile: muros baixos, beco cego e o paredão marcando o compasso do round.':
    'Baile street: low walls, blind alleys and the sound system setting the pace of the round.',
  'Posto de combustível na beira da BR: loja de conveniência, bombas de cobertura e treta no fluorescente.':
    'A roadside gas station: convenience store, pumps for cover and a fight under fluorescent lights.',
  // configurações
  'INTERFACE': 'INTERFACE', 'ÁUDIO': 'AUDIO', 'VÍDEO': 'VIDEO', 'CONTROLES': 'CONTROLS',
  'IDIOMA': 'LANGUAGE', 'Qualidade gráfica': 'Graphics quality', 'Automático (navegador)': 'Auto (browser)',
  'Português': 'Portuguese', 'Inglês': 'English',
  'SALVAR & VOLTAR': 'SAVE & BACK',
  'Ciano (padrão)': 'Cyan (default)', 'Verde': 'Green', 'Amarela': 'Yellow',
  'Vermelha': 'Red', 'Branca': 'White', 'Magenta': 'Magenta',
  'Média': 'Medium', 'Batata (rápido)': 'Potato (fast)', 'Padrão ouro': 'Gold standard',
  // controles (tela como-jogar do menu)
  'Mover': 'Move', 'Mirar': 'Aim', 'Atirar': 'Shoot', 'Correr': 'Sprint', 'Alternar câmera': 'Switch camera',
  'Pular': 'Jump', 'Recarregar': 'Reload', 'Pausar': 'Pause',
  'Agachar (mira mais estável)': 'Crouch (steadier aim)',
  'Mira telescópica (AWP)': 'Scope (AWP)',
  'Trocar de time': 'Switch team',
  'Comandos de voz (rádio)': 'Voice commands (radio)',
  'Placar': 'Scoreboard',
  'CLIQUE ESQ.': 'LEFT CLICK', 'CLIQUE DIR.': 'RIGHT CLICK', 'ESPAÇO': 'SPACE',
  'ENTENDI': 'GOT IT', 'TÁ ANOTADO': 'NOTED',
  // pausa / fim / HUD estático
  'PAUSA NA TRETA': 'GAME PAUSED',
  'CONTINUAR': 'RESUME', 'CONTINUAR ▶': 'RESUME ▶',
  'REINICIAR PARTIDA': 'RESTART MATCH', 'SAIR PRO MENU': 'QUIT TO MENU',
  'VOLTAR AO MENU': 'BACK TO MENU', 'JOGAR NOVAMENTE': 'PLAY AGAIN',
  'VITÓRIA': 'VICTORY', 'DERROTA': 'DEFEAT', 'PRÓXIMO MAPA CARREGANDO…': 'LOADING NEXT MAP…',
  'ENTRAR NESSE CORO': 'GET THIS BOOT ON',
  'SÓ PISTOLAS': 'PISTOLS ONLY', 'SÓ FACA': 'KNIFE ONLY', 'SÓ AWP': 'AWP ONLY',
  'VOCÊ': 'YOU', 'RÁDIO': 'RADIO', 'Respawn em': 'Respawn in',   // tradução DO DONO (06/08) — não 'join this crew'
  'KILLS': 'KILLS', 'MORTES': 'DEATHS', 'JOGADOR': 'PLAYER', 'CAP.': 'CAP.', 'SOLO': 'SOLO',
  // cabeçalho da tabela da aba RANKING (main.js, renderHubRanking) e o rótulo da linha clicável
  'POS.': 'POS.', 'PONTOS': 'POINTS', 'Ver perfil de': 'View profile of',
  'CORO SOLTO — PLACAR': 'CORO SOLTO — SCOREBOARD',
  'A treta continua sem você. Por enquanto.': 'The fight goes on without you. For now.',
  /* --- varredura de 21/08: as sobras PT que apareciam no meio do EN (tela 04 e vizinhas).
     Personagem, facção e nome de mapa continuam PT nos dois idiomas — é sabor, decisão do dono. */
  // boot / erro
  'CARREGANDO MAPA': 'LOADING MAP',
  'A TRETA DEU UMA PAUSA': 'THE FIGHT TOOK A BREAK',
  'A ARENA NÃO ABRIU': 'THE ARENA DID NOT OPEN',
  'Alguma coisa travou durante o carregamento. O erro já foi registrado automaticamente, sem pedir senha.':
    'Something jammed while loading. The error was logged automatically, no password needed.',
  'RELATÓRIO LOCAL': 'LOCAL REPORT',
  'TENTAR DE NOVO': 'TRY AGAIN',
  'REPORTAR ERRO': 'REPORT ERROR',
  'Se quiser, confirme o envio pelo botão acima.': 'If you like, confirm the submission with the button above.',
  'DICA': 'TIP', 'CORRIDA': 'RUN',
  // aviso de desktop
  'Este jogo foi feito para': 'This game was built for',
  '(mouse + teclado).': '(mouse + keyboard).',
  'Jogar num PC ou notebook é': 'Playing on a PC or laptop is',
  'recomendado': 'recommended',
  '. No celular a treta não flui.': '. On a phone the fight does not flow.',
  // menu principal / perfil
  'RANKING GLOBAL': 'GLOBAL LEADERBOARD',
  'MAPA DA TRETA': 'THE MAP',
  'SOBRE': 'ABOUT',
  'ENVIE SEU FEEDBACK': 'SEND YOUR FEEDBACK',
  'EDITAR PERFIL': 'EDIT PROFILE',
  'NÍVEL 1': 'LEVEL 1',
  '▶ JOGAR': '▶ PLAY',
  'CONFIG.': 'SETTINGS',
  'SEU NICK': 'YOUR NICK',
  'REDES SOCIAIS (OPCIONAL)': 'SOCIAL LINKS (OPTIONAL)',
  '+ REDE SOCIAL': '+ SOCIAL LINK',
  '+ FOTO DE PERFIL': '+ PROFILE PHOTO',
  'É esse nome que aparece no killfeed. Escolha com carinho - a treta é pública.':
    'This is the name that shows up in the killfeed. Choose it well — the fight is public.',
  'ex: Zé do AWP': 'e.g. AWP Joe',
  // tela 04 · escolha do mapa
  '04 · ESCOLHA DO MAPA': '04 · PICK THE MAP',
  'Categorias de mapa': 'Map categories',
  'Opções da partida': 'Match options',
  'Mapa anterior': 'Previous map', 'mapa anterior': 'previous map',
  'Próximo mapa': 'Next map', 'próximo mapa': 'next map',
  'Ver mapa em tela cheia': 'View map full screen',
  'Escolher o mapa da partida': 'Pick the match map',
  'Escolher as armas da partida': 'Pick the match weapons',
  'Clique pra trocar entre ROUNDS e CAPTURE THE FLAG': 'Click to switch between ROUNDS and CAPTURE THE FLAG',
  // fichas dos mapas que faltavam (as antigas já estavam acima)
  'Galpão de atacado em guerra: gôndolas apertadas, caixas de cobertura e o estacionamento disputado carrinho por carrinho.':
    'A wholesale warehouse at war: tight aisles, crates for cover and a parking lot contested cart by cart.',
  'Um parque de diversões em guerra de confete: carrossel no centro, roda-gigante, castelo colorido e três rotas de ataque.':
    'An amusement park in a confetti war: carousel at the center, ferris wheel, colorful castle and three attack routes.',
  'Duelo na cidade empoeirada: saloon, banco, carroças e tumbleweeds cruzando três rotas entre casas de madeira.':
    'A duel in the dusty town: saloon, bank, wagons and tumbleweeds crossing three routes between wooden houses.',
  'Rebelião no pátio: celas abertas, concreto gasto, guaritas e barricadas policiais entre três rotas de confronto.':
    'Yard riot: open cells, worn concrete, watchtowers and police barricades across three routes.',
  'Pronto-socorro lotado: salas de verdade, corredor em cruz e treta no fluorescente — 100% interno.':
    'A packed emergency room: real wards, a cross-shaped corridor and a fight under fluorescent light — fully indoors.',
  'Canteiro de obra eterna: terreno ondulado, buracos de escavação, tapumes e a treta do desvio de verba.':
    'An eternal construction site: uneven ground, dig pits, hoardings and the fight over the missing budget.',
  // personagem / config / como jogar
  'personagem anterior': 'previous character', 'próximo personagem': 'next character',
  'Categorias de configuração': 'Settings categories',
  'Configurações': 'Settings',
  'Escolha sua região': 'Choose your region',
  'Liga/desliga as falas (memes)': 'Toggle the meme voice lines',
  'FECHAR': 'CLOSE', 'JOGABILIDADE': 'GAMEPLAY',
  'QUALIDADE GRÁFICA': 'GRAPHICS QUALITY',
  'SENSIBILIDADE DO MOUSE': 'MOUSE SENSITIVITY',
  'LIGADO': 'ON', 'DESLIGADO': 'OFF',
  'VOLUME GERAL': 'MASTER VOLUME',
  'FALAS DOS MEMES': 'MEME VOICE LINES',
  'COR DA MIRA': 'CROSSHAIR COLOR',
  'AJUDAR A TREINAR OS BOTS': 'HELP TRAIN THE BOTS',
  '“Padrão ouro” liga sombras e neblina. Em notebook de reunião, escolha “Batata”.':
    '“Gold standard” turns on shadows and fog. On a meeting laptop, pick “Potato”.',
  'PRÉVIA · FERRO VELHO DO ZÉ · PADRÃO OURO': 'PREVIEW · FERRO VELHO DO ZÉ · GOLD STANDARD',
  'RESTAURAR PADRÃO': 'RESTORE DEFAULTS',
  'APLICAR': 'APPLY', 'SALVAR': 'SAVE',
  'Estes stats ficam': 'These stats live', 'neste navegador': 'in this browser',
  '. O ranking global está desligado enquanto o jogo está em alpha - volta quando o placar for confiável.':
    '. The global leaderboard is off while the game is in alpha — it returns when the scoreboard is trustworthy.',
  'O CORO SOLTO ainda está em alpha. Se você curte a ideia, qualquer apoio ajuda a pagar servidor, domínio e as próximas melhorias.':
    'CORO SOLTO is still in alpha. If you like the idea, any support helps pay for the server, the domain and the next improvements.',
  '🇧🇷 SOU DO BRASIL': '🇧🇷 I AM IN BRAZIL',
  '🌐 FORA DO BRASIL': '🌐 OUTSIDE BRAZIL',
  'ABRIR PÁGINA DE APOIO': 'OPEN THE SUPPORT PAGE',
  'AWP / Pistola / Faca': 'AWP / Pistol / Knife',
  'RODINHA': 'MOUSE WHEEL',
  'Próxima / anterior arma': 'Next / previous weapon',
  'CTRL ou C': 'CTRL or C',
  'Gire o celular na horizontal pra jogar': 'Turn your phone sideways to play',
  'com respawn: cada round dura 1:39 ou fecha quando um time chega no alvo de abates; o time com mais kills leva o round. Por padrão, vence quem ganhar 3 rounds (melhor de 5); o teto pode ser escolhido na tela de mapas.':
    'with respawn: each round lasts 1:39 or ends when a team hits the kill target; the team with more kills takes the round. By default the first to 3 rounds wins (best of 5); the cap can be chosen on the map screen.',
  'não tem cronômetro de round: a rodada acaba quando um time captura 3 bandeiras (ou domina todas de uma vez). Vence quem ganhar 2 rodadas (melhor de 3). A partida tem um limite de 8 minutos, que só aparece no HUD no último minuto.':
    'has no round clock: the round ends when a team captures 3 flags (or holds them all at once). First to 2 rounds wins (best of 3). The match has an 8-minute cap that only shows on the HUD in the final minute.',
  // HUD / placar
  'PROTEGIDO': 'PROTECTED',
  'RECARREGANDO…': 'RELOADING…',
  'Z/X/V RÁDIO': 'Z/X/V RADIO', 'TAB PLACAR': 'TAB SCOREBOARD', 'M TROCAR DE TIME': 'M SWITCH TEAM',
  'CLIQUE PARA ATIVAR A MIRA': 'CLICK TO LOCK THE CROSSHAIR',
  'Se o navegador bloquear, clique de novo. Em iframe/preview, abra o jogo em aba própria.':
    'If the browser blocks it, click again. Inside an iframe/preview, open the game in its own tab.',
  'ELIMINADO': 'ELIMINATED',
  'CORO SOLTO - PLACAR': 'CORO SOLTO — SCOREBOARD',
  'SEGURAR PARA VER': 'HOLD TO VIEW', 'ATIVAR CURSOR': 'ENABLE CURSOR',
  'Armas e utilitários': 'Weapons and utilities',
  'Fumaça (tecla 4)  ·  Frag (tecla 5)': 'Smoke (key 4)  ·  Frag (key 5)',
  // chat de sala (#686). ENVIAR, FECHAR, TODOS e VOLTAR já existem acima: a UIR5 reprova duplicata.
  'CHAT': 'CHAT', 'Y SALA': 'Y ROOM', 'U TIME': 'U TEAM', 'Chat da sala': 'Room chat', 'OCULTAR': 'HIDE', 'BLOQUEADOS': 'BLOCKED',
  'BLOQUEAR': 'BLOCK', 'DENUNCIAR': 'REPORT', 'CANCELAR': 'CANCEL', 'DESBLOQUEAR': 'UNBLOCK', 'Bloqueados': 'Blocked',
  'Ações da mensagem': 'Message actions', 'MOTIVO DA DENÚNCIA': 'REPORT REASON', 'Mensagem': 'Message', 'Canal': 'Channel',
  'Mensagens anteriores': 'Earlier messages', 'Bloquear também?': 'Block too?', 'Ninguém bloqueado': 'Nobody blocked',
  'Ao denunciar, a mensagem e um identificador anônimo ficam guardados por 90 dias para moderação.':
    'When you report, the message and an anonymous identifier are kept for 90 days for moderation.',
  // rodapé / links
  'Links do jogo': 'Game links', 'Menu principal': 'Main menu', 'Abrir seu perfil': 'Open your profile',
  'Discord do CORO SOLTO': 'CORO SOLTO Discord', 'Telegram do CORO SOLTO': 'CORO SOLTO Telegram',
  'Código no GitHub': 'Source on GitHub',
  // tp:lobby
  'Seções': 'Sections', 'LOJA': 'SHOP', 'ARMÁRIO': 'LOCKER', 'CARREIRA': 'CAREER', 'CLÃ': 'CLAN',
  'MAIS': 'MORE', 'Mais opções': 'More options', 'AMIGOS': 'FRIENDS', 'AJUSTES': 'SETTINGS',
  'PRIVACIDADE': 'PRIVACY', 'TERMOS DE USO': 'TERMS OF USE', 'EXCLUIR DADOS': 'DELETE DATA', 'MAPA AO VIVO': 'LIVE MAP',
  'QUESTS DA TRETA': 'TRETA QUESTS', 'VER TODAS AS QUESTS ▸': 'SEE ALL QUESTS ▸', 'Quests e novidades': 'Quests and news',
  'ENTRAR PARA CRIAR MEU CONVITE': 'SIGN IN TO CREATE MY INVITE', 'COPIAR MEU CONVITE ↗': 'COPY MY INVITE ↗',
  'GANHE ANTES DE ESCOLHER': 'EARN BEFORE YOU CHOOSE', 'CONVITE RECEBIDO': 'INVITE RECEIVED',
  'VOCÊ CHEGOU PELA SUA TURMA.': 'YOUR CREW BROUGHT YOU HERE.',
  'CONCLUÍDA': 'DONE', 'ENTRE PARA GANHAR T$ ▸': 'SIGN IN TO EARN T$ ▸',
  'Não deu pra consultar as quests agora.': 'Could not load the quests right now.',
  'Consultando as quests…': 'Loading quests…', 'Nenhuma quest ativa agora.': 'No active quests right now.',
  'Confirme seu email': 'Confirm your email', 'Chame sua turma': 'Call your crew',
  'Conclua uma partida solo': 'Finish a solo match', 'Conclua uma partida multiplayer': 'Finish a multiplayer match',
  'NOVIDADES': 'NEWS', 'O QUE MUDOU NA ARENA': 'WHAT CHANGED IN THE ARENA', 'VER NOVIDADES ▸': 'SEE WHAT IS NEW ▸',
  'NOVIDADES DE SKINS': 'SKIN NEWS', 'VER LOJA ▸': 'VIEW STORE ▸',
  'Amigos online': 'Friends online', 'AMIGOS ONLINE': 'FRIENDS ONLINE', 'CONVIDAR': 'INVITE', '+ CONVIDAR': '+ INVITE',
  'Placar e amigos': 'Leaderboard and friends', 'PLACAR DA RUA': 'STREET SCOREBOARD', 'VER RANKING ▸': 'VIEW LEADERBOARD ▸',
  'pontos': 'points',
  'Você ainda não pontuou no placar.': 'You have not scored on the leaderboard yet.',
  'Não deu pra consultar o placar agora.': 'Could not load the leaderboard right now.',
  'Consultando o placar…': 'Loading the leaderboard…', 'Ainda ninguém pontuou no placar.': 'Nobody has scored on the leaderboard yet.',
  'Placar da rua ao vivo': 'Street scoreboard live', 'SEU RANKING': 'YOUR RANK',
  'ENTRE PRA APARECER NO PLACAR ▸': 'SIGN IN TO JOIN THE BOARD ▸', 'VOCÊ LIDERA O PLACAR': 'YOU LEAD THE BOARD',
  'pontos pra alcançar': 'points to catch', 'empatado com': 'tied with',
  'Ainda não dá pra ver quem está online. Chame a turma com o link de uma sala.':
    'You cannot see who is online yet. Call your crew with a room link.',
  'VER AMIGOS ▸': 'SEE FRIENDS ▸', 'Tipo de partida': 'Match type', 'PRIVADA': 'PRIVATE',
  'CONVIDAR PRA PARTY': 'INVITE TO PARTY', 'TROCAR ▸': 'CHANGE ▸',
  'O multiplayer não respondeu agora. Tente de novo em um minuto.': 'Multiplayer did not answer just now. Try again in a minute.',
  'TROCAR PERSONAGEM ▸': 'CHANGE CHARACTER ▸',
  'INSTALAR O APP': 'INSTALL THE APP', 'GIRE O CELULAR': 'ROTATE YOUR PHONE', 'INSTALAR O APP (TELA CHEIA)': 'INSTALL THE APP (FULL SCREEN)',
  'A treta é na horizontal. Gire pra entrar direto no lobby; o progresso continua de onde parou.':
    'The fight is in landscape. Rotate to go straight to the lobby; your progress picks up where it left off.',
  'Entrando na mesma conta, o progresso é o mesmo do PC.': 'Sign in to the same account and your progress matches the PC.',
  // tp:fim-lobby

  // tp:modos
  'Voltar ao lobby': 'Back to lobby', 'ESCOLHA A TRETA': 'PICK YOUR FIGHT', 'Modo de jogo': 'Game mode', 'SALA PRIVADA': 'PRIVATE ROOM',
  'Rounds, elimine o time inteiro': 'Rounds, wipe out the whole team', 'Roube a bandeira e leve pra base': 'Steal the flag and bring it home',
  'Salas públicas': 'Public rooms', 'Chame a turma pelo link': 'Call your crew with a link',
  '★ FAVORITOS': '★ FAVORITES', 'NOVOS': 'NEW', 'NOVO': 'NEW', 'EM OBRAS': 'WIP', 'Buscar mapa': 'Search map', 'MAPA ALEATÓRIO': 'RANDOM MAP',
  'Marcar como favorito': 'Mark as favorite', 'Tirar dos favoritos': 'Remove from favorites',
  'Marque a estrela de um mapa para ele aparecer aqui.': 'Star a map to see it here.', 'Nenhum mapa com esse filtro.': 'No map matches this filter.',
  'Configurar partida': 'Match setup', 'Menos bots no seu time': 'Fewer bots on your team', 'Mais bots no seu time': 'More bots on your team',
  'Menos inimigos': 'Fewer enemies', 'Mais inimigos': 'More enemies', 'Menos rounds': 'Fewer rounds', 'Mais rounds': 'More rounds',
  'PESADAS': 'HEAVY', 'SUBMETRALHADORAS': 'SMGS', 'FUZIS': 'RIFLES', 'Comprar': 'Buy',
  'EQUIPAMENTO': 'GEAR', 'COLETE': 'KEVLAR', 'COLETE + CAPACETE': 'KEVLAR + HELMET', 'CAPACETE': 'HELMET',
  'PISTOLAS': 'PISTOLS', 'FACA': 'KNIFE', 'DE BOA': 'CHILL', 'TRETA': 'TOUGH', 'INSANO': 'INSANE', 'você': 'you', 'só você': 'just you',
  'Escalação': 'Lineup', 'travado, resto sorteado': 'locked, the rest drawn at random', 'travados, resto sorteado': 'locked, the rest drawn at random',
  'Escalação automática, todos sorteados': 'Automatic lineup, everyone drawn at random', 'EDITAR': 'EDIT',
  // tp:fim-modos

  // tp:carregamento
  'Segure TAB a qualquer momento para ver o placar e quem está vivo.': 'Hold TAB at any time to see the scoreboard and who is still alive.',
  'Agachar reduz o espalhamento do tiro — mas também a sua velocidade.': 'Crouching tightens your spread, but it also slows you down.',
  'Tiro na cabeça mata em quase tudo. Mire alto no corredor.': 'A headshot kills with almost anything. Aim high in the corridor.',
  'A fumaça (tecla 4) corta a linha de visão dos bots, não só a sua.': 'Smoke (key 4) blocks the bots\' line of sight, not just yours.',
  'O radar mostra parede: use ele para saber de onde o barulho vem.': 'The radar shows walls: use it to tell where the noise is coming from.',
  'Recarregar cancela o tiro. Não recarregue no meio da troca.': 'Reloading cancels your shot. Do not reload in the middle of a firefight.',
  'Cada personagem muda só a aparência — a mira é toda sua.': 'Each character only changes the look. The aim is all yours.',
  'CARREGANDO TEXTURAS…': 'LOADING TEXTURES…', 'POSICIONANDO OS BOTS…': 'PLACING THE BOTS…', 'AQUECENDO A TRETA…': 'WARMING UP THE FIGHT…',
  'CARREGANDO PERSONAGENS…': 'LOADING CHARACTERS…', 'VAGA DE BOT ENTRANDO': 'BOT SLOT JOINING',
  // tp:fim-carregamento

  // tp:hud
  'ABATES': 'KILLS', 'SEQUÊNCIA': 'STREAK', 'vivo': 'alive', 'morto': 'dead',
  'pegar': 'pick up', 'câmera': 'camera', 'time': 'team', 'órbita': 'orbit', 'RECARREGAR': 'RELOAD',
  '1ª PESSOA': '1ST PERSON', '3ª PESSOA': '3RD PERSON', 'OMBRO': 'SHOULDER', 'Guia inicial: três ações, comandos completos com ALT': 'Quick guide: three actions, full controls with ALT',
  'rádio': 'radio', 'placar': 'scoreboard', 'Ó O CARA ALI!': 'ENEMY THERE!', 'OLHA AQUI': 'LOOK HERE',
  'Você marcou um inimigo': 'You marked an enemy', 'Você marcou um ponto': 'You marked a spot',
  'CHAT DA SALA': 'ROOM CHAT', 'Filtrar mensagens': 'Filter messages', 'envia': 'send', 'time / sala': 'team / room', 'fecha': 'close',
  'Silenciar nesta partida': 'Mute for this match', 'silenciado nesta partida': 'muted for this match',
  'MIRA': 'AIM', 'AGACHA': 'CROUCH', 'ATIRA': 'FIRE', 'PULA': 'JUMP', 'ARRASTE AQUI PRA MIRAR': 'DRAG HERE TO AIM',
  // tp:fim-hud

  // tp:resultado
  'A {time} levou a treta. O pastel da vitória está pago.': 'The {time} took the fight. Victory pastel is on the house.',
  'A {time} levou a melhor. Já pediram CPI da partida.': 'The {time} got the upper hand. They already demanded an inquiry.',
  'Esquerda': 'Left', 'Direita': 'Right', 'Rodadas {a} a {b}': 'Rounds {a} to {b}',
  'Abates': 'Kills', 'Mortes': 'Deaths', 'Headshot': 'Headshot', 'Duração': 'Duration',
  'Abate duplo': 'Double kill', 'Abate triplo': 'Triple kill',
  'Abate quádruplo': 'Quadra kill', 'Abate múltiplo': 'Multi kill',
  'Experiência': 'Experience', 'Quests': 'Quests', 'TRETA$ ganhos': 'TRETA$ earned',
  'Jogar de novo': 'Play again',
  'Outro mapa': 'Another map',
  'Lobby': 'Lobby', 'Compartilhar card': 'Share card', 'Compartilhar': 'Share',
  'Compartilhado': 'Shared', 'Link copiado': 'Link copied', 'Copie o link': 'Copy the link',
  'Ganhei uma treta no CORO SOLTO. Bora jogar?': 'I won a fight in CORO SOLTO. Wanna play?',
  'Perdi uma treta no CORO SOLTO. Bora jogar?': 'I lost a fight in CORO SOLTO. Wanna play?',
  'Empate no CORO SOLTO. Bora jogar?': 'A draw in CORO SOLTO. Wanna play?',
  // tp:fim-resultado

  // tp:loja
  'LOJA DA': 'SHOP', 'SKINS': 'SKINS',  'GANHAR T$': 'EARN T$', 'GANHAR MAIS': 'EARN MORE', 'Seções da loja': 'Shop sections',
  'NO SEU ARMÁRIO': 'IN YOUR LOCKER', 'EQUIPADO': 'EQUIPPED', 'EQUIPAR': 'EQUIP', 'EM PRODUÇÃO': 'IN PRODUCTION',
  'CONSULTA INDISPONÍVEL': 'CHECK UNAVAILABLE', 'CONSULTANDO…': 'CHECKING…', 'INCOMUM': 'UNCOMMON', 'SÉRIE GAMBIARRA': 'GAMBIARRA SERIES',
  'GANHE T$': 'EARN T$', 'Partidas hoje': 'Matches today', 'Chame sua turma · T$ {v} por amigo': 'Bring your crew · T$ {v} per friend',
  'COPIAR CONVITE': 'COPY INVITE', 'ENTRAR NA CONTA': 'SIGN IN', 'Entre na conta para ganhar T$ e guardar seu armário.': 'Sign in to earn T$ and keep your locker.',
  'Não há quests ativas agora. Seu saldo e seus visuais continuam na conta.': 'No active quests right now. Your balance and outfits stay on your account.',
  'Sem compra de moeda: T$ só vem de quests e partidas. Visual não dá vantagem.': 'No currency purchases: T$ only comes from quests and matches. Outfits give no advantage.',
  'VER EM 3D': 'VIEW IN 3D', 'VISUAL': 'OUTFIT', 'Personagem base': 'Base character', 'VISUAIS · {n} DE {m}': 'OUTFITS · {n} OF {m}',
  'Filtrar visuais': 'Filter outfits', 'MEUS': 'MINE', 'DESBLOQUEAR VISUAL': 'UNLOCK OUTFIT', 'Não deu para equipar agora. Tente de novo.': 'Could not equip right now. Try again.',
  'Visual é só cosmético: mesmo dano, velocidade e hitbox. O equipado entra com você na próxima partida.':
    'Outfits are cosmetic only: same damage, speed and hitbox. The equipped one joins you in your next match.',
  'HISTÓRICO DE COMPRAS': 'PURCHASE HISTORY', 'SUA CARTEIRA': 'YOUR WALLET', 'SALDO': 'BALANCE',
  'Você ainda não comprou nenhum visual.': 'You have not bought any outfits yet.',
  // tp:fim-loja

  // tp:perfil
  'Perfil': 'Profile', 'Carreira e clã': 'Career and clan', 'Seu perfil e sua carreira': 'Your profile and career',
  'Cartão público': 'Public card', 'A bio ainda está no aquecimento.': 'The bio is still warming up.', 'Mais ações': 'More actions',
  'Nível': 'Level', 'jogando agora': 'playing now', 'no lobby': 'in the lobby', 'Vitória': 'Win', 'Derrota': 'Loss',
  'Soldado': 'Private', 'Cabo': 'Corporal', 'Sargento': 'Sergeant', 'Tenente': 'Lieutenant', 'Capitão': 'Captain',
  'Tenente-coronel': 'Lieutenant colonel', 'Coronel': 'Colonel',
  'COMPARTILHAR PERFIL': 'SHARE PROFILE', 'ADICIONAR AMIGO': 'ADD FRIEND', 'ACEITAR AMIZADE': 'ACCEPT FRIEND', 'RECUSAR': 'DECLINE',
  'MANDAR MENSAGEM': 'SEND MESSAGE', 'CHAMAR PARA A SALA': 'INVITE TO ROOM', 'REMOVER AMIGO': 'REMOVE FRIEND', 'CANCELAR PEDIDO': 'CANCEL REQUEST',
  'AMIGOS ✓': 'FRIENDS ✓', 'PEDIDO ENVIADO': 'REQUEST SENT',
  'CONVIDAR AMIGOS': 'INVITE FRIENDS', 'Buscar por nickname ou e-mail': 'Search by nickname or email',
  'Bora jogar CORO SOLTO': 'Let’s play CORO SOLTO',
  'Sou {nick} no CORO SOLTO. Bora pegar uma treta comigo? {link}': 'I’m {nick} in CORO SOLTO. Wanna join my fight? {link}',
  'Bora pegar uma treta comigo? {link}': 'Wanna join my fight? {link}',
  'CHAMAR A TURMA': 'CALL THE CREW', 'O convite já vai escrito. Escolha a rede, escolha o amigo e mande.': 'The invite is ready. Pick an app, pick a friend and send it.',
  'E-mail': 'Email', 'MAIS APPS': 'MORE APPS', 'Mensagem copiada. Escolha o amigo e cole no chat.': 'Message copied. Pick a friend and paste it in the chat.',
  'Não consegui copiar. Copie o convite acima na mão.': 'Could not copy it. Copy the invite above manually.',
  '+AMIGO': '+FRIEND', 'ENTRE NA CONTA': 'SIGN IN', 'CALMA…': 'SLOW DOWN…', 'INDISPONÍVEL': 'UNAVAILABLE',
  'SEM CONTA': 'NO ACCOUNT', 'VOCÊ :-)': 'YOU :-)', 'NÃO DEU': 'FAILED', 'SEM REDE': 'OFFLINE',
  'Tá anotado.': 'Done.', 'Só um instante…': 'One moment…', 'Não deu certo agora. Tente de novo.': 'That did not work. Try again.',
  'Pedido de amizade enviado. Ele aparece na CENTRAL de quem recebe.': 'Friend request sent. It shows up in their INBOX.',
  'Pedido aceito: agora vocês são amigos.': 'Request accepted: you are friends now.',
  'Este jogador ainda não tem conta na resenha, então não recebe pedido de amizade.': 'This player has no account yet, so they cannot get friend requests.',
  'Entre na conta em SUA CONTA. Depois do login o pedido de amizade sai sozinho.': 'Sign in under YOUR ACCOUNT. The friend request goes out after you log in.',
  'Escolha seu nick em SUA CONTA. O pedido de amizade sai logo depois.': 'Pick your nick under YOUR ACCOUNT. The friend request goes out right after.',
  'Esse jogador não pode interagir com você.': 'This player cannot interact with you.',
  'Entrar ou criar conta': 'Sign in or create an account', 'Você está sem conta': 'You have no account',
  'Este perfil fica só neste navegador. Com conta ele ganha link próprio, amigos e ranking.': 'This profile lives only in this browser. With an account it gets its own link, friends and ranking.',
  'Seu perfil': 'Your profile', 'ainda sem rodada confirmada': 'still no confirmed round',
  'Abates, ranking e histórico aparecem aqui quando o servidor confirmar sua primeira rodada.': 'Kills, ranking and history show up here once the server confirms your first round.',
  'JOGAR AGORA': 'PLAY NOW',
  'Vitrine': 'Showcase', 'destaques do histórico': 'highlights from your record', 'Último personagem': 'Last character',
  'Personagem aparece depois da primeira rodada confirmada': 'Character shows up after the first confirmed round',
  'Último personagem não compartilhado': 'Last character not shared',
  'Medalhas': 'Medals', 'A primeira medalha vem do primeiro abate': 'The first medal comes with the first kill',
  'A primeira medalha vem do primeiro abate.': 'The first medal comes with the first kill.',
  'Arena favorita': 'Favorite arena', 'Arena favorita aparece com as rodadas confirmadas': 'Favorite arena shows up with confirmed rounds',
  'Primeiro abate': 'First kill', 'Dez abates na conta': 'Ten kills on the account', 'Primeira vitória': 'First win', 'Uma hora de arena ativa': 'One hour of active arena',
  'Números': 'Stats', 'VER CARREIRA': 'SEE CAREER',  'Vitórias': 'Wins', 'Partidas': 'Matches', 'Ranking': 'Rank',
  'Privado': 'Private', 'Arma': 'Weapon', 'sem rodada confirmada': 'no confirmed round yet',
  'sem abate no multiplayer': 'no multiplayer kill yet',
  'Horas jogadas': 'Hours played', 'ainda sem partida confirmada': 'no confirmed match yet',
  'Horas confirmadas pelo servidor: menu, espectador e AFK não contam.': 'Hours confirmed by the server: menu, spectator and AFK do not count.',
  'Horas confirmadas pelo servidor. Antes da atualização:': 'Hours confirmed by the server. Before the update:',
  'contadas à parte.': 'counted separately.',
  'Armas preferidas': 'Favorite weapons', 'abates confirmados pelo servidor': 'kills confirmed by the server',
  'abate': 'kill', 'abates': 'kills',
  'Ainda sem arma registrada: elas entram a partir das partidas multiplayer confirmadas pelo servidor.': 'No weapon on record yet: they show up from the multiplayer matches the server confirms.',
  'Atividade': 'Activity', 'Atividade recente': 'Recent activity',
  'Ainda sem partida registrada.': 'No match on record yet.',
  'As rodadas deste jogador aparecem só para os amigos dele.': 'This player only shows rounds to friends.',
  'partida confirmada e solo não verificado': 'confirmed match and unverified solo',
  'não vale ranking': 'does not count for ranking',
  'Captura': 'Capture', 'Mata-mata': 'Deathmatch', 'encerrada antes do placar': 'ended before the score',
  'Editar perfil': 'Edit profile', 'prévia ao lado, ao vivo': 'live preview on the left',
  'Seus dados de perfil não carregaram. Tente de novo em instantes.': 'Your profile data did not load. Try again in a moment.',
  'Aparece no killfeed e no placar. Seu ID público e seus links não mudam.': 'Shows in the killfeed and on the scoreboard. Your public ID and links stay the same.',
  'FOTO · PNG, JPEG OU WEBP ATÉ 3 MB': 'PHOTO · PNG, JPEG OR WEBP UP TO 3 MB', 'Enviar foto': 'Upload photo', 'Foto atualizada.': 'Photo updated.',
  'QUEM VÊ SEU PERFIL': 'WHO SEES YOUR PROFILE', 'Todo mundo, com link próprio': 'Everyone, with its own link',
  'Só amigos': 'Friends only', 'Só você': 'Only you', 'Mostrar meu último personagem no perfil público': 'Show my last character on the public profile',
  'REDES SOCIAIS': 'SOCIAL LINKS', 'REDE': 'LINK', 'Link da rede': 'Social link', 'Remover': 'Remove',
  'Presença, atividade, bloqueios e contas ligadas ficam em': 'Presence, activity, blocks and linked accounts live in',
  'Salvar perfil': 'Save profile', 'Perfil salvo.': 'Profile saved.',
  'Use de 2 a 14 letras, números, _ . ou -.': 'Use 2 to 14 letters, numbers, _ . or -.', 'Esse nick já está em uso. Escolha outro.': 'That nick is taken. Pick another.',
  'Use links HTTPS das redes indicadas.': 'Use HTTPS links from the listed networks.', 'Revise a bio e as opções de privacidade.': 'Check the bio and the privacy options.',
  'Calma, fiscal da resenha. Tente de novo em um minuto.': 'Easy there. Try again in a minute.', 'Sua sessão expirou. Entre de novo para continuar.': 'Your session expired. Sign in again to continue.',
  'Use PNG, JPEG ou WebP de até 3 MB.': 'Use PNG, JPEG or WebP up to 3 MB.',
  'Sua carreira': 'Your career', 'Próxima patente': 'Next rank', 'Patente máxima': 'Top rank',
  'Cada abate soma 1 ponto; abate multiplayer confirmado soma 2.': 'Each kill adds 1 point; a confirmed multiplayer kill adds 2.',
  'Compartilhar meu card': 'Share my card', 'Últimas partidas': 'Latest matches',
  'Clã': 'Clan', 'Carregando clã…': 'Loading clan…', 'Os clãs não responderam agora.': 'Clans are not answering right now.',
  'Abrir página de clãs': 'Open clans page', 'Sem clã ainda': 'No clan yet', 'Junte os amigos e leve a tag do seu clã para o placar.': 'Gather your friends and take your clan tag to the scoreboard.',
  'Criar ou entrar num clã': 'Create or join a clan', 'membro': 'member', 'membros': 'members',  'LÍDER': 'LEADER',
  'Copiar convite do clã': 'Copy clan invite', 'Copiar link do clã': 'Copy clan link',
  'Convite copiado. Gerar outro revoga o anterior.': 'Invite copied. Making a new one revokes the old one.', 'Link do clã copiado.': 'Clan link copied.',
  'Página do clã': 'Clan page', 'Ranking de clãs e desafios: próxima etapa': 'Clan ranking and challenges: next step',
  // tp:fim-perfil

  // tp:social
  'Resenha': 'Chat', 'Canais': 'Channels',   'SALAS': 'ROOMS',
  'Abrir a resenha': 'Open chat', 'Abrir a resenha, {n} novidades': 'Open chat, {n} new', 'Fechar a resenha': 'Close chat',
  'Buscar na turma': 'Search your crew', 'Turma vazia': 'No crew yet', 'Adicione amigos pela Comunidade.': 'Add friends from Community.',
  'O clã ainda não tem sala de conversa.': 'Clans have no chat yet.', 'Convites para a sala de alguém da turma.': 'Invites to a friend\'s match.',
  'Chame quem não joga ainda': 'Bring someone new', 'COPIAR LINK DO JOGO': 'COPY GAME LINK', 'LINK COPIADO': 'LINK COPIED',
  'NÃO DEU PRA COPIAR': 'COULD NOT COPY', 'Carregando a turma…': 'Loading your crew…', 'A resenha não respondeu.': 'Chat did not answer.',
  'Tente de novo em instantes.': 'Try again in a moment.', 'Entre para conversar com a turma': 'Sign in to talk to your crew',
  'A resenha é entre amigos com conta. Jogar continua liberado sem conta.': 'Chat is for friends with an account. Playing stays open without one.',
   'VER CLÃS': 'SEE CLANS', 'Conversa do clã ainda não abriu': 'Clan chat is not open yet',
  'Por enquanto o clã se encontra na sala da partida.': 'For now, clans meet up inside the match.',
  'Mensagens em preparação': 'Messages coming', 'As conversas ainda não abriram neste servidor.': 'Conversations are not open on this server yet.',
  'ABRIR COMUNIDADE': 'OPEN COMMUNITY', 'Escolha alguém da turma': 'Pick someone from your crew', 'A conversa aparece aqui.': 'The conversation shows up here.',
  'Sua turma está começando': 'Your crew is just starting', 'Busque um jogador na Comunidade e mande um pedido.': 'Find a player in Community and send a request.',
  'Conversa com {nick}': 'Conversation with {nick}', 'CHAMAR PRA SALA': 'INVITE TO MATCH', 'Convite enviado.': 'Invite sent.',
  'Ver perfil, bloquear ou denunciar': 'View profile, block or report', 'A primeira mensagem começa a conversa.': 'The first message starts the conversation.',
  'Carregando a conversa…': 'Loading conversation…', 'Escreva pro {nick}…': 'Write to {nick}…',
  'Bora!': 'Let\'s go!', '5 min': '5 min', 'Tô dentro': 'I\'m in', 'Chora na live!': 'Cry on stream!',
  'Conversa entre amigos, dentro das regras da resenha': 'Friends only, under the chat rules', 'ver regras': 'see rules',
  'Nenhum convite de sala agora': 'No match invites now', 'Quando alguém da turma te chamar, o convite aparece aqui.': 'When a friend calls you, the invite shows up here.',
  'Convite de sala': 'Match invite', '{nick} te chamou pra sala {sala}': '{nick} called you to match {sala}', 'AGORA NÃO': 'NOT NOW',
  'Convite enviado': 'Invite sent', 'Esperando {nick} na sala {sala}': 'Waiting for {nick} in match {sala}', 'vence às {hora}': 'expires at {hora}',
  'HOJE': 'TODAY', 'ONTEM': 'YESTERDAY', 'Em partida': 'In a match', 'presença privada': 'private presence',
  'visto há {n} min': 'seen {n} min ago', 'visto há {n} h': 'seen {n} h ago', 'visto há {n} dias': 'seen {n} days ago',
  'Entre na sala antes de chamar.': 'Join the match before inviting.', 'Essa sala é solo.': 'That match is solo.', 'A sala lotou.': 'The match is full.',
  'Calma: tente de novo em um minuto.': 'Easy: try again in a minute.',

  'Chama a turma': 'Call the crew', 'Fechar o aviso; a sala continua criada': 'Close this notice; the match stays created',
  'Você': 'You', 'Convide pelo link. Quem abrir entra direto na sua sala.': 'Invite with the link. Anyone who opens it joins your match directly.',
  '{n}/{max} na sala · {nome}': '{n}/{max} in the match · {nome}', 'Link de convite': 'Invite link', 'COMPARTILHAR': 'SHARE',
  'Amigo no celular?': 'Friend on mobile?', 'Aponta a câmera: abre direto na sua sala, sem instalar nada.': 'Point the camera: it opens your match, nothing to install.',
  'ou código': 'or code', 'Recebeu um código?': 'Got a code?',
  'ENTRAR NA SALA ▸': 'JOIN THE MATCH ▸',  'Amigos online · {n}': 'Friends online · {n}',
  'Entre na conta para chamar a turma daqui. O link funciona pra qualquer um.': 'Sign in to call your crew from here. The link works for anyone.',
  'Ninguém da turma online agora. Manda o link no zap.': 'Nobody from your crew is online. Send the link on WhatsApp.',
  'CHAMAR': 'CALL', 'ENVIADO': 'SENT', 'COPIADO: COLE NO DISCORD': 'COPIED: PASTE IN DISCORD',
  'Bora uma treta no CORO SOLTO? Entra na minha sala.': 'Up for a fight in CORO SOLTO? Join my match.',
  'QR code do convite da sala {sala}': 'QR code for match invite {sala}',
  // tp:fim-social

  // tp:servidores
  'CRIAR SALA PRIVADA': 'CREATE PRIVATE ROOM', 'JOGO RÁPIDO': 'QUICK PLAY', 'Região': 'Region',
  'Região · escolhida pelo menor ping': 'Region · picked by lowest ping', 'TODOS OS MODOS': 'ALL MODES',
  'COM VAGA': 'OPEN SLOTS', 'SEM SENHA': 'NO PASSWORD', 'Código da sala': 'Room code', 'SITUAÇÃO': 'STATUS',
  'ENTRAR NO LADO': 'JOIN SIDE', 'Entrar no lado': 'Join side', 'Atualiza sozinho a cada 5 s': 'Refreshes by itself every 5 s',
  'medindo o ping dos servidores…': 'measuring server ping…', 'jogando': 'playing', 'jogando agora em': 'playing now in',
  'sala': 'room', 'salas': 'rooms', 'fora do ar agora': 'offline right now', 'fora do ar': 'offline',
  'Servidores fora do ar': 'Servers offline', 'Tentando de novo em': 'Trying again in',
  'Enquanto isso, dá pra treinar contra bots.': 'Meanwhile, you can train against bots.',
  'Se os outros caírem também, dá pra treinar contra bots.': 'If the others go down too, you can train against bots.',
  'TENTAR AGORA': 'TRY NOW', 'TREINAR CONTRA BOTS': 'TRAIN AGAINST BOTS',
  'Esperando gente': 'Waiting for players', 'Com vaga': 'Open slots', 'Lotada': 'Full', 'assistindo': 'watching',
  'Esse servidor não mandou a lista de salas. Tente outra região.': 'This server did not send its room list. Try another region.',
  'Procurando salas…': 'Looking for rooms…', 'Nenhuma sala aberta. Crie a sua ou entre no jogo rápido.': 'No open rooms. Create yours or hit quick play.',
  'Nenhuma sala passa nesse filtro.': 'No room matches this filter.',
  'Copiar o link de convite desta sala': 'Copy this room invite link', 'ASSISTIR': 'WATCH',
  'Brasil · São Paulo': 'Brazil · São Paulo',
  'Nenhum servidor no ar agora. A lista volta quando um responder.': 'No server is up right now. The list comes back when one answers.',
  'SALA': 'ROOM',  'ESQUERDA × DIREITA': 'LEFT × RIGHT', 'CAPTURA · MAPAS SORTEADOS': 'CAPTURE · RANDOM MAPS',
  // tp:fim-servidores

  // tp:ajustes
  'ACESSIBILIDADE': 'ACCESSIBILITY',  'REDUZIR ANIMAÇÕES': 'REDUCE MOTION',
  'Seu sistema já pede menos movimento: as telas trocam só com esmaecimento.': 'Your system already asks for less motion: screens change with a fade only.',
  'Troca deslizamentos e zooms das telas por um esmaecimento curto.': 'Swaps screen slides and zooms for a short fade.',
  'Newsletter e cookies': 'Newsletter and cookies',
  'Permitir cookies/dados opcionais para medir uso e desempenho do jogo. Opcional; posso retirar a permissão a qualquer momento.':
    'Allow optional cookies/data to measure game usage and performance. Optional; I can withdraw permission at any time.',
  'Sessão, segurança, preferências e progresso usam armazenamento necessário para jogar e manter a conta.':
    'Session, security, preferences and progress use storage needed to play and keep the account.',
  'Quero receber novidades por e-mail. Opcional; preciso entrar na conta e confirmar meu e-mail.':
    'I want news by email. Optional; I need to sign in and confirm my email.',
  'ENTRAR OU CRIAR CONTA': 'SIGN IN OR CREATE ACCOUNT', 'Receber novidades do Coro Solto por e-mail': 'Get Coro Solto news by email',
  'Sua escolha é opcional e separada da conta.': 'Your choice is optional and separate from the account.',
  'Falta confirmar seu e-mail para receber novidades.': 'Confirm your email to get news.',
  'Cancelar inscrição pendente': 'Cancel pending signup',
  // tp:fim-ajustes
};

/* Índice por espaço NORMALIZADO: o mesmo parágrafo quebrado em duas linhas no
   index.astro chega aqui com \n e indentação no meio. Sem isto, cada quebra de linha
   do HTML vira uma sobra em PT no meio do EN (foi o que a varredura de 21/08 achou). */
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const DICT_NORM = {};
for (const k of Object.keys(DICT)) DICT_NORM[norm(k)] = DICT[k];

export const tr = (s) => {
  if (LANG !== 'en' || typeof s !== 'string') return s;
  return DICT[s] || DICT[s.trim()] || DICT_NORM[norm(s)] || s;
};

/* Frases DINÂMICAS do jogo (game.js/main.js). PT inline como padrão — o jogo nunca
   depende do dicionário pra funcionar. */
const FRASES = {
  round: { pt: (n) => `ROUND ${n}`, en: (n) => `ROUND ${n}` },
  valendo: { pt: () => 'VALENDO!', en: () => 'GO GO GO!' },
  matchPoint: { pt: () => 'MATCH POINT', en: () => 'MATCH POINT' },
  bandeiraDecisiva: { pt: () => 'BANDEIRA DECISIVA', en: () => 'DECISIVE FLAG' },
  agoraVoceE: { pt: (t) => `VOCÊ AGORA É ${t}`, en: (t) => `YOU ARE NOW ${t}` },
  alvoBandeiras: {
    pt: (n) => `Primeiro time a ${n} bandeiras leva a rodada`,
    en: (n) => `First team to ${n} flags takes the round`,
  },
  alvoAbates: {
    pt: (n) => `Primeiro time a ${n} abates leva`,
    en: (n) => `First team to ${n} kills takes it`,
  },
  formatoMelhorDe: {
    pt: (max, win) => `Melhor de ${max} — primeiro time a ${win} vence a partida`,
    en: (max, win) => `Best of ${max} — first team to ${win} takes the match`,
  },
  comeceTreta: { pt: () => 'Que comece a treta!', en: () => 'Let the fight begin!' },
  voltaTreta: { pt: () => 'De volta pra treta!', en: () => 'Back to the fight!' },
  rodadaDe: { pt: (a, b) => `RODADA ${a}/${b}`, en: (a, b) => `ROUND ${a}/${b}` },
  abatesRotulo: { pt: (n) => (n === 1 ? 'ABATE' : 'ABATES'), en: (n) => (n === 1 ? 'KILL' : 'KILLS') },
  respawnEm: { pt: (s) => `Respawn em ${s}`, en: (s) => `Respawn in ${s}` },
  melhorDe5: { pt: () => 'MATA-MATA · 5 ROUNDS', en: () => 'DEATHMATCH · 5 ROUNDS' },
  melhorDeN: { pt: (n) => `MATA-MATA · ${n} ROUNDS`, en: (n) => `DEATHMATCH · ${n} ROUNDS` },
  ctfMelhorDeN: { pt: (n) => `CAPTURE A BANDEIRA · ${n} ROUNDS`, en: (n) => `CAPTURE THE FLAG · ${n} ROUNDS` },
  resumoPartida: {
    pt: (modo, eu, foe, armas) => `${modo}  ·  ${eu} VS ${foe}  ·  ARMAS: ${armas}`,
    en: (modo, eu, foe, armas) => `${modo}  ·  ${eu} VS ${foe}  ·  WEAPONS: ${armas}`,
  },
  carregando: { pt: (o) => `CARREGANDO — ${o}`, en: (o) => `LOADING — ${o}` },
  continuarSetup: { pt: () => 'CONTINUAR ▶', en: () => 'CONTINUE ▶' },
  escolhaAdversario: {
    pt: (t) => `Você fecha com ${t}. Aponte quem vai encarar do outro lado.`,
    en: (t) => `You're rolling with ${t}. Pick who will face you on the other side.`,
  },
  alvoBandeirasHud: { pt: (n) => `BANDEIRAS (ALVO ${n})`, en: (n) => `FLAGS (TARGET ${n})` },
  venceu: {
    pt: (t) => `${t} venceram a treta — a praça é sua. O pastel da vitória está pago.`,
    en: (t) => `${t} took the fight — the square is yours. Victory pastel is on the house.`,
  },
  perdeu: {
    pt: (t) => `${t} levaram a melhor — já pediram CPI da partida.`,
    en: (t) => `${t} got the upper hand — they already demanded an inquiry.`,
  },
  statsFim: {
    pt: (r1, r2, k, nome, d) => `<div><b>${r1} × ${r2}</b>rounds</div><div><b>${k}</b>kills de ${nome}</div><div><b>${d}</b>suas mortes</div>`,
    en: (r1, r2, k, nome, d) => `<div><b>${r1} × ${r2}</b>rounds</div><div><b>${k}</b>kills by ${nome}</div><div><b>${d}</b>your deaths</div>`,
  },
  // chat de sala (#686): os motivos de nack e de denúncia são os do contrato, docs/chat-de-sala.md §2
  // mensagem que o botão MANDAR NO WHATSAPP do modal de sala deixa pronta
  conviteZap: {
    pt: (link) => `Bora uma treta no CORO SOLTO? Entra na minha sala: ${link}`,
    en: (link) => `Up for a fight in CORO SOLTO? Join my room: ${link}`,
  },
  chatAnonimo: { pt: () => 'Anônimo', en: () => 'Anonymous' },
  chatCanal: { pt: (c) => (c === 'time' ? 'TIME' : 'SALA'), en: (c) => (c === 'time' ? 'TEAM' : 'ROOM') },
  chatContador: { pt: (n, max) => `${n}/${max}`, en: (n, max) => `${n}/${max}` },
  chatNaoLidas: { pt: (n) => `${n} nova${n === 1 ? '' : 's'}`, en: (n) => `${n} new` },
  chatNack: {
    pt: (m, espera) => ({
      vazia: 'Mensagem vazia', longa: 'Mensagem longa demais', rapido: 'Devagar: espere um pouco',
      repetida: 'Você acabou de dizer isso', sem_time: 'Espectador só fala com a sala', silenciado: 'Silenciado por um minuto',
      sala_rapida: 'A sala está falando rápido demais', invalida: 'Mensagem inválida',
    }[m] || 'Mensagem não enviada') + (espera ? ` (${Math.ceil(espera / 1000)} s)` : ''),
    en: (m, espera) => ({
      vazia: 'Empty message', longa: 'Message too long', rapido: 'Slow down a bit',
      repetida: 'You just said that', sem_time: 'Spectators can only talk to the room', silenciado: 'Muted for a minute',
      sala_rapida: 'The room is talking too fast', invalida: 'Invalid message',
    }[m] || 'Message not sent') + (espera ? ` (${Math.ceil(espera / 1000)} s)` : ''),
  },
  chatDenuncia: {
    pt: (estado, motivo) => (estado === 'recebida' ? 'Denúncia recebida' : estado === 'repetida' ? 'Você já denunciou essa mensagem'
      : ({ limite: 'Limite de denúncias atingido', propria: 'Não dá pra denunciar a própria mensagem', desconhecida: 'Mensagem não encontrada' }[motivo] || 'Denúncia recusada')),
    en: (estado, motivo) => (estado === 'recebida' ? 'Report received' : estado === 'repetida' ? 'You already reported this message'
      : ({ limite: 'Report limit reached', propria: 'You cannot report your own message', desconhecida: 'Message not found' }[motivo] || 'Report refused')),
  },
  chatMotivo: {
    pt: (m) => ({ ofensa: 'Ofensa', odio: 'Ódio', assedio: 'Assédio', spam: 'Spam', outro: 'Outro' }[m] || m),
    en: (m) => ({ ofensa: 'Insult', odio: 'Hate', assedio: 'Harassment', spam: 'Spam', outro: 'Other' }[m] || m),
  },
  chatBloqueado: { pt: (h) => `#${h} bloqueado`, en: (h) => `#${h} blocked` },
  chatBloqueioFalhou: { pt: () => 'Não deu pra bloquear', en: () => 'Could not block' },
  chatIndisponivel: { pt: () => 'Chat indisponível agora', en: () => 'Chat unavailable right now' },
  chatPropria: { pt: () => 'Essa mensagem é sua', en: () => 'That is your own message' },
  chatDenunciaEnviada: { pt: () => 'Denúncia enviada', en: () => 'Report sent' },
  // TRETA$ da partida (compra-partida.js): menu de compra e dica do HUD
  compraTitulo: { pt: () => 'COMPRAR', en: () => 'BUY' },
  compraDica: { pt: (toque, s) => `${toque ? '$' : 'B'} COMPRAR · ${s}s`, en: (toque, s) => `${toque ? '$' : 'B'} BUY · ${s}s` },
  compraPrepare: { pt: (s) => `PREPARE-SE PARA COMPRAR, VOCÊ TEM ${s} SEGUNDOS`, en: (s) => `GET READY TO BUY, YOU HAVE ${s} SECONDS` },
  compraSuaArma: { pt: () => 'SUA ARMA', en: () => 'YOUR GUN' },
  compraVoltar: { pt: () => 'VOLTAR', en: () => 'BACK' },
  compraFechar: { pt: () => 'FECHAR', en: () => 'CLOSE' },
  compraRecusa: {
    pt: (m) => ({ tempo: 'Acabou o tempo de compra', zona: 'Volte pro spawn pra comprar', saldo: 'TRETA$ insuficiente',
      'ja-tem': 'Você já tem essa', morto: 'Morto não compra', item: 'Item indisponível',
      'sem-colete': 'Capacete só com colete', limite: 'Já está no máximo' }[m] || 'Compra recusada'),
    en: (m) => ({ tempo: 'Buy time is over', zona: 'Go back to spawn to buy', saldo: 'Not enough TRETA$',
      'ja-tem': 'You already have it', morto: 'Dead players cannot buy', item: 'Item unavailable',
      'sem-colete': 'Helmet needs kevlar', limite: 'Already at the limit' }[m] || 'Purchase refused'),
  },
  // seleção de lado/personagem (main.js) e carteira TRETA$ (treta-rewards/treta-store)
  selecionado: {
    pt: (lado, nome, skin) => `Selecionado: ${lado} · ${nome}${skin ? ` · ${skin}` : ''}`,
    en: (lado, nome, skin) => `Selected: ${lado} · ${nome}${skin ? ` · ${skin}` : ''}`,
  },
  escalacaoVagas: {
    pt: (a, ca, e, ce, estouro) => `ESCALAÇÃO: ${a} de ${ca} aliados · ${e} de ${ce} inimigos` + (estouro ? ' — escalados além das vagas são descartados' : ' — resto sorteado'),
    en: (a, ca, e, ce, estouro) => `LINEUP: ${a} of ${ca} allies · ${e} of ${ce} enemies` + (estouro ? ' — picks beyond the slots are discarded' : ' — rest is random'),
  },
  escalacaoAuto: {
    pt: () => 'ESCALAÇÃO: automática (clique no ＋ de um personagem pra travá-lo)',
    en: () => 'LINEUP: automatic (click the ＋ on a character to lock them in)',
  },
  pinTituloTravado: { pt: (p) => `Escalado como ${p} — clique para tirar`, en: (p) => `Pinned as ${p} — click to unpin` },
  pinTituloEscalar: { pt: (p) => `Escalar como ${p} na próxima partida`, en: (p) => `Pin as ${p} in the next match` },
  skinTirarErro: { pt: () => 'Não deu para tirar a skin agora. Tente de novo em instantes.', en: () => 'Could not remove this outfit right now. Try again in a moment.' },
  skinEquiparErro: { pt: () => 'Não deu para equipar esta skin agora. Tente de novo em instantes.', en: () => 'Could not equip this outfit right now. Try again in a moment.' },
  carteiraSaldoAria: { pt: (v) => `Carteira TRETA$, saldo T$ ${v}`, en: (v) => `TRETA$ wallet, T$ ${v} balance` },
  carteiraEntrarAria: { pt: () => 'Entre para ver seu saldo TRETA$', en: () => 'Sign in to see your TRETA$ balance' },
  carteiraErroAria: { pt: () => 'Carteira TRETA$ indisponível. Abra a loja para tentar novamente.', en: () => 'TRETA$ wallet unavailable. Open the store to try again.' },
  carteiraConsultandoAria: { pt: () => 'Consultando carteira TRETA$', en: () => 'Checking TRETA$ wallet' },
};
export const frase = (id, ...args) => {
  const f = FRASES[id];
  if (!f) return id;
  return (LANG === 'en' ? f.en : f.pt)(...args);
};

/* Varre o DOM estático UMA vez no boot (LANG=en): nós de texto por correspondência
   exata + atributos de texto. Não observa mutação — o dinâmico usa tr()/frase(). */
export function translateDom(root) {
  if (LANG !== 'en' || !root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nos = [];
  while (walker.nextNode()) nos.push(walker.currentNode);
  for (const n of nos) {
    const t = n.textContent, tt = t.trim();
    if (!tt) continue;
    const en = DICT[tt] || DICT_NORM[norm(tt)];
    if (en) n.textContent = t.replace(tt, en);
  }
  for (const el of root.querySelectorAll('[placeholder],[title],[aria-label]')) {
    for (const a of ['placeholder', 'title', 'aria-label']) {
      const v = el.getAttribute(a);
      const en = v && (DICT[v.trim()] || DICT_NORM[norm(v)]);
      if (en) el.setAttribute(a, en);
    }
  }
}
