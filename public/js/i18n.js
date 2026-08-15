/* i18n.js — PT é a FONTE, EN é camada (decisão de 06/08, pré-lançamento internacional).
   Por que assim e não chaves espalhadas: o jogo tem centenas de strings PT hardcoded e
   véspera de live não é hora de reescrever call site. Este módulo:
     1. resolve o idioma: localStorage `cs_lang` ('pt'|'en') > navigator.language ('pt*'
        vira pt; o resto, en) — o usuário troca em CONFIGURAÇÕES (recarrega a página);
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
if (_lang !== 'pt' && _lang !== 'en') {
  const nav = (typeof navigator !== 'undefined' && (navigator.language || '')) || 'pt';
  _lang = /^pt/i.test(nav) ? 'pt' : 'en';
}
export const LANG = _lang;

/* PT -> EN. Ordena por tela pra manutenção; a chave é o texto EXATO (trim) do DOM. */
const DICT = {
  // splash / boot
  'CLIQUE OU PRESSIONE QUALQUER TECLA': 'CLICK OR PRESS ANY KEY',
  'CARREGANDO ARENA…': 'LOADING ARENA…',
  'CARREGANDO MODELOS 3D…': 'LOADING 3D MODELS…',
  'CARREGANDO…': 'LOADING…',
  // menu principal
  '// ESCOLHA A TRETA': '// PICK YOUR FIGHT',
  'SINGLE PLAYER': 'SINGLE PLAYER',
  'CAPTURE THE FLAG': 'CAPTURE THE FLAG',
  'CONFIGURAÇÕES': 'SETTINGS',
  'RANKING': 'LEADERBOARD',
  'MAPA': 'MAP',
  'APOIE O JOGO': 'SUPPORT THE GAME',
  'SOBRE O JOGO': 'ABOUT THE GAME',
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
  'O PALCO DA TRETA': 'THE STAGE',
  'ESCOLHA SEU LADO DA TRETA': 'PICK YOUR SIDE',
  'ESCOLHA SEU PERSONAGEM': 'PICK YOUR CHARACTER',
  'Cada facção tem elenco, grito e jeito de brigar. Escolha o coro.':
    'Every faction has its cast, chants and fighting style. Pick your crew.',
  'ARMAS': 'WEAPONS', 'BOTS / LADO': 'BOTS / SIDE',
  'TODAS': 'ALL', 'VOLTAR': 'BACK', 'JOGAR': 'PLAY',
  'SEU PERFIL': 'YOUR PROFILE', 'PÔR O NOME NA CAMISA': 'PUT YOUR NAME ON THE JERSEY',
  'NOME NA CAMISA': 'NAME ON THE JERSEY', 'SEM NICK': 'NO NICK',
  'USAR PERSONAGEM': 'USE CHARACTER',
  'ESPECIALIDADE': 'ROLE', 'ATRIBUTOS': 'ATTRIBUTES',
  'VIDA': 'HEALTH', 'VELOCIDADE': 'SPEED', 'PRECISÃO': 'ACCURACY', 'MEME': 'MEME',
  'ARRASTE · GIRAR': 'DRAG · ROTATE', 'SCROLL · ZOOM': 'SCROLL · ZOOM',
  'PERSONAGENS': 'CHARACTERS', 'PERSONAGEM': 'CHARACTER',
  'ROUNDS': 'ROUNDS', 'CAPTURA': 'CAPTURE', 'MATA-MATA': 'DEATHMATCH',
  'COMUM': 'COMMON', 'RARO': 'RARE', 'LENDÁRIO': 'LEGENDARY',
  'TIME E': 'TEAM E', 'TIME B': 'TEAM B',
  'TRIBOS URBANAS': 'URBAN TRIBES', 'PALHAÇOS': 'CLOWNS', 'FUNKEIROS': 'FUNKEIROS',
  '"A treta se faz na praça!"': '"The fight is at the square!"',
  '"A treta se faz na rodovia!"': '"The fight is on the highway!"',
  '"A treta se faz na quebrada!"': '"The fight is in the hood!"',
  '"A treta se faz no picadeiro!"': '"The fight is at the circus ring!"',
  '"A treta se faz no bailão!"': '"The fight is at the baile!"',
  '8 PERSONAGENS': '8 CHARACTERS', '9 PERSONAGENS': '9 CHARACTERS',
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
  'COMO JOGAR': 'HOW TO PLAY', 'ENTENDI': 'GOT IT', 'TÁ ANOTADO': 'NOTED',
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
  melhorDe5: { pt: () => 'ROUNDS · MELHOR DE 5', en: () => 'ROUNDS · BEST OF 5' },
  resumoPartida: {
    pt: (modo, n, armas) => `${modo}  ·  ${n} VS ${n}  ·  ARMAS: ${armas}`,
    en: (modo, n, armas) => `${modo}  ·  ${n} VS ${n}  ·  WEAPONS: ${armas}`,
  },
  carregando: { pt: (o) => `CARREGANDO — ${o}`, en: (o) => `LOADING — ${o}` },
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
