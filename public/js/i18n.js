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
   Páginas do site e docs em EN são outra frente (issue #54). */

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
  // splash / boot
  'CLIQUE OU PRESSIONE QUALQUER TECLA': 'CLICK OR PRESS ANY KEY',
  'CARREGANDO ARENA…': 'LOADING ARENA…',
  'CARREGANDO MODELOS 3D…': 'LOADING 3D MODELS…',
  'CARREGANDO…': 'LOADING…',
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
  // setup da partida
  'PASSO 1 · A PARTIDA': 'STEP 1 · THE MATCH',
  'PASSO 2 · O SEU LADO': 'STEP 2 · YOUR SIDE',
  'PASSO 3 · O PERSONAGEM': 'STEP 3 · THE CHARACTER',
  'PASSO 4 · O ADVERSÁRIO': 'STEP 4 · THE OPPONENT',
  'PASSO À PARTE · NOME NA CAMISA': 'SIDE STEP · NAME ON THE JERSEY',
  'PASSO 1 · A PARTIDA (CTF)': 'STEP 1 · THE MATCH (CTF)',
  'O PALCO DA TRETA': 'THE STAGE',
  // map screen (abas de categoria — tela 04 do redesign)
  'ESCOLHA DO MAPA': 'PICK THE MAP',
  'TODOS': 'ALL', 'ARENA': 'ARENA', 'FAVELA': 'FAVELA', 'CIDADES': 'CITIES', 'COMUNIDADE': 'COMMUNITY', 'AI': 'AI',
  'OFICIAL': 'OFFICIAL', 'por': 'by',
  // descrições de categoria da tela de mapas (a chave é o texto PT exato do CAT_DESC)
  'O acervo inteiro: oficial e comunidade, arena e cidade.': 'The whole roster: official and community, arena and city.',
  'Combate fechado e simétrico — o duelo de angulação clássico.': 'Tight, symmetric combat — the classic angle duel.',
  'Verticalidade de laje, beco e sombra: quem domina o alto dita o round.': 'Rooftop verticality, alley and shade: who owns the high ground runs the round.',
  'Marcos do Brasil em escala de treta: concreto, calçada e linha reta.': 'Brazilian landmarks at treta scale: concrete, sidewalk and straight lines.',
  'Autoria da comunidade — o crachá de cada mapa diz quem fez.': 'Community-made maps — each badge says who built it.',
  'Construídos pelos agentes de IA da casa.': 'Built by the house AI agents.',
  'ESCOLHA SEU LADO DA TRETA': 'PICK YOUR SIDE',
  'QUEM VAI LEVAR O CORO?': "WHO'S GETTING THE BOOT?",
  'ESCOLHA SEU PERSONAGEM': 'PICK YOUR CHARACTER',
  'Cada facção tem elenco, grito e jeito de brigar. Escolha o coro.':
    'Every faction has its cast, chants and fighting style. Pick your crew.',
  'ARMAS': 'WEAPONS', 'BOTS / LADO': 'BOTS / SIDE', 'JOGADORES': 'PLAYERS', 'Nº DE ROUNDS': 'ROUNDS',
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
  'Caçador de pegadas. Vê onde o inimigo pisou — o vilão que o time tolera.':
    'A tracker of footprints. Sees where the enemy stepped — the villain his own team tolerates.',
  'Golfinho rosa do Amazonas. Sai da cobertura, encanta a mira inimiga e responde de Deagle.':
    'The pink dolphin of the Amazon. Breaks cover, hexes enemy aim and answers with a Deagle.',
  'Robô de estúdio com lente única e rig no ombro. A transmissão começou.':
    'Studio robot with a single lens and a shoulder rig. The broadcast has begun.',
  'A bruxa de Lobato. Lança poção de lentidão e visão embaralhada — "dorme com o medo".':
    'Lobato\'s witch. Throws slowing potions and scrambled vision — "sleep with your fear".',
  'Menino de cabelo de fogo, pés virados. As pegadas apontam pro lado errado.':
    'Fire-haired boy with backwards feet. His footprints point the wrong way.',
  'Roupa preta, tablet e leque de cores. Esse fluxo precisa de combate.':
    'All-black outfit, tablet and a color palette. This user flow needs combat.',
  'Camadas incompatíveis e invenções nas costas. Hoje eu tô calibrado!':
    'Mismatched layers and inventions on his back. Today I\'m calibrated!',
  'Repórter policial dos anos 90. Chega antes da polícia e narra com gosto.':
    '90s crime reporter. Gets there before the police and narrates with relish.',
  'Cangaço no gatilho. Quanto mais segura o tiro, mais dano faz — Virgem Maria!':
    'Cangaço on the trigger. The longer he holds the shot, the harder it hits — Holy Mary!',
  'Headset antigo, fichas e mouse de bolinha. Reserva a máquina oito.':
    'Old headset, arcade tokens and a ball mouse. Machine eight is reserved.',
  'Sétimo filho, maldição da encruzilhada. O lobo preto acorda forte, dentuço e sem coleira.':
    'Seventh son, crossroads curse. The black wolf wakes up strong, fanged and collarless.',
  'Cangaceira de precisão. Parou, mirou, acertou — a rainha do primeiro tiro.':
    'Precision cangaceira. Stopped, aimed, hit — the queen of the first shot.',
  'Criatura felpuda com fones e boom dorsal. Som rodando!':
    'Fuzzy creature with headphones and a dorsal boom mic. Sound is rolling!',
  'Capacete, refletivo e bag térmica. Endereço confirmado.':
    'Helmet, hi-vis vest and a thermal bag. Address confirmed.',
  'Placas de papelão com previsões absurdas e case de feira. Já aconteceu semana que vem.':
    'Cardboard signs with absurd forecasts and a street-fair briefcase. It already happened next week.',
  'Moletom, olheiras e teclado nas costas. Só mais um commit.':
    'Hoodie, dark circles and a keyboard on his back. Just one more commit.',
  'Moleque de uma perna só. Redemoinho de fumaça e some — o gorro vermelho é hitbox.':
    'One-legged trickster. A whirlwind of smoke and he\'s gone — the red cap is the hitbox.',
  'Capitão quilombola. O grito de Palmares ecoa e acelera a recarga dos aliados.':
    'Quilombola captain. The cry of Palmares echoes and speeds up his allies\' reloads.',
  'Óculos espelhado e corte na régua. No fluxo, quem corre é a bala.':
    'Mirrored shades and a razor-sharp fade. In the flow, the bullet does the running.',
  'Corrente, anel e relógio brilhando. Se é pra atirar, que seja com estilo.':
    'Chain, ring and a gleaming watch. If you are going to shoot, do it in style.',
  'TIME E': 'TEAM E', 'TIME B': 'TEAM B',
  'os seus': 'your crew',
  'TRIBOS URBANAS': 'URBAN TRIBES', 'PALHAÇOS': 'CLOWNS', 'FUNKEIROS': 'FUNKEIROS',
  'PALHACOS': 'CLOWNS', 'MITICOS': 'MYTHICS', 'NERDOLAS': 'GEEKS',
  'PROFISSIONAIS DO CORRE': 'HUSTLE PROS', 'NOIAS': 'JUNKIES', 'TV': 'TV',
  'TIME ADVERSÁRIO': 'ENEMY TEAM',
  '"A treta se faz na praça!"': '"The fight is at the square!"',
  '"A treta se faz na rodovia!"': '"The fight is on the highway!"',
  '"A treta se faz na quebrada!"': '"The fight is in the hood!"',
  '"A treta se faz no picadeiro!"': '"The fight is at the circus ring!"',
  '"A treta se faz no bailão!"': '"The fight is at the baile!"',
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
  'Mover': 'Move', 'Mirar': 'Aim', 'Atirar': 'Shoot', 'Correr': 'Sprint',
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
  'VITÓRIA': 'VICTORY', 'DERROTA': 'DEFEAT',
  'ENTRAR NESSE CORO': 'GET THIS BOOT ON',
  'SÓ PISTOLAS': 'PISTOLS ONLY', 'SÓ FACA': 'KNIFE ONLY', 'SÓ AWP': 'AWP ONLY',
  'VOCÊ': 'YOU', 'RÁDIO': 'RADIO', 'Respawn em': 'Respawn in',   // tradução DO DONO (06/08) — não 'join this crew'
  'KILLS': 'KILLS', 'MORTES': 'DEATHS', 'JOGADOR': 'PLAYER', 'CAP.': 'CAP.',
  'CORO SOLTO — PLACAR': 'CORO SOLTO — SCOREBOARD',
  'A treta continua sem você. Por enquanto.': 'The fight goes on without you. For now.',
};

export const tr = (s) => {
  if (LANG !== 'en' || typeof s !== 'string') return s;
  return DICT[s] || DICT[s.trim()] || s;
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
  comeceTreta: { pt: () => 'Que comece a treta!', en: () => 'Let the fight begin!' },
  voltaTreta: { pt: () => 'De volta pra treta!', en: () => 'Back to the fight!' },
  rodadaDe: { pt: (a, b) => `RODADA ${a}/${b}`, en: (a, b) => `ROUND ${a}/${b}` },
  respawnEm: { pt: (s) => `Respawn em ${s}`, en: (s) => `Respawn in ${s}` },
  melhorDe5: { pt: () => 'MATA-MATA · 5 ROUNDS', en: () => 'DEATHMATCH · 5 ROUNDS' },
  melhorDeN: { pt: (n) => `MATA-MATA · ${n} ROUNDS`, en: (n) => `DEATHMATCH · ${n} ROUNDS` },
  ctfMelhorDeN: { pt: (n) => `CAPTURE A BANDEIRA · ${n} ROUNDS`, en: (n) => `CAPTURE THE FLAG · ${n} ROUNDS` },
  resumoPartida: {
    pt: (modo, n, armas) => `${modo}  ·  ${n} VS ${n}  ·  ARMAS: ${armas}`,
    en: (modo, n, armas) => `${modo}  ·  ${n} VS ${n}  ·  WEAPONS: ${armas}`,
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
    const en = DICT[tt];
    if (en) n.textContent = t.replace(tt, en);
  }
  for (const el of root.querySelectorAll('[placeholder],[title],[aria-label]')) {
    for (const a of ['placeholder', 'title', 'aria-label']) {
      const v = el.getAttribute(a);
      if (v && DICT[v.trim()]) el.setAttribute(a, DICT[v.trim()]);
    }
  }
}
